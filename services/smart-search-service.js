#!/usr/bin/env node

// Smart Search Service (text + voice + image)
require('dotenv').config();
const https = require('https');
const fs = require('fs');
const crypto = require('crypto');

class SmartSearchService {
  constructor() {
    this.geminiApiKey = process.env.GEMINI_API_KEY;
    this.googleCloudKeyPath = process.env.GOOGLE_CLOUD_KEY_PATH;
    this.enableVoiceSearch = process.env.ENABLE_VOICE_SEARCH === 'true';
    this.enableImageSearch = process.env.ENABLE_IMAGE_SEARCH === 'true';
    this.enableFuzzySearch = true;

    this.googleCloudCredentials = null;
    if (this.googleCloudKeyPath && fs.existsSync(this.googleCloudKeyPath)) {
      try {
        this.googleCloudCredentials = JSON.parse(fs.readFileSync(this.googleCloudKeyPath, 'utf8'));
        console.log('Google Cloud credentials loaded');
      } catch (err) {
        console.error('Error loading credentials:', err.message);
      }
    }
  }

  // Text search (exact + simple fuzzy)
  search(query, products) {
    if (!query || !products || products.length === 0) {
      return { exact: [], fuzzy: [], type: 'none' };
    }

    const q = String(query || '').toLowerCase().trim();
    const tokens = q.split(/\s+/).filter(Boolean);

    const exact = products.filter((p) => {
      const hay = [p.name, p.brand, p.category].filter(Boolean).join(' ').toLowerCase();
      return tokens.every((t) => hay.includes(t));
    });
    if (exact.length) return { type: 'exact', exact, fuzzy: [] };

    const fuzzy = products.filter((p) => {
      const hay = [p.name, p.brand, p.category].filter(Boolean).join(' ').toLowerCase();
      return tokens.some((t) => t.length > 2 && hay.includes(t));
    });
    if (fuzzy.length) return { type: 'fuzzy', exact: [], fuzzy };

    return { type: 'none', exact: [], fuzzy: [] };
  }

  // Voice via Google Speech-to-Text
  async recognizeVoice(audioBuffer) {
    if (!this.enableVoiceSearch || !this.googleCloudCredentials) {
      throw new Error('Voice search not enabled or credentials missing');
    }

    const requestData = JSON.stringify({
      config: {
        encoding: 'OGG_OPUS',
        sampleRateHertz: 48000,
        languageCode: 'ru-RU',
        alternativeLanguageCodes: ['en-US', 'hi-IN']
      },
      audio: {
        content: audioBuffer.toString('base64')
      }
    });

    const accessToken = await this.#getGoogleAccessToken();

    return new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'speech.googleapis.com',
        port: 443,
        path: '/v1/speech:recognize',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      }, (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            const alt = json?.results?.[0]?.alternatives?.[0];
            if (alt?.transcript) return resolve(alt.transcript);
            return reject(new Error('No speech detected'));
          } catch (e) {
            return reject(e);
          }
        });
      });
      req.on('error', reject);
      req.write(requestData);
      req.end();
    });
  }

  // Image via Gemini
  async recognizeImage(imageBuffer) {
    if (!this.enableImageSearch || !this.geminiApiKey) {
      throw new Error('Image search not enabled or API key missing');
    }

    const requestData = JSON.stringify({
      contents: [
        {
          parts: [
            { text: 'Identify product: brand, product type, model. Output short description first.' },
            { inline_data: { mime_type: 'image/jpeg', data: imageBuffer.toString('base64') } }
          ]
        }
      ]
    });

    return new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'generativelanguage.googleapis.com',
        port: 443,
        path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${this.geminiApiKey}`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            resolve({ description: text, query: this.extractSearchQuery(text) });
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on('error', reject);
      req.write(requestData);
      req.end();
    });
  }

  extractSearchQuery(text) {
    const words = String(text || '').toLowerCase().split(/\s+/);
    const keywords = words.filter((w) => w.length > 3 && !['this', 'that', 'with', 'from', 'the', 'and'].includes(w));
    return keywords.slice(0, 3).join(' ');
  }

  async #getGoogleAccessToken() {
    const c = this.googleCloudCredentials;
    if (!c?.client_email || !c?.private_key) throw new Error('Invalid Google credentials');
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const payload = {
      iss: c.client_email,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600
    };
    const b64u = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const input = `${b64u(header)}.${b64u(payload)}`;
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(input);
    sign.end();
    const sig = sign.sign(c.private_key).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const jwt = `${input}.${sig}`;
    const body = `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`;
    return new Promise((resolve, reject) => {
      const req = https.request({
        method: 'POST',
        hostname: 'oauth2.googleapis.com',
        path: '/token',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body)
        }
      }, (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.access_token) return resolve(json.access_token);
            reject(new Error(`Access token failed: ${data}`));
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }
}

module.exports = SmartSearchService;
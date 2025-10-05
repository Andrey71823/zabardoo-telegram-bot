#!/usr/bin/env node

require(''dotenv'').config();
const https = require(''https'');
const fs = require(''fs'');
const { GoogleAuth } = require(''google-auth-library'');

class SmartSearchService {
  constructor() {
    this.geminiApiKey = process.env.GEMINI_API_KEY;
    this.googleCloudKeyPath = process.env.GOOGLE_CLOUD_KEY_PATH;
    this.enableVoiceSearch = String(process.env.ENABLE_VOICE_SEARCH || ''false'') === ''true'';
    this.enableImageSearch = String(process.env.ENABLE_IMAGE_SEARCH || ''false'') === ''true'';
    this.enableFuzzySearch = true;

    this.googleCloudCredentials = null;
    this.auth = null;
    if (this.googleCloudKeyPath && fs.existsSync(this.googleCloudKeyPath)) {
      try {
        this.googleCloudCredentials = JSON.parse(fs.readFileSync(this.googleCloudKeyPath, ''utf8''));
        this.auth = new GoogleAuth({ credentials: this.googleCloudCredentials, scopes: [''https://www.googleapis.com/auth/cloud-platform''] });
        console.log(''✅ Google Cloud credentials loaded'');
      } catch (err) {
        console.error(''Error loading credentials:'', err.message);
      }
    }
  }

  search(query, products) {
    if (!query || !Array.isArray(products) || products.length === 0) {
      return { exact: [], fuzzy: [], type: ''none'' };
    }
    const q = String(query).toLowerCase().trim();
    const exact = products.filter((p) => {
      const title = String(p.title || p.name || '''').toLowerCase();
      const brand = String(p.brand || '''').toLowerCase();
      return title.includes(q) || brand.includes(q);
    });
    if (exact.length > 0) return { type: ''exact'', exact, fuzzy: [] };
    const words = q.split(/\s+/).filter((w) => w.length > 2);
    const fuzzy = products.filter((p) => {
      const title = String(p.title || p.name || '''').toLowerCase();
      const brand = String(p.brand || '''').toLowerCase();
      return words.some((w) => title.includes(w) || brand.includes(w));
    });
    if (fuzzy.length > 0) return { type: ''fuzzy'', exact: [], fuzzy };
    return { type: ''none'', exact: [], fuzzy: [] };
  }

  async recognizeVoice(audioBuffer) {
    if (!this.enableVoiceSearch) throw new Error(''Voice search disabled'');
    if (!this.auth) throw new Error(''Google Auth not initialized'');

    const requestData = JSON.stringify({
      config: {
        encoding: ''OGG_OPUS'',
        sampleRateHertz: 48000,
        languageCode: ''ru-RU'',
        alternativeLanguageCodes: [''en-US'', ''hi-IN'']
      },
      audio: { content: audioBuffer.toString(''base64'') }
    });

    const accessToken = await this.getAccessToken();
    return new Promise((resolve, reject) => {
      const options = {
        hostname: ''speech.googleapis.com'',
        port: 443,
        path: ''/v1/speech:recognize'',
        method: ''POST'',
        headers: {
          ''Content-Type'': ''application/json'',
          ''Authorization'': `Bearer ${accessToken}`
        }
      };
      const req = https.request(options, (res) => {
        let data = ''""'';
        res.on(''data'', (chunk) => { data += chunk; });
        res.on(''end'', () => {
          try {
            const response = JSON.parse(data);
            const transcript = response?.results?.[0]?.alternatives?.[0]?.transcript;
            if (transcript) return resolve(transcript);
            return reject(new Error(''No speech detected''));
          } catch (err) {
            return reject(err);
          }
        });
      });
      req.on(''error'', reject);
      req.write(requestData);
      req.end();
    });
  }

  async recognizeImage(imageBuffer) {
    if (!this.enableImageSearch) throw new Error(''Image search disabled'');
    if (!this.geminiApiKey) throw new Error(''Gemini API key missing'');

    const imageBase64 = imageBuffer.toString(''base64'');
    const requestData = JSON.stringify({
      contents: [
        {
          parts: [
            {
              text:
                ''Identify the product in this image. Return a short line with: brand, exact product/model if visible, and type (e.g., phone, sponge, toy cat).''
            },
            { inline_data: { mime_type: ''image/jpeg'', data: imageBase64 } }
          ]
        }
      ]
    });

    return new Promise((resolve, reject) => {
      const options = {
        hostname: ''generativelanguage.googleapis.com'',
        port: 443,
        path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${this.geminiApiKey}`,
        method: ''POST'',
        headers: { ''Content-Type'': ''application/json'' }
      };
      const req = https.request(options, (res) => {
        let data = ''""'';
        res.on(''data'', (chunk) => { data += chunk; });
        res.on(''end'', () => {
          try {
            const response = JSON.parse(data);
            const text = response?.candidates?.[0]?.content?.parts?.[0]?.text || ''""'';
            if (text) {
              resolve({ description: text, query: this.extractSearchQuery(text) });
            } else {
              reject(new Error(''No image recognition result''));
            }
          } catch (err) {
            reject(err);
          }
        });
      });
      req.on(''error'', reject);
      req.write(requestData);
      req.end();
    });
  }

  extractSearchQuery(text) {
    const words = String(text || '''').toLowerCase().split(/\s+/);
    const stop = new Set([''this'', ''that'', ''with'', ''from'', ''and'', ''the'', ''a'', ''an'']);
    const keywords = words.filter((w) => w.length > 2 && !stop.has(w));
    return keywords.slice(0, 4).join(' ');
  }

  async getAccessToken() {
    const client = await this.auth.getClient();
    const token = await client.getAccessToken();
    return typeof token === ''string'' ? token : token?.token;
  }
}

module.exports = SmartSearchService;

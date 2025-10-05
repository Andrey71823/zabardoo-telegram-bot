// Telegram bot with raw HTTP long-polling + SmartSearchService
// No external dependencies required.

const https = require('https');
const fs = require('fs');
const path = require('path');
const SmartSearchService = require('../services/smart-search-service');

function loadDotEnv(envPath) {
  try {
    const raw = fs.readFileSync(envPath, 'utf8');
    raw.split(/\r?\n/).forEach((line) => {
      if (!line || line.trim().startsWith('#')) return;
      const idx = line.indexOf('=');
      if (idx > 0) {
        const k = line.slice(0, idx).trim();
        const v = line.slice(idx + 1).trim();
        if (!(k in process.env)) process.env[k] = v;
      }
    });
  } catch (_) {}
}

(function bootstrap() {
  loadDotEnv(path.resolve(__dirname, '..', '.env'));
  const gcKey = process.env.GOOGLE_CLOUD_KEY_PATH;
  if (gcKey && gcKey.startsWith('./')) {
    process.env.GOOGLE_CLOUD_KEY_PATH = path.resolve(__dirname, '..', gcKey);
  }
})();

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
if (!TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN is not set');
  process.exit(1);
}

const API_HOST = 'api.telegram.org';
const API_PREFIX = `/bot${TOKEN}`;
const FILE_PREFIX = `/file/bot${TOKEN}`;

const smart = new SmartSearchService();
let products = [];
try {
  const p = path.resolve(__dirname, '..', 'data', 'sample-products.json');
  products = JSON.parse(fs.readFileSync(p, 'utf8'));
} catch (e) {
  console.error('Failed to load products:', e.message);
}

function tg(method, payload) {
  return new Promise((resolve, reject) => {
    const data = payload ? JSON.stringify(payload) : null;
    const req = https.request({
      hostname: API_HOST,
      port: 443,
      path: `${API_PREFIX}/${method}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.ok) return resolve(json.result);
          reject(new Error(json.description || 'Telegram error'));
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function tgGet(pathname) {
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname: API_HOST, port: 443, path: pathname, method: 'GET' }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', reject);
    req.end();
  });
}

async function downloadFile(fileId) {
  const file = await tg('getFile', { file_id: fileId });
  const filePath = file.file_path;
  const buf = await tgGet(`${FILE_PREFIX}/${filePath}`);
  return buf;
}

async function handleText(chatId, text) {
  const res = smart.search(text, products);
  const list = (res.exact.length ? res.exact : res.fuzzy).slice(0, 5);
  if (!list.length) {
    return tg('sendMessage', { chat_id: chatId, text: `No results for: ${text}` });
  }
  const lines = [
    `Top results for: ${text}`,
    ...list.map((p, i) => `${i + 1}. ${p.name} — ₹${p.price}${p.link ? `\n${p.link}` : ''}`)
  ];
  return tg('sendMessage', { chat_id: chatId, text: lines.join('\n'), disable_web_page_preview: true });
}

async function handleVoice(chatId, voice) {
  try {
    if (!smart.enableVoiceSearch) throw new Error('Voice search disabled');
    await tg('sendMessage', { chat_id: chatId, text: '🎙️ Recognizing voice…' });
    const buf = await downloadFile(voice.file_id);
    const text = await smart.recognizeVoice(buf);
    if (text) {
      await tg('sendMessage', { chat_id: chatId, text: `Heard: ${text}` });
      return handleText(chatId, text);
    }
  } catch (e) {
    console.error('voice error:', e.message);
  }
  return tg('sendMessage', { chat_id: chatId, text: 'Voice smart search is not available right now.' });
}

async function handlePhoto(chatId, photos) {
  try {
    if (!smart.enableImageSearch) throw new Error('Image search disabled');
    await tg('sendMessage', { chat_id: chatId, text: '📸 Analyzing image…' });
    const largest = photos[photos.length - 1];
    const buf = await downloadFile(largest.file_id);
    const info = await smart.recognizeImage(buf);
    if (info?.query) {
      await tg('sendMessage', { chat_id: chatId, text: `Detected: ${info.description?.slice(0, 140) || info.query}` });
      return handleText(chatId, info.query);
    }
  } catch (e) {
    console.error('photo error:', e.message);
  }
  return tg('sendMessage', { chat_id: chatId, text: 'Image smart search is not available right now.' });
}

async function handleCommand(chatId, cmd) {
  const c = (cmd || '').trim().split(/\s+/)[0];
  switch (c) {
    case '/start':
      return tg('sendMessage', {
        chat_id: chatId,
        text: 'Привет! Я умный поиск BazaarGuru.\n— Введите запрос текстом\n— Отправьте фото товара\n— Или пришлите голосовое сообщение',
      });
    case '/help':
      return tg('sendMessage', {
        chat_id: chatId,
        text: 'Помощь:\nТекст — поиск по товарам\nФото — распознаю и подберу\nГолос — распознаю речь и найду',
      });
    default:
      return tg('sendMessage', { chat_id: chatId, text: 'Неизвестная команда. Напишите запрос, пришлите фото или голос.' });
  }
}
async function poll() {
  let offset = 0;
  for (;;) {
    try {
      const updates = await new Promise((resolve, reject) => {
        const data = JSON.stringify({ offset, timeout: 50 });
        const req = https.request({
          hostname: API_HOST,
          port: 443,
          path: `${API_PREFIX}/getUpdates`,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }, (res) => {
          let body = '';
          res.on('data', (c) => (body += c));
          res.on('end', () => {
            try {
              const json = JSON.parse(body);
              if (json.ok) return resolve(json.result || []);
              reject(new Error(json.description || 'getUpdates failed'));
            } catch (e) { reject(e); }
          });
        });
        req.on('error', reject);
        req.write(data);
        req.end();
      });

      for (const u of updates) {
        offset = Math.max(offset, (u.update_id || 0) + 1);
        const msg = u.message || u.edited_message;
        if (!msg || !msg.chat) continue;
        const chatId = msg.chat.id;
        if (msg.text) {
  const t = msg.text.trim();
  if (t.startsWith('/')) await handleCommand(chatId, t);
  else await handleText(chatId, t);
}
        else if (msg.voice) await handleVoice(chatId, msg.voice);
        else if (Array.isArray(msg.photo) && msg.photo.length) await handlePhoto(chatId, msg.photo);
      }
    } catch (e) {
      console.error('poll error:', e.message);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

if (require.main === module) {
  console.log('[Smart RAW Bot] starting…');
  poll();
}

module.exports = { poll };
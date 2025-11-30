#!/usr/bin/env node

// Test Telegram API connection
const https = require('https');

const token = process.env.TELEGRAM_BOT_TOKEN || '8381471660:AAEK_I4XHl3emmH1s5K_hwuzMeNQbjtqsB0';

console.log('🔍 Testing Telegram API connection...');
console.log(`📡 Using token: ${token.substring(0, 10)}...`);

const options = {
  hostname: 'api.telegram.org',
  port: 443,
  path: `/bot${token}/getMe`,
  method: 'GET',
  timeout: 10000
};

const req = https.request(options, (res) => {
  console.log(`✅ Connection successful! Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      if (result.ok) {
        console.log('🤖 Bot info:', result.result);
        console.log('✅ Telegram API is working!');
      } else {
        console.log('❌ API Error:', result.description);
      }
    } catch (error) {
      console.log('❌ Parse Error:', error.message);
    }
  });
});

req.on('error', (error) => {
  console.log('❌ Connection failed:', error.message);
  console.log('');
  console.log('🔧 Possible solutions:');
  console.log('1. Check your internet connection');
  console.log('2. Try using a VPN');
  console.log('3. Change DNS to 8.8.8.8 or 1.1.1.1');
  console.log('4. Check if Telegram is blocked in your network');
  console.log('5. Try again in a few minutes');
});

req.on('timeout', () => {
  console.log('⏰ Connection timeout - network is too slow');
  req.destroy();
});

req.end();
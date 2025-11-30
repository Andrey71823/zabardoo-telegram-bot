#!/usr/bin/env node

const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🤖 bazaarGuru BOT TOKEN SETUP');
console.log('=' .repeat(40));
console.log('');
console.log('📋 Instructions:');
console.log('1. Go to @BotFather on Telegram');
console.log('2. Send /newbot or use your existing bot');
console.log('3. Copy your bot token');
console.log('4. Paste it below');
console.log('');

rl.question('🔑 Enter your Telegram Bot Token: ', (token) => {
  if (!token || token.trim() === '') {
    console.log('❌ No token provided. Exiting...');
    rl.close();
    return;
  }

  // Validate token format (basic check)
  if (!token.includes(':') || token.length < 40) {
    console.log('❌ Invalid token format. Please check your token.');
    rl.close();
    return;
  }

  try {
    // Update .env file
    let envContent = '';
    if (fs.existsSync('.env')) {
      envContent = fs.readFileSync('.env', 'utf8');
    }

    // Replace or add the token
    if (envContent.includes('TELEGRAM_BOT_TOKEN=')) {
      envContent = envContent.replace(/TELEGRAM_BOT_TOKEN=.*/, `TELEGRAM_BOT_TOKEN=${token}`);
    } else {
      envContent += `\nTELEGRAM_BOT_TOKEN=${token}\n`;
    }

    fs.writeFileSync('.env', envContent);

    console.log('');
    console.log('✅ Token saved successfully!');
    console.log('');
    console.log('🚀 Now you can start your bot:');
    console.log('   npm run start:simple');
    console.log('');
    console.log('📱 Go to Telegram and send /start to your bot!');

  } catch (error) {
    console.log('❌ Error saving token:', error.message);
  }

  rl.close();
});
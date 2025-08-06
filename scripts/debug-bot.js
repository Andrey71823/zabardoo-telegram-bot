#!/usr/bin/env node

// Debug script to check bot functionality
const EnhancedGuideTelegramBot = require('./enhanced-guide-bot.js');

console.log('🔍 Debugging Enhanced Guide Bot...');
console.log('');

// Create bot instance
const bot = new EnhancedGuideTelegramBot();

// Test keyboards
console.log('📋 Main Keyboard Structure:');
const mainKeyboard = bot.getMainKeyboard();
console.log(JSON.stringify(mainKeyboard, null, 2));

console.log('');
console.log('📋 Category Keyboard Structure:');
const categoryKeyboard = bot.getCategoryKeyboard();
console.log(JSON.stringify(categoryKeyboard, null, 2));

console.log('');
console.log('🔍 Looking for Guide button...');
let guideFound = false;

// Check main keyboard
mainKeyboard.inline_keyboard.forEach((row, rowIndex) => {
  row.forEach((button, buttonIndex) => {
    if (button.text.includes('Guide')) {
      console.log(`✅ Found Guide button in main keyboard: Row ${rowIndex + 1}, Position ${buttonIndex + 1}`);
      console.log(`   Text: "${button.text}"`);
      console.log(`   Callback: "${button.callback_data}"`);
      guideFound = true;
    }
  });
});

// Check category keyboard
categoryKeyboard.inline_keyboard.forEach((row, rowIndex) => {
  row.forEach((button, buttonIndex) => {
    if (button.text.includes('Guide')) {
      console.log(`✅ Found Guide button in category keyboard: Row ${rowIndex + 1}, Position ${buttonIndex + 1}`);
      console.log(`   Text: "${button.text}"`);
      console.log(`   Callback: "${button.callback_data}"`);
      guideFound = true;
    }
  });
});

if (!guideFound) {
  console.log('❌ Guide button NOT found in keyboards!');
}

console.log('');
console.log('🔍 Checking for AI Recommendations and Hot Deals...');
let aiFound = false;
let hotDealsFound = false;

categoryKeyboard.inline_keyboard.forEach((row, rowIndex) => {
  row.forEach((button, buttonIndex) => {
    if (button.text.includes('AI Recommendations')) {
      console.log(`✅ Found AI Recommendations: Row ${rowIndex + 1}, Position ${buttonIndex + 1}`);
      aiFound = true;
    }
    if (button.text.includes('Hot Deals')) {
      console.log(`✅ Found Hot Deals: Row ${rowIndex + 1}, Position ${buttonIndex + 1}`);
      hotDealsFound = true;
    }
  });
});

console.log('');
console.log('📊 Summary:');
console.log(`Guide button: ${guideFound ? '✅ Present' : '❌ Missing'}`);
console.log(`AI Recommendations: ${aiFound ? '✅ Present' : '❌ Missing'}`);
console.log(`Hot Deals: ${hotDealsFound ? '✅ Present' : '❌ Missing'}`);

console.log('');
console.log('💡 If buttons are missing in Telegram:');
console.log('1. Stop the current bot (Ctrl+C)');
console.log('2. Wait 5 seconds');
console.log('3. Restart with: npm run start:guide');
console.log('4. Send /start to the bot again');
console.log('');
console.log('🔧 The bot needs to restart to apply keyboard changes!');
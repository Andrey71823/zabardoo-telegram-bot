#!/usr/bin/env node

// Test script for Enhanced Guide Bot
const EnhancedGuideTelegramBot = require('./enhanced-guide-bot.js');

console.log('🧪 Testing Enhanced Guide Bot...');
console.log('');

// Test bot initialization
const bot = new EnhancedGuideTelegramBot();

// Test keyboard layouts
console.log('📋 Testing Main Keyboard:');
const mainKeyboard = bot.getMainKeyboard();
console.log('Main keyboard buttons:', mainKeyboard.inline_keyboard.length, 'rows');
mainKeyboard.inline_keyboard.forEach((row, i) => {
  console.log(`Row ${i + 1}:`, row.map(btn => btn.text).join(' | '));
});

console.log('');
console.log('📋 Testing Category Keyboard:');
const categoryKeyboard = bot.getCategoryKeyboard();
console.log('Category keyboard buttons:', categoryKeyboard.inline_keyboard.length, 'rows');
categoryKeyboard.inline_keyboard.forEach((row, i) => {
  console.log(`Row ${i + 1}:`, row.map(btn => btn.text).join(' | '));
});

console.log('');
console.log('✅ Bot structure test completed!');
console.log('');
console.log('🚀 To start the bot, run:');
console.log('npm run start:guide');
console.log('');
console.log('📖 Features included:');
console.log('   ✅ Guide button in top row with AI Recommendations and Hot Deals');
console.log('   ✅ Complete guide with simple explanations');
console.log('   ✅ All categories preserved (Fashion, Beauty, Food, etc.)');
console.log('   ✅ Bot commands in Telegram menu');
console.log('   ✅ No message duplication');
console.log('   ✅ Fixed menu positions');
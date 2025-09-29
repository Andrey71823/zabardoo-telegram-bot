#!/usr/bin/env node

// Fix All Bot Menus - Replace Russian with English
const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing all bot menus to English...');

// List of bot files to fix
const botFiles = [
  'scripts/demo-fixed-menu-bot.js',
  'scripts/complete-bazaarGuru-bot.js',
  'scripts/enhanced-guide-bot.js',
  'scripts/working-bot.js',
  'scripts/exact-bazaarGuru-bot.js'
];

// English menu configuration
const englishMenu = {
  keyboard: [
    ['🔍 Find Deals', '🎮 My Profile', '📖 Guide'],
    ['💰 Cashback', '🎲 Random Deal', '🧠 Ask bazaarGuru'],
    ['⚙️ Settings', '🌐 Language', '🆘 Help']
  ],
  resize_keyboard: true,
  persistent: true
};

// Russian patterns to replace
const russianPatterns = [
  /🔍.*Поиск.*товаров?/g,
  /📱.*Смартфоны?/g,
  /💻.*Ноутбуки?/g,
  /🏠.*Товары.*дома?/g,
  /💬.*Пожелание/g,
  /😋.*Жалоба/g,
  /ℹ️.*Помощь/g
];

function fixBotFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Replace Russian keyboard with English
    const russianKeyboardPattern = /keyboard:\s*\[\s*\[.*?Поиск.*?\].*?\]/gs;
    if (russianKeyboardPattern.test(content)) {
      content = content.replace(russianKeyboardPattern, 
        `keyboard: [
        ['🔍 Find Deals', '🎮 My Profile', '📖 Guide'],
        ['💰 Cashback', '🎲 Random Deal', '🧠 Ask bazaarGuru'],
        ['⚙️ Settings', '🌐 Language', '🆘 Help']
      ]`);
      modified = true;
      console.log(`✅ Fixed keyboard in ${filePath}`);
    }

    // Replace individual Russian button handlers
    const buttonReplacements = [
      ['🔍.*Поиск.*товаров?', '🔍 Find Deals'],
      ['📱.*Смартфоны?', '🎮 My Profile'],
      ['💻.*Ноутбуки?', '📖 Guide'],
      ['🏠.*Товары.*дома?', '💰 Cashback'],
      ['💬.*Пожелание', '🎲 Random Deal'],
      ['😋.*Жалоба', '🧠 Ask bazaarGuru'],
      ['ℹ️.*Помощь', '🆘 Help']
    ];

    buttonReplacements.forEach(([pattern, replacement]) => {
      const regex = new RegExp(`case\\s*['"]${pattern}['"]`, 'g');
      if (regex.test(content)) {
        content = content.replace(regex, `case '${replacement}'`);
        modified = true;
      }
    });

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated ${filePath}`);
      return true;
    } else {
      console.log(`ℹ️  No Russian menu found in ${filePath}`);
      return false;
    }

  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

// Fix all bot files
let fixedCount = 0;
botFiles.forEach(filePath => {
  if (fixBotFile(filePath)) {
    fixedCount++;
  }
});

console.log('');
console.log('🎉 Menu fix completed!');
console.log(`✅ Fixed ${fixedCount} bot files`);
console.log('');
console.log('📱 New English menu structure:');
console.log('   Row 1: 🔍 Find Deals | 🎮 My Profile | 📖 Guide');
console.log('   Row 2: 💰 Cashback | 🎲 Random Deal | 🧠 Ask bazaarGuru');
console.log('   Row 3: ⚙️ Settings | 🌐 Language | 🆘 Help');
console.log('');
console.log('🔄 Restart your bots to see the changes!');
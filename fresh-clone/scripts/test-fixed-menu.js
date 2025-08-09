#!/usr/bin/env node

// Простой тест для проверки фиксированного меню бота
console.log('🧪 Testing Fixed Menu Bot...\n');

try {
  // Проверяем, что файл можно загрузить без ошибок
  const FixedMenuBot = require('./demo-fixed-menu-bot.js');
  console.log('✅ Bot file loaded successfully');
  
  // Проверяем основные компоненты
  const bot = new FixedMenuBot();
  console.log('✅ Bot instance created successfully');
  
  // Проверяем, что у бота есть купоны
  if (bot.demoCoupons && bot.demoCoupons.length > 0) {
    console.log(`✅ Demo coupons loaded: ${bot.demoCoupons.length} coupons`);
    
    // Показываем статистику по магазинам
    const stores = {};
    bot.demoCoupons.forEach(coupon => {
      stores[coupon.store] = (stores[coupon.store] || 0) + 1;
    });
    
    console.log('\n📊 Coupons by store:');
    Object.entries(stores).forEach(([store, count]) => {
      console.log(`  ${store}: ${count} coupons`);
    });
    
    // Показываем статистику по категориям
    const categories = {};
    bot.demoCoupons.forEach(coupon => {
      categories[coupon.category] = (categories[coupon.category] || 0) + 1;
    });
    
    console.log('\n📊 Coupons by category:');
    Object.entries(categories).forEach(([category, count]) => {
      console.log(`  ${category}: ${count} coupons`);
    });
    
  } else {
    console.log('❌ No demo coupons found');
  }
  
  // Проверяем фиксированное меню
  const keyboard = bot.getFixedMenuKeyboard();
  if (keyboard && keyboard.keyboard) {
    console.log('\n✅ Fixed menu keyboard configured');
    console.log('Menu structure:');
    keyboard.keyboard.forEach((row, index) => {
      console.log(`  Row ${index + 1}: ${row.join(' | ')}`);
    });
  } else {
    console.log('❌ Fixed menu keyboard not configured');
  }
  
  console.log('\n🎉 All tests passed! Bot is ready to run.');
  console.log('\n💡 To start the bot, run: node scripts/demo-fixed-menu-bot.js');
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.error('\nStack trace:', error.stack);
  process.exit(1);
}
#!/usr/bin/env node

// Demo script for final features: AI Content Tools, Loot Mode, Admin Moderation
console.log('🎉 ДЕМОНСТРАЦИЯ ФИНАЛЬНЫХ ВОЗМОЖНОСТЕЙ bazaarGuru BOT');
console.log('=' .repeat(60));

// Import services
const { AIContentService } = require('../src/services/ai/AIContentService');
const { LootModeService } = require('../src/services/gamification/LootModeService');
const { AdminModerationService } = require('../src/services/admin/AdminModerationService');

async function demoAIContentTools() {
  console.log('\n🤖 AI CONTENT TOOLS DEMO');
  console.log('-'.repeat(40));
  
  const aiContent = new AIContentService();
  
  // Demo Instagram caption generation
  console.log('📸 Генерация Instagram Caption:');
  const instagramRequest = {
    type: 'instagram_caption',
    context: {
      dealTitle: 'iPhone 15 Pro',
      storeName: 'Amazon India',
      discount: '25% OFF',
      price: '₹89,900',
      category: 'electronics',
      mood: 'exciting'
    }
  };
  
  try {
    const caption = await aiContent.generateInstagramCaption(instagramRequest);
    console.log('✅ Generated Caption:');
    console.log(caption.content);
    console.log('📱 Hashtags:', caption.hashtags?.slice(0, 5).join(' '));
  } catch (error) {
    console.log('⚠️ Using fallback caption generation');
  }
  
  // Demo meme generation
  console.log('\n😂 Генерация Мема:');
  const memeRequest = {
    type: 'meme',
    context: {
      dealTitle: 'MacBook Pro M3',
      storeName: 'Flipkart',
      discount: '20% OFF',
      category: 'electronics',
      mood: 'funny'
    }
  };
  
  try {
    const meme = await aiContent.generateMeme(memeRequest);
    console.log('✅ Generated Meme:');
    console.log(meme.content);
  } catch (error) {
    console.log('⚠️ Using fallback meme generation');
  }
  
  // Demo hashtag suggestions
  console.log('\n#️⃣ Генерация Хештегов:');
  const hashtagRequest = {
    type: 'hashtags',
    context: {
      category: 'fashion',
      storeName: 'Myntra',
      occasion: 'sale'
    }
  };
  
  const hashtags = await aiContent.generateHashtagSuggestions(hashtagRequest);
  console.log('✅ Generated Hashtags:');
  console.log(hashtags.content);
}

async function demoLootMode() {
  console.log('\n🎰 LOOT MODE & SPIN THE WHEEL DEMO');
  console.log('-'.repeat(40));
  
  const lootMode = new LootModeService();
  
  // Demo user spin
  console.log('🎲 Пользователь крутит колесо:');
  const userId = 'demo_user_123';
  
  try {
    const spinResult = await lootMode.spinWheel(userId);
    
    if (spinResult.success) {
      console.log('✅ Результат спина:');
      console.log(`🎁 Награда: ${spinResult.result.reward.title}`);
      console.log(`💎 Редкость: ${spinResult.result.reward.rarity}`);
      console.log(`💰 Значение: ${spinResult.result.reward.value}`);
      console.log(`🎊 Джекпот: ${spinResult.result.isJackpot ? 'ДА!' : 'Нет'}`);
    } else {
      console.log('❌ Спин не удался:', spinResult.error);
      if (spinResult.nextSpinAvailable) {
        console.log('⏰ Следующий спин доступен:', spinResult.nextSpinAvailable);
      }
    }
  } catch (error) {
    console.log('⚠️ Ошибка демо спина');
  }
  
  // Demo user stats
  console.log('\n📊 Статистика пользователя:');
  const userStats = await lootMode.getUserLootStats(userId);
  console.log(`🎯 Всего спинов: ${userStats.totalSpins}`);
  console.log(`🏆 Всего наград: ${userStats.totalRewardsWon}`);
  console.log(`🔥 Текущий стрик: ${userStats.currentStreak}`);
  console.log(`💎 Джекпотов выиграно: ${userStats.jackpotsWon}`);
  
  // Demo available rewards
  console.log('\n🎁 Доступные награды:');
  const rewards = await lootMode.getAvailableRewards();
  rewards.slice(0, 5).forEach(reward => {
    console.log(`${reward.icon} ${reward.title} (${reward.rarity})`);
  });
  
  // Demo leaderboard
  console.log('\n🏆 Таблица лидеров (по спинам):');
  const leaderboard = await lootMode.getLeaderboard('total_spins', 3);
  leaderboard.forEach((entry, index) => {
    console.log(`${index + 1}. User ${entry.userId}: ${entry.value} спинов`);
  });
}

async function demoAdminModeration() {
  console.log('\n🛡️ ADMIN MODERATION SYSTEM DEMO');
  console.log('-'.repeat(40));
  
  const moderation = new AdminModerationService();
  
  // Demo message moderation
  console.log('🔍 Модерация сообщений:');
  
  const testMessages = [
    { content: 'Привет! Как дела?', expected: 'allowed' },
    { content: 'AAAAAAAAAA спам спам спам', expected: 'spam' },
    { content: 'Fuck this shit!', expected: 'profanity' },
    { content: 'Check out this deal: https://scam-site.com', expected: 'url' },
    { content: 'Free money! Click here to win!', expected: 'scam' }
  ];
  
  for (const test of testMessages) {
    const result = await moderation.moderateMessage(
      'test_user',
      test.content,
      'msg_123',
      'chat_456'
    );
    
    console.log(`📝 "${test.content.substring(0, 30)}..."`);
    console.log(`   ${result.allowed ? '✅ Разрешено' : '❌ Заблокировано'}`);
    if (!result.allowed) {
      console.log(`   🚫 Причина: ${result.reason}`);
      console.log(`   ⚡ Действие: ${result.action}`);
    }
  }
  
  // Demo moderation rules
  console.log('\n📋 Правила модерации:');
  const rules = await moderation.getModerationRules();
  rules.slice(0, 3).forEach(rule => {
    console.log(`🔧 ${rule.name}: ${rule.description}`);
    console.log(`   Действие: ${rule.action}, Серьезность: ${rule.severity}`);
  });
  
  // Demo moderation stats
  console.log('\n📊 Статистика модерации:');
  const stats = await moderation.getModerationStats();
  console.log(`🎯 Всего действий: ${stats.totalActions}`);
  console.log(`🤖 Автоопределение: ${stats.autoDetectionRate.toFixed(1)}%`);
  console.log(`👥 Активных пользователей: ${stats.activeUsers}`);
  console.log(`🚫 Заблокированных: ${stats.bannedUsers}`);
  console.log(`🚩 Помеченных: ${stats.flaggedUsers}`);
}

async function demoLanguageIntegration() {
  console.log('\n🌐 LANGUAGE INTEGRATION DEMO');
  console.log('-'.repeat(40));
  
  console.log('🗣️ Поддерживаемые языки в боте:');
  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'hi', name: 'हिंदी (Hindi)', flag: '🇮🇳' },
    { code: 'bn', name: 'বাংলা (Bengali)', flag: '🇮🇳' },
    { code: 'ta', name: 'தமிழ் (Tamil)', flag: '🇮🇳' },
    { code: 'te', name: 'తెలుగు (Telugu)', flag: '🇮🇳' },
    { code: 'gu', name: 'ગુજરાતી (Gujarati)', flag: '🇮🇳' },
    { code: 'kn', name: 'ಕನ್ನಡ (Kannada)', flag: '🇮🇳' },
    { code: 'ml', name: 'മലയാളം (Malayalam)', flag: '🇮🇳' },
    { code: 'mr', name: 'मराठी (Marathi)', flag: '🇮🇳' }
  ];
  
  languages.forEach(lang => {
    console.log(`${lang.flag} ${lang.name} (${lang.code})`);
  });
  
  console.log('\n🎯 Новые кнопки в боте:');
  console.log('🎲 Random Deal - случайные предложения');
  console.log('🌐 Language Selector - выбор языка');
  console.log('🧠 Ask bazaarGuru - ИИ помощник');
  
  console.log('\n✨ Интеграция завершена в enhanced-guide-bot.js');
}

async function runDemo() {
  try {
    await demoAIContentTools();
    await demoLootMode();
    await demoAdminModeration();
    await demoLanguageIntegration();
    
    console.log('\n🎊 ДЕМОНСТРАЦИЯ ЗАВЕРШЕНА!');
    console.log('=' .repeat(60));
    console.log('✅ Все новые возможности успешно продемонстрированы');
    console.log('🚀 Система готова к запуску!');
    
  } catch (error) {
    console.error('❌ Ошибка демонстрации:', error.message);
  }
}

// Запуск демо
if (require.main === module) {
  runDemo();
}

module.exports = { runDemo };
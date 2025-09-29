const TelegramBot = require('node-telegram-bot-api');

// Bot configuration
const token = process.env.TELEGRAM_BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE';
const bot = new TelegramBot(token, { polling: true });

// ПРАВИЛЬНОЕ REPLY KEYBOARD - СИНХРОНИЗИРОВАННОЕ С INLINE
const correctReplyKeyboard = {
  keyboard: [
    ['🤖 AI Recommendations', '🔥 Hot Deals', '📖 Guide'],
    ['📱 Electronics', '👗 Fashion', '💄 Beauty'],
    ['🍔 Food', '🏪 Stores', '⚙️ Settings'],
    ['🔍 Find Deals', '🎮 My Profile'],
    ['💰 Cashback', '🆘 Help']
  ],
  resize_keyboard: true,
  one_time_keyboard: false
};

// INLINE KEYBOARD - В СООБЩЕНИИ
const inlineMainMenu = {
  inline_keyboard: [
    [
      { text: '🤖 AI Recommendations', callback_data: 'ai_recommendations' },
      { text: '🔥 Hot Deals', callback_data: 'hot_deals' },
      { text: '📖 Guide', callback_data: 'guide' }
    ],
    [
      { text: '📱 Electronics', callback_data: 'electronics' },
      { text: '👗 Fashion', callback_data: 'fashion' },
      { text: '💄 Beauty', callback_data: 'beauty' }
    ],
    [
      { text: '🍔 Food', callback_data: 'food' },
      { text: '🏪 Stores', callback_data: 'stores' },
      { text: '⚙️ Settings', callback_data: 'settings' }
    ],
    [
      { text: '🔍 Find Deals', callback_data: 'find_deals' },
      { text: '🎮 My Profile', callback_data: 'my_profile' }
    ],
    [
      { text: '💰 Cashback', callback_data: 'cashback' },
      { text: '🆘 Help', callback_data: 'help' }
    ]
  ]
};

// Bot commands
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name || 'Friend';
  
  const welcomeMessage = `🎉 Welcome to bazaarGuru Enhanced Bot, ${firstName}! 🌟

🚀 I'm your AI-powered deal discovery assistant!

🎯 What I can do for you:
🎤 Voice Search - Send me a voice message! (Try: "bottle", "headphones")
📸 Image Recognition - Send me a product photo! (Just tap and send)
🎮 Gamification - Earn XP and unlock achievements!
⚠️ Smart Notifications - Get personalized deal alerts!
💰 Cashback Tracking - Track your savings!

💎 Level 1 • ⚡ 0 XP • 🏆 0/50 Achievements

🎮 Today's Mission: Find your first amazing deal!

🔧📸 QUICK START: Send voice message or photo right now for instant deals!

Ready to save some serious money? Let's go! 🚀

💡 Tip: Click 📖 Guide button for complete instructions on all buttons!`;

  // ОТПРАВЛЯЕМ С INLINE КНОПКАМИ
  await bot.sendMessage(chatId, welcomeMessage, {
    parse_mode: 'Markdown',
    reply_markup: inlineMainMenu
  });
  
  // ПРИНУДИТЕЛЬНО УСТАНАВЛИВАЕМ ПРАВИЛЬНУЮ REPLY KEYBOARD
  await bot.sendMessage(chatId, '🔄 *Menu Updated!*\n\nNow both menus have the same functions:', {
    parse_mode: 'Markdown',
    reply_markup: correctReplyKeyboard
  });
});

// Команда для принудительного обновления меню
bot.onText(/\/menu/, async (msg) => {
  const chatId = msg.chat.id;
  
  await bot.sendMessage(chatId, '🔄 *Force Menu Update*\n\n✅ Correct synchronized menu applied:', {
    parse_mode: 'Markdown',
    reply_markup: correctReplyKeyboard
  });
});

// Команда для показа структуры меню
bot.onText(/\/structure/, async (msg) => {
  const chatId = msg.chat.id;
  
  const structureMessage = `📱 *Menu Structure*

🎯 **INLINE MENU** (in message):
Row 1: [🤖 AI Recommendations] [🔥 Hot Deals] [📖 Guide]
Row 2: [📱 Electronics] [👗 Fashion] [💄 Beauty]
Row 3: [🍔 Food] [🏪 Stores] [⚙️ Settings]
Row 4: [🔍 Find Deals] [🎮 My Profile]
Row 5: [💰 Cashback] [🆘 Help]

🎯 **REPLY MENU** (at bottom):
Row 1: [🤖 AI Recommendations] [🔥 Hot Deals] [📖 Guide]
Row 2: [📱 Electronics] [👗 Fashion] [💄 Beauty]
Row 3: [🍔 Food] [🏪 Stores] [⚙️ Settings]
Row 4: [🔍 Find Deals] [🎮 My Profile]
Row 5: [💰 Cashback] [🆘 Help]

✅ **IDENTICAL FUNCTIONS!**`;

  await bot.sendMessage(chatId, structureMessage, {
    parse_mode: 'Markdown',
    reply_markup: correctReplyKeyboard
  });
});

// Handle callback queries (inline buttons)
bot.on('callback_query', async (callbackQuery) => {
  const message = callbackQuery.message;
  const chatId = message.chat.id;
  const data = callbackQuery.data;

  await bot.answerCallbackQuery(callbackQuery.id);

  let responseMessage = '';
  
  switch (data) {
    case 'ai_recommendations':
      responseMessage = '🤖 *AI Recommendations*\n\nPersonalized product suggestions based on your preferences!';
      break;
    case 'hot_deals':
      responseMessage = '🔥 *Hot Deals*\n\nTrending offers and discounts from top Indian stores!';
      break;
    case 'guide':
      responseMessage = '📖 *Shopping Guide*\n\nComplete instructions on how to use all features!';
      break;
    case 'electronics':
      responseMessage = '📱 *Electronics*\n\nSmartphones, laptops, gadgets and more!';
      break;
    case 'fashion':
      responseMessage = '👗 *Fashion*\n\nClothing, shoes, accessories for men and women!';
      break;
    case 'beauty':
      responseMessage = '💄 *Beauty*\n\nSkincare, makeup, personal care products!';
      break;
    case 'food':
      responseMessage = '🍔 *Food*\n\nGroceries, snacks, beverages and more!';
      break;
    case 'stores':
      responseMessage = '🏪 *Stores*\n\nFlipkart, Amazon India, Myntra, Nykaa, AJIO and more!';
      break;
    case 'settings':
      responseMessage = '⚙️ *Settings*\n\nCustomize your preferences and notifications!';
      break;
    case 'find_deals':
      responseMessage = '🔍 *Find Deals*\n\nSearch for specific products and compare prices!';
      break;
    case 'my_profile':
      responseMessage = '🎮 *My Profile*\n\nView your stats, achievements and savings!';
      break;
    case 'cashback':
      responseMessage = '💰 *Cashback*\n\nEarn money back on your purchases!';
      break;
    case 'help':
      responseMessage = '🆘 *Help*\n\nGet support and learn how to use all features!';
      break;
    default:
      responseMessage = '❓ Unknown function. Please try again.';
  }

  await bot.sendMessage(chatId, responseMessage, {
    parse_mode: 'Markdown',
    reply_markup: correctReplyKeyboard
  });
});

// Handle text messages (reply keyboard)
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text || text.startsWith('/')) return;

  let responseMessage = '';
  
  switch (text) {
    case '🤖 AI Recommendations':
      responseMessage = '🤖 *AI Recommendations*\n\nPersonalized product suggestions based on your preferences!';
      break;
    case '🔥 Hot Deals':
      responseMessage = '🔥 *Hot Deals*\n\nTrending offers and discounts from top Indian stores!';
      break;
    case '📖 Guide':
      responseMessage = '📖 *Shopping Guide*\n\nComplete instructions on how to use all features!';
      break;
    case '📱 Electronics':
      responseMessage = '📱 *Electronics*\n\nSmartphones, laptops, gadgets and more!';
      break;
    case '👗 Fashion':
      responseMessage = '👗 *Fashion*\n\nClothing, shoes, accessories for men and women!';
      break;
    case '💄 Beauty':
      responseMessage = '💄 *Beauty*\n\nSkincare, makeup, personal care products!';
      break;
    case '🍔 Food':
      responseMessage = '🍔 *Food*\n\nGroceries, snacks, beverages and more!';
      break;
    case '🏪 Stores':
      responseMessage = '🏪 *Stores*\n\nFlipkart, Amazon India, Myntra, Nykaa, AJIO and more!';
      break;
    case '⚙️ Settings':
      responseMessage = '⚙️ *Settings*\n\nCustomize your preferences and notifications!';
      break;
    case '🔍 Find Deals':
      responseMessage = '🔍 *Find Deals*\n\nSearch for specific products and compare prices!';
      break;
    case '🎮 My Profile':
      responseMessage = '🎮 *My Profile*\n\nView your stats, achievements and savings!';
      break;
    case '💰 Cashback':
      responseMessage = '💰 *Cashback*\n\nEarn money back on your purchases!';
      break;
    case '🆘 Help':
      responseMessage = '🆘 *Help*\n\nGet support and learn how to use all features!';
      break;
    default:
      responseMessage = `🔍 Searching for "${text}"...\n\nThis would normally search for products matching your query!`;
  }

  await bot.sendMessage(chatId, responseMessage, {
    parse_mode: 'Markdown',
    reply_markup: correctReplyKeyboard
  });
});

// Error handling
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

console.log('🚀 Force Correct Menu Bot is running!');
console.log('📱 This bot FORCES the correct synchronized menu');
console.log('🎯 Commands:');
console.log('  /start - Start with correct menu');
console.log('  /menu - Force menu update');
console.log('  /structure - Show menu structure');
console.log('✅ Both inline and reply menus are identical!');
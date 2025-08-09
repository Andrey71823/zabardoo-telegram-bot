const TelegramBot = require('node-telegram-bot-api');

// Bot configuration
const token = process.env.TELEGRAM_BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE';
const bot = new TelegramBot(token, { polling: true });

// REPLY KEYBOARD - как в оригинальном боте
const replyKeyboard = {
  keyboard: [
    ['🔍 Find Deals', '🎮 My Profile', '📖 Guide'],
    ['💰 Cashback', '🎲 Random Deal', '💬 Ask Zabardoo'],
    ['⚙️ Settings', '🌐 Language', '🆘 Help']
  ],
  resize_keyboard: true,
  one_time_keyboard: false
};

// Bot commands
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  
  await bot.sendMessage(chatId, '🔍 *Debug Bot Started*\n\nThis bot will show you exactly what text each button sends.', {
    parse_mode: 'Markdown',
    reply_markup: replyKeyboard
  });
});

// Handle ALL messages and show exactly what was received
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text || text.startsWith('/')) return;

  // Show exactly what was received
  const debugMessage = `🔍 *Button Debug Info*

📝 **Received text:** "${text}"
📏 **Text length:** ${text.length}
🔤 **Character codes:** ${text.split('').map(char => char.charCodeAt(0)).join(', ')}

🎯 **Expected functions:**`;

  let expectedFunction = '';
  
  switch (text) {
    case '🔍 Find Deals':
      expectedFunction = '✅ handleFindDeals() - Поиск товаров';
      break;
    case '🎮 My Profile':
      expectedFunction = '✅ handleMyProfile() - Профиль пользователя';
      break;
    case '📖 Guide':
      expectedFunction = '✅ handleGuide() - Руководство';
      break;
    case '💰 Cashback':
      expectedFunction = '✅ handleCashback() - Информация о кэшбеке';
      break;
    case '🎲 Random Deal':
      expectedFunction = '✅ handleRandomDeal() - Случайное предложение';
      break;
    case '💬 Ask Zabardoo':
      expectedFunction = '✅ handleAskZabardoo() - Помощник для вопросов';
      break;
    case '⚙️ Settings':
      expectedFunction = '✅ handleSettings() - Настройки';
      break;
    case '🌐 Language':
      expectedFunction = '✅ handleLanguage() - Выбор языка';
      break;
    case '🆘 Help':
      expectedFunction = '✅ handleHelp() - Помощь и поддержка';
      break;
    default:
      expectedFunction = '❌ DEFAULT CASE - будет обработано как поиск товаров';
  }

  await bot.sendMessage(chatId, debugMessage + '\n' + expectedFunction, {
    parse_mode: 'Markdown',
    reply_markup: replyKeyboard
  });

  // Also show what the actual function would do
  if (text === '🆘 Help') {
    await bot.sendMessage(chatId, '🆘 *ПРАВИЛЬНАЯ функция Help:*\n\nПомощь и поддержка\n• Как использовать бота\n• Контакты поддержки\n• FAQ', {
      parse_mode: 'Markdown'
    });
  } else if (text === '💬 Ask Zabardoo') {
    await bot.sendMessage(chatId, '💬 *ПРАВИЛЬНАЯ функция Ask Zabardoo:*\n\nПомощник для вопросов\n• Вопросы о товарах\n• Помощь с выбором\n• Консультации', {
      parse_mode: 'Markdown'
    });
  } else if (text === '🎲 Random Deal') {
    await bot.sendMessage(chatId, '🎲 *ПРАВИЛЬНАЯ функция Random Deal:*\n\nСлучайное предложение дня\n• Рандомный товар со скидкой\n• Сюрприз для пользователя', {
      parse_mode: 'Markdown'
    });
  } else if (text === '📖 Guide') {
    await bot.sendMessage(chatId, '📖 *ПРАВИЛЬНАЯ функция Guide:*\n\nРуководство по использованию\n• Как делать покупки\n• Советы по экономии\n• Инструкции', {
      parse_mode: 'Markdown'
    });
  }
});

// Error handling
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

console.log('🔍 Debug Buttons Bot is running!');
console.log('📱 This bot will show exactly what text each button sends');
console.log('🎯 Use this to debug why buttons are not working correctly');
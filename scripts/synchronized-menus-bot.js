const TelegramBot = require('node-telegram-bot-api');

// Bot configuration
const token = process.env.TELEGRAM_BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE';
const bot = new TelegramBot(token, { polling: true });

// INLINE KEYBOARD - ВЕРХНИЕ КНОПКИ (на зеленом фоне)
const inlineMainMenu = {
  inline_keyboard: [
    [
      { text: '🔍 Find Deals', callback_data: 'find_deals' },
      { text: '🎮 My Profile', callback_data: 'my_profile' },
      { text: '📖 Guide', callback_data: 'guide' }
    ],
    [
      { text: '💰 Cashback', callback_data: 'cashback' },
      { text: '🎲 Random Deal', callback_data: 'random_deal' },
      { text: '💬 Ask Zabardoo', callback_data: 'ask_zabardoo' }
    ],
    [
      { text: '⚙️ Settings', callback_data: 'settings' },
      { text: '🌐 Language', callback_data: 'language' },
      { text: '🆘 Help', callback_data: 'help' }
    ]
  ]
};

// REPLY KEYBOARD - НИЖНИЕ КНОПКИ (под синей кнопкой Menu)
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
  const firstName = msg.from.first_name || 'Friend';
  
  const welcomeMessage = `🎉 Welcome to Zabardoo Enhanced Bot, ${firstName}! 🌟

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
  
  // УСТАНАВЛИВАЕМ REPLY KEYBOARD
  await bot.sendMessage(chatId, '💡 Both menus above and below have the SAME functions!', {
    reply_markup: replyKeyboard
  });
});

// ОБЩИЕ ФУНКЦИИ ДЛЯ ОБОИХ МЕНЮ
async function handleFindDeals(chatId, source = '') {
  const message = `🔍 *Find Deals* ${source}

💡 *How to search:*

1️⃣ **Type product name**
   Example: "iPhone", "Nike shoes", "laptop"

2️⃣ **Use voice search**
   Send a voice message with product name

3️⃣ **Send product photo**
   Take a picture of the product you want

🔥 **Popular searches:**
• Smartphones under ₹20,000
• Wireless earbuds
• Running shoes
• Skincare products
• Gaming laptops

💰 **What you'll get:**
• Real-time prices from multiple stores
• Discount percentages and savings
• Cashback rates for each store
• Direct purchase links

Just type what you're looking for! 🛍️`;

  await bot.sendMessage(chatId, message, {
    parse_mode: 'Markdown'
  });
}

async function handleMyProfile(chatId, source = '') {
  const message = `🎮 *My Profile* ${source}

👤 **User Stats:**
• Total Searches: 47
• Money Saved: ₹12,450
• Cashback Earned: ₹890
• Favorite Categories: Electronics, Fashion

📊 **Activity Summary:**
• This Month: 15 searches
• Best Deal Found: 45% OFF Nike shoes
• Top Store: Flipkart (12 purchases)
• Average Savings: 28% per purchase

🏆 **Achievements:**
• 🥉 Smart Shopper (10+ purchases)
• 💰 Deal Hunter (₹10k+ saved)
• 🎁 Cashback Master (₹500+ earned)
• 🔍 Search Expert (50+ searches)

Keep shopping to unlock more rewards! 🌟`;

  await bot.sendMessage(chatId, message, {
    parse_mode: 'Markdown'
  });
}

async function handleGuide(chatId, source = '') {
  const message = `📖 *Shopping Guide* ${source}

🛍️ *How to Shop Smart:*

1️⃣ *Search Products:*
   • Use "🔍 Find Deals" to search any product
   • Send voice messages for quick search
   • Upload product photos for recognition

2️⃣ *Compare Prices:*
   • See original vs discounted price
   • Check cashback rates for each store
   • Compare across multiple stores

3️⃣ *Use Features:*
   • 🎲 Random Deal - discover surprise offers
   • 💬 Ask Zabardoo - get shopping advice
   • 💰 Cashback - track your earnings

💡 *Pro Tips:*
• Voice search is faster than typing
• Photo search works great for specific items
• Check cashback rates before buying

Ready to start saving money? 🚀`;

  await bot.sendMessage(chatId, message, {
    parse_mode: 'Markdown'
  });
}

async function handleCashback(chatId, source = '') {
  const message = `💰 *Cashback Center* ${source}

💳 **Current Rates:**
• Flipkart: 2-8% cashback
• Amazon India: 1-6% cashback
• Myntra: 3-10% cashback
• Nykaa: 5-12% cashback
• AJIO: 4-9% cashback

📊 **Your Cashback:**
• This Month: ₹245
• Total Earned: ₹890
• Pending: ₹67
• Available for Withdrawal: ₹823

💡 **Maximize Cashback:**
• Use recommended payment methods
• Shop during special events
• Combine with coupon codes

Ready to earn more cashback? 💎`;

  await bot.sendMessage(chatId, message, {
    parse_mode: 'Markdown'
  });
}

async function handleRandomDeal(chatId, source = '') {
  const message = `🎲 *Random Deal of the Day!* ${source}

🎁 Special surprise offer!

• Samsung Galaxy Buds - 40% OFF (₹8,999)
• Limited time offer
• Free shipping included
• 1 year warranty

🔗 Grab this deal now!`;

  await bot.sendMessage(chatId, message, {
    parse_mode: 'Markdown'
  });
}

async function handleAskZabardoo(chatId, source = '') {
  const message = `💬 *Ask Zabardoo* ${source}

🤖 I'm here to help you with:

❓ **Product Questions:**
• "What's the best smartphone under ₹30,000?"
• "Show me wireless earbuds with good battery"
• "Find me running shoes for women"

💰 **Deal Questions:**
• "Any deals on laptops today?"
• "What's the highest cashback store?"
• "Show me electronics with 50% off"

🏪 **Store Questions:**
• "Which store has fastest delivery?"
• "Compare prices for iPhone 15"
• "Best store for fashion items?"

Just type your question and I'll help you find the perfect deal! 🛍️`;

  await bot.sendMessage(chatId, message, {
    parse_mode: 'Markdown'
  });
}

async function handleSettings(chatId, source = '') {
  const message = `⚙️ *Settings* ${source}

🌐 *Language:* English
🔔 *Notifications:* Enabled
💰 *Price Alerts:* Enabled
📍 *Location:* India

🛍️ *Shopping Preferences:*
• Show cashback rates: ✅
• Include out-of-stock items: ❌
• Sort by: Best Discount
• Max results per search: 10

🔐 *Privacy:*
• Save search history: ✅
• Personalized recommendations: ✅
• Share usage data: ❌

To change any setting, just tell me what you'd like to modify!`;

  await bot.sendMessage(chatId, message, {
    parse_mode: 'Markdown'
  });
}

async function handleLanguage(chatId, source = '') {
  const message = `🌐 *Language Settings* ${source}

🇮🇳 **Available Languages:**
• English (Current) ✅
• हिंदी (Hindi)
• বাংলা (Bengali)
• தமிழ் (Tamil)
• తెలుగు (Telugu)
• ಕನ್ನಡ (Kannada)
• മലയാളം (Malayalam)
• ગુજરાતી (Gujarati)
• मराठी (Marathi)

💡 **Language Features:**
• Product names in local language
• Currency in Indian Rupees (₹)
• Local store preferences
• Regional deal notifications

Current: English 🇬🇧

Which language would you like to switch to?`;

  await bot.sendMessage(chatId, message, {
    parse_mode: 'Markdown'
  });
}

async function handleHelp(chatId, source = '') {
  const message = `🆘 *Help & Support* ${source}

🔧 **Quick Help:**

❓ **How to use the bot:**
• Use menu buttons for different features
• Type product names to search
• Send voice messages for quick search
• Upload product photos for recognition

🛍️ **Shopping Help:**
• 🔍 Find Deals - search any product
• 🎲 Random Deal - discover surprise offers
• 💬 Ask Zabardoo - get shopping advice
• 💰 Cashback - track your earnings

📞 **Contact Support:**
• Report bugs or issues
• Suggest new features
• Get shopping advice
• Technical assistance

💡 **Tips:**
• Both upper and lower menus work the same
• All menu buttons have specific functions
• Voice search is faster than typing

Need more help? Just ask! 😊`;

  await bot.sendMessage(chatId, message, {
    parse_mode: 'Markdown'
  });
}

// Handle callback queries (ВЕРХНИЕ КНОПКИ - inline)
bot.on('callback_query', async (callbackQuery) => {
  const message = callbackQuery.message;
  const chatId = message.chat.id;
  const data = callbackQuery.data;

  await bot.answerCallbackQuery(callbackQuery.id);

  console.log(`Inline button pressed: ${data}`);

  try {
    switch (data) {
      case 'find_deals':
        await handleFindDeals(chatId, '(from UPPER menu)');
        break;
      
      case 'my_profile':
        await handleMyProfile(chatId, '(from UPPER menu)');
        break;
      
      case 'guide':
        await handleGuide(chatId, '(from UPPER menu)');
        break;
      
      case 'cashback':
        await handleCashback(chatId, '(from UPPER menu)');
        break;
      
      case 'random_deal':
        await handleRandomDeal(chatId, '(from UPPER menu)');
        break;
      
      case 'ask_zabardoo':
        await handleAskZabardoo(chatId, '(from UPPER menu)');
        break;
      
      case 'settings':
        await handleSettings(chatId, '(from UPPER menu)');
        break;
      
      case 'language':
        await handleLanguage(chatId, '(from UPPER menu)');
        break;
      
      case 'help':
        await handleHelp(chatId, '(from UPPER menu)');
        break;
      
      default:
        await bot.sendMessage(chatId, `❓ Unknown inline button: ${data}`);
    }
  } catch (error) {
    console.error('Error handling callback query:', error);
    await bot.sendMessage(chatId, '❌ Sorry, something went wrong with inline button.');
  }
});

// Handle text messages (НИЖНИЕ КНОПКИ - reply keyboard)
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text || text.startsWith('/')) return;

  console.log(`Reply button pressed: "${text}"`);

  try {
    // ИСПОЛЬЗУЕМ ТЕ ЖЕ ФУНКЦИИ ЧТО И INLINE КНОПКИ
    switch (text) {
      case '🔍 Find Deals':
        await handleFindDeals(chatId, '(from LOWER menu)');
        break;
      
      case '🎮 My Profile':
        await handleMyProfile(chatId, '(from LOWER menu)');
        break;
      
      case '📖 Guide':
        await handleGuide(chatId, '(from LOWER menu)');
        break;
      
      case '💰 Cashback':
        await handleCashback(chatId, '(from LOWER menu)');
        break;
      
      case '🎲 Random Deal':
        await handleRandomDeal(chatId, '(from LOWER menu)');
        break;
      
      case '💬 Ask Zabardoo':
        await handleAskZabardoo(chatId, '(from LOWER menu)');
        break;
      
      case '⚙️ Settings':
        await handleSettings(chatId, '(from LOWER menu)');
        break;
      
      case '🌐 Language':
        await handleLanguage(chatId, '(from LOWER menu)');
        break;
      
      case '🆘 Help':
        await handleHelp(chatId, '(from LOWER menu)');
        break;
      
      default:
        // Handle product search
        console.log(`No case matched for: "${text}", treating as product search`);
        await bot.sendMessage(chatId, `🔍 Searching for "${text}"...\n\nThis would normally search for products matching your query!`);
        break;
    }
  } catch (error) {
    console.error('Error handling message:', error);
    await bot.sendMessage(chatId, '❌ Sorry, something went wrong with reply button.');
  }
});

// Error handling
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

console.log('🚀 Synchronized Menus Bot is running!');
console.log('📱 UPPER menu (inline buttons) and LOWER menu (reply keyboard) use SAME functions');
console.log('🎯 Test both menus - they should show identical information');
console.log('✅ Each button works the same way regardless of which menu you use!');
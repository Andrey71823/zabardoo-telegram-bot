#!/usr/bin/env node

const TelegramBot = require('node-telegram-bot-api');
const colors = require('colors');

// Telegram bot token
const token = '7315076864:AAGZ5N4dwhUrSw2tygw4wiCPY74cROKWzsE';

class SingleMessagebazaarGuruBot {
  constructor() {
    this.bot = new TelegramBot(token, { polling: true });
    this.userSessions = new Map(); // Store message IDs for each user
    
    this.demoCoupons = [
      {
        id: 'coupon-1',
        title: 'Flipkart Big Sale',
        category: 'Electronics',
        store: 'Flipkart',
        discount: '80% OFF',
        code: 'BIGBILLION80',
        emoji: '📱'
      },
      {
        id: 'coupon-2',
        title: 'Nykaa Beauty',
        category: 'Beauty',
        store: 'Nykaa',
        discount: 'Buy 2 Get 1',
        code: 'BEAUTY2GET1',
        emoji: '💄'
      },
      {
        id: 'coupon-3',
        title: 'Myntra Fashion',
        category: 'Fashion',
        store: 'Myntra',
        discount: '70% OFF',
        code: 'EORS70',
        emoji: '👗'
      },
      {
        id: 'coupon-4',
        title: 'Swiggy Food',
        category: 'Food',
        store: 'Swiggy',
        discount: '60% OFF',
        code: 'FOOD60',
        emoji: '🍔'
      }
    ];

    this.setupBotHandlers();
    this.setupPersistentMenu();
  }

  setupBotHandlers() {
    this.bot.onText(/\/start/, (msg) => {
      this.handleStart(msg);
    });

    this.bot.onText(/\/menu/, (msg) => {
      this.updateMainInterface(msg.chat.id, msg.from.id);
    });

    this.bot.on('callback_query', (callbackQuery) => {
      this.handleCallbackQuery(callbackQuery);
    });

    console.log('🤖 Single Message bazaarGuru Bot is running...'.green.bold);
  }

  setupPersistentMenu() {
    const commands = [
      { command: 'start', description: '🏠 Start/Reset Interface' },
      { command: 'menu', description: '🔄 Refresh Menu' }
    ];

    this.bot.setMyCommands(commands);
  }

  async handleStart(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userName = msg.from.first_name || 'User';

    // Send initial interface
    const interfaceMessage = this.buildMainInterface(userName);
    const keyboard = this.buildMainKeyboard();

    try {
      const sentMessage = await this.bot.sendMessage(chatId, interfaceMessage, {
        reply_markup: keyboard,
        parse_mode: 'Markdown'
      });

      // Store message ID for future updates
      this.userSessions.set(userId, {
        chatId: chatId,
        messageId: sentMessage.message_id,
        currentView: 'main',
        userName: userName
      });

      console.log(`Started interface for ${userName}`.cyan);
    } catch (error) {
      console.error('Error sending initial message:', error);
    }
  }

  buildMainInterface(userName) {
    return `🎉 **Welcome ${userName}!**

🤖 **bazaarGuru AI Coupon Assistant**
Your personal deal finder for India

📊 **Quick Stats:**
• 15+ Popular stores
• 1000+ Active deals  
• AI-powered recommendations
• Real-time updates

🔥 **Today's Hot Deals:**
1. 📱 **Flipkart Big Sale** - 80% OFF | \`BIGBILLION80\`
2. 💄 **Nykaa Beauty** - Buy 2 Get 1 | \`BEAUTY2GET1\`
3. 👗 **Myntra Fashion** - 70% OFF | \`EORS70\`

💡 **Choose an option below:**`;
  }

  buildMainKeyboard() {
    return {
      inline_keyboard: [
        [
          { text: '🎯 AI Recommendations', callback_data: 'view_recommendations' }
        ],
        [
          { text: '📱 Electronics', callback_data: 'cat_electronics' },
          { text: '👗 Fashion', callback_data: 'cat_fashion' }
        ],
        [
          { text: '💄 Beauty', callback_data: 'cat_beauty' },
          { text: '🍔 Food', callback_data: 'cat_food' }
        ],
        [
          { text: '🏪 Browse Stores', callback_data: 'view_stores' },
          { text: '🔥 Hot Deals', callback_data: 'view_hot_deals' }
        ]
      ]
    };
  }

  buildRecommendationsInterface(userName) {
    return `🎯 **AI Recommendations for ${userName}**

🧠 **Personalized just for you:**

1. 📱 **Flipkart Big Sale - Electronics**
   💰 80% OFF | 🏪 Flipkart | 🎫 \`BIGBILLION80\`
   ✨ *Perfect match for your tech interests*

2. 💄 **Nykaa Beauty Bonanza**
   💰 Buy 2 Get 1 Free | 🏪 Nykaa | 🎫 \`BEAUTY2GET1\`
   ✨ *Based on your beauty preferences*

3. 👗 **Myntra Fashion Week**
   💰 70% OFF | 🏪 Myntra | 🎫 \`EORS70\`
   ✨ *Trending in your style category*

🎯 **Why these deals?**
• Match your browsing history
• High user ratings
• Limited time offers
• Popular in your area`;
  }

  buildRecommendationsKeyboard() {
    return {
      inline_keyboard: [
        [
          { text: '👍 Great picks!', callback_data: 'feedback_good' },
          { text: '👎 Not relevant', callback_data: 'feedback_bad' }
        ],
        [
          { text: '🔄 More recommendations', callback_data: 'view_recommendations' }
        ],
        [
          { text: '🔙 Back to Menu', callback_data: 'back_to_main' }
        ]
      ]
    };
  }

  buildCategoryInterface(category) {
    const categoryDeals = this.demoCoupons.filter(coupon => 
      coupon.category.toLowerCase() === category.toLowerCase()
    );

    const categoryEmoji = {
      'electronics': '📱',
      'fashion': '👗', 
      'beauty': '💄',
      'food': '🍔'
    };

    let dealsText = '';
    if (categoryDeals.length > 0) {
      dealsText = categoryDeals.map((coupon, index) => {
        return `${index + 1}. ${coupon.emoji} **${coupon.title}**
   💰 ${coupon.discount} | 🏪 ${coupon.store} | 🎫 \`${coupon.code}\``;
      }).join('\n\n');
    } else {
      dealsText = '😔 No deals available right now. Check back soon!';
    }

    return `${categoryEmoji[category.toLowerCase()]} **${category} Deals**

${dealsText}

💡 **Tip:** Use AI Recommendations for personalized picks!`;
  }

  buildCategoryKeyboard(category) {
    return {
      inline_keyboard: [
        [
          { text: '🔄 Refresh Deals', callback_data: `cat_${category.toLowerCase()}` }
        ],
        [
          { text: '🎯 Get AI Recommendations', callback_data: 'view_recommendations' }
        ],
        [
          { text: '📂 Other Categories', callback_data: 'view_categories' },
          { text: '🔙 Main Menu', callback_data: 'back_to_main' }
        ]
      ]
    };
  }

  buildStoresInterface() {
    return `🏪 **Popular Indian Stores**

🛒 **E-commerce:**
• Flipkart - Electronics, Fashion, Home
• Amazon India - Everything store
• Snapdeal - Budget-friendly deals

👗 **Fashion & Lifestyle:**
• Myntra - Fashion & beauty
• Ajio - Trendy clothing
• Koovs - International brands

💄 **Beauty & Wellness:**
• Nykaa - Beauty & cosmetics
• Purplle - Affordable beauty
• Sephora - Premium brands

🍔 **Food & Delivery:**
• Swiggy - Food delivery
• Zomato - Restaurants & dining
• BigBasket - Groceries

✈️ **Travel & Booking:**
• MakeMyTrip - Flights & hotels
• Goibibo - Travel deals
• BookMyShow - Entertainment

**Select a store to see deals:**`;
  }

  buildStoresKeyboard() {
    return {
      inline_keyboard: [
        [
          { text: '🛒 Flipkart', callback_data: 'store_flipkart' },
          { text: '📦 Amazon', callback_data: 'store_amazon' }
        ],
        [
          { text: '👗 Myntra', callback_data: 'store_myntra' },
          { text: '💄 Nykaa', callback_data: 'store_nykaa' }
        ],
        [
          { text: '🍔 Swiggy', callback_data: 'store_swiggy' },
          { text: '✈️ MakeMyTrip', callback_data: 'store_makemytrip' }
        ],
        [
          { text: '🔙 Back to Menu', callback_data: 'back_to_main' }
        ]
      ]
    };
  }

  async updateMainInterface(chatId, userId) {
    const session = this.userSessions.get(userId);
    if (!session) {
      // If no session, create new interface
      await this.handleStart({ chat: { id: chatId }, from: { id: userId, first_name: 'User' } });
      return;
    }

    const interfaceMessage = this.buildMainInterface(session.userName);
    const keyboard = this.buildMainKeyboard();

    try {
      await this.bot.editMessageText(interfaceMessage, {
        chat_id: chatId,
        message_id: session.messageId,
        reply_markup: keyboard,
        parse_mode: 'Markdown'
      });

      session.currentView = 'main';
    } catch (error) {
      console.error('Error updating interface:', error);
    }
  }

  async updateInterface(userId, messageText, keyboard) {
    const session = this.userSessions.get(userId);
    if (!session) return;

    try {
      await this.bot.editMessageText(messageText, {
        chat_id: session.chatId,
        message_id: session.messageId,
        reply_markup: keyboard,
        parse_mode: 'Markdown'
      });
    } catch (error) {
      console.error('Error updating interface:', error);
    }
  }

  async handleCallbackQuery(callbackQuery) {
    const userId = callbackQuery.from.id;
    const data = callbackQuery.data;
    const session = this.userSessions.get(userId);

    await this.bot.answerCallbackQuery(callbackQuery.id);

    if (!session) return;

    switch (data) {
      case 'back_to_main':
        const mainInterface = this.buildMainInterface(session.userName);
        const mainKeyboard = this.buildMainKeyboard();
        await this.updateInterface(userId, mainInterface, mainKeyboard);
        session.currentView = 'main';
        break;

      case 'view_recommendations':
        const recInterface = this.buildRecommendationsInterface(session.userName);
        const recKeyboard = this.buildRecommendationsKeyboard();
        await this.updateInterface(userId, recInterface, recKeyboard);
        session.currentView = 'recommendations';
        break;

      case 'view_stores':
        const storesInterface = this.buildStoresInterface();
        const storesKeyboard = this.buildStoresKeyboard();
        await this.updateInterface(userId, storesInterface, storesKeyboard);
        session.currentView = 'stores';
        break;

      case 'feedback_good':
        await this.bot.answerCallbackQuery(callbackQuery.id, {
          text: '🎉 Thanks! Your feedback helps improve our AI.',
          show_alert: false
        });
        break;

      case 'feedback_bad':
        await this.bot.answerCallbackQuery(callbackQuery.id, {
          text: '📝 Thanks! We\'ll improve our recommendations.',
          show_alert: false
        });
        break;

      default:
        if (data.startsWith('cat_')) {
          const category = data.replace('cat_', '');
          const catInterface = this.buildCategoryInterface(category);
          const catKeyboard = this.buildCategoryKeyboard(category);
          await this.updateInterface(userId, catInterface, catKeyboard);
          session.currentView = `category_${category}`;
        } else if (data.startsWith('store_')) {
          const store = data.replace('store_', '');
          const storeName = this.getStoreName(store);
          const storeInterface = this.buildStoreInterface(storeName);
          const storeKeyboard = this.buildStoreKeyboard(storeName);
          await this.updateInterface(userId, storeInterface, storeKeyboard);
          session.currentView = `store_${store}`;
        }
        break;
    }
  }

  buildStoreInterface(storeName) {
    const storeDeals = this.demoCoupons.filter(coupon => 
      coupon.store.toLowerCase().includes(storeName.toLowerCase())
    );

    let dealsText = '';
    if (storeDeals.length > 0) {
      dealsText = storeDeals.map((coupon, index) => {
        return `${index + 1}. ${coupon.emoji} **${coupon.title}**
   💰 ${coupon.discount} | 🎫 \`${coupon.code}\``;
      }).join('\n\n');
    } else {
      dealsText = '😔 No deals available right now from this store.';
    }

    return `🏪 **${storeName} Deals**

${dealsText}

💡 **About ${storeName}:**
• One of India's top e-commerce platforms
• Trusted by millions of users
• Regular sales and offers
• Fast delivery across India`;
  }

  buildStoreKeyboard(storeName) {
    return {
      inline_keyboard: [
        [
          { text: '🔄 Refresh Deals', callback_data: `store_${storeName.toLowerCase()}` }
        ],
        [
          { text: '🎯 Get AI Recommendations', callback_data: 'view_recommendations' }
        ],
        [
          { text: '🏪 Other Stores', callback_data: 'view_stores' },
          { text: '🔙 Main Menu', callback_data: 'back_to_main' }
        ]
      ]
    };
  }

  getStoreName(storeKey) {
    const storeMap = {
      'flipkart': 'Flipkart',
      'amazon': 'Amazon',
      'myntra': 'Myntra',
      'nykaa': 'Nykaa',
      'swiggy': 'Swiggy',
      'makemytrip': 'MakeMyTrip'
    };
    return storeMap[storeKey] || storeKey;
  }

  start() {
    console.log('🚀 Starting Single Message bazaarGuru Bot...'.green.bold);
    console.log('✅ Bot ready with single-message interface!'.green);
    
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down bot...'.yellow);
      this.bot.stopPolling();
      process.exit(0);
    });
  }
}

// Start the bot
if (require.main === module) {
  const bot = new SingleMessagebazaarGuruBot();
  bot.start();
}

module.exports = SingleMessagebazaarGuruBot;
#!/usr/bin/env node

const TelegramBot = require('node-telegram-bot-api');
const colors = require('colors');

// Telegram bot token
const token = '7315076864:AAGZ5N4dwhUrSw2tygw4wiCPY74cROKWzsE';

class CompactUIZabardooBot {
  constructor() {
    this.bot = new TelegramBot(token, { polling: true });
    this.users = new Map();
    
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
      this.showCompactMenu(msg.chat.id);
    });

    this.bot.onText(/\/deals/, (msg) => {
      this.showCompactDeals(msg.chat.id);
    });

    this.bot.onText(/\/categories/, (msg) => {
      this.showCompactCategories(msg.chat.id);
    });

    this.bot.onText(/\/stores/, (msg) => {
      this.showCompactStores(msg.chat.id);
    });

    this.bot.onText(/\/recommend/, (msg) => {
      this.showCompactRecommendations(msg.chat.id);
    });

    this.bot.on('callback_query', (callbackQuery) => {
      this.handleCallbackQuery(callbackQuery);
    });

    console.log('🤖 Compact UI Zabardoo Bot is running...'.green.bold);
  }

  setupPersistentMenu() {
    const commands = [
      { command: 'menu', description: '🏠 Main Menu' },
      { command: 'deals', description: '🔥 Hot Deals' },
      { command: 'recommend', description: '🎯 AI Picks' },
      { command: 'categories', description: '📂 Categories' },
      { command: 'stores', description: '🏪 Stores' }
    ];

    this.bot.setMyCommands(commands);
  }

  async handleStart(msg) {
    const chatId = msg.chat.id;
    const userName = msg.from.first_name || 'User';

    const welcomeMessage = `🎉 Welcome ${userName}! I'm your AI coupon assistant.

💡 **Quick tip:** Use the menu below ⬇️ for easy navigation!`;

    await this.bot.sendMessage(chatId, welcomeMessage);
    await this.showCompactMenu(chatId);
  }

  async showCompactMenu(chatId) {
    const menuMessage = `🏠 **Zabardoo Menu**

Choose an option:`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🔥 Hot Deals', callback_data: 'hot_deals' },
          { text: '🎯 AI Picks', callback_data: 'ai_picks' }
        ],
        [
          { text: '📂 Categories', callback_data: 'categories' },
          { text: '🏪 Stores', callback_data: 'stores' }
        ]
      ]
    };

    await this.bot.sendMessage(chatId, menuMessage, {
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
  }

  async showCompactDeals(chatId) {
    const dealsMessage = `🔥 **Hot Deals** - Top 3 offers right now:

${this.formatCompactDealsList(this.demoCoupons.slice(0, 3))}

💡 Tip: Use /menu for more options`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '📱 Electronics', callback_data: 'cat_electronics' },
          { text: '👗 Fashion', callback_data: 'cat_fashion' },
          { text: '💄 Beauty', callback_data: 'cat_beauty' }
        ],
        [
          { text: '🎯 Get AI Recommendations', callback_data: 'ai_picks' }
        ]
      ]
    };

    await this.bot.sendMessage(chatId, dealsMessage, {
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
  }

  async showCompactCategories(chatId) {
    const categoriesMessage = `📂 **Categories** - Quick browse:

📱 **Electronics** - Phones, laptops, gadgets
👗 **Fashion** - Clothing, shoes, accessories  
💄 **Beauty** - Cosmetics, skincare, wellness
🍔 **Food** - Restaurants, groceries, delivery
🏠 **Home** - Furniture, appliances, decor
✈️ **Travel** - Flights, hotels, packages

Select a category:`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '📱 Electronics', callback_data: 'cat_electronics' },
          { text: '👗 Fashion', callback_data: 'cat_fashion' }
        ],
        [
          { text: '💄 Beauty', callback_data: 'cat_beauty' },
          { text: '🍔 Food', callback_data: 'cat_food' }
        ],
        [
          { text: '🏠 Home', callback_data: 'cat_home' },
          { text: '✈️ Travel', callback_data: 'cat_travel' }
        ]
      ]
    };

    await this.bot.sendMessage(chatId, categoriesMessage, {
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
  }

  async showCompactStores(chatId) {
    const storesMessage = `🏪 **Popular Stores** - 15+ Indian brands:

🛒 **E-commerce:** Flipkart, Amazon India, Snapdeal
👗 **Fashion:** Myntra, Ajio, Koovs  
💄 **Beauty:** Nykaa, Purplle, Sephora
🍔 **Food:** Swiggy, Zomato, Dominos
✈️ **Travel:** MakeMyTrip, Goibibo

Select a store:`;

    const keyboard = {
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
        ]
      ]
    };

    await this.bot.sendMessage(chatId, storesMessage, {
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
  }

  async showCompactRecommendations(chatId) {
    const recommendationsMessage = `🎯 **AI Recommendations** - Personalized for you:

${this.formatCompactDealsList(this.demoCoupons)}

🧠 **Why these deals?**
• Match your browsing history
• Popular in your area  
• High-value discounts
• Limited time offers

💡 Use /menu for more options`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '👍 Great picks!', callback_data: 'feedback_good' },
          { text: '👎 Not relevant', callback_data: 'feedback_bad' }
        ],
        [
          { text: '🔄 More recommendations', callback_data: 'ai_picks' }
        ]
      ]
    };

    await this.bot.sendMessage(chatId, recommendationsMessage, {
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
  }

  formatCompactDealsList(coupons) {
    return coupons.map((coupon, index) => {
      return `${index + 1}. ${coupon.emoji} **${coupon.title}**
   💰 ${coupon.discount} | 🏪 ${coupon.store} | 🎫 \`${coupon.code}\``;
    }).join('\n\n');
  }

  async showCategoryDeals(chatId, category) {
    const categoryDeals = this.demoCoupons.filter(coupon => 
      coupon.category.toLowerCase() === category.toLowerCase()
    );

    if (categoryDeals.length > 0) {
      const categoryMessage = `${categoryDeals[0].emoji} **${category} Deals**

${this.formatCompactDealsList(categoryDeals)}

💡 Use /menu for more options`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '🔄 Refresh', callback_data: `cat_${category.toLowerCase()}` },
            { text: '🎯 AI Picks', callback_data: 'ai_picks' }
          ],
          [
            { text: '📂 Other Categories', callback_data: 'categories' }
          ]
        ]
      };

      await this.bot.sendMessage(chatId, categoryMessage, {
        reply_markup: keyboard,
        parse_mode: 'Markdown'
      });
    } else {
      await this.bot.sendMessage(chatId, `😔 No ${category} deals right now. Try other categories!`);
      await this.showCompactCategories(chatId);
    }
  }

  async showStoreDeals(chatId, store) {
    const storeDeals = this.demoCoupons.filter(coupon => 
      coupon.store.toLowerCase().includes(store.toLowerCase())
    );

    if (storeDeals.length > 0) {
      const storeMessage = `🏪 **${store} Deals**

${this.formatCompactDealsList(storeDeals)}

💡 Use /menu for more options`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '🔄 Refresh', callback_data: `store_${store.toLowerCase()}` },
            { text: '🎯 AI Picks', callback_data: 'ai_picks' }
          ],
          [
            { text: '🏪 Other Stores', callback_data: 'stores' }
          ]
        ]
      };

      await this.bot.sendMessage(chatId, storeMessage, {
        reply_markup: keyboard,
        parse_mode: 'Markdown'
      });
    } else {
      await this.bot.sendMessage(chatId, `😔 No ${store} deals right now. Try other stores!`);
      await this.showCompactStores(chatId);
    }
  }

  async handleCallbackQuery(callbackQuery) {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    await this.bot.answerCallbackQuery(callbackQuery.id);

    switch (data) {
      case 'hot_deals':
        await this.showCompactDeals(chatId);
        break;

      case 'ai_picks':
        await this.showCompactRecommendations(chatId);
        break;

      case 'categories':
        await this.showCompactCategories(chatId);
        break;

      case 'stores':
        await this.showCompactStores(chatId);
        break;

      case 'feedback_good':
        await this.bot.sendMessage(chatId, '🎉 Great! Your feedback helps improve our AI. Use /menu for more options.');
        break;

      case 'feedback_bad':
        await this.bot.sendMessage(chatId, '📝 Thanks! We\'ll improve our recommendations. Use /menu for more options.');
        break;

      default:
        if (data.startsWith('cat_')) {
          const category = data.replace('cat_', '');
          await this.showCategoryDeals(chatId, category);
        } else if (data.startsWith('store_')) {
          const store = data.replace('store_', '');
          await this.showStoreDeals(chatId, this.getStoreName(store));
        }
        break;
    }
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
    console.log('🚀 Starting Compact UI Zabardoo Bot...'.green.bold);
    console.log('✅ Bot ready with compact design!'.green);
    
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down bot...'.yellow);
      this.bot.stopPolling();
      process.exit(0);
    });
  }
}

// Start the bot
if (require.main === module) {
  const bot = new CompactUIZabardooBot();
  bot.start();
}

module.exports = CompactUIZabardooBot;
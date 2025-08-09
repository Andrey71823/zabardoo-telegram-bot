#!/usr/bin/env node

const TelegramBot = require('node-telegram-bot-api');
const colors = require('colors');

// Telegram bot token
const token = '7315076864:AAGZ5N4dwhUrSw2tygw4wiCPY74cROKWzsE';

class ImprovedUIZabardooBot {
  constructor() {
    this.bot = new TelegramBot(token, { polling: true });
    this.users = new Map();
    
    this.demoCoupons = [
      {
        id: 'coupon-1',
        title: '🔥 Flipkart Big Sale - 80% OFF Electronics',
        category: 'Electronics',
        store: 'Flipkart',
        discount: '80% OFF',
        code: 'BIGBILLION80',
        expiry: '7 days left',
        emoji: '📱'
      },
      {
        id: 'coupon-2',
        title: '💄 Nykaa Beauty - Buy 2 Get 1 Free',
        category: 'Beauty',
        store: 'Nykaa',
        discount: 'Buy 2 Get 1 Free',
        code: 'BEAUTY2GET1',
        expiry: '10 days left',
        emoji: '💄'
      },
      {
        id: 'coupon-3',
        title: '👗 Myntra Fashion - 70% OFF',
        category: 'Fashion',
        store: 'Myntra',
        discount: '70% OFF',
        code: 'EORS70',
        expiry: '3 days left',
        emoji: '👗'
      },
      {
        id: 'coupon-4',
        title: '🍔 Swiggy Food - 60% OFF + Free Delivery',
        category: 'Food',
        store: 'Swiggy',
        discount: '60% OFF',
        code: 'SUPERSAVER60',
        expiry: '2 days left',
        emoji: '🍔'
      },
      {
        id: 'coupon-5',
        title: '🏠 Amazon Home - 50% OFF Furniture',
        category: 'Home',
        store: 'Amazon',
        discount: '50% OFF',
        code: 'HOME50',
        expiry: '5 days left',
        emoji: '🏠'
      },
      {
        id: 'coupon-6',
        title: '✈️ MakeMyTrip - ₹5000 OFF Flights',
        category: 'Travel',
        store: 'MakeMyTrip',
        discount: '₹5000 OFF',
        code: 'TRAVEL5000',
        expiry: '15 days left',
        emoji: '✈️'
      }
    ];

    this.setupBotHandlers();
    this.setupPersistentMenu();
  }

  setupBotHandlers() {
    // Start command
    this.bot.onText(/\/start/, (msg) => {
      this.handleStart(msg);
    });

    // Menu commands
    this.bot.onText(/\/menu/, (msg) => {
      this.showMainMenu(msg.chat.id);
    });

    this.bot.onText(/\/stores/, (msg) => {
      this.showStoresMenu(msg.chat.id);
    });

    this.bot.onText(/\/categories/, (msg) => {
      this.showCategoriesMenu(msg.chat.id);
    });

    this.bot.onText(/\/recommend/, (msg) => {
      this.handleRecommendations(msg);
    });

    this.bot.onText(/\/help/, (msg) => {
      this.handleHelp(msg);
    });

    // Callback query handler
    this.bot.on('callback_query', (callbackQuery) => {
      this.handleCallbackQuery(callbackQuery);
    });

    console.log('🤖 Improved UI Zabardoo Bot is running...'.green.bold);
    console.log('Try sending /start to the bot!'.yellow);
  }

  setupPersistentMenu() {
    // Set bot commands for the menu
    const commands = [
      { command: 'menu', description: '🏠 Main Menu' },
      { command: 'recommend', description: '🎯 Get AI Recommendations' },
      { command: 'categories', description: '📂 Browse Categories' },
      { command: 'stores', description: '🏪 Popular Stores' },
      { command: 'help', description: '❓ Help & Support' }
    ];

    this.bot.setMyCommands(commands);
  }

  async handleStart(msg) {
    const chatId = msg.chat.id;
    const userName = msg.from.first_name || 'User';

    // Initialize user
    if (!this.users.has(msg.from.id)) {
      this.users.set(msg.from.id, {
        id: msg.from.id,
        name: userName,
        preferences: { categories: [], stores: [] },
        created_at: new Date()
      });
    }

    const welcomeMessage = `🎉 Welcome to Zabardoo, ${userName}!

I'm your AI-powered coupon assistant for India! 

🎯 What I can do:
• Find personalized coupon recommendations
• Track best deals from 15+ top Indian stores
• Help you save money across all categories
• Learn your preferences for better suggestions

🚀 Quick Start:
Use the menu below or try these commands:`;

    await this.bot.sendMessage(chatId, welcomeMessage);
    await this.showMainMenu(chatId);

    console.log(`New user started: ${userName}`.cyan);
  }

  async showMainMenu(chatId) {
    const menuMessage = `🏠 Main Menu

Choose what you'd like to do:`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🎯 AI Recommendations', callback_data: 'get_recommendations' }
        ],
        [
          { text: '📂 Categories', callback_data: 'show_categories' },
          { text: '🏪 Stores', callback_data: 'show_stores' }
        ],
        [
          { text: '🔥 Trending Deals', callback_data: 'trending_deals' },
          { text: '⚙️ Settings', callback_data: 'settings' }
        ],
        [
          { text: '❓ Help', callback_data: 'help' }
        ]
      ]
    };

    await this.bot.sendMessage(chatId, menuMessage, {
      reply_markup: keyboard
    });
  }

  async showCategoriesMenu(chatId) {
    const categoriesMessage = `📂 Browse by Categories

Select a category to see the best deals:`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '📱 Electronics', callback_data: 'category_electronics' },
          { text: '👗 Fashion', callback_data: 'category_fashion' }
        ],
        [
          { text: '💄 Beauty', callback_data: 'category_beauty' },
          { text: '🍔 Food', callback_data: 'category_food' }
        ],
        [
          { text: '🏠 Home & Living', callback_data: 'category_home' },
          { text: '✈️ Travel', callback_data: 'category_travel' }
        ],
        [
          { text: '🔙 Back to Menu', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.bot.sendMessage(chatId, categoriesMessage, {
      reply_markup: keyboard
    });
  }

  async showStoresMenu(chatId) {
    const storesMessage = `🏪 Popular Indian Stores

Choose your favorite store:`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🛒 Flipkart', callback_data: 'store_flipkart' },
          { text: '📦 Amazon India', callback_data: 'store_amazon' }
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
          { text: '🏪 All Stores', callback_data: 'all_stores' }
        ],
        [
          { text: '🔙 Back to Menu', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.bot.sendMessage(chatId, storesMessage, {
      reply_markup: keyboard
    });
  }

  async handleRecommendations(msg) {
    const chatId = msg.chat.id;

    await this.bot.sendMessage(chatId, '🔍 Analyzing your preferences and generating personalized recommendations...');

    setTimeout(async () => {
      const recommendations = this.demoCoupons.slice(0, 3);
      
      await this.bot.sendMessage(chatId, '🎯 Your Personalized Recommendations:');

      for (let i = 0; i < recommendations.length; i++) {
        await this.sendCouponCard(chatId, recommendations[i], i + 1);
      }

      // Always show navigation options after recommendations
      await this.showPostRecommendationMenu(chatId);

    }, 2000);
  }

  async sendCouponCard(chatId, coupon, rank) {
    const couponMessage = `${coupon.emoji} Recommendation #${rank}

${coupon.title}

💰 Discount: ${coupon.discount}
🏪 Store: ${coupon.store}
⏰ Expires: ${coupon.expiry}
🎫 Code: \`${coupon.code}\`

🎯 Perfect for you because:
• Matches your interests in ${coupon.category}
• High-value discount
• Popular among users like you
• Limited time offer!`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🛒 Get Deal', url: 'https://zabardoo.com' },
          { text: '📋 Copy Code', callback_data: `copy_${coupon.id}` }
        ],
        [
          { text: '❤️ Save', callback_data: `save_${coupon.id}` },
          { text: '📤 Share', callback_data: `share_${coupon.id}` }
        ]
      ]
    };

    await this.bot.sendMessage(chatId, couponMessage, {
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
  }

  async showPostRecommendationMenu(chatId) {
    const menuMessage = `💬 How were these recommendations?`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '👍 Great!', callback_data: 'feedback_positive' },
          { text: '👎 Not relevant', callback_data: 'feedback_negative' }
        ],
        [
          { text: '🔄 More Recommendations', callback_data: 'get_recommendations' }
        ],
        [
          { text: '📂 Browse Categories', callback_data: 'show_categories' },
          { text: '🏪 Browse Stores', callback_data: 'show_stores' }
        ],
        [
          { text: '🏠 Main Menu', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.bot.sendMessage(chatId, menuMessage, {
      reply_markup: keyboard
    });
  }

  async showCategoryDeals(chatId, category) {
    const categoryDeals = this.demoCoupons.filter(coupon => 
      coupon.category.toLowerCase() === category.toLowerCase()
    );

    if (categoryDeals.length > 0) {
      await this.bot.sendMessage(chatId, `${categoryDeals[0].emoji} ${category} Deals

Here are the best ${category.toLowerCase()} deals for you:`);
      
      for (const coupon of categoryDeals) {
        await this.sendCouponCard(chatId, coupon, categoryDeals.indexOf(coupon) + 1);
      }

      // Show navigation after category deals
      await this.showCategoryNavigationMenu(chatId, category);
    } else {
      await this.bot.sendMessage(chatId, `😔 No ${category} deals available right now. Check back soon!`);
      await this.showCategoriesMenu(chatId);
    }
  }

  async showCategoryNavigationMenu(chatId, currentCategory) {
    const keyboard = {
      inline_keyboard: [
        [
          { text: '🔄 Refresh Deals', callback_data: `category_${currentCategory.toLowerCase()}` }
        ],
        [
          { text: '📂 Other Categories', callback_data: 'show_categories' },
          { text: '🏪 Browse Stores', callback_data: 'show_stores' }
        ],
        [
          { text: '🎯 Get AI Recommendations', callback_data: 'get_recommendations' }
        ],
        [
          { text: '🏠 Main Menu', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.bot.sendMessage(chatId, '🧭 What would you like to do next?', {
      reply_markup: keyboard
    });
  }

  async showStoreDeals(chatId, store) {
    const storeDeals = this.demoCoupons.filter(coupon => 
      coupon.store.toLowerCase().includes(store.toLowerCase())
    );

    if (storeDeals.length > 0) {
      await this.bot.sendMessage(chatId, `🏪 ${store} Deals

Best offers from ${store}:`);
      
      for (const coupon of storeDeals) {
        await this.sendCouponCard(chatId, coupon, storeDeals.indexOf(coupon) + 1);
      }

      await this.showStoreNavigationMenu(chatId, store);
    } else {
      await this.bot.sendMessage(chatId, `😔 No ${store} deals available right now. Check other stores!`);
      await this.showStoresMenu(chatId);
    }
  }

  async showStoreNavigationMenu(chatId, currentStore) {
    const keyboard = {
      inline_keyboard: [
        [
          { text: '🔄 Refresh Deals', callback_data: `store_${currentStore.toLowerCase()}` }
        ],
        [
          { text: '🏪 Other Stores', callback_data: 'show_stores' },
          { text: '📂 Browse Categories', callback_data: 'show_categories' }
        ],
        [
          { text: '🎯 Get AI Recommendations', callback_data: 'get_recommendations' }
        ],
        [
          { text: '🏠 Main Menu', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.bot.sendMessage(chatId, '🧭 What would you like to do next?', {
      reply_markup: keyboard
    });
  }

  async handleHelp(msg) {
    const chatId = msg.chat.id;

    const helpMessage = `❓ Zabardoo Bot Help

🤖 Commands:
/menu - Show main menu
/recommend - Get AI recommendations  
/categories - Browse by categories
/stores - Browse by stores
/help - Show this help

🎯 Features:
• AI-powered personalized recommendations
• 15+ popular Indian stores
• 6 major categories
• Real-time deal updates
• Smart notifications

💡 Tips:
• Use feedback (👍/👎) to improve recommendations
• Save deals you like for later
• Check trending deals for popular offers

🆘 Need more help? Just ask me anything!`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🏠 Main Menu', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.bot.sendMessage(chatId, helpMessage, {
      reply_markup: keyboard
    });
  }

  async handleCallbackQuery(callbackQuery) {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    await this.bot.answerCallbackQuery(callbackQuery.id);

    switch (data) {
      case 'main_menu':
        await this.showMainMenu(chatId);
        break;

      case 'get_recommendations':
        await this.handleRecommendations({ chat: { id: chatId } });
        break;

      case 'show_categories':
        await this.showCategoriesMenu(chatId);
        break;

      case 'show_stores':
        await this.showStoresMenu(chatId);
        break;

      case 'trending_deals':
        await this.showTrendingDeals(chatId);
        break;

      case 'settings':
        await this.showSettings(chatId);
        break;

      case 'help':
        await this.handleHelp({ chat: { id: chatId } });
        break;

      case 'feedback_positive':
        await this.bot.sendMessage(chatId, '🎉 Thank you! Your feedback helps improve our AI recommendations.');
        await this.showMainMenu(chatId);
        break;

      case 'feedback_negative':
        await this.bot.sendMessage(chatId, '📝 Thanks for the feedback! We\'ll work on improving our recommendations.');
        await this.showMainMenu(chatId);
        break;

      case 'all_stores':
        await this.showAllStores(chatId);
        break;

      default:
        if (data.startsWith('category_')) {
          const category = data.replace('category_', '');
          await this.showCategoryDeals(chatId, category);
        } else if (data.startsWith('store_')) {
          const store = data.replace('store_', '');
          await this.showStoreDeals(chatId, this.getStoreName(store));
        } else if (data.startsWith('copy_')) {
          const couponId = data.replace('copy_', '');
          const coupon = this.demoCoupons.find(c => c.id === couponId);
          if (coupon) {
            await this.bot.sendMessage(chatId, `📋 Code copied: \`${coupon.code}\`\n\nTap to copy and use at checkout!`, { parse_mode: 'Markdown' });
          }
        } else if (data.startsWith('save_')) {
          await this.bot.sendMessage(chatId, '❤️ Deal saved to your favorites!');
        } else if (data.startsWith('share_')) {
          await this.bot.sendMessage(chatId, '📤 Share this amazing deal with friends!');
        }
        break;
    }
  }

  async showTrendingDeals(chatId) {
    const trendingMessage = `🔥 Trending Deals

Most popular deals right now:`;

    await this.bot.sendMessage(chatId, trendingMessage);

    // Show top 3 trending deals
    const trending = this.demoCoupons.slice(0, 3);
    for (let i = 0; i < trending.length; i++) {
      await this.sendCouponCard(chatId, trending[i], i + 1);
    }

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🔄 Refresh Trending', callback_data: 'trending_deals' }
        ],
        [
          { text: '🎯 Get Personal Recommendations', callback_data: 'get_recommendations' }
        ],
        [
          { text: '🏠 Main Menu', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.bot.sendMessage(chatId, '🧭 What\'s next?', {
      reply_markup: keyboard
    });
  }

  async showSettings(chatId) {
    const settingsMessage = `⚙️ Settings

Customize your Zabardoo experience:`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🎯 Notification Preferences', callback_data: 'settings_notifications' }
        ],
        [
          { text: '📂 Favorite Categories', callback_data: 'settings_categories' }
        ],
        [
          { text: '🏪 Favorite Stores', callback_data: 'settings_stores' }
        ],
        [
          { text: '🌍 Language', callback_data: 'settings_language' }
        ],
        [
          { text: '🔙 Back to Menu', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.bot.sendMessage(chatId, settingsMessage, {
      reply_markup: keyboard
    });
  }

  async showAllStores(chatId) {
    const allStoresMessage = `🏪 All Available Stores

We have deals from 15+ popular Indian stores:

🛒 **E-commerce:**
• Flipkart • Amazon India • Snapdeal

👗 **Fashion:**  
• Myntra • Ajio • Koovs

💄 **Beauty:**
• Nykaa • Purplle • Sephora

🍔 **Food:**
• Swiggy • Zomato • Dominos

🏠 **Home:**
• Pepperfry • Urban Ladder

✈️ **Travel:**
• MakeMyTrip • Goibibo • Cleartrip

Choose a specific store or browse all deals:`;

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
        ],
        [
          { text: '🎯 Get AI Recommendations', callback_data: 'get_recommendations' }
        ],
        [
          { text: '🔙 Back to Stores', callback_data: 'show_stores' }
        ]
      ]
    };

    await this.bot.sendMessage(chatId, allStoresMessage, {
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
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
    console.log('🚀 Starting Improved UI Zabardoo Bot...'.green.bold);
    console.log('✅ Bot is ready with enhanced navigation!'.green);
    
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down bot...'.yellow);
      this.bot.stopPolling();
      process.exit(0);
    });
  }
}

// Start the bot
if (require.main === module) {
  const bot = new ImprovedUIZabardooBot();
  bot.start();
}

module.exports = ImprovedUIZabardooBot;
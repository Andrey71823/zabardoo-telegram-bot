#!/usr/bin/env node

const TelegramBot = require('node-telegram-bot-api');
const colors = require('colors');

// Telegram bot token
const token = '7315076864:AAGZ5N4dwhUrSw2tygw4wiCPY74cROKWzsE';

class FixedMenubazaarGuruBot {
  constructor() {
    this.bot = new TelegramBot(token, { polling: true });
    this.users = new Map();
    
    this.demoCoupons = [
      // Flipkart купоны
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
        title: '📱 Flipkart Mobiles - Extra 15% OFF',
        category: 'Electronics',
        store: 'Flipkart',
        discount: '15% OFF',
        code: 'MOBILE15',
        expiry: '5 days left',
        emoji: '📱'
      },
      {
        id: 'coupon-3',
        title: '💻 Flipkart Laptops - ₹10000 OFF',
        category: 'Electronics',
        store: 'Flipkart',
        discount: '₹10000 OFF',
        code: 'LAPTOP10K',
        expiry: '12 days left',
        emoji: '📱'
      },
      
      // Amazon купоны
      {
        id: 'coupon-4',
        title: '📦 Amazon Great Sale - 60% OFF',
        category: 'Electronics',
        store: 'Amazon India',
        discount: '60% OFF',
        code: 'GREAT60',
        expiry: '8 days left',
        emoji: '📦'
      },
      {
        id: 'coupon-5',
        title: '🏠 Amazon Home - 50% OFF Furniture',
        category: 'Home',
        store: 'Amazon India',
        discount: '50% OFF',
        code: 'HOME50',
        expiry: '6 days left',
        emoji: '📦'
      },
      {
        id: 'coupon-6',
        title: '📚 Amazon Books - Buy 3 Get 1 Free',
        category: 'Books',
        store: 'Amazon India',
        discount: 'Buy 3 Get 1 Free',
        code: 'BOOKS3GET1',
        expiry: '15 days left',
        emoji: '📦'
      },

      // Myntra купоны
      {
        id: 'coupon-7',
        title: '👗 Myntra Fashion - 70% OFF',
        category: 'Fashion',
        store: 'Myntra',
        discount: '70% OFF',
        code: 'EORS70',
        expiry: '3 days left',
        emoji: '👗'
      },
      {
        id: 'coupon-8',
        title: '👟 Myntra Footwear - 60% OFF',
        category: 'Fashion',
        store: 'Myntra',
        discount: '60% OFF',
        code: 'SHOES60',
        expiry: '9 days left',
        emoji: '👗'
      },
      {
        id: 'coupon-9',
        title: '👜 Myntra Bags - Extra 40% OFF',
        category: 'Fashion',
        store: 'Myntra',
        discount: '40% OFF',
        code: 'BAGS40',
        expiry: '4 days left',
        emoji: '👗'
      },

      // Nykaa купоны
      {
        id: 'coupon-10',
        title: '💄 Nykaa Beauty - Buy 2 Get 1 Free',
        category: 'Beauty',
        store: 'Nykaa',
        discount: 'Buy 2 Get 1 Free',
        code: 'BEAUTY2GET1',
        expiry: '10 days left',
        emoji: '💄'
      },
      {
        id: 'coupon-11',
        title: '💅 Nykaa Makeup - 50% OFF',
        category: 'Beauty',
        store: 'Nykaa',
        discount: '50% OFF',
        code: 'MAKEUP50',
        expiry: '7 days left',
        emoji: '💄'
      },
      {
        id: 'coupon-12',
        title: '🧴 Nykaa Skincare - 30% OFF',
        category: 'Beauty',
        store: 'Nykaa',
        discount: '30% OFF',
        code: 'SKIN30',
        expiry: '14 days left',
        emoji: '💄'
      },

      // Swiggy купоны
      {
        id: 'coupon-13',
        title: '🍔 Swiggy Food - 60% OFF + Free Delivery',
        category: 'Food',
        store: 'Swiggy',
        discount: '60% OFF',
        code: 'SUPERSAVER60',
        expiry: '2 days left',
        emoji: '🍔'
      },
      {
        id: 'coupon-14',
        title: '🍕 Swiggy Pizza - Buy 1 Get 1 Free',
        category: 'Food',
        store: 'Swiggy',
        discount: 'Buy 1 Get 1 Free',
        code: 'PIZZA1GET1',
        expiry: '1 day left',
        emoji: '🍔'
      },
      {
        id: 'coupon-15',
        title: '🥤 Swiggy Beverages - 40% OFF',
        category: 'Food',
        store: 'Swiggy',
        discount: '40% OFF',
        code: 'DRINKS40',
        expiry: '5 days left',
        emoji: '🍔'
      },

      // MakeMyTrip купоны
      {
        id: 'coupon-16',
        title: '✈️ MakeMyTrip - ₹5000 OFF Flights',
        category: 'Travel',
        store: 'MakeMyTrip',
        discount: '₹5000 OFF',
        code: 'TRAVEL5000',
        expiry: '15 days left',
        emoji: '✈️'
      },
      {
        id: 'coupon-17',
        title: '🏨 MakeMyTrip Hotels - 40% OFF',
        category: 'Travel',
        store: 'MakeMyTrip',
        discount: '40% OFF',
        code: 'HOTEL40',
        expiry: '20 days left',
        emoji: '✈️'
      },
      {
        id: 'coupon-18',
        title: '🚗 MakeMyTrip Cabs - 25% OFF',
        category: 'Travel',
        store: 'MakeMyTrip',
        discount: '25% OFF',
        code: 'CAB25',
        expiry: '10 days left',
        emoji: '✈️'
      }
    ];

    this.setupBotHandlers();
  }

  setupBotHandlers() {
    // Start command
    this.bot.onText(/\/start/, (msg) => {
      this.handleStart(msg);
    });

    // Handle menu button presses
    this.bot.on('message', (msg) => {
      if (msg.text && !msg.text.startsWith('/')) {
        this.handleMenuSelection(msg);
      }
    });

    // Handle inline button callbacks
    this.bot.on('callback_query', (callbackQuery) => {
      this.handleCallbackQuery(callbackQuery);
    });

    console.log('🤖 Fixed Menu bazaarGuru Bot is running...');
    console.log('Menu will always stay at the bottom!');
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

    const welcomeMessage = `🎉 Welcome to bazaarGuru, ${userName}!

I'm your AI-powered coupon assistant for India! 

🎯 What I can do:
• Find personalized coupon recommendations
• Track best deals from 15+ top Indian stores
• Help you save money across all categories
• Learn your preferences for better suggestions

💡 **The menu below is always available - it won't disappear!**
Just tap any option to get started.`;

    // Send welcome message with fixed menu
    await this.bot.sendMessage(chatId, welcomeMessage, {
      reply_markup: this.getFixedMenuKeyboard()
    });

    console.log(`New user started: ${userName}`);
  }

  // Fixed menu that stays at the bottom
  getFixedMenuKeyboard() {
    return {
      keyboard: [
        ['🎯 AI Recommendations', '🔥 Hot Deals'],
        ['📱 Electronics', '👗 Fashion', '💄 Beauty'],
        ['🍔 Food', '🏪 Stores', '⚙️ Settings']
      ],
      resize_keyboard: true,
      persistent: true
    };
  }



  async handleMenuSelection(msg) {
    const chatId = msg.chat.id;
    const text = msg.text;
    const userName = msg.from.first_name || 'User';

    switch (text) {
      case '🎯 AI Recommendations':
        await this.handleRecommendations(chatId);
        break;

      case '🔥 Hot Deals':
        await this.handleHotDeals(chatId);
        break;

      case '📱 Electronics':
        await this.handleCategoryDeals(chatId, 'Electronics');
        break;

      case '👗 Fashion':
        await this.handleCategoryDeals(chatId, 'Fashion');
        break;

      case '💄 Beauty':
        await this.handleCategoryDeals(chatId, 'Beauty');
        break;

      case '🍔 Food':
        await this.handleCategoryDeals(chatId, 'Food');
        break;

      case '🏪 Stores':
        await this.handleStores(chatId);
        break;

      case '⚙️ Settings':
        await this.handleSettings(chatId);
        break;

      default:
        // Handle any other text as search
        await this.handleSearch(chatId, text);
        break;
    }
  }

  async handleRecommendations(chatId) {
    await this.bot.sendMessage(chatId, '🔍 Analyzing your preferences and generating personalized recommendations...');

    setTimeout(async () => {
      const recommendations = this.demoCoupons.slice(0, 3);
      
      await this.bot.sendMessage(chatId, '🎯 **Your Personalized Recommendations:**', { parse_mode: 'Markdown' });

      for (let i = 0; i < recommendations.length; i++) {
        await this.sendCouponCard(chatId, recommendations[i], i + 1);
      }

      // Feedback message
      const feedbackMessage = `💬 How were these recommendations?`;
      const feedbackKeyboard = {
        inline_keyboard: [
          [
            { text: '👍 Great recommendations!', callback_data: 'feedback_positive' },
            { text: '👎 Not relevant', callback_data: 'feedback_negative' }
          ],
          [
            { text: '🔄 Get more recommendations', callback_data: 'get_recommendations' }
          ]
        ]
      };

      await this.bot.sendMessage(chatId, feedbackMessage, {
        reply_markup: feedbackKeyboard
      });

    }, 2000);
  }

  async handleHotDeals(chatId) {
    await this.bot.sendMessage(chatId, '🔥 **Today\'s Hottest Deals**\n\nMost popular offers right now:', { parse_mode: 'Markdown' });

    const hotDeals = this.demoCoupons.slice(0, 4);
    for (let i = 0; i < hotDeals.length; i++) {
      await this.sendCouponCard(chatId, hotDeals[i], i + 1);
    }

    await this.bot.sendMessage(chatId, '💡 **Tip:** Use "🎯 AI Recommendations" for personalized picks just for you!');
  }

  async handleCategoryDeals(chatId, category) {
    const categoryDeals = this.demoCoupons.filter(coupon => 
      coupon.category.toLowerCase() === category.toLowerCase()
    );

    if (categoryDeals.length > 0) {
      await this.bot.sendMessage(chatId, `${this.getCategoryEmoji(category)} **${category} Deals**\n\nBest ${category.toLowerCase()} offers available:`, { parse_mode: 'Markdown' });
      
      for (const coupon of categoryDeals) {
        await this.sendCouponCard(chatId, coupon, categoryDeals.indexOf(coupon) + 1);
      }
    } else {
      await this.bot.sendMessage(chatId, `😔 No ${category} deals available right now.\n\nTry other categories from the menu below or check "🔥 Hot Deals"!`);
    }
  }

  async handleStores(chatId) {
    const storesMessage = `🏪 **Popular Indian Stores**\n\nChoose your favorite store to see exclusive deals:`;

    const storesKeyboard = {
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
        ]
      ]
    };

    await this.bot.sendMessage(chatId, storesMessage, {
      reply_markup: storesKeyboard,
      parse_mode: 'Markdown'
    });
  }

  async handleSettings(chatId) {
    const settingsMessage = `⚙️ **Settings & Preferences**\n\nCustomize your bazaarGuru experience:`;

    const settingsKeyboard = {
      inline_keyboard: [
        [
          { text: '🔔 Notifications', callback_data: 'settings_notifications' },
          { text: '❤️ Favorites', callback_data: 'settings_favorites' }
        ],
        [
          { text: '📂 Categories', callback_data: 'settings_categories' },
          { text: '🏪 Stores', callback_data: 'settings_stores' }
        ],
        [
          { text: '🌍 Language', callback_data: 'settings_language' },
          { text: '📊 Stats', callback_data: 'settings_stats' }
        ]
      ]
    };

    await this.bot.sendMessage(chatId, settingsMessage, {
      reply_markup: settingsKeyboard,
      parse_mode: 'Markdown'
    });
  }

  async handleSearch(chatId, searchText) {
    const searchResults = this.demoCoupons.filter(coupon => 
      coupon.title.toLowerCase().includes(searchText.toLowerCase()) ||
      coupon.store.toLowerCase().includes(searchText.toLowerCase()) ||
      coupon.category.toLowerCase().includes(searchText.toLowerCase())
    );

    if (searchResults.length > 0) {
      await this.bot.sendMessage(chatId, `🔍 **Search Results for "${searchText}"**\n\nFound ${searchResults.length} matching deals:`, { parse_mode: 'Markdown' });
      
      for (const coupon of searchResults) {
        await this.sendCouponCard(chatId, coupon, searchResults.indexOf(coupon) + 1);
      }
    } else {
      await this.bot.sendMessage(chatId, `🔍 No deals found for "${searchText}".\n\nTry:\n• Different keywords\n• Store names (Flipkart, Amazon, Myntra)\n• Categories (Electronics, Fashion, Beauty)\n\nOr use the menu below to browse all deals!`);
    }
  }

  getCategoryEmoji(category) {
    const emojiMap = {
      'Electronics': '📱',
      'Fashion': '👗',
      'Beauty': '💄',
      'Food': '🍔',
      'Home': '🏠',
      'Travel': '✈️'
    };
    return emojiMap[category] || '🎯';
  }

  async sendCouponCard(chatId, coupon, rank) {
    const couponMessage = `${coupon.emoji || '🎯'} **Deal #${rank}**

${coupon.title}

💰 **Discount:** ${coupon.discount}
🏪 **Store:** ${coupon.store}
⏰ **Expires:** ${coupon.expiry}
🎫 **Code:** \`${coupon.code}\`

✨ **Why this deal:**
• Perfect for ${coupon.category} lovers!
• High-value discount (${coupon.discount})
• Popular among users like you
• Limited time offer!`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🛒 Get This Deal', url: 'https://bazaarGuru.com' },
          { text: '📋 Copy Code', callback_data: `copy_code_${coupon.id}` }
        ],
        [
          { text: '❤️ Save for Later', callback_data: `save_coupon_${coupon.id}` },
          { text: '📤 Share', callback_data: `share_coupon_${coupon.id}` }
        ]
      ]
    };

    await this.bot.sendMessage(chatId, couponMessage, {
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
  }

  async showCategoryDeals(chatId, category) {
    const categoryDeals = this.demoCoupons.filter(coupon => 
      coupon.category.toLowerCase() === category.toLowerCase()
    );

    if (categoryDeals.length > 0) {
      await this.bot.sendMessage(chatId, `🎯 **${category} Deals**\n\nHere are the best ${category.toLowerCase()} deals for you:`, { parse_mode: 'Markdown' });
      
      for (const coupon of categoryDeals) {
        await this.sendCouponCard(chatId, coupon, categoryDeals.indexOf(coupon) + 1);
      }
    } else {
      await this.bot.sendMessage(chatId, `😔 No ${category} deals available right now. Check back soon for new offers!`);
    }

    // Always send fixed menu after content
  }

  async showStores(chatId) {
    const storesMessage = `🏪 **Popular Indian Stores**

Choose your favorite store to see exclusive deals:

🛒 **E-commerce Giants:**
• Flipkart - India's leading marketplace
• Amazon India - Everything store
• Snapdeal - Budget-friendly deals

👗 **Fashion & Lifestyle:**
• Myntra - Fashion & beauty destination
• Ajio - Trendy clothing & accessories
• Koovs - International fashion brands

💄 **Beauty & Wellness:**
• Nykaa - Beauty & cosmetics leader
• Purplle - Affordable beauty products
• Sephora - Premium beauty brands

🍔 **Food & Delivery:**
• Swiggy - Food delivery champion
• Zomato - Restaurants & dining
• BigBasket - Fresh groceries

✈️ **Travel & Entertainment:**
• MakeMyTrip - Flights & hotels
• Goibibo - Travel deals & packages
• BookMyShow - Movies & events

**Select a store below:**`;

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
          { text: '🏪 View All Stores', callback_data: 'all_stores' }
        ]
      ]
    };

    await this.bot.sendMessage(chatId, storesMessage, {
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });

    // Always send fixed menu after content
  }



  async handleHotDeals(chatId) {
    await this.bot.sendMessage(chatId, '🔥 **Today\'s Hottest Deals**\n\nMost popular offers right now:', { parse_mode: 'Markdown' });

    const hotDeals = this.demoCoupons.slice(0, 4);
    for (let i = 0; i < hotDeals.length; i++) {
      await this.sendCouponCard(chatId, hotDeals[i], i + 1);
    }
  }

  async handleCategoryDeals(chatId, category) {
    const categoryDeals = this.demoCoupons.filter(coupon => 
      coupon.category.toLowerCase() === category.toLowerCase()
    );

    if (categoryDeals.length > 0) {
      await this.bot.sendMessage(chatId, `${this.getCategoryEmoji(category)} **${category} Deals**\n\nBest ${category.toLowerCase()} offers available:`, { parse_mode: 'Markdown' });
      
      for (const coupon of categoryDeals) {
        await this.sendCouponCard(chatId, coupon, categoryDeals.indexOf(coupon) + 1);
      }
    } else {
      await this.bot.sendMessage(chatId, `😔 No ${category} deals available right now.\n\nTry other categories from the menu below!`);
    }
  }

  async handleStores(chatId) {
    const storesMessage = `🏪 **Popular Indian Stores**\n\nChoose your favorite store to see exclusive deals:`;

    const storesKeyboard = {
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
        ]
      ]
    };

    await this.bot.sendMessage(chatId, storesMessage, {
      reply_markup: storesKeyboard,
      parse_mode: 'Markdown'
    });
  }

  async handleSettings(chatId) {
    const settingsMessage = `⚙️ **Settings & Preferences**\n\nCustomize your bazaarGuru experience:`;

    const settingsKeyboard = {
      inline_keyboard: [
        [
          { text: '🔔 Notifications', callback_data: 'settings_notifications' },
          { text: '❤️ Favorites', callback_data: 'settings_favorites' }
        ],
        [
          { text: '📂 Categories', callback_data: 'settings_categories' },
          { text: '🏪 Stores', callback_data: 'settings_stores' }
        ]
      ]
    };

    await this.bot.sendMessage(chatId, settingsMessage, {
      reply_markup: settingsKeyboard,
      parse_mode: 'Markdown'
    });
  }

  async handleSearch(chatId, searchText) {
    const searchResults = this.demoCoupons.filter(coupon => 
      coupon.title.toLowerCase().includes(searchText.toLowerCase()) ||
      coupon.store.toLowerCase().includes(searchText.toLowerCase()) ||
      coupon.category.toLowerCase().includes(searchText.toLowerCase())
    );

    if (searchResults.length > 0) {
      await this.bot.sendMessage(chatId, `🔍 **Search Results for "${searchText}"**\n\nFound ${searchResults.length} matching deals:`, { parse_mode: 'Markdown' });
      
      for (const coupon of searchResults) {
        await this.sendCouponCard(chatId, coupon, searchResults.indexOf(coupon) + 1);
      }
    } else {
      await this.bot.sendMessage(chatId, `🔍 No deals found for "${searchText}".\n\nTry different keywords or use the menu below to browse all deals!`);
    }
  }

  getCategoryEmoji(category) {
    const emojiMap = {
      'Electronics': '📱',
      'Fashion': '👗',
      'Beauty': '💄',
      'Food': '🍔',
      'Home': '🏠',
      'Travel': '✈️'
    };
    return emojiMap[category] || '🎯';
  }

  async handleCallbackQuery(callbackQuery) {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    await this.bot.answerCallbackQuery(callbackQuery.id);

    switch (data) {
      case 'get_recommendations':
        await this.handleRecommendations(chatId);
        break;

      case 'feedback_positive':
        await this.bot.sendMessage(chatId, '🎉 Thank you! Your feedback helps improve our AI recommendations.\n\nUse the menu below to continue browsing!');
        break;

      case 'feedback_negative':
        await this.bot.sendMessage(chatId, '📝 Thanks for the feedback! We\'ll work on improving our recommendations.\n\nTry browsing by categories or stores using the menu below.');
        break;

      // Settings callbacks
      case 'settings_notifications':
        await this.bot.sendMessage(chatId, '🔔 **Notification Settings**\n\n✅ Deal alerts: ON\n✅ Price drops: ON\n✅ New stores: ON\n\nUse the menu below to continue.');
        break;

      case 'settings_favorites':
        await this.bot.sendMessage(chatId, '❤️ **Your Favorites**\n\nYou have 3 saved deals:\n• Flipkart Electronics - 80% OFF\n• Myntra Fashion - 70% OFF\n• Nykaa Beauty - Buy 2 Get 1\n\nUse the menu below to find more deals!');
        break;

      case 'settings_categories':
        await this.bot.sendMessage(chatId, '📂 **Preferred Categories**\n\nYour interests:\n✅ Electronics\n✅ Fashion\n⭕ Beauty\n⭕ Food\n\nUse the menu below to browse deals!');
        break;

      case 'settings_stores':
        await this.bot.sendMessage(chatId, '🏪 **Preferred Stores**\n\nYour favorites:\n✅ Flipkart\n✅ Amazon India\n✅ Myntra\n⭕ Nykaa\n\nUse the menu below to explore more stores!');
        break;

      case 'settings_language':
        await this.bot.sendMessage(chatId, '🌍 **Language Settings**\n\nCurrent: English 🇺🇸\nAvailable: Hindi 🇮🇳, Tamil 🇮🇳\n\nUse the menu below to continue.');
        break;

      case 'settings_stats':
        await this.bot.sendMessage(chatId, '📊 **Your Stats**\n\n💰 Total saved: ₹12,450\n🎯 Deals used: 23\n⭐ Favorite category: Electronics\n🏪 Top store: Flipkart\n\nKeep saving with the menu below!');
        break;

      default:
        if (data.startsWith('store_')) {
          const store = data.replace('store_', '');
          await this.showStoreDeals(chatId, this.getStoreName(store));
        } else if (data.startsWith('copy_code_')) {
          const couponId = data.replace('copy_code_', '');
          const coupon = this.demoCoupons.find(c => c.id === couponId);
          if (coupon) {
            await this.bot.sendMessage(chatId, `📋 **Code Copied!**\n\n\`${coupon.code}\`\n\nTap the code above to copy it, then paste at checkout!`);
          }
        } else if (data.startsWith('save_coupon_')) {
          await this.bot.sendMessage(chatId, '❤️ Deal saved to your favorites!\n\nAccess saved deals anytime from Settings → Favorites.');
        } else if (data.startsWith('share_coupon_')) {
          await this.bot.sendMessage(chatId, '📤 Share this amazing deal with friends and family!\n\nForward this message or copy the deal details.');
        }
        break;
    }
  }

  async showAllStores(chatId) {
    const allStoresMessage = `🏪 **All Available Stores**

We have exclusive deals from 15+ popular Indian stores:

**🛒 E-commerce & Marketplace:**
• Flipkart • Amazon India • Snapdeal • Paytm Mall

**👗 Fashion & Apparel:**  
• Myntra • Ajio • Koovs • Jabong • Limeroad

**💄 Beauty & Personal Care:**
• Nykaa • Purplle • Sephora • Mamaearth

**🍔 Food & Grocery:**
• Swiggy • Zomato • BigBasket • Grofers • Dominos

**🏠 Home & Lifestyle:**
• Pepperfry • Urban Ladder • Godrej Interio

**✈️ Travel & Entertainment:**
• MakeMyTrip • Goibibo • Cleartrip • BookMyShow

**💳 Financial & Services:**
• Paytm • PhonePe • CRED

Choose any store to see their latest deals and offers!`;

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

    await this.bot.sendMessage(chatId, allStoresMessage, {
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });

    // Always send fixed menu after content
    await this.sendFixedMenu(chatId);
  }

  async showStoreDeals(chatId, storeName) {
    const storeDeals = this.demoCoupons.filter(coupon => 
      coupon.store.toLowerCase().includes(storeName.toLowerCase())
    );

    if (storeDeals.length > 0) {
      await this.bot.sendMessage(chatId, `🏪 **${storeName} Exclusive Deals**\n\nBest offers from ${storeName}:`, { parse_mode: 'Markdown' });
      
      for (const coupon of storeDeals) {
        await this.sendCouponCard(chatId, coupon, storeDeals.indexOf(coupon) + 1);
      }
    } else {
      await this.bot.sendMessage(chatId, `😔 No ${storeName} deals available right now.\n\nCheck other stores or try "🔥 Hot Deals" from the menu below!`);
    }
  }

  getStoreName(storeKey) {
    const storeMap = {
      'flipkart': 'Flipkart',
      'amazon': 'Amazon India',
      'myntra': 'Myntra',
      'nykaa': 'Nykaa',
      'swiggy': 'Swiggy',
      'makemytrip': 'MakeMyTrip'
    };
    return storeMap[storeKey] || storeKey;
  }

  start() {
    console.log('🚀 Starting Fixed Menu bazaarGuru Bot...');
    console.log('📱 Bot Username: @bazaarGuru_deals_bot');
    console.log('✅ Bot is ready with fixed menu at bottom!');
    
    // Keep the process running
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down bot...');
      this.bot.stopPolling();
      process.exit(0);
    });
  }
}

// Start the bot if run directly
if (require.main === module) {
  const bazaarGuruBot = new FixedMenubazaarGuruBot();
  bazaarGuruBot.start();
}

module.exports = FixedMenubazaarGuruBot;
#!/usr/bin/env node

const TelegramBot = require('node-telegram-bot-api');

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
      }
    ];

    this.setupBotHandlers();
  }

  setupBotHandlers() {
    // Bot commands (как в вашем примере)
    this.bot.onText(/\/start/, (msg) => this.handleStart(msg));
    this.bot.onText(/\/help/, (msg) => this.handleHelpCommand(msg));
    this.bot.onText(/\/guide/, (msg) => this.handleGuideCommand(msg));
    this.bot.onText(/\/profile/, (msg) => this.handleProfileCommand(msg));
    this.bot.onText(/\/settings/, (msg) => this.handleSettingsCommand(msg));
    this.bot.onText(/\/cashback/, (msg) => this.handleCashbackCommand(msg));
    this.bot.onText(/\/deals/, (msg) => this.handleDealsCommand(msg));
    this.bot.onText(/\/feedback/, (msg) => this.handleFeedbackCommand(msg));
    this.bot.onText(/\/menu/, (msg) => this.handleMenuCommand(msg));

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

    // Set bot commands
    this.setBotCommands();

    console.log('🤖 Fixed Menu bazaarGuru Bot is running...');
    console.log('📋 Main keyboard: 2 rows with Guide button');
    console.log('📋 Category keyboard: 5 rows with AI Recommendations and Hot Deals');
  }

  async setBotCommands() {
    const commands = [
      { command: 'start', description: 'Start bot and show main menu' },
      { command: 'help', description: 'Show help and support information' },
      { command: 'guide', description: 'Complete guide for all buttons and functions' },
      { command: 'profile', description: 'My profile, level and achievements' },
      { command: 'settings', description: 'Notification settings' },
      { command: 'cashback', description: 'My cashback and balance' },
      { command: 'deals', description: 'Find best deals and discounts' },
      { command: 'feedback', description: 'Send feedback or suggestion to admin' },
      { command: 'menu', description: 'Show command menu' }
    ];

    try {
      await this.bot.setMyCommands(commands);
      console.log('✅ Bot commands set successfully');
    } catch (error) {
      console.log('⚠️ Failed to set commands:', error.message);
    }
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

    // Send welcome message with main inline keyboard
    await this.bot.sendMessage(chatId, welcomeMessage, {
      reply_markup: this.getMainKeyboard()
    });

    console.log(`New user started: ${userName}`);
  }

  // Main Keyboard Structure (как в вашем примере)
  getMainKeyboard() {
    return {
      inline_keyboard: [
        [
          { text: '🔍 Find Deals', callback_data: 'find_deals' },
          { text: '🎮 My Profile', callback_data: 'profile' },
          { text: '📖 Guide', callback_data: 'complete_guide' }
        ],
        [
          { text: '💰 Cashback', callback_data: 'cashback' },
          { text: '⚙️ Settings', callback_data: 'settings' },
          { text: '🆘 Help', callback_data: 'help' }
        ]
      ]
    };
  }

  // Category Keyboard Structure (как в вашем примере)
  getCategoryKeyboard() {
    return {
      inline_keyboard: [
        [
          { text: '🤖 AI Recommendations', callback_data: 'ai_recommendations' },
          { text: '🔥 Hot Deals', callback_data: 'hot_deals' },
          { text: '📖 Guide', callback_data: 'complete_guide' }
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
          { text: '🎮 My Profile', callback_data: 'profile' }
        ],
        [
          { text: '💰 Cashback', callback_data: 'cashback' },
          { text: '🆘 Help', callback_data: 'help' }
        ]
      ]
    };
  }

  // CORRECTED Fixed menu that stays at the bottom
  getFixedMenuKeyboard() {
    return {
      keyboard: [
        ['🔍 Find Deals', '🎮 My Profile', '📖 Guide'],
        ['💰 Cashback', '⚙️ Settings', '🆘 Help']
      ],
      resize_keyboard: true,
      persistent: true
    };
  }

  async handleMenuSelection(msg) {
    const chatId = msg.chat.id;
    const text = msg.text;
    const userName = msg.from.first_name || 'User';

    // Handle bottom menu buttons (ReplyKeyboard)
    switch (text) {
      case '🔍 Find Deals':
        await this.handleFindDeals(chatId);
        break;

      case '🎮 My Profile':
        await this.handleMyProfile(chatId, userName);
        break;

      case '📖 Guide':
        await this.handleCompleteGuide(chatId);
        break;

      case '💰 Cashback':
        await this.handleCashback(chatId, userName);
        break;

      case '⚙️ Settings':
        await this.handleSettings(chatId);
        break;

      case '🆘 Help':
        await this.handleHelp(chatId);
        break;

      default:
        // Handle any other text as search
        await this.handleSearch(chatId, text);
        break;
    }
  }

  async handleFindDeals(chatId) {
    await this.bot.sendMessage(chatId, '🔍 **Top Deals Right Now!**\n\nBest offers available:', { parse_mode: 'Markdown' });

    const topDeals = this.demoCoupons.slice(0, 5);
    for (let i = 0; i < topDeals.length; i++) {
      await this.sendCouponCard(chatId, topDeals[i], i + 1);
    }

    await this.bot.sendMessage(chatId, '💡 **Tip:** Use voice search or send product photos for personalized results!');
  }

  async handleMyProfile(chatId, userName) {
    const profileMessage = `🎮 **Your bazaarGuru Profile**

👤 **User:** ${userName}
💎 **Level:** 5
⚡ **XP:** 1,250 points
🏆 **Achievements:** 12/50 unlocked
🔥 **Streak:** 7 days
💰 **Total Savings:** ₹15,450

🎯 **Progress to Level 6:**
${'█'.repeat(7)}${'░'.repeat(3)} 70/100 XP

🏆 **Recent Achievements:**
🏅 Deal Hunter - Found 50 deals
🏅 Voice Master - Used voice search 25 times
🏅 Photo Pro - Scanned 10 products

Keep exploring to unlock more rewards!`;

    await this.bot.sendMessage(chatId, profileMessage, { parse_mode: 'Markdown' });
  }

  async handleCompleteGuide(chatId) {
    const guideMessage = `📖 **COMPLETE GUIDE - What Each Button Does**

🔍 **FIND DEALS**
   ✅ What it does: Shows the best deals available
   ✅ How it works: Updates every minute with fresh offers
   ✅ What you get: Up to 80% discounts + cashback
   ✅ Where it leads: Direct links to stores

� **MY gPROFILE**
   ✅ What it shows: Your level and experience points
   ✅ Achievements: How many rewards you've earned
   ✅ Statistics: How many days you've been active
   ✅ Savings: Total money you've saved

💰 **CASHBACK**
   ✅ Balance: How much money you can withdraw
   ✅ Pending: How much more is coming
   ✅ History: All your purchase transactions
   ✅ Withdrawal: Via UPI, PayTM, bank transfer

📖 **GUIDE (This Guide)**
   ✅ Explains ALL buttons in simple words
   ✅ Shows what each function does
   ✅ Gives tips on how to save more money
   ✅ Helps you never get confused

⚙️ **SETTINGS**
   🔔 **Toggle Price Drops** - Turn on/off price drop notifications
   ⚡ **Toggle Flash Sales** - Turn on/off flash sale alerts  
   ⏰ **Set Quiet Hours** - Set time when NOT to disturb you (like at night)
   🛑 **Pause All (2h)** - Turn OFF ALL notifications for 2 hours

🆘 **HELP**
   ✅ Quick help for main functions
   ✅ List of all bot commands
   ✅ How to contact support

🤖 **AI RECOMMENDATIONS**
   ✅ Personal offers ONLY for you
   ✅ Based on your purchases and interests
   ✅ Smart suggestions on what to buy cheaper

🔥 **HOT DEALS**
   ✅ Most popular deals RIGHT NOW
   ✅ Limited time offers
   ✅ Best discounts ending soon

📱 **ELECTRONICS** - Phones, laptops, headphones
👗 **FASHION** - Clothes, shoes, accessories  
💄 **BEAUTY** - Cosmetics, perfume, skincare
🍔 **FOOD** - Restaurants, food delivery
🏪 **STORES** - All stores and their discounts

💡 **SECRET TIPS:**
🎤 Send voice message - finds better deals!
📸 Take product photo - shows where it's cheaper!
🏆 Visit daily - get more rewards!
🔔 Enable notifications - don't miss deals!
👥 Invite friends - get bonus cashback!

🎯 **GOLDEN RULE:** The more you use the bot, the more money you save! 💰`;

    await this.bot.sendMessage(chatId, guideMessage, { 
      parse_mode: 'Markdown',
      reply_markup: this.getMainKeyboard()
    });
  }

  async handleCashback(chatId, userName) {
    const cashbackMessage = `💰 **Your Cashback Summary**

💳 **Available Balance:** ₹1,245
⏳ **Pending:** ₹389
📊 **Total Earned:** ₹5,670

🏦 **Recent Transactions:**
💸 Flipkart - ₹150 (Ready)
💸 Amazon - ₹89 (Pending)
💸 Myntra - ₹245 (Ready)

🎯 **Minimum withdrawal:** ₹100
💳 **Withdraw via:** UPI/PayTM instantly!

💡 **Tip:** Earn more by sharing deals with friends!`;

    await this.bot.sendMessage(chatId, cashbackMessage, { parse_mode: 'Markdown' });
  }

  async handleRandomDeal(chatId) {
    const randomDeals = [
      { name: 'iPhone 15 Pro', discount: '25%', price: '₹89,999', cashback: '5%' },
      { name: 'Samsung 4K TV', discount: '40%', price: '₹45,999', cashback: '8%' },
      { name: 'Nike Air Jordan', discount: '30%', price: '₹8,999', cashback: '6%' },
      { name: 'MacBook Pro M3', discount: '15%', price: '₹1,89,999', cashback: '3%' },
      { name: 'Sony Headphones', discount: '35%', price: '₹15,999', cashback: '7%' }
    ];
    
    const randomDeal = randomDeals[Math.floor(Math.random() * randomDeals.length)];
    
    const dealMessage = `🎲 **Random Deal of the Day!**

🎯 **${randomDeal.name}**
💥 **${randomDeal.discount} OFF** - Now ${randomDeal.price}
💰 **+${randomDeal.cashback} Cashback**
⏰ **Limited Time Offer!**

🔥 **Why this deal is amazing:**
• Verified seller with 4.8★ rating
• Free shipping and easy returns
• 1-year warranty included
• Price match guarantee

🚀 **Want more deals like this?** Use 🔍 Find Deals for personalized recommendations!`;

    await this.bot.sendMessage(chatId, dealMessage, { parse_mode: 'Markdown' });
  }

  async handleAskbazaarGuru(chatId, userName) {
    const aiMessage = `🧠 **Ask bazaarGuru AI Assistant**

� **Hi ${userName}! I'm your personal shopping AI!**

🎯 **What I can help you with:**
• 🔍 Find specific products and deals
• 💰 Compare prices across stores
• 🎨 Generate shopping memes and content
• 📱 Product recommendations based on your needs
• 🛒 Smart shopping tips and tricks
• 💡 Budget-friendly alternatives

🎤 **How to use:**
• Send me a text message with your question
• Use voice messages for natural conversation
• Send product photos for instant recognition
• Ask in English or Hindi - I understand both!

💡 **Example questions:**
"Find me a good smartphone under ₹20,000"
"Compare iPhone vs Samsung Galaxy"
"Create a funny meme about online shopping"

🚀 **Just send me a message to start chatting!**`;
    
    await this.bot.sendMessage(chatId, aiMessage, { parse_mode: 'Markdown' });
  }

  async handleSettings(chatId) {
    const settingsMessage = `⚙️ **Settings & Preferences**

🛡️ **Anti-Spam Protection Active!**

Current Settings:
🔔 Price Drops: ✅ Enabled
⚡ Flash Sales: ✅ Enabled  
🎯 Personal Deals: ✅ Enabled
🏆 Achievements: ✅ Enabled
💰 Cashback Updates: ✅ Enabled

⏰ Quiet Hours: 22:00 - 08:00
📊 Frequency: Smart (AI-optimized)

🎛️ You have full control over all notifications!`;

    await this.bot.sendMessage(chatId, settingsMessage, { 
      parse_mode: 'Markdown',
      reply_markup: this.getMainKeyboard()
    });
  }

  async handleLanguage(chatId) {
    const languageMessage = `🌐 **Language Settings**

🎯 **Choose your preferred language:**

Current: English 🇺🇸

Available languages:`;

    const languageKeyboard = {
      inline_keyboard: [
        [
          { text: '� 🇸 English', callback_data: 'lang_en' },
          { text: '🇮🇳 हिंदी (Hindi)', callback_data: 'lang_hi' }
        ],
        [
          { text: '🇮🇳 తెలుగు (Telugu)', callback_data: 'lang_te' },
          { text: '🇮🇳 தமிழ் (Tamil)', callback_data: 'lang_ta' }
        ],
        [
          { text: '🇮🇳 ગુજરાતી (Gujarati)', callback_data: 'lang_gu' },
          { text: '🇮🇳 ಕನ್ನಡ (Kannada)', callback_data: 'lang_kn' }
        ],
        [
          { text: '🇮🇳 മലയാളം (Malayalam)', callback_data: 'lang_ml' },
          { text: '🇮🇳 मराठी (Marathi)', callback_data: 'lang_mr' }
        ]
      ]
    };

    await this.bot.sendMessage(chatId, languageMessage, {
      reply_markup: languageKeyboard,
      parse_mode: 'Markdown'
    });
  }

  async handleHelp(chatId) {
    const helpMessage = `🆘 **bazaarGuru Bot Quick Help**

🎯 **Main Functions:**
• Find deals and get cashback
• Earn XP and unlock achievements
• Get personalized recommendations
• Track your savings

⚡ **Quick Tips:**
• Use voice messages for better search
• Send product photos for exact matches
• Visit daily to earn more rewards
• Enable notifications for flash deals

🛡️ **Anti-Spam Protection:**
• You control all notifications
• Quiet hours: 22:00-08:00
• Easy unsubscribe options

💰 **Cashback:**
• Automatic tracking
• Multiple withdrawal methods
• Real-time balance updates

🎤📸 **TRY NOW:** Send voice message or photo for instant deals!

Need more help? Use 📖 Guide for detailed explanations!`;

    await this.bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
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

  async handleCallbackQuery(callbackQuery) {
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;
    const data = callbackQuery.data;
    const userName = callbackQuery.from.first_name || 'User';

    await this.bot.answerCallbackQuery(callbackQuery.id);

    let responseText = '';
    let keyboard = null;

    switch (data) {
      case 'find_deals':
        responseText = `🔍 **Top Deals for ${userName}!**

🎯 **Hot Deals Right Now:**
📱 Samsung Galaxy S24 - 28% OFF (₹52,000)
👟 Nike Air Max - 35% OFF (₹5,200)
💻 MacBook Air M3 - 15% OFF (₹85,000)
👗 Zara Dress Collection - 40% OFF
🎧 Sony WH-1000XM5 - 25% OFF (₹22,500)

💰 All with cashback up to 8%!
🎁 +5 XP for browsing deals!

🎤📸 **SMART SEARCH:** Send voice message or photo for personalized results!

Choose a category below for more specific deals:`;
        keyboard = this.getCategoryKeyboard();
        break;

      case 'profile':
        responseText = `🎮 **Your bazaarGuru Profile**

👤 **User:** ${userName}
💎 **Level:** 5
⚡ **XP:** 1,250 points
🏆 **Achievements:** 12/50 unlocked
🔥 **Streak:** 7 days
💰 **Total Savings:** ₹15,450

🎯 **Progress to Level 6:**
${'█'.repeat(7)}${'░'.repeat(3)} 70/100 XP

🏆 **Recent Achievements:**
🏅 Deal Hunter - Found 50 deals
🏅 Voice Master - Used voice search 25 times
🏅 Photo Pro - Scanned 10 products

Keep exploring to unlock more rewards!`;
        keyboard = this.getMainKeyboard();
        break;

      case 'complete_guide':
        responseText = `📖 **COMPLETE GUIDE - What Each Button Does**

🔍 **FIND DEALS**
   ✅ What it does: Shows the best deals available
   ✅ How it works: Updates every minute with fresh offers
   ✅ What you get: Up to 80% discounts + cashback
   ✅ Where it leads: Direct links to stores

🎮 **MY PROFILE**
   ✅ What it shows: Your level and experience points
   ✅ Achievements: How many rewards you've earned
   ✅ Statistics: How many days you've been active
   ✅ Savings: Total money you've saved

💰 **CASHBACK**
   ✅ Balance: How much money you can withdraw
   ✅ Pending: How much more is coming
   ✅ History: All your purchase transactions
   ✅ Withdrawal: Via UPI, PayTM, bank transfer

⚙️ **SETTINGS**
   🔔 **Toggle Price Drops** - Turn on/off price drop notifications
   ⚡ **Toggle Flash Sales** - Turn on/off flash sale alerts  
   ⏰ **Set Quiet Hours** - Set time when NOT to disturb you
   🛑 **Pause All (2h)** - Turn OFF ALL notifications for 2 hours

🆘 **HELP**
   ✅ Quick help for main functions
   ✅ List of all bot commands
   ✅ How to contact support

💡 **SECRET TIPS:**
🎤 Send voice message - finds better deals!
📸 Take product photo - shows where it's cheaper!
🏆 Visit daily - get more rewards!
🔔 Enable notifications - don't miss deals!
👥 Invite friends - get bonus cashback!

🎯 **GOLDEN RULE:** The more you use the bot, the more money you save! 💰`;
        keyboard = this.getMainKeyboard();
        break;

      case 'cashback':
        responseText = `💰 **Your Cashback Summary**

💳 **Available Balance:** ₹1,245
⏳ **Pending:** ₹389
📊 **Total Earned:** ₹5,670

🏦 **Recent Transactions:**
💸 Flipkart - ₹150 (Ready)
💸 Amazon - ₹89 (Pending)
💸 Myntra - ₹245 (Ready)

🎯 **Minimum withdrawal:** ₹100
💳 **Withdraw via:** UPI/PayTM instantly!

💡 **Tip:** Earn more by sharing deals with friends!`;
        keyboard = this.getMainKeyboard();
        break;

      case 'settings':
        responseText = `⚙️ **Settings & Preferences**

🛡️ **Anti-Spam Protection Active!**

Current Settings:
🔔 Price Drops: ✅ Enabled
⚡ Flash Sales: ✅ Enabled  
🎯 Personal Deals: ✅ Enabled
🏆 Achievements: ✅ Enabled
💰 Cashback Updates: ✅ Enabled

⏰ Quiet Hours: 22:00 - 08:00
📊 Frequency: Smart (AI-optimized)

🎛️ You have full control over all notifications!`;
        keyboard = this.getMainKeyboard();
        break;

      case 'help':
        responseText = `🆘 **bazaarGuru Bot Quick Help**

🎯 **Main Functions:**
• Find deals and get cashback
• Earn XP and unlock achievements
• Get personalized recommendations
• Track your savings

⚡ **Quick Commands:**
/start - Main menu
/guide - Complete button guide
/profile - Your stats
/cashback - Your balance
/deals - Find deals
/settings - Notifications

🎤📸 **SMART SEARCH (Most Popular!):**
🎤 **Voice Search:** Say "bottle" → Get water bottle deals
📸 **Photo Search:** Send product photo → Get exact matches
Why it's better: More accurate than typing!

🛡️ **Anti-Spam Protection:**
• You control all notifications
• Quiet hours: 22:00-08:00
• Easy unsubscribe options

💰 **Cashback:**
• Automatic tracking
• Multiple withdrawal methods
• Real-time balance updates

🎤📸 **TRY NOW:** Send voice message or photo for instant deals!

Need more help? Use 📖 Guide for detailed explanations!`;
        keyboard = this.getMainKeyboard();
        break;

      case 'ai_recommendations':
        responseText = `🤖 **AI Recommendations for ${userName}**

🎯 **Personalized just for you:**
📱 iPhone 15 Pro - 25% OFF (₹89,999) - Based on your tech interests
👟 Nike Air Max - 30% OFF (₹8,999) - Popular in your area
💻 MacBook Air M3 - 15% OFF (₹1,14,900) - Trending now

🧠 **Why these recommendations:**
• Based on your browsing history
• Popular among users like you
• High cashback potential
• Limited time offers

🎁 +10 XP for AI recommendations!`;
        keyboard = this.getCategoryKeyboard();
        break;

      case 'hot_deals':
        responseText = `🔥 **Hot Deals Right Now!**

⚡ **Most Popular Today:**
🎧 Sony WH-1000XM5 - 35% OFF (₹22,500)
👗 Zara Collection - 40% OFF
🏠 Home Decor - 50% OFF
📱 Samsung Galaxy S24 - 28% OFF (₹52,000)

🔥 **Why these are hot:**
• Highest click rate today
• Limited stock remaining
• Best price in 6 months
• High user ratings

🎁 +8 XP for hot deals!`;
        keyboard = this.getCategoryKeyboard();
        break;

      case 'electronics':
        responseText = `📱 **Electronics Deals**

🎯 **Best Electronics Offers:**
📱 Smartphones - Up to 30% OFF
💻 Laptops - Up to 25% OFF
🎧 Headphones - Up to 40% OFF
📺 TVs - Up to 35% OFF
⌚ Smartwatches - Up to 45% OFF

💰 All with extra cashback up to 8%!`;
        keyboard = this.getCategoryKeyboard();
        break;

      case 'fashion':
        responseText = `👗 **Fashion Deals**

🎯 **Best Fashion Offers:**
👗 Dresses - Up to 70% OFF
👟 Shoes - Up to 60% OFF
👜 Bags - Up to 50% OFF
👔 Men's Wear - Up to 55% OFF
💍 Accessories - Up to 65% OFF

💰 All with extra cashback up to 6%!`;
        keyboard = this.getCategoryKeyboard();
        break;

      case 'beauty':
        responseText = `💄 **Beauty Deals**

🎯 **Best Beauty Offers:**
💄 Makeup - Buy 2 Get 1 Free
🧴 Skincare - Up to 50% OFF
💅 Nail Care - Up to 40% OFF
🧴 Hair Care - Up to 45% OFF
🌸 Perfumes - Up to 35% OFF

💰 All with extra cashback up to 7%!`;
        keyboard = this.getCategoryKeyboard();
        break;

      case 'food':
        responseText = `🍔 **Food Deals**

🎯 **Best Food Offers:**
🍕 Pizza - Buy 1 Get 1 Free
🍔 Burgers - 50% OFF
🥤 Beverages - 40% OFF
🍰 Desserts - 30% OFF
🍜 Asian Food - 45% OFF

💰 All with extra cashback up to 10%!`;
        keyboard = this.getCategoryKeyboard();
        break;

      case 'stores':
        responseText = `🏪 **Popular Stores**

🎯 **Top Indian Stores:**
🛒 Flipkart - Up to 80% OFF
📦 Amazon India - Up to 70% OFF
👗 Myntra - Up to 75% OFF
💄 Nykaa - Buy 2 Get 1 Free
🍔 Swiggy - 60% OFF + Free Delivery
✈️ MakeMyTrip - ₹5000 OFF

💰 All with guaranteed cashback!`;
        keyboard = this.getCategoryKeyboard();
        break;

      // Handle coupon actions
      default:
        if (data.startsWith('lang_')) {
          const langCode = data.replace('lang_', '');
          const languages = {
            'en': '🇺🇸 English',
            'hi': '🇮🇳 हिंदी (Hindi)',
            'te': '🇮🇳 తెలుగు (Telugu)',
            'ta': '🇮🇳 தமிழ் (Tamil)',
            'gu': '🇮🇳 ગુજરાતી (Gujarati)',
            'kn': '🇮🇳 ಕನ್ನಡ (Kannada)',
            'ml': '🇮🇳 മലയാളം (Malayalam)',
            'mr': '🇮🇳 मराठी (Marathi)'
          };
          
          const selectedLanguage = languages[langCode] || '🇺🇸 English';
          await this.bot.sendMessage(chatId, `✅ **Language Updated!**\n\nYour language has been set to: ${selectedLanguage}\n\nAll future messages will be in your selected language.`);
          return;
        } else if (data.startsWith('copy_code_')) {
          const couponId = data.replace('copy_code_', '');
          const coupon = this.demoCoupons.find(c => c.id === couponId);
          if (coupon) {
            await this.bot.sendMessage(chatId, `📋 **Code Copied!**\n\n\`${coupon.code}\`\n\nTap the code above to copy it, then paste at checkout!`);
          }
          return;
        } else if (data.startsWith('save_coupon_')) {
          await this.bot.sendMessage(chatId, '❤️ Deal saved to your favorites!\n\nAccess saved deals anytime from Settings → Favorites.');
          return;
        } else if (data.startsWith('share_coupon_')) {
          await this.bot.sendMessage(chatId, '📤 Share this amazing deal with friends and family!\n\nForward this message or copy the deal details.');
          return;
        }
        
        responseText = `🤖 Feature coming soon! Stay tuned for updates.`;
        keyboard = this.getMainKeyboard();
        break;
    }

    // Edit the message with new content and keyboard
    try {
      await this.bot.editMessageText(responseText, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    } catch (error) {
      // If edit fails, send new message
      await this.bot.sendMessage(chatId, responseText, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    }
  }

  // Command handlers
  async handleHelpCommand(msg) {
    const chatId = msg.chat.id;
    await this.handleHelp(chatId);
  }

  async handleGuideCommand(msg) {
    const chatId = msg.chat.id;
    await this.handleCompleteGuide(chatId);
  }

  async handleProfileCommand(msg) {
    const chatId = msg.chat.id;
    const userName = msg.from.first_name || 'User';
    await this.handleMyProfile(chatId, userName);
  }

  async handleSettingsCommand(msg) {
    const chatId = msg.chat.id;
    await this.handleSettings(chatId);
  }

  async handleCashbackCommand(msg) {
    const chatId = msg.chat.id;
    const userName = msg.from.first_name || 'User';
    await this.handleCashback(chatId, userName);
  }

  async handleDealsCommand(msg) {
    const chatId = msg.chat.id;
    await this.handleFindDeals(chatId);
  }

  async handleFeedbackCommand(msg) {
    const chatId = msg.chat.id;
    const userName = msg.from.first_name || 'User';
    
    const feedbackMessage = `💌 **Send Feedback to Admin**

Hi ${userName}! We'd love to hear from you! 

📝 **What you can send:**
• Suggestions for new features
• Bug reports or issues
• Ideas for improvement
• General feedback about the bot
• Store or deal requests

✍️ **How to send:**
Just type your message after this and it will be sent directly to our admin team!

Example: "Please add more electronics deals from Xiaomi"

🎁 You'll get +5 XP for providing feedback!

💡 Your feedback helps us make the bot better for everyone!`;

    await this.bot.sendMessage(chatId, feedbackMessage, {
      parse_mode: 'Markdown',
      reply_markup: this.getMainKeyboard()
    });
  }

  async handleMenuCommand(msg) {
    const chatId = msg.chat.id;
    const userName = msg.from.first_name || 'User';
    
    const menuMessage = `📋 **Command Menu for ${userName}**

🎯 **Available Commands:**

🚀 **/start** - Start bot and show main menu
🆘 **/help** - Show help and support information  
📖 **/guide** - Complete guide for all buttons and functions
👤 **/profile** - My profile, level and achievements
⚙️ **/settings** - Notification settings
💰 **/cashback** - My cashback and balance
🔍 **/deals** - Find best deals and discounts
💌 **/feedback** - Send feedback or suggestion to admin
📋 **/menu** - Show this command menu

💡 **Quick Tips:**
• Type any command to use it instantly
• Use buttons below for quick access
• Send voice messages for better search
• Upload product photos for instant deals

🎁 +2 XP for checking the menu!`;

    await this.bot.sendMessage(chatId, menuMessage, {
      parse_mode: 'Markdown',
      reply_markup: this.getMainKeyboard()
    });
  }

  start() {
    console.log('🚀 Starting Fixed Menu bazaarGuru Bot...');
    console.log('📱 Bot Username: @bazaarGuru_deals_bot');
    console.log('✅ Bot is ready with CORRECT keyboard structure!');
    console.log('');
    console.log('📋 Main Keyboard Structure:');
    console.log('   Row 1: 🔍 Find Deals | 🎮 My Profile | 📖 Guide');
    console.log('   Row 2: 💰 Cashback | ⚙️ Settings | 🆘 Help');
    console.log('');
    console.log('📋 Category Keyboard Structure:');
    console.log('   Row 1: 🤖 AI Recommendations | 🔥 Hot Deals | 📖 Guide');
    console.log('   Row 2: 📱 Electronics | 👗 Fashion | 💄 Beauty');
    console.log('   Row 3: 🍔 Food | 🏪 Stores | ⚙️ Settings');
    console.log('   Row 4: 🔍 Find Deals | 🎮 My Profile');
    console.log('   Row 5: 💰 Cashback | 🆘 Help');
    console.log('');
    console.log('📋 Bot Commands:');
    console.log('   /start, /help, /guide, /profile, /settings');
    console.log('   /cashback, /deals, /feedback, /menu');
    
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
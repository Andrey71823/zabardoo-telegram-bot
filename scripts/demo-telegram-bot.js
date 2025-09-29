#!/usr/bin/env node

const TelegramBot = require('node-telegram-bot-api');
const colors = require('colors');

// Telegram bot token
const token = '7315076864:AAGZ5N4dwhUrSw2tygw4wiCPY74cROKWzsE';

class bazaarGuruTelegramBot {
  constructor() {
    this.bot = new TelegramBot(token, { polling: true });
    this.users = new Map(); // Simple in-memory user storage for demo
    
    this.demoCoupons = [
      {
        id: 'coupon-1',
        title: '🔥 Flipkart Big Billion Days - Up to 80% Off Electronics',
        category: 'Electronics',
        store: 'Flipkart',
        discount: '80% OFF',
        description: 'Massive discounts on smartphones, laptops, and accessories during Big Billion Days sale',
        code: 'BIGBILLION80',
        link: 'https://bazaarGuru.com/coupons/flipkart-big-billion-days',
        expiry: '7 days left'
      },
      {
        id: 'coupon-2',
        title: '💄 Nykaa Beauty Bonanza - Buy 2 Get 1 Free',
        category: 'Beauty',
        store: 'Nykaa',
        discount: 'Buy 2 Get 1 Free',
        description: 'Buy any 2 beauty products and get 1 absolutely free on Nykaa',
        code: 'BEAUTY2GET1',
        link: 'https://bazaarGuru.com/coupons/nykaa-beauty-bonanza',
        expiry: '10 days left'
      },
      {
        id: 'coupon-3',
        title: '👗 Myntra End of Reason Sale - Flat 70% Off Fashion',
        category: 'Fashion',
        store: 'Myntra',
        discount: '70% OFF',
        description: 'Flat 70% discount on fashion and lifestyle products',
        code: 'EORS70',
        link: 'https://bazaarGuru.com/coupons/myntra-end-of-reason-sale',
        expiry: '3 days left'
      },
      {
        id: 'coupon-4',
        title: '🍔 Swiggy Super Saver - 60% Off + Free Delivery',
        category: 'Food',
        store: 'Swiggy',
        discount: '60% OFF',
        description: 'Get 60% off on food orders with free delivery',
        code: 'SUPERSAVER60',
        link: 'https://bazaarGuru.com/coupons/swiggy-super-saver',
        expiry: '2 days left'
      }
    ];

    this.setupBotHandlers();
  }

  setupBotHandlers() {
    // Start command
    this.bot.onText(/\/start/, (msg) => {
      this.handleStart(msg);
    });

    // Help command
    this.bot.onText(/\/help/, (msg) => {
      this.handleHelp(msg);
    });

    // Recommendations command
    this.bot.onText(/\/recommend/, (msg) => {
      this.handleRecommendations(msg);
    });

    // Profile setup command
    this.bot.onText(/\/profile/, (msg) => {
      this.handleProfile(msg);
    });

    // Categories command
    this.bot.onText(/\/categories/, (msg) => {
      this.handleCategories(msg);
    });

    // Callback query handler for inline keyboards
    this.bot.on('callback_query', (callbackQuery) => {
      this.handleCallbackQuery(callbackQuery);
    });

    // Error handler
    this.bot.on('polling_error', (error) => {
      console.log('Polling error:'.red, error);
    });

    console.log('🤖 bazaarGuru Telegram Bot is running...'.green.bold);
    console.log('Bot token configured and polling started.'.green);
    console.log('Try sending /start to the bot!'.yellow);
  }

  async handleStart(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userName = msg.from.first_name || 'User';

    // Initialize user if not exists
    if (!this.users.has(userId)) {
      this.users.set(userId, {
        id: userId,
        name: userName,
        chatId: chatId,
        preferences: {
          categories: [],
          stores: [],
          discount_threshold: 20
        },
        created_at: new Date()
      });
    }

    const welcomeMessage = `
🎉 Welcome to bazaarGuru, ${userName}! 

I'm your AI-powered coupon assistant, ready to help you find the best deals and discounts in India! 

🎯 **What I can do:**
• 🔍 Find personalized coupon recommendations
• 💰 Track the best deals from top Indian stores
• 🛍️ Help you save money on Electronics, Fashion, Beauty, Food & more
• 📊 Learn your preferences to improve recommendations

🚀 **Get Started:**
• /recommend - Get personalized coupon recommendations
• /profile - Set up your preferences
• /categories - Browse coupons by category
• /help - See all available commands

Let's start saving money together! 💸✨
    `;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🎯 Get Recommendations', callback_data: 'get_recommendations' },
          { text: '⚙️ Setup Profile', callback_data: 'setup_profile' }
        ],
        [
          { text: '📱 Electronics', callback_data: 'category_electronics' },
          { text: '👗 Fashion', callback_data: 'category_fashion' }
        ],
        [
          { text: '💄 Beauty', callback_data: 'category_beauty' },
          { text: '🍔 Food', callback_data: 'category_food' }
        ]
      ]
    };

    await this.bot.sendMessage(chatId, welcomeMessage, {
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });

    console.log(`New user started: ${userName} (${userId})`.cyan);
  }

  async handleHelp(msg) {
    const chatId = msg.chat.id;

    const helpMessage = `
🤖 **bazaarGuru Bot Commands**

**Main Commands:**
/start - Welcome message and main menu
/recommend - Get AI-powered coupon recommendations
/profile - Set up your shopping preferences
/categories - Browse coupons by category
/help - Show this help message

**How Recommendations Work:**
🧠 Our AI analyzes your preferences, shopping history, and behavior to suggest the most relevant coupons for you.

**Categories Available:**
📱 Electronics - Smartphones, laptops, gadgets
👗 Fashion - Clothing, shoes, accessories  
💄 Beauty - Cosmetics, skincare, personal care
🍔 Food - Restaurant deals, grocery offers
🏠 Home - Furniture, appliances, decor
✈️ Travel - Flights, hotels, vacation packages

**Tips for Better Recommendations:**
• Set up your profile with preferred categories
• Provide feedback on recommendations (👍/👎)
• Use the bot regularly to improve AI learning

Need help? Just type your question and I'll assist you! 😊
    `;

    await this.bot.sendMessage(chatId, helpMessage, {
      parse_mode: 'Markdown'
    });
  }

  async handleRecommendations(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // Get user preferences
    const user = this.users.get(userId) || {
      preferences: { categories: ['Electronics', 'Fashion'], stores: [], discount_threshold: 20 }
    };

    await this.bot.sendMessage(chatId, '🔍 Analyzing your preferences and generating personalized recommendations...');

    // Simulate AI processing delay
    setTimeout(async () => {
      const recommendations = this.generatePersonalizedRecommendations(user);
      
      const recommendationMessage = `
🎯 **Your Personalized Recommendations**

Based on your preferences and shopping behavior, here are the top deals for you:
      `;

      await this.bot.sendMessage(chatId, recommendationMessage, { parse_mode: 'Markdown' });

      // Send each recommendation as a separate message with inline keyboard
      for (let i = 0; i < Math.min(3, recommendations.length); i++) {
        const coupon = recommendations[i];
        await this.sendCouponRecommendation(chatId, coupon, i + 1);
      }

      // Send feedback request
      const feedbackKeyboard = {
        inline_keyboard: [
          [
            { text: '👍 Great recommendations!', callback_data: 'feedback_positive' },
            { text: '👎 Not relevant', callback_data: 'feedback_negative' }
          ],
          [
            { text: '🔄 Get more recommendations', callback_data: 'get_more_recommendations' }
          ]
        ]
      };

      await this.bot.sendMessage(chatId, 
        '💬 How were these recommendations? Your feedback helps improve our AI!', 
        { reply_markup: feedbackKeyboard }
      );

    }, 2000);
  }

  async sendCouponRecommendation(chatId, coupon, rank) {
    const couponMessage = `
🏆 **Recommendation #${rank}**

${coupon.title}

💰 **Discount:** ${coupon.discount}
🏪 **Store:** ${coupon.store}
⏰ **Expires:** ${coupon.expiry}
🎫 **Code:** \`${coupon.code}\`

📝 ${coupon.description}

🎯 **Why this is perfect for you:**
• Matches your interest in ${coupon.category}
• High-value discount (${coupon.discount})
• Popular among users like you
• Limited time offer!
    `;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🛒 Get This Deal', url: coupon.link },
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

  generatePersonalizedRecommendations(user) {
    // Simple recommendation algorithm for demo
    const userCategories = user.preferences.categories.length > 0 ? 
      user.preferences.categories : ['Electronics', 'Fashion'];
    
    // Filter and score coupons based on user preferences
    const scoredCoupons = this.demoCoupons.map(coupon => {
      let score = 0;
      
      // Category match
      if (userCategories.includes(coupon.category)) {
        score += 0.5;
      }
      
      // Discount value
      const discountValue = parseInt(coupon.discount.replace(/\D/g, '')) || 0;
      if (discountValue >= user.preferences.discount_threshold) {
        score += 0.3;
      }
      
      // Random personalization factor
      score += Math.random() * 0.2;
      
      return { ...coupon, score };
    });

    // Sort by score and return top recommendations
    return scoredCoupons.sort((a, b) => b.score - a.score);
  }

  async handleProfile(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    const profileMessage = `
⚙️ **Setup Your Profile**

Help us personalize your coupon recommendations by setting your preferences:
    `;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '📱 Electronics', callback_data: 'pref_electronics' },
          { text: '👗 Fashion', callback_data: 'pref_fashion' }
        ],
        [
          { text: '💄 Beauty', callback_data: 'pref_beauty' },
          { text: '🍔 Food', callback_data: 'pref_food' }
        ],
        [
          { text: '🏠 Home & Living', callback_data: 'pref_home' },
          { text: '✈️ Travel', callback_data: 'pref_travel' }
        ],
        [
          { text: '💰 Set Discount Threshold', callback_data: 'set_discount_threshold' }
        ],
        [
          { text: '✅ Save Profile', callback_data: 'save_profile' }
        ]
      ]
    };

    await this.bot.sendMessage(chatId, profileMessage, {
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
  }

  async handleCategories(msg) {
    const chatId = msg.chat.id;

    const categoriesMessage = `
📂 **Browse Coupons by Category**

Choose a category to see the latest deals:
    `;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '📱 Electronics (15 deals)', callback_data: 'browse_electronics' },
          { text: '👗 Fashion (23 deals)', callback_data: 'browse_fashion' }
        ],
        [
          { text: '💄 Beauty (12 deals)', callback_data: 'browse_beauty' },
          { text: '🍔 Food (18 deals)', callback_data: 'browse_food' }
        ],
        [
          { text: '🏠 Home (9 deals)', callback_data: 'browse_home' },
          { text: '✈️ Travel (7 deals)', callback_data: 'browse_travel' }
        ],
        [
          { text: '🔥 Trending Now', callback_data: 'browse_trending' }
        ]
      ]
    };

    await this.bot.sendMessage(chatId, categoriesMessage, {
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
  }

  async handleCallbackQuery(callbackQuery) {
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id;
    const data = callbackQuery.data;

    // Answer the callback query to remove loading state
    await this.bot.answerCallbackQuery(callbackQuery.id);

    switch (data) {
      case 'get_recommendations':
        await this.handleRecommendations({ chat: { id: chatId }, from: { id: userId } });
        break;

      case 'setup_profile':
        await this.handleProfile({ chat: { id: chatId }, from: { id: userId } });
        break;

      case 'feedback_positive':
        await this.bot.sendMessage(chatId, '🎉 Thank you! Your feedback helps improve our recommendations. Keep using bazaarGuru for better deals!');
        break;

      case 'feedback_negative':
        await this.bot.sendMessage(chatId, '📝 Thanks for the feedback! We\'ll work on improving our recommendations. Try setting up your profile for better results.');
        break;

      case 'get_more_recommendations':
        await this.handleRecommendations({ chat: { id: chatId }, from: { id: userId } });
        break;

      default:
        if (data.startsWith('category_')) {
          const category = data.replace('category_', '');
          await this.showCategoryDeals(chatId, category);
        } else if (data.startsWith('copy_code_')) {
          const couponId = data.replace('copy_code_', '');
          const coupon = this.demoCoupons.find(c => c.id === couponId);
          if (coupon) {
            await this.bot.sendMessage(chatId, `📋 Coupon code copied: \`${coupon.code}\`\n\nTap to copy and use at checkout!`, { parse_mode: 'Markdown' });
          }
        } else if (data.startsWith('save_coupon_')) {
          await this.bot.sendMessage(chatId, '❤️ Coupon saved to your favorites! Access it anytime from your profile.');
        } else if (data.startsWith('share_coupon_')) {
          await this.bot.sendMessage(chatId, '📤 Share this amazing deal with your friends and family to help them save money too!');
        }
        break;
    }
  }

  async showCategoryDeals(chatId, category) {
    const categoryDeals = this.demoCoupons.filter(coupon => 
      coupon.category.toLowerCase() === category.toLowerCase()
    );

    if (categoryDeals.length > 0) {
      await this.bot.sendMessage(chatId, `🎯 **${category.charAt(0).toUpperCase() + category.slice(1)} Deals**\n\nHere are the best ${category.toLowerCase()} deals for you:`, { parse_mode: 'Markdown' });
      
      for (const coupon of categoryDeals) {
        await this.sendCouponRecommendation(chatId, coupon, categoryDeals.indexOf(coupon) + 1);
      }
    } else {
      await this.bot.sendMessage(chatId, `😔 No ${category} deals available right now. Check back soon for new offers!`);
    }
  }

  start() {
    console.log('🚀 Starting bazaarGuru Telegram Bot...'.green.bold);
    console.log(`📱 Bot Username: @bazaarGuru_deals_bot`.cyan);
    console.log(`🔑 Token: ${token.substring(0, 10)}...`.gray);
    console.log('✅ Bot is ready to receive messages!'.green);
    
    // Keep the process running
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down bot...'.yellow);
      this.bot.stopPolling();
      process.exit(0);
    });
  }
}

// Start the bot if run directly
if (require.main === module) {
  const bazaarGuruBot = new bazaarGuruTelegramBot();
  bazaarGuruBot.start();
}

module.exports = bazaarGuruTelegramBot;
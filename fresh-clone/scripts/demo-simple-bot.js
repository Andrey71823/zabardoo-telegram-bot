#!/usr/bin/env node

const TelegramBot = require('node-telegram-bot-api');
const colors = require('colors');

// Telegram bot token
const token = '7315076864:AAGZ5N4dwhUrSw2tygw4wiCPY74cROKWzsE';

class SimpleZabardooBot {
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
        expiry: '7 days left'
      },
      {
        id: 'coupon-2',
        title: '💄 Nykaa Beauty - Buy 2 Get 1 Free',
        category: 'Beauty',
        store: 'Nykaa',
        discount: 'Buy 2 Get 1 Free',
        code: 'BEAUTY2GET1',
        expiry: '10 days left'
      },
      {
        id: 'coupon-3',
        title: '👗 Myntra Fashion - 70% OFF',
        category: 'Fashion',
        store: 'Myntra',
        discount: '70% OFF',
        code: 'EORS70',
        expiry: '3 days left'
      }
    ];

    this.setupBotHandlers();
  }

  setupBotHandlers() {
    // Start command
    this.bot.onText(/\/start/, (msg) => {
      this.handleStart(msg);
    });

    // Recommendations command
    this.bot.onText(/\/recommend/, (msg) => {
      this.handleRecommendations(msg);
    });

    // Help command
    this.bot.onText(/\/help/, (msg) => {
      this.handleHelp(msg);
    });

    // Callback query handler
    this.bot.on('callback_query', (callbackQuery) => {
      this.handleCallbackQuery(callbackQuery);
    });

    console.log('🤖 Simple Zabardoo Bot is running...'.green.bold);
    console.log('Try sending /start to the bot!'.yellow);
  }

  async handleStart(msg) {
    const chatId = msg.chat.id;
    const userName = msg.from.first_name || 'User';

    const welcomeMessage = `🎉 Welcome to Zabardoo, ${userName}!

I'm your AI-powered coupon assistant for India!

What I can do:
• Find personalized coupon recommendations
• Track best deals from top Indian stores
• Help you save money on Electronics, Fashion, Beauty & more

Commands:
/recommend - Get personalized recommendations
/help - Show help

Let's start saving money together! 💸`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🎯 Get Recommendations', callback_data: 'get_recommendations' }
        ],
        [
          { text: '📱 Electronics', callback_data: 'category_electronics' },
          { text: '👗 Fashion', callback_data: 'category_fashion' }
        ],
        [
          { text: '💄 Beauty', callback_data: 'category_beauty' }
        ]
      ]
    };

    await this.bot.sendMessage(chatId, welcomeMessage, {
      reply_markup: keyboard
    });

    console.log(`New user started: ${userName}`.cyan);
  }

  async handleRecommendations(msg) {
    const chatId = msg.chat.id;

    await this.bot.sendMessage(chatId, '🔍 Generating personalized recommendations...');

    // Simulate AI processing
    setTimeout(async () => {
      const recommendations = this.demoCoupons.slice(0, 2);
      
      await this.bot.sendMessage(chatId, '🎯 Your Personalized Recommendations:');

      for (let i = 0; i < recommendations.length; i++) {
        const coupon = recommendations[i];
        await this.sendCouponRecommendation(chatId, coupon, i + 1);
      }

      const feedbackKeyboard = {
        inline_keyboard: [
          [
            { text: '👍 Great!', callback_data: 'feedback_positive' },
            { text: '👎 Not relevant', callback_data: 'feedback_negative' }
          ]
        ]
      };

      await this.bot.sendMessage(chatId, 
        'How were these recommendations?', 
        { reply_markup: feedbackKeyboard }
      );

    }, 2000);
  }

  async sendCouponRecommendation(chatId, coupon, rank) {
    const couponMessage = `🏆 Recommendation #${rank}

${coupon.title}

💰 Discount: ${coupon.discount}
🏪 Store: ${coupon.store}
⏰ Expires: ${coupon.expiry}
🎫 Code: ${coupon.code}

Why perfect for you:
• Matches your interests
• High-value discount
• Popular deal
• Limited time!`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🛒 Get Deal', url: 'https://zabardoo.com' },
          { text: '📋 Copy Code', callback_data: `copy_${coupon.id}` }
        ]
      ]
    };

    await this.bot.sendMessage(chatId, couponMessage, {
      reply_markup: keyboard
    });
  }

  async handleHelp(msg) {
    const chatId = msg.chat.id;

    const helpMessage = `🤖 Zabardoo Bot Help

Commands:
/start - Welcome message and main menu
/recommend - Get AI-powered recommendations
/help - Show this help

How it works:
🧠 Our AI analyzes your preferences to suggest the most relevant coupons

Categories:
📱 Electronics - Smartphones, laptops
👗 Fashion - Clothing, accessories  
💄 Beauty - Cosmetics, skincare

Just type your question and I'll help! 😊`;

    await this.bot.sendMessage(chatId, helpMessage);
  }

  async handleCallbackQuery(callbackQuery) {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    await this.bot.answerCallbackQuery(callbackQuery.id);

    switch (data) {
      case 'get_recommendations':
        await this.handleRecommendations({ chat: { id: chatId } });
        break;

      case 'feedback_positive':
        await this.bot.sendMessage(chatId, '🎉 Thank you! Your feedback helps improve our AI!');
        break;

      case 'feedback_negative':
        await this.bot.sendMessage(chatId, '📝 Thanks! We will improve our recommendations.');
        break;

      default:
        if (data.startsWith('category_')) {
          const category = data.replace('category_', '');
          await this.showCategoryDeals(chatId, category);
        } else if (data.startsWith('copy_')) {
          const couponId = data.replace('copy_', '');
          const coupon = this.demoCoupons.find(c => c.id === couponId);
          if (coupon) {
            await this.bot.sendMessage(chatId, `📋 Code copied: ${coupon.code}`);
          }
        }
        break;
    }
  }

  async showCategoryDeals(chatId, category) {
    const categoryDeals = this.demoCoupons.filter(coupon => 
      coupon.category.toLowerCase() === category.toLowerCase()
    );

    if (categoryDeals.length > 0) {
      await this.bot.sendMessage(chatId, `🎯 ${category} Deals:`);
      
      for (const coupon of categoryDeals) {
        await this.sendCouponRecommendation(chatId, coupon, categoryDeals.indexOf(coupon) + 1);
      }
    } else {
      await this.bot.sendMessage(chatId, `😔 No ${category} deals right now. Check back soon!`);
    }
  }

  start() {
    console.log('🚀 Starting Simple Zabardoo Bot...'.green.bold);
    console.log('✅ Bot is ready!'.green);
    
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down bot...'.yellow);
      this.bot.stopPolling();
      process.exit(0);
    });
  }
}

// Start the bot
if (require.main === module) {
  const bot = new SimpleZabardooBot();
  bot.start();
}

module.exports = SimpleZabardooBot;
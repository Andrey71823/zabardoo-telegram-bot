#!/usr/bin/env node

// Working Bot - EXACT menu from screenshot + English persistent menu
const https = require('https');
const querystring = require('querystring');

class WorkingBot {
  constructor(token) {
    this.token = token;
    this.baseUrl = `https://api.telegram.org/bot${token}`;
    this.offset = 0;
    this.isRunning = false;
    this.users = new Map();
  }

  async makeRequest(method, params = {}) {
    return new Promise((resolve, reject) => {
      const postData = querystring.stringify(params);
      
      const options = {
        hostname: 'api.telegram.org',
        port: 443,
        path: `/bot${this.token}/${method}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            if (result.ok) {
              resolve(result.result);
            } else {
              reject(new Error(result.description || 'API Error'));
            }
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }

  async sendMessage(chatId, text, replyMarkup = null) {
    const params = {
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML'
    };
    
    if (replyMarkup) {
      params.reply_markup = JSON.stringify(replyMarkup);
    }
    
    return this.makeRequest('sendMessage', params);
  }  // EXACT 
FIXED MENU from screenshot
  getFixedInlineKeyboard() {
    return {
      inline_keyboard: [
        [
          { text: '🤖 AI Recomme...', callback_data: 'ai_recommendations' },
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
          { text: '🎮 My Profile', callback_data: 'profile' }
        ],
        [
          { text: '💰 Cashback', callback_data: 'cashback' },
          { text: '🆘 Help', callback_data: 'help' }
        ]
      ]
    };
  }

  async start() {
    console.log('🚀 Starting Working Bot...');
    
    // Set English commands for persistent menu
    await this.setEnglishCommands();
    
    this.isRunning = true;
    console.log('✅ Bot started with EXACT menu from screenshot!');
    console.log('📱 Fixed inline menu restored!');
    console.log('🔧 English persistent menu set!');
    
    this.pollUpdates();
  }

  async setEnglishCommands() {
    try {
      const commands = [
        { command: 'start', description: '🚀 Start bot and show main menu' },
        { command: 'deals', description: '🔍 Find best deals and discounts' },
        { command: 'profile', description: '🎮 My profile and achievements' },
        { command: 'cashback', description: '💰 My cashback and balance' },
        { command: 'help', description: '🆘 Show help and support' }
      ];

      await this.makeRequest('setMyCommands', { commands: JSON.stringify(commands) });
      console.log('✅ English commands set for persistent menu');
    } catch (error) {
      console.error('❌ Failed to set commands:', error.message);
    }
  }  a
sync pollUpdates() {
    while (this.isRunning) {
      try {
        const updates = await this.makeRequest('getUpdates', {
          offset: this.offset,
          timeout: 30
        });

        for (const update of updates) {
          this.offset = update.update_id + 1;
          await this.handleUpdate(update);
        }
      } catch (error) {
        console.error('❌ Error polling updates:', error.message);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  async handleUpdate(update) {
    if (update.message) {
      await this.handleMessage(update.message);
    } else if (update.callback_query) {
      await this.handleCallbackQuery(update.callback_query);
    }
  }

  async handleMessage(message) {
    const chatId = message.chat.id;
    const text = message.text;
    const user = message.from;

    if (!user) return;

    // Initialize user
    if (!this.users.has(user.id)) {
      this.users.set(user.id, {
        id: user.id,
        username: user.username,
        firstName: user.first_name,
        totalSavings: Math.floor(Math.random() * 50000) + 10000,
        joinedAt: new Date()
      });
    }

    // Handle start command
    if (text === '/start') {
      await this.handleStart(message);
    } else {
      // Handle other messages with fixed menu
      await this.handleOtherMessage(message);
    }
  }

  async handleStart(message) {
    const chatId = message.chat.id;
    const userName = message.from.first_name || 'Andre_web';
    
    // EXACT message from screenshot
    const welcomeMessage = `🔍 <b>Top Deals for ${userName}!</b>

🎯 <b>Hot Deals Right Now:</b>
📱 Samsung Galaxy S24 - 28% OFF (₹52,000)
👟 Nike Air Max - 35% OFF (₹5,200)
💻 MacBook Air M3 - 15% OFF (₹85,000)
👗 Zara Dress Collection - 40% OFF
🎧 Sony WH-1000XM5 - 25% OFF (₹22,500)

💰 All with cashback up to 8%!
🎁 +5 XP for browsing deals!

🎤📸 <b>SMART SEARCH:</b> Send voice message or photo for personalized results!

Choose a category below for more specific deals:`;

    await this.sendMessage(chatId, welcomeMessage, this.getFixedInlineKeyboard());
    console.log(`✅ User ${userName} started - sent EXACT menu from screenshot`);
  }  async han
dleCallbackQuery(callbackQuery) {
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;
    const data = callbackQuery.data;

    let responseText = `🤖 <b>${data.replace('_', ' ').toUpperCase()}</b>

This feature is working! You clicked: ${data}

🎁 +5 XP for exploring features!

Use the fixed menu below to continue exploring:`;

    // Edit message with fixed menu
    try {
      await this.makeRequest('editMessageText', {
        chat_id: chatId,
        message_id: messageId,
        text: responseText,
        parse_mode: 'HTML',
        reply_markup: JSON.stringify(this.getFixedInlineKeyboard())
      });
    } catch (error) {
      await this.sendMessage(chatId, responseText, this.getFixedInlineKeyboard());
    }

    // Answer callback query
    try {
      await this.makeRequest('answerCallbackQuery', {
        callback_query_id: callbackQuery.id
      });
    } catch (error) {
      console.error('Error answering callback query:', error.message);
    }
  }

  async handleOtherMessage(message) {
    const chatId = message.chat.id;
    
    const responseText = `💬 <b>Message Received!</b>

You sent: "${message.text}"

🎁 +2 XP for interaction!

Use the fixed menu below:`;

    await this.sendMessage(chatId, responseText, this.getFixedInlineKeyboard());
  }

  stop() {
    console.log('🛑 Stopping bot...');
    this.isRunning = false;
  }
}

// Start the bot
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('❌ Please set TELEGRAM_BOT_TOKEN environment variable');
  process.exit(1);
}

const bot = new WorkingBot(token);
bot.start().catch(console.error);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  bot.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  bot.stop();
  process.exit(0);
});
#!/usr/bin/env node

// English Telegram Bot with Complete Guide and Command Menu
const https = require('https');
const querystring = require('querystring');

class EnglishGuideTelegramBot {
  constructor(token) {
    this.token = token;
    this.baseUrl = `https://api.telegram.org/bot${token}`;
    this.offset = 0;
    this.isRunning = false;
    this.users = new Map();
    this.lastMessageIds = new Map();
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
  }  async edi
tMessage(chatId, messageId, text, replyMarkup = null) {
    const params = {
      chat_id: chatId,
      message_id: messageId,
      text: text,
      parse_mode: 'HTML'
    };
    
    if (replyMarkup) {
      params.reply_markup = JSON.stringify(replyMarkup);
    }
    
    try {
      return await this.makeRequest('editMessageText', params);
    } catch (error) {
      return this.sendMessage(chatId, text, replyMarkup);
    }
  }

  async setMyCommands() {
    const commands = [
      { command: 'start', description: '🚀 Start bot and show main menu' },
      { command: 'help', description: '🆘 Show help and support information' },
      { command: 'guide', description: '📖 Complete guide for all buttons and functions' },
      { command: 'profile', description: '👤 My profile, level and achievements' },
      { command: 'settings', description: '⚙️ Notification settings' },
      { command: 'cashback', description: '💰 My cashback and balance' },
      { command: 'deals', description: '🔍 Find best deals and discounts' },
      { command: 'feedback', description: '💌 Send feedback or suggestion to admin' },
      { command: 'menu', description: '📋 Show command menu' }
    ];

    try {
      await this.makeRequest('setMyCommands', { commands: JSON.stringify(commands) });
      console.log('✅ Bot commands set successfully');
    } catch (error) {
      console.log('⚠️ Failed to set commands:', error.message);
    }
  }

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
  }  asyn
c handleStart(message) {
    const chatId = message.chat.id;
    const userName = message.from.first_name || 'Friend';
    
    const welcomeMessage = `🎉 Welcome to bazaarGuru Enhanced Bot, ${userName}! 🌟

🚀 I'm your AI-powered deal discovery assistant!

🎯 What I can do for you:
🎤 Voice Search - Send me a voice message!
📸 Image Recognition - Send me a product photo!
🎮 Gamification - Earn XP and unlock achievements!
🔔 Smart Notifications - Get personalized deal alerts!
💰 Cashback Tracking - Track your savings!

💎 Level 1 • ⚡ 0 XP • 🏆 0/50 Achievements

🎮 Today's Mission: Find your first amazing deal!

Ready to save some serious money? Let's go! 🚀

💡 Tip: Click 📖 Guide button for complete instructions on all buttons!`;

    const sentMessage = await this.sendMessage(chatId, welcomeMessage, this.getMainKeyboard());
    this.lastMessageIds.set(chatId, sentMessage.message_id);
  }

  async handleCompleteGuide(message) {
    const chatId = message.chat.id;
    
    const guideMessage = `📖 <b>COMPLETE GUIDE - What Each Button Does</b>

🔍 <b>FIND DEALS</b>
   ✅ What it does: Shows the best deals available
   ✅ How it works: Updates every minute with fresh offers
   ✅ What you get: Up to 80% discounts + cashback
   ✅ Where it leads: Direct links to stores

🎮 <b>MY PROFILE</b>
   ✅ What it shows: Your level and experience points
   ✅ Achievements: How many rewards you've earned
   ✅ Statistics: How many days you've been active
   ✅ Savings: Total money you've saved

💰 <b>CASHBACK</b>
   ✅ Balance: How much money you can withdraw
   ✅ Pending: How much more is coming
   ✅ History: All your purchase transactions
   ✅ Withdrawal: Via UPI, PayTM, bank transfer

📖 <b>GUIDE (This Guide)</b>
   ✅ Explains ALL buttons in simple words
   ✅ Shows what each function does
   ✅ Gives tips on how to save more money
   ✅ Helps you never get confused

⚙️ <b>SETTINGS</b>
   🔔 <b>Toggle Price Drops</b> - Turn on/off price drop notifications
   ⚡ <b>Toggle Flash Sales</b> - Turn on/off flash sale alerts  
   ⏰ <b>Set Quiet Hours</b> - Set time when NOT to disturb you
   🛑 <b>Pause All (2h)</b> - Turn OFF ALL notifications for 2 hours

🆘 <b>HELP</b>
   ✅ Quick help for main functions
   ✅ List of all bot commands
   ✅ How to contact support

🤖 <b>AI RECOMMENDATIONS</b>
   ✅ Personal offers ONLY for you
   ✅ Based on your purchases and interests
   ✅ Smart suggestions on what to buy cheaper

🔥 <b>HOT DEALS</b>
   ✅ Most popular deals RIGHT NOW
   ✅ Limited time offers
   ✅ Best discounts ending soon

📱 <b>ELECTRONICS</b> - Phones, laptops, headphones
👗 <b>FASHION</b> - Clothes, shoes, accessories  
💄 <b>BEAUTY</b> - Cosmetics, perfume, skincare
🍔 <b>FOOD</b> - Restaurants, food delivery
🏪 <b>STORES</b> - All stores and their discounts

💡 <b>SECRET TIPS:</b>
🎤 Send voice message - finds better deals!
📸 Take product photo - shows where it's cheaper!
🏆 Visit daily - get more rewards!
🔔 Enable notifications - don't miss deals!
👥 Invite friends - get bonus cashback!

🎯 <b>GOLDEN RULE:</b> The more you use the bot, the more money you save! 💰`;

    const sentMessage = await this.sendMessage(chatId, guideMessage, this.getMainKeyboard());
    this.lastMessageIds.set(chatId, sentMessage.message_id);
  }
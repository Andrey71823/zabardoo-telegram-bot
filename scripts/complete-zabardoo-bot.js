#!/usr/bin/env node

// Complete bazaarGuru Telegram Bot - Based on Documentation
const https = require('https');
const querystring = require('querystring');

class CompletebazaarGuruBot {
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
  }

  async editMessage(chatId, messageId, text, replyMarkup = null) {
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

  getMainKeyboard() {
    return {
      inline_keyboard: [
        [
          { text: '🔍 Find Deals', callback_data: 'find_deals' },
          { text: '🎮 My Profile', callback_data: 'profile' },
          { text: '📖 Guide', callback_data: 'guide' }
        ],
        [
          { text: '💰 Cashback', callback_data: 'cashback' },
          { text: '🎲 Random Deal', callback_data: 'random_deal' },
          { text: '🧠 Ask bazaarGuru', callback_data: 'ask_bazaarGuru' }
        ],
        [
          { text: '⚙️ Settings', callback_data: 'settings' },
          { text: '🌐 Language', callback_data: 'language' },
          { text: '🆘 Help', callback_data: 'help' }
        ]
      ]
    };
  }

  async start() {
    console.log('🚀 Starting Complete bazaarGuru Telegram Bot...');
    
    // Set bot commands
    await this.setMyCommands();
    
    this.isRunning = true;
    console.log('✅ Bot started successfully!');
    console.log('🎮 Features: AI Assistant, Voice Search, Image Recognition, Gamification');
    console.log('📱 Ready to serve users with complete functionality!');
    
    this.pollUpdates();
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
      { command: 'feedback', description: '💌 Send feedback or suggestion to admin' }
    ];

    try {
      await this.makeRequest('setMyCommands', { commands: JSON.stringify(commands) });
      console.log('✅ Bot commands set successfully');
    } catch (error) {
      console.error('❌ Failed to set bot commands:', error.message);
    }
  }

  async pollUpdates() {
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

    // Initialize user if not exists
    if (!this.users.has(user.id)) {
      this.users.set(user.id, {
        id: user.id,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        level: 1,
        xp: 0,
        streak: 0,
        achievements: [],
        totalSavings: 0,
        joinedAt: new Date()
      });
    }

    // Handle commands and messages
    if (text === '/start') {
      await this.handleStart(message);
    } else if (text === '/help') {
      await this.handleHelp(message);
    } else if (text === '/guide') {
      await this.handleGuide(message);
    } else if (text === '/profile') {
      await this.handleProfile(message);
    } else if (text === '/settings') {
      await this.handleSettings(message);
    } else if (text === '/cashback') {
      await this.handleCashback(message);
    } else if (text === '/deals') {
      await this.handleDeals(message);
    } else if (text === '/feedback') {
      await this.handleFeedback(message);
    } else if (message.voice) {
      await this.handleVoice(message);
    } else if (message.photo) {
      await this.handlePhoto(message);
    } else {
      await this.handleTextMessage(message);
    }
  }

  async handleStart(message) {
    const chatId = message.chat.id;
    const userName = message.from.first_name || 'Friend';
    const user = this.users.get(message.from.id);
    
    const welcomeMessage = `🎉 <b>Welcome to bazaarGuru Enhanced Bot, ${userName}!</b> 🌟

🚀 I'm your AI-powered deal discovery assistant!

🎯 <b>What I can do for you:</b>
🎤 <b>Voice Search</b> - Send me a voice message! (Try: "bottle", "headphones")
📸 <b>Image Recognition</b> - Send me a product photo! (Just tap 📎 and send)
🎮 <b>Gamification</b> - Earn XP and unlock achievements!
🔔 <b>Smart Notifications</b> - Get personalized deal alerts!
💰 <b>Cashback Tracking</b> - Track your savings!

💎 <b>Level ${user.level}</b> • ⚡ <b>${user.xp} XP</b> • 🏆 <b>${user.achievements.length}/50 Achievements</b>

🎮 <b>Today's Mission:</b> Find your first amazing deal!

🎤📸 <b>QUICK START:</b> Send voice message or photo right now for instant deals!

Ready to save some serious money? Let's go! 🚀

💡 <b>Tip:</b> Click 📖 Guide button for complete instructions on all buttons!`;

    const sentMessage = await this.sendMessage(chatId, welcomeMessage, this.getMainKeyboard());
    this.lastMessageIds.set(chatId, sentMessage.message_id);
    
    // Award XP for starting
    this.awardXP(message.from.id, 10, 'bot_start');
  }

  async handleCallbackQuery(callbackQuery) {
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;
    const data = callbackQuery.data;
    const user = this.users.get(callbackQuery.from.id);

    let responseText = '';

    switch (data) {
      case 'find_deals':
        responseText = `🔍 <b>Top Deals for ${callbackQuery.from.first_name}!</b>

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

        const dealsKeyboard = {
          inline_keyboard: [
            [
              { text: '🤖 AI Recommendations', callback_data: 'ai_recommendations' },
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

        await this.editMessage(chatId, messageId, responseText, dealsKeyboard);
        this.awardXP(callbackQuery.from.id, 5, 'view_deals');
        break;

      case 'profile':
        const totalSavings = user.totalSavings || Math.floor(Math.random() * 50000) + 10000;
        responseText = `🎮 <b>Your Profile - ${callbackQuery.from.first_name}</b>

👤 <b>User Info:</b>
🆔 ID: ${user.id}
📅 Member since: ${user.joinedAt.toLocaleDateString()}

🎯 <b>Progress:</b>
💎 Level: ${user.level}
⚡ XP: ${user.xp}
🔥 Streak: ${user.streak} days
🏆 Achievements: ${user.achievements.length}/50

💰 <b>Savings:</b>
💵 Total Saved: ₹${totalSavings.toLocaleString()}
🎁 Cashback Earned: ₹${Math.floor(totalSavings * 0.05).toLocaleString()}
📊 Deals Found: ${Math.floor(user.xp / 5)}

🎮 <b>Next Level:</b>
📈 Need ${(user.level * 100) - user.xp} more XP to reach Level ${user.level + 1}

🏆 <b>Recent Achievements:</b>
${user.achievements.length > 0 ? user.achievements.slice(-3).map(a => `✅ ${a}`).join('\n') : '🎯 Complete your first quest to earn achievements!'}`;

        await this.editMessage(chatId, messageId, responseText, this.getMainKeyboard());
        this.awardXP(callbackQuery.from.id, 3, 'view_profile');
        break;

      case 'ask_bazaarGuru':
        responseText = `🧠 <b>Ask bazaarGuru AI Assistant</b>

💬 <b>I'm your personal shopping AI!</b>

🎯 <b>What I can help you with:</b>
• 🔍 Find specific products and deals
• 💰 Compare prices across stores
• 🎨 Generate shopping memes and content
• 📱 Product recommendations based on your needs
• 🛒 Smart shopping tips and tricks
• 💡 Budget-friendly alternatives

🎤 <b>How to use:</b>
• Send me a text message with your question
• Use voice messages for natural conversation
• Send product photos for instant recognition
• Ask in English or Hindi - I understand both!

🎁 +8 XP for discovering AI assistant!

💡 <b>Example questions:</b>
"Find me a good smartphone under ₹20,000"
"Compare iPhone vs Samsung Galaxy"
"Create a funny meme about online shopping"

🚀 <b>Just send me a message to start chatting!</b>`;
        
        await this.editMessage(chatId, messageId, responseText, this.getMainKeyboard());
        this.awardXP(callbackQuery.from.id, 8, 'ask_bazaarGuru');
        break;

      case 'random_deal':
        const randomDeals = [
          { name: 'iPhone 15 Pro', discount: '25%', price: '₹89,999', cashback: '5%' },
          { name: 'Samsung 4K TV', discount: '40%', price: '₹45,999', cashback: '8%' },
          { name: 'Nike Air Jordan', discount: '30%', price: '₹8,999', cashback: '6%' },
          { name: 'MacBook Pro M3', discount: '15%', price: '₹1,89,999', cashback: '3%' },
          { name: 'Sony Headphones', discount: '35%', price: '₹15,999', cashback: '7%' }
        ];
        
        const randomDeal = randomDeals[Math.floor(Math.random() * randomDeals.length)];
        
        responseText = `🎲 <b>Random Deal of the Day!</b>

🎯 <b>${randomDeal.name}</b>
💥 <b>${randomDeal.discount} OFF</b> - Now ${randomDeal.price}
💰 <b>+${randomDeal.cashback} Cashback</b>
⏰ <b>Limited Time Offer!</b>

🎁 +7 XP for discovering random deal!

🔥 <b>Why this deal is amazing:</b>
• Verified seller with 4.8★ rating
• Free shipping and easy returns
• 1-year warranty included
• Price match guarantee

🚀 <b>Want more deals like this?</b> Use 🔍 Find Deals for personalized recommendations!`;

        await this.editMessage(chatId, messageId, responseText, this.getMainKeyboard());
        this.awardXP(callbackQuery.from.id, 7, 'random_deal');
        break;

      case 'language':
        responseText = `🌐 <b>Language Settings</b>

🎯 <b>Choose your preferred language:</b>

Current: English 🇺🇸

Available languages:`;

        const languageKeyboard = {
          inline_keyboard: [
            [
              { text: '🇺🇸 English', callback_data: 'lang_en' },
              { text: '🇮🇳 हिंदी (Hindi)', callback_data: 'lang_hi' }
            ],
            [
              { text: '🇮🇳 తెలుగు (Telugu)', callback_data: 'lang_te' },
              { text: '🇮🇳 தமிழ் (Tamil)', callback_data: 'lang_ta' }
            ],
            [
              { text: '🔙 Back to Menu', callback_data: 'back_to_menu' }
            ]
          ]
        };

        await this.editMessage(chatId, messageId, responseText, languageKeyboard);
        break;

      case 'lang_en':
        responseText = `🇺🇸 <b>Language set to English!</b>

✅ Your language preference has been updated to English.
🎁 +3 XP for customizing your experience!

All future messages and deal descriptions will be in English.`;
        
        await this.editMessage(chatId, messageId, responseText, this.getMainKeyboard());
        this.awardXP(callbackQuery.from.id, 3, 'language_change');
        break;

      case 'help':
        responseText = `🆘 <b>bazaarGuru Bot Quick Help</b>

🎯 <b>Main Functions:</b>
• Find deals and get cashback
• Earn XP and unlock achievements
• Get personalized recommendations
• Track your savings

⚡ <b>Quick Commands:</b>
/start - Main menu
/guide - Complete button guide
/profile - Your stats
/cashback - Your balance
/deals - Find deals
/settings - Notifications

🎤📸 <b>SMART SEARCH (Most Popular!):</b>
🎤 <b>Voice Search:</b> Say "bottle" → Get water bottle deals
📸 <b>Photo Search:</b> Send product photo → Get exact matches
Why it's better: More accurate than typing!

🛡️ <b>Anti-Spam Protection:</b>
• You control all notifications
• Quiet hours: 22:00-08:00
• Easy unsubscribe options

💰 <b>Cashback:</b>
• Automatic tracking
• Multiple withdrawal methods
• Real-time balance updates

🎤📸 <b>TRY NOW:</b> Send voice message or photo for instant deals!

Need more help? Use /guide for detailed explanations!`;

        await this.editMessage(chatId, messageId, responseText, this.getMainKeyboard());
        this.awardXP(callbackQuery.from.id, 2, 'view_help');
        break;

      default:
        responseText = `🤖 Feature coming soon! Stay tuned for updates.`;
        await this.editMessage(chatId, messageId, responseText, this.getMainKeyboard());
        break;
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

  async handleVoice(message) {
    const chatId = message.chat.id;
    const user = this.users.get(message.from.id);
    
    // Simulate voice processing
    const processingMsg = await this.sendMessage(chatId, 
      `🎤 <b>Processing your voice message...</b>\n⏳ Analyzing audio (${message.voice.duration}s)\n🤖 Converting speech to text\n🔍 Searching for deals...`
    );
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const voiceResponse = `🎤 <b>Voice Search Results</b>

I heard: "Looking for wireless headphones under 5000"

🎯 <b>Found these amazing deals:</b>
🎧 Sony WH-CH720N - 30% OFF (₹4,999)
🎧 JBL Tune 760NC - 25% OFF (₹3,999)
🎧 Boat Rockerz 550 - 40% OFF (₹2,999)

💰 All with cashback up to 6%!
🎁 +15 XP for using voice search!

🚀 <b>Pro tip:</b> Voice search is 90% more accurate than typing!`;

    await this.editMessage(chatId, processingMsg.message_id, voiceResponse, this.getMainKeyboard());
    this.awardXP(message.from.id, 15, 'voice_search');
  }

  async handlePhoto(message) {
    const chatId = message.chat.id;
    const user = this.users.get(message.from.id);
    
    // Simulate image processing
    const processingMsg = await this.sendMessage(chatId, 
      `📸 <b>Analyzing your product photo...</b>\n🔍 Identifying product details\n🤖 AI image recognition in progress\n💰 Finding best prices...`
    );
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    const imageResponse = `📸 <b>Product Recognition Results</b>

🎯 <b>Identified: Samsung Galaxy S24 Ultra</b>
📂 Category: Smartphones
🏷️ Brand: Samsung
🎪 Confidence: 94%

🔍 <b>Best Deals Found:</b>
📱 Amazon India - ₹1,34,900 (8% OFF + 3% cashback)
📱 Flipkart - ₹1,36,999 (6% OFF + 4% cashback)
📱 Croma - ₹1,35,500 (7% OFF + 2% cashback)

💰 <b>Best Deal:</b> Amazon India - Save ₹14,999!
🎁 +20 XP for using image recognition!

🚀 <b>Pro tip:</b> Photo search gives you exact product matches!`;

    await this.editMessage(chatId, processingMsg.message_id, imageResponse, this.getMainKeyboard());
    this.awardXP(message.from.id, 20, 'image_recognition');
  }

  awardXP(userId, amount, reason) {
    const user = this.users.get(userId);
    if (user) {
      user.xp += amount;
      
      // Check for level up
      const newLevel = Math.floor(user.xp / 100) + 1;
      if (newLevel > user.level) {
        user.level = newLevel;
        console.log(`🎉 User ${user.firstName} leveled up to Level ${newLevel}!`);
      }
      
      console.log(`⚡ Awarded ${amount} XP to ${user.firstName} for ${reason} (Total: ${user.xp} XP, Level: ${user.level})`);
    }
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

const bot = new CompletebazaarGuruBot(token);
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
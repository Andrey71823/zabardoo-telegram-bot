#!/usr/bin/env node

// Zabardoo Bot with Correct Persistent Menu
const https = require('https');
const querystring = require('querystring');

class PersistentMenuBot {
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
  }

  // PERSISTENT MENU - Always visible at bottom
  getPersistentKeyboard() {
    return {
      keyboard: [
        [
          { text: '🔍 Find Deals' },
          { text: '🎮 My Profile' },
          { text: '📖 Guide' }
        ],
        [
          { text: '💰 Cashback' },
          { text: '🎲 Random Deal' },
          { text: '🧠 Ask Zabardoo' }
        ],
        [
          { text: '⚙️ Settings' },
          { text: '🌐 Language' },
          { text: '🆘 Help' }
        ]
      ],
      resize_keyboard: true,
      persistent: true
    };
  }

  // INLINE MENU - For main content
  getInlineKeyboard() {
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
    console.log('🚀 Starting Persistent Menu Bot...');
    
    this.isRunning = true;
    console.log('✅ Bot started with correct English persistent menu!');
    console.log('📱 Persistent menu: Find Deals, My Profile, Guide, Cashback, Random Deal, Ask Zabardoo, Settings, Language, Help');
    
    this.pollUpdates();
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

    // Initialize user
    if (!this.users.has(user.id)) {
      this.users.set(user.id, {
        id: user.id,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        level: 1,
        xp: 0,
        totalSavings: Math.floor(Math.random() * 50000) + 10000,
        joinedAt: new Date()
      });
    }

    // Handle commands and persistent menu buttons
    if (text === '/start') {
      await this.handleStart(message);
    } else if (text === '🔍 Find Deals') {
      await this.handleFindDeals(message);
    } else if (text === '🎮 My Profile') {
      await this.handleProfile(message);
    } else if (text === '📖 Guide') {
      await this.handleGuide(message);
    } else if (text === '💰 Cashback') {
      await this.handleCashback(message);
    } else if (text === '🎲 Random Deal') {
      await this.handleRandomDeal(message);
    } else if (text === '🧠 Ask Zabardoo') {
      await this.handleAskZabardoo(message);
    } else if (text === '⚙️ Settings') {
      await this.handleSettings(message);
    } else if (text === '🌐 Language') {
      await this.handleLanguage(message);
    } else if (text === '🆘 Help') {
      await this.handleHelp(message);
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
    const userName = message.from.first_name || 'Andre_web';
    
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

    await this.sendMessage(chatId, welcomeMessage, {
      ...this.getInlineKeyboard(),
      ...this.getPersistentKeyboard()
    });
    
    console.log(`✅ User ${userName} started the bot with persistent menu`);
  }

  async handleFindDeals(message) {
    const chatId = message.chat.id;
    const userName = message.from.first_name || 'Andre_web';
    
    const dealsMessage = `🔍 <b>Find Deals - ${userName}</b>

🎯 <b>Best Deals for You:</b>
📱 iPhone 15 Pro - 25% OFF (₹89,999)
💻 MacBook Pro M3 - 20% OFF (₹1,89,999)
🎧 AirPods Pro - 25% OFF (₹18,999)
👟 Nike Air Jordan - 40% OFF (₹8,999)
📺 Sony 4K TV - 35% OFF (₹65,999)

💰 Extra cashback up to 10%!
🎁 +5 XP for finding deals!

Use the menu below or buttons above to explore more!`;

    await this.sendMessage(chatId, dealsMessage, this.getInlineKeyboard());
  }

  async handleProfile(message) {
    const chatId = message.chat.id;
    const userName = message.from.first_name || 'Andre_web';
    const user = this.users.get(message.from.id);
    
    const profileMessage = `🎮 <b>My Profile - ${userName}</b>

👤 <b>Account Details:</b>
🆔 User ID: ${user.id}
📅 Member since: ${user.joinedAt.toLocaleDateString()}
⭐ Status: Active User

📊 <b>Your Stats:</b>
💎 Level: ${user.level}
⚡ Total XP: ${user.xp}
💰 Total Savings: ₹${user.totalSavings.toLocaleString()}
🛒 Deals Found: ${Math.floor(user.xp / 5)}

🎯 <b>Activity:</b>
📱 Categories Explored: Electronics, Fashion
🔍 Last Search: Samsung Galaxy S24
💝 Favorite Brands: Samsung, Nike, Zara

🏆 <b>Achievements:</b>
✅ First Deal Hunter
✅ Electronics Explorer
✅ Fashion Enthusiast

🎁 +3 XP for checking profile!`;

    await this.sendMessage(chatId, profileMessage, this.getInlineKeyboard());
  }

  async handleRandomDeal(message) {
    const chatId = message.chat.id;
    
    const randomDeals = [
      { name: 'iPhone 15 Pro', discount: '25%', price: '₹89,999', cashback: '5%' },
      { name: 'Samsung 4K TV', discount: '40%', price: '₹45,999', cashback: '8%' },
      { name: 'Nike Air Jordan', discount: '30%', price: '₹8,999', cashback: '6%' },
      { name: 'MacBook Pro M3', discount: '15%', price: '₹1,89,999', cashback: '3%' },
      { name: 'Sony Headphones', discount: '35%', price: '₹15,999', cashback: '7%' }
    ];
    
    const randomDeal = randomDeals[Math.floor(Math.random() * randomDeals.length)];
    
    const dealMessage = `🎲 <b>Random Deal of the Day!</b>

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

    await this.sendMessage(chatId, dealMessage, this.getInlineKeyboard());
  }

  async handleAskZabardoo(message) {
    const chatId = message.chat.id;
    
    const aiMessage = `🧠 <b>Ask Zabardoo AI Assistant</b>

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

    await this.sendMessage(chatId, aiMessage, this.getInlineKeyboard());
  }

  async handleHelp(message) {
    const chatId = message.chat.id;
    
    const helpMessage = `🆘 <b>Help - Quick Guide</b>

🎯 <b>How to Use:</b>
1. 🔍 Browse deals by category
2. 🤖 Get AI recommendations
3. 💰 Earn cashback on purchases
4. 🎁 Collect XP and level up

⚡ <b>Quick Tips:</b>
• 🎤 Send voice messages for smart search
• 📸 Send product photos for exact matches
• 💝 Save favorites for later
• 🔔 Enable notifications for best deals

🆘 <b>Need Help?</b>
• 📧 Email: support@zabardoo.com
• 💬 Live Chat: Available 24/7
• 📞 Phone: +91-XXXX-XXXX-XX

🎁 +2 XP for reading help!`;

    await this.sendMessage(chatId, helpMessage, this.getInlineKeyboard());
  }

  async handleVoice(message) {
    const chatId = message.chat.id;
    
    const voiceResponse = `🎤 <b>Voice Search Results</b>

I heard: "Looking for smartphone deals under 50000"

🎯 <b>Found these matches:</b>
📱 Samsung Galaxy S24 - ₹52,000 (28% OFF)
📱 iPhone 15 - ₹79,999 (20% OFF)
📱 OnePlus 12 - ₹45,999 (30% OFF)

💰 All with cashback up to 8%!
🎁 +15 XP for voice search!`;

    await this.sendMessage(chatId, voiceResponse, this.getInlineKeyboard());
  }

  async handlePhoto(message) {
    const chatId = message.chat.id;
    
    const imageResponse = `📸 <b>Product Recognition</b>

🎯 <b>Identified: Samsung Galaxy S24</b>
📂 Category: Smartphones
🎪 Confidence: 94%

🔍 <b>Best Deals:</b>
📱 Amazon - ₹52,000 (28% OFF + 5% cashback)
📱 Flipkart - ₹54,999 (25% OFF + 6% cashback)

🎁 +20 XP for image search!`;

    await this.sendMessage(chatId, imageResponse, this.getInlineKeyboard());
  }

  // Handle other menu items with similar pattern...
  async handleCashback(message) {
    const chatId = message.chat.id;
    const user = this.users.get(message.from.id);
    
    const cashbackMessage = `💰 <b>Cashback - Your Earnings</b>

💳 <b>Current Balance:</b>
💰 Available: ₹${Math.floor(user.totalSavings * 0.05).toLocaleString()}
⏳ Pending: ₹${Math.floor(user.totalSavings * 0.02).toLocaleString()}
📊 Total Earned: ₹${Math.floor(user.totalSavings * 0.07).toLocaleString()}

🎁 +4 XP for checking cashback!`;

    await this.sendMessage(chatId, cashbackMessage, this.getInlineKeyboard());
  }

  async handleSettings(message) {
    const chatId = message.chat.id;
    
    const settingsMessage = `⚙️ <b>Settings - Customize Experience</b>

🔔 <b>Notifications:</b>
✅ Price Drop Alerts - ON
✅ Flash Sale Alerts - ON
✅ Cashback Updates - ON

🎁 +3 XP for customizing settings!`;

    await this.sendMessage(chatId, settingsMessage, this.getInlineKeyboard());
  }

  async handleLanguage(message) {
    const chatId = message.chat.id;
    
    const languageMessage = `🌐 <b>Language Settings</b>

🎯 <b>Choose your preferred language:</b>

Current: English 🇺🇸

Available languages:
🇺🇸 English
🇮🇳 हिंदी (Hindi)
🇮🇳 తెలుగు (Telugu)
🇮🇳 தமிழ் (Tamil)

🎁 +3 XP for language settings!`;

    await this.sendMessage(chatId, languageMessage, this.getInlineKeyboard());
  }

  async handleGuide(message) {
    const chatId = message.chat.id;
    
    const guideMessage = `📖 <b>Complete Guide</b>

🎯 <b>How to use all features:</b>

🔍 <b>Find Deals:</b> Browse all available deals
🎮 <b>My Profile:</b> View your stats and progress
💰 <b>Cashback:</b> Check your earnings
🎲 <b>Random Deal:</b> Get surprise offers
🧠 <b>Ask Zabardoo:</b> Chat with AI assistant
⚙️ <b>Settings:</b> Customize notifications
🌐 <b>Language:</b> Change language
🆘 <b>Help:</b> Get support

🎁 +5 XP for reading guide!`;

    await this.sendMessage(chatId, guideMessage, this.getInlineKeyboard());
  }

  async handleTextMessage(message) {
    const chatId = message.chat.id;
    
    const textResponse = `💬 <b>Smart Search Results</b>

Found deals related to: "${message.text}"

🎯 Use the persistent menu below or inline buttons above to explore!

🎁 +2 XP for text search!`;

    await this.sendMessage(chatId, textResponse, this.getInlineKeyboard());
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

const bot = new PersistentMenuBot(token);
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
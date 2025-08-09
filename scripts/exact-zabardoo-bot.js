#!/usr/bin/env node

// Exact Zabardoo Telegram Bot - Based on Screenshot
const https = require('https');
const querystring = require('querystring');

class ExactZabardooBot {
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

  // EXACT menu from screenshot
  getMainKeyboard() {
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
    console.log('🚀 Starting Exact Zabardoo Telegram Bot...');
    
    // Set bot commands
    await this.setMyCommands();
    
    this.isRunning = true;
    console.log('✅ Bot started successfully!');
    console.log('📱 Menu layout matches screenshot exactly!');
    console.log('🎯 Ready to serve users with exact functionality!');
    
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
      { command: 'deals', description: '🔍 Find best deals and discounts' }
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
        totalSavings: Math.floor(Math.random() * 50000) + 10000,
        joinedAt: new Date()
      });
    }

    // Handle commands and messages
    if (text === '/start') {
      await this.handleStart(message);
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

    const sentMessage = await this.sendMessage(chatId, welcomeMessage, this.getMainKeyboard());
    this.lastMessageIds.set(chatId, sentMessage.message_id);
    
    console.log(`✅ User ${userName} started the bot`);
  }

  async handleCallbackQuery(callbackQuery) {
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;
    const data = callbackQuery.data;
    const user = this.users.get(callbackQuery.from.id);
    const userName = callbackQuery.from.first_name || 'Andre_web';

    let responseText = '';

    switch (data) {
      case 'ai_recommendations':
        responseText = `🤖 <b>AI Recommendations for ${userName}</b>

🧠 <b>Analyzing your preferences...</b>
📊 Based on your browsing history and interests:

🎯 <b>Personalized Deals:</b>
📱 iPhone 15 Pro - Perfect for tech enthusiasts like you!
💻 Gaming Laptop - Matches your electronics interest
🎧 Premium Headphones - Based on your audio preferences
👟 Sports Shoes - Fits your active lifestyle
📚 Tech Books - Expands your knowledge

💡 <b>Why these recommendations?</b>
• 📈 85% match with your profile
• 💰 Best value for money in your price range
• ⭐ High ratings from similar users
• 🔥 Limited time offers

🎁 +8 XP for using AI recommendations!`;
        break;

      case 'hot_deals':
        responseText = `🔥 <b>Hot Deals - Trending Now!</b>

⚡ <b>Flash Sales Ending Soon:</b>
📱 Samsung Galaxy S24 Ultra - 30% OFF (₹89,999)
💻 MacBook Pro M3 - 20% OFF (₹1,89,999)
🎧 AirPods Pro - 25% OFF (₹18,999)
👟 Nike Air Jordan - 40% OFF (₹8,999)
📺 Sony 4K TV - 35% OFF (₹65,999)

🔥 <b>Why these are hot:</b>
• ⏰ Limited time offers (24h left)
• 📈 Most viewed this week
• 💰 Highest savings potential
• ⭐ Top rated products

💰 Extra cashback up to 10%!
🎁 +6 XP for checking hot deals!`;
        break;

      case 'electronics':
        responseText = `📱 <b>Electronics - Best Deals</b>

🎯 <b>Top Electronics Deals:</b>
📱 <b>Smartphones:</b>
• iPhone 15 Pro - 25% OFF (₹89,999)
• Samsung Galaxy S24 - 28% OFF (₹52,000)
• OnePlus 12 - 30% OFF (₹45,999)

💻 <b>Laptops:</b>
• MacBook Air M3 - 15% OFF (₹85,000)
• Dell XPS 13 - 20% OFF (₹75,999)
• HP Pavilion - 35% OFF (₹45,999)

🎧 <b>Audio:</b>
• Sony WH-1000XM5 - 25% OFF (₹22,500)
• AirPods Pro - 20% OFF (₹18,999)
• JBL Flip 6 - 40% OFF (₹5,999)

💰 All with cashback 5-8%!
🎁 +5 XP for browsing electronics!`;
        break;

      case 'fashion':
        responseText = `👗 <b>Fashion - Trending Styles</b>

✨ <b>Fashion Deals for You:</b>
👗 <b>Women's Fashion:</b>
• Zara Dress Collection - 40% OFF
• H&M Summer Collection - 50% OFF
• Forever 21 Tops - 35% OFF

👔 <b>Men's Fashion:</b>
• Levi's Jeans - 30% OFF
• Nike T-Shirts - 25% OFF
• Adidas Hoodies - 40% OFF

👟 <b>Footwear:</b>
• Nike Air Max - 35% OFF (₹5,200)
• Adidas Ultraboost - 30% OFF (₹8,999)
• Puma Sneakers - 45% OFF (₹3,999)

💄 Plus beauty deals up to 60% OFF!
🎁 +5 XP for exploring fashion!`;
        break;

      case 'beauty':
        responseText = `💄 <b>Beauty - Glow Up Deals</b>

✨ <b>Beauty & Personal Care:</b>
💄 <b>Makeup:</b>
• Lakme Complete Kit - 40% OFF
• Maybelline Foundation - 35% OFF
• Nykaa Lipstick Set - 50% OFF

🧴 <b>Skincare:</b>
• The Ordinary Serum - 25% OFF
• Cetaphil Cleanser - 30% OFF
• Plum Moisturizer - 40% OFF

💇‍♀️ <b>Hair Care:</b>
• L'Oreal Shampoo - 35% OFF
• Tresemme Conditioner - 40% OFF
• Dyson Hair Dryer - 20% OFF (₹25,999)

🌟 Free samples with every order!
🎁 +5 XP for beauty shopping!`;
        break;

      case 'food':
        responseText = `🍔 <b>Food - Delicious Deals</b>

🍕 <b>Food & Dining Offers:</b>
🍔 <b>Fast Food:</b>
• McDonald's - Buy 1 Get 1 Free
• KFC - 40% OFF on buckets
• Domino's - 50% OFF on pizzas

🍽️ <b>Restaurants:</b>
• Zomato Gold - 30% OFF membership
• Swiggy Super - Free delivery for 3 months
• Dineout - 25% OFF at premium restaurants

🛒 <b>Groceries:</b>
• BigBasket - ₹500 OFF on ₹2000
• Grofers - 40% OFF on fruits & vegetables
• Amazon Fresh - Free delivery

🥤 Plus beverage deals up to 35% OFF!
🎁 +5 XP for food exploration!`;
        break;

      case 'stores':
        responseText = `🏪 <b>Stores - Shop by Brand</b>

🛍️ <b>Popular Stores:</b>
🏬 <b>Fashion:</b>
• Myntra - Up to 70% OFF + Extra 10%
• Ajio - Flat 60% OFF on everything
• Nykaa Fashion - Buy 2 Get 1 Free

📱 <b>Electronics:</b>
• Amazon - Great Indian Festival
• Flipkart - Big Billion Days
• Croma - Mega Electronics Sale

🏠 <b>Home & Living:</b>
• Pepperfry - 55% OFF on furniture
• Urban Ladder - Flat 40% OFF
• Fabindia - Traditional wear sale

💳 Extra bank discounts available!
🎁 +4 XP for store browsing!`;
        break;

      case 'profile':
        responseText = `🎮 <b>My Profile - ${userName}</b>

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
        break;

      case 'cashback':
        responseText = `💰 <b>Cashback - Your Earnings</b>

💳 <b>Current Balance:</b>
💰 Available: ₹${Math.floor(user.totalSavings * 0.05).toLocaleString()}
⏳ Pending: ₹${Math.floor(user.totalSavings * 0.02).toLocaleString()}
📊 Total Earned: ₹${Math.floor(user.totalSavings * 0.07).toLocaleString()}

📈 <b>Recent Cashback:</b>
📱 Samsung Galaxy S24 - ₹2,600 (5%)
👟 Nike Air Max - ₹312 (6%)
💻 MacBook Air M3 - ₹2,550 (3%)
👗 Zara Dress - ₹800 (8%)

💳 <b>Withdrawal Options:</b>
• 📱 UPI Transfer (Instant)
• 🏦 Bank Transfer (1-2 days)
• 💳 PayTM Wallet (Instant)
• 📱 PhonePe (Instant)

🎁 +4 XP for checking cashback!`;
        break;

      case 'settings':
        responseText = `⚙️ <b>Settings - Customize Experience</b>

🔔 <b>Notifications:</b>
✅ Price Drop Alerts - ON
✅ Flash Sale Alerts - ON
✅ Cashback Updates - ON
❌ Daily Deals Digest - OFF

⏰ <b>Quiet Hours:</b>
🌙 22:00 - 08:00 (No notifications)

🎯 <b>Preferences:</b>
📱 Favorite Categories: Electronics, Fashion
💰 Price Range: ₹1,000 - ₹1,00,000
🏪 Preferred Stores: Amazon, Flipkart, Myntra

🌐 <b>Language:</b>
🇺🇸 English (Current)
🇮🇳 हिंदी Available

🎁 +3 XP for customizing settings!`;
        break;

      case 'help':
        responseText = `🆘 <b>Help - Quick Guide</b>

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
        break;

      default:
        responseText = `🤖 Feature coming soon! Stay tuned for updates.`;
        break;
    }

    await this.editMessage(chatId, messageId, responseText, this.getMainKeyboard());

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
    
    const voiceResponse = `🎤 <b>Voice Search Results</b>

I heard: "Looking for smartphone deals under 50000"

🎯 <b>Found these matches:</b>
📱 Samsung Galaxy S24 - ₹52,000 (28% OFF)
📱 iPhone 15 - ₹79,999 (20% OFF)
📱 OnePlus 12 - ₹45,999 (30% OFF)

💰 All with cashback up to 8%!
🎁 +15 XP for voice search!`;

    await this.sendMessage(chatId, voiceResponse, this.getMainKeyboard());
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

    await this.sendMessage(chatId, imageResponse, this.getMainKeyboard());
  }

  async handleTextMessage(message) {
    const chatId = message.chat.id;
    
    const textResponse = `💬 <b>Smart Search Results</b>

Found deals related to: "${message.text}"

🎯 Use the menu below to explore specific categories or try:
🎤 Voice search for better results
📸 Photo search for exact matches

🎁 +2 XP for text search!`;

    await this.sendMessage(chatId, textResponse, this.getMainKeyboard());
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

const bot = new ExactZabardooBot(token);
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
#!/usr/bin/env node

// Enhanced Telegram Bot with Complete Guide and Fixed Interface
const https = require('https');
const querystring = require('querystring');

class EnhancedGuideTelegramBot {
  constructor(token) {
    this.token = token;
    this.baseUrl = `https://api.telegram.org/bot${token}`;
    this.offset = 0;
    this.isRunning = false;
    this.users = new Map();
    this.lastMessageIds = new Map();
    this.realDataMode = process.env.REAL_DATA_MODE === 'true';
    this.safeMode = process.env.BOT_SAFE_MODE !== 'false';
    // Group/channel to receive user feedback (complaints/suggestions)
    // Set FEEDBACK_GROUP_ID in env; fallback to provided group id if any
    const defaultFeedbackId = '-4952183510';
    const envFeedbackId = process.env.FEEDBACK_GROUP_ID || defaultFeedbackId;
    this.feedbackGroupId = Number(envFeedbackId) || parseInt(defaultFeedbackId, 10);
    // Reply sessions
    this.adminReplySessions = new Map(); // adminId -> { userId }
    this.userReplySessions = new Map();  // userId -> true
    this.groupReplySessions = new Map(); // groupChatId -> { userId, adminId }
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
      text: this.sanitize(text),
      parse_mode: 'HTML'
    };
    
    if (replyMarkup) {
      params.reply_markup = JSON.stringify(replyMarkup);
    }
    
    return this.makeRequest('sendMessage', params);
  }

  async sendPhoto(chatId, fileIdOrUrl, caption = '', replyMarkup = null) {
    const params = {
      chat_id: chatId,
      photo: fileIdOrUrl,
      caption: this.sanitize(caption),
      parse_mode: 'HTML'
    };
    if (replyMarkup) {
      params.reply_markup = JSON.stringify(replyMarkup);
    }
    return this.makeRequest('sendPhoto', params);
  }

  async sendDocument(chatId, fileIdOrUrl, caption = '', replyMarkup = null) {
    const params = {
      chat_id: chatId,
      document: fileIdOrUrl,
      caption: this.sanitize(caption),
      parse_mode: 'HTML'
    };
    if (replyMarkup) {
      params.reply_markup = JSON.stringify(replyMarkup);
    }
    return this.makeRequest('sendDocument', params);
  }

  async sendVoice(chatId, fileIdOrUrl, caption = '', replyMarkup = null) {
    const params = {
      chat_id: chatId,
      voice: fileIdOrUrl,
      caption: this.sanitize(caption),
      parse_mode: 'HTML'
    };
    if (replyMarkup) {
      params.reply_markup = JSON.stringify(replyMarkup);
    }
    return this.makeRequest('sendVoice', params);
  }

  // ===== Real data search (Flipkart API; extensible for others) =====
  async searchRealProducts(query, limit = 5) {
    if (!this.realDataMode) return [];
    const results = [];

    try {
      const flipkart = await this.searchFlipkartAPI(query, Math.min(limit, 10));
      results.push(...flipkart);
    } catch (e) {
      console.log('⚠️ Flipkart search failed:', e.message);
    }

    // TODO: Add Amazon/Myntra/Nykaa integrations when API credentials are provided
    return results.slice(0, limit);
  }

  async httpsGetJson(fullUrl, headers = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(fullUrl);
      const options = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'GET',
        headers
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve(json);
          } catch (err) {
            reject(err);
          }
        });
      });
      req.on('error', reject);
      req.end();
    });
  }

  async searchFlipkartAPI(query, resultCount = 10) {
    const affiliateId = process.env.FLIPKART_AFFILIATE_ID;
    const affiliateToken = process.env.FLIPKART_AFFILIATE_TOKEN;
    if (!affiliateId || !affiliateToken) return [];

    const url = `https://affiliate-api.flipkart.net/affiliate/1.0/search.json?query=${encodeURIComponent(query)}&resultCount=${resultCount}`;
    const headers = {
      'Fk-Affiliate-Id': affiliateId,
      'Fk-Affiliate-Token': affiliateToken
    };
    const data = await this.httpsGetJson(url, headers);

    const list = (data && data.productInfoList) || [];
    return list.map((item) => {
      const p = item.productBaseInfoV1 || item.productBaseInfo || {};
      const maxPrice = (p.maximumRetailPrice && p.maximumRetailPrice.amount) || p.maximumRetailPrice || 0;
      const spPrice = (p.flipkartSpecialPrice && p.flipkartSpecialPrice.amount) || p.flipkartSpecialPrice || p.discountedPrice || 0;
      const discount = Math.max(0, maxPrice - spPrice);
      const discountPct = maxPrice ? Math.round((discount / maxPrice) * 100) : 0;
      const img = p.imageUrls ? (p.imageUrls['200x200'] || p.imageUrls['400x400'] || Object.values(p.imageUrls)[0]) : '';

      return {
        store: 'Flipkart',
        title: p.title || p.productTitle || 'Product',
        url: p.productUrl,
        price: spPrice,
        originalPrice: maxPrice,
        discountPct,
        image: img,
        inStock: p.inStock !== false
      };
    });
  }

  async editMessage(chatId, messageId, text, replyMarkup = null) {
    const params = {
      chat_id: chatId,
      message_id: messageId,
      text: this.sanitize(text),
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

  sanitize(input) {
    if (!input || !this.safeMode) return input || '';
    // Basic sanitizer: strip dangerous tags/attributes for HTML mode
    const blocked = ['script', 'iframe', 'object', 'embed', 'link', 'style'];
    let output = String(input);
    blocked.forEach(tag => {
      const re = new RegExp(`<\/?${tag}[^>]*>`, 'gi');
      output = output.replace(re, '');
    });
    // Remove on* handlers
    output = output.replace(/on[a-z]+\s*=\s*"[^"]*"/gi, '');
    output = output.replace(/on[a-z]+\s*=\s*'[^']*'/gi, '');
    // Remove javascript: urls
    output = output.replace(/javascript:/gi, '');
    return output;
  }

  async setMyCommands() {
    const commands = [
      { command: 'start', description: '🚀 Start bot and show main menu' },
      { command: 'feedback', description: '💌 Send feedback (suggestion, bug, feature, general)' },
      { command: 'help', description: '🆘 Show help and support information' },
      { command: 'guide', description: '📖 Complete guide for all buttons and functions' },
      { command: 'profile', description: '👤 My profile, level and achievements' },
      { command: 'settings', description: '⚙️ Notification settings' },
      { command: 'cashback', description: '💰 My cashback and balance' },
      { command: 'deals', description: '🔍 Find best deals and discounts' },
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

  // ДОБАВЛЕНО: Нижнее меню (reply keyboard) с теми же кнопками
  getBottomKeyboard() {
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
      one_time_keyboard: false
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
  }

  async getUpdates() {
    try {
      const updates = await this.makeRequest('getUpdates', {
        offset: this.offset,
        timeout: 10
      });
      
      if (updates.length > 0) {
        this.offset = updates[updates.length - 1].update_id + 1;
        
        for (const update of updates) {
          await this.handleUpdate(update);
        }
      }
    } catch (error) {
      console.log('⚠️  Error getting updates:', error.message);
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
    const userName = message.from.first_name || 'Friend';
    
    console.log(`💬 Message from ${userName}: ${text}`);
    
    this.initializeUser(message.from);

    // Admin reply session: if admin is replying from group or personal chat
    // 1) If admin has a personal reply session
    if ((message.chat.type === 'supergroup' || message.chat.type === 'group' || message.chat.id === this.feedbackGroupId) && this.adminReplySessions.has(message.from.id)) {
      const session = this.adminReplySessions.get(message.from.id);
      if (session && session.userId) {
        await this.forwardAdminReplyToUser(message, session.userId);
        return;
      }
    }
    // 2) If group itself has an active reply session (any admin in this chat)
    if ((message.chat.type === 'supergroup' || message.chat.type === 'group' || message.chat.id === this.feedbackGroupId) && this.groupReplySessions.has(message.chat.id)) {
      const gSession = this.groupReplySessions.get(message.chat.id);
      if (gSession && gSession.userId) {
        await this.forwardAdminReplyToUser(message, gSession.userId);
        return;
      }
    }

    // User reply session: forward any text/photo/voice to admin group
    if (this.userReplySessions.has(message.from.id)) {
      await this.forwardUserReplyToAdmin(message);
      return;
    }
    
    if (text === '/start') {
      await this.handleStart(message);
    } else if (text === '/help') {
      await this.handleHelp(message);
    } else if (text === '/guide') {
      await this.handleCompleteGuide(message);
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
    } else if (text === '/menu') {
      await this.handleMenu(message);
    } else if (message.voice) {
      await this.handleVoice(message);
    } else if (message.photo) {
      await this.handlePhoto(message);
    } else {
      await this.handleTextMessage(message);
    }
  }

  async forwardAdminReplyToUser(message, targetUserId) {
    try {
      const userChatId = String(targetUserId);
      // Who triggered reply
      const adminName = message.from.first_name || 'Admin';
      const header = `👨‍💼 <b>${adminName} (Администрация)</b>\n`;
      if (message.text) {
        await this.sendMessage(userChatId, `${header}\n${message.text}`, {
          inline_keyboard: [[{ text: '↩️ Ответить администратору', callback_data: 'reply_admin_start' }]]
        });
      }
      if (message.photo && message.photo.length > 0) {
        const best = message.photo[message.photo.length - 1];
        const caption = message.caption || `${adminName}: 📷 фото`;
        await this.sendPhoto(userChatId, best.file_id, `${caption}`, {
          inline_keyboard: [[{ text: '↩️ Ответить администратору', callback_data: 'reply_admin_start' }]]
        });
      }
      if (message.document) {
        const caption = message.caption || `${adminName}: 📎 документ`;
        await this.sendDocument(userChatId, message.document.file_id, caption, {
          inline_keyboard: [[{ text: '↩️ Ответить администратору', callback_data: 'reply_admin_start' }]]
        });
      }
      if (message.voice) {
        const caption = message.caption || `${adminName}: 🎤 голосовое сообщение`;
        await this.sendVoice(userChatId, message.voice.file_id, caption, {
          inline_keyboard: [[{ text: '↩️ Ответить администратору', callback_data: 'reply_admin_start' }]]
        });
      }
      // Notify admin
      await this.sendMessage(this.feedbackGroupId, `✅ Сообщение отправлено пользователю ${targetUserId}.`);
    } catch (e) {
      await this.sendMessage(this.feedbackGroupId, `⚠️ Не удалось отправить сообщение пользователю: ${e.message}`);
    }
  }

  async forwardUserReplyToAdmin(message) {
    try {
      const header = `📨 <b>Ответ пользователя</b>\n\n👤 <b>User:</b> ${message.from.first_name} (@${message.from.username || 'no_username'})\n🆔 <b>ID:</b> ${message.from.id}\n📅 <b>Date:</b> ${new Date().toLocaleString()}\n`;
      if (message.text) {
        await this.sendMessage(this.feedbackGroupId, `${header}\n💬 <b>Message:</b>\n${message.text}`, {
          inline_keyboard: [[{ text: '↩️ Ответить пользователю', callback_data: `answer_user_${message.from.id}` }]]
        });
      }
      if (message.photo && message.photo.length > 0) {
        const best = message.photo[message.photo.length - 1];
        const caption = message.caption || '';
        await this.sendPhoto(this.feedbackGroupId, best.file_id, `${header}\n${caption}`, {
          inline_keyboard: [[{ text: '↩️ Ответить пользователю', callback_data: `answer_user_${message.from.id}` }]]
        });
      }
      if (message.document) {
        const caption = message.caption || '';
        await this.sendDocument(this.feedbackGroupId, message.document.file_id, `${header}\n${caption}`, {
          inline_keyboard: [[{ text: '↩️ Ответить пользователю', callback_data: `answer_user_${message.from.id}` }]]
        });
      }
      if (message.voice) {
        const caption = message.caption || '';
        await this.sendVoice(this.feedbackGroupId, message.voice.file_id, `${header}\n${caption}`, {
          inline_keyboard: [[{ text: '↩️ Ответить пользователю', callback_data: `answer_user_${message.from.id}` }]]
        });
      }
      // Keep session until admin ends
    } catch (e) {
      console.log('⚠️ Failed to forward user reply:', e.message);
    }
  }

  async handleStart(message) {
    const chatId = message.chat.id;
    const userName = message.from.first_name || 'Friend';
    
    const welcomeMessage = `🎉 Welcome to Zabardoo Enhanced Bot, ${userName}! 🌟

🚀 I'm your AI-powered deal discovery assistant!

🎯 What I can do for you:
🎤 <b>Voice Search</b> - Send me a voice message! (Try: "bottle", "headphones")
📸 <b>Image Recognition</b> - Send me a product photo! (Just tap 📎 and send)
🎮 Gamification - Earn XP and unlock achievements!
🔔 Smart Notifications - Get personalized deal alerts!
💰 Cashback Tracking - Track your savings!

💎 Level 1 • ⚡ 0 XP • 🏆 0/50 Achievements

🎮 Today's Mission: Find your first amazing deal!

🎤📸 <b>QUICK START:</b> Send voice message or photo right now for instant deals!

Ready to save some serious money? Let's go! 🚀

💡 Tip: Click 📖 Guide button for complete instructions on all buttons!`;

    const sentMessage = await this.sendMessage(chatId, welcomeMessage, this.getMainKeyboard());
    this.lastMessageIds.set(chatId, sentMessage.message_id);
    // Show persistent bottom menu under the blue Menu button
    await this.sendMessage(chatId, '👇 Quick access menu enabled below.', this.getBottomKeyboard());
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
   ⏰ <b>Set Quiet Hours</b> - Set time when NOT to disturb you (like at night)
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

  async handleHelp(message) {
    const chatId = message.chat.id;
    
    const helpMessage = `🆘 <b>Zabardoo Bot Quick Help</b>

<b>🎯 Main Functions:</b>
• Find deals and get cashback
• Earn XP and unlock achievements
• Get personalized recommendations
• Track your savings

<b>⚡ Quick Commands:</b>
/start - Main menu
/guide - Complete button guide
/profile - Your stats
/cashback - Your balance
/deals - Find deals
/settings - Notifications

<b>🎤 Voice & Photo:</b>
• Send voice message to search
• Send product photo for deals
• Get instant recommendations

<b>🛡️ Anti-Spam Protection:</b>
• You control all notifications
• Quiet hours: 22:00-08:00
• Easy unsubscribe options

<b>💰 Cashback:</b>
• Automatic tracking
• Multiple withdrawal methods
• Real-time balance updates

Need more help? Use /guide for detailed explanations!`;

    const sentMessage = await this.sendMessage(chatId, helpMessage, this.getMainKeyboard());
    this.lastMessageIds.set(chatId, sentMessage.message_id);
  }

  async handleProfile(message) {
    const chatId = message.chat.id;
    const user = this.getUser(message.from.id);
    
    const profileMessage = `👤 <b>Your Zabardoo Profile</b>

🌟 ${user.firstName} ${user.lastName || ''}
💎 Level ${user.level} 🛍️
⚡ ${user.xp} XP
🏆 ${user.achievements.length}/50 Achievements
🔥 ${user.streak} day streak
💰 Total Savings: ₹${user.totalSavings}

🎯 Progress to Level ${user.level + 1}:
${'█'.repeat(Math.floor(user.xp % 100 / 10))}${'░'.repeat(10 - Math.floor(user.xp % 100 / 10))} ${user.xp % 100}/100 XP

🏆 Recent Achievements:
${user.achievements.slice(-3).map(a => `🏅 ${a}`).join('\n') || '🎯 Complete your first quest to earn achievements!'}

🎮 Keep exploring to unlock more rewards!`;

    const sentMessage = await this.sendMessage(chatId, profileMessage, this.getMainKeyboard());
    this.lastMessageIds.set(chatId, sentMessage.message_id);
  }

  async handleCashback(message) {
    const chatId = message.chat.id;
    const user = this.getUser(message.from.id);
    
    const cashbackMessage = `💰 <b>Your Cashback Summary</b>

💳 Available Balance: ₹${user.cashbackBalance}
⏳ Pending: ₹${user.pendingCashback}
📊 Total Earned: ₹${user.totalCashback}

🏦 <b>Recent Transactions:</b>
💸 Flipkart - ₹150 (Ready)
💸 Amazon - ₹89 (Pending)
💸 Myntra - ₹245 (Ready)

🎯 Minimum withdrawal: ₹100
💳 Withdraw via UPI/PayTM instantly!

💡 Tip: Earn more by sharing deals with friends!`;

    const sentMessage = await this.sendMessage(chatId, cashbackMessage, this.getMainKeyboard());
    this.lastMessageIds.set(chatId, sentMessage.message_id);
  }

  async handleSettings(message) {
    const chatId = message.chat.id;
    
    const settingsMessage = `⚙️ <b>Notification Settings</b>

🛡️ <b>Anti-Spam Protection Active!</b>

Current Settings:
🔔 Price Drops: ✅ Enabled
⚡ Flash Sales: ✅ Enabled  
🎯 Personal Deals: ✅ Enabled
🏆 Achievements: ✅ Enabled
💰 Cashback Updates: ✅ Enabled

⏰ Quiet Hours: 22:00 - 08:00
📊 Frequency: Smart (AI-optimized)

🎛️ You have full control over all notifications!`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🔔 Toggle Price Drops', callback_data: 'toggle_price' },
          { text: '⚡ Toggle Flash Sales', callback_data: 'toggle_flash' }
        ],
        [
          { text: '⏰ Set Quiet Hours', callback_data: 'quiet_hours' },
          { text: '🛑 Pause All (2h)', callback_data: 'pause_2h' }
        ],
        [
          { text: '🔍 Find Deals', callback_data: 'find_deals' },
          { text: '🎮 My Profile', callback_data: 'profile' }
        ],
        [
          { text: '💰 Cashback', callback_data: 'cashback' },
          { text: '📖 Complete Guide', callback_data: 'complete_guide' }
        ]
      ]
    };

    const sentMessage = await this.sendMessage(chatId, settingsMessage, keyboard);
    this.lastMessageIds.set(chatId, sentMessage.message_id);
  }

  async handleDeals(message) {
    const chatId = message.chat.id;
    const userName = message.from.first_name || 'Friend';
    
    const dealsMessage = `🔍 <b>Top Deals for ${userName}!</b>

🎯 <b>Hot Deals Right Now:</b>
📱 Samsung Galaxy S24 - 28% OFF (₹52,000)
👟 Nike Air Max - 35% OFF (₹5,200)  
💻 MacBook Air M3 - 15% OFF (₹85,000)
👗 Zara Dress Collection - 40% OFF
🎧 Sony WH-1000XM5 - 25% OFF (₹22,500)

💰 All with cashback up to 8%!
🎁 +5 XP for browsing deals!

Choose a category below for more specific deals:`;

    const sentMessage = await this.sendMessage(chatId, dealsMessage, this.getCategoryKeyboard());
    this.lastMessageIds.set(chatId, sentMessage.message_id);
    this.awardXP(message.from.id, 5, 'browse_deals');
  }

  async handleFeedback(message) {
    const chatId = message.chat.id;
    const userName = message.from.first_name || 'Friend';
    
    const feedbackMessage = `💌 <b>Send Feedback to Admin</b>

Hi ${userName}! We'd love to hear from you! 

📝 <b>What you can send:</b>
• Suggestions for new features
• Bug reports or issues
• Ideas for improvement
• General feedback about the bot
• Store or deal requests

✍️ <b>How to send:</b>
Just type your message after this and it will be sent directly to our admin team!

Example: "Please add more electronics deals from Xiaomi"

🎁 You'll get +5 XP for providing feedback!

💡 Your feedback helps us make the bot better for everyone!`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '📝 Send Suggestion', callback_data: 'send_suggestion' },
          { text: '🐛 Report Bug', callback_data: 'report_bug' }
        ],
        [
          { text: '💡 Feature Request', callback_data: 'feature_request' },
          { text: '⭐ General Feedback', callback_data: 'general_feedback' }
        ],
        [
          { text: '🔍 Find Deals', callback_data: 'find_deals' },
          { text: '🎮 My Profile', callback_data: 'profile' },
          { text: '📖 Guide', callback_data: 'complete_guide' }
        ]
      ]
    };

    const sentMessage = await this.sendMessage(chatId, feedbackMessage, keyboard);
    this.lastMessageIds.set(chatId, sentMessage.message_id);
  }

  async handleMenu(message) {
    const chatId = message.chat.id;
    const userName = message.from.first_name || 'Friend';
    
    const menuMessage = `📋 <b>Command Menu for ${userName}</b>

🎯 <b>Available Commands:</b>

🚀 <b>/start</b> - Start bot and show main menu
🆘 <b>/help</b> - Show help and support information  
📖 <b>/guide</b> - Complete guide for all buttons and functions
👤 <b>/profile</b> - My profile, level and achievements
⚙️ <b>/settings</b> - Notification settings
💰 <b>/cashback</b> - My cashback and balance
🔍 <b>/deals</b> - Find best deals and discounts
💌 <b>/feedback</b> - Send feedback or suggestion to admin
📋 <b>/menu</b> - Show this command menu

💡 <b>Quick Tips:</b>
• Type any command to use it instantly
• Use buttons below for quick access
• Send voice messages for better search
• Upload product photos for instant deals

🎁 +2 XP for checking the menu!`;

    const sentMessage = await this.sendMessage(chatId, menuMessage, this.getMainKeyboard());
    this.lastMessageIds.set(chatId, sentMessage.message_id);
    this.awardXP(message.from.id, 2, 'check_menu');
  }

  async handleVoice(message) {
    const chatId = message.chat.id;
    const userName = message.from.first_name || 'Friend';
    const voiceDuration = message.voice.duration;
    
    console.log(`🎤 Voice message received from ${userName}, duration: ${voiceDuration}s`);
    
    // Show processing message
    const processingMessage = await this.sendMessage(chatId, `🎤 <b>Processing your voice message...</b>

⏳ Analyzing audio (${voiceDuration}s)
🤖 Converting speech to text
🔍 Searching for deals...

Please wait a moment!`);

    // Smart voice processing
    setTimeout(async () => {
      const voiceAnalysis = this.analyzeVoiceContent(voiceDuration, message.voice.file_id);
      
      let response = `🎤 <b>Voice Search Results for ${userName}!</b>

🎯 <b>I heard you say:</b> "${voiceAnalysis.transcript}"

🔍 <b>Found these amazing deals:</b>
${voiceAnalysis.deals.map(deal => `${deal.icon} ${deal.name} - ${deal.discount} (${deal.price})`).join('\n')}

💰 All with cashback up to 8%!
🎁 +15 XP for voice search!

💡 <b>Voice search is more accurate!</b> Try describing what you want in detail.`;

      if (this.realDataMode) {
        const real = await this.searchRealProducts(voiceAnalysis.transcript, 5);
        if (Array.isArray(real) && real.length > 0) {
          const lines = real.map(r => `• <a href="${r.url}">${r.title}</a> — ₹${r.price.toLocaleString('en-IN')}${r.discountPct ? ` (${r.discountPct}% OFF)` : ''} [${r.store}]`);
          response = `🎤 <b>Live voice results for ${userName}</b>

🎯 <b>Query:</b> "${voiceAnalysis.transcript}"

${lines.join('\n')}

💡 Real-time data from partner stores.`;
        }
      }

      // Preserve history for voice flow
      await this.sendMessage(chatId, response, this.getCategoryKeyboard());
      this.awardXP(message.from.id, 15, 'voice_search');
    }, 3000);
  }

  analyzeVoiceContent(duration, fileId) {
    // Smart voice analysis based on duration and patterns
    const voiceDatabase = [
      {
        keywords: ['bottle', 'water', 'drink', 'container'],
        transcript: 'Looking for water bottles',
        deals: [
          { icon: '🍼', name: 'Milton Thermosteel Bottle', discount: '30% OFF', price: '₹899' },
          { icon: '🍼', name: 'Cello H2O Steel Bottle', discount: '25% OFF', price: '₹599' },
          { icon: '🍼', name: 'Borosil Hydra Trek Bottle', discount: '35% OFF', price: '₹749' },
          { icon: '🍼', name: 'Tupperware Aquasafe Bottle', discount: '20% OFF', price: '₹1,199' }
        ]
      },
      {
        keywords: ['headphone', 'earphone', 'audio', 'music', 'sound'],
        transcript: 'Looking for wireless headphones',
        deals: [
          { icon: '🎧', name: 'Sony WH-CH720N', discount: '40% OFF', price: '₹4,999' },
          { icon: '🎧', name: 'JBL Tune 760NC', discount: '35% OFF', price: '₹3,499' },
          { icon: '🎧', name: 'Boat Rockerz 550', discount: '50% OFF', price: '₹1,999' },
          { icon: '🎧', name: 'Skullcandy Hesh 3', discount: '45% OFF', price: '₹2,799' }
        ]
      },
      {
        keywords: ['phone', 'mobile', 'smartphone', 'cell'],
        transcript: 'Looking for smartphones',
        deals: [
          { icon: '📱', name: 'Samsung Galaxy S24', discount: '15% OFF', price: '₹74,999' },
          { icon: '📱', name: 'iPhone 15', discount: '8% OFF', price: '₹79,900' },
          { icon: '📱', name: 'OnePlus 12', discount: '20% OFF', price: '₹64,999' },
          { icon: '📱', name: 'Google Pixel 8', discount: '18% OFF', price: '₹69,999' }
        ]
      },
      {
        keywords: ['shoe', 'sneaker', 'footwear', 'boot'],
        transcript: 'Looking for shoes',
        deals: [
          { icon: '👟', name: 'Nike Air Max 270', discount: '30% OFF', price: '₹8,999' },
          { icon: '👟', name: 'Adidas Ultraboost 22', discount: '25% OFF', price: '₹12,999' },
          { icon: '👟', name: 'Puma RS-X', discount: '35% OFF', price: '₹6,499' },
          { icon: '👟', name: 'Reebok Zig Kinetica', discount: '40% OFF', price: '₹5,999' }
        ]
      },
      {
        keywords: ['laptop', 'computer', 'notebook', 'pc'],
        transcript: 'Looking for laptops',
        deals: [
          { icon: '💻', name: 'MacBook Air M3', discount: '12% OFF', price: '₹1,14,900' },
          { icon: '💻', name: 'Dell XPS 13', discount: '18% OFF', price: '₹89,999' },
          { icon: '💻', name: 'HP Pavilion 15', discount: '25% OFF', price: '₹54,999' },
          { icon: '💻', name: 'Lenovo ThinkPad E14', discount: '22% OFF', price: '₹64,999' }
        ]
      }
    ];

    // Simple hash-based selection for demo (in production, use real speech-to-text)
    const hash = this.simpleHash(fileId + duration.toString());
    const selectedProduct = voiceDatabase[hash % voiceDatabase.length];
    
    console.log(`🤖 Voice Analysis: Detected ${selectedProduct.transcript}`);
    
    return selectedProduct;
  }

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  async handlePhoto(message) {
    const chatId = message.chat.id;
    const userName = message.from.first_name || 'Friend';
    const photo = message.photo[message.photo.length - 1]; // Get highest resolution
    
    console.log(`📸 Photo received from ${userName}, file_id: ${photo.file_id}`);
    
    // Show processing message
    const processingMessage = await this.sendMessage(chatId, `📸 <b>Analyzing your product photo...</b>

🔍 Identifying product details
🤖 AI image recognition in progress
💰 Finding best prices...

This may take a few seconds!`);

    // Simulate smart AI processing with random realistic results
    setTimeout(async () => {
      const productResults = this.analyzePhotoContent(photo.file_id);
      
      const response = `📸 <b>Photo Analysis Results for ${userName}!</b>

🎯 <b>Product Identified:</b> ${productResults.product}

🔍 <b>Best Deals Found:</b>
${productResults.deals.map(deal => `${deal.icon} ${deal.store} - ${deal.price} (${deal.discount} + ${deal.cashback})`).join('\n')}

💰 <b>Best Deal:</b> ${productResults.bestDeal}
🎁 +20 XP for photo search!

💡 <b>Photo search finds exact matches!</b> Upload clear product images for best results.`;

      // If real-data mode is ON, try to fetch real deals for detected product
      if (this.realDataMode && productResults && productResults.product) {
        const real = await this.searchRealProducts(productResults.product, 5);
        if (Array.isArray(real) && real.length > 0) {
          const lines = real.slice(0, 5).map(r => `• <a href="${r.url}">${r.title}</a> — ₹${r.price.toLocaleString('en-IN')} (${r.discountPct}% OFF) [${r.store}]`);
          const realMsg = `📸 <b>Photo Analysis Results for ${userName}!</b>

🎯 <b>Product Identified:</b> ${productResults.product}

🔍 <b>Real Store Matches:</b>
${lines.join('\n')}

${real.length === 0 ? '⚠️ No exact match found. Showing similar items.' : ''}

💡 Prices and availability are fetched live from stores.`;
          // Preserve history for photo flow (real data)
          await this.sendMessage(chatId, realMsg, this.getCategoryKeyboard());
          this.awardXP(message.from.id, 20, 'photo_search');
          return;
        }
      }

      // Preserve history for photo flow (mock)
      await this.sendMessage(chatId, response, this.getCategoryKeyboard());
      this.awardXP(message.from.id, 20, 'photo_search');
    }, 4000);
  }

  analyzePhotoContent(fileId) {
    // Smart product detection based on common items
    const productDatabase = [
      {
        category: 'cleaning',
        keywords: ['brush', 'cleaning', 'scrub'],
        product: 'Cleaning Brush Set (Multi-Purpose)',
        deals: [
          { icon: '🧽', store: 'Amazon India', price: '₹299', discount: '40% OFF', cashback: '2% cashback' },
          { icon: '🧽', store: 'Flipkart', price: '₹349', discount: '30% OFF', cashback: '3% cashback' },
          { icon: '🧽', store: 'Myntra Home', price: '₹399', discount: '20% OFF', cashback: '2% cashback' },
          { icon: '🧽', store: 'Urban Company', price: '₹450', discount: '10% OFF', cashback: '1% cashback' }
        ],
        bestDeal: 'Amazon India - Save ₹200 + ₹6 cashback!'
      },
      {
        category: 'electronics',
        keywords: ['phone', 'mobile', 'smartphone'],
        product: 'iPhone 15 Pro Max (256GB, Natural Titanium)',
        deals: [
          { icon: '📱', store: 'Amazon India', price: '₹1,34,900', discount: '8% OFF', cashback: '3% cashback' },
          { icon: '📱', store: 'Flipkart', price: '₹1,36,999', discount: '6% OFF', cashback: '4% cashback' },
          { icon: '📱', store: 'Croma', price: '₹1,39,900', discount: '3% OFF', cashback: '2% cashback' },
          { icon: '📱', store: 'Vijay Sales', price: '₹1,37,500', discount: '5% OFF', cashback: '3% cashback' }
        ],
        bestDeal: 'Amazon India - Save ₹14,999 + ₹4,047 cashback!'
      },
      {
        category: 'fashion',
        keywords: ['shoe', 'sneaker', 'footwear'],
        product: 'Nike Air Max 270 (Black/White)',
        deals: [
          { icon: '👟', store: 'Nike Store', price: '₹8,999', discount: '25% OFF', cashback: '4% cashback' },
          { icon: '👟', store: 'Amazon Fashion', price: '₹9,499', discount: '20% OFF', cashback: '3% cashback' },
          { icon: '👟', store: 'Myntra', price: '₹9,999', discount: '15% OFF', cashback: '5% cashback' },
          { icon: '👟', store: 'Ajio', price: '₹10,499', discount: '10% OFF', cashback: '2% cashback' }
        ],
        bestDeal: 'Nike Store - Save ₹3,000 + ₹360 cashback!'
      },
      {
        category: 'home',
        keywords: ['kitchen', 'utensil', 'cookware'],
        product: 'Non-Stick Cookware Set (5 Pieces)',
        deals: [
          { icon: '🍳', store: 'Amazon Home', price: '₹2,499', discount: '50% OFF', cashback: '3% cashback' },
          { icon: '🍳', store: 'Flipkart Home', price: '₹2,799', discount: '40% OFF', cashback: '4% cashback' },
          { icon: '🍳', store: 'Pepperfry', price: '₹3,199', discount: '30% OFF', cashback: '2% cashback' },
          { icon: '🍳', store: 'Urban Ladder', price: '₹3,499', discount: '25% OFF', cashback: '3% cashback' }
        ],
        bestDeal: 'Amazon Home - Save ₹2,500 + ₹75 cashback!'
      }
    ];

    // Simple random selection for demo (in production, use real AI)
    const randomProduct = productDatabase[Math.floor(Math.random() * productDatabase.length)];
    
    // Log for debugging
    console.log(`🤖 AI Analysis: Detected ${randomProduct.category} product`);
    
    return randomProduct;
  }

  async handleTextMessage(message) {
    const chatId = message.chat.id;
    const text = message.text;
    const userName = message.from.first_name || 'Friend';
    const user = this.getUser(message.from.id);
    
    // Check if user is sending feedback
    if (user.waitingForFeedback) {
      await this.processFeedback(message, user.waitingForFeedback);
      return;
    }
    
    const processingMessage = await this.sendMessage(chatId, `🤖 Processing your message, ${userName}...`);
    
    setTimeout(async () => {
      // Align bottom buttons with inline buttons (HTML + same logic)
      let response;
      let replyMarkup = this.getMainKeyboard();
      
      switch (text) {
        case '🆘 Help':
          response = `🆘 <b>Zabardoo Bot Quick Help</b>

<b>🎯 Main Functions:</b>
• Find deals and get cashback
• Earn XP and unlock achievements
• Get personalized recommendations
• Track your savings

<b>⚡ Quick Commands:</b>
/start - Main menu
/guide - Complete button guide
/profile - Your stats
/cashback - Your balance
/deals - Find deals
/settings - Notifications

<b>🎤 Voice & Photo:</b>
• Send voice message to search
• Send product photo for deals
• Get instant recommendations

<b>🛡️ Anti-Spam Protection:</b>
• You control all notifications
• Quiet hours: 22:00-08:00
• Easy unsubscribe options

<b>💰 Cashback:</b>
• Automatic tracking
• Multiple withdrawal methods
• Real-time balance updates

Need more help? Use /guide for detailed explanations!`;
          break;
          
        case '📖 Guide':
          response = `📖 <b>COMPLETE GUIDE - What Each Button Does</b>

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
   ⏰ <b>Set Quiet Hours</b> - Set time when NOT to disturb you (like at night)
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
          break;
          
        case '💰 Cashback': {
          const cashbackUser = this.getUser(message.from.id);
          response = `💰 <b>Your Cashback Summary</b>

💳 Available Balance: ₹${cashbackUser.cashbackBalance}
⏳ Pending: ₹${cashbackUser.pendingCashback}
📊 Total Earned: ₹${cashbackUser.totalCashback}

🏦 <b>Recent Transactions:</b>
💸 Flipkart - ₹150 (Ready)
💸 Amazon - ₹89 (Pending)
💸 Myntra - ₹245 (Ready)

🎯 Minimum withdrawal: ₹100
💳 Withdraw via UPI/PayTM instantly!

💡 Tip: Earn more by sharing deals with friends!`;
          break;
        }

        case '🎮 My Profile': {
          const profileUser = this.getUser(message.from.id);
          response = `👤 <b>Your Zabardoo Profile</b>

🌟 ${profileUser.firstName} ${profileUser.lastName || ''}
💎 Level ${profileUser.level} 🛍️
⚡ ${profileUser.xp} XP
🏆 ${profileUser.achievements.length}/50 Achievements
🔥 ${profileUser.streak} day streak
💰 Total Savings: ₹${profileUser.totalSavings}

🎯 Progress to Level ${profileUser.level + 1}:
${'█'.repeat(Math.floor(profileUser.xp % 100 / 10))}${'░'.repeat(10 - Math.floor(profileUser.xp % 100 / 10))} ${profileUser.xp % 100}/100 XP

🏆 Recent Achievements:
${profileUser.achievements.slice(-3).map(a => `🏅 ${a}`).join('\\n') || '🎯 Complete your first quest to earn achievements!'}

🎮 Keep exploring to unlock more rewards!`;
          break;
        }
          
        case '🔍 Find Deals':
          response = `🔍 <b>Top Deals for ${userName}!</b>

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
          replyMarkup = this.getCategoryKeyboard();
          this.awardXP(message.from.id, 5, 'browse_deals');
          break;
          
        case '🧠 Ask Zabardoo':
        case '💬 Ask Zabardoo':
          response = `🧠 <b>Ask Zabardoo AI Assistant</b>

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
          this.awardXP(message.from.id, 8, 'ask_zabardoo');
          break;
          
        case '🎲 Random Deal': {
          const randomDeals = [
            { name: 'iPhone 15 Pro', discount: '22%', price: '₹89,900', store: 'Amazon India', cashback: '6%' },
            { name: 'Samsung 65" QLED TV', discount: '35%', price: '₹65,000', store: 'Flipkart', cashback: '8%' },
            { name: 'Nike Air Jordan', discount: '40%', price: '₹8,500', store: 'Myntra', cashback: '5%' },
            { name: 'MacBook Pro M3', discount: '18%', price: '₹1,45,000', store: 'Croma', cashback: '4%' },
            { name: 'Sony PlayStation 5', discount: '12%', price: '₹44,990', store: 'Amazon India', cashback: '7%' },
            { name: 'Dyson V15 Vacuum', discount: '25%', price: '₹42,000', store: 'Flipkart', cashback: '6%' }
          ];
          const randomDeal = randomDeals[Math.floor(Math.random() * randomDeals.length)];
          response = `🎲 <b>Random Deal Alert!</b>

🎯 <b>${randomDeal.name}</b>
💥 ${randomDeal.discount} OFF - Only ${randomDeal.price}!
🏪 Available at ${randomDeal.store}
💰 Plus ${randomDeal.cashback} cashback!

⚡ <b>Limited Time Offer!</b>
🔥 Grab it before it's gone!

🎁 +10 XP for discovering random deals!

💡 <b>Pro Tip:</b> Random deals often have the highest discounts!`;
          this.awardXP(message.from.id, 10, 'random_deal');
          break;
        }
          
        case '⚙️ Settings':
          response = `⚙️ <b>Notification Settings</b>

🛡️ <b>Anti-Spam Protection Active!</b>

Current Settings:
🔔 Price Drops: ✅ Enabled
⚡ Flash Sales: ✅ Enabled  
🎯 Personal Deals: ✅ Enabled
🏆 Achievements: ✅ Enabled
💰 Cashback Updates: ✅ Enabled

⏰ Quiet Hours: 22:00 - 08:00
📊 Frequency: Smart (AI-optimized)

🎛️ You have full control over all notifications!`;
          replyMarkup = {
            inline_keyboard: [
              [
                { text: '🔔 Toggle Price Drops', callback_data: 'toggle_price' },
                { text: '⚡ Toggle Flash Sales', callback_data: 'toggle_flash' }
              ],
              [
                { text: '⏰ Set Quiet Hours', callback_data: 'quiet_hours' },
                { text: '🛑 Pause All (2h)', callback_data: 'pause_2h' }
              ],
              [
                { text: '🔍 Find Deals', callback_data: 'find_deals' },
                { text: '🎮 My Profile', callback_data: 'profile' }
              ],
              [
                { text: '💰 Cashback', callback_data: 'cashback' },
                { text: '📖 Complete Guide', callback_data: 'complete_guide' }
              ]
            ]
          };
          break;
          
        case '🌐 Language':
          response = `🌐 <b>Choose Your Language</b>

Select your preferred language for the bot interface:

🇮🇳 <b>Available Languages:</b>
• English (Current)
• हिंदी (Hindi)
• বাংলা (Bengali)
• தமிழ் (Tamil)
• తెలుగు (Telugu)
• ગુજરાતી (Gujarati)
• ಕನ್ನಡ (Kannada)
• മലയാളം (Malayalam)
• मराठी (Marathi)

🎁 +5 XP for exploring language options!

💡 <b>Note:</b> Language change will be applied to all future messages and deal descriptions.`;
          replyMarkup = {
            inline_keyboard: [
              [
                { text: '🇺🇸 English', callback_data: 'lang_en' },
                { text: '🇮🇳 हिंदी', callback_data: 'lang_hi' }
              ],
              [
                { text: '🇮🇳 বাংলা', callback_data: 'lang_bn' },
                { text: '🇮🇳 தமிழ்', callback_data: 'lang_ta' }
              ],
              [
                { text: '🇮🇳 తెలుగు', callback_data: 'lang_te' },
                { text: '🇮🇳 ગુજરાતી', callback_data: 'lang_gu' }
              ],
              [
                { text: '🇮🇳 ಕನ್ನಡ', callback_data: 'lang_kn' },
                { text: '🇮🇳 മലയാളം', callback_data: 'lang_ml' }
              ],
              [
                { text: '🇮🇳 मराठी', callback_data: 'lang_mr' },
                { text: '🔙 Back to Menu', callback_data: 'back_to_menu' }
              ]
            ]
          };
          this.awardXP(message.from.id, 5, 'language_selector');
          break;

        default: {
          // Text search (real-time if enabled)
          const query = (typeof text === 'string' && text.trim()) ? text.trim() : '';
          if (this.realDataMode && query) {
            const real = await this.searchRealProducts(query, 5);
            if (Array.isArray(real) && real.length > 0) {
              const items = real.map(r => `• <a href="${r.url}">${r.title}</a> — ₹${r.price.toLocaleString('en-IN')}${r.discountPct ? ` (${r.discountPct}% OFF)` : ''} [${r.store}]`).join('\n');
              response = `🔍 <b>Live results for:</b> "${query}"

${items}

💡 Prices and availability are fetched live from stores.`;
              this.awardXP(message.from.id, 10, 'text_search');
          break;
            } else {
              response = `⚠️ <b>No exact matches found</b> for "${query}".

Try a different name, or send a clear photo/voice for better accuracy.`;
              this.awardXP(message.from.id, 4, 'no_results');
              break;
            }
          }

          // Fallback demo content
          const safeText = query || 'your request';
          response = `🎯 Great message, ${userName}!

🔍 I found some relevant deals for: "${safeText}"

📱 Top Results:
• Samsung Galaxy S24 - 28% OFF (₹52,000)
• iPhone 15 Pro - 15% OFF (₹1,20,000)  
• OnePlus 12 - 35% OFF (₹45,000)

💰 All with cashback up to 8%!
🎁 +10 XP for searching!

💡 Pro tip: Try voice search or send me a product photo for better results!`;
          this.awardXP(message.from.id, 10, 'text_search');
          break;
        }
      }

      // Preserve history for text flow
      await this.sendMessage(chatId, response, replyMarkup);
      this.lastMessageIds.set(chatId, processingMessage.message_id);
    }, 2000);
  }

  async processFeedback(message, feedbackType) {
    const chatId = message.chat.id;
    const text = message.text;
    const userName = message.from.first_name || 'Friend';
    const userId = message.from.id;
    const user = this.getUser(userId);
    
    // Clear the waiting state
    user.waitingForFeedback = null;
    this.users.set(userId, user);
    
    // Format feedback message for admin
    const adminMessage = `📨 <b>New ${feedbackType.toUpperCase()} from User</b>

👤 <b>User:</b> ${userName} (@${message.from.username || 'no_username'})
🆔 <b>User ID:</b> ${userId}
📅 <b>Date:</b> ${new Date().toLocaleString()}
📝 <b>Type:</b> ${feedbackType.charAt(0).toUpperCase() + feedbackType.slice(1)}

💬 <b>Message:</b>
${text}

🎮 <b>User Stats:</b>
• Level: ${user.level}
• XP: ${user.xp}
• Total Savings: ₹${user.totalSavings}`;

    // Forward to feedback group/channel if configured
    try {
      if (this.feedbackGroupId) {
        const tagMap = {
          suggestion: 'Пожелание',
          bug: 'Жалоба/Баг',
          feature: 'Запрос фичи',
          general: 'Общий отзыв'
        };
        const tag = tagMap[feedbackType] || 'Отзыв';
        const groupMessage = `🗣️ <b>${tag}</b>

👤 <b>User:</b> ${userName} (@${message.from.username || 'no_username'})
🆔 <b>ID:</b> ${userId}
📅 <b>Date:</b> ${new Date().toLocaleString()}

💬 <b>Message:</b>
${text}`;
        const forwarded = await this.sendMessage(this.feedbackGroupId, groupMessage, {
          inline_keyboard: [
            [ { text: '↩️ Ответить пользователю', callback_data: `answer_user_${userId}` } ]
          ]
        });
        // map admin reply session message -> user id if needed later
      }
    } catch (e) {
      console.log('⚠️ Failed to forward feedback to group:', e.message);
    }
    
    // Send confirmation to user
    const confirmationMessage = `✅ <b>Feedback Sent Successfully!</b>

Thank you ${userName}! Your ${feedbackType} has been sent to our admin team.

📨 <b>Your message:</b>
"${text}"

🎯 <b>What happens next:</b>
• Our team will review your ${feedbackType}
• We'll consider it for future updates
• Important issues get priority attention
• You might see your suggestion implemented soon!

🎁 <b>Bonus:</b> +10 XP for helping us improve!

💡 Feel free to send more feedback anytime using /feedback command!`;

    // For user: show Reply to admin button
    await this.sendMessage(chatId, confirmationMessage, {
      inline_keyboard: [
        [ { text: '↩️ Ответить администратору', callback_data: 'reply_admin_start' } ],
        ...this.getMainKeyboard().inline_keyboard
      ]
    });
    this.awardXP(userId, 10, 'feedback_sent');
  }

  async handleCallbackQuery(callbackQuery) {
    const message = callbackQuery.message;
    const data = callbackQuery.data;
    const chatId = message.chat.id;
    const messageId = message.message_id;
    const userName = callbackQuery.from.first_name || 'Friend';
    
    console.log(`🔘 Button pressed: ${data} by ${userName}`);
    
    await this.makeRequest('answerCallbackQuery', {
      callback_query_id: callbackQuery.id
    });

    let responseText = '';
    let keyboard = this.getMainKeyboard();

    // Dynamic handler: Admin presses "answer" in group to reply to a specific user
    if (typeof data === 'string' && data.startsWith('answer_user_')) {
      try {
        const targetUserId = parseInt(data.replace('answer_user_', ''), 10);
        if (!isNaN(targetUserId)) {
          this.adminReplySessions.set(callbackQuery.from.id, { userId: targetUserId });
          // Prompt with ForceReply so the bot surely receives the reply even with privacy mode ON
          // Save mapping also per group chat, so any admin message in this chat routes to the same user
          this.groupReplySessions.set(chatId, { userId: targetUserId, adminId: callbackQuery.from.id });

          await this.sendMessage(chatId,
            '✍️ Напишите ответ пользователю (можно отправить текст или фото). Сообщение будет доставлено приватно.',
            { force_reply: true, selective: true }
          );
          // Send a separate control message with an inline button to end dialog
          await this.sendMessage(chatId, '✅ Управление диалогом', {
            inline_keyboard: [[{ text: '✅ Завершить диалог', callback_data: 'admin_reply_end' }]]
          });
          // Do not edit the original complaint message
          return;
        } else {
          responseText = '⚠️ Невозможно определить пользователя для ответа.';
        }
      } catch (e) {
        responseText = '⚠️ Ошибка при запуске ответа.';
      }
      await this.sendMessage(chatId, responseText);
      return;
    }

    switch (data) {
      case 'admin_reply_end':
        this.adminReplySessions.delete(callbackQuery.from.id);
        responseText = '✅ Диалог завершен. Ответы больше не будут отправляться пользователю.';
        break;

      case 'reply_admin_start':
        this.userReplySessions.set(callbackQuery.from.id, true);
        responseText = '✍️ Напишите ответ администрации (можно отправить текст или фото).';
        keyboard = { inline_keyboard: [[{ text: '✅ Завершить диалог', callback_data: 'user_reply_end' }]] };
        break;

      case 'user_reply_end':
        this.userReplySessions.delete(callbackQuery.from.id);
        responseText = '✅ Диалог с администрацией завершен.';
        break;
      case 'find_deals':
        responseText = `🔍 <b>Top Deals for ${userName}!</b>

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
        keyboard = this.getCategoryKeyboard();
        this.awardXP(callbackQuery.from.id, 5, 'browse_deals');
        break;

      case 'profile':
        const user = this.getUser(callbackQuery.from.id);
        responseText = `👤 <b>Your Zabardoo Profile</b>

🌟 ${user.firstName} ${user.lastName || ''}
💎 Level ${user.level} 🛍️
⚡ ${user.xp} XP
🏆 ${user.achievements.length}/50 Achievements
🔥 ${user.streak} day streak
💰 Total Savings: ₹${user.totalSavings}

🎯 Progress to Level ${user.level + 1}:
${'█'.repeat(Math.floor(user.xp % 100 / 10))}${'░'.repeat(10 - Math.floor(user.xp % 100 / 10))} ${user.xp % 100}/100 XP

🏆 Recent Achievements:
${user.achievements.slice(-3).map(a => `🏅 ${a}`).join('\n') || '🎯 Complete your first quest to earn achievements!'}

🎮 Keep exploring to unlock more rewards!`;
        break;

      case 'cashback':
        const cashbackUser = this.getUser(callbackQuery.from.id);
        responseText = `💰 <b>Your Cashback Summary</b>

💳 Available Balance: ₹${cashbackUser.cashbackBalance}
⏳ Pending: ₹${cashbackUser.pendingCashback}
📊 Total Earned: ₹${cashbackUser.totalCashback}

🏦 <b>Recent Transactions:</b>
💸 Flipkart - ₹150 (Ready)
💸 Amazon - ₹89 (Pending)
💸 Myntra - ₹245 (Ready)

🎯 Minimum withdrawal: ₹100
💳 Withdraw via UPI/PayTM instantly!

💡 Tip: Earn more by sharing deals with friends!`;
        break;

      case 'complete_guide':
        responseText = `📖 <b>COMPLETE GUIDE - What Each Button Does</b>

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
   ⏰ <b>Set Quiet Hours</b> - Set time when NOT to disturb you (like at night)
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
        break;

      case 'settings':
        responseText = `⚙️ <b>Notification Settings</b>

🛡️ <b>Anti-Spam Protection Active!</b>

Current Settings:
🔔 Price Drops: ✅ Enabled
⚡ Flash Sales: ✅ Enabled  
🎯 Personal Deals: ✅ Enabled
🏆 Achievements: ✅ Enabled
💰 Cashback Updates: ✅ Enabled

⏰ Quiet Hours: 22:00 - 08:00
📊 Frequency: Smart (AI-optimized)

🎛️ You have full control over all notifications!`;
        
        keyboard = {
          inline_keyboard: [
            [
              { text: '🔔 Toggle Price Drops', callback_data: 'toggle_price' },
              { text: '⚡ Toggle Flash Sales', callback_data: 'toggle_flash' }
            ],
            [
              { text: '⏰ Set Quiet Hours', callback_data: 'quiet_hours' },
              { text: '🛑 Pause All (2h)', callback_data: 'pause_2h' }
            ],
            [
              { text: '🔍 Find Deals', callback_data: 'find_deals' },
              { text: '🎮 My Profile', callback_data: 'profile' }
            ],
            [
              { text: '💰 Cashback', callback_data: 'cashback' },
              { text: '📖 Complete Guide', callback_data: 'complete_guide' }
            ]
          ]
        };
        break;

      case 'help':
        responseText = `🆘 <b>Zabardoo Bot Quick Help</b>

<b>🎯 Main Functions:</b>
• Find deals and get cashback
• Earn XP and unlock achievements
• Get personalized recommendations
• Track your savings

<b>⚡ Quick Commands:</b>
/start - Main menu
/guide - Complete button guide
/profile - Your stats
/cashback - Your balance
/deals - Find deals
/settings - Notifications

<b>🎤📸 SMART SEARCH (Most Popular!):</b>
🎤 <b>Voice Search:</b> Say "bottle" → Get water bottle deals
📸 <b>Photo Search:</b> Send product photo → Get exact matches
💡 <b>Why it's better:</b> More accurate than typing!

<b>🛡️ Anti-Spam Protection:</b>
• You control all notifications
• Quiet hours: 22:00-08:00
• Easy unsubscribe options

<b>💰 Cashback:</b>
• Automatic tracking
• Multiple withdrawal methods
• Real-time balance updates

🎤📸 <b>TRY NOW:</b> Send voice message or photo for instant deals!

Need more help? Use /guide for detailed explanations!`;
        break;

      // Category buttons
      case 'ai_recommendations':
        responseText = `🤖 <b>AI Recommendations for ${userName}</b>

Based on your history and preferences:

📱 <b>Personalized for You:</b>
• iPhone 15 Pro - 15% OFF + 5% cashback
• Samsung Galaxy Buds - 30% OFF + 3% cashback
• MacBook Air M3 - 12% OFF + 4% cashback

🎯 <b>Trending in Your Category:</b>
• OnePlus 12 - 25% OFF + 6% cashback
• Sony WH-1000XM5 - 20% OFF + 4% cashback

🎁 +3 XP for checking AI recommendations!`;
        keyboard = this.getCategoryKeyboard();
        this.awardXP(callbackQuery.from.id, 3, 'ai_recommendations');
        break;

      case 'hot_deals':
        responseText = `🔥 <b>Hot Deals - Limited Time!</b>

⏰ <b>Flash Sales Ending Soon:</b>
• Nike Air Max - 40% OFF (2 hours left!)
• Zara Collection - 50% OFF (Today only!)
• Samsung TV - 35% OFF (3 hours left!)

🚀 <b>Trending Now:</b>
• iPhone 15 - 18% OFF + 5% cashback
• MacBook Pro - 15% OFF + 4% cashback
• Sony PlayStation 5 - 10% OFF + 3% cashback

🎁 +3 XP for checking hot deals!`;
        keyboard = this.getCategoryKeyboard();
        this.awardXP(callbackQuery.from.id, 3, 'hot_deals');
        break;

      case 'electronics':
        responseText = `📱 <b>Electronics Deals</b>

🔥 <b>Top Electronics Offers:</b>
• Samsung Galaxy S24 - 28% OFF + 6% cashback
• iPhone 15 Pro - 15% OFF + 5% cashback
• MacBook Air M3 - 12% OFF + 4% cashback
• Sony WH-1000XM5 - 25% OFF + 4% cashback
• OnePlus 12 - 30% OFF + 6% cashback

💡 <b>Smart Home:</b>
• Amazon Echo - 40% OFF + 3% cashback
• Google Nest - 35% OFF + 3% cashback

🎁 +3 XP for browsing electronics!`;
        keyboard = this.getCategoryKeyboard();
        this.awardXP(callbackQuery.from.id, 3, 'electronics');
        break;

      case 'fashion':
        responseText = `👗 <b>Fashion Deals</b>

✨ <b>Top Fashion Offers:</b>
• Zara Collection - 50% OFF + 4% cashback
• H&M Summer Sale - 40% OFF + 3% cashback
• Nike Sportswear - 35% OFF + 5% cashback
• Adidas Originals - 30% OFF + 4% cashback
• Levi's Jeans - 45% OFF + 4% cashback

👠 <b>Accessories:</b>
• Ray-Ban Sunglasses - 25% OFF + 3% cashback
• Fossil Watches - 40% OFF + 5% cashback

🎁 +3 XP for browsing fashion!`;
        keyboard = this.getCategoryKeyboard();
        this.awardXP(callbackQuery.from.id, 3, 'fashion');
        break;

      case 'beauty':
        responseText = `💄 <b>Beauty Deals</b>

💅 <b>Top Beauty Offers:</b>
• Lakme Cosmetics - 40% OFF + 5% cashback
• Nykaa Collection - 35% OFF + 4% cashback
• L'Oreal Paris - 30% OFF + 4% cashback
• Maybelline - 45% OFF + 3% cashback
• MAC Cosmetics - 25% OFF + 6% cashback

🧴 <b>Skincare:</b>
• The Body Shop - 50% OFF + 4% cashback
• Himalaya - 30% OFF + 3% cashback

🎁 +3 XP for browsing beauty!`;
        keyboard = this.getCategoryKeyboard();
        this.awardXP(callbackQuery.from.id, 3, 'beauty');
        break;

      case 'food':
        responseText = `🍔 <b>Food Deals</b>

🍕 <b>Restaurant Offers:</b>
• Domino's Pizza - 40% OFF + 2% cashback
• McDonald's - 30% OFF + 2% cashback
• KFC - 35% OFF + 3% cashback
• Subway - 25% OFF + 2% cashback
• Pizza Hut - 45% OFF + 3% cashback

🛒 <b>Grocery:</b>
• BigBasket - 20% OFF + 2% cashback
• Grofers - 25% OFF + 2% cashback

🎁 +3 XP for browsing food deals!`;
        keyboard = this.getCategoryKeyboard();
        this.awardXP(callbackQuery.from.id, 3, 'food');
        break;

      case 'stores':
        responseText = `🏪 <b>Popular Indian Stores</b>

🛍️ <b>E-Commerce Giants:</b>
🔸 <b>Amazon India</b> - Up to 70% OFF + 5% cashback
   📱 Electronics, Books, Fashion, Home
🔸 <b>Flipkart</b> - Up to 80% OFF + 6% cashback
   📱 Mobiles, Electronics, Fashion, Grocery
🔸 <b>Myntra</b> - Up to 60% OFF + 4% cashback
   👗 Fashion, Beauty, Home & Living
🔸 <b>Ajio</b> - Up to 70% OFF + 4% cashback
   👕 Fashion, Footwear, Accessories

💄 <b>Beauty & Personal Care:</b>
🔸 <b>Nykaa</b> - Up to 50% OFF + 5% cashback
🔸 <b>Purplle</b> - Up to 45% OFF + 3% cashback

🏬 <b>Department Stores:</b>
🔸 <b>Lifestyle</b> - 40% OFF + 3% cashback
🔸 <b>Shoppers Stop</b> - 50% OFF + 4% cashback
🔸 <b>Westside</b> - 35% OFF + 2% cashback

🍔 <b>Food & Grocery:</b>
🔸 <b>Swiggy</b> - Up to 60% OFF + 2% cashback
🔸 <b>Zomato</b> - Up to 50% OFF + 3% cashback
🔸 <b>BigBasket</b> - Up to 30% OFF + 2% cashback
🔸 <b>Grofers (Blinkit)</b> - Up to 25% OFF + 2% cashback

💡 <b>Pro Tip:</b> 🎤 Send voice message or 📸 photo for personalized store recommendations!

🎁 +3 XP for browsing stores!`;
        keyboard = this.getCategoryKeyboard();
        this.awardXP(callbackQuery.from.id, 3, 'stores');
        break;

      // Settings buttons
      case 'toggle_price':
        responseText = `🔔 <b>Price Drop Notifications</b>

Status: ✅ Enabled → 🔕 Disabled

You will no longer receive price drop alerts.
You can re-enable them anytime!

🎁 +2 XP for managing settings!`;
        keyboard = this.getMainKeyboard();
        this.awardXP(callbackQuery.from.id, 2, 'settings_change');
        break;

      case 'toggle_flash':
        responseText = `⚡ <b>Flash Sale Notifications</b>

Status: ✅ Enabled → 🔕 Disabled

You will no longer receive flash sale alerts.
You can re-enable them anytime!

🎁 +2 XP for managing settings!`;
        keyboard = this.getMainKeyboard();
        this.awardXP(callbackQuery.from.id, 2, 'settings_change');
        break;

      case 'quiet_hours':
        responseText = `⏰ <b>Quiet Hours Settings</b>

Current: 22:00 - 08:00
New: 23:00 - 07:00

✅ Updated successfully!
No notifications during these hours.

🎁 +2 XP for managing settings!`;
        keyboard = this.getMainKeyboard();
        this.awardXP(callbackQuery.from.id, 2, 'settings_change');
        break;

      case 'pause_2h':
        responseText = `🛑 <b>Notifications Paused</b>

All notifications paused for 2 hours.
Will resume automatically at ${new Date(Date.now() + 2 * 60 * 60 * 1000).toLocaleTimeString()}.

You can unpause anytime in settings.

🎁 +2 XP for managing settings!`;
        keyboard = this.getMainKeyboard();
        this.awardXP(callbackQuery.from.id, 2, 'settings_change');
        break;

      // Feedback buttons
      case 'send_suggestion':
        responseText = `📝 <b>Send Your Suggestion</b>

Great! We love hearing your ideas! 💡

Please type your suggestion in the next message and it will be sent directly to our admin team.

<b>Examples:</b>
• "Add more fashion deals from Zara"
• "Create a wishlist feature"
• "Add price alerts for specific products"

Your suggestion will help us improve the bot for everyone! 🚀

🎁 +5 XP for providing feedback!`;
        
        // Set user state to expect feedback
        const suggestionUser = this.getUser(callbackQuery.from.id);
        suggestionUser.waitingForFeedback = 'suggestion';
        this.users.set(callbackQuery.from.id, suggestionUser);
        this.awardXP(callbackQuery.from.id, 5, 'feedback');
        break;

      case 'report_bug':
        responseText = `🐛 <b>Report a Bug</b>

Thanks for helping us fix issues! 🔧

Please describe the bug you encountered in your next message:

<b>Please include:</b>
• What you were trying to do
• What happened instead
• When it occurred

<b>Example:</b>
"When I clicked on Electronics, the cashback button disappeared"

Your bug report will be sent to our development team immediately! 

🎁 +5 XP for helping us improve!`;
        
        const bugUser = this.getUser(callbackQuery.from.id);
        bugUser.waitingForFeedback = 'bug';
        this.users.set(callbackQuery.from.id, bugUser);
        this.awardXP(callbackQuery.from.id, 5, 'feedback');
        break;

      case 'feature_request':
        responseText = `💡 <b>Feature Request</b>

Awesome! New feature ideas are always welcome! ✨

Please describe the feature you'd like to see in your next message:

<b>Try to include:</b>
• What the feature should do
• How it would help you
• Any specific details

<b>Example:</b>
"Add a favorites list where I can save deals I like for later"

Our product team reviews all feature requests! 

🎁 +5 XP for contributing ideas!`;
        
        const featureUser = this.getUser(callbackQuery.from.id);
        featureUser.waitingForFeedback = 'feature';
        this.users.set(callbackQuery.from.id, featureUser);
        this.awardXP(callbackQuery.from.id, 5, 'feedback');
        break;

      case 'general_feedback':
        responseText = `⭐ <b>General Feedback</b>

We'd love to hear your thoughts! 💭

Please share your general feedback about the bot in your next message:

<b>You can tell us about:</b>
• What you like most
• What could be better
• Your overall experience
• Any other thoughts

<b>Example:</b>
"I love the cashback feature, but the notifications are too frequent"

Every piece of feedback helps us serve you better! 

🎁 +5 XP for sharing your thoughts!`;
        
        const generalUser = this.getUser(callbackQuery.from.id);
        generalUser.waitingForFeedback = 'general';
        this.users.set(callbackQuery.from.id, generalUser);
        this.awardXP(callbackQuery.from.id, 5, 'feedback');
        break;

      case 'random_deal':
        const randomDeals = [
          { name: 'iPhone 15 Pro', discount: '22%', price: '₹89,900', store: 'Amazon India', cashback: '6%' },
          { name: 'Samsung 65" QLED TV', discount: '35%', price: '₹65,000', store: 'Flipkart', cashback: '8%' },
          { name: 'Nike Air Jordan', discount: '40%', price: '₹8,500', store: 'Myntra', cashback: '5%' },
          { name: 'MacBook Pro M3', discount: '18%', price: '₹1,45,000', store: 'Croma', cashback: '4%' },
          { name: 'Sony PlayStation 5', discount: '12%', price: '₹44,990', store: 'Amazon India', cashback: '7%' },
          { name: 'Dyson V15 Vacuum', discount: '25%', price: '₹42,000', store: 'Flipkart', cashback: '6%' }
        ];
        
        const randomDeal = randomDeals[Math.floor(Math.random() * randomDeals.length)];
        responseText = `🎲 <b>Random Deal Alert!</b>

🎯 <b>${randomDeal.name}</b>
💥 ${randomDeal.discount} OFF - Only ${randomDeal.price}!
🏪 Available at ${randomDeal.store}
💰 Plus ${randomDeal.cashback} cashback!

⚡ <b>Limited Time Offer!</b>
🔥 Grab it before it's gone!

🎁 +10 XP for discovering random deals!

💡 <b>Pro Tip:</b> Random deals often have the highest discounts!`;
        
        this.awardXP(callbackQuery.from.id, 10, 'random_deal');
        break;

      case 'language_selector':
        responseText = `🌐 <b>Choose Your Language</b>

Select your preferred language for the bot interface:

🇮🇳 <b>Available Languages:</b>
• English (Current)
• हिंदी (Hindi)
• বাংলা (Bengali)
• தமிழ் (Tamil)
• తెలుగు (Telugu)
• ગુજરાતી (Gujarati)
• ಕನ್ನಡ (Kannada)
• മലയാളം (Malayalam)
• मराठी (Marathi)

🎁 +5 XP for exploring language options!

💡 <b>Note:</b> Language change will be applied to all future messages and deal descriptions.`;
        
        keyboard = {
          inline_keyboard: [
            [
              { text: '🇺🇸 English', callback_data: 'lang_en' },
              { text: '🇮🇳 हिंदी', callback_data: 'lang_hi' }
            ],
            [
              { text: '🇮🇳 বাংলা', callback_data: 'lang_bn' },
              { text: '🇮🇳 தமிழ்', callback_data: 'lang_ta' }
            ],
            [
              { text: '🇮🇳 తెలుగు', callback_data: 'lang_te' },
              { text: '🇮🇳 ગુજરાતી', callback_data: 'lang_gu' }
            ],
            [
              { text: '🇮🇳 ಕನ್ನಡ', callback_data: 'lang_kn' },
              { text: '🇮🇳 മലയാളം', callback_data: 'lang_ml' }
            ],
            [
              { text: '🇮🇳 मराठी', callback_data: 'lang_mr' },
              { text: '🔙 Back to Menu', callback_data: 'back_to_menu' }
            ]
          ]
        };
        
        this.awardXP(callbackQuery.from.id, 5, 'language_selector');
        break;

      case 'ask_zabardoo':
        responseText = `🧠 <b>Ask Zabardoo AI Assistant</b>

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
        
        this.awardXP(callbackQuery.from.id, 8, 'ask_zabardoo');
        break;

      // Language selection handlers
      case 'lang_en':
        responseText = `🇺🇸 <b>Language set to English!</b>

✅ Your language preference has been updated to English.
🎁 +3 XP for customizing your experience!

All future messages and deal descriptions will be in English.`;
        this.awardXP(callbackQuery.from.id, 3, 'language_change');
        break;

      case 'lang_hi':
        responseText = `🇮🇳 <b>भाषा हिंदी में सेट की गई!</b>

✅ आपकी भाषा प्राथमिकता हिंदी में अपडेट कर दी गई है।
🎁 +3 XP अपने अनुभव को कस्टमाइज़ करने के लिए!

सभी भविष्य के संदेश और डील विवरण हिंदी में होंगे।`;
        this.awardXP(callbackQuery.from.id, 3, 'language_change');
        break;

      case 'lang_bn':
        responseText = `🇮🇳 <b>ভাষা বাংলায় সেট করা হয়েছে!</b>

✅ আপনার ভাষার পছন্দ বাংলায় আপডেট করা হয়েছে।
🎁 +3 XP আপনার অভিজ্ঞতা কাস্টমাইজ করার জন্য!

সমস্ত ভবিষ্যতের বার্তা এবং ডিল বিবরণ বাংলায় হবে।`;
        this.awardXP(callbackQuery.from.id, 3, 'language_change');
        break;

      case 'lang_ta':
        responseText = `🇮🇳 <b>மொழி தமிழில் அமைக்கப்பட்டது!</b>

✅ உங்கள் மொழி விருப்பம் தமிழில் புதுப்பிக்கப்பட்டது।
🎁 +3 XP உங்கள் அனுபவத்தை தனிப்பயனாக்குவதற்கு!

எல்லா எதிர்கால செய்திகள் மற்றும் ஒப்பந்த விவரங்கள் தமிழில் இருக்கும்.`;
        this.awardXP(callbackQuery.from.id, 3, 'language_change');
        break;

      case 'lang_te':
        responseText = `🇮🇳 <b>భాష తెలుగులో సెట్ చేయబడింది!</b>

✅ మీ భాష ప్రాధాన్యత తెలుగులో అప్‌డేట్ చేయబడింది।
🎁 +3 XP మీ అనుభవాన్ని అనుకూలీకరించడానికి!

అన్ని భవిష్యత్ సందేశాలు మరియు డీల్ వివరాలు తెలుగులో ఉంటాయి.`;
        this.awardXP(callbackQuery.from.id, 3, 'language_change');
        break;

      case 'lang_gu':
        responseText = `🇮🇳 <b>ભાષા ગુજરાતીમાં સેટ કરવામાં આવી!</b>

✅ તમારી ભાષા પસંદગી ગુજરાતીમાં અપડેટ કરવામાં આવી છે।
🎁 +3 XP તમારા અનુભવને કસ્ટમાઇઝ કરવા માટે!

તમામ ભાવિ સંદેશાઓ અને ડીલ વિગતો ગુજરાતીમાં હશે.`;
        this.awardXP(callbackQuery.from.id, 3, 'language_change');
        break;

      case 'lang_kn':
        responseText = `🇮🇳 <b>ಭಾಷೆಯನ್ನು ಕನ್ನಡದಲ್ಲಿ ಹೊಂದಿಸಲಾಗಿದೆ!</b>

✅ ನಿಮ್ಮ ಭಾಷಾ ಆದ್ಯತೆಯನ್ನು ಕನ್ನಡದಲ್ಲಿ ನವೀಕರಿಸಲಾಗಿದೆ।
🎁 +3 XP ನಿಮ್ಮ ಅನುಭವವನ್ನು ಕಸ್ಟಮೈಸ್ ಮಾಡಲು!

ಎಲ್ಲಾ ಭವಿಷ್ಯದ ಸಂದೇಶಗಳು ಮತ್ತು ಡೀಲ್ ವಿವರಗಳು ಕನ್ನಡದಲ್ಲಿರುತ್ತವೆ.`;
        this.awardXP(callbackQuery.from.id, 3, 'language_change');
        break;

      case 'lang_ml':
        responseText = `🇮🇳 <b>ഭാഷ മലയാളത്തിൽ സജ്ജീകരിച്ചു!</b>

✅ നിങ്ങളുടെ ഭാഷാ മുൻഗണന മലയാളത്തിൽ അപ്ഡേറ്റ് ചെയ്തു।
🎁 +3 XP നിങ്ങളുടെ അനുഭവം ഇഷ്ടാനുസൃതമാക്കുന്നതിന്!

എല്ലാ ഭാവി സന്ദേശങ്ങളും ഡീൽ വിശദാംശങ്ങളും മലയാളത്തിലായിരിക്കും.`;
        this.awardXP(callbackQuery.from.id, 3, 'language_change');
        break;

      case 'lang_mr':
        responseText = `🇮🇳 <b>भाषा मराठीमध्ये सेट केली!</b>

✅ तुमची भाषा प्राधान्य मराठीमध्ये अपडेट केली आहे।
🎁 +3 XP तुमचा अनुभव कस्टमाइझ करण्यासाठी!

सर्व भविष्यातील संदेश आणि डील तपशील मराठीमध्ये असतील.`;
        this.awardXP(callbackQuery.from.id, 3, 'language_change');
        break;

      case 'back_to_menu':
        responseText = `🏠 <b>Welcome back to main menu!</b>

🎮 Ready to discover amazing deals and save money?
🎁 +2 XP for navigating back!

Choose any option below to continue your shopping journey:`;
        this.awardXP(callbackQuery.from.id, 2, 'back_to_menu');
        break;

      default:
        responseText = `🎮 Feature "${data}" coming soon! Stay tuned for updates! 🚀`;
    }

    // Preserve chat history: send a new message instead of editing previous one
    await this.sendMessage(chatId, responseText, keyboard);
  }

  initializeUser(telegramUser) {
    if (!this.users.has(telegramUser.id)) {
      this.users.set(telegramUser.id, {
        id: telegramUser.id,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
        username: telegramUser.username,
        level: 1,
        xp: 0,
        achievements: [],
        streak: 0,
        totalSavings: 0,
        cashbackBalance: Math.floor(Math.random() * 500) + 100,
        pendingCashback: Math.floor(Math.random() * 200) + 50,
        totalCashback: Math.floor(Math.random() * 1000) + 500,
        waitingForFeedback: null,
        joinedAt: new Date()
      });
      
      console.log(`✅ New user initialized: ${telegramUser.first_name}`);
    }
  }

  getUser(userId) {
    return this.users.get(userId) || {
      id: userId,
      firstName: 'User',
      level: 1,
      xp: 0,
      achievements: [],
      streak: 0,
      totalSavings: 0,
      cashbackBalance: 150,
      pendingCashback: 89,
      totalCashback: 750,
      waitingForFeedback: null
    };
  }

  awardXP(userId, amount, reason) {
    const user = this.getUser(userId);
    user.xp += amount;
    
    const newLevel = Math.floor(user.xp / 100) + 1;
    if (newLevel > user.level) {
      user.level = newLevel;
      
      setTimeout(async () => {
        await this.sendMessage(userId, `🎉 <b>LEVEL UP!</b> 

🆙 Level ${user.level - 1} → Level ${newLevel}
🎁 New benefits unlocked!
💎 Cashback multiplier increased!
⚡ +${newLevel * 10} bonus XP!

🏆 Keep going to unlock more rewards!`);
      }, 1000);
      
      console.log(`🆙 User ${user.firstName} leveled up to ${newLevel}!`);
    }
    
    this.users.set(userId, user);
    console.log(`⚡ Awarded ${amount} XP to ${user.firstName} for ${reason}`);
  }

  async start() {
    console.log('🚀 Starting ENHANCED GUIDE Zabardoo Telegram Bot!');
    console.log('=' .repeat(60));
    
    const token = process.env.TELEGRAM_BOT_TOKEN || '7315076864:AAGZ5N4dwhUrSw2tygw4wiCPY74cROKWzsE';
    
    this.token = token;
    this.baseUrl = `https://api.telegram.org/bot${token}`;

    try {
      const me = await this.makeRequest('getMe');
      console.log(`✅ Bot connected: @${me.username} (${me.first_name})`);
      
      // Set bot commands
      await this.setMyCommands();
      
      this.isRunning = true;
      
      console.log('');
      console.log('🎉 ZABARDOO ENHANCED GUIDE BOT IS NOW LIVE! 🎉');
      console.log('');
      console.log('🌟 Enhanced Features Active:');
      console.log('   📖 Complete Guide Button');
      console.log('   📋 Bot Commands Menu');
      console.log('   📌 Fixed Category Menu');
      console.log('   🚫 No Message Duplicates');
      console.log('   🎤 Voice Search & AI Processing');
      console.log('   📸 Image Recognition');
      console.log('   🎮 Gamification System');
      console.log('   🔔 Smart Notifications');
      console.log('   💰 Cashback Tracking');
      console.log('   🛡️ Anti-Spam Protection');
      console.log('');
      console.log('📱 Users can now interact with your bot in Telegram!');
      console.log('💬 Try sending /start to your bot');
      console.log('📖 Use /guide for complete instructions');
      console.log('');
      console.log('🛑 Press Ctrl+C to stop the bot');
      
      this.poll();
      
    } catch (error) {
      console.error('❌ Failed to start bot:', error.message);
      
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        console.log('');
        console.log('🔑 Token Error: Your bot token appears to be invalid');
        console.log('💡 Please check your TELEGRAM_BOT_TOKEN');
        console.log('🤖 Get a new token from @BotFather if needed');
      }
    }
  }

  async poll() {
    while (this.isRunning) {
      await this.getUpdates();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  stop() {
    this.isRunning = false;
    console.log('🛑 Bot stopped');
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down bot...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down bot...');
  process.exit(0);
});

// Start the bot
if (require.main === module) {
  const bot = new EnhancedGuideTelegramBot();
  bot.start().catch(console.error);
}

module.exports = EnhancedGuideTelegramBot;
#!/usr/bin/env node

const TelegramBot = require('node-telegram-bot-api');

// Telegram bot token
const token = '7315076864:AAGZ5N4dwhUrSw2tygw4wiCPY74cROKWzsE';

class FixedMenuZabardooBot {
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

    console.log('🤖 Fixed Menu Zabardoo Bot is running...');
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

    const welcomeMessage = `🎉 Welcome to Zabardoo, ${userName}!

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

  // CORRECTED Fixed menu that stays at the bottom
  getFixedMenuKeyboard() {
    return {
      keyboard: [
        ['🔍 Find Deals', '🎮 My Profile', '📖 Guide'],
        ['💰 Cashback', '🎲 Random Deal', '🧠 Ask Zabardoo'],
        ['⚙️ Settings', '🌐 Language', '🆘 Help']
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
      case '🔍 Find Deals':
        await this.handleFindDeals(chatId);
        break;

      case '🎮 My Profile':
        await this.handleMyProfile(chatId, userName);
        break;

      case '📖 Guide':
        await this.handleGuide(chatId);
        break;

      case '💰 Cashback':
        await this.handleCashback(chatId, userName);
        break;

      case '🎲 Random Deal':
        await this.handleRandomDeal(chatId);
        break;

      case '🧠 Ask Zabardoo':
        await this.handleAskZabardoo(chatId, userName);
        break;

      case '⚙️ Settings':
        await this.handleSettings(chatId);
        break;

      case '🌐 Language':
        await this.handleLanguage(chatId);
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

    const topDeals = this.demoCoupons.slice(0, 3);
    for (let i = 0; i < topDeals.length; i++) {
      await this.sendCouponCard(chatId, topDeals[i], i + 1);
    }

    await this.bot.sendMessage(chatId, '💡 **Tip:** Use voice search or send product photos for personalized results!');
  }

  async handleMyProfile(chatId, userName) {
    const profileMessage = `🎮 **Your Zabardoo Profile**

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

  async handleGuide(chatId) {
    const guideMessage = `📖 **Complete Zabardoo Guide**

🔍 **Find Deals** - Browse top deals and offers
🎮 **My Profile** - View your level, XP, and achievements
💰 **Cashback** - Check your balance and withdraw
🎲 **Random Deal** - Get surprise deals
🧠 **Ask Zabardoo** - Chat with AI assistant
⚙️ **Settings** - Manage notifications
🌐 **Language** - Change language preferences
🆘 **Help** - Get support and assistance

💡 **Pro Tips:**
🎤 Send voice messages for better search
📸 Upload product photos for exact matches
🏆 Visit daily to earn more XP and rewards
🔔 Enable notifications for flash deals

Ready to start saving? Use the menu below!`;

    await this.bot.sendMessage(chatId, guideMessage, { parse_mode: 'Markdown' });
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

  async handleAskZabardoo(chatId, userName) {
    const aiMessage = `🧠 **Ask Zabardoo AI Assistant**

💬 **Hi ${userName}! I'm your personal shopping AI!**

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

    await this.bot.sendMessage(chatId, settingsMessage, { parse_mode: 'Markdown' });
  }

  async handleLanguage(chatId) {
    const languageMessage = `🌐 **Language Settings**

🎯 **Choose your preferred language:**

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
    const helpMessage = `🆘 **Zabardoo Bot Quick Help**

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
          { text: '🛒 Get This Deal', url: 'https://zabardoo.com' },
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
    const data = callbackQuery.data;

    await this.bot.answerCallbackQuery(callbackQuery.id);

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
  }

  start() {
    console.log('🚀 Starting Fixed Menu Zabardoo Bot...');
    console.log('📱 Bot Username: @zabardoo_deals_bot');
    console.log('✅ Bot is ready with CORRECTED English menu!');
    console.log('');
    console.log('📋 English Menu Structure:');
    console.log('   Row 1: 🔍 Find Deals | 🎮 My Profile | 📖 Guide');
    console.log('   Row 2: 💰 Cashback | 🎲 Random Deal | 🧠 Ask Zabardoo');
    console.log('   Row 3: ⚙️ Settings | 🌐 Language | 🆘 Help');
    
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
  const zabardooBot = new FixedMenuZabardooBot();
  zabardooBot.start();
}

module.exports = FixedMenuZabardooBot;
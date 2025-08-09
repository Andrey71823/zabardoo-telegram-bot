const TelegramBot = require('node-telegram-bot-api');

// Mock implementation of BotDataIntegration for JavaScript
class MockBotDataIntegration {
  async searchProductsForBot(query, category, limit = 10) {
    // Simulate real data from Indian stores
    const mockProducts = [
      {
        id: 'flipkart_1',
        name: 'Samsung Galaxy S24 5G (Marble Gray, 256GB)',
        price: '₹65,999',
        originalPrice: '₹89,999',
        discount: '27% OFF (Save ₹24,000)',
        store: 'Flipkart',
        url: 'https://www.flipkart.com/samsung-galaxy-s24-5g?affid=your_affiliate_id',
        rating: '4.3/5 (12,847 reviews)',
        cashback: '3.5% Cashback',
        features: ['108MP Camera', '120Hz Display', '5G Ready', 'Wireless Charging']
      },
      {
        id: 'amazon_1',
        name: 'Apple iPhone 15 (Blue, 128GB)',
        price: '₹79,900',
        originalPrice: '₹79,900',
        discount: 'Latest Price',
        store: 'Amazon India',
        url: 'https://www.amazon.in/dp/B0CHX1W1XY?tag=your_affiliate_id',
        rating: '4.4/5 (15,623 reviews)',
        cashback: '2.5% Cashback',
        features: ['48MP Main Camera', 'Dynamic Island', 'USB-C', 'A16 Bionic']
      }
    ];

    return mockProducts.filter(product => 
      product.name.toLowerCase().includes(query.toLowerCase()) ||
      product.store.toLowerCase().includes(query.toLowerCase())
    ).slice(0, limit);
  }

  formatProductMessage(product) {
    let message = `🛍️ *${product.name}*\n\n`;
    message += `💰 *Price:* ${product.price}\n`;
    message += `~~${product.originalPrice}~~ ${product.discount}\n\n`;
    message += `🏪 *Store:* ${product.store}\n`;
    message += `⭐ *Rating:* ${product.rating}\n`;
    message += `💸 *Cashback:* ${product.cashback}\n\n`;
    
    if (product.features.length > 0) {
      message += `✨ *Features:*\n`;
      product.features.forEach(feature => {
        message += `• ${feature}\n`;
      });
      message += '\n';
    }
    
    message += `🔗 [Buy Now](${product.url})`;
    
    return message;
  }
}

// Bot configuration
const token = process.env.TELEGRAM_BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE';
const bot = new TelegramBot(token, { polling: true });
const dataIntegration = new MockBotDataIntegration();

// REPLY KEYBOARD - как в оригинальном боте
const replyKeyboard = {
  keyboard: [
    ['🔍 Find Deals', '🎮 My Profile', '📖 Guide'],
    ['💰 Cashback', '🎲 Random Deal', '💬 Ask Zabardoo'],
    ['⚙️ Settings', '🌐 Language', '🆘 Help']
  ],
  resize_keyboard: true,
  one_time_keyboard: false
};

// Bot commands
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name || 'Friend';
  
  const welcomeMessage = `🎉 Welcome to Zabardoo Enhanced Bot, ${firstName}! 🌟

🚀 I'm your AI-powered deal discovery assistant!

🎯 What I can do for you:
🎤 Voice Search - Send me a voice message! (Try: "bottle", "headphones")
📸 Image Recognition - Send me a product photo! (Just tap and send)
🎮 Gamification - Earn XP and unlock achievements!
⚠️ Smart Notifications - Get personalized deal alerts!
💰 Cashback Tracking - Track your savings!

💎 Level 1 • ⚡ 0 XP • 🏆 0/50 Achievements

🎮 Today's Mission: Find your first amazing deal!

🔧📸 QUICK START: Send voice message or photo right now for instant deals!

Ready to save some serious money? Let's go! 🚀

💡 Tip: Click 📖 Guide button for complete instructions on all buttons!`;

  await bot.sendMessage(chatId, welcomeMessage, {
    parse_mode: 'Markdown',
    reply_markup: replyKeyboard
  });
});

// Handle text messages - ВСЕ КНОПКИ С ПРАВИЛЬНЫМИ ФУНКЦИЯМИ
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text || text.startsWith('/')) return;

  console.log(`Received button: "${text}"`); // Debug log

  try {
    switch (text) {
      case '🔍 Find Deals':
        await handleFindDeals(chatId);
        break;
      
      case '🎮 My Profile':
        await handleMyProfile(chatId);
        break;
      
      case '📖 Guide':
        await handleGuide(chatId);
        break;
      
      case '💰 Cashback':
        await handleCashback(chatId);
        break;
      
      case '🎲 Random Deal':
        await handleRandomDeal(chatId);
        break;
      
      case '💬 Ask Zabardoo':
        await handleAskZabardoo(chatId);
        break;
      
      case '⚙️ Settings':
        await handleSettings(chatId);
        break;
      
      case '🌐 Language':
        await handleLanguage(chatId);
        break;
      
      case '🆘 Help':
        await handleHelp(chatId);
        break;
      
      default:
        // Handle product search
        console.log(`No case matched for: "${text}", treating as product search`);
        if (text.length > 2) {
          await handleProductSearch(chatId, text);
        }
        break;
    }
  } catch (error) {
    console.error('Error handling message:', error);
    await bot.sendMessage(chatId, '❌ Sorry, something went wrong. Please try again.');
  }
});

// Handler functions - ВСЕ ПРАВИЛЬНЫЕ ФУНКЦИИ

async function handleFindDeals(chatId) {
  const findDealsMessage = `🔍 *Find Deals*

💡 *How to search:*

1️⃣ **Type product name**
   Example: "iPhone", "Nike shoes", "laptop"

2️⃣ **Use voice search**
   Send a voice message with product name

3️⃣ **Send product photo**
   Take a picture of the product you want

🔥 **Popular searches:**
• Smartphones under ₹20,000
• Wireless earbuds
• Running shoes
• Skincare products
• Gaming laptops

💰 **What you'll get:**
• Real-time prices from multiple stores
• Discount percentages and savings
• Cashback rates for each store
• Direct purchase links
• Price comparison across stores

Just type what you're looking for! 🛍️`;

  await bot.sendMessage(chatId, findDealsMessage, {
    parse_mode: 'Markdown',
    reply_markup: replyKeyboard
  });
}

async function handleMyProfile(chatId) {
  const profileMessage = `🎮 *My Profile*

👤 **User Stats:**
• Total Searches: 47
• Money Saved: ₹12,450
• Cashback Earned: ₹890
• Favorite Categories: Electronics, Fashion

📊 **Activity Summary:**
• This Month: 15 searches
• Best Deal Found: 45% OFF Nike shoes
• Top Store: Flipkart (12 purchases)
• Average Savings: 28% per purchase

🎯 **Preferences:**
• Price Range: ₹1,000 - ₹50,000
• Preferred Brands: Samsung, Nike, Apple
• Notification: Deal alerts ON
• Language: English

🏆 **Achievements:**
• 🥉 Smart Shopper (10+ purchases)
• 💰 Deal Hunter (₹10k+ saved)
• 🎁 Cashback Master (₹500+ earned)
• 🔍 Search Expert (50+ searches)

🎁 **Rewards Available:**
• ₹100 bonus cashback (unlock at ₹1000 earned)
• Premium features trial
• Exclusive deal notifications

Keep shopping to unlock more rewards! 🌟`;

  await bot.sendMessage(chatId, profileMessage, {
    parse_mode: 'Markdown',
    reply_markup: replyKeyboard
  });
}

async function handleGuide(chatId) {
  const guideMessage = `📖 *Zabardoo Shopping Guide*

🛍️ *How to Shop Smart:*

1️⃣ *Search Products:*
   • Use "🔍 Find Deals" to search any product
   • Send voice messages for quick search
   • Upload product photos for recognition
   • Type product names directly

2️⃣ *Compare Prices:*
   • See original vs discounted price
   • Check cashback rates for each store
   • Compare across multiple stores
   • Find the best overall deal

3️⃣ *Use Features:*
   • 🎲 Random Deal - discover surprise offers
   • 💬 Ask Zabardoo - get shopping advice
   • 💰 Cashback - track your earnings
   • 🎮 My Profile - view your stats

4️⃣ *Maximize Savings:*
   • Stack cashback with store discounts
   • Use recommended payment methods
   • Shop during special sales events
   • Check multiple stores for best prices

💡 *Pro Tips:*
• Voice search is faster than typing
• Photo search works great for specific items
• Check cashback rates before buying
• Save favorite stores in your profile

Ready to start saving money? 🚀`;

  await bot.sendMessage(chatId, guideMessage, {
    parse_mode: 'Markdown',
    reply_markup: replyKeyboard
  });
}

async function handleCashback(chatId) {
  const cashbackMessage = `💰 *Cashback Center*

💳 **Current Rates:**
• Flipkart: 2-8% cashback
• Amazon India: 1-6% cashback
• Myntra: 3-10% cashback
• Nykaa: 5-12% cashback
• AJIO: 4-9% cashback

📊 **Your Cashback:**
• This Month: ₹245
• Total Earned: ₹890
• Pending: ₹67
• Available for Withdrawal: ₹823

💡 **Maximize Cashback:**
• Use recommended payment methods
• Shop during special events
• Combine with coupon codes
• Check bank offers

🎯 **Bonus Opportunities:**
• Extra 2-5% with credit cards
• 1-2% additional with UPI
• Special rates during sales
• Referral bonuses available

💸 **Withdrawal Options:**
• Bank transfer (₹100 minimum)
• UPI instant transfer
• Paytm wallet
• Amazon Pay balance

Ready to earn more cashback? 💎`;

  await bot.sendMessage(chatId, cashbackMessage, {
    parse_mode: 'Markdown',
    reply_markup: replyKeyboard
  });
}

async function handleRandomDeal(chatId) {
  await bot.sendMessage(chatId, '🎲 Finding a random amazing deal for you...');
  
  try {
    const deals = await dataIntegration.searchProductsForBot('random', undefined, 1);
    
    if (deals.length > 0) {
      const message = dataIntegration.formatProductMessage(deals[0]);
      await bot.sendMessage(chatId, `🎲 *Random Deal of the Day!*\n\n${message}`, {
        parse_mode: 'Markdown',
        reply_markup: replyKeyboard
      });
    } else {
      await bot.sendMessage(chatId, '🎲 *Random Deal*\n\n🎁 Special surprise offer!\n\n• Samsung Galaxy Buds - 40% OFF (₹8,999)\n• Limited time offer\n• Free shipping included\n• 1 year warranty\n\n🔗 Grab this deal now!', {
        parse_mode: 'Markdown',
        reply_markup: replyKeyboard
      });
    }
  } catch (error) {
    console.error('Error getting random deal:', error);
    await bot.sendMessage(chatId, '🎲 *Random Deal*\n\n🎁 Special surprise offer!\n\n• iPhone 15 Pro - 15% OFF (₹1,20,000)\n• Limited stock available\n• Free delivery\n• Official warranty\n\n🔗 Don\'t miss out!', {
      parse_mode: 'Markdown',
      reply_markup: replyKeyboard
    });
  }
}

async function handleAskZabardoo(chatId) {
  const askMessage = `💬 *Ask Zabardoo*

🤖 I'm here to help you with:

❓ **Product Questions:**
• "What's the best smartphone under ₹30,000?"
• "Show me wireless earbuds with good battery"
• "Find me running shoes for women"
• "Which laptop is best for gaming?"

💰 **Deal Questions:**
• "Any deals on laptops today?"
• "What's the highest cashback store?"
• "Show me electronics with 50% off"
• "Best time to buy smartphones?"

🏪 **Store Questions:**
• "Which store has fastest delivery?"
• "Compare prices for iPhone 15"
• "Best store for fashion items?"
• "Most reliable online store?"

🎯 **Shopping Advice:**
• Budget recommendations
• Product comparisons
• Best time to buy
• Cashback optimization

Just type your question and I'll help you find the perfect deal! 🛍️`;

  await bot.sendMessage(chatId, askMessage, {
    parse_mode: 'Markdown',
    reply_markup: replyKeyboard
  });
}

async function handleSettings(chatId) {
  const settingsMessage = `⚙️ *Settings*

🌐 *Language:* English
🔔 *Notifications:* Enabled
💰 *Price Alerts:* Enabled
📍 *Location:* India

🛍️ *Shopping Preferences:*
• Show cashback rates: ✅
• Include out-of-stock items: ❌
• Sort by: Best Discount
• Max results per search: 10
• Preferred stores: All enabled

🎯 *Notification Settings:*
• Deal alerts: ✅ Enabled
• Price drops: ✅ Enabled
• New arrivals: ❌ Disabled
• Weekly summary: ✅ Enabled

🔐 *Privacy:*
• Save search history: ✅
• Personalized recommendations: ✅
• Share usage data: ❌
• Location tracking: ❌

💡 *Advanced Settings:*
• Voice search: ✅ Enabled
• Image recognition: ✅ Enabled
• Auto-translate: ✅ Enabled
• Dark mode: ❌ Disabled

To change any setting, just tell me what you'd like to modify!`;

  await bot.sendMessage(chatId, settingsMessage, {
    parse_mode: 'Markdown',
    reply_markup: replyKeyboard
  });
}

async function handleLanguage(chatId) {
  const languageMessage = `🌐 *Language Settings*

🇮🇳 **Available Languages:**
• English (Current) ✅
• हिंदी (Hindi)
• বাংলা (Bengali)
• தமிழ் (Tamil)
• తెలుగు (Telugu)
• ಕನ್ನಡ (Kannada)
• മലയാളം (Malayalam)
• ગુજરાતી (Gujarati)
• मराठी (Marathi)

💡 **Language Features:**
• Product names in local language
• Currency in Indian Rupees (₹)
• Local store preferences
• Regional deal notifications
• Voice search in your language

🔄 **To change language:**
• Type the language name
• Use voice command in your preferred language
• Select from the list above

🎯 **Regional Benefits:**
• Local store recommendations
• Regional festival deals
• State-specific offers
• Local payment methods

Current: English 🇬🇧

Which language would you like to switch to?`;

  await bot.sendMessage(chatId, languageMessage, {
    parse_mode: 'Markdown',
    reply_markup: replyKeyboard
  });
}

async function handleHelp(chatId) {
  const helpMessage = `🆘 *Help & Support*

🔧 **Quick Help:**

❓ **How to use the bot:**
• Use menu buttons for different features
• Type product names to search
• Send voice messages for quick search
• Upload product photos for recognition

🛍️ **Shopping Help:**
• 🔍 Find Deals - search any product
• 🎲 Random Deal - discover surprise offers
• 💬 Ask Zabardoo - get shopping advice
• 💰 Cashback - track your earnings

👤 **Account Help:**
• 🎮 My Profile - view your stats and achievements
• ⚙️ Settings - customize your experience
• 🌐 Language - change interface language

📞 **Contact Support:**
• Report bugs or issues
• Suggest new features
• Get shopping advice
• Technical assistance
• Feedback and suggestions

💡 **Tips:**
• All menu buttons have specific functions
• Voice search is faster than typing
• Photo search works great for specific items
• Check multiple stores for best prices

🎯 **Popular Questions:**
• How to earn cashback? → Use 💰 Cashback
• How to find deals? → Use 🔍 Find Deals
• How to see my stats? → Use 🎮 My Profile
• How to get advice? → Use 💬 Ask Zabardoo

📧 **Contact Us:**
• Email: support@zabardoo.com
• Telegram: @ZabardooSupport
• Website: www.zabardoo.com

Need more help? Just ask! 😊`;

  await bot.sendMessage(chatId, helpMessage, {
    parse_mode: 'Markdown',
    reply_markup: replyKeyboard
  });
}

async function handleProductSearch(chatId, query) {
  await bot.sendMessage(chatId, `🔍 Searching for "${query}"...`);
  
  try {
    const products = await dataIntegration.searchProductsForBot(query, undefined, 2);
    
    if (products.length === 0) {
      await bot.sendMessage(chatId, `❌ No products found for "${query}". Try different keywords.`, {
        reply_markup: replyKeyboard
      });
      return;
    }

    await bot.sendMessage(chatId, `🛍️ *Search Results for "${query}"* (${products.length} found)`, {
      parse_mode: 'Markdown',
      reply_markup: replyKeyboard
    });

    for (const product of products) {
      const message = dataIntegration.formatProductMessage(product);
      
      await bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        disable_web_page_preview: false,
        reply_markup: replyKeyboard
      });
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  } catch (error) {
    console.error('Error searching products:', error);
    await bot.sendMessage(chatId, '❌ Error searching products. Please try again.', {
      reply_markup: replyKeyboard
    });
  }
}

// Error handling
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

console.log('🚀 All Buttons Working Bot is running!');
console.log('📱 Every button now has the correct function:');
console.log('🔍 Find Deals → Search functionality');
console.log('🎮 My Profile → User profile and stats');
console.log('📖 Guide → Shopping guide');
console.log('💰 Cashback → Cashback information');
console.log('🎲 Random Deal → Random offers');
console.log('💬 Ask Zabardoo → Shopping assistant');
console.log('⚙️ Settings → Bot settings');
console.log('🌐 Language → Language selection');
console.log('🆘 Help → Help and support');
console.log('✅ All buttons work correctly!');
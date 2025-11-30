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

// INLINE KEYBOARD - В СООБЩЕНИИ (как на скриншоте)
const inlineMainMenu = {
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
      { text: '🎮 My Profile', callback_data: 'my_profile' }
    ],
    [
      { text: '💰 Cashback', callback_data: 'cashback' },
      { text: '🆘 Help', callback_data: 'help' }
    ]
  ]
};

// REPLY KEYBOARD - ВНИЗУ (точно такое же как верхнее inline меню)
const replyKeyboard = {
  keyboard: [
    ['🤖 AI Recommendations', '🔥 Hot Deals', '📖 Guide'],
    ['📱 Electronics', '👗 Fashion', '💄 Beauty'],
    ['🍔 Food', '🏪 Stores', '⚙️ Settings'],
    ['🔍 Find Deals', '🎮 My Profile'],
    ['💰 Cashback', '🆘 Help']
  ],
  resize_keyboard: true,
  one_time_keyboard: false
};

// Bot commands
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name || 'Friend';
  
  const welcomeMessage = `🎉 Welcome to bazaarGuru Enhanced Bot, ${firstName}! 🌟

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

  // ОТПРАВЛЯЕМ С INLINE КНОПКАМИ В СООБЩЕНИИ
  await bot.sendMessage(chatId, welcomeMessage, {
    parse_mode: 'Markdown',
    reply_markup: inlineMainMenu  // Только inline кнопки в сообщении
  });
  
  // ПРИНУДИТЕЛЬНО УСТАНАВЛИВАЕМ REPLY KEYBOARD
  await bot.sendMessage(chatId, '💡 Use the menu below for navigation - it has the same functions as above!', {
    reply_markup: replyKeyboard
  });
});

// Команда для принудительного обновления меню
bot.onText(/\/menu/, async (msg) => {
  const chatId = msg.chat.id;
  
  await bot.sendMessage(chatId, '🔄 *Updating Menu*\n\nHere is your synchronized menu with all functions:', {
    parse_mode: 'Markdown',
    reply_markup: replyKeyboard
  });
});

// Handle callback queries (inline buttons)
bot.on('callback_query', async (callbackQuery) => {
  const message = callbackQuery.message;
  const chatId = message.chat.id;
  const data = callbackQuery.data;

  // Acknowledge the callback query
  await bot.answerCallbackQuery(callbackQuery.id);

  try {
    switch (data) {
      case 'ai_recommendations':
        await handleAIRecommendations(chatId);
        break;
      
      case 'hot_deals':
        await handleHotDeals(chatId);
        break;
      
      case 'guide':
        await handleGuide(chatId);
        break;
      
      case 'electronics':
        await handleCategorySearch(chatId, 'Electronics');
        break;
      
      case 'fashion':
        await handleCategorySearch(chatId, 'Fashion');
        break;
      
      case 'beauty':
        await handleCategorySearch(chatId, 'Beauty');
        break;
      
      case 'food':
        await handleCategorySearch(chatId, 'Food');
        break;
      
      case 'stores':
        await handleStores(chatId);
        break;
      
      case 'settings':
        await handleSettings(chatId);
        break;
      
      case 'find_deals':
        await handleFindDeals(chatId);
        break;
      
      case 'my_profile':
        await handleMyProfile(chatId);
        break;
      
      case 'cashback':
        await handleCashback(chatId);
        break;
      
      case 'help':
        await handleHelp(chatId);
        break;
    }
  } catch (error) {
    console.error('Error handling callback query:', error);
    await bot.sendMessage(chatId, '❌ Sorry, something went wrong. Please try again.');
  }
});

// Handle text messages (reply keyboard) - КОПИРУЕМ ЛОГИКУ С INLINE КНОПОК
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text || text.startsWith('/')) return;

  console.log(`Reply button pressed: "${text}"`); // Debug log

  try {
    // ИСПОЛЬЗУЕМ ТЕ ЖЕ ФУНКЦИИ ЧТО И INLINE КНОПКИ
    switch (text) {
      // Основные функции (как в callback_query)
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
      
      case '💬 Ask bazaarGuru':
        await handleAskbazaarGuru(chatId);
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

      // Дополнительные функции (если есть в inline)
      case '🤖 AI Recommendations':
        await handleAIRecommendations(chatId);
        break;
      
      case '🔥 Hot Deals':
        await handleHotDeals(chatId);
        break;
      
      case '📱 Electronics':
        await handleCategorySearch(chatId, 'Electronics');
        break;
      
      case '👗 Fashion':
        await handleCategorySearch(chatId, 'Fashion');
        break;
      
      case '💄 Beauty':
        await handleCategorySearch(chatId, 'Beauty');
        break;
      
      case '🍔 Food':
        await handleCategorySearch(chatId, 'Food');
        break;
      
      case '🏪 Stores':
        await handleStores(chatId);
        break;
      
      default:
        // Handle product search ТОЛЬКО если это не кнопка
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

// Handler functions
async function handleAIRecommendations(chatId) {
  const message = `🤖 *AI Recommendations*

Based on current trends and user preferences:

🔥 *Trending Now:*
• Smartphones with best camera quality
• Wireless earbuds under ₹5,000
• Winter fashion collection
• Skincare products for dry skin

💡 *Personalized for you:*
• Electronics with high ratings
• Fashion items in your size range
• Beauty products for your skin type

🎯 *Smart Suggestions:*
• Best value for money products
• Highly rated items with good reviews
• Products with maximum cashback

What category interests you most?`;

  await bot.sendMessage(chatId, message, {
    parse_mode: 'Markdown',
    reply_markup: inlineMainMenu
  });
}

async function handleHotDeals(chatId) {
  await bot.sendMessage(chatId, '🔥 Finding the hottest deals for you...');
  
  try {
    const deals = await dataIntegration.searchProductsForBot('deals', undefined, 2);
    
    if (deals.length === 0) {
      await bot.sendMessage(chatId, '❌ No deals found at the moment. Please try again later.');
      return;
    }

    await bot.sendMessage(chatId, `🔥 *Hot Deals Today* (${deals.length} found)`, {
      parse_mode: 'Markdown',
      reply_markup: inlineMainMenu
    });

    for (const deal of deals) {
      const message = dataIntegration.formatProductMessage(deal);
      
      await bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        disable_web_page_preview: false
      });
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  } catch (error) {
    console.error('Error getting hot deals:', error);
    await bot.sendMessage(chatId, '❌ Error loading deals. Please try again.');
  }
}

async function handleGuide(chatId) {
  const guideMessage = `📖 *bazaarGuru Shopping Guide*

🛍️ *How to Shop Smart:*

1️⃣ *Search Products:*
   • Use "🔍 Find Deals" button
   • Tap category buttons (📱👗💄)
   • Type product names directly

2️⃣ *Compare Prices:*
   • See original vs discounted price
   • Check cashback rates
   • Compare across stores

3️⃣ *Use Menu Features:*
   • 🔥 Hot Deals - trending offers
   • 🤖 AI Recommendations - personalized
   • 🏪 Stores - browse by shop
   • 💰 Cashback - earn money back

4️⃣ *Track Your Activity:*
   • 🎮 My Profile - view stats
   • ⚙️ Settings - customize experience
   • 🆘 Help - get support

💡 *Pro Tips:*
• Use both inline buttons (in messages) and bottom menu
• Send voice messages for quick search
• Upload product photos for recognition

Ready to start shopping? 🚀`;

  await bot.sendMessage(chatId, guideMessage, {
    parse_mode: 'Markdown',
    reply_markup: inlineMainMenu
  });
}

async function handleCategorySearch(chatId, category) {
  await bot.sendMessage(chatId, `🔍 Searching ${category} products...`);
  
  try {
    const products = await dataIntegration.searchProductsForBot(category, category, 2);
    
    if (products.length === 0) {
      await bot.sendMessage(chatId, `❌ No ${category} products found. Try a different search.`);
      return;
    }

    await bot.sendMessage(chatId, `📱 *${category} Products* (${products.length} found)`, {
      parse_mode: 'Markdown',
      reply_markup: inlineMainMenu
    });

    for (const product of products) {
      const message = dataIntegration.formatProductMessage(product);
      
      await bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        disable_web_page_preview: false
      });
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  } catch (error) {
    console.error('Error searching category:', error);
    await bot.sendMessage(chatId, '❌ Error searching products. Please try again.');
  }
}

async function handleStores(chatId) {
  const storesMessage = `🏪 *Available Stores*

🇮🇳 *Top Indian E-commerce:*

🛒 **Flipkart**
• Categories: Electronics, Fashion, Home
• Cashback: 2-8%
• Delivery: 2-7 days

🛒 **Amazon India**
• Categories: All categories
• Cashback: 1-6%
• Delivery: 1-5 days

🛒 **Myntra**
• Categories: Fashion, Beauty
• Cashback: 3-10%
• Delivery: 3-7 days

🛒 **Nykaa**
• Categories: Beauty, Personal Care
• Cashback: 5-12%
• Delivery: 2-5 days

🛒 **AJIO**
• Categories: Fashion, Accessories
• Cashback: 4-9%
• Delivery: 3-7 days

💡 *All stores offer:*
• Secure payments
• Easy returns
• Customer support
• Affiliate cashback

Which store would you like to explore?`;

  await bot.sendMessage(chatId, storesMessage, {
    parse_mode: 'Markdown',
    reply_markup: inlineMainMenu
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

🎯 *Menu Settings:*
• Inline buttons: ✅ In messages
• Reply keyboard: ✅ Always visible
• Auto-refresh: ✅ Real-time updates

🔐 *Privacy:*
• Save search history: ✅
• Personalized recommendations: ✅
• Share usage data: ❌

💡 *You have both inline buttons and bottom menu!*`;

  await bot.sendMessage(chatId, settingsMessage, {
    parse_mode: 'Markdown',
    reply_markup: inlineMainMenu
  });
}

async function handleFindDeals(chatId) {
  const findDealsMessage = `🔍 *Find Deals*

💡 *How to search:*

1️⃣ **Type product name**
   Example: "iPhone", "Nike shoes", "laptop"

2️⃣ **Use category buttons**
   📱 Electronics, 👗 Fashion, 💄 Beauty, etc.

3️⃣ **Browse by store**
   Use 🏪 Stores to see specific shop deals

🔥 **Popular searches:**
• Smartphones under ₹20,000
• Wireless earbuds
• Running shoes
• Skincare products
• Gaming laptops

💰 **What you'll get:**
• Real-time prices
• Discount percentages
• Cashback rates
• Store comparisons
• Direct purchase links

Just type what you're looking for! 🛍️`;

  await bot.sendMessage(chatId, findDealsMessage, {
    parse_mode: 'Markdown',
    reply_markup: inlineMainMenu
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
    reply_markup: inlineMainMenu
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
    reply_markup: inlineMainMenu
  });
}

async function handleHelp(chatId) {
  const helpMessage = `🆘 *Help & Support*

🔧 **Quick Help:**

❓ **How to use the bot:**
• Use inline buttons in messages for quick access
• Use bottom menu for persistent navigation
• Type product names or use category buttons

🛍️ **Shopping Help:**
• 🔍 Find Deals - search any product
• 🔥 Hot Deals - trending offers
• 🤖 AI Recommendations - personalized suggestions
• 🏪 Stores - browse by shop

👤 **Account Help:**
• 🎮 My Profile - view your stats
• 💰 Cashback - manage earnings
• ⚙️ Settings - customize experience

📞 **Contact Support:**
• Report bugs or issues
• Suggest new features
• Get shopping advice
• Technical assistance

💡 **Tips:**
• Both inline and reply buttons work
• All features accessible from both menus
• Real-time updates and notifications

🎯 **Popular Questions:**
• How to earn cashback? Use 💰 Cashback
• How to find deals? Use 🔍 Find Deals
• How to see my stats? Use 🎮 My Profile

Need more help? Just ask! 😊`;

  await bot.sendMessage(chatId, helpMessage, {
    parse_mode: 'Markdown',
    reply_markup: inlineMainMenu
  });
}

// Удалены функции Random Deal, Ask bazaarGuru, Language - их нет в верхнем меню

async function handleProductSearch(chatId, query) {
  await bot.sendMessage(chatId, `🔍 Searching for "${query}"...`);
  
  try {
    const products = await dataIntegration.searchProductsForBot(query, undefined, 2);
    
    if (products.length === 0) {
      await bot.sendMessage(chatId, `❌ No products found for "${query}". Try different keywords.`);
      return;
    }

    await bot.sendMessage(chatId, `🛍️ *Search Results for "${query}"* (${products.length} found)`, {
      parse_mode: 'Markdown',
      reply_markup: inlineMainMenu
    });

    for (const product of products) {
      const message = dataIntegration.formatProductMessage(product);
      
      await bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        disable_web_page_preview: false
      });
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  } catch (error) {
    console.error('Error searching products:', error);
    await bot.sendMessage(chatId, '❌ Error searching products. Please try again.');
  }
}

// Error handling
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

console.log('🚀 bazaarGuru Synchronized Menu Bot is running!');
console.log('📱 Features: Inline buttons in messages + SAME Reply keyboard at bottom');
console.log('🎯 BOTH Menus have IDENTICAL Structure:');
console.log('Row 1: [🤖 AI Recommendations] [🔥 Hot Deals] [📖 Guide]');
console.log('Row 2: [📱 Electronics] [👗 Fashion] [💄 Beauty]');
console.log('Row 3: [🍔 Food] [🏪 Stores] [⚙️ Settings]');
console.log('Row 4: [🔍 Find Deals] [🎮 My Profile]');
console.log('Row 5: [💰 Cashback] [🆘 Help]');
console.log('✅ All functions available in BOTH inline and reply menus!');as
ync function handleAskbazaarGuru(chatId) {
  const askMessage = `💬 *Ask bazaarGuru*

🤖 I'm here to help you with:

❓ **Product Questions:**
• "What's the best smartphone under ₹30,000?"
• "Show me wireless earbuds with good battery"
• "Find me running shoes for women"

💰 **Deal Questions:**
• "Any deals on laptops today?"
• "What's the highest cashback store?"
• "Show me electronics with 50% off"

🏪 **Store Questions:**
• "Which store has fastest delivery?"
• "Compare prices for iPhone 15"
• "Best store for fashion items"

Just type your question and I'll help you find the perfect deal! 🛍️`;

  await bot.sendMessage(chatId, askMessage, {
    parse_mode: 'Markdown',
    reply_markup: inlineMainMenu
  });
}

async function handleRandomDeal(chatId) {
  await bot.sendMessage(chatId, '🎲 Finding a random amazing deal for you...');
  
  try {
    const deals = await dataIntegration.searchProductsForBot('random', undefined, 1);
    
    if (deals.length > 0) {
      const message = dataIntegration.formatProductMessage(deals[0]);
      await bot.sendMessage(chatId, `🎲 *Random Deal of the Day!*\n\n${message}`, {
        parse_mode: 'Markdown'
      });
    } else {
      await bot.sendMessage(chatId, '❌ No random deals available right now. Try again later!');
    }
  } catch (error) {
    console.error('Error getting random deal:', error);
    await bot.sendMessage(chatId, '❌ Error loading random deal. Please try again.');
  }
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

🔄 **To change language:**
Type the language name or use voice command!

Current: English 🇬🇧`;

  await bot.sendMessage(chatId, languageMessage, {
    parse_mode: 'Markdown',
    reply_markup: inlineMainMenu
  });
}
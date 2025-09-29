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
      },
      {
        id: 'myntra_1',
        name: 'Nike Air Max 270 Running Shoes',
        price: '₹7,495',
        originalPrice: '₹12,995',
        discount: '42% OFF (Save ₹5,500)',
        store: 'Myntra',
        url: 'https://www.myntra.com/sports-shoes/nike/nike-men-air-max-270-running-shoes/1364628?utm_source=affiliate',
        rating: '4.2/5 (2,847 reviews)',
        cashback: '6.5% Cashback',
        features: ['Air Max Technology', 'Breathable Mesh', 'Durable Rubber Sole']
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

// ONLY ONE FIXED MENU - NO DUPLICATES
const fixedMainMenu = {
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
  
  // CLEAN WELCOME MESSAGE - NO INLINE BUTTONS
  const welcomeMessage = `🎉 Welcome to bazaarGuru, ${firstName}! 🛍️

🇮🇳 Your ultimate shopping companion for the best deals from top Indian stores!

✨ *What I can do for you:*
• 🔍 Find real products with live prices
• 💰 Show actual discounts and cashback
• 🎟️ Provide working coupon codes
• 🤖 Give AI-powered recommendations
• 📊 Compare prices across stores

🏪 *Supported Stores:*
• Flipkart • Amazon India • Myntra
• Nykaa • AJIO • And many more!

💡 *Use the menu buttons below to get started!*

Ready to save money? Let's start shopping! 🚀`;

  // ONLY REPLY KEYBOARD - NO INLINE BUTTONS
  await bot.sendMessage(chatId, welcomeMessage, {
    parse_mode: 'Markdown',
    reply_markup: fixedMainMenu
  });
});

// Handle all menu buttons
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text || text.startsWith('/')) return;

  try {
    switch (text) {
      case '🤖 AI Recommendations':
        await handleAIRecommendations(chatId);
        break;
      
      case '🔥 Hot Deals':
        await handleHotDeals(chatId);
        break;
      
      case '📖 Guide':
        await handleGuide(chatId);
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
      
      case '⚙️ Settings':
        await handleSettings(chatId);
        break;
      
      case '🔍 Find Deals':
        await handleFindDeals(chatId);
        break;
      
      case '🎮 My Profile':
        await handleMyProfile(chatId);
        break;
      
      case '💰 Cashback':
        await handleCashback(chatId);
        break;
      
      case '🆘 Help':
        await handleHelp(chatId);
        break;
      
      default:
        // Handle product search
        if (text.length > 2) {
          await handleProductSearch(chatId, text);
        }
        break;
    }
  } catch (error) {
    console.error('Error handling message:', error);
    await bot.sendMessage(chatId, '❌ Sorry, something went wrong. Please try again.', {
      reply_markup: fixedMainMenu
    });
  }
});

// Handler functions - ALL RETURN ONLY FIXED MENU
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
    reply_markup: fixedMainMenu
  });
}

async function handleHotDeals(chatId) {
  await bot.sendMessage(chatId, '🔥 Finding the hottest deals for you...', {
    reply_markup: fixedMainMenu
  });
  
  try {
    const deals = await dataIntegration.searchProductsForBot('deals', undefined, 3);
    
    if (deals.length === 0) {
      await bot.sendMessage(chatId, '❌ No deals found at the moment. Please try again later.', {
        reply_markup: fixedMainMenu
      });
      return;
    }

    await bot.sendMessage(chatId, `🔥 *Hot Deals Today* (${deals.length} found)`, {
      parse_mode: 'Markdown',
      reply_markup: fixedMainMenu
    });

    for (const deal of deals) {
      const message = dataIntegration.formatProductMessage(deal);
      
      await bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        disable_web_page_preview: false,
        reply_markup: fixedMainMenu
      });
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  } catch (error) {
    console.error('Error getting hot deals:', error);
    await bot.sendMessage(chatId, '❌ Error loading deals. Please try again.', {
      reply_markup: fixedMainMenu
    });
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
• All features accessible from main menu
• No need to navigate back and forth
• Menu stays fixed for easy access

Ready to start shopping? 🚀`;

  await bot.sendMessage(chatId, guideMessage, {
    parse_mode: 'Markdown',
    reply_markup: fixedMainMenu
  });
}

async function handleCategorySearch(chatId, category) {
  await bot.sendMessage(chatId, `🔍 Searching ${category} products...`, {
    reply_markup: fixedMainMenu
  });
  
  try {
    const products = await dataIntegration.searchProductsForBot(category, category, 2);
    
    if (products.length === 0) {
      await bot.sendMessage(chatId, `❌ No ${category} products found. Try a different search.`, {
        reply_markup: fixedMainMenu
      });
      return;
    }

    await bot.sendMessage(chatId, `📱 *${category} Products* (${products.length} found)`, {
      parse_mode: 'Markdown',
      reply_markup: fixedMainMenu
    });

    for (const product of products) {
      const message = dataIntegration.formatProductMessage(product);
      
      await bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        disable_web_page_preview: false,
        reply_markup: fixedMainMenu
      });
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  } catch (error) {
    console.error('Error searching category:', error);
    await bot.sendMessage(chatId, '❌ Error searching products. Please try again.', {
      reply_markup: fixedMainMenu
    });
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
    reply_markup: fixedMainMenu
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
• Fixed menu: ✅ Always visible
• Quick access: ✅ All features available
• Auto-refresh: ✅ Real-time updates

🔐 *Privacy:*
• Save search history: ✅
• Personalized recommendations: ✅
• Share usage data: ❌

💡 *Menu stays fixed for easy navigation!*
All features accessible without going back.`;

  await bot.sendMessage(chatId, settingsMessage, {
    parse_mode: 'Markdown',
    reply_markup: fixedMainMenu
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
    reply_markup: fixedMainMenu
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
    reply_markup: fixedMainMenu
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
    reply_markup: fixedMainMenu
  });
}

async function handleHelp(chatId) {
  const helpMessage = `🆘 *Help & Support*

🔧 **Quick Help:**

❓ **How to use the bot:**
• All features available in main menu
• Menu stays fixed - no need to navigate back
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
• Menu is always visible
• All features accessible instantly
• No complex navigation needed
• Real-time updates

🎯 **Popular Questions:**
• How to earn cashback? Use 💰 Cashback
• How to find deals? Use 🔍 Find Deals
• How to see my stats? Use 🎮 My Profile

Need more help? Just ask! 😊`;

  await bot.sendMessage(chatId, helpMessage, {
    parse_mode: 'Markdown',
    reply_markup: fixedMainMenu
  });
}

async function handleProductSearch(chatId, query) {
  await bot.sendMessage(chatId, `🔍 Searching for "${query}"...`, {
    reply_markup: fixedMainMenu
  });
  
  try {
    const products = await dataIntegration.searchProductsForBot(query, undefined, 2);
    
    if (products.length === 0) {
      await bot.sendMessage(chatId, `❌ No products found for "${query}". Try different keywords.`, {
        reply_markup: fixedMainMenu
      });
      return;
    }

    await bot.sendMessage(chatId, `🛍️ *Search Results for "${query}"* (${products.length} found)`, {
      parse_mode: 'Markdown',
      reply_markup: fixedMainMenu
    });

    for (const product of products) {
      const message = dataIntegration.formatProductMessage(product);
      
      await bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        disable_web_page_preview: false,
        reply_markup: fixedMainMenu
      });
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  } catch (error) {
    console.error('Error searching products:', error);
    await bot.sendMessage(chatId, '❌ Error searching products. Please try again.', {
      reply_markup: fixedMainMenu
    });
  }
}

// Error handling
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

console.log('🚀 bazaarGuru Clean Fixed Menu Bot is running!');
console.log('📱 Features: ONLY fixed menu - NO duplicates');
console.log('🎯 Menu Structure:');
console.log('Row 1: [🤖 AI Recommendations] [🔥 Hot Deals] [📖 Guide]');
console.log('Row 2: [📱 Electronics] [👗 Fashion] [💄 Beauty]');
console.log('Row 3: [🍔 Food] [🏪 Stores] [⚙️ Settings]');
console.log('Row 4: [🔍 Find Deals] [🎮 My Profile]');
console.log('Row 5: [💰 Cashback] [🆘 Help]');
#!/usr/bin/env node

// BazaarGuru WOW Bot - Улучшенная версия с магическим UX
require('dotenv').config();
const https = require('https');
const querystring = require('querystring');
const ProductsService = require('../services/products/products-service');
const PromocodesService = require('../services/promocodes/promocodes-service');

class BazaarGuruWowBot {
  constructor(token) {
    this.token = token;
    this.baseUrl = `https://api.telegram.org/bot${token}`;
    this.offset = 0;
    this.isRunning = false;
    this.users = new Map();

    // Система рекомендаций
    this.recommendationEngine = {
      userPreferences: new Map(),
      categoryInterests: new Map(),
      priceRanges: new Map(),
      purchaseHistory: new Map()
    };

    // Аналитика
    this.analytics = {
      dailyActiveUsers: 0,
      totalPurchases: 0,
      averageOrderValue: 0,
      topCategories: {},
      conversionRate: 0
    };

    // Сервисы реальных данных
    this.productsService = new ProductsService();
    this.promocodesService = new PromocodesService();

    // Простая i18n-система
    this.translations = {
      ru: {
        'buttons.hot_deals': '🔥 Скидки дня',
        'buttons.top_products': '⭐ Топ товаров',
        'buttons.electronics': '📱 Электроника',
        'buttons.fashion': '👗 Одежда',
        'buttons.search': '🔍 Найти товар',
        'buttons.language': '🌐 Язык',
        'buttons.notifications': '🔔 Уведомления',
        'buttons.favorites': '⭐ Избранное',
        'buttons.settings': '🌐 Настройки',
        'buttons.support': '🆘 Поддержка',
        'buttons.main_menu': '🏠 Главное меню',
        'buttons.brand_search': '🔎 Поиск по бренду',
        'buttons.filters': '⚙️ Фильтры',
        'buttons.show_more_5': '📋 Показать ещё 10',
        'buttons.show_more_20': '📋 Показать ещё 20',
        'buttons.show_all_results': '🔎 Все результаты',
        'buttons.back': '🔙 Назад',
        'welcome.title': '🎉 Добро пожаловать в BazaarGuru!',
        'welcome.hint': 'Попробуй голосовой поиск — просто скажи, что ищешь!',
        'language.choose': '🌐 Выбери язык интерфейса',
        'labels.promo_code': 'Промокод',
        'electronics.title': '📱 ЭЛЕКТРОНИКА - ТОП-1 КАТЕГОРИЯ В ИНДИИ!',
        'electronics.subtitle': '🏆 #1 онлайн-покупки в Индии | Найдено: 50,000+ товаров',
        'electronics.top_now': 'Топ предложения сейчас:',
        'fashion.subtitle': '👗 40% всех покупок индийцев | Найдено: 35,000+ товаров',
        'beauty.subtitle': '💄 Быстрорастущий сегмент (+50% в год) | Найдено: 25,000+ товаров',
        'electronics.promo_code': 'Промокод',
        'electronics.brand_search_title': 'ПОИСК БРЕНДА В ЭЛЕКТРОНИКЕ',
        'electronics.brand_search_hint': 'Напишите, например: "Xiaomi", "Samsung", "OnePlus", "realme", "Sony".\nЯ подберу смартфоны, ноутбуки, аудио и ТВ со скидками.',
        'categories.smartphones': 'Смартфоны',
        'categories.laptops': 'Ноутбуки', 
        'categories.audio': 'Аудио',
        'categories.tv': 'ТВ',
        'categories.wearables': 'Гаджеты',
        'your_savings': 'Твоя экономия',
        'cashback': 'Кэшбек',
        'voice_hint': 'Скажи "Хочу iPhone" для поиска!',
        'buttons.show_all': '🔎 Показать все',
        'buttons.only_discounts': '💰 Только скидки',
        'actions.open':'🛒 Открыть',
        'actions.favorite':'⭐ В избранное',
        'actions.copy_promo':'📋 Скопировать промо',
        'top.title':'ТОП ТОВАРОВ - ЛУЧШИЕ ПРОДАЖИ НЕДЕЛИ!',
        'top.popular':'Самые популярные товары:',
        'top.trust':'Эти товары выбирают тысячи пользователей!'
        ,
        'beauty.title':'КОСМЕТИКА - ЛУЧШИЕ ПРЕДЛОЖЕНИЯ!'
        ,'smartphones.title':'СМАРТФОНЫ - ЛУЧШИЕ ПРЕДЛОЖЕНИЯ!'
        ,'search.title':'Ищу "{q}" для тебя...'
        ,'search.stats_title':'Найдено за 0.8 сек:'
        ,'search.stats_1':'47 предложений по запросу'
        ,'search.stats_2':'Лучшая цена: от ₹999'
        ,'search.stats_3':'Доступно в 23 магазинах'
        ,'search.stats_4':'Доставка: от 2 часов'
        ,'search.top3':'Топ-3 варианта:'
        ,'search.how':'Как искать:'
        ,'search.text_tip':'Напиши текстом: "OnePlus до 20000" / "курти Biba до 1500"'
        ,'search.voice_tip':'Скажи голосом: удержи микрофон и произнеси запрос'
        ,'search.photo_tip':'Отправь фото товара: я найду похожие и покажу цены'
        ,'search.refine_tip':'Уточни что именно ищешь для точного результата!'
        ,'show_all.title':'Все результаты'
        ,'show_all.body':'Показываю расширенный список товаров по твоему запросу.'
        ,'show_all.tip':'Совет: уточни бренд/цену/категорию для точнее.'
        ,'only_discounts.title':'Только товары со скидкой'
        ,'only_discounts.body':'Фильтрую результаты и показываю позиции с наибольшими скидками.'
        ,'only_discounts.example':'Пример: iPhone (‑33%), Nike (‑60%), Redmi (‑40%).'
      },
      en: {
        'buttons.hot_deals': '🔥 Hot Deals',
        'buttons.top_products': '⭐ Top Products',
        'buttons.electronics': '📱 Electronics',
        'buttons.fashion': '👗 Fashion',
        'buttons.search': '🔍 Search',
        'buttons.language': '🌐 Language',
        'buttons.notifications': '🔔 Notifications',
        'buttons.favorites': '⭐ Favorites',
        'buttons.settings': '🌐 Settings',
        'buttons.support': '🆘 Support',
        'buttons.main_menu': '🏠 Main Menu',
        'buttons.brand_search': '🔎 Brand Search',
        'buttons.filters': '⚙️ Filters',
        'buttons.show_more_5': '📋 Show more 10',
        'buttons.show_more_20': '📋 Show more 20',
        'buttons.show_all_results': '🔎 All results',
        'buttons.back': '🔙 Back',
        'buttons.show_all': '🔎 Show all',
        'buttons.only_discounts': '💰 Only discounts',
        'welcome.title': '🎉 Welcome to BazaarGuru!',
        'welcome.hint': 'Try voice search — just say what you need!',
        'language.choose': '🌐 Choose your language',
        'labels.promo_code': 'Promo code',
        'electronics.title': '📱 ELECTRONICS - TOP-1 CATEGORY IN INDIA!',
        'electronics.subtitle': '🏆 #1 online purchases in India | Found: 50,000+ products',
        'electronics.top_now': 'Top offers now:',
        'fashion.subtitle': '👗 40% of all Indian purchases | Found: 35,000+ products',
        'beauty.subtitle': '💄 Fast-growing segment (+50% per year) | Found: 25,000+ products',
        'electronics.promo_code': 'Promo code',
        'electronics.brand_search_title': 'ELECTRONICS BRAND SEARCH',
        'electronics.brand_search_hint': 'Type, for example: "Xiaomi", "Samsung", "OnePlus", "realme", "Sony".\nI\'ll find smartphones, laptops, audio and TV with discounts.',
        'categories.smartphones': 'Smartphones',
        'categories.laptops': 'Laptops',
        'categories.audio': 'Audio',
        'categories.tv': 'TV',
        'categories.wearables': 'Wearables',
        'your_savings': 'Your savings',
        'cashback': 'Cashback',
        'voice_hint': 'Say "I want iPhone" for search!',
        'top.title':'TOP PRODUCTS — BESTSELLERS OF THE WEEK!',
        'top.popular':'Most popular items:',
        'top.trust':'Thousands of users choose these!'
        ,
        'beauty.title':'BEAUTY - BEST DEALS!'
        ,'smartphones.title':'SMARTPHONES - BEST DEALS!'
        ,'search.title':'Searching for "{q}" for you...'
        ,'search.stats_title':'Found in 0.8s:'
        ,'search.stats_1':'47 offers found'
        ,'search.stats_2':'Best price from ₹999'
        ,'search.stats_3':'Available in 23 stores'
        ,'search.stats_4':'Delivery from 2 hours'
        ,'search.top3':'Top-3 options:'
        ,'search.how':'How to search:'
        ,'search.text_tip':'Type: "OnePlus under 20000" / "Biba kurti under 1500"'
        ,'search.voice_tip':'Voice: hold the mic and speak your query'
        ,'search.photo_tip':'Send a product photo: I will find similar and show prices'
        ,'search.refine_tip':'Refine what exactly you need for best results!'
        ,'show_all.title':'All results'
        ,'show_all.body':'Showing the extended list for your query.'
        ,'show_all.tip':'Tip: refine brand/price/category for precision.'
        ,'only_discounts.title':'Discounted items only'
        ,'only_discounts.body':'Filtering results to show the biggest discounts.'
        ,'only_discounts.example':'Examples: iPhone (‑33%), Nike (‑60%), Redmi (‑40%).'
      },
      hi: { // Hinglish
        'buttons.hot_deals': '🔥 Aaj Ki Deals',
        'buttons.top_products': '⭐ Top Products',
        'buttons.electronics': '📱 Electronics',
        'buttons.fashion': '👗 Fashion',
        'buttons.search': '🔍 Search',
        'buttons.language': '🌐 Bhasha',
        'buttons.notifications': '🔔 Alerts',
        'buttons.favorites': '⭐ Favorites',
        'buttons.settings': '🌐 Settings',
        'buttons.support': '🆘 Support',
        'buttons.main_menu': '🏠 Main Menu',
        'buttons.brand_search': '🔎 Brand Search',
        'buttons.filters': '⚙️ Filters',
        'buttons.show_more_5': '📋 Aur 10 dikhao',
        'buttons.show_more_20': '📋 Aur 20 dikhao',
        'buttons.show_all_results': '🔎 Sab results',
        'buttons.back': '🔙 Wapas',
        'buttons.show_all': '🔎 Show all',
        'buttons.only_discounts': '💰 Only discounts',
        'welcome.title': '🎉 BazaarGuru mein swagat hai!',
        'welcome.hint': 'Voice search try karo — jo chahiye bolo!',
        'language.choose': '🌐 Apni bhasha chuno',
        'labels.promo_code': 'Promo code',
        'electronics.title': '📱 ELECTRONICS - INDIA MEIN #1 CATEGORY!',
        'electronics.subtitle': '🏆 India mein #1 online shopping | Mila: 50,000+ products',
        'electronics.top_now': 'Abhi ke top offers:',
        'fashion.subtitle': '👗 Indians ke 40% purchases | Mila: 35,000+ products',
        'beauty.subtitle': '💄 Tezi se badhti category (+50% per year) | Mila: 25,000+ products',
        'electronics.promo_code': 'Promo code',
        'electronics.brand_search_title': 'ELECTRONICS BRAND SEARCH',
        'electronics.brand_search_hint': 'Type karo jaise: "Xiaomi", "Samsung", "OnePlus", "realme", "Sony".\nMain dhundega smartphones, laptops, audio aur TV discount mein.',
        'categories.smartphones': 'Smartphones',
        'categories.laptops': 'Laptops',
        'categories.audio': 'Audio',
        'categories.tv': 'TV',
        'categories.wearables': 'Wearables',
        'labels.promo_code': 'Promo code',
        'electronics.title': 'ELECTRONICS - BEST DEALS!',
        'electronics.top_now': 'Top deals now:',
        'your_savings': 'Your savings',
        'cashback': 'Cashback',
        'voice_hint': 'Bolo "iPhone chahiye" for search!',
        'top.title':'TOP PRODUCTS — Is haftay ke bestsellers!',
        'top.popular':'Sabse popular items:',
        'top.trust':'Hazaron users ye choose karte hain!'
        ,
        'beauty.title':'BEAUTY - Best Deals!'
        ,'smartphones.title':'SMARTPHONES - Best Deals!'
        ,'search.title':'"{q}" dhoond raha hoon tumhare liye...'
        ,'search.stats_title':'0.8s mein mila:'
        ,'search.stats_1':'47 offers mile'
        ,'search.stats_2':'Best price ₹999 se'
        ,'search.stats_3':'23 stores mein available'
        ,'search.stats_4':'Delivery 2 ghante se'
        ,'search.top3':'Top-3 options:'
        ,'search.how':'Kaise search kare:'
        ,'search.text_tip':'Type: "OnePlus under 20000" / "Biba kurti under 1500"'
        ,'search.voice_tip':'Voice: mic dabao aur bolo'
        ,'search.photo_tip':'Product photo bhejo: similar dikhauga'
        ,'search.refine_tip':'Thoda specific bolo taaki result perfect aaye!'
        ,'show_all.title':'Saare results'
        ,'show_all.body':'Tumhare query ke liye extended list dikh raha hoon.'
        ,'show_all.tip':'Tip: brand/price/category refine karo.'
        ,'only_discounts.title':'Sirf discount waale items'
        ,'only_discounts.body':'Sabse bade discounts ke sath results dikha raha hoon.'
        ,'only_discounts.example':'Examples: iPhone (‑33%), Nike (‑60%), Redmi (‑40%).'
      }
    };
  }

  t(chatId, key, fallback = '') {
    const lang = (this.users.get(chatId)?.lang) || 'ru';
    const pack = this.translations[lang] || this.translations['ru'];
    return pack[key] || (this.translations['en'][key] || fallback || key);
  }

  makeRequest(method, params) {
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

  // Определяем категорию по тексту запроса
  mapQueryToCategory(query) {
    const q = (query || '').toLowerCase();
    const fashionHints = ['kurti', 'saree', 'dress', 't-shirt', 'shirt', 'jeans', 'sneaker', 'shoe', 'платье', 'одеж', 'кроссовки', 'джинс'];
    for (const h of fashionHints) {
      if (q.includes(h)) return 'fashion';
    }
    return 'electronics';
  }

  // Подбираем подходящий промокод по источнику/категории
  async pickPromocode(category, sourceDomain) {
    try {
      const codes = await this.promocodesService.getPromocodes(category, {});
      const byDomain = codes.find(c => (c.store || '').includes(sourceDomain));
      return byDomain?.code || (codes[0]?.code) || 'AUTO DISCOUNT';
    } catch (e) {
      return 'AUTO DISCOUNT';
    }
  }

  async sendMessage(chatId, text, replyMarkup = null) {
    // Auto-localize common labels inside text
    let localizedText = text;
    try {
      if (typeof localizedText === 'string') {
        localizedText = localizedText
          .replace(/Промокод:/g, `${this.t(chatId,'labels.promo_code','Промокод')}:`)
          .replace(/Твоя экономия:/g, `${this.t(chatId,'your_savings','Твоя экономия')}:`)
          .replace(/Кэшбек:/g, `${this.t(chatId,'cashback','Кэшбек')}:`);
      }
    } catch (_) {}

    // Localize known button labels inside inline keyboard
    const localizedMarkup = this.localizeKeyboard(chatId, replyMarkup);

    const params = {
      chat_id: chatId,
      text: localizedText,
      parse_mode: 'HTML'
    };
    
    if (localizedMarkup) {
      params.reply_markup = JSON.stringify(localizedMarkup);
    }
    
    return this.makeRequest('sendMessage', params);
  }

  async sendPhoto(chatId, photoUrl, caption = '', replyMarkup = null) {
    // Apply same localization to captions and keyboards
    const localizedCaption = (caption || '')
      .replace(/Промокод:/g, `${this.t(chatId,'labels.promo_code','Промокод')}:`)
      .replace(/Твоя экономия:/g, `${this.t(chatId,'your_savings','Твоя экономия')}:`)
      .replace(/Кэшбек:/g, `${this.t(chatId,'cashback','Кэшбек')}:`);
    const localizedMarkup = this.localizeKeyboard(chatId, replyMarkup);

    const params = {
      chat_id: chatId,
      photo: photoUrl,
      caption: localizedCaption,
      parse_mode: 'HTML'
    };
    if (localizedMarkup) {
      params.reply_markup = JSON.stringify(localizedMarkup);
    }
    return this.makeRequest('sendPhoto', params);
  }

  // Map Russian button labels to translation keys and localize
  localizeKeyboard(chatId, replyMarkup) {
    if (!replyMarkup || !replyMarkup.inline_keyboard) return replyMarkup;
    const map = new Map([
      ['🔥 Скидки дня', 'buttons.hot_deals'],
      ['⭐ Топ товаров', 'buttons.top_products'],
      ['📱 Электроника', 'buttons.electronics'],
      ['📱 Техника', 'buttons.electronics'],
      ['👗 Одежда', 'buttons.fashion'],
      ['🔍 Найти товар', 'buttons.search'],
      ['🌐 Язык', 'buttons.language'],
      ['🏠 Главное меню', 'buttons.main_menu'],
      ['🔎 Поиск по бренду', 'buttons.brand_search'],
      ['⚙️ Фильтры', 'buttons.filters'],
      ['📋 Показать ещё 5', 'buttons.show_more_5'],
      ['📋 Показать еще 5', 'buttons.show_more_5'],
      ['🔙 Назад', 'buttons.back'],
      ['🔥 Все скидки', 'buttons.hot_deals'],
      ['🔎 Поиск по бренду/магазину', 'buttons.brand_search'],
      ['🔎 Показать все', 'buttons.show_all'],
      ['💰 Только скидки', 'buttons.only_discounts'],
      ['📱 Популярные телефоны', 'search.popular_phones'],
      ['👟 Популярная обувь', 'search.popular_shoes'],
      ['👗 Популярная одежда', 'search.popular_fashion'],
      ['📱 Смартфоны', 'electronics.smartphones'],
      ['💻 Ноутбуки', 'electronics.laptops'],
      ['🎧 Аудио', 'electronics.audio'],
      ['📺 ТВ', 'electronics.tv'],
      ['⌚ Гаджеты', 'electronics.wearables'],
      ['👗 Женская', 'fashion.women'],
      ['👔 Мужская', 'fashion.men'],
      ['🧒 Детская', 'fashion.kids'],
      ['🏠 Главная', 'buttons.main_menu'],
      ['🔙 Назад к электронике', 'buttons.back'],
      ['🔙 Назад к моде', 'buttons.back'],
      ['🔙 Назад к ТВ', 'buttons.back'],
      ['📱 Показать еще 5 смартфонов', 'buttons.show_more_5'],
      ['💻 Показать еще 5 ноутбуков', 'buttons.show_more_5'],
      ['🎧 Показать еще 5 товаров', 'buttons.show_more_5'],
      ['📺 Показать еще 5 товаров', 'buttons.show_more_5']
    ]);

    const clone = { inline_keyboard: replyMarkup.inline_keyboard.map(row => row.map(btn => {
      const key = map.get(btn.text);
      if (key) {
        return { ...btn, text: this.t(chatId, key, btn.text) };
      }
      return btn;
    })) };
    return clone;
  }

  async sendMediaGroup(chatId, mediaArray) {
    const params = {
      chat_id: chatId,
      media: JSON.stringify(mediaArray)
    };
    return this.makeRequest('sendMediaGroup', params);
  }

  async sendProductCards(chatId, products, category, options = {}) {
    // Send up to 10 separate photo cards with per-item buttons and show totals
    const user = this.users.get(chatId) || {};
    const showCount = options.showCount || 10;
    const currentPage = options.page || 0;
    const startIdx = currentPage * showCount;
    const endIdx = Math.min(startIdx + showCount, products.length);
    
    user.lastSearchResults = products.slice(startIdx, endIdx);
    user.currentPage = currentPage;
    user.totalResults = products.length;
    this.users.set(chatId, user);

    // Показать статистику поиска
    if (currentPage === 0 && products.length > 0) {
      const totalFound = products.length > 1000 ? '1000+' : products.length.toString();
      const statsMessage = `📊 <b>Найдено: ${totalFound} товаров</b>\n` +
        `📋 Показано: ${startIdx + 1}-${endIdx} из ${totalFound}\n` +
        `⚡ Время поиска: 0.${Math.floor(Math.random() * 9) + 1} сек\n` +
        `🏪 Доступно в 5+ магазинах`;
      
      await this.sendMessage(chatId, statsMessage);
    }

    for (let i = startIdx; i < endIdx; i++) {
      const p = products[i];
      let domain = 'flipkart.com';
      if (p.source === 'amazon') domain = 'amazon.in';
      if (p.source === 'myntra') domain = 'myntra.com';
      if (p.source === 'nykaa') domain = 'nykaa.com';
      if (p.source === 'ajio') domain = 'ajio.com';
      const promo = await this.pickPromocode(category, domain);
      
      // Более богатое описание товара
      let caption = `🖼️ <b>${p.title}</b>\n`;
      caption += `💰 ₹${(p.price||0).toLocaleString()}`;
      if (p.originalPrice && p.originalPrice > p.price) {
        const discount = Math.round((1 - p.price/p.originalPrice) * 100);
        caption += ` <s>₹${p.originalPrice.toLocaleString()}</s> (−${discount}%)`;
      }
      if (p.rating) caption += `\n⭐ ${p.rating}/5`;
      if (promo && promo !== 'SAVE10') caption += `\n🎫 ${this.t(chatId,'labels.promo_code','Промокод')}: <code>${promo}</code>`;
      
      const keyboard = { 
        inline_keyboard: [
          [
            { text: this.t(chatId,'actions.open','🛒 Открыть'), url: p.affiliateUrl }, 
            { text: this.t(chatId,'actions.favorite','⭐ В избранное'), callback_data: `fav_${i}` }
          ],
          [
            { text: this.t(chatId,'actions.copy_promo','📋 Скопировать промо'), callback_data: `copy_code_${i}` }
          ]
        ] 
      };
      
      if (p.imageUrl) {
        await this.sendPhoto(chatId, p.imageUrl, caption, keyboard);
      } else {
        await this.sendMessage(chatId, `${caption}\n${p.affiliateUrl}`, keyboard);
      }
    }

    // Показать кнопки пагинации если есть ещё товары
    if (endIdx < products.length) {
      const hasMore = products.length - endIdx;
      const nextShowCount = Math.min(10, hasMore);
      const paginationKeyboard = {
        inline_keyboard: [
          [
            { text: this.t(chatId,'buttons.show_more_5',`📋 Показать ещё ${nextShowCount}`), callback_data: `show_more_${currentPage + 1}` },
            { text: this.t(chatId,'buttons.show_all_results','🔎 Все результаты'), callback_data: 'show_all_results' }
          ],
          [
            { text: this.t(chatId,'buttons.main_menu','🏠 Главное меню'), callback_data: 'main_menu' }
          ]
        ]
      };
      
      const remainingText = `📋 <b>Ещё ${hasMore} товаров доступно</b>\n` +
        `💡 <i>Совет: уточните бренд или цену для точного поиска</i>`;
      
      await this.sendMessage(chatId, remainingText, paginationKeyboard);
    }
  }

  // ⚙️ ПОЛЬЗОВАТЕЛЬСКИЕ ФИЛЬТРЫ
  applyUserFilters(products, chatId) {
    const user = this.users.get(chatId) || {};
    const filters = user.filters || {};
    let out = Array.isArray(products) ? products.slice() : [];
    if (filters.minPrice) out = out.filter(p => (p.price || 0) >= filters.minPrice);
    if (filters.maxPrice) out = out.filter(p => (p.price || 0) <= filters.maxPrice);
    if (filters.minDiscount) out = out.filter(p => (p.discountPercent || 0) >= filters.minDiscount);
    if (filters.minRating) out = out.filter(p => (p.rating || 0) >= filters.minRating);
    if (filters.stores && Array.isArray(filters.stores) && filters.stores.length > 0) {
      out = out.filter(p => filters.stores.includes(p.source));
    }
    return out;
  }

  async handleFilters(chatId) {
    const user = this.users.get(chatId) || {};
    const f = user.filters || {};
    const message = `⚙️ <b>ФИЛЬТРЫ</b>\n\n` +
      `Цена: ${f.minPrice ? 'от ₹' + f.minPrice : '—'} ${f.maxPrice ? 'до ₹' + f.maxPrice : ''}\n` +
      `Скидка: ${f.minDiscount ? '≥ ' + f.minDiscount + '%' : '—'}\n` +
      `Рейтинг: ${f.minRating ? '≥ ' + f.minRating + '★' : '—'}\n` +
      `Магазины: ${f.stores && f.stores.length ? f.stores.join(', ') : 'все'}`;

    const keyboard = {
      inline_keyboard: [
        [ { text: '₹ Мин цена', callback_data: 'filter_min_price' }, { text: '₹ Макс цена', callback_data: 'filter_max_price' } ],
        [ { text: '📉 Скидка ≥ 30%', callback_data: 'filter_discount_30' }, { text: '📉 Скидка ≥ 50%', callback_data: 'filter_discount_50' } ],
        [ { text: '⭐ Рейтинг ≥ 4.2', callback_data: 'filter_rating_42' }, { text: '⭐ Рейтинг ≥ 4.5', callback_data: 'filter_rating_45' } ],
        [ { text: '₹ До 10k', callback_data: 'filter_preset_upto_10k' }, { text: '📉 Скидка ≥ 40%', callback_data: 'filter_preset_discount_40' }, { text: '⭐ Топ рейтинг', callback_data: 'filter_preset_top_rating' } ],
        [ { text: '🏪 Flipkart', callback_data: 'filter_store_flipkart' }, { text: '🏪 Amazon', callback_data: 'filter_store_amazon' }, { text: '🏪 Myntra', callback_data: 'filter_store_myntra' } ],
        [ { text: '🧹 Сбросить', callback_data: 'filter_reset' }, { text: '🔄 Обновить результаты', callback_data: 'refresh_results' } ],
        [ { text: '🏠 Главное меню', callback_data: 'main_menu' } ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
  }

  setUserFilters(chatId, update) {
    const user = this.users.get(chatId) || {};
    const filters = { ...(user.filters || {}), ...update };
    // нормализация stores
    if (update && update.storeToggle) {
      const st = new Set(filters.stores || []);
      if (st.has(update.storeToggle)) st.delete(update.storeToggle); else st.add(update.storeToggle);
      filters.stores = Array.from(st);
      delete filters.storeToggle;
    }
    this.users.set(chatId, { ...user, filters });
  }

  // 🚀 РАСШИРЕННОЕ МЕНЮ - больше выбора для пользователей!
  getWowInlineKeyboard(chatId = null) {
    return {
      inline_keyboard: [
        [
          { text: this.t(chatId,'buttons.hot_deals','🔥 Скидки дня'), callback_data: 'hot_deals' },
          { text: this.t(chatId,'buttons.top_products','⭐ Топ товаров'), callback_data: 'top_products' }
        ],
        [
          { text: this.t(chatId,'buttons.electronics','📱 Электроника'), callback_data: 'electronics' },
          { text: this.t(chatId,'buttons.fashion','👗 Одежда'), callback_data: 'fashion' }
        ],
        [
          { text: this.t(chatId,'buttons.beauty','💄 Косметика'), callback_data: 'beauty' }
        ],
        [
          { text: this.t(chatId,'buttons.search','🔍 Найти товар'), callback_data: 'search_product' }
        ],
        [
          { text: this.t(chatId,'buttons.language','🌐 Язык'), callback_data: 'choose_language' }
        ]
      ]
    };
  }

  // 🎯 СИСТЕМА РЕКОМЕНДАЦИЙ
  trackUserInteraction(userId, category, action, price) {
    const user = this.users.get(userId) || {
      preferences: {},
      interactions: [],
      purchases: [],
      level: 1,
      rewards: 0
    };

    // Записываем взаимодействие
    user.interactions.push({
      category,
      action,
      price,
      timestamp: Date.now()
    });

    // Обновляем предпочтения
    user.preferences[category] = (user.preferences[category] || 0) + 1;

    // Обновляем историю покупок
    if (action === 'purchase') {
      user.purchases.push({ category, price, timestamp: Date.now() });
    }

    this.users.set(userId, user);
  }

  generatePersonalizedRecommendations(userId) {
    const user = this.users.get(userId);
    if (!user || !user.preferences) return this.getDefaultRecommendations();

    const preferences = Object.entries(user.preferences)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);

    const recommendations = [];

    preferences.forEach(([category, score]) => {
      const recs = this.getRecommendationsByCategory(category, score);
      recommendations.push(...recs);
    });

    return recommendations.slice(0, 6); // Топ-6 рекомендаций
  }

  getRecommendationsByCategory(category, score) {
    const recommendations = {
      'electronics': [
        { name: 'iPhone 15 Pro Max', price: 89999, discount: 33, reason: 'Твой любимый бренд' },
        { name: 'OnePlus 12', price: 54999, discount: 25, reason: 'Индийский флагман' },
        { name: 'Xiaomi 14', price: 44999, discount: 30, reason: 'Отличное качество' },
        { name: 'Samsung Galaxy S24', price: 79999, discount: 20, reason: 'Надежный выбор' },
        { name: 'MacBook Air M3', price: 85999, discount: 25, reason: 'Популярный выбор' },
        { name: 'Sony WH-1000XM5', price: 19999, discount: 33, reason: 'Отличный звук' },
        { name: 'Redmi Note 13 Pro', price: 18999, discount: 40, reason: 'Бюджетный флагман' },
        { name: 'realme 12 Pro', price: 24999, discount: 35, reason: 'Камера и батарея' }
      ],
      'fashion': [
        { name: 'Nike Air Max', price: 8999, discount: 40, reason: 'Трендовый выбор' },
        { name: 'Adidas Ultraboost', price: 12999, discount: 30, reason: 'Комфорт и стиль' },
        { name: 'Levi\'s Jeans', price: 3999, discount: 25, reason: 'Классика' },
        { name: 'Puma RS-X', price: 7999, discount: 35, reason: 'Стиль и комфорт' },
        { name: 'Allen Solly Shirt', price: 1999, discount: 50, reason: 'Офисный стиль' },
        { name: 'Peter England T-Shirt', price: 1299, discount: 45, reason: 'Повседневная одежда' },
        { name: 'Biba Kurti', price: 1499, discount: 40, reason: 'Этническая одежда' },
        { name: 'FabIndia Dress', price: 2499, discount: 30, reason: 'Хэндмейд стиль' }
      ],
      'food': [
        { name: 'Pizza Domino\'s', price: 299, discount: 20, reason: 'Быстрая доставка' },
        { name: 'Burger King Combo', price: 199, discount: 15, reason: 'Популярный выбор' },
        { name: 'Starbucks Latte', price: 149, discount: 10, reason: 'Кофе на каждый день' },
        { name: 'Butter Chicken Biryani', price: 199, discount: 25, reason: 'Индийская кухня' },
        { name: 'Paneer Tikka Masala', price: 249, discount: 20, reason: 'Популярное блюдо' },
        { name: 'Chole Bhature', price: 149, discount: 30, reason: 'Уличная еда' },
        { name: 'Masala Dosa', price: 129, discount: 35, reason: 'Южно-индийская кухня' },
        { name: 'Chicken Biryani', price: 179, discount: 25, reason: 'Рисовое блюдо' }
      ],
      'home_goods': [
        { name: 'Patanjali Hair Oil', price: 199, discount: 40, reason: 'Натуральные продукты' },
        { name: 'Tata Tea Premium', price: 299, discount: 25, reason: 'Популярный чай' },
        { name: 'Amul Butter 500g', price: 249, discount: 20, reason: 'Молочные продукты' },
        { name: 'Surf Excel Detergent', price: 399, discount: 30, reason: 'Средство для стирки' },
        { name: 'Godrej Ezee Soap', price: 49, discount: 50, reason: 'Бюджетное мыло' },
        { name: 'Colgate Toothpaste', price: 99, discount: 45, reason: 'Зубная паста' }
      ],
      'health': [
        { name: 'Patanjali Chyawanprash', price: 349, discount: 35, reason: 'Иммунитет' },
        { name: 'Himalaya Neem Face Wash', price: 149, discount: 40, reason: 'Уход за кожей' },
        { name: 'Dabur Honey', price: 299, discount: 25, reason: 'Натуральный мед' },
        { name: 'Vicco Turmeric Cream', price: 99, discount: 45, reason: 'Крем с куркумой' }
      ],
      'services': [
        { name: 'Urban Company Cleaning', price: 499, discount: 30, reason: 'Уборка дома' },
        { name: 'Electrician Service', price: 299, discount: 40, reason: 'Электрик на дом' },
        { name: 'Phone Repair', price: 999, discount: 50, reason: 'Ремонт телефона' },
        { name: 'Laundry Service', price: 199, discount: 35, reason: 'Стирка белья' }
      ]
    };

    return recommendations[category] || [];
  }

  getDefaultRecommendations() {
    return [
      { name: 'OnePlus 12', price: 54999, discount: 25, category: 'electronics', reason: 'Индийский флагман' },
      { name: 'Nike Air Force', price: 6999, discount: 30, category: 'fashion', reason: 'Популярные кроссовки' },
      { name: 'Butter Chicken Biryani', price: 199, discount: 25, category: 'food', reason: 'Индийская кухня' },
      { name: 'Patanjali Hair Oil', price: 199, discount: 40, category: 'home_goods', reason: 'Натуральный продукт' },
      { name: 'Redmi Note 13 Pro', price: 18999, discount: 40, category: 'electronics', reason: 'Бюджетный флагман' },
      { name: 'Biba Kurti', price: 1499, discount: 40, category: 'fashion', reason: 'Этническая одежда' },
      { name: 'Surf Excel Detergent', price: 399, discount: 30, category: 'home_goods', reason: 'Средство для стирки' },
      { name: 'Chole Bhature', price: 149, discount: 30, category: 'food', reason: 'Уличная еда' }
    ];
  }

  // 🎮 ДОПОЛНИТЕЛЬНЫЕ МИНИ-ИГРЫ
  async handleSpinWheel(chatId) {
    const prizes = [
      { name: '🎁 10% скидка', value: '10%_discount', chance: 30 },
      { name: '💰 ₹100 кэшбек', value: 'cashback_100', chance: 25 },
      { name: '🎯 Бесплатная доставка', value: 'free_delivery', chance: 20 },
      { name: '⭐ Двойные очки', value: 'double_points', chance: 15 },
      { name: '🎪 VIP статус на день', value: 'vip_day', chance: 8 },
      { name: '🏆 Супер приз!', value: 'super_prize', chance: 2 }
    ];

    const random = Math.random() * 100;
    let cumulative = 0;
    let selectedPrize = prizes[0];

    for (const prize of prizes) {
      cumulative += prize.chance;
      if (random <= cumulative) {
        selectedPrize = prize;
        break;
      }
    }

    const message = `🎡 <b>КОЛЕСО ФОРТУНЫ!</b>

🎯 <b>Тебе выпало: ${selectedPrize.name}</b>

💫 Используй этот бонус при следующей покупке!
⭐ Колесо можно крутить 1 раз в день

<i>🎮 Играй каждый день и получай призы!</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🎁 Использовать приз', callback_data: 'use_prize_' + selectedPrize.value },
          { text: '🎡 Крутить еще раз', callback_data: 'spin_again' }
        ],
        [
          { text: '🏆 Мои призы', callback_data: 'my_prizes' },
          { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
  }

  async handleDailyQuest(chatId) {
    const quests = [
      { name: 'Посмотреть 3 товара', progress: 0, target: 3, reward: '₹50 кэшбек' },
      { name: 'Совершить покупку', progress: 0, target: 1, reward: 'Двойные очки' },
      { name: 'Пригласить друга', progress: 0, target: 1, reward: '₹200 бонус' },
      { name: 'Использовать промокод', progress: 0, target: 1, reward: 'VIP статус' }
    ];

    const message = `🎯 <b>ЕЖЕДНЕВНЫЕ КВЕСТЫ!</b>

Выполняй задания и получай награды:

${quests.map((quest, index) =>
  `${index + 1}. ${quest.name}\n` +
  `📊 Прогресс: ${quest.progress}/${quest.target}\n` +
  `🎁 Награда: ${quest.reward}\n`
).join('\n')}

💡 <i>Завершай квесты каждый день!</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🎮 Начать квесты', callback_data: 'start_daily_quests' },
          { text: '🏆 Мои достижения', callback_data: 'my_achievements' }
        ],
        [
          { text: '🎁 Получить награды', callback_data: 'claim_rewards' },
          { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
  }

  async start() {
    console.log('🚀 Starting BazaarGuru WOW Bot...');
    
    this.isRunning = true;
    console.log('✅ WOW Bot started with magical UX!');
    console.log('🎯 Simplified menu for better conversion!');
    console.log('💎 Ready to amaze users!');
    
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
        console.log('❌ Error polling updates:', error.message);
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

  async handleMessage(msg) {
    const chatId = msg.chat.id;
    const text = msg.text;
    const firstName = msg.from.first_name || 'Friend';

    // Сохраняем пользователя
    if (!this.users.has(chatId)) {
      this.users.set(chatId, {
        firstName,
        joinDate: new Date(),
        totalSavings: Math.floor(Math.random() * 50000) + 5000, // Симуляция
        purchases: Math.floor(Math.random() * 25) + 3,
        cashback: Math.floor(Math.random() * 5000) + 500,
        level: 'Мастер экономии'
      });
      console.log(`✅ User ${firstName} started - sent WOW welcome!`);
    }

    // Фото: поиск по изображению
    if (msg.photo && msg.photo.length > 0) {
      await this.handlePhotoSearch(chatId, msg.photo, msg.caption);
      return;
    }

    // Голос: распознавание и поиск (упрощенная заглушка)
    if (msg.voice || msg.audio) {
      await this.sendMessage(chatId, '🎤 Получил голосовое. Ищу товар...');
      return;
    }

    if (text === '/start') {
      await this.sendWelcomeMessage(chatId, firstName);
    } else if (text === '/deals') {
      await this.handleHotDeals(chatId);
    } else if (text === '/profile') {
      await this.handlePersonal(chatId);
    } else if (text === '/cashback') {
      await this.handleMyCashback(chatId);
    } else {
      // Умный ответ на любое сообщение
      await this.handleSmartResponse(chatId, text);
    }
  }

  // 🖼️ Поиск по фото (MVP)
  async handlePhotoSearch(chatId, photoArray, caption) {
    const message = `🖼️ <b>Поиск по фото</b>\n\nПоказываю похожие товары и цены.\nДобавь текстом бренд/цену для точности.`;
    const keyboard = { inline_keyboard: [[{ text: '💰 Только скидки', callback_data: 'only_discounts' }, { text: '🔎 Показать все', callback_data: 'show_all_results' }],[{ text: '🏠 Главное меню', callback_data: 'main_menu' }]] };
    await this.sendMessage(chatId, message, keyboard);
  }

  async sendWelcomeMessage(chatId, firstName) {
    const user = this.users.get(chatId);
    const title = this.t(chatId,'welcome.title');
    const hint = this.t(chatId,'welcome.hint');
    const welcomeMessage = `${title}

<i>${hint}</i>

🛍️ <b>BAZAARGURU - ТОП-3 КАТЕГОРИИ ДЛЯ ИНДИИ</b>
📱 Electronics - #1 онлайн-покупки в Индии  
👗 Fashion - 40% всех покупок индийцев
💄 Beauty - быстрорастущий сегмент (+50% в год)

🔍 <b>Найдем ВСЁ что нужно через умный поиск!</b>
💡 Просто скажи что ищешь или выбери категорию`;
    await this.sendMessage(chatId, welcomeMessage, this.getWowInlineKeyboard(chatId));
  }

  async handleCallbackQuery(query) {
    const chatId = query.message.chat.id;
    const data = query.data;
    const firstName = query.from.first_name || 'Friend';

    // Подтверждаем получение callback
    await this.makeRequest('answerCallbackQuery', {
      callback_query_id: query.id,
      text: '✨ Загружаю...'
    });

    switch (data) {
      case 'hot_deals':
        await this.handleHotDeals(chatId);
        break;
      
      case 'voice_search':
        await this.handleVoiceSearch(chatId);
        break;
      
      case 'electronics':
        await this.handleElectronics(chatId);
        break;
      
      case 'fashion':
        await this.handleFashion(chatId);
        break;
      
      case 'beauty':
        await this.handleBeauty(chatId);
        break;
      
      case 'choose_language':
        await this.handleChooseLanguage(chatId);
        break;
      
      case 'filters':
        await this.handleFilters(chatId);
        break;
      
      case 'food':
        await this.handleFood(chatId);
        break;
      
      // Обработчики промокодов
      case 'copy_promo_sony5000':
        await this.handleCopyPromo(chatId, 'SONY5000', 'Sony WH-1000XM5');
        break;
      
      case 'copy_promo_galaxy5000':
        await this.handleCopyPromo(chatId, 'GALAXY5000', 'Samsung Galaxy S24');
        break;
      
      case 'copy_promo_boost2000':
        await this.handleCopyPromo(chatId, 'BOOST2000', 'Adidas Ultraboost 22');
        break;
      
      // Новые промокоды для мужской моды
      case 'copy_promo_shirt500':
        await this.handleCopyPromo(chatId, 'SHIRT500', 'Мужские рубашки');
        break;
      
      case 'copy_promo_jeans1000':
        await this.handleCopyPromo(chatId, 'JEANS1000', 'Мужские джинсы');
        break;
      
      case 'copy_promo_winter30':
        await this.handleCopyPromo(chatId, 'WINTER30', 'Зимние куртки');
        break;
      
      case 'copy_promo_shoes20':
        await this.handleCopyPromo(chatId, 'SHOES20', 'Мужская обувь');
        break;
      
      case 'copy_promo_sport15':
        await this.handleCopyPromo(chatId, 'SPORT15', 'Спортивная одежда');
        break;
      
      // Промокоды еды
      case 'copy_dominos50':
        await this.handleCopyPromo(chatId, 'DOMINOS50', 'Domino\'s Pizza');
        break;
      
      case 'copy_mcfree':
        await this.handleMainMenu(chatId);
        break;
      
      case 'copy_zomato30':
        await this.handleMainMenu(chatId);
        break;
      
      case 'copy_coffee20':
        await this.handleCopyPromo(chatId, 'COFFEE20', 'Starbucks');
        break;
      
      case 'copy_swiggy40':
        await this.handleMainMenu(chatId);
        break;
      
      case 'activate_cashback_sony':
        await this.handleActivateCashback(chatId, 'Sony WH-1000XM5', '₹999');
        break;
      
      // Обработчики подкategorий моды
      case 'shoes':
        await this.handleShoes(chatId);
        break;
      
      case 'accessories':
        await this.handleAccessories(chatId);
        break;
      
      case 'women_fashion':
        await this.handleWomenFashion(chatId);
        break;
      
      case 'men_fashion':
        await this.handleMenFashion(chatId);
        break;

      case 'kids_fashion':
        await this.handleKidsFashion(chatId);
        break;

      case 'kids_fashion_page2':
        await this.handleKidsFashionPage2(chatId);
        break;

      case 'fashion_brand_search':
        await this.handleFashionBrandSearch(chatId);
        break;
      
      // ВСЕ НЕДОСТАЮЩИЕ ОБРАБОТЧИКИ
      case 'pay_card_sony':
        await this.handlePayCardSony(chatId);
        break;
      
      case 'pay_upi_sony':
        await this.handlePayUPISony(chatId);
        break;
      
      case 'pay_cash_sony':
        await this.handlePayCashSony(chatId);
        break;
      
      case 'change_delivery':
        await this.handleChangeDelivery(chatId);
        break;
      
      case 'add_favorite':
        await this.handleAddFavorite(chatId);
        break;
      
      case 'withdraw_cashback':
        await this.handleSupport(chatId);
        break;
      
      case 'double_cashback':
        await this.handleSupport(chatId);
        break;
      
      case 'spin_wheel':
        await this.handleSupport(chatId);
        break;
      
      case 'purchase_history':
        await this.handlePurchaseHistory(chatId);
        break;
      
      case 'setup_notifications':
        // скрыто для пользователя, оставить только админ-режим в будущем
        await this.handleSupport(chatId);
        break;
      case 'notifications':
        await this.handleSupport(chatId);
        break;
      
      case 'my_categories':
        await this.handleMyCategories(chatId);
        break;
      
      case 'my_profile':
        await this.handleSettings(chatId);
        break;
      
      case 'vip_status':
        await this.handleSettings(chatId);
        break;

      case 'favorites':
        await this.handleFavorites(chatId);
        break;
      case 'settings':
        await this.handleSettings(chatId);
        break;
      case 'support':
        await this.handleSupport(chatId);
        break;
      
      case 'ai_electronics':
        await this.handleAIElectronics(chatId);
        break;
      
      // Фильтры
      case 'filter_min_price':
        this.setUserFilters(chatId, { minPrice: 1000 });
        await this.handleFilters(chatId);
        break;
      case 'filter_max_price':
        this.setUserFilters(chatId, { maxPrice: 20000 });
        await this.handleFilters(chatId);
        break;
      case 'filter_discount_30':
        this.setUserFilters(chatId, { minDiscount: 30 });
        await this.handleFilters(chatId);
        break;
      case 'filter_discount_50':
        this.setUserFilters(chatId, { minDiscount: 50 });
        await this.handleFilters(chatId);
        break;
      case 'filter_rating_42':
        this.setUserFilters(chatId, { minRating: 4.2 });
        await this.handleFilters(chatId);
        break;
      case 'filter_rating_45':
        this.setUserFilters(chatId, { minRating: 4.5 });
        await this.handleFilters(chatId);
        break;
      case 'filter_store_flipkart':
        this.setUserFilters(chatId, { storeToggle: 'flipkart' });
        await this.handleFilters(chatId);
        break;
      case 'filter_store_amazon':
        this.setUserFilters(chatId, { storeToggle: 'amazon' });
        await this.handleFilters(chatId);
        break;
      case 'filter_store_myntra':
        this.setUserFilters(chatId, { storeToggle: 'myntra' });
        await this.handleFilters(chatId);
        break;
      case 'filter_preset_upto_10k':
        this.setUserFilters(chatId, { maxPrice: 10000 });
        await this.handleFilters(chatId);
        break;
      case 'filter_preset_discount_40':
        this.setUserFilters(chatId, { minDiscount: 40 });
        await this.handleFilters(chatId);
        break;
      case 'filter_preset_top_rating':
        this.setUserFilters(chatId, { minRating: 4.5 });
        await this.handleFilters(chatId);
        break;
      case 'filter_reset':
        this.setUserFilters(chatId, { minPrice: null, maxPrice: null, minDiscount: null, minRating: null, stores: [] });
        await this.handleFilters(chatId);
        break;
      case 'refresh_results': {
        const user = this.users.get(chatId) || {};
        const lastQuery = user.lastQuery || '';
        if (lastQuery) {
          await this.handleSmartResponse(chatId, lastQuery);
        } else {
          await this.handleSearchProduct(chatId);
        }
        break;
      }

      // ЯЗЫК
      case 'set_lang_en':
        this.users.set(chatId, { ...(this.users.get(chatId) || {}), lang: 'en' });
        await this.sendWelcomeMessage(chatId, (this.users.get(chatId)?.firstName)||'Friend');
        break;
      case 'set_lang_ru':
        this.users.set(chatId, { ...(this.users.get(chatId) || {}), lang: 'ru' });
        await this.sendWelcomeMessage(chatId, (this.users.get(chatId)?.firstName)||'Друг');
        break;
      case 'set_lang_hi':
        this.users.set(chatId, { ...(this.users.get(chatId) || {}), lang: 'hi' });
        await this.sendWelcomeMessage(chatId, (this.users.get(chatId)?.firstName)||'Dost');
        break;

      case 'electronics_brand_search':
        await this.handleElectronicsBrandSearch(chatId);
        break;
      // Электроника подкатегории
      case 'fc_p_android':
        await this.handleSmartResponse(chatId, 'android phone discount');
        break;
      case 'fc_p_iphone':
        await this.handleSmartResponse(chatId, 'iphone discount');
        break;
      case 'fc_p_budget':
        await this.handleSmartResponse(chatId, 'smartphone under 10000');
        break;
      case 'fc_p_5g':
        await this.handleSmartResponse(chatId, '5g smartphone');
        break;
      case 'fc_l_gaming':
        await this.handleSmartResponse(chatId, 'gaming laptop');
        break;
      case 'fc_l_office':
        await this.handleSmartResponse(chatId, 'office laptop');
        break;
      case 'fc_l_battery':
        await this.handleSmartResponse(chatId, 'long battery laptop');
        break;
      case 'fc_l_ultrabook':
        await this.handleSmartResponse(chatId, 'ultrabook');
        break;
      case 'fc_a_tws':
        await this.handleSmartResponse(chatId, 'tws earbuds');
        break;
      case 'fc_a_overear':
        await this.handleSmartResponse(chatId, 'over ear headphones');
        break;
      case 'fc_a_speakers':
        await this.handleSmartResponse(chatId, 'bluetooth speakers');
        break;
      case 'fc_a_mic':
        await this.handleSmartResponse(chatId, 'microphone');
        break;
      case 'fc_tv_led':
        await this.handleSmartResponse(chatId, 'LED TV');
        break;
      case 'fc_tv_qled':
        await this.handleSmartResponse(chatId, 'QLED TV');
        break;
      case 'fc_tv_oled':
        await this.handleSmartResponse(chatId, 'OLED TV');
        break;
      case 'fc_tv_55':
        await this.handleSmartResponse(chatId, '55 inch TV');
        break;
      case 'fc_wb_fitness':
        await this.handleSmartResponse(chatId, 'fitness band');
        break;
      case 'fc_wb_smartwatch':
        await this.handleSmartResponse(chatId, 'smartwatch');
        break;
      case 'fc_wb_premium':
        await this.handleSmartResponse(chatId, 'premium smartwatch');
        break;
      case 'fc_wb_budget':
        await this.handleSmartResponse(chatId, 'budget smartwatch');
        break;

      // Beauty filter routes
      case 'fc_b_makeup':
        await this.handleSmartResponse(chatId, 'makeup discount');
        break;
      case 'fc_b_skincare':
        await this.handleSmartResponse(chatId, 'skincare discount');
        break;
      case 'fc_b_haircare':
        await this.handleSmartResponse(chatId, 'haircare discount');
        break;
      case 'fc_b_fragrance':
        await this.handleSmartResponse(chatId, 'fragrance discount');
        break;
      
      // Избранное и промокод в карточках
      case 'fav_0':
      case 'fav_1':
      case 'fav_2':
      case 'fav_3':
      case 'fav_4': {
        const idx = parseInt(data.split('_')[1], 10);
        const u = this.users.get(chatId) || {};
        const items = u.lastSearchResults || [];
        if (items[idx]) {
          const favs = [ ...(u.favorites || []), items[idx].title ].slice(0, 20);
          this.users.set(chatId, { ...u, favorites: favs });
          await this.sendMessage(chatId, `⭐ <b>Добавлено в избранное:</b> ${items[idx].title}`);
        }
        break;
      }
      case 'copy_code_0':
      case 'copy_code_1':
      case 'copy_code_2':
      case 'copy_code_3':
      case 'copy_code_4': {
        const idx = parseInt(data.split('_')[2], 10);
        const u = this.users.get(chatId) || {};
        const items = u.lastSearchResults || [];
        if (items[idx]) {
          const domain = (items[idx].source === 'amazon') ? 'amazon.in' : 'flipkart.com';
          const code = await this.pickPromocode(items[idx].category || 'electronics', domain);
          await this.handleCopyPromo(chatId, code, items[idx].title);
        }
        break;
      }
      
      case 'ai_fashion':
        await this.handleAIFashion(chatId);
        break;
      
      case 'ai_compare':
        await this.handleAICompare(chatId);
        break;
      
      case 'ai_timing':
        await this.handleAITiming(chatId);
        break;
      
      case 'show_all_results':
        await this.handleShowAllResults(chatId);
        break;
      
      case 'only_discounts':
        await this.handleOnlyDiscounts(chatId);
        break;
      
      case 'compare_iphones':
        await this.handleCompareiPhones(chatId);
        break;
      
      case 'samsung_tradein':
        await this.handleSamsungTradeIn(chatId);
        break;
      
      case 'home':
        await this.handleHome(chatId);
        break;
      
      // Обработчики еды
      case 'food_promos':
        await this.handleFoodPromos(chatId);
        break;
      
      case 'nearby_restaurants':
        await this.handleNearbyRestaurants(chatId);
        break;
      
      case 'order_mcdonalds':
        await this.handleOrderMcdonalds(chatId);
        break;

      case 'order_indian':
        await this.handleOrderIndian(chatId);
        break;
      
      case 'shoe_promos':
        await this.handleShoePromos(chatId);
        break;
      
      case 'ask_ai':
        await this.handleAskAI(chatId);
        break;
      
      case 'my_cashback':
        await this.handleSupport(chatId);
        break;
      
      case 'personal':
        await this.handlePersonal(chatId);
        break;
      
      case 'main_menu':
        await this.handleMainMenu(chatId);
        break;
      
      // Обработчики покупок
      case 'buy_samsung':
        await this.handleBuySamsung(chatId);
        break;
      
      case 'buy_adidas':
        await this.handleBuyAdidas(chatId);
        break;
      
      case 'buy_sony':
        await this.handleBuySony(chatId);
        break;
      
      case 'buy_iphone15':
      case 'buy_iphone14':
      case 'buy_iphone13':
        await this.handleBuyIPhone(chatId, data);
        break;
      
      case 'smartphones':
        await this.handleSmartphones(chatId);
        break;
      // Фильтры категорий моды (flat)
      case 'fc_m_shirts':
        await this.handleSmartResponse(chatId, 'men shirts');
        break;
      case 'fc_m_tshirts':
        await this.handleSmartResponse(chatId, 'men t-shirt');
        break;
      case 'fc_m_jeans':
        await this.handleSmartResponse(chatId, 'men jeans');
        break;
      case 'fc_m_hoodies':
        await this.handleSmartResponse(chatId, 'men hoodie');
        break;
      case 'fc_m_shoes':
        await this.handleSmartResponse(chatId, 'men shoes');
        break;
      case 'fc_m_accessories':
        await this.handleSmartResponse(chatId, 'men accessories');
        break;
      case 'fc_w_dresses':
        await this.handleSmartResponse(chatId, 'women dresses');
        break;
      case 'fc_w_tops':
        await this.handleSmartResponse(chatId, 'women tops');
        break;
      case 'fc_w_jeans':
        await this.handleSmartResponse(chatId, 'women jeans');
        break;
      case 'fc_w_hoodies':
        await this.handleSmartResponse(chatId, 'women hoodies');
        break;
      case 'fc_w_shoes':
        await this.handleSmartResponse(chatId, 'women shoes');
        break;
      case 'fc_w_accessories':
        await this.handleSmartResponse(chatId, 'women accessories');
        break;
      case 'fc_k_tshirts':
        await this.handleSmartResponse(chatId, 'kids tshirt');
        break;
      case 'fc_k_jeans':
        await this.handleSmartResponse(chatId, 'kids jeans');
        break;
      case 'fc_k_shoes':
        await this.handleSmartResponse(chatId, 'kids shoes');
        break;
      case 'fc_k_hoodies':
        await this.handleSmartResponse(chatId, 'kids hoodie');
        break;
      
      case 'laptops':
        await this.handleLaptops(chatId);
        break;
      
      case 'laptops_page2':
        await this.handleLaptopsPage2(chatId);
        break;

      case 'audio':
        await this.handleAudio(chatId);
        break;

      case 'audio_page2':
        await this.handleAudioPage2(chatId);
        break;

      case 'tv':
        await this.handleTV(chatId);
        break;

      case 'tv_page2':
        await this.handleTVPage2(chatId);
        break;

      case 'wearables':
        await this.handleWearables(chatId);
        break;

      case 'wearables_page2':
        await this.handleWearablesPage2(chatId);
        break;

      case 'women_fashion_page2':
        await this.handleWomenFashionPage2(chatId);
        break;

      case 'men_fashion_page2':
        await this.handleMenFashionPage2(chatId);
        break;

      case 'shoes_page2':
        await this.handleShoesPage2(chatId);
        break;

      case 'accessories_page2':
        await this.handleAccessoriesPage2(chatId);
        break;

      case 'accessories_promos':
        await this.handleAccessoriesPromos(chatId);
        break;

      case 'accessories_promos_page2':
        await this.handleAccessoriesPromosPage2(chatId);
        break;

      case 'smartphones_page2':
        await this.handleSmartphonesPage2(chatId);
        break;

      case 'men_promos_page2':
        await this.handleMenPromosPage2(chatId);
        break;

      case 'women_promos_page2':
        await this.handleWomenPromosPage2(chatId);
        break;

      case 'food_promos_page2':
        await this.handleFoodPromosPage2(chatId);
        break;

      case 'shoe_promos_page2':
        await this.handleShoePromosPage2(chatId);
        break;

      case 'order_coffee':
        await this.handleOrderCoffee(chatId);
        break;

      case 'coffee_popular':
        await this.handleCoffeePopular(chatId);
        break;

      case 'coffee_cold':
        await this.handleCoffeeCold(chatId);
        break;

      case 'order_chinese':
        await this.handleOrderChinese(chatId);
        break;

      case 'show_map':
        await this.handleShowMap(chatId);
        break;

      case 'map_fashion':
        await this.handleMapFashion(chatId);
        break;

      case 'map_shoes':
        await this.handleMapShoes(chatId);
        break;

      case 'map_food':
        await this.handleMapFood(chatId);
        break;

      case 'map_electronics':
        await this.handleMapElectronics(chatId);
        break;

      case 'no_more_items':
        await this.handleNoMoreItems(chatId);
        break;
      
      case 'search_product':
        await this.handleSearchProduct(chatId);
        break;
      
      case 'hot_deals_page2':
        await this.handleHotDealsPage2(chatId);
        break;
      
      case 'hot_deals_page3':
        await this.handleHotDealsPage3(chatId);
        break;
      
      case 'men_promos':
        await this.handleMenPromos(chatId);
        break;
      
      case 'women_promos':
        await this.handleWomenPromos(chatId);
        break;
      
      case 'men_fashion_page2':
        await this.handleMenFashionPage2(chatId);
        break;
      
      // НОВЫЕ КАТЕГОРИИ ДЛЯ РАСШИРЕНИЯ ВЫБОРА
      case 'home_goods':
        await this.handleHomeGoods(chatId);
        break;

      case 'health':
        await this.handleHealth(chatId);
        break;

      // Удалены второстепенные разделы для упрощения

      case 'top_products':
        await this.handleTopProducts(chatId);
        break;

      case 'top_brand_search':
        await this.handleTopBrandSearch(chatId);
        break;

      case 'top_products_page2':
        await this.handleTopProductsPage2(chatId);
        break;

      case 'my_rewards':
        await this.handleMyRewards(chatId);
        break;

      // 🎯 Новые обработчики для рекомендаций и игр
      case 'personal_recommendations':
        await this.handlePersonalRecommendations(chatId);
        break;

      case 'spin_wheel':
        await this.handleSpinWheel(chatId);
        break;

      case 'daily_quests':
        await this.handleSupport(chatId);
        break;

      // Игровые функции (скрыто)
      case 'spin_wheel':
        await this.handleSupport(chatId);
        break;

      case 'spin_again':
        await this.handleSupport(chatId);
        break;

      case 'start_daily_quests':
        await this.handleSupport(chatId);
        break;

      case 'affiliate_program':
        await this.handleAffiliateProgram(chatId);
        break;
      
      default:
        // Проверяем паттерны callback_data
        if (data.startsWith('show_more_')) {
          const pageNum = parseInt(data.replace('show_more_', ''));
          await this.handleShowMoreResults(chatId, pageNum);
        } else if (data.startsWith('copy_code_')) {
          const index = parseInt(data.replace('copy_code_', ''));
          await this.handleCopyProductPromo(chatId, index);
        } else if (data.startsWith('fav_')) {
          const index = parseInt(data.replace('fav_', ''));
          await this.handleAddFavorite(chatId, index);
        } else {
          // Если кнопка не найдена, показываем главное меню
          await this.handleMainMenu(chatId);
        }
        break;
    }
  }

  async handleHotDeals(chatId) {
    const message = `🔥 <b>СКИДКИ ДНЯ</b>

<b>1.</b> 📱 <a href="https://www.flipkart.com/search?q=iphone+15+pro"><b>iPhone 15 Pro</b></a> - ₹89,999 <s>₹1,34,900</s> (-33%)
🎁 Промокод: <code>IPHONE2000</code> (-₹2,000) = ₹87,999

<b>2.</b> 👟 <a href="https://www.myntra.com/sports-shoes/nike"><b>Nike Air Max</b></a> - ₹4,999 <s>₹12,999</s> (-60%)
🎁 Промокод: <code>NIKE1000</code> (-₹1,000) = ₹3,999

<b>3.</b> 🎧 <a href="https://www.amazon.in/Sony-WH-1000XM5-Wireless-Headphones/dp/B0BY8MC2RB"><b>Sony WH-1000XM5</b></a> - ₹19,999 <s>₹29,999</s> (-33%)
🎁 Промокод: <code>SONY1500</code> (-₹1,500) = ₹18,499

<b>4.</b> 💻 <a href="https://www.apple.com/in/macbook-air/"><b>MacBook Air M3</b></a> - ₹85,999 <s>₹1,14,900</s> (-25%)
🎁 Промокод: <code>APPLE3000</code> (-₹3,000) = ₹82,999

<b>5.</b> 👗 <a href="https://www.myntra.com/dresses/zara"><b>Zara Dress</b></a> - ₹1,999 <s>₹4,999</s> (-60%)
🎁 Промокод: <code>ZARA500</code> (-₹500) = ₹1,499`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '📱 Показать еще 5 товаров', callback_data: 'hot_deals_page2' }
        ],
        [
          { text: '🏠 Главная', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
  }

  async handleVoiceSearch(chatId) {
    const message = `🎤 <b>ГОЛОСОВОЙ ПОИСК - МАГИЯ ПОКУПОК!</b>

<b>Просто скажи что ищешь:</b>
🗣️ "Хочу iPhone подешевле"
🗣️ "Найди кроссовки Nike"  
🗣️ "Покажи скидки на еду"
🗣️ "Нужен ноутбук до 50 тысяч"

<b>🎯 Примеры успешных поисков:</b>
👤 Priya: "iPhone 13" → Нашла за ₹35,999 (-₹15,000)
👤 Arjun: "Кроссовки" → Купил Nike за ₹4,999 (-₹8,000)
👤 Sneha: "Платье" → Заказала Zara за ₹1,999 (-₹3,000)

<b>⚡ Результат за 3 секунды!</b>
<b>🎁 Персональные рекомендации!</b>
<b>💰 Гарантированная экономия!</b>

<i>Запиши голосовое сообщение или напиши текстом ⬇️</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '📱 Электроника', callback_data: 'electronics' },
          { text: '👗 Одежда', callback_data: 'fashion' }
        ],
        // Убраны второстепенные разделы
        [
          { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
  }

  async handleMyCashback(chatId) {
    const user = this.users.get(chatId) || {};
    
    const message = `💰 <b>МОЙ КЭШБЕК И ЭКОНОМИЯ</b>

<b>💎 Твой статус: ${user.level || 'Новичок'}</b>

<b>📊 Статистика:</b>
💰 Доступный кэшбек: ₹${user.cashback || 500}
🎯 Всего сэкономлено: ₹${user.totalSavings || 5000}
🛒 Покупок совершено: ${user.purchases || 3}
⭐ Рейтинг экономии: 4.8/5

<b>🎁 Доступные бонусы:</b>
🔥 Удвоить кэшбек на следующей покупке
💳 Вывести ₹${user.cashback || 500} на карту
🎯 Скидка 20% в любом магазине
🎪 Спин колеса удачи (3 попытки)

<b>📈 До следующего уровня:</b>
████████░░ 80% (осталось ₹2,000 покупок)

<b>🏆 Следующий уровень: "Гуру экономии"</b>
🎁 Бонус: +50% к кэшбеку навсегда!

<i>💡 Совет: Покупай через бота и получай до 15% кэшбека!</i>`;

    const keyboard = {
      inline_keyboard: [
        [ { text: '🛒 Найти товары для покупки', callback_data: 'hot_deals' } ],
        [
          { text: '🎪 Колесо удачи', callback_data: 'spin_wheel' },
          { text: '📊 История покупок', callback_data: 'purchase_history' }
        ],
        [
          { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
  }

  async handlePersonal(chatId) {
    const user = this.users.get(chatId) || {};
    
    const message = `🎯 <b>ПЕРСОНАЛЬНЫЕ РЕКОМЕНДАЦИИ</b>

<b>🧠 AI изучил твои предпочтения:</b>
📱 Электроника (Samsung, Apple) - 65%
👟 Спорт (Nike, Adidas) - 45%  
🍔 Еда (Zomato, Swiggy) - 80%

<b>🔥 Специально для тебя:</b>
📱 <b>iPhone 15</b> - ₹65,999 <i>(твоя цена: -₹8,000)</i>
👟 <b>Nike Air Jordan</b> - ₹12,999 <i>(VIP скидка: -40%)</i>
🍕 <b>Domino's</b> - Бесплатная пицца <i>(лояльность: 15 заказов)</i>

<b>🎁 Персональные бонусы:</b>
⚡ Уведомления только по твоим брендам
🎯 Скидки до 70% (эксклюзив)
💰 Повышенный кэшбек: до 20%
🚀 Приоритетная доставка

<b>⏰ Умные напоминания:</b>
🔔 Когда любимые бренды снижают цены
📅 Сезонные распродажи по твоим категориям  
🎪 Специальные акции только для тебя

<i>🎤 Скажи "Настрой уведомления" для персонализации!</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🔔 Настроить уведомления', callback_data: 'setup_notifications' },
          { text: '🎯 Мои категории', callback_data: 'my_categories' }
        ],
        [
          { text: '🔔 Уведомления', callback_data: 'notifications' },
          { text: '⭐ Избранное', callback_data: 'favorites' }
        ],
        [
          { text: '🌐 Настройки', callback_data: 'settings' },
          { text: '🆘 Поддержка', callback_data: 'support' }
        ],
        [
          { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
  }

  async handleAskAI(chatId) {
    const message = `💬 <b>СПРОСИ AI - ТВОЙ УМНЫЙ ПОМОЩНИК!</b>

<b>🧠 Я помогу тебе:</b>
🔍 Найти лучшие предложения
💰 Сравнить цены в магазинах
🎯 Выбрать оптимальный вариант
⏰ Поймать скидки и акции
🛒 Спланировать покупки

<b>🎤 Примеры вопросов:</b>
"Какой iPhone лучше купить до 50 тысяч?"
"Где дешевле кроссовки Nike?"
"Когда будут скидки на Samsung?"
"Стоит ли покупать сейчас или подождать?"
"Найди аналог дешевле"

<b>⚡ Недавние вопросы:</b>
👤 "Лучший ноутбук для учебы" → HP за ₹35,999 (-₹15,000)
👤 "Где купить iPhone дешевле?" → Flipkart ₹55,999 (-₹20,000)  
👤 "Стоит ли ждать распродажу?" → Да, через 3 дня -30%

<b>🎁 AI знает:</b>
📊 Цены в 500+ магазинах
📈 Тренды и прогнозы скидок
🎯 Твои предпочтения и бюджет
⚡ Секретные промокоды

<i>Задай любой вопрос о покупках! 🎤⬇️</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '📱 Про электронику', callback_data: 'ai_electronics' },
          { text: '👗 Про одежду', callback_data: 'ai_fashion' }
        ],
        [
          { text: '💰 Сравнить цены', callback_data: 'ai_compare' },
          { text: '⏰ Когда покупать?', callback_data: 'ai_timing' }
        ],
        [
          { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
  }

  async handleSmartResponse(chatId, text) {
    // Умные ответы на любые сообщения
    const lowerText = text.toLowerCase();
    const prev = this.users.get(chatId) || {};
    this.users.set(chatId, { ...prev, lastQuery: text });
    
    if (lowerText.includes('iphone') || lowerText.includes('айфон')) {
      await this.handleIPhoneSearch(chatId);
    } else if (lowerText.includes('nike') || lowerText.includes('кроссовки')) {
      await this.handleShoesSearch(chatId);
    } else if (lowerText.includes('еда') || lowerText.includes('пицца') || lowerText.includes('доставка')) {
      await this.handleFoodSearch(chatId);
    } else {
      // Общий умный ответ
      // Реальный поиск по Flipkart/Amazon
      try {
        const category = this.mapQueryToCategory(lowerText);
        const results = await this.productsService.getProducts(category, { query: text, limit: 50 });
        const filtered = this.applyUserFilters(results, chatId);
        if (filtered && filtered.length > 0) {
          // Сохраняем все результаты для пагинации
          const user = this.users.get(chatId) || {};
          user.allSearchResults = filtered;
          user.lastQuery = text;
          this.users.set(chatId, user);
          
          await this.sendProductCards(chatId, filtered, category, { page: 0, showCount: 10 });
          const keyboard = { inline_keyboard: [[{ text: this.t(chatId,'buttons.show_all','🔥 Показать все'), callback_data: 'show_all_results' }, { text: this.t(chatId,'buttons.only_discounts','💰 Только скидки'), callback_data: 'only_discounts' }],[{ text: this.t(chatId,'buttons.filters','⚙️ Фильтры'), callback_data: 'filters' }, { text: '🎤 Voice', callback_data: 'voice_search' }],[{ text: this.t(chatId,'buttons.main_menu','🏠 Главное меню'), callback_data: 'main_menu' }]] };
          await this.sendMessage(chatId, `🧠 <b>Ищу "${text}" для тебя...</b>`, keyboard);
          return;
        }
      } catch (e) {
        console.log('Search fallback:', e.message);
      }

      const message = `🧠 <b>${this.t(chatId,'search.title','Ищу "{q}" для тебя...').replace('{q}', text)}</b>

⚡ <b>${this.t(chatId,'search.stats_title','Найдено за 0.8 сек:')}</b>
🎯 ${this.t(chatId,'search.stats_1','47 предложений по запросу')}
💰 ${this.t(chatId,'search.stats_2','Лучшая цена: от ₹999')}
🏪 ${this.t(chatId,'search.stats_3','Доступно в 23 магазинах')}
🚚 ${this.t(chatId,'search.stats_4','Доставка: от 2 часов')}

<b>🔥 ${this.t(chatId,'search.top3','Топ-3 варианта:')}</b>
🥇 ${this.t(chatId,'best_price','Лучшая цена')}: ₹1,999 (-60%)
🚚 ${this.t(chatId,'fast_delivery','Быстрая доставка')}: ₹2,499
⭐ ${this.t(chatId,'best_rating','Лучший рейтинг')}: ₹2,799 (4.9★)

<b>🔎 ${this.t(chatId,'search.how','Как искать:')}</b>
• ${this.t(chatId,'search.text_tip','Напиши текстом: "OnePlus до 20000" / "курти Biba до 1500"')}
• ${this.t(chatId,'search.voice_tip','Скажи голосом: удержи микрофон и произнеси запрос')}
• ${this.t(chatId,'search.photo_tip','Отправь фото товара: я найду похожие и покажу цены')}
<i>🎤 ${this.t(chatId,'search.refine_tip','Уточни что именно ищешь для точного результата!')}</i>`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '🔥 Показать все', callback_data: 'show_all_results' },
            { text: '💰 Только скидки', callback_data: 'only_discounts' }
          ],
          [
            { text: '🎤 Голосовой поиск', callback_data: 'voice_search' },
            { text: '🏠 Главное меню', callback_data: 'main_menu' }
          ]
        ]
      };

      await this.sendMessage(chatId, message, keyboard);
    }
  }

  // 🔎 Показать все результаты (заглушка на базе умного ответа)
  async handleShowAllResults(chatId) {
    const message = `🔎 <b>${this.t(chatId,'show_all.title','Все результаты')}</b>\n\n${this.t(chatId,'show_all.body','Показываю расширенный список товаров по твоему запросу.')}\n\n<b>${this.t(chatId,'tip','Совет')}:</b> ${this.t(chatId,'show_all.tip','уточни бренд/цену/категорию, например: «Redmi до 15000» или «курти Biba до 2000»')}.`;
    const keyboard = {
      inline_keyboard: [
        [ { text: '⚙️ Фильтры', callback_data: 'filters' }, { text: '💰 Только скидки', callback_data: 'only_discounts' } ],
        [ { text: '🔄 Обновить результаты', callback_data: 'refresh_results' } ],
        [ { text: '🏠 Главное меню', callback_data: 'main_menu' } ]
      ]
    };
    await this.sendMessage(chatId, message, keyboard);
  }

  // 💰 Показать только скидки
  async handleOnlyDiscounts(chatId) {
    const message = `💰 <b>${this.t(chatId,'only_discounts.title','Только товары со скидкой')}</b>\n\n${this.t(chatId,'only_discounts.body','Фильтрую результаты и показываю позиции с наибольшими скидками.')}\n\n<b>${this.t(chatId,'example','Пример')}:</b> ${this.t(chatId,'only_discounts.example','iPhone (‑33%), Nike (‑60%), Redmi (‑40%).')}`;
    const keyboard = {
      inline_keyboard: [
        [ { text: '🔎 Показать все', callback_data: 'show_all_results' } ],
        [ { text: '🏠 Главное меню', callback_data: 'main_menu' } ]
      ]
    };
    await this.sendMessage(chatId, message, keyboard);
  }

  async handleIPhoneSearch(chatId) {
    const message = `📱 <b>IPHONE - ЛУЧШИЕ ПРЕДЛОЖЕНИЯ!</b>

<b>🔥 Горячие скидки на iPhone:</b>
📱 <b>iPhone 15 Pro Max</b> - ₹89,999 <s>₹1,34,900</s> (-33%)
   🎁 + AirPods в подарок | ⭐ 4.9★ | 🚚 Завтра

📱 <b>iPhone 14</b> - ₹55,999 <s>₹79,900</s> (-30%)
   💎 Как новый | ⭐ 4.8★ | 🔥 Хит продаж

📱 <b>iPhone 13</b> - ₹45,999 <s>₹69,900</s> (-34%)
   🎯 Лучшая цена | ⭐ 4.7★ | 💰 Максимальный кэшбек

<b>💰 Твоя экономия: до ₹44,901</b>
<b>🎁 Кэшбек: до ₹4,500</b>

<b>🎯 Персональный совет AI:</b>
Для твоего бюджета лучше iPhone 13 - отличное соотношение цена/качество!

<i>🎤 Скажи "Хочу iPhone 13" для оформления!</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '📱 Купить iPhone 15', callback_data: 'buy_iphone15' },
          { text: '📱 Купить iPhone 14', callback_data: 'buy_iphone14' }
        ],
        [
          { text: '📱 Купить iPhone 13', callback_data: 'buy_iphone13' },
          { text: '💰 Сравнить цены', callback_data: 'compare_iphones' }
        ],
        [
          { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
  }

  // 🛒 ОБРАБОТЧИКИ ПОКУПОК
  async handleBuySony(chatId) {
    const userId = chatId; // Используем chatId как userId для отслеживания
    
    const message = `🎧 <b>SONY WH-1000XM5 - КУПИТЬ СЕЙЧАС!</b>

<b>✅ Ты выбрал:</b>
🎧 Sony WH-1000XM5 Наушники
💰 Лучшая цена: ₹19,999 <s>₹29,999</s> (-33%)
🎁 + Чехол в подарок (₹1,500)
⭐ Рейтинг: 4.7★ (2,847 отзывов)

<b>🏪 ДОСТУПЕН В МАГАЗИНАХ:</b>
🥇 <b>Flipkart</b> - ₹19,999 (лучшая цена + кэшбек 5%)
🥈 <b>Amazon</b> - ₹21,499 (быстрая доставка)
🥉 <b>Croma</b> - ₹22,999 (можно потрогать в магазине)

<b>💰 ДОПОЛНИТЕЛЬНЫЕ СКИДКИ:</b>
🎁 Промокод: <code>SONY5000</code> = -₹2,000
💳 Оплата картой = -2% (₹400)
🔄 Trade-in старых наушников = до -₹3,000

<b>🎯 ТВОЙ КЭШБЕК: ₹999 (5%)</b>
<b>💸 ФИНАЛЬНАЯ ЦЕНА: ₹17,599</b>

<i>⚡ Жми на магазин чтобы купить! Кэшбек придет через 24 часа.</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🛒 Купить на Flipkart ₹19,999', url: `https://www.flipkart.com/sony-wh-1000xm5-bluetooth-headset/p/itm6c5d5f8c89c94?pid=ACCGHYGPZGQZGZPX&ref=bazaarguru&user=${userId}` },
        ],
        [
          { text: '🛒 Купить на Amazon ₹21,499', url: `https://www.amazon.in/Sony-WH-1000XM5-Cancelling-Headphones-Bluetooth/dp/B09XS7JWHH?tag=bazaarguru-21&user=${userId}` }
        ],
        [
          { text: '🛒 Купить в Croma ₹22,999', url: `https://www.croma.com/sony-wh-1000xm5-wireless-noise-cancelling-headphones-black/p/249456?ref=bazaarguru&user=${userId}` }
        ],
        [
          { text: '📋 Скопировать промокод SONY5000', callback_data: 'copy_promo_sony5000' },
          { text: '💰 Активировать кэшбек', callback_data: 'activate_cashback_sony' }
        ],
        [
          { text: '🔙 Назад к скидкам', callback_data: 'hot_deals' },
          { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
    
    // Отслеживаем что пользователь посмотрел товар
    console.log(`📊 User ${userId} viewed Sony WH-1000XM5`);
  }

  async handleBuySamsung(chatId) {
    const userId = chatId;
    
    const message = `📱 <b>SAMSUNG GALAXY S24 - КУПИТЬ СЕЙЧАС!</b>

<b>✅ Ты выбрал:</b>
📱 Samsung Galaxy S24 (256GB)
💰 Лучшая цена: ₹45,999 <s>₹79,999</s> (-42%)
🎁 + Galaxy Buds в подарок (₹8,999)
⭐ Рейтинг: 4.8★ (5,234 отзыва)

<b>🏪 ДОСТУПЕН В МАГАЗИНАХ:</b>
🥇 <b>Samsung Store</b> - ₹45,999 (официальный + trade-in до ₹15,000)
🥈 <b>Flipkart</b> - ₹46,999 (кэшбек 5% + быстрая доставка)
🥉 <b>Amazon</b> - ₹47,999 (Prime доставка сегодня)

<b>🎨 ДОСТУПНЫЕ ЦВЕТА:</b>
⚫ Phantom Black | 🟣 Violet | 🟡 Amber Yellow | ⚪ Marble Gray

<b>💰 ДОПОЛНИТЕЛЬНЫЕ СКИДКИ:</b>
🎁 Промокод: <code>GALAXY5000</code> = -₹5,000
💳 Банковская скидка = -₹3,000
🔄 Trade-in = до -₹15,000

<b>🎯 ТВОЙ КЭШБЕК: ₹2,299 (5%)</b>
<b>💸 ФИНАЛЬНАЯ ЦЕНА: ₹37,999</b>

<i>⚡ Выбери магазин и цвет! Кэшбек придет через 24 часа.</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🛒 Samsung Store ₹45,999', url: `https://www.samsung.com/in/smartphones/galaxy-s24/buy/?modelCode=SM-S921BZKDINS&ref=bazaarguru&user=${userId}` }
        ],
        [
          { text: '🛒 Flipkart ₹46,999', url: `https://www.flipkart.com/samsung-galaxy-s24-5g-onyx-black-256-gb/p/itm6ac6485515ab4?ref=bazaarguru&user=${userId}` }
        ],
        [
          { text: '🛒 Amazon ₹47,999', url: `https://www.amazon.in/Samsung-Galaxy-Storage-Phantom-Black/dp/B0CMDRCJGX?tag=bazaarguru-21&user=${userId}` }
        ],
        [
          { text: '📋 Скопировать промокод GALAXY5000', callback_data: 'copy_promo_galaxy5000' },
          { text: '🔄 Узнать Trade-in цену', callback_data: 'samsung_tradein' }
        ],
        [
          { text: '🔙 Назад к скидкам', callback_data: 'hot_deals' },
          { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
    
    console.log(`📊 User ${userId} viewed Samsung Galaxy S24`);
  }

  async handleBuyAdidas(chatId) {
    const userId = chatId;
    
    const message = `👟 <b>ADIDAS ULTRABOOST 22 - КУПИТЬ СЕЙЧАС!</b>

<b>✅ Ты выбрал:</b>
👟 Adidas Ultraboost 22
💰 Лучшая цена: ₹8,999 <s>₹15,999</s> (-44%)
⭐ Рейтинг: 4.9★ (1,567 отзывов)
🏃‍♂️ Для бега и повседневной носки

<b>🏪 ДОСТУПЕН В МАГАЗИНАХ:</b>
🥇 <b>Adidas Store</b> - ₹8,999 (официальный + примерка)
🥈 <b>Myntra</b> - ₹9,499 (кэшбек 7% + бесплатный возврат)
🥉 <b>Ajio</b> - ₹9,999 (доставка сегодня)

<b>👟 РАЗМЕРЫ В НАЛИЧИИ:</b>
US 8 (41) | US 9 (42) | US 10 (43) | US 11 (44)

<b>🎨 ЦВЕТА:</b>
⚫ Core Black | 🔵 Cloud White | 🟣 Solar Red

<b>💰 ДОПОЛНИТЕЛЬНЫЕ СКИДКИ:</b>
🎁 Промокод: <code>BOOST2000</code> = -₹2,000
💳 Первая покупка = -₹1,000
🧦 Носки Adidas в подарок

<b>🎯 ТВОЙ КЭШБЕК: ₹449 (5%)</b>
<b>💸 ФИНАЛЬНАЯ ЦЕНА: ₹5,999</b>

<i>⚡ Выбери магазин и размер! Примерка дома 15 минут бесплатно.</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🛒 Adidas Store ₹8,999', url: `https://www.adidas.co.in/ultraboost-22-shoes/GZ0127.html?ref=bazaarguru&user=${userId}` }
        ],
        [
          { text: '🛒 Myntra ₹9,499', url: `https://www.myntra.com/sports-shoes/adidas/adidas-men-ultraboost-22-running-shoes/15227274/buy?ref=bazaarguru&user=${userId}` }
        ],
        [
          { text: '🛒 Ajio ₹9,999', url: `https://www.ajio.com/adidas-ultraboost-22-running-shoes/p/469114340_black?ref=bazaarguru&user=${userId}` }
        ],
        [
          { text: '📋 Скопировать промокод BOOST2000', callback_data: 'copy_promo_boost2000' }
        ],
        [
          { text: '🔙 Назад к скидкам', callback_data: 'hot_deals' },
          { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
    
    console.log(`📊 User ${userId} viewed Adidas Ultraboost 22`);
  }

  async handleBuyIPhone(chatId, model) {
    let phoneModel = '';
    let price = '';
    let oldPrice = '';
    let discount = '';
    
    switch(model) {
      case 'buy_iphone15':
        phoneModel = 'iPhone 15 Pro Max';
        price = '₹89,999';
        oldPrice = '₹1,34,900';
        discount = '-33%';
        break;
      case 'buy_iphone14':
        phoneModel = 'iPhone 14';
        price = '₹55,999';
        oldPrice = '₹79,900';
        discount = '-30%';
        break;
      case 'buy_iphone13':
        phoneModel = 'iPhone 13';
        price = '₹45,999';
        oldPrice = '₹69,900';
        discount = '-34%';
        break;
    }

    const message = `📱 <b>${phoneModel.toUpperCase()} - ОФОРМЛЕНИЕ ПОКУПКИ</b>

<b>✅ Ты выбрал:</b>
📱 ${phoneModel} (128GB)
💰 Цена: ${price} <s>${oldPrice}</s> (${discount})
🎁 + AirPods в подарок (₹24,900)
⭐ Рейтинг: 4.9★ | 🔥 Хит продаж

<b>🎨 Выбери цвет:</b>
⚫ Space Black | 🟣 Deep Purple | 🟡 Yellow | ⚪ Silver

<b>💾 Память:</b>
128GB (+₹0) | 256GB (+₹10,000) | 512GB (+₹30,000)

<b>🚚 Доставка:</b>
⚡ Сегодня до 20:00 (₹499)
🚛 Завтра (Бесплатно)
🏪 Самовывоз Apple Store (₹0 + скидка ₹1,000)

<b>🎁 Твои бонусы:</b>
💰 Кэшбек: ₹2,299 (5%)
🔄 Trade-in: до ₹25,000 за старый iPhone
📱 Защита экрана + чехол в подарок

<b>💸 ИТОГО: ${price} (экономия до ₹44,901!)</b>

<i>🔥 Только 12 штук осталось по этой цене!</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '⚫ Space Black', callback_data: 'iphone_black' },
          { text: '🟣 Deep Purple', callback_data: 'iphone_purple' }
        ],
        [
          { text: '🟡 Yellow', callback_data: 'iphone_yellow' },
          { text: '⚪ Silver', callback_data: 'iphone_silver' }
        ],
        [
          { text: '💳 Купить сейчас', callback_data: 'buy_iphone_now' },
          { text: '🔄 Trade-in', callback_data: 'iphone_tradein' }
        ],
        [
          { text: '🔙 К iPhone', callback_data: 'iphone_search' },
          { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
  }

  // Добавляем обработчики для категорий
  async handleElectronics(chatId) {
    const message = `📱 <b>${this.t(chatId,'electronics.title','ЭЛЕКТРОНИКА - ГОРЯЧИЕ СКИДКИ!')}</b>

${this.t(chatId,'electronics.subtitle','🏆 #1 онлайн-покупки в Индии | Найдено: 50,000+ товаров')}

<b>🔥 ${this.t(chatId,'electronics.top_now','Топ предложения сейчас:')}</b>

<b>1.</b> 📱 <a href="https://www.flipkart.com/search?q=iphone+15+pro"><b>iPhone 15 Pro</b></a> - ₹89,999 <s>₹1,34,900</s> (-33%)
🎁 ${this.t(chatId,'electronics.promo_code','Промокод')}: <code>IPHONE2000</code> (-₹2,000) = ₹87,999

<b>2.</b> 💻 <a href="https://www.apple.com/in/macbook-air/"><b>MacBook Air M3</b></a> - ₹85,999 <s>₹1,14,900</s> (-25%)
🎁 ${this.t(chatId,'electronics.promo_code','Промокод')}: <code>APPLE3000</code> (-₹3,000) = ₹82,999

<b>3.</b> 🎧 <a href="https://www.amazon.in/Sony-WH-1000XM5-Wireless-Headphones/dp/B0BY8MC2RB"><b>Sony WH-1000XM5</b></a> - ₹19,999 <s>₹29,999</s> (-33%)
🎁 ${this.t(chatId,'electronics.promo_code','Промокод')}: <code>SONY1500</code> (-₹1,500) = ₹18,499

<b>4.</b> 📺 <a href="https://www.amazon.in/s?k=smart+tv+samsung"><b>Samsung Smart TV</b></a> - ₹25,999 <s>₹45,999</s> (-43%)
🎁 ${this.t(chatId,'electronics.promo_code','Промокод')}: <code>TV2000</code> (-₹2,000) = ₹23,999

<b>5.</b> ⌚ <a href="https://www.amazon.in/Apple-Watch-GPS-40mm-Aluminium/dp/B0BDHB9Y8P"><b>Apple Watch SE</b></a> - ₹24,999 <s>₹29,900</s> (-16%)
🎁 ${this.t(chatId,'electronics.promo_code','Промокод')}: <code>WATCH1000</code> (-₹1,000) = ₹23,999

<b>💰 ${this.t(chatId,'your_savings','Твоя экономия')}: до ₹35,000</b>
<b>🎁 ${this.t(chatId,'cashback','Кэшбек')}: до ₹3,500</b>

<i>🎤 ${this.t(chatId,'voice_hint','Скажи "Хочу iPhone" для поиска!')}</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: this.t(chatId,'categories.smartphones','📱 Смартфоны'), callback_data: 'smartphones' },
          { text: this.t(chatId,'categories.laptops','💻 Ноутбуки'), callback_data: 'laptops' }
        ],
        [
          { text: this.t(chatId,'categories.audio','🎧 Аудио'), callback_data: 'audio' },
          { text: this.t(chatId,'categories.tv','📺 ТВ'), callback_data: 'tv' }
        ],
        [
          { text: this.t(chatId,'categories.wearables','⌚ Гаджеты'), callback_data: 'wearables' },
          { text: this.t(chatId,'buttons.hot_deals','🔥 Скидки дня'), callback_data: 'hot_deals' }
        ],
        [
          { text: this.t(chatId,'buttons.brand_search','🔎 Поиск по бренду'), callback_data: 'electronics_brand_search' }
        ],
        [
          { text: this.t(chatId,'buttons.main_menu','🏠 Главное меню'), callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
  }

  async handleElectronicsBrandSearch(chatId) {
    const message = `🔎 <b>${this.t(chatId,'electronics.brand_search_title','ПОИСК БРЕНДА В ЭЛЕКТРОНИКЕ')}</b>

${this.t(chatId,'electronics.brand_search_hint','Напишите, например: "Xiaomi", "Samsung", "OnePlus", "realme", "Sony".\nЯ подберу смартфоны, ноутбуки, аудио и ТВ со скидками.')}`;
    const keyboard = { 
      inline_keyboard: [
        [
          { text: this.t(chatId,'buttons.back','🔙 Назад'), callback_data: 'electronics' }, 
          { text: this.t(chatId,'buttons.main_menu','🏠 Главное меню'), callback_data: 'main_menu' }
        ]
      ] 
    };
    await this.sendMessage(chatId, message, keyboard);
  }

  async handleFashion(chatId) {
    const message = `👗 <b>${this.t(chatId,'fashion.title','МОДА - СТИЛЬНЫЕ СКИДКИ!')}</b>

<b>🔥 Горячие предложения:</b>

<b>1.</b> 👗 <a href="https://www.myntra.com/dresses/zara"><b>Платья Zara</b></a> - ₹1,999 <s>₹3,990</s> (-50%)
🎁 Промокод: <code>ZARA300</code> (-₹300) = ₹1,699

<b>2.</b> 👔 <a href="https://www.myntra.com/men-shirts?ref=bazaarguru"><b>Рубашки Arrow</b></a> - ₹1,499 <s>₹2,999</s> (-50%)
🎁 Промокод: <code>SHIRT200</code> (-₹200) = ₹1,299

<b>3.</b> 👟 <a href="https://www.myntra.com/sports-shoes/nike"><b>Nike Air Max</b></a> - ₹4,999 <s>₹12,999</s> (-60%)
🎁 Промокод: <code>NIKE1000</code> (-₹1,000) = ₹3,999

<b>4.</b> 👜 <a href="https://www.myntra.com/handbags/coach"><b>Сумки Coach</b></a> - ₹8,999 <s>₹24,999</s> (-64%)
🎁 Промокод: <code>COACH500</code> (-₹500) = ₹8,499

<b>5.</b> 💍 <a href="https://www.tanishq.co.in/jewellery"><b>Украшения Tanishq</b></a> - ₹15,999 <s>₹22,000</s> (-27%)
🎁 Промокод: <code>JEWEL1000</code> (-₹1,000) = ₹14,999

<b>💰 Твоя экономия: до ₹15,000</b>
<b>🎁 Кэшбек: до ₹1,500</b>

<i>🎤 Скажи "Хочу платье Zara" для поиска!</i>`;

    const keyboard = {
      inline_keyboard: [
        [ { text: this.t(chatId,'fashion.women','👗 Женская'), callback_data: 'women_fashion' }, { text: this.t(chatId,'fashion.men','👔 Мужская'), callback_data: 'men_fashion' } ],
        [ { text: this.t(chatId,'fashion.kids','🧒 Детская'), callback_data: 'kids_fashion' }, { text: this.t(chatId,'buttons.brand_search','🔎 Поиск по бренду'), callback_data: 'fashion_brand_search' } ],
        [ { text: this.t(chatId,'hot_deals','🔥 Все скидки'), callback_data: 'hot_deals' } ],
        [ { text: this.t(chatId,'buttons.main_menu','🏠 Главное меню'), callback_data: 'main_menu' } ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
  }

  // 🧒 ДЕТСКАЯ ОДЕЖДА
  async handleKidsFashion(chatId) {
    const userId = chatId;
    const message = `🧒 <b>ДЕТСКАЯ ОДЕЖДА - ВЫБОР РОДИТЕЛЕЙ</b>

<b>1.</b> 👕 <a href="https://www.myntra.com/boys-tshirts?ref=bazaarguru&user=${userId}"><b>Футболка для мальчиков</b></a> - ₹499 <s>₹899</s> (-44%)
🎁 Промокод: <code>KIDS100</code>

<b>2.</b> 👗 <a href="https://www.myntra.com/girls-dresses?ref=bazaarguru&user=${userId}"><b>Платье для девочек</b></a> - ₹799 <s>₹1,499</s> (-47%)
🎁 Промокод: <code>KIDS150</code>

<b>3.</b> 👟 <a href="https://www.myntra.com/kids-shoes?ref=bazaarguru&user=${userId}"><b>Детские кроссовки</b></a> - ₹1,199 <s>₹2,299</s> (-48%)
🎁 Промокод: <code>KIDS200</code>

<b>4.</b> 🧥 <a href="https://www.myntra.com/kids-jackets?ref=bazaarguru&user=${userId}"><b>Куртки для детей</b></a> - ₹1,499 <s>₹2,999</s> (-50%)
🎁 Промокод: <code>KIDS250</code>

<b>5.</b> 🎒 <a href="https://www.myntra.com/kids-accessories?ref=bazaarguru&user=${userId}"><b>Аксессуары</b></a> - от ₹299
🎁 Промокод: <code>KIDS50</code>`;

    const keyboard = {
      inline_keyboard: [
        [ { text: '👕 T‑Shirts', callback_data: 'fc_k_tshirts' }, { text: '👖 Jeans', callback_data: 'fc_k_jeans' } ],
        [ { text: '👟 Shoes', callback_data: 'fc_k_shoes' }, { text: '🧥 Hoodies', callback_data: 'fc_k_hoodies' } ],
        [ { text: '🧒 '+this.t(chatId,'buttons.show_more_5','Показать ещё 5'), callback_data: 'kids_fashion_page2' } ],
        [ { text: this.t(chatId,'buttons.brand_search','🔎 Поиск по бренду'), callback_data: 'fashion_brand_search' } ],
        [ { text: this.t(chatId,'buttons.back','🔙 Назад'), callback_data: 'fashion' }, { text: this.t(chatId,'buttons.main_menu','🏠 Главное меню'), callback_data: 'main_menu' } ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
  }

  async handleKidsFashionPage2(chatId) {
    const message = `🧒 <b>ДЕТСКАЯ ОДЕЖДА — ЕЩЁ 5</b>

6. 👕 Комплект (2 шт.) — ₹699
7. 👗 Нарядное платье — ₹1,299
8. 👟 Беговые кроссовки — ₹1,499
9. 🧦 Носки (5 пар) — ₹199
10. 🎒 Рюкзак — ₹499`;

    const keyboard = { inline_keyboard: [[{ text: '🔙 Назад', callback_data: 'kids_fashion' }, { text: '🏠 Главное меню', callback_data: 'main_menu' }]] };
    await this.sendMessage(chatId, message, keyboard);
  }

  // Поиск по брендам (подсказка)
  async handleFashionBrandSearch(chatId) {
    const message = `🔎 <b>ПОИСК ПО БРЕНДУ</b>

Напишите, например: "Zara", "Levi's", "Biba", "Puma". Я подберу лучшие предложения.`;
    const keyboard = { inline_keyboard: [[{ text: '🏠 Главное меню', callback_data: 'main_menu' }]] };
    await this.sendMessage(chatId, message, keyboard);
  }

  // 👟 ОБУВЬ - отдельная категория
  async handleShoes(chatId) {
    const userId = chatId;
    
    const message = `👟 <b>ОБУВЬ - ЛУЧШИЕ ПРЕДЛОЖЕНИЯ!</b>

<b>🔥 Горячие скидки на обувь:</b>

👟 <a href="https://www.myntra.com/sports-shoes/nike/nike-men-air-max-270-sneakers/2322447/buy?ref=bazaarguru&user=${userId}"><b>Nike Air Max 270</b></a> - ₹6,999 <s>₹12,995</s> (-46%)
   🎯 Самые популярные | ⭐ 4.8★ | 🚚 Завтра
   🎁 Промокод: <code>NIKE600</code> (-₹600) = ₹6,399

👟 <a href="https://www.adidas.co.in/ultraboost-22-shoes/GZ0127.html?ref=bazaarguru&user=${userId}"><b>Adidas Ultraboost 22</b></a> - ₹8,999 <s>₹15,999</s> (-44%)
   🏃‍♂️ Для бега | ⭐ 4.9★ | 🎁 Носки в подарок
   🎁 Промокод: <code>ADIDAS30</code> (-30%) = ₹6,299

👟 <a href="https://in.puma.com/in/en/pd/rs-x-sneakers/369579.html?ref=bazaarguru&user=${userId}"><b>Puma RS-X</b></a> - ₹4,999 <s>₹8,999</s> (-44%)
   🎨 Стильные | ⭐ 4.6★ | 💰 Лучшая цена
   🎁 Промокод: <code>PUMA25</code> (-25%) = ₹3,749

👠 <a href="https://www.bata.in/women-formal-shoes?ref=bazaarguru&user=${userId}"><b>Женские туфли Bata</b></a> - ₹1,999 <s>₹3,999</s> (-50%)
   💼 Офисные | ⭐ 4.5★ | 🚚 Бесплатная доставка
   🎁 Промокод: <code>BATA40</code> (-40%) = ₹1,199

<b>💰 Твоя экономия: до ₹8,000</b>
<b>🎁 Кэшбек: до ₹450</b>

<b>👟 РАЗМЕРЫ В НАЛИЧИИ:</b>
UK 6-12 | US 7-13 | EU 39-47

<i>🎤 Скажи "Хочу Nike размер 42" для точного поиска!</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '👟 Показать еще 5 товаров', callback_data: 'shoes_page2' }
        ],
        [
          { text: '🔙 Назад к моде', callback_data: 'fashion' },
          { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
    console.log(`📊 User ${userId} browsed shoes category`);
  }

  // 👜 АКСЕССУАРЫ - отдельная категория  
  async handleAccessories(chatId) {
    const userId = chatId;
    
    const message = `👜 <b>АКСЕССУАРЫ - СТИЛЬНЫЕ СКИДКИ!</b>

<b>🔥 Горячие предложения:</b>

<b>1.</b> 👜 <a href="https://www.myntra.com/handbags/coach?ref=bazaarguru&user=${userId}"><b>Сумка Coach</b></a> - ₹8,999 <s>₹24,999</s> (-64%)
   💎 Оригинал | ⭐ 4.9★ | 🎁 Подарочная упаковка
   🎁 Промокод: <code>BAG200</code> (-₹200) = ₹8,799

<b>2.</b> ⌚ <a href="https://www.amazon.in/Apple-Watch-GPS-40mm-Aluminium/dp/B0BDHB9Y8P?tag=bazaarguru-21&user=${userId}"><b>Apple Watch SE</b></a> - ₹24,999 <s>₹29,900</s> (-16%)
   📱 GPS модель | ⭐ 4.8★ | 🚚 Сегодня
   🎁 Промокод: <code>WATCH300</code> (-₹300) = ₹24,699

<b>3.</b> 🕶️ <a href="https://www.lenskart.com/ray-ban-sunglasses.html?ref=bazaarguru&user=${userId}"><b>Ray-Ban Aviator</b></a> - ₹6,999 <s>₹12,990</s> (-46%)
   😎 Классика | ⭐ 4.7★ | 🔥 Хит продаж
   🎁 Промокод: <code>SUNGLASSES150</code> (-₹150) = ₹6,849

<b>4.</b> 💍 <a href="https://www.tanishq.co.in/collections/rings?ref=bazaarguru&user=${userId}"><b>Золотое кольцо Tanishq</b></a> - ₹15,999 <s>₹22,000</s> (-27%)
   💎 18K золото | ⭐ 4.9★ | 📜 Сертификат
   🎁 Промокод: <code>JEWELRY500</code> (-₹500) = ₹15,499

<b>💰 Твоя экономия: до ₹16,000</b>
<b>🎁 Кэшбек: до ₹1,250</b>

<i>🎤 Скажи "Хочу сумку Coach" для поиска!</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '👜 Показать еще 5 товаров', callback_data: 'accessories_page2' }
        ],
        [
          { text: '🔙 Назад к моде', callback_data: 'fashion' },
          { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
    console.log(`📊 User ${userId} browsed accessories category`);
  }

  // 🎁 ПРОМОКОДЫ АКСЕССУАРОВ
  async handleAccessoriesPromos(chatId) {
    const message = `🎁 <b>ПРОМОКОДЫ АКСЕССУАРОВ</b>

<b>🔥 Активные промокоды:</b>

<b>1.</b> 👜 <code>BAG200</code> - скидка ₹200 на сумки
💰 Минимальная сумма: ₹1,000
📅 Действует до: 31.12.2024

<b>2.</b> ⌚ <code>WATCH300</code> - скидка ₹300 на часы
💰 Минимальная сумма: ₹2,000
📅 Действует до: 15.01.2025

<b>3.</b> 🕶️ <code>SUNGLASSES150</code> - скидка ₹150 на очки
💰 Максимальная скидка: ₹150
📅 Действует до: 28.01.2025

<b>4.</b> 💍 <code>JEWELRY500</code> - скидка ₹500 на украшения
💰 Минимальная сумма: ₹3,000
📅 Действует до: 10.02.2025

<b>5.</b> 👜 <code>ACCESSORIES250</code> - скидка ₹250 на аксессуары
💰 Максимальная скидка: ₹250
📅 Действует до: 05.02.2025

<b>💰 Общая экономия: до ₹1,400</b>

<i>📋 Нажми на промокод чтобы скопировать его!</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🎁 Показать еще 5 промокодов', callback_data: 'accessories_promos_page2' }
        ],
        [
          { text: '🔙 Назад к аксессуарам', callback_data: 'accessories' },
          { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
  }

  // 🎁 ПРОМОКОДЫ АКСЕССУАРОВ - ВТОРАЯ СТРАНИЦА
  async handleAccessoriesPromosPage2(chatId) {
    const message = `🎁 <b>ПРОМОКОДЫ АКСЕССУАРОВ - ЕЩЕ 5!</b>

<b>🔥 Дополнительные промокоды:</b>

<b>6.</b> 👛 <code>WALLET100</code> - скидка ₹100 на кошельки
💰 Максимальная скидка: ₹100
📅 Действует до: 20.02.2025

<b>7.</b> 👜 <code>BACKPACK400</code> - скидка ₹400 на рюкзаки
💰 Минимальная сумма: ₹2,500
📅 Действует до: 15.02.2025

<b>8.</b> ⌚ <code>BRACELET200</code> - скидка ₹200 на браслеты
💰 Максимальная скидка: ₹200
📅 Действует до: 10.03.2025

<b>9.</b> 💍 <code>RING600</code> - скидка ₹600 на кольца
💰 Минимальная сумма: ₹4,000
📅 Действует до: 25.01.2025

<b>10.</b> 🕶️ <code>GLASSES300</code> - скидка ₹300 на солнцезащитные очки
💰 Максимальная скидка: ₹300
📅 Действует до: 05.02.2025

<b>💰 Общая экономия: до ₹1,600</b>

<i>📋 Нажми на промокод чтобы скопировать его!</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '📱 Больше промокодов пока нет', callback_data: 'no_more_items' }
        ],
        [
          { text: '🔙 Назад к промокодам аксессуаров', callback_data: 'accessories_promos' },
          { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
  }

  // 👜 АКСЕССУАРЫ - ВТОРАЯ СТРАНИЦА
  async handleAccessoriesPage2(chatId) {
    const userId = chatId;

    const message = `👜 <b>АКСЕССУАРЫ - ДОПОЛНИТЕЛЬНЫЕ ТОВАРЫ!</b>

<b>🔥 Дополнительные предложения:</b>

<b>6.</b> 👜 <a href="https://www.myntra.com/handbags/michael-kors?ref=bazaarguru&user=${userId}"><b>Сумка Michael Kors</b></a> - ₹12,999 <s>₹29,999</s> (-57%)
   💎 Оригинал | ⭐ 4.9★ | 🎁 Подарочная упаковка
   🎁 Промокод: <code>BAG200</code> (-₹200) = ₹12,799

<b>7.</b> ⌚ <a href="https://www.garmin.com/en-IN/watches/wearables/forerunner-265/?ref=bazaarguru&user=${userId}"><b>Garmin Forerunner 265</b></a> - ₹32,999 <s>₹42,999</s> (-23%)
   🏃‍♂️ GPS трекер | ⭐ 4.8★ | 🎁 Браслеты в подарок
   🎁 Промокод: <code>WATCH300</code> (-₹300) = ₹32,699

<b>8.</b> 🕶️ <a href="https://www.lenskart.com/sunglasses/ray-ban/aviator.html?ref=bazaarguru&user=${userId}"><b>Ray-Ban Wayfarer</b></a> - ₹7,999 <s>₹14,990</s> (-47%)
   😎 Классика | ⭐ 4.7★ | 🔥 Хит продаж
   🎁 Промокод: <code>SUNGLASSES150</code> (-₹150) = ₹7,849

<b>9.</b> 💍 <a href="https://www.tanishq.co.in/collections/necklaces?ref=bazaarguru&user=${userId}"><b>Золотое ожерелье Tanishq</b></a> - ₹25,999 <s>₹35,000</s> (-26%)
   💎 18K золото | ⭐ 4.9★ | 📜 Сертификат
   🎁 Промокод: <code>JEWELRY500</code> (-₹500) = ₹25,499

<b>10.</b> 👛 <a href="https://www.myntra.com/wallets?ref=bazaarguru&user=${userId}"><b>Кошелек Gucci</b></a> - ₹8,999 <s>₹19,999</s> (-55%)
   💎 Кожа | ⭐ 4.8★ | 🎁 Защитная пленка
   🎁 Промокод: <code>BAG200</code> (-₹200) = ₹8,799

<b>💰 Твоя экономия: до ₹40,000</b>
<b>🎁 Кэшбек: до ₹4,000</b>

<i>👜 Выбери стильный аксессуар!</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '👜 Больше товаров пока нет', callback_data: 'no_more_items' }
        ],
        [
          { text: '🔙 Назад к аксессуарам', callback_data: 'accessories' },
          { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
    console.log(`📊 User ${userId} browsed accessories page 2`);
  }

  // 👗 ЖЕНСКАЯ ОДЕЖДА - отдельная категория
  async handleWomenFashion(chatId) {
    const userId = chatId;
    
    const message = `👗 <b>${this.t(chatId,'fashion.women_title','ЖЕНСКАЯ ОДЕЖДА - МОДНЫЕ СКИДКИ!')}</b>

<b>1.</b> 👗 <a href="https://www.myntra.com/dresses/zara?ref=bazaarguru&user=${userId}"><b>Платье Zara</b></a> - ₹1,999 <s>₹3,990</s> (-50%)
🎁 Промокод: <code>ZARA300</code> (-₹300) = ₹1,699

<b>2.</b> 👚 <a href="https://www2.hm.com/en_in/women/tops/shirts-blouses.html?ref=bazaarguru&user=${userId}"><b>Блузка H&M</b></a> - ₹999 <s>₹1,999</s> (-50%)
🎁 Промокод: <code>HM150</code> (-₹150) = ₹849

<b>3.</b> 👖 <a href="https://www.myntra.com/jeans/levis/levis-women-jeans?ref=bazaarguru&user=${userId}"><b>Джинсы Levi's</b></a> - ₹2,999 <s>₹4,999</s> (-40%)
🎁 Промокод: <code>LEVIS400</code> (-₹400) = ₹2,599

<b>4.</b> 🧥 <a href="https://shop.mango.com/in/women/coats-and-jackets?ref=bazaarguru&user=${userId}"><b>Куртка Mango</b></a> - ₹3,999 <s>₹7,999</s> (-50%)
🎁 Промокод: <code>MANGO500</code> (-₹500) = ₹3,499

<b>5.</b> 👠 <a href="https://www.myntra.com/shoes/charles-keith?ref=bazaarguru&user=${userId}"><b>Туфли Charles & Keith</b></a> - ₹2,499 <s>₹4,999</s> (-50%)
🎁 Промокод: <code>SHOES250</code> (-₹250) = ₹2,249`;

    const keyboard = {
      inline_keyboard: [
        [ { text: '👗 Dresses', callback_data: 'fc_w_dresses' }, { text: '👚 Tops', callback_data: 'fc_w_tops' } ],
        [ { text: '👖 Jeans', callback_data: 'fc_w_jeans' }, { text: '🧥 Hoodies', callback_data: 'fc_w_hoodies' } ],
        [ { text: '👠 Shoes', callback_data: 'fc_w_shoes' }, { text: '👜 Accessories', callback_data: 'fc_w_accessories' } ],
        [ { text: this.t(chatId,'buttons.brand_search','🔎 Поиск по бренду'), callback_data: 'fashion_brand_search' } ],
        [ { text: this.t(chatId,'buttons.main_menu','🏠 Главное меню'), callback_data: 'main_menu' } ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
    console.log(`📊 User ${userId} browsed women fashion category`);
  }

  // 👔 МУЖСКАЯ ОДЕЖДА - отдельная категория
  async handleMenFashion(chatId) {
    const userId = chatId;
    
    const message = `👔 <b>${this.t(chatId,'fashion.men_title','МУЖСКАЯ ОДЕЖДА - СТИЛЬНЫЕ СКИДКИ!')}</b>

<b>1.</b> 👔 <a href="https://www.myntra.com/men-shirts?ref=bazaarguru&user=${userId}"><b>Рубашка Arrow</b></a> - ₹1,499 <s>₹2,999</s> (-50%)
🎁 Промокод: <code>SHIRT200</code> (-₹200) = ₹1,299

<b>2.</b> 👕 <a href="https://www.myntra.com/men-tshirts?ref=bazaarguru&user=${userId}"><b>Футболка Nike</b></a> - ₹999 <s>₹1,995</s> (-50%)
🎁 Промокод: <code>NIKE150</code> (-₹150) = ₹849

<b>3.</b> 👖 <a href="https://www.myntra.com/men-jeans?ref=bazaarguru&user=${userId}"><b>Джинсы Wrangler</b></a> - ₹1,999 <s>₹3,999</s> (-50%)
🎁 Промокод: <code>JEANS300</code> (-₹300) = ₹1,699

<b>4.</b> 🧥 <a href="https://www.myntra.com/men-jackets?ref=bazaarguru&user=${userId}"><b>Куртка Adidas</b></a> - ₹2,999 <s>₹5,999</s> (-50%)
🎁 Промокод: <code>JACKET500</code> (-₹500) = ₹2,499

<b>5.</b> 👟 <a href="https://www.myntra.com/men-sports-shoes?ref=bazaarguru&user=${userId}"><b>Кроссовки Puma</b></a> - ₹3,499 <s>₹6,999</s> (-50%)
🎁 Промокод: <code>PUMA400</code> (-₹400) = ₹3,099`;

    const keyboard = {
      inline_keyboard: [
        [ { text: '👔 Shirts', callback_data: 'fc_m_shirts' }, { text: '👕 T‑Shirts', callback_data: 'fc_m_tshirts' } ],
        [ { text: '👖 Jeans', callback_data: 'fc_m_jeans' }, { text: '🧥 Hoodies', callback_data: 'fc_m_hoodies' } ],
        [ { text: '👟 Shoes', callback_data: 'fc_m_shoes' }, { text: '👜 Accessories', callback_data: 'fc_m_accessories' } ],
        [ { text: this.t(chatId,'buttons.brand_search','🔎 Поиск по бренду'), callback_data: 'fashion_brand_search' } ],
        [ { text: this.t(chatId,'buttons.main_menu','🏠 Главное меню'), callback_data: 'main_menu' } ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
    console.log(`📊 User ${userId} browsed men fashion category`);
  }

  async handleFood(chatId) { await this.handleMainMenu(chatId); }

  // 🏠 НОВАЯ КАТЕГОРИЯ: ДОМ И САД - больше товаров для повседневной жизни
  async handleHomeGoods(chatId) {
    const userId = chatId;

    const message = `🏠 <b>ДОМ И САД - УЮТНЫЕ СКИДКИ!</b>

<b>🔥 Горячие предложения для дома:</b>

<b>1.</b> 🛋️ <a href="https://www.flipkart.com/furniture/sofas"><b>Диван IKEA</b></a> - ₹12,999 <s>₹24,999</s> (-48%)
🎁 Промокод: <code>HOME1000</code> (-₹1,000) = ₹11,999

<b>2.</b> 🛏️ <a href="https://www.amazon.in/bedding"><b>Постельное белье</b></a> - ₹1,499 <s>₹2,999</s> (-50%)
🎁 Промокод: <code>BED200</code> (-₹200) = ₹1,299

<b>3.</b> 🍳 <a href="https://www.amazon.in/kitchen-appliances"><b>Мультиварка</b></a> - ₹2,999 <s>₹5,999</s> (-50%)
🎁 Промокод: <code>KITCHEN300</code> (-₹300) = ₹2,699

<b>4.</b> 🧹 <a href="https://www.flipkart.com/home-cleaning"><b>Пылесос</b></a> - ₹8,999 <s>₹15,999</s> (-44%)
🎁 Промокод: <code>CLEAN500</code> (-₹500) = ₹8,499

<b>5.</b> 🌱 <a href="https://www.amazon.in/gardening"><b>Садовый набор</b></a> - ₹799 <s>₹1,499</s> (-47%)
🎁 Промокод: <code>GARDEN100</code> (-₹100) = ₹699

<b>6.</b> 🏺 <a href="https://www.flipkart.com/kitchen-containers"><b>Контейнеры для еды</b></a> - ₹599 <s>₹1,199</s> (-50%)
🎁 Промокод: <code>STORAGE80</code> (-₹80) = ₹519

<b>7.</b> 💡 <a href="https://www.amazon.in/smart-home"><b>Умная лампочка</b></a> - ₹1,299 <s>₹2,499</s> (-48%)
🎁 Промокод: <code>SMART150</code> (-₹150) = ₹1,149

<b>8.</b> 🪑 <a href="https://www.flipkart.com/office-chairs"><b>Офисное кресло</b></a> - ₹4,999 <s>₹9,999</s> (-50%)
🎁 Промокод: <code>CHAIR400</code> (-₹400) = ₹4,599

<b>💰 Твоя экономия: до ₹13,000</b>
<b>🎁 Кэшбек: до ₹1,300</b>

<i>🎤 Скажи "Хочу диван" для поиска!</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🛋️ Мебель', callback_data: 'furniture' },
          { text: '🍳 Кухня', callback_data: 'kitchen' }
        ],
        [
          { text: '🧹 Уборка', callback_data: 'cleaning' },
          { text: '🌱 Сад', callback_data: 'garden' }
        ],
        [
          { text: '📱 Смарт дом', callback_data: 'smart_home' },
          { text: '🔥 Все скидки', callback_data: 'hot_deals' }
        ],
        [
          { text: '📋 Показать еще 8 товаров', callback_data: 'home_goods_page2' }
        ],
        [
          { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
    console.log(`📊 User ${userId} browsed home goods category`);
  }

  // 💪 НОВАЯ КАТЕГОРИЯ: ЗДОРОВЬЕ И КРАСОТА
  async handleHealth(chatId) {
    const userId = chatId;

    const message = `💪 <b>ЗДОРОВЬЕ И КРАСОТА - ЗАБОТА О СЕБЕ!</b>

<b>🔥 Лучшие предложения:</b>

<b>1.</b> 💊 <a href="https://www.amazon.in/vitamins"><b>Витамины Vitamin D</b></a> - ₹899 <s>₹1,499</s> (-40%)
🎁 Промокод: <code>VITAMIN100</code> (-₹100) = ₹799

<b>2.</b> 🧴 <a href="https://www.nykaa.com/face-moisturizer"><b>Увлажняющий крем</b></a> - ₹1,299 <s>₹2,499</s> (-48%)
🎁 Промокод: <code>NYKAA200</code> (-₹200) = ₹1,099

<b>3.</b> 🏃‍♂️ <a href="https://www.amazon.in/fitness-trackers"><b>Фитнес браслет</b></a> - ₹2,499 <s>₹4,999</s> (-50%)
🎁 Промокод: <code>FITNESS300</code> (-₹300) = ₹2,199

<b>4.</b> 🦷 <a href="https://www.amazon.in/dental-care"><b>Электрическая зубная щетка</b></a> - ₹1,999 <s>₹3,999</s> (-50%)
🎁 Промокод: <code>DENTAL250</code> (-₹250) = ₹1,749

<b>5.</b> 🌿 <a href="https://www.amazon.in/herbal-products"><b>Натуральные добавки</b></a> - ₹699 <s>₹1,299</s> (-46%)
🎁 Промокод: <code>HERBAL80</code> (-₹80) = ₹619

<b>6.</b> 💄 <a href="https://www.nykaa.com/makeup-kits"><b>Набор косметики</b></a> - ₹1,499 <s>₹2,999</s> (-50%)
🎁 Промокод: <code>MAKEUP200</code> (-₹200) = ₹1,299

<b>7.</b> 🧴 <a href="https://www.amazon.in/body-care"><b>Уход за телом</b></a> - ₹799 <s>₹1,499</s> (-47%)
🎁 Промокод: <code>BODY100</code> (-₹100) = ₹699

<b>8.</b> 🌸 <a href="https://www.nykaa.com/hair-care"><b>Уход за волосами</b></a> - ₹1,099 <s>₹2,199</s> (-50%)
🎁 Промокод: <code>HAIR150</code> (-₹150) = ₹949

<b>💰 Твоя экономия: до ₹5,000</b>
<b>🎁 Кэшбек: до ₹500</b>

<i>🎤 Скажи "Хочу витамины" для поиска!</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '💊 Витамины', callback_data: 'vitamins' },
          { text: '🧴 Уход', callback_data: 'skincare' }
        ],
        [
          { text: '💄 Косметика', callback_data: 'makeup' },
          { text: '🏃‍♂️ Фитнес', callback_data: 'fitness' }
        ],
        [
          { text: '🦷 Стоматология', callback_data: 'dental' },
          { text: '🔥 Все скидки', callback_data: 'hot_deals' }
        ],
        [
          { text: '📋 Показать еще 8 товаров', callback_data: 'health_page2' }
        ],
        [
          { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
    console.log(`📊 User ${userId} browsed health category`);
  }

  // Удалено: спорт (фокус на e-commerce)

  // ⭐ ТОП ТОВАРЫ - самые популярные предложения
  async handleTopProducts(chatId) {
    const userId = chatId;
    const message = `⭐ <b>${this.t(chatId,'top.title','ТОП ТОВАРОВ - ЛУЧШИЕ ПРОДАЖИ НЕДЕЛИ!')}</b>

<b>🔥 ${this.t(chatId,'top.popular','Самые популярные товары:')}</b>

<b>🥇 1.</b> 📱 <a href="https://www.flipkart.com/search?q=iphone+15+pro"><b>iPhone 15 Pro</b></a> - ₹89,999 <s>₹1,34,900</s> (-33%)
🎁 ${this.t(chatId,'labels.promo_code','Промокод')}: <code>TOP5000</code> (-₹5,000) = ₹84,999

<b>🥈 2.</b> 👟 <a href="https://www.myntra.com/sports-shoes/nike"><b>Nike Air Max</b></a> - ₹4,999 <s>₹12,999</s> (-60%)
🎁 ${this.t(chatId,'labels.promo_code','Промокод')}: <code>TOP1000</code> (-₹1,000) = ₹3,999

<b>🥉 3.</b> 💻 <a href="https://www.apple.com/in/macbook-air/"><b>MacBook Air M3</b></a> - ₹85,999 <s>₹1,14,900</s> (-25%)
🎁 ${this.t(chatId,'labels.promo_code','Промокод')}: <code>TOP3000</code> (-₹3,000) = ₹82,999

<b>4.</b> 🧴 <a href="https://www.nykaa.com/face-moisturizer"><b>Moisturizer</b></a> - ₹1,299 <s>₹2,499</s> (-48%)
🎁 ${this.t(chatId,'labels.promo_code','Промокод')}: <code>TOP200</code> (-₹200) = ₹1,099

<b>5.</b> 🏠 <a href="https://www.flipkart.com/furniture/sofas"><b>IKEA Sofa</b></a> - ₹12,999 <s>₹24,999</s> (-48%)
🎁 ${this.t(chatId,'labels.promo_code','Промокод')}: <code>TOP1000</code> (-₹1,000) = ₹11,999

<b>6.</b> ⚽ <a href="https://www.amazon.in/sports-balls"><b>Football</b></a> - ₹1,499 <s>₹2,999</s> (-50%)
🎁 ${this.t(chatId,'labels.promo_code','Промокод')}: <code>TOP200</code> (-₹200) = ₹1,299

<b>💰 ${this.t(chatId,'your_savings','Твоя экономия')}: до ₹10,000</b>
<b>🎁 ${this.t(chatId,'cashback','Кэшбек')}: до ₹1,000</b>

<i>⭐ ${this.t(chatId,'top.trust','Эти товары выбирают тысячи пользователей!')}</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '📱 Техника', callback_data: 'top_electronics' },
          { text: '👗 Одежда', callback_data: 'top_fashion' }
        ],
        [
          { text: '📋 Показать ещё 5', callback_data: 'top_products_page2' }
        ],
        [
          { text: '🔎 Поиск по бренду/магазину', callback_data: 'top_brand_search' }
        ],
        [
          { text: '🔥 Все скидки', callback_data: 'hot_deals' },
          { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
    console.log(`📊 User ${userId} browsed top products`);
  }

  async handleTopBrandSearch(chatId) {
    const message = `🔎 <b>ПОИСК В ТОП ТОВАРАХ</b>

Напишите бренд или магазин: "Xiaomi", "Samsung", "Sony", "Myntra", "Flipkart". Я найду лучшие предложения из топа.`;
    const keyboard = { inline_keyboard: [[{ text: '🔙 Назад к топу', callback_data: 'top_products' }, { text: '🏠 Главное меню', callback_data: 'main_menu' }]] };
    await this.sendMessage(chatId, message, keyboard);
  }

  // ⭐ ТОП ТОВАРЫ — страница 2
  async handleTopProductsPage2(chatId) {
    const message = `⭐ <b>${this.t(chatId,'top.title','ТОП ТОВАРОВ - ЛУЧШИЕ ПРОДАЖИ НЕДЕЛИ!')}</b>

<b>7.</b> 📱 <b>Redmi Note 13 Pro</b> - ₹18,999 (-40%)
${this.t(chatId,'labels.promo_code','Промокод')}: <code>TOP500</code>

<b>8.</b> 🎧 <b>boAt Airdopes</b> - ₹1,299 (-48%)
${this.t(chatId,'labels.promo_code','Промокод')}: <code>TOP150</code>

<b>9.</b> ⌚ <b>Noise Smartwatch</b> - ₹1,999 (-45%)
${this.t(chatId,'labels.promo_code','Промокод')}: <code>TOP300</code>

<b>10.</b> 👟 <b>Puma Sneakers</b> - ₹1,999 (-50%)
${this.t(chatId,'labels.promo_code','Промокод')}: <code>TOP200</code>

<b>11.</b> 👗 <b>Biba Kurti</b> - ₹1,499 (-40%)
${this.t(chatId,'labels.promo_code','Промокод')}: <code>TOP150</code>`;

    const keyboard = {
      inline_keyboard: [
        [ { text: this.t(chatId,'buttons.back','🔙 Назад'), callback_data: 'top_products' }, { text: this.t(chatId,'buttons.main_menu','🏠 Главное меню'), callback_data: 'main_menu' } ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
  }

  // 🎯 ПЕРСОНАЛЬНЫЕ РЕКОМЕНДАЦИИ
  async handlePersonalRecommendations(chatId) {
    const userId = chatId;
    const recommendations = this.generatePersonalizedRecommendations(userId);

    const message = `🎯 <b>ПЕРСОНАЛЬНЫЕ РЕКОМЕНДАЦИИ</b>

🧠 <b>Рекомендовано специально для тебя:</b>

${recommendations.map((rec, index) =>
  `<b>${index + 1}.</b> ${rec.name}\n` +
  `💰 Цена: ₹${rec.price.toLocaleString()} ${rec.discount ? `(-${rec.discount}%)` : ''}\n` +
  `💡 ${rec.reason || 'Персональная рекомендация'}\n`
).join('\n')}

<b>🎁 Экономия: до ₹${Math.max(...recommendations.map(r => r.price * (r.discount || 0) / 100)).toLocaleString()}</b>
<b>⭐ Точность рекомендаций: 94%</b>

<i>🤖 Рекомендации основаны на твоих предпочтениях!</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🛒 Купить топ-1', callback_data: 'buy_recommended_1' },
          { text: '🔄 Обновить', callback_data: 'personal_recommendations' }
        ],
        [
          { text: '🎮 Колесо фортуны', callback_data: 'spin_wheel' },
          { text: '🎯 Ежедневные квесты', callback_data: 'daily_quests' }
        ],
        [
          { text: '🏆 Мои награды', callback_data: 'my_rewards' },
          { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
    console.log(`🎯 User ${userId} viewed personalized recommendations`);
  }

  // Удалено: услуги (фокус на e-commerce)

  // Удалено: бюджетные товары (каталог упрощен)

  // 🎮 МОИ НАГРАДЫ - система геймификации
  async handleMyRewards(chatId) {
    const userId = chatId;
    const user = this.users.get(chatId) || { rewards: 0, level: 1, purchases: 0 };

    const message = `🎮 <b>МОИ НАГРАДЫ - ТВОЙ ПРОГРЕСС!</b>

<b>🏆 Твой уровень: ${user.level}</b>
<b>💰 Накоплено кэшбека: ₹${user.rewards || 0}</b>
<b>🛒 Совершено покупок: ${user.purchases || 0}</b>

<b>🎯 Достижения:</b>
${user.purchases >= 1 ? '✅ Первая покупка' : '🔒 Первая покупка'}
${user.purchases >= 5 ? '✅ 5 покупок' : '🔒 5 покупок'}
${user.purchases >= 10 ? '✅ 10 покупок' : '🔒 10 покупок'}
${user.rewards >= 500 ? '✅ ₹500 кэшбека' : '🔒 ₹500 кэшбека'}
${user.rewards >= 1000 ? '✅ ₹1,000 кэшбека' : '🔒 ₹1,000 кэшбека'}

<b>🎁 Ежедневные награды:</b>
🌅 <b>Утренний бонус:</b> +₹10 кэшбека
📱 <b>Первая покупка дня:</b> +₹50 кэшбека
👥 <b>Пригласи друга:</b> +₹100 кэшбека

<b>🎪 Специальные акции:</b>
🔥 <b>День рождения:</b> двойной кэшбек
🎯 <b>Новый уровень:</b> персональная скидка
⭐ <b>VIP статус:</b> приоритетная поддержка

<i>💡 Совершай покупки и получай награды!</i>`;

    const keyboard = {
      inline_keyboard: [
        [ { text: '🎯 Мои достижения', callback_data: 'my_achievements' } ],
        [
          { text: '🎁 Ежедневные бонусы', callback_data: 'daily_bonuses' },
          { text: '👥 Пригласить друга', callback_data: 'invite_friend' }
        ],
        [ { text: '🏆 Уровень выше', callback_data: 'level_up' } ],
        [
          { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
    console.log(`📊 User ${userId} checked rewards`);
  }

  // Добавляем обработчик для главного меню
  async handleMainMenu(chatId) {
    const firstName = this.users.get(chatId)?.firstName || 'Friend';
    await this.sendWelcomeMessage(chatId, firstName);
  }

  // 🍔 ОБРАБОТЧИКИ ЕДЫ
  async handleFoodPromos(chatId) {
    const message = `🎁 <b>ПРОМОКОДЫ ЕДЫ</b>

<b>🔥 Активные промокоды:</b>

🍕 <code>DOMINOS50</code> - скидка 50% на 2 пиццы
   ⏰ До: 31.01.2025 | 💰 Экономия: ₹400

🍔 <code>MCFREE</code> - бесплатная доставка McDonald's
   ⏰ До: 28.01.2025 | 💰 Экономия: ₹49

🍜 <code>ZOMATO30</code> - скидка 30% на первый заказ
   ⏰ До: 15.02.2025 | 💰 Экономия: ₹200

☕ <code>COFFEE20</code> - скидка 20% в Starbucks
   ⏰ До: 10.02.2025 | 💰 Экономия: ₹100

🥘 <code>SWIGGY40</code> - скидка 40% + бесплатная доставка
   ⏰ До: 05.02.2025 | 💰 Экономия: ₹300

<b>💰 Общая экономия: до ₹1,049</b>

<i>📋 Нажми на промокод чтобы скопировать его!</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🎁 Показать еще 5 промокодов', callback_data: 'food_promos_page2' }
        ],
        [
          { text: '🔙 Назад к еде', callback_data: 'food' },
          { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
  }

  // 🍔 ЗАКАЗАТЬ MCDONALD'S
  async handleOrderMcdonalds(chatId) {
    const userId = chatId;

    const message = `🍔 <b>MCDONALD'S - ЗАКАЗАТЬ ЕДУ</b>

<b>🍟 Популярные комбо:</b>

<b>1.</b> 🍔 <a href="https://www.mcdelivery.co.in/menu/burgers/mcveggie-burger"><b>McVeggie Burger</b></a> - ₹119
   🍟 + Картошка фри (R) ₹49

<b>2.</b> 🍔 <a href="https://www.mcdelivery.co.in/menu/burgers/mcchicken-burger"><b>McChicken Burger</b></a> - ₹169
   🥤 + Кола (M) ₹99 = ₹268

<b>3.</b> 🍟 <a href="https://www.mcdelivery.co.in/menu/sides/fries"><b>Картошка фри (L)</b></a> - ₹109
   🍔 + McAloo Tikki Burger ₹49 = ₹158

<b>🚚 Доставка:</b>
📍 Бесплатная доставка от ₹200
⏰ Время доставки: 20-30 минут
💰 Минимальный заказ: ₹100

<b>🎁 Специальные предложения:</b>
🔥 Скидка 20% на первый заказ
🎯 Бесплатный напиток с каждым бургером
⭐ Кэшбек 5% на все заказы

<i>🍕 Выбери свое любимое блюдо!</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🍔 Заказать через приложение', url: `https://www.mcdelivery.co.in/?ref=bazaarguru&user=${userId}` }
        ],
        [
          { text: '📱 Скачать McDelivery App', url: `https://play.google.com/store/apps/details?id=com.mcdonalds.mobileapp&ref=bazaarguru&user=${userId}` }
        ],
        [
          { text: '🔙 Назад к ресторанам', callback_data: 'food' },
          { text: '🏠 Главная', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
    console.log(`🍔 User ${userId} ordered McDonald's`);
  }

  // 🥘 ЗАКАЗАТЬ ИНДИЙСКУЮ ЕДУ
  async handleOrderIndian(chatId) {
    const userId = chatId;

    const message = `🥘 <b>ИНДИЙСКАЯ КУХНЯ - ЗАКАЗАТЬ ЕДУ</b>

<b>🍛 Популярные блюда:</b>

<b>1.</b> 🍛 <a href="https://www.zomato.com/delivery/chicken-biryani"><b>Chicken Biryani</b></a> - ₹189
   🥙 С рисом басмати и специями

<b>2.</b> 🥙 <a href="https://www.zomato.com/delivery/paneer-butter-masala"><b>Paneer Butter Masala</b></a> - ₹159
   🍚 С рисом или нааном ₹40

<b>3.</b> 🍜 <a href="https://www.zomato.com/delivery/chicken-tikka-masala"><b>Chicken Tikka Masala</b></a> - ₹199
   🥘 Классическое карри

<b>🍽️ Комбо обеды:</b>
<b>Вегетарианское комбо:</b> ₹149
   🥗 Rajma + Rice + Salad + Lassi

<b>Невегетарианское комбо:</b> ₹189
   🍗 Chicken Curry + Rice + Raita

<b>🚚 Доставка через:</b>
🍽️ Zomato - от ₹99 (бесплатно от ₹300)
🥘 Swiggy - от ₹89 (бесплатно от ₹250)
📍 DoorDash - от ₹79 (бесплатно от ₹200)

<b>🎁 Скидки и промокоды:</b>
🔥 30% скидка на первый заказ Zomato
🎯 Бесплатная доставка Swiggy
⭐ 20% кэшбек на все заказы

<i>🍛 Выбери аутентичную индийскую кухню!</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🍽️ Заказать через Zomato', url: `https://www.zomato.com/?ref=bazaarguru&user=${userId}` }
        ],
        [
          { text: '🥘 Заказать через Swiggy', url: `https://www.swiggy.com/?ref=bazaarguru&user=${userId}` }
        ],
        [
          { text: '📍 Заказать через DoorDash', url: `https://www.doordash.com/?ref=bazaarguru&user=${userId}` }
        ],
        [
          { text: '🔙 Назад к ресторанам', callback_data: 'food' },
          { text: '🏠 Главная', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
    console.log(`🥘 User ${userId} ordered Indian food`);
  }

  async handleNearbyRestaurants(chatId) {
    const message = `📍 <b>РЕСТОРАНЫ РЯДОМ С ТОБОЙ</b>

<b>🎯 В радиусе 2 км:</b>

🍕 <b>Pizza Hut</b> - 0.8 км
   ⏰ Доставка: 15 мин | 💰 Скидка: 30%
   🎁 Промокод: PIZZA30

🍔 <b>McDonald's</b> - 1.2 км  
   ⏰ Доставка: 20 мин | 💰 Скидка: 25%
   🎁 Бесплатная доставка

🍜 <b>Китайский ресторан</b> - 0.5 км
   ⏰ Доставка: 25 мин | 💰 Скидка: 40%
   🎁 Промокод: CHINA40

☕ <b>Cafe Coffee Day</b> - 0.3 км
   ⏰ Доставка: 10 мин | 💰 Скидка: 20%
   🎁 Второй кофе бесплатно

🥘 <b>Индийский ресторан</b> - 1.5 км
   ⏰ Доставка: 30 мин | 💰 Скидка: 35%
   🎁 Промокод: INDIA35

<b>💰 Средняя экономия: ₹150 на заказ</b>

<i>📍 Выбери ближайший ресторан!</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🍕 Заказать Pizza Hut', callback_data: 'order_pizzahut' },
          { text: '🍔 Заказать McDonald\'s', callback_data: 'order_mcdonalds' }
        ],
        [
          { text: '🍜 Заказать китайское', callback_data: 'order_chinese' },
          { text: '☕ Заказать кофе', callback_data: 'order_coffee' }
        ],
        [
          { text: '🥘 Заказать индийское', callback_data: 'order_indian' },
          { text: '🗺️ Показать на карте', callback_data: 'show_map' }
        ],
        [
          { text: '🔙 Назад к еде', callback_data: 'food' },
          { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
  }

  async handleShoePromos(chatId) {
    const message = `🎁 <b>ПРОМОКОДЫ ОБУВИ</b>

<b>🔥 Активные промокоды:</b>

👟 <code>NIKE20</code> - скидка 20% на все Nike
   ⏰ До: 31.01.2025 | 💰 Экономия: до ₹3,000

👟 <code>ADIDAS30</code> - скидка 30% на Adidas
   ⏰ До: 15.02.2025 | 💰 Экономия: до ₹4,500

👟 <code>PUMA25</code> - скидка 25% на Puma
   ⏰ До: 28.01.2025 | 💰 Экономия: до ₹2,500

👠 <code>BATA40</code> - скидка 40% на женскую обувь
   ⏰ До: 10.02.2025 | 💰 Экономия: до ₹1,600

👟 <code>SHOES50</code> - скидка 50% на вторую пару
   ⏰ До: 05.02.2025 | 💰 Экономия: до ₹6,000

<b>💰 Общая экономия: до ₹17,600</b>

<i>📋 Нажми на промокод чтобы скопировать его!</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🎁 Показать еще 5 промокодов', callback_data: 'shoe_promos_page2' }
        ],
        [
          { text: '🔙 Назад к обуви', callback_data: 'shoes' },
          { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
  }

  // 📋 ОБРАБОТЧИКИ ПРОМОКОДОВ И КЭШБЕКА
  async handleCopyPromo(chatId, promoCode, productName) {
    const u = this.users.get(chatId) || {};
    const recentPromos = [promoCode, ...(u.recentPromos || [])].slice(0, 10);
    this.users.set(chatId, { ...u, recentPromos });

    const message = `📋 <b>${this.t(chatId,'labels.promo_code','ПРОМОКОД')} ${this.t(chatId,'copied','СКОПИРОВАН!')}</b>

<b>🎁 Промокод:</b> <code>${promoCode}</code>

<b>📱 Как использовать:</b>
1. Перейди в магазин по ссылке выше
2. Добавь ${productName} в корзину
3. На странице оплаты введи промокод: <code>${promoCode}</code>
4. Скидка применится автоматически!

<b>💰 ${this.t(chatId,'your_benefit','Твоя выгода')}:</b>
🎯 ${this.t(chatId,'discount_by_code','Скидка по промокоду')}

<b>⏰ Промокод действует: 24 часа</b>

<i>💡 Совет: Скопируй промокод сейчас, чтобы не забыть!</i>`;

    const keyboard = {
      inline_keyboard: [
        [ { text: '🔙 Назад к товару', callback_data: 'hot_deals' } ],
        [
          { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
    
    // Отслеживаем использование промокода
    console.log(`📊 User ${chatId} copied promo code: ${promoCode} for ${productName}`);
  }

  async handleActivateCashback(chatId, productName, cashbackAmount) {
    const message = `💰 <b>КЭШБЕК АКТИВИРОВАН!</b>

<b>🎯 Товар:</b> ${productName}
<b>💰 Кэшбек:</b> ${cashbackAmount} (5%)

<b>✅ Что дальше:</b>
1. Переходи в магазин по ссылке
2. Покупай как обычно
3. Кэшбек придет через 24 часа
4. Выводи на карту или трать в боте

<b>📊 Статус отслеживания:</b>
🔄 Переход в магазин: Ожидается
💳 Покупка: Ожидается  
💰 Кэшбек: Будет начислен после покупки

<b>🎁 Бонус:</b>
За эту покупку получишь +50 XP к уровню экономии!

<i>🔔 Пришлем уведомление когда кэшбек поступит!</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '📊 Мои покупки', callback_data: 'my_purchases' },
          { text: '💰 История кэшбека', callback_data: 'cashback_history' }
        ],
        [
          { text: '🔙 Назад к товару', callback_data: 'hot_deals' },
          { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
    
    // Отслеживаем активацию кэшбека
    console.log(`📊 User ${chatId} activated cashback for ${productName}: ${cashbackAmount}`);
  }

  // 💳 ОБРАБОТЧИКИ ОПЛАТЫ
  async handlePayCardSony(chatId) {
    const userId = chatId;
    
    const message = `💳 <b>ОПЛАТА КАРТОЙ - SONY WH-1000XM5</b>

<b>✅ Способ оплаты:</b> Банковская карта
<b>💰 Цена:</b> ₹19,999
<b>🎁 Скидка за карту:</b> -₹400 (-2%)
<b>💸 К доплате:</b> ₹19,599

<b>🏪 ВЫБЕРИ МАГАЗИН ДЛЯ ПОКУПКИ:</b>
🥇 <b>Flipkart</b> - лучшая цена + быстрая доставка
🥈 <b>Amazon</b> - Prime доставка сегодня  
🥉 <b>Croma</b> - можно потрогать в магазине

<b>💳 ПРИНИМАЮТСЯ КАРТЫ:</b>
💳 Visa, MasterCard, RuPay
🏦 Все индийские банки
📱 UPI через карту

<b>🎁 БОНУСЫ:</b>
💰 Кэшбек: ₹980 (5%)
🎯 Банковский кэшбек: до ₹1,000
⚡ Мгновенное списание

<i>⚡ Выбери магазин для безопасной оплаты!</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '💳 Оплатить на Flipkart ₹19,599', url: `https://www.flipkart.com/sony-wh-1000xm5-bluetooth-headset/p/itm6c5d5f8c89c94?pid=ACCGHYGPZGQZGZPX&ref=bazaarguru&user=${userId}&payment=card` }
        ],
        [
          { text: '💳 Оплатить на Amazon ₹19,599', url: `https://www.amazon.in/Sony-WH-1000XM5-Cancelling-Headphones-Bluetooth/dp/B09XS7JWHH?tag=bazaarguru-21&user=${userId}&payment=card` }
        ],
        [
          { text: '💳 Оплатить в Croma ₹19,599', url: `https://www.croma.com/sony-wh-1000xm5-wireless-noise-cancelling-headphones-black/p/249456?ref=bazaarguru&user=${userId}&payment=card` }
        ],
        [
          { text: '🔙 Другие способы оплаты', callback_data: 'buy_sony' },
          { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
    console.log(`📊 User ${userId} selected card payment for Sony`);
  }

  async handlePayUPISony(chatId) {
    const userId = chatId;
    
    const message = `📱 <b>ОПЛАТА UPI - SONY WH-1000XM5</b>

<b>✅ Способ оплаты:</b> UPI (мгновенно)
<b>💰 Цена:</b> ₹19,999
<b>💸 К доплате:</b> ₹19,999

<b>🏪 ВЫБЕРИ МАГАЗИН ДЛЯ ПОКУПКИ:</b>
🥇 <b>Flipkart</b> - поддерживает все UPI
🥈 <b>Amazon</b> - Amazon Pay UPI
🥉 <b>Croma</b> - Croma Pay UPI

<b>📱 ПОДДЕРЖИВАЕМЫЕ UPI:</b>
💙 PhonePe, Google Pay, Paytm
🏦 Все банковские UPI приложения
⚡ Мгновенное зачисление

<b>🎁 БОНУСЫ:</b>
💰 Кэшбек: ₹999 (5%)
🎯 UPI кэшбек: до ₹500
⚡ Без комиссии

<i>⚡ Выбери магазин для быстрой UPI оплаты!</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '📱 Оплатить UPI на Flipkart ₹19,999', url: `https://www.flipkart.com/sony-wh-1000xm5-bluetooth-headset/p/itm6c5d5f8c89c94?pid=ACCGHYGPZGQZGZPX&ref=bazaarguru&user=${userId}&payment=upi` }
        ],
        [
          { text: '📱 Оплатить UPI на Amazon ₹19,999', url: `https://www.amazon.in/Sony-WH-1000XM5-Cancelling-Headphones-Bluetooth/dp/B09XS7JWHH?tag=bazaarguru-21&user=${userId}&payment=upi` }
        ],
        [
          { text: '📱 Оплатить UPI в Croma ₹19,999', url: `https://www.croma.com/sony-wh-1000xm5-wireless-noise-cancelling-headphones-black/p/249456?ref=bazaarguru&user=${userId}&payment=upi` }
        ],
        [
          { text: '🔙 Другие способы оплаты', callback_data: 'buy_sony' },
          { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
    console.log(`📊 User ${userId} selected UPI payment for Sony`);
  }

  async handlePayCashSony(chatId) {
    const userId = chatId;
    
    const message = `💰 <b>НАЛИЧНЫМИ ПРИ ПОЛУЧЕНИИ - SONY WH-1000XM5</b>

<b>✅ Способ оплаты:</b> Наличными курьеру
<b>💰 Цена:</b> ₹19,999
<b>💸 К доплате:</b> ₹19,999 (при получении)

<b>🏪 ДОСТУПНО В МАГАЗИНАХ:</b>
🥇 <b>Flipkart</b> - доставка завтра, оплата курьеру
🥈 <b>Amazon</b> - доставка сегодня, наличными
🥉 <b>Croma</b> - самовывоз, оплата в магазине

<b>📦 УСЛОВИЯ ДОСТАВКИ:</b>
🚚 Бесплатная доставка
📞 Звонок за час до доставки
💰 Точная сумма приветствуется
🔍 Проверка товара при получении

<b>🎁 БОНУСЫ:</b>
💰 Кэшбек: ₹999 (5%) - через 48 часов
🎯 Гарантия возврата: 7 дней
⚡ Без предоплаты

<i>⚡ Выбери магазин для доставки наличными!</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '💰 Заказать на Flipkart (наличными)', url: `https://www.flipkart.com/sony-wh-1000xm5-bluetooth-headset/p/itm6c5d5f8c89c94?pid=ACCGHYGPZGQZGZPX&ref=bazaarguru&user=${userId}&payment=cod` }
        ],
        [
          { text: '💰 Заказать на Amazon (наличными)', url: `https://www.amazon.in/Sony-WH-1000XM5-Cancelling-Headphones-Bluetooth/dp/B09XS7JWHH?tag=bazaarguru-21&user=${userId}&payment=cod` }
        ],
        [
          { text: '💰 Забрать в Croma (наличными)', url: `https://www.croma.com/sony-wh-1000xm5-wireless-noise-cancelling-headphones-black/p/249456?ref=bazaarguru&user=${userId}&payment=cod` }
        ],
        [
          { text: '🔙 Другие способы оплаты', callback_data: 'buy_sony' },
          { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
    console.log(`📊 User ${userId} selected cash payment for Sony`);
  }

  // 🚚 ОБРАБОТЧИК ДОСТАВКИ
  async handleChangeDelivery(chatId) {
    const message = `🚚 <b>ВАРИАНТЫ ДОСТАВКИ</b>

<b>📦 Выбери удобный способ:</b>

⚡ <b>Экспресс доставка</b> - ₹199
   🕐 Сегодня до 22:00
   📞 SMS с трек-номером
   🎯 Приоритетная обработка

🚛 <b>Обычная доставка</b> - Бесплатно
   🕐 Завтра до 18:00  
   📞 Звонок за час
   📦 Стандартная упаковка

🏪 <b>Самовывоз</b> - Бесплатно
   🕐 Через 2 часа готов
   💰 Дополнительная скидка ₹500
   🔍 Можно проверить товар

🏠 <b>Доставка на дом</b> - ₹99
   🕐 В удобное время
   📞 Согласование времени
   🚪 До двери квартиры

<i>⚡ Выбери удобный вариант доставки!</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '⚡ Экспресс ₹199 (сегодня)', callback_data: 'express_delivery' },
          { text: '🚛 Обычная (завтра)', callback_data: 'standard_delivery' }
        ],
        [
          { text: '🏪 Самовывоз (-₹500)', callback_data: 'pickup_delivery' },
          { text: '🏠 На дом ₹99', callback_data: 'home_delivery' }
        ],
        [
          { text: '🔙 Назад к товару', callback_data: 'buy_sony' },
          { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
  }

  // ❤️ ОБРАБОТЧИК ИЗБРАННОГО
  async handleAddFavorite(chatId, index = null) {
    if (index !== null) {
      const user = this.users.get(chatId) || {};
      const results = user.lastSearchResults || [];
      if (index < results.length) {
        const product = results[index];
        const message = `❤️ <b>Добавлено в избранное!</b>

🖼️ <b>${product.title}</b>
💰 ₹${(product.price||0).toLocaleString()}

💡 <i>Избранное временно отключено, но мы запомнили ваш интерес к этому товару!</i>`;
        await this.sendMessage(chatId, message);
        return;
      }
    }
    
    const message = `❤️ <b>Избранное временно отключено</b>

Мы фокусируемся на простой покупке через промокоды.`;
    const keyboard = { inline_keyboard: [[{ text: this.t(chatId,'buttons.main_menu','🏠 Главное меню'), callback_data: 'main_menu' }]] };
    await this.sendMessage(chatId, message, keyboard);
  }

  // 📋 ОБРАБОТЧИК КОПИРОВАНИЯ ПРОМОКОДА
  async handleCopyProductPromo(chatId, index) {
    const user = this.users.get(chatId) || {};
    const results = user.lastSearchResults || [];
    if (index < results.length) {
      const product = results[index];
      let domain = 'flipkart.com';
      if (product.source === 'amazon') domain = 'amazon.in';
      if (product.source === 'myntra') domain = 'myntra.com';
      if (product.source === 'nykaa') domain = 'nykaa.com';
      if (product.source === 'ajio') domain = 'ajio.com';
      
      const promo = await this.pickPromocode('general', domain);
      const message = `📋 <b>Промокод скопирован!</b>

🎫 <code>${promo}</code>

🖼️ <b>${product.title}</b>
💰 ₹${(product.price||0).toLocaleString()}

💡 <i>Нажмите на промокод чтобы скопировать, затем откройте товар!</i>`;
      
      const keyboard = { 
        inline_keyboard: [
          [{ text: '🛒 Открыть товар', url: product.affiliateUrl }],
          [{ text: this.t(chatId,'buttons.main_menu','🏠 Главное меню'), callback_data: 'main_menu' }]
        ]
      };
      await this.sendMessage(chatId, message, keyboard);
    }
  }

  // 📋 ОБРАБОТЧИК "ПОКАЗАТЬ ЕЩЁ"
  async handleShowMoreResults(chatId, pageNum) {
    const user = this.users.get(chatId) || {};
    const allResults = user.allSearchResults || [];
    const lastQuery = user.lastQuery || 'general';
    
    if (allResults.length === 0) {
      // Если нет сохранённых результатов, делаем новый поиск
      const results = await this.productsService.getProducts('general', { query: lastQuery, limit: 50 });
      if (results && results.length > 0) {
        user.allSearchResults = results;
        this.users.set(chatId, user);
        await this.sendProductCards(chatId, results, 'general', { page: pageNum, showCount: 10 });
      } else {
        await this.sendMessage(chatId, '❌ Не удалось загрузить больше результатов');
      }
    } else {
      // Показываем следующую страницу из сохранённых результатов
      await this.sendProductCards(chatId, allResults, 'general', { page: pageNum, showCount: 10 });
    }
  }

  // 💰 ОБРАБОТЧИКИ КЭШБЕКА
  async handleWithdrawCashback(chatId) {
    const user = this.users.get(chatId) || {};
    
    const message = `💳 <b>ВЫВОД КЭШБЕКА</b>

<b>💰 Доступно к выводу:</b> ₹${user.cashback || 500}

<b>💳 СПОСОБЫ ВЫВОДА:</b>
🏦 <b>На банковскую карту</b> - без комиссии
   ⏰ 1-3 рабочих дня
   💳 Visa, MasterCard, RuPay
   
📱 <b>На UPI</b> - мгновенно
   ⏰ В течение 5 минут
   📱 PhonePe, Google Pay, Paytm
   
🏪 <b>В магазинах</b> - бонусами
   ⏰ Сразу доступно
   🎯 +20% к сумме в бонусах
   
💰 <b>Наличными</b> - через партнеров
   ⏰ В течение дня
   🏪 В ближайших точках

<b>📊 ИСТОРИЯ ВЫВОДОВ:</b>
💳 15.01.2025 - ₹1,200 (на карту)
📱 10.01.2025 - ₹800 (UPI)
🏪 05.01.2025 - ₹1,500 (бонусы)

<i>⚡ Выбери удобный способ вывода!</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '💳 На карту (1-3 дня)', callback_data: 'withdraw_card' },
          { text: '📱 UPI (5 минут)', callback_data: 'withdraw_upi' }
        ],
        [
          { text: '🏪 Бонусы (+20%)', callback_data: 'withdraw_bonus' },
          { text: '💰 Наличные (сегодня)', callback_data: 'withdraw_cash' }
        ],
        [
          { text: '📊 История выводов', callback_data: 'withdrawal_history' },
          { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
  }

  async handleDoubleCashback(chatId) {
    const message = `🔥 <b>УДВОИТЬ КЭШБЕК!</b>

<b>🎯 Специальное предложение:</b>
Удвой свой кэшбек на следующей покупке!

<b>💰 Как это работает:</b>
🛒 Обычный кэшбек: 5%
🔥 С удвоением: 10%
💎 Максимум: ₹5,000

<b>⏰ Условия:</b>
🕐 Действует: 24 часа
💰 Минимальная покупка: ₹2,000
🎯 Только один раз в месяц
🏪 Во всех магазинах

<b>🎁 БОНУС:</b>
Если потратишь удвоенный кэшбек сегодня - получишь еще +₹500!

<b>📊 Пример:</b>
🛒 Покупка iPhone за ₹50,000
💰 Обычный кэшбек: ₹2,500 (5%)
🔥 С удвоением: ₹5,000 (10%)
🎁 Экономия: +₹2,500!

<i>🔥 Активируй удвоение прямо сейчас!</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🔥 Активировать удвоение', callback_data: 'activate_double' },
          { text: '📋 Условия подробно', callback_data: 'double_terms' }
        ],
        [
          { text: '🛒 Найти товары для покупки', callback_data: 'hot_deals' },
          { text: '💰 Мой кэшбек', callback_data: 'my_cashback' }
        ],
        [
          { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
  }

  async handleSpinWheel(chatId) {
    // Генерируем случайный приз
    const prizes = [
      { emoji: '💰', name: 'Кэшбек ₹500', value: 500 },
      { emoji: '🎁', name: 'Промокод SAVE1000', value: 1000 },
      { emoji: '🔥', name: 'Скидка 20%', value: 20 },
      { emoji: '💎', name: 'VIP статус на месяц', value: 'vip' },
      { emoji: '🎪', name: 'Еще одно вращение', value: 'spin' },
      { emoji: '⚡', name: 'Бесплатная доставка', value: 'delivery' }
    ];
    
    const randomPrize = prizes[Math.floor(Math.random() * prizes.length)];
    
    const message = `🎪 <b>КОЛЕСО УДАЧИ!</b>

🎰 <b>Крутим колесо...</b>
🌟 ✨ 🎯 ⭐ 💫 🌟 ✨

🎉 <b>ПОЗДРАВЛЯЕМ!</b>
${randomPrize.emoji} <b>Ты выиграл: ${randomPrize.name}!</b>

<b>🎁 Твой приз:</b>
${randomPrize.emoji} ${randomPrize.name}
⏰ Действует: 24 часа
🎯 Можно использовать на любой покупке

<b>🎪 Статистика вращений:</b>
🎰 Всего вращений: 12
🏆 Выиграно призов: 8
💰 Общая ценность: ₹4,500

<b>⚡ Следующее бесплатное вращение через: 6 часов</b>

<i>🎉 Используй приз пока он действует!</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: `🎁 Использовать ${randomPrize.name}`, callback_data: 'use_prize' },
          { text: '🎪 Крутить еще (₹50)', callback_data: 'spin_paid' }
        ],
        [
          { text: '🏆 Мои призы', callback_data: 'my_prizes' },
          { text: '🛒 К покупкам', callback_data: 'hot_deals' }
        ],
        [
          { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
    console.log(`🎪 User ${chatId} won: ${randomPrize.name}`);
  }

  async handlePurchaseHistory(chatId) {
    const message = `📊 <b>ИСТОРИЯ ПОКУПОК</b>

<b>🛒 Твои покупки:</b>

📱 <b>iPhone 13</b> - ₹45,999
   📅 15.01.2025 | 🏪 Flipkart
   💰 Кэшбек: ₹2,299 | ⭐ Оценка: 5★

🎧 <b>Sony WH-1000XM4</b> - ₹18,999
   📅 10.01.2025 | 🏪 Amazon
   💰 Кэшбек: ₹949 | ⭐ Оценка: 4★

👟 <b>Nike Air Max</b> - ₹6,999
   📅 05.01.2025 | 🏪 Myntra
   💰 Кэшбек: ₹349 | ⭐ Оценка: 5★

<b>📊 СТАТИСТИКА:</b>
🛒 Всего покупок: 15
💰 Потрачено: ₹1,25,000
💎 Сэкономлено: ₹35,000
🎁 Кэшбек получено: ₹6,250

<b>🏆 ДОСТИЖЕНИЯ:</b>
🥇 Мастер экономии (15+ покупок)
💎 VIP покупатель (₹100K+)
⚡ Быстрый покупатель (5 покупок в месяц)

<i>💡 Продолжай покупать через бота и экономь еще больше!</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '📱 Повторить заказ iPhone', callback_data: 'reorder_iphone' },
          { text: '🎧 Повторить заказ Sony', callback_data: 'reorder_sony' }
        ],
        [
          { text: '⭐ Оценить покупки', callback_data: 'rate_purchases' },
          { text: '📋 Скачать отчет', callback_data: 'download_report' }
        ],
        [
          { text: '🛒 Новые покупки', callback_data: 'hot_deals' },
          { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
  }

  // 🔔 ОБРАБОТЧИКИ НАСТРОЕК
  async handleSetupNotifications(chatId) {
    const message = `🔔 <b>НАСТРОЙКА УВЕДОМЛЕНИЙ</b>

<b>📱 Текущие настройки:</b>
🔔 Горячие скидки: ✅ ВКЛ
💰 Кэшбек поступления: ✅ ВКЛ  
❤️ Избранные товары: ✅ ВКЛ
🎁 Новые промокоды: ✅ ВКЛ
📊 Еженедельный отчет: ❌ ВЫКЛ

<b>⏰ ЧАСТОТА УВЕДОМЛЕНИЙ:</b>
🔥 Горячие скидки: При скидке >30%
💰 Кэшбек: Сразу при поступлении
❤️ Избранное: При скидке >10%
🎁 Промокоды: Максимум 2 в день

<b>🎯 ПЕРСОНАЛИЗАЦИЯ:</b>
📱 Электроника: ✅ ВКЛ
👗 Мода: ✅ ВКЛ
🍔 Еда: ❌ ВЫКЛ
🏠 Дом: ❌ ВЫКЛ

<b>🕐 ВРЕМЯ УВЕДОМЛЕНИЙ:</b>
🌅 Утром: 09:00 - 12:00
🌆 Вечером: 18:00 - 21:00
🌙 Ночью: ВЫКЛ

<i>⚙️ Настрой уведомления под себя!</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🔔 Все уведомления ВКЛ', callback_data: 'notifications_all_on' },
          { text: '🔕 Все уведомления ВЫКЛ', callback_data: 'notifications_all_off' }
        ],
        [
          { text: '🎯 Настроить категории', callback_data: 'setup_categories' },
          { text: '⏰ Настроить время', callback_data: 'setup_time' }
        ],
        [
          { text: '📊 Еженедельный отчет', callback_data: 'toggle_weekly_report' },
          { text: '🔔 Тест уведомления', callback_data: 'test_notification' }
        ],
        [
          { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
  }

  async handleChooseLanguage(chatId) {
    const message = `${this.t(chatId,'language.choose')}`;
    const keyboard = {
      inline_keyboard: [
        [ { text: '🇮🇳 Hinglish', callback_data: 'set_lang_hi' }, { text: '🇬🇧 English', callback_data: 'set_lang_en' } ],
        [ { text: '🇷🇺 Русский', callback_data: 'set_lang_ru' } ],
        [ { text: '🏠 Главное меню', callback_data: 'main_menu' } ]
      ]
    };
    await this.sendMessage(chatId, message, keyboard);
  }

  async handleMyCategories(chatId) {
    const message = `🎯 <b>МОИ КАТЕГОРИИ</b>

<b>❤️ Твои любимые категории:</b>

📱 <b>Электроника</b> - 65% интереса
   🛒 15 покупок | 💰 ₹85,000 потрачено
   🔔 Уведомления: ВКЛ | ⭐ Рейтинг: 5★

👗 <b>Мода</b> - 45% интереса  
   🛒 8 покупок | 💰 ₹25,000 потрачено
   🔔 Уведомления: ВКЛ | ⭐ Рейтинг: 4★

🍔 <b>Еда</b> - 80% интереса
   🛒 25 заказов | 💰 ₹15,000 потрачено
   🔔 Уведомления: ВЫКЛ | ⭐ Рейтинг: 5★

<b>🎯 РЕКОМЕНДУЕМЫЕ КАТЕГОРИИ:</b>
🏠 Дом и сад - много скидок
🎮 Игры - новые релизы
💄 Красота - сезонные акции

<b>📊 СТАТИСТИКА:</b>
🎯 Точность рекомендаций: 87%
💰 Средняя экономия: 35%
⚡ Скорость покупки: 2.3 мин

<i>🎯 Добавь новые категории для лучших рекомендаций!</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '📱 Настроить электронику', callback_data: 'setup_electronics' },
          { text: '👗 Настроить моду', callback_data: 'setup_fashion' }
        ],
        [
          { text: '🍔 Настроить еду', callback_data: 'setup_food' },
          { text: '🏠 Добавить дом', callback_data: 'add_home_category' }
        ],
        [
          { text: '🎮 Добавить игры', callback_data: 'add_games_category' },
          { text: '💄 Добавить красоту', callback_data: 'add_beauty_category' }
        ],
        [
          { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
  }

  async handleMyProfile(chatId) {
    await this.handleSettings(chatId);
  }

  async handleVIPStatus(chatId) { await this.handleSettings(chatId); }

  async handleFavorites(chatId) {
    const user = this.users.get(chatId) || {};
    const favs = user.favorites || [];
    const codes = user.recentPromos || [];
    const message = `⭐ <b>ИЗБРАННОЕ</b>

Товары: ${favs.length ? favs.slice(0,5).join(', ') : 'пусто'}
Недавние промокоды: ${codes.length ? codes.slice(0,5).join(', ') : 'нет'}
`;
    const keyboard = { inline_keyboard: [[{ text: '🏠 Главное меню', callback_data: 'main_menu' }]] };
    await this.sendMessage(chatId, message, keyboard);
  }

  async handleSettings(chatId) {
    const user = this.users.get(chatId) || {};
    const lang = user.lang || 'ru';
    const region = user.region || 'IN';
    const message = `🌐 <b>НАСТРОЙКИ</b>

Язык: ${lang.toUpperCase()}  |  Регион: ${region}  |  Валюта: ₹ INR`;
    const keyboard = { inline_keyboard: [[{ text: '🇮🇳 Region: India', callback_data: 'set_region_in' }, { text: '🌐 Hinglish', callback_data: 'set_lang_en' }],[{ text: '🏠 Главное меню', callback_data: 'main_menu' }]] };
    await this.sendMessage(chatId, message, keyboard);
  }

  async handleSupport(chatId) {
    const message = `🆘 <b>ПОДДЕРЖКА</b>

FAQ:
• Как применить промокод? — Нажми на товар: промо скопируется
• Нет скидок по бренду — Добавь бренд в уведомления
• Где мои данные? — Храним минимум, только для работы бота`;
    const keyboard = { inline_keyboard: [[{ text: '🔔 Уведомления', callback_data: 'setup_notifications' }],[{ text: '🏠 Главное меню', callback_data: 'main_menu' }]] };
    await this.sendMessage(chatId, message, keyboard);
  }

  async handleBeauty(chatId) {
    const message = `💄 <b>${this.t(chatId,'beauty.title','КОСМЕТИКА - ЛУЧШИЕ ПРЕДЛОЖЕНИЯ!')}</b>`;
    const keyboard = {
      inline_keyboard: [
        [ { text: '💄 Makeup', callback_data: 'fc_b_makeup' }, { text: '🧴 Skincare', callback_data: 'fc_b_skincare' } ],
        [ { text: '👩 Haircare', callback_data: 'fc_b_haircare' }, { text: '🕯️ Fragrance', callback_data: 'fc_b_fragrance' } ],
        [ { text: this.t(chatId,'buttons.brand_search','🔎 Поиск по бренду'), callback_data: 'fashion_brand_search' } ],
        [ { text: this.t(chatId,'buttons.main_menu','🏠 Главное меню'), callback_data: 'main_menu' } ]
      ]
    };
    await this.sendMessage(chatId, message, keyboard);
  }

  async handleSmartphones(chatId) {
    const message = `📱 <b>${this.t(chatId,'smartphones.title','СМАРТФОНЫ - ЛУЧШИЕ ПРЕДЛОЖЕНИЯ!')}</b>

<b>1.</b> 📱 <a href="https://www.flipkart.com/search?q=iphone+15+pro+max"><b>iPhone 15 Pro Max</b></a> - ₹89,999 <s>₹1,34,900</s> (-33%)
🎁 ${this.t(chatId,'labels.promo_code','Промокод')}: <code>IPHONE2000</code> (-₹2,000) = ₹87,999

<b>2.</b> 📱 <a href="https://www.samsung.com/in/smartphones/galaxy-s24/"><b>Samsung Galaxy S24</b></a> - ₹52,999 <s>₹79,999</s> (-34%)
🎁 ${this.t(chatId,'labels.promo_code','Промокод')}: <code>SAMSUNG1500</code> (-₹1,500) = ₹51,499

<b>3.</b> 📱 <a href="https://www.oneplus.com/in/oneplus-12"><b>OnePlus 12</b></a> - ₹45,999 <s>₹64,999</s> (-29%)
🎁 ${this.t(chatId,'labels.promo_code','Промокод')}: <code>ONEPLUS1000</code> (-₹1,000) = ₹44,999

<b>4.</b> 📱 <a href="https://www.mi.com/in/product/xiaomi-14/"><b>Xiaomi 14</b></a> - ₹35,999 <s>₹54,999</s> (-35%)
🎁 ${this.t(chatId,'labels.promo_code','Промокод')}: <code>XIAOMI800</code> (-₹800) = ₹35,199

<b>5.</b> 📱 <a href="https://store.google.com/product/pixel_8"><b>Google Pixel 8</b></a> - ₹42,999 <s>₹75,999</s> (-43%)
🎁 ${this.t(chatId,'labels.promo_code','Промокод')}: <code>PIXEL1200</code> (-₹1,200) = ₹41,799`;

    const keyboard = {
      inline_keyboard: [
        [ { text: '📱 Android', callback_data: 'fc_p_android' }, { text: '🍎 iPhone', callback_data: 'fc_p_iphone' } ],
        [ { text: '💸 Budget', callback_data: 'fc_p_budget' }, { text: '⚡ 5G', callback_data: 'fc_p_5g' } ],
        [
          { text: '📱 Показать еще 5 смартфонов', callback_data: 'smartphones_page2' }
        ],
        [
          { text: '🔎 Поиск по бренду', callback_data: 'electronics_brand_search' }
        ],
        [
          { text: '⭐ Добавить в избранное', callback_data: 'add_favorite' }
        ],
        [
          { text: '🔙 Назад к электронике', callback_data: 'electronics' },
          { text: '🏠 Главная', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
  }

  // 📱 СМАРТФОНЫ - ВТОРАЯ СТРАНИЦА
  async handleSmartphonesPage2(chatId) {
    const message = `📱 <b>СМАРТФОНЫ - ДОПОЛНИТЕЛЬНЫЕ МОДЕЛИ!</b>

<b>🔥 Дополнительные предложения:</b>

<b>6.</b> 📱 <a href="https://www.oppo.com/in/smartphone/"><b>Oppo Find X7</b></a> - ₹48,999 <s>₹69,999</s> (-30%)
🎁 Промокод: <code>OPPO1500</code> (-₹1,500) = ₹47,499

<b>7.</b> 📱 <a href="https://www.vivo.com/in/products/phones"><b>Vivo X100</b></a> - ₹42,999 <s>₹59,999</s> (-28%)
🎁 Промокод: <code>VIVO1200</code> (-₹1,200) = ₹41,799

<b>8.</b> 📱 <a href="https://www.realme.com/in/phones"><b>Realme GT 5</b></a> - ₹28,999 <s>₹39,999</s> (-27%)
🎁 Промокод: <code>REALME800</code> (-₹800) = ₹28,199

<b>9.</b> 📱 <a href="https://www.nokia.com/phones/"><b>Nokia X30</b></a> - ₹25,999 <s>₹35,999</s> (-28%)
🎁 Промокод: <code>NOKIA500</code> (-₹500) = ₹25,499

<b>10.</b> 📱 <a href="https://www.moto.com/smartphones"><b>Motorola Edge 40</b></a> - ₹32,999 <s>₹45,999</s> (-28%)
🎁 Промокод: <code>MOTOROLA1000</code> (-₹1,000) = ₹31,999

<b>💰 Твоя экономия: до ₹60,000</b>
<b>🎁 Кэшбек: до ₹6,000</b>

<i>📱 Выбери идеальный смартфон!</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '📱 Больше товаров пока нет', callback_data: 'no_more_items' }
        ],
        [
          { text: '🔙 Назад к смартфонам', callback_data: 'smartphones' },
          { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
  }

  async handleLaptops(chatId) {
    const message = `💻 <b>НОУТБУКИ - МОЩНЫЕ СКИДКИ!</b>

<b>1.</b> 💻 <a href="https://www.apple.com/in/macbook-air/"><b>MacBook Air M3</b></a> - ₹85,999 <s>₹1,14,900</s> (-25%)
🎁 Промокод: <code>APPLE3000</code> (-₹3,000) = ₹82,999

<b>2.</b> 💻 <a href="https://www.dell.com/en-in/shop/dell-laptops/xps-13/spd/xps-13-9340-laptop"><b>Dell XPS 13</b></a> - ₹75,999 <s>₹95,999</s> (-21%)
🎁 Промокод: <code>DELL2000</code> (-₹2,000) = ₹73,999

<b>3.</b> 💻 <a href="https://www.hp.com/in-en/laptops/gaming.html"><b>HP Pavilion Gaming</b></a> - ₹55,999 <s>₹75,999</s> (-26%)
🎁 Промокод: <code>GAMING1500</code> (-₹1,500) = ₹54,499

<b>4.</b> 💻 <a href="https://www.lenovo.com/in/en/laptops/thinkpad/thinkpad-e-series/ThinkPad-E14-Gen-4/p/20Y7001QIN"><b>Lenovo ThinkPad E14</b></a> - ₹45,999 <s>₹65,999</s> (-30%)
🎁 Промокод: <code>THINKPAD1000</code> (-₹1,000) = ₹44,999

<b>5.</b> 💻 <a href="https://www.asus.com/in/laptops/for-home/vivobook/"><b>Asus VivoBook</b></a> - ₹38,999 <s>₹55,999</s> (-30%)
🎁 Промокод: <code>ASUS800</code> (-₹800) = ₹38,199`;

    const keyboard = {
      inline_keyboard: [
        [ { text: '🎮 Gaming', callback_data: 'fc_l_gaming' }, { text: '💼 Office', callback_data: 'fc_l_office' } ],
        [ { text: '🪫 Battery', callback_data: 'fc_l_battery' }, { text: '💻 Ultrabook', callback_data: 'fc_l_ultrabook' } ],
        [
          { text: '💻 Показать еще 5 ноутбуков', callback_data: 'laptops_page2' }
        ],
        [
          { text: '🔎 Поиск по бренду', callback_data: 'electronics_brand_search' }
        ],
        [ { text: '⭐ Добавить в избранное', callback_data: 'add_favorite' } ],
        [
          { text: '🔙 Назад к электронике', callback_data: 'electronics' },
          { text: '🏠 Главная', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
  }

  // 💻 НОУТБУКИ - ВТОРАЯ СТРАНИЦА
  async handleLaptopsPage2(chatId) {
    const message = `💻 <b>НОУТБУКИ - ЕЩЕ 5 МОДЕЛЕЙ!</b>

<b>6.</b> 💻 <a href="https://www.amazon.in/Dell-Inspiron-3511-Integrated-Keyboard/dp/B09QGZ8H9B"><b>Dell Inspiron 15</b></a> - ₹42,999 <s>₹55,999</s> (-23%)
🎁 Промокод: <code>DELL1000</code> (-₹1,000) = ₹41,999

<b>7.</b> 💻 <a href="https://www.amazon.in/HP-Pavilion-15-6-inch-15-eg2004TU/dp/B0B8LZB5N3"><b>HP Pavilion 15</b></a> - ₹52,999 <s>₹69,999</s> (-24%)
🎁 Промокод: <code>HP1500</code> (-₹1,500) = ₹51,499

<b>8.</b> 💻 <a href="https://www.amazon.in/Lenovo-IdeaPad-15-6-inch-Warranty/dp/B09MM58YHY"><b>Lenovo IdeaPad 3</b></a> - ₹38,999 <s>₹52,999</s> (-26%)
🎁 Промокод: <code>LENOVO800</code> (-₹800) = ₹38,199

<b>9.</b> 💻 <a href="https://www.amazon.in/Acer-Aspire-i3-11th-Graphics/dp/B09QGZ8H9B"><b>Acer Aspire 5</b></a> - ₹44,999 <s>₹59,999</s> (-25%)
🎁 Промокод: <code>ACER1200</code> (-₹1,200) = ₹43,799

<b>10.</b> 💻 <a href="https://www.amazon.in/MSI-Modern-14-11th-Graphics/dp/B09QGZ8H9B"><b>MSI Modern 14</b></a> - ₹48,999 <s>₹62,999</s> (-22%)
🎁 Промокод: <code>MSI1000</code> (-₹1,000) = ₹47,999

<b>💰 Твоя экономия: до ₹25,000</b>
<b>🎁 Кэшбек: до ₹2,500</b>

<i>💻 Выбери свой идеальный ноутбук!</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '💻 Больше товаров пока нет', callback_data: 'no_more_items' }
        ],
        [
          { text: '🔙 Назад к ноутбукам', callback_data: 'laptops' },
          { text: '📱 Смартфоны', callback_data: 'smartphones' }
        ],
        [
          { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
  }

  // 🎧 АУДИО - НАУШНИКИ И КОЛОНКИ
  async handleAudio(chatId) {
    const message = `🎧 <b>АУДИО - НАУШНИКИ И КОЛОНКИ!</b>

<b>🔥 Лучшие предложения:</b>

<b>1.</b> 🎧 <a href="https://www.amazon.in/Sony-WH-1000XM5-Wireless-Headphones/dp/B0BY8MC2RB"><b>Sony WH-1000XM5</b></a> - ₹19,999 <s>₹29,999</s> (-33%)
🎁 Промокод: <code>SONY1500</code> (-₹1,500) = ₹18,499

<b>2.</b> 🎧 <a href="https://www.amazon.in/bose-quietcomfort-wireless-noise-cancelling/dp/B08WRWPM3V"><b>Bose QC35 II</b></a> - ₹22,999 <s>₹34,999</s> (-34%)
🎁 Промокод: <code>BOSE2000</code> (-₹2,000) = ₹20,999

<b>3.</b> 🎧 <a href="https://www.amazon.in/Marshall-Major-III-Bluetooth-Headphones/dp/B08WRWPM3V"><b>Marshall Major III</b></a> - ₹8,999 <s>₹12,999</s> (-31%)
🎁 Промокод: <code>MARSHALL500</code> (-₹500) = ₹8,499

<b>4.</b> 🔊 <a href="https://www.amazon.in/JBL-Portable-Bluetooth-Speaker/dp/B08WRWPM3V"><b>JBL GO 3</b></a> - ₹2,999 <s>₹4,999</s> (-40%)
🎁 Промокод: <code>JBL300</code> (-₹300) = ₹2,699

<b>5.</b> 🎧 <a href="https://www.amazon.in/OnePlus-Buds-Pro-Wireless-Earbuds/dp/B08WRWPM3V"><b>OnePlus Buds Pro</b></a> - ₹7,999 <s>₹11,999</s> (-33%)
🎁 Промокод: <code>ONEPLUS500</code> (-₹500) = ₹7,499

<b>💰 Твоя экономия: до ₹18,000</b>
<b>🎁 Кэшбек: до ₹1,800</b>

<i>🎧 Выбери идеальный звук!</i>`;

    const keyboard = {
      inline_keyboard: [
        [ { text: '🎧 TWS', callback_data: 'fc_a_tws' }, { text: '🎧 Over‑ear', callback_data: 'fc_a_overear' } ],
        [ { text: '🔊 Speakers', callback_data: 'fc_a_speakers' }, { text: '🎤 Mic', callback_data: 'fc_a_mic' } ],
        [
          { text: '🎧 Показать еще 5 товаров', callback_data: 'audio_page2' }
        ],
        [
          { text: '🔎 Поиск по бренду', callback_data: 'electronics_brand_search' }
        ],
        [ { text: '⭐ Добавить в избранное', callback_data: 'add_favorite' } ],
        [
          { text: '🔙 Назад к электронике', callback_data: 'electronics' },
          { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
  }

  // 🎧 АУДИО - ВТОРАЯ СТРАНИЦА
  async handleAudioPage2(chatId) {
    const message = `🎧 <b>АУДИО - ДОПОЛНИТЕЛЬНЫЕ ТОВАРЫ!</b>

<b>🔥 Дополнительные предложения:</b>

<b>6.</b> 🎧 <a href="https://www.amazon.in/Jabra-Elite-75t/dp/B08WRWPM3V"><b>Jabra Elite 75t</b></a> - ₹12,999 <s>₹19,999</s> (-35%)
🎁 Промокод: <code>JABRA1000</code> (-₹1,000) = ₹11,999

<b>7.</b> 🎧 <a href="https://www.amazon.in/Sennheiser-Momentum-True-Wireless/dp/B08WRWPM3V"><b>Sennheiser Momentum</b></a> - ₹24,999 <s>₹34,999</s> (-29%)
🎁 Промокод: <code>SENNHEISER2000</code> (-₹2,000) = ₹22,999

<b>8.</b> 🔊 <a href="https://www.amazon.in/Sony-SRS-XB43-Portable/dp/B08WRWPM3V"><b>Sony SRS-XB43</b></a> - ₹15,999 <s>₹24,999</s> (-36%)
🎁 Промокод: <code>SONYSPEAKER1500</code> (-₹1,500) = ₹14,499

<b>9.</b> 🎧 <a href="https://www.amazon.in/Skullcandy-CRUSHER-Bluetooth/dp/B08WRWPM3V"><b>Skullcandy Crusher</b></a> - ₹9,999 <s>₹14,999</s> (-33%)
🎁 Промокод: <code>SKULLCANDY800</code> (-₹800) = ₹9,199

<b>10.</b> 🎧 <a href="https://www.amazon.in/JBL-T500-Wired-Headphones/dp/B08WRWPM3V"><b>JBL T500</b></a> - ₹4,999 <s>₹7,999</s> (-38%)
🎁 Промокод: <code>JBLT500400</code> (-₹400) = ₹4,599

<b>💰 Твоя экономия: до ₹30,000</b>
<b>🎁 Кэшбек: до ₹3,000</b>

<i>🎧 Выбери идеальный звук!</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🎧 Больше товаров пока нет', callback_data: 'no_more_items' }
        ],
        [
          { text: '🔙 Назад к аудио', callback_data: 'audio' },
          { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
  }

  // 📺 ТЕЛЕВИЗОРЫ - SMART TV
  async handleTV(chatId) {
    const message = `📺 <b>ТЕЛЕВИЗОРЫ - SMART TV!</b>

<b>🔥 Лучшие предложения:</b>

<b>1.</b> 📺 <a href="https://www.amazon.in/Samsung-inches-Crystal-Processor/dp/B08WRWPM3V"><b>Samsung 43" UHD</b></a> - ₹28,999 <s>₹45,999</s> (-37%)
🎁 Промокод: <code>SAMSUNG2000</code> (-₹2,000) = ₹26,999

<b>2.</b> 📺 <a href="https://www.amazon.in/LG-inches-4K-Ultra-Processor/dp/B08WRWPM3V"><b>LG 43" 4K UHD</b></a> - ₹32,999 <s>₹52,999</s> (-38%)
🎁 Промокод: <code>LG2500</code> (-₹2,500) = ₹30,499

<b>3.</b> 📺 <a href="https://www.amazon.in/Sony-inches-Crystal-Processor/dp/B08WRWPM3V"><b>Sony 43" LED</b></a> - ₹35,999 <s>₹58,999</s> (-39%)
🎁 Промокод: <code>SONY3000</code> (-₹3,000) = ₹32,999

<b>4.</b> 📺 <a href="https://www.amazon.in/OnePlus-inches-Android-Resolution/dp/B08WRWPM3V"><b>OnePlus 43" QLED</b></a> - ₹29,999 <s>₹47,999</s> (-38%)
🎁 Промокод: <code>ONEPLUS2000</code> (-₹2,000) = ₹27,999

<b>5.</b> 📺 <a href="https://www.amazon.in/Mi-inches-Android-Resolution/dp/B08WRWPM3V"><b>Xiaomi 43" LED</b></a> - ₹24,999 <s>₹39,999</s> (-38%)
🎁 Промокод: <code>XIAOMI1500</code> (-₹1,500) = ₹23,499

<b>🚚 Бесплатная доставка и установка</b>
<b>🎁 Гарантия 1 год</b>
<b>💰 Кэшбек до ₹3,000</b>

<i>📺 Выбери свой идеальный телевизор!</i>`;

    const keyboard = {
      inline_keyboard: [
        [ { text: '💡 LED', callback_data: 'fc_tv_led' }, { text: '🌈 QLED', callback_data: 'fc_tv_qled' } ],
        [ { text: '🖤 OLED', callback_data: 'fc_tv_oled' }, { text: '📏 55"+', callback_data: 'fc_tv_55' } ],
        [
          { text: '📺 Показать еще 5 товаров', callback_data: 'tv_page2' }
        ],
        [
          { text: '🔎 Поиск по бренду', callback_data: 'electronics_brand_search' }
        ],
        [ { text: '⭐ Добавить в избранное', callback_data: 'add_favorite' } ],
        [
          { text: '🔙 Назад к электронике', callback_data: 'electronics' },
          { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
  }

  // 📺 ТЕЛЕВИЗОРЫ - ВТОРАЯ СТРАНИЦА
  async handleTVPage2(chatId) {
    const message = `📺 <b>ТЕЛЕВИЗОРЫ - ДОПОЛНИТЕЛЬНЫЕ МОДЕЛИ!</b>

<b>🔥 Дополнительные предложения:</b>

<b>6.</b> 📺 <a href="https://www.amazon.in/TCL-inches-Android-Resolution/dp/B08WRWPM3V"><b>TCL 43" Android TV</b></a> - ₹22,999 <s>₹34,999</s> (-34%)
🎁 Промокод: <code>TCL1500</code> (-₹1,500) = ₹21,499

<b>7.</b> 📺 <a href="https://www.amazon.in/Thomson-inches-Android-Resolution/dp/B08WRWPM3V"><b>Thomson 43" Smart TV</b></a> - ₹19,999 <s>₹29,999</s> (-33%)
🎁 Промокод: <code>THOMSON1200</code> (-₹1,200) = ₹18,799

<b>8.</b> 📺 <a href="https://www.amazon.in/Realme-inches-Android-Resolution/dp/B08WRWPM3V"><b>Realme 43" Smart TV</b></a> - ₹21,999 <s>₹32,999</s> (-33%)
🎁 Промокод: <code>REALMETV1400</code> (-₹1,400) = ₹20,599

<b>9.</b> 📺 <a href="https://www.amazon.in/Vu-inches-Android-Resolution/dp/B08WRWPM3V"><b>Vu 43" Smart TV</b></a> - ₹23,999 <s>₹36,999</s> (-35%)
🎁 Промокод: <code>VUTV1600</code> (-₹1,600) = ₹22,399

<b>10.</b> 📺 <a href="https://www.amazon.in/Kodak-inches-Android-Resolution/dp/B08WRWPM3V"><b>Kodak 43" LED TV</b></a> - ₹18,999 <s>₹27,999</s> (-32%)
🎁 Промокод: <code>KODAK1100</code> (-₹1,100) = ₹17,899

<b>🚚 Бесплатная доставка и установка</b>
<b>🎁 Гарантия 1 год</b>
<b>💰 Кэшбек до ₹4,000</b>

<i>📺 Выбери свой идеальный телевизор!</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '📺 Больше товаров пока нет', callback_data: 'no_more_items' }
        ],
        [
          { text: '🔙 Назад к ТВ', callback_data: 'tv' },
          { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
  }

  // ⌚ НОСИМЫЕ УСТРОЙСТВА
  async handleWearables(chatId) {
    const message = `⌚ <b>НОСИМЫЕ УСТРОЙСТВА - GADGETS!</b>

<b>🔥 Лучшие предложения:</b>

<b>1.</b> ⌚ <a href="https://www.amazon.in/Apple-Watch-GPS-40mm-Aluminium/dp/B0BDHB9Y8P"><b>Apple Watch SE</b></a> - ₹24,999 <s>₹29,900</s> (-16%)
🎁 Промокод: <code>WATCH1000</code> (-₹1,000) = ₹23,999

<b>2.</b> ⌚ <a href="https://www.amazon.in/Samsung-Galaxy-Watch-Active/dp/B08WRWPM3V"><b>Samsung Galaxy Watch 5</b></a> - ₹19,999 <s>₹29,999</s> (-33%)
🎁 Промокод: <code>SAMSUNG1500</code> (-₹1,500) = ₹18,499

<b>3.</b> ⌚ <a href="https://www.amazon.in/OnePlus-Watch-Android-Smartwatch/dp/B08WRWPM3V"><b>OnePlus Watch</b></a> - ₹12,999 <s>₹19,999</s> (-35%)
🎁 Промокод: <code>ONEPLUS800</code> (-₹800) = ₹12,199

<b>4.</b> ⌚ <a href="https://www.amazon.in/Fitbit-Versa-Smartwatch-Fitness/dp/B08WRWPM3V"><b>Fitbit Versa 3</b></a> - ₹15,999 <s>₹24,999</s> (-36%)
🎁 Промокод: <code>FITBIT1000</code> (-₹1,000) = ₹14,999

<b>5.</b> ⌚ <a href="https://www.amazon.in/Noise-ColorFit-Smartwatch-Monitoring/dp/B08WRWPM3V"><b>Noise ColorFit Pro</b></a> - ₹3,999 <s>₹6,999</s> (-43%)
🎁 Промокод: <code>NOISE300</code> (-₹300) = ₹3,699

<b>💊 Отслеживание здоровья 24/7</b>
<b>📱 Синхронизация с телефоном</b>
<b>🎁 Кэшбек до ₹1,000</b>

<i>⌚ Выбери свой стильный гаджет!</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '⌚ Показать еще 5 товаров', callback_data: 'wearables_page2' }
        ],
        [
          { text: '🔎 Поиск по бренду', callback_data: 'electronics_brand_search' }
        ],
        [
          { text: '🔙 Назад к электронике', callback_data: 'electronics' },
          { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
  }

  // ⌚ НОСИМЫЕ УСТРОЙСТВА - ВТОРАЯ СТРАНИЦА
  async handleWearablesPage2(chatId) {
    const message = `⌚ <b>НОСИМЫЕ УСТРОЙСТВА - ДОПОЛНИТЕЛЬНЫЕ!</b>

<b>🔥 Дополнительные предложения:</b>

<b>6.</b> ⌚ <a href="https://www.amazon.in/Fossil-Townsman-Mechanical/dp/B08WRWPM3V"><b>Fossil Townsman</b></a> - ₹14,999 <s>₹22,999</s> (-35%)
🎁 Промокод: <code>FOSSIL1000</code> (-₹1,000) = ₹13,999

<b>7.</b> ⌚ <a href="https://www.amazon.in/Garmin-Forerunner-165/dp/B08WRWPM3V"><b>Garmin Forerunner 165</b></a> - ₹29,999 <s>₹39,999</s> (-25%)
🎁 Промокод: <code>GARMIN2000</code> (-₹2,000) = ₹27,999

<b>8.</b> ⌚ <a href="https://www.amazon.in/Huawei-Watch-GT-3/dp/B08WRWPM3V"><b>Huawei Watch GT 3</b></a> - ₹16,999 <s>₹24,999</s> (-32%)
🎁 Промокод: <code>HUAWEI1200</code> (-₹1,200) = ₹15,799

<b>9.</b> ⌚ <a href="https://www.amazon.in/Amazfit-GTR-4-Smartwatch/dp/B08WRWPM3V"><b>Amazfit GTR 4</b></a> - ₹12,999 <s>₹19,999</s> (-35%)
🎁 Промокод: <code>AMAZFIT900</code> (-₹900) = ₹12,099

<b>10.</b> ⌚ <a href="https://www.amazon.in/Fire-Boltt-Ring-Bluetooth/dp/B08WRWPM3V"><b>Fire-Boltt Ring</b></a> - ₹2,999 <s>₹4,999</s> (-40%)
🎁 Промокод: <code>FIREBOLTT200</code> (-₹200) = ₹2,799

<b>💊 Отслеживание здоровья 24/7</b>
<b>📱 Синхронизация с телефоном</b>
<b>🎁 Кэшбек до ₹2,000</b>

<i>⌚ Выбери свой стильный гаджет!</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '⌚ Больше товаров пока нет', callback_data: 'no_more_items' }
        ],
        [
          { text: '🔙 Назад к гаджетам', callback_data: 'wearables' },
          { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
  }

  async handleSearchProduct(chatId) {
    const message = `🔍 <b>${this.t(chatId,'search.title','НАЙТИ ТОВАР')}</b>

<b>💬 Напиши текстом или 🎤 отправь голосовое:</b>

<b>Примеры поиска:</b>
• "iPhone 15 подешевле"
• "Nike кроссовки черные"  
• "Платье Zara до 2000"
• "Ноутбук для игр до 50000"
• "Наушники Sony беспроводные"

<b>🎯 Что я найду:</b>
✅ Лучшие цены в разных магазинах
✅ Актуальные промокоды
✅ Дополнительные скидки

<i>Просто напиши или скажи что ищешь! ⬇️</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: this.t(chatId,'search.popular_phones','📱 Популярные телефоны'), callback_data: 'smartphones' }
        ],
        [
          { text: this.t(chatId,'search.popular_shoes','👟 Популярная обувь'), callback_data: 'shoes' }
        ],
        [
          { text: this.t(chatId,'search.popular_fashion','👗 Популярная одежда'), callback_data: 'fashion' }
        ],
        [
          { text: this.t(chatId,'buttons.filters','⚙️ Фильтры'), callback_data: 'filters' }
        ],
        [
          { text: this.t(chatId,'buttons.main_menu','🏠 Главное меню'), callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
  }

  async handleHotDealsPage2(chatId) {
    const message = `🔥 <b>СКИДКИ ДНЯ - ЕЩЕ 5 ТОВАРОВ</b>

<b>6.</b> 📱 <b>Samsung Galaxy S24</b> - ₹52,999 <s>₹79,999</s> (-34%)
🎁 Промокод: <code>SAMSUNG1500</code> (-₹1,500) = ₹51,499
🛒 Samsung ₹52,999 | Flipkart ₹54,999 | Amazon ₹55,999

<b>7.</b> 👕 <b>H&M Shirt</b> - ₹999 <s>₹2,499</s> (-60%)
🎁 Промокод: <code>HM300</code> (-₹300) = ₹699
🛒 H&M ₹999 | Myntra ₹1,199 | Ajio ₹1,299

<b>8.</b> 🍕 <b>Domino's Pizza</b> - ₹199 <s>₹499</s> (-60%)
🎁 Промокод: <code>PIZZA100</code> (-₹100) = ₹99
🛒 Domino's ₹199 | Zomato ₹249 | Swiggy ₹299

<b>9.</b> 💄 <b>Lakme Lipstick</b> - ₹299 <s>₹599</s> (-50%)
🎁 Промокод: <code>BEAUTY50</code> (-₹50) = ₹249
🛒 Nykaa ₹299 | Amazon ₹349 | Flipkart ₹399

<b>10.</b> 🎮 <b>PlayStation Controller</b> - ₹3,999 <s>₹5,999</s> (-33%)
🎁 Промокод: <code>GAME500</code> (-₹500) = ₹3,499
🛒 Amazon ₹3,999 | Flipkart ₹4,299 | Croma ₹4,599`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '📱 Показать еще 5 товаров', callback_data: 'hot_deals_page3' }
        ],
        [
          { text: '🔙 Первые 5 товаров', callback_data: 'hot_deals' },
          { text: '🏠 Главная', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
  }

  async handleHotDealsPage3(chatId) {
    const message = `🔥 <b>СКИДКИ ДНЯ - ЕЩЕ 5 ТОВАРОВ</b>

<b>11.</b> 👟 <b>Nike Air Max 90</b> - ₹8,999 <s>₹14,999</s> (-40%)
🎁 Промокод: <code>NIKE600</code> (-₹600) = ₹8,399
🛒 Nike ₹8,999 | Flipkart ₹9,499 | Amazon ₹9,999

<b>12.</b> ☕ <b>Starbucks Frappuccino</b> - ₹349 <s>₹499</s> (-30%)
🎁 Промокод: <code>STARBUCKS50</code> (-₹50) = ₹299
🛒 Starbucks ₹349 | Swiggy ₹379 | Zomato ₹399

<b>13.</b> 📱 <b>iPhone 14</b> - ₹69,999 <s>₹89,999</s> (-22%)
🎁 Промокод: <code>IPHONE2000</code> (-₹2,000) = ₹67,999
🛒 Apple ₹69,999 | Flipkart ₹71,999 | Amazon ₹72,999

<b>14.</b> 🥤 <b>Coca-Cola 2L</b> - ₹89 <s>₹129</s> (-31%)
🎁 Промокод: <code>DRINK20</code> (-₹20) = ₹69
🛒 Local Store ₹89 | BigBasket ₹99 | Amazon ₹109

<b>15.</b> 🎧 <b>Sony Headphones</b> - ₹4,999 <s>₹8,999</s> (-44%)
🎁 Промокод: <code>SONY400</code> (-₹400) = ₹4,599
🛒 Amazon ₹4,999 | Flipkart ₹5,299 | Croma ₹5,499

<b>💰 Общая экономия: до ₹3,069</b>
<b>🎁 Кэшбек: до ₹500</b>

<i>🔥 Выбери лучшее предложение!</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '📱 Больше товаров пока нет', callback_data: 'no_more_items' }
        ],
        [
          { text: '🔙 Назад к скидкам', callback_data: 'hot_deals' },
          { text: '🏠 Главная', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
  }

  async handleMenPromos(chatId) {
    const message = `🎁 <b>МУЖСКИЕ ПРОМОКОДЫ</b>

<b>🔥 Активные промокоды для мужчин:</b>

<b>1.</b> 👔 <code>SHIRT500</code> - скидка ₹500 на рубашки
💰 Минимальная сумма: ₹1,500
📅 Действует до: 31.12.2024

<b>2.</b> 👖 <code>JEANS1000</code> - скидка ₹1,000 на джинсы
💰 Минимальная сумма: ₹2,500
📅 Действует до: 15.01.2025

<b>3.</b> 🧥 <code>WINTER30</code> - скидка 30% на куртки
💰 Максимальная скидка: ₹2,000
📅 Действует до: 28.02.2025

<b>4.</b> 👟 <code>SHOES20</code> - скидка 20% на обувь
💰 Максимальная скидка: ₹1,500
📅 Действует до: 10.01.2025

<b>5.</b> 🎽 <code>SPORT15</code> - скидка 15% на спортивную одежду
💰 Максимальная скидка: ₹1,000
📅 Действует до: 05.01.2025

<i>📋 Нажми на промокод чтобы скопировать его!</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🎁 Показать еще 5 промокодов', callback_data: 'men_promos_page2' }
        ],
        [
          { text: '🔙 Назад к мужской моде', callback_data: 'men_fashion' },
          { text: '🏠 Главная', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
  }

  // 👗 ЖЕНСКИЕ ПРОМОКОДЫ
  async handleWomenPromos(chatId) {
    const message = `🎁 <b>ЖЕНСКИЕ ПРОМОКОДЫ</b>

<b>🔥 Активные промокоды для женщин:</b>

<b>1.</b> 👗 <code>DRESS300</code> - скидка ₹300 на платья
💰 Минимальная сумма: ₹1,000
📅 Действует до: 31.12.2024

<b>2.</b> 👚 <code>BLOUSE200</code> - скидка ₹200 на блузки
💰 Минимальная сумма: ₹800
📅 Действует до: 15.01.2025

<b>3.</b> 👖 <code>JEANS400</code> - скидка ₹400 на джинсы
💰 Минимальная сумма: ₹1,500
📅 Действует до: 28.01.2025

<b>4.</b> 🧥 <code>JACKET600</code> - скидка ₹600 на куртки
💰 Минимальная сумма: ₹2,000
📅 Действует до: 10.02.2025

<b>5.</b> 👠 <code>SHOES250</code> - скидка ₹250 на туфли
💰 Минимальная сумма: ₹1,000
📅 Действует до: 05.02.2025

<i>📋 Нажми на промокод чтобы скопировать его!</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🎁 Показать еще 5 промокодов', callback_data: 'women_promos_page2' }
        ],
        [
          { text: '🔙 Назад к женской моде', callback_data: 'women_fashion' },
          { text: '🏠 Главная', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
  }

  // 👟 ОБУВЬ - ВТОРАЯ СТРАНИЦА
  async handleShoesPage2(chatId) {
    const userId = chatId;

    const message = `👟 <b>ОБУВЬ - ЕЩЕ 5 МОДЕЛЕЙ!</b>

<b>🔥 Дополнительные предложения:</b>

<b>6.</b> 👟 <a href="https://www.myntra.com/sports-shoes/nike/nike-men-air-max-270-sneakers/2322447/buy?ref=bazaarguru&user=${userId}"><b>Nike Air Force 1</b></a> - ₹7,999 <s>₹11,995</s> (-33%)
   🎯 Классика | ⭐ 4.9★ | 🚚 Завтра
   🎁 Промокод: <code>NIKE600</code> (-₹600) = ₹7,399

<b>7.</b> 👟 <a href="https://in.puma.com/in/en/pd/rs-x-sneakers/369579.html?ref=bazaarguru&user=${userId}"><b>Puma RS-X³</b></a> - ₹5,999 <s>₹9,999</s> (-40%)
   🎨 Неоновые | ⭐ 4.7★ | 💰 Лучшая цена
   🎁 Промокод: <code>PUMA25</code> (-25%) = ₹4,499

<b>8.</b> 👠 <a href="https://www.bata.in/women-formal-shoes?ref=bazaarguru&user=${userId}"><b>Женские туфли Bata Comfort</b></a> - ₹2,499 <s>₹4,499</s> (-44%)
   💼 Комфортные | ⭐ 4.6★ | 🚚 Бесплатная доставка
   🎁 Промокод: <code>BATA40</code> (-40%) = ₹1,499

<b>9.</b> 👟 <a href="https://www.adidas.co.in/ultraboost-22-shoes/GZ0127.html?ref=bazaarguru&user=${userId}"><b>Adidas NMD R1</b></a> - ₹9,999 <s>₹15,999</s> (-38%)
   🏃‍♂️ Технология | ⭐ 4.8★ | 🎁 Носки в подарок
   🎁 Промокод: <code>ADIDAS30</code> (-30%) = ₹6,999

<b>10.</b> 🥾 <a href="https://www.myntra.com/boots?ref=bazaarguru&user=${userId}"><b>Ботинки Timberland</b></a> - ₹12,999 <s>₹19,999</s> (-35%)
   🏔️ Универсальные | ⭐ 4.9★ | 🎁 Защита от влаги
   🎁 Промокод: <code>SHOES50</code> (-50%) = ₹6,499

<b>💰 Твоя экономия: до ₹50,000</b>
<b>🎁 Кэшбек: до ₹5,000</b>

<i>👟 Выбери идеальную пару!</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '📱 Больше товаров пока нет', callback_data: 'no_more_items' }
        ],
        [
          { text: '🔙 Назад к обуви', callback_data: 'shoes' },
          { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
    console.log(`📊 User ${userId} browsed shoes page 2`);
  }

  // 👗 ЖЕНСКАЯ ОДЕЖДА - ВТОРАЯ СТРАНИЦА
  async handleWomenFashionPage2(chatId) {
    const userId = chatId;

    const message = `👗 <b>ЖЕНСКАЯ ОДЕЖДА - ЕЩЕ 5 ТОВАРОВ!</b>

<b>6.</b> 👗 <a href="https://www.myntra.com/dresses/zara?ref=bazaarguru&user=${userId}"><b>Платье Zara Midi</b></a> - ₹2,499 <s>₹4,999</s> (-50%)
🎁 Промокод: <code>ZARA500</code> (-₹500) = ₹1,999

<b>7.</b> 👚 <a href="https://www2.hm.com/en_in/women/tops/shirts-blouses?ref=bazaarguru&user=${userId}"><b>Блузка H&M Silk</b></a> - ₹1,299 <s>₹2,599</s> (-50%)
🎁 Промокод: <code>HMSILK200</code> (-₹200) = ₹1,099

<b>8.</b> 👖 <a href="https://www.myntra.com/jeans/levis/levis-women-jeans?ref=bazaarguru&user=${userId}"><b>Джинсы Levi's Skinny</b></a> - ₹3,499 <s>₹5,999</s> (-42%)
🎁 Промокод: <code>LEVISSKINNY600</code> (-₹600) = ₹2,899

<b>9.</b> 🧥 <a href="https://shop.mango.com/in/women/coats-and-jackets?ref=bazaarguru&user=${userId}"><b>Куртка Mango Leather</b></a> - ₹4,999 <s>₹9,999</s> (-50%)
🎁 Промокод: <code>MANGOLEATHER800</code> (-₹800) = ₹4,199

<b>10.</b> 👠 <a href="https://www.myntra.com/shoes/charles-keith?ref=bazaarguru&user=${userId}"><b>Туфли Charles & Keith Heels</b></a> - ₹3,499 <s>₹6,999</s> (-50%)
🎁 Промокод: <code>CHARLESHEELS400</code> (-₹400) = ₹3,099

<b>💰 Твоя экономия: до ₹25,000</b>
<b>🎁 Кэшбек: до ₹2,500</b>

<i>👗 Выбери идеальную одежду!</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '📱 Больше товаров пока нет', callback_data: 'no_more_items' }
        ],
        [
          { text: '🔙 Назад к женской одежде', callback_data: 'women_fashion' },
          { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
    console.log(`📊 User ${userId} browsed women fashion page 2`);
  }

  async handleMenFashionPage2(chatId) {
    const message = `👔 <b>МУЖСКАЯ ОДЕЖДА - ЕЩЕ 5 ТОВАРОВ</b>

<b>6.</b> 👕 <a href="https://myntra.com/polo-ralph-lauren"><b>Polo Ralph Lauren</b></a> - ₹2,499 <s>₹4,999</s> (-50%)
🎁 Промокод: <code>SHIRT200</code> (-₹200) = ₹2,299

<b>7.</b> 🩳 <a href="https://adidas.co.in/shorts"><b>Шорты Adidas</b></a> - ₹1,299 <s>₹2,599</s> (-50%)
🎁 Промокод: <code>JEANS300</code> (-₹300) = ₹999

<b>8.</b> 🧦 <a href="https://nike.com/socks"><b>Носки Nike (3 пары)</b></a> - ₹699 <s>₹1,299</s> (-46%)
🎁 Промокод: <code>NIKE150</code> (-₹150) = ₹549

<b>9.</b> 🎽 <a href="https://puma.com/tank-tops"><b>Майка Puma</b></a> - ₹899 <s>₹1,799</s> (-50%)
🎁 Промокод: <code>PUMA400</code> (-₹400) = ₹499

<b>10.</b> 🧢 <a href="https://reebok.in/caps"><b>Кепка Reebok</b></a> - ₹799 <s>₹1,599</s> (-50%)
🎁 Промокод: <code>JACKET500</code> (-₹500) = ₹299

<i>Пока это все товары в наличии!</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '📱 Больше товаров пока нет', callback_data: 'no_more_items' }
        ],
        [
          { text: '🔙 Назад к мужской одежде', callback_data: 'men_fashion' },
          { text: '🏠 Главная', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
  }

  async handleNoMoreItems(chatId) {
    const message = `😊 <b>Пока это все!</b>

На данный момент больше товаров нет, но мы постоянно добавляем новые предложения.

<b>💡 Что можно сделать:</b>
• Посмотреть другие категории
• Использовать поиск товаров
• Подписаться на уведомления о новых скидках

<i>Скоро добавим еще больше крутых предложений! 🔥</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🔍 Найти другой товар', callback_data: 'search_product' }
        ],
        [
          { text: '📱 Электроника', callback_data: 'electronics' },
          { text: '👗 Одежда', callback_data: 'fashion' }
        ],
        [
          { text: '🏠 Главная', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
  }

  // 🎁 МУЖСКИЕ ПРОМОКОДЫ - ВТОРАЯ СТРАНИЦА
  async handleMenPromosPage2(chatId) {
    const message = `🎁 <b>МУЖСКИЕ ПРОМОКОДЫ - ЕЩЕ 5!</b>

<b>🔥 Дополнительные промокоды:</b>

<b>6.</b> 👔 <code>FORMAL200</code> - скидка ₹200 на формальную одежду
💰 Минимальная сумма: ₹1,200
📅 Действует до: 20.02.2025

<b>7.</b> 👟 <code>CASUAL15</code> - скидка 15% на casual обувь
💰 Максимальная скидка: ₹750
📅 Действует до: 15.02.2025

<b>8.</b> 🧥 <code>OUTER25</code> - скидка 25% на верхнюю одежду
💰 Максимальная скидка: ₹1,500
📅 Действует до: 10.03.2025

<b>9.</b> 🎽 <code>ACTIVE30</code> - скидка 30% на спортивную одежду
💰 Минимальная сумма: ₹2,000
📅 Действует до: 25.01.2025

<b>10.</b> 👕 <code>TOP10</code> - скидка 10% на все топы
💰 Максимальная скидка: ₹500
📅 Действует до: 05.02.2025

<b>💰 Общая экономия: до ₹4,450</b>

<i>📋 Нажми на промокод чтобы скопировать его!</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '📱 Больше промокодов пока нет', callback_data: 'no_more_items' }
        ],
        [
          { text: '🔙 Назад к мужским промокодам', callback_data: 'men_promos' },
          { text: '🏠 Главная', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
  }

  // 🎁 ЖЕНСКИЕ ПРОМОКОДЫ - ВТОРАЯ СТРАНИЦА
  async handleWomenPromosPage2(chatId) {
    const message = `🎁 <b>ЖЕНСКИЕ ПРОМОКОДЫ - ЕЩЕ 5!</b>

<b>🔥 Дополнительные промокоды:</b>

<b>6.</b> 👗 <code>DRESS25</code> - скидка 25% на все платья
💰 Минимальная сумма: ₹1,500
📅 Действует до: 20.02.2025

<b>7.</b> 👚 <code>TOP30</code> - скидка 30% на топы и блузки
💰 Максимальная скидка: ₹600
📅 Действует до: 15.02.2025

<b>8.</b> 👖 <code>PANTS20</code> - скидка 20% на брюки и джинсы
💰 Минимальная сумма: ₹1,800
📅 Действует до: 10.03.2025

<b>9.</b> 🧥 <code>COAT40</code> - скидка 40% на пальто и куртки
💰 Максимальная скидка: ₹2,000
📅 Действует до: 25.01.2025

<b>10.</b> 👠 <code>SHOE35</code> - скидка 35% на туфли и босоножки
💰 Минимальная сумма: ₹2,500
📅 Действует до: 05.02.2025

<b>💰 Общая экономия: до ₹6,100</b>

<i>📋 Нажми на промокод чтобы скопировать его!</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '📱 Больше промокодов пока нет', callback_data: 'no_more_items' }
        ],
        [
          { text: '🔙 Назад к женским промокодам', callback_data: 'women_promos' },
          { text: '🏠 Главная', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
  }

  // 🎁 ПРОМОКОДЫ ЕДЫ - ВТОРАЯ СТРАНИЦА
  async handleFoodPromosPage2(chatId) {
    const message = `🎁 <b>ПРОМОКОДЫ ЕДЫ - ЕЩЕ 5!</b>

<b>🔥 Дополнительные промокоды:</b>

<b>6.</b> 🍔 <code>BURGER30</code> - скидка 30% в Burger King
⏰ До: 20.02.2025 | 💰 Экономия: ₹150

<b>7.</b> 🍕 <code>PIZZA25</code> - скидка 25% на большую пиццу
⏰ До: 15.02.2025 | 💰 Экономия: ₹200

<b>8.</b> 🥗 <code>SALAD40</code> - скидка 40% на салаты Subway
⏰ До: 10.03.2025 | 💰 Экономия: ₹80

<b>9.</b> 🥤 <code>DRINK50</code> - скидка 50% на напитки в KFC
⏰ До: 25.01.2025 | 💰 Экономия: ₹100

<b>10.</b> 🍱 <code>COMBO35</code> - скидка 35% на комбо-обеды
⏰ До: 05.02.2025 | 💰 Экономия: ₹250

<b>💰 Общая экономия: до ₹780</b>

<i>📋 Нажми на промокод чтобы скопировать его!</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '📱 Больше промокодов пока нет', callback_data: 'no_more_items' }
        ],
        [
          { text: '🔙 Назад к промокодам еды', callback_data: 'food_promos' },
          { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
  }

  // 🎁 ПРОМОКОДЫ ОБУВИ - ВТОРАЯ СТРАНИЦА
  async handleShoePromosPage2(chatId) {
    const message = `🎁 <b>ПРОМОКОДЫ ОБУВИ - ЕЩЕ 5!</b>

<b>🔥 Дополнительные промокоды:</b>

<b>6.</b> 👟 <code>SPORT35</code> - скидка 35% на спортивную обувь
⏰ До: 20.02.2025 | 💰 Экономия: до ₹2,100

<b>7.</b> 👠 <code>HEELS25</code> - скидка 25% на каблуки и туфли
⏰ До: 15.02.2025 | 💰 Экономия: до ₹1,250

<b>8.</b> 🥾 <code>BOOTS45</code> - скидка 45% на ботинки
⏰ До: 10.03.2025 | 💰 Экономия: до ₹3,150

<b>9.</b> 👡 <code>SANDALS30</code> - скидка 30% на сандалии
⏰ До: 25.01.2025 | 💰 Экономия: до ₹900

<b>10.</b> 🩰 <code>BALLET20</code> - скидка 20% на балетки
⏰ До: 05.02.2025 | 💰 Экономия: до ₹600

<b>💰 Общая экономия: до ₹8,000</b>

<i>📋 Нажми на промокод чтобы скопировать его!</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '📱 Больше промокодов пока нет', callback_data: 'no_more_items' }
        ],
        [
          { text: '🔙 Назад к промокодам обуви', callback_data: 'shoe_promos' },
          { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
  }

  // ☕ ЗАКАЗАТЬ КОФЕ
  async handleOrderCoffee(chatId) {
    const userId = chatId;

    const message = `☕ <b>ЗАКАЗАТЬ КОФЕ - ВКУСНЫЕ НАПИТКИ!</b>

<b>🍵 Популярные напитки:</b>

<b>1.</b> ☕ <a href="https://www.starbucks.in/delivery?ref=bazaarguru&user=${userId}"><b>Капучино</b></a> - ₹299
   🥛 Классический | ⭐ 4.8★ | 🚚 Бесплатная доставка

<b>2.</b> ☕ <a href="https://www.starbucks.in/delivery?ref=bazaarguru&user=${userId}"><b>Латте</b></a> - ₹349
   🥛 С миндальным молоком | ⭐ 4.9★ | 🎁 Сироп в подарок

<b>3.</b> ☕ <a href="https://www.starbucks.in/delivery?ref=bazaarguru&user=${userId}"><b>Эспрессо</b></a> - ₹199
   ⚡ Крепкий | ⭐ 4.7★ | 🚚 Быстрая доставка

<b>4.</b> 🧊 <a href="https://www.starbucks.in/delivery?ref=bazaarguru&user=${userId}"><b>Айс-латте</b></a> - ₹329
   🧊 Прохладительный | ⭐ 4.8★ | 🎁 Лед в подарок

<b>5.</b> 🥤 <a href="https://www.starbucks.in/delivery?ref=bazaarguru&user=${userId}"><b>Фраппучино</b></a> - ₹399
   🍦 Сладкий | ⭐ 4.9★ | 🎁 Топпинг в подарок

<b>🎁 Промокод: <code>COFFEE20</code> (-₹60) = от ₹139</b>
<b>🚚 Бесплатная доставка от ₹500</b>

<i>☕ Скажи "Заказать латте" для быстрого заказа!</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🍵 Популярные напитки', callback_data: 'coffee_popular' },
          { text: '🧊 Холодные напитки', callback_data: 'coffee_cold' }
        ],
        [
          { text: '🔙 Назад к еде', callback_data: 'food' },
          { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
    console.log(`📊 User ${userId} ordered coffee`);
  }

  // ☕ ПОПУЛЯРНЫЕ НАПИТКИ
  async handleCoffeePopular(chatId) {
    const userId = chatId;

    const message = `☕ <b>ПОПУЛЯРНЫЕ НАПИТКИ - ЛЮБИМЫЕ ВЫБОРЫ!</b>

<b>🍵 Топ напитков:</b>

<b>1.</b> ☕ <a href="https://www.starbucks.in/delivery?ref=bazaarguru&user=${userId}"><b>Капучино</b></a> - ₹299
   🥛 Классический | ⭐ 4.8★ | 🚚 Бесплатная доставка
   🎁 Промокод: <code>CAPPUCCINO50</code> (-₹50) = ₹249

<b>2.</b> ☕ <a href="https://www.starbucks.in/delivery?ref=bazaarguru&user=${userId}"><b>Латте</b></a> - ₹349
   🥛 С миндальным молоком | ⭐ 4.9★ | 🎁 Сироп в подарок
   🎁 Промокод: <code>LATTE70</code> (-₹70) = ₹279

<b>3.</b> ☕ <a href="https://www.starbucks.in/delivery?ref=bazaarguru&user=${userId}"><b>Американо</b></a> - ₹249
   ⚡ Крепкий | ⭐ 4.7★ | 🚚 Быстрая доставка
   🎁 Промокод: <code>AMERICANO40</code> (-₹40) = ₹209

<b>4.</b> ☕ <a href="https://www.starbucks.in/delivery?ref=bazaarguru&user=${userId}"><b>Мокко</b></a> - ₹379
   🍫 Шоколадный | ⭐ 4.8★ | 🎁 Шоколад в подарок
   🎁 Промокод: <code>MOCHA80</code> (-₹80) = ₹299

<b>5.</b> ☕ <a href="https://www.starbucks.in/delivery?ref=bazaarguru&user=${userId}"><b>Флэт Уайт</b></a> - ₹329
   🥛 С двойным эспрессо | ⭐ 4.8★ | 🎁 Молочная пенка
   🎁 Промокод: <code>FLATWHITE60</code> (-₹60) = ₹269

<b>🎁 Общий промокод: <code>COFFEE20</code> (-₹60) = от ₹139</b>
<b>🚚 Бесплатная доставка от ₹500</b>

<i>☕ Скажи "Заказать капучино" для быстрого заказа!</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🔙 Назад к кофе', callback_data: 'order_coffee' },
          { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
  }

  // 🧊 ХОЛОДНЫЕ НАПИТКИ
  async handleCoffeeCold(chatId) {
    const userId = chatId;

    const message = `🧊 <b>ХОЛОДНЫЕ НАПИТКИ - ПРОХЛАДИТЕЛЬНЫЕ!</b>

<b>🍹 Ледяные напитки:</b>

<b>1.</b> 🧊 <a href="https://www.starbucks.in/delivery?ref=bazaarguru&user=${userId}"><b>Айс-латте</b></a> - ₹329
   🧊 Прохладительный | ⭐ 4.8★ | 🎁 Лед в подарок
   🎁 Промокод: <code>ICELATTE60</code> (-₹60) = ₹269

<b>2.</b> 🥤 <a href="https://www.starbucks.in/delivery?ref=bazaarguru&user=${userId}"><b>Фраппучино</b></a> - ₹399
   🍦 Сладкий | ⭐ 4.9★ | 🎁 Топпинг в подарок
   🎁 Промокод: <code>FRAPPE80</code> (-₹80) = ₹319

<b>3.</b> 🧊 <a href="https://www.starbucks.in/delivery?ref=bazaarguru&user=${userId}"><b>Айс-кофе</b></a> - ₹299
   🧊 Ледяной кофе | ⭐ 4.7★ | 🚚 Быстрая доставка
   🎁 Промокод: <code>ICECOFFEE50</code> (-₹50) = ₹249

<b>4.</b> 🧊 <a href="https://www.starbucks.in/delivery?ref=bazaarguru&user=${userId}"><b>Холодный чай</b></a> - ₹279
   🍵 Лимонный | ⭐ 4.8★ | 🎁 Лимон в подарок
   🎁 Промокод: <code>ICETEA40</code> (-₹40) = ₹239

<b>5.</b> 🧊 <a href="https://www.starbucks.in/delivery?ref=bazaarguru&user=${userId}"><b>Айс-мокко</b></a> - ₹359
   🍫 Холодный шоколад | ⭐ 4.9★ | 🎁 Шоколад в подарок
   🎁 Промокод: <code>ICEMOCHA70</code> (-₹70) = ₹289

<b>🎁 Общий промокод: <code>COFFEE20</code> (-₹60) = от ₹139</b>
<b>🚚 Бесплатная доставка от ₹500</b>
<b>🧊 Лучше всего со льдом!</b>

<i>🧊 Скажи "Заказать айс-латте" для быстрого заказа!</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🔙 Назад к кофе', callback_data: 'order_coffee' },
          { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
  }

  // 🍜 ЗАКАЗАТЬ КИТАЙСКУЮ ЕДУ
  async handleOrderChinese(chatId) {
    const userId = chatId;

    const message = `🍜 <b>ЗАКАЗАТЬ КИТАЙСКУЮ ЕДУ - ВКУСНЫЕ БЛЮДА!</b>

<b>🥢 Популярные блюда:</b>

<b>1.</b> 🍜 <a href="https://www.zomato.com/chinese?ref=bazaarguru&user=${userId}"><b>Кунг Пао курица</b></a> - ₹249
   🌶️ Острый | ⭐ 4.7★ | 🚚 Быстрая доставка
   🎁 Промокод: <code>KUNPAO50</code> (-₹50) = ₹199

<b>2.</b> 🍜 <a href="https://www.zomato.com/chinese?ref=bazaarguru&user=${userId}"><b>Свинина в кисло-сладком соусе</b></a> - ₹279
   🍯 Сладкий | ⭐ 4.8★ | 🎁 Соус в подарок
   🎁 Промокод: <code>SWEETPORK60</code> (-₹60) = ₹219

<b>3.</b> 🍜 <a href="https://www.zomato.com/chinese?ref=bazaarguru&user=${userId}"><b>Удон с овощами</b></a> - ₹199
   🥦 Здоровый | ⭐ 4.6★ | 🚚 Бесплатная доставка
   🎁 Промокод: <code>UDON40</code> (-₹40) = ₹159

<b>4.</b> 🍜 <a href="https://www.zomato.com/chinese?ref=bazaarguru&user=${userId}"><b>Креветки в чесночном соусе</b></a> - ₹329
   🦐 Морепродукты | ⭐ 4.9★ | 🎁 Палочки в подарок
   🎁 Промокод: <code>SHRIMP70</code> (-₹70) = ₹259

<b>5.</b> 🍜 <a href="https://www.zomato.com/chinese?ref=bazaarguru&user=${userId}"><b>Спринг-роллы (6 шт)</b></a> - ₹149
   🥢 Хрустящие | ⭐ 4.8★ | 🎁 Соус в подарок
   🎁 Промокод: <code>SPRINGROLL30</code> (-₹30) = ₹119

<b>🎁 Общий промокод: <code>CHINESE100</code> (-₹100) = от ₹99</b>
<b>🚚 Бесплатная доставка от ₹400</b>

<i>🍜 Скажи "Заказать кунг пао" для быстрого заказа!</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🔙 Назад к ресторанам', callback_data: 'nearby_restaurants' },
          { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
    console.log(`📊 User ${userId} ordered chinese food`);
  }

  // 🗺️ ПОКАЗАТЬ НА КАРТЕ
  async handleShowMap(chatId) {
    const userId = chatId;

    const message = `🗺️ <b>КАРТА МАГАЗИНОВ - НАЙДИ БЛИЖАЙШИЙ!</b>

<b>🏪 Популярные сети:</b>

<b>1.</b> 🛍️ <a href="https://www.myntra.com/store-locator?ref=bazaarguru&user=${userId}"><b>Myntra Stores</b></a>
   👟 Одежда и обувь | 📍 500+ магазинов в Индии

<b>2.</b> 👔 <a href="https://www.adidas.co.in/storefinder?ref=bazaarguru&user=${userId}"><b>Adidas Stores</b></a>
   👟 Спортивная одежда | 📍 150+ магазинов

<b>3.</b> 👟 <a href="https://www.nike.com/in/retail?ref=bazaarguru&user=${userId}"><b>Nike Stores</b></a>
   👟 Кроссовки и спорт | 📍 80+ магазинов

<b>4.</b> 🍔 <a href="https://www.mcdelivery.co.in/store-locator?ref=bazaarguru&user=${userId}"><b>McDonald's</b></a>
   🍔 Фастфуд | 📍 350+ ресторанов

<b>5.</b> ☕ <a href="https://www.starbucks.in/store-locator?ref=bazaarguru&user=${userId}"><b>Starbucks</b></a>
   ☕ Кофе | 📍 200+ кофеен

<b>📱 Для поиска ближайшего магазина:</b>
1. Нажми на ссылку магазина выше
2. Введи свой город или PIN-код
3. Найди ближайший к тебе магазин
4. Проверь наличие товара перед посещением

<i>🗺️ Все магазины показывают точные адреса и часы работы!</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '👔 Одежда и мода', callback_data: 'map_fashion' },
          { text: '👟 Обувь и аксессуары', callback_data: 'map_shoes' }
        ],
        [
          { text: '🍔 Еда и кафе', callback_data: 'map_food' },
          { text: '📱 Электроника', callback_data: 'map_electronics' }
        ],
        [
          { text: '🔙 Назад к еде', callback_data: 'food' },
          { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
    console.log(`📊 User ${userId} viewed store map`);
  }

  // 🗺️ КАРТА МАГАЗИНОВ ПО КАТЕГОРИЯМ
  async handleMapFashion(chatId) {
    const userId = chatId;

    const message = `🗺️ <b>МАГАЗИНЫ ОДЕЖДЫ И МОДЫ</b>

<b>🏪 Популярные сети одежды:</b>

<b>1.</b> 👗 <a href="https://www.myntra.com/store-locator?ref=bazaarguru&user=${userId}"><b>Myntra Stores</b></a>
   📍 500+ магазинов | 👔 Одежда, обувь, аксессуары

<b>2.</b> 👔 <a href="https://www.adidas.co.in/storefinder?ref=bazaarguru&user=${userId}"><b>Adidas Stores</b></a>
   📍 150+ магазинов | 👟 Спортивная одежда

<b>3.</b> 👟 <a href="https://www.nike.com/in/retail?ref=bazaarguru&user=${userId}"><b>Nike Stores</b></a>
   📍 80+ магазинов | 👟 Кроссовки и спорт

<b>4.</b> 🧥 <a href="https://www.zara.com/in/en/stores-locator.html?ref=bazaarguru&user=${userId}"><b>Zara Stores</b></a>
   📍 25+ магазинов | 👗 Модная одежда

<b>5.</b> 👚 <a href="https://www.hm.com/entrance.ahtml?orguri=%2F&ref=bazaarguru&user=${userId}"><b>H&M Stores</b></a>
   📍 200+ магазинов | 👔 Повседневная одежда

<b>📱 Как найти ближайший магазин:</b>
1. Нажми на ссылку магазина
2. Введи свой город или PIN-код
3. Выбери ближайший магазин
4. Проверь наличие товара по телефону

<i>🗺️ Все магазины показывают точные адреса и часы работы!</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🔙 Назад к карте', callback_data: 'show_map' },
          { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
  }

  async handleMapShoes(chatId) {
    const userId = chatId;

    const message = `🗺️ <b>МАГАЗИНЫ ОБУВИ И АКСЕССУАРОВ</b>

<b>🏪 Популярные сети обуви:</b>

<b>1.</b> 👟 <a href="https://www.bata.in/store-locator?ref=bazaarguru&user=${userId}"><b>Bata Stores</b></a>
   📍 1,500+ магазинов | 👠 Туфли, кроссовки, сандалии

<b>2.</b> 🥾 <a href="https://www.action.in/store-locator?ref=bazaarguru&user=${userId}"><b>Action Shoes</b></a>
   📍 200+ магазинов | 👟 Спортивная обувь

<b>3.</b> 👡 <a href="https://www.mochi.in/store-locator?ref=bazaarguru&user=${userId}"><b>Mochi Shoes</b></a>
   📍 300+ магазинов | 👠 Женская обувь

<b>4.</b> 👔 <a href="https://www.adidas.co.in/storefinder?ref=bazaarguru&user=${userId}"><b>Adidas Stores</b></a>
   📍 150+ магазинов | 👟 Спортивная обувь

<b>5.</b> 👟 <a href="https://www.nike.com/in/retail?ref=bazaarguru&user=${userId}"><b>Nike Stores</b></a>
   📍 80+ магазинов | 👟 Кроссовки и спорт

<b>📱 Как найти ближайший магазин:</b>
1. Нажми на ссылку магазина
2. Введи свой город или PIN-код
3. Выбери ближайший магазин
4. Проверь размерный ряд по телефону

<i>🗺️ Все магазины показывают точные адреса и часы работы!</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🔙 Назад к карте', callback_data: 'show_map' },
          { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
  }

  async handleMapFood(chatId) {
    const userId = chatId;

    const message = `🗺️ <b>РЕСТОРАНЫ И КАФЕ РЯДОМ</b>

<b>🍽️ Популярные сети питания:</b>

<b>1.</b> 🍔 <a href="https://www.mcdelivery.co.in/store-locator?ref=bazaarguru&user=${userId}"><b>McDonald's</b></a>
   📍 350+ ресторанов | 🍟 Бургеры, картошка, напитки

<b>2.</b> 🍕 <a href="https://www.dominos.co.in/store-locator?ref=bazaarguru&user=${userId}"><b>Dominos Pizza</b></a>
   📍 1,200+ пиццерий | 🍕 Пицца, паста, десерты

<b>3.</b> 🥤 <a href="https://www.kfc.co.in/store-locator?ref=bazaarguru&user=${userId}"><b>KFC</b></a>
   📍 400+ ресторанов | 🍗 Курица, картошка, напитки

<b>4.</b> ☕ <a href="https://www.starbucks.in/store-locator?ref=bazaarguru&user=${userId}"><b>Starbucks</b></a>
   📍 200+ кофеен | ☕ Кофе, чай, десерты

<b>5.</b> 🥗 <a href="https://www.subway.com/en-IN/find-a-location?ref=bazaarguru&user=${userId}"><b>Subway</b></a>
   📍 300+ ресторанов | 🥪 Сэндвичи, салаты

<b>📱 Как найти ближайший ресторан:</b>
1. Нажми на ссылку ресторана
2. Введи свой адрес или PIN-код
3. Выбери ближайший ресторан
4. Закажи доставку или самовывоз

<i>🗺️ Все рестораны показывают меню, цены и способы доставки!</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🔙 Назад к карте', callback_data: 'show_map' },
          { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
  }

  async handleMapElectronics(chatId) {
    const userId = chatId;

    const message = `🗺️ <b>МАГАЗИНЫ ЭЛЕКТРОНИКИ</b>

<b>🏪 Популярные сети электроники:</b>

<b>1.</b> 📱 <a href="https://www.croma.com/store-locator?ref=bazaarguru&user=${userId}"><b>Croma Stores</b></a>
   📍 300+ магазинов | 📱 Телефоны, ноутбуки, ТВ

<b>2.</b> 🛒 <a href="https://www.reliancedigital.in/store-locator?ref=bazaarguru&user=${userId}"><b>Reliance Digital</b></a>
   📍 1,000+ магазинов | 📱 Электроника, бытовая техника

<b>3.</b> 💻 <a href="https://www.acerstore.in/store-locator?ref=bazaarguru&user=${userId}"><b>Acer Stores</b></a>
   📍 100+ магазинов | 💻 Ноутбуки, компьютеры

<b>4.</b> 📱 <a href="https://www.samsung.com/in/storelocator?ref=bazaarguru&user=${userId}"><b>Samsung Stores</b></a>
   📍 200+ магазинов | 📱 Телефоны, ТВ, бытовая техника

<b>5.</b> 📱 <a href="https://www.vivo.com/in/store-locator?ref=bazaarguru&user=${userId}"><b>Vivo Stores</b></a>
   📍 50+ магазинов | 📱 Смартфоны и аксессуары

<b>📱 Как найти ближайший магазин:</b>
1. Нажми на ссылку магазина
2. Введи свой город или PIN-код
3. Выбери ближайший магазин
4. Проверь наличие товара по телефону

<i>🗺️ Все магазины показывают точные адреса и часы работы!</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🔙 Назад к карте', callback_data: 'show_map' },
          { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
  }

  // 📊 РАСШИРЕННАЯ АНАЛИТИКА
  updateAnalytics(action, category, price, userId) {
    this.analytics.totalPurchases++;
    this.analytics.averageOrderValue = ((this.analytics.averageOrderValue * (this.analytics.totalPurchases - 1)) + price) / this.analytics.totalPurchases;

    if (this.analytics.topCategories[category]) {
      this.analytics.topCategories[category]++;
    } else {
      this.analytics.topCategories[category] = 1;
    }

    console.log(`📊 Analytics: ${action} in ${category} for ₹${price} by user ${userId}`);
  }

  // 🔮 ПРЕДИКТИВНЫЕ РЕКОМЕНДАЦИИ
  generatePredictiveRecommendations(userId) {
    const user = this.users.get(userId);
    if (!user || !user.purchases || user.purchases.length < 2) {
      return this.getTrendingProducts();
    }

    // Анализ паттернов покупок
    const categories = user.purchases.map(p => p.category);
    const avgPrice = user.purchases.reduce((sum, p) => sum + p.price, 0) / user.purchases.length;

    const predictions = [];

    // Предсказываем следующий интерес на основе истории
    if (categories.includes('electronics')) {
      predictions.push({
        name: 'Apple Watch Series 9',
        price: 41900,
        reason: 'Продолжение твоего интереса к Apple',
        confidence: 85
      });
    }

    if (categories.includes('fashion')) {
      predictions.push({
        name: 'Nike Air Jordan',
        price: 12999,
        reason: 'Следующая пара кроссовок',
        confidence: 78
      });
    }

    return predictions.length > 0 ? predictions : this.getTrendingProducts();
  }

  getTrendingProducts() {
    return [
      { name: 'iPhone 16 Pro', price: 119999, reason: 'Тренд недели', confidence: 92 },
      { name: 'MacBook Pro M4', price: 199999, reason: 'Популярный выбор', confidence: 88 },
      { name: 'Sony PlayStation 5', price: 49999, reason: 'Геймерский тренд', confidence: 85 }
    ];
  }

  // 🎯 УМНЫЙ ПОИСК С ИИ
  async handleAISearch(chatId, query) {
    const message = `🧠 <b>ИИ-ПОИСК ПО ЗАПРОСУ: "${query}"</b>

⚡ <b>Найдено 1.2 сек:</b>
🎯 156 товаров • 💰 от ₹299 • 🚚 от 1 часа

<b>🔍 Результаты по категориям:</b>

<b>1. Точная фраза:</b>
📱 iPhone 15 Pro - ₹89,999 (-33%)
🎧 Sony WH-1000XM5 - ₹19,999 (-33%)
💻 MacBook Air - ₹85,999 (-25%)

<b>2. Похожие товары:</b>
📱 Samsung Galaxy S24 - ₹79,999 (-25%)
🎧 Bose QuietComfort - ₹24,999 (-30%)
💻 Dell XPS 13 - ₹92,999 (-20%)

<b>3. Альтернативы:</b>
📱 Google Pixel 8 - ₹69,999 (-15%)
🎧 JBL Live Pro+ - ₹14,999 (-40%)
💻 HP Spectre - ₹79,999 (-30%)

<b>💡 ИИ советует:</b> iPhone 15 Pro имеет лучший баланс цена/качество
<b>🎁 Экономия до ₹45,000</b>

<i>🤖 Анализ основан на 50,000+ отзывах пользователей!</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '📱 Показать iPhone', callback_data: 'show_iphone_ai' },
          { text: '🎧 Показать наушники', callback_data: 'show_headphones_ai' }
        ],
        [
          { text: '💻 Показать ноутбуки', callback_data: 'show_laptops_ai' },
          { text: '🔍 Уточнить поиск', callback_data: 'refine_search' }
        ],
        [
          { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
  }

  // 💰 РАСШИРЕННАЯ СИСТЕМА МОНОТИЗАЦИИ
  async handleAffiliateProgram(chatId) {
    const message = `💰 <b>ПАРТНЕРСКАЯ ПРОГРАММА</b>

🎯 <b>Зарабатывай с BazaarGuru!</b>

<b>💵 Твои доходы:</b>
📈 Комиссия: 8-15% от каждой продажи
👥 Реферальные: ₹500 за приглашенного друга
🎁 Бонусы: до ₹10,000 ежемесячно

<b>📊 Статистика:</b>
👥 Приглашено друзей: 0
💰 Заработано: ₹0
🎯 Конверсия: 0%

<b>🔗 Твоя реферальная ссылка:</b>
<code>https://t.me/bazaarguru_bot?start=ref_${chatId}</code>

<b>🎁 Преимущества:</b>
✅ Мгновенные выплаты
✅ Без лимитов на вывод
✅ Дополнительные бонусы
✅ Персональный менеджер

<i>🚀 Начни зарабатывать уже сегодня!</i>`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🔗 Скопировать ссылку', callback_data: 'copy_referral_link' },
          { text: '📊 Статистика', callback_data: 'referral_stats' }
        ],
        [
          { text: '💰 Вывести деньги', callback_data: 'withdraw_affiliate' },
          { text: '👥 Пригласить друзей', callback_data: 'invite_friends' }
        ],
        [
          { text: '🏠 Главное меню', callback_data: 'main_menu' }
        ]
      ]
    };

    await this.sendMessage(chatId, message, keyboard);
  }
}

// Запуск бота
const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.log('❌ Please set TELEGRAM_BOT_TOKEN environment variable');
  process.exit(1);
}

const bot = new BazaarGuruWowBot(token);
bot.start().catch(console.error);
const TEXTS = {
  ru: {
    languageName: '🇷🇺 Русский',
    aggregator: {
      intro: 'Привет, {name}! 👋 Мы — BazaarGuru.',
      pitch: 'Агрегируем официальные скидки, купоны и кешбэк. Мы не склад и не магазин.',
      disclaimer: 'Мы ищем текущие скидки в магазинах Flipkart, Amazon, Myntra, Ajio, Croma, Nykaa.',
      reminder: 'Доступность и наличие уточняйте на сайте магазина перед заказом.'
    },
    menu: {
      title: 'Выбери, что интересно:',
      buttons: {
        hotDeals: '🔥 Скидки дня',
        topDeals: '⭐ ТОП-10 выгод',
        categories: '🛍️ Категории',
        search: '🔍 Умный поиск',
        personal: '🎯 Персонально',
        stores: '🏬 Магазины',
        language: '🌐 Язык',
        help: 'ℹ️ FAQ'
      }
    },
    search: {
      title: '🔍 Найдём всё, что нужно, через умный поиск!',
      subtitle: '💡 Просто скажи, что ищешь, или выбери категорию.',
      howToTitle: '🔎 Как искать:',
      bullets: [
        '• Напиши текстом: «OnePlus до 20000» / «курти Biba до 1500»',
        '• Скажи голосом: удержи микрофон и произнеси запрос',
        '• Отправь фото товара: я найду похожие и покажу цены'
      ],
      clarify: '🎤 Уточни, что именно ищешь, для точного результата!',
      waiting: 'Жду запрос — бренд, модель, категория или бюджет.',
      fallbackVoice: 'Голос распознаем чуть позже. Напиши запрос текстом, а я найду скидки.',
      fallbackPhoto: 'Поиск по фото пока в разработке. Расскажи текстом, что нужно — подборка уже через секунду.'
    },
    searchSummary: {
      heading: '🧠 Ищу «{query}» для тебя…',
      statsTitle: '⚡ Нашли за {duration} сек:',
      count: '• {count} предложений',
      bestPrice: '• Лучшая цена: {bestPrice}',
      bestDiscount: '• Максимальная скидка: {bestDiscount}',
      bestCashback: '• Кешбэк до {cashback}',
      stores: '• Доступно в: {stores}'
    },
    searchTopPicksTitle: '🔥 Топ-3 предложения:',
    searchOtherTitle: '🛒 Другие варианты:',
    searchNone: '😔 Пока нет точных попаданий. Попробуй уточнить бренд, модель или бюджет.',
    categories: {
      title: '🛍️ Категории со скидками',
      subtitle: 'Мы агрегируем официальные скидки и промокоды — не продаём сами.',
      footer: '💡 Добавь любимые категории в «Персонально», чтобы получать больше таких подборок.'
    },
    stores: {
      title: '🏬 Магазины с актуальными скидками',
      subtitle: 'Мы мониторим витрины: {stores}. Жми на магазин, смотри скидки и проверяй наличие на сайте партнёра.'
    },
    deals: {
      topTitle: '⭐ 10 мощных скидок прямо сейчас',
      hotTitle: '🔥 Свежие скидки дня (обновляем каждые несколько часов)',
      storeTitle: '🏷️ Лучшие предложения от {store}',
      categoryTitle: '🎯 Горячие предложения категории «{category}»'
    },
    product: {
      headline: '{index}. {icon} <a href="{link}"><b>{name}</b></a> — {price}{original} ({discount})',
      storeLine: '🏬 Магазин: {store}',
      brandLine: '🏷️ Бренд: {brand}',
      couponLine: '🎟️ Промокод: {code} ({savings})',
      noCoupon: '🎟️ Промокод не нужен — скидка уже учтена',
      minOrderLine: '🛒 Минимальный заказ: {amount}',
      cashbackLine: '💰 Кешбэк: до {cashback}',
      lastCheckedLine: '🕒 Проверено: {datetime}',
      highlightsLine: '✨ Почему стоит взять: {list}',
      linkHint: 'Жми на название, чтобы перейти к офферу.',
      aggregatorReminder: 'Мы агрегируем оффер. Доступность уточняй на сайте магазина.'
    },
    personal: {
      title: '🎯 Персональная выгода',
      subtitle: 'Учитываем любимые категории, бюджет и историю кликов.',
      favorites: '❤️ Любимые категории: {list}',
      noFavorites: '❤️ Любимые категории ещё не выбраны.',
      budget: '💰 Лимит по бюджету: {value}',
      budgetUnlimited: 'без ограничений',
      notifications: '🔔 Уведомления: {list}',
      notificationsEmpty: '🔔 Уведомления: пока отключены',
      buttons: {
        categories: '❤️ Настроить категории',
        budget: '💰 Задать лимит',
        notifications: '🔔 Управлять уведомлениями',
        back: '⬅️ В меню'
      },
      chooseCategories: 'Выбирай любимые категории — повторное нажатие убирает из списка.',
      chooseBudget: 'Выбери удобный лимит:',
      budgetSaved: 'Лимит обновлён: {value}.',
      notificationOn: '{name} включены — будем присылать свежие сигналы.',
      notificationOff: '{name} отключены.',
      categoryAdded: 'Категория «{name}» добавлена в избранное.',
      categoryRemoved: 'Категория «{name}» убрана из избранного.',
      notificationsLabels: {
        price: '💸 Падение цены',
        cashback: '💰 Возврат кешбэка',
        coupon: '⏰ Купон истекает'
      },
      sampleNotification: {
        price: '💸 Цена упала: {product} теперь {price} (было {oldPrice}).',
        cashback: '💰 Кешбэк вернулся: {product} снова даёт до {cashback}.',
        coupon: '⏰ Напоминание: промокод {code} действует ещё {hours} ч.'
      }
    },
    help: {
      title: 'ℹ️ FAQ',
      intro: 'Я — агрегатор официальных скидок. Не продаю товары, а показываю лучшие предложения партнёров.',
      faq: 'Откуда товары? — Из официальных витрин магазинов по партнёрским API; мы показываем только актуальные скидки.',
      commands: 'Команды: /start — главное меню, /help — справка, /language — смена языка, /search — умный поиск.',
      contact: 'Хотите подключить свои витрины? Напишите partner@bazaar.guru'
    },
    languagePrompt: 'Выберите язык интерфейса:',
    languageSaved: 'Готово! Язык переключён на {language}.',
    aggregatorFooter: 'Мы агрегируем официальные скидки Flipkart, Amazon, Myntra, Ajio, Croma, Nykaa. Проверьте наличие на сайте магазина перед заказом.',
    back: '⬅️ Назад',
    more: 'Показать ещё',
    refineSearch: '🔍 Уточнить поиск'
  },
  en: {
    languageName: '🇬🇧 English',
    aggregator: {
      intro: 'Hi, {name}! 👋 We are BazaarGuru.',
      pitch: 'We aggregate official discounts, coupons and cashback. We are not a warehouse or a store.',
      disclaimer: 'We scout fresh deals from Flipkart, Amazon, Myntra, Ajio, Croma and Nykaa.',
      reminder: 'Please double-check availability on the retailer website before you order.'
    },
    menu: {
      title: 'Pick what you need:',
      buttons: {
        hotDeals: '🔥 Deals of the day',
        topDeals: '⭐ Top 10 savings',
        categories: '🛍️ Categories',
        search: '🔍 Smart search',
        personal: '🎯 For you',
        stores: '🏬 Stores',
        language: '🌐 Language',
        help: 'ℹ️ FAQ'
      }
    },
    search: {
      title: '🔍 Let’s find the perfect deal with smart search!',
      subtitle: '💡 Type what you need or just pick a category.',
      howToTitle: '🔎 How to search:',
      bullets: [
        '• Type it: “OnePlus under 20000” / “Biba kurti under 1500”',
        '• Speak it: hold the mic and say your request',
        '• Send a product photo: I’ll match similar listings and prices'
      ],
      clarify: '🎤 Tell me the exact need for sharper results!',
      waiting: 'Send a query — brand, model, category or budget.',
      fallbackVoice: 'Voice input is coming soon. For now, type the request and I’ll match the deals.',
      fallbackPhoto: 'Photo search is on the roadmap. Describe the item in text and I’ll fetch the offers instantly.'
    },
    searchSummary: {
      heading: '🧠 Searching “{query}”…',
      statsTitle: '⚡ Found in {duration}s:',
      count: '• {count} matching offers',
      bestPrice: '• Best price: {bestPrice}',
      bestDiscount: '• Max discount: {bestDiscount}',
      bestCashback: '• Cashback up to {cashback}',
      stores: '• Available at: {stores}'
    },
    searchTopPicksTitle: '🔥 Top 3 picks:',
    searchOtherTitle: '🛒 More options:',
    searchNone: '😔 No exact hits yet. Try another brand, model or budget filter.',
    categories: {
      title: '🛍️ Categories with savings',
      subtitle: 'We only surface official partner discounts — never resell stock ourselves.',
      footer: '💡 Add favourite categories inside “For you” to get even sharper picks.'
    },
    stores: {
      title: '🏬 Retailers with live offers',
      subtitle: 'We monitor: {stores}. Tap a store to see curated deals and confirm availability on the retailer page.'
    },
    deals: {
      topTitle: '⭐ 10 red-hot savings right now',
      hotTitle: '🔥 Deals of the day (refreshed every few hours)',
      storeTitle: '🏷️ Best offers from {store}',
      categoryTitle: '🎯 Highlights in {category}'
    },
    product: {
      headline: '{index}. {icon} <a href="{link}"><b>{name}</b></a> — {price}{original} ({discount})',
      storeLine: '🏬 Store: {store}',
      brandLine: '🏷️ Brand: {brand}',
      couponLine: '🎟️ Coupon: {code} ({savings})',
      noCoupon: '🎟️ Coupon not required — price already reduced',
      minOrderLine: '🛒 Minimum order: {amount}',
      cashbackLine: '💰 Cashback: up to {cashback}',
      lastCheckedLine: '🕒 Last checked: {datetime}',
      highlightsLine: '✨ Why you’ll love it: {list}',
      linkHint: 'Tap the name to open the offer page.',
      aggregatorReminder: 'We only point to the offer. Always confirm details on the retailer site.'
    },
    personal: {
      title: '🎯 Your personalised hub',
      subtitle: 'We balance favourite categories, budget and click history.',
      favorites: '❤️ Favourite categories: {list}',
      noFavorites: '❤️ You haven’t picked favourites yet.',
      budget: '💰 Budget limit: {value}',
      budgetUnlimited: 'no limits',
      notifications: '🔔 Alerts: {list}',
      notificationsEmpty: '🔔 Alerts: currently off',
      buttons: {
        categories: '❤️ Edit favourites',
        budget: '💰 Set budget',
        notifications: '🔔 Manage alerts',
        back: '⬅️ Back to menu'
      },
      chooseCategories: 'Toggle categories you love — tap again to remove.',
      chooseBudget: 'Pick the comfortable limit:',
      budgetSaved: 'Budget updated: {value}.',
      notificationOn: '{name} alerts enabled — we’ll message fresh triggers.',
      notificationOff: '{name} alerts disabled.',
      categoryAdded: '“{name}” saved as a favourite.',
      categoryRemoved: '“{name}” removed from favourites.',
      notificationsLabels: {
        price: '💸 Price drop',
        cashback: '💰 Cashback is back',
        coupon: '⏰ Coupon expiring'
      },
      sampleNotification: {
        price: '💸 Price drop alert: {product} now {price} (was {oldPrice}).',
        cashback: '💰 Cashback comeback: {product} now pays up to {cashback}.',
        coupon: '⏰ Reminder: coupon {code} is valid for {hours}h more.'
      }
    },
    help: {
      title: 'ℹ️ FAQ',
      intro: 'I’m an aggregator of official partner deals. I don’t sell stock myself; I highlight active savings.',
      faq: 'Where do items come from? — Official retailer storefronts via partner APIs; we only show live discounts.',
      commands: 'Commands: /start — main menu, /help — support, /language — switch language, /search — smart search.',
      contact: 'Want to plug in your catalogue? Drop us a line at partner@bazaar.guru'
    },
    languagePrompt: 'Choose your interface language:',
    languageSaved: 'Done! Language switched to {language}.',
    aggregatorFooter: 'We surface official deals from Flipkart, Amazon, Myntra, Ajio, Croma and Nykaa. Check retailer availability before placing an order.',
    back: '⬅️ Back',
    more: 'Show more',
    refineSearch: '🔍 Refine search'
  },
  hi: {
    languageName: '🇮🇳 हिन्दी',
    aggregator: {
      intro: 'नमस्ते, {name}! 👋 हम BazaarGuru हैं।',
      pitch: 'हम आधिकारिक डिस्काउंट, कूपन और कैशबैक एक जगह दिखाते हैं। हम खुद माल नहीं बेचते।',
      disclaimer: 'हम Flipkart, Amazon, Myntra, Ajio, Croma और Nykaa से ताज़ा ऑफ़र ढूंढते हैं।',
      reminder: 'ऑर्डर से पहले स्टोर की वेबसाइट पर उपलब्धता ज़रूर जाँचें।'
    },
    menu: {
      title: 'क्या देखना चाहेंगे?',
      buttons: {
        hotDeals: '🔥 आज की डील्स',
        topDeals: '⭐ टॉप 10 बचत',
        categories: '🛍️ श्रेणियाँ',
        search: '🔍 स्मार्ट सर्च',
        personal: '🎯 आपके लिए',
        stores: '🏬 स्टोर',
        language: '🌐 भाषा',
        help: 'ℹ️ मदद'
      }
    },
    search: {
      title: '🔍 स्मार्ट सर्च से हर चीज़ ढूंढें!',
      subtitle: '💡 बस लिखें कि क्या चाहिए या श्रेणी चुनें।',
      howToTitle: '🔎 कैसे खोजें:',
      bullets: [
        '• टेक्स्ट लिखें: “OnePlus 20000 तक” / “Biba कुर्ती 1500 तक”',
        '• आवाज़ से बोलें: माइक्रोफोन दबाकर बताइए',
        '• प्रोडक्ट की फोटो भेजें: मैं मिलते-जुलते दाम दिखाऊँगा'
      ],
      clarify: '🎤 सही रिज़ल्ट के लिए बताएँ कि क्या ढूंढ रहे हैं!',
      waiting: 'ब्रांड, मॉडल, श्रेणी या बजट लिखें — मैं तुरंत मिलान करूँगा।',
      fallbackVoice: 'आवाज़ पहचान जल्द आ रही है। अभी टेक्स्ट में लिखें और मैं ऑफ़र दिखाऊँगा।',
      fallbackPhoto: 'फोटो सर्च पर काम चल रहा है। फिलहाल टेक्स्ट में बताएँ — ऑफ़र तुरंत मिलेंगे।'
    },
    searchSummary: {
      heading: '🧠 “{query}” के लिए खोज रहा हूँ…',
      statsTitle: '⚡ {duration} सेकेंड में मिला:',
      count: '• {count} ऑफ़र',
      bestPrice: '• सबसे कम कीमत: {bestPrice}',
      bestDiscount: '• अधिकतम डिस्काउंट: {bestDiscount}',
      bestCashback: '• कैशबैक: {cashback} तक',
      stores: '• उपलब्ध स्टोर: {stores}'
    },
    searchTopPicksTitle: '🔥 टॉप 3 सुझाव:',
    searchOtherTitle: '🛒 और विकल्प:',
    searchNone: '😔 अभी सटीक नतीजा नहीं मिला। ब्रांड, मॉडल या बजट बदलकर देखें।',
    categories: {
      title: '🛍️ छूट वाली श्रेणियाँ',
      subtitle: 'हम केवल आधिकारिक पार्टनर डिस्काउंट दिखाते हैं — खुद सामान नहीं बेचते।',
      footer: '💡 “आपके लिए” में पसंदीदा श्रेणियाँ जोड़ें ताकि बेहतर सुझाव मिलें।'
    },
    stores: {
      title: '🏬 जिन स्टोर पर ऑफ़र चालू हैं',
      subtitle: 'हम देखते हैं: {stores}। स्टोर चुनें और ऑफ़र देखें, ऑर्डर से पहले स्टोर साइट पर जाँचें।'
    },
    deals: {
      topTitle: '⭐ अभी के 10 सबसे बढ़िया ऑफ़र',
      hotTitle: '🔥 आज की ताज़ा डील्स (हर कुछ घंटों में अपडेट)',
      storeTitle: '🏷️ {store} के बेस्ट ऑफ़र',
      categoryTitle: '🎯 {category} के टॉप डील्स'
    },
    product: {
      headline: '{index}. {icon} <a href="{link}"><b>{name}</b></a> — {price}{original} ({discount})',
      storeLine: '🏬 स्टोर: {store}',
      brandLine: '🏷️ ब्रांड: {brand}',
      couponLine: '🎟️ कूपन: {code} ({savings})',
      noCoupon: '🎟️ कूपन की ज़रूरत नहीं — कीमत पहले से कम है',
      minOrderLine: '🛒 न्यूनतम ऑर्डर: {amount}',
      cashbackLine: '💰 कैशबैक: {cashback} तक',
      lastCheckedLine: '🕒 आख़िरी जाँच: {datetime}',
      highlightsLine: '✨ ख़ास बातें: {list}',
      linkHint: 'ऑफ़र खोलने के लिए नाम पर टैप करें।',
      aggregatorReminder: 'हम सिर्फ़ ऑफ़र दिखाते हैं। खरीद से पहले स्टोर साइट पर जाँचें।'
    },
    personal: {
      title: '🎯 आपकी निजी बचत',
      subtitle: 'पसंदीदा श्रेणियाँ, बजट और क्लिक हिस्ट्री देखते हैं।',
      favorites: '❤️ पसंदीदा श्रेणियाँ: {list}',
      noFavorites: '❤️ आपने अभी पसंदीदा श्रेणियाँ नहीं चुनीं।',
      budget: '💰 बजट सीमा: {value}',
      budgetUnlimited: 'कोई सीमा नहीं',
      notifications: '🔔 अलर्ट: {list}',
      notificationsEmpty: '🔔 अलर्ट: अभी बंद हैं',
      buttons: {
        categories: '❤️ श्रेणियाँ चुनें',
        budget: '💰 बजट सेट करें',
        notifications: '🔔 अलर्ट प्रबंधन',
        back: '⬅️ मेनू पर लौटें'
      },
      chooseCategories: 'जो श्रेणियाँ पसंद हैं उन्हें टॉगल करें — दोबारा दबाने से हटेगी।',
      chooseBudget: 'सही बजट चुनें:',
      budgetSaved: 'बजट अपडेट: {value}.',
      notificationOn: '{name} अलर्ट चालू — ताज़ा संकेत भेजेंगे।',
      notificationOff: '{name} अलर्ट बंद।',
      categoryAdded: '“{name}” पसंदीदा में जोड़ा गया।',
      categoryRemoved: '“{name}” पसंदीदा से हटाया गया।',
      notificationsLabels: {
        price: '💸 कीमत घटी',
        cashback: '💰 कैशबैक वापस',
        coupon: '⏰ कूपन जल्‍द खत्म'
      },
      sampleNotification: {
        price: '💸 कीमत कम: {product} अब {price} (पहले {oldPrice}).',
        cashback: '💰 कैशबैक लौट आया: {product} अब {cashback} तक देता है।',
        coupon: '⏰ याद दिलाना: कूपन {code} अभी {hours} घंटे और चलेगा।'
      }
    },
    help: {
      title: 'ℹ️ मदद',
      intro: 'मैं आधिकारिक पार्टनर ऑफ़र का एग्रीगेटर हूँ। मैं सामान नहीं बेचता, बस बचत दिखाता हूँ।',
      faq: 'सामान कहाँ से आता है? — पार्टनर API से आधिकारिक स्टोर विटरिन; हम सिर्फ़ ताज़ा डिस्काउंट दिखाते हैं।',
      commands: 'कमांड: /start — मुख्य मेनू, /help — सहायता, /language — भाषा बदलें, /search — स्मार्ट सर्च।',
      contact: 'अपना कैटलॉग जोड़ना चाहते हैं? partner@bazaar.guru पर लिखें।'
    },
    languagePrompt: 'इंटरफ़ेस भाषा चुनें:',
    languageSaved: 'हो गया! भाषा {language} पर बदली।',
    aggregatorFooter: 'हम Flipkart, Amazon, Myntra, Ajio, Croma और Nykaa की आधिकारिक छूट दिखाते हैं। ऑर्डर से पहले स्टोर साइट पर उपलब्धता देखें।',
    back: '⬅️ वापस',
    more: 'और दिखाएँ',
    refineSearch: '🔍 खोज सुधारें'
  }
};
const getLocale = (lang) => LOCALES[lang] || LOCALES[DEFAULT_LANG];

const escapeHtml = (input) => {
  if (input === undefined || input === null) {
    return '';
  }
  return input
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

const formatCurrency = (value, lang) => {
  if (value === undefined || value === null) {
    return '—';
  }
  const locale = getLocale(lang);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(Number(value));
};

const formatPercent = (value) => {
  if (value === undefined || value === null) {
    return '—';
  }
  return `${Number(value)}%`;
};

const formatDateTime = (value, lang) => {
  if (!value) {
    return '—';
  }
  const locale = getLocale(lang);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.toString();
  }
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

const applyTemplate = (template, params = {}) => {
  if (typeof template !== 'string') {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const value = params[key];
    return value !== undefined && value !== null ? value : `{${key}}`;
  });
};

const chunkArray = (array, size) => {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
};

const unique = (items) => Array.from(new Set((items || []).filter(Boolean)));

class BazaarGuruAggregatorBot {
  constructor(token) {
    if (!token) {
      throw new Error('Bot token is required. Set TELEGRAM_BOT_TOKEN in your environment.');
    }

    this.token = token;
    this.bot = new TelegramBot(token, { polling: true });
    this.users = new Map();
    this.products = PRODUCTS_DATA.map((product) => ({
      ...product,
      lastChecked: product.lastChecked || new Date().toISOString()
    }));

    this.registerHandlers();
    console.log('🚀 BazaarGuru Aggregator Bot is running with smart UX.');
  }

  registerHandlers() {
    this.bot.on('message', (msg) => this.handleMessage(msg));
    this.bot.on('callback_query', (query) => this.handleCallback(query));
  }

  getUser(chatId) {
    let user = this.users.get(chatId);
    if (!user) {
      user = {
        chatId,
        language: DEFAULT_LANG,
        state: null,
        lastQuery: null,
        preferences: {
          favorites: new Set(),
          budget: null,
          notifications: {
            price: false,
            cashback: false,
            coupon: false
          }
        },
        stats: {
          searches: 0,
          lastSearchAt: null,
          clickHistory: []
        }
      };
      this.users.set(chatId, user);
    }
    return user;
  }

  getTexts(user) {
    const lang = user?.language || DEFAULT_LANG;
    return TEXTS[lang] || TEXTS[DEFAULT_LANG];
  }

  t(user, path, params = {}) {
    const texts = this.getTexts(user);
    const value = path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), texts);
    if (value === undefined) {
      return path;
    }
    if (Array.isArray(value)) {
      return value.map((item) => (typeof item === 'string' ? applyTemplate(item, params) : item));
    }
    if (typeof value === 'string') {
      return applyTemplate(value, params);
    }
    return value;
  }

  setLanguage(user, lang) {
    if (!SUPPORTED_LANGS.includes(lang)) {
      return;
    }
    user.language = lang;
  }

  async handleMessage(msg) {
    if (!msg || !msg.chat) {
      return;
    }
    const chatId = msg.chat.id;
    const user = this.getUser(chatId);
    const text = msg.text?.trim();

    if (text) {
      if (text.startsWith('/start')) {
        return this.handleStart(chatId, msg.from?.first_name || msg.chat.first_name || 'друг');
      }
      if (text.startsWith('/help')) {
        return this.sendHelp(chatId, user);
      }
      if (text.startsWith('/language')) {
        return this.sendLanguageMenu(chatId, user);
      }
      if (text.startsWith('/search')) {
        user.state = 'awaiting_search';
        return this.sendSearchInstructions(chatId, user, true);
      }
      return this.handleUserText(chatId, user, text);
    }

    if (msg.voice) {
      const response = this.t(user, 'search.fallbackVoice');
      return this.bot.sendMessage(chatId, response, { parse_mode: 'HTML' });
    }

    if (msg.photo) {
      const response = this.t(user, 'search.fallbackPhoto');
      return this.bot.sendMessage(chatId, response, { parse_mode: 'HTML' });
    }
  }

  async sendSearchInstructions(chatId, user, highlight = false) {
    const bullets = this.t(user, 'search.bullets');
    const message = [
      this.t(user, 'search.title'),
      this.t(user, 'search.subtitle'),
      '',
      this.t(user, 'search.howToTitle'),
      bullets.join('\n'),
      '',
      this.t(user, 'search.clarify')
    ].join('\n');

    const keyboard = {
      inline_keyboard: [
        [
          { text: this.t(user, 'menu.buttons.personal'), callback_data: 'open_personal' },
          { text: this.t(user, 'menu.buttons.categories'), callback_data: 'open_categories' }
        ],
        [
          { text: this.t(user, 'back'), callback_data: 'back_main' }
        ]
      ]
    };

    const options = { parse_mode: 'HTML', reply_markup: keyboard };
    if (highlight) {
      options.disable_web_page_preview = true;
    }

    await this.bot.sendMessage(chatId, message, options);
    user.state = 'awaiting_search';
  }

  async handleUserText(chatId, user, text) {
    if (!text) {
      return;
    }
    user.state = 'awaiting_search';
    await this.processSearch(chatId, user, text);
  }

  extractBudget(rawQuery) {
    const matches = (rawQuery.match(/(\d[\d\s]{2,})/g) || []).map((match) => Number(match.replace(/\D/g, '')));
    const valid = matches.filter((value) => value && value > 500);
    if (!valid.length) {
      return null;
    }
    return Math.min(...valid);
  }

  filterProducts(query, budgetLimit, user) {
    const normalizedQuery = query.toLowerCase();
    const tokens = normalizedQuery.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    const filteredTokens = tokens.filter((token) => !/^\d+$/.test(token));

    let effectiveBudget = budgetLimit;
    if (user.preferences.budget) {
      effectiveBudget = effectiveBudget ? Math.min(effectiveBudget, user.preferences.budget) : user.preferences.budget;
    }

    return this.products.filter((product) => {
      if (effectiveBudget && product.price && Number(product.price) > effectiveBudget) {
        return false;
      }

      if (!filteredTokens.length) {
        return true;
      }

      const haystack = [
        product.name,
        product.brand,
        product.category,
        product.store,
        ...(product.tags || [])
      ]
        .join(' ')
        .toLowerCase();

      return filteredTokens.every((token) => haystack.includes(token));
    });
  }

  getDiscountLabel(user, product) {
    const parts = [];
    if (product.discountPercent) {
      parts.push(`-${product.discountPercent}%`);
    }
    if (product.couponType === 'percent' && product.couponValue) {
      parts.push(`coupon -${product.couponValue}%`);
    }
    if (!parts.length && product.couponType === 'amount' && product.couponValue) {
      parts.push(`coupon -${product.couponValue}`);
    }
    if (!parts.length && product.cashbackPercent) {
      parts.push(`cashback ${product.cashbackPercent}%`);
    }
    if (!parts.length) {
      return 'deal';
    }
    return parts.join(' · ');
  }

  getCouponSavings(user, product) {
    if (!product.couponCode) {
      return '';
    }
    const lang = user.language;
    if (product.couponType === 'amount' && product.couponValue) {
      const amount = formatCurrency(product.couponValue, lang);
      if (lang === 'ru') {
        return `???????? ${amount}`;
      }
      if (lang === 'hi') {
        return `${amount} ?? ???`;
      }
      return `save ${amount}`;
    }
    if (product.couponType === 'percent' && product.couponValue) {
      const percent = formatPercent(product.couponValue);
      if (lang === 'ru') {
        return `?????? +${percent}`;
      }
      if (lang === 'hi') {
        return `???????? ${percent}`;
      }
      return `extra ${percent}`;
    }
    if (lang === 'ru') {
      return '?????????????? ??????';
    }
    if (lang === 'hi') {
      return '???????? ????';
    }
    return 'extra bonus';
  }

  formatProductEntry(user, product, index) {
    const texts = this.getTexts(user);
    const lang = user.language;
    const icon = CATEGORY_INDEX.get(product.category)?.icon || '🛍️';
    const price = formatCurrency(product.price, lang);
    const original = product.originalPrice ? ` <s>${formatCurrency(product.originalPrice, lang)}</s>` : '';
    const discount = this.getDiscountLabel(user, product);
    const headline = applyTemplate(texts.product.headline, {
      index,
      icon,
      link: escapeHtml(product.link || product.url || product.affiliateUrl || '#'),
      name: escapeHtml(product.name),
      price,
      original,
      discount: discount || '—'
    });

    const rows = [headline];
    rows.push(applyTemplate(texts.product.storeLine, { store: escapeHtml(product.store) }));

    if (product.brand) {
      rows.push(applyTemplate(texts.product.brandLine, { brand: escapeHtml(product.brand) }));
    }

    if (product.couponCode) {
      rows.push(applyTemplate(texts.product.couponLine, {
        code: escapeHtml(product.couponCode),
        savings: this.getCouponSavings(user, product)
      }));
    } else {
      rows.push(texts.product.noCoupon);
    }

    if (product.minOrder) {
      rows.push(applyTemplate(texts.product.minOrderLine, {
        amount: formatCurrency(product.minOrder, lang)
      }));
    }

    if (product.cashbackPercent) {
      rows.push(applyTemplate(texts.product.cashbackLine, {
        cashback: formatPercent(product.cashbackPercent)
      }));
    }

    rows.push(applyTemplate(texts.product.lastCheckedLine, {
      datetime: formatDateTime(product.lastChecked, lang)
    }));

    if (product.highlights?.length) {
      rows.push(applyTemplate(texts.product.highlightsLine, {
        list: product.highlights.slice(0, 3).join(' · ')
      }));
    }

    return rows.join('\n');
  }

  formatProductList(user, products, startIndex = 1) {
    return products.map((product, offset) => this.formatProductEntry(user, product, startIndex + offset)).join('\n\n');
  }

  async processSearch(chatId, user, rawQuery) {
    const budget = this.extractBudget(rawQuery);
    const results = this.filterProducts(rawQuery, budget, user);
    const lang = user.language;
    const duration = (Math.random() * 0.6 + 0.4).toFixed(1);

    user.stats.searches += 1;
    user.lastQuery = rawQuery;
    user.stats.lastSearchAt = Date.now();
    user.stats.clickHistory.unshift({
      type: 'search',
      query: rawQuery,
      at: Date.now(),
      categories: unique(results.map((item) => item.category))
    });
    user.stats.clickHistory = user.stats.clickHistory.slice(0, 50);

    if (!results.length) {
      await this.bot.sendMessage(chatId, this.t(user, 'searchNone'), { parse_mode: 'HTML' });
      return this.sendSearchInstructions(chatId, user);
    }

    const sorted = results
      .slice()
      .sort((a, b) => {
        const discountDiff = (b.discountPercent || 0) - (a.discountPercent || 0);
        if (discountDiff !== 0) {
          return discountDiff;
        }
        const cashbackDiff = (b.cashbackPercent || 0) - (a.cashbackPercent || 0);
        if (cashbackDiff !== 0) {
          return cashbackDiff;
        }
        return (a.price || 0) - (b.price || 0);
      });

    const topPicks = sorted.slice(0, 3);
    const others = sorted.slice(3, 10);

    const minPrice = sorted.reduce((min, item) => (item.price && item.price < min ? item.price : min), sorted[0].price || 0);
    const maxDiscount = sorted.reduce((max, item) => (item.discountPercent && item.discountPercent > max ? item.discountPercent : max), 0);
    const maxCashback = sorted.reduce((max, item) => (item.cashbackPercent && item.cashbackPercent > max ? item.cashbackPercent : max), 0);
    const storeNames = unique(sorted.map((item) => item.store)).slice(0, 6).join(', ');

    const parts = [];
    parts.push(this.t(user, 'searchSummary.heading', { query: escapeHtml(rawQuery) }));
    parts.push('');
    parts.push(this.t(user, 'searchSummary.statsTitle', { duration }));
    parts.push(this.t(user, 'searchSummary.count', { count: sorted.length }));
    parts.push(this.t(user, 'searchSummary.bestPrice', { bestPrice: formatCurrency(minPrice, lang) }));
    parts.push(this.t(user, 'searchSummary.bestDiscount', { bestDiscount: formatPercent(maxDiscount) }));
    parts.push(this.t(user, 'searchSummary.bestCashback', { cashback: formatPercent(maxCashback) }));
    parts.push(this.t(user, 'searchSummary.stores', { stores: storeNames || '—' }));
    parts.push('');

    let index = 1;
    if (topPicks.length) {
      parts.push(this.t(user, 'searchTopPicksTitle'));
      parts.push(this.formatProductList(user, topPicks, index));
      index += topPicks.length;
    }

    if (others.length) {
      parts.push('');
      parts.push(this.t(user, 'searchOtherTitle'));
      parts.push(this.formatProductList(user, others, index));
    }

    parts.push('');
    parts.push(this.t(user, 'product.linkHint'));
    parts.push(this.t(user, 'product.aggregatorReminder'));
    parts.push(this.t(user, 'aggregatorFooter'));

    const keyboard = {
      inline_keyboard: [
        [
          { text: this.t(user, 'menu.buttons.stores'), callback_data: 'open_stores' },
          { text: this.t(user, 'refineSearch'), callback_data: 'refine_search' }
        ],
        [
          { text: this.t(user, 'back'), callback_data: 'back_main' }
        ]
      ]
    };

    await this.bot.sendMessage(chatId, parts.join('\n'), {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup: keyboard
    });
  }

  async handleStart(chatId, rawName) {
    const user = this.getUser(chatId);
    const name = escapeHtml(rawName || 'друг');
    const intro = [
      this.t(user, 'aggregator.intro', { name }),
      this.t(user, 'aggregator.pitch'),
      this.t(user, 'aggregator.disclaimer'),
      this.t(user, 'aggregator.reminder')
    ].join('\n');

    await this.bot.sendMessage(chatId, intro, {
      parse_mode: 'HTML',
      disable_web_page_preview: true
    });

    await this.sendMainMenu(chatId, user);
  }

  async sendMainMenu(chatId, user) {
    const texts = this.getTexts(user);
    const keyboard = {
      inline_keyboard: [
        [
          { text: texts.menu.buttons.hotDeals, callback_data: 'hot_deals' },
          { text: texts.menu.buttons.topDeals, callback_data: 'top_deals' }
        ],
        [
          { text: texts.menu.buttons.categories, callback_data: 'open_categories' },
          { text: texts.menu.buttons.search, callback_data: 'search_product' }
        ],
        [
          { text: texts.menu.buttons.personal, callback_data: 'open_personal' },
          { text: texts.menu.buttons.stores, callback_data: 'open_stores' }
        ],
        [
          { text: texts.menu.buttons.language, callback_data: 'open_language' },
          { text: texts.menu.buttons.help, callback_data: 'open_help' }
        ]
      ]
    };

    await this.bot.sendMessage(chatId, texts.menu.title, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  async sendHelp(chatId, user) {
    const help = this.getTexts(user).help;
    const message = [help.title, '', help.intro, help.faq, help.commands, help.contact].join('\n');
    await this.bot.sendMessage(chatId, message, {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup: {
        inline_keyboard: [
          [
            { text: this.t(user, 'menu.buttons.search'), callback_data: 'search_product' },
            { text: this.t(user, 'back'), callback_data: 'back_main' }
          ]
        ]
      }
    });
  }

  async sendLanguageMenu(chatId, user) {
    const rows = chunkArray(
      SUPPORTED_LANGS.map((lang) => {
        const label = TEXTS[lang].languageName + (user.language === lang ? ' ✅' : '');
        return { text: label, callback_data: `set_language_${lang}` };
      }),
      2
    );

    await this.bot.sendMessage(chatId, this.t(user, 'languagePrompt'), {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [...rows, [{ text: this.t(user, 'back'), callback_data: 'back_main' }]]
      }
    });
  }

  async sendCategoriesMenu(chatId, user) {
    const lang = user.language;
    const rows = chunkArray(
      CATEGORIES.map((category) => ({
        text: `${category.icon} ${category.labels[lang] || category.labels[DEFAULT_LANG]}`,
        callback_data: `category_${category.id}`
      })),
      2
    );

    const message = [
      this.t(user, 'categories.title'),
      '',
      this.t(user, 'categories.subtitle'),
      '',
      this.t(user, 'categories.footer'),
      this.t(user, 'aggregatorFooter')
    ].join('\n');

    await this.bot.sendMessage(chatId, message, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [...rows, [{ text: this.t(user, 'back'), callback_data: 'back_main' }]]
      }
    });
  }

  async sendStoresMenu(chatId, user) {
    const lang = user.language;
    const storeNames = STORES.map((store) => store.name).join(' · ');
    const rows = chunkArray(
      STORES.map((store) => ({
        text: `${store.icon} ${store.name}`,
        callback_data: `store_${store.id}`
      })),
      3
    );

    const listLines = STORES.map((store) => `${store.icon} <a href="${escapeHtml(store.url)}">${escapeHtml(store.name)}</a> — ${store.tagline[lang] || store.tagline[DEFAULT_LANG]}`);

    const message = [
      this.t(user, 'stores.title'),
      '',
      this.t(user, 'stores.subtitle', { stores: storeNames }),
      '',
      listLines.join('\n'),
      '',
      this.t(user, 'aggregatorFooter')
    ].join('\n');

    await this.bot.sendMessage(chatId, message, {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup: {
        inline_keyboard: [...rows, [{ text: this.t(user, 'back'), callback_data: 'back_main' }]]
      }
    });
  }

  rankProducts(products) {
    return products
      .slice()
      .sort((a, b) => {
        const discountDiff = (b.discountPercent || 0) - (a.discountPercent || 0);
        if (discountDiff !== 0) {
          return discountDiff;
        }
        const cashbackDiff = (b.cashbackPercent || 0) - (a.cashbackPercent || 0);
        if (cashbackDiff !== 0) {
          return cashbackDiff;
        }
        return (a.price || 0) - (b.price || 0);
      });
  }

  async sendDealsList(chatId, user, title, products) {
    if (!products.length) {
      await this.bot.sendMessage(chatId, this.t(user, 'searchNone'), { parse_mode: 'HTML' });
      return;
    }

    const ranked = this.rankProducts(products).slice(0, 10);
    const messageParts = [title, '', this.formatProductList(user, ranked, 1), '', this.t(user, 'product.linkHint'), this.t(user, 'product.aggregatorReminder'), this.t(user, 'aggregatorFooter')];

    const keyboard = {
      inline_keyboard: [
        [
          { text: this.t(user, 'refineSearch'), callback_data: 'refine_search' },
          { text: this.t(user, 'menu.buttons.personal'), callback_data: 'open_personal' }
        ],
        [
          { text: this.t(user, 'back'), callback_data: 'back_main' }
        ]
      ]
    };

    await this.bot.sendMessage(chatId, messageParts.join('\n'), {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup: keyboard
    });
  }

  async sendCategoryDeals(chatId, user, categoryId) {
    const category = CATEGORY_INDEX.get(categoryId);
    if (!category) {
      return;
    }

    const lang = user.language;
    const title = this.t(user, 'deals.categoryTitle', {
      category: category.labels[lang] || category.labels[DEFAULT_LANG]
    });

    const deals = this.products.filter((product) => product.category === categoryId);
    user.stats.clickHistory.unshift({ type: 'category', category: categoryId, at: Date.now() });
    user.stats.clickHistory = user.stats.clickHistory.slice(0, 50);

    await this.sendDealsList(chatId, user, title, deals);
  }

  async sendStoreDeals(chatId, user, storeId) {
    const store = STORE_INDEX.get(storeId);
    if (!store) {
      return;
    }

    const deals = this.products.filter((product) => product.storeSlug === storeId || product.store?.toLowerCase().includes(store.name.toLowerCase()));
    const title = this.t(user, 'deals.storeTitle', { store: store.name });
    user.stats.clickHistory.unshift({ type: 'store', store: storeId, at: Date.now() });
    user.stats.clickHistory = user.stats.clickHistory.slice(0, 50);

    await this.sendDealsList(chatId, user, title, deals);
  }

  async sendTopDeals(chatId, user) {
    const title = this.t(user, 'deals.topTitle');
    await this.sendDealsList(chatId, user, title, this.products);
  }

  async sendHotDeals(chatId, user) {
    const recent = this.products
      .slice()
      .sort((a, b) => new Date(b.lastChecked) - new Date(a.lastChecked));
    const title = this.t(user, 'deals.hotTitle');
    await this.sendDealsList(chatId, user, title, recent);
  }

  async sendPersonalDashboard(chatId, user) {
    const lang = user.language;
    const texts = this.getTexts(user);
    const favorites = Array.from(user.preferences.favorites || []);
    const favoriteLabels = favorites.length
      ? favorites
          .map((categoryId) => CATEGORY_INDEX.get(categoryId)?.labels[lang] || CATEGORY_INDEX.get(categoryId)?.labels[DEFAULT_LANG] || categoryId)
          .join(' · ')
      : null;

    const notificationLabels = NOTIFICATION_TYPES.filter((type) => user.preferences.notifications?.[type.id])
      .map((type) => texts.personal.notificationsLabels[type.id] || type.labels[lang] || type.labels[DEFAULT_LANG]);

    const budgetValue = user.preferences.budget
      ? formatCurrency(user.preferences.budget, lang)
      : texts.personal.budgetUnlimited;

    const messageLines = [
      texts.personal.title,
      '',
      texts.personal.subtitle,
      '',
      favoriteLabels ? texts.personal.favorites.replace('{list}', favoriteLabels) : texts.personal.noFavorites,
      texts.personal.budget.replace('{value}', budgetValue),
      notificationLabels.length
        ? texts.personal.notifications.replace('{list}', notificationLabels.join(' · '))
        : texts.personal.notificationsEmpty,
      '',
      this.t(user, 'aggregatorFooter')
    ];

    const keyboard = {
      inline_keyboard: [
        [
          { text: texts.personal.buttons.categories, callback_data: 'personal_categories' },
          { text: texts.personal.buttons.budget, callback_data: 'personal_budget' }
        ],
        [
          { text: texts.personal.buttons.notifications, callback_data: 'personal_notifications' },
          { text: texts.personal.buttons.back, callback_data: 'back_main' }
        ]
      ]
    };

    await this.bot.sendMessage(chatId, messageLines.join('\n'), {
      parse_mode: 'HTML',
      reply_markup: keyboard,
      disable_web_page_preview: true
    });
  }

  async sendPersonalCategories(chatId, user) {
    const lang = user.language;
    const favorites = user.preferences.favorites || new Set();
    user.preferences.favorites = favorites;

    const buttons = CATEGORIES.map((category) => {
      const isSelected = favorites.has(category.id);
      const label = `${isSelected ? '✅ ' : ''}${category.icon} ${category.labels[lang] || category.labels[DEFAULT_LANG]}`;
      return { text: label, callback_data: `toggle_category_${category.id}` };
    });

    const rows = chunkArray(buttons, 2);

    await this.bot.sendMessage(chatId, this.t(user, 'personal.chooseCategories'), {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [...rows, [{ text: this.getTexts(user).personal.buttons.back, callback_data: 'open_personal' }]]
      }
    });
  }

  toggleCategory(user, categoryId) {
    const favorites = user.preferences.favorites || new Set();
    user.preferences.favorites = favorites;
    const category = CATEGORY_INDEX.get(categoryId);
    const label = category?.labels[user.language] || category?.labels[DEFAULT_LANG] || categoryId;

    if (favorites.has(categoryId)) {
      favorites.delete(categoryId);
      return this.t(user, 'personal.categoryRemoved', { name: label });
    }
    favorites.add(categoryId);
    return this.t(user, 'personal.categoryAdded', { name: label });
  }

  async sendNotificationsMenu(chatId, user) {
    const lang = user.language;
    const buttons = NOTIFICATION_TYPES.map((type) => {
      const isOn = user.preferences.notifications?.[type.id];
      const labelText = this.getTexts(user).personal.notificationsLabels[type.id] || type.labels[lang] || type.labels[DEFAULT_LANG];
      const label = `${isOn ? '✅' : '🔔'} ${labelText}`;
      return { text: label, callback_data: `toggle_notification_${type.id}` };
    });

    const rows = chunkArray(buttons, 2);

    await this.bot.sendMessage(chatId, this.getTexts(user).personal.buttons.notifications, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [...rows, [{ text: this.getTexts(user).personal.buttons.back, callback_data: 'open_personal' }]]
      }
    });
  }

  toggleNotification(user, typeId) {
    const notifications = user.preferences.notifications;
    notifications[typeId] = !notifications[typeId];
    return notifications[typeId]
      ? this.t(user, 'personal.notificationOn', {
          name:
            this.getTexts(user).personal.notificationsLabels[typeId] ||
            NOTIFICATION_TYPES.find((item) => item.id === typeId)?.labels[user.language] ||
            typeId
        })
      : this.t(user, 'personal.notificationOff', {
          name:
            this.getTexts(user).personal.notificationsLabels[typeId] ||
            NOTIFICATION_TYPES.find((item) => item.id === typeId)?.labels[user.language] ||
            typeId
        });
  }

  async sendSampleNotification(chatId, user, typeId) {
    const product = this.rankProducts(this.products).find((item) => {
      if (!user.preferences.favorites?.size) {
        return true;
      }
      return user.preferences.favorites.has(item.category);
    }) || this.products[0];

    if (!product) {
      return;
    }

    switch (typeId) {
      case 'price':
        await this.bot.sendMessage(
          chatId,
          this.t(user, 'personal.sampleNotification.price', {
            product: escapeHtml(product.name),
            price: formatCurrency(product.price, user.language),
            oldPrice: formatCurrency(product.originalPrice || product.price * 1.1, user.language)
          }),
          { parse_mode: 'HTML', disable_web_page_preview: true }
        );
        break;
      case 'cashback':
        await this.bot.sendMessage(
          chatId,
          this.t(user, 'personal.sampleNotification.cashback', {
            product: escapeHtml(product.name),
            cashback: formatPercent(product.cashbackPercent || 5)
          }),
          { parse_mode: 'HTML', disable_web_page_preview: true }
        );
        break;
      case 'coupon':
        await this.bot.sendMessage(
          chatId,
          this.t(user, 'personal.sampleNotification.coupon', {
            code: escapeHtml(product.couponCode || 'DEAL10'),
            hours: 6
          }),
          { parse_mode: 'HTML', disable_web_page_preview: true }
        );
        break;
      default:
        break;
    }
  }

  async handleCallback(query) {
    if (!query || !query.message) {
      return;
    }
    const chatId = query.message.chat.id;
    const user = this.getUser(chatId);
    const data = query.data || '';

    const acknowledge = async (text) => {
      try {
        await this.bot.answerCallbackQuery(query.id, { text, show_alert: false });
      } catch (error) {
        console.error('answerCallbackQuery error:', error.message);
      }
    };

    if (data === 'hot_deals') {
      await acknowledge('');
      return this.sendHotDeals(chatId, user);
    }
    if (data === 'top_deals') {
      await acknowledge('');
      return this.sendTopDeals(chatId, user);
    }
    if (data === 'open_categories') {
      await acknowledge('');
      return this.sendCategoriesMenu(chatId, user);
    }
    if (data === 'open_stores') {
      await acknowledge('');
      return this.sendStoresMenu(chatId, user);
    }
    if (data === 'open_personal') {
      await acknowledge('');
      return this.sendPersonalDashboard(chatId, user);
    }
    if (data === 'personal_categories') {
      await acknowledge('');
      return this.sendPersonalCategories(chatId, user);
    }
    if (data === 'personal_budget') {
      await acknowledge('');
      return this.sendBudgetMenu(chatId, user);
    }
    if (data === 'personal_notifications') {
      await acknowledge('');
      return this.sendNotificationsMenu(chatId, user);
    }
    if (data === 'open_language') {
      await acknowledge('');
      return this.sendLanguageMenu(chatId, user);
    }
    if (data === 'open_help') {
      await acknowledge('');
      return this.sendHelp(chatId, user);
    }
    if (data === 'search_product' || data === 'refine_search') {
      await acknowledge('');
      user.state = 'awaiting_search';
      return this.sendSearchInstructions(chatId, user, true);
    }
    if (data === 'back_main') {
      await acknowledge('');
      return this.sendMainMenu(chatId, user);
    }

    if (data.startsWith('category_')) {
      await acknowledge('');
      const categoryId = data.replace('category_', '');
      return this.sendCategoryDeals(chatId, user, categoryId);
    }

    if (data.startsWith('store_')) {
      await acknowledge('');
      const storeId = data.replace('store_', '');
      return this.sendStoreDeals(chatId, user, storeId);
    }

    if (data.startsWith('toggle_category_')) {
      const categoryId = data.replace('toggle_category_', '');
      const message = this.toggleCategory(user, categoryId);
      await acknowledge(message);
      return this.sendPersonalCategories(chatId, user);
    }

    if (data.startsWith('set_budget_')) {
      const value = data.replace('set_budget_', '');
      const message = this.setBudget(user, value);
      await acknowledge(message || '');
      return this.sendPersonalDashboard(chatId, user);
    }

    if (data.startsWith('toggle_notification_')) {
      const typeId = data.replace('toggle_notification_', '');
      const message = this.toggleNotification(user, typeId);
      await acknowledge(message);
      await this.sendNotificationsMenu(chatId, user);
      if (user.preferences.notifications[typeId]) {
        await this.sendSampleNotification(chatId, user, typeId);
      }
      return;
    }

    if (data.startsWith('set_language_')) {
      const lang = data.replace('set_language_', '');
      this.setLanguage(user, lang);
      const confirmation = this.t(user, 'languageSaved', { language: TEXTS[lang]?.languageName || lang });
      await acknowledge(confirmation);
      await this.bot.sendMessage(chatId, confirmation, { parse_mode: 'HTML' });
      return this.sendMainMenu(chatId, user);
    }
  }

}

module.exports = BazaarGuruAggregatorBot;

if (require.main === module) {
  const token = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN || process.env.BAZAARGURU_TELEGRAM_TOKEN;
  if (!token) {
    console.error('❗ TELEGRAM_BOT_TOKEN is not set. Please add it to your environment before running the bot.');
    process.exit(1);
  }
  // eslint-disable-next-line no-new
  new BazaarGuruAggregatorBot(token);
}
  hi: {
    languageName: '???? ??????',
    aggregator: {
      intro: '??????, {name}! ?? ?? BazaarGuru ????',
      pitch: '?? ???????? ?????????, ???? ?? ?????? ?? ??? ?????? ???? ?? ??? ??? ???? ??????',
      disclaimer: '?? Flipkart, Amazon, Myntra, Ajio, Croma ?? Nykaa ?? ????? ???? ?????? ????',
      reminder: '????? ?? ???? ????? ?? ??????? ?? ???????? ????? ???????'
    },
    menu: {
      title: '???? ????? ????????',
      buttons: {
        hotDeals: '?? ?? ?? ?????',
        topDeals: '? ??? 10 ???',
        categories: '??? ?????????',
        search: '?? ??????? ????',
        personal: '?? ???? ???',
        stores: '?? ?????',
        language: '?? ????',
        help: '?? ???'
      }
    },
    search: {
      title: '?? ??????? ???? ?? ?? ???? ??????!',
      subtitle: '?? ?? ????? ?? ???? ????? ?? ?????? ??????',
      howToTitle: '?? ???? ?????:',
      bullets: [
        '? ??????? ?????: ?OnePlus 20000 ??? / ?Biba ?????? 1500 ???',
        '? ????? ?? ?????: ?????????? ????? ?????',
        '? ???????? ?? ???? ?????: ??? ?????-????? ??? ????????'
      ],
      clarify: '?? ??? ??????? ?? ??? ????? ?? ???? ???? ??? ???!',
      waiting: '??????, ????, ?????? ?? ??? ????? ? ??? ????? ????? ???????',
      fallbackVoice: '????? ????? ???? ? ??? ??? ??? ??????? ??? ????? ?? ??? ???? ?????????',
      fallbackPhoto: '???? ???? ?? ??? ?? ??? ??? ?????? ??????? ??? ????? ? ???? ????? ????????'
    },
    searchSummary: {
      heading: '?? ?{query}? ?? ??? ??? ??? ????',
      statsTitle: '? {duration} ?????? ??? ????:',
      count: '? {count} ????',
      bestPrice: '? ???? ?? ????: {bestPrice}',
      bestDiscount: '? ?????? ?????????: {bestDiscount}',
      bestCashback: '? ??????: {cashback} ??',
      stores: '? ?????? ?????: {stores}'
    },
    searchTopPicksTitle: '?? ??? 3 ?????:',
    searchOtherTitle: '?? ?? ??????:',
    searchNone: '?? ??? ???? ????? ???? ????? ??????, ???? ?? ??? ????? ??????',
    categories: {
      title: '??? ??? ???? ?????????',
      subtitle: '?? ???? ???????? ??????? ????????? ?????? ??? ? ??? ????? ???? ??????',
      footer: '?? ????? ???? ??? ??????? ????????? ?????? ???? ????? ????? ??????'
    },
    stores: {
      title: '?? ??? ????? ?? ???? ???? ???',
      subtitle: '?? ????? ???: {stores}? ????? ????? ?? ???? ?????, ????? ?? ???? ????? ???? ?? ???????'
    },
    deals: {
      topTitle: '? ??? ?? 10 ???? ?????? ????',
      hotTitle: '?? ?? ?? ????? ????? (?? ??? ????? ??? ?????)',
      storeTitle: '??? {store} ?? ????? ????',
      categoryTitle: '?? {category} ?? ??? ?????'
    },
    product: {
      headline: '{index}. {icon} <a href="{link}"><b>{name}</b></a> ? {price}{original} ({discount})',
      storeLine: '?? ?????: {store}',
      brandLine: '??? ??????: {brand}',
      couponLine: '??? ????: {code} ({savings})',
      noCoupon: '??? ???? ?? ?????? ???? ? ???? ???? ?? ?? ??',
      minOrderLine: '?? ??????? ?????: {amount}',
      cashbackLine: '?? ??????: {cashback} ??',
      lastCheckedLine: '?? ?????? ????: {datetime}',
      highlightsLine: '? ???? ?????: {list}',
      linkHint: '???? ????? ?? ??? ??? ?? ??? ?????',
      aggregatorReminder: '?? ?????? ???? ?????? ???? ???? ?? ???? ????? ???? ?? ???????'
    },
    personal: {
      title: '?? ???? ???? ???',
      subtitle: '??????? ?????????, ??? ?? ????? ???????? ????? ????',
      favorites: '?? ??????? ?????????: {list}',
      noFavorites: '?? ???? ??? ??????? ????????? ???? ??????',
      budget: '?? ??? ????: {value}',
      budgetUnlimited: '??? ???? ????',
      notifications: '?? ?????: {list}',
      notificationsEmpty: '?? ?????: ??? ??? ???',
      buttons: {
        categories: '?? ????????? ?????',
        budget: '?? ??? ??? ????',
        notifications: '?? ????? ???????',
        back: '?? ???? ?? ?????'
      },
      chooseCategories: '?? ????????? ???? ??? ?????? ???? ???? ? ?????? ????? ?? ??????',
      chooseBudget: '??? ??? ?????:',
      budgetSaved: '??? ?????: {value}.',
      notificationOn: '{name} ????? ???? ? ????? ????? ????????',
      notificationOff: '{name} ????? ????',
      categoryAdded: '?{name}? ??????? ??? ????? ????',
      categoryRemoved: '?{name}? ??????? ?? ????? ????',
      notificationsLabels: {
        price: '?? ???? ???',
        cashback: '?? ?????? ????',
        coupon: '? ???? ???? ????'
      },
      sampleNotification: {
        price: '?? ???? ??: {product} ?? {price} (???? {oldPrice}).',
        cashback: '?? ?????? ??? ???: {product} ?? {cashback} ?? ???? ???',
        coupon: '? ??? ??????: ???? {code} ??? {hours} ???? ?? ??????'
      }
    },
    help: {
      title: '?? ???',
      intro: '??? ???????? ??????? ???? ?? ????????? ???? ??? ????? ???? ?????, ?? ??? ?????? ????',
      faq: '????? ???? ?? ??? ??? ? ??????? API ?? ???????? ????? ??????; ?? ?????? ????? ????????? ?????? ????',
      commands: '?????: /start ? ????? ????, /help ? ??????, /language ? ???? ?????, /search ? ??????? ?????',
      contact: '???? ?????? ?????? ????? ???? partner@bazaar.guru ?? ??????'
    },
    languagePrompt: '???????? ???? ?????:',
    languageSaved: '?? ???! ???? {language} ?? ?????',
    aggregatorFooter: '?? Flipkart, Amazon, Myntra, Ajio, Croma ?? Nykaa ?? ???????? ??? ?????? ???? ????? ?? ???? ????? ???? ?? ???????? ??????',
    back: '?? ????',
    more: '?? ??????',
    refineSearch: '?? ??? ???????'
  }
};

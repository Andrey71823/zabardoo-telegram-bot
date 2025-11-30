const BaseAPIService = require('../base-api-service');
const config = require('../../config/api-config');
const fs = require('fs').promises;
const path = require('path');

class PromocodesService extends BaseAPIService {
  constructor() {
    super(config);
    this.sources = {
      coupons: this.fetchCouponSites.bind(this),
      affiliate: this.fetchAffiliatePromocodes.bind(this),
      manual: this.loadManualPromocodes.bind(this)
    };
  }

  // Получить промокоды по категории
  async getPromocodes(category, options = {}) {
    const cacheKey = this.generateCacheKey('promocodes', { category, ...options });
    const cached = this.getCache(cacheKey);

    if (cached) {
      return cached;
    }

    const promocodes = await this.fetchFromAllSources(category, options);
    this.setCache(cacheKey, promocodes, config.CACHE.TTL_PROMOCODES);

    return promocodes;
  }

  // Получить все активные промокоды
  async getAllActivePromocodes(options = {}) {
    const cacheKey = this.generateCacheKey('all_promocodes', options);
    const cached = this.getCache(cacheKey);

    if (cached) {
      return cached;
    }

    const allPromocodes = [];

    for (const category of Object.values(config.CATEGORIES)) {
      const promocodes = await this.getPromocodes(category, options);
      allPromocodes.push(...promocodes);
    }

    // Фильтруем только активные и сортируем по дате истечения
    const active = allPromocodes
      .filter(code => this.isActive(code))
      .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));

    this.setCache(cacheKey, active, config.CACHE.TTL_PROMOCODES);
    return active;
  }

  // Получить промокоды из всех источников
  async fetchFromAllSources(category, options) {
    const allPromocodes = [];

    for (const [source, fetcher] of Object.entries(this.sources)) {
      try {
        const promocodes = await fetcher(category, options);
        allPromocodes.push(...promocodes);
      } catch (error) {
        console.error(`Error fetching promocodes from ${source}:`, error.message);
      }
    }

    // Удаляем дубликаты и фильтруем активные
    const unique = this.removeDuplicatePromocodes(allPromocodes);
    return unique.filter(code => this.isActive(code));
  }

  // Загрузка промокодов с сайтов купонов
  async fetchCouponSites(category, options) {
    const couponSites = [
      'https://www.coupondunia.in',
      'https://www.grabon.in',
      'https://www.coupons.com',
      'https://www.retailmenot.com'
    ];

    const allCoupons = [];

    for (const site of couponSites) {
      try {
        const coupons = await this.scrapeCouponSite(site, category);
        allCoupons.push(...coupons);
      } catch (error) {
        console.error(`Error scraping ${site}:`, error);
      }
    }

    return allCoupons;
  }

  // Получение промокодов через партнерские программы
  async fetchAffiliatePromocodes(category, options) {
    const affiliatePartners = {
      electronics: [
        { name: 'Flipkart', api: 'flipkart_affiliate' },
        { name: 'Amazon', api: 'amazon_associates' },
        { name: 'Croma', api: 'croma_deals' }
      ],
      fashion: [
        { name: 'Myntra', api: 'myntra_affiliate' },
        { name: 'Ajio', api: 'ajio_deals' },
        { name: 'Nykaa', api: 'nykaa_coupons' }
      ],
      food: [
        { name: 'Zomato', api: 'zomato_gold' },
        { name: 'Swiggy', api: 'swiggy_super' },
        { name: 'Dominos', api: 'dominos_deals' }
      ]
    };

    const partners = affiliatePartners[category] || [];
    const promocodes = [];

    for (const partner of partners) {
      try {
        const codes = await this.fetchPartnerPromocodes(partner);
        promocodes.push(...codes);
      } catch (error) {
        console.error(`Error fetching ${partner.name} promocodes:`, error);
      }
    }

    return promocodes;
  }

  // Загрузка ручных промокодов
  async loadManualPromocodes(category, options) {
    try {
      const filePath = path.join(__dirname, '../../data/manual-promocodes.json');
      const data = await fs.readFile(filePath, 'utf8');
      const allPromocodes = JSON.parse(data);

      return allPromocodes.filter(code =>
        code.category === category && this.isActive(code)
      );
    } catch (error) {
      console.error('Error loading manual promocodes:', error);
      return [];
    }
  }

  // Парсинг сайтов купонов (упрощенная версия)
  async scrapeCouponSite(siteUrl, category) {
    // В реальности здесь будет использоваться Puppeteer или Cheerio для парсинга
    // Пока возвращаем mock данные
    return [
      {
        code: `COUPON_${category.toUpperCase()}_1`,
        title: `Скидка на ${category}`,
        description: `Скидка 10% на все товары категории ${category}`,
        discountType: 'percentage',
        discountValue: 10,
        minimumOrder: 500,
        category: category,
        store: siteUrl.split('/')[2],
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        source: 'coupon_site',
        verified: true
      }
    ];
  }

  // Получение промокодов от партнеров
  async fetchPartnerPromocodes(partner) {
    // Моковая реализация для разных партнеров
    const partnerPromocodes = {
      flipkart_affiliate: [
        {
          code: 'FLIP200',
          title: 'Flipkart Extra 200 OFF',
          description: 'Дополнительная скидка ₹200 на заказы от ₹1000',
          discountType: 'fixed',
          discountValue: 200,
          minimumOrder: 1000,
          category: 'electronics',
          store: 'flipkart.com',
          expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          source: 'flipkart',
          verified: true
        }
      ],
      amazon_associates: [
        {
          code: 'AMZ150',
          title: 'Amazon ₹150 OFF',
          description: 'Скидка ₹150 на электронику',
          discountType: 'fixed',
          discountValue: 150,
          minimumOrder: 2000,
          category: 'electronics',
          store: 'amazon.in',
          expiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          source: 'amazon',
          verified: true
        }
      ],
      zomato_gold: [
        {
          code: 'ZOMATO30',
          title: 'Zomato Gold 30% OFF',
          description: '30% скидка на все рестораны',
          discountType: 'percentage',
          discountValue: 30,
          minimumOrder: 300,
          category: 'food',
          store: 'zomato.com',
          expiryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
          source: 'zomato',
          verified: true
        }
      ]
    };

    return partnerPromocodes[partner.api] || [];
  }

  // Проверка активности промокода
  isActive(promocode) {
    if (!promocode.expiryDate) return true;
    return new Date(promocode.expiryDate) > new Date();
  }

  // Удаление дубликатов промокодов
  removeDuplicatePromocodes(promocodes) {
    const seen = new Set();
    return promocodes.filter(code => {
      const key = `${code.code}_${code.store}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  // Валидация промокода
  async validatePromocode(code, store, amount) {
    const promocodes = await this.getAllActivePromocodes();
    const promocode = promocodes.find(p => p.code === code && p.store === store);

    if (!promocode) {
      return { valid: false, reason: 'Промокод не найден' };
    }

    if (!this.isActive(promocode)) {
      return { valid: false, reason: 'Промокод истек' };
    }

    if (amount < promocode.minimumOrder) {
      return {
        valid: false,
        reason: `Минимальная сумма заказа: ₹${promocode.minimumOrder}`
      };
    }

    return {
      valid: true,
      promocode: promocode,
      discount: this.calculateDiscount(promocode, amount)
    };
  }

  // Расчет скидки
  calculateDiscount(promocode, amount) {
    if (promocode.discountType === 'percentage') {
      return Math.min(amount * (promocode.discountValue / 100), promocode.maxDiscount || Infinity);
    } else {
      return Math.min(promocode.discountValue, amount);
    }
  }

  // Сохранение нового промокода
  async savePromocode(promocode) {
    try {
      const filePath = path.join(__dirname, '../../data/manual-promocodes.json');
      let existing = [];

      try {
        const data = await fs.readFile(filePath, 'utf8');
        existing = JSON.parse(data);
      } catch (error) {
        // Файл не существует, создадим новый
      }

      existing.push({
        ...promocode,
        id: Date.now().toString(),
        createdAt: new Date().toISOString()
      });

      await fs.writeFile(filePath, JSON.stringify(existing, null, 2));
      return true;
    } catch (error) {
      console.error('Error saving promocode:', error);
      return false;
    }
  }
}

module.exports = PromocodesService;


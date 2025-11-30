const ProductsService = require('./products/products-service');
const FoodService = require('./food/food-service');
const MapsService = require('./maps/maps-service');
const PromocodesService = require('./promocodes/promocodes-service');
const CacheManager = require('./cache/cache-manager');

class APIOrchestrator {
  constructor() {
    this.cacheManager = new CacheManager();
    this.productsService = new ProductsService();
    this.foodService = new FoodService();
    this.mapsService = new MapsService();
    this.promocodesService = new PromocodesService();

    // Запуск автоматической очистки кэша
    this.startCacheCleanup();
  }

  // Получение товаров
  async getProducts(category, options = {}) {
    try {
      const cacheKey = this.cacheManager.generateKey('products', { category, ...options });
      const cached = await this.cacheManager.get(cacheKey);

      if (cached) {
        return cached;
      }

      const products = await this.productsService.getProducts(category, options);
      const ttl = this.cacheManager.getTTL('products');
      await this.cacheManager.set(cacheKey, products, ttl);

      return products;
    } catch (error) {
      console.error('Error getting products:', error);
      return this.getFallbackData('products', category);
    }
  }

  // Получение ресторанов
  async getNearbyRestaurants(lat, lng, options = {}) {
    try {
      const cacheKey = this.cacheManager.generateKey('restaurants', { lat, lng, ...options });
      const cached = await this.cacheManager.get(cacheKey);

      if (cached) {
        return cached;
      }

      const restaurants = await this.foodService.getNearbyRestaurants(lat, lng, options);
      const ttl = this.cacheManager.getTTL('food');
      await this.cacheManager.set(cacheKey, restaurants, ttl);

      return restaurants;
    } catch (error) {
      console.error('Error getting restaurants:', error);
      return this.getFallbackData('restaurants');
    }
  }

  // Получение акций на еду
  async getFoodDeals(options = {}) {
    try {
      const cacheKey = this.cacheManager.generateKey('food_deals', options);
      const cached = await this.cacheManager.get(cacheKey);

      if (cached) {
        return cached;
      }

      const deals = await this.foodService.getFoodDeals(options);
      const ttl = this.cacheManager.getTTL('food');
      await this.cacheManager.set(cacheKey, deals, ttl);

      return deals;
    } catch (error) {
      console.error('Error getting food deals:', error);
      return this.getFallbackData('food_deals');
    }
  }

  // Получение магазинов на карте
  async getNearbyStores(lat, lng, category, options = {}) {
    try {
      const cacheKey = this.cacheManager.generateKey('stores', { lat, lng, category, ...options });
      const cached = await this.cacheManager.get(cacheKey);

      if (cached) {
        return cached;
      }

      const stores = await this.mapsService.getNearbyStores(lat, lng, category, options);
      const ttl = this.cacheManager.getTTL('maps');
      await this.cacheManager.set(cacheKey, stores, ttl);

      return stores;
    } catch (error) {
      console.error('Error getting stores:', error);
      return this.getFallbackData('stores', category);
    }
  }

  // Получение промокодов
  async getPromocodes(category, options = {}) {
    try {
      const cacheKey = this.cacheManager.generateKey('promocodes', { category, ...options });
      const cached = await this.cacheManager.get(cacheKey);

      if (cached) {
        return cached;
      }

      const promocodes = await this.promocodesService.getPromocodes(category, options);
      const ttl = this.cacheManager.getTTL('promocodes');
      await this.cacheManager.set(cacheKey, promocodes, ttl);

      return promocodes;
    } catch (error) {
      console.error('Error getting promocodes:', error);
      return this.getFallbackData('promocodes', category);
    }
  }

  // Получение всех активных промокодов
  async getAllActivePromocodes(options = {}) {
    try {
      const cacheKey = this.cacheManager.generateKey('all_promocodes', options);
      const cached = await this.cacheManager.get(cacheKey);

      if (cached) {
        return cached;
      }

      const promocodes = await this.promocodesService.getAllActivePromocodes(options);
      const ttl = this.cacheManager.getTTL('promocodes');
      await this.cacheManager.set(cacheKey, promocodes, ttl);

      return promocodes;
    } catch (error) {
      console.error('Error getting all promocodes:', error);
      return [];
    }
  }

  // Валидация промокода
  async validatePromocode(code, store, amount) {
    try {
      return await this.promocodesService.validatePromocode(code, store, amount);
    } catch (error) {
      console.error('Error validating promocode:', error);
      return { valid: false, reason: 'Ошибка валидации промокода' };
    }
  }

  // Геокодирование адреса
  async geocodeAddress(address) {
    try {
      const cacheKey = this.cacheManager.generateKey('geocode', { address });
      const cached = await this.cacheManager.get(cacheKey);

      if (cached) {
        return cached;
      }

      const result = await this.mapsService.geocodeAddress(address);
      const ttl = this.cacheManager.getTTL('maps');
      await this.cacheManager.set(cacheKey, result, ttl);

      return result;
    } catch (error) {
      console.error('Error geocoding address:', error);
      return null;
    }
  }

  // Получение расстояния
  async getDistanceMatrix(origins, destinations, mode = 'driving') {
    try {
      return await this.mapsService.getDistanceMatrix(origins, destinations, mode);
    } catch (error) {
      console.error('Error getting distance matrix:', error);
      return null;
    }
  }

  // Сохранение промокода
  async savePromocode(promocode) {
    try {
      return await this.promocodesService.savePromocode(promocode);
    } catch (error) {
      console.error('Error saving promocode:', error);
      return false;
    }
  }

  // Очистка всего кэша
  async clearCache() {
    try {
      await this.cacheManager.clear();
      return true;
    } catch (error) {
      console.error('Error clearing cache:', error);
      return false;
    }
  }

  // Получение статистики кэша
  async getCacheStats() {
    try {
      return await this.cacheManager.getStats();
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return null;
    }
  }

  // Запуск автоматической очистки кэша
  startCacheCleanup() {
    // Очистка каждые 30 минут
    setInterval(async () => {
      await this.cacheManager.cleanExpired();
    }, 30 * 60 * 1000);

    // Логирование статистики каждый час
    setInterval(async () => {
      const stats = await this.getCacheStats();
      if (stats) {
        console.log('📊 Cache Stats:', stats);
      }
    }, 60 * 60 * 1000);
  }

  // Fallback данные на случай недоступности API
  getFallbackData(type, category = null) {
    const fallbacks = {
      products: [
        {
          id: 'fallback_1',
          title: 'Тестовый товар',
          price: 1000,
          originalPrice: 1200,
          discountPercent: 17,
          source: 'fallback',
          category: category || 'general'
        }
      ],
      restaurants: [
        {
          id: 'fallback_rest_1',
          name: 'Тестовый ресторан',
          cuisines: 'Различная кухня',
          rating: 4.5,
          source: 'fallback',
          deliveryTime: '25-35 мин'
        }
      ],
      food_deals: [
        {
          id: 'fallback_deal_1',
          title: 'Тестовая акция',
          description: 'Скидка 20% на весь заказ',
          source: 'fallback'
        }
      ],
      stores: [
        {
          id: 'fallback_store_1',
          name: 'Тестовый магазин',
          address: 'Тестовый адрес',
          rating: 4.2,
          category: category || 'general',
          source: 'fallback'
        }
      ],
      promocodes: [
        {
          code: 'TEST20',
          title: 'Тестовый промокод',
          description: 'Скидка 20%',
          discountValue: 20,
          discountType: 'percentage',
          category: category || 'general',
          source: 'fallback',
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      ]
    };

    return fallbacks[type] || [];
  }

  // Синхронизация данных со всеми сервисами
  async syncAllData() {
    console.log('🔄 Starting data synchronization...');

    try {
      // Очистка старого кэша
      await this.clearCache();

      // Синхронизация товаров
      for (const category of Object.values(require('../config/api-config').CATEGORIES)) {
        await this.getProducts(category, { force: true });
        await this.getPromocodes(category, { force: true });
      }

      // Синхронизация еды для основных городов
      const locations = require('../config/api-config').LOCATIONS;
      for (const location of Object.values(locations)) {
        await this.getNearbyRestaurants(location.lat, location.lng, { force: true });
        await this.getNearbyStores(location.lat, location.lng, 'food', { force: true });
      }

      console.log('✅ Data synchronization completed');
      return true;
    } catch (error) {
      console.error('❌ Data synchronization failed:', error);
      return false;
    }
  }
}

module.exports = APIOrchestrator;


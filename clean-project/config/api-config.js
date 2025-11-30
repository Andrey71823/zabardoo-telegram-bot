// Конфигурация всех API интеграций
require('dotenv').config();

module.exports = {
  // Токены и ключи API
  API_KEYS: {
    // Google Maps Platform API
    GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY || 'your_google_maps_key',

    // Zomato API
    ZOMATO_API_KEY: process.env.ZOMATO_API_KEY || 'your_zomato_key',

    // Swiggy API (через их партнерскую программу)
    SWIGGY_API_KEY: process.env.SWIGGY_API_KEY || 'your_swiggy_key',

    // Amazon Product Advertising API
    AMAZON_ACCESS_KEY: process.env.AMAZON_ACCESS_KEY || 'your_amazon_key',
    AMAZON_SECRET_KEY: process.env.AMAZON_SECRET_KEY || 'your_amazon_secret',
    AMAZON_ASSOCIATE_TAG: process.env.AMAZON_ASSOCIATE_TAG || 'bazaarguru-21',

    // Flipkart Affiliate API
    FLIPKART_AFFILIATE_ID: process.env.FLIPKART_AFFILIATE_ID || 'your_flipkart_id',

    // Myntra API
    MYNTRA_API_KEY: process.env.MYNTRA_API_KEY || 'your_myntra_key',
  },

  // Базовые URL API
  API_ENDPOINTS: {
    GOOGLE_MAPS: 'https://maps.googleapis.com/maps/api',
    ZOMATO: 'https://developers.zomato.com/api/v2.1',
    SWIGGY: 'https://www.swiggy.com/dapi',
    AMAZON: 'https://webservices.amazon.in',
    FLIPKART: 'https://affiliate-api.flipkart.net/affiliate',
    MYNTRA: 'https://developer.myntra.com/v1',
  },

  // Настройки кэширования
  CACHE: {
    TTL_PRODUCTS: 30 * 60 * 1000, // 30 минут
    TTL_FOOD: 15 * 60 * 1000,     // 15 минут
    TTL_PROMOCODES: 60 * 60 * 1000, // 1 час
    TTL_MAPS: 24 * 60 * 60 * 1000, // 24 часа
  },

  // Локации для поиска (основные города Индии)
  LOCATIONS: {
    DELHI: { lat: 28.6139, lng: 77.2090 },
    MUMBAI: { lat: 19.0760, lng: 72.8777 },
    BANGALORE: { lat: 12.9716, lng: 77.5946 },
    CHENNAI: { lat: 13.0827, lng: 80.2707 },
    KOLKATA: { lat: 22.5726, lng: 88.3639 },
  },

  // Категории товаров
  CATEGORIES: {
    ELECTRONICS: 'electronics',
    FASHION: 'fashion',
    FOOD: 'food',
    ACCESSORIES: 'accessories',
    SHOES: 'shoes',
  }
};


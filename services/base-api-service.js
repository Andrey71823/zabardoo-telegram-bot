const https = require('https');
const querystring = require('querystring');

class BaseAPIService {
  constructor(config) {
    this.config = config;
    this.cache = new Map();
  }

  // Базовый HTTP запрос
  async makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const requestOptions = {
        method: options.method || 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; BazaarGuru Bot)',
          ...options.headers
        }
      };

      const req = https.request(url, requestOptions, (res) => {
        let data = '';

        res.on('data', (chunk) => data += chunk);

        res.on('end', () => {
          try {
            if (res.statusCode === 200) {
              const result = JSON.parse(data);
              resolve(result);
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${data}`));
            }
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', reject);

      if (options.data) {
        req.write(JSON.stringify(options.data));
      }

      req.end();
    });
  }

  // Кэширование результатов
  setCache(key, data, ttl) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  getCache(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  // Очистка устаревшего кэша
  cleanExpiredCache() {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > cached.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // Форматирование цен для Индии
  formatPrice(price) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(price);
  }

  // Расчет скидки в процентах
  calculateDiscount(originalPrice, salePrice) {
    const discount = ((originalPrice - salePrice) / originalPrice) * 100;
    return Math.round(discount);
  }

  // Генерация уникального ID для кэша
  generateCacheKey(prefix, params) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    return `${prefix}_${sortedParams}`;
  }
}

module.exports = BaseAPIService;


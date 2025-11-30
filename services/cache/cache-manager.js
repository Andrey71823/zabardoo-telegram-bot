const fs = require('fs').promises;
const path = require('path');
const config = require('../../config/api-config');

class CacheManager {
  constructor() {
    this.cacheDir = path.join(__dirname, '../../data/cache');
    this.ensureCacheDir();
  }

  // Создание директории кэша
  async ensureCacheDir() {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
    } catch (error) {
      console.error('Error creating cache directory:', error);
    }
  }

  // Сохранение данных в кэш
  async set(key, data, ttl = 3600000) { // 1 час по умолчанию
    try {
      const cacheData = {
        data: data,
        timestamp: Date.now(),
        ttl: ttl,
        expiresAt: Date.now() + ttl
      };

      const filePath = path.join(this.cacheDir, `${key}.json`);
      await fs.writeFile(filePath, JSON.stringify(cacheData, null, 2));

      console.log(`✅ Cached data for key: ${key}`);
    } catch (error) {
      console.error(`Error caching data for key ${key}:`, error);
    }
  }

  // Получение данных из кэша
  async get(key) {
    try {
      const filePath = path.join(this.cacheDir, `${key}.json`);
      const cacheData = JSON.parse(await fs.readFile(filePath, 'utf8'));

      // Проверка истечения срока действия
      if (Date.now() > cacheData.expiresAt) {
        await this.delete(key);
        return null;
      }

      console.log(`📋 Retrieved cached data for key: ${key}`);
      return cacheData.data;
    } catch (error) {
      // Файл не найден или поврежден
      return null;
    }
  }

  // Удаление из кэша
  async delete(key) {
    try {
      const filePath = path.join(this.cacheDir, `${key}.json`);
      await fs.unlink(filePath);
      console.log(`🗑️ Deleted cache for key: ${key}`);
    } catch (error) {
      // Файл уже удален
    }
  }

  // Очистка всего кэша
  async clear() {
    try {
      const files = await fs.readdir(this.cacheDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          await fs.unlink(path.join(this.cacheDir, file));
        }
      }
      console.log('🧹 Cache cleared');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  // Очистка истекшего кэша
  async cleanExpired() {
    try {
      const files = await fs.readdir(this.cacheDir);
      let cleaned = 0;

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.cacheDir, file);
          try {
            const cacheData = JSON.parse(await fs.readFile(filePath, 'utf8'));
            if (Date.now() > cacheData.expiresAt) {
              await fs.unlink(filePath);
              cleaned++;
            }
          } catch (error) {
            // Поврежденный файл, удаляем
            await fs.unlink(filePath);
            cleaned++;
          }
        }
      }

      if (cleaned > 0) {
        console.log(`🧽 Cleaned ${cleaned} expired cache entries`);
      }
    } catch (error) {
      console.error('Error cleaning expired cache:', error);
    }
  }

  // Получение статистики кэша
  async getStats() {
    try {
      const files = await fs.readdir(this.cacheDir);
      let totalSize = 0;
      let validEntries = 0;
      let expiredEntries = 0;

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.cacheDir, file);
          try {
            const stats = await fs.stat(filePath);
            totalSize += stats.size;

            const cacheData = JSON.parse(await fs.readFile(filePath, 'utf8'));
            if (Date.now() > cacheData.expiresAt) {
              expiredEntries++;
            } else {
              validEntries++;
            }
          } catch (error) {
            // Пропускаем поврежденные файлы
          }
        }
      }

      return {
        totalEntries: validEntries + expiredEntries,
        validEntries: validEntries,
        expiredEntries: expiredEntries,
        totalSize: totalSize,
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2)
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return null;
    }
  }

  // Генерация ключа для кэша
  generateKey(prefix, params) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    return `${prefix}_${sortedParams}`;
  }

  // Установка TTL для разных типов данных
  getTTL(type) {
    const ttls = {
      products: config.CACHE.TTL_PRODUCTS,
      food: config.CACHE.TTL_FOOD,
      promocodes: config.CACHE.TTL_PROMOCODES,
      maps: config.CACHE.TTL_MAPS,
      default: 3600000 // 1 час
    };

    return ttls[type] || ttls.default;
  }
}

module.exports = CacheManager;


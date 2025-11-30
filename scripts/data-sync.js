#!/usr/bin/env node

// Скрипт для автоматической синхронизации данных
require('dotenv').config();
const APIOrchestrator = require('../services/api-orchestrator');
const config = require('../config/api-config');

class DataSyncManager {
  constructor() {
    this.orchestrator = new APIOrchestrator();
    this.isRunning = false;
    this.syncInterval = 30 * 60 * 1000; // 30 минут
  }

  // Запуск синхронизации
  async start() {
    console.log('🚀 Starting Data Synchronization Service...');
    console.log(`📊 Sync interval: ${this.syncInterval / (60 * 1000)} minutes`);

    this.isRunning = true;

    // Немедленная первая синхронизация
    await this.performFullSync();

    // Запуск периодической синхронизации
    setInterval(async () => {
      if (this.isRunning) {
        await this.performFullSync();
      }
    }, this.syncInterval);

    // Обработка сигналов завершения
    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());

    console.log('✅ Data sync service is running...');
  }

  // Остановка синхронизации
  stop() {
    console.log('🛑 Stopping Data Synchronization Service...');
    this.isRunning = false;
    process.exit(0);
  }

  // Полная синхронизация всех данных
  async performFullSync() {
    const startTime = Date.now();
    console.log(`\n🔄 Starting full data sync at ${new Date().toISOString()}`);

    try {
      const results = {
        products: await this.syncProducts(),
        food: await this.syncFood(),
        maps: await this.syncMaps(),
        promocodes: await this.syncPromocodes()
      };

      const duration = Date.now() - startTime;
      console.log(`✅ Full sync completed in ${duration}ms`);
      console.log('📊 Sync Results:', results);

      // Логирование статистики
      await this.logSyncStats(results, duration);

    } catch (error) {
      console.error('❌ Full sync failed:', error);
      await this.logSyncError(error);
    }
  }

  // Синхронизация товаров
  async syncProducts() {
    console.log('📱 Syncing products...');
    const categories = Object.values(config.CATEGORIES);
    let totalProducts = 0;

    for (const category of categories) {
      try {
        const products = await this.orchestrator.getProducts(category, { force: true });
        totalProducts += products.length;
        console.log(`  ✅ ${category}: ${products.length} products`);
      } catch (error) {
        console.error(`  ❌ ${category}: ${error.message}`);
      }
    }

    return { total: totalProducts, categories: categories.length };
  }

  // Синхронизация еды
  async syncFood() {
    console.log('🍕 Syncing food data...');
    const locations = Object.values(config.LOCATIONS);
    let totalRestaurants = 0;
    let totalDeals = 0;

    for (const location of locations) {
      try {
        // Рестораны
        const restaurants = await this.orchestrator.getNearbyRestaurants(
          location.lat,
          location.lng,
          { force: true }
        );
        totalRestaurants += restaurants.length;

        // Акции на еду
        const deals = await this.orchestrator.getFoodDeals({ force: true });
        totalDeals += deals.length;

      } catch (error) {
        console.error(`  ❌ Location sync error: ${error.message}`);
      }
    }

    console.log(`  ✅ Restaurants: ${totalRestaurants}`);
    console.log(`  ✅ Food deals: ${totalDeals}`);

    return { restaurants: totalRestaurants, deals: totalDeals };
  }

  // Синхронизация карт
  async syncMaps() {
    console.log('🗺️ Syncing maps data...');
    const categories = Object.values(config.CATEGORIES);
    const locations = Object.values(config.LOCATIONS);
    let totalStores = 0;

    for (const location of locations) {
      for (const category of categories) {
        try {
          const stores = await this.orchestrator.getNearbyStores(
            location.lat,
            location.lng,
            category,
            { force: true }
          );
          totalStores += stores.length;
        } catch (error) {
          console.error(`  ❌ ${category} stores sync error: ${error.message}`);
        }
      }
    }

    console.log(`  ✅ Stores: ${totalStores}`);
    return { stores: totalStores };
  }

  // Синхронизация промокодов
  async syncPromocodes() {
    console.log('🎁 Syncing promocodes...');
    const categories = Object.values(config.CATEGORIES);
    let totalPromocodes = 0;

    for (const category of categories) {
      try {
        const promocodes = await this.orchestrator.getPromocodes(category, { force: true });
        totalPromocodes += promocodes.length;
        console.log(`  ✅ ${category}: ${promocodes.length} promocodes`);
      } catch (error) {
        console.error(`  ❌ ${category} promocodes: ${error.message}`);
      }
    }

    // Общие активные промокоды
    try {
      const allPromocodes = await this.orchestrator.getAllActivePromocodes({ force: true });
      console.log(`  ✅ Total active: ${allPromocodes.length} promocodes`);
    } catch (error) {
      console.error(`  ❌ All promocodes: ${error.message}`);
    }

    return { total: totalPromocodes, categories: categories.length };
  }

  // Логирование статистики синхронизации
  async logSyncStats(results, duration) {
    const stats = {
      timestamp: new Date().toISOString(),
      duration: duration,
      results: results,
      cacheStats: await this.orchestrator.getCacheStats()
    };

    console.log('📈 Sync Statistics:');
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Products: ${results.products.total}`);
    console.log(`   Restaurants: ${results.food.restaurants}`);
    console.log(`   Food Deals: ${results.food.deals}`);
    console.log(`   Stores: ${results.maps.stores}`);
    console.log(`   Promocodes: ${results.promocodes.total}`);

    if (stats.cacheStats) {
      console.log(`   Cache: ${stats.cacheStats.validEntries} valid, ${stats.cacheStats.expiredEntries} expired`);
    }

    // Сохранение логов в файл (опционально)
    // await this.saveLogToFile(stats);
  }

  // Логирование ошибок
  async logSyncError(error) {
    const errorLog = {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack
    };

    console.error('🚨 Sync Error:', errorLog);
  }

  // Ручная синхронизация конкретной категории
  async syncCategory(category, type = 'products') {
    console.log(`🔄 Manual sync: ${type} -> ${category}`);

    try {
      let result;

      switch (type) {
        case 'products':
          result = await this.orchestrator.getProducts(category, { force: true });
          break;
        case 'promocodes':
          result = await this.orchestrator.getPromocodes(category, { force: true });
          break;
        case 'food':
          const location = config.LOCATIONS.DELHI; // По умолчанию Delhi
          result = await this.orchestrator.getNearbyRestaurants(location.lat, location.lng, { force: true });
          break;
        default:
          throw new Error(`Unknown sync type: ${type}`);
      }

      console.log(`✅ Manual sync completed: ${result.length} items`);
      return result;

    } catch (error) {
      console.error(`❌ Manual sync failed: ${error.message}`);
      throw error;
    }
  }

  // Очистка всего кэша
  async clearAllCache() {
    console.log('🧹 Clearing all cache...');
    const result = await this.orchestrator.clearCache();
    console.log(result ? '✅ Cache cleared' : '❌ Cache clear failed');
    return result;
  }
}

// CLI интерфейс
async function main() {
  const syncManager = new DataSyncManager();
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // Запуск автоматической синхронизации
    await syncManager.start();
  } else {
    const command = args[0];

    switch (command) {
      case 'start':
        await syncManager.start();
        break;

      case 'sync':
        if (args.length < 3) {
          console.error('Usage: node data-sync.js sync <type> <category>');
          console.error('Types: products, promocodes, food');
          console.error('Categories: electronics, fashion, food, accessories, shoes');
          process.exit(1);
        }
        const type = args[1];
        const category = args[2];
        await syncManager.syncCategory(category, type);
        break;

      case 'clear':
        await syncManager.clearAllCache();
        break;

      case 'once':
        await syncManager.performFullSync();
        break;

      default:
        console.log('Usage:');
        console.log('  node data-sync.js                    # Start auto sync');
        console.log('  node data-sync.js start             # Start auto sync');
        console.log('  node data-sync.js once              # Run sync once');
        console.log('  node data-sync.js sync <type> <cat> # Manual category sync');
        console.log('  node data-sync.js clear             # Clear all cache');
        process.exit(1);
    }
  }
}

// Запуск если файл вызван напрямую
if (require.main === module) {
  main().catch(console.error);
}

module.exports = DataSyncManager;


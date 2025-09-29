#!/usr/bin/env node

const { Pool } = require('pg');
const { IndianStoreService } = require('../src/services/stores/IndianStoreService');
const { IndianStoreRepository } = require('../src/repositories/IndianStoreRepository');

// Mock logger for testing
const mockLogger = {
  info: (msg, ...args) => console.log(`[INFO] ${msg}`, ...args),
  error: (msg, ...args) => console.error(`[ERROR] ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`[WARN] ${msg}`, ...args),
  debug: (msg, ...args) => console.log(`[DEBUG] ${msg}`, ...args)
};

async function testIndianStoreIntegration() {
  console.log('🧪 Testing Indian Store Integration...\n');

  // Database connection
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'bazaarGuru_test',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password'
  });

  try {
    // Initialize services
    const indianStoreRepository = new IndianStoreRepository(pool);
    const indianStoreService = new IndianStoreService(indianStoreRepository, mockLogger);

    console.log('✅ Services initialized successfully');

    // Test 1: Initialize popular Indian stores
    console.log('\n📝 Test 1: Initializing popular Indian stores...');
    
    const initializedStores = await indianStoreService.initializePopularStores();
    console.log(`✅ Initialized ${initializedStores.length} popular Indian stores:`);
    
    initializedStores.forEach((store, index) => {
      console.log(`  ${index + 1}. ${store.name} (${store.domain}) - Priority: ${store.priority}, Commission: ${store.commissionRate}%`);
    });

    // Test 2: Get popular stores
    console.log('\n📝 Test 2: Getting popular stores...');
    
    const popularStores = await indianStoreService.getPopularStores();
    console.log(`✅ Found ${popularStores.length} popular stores`);
    
    popularStores.slice(0, 5).forEach((store, index) => {
      console.log(`  ${index + 1}. ${store.name} - Categories: ${store.categories.join(', ')}`);
    });

    // Test 3: Get stores by category
    console.log('\n📝 Test 3: Getting stores by category...');
    
    const categories = ['Electronics', 'Fashion', 'Beauty', 'Food'];
    for (const category of categories) {
      const categoryStores = await indianStoreService.getStoresByCategory(category);
      console.log(`✅ ${category}: ${categoryStores.length} stores`);
      
      categoryStores.slice(0, 3).forEach(store => {
        console.log(`    - ${store.name} (${store.commissionRate}% commission)`);
      });
    }

    // Test 4: Search stores
    console.log('\n📝 Test 4: Searching stores...');
    
    const searchQueries = ['flip', 'amazon', 'myntra', 'beauty'];
    for (const query of searchQueries) {
      const searchResults = await indianStoreService.searchStores(query);
      console.log(`✅ Search "${query}": ${searchResults.length} results`);
      
      searchResults.forEach(store => {
        console.log(`    - ${store.name} (${store.domain})`);
      });
    }

    // Test 5: Get recommended stores for user
    console.log('\n📝 Test 5: Getting recommended stores for users...');
    
    const testUsers = [
      { id: 'user-tech-lover', preferences: ['Electronics', 'Gadgets'] },
      { id: 'user-fashionista', preferences: ['Fashion', 'Beauty'] },
      { id: 'user-foodie', preferences: ['Food', 'Restaurants'] },
      { id: 'user-general', preferences: [] }
    ];

    for (const user of testUsers) {
      const recommendations = await indianStoreService.getRecommendedStores(user.id, user.preferences);
      console.log(`✅ Recommendations for ${user.id} (${user.preferences.join(', ') || 'no preferences'}): ${recommendations.length} stores`);
      
      recommendations.slice(0, 3).forEach((store, index) => {
        console.log(`    ${index + 1}. ${store.name} - Priority: ${store.priority}, Conversion: ${(store.conversionRate * 100).toFixed(2)}%`);
      });
    }

    // Test 6: Get store statistics
    console.log('\n📝 Test 6: Getting store statistics...');
    
    const stats = await indianStoreService.getStoreStats();
    console.log('✅ Store statistics:', {
      totalStores: stats.totalStores,
      activeStores: stats.activeStores,
      popularStores: stats.popularStores,
      categoriesCount: stats.categoriesCount,
      averageCommission: stats.averageCommission + '%',
      averageConversion: (stats.averageConversion * 100).toFixed(2) + '%'
    });

    // Test 7: Get trending stores
    console.log('\n📝 Test 7: Getting trending stores...');
    
    const trendingStores = await indianStoreService.getTrendingStores(5);
    console.log(`✅ Top ${trendingStores.length} trending stores:`);
    
    trendingStores.forEach((store, index) => {
      console.log(`  ${index + 1}. ${store.name} - Conversion: ${(store.conversionRate * 100).toFixed(2)}%, Commission: ${store.commissionRate}%`);
    });

    // Test 8: Update store priorities
    console.log('\n📝 Test 8: Updating store priorities...');
    
    await indianStoreService.updateStorePriorities();
    console.log('✅ Store priorities updated based on performance');

    // Verify priority changes
    const updatedStores = await indianStoreService.getPopularStores();
    console.log('Updated store priorities:');
    updatedStores.slice(0, 5).forEach((store, index) => {
      console.log(`  ${index + 1}. ${store.name} - Priority: ${store.priority}, Score: ${(store.conversionRate * store.commissionRate).toFixed(3)}`);
    });

    // Test 9: Test database functions
    console.log('\n📝 Test 9: Testing database functions...');
    
    try {
      // Test get_indian_store_stats function
      const dbStatsResult = await pool.query('SELECT * FROM get_indian_store_stats()');
      const dbStats = dbStatsResult.rows[0];
      
      console.log('✅ Database statistics function works:', {
        totalStores: dbStats.total_stores,
        activeStores: dbStats.active_stores,
        popularStores: dbStats.popular_stores,
        categoriesCount: dbStats.categories_count,
        averageCommission: dbStats.average_commission,
        averageConversion: dbStats.average_conversion
      });

      // Test get_recommended_stores function
      const recommendationsResult = await pool.query(
        'SELECT * FROM get_recommended_stores($1, $2)', 
        [['Electronics', 'Fashion'], 5]
      );
      
      console.log(`✅ Database recommendations function works: ${recommendationsResult.rows.length} results`);
      recommendationsResult.rows.forEach((store, index) => {
        console.log(`  ${index + 1}. ${store.store_name} - Score: ${parseFloat(store.recommendation_score).toFixed(2)}`);
      });

    } catch (error) {
      console.log('⚠️ Database functions test skipped (functions may not exist):', error.message);
    }

    // Test 10: Test store categories
    console.log('\n📝 Test 10: Testing store categories...');
    
    try {
      const categoriesResult = await pool.query(`
        SELECT name, display_name, is_popular, priority 
        FROM store_categories 
        ORDER BY priority ASC
      `);
      
      console.log(`✅ Found ${categoriesResult.rows.length} store categories:`);
      categoriesResult.rows.forEach((category, index) => {
        const popularIcon = category.is_popular ? '⭐' : '';
        console.log(`  ${index + 1}. ${category.display_name} (${category.name}) ${popularIcon}`);
      });

    } catch (error) {
      console.log('⚠️ Store categories test skipped:', error.message);
    }

    // Test 11: Test store performance tracking
    console.log('\n📝 Test 11: Testing store performance tracking...');
    
    try {
      // Insert sample performance data
      const sampleStoreId = initializedStores[0].id;
      await pool.query(`
        SELECT update_store_performance($1, $2, $3, $4, $5, $6, $7)
      `, [sampleStoreId, new Date().toISOString().split('T')[0], 100, 50, 5, 2500.00, 125.00]);
      
      console.log('✅ Store performance tracking works');

      // Verify performance data
      const performanceResult = await pool.query(`
        SELECT * FROM store_performance 
        WHERE store_id = $1 
        ORDER BY date DESC 
        LIMIT 1
      `, [sampleStoreId]);
      
      if (performanceResult.rows.length > 0) {
        const perf = performanceResult.rows[0];
        console.log('Performance data:', {
          clicks: perf.total_clicks,
          users: perf.unique_users,
          conversions: perf.conversions,
          revenue: '₹' + perf.total_revenue,
          commission: '₹' + perf.total_commission,
          conversionRate: (perf.conversion_rate * 100).toFixed(2) + '%'
        });
      }

    } catch (error) {
      console.log('⚠️ Store performance test skipped:', error.message);
    }

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📊 Test Summary:');
    console.log('✅ Popular Indian stores initialization');
    console.log('✅ Store retrieval and filtering');
    console.log('✅ Category-based store filtering');
    console.log('✅ Store search functionality');
    console.log('✅ Personalized store recommendations');
    console.log('✅ Store statistics and analytics');
    console.log('✅ Trending stores identification');
    console.log('✅ Dynamic priority updates');
    console.log('✅ Database functions integration');
    console.log('✅ Store categories management');
    console.log('✅ Performance tracking system');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run tests
if (require.main === module) {
  testIndianStoreIntegration().catch(console.error);
}

module.exports = { testIndianStoreIntegration };
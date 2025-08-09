#!/usr/bin/env node

const { Pool } = require('pg');
const { CouponSyncService } = require('../src/services/coupon/CouponSyncService');
const { CouponSyncRepository } = require('../src/repositories/CouponSyncRepository');
const { Logger } = require('../src/config/logger');

// Mock logger for testing
const mockLogger = {
  info: (msg, ...args) => console.log(`[INFO] ${msg}`, ...args),
  error: (msg, ...args) => console.error(`[ERROR] ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`[WARN] ${msg}`, ...args),
  debug: (msg, ...args) => console.log(`[DEBUG] ${msg}`, ...args)
};

async function testCouponSync() {
  console.log('🧪 Testing Coupon Sync Service...\n');

  // Database connection
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'zabardoo_test',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password'
  });

  try {
    // Initialize services
    const couponSyncRepository = new CouponSyncRepository(pool);
    const couponSyncService = new CouponSyncService(couponSyncRepository, mockLogger);

    console.log('✅ Services initialized successfully');

    // Test 1: Create sync configuration
    console.log('\n📝 Test 1: Creating sync configuration...');
    
    const testConfig = {
      name: 'Test API Sync',
      endpoint: 'https://jsonplaceholder.typicode.com/posts', // Mock API for testing
      syncInterval: 30,
      isEnabled: true,
      syncFilters: {
        categories: ['electronics', 'fashion'],
        onlyActive: true,
        minDiscount: 10
      }
    };

    const createdConfig = await couponSyncRepository.createSyncConfig(testConfig);
    console.log('✅ Sync configuration created:', {
      id: createdConfig.id,
      name: createdConfig.name,
      endpoint: createdConfig.endpoint
    });

    // Test 2: Create test coupon
    console.log('\n📝 Test 2: Creating test coupon...');
    
    const testCoupon = {
      externalId: 'test-coupon-001',
      title: '🔥 Test Electronics Deal - 50% OFF',
      description: 'Amazing discount on electronics items',
      code: 'TEST50',
      discount: '50% OFF',
      discountType: 'percentage',
      discountValue: 50,
      store: 'Test Electronics Store',
      storeId: 'store-001',
      category: 'Electronics',
      categoryId: 'cat-001',
      affiliateUrl: 'https://example.com/affiliate/test-coupon-001',
      originalUrl: 'https://example.com/test-coupon-001',
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      isActive: true,
      isVerified: true,
      popularity: 85,
      successRate: 92.5,
      tags: ['electronics', 'discount', 'popular'],
      conditions: 'Valid on orders above ₹1000',
      minOrderValue: 1000,
      maxDiscount: 5000,
      usageLimit: 1000,
      usedCount: 245,
      source: 'api',
      lastSyncAt: new Date()
    };

    const createdCoupon = await couponSyncRepository.createCoupon(testCoupon);
    console.log('✅ Test coupon created:', {
      id: createdCoupon.id,
      externalId: createdCoupon.externalId,
      title: createdCoupon.title,
      discount: createdCoupon.discount
    });

    // Test 3: Get coupon by external ID
    console.log('\n📝 Test 3: Retrieving coupon by external ID...');
    
    const retrievedCoupon = await couponSyncRepository.getCouponByExternalId('test-coupon-001');
    if (retrievedCoupon) {
      console.log('✅ Coupon retrieved successfully:', {
        id: retrievedCoupon.id,
        title: retrievedCoupon.title,
        isActive: retrievedCoupon.isActive
      });
    } else {
      console.log('❌ Failed to retrieve coupon');
    }

    // Test 4: Update coupon
    console.log('\n📝 Test 4: Updating coupon...');
    
    const updatedCoupon = await couponSyncRepository.updateCoupon(createdCoupon.id, {
      title: '🔥 UPDATED: Test Electronics Deal - 60% OFF',
      discount: '60% OFF',
      discountValue: 60,
      popularity: 95
    });

    if (updatedCoupon) {
      console.log('✅ Coupon updated successfully:', {
        id: updatedCoupon.id,
        title: updatedCoupon.title,
        discount: updatedCoupon.discount,
        popularity: updatedCoupon.popularity
      });
    } else {
      console.log('❌ Failed to update coupon');
    }

    // Test 5: Get active coupons
    console.log('\n📝 Test 5: Retrieving active coupons...');
    
    const activeCoupons = await couponSyncRepository.getActiveCoupons(10, 0);
    console.log(`✅ Retrieved ${activeCoupons.length} active coupons`);
    
    activeCoupons.forEach((coupon, index) => {
      console.log(`  ${index + 1}. ${coupon.title} (${coupon.discount})`);
    });

    // Test 6: Create sync status
    console.log('\n📝 Test 6: Creating sync status...');
    
    const syncStatus = await couponSyncRepository.createSyncStatus({
      couponId: createdCoupon.id,
      syncType: 'create',
      status: 'completed',
      attempts: 1,
      maxAttempts: 3,
      syncedAt: new Date()
    });

    console.log('✅ Sync status created:', {
      id: syncStatus.id,
      couponId: syncStatus.couponId,
      syncType: syncStatus.syncType,
      status: syncStatus.status
    });

    // Test 7: Get sync statistics
    console.log('\n📝 Test 7: Getting sync statistics...');
    
    const stats = await couponSyncService.getSyncStats();
    console.log('✅ Sync statistics:', stats);

    // Test 8: Test retry failed syncs
    console.log('\n📝 Test 8: Testing retry failed syncs...');
    
    // Create a failed sync status
    const failedSync = await couponSyncRepository.createSyncStatus({
      couponId: createdCoupon.id,
      syncType: 'update',
      status: 'failed',
      errorMessage: 'Test error for retry',
      attempts: 1,
      maxAttempts: 3,
      nextRetryAt: new Date(Date.now() - 1000) // Past time to trigger retry
    });

    console.log('✅ Failed sync status created for testing');

    // Try to retry failed syncs
    await couponSyncService.retryFailedSyncs();
    console.log('✅ Retry failed syncs completed');

    // Test 9: Get coupons by store and category
    console.log('\n📝 Test 9: Testing store and category filters...');
    
    const storeCoupons = await couponSyncRepository.getCouponsByStore('store-001', 10);
    console.log(`✅ Found ${storeCoupons.length} coupons for store-001`);

    const categoryCoupons = await couponSyncRepository.getCouponsByCategory('cat-001', 10);
    console.log(`✅ Found ${categoryCoupons.length} coupons for category cat-001`);

    // Test 10: Get active sync configurations
    console.log('\n📝 Test 10: Getting active sync configurations...');
    
    const activeConfigs = await couponSyncRepository.getActiveSyncConfigs();
    console.log(`✅ Found ${activeConfigs.length} active sync configurations`);
    
    activeConfigs.forEach((config, index) => {
      console.log(`  ${index + 1}. ${config.name} - ${config.endpoint}`);
    });

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📊 Test Summary:');
    console.log('✅ Sync configuration creation');
    console.log('✅ Coupon creation and retrieval');
    console.log('✅ Coupon updates');
    console.log('✅ Active coupons filtering');
    console.log('✅ Sync status management');
    console.log('✅ Failed sync retry mechanism');
    console.log('✅ Store and category filtering');
    console.log('✅ Configuration management');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run tests
if (require.main === module) {
  testCouponSync().catch(console.error);
}

module.exports = { testCouponSync };
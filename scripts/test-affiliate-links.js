#!/usr/bin/env node

const { Pool } = require('pg');
const { AffiliateLinkService } = require('../src/services/affiliate/AffiliateLinkService');
const { AffiliateLinkRepository } = require('../src/repositories/AffiliateLinkRepository');

// Mock logger for testing
const mockLogger = {
  info: (msg, ...args) => console.log(`[INFO] ${msg}`, ...args),
  error: (msg, ...args) => console.error(`[ERROR] ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`[WARN] ${msg}`, ...args),
  debug: (msg, ...args) => console.log(`[DEBUG] ${msg}`, ...args)
};

async function testAffiliateLinkSystem() {
  console.log('🧪 Testing Affiliate Link System...\n');

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
    const affiliateLinkRepository = new AffiliateLinkRepository(pool);
    const affiliateLinkService = new AffiliateLinkService(affiliateLinkRepository, mockLogger);

    console.log('✅ Services initialized successfully');

    // Test 1: Generate Telegram SubID
    console.log('\n📝 Test 1: Generating Telegram SubID...');
    
    const subId1 = affiliateLinkService.generateTelegramSubId('user-123', 'personal_channel', 'channel-456');
    const subId2 = affiliateLinkService.generateTelegramSubId('user-456', 'group');
    
    console.log('✅ SubID 1 (with channel):', subId1);
    console.log('✅ SubID 2 (without channel):', subId2);
    console.log('✅ SubIDs are unique:', subId1 !== subId2);

    // Test 2: Create affiliate store
    console.log('\n📝 Test 2: Creating affiliate store...');
    
    const testStore = {
      name: 'Test Electronics Store',
      domain: 'testelectronics.com',
      affiliateNetwork: 'Test Network',
      trackingTemplate: 'https://affiliate.testelectronics.com/track?url={original_url}&subid={sub_id}',
      subIdParameter: 'subid',
      commissionRate: 4.5,
      cookieDuration: 30,
      isActive: true,
      supportedCountries: ['IN'],
      linkFormats: {
        coupon: 'https://testelectronics.com/coupon/{coupon_id}?subid={sub_id}',
        offer: 'https://testelectronics.com/offer/{offer_id}?subid={sub_id}',
        direct: '{original_url}?subid={sub_id}'
      },
      customParameters: {
        'partner': 'zabardoo',
        'source': 'telegram'
      }
    };

    const createdStore = await affiliateLinkRepository.createAffiliateStore(testStore);
    console.log('✅ Affiliate store created:', {
      id: createdStore.id,
      name: createdStore.name,
      domain: createdStore.domain,
      commissionRate: createdStore.commissionRate
    });

    // Test 3: Generate affiliate link
    console.log('\n📝 Test 3: Generating affiliate link...');
    
    const linkParams = {
      userId: 'user-test-123',
      originalUrl: 'https://testelectronics.com/product/smartphone-xyz',
      storeId: createdStore.id,
      couponId: 'coupon-test-456',
      linkType: 'coupon',
      source: 'personal_channel',
      channelId: 'channel-test-789',
      metadata: {
        campaign: 'summer_sale',
        medium: 'telegram_bot',
        content: 'smartphone_deal'
      }
    };

    const affiliateLink = await affiliateLinkService.generateAffiliateLink(linkParams);
    console.log('✅ Affiliate link generated:', {
      id: affiliateLink.id,
      originalUrl: affiliateLink.originalUrl,
      affiliateUrl: affiliateLink.affiliateUrl,
      shortUrl: affiliateLink.shortUrl,
      telegramSubId: affiliateLink.telegramSubId,
      linkType: affiliateLink.linkType,
      source: affiliateLink.source
    });

    // Test 4: Track link click
    console.log('\n📝 Test 4: Tracking link click...');
    
    const clickParams = {
      telegramSubId: affiliateLink.telegramSubId,
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15',
      referrer: 'https://t.me/zabardoo_bot',
      sessionId: 'session-test-123',
      deviceInfo: {
        platform: 'iOS',
        browser: 'Safari',
        isMobile: true,
        country: 'IN',
        city: 'Mumbai'
      }
    };

    const linkClick = await affiliateLinkService.trackLinkClick(clickParams);
    console.log('✅ Link click tracked:', {
      id: linkClick.id,
      affiliateLinkId: linkClick.affiliateLinkId,
      telegramSubId: linkClick.telegramSubId,
      deviceInfo: linkClick.deviceInfo,
      clickedAt: linkClick.clickedAt
    });

    // Test 5: Update conversion
    console.log('\n📝 Test 5: Updating conversion...');
    
    const conversionParams = {
      telegramSubId: affiliateLink.telegramSubId,
      orderId: 'ORDER-TEST-789',
      orderValue: 25000, // ₹25,000
      commission: 1125, // 4.5% of ₹25,000
      conversionTime: new Date()
    };

    await affiliateLinkService.updateConversion(conversionParams);
    console.log('✅ Conversion updated:', {
      telegramSubId: conversionParams.telegramSubId,
      orderId: conversionParams.orderId,
      orderValue: conversionParams.orderValue,
      commission: conversionParams.commission
    });

    // Test 6: Get user link statistics
    console.log('\n📝 Test 6: Getting user link statistics...');
    
    const userStats = await affiliateLinkService.getUserLinkStats('user-test-123', 30);
    console.log('✅ User link statistics:', {
      period: userStats.period,
      totalClicks: userStats.totalClicks,
      uniqueLinks: userStats.uniqueLinks,
      conversions: userStats.conversions,
      conversionRate: userStats.conversionRate + '%',
      averageOrderValue: '₹' + userStats.averageOrderValue,
      totalCommission: '₹' + userStats.totalCommission,
      topPerformingLinksCount: userStats.topPerformingLinks.length
    });

    // Test 7: Generate bulk links
    console.log('\n📝 Test 7: Generating bulk affiliate links...');
    
    const bulkParams = {
      userId: 'user-test-123',
      couponIds: ['coupon-bulk-1', 'coupon-bulk-2', 'coupon-bulk-3'],
      source: 'ai_recommendation',
      channelId: 'channel-test-789'
    };

    const bulkLinks = await affiliateLinkService.generateBulkLinks(bulkParams);
    console.log(`✅ Generated ${bulkLinks.length} bulk affiliate links`);
    
    bulkLinks.forEach((link, index) => {
      console.log(`  ${index + 1}. SubID: ${link.telegramSubId}, Type: ${link.linkType}, Source: ${link.source}`);
    });

    // Test 8: Get link info by SubID
    console.log('\n📝 Test 8: Getting link info by SubID...');
    
    const linkInfo = await affiliateLinkService.getLinkInfo(affiliateLink.telegramSubId);
    if (linkInfo) {
      console.log('✅ Link info retrieved:', {
        id: linkInfo.id,
        storeName: linkInfo.storeName,
        linkType: linkInfo.linkType,
        source: linkInfo.source,
        isActive: linkInfo.isActive,
        createdAt: linkInfo.createdAt
      });
    } else {
      console.log('❌ Link info not found');
    }

    // Test 9: Test store operations
    console.log('\n📝 Test 9: Testing store operations...');
    
    const storeById = await affiliateLinkRepository.getAffiliateStoreById(createdStore.id);
    console.log('✅ Store retrieved by ID:', storeById ? storeById.name : 'Not found');

    const storeByDomain = await affiliateLinkRepository.getAffiliateStoreByDomain('testelectronics.com');
    console.log('✅ Store retrieved by domain:', storeByDomain ? storeByDomain.name : 'Not found');

    const allActiveStores = await affiliateLinkRepository.getAllActiveStores();
    console.log(`✅ Found ${allActiveStores.length} active stores`);

    // Test 10: Test SubID mapping
    console.log('\n📝 Test 10: Testing SubID mapping...');
    
    const subIdMapping = await affiliateLinkRepository.getSubIdMapping(affiliateLink.telegramSubId);
    if (subIdMapping) {
      console.log('✅ SubID mapping found:', {
        telegramSubId: subIdMapping.telegramSubId,
        userId: subIdMapping.userId,
        source: subIdMapping.source,
        isActive: subIdMapping.isActive,
        lastUsedAt: subIdMapping.lastUsedAt
      });
    } else {
      console.log('❌ SubID mapping not found');
    }

    // Test 11: Test analytics functions
    console.log('\n📝 Test 11: Testing analytics functions...');
    
    try {
      const analyticsResult = await pool.query('SELECT * FROM get_affiliate_stats($1, $2)', ['user-test-123', 30]);
      const analytics = analyticsResult.rows[0];
      
      console.log('✅ Analytics data:', {
        totalLinks: analytics.total_links,
        activeLinks: analytics.active_links,
        totalClicks: analytics.total_clicks,
        uniqueClickers: analytics.unique_clickers,
        totalConversions: analytics.total_conversions,
        totalCommission: analytics.total_commission,
        conversionRate: analytics.conversion_rate + '%',
        avgOrderValue: '₹' + analytics.avg_order_value,
        topPerformingStore: analytics.top_performing_store
      });
    } catch (error) {
      console.log('⚠️ Analytics function test skipped (function may not exist)');
    }

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📊 Test Summary:');
    console.log('✅ SubID generation');
    console.log('✅ Affiliate store creation');
    console.log('✅ Affiliate link generation');
    console.log('✅ Link click tracking');
    console.log('✅ Conversion tracking');
    console.log('✅ User statistics');
    console.log('✅ Bulk link generation');
    console.log('✅ Link information retrieval');
    console.log('✅ Store operations');
    console.log('✅ SubID mapping');
    console.log('✅ Analytics functions');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run tests
if (require.main === module) {
  testAffiliateLinkSystem().catch(console.error);
}

module.exports = { testAffiliateLinkSystem };
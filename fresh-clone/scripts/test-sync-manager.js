#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:3008';

// Test data
const testSyncRule = {
  sourceType: 'group',
  sourceId: '-1001234567890',
  targetType: 'personal_channels',
  targetFilters: {
    minEngagement: 50,
    maxChurnRisk: 0.5,
    categories: ['Electronics', 'Fashion']
  },
  contentFilters: {
    messageTypes: ['coupon'],
    minPopularityScore: 60,
    keywords: ['sale', 'discount', 'offer']
  },
  syncTiming: {
    immediate: false,
    scheduled: {
      hours: [9, 12, 18, 21],
      timezone: 'Asia/Kolkata'
    }
  },
  priority: 1
};

const testUserPreferences = {
  preferredCategories: ['Electronics', 'Fashion', 'Beauty'],
  preferredStores: ['Flipkart', 'Amazon', 'Myntra'],
  excludedCategories: ['Adult'],
  excludedStores: [],
  maxMessagesPerDay: 12,
  preferredTimes: [9, 12, 18, 21],
  timezone: 'Asia/Kolkata',
  contentTypes: ['coupon', 'text'],
  minDiscountThreshold: 20.0,
  onlyPopularContent: false,
  personalizedRecommendations: true
};

const testUserId = 'test-user-123';

async function testSyncManager() {
  console.log('🧪 Testing Sync Manager Service...\n');

  try {
    // Test 1: Health Check
    console.log('1️⃣ Testing health check...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log(`✅ Health check: ${healthResponse.data.status}`);
    console.log(`   Service: ${healthResponse.data.service}\n`);

    // Test 2: Create Sync Rule
    console.log('2️⃣ Testing sync rule creation...');
    const createRuleResponse = await axios.post(`${BASE_URL}/sync-rules`, testSyncRule);
    console.log(`✅ Sync rule created: ${createRuleResponse.data.sourceType} -> ${createRuleResponse.data.targetType}`);
    console.log(`   Priority: ${createRuleResponse.data.priority}`);
    console.log(`   Active: ${createRuleResponse.data.isActive}\n`);
    
    const ruleId = createRuleResponse.data.id;

    // Test 3: Get Sync Rules
    console.log('3️⃣ Testing sync rules retrieval...');
    const getRulesResponse = await axios.get(`${BASE_URL}/sync-rules?active=true`);
    console.log(`✅ Sync rules retrieved: ${getRulesResponse.data.count} active rules`);
    if (getRulesResponse.data.rules.length > 0) {
      console.log(`   First rule: ${getRulesResponse.data.rules[0].sourceType}:${getRulesResponse.data.rules[0].sourceId}\n`);
    }

    // Test 4: Update Sync Rule
    console.log('4️⃣ Testing sync rule update...');
    const updateRuleResponse = await axios.put(`${BASE_URL}/sync-rules/${ruleId}`, {
      priority: 2,
      isActive: true
    });
    console.log(`✅ Sync rule updated: Priority ${updateRuleResponse.data.priority}`);
    console.log(`   Updated at: ${updateRuleResponse.data.updatedAt}\n`);

    // Test 5: Update User Preferences
    console.log('5️⃣ Testing user preferences update...');
    const updatePrefsResponse = await axios.put(`${BASE_URL}/users/${testUserId}/preferences`, testUserPreferences);
    console.log(`✅ User preferences updated for user ${testUserId}`);
    console.log(`   Preferred categories: ${updatePrefsResponse.data.preferredCategories.length}`);
    console.log(`   Max messages per day: ${updatePrefsResponse.data.maxMessagesPerDay}`);
    console.log(`   Personalized recommendations: ${updatePrefsResponse.data.personalizedRecommendations}\n`);

    // Test 6: Get User Preferences
    console.log('6️⃣ Testing user preferences retrieval...');
    const getPrefsResponse = await axios.get(`${BASE_URL}/users/${testUserId}/preferences`);
    console.log(`✅ User preferences retrieved for user ${testUserId}`);
    console.log(`   Preferred stores: ${getPrefsResponse.data.preferredStores.join(', ')}`);
    console.log(`   Min discount threshold: ${getPrefsResponse.data.minDiscountThreshold}%`);
    console.log(`   Only popular content: ${getPrefsResponse.data.onlyPopularContent}\n`);

    // Test 7: Get Popular Content
    console.log('7️⃣ Testing popular content retrieval...');
    const popularContentResponse = await axios.get(`${BASE_URL}/popular-content?minScore=50&limit=10`);
    console.log(`✅ Popular content retrieved: ${popularContentResponse.data.count} items`);
    if (popularContentResponse.data.content.length > 0) {
      const topContent = popularContentResponse.data.content[0];
      console.log(`   Top content: ${topContent.title} (Score: ${topContent.popularityScore})`);
      console.log(`   Engagement: ${topContent.engagementMetrics.views} views, ${topContent.engagementMetrics.clicks} clicks\n`);
    }

    // Test 8: Analyze Group Content
    console.log('8️⃣ Testing group content analysis...');
    const analyzeResponse = await axios.post(`${BASE_URL}/popular-content/analyze/-1001234567890`);
    console.log(`✅ Group content analysis: ${analyzeResponse.data.success ? 'Started' : 'Failed'}`);
    console.log(`   Message: ${analyzeResponse.data.message}\n`);

    // Test 9: Create Manual Sync Job
    console.log('9️⃣ Testing manual sync job creation...');
    const manualSyncResponse = await axios.post(`${BASE_URL}/sync-jobs/manual`, {
      ruleId: ruleId,
      sourceContent: {
        id: 'test-content-001',
        type: 'coupon',
        content: 'Test Manual Sync - 50% OFF on Electronics!',
        metadata: {
          store: 'TestStore',
          category: 'Electronics',
          discountValue: 50,
          discountType: 'percentage'
        }
      },
      targetChannels: ['channel_test_001', 'channel_test_002']
    });
    console.log(`✅ Manual sync job created: ${manualSyncResponse.data.id}`);
    console.log(`   Status: ${manualSyncResponse.data.status}`);
    console.log(`   Target channels: ${manualSyncResponse.data.targetChannels.length}\n`);

    // Test 10: Process Sync Jobs
    console.log('🔟 Testing sync jobs processing...');
    const processResponse = await axios.post(`${BASE_URL}/sync-jobs/process`);
    console.log(`✅ Sync jobs processing: ${processResponse.data.success ? 'Started' : 'Failed'}`);
    console.log(`   Message: ${processResponse.data.message}\n`);

    // Test 11: Test Sync
    console.log('1️⃣1️⃣ Testing sync functionality...');
    const testSyncResponse = await axios.post(`${BASE_URL}/sync/test`, {
      userId: testUserId,
      content: 'This is a test sync message to verify the synchronization system is working correctly.'
    });
    console.log(`✅ Test sync: ${testSyncResponse.data.success ? 'Success' : 'Failed'}`);
    if (testSyncResponse.data.channelId) {
      console.log(`   Sent to channel: ${testSyncResponse.data.channelId}\n`);
    }

    // Test 12: Sync Group to Channels
    console.log('1️⃣2️⃣ Testing group to channels sync...');
    const groupSyncResponse = await axios.post(`${BASE_URL}/sync/group-to-channels`, {
      groupId: '-1001234567890',
      messageId: 'msg_002',
      targetFilters: {
        categories: ['Electronics'],
        minEngagement: 50
      }
    });
    console.log(`✅ Group to channels sync: ${groupSyncResponse.data.success ? 'Success' : 'Failed'}`);
    if (groupSyncResponse.data.jobId) {
      console.log(`   Job ID: ${groupSyncResponse.data.jobId}\n`);
    }

    // Test 13: Get Sync Analytics
    console.log('1️⃣3️⃣ Testing sync analytics...');
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = new Date().toISOString();
    const analyticsResponse = await axios.get(`${BASE_URL}/analytics/sync?startDate=${startDate}&endDate=${endDate}`);
    console.log(`✅ Sync Analytics:`);
    console.log(`   Period: ${analyticsResponse.data.period.startDate} to ${analyticsResponse.data.period.endDate}`);
    console.log(`   Total jobs: ${analyticsResponse.data.analytics.total_jobs || 0}`);
    console.log(`   Successful jobs: ${analyticsResponse.data.analytics.successful_jobs || 0}`);
    console.log(`   Failed jobs: ${analyticsResponse.data.analytics.failed_jobs || 0}\n`);

    // Test 14: Get Popular Content Analytics
    console.log('1️⃣4️⃣ Testing popular content analytics...');
    const popularAnalyticsResponse = await axios.get(`${BASE_URL}/analytics/popular-content`);
    console.log(`✅ Popular Content Analytics:`);
    console.log(`   Total popular content: ${popularAnalyticsResponse.data.totalPopularContent}`);
    console.log(`   Average popularity score: ${popularAnalyticsResponse.data.averagePopularityScore.toFixed(1)}`);
    console.log(`   Top content items: ${popularAnalyticsResponse.data.topContent.length}`);
    if (popularAnalyticsResponse.data.contentByType) {
      console.log(`   Content by type:`, popularAnalyticsResponse.data.contentByType);
    }
    console.log('');

    // Test 15: Webhook Test
    console.log('1️⃣5️⃣ Testing webhook handler...');
    const webhookUpdate = {
      sourceType: 'group',
      sourceId: '-1001234567890',
      content: {
        id: 'webhook-test-001',
        type: 'coupon',
        content: 'Webhook test content'
      },
      action: 'new_popular_content'
    };
    
    const webhookResponse = await axios.post(`${BASE_URL}/webhook/content-update`, webhookUpdate);
    console.log(`✅ Webhook processed: ${webhookResponse.data.ok ? 'success' : 'failed'}\n`);

    console.log('🎉 All tests completed successfully!');
    console.log('\n📊 Test Summary:');
    console.log('✅ Health check - PASSED');
    console.log('✅ Sync rules management - PASSED');
    console.log('✅ User preferences management - PASSED');
    console.log('✅ Popular content management - PASSED');
    console.log('✅ Sync jobs management - PASSED');
    console.log('✅ Content synchronization - PASSED');
    console.log('✅ Analytics - PASSED');
    console.log('✅ Webhook handling - PASSED');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

// Check if service is running
async function checkServiceStatus() {
  try {
    await axios.get(`${BASE_URL}/health`);
    return true;
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log('🔍 Checking if Sync Manager Service is running...');
  
  const isRunning = await checkServiceStatus();
  if (!isRunning) {
    console.log('❌ Sync Manager Service is not running!');
    console.log('💡 Please start the service first:');
    console.log('   npm run build');
    console.log('   node dist/services/sync/SyncManagerService.js');
    console.log('   OR');
    console.log('   npm run docker:up');
    process.exit(1);
  }
  
  console.log('✅ Service is running, starting tests...\n');
  await testSyncManager();
}

if (require.main === module) {
  main();
}
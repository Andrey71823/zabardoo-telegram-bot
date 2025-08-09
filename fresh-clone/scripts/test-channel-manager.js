#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// Test data
const testUser = {
  telegramId: 123456789,
  firstName: 'Тест',
  lastName: 'Пользователь',
  username: 'testuser',
  languageCode: 'ru'
};

const testCoupon = {
  id: 'test-coupon-1',
  title: 'Flipkart Big Sale - 70% OFF',
  description: 'Huge discounts on electronics and fashion',
  discount_type: 'percentage',
  discount_value: 70,
  coupon_code: 'BIGSALE70',
  site_page_url: 'https://zabardoo.com/coupons/flipkart-big-sale',
  expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
};

async function testChannelManager() {
  console.log('🧪 Testing Channel Manager Service...\n');

  try {
    // Test 1: Health Check
    console.log('1️⃣ Testing health check...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log(`✅ Health check: ${healthResponse.data.status}`);
    console.log(`   Service: ${healthResponse.data.service}`);
    console.log(`   Database: postgres=${healthResponse.data.checks.database.postgres}, redis=${healthResponse.data.checks.database.redis}\n`);

    // Test 2: Create User and Personal Channel
    console.log('2️⃣ Testing user and channel creation...');
    try {
      const createResponse = await axios.post(`${BASE_URL}/users`, testUser);
      console.log(`✅ User created: ${createResponse.data.user.firstName} (ID: ${createResponse.data.user.id})`);
      console.log(`✅ Channel created: ${createResponse.data.channel.channelId}\n`);
      
      // Store user ID for further tests
      testUser.id = createResponse.data.user.id;
      testUser.channelId = createResponse.data.channel.channelId;
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('ℹ️ User already exists, continuing with tests...\n');
        
        // Get existing user
        const getUserResponse = await axios.get(`${BASE_URL}/users/${testUser.telegramId}`);
        testUser.id = getUserResponse.data.user.id;
        testUser.channelId = getUserResponse.data.channel.channelId;
      } else {
        throw error;
      }
    }

    // Test 3: Send Message to Personal Channel
    console.log('3️⃣ Testing message sending...');
    const messageResponse = await axios.post(`${BASE_URL}/personal-channel/${testUser.channelId}/message`, {
      message: '🎉 Тестовое сообщение от Channel Manager!\n\nЭто проверка работы персонального канала.',
      messageType: 'text'
    });
    console.log(`✅ Message sent: ${messageResponse.data.success ? 'success' : 'failed'}\n`);

    // Test 4: Send Coupon Recommendation
    console.log('4️⃣ Testing coupon recommendation...');
    const couponMessage = {
      message: `🎯 Персональная рекомендация!\n\n🏪 ${testCoupon.title}\n${testCoupon.description}\n\n💰 Скидка: ${testCoupon.discount_value}%\n🎫 Код: ${testCoupon.coupon_code}`,
      messageType: 'coupon',
      metadata: {
        couponId: testCoupon.id,
        buttons: [{
          text: '🛒 Получить купон',
          url: testCoupon.site_page_url
        }]
      }
    };
    
    const couponResponse = await axios.post(`${BASE_URL}/personal-channel/${testUser.channelId}/message`, couponMessage);
    console.log(`✅ Coupon recommendation sent: ${couponResponse.data.success ? 'success' : 'failed'}\n`);

    // Test 5: Update User Activity
    console.log('5️⃣ Testing user activity update...');
    const activityResponse = await axios.put(`${BASE_URL}/users/${testUser.telegramId}/activity`);
    console.log(`✅ User activity updated: ${activityResponse.data.success ? 'success' : 'failed'}\n`);

    // Test 6: Get Channel Activity
    console.log('6️⃣ Testing channel activity retrieval...');
    const activityLogResponse = await axios.get(`${BASE_URL}/personal-channel/${testUser.channelId}/activity`);
    console.log(`✅ Channel activity retrieved: ${activityLogResponse.data.count} activities`);
    if (activityLogResponse.data.activity.length > 0) {
      console.log(`   Latest activity: ${activityLogResponse.data.activity[0].activityType} at ${activityLogResponse.data.activity[0].timestamp}\n`);
    }

    // Test 7: Bulk Message Test
    console.log('7️⃣ Testing bulk messaging...');
    const bulkMessages = [
      {
        channelId: testUser.channelId,
        message: '📢 Массовое сообщение 1: Новые купоны доступны!',
        messageType: 'text'
      },
      {
        channelId: testUser.channelId,
        message: '📢 Массовое сообщение 2: Специальные предложения только для вас!',
        messageType: 'text'
      }
    ];
    
    const bulkResponse = await axios.post(`${BASE_URL}/personal-channels/bulk-message`, {
      messages: bulkMessages
    });
    console.log(`✅ Bulk messages sent: ${bulkResponse.data.success} success, ${bulkResponse.data.failed} failed\n`);

    // Test 8: Coupon Sync Test
    console.log('8️⃣ Testing coupon sync...');
    const syncResponse = await axios.post(`${BASE_URL}/personal-channels/sync-coupon`, {
      coupon: testCoupon,
      targetUsers: [testUser.id],
      messageTemplate: `🎯 Эксклюзивное предложение!\n\n${testCoupon.title}\n\n💰 Скидка ${testCoupon.discount_value}%`
    });
    console.log(`✅ Coupon synced: ${syncResponse.data.success ? 'success' : 'failed'}`);
    console.log(`   Messages sent: ${syncResponse.data.messagesSent}, failed: ${syncResponse.data.messagesFailed}\n`);

    // Test 9: Analytics
    console.log('9️⃣ Testing analytics...');
    const channelAnalytics = await axios.get(`${BASE_URL}/analytics/channels`);
    console.log(`✅ Channel Analytics:`);
    console.log(`   Total channels: ${channelAnalytics.data.totalPersonalChannels}`);
    console.log(`   Active channels: ${channelAnalytics.data.activeChannels}`);
    console.log(`   Average engagement: ${channelAnalytics.data.averageEngagement}%`);
    
    const userAnalytics = await axios.get(`${BASE_URL}/analytics/users`);
    console.log(`✅ User Analytics:`);
    console.log(`   Total users: ${userAnalytics.data.totalUsers}`);
    console.log(`   Average LTV: ₹${userAnalytics.data.averageLifetimeValue}`);
    console.log(`   High risk users: ${userAnalytics.data.highRiskUsers}\n`);

    // Test 10: Webhook Test
    console.log('🔟 Testing webhook handler...');
    const webhookUpdate = {
      update_id: 123456,
      message: {
        message_id: 789,
        from: { 
          id: testUser.telegramId, 
          first_name: testUser.firstName,
          username: testUser.username
        },
        chat: { id: testUser.telegramId, type: 'private' },
        date: Math.floor(Date.now() / 1000),
        text: 'Тестовое сообщение от пользователя'
      }
    };
    
    const webhookResponse = await axios.post(`${BASE_URL}/webhook/telegram`, webhookUpdate);
    console.log(`✅ Webhook processed: ${webhookResponse.data.ok ? 'success' : 'failed'}\n`);

    console.log('🎉 All tests completed successfully!');
    console.log('\n📊 Test Summary:');
    console.log('✅ Health check - PASSED');
    console.log('✅ User creation - PASSED');
    console.log('✅ Channel messaging - PASSED');
    console.log('✅ Coupon recommendations - PASSED');
    console.log('✅ Activity tracking - PASSED');
    console.log('✅ Bulk operations - PASSED');
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
  console.log('🔍 Checking if Channel Manager Service is running...');
  
  const isRunning = await checkServiceStatus();
  if (!isRunning) {
    console.log('❌ Channel Manager Service is not running!');
    console.log('💡 Please start the service first:');
    console.log('   npm run build');
    console.log('   node dist/services/channel-manager/ChannelManagerService.js');
    console.log('   OR');
    console.log('   npm run docker:up');
    process.exit(1);
  }
  
  console.log('✅ Service is running, starting tests...\n');
  await testChannelManager();
}

if (require.main === module) {
  main();
}
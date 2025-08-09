#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:3007';

// Test data
const testGroup = {
  telegramGroupId: '-1001234567890',
  name: 'Zabardoo Test Group',
  description: 'Test group for coupon sharing and moderation',
  moderationLevel: 'medium',
  allowCouponCreation: true
};

const testUser = {
  id: 'test-user-123',
  telegramId: 123456789
};

const testMessage = {
  messageId: 'msg_test_001',
  userId: testUser.id,
  content: 'Flipkart Big Sale - 70% OFF! Use code BIGSALE70 https://flipkart.com/deals',
  messageType: 'coupon'
};

const testModerationRule = {
  ruleType: 'spam_detection',
  parameters: {
    maxCapsRatio: 0.7,
    maxEmojis: 10
  },
  action: 'warn',
  severity: 'medium'
};

async function testGroupManager() {
  console.log('🧪 Testing Group Manager Service...\n');

  try {
    // Test 1: Health Check
    console.log('1️⃣ Testing health check...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log(`✅ Health check: ${healthResponse.data.status}`);
    console.log(`   Service: ${healthResponse.data.service}\n`);

    // Test 2: Create Group
    console.log('2️⃣ Testing group creation...');
    try {
      const createResponse = await axios.post(`${BASE_URL}/groups`, testGroup);
      console.log(`✅ Group created: ${createResponse.data.name}`);
      console.log(`   Telegram ID: ${createResponse.data.telegramGroupId}`);
      console.log(`   Moderation Level: ${createResponse.data.moderationLevel}\n`);
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('ℹ️ Group already exists, continuing with tests...\n');
      } else {
        throw error;
      }
    }

    // Test 3: Get Group
    console.log('3️⃣ Testing group retrieval...');
    const getGroupResponse = await axios.get(`${BASE_URL}/groups/${testGroup.telegramGroupId}`);
    console.log(`✅ Group retrieved: ${getGroupResponse.data.name}`);
    console.log(`   Members: ${getGroupResponse.data.memberCount}`);
    console.log(`   Active: ${getGroupResponse.data.isActive}\n`);

    // Test 4: Add Group Member
    console.log('4️⃣ Testing member addition...');
    const addMemberResponse = await axios.post(`${BASE_URL}/groups/${testGroup.telegramGroupId}/members`, {
      userId: testUser.id,
      role: 'member'
    });
    console.log(`✅ Member added: ${addMemberResponse.data.userId}`);
    console.log(`   Role: ${addMemberResponse.data.role}`);
    console.log(`   Status: ${addMemberResponse.data.status}\n`);

    // Test 5: Create Moderation Rule
    console.log('5️⃣ Testing moderation rule creation...');
    const ruleResponse = await axios.post(`${BASE_URL}/groups/${testGroup.telegramGroupId}/rules`, testModerationRule);
    console.log(`✅ Moderation rule created: ${ruleResponse.data.ruleType}`);
    console.log(`   Action: ${ruleResponse.data.action}`);
    console.log(`   Severity: ${ruleResponse.data.severity}\n`);

    // Test 6: Get Moderation Rules
    console.log('6️⃣ Testing moderation rules retrieval...');
    const rulesResponse = await axios.get(`${BASE_URL}/groups/${testGroup.telegramGroupId}/rules`);
    console.log(`✅ Moderation rules retrieved: ${rulesResponse.data.count} rules`);
    if (rulesResponse.data.rules.length > 0) {
      console.log(`   First rule: ${rulesResponse.data.rules[0].ruleType} -> ${rulesResponse.data.rules[0].action}\n`);
    }

    // Test 7: Moderate Message
    console.log('7️⃣ Testing message moderation...');
    const moderateResponse = await axios.post(`${BASE_URL}/groups/${testGroup.telegramGroupId}/moderate`, testMessage);
    console.log(`✅ Message moderated: ${moderateResponse.data.moderation.action}`);
    if (moderateResponse.data.moderation.reason) {
      console.log(`   Reason: ${moderateResponse.data.moderation.reason}`);
    }
    console.log(`   Should delete: ${moderateResponse.data.moderation.shouldDelete}`);
    console.log(`   Should warn: ${moderateResponse.data.moderation.shouldWarn}\n`);

    // Test 8: Get Recent Messages
    console.log('8️⃣ Testing recent messages retrieval...');
    const messagesResponse = await axios.get(`${BASE_URL}/groups/${testGroup.telegramGroupId}/messages?limit=10`);
    console.log(`✅ Recent messages retrieved: ${messagesResponse.data.count} messages`);
    if (messagesResponse.data.messages.length > 0) {
      console.log(`   Latest message: ${messagesResponse.data.messages[0].messageType} from ${messagesResponse.data.messages[0].userId}\n`);
    }

    // Test 9: Assist Coupon Creation
    console.log('9️⃣ Testing coupon creation assistance...');
    const couponContent = 'Amazon Great Sale - 50% OFF on Electronics! Code: GREAT50 https://amazon.in/deals Valid till 31st Dec';
    const assistResponse = await axios.post(`${BASE_URL}/groups/${testGroup.telegramGroupId}/assist-coupon`, {
      userId: testUser.id,
      messageContent: couponContent
    });
    console.log(`✅ Coupon assistance: ${assistResponse.data.isValidCoupon ? 'Valid coupon' : 'Invalid coupon'}`);
    if (assistResponse.data.extractedData) {
      console.log(`   Title: ${assistResponse.data.extractedData.title}`);
      console.log(`   Store: ${assistResponse.data.extractedData.store}`);
      console.log(`   Discount: ${assistResponse.data.extractedData.discountValue}${assistResponse.data.extractedData.discountType === 'percentage' ? '%' : '₹'}`);
    }
    if (assistResponse.data.suggestions) {
      console.log(`   Suggestions: ${assistResponse.data.suggestions.length} provided\n`);
    }

    // Test 10: Get Coupon Requests
    console.log('🔟 Testing coupon requests retrieval...');
    const requestsResponse = await axios.get(`${BASE_URL}/groups/${testGroup.telegramGroupId}/coupon-requests`);
    console.log(`✅ Coupon requests retrieved: ${requestsResponse.data.count} requests`);
    if (requestsResponse.data.requests.length > 0) {
      console.log(`   First request: ${requestsResponse.data.requests[0].title} (${requestsResponse.data.requests[0].status})\n`);
    }

    // Test 11: Update Member Status
    console.log('1️⃣1️⃣ Testing member status update...');
    const updateMemberResponse = await axios.put(`${BASE_URL}/groups/${testGroup.telegramGroupId}/members/${testUser.id}`, {
      status: 'active',
      reason: 'Test status update'
    });
    console.log(`✅ Member status updated: ${updateMemberResponse.data.status}`);
    console.log(`   Last active: ${updateMemberResponse.data.lastActiveAt}\n`);

    // Test 12: Group Analytics
    console.log('1️⃣2️⃣ Testing group analytics...');
    const analyticsResponse = await axios.get(`${BASE_URL}/groups/${testGroup.telegramGroupId}/analytics`);
    console.log(`✅ Group Analytics:`);
    console.log(`   Group: ${analyticsResponse.data.groupName}`);
    console.log(`   Members: ${analyticsResponse.data.memberCount}`);
    console.log(`   Total messages: ${analyticsResponse.data.totalMessages}`);
    console.log(`   Messages last 24h: ${analyticsResponse.data.messagesLast24h}`);
    console.log(`   Moderation rate: ${analyticsResponse.data.moderationRate.toFixed(1)}%`);
    console.log(`   Coupons created: ${analyticsResponse.data.couponsCreated}\n`);

    // Test 13: All Groups Analytics
    console.log('1️⃣3️⃣ Testing all groups analytics...');
    const allAnalyticsResponse = await axios.get(`${BASE_URL}/analytics/groups`);
    console.log(`✅ All Groups Analytics:`);
    console.log(`   Total groups: ${allAnalyticsResponse.data.totalGroups}`);
    console.log(`   Active groups: ${allAnalyticsResponse.data.activeGroups}`);
    console.log(`   Total members: ${allAnalyticsResponse.data.totalMembers}`);
    console.log(`   Moderation actions: ${allAnalyticsResponse.data.moderationActions}\n`);

    // Test 14: Webhook Test
    console.log('1️⃣4️⃣ Testing webhook handler...');
    const webhookUpdate = {
      message: {
        message_id: 789,
        chat: { id: testGroup.telegramGroupId, type: 'group' },
        from: { id: testUser.telegramId, first_name: 'Test User' },
        text: 'Test webhook message'
      }
    };
    
    const webhookResponse = await axios.post(`${BASE_URL}/webhook/group-update`, webhookUpdate);
    console.log(`✅ Webhook processed: ${webhookResponse.data.ok ? 'success' : 'failed'}\n`);

    console.log('🎉 All tests completed successfully!');
    console.log('\n📊 Test Summary:');
    console.log('✅ Health check - PASSED');
    console.log('✅ Group management - PASSED');
    console.log('✅ Member management - PASSED');
    console.log('✅ Message moderation - PASSED');
    console.log('✅ Moderation rules - PASSED');
    console.log('✅ Coupon assistance - PASSED');
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
  console.log('🔍 Checking if Group Manager Service is running...');
  
  const isRunning = await checkServiceStatus();
  if (!isRunning) {
    console.log('❌ Group Manager Service is not running!');
    console.log('💡 Please start the service first:');
    console.log('   npm run build');
    console.log('   node dist/services/group/GroupManagerService.js');
    console.log('   OR');
    console.log('   npm run docker:up');
    process.exit(1);
  }
  
  console.log('✅ Service is running, starting tests...\n');
  await testGroupManager();
}

if (require.main === module) {
  main();
}
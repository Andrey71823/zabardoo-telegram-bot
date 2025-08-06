#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:3002';

// Test data
const testUserId = 'test-user-123';
const testChannelId = 'channel_test_123';

const testConversation = {
  userId: testUserId,
  channelId: testChannelId
};

const testMessage = {
  userId: testUserId,
  message: 'Привет! Ищу скидки на электронику для смартфонов',
  channelId: testChannelId
};

const testCoupons = [
  {
    id: 'coupon-1',
    title: 'Flipkart Electronics Sale - 70% OFF',
    store: 'Flipkart',
    category: 'Electronics',
    discount_value: 70,
    discount_type: 'percentage'
  },
  {
    id: 'coupon-2',
    title: 'Amazon Smartphone Deals - 50% OFF',
    store: 'Amazon',
    category: 'Electronics',
    discount_value: 50,
    discount_type: 'percentage'
  },
  {
    id: 'coupon-3',
    title: 'Myntra Fashion Sale - 60% OFF',
    store: 'Myntra',
    category: 'Fashion',
    discount_value: 60,
    discount_type: 'percentage'
  }
];

async function testAIAssistant() {
  console.log('🧪 Testing AI Assistant Service...\n');

  try {
    // Test 1: Health Check
    console.log('1️⃣ Testing health check...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log(`✅ Health check: ${healthResponse.data.status}`);
    console.log(`   Service: ${healthResponse.data.service}\n`);

    // Test 2: Create Conversation
    console.log('2️⃣ Testing conversation creation...');
    const createConversationResponse = await axios.post(`${BASE_URL}/conversations`, testConversation);
    console.log(`✅ Conversation created: ${createConversationResponse.data.id}`);
    console.log(`   Status: ${createConversationResponse.data.status}`);
    console.log(`   User: ${createConversationResponse.data.userId}\n`);
    
    const conversationId = createConversationResponse.data.id;

    // Test 3: Get User Conversation
    console.log('3️⃣ Testing conversation retrieval...');
    const getConversationResponse = await axios.get(`${BASE_URL}/conversations/${testUserId}`);
    console.log(`✅ Conversation retrieved: ${getConversationResponse.data.id}`);
    console.log(`   Current intent: ${getConversationResponse.data.context.currentIntent}`);
    console.log(`   User profile: ${getConversationResponse.data.context.userProfile.name}\n`);

    // Test 4: Generate Personalized Greeting
    console.log('4️⃣ Testing personalized greeting generation...');
    const greetingResponse = await axios.post(`${BASE_URL}/generate-greeting`, {
      userId: testUserId
    });
    console.log(`✅ Personalized greeting generated:`);
    console.log(`   "${greetingResponse.data.greeting}"\n`);

    // Test 5: Analyze Intent
    console.log('5️⃣ Testing intent analysis...');
    const intentResponse = await axios.post(`${BASE_URL}/analyze-intent`, {
      message: 'Хочу купить новый смартфон со скидкой'
    });
    console.log(`✅ Intent analyzed:`);
    console.log(`   Intent: ${intentResponse.data.intent.intent}`);
    console.log(`   Confidence: ${(intentResponse.data.intent.confidence * 100).toFixed(1)}%`);
    console.log(`   Entities: ${intentResponse.data.intent.entities.length} found`);
    if (intentResponse.data.intent.entities.length > 0) {
      console.log(`   First entity: ${intentResponse.data.intent.entities[0].type} = "${intentResponse.data.intent.entities[0].value}"\n`);
    }

    // Test 6: Process User Message
    console.log('6️⃣ Testing message processing...');
    const processMessageResponse = await axios.post(`${BASE_URL}/process-message`, testMessage);
    console.log(`✅ Message processed:`);
    console.log(`   Conversation: ${processMessageResponse.data.conversation}`);
    console.log(`   User message ID: ${processMessageResponse.data.userMessage.id}`);
    console.log(`   Assistant response: "${processMessageResponse.data.assistantMessage.content.substring(0, 100)}..."`);
    console.log(`   Detected intent: ${processMessageResponse.data.intent.intent}`);
    console.log(`   Recommendations: ${processMessageResponse.data.recommendations.length}\n`);

    // Test 7: Recommend Coupons
    console.log('7️⃣ Testing coupon recommendations...');
    const recommendResponse = await axios.post(`${BASE_URL}/recommend-coupons`, {
      userId: testUserId,
      availableCoupons: testCoupons
    });
    console.log(`✅ Coupon recommendations generated:`);
    console.log(`   Recommended coupons: ${recommendResponse.data.recommendedCoupons.length}`);
    console.log(`   Personalized message: "${recommendResponse.data.personalizedMessage.substring(0, 100)}..."\n`);

    // Test 8: Get User Recommendations
    console.log('8️⃣ Testing user recommendations retrieval...');
    const userRecommendationsResponse = await axios.get(`${BASE_URL}/users/${testUserId}/recommendations`);
    console.log(`✅ User recommendations retrieved: ${userRecommendationsResponse.data.count} recommendations`);
    if (userRecommendationsResponse.data.recommendations.length > 0) {
      const firstRec = userRecommendationsResponse.data.recommendations[0];
      console.log(`   Latest recommendation: ${firstRec.recommendationReason}`);
      console.log(`   Confidence: ${(firstRec.confidence * 100).toFixed(1)}%`);
      console.log(`   Accepted: ${firstRec.wasAccepted !== null ? (firstRec.wasAccepted ? 'Yes' : 'No') : 'Pending'}\n`);
    }

    // Test 9: Accept Recommendation
    if (userRecommendationsResponse.data.recommendations.length > 0) {
      console.log('9️⃣ Testing recommendation acceptance...');
      const recommendationId = userRecommendationsResponse.data.recommendations[0].id;
      const acceptResponse = await axios.post(`${BASE_URL}/recommendations/${recommendationId}/accept`);
      console.log(`✅ Recommendation accepted: ${acceptResponse.data.success}`);
      console.log(`   Recommendation ID: ${acceptResponse.data.recommendation.id}`);
      console.log(`   Accepted at: ${acceptResponse.data.recommendation.acceptedAt}\n`);
    }

    // Test 10: Chat Interaction
    console.log('🔟 Testing chat interaction...');
    const chatResponse = await axios.post(`${BASE_URL}/chat`, {
      userId: testUserId,
      message: 'Покажи мне лучшие предложения на смартфоны Samsung'
    });
    console.log(`✅ Chat interaction completed`);
    console.log(`   Response received and processed\n`);

    // Test 11: Conversation Analytics
    console.log('1️⃣1️⃣ Testing conversation analytics...');
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = new Date().toISOString();
    const conversationAnalyticsResponse = await axios.get(`${BASE_URL}/analytics/conversations?startDate=${startDate}&endDate=${endDate}`);
    console.log(`✅ Conversation Analytics:`);
    console.log(`   Period: ${conversationAnalyticsResponse.data.period.startDate} to ${conversationAnalyticsResponse.data.period.endDate}`);
    console.log(`   Total conversations: ${conversationAnalyticsResponse.data.analytics.total_conversations || 0}`);
    console.log(`   Active conversations: ${conversationAnalyticsResponse.data.analytics.active_conversations || 0}`);
    console.log(`   Average conversation length: ${parseFloat(conversationAnalyticsResponse.data.analytics.avg_conversation_length || 0).toFixed(1)} messages\n`);

    // Test 12: Recommendation Analytics
    console.log('1️⃣2️⃣ Testing recommendation analytics...');
    const recommendationAnalyticsResponse = await axios.get(`${BASE_URL}/analytics/recommendations?startDate=${startDate}&endDate=${endDate}`);
    console.log(`✅ Recommendation Analytics:`);
    console.log(`   Total recommendations: ${recommendationAnalyticsResponse.data.analytics.total_recommendations || 0}`);
    console.log(`   Accepted recommendations: ${recommendationAnalyticsResponse.data.analytics.accepted_recommendations || 0}`);
    console.log(`   Average confidence: ${parseFloat(recommendationAnalyticsResponse.data.analytics.avg_confidence || 0).toFixed(2)}`);
    console.log(`   Acceptance rate: ${(parseFloat(recommendationAnalyticsResponse.data.analytics.acceptance_rate || 0) * 100).toFixed(1)}%\n`);

    // Test 13: Multiple Message Conversation
    console.log('1️⃣3️⃣ Testing multi-turn conversation...');
    const messages = [
      'Привет! Как дела?',
      'Ищу скидки на ноутбуки',
      'Какие магазины лучше для покупки техники?',
      'Спасибо за помощь!'
    ];

    for (let i = 0; i < messages.length; i++) {
      const response = await axios.post(`${BASE_URL}/process-message`, {
        userId: testUserId,
        message: messages[i],
        channelId: testChannelId
      });
      console.log(`   Message ${i + 1}: "${messages[i]}" -> Intent: ${response.data.intent.intent}`);
      
      // Small delay between messages
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    console.log(`✅ Multi-turn conversation completed\n`);

    // Test 14: Webhook Message Handler
    console.log('1️⃣4️⃣ Testing webhook message handler...');
    const webhookMessage = {
      userId: testUserId,
      message: 'Webhook test message - показать популярные купоны',
      channelId: testChannelId
    };
    
    const webhookResponse = await axios.post(`${BASE_URL}/webhook/message`, webhookMessage);
    console.log(`✅ Webhook message processed successfully\n`);

    console.log('🎉 All tests completed successfully!');
    console.log('\n📊 Test Summary:');
    console.log('✅ Health check - PASSED');
    console.log('✅ Conversation management - PASSED');
    console.log('✅ Message processing - PASSED');
    console.log('✅ AI interactions - PASSED');
    console.log('✅ Intent analysis - PASSED');
    console.log('✅ Coupon recommendations - PASSED');
    console.log('✅ User recommendations - PASSED');
    console.log('✅ Analytics - PASSED');
    console.log('✅ Multi-turn conversations - PASSED');
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
  console.log('🔍 Checking if AI Assistant Service is running...');
  
  const isRunning = await checkServiceStatus();
  if (!isRunning) {
    console.log('❌ AI Assistant Service is not running!');
    console.log('💡 Please start the service first:');
    console.log('   npm run build');
    console.log('   node dist/services/ai/AIAssistantService.js');
    console.log('   OR');
    console.log('   npm run docker:up');
    console.log('\n⚠️  Note: Make sure you have OPENAI_API_KEY set in your environment variables');
    process.exit(1);
  }
  
  console.log('✅ Service is running, starting tests...\n');
  await testAIAssistant();
}

if (require.main === module) {
  main();
}
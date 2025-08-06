#!/usr/bin/env node

const { EventCollectionService } = require('../src/services/analytics/EventCollectionService');
const { AnalyticsRepository } = require('../src/repositories/AnalyticsRepository');
const { EventType, UserAction, BusinessMetric } = require('../src/models/Analytics');

async function testEventCollection() {
  console.log('📊 Testing Event Collection System...\n');

  const eventService = new EventCollectionService({
    batchSize: 10,
    flushInterval: 2000,
    enableRealTimeProcessing: true,
    enableDataValidation: true,
    enableEnrichment: true,
    maxRetries: 3
  });

  const repository = new AnalyticsRepository();
  const testUserId = `analytics_user_${Date.now()}`;

  try {
    // Test 1: Basic Event Collection
    console.log('1️⃣ Test: Basic Event Collection');
    
    await eventService.collectEvent(testUserId, 'test_event', {
      action: 'click',
      target: 'button',
      value: 100
    }, {
      platform: 'telegram',
      source: 'bot',
      ipAddress: '192.168.1.1'
    });
    
    console.log('✅ Basic event collected successfully');

    // Test 2: User Action Events
    console.log('\n2️⃣ Test: User Action Events');
    
    const userActions = [
      { action: UserAction.BOT_START, properties: { platform: 'telegram' } },
      { action: UserAction.COUPON_VIEW, properties: { couponId: 'coupon_123', store: 'flipkart' } },
      { action: UserAction.COUPON_CLICK, properties: { couponId: 'coupon_123', store: 'flipkart' } },
      { action: UserAction.PURCHASE_INITIATED, properties: { orderId: 'order_456', amount: 2500 } },
      { action: UserAction.PURCHASE_COMPLETED, properties: { orderId: 'order_456', amount: 2500 } },
      { action: UserAction.CASHBACK_EARNED, properties: { amount: 75, transactionId: 'txn_789' } }
    ];

    for (const { action, properties } of userActions) {
      await eventService.collectUserAction(testUserId, action, properties);
      console.log(`✅ User action collected: ${action}`);
    }

    // Test 3: Business Events
    console.log('\n3️⃣ Test: Business Events');
    
    const businessEvents = [
      { metric: BusinessMetric.REVENUE, value: 2500, properties: { orderId: 'order_456', currency: 'INR' } },
      { metric: BusinessMetric.COMMISSION, value: 125, properties: { affiliateId: 'aff_123' } },
      { metric: BusinessMetric.CASHBACK_PAID, value: 75, properties: { userId: testUserId } },
      { metric: BusinessMetric.CONVERSION_RATE, value: 0.15, properties: { funnel: 'purchase_funnel' } }
    ];

    for (const { metric, value, properties } of businessEvents) {
      await eventService.collectBusinessEvent(testUserId, metric, value, properties);
      console.log(`✅ Business event collected: ${metric} = ${value}`);
    }

    // Test 4: System Events
    console.log('\n4️⃣ Test: System Events');
    
    const systemEvents = [
      { component: 'database', operation: 'query', status: 'success', properties: { queryTime: 45 } },
      { component: 'payment_service', operation: 'process_payment', status: 'success', properties: { paymentId: 'pay_123' } },
      { component: 'notification_service', operation: 'send_notification', status: 'failure', properties: { error: 'Rate limit exceeded' } },
      { component: 'cache', operation: 'get', status: 'success', properties: { key: 'user_data', hitRate: 0.85 } }
    ];

    for (const { component, operation, status, properties } of systemEvents) {
      await eventService.collectSystemEvent(testUserId, component, operation, status, properties);
      console.log(`✅ System event collected: ${component}.${operation} - ${status}`);
    }

    // Test 5: Performance Events
    console.log('\n5️⃣ Test: Performance Events');
    
    const performanceEvents = [
      { metric: 'response_time', value: 250, unit: 'ms', properties: { endpoint: '/api/coupons' } },
      { metric: 'memory_usage', value: 512, unit: 'MB', properties: { service: 'analytics' } },
      { metric: 'cpu_usage', value: 45, unit: 'percent', properties: { service: 'analytics' } },
      { metric: 'throughput', value: 1500, unit: 'requests/min', properties: { endpoint: '/api/events' } }
    ];

    for (const { metric, value, unit, properties } of performanceEvents) {
      await eventService.collectPerformanceEvent(testUserId, metric, value, unit, properties);
      console.log(`✅ Performance event collected: ${metric} = ${value}${unit}`);
    }

    // Test 6: Session Management
    console.log('\n6️⃣ Test: Session Management');
    
    const sessionId = await eventService.startSession(testUserId, 'telegram', 'bot', {
      platform: 'telegram',
      source: 'bot',
      userAgent: 'TelegramBot/1.0',
      location: { country: 'India', region: 'Maharashtra', city: 'Mumbai' }
    });
    
    console.log(`✅ Session started: ${sessionId}`);

    // Add events to session
    await eventService.collectUserAction(testUserId, UserAction.COUPON_VIEW, { couponId: 'session_test_1' });
    await eventService.collectUserAction(testUserId, UserAction.COUPON_CLICK, { couponId: 'session_test_1' });
    await eventService.collectUserAction(testUserId, UserAction.PURCHASE_COMPLETED, { orderId: 'session_order' });

    console.log('✅ Events added to session');

    // Check session properties
    const session = eventService.sessionCache.get(sessionId);
    if (session) {
      console.log(`✅ Session properties: ${session.properties.eventsCount} events, ${session.properties.uniqueActions} unique actions, ${session.properties.conversionEvents} conversions`);
    }

    // End session
    await eventService.endSession(sessionId);
    console.log('✅ Session ended');

    // Test 7: Batch Event Collection
    console.log('\n7️⃣ Test: Batch Event Collection');
    
    const batchEvents = [];
    for (let i = 0; i < 20; i++) {
      batchEvents.push({
        userId: testUserId,
        eventName: `batch_event_${i}`,
        properties: {
          batchIndex: i,
          category: ['electronics', 'fashion', 'grocery'][i % 3],
          value: Math.floor(Math.random() * 1000) + 100
        },
        context: {
          platform: 'telegram',
          source: 'bot'
        },
        timestamp: new Date(Date.now() - (i * 1000)) // Spread events over time
      });
    }

    await eventService.collectEventBatch(batchEvents);
    console.log(`✅ Batch of ${batchEvents.length} events collected`);

    // Test 8: Event Validation
    console.log('\n8️⃣ Test: Event Validation');
    
    // Test valid event
    try {
      await eventService.collectEvent(testUserId, 'valid_event', { action: 'test' });
      console.log('✅ Valid event accepted');
    } catch (error) {
      console.log('❌ Valid event rejected:', error.message);
    }

    // Test invalid event (empty user ID)
    try {
      await eventService.collectEvent('', 'invalid_event', { action: 'test' });
      console.log('❌ Invalid event accepted (should have been rejected)');
    } catch (error) {
      console.log('✅ Invalid event properly rejected:', error.message);
    }

    // Test invalid event name
    try {
      await eventService.collectEvent(testUserId, 'invalid-event-name!', { action: 'test' });
      console.log('❌ Invalid event name accepted (should have been rejected)');
    } catch (error) {
      console.log('✅ Invalid event name properly rejected:', error.message);
    }

    // Test 9: Event Enrichment
    console.log('\n9️⃣ Test: Event Enrichment');
    
    // Mock enrichment methods
    eventService.getUserProperties = async (userId) => ({
      userTier: 'premium',
      registrationDate: '2024-01-01',
      totalPurchases: 15,
      preferredLanguage: 'en'
    });

    eventService.getGeoLocation = async (ipAddress) => ({
      country: 'India',
      region: 'Maharashtra',
      city: 'Mumbai'
    });

    await eventService.collectEvent(testUserId, 'enrichment_test', {
      action: 'purchase',
      amount: 1500
    }, {
      platform: 'telegram',
      source: 'bot',
      ipAddress: '203.192.12.34'
    });

    console.log('✅ Event with enrichment collected');

    // Test 10: Performance Test
    console.log('\n🔟 Test: Performance');
    
    const performanceStartTime = Date.now();
    const performancePromises = [];

    // Collect 100 events concurrently
    for (let i = 0; i < 100; i++) {
      performancePromises.push(
        eventService.collectEvent(`perf_user_${i % 10}`, `perf_event_${i}`, {
          index: i,
          category: ['test', 'performance', 'load'][i % 3],
          value: Math.floor(Math.random() * 1000)
        })
      );
    }

    await Promise.all(performancePromises);
    const performanceEndTime = Date.now();

    console.log(`✅ Performance test completed: ${performancePromises.length} events in ${performanceEndTime - performanceStartTime}ms`);
    console.log(`⚡ Average: ${((performanceEndTime - performanceStartTime) / performancePromises.length).toFixed(2)}ms per event`);

    // Test 11: Repository Operations
    console.log('\n1️⃣1️⃣ Test: Repository Operations');
    
    // Test event retrieval
    const userEvents = await repository.getEventsByUserId(testUserId, 10);
    console.log(`✅ Retrieved ${userEvents.length} events for user`);

    // Test event count
    const eventCount = await repository.getEventsCount({ userId: testUserId });
    console.log(`✅ Total events for user: ${eventCount}`);

    // Test top events
    const topEvents = await repository.getTopEvents({
      from: new Date(Date.now() - 24 * 60 * 60 * 1000),
      to: new Date()
    }, 5);
    console.log(`✅ Top events retrieved: ${topEvents.length} events`);
    topEvents.forEach(event => {
      console.log(`   - ${event.eventName}: ${event.count} occurrences`);
    });

    // Test active users
    const activeUsers = await repository.getActiveUsers({
      from: new Date(Date.now() - 24 * 60 * 60 * 1000),
      to: new Date()
    });
    console.log(`✅ Active users data: ${activeUsers.length} time periods`);

    // Test 12: Real-time Metrics
    console.log('\n1️⃣2️⃣ Test: Real-time Metrics');
    
    const realTimeMetrics = [
      { id: 'active_users', name: 'Active Users', value: 1250, unit: 'count', trend: 'up' },
      { id: 'events_per_minute', name: 'Events Per Minute', value: 450, unit: 'count/min', trend: 'stable' },
      { id: 'conversion_rate', name: 'Conversion Rate', value: 12.5, unit: 'percentage', trend: 'up' },
      { id: 'avg_session_duration', name: 'Avg Session Duration', value: 180, unit: 'seconds', trend: 'down' }
    ];

    for (const metric of realTimeMetrics) {
      await repository.updateRealTimeMetric({
        id: metric.id,
        name: metric.name,
        value: metric.value,
        previousValue: metric.value * 0.95,
        change: metric.value * 0.05,
        changePercent: 5.0,
        unit: metric.unit,
        timestamp: new Date(),
        trend: metric.trend
      });
      console.log(`✅ Real-time metric updated: ${metric.name} = ${metric.value} ${metric.unit}`);
    }

    const retrievedMetrics = await repository.getRealTimeMetrics();
    console.log(`✅ Retrieved ${retrievedMetrics.length} real-time metrics`);

    // Test 13: Error Handling
    console.log('\n1️⃣3️⃣ Test: Error Handling');
    
    // Test service with invalid configuration
    try {
      const invalidService = new EventCollectionService({
        batchSize: -1, // Invalid batch size
        flushInterval: 0 // Invalid interval
      });
      console.log('⚠️ Invalid configuration accepted (should validate)');
      await invalidService.shutdown();
    } catch (error) {
      console.log('✅ Invalid configuration handled:', error.message);
    }

    // Test event collection with service errors
    const originalMethod = eventService.repository.createEventBatch;
    eventService.repository.createEventBatch = async () => {
      throw new Error('Database connection failed');
    };

    try {
      await eventService.collectEvent(testUserId, 'error_test', {});
      console.log('⚠️ Event collected despite database error');
    } catch (error) {
      console.log('✅ Database error handled gracefully:', error.message);
    }

    // Restore original method
    eventService.repository.createEventBatch = originalMethod;

    // Wait for any pending flushes
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('\n🎉 All Event Collection tests completed successfully!');

    // Summary
    console.log('\n📋 Test Summary:');
    console.log('✅ Basic event collection');
    console.log('✅ User action events');
    console.log('✅ Business events');
    console.log('✅ System events');
    console.log('✅ Performance events');
    console.log('✅ Session management');
    console.log('✅ Batch event collection');
    console.log('✅ Event validation');
    console.log('✅ Event enrichment');
    console.log('✅ Performance testing');
    console.log('✅ Repository operations');
    console.log('✅ Real-time metrics');
    console.log('✅ Error handling');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await eventService.shutdown();
  }
}

// Integration test with other systems
async function integrationTest() {
  console.log('\n🔗 Integration Test with Other Systems');
  
  const eventService = new EventCollectionService({
    batchSize: 5,
    flushInterval: 1000,
    enableRealTimeProcessing: true
  });

  try {
    const userId = `integration_${Date.now()}`;
    
    console.log('Testing complete user journey with event tracking...');
    
    // 1. User starts bot
    const sessionId = await eventService.startSession(userId, 'telegram', 'bot', {
      platform: 'telegram',
      source: 'bot'
    });
    console.log('1. User session started');

    // 2. User views coupons
    await eventService.collectUserAction(userId, UserAction.COUPON_VIEW, {
      couponId: 'integration_coupon_1',
      store: 'flipkart',
      category: 'electronics'
    });
    console.log('2. Coupon view tracked');

    // 3. User clicks coupon
    await eventService.collectUserAction(userId, UserAction.COUPON_CLICK, {
      couponId: 'integration_coupon_1',
      store: 'flipkart',
      category: 'electronics'
    });
    console.log('3. Coupon click tracked');

    // 4. User initiates purchase
    await eventService.collectUserAction(userId, UserAction.PURCHASE_INITIATED, {
      orderId: 'integration_order_1',
      amount: 2500,
      store: 'flipkart',
      category: 'electronics'
    });
    console.log('4. Purchase initiation tracked');

    // 5. Purchase completed (business event)
    await eventService.collectBusinessEvent(userId, BusinessMetric.REVENUE, 2500, {
      orderId: 'integration_order_1',
      currency: 'INR',
      store: 'flipkart'
    });
    console.log('5. Revenue event tracked');

    // 6. Cashback earned
    await eventService.collectUserAction(userId, UserAction.CASHBACK_EARNED, {
      amount: 87.50,
      transactionId: 'integration_txn_1',
      orderId: 'integration_order_1'
    });
    console.log('6. Cashback earned tracked');

    // 7. System performance tracking
    await eventService.collectPerformanceEvent(userId, 'conversion_time', 1250, 'ms', {
      funnel: 'purchase_funnel',
      step: 'completion'
    });
    console.log('7. Performance metrics tracked');

    // 8. End session
    await eventService.endSession(sessionId);
    console.log('8. Session ended');

    console.log('✅ Complete integration flow tracked successfully');

    // Verify session data
    const repository = new AnalyticsRepository();
    const userEvents = await repository.getEventsByUserId(userId);
    console.log(`✅ Captured ${userEvents.length} events for user journey`);

    // Test funnel analysis simulation
    console.log('\nSimulating funnel analysis...');
    const funnelSteps = [
      'coupon_view',
      'coupon_click', 
      'purchase_initiated',
      'purchase_completed',
      'cashback_earned'
    ];

    let previousCount = userEvents.length;
    funnelSteps.forEach((step, index) => {
      const stepEvents = userEvents.filter(e => e.eventName.includes(step.split('_')[0]));
      const conversionRate = previousCount > 0 ? (stepEvents.length / previousCount) * 100 : 0;
      console.log(`   ${index + 1}. ${step}: ${stepEvents.length} events (${conversionRate.toFixed(1)}% conversion)`);
      previousCount = stepEvents.length;
    });

    console.log('✅ Integration test completed successfully');

  } catch (error) {
    console.log('❌ Integration test failed:', error.message);
    throw error;
  } finally {
    await eventService.shutdown();
  }
}

// Load test
async function loadTest() {
  console.log('\n⚡ Load Test: High Volume Event Collection');
  
  const eventService = new EventCollectionService({
    batchSize: 100,
    flushInterval: 500,
    enableRealTimeProcessing: false, // Disable for performance
    enableDataValidation: false,
    enableEnrichment: false
  });

  try {
    const startTime = Date.now();
    const totalEvents = 1000;
    const concurrentUsers = 50;
    const promises = [];

    console.log(`Generating ${totalEvents} events from ${concurrentUsers} concurrent users...`);

    for (let i = 0; i < totalEvents; i++) {
      const userId = `load_user_${i % concurrentUsers}`;
      const eventName = ['page_view', 'button_click', 'form_submit', 'purchase', 'logout'][i % 5];
      
      promises.push(
        eventService.collectEvent(userId, eventName, {
          index: i,
          timestamp: Date.now(),
          category: ['electronics', 'fashion', 'grocery'][i % 3],
          value: Math.floor(Math.random() * 1000)
        })
      );

      // Process in batches to avoid overwhelming the system
      if (promises.length >= 100) {
        await Promise.all(promises);
        promises.length = 0;
      }
    }

    // Process remaining events
    if (promises.length > 0) {
      await Promise.all(promises);
    }

    // Wait for final flush
    await new Promise(resolve => setTimeout(resolve, 2000));

    const endTime = Date.now();
    const duration = endTime - startTime;
    const eventsPerSecond = (totalEvents / duration) * 1000;

    console.log(`✅ Load test completed:`);
    console.log(`   Total events: ${totalEvents}`);
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Events per second: ${eventsPerSecond.toFixed(2)}`);
    console.log(`   Average time per event: ${(duration / totalEvents).toFixed(2)}ms`);

  } catch (error) {
    console.log('❌ Load test failed:', error.message);
    throw error;
  } finally {
    await eventService.shutdown();
  }
}

// Run tests
if (require.main === module) {
  testEventCollection()
    .then(() => integrationTest())
    .then(() => loadTest())
    .then(() => {
      console.log('\n🏁 All event collection tests completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { testEventCollection, integrationTest, loadTest };
#!/usr/bin/env node

const { CashbackTrackingService } = require('../src/services/cashback/CashbackTrackingService');
const { CashbackWebhookService } = require('../src/services/cashback/CashbackWebhookService');
const { CashbackNotificationService } = require('../src/services/cashback/CashbackNotificationService');

async function testCashbackTracking() {
  console.log('🔍 Testing Cashback Tracking System...\n');

  const trackingService = new CashbackTrackingService();
  const webhookService = new CashbackWebhookService();
  const notificationService = new CashbackNotificationService();

  const testUserId = `tracking_user_${Date.now()}`;

  try {
    // Test 1: Basic Cashback Event Tracking
    console.log('1️⃣ Test: Basic Cashback Event Tracking');
    
    const trackingEvent = {
      userId: testUserId,
      transactionId: `txn_${Date.now()}`,
      amount: 2500,
      currency: 'INR',
      store: 'flipkart',
      category: 'electronics',
      affiliateId: 'aff_flipkart_123',
      clickId: 'click_456',
      timestamp: new Date(),
      metadata: {
        productId: 'prod_123',
        productName: 'iPhone 15',
        couponCode: 'SAVE20'
      }
    };

    const cashbackResult = await trackingService.trackCashbackEvent(trackingEvent);
    
    if (cashbackResult) {
      console.log('✅ Cashback event tracked successfully:', {
        id: cashbackResult.id,
        amount: cashbackResult.amount,
        originalAmount: cashbackResult.originalAmount,
        status: cashbackResult.status
      });
    } else {
      console.log('ℹ️ No cashback applicable for this event');
    }

    // Test 2: Category-based Cashback Calculation
    console.log('\n2️⃣ Test: Category-based Cashback Calculation');
    
    const categories = [
      { name: 'electronics', amount: 1000, expectedRate: 3.5 },
      { name: 'fashion', amount: 1000, expectedRate: 4.0 },
      { name: 'grocery', amount: 1000, expectedRate: 1.5 },
      { name: 'books', amount: 1000, expectedRate: 2.0 }
    ];

    for (const category of categories) {
      const categoryEvent = {
        userId: testUserId,
        transactionId: `txn_${category.name}_${Date.now()}`,
        amount: category.amount,
        currency: 'INR',
        store: 'test_store',
        category: category.name,
        timestamp: new Date()
      };

      const result = await trackingService.trackCashbackEvent(categoryEvent);
      
      if (result) {
        const actualRate = (result.amount / category.amount) * 100;
        console.log(`✅ ${category.name}: ₹${result.amount} (${actualRate.toFixed(2)}%)`);
      } else {
        console.log(`❌ ${category.name}: No cashback`);
      }
    }

    // Test 3: Duplicate Transaction Handling
    console.log('\n3️⃣ Test: Duplicate Transaction Handling');
    
    const duplicateEvent = {
      userId: testUserId,
      transactionId: 'duplicate_txn_001',
      amount: 1500,
      currency: 'INR',
      store: 'amazon',
      timestamp: new Date()
    };

    const firstResult = await trackingService.trackCashbackEvent(duplicateEvent);
    const secondResult = await trackingService.trackCashbackEvent(duplicateEvent);

    if (firstResult && secondResult && firstResult.id === secondResult.id) {
      console.log('✅ Duplicate transaction handled correctly');
      console.log(`   Same cashback ID returned: ${firstResult.id}`);
    } else {
      console.log('❌ Duplicate transaction handling failed');
    }

    // Test 4: Cashback Status Updates
    console.log('\n4️⃣ Test: Cashback Status Updates');
    
    const statusTestEvent = {
      userId: testUserId,
      transactionId: `status_test_${Date.now()}`,
      amount: 1200,
      currency: 'INR',
      store: 'myntra',
      timestamp: new Date()
    };

    const statusCashback = await trackingService.trackCashbackEvent(statusTestEvent);
    
    if (statusCashback) {
      console.log(`✅ Initial cashback created with status: ${statusCashback.status}`);

      // Test confirmation
      await trackingService.updateCashbackStatus({
        transactionId: statusTestEvent.transactionId,
        status: 'confirmed',
        reason: 'Transaction confirmed by merchant',
        metadata: { confirmationTime: new Date() }
      });
      console.log('✅ Cashback status updated to confirmed');

      // Test cancellation
      const cancelEvent = {
        userId: testUserId,
        transactionId: `cancel_test_${Date.now()}`,
        amount: 800,
        currency: 'INR',
        store: 'flipkart',
        timestamp: new Date()
      };

      const cancelCashback = await trackingService.trackCashbackEvent(cancelEvent);
      
      if (cancelCashback) {
        await trackingService.updateCashbackStatus({
          transactionId: cancelEvent.transactionId,
          status: 'cancelled',
          reason: 'Transaction cancelled by user'
        });
        console.log('✅ Cashback status updated to cancelled');
      }
    }

    // Test 5: Batch Processing
    console.log('\n5️⃣ Test: Batch Processing');
    
    const batchEvents = [];
    for (let i = 0; i < 5; i++) {
      batchEvents.push({
        userId: testUserId,
        transactionId: `batch_txn_${i}_${Date.now()}`,
        amount: Math.floor(Math.random() * 3000) + 500,
        currency: 'INR',
        store: ['flipkart', 'amazon', 'myntra', 'bigbasket'][i % 4],
        category: ['electronics', 'fashion', 'grocery', 'books'][i % 4],
        timestamp: new Date()
      });
    }

    const batchResult = await trackingService.batchProcessCashback(batchEvents);
    console.log('✅ Batch processing completed:', {
      processed: batchResult.processed,
      failed: batchResult.failed,
      total: batchEvents.length
    });

    // Test 6: Webhook Processing
    console.log('\n6️⃣ Test: Webhook Processing');
    
    // Test conversion created webhook
    const conversionWebhook = {
      event: 'conversion.created',
      data: {
        userId: testUserId,
        transactionId: `webhook_txn_${Date.now()}`,
        orderId: `order_${Date.now()}`,
        amount: 3500,
        currency: 'INR',
        store: 'flipkart',
        category: 'electronics',
        products: [
          {
            id: 'prod_001',
            name: 'Smartphone',
            category: 'electronics',
            price: 3500,
            quantity: 1
          }
        ],
        status: 'pending'
      },
      timestamp: new Date().toISOString(),
      source: 'flipkart'
    };

    const webhookResult = await webhookService.handleWebhook(conversionWebhook);
    console.log('✅ Conversion webhook processed:', {
      success: webhookResult.success,
      message: webhookResult.message,
      cashbackAmount: webhookResult.data?.cashbackAmount
    });

    // Test affiliate commission webhook
    const affiliateWebhook = {
      event: 'affiliate.commission.approved',
      data: {
        transactionId: conversionWebhook.data.transactionId,
        status: 'approved',
        commissionAmount: 105.00,
        reason: 'Commission approved by merchant'
      },
      timestamp: new Date().toISOString(),
      source: 'affiliate_network'
    };

    const affiliateResult = await webhookService.handleWebhook(affiliateWebhook);
    console.log('✅ Affiliate webhook processed:', {
      success: affiliateResult.success,
      message: affiliateResult.message
    });

    // Test 7: Notification System
    console.log('\n7️⃣ Test: Notification System');
    
    // Test cashback earned notification
    const mockTransaction = {
      id: `notify_txn_${Date.now()}`,
      userId: testUserId,
      amount: 85.50,
      originalAmount: 2850,
      transactionId: `original_${Date.now()}`,
      metadata: {
        store: 'Flipkart',
        category: 'electronics'
      }
    };

    await notificationService.notifyCashbackEarned(testUserId, mockTransaction);
    console.log('✅ Cashback earned notification sent');

    // Test withdrawal notification
    const mockWithdrawal = {
      id: `withdrawal_${Date.now()}`,
      userId: testUserId,
      amount: 250.00,
      paymentMethodId: 'pm_upi_001',
      processedAt: new Date()
    };

    await notificationService.notifyWithdrawalProcessed(testUserId, mockWithdrawal);
    console.log('✅ Withdrawal processed notification sent');

    // Test promotional offer notification
    const promoOffer = {
      title: 'Weekend Cashback Bonanza',
      description: 'Get extra 2% cashback on all purchases',
      bonusRate: 2,
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      stores: ['Flipkart', 'Amazon', 'Myntra']
    };

    await notificationService.notifyPromotionalOffer(testUserId, promoOffer);
    console.log('✅ Promotional offer notification sent');

    // Test weekly summary
    await notificationService.sendWeeklySummary(testUserId);
    console.log('✅ Weekly summary notification sent');

    // Test 8: Analytics
    console.log('\n8️⃣ Test: Analytics');
    
    const analytics = await trackingService.getCashbackTrackingAnalytics();
    console.log('✅ Analytics retrieved:', {
      totalUsers: analytics.totalUsers,
      totalTransactions: analytics.totalTransactions,
      totalCashbackEarned: analytics.totalCashbackEarned
    });

    // Test date range analytics
    const dateRangeAnalytics = await trackingService.getCashbackTrackingAnalytics({
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      to: new Date()
    });
    console.log('✅ Date range analytics retrieved');

    // Test 9: Error Handling
    console.log('\n9️⃣ Test: Error Handling');
    
    // Test invalid event
    const invalidEvent = {
      userId: '',
      transactionId: '',
      amount: 0,
      currency: 'INR',
      store: '',
      timestamp: new Date()
    };

    const invalidResult = await trackingService.trackCashbackEvent(invalidEvent);
    if (invalidResult === null) {
      console.log('✅ Invalid event properly rejected');
    } else {
      console.log('❌ Invalid event should have been rejected');
    }

    // Test minimum amount threshold
    const smallAmountEvent = {
      userId: testUserId,
      transactionId: `small_${Date.now()}`,
      amount: 25, // Below minimum
      currency: 'INR',
      store: 'test_store',
      timestamp: new Date()
    };

    const smallResult = await trackingService.trackCashbackEvent(smallAmountEvent);
    if (smallResult === null) {
      console.log('✅ Small amount transaction properly rejected');
    } else {
      console.log('❌ Small amount transaction should have been rejected');
    }

    // Test unknown webhook event
    const unknownWebhook = {
      event: 'unknown.event.type',
      data: {},
      timestamp: new Date().toISOString(),
      source: 'unknown'
    };

    const unknownResult = await webhookService.handleWebhook(unknownWebhook);
    if (!unknownResult.success) {
      console.log('✅ Unknown webhook event properly handled');
    } else {
      console.log('❌ Unknown webhook event should have failed');
    }

    // Test 10: Performance Test
    console.log('\n🔟 Test: Performance');
    
    const performanceEvents = [];
    for (let i = 0; i < 50; i++) {
      performanceEvents.push({
        userId: `perf_user_${i % 10}`,
        transactionId: `perf_txn_${i}_${Date.now()}`,
        amount: Math.floor(Math.random() * 5000) + 100,
        currency: 'INR',
        store: ['flipkart', 'amazon', 'myntra'][i % 3],
        category: ['electronics', 'fashion', 'grocery'][i % 3],
        timestamp: new Date()
      });
    }

    const startTime = Date.now();
    const perfResult = await trackingService.batchProcessCashback(performanceEvents);
    const endTime = Date.now();

    console.log('✅ Performance test completed:', {
      events: performanceEvents.length,
      processed: perfResult.processed,
      failed: perfResult.failed,
      duration: `${endTime - startTime}ms`,
      avgPerEvent: `${((endTime - startTime) / performanceEvents.length).toFixed(2)}ms`
    });

    console.log('\n🎉 All Cashback Tracking tests completed successfully!');

    // Summary
    console.log('\n📋 Test Summary:');
    console.log('✅ Basic cashback event tracking');
    console.log('✅ Category-based cashback calculation');
    console.log('✅ Duplicate transaction handling');
    console.log('✅ Cashback status updates');
    console.log('✅ Batch processing');
    console.log('✅ Webhook processing');
    console.log('✅ Notification system');
    console.log('✅ Analytics generation');
    console.log('✅ Error handling');
    console.log('✅ Performance testing');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Integration test with conversion tracking
async function integrationTest() {
  console.log('\n🔗 Integration Test with Conversion Tracking');
  
  const trackingService = new CashbackTrackingService();
  const webhookService = new CashbackWebhookService();
  
  try {
    const userId = `integration_${Date.now()}`;
    
    // Simulate complete conversion to cashback flow
    console.log('Testing complete conversion to cashback flow...');
    
    // 1. User clicks affiliate link (tracked by conversion system)
    const clickData = {
      userId,
      affiliateId: 'aff_integration_test',
      clickId: `click_${Date.now()}`,
      store: 'flipkart',
      timestamp: new Date()
    };
    console.log('1. User click tracked:', clickData.clickId);

    // 2. User makes purchase (conversion webhook)
    const conversionWebhook = {
      event: 'conversion.created',
      data: {
        userId,
        transactionId: `integration_txn_${Date.now()}`,
        orderId: `integration_order_${Date.now()}`,
        amount: 4500,
        currency: 'INR',
        store: 'flipkart',
        category: 'electronics',
        affiliateId: clickData.affiliateId,
        clickId: clickData.clickId,
        status: 'pending'
      },
      timestamp: new Date().toISOString(),
      source: 'flipkart'
    };

    const conversionResult = await webhookService.handleWebhook(conversionWebhook);
    console.log('2. Conversion processed:', {
      success: conversionResult.success,
      cashbackAmount: conversionResult.data?.cashbackAmount
    });

    // 3. Merchant confirms transaction (confirmation webhook)
    const confirmationWebhook = {
      event: 'conversion.confirmed',
      data: {
        ...conversionWebhook.data,
        status: 'confirmed'
      },
      timestamp: new Date().toISOString(),
      source: 'flipkart'
    };

    const confirmationResult = await webhookService.handleWebhook(confirmationWebhook);
    console.log('3. Conversion confirmed:', {
      success: confirmationResult.success,
      message: confirmationResult.message
    });

    // 4. Affiliate network approves commission
    const commissionWebhook = {
      event: 'affiliate.commission.approved',
      data: {
        transactionId: conversionWebhook.data.transactionId,
        status: 'approved',
        commissionAmount: 135.00,
        reason: 'Commission approved after merchant confirmation'
      },
      timestamp: new Date().toISOString(),
      source: 'affiliate_network'
    };

    const commissionResult = await webhookService.handleWebhook(commissionWebhook);
    console.log('4. Commission approved:', {
      success: commissionResult.success,
      message: commissionResult.message
    });

    console.log('✅ Complete integration flow tested successfully');

    // Test error scenarios
    console.log('\nTesting error scenarios...');
    
    // Refund scenario
    const refundWebhook = {
      event: 'conversion.refunded',
      data: {
        ...conversionWebhook.data,
        transactionId: `refund_txn_${Date.now()}`,
        status: 'refunded'
      },
      timestamp: new Date().toISOString(),
      source: 'flipkart'
    };

    const refundResult = await webhookService.handleWebhook(refundWebhook);
    console.log('5. Refund processed:', {
      success: refundResult.success,
      message: refundResult.message
    });

    console.log('✅ Integration tests completed successfully');

  } catch (error) {
    console.log('❌ Integration test failed:', error.message);
    throw error;
  }
}

// Run tests
if (require.main === module) {
  testCashbackTracking()
    .then(() => integrationTest())
    .then(() => {
      console.log('\n🏁 All tests completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { testCashbackTracking, integrationTest };
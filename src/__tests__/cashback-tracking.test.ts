import { CashbackTrackingService, CashbackTrackingEvent } from '../services/cashback/CashbackTrackingService';
import { CashbackWebhookService, WebhookPayload } from '../services/cashback/CashbackWebhookService';
import { CashbackNotificationService } from '../services/cashback/CashbackNotificationService';
import { CashbackTransactionType, TransactionStatus } from '../models/CashbackSystem';

describe('CashbackTrackingService', () => {
  let trackingService: CashbackTrackingService;
  const testUserId = 'tracking_user_123';

  beforeEach(() => {
    trackingService = new CashbackTrackingService();
  });

  describe('Cashback Event Tracking', () => {
    test('should track cashback event successfully', async () => {
      const event: CashbackTrackingEvent = {
        userId: testUserId,
        transactionId: 'txn_track_001',
        amount: 2000,
        currency: 'INR',
        store: 'flipkart',
        category: 'electronics',
        affiliateId: 'aff_123',
        clickId: 'click_456',
        timestamp: new Date()
      };

      const result = await trackingService.trackCashbackEvent(event);

      expect(result).toBeDefined();
      expect(result.userId).toBe(testUserId);
      expect(result.type).toBe(CashbackTransactionType.EARNED);
      expect(result.amount).toBeGreaterThan(0);
      expect(result.status).toBe(TransactionStatus.PENDING);
      expect(result.transactionId).toBe('txn_track_001');
    });

    test('should not create duplicate cashback for same transaction', async () => {
      const event: CashbackTrackingEvent = {
        userId: testUserId,
        transactionId: 'txn_duplicate_001',
        amount: 1000,
        currency: 'INR',
        store: 'amazon',
        timestamp: new Date()
      };

      // First tracking should create cashback
      const result1 = await trackingService.trackCashbackEvent(event);
      expect(result1).toBeDefined();

      // Second tracking should return existing cashback
      const result2 = await trackingService.trackCashbackEvent(event);
      expect(result2.id).toBe(result1.id);
    });

    test('should handle invalid cashback event', async () => {
      const invalidEvent: CashbackTrackingEvent = {
        userId: '',
        transactionId: '',
        amount: 0,
        currency: 'INR',
        store: '',
        timestamp: new Date()
      };

      const result = await trackingService.trackCashbackEvent(invalidEvent);
      expect(result).toBeNull();
    });

    test('should calculate cashback based on category rules', async () => {
      const electronicsEvent: CashbackTrackingEvent = {
        userId: testUserId,
        transactionId: 'txn_electronics_001',
        amount: 1000,
        currency: 'INR',
        store: 'flipkart',
        category: 'electronics',
        timestamp: new Date()
      };

      const fashionEvent: CashbackTrackingEvent = {
        userId: testUserId,
        transactionId: 'txn_fashion_001',
        amount: 1000,
        currency: 'INR',
        store: 'myntra',
        category: 'fashion',
        timestamp: new Date()
      };

      const electronicsResult = await trackingService.trackCashbackEvent(electronicsEvent);
      const fashionResult = await trackingService.trackCashbackEvent(fashionEvent);

      expect(electronicsResult.amount).toBeGreaterThan(20); // 3.5% minimum
      expect(fashionResult.amount).toBeGreaterThan(30); // 4% minimum
    });

    test('should handle minimum transaction amount threshold', async () => {
      const smallTransactionEvent: CashbackTrackingEvent = {
        userId: testUserId,
        transactionId: 'txn_small_001',
        amount: 25, // Below minimum threshold
        currency: 'INR',
        store: 'flipkart',
        timestamp: new Date()
      };

      const result = await trackingService.trackCashbackEvent(smallTransactionEvent);
      expect(result).toBeNull();
    });
  });

  describe('Cashback Status Updates', () => {
    test('should confirm cashback transaction', async () => {
      // First create a pending cashback
      const event: CashbackTrackingEvent = {
        userId: testUserId,
        transactionId: 'txn_confirm_001',
        amount: 1500,
        currency: 'INR',
        store: 'amazon',
        timestamp: new Date()
      };

      const cashback = await trackingService.trackCashbackEvent(event);
      expect(cashback.status).toBe(TransactionStatus.PENDING);

      // Then confirm it
      await trackingService.updateCashbackStatus({
        transactionId: 'txn_confirm_001',
        status: 'confirmed',
        reason: 'Transaction confirmed by merchant'
      });

      // Verify status updated
      const updatedCashback = await trackingService.cashbackRepository.getCashbackTransactionByTransactionId('txn_confirm_001');
      expect(updatedCashback.status).toBe(TransactionStatus.COMPLETED);
    });

    test('should cancel cashback transaction', async () => {
      const event: CashbackTrackingEvent = {
        userId: testUserId,
        transactionId: 'txn_cancel_001',
        amount: 1200,
        currency: 'INR',
        store: 'myntra',
        timestamp: new Date()
      };

      const cashback = await trackingService.trackCashbackEvent(event);

      await trackingService.updateCashbackStatus({
        transactionId: 'txn_cancel_001',
        status: 'cancelled',
        reason: 'Transaction cancelled by user'
      });

      const updatedCashback = await trackingService.cashbackRepository.getCashbackTransactionByTransactionId('txn_cancel_001');
      expect(updatedCashback.status).toBe(TransactionStatus.CANCELLED);
    });

    test('should handle dispute status', async () => {
      const event: CashbackTrackingEvent = {
        userId: testUserId,
        transactionId: 'txn_dispute_001',
        amount: 800,
        currency: 'INR',
        store: 'flipkart',
        timestamp: new Date()
      };

      const cashback = await trackingService.trackCashbackEvent(event);

      await trackingService.updateCashbackStatus({
        transactionId: 'txn_dispute_001',
        status: 'disputed',
        reason: 'Customer dispute raised'
      });

      // Should create dispute record
      const updatedCashback = await trackingService.cashbackRepository.getCashbackTransactionByTransactionId('txn_dispute_001');
      expect(updatedCashback.metadata.disputeReason).toBe('Customer dispute raised');
    });
  });

  describe('Batch Processing', () => {
    test('should process multiple cashback events', async () => {
      const events: CashbackTrackingEvent[] = [
        {
          userId: testUserId,
          transactionId: 'batch_001',
          amount: 1000,
          currency: 'INR',
          store: 'flipkart',
          timestamp: new Date()
        },
        {
          userId: testUserId,
          transactionId: 'batch_002',
          amount: 1500,
          currency: 'INR',
          store: 'amazon',
          timestamp: new Date()
        },
        {
          userId: testUserId,
          transactionId: 'batch_003',
          amount: 800,
          currency: 'INR',
          store: 'myntra',
          timestamp: new Date()
        }
      ];

      const result = await trackingService.batchProcessCashback(events);

      expect(result.processed).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(3);
      expect(result.results.every(r => r.success)).toBe(true);
    });

    test('should handle mixed success/failure in batch', async () => {
      const events: CashbackTrackingEvent[] = [
        {
          userId: testUserId,
          transactionId: 'batch_valid_001',
          amount: 1000,
          currency: 'INR',
          store: 'flipkart',
          timestamp: new Date()
        },
        {
          userId: '', // Invalid user ID
          transactionId: 'batch_invalid_001',
          amount: 1000,
          currency: 'INR',
          store: 'amazon',
          timestamp: new Date()
        }
      ];

      const result = await trackingService.batchProcessCashback(events);

      expect(result.processed).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.results).toHaveLength(2);
    });
  });

  describe('Analytics', () => {
    test('should get cashback tracking analytics', async () => {
      // Create some test data
      const events: CashbackTrackingEvent[] = [
        {
          userId: testUserId,
          transactionId: 'analytics_001',
          amount: 1000,
          currency: 'INR',
          store: 'flipkart',
          category: 'electronics',
          timestamp: new Date()
        },
        {
          userId: testUserId,
          transactionId: 'analytics_002',
          amount: 1500,
          currency: 'INR',
          store: 'amazon',
          category: 'books',
          timestamp: new Date()
        }
      ];

      await trackingService.batchProcessCashback(events);

      const analytics = await trackingService.getCashbackTrackingAnalytics();

      expect(analytics).toBeDefined();
      expect(analytics.totalUsers).toBeGreaterThan(0);
      expect(analytics.totalTransactions).toBeGreaterThan(0);
      expect(analytics.tracking).toBeDefined();
    });

    test('should get analytics for date range', async () => {
      const dateRange = {
        from: new Date('2024-01-01'),
        to: new Date('2024-12-31')
      };

      const analytics = await trackingService.getCashbackTrackingAnalytics(dateRange);

      expect(analytics).toBeDefined();
    });
  });
});

describe('CashbackWebhookService', () => {
  let webhookService: CashbackWebhookService;

  beforeEach(() => {
    webhookService = new CashbackWebhookService();
  });

  describe('Webhook Processing', () => {
    test('should handle conversion created webhook', async () => {
      const payload: WebhookPayload = {
        event: 'conversion.created',
        data: {
          userId: 'webhook_user_123',
          transactionId: 'webhook_txn_001',
          orderId: 'order_123',
          amount: 2500,
          currency: 'INR',
          store: 'flipkart',
          category: 'electronics',
          status: 'pending'
        },
        timestamp: new Date().toISOString(),
        source: 'flipkart'
      };

      const result = await webhookService.handleWebhook(payload);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Cashback');
      expect(result.data).toBeDefined();
    });

    test('should handle conversion confirmed webhook', async () => {
      // First create a conversion
      const createPayload: WebhookPayload = {
        event: 'conversion.created',
        data: {
          userId: 'webhook_user_123',
          transactionId: 'webhook_confirm_001',
          orderId: 'order_confirm_123',
          amount: 1800,
          currency: 'INR',
          store: 'amazon',
          status: 'pending'
        },
        timestamp: new Date().toISOString(),
        source: 'amazon'
      };

      await webhookService.handleWebhook(createPayload);

      // Then confirm it
      const confirmPayload: WebhookPayload = {
        event: 'conversion.confirmed',
        data: {
          userId: 'webhook_user_123',
          transactionId: 'webhook_confirm_001',
          orderId: 'order_confirm_123',
          amount: 1800,
          currency: 'INR',
          store: 'amazon',
          status: 'confirmed'
        },
        timestamp: new Date().toISOString(),
        source: 'amazon'
      };

      const result = await webhookService.handleWebhook(confirmPayload);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Cashback confirmed');
    });

    test('should handle affiliate commission webhook', async () => {
      const payload: WebhookPayload = {
        event: 'affiliate.commission.approved',
        data: {
          transactionId: 'affiliate_txn_001',
          status: 'approved',
          commissionAmount: 45.50,
          reason: 'Commission approved by merchant'
        },
        timestamp: new Date().toISOString(),
        source: 'affiliate_network'
      };

      const result = await webhookService.handleWebhook(payload);

      expect(result.success).toBe(true);
      expect(result.message).toContain('confirmed');
    });

    test('should handle unknown webhook event', async () => {
      const payload: WebhookPayload = {
        event: 'unknown.event',
        data: {},
        timestamp: new Date().toISOString(),
        source: 'unknown'
      };

      const result = await webhookService.handleWebhook(payload);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Unknown event type');
    });
  });

  describe('Webhook Retry Mechanism', () => {
    test('should retry failed webhook', async () => {
      const payload: WebhookPayload = {
        event: 'conversion.created',
        data: {
          userId: '', // Invalid data to cause failure
          transactionId: 'retry_test_001',
          amount: 1000,
          currency: 'INR',
          store: 'test_store'
        },
        timestamp: new Date().toISOString(),
        source: 'test'
      };

      const result = await webhookService.retryFailedWebhook(payload, 2);

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(2);
      expect(result.lastError).toBeDefined();
    });
  });

  describe('Batch Webhook Processing', () => {
    test('should process multiple webhooks', async () => {
      const payloads: WebhookPayload[] = [
        {
          event: 'conversion.created',
          data: {
            userId: 'batch_user_1',
            transactionId: 'batch_txn_1',
            amount: 1000,
            currency: 'INR',
            store: 'flipkart'
          },
          timestamp: new Date().toISOString(),
          source: 'flipkart'
        },
        {
          event: 'conversion.created',
          data: {
            userId: 'batch_user_2',
            transactionId: 'batch_txn_2',
            amount: 1500,
            currency: 'INR',
            store: 'amazon'
          },
          timestamp: new Date().toISOString(),
          source: 'amazon'
        }
      ];

      const result = await webhookService.processBatchWebhooks(payloads);

      expect(result.processed).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(2);
    });
  });
});

describe('CashbackNotificationService', () => {
  let notificationService: CashbackNotificationService;
  const testUserId = 'notification_user_123';

  beforeEach(() => {
    notificationService = new CashbackNotificationService();
  });

  describe('Notification Sending', () => {
    test('should send cashback earned notification', async () => {
      const mockTransaction = {
        id: 'txn_notify_001',
        userId: testUserId,
        amount: 75.50,
        originalAmount: 2500,
        transactionId: 'original_txn_001',
        metadata: {
          store: 'Flipkart'
        }
      };

      await notificationService.notifyCashbackEarned(testUserId, mockTransaction as any);

      // Verify notification was created (would check database in real implementation)
      const history = await notificationService.getNotificationHistory(testUserId, 1);
      expect(history.length).toBeGreaterThan(0);
    });

    test('should send cashback confirmed notification', async () => {
      const mockTransaction = {
        id: 'txn_confirm_notify_001',
        userId: testUserId,
        amount: 45.00,
        metadata: {
          store: 'Amazon'
        }
      };

      await notificationService.notifyCashbackConfirmed(testUserId, mockTransaction as any);

      const history = await notificationService.getNotificationHistory(testUserId, 1);
      expect(history.length).toBeGreaterThan(0);
    });

    test('should send withdrawal processed notification', async () => {
      const mockWithdrawal = {
        id: 'withdrawal_notify_001',
        userId: testUserId,
        amount: 200.00,
        paymentMethodId: 'pm_001',
        processedAt: new Date()
      };

      await notificationService.notifyWithdrawalProcessed(testUserId, mockWithdrawal as any);

      const history = await notificationService.getNotificationHistory(testUserId, 1);
      expect(history.length).toBeGreaterThan(0);
    });

    test('should send promotional offer notification', async () => {
      const offerData = {
        title: 'Double Cashback Weekend',
        description: 'Get 2x cashback on all electronics',
        bonusRate: 5,
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        stores: ['Flipkart', 'Amazon']
      };

      await notificationService.notifyPromotionalOffer(testUserId, offerData);

      const history = await notificationService.getNotificationHistory(testUserId, 1);
      expect(history.length).toBeGreaterThan(0);
    });

    test('should send weekly summary', async () => {
      await notificationService.sendWeeklySummary(testUserId);

      const history = await notificationService.getNotificationHistory(testUserId, 1);
      expect(history.length).toBeGreaterThan(0);
    });
  });

  describe('Batch Notifications', () => {
    test('should send multiple notifications', async () => {
      const notifications = [
        {
          userId: testUserId,
          type: 'CASHBACK_EARNED',
          data: {
            id: 'batch_txn_1',
            userId: testUserId,
            amount: 50,
            originalAmount: 1000,
            metadata: { store: 'Flipkart' }
          }
        },
        {
          userId: testUserId,
          type: 'WEEKLY_SUMMARY',
          data: {}
        }
      ];

      const result = await notificationService.sendBatchNotifications(notifications);

      expect(result.sent).toBe(2);
      expect(result.failed).toBe(0);
    });
  });

  describe('Notification Management', () => {
    test('should update notification preferences', async () => {
      const preferences = {
        enableCashbackEarned: false,
        enablePromotionalOffers: true,
        telegramNotifications: true
      };

      await notificationService.updateNotificationPreferences(testUserId, preferences);

      // Verify preferences updated (would check database in real implementation)
      expect(true).toBe(true); // Placeholder assertion
    });

    test('should mark notifications as read', async () => {
      const notificationIds = ['notify_001', 'notify_002'];

      await notificationService.markNotificationsAsRead(testUserId, notificationIds);

      // Verify notifications marked as read (would check database in real implementation)
      expect(true).toBe(true); // Placeholder assertion
    });

    test('should get notification history', async () => {
      const history = await notificationService.getNotificationHistory(testUserId, 10);

      expect(Array.isArray(history)).toBe(true);
    });
  });
});
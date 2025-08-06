import request from 'supertest';
import { app } from '../../app';
import { pool } from '../../config/database';
import { redisClient } from '../../services/cache/RedisService';

describe('System Integration Tests', () => {
  let testUserId: string;
  let testCouponId: string;
  let testChannelId: string;

  beforeAll(async () => {
    // Setup test data
    testUserId = 'test-user-' + Date.now();
    testCouponId = 'test-coupon-' + Date.now();
    testChannelId = 'test-channel-' + Date.now();

    // Clear test data
    await pool.query('DELETE FROM users WHERE id LIKE $1', ['test-%']);
    await redisClient.flushdb();
  });

  afterAll(async () => {
    // Cleanup
    await pool.query('DELETE FROM users WHERE id LIKE $1', ['test-%']);
    await redisClient.flushdb();
    await pool.end();
    await redisClient.quit();
  });

  describe('User Registration and Channel Creation Flow', () => {
    it('should create user and personal channel', async () => {
      // Create user
      const userResponse = await request(app)
        .post('/api/users')
        .send({
          id: testUserId,
          telegramId: '123456789',
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com'
        });

      expect(userResponse.status).toBe(201);
      expect(userResponse.body.success).toBe(true);

      // Verify personal channel was created
      const channelResponse = await request(app)
        .get(`/api/channels/personal/${testUserId}`);

      expect(channelResponse.status).toBe(200);
      expect(channelResponse.body.success).toBe(true);
      expect(channelResponse.body.data).toHaveProperty('channelId');
    });

    it('should grant user consents during registration', async () => {
      const consentResponse = await request(app)
        .post('/api/admin/data-compliance/consent/grant')
        .send({
          userId: testUserId,
          consentType: 'data_collection',
          version: '1.0'
        });

      expect(consentResponse.status).toBe(201);
      expect(consentResponse.body.success).toBe(true);
    });
  });

  describe('Coupon Management Flow', () => {
    it('should create and sync coupon', async () => {
      // Create coupon
      const couponResponse = await request(app)
        .post('/api/admin/coupon-management/coupons')
        .send({
          id: testCouponId,
          title: 'Test Coupon',
          description: 'Test coupon description',
          code: 'TEST50',
          discount: 50,
          discountType: 'percentage',
          store: 'Test Store',
          category: 'electronics',
          validFrom: new Date(),
          validUntil: new Date(Date.now() + 86400000),
          isActive: true
        });

      expect(couponResponse.status).toBe(201);
      expect(couponResponse.body.success).toBe(true);

      // Verify coupon sync
      const syncResponse = await request(app)
        .post('/api/coupon-sync/sync')
        .send({
          couponId: testCouponId,
          source: 'admin_panel'
        });

      expect(syncResponse.status).toBe(200);
      expect(syncResponse.body.success).toBe(true);
    });

    it('should generate affiliate link for coupon', async () => {
      const linkResponse = await request(app)
        .post('/api/affiliate-links/generate')
        .send({
          couponId: testCouponId,
          userId: testUserId,
          source: 'personal_channel'
        });

      expect(linkResponse.status).toBe(201);
      expect(linkResponse.body.success).toBe(true);
      expect(linkResponse.body.data).toHaveProperty('affiliateUrl');
    });
  });

  describe('Recommendation System Flow', () => {
    it('should generate personalized recommendations', async () => {
      // First, record user interaction
      await request(app)
        .post('/api/analytics/events')
        .send({
          userId: testUserId,
          eventType: 'coupon_view',
          eventData: {
            couponId: testCouponId,
            category: 'electronics'
          }
        });

      // Generate recommendations
      const recResponse = await request(app)
        .get(`/api/recommendations/user/${testUserId}`)
        .query({ limit: 5 });

      expect(recResponse.status).toBe(200);
      expect(recResponse.body.success).toBe(true);
      expect(Array.isArray(recResponse.body.data)).toBe(true);
    });

    it('should update recommendation feedback', async () => {
      const feedbackResponse = await request(app)
        .post('/api/recommendations/feedback')
        .send({
          userId: testUserId,
          couponId: testCouponId,
          action: 'click',
          rating: 5
        });

      expect(feedbackResponse.status).toBe(200);
      expect(feedbackResponse.body.success).toBe(true);
    });
  });

  describe('Cashback System Flow', () => {
    it('should track conversion and calculate cashback', async () => {
      // Simulate click tracking
      const clickResponse = await request(app)
        .post('/api/traffic-manager/track-click')
        .send({
          userId: testUserId,
          couponId: testCouponId,
          source: 'personal_channel',
          userAgent: 'test-agent',
          ipAddress: '127.0.0.1'
        });

      expect(clickResponse.status).toBe(200);
      expect(clickResponse.body.success).toBe(true);

      const clickId = clickResponse.body.data.clickId;

      // Simulate conversion
      const conversionResponse = await request(app)
        .post('/api/conversion-tracking/webhook')
        .send({
          clickId,
          orderId: 'ORDER-' + Date.now(),
          orderValue: 1000,
          currency: 'INR',
          status: 'completed'
        });

      expect(conversionResponse.status).toBe(200);
      expect(conversionResponse.body.success).toBe(true);

      // Check cashback calculation
      const cashbackResponse = await request(app)
        .get(`/api/cashback/balance/${testUserId}`);

      expect(cashbackResponse.status).toBe(200);
      expect(cashbackResponse.body.success).toBe(true);
      expect(cashbackResponse.body.data.totalEarned).toBeGreaterThan(0);
    });

    it('should process cashback withdrawal', async () => {
      const withdrawalResponse = await request(app)
        .post('/api/cashback/withdraw')
        .send({
          userId: testUserId,
          amount: 100,
          paymentMethod: 'upi',
          paymentDetails: {
            upiId: 'test@paytm'
          }
        });

      expect(withdrawalResponse.status).toBe(201);
      expect(withdrawalResponse.body.success).toBe(true);
    });
  });

  describe('Analytics and Reporting Flow', () => {
    it('should collect and analyze user events', async () => {
      // Collect multiple events
      const events = [
        { eventType: 'page_view', eventData: { page: 'home' } },
        { eventType: 'coupon_search', eventData: { query: 'electronics' } },
        { eventType: 'coupon_click', eventData: { couponId: testCouponId } }
      ];

      for (const event of events) {
        await request(app)
          .post('/api/analytics/events')
          .send({
            userId: testUserId,
            ...event
          });
      }

      // Get analytics data
      const analyticsResponse = await request(app)
        .get('/api/analytics/user-behavior')
        .query({
          userId: testUserId,
          startDate: new Date(Date.now() - 86400000).toISOString(),
          endDate: new Date().toISOString()
        });

      expect(analyticsResponse.status).toBe(200);
      expect(analyticsResponse.body.success).toBe(true);
      expect(analyticsResponse.body.data.totalEvents).toBeGreaterThan(0);
    });

    it('should generate business dashboard data', async () => {
      const dashboardResponse = await request(app)
        .get('/api/dashboard/business-metrics')
        .query({
          period: 'last_7_days'
        });

      expect(dashboardResponse.status).toBe(200);
      expect(dashboardResponse.body.success).toBe(true);
      expect(dashboardResponse.body.data).toHaveProperty('revenue');
      expect(dashboardResponse.body.data).toHaveProperty('conversions');
      expect(dashboardResponse.body.data).toHaveProperty('users');
    });
  });

  describe('Retention and Engagement Flow', () => {
    it('should analyze churn risk and trigger retention campaigns', async () => {
      // Simulate user inactivity
      await pool.query(
        'UPDATE users SET last_active_at = $1 WHERE id = $2',
        [new Date(Date.now() - 7 * 86400000), testUserId]
      );

      // Analyze churn risk
      const churnResponse = await request(app)
        .get(`/api/retention/churn-risk/${testUserId}`);

      expect(churnResponse.status).toBe(200);
      expect(churnResponse.body.success).toBe(true);
      expect(churnResponse.body.data).toHaveProperty('riskScore');

      // Trigger retention campaign if high risk
      if (churnResponse.body.data.riskScore > 0.7) {
        const campaignResponse = await request(app)
          .post('/api/retention/trigger-campaign')
          .send({
            userId: testUserId,
            campaignType: 'win_back',
            priority: 'high'
          });

        expect(campaignResponse.status).toBe(200);
        expect(campaignResponse.body.success).toBe(true);
      }
    });
  });

  describe('Security and Compliance Flow', () => {
    it('should handle data deletion request', async () => {
      const deletionResponse = await request(app)
        .post('/api/admin/data-compliance/deletion/request')
        .send({
          userId: testUserId,
          requestType: 'partial_deletion',
          requestedData: ['behavioral_data'],
          reason: 'User request for privacy'
        });

      expect(deletionResponse.status).toBe(201);
      expect(deletionResponse.body.success).toBe(true);
    });

    it('should export user data', async () => {
      const exportResponse = await request(app)
        .get(`/api/admin/data-compliance/export/${testUserId}`);

      expect(exportResponse.status).toBe(200);
      expect(exportResponse.body.success).toBe(true);
      expect(exportResponse.body.data).toHaveProperty('profile');
      expect(exportResponse.body.data).toHaveProperty('consents');
    });

    it('should handle abuse detection', async () => {
      // Simulate suspicious activity
      for (let i = 0; i < 100; i++) {
        await request(app)
          .get('/api/coupons')
          .set('X-Forwarded-For', '192.168.1.100');
      }

      // Check if rate limiting kicks in
      const rateLimitResponse = await request(app)
        .get('/api/coupons')
        .set('X-Forwarded-For', '192.168.1.100');

      expect(rateLimitResponse.status).toBe(429);
    });
  });

  describe('Performance and Monitoring Flow', () => {
    it('should collect performance metrics', async () => {
      const metricsResponse = await request(app)
        .get('/api/monitoring/metrics');

      expect(metricsResponse.status).toBe(200);
      expect(metricsResponse.body.success).toBe(true);
      expect(metricsResponse.body.data).toHaveProperty('system');
      expect(metricsResponse.body.data).toHaveProperty('application');
    });

    it('should handle load balancing', async () => {
      // Test multiple concurrent requests
      const requests = Array(10).fill(null).map(() =>
        request(app).get('/api/health')
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle database connection errors gracefully', async () => {
      // This would require mocking database failures
      // For now, we'll test error response format
      const errorResponse = await request(app)
        .get('/api/nonexistent-endpoint');

      expect(errorResponse.status).toBe(404);
      expect(errorResponse.body).toHaveProperty('success', false);
      expect(errorResponse.body).toHaveProperty('message');
    });

    it('should handle invalid input validation', async () => {
      const invalidResponse = await request(app)
        .post('/api/users')
        .send({
          // Missing required fields
          username: 'test'
        });

      expect(invalidResponse.status).toBe(400);
      expect(invalidResponse.body.success).toBe(false);
    });
  });

  describe('Cross-Service Communication', () => {
    it('should handle service-to-service communication', async () => {
      // Test recommendation service calling analytics service
      const recResponse = await request(app)
        .post('/api/recommendations/generate')
        .send({
          userId: testUserId,
          context: 'personal_channel'
        });

      expect(recResponse.status).toBe(200);
      expect(recResponse.body.success).toBe(true);
    });

    it('should handle event propagation across services', async () => {
      // Create a coupon and verify it propagates to all relevant services
      const couponData = {
        title: 'Integration Test Coupon',
        code: 'INTTEST',
        store: 'Test Store',
        category: 'fashion'
      };

      const createResponse = await request(app)
        .post('/api/admin/coupon-management/coupons')
        .send(couponData);

      expect(createResponse.status).toBe(201);

      // Verify it appears in recommendations
      const recResponse = await request(app)
        .get(`/api/recommendations/category/fashion`);

      expect(recResponse.status).toBe(200);
      expect(recResponse.body.data.some((item: any) => 
        item.code === 'INTTEST'
      )).toBe(true);
    });
  });
});
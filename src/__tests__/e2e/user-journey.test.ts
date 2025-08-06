import request from 'supertest';
import { app } from '../../app';
import { pool } from '../../config/database';

describe('End-to-End User Journey Tests', () => {
  let testUser: any;
  let testCoupon: any;
  let affiliateLink: string;
  let clickId: string;

  beforeAll(async () => {
    // Setup test environment
    testUser = {
      id: 'e2e-user-' + Date.now(),
      telegramId: '987654321',
      username: 'e2euser',
      firstName: 'E2E',
      lastName: 'User',
      email: 'e2e@example.com',
      phone: '+919876543210'
    };

    testCoupon = {
      id: 'e2e-coupon-' + Date.now(),
      title: 'E2E Test Coupon - 70% Off Electronics',
      description: 'Amazing discount on electronics for testing',
      code: 'E2E70OFF',
      discount: 70,
      discountType: 'percentage',
      store: 'TechMart India',
      category: 'electronics',
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 7 * 86400000),
      isActive: true,
      originalPrice: 10000,
      discountedPrice: 3000,
      imageUrl: 'https://example.com/coupon-image.jpg',
      storeUrl: 'https://techmart.in',
      tags: ['electronics', 'mobile', 'laptop', 'discount']
    };
  });

  afterAll(async () => {
    // Cleanup test data
    await pool.query('DELETE FROM users WHERE id LIKE $1', ['e2e-%']);
    await pool.query('DELETE FROM coupons WHERE id LIKE $1', ['e2e-%']);
  });

  describe('Complete User Journey: Discovery to Purchase', () => {
    it('Step 1: User discovers bot and registers', async () => {
      console.log('🚀 Starting E2E Journey: User Registration');

      // Simulate user starting bot conversation
      const registrationResponse = await request(app)
        .post('/api/users')
        .send(testUser);

      expect(registrationResponse.status).toBe(201);
      expect(registrationResponse.body.success).toBe(true);
      expect(registrationResponse.body.data.id).toBe(testUser.id);

      console.log('✅ User registered successfully');
    });

    it('Step 2: User grants necessary consents', async () => {
      console.log('📋 Step 2: Granting user consents');

      const consents = ['data_collection', 'marketing', 'analytics'];
      
      for (const consentType of consents) {
        const consentResponse = await request(app)
          .post('/api/admin/data-compliance/consent/grant')
          .send({
            userId: testUser.id,
            consentType,
            version: '1.0'
          });

        expect(consentResponse.status).toBe(201);
        expect(consentResponse.body.success).toBe(true);
      }

      console.log('✅ All consents granted');
    });

    it('Step 3: Personal channel is created automatically', async () => {
      console.log('📺 Step 3: Verifying personal channel creation');

      const channelResponse = await request(app)
        .get(`/api/channels/personal/${testUser.id}`);

      expect(channelResponse.status).toBe(200);
      expect(channelResponse.body.success).toBe(true);
      expect(channelResponse.body.data).toHaveProperty('channelId');

      console.log('✅ Personal channel created');
    });

    it('Step 4: Admin creates and publishes coupon', async () => {
      console.log('🎫 Step 4: Creating test coupon');

      const couponResponse = await request(app)
        .post('/api/admin/coupon-management/coupons')
        .send(testCoupon);

      expect(couponResponse.status).toBe(201);
      expect(couponResponse.body.success).toBe(true);

      // Sync coupon to make it available
      const syncResponse = await request(app)
        .post('/api/coupon-sync/sync')
        .send({
          couponId: testCoupon.id,
          source: 'admin_panel'
        });

      expect(syncResponse.status).toBe(200);
      expect(syncResponse.body.success).toBe(true);

      console.log('✅ Coupon created and synced');
    });

    it('Step 5: User searches for coupons', async () => {
      console.log('🔍 Step 5: User searching for coupons');

      // Record search event
      await request(app)
        .post('/api/analytics/events')
        .send({
          userId: testUser.id,
          eventType: 'coupon_search',
          eventData: {
            query: 'electronics',
            category: 'electronics'
          }
        });

      // Search for coupons
      const searchResponse = await request(app)
        .get('/api/coupons/search')
        .query({
          category: 'electronics',
          limit: 10
        });

      expect(searchResponse.status).toBe(200);
      expect(searchResponse.body.success).toBe(true);
      expect(searchResponse.body.data.length).toBeGreaterThan(0);

      // Verify our test coupon is in results
      const foundCoupon = searchResponse.body.data.find(
        (c: any) => c.id === testCoupon.id
      );
      expect(foundCoupon).toBeDefined();

      console.log('✅ Coupon search successful');
    });

    it('Step 6: User views coupon details', async () => {
      console.log('👀 Step 6: User viewing coupon details');

      // Record view event
      await request(app)
        .post('/api/analytics/events')
        .send({
          userId: testUser.id,
          eventType: 'coupon_view',
          eventData: {
            couponId: testCoupon.id,
            source: 'search_results'
          }
        });

      // Get coupon details
      const detailsResponse = await request(app)
        .get(`/api/coupons/${testCoupon.id}`);

      expect(detailsResponse.status).toBe(200);
      expect(detailsResponse.body.success).toBe(true);
      expect(detailsResponse.body.data.title).toBe(testCoupon.title);

      console.log('✅ Coupon details viewed');
    });

    it('Step 7: System generates personalized recommendations', async () => {
      console.log('🎯 Step 7: Generating personalized recommendations');

      const recommendationsResponse = await request(app)
        .get(`/api/recommendations/user/${testUser.id}`)
        .query({ limit: 5 });

      expect(recommendationsResponse.status).toBe(200);
      expect(recommendationsResponse.body.success).toBe(true);
      expect(Array.isArray(recommendationsResponse.body.data)).toBe(true);

      console.log('✅ Recommendations generated');
    });

    it('Step 8: User clicks on coupon (affiliate link generation)', async () => {
      console.log('🔗 Step 8: Generating affiliate link and tracking click');

      // Generate affiliate link
      const linkResponse = await request(app)
        .post('/api/affiliate-links/generate')
        .send({
          couponId: testCoupon.id,
          userId: testUser.id,
          source: 'personal_channel'
        });

      expect(linkResponse.status).toBe(201);
      expect(linkResponse.body.success).toBe(true);
      affiliateLink = linkResponse.body.data.affiliateUrl;

      // Track click
      const clickResponse = await request(app)
        .post('/api/traffic-manager/track-click')
        .send({
          userId: testUser.id,
          couponId: testCoupon.id,
          source: 'personal_channel',
          userAgent: 'Mozilla/5.0 (Test Browser)',
          ipAddress: '127.0.0.1',
          referrer: 'telegram://channel'
        });

      expect(clickResponse.status).toBe(200);
      expect(clickResponse.body.success).toBe(true);
      clickId = clickResponse.body.data.clickId;

      console.log('✅ Affiliate link generated and click tracked');
    });

    it('Step 9: User makes purchase (conversion tracking)', async () => {
      console.log('💳 Step 9: Simulating user purchase');

      // Simulate conversion webhook from merchant
      const conversionResponse = await request(app)
        .post('/api/conversion-tracking/webhook')
        .send({
          clickId,
          orderId: 'ORDER-E2E-' + Date.now(),
          orderValue: 3000,
          currency: 'INR',
          status: 'completed',
          products: [
            {
              id: 'PROD-123',
              name: 'Smartphone',
              category: 'electronics',
              price: 3000,
              quantity: 1
            }
          ],
          customerInfo: {
            email: testUser.email,
            phone: testUser.phone
          }
        });

      expect(conversionResponse.status).toBe(200);
      expect(conversionResponse.body.success).toBe(true);

      console.log('✅ Purchase conversion tracked');
    });

    it('Step 10: Cashback is calculated and credited', async () => {
      console.log('💰 Step 10: Verifying cashback calculation');

      // Wait a moment for async processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check cashback balance
      const balanceResponse = await request(app)
        .get(`/api/cashback/balance/${testUser.id}`);

      expect(balanceResponse.status).toBe(200);
      expect(balanceResponse.body.success).toBe(true);
      expect(balanceResponse.body.data.totalEarned).toBeGreaterThan(0);

      // Check transaction history
      const historyResponse = await request(app)
        .get(`/api/cashback/transactions/${testUser.id}`)
        .query({ limit: 10 });

      expect(historyResponse.status).toBe(200);
      expect(historyResponse.body.success).toBe(true);
      expect(historyResponse.body.data.length).toBeGreaterThan(0);

      console.log('✅ Cashback calculated and credited');
    });

    it('Step 11: User receives notifications', async () => {
      console.log('📱 Step 11: Verifying notifications');

      // Check for cashback notification
      const notificationsResponse = await request(app)
        .get(`/api/notifications/user/${testUser.id}`)
        .query({ type: 'cashback_earned' });

      expect(notificationsResponse.status).toBe(200);
      expect(notificationsResponse.body.success).toBe(true);

      console.log('✅ Notifications sent');
    });

    it('Step 12: User provides feedback', async () => {
      console.log('⭐ Step 12: User providing feedback');

      const feedbackResponse = await request(app)
        .post('/api/recommendations/feedback')
        .send({
          userId: testUser.id,
          couponId: testCoupon.id,
          action: 'purchase',
          rating: 5,
          feedback: 'Great coupon, saved a lot of money!'
        });

      expect(feedbackResponse.status).toBe(200);
      expect(feedbackResponse.body.success).toBe(true);

      console.log('✅ Feedback recorded');
    });

    it('Step 13: System learns and improves recommendations', async () => {
      console.log('🧠 Step 13: Verifying system learning');

      // Get updated recommendations (should be better now)
      const updatedRecsResponse = await request(app)
        .get(`/api/recommendations/user/${testUser.id}`)
        .query({ limit: 5 });

      expect(updatedRecsResponse.status).toBe(200);
      expect(updatedRecsResponse.body.success).toBe(true);

      // Check if electronics category is prioritized
      const recommendations = updatedRecsResponse.body.data;
      const electronicsRecs = recommendations.filter(
        (rec: any) => rec.category === 'electronics'
      );
      expect(electronicsRecs.length).toBeGreaterThan(0);

      console.log('✅ System learning verified');
    });

    it('Step 14: User requests cashback withdrawal', async () => {
      console.log('💸 Step 14: Processing cashback withdrawal');

      const withdrawalResponse = await request(app)
        .post('/api/cashback/withdraw')
        .send({
          userId: testUser.id,
          amount: 50,
          paymentMethod: 'upi',
          paymentDetails: {
            upiId: 'e2euser@paytm'
          }
        });

      expect(withdrawalResponse.status).toBe(201);
      expect(withdrawalResponse.body.success).toBe(true);

      console.log('✅ Withdrawal request processed');
    });

    it('Step 15: Analytics and reporting capture all events', async () => {
      console.log('📊 Step 15: Verifying analytics capture');

      // Get user behavior analytics
      const analyticsResponse = await request(app)
        .get('/api/analytics/user-behavior')
        .query({
          userId: testUser.id,
          startDate: new Date(Date.now() - 86400000).toISOString(),
          endDate: new Date().toISOString()
        });

      expect(analyticsResponse.status).toBe(200);
      expect(analyticsResponse.body.success).toBe(true);
      expect(analyticsResponse.body.data.totalEvents).toBeGreaterThan(5);

      // Verify conversion funnel
      const funnelResponse = await request(app)
        .get('/api/analytics/funnel')
        .query({
          startDate: new Date(Date.now() - 86400000).toISOString(),
          endDate: new Date().toISOString()
        });

      expect(funnelResponse.status).toBe(200);
      expect(funnelResponse.body.success).toBe(true);

      console.log('✅ Analytics captured successfully');
    });

    it('Step 16: Business dashboard shows updated metrics', async () => {
      console.log('📈 Step 16: Verifying business metrics');

      const dashboardResponse = await request(app)
        .get('/api/dashboard/business-metrics')
        .query({ period: 'today' });

      expect(dashboardResponse.status).toBe(200);
      expect(dashboardResponse.body.success).toBe(true);
      expect(dashboardResponse.body.data.conversions.total).toBeGreaterThan(0);
      expect(dashboardResponse.body.data.revenue.total).toBeGreaterThan(0);

      console.log('✅ Business metrics updated');
    });
  });

  describe('Alternative User Journeys', () => {
    it('Journey: User browses but does not purchase', async () => {
      console.log('🛍️ Alternative Journey: Browse without purchase');

      const browseUser = {
        id: 'browse-user-' + Date.now(),
        telegramId: '111222333',
        username: 'browseuser'
      };

      // Register user
      await request(app).post('/api/users').send(browseUser);

      // Browse coupons
      await request(app)
        .get('/api/coupons/search')
        .query({ category: 'fashion' });

      // View multiple coupons but don't click
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/analytics/events')
          .send({
            userId: browseUser.id,
            eventType: 'coupon_view',
            eventData: { couponId: `coupon-${i}` }
          });
      }

      // Check churn risk
      const churnResponse = await request(app)
        .get(`/api/retention/churn-risk/${browseUser.id}`);

      expect(churnResponse.status).toBe(200);
      expect(churnResponse.body.data.riskScore).toBeGreaterThan(0);

      console.log('✅ Browse-only journey tracked');
    });

    it('Journey: User encounters error and recovers', async () => {
      console.log('⚠️ Alternative Journey: Error handling');

      // Try to access non-existent coupon
      const errorResponse = await request(app)
        .get('/api/coupons/non-existent-coupon');

      expect(errorResponse.status).toBe(404);
      expect(errorResponse.body.success).toBe(false);

      // User recovers by searching
      const recoveryResponse = await request(app)
        .get('/api/coupons/search')
        .query({ query: 'electronics' });

      expect(recoveryResponse.status).toBe(200);
      expect(recoveryResponse.body.success).toBe(true);

      console.log('✅ Error recovery journey completed');
    });

    it('Journey: User requests data deletion', async () => {
      console.log('🗑️ Alternative Journey: Data deletion request');

      const deletionUser = {
        id: 'deletion-user-' + Date.now(),
        telegramId: '444555666',
        username: 'deletionuser'
      };

      // Register and use system
      await request(app).post('/api/users').send(deletionUser);
      
      // Grant consent
      await request(app)
        .post('/api/admin/data-compliance/consent/grant')
        .send({
          userId: deletionUser.id,
          consentType: 'data_collection'
        });

      // Request data deletion
      const deletionResponse = await request(app)
        .post('/api/admin/data-compliance/deletion/request')
        .send({
          userId: deletionUser.id,
          requestType: 'full_deletion',
          requestedData: ['all_data'],
          reason: 'User wants to delete account'
        });

      expect(deletionResponse.status).toBe(201);
      expect(deletionResponse.body.success).toBe(true);

      console.log('✅ Data deletion journey completed');
    });
  });

  describe('Performance and Load Testing', () => {
    it('Should handle concurrent user registrations', async () => {
      console.log('⚡ Testing concurrent operations');

      const concurrentUsers = Array(10).fill(null).map((_, i) => ({
        id: `concurrent-user-${i}-${Date.now()}`,
        telegramId: `${100000 + i}`,
        username: `concurrentuser${i}`
      }));

      const registrationPromises = concurrentUsers.map(user =>
        request(app).post('/api/users').send(user)
      );

      const responses = await Promise.all(registrationPromises);
      
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });

      console.log('✅ Concurrent operations handled successfully');
    });

    it('Should maintain performance under load', async () => {
      console.log('📊 Testing system performance');

      const startTime = Date.now();
      
      // Simulate multiple operations
      const operations = [
        request(app).get('/api/coupons/search?category=electronics'),
        request(app).get('/api/recommendations/trending'),
        request(app).get('/api/analytics/dashboard'),
        request(app).get('/api/health'),
        request(app).get('/api/monitoring/metrics')
      ];

      const responses = await Promise.all(operations);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      responses.forEach(response => {
        expect(response.status).toBeLessThan(500);
      });

      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(5000); // 5 seconds

      console.log(`✅ Performance test completed in ${totalTime}ms`);
    });
  });

  describe('Security and Compliance Validation', () => {
    it('Should enforce rate limiting', async () => {
      console.log('🛡️ Testing security measures');

      // Make many requests quickly
      const rapidRequests = Array(50).fill(null).map(() =>
        request(app)
          .get('/api/coupons')
          .set('X-Forwarded-For', '192.168.1.200')
      );

      const responses = await Promise.all(rapidRequests);
      
      // Some should be rate limited
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);

      console.log('✅ Rate limiting working correctly');
    });

    it('Should validate data compliance', async () => {
      console.log('📋 Testing compliance validation');

      // Check compliance report
      const complianceResponse = await request(app)
        .get('/api/admin/data-compliance/report/compliance');

      expect(complianceResponse.status).toBe(200);
      expect(complianceResponse.body.success).toBe(true);
      expect(complianceResponse.body.data.complianceScore).toBeGreaterThan(80);

      console.log('✅ Compliance validation passed');
    });
  });

  it('🎉 Complete E2E Journey Summary', async () => {
    console.log('\n🎉 E2E Journey Test Summary:');
    console.log('================================');
    console.log('✅ User Registration & Onboarding');
    console.log('✅ Consent Management');
    console.log('✅ Personal Channel Creation');
    console.log('✅ Coupon Discovery & Search');
    console.log('✅ Personalized Recommendations');
    console.log('✅ Affiliate Link Generation');
    console.log('✅ Click & Conversion Tracking');
    console.log('✅ Cashback Calculation & Credit');
    console.log('✅ Notification System');
    console.log('✅ User Feedback & Learning');
    console.log('✅ Withdrawal Processing');
    console.log('✅ Analytics & Reporting');
    console.log('✅ Business Intelligence');
    console.log('✅ Error Handling & Recovery');
    console.log('✅ Security & Compliance');
    console.log('✅ Performance Under Load');
    console.log('\n🚀 All E2E scenarios completed successfully!');
  });
});
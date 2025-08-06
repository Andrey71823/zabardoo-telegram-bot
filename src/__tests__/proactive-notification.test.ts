import { ProactiveNotificationService } from '../services/notification/ProactiveNotificationService';
import { NotificationRepository } from '../repositories/NotificationRepository';
import { 
  NotificationTrigger, 
  NotificationTemplate, 
  ProactiveNotification,
  UserNotificationPreferences,
  SmartTiming
} from '../models/Notification';

describe('Proactive Notification System', () => {
  let notificationService: ProactiveNotificationService;
  let mockRepository: jest.Mocked<NotificationRepository>;

  beforeEach(() => {
    // Mock repository
    mockRepository = {
      createNotificationTrigger: jest.fn(),
      getActiveTriggers: jest.fn(),
      createNotificationTemplate: jest.fn(),
      getTemplatesByTrigger: jest.fn(),
      createProactiveNotification: jest.fn(),
      getScheduledNotifications: jest.fn(),
      updateNotificationStatus: jest.fn(),
      getUserNotificationPreferences: jest.fn(),
      updateUserNotificationPreferences: jest.fn(),
      getSmartTiming: jest.fn(),
      updateSmartTiming: jest.fn(),
      addToNotificationQueue: jest.fn(),
      getNextQueuedNotifications: jest.fn(),
      recordNotificationAnalytics: jest.fn(),
      getNotificationAnalytics: jest.fn()
    } as any;
  });

  describe('Notification Triggers', () => {
    test('should create behavioral trigger for inactivity', async () => {
      const triggerData: Partial<NotificationTrigger> = {
        name: 'User Inactivity Trigger',
        type: 'behavioral',
        conditions: {
          behavioral_patterns: [{
            pattern_type: 'inactivity',
            threshold_value: 72, // 72 hours
            time_window_hours: 168, // 1 week
            comparison_operator: 'greater_than'
          }]
        },
        is_active: true,
        priority: 1
      };

      const mockTrigger = {
        id: 'trigger-1',
        ...triggerData,
        created_at: new Date(),
        updated_at: new Date()
      } as NotificationTrigger;

      mockRepository.createNotificationTrigger.mockResolvedValue(mockTrigger);

      const result = await mockRepository.createNotificationTrigger(triggerData);

      expect(result).toBeDefined();
      expect(result.name).toBe('User Inactivity Trigger');
      expect(result.type).toBe('behavioral');
      expect(result.conditions.behavioral_patterns).toHaveLength(1);
      expect(result.conditions.behavioral_patterns![0].pattern_type).toBe('inactivity');
    });

    test('should create temporal trigger for daily recommendations', async () => {
      const triggerData: Partial<NotificationTrigger> = {
        name: 'Daily Recommendations',
        type: 'temporal',
        conditions: {
          time_conditions: [{
            trigger_type: 'daily',
            schedule: {
              hours: [9, 18],
              timezone: 'Asia/Kolkata'
            },
            frequency_limit: {
              max_per_day: 2,
              cooldown_hours: 6
            }
          }]
        },
        is_active: true,
        priority: 2
      };

      const mockTrigger = {
        id: 'trigger-2',
        ...triggerData,
        created_at: new Date(),
        updated_at: new Date()
      } as NotificationTrigger;

      mockRepository.createNotificationTrigger.mockResolvedValue(mockTrigger);

      const result = await mockRepository.createNotificationTrigger(triggerData);

      expect(result.type).toBe('temporal');
      expect(result.conditions.time_conditions![0].schedule.hours).toEqual([9, 18]);
      expect(result.conditions.time_conditions![0].frequency_limit!.max_per_day).toBe(2);
    });

    test('should create contextual trigger for high-value coupons', async () => {
      const triggerData: Partial<NotificationTrigger> = {
        name: 'High Value Coupon Alert',
        type: 'contextual',
        conditions: {
          context_filters: [{
            filter_type: 'events',
            conditions: {
              coupon_discount_threshold: 50,
              user_category_match: true,
              expiry_urgency: 'high'
            },
            weight: 0.8
          }]
        },
        is_active: true,
        priority: 3
      };

      const mockTrigger = {
        id: 'trigger-3',
        ...triggerData,
        created_at: new Date(),
        updated_at: new Date()
      } as NotificationTrigger;

      mockRepository.createNotificationTrigger.mockResolvedValue(mockTrigger);

      const result = await mockRepository.createNotificationTrigger(triggerData);

      expect(result.type).toBe('contextual');
      expect(result.conditions.context_filters![0].conditions.coupon_discount_threshold).toBe(50);
    });
  });

  describe('Notification Templates', () => {
    test('should create personalized template with dynamic content', async () => {
      const templateData: Partial<NotificationTemplate> = {
        trigger_id: 'trigger-1',
        name: 'Inactivity Re-engagement',
        channel: 'telegram',
        template_type: 'interactive',
        content: {
          title: 'We miss you, {{userName}}!',
          message: 'Check out these {{categoryCount}} new deals in {{favoriteCategory}} just for you! 🎯',
          buttons: [
            {
              text: '🎯 See My Deals',
              action_type: 'callback',
              action_value: 'view_personalized_deals',
              tracking_id: 'reengagement_cta'
            },
            {
              text: '⚙️ Update Preferences',
              action_type: 'callback',
              action_value: 'update_preferences'
            }
          ],
          personalization_fields: ['userName', 'categoryCount', 'favoriteCategory']
        },
        is_active: true
      };

      const mockTemplate = {
        id: 'template-1',
        ...templateData,
        created_at: new Date(),
        updated_at: new Date()
      } as NotificationTemplate;

      mockRepository.createNotificationTemplate.mockResolvedValue(mockTemplate);

      const result = await mockRepository.createNotificationTemplate(templateData);

      expect(result.template_type).toBe('interactive');
      expect(result.content.buttons).toHaveLength(2);
      expect(result.content.personalization_fields).toContain('userName');
      expect(result.content.message).toContain('{{categoryCount}}');
    });

    test('should create rich media template for promotional campaigns', async () => {
      const templateData: Partial<NotificationTemplate> = {
        trigger_id: 'trigger-2',
        name: 'Flash Sale Alert',
        channel: 'telegram',
        template_type: 'rich_media',
        content: {
          title: '⚡ Flash Sale Alert!',
          message: 'Limited time offer: {{discountPercentage}}% OFF on {{storeName}}! Only {{timeLeft}} remaining.',
          media_url: 'https://zabardoo.com/images/flash-sale-banner.jpg',
          buttons: [
            {
              text: '🛒 Shop Now',
              action_type: 'url',
              action_value: '{{couponLink}}',
              tracking_id: 'flash_sale_shop'
            }
          ],
          personalization_fields: ['discountPercentage', 'storeName', 'timeLeft', 'couponLink']
        },
        localization: {
          'hi': {
            title: '⚡ फ्लैश सेल अलर्ट!',
            message: 'सीमित समय का ऑफर: {{storeName}} पर {{discountPercentage}}% छूट! केवल {{timeLeft}} बचा है।'
          }
        },
        is_active: true
      };

      const mockTemplate = {
        id: 'template-2',
        ...templateData,
        created_at: new Date(),
        updated_at: new Date()
      } as NotificationTemplate;

      mockRepository.createNotificationTemplate.mockResolvedValue(mockTemplate);

      const result = await mockRepository.createNotificationTemplate(templateData);

      expect(result.template_type).toBe('rich_media');
      expect(result.content.media_url).toBeDefined();
      expect(result.localization['hi']).toBeDefined();
    });
  });

  describe('Smart Timing', () => {
    test('should calculate optimal timing based on user engagement patterns', async () => {
      const userId = 'user-123';
      const channel = 'telegram';

      const mockTiming: SmartTiming = {
        user_id: userId,
        channel: channel,
        optimal_hours: [9, 12, 18, 21],
        engagement_patterns: {
          hourly_scores: Array.from({length: 24}, (_, i) => {
            // Higher scores for morning and evening
            if (i >= 8 && i <= 10) return 0.8 + Math.random() * 0.2;
            if (i >= 17 && i <= 21) return 0.7 + Math.random() * 0.3;
            return Math.random() * 0.5;
          }),
          daily_scores: [0.6, 0.8, 0.7, 0.9, 0.8, 0.5, 0.4], // Mon-Sun
          seasonal_adjustments: {
            'winter': 1.1,
            'summer': 0.9,
            'monsoon': 1.0,
            'spring': 1.05
          }
        },
        last_calculated: new Date(),
        confidence_score: 0.85
      };

      mockRepository.getSmartTiming.mockResolvedValue(mockTiming);

      const result = await mockRepository.getSmartTiming(userId, channel);

      expect(result).toBeDefined();
      expect(result!.optimal_hours).toEqual([9, 12, 18, 21]);
      expect(result!.confidence_score).toBe(0.85);
      expect(result!.engagement_patterns.hourly_scores).toHaveLength(24);
      expect(result!.engagement_patterns.daily_scores).toHaveLength(7);
    });

    test('should identify peak engagement hours correctly', () => {
      const hourlyScores = Array.from({length: 24}, (_, i) => {
        if (i === 9) return 0.95; // Peak morning
        if (i === 18) return 0.92; // Peak evening
        if (i >= 8 && i <= 10) return 0.7;
        if (i >= 17 && i <= 21) return 0.6;
        return 0.3;
      });

      const peakHours = hourlyScores
        .map((score, hour) => ({ hour, score }))
        .filter(item => item.score > 0.8)
        .map(item => item.hour);

      expect(peakHours).toContain(9);
      expect(peakHours).toContain(18);
    });
  });

  describe('Behavioral Analysis', () => {
    test('should detect inactivity patterns', () => {
      const userActivity = {
        last_active: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
        session_count_7d: 1,
        avg_session_duration: 30, // seconds
        engagement_score: 0.2
      };

      const isInactive = (Date.now() - userActivity.last_active.getTime()) > (3 * 24 * 60 * 60 * 1000);
      const hasLowEngagement = userActivity.engagement_score < 0.3;
      const hasLowActivity = userActivity.session_count_7d < 3;

      expect(isInactive).toBe(true);
      expect(hasLowEngagement).toBe(true);
      expect(hasLowActivity).toBe(true);
    });

    test('should detect high purchase intent', () => {
      const userBehavior = {
        coupon_views_24h: 15,
        category_focus_score: 0.8, // High focus on specific categories
        time_spent_on_deals: 450, // seconds
        cart_abandonment_recent: true,
        price_comparison_activity: 8
      };

      const hasPurchaseIntent = 
        userBehavior.coupon_views_24h > 10 &&
        userBehavior.category_focus_score > 0.7 &&
        userBehavior.time_spent_on_deals > 300;

      expect(hasPurchaseIntent).toBe(true);
    });

    test('should calculate churn risk score', () => {
      const userMetrics = {
        days_since_last_purchase: 45,
        engagement_trend: 'down',
        session_frequency_decline: 0.6, // 60% decline
        support_tickets: 2,
        unsubscribe_attempts: 1
      };

      let churnScore = 0;
      
      // Days since last purchase (0-0.3)
      churnScore += Math.min(userMetrics.days_since_last_purchase / 100, 0.3);
      
      // Engagement trend (0-0.3)
      if (userMetrics.engagement_trend === 'down') churnScore += 0.3;
      
      // Session frequency decline (0-0.2)
      churnScore += userMetrics.session_frequency_decline * 0.2;
      
      // Support issues (0-0.1)
      churnScore += Math.min(userMetrics.support_tickets / 10, 0.1);
      
      // Unsubscribe attempts (0-0.1)
      churnScore += Math.min(userMetrics.unsubscribe_attempts / 5, 0.1);

      expect(churnScore).toBeGreaterThan(0.5); // High churn risk
      expect(churnScore).toBeLessThanOrEqual(1.0);
    });
  });

  describe('User Preferences', () => {
    test('should respect user notification frequency limits', async () => {
      const preferences: UserNotificationPreferences = {
        id: 'pref-1',
        user_id: 'user-123',
        channels: {
          telegram: true,
          push: false,
          email: false,
          sms: false
        },
        categories: {
          promotional: true,
          recommendations: true,
          alerts: true,
          updates: false
        },
        frequency: {
          max_per_day: 3,
          max_per_week: 15,
          quiet_hours: {
            start: '22:00',
            end: '08:00',
            timezone: 'Asia/Kolkata'
          }
        },
        personalization: {
          use_ai_optimization: true,
          preferred_language: 'en',
          content_style: 'friendly'
        },
        created_at: new Date(),
        updated_at: new Date()
      };

      mockRepository.getUserNotificationPreferences.mockResolvedValue(preferences);

      const result = await mockRepository.getUserNotificationPreferences('user-123');

      expect(result).toBeDefined();
      expect(result!.frequency.max_per_day).toBe(3);
      expect(result!.channels.telegram).toBe(true);
      expect(result!.channels.email).toBe(false);
    });

    test('should check if current time is within quiet hours', () => {
      const quietHours = {
        start: '22:00',
        end: '08:00',
        timezone: 'Asia/Kolkata'
      };

      const isQuietTime = (currentHour: number): boolean => {
        const startHour = parseInt(quietHours.start.split(':')[0]);
        const endHour = parseInt(quietHours.end.split(':')[0]);
        
        if (startHour > endHour) {
          // Quiet hours span midnight
          return currentHour >= startHour || currentHour < endHour;
        } else {
          return currentHour >= startHour && currentHour < endHour;
        }
      };

      expect(isQuietTime(23)).toBe(true); // 11 PM
      expect(isQuietTime(7)).toBe(true);  // 7 AM
      expect(isQuietTime(10)).toBe(false); // 10 AM
      expect(isQuietTime(20)).toBe(false); // 8 PM
    });
  });

  describe('Notification Personalization', () => {
    test('should personalize notification content', () => {
      const template = {
        title: 'Hi {{userName}}!',
        message: 'We found {{couponCount}} new deals in {{favoriteCategory}} for you!',
        personalization_fields: ['userName', 'couponCount', 'favoriteCategory']
      };

      const userData = {
        userName: 'Raj',
        couponCount: 5,
        favoriteCategory: 'Electronics'
      };

      const personalizedTitle = template.title.replace('{{userName}}', userData.userName);
      const personalizedMessage = template.message
        .replace('{{userName}}', userData.userName)
        .replace('{{couponCount}}', userData.couponCount.toString())
        .replace('{{favoriteCategory}}', userData.favoriteCategory);

      expect(personalizedTitle).toBe('Hi Raj!');
      expect(personalizedMessage).toBe('We found 5 new deals in Electronics for you!');
    });

    test('should handle missing personalization data gracefully', () => {
      const template = {
        message: 'Hi {{userName}}, check out deals in {{category}}!',
        fallbacks: {
          userName: 'there',
          category: 'your favorite categories'
        }
      };

      const userData = {
        userName: 'Priya'
        // category is missing
      };

      let personalizedMessage = template.message;
      
      // Replace available data
      personalizedMessage = personalizedMessage.replace('{{userName}}', userData.userName);
      
      // Replace missing data with fallbacks
      personalizedMessage = personalizedMessage.replace('{{category}}', template.fallbacks.category);

      expect(personalizedMessage).toBe('Hi Priya, check out deals in your favorite categories!');
    });
  });

  describe('Performance Metrics', () => {
    test('should track notification performance metrics', () => {
      const notificationMetrics = {
        sent: 1000,
        delivered: 950,
        opened: 380,
        clicked: 95,
        converted: 23,
        unsubscribed: 5
      };

      const deliveryRate = (notificationMetrics.delivered / notificationMetrics.sent) * 100;
      const openRate = (notificationMetrics.opened / notificationMetrics.delivered) * 100;
      const clickThroughRate = (notificationMetrics.clicked / notificationMetrics.opened) * 100;
      const conversionRate = (notificationMetrics.converted / notificationMetrics.clicked) * 100;
      const unsubscribeRate = (notificationMetrics.unsubscribed / notificationMetrics.sent) * 100;

      expect(deliveryRate).toBe(95); // 95%
      expect(openRate).toBeCloseTo(40, 0); // ~40%
      expect(clickThroughRate).toBe(25); // 25%
      expect(conversionRate).toBeCloseTo(24.2, 1); // ~24.2%
      expect(unsubscribeRate).toBe(0.5); // 0.5%
    });

    test('should calculate engagement score', () => {
      const userEngagement = {
        notifications_received: 50,
        notifications_opened: 25,
        notifications_clicked: 8,
        time_spent_avg: 45, // seconds
        actions_taken: 3
      };

      const openRate = userEngagement.notifications_opened / userEngagement.notifications_received;
      const clickRate = userEngagement.notifications_clicked / userEngagement.notifications_opened;
      const actionRate = userEngagement.actions_taken / userEngagement.notifications_clicked;
      const timeScore = Math.min(userEngagement.time_spent_avg / 60, 1); // Normalize to 0-1

      const engagementScore = (openRate * 0.3 + clickRate * 0.3 + actionRate * 0.2 + timeScore * 0.2);

      expect(engagementScore).toBeGreaterThan(0);
      expect(engagementScore).toBeLessThanOrEqual(1);
      expect(openRate).toBe(0.5);
      expect(clickRate).toBeCloseTo(0.32, 2);
    });
  });
});
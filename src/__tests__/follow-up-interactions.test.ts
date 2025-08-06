import { Pool } from 'pg';
import { FollowUpInteractionService, FollowUpConfig, FollowUpExecution } from '../services/retention/FollowUpInteractionService';
import { RetentionEngineRepository } from '../repositories/RetentionEngineRepository';
import { TrafficManagerRepository } from '../repositories/TrafficManagerRepository';
import { UserRepository } from '../repositories/UserRepository';
import { RecommendationRepository } from '../repositories/RecommendationRepository';
import { ConversionEvent } from '../models/TrafficManager';
import { UserLifecycleStage } from '../models/RetentionEngine';

// Mock dependencies
jest.mock('pg');
jest.mock('../repositories/RetentionEngineRepository');
jest.mock('../repositories/TrafficManagerRepository');
jest.mock('../repositories/UserRepository');
jest.mock('../repositories/RecommendationRepository');

describe('FollowUpInteractionService', () => {
  let service: FollowUpInteractionService;
  let mockPool: jest.Mocked<Pool>;
  let mockRetentionRepo: jest.Mocked<RetentionEngineRepository>;
  let mockTrafficRepo: jest.Mocked<TrafficManagerRepository>;
  let mockUserRepo: jest.Mocked<UserRepository>;
  let mockRecommendationRepo: jest.Mocked<RecommendationRepository>;

  beforeEach(() => {
    mockPool = new Pool() as jest.Mocked<Pool>;
    service = new FollowUpInteractionService(mockPool);
    
    mockRetentionRepo = service['retentionRepo'] as jest.Mocked<RetentionEngineRepository>;
    mockTrafficRepo = service['trafficRepo'] as jest.Mocked<TrafficManagerRepository>;
    mockUserRepo = service['userRepo'] as jest.Mocked<UserRepository>;
    mockRecommendationRepo = service['recommendationRepo'] as jest.Mocked<RecommendationRepository>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('scheduleFollowUp', () => {
    const mockUser = {
      telegramId: 'user-123',
      firstName: 'John',
      lastName: 'Doe',
      username: 'johndoe',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const mockConfig: FollowUpConfig = {
      type: 'post_purchase',
      triggerEvent: 'purchase_completed',
      delay: 24,
      personalization: {
        useUserName: true,
        includePurchaseHistory: true,
        includeRecommendations: true,
        includePersonalizedOffers: true,
        dynamicContent: true
      },
      content: {
        message: 'Thank you for your purchase, {{firstName}}!',
        callToAction: 'Shop More',
        offers: [{
          type: 'discount',
          value: 10,
          description: '10% off next purchase',
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          conditions: ['minimum_order_500']
        }]
      },
      frequency: 'once'
    };

    beforeEach(() => {
      mockUserRepo.findByTelegramId.mockResolvedValue(mockUser as any);
      mockRecommendationRepo.getUserRecommendations.mockResolvedValue([
        {
          id: 'rec-1',
          userId: 'user-123',
          itemId: 'product-1',
          itemTitle: 'Smartphone',
          category: 'electronics',
          price: 15000,
          discountPrice: 12000,
          reason: 'Based on your recent purchases',
          confidence: 0.85,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ] as any);
    });

    it('should schedule follow-up interaction successfully', async () => {
      const result = await service.scheduleFollowUp('user-123', mockConfig);

      expect(result).toBeDefined();
      expect(result.userId).toBe('user-123');
      expect(result.followUpType).toBe('post_purchase');
      expect(result.status).toBe('scheduled');
      expect(result.scheduledAt).toBeInstanceOf(Date);
    });

    it('should personalize content with user name', async () => {
      const result = await service.scheduleFollowUp('user-123', mockConfig);

      expect(result.content.message).toContain('John');
      expect(result.content.message).not.toContain('{{firstName}}');
    });

    it('should include product recommendations when configured', async () => {
      const result = await service.scheduleFollowUp('user-123', mockConfig);

      expect(result.content.recommendations).toBeDefined();
      expect(result.content.recommendations).toHaveLength(1);
      expect(result.content.recommendations![0].productName).toBe('Smartphone');
    });

    it('should calculate correct scheduled time based on delay', async () => {
      const beforeScheduling = Date.now();
      const result = await service.scheduleFollowUp('user-123', mockConfig);
      const afterScheduling = Date.now();

      const expectedTime = beforeScheduling + (24 * 60 * 60 * 1000);
      const actualTime = result.scheduledAt.getTime();

      expect(actualTime).toBeGreaterThanOrEqual(expectedTime - 1000); // Allow 1 second tolerance
      expect(actualTime).toBeLessThanOrEqual(afterScheduling + (24 * 60 * 60 * 1000) + 1000);
    });

    it('should handle missing user gracefully', async () => {
      mockUserRepo.findByTelegramId.mockResolvedValue(null);

      const result = await service.scheduleFollowUp('user-123', mockConfig);

      expect(result.content.message).toContain('Valued Customer');
    });

    it('should throw error when conditions are not met', async () => {
      const configWithConditions = {
        ...mockConfig,
        conditions: [
          { field: 'lifetime_value', operator: 'greater_than' as const, value: 10000 }
        ]
      };

      // Mock condition check to return false
      jest.spyOn(service as any, 'checkConditions').mockResolvedValue(false);

      await expect(service.scheduleFollowUp('user-123', configWithConditions))
        .rejects.toThrow('User does not meet follow-up conditions');
    });
  });

  describe('sendPostPurchaseFollowUp', () => {
    const mockConversion: ConversionEvent = {
      id: 'conv-123',
      clickId: 'click-123',
      userId: 'user-123',
      orderId: 'order-123',
      storeId: 'store-1',
      storeName: 'Test Store',
      orderValue: 2500,
      currency: 'INR',
      commission: 125,
      commissionRate: 5,
      conversionTime: new Date(),
      processingStatus: 'confirmed',
      products: [{
        id: 'prod-1',
        name: 'Laptop',
        category: 'electronics',
        price: 2500,
        quantity: 1
      }],
      customerInfo: {
        email: 'test@example.com'
      },
      appliedRules: [],
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const mockLifecycleStage: UserLifecycleStage = {
      id: 'stage-1',
      userId: 'user-123',
      currentStage: 'active',
      previousStage: 'new',
      stageEntryDate: new Date(),
      daysinStage: 5,
      stageHistory: [],
      stageTransitionProbability: {},
      stageMetrics: {},
      interventions: [],
      calculatedAt: new Date(),
      metadata: {}
    };

    beforeEach(() => {
      mockRetentionRepo.getLifecycleStageByUser.mockResolvedValue(mockLifecycleStage);
      jest.spyOn(service, 'scheduleFollowUp').mockResolvedValue({} as any);
    });

    it('should send post-purchase follow-up for regular order', async () => {
      await service.sendPostPurchaseFollowUp(mockConversion);

      expect(service.scheduleFollowUp).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          type: 'post_purchase',
          triggerEvent: 'purchase_completed'
        })
      );
    });

    it('should schedule additional follow-ups for high-value orders', async () => {
      const highValueConversion = {
        ...mockConversion,
        orderValue: 5500
      };

      jest.spyOn(service as any, 'scheduleHighValueCustomerFollowUps').mockResolvedValue(undefined);

      await service.sendPostPurchaseFollowUp(highValueConversion);

      expect(service['scheduleHighValueCustomerFollowUps']).toHaveBeenCalledWith(highValueConversion);
    });

    it('should determine correct follow-up type for new customers', async () => {
      const newCustomerStage = {
        ...mockLifecycleStage,
        currentStage: 'new' as const
      };
      mockRetentionRepo.getLifecycleStageByUser.mockResolvedValue(newCustomerStage);

      await service.sendPostPurchaseFollowUp(mockConversion);

      expect(service.scheduleFollowUp).toHaveBeenCalled();
    });

    it('should calculate optimal delay based on order value and user stage', async () => {
      await service.sendPostPurchaseFollowUp(mockConversion);

      const scheduleCall = (service.scheduleFollowUp as jest.Mock).mock.calls[0];
      const config = scheduleCall[1];
      
      expect(config.delay).toBeGreaterThan(0);
      expect(config.delay).toBeLessThanOrEqual(24);
    });
  });

  describe('sendProductRecommendations', () => {
    const mockRecommendations = [
      {
        id: 'rec-1',
        userId: 'user-123',
        itemId: 'product-1',
        itemTitle: 'Smartphone',
        category: 'electronics',
        price: 15000,
        discountPrice: 12000,
        reason: 'Based on your browsing history',
        confidence: 0.9,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'rec-2',
        userId: 'user-123',
        itemId: 'product-2',
        itemTitle: 'Headphones',
        category: 'electronics',
        price: 3000,
        discountPrice: 2500,
        reason: 'Frequently bought together',
        confidence: 0.8,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    beforeEach(() => {
      mockRecommendationRepo.getUserRecommendations.mockResolvedValue(mockRecommendations as any);
      jest.spyOn(service, 'scheduleFollowUp').mockResolvedValue({} as any);
    });

    it('should send product recommendations successfully', async () => {
      await service.sendProductRecommendations('user-123', 'browsing_behavior');

      expect(mockRecommendationRepo.getUserRecommendations).toHaveBeenCalledWith('user-123', 5);
      expect(service.scheduleFollowUp).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          type: 'product_recommendation',
          content: expect.objectContaining({
            recommendations: expect.arrayContaining([
              expect.objectContaining({
                productName: 'Smartphone',
                confidence: 0.9
              })
            ])
          })
        })
      );
    });

    it('should use different delays for different contexts', async () => {
      await service.sendProductRecommendations('user-123', 'post_purchase');
      
      const postPurchaseCall = (service.scheduleFollowUp as jest.Mock).mock.calls[0];
      expect(postPurchaseCall[1].delay).toBe(24);

      jest.clearAllMocks();
      jest.spyOn(service, 'scheduleFollowUp').mockResolvedValue({} as any);

      await service.sendProductRecommendations('user-123', 'browsing_behavior');
      
      const browsingCall = (service.scheduleFollowUp as jest.Mock).mock.calls[0];
      expect(browsingCall[1].delay).toBe(2);
    });

    it('should handle no recommendations gracefully', async () => {
      mockRecommendationRepo.getUserRecommendations.mockResolvedValue([]);

      await service.sendProductRecommendations('user-123', 'browsing_behavior');

      expect(service.scheduleFollowUp).not.toHaveBeenCalled();
    });

    it('should generate appropriate message for different contexts', async () => {
      await service.sendProductRecommendations('user-123', 'seasonal');

      const scheduleCall = (service.scheduleFollowUp as jest.Mock).mock.calls[0];
      const message = scheduleCall[1].content.message;
      
      expect(message).toContain('trending items');
    });
  });

  describe('createSeasonalCampaign', () => {
    const mockSeasonalCampaign = {
      name: 'Summer Sale 2024',
      season: 'summer' as const,
      startDate: new Date('2024-06-01'),
      endDate: new Date('2024-08-31'),
      targetSegments: ['active_users', 'high_value_customers'],
      content: {
        theme: 'summer_vibes',
        colors: ['#FFD700', '#FF6347'],
        images: ['summer_banner.jpg'],
        messages: [{
          segment: 'active_users',
          message: 'Beat the heat with our summer collection!',
          callToAction: 'Shop Summer Deals',
          urgency: 'medium' as const
        }],
        offers: [{
          name: 'Summer Special',
          description: '30% off summer essentials',
          discountType: 'percentage' as const,
          discountValue: 30,
          categories: ['clothing', 'accessories'],
          validUntil: new Date('2024-08-31'),
          limitPerUser: 1
        }]
      },
      isActive: true
    };

    beforeEach(() => {
      jest.spyOn(service as any, 'scheduleSeasonalCampaignExecution').mockResolvedValue(undefined);
    });

    it('should create seasonal campaign successfully', async () => {
      const result = await service.createSeasonalCampaign(mockSeasonalCampaign);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe('Summer Sale 2024');
      expect(result.season).toBe('summer');
      expect(result.performance).toBeDefined();
      expect(result.performance.targetUsers).toBe(0);
    });

    it('should schedule campaign execution', async () => {
      await service.createSeasonalCampaign(mockSeasonalCampaign);

      expect(service['scheduleSeasonalCampaignExecution']).toHaveBeenCalled();
    });

    it('should initialize performance metrics', async () => {
      const result = await service.createSeasonalCampaign(mockSeasonalCampaign);

      expect(result.performance).toEqual({
        targetUsers: 0,
        reachedUsers: 0,
        engagementRate: 0,
        conversionRate: 0,
        revenue: 0,
        roi: 0
      });
    });
  });

  describe('sendSeasonalReminders', () => {
    const mockActiveUsers = [
      {
        id: 'monitoring-1',
        userId: 'user-1',
        status: 'active',
        healthScore: 85,
        lastUpdated: new Date(),
        monitoringPeriod: { startDate: new Date(), endDate: new Date() },
        activityMetrics: {},
        behaviorPatterns: [],
        engagementTrends: [],
        anomalies: [],
        metadata: {}
      },
      {
        id: 'monitoring-2',
        userId: 'user-2',
        status: 'active',
        healthScore: 90,
        lastUpdated: new Date(),
        monitoringPeriod: { startDate: new Date(), endDate: new Date() },
        activityMetrics: {},
        behaviorPatterns: [],
        engagementTrends: [],
        anomalies: [],
        metadata: {}
      }
    ];

    beforeEach(() => {
      mockRetentionRepo.getUsersByActivityStatus.mockResolvedValue(mockActiveUsers as any);
      jest.spyOn(service as any, 'getSeasonalOffers').mockResolvedValue([
        {
          type: 'discount',
          value: 20,
          description: 'Summer Special - 20% off selected items',
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          conditions: ['seasonal_items_only']
        }
      ]);
      jest.spyOn(service, 'scheduleFollowUp').mockResolvedValue({} as any);
    });

    it('should send seasonal reminders to active users', async () => {
      await service.sendSeasonalReminders('summer');

      expect(mockRetentionRepo.getUsersByActivityStatus).toHaveBeenCalledWith('active', 1000);
      expect(service.scheduleFollowUp).toHaveBeenCalledTimes(2);
    });

    it('should include seasonal offers in reminders', async () => {
      await service.sendSeasonalReminders('summer');

      const scheduleCall = (service.scheduleFollowUp as jest.Mock).mock.calls[0];
      const config = scheduleCall[1];
      
      expect(config.content.offers).toBeDefined();
      expect(config.content.offers).toHaveLength(1);
      expect(config.content.offers[0].description).toContain('Summer Special');
    });

    it('should generate season-appropriate messages', async () => {
      await service.sendSeasonalReminders('winter');

      const scheduleCall = (service.scheduleFollowUp as jest.Mock).mock.calls[0];
      const message = scheduleCall[1].content.message;
      
      expect(message).toContain('winter');
    });

    it('should schedule reminders with immediate execution', async () => {
      await service.sendSeasonalReminders('summer');

      const scheduleCall = (service.scheduleFollowUp as jest.Mock).mock.calls[0];
      const config = scheduleCall[1];
      
      expect(config.delay).toBe(0);
    });
  });

  describe('trackFollowUpResponse', () => {
    const mockResponse = {
      opened: true,
      openedAt: new Date(),
      clicked: true,
      clickedAt: new Date(),
      converted: false,
      feedback: 'Good offer'
    };

    beforeEach(() => {
      jest.spyOn(service as any, 'updateUserEngagementScore').mockResolvedValue(undefined);
    });

    it('should track follow-up response successfully', async () => {
      await service.trackFollowUpResponse('followup-123', mockResponse);

      expect(service['updateUserEngagementScore']).toHaveBeenCalledWith('followup-123', 'click');
    });

    it('should update engagement score based on response type', async () => {
      const conversionResponse = { ...mockResponse, converted: true };
      
      await service.trackFollowUpResponse('followup-123', conversionResponse);

      expect(service['updateUserEngagementScore']).toHaveBeenCalledWith('followup-123', 'conversion');
    });

    it('should handle open-only responses', async () => {
      const openResponse = { 
        opened: true, 
        openedAt: new Date(), 
        clicked: false, 
        converted: false 
      };
      
      await service.trackFollowUpResponse('followup-123', openResponse);

      expect(service['updateUserEngagementScore']).toHaveBeenCalledWith('followup-123', 'open');
    });
  });

  describe('executeScheduledFollowUps', () => {
    beforeEach(() => {
      jest.spyOn(service as any, 'getScheduledFollowUps').mockResolvedValue([
        {
          id: 'followup-1',
          userId: 'user-1',
          followUpType: 'post_purchase',
          status: 'scheduled',
          scheduledAt: new Date(Date.now() - 60000), // 1 minute ago
          content: { message: 'Test message', callToAction: 'Test CTA' }
        },
        {
          id: 'followup-2',
          userId: 'user-2',
          followUpType: 'seasonal',
          status: 'scheduled',
          scheduledAt: new Date(Date.now() - 120000), // 2 minutes ago
          content: { message: 'Seasonal message', callToAction: 'Shop Now' }
        }
      ]);
      jest.spyOn(service as any, 'executeFollowUp').mockResolvedValue(undefined);
    });

    it('should execute all scheduled follow-ups', async () => {
      await service.executeScheduledFollowUps();

      expect(service['getScheduledFollowUps']).toHaveBeenCalled();
      expect(service['executeFollowUp']).toHaveBeenCalledTimes(2);
    });

    it('should handle individual follow-up execution errors gracefully', async () => {
      jest.spyOn(service as any, 'executeFollowUp')
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Execution failed'));

      await expect(service.executeScheduledFollowUps()).resolves.not.toThrow();
      expect(service['executeFollowUp']).toHaveBeenCalledTimes(2);
    });
  });
});
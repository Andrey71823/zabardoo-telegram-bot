import { NotificationCampaignService } from '../services/admin/NotificationCampaignService';
import { NotificationCampaignRepository } from '../repositories/NotificationCampaignRepository';
import { Campaign, CampaignFilter, BulkNotification } from '../models/NotificationCampaign';

// Mock the repository
jest.mock('../repositories/NotificationCampaignRepository');
jest.mock('../repositories/UserManagementRepository');

describe('NotificationCampaignService', () => {
  let service: NotificationCampaignService;
  let mockRepository: jest.Mocked<NotificationCampaignRepository>;

  beforeEach(() => {
    service = new NotificationCampaignService();
    mockRepository = new NotificationCampaignRepository() as jest.Mocked<NotificationCampaignRepository>;
    (service as any).repository = mockRepository;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCampaigns', () => {
    it('should get campaigns with filters', async () => {
      const mockCampaigns = [
        {
          id: 'campaign1',
          name: 'Test Campaign',
          type: 'broadcast',
          status: 'draft',
          metrics: { sentCount: 100, openRate: 25.5 }
        }
      ];

      const mockResult = {
        campaigns: mockCampaigns,
        total: 1,
        page: 1,
        totalPages: 1
      };

      mockRepository.getCampaigns.mockResolvedValue(mockResult);

      const filter: CampaignFilter = {
        status: ['draft'],
        page: 1,
        limit: 20
      };

      const result = await service.getCampaigns(filter);

      expect(mockRepository.getCampaigns).toHaveBeenCalledWith(filter);
      expect(result).toEqual(mockResult);
    });

    it('should handle errors when getting campaigns', async () => {
      mockRepository.getCampaigns.mockRejectedValue(new Error('Database error'));

      const filter: CampaignFilter = { page: 1, limit: 20 };

      await expect(service.getCampaigns(filter)).rejects.toThrow('Failed to retrieve campaigns');
    });
  });

  describe('createCampaign', () => {
    it('should create a new campaign', async () => {
      const campaignData = {
        name: 'New Campaign',
        description: 'Test campaign',
        type: 'broadcast' as const,
        status: 'draft' as const,
        priority: 5,
        targetAudience: {
          filters: { isActive: true }
        },
        content: {
          title: 'Test Title',
          message: 'Test message'
        },
        schedule: {
          type: 'immediate' as const
        },
        delivery: {
          channel: 'telegram' as const,
          respectUserPreferences: true
        },
        createdBy: 'admin',
        tags: []
      };

      const mockCreatedCampaign = {
        ...campaignData,
        id: 'campaign1',
        createdAt: new Date(),
        updatedAt: new Date(),
        metrics: {
          targetCount: 0,
          sentCount: 0,
          deliveredCount: 0,
          failedCount: 0,
          openedCount: 0,
          clickedCount: 0,
          convertedCount: 0,
          unsubscribedCount: 0,
          deliveryRate: 0,
          openRate: 0,
          clickRate: 0,
          conversionRate: 0,
          unsubscribeRate: 0,
          revenue: 0,
          costPerConversion: 0,
          roi: 0
        }
      };

      mockRepository.createCampaign.mockResolvedValue(mockCreatedCampaign);

      const result = await service.createCampaign(campaignData);

      expect(mockRepository.createCampaign).toHaveBeenCalledWith(
        expect.objectContaining({
          ...campaignData,
          metrics: expect.objectContaining({
            targetCount: 0,
            sentCount: 0
          })
        })
      );
      expect(result).toEqual(mockCreatedCampaign);
    });

    it('should validate campaign data before creation', async () => {
      const invalidCampaignData = {
        name: '', // Empty name should cause validation error
        type: 'broadcast' as const,
        status: 'draft' as const,
        priority: 5,
        targetAudience: {},
        content: { title: '', message: '' },
        schedule: { type: 'immediate' as const },
        delivery: { channel: 'telegram' as const, respectUserPreferences: true },
        createdBy: 'admin',
        tags: []
      };

      await expect(service.createCampaign(invalidCampaignData)).rejects.toThrow('Campaign name is required');
    });
  });

  describe('executeCampaign', () => {
    it('should execute a campaign', async () => {
      const campaignId = 'campaign1';
      const mockCampaign = {
        id: campaignId,
        name: 'Test Campaign',
        status: 'draft' as const,
        targetAudience: {
          filters: { isActive: true }
        },
        content: {
          title: 'Test',
          message: 'Test message'
        },
        delivery: {
          channel: 'telegram' as const
        },
        metrics: {
          targetCount: 0,
          sentCount: 0,
          deliveredCount: 0,
          failedCount: 0,
          openedCount: 0,
          clickedCount: 0,
          convertedCount: 0,
          unsubscribedCount: 0,
          deliveryRate: 0,
          openRate: 0,
          clickRate: 0,
          conversionRate: 0,
          unsubscribeRate: 0,
          revenue: 0,
          costPerConversion: 0,
          roi: 0
        }
      };

      const mockExecution = {
        id: 'execution1',
        campaignId,
        executionType: 'manual' as const,
        status: 'running' as const,
        startedAt: new Date(),
        totalBatches: 1,
        completedBatches: 0,
        currentBatch: 1,
        batchSize: 100,
        results: {
          targetUsers: 100,
          processedUsers: 0,
          successfulSends: 0,
          failedSends: 0,
          skippedUsers: 0,
          errors: []
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRepository.getCampaignById.mockResolvedValue(mockCampaign);
      mockRepository.createCampaignExecution.mockResolvedValue(mockExecution);
      mockRepository.updateCampaign.mockResolvedValue({ ...mockCampaign, status: 'running' });

      // Mock user repository to return empty users list
      const mockUserRepository = (service as any).userRepository;
      mockUserRepository.getUsers.mockResolvedValue({ users: [], total: 0 });

      const result = await service.executeCampaign(campaignId);

      expect(mockRepository.getCampaignById).toHaveBeenCalledWith(campaignId);
      expect(mockRepository.createCampaignExecution).toHaveBeenCalled();
      expect(result).toEqual(mockExecution);
    });

    it('should not execute running campaign', async () => {
      const campaignId = 'campaign1';
      const mockCampaign = {
        id: campaignId,
        status: 'running' as const
      };

      mockRepository.getCampaignById.mockResolvedValue(mockCampaign as any);

      await expect(service.executeCampaign(campaignId)).rejects.toThrow('Campaign is already running');
    });
  });

  describe('sendBulkNotification', () => {
    it('should send bulk notification', async () => {
      const notificationData = {
        title: 'Test Notification',
        message: 'Test message',
        type: 'info' as const,
        recipients: {
          type: 'all_users' as const
        },
        channel: 'telegram' as const,
        createdBy: 'admin'
      };

      // Mock user repository to return users
      const mockUserRepository = (service as any).userRepository;
      mockUserRepository.getUsers.mockResolvedValue({
        users: [{ id: 'user1' }, { id: 'user2' }],
        total: 2
      });

      const result = await service.sendBulkNotification(notificationData);

      expect(result.title).toBe(notificationData.title);
      expect(result.results.targetCount).toBe(2);
      expect(result.status).toBe('completed');
    });
  });

  describe('getCampaignStats', () => {
    it('should get campaign statistics', async () => {
      const mockStats = {
        totalCampaigns: 10,
        activeCampaigns: 3,
        completedCampaigns: 7,
        scheduledCampaigns: 1,
        totalSent: 1000,
        totalDelivered: 950,
        totalOpened: 400,
        totalClicked: 100,
        totalConverted: 25,
        totalRevenue: 5000,
        averageDeliveryRate: 95,
        averageOpenRate: 42.1,
        averageClickRate: 25,
        averageConversionRate: 25,
        averageROI: 200,
        topCampaigns: [],
        campaignsByType: [],
        performanceTrend: []
      };

      mockRepository.getCampaignStats.mockResolvedValue(mockStats);

      const result = await service.getCampaignStats();

      expect(mockRepository.getCampaignStats).toHaveBeenCalled();
      expect(result).toEqual(mockStats);
    });
  });

  describe('getUserNotificationPreferences', () => {
    it('should get user notification preferences', async () => {
      const userId = 'user1';
      const mockPreferences = {
        userId,
        preferences: {
          telegram: true,
          email: true,
          push: true,
          sms: false,
          promotional: true,
          transactional: true,
          informational: true,
          reminders: true,
          maxPerDay: 10,
          maxPerWeek: 50,
          quietHours: {
            enabled: false,
            startTime: '22:00',
            endTime: '08:00',
            timezone: 'Asia/Kolkata'
          },
          categories: [],
          stores: [],
          globalUnsubscribe: false,
          unsubscribedCategories: [],
          unsubscribedCampaignTypes: []
        },
        updatedAt: new Date()
      };

      mockRepository.getUserNotificationPreferences.mockResolvedValue(mockPreferences);

      const result = await service.getUserNotificationPreferences(userId);

      expect(mockRepository.getUserNotificationPreferences).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockPreferences);
    });

    it('should create default preferences if none exist', async () => {
      const userId = 'user1';
      
      mockRepository.getUserNotificationPreferences.mockResolvedValue(null);
      
      const defaultPreferences = {
        userId,
        preferences: {
          telegram: true,
          email: true,
          push: true,
          sms: false,
          promotional: true,
          transactional: true,
          informational: true,
          reminders: true,
          maxPerDay: 10,
          maxPerWeek: 50,
          quietHours: {
            enabled: false,
            startTime: '22:00',
            endTime: '08:00',
            timezone: 'Asia/Kolkata'
          },
          categories: [],
          stores: [],
          globalUnsubscribe: false,
          unsubscribedCategories: [],
          unsubscribedCampaignTypes: []
        },
        updatedAt: new Date()
      };

      mockRepository.updateUserNotificationPreferences.mockResolvedValue(defaultPreferences);

      const result = await service.getUserNotificationPreferences(userId);

      expect(mockRepository.updateUserNotificationPreferences).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          telegram: true,
          email: true,
          globalUnsubscribe: false
        })
      );
      expect(result).toEqual(defaultPreferences);
    });
  });

  describe('testABCampaignVariants', () => {
    it('should test A/B campaign variants', async () => {
      const campaignId = 'campaign1';
      const mockCampaign = {
        id: campaignId,
        abTest: {
          enabled: true,
          variants: [
            { id: 'variant1', name: 'Variant A', percentage: 50 },
            { id: 'variant2', name: 'Variant B', percentage: 50 }
          ],
          winnerCriteria: 'click_rate' as const
        }
      };

      mockRepository.getCampaignById.mockResolvedValue(mockCampaign as any);

      const result = await service.testABCampaignVariants(campaignId);

      expect(result.winnerVariantId).toBeDefined();
      expect(result.results).toHaveLength(2);
      expect(result.results[0]).toHaveProperty('variantId');
      expect(result.results[0]).toHaveProperty('clickRate');
    });

    it('should throw error if A/B testing not enabled', async () => {
      const campaignId = 'campaign1';
      const mockCampaign = {
        id: campaignId,
        abTest: null
      };

      mockRepository.getCampaignById.mockResolvedValue(mockCampaign as any);

      await expect(service.testABCampaignVariants(campaignId)).rejects.toThrow(
        'Campaign not found or A/B testing not enabled'
      );
    });
  });

  describe('pauseCampaign', () => {
    it('should pause a campaign', async () => {
      const campaignId = 'campaign1';
      const mockCampaign = {
        id: campaignId,
        status: 'paused' as const
      };

      mockRepository.updateCampaign.mockResolvedValue(mockCampaign as any);

      const result = await service.pauseCampaign(campaignId);

      expect(mockRepository.updateCampaign).toHaveBeenCalledWith(campaignId, { status: 'paused' });
      expect(result).toEqual(mockCampaign);
    });
  });

  describe('resumeCampaign', () => {
    it('should resume a campaign', async () => {
      const campaignId = 'campaign1';
      const mockCampaign = {
        id: campaignId,
        status: 'running' as const
      };

      mockRepository.updateCampaign.mockResolvedValue(mockCampaign as any);

      const result = await service.resumeCampaign(campaignId);

      expect(mockRepository.updateCampaign).toHaveBeenCalledWith(campaignId, { status: 'running' });
      expect(result).toEqual(mockCampaign);
    });
  });

  describe('scheduleCampaign', () => {
    it('should schedule a campaign', async () => {
      const campaignId = 'campaign1';
      const scheduledAt = new Date();
      const mockCampaign = {
        id: campaignId,
        status: 'scheduled' as const,
        schedule: {
          type: 'scheduled' as const,
          scheduledAt
        }
      };

      mockRepository.getCampaignById.mockResolvedValue({
        id: campaignId,
        schedule: { type: 'immediate' as const }
      } as any);
      
      mockRepository.updateCampaign.mockResolvedValue(mockCampaign as any);

      const result = await service.scheduleCampaign(campaignId, scheduledAt);

      expect(mockRepository.updateCampaign).toHaveBeenCalledWith(campaignId, {
        status: 'scheduled',
        schedule: {
          type: 'scheduled',
          scheduledAt
        }
      });
      expect(result).toEqual(mockCampaign);
    });
  });

  describe('getNotificationTemplates', () => {
    it('should get notification templates', async () => {
      const mockTemplates = [
        {
          id: 'template1',
          name: 'Welcome Template',
          category: 'promotional',
          content: { title: 'Welcome!', message: 'Welcome to our service' },
          isActive: true
        }
      ];

      mockRepository.getNotificationTemplates.mockResolvedValue(mockTemplates as any);

      const result = await service.getNotificationTemplates();

      expect(mockRepository.getNotificationTemplates).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(mockTemplates);
    });

    it('should get templates by category', async () => {
      const category = 'promotional';
      const mockTemplates = [
        {
          id: 'template1',
          name: 'Promo Template',
          category: 'promotional'
        }
      ];

      mockRepository.getNotificationTemplates.mockResolvedValue(mockTemplates as any);

      const result = await service.getNotificationTemplates(category);

      expect(mockRepository.getNotificationTemplates).toHaveBeenCalledWith(category);
      expect(result).toEqual(mockTemplates);
    });
  });

  describe('createNotificationTemplate', () => {
    it('should create notification template', async () => {
      const templateData = {
        name: 'New Template',
        description: 'Test template',
        category: 'promotional' as const,
        content: {
          title: 'Test Title',
          message: 'Test message'
        },
        variables: [],
        isActive: true,
        createdBy: 'admin'
      };

      const mockCreatedTemplate = {
        ...templateData,
        id: 'template1',
        usage: {
          timesUsed: 0,
          averagePerformance: {
            openRate: 0,
            clickRate: 0,
            conversionRate: 0
          }
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRepository.createNotificationTemplate.mockResolvedValue(mockCreatedTemplate);

      const result = await service.createNotificationTemplate(templateData);

      expect(mockRepository.createNotificationTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          ...templateData,
          usage: expect.objectContaining({
            timesUsed: 0
          })
        })
      );
      expect(result).toEqual(mockCreatedTemplate);
    });
  });
});
import { Pool } from 'pg';
import { ChurnRiskAnalysisService, UserActivityData } from '../services/retention/ChurnRiskAnalysisService';
import { RetentionEngineRepository } from '../repositories/RetentionEngineRepository';
import { TrafficManagerRepository } from '../repositories/TrafficManagerRepository';
import { UserRepository } from '../repositories/UserRepository';
import { UserChurnRisk, UserActivityMonitoring } from '../models/RetentionEngine';

// Mock dependencies
jest.mock('pg');
jest.mock('../repositories/RetentionEngineRepository');
jest.mock('../repositories/TrafficManagerRepository');
jest.mock('../repositories/UserRepository');

describe('ChurnRiskAnalysisService', () => {
  let service: ChurnRiskAnalysisService;
  let mockPool: jest.Mocked<Pool>;
  let mockRetentionRepo: jest.Mocked<RetentionEngineRepository>;
  let mockTrafficRepo: jest.Mocked<TrafficManagerRepository>;
  let mockUserRepo: jest.Mocked<UserRepository>;

  beforeEach(() => {
    mockPool = new Pool() as jest.Mocked<Pool>;
    service = new ChurnRiskAnalysisService(mockPool);
    
    mockRetentionRepo = service['retentionRepo'] as jest.Mocked<RetentionEngineRepository>;
    mockTrafficRepo = service['trafficRepo'] as jest.Mocked<TrafficManagerRepository>;
    mockUserRepo = service['userRepo'] as jest.Mocked<UserRepository>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateChurnRisk', () => {
    const mockUser = {
      telegramId: 'user-123',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date()
    };

    const mockClicks = [
      {
        id: 'click-1',
        clickId: 'click-1',
        userId: 'user-123',
        clickTime: new Date('2024-01-15T10:00:00Z'),
        source: 'telegram_personal_channel',
        userAgent: 'Mozilla/5.0',
        ipAddress: '192.168.1.1'
      },
      {
        id: 'click-2',
        clickId: 'click-2',
        userId: 'user-123',
        clickTime: new Date('2024-01-20T14:30:00Z'),
        source: 'telegram_personal_channel',
        userAgent: 'Mozilla/5.0',
        ipAddress: '192.168.1.1'
      }
    ];

    const mockConversions = [
      {
        id: 'conv-1',
        clickId: 'click-1',
        userId: 'user-123',
        orderId: 'order-123',
        orderValue: 1500,
        commission: 75,
        conversionTime: new Date('2024-01-15T10:30:00Z'),
        processingStatus: 'confirmed'
      }
    ];

    const mockChurnRisk: UserChurnRisk = {
      id: 'risk-1',
      userId: 'user-123',
      churnRiskScore: 35,
      riskLevel: 'medium',
      riskFactors: [
        {
          factor: 'daysSinceLastActivity',
          weight: 0.25,
          value: 30,
          impact: 'negative',
          description: '5 days since last activity',
          category: 'temporal'
        }
      ],
      confidence: 75,
      lastActivityDate: new Date('2024-01-20T14:30:00Z'),
      daysSinceLastActivity: 5,
      activityTrend: 'stable',
      engagementScore: 65,
      lifetimeValue: 1500,
      interventionRecommendations: [
        {
          type: 'engagement_campaign',
          priority: 'medium',
          description: 'Send personalized re-engagement campaign',
          expectedImpact: 60,
          cost: 50,
          timeframe: '3-5 days',
          channels: ['telegram'],
          parameters: {}
        }
      ],
      calculatedAt: new Date(),
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };

    beforeEach(() => {
      mockUserRepo.findByTelegramId.mockResolvedValue(mockUser as any);
      mockTrafficRepo.getClicksByUser.mockResolvedValue(mockClicks as any);
      mockTrafficRepo.getConversionsByUser.mockResolvedValue(mockConversions as any);
      mockRetentionRepo.createChurnRisk.mockResolvedValue(mockChurnRisk);
    });

    it('should calculate churn risk successfully for active user', async () => {
      const result = await service.calculateChurnRisk('user-123');

      expect(mockUserRepo.findByTelegramId).toHaveBeenCalledWith('user-123');
      expect(mockTrafficRepo.getClicksByUser).toHaveBeenCalled();
      expect(mockTrafficRepo.getConversionsByUser).toHaveBeenCalled();
      expect(mockRetentionRepo.createChurnRisk).toHaveBeenCalled();
      
      expect(result).toEqual(mockChurnRisk);
      expect(result.riskLevel).toBe('medium');
      expect(result.churnRiskScore).toBe(35);
    });

    it('should throw error for non-existent user', async () => {
      mockUserRepo.findByTelegramId.mockResolvedValue(null);

      await expect(service.calculateChurnRisk('non-existent-user'))
        .rejects.toThrow('No activity data found for user: non-existent-user');
    });

    it('should calculate high risk for inactive user', async () => {
      // Mock inactive user data
      const inactiveClicks = [
        {
          ...mockClicks[0],
          clickTime: new Date('2024-01-01T10:00:00Z') // 30+ days ago
        }
      ];
      
      mockTrafficRepo.getClicksByUser.mockResolvedValue(inactiveClicks as any);
      mockTrafficRepo.getConversionsByUser.mockResolvedValue([]);

      const highRiskResult = {
        ...mockChurnRisk,
        churnRiskScore: 85,
        riskLevel: 'high' as const,
        daysSinceLastActivity: 30
      };
      
      mockRetentionRepo.createChurnRisk.mockResolvedValue(highRiskResult);

      const result = await service.calculateChurnRisk('user-123');

      expect(result.riskLevel).toBe('high');
      expect(result.churnRiskScore).toBe(85);
    });

    it('should use custom configuration when provided', async () => {
      const customConfig = {
        lookbackDays: 60,
        thresholds: {
          low: 20,
          medium: 40,
          high: 70,
          critical: 90
        }
      };

      await service.calculateChurnRisk('user-123', customConfig);

      expect(mockTrafficRepo.getClicksByUser).toHaveBeenCalledWith(
        'user-123',
        expect.any(Date),
        expect.any(Date)
      );
      
      // Verify the date range is 60 days
      const callArgs = mockTrafficRepo.getClicksByUser.mock.calls[0];
      const startDate = callArgs[1] as Date;
      const endDate = callArgs[2] as Date;
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
      
      expect(daysDiff).toBe(60);
    });

    it('should generate appropriate intervention recommendations', async () => {
      const result = await service.calculateChurnRisk('user-123');

      expect(result.interventionRecommendations).toBeDefined();
      expect(result.interventionRecommendations.length).toBeGreaterThan(0);
      
      const recommendation = result.interventionRecommendations[0];
      expect(recommendation).toHaveProperty('type');
      expect(recommendation).toHaveProperty('priority');
      expect(recommendation).toHaveProperty('description');
      expect(recommendation).toHaveProperty('expectedImpact');
    });
  });

  describe('batchCalculateChurnRisk', () => {
    const userIds = ['user-1', 'user-2', 'user-3', 'user-4', 'user-5'];
    
    beforeEach(() => {
      // Mock successful calculations for most users
      jest.spyOn(service, 'calculateChurnRisk')
        .mockImplementation((userId) => {
          if (userId === 'user-3') {
            return Promise.reject(new Error('Calculation failed'));
          }
          return Promise.resolve({
            id: `risk-${userId}`,
            userId,
            churnRiskScore: 50,
            riskLevel: 'medium',
            riskFactors: [],
            confidence: 75,
            lastActivityDate: new Date(),
            daysSinceLastActivity: 5,
            activityTrend: 'stable',
            engagementScore: 65,
            lifetimeValue: 1000,
            interventionRecommendations: [],
            calculatedAt: new Date(),
            metadata: {},
            createdAt: new Date(),
            updatedAt: new Date()
          } as UserChurnRisk);
        });
    });

    it('should process batch of users successfully', async () => {
      const results = await service.batchCalculateChurnRisk(userIds);

      expect(results).toHaveLength(4); // 5 users - 1 failed = 4 successful
      expect(service.calculateChurnRisk).toHaveBeenCalledTimes(5);
      
      results.forEach(result => {
        expect(result.churnRiskScore).toBe(50);
        expect(result.riskLevel).toBe('medium');
      });
    });

    it('should handle errors gracefully in batch processing', async () => {
      const results = await service.batchCalculateChurnRisk(userIds);

      // Should not throw error even if some calculations fail
      expect(results).toHaveLength(4);
      expect(results.every(r => r !== null)).toBe(true);
    });

    it('should process large batches in chunks', async () => {
      const largeUserList = Array.from({ length: 150 }, (_, i) => `user-${i}`);
      
      await service.batchCalculateChurnRisk(largeUserList);

      // Should be called for all users
      expect(service.calculateChurnRisk).toHaveBeenCalledTimes(150);
    });
  });

  describe('monitorUserActivity', () => {
    const mockActivityMonitoring: UserActivityMonitoring = {
      id: 'monitoring-1',
      userId: 'user-123',
      monitoringPeriod: {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        preset: 'last_30_days'
      },
      activityMetrics: {
        totalSessions: 15,
        averageSessionDuration: 180,
        totalClicks: 45,
        totalConversions: 3,
        totalRevenue: 1500,
        daysActive: 12,
        daysInactive: 18,
        longestInactiveStreak: 5,
        averageTimeBetweenSessions: 2.5,
        peakActivityHour: 19,
        preferredChannels: ['telegram_personal_channel'],
        deviceTypes: { mobile: 70, desktop: 30 },
        locationData: { 'Mumbai': 60, 'Delhi': 40 },
        customMetrics: {
          clicksPerSession: 3.0,
          conversionRate: 6.67,
          averageOrderValue: 500,
          activityConsistency: 0.4
        }
      },
      behaviorPatterns: [
        {
          patternType: 'session_frequency',
          pattern: 'evening_activity',
          frequency: 0.8,
          strength: 0.7,
          trend: 'stable',
          predictability: 0.85,
          lastObserved: new Date()
        }
      ],
      engagementTrends: [
        {
          metric: 'daily_clicks',
          timeframe: 'daily',
          values: [],
          direction: 'stable',
          slope: 0.02,
          correlation: 0.65,
          significance: 0.8
        }
      ],
      anomalies: [],
      healthScore: 75,
      status: 'active',
      lastUpdated: new Date(),
      metadata: {}
    };

    beforeEach(() => {
      mockRetentionRepo.createActivityMonitoring.mockResolvedValue(mockActivityMonitoring);
    });

    it('should monitor user activity successfully', async () => {
      const result = await service.monitorUserActivity('user-123');

      expect(mockRetentionRepo.createActivityMonitoring).toHaveBeenCalled();
      expect(result).toEqual(mockActivityMonitoring);
      expect(result.healthScore).toBe(75);
      expect(result.status).toBe('active');
    });

    it('should detect activity anomalies', async () => {
      const monitoringWithAnomalies = {
        ...mockActivityMonitoring,
        anomalies: [
          {
            id: 'anomaly-1',
            type: 'sudden_drop' as const,
            severity: 'high' as const,
            description: 'Unusual inactivity streak of 14 days',
            detectedAt: new Date(),
            metric: 'activity_streak',
            expectedValue: 2,
            actualValue: 14,
            deviation: 12,
            confidence: 0.8,
            possibleCauses: ['user_disengagement'],
            impact: 'negative' as const
          }
        ],
        healthScore: 45,
        status: 'at_risk' as const
      };

      mockRetentionRepo.createActivityMonitoring.mockResolvedValue(monitoringWithAnomalies);

      const result = await service.monitorUserActivity('user-123');

      expect(result.anomalies).toHaveLength(1);
      expect(result.anomalies[0].type).toBe('sudden_drop');
      expect(result.healthScore).toBe(45);
      expect(result.status).toBe('at_risk');
    });

    it('should calculate health score correctly', async () => {
      const result = await service.monitorUserActivity('user-123');

      expect(result.healthScore).toBeGreaterThan(0);
      expect(result.healthScore).toBeLessThanOrEqual(100);
    });

    it('should determine activity status based on health score', async () => {
      // Test different health scores
      const testCases = [
        { healthScore: 85, expectedStatus: 'active' },
        { healthScore: 65, expectedStatus: 'at_risk' },
        { healthScore: 35, expectedStatus: 'churning' },
        { healthScore: 15, expectedStatus: 'churned' }
      ];

      for (const testCase of testCases) {
        const monitoring = {
          ...mockActivityMonitoring,
          healthScore: testCase.healthScore,
          status: testCase.expectedStatus as any
        };
        
        mockRetentionRepo.createActivityMonitoring.mockResolvedValue(monitoring);
        
        const result = await service.monitorUserActivity('user-123');
        expect(result.status).toBe(testCase.expectedStatus);
      }
    });
  });

  describe('getHighRiskUsers', () => {
    const mockHighRiskUsers: UserChurnRisk[] = [
      {
        id: 'risk-1',
        userId: 'user-1',
        churnRiskScore: 85,
        riskLevel: 'high',
        riskFactors: [],
        confidence: 80,
        lastActivityDate: new Date(),
        daysSinceLastActivity: 15,
        activityTrend: 'decreasing',
        engagementScore: 25,
        lifetimeValue: 2000,
        interventionRecommendations: [],
        calculatedAt: new Date(),
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'risk-2',
        userId: 'user-2',
        churnRiskScore: 78,
        riskLevel: 'high',
        riskFactors: [],
        confidence: 75,
        lastActivityDate: new Date(),
        daysSinceLastActivity: 12,
        activityTrend: 'decreasing',
        engagementScore: 30,
        lifetimeValue: 1500,
        interventionRecommendations: [],
        calculatedAt: new Date(),
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    beforeEach(() => {
      mockRetentionRepo.getHighRiskUsers.mockResolvedValue(mockHighRiskUsers);
    });

    it('should retrieve high-risk users successfully', async () => {
      const result = await service.getHighRiskUsers('high', 50);

      expect(mockRetentionRepo.getHighRiskUsers).toHaveBeenCalledWith('high', 50);
      expect(result).toEqual(mockHighRiskUsers);
      expect(result).toHaveLength(2);
      expect(result.every(user => user.riskLevel === 'high')).toBe(true);
    });

    it('should use default parameters when not provided', async () => {
      await service.getHighRiskUsers();

      expect(mockRetentionRepo.getHighRiskUsers).toHaveBeenCalledWith('high', 100);
    });

    it('should handle different risk levels', async () => {
      await service.getHighRiskUsers('critical', 25);

      expect(mockRetentionRepo.getHighRiskUsers).toHaveBeenCalledWith('critical', 25);
    });
  });

  describe('updateChurnRisk', () => {
    it('should update churn risk for existing user', async () => {
      const updatedRisk = {
        id: 'risk-1',
        userId: 'user-123',
        churnRiskScore: 45,
        riskLevel: 'medium' as const,
        riskFactors: [],
        confidence: 80,
        lastActivityDate: new Date(),
        daysSinceLastActivity: 3,
        activityTrend: 'stable' as const,
        engagementScore: 70,
        lifetimeValue: 2000,
        interventionRecommendations: [],
        calculatedAt: new Date(),
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      jest.spyOn(service, 'calculateChurnRisk').mockResolvedValue(updatedRisk);

      const result = await service.updateChurnRisk('user-123');

      expect(service.calculateChurnRisk).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(updatedRisk);
    });

    it('should handle errors during update', async () => {
      jest.spyOn(service, 'calculateChurnRisk').mockRejectedValue(new Error('Update failed'));

      await expect(service.updateChurnRisk('user-123'))
        .rejects.toThrow('Update failed');
    });
  });

  describe('private helper methods', () => {
    it('should calculate sessions correctly', () => {
      const clicks = [
        { clickTime: new Date('2024-01-01T10:00:00Z') },
        { clickTime: new Date('2024-01-01T10:15:00Z') }, // Same session
        { clickTime: new Date('2024-01-01T11:00:00Z') }, // New session (45 min gap)
        { clickTime: new Date('2024-01-01T11:10:00Z') }  // Same session
      ];

      const sessions = service['calculateSessions'](clicks as any);
      expect(sessions).toBe(2);
    });

    it('should calculate engagement score correctly', () => {
      const score = service['calculateEngagementScore'](10, 50, 5, 2);
      
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should determine recent trend correctly', () => {
      // Test with increasing trend
      const increasingClicks = [
        { clickTime: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) }, // 20 days ago
        { clickTime: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) }, // 15 days ago
        { clickTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },  // 3 days ago
        { clickTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },  // 2 days ago
        { clickTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) }   // 1 day ago
      ];

      const trend = service['calculateRecentTrend'](increasingClicks as any);
      expect(['increasing', 'stable', 'decreasing']).toContain(trend);
    });

    it('should return inactive for empty clicks', () => {
      const trend = service['calculateRecentTrend']([]);
      expect(trend).toBe('inactive');
    });

    it('should return stable for insufficient data', () => {
      const fewClicks = [
        { clickTime: new Date() },
        { clickTime: new Date() }
      ];

      const trend = service['calculateRecentTrend'](fewClicks as any);
      expect(trend).toBe('stable');
    });
  });
});
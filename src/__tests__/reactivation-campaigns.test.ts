import { Pool } from 'pg';
import { ReactivationCampaignService, ReactivationCampaignConfig } from '../services/retention/ReactivationCampaignService';
import { WinBackCampaignService, WinBackCampaignConfig } from '../services/retention/WinBackCampaignService';
import { RetentionEscalationService } from '../services/retention/RetentionEscalationService';
import { RetentionEngineRepository } from '../repositories/RetentionEngineRepository';
import { TrafficManagerRepository } from '../repositories/TrafficManagerRepository';
import { UserRepository } from '../repositories/UserRepository';
import { RetentionCampaign, WinBackCampaign, UserChurnRisk } from '../models/RetentionEngine';

// Mock dependencies
jest.mock('pg');
jest.mock('../repositories/RetentionEngineRepository');
jest.mock('../repositories/TrafficManagerRepository');
jest.mock('../repositories/UserRepository');

describe('Reactivation Campaign Services', () => {
  let mockPool: jest.Mocked<Pool>;
  let mockRetentionRepo: jest.Mocked<RetentionEngineRepository>;
  let mockTrafficRepo: jest.Mocked<TrafficManagerRepository>;
  let mockUserRepo: jest.Mocked<UserRepository>;

  beforeEach(() => {
    mockPool = new Pool() as jest.Mocked<Pool>;
    mockRetentionRepo = new RetentionEngineRepository(mockPool) as jest.Mocked<RetentionEngineRepository>;
    mockTrafficRepo = new TrafficManagerRepository(mockPool) as jest.Mocked<TrafficManagerRepository>;
    mockUserRepo = new UserRepository(mockPool) as jest.Mocked<UserRepository>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ReactivationCampaignService', () => {
    let service: ReactivationCampaignService;

    beforeEach(() => {
      service = new ReactivationCampaignService(mockPool);
      service['retentionRepo'] = mockRetentionRepo;
      service['trafficRepo'] = mockTrafficRepo;
      service['userRepo'] = mockUserRepo;
    });

    describe('createReactivationCampaign', () => {
      const mockConfig: ReactivationCampaignConfig = {
        name: 'At-Risk User Reactivation',
        description: 'Campaign to reactivate at-risk users',
        targetSegment: 'at_risk',
        triggerConditions: [
          {
            triggerType: 'score_based',
            conditions: [
              {
                field: 'churn_risk_score',
                operator: 'greater_than',
                value: 60,
                timeWindow: 1440
              }
            ],
            frequency: 'once',
            cooldownPeriod: 168
          }
        ],
        actions: [
          {
            actionType: 'send_message',
            parameters: {
              channel: 'telegram',
              template: 'reactivation_offer',
              content: 'We miss you! Here\'s a special 15% discount.',
              offerDetails: {
                offerType: 'discount',
                value: 15,
                validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
              }
            },
            delay: 0
          }
        ],
        escalationRules: [
          {
            condition: 'no_response',
            timeThreshold: 48,
            action: 'increase_offer',
            parameters: { newDiscountValue: 20 }
          }
        ],
        budget: 5000,
        duration: 14,
        cooldownPeriod: 168
      };

      const mockCampaign: RetentionCampaign = {
        id: 'campaign-1',
        name: mockConfig.name,
        description: mockConfig.description,
        campaignType: 'reactive',
        status: 'draft',
        targetSegment: {
          segmentType: 'churn_risk',
          criteria: [
            { field: 'risk_level', operator: 'equals', value: 'medium' },
            { field: 'days_since_last_activity', operator: 'greater_than', value: 7 }
          ],
          estimatedSize: 0,
          refreshFrequency: 'daily'
        },
        triggers: mockConfig.triggerConditions,
        actions: mockConfig.actions,
        schedule: {
          scheduleType: 'immediate',
          timezone: 'Asia/Kolkata'
        },
        budget: {
          totalBudget: mockConfig.budget,
          currency: 'INR',
          spentAmount: 0,
          costPerAction: 25,
          budgetAllocation: [],
          alertThresholds: [50, 75, 90]
        },
        performance: {
          targetUsers: 0,
          reachedUsers: 0,
          engagedUsers: 0,
          convertedUsers: 0,
          reachRate: 0,
          engagementRate: 0,
          conversionRate: 0,
          costPerEngagement: 0,
          costPerConversion: 0,
          roi: 0,
          retentionImpact: 0,
          churnReduction: 0,
          revenueImpact: 0,
          metrics: {},
          lastUpdated: new Date()
        },
        startDate: new Date(),
        endDate: new Date(Date.now() + mockConfig.duration * 24 * 60 * 60 * 1000),
        createdBy: 'system',
        metadata: {
          escalationRules: mockConfig.escalationRules,
          cooldownPeriod: mockConfig.cooldownPeriod,
          autoGenerated: true
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      beforeEach(() => {
        mockRetentionRepo.createRetentionCampaign.mockResolvedValue(mockCampaign);
      });

      it('should create reactivation campaign successfully', async () => {
        const result = await service.createReactivationCampaign(mockConfig);

        expect(mockRetentionRepo.createRetentionCampaign).toHaveBeenCalled();
        expect(result).toEqual(mockCampaign);
        expect(result.campaignType).toBe('reactive');
        expect(result.name).toBe(mockConfig.name);
      });

      it('should build correct segment criteria for at-risk users', async () => {
        await service.createReactivationCampaign(mockConfig);

        const createCall = mockRetentionRepo.createRetentionCampaign.mock.calls[0][0];
        expect(createCall.targetSegment.segmentType).toBe('churn_risk');
        expect(createCall.targetSegment.criteria).toContainEqual({
          field: 'risk_level',
          operator: 'equals',
          value: 'medium'
        });
      });

      it('should calculate budget allocation correctly', async () => {
        await service.createReactivationCampaign(mockConfig);

        const createCall = mockRetentionRepo.createRetentionCampaign.mock.calls[0][0];
        expect(createCall.budget.totalBudget).toBe(mockConfig.budget);
        expect(createCall.budget.currency).toBe('INR');
        expect(createCall.budget.costPerAction).toBeGreaterThan(0);
      });

      it('should handle different target segments', async () => {
        const churnedConfig = { ...mockConfig, targetSegment: 'churned' as const };
        await service.createReactivationCampaign(churnedConfig);

        const createCall = mockRetentionRepo.createRetentionCampaign.mock.calls[0][0];
        expect(createCall.targetSegment.criteria).toContainEqual({
          field: 'days_since_last_activity',
          operator: 'greater_than',
          value: 30
        });
      });
    });

    describe('executeCampaign', () => {
      const mockCampaign: RetentionCampaign = {
        id: 'campaign-1',
        name: 'Test Campaign',
        description: 'Test campaign',
        campaignType: 'reactive',
        status: 'active',
        targetSegment: {
          segmentType: 'churn_risk',
          criteria: [{ field: 'risk_level', operator: 'equals', value: 'high' }],
          estimatedSize: 50,
          refreshFrequency: 'daily'
        },
        triggers: [],
        actions: [
          {
            actionType: 'send_message',
            parameters: {
              channel: 'telegram',
              content: 'Test message'
            }
          }
        ],
        schedule: { scheduleType: 'immediate', timezone: 'Asia/Kolkata' },
        budget: { totalBudget: 1000, currency: 'INR', spentAmount: 0, costPerAction: 10, budgetAllocation: [], alertThresholds: [] },
        performance: {
          targetUsers: 0, reachedUsers: 0, engagedUsers: 0, convertedUsers: 0,
          reachRate: 0, engagementRate: 0, conversionRate: 0,
          costPerEngagement: 0, costPerConversion: 0, roi: 0,
          retentionImpact: 0, churnReduction: 0, revenueImpact: 0,
          metrics: {}, lastUpdated: new Date()
        },
        startDate: new Date(),
        createdBy: 'system',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockEligibleUsers: UserChurnRisk[] = [
        {
          id: 'risk-1',
          userId: 'user-1',
          churnRiskScore: 80,
          riskLevel: 'high',
          riskFactors: [],
          confidence: 85,
          lastActivityDate: new Date(),
          daysSinceLastActivity: 10,
          activityTrend: 'decreasing',
          engagementScore: 30,
          lifetimeValue: 2000,
          interventionRecommendations: [],
          calculatedAt: new Date(),
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      beforeEach(() => {
        mockRetentionRepo.getActiveCampaigns.mockResolvedValue([mockCampaign]);
        mockRetentionRepo.getHighRiskUsers.mockResolvedValue(mockEligibleUsers);
        mockUserRepo.findByTelegramId.mockResolvedValue({
          telegramId: 'user-1',
          firstName: 'Test',
          lastName: 'User',
          username: 'testuser',
          createdAt: new Date(),
          updatedAt: new Date()
        } as any);
      });

      it('should execute campaign for eligible users', async () => {
        await service.executeCampaign('campaign-1');

        expect(mockRetentionRepo.getActiveCampaigns).toHaveBeenCalled();
        expect(mockRetentionRepo.getHighRiskUsers).toHaveBeenCalledWith('high', 1000);
      });

      it('should throw error for non-existent campaign', async () => {
        mockRetentionRepo.getActiveCampaigns.mockResolvedValue([]);

        await expect(service.executeCampaign('non-existent'))
          .rejects.toThrow('Campaign not found: non-existent');
      });

      it('should handle empty eligible users list', async () => {
        mockRetentionRepo.getHighRiskUsers.mockResolvedValue([]);

        await expect(service.executeCampaign('campaign-1')).resolves.not.toThrow();
      });
    });
  });

  describe('WinBackCampaignService', () => {
    let service: WinBackCampaignService;

    beforeEach(() => {
      service = new WinBackCampaignService(mockPool);
      service['retentionRepo'] = mockRetentionRepo;
      service['trafficRepo'] = mockTrafficRepo;
      service['userRepo'] = mockUserRepo;
    });

    describe('createWinBackCampaign', () => {
      const mockConfig: WinBackCampaignConfig = {
        name: 'High-Value Win-Back',
        description: 'Win back high-value churned customers',
        targetSegment: 'high_value_churned',
        churnTimeframeDays: 60,
        strategy: {
          strategyType: 'aggressive_discount',
          phases: [
            {
              name: 'Initial Outreach',
              duration: 3,
              offerType: 'percentage_discount',
              offerValue: 25,
              messageTemplate: 'winback_phase1',
              successThreshold: 15
            },
            {
              name: 'Enhanced Offer',
              duration: 5,
              offerType: 'percentage_discount',
              offerValue: 35,
              messageTemplate: 'winback_phase2',
              successThreshold: 25
            }
          ],
          escalationThreshold: 20,
          maxOfferValue: 50
        },
        budget: 10000,
        duration: 30
      };

      const mockWinBackCampaign: WinBackCampaign = {
        id: 'winback-1',
        name: mockConfig.name,
        description: mockConfig.description,
        targetSegment: mockConfig.targetSegment,
        churnTimeframe: {
          startDate: new Date(Date.now() - mockConfig.churnTimeframeDays * 24 * 60 * 60 * 1000),
          endDate: new Date(),
          preset: 'custom'
        },
        winBackStrategy: {
          strategyType: mockConfig.strategy.strategyType,
          phases: mockConfig.strategy.phases.map((phase, index) => ({
            phaseNumber: index + 1,
            name: phase.name,
            duration: phase.duration,
            actions: [{
              actionType: 'send_message',
              parameters: {
                channel: 'telegram',
                template: phase.messageTemplate,
                offerDetails: {
                  offerType: phase.offerType,
                  value: phase.offerValue
                }
              }
            }],
            successThreshold: phase.successThreshold,
            failureAction: index < mockConfig.strategy.phases.length - 1 ? 'escalate' : 'end'
          })),
          escalationRules: [],
          successCriteria: {
            primaryMetric: 'reactivation_rate',
            targetValue: mockConfig.strategy.escalationThreshold,
            timeframe: mockConfig.strategy.phases.reduce((sum, p) => sum + p.duration, 0),
            minimumSampleSize: 50
          }
        },
        offers: [],
        touchpoints: [],
        performance: {
          targetUsers: 0,
          contactedUsers: 0,
          reactivatedUsers: 0,
          reactivationRate: 0,
          revenueRecovered: 0,
          averageRevenuePerReactivation: 0,
          costPerReactivation: 0,
          roi: 0,
          touchpointPerformance: {},
          phasePerformance: {},
          timeToReactivation: 0
        },
        budget: mockConfig.budget,
        status: 'draft',
        startDate: new Date(),
        endDate: new Date(Date.now() + mockConfig.duration * 24 * 60 * 60 * 1000),
        metadata: {
          autoGenerated: true,
          configUsed: mockConfig
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      beforeEach(() => {
        mockRetentionRepo.createWinBackCampaign.mockResolvedValue(mockWinBackCampaign);
      });

      it('should create win-back campaign successfully', async () => {
        const result = await service.createWinBackCampaign(mockConfig);

        expect(mockRetentionRepo.createWinBackCampaign).toHaveBeenCalled();
        expect(result).toEqual(mockWinBackCampaign);
        expect(result.targetSegment).toBe(mockConfig.targetSegment);
      });

      it('should build win-back strategy correctly', async () => {
        await service.createWinBackCampaign(mockConfig);

        const createCall = mockRetentionRepo.createWinBackCampaign.mock.calls[0][0];
        expect(createCall.winBackStrategy.strategyType).toBe(mockConfig.strategy.strategyType);
        expect(createCall.winBackStrategy.phases).toHaveLength(mockConfig.strategy.phases.length);
      });

      it('should set correct churn timeframe', async () => {
        await service.createWinBackCampaign(mockConfig);

        const createCall = mockRetentionRepo.createWinBackCampaign.mock.calls[0][0];
        const timeframeDays = Math.ceil(
          (createCall.churnTimeframe.endDate.getTime() - createCall.churnTimeframe.startDate.getTime()) 
          / (24 * 60 * 60 * 1000)
        );
        expect(timeframeDays).toBe(mockConfig.churnTimeframeDays);
      });
    });

    describe('executeWinBackCampaign', () => {
      const mockWinBackCampaign: WinBackCampaign = {
        id: 'winback-1',
        name: 'Test Win-Back',
        description: 'Test win-back campaign',
        targetSegment: 'recently_churned',
        churnTimeframe: {
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          endDate: new Date(),
          preset: 'custom'
        },
        winBackStrategy: {
          strategyType: 'aggressive_discount',
          phases: [
            {
              phaseNumber: 1,
              name: 'Phase 1',
              duration: 3,
              actions: [{
                actionType: 'send_message',
                parameters: { channel: 'telegram', content: 'Win-back message' }
              }],
              successThreshold: 15,
              failureAction: 'escalate'
            }
          ],
          escalationRules: [],
          successCriteria: {
            primaryMetric: 'reactivation_rate',
            targetValue: 20,
            timeframe: 7,
            minimumSampleSize: 50
          }
        },
        offers: [{
          offerType: 'percentage_discount',
          value: 25,
          description: 'Test offer',
          validityPeriod: 7,
          usageLimit: 1,
          conditions: [],
          personalizedElements: []
        }],
        touchpoints: [{
          touchpointType: 'telegram',
          timing: 0,
          content: {
            headline: 'We Miss You!',
            body: 'Come back for exclusive offers',
            callToAction: 'Claim Offer'
          },
          personalization: []
        }],
        performance: {
          targetUsers: 0, contactedUsers: 0, reactivatedUsers: 0, reactivationRate: 0,
          revenueRecovered: 0, averageRevenuePerReactivation: 0, costPerReactivation: 0,
          roi: 0, touchpointPerformance: {}, phasePerformance: {}, timeToReactivation: 0
        },
        budget: 5000,
        status: 'active',
        startDate: new Date(),
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockChurnedUsers = [
        {
          userId: 'churned-user-1',
          churnDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
          lifetimeValue: 2500,
          lastPurchaseCategory: 'electronics',
          churnReason: 'inactivity'
        }
      ];

      beforeEach(() => {
        mockRetentionRepo.getActiveWinBackCampaigns.mockResolvedValue([mockWinBackCampaign]);
        // Mock the private method
        jest.spyOn(service as any, 'getChurnedUsers').mockResolvedValue(mockChurnedUsers);
        jest.spyOn(service as any, 'executeWinBackStrategy').mockResolvedValue(undefined);
        jest.spyOn(service as any, 'updateWinBackPerformance').mockResolvedValue(undefined);
      });

      it('should execute win-back campaign successfully', async () => {
        await service.executeWinBackCampaign('winback-1');

        expect(mockRetentionRepo.getActiveWinBackCampaigns).toHaveBeenCalled();
        expect(service['getChurnedUsers']).toHaveBeenCalledWith(mockWinBackCampaign);
        expect(service['executeWinBackStrategy']).toHaveBeenCalledWith(mockWinBackCampaign, mockChurnedUsers[0]);
      });

      it('should throw error for non-existent campaign', async () => {
        mockRetentionRepo.getActiveWinBackCampaigns.mockResolvedValue([]);

        await expect(service.executeWinBackCampaign('non-existent'))
          .rejects.toThrow('Win-back campaign not found: non-existent');
      });
    });
  });

  describe('RetentionEscalationService', () => {
    let service: RetentionEscalationService;

    beforeEach(() => {
      service = new RetentionEscalationService(mockPool);
      service['retentionRepo'] = mockRetentionRepo;
    });

    describe('monitorEscalationTriggers', () => {
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
          lifetimeValue: 3000,
          interventionRecommendations: [],
          calculatedAt: new Date(),
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      beforeEach(() => {
        mockRetentionRepo.getHighRiskUsers.mockResolvedValue(mockHighRiskUsers);
        mockRetentionRepo.createRetentionAlert.mockResolvedValue({} as any);
        
        // Mock private methods
        jest.spyOn(service as any, 'isUserInCooldown').mockResolvedValue(false);
        jest.spyOn(service as any, 'getCurrentEscalationLevel').mockResolvedValue(0);
        jest.spyOn(service as any, 'executeEscalationLevel').mockResolvedValue(true);
        jest.spyOn(service as any, 'recordEscalationSuccess').mockResolvedValue(undefined);
      });

      it('should monitor escalation triggers successfully', async () => {
        await service.monitorEscalationTriggers();

        expect(mockRetentionRepo.getHighRiskUsers).toHaveBeenCalled();
      });

      it('should execute escalation for triggered users', async () => {
        await service.monitorEscalationTriggers();

        expect(service['executeEscalationLevel']).toHaveBeenCalled();
        expect(service['recordEscalationSuccess']).toHaveBeenCalled();
      });

      it('should skip users in cooldown period', async () => {
        jest.spyOn(service as any, 'isUserInCooldown').mockResolvedValue(true);

        await service.monitorEscalationTriggers();

        expect(service['executeEscalationLevel']).not.toHaveBeenCalled();
      });

      it('should handle escalation failures', async () => {
        jest.spyOn(service as any, 'executeEscalationLevel').mockResolvedValue(false);
        jest.spyOn(service as any, 'handleEscalationFailure').mockResolvedValue(undefined);

        await service.monitorEscalationTriggers();

        expect(service['handleEscalationFailure']).toHaveBeenCalled();
      });
    });

    describe('executeEscalationPlan', () => {
      const mockUser: UserChurnRisk = {
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
        lifetimeValue: 3000,
        interventionRecommendations: [],
        calculatedAt: new Date(),
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      beforeEach(() => {
        jest.spyOn(service as any, 'isUserInCooldown').mockResolvedValue(false);
        jest.spyOn(service as any, 'getCurrentEscalationLevel').mockResolvedValue(0);
        jest.spyOn(service as any, 'executeEscalationLevel').mockResolvedValue(true);
        jest.spyOn(service as any, 'recordEscalationSuccess').mockResolvedValue(undefined);
      });

      it('should execute escalation plan for user', async () => {
        const plan = service['defaultEscalationPlans'][0];
        
        await service.executeEscalationPlan(plan, mockUser);

        expect(service['isUserInCooldown']).toHaveBeenCalledWith(mockUser.userId, plan.cooldownPeriod);
        expect(service['getCurrentEscalationLevel']).toHaveBeenCalledWith(mockUser.userId, plan.id);
        expect(service['executeEscalationLevel']).toHaveBeenCalled();
      });

      it('should skip execution if user reached max escalation level', async () => {
        jest.spyOn(service as any, 'getCurrentEscalationLevel').mockResolvedValue(3);
        
        const plan = service['defaultEscalationPlans'][0];
        await service.executeEscalationPlan(plan, mockUser);

        expect(service['executeEscalationLevel']).not.toHaveBeenCalled();
      });
    });
  });
});
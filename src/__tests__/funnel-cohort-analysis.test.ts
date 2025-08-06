import { FunnelAnalysisService } from '../services/analytics/FunnelAnalysisService';
import { CohortAnalysisService } from '../services/analytics/CohortAnalysisService';
import { UserSegmentationService } from '../services/analytics/UserSegmentationService';
import { 
  CohortType,
  UserAction,
  EventType
} from '../models/Analytics';

describe('FunnelAnalysisService', () => {
  let funnelService: FunnelAnalysisService;

  beforeEach(() => {
    funnelService = new FunnelAnalysisService();
  });

  describe('Funnel Creation', () => {
    test('should create conversion funnel', async () => {
      const config = {
        name: 'Purchase Funnel',
        description: 'From coupon view to purchase completion',
        steps: [
          { name: 'Coupon View', eventName: 'coupon_view', isRequired: true },
          { name: 'Coupon Click', eventName: 'coupon_click', isRequired: true },
          { name: 'Purchase Initiated', eventName: 'purchase_initiated', isRequired: true },
          { name: 'Purchase Completed', eventName: 'purchase_completed', isRequired: true }
        ],
        timeWindow: 24 // 24 hours
      };

      const funnel = await funnelService.createFunnel(config);

      expect(funnel).toBeDefined();
      expect(funnel.id).toMatch(/^funnel_/);
      expect(funnel.name).toBe('Purchase Funnel');
      expect(funnel.steps).toHaveLength(4);
      expect(funnel.timeWindow).toBe(24);
      expect(funnel.isActive).toBe(true);
    });

    test('should create funnel with event properties', async () => {
      const config = {
        name: 'Electronics Funnel',
        description: 'Electronics category specific funnel',
        steps: [
          { 
            name: 'Electronics View', 
            eventName: 'coupon_view', 
            eventProperties: { category: 'electronics' },
            isRequired: true 
          },
          { 
            name: 'Electronics Click', 
            eventName: 'coupon_click', 
            eventProperties: { category: 'electronics' },
            isRequired: true 
          }
        ],
        timeWindow: 12
      };

      const funnel = await funnelService.createFunnel(config);

      expect(funnel.steps[0].eventProperties).toEqual({ category: 'electronics' });
      expect(funnel.steps[1].eventProperties).toEqual({ category: 'electronics' });
    });
  });

  describe('Funnel Analysis', () => {
    test('should analyze funnel performance', async () => {
      // First create a funnel
      const config = {
        name: 'Test Funnel',
        steps: [
          { name: 'Step 1', eventName: 'event_1', isRequired: true },
          { name: 'Step 2', eventName: 'event_2', isRequired: true },
          { name: 'Step 3', eventName: 'event_3', isRequired: true }
        ],
        timeWindow: 24
      };

      const funnel = await funnelService.createFunnel(config);
      
      const dateRange = {
        from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        to: new Date()
      };

      const analysis = await funnelService.analyzeFunnel(funnel.id, dateRange);

      expect(analysis).toBeDefined();
      expect(analysis.funnelId).toBe(funnel.id);
      expect(analysis.dateRange).toEqual(dateRange);
      expect(analysis.steps).toHaveLength(3);
      expect(typeof analysis.totalUsers).toBe('number');
      expect(typeof analysis.conversionRate).toBe('number');
      expect(Array.isArray(analysis.dropoffPoints)).toBe(true);
    });

    test('should calculate step conversion rates', async () => {
      const config = {
        name: 'Conversion Test',
        steps: [
          { name: 'Start', eventName: 'start_event', isRequired: true },
          { name: 'Middle', eventName: 'middle_event', isRequired: true },
          { name: 'End', eventName: 'end_event', isRequired: true }
        ],
        timeWindow: 24
      };

      const funnel = await funnelService.createFunnel(config);
      const analysis = await funnelService.analyzeFunnel(funnel.id, {
        from: new Date(Date.now() - 24 * 60 * 60 * 1000),
        to: new Date()
      });

      analysis.steps.forEach(step => {
        expect(step.conversionRate).toBeGreaterThanOrEqual(0);
        expect(step.conversionRate).toBeLessThanOrEqual(1);
        expect(step.dropoffRate).toBeGreaterThanOrEqual(0);
        expect(step.dropoffRate).toBeLessThanOrEqual(1);
        expect(step.usersEntered).toBeGreaterThanOrEqual(0);
        expect(step.usersCompleted).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Funnel Insights', () => {
    test('should generate funnel insights', async () => {
      const config = {
        name: 'Insights Test',
        steps: [
          { name: 'View', eventName: 'view_event', isRequired: true },
          { name: 'Click', eventName: 'click_event', isRequired: true },
          { name: 'Convert', eventName: 'convert_event', isRequired: true }
        ],
        timeWindow: 24
      };

      const funnel = await funnelService.createFunnel(config);
      const insights = await funnelService.getFunnelInsights(funnel.id, {
        from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        to: new Date()
      });

      expect(insights).toBeDefined();
      expect(typeof insights.overallConversionRate).toBe('number');
      expect(typeof insights.biggestDropoffStep).toBe('string');
      expect(typeof insights.dropoffRate).toBe('number');
      expect(typeof insights.averageTimeToConvert).toBe('number');
      expect(Array.isArray(insights.topPerformingSegments)).toBe(true);
      expect(Array.isArray(insights.recommendations)).toBe(true);
    });

    test('should compare funnel performance across periods', async () => {
      const config = {
        name: 'Comparison Test',
        steps: [
          { name: 'Start', eventName: 'start', isRequired: true },
          { name: 'End', eventName: 'end', isRequired: true }
        ],
        timeWindow: 24
      };

      const funnel = await funnelService.createFunnel(config);
      
      const currentPeriod = {
        from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        to: new Date()
      };
      
      const previousPeriod = {
        from: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        to: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      };

      const comparison = await funnelService.compareFunnelPerformance(
        funnel.id,
        currentPeriod,
        previousPeriod
      );

      expect(comparison).toBeDefined();
      expect(comparison.current).toBeDefined();
      expect(comparison.previous).toBeDefined();
      expect(Array.isArray(comparison.changes)).toBe(true);
      
      comparison.changes.forEach(change => {
        expect(typeof change.step).toBe('string');
        expect(typeof change.conversionRateChange).toBe('number');
        expect(typeof change.userCountChange).toBe('number');
        expect(['improved', 'declined', 'stable']).toContain(change.trend);
      });
    });
  });

  describe('Funnel Segmentation', () => {
    test('should segment funnel analysis', async () => {
      const config = {
        name: 'Segmentation Test',
        steps: [
          { name: 'View', eventName: 'view', isRequired: true },
          { name: 'Convert', eventName: 'convert', isRequired: true }
        ],
        timeWindow: 24
      };

      const funnel = await funnelService.createFunnel(config);
      const segmentedAnalysis = await funnelService.segmentFunnelAnalysis(
        funnel.id,
        {
          from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          to: new Date()
        },
        'platform'
      );

      expect(Array.isArray(segmentedAnalysis)).toBe(true);
      
      segmentedAnalysis.forEach(segment => {
        expect(typeof segment.segment).toBe('string');
        expect(segment.analysis).toBeDefined();
        expect(typeof segment.userCount).toBe('number');
      });
    });
  });
});

describe('CohortAnalysisService', () => {
  let cohortService: CohortAnalysisService;

  beforeEach(() => {
    cohortService = new CohortAnalysisService();
  });

  describe('Cohort Creation', () => {
    test('should create cohort analysis', async () => {
      const config = {
        name: 'User Retention Cohorts',
        cohortType: CohortType.ACQUISITION,
        acquisitionEvent: UserAction.BOT_START,
        retentionEvent: 'any_activity',
        timeUnit: 'week' as const,
        periods: 8
      };

      const dateRange = {
        from: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
        to: new Date()
      };

      const analysis = await cohortService.createCohortAnalysis(config, dateRange);

      expect(analysis).toBeDefined();
      expect(analysis.id).toMatch(/^cohort_analysis_/);
      expect(analysis.name).toBe('User Retention Cohorts');
      expect(analysis.cohortType).toBe(CohortType.ACQUISITION);
      expect(analysis.dateRange).toEqual(dateRange);
      expect(Array.isArray(analysis.cohorts)).toBe(true);
      expect(Array.isArray(analysis.retentionMatrix)).toBe(true);
      expect(Array.isArray(analysis.averageRetention)).toBe(true);
    });

    test('should create revenue cohort analysis', async () => {
      const config = {
        name: 'Revenue Cohorts',
        cohortType: CohortType.REVENUE,
        acquisitionEvent: UserAction.BOT_START,
        retentionEvent: UserAction.PURCHASE_COMPLETED,
        timeUnit: 'month' as const,
        periods: 6
      };

      const analysis = await cohortService.createCohortAnalysis(config, {
        from: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
        to: new Date()
      });

      expect(analysis.cohortType).toBe(CohortType.REVENUE);
      expect(analysis.cohorts.every(c => c.retentionRates.length <= 6)).toBe(true);
    });
  });

  describe('Retention Analysis', () => {
    test('should analyze retention cohorts', async () => {
      const analysis = await cohortService.analyzeRetentionCohorts({
        from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        to: new Date()
      }, 'week', 12);

      expect(analysis).toBeDefined();
      expect(analysis.name).toBe('User Retention Analysis');
      expect(analysis.cohortType).toBe(CohortType.ACQUISITION);
      
      // Check retention matrix structure
      analysis.retentionMatrix.forEach(cohortRetention => {
        expect(Array.isArray(cohortRetention)).toBe(true);
        cohortRetention.forEach(rate => {
          expect(rate).toBeGreaterThanOrEqual(0);
          expect(rate).toBeLessThanOrEqual(1);
        });
      });
    });

    test('should analyze revenue cohorts', async () => {
      const analysis = await cohortService.analyzeRevenueCohorts({
        from: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        to: new Date()
      });

      expect(analysis.cohortType).toBe(CohortType.REVENUE);
      expect(analysis.cohorts.length).toBeGreaterThan(0);
    });
  });

  describe('Cohort Comparison', () => {
    test('should compare cohorts', async () => {
      const config1 = {
        name: 'Mobile Users',
        cohortType: CohortType.ACQUISITION,
        acquisitionEvent: UserAction.BOT_START,
        retentionEvent: 'any_activity',
        timeUnit: 'week' as const,
        periods: 8,
        filters: { userProperties: { platform: 'mobile' } }
      };

      const config2 = {
        name: 'Desktop Users',
        cohortType: CohortType.ACQUISITION,
        acquisitionEvent: UserAction.BOT_START,
        retentionEvent: 'any_activity',
        timeUnit: 'week' as const,
        periods: 8,
        filters: { userProperties: { platform: 'desktop' } }
      };

      const comparison = await cohortService.compareCohorts(
        config1,
        config2,
        {
          from: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          to: new Date()
        }
      );

      expect(comparison).toBeDefined();
      expect(comparison.cohort1).toBeDefined();
      expect(comparison.cohort2).toBeDefined();
      expect(Array.isArray(comparison.retentionDifference)).toBe(true);
      expect(Array.isArray(comparison.significantDifferences)).toBe(true);

      comparison.significantDifferences.forEach(diff => {
        expect(typeof diff.period).toBe('number');
        expect(typeof diff.difference).toBe('number');
        expect(typeof diff.isSignificant).toBe('boolean');
      });
    });
  });

  describe('Cohort Insights', () => {
    test('should generate cohort insights', async () => {
      const analysis = await cohortService.analyzeRetentionCohorts({
        from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        to: new Date()
      });

      const insights = await cohortService.getCohortInsights(analysis);

      expect(insights).toBeDefined();
      expect(typeof insights.bestPerformingCohort).toBe('string');
      expect(typeof insights.worstPerformingCohort).toBe('string');
      expect(['improving', 'declining', 'stable']).toContain(insights.retentionTrend);
      expect(Array.isArray(insights.keyInsights)).toBe(true);
      expect(Array.isArray(insights.recommendations)).toBe(true);

      insights.keyInsights.forEach(insight => {
        expect(typeof insight).toBe('string');
        expect(insight.length).toBeGreaterThan(0);
      });

      insights.recommendations.forEach(recommendation => {
        expect(typeof recommendation).toBe('string');
        expect(recommendation.length).toBeGreaterThan(0);
      });
    });
  });
});

describe('UserSegmentationService', () => {
  let segmentationService: UserSegmentationService;

  beforeEach(() => {
    segmentationService = new UserSegmentationService();
  });

  describe('Segment Creation', () => {
    test('should create user segment', async () => {
      const criteria = [
        {
          type: 'behavior' as const,
          field: 'total_purchases',
          operator: 'gte' as const,
          value: 3,
          timeframe: { period: 3, unit: 'months' as const }
        },
        {
          type: 'property' as const,
          field: 'user_tier',
          operator: 'eq' as const,
          value: 'premium'
        }
      ];

      const segment = await segmentationService.createSegment(
        'Premium Active Users',
        'Users with premium tier and multiple purchases',
        criteria
      );

      expect(segment).toBeDefined();
      expect(segment.id).toMatch(/^segment_/);
      expect(segment.name).toBe('Premium Active Users');
      expect(segment.criteria).toEqual(criteria);
      expect(typeof segment.userCount).toBe('number');
      expect(segment.userCount).toBeGreaterThan(0);
    });

    test('should create predefined segments', async () => {
      const segments = await segmentationService.createPredefinedSegments();

      expect(Array.isArray(segments)).toBe(true);
      expect(segments.length).toBeGreaterThan(0);

      const segmentNames = segments.map(s => s.name);
      expect(segmentNames).toContain('High Value Users');
      expect(segmentNames).toContain('New Users');
      expect(segmentNames).toContain('At Risk Users');
      expect(segmentNames).toContain('Mobile Users');
      expect(segmentNames).toContain('Cashback Enthusiasts');

      segments.forEach(segment => {
        expect(segment.id).toMatch(/^segment_/);
        expect(typeof segment.name).toBe('string');
        expect(typeof segment.description).toBe('string');
        expect(Array.isArray(segment.criteria)).toBe(true);
        expect(typeof segment.userCount).toBe('number');
      });
    });
  });

  describe('Segment Analysis', () => {
    test('should analyze segment performance', async () => {
      const segment = await segmentationService.createSegment(
        'Test Segment',
        'Test segment for analysis',
        [
          {
            type: 'behavior' as const,
            field: 'session_count',
            operator: 'gte' as const,
            value: 5
          }
        ]
      );

      const analysis = await segmentationService.analyzeSegment(
        segment.id,
        {
          from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          to: new Date()
        }
      );

      expect(analysis).toBeDefined();
      expect(analysis.segment).toEqual(segment);
      
      // Check metrics structure
      const metrics = analysis.metrics;
      expect(typeof metrics.totalUsers).toBe('number');
      expect(typeof metrics.activeUsers).toBe('number');
      expect(typeof metrics.conversionRate).toBe('number');
      expect(typeof metrics.averageSessionDuration).toBe('number');
      expect(typeof metrics.totalRevenue).toBe('number');
      expect(typeof metrics.averageRevenuePerUser).toBe('number');
      expect(typeof metrics.retentionRate).toBe('number');
      expect(typeof metrics.churnRate).toBe('number');

      // Check top events
      expect(Array.isArray(analysis.topEvents)).toBe(true);
      analysis.topEvents.forEach(event => {
        expect(typeof event.eventName).toBe('string');
        expect(typeof event.count).toBe('number');
        expect(typeof event.uniqueUsers).toBe('number');
      });

      // Check behavior patterns
      expect(Array.isArray(analysis.behaviorPatterns)).toBe(true');
      analysis.behaviorPatterns.forEach(pattern => {
        expect(typeof pattern).toBe('string');
      });
    });
  });

  describe('Segment Comparison', () => {
    test('should compare multiple segments', async () => {
      // Create test segments
      const segment1 = await segmentationService.createSegment(
        'High Spenders',
        'Users with high purchase amounts',
        [
          {
            type: 'behavior' as const,
            field: 'total_spent',
            operator: 'gte' as const,
            value: 1000
          }
        ]
      );

      const segment2 = await segmentationService.createSegment(
        'Frequent Users',
        'Users with many sessions',
        [
          {
            type: 'behavior' as const,
            field: 'session_count',
            operator: 'gte' as const,
            value: 10
          }
        ]
      );

      const comparison = await segmentationService.compareSegments(
        [segment1.id, segment2.id],
        {
          from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          to: new Date()
        }
      );

      expect(comparison).toBeDefined();
      expect(comparison.segments).toHaveLength(2);
      expect(Array.isArray(comparison.metrics)).toBe(true);
      expect(Array.isArray(comparison.insights)).toBe(true);

      comparison.metrics.forEach(metric => {
        expect(typeof metric.metric).toBe('string');
        expect(Array.isArray(metric.values)).toBe(true);
        expect(metric.values).toHaveLength(2);
        expect(typeof metric.bestPerforming).toBe('string');
        expect(typeof metric.worstPerforming).toBe('string');
      });
    });
  });

  describe('Segment Recommendations', () => {
    test('should generate segment recommendations', async () => {
      const segment = await segmentationService.createSegment(
        'Recommendation Test',
        'Test segment for recommendations',
        [
          {
            type: 'behavior' as const,
            field: 'purchase_count',
            operator: 'gte' as const,
            value: 2
          }
        ]
      );

      const recommendations = await segmentationService.getSegmentRecommendations(segment.id);

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations.targetingRecommendations)).toBe(true);
      expect(Array.isArray(recommendations.engagementStrategies)).toBe(true);
      expect(Array.isArray(recommendations.conversionOptimizations)).toBe(true);

      // Check that recommendations are non-empty strings
      [...recommendations.targetingRecommendations, 
       ...recommendations.engagementStrategies, 
       ...recommendations.conversionOptimizations].forEach(rec => {
        expect(typeof rec).toBe('string');
        expect(rec.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid segment ID', async () => {
      await expect(
        segmentationService.analyzeSegment('invalid_segment_id', {
          from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          to: new Date()
        })
      ).rejects.toThrow('Segment not found');
    });

    test('should handle empty segment criteria', async () => {
      await expect(
        segmentationService.createSegment('Empty Segment', 'No criteria', [])
      ).resolves.toBeDefined();
    });
  });
});
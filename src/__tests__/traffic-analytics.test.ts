import { Pool } from 'pg';
import { TrafficAnalyticsService } from '../services/analytics/TrafficAnalyticsService';
import { TrafficAnalyticsRepository } from '../repositories/TrafficAnalyticsRepository';
import { TrafficManagerRepository } from '../repositories/TrafficManagerRepository';
import { 
  TrafficAnalyticsDashboard, 
  ABTest, 
  ChannelPerformance, 
  ROIAnalysis,
  AnalyticsAlert,
  DateRange
} from '../models/TrafficAnalytics';

// Mock dependencies
jest.mock('pg');
jest.mock('../repositories/TrafficAnalyticsRepository');
jest.mock('../repositories/TrafficManagerRepository');
jest.mock('csv-writer');

describe('TrafficAnalyticsService', () => {
  let service: TrafficAnalyticsService;
  let mockPool: jest.Mocked<Pool>;
  let mockAnalyticsRepo: jest.Mocked<TrafficAnalyticsRepository>;
  let mockTrafficRepo: jest.Mocked<TrafficManagerRepository>;

  beforeEach(() => {
    mockPool = new Pool() as jest.Mocked<Pool>;
    service = new TrafficAnalyticsService(mockPool);
    
    mockAnalyticsRepo = service['analyticsRepo'] as jest.Mocked<TrafficAnalyticsRepository>;
    mockTrafficRepo = service['trafficRepo'] as jest.Mocked<TrafficManagerRepository>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Dashboard operations', () => {
    const mockDashboard: TrafficAnalyticsDashboard = {
      id: 'dashboard-1',
      name: 'Test Dashboard',
      description: 'Test dashboard for analytics',
      dashboardType: 'overview',
      widgets: [
        {
          id: 'widget-1',
          type: 'chart',
          title: 'Revenue Trend',
          position: { x: 0, y: 0, width: 6, height: 4 },
          dataSource: 'conversions',
          query: 'SELECT * FROM conversion_events',
          chartConfig: {
            chartType: 'line',
            xAxis: 'date',
            yAxis: 'revenue'
          },
          isVisible: true,
          metadata: {}
        }
      ],
      filters: [
        {
          id: 'filter-1',
          name: 'Date Range',
          type: 'date_range',
          field: 'date',
          isRequired: true,
          isVisible: true
        }
      ],
      dateRange: {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        preset: 'last_30_days'
      },
      refreshInterval: 300,
      isPublic: false,
      ownerId: 'user-123',
      permissions: [],
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };

    beforeEach(() => {
      mockAnalyticsRepo.createDashboard.mockResolvedValue(mockDashboard);
      mockAnalyticsRepo.getTrafficOverview.mockResolvedValue({
        total_clicks: 1000,
        unique_users: 800,
        total_conversions: 50,
        total_revenue: 25000,
        conversion_rate: 5.0
      });
      mockAnalyticsRepo.getChannelComparison.mockResolvedValue([
        {
          channel: 'personal_channel',
          clicks: 600,
          conversions: 30,
          revenue: 15000,
          conversion_rate: 5.0
        }
      ]);
      mockAnalyticsRepo.getTrendData.mockResolvedValue([
        { period: '2024-01-01', clicks: 100, conversions: 5, revenue: 2500 }
      ]);
      mockAnalyticsRepo.getInsightsByStatus.mockResolvedValue([]);
    });

    it('should create dashboard successfully', async () => {
      const dashboardData = { ...mockDashboard };
      delete (dashboardData as any).id;
      delete (dashboardData as any).createdAt;
      delete (dashboardData as any).updatedAt;

      const result = await service.createDashboard(dashboardData);

      expect(mockAnalyticsRepo.createDashboard).toHaveBeenCalledWith(dashboardData);
      expect(result).toEqual(mockDashboard);
    });

    it('should get dashboard data successfully', async () => {
      const filters = {
        dateRange: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31')
        }
      };

      const result = await service.getDashboardData('dashboard-1', filters);

      expect(result).toHaveProperty('overview');
      expect(result).toHaveProperty('channelComparison');
      expect(result).toHaveProperty('trends');
      expect(result).toHaveProperty('topPerformers');
      expect(result).toHaveProperty('recentInsights');
      
      expect(mockAnalyticsRepo.getTrafficOverview).toHaveBeenCalled();
      expect(mockAnalyticsRepo.getChannelComparison).toHaveBeenCalled();
      expect(mockAnalyticsRepo.getTrendData).toHaveBeenCalled();
    });

    it('should use default date range when no filters provided', async () => {
      await service.getDashboardData('dashboard-1');

      expect(mockAnalyticsRepo.getTrafficOverview).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date)
      );
    });
  });

  describe('A/B Testing', () => {
    const mockABTest: ABTest = {
      id: 'test-1',
      name: 'Button Color Test',
      description: 'Testing red vs blue button colors',
      testType: 'ui_variation',
      status: 'running',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
      trafficAllocation: 50,
      variants: [
        {
          id: 'control',
          name: 'Control (Blue Button)',
          description: 'Original blue button',
          trafficWeight: 50,
          configuration: { buttonColor: 'blue' },
          isControl: true,
          metrics: {
            visitors: 500,
            conversions: 25,
            conversionRate: 5.0,
            revenue: 12500,
            averageOrderValue: 500,
            clickThroughRate: 10.0,
            bounceRate: 40.0,
            timeOnSite: 180,
            customMetrics: {}
          }
        },
        {
          id: 'variant',
          name: 'Variant (Red Button)',
          description: 'New red button',
          trafficWeight: 50,
          configuration: { buttonColor: 'red' },
          isControl: false,
          metrics: {
            visitors: 500,
            conversions: 30,
            conversionRate: 6.0,
            revenue: 15000,
            averageOrderValue: 500,
            clickThroughRate: 12.0,
            bounceRate: 35.0,
            timeOnSite: 200,
            customMetrics: {}
          }
        }
      ],
      targetMetric: 'conversion_rate',
      successCriteria: {
        primaryMetric: 'conversion_rate',
        minimumDetectableEffect: 10,
        minimumSampleSize: 1000,
        maximumDuration: 30,
        significanceLevel: 0.05,
        power: 0.8
      },
      statisticalSettings: {
        confidenceLevel: 95,
        testType: 'two_tailed',
        multipleTestingCorrection: 'none',
        sequentialTesting: false
      },
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };

    beforeEach(() => {
      mockAnalyticsRepo.createABTest.mockResolvedValue(mockABTest);
      mockAnalyticsRepo.getActiveABTests.mockResolvedValue([mockABTest]);
      mockAnalyticsRepo.updateABTestResults.mockResolvedValue();
    });

    it('should create A/B test successfully', async () => {
      const testData = { ...mockABTest };
      delete (testData as any).id;
      delete (testData as any).createdAt;
      delete (testData as any).updatedAt;

      const result = await service.createABTest(testData);

      expect(mockAnalyticsRepo.createABTest).toHaveBeenCalledWith(testData);
      expect(result).toEqual(mockABTest);
    });

    it('should validate A/B test configuration', async () => {
      const invalidTestData = {
        ...mockABTest,
        variants: [mockABTest.variants[0]] // Only one variant
      };
      delete (invalidTestData as any).id;
      delete (invalidTestData as any).createdAt;
      delete (invalidTestData as any).updatedAt;

      await expect(service.createABTest(invalidTestData))
        .rejects.toThrow('A/B test must have at least 2 variants');
    });

    it('should validate control variant requirement', async () => {
      const invalidTestData = {
        ...mockABTest,
        variants: mockABTest.variants.map(v => ({ ...v, isControl: false }))
      };
      delete (invalidTestData as any).id;
      delete (invalidTestData as any).createdAt;
      delete (invalidTestData as any).updatedAt;

      await expect(service.createABTest(invalidTestData))
        .rejects.toThrow('A/B test must have exactly one control variant');
    });

    it('should validate traffic weight totals', async () => {
      const invalidTestData = {
        ...mockABTest,
        variants: mockABTest.variants.map(v => ({ ...v, trafficWeight: 60 }))
      };
      delete (invalidTestData as any).id;
      delete (invalidTestData as any).createdAt;
      delete (invalidTestData as any).updatedAt;

      await expect(service.createABTest(invalidTestData))
        .rejects.toThrow('Total traffic weight must equal 100%');
    });

    it('should update A/B test results successfully', async () => {
      const result = await service.updateABTestResults('test-1');

      expect(result).toBeDefined();
      expect(result?.winner).toBe('variant'); // Red button should win
      expect(result?.liftPercentage).toBeGreaterThan(0);
      expect(mockAnalyticsRepo.updateABTestResults).toHaveBeenCalled();
    });

    it('should return null for non-existent test', async () => {
      mockAnalyticsRepo.getActiveABTests.mockResolvedValue([]);

      const result = await service.updateABTestResults('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('Channel Performance Analysis', () => {
    const mockChannelPerformance: ChannelPerformance = {
      id: 'perf-1',
      channelId: 'channel-123',
      channelName: 'Test Channel',
      channelType: 'personal_channel',
      dateRange: {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        preset: 'last_30_days'
      },
      metrics: {
        totalClicks: 1000,
        uniqueClicks: 800,
        totalConversions: 50,
        uniqueConversions: 45,
        conversionRate: 5.0,
        clickThroughRate: 12.5,
        totalRevenue: 25000,
        totalCommission: 1250,
        averageOrderValue: 500,
        returnOnAdSpend: 20.0,
        costPerClick: 1.25,
        costPerConversion: 25.0,
        lifetimeValue: 1500,
        retentionRate: 65.0,
        customMetrics: {}
      },
      trends: {
        clicksTrend: [],
        conversionsTrend: [],
        revenueTrend: [],
        conversionRateTrend: [],
        seasonality: [],
        growthRate: 15.5,
        volatility: 8.2
      },
      segments: [],
      topPerformers: [],
      metadata: {},
      calculatedAt: new Date()
    };

    beforeEach(() => {
      mockAnalyticsRepo.createChannelPerformance.mockResolvedValue(mockChannelPerformance);
    });

    it('should analyze channel performance successfully', async () => {
      const dateRange: DateRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        preset: 'last_30_days'
      };

      const result = await service.analyzeChannelPerformance('channel-123', dateRange);

      expect(result).toEqual(mockChannelPerformance);
      expect(mockAnalyticsRepo.createChannelPerformance).toHaveBeenCalled();
    });

    it('should calculate channel metrics correctly', async () => {
      const dateRange: DateRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };

      const result = await service.analyzeChannelPerformance('channel-123', dateRange);

      expect(result.metrics.totalClicks).toBeGreaterThan(0);
      expect(result.metrics.conversionRate).toBeGreaterThan(0);
      expect(result.metrics.totalRevenue).toBeGreaterThan(0);
    });
  });

  describe('ROI Analysis', () => {
    const mockROIAnalysis: ROIAnalysis = {
      id: 'roi-1',
      analysisType: 'channel',
      entityId: 'channel-123',
      entityName: 'Test Channel',
      dateRange: {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      },
      investment: {
        totalInvestment: 10000,
        breakdown: {
          advertising: 6000,
          commissions: 2000,
          operational: 1500,
          technology: 500,
          other: 0
        },
        currency: 'INR'
      },
      returns: {
        totalRevenue: 50000,
        totalProfit: 15000,
        breakdown: {
          directRevenue: 40000,
          indirectRevenue: 8000,
          retentionRevenue: 2000,
          referralRevenue: 0
        },
        currency: 'INR'
      },
      roiMetrics: {
        roi: 50,
        roas: 5.0,
        cpa: 200,
        ltv: 3000,
        paybackPeriod: 30,
        profitMargin: 30,
        breakEvenPoint: 10000,
        netPresentValue: 5000
      },
      breakdown: [],
      trends: {
        roiTrend: [],
        investmentTrend: [],
        returnsTrend: [],
        efficiency: 85.5,
        stability: 92.3
      },
      benchmarks: {
        industryAverage: 300,
        topPerformer: 500,
        previousPeriod: 280,
        target: 350,
        percentile: 75
      },
      recommendations: [],
      metadata: {},
      calculatedAt: new Date()
    };

    beforeEach(() => {
      mockAnalyticsRepo.createROIAnalysis.mockResolvedValue(mockROIAnalysis);
    });

    it('should calculate ROI successfully', async () => {
      const dateRange: DateRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };

      const result = await service.calculateROI('channel', 'channel-123', dateRange);

      expect(result).toEqual(mockROIAnalysis);
      expect(result.roiMetrics.roi).toBeGreaterThan(0);
      expect(result.roiMetrics.roas).toBeGreaterThan(0);
      expect(mockAnalyticsRepo.createROIAnalysis).toHaveBeenCalled();
    });

    it('should generate ROI recommendations', async () => {
      const dateRange: DateRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };

      const result = await service.calculateROI('channel', 'channel-123', dateRange);

      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    });
  });

  describe('Alert system', () => {
    const mockAlert: AnalyticsAlert = {
      id: 'alert-1',
      name: 'Conversion Drop Alert',
      description: 'Alert when conversion rate drops below 3%',
      alertType: 'threshold',
      metric: 'conversion_rate',
      conditions: [
        {
          type: 'less_than',
          threshold: 3.0,
          timeWindow: 60
        }
      ],
      channels: [
        {
          type: 'email',
          configuration: { recipients: ['admin@example.com'] },
          isActive: true
        }
      ],
      recipients: ['admin@example.com'],
      frequency: 'immediate',
      isActive: true,
      triggerCount: 0,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };

    beforeEach(() => {
      mockAnalyticsRepo.createAnalyticsAlert.mockResolvedValue(mockAlert);
      mockAnalyticsRepo.getActiveAlerts.mockResolvedValue([mockAlert]);
      mockAnalyticsRepo.updateAlertTrigger.mockResolvedValue();
    });

    it('should create alert successfully', async () => {
      const alertData = { ...mockAlert };
      delete (alertData as any).id;
      delete (alertData as any).createdAt;
      delete (alertData as any).updatedAt;

      const result = await service.createAlert(alertData);

      expect(mockAnalyticsRepo.createAnalyticsAlert).toHaveBeenCalledWith(alertData);
      expect(result).toEqual(mockAlert);
    });

    it('should check alerts and trigger when conditions met', async () => {
      // Mock alert evaluation to return true
      jest.spyOn(service as any, 'evaluateAlertConditions').mockResolvedValue(true);
      jest.spyOn(service as any, 'sendAlertNotification').mockResolvedValue();

      await service.checkAlerts();

      expect(mockAnalyticsRepo.getActiveAlerts).toHaveBeenCalled();
      expect(mockAnalyticsRepo.updateAlertTrigger).toHaveBeenCalledWith('alert-1');
    });

    it('should not trigger alerts when conditions not met', async () => {
      // Mock alert evaluation to return false
      jest.spyOn(service as any, 'evaluateAlertConditions').mockResolvedValue(false);

      await service.checkAlerts();

      expect(mockAnalyticsRepo.getActiveAlerts).toHaveBeenCalled();
      expect(mockAnalyticsRepo.updateAlertTrigger).not.toHaveBeenCalled();
    });
  });

  describe('Data export', () => {
    it('should export data successfully', async () => {
      const exportConfig = {
        name: 'Test Export',
        description: 'Test data export',
        exportType: 'raw_data' as const,
        format: 'csv' as const,
        dataSource: 'conversions',
        query: 'SELECT * FROM conversion_events',
        filters: {},
        destination: {
          type: 'email',
          configuration: { recipients: ['user@example.com'] }
        },
        status: 'active' as const,
        exportCount: 0,
        metadata: {}
      };

      // Mock file system operations
      jest.spyOn(require('fs'), 'existsSync').mockReturnValue(false);
      jest.spyOn(require('fs'), 'mkdirSync').mockReturnValue(undefined);
      jest.spyOn(require('fs'), 'writeFileSync').mockReturnValue(undefined);

      const result = await service.exportData(exportConfig);

      expect(result).toContain('.csv');
      expect(result).toContain('Test Export');
    });

    it('should handle different export formats', async () => {
      const exportConfig = {
        name: 'JSON Export',
        description: 'Test JSON export',
        exportType: 'raw_data' as const,
        format: 'json' as const,
        dataSource: 'conversions',
        query: 'SELECT * FROM conversion_events',
        filters: {},
        destination: {
          type: 'email',
          configuration: { recipients: ['user@example.com'] }
        },
        status: 'active' as const,
        exportCount: 0,
        metadata: {}
      };

      // Mock file system operations
      jest.spyOn(require('fs'), 'existsSync').mockReturnValue(false);
      jest.spyOn(require('fs'), 'mkdirSync').mockReturnValue(undefined);
      jest.spyOn(require('fs'), 'writeFileSync').mockReturnValue(undefined);

      const result = await service.exportData(exportConfig);

      expect(result).toContain('.json');
    });

    it('should throw error for unsupported format', async () => {
      const exportConfig = {
        name: 'Invalid Export',
        description: 'Test invalid export',
        exportType: 'raw_data' as const,
        format: 'xml' as any,
        dataSource: 'conversions',
        query: 'SELECT * FROM conversion_events',
        filters: {},
        destination: {
          type: 'email',
          configuration: { recipients: ['user@example.com'] }
        },
        status: 'active' as const,
        exportCount: 0,
        metadata: {}
      };

      await expect(service.exportData(exportConfig))
        .rejects.toThrow('Unsupported export format: xml');
    });
  });

  describe('Insight generation', () => {
    beforeEach(() => {
      mockAnalyticsRepo.createAnalyticsInsight.mockResolvedValue({
        id: 'insight-1',
        type: 'trend',
        title: 'Test Insight',
        description: 'Test insight description',
        severity: 'medium',
        confidence: 85,
        impact: {
          metric: 'conversion_rate',
          currentValue: 5.2,
          potentialValue: 6.0,
          impactPercentage: 15,
          timeframe: '1 week'
        },
        evidence: [],
        recommendations: [],
        affectedEntities: [],
        detectedAt: new Date(),
        status: 'new',
        metadata: {}
      });
    });

    it('should generate insights successfully', async () => {
      const dateRange: DateRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };

      const result = await service.generateInsights(dateRange);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(mockAnalyticsRepo.createAnalyticsInsight).toHaveBeenCalled();
    });

    it('should generate conversion trend insights', async () => {
      const dateRange: DateRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };

      const result = await service.generateInsights(dateRange);

      const conversionInsight = result.find(insight => 
        insight.title.includes('Conversion')
      );
      
      expect(conversionInsight).toBeDefined();
      expect(conversionInsight?.type).toBe('trend');
      expect(conversionInsight?.confidence).toBeGreaterThan(0);
    });
  });
});
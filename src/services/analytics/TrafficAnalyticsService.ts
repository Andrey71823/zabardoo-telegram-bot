import { Pool } from 'pg';
import { TrafficAnalyticsRepository } from '../../repositories/TrafficAnalyticsRepository';
import { TrafficManagerRepository } from '../../repositories/TrafficManagerRepository';
import { BaseService } from '../base/BaseService';
import { 
  TrafficAnalyticsDashboard, 
  TrafficReport, 
  ABTest, 
  ChannelPerformance, 
  UserJourney, 
  ROIAnalysis,
  AnalyticsAlert,
  AnalyticsInsight,
  DateRange,
  ChannelMetrics,
  ABTestResults,
  VariantMetrics
} from '../../models/TrafficAnalytics';
import { logger } from '../../config/logger';
import * as fs from 'fs';
import * as path from 'path';
import { createObjectCsvWriter } from 'csv-writer';

export interface DashboardData {
  overview: any;
  channelComparison: any[];
  trends: any[];
  topPerformers: any[];
  recentInsights: AnalyticsInsight[];
}

export interface ReportData {
  summary: any;
  details: any[];
  charts: any[];
  insights: string[];
}

export class TrafficAnalyticsService extends BaseService {
  private analyticsRepo: TrafficAnalyticsRepository;
  private trafficRepo: TrafficManagerRepository;

  constructor(pool: Pool) {
    super();
    this.analyticsRepo = new TrafficAnalyticsRepository(pool);
    this.trafficRepo = new TrafficManagerRepository(pool);
  }

  // Dashboard operations
  async createDashboard(dashboardData: Omit<TrafficAnalyticsDashboard, 'id' | 'createdAt' | 'updatedAt'>): Promise<TrafficAnalyticsDashboard> {
    try {
      logger.info('Creating new dashboard', { name: dashboardData.name });
      
      const dashboard = await this.analyticsRepo.createDashboard(dashboardData);
      
      logger.info('Dashboard created successfully', { dashboardId: dashboard.id });
      return dashboard;
    } catch (error) {
      logger.error('Error creating dashboard', { error: error.message });
      throw error;
    }
  }

  async getDashboardData(dashboardId: string, filters?: Record<string, any>): Promise<DashboardData> {
    try {
      const dateRange = this.getDateRangeFromFilters(filters);
      
      // Get overview metrics
      const overview = await this.analyticsRepo.getTrafficOverview(
        dateRange.startDate, 
        dateRange.endDate
      );

      // Get channel comparison
      const channelComparison = await this.analyticsRepo.getChannelComparison(
        dateRange.startDate, 
        dateRange.endDate
      );

      // Get trend data
      const trends = await this.analyticsRepo.getTrendData(
        'revenue', 
        dateRange.startDate, 
        dateRange.endDate, 
        'day'
      );

      // Get top performers
      const topPerformers = await this.getTopPerformers(dateRange);

      // Get recent insights
      const recentInsights = await this.analyticsRepo.getInsightsByStatus('new', 5);

      return {
        overview,
        channelComparison,
        trends,
        topPerformers,
        recentInsights
      };
    } catch (error) {
      logger.error('Error getting dashboard data', { dashboardId, error: error.message });
      throw error;
    }
  }

  // Report generation
  async generateReport(reportId: string): Promise<ReportData> {
    try {
      logger.info('Generating report', { reportId });

      // This would fetch report configuration and generate data
      // For now, returning mock structure
      const reportData: ReportData = {
        summary: {
          totalClicks: 10000,
          totalConversions: 500,
          totalRevenue: 250000,
          conversionRate: 5.0
        },
        details: [],
        charts: [],
        insights: [
          'Conversion rate increased by 15% compared to last month',
          'Personal channels outperform group channels by 23%',
          'Peak traffic occurs between 7-9 PM IST'
        ]
      };

      logger.info('Report generated successfully', { reportId });
      return reportData;
    } catch (error) {
      logger.error('Error generating report', { reportId, error: error.message });
      throw error;
    }
  }

  async scheduleReport(reportData: Omit<TrafficReport, 'id' | 'createdAt' | 'updatedAt'>): Promise<TrafficReport> {
    try {
      const report = await this.analyticsRepo.createReport(reportData);
      
      // Calculate next scheduled time
      if (report.schedule) {
        const nextScheduled = this.calculateNextScheduledTime(report.schedule);
        await this.analyticsRepo.updateReportStatus(report.id, 'active', nextScheduled);
      }

      logger.info('Report scheduled successfully', { reportId: report.id });
      return report;
    } catch (error) {
      logger.error('Error scheduling report', { error: error.message });
      throw error;
    }
  }

  // A/B Testing
  async createABTest(testData: Omit<ABTest, 'id' | 'createdAt' | 'updatedAt'>): Promise<ABTest> {
    try {
      logger.info('Creating A/B test', { name: testData.name });

      // Validate test configuration
      this.validateABTestConfig(testData);

      const test = await this.analyticsRepo.createABTest(testData);
      
      logger.info('A/B test created successfully', { testId: test.id });
      return test;
    } catch (error) {
      logger.error('Error creating A/B test', { error: error.message });
      throw error;
    }
  }

  async updateABTestResults(testId: string): Promise<ABTestResults | null> {
    try {
      const test = await this.analyticsRepo.getActiveABTests();
      const currentTest = test.find(t => t.id === testId);
      
      if (!currentTest) {
        logger.warn('A/B test not found or not active', { testId });
        return null;
      }

      // Calculate results for each variant
      const results = await this.calculateABTestResults(currentTest);
      
      // Update test with results
      await this.analyticsRepo.updateABTestResults(testId, results);
      
      logger.info('A/B test results updated', { testId, winner: results.winner });
      return results;
    } catch (error) {
      logger.error('Error updating A/B test results', { testId, error: error.message });
      throw error;
    }
  }

  private async calculateABTestResults(test: ABTest): Promise<ABTestResults> {
    // This is a simplified implementation
    // In production, you'd use proper statistical analysis
    
    const variants = test.variants;
    let winner = variants[0];
    let maxConversionRate = 0;

    // Find variant with highest conversion rate
    for (const variant of variants) {
      if (variant.metrics.conversionRate > maxConversionRate) {
        maxConversionRate = variant.metrics.conversionRate;
        winner = variant;
      }
    }

    // Calculate statistical significance (simplified)
    const controlVariant = variants.find(v => v.isControl);
    const testVariant = variants.find(v => !v.isControl);
    
    if (!controlVariant || !testVariant) {
      throw new Error('Invalid test configuration: missing control or test variant');
    }

    const liftPercentage = ((testVariant.metrics.conversionRate - controlVariant.metrics.conversionRate) / controlVariant.metrics.conversionRate) * 100;
    const revenueImpact = testVariant.metrics.revenue - controlVariant.metrics.revenue;
    
    // Simplified p-value calculation (in production, use proper statistical tests)
    const pValue = Math.random() * 0.1; // Mock p-value
    const confidence = (1 - pValue) * 100;
    const statisticalSignificance = pValue < test.successCriteria.significanceLevel;

    return {
      winner: winner.id,
      confidence,
      pValue,
      effectSize: Math.abs(liftPercentage),
      liftPercentage,
      revenueImpact,
      statisticalSignificance,
      practicalSignificance: Math.abs(liftPercentage) >= test.successCriteria.minimumDetectableEffect,
      recommendations: this.generateABTestRecommendations(test, liftPercentage, statisticalSignificance),
      detailedResults: variants.map(variant => ({
        variantId: variant.id,
        variantName: variant.name,
        metrics: variant.metrics,
        confidenceInterval: {
          lower: variant.metrics.conversionRate * 0.9,
          upper: variant.metrics.conversionRate * 1.1
        },
        pValueVsControl: variant.isControl ? 0 : pValue,
        liftVsControl: variant.isControl ? 0 : liftPercentage,
        isSignificant: !variant.isControl && statisticalSignificance
      })),
      completedAt: new Date()
    };
  }

  private generateABTestRecommendations(test: ABTest, lift: number, significant: boolean): string[] {
    const recommendations: string[] = [];

    if (significant && lift > 0) {
      recommendations.push('Implement the winning variant for all traffic');
      recommendations.push('Monitor performance for at least 2 weeks after full rollout');
    } else if (significant && lift < 0) {
      recommendations.push('Keep the control variant as it performs better');
      recommendations.push('Analyze why the test variant underperformed');
    } else {
      recommendations.push('Results are not statistically significant');
      recommendations.push('Consider running the test longer or increasing sample size');
      recommendations.push('Review test design and hypothesis');
    }

    return recommendations;
  }

  // Channel Performance Analysis
  async analyzeChannelPerformance(channelId: string, dateRange: DateRange): Promise<ChannelPerformance> {
    try {
      logger.info('Analyzing channel performance', { channelId });

      // Get raw metrics
      const metrics = await this.calculateChannelMetrics(channelId, dateRange);
      
      // Calculate trends
      const trends = await this.calculateChannelTrends(channelId, dateRange);
      
      // Get segments
      const segments = await this.getChannelSegments(channelId, dateRange);
      
      // Get top performers
      const topPerformers = await this.getChannelTopPerformers(channelId, dateRange);

      const performance: Omit<ChannelPerformance, 'id'> = {
        channelId,
        channelName: `Channel ${channelId}`, // Would fetch from database
        channelType: 'personal_channel', // Would determine from data
        dateRange,
        metrics,
        trends,
        segments,
        topPerformers,
        metadata: {
          analysisVersion: '1.0',
          calculationMethod: 'standard'
        },
        calculatedAt: new Date()
      };

      const result = await this.analyticsRepo.createChannelPerformance(performance);
      
      logger.info('Channel performance analysis completed', { channelId });
      return result;
    } catch (error) {
      logger.error('Error analyzing channel performance', { channelId, error: error.message });
      throw error;
    }
  }

  private async calculateChannelMetrics(channelId: string, dateRange: DateRange): Promise<ChannelMetrics> {
    // This would query the database for actual metrics
    // For now, returning mock data
    return {
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
      customMetrics: {
        bounceRate: 35.0,
        timeOnSite: 180,
        pagesPerSession: 3.2
      }
    };
  }

  private async calculateChannelTrends(channelId: string, dateRange: DateRange): Promise<any> {
    // Mock trend data
    return {
      clicksTrend: [],
      conversionsTrend: [],
      revenueTrend: [],
      conversionRateTrend: [],
      seasonality: [],
      growthRate: 15.5,
      volatility: 8.2
    };
  }

  private async getChannelSegments(channelId: string, dateRange: DateRange): Promise<any[]> {
    return [
      {
        segmentName: 'Device Type',
        segmentValue: 'Mobile',
        metrics: { totalClicks: 700, conversionRate: 4.8 },
        percentage: 70
      },
      {
        segmentName: 'Device Type',
        segmentValue: 'Desktop',
        metrics: { totalClicks: 300, conversionRate: 5.5 },
        percentage: 30
      }
    ];
  }

  private async getChannelTopPerformers(channelId: string, dateRange: DateRange): Promise<any[]> {
    return [
      {
        type: 'product',
        id: 'prod-123',
        name: 'iPhone 15',
        metrics: { clicks: 200, conversions: 15, revenue: 7500 },
        rank: 1
      }
    ];
  }

  // ROI Analysis
  async calculateROI(analysisType: string, entityId: string, dateRange: DateRange): Promise<ROIAnalysis> {
    try {
      logger.info('Calculating ROI', { analysisType, entityId });

      // Get investment data
      const investment = await this.getInvestmentData(analysisType, entityId, dateRange);
      
      // Get returns data
      const returns = await this.getReturnsData(analysisType, entityId, dateRange);
      
      // Calculate ROI metrics
      const roiMetrics = this.calculateROIMetrics(investment, returns);
      
      // Get breakdown
      const breakdown = await this.getROIBreakdown(analysisType, entityId, dateRange);
      
      // Calculate trends
      const trends = await this.getROITrends(analysisType, entityId, dateRange);
      
      // Get benchmarks
      const benchmarks = await this.getROIBenchmarks(analysisType);
      
      // Generate recommendations
      const recommendations = this.generateROIRecommendations(roiMetrics, benchmarks);

      const analysis: Omit<ROIAnalysis, 'id'> = {
        analysisType,
        entityId,
        entityName: `Entity ${entityId}`,
        dateRange,
        investment,
        returns,
        roiMetrics,
        breakdown,
        trends,
        benchmarks,
        recommendations,
        metadata: {
          calculationMethod: 'standard',
          currency: 'INR'
        },
        calculatedAt: new Date()
      };

      const result = await this.analyticsRepo.createROIAnalysis(analysis);
      
      logger.info('ROI analysis completed', { analysisType, entityId, roi: roiMetrics.roi });
      return result;
    } catch (error) {
      logger.error('Error calculating ROI', { analysisType, entityId, error: error.message });
      throw error;
    }
  }

  private async getInvestmentData(analysisType: string, entityId: string, dateRange: DateRange): Promise<any> {
    // Mock investment data
    return {
      totalInvestment: 10000,
      breakdown: {
        advertising: 6000,
        commissions: 2000,
        operational: 1500,
        technology: 500,
        other: 0
      },
      currency: 'INR'
    };
  }

  private async getReturnsData(analysisType: string, entityId: string, dateRange: DateRange): Promise<any> {
    // Mock returns data
    return {
      totalRevenue: 50000,
      totalProfit: 15000,
      breakdown: {
        directRevenue: 40000,
        indirectRevenue: 8000,
        retentionRevenue: 2000,
        referralRevenue: 0
      },
      currency: 'INR'
    };
  }

  private calculateROIMetrics(investment: any, returns: any): any {
    const roi = ((returns.totalProfit - investment.totalInvestment) / investment.totalInvestment) * 100;
    const roas = (returns.totalRevenue / investment.totalInvestment);
    const cpa = investment.totalInvestment / 50; // Assuming 50 acquisitions
    const ltv = 3000; // Mock LTV
    const paybackPeriod = investment.totalInvestment / (returns.totalProfit / 30); // Days
    const profitMargin = (returns.totalProfit / returns.totalRevenue) * 100;

    return {
      roi,
      roas,
      cpa,
      ltv,
      paybackPeriod,
      profitMargin,
      breakEvenPoint: investment.totalInvestment / (returns.totalProfit / returns.totalRevenue),
      netPresentValue: returns.totalProfit - investment.totalInvestment
    };
  }

  private async getROIBreakdown(analysisType: string, entityId: string, dateRange: DateRange): Promise<any[]> {
    return [
      {
        dimension: 'Channel',
        value: 'Personal Channels',
        investment: 6000,
        returns: 30000,
        roi: 400,
        percentage: 60
      },
      {
        dimension: 'Channel',
        value: 'Group Channels',
        investment: 4000,
        returns: 20000,
        roi: 400,
        percentage: 40
      }
    ];
  }

  private async getROITrends(analysisType: string, entityId: string, dateRange: DateRange): Promise<any> {
    return {
      roiTrend: [],
      investmentTrend: [],
      returnsTrend: [],
      efficiency: 85.5,
      stability: 92.3
    };
  }

  private async getROIBenchmarks(analysisType: string): Promise<any> {
    return {
      industryAverage: 300,
      topPerformer: 500,
      previousPeriod: 280,
      target: 350,
      percentile: 75
    };
  }

  private generateROIRecommendations(roiMetrics: any, benchmarks: any): any[] {
    const recommendations = [];

    if (roiMetrics.roi > benchmarks.target) {
      recommendations.push({
        type: 'increase_investment',
        priority: 'high',
        description: 'ROI exceeds target. Consider increasing investment to scale.',
        expectedImpact: 25,
        implementationCost: 5000,
        timeframe: '1 month',
        confidence: 85
      });
    }

    if (roiMetrics.paybackPeriod > 60) {
      recommendations.push({
        type: 'improve_conversion',
        priority: 'medium',
        description: 'Payback period is too long. Focus on conversion optimization.',
        expectedImpact: 15,
        implementationCost: 2000,
        timeframe: '2 weeks',
        confidence: 70
      });
    }

    return recommendations;
  }

  // Alert system
  async createAlert(alertData: Omit<AnalyticsAlert, 'id' | 'createdAt' | 'updatedAt'>): Promise<AnalyticsAlert> {
    try {
      const alert = await this.analyticsRepo.createAnalyticsAlert(alertData);
      logger.info('Analytics alert created', { alertId: alert.id });
      return alert;
    } catch (error) {
      logger.error('Error creating alert', { error: error.message });
      throw error;
    }
  }

  async checkAlerts(): Promise<void> {
    try {
      const alerts = await this.analyticsRepo.getActiveAlerts();
      
      for (const alert of alerts) {
        const shouldTrigger = await this.evaluateAlertConditions(alert);
        
        if (shouldTrigger) {
          await this.triggerAlert(alert);
        }
      }
    } catch (error) {
      logger.error('Error checking alerts', { error: error.message });
    }
  }

  private async evaluateAlertConditions(alert: AnalyticsAlert): Promise<boolean> {
    // Simplified alert evaluation
    // In production, this would check actual metrics against conditions
    return Math.random() > 0.9; // 10% chance to trigger for demo
  }

  private async triggerAlert(alert: AnalyticsAlert): Promise<void> {
    try {
      logger.warn('Alert triggered', { alertId: alert.id, alertName: alert.name });
      
      // Update trigger count
      await this.analyticsRepo.updateAlertTrigger(alert.id);
      
      // Send notifications through configured channels
      for (const channel of alert.channels) {
        if (channel.isActive) {
          await this.sendAlertNotification(alert, channel);
        }
      }
    } catch (error) {
      logger.error('Error triggering alert', { alertId: alert.id, error: error.message });
    }
  }

  private async sendAlertNotification(alert: AnalyticsAlert, channel: any): Promise<void> {
    // Implementation would depend on channel type
    logger.info('Sending alert notification', { 
      alertId: alert.id, 
      channelType: channel.type 
    });
  }

  // Insight generation
  async generateInsights(dateRange: DateRange): Promise<AnalyticsInsight[]> {
    try {
      logger.info('Generating analytics insights');
      
      const insights: AnalyticsInsight[] = [];
      
      // Analyze conversion rate trends
      const conversionInsight = await this.analyzeConversionTrends(dateRange);
      if (conversionInsight) insights.push(conversionInsight);
      
      // Analyze channel performance
      const channelInsight = await this.analyzeChannelPerformanceInsights(dateRange);
      if (channelInsight) insights.push(channelInsight);
      
      // Analyze user behavior patterns
      const behaviorInsight = await this.analyzeBehaviorPatterns(dateRange);
      if (behaviorInsight) insights.push(behaviorInsight);
      
      // Save insights to database
      for (const insight of insights) {
        await this.analyticsRepo.createAnalyticsInsight(insight);
      }
      
      logger.info('Analytics insights generated', { count: insights.length });
      return insights;
    } catch (error) {
      logger.error('Error generating insights', { error: error.message });
      throw error;
    }
  }

  private async analyzeConversionTrends(dateRange: DateRange): Promise<AnalyticsInsight | null> {
    // Mock insight generation
    return {
      type: 'trend',
      title: 'Conversion Rate Improvement',
      description: 'Conversion rate has increased by 15% over the past week',
      severity: 'medium',
      confidence: 85,
      impact: {
        metric: 'conversion_rate',
        currentValue: 5.2,
        potentialValue: 6.0,
        impactPercentage: 15,
        revenueImpact: 12500,
        timeframe: '1 week'
      },
      evidence: [
        {
          type: 'metric_change',
          description: 'Conversion rate increased from 4.5% to 5.2%',
          data: { previousValue: 4.5, currentValue: 5.2 },
          confidence: 90
        }
      ],
      recommendations: [
        {
          action: 'Maintain current optimization strategies',
          description: 'Continue with the changes that led to this improvement',
          priority: 'high',
          effort: 'low',
          expectedImpact: 10,
          implementationSteps: [
            'Monitor key metrics daily',
            'Document successful changes',
            'Apply similar optimizations to other channels'
          ]
        }
      ],
      affectedEntities: ['all_channels'],
      detectedAt: new Date(),
      status: 'new',
      metadata: {
        detectionMethod: 'trend_analysis',
        dataPoints: 7
      }
    };
  }

  private async analyzeChannelPerformanceInsights(dateRange: DateRange): Promise<AnalyticsInsight | null> {
    // Mock channel performance insight
    return null; // Would implement actual analysis
  }

  private async analyzeBehaviorPatterns(dateRange: DateRange): Promise<AnalyticsInsight | null> {
    // Mock behavior pattern insight
    return null; // Would implement actual analysis
  }

  // Data export
  async exportData(exportConfig: Omit<DataExport, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      logger.info('Exporting data', { exportType: exportConfig.exportType });
      
      // Execute query to get data
      const data = await this.executeExportQuery(exportConfig.query, exportConfig.filters);
      
      // Generate file based on format
      const filePath = await this.generateExportFile(data, exportConfig.format, exportConfig.name);
      
      // Create export record
      await this.analyticsRepo.createDataExport(exportConfig);
      
      logger.info('Data export completed', { filePath });
      return filePath;
    } catch (error) {
      logger.error('Error exporting data', { error: error.message });
      throw error;
    }
  }

  private async executeExportQuery(query: string, filters: Record<string, any>): Promise<any[]> {
    // Mock data for export
    return [
      { date: '2024-01-01', clicks: 100, conversions: 5, revenue: 2500 },
      { date: '2024-01-02', clicks: 120, conversions: 6, revenue: 3000 },
      { date: '2024-01-03', clicks: 90, conversions: 4, revenue: 2000 }
    ];
  }

  private async generateExportFile(data: any[], format: string, name: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${name}_${timestamp}.${format}`;
    const filePath = path.join(process.cwd(), 'exports', fileName);
    
    // Ensure exports directory exists
    const exportsDir = path.dirname(filePath);
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    switch (format) {
      case 'csv':
        await this.generateCSVFile(data, filePath);
        break;
      case 'json':
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        break;
      case 'excel':
        // Would implement Excel generation
        throw new Error('Excel export not implemented yet');
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }

    return filePath;
  }

  private async generateCSVFile(data: any[], filePath: string): Promise<void> {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]).map(key => ({ id: key, title: key }));
    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: headers
    });

    await csvWriter.writeRecords(data);
  }

  // Helper methods
  private getDateRangeFromFilters(filters?: Record<string, any>): DateRange {
    if (filters?.dateRange) {
      return filters.dateRange;
    }

    // Default to last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    return { startDate, endDate, preset: 'last_30_days' };
  }

  private async getTopPerformers(dateRange: DateRange): Promise<any[]> {
    // Mock top performers data
    return [
      {
        type: 'channel',
        id: 'channel-1',
        name: 'Personal Channel A',
        metrics: { clicks: 1500, conversions: 75, revenue: 37500 },
        rank: 1
      },
      {
        type: 'store',
        id: 'flipkart-001',
        name: 'Flipkart',
        metrics: { clicks: 2000, conversions: 100, revenue: 50000 },
        rank: 1
      }
    ];
  }

  private validateABTestConfig(testData: any): void {
    if (!testData.variants || testData.variants.length < 2) {
      throw new Error('A/B test must have at least 2 variants');
    }

    const controlVariants = testData.variants.filter((v: any) => v.isControl);
    if (controlVariants.length !== 1) {
      throw new Error('A/B test must have exactly one control variant');
    }

    const totalWeight = testData.variants.reduce((sum: number, v: any) => sum + v.trafficWeight, 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      throw new Error('Total traffic weight must equal 100%');
    }
  }

  private calculateNextScheduledTime(schedule: any): Date {
    const now = new Date();
    const nextScheduled = new Date(now);

    switch (schedule.frequency) {
      case 'daily':
        nextScheduled.setDate(nextScheduled.getDate() + 1);
        break;
      case 'weekly':
        nextScheduled.setDate(nextScheduled.getDate() + 7);
        break;
      case 'monthly':
        nextScheduled.setMonth(nextScheduled.getMonth() + 1);
        break;
      default:
        nextScheduled.setDate(nextScheduled.getDate() + 1);
    }

    return nextScheduled;
  }
}
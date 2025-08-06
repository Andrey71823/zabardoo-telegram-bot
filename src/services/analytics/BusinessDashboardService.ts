import { BaseService } from '../base/BaseService';
import { AnalyticsRepository } from '../../repositories/AnalyticsRepository';
import { EventCollectionService } from './EventCollectionService';
import { FunnelAnalysisService } from './FunnelAnalysisService';
import { CohortAnalysisService } from './CohortAnalysisService';
import { UserSegmentationService } from './UserSegmentationService';
import { ForecastingService, ForecastData, TrendAnalysis, GrowthProjection } from './ForecastingService';

export interface DashboardMetrics {
  overview: OverviewMetrics;
  revenue: RevenueMetrics;
  users: UserMetrics;
  conversion: ConversionMetrics;
  retention: RetentionMetrics;
  channels: ChannelMetrics;
  realTime: RealTimeMetrics;
  forecasts?: ForecastData[];
  trends?: TrendAnalysis[];
  projections?: GrowthProjection[];
}

export interface OverviewMetrics {
  totalUsers: number;
  activeUsers: number;
  totalRevenue: number;
  totalCashback: number;
  conversionRate: number;
  averageOrderValue: number;
  growthRate: number;
  period: string;
}

export interface RevenueMetrics {
  totalRevenue: number;
  revenueGrowth: number;
  revenueByChannel: Array<{
    channel: string;
    revenue: number;
    percentage: number;
  }>;
  revenueByCategory: Array<{
    category: string;
    revenue: number;
    percentage: number;
  }>;
  monthlyRevenueTrend: Array<{
    month: string;
    revenue: number;
    growth: number;
  }>;
}

export interface UserMetrics {
  totalUsers: number;
  newUsers: number;
  activeUsers: number;
  userGrowthRate: number;
  usersBySource: Array<{
    source: string;
    users: number;
    percentage: number;
  }>;
  userEngagement: {
    averageSessionDuration: number;
    averageSessionsPerUser: number;
    bounceRate: number;
  };
}

export interface ConversionMetrics {
  overallConversionRate: number;
  conversionByFunnel: Array<{
    funnelName: string;
    conversionRate: number;
    totalUsers: number;
  }>;
  conversionTrends: Array<{
    date: string;
    conversionRate: number;
  }>;
  topConvertingSegments: Array<{
    segment: string;
    conversionRate: number;
    users: number;
  }>;
}

export interface RetentionMetrics {
  overallRetentionRate: number;
  retentionByCohort: Array<{
    cohort: string;
    retentionRate: number;
    userCount: number;
  }>;
  churnRate: number;
  lifetimeValue: number;
}

export interface ChannelMetrics {
  channelPerformance: Array<{
    channel: string;
    users: number;
    revenue: number;
    conversionRate: number;
    roi: number;
  }>;
  topPerformingChannels: string[];
  channelTrends: Array<{
    channel: string;
    trend: 'up' | 'down' | 'stable';
    change: number;
  }>;
}

export interface RealTimeMetrics {
  currentActiveUsers: number;
  todayRevenue: number;
  todayConversions: number;
  liveEvents: Array<{
    eventType: string;
    count: number;
    timestamp: Date;
  }>;
}

export class BusinessDashboardService extends BaseService {
  private analyticsRepository: AnalyticsRepository;
  private eventService: EventCollectionService;
  private funnelService: FunnelAnalysisService;
  private cohortService: CohortAnalysisService;
  private segmentationService: UserSegmentationService;
  private forecastingService: ForecastingService;

  constructor() {
    super();
    this.analyticsRepository = new AnalyticsRepository();
    this.eventService = new EventCollectionService();
    this.funnelService = new FunnelAnalysisService();
    this.cohortService = new CohortAnalysisService();
    this.segmentationService = new UserSegmentationService();
    this.forecastingService = new ForecastingService();
  }
}  //
 Get comprehensive dashboard metrics
  async getDashboardMetrics(
    dateRange: { from: Date; to: Date },
    compareWith?: { from: Date; to: Date }
  ): Promise<DashboardMetrics> {
    try {
      this.logger.info('Generating dashboard metrics', { dateRange, compareWith });

      const [
        overview,
        revenue,
        users,
        conversion,
        retention,
        channels,
        realTime
      ] = await Promise.all([
        this.getOverviewMetrics(dateRange, compareWith),
        this.getRevenueMetrics(dateRange),
        this.getUserMetrics(dateRange),
        this.getConversionMetrics(dateRange),
        this.getRetentionMetrics(dateRange),
        this.getChannelMetrics(dateRange),
        this.getRealTimeMetrics()
      ]);

      const metrics: DashboardMetrics = {
        overview,
        revenue,
        users,
        conversion,
        retention,
        channels,
        realTime
      };

      this.logger.info('Dashboard metrics generated successfully');
      return metrics;
    } catch (error) {
      this.logger.error('Failed to generate dashboard metrics', { error: error.message });
      throw error;
    }
  }

  // Get overview metrics with growth comparison
  async getOverviewMetrics(
    dateRange: { from: Date; to: Date },
    compareWith?: { from: Date; to: Date }
  ): Promise<OverviewMetrics> {
    try {
      // Current period metrics
      const [
        totalUsers,
        activeUsers,
        totalRevenue,
        totalCashback,
        conversions,
        orders
      ] = await Promise.all([
        this.getTotalUsers(dateRange),
        this.getActiveUsers(dateRange),
        this.getTotalRevenue(dateRange),
        this.getTotalCashback(dateRange),
        this.getTotalConversions(dateRange),
        this.getTotalOrders(dateRange)
      ]);

      const conversionRate = totalUsers > 0 ? conversions / totalUsers : 0;
      const averageOrderValue = orders > 0 ? totalRevenue / orders : 0;

      // Calculate growth rate if comparison period provided
      let growthRate = 0;
      if (compareWith) {
        const previousRevenue = await this.getTotalRevenue(compareWith);
        growthRate = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;
      }

      return {
        totalUsers,
        activeUsers,
        totalRevenue,
        totalCashback,
        conversionRate,
        averageOrderValue,
        growthRate,
        period: this.formatDateRange(dateRange)
      };
    } catch (error) {
      this.logger.error('Failed to get overview metrics', { error: error.message });
      throw error;
    }
  }

  // Get detailed revenue metrics
  async getRevenueMetrics(dateRange: { from: Date; to: Date }): Promise<RevenueMetrics> {
    try {
      const [
        totalRevenue,
        revenueByChannel,
        revenueByCategory,
        monthlyTrend
      ] = await Promise.all([
        this.getTotalRevenue(dateRange),
        this.getRevenueByChannel(dateRange),
        this.getRevenueByCategory(dateRange),
        this.getMonthlyRevenueTrend(dateRange)
      ]);

      // Calculate growth from trend data
      const revenueGrowth = monthlyTrend.length > 1 
        ? monthlyTrend[monthlyTrend.length - 1].growth 
        : 0;

      return {
        totalRevenue,
        revenueGrowth,
        revenueByChannel,
        revenueByCategory,
        monthlyRevenueTrend: monthlyTrend
      };
    } catch (error) {
      this.logger.error('Failed to get revenue metrics', { error: error.message });
      throw error;
    }
  }

  // Get user metrics and engagement data
  async getUserMetrics(dateRange: { from: Date; to: Date }): Promise<UserMetrics> {
    try {
      const [
        totalUsers,
        newUsers,
        activeUsers,
        usersBySource,
        engagement
      ] = await Promise.all([
        this.getTotalUsers(dateRange),
        this.getNewUsers(dateRange),
        this.getActiveUsers(dateRange),
        this.getUsersBySource(dateRange),
        this.getUserEngagement(dateRange)
      ]);

      // Calculate growth rate (mock implementation)
      const userGrowthRate = 15.5; // Would calculate from historical data

      return {
        totalUsers,
        newUsers,
        activeUsers,
        userGrowthRate,
        usersBySource,
        userEngagement: engagement
      };
    } catch (error) {
      this.logger.error('Failed to get user metrics', { error: error.message });
      throw error;
    }
  }

  // Get conversion metrics from funnels
  async getConversionMetrics(dateRange: { from: Date; to: Date }): Promise<ConversionMetrics> {
    try {
      // Mock implementation - would integrate with actual funnel data
      const overallConversionRate = 0.125;
      
      const conversionByFunnel = [
        { funnelName: 'Purchase Funnel', conversionRate: 0.15, totalUsers: 2500 },
        { funnelName: 'Cashback Funnel', conversionRate: 0.08, totalUsers: 1800 },
        { funnelName: 'Referral Funnel', conversionRate: 0.22, totalUsers: 800 }
      ];

      const conversionTrends = await this.getConversionTrends(dateRange);
      const topConvertingSegments = await this.getTopConvertingSegments(dateRange);

      return {
        overallConversionRate,
        conversionByFunnel,
        conversionTrends,
        topConvertingSegments
      };
    } catch (error) {
      this.logger.error('Failed to get conversion metrics', { error: error.message });
      throw error;
    }
  }

  // Get retention metrics from cohort analysis
  async getRetentionMetrics(dateRange: { from: Date; to: Date }): Promise<RetentionMetrics> {
    try {
      // Mock implementation - would integrate with actual cohort data
      const overallRetentionRate = 0.65;
      const churnRate = 1 - overallRetentionRate;
      const lifetimeValue = 450.75;

      const retentionByCohort = [
        { cohort: 'Week of Jan 1', retentionRate: 0.72, userCount: 150 },
        { cohort: 'Week of Jan 8', retentionRate: 0.68, userCount: 180 },
        { cohort: 'Week of Jan 15', retentionRate: 0.71, userCount: 165 },
        { cohort: 'Week of Jan 22', retentionRate: 0.69, userCount: 175 }
      ];

      return {
        overallRetentionRate,
        retentionByCohort,
        churnRate,
        lifetimeValue
      };
    } catch (error) {
      this.logger.error('Failed to get retention metrics', { error: error.message });
      throw error;
    }
  }

  // Get channel performance metrics
  async getChannelMetrics(dateRange: { from: Date; to: Date }): Promise<ChannelMetrics> {
    try {
      const channelPerformance = [
        { channel: 'Telegram Bot', users: 2500, revenue: 125000, conversionRate: 0.15, roi: 3.2 },
        { channel: 'Personal Channels', users: 1800, revenue: 95000, conversionRate: 0.18, roi: 4.1 },
        { channel: 'Group Channel', users: 3200, revenue: 85000, conversionRate: 0.08, roi: 2.8 },
        { channel: 'Referrals', users: 800, revenue: 45000, conversionRate: 0.22, roi: 5.5 }
      ];

      const topPerformingChannels = channelPerformance
        .sort((a, b) => b.roi - a.roi)
        .slice(0, 3)
        .map(c => c.channel);

      const channelTrends = channelPerformance.map(channel => ({
        channel: channel.channel,
        trend: channel.roi > 3 ? 'up' as const : channel.roi < 2 ? 'down' as const : 'stable' as const,
        change: Math.random() * 20 - 10 // Mock change percentage
      }));

      return {
        channelPerformance,
        topPerformingChannels,
        channelTrends
      };
    } catch (error) {
      this.logger.error('Failed to get channel metrics', { error: error.message });
      throw error;
    }
  }

  // Get real-time metrics
  async getRealTimeMetrics(): Promise<RealTimeMetrics> {
    try {
      const realTimeMetrics = await this.analyticsRepository.getRealTimeMetrics();
      
      const currentActiveUsers = realTimeMetrics.find(m => m.name === 'Active Users')?.value || 0;
      const todayRevenue = realTimeMetrics.find(m => m.name === 'Today Revenue')?.value || 0;
      const todayConversions = realTimeMetrics.find(m => m.name === 'Today Conversions')?.value || 0;

      // Get recent events
      const liveEvents = await this.getRecentEvents();

      return {
        currentActiveUsers,
        todayRevenue,
        todayConversions,
        liveEvents
      };
    } catch (error) {
      this.logger.error('Failed to get real-time metrics', { error: error.message });
      throw error;
    }
  }

  // Generate business insights and recommendations
  async getBusinessInsights(metrics: DashboardMetrics): Promise<{
    insights: string[];
    recommendations: string[];
    alerts: Array<{
      type: 'warning' | 'critical' | 'info';
      message: string;
      metric: string;
    }>;
  }> {
    try {
      const insights: string[] = [];
      const recommendations: string[] = [];
      const alerts: Array<{ type: 'warning' | 'critical' | 'info'; message: string; metric: string }> = [];

      // Analyze conversion rates
      if (metrics.conversion.overallConversionRate < 0.1) {
        insights.push('Overall conversion rate is below industry average (10%)');
        recommendations.push('Focus on optimizing the main conversion funnel');
        alerts.push({
          type: 'warning',
          message: 'Low conversion rate detected',
          metric: 'conversion_rate'
        });
      }

      // Analyze revenue growth
      if (metrics.overview.growthRate < 0) {
        insights.push('Revenue is declining compared to previous period');
        recommendations.push('Investigate factors causing revenue decline and implement recovery strategies');
        alerts.push({
          type: 'critical',
          message: 'Negative revenue growth',
          metric: 'revenue_growth'
        });
      }

      // Analyze retention
      if (metrics.retention.churnRate > 0.4) {
        insights.push('High churn rate indicates user retention issues');
        recommendations.push('Implement retention campaigns and improve user experience');
        alerts.push({
          type: 'warning',
          message: 'High churn rate detected',
          metric: 'churn_rate'
        });
      }

      // Analyze channel performance
      const bestChannel = metrics.channels.channelPerformance
        .sort((a, b) => b.roi - a.roi)[0];
      
      if (bestChannel) {
        insights.push(`${bestChannel.channel} is the best performing channel with ${bestChannel.roi.toFixed(1)}x ROI`);
        recommendations.push(`Increase investment in ${bestChannel.channel} to maximize returns`);
      }

      return { insights, recommendations, alerts };
    } catch (error) {
      this.logger.error('Failed to generate business insights', { error: error.message });
      throw error;
    }
  }

  // Export dashboard data
  async exportDashboardData(
    metrics: DashboardMetrics,
    format: 'json' | 'csv' | 'excel'
  ): Promise<{
    filename: string;
    data: Buffer;
    mimeType: string;
  }> {
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      
      switch (format) {
        case 'json':
          return {
            filename: `dashboard_metrics_${timestamp}.json`,
            data: Buffer.from(JSON.stringify(metrics, null, 2)),
            mimeType: 'application/json'
          };
        
        case 'csv':
          const csvData = this.convertMetricsToCSV(metrics);
          return {
            filename: `dashboard_metrics_${timestamp}.csv`,
            data: Buffer.from(csvData),
            mimeType: 'text/csv'
          };
        
        case 'excel':
          // Mock Excel export - would use actual Excel library
          return {
            filename: `dashboard_metrics_${timestamp}.xlsx`,
            data: Buffer.from('Excel export not implemented'),
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          };
        
        default:
          throw new Error('Unsupported export format');
      }
    } catch (error) {
      this.logger.error('Failed to export dashboard data', { format, error: error.message });
      throw error;
    }
  }

  // Private helper methods
  private async getTotalUsers(dateRange: { from: Date; to: Date }): Promise<number> {
    const events = await this.analyticsRepository.getEventsCount({
      eventName: 'bot_start',
      dateFrom: dateRange.from,
      dateTo: dateRange.to
    });
    return events;
  }

  private async getActiveUsers(dateRange: { from: Date; to: Date }): Promise<number> {
    const activeUsers = await this.analyticsRepository.getActiveUsers(dateRange);
    return activeUsers.reduce((sum, day) => sum + day.activeUsers, 0);
  }

  private async getTotalRevenue(dateRange: { from: Date; to: Date }): Promise<number> {
    // Mock implementation - would query actual revenue data
    return 350000;
  }

  private async getTotalCashback(dateRange: { from: Date; to: Date }): Promise<number> {
    // Mock implementation - would query actual cashback data
    return 15750;
  }

  private async getTotalConversions(dateRange: { from: Date; to: Date }): Promise<number> {
    const conversions = await this.analyticsRepository.getEventsCount({
      eventName: 'purchase_completed',
      dateFrom: dateRange.from,
      dateTo: dateRange.to
    });
    return conversions;
  }

  private async getTotalOrders(dateRange: { from: Date; to: Date }): Promise<number> {
    // Mock implementation
    return 2340;
  }

  private async getNewUsers(dateRange: { from: Date; to: Date }): Promise<number> {
    // Mock implementation
    return 450;
  }

  private async getRevenueByChannel(dateRange: { from: Date; to: Date }): Promise<Array<{
    channel: string;
    revenue: number;
    percentage: number;
  }>> {
    const totalRevenue = 350000;
    return [
      { channel: 'Telegram Bot', revenue: 125000, percentage: 35.7 },
      { channel: 'Personal Channels', revenue: 95000, percentage: 27.1 },
      { channel: 'Group Channel', revenue: 85000, percentage: 24.3 },
      { channel: 'Referrals', revenue: 45000, percentage: 12.9 }
    ];
  }

  private async getRevenueByCategory(dateRange: { from: Date; to: Date }): Promise<Array<{
    category: string;
    revenue: number;
    percentage: number;
  }>> {
    return [
      { category: 'Electronics', revenue: 140000, percentage: 40.0 },
      { category: 'Fashion', revenue: 105000, percentage: 30.0 },
      { category: 'Grocery', revenue: 70000, percentage: 20.0 },
      { category: 'Books', revenue: 35000, percentage: 10.0 }
    ];
  }

  private async getMonthlyRevenueTrend(dateRange: { from: Date; to: Date }): Promise<Array<{
    month: string;
    revenue: number;
    growth: number;
  }>> {
    return [
      { month: 'Jan 2024', revenue: 280000, growth: 12.5 },
      { month: 'Feb 2024', revenue: 320000, growth: 14.3 },
      { month: 'Mar 2024', revenue: 350000, growth: 9.4 }
    ];
  }

  private async getUsersBySource(dateRange: { from: Date; to: Date }): Promise<Array<{
    source: string;
    users: number;
    percentage: number;
  }>> {
    return [
      { source: 'Direct', users: 1200, percentage: 48.0 },
      { source: 'Referral', users: 800, percentage: 32.0 },
      { source: 'Social Media', users: 300, percentage: 12.0 },
      { source: 'Search', users: 200, percentage: 8.0 }
    ];
  }

  private async getUserEngagement(dateRange: { from: Date; to: Date }): Promise<{
    averageSessionDuration: number;
    averageSessionsPerUser: number;
    bounceRate: number;
  }> {
    return {
      averageSessionDuration: 180, // seconds
      averageSessionsPerUser: 3.2,
      bounceRate: 0.25
    };
  }

  private async getConversionTrends(dateRange: { from: Date; to: Date }): Promise<Array<{
    date: string;
    conversionRate: number;
  }>> {
    const trends = [];
    const days = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
    
    for (let i = 0; i < Math.min(days, 30); i++) {
      const date = new Date(dateRange.from);
      date.setDate(date.getDate() + i);
      
      trends.push({
        date: date.toISOString().split('T')[0],
        conversionRate: 0.1 + (Math.random() * 0.1) // Mock data
      });
    }
    
    return trends;
  }

  private async getTopConvertingSegments(dateRange: { from: Date; to: Date }): Promise<Array<{
    segment: string;
    conversionRate: number;
    users: number;
  }>> {
    return [
      { segment: 'Premium Users', conversionRate: 0.28, users: 350 },
      { segment: 'Returning Users', conversionRate: 0.22, users: 800 },
      { segment: 'Mobile Users', conversionRate: 0.18, users: 1500 },
      { segment: 'New Users', conversionRate: 0.08, users: 450 }
    ];
  }

  private async getRecentEvents(): Promise<Array<{
    eventType: string;
    count: number;
    timestamp: Date;
  }>> {
    return [
      { eventType: 'coupon_view', count: 45, timestamp: new Date() },
      { eventType: 'coupon_click', count: 23, timestamp: new Date() },
      { eventType: 'purchase_completed', count: 8, timestamp: new Date() },
      { eventType: 'cashback_earned', count: 7, timestamp: new Date() }
    ];
  }

  private formatDateRange(dateRange: { from: Date; to: Date }): string {
    return `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`;
  }

  private convertMetricsToCSV(metrics: DashboardMetrics): string {
    let csv = 'Metric,Value,Period\n';
    
    // Overview metrics
    csv += `Total Users,${metrics.overview.totalUsers},${metrics.overview.period}\n`;
    csv += `Active Users,${metrics.overview.activeUsers},${metrics.overview.period}\n`;
    csv += `Total Revenue,${metrics.overview.totalRevenue},${metrics.overview.period}\n`;
    csv += `Conversion Rate,${(metrics.overview.conversionRate * 100).toFixed(2)}%,${metrics.overview.period}\n`;
    
    // Revenue by channel
    csv += '\nChannel,Revenue,Percentage\n';
    metrics.revenue.revenueByChannel.forEach(channel => {
      csv += `${channel.channel},${channel.revenue},${channel.percentage}%\n`;
    });
    
    return csv;
  }
}  
/**
   * Get dashboard metrics with forecasting data
   */
  async getDashboardMetricsWithForecasts(
    dateRange: { from: Date; to: Date },
    compareWith?: { from: Date; to: Date },
    includeForecast: boolean = true
  ): Promise<DashboardMetrics> {
    try {
      // Get base metrics
      const metrics = await this.getDashboardMetrics(dateRange, compareWith);

      if (includeForecast) {
        // Add forecasting data
        const [forecasts, trends, projections] = await Promise.all([
          this.forecastingService.generateRevenueForecasts(dateRange),
          this.forecastingService.analyzeTrends(dateRange),
          this.forecastingService.generateGrowthProjections(dateRange)
        ]);

        metrics.forecasts = forecasts;
        metrics.trends = trends;
        metrics.projections = projections;
      }

      return metrics;
    } catch (error) {
      this.logger.error('Failed to generate dashboard metrics with forecasts', { error: error.message });
      throw error;
    }
  }

  /**
   * Get revenue forecasts
   */
  async getRevenueForecasts(
    dateRange: { from: Date; to: Date },
    periods: number = 6
  ): Promise<ForecastData[]> {
    try {
      return await this.forecastingService.generateRevenueForecasts(dateRange, periods);
    } catch (error) {
      this.logger.error('Failed to get revenue forecasts', { error: error.message });
      throw error;
    }
  }

  /**
   * Get user growth forecasts
   */
  async getUserGrowthForecasts(
    dateRange: { from: Date; to: Date },
    periods: number = 6
  ): Promise<ForecastData[]> {
    try {
      return await this.forecastingService.generateUserGrowthForecasts(dateRange, periods);
    } catch (error) {
      this.logger.error('Failed to get user growth forecasts', { error: error.message });
      throw error;
    }
  }

  /**
   * Get trend analysis
   */
  async getTrendAnalysis(
    dateRange: { from: Date; to: Date }
  ): Promise<TrendAnalysis[]> {
    try {
      return await this.forecastingService.analyzeTrends(dateRange);
    } catch (error) {
      this.logger.error('Failed to get trend analysis', { error: error.message });
      throw error;
    }
  }

  /**
   * Get growth projections
   */
  async getGrowthProjections(
    dateRange: { from: Date; to: Date },
    periods: number = 12
  ): Promise<GrowthProjection[]> {
    try {
      return await this.forecastingService.generateGrowthProjections(dateRange, periods);
    } catch (error) {
      this.logger.error('Failed to get growth projections', { error: error.message });
      throw error;
    }
  }

  /**
   * Get forecast insights and recommendations
   */
  async getForecastInsights(
    dateRange: { from: Date; to: Date }
  ): Promise<{
    insights: string[];
    recommendations: string[];
    risks: string[];
    opportunities: string[];
  }> {
    try {
      const [forecasts, trends] = await Promise.all([
        this.forecastingService.generateRevenueForecasts(dateRange),
        this.forecastingService.analyzeTrends(dateRange)
      ]);

      return await this.forecastingService.generateForecastInsights(forecasts, trends);
    } catch (error) {
      this.logger.error('Failed to get forecast insights', { error: error.message });
      throw error;
    }
  }

  /**
   * Get channel profitability analysis
   */
  async getChannelProfitabilityAnalysis(
    dateRange: { from: Date; to: Date }
  ): Promise<Array<{
    channel: string;
    revenue: number;
    cost: number;
    profit: number;
    margin: number;
    roi: number;
    trend: 'up' | 'down' | 'stable';
    recommendation: string;
  }>> {
    try {
      const channelMetrics = await this.getChannelMetrics(dateRange);
      
      return channelMetrics.channelPerformance.map(channel => {
        // Estimate costs (simplified calculation)
        const estimatedCost = channel.revenue * 0.3; // Assume 30% cost ratio
        const profit = channel.revenue - estimatedCost;
        const margin = (profit / channel.revenue) * 100;
        
        // Determine trend based on ROI
        let trend: 'up' | 'down' | 'stable' = 'stable';
        let recommendation = '';
        
        if (channel.roi > 3) {
          trend = 'up';
          recommendation = 'High-performing channel. Consider increasing investment.';
        } else if (channel.roi < 1.5) {
          trend = 'down';
          recommendation = 'Underperforming channel. Review strategy or reduce investment.';
        } else {
          recommendation = 'Stable channel. Monitor performance and optimize where possible.';
        }

        return {
          channel: channel.channel,
          revenue: channel.revenue,
          cost: estimatedCost,
          profit,
          margin,
          roi: channel.roi,
          trend,
          recommendation
        };
      });
    } catch (error) {
      this.logger.error('Failed to get channel profitability analysis', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate executive summary report
   */
  async generateExecutiveSummary(
    dateRange: { from: Date; to: Date }
  ): Promise<{
    period: string;
    keyMetrics: {
      totalRevenue: number;
      revenueGrowth: number;
      totalUsers: number;
      userGrowth: number;
      conversionRate: number;
      averageOrderValue: number;
    };
    highlights: string[];
    concerns: string[];
    recommendations: string[];
    forecast: {
      nextMonthRevenue: number;
      nextQuarterUsers: number;
      projectedGrowth: number;
    };
  }> {
    try {
      const [metrics, insights, forecasts] = await Promise.all([
        this.getDashboardMetrics(dateRange),
        this.getForecastInsights(dateRange),
        this.getRevenueForecasts(dateRange, 3)
      ]);

      const highlights: string[] = [];
      const concerns: string[] = [];

      // Generate highlights
      if (metrics.overview.growthRate > 10) {
        highlights.push(`Strong growth rate of ${metrics.overview.growthRate.toFixed(1)}%`);
      }
      
      if (metrics.overview.conversionRate > 0.05) {
        highlights.push(`Above-average conversion rate of ${(metrics.overview.conversionRate * 100).toFixed(2)}%`);
      }

      if (metrics.revenue.revenueGrowth > 15) {
        highlights.push(`Excellent revenue growth of ${metrics.revenue.revenueGrowth.toFixed(1)}%`);
      }

      // Generate concerns
      if (metrics.overview.growthRate < 0) {
        concerns.push(`Negative growth rate of ${metrics.overview.growthRate.toFixed(1)}%`);
      }

      if (metrics.overview.conversionRate < 0.02) {
        concerns.push(`Low conversion rate of ${(metrics.overview.conversionRate * 100).toFixed(2)}%`);
      }

      // Forecast data
      const nextMonthForecast = forecasts.find(f => f.metric === 'revenue');
      const userForecasts = await this.getUserGrowthForecasts(dateRange, 3);
      const nextQuarterUserForecast = userForecasts[2]; // 3 months ahead

      return {
        period: `${dateRange.from.toISOString().split('T')[0]} to ${dateRange.to.toISOString().split('T')[0]}`,
        keyMetrics: {
          totalRevenue: metrics.overview.totalRevenue,
          revenueGrowth: metrics.revenue.revenueGrowth,
          totalUsers: metrics.overview.totalUsers,
          userGrowth: metrics.users.userGrowthRate,
          conversionRate: metrics.overview.conversionRate,
          averageOrderValue: metrics.overview.averageOrderValue
        },
        highlights,
        concerns,
        recommendations: insights.recommendations,
        forecast: {
          nextMonthRevenue: nextMonthForecast?.forecastedValue || 0,
          nextQuarterUsers: nextQuarterUserForecast?.forecastedValue || 0,
          projectedGrowth: metrics.overview.growthRate
        }
      };
    } catch (error) {
      this.logger.error('Failed to generate executive summary', { error: error.message });
      throw error;
    }
  }
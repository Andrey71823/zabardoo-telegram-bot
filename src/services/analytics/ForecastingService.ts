import { BaseService } from '../base/BaseService';
import { BusinessDashboardService } from './BusinessDashboardService';

export interface ForecastData {
  metric: string;
  currentValue: number;
  forecastedValue: number;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
  period: string;
}

export interface TrendAnalysis {
  metric: string;
  historicalData: Array<{
    period: string;
    value: number;
  }>;
  trendLine: Array<{
    period: string;
    value: number;
  }>;
  seasonality: {
    detected: boolean;
    pattern: string;
    strength: number;
  };
  anomalies: Array<{
    period: string;
    value: number;
    expectedValue: number;
    deviation: number;
  }>;
}

export interface GrowthProjection {
  metric: string;
  currentValue: number;
  projections: Array<{
    period: string;
    optimistic: number;
    realistic: number;
    pessimistic: number;
    confidence: number;
  }>;
  factors: Array<{
    factor: string;
    impact: number;
    description: string;
  }>;
}

export class ForecastingService extends BaseService {
  private dashboardService: BusinessDashboardService;

  constructor() {
    super();
    this.dashboardService = new BusinessDashboardService();
  }

  /**
   * Generate revenue forecasts based on historical data
   */
  async generateRevenueForecasts(
    dateRange: { from: Date; to: Date },
    forecastPeriods: number = 6
  ): Promise<ForecastData[]> {
    try {
      const metrics = await this.dashboardService.getDashboardMetrics(dateRange);
      const revenueData = metrics.revenue.monthlyRevenueTrend;

      const forecasts: ForecastData[] = [];

      // Simple linear regression for trend
      const trend = this.calculateLinearTrend(
        revenueData.map((item, index) => ({ x: index, y: item.revenue }))
      );

      // Generate forecasts for next periods
      for (let i = 1; i <= forecastPeriods; i++) {
        const forecastedValue = trend.slope * (revenueData.length + i) + trend.intercept;
        const confidence = Math.max(0.5, 1 - (i * 0.1)); // Decreasing confidence over time

        forecasts.push({
          metric: 'revenue',
          currentValue: revenueData[revenueData.length - 1].revenue,
          forecastedValue: Math.max(0, forecastedValue),
          confidence,
          trend: trend.slope > 0 ? 'up' : trend.slope < 0 ? 'down' : 'stable',
          period: this.getNextPeriod(revenueData[revenueData.length - 1].month, i)
        });
      }

      return forecasts;
    } catch (error) {
      this.logger.error('Error generating revenue forecasts:', error);
      throw error;
    }
  }

  /**
   * Generate user growth forecasts
   */
  async generateUserGrowthForecasts(
    dateRange: { from: Date; to: Date },
    forecastPeriods: number = 6
  ): Promise<ForecastData[]> {
    try {
      const metrics = await this.dashboardService.getDashboardMetrics(dateRange);
      const userData = metrics.users;

      // Generate sample historical data for user growth
      const historicalData = this.generateUserGrowthHistory(userData);

      const forecasts: ForecastData[] = [];

      // Calculate growth rate
      const growthRate = this.calculateGrowthRate(historicalData);

      // Generate forecasts
      for (let i = 1; i <= forecastPeriods; i++) {
        const currentValue = historicalData[historicalData.length - 1].value;
        const forecastedValue = currentValue * Math.pow(1 + growthRate, i);
        const confidence = Math.max(0.6, 1 - (i * 0.08));

        forecasts.push({
          metric: 'users',
          currentValue,
          forecastedValue: Math.round(forecastedValue),
          confidence,
          trend: growthRate > 0 ? 'up' : growthRate < 0 ? 'down' : 'stable',
          period: this.getNextPeriod(new Date().toISOString().slice(0, 7), i)
        });
      }

      return forecasts;
    } catch (error) {
      this.logger.error('Error generating user growth forecasts:', error);
      throw error;
    }
  }

  /**
   * Analyze trends in key metrics
   */
  async analyzeTrends(
    dateRange: { from: Date; to: Date }
  ): Promise<TrendAnalysis[]> {
    try {
      const metrics = await this.dashboardService.getDashboardMetrics(dateRange);
      const analyses: TrendAnalysis[] = [];

      // Revenue trend analysis
      const revenueAnalysis = await this.analyzeMetricTrend(
        'revenue',
        metrics.revenue.monthlyRevenueTrend.map(item => ({
          period: item.month,
          value: item.revenue
        }))
      );
      analyses.push(revenueAnalysis);

      // User growth trend analysis
      const userHistoricalData = this.generateUserGrowthHistory(metrics.users);
      const userAnalysis = await this.analyzeMetricTrend('users', userHistoricalData);
      analyses.push(userAnalysis);

      // Conversion rate trend analysis
      const conversionHistoricalData = this.generateConversionHistory(metrics.conversion);
      const conversionAnalysis = await this.analyzeMetricTrend('conversion_rate', conversionHistoricalData);
      analyses.push(conversionAnalysis);

      return analyses;
    } catch (error) {
      this.logger.error('Error analyzing trends:', error);
      throw error;
    }
  }

  /**
   * Generate growth projections with different scenarios
   */
  async generateGrowthProjections(
    dateRange: { from: Date; to: Date },
    projectionPeriods: number = 12
  ): Promise<GrowthProjection[]> {
    try {
      const metrics = await this.dashboardService.getDashboardMetrics(dateRange);
      const projections: GrowthProjection[] = [];

      // Revenue projections
      const revenueProjection = await this.generateMetricProjection(
        'revenue',
        metrics.overview.totalRevenue,
        metrics.revenue.revenueGrowth / 100,
        projectionPeriods
      );
      projections.push(revenueProjection);

      // User projections
      const userProjection = await this.generateMetricProjection(
        'users',
        metrics.overview.totalUsers,
        metrics.overview.growthRate / 100,
        projectionPeriods
      );
      projections.push(userProjection);

      // Cashback projections
      const cashbackProjection = await this.generateMetricProjection(
        'cashback',
        metrics.overview.totalCashback,
        0.15, // Assumed 15% growth
        projectionPeriods
      );
      projections.push(cashbackProjection);

      return projections;
    } catch (error) {
      this.logger.error('Error generating growth projections:', error);
      throw error;
    }
  }

  /**
   * Detect seasonal patterns in data
   */
  async detectSeasonality(
    data: Array<{ period: string; value: number }>
  ): Promise<{
    detected: boolean;
    pattern: string;
    strength: number;
    peaks: string[];
    troughs: string[];
  }> {
    try {
      if (data.length < 12) {
        return {
          detected: false,
          pattern: 'insufficient_data',
          strength: 0,
          peaks: [],
          troughs: []
        };
      }

      // Simple seasonality detection using autocorrelation
      const values = data.map(d => d.value);
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      const deviations = values.map(val => val - mean);

      // Check for monthly seasonality (12-month cycle)
      const monthlyCorrelation = this.calculateAutocorrelation(deviations, 12);
      
      // Check for quarterly seasonality (3-month cycle)
      const quarterlyCorrelation = this.calculateAutocorrelation(deviations, 3);

      let detected = false;
      let pattern = 'none';
      let strength = 0;

      if (Math.abs(monthlyCorrelation) > 0.3) {
        detected = true;
        pattern = 'monthly';
        strength = Math.abs(monthlyCorrelation);
      } else if (Math.abs(quarterlyCorrelation) > 0.3) {
        detected = true;
        pattern = 'quarterly';
        strength = Math.abs(quarterlyCorrelation);
      }

      // Find peaks and troughs
      const peaks: string[] = [];
      const troughs: string[] = [];

      for (let i = 1; i < data.length - 1; i++) {
        if (data[i].value > data[i - 1].value && data[i].value > data[i + 1].value) {
          peaks.push(data[i].period);
        } else if (data[i].value < data[i - 1].value && data[i].value < data[i + 1].value) {
          troughs.push(data[i].period);
        }
      }

      return {
        detected,
        pattern,
        strength,
        peaks,
        troughs
      };
    } catch (error) {
      this.logger.error('Error detecting seasonality:', error);
      return {
        detected: false,
        pattern: 'error',
        strength: 0,
        peaks: [],
        troughs: []
      };
    }
  }

  /**
   * Generate business insights based on forecasts
   */
  async generateForecastInsights(
    forecasts: ForecastData[],
    trends: TrendAnalysis[]
  ): Promise<{
    insights: string[];
    recommendations: string[];
    risks: string[];
    opportunities: string[];
  }> {
    try {
      const insights: string[] = [];
      const recommendations: string[] = [];
      const risks: string[] = [];
      const opportunities: string[] = [];

      // Analyze revenue forecasts
      const revenueForecast = forecasts.find(f => f.metric === 'revenue');
      if (revenueForecast) {
        if (revenueForecast.trend === 'up') {
          insights.push(`Revenue is projected to grow by ${((revenueForecast.forecastedValue / revenueForecast.currentValue - 1) * 100).toFixed(1)}% in the next period`);
          opportunities.push('Strong revenue growth trajectory provides opportunity for increased investment in marketing and expansion');
        } else if (revenueForecast.trend === 'down') {
          insights.push(`Revenue is projected to decline by ${((1 - revenueForecast.forecastedValue / revenueForecast.currentValue) * 100).toFixed(1)}% in the next period`);
          risks.push('Declining revenue trend requires immediate attention to prevent further losses');
          recommendations.push('Implement retention campaigns and optimize conversion funnels to reverse revenue decline');
        }
      }

      // Analyze user growth forecasts
      const userForecast = forecasts.find(f => f.metric === 'users');
      if (userForecast) {
        if (userForecast.trend === 'up') {
          insights.push(`User base is expected to grow to ${userForecast.forecastedValue.toLocaleString()} users`);
          recommendations.push('Prepare infrastructure scaling to handle increased user load');
        } else {
          risks.push('User growth is slowing down, which may impact long-term revenue potential');
          recommendations.push('Invest in user acquisition campaigns and improve onboarding experience');
        }
      }

      // Analyze trend patterns
      trends.forEach(trend => {
        if (trend.seasonality.detected) {
          insights.push(`${trend.metric} shows ${trend.seasonality.pattern} seasonal patterns with ${(trend.seasonality.strength * 100).toFixed(1)}% strength`);
          recommendations.push(`Plan marketing campaigns and inventory around ${trend.seasonality.pattern} seasonal patterns`);
        }

        if (trend.anomalies.length > 0) {
          insights.push(`Detected ${trend.anomalies.length} anomalies in ${trend.metric} data`);
          recommendations.push(`Investigate anomalies in ${trend.metric} to understand underlying causes`);
        }
      });

      // General recommendations based on forecast confidence
      const lowConfidenceForecasts = forecasts.filter(f => f.confidence < 0.7);
      if (lowConfidenceForecasts.length > 0) {
        recommendations.push('Improve data collection and tracking to increase forecast accuracy');
        risks.push('Low forecast confidence may lead to poor business decisions');
      }

      return {
        insights,
        recommendations,
        risks,
        opportunities
      };
    } catch (error) {
      this.logger.error('Error generating forecast insights:', error);
      throw error;
    }
  }

  // Private helper methods

  private calculateLinearTrend(data: Array<{ x: number; y: number }>): { slope: number; intercept: number } {
    const n = data.length;
    const sumX = data.reduce((sum, point) => sum + point.x, 0);
    const sumY = data.reduce((sum, point) => sum + point.y, 0);
    const sumXY = data.reduce((sum, point) => sum + point.x * point.y, 0);
    const sumXX = data.reduce((sum, point) => sum + point.x * point.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  }

  private calculateGrowthRate(data: Array<{ period: string; value: number }>): number {
    if (data.length < 2) return 0;

    const firstValue = data[0].value;
    const lastValue = data[data.length - 1].value;
    const periods = data.length - 1;

    return Math.pow(lastValue / firstValue, 1 / periods) - 1;
  }

  private calculateAutocorrelation(data: number[], lag: number): number {
    if (data.length <= lag) return 0;

    const n = data.length - lag;
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    
    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (data[i] - mean) * (data[i + lag] - mean);
    }

    for (let i = 0; i < data.length; i++) {
      denominator += Math.pow(data[i] - mean, 2);
    }

    return denominator === 0 ? 0 : numerator / denominator;
  }

  private getNextPeriod(currentPeriod: string, offset: number): string {
    const date = new Date(currentPeriod + '-01');
    date.setMonth(date.getMonth() + offset);
    return date.toISOString().slice(0, 7);
  }

  private generateUserGrowthHistory(userData: any): Array<{ period: string; value: number }> {
    // Generate sample historical data based on current user metrics
    const currentUsers = userData.totalUsers;
    const growthRate = userData.userGrowthRate / 100;
    const history: Array<{ period: string; value: number }> = [];

    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const period = date.toISOString().slice(0, 7);
      const value = Math.round(currentUsers / Math.pow(1 + growthRate, i));
      history.push({ period, value });
    }

    return history;
  }

  private generateConversionHistory(conversionData: any): Array<{ period: string; value: number }> {
    // Generate sample historical conversion rate data
    const currentRate = conversionData.overallConversionRate;
    const history: Array<{ period: string; value: number }> = [];

    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const period = date.toISOString().slice(0, 7);
      // Add some variation to the conversion rate
      const variation = (Math.random() - 0.5) * 0.02; // ±1% variation
      const value = Math.max(0, Math.min(1, currentRate + variation));
      history.push({ period, value });
    }

    return history;
  }

  private async analyzeMetricTrend(
    metric: string,
    data: Array<{ period: string; value: number }>
  ): Promise<TrendAnalysis> {
    // Calculate trend line using linear regression
    const indexedData = data.map((item, index) => ({ x: index, y: item.value }));
    const trend = this.calculateLinearTrend(indexedData);

    const trendLine = data.map((item, index) => ({
      period: item.period,
      value: trend.slope * index + trend.intercept
    }));

    // Detect seasonality
    const seasonality = await this.detectSeasonality(data);

    // Find anomalies (values that deviate significantly from trend)
    const anomalies: Array<{
      period: string;
      value: number;
      expectedValue: number;
      deviation: number;
    }> = [];

    data.forEach((item, index) => {
      const expectedValue = trendLine[index].value;
      const deviation = Math.abs(item.value - expectedValue) / expectedValue;
      
      if (deviation > 0.2) { // 20% deviation threshold
        anomalies.push({
          period: item.period,
          value: item.value,
          expectedValue,
          deviation
        });
      }
    });

    return {
      metric,
      historicalData: data,
      trendLine,
      seasonality,
      anomalies
    };
  }

  private async generateMetricProjection(
    metric: string,
    currentValue: number,
    baseGrowthRate: number,
    periods: number
  ): Promise<GrowthProjection> {
    const projections: Array<{
      period: string;
      optimistic: number;
      realistic: number;
      pessimistic: number;
      confidence: number;
    }> = [];

    // Define scenario multipliers
    const optimisticMultiplier = 1.5;
    const pessimisticMultiplier = 0.5;

    for (let i = 1; i <= periods; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() + i);
      const period = date.toISOString().slice(0, 7);

      const realisticValue = currentValue * Math.pow(1 + baseGrowthRate, i);
      const optimisticValue = currentValue * Math.pow(1 + baseGrowthRate * optimisticMultiplier, i);
      const pessimisticValue = currentValue * Math.pow(1 + baseGrowthRate * pessimisticMultiplier, i);
      
      const confidence = Math.max(0.5, 1 - (i * 0.05)); // Decreasing confidence over time

      projections.push({
        period,
        optimistic: Math.round(optimisticValue),
        realistic: Math.round(realisticValue),
        pessimistic: Math.round(pessimisticValue),
        confidence
      });
    }

    // Define factors affecting growth
    const factors = [
      {
        factor: 'Market Expansion',
        impact: 0.2,
        description: 'Expansion into new markets and demographics'
      },
      {
        factor: 'Competition',
        impact: -0.1,
        description: 'Increased competition may reduce growth rate'
      },
      {
        factor: 'Economic Conditions',
        impact: 0.05,
        description: 'Overall economic health affects consumer spending'
      },
      {
        factor: 'Product Innovation',
        impact: 0.15,
        description: 'New features and improvements drive user engagement'
      },
      {
        factor: 'Marketing Investment',
        impact: 0.1,
        description: 'Increased marketing spend can accelerate growth'
      }
    ];

    return {
      metric,
      currentValue,
      projections,
      factors
    };
  }
}
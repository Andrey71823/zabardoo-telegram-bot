import { BaseService } from '../base/BaseService';
import { AnalyticsRepository } from '../../repositories/AnalyticsRepository';
import { 
  CohortAnalysis,
  Cohort,
  CohortType,
  UserEvent,
  EventType,
  UserAction
} from '../../models/Analytics';

export interface CohortConfiguration {
  name: string;
  cohortType: CohortType;
  acquisitionEvent: string;
  retentionEvent: string;
  timeUnit: 'day' | 'week' | 'month';
  periods: number;
  filters?: {
    userProperties?: Record<string, any>;
    eventProperties?: Record<string, any>;
  };
}

export interface CohortMetrics {
  cohortSize: number;
  retentionRates: number[];
  averageRetention: number;
  churnRate: number;
  lifetimeValue?: number;
  revenuePerUser?: number;
}

export interface CohortComparison {
  cohort1: CohortAnalysis;
  cohort2: CohortAnalysis;
  retentionDifference: number[];
  significantDifferences: Array<{
    period: number;
    difference: number;
    isSignificant: boolean;
  }>;
}

export class CohortAnalysisService extends BaseService {
  private repository: AnalyticsRepository;

  constructor() {
    super();
    this.repository = new AnalyticsRepository();
  }

  // Create cohort analysis
  async createCohortAnalysis(
    config: CohortConfiguration,
    dateRange: { from: Date; to: Date }
  ): Promise<CohortAnalysis> {
    try {
      this.logger.info('Starting cohort analysis', { 
        name: config.name,
        type: config.cohortType,
        dateRange 
      });

      // Get acquisition events to define cohorts
      const acquisitionEvents = await this.getAcquisitionEvents(
        config.acquisitionEvent,
        dateRange,
        config.filters
      );

      // Group users into cohorts by acquisition period
      const cohorts = await this.groupIntoCohorts(
        acquisitionEvents,
        config.timeUnit
      );

      // Calculate retention for each cohort
      const cohortsWithRetention = await Promise.all(
        cohorts.map(cohort => 
          this.calculateCohortRetention(cohort, config)
        )
      );

      // Build retention matrix
      const retentionMatrix = this.buildRetentionMatrix(cohortsWithRetention);
      const averageRetention = this.calculateAverageRetention(retentionMatrix);

      const analysis: CohortAnalysis = {
        id: this.generateAnalysisId(),
        name: config.name,
        cohortType: config.cohortType,
        dateRange,
        cohorts: cohortsWithRetention,
        retentionMatrix,
        averageRetention
      };

      this.logger.info('Cohort analysis completed', {
        analysisId: analysis.id,
        cohortsCount: cohorts.length,
        totalUsers: cohorts.reduce((sum, c) => sum + c.userCount, 0)
      });

      return analysis;
    } catch (error) {
      this.logger.error('Failed to create cohort analysis', { error: error.message });
      throw error;
    }
  }
}  // Ana
lyze retention cohorts
  async analyzeRetentionCohorts(
    dateRange: { from: Date; to: Date },
    timeUnit: 'day' | 'week' | 'month' = 'week',
    periods: number = 12
  ): Promise<CohortAnalysis> {
    const config: CohortConfiguration = {
      name: 'User Retention Analysis',
      cohortType: CohortType.ACQUISITION,
      acquisitionEvent: UserAction.BOT_START,
      retentionEvent: 'any_activity',
      timeUnit,
      periods
    };

    return await this.createCohortAnalysis(config, dateRange);
  }

  // Analyze revenue cohorts
  async analyzeRevenueCohorts(
    dateRange: { from: Date; to: Date },
    timeUnit: 'month' = 'month',
    periods: number = 12
  ): Promise<CohortAnalysis> {
    const config: CohortConfiguration = {
      name: 'Revenue Cohort Analysis',
      cohortType: CohortType.REVENUE,
      acquisitionEvent: UserAction.BOT_START,
      retentionEvent: UserAction.PURCHASE_COMPLETED,
      timeUnit,
      periods
    };

    return await this.createCohortAnalysis(config, dateRange);
  }

  // Compare cohorts
  async compareCohorts(
    cohort1Config: CohortConfiguration,
    cohort2Config: CohortConfiguration,
    dateRange: { from: Date; to: Date }
  ): Promise<CohortComparison> {
    try {
      const [cohort1, cohort2] = await Promise.all([
        this.createCohortAnalysis(cohort1Config, dateRange),
        this.createCohortAnalysis(cohort2Config, dateRange)
      ]);

      const retentionDifference = cohort1.averageRetention.map((rate1, index) => {
        const rate2 = cohort2.averageRetention[index] || 0;
        return rate1 - rate2;
      });

      const significantDifferences = retentionDifference.map((diff, index) => ({
        period: index,
        difference: diff,
        isSignificant: Math.abs(diff) > 0.05 // 5% threshold
      }));

      return {
        cohort1,
        cohort2,
        retentionDifference,
        significantDifferences
      };
    } catch (error) {
      this.logger.error('Failed to compare cohorts', { error: error.message });
      throw error;
    }
  }

  // Get cohort insights
  async getCohortInsights(analysis: CohortAnalysis): Promise<{
    bestPerformingCohort: string;
    worstPerformingCohort: string;
    retentionTrend: 'improving' | 'declining' | 'stable';
    keyInsights: string[];
    recommendations: string[];
  }> {
    try {
      // Find best and worst performing cohorts
      const cohortPerformance = analysis.cohorts.map(cohort => ({
        name: cohort.name,
        avgRetention: cohort.retentionRates.reduce((sum, rate) => sum + rate, 0) / cohort.retentionRates.length
      }));

      cohortPerformance.sort((a, b) => b.avgRetention - a.avgRetention);

      const bestPerformingCohort = cohortPerformance[0]?.name || 'None';
      const worstPerformingCohort = cohortPerformance[cohortPerformance.length - 1]?.name || 'None';

      // Analyze retention trend
      const retentionTrend = this.analyzeRetentionTrend(analysis.cohorts);

      // Generate insights
      const keyInsights = this.generateCohortInsights(analysis);
      const recommendations = this.generateCohortRecommendations(analysis);

      return {
        bestPerformingCohort,
        worstPerformingCohort,
        retentionTrend,
        keyInsights,
        recommendations
      };
    } catch (error) {
      this.logger.error('Failed to get cohort insights', { error: error.message });
      throw error;
    }
  }

  // Private helper methods
  private async getAcquisitionEvents(
    eventName: string,
    dateRange: { from: Date; to: Date },
    filters?: { userProperties?: Record<string, any>; eventProperties?: Record<string, any> }
  ): Promise<UserEvent[]> {
    try {
      // Get events that represent user acquisition
      const events = await this.repository.getEventsByDateRange(dateRange, {
        eventNames: [eventName],
        filters
      });

      // Filter to first occurrence per user
      const userFirstEvents = new Map<string, UserEvent>();
      
      events.forEach(event => {
        const existingEvent = userFirstEvents.get(event.userId);
        if (!existingEvent || event.timestamp < existingEvent.timestamp) {
          userFirstEvents.set(event.userId, event);
        }
      });

      return Array.from(userFirstEvents.values());
    } catch (error) {
      this.logger.error('Failed to get acquisition events', { error: error.message });
      throw error;
    }
  }

  private async groupIntoCohorts(
    acquisitionEvents: UserEvent[],
    timeUnit: 'day' | 'week' | 'month'
  ): Promise<Cohort[]> {
    try {
      const cohortGroups = new Map<string, UserEvent[]>();

      acquisitionEvents.forEach(event => {
        const cohortKey = this.getCohortKey(event.timestamp, timeUnit);
        
        if (!cohortGroups.has(cohortKey)) {
          cohortGroups.set(cohortKey, []);
        }
        cohortGroups.get(cohortKey)!.push(event);
      });

      const cohorts: Cohort[] = [];
      
      for (const [cohortKey, events] of cohortGroups.entries()) {
        const cohortDate = this.parseCohortKey(cohortKey, timeUnit);
        
        const cohort: Cohort = {
          id: `cohort_${cohortKey}`,
          name: this.formatCohortName(cohortDate, timeUnit),
          startDate: cohortDate,
          endDate: this.getCohortEndDate(cohortDate, timeUnit),
          userCount: events.length,
          retentionRates: [], // Will be calculated later
          properties: {
            acquisitionEvents: events.length,
            userIds: events.map(e => e.userId)
          }
        };

        cohorts.push(cohort);
      }

      // Sort cohorts by start date
      cohorts.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

      return cohorts;
    } catch (error) {
      this.logger.error('Failed to group into cohorts', { error: error.message });
      throw error;
    }
  }

  private async calculateCohortRetention(
    cohort: Cohort,
    config: CohortConfiguration
  ): Promise<Cohort> {
    try {
      const userIds = cohort.properties.userIds as string[];
      const retentionRates: number[] = [];

      for (let period = 0; period < config.periods; period++) {
        const periodStart = this.addTimeUnit(cohort.startDate, period, config.timeUnit);
        const periodEnd = this.addTimeUnit(periodStart, 1, config.timeUnit);

        // Count users who were active in this period
        const activeUsers = await this.countActiveUsers(
          userIds,
          periodStart,
          periodEnd,
          config.retentionEvent
        );

        const retentionRate = cohort.userCount > 0 ? activeUsers / cohort.userCount : 0;
        retentionRates.push(retentionRate);
      }

      return {
        ...cohort,
        retentionRates
      };
    } catch (error) {
      this.logger.error('Failed to calculate cohort retention', { 
        cohortId: cohort.id,
        error: error.message 
      });
      throw error;
    }
  }

  private async countActiveUsers(
    userIds: string[],
    startDate: Date,
    endDate: Date,
    retentionEvent: string
  ): Promise<number> {
    try {
      if (retentionEvent === 'any_activity') {
        // Count users with any activity
        const activeUserIds = await this.repository.getActiveUserIds({
          userIds,
          dateRange: { from: startDate, to: endDate }
        });
        return activeUserIds.length;
      } else {
        // Count users with specific event
        const events = await this.repository.getEventsByDateRange(
          { from: startDate, to: endDate },
          { 
            eventNames: [retentionEvent],
            userIds 
          }
        );
        
        const uniqueUsers = new Set(events.map(e => e.userId));
        return uniqueUsers.size;
      }
    } catch (error) {
      this.logger.error('Failed to count active users', { error: error.message });
      return 0;
    }
  }

  private buildRetentionMatrix(cohorts: Cohort[]): number[][] {
    return cohorts.map(cohort => cohort.retentionRates);
  }

  private calculateAverageRetention(retentionMatrix: number[][]): number[] {
    if (retentionMatrix.length === 0) return [];

    const maxPeriods = Math.max(...retentionMatrix.map(row => row.length));
    const averageRetention: number[] = [];

    for (let period = 0; period < maxPeriods; period++) {
      const periodRates = retentionMatrix
        .map(row => row[period])
        .filter(rate => rate !== undefined);

      const average = periodRates.length > 0
        ? periodRates.reduce((sum, rate) => sum + rate, 0) / periodRates.length
        : 0;

      averageRetention.push(average);
    }

    return averageRetention;
  }

  private getCohortKey(date: Date, timeUnit: 'day' | 'week' | 'month'): string {
    switch (timeUnit) {
      case 'day':
        return date.toISOString().split('T')[0]; // YYYY-MM-DD
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay()); // Start of week
        return weekStart.toISOString().split('T')[0];
      case 'month':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      default:
        return date.toISOString().split('T')[0];
    }
  }

  private parseCohortKey(key: string, timeUnit: 'day' | 'week' | 'month'): Date {
    switch (timeUnit) {
      case 'day':
      case 'week':
        return new Date(key);
      case 'month':
        const [year, month] = key.split('-');
        return new Date(parseInt(year), parseInt(month) - 1, 1);
      default:
        return new Date(key);
    }
  }

  private formatCohortName(date: Date, timeUnit: 'day' | 'week' | 'month'): string {
    switch (timeUnit) {
      case 'day':
        return date.toLocaleDateString();
      case 'week':
        return `Week of ${date.toLocaleDateString()}`;
      case 'month':
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      default:
        return date.toLocaleDateString();
    }
  }

  private getCohortEndDate(startDate: Date, timeUnit: 'day' | 'week' | 'month'): Date {
    return this.addTimeUnit(startDate, 1, timeUnit);
  }

  private addTimeUnit(date: Date, amount: number, unit: 'day' | 'week' | 'month'): Date {
    const newDate = new Date(date);
    
    switch (unit) {
      case 'day':
        newDate.setDate(newDate.getDate() + amount);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + (amount * 7));
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + amount);
        break;
    }
    
    return newDate;
  }

  private analyzeRetentionTrend(cohorts: Cohort[]): 'improving' | 'declining' | 'stable' {
    if (cohorts.length < 2) return 'stable';

    // Compare recent cohorts with older ones
    const recentCohorts = cohorts.slice(-3); // Last 3 cohorts
    const olderCohorts = cohorts.slice(0, 3); // First 3 cohorts

    const recentAvgRetention = this.calculateCohortGroupAverage(recentCohorts);
    const olderAvgRetention = this.calculateCohortGroupAverage(olderCohorts);

    const difference = recentAvgRetention - olderAvgRetention;

    if (difference > 0.05) return 'improving';
    if (difference < -0.05) return 'declining';
    return 'stable';
  }

  private calculateCohortGroupAverage(cohorts: Cohort[]): number {
    if (cohorts.length === 0) return 0;

    const allRates = cohorts.flatMap(c => c.retentionRates);
    return allRates.length > 0
      ? allRates.reduce((sum, rate) => sum + rate, 0) / allRates.length
      : 0;
  }

  private generateCohortInsights(analysis: CohortAnalysis): string[] {
    const insights: string[] = [];

    // Analyze overall retention
    const firstPeriodRetention = analysis.averageRetention[0] || 0;
    const lastPeriodRetention = analysis.averageRetention[analysis.averageRetention.length - 1] || 0;

    insights.push(`First period retention: ${(firstPeriodRetention * 100).toFixed(1)}%`);
    insights.push(`Long-term retention: ${(lastPeriodRetention * 100).toFixed(1)}%`);

    // Analyze cohort sizes
    const cohortSizes = analysis.cohorts.map(c => c.userCount);
    const avgCohortSize = cohortSizes.reduce((sum, size) => sum + size, 0) / cohortSizes.length;
    insights.push(`Average cohort size: ${Math.round(avgCohortSize)} users`);

    // Identify patterns
    const retentionDropoff = firstPeriodRetention - lastPeriodRetention;
    if (retentionDropoff > 0.5) {
      insights.push('High retention dropoff indicates need for better long-term engagement');
    }

    return insights;
  }

  private generateCohortRecommendations(analysis: CohortAnalysis): string[] {
    const recommendations: string[] = [];

    const firstPeriodRetention = analysis.averageRetention[0] || 0;
    const secondPeriodRetention = analysis.averageRetention[1] || 0;

    // Early retention recommendations
    if (firstPeriodRetention < 0.3) {
      recommendations.push('Improve onboarding experience to increase early retention');
    }

    // Period-over-period retention
    if (secondPeriodRetention / firstPeriodRetention < 0.5) {
      recommendations.push('Focus on second-period engagement to reduce early churn');
    }

    // Long-term retention
    const longTermRetention = analysis.averageRetention[analysis.averageRetention.length - 1] || 0;
    if (longTermRetention < 0.1) {
      recommendations.push('Develop long-term engagement strategies and loyalty programs');
    }

    // Cohort comparison
    const cohortVariance = this.calculateCohortVariance(analysis.cohorts);
    if (cohortVariance > 0.1) {
      recommendations.push('Investigate factors causing high variance between cohorts');
    }

    return recommendations;
  }

  private calculateCohortVariance(cohorts: Cohort[]): number {
    if (cohorts.length === 0) return 0;

    const avgRetentions = cohorts.map(c => 
      c.retentionRates.reduce((sum, rate) => sum + rate, 0) / c.retentionRates.length
    );

    const mean = avgRetentions.reduce((sum, avg) => sum + avg, 0) / avgRetentions.length;
    const variance = avgRetentions.reduce((sum, avg) => sum + Math.pow(avg - mean, 2), 0) / avgRetentions.length;

    return Math.sqrt(variance);
  }

  private generateAnalysisId(): string {
    return `cohort_analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
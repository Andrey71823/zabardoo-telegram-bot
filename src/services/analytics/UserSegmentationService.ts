import { BaseService } from '../base/BaseService';
import { AnalyticsRepository } from '../../repositories/AnalyticsRepository';
import { 
  UserEvent,
  EventType,
  UserAction,
  BusinessMetric
} from '../../models/Analytics';

export interface UserSegment {
  id: string;
  name: string;
  description: string;
  criteria: SegmentCriteria[];
  userCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SegmentCriteria {
  type: 'event' | 'property' | 'behavior' | 'demographic';
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'contains' | 'between';
  value: any;
  timeframe?: {
    period: number;
    unit: 'days' | 'weeks' | 'months';
  };
}

export interface SegmentAnalysis {
  segment: UserSegment;
  metrics: {
    totalUsers: number;
    activeUsers: number;
    conversionRate: number;
    averageSessionDuration: number;
    totalRevenue: number;
    averageRevenuePerUser: number;
    retentionRate: number;
    churnRate: number;
  };
  topEvents: Array<{
    eventName: string;
    count: number;
    uniqueUsers: number;
  }>;
  behaviorPatterns: string[];
}

export interface SegmentComparison {
  segments: UserSegment[];
  metrics: Array<{
    metric: string;
    values: number[];
    bestPerforming: string;
    worstPerforming: string;
  }>;
  insights: string[];
}

export class UserSegmentationService extends BaseService {
  private repository: AnalyticsRepository;

  constructor() {
    super();
    this.repository = new AnalyticsRepository();
  }

  // Create user segment
  async createSegment(
    name: string,
    description: string,
    criteria: SegmentCriteria[]
  ): Promise<UserSegment> {
    try {
      const segmentId = this.generateSegmentId();
      
      const segment: UserSegment = {
        id: segmentId,
        name,
        description,
        criteria,
        userCount: 0, // Will be calculated
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Calculate initial user count
      segment.userCount = await this.calculateSegmentSize(segment);

      await this.repository.createUserSegment(segment);
      
      this.logger.info('User segment created', { 
        segmentId, 
        name,
        userCount: segment.userCount 
      });

      return segment;
    } catch (error) {
      this.logger.error('Failed to create user segment', { error: error.message });
      throw error;
    }
  }

  // Analyze segment performance
  async analyzeSegment(
    segmentId: string,
    dateRange: { from: Date; to: Date }
  ): Promise<SegmentAnalysis> {
    try {
      const segment = await this.repository.getUserSegment(segmentId);
      if (!segment) {
        throw new Error('Segment not found');
      }

      this.logger.info('Starting segment analysis', { segmentId, dateRange });

      // Get users in segment
      const segmentUsers = await this.getSegmentUsers(segment, dateRange);
      
      // Calculate metrics
      const metrics = await this.calculateSegmentMetrics(segmentUsers, dateRange);
      
      // Get top events
      const topEvents = await this.getSegmentTopEvents(segmentUsers, dateRange);
      
      // Analyze behavior patterns
      const behaviorPatterns = await this.analyzeBehaviorPatterns(segmentUsers, dateRange);

      const analysis: SegmentAnalysis = {
        segment,
        metrics,
        topEvents,
        behaviorPatterns
      };

      this.logger.info('Segment analysis completed', {
        segmentId,
        totalUsers: metrics.totalUsers,
        conversionRate: metrics.conversionRate
      });

      return analysis;
    } catch (error) {
      this.logger.error('Failed to analyze segment', { segmentId, error: error.message });
      throw error;
    }
  }

  // Compare multiple segments
  async compareSegments(
    segmentIds: string[],
    dateRange: { from: Date; to: Date }
  ): Promise<SegmentComparison> {
    try {
      const segments = await Promise.all(
        segmentIds.map(id => this.repository.getUserSegment(id))
      );

      const validSegments = segments.filter(s => s !== null) as UserSegment[];
      
      if (validSegments.length === 0) {
        throw new Error('No valid segments found');
      }

      // Analyze each segment
      const analyses = await Promise.all(
        validSegments.map(segment => this.analyzeSegment(segment.id, dateRange))
      );

      // Compare metrics
      const metricNames = [
        'totalUsers', 'activeUsers', 'conversionRate', 
        'averageSessionDuration', 'totalRevenue', 'averageRevenuePerUser',
        'retentionRate', 'churnRate'
      ];

      const metrics = metricNames.map(metricName => {
        const values = analyses.map(analysis => analysis.metrics[metricName as keyof typeof analysis.metrics]);
        const maxValue = Math.max(...values);
        const minValue = Math.min(...values);
        
        const bestIndex = values.indexOf(maxValue);
        const worstIndex = values.indexOf(minValue);

        return {
          metric: metricName,
          values,
          bestPerforming: validSegments[bestIndex].name,
          worstPerforming: validSegments[worstIndex].name
        };
      });

      // Generate insights
      const insights = this.generateComparisonInsights(analyses);

      return {
        segments: validSegments,
        metrics,
        insights
      };
    } catch (error) {
      this.logger.error('Failed to compare segments', { error: error.message });
      throw error;
    }
  }

  // Create predefined segments
  async createPredefinedSegments(): Promise<UserSegment[]> {
    try {
      const predefinedSegments = [
        {
          name: 'High Value Users',
          description: 'Users with high purchase amounts and frequent activity',
          criteria: [
            {
              type: 'behavior' as const,
              field: 'total_purchase_amount',
              operator: 'gte' as const,
              value: 5000,
              timeframe: { period: 3, unit: 'months' as const }
            },
            {
              type: 'behavior' as const,
              field: 'purchase_frequency',
              operator: 'gte' as const,
              value: 3,
              timeframe: { period: 1, unit: 'months' as const }
            }
          ]
        },
        {
          name: 'New Users',
          description: 'Users who joined in the last 30 days',
          criteria: [
            {
              type: 'property' as const,
              field: 'registration_date',
              operator: 'gte' as const,
              value: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
          ]
        },
        {
          name: 'At Risk Users',
          description: 'Users who haven\'t been active recently but were previously engaged',
          criteria: [
            {
              type: 'behavior' as const,
              field: 'last_activity',
              operator: 'lt' as const,
              value: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
            },
            {
              type: 'behavior' as const,
              field: 'total_sessions',
              operator: 'gte' as const,
              value: 5
            }
          ]
        },
        {
          name: 'Mobile Users',
          description: 'Users primarily accessing via mobile devices',
          criteria: [
            {
              type: 'property' as const,
              field: 'primary_device',
              operator: 'eq' as const,
              value: 'mobile'
            }
          ]
        },
        {
          name: 'Cashback Enthusiasts',
          description: 'Users who frequently earn and withdraw cashback',
          criteria: [
            {
              type: 'event' as const,
              field: 'cashback_earned',
              operator: 'gte' as const,
              value: 5,
              timeframe: { period: 1, unit: 'months' as const }
            }
          ]
        }
      ];

      const createdSegments = [];
      
      for (const segmentData of predefinedSegments) {
        const segment = await this.createSegment(
          segmentData.name,
          segmentData.description,
          segmentData.criteria
        );
        createdSegments.push(segment);
      }

      this.logger.info('Predefined segments created', { count: createdSegments.length });
      return createdSegments;
    } catch (error) {
      this.logger.error('Failed to create predefined segments', { error: error.message });
      throw error;
    }
  }

  // Get segment recommendations
  async getSegmentRecommendations(segmentId: string): Promise<{
    targetingRecommendations: string[];
    engagementStrategies: string[];
    conversionOptimizations: string[];
  }> {
    try {
      const analysis = await this.analyzeSegment(segmentId, {
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        to: new Date()
      });

      const targetingRecommendations = this.generateTargetingRecommendations(analysis);
      const engagementStrategies = this.generateEngagementStrategies(analysis);
      const conversionOptimizations = this.generateConversionOptimizations(analysis);

      return {
        targetingRecommendations,
        engagementStrategies,
        conversionOptimizations
      };
    } catch (error) {
      this.logger.error('Failed to get segment recommendations', { segmentId, error: error.message });
      throw error;
    }
  }

  // Private helper methods
  private async calculateSegmentSize(segment: UserSegment): Promise<number> {
    try {
      // This would involve complex queries to count users matching criteria
      // For now, return a mock value
      return Math.floor(Math.random() * 1000) + 100;
    } catch (error) {
      this.logger.error('Failed to calculate segment size', { error: error.message });
      return 0;
    }
  }

  private async getSegmentUsers(
    segment: UserSegment,
    dateRange: { from: Date; to: Date }
  ): Promise<string[]> {
    try {
      // Complex logic to find users matching segment criteria
      // This is a simplified mock implementation
      const mockUsers = [];
      for (let i = 0; i < segment.userCount; i++) {
        mockUsers.push(`user_${segment.id}_${i}`);
      }
      return mockUsers;
    } catch (error) {
      this.logger.error('Failed to get segment users', { error: error.message });
      return [];
    }
  }

  private async calculateSegmentMetrics(
    userIds: string[],
    dateRange: { from: Date; to: Date }
  ): Promise<SegmentAnalysis['metrics']> {
    try {
      // Mock implementation - would calculate real metrics from user events
      const totalUsers = userIds.length;
      const activeUsers = Math.floor(totalUsers * 0.7);
      
      return {
        totalUsers,
        activeUsers,
        conversionRate: 0.12,
        averageSessionDuration: 180, // seconds
        totalRevenue: totalUsers * 150,
        averageRevenuePerUser: 150,
        retentionRate: 0.65,
        churnRate: 0.35
      };
    } catch (error) {
      this.logger.error('Failed to calculate segment metrics', { error: error.message });
      throw error;
    }
  }

  private async getSegmentTopEvents(
    userIds: string[],
    dateRange: { from: Date; to: Date }
  ): Promise<Array<{ eventName: string; count: number; uniqueUsers: number }>> {
    try {
      // Mock implementation
      return [
        { eventName: 'coupon_view', count: 1250, uniqueUsers: 450 },
        { eventName: 'coupon_click', count: 890, uniqueUsers: 380 },
        { eventName: 'purchase_completed', count: 156, uniqueUsers: 120 },
        { eventName: 'cashback_earned', count: 145, uniqueUsers: 115 }
      ];
    } catch (error) {
      this.logger.error('Failed to get segment top events', { error: error.message });
      return [];
    }
  }

  private async analyzeBehaviorPatterns(
    userIds: string[],
    dateRange: { from: Date; to: Date }
  ): Promise<string[]> {
    try {
      // Mock behavior pattern analysis
      return [
        'High engagement during weekends',
        'Prefer electronics and fashion categories',
        'Average session duration is 3 minutes',
        'Most active between 7-9 PM',
        'High mobile usage (85%)'
      ];
    } catch (error) {
      this.logger.error('Failed to analyze behavior patterns', { error: error.message });
      return [];
    }
  }

  private generateComparisonInsights(analyses: SegmentAnalysis[]): string[] {
    const insights: string[] = [];

    // Compare conversion rates
    const conversionRates = analyses.map(a => a.metrics.conversionRate);
    const maxConversion = Math.max(...conversionRates);
    const minConversion = Math.min(...conversionRates);
    
    if (maxConversion - minConversion > 0.05) {
      const bestSegment = analyses[conversionRates.indexOf(maxConversion)].segment.name;
      insights.push(`${bestSegment} has significantly higher conversion rate (${(maxConversion * 100).toFixed(1)}%)`);
    }

    // Compare revenue per user
    const revenuePerUser = analyses.map(a => a.metrics.averageRevenuePerUser);
    const maxRevenue = Math.max(...revenuePerUser);
    const bestRevenueSegment = analyses[revenuePerUser.indexOf(maxRevenue)].segment.name;
    
    insights.push(`${bestRevenueSegment} generates highest revenue per user (₹${maxRevenue.toFixed(2)})`);

    // Compare retention rates
    const retentionRates = analyses.map(a => a.metrics.retentionRate);
    const maxRetention = Math.max(...retentionRates);
    const bestRetentionSegment = analyses[retentionRates.indexOf(maxRetention)].segment.name;
    
    insights.push(`${bestRetentionSegment} has best retention rate (${(maxRetention * 100).toFixed(1)}%)`);

    return insights;
  }

  private generateTargetingRecommendations(analysis: SegmentAnalysis): string[] {
    const recommendations: string[] = [];

    if (analysis.metrics.conversionRate > 0.15) {
      recommendations.push('High-converting segment - increase marketing spend and targeting');
    }

    if (analysis.metrics.averageRevenuePerUser > 200) {
      recommendations.push('High-value segment - focus on premium product recommendations');
    }

    if (analysis.metrics.retentionRate < 0.5) {
      recommendations.push('Low retention - implement retention campaigns and loyalty programs');
    }

    return recommendations;
  }

  private generateEngagementStrategies(analysis: SegmentAnalysis): string[] {
    const strategies: string[] = [];

    // Based on top events
    const topEvent = analysis.topEvents[0];
    if (topEvent && topEvent.eventName.includes('coupon')) {
      strategies.push('Focus on coupon-based engagement campaigns');
    }

    if (analysis.metrics.averageSessionDuration < 120) {
      strategies.push('Improve content quality to increase session duration');
    }

    strategies.push('Personalize content based on segment behavior patterns');
    strategies.push('Implement push notifications for re-engagement');

    return strategies;
  }

  private generateConversionOptimizations(analysis: SegmentAnalysis): string[] {
    const optimizations: string[] = [];

    if (analysis.metrics.conversionRate < 0.1) {
      optimizations.push('Optimize conversion funnel to reduce friction');
      optimizations.push('A/B test different call-to-action messages');
    }

    if (analysis.topEvents.some(e => e.eventName === 'coupon_view' && e.count > e.uniqueUsers * 2)) {
      optimizations.push('Users view multiple coupons - implement better filtering and recommendations');
    }

    optimizations.push('Implement exit-intent popups with special offers');
    optimizations.push('Use social proof and urgency tactics');

    return optimizations;
  }

  private generateSegmentId(): string {
    return `segment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
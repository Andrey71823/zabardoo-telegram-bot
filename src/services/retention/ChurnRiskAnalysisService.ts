import { Pool } from 'pg';
import { RetentionEngineRepository } from '../../repositories/RetentionEngineRepository';
import { TrafficManagerRepository } from '../../repositories/TrafficManagerRepository';
import { UserRepository } from '../../repositories/UserRepository';
import { BaseService } from '../base/BaseService';
import { 
  UserChurnRisk, 
  UserActivityMonitoring, 
  ChurnRiskFactor, 
  InterventionRecommendation,
  ActivityMetrics,
  BehaviorPattern,
  EngagementTrend,
  ActivityAnomaly,
  UserPrediction
} from '../../models/RetentionEngine';
import { logger } from '../../config/logger';

export interface ChurnRiskCalculationConfig {
  lookbackDays: number;
  riskFactorWeights: Record<string, number>;
  thresholds: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  minimumActivityDays: number;
  engagementDecayRate: number;
}

export interface UserActivityData {
  userId: string;
  totalSessions: number;
  totalClicks: number;
  totalConversions: number;
  totalRevenue: number;
  lastActivityDate: Date;
  averageSessionDuration: number;
  clickThroughRate: number;
  conversionRate: number;
  lifetimeValue: number;
  daysSinceRegistration: number;
  daysSinceLastActivity: number;
  activityFrequency: number;
  engagementScore: number;
  recentTrend: 'increasing' | 'stable' | 'decreasing' | 'inactive';
}

export class ChurnRiskAnalysisService extends BaseService {
  private retentionRepo: RetentionEngineRepository;
  private trafficRepo: TrafficManagerRepository;
  private userRepo: UserRepository;
  
  private defaultConfig: ChurnRiskCalculationConfig = {
    lookbackDays: 30,
    riskFactorWeights: {
      daysSinceLastActivity: 0.25,
      engagementTrend: 0.20,
      conversionRate: 0.15,
      sessionFrequency: 0.15,
      lifetimeValue: 0.10,
      supportInteractions: 0.05,
      deviceChanges: 0.05,
      timeOfDayChanges: 0.05
    },
    thresholds: {
      low: 25,
      medium: 50,
      high: 75,
      critical: 90
    },
    minimumActivityDays: 7,
    engagementDecayRate: 0.1
  };

  constructor(pool: Pool) {
    super();
    this.retentionRepo = new RetentionEngineRepository(pool);
    this.trafficRepo = new TrafficManagerRepository(pool);
    this.userRepo = new UserRepository(pool);
  }

  // Main churn risk calculation
  async calculateChurnRisk(userId: string, config?: Partial<ChurnRiskCalculationConfig>): Promise<UserChurnRisk> {
    try {
      logger.info('Calculating churn risk for user', { userId });

      const finalConfig = { ...this.defaultConfig, ...config };
      
      // Get user activity data
      const activityData = await this.getUserActivityData(userId, finalConfig.lookbackDays);
      
      if (!activityData) {
        throw new Error(`No activity data found for user: ${userId}`);
      }

      // Calculate risk factors
      const riskFactors = await this.calculateRiskFactors(activityData, finalConfig);
      
      // Calculate overall risk score
      const churnRiskScore = this.calculateOverallRiskScore(riskFactors, finalConfig);
      
      // Determine risk level
      const riskLevel = this.determineRiskLevel(churnRiskScore, finalConfig.thresholds);
      
      // Predict churn date
      const predictedChurnDate = this.predictChurnDate(activityData, churnRiskScore);
      
      // Calculate confidence
      const confidence = this.calculateConfidence(riskFactors, activityData);
      
      // Generate intervention recommendations
      const interventionRecommendations = this.generateInterventionRecommendations(
        riskFactors, 
        riskLevel, 
        activityData
      );

      const churnRisk: Omit<UserChurnRisk, 'id' | 'createdAt' | 'updatedAt'> = {
        userId,
        churnRiskScore,
        riskLevel,
        riskFactors,
        predictedChurnDate,
        confidence,
        lastActivityDate: activityData.lastActivityDate,
        daysSinceLastActivity: activityData.daysSinceLastActivity,
        activityTrend: activityData.recentTrend,
        engagementScore: activityData.engagementScore,
        lifetimeValue: activityData.lifetimeValue,
        interventionRecommendations,
        calculatedAt: new Date(),
        metadata: {
          calculationConfig: finalConfig,
          activityDataSummary: {
            totalSessions: activityData.totalSessions,
            totalClicks: activityData.totalClicks,
            totalConversions: activityData.totalConversions,
            daysSinceRegistration: activityData.daysSinceRegistration
          }
        }
      };

      const result = await this.retentionRepo.createChurnRisk(churnRisk);
      
      logger.info('Churn risk calculated successfully', { 
        userId, 
        riskScore: churnRiskScore, 
        riskLevel 
      });

      return result;
    } catch (error) {
      logger.error('Error calculating churn risk', { userId, error: error.message });
      throw error;
    }
  }

  // Batch calculate churn risk for multiple users
  async batchCalculateChurnRisk(userIds: string[], config?: Partial<ChurnRiskCalculationConfig>): Promise<UserChurnRisk[]> {
    try {
      logger.info('Batch calculating churn risk', { userCount: userIds.length });

      const results: UserChurnRisk[] = [];
      const batchSize = 50; // Process in batches to avoid overwhelming the system

      for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = userIds.slice(i, i + batchSize);
        const batchPromises = batch.map(userId => 
          this.calculateChurnRisk(userId, config).catch(error => {
            logger.error('Error in batch churn risk calculation', { userId, error: error.message });
            return null;
          })
        );

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults.filter(result => result !== null) as UserChurnRisk[]);
      }

      logger.info('Batch churn risk calculation completed', { 
        totalUsers: userIds.length, 
        successfulCalculations: results.length 
      });

      return results;
    } catch (error) {
      logger.error('Error in batch churn risk calculation', { error: error.message });
      throw error;
    }
  }

  // Monitor user activity and detect changes
  async monitorUserActivity(userId: string): Promise<UserActivityMonitoring> {
    try {
      logger.info('Monitoring user activity', { userId });

      const monitoringPeriod = {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        endDate: new Date(),
        preset: 'last_30_days' as const
      };

      // Get activity metrics
      const activityMetrics = await this.calculateActivityMetrics(userId, monitoringPeriod);
      
      // Detect behavior patterns
      const behaviorPatterns = await this.detectBehaviorPatterns(userId, monitoringPeriod);
      
      // Calculate engagement trends
      const engagementTrends = await this.calculateEngagementTrends(userId, monitoringPeriod);
      
      // Detect anomalies
      const anomalies = await this.detectActivityAnomalies(userId, activityMetrics, behaviorPatterns);
      
      // Calculate health score
      const healthScore = this.calculateHealthScore(activityMetrics, engagementTrends, anomalies);
      
      // Determine status
      const status = this.determineActivityStatus(healthScore, anomalies);

      const monitoring: Omit<UserActivityMonitoring, 'id'> = {
        userId,
        monitoringPeriod,
        activityMetrics,
        behaviorPatterns,
        engagementTrends,
        anomalies,
        healthScore,
        status,
        lastUpdated: new Date(),
        metadata: {
          monitoringVersion: '1.0',
          calculationTimestamp: new Date()
        }
      };

      const result = await this.retentionRepo.createActivityMonitoring(monitoring);
      
      logger.info('User activity monitoring completed', { userId, healthScore, status });
      
      return result;
    } catch (error) {
      logger.error('Error monitoring user activity', { userId, error: error.message });
      throw error;
    }
  }

  // Get high-risk users for intervention
  async getHighRiskUsers(riskLevel: string = 'high', limit: number = 100): Promise<UserChurnRisk[]> {
    try {
      const highRiskUsers = await this.retentionRepo.getHighRiskUsers(riskLevel, limit);
      
      logger.info('Retrieved high-risk users', { 
        riskLevel, 
        count: highRiskUsers.length 
      });

      return highRiskUsers;
    } catch (error) {
      logger.error('Error getting high-risk users', { error: error.message });
      throw error;
    }
  }

  // Update churn risk for existing user
  async updateChurnRisk(userId: string): Promise<UserChurnRisk | null> {
    try {
      const newRisk = await this.calculateChurnRisk(userId);
      return newRisk;
    } catch (error) {
      logger.error('Error updating churn risk', { userId, error: error.message });
      throw error;
    }
  }

  // Private helper methods
  private async getUserActivityData(userId: string, lookbackDays: number): Promise<UserActivityData | null> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - lookbackDays * 24 * 60 * 60 * 1000);

      // Get user basic info
      const user = await this.userRepo.findByTelegramId(userId);
      if (!user) return null;

      // Get click events
      const clicks = await this.trafficRepo.getClicksByUser(userId, startDate, endDate);
      
      // Get conversion events
      const conversions = await this.trafficRepo.getConversionsByUser(userId, startDate, endDate);

      // Calculate metrics
      const totalSessions = this.calculateSessions(clicks);
      const totalClicks = clicks.length;
      const totalConversions = conversions.length;
      const totalRevenue = conversions.reduce((sum, conv) => sum + conv.orderValue, 0);
      const lastActivityDate = clicks.length > 0 ? 
        new Date(Math.max(...clicks.map(c => c.clickTime.getTime()))) : 
        user.createdAt;
      
      const daysSinceRegistration = Math.floor(
        (Date.now() - user.createdAt.getTime()) / (24 * 60 * 60 * 1000)
      );
      const daysSinceLastActivity = Math.floor(
        (Date.now() - lastActivityDate.getTime()) / (24 * 60 * 60 * 1000)
      );

      const averageSessionDuration = this.calculateAverageSessionDuration(clicks);
      const clickThroughRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
      const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
      const lifetimeValue = totalRevenue;
      const activityFrequency = totalSessions / Math.max(lookbackDays, 1);
      const engagementScore = this.calculateEngagementScore(
        totalSessions, totalClicks, totalConversions, daysSinceLastActivity
      );
      const recentTrend = this.calculateRecentTrend(clicks);

      return {
        userId,
        totalSessions,
        totalClicks,
        totalConversions,
        totalRevenue,
        lastActivityDate,
        averageSessionDuration,
        clickThroughRate,
        conversionRate,
        lifetimeValue,
        daysSinceRegistration,
        daysSinceLastActivity,
        activityFrequency,
        engagementScore,
        recentTrend
      };
    } catch (error) {
      logger.error('Error getting user activity data', { userId, error: error.message });
      return null;
    }
  }

  private async calculateRiskFactors(
    activityData: UserActivityData, 
    config: ChurnRiskCalculationConfig
  ): Promise<ChurnRiskFactor[]> {
    const factors: ChurnRiskFactor[] = [];

    // Days since last activity factor
    const inactivityScore = Math.min(activityData.daysSinceLastActivity / 30, 1) * 100;
    factors.push({
      factor: 'daysSinceLastActivity',
      weight: config.riskFactorWeights.daysSinceLastActivity,
      value: inactivityScore,
      impact: 'negative',
      description: `${activityData.daysSinceLastActivity} days since last activity`,
      category: 'temporal'
    });

    // Engagement trend factor
    const engagementTrendScore = this.calculateEngagementTrendScore(activityData.recentTrend);
    factors.push({
      factor: 'engagementTrend',
      weight: config.riskFactorWeights.engagementTrend,
      value: engagementTrendScore,
      impact: activityData.recentTrend === 'decreasing' || activityData.recentTrend === 'inactive' ? 'negative' : 'positive',
      description: `Engagement trend is ${activityData.recentTrend}`,
      category: 'behavioral'
    });

    // Conversion rate factor
    const conversionRateScore = Math.max(0, 100 - activityData.conversionRate * 10);
    factors.push({
      factor: 'conversionRate',
      weight: config.riskFactorWeights.conversionRate,
      value: conversionRateScore,
      impact: activityData.conversionRate < 2 ? 'negative' : 'positive',
      description: `Conversion rate: ${activityData.conversionRate.toFixed(2)}%`,
      category: 'transactional'
    });

    // Session frequency factor
    const sessionFrequencyScore = Math.max(0, 100 - activityData.activityFrequency * 20);
    factors.push({
      factor: 'sessionFrequency',
      weight: config.riskFactorWeights.sessionFrequency,
      value: sessionFrequencyScore,
      impact: activityData.activityFrequency < 1 ? 'negative' : 'positive',
      description: `Activity frequency: ${activityData.activityFrequency.toFixed(2)} sessions/day`,
      category: 'behavioral'
    });

    // Lifetime value factor
    const ltvScore = activityData.lifetimeValue < 1000 ? 
      Math.max(0, 100 - (activityData.lifetimeValue / 10)) : 0;
    factors.push({
      factor: 'lifetimeValue',
      weight: config.riskFactorWeights.lifetimeValue,
      value: ltvScore,
      impact: activityData.lifetimeValue < 1000 ? 'negative' : 'positive',
      description: `Lifetime value: ₹${activityData.lifetimeValue.toFixed(2)}`,
      category: 'transactional'
    });

    return factors;
  }

  private calculateOverallRiskScore(
    riskFactors: ChurnRiskFactor[], 
    config: ChurnRiskCalculationConfig
  ): number {
    let weightedScore = 0;
    let totalWeight = 0;

    for (const factor of riskFactors) {
      const weight = config.riskFactorWeights[factor.factor] || 0;
      weightedScore += factor.value * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;
  }

  private determineRiskLevel(score: number, thresholds: any): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= thresholds.critical) return 'critical';
    if (score >= thresholds.high) return 'high';
    if (score >= thresholds.medium) return 'medium';
    return 'low';
  }

  private predictChurnDate(activityData: UserActivityData, riskScore: number): Date | undefined {
    if (riskScore < 50) return undefined;

    // Simple prediction based on risk score and current activity pattern
    const daysToChurn = Math.max(1, Math.round((100 - riskScore) / 2));
    return new Date(Date.now() + daysToChurn * 24 * 60 * 60 * 1000);
  }

  private calculateConfidence(riskFactors: ChurnRiskFactor[], activityData: UserActivityData): number {
    // Base confidence on data quality and consistency
    let confidence = 70; // Base confidence

    // Increase confidence if we have more data points
    if (activityData.totalSessions > 10) confidence += 10;
    if (activityData.daysSinceRegistration > 30) confidence += 10;
    
    // Decrease confidence for edge cases
    if (activityData.totalSessions < 3) confidence -= 20;
    if (activityData.daysSinceRegistration < 7) confidence -= 15;

    // Factor in consistency of risk factors
    const factorVariance = this.calculateFactorVariance(riskFactors);
    if (factorVariance < 0.2) confidence += 10;
    if (factorVariance > 0.5) confidence -= 10;

    return Math.max(0, Math.min(100, confidence));
  }

  private generateInterventionRecommendations(
    riskFactors: ChurnRiskFactor[], 
    riskLevel: string, 
    activityData: UserActivityData
  ): InterventionRecommendation[] {
    const recommendations: InterventionRecommendation[] = [];

    // High inactivity - engagement campaign
    const inactivityFactor = riskFactors.find(f => f.factor === 'daysSinceLastActivity');
    if (inactivityFactor && inactivityFactor.value > 50) {
      recommendations.push({
        type: 'engagement_campaign',
        priority: riskLevel === 'critical' ? 'urgent' : 'high',
        description: 'Send personalized re-engagement campaign with exclusive offers',
        expectedImpact: 70,
        cost: 50,
        timeframe: '3-5 days',
        channels: ['telegram', 'email'],
        parameters: {
          campaignType: 'reengagement',
          offerType: 'discount',
          discountPercentage: riskLevel === 'critical' ? 20 : 15
        }
      });
    }

    // Low conversion rate - product recommendations
    const conversionFactor = riskFactors.find(f => f.factor === 'conversionRate');
    if (conversionFactor && conversionFactor.value > 60) {
      recommendations.push({
        type: 'product_recommendation',
        priority: 'medium',
        description: 'Send personalized product recommendations based on browsing history',
        expectedImpact: 50,
        cost: 25,
        timeframe: '1-2 days',
        channels: ['telegram'],
        parameters: {
          recommendationType: 'personalized',
          maxRecommendations: 5,
          includeDiscount: true
        }
      });
    }

    // High lifetime value but at risk - VIP treatment
    if (activityData.lifetimeValue > 5000 && riskLevel !== 'low') {
      recommendations.push({
        type: 'support_outreach',
        priority: 'high',
        description: 'Personal outreach from customer success team',
        expectedImpact: 80,
        cost: 100,
        timeframe: '1 day',
        channels: ['telegram'],
        parameters: {
          outreachType: 'personal',
          includeSpecialOffer: true,
          assignToVipTeam: true
        }
      });
    }

    // General discount offer for medium-high risk
    if (riskLevel === 'high' || riskLevel === 'medium') {
      recommendations.push({
        type: 'discount_offer',
        priority: riskLevel === 'high' ? 'high' : 'medium',
        description: 'Send targeted discount offer to encourage purchase',
        expectedImpact: 60,
        cost: 75,
        timeframe: '2-3 days',
        channels: ['telegram'],
        parameters: {
          discountType: 'percentage',
          discountValue: riskLevel === 'high' ? 15 : 10,
          validityDays: 7,
          minimumOrderValue: 500
        }
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  // Activity monitoring helper methods
  private async calculateActivityMetrics(userId: string, period: any): Promise<ActivityMetrics> {
    const startDate = period.startDate;
    const endDate = period.endDate;

    // Get activity data
    const clicks = await this.trafficRepo.getClicksByUser(userId, startDate, endDate);
    const conversions = await this.trafficRepo.getConversionsByUser(userId, startDate, endDate);

    const totalSessions = this.calculateSessions(clicks);
    const averageSessionDuration = this.calculateAverageSessionDuration(clicks);
    const totalClicks = clicks.length;
    const totalConversions = conversions.length;
    const totalRevenue = conversions.reduce((sum, conv) => sum + conv.orderValue, 0);

    // Calculate activity days
    const uniqueDays = new Set(clicks.map(c => c.clickTime.toDateString())).size;
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
    const daysActive = uniqueDays;
    const daysInactive = totalDays - daysActive;

    // Calculate streaks
    const longestInactiveStreak = this.calculateLongestInactiveStreak(clicks, startDate, endDate);
    
    // Calculate timing patterns
    const averageTimeBetweenSessions = this.calculateAverageTimeBetweenSessions(clicks);
    const peakActivityHour = this.calculatePeakActivityHour(clicks);

    // Get channel and device preferences
    const preferredChannels = this.getPreferredChannels(clicks);
    const deviceTypes = this.getDeviceTypeDistribution(clicks);
    const locationData = this.getLocationDistribution(clicks);

    return {
      totalSessions,
      averageSessionDuration,
      totalClicks,
      totalConversions,
      totalRevenue,
      daysActive,
      daysInactive,
      longestInactiveStreak,
      averageTimeBetweenSessions,
      peakActivityHour,
      preferredChannels,
      deviceTypes,
      locationData,
      customMetrics: {
        clicksPerSession: totalSessions > 0 ? totalClicks / totalSessions : 0,
        conversionRate: totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0,
        averageOrderValue: totalConversions > 0 ? totalRevenue / totalConversions : 0,
        activityConsistency: daysActive / totalDays
      }
    };
  }

  private async detectBehaviorPatterns(userId: string, period: any): Promise<BehaviorPattern[]> {
    // This would implement pattern detection algorithms
    // For now, returning mock patterns
    return [
      {
        patternType: 'session_frequency',
        pattern: 'evening_activity',
        frequency: 0.8,
        strength: 0.7,
        trend: 'stable',
        predictability: 0.85,
        lastObserved: new Date()
      }
    ];
  }

  private async calculateEngagementTrends(userId: string, period: any): Promise<EngagementTrend[]> {
    // This would calculate actual engagement trends
    // For now, returning mock trends
    return [
      {
        metric: 'daily_clicks',
        timeframe: 'daily',
        values: [],
        direction: 'stable',
        slope: 0.02,
        correlation: 0.65,
        significance: 0.8
      }
    ];
  }

  private async detectActivityAnomalies(
    userId: string, 
    metrics: ActivityMetrics, 
    patterns: BehaviorPattern[]
  ): Promise<ActivityAnomaly[]> {
    const anomalies: ActivityAnomaly[] = [];

    // Detect sudden activity drops
    if (metrics.longestInactiveStreak > 7) {
      anomalies.push({
        id: `anomaly_${Date.now()}_1`,
        type: 'sudden_drop',
        severity: metrics.longestInactiveStreak > 14 ? 'high' : 'medium',
        description: `Unusual inactivity streak of ${metrics.longestInactiveStreak} days`,
        detectedAt: new Date(),
        metric: 'activity_streak',
        expectedValue: 2,
        actualValue: metrics.longestInactiveStreak,
        deviation: metrics.longestInactiveStreak - 2,
        confidence: 0.8,
        possibleCauses: ['user_disengagement', 'technical_issues', 'external_factors'],
        impact: 'negative'
      });
    }

    return anomalies;
  }

  private calculateHealthScore(
    metrics: ActivityMetrics, 
    trends: EngagementTrend[], 
    anomalies: ActivityAnomaly[]
  ): number {
    let score = 100;

    // Penalize for inactivity
    if (metrics.daysInactive > metrics.daysActive) score -= 30;
    if (metrics.longestInactiveStreak > 7) score -= 20;

    // Penalize for low engagement
    if (metrics.customMetrics.conversionRate < 2) score -= 15;
    if (metrics.totalSessions < 5) score -= 10;

    // Penalize for anomalies
    anomalies.forEach(anomaly => {
      if (anomaly.severity === 'high') score -= 15;
      else if (anomaly.severity === 'medium') score -= 10;
      else score -= 5;
    });

    return Math.max(0, Math.min(100, score));
  }

  private determineActivityStatus(healthScore: number, anomalies: ActivityAnomaly[]): 'active' | 'at_risk' | 'churning' | 'churned' | 'reactivated' {
    const highSeverityAnomalies = anomalies.filter(a => a.severity === 'high').length;
    
    if (healthScore >= 80) return 'active';
    if (healthScore >= 60) return 'at_risk';
    if (healthScore >= 30 || highSeverityAnomalies > 0) return 'churning';
    return 'churned';
  }

  // Utility methods
  private calculateSessions(clicks: any[]): number {
    if (clicks.length === 0) return 0;
    
    // Group clicks by time gaps (30 minutes = new session)
    const sessionGap = 30 * 60 * 1000; // 30 minutes in milliseconds
    let sessions = 1;
    
    for (let i = 1; i < clicks.length; i++) {
      const timeDiff = clicks[i].clickTime.getTime() - clicks[i-1].clickTime.getTime();
      if (timeDiff > sessionGap) {
        sessions++;
      }
    }
    
    return sessions;
  }

  private calculateAverageSessionDuration(clicks: any[]): number {
    // Simplified calculation - in reality would need more sophisticated session tracking
    return clicks.length > 0 ? 180 : 0; // 3 minutes average
  }

  private calculateEngagementScore(sessions: number, clicks: number, conversions: number, daysSinceLastActivity: number): number {
    let score = 0;
    
    // Session score (0-30 points)
    score += Math.min(30, sessions * 2);
    
    // Click score (0-30 points)
    score += Math.min(30, clicks * 0.5);
    
    // Conversion score (0-25 points)
    score += Math.min(25, conversions * 5);
    
    // Recency score (0-15 points)
    score += Math.max(0, 15 - daysSinceLastActivity);
    
    return Math.min(100, score);
  }

  private calculateRecentTrend(clicks: any[]): 'increasing' | 'stable' | 'decreasing' | 'inactive' {
    if (clicks.length === 0) return 'inactive';
    if (clicks.length < 5) return 'stable';
    
    // Simple trend calculation based on recent vs older activity
    const now = Date.now();
    const recentClicks = clicks.filter(c => (now - c.clickTime.getTime()) < 7 * 24 * 60 * 60 * 1000).length;
    const olderClicks = clicks.filter(c => (now - c.clickTime.getTime()) >= 7 * 24 * 60 * 60 * 1000).length;
    
    const recentRate = recentClicks / 7;
    const olderRate = olderClicks / 23; // Remaining days
    
    if (recentRate > olderRate * 1.2) return 'increasing';
    if (recentRate < olderRate * 0.8) return 'decreasing';
    return 'stable';
  }

  private calculateEngagementTrendScore(trend: string): number {
    switch (trend) {
      case 'increasing': return 0;
      case 'stable': return 25;
      case 'decreasing': return 75;
      case 'inactive': return 100;
      default: return 50;
    }
  }

  private calculateFactorVariance(factors: ChurnRiskFactor[]): number {
    if (factors.length === 0) return 0;
    
    const values = factors.map(f => f.value);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    
    return Math.sqrt(variance) / 100; // Normalize to 0-1 range
  }

  private calculateLongestInactiveStreak(clicks: any[], startDate: Date, endDate: Date): number {
    if (clicks.length === 0) {
      return Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
    }

    // Sort clicks by date
    const sortedClicks = clicks.sort((a, b) => a.clickTime.getTime() - b.clickTime.getTime());
    
    let maxStreak = 0;
    let currentStreak = 0;
    let lastClickDate = startDate;

    for (const click of sortedClicks) {
      const daysDiff = Math.floor((click.clickTime.getTime() - lastClickDate.getTime()) / (24 * 60 * 60 * 1000));
      
      if (daysDiff > 1) {
        currentStreak = daysDiff - 1;
        maxStreak = Math.max(maxStreak, currentStreak);
      }
      
      lastClickDate = click.clickTime;
      currentStreak = 0;
    }

    // Check streak from last click to end date
    const finalStreak = Math.floor((endDate.getTime() - lastClickDate.getTime()) / (24 * 60 * 60 * 1000));
    maxStreak = Math.max(maxStreak, finalStreak);

    return maxStreak;
  }

  private calculateAverageTimeBetweenSessions(clicks: any[]): number {
    if (clicks.length < 2) return 0;
    
    // Simplified - would need proper session detection
    const totalTime = clicks[clicks.length - 1].clickTime.getTime() - clicks[0].clickTime.getTime();
    const sessions = this.calculateSessions(clicks);
    
    return sessions > 1 ? totalTime / (sessions - 1) / (60 * 60 * 1000) : 0; // Hours
  }

  private calculatePeakActivityHour(clicks: any[]): number {
    if (clicks.length === 0) return 12; // Default to noon
    
    const hourCounts = new Array(24).fill(0);
    clicks.forEach(click => {
      const hour = click.clickTime.getHours();
      hourCounts[hour]++;
    });
    
    return hourCounts.indexOf(Math.max(...hourCounts));
  }

  private getPreferredChannels(clicks: any[]): string[] {
    const channelCounts: Record<string, number> = {};
    clicks.forEach(click => {
      channelCounts[click.source] = (channelCounts[click.source] || 0) + 1;
    });
    
    return Object.entries(channelCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([channel]) => channel);
  }

  private getDeviceTypeDistribution(clicks: any[]): Record<string, number> {
    // Simplified - would parse user agent
    return { mobile: 70, desktop: 30 };
  }

  private getLocationDistribution(clicks: any[]): Record<string, number> {
    // Simplified - would use IP geolocation
    return { 'Mumbai': 40, 'Delhi': 30, 'Bangalore': 20, 'Other': 10 };
  }
}
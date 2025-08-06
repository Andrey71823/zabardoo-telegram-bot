import { BaseService } from '../base/BaseService';
import { AnalyticsRepository } from '../../repositories/AnalyticsRepository';
import { 
  ConversionFunnel,
  FunnelStep,
  FunnelAnalysis,
  FunnelStepAnalysis,
  DropoffPoint,
  UserEvent,
  EventType,
  UserAction
} from '../../models/Analytics';

export interface FunnelConfiguration {
  name: string;
  description?: string;
  steps: Array<{
    name: string;
    eventName: string;
    eventProperties?: Record<string, any>;
    isRequired: boolean;
  }>;
  timeWindow: number; // hours
  filters?: {
    userSegments?: string[];
    dateRange?: { from: Date; to: Date };
    properties?: Record<string, any>;
  };
}

export interface FunnelInsights {
  overallConversionRate: number;
  biggestDropoffStep: string;
  dropoffRate: number;
  averageTimeToConvert: number;
  topPerformingSegments: Array<{
    segment: string;
    conversionRate: number;
    userCount: number;
  }>;
  recommendations: string[];
}

export interface UserJourney {
  userId: string;
  events: UserEvent[];
  completedSteps: string[];
  dropoffStep?: string;
  conversionTime?: number;
  isConverted: boolean;
}

export class FunnelAnalysisService extends BaseService {
  private repository: AnalyticsRepository;

  constructor() {
    super();
    this.repository = new AnalyticsRepository();
  }

  // Create and manage funnels
  async createFunnel(config: FunnelConfiguration): Promise<ConversionFunnel> {
    try {
      const funnelId = this.generateFunnelId();
      
      const steps: FunnelStep[] = config.steps.map((step, index) => ({
        id: `step_${index + 1}`,
        name: step.name,
        eventName: step.eventName,
        eventProperties: step.eventProperties,
        order: index + 1,
        isRequired: step.isRequired
      }));

      const funnel: ConversionFunnel = {
        id: funnelId,
        name: config.name,
        description: config.description,
        steps,
        timeWindow: config.timeWindow,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.repository.createFunnel(funnel);
      
      this.logger.info('Funnel created', { 
        funnelId, 
        name: config.name,
        stepsCount: steps.length 
      });

      return funnel;
    } catch (error) {
      this.logger.error('Failed to create funnel', { error: error.message });
      throw error;
    }
  }

  // Analyze funnel performance
  async analyzeFunnel(
    funnelId: string,
    dateRange: { from: Date; to: Date },
    options?: {
      segmentBy?: string;
      includeDropoffAnalysis?: boolean;
      includeTimeAnalysis?: boolean;
    }
  ): Promise<FunnelAnalysis> {
    try {
      const funnel = await this.repository.getFunnelById(funnelId);
      if (!funnel) {
        throw new Error('Funnel not found');
      }

      this.logger.info('Starting funnel analysis', { 
        funnelId, 
        dateRange,
        stepsCount: funnel.steps.length 
      });

      // Get user journeys for the funnel
      const userJourneys = await this.getUserJourneys(funnel, dateRange);
      
      // Calculate step analysis
      const stepAnalyses = await this.calculateStepAnalyses(funnel, userJourneys);
      
      // Calculate dropoff points
      const dropoffPoints = options?.includeDropoffAnalysis 
        ? await this.calculateDropoffPoints(funnel, userJourneys)
        : [];

      // Calculate overall metrics
      const totalUsers = userJourneys.length;
      const convertedUsers = userJourneys.filter(j => j.isConverted).length;
      const conversionRate = totalUsers > 0 ? convertedUsers / totalUsers : 0;

      const analysis: FunnelAnalysis = {
        funnelId,
        dateRange,
        totalUsers,
        steps: stepAnalyses,
        conversionRate,
        dropoffPoints
      };

      this.logger.info('Funnel analysis completed', {
        funnelId,
        totalUsers,
        conversionRate: (conversionRate * 100).toFixed(2) + '%'
      });

      return analysis;
    } catch (error) {
      this.logger.error('Failed to analyze funnel', { funnelId, error: error.message });
      throw error;
    }
  }

  // Get funnel insights and recommendations
  async getFunnelInsights(funnelId: string, dateRange: { from: Date; to: Date }): Promise<FunnelInsights> {
    try {
      const analysis = await this.analyzeFunnel(funnelId, dateRange, {
        includeDropoffAnalysis: true,
        includeTimeAnalysis: true
      });

      const insights: FunnelInsights = {
        overallConversionRate: analysis.conversionRate,
        biggestDropoffStep: this.findBiggestDropoffStep(analysis.steps),
        dropoffRate: this.calculateOverallDropoffRate(analysis.steps),
        averageTimeToConvert: this.calculateAverageConversionTime(analysis.steps),
        topPerformingSegments: await this.getTopPerformingSegments(funnelId, dateRange),
        recommendations: this.generateRecommendations(analysis)
      };

      return insights;
    } catch (error) {
      this.logger.error('Failed to get funnel insights', { funnelId, error: error.message });
      throw error;
    }
  }

  // Compare funnel performance across time periods
  async compareFunnelPerformance(
    funnelId: string,
    currentPeriod: { from: Date; to: Date },
    previousPeriod: { from: Date; to: Date }
  ): Promise<{
    current: FunnelAnalysis;
    previous: FunnelAnalysis;
    changes: Array<{
      step: string;
      conversionRateChange: number;
      userCountChange: number;
      trend: 'improved' | 'declined' | 'stable';
    }>;
  }> {
    try {
      const [currentAnalysis, previousAnalysis] = await Promise.all([
        this.analyzeFunnel(funnelId, currentPeriod),
        this.analyzeFunnel(funnelId, previousPeriod)
      ]);

      const changes = currentAnalysis.steps.map((currentStep, index) => {
        const previousStep = previousAnalysis.steps[index];
        const conversionRateChange = currentStep.conversionRate - previousStep.conversionRate;
        const userCountChange = currentStep.usersEntered - previousStep.usersEntered;
        
        let trend: 'improved' | 'declined' | 'stable' = 'stable';
        if (Math.abs(conversionRateChange) > 0.01) { // 1% threshold
          trend = conversionRateChange > 0 ? 'improved' : 'declined';
        }

        return {
          step: currentStep.stepName,
          conversionRateChange,
          userCountChange,
          trend
        };
      });

      return {
        current: currentAnalysis,
        previous: previousAnalysis,
        changes
      };
    } catch (error) {
      this.logger.error('Failed to compare funnel performance', { funnelId, error: error.message });
      throw error;
    }
  }

  // Segment funnel analysis by user properties
  async segmentFunnelAnalysis(
    funnelId: string,
    dateRange: { from: Date; to: Date },
    segmentBy: string
  ): Promise<Array<{
    segment: string;
    analysis: FunnelAnalysis;
    userCount: number;
  }>> {
    try {
      const funnel = await this.repository.getFunnelById(funnelId);
      if (!funnel) {
        throw new Error('Funnel not found');
      }

      // Get all user journeys
      const allJourneys = await this.getUserJourneys(funnel, dateRange);
      
      // Group by segment
      const segmentGroups = this.groupJourneysBySegment(allJourneys, segmentBy);
      
      const segmentAnalyses = [];
      
      for (const [segment, journeys] of segmentGroups.entries()) {
        const stepAnalyses = await this.calculateStepAnalyses(funnel, journeys);
        const dropoffPoints = await this.calculateDropoffPoints(funnel, journeys);
        
        const totalUsers = journeys.length;
        const convertedUsers = journeys.filter(j => j.isConverted).length;
        const conversionRate = totalUsers > 0 ? convertedUsers / totalUsers : 0;

        const analysis: FunnelAnalysis = {
          funnelId,
          dateRange,
          totalUsers,
          steps: stepAnalyses,
          conversionRate,
          dropoffPoints
        };

        segmentAnalyses.push({
          segment,
          analysis,
          userCount: totalUsers
        });
      }

      // Sort by conversion rate
      segmentAnalyses.sort((a, b) => b.analysis.conversionRate - a.analysis.conversionRate);

      return segmentAnalyses;
    } catch (error) {
      this.logger.error('Failed to segment funnel analysis', { funnelId, error: error.message });
      throw error;
    }
  }

  // A/B test funnel variations
  async compareFunnelVariations(
    baselineFunnelId: string,
    variationFunnelId: string,
    dateRange: { from: Date; to: Date }
  ): Promise<{
    baseline: FunnelAnalysis;
    variation: FunnelAnalysis;
    statisticalSignificance: boolean;
    winner: 'baseline' | 'variation' | 'inconclusive';
    confidenceLevel: number;
  }> {
    try {
      const [baselineAnalysis, variationAnalysis] = await Promise.all([
        this.analyzeFunnel(baselineFunnelId, dateRange),
        this.analyzeFunnel(variationFunnelId, dateRange)
      ]);

      // Calculate statistical significance
      const { isSignificant, confidenceLevel } = this.calculateStatisticalSignificance(
        baselineAnalysis,
        variationAnalysis
      );

      let winner: 'baseline' | 'variation' | 'inconclusive' = 'inconclusive';
      if (isSignificant) {
        winner = variationAnalysis.conversionRate > baselineAnalysis.conversionRate 
          ? 'variation' 
          : 'baseline';
      }

      return {
        baseline: baselineAnalysis,
        variation: variationAnalysis,
        statisticalSignificance: isSignificant,
        winner,
        confidenceLevel
      };
    } catch (error) {
      this.logger.error('Failed to compare funnel variations', { error: error.message });
      throw error;
    }
  }

  // Private helper methods
  private async getUserJourneys(
    funnel: ConversionFunnel,
    dateRange: { from: Date; to: Date }
  ): Promise<UserJourney[]> {
    try {
      // Get all events for the funnel steps within the date range
      const stepEventNames = funnel.steps.map(step => step.eventName);
      
      // This is a simplified implementation - in reality, you'd need complex queries
      // to properly track user journeys through the funnel
      const events = await this.repository.getEventsByDateRange(dateRange, {
        eventNames: stepEventNames
      });

      // Group events by user
      const userEventGroups = new Map<string, UserEvent[]>();
      events.forEach(event => {
        if (!userEventGroups.has(event.userId)) {
          userEventGroups.set(event.userId, []);
        }
        userEventGroups.get(event.userId)!.push(event);
      });

      // Build user journeys
      const journeys: UserJourney[] = [];
      
      for (const [userId, userEvents] of userEventGroups.entries()) {
        // Sort events by timestamp
        userEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        
        const journey = this.buildUserJourney(userId, userEvents, funnel);
        journeys.push(journey);
      }

      return journeys;
    } catch (error) {
      this.logger.error('Failed to get user journeys', { error: error.message });
      throw error;
    }
  }

  private buildUserJourney(userId: string, events: UserEvent[], funnel: ConversionFunnel): UserJourney {
    const completedSteps: string[] = [];
    let dropoffStep: string | undefined;
    let conversionTime: number | undefined;
    let isConverted = false;

    const firstEventTime = events[0]?.timestamp.getTime();
    
    // Check each funnel step
    for (const step of funnel.steps) {
      const stepEvent = events.find(event => 
        event.eventName === step.eventName &&
        this.matchesEventProperties(event, step.eventProperties)
      );

      if (stepEvent) {
        completedSteps.push(step.id);
        
        // If this is the last step, user converted
        if (step.order === funnel.steps.length) {
          isConverted = true;
          conversionTime = stepEvent.timestamp.getTime() - firstEventTime;
        }
      } else {
        // User dropped off at this step
        dropoffStep = step.id;
        break;
      }
    }

    return {
      userId,
      events,
      completedSteps,
      dropoffStep,
      conversionTime,
      isConverted
    };
  }

  private async calculateStepAnalyses(
    funnel: ConversionFunnel,
    journeys: UserJourney[]
  ): Promise<FunnelStepAnalysis[]> {
    const stepAnalyses: FunnelStepAnalysis[] = [];
    
    let previousStepUsers = journeys.length;

    for (const step of funnel.steps) {
      const usersWhoCompletedStep = journeys.filter(j => 
        j.completedSteps.includes(step.id)
      ).length;

      const conversionRate = previousStepUsers > 0 ? usersWhoCompletedStep / previousStepUsers : 0;
      const dropoffRate = 1 - conversionRate;

      // Calculate average time to complete this step
      const completionTimes = journeys
        .filter(j => j.completedSteps.includes(step.id))
        .map(j => {
          const stepEvent = j.events.find(e => e.eventName === step.eventName);
          const firstEvent = j.events[0];
          return stepEvent && firstEvent 
            ? stepEvent.timestamp.getTime() - firstEvent.timestamp.getTime()
            : 0;
        })
        .filter(time => time > 0);

      const averageTimeToComplete = completionTimes.length > 0
        ? completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length
        : 0;

      stepAnalyses.push({
        stepId: step.id,
        stepName: step.name,
        usersEntered: previousStepUsers,
        usersCompleted: usersWhoCompletedStep,
        conversionRate,
        averageTimeToComplete,
        dropoffRate
      });

      previousStepUsers = usersWhoCompletedStep;
    }

    return stepAnalyses;
  }

  private async calculateDropoffPoints(
    funnel: ConversionFunnel,
    journeys: UserJourney[]
  ): Promise<DropoffPoint[]> {
    const dropoffPoints: DropoffPoint[] = [];

    for (let i = 0; i < funnel.steps.length - 1; i++) {
      const currentStep = funnel.steps[i];
      const nextStep = funnel.steps[i + 1];

      const usersInCurrentStep = journeys.filter(j => 
        j.completedSteps.includes(currentStep.id)
      ).length;

      const usersInNextStep = journeys.filter(j => 
        j.completedSteps.includes(nextStep.id)
      ).length;

      const dropoffCount = usersInCurrentStep - usersInNextStep;
      const dropoffRate = usersInCurrentStep > 0 ? dropoffCount / usersInCurrentStep : 0;

      if (dropoffCount > 0) {
        dropoffPoints.push({
          fromStep: currentStep.name,
          toStep: nextStep.name,
          dropoffCount,
          dropoffRate,
          reasons: await this.analyzeDropoffReasons(currentStep, nextStep, journeys)
        });
      }
    }

    return dropoffPoints.sort((a, b) => b.dropoffRate - a.dropoffRate);
  }

  private async analyzeDropoffReasons(
    fromStep: FunnelStep,
    toStep: FunnelStep,
    journeys: UserJourney[]
  ): Promise<string[]> {
    // Analyze common patterns in users who dropped off between these steps
    const droppedOffJourneys = journeys.filter(j => 
      j.completedSteps.includes(fromStep.id) && 
      !j.completedSteps.includes(toStep.id)
    );

    const reasons: string[] = [];

    // Analyze time gaps
    const timeGaps = droppedOffJourneys.map(j => {
      const fromEvent = j.events.find(e => e.eventName === fromStep.eventName);
      const lastEvent = j.events[j.events.length - 1];
      return fromEvent && lastEvent 
        ? lastEvent.timestamp.getTime() - fromEvent.timestamp.getTime()
        : 0;
    }).filter(gap => gap > 0);

    if (timeGaps.length > 0) {
      const avgTimeGap = timeGaps.reduce((sum, gap) => sum + gap, 0) / timeGaps.length;
      if (avgTimeGap > 300000) { // 5 minutes
        reasons.push('Long time gap between steps suggests user confusion or technical issues');
      }
    }

    // Analyze error events
    const errorEvents = droppedOffJourneys.flatMap(j => 
      j.events.filter(e => e.eventType === EventType.ERROR_EVENT)
    );

    if (errorEvents.length > 0) {
      reasons.push('Technical errors occurred during the step transition');
    }

    // Add more sophisticated analysis here
    if (reasons.length === 0) {
      reasons.push('Users may need additional guidance or motivation to proceed');
    }

    return reasons;
  }

  private findBiggestDropoffStep(steps: FunnelStepAnalysis[]): string {
    let biggestDropoff = steps[0];
    
    for (const step of steps) {
      if (step.dropoffRate > biggestDropoff.dropoffRate) {
        biggestDropoff = step;
      }
    }

    return biggestDropoff.stepName;
  }

  private calculateOverallDropoffRate(steps: FunnelStepAnalysis[]): number {
    if (steps.length === 0) return 0;
    
    const firstStep = steps[0];
    const lastStep = steps[steps.length - 1];
    
    return firstStep.usersEntered > 0 
      ? 1 - (lastStep.usersCompleted / firstStep.usersEntered)
      : 0;
  }

  private calculateAverageConversionTime(steps: FunnelStepAnalysis[]): number {
    const totalTime = steps.reduce((sum, step) => sum + step.averageTimeToComplete, 0);
    return steps.length > 0 ? totalTime / steps.length : 0;
  }

  private async getTopPerformingSegments(
    funnelId: string,
    dateRange: { from: Date; to: Date }
  ): Promise<Array<{ segment: string; conversionRate: number; userCount: number }>> {
    // Mock implementation - would analyze actual user segments
    return [
      { segment: 'Premium Users', conversionRate: 0.25, userCount: 150 },
      { segment: 'Mobile Users', conversionRate: 0.18, userCount: 800 },
      { segment: 'Returning Users', conversionRate: 0.22, userCount: 300 }
    ];
  }

  private generateRecommendations(analysis: FunnelAnalysis): string[] {
    const recommendations: string[] = [];

    // Analyze conversion rates
    const lowPerformingSteps = analysis.steps.filter(step => step.conversionRate < 0.5);
    
    if (lowPerformingSteps.length > 0) {
      recommendations.push(
        `Focus on improving steps with low conversion rates: ${lowPerformingSteps.map(s => s.stepName).join(', ')}`
      );
    }

    // Analyze dropoff points
    if (analysis.dropoffPoints.length > 0) {
      const biggestDropoff = analysis.dropoffPoints[0];
      recommendations.push(
        `Address the biggest dropoff point between "${biggestDropoff.fromStep}" and "${biggestDropoff.toStep}" (${(biggestDropoff.dropoffRate * 100).toFixed(1)}% dropoff)`
      );
    }

    // Overall conversion rate
    if (analysis.conversionRate < 0.1) {
      recommendations.push('Overall conversion rate is low - consider simplifying the funnel or improving user experience');
    }

    return recommendations;
  }

  private groupJourneysBySegment(
    journeys: UserJourney[],
    segmentBy: string
  ): Map<string, UserJourney[]> {
    const groups = new Map<string, UserJourney[]>();

    journeys.forEach(journey => {
      // Extract segment value from user events or properties
      const segmentValue = this.extractSegmentValue(journey, segmentBy);
      
      if (!groups.has(segmentValue)) {
        groups.set(segmentValue, []);
      }
      groups.get(segmentValue)!.push(journey);
    });

    return groups;
  }

  private extractSegmentValue(journey: UserJourney, segmentBy: string): string {
    // Extract segment value from journey data
    // This is a simplified implementation
    const firstEvent = journey.events[0];
    
    switch (segmentBy) {
      case 'platform':
        return firstEvent?.context?.platform || 'unknown';
      case 'source':
        return firstEvent?.context?.source || 'unknown';
      case 'device':
        return firstEvent?.context?.device?.type || 'unknown';
      default:
        return firstEvent?.properties?.[segmentBy] || 'unknown';
    }
  }

  private calculateStatisticalSignificance(
    baseline: FunnelAnalysis,
    variation: FunnelAnalysis
  ): { isSignificant: boolean; confidenceLevel: number } {
    // Simplified statistical significance calculation
    // In production, you'd use proper statistical tests like Chi-square or Z-test
    
    const baselineRate = baseline.conversionRate;
    const variationRate = variation.conversionRate;
    const baselineUsers = baseline.totalUsers;
    const variationUsers = variation.totalUsers;

    // Calculate standard error
    const se1 = Math.sqrt((baselineRate * (1 - baselineRate)) / baselineUsers);
    const se2 = Math.sqrt((variationRate * (1 - variationRate)) / variationUsers);
    const se = Math.sqrt(se1 * se1 + se2 * se2);

    // Calculate Z-score
    const zScore = Math.abs(variationRate - baselineRate) / se;
    
    // Determine significance (simplified)
    const isSignificant = zScore > 1.96; // 95% confidence level
    const confidenceLevel = isSignificant ? 0.95 : 0.8;

    return { isSignificant, confidenceLevel };
  }

  private matchesEventProperties(event: UserEvent, properties?: Record<string, any>): boolean {
    if (!properties) return true;

    for (const [key, value] of Object.entries(properties)) {
      if (event.properties[key] !== value) {
        return false;
      }
    }

    return true;
  }

  private generateFunnelId(): string {
    return `funnel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
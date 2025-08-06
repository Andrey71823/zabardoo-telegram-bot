export interface UserChurnRisk {
  id: string;
  userId: string;
  churnRiskScore: number; // 0-100, где 100 = высокий риск оттока
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: ChurnRiskFactor[];
  predictedChurnDate?: Date;
  confidence: number; // 0-100
  lastActivityDate: Date;
  daysSinceLastActivity: number;
  activityTrend: 'increasing' | 'stable' | 'decreasing' | 'inactive';
  engagementScore: number; // 0-100
  lifetimeValue: number;
  segmentId?: string;
  interventionRecommendations: InterventionRecommendation[];
  calculatedAt: Date;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChurnRiskFactor {
  factor: string;
  weight: number; // 0-1
  value: number;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
  category: 'behavioral' | 'transactional' | 'engagement' | 'temporal' | 'demographic';
}

export interface InterventionRecommendation {
  type: 'discount_offer' | 'personalized_content' | 'engagement_campaign' | 'support_outreach' | 'product_recommendation';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  description: string;
  expectedImpact: number; // 0-100
  cost: number;
  timeframe: string;
  channels: string[];
  parameters: Record<string, any>;
}

export interface UserActivityMonitoring {
  id: string;
  userId: string;
  monitoringPeriod: DateRange;
  activityMetrics: ActivityMetrics;
  behaviorPatterns: BehaviorPattern[];
  engagementTrends: EngagementTrend[];
  anomalies: ActivityAnomaly[];
  healthScore: number; // 0-100
  status: 'active' | 'at_risk' | 'churning' | 'churned' | 'reactivated';
  lastUpdated: Date;
  metadata: Record<string, any>;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
  preset?: 'last_7_days' | 'last_30_days' | 'last_90_days' | 'custom';
}

export interface ActivityMetrics {
  totalSessions: number;
  averageSessionDuration: number;
  totalClicks: number;
  totalConversions: number;
  totalRevenue: number;
  daysActive: number;
  daysInactive: number;
  longestInactiveStreak: number;
  averageTimeBetweenSessions: number;
  peakActivityHour: number;
  preferredChannels: string[];
  deviceTypes: Record<string, number>;
  locationData: Record<string, number>;
  customMetrics: Record<string, number>;
}

export interface BehaviorPattern {
  patternType: 'session_frequency' | 'purchase_timing' | 'content_preference' | 'channel_usage' | 'seasonal';
  pattern: string;
  frequency: number;
  strength: number; // 0-1
  trend: 'increasing' | 'stable' | 'decreasing';
  seasonality?: SeasonalityInfo;
  predictability: number; // 0-1
  lastObserved: Date;
}

export interface SeasonalityInfo {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  peaks: number[];
  valleys: number[];
  amplitude: number;
}

export interface EngagementTrend {
  metric: string;
  timeframe: 'daily' | 'weekly' | 'monthly';
  values: TrendDataPoint[];
  direction: 'up' | 'down' | 'stable' | 'volatile';
  slope: number;
  correlation: number; // -1 to 1
  significance: number; // 0-1
}

export interface TrendDataPoint {
  date: Date;
  value: number;
  change?: number;
  changePercent?: number;
}

export interface ActivityAnomaly {
  id: string;
  type: 'sudden_drop' | 'unusual_spike' | 'pattern_break' | 'time_shift' | 'channel_switch';
  severity: 'low' | 'medium' | 'high';
  description: string;
  detectedAt: Date;
  metric: string;
  expectedValue: number;
  actualValue: number;
  deviation: number;
  confidence: number; // 0-1
  possibleCauses: string[];
  impact: 'positive' | 'negative' | 'neutral';
}

export interface RetentionCampaign {
  id: string;
  name: string;
  description: string;
  campaignType: 'proactive' | 'reactive' | 'win_back' | 'onboarding' | 'loyalty';
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  targetSegment: CampaignSegment;
  triggers: CampaignTrigger[];
  actions: CampaignAction[];
  schedule: CampaignSchedule;
  budget: CampaignBudget;
  performance: CampaignPerformance;
  abTestConfig?: ABTestConfig;
  startDate: Date;
  endDate?: Date;
  createdBy: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignSegment {
  segmentType: 'churn_risk' | 'activity_level' | 'value_tier' | 'behavior_pattern' | 'custom';
  criteria: SegmentCriteria[];
  estimatedSize: number;
  refreshFrequency: 'real_time' | 'hourly' | 'daily' | 'weekly';
}

export interface SegmentCriteria {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'contains' | 'between';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface CampaignTrigger {
  triggerType: 'time_based' | 'event_based' | 'behavior_based' | 'score_based';
  conditions: TriggerCondition[];
  frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'on_condition';
  cooldownPeriod?: number; // hours
}

export interface TriggerCondition {
  field: string;
  operator: string;
  value: any;
  timeWindow?: number; // minutes
}

export interface CampaignAction {
  actionType: 'send_message' | 'send_offer' | 'assign_tag' | 'update_segment' | 'trigger_webhook' | 'schedule_followup';
  parameters: ActionParameters;
  delay?: number; // minutes
  conditions?: ActionCondition[];
}

export interface ActionParameters {
  channel?: 'telegram' | 'email' | 'push' | 'sms';
  template?: string;
  content?: string;
  offerDetails?: OfferDetails;
  webhookUrl?: string;
  customData?: Record<string, any>;
}

export interface OfferDetails {
  offerType: 'discount' | 'cashback' | 'free_shipping' | 'bonus_points' | 'exclusive_access';
  value: number;
  currency?: string;
  validUntil?: Date;
  conditions?: string[];
  redemptionLimit?: number;
}

export interface ActionCondition {
  field: string;
  operator: string;
  value: any;
}

export interface CampaignSchedule {
  scheduleType: 'immediate' | 'scheduled' | 'recurring';
  startTime?: Date;
  endTime?: Date;
  timezone: string;
  recurrence?: RecurrencePattern;
  blackoutPeriods?: DateRange[];
}

export interface RecurrencePattern {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
  daysOfWeek?: number[];
  daysOfMonth?: number[];
  endAfter?: number; // occurrences
  endDate?: Date;
}

export interface CampaignBudget {
  totalBudget: number;
  currency: string;
  spentAmount: number;
  costPerAction: number;
  budgetAllocation: BudgetAllocation[];
  alertThresholds: number[];
}

export interface BudgetAllocation {
  category: string;
  allocatedAmount: number;
  spentAmount: number;
  percentage: number;
}

export interface CampaignPerformance {
  targetUsers: number;
  reachedUsers: number;
  engagedUsers: number;
  convertedUsers: number;
  reachRate: number;
  engagementRate: number;
  conversionRate: number;
  costPerEngagement: number;
  costPerConversion: number;
  roi: number;
  retentionImpact: number;
  churnReduction: number;
  revenueImpact: number;
  metrics: Record<string, number>;
  lastUpdated: Date;
}

export interface ABTestConfig {
  testName: string;
  variants: CampaignVariant[];
  trafficSplit: number[];
  successMetric: string;
  minimumSampleSize: number;
  significanceLevel: number;
  testDuration: number; // days
}

export interface CampaignVariant {
  id: string;
  name: string;
  description: string;
  actions: CampaignAction[];
  performance: VariantPerformance;
}

export interface VariantPerformance {
  users: number;
  engagements: number;
  conversions: number;
  revenue: number;
  engagementRate: number;
  conversionRate: number;
  averageRevenue: number;
}

export interface UserLifecycleStage {
  id: string;
  userId: string;
  currentStage: 'new' | 'onboarding' | 'active' | 'engaged' | 'at_risk' | 'churning' | 'churned' | 'won_back';
  previousStage?: string;
  stageEntryDate: Date;
  daysinStage: number;
  stageHistory: StageTransition[];
  nextPredictedStage?: string;
  stageTransitionProbability: Record<string, number>;
  stageMetrics: StageMetrics;
  interventions: StageIntervention[];
  calculatedAt: Date;
  metadata: Record<string, any>;
}

export interface StageTransition {
  fromStage: string;
  toStage: string;
  transitionDate: Date;
  trigger: string;
  reason?: string;
  duration: number; // days in previous stage
}

export interface StageMetrics {
  averageDuration: number; // days
  conversionRate: number;
  retentionRate: number;
  revenuePerUser: number;
  engagementScore: number;
  satisfactionScore?: number;
  customMetrics: Record<string, number>;
}

export interface StageIntervention {
  interventionType: string;
  appliedAt: Date;
  effectiveness: number; // 0-1
  cost: number;
  outcome: 'successful' | 'failed' | 'pending';
}

export interface RetentionCohort {
  id: string;
  name: string;
  description: string;
  cohortDefinition: CohortDefinition;
  cohortSize: number;
  creationDate: Date;
  analysisDate: Date;
  retentionRates: RetentionRate[];
  churnRates: ChurnRate[];
  revenueMetrics: CohortRevenueMetrics;
  behaviorInsights: BehaviorInsight[];
  comparisonCohorts?: string[];
  metadata: Record<string, any>;
}

export interface CohortDefinition {
  definitionType: 'acquisition_date' | 'first_purchase' | 'signup_source' | 'user_attribute' | 'custom';
  criteria: Record<string, any>;
  timeframe: DateRange;
}

export interface RetentionRate {
  period: number; // days/weeks/months since cohort creation
  periodType: 'day' | 'week' | 'month';
  activeUsers: number;
  retentionRate: number;
  cumulativeRetention: number;
}

export interface ChurnRate {
  period: number;
  periodType: 'day' | 'week' | 'month';
  churnedUsers: number;
  churnRate: number;
  cumulativeChurn: number;
  churnReasons: Record<string, number>;
}

export interface CohortRevenueMetrics {
  totalRevenue: number;
  averageRevenuePerUser: number;
  lifetimeValue: number;
  revenueRetention: number;
  monthlyRecurringRevenue?: number;
  revenueByPeriod: RevenueByPeriod[];
}

export interface RevenueByPeriod {
  period: number;
  periodType: 'day' | 'week' | 'month';
  revenue: number;
  averageRevenuePerUser: number;
  payingUsers: number;
  conversionRate: number;
}

export interface BehaviorInsight {
  insightType: 'retention_driver' | 'churn_indicator' | 'engagement_pattern' | 'revenue_opportunity';
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number; // 0-1
  affectedUsers: number;
  recommendedActions: string[];
  evidence: InsightEvidence[];
}

export interface InsightEvidence {
  metric: string;
  value: number;
  benchmark: number;
  significance: number;
  correlation: number;
}

export interface WinBackCampaign {
  id: string;
  name: string;
  description: string;
  targetSegment: 'recently_churned' | 'long_term_churned' | 'high_value_churned' | 'custom';
  churnTimeframe: DateRange;
  winBackStrategy: WinBackStrategy;
  offers: WinBackOffer[];
  touchpoints: WinBackTouchpoint[];
  performance: WinBackPerformance;
  budget: number;
  status: 'draft' | 'active' | 'paused' | 'completed';
  startDate: Date;
  endDate?: Date;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface WinBackStrategy {
  strategyType: 'aggressive_discount' | 'personalized_offer' | 'content_engagement' | 'social_proof' | 'multi_touch';
  phases: WinBackPhase[];
  escalationRules: EscalationRule[];
  successCriteria: SuccessCriteria;
}

export interface WinBackPhase {
  phaseNumber: number;
  name: string;
  duration: number; // days
  actions: CampaignAction[];
  successThreshold: number;
  failureAction: 'escalate' | 'end' | 'repeat';
}

export interface EscalationRule {
  condition: string;
  action: 'increase_offer' | 'change_channel' | 'personal_outreach' | 'end_campaign';
  parameters: Record<string, any>;
}

export interface SuccessCriteria {
  primaryMetric: 'reactivation_rate' | 'revenue_recovery' | 'engagement_restoration';
  targetValue: number;
  timeframe: number; // days
  minimumSampleSize: number;
}

export interface WinBackOffer {
  offerType: 'percentage_discount' | 'fixed_discount' | 'cashback' | 'free_product' | 'exclusive_access';
  value: number;
  currency?: string;
  description: string;
  validityPeriod: number; // days
  usageLimit: number;
  conditions: string[];
  personalizedElements: PersonalizationElement[];
}

export interface PersonalizationElement {
  elementType: 'product_recommendation' | 'discount_amount' | 'message_content' | 'timing' | 'channel';
  personalizationLogic: string;
  fallbackValue: any;
}

export interface WinBackTouchpoint {
  touchpointType: 'email' | 'telegram' | 'push_notification' | 'sms' | 'retargeting_ad';
  timing: number; // days from campaign start
  content: TouchpointContent;
  personalization: PersonalizationElement[];
  abTestVariants?: TouchpointVariant[];
}

export interface TouchpointContent {
  subject?: string;
  headline: string;
  body: string;
  callToAction: string;
  visualElements?: VisualElement[];
  attachments?: string[];
}

export interface VisualElement {
  type: 'image' | 'video' | 'gif' | 'infographic';
  url: string;
  altText?: string;
  placement: string;
}

export interface TouchpointVariant {
  variantId: string;
  name: string;
  content: TouchpointContent;
  trafficAllocation: number;
  performance: TouchpointPerformance;
}

export interface TouchpointPerformance {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  converted: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  conversionRate: number;
}

export interface WinBackPerformance {
  targetUsers: number;
  contactedUsers: number;
  reactivatedUsers: number;
  reactivationRate: number;
  revenueRecovered: number;
  averageRevenuePerReactivation: number;
  costPerReactivation: number;
  roi: number;
  touchpointPerformance: Record<string, TouchpointPerformance>;
  phasePerformance: Record<string, PhasePerformance>;
  timeToReactivation: number; // average days
}

export interface PhasePerformance {
  usersEntered: number;
  usersSucceeded: number;
  usersEscalated: number;
  usersExited: number;
  successRate: number;
  averageDuration: number;
  cost: number;
}

export interface RetentionAlert {
  id: string;
  alertType: 'churn_spike' | 'engagement_drop' | 'cohort_underperformance' | 'campaign_failure' | 'anomaly_detected';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  affectedUsers: number;
  metric: string;
  currentValue: number;
  thresholdValue: number;
  deviation: number;
  detectedAt: Date;
  status: 'new' | 'acknowledged' | 'investigating' | 'resolved' | 'false_positive';
  assignedTo?: string;
  resolution?: AlertResolution;
  relatedCampaigns: string[];
  recommendedActions: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface AlertResolution {
  resolvedAt: Date;
  resolvedBy: string;
  resolution: string;
  actionsTaken: string[];
  preventiveMeasures: string[];
  impact: ResolutionImpact;
}

export interface ResolutionImpact {
  usersAffected: number;
  revenueImpact: number;
  retentionImprovement: number;
  timeToResolve: number; // hours
  cost: number;
}

export interface PredictiveModel {
  id: string;
  modelName: string;
  modelType: 'churn_prediction' | 'ltv_prediction' | 'engagement_prediction' | 'conversion_prediction';
  algorithm: 'logistic_regression' | 'random_forest' | 'gradient_boosting' | 'neural_network' | 'ensemble';
  version: string;
  trainingData: TrainingDataInfo;
  features: ModelFeature[];
  performance: ModelPerformance;
  deploymentStatus: 'training' | 'testing' | 'deployed' | 'deprecated';
  lastTrainedAt: Date;
  nextRetrainingDate: Date;
  predictionThresholds: PredictionThreshold[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrainingDataInfo {
  datasetSize: number;
  trainingPeriod: DateRange;
  featureCount: number;
  targetVariable: string;
  dataQuality: DataQualityMetrics;
}

export interface DataQualityMetrics {
  completeness: number; // 0-1
  accuracy: number; // 0-1
  consistency: number; // 0-1
  timeliness: number; // 0-1
  validity: number; // 0-1
  uniqueness: number; // 0-1
}

export interface ModelFeature {
  featureName: string;
  featureType: 'numerical' | 'categorical' | 'boolean' | 'text' | 'datetime';
  importance: number; // 0-1
  correlation: number; // -1 to 1
  description: string;
  transformations: string[];
}

export interface ModelPerformance {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  auc: number;
  confusionMatrix: number[][];
  crossValidationScore: number;
  testSetPerformance: TestSetMetrics;
  featureImportance: Record<string, number>;
  calibrationScore?: number;
}

export interface TestSetMetrics {
  testSetSize: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
}

export interface PredictionThreshold {
  thresholdValue: number;
  precision: number;
  recall: number;
  f1Score: number;
  truePositiveRate: number;
  falsePositiveRate: number;
  recommendedUse: string;
}

export interface UserPrediction {
  id: string;
  userId: string;
  modelId: string;
  predictionType: 'churn_probability' | 'ltv_estimate' | 'engagement_score' | 'conversion_likelihood';
  predictionValue: number;
  confidence: number; // 0-1
  predictionDate: Date;
  validUntil: Date;
  featureValues: Record<string, number>;
  explanation: PredictionExplanation;
  actualOutcome?: number;
  predictionAccuracy?: number;
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface PredictionExplanation {
  topFeatures: FeatureContribution[];
  riskFactors: string[];
  protectiveFactors: string[];
  similarUsers: SimilarUser[];
  confidenceFactors: string[];
}

export interface FeatureContribution {
  featureName: string;
  contribution: number; // -1 to 1
  value: number;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
}

export interface SimilarUser {
  userId: string;
  similarity: number; // 0-1
  outcome: number;
  keyFeatures: string[];
}
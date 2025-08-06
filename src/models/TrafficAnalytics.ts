export interface TrafficAnalyticsDashboard {
  id: string;
  name: string;
  description: string;
  dashboardType: 'overview' | 'channel_performance' | 'conversion_analysis' | 'roi_analysis' | 'user_behavior';
  widgets: DashboardWidget[];
  filters: DashboardFilter[];
  dateRange: DateRange;
  refreshInterval: number; // in seconds
  isPublic: boolean;
  ownerId: string;
  permissions: DashboardPermission[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardWidget {
  id: string;
  type: 'chart' | 'metric' | 'table' | 'funnel' | 'heatmap' | 'gauge';
  title: string;
  description?: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  dataSource: string;
  query: string;
  chartConfig: ChartConfig;
  refreshInterval?: number;
  isVisible: boolean;
  metadata: Record<string, any>;
}

export interface ChartConfig {
  chartType: 'line' | 'bar' | 'pie' | 'area' | 'scatter' | 'funnel' | 'gauge';
  xAxis?: string;
  yAxis?: string;
  groupBy?: string;
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
  colors?: string[];
  showLegend?: boolean;
  showGrid?: boolean;
  animations?: boolean;
  customOptions?: Record<string, any>;
}

export interface DashboardFilter {
  id: string;
  name: string;
  type: 'date_range' | 'select' | 'multi_select' | 'text' | 'number_range';
  field: string;
  defaultValue?: any;
  options?: FilterOption[];
  isRequired: boolean;
  isVisible: boolean;
}

export interface FilterOption {
  label: string;
  value: any;
  isDefault?: boolean;
}

export interface DashboardPermission {
  userId: string;
  role: 'viewer' | 'editor' | 'admin';
  grantedAt: Date;
  grantedBy: string;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
  preset?: 'today' | 'yesterday' | 'last_7_days' | 'last_30_days' | 'last_90_days' | 'custom';
}

export interface TrafficReport {
  id: string;
  name: string;
  description: string;
  reportType: 'channel_performance' | 'conversion_analysis' | 'roi_report' | 'user_journey' | 'fraud_analysis' | 'attribution_report';
  parameters: ReportParameters;
  schedule?: ReportSchedule;
  format: 'pdf' | 'excel' | 'csv' | 'json';
  recipients: string[];
  lastGenerated?: Date;
  nextScheduled?: Date;
  status: 'active' | 'paused' | 'error';
  generationCount: number;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportParameters {
  dateRange: DateRange;
  filters: Record<string, any>;
  metrics: string[];
  dimensions: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  includeCharts?: boolean;
  customQueries?: string[];
}

export interface ReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  time: string; // HH:MM format
  timezone: string;
  dayOfWeek?: number; // 0-6, for weekly reports
  dayOfMonth?: number; // 1-31, for monthly reports
  isActive: boolean;
}

export interface ABTest {
  id: string;
  name: string;
  description: string;
  testType: 'traffic_split' | 'feature_toggle' | 'content_variation' | 'ui_variation';
  status: 'draft' | 'running' | 'paused' | 'completed' | 'cancelled';
  startDate: Date;
  endDate?: Date;
  trafficAllocation: number; // 0-100%
  variants: ABTestVariant[];
  targetMetric: string;
  successCriteria: SuccessCriteria;
  statisticalSettings: StatisticalSettings;
  results?: ABTestResults;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ABTestVariant {
  id: string;
  name: string;
  description: string;
  trafficWeight: number; // 0-100%
  configuration: Record<string, any>;
  isControl: boolean;
  metrics: VariantMetrics;
}

export interface VariantMetrics {
  visitors: number;
  conversions: number;
  conversionRate: number;
  revenue: number;
  averageOrderValue: number;
  clickThroughRate: number;
  bounceRate: number;
  timeOnSite: number;
  customMetrics: Record<string, number>;
}

export interface SuccessCriteria {
  primaryMetric: string;
  minimumDetectableEffect: number; // percentage
  minimumSampleSize: number;
  maximumDuration: number; // days
  significanceLevel: number; // 0.01, 0.05, 0.10
  power: number; // 0.8, 0.9, 0.95
}

export interface StatisticalSettings {
  confidenceLevel: number; // 95, 99
  testType: 'two_tailed' | 'one_tailed';
  multipleTestingCorrection: 'bonferroni' | 'benjamini_hochberg' | 'none';
  sequentialTesting: boolean;
  earlyStoppingRules?: EarlyStoppingRule[];
}

export interface EarlyStoppingRule {
  type: 'futility' | 'superiority' | 'non_inferiority';
  threshold: number;
  checkFrequency: 'daily' | 'weekly';
  minimumRuntime: number; // days
}

export interface ABTestResults {
  winner?: string;
  confidence: number;
  pValue: number;
  effectSize: number;
  liftPercentage: number;
  revenueImpact: number;
  statisticalSignificance: boolean;
  practicalSignificance: boolean;
  recommendations: string[];
  detailedResults: VariantComparison[];
  completedAt: Date;
}

export interface VariantComparison {
  variantId: string;
  variantName: string;
  metrics: VariantMetrics;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  pValueVsControl: number;
  liftVsControl: number;
  isSignificant: boolean;
}

export interface ChannelPerformance {
  id: string;
  channelId: string;
  channelName: string;
  channelType: 'personal_channel' | 'group' | 'direct_message' | 'broadcast';
  dateRange: DateRange;
  metrics: ChannelMetrics;
  trends: ChannelTrends;
  segments: ChannelSegment[];
  topPerformers: TopPerformer[];
  metadata: Record<string, any>;
  calculatedAt: Date;
}

export interface ChannelMetrics {
  totalClicks: number;
  uniqueClicks: number;
  totalConversions: number;
  uniqueConversions: number;
  conversionRate: number;
  clickThroughRate: number;
  totalRevenue: number;
  totalCommission: number;
  averageOrderValue: number;
  returnOnAdSpend: number;
  costPerClick: number;
  costPerConversion: number;
  lifetimeValue: number;
  retentionRate: number;
  customMetrics: Record<string, number>;
}

export interface ChannelTrends {
  clicksTrend: TrendData[];
  conversionsTrend: TrendData[];
  revenueTrend: TrendData[];
  conversionRateTrend: TrendData[];
  seasonality: SeasonalityData[];
  growthRate: number;
  volatility: number;
}

export interface TrendData {
  date: Date;
  value: number;
  change?: number;
  changePercent?: number;
}

export interface SeasonalityData {
  period: 'hour' | 'day_of_week' | 'day_of_month' | 'month';
  value: string | number;
  averageMetric: number;
  indexValue: number; // 100 = average, >100 = above average
}

export interface ChannelSegment {
  segmentName: string;
  segmentValue: string;
  metrics: ChannelMetrics;
  percentage: number;
}

export interface TopPerformer {
  type: 'product' | 'store' | 'category' | 'user' | 'campaign';
  id: string;
  name: string;
  metrics: Record<string, number>;
  rank: number;
}

export interface UserJourney {
  id: string;
  userId: string;
  sessionId: string;
  journeyType: 'conversion' | 'abandoned' | 'exploration';
  startTime: Date;
  endTime: Date;
  duration: number; // seconds
  touchpoints: JourneyTouchpoint[];
  outcome: JourneyOutcome;
  pathAnalysis: PathAnalysis;
  metadata: Record<string, any>;
}

export interface JourneyTouchpoint {
  id: string;
  timestamp: Date;
  type: 'click' | 'view' | 'interaction' | 'conversion';
  source: string;
  sourceDetails: Record<string, any>;
  content: string;
  duration: number;
  sequenceNumber: number;
  metadata: Record<string, any>;
}

export interface JourneyOutcome {
  type: 'conversion' | 'abandonment' | 'ongoing';
  value?: number;
  conversionId?: string;
  abandonmentReason?: string;
  exitPoint?: string;
  metadata: Record<string, any>;
}

export interface PathAnalysis {
  commonPaths: string[];
  pathFrequency: Record<string, number>;
  conversionPaths: string[];
  abandonmentPoints: string[];
  pathEfficiency: number;
  averagePathLength: number;
}

export interface ROIAnalysis {
  id: string;
  analysisType: 'channel' | 'campaign' | 'store' | 'product' | 'user_segment';
  entityId: string;
  entityName: string;
  dateRange: DateRange;
  investment: InvestmentData;
  returns: ReturnData;
  roiMetrics: ROIMetrics;
  breakdown: ROIBreakdown[];
  trends: ROITrends;
  benchmarks: ROIBenchmarks;
  recommendations: ROIRecommendation[];
  metadata: Record<string, any>;
  calculatedAt: Date;
}

export interface InvestmentData {
  totalInvestment: number;
  breakdown: {
    advertising: number;
    commissions: number;
    operational: number;
    technology: number;
    other: number;
  };
  currency: string;
}

export interface ReturnData {
  totalRevenue: number;
  totalProfit: number;
  breakdown: {
    directRevenue: number;
    indirectRevenue: number;
    retentionRevenue: number;
    referralRevenue: number;
  };
  currency: string;
}

export interface ROIMetrics {
  roi: number; // Return on Investment
  roas: number; // Return on Ad Spend
  cpa: number; // Cost Per Acquisition
  ltv: number; // Lifetime Value
  paybackPeriod: number; // days
  profitMargin: number;
  breakEvenPoint: number;
  netPresentValue: number;
}

export interface ROIBreakdown {
  dimension: string;
  value: string;
  investment: number;
  returns: number;
  roi: number;
  percentage: number;
}

export interface ROITrends {
  roiTrend: TrendData[];
  investmentTrend: TrendData[];
  returnsTrend: TrendData[];
  efficiency: number;
  stability: number;
}

export interface ROIBenchmarks {
  industryAverage: number;
  topPerformer: number;
  previousPeriod: number;
  target: number;
  percentile: number;
}

export interface ROIRecommendation {
  type: 'increase_investment' | 'decrease_investment' | 'optimize_targeting' | 'improve_conversion' | 'diversify_channels';
  priority: 'high' | 'medium' | 'low';
  description: string;
  expectedImpact: number;
  implementationCost: number;
  timeframe: string;
  confidence: number;
}

export interface AnalyticsAlert {
  id: string;
  name: string;
  description: string;
  alertType: 'threshold' | 'anomaly' | 'trend' | 'comparison';
  metric: string;
  conditions: AlertCondition[];
  channels: AlertChannel[];
  recipients: string[];
  frequency: 'immediate' | 'hourly' | 'daily';
  isActive: boolean;
  lastTriggered?: Date;
  triggerCount: number;
  suppressionRules?: SuppressionRule[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface AlertCondition {
  type: 'greater_than' | 'less_than' | 'equals' | 'not_equals' | 'percentage_change' | 'anomaly_score';
  threshold: number;
  timeWindow: number; // minutes
  comparisonPeriod?: 'previous_period' | 'same_period_last_week' | 'same_period_last_month';
  sensitivity?: 'low' | 'medium' | 'high';
}

export interface AlertChannel {
  type: 'email' | 'telegram' | 'slack' | 'webhook' | 'sms';
  configuration: Record<string, any>;
  isActive: boolean;
}

export interface SuppressionRule {
  type: 'time_based' | 'condition_based' | 'escalation';
  parameters: Record<string, any>;
  duration: number; // minutes
}

export interface AnalyticsInsight {
  id: string;
  type: 'opportunity' | 'risk' | 'trend' | 'anomaly' | 'recommendation';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-100
  impact: InsightImpact;
  evidence: InsightEvidence[];
  recommendations: InsightRecommendation[];
  affectedEntities: string[];
  detectedAt: Date;
  status: 'new' | 'acknowledged' | 'in_progress' | 'resolved' | 'dismissed';
  metadata: Record<string, any>;
}

export interface InsightImpact {
  metric: string;
  currentValue: number;
  potentialValue: number;
  impactPercentage: number;
  revenueImpact?: number;
  timeframe: string;
}

export interface InsightEvidence {
  type: 'metric_change' | 'pattern_detection' | 'comparison' | 'correlation';
  description: string;
  data: Record<string, any>;
  confidence: number;
}

export interface InsightRecommendation {
  action: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  expectedImpact: number;
  implementationSteps: string[];
}

export interface DataExport {
  id: string;
  name: string;
  description: string;
  exportType: 'raw_data' | 'aggregated_data' | 'report' | 'dashboard';
  format: 'csv' | 'excel' | 'json' | 'pdf';
  dataSource: string;
  query: string;
  filters: Record<string, any>;
  schedule?: ExportSchedule;
  destination: ExportDestination;
  lastExported?: Date;
  nextScheduled?: Date;
  status: 'active' | 'paused' | 'error';
  exportCount: number;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string;
  timezone: string;
  isActive: boolean;
}

export interface ExportDestination {
  type: 'email' | 'ftp' | 's3' | 'google_drive' | 'webhook';
  configuration: Record<string, any>;
  credentials?: Record<string, any>;
}
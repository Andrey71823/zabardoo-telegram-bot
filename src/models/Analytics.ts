// Analytics Event Models
export interface UserEvent {
  id: string;
  userId: string;
  sessionId: string;
  eventType: EventType;
  eventName: string;
  timestamp: Date;
  properties: Record<string, any>;
  context: EventContext;
  metadata: EventMetadata;
}

export enum EventType {
  USER_ACTION = 'user_action',
  SYSTEM_EVENT = 'system_event',
  BUSINESS_EVENT = 'business_event',
  ERROR_EVENT = 'error_event',
  PERFORMANCE_EVENT = 'performance_event'
}

export interface EventContext {
  platform: 'telegram' | 'web' | 'api';
  source: string;
  userAgent?: string;
  ipAddress?: string;
  location?: {
    country?: string;
    region?: string;
    city?: string;
  };
  device?: {
    type: 'mobile' | 'desktop' | 'tablet';
    os?: string;
    browser?: string;
  };
  referrer?: string;
}

export interface EventMetadata {
  version: string;
  environment: 'development' | 'staging' | 'production';
  serverTimestamp: Date;
  processingTime?: number;
  batchId?: string;
  correlationId?: string;
}

// Specific Event Types
export interface UserActionEvent extends UserEvent {
  eventType: EventType.USER_ACTION;
  action: UserAction;
  target?: string;
  value?: number;
  duration?: number;
}

export enum UserAction {
  // Telegram Bot Actions
  BOT_START = 'bot_start',
  BOT_COMMAND = 'bot_command',
  BUTTON_CLICK = 'button_click',
  MESSAGE_SENT = 'message_sent',
  
  // Coupon Actions
  COUPON_VIEW = 'coupon_view',
  COUPON_CLICK = 'coupon_click',
  COUPON_COPY = 'coupon_copy',
  COUPON_SHARE = 'coupon_share',
  COUPON_SAVE = 'coupon_save',
  
  // Purchase Actions
  PURCHASE_INITIATED = 'purchase_initiated',
  PURCHASE_COMPLETED = 'purchase_completed',
  PURCHASE_CANCELLED = 'purchase_cancelled',
  
  // Cashback Actions
  CASHBACK_EARNED = 'cashback_earned',
  CASHBACK_WITHDRAWN = 'cashback_withdrawn',
  PAYMENT_METHOD_ADDED = 'payment_method_added',
  
  // Engagement Actions
  CHANNEL_JOINED = 'channel_joined',
  CHANNEL_LEFT = 'channel_left',
  NOTIFICATION_CLICKED = 'notification_clicked',
  SEARCH_PERFORMED = 'search_performed',
  
  // Profile Actions
  PROFILE_UPDATED = 'profile_updated',
  PREFERENCES_CHANGED = 'preferences_changed',
  LANGUAGE_CHANGED = 'language_changed'
}

export interface BusinessEvent extends UserEvent {
  eventType: EventType.BUSINESS_EVENT;
  businessMetric: BusinessMetric;
  value: number;
  currency?: string;
  category?: string;
  subcategory?: string;
}

export enum BusinessMetric {
  REVENUE = 'revenue',
  COMMISSION = 'commission',
  CASHBACK_PAID = 'cashback_paid',
  USER_ACQUISITION_COST = 'user_acquisition_cost',
  LIFETIME_VALUE = 'lifetime_value',
  CONVERSION_RATE = 'conversion_rate',
  RETENTION_RATE = 'retention_rate',
  CHURN_RATE = 'churn_rate'
}

export interface SystemEvent extends UserEvent {
  eventType: EventType.SYSTEM_EVENT;
  systemComponent: string;
  operation: string;
  status: 'success' | 'failure' | 'warning';
  errorCode?: string;
  errorMessage?: string;
}

export interface PerformanceEvent extends UserEvent {
  eventType: EventType.PERFORMANCE_EVENT;
  metric: PerformanceMetric;
  value: number;
  unit: string;
  threshold?: number;
}

export enum PerformanceMetric {
  RESPONSE_TIME = 'response_time',
  QUERY_TIME = 'query_time',
  MEMORY_USAGE = 'memory_usage',
  CPU_USAGE = 'cpu_usage',
  THROUGHPUT = 'throughput',
  ERROR_RATE = 'error_rate'
}

// Event Aggregation Models
export interface EventAggregation {
  id: string;
  eventType: EventType;
  eventName: string;
  aggregationType: AggregationType;
  timeWindow: TimeWindow;
  dimensions: string[];
  metrics: AggregationMetric[];
  filters?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export enum AggregationType {
  COUNT = 'count',
  SUM = 'sum',
  AVERAGE = 'average',
  MIN = 'min',
  MAX = 'max',
  PERCENTILE = 'percentile',
  UNIQUE_COUNT = 'unique_count'
}

export enum TimeWindow {
  MINUTE = 'minute',
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year'
}

export interface AggregationMetric {
  name: string;
  field: string;
  aggregationType: AggregationType;
  percentile?: number;
}

// User Session Models
export interface UserSession {
  id: string;
  userId: string;
  sessionStart: Date;
  sessionEnd?: Date;
  duration?: number;
  platform: string;
  source: string;
  events: UserEvent[];
  properties: {
    eventsCount: number;
    uniqueActions: number;
    bounceRate?: number;
    conversionEvents: number;
  };
  context: EventContext;
}

// Funnel Models
export interface ConversionFunnel {
  id: string;
  name: string;
  description?: string;
  steps: FunnelStep[];
  timeWindow: number; // in hours
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FunnelStep {
  id: string;
  name: string;
  eventName: string;
  eventProperties?: Record<string, any>;
  order: number;
  isRequired: boolean;
}

export interface FunnelAnalysis {
  funnelId: string;
  dateRange: {
    from: Date;
    to: Date;
  };
  totalUsers: number;
  steps: FunnelStepAnalysis[];
  conversionRate: number;
  dropoffPoints: DropoffPoint[];
}

export interface FunnelStepAnalysis {
  stepId: string;
  stepName: string;
  usersEntered: number;
  usersCompleted: number;
  conversionRate: number;
  averageTimeToComplete: number;
  dropoffRate: number;
}

export interface DropoffPoint {
  fromStep: string;
  toStep: string;
  dropoffCount: number;
  dropoffRate: number;
  reasons?: string[];
}

// Cohort Models
export interface CohortAnalysis {
  id: string;
  name: string;
  cohortType: CohortType;
  dateRange: {
    from: Date;
    to: Date;
  };
  cohorts: Cohort[];
  retentionMatrix: number[][];
  averageRetention: number[];
}

export enum CohortType {
  ACQUISITION = 'acquisition',
  BEHAVIORAL = 'behavioral',
  REVENUE = 'revenue'
}

export interface Cohort {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  userCount: number;
  retentionRates: number[];
  properties: Record<string, any>;
}

// Real-time Analytics Models
export interface RealTimeMetric {
  id: string;
  name: string;
  value: number;
  previousValue?: number;
  change?: number;
  changePercent?: number;
  unit: string;
  timestamp: Date;
  trend: 'up' | 'down' | 'stable';
}

export interface RealTimeDashboard {
  id: string;
  name: string;
  metrics: RealTimeMetric[];
  alerts: Alert[];
  lastUpdated: Date;
}

export interface Alert {
  id: string;
  name: string;
  condition: AlertCondition;
  isTriggered: boolean;
  triggeredAt?: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
}

export interface AlertCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  timeWindow: number; // in minutes
}

// Custom Analytics Models
export interface CustomReport {
  id: string;
  name: string;
  description?: string;
  query: AnalyticsQuery;
  schedule?: ReportSchedule;
  recipients: string[];
  format: 'json' | 'csv' | 'excel' | 'pdf';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AnalyticsQuery {
  select: string[];
  from: string;
  where?: Record<string, any>;
  groupBy?: string[];
  orderBy?: Array<{
    field: string;
    direction: 'asc' | 'desc';
  }>;
  limit?: number;
  timeRange?: {
    from: Date;
    to: Date;
  };
}

export interface ReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string; // HH:MM format
  dayOfWeek?: number; // 0-6, Sunday = 0
  dayOfMonth?: number; // 1-31
  timezone: string;
}

// Event Processing Models
export interface EventBatch {
  id: string;
  events: UserEvent[];
  batchSize: number;
  createdAt: Date;
  processedAt?: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
}

export interface EventProcessingRule {
  id: string;
  name: string;
  eventType: EventType;
  conditions: RuleCondition[];
  actions: RuleAction[];
  isActive: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RuleCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'contains';
  value: any;
  logicalOperator?: 'and' | 'or';
}

export interface RuleAction {
  type: 'enrich' | 'filter' | 'transform' | 'route' | 'alert';
  parameters: Record<string, any>;
}

// Data Quality Models
export interface DataQualityCheck {
  id: string;
  name: string;
  checkType: 'completeness' | 'accuracy' | 'consistency' | 'timeliness' | 'validity';
  rules: QualityRule[];
  schedule: string; // cron expression
  isActive: boolean;
  lastRun?: Date;
  lastResult?: QualityResult;
}

export interface QualityRule {
  field: string;
  constraint: string;
  threshold?: number;
  severity: 'warning' | 'error';
}

export interface QualityResult {
  checkId: string;
  runAt: Date;
  passed: boolean;
  score: number; // 0-100
  issues: QualityIssue[];
  summary: {
    totalRecords: number;
    validRecords: number;
    invalidRecords: number;
  };
}

export interface QualityIssue {
  rule: string;
  field: string;
  count: number;
  severity: 'warning' | 'error';
  examples: any[];
}
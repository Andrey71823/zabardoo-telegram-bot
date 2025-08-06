// Notification models for proactive user engagement

export interface NotificationTrigger {
  id: string;
  name: string;
  type: 'behavioral' | 'temporal' | 'contextual' | 'promotional';
  conditions: {
    user_segments?: string[];
    behavioral_patterns?: BehavioralPattern[];
    time_conditions?: TimeCondition[];
    context_filters?: ContextFilter[];
  };
  is_active: boolean;
  priority: number;
  created_at: Date;
  updated_at: Date;
}

export interface BehavioralPattern {
  pattern_type: 'inactivity' | 'high_engagement' | 'purchase_intent' | 'category_interest' | 'churn_risk';
  threshold_value: number;
  time_window_hours: number;
  comparison_operator: 'greater_than' | 'less_than' | 'equals' | 'between';
}

export interface TimeCondition {
  trigger_type: 'daily' | 'weekly' | 'monthly' | 'specific_date' | 'relative';
  schedule: {
    hours?: number[];
    days_of_week?: number[];
    days_of_month?: number[];
    timezone: string;
  };
  frequency_limit?: {
    max_per_day?: number;
    max_per_week?: number;
    cooldown_hours?: number;
  };
}

export interface ContextFilter {
  filter_type: 'location' | 'device' | 'weather' | 'season' | 'events';
  conditions: Record<string, any>;
  weight: number;
}

export interface NotificationTemplate {
  id: string;
  trigger_id: string;
  name: string;
  channel: 'telegram' | 'push' | 'email' | 'sms';
  template_type: 'text' | 'rich_media' | 'interactive';
  content: {
    title?: string;
    message: string;
    media_url?: string;
    buttons?: NotificationButton[];
    personalization_fields?: string[];
  };
  localization: Record<string, any>;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface NotificationButton {
  text: string;
  action_type: 'url' | 'callback' | 'deep_link';
  action_value: string;
  tracking_id?: string;
}

export interface ProactiveNotification {
  id: string;
  user_id: string;
  trigger_id: string;
  template_id: string;
  channel: string;
  status: 'scheduled' | 'sent' | 'delivered' | 'failed' | 'cancelled';
  personalized_content: {
    title?: string;
    message: string;
    media_url?: string;
    buttons?: NotificationButton[];
    recommendations?: string[];
  };
  scheduling: {
    scheduled_at: Date;
    sent_at?: Date;
    delivered_at?: Date;
    optimal_time?: Date;
  };
  targeting: {
    user_segment: string;
    personalization_score: number;
    relevance_score: number;
    predicted_engagement: number;
  };
  tracking: {
    opened?: boolean;
    clicked?: boolean;
    converted?: boolean;
    feedback_rating?: number;
    interaction_time?: number;
  };
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface NotificationCampaign {
  id: string;
  name: string;
  description: string;
  campaign_type: 'one_time' | 'recurring' | 'triggered' | 'drip';
  target_audience: {
    user_segments: string[];
    behavioral_criteria: BehavioralPattern[];
    demographic_filters: Record<string, any>;
    estimated_reach: number;
  };
  content: {
    templates: string[];
    personalization_rules: PersonalizationRule[];
    a_b_test_variants?: ABTestVariant[];
  };
  scheduling: {
    start_date: Date;
    end_date?: Date;
    frequency?: string;
    optimal_timing: boolean;
    timezone: string;
  };
  performance: {
    sent_count: number;
    delivered_count: number;
    opened_count: number;
    clicked_count: number;
    converted_count: number;
    unsubscribed_count: number;
  };
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled';
  created_at: Date;
  updated_at: Date;
}

export interface PersonalizationRule {
  field: string;
  data_source: 'user_profile' | 'behavior' | 'recommendations' | 'external';
  transformation: string;
  fallback_value: string;
}

export interface ABTestVariant {
  variant_id: string;
  name: string;
  template_id: string;
  traffic_percentage: number;
  performance_metrics: Record<string, number>;
}

export interface UserNotificationPreferences {
  id: string;
  user_id: string;
  channels: {
    telegram: boolean;
    push: boolean;
    email: boolean;
    sms: boolean;
  };
  categories: {
    promotional: boolean;
    recommendations: boolean;
    alerts: boolean;
    updates: boolean;
  };
  frequency: {
    max_per_day: number;
    max_per_week: number;
    quiet_hours: {
      start: string;
      end: string;
      timezone: string;
    };
  };
  personalization: {
    use_ai_optimization: boolean;
    preferred_language: string;
    content_style: 'formal' | 'casual' | 'friendly';
  };
  created_at: Date;
  updated_at: Date;
}

export interface NotificationAnalytics {
  id: string;
  date: Date;
  campaign_id?: string;
  trigger_id?: string;
  metrics: {
    total_sent: number;
    delivery_rate: number;
    open_rate: number;
    click_through_rate: number;
    conversion_rate: number;
    unsubscribe_rate: number;
    engagement_score: number;
  };
  segmentation: {
    by_channel: Record<string, any>;
    by_user_segment: Record<string, any>;
    by_time_of_day: Record<string, any>;
    by_content_type: Record<string, any>;
  };
  revenue_impact: {
    attributed_revenue: number;
    roi: number;
    cost_per_conversion: number;
  };
  created_at: Date;
}

export interface SmartTiming {
  user_id: string;
  channel: string;
  optimal_hours: number[];
  engagement_patterns: {
    hourly_scores: number[];
    daily_scores: number[];
    seasonal_adjustments: Record<string, number>;
  };
  last_calculated: Date;
  confidence_score: number;
}

export interface NotificationQueue {
  id: string;
  user_id: string;
  notification_id: string;
  priority: number;
  scheduled_at: Date;
  retry_count: number;
  max_retries: number;
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled';
  error_message?: string;
  created_at: Date;
  updated_at: Date;
}
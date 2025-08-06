export interface Campaign {
  id: string;
  name: string;
  description: string;
  type: 'broadcast' | 'targeted' | 'automated' | 'ab_test';
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'cancelled';
  priority: number; // 1-10, higher is more important
  
  // Targeting
  targetAudience: {
    segmentIds?: string[];
    userIds?: string[];
    filters?: {
      isActive?: boolean;
      channelStatus?: 'active' | 'suspended' | 'deleted' | 'none';
      location?: string[];
      language?: string[];
      registrationDateRange?: { from: Date; to: Date };
      activityLevel?: 'high' | 'medium' | 'low' | 'inactive';
      totalSpentRange?: { min?: number; max?: number };
      couponsUsedRange?: { min?: number; max?: number };
    };
    excludeUserIds?: string[];
  };
  
  // Content
  content: {
    title: string;
    message: string;
    mediaUrl?: string;
    actionButtons?: Array<{
      text: string;
      url?: string;
      action?: string;
      data?: any;
    }>;
    template?: string;
    variables?: Record<string, any>;
  };
  
  // Scheduling
  schedule: {
    type: 'immediate' | 'scheduled' | 'recurring';
    scheduledAt?: Date;
    timezone?: string;
    recurring?: {
      frequency: 'daily' | 'weekly' | 'monthly';
      interval: number; // every N days/weeks/months
      daysOfWeek?: number[]; // 0-6, Sunday = 0
      dayOfMonth?: number; // 1-31
      time: string; // HH:MM format
      endDate?: Date;
    };
  };
  
  // A/B Testing
  abTest?: {
    enabled: boolean;
    variants: Array<{
      id: string;
      name: string;
      percentage: number; // 0-100
      content: {
        title: string;
        message: string;
        mediaUrl?: string;
        actionButtons?: Array<{
          text: string;
          url?: string;
          action?: string;
          data?: any;
        }>;
      };
    }>;
    winnerCriteria: 'click_rate' | 'conversion_rate' | 'engagement_rate';
    testDuration: number; // hours
    autoPromoteWinner: boolean;
  };
  
  // Delivery settings
  delivery: {
    channel: 'telegram' | 'email' | 'push' | 'sms';
    rateLimitPerMinute?: number;
    retryAttempts?: number;
    retryDelay?: number; // minutes
    respectUserPreferences: boolean;
    quietHours?: {
      enabled: boolean;
      startTime: string; // HH:MM
      endTime: string; // HH:MM
      timezone: string;
    };
  };
  
  // Metrics
  metrics: {
    targetCount: number;
    sentCount: number;
    deliveredCount: number;
    failedCount: number;
    openedCount: number;
    clickedCount: number;
    convertedCount: number;
    unsubscribedCount: number;
    
    // Rates
    deliveryRate: number; // delivered/sent
    openRate: number; // opened/delivered
    clickRate: number; // clicked/opened
    conversionRate: number; // converted/clicked
    unsubscribeRate: number; // unsubscribed/delivered
    
    // Revenue
    revenue: number;
    costPerConversion: number;
    roi: number;
  };
  
  // Metadata
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  tags: string[];
  notes?: string;
}

export interface CampaignExecution {
  id: string;
  campaignId: string;
  executionType: 'manual' | 'scheduled' | 'triggered';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  
  // Execution details
  startedAt: Date;
  completedAt?: Date;
  duration?: number; // seconds
  
  // Batch processing
  totalBatches: number;
  completedBatches: number;
  currentBatch?: number;
  batchSize: number;
  
  // Results
  results: {
    targetUsers: number;
    processedUsers: number;
    successfulSends: number;
    failedSends: number;
    skippedUsers: number; // due to preferences, quiet hours, etc.
    errors: Array<{
      userId?: string;
      error: string;
      timestamp: Date;
    }>;
  };
  
  // A/B Test specific
  abTestResults?: {
    variantId: string;
    userCount: number;
    metrics: {
      sent: number;
      delivered: number;
      opened: number;
      clicked: number;
      converted: number;
    };
  }[];
  
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  description: string;
  category: 'promotional' | 'transactional' | 'informational' | 'reminder';
  
  // Template content
  content: {
    title: string;
    message: string;
    mediaUrl?: string;
    actionButtons?: Array<{
      text: string;
      url?: string;
      action?: string;
    }>;
  };
  
  // Variables that can be replaced
  variables: Array<{
    name: string;
    description: string;
    type: 'string' | 'number' | 'date' | 'boolean';
    required: boolean;
    defaultValue?: any;
  }>;
  
  // Usage stats
  usage: {
    timesUsed: number;
    lastUsed?: Date;
    averagePerformance: {
      openRate: number;
      clickRate: number;
      conversionRate: number;
    };
  };
  
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserNotificationPreference {
  userId: string;
  preferences: {
    // Channel preferences
    telegram: boolean;
    email: boolean;
    push: boolean;
    sms: boolean;
    
    // Content preferences
    promotional: boolean;
    transactional: boolean;
    informational: boolean;
    reminders: boolean;
    
    // Frequency preferences
    maxPerDay: number;
    maxPerWeek: number;
    
    // Timing preferences
    quietHours: {
      enabled: boolean;
      startTime: string; // HH:MM
      endTime: string; // HH:MM
      timezone: string;
    };
    
    // Category preferences
    categories: string[]; // interested categories
    stores: string[]; // interested stores
    
    // Unsubscribe options
    globalUnsubscribe: boolean;
    unsubscribedCategories: string[];
    unsubscribedCampaignTypes: string[];
  };
  
  updatedAt: Date;
}

export interface NotificationDelivery {
  id: string;
  campaignId: string;
  executionId: string;
  userId: string;
  
  // Content delivered
  content: {
    title: string;
    message: string;
    mediaUrl?: string;
    actionButtons?: Array<{
      text: string;
      url?: string;
      action?: string;
      data?: any;
    }>;
  };
  
  // Delivery details
  channel: 'telegram' | 'email' | 'push' | 'sms';
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';
  
  // Timestamps
  scheduledAt: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  failedAt?: Date;
  
  // Interaction tracking
  interactions: {
    opened: boolean;
    openedAt?: Date;
    clicked: boolean;
    clickedAt?: Date;
    converted: boolean;
    convertedAt?: Date;
    unsubscribed: boolean;
    unsubscribedAt?: Date;
  };
  
  // Technical details
  messageId?: string; // external message ID
  errorMessage?: string;
  retryCount: number;
  
  // A/B Test
  abTestVariantId?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignFilter {
  status?: string[];
  type?: string[];
  createdBy?: string;
  dateRange?: { from: Date; to: Date };
  tags?: string[];
  search?: string;
  sortBy?: 'createdAt' | 'startedAt' | 'completedAt' | 'name' | 'metrics.sentCount';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface CampaignStats {
  totalCampaigns: number;
  activeCampaigns: number;
  completedCampaigns: number;
  scheduledCampaigns: number;
  
  // Performance metrics
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  totalConverted: number;
  totalRevenue: number;
  
  // Average rates
  averageDeliveryRate: number;
  averageOpenRate: number;
  averageClickRate: number;
  averageConversionRate: number;
  averageROI: number;
  
  // Top performing campaigns
  topCampaigns: Array<{
    campaignId: string;
    name: string;
    metric: string;
    value: number;
  }>;
  
  // Campaign types breakdown
  campaignsByType: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  
  // Performance trends
  performanceTrend: Array<{
    date: string;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    converted: number;
    revenue: number;
  }>;
}

export interface AutomatedCampaignTrigger {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  
  // Trigger conditions
  trigger: {
    type: 'user_action' | 'time_based' | 'data_change' | 'external_event';
    conditions: {
      // User action triggers
      action?: 'user_registered' | 'coupon_used' | 'purchase_made' | 'channel_subscribed' | 'inactivity_detected';
      
      // Time-based triggers
      schedule?: {
        frequency: 'daily' | 'weekly' | 'monthly';
        time: string; // HH:MM
        daysOfWeek?: number[];
        dayOfMonth?: number;
      };
      
      // Data change triggers
      dataChange?: {
        field: string;
        operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
        value: any;
      };
      
      // Filters for user selection
      userFilters?: {
        isActive?: boolean;
        channelStatus?: string[];
        activityLevel?: string[];
        totalSpentRange?: { min?: number; max?: number };
        registrationDateRange?: { from: Date; to: Date };
        lastActiveRange?: { from: Date; to: Date };
      };
    };
  };
  
  // Campaign to execute
  campaignTemplate: {
    name: string;
    content: {
      title: string;
      message: string;
      mediaUrl?: string;
      actionButtons?: Array<{
        text: string;
        url?: string;
        action?: string;
      }>;
    };
    delivery: {
      channel: 'telegram' | 'email' | 'push' | 'sms';
      respectUserPreferences: boolean;
    };
  };
  
  // Execution settings
  settings: {
    maxExecutionsPerDay?: number;
    cooldownPeriod?: number; // minutes between executions for same user
    enabled: boolean;
  };
  
  // Statistics
  stats: {
    totalExecutions: number;
    lastExecuted?: Date;
    averageTargetSize: number;
    averageSuccessRate: number;
  };
  
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BulkNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'promotion' | 'system';
  
  // Recipients
  recipients: {
    type: 'all_users' | 'segment' | 'custom_list';
    segmentIds?: string[];
    userIds?: string[];
    filters?: {
      isActive?: boolean;
      channelStatus?: string[];
      location?: string[];
      language?: string[];
    };
  };
  
  // Delivery
  channel: 'telegram' | 'email' | 'push' | 'sms';
  scheduledAt?: Date;
  
  // Results
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'failed';
  results: {
    targetCount: number;
    sentCount: number;
    deliveredCount: number;
    failedCount: number;
    errors: Array<{
      userId: string;
      error: string;
    }>;
  };
  
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  sentAt?: Date;
  completedAt?: Date;
}

export interface NotificationAnalytics {
  campaignId: string;
  period: 'day' | 'week' | 'month';
  startDate: Date;
  endDate: Date;
  
  // Delivery metrics
  delivery: {
    sent: number;
    delivered: number;
    failed: number;
    bounced: number;
    deliveryRate: number;
  };
  
  // Engagement metrics
  engagement: {
    opened: number;
    clicked: number;
    converted: number;
    unsubscribed: number;
    openRate: number;
    clickRate: number;
    conversionRate: number;
    unsubscribeRate: number;
  };
  
  // Revenue metrics
  revenue: {
    total: number;
    perRecipient: number;
    perClick: number;
    perConversion: number;
    roi: number;
  };
  
  // Audience breakdown
  audience: {
    byLocation: Array<{ location: string; count: number; percentage: number }>;
    byLanguage: Array<{ language: string; count: number; percentage: number }>;
    byActivityLevel: Array<{ level: string; count: number; percentage: number }>;
    byChannel: Array<{ channel: string; count: number; percentage: number }>;
  };
  
  // Time-based analysis
  timeline: Array<{
    timestamp: Date;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    converted: number;
  }>;
  
  // Device/Platform breakdown
  platforms: Array<{
    platform: string;
    count: number;
    openRate: number;
    clickRate: number;
  }>;
  
  generatedAt: Date;
}
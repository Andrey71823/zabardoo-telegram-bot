export interface ContentSyncRule {
  id: string;
  sourceType: 'group' | 'channel' | 'external';
  sourceId: string;
  targetType: 'personal_channels' | 'group' | 'channel';
  targetFilters: {
    userSegments?: string[];
    categories?: string[];
    stores?: string[];
    regions?: string[];
    minEngagement?: number;
    maxChurnRisk?: number;
  };
  contentFilters: {
    messageTypes?: string[];
    minPopularityScore?: number;
    keywords?: string[];
    excludeKeywords?: string[];
  };
  syncTiming: {
    immediate: boolean;
    scheduled?: {
      hours: number[];
      timezone: string;
    };
    delay?: number; // minutes
  };
  isActive: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContentSyncJob {
  id: string;
  ruleId: string;
  sourceContent: {
    id: string;
    type: string;
    content: string;
    metadata: any;
    popularity?: number;
    engagement?: number;
  };
  targetChannels: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  results: {
    totalTargets: number;
    successful: number;
    failed: number;
    errors?: string[];
  };
  createdAt: Date;
}

export interface PopularContent {
  id: string;
  sourceId: string;
  sourceType: 'group' | 'channel';
  contentType: 'coupon' | 'text' | 'media';
  title: string;
  content: string;
  metadata: {
    store?: string;
    category?: string;
    discountValue?: number;
    discountType?: string;
    couponCode?: string;
    link?: string;
  };
  popularityScore: number;
  engagementMetrics: {
    views: number;
    clicks: number;
    shares: number;
    reactions: number;
    comments: number;
  };
  createdAt: Date;
  lastSyncedAt?: Date;
  syncCount: number;
}

export interface UserContentPreference {
  id: string;
  userId: string;
  preferredCategories: string[];
  preferredStores: string[];
  excludedCategories: string[];
  excludedStores: string[];
  maxMessagesPerDay: number;
  preferredTimes: number[]; // hours of day
  timezone: string;
  contentTypes: string[];
  minDiscountThreshold?: number;
  onlyPopularContent: boolean;
  personalizedRecommendations: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SyncAnalytics {
  id: string;
  date: Date;
  totalSyncJobs: number;
  successfulSyncs: number;
  failedSyncs: number;
  totalMessagesDelivered: number;
  averageDeliveryTime: number; // seconds
  popularContentSynced: number;
  userEngagementRate: number;
  topPerformingContent: string[];
  topTargetChannels: string[];
}
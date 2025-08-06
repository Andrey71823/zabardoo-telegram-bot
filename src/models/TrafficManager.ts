export interface ClickEvent {
  id: string;
  clickId: string; // Уникальный идентификатор клика
  userId: string;
  telegramUserId: string;
  sessionId: string;
  affiliateLinkId?: string;
  couponId?: string;
  storeId: string;
  storeName: string;
  originalUrl: string;
  destinationUrl: string;
  source: 'personal_channel' | 'group' | 'ai_recommendation' | 'search' | 'notification';
  sourceDetails: {
    channelId?: string;
    groupId?: string;
    messageId?: string;
    botCommand?: string;
    campaignId?: string;
  };
  userAgent?: string;
  ipAddress?: string;
  referrer?: string;
  deviceInfo: {
    platform?: string; // 'iOS', 'Android', 'Desktop', 'Web'
    browser?: string;
    isMobile?: boolean;
    screenResolution?: string;
    language?: string;
    timezone?: string;
  };
  geoLocation?: {
    country?: string;
    region?: string;
    city?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  utmParams?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
  metadata: Record<string, any>;
  clickedAt: Date;
  createdAt: Date;
}

export interface ClickSession {
  id: string;
  sessionId: string;
  userId: string;
  telegramUserId: string;
  startedAt: Date;
  lastActivityAt: Date;
  endedAt?: Date;
  duration?: number; // в секундах
  clickCount: number;
  uniqueLinksClicked: number;
  conversionCount: number;
  totalRevenue: number;
  totalCommission: number;
  deviceInfo: Record<string, any>;
  geoLocation?: Record<string, any>;
  isActive: boolean;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrafficSource {
  id: string;
  name: string;
  type: 'personal_channel' | 'group' | 'ai_recommendation' | 'search' | 'notification' | 'external';
  description?: string;
  sourceId: string; // ID канала, группы и т.д.
  isActive: boolean;
  priority: number;
  trackingEnabled: boolean;
  customParams?: Record<string, any>;
  performanceMetrics: {
    totalClicks: number;
    uniqueUsers: number;
    conversions: number;
    conversionRate: number;
    averageOrderValue: number;
    totalRevenue: number;
    totalCommission: number;
    lastUpdated: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ClickAnalytics {
  id: string;
  date: Date;
  hour: number;
  sourceType: string;
  sourceId: string;
  storeId: string;
  totalClicks: number;
  uniqueUsers: number;
  newUsers: number;
  returningUsers: number;
  bounceRate: number;
  averageSessionDuration: number;
  topDevices: Record<string, number>;
  topLocations: Record<string, number>;
  topReferrers: Record<string, number>;
  conversionMetrics: {
    conversions: number;
    conversionRate: number;
    revenue: number;
    commission: number;
    averageOrderValue: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface UserJourney {
  id: string;
  userId: string;
  telegramUserId: string;
  journeyId: string;
  startedAt: Date;
  endedAt?: Date;
  totalDuration?: number;
  touchpoints: TouchPoint[];
  conversionEvent?: ConversionEvent;
  journeyStage: 'awareness' | 'consideration' | 'purchase' | 'retention';
  isCompleted: boolean;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface TouchPoint {
  id: string;
  journeyId: string;
  sequence: number;
  touchpointType: 'click' | 'view' | 'interaction' | 'conversion';
  source: string;
  sourceDetails: Record<string, any>;
  content?: string;
  duration?: number;
  timestamp: Date;
  metadata: Record<string, any>;
}

export interface ConversionEvent {
  id: string;
  clickId: string;
  userId: string;
  telegramUserId: string;
  sessionId: string;
  journeyId?: string;
  orderId: string;
  storeId: string;
  storeName: string;
  orderValue: number;
  commission: number;
  commissionRate: number;
  currency: string;
  products: ConversionProduct[];
  conversionType: 'purchase' | 'signup' | 'subscription' | 'lead';
  attributionModel: 'first_click' | 'last_click' | 'linear' | 'time_decay' | 'position_based';
  attributionData: {
    firstClickSource: string;
    lastClickSource: string;
    touchpointCount: number;
    journeyDuration: number;
  };
  paymentMethod?: string;
  discountApplied?: number;
  couponUsed?: string;
  conversionTime: Date;
  processingStatus: 'pending' | 'confirmed' | 'cancelled' | 'refunded';
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversionProduct {
  productId: string;
  productName: string;
  category: string;
  price: number;
  quantity: number;
  commission: number;
}

export interface TrafficReport {
  id: string;
  reportType: 'daily' | 'weekly' | 'monthly' | 'custom';
  startDate: Date;
  endDate: Date;
  generatedAt: Date;
  summary: {
    totalClicks: number;
    uniqueUsers: number;
    conversions: number;
    conversionRate: number;
    totalRevenue: number;
    totalCommission: number;
    averageOrderValue: number;
    returnOnAdSpend: number;
  };
  sourceBreakdown: Array<{
    source: string;
    clicks: number;
    conversions: number;
    revenue: number;
    commission: number;
  }>;
  storeBreakdown: Array<{
    storeId: string;
    storeName: string;
    clicks: number;
    conversions: number;
    revenue: number;
    commission: number;
  }>;
  timeSeriesData: Array<{
    timestamp: Date;
    clicks: number;
    conversions: number;
    revenue: number;
  }>;
  topPerformers: {
    topSources: Array<{ source: string; metric: number }>;
    topStores: Array<{ store: string; metric: number }>;
    topUsers: Array<{ userId: string; metric: number }>;
  };
  insights: string[];
  recommendations: string[];
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface ClickTrackingConfig {
  id: string;
  name: string;
  isEnabled: boolean;
  trackingDomains: string[];
  excludedDomains: string[];
  sessionTimeout: number; // в минутах
  enableGeoTracking: boolean;
  enableDeviceTracking: boolean;
  enableUtmTracking: boolean;
  enableJourneyTracking: boolean;
  dataRetentionDays: number;
  privacySettings: {
    anonymizeIp: boolean;
    respectDoNotTrack: boolean;
    gdprCompliant: boolean;
  };
  webhookUrls: string[];
  customFields: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
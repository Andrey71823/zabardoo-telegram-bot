export interface AffiliateLink {
  id: string;
  originalUrl: string;
  affiliateUrl: string;
  shortUrl?: string;
  telegramSubId: string;
  userId: string;
  couponId?: string;
  storeId: string;
  storeName: string;
  linkType: 'coupon' | 'offer' | 'direct';
  source: 'personal_channel' | 'group' | 'ai_recommendation' | 'search';
  metadata: {
    campaignId?: string;
    medium?: string;
    content?: string;
    term?: string;
    customParams?: Record<string, string>;
  };
  isActive: boolean;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface LinkClick {
  id: string;
  affiliateLinkId: string;
  userId: string;
  telegramSubId: string;
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
  clickedAt: Date;
  sessionId?: string;
  deviceInfo: {
    platform?: string;
    browser?: string;
    isMobile?: boolean;
    country?: string;
    city?: string;
  };
  conversionData?: {
    converted: boolean;
    orderId?: string;
    orderValue?: number;
    commission?: number;
    conversionTime?: Date;
  };
}

export interface AffiliateStore {
  id: string;
  name: string;
  domain: string;
  affiliateNetwork: string;
  trackingTemplate: string;
  subIdParameter: string;
  commissionRate: number;
  cookieDuration: number; // in days
  isActive: boolean;
  supportedCountries: string[];
  linkFormats: {
    coupon?: string;
    offer?: string;
    direct?: string;
  };
  customParameters?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

export interface LinkGeneration {
  id: string;
  userId: string;
  storeId: string;
  originalUrl: string;
  linkType: 'coupon' | 'offer' | 'direct';
  source: string;
  parameters: Record<string, any>;
  generatedLink?: string;
  status: 'pending' | 'generated' | 'failed';
  errorMessage?: string;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubIdMapping {
  telegramSubId: string;
  userId: string;
  channelId?: string;
  source: string;
  metadata: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  lastUsedAt?: Date;
}

export interface TrafficAttribution {
  id: string;
  telegramSubId: string;
  userId: string;
  affiliateLinkId: string;
  clickId: string;
  source: string;
  medium: string;
  campaign?: string;
  content?: string;
  term?: string;
  firstClick: Date;
  lastClick: Date;
  clickCount: number;
  conversionData?: {
    converted: boolean;
    orderId?: string;
    orderValue?: number;
    commission?: number;
    conversionTime?: Date;
    attributionModel: 'first_click' | 'last_click' | 'linear' | 'time_decay';
  };
  createdAt: Date;
  updatedAt: Date;
}
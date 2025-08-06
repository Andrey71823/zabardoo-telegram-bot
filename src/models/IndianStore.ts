export interface IndianStore {
  id: string;
  name: string;
  displayName: string;
  domain: string;
  logo: string;
  description: string;
  categories: string[];
  isPopular: boolean;
  popularityRank: number;
  region: 'national' | 'north' | 'south' | 'east' | 'west';
  languages: string[];
  paymentMethods: string[];
  deliveryInfo: {
    freeDeliveryThreshold?: number;
    deliveryTime: string;
    codAvailable: boolean;
    returnPolicy: string;
  };
  affiliateInfo: {
    network: string;
    commissionRate: number;
    cookieDuration: number;
    trackingTemplate: string;
    subIdParameter: string;
    apiEndpoint?: string;
    apiKey?: string;
  };
  specialFeatures: {
    hasApp: boolean;
    hasWallet: boolean;
    hasSubscription: boolean;
    hasLoyaltyProgram: boolean;
    supportsCrypto: boolean;
  };
  seasonalInfo: {
    peakSeasons: string[];
    majorSales: Array<{
      name: string;
      period: string;
      description: string;
    }>;
  };
  targetAudience: {
    ageGroups: string[];
    genders: string[];
    incomeGroups: string[];
    interests: string[];
  };
  metrics: {
    averageOrderValue: number;
    conversionRate: number;
    customerRating: number;
    monthlyVisitors: number;
    marketShare: number;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoreCategory {
  id: string;
  name: string;
  displayName: string;
  description: string;
  icon: string;
  parentCategoryId?: string;
  isPopularInIndia: boolean;
  localizedNames: Record<string, string>; // language code -> localized name
  stores: string[]; // store IDs that support this category
  seasonalTrends: Array<{
    season: string;
    popularityBoost: number;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface RegionalPreference {
  id: string;
  region: string;
  state?: string;
  city?: string;
  preferredStores: Array<{
    storeId: string;
    preferenceScore: number;
    reasons: string[];
  }>;
  preferredCategories: Array<{
    categoryId: string;
    preferenceScore: number;
    localTerms: string[];
  }>;
  preferredPaymentMethods: string[];
  averageOrderValues: Record<string, number>; // category -> AOV
  seasonalPatterns: Record<string, number>; // month -> activity multiplier
  languagePreferences: string[];
  culturalFactors: {
    festivals: string[];
    shoppingHabits: string[];
    pricesensitivity: number; // 1-10 scale
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface StoreIntegration {
  id: string;
  storeId: string;
  integrationType: 'api' | 'scraping' | 'manual' | 'feed';
  status: 'active' | 'inactive' | 'testing' | 'error';
  configuration: {
    apiEndpoint?: string;
    apiKey?: string;
    webhookUrl?: string;
    syncInterval: number; // minutes
    rateLimits: {
      requestsPerMinute: number;
      requestsPerHour: number;
    };
    retryPolicy: {
      maxRetries: number;
      backoffMultiplier: number;
    };
  };
  dataMapping: {
    productIdField: string;
    priceField: string;
    discountField: string;
    categoryField: string;
    imageField: string;
    urlField: string;
    customMappings: Record<string, string>;
  };
  lastSyncAt?: Date;
  nextSyncAt?: Date;
  syncStats: {
    totalProducts: number;
    successfulSyncs: number;
    failedSyncs: number;
    lastError?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface IndianMarketData {
  id: string;
  dataType: 'market_trends' | 'seasonal_patterns' | 'regional_preferences' | 'competitor_analysis';
  region?: string;
  category?: string;
  timeframe: {
    startDate: Date;
    endDate: Date;
  };
  data: {
    trends: Array<{
      metric: string;
      value: number;
      change: number;
      period: string;
    }>;
    insights: string[];
    recommendations: string[];
  };
  sources: string[];
  confidence: number; // 0-1 scale
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FestivalCalendar {
  id: string;
  name: string;
  displayName: string;
  description: string;
  date: Date;
  duration: number; // days
  regions: string[];
  significance: 'major' | 'regional' | 'minor';
  shoppingCategories: Array<{
    categoryId: string;
    popularityBoost: number;
    typicalDiscounts: number;
  }>;
  marketingTips: string[];
  historicalData: {
    averageTrafficIncrease: number;
    averageConversionIncrease: number;
    topPerformingStores: string[];
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
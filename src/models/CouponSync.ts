export interface CouponSync {
  id: string;
  externalId: string; // ID купона на внешнем сайте
  title: string;
  description: string;
  code?: string; // Промокод (если есть)
  discount: string;
  discountType: 'percentage' | 'fixed' | 'bogo' | 'free_shipping';
  discountValue?: number;
  store: string;
  storeId: string;
  category: string;
  categoryId: string;
  imageUrl?: string;
  affiliateUrl: string;
  originalUrl: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  isVerified: boolean;
  popularity: number;
  successRate: number; // Процент успешных активаций
  tags: string[];
  conditions?: string; // Условия использования
  minOrderValue?: number;
  maxDiscount?: number;
  usageLimit?: number;
  usedCount: number;
  source: 'website' | 'api' | 'manual' | 'scraping';
  lastSyncAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CouponSyncStatus {
  id: string;
  couponId: string;
  syncType: 'create' | 'update' | 'delete' | 'status_change';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  attempts: number;
  maxAttempts: number;
  nextRetryAt?: Date;
  syncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SyncConfiguration {
  id: string;
  name: string;
  endpoint: string;
  apiKey?: string;
  syncInterval: number; // в минутах
  isEnabled: boolean;
  lastSyncAt?: Date;
  nextSyncAt?: Date;
  syncFilters: {
    categories?: string[];
    stores?: string[];
    minDiscount?: number;
    onlyActive?: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface WebsiteCoupon {
  id: string;
  title: string;
  description: string;
  code?: string;
  discount: string;
  discountType: string;
  discountValue?: number;
  store: {
    id: string;
    name: string;
    logo?: string;
  };
  category: {
    id: string;
    name: string;
  };
  imageUrl?: string;
  affiliateUrl: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isVerified: boolean;
  conditions?: string;
  minOrderValue?: number;
  maxDiscount?: number;
  usageLimit?: number;
  usedCount: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}
export interface Coupon {
  id: string;
  title: string;
  description: string;
  code: string;
  discount: number;
  discountType: 'percentage' | 'fixed' | 'freeShipping';
  store: string;
  storeId: string;
  category: string;
  validFrom: Date;
  validTo: Date;
  usageLimit: number;
  usedCount: number;
  status: 'active' | 'inactive' | 'expired' | 'pending' | 'rejected';
  priority: number;
  tags: string[];
  affiliateLink: string;
  imageUrl?: string;
  termsAndConditions: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  moderatedBy?: string;
  moderatedAt?: Date;
  moderationNotes?: string;
  source: 'admin' | 'group' | 'api' | 'sync';
  isExclusive: boolean;
  isFeatured: boolean;
  clickCount: number;
  conversionCount: number;
  revenue: number;
}

export interface CouponFilter {
  status?: string[];
  store?: string[];
  category?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  createdBy?: string;
  source?: string[];
  isExclusive?: boolean;
  isFeatured?: boolean;
  search?: string;
  sortBy?: 'createdAt' | 'validTo' | 'priority' | 'clickCount' | 'revenue';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface CouponStats {
  total: number;
  active: number;
  inactive: number;
  expired: number;
  pending: number;
  rejected: number;
  totalClicks: number;
  totalConversions: number;
  totalRevenue: number;
  conversionRate: number;
  averageDiscount: number;
  topStores: Array<{
    store: string;
    count: number;
    revenue: number;
  }>;
  topCategories: Array<{
    category: string;
    count: number;
    revenue: number;
  }>;
}

export interface BulkOperation {
  operation: 'activate' | 'deactivate' | 'delete' | 'updateCategory' | 'updatePriority' | 'feature' | 'unfeature';
  couponIds: string[];
  parameters?: {
    category?: string;
    priority?: number;
    reason?: string;
  };
}

export interface ModerationAction {
  couponId: string;
  action: 'approve' | 'reject' | 'requestChanges';
  notes?: string;
  moderatorId: string;
  changes?: Partial<Coupon>;
}

export interface CouponTemplate {
  id: string;
  name: string;
  description: string;
  template: Partial<Coupon>;
  isDefault: boolean;
  createdBy: string;
  createdAt: Date;
}

export interface CouponValidation {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
  }>;
  warnings: Array<{
    field: string;
    message: string;
  }>;
}

export interface CouponImport {
  id: string;
  filename: string;
  status: 'processing' | 'completed' | 'failed';
  totalRows: number;
  processedRows: number;
  successCount: number;
  errorCount: number;
  errors: Array<{
    row: number;
    field: string;
    message: string;
  }>;
  createdBy: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface CouponExport {
  id: string;
  format: 'csv' | 'excel' | 'json';
  filters: CouponFilter;
  status: 'processing' | 'completed' | 'failed';
  filename?: string;
  downloadUrl?: string;
  createdBy: string;
  createdAt: Date;
  completedAt?: Date;
  expiresAt: Date;
}
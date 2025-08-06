import { CouponManagementService } from '../services/admin/CouponManagementService';
import { CouponManagementRepository } from '../repositories/CouponManagementRepository';
import { 
  Coupon, 
  CouponFilter, 
  BulkOperation, 
  ModerationAction 
} from '../models/CouponManagement';

// Mock the repository
jest.mock('../repositories/CouponManagementRepository');

describe('CouponManagementService', () => {
  let service: CouponManagementService;
  let mockRepository: jest.Mocked<CouponManagementRepository>;

  beforeEach(() => {
    service = new CouponManagementService();
    mockRepository = service['repository'] as jest.Mocked<CouponManagementRepository>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createCoupon', () => {
    it('should create a coupon successfully', async () => {
      const couponData = {
        title: 'Test Coupon',
        description: 'Test Description',
        code: 'TEST123',
        discount: 50,
        discountType: 'percentage' as const,
        store: 'TestStore',
        storeId: 'test-store-1',
        category: 'Electronics',
        validFrom: new Date(),
        validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usageLimit: 100,
        usedCount: 0,
        status: 'pending' as const,
        priority: 5,
        tags: ['test'],
        affiliateLink: 'https://example.com/affiliate',
        termsAndConditions: 'Test terms',
        createdBy: 'admin',
        source: 'admin' as const,
        isExclusive: false,
        isFeatured: false,
        clickCount: 0,
        conversionCount: 0,
        revenue: 0
      };

      const expectedCoupon: Coupon = {
        ...couponData,
        id: 'test-coupon-id',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRepository.createCoupon.mockResolvedValue(expectedCoupon);

      const result = await service.createCoupon(couponData);

      expect(result).toEqual(expectedCoupon);
      expect(mockRepository.createCoupon).toHaveBeenCalledWith(
        expect.objectContaining(couponData)
      );
    });

    it('should throw error for invalid coupon data', async () => {
      const invalidCouponData = {
        title: '', // Invalid: empty title
        description: 'Test Description',
        code: 'TEST123',
        discount: -10, // Invalid: negative discount
        discountType: 'percentage' as const,
        store: 'TestStore',
        storeId: 'test-store-1',
        category: 'Electronics',
        validFrom: new Date(),
        validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usageLimit: 100,
        usedCount: 0,
        status: 'pending' as const,
        priority: 5,
        tags: ['test'],
        affiliateLink: 'invalid-url', // Invalid: not a proper URL
        termsAndConditions: 'Test terms',
        createdBy: 'admin',
        source: 'admin' as const,
        isExclusive: false,
        isFeatured: false,
        clickCount: 0,
        conversionCount: 0,
        revenue: 0
      };

      await expect(service.createCoupon(invalidCouponData)).rejects.toThrow();
    });
  });

  describe('getCoupons', () => {
    it('should retrieve coupons with filters', async () => {
      const filter: CouponFilter = {
        status: ['active'],
        store: ['TestStore'],
        limit: 10,
        page: 1
      };

      const mockResponse = {
        coupons: [
          {
            id: 'coupon-1',
            title: 'Test Coupon 1',
            description: 'Description 1',
            code: 'TEST1',
            discount: 10,
            discountType: 'percentage' as const,
            store: 'TestStore',
            storeId: 'test-store-1',
            category: 'Electronics',
            validFrom: new Date(),
            validTo: new Date(),
            usageLimit: 100,
            usedCount: 5,
            status: 'active' as const,
            priority: 5,
            tags: ['test'],
            affiliateLink: 'https://example.com/1',
            termsAndConditions: 'Terms 1',
            createdBy: 'admin',
            createdAt: new Date(),
            updatedAt: new Date(),
            source: 'admin' as const,
            isExclusive: false,
            isFeatured: false,
            clickCount: 50,
            conversionCount: 5,
            revenue: 100
          }
        ],
        total: 1,
        page: 1,
        totalPages: 1
      };

      mockRepository.getCoupons.mockResolvedValue(mockResponse);

      const result = await service.getCoupons(filter);

      expect(result).toEqual(mockResponse);
      expect(mockRepository.getCoupons).toHaveBeenCalledWith(filter);
    });
  });

  describe('updateCoupon', () => {
    it('should update a coupon successfully', async () => {
      const couponId = 'test-coupon-id';
      const updates = {
        title: 'Updated Title',
        discount: 60,
        priority: 8
      };

      const existingCoupon: Coupon = {
        id: couponId,
        title: 'Original Title',
        description: 'Test Description',
        code: 'TEST123',
        discount: 50,
        discountType: 'percentage',
        store: 'TestStore',
        storeId: 'test-store-1',
        category: 'Electronics',
        validFrom: new Date(),
        validTo: new Date(),
        usageLimit: 100,
        usedCount: 0,
        status: 'active',
        priority: 5,
        tags: ['test'],
        affiliateLink: 'https://example.com/affiliate',
        termsAndConditions: 'Test terms',
        createdBy: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
        source: 'admin',
        isExclusive: false,
        isFeatured: false,
        clickCount: 0,
        conversionCount: 0,
        revenue: 0
      };

      const updatedCoupon: Coupon = {
        ...existingCoupon,
        ...updates,
        updatedAt: new Date()
      };

      mockRepository.getCouponById.mockResolvedValue(existingCoupon);
      mockRepository.updateCoupon.mockResolvedValue(updatedCoupon);

      const result = await service.updateCoupon(couponId, updates);

      expect(result).toEqual(updatedCoupon);
      expect(mockRepository.getCouponById).toHaveBeenCalledWith(couponId);
      expect(mockRepository.updateCoupon).toHaveBeenCalledWith(couponId, updates);
    });

    it('should throw error when coupon not found', async () => {
      const couponId = 'non-existent-id';
      const updates = { title: 'Updated Title' };

      mockRepository.getCouponById.mockResolvedValue(null);

      await expect(service.updateCoupon(couponId, updates)).rejects.toThrow('Coupon not found');
    });
  });

  describe('deleteCoupon', () => {
    it('should delete a coupon successfully', async () => {
      const couponId = 'test-coupon-id';

      mockRepository.deleteCoupon.mockResolvedValue(true);

      const result = await service.deleteCoupon(couponId);

      expect(result).toBe(true);
      expect(mockRepository.deleteCoupon).toHaveBeenCalledWith(couponId);
    });
  });

  describe('getCouponStats', () => {
    it('should retrieve coupon statistics', async () => {
      const mockStats = {
        total: 100,
        active: 80,
        inactive: 10,
        expired: 5,
        pending: 3,
        rejected: 2,
        totalClicks: 1000,
        totalConversions: 100,
        totalRevenue: 5000,
        conversionRate: 10,
        averageDiscount: 25,
        topStores: [
          { store: 'Store1', count: 50, revenue: 2500 },
          { store: 'Store2', count: 30, revenue: 1500 }
        ],
        topCategories: [
          { category: 'Electronics', count: 40, revenue: 2000 },
          { category: 'Fashion', count: 35, revenue: 1750 }
        ]
      };

      mockRepository.getCouponStats.mockResolvedValue(mockStats);

      const result = await service.getCouponStats();

      expect(result).toEqual(mockStats);
      expect(mockRepository.getCouponStats).toHaveBeenCalled();
    });
  });

  describe('performBulkOperation', () => {
    it('should perform bulk activation successfully', async () => {
      const bulkOperation: BulkOperation = {
        operation: 'activate',
        couponIds: ['coupon-1', 'coupon-2', 'coupon-3']
      };

      const mockResult = {
        success: 3,
        failed: 0,
        errors: []
      };

      mockRepository.performBulkOperation.mockResolvedValue(mockResult);

      const result = await service.performBulkOperation(bulkOperation);

      expect(result).toEqual(mockResult);
      expect(mockRepository.performBulkOperation).toHaveBeenCalledWith(bulkOperation);
    });

    it('should throw error for empty coupon IDs', async () => {
      const bulkOperation: BulkOperation = {
        operation: 'activate',
        couponIds: []
      };

      await expect(service.performBulkOperation(bulkOperation)).rejects.toThrow(
        'No coupon IDs provided for bulk operation'
      );
    });
  });

  describe('moderateCoupon', () => {
    it('should approve a coupon successfully', async () => {
      const moderationAction: ModerationAction = {
        couponId: 'test-coupon-id',
        action: 'approve',
        moderatorId: 'admin-123',
        notes: 'Approved after review'
      };

      const moderatedCoupon: Coupon = {
        id: 'test-coupon-id',
        title: 'Test Coupon',
        description: 'Test Description',
        code: 'TEST123',
        discount: 50,
        discountType: 'percentage',
        store: 'TestStore',
        storeId: 'test-store-1',
        category: 'Electronics',
        validFrom: new Date(),
        validTo: new Date(),
        usageLimit: 100,
        usedCount: 0,
        status: 'active',
        priority: 5,
        tags: ['test'],
        affiliateLink: 'https://example.com/affiliate',
        termsAndConditions: 'Test terms',
        createdBy: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
        moderatedBy: 'admin-123',
        moderatedAt: new Date(),
        moderationNotes: 'Approved after review',
        source: 'admin',
        isExclusive: false,
        isFeatured: false,
        clickCount: 0,
        conversionCount: 0,
        revenue: 0
      };

      mockRepository.moderateCoupon.mockResolvedValue(moderatedCoupon);

      const result = await service.moderateCoupon(moderationAction);

      expect(result).toEqual(moderatedCoupon);
      expect(mockRepository.moderateCoupon).toHaveBeenCalledWith(moderationAction);
    });

    it('should throw error when rejecting without notes', async () => {
      const moderationAction: ModerationAction = {
        couponId: 'test-coupon-id',
        action: 'reject',
        moderatorId: 'admin-123'
        // Missing notes for rejection
      };

      await expect(service.moderateCoupon(moderationAction)).rejects.toThrow(
        'Rejection reason is required'
      );
    });

    it('should throw error when moderator ID is missing', async () => {
      const moderationAction: ModerationAction = {
        couponId: 'test-coupon-id',
        action: 'approve',
        moderatorId: '', // Empty moderator ID
        notes: 'Test notes'
      };

      await expect(service.moderateCoupon(moderationAction)).rejects.toThrow(
        'Moderator ID is required'
      );
    });
  });

  describe('validateCoupon', () => {
    it('should validate a correct coupon', async () => {
      const validCoupon = {
        title: 'Valid Coupon',
        description: 'Valid Description',
        store: 'ValidStore',
        category: 'Electronics',
        affiliateLink: 'https://example.com/valid',
        createdBy: 'admin',
        discount: 25,
        discountType: 'percentage' as const,
        validFrom: new Date(),
        validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usageLimit: 100,
        priority: 5
      };

      const result = await service.validateCoupon(validCoupon);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect validation errors', async () => {
      const invalidCoupon = {
        title: '', // Invalid: empty
        description: 'Valid Description',
        store: '', // Invalid: empty
        category: 'Electronics',
        affiliateLink: 'invalid-url', // Invalid: not a URL
        createdBy: 'admin',
        discount: -10, // Invalid: negative
        discountType: 'percentage' as const,
        validFrom: new Date(Date.now() + 24 * 60 * 60 * 1000),
        validTo: new Date(), // Invalid: before validFrom
        usageLimit: -5, // Invalid: negative
        priority: 15 // Warning: outside recommended range
      };

      const result = await service.validateCoupon(invalidCoupon);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('getCouponTemplates', () => {
    it('should return predefined templates', async () => {
      const result = await service.getCouponTemplates();

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('Percentage Discount');
      expect(result[1].name).toBe('Fixed Amount Discount');
      expect(result[2].name).toBe('Free Shipping');
    });
  });

  describe('duplicateCoupon', () => {
    it('should duplicate a coupon successfully', async () => {
      const originalCouponId = 'original-coupon-id';
      const createdBy = 'admin-123';

      const originalCoupon: Coupon = {
        id: originalCouponId,
        title: 'Original Coupon',
        description: 'Original Description',
        code: 'ORIGINAL123',
        discount: 50,
        discountType: 'percentage',
        store: 'TestStore',
        storeId: 'test-store-1',
        category: 'Electronics',
        validFrom: new Date(),
        validTo: new Date(),
        usageLimit: 100,
        usedCount: 10,
        status: 'active',
        priority: 5,
        tags: ['original'],
        affiliateLink: 'https://example.com/original',
        termsAndConditions: 'Original terms',
        createdBy: 'original-admin',
        createdAt: new Date(),
        updatedAt: new Date(),
        source: 'admin',
        isExclusive: false,
        isFeatured: true,
        clickCount: 100,
        conversionCount: 10,
        revenue: 500
      };

      const duplicatedCoupon: Coupon = {
        ...originalCoupon,
        id: 'duplicated-coupon-id',
        title: 'Original Coupon (Copy)',
        code: 'ORIGINAL123_COPY_1234567890',
        status: 'pending',
        createdBy,
        usedCount: 0,
        clickCount: 0,
        conversionCount: 0,
        revenue: 0,
        moderatedBy: undefined,
        moderatedAt: undefined,
        moderationNotes: undefined,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRepository.getCouponById.mockResolvedValue(originalCoupon);
      mockRepository.createCoupon.mockResolvedValue(duplicatedCoupon);

      const result = await service.duplicateCoupon(originalCouponId, createdBy);

      expect(result).toEqual(duplicatedCoupon);
      expect(mockRepository.getCouponById).toHaveBeenCalledWith(originalCouponId);
      expect(mockRepository.createCoupon).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Original Coupon (Copy)',
          createdBy,
          status: 'pending',
          usedCount: 0,
          clickCount: 0,
          conversionCount: 0,
          revenue: 0
        })
      );
    });

    it('should throw error when original coupon not found', async () => {
      const originalCouponId = 'non-existent-id';
      const createdBy = 'admin-123';

      mockRepository.getCouponById.mockResolvedValue(null);

      await expect(service.duplicateCoupon(originalCouponId, createdBy)).rejects.toThrow(
        'Original coupon not found'
      );
    });
  });

  describe('getCouponPerformance', () => {
    it('should calculate coupon performance metrics', async () => {
      const couponId = 'test-coupon-id';

      const coupon: Coupon = {
        id: couponId,
        title: 'Performance Test Coupon',
        description: 'Test Description',
        code: 'PERF123',
        discount: 50,
        discountType: 'percentage',
        store: 'TestStore',
        storeId: 'test-store-1',
        category: 'Electronics',
        validFrom: new Date(),
        validTo: new Date(),
        usageLimit: 1000,
        usedCount: 500,
        status: 'active',
        priority: 5,
        tags: ['performance'],
        affiliateLink: 'https://example.com/perf',
        termsAndConditions: 'Performance terms',
        createdBy: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
        source: 'admin',
        isExclusive: false,
        isFeatured: false,
        clickCount: 200,
        conversionCount: 50,
        revenue: 2500
      };

      mockRepository.getCouponById.mockResolvedValue(coupon);

      const result = await service.getCouponPerformance(couponId);

      expect(result.coupon).toEqual(coupon);
      expect(result.metrics.clickThroughRate).toBe(40); // 200/500 * 100
      expect(result.metrics.conversionRate).toBe(25); // 50/200 * 100
      expect(result.metrics.revenuePerClick).toBe(12.5); // 2500/200
      expect(result.metrics.averageOrderValue).toBe(50); // 2500/50
      expect(result.metrics.totalRevenue).toBe(2500);
    });

    it('should handle zero values in performance calculations', async () => {
      const couponId = 'test-coupon-id';

      const coupon: Coupon = {
        id: couponId,
        title: 'Zero Performance Coupon',
        description: 'Test Description',
        code: 'ZERO123',
        discount: 50,
        discountType: 'percentage',
        store: 'TestStore',
        storeId: 'test-store-1',
        category: 'Electronics',
        validFrom: new Date(),
        validTo: new Date(),
        usageLimit: 1000,
        usedCount: 0,
        status: 'active',
        priority: 5,
        tags: ['zero'],
        affiliateLink: 'https://example.com/zero',
        termsAndConditions: 'Zero terms',
        createdBy: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
        source: 'admin',
        isExclusive: false,
        isFeatured: false,
        clickCount: 0,
        conversionCount: 0,
        revenue: 0
      };

      mockRepository.getCouponById.mockResolvedValue(coupon);

      const result = await service.getCouponPerformance(couponId);

      expect(result.metrics.clickThroughRate).toBe(0);
      expect(result.metrics.conversionRate).toBe(0);
      expect(result.metrics.revenuePerClick).toBe(0);
      expect(result.metrics.averageOrderValue).toBe(0);
      expect(result.metrics.totalRevenue).toBe(0);
    });
  });

  describe('searchCoupons', () => {
    it('should search coupons by query', async () => {
      const query = 'electronics';
      const limit = 10;

      const mockSearchResults = {
        coupons: [
          {
            id: 'search-result-1',
            title: 'Electronics Discount',
            description: 'Great electronics deals',
            code: 'ELEC123',
            discount: 30,
            discountType: 'percentage' as const,
            store: 'ElectronicsStore',
            storeId: 'electronics-store-1',
            category: 'Electronics',
            validFrom: new Date(),
            validTo: new Date(),
            usageLimit: 100,
            usedCount: 0,
            status: 'active' as const,
            priority: 5,
            tags: ['electronics'],
            affiliateLink: 'https://example.com/electronics',
            termsAndConditions: 'Electronics terms',
            createdBy: 'admin',
            createdAt: new Date(),
            updatedAt: new Date(),
            source: 'admin' as const,
            isExclusive: false,
            isFeatured: false,
            clickCount: 0,
            conversionCount: 0,
            revenue: 0
          }
        ],
        total: 1,
        page: 1,
        totalPages: 1
      };

      mockRepository.getCoupons.mockResolvedValue(mockSearchResults);

      const result = await service.searchCoupons(query, limit);

      expect(result).toEqual(mockSearchResults.coupons);
      expect(mockRepository.getCoupons).toHaveBeenCalledWith({
        search: query,
        limit,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
    });
  });
});
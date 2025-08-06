import { CouponSyncService } from '../services/coupon/CouponSyncService';
import { CouponSyncRepository } from '../repositories/CouponSyncRepository';
import { CouponSync, SyncConfiguration, WebsiteCoupon } from '../models/CouponSync';
import { Logger } from '../config/logger';

// Mock dependencies
jest.mock('../repositories/CouponSyncRepository');
jest.mock('../config/logger');
jest.mock('axios');

describe('CouponSyncService', () => {
  let couponSyncService: CouponSyncService;
  let mockCouponSyncRepository: jest.Mocked<CouponSyncRepository>;
  let mockLogger: jest.Mocked<Logger>;

  const mockSyncConfig: SyncConfiguration = {
    id: 'config-1',
    name: 'Test API',
    endpoint: 'https://api.example.com/coupons',
    apiKey: 'test-key',
    syncInterval: 30,
    isEnabled: true,
    syncFilters: {
      categories: ['electronics'],
      onlyActive: true
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockWebsiteCoupon: WebsiteCoupon = {
    id: 'coupon-1',
    title: 'Test Coupon',
    description: 'Test Description',
    code: 'TEST50',
    discount: '50% OFF',
    discountType: 'percentage',
    discountValue: 50,
    store: {
      id: 'store-1',
      name: 'Test Store'
    },
    category: {
      id: 'cat-1',
      name: 'Electronics'
    },
    affiliateUrl: 'https://example.com/affiliate',
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    isActive: true,
    isVerified: true,
    tags: ['electronics', 'discount'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  beforeEach(() => {
    mockCouponSyncRepository = new CouponSyncRepository(null as any) as jest.Mocked<CouponSyncRepository>;
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    } as any;

    couponSyncService = new CouponSyncService(mockCouponSyncRepository, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('syncAllConfigurations', () => {
    it('should sync all active configurations', async () => {
      // Arrange
      mockCouponSyncRepository.getActiveSyncConfigs.mockResolvedValue([mockSyncConfig]);
      
      // Mock HTTP request
      const axios = require('axios');
      axios.create.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          status: 200,
          data: [mockWebsiteCoupon]
        })
      });

      mockCouponSyncRepository.getCouponByExternalId.mockResolvedValue(null);
      mockCouponSyncRepository.createCoupon.mockResolvedValue({
        id: 'new-coupon-id',
        ...mockWebsiteCoupon
      } as any);
      mockCouponSyncRepository.createSyncStatus.mockResolvedValue({} as any);
      mockCouponSyncRepository.updateSyncConfig.mockResolvedValue(mockSyncConfig);

      // Act
      await couponSyncService.syncAllConfigurations();

      // Assert
      expect(mockCouponSyncRepository.getActiveSyncConfigs).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Starting sync for 1 configurations');
      expect(mockCouponSyncRepository.createCoupon).toHaveBeenCalled();
      expect(mockCouponSyncRepository.updateSyncConfig).toHaveBeenCalled();
    });

    it('should handle sync errors gracefully', async () => {
      // Arrange
      mockCouponSyncRepository.getActiveSyncConfigs.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(couponSyncService.syncAllConfigurations()).rejects.toThrow('Database error');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to sync configurations:', expect.any(Error));
    });
  });

  describe('syncConfiguration', () => {
    it('should create new coupon when it does not exist', async () => {
      // Arrange
      const axios = require('axios');
      axios.create.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          status: 200,
          data: [mockWebsiteCoupon]
        })
      });

      mockCouponSyncRepository.getCouponByExternalId.mockResolvedValue(null);
      mockCouponSyncRepository.createCoupon.mockResolvedValue({
        id: 'new-coupon-id',
        ...mockWebsiteCoupon
      } as any);
      mockCouponSyncRepository.createSyncStatus.mockResolvedValue({} as any);
      mockCouponSyncRepository.updateSyncConfig.mockResolvedValue(mockSyncConfig);

      // Act
      await couponSyncService.syncConfiguration(mockSyncConfig);

      // Assert
      expect(mockCouponSyncRepository.createCoupon).toHaveBeenCalledWith(
        expect.objectContaining({
          externalId: mockWebsiteCoupon.id,
          title: mockWebsiteCoupon.title,
          source: 'api'
        })
      );
      expect(mockCouponSyncRepository.createSyncStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          syncType: 'create',
          status: 'completed'
        })
      );
    });

    it('should update existing coupon when changes detected', async () => {
      // Arrange
      const existingCoupon: CouponSync = {
        id: 'existing-id',
        externalId: mockWebsiteCoupon.id,
        title: 'Old Title', // Different title to trigger update
        description: mockWebsiteCoupon.description,
        discount: mockWebsiteCoupon.discount,
        discountType: 'percentage',
        store: mockWebsiteCoupon.store.name,
        storeId: mockWebsiteCoupon.store.id,
        category: mockWebsiteCoupon.category.name,
        categoryId: mockWebsiteCoupon.category.id,
        affiliateUrl: mockWebsiteCoupon.affiliateUrl,
        originalUrl: mockWebsiteCoupon.affiliateUrl,
        startDate: new Date(mockWebsiteCoupon.startDate),
        endDate: new Date(mockWebsiteCoupon.endDate),
        isActive: mockWebsiteCoupon.isActive,
        isVerified: mockWebsiteCoupon.isVerified,
        popularity: 0,
        successRate: 0,
        tags: mockWebsiteCoupon.tags,
        usedCount: 0,
        source: 'api',
        lastSyncAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const axios = require('axios');
      axios.create.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          status: 200,
          data: [mockWebsiteCoupon]
        })
      });

      mockCouponSyncRepository.getCouponByExternalId.mockResolvedValue(existingCoupon);
      mockCouponSyncRepository.updateCoupon.mockResolvedValue({
        ...existingCoupon,
        title: mockWebsiteCoupon.title
      });
      mockCouponSyncRepository.createSyncStatus.mockResolvedValue({} as any);
      mockCouponSyncRepository.updateSyncConfig.mockResolvedValue(mockSyncConfig);

      // Act
      await couponSyncService.syncConfiguration(mockSyncConfig);

      // Assert
      expect(mockCouponSyncRepository.updateCoupon).toHaveBeenCalledWith(
        existingCoupon.id,
        expect.objectContaining({
          title: mockWebsiteCoupon.title,
          lastSyncAt: expect.any(Date)
        })
      );
      expect(mockCouponSyncRepository.createSyncStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          couponId: existingCoupon.id,
          syncType: 'update',
          status: 'completed'
        })
      );
    });

    it('should skip coupon when no changes detected', async () => {
      // Arrange
      const existingCoupon: CouponSync = {
        id: 'existing-id',
        externalId: mockWebsiteCoupon.id,
        title: mockWebsiteCoupon.title,
        description: mockWebsiteCoupon.description,
        discount: mockWebsiteCoupon.discount,
        discountType: 'percentage',
        store: mockWebsiteCoupon.store.name,
        storeId: mockWebsiteCoupon.store.id,
        category: mockWebsiteCoupon.category.name,
        categoryId: mockWebsiteCoupon.category.id,
        affiliateUrl: mockWebsiteCoupon.affiliateUrl,
        originalUrl: mockWebsiteCoupon.affiliateUrl,
        startDate: new Date(mockWebsiteCoupon.startDate),
        endDate: new Date(mockWebsiteCoupon.endDate),
        isActive: mockWebsiteCoupon.isActive,
        isVerified: mockWebsiteCoupon.isVerified,
        popularity: 0,
        successRate: 0,
        tags: mockWebsiteCoupon.tags,
        usedCount: 0,
        source: 'api',
        lastSyncAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const axios = require('axios');
      axios.create.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          status: 200,
          data: [mockWebsiteCoupon]
        })
      });

      mockCouponSyncRepository.getCouponByExternalId.mockResolvedValue(existingCoupon);
      mockCouponSyncRepository.updateSyncConfig.mockResolvedValue(mockSyncConfig);

      // Act
      await couponSyncService.syncConfiguration(mockSyncConfig);

      // Assert
      expect(mockCouponSyncRepository.updateCoupon).not.toHaveBeenCalled();
      expect(mockCouponSyncRepository.createCoupon).not.toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      // Arrange
      const axios = require('axios');
      axios.create.mockReturnValue({
        get: jest.fn().mockRejectedValue(new Error('API Error'))
      });

      // Act & Assert
      await expect(couponSyncService.syncConfiguration(mockSyncConfig)).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to sync configuration'),
        expect.any(Error)
      );
    });
  });

  describe('retryFailedSyncs', () => {
    it('should retry failed sync tasks', async () => {
      // Arrange
      const failedSync = {
        id: 'sync-1',
        couponId: 'coupon-1',
        syncType: 'create' as const,
        status: 'failed' as const,
        attempts: 1,
        maxAttempts: 3,
        errorMessage: 'Previous error',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockCouponSyncRepository.getPendingSyncTasks.mockResolvedValue([failedSync]);
      mockCouponSyncRepository.updateSyncStatus.mockResolvedValue({} as any);

      // Act
      await couponSyncService.retryFailedSyncs();

      // Assert
      expect(mockCouponSyncRepository.getPendingSyncTasks).toHaveBeenCalledWith(50);
      expect(mockCouponSyncRepository.updateSyncStatus).toHaveBeenCalledWith(
        failedSync.id,
        expect.objectContaining({
          status: 'processing',
          attempts: 2
        })
      );
    });

    it('should mark task as failed when max attempts exceeded', async () => {
      // Arrange
      const failedSync = {
        id: 'sync-1',
        couponId: 'coupon-1',
        syncType: 'create' as const,
        status: 'failed' as const,
        attempts: 2,
        maxAttempts: 3,
        errorMessage: 'Previous error',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockCouponSyncRepository.getPendingSyncTasks.mockResolvedValue([failedSync]);
      mockCouponSyncRepository.updateSyncStatus.mockResolvedValue({} as any);

      // Act
      await couponSyncService.retryFailedSyncs();

      // Assert
      expect(mockCouponSyncRepository.updateSyncStatus).toHaveBeenCalledWith(
        failedSync.id,
        expect.objectContaining({
          status: 'failed',
          attempts: 3,
          errorMessage: 'Max attempts (3) exceeded'
        })
      );
    });
  });

  describe('getSyncStats', () => {
    it('should return sync statistics', async () => {
      // Act
      const stats = await couponSyncService.getSyncStats();

      // Assert
      expect(stats).toEqual({
        totalCoupons: 0,
        activeCoupons: 0,
        pendingSyncs: 0,
        failedSyncs: 0
      });
    });
  });
});
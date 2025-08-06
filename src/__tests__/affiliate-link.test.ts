import { AffiliateLinkService } from '../services/affiliate/AffiliateLinkService';
import { AffiliateLinkRepository } from '../repositories/AffiliateLinkRepository';
import { AffiliateLink, AffiliateStore } from '../models/AffiliateLink';
import { Logger } from '../config/logger';

// Mock dependencies
jest.mock('../repositories/AffiliateLinkRepository');
jest.mock('../config/logger');

describe('AffiliateLinkService', () => {
  let affiliateLinkService: AffiliateLinkService;
  let mockAffiliateLinkRepository: jest.Mocked<AffiliateLinkRepository>;
  let mockLogger: jest.Mocked<Logger>;

  const mockStore: AffiliateStore = {
    id: 'store-1',
    name: 'Test Store',
    domain: 'teststore.com',
    affiliateNetwork: 'Test Network',
    trackingTemplate: 'https://affiliate.teststore.com/track?url={original_url}&subid={sub_id}',
    subIdParameter: 'subid',
    commissionRate: 5.0,
    cookieDuration: 30,
    isActive: true,
    supportedCountries: ['IN'],
    linkFormats: {
      coupon: 'https://teststore.com/coupon/{coupon_id}?subid={sub_id}',
      offer: 'https://teststore.com/offer/{offer_id}?subid={sub_id}',
      direct: '{original_url}?subid={sub_id}'
    },
    customParameters: {
      'partner': 'zabardoo',
      'source': 'telegram'
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    mockAffiliateLinkRepository = new AffiliateLinkRepository(null as any) as jest.Mocked<AffiliateLinkRepository>;
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    } as any;

    affiliateLinkService = new AffiliateLinkService(mockAffiliateLinkRepository, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateTelegramSubId', () => {
    it('should generate unique SubID with correct format', () => {
      const userId = 'user-123';
      const source = 'personal_channel';
      const channelId = 'channel-456';

      const subId = affiliateLinkService.generateTelegramSubId(userId, source, channelId);

      expect(subId).toMatch(/^tg_[a-f0-9]{8}_[a-f0-9]{4}_[a-f0-9]{4}_[a-z0-9]+$/);
      expect(subId).toContain('tg_');
    });

    it('should generate different SubIDs for different inputs', () => {
      const subId1 = affiliateLinkService.generateTelegramSubId('user-1', 'source-1');
      const subId2 = affiliateLinkService.generateTelegramSubId('user-2', 'source-2');

      expect(subId1).not.toBe(subId2);
    });

    it('should handle missing channelId', () => {
      const subId = affiliateLinkService.generateTelegramSubId('user-123', 'group');

      expect(subId).toMatch(/^tg_[a-f0-9]{8}_[a-f0-9]{4}_gen_[a-z0-9]+$/);
    });
  });

  describe('generateAffiliateLink', () => {
    it('should generate affiliate link successfully', async () => {
      // Arrange
      const params = {
        userId: 'user-123',
        originalUrl: 'https://teststore.com/product/123',
        storeId: 'store-1',
        couponId: 'coupon-456',
        linkType: 'coupon' as const,
        source: 'personal_channel' as const,
        channelId: 'channel-789',
        metadata: { campaign: 'test' }
      };

      const expectedAffiliateLink: AffiliateLink = {
        id: 'link-1',
        originalUrl: params.originalUrl,
        affiliateUrl: 'https://affiliate.teststore.com/track?url=https%3A%2F%2Fteststore.com%2Fproduct%2F123&subid=test_subid',
        shortUrl: 'https://zabardoo.com/l/12345678',
        telegramSubId: 'test_subid',
        userId: params.userId,
        couponId: params.couponId,
        storeId: params.storeId,
        storeName: mockStore.name,
        linkType: params.linkType,
        source: params.source,
        metadata: params.metadata,
        isActive: true,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockAffiliateLinkRepository.getAffiliateStoreById.mockResolvedValue(mockStore);
      mockAffiliateLinkRepository.createSubIdMapping.mockResolvedValue({} as any);
      mockAffiliateLinkRepository.createAffiliateLink.mockResolvedValue(expectedAffiliateLink);

      // Act
      const result = await affiliateLinkService.generateAffiliateLink(params);

      // Assert
      expect(result).toEqual(expectedAffiliateLink);
      expect(mockAffiliateLinkRepository.getAffiliateStoreById).toHaveBeenCalledWith(params.storeId);
      expect(mockAffiliateLinkRepository.createSubIdMapping).toHaveBeenCalled();
      expect(mockAffiliateLinkRepository.createAffiliateLink).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Generated affiliate link')
      );
    });

    it('should throw error when store not found', async () => {
      // Arrange
      const params = {
        userId: 'user-123',
        originalUrl: 'https://teststore.com/product/123',
        storeId: 'invalid-store',
        linkType: 'coupon' as const,
        source: 'personal_channel' as const
      };

      mockAffiliateLinkRepository.getAffiliateStoreById.mockResolvedValue(null);

      // Act & Assert
      await expect(affiliateLinkService.generateAffiliateLink(params)).rejects.toThrow('Store not found: invalid-store');
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const params = {
        userId: 'user-123',
        originalUrl: 'invalid-url',
        storeId: 'store-1',
        linkType: 'coupon' as const,
        source: 'personal_channel' as const
      };

      mockAffiliateLinkRepository.getAffiliateStoreById.mockResolvedValue(mockStore);

      // Act & Assert
      await expect(affiliateLinkService.generateAffiliateLink(params)).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to generate affiliate link:',
        expect.any(Error)
      );
    });
  });

  describe('trackLinkClick', () => {
    it('should track link click successfully', async () => {
      // Arrange
      const params = {
        telegramSubId: 'test_subid',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        referrer: 'https://t.me',
        sessionId: 'session-123',
        deviceInfo: { platform: 'mobile', browser: 'chrome' }
      };

      const mockAffiliateLink: AffiliateLink = {
        id: 'link-1',
        userId: 'user-123',
        telegramSubId: params.telegramSubId,
        originalUrl: 'https://teststore.com/product/123',
        affiliateUrl: 'https://affiliate.teststore.com/track',
        storeId: 'store-1',
        storeName: 'Test Store',
        linkType: 'coupon',
        source: 'personal_channel',
        metadata: {},
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const expectedLinkClick = {
        id: 'click-1',
        affiliateLinkId: mockAffiliateLink.id,
        userId: mockAffiliateLink.userId,
        telegramSubId: params.telegramSubId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        referrer: params.referrer,
        sessionId: params.sessionId,
        deviceInfo: params.deviceInfo,
        conversionData: { converted: false },
        clickedAt: new Date()
      };

      mockAffiliateLinkRepository.getAffiliateLinkBySubId.mockResolvedValue(mockAffiliateLink);
      mockAffiliateLinkRepository.updateSubIdLastUsed.mockResolvedValue();
      mockAffiliateLinkRepository.recordLinkClick.mockResolvedValue(expectedLinkClick);

      // Act
      const result = await affiliateLinkService.trackLinkClick(params);

      // Assert
      expect(result).toEqual(expectedLinkClick);
      expect(mockAffiliateLinkRepository.getAffiliateLinkBySubId).toHaveBeenCalledWith(params.telegramSubId);
      expect(mockAffiliateLinkRepository.updateSubIdLastUsed).toHaveBeenCalledWith(params.telegramSubId);
      expect(mockAffiliateLinkRepository.recordLinkClick).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Tracked click for SubID')
      );
    });

    it('should return null when affiliate link not found', async () => {
      // Arrange
      const params = {
        telegramSubId: 'invalid_subid'
      };

      mockAffiliateLinkRepository.getAffiliateLinkBySubId.mockResolvedValue(null);

      // Act
      const result = await affiliateLinkService.trackLinkClick(params);

      // Assert
      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Affiliate link not found for SubID: invalid_subid'
      );
    });
  });

  describe('updateConversion', () => {
    it('should update conversion successfully', async () => {
      // Arrange
      const params = {
        telegramSubId: 'test_subid',
        orderId: 'order-123',
        orderValue: 1000,
        commission: 50,
        conversionTime: new Date()
      };

      const mockAffiliateLink: AffiliateLink = {
        id: 'link-1',
        userId: 'user-123',
        telegramSubId: params.telegramSubId,
        originalUrl: 'https://teststore.com/product/123',
        affiliateUrl: 'https://affiliate.teststore.com/track',
        storeId: 'store-1',
        storeName: 'Test Store',
        linkType: 'coupon',
        source: 'personal_channel',
        metadata: {},
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockClicks = [
        {
          id: 'click-1',
          affiliateLinkId: mockAffiliateLink.id,
          userId: mockAffiliateLink.userId,
          telegramSubId: params.telegramSubId,
          clickedAt: new Date(),
          deviceInfo: {},
          conversionData: { converted: false }
        }
      ];

      mockAffiliateLinkRepository.getAffiliateLinkBySubId.mockResolvedValue(mockAffiliateLink);
      mockAffiliateLinkRepository.getLinkClicksByAffiliate.mockResolvedValue(mockClicks);
      mockAffiliateLinkRepository.updateLinkClickConversion.mockResolvedValue(mockClicks[0]);

      // Act
      await affiliateLinkService.updateConversion(params);

      // Assert
      expect(mockAffiliateLinkRepository.getAffiliateLinkBySubId).toHaveBeenCalledWith(params.telegramSubId);
      expect(mockAffiliateLinkRepository.getLinkClicksByAffiliate).toHaveBeenCalledWith(mockAffiliateLink.id);
      expect(mockAffiliateLinkRepository.updateLinkClickConversion).toHaveBeenCalledWith(
        mockClicks[0].id,
        expect.objectContaining({
          converted: true,
          orderId: params.orderId,
          orderValue: params.orderValue,
          commission: params.commission
        })
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Updated conversion for SubID')
      );
    });

    it('should handle missing affiliate link', async () => {
      // Arrange
      const params = {
        telegramSubId: 'invalid_subid',
        orderId: 'order-123',
        orderValue: 1000,
        commission: 50
      };

      mockAffiliateLinkRepository.getAffiliateLinkBySubId.mockResolvedValue(null);

      // Act
      await affiliateLinkService.updateConversion(params);

      // Assert
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Affiliate link not found for conversion SubID: invalid_subid'
      );
    });
  });

  describe('getUserLinkStats', () => {
    it('should return user link statistics', async () => {
      // Arrange
      const userId = 'user-123';
      const days = 30;

      const mockStats = {
        total_clicks: '100',
        unique_links: '10',
        conversions: '5',
        avg_order_value: '500.00',
        total_commission: '25.00'
      };

      const mockTopLinks = [
        {
          id: 'link-1',
          store_name: 'Test Store',
          link_type: 'coupon',
          source: 'personal_channel',
          click_count: '50',
          conversion_count: '3',
          total_commission: '15.00'
        }
      ];

      mockAffiliateLinkRepository.getClickStatsByUser.mockResolvedValue(mockStats);
      mockAffiliateLinkRepository.getTopPerformingLinks.mockResolvedValue(mockTopLinks);

      // Act
      const result = await affiliateLinkService.getUserLinkStats(userId, days);

      // Assert
      expect(result).toEqual({
        period: '30 days',
        totalClicks: 100,
        uniqueLinks: 10,
        conversions: 5,
        conversionRate: '5.00',
        averageOrderValue: 500,
        totalCommission: 25,
        topPerformingLinks: [
          {
            storeId: 'link-1',
            storeName: 'Test Store',
            linkType: 'coupon',
            source: 'personal_channel',
            clicks: 50,
            conversions: 3,
            commission: 15,
            conversionRate: '6.00'
          }
        ]
      });

      expect(mockAffiliateLinkRepository.getClickStatsByUser).toHaveBeenCalledWith(userId, days);
      expect(mockAffiliateLinkRepository.getTopPerformingLinks).toHaveBeenCalledWith(userId, 10);
    });
  });

  describe('generateBulkLinks', () => {
    it('should generate multiple affiliate links', async () => {
      // Arrange
      const params = {
        userId: 'user-123',
        couponIds: ['coupon-1', 'coupon-2'],
        source: 'personal_channel',
        channelId: 'channel-456'
      };

      const mockAffiliateLink: AffiliateLink = {
        id: 'link-1',
        userId: params.userId,
        telegramSubId: 'test_subid',
        originalUrl: 'https://example.com/coupon/coupon-1',
        affiliateUrl: 'https://affiliate.example.com/track',
        storeId: 'store-1',
        storeName: 'Test Store',
        linkType: 'coupon',
        source: 'personal_channel',
        metadata: {},
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockAffiliateLinkRepository.getAffiliateStoreById.mockResolvedValue(mockStore);
      mockAffiliateLinkRepository.createSubIdMapping.mockResolvedValue({} as any);
      mockAffiliateLinkRepository.createAffiliateLink.mockResolvedValue(mockAffiliateLink);

      // Act
      const result = await affiliateLinkService.generateBulkLinks(params);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(mockAffiliateLink);
      expect(mockAffiliateLinkRepository.createAffiliateLink).toHaveBeenCalledTimes(2);
    });

    it('should handle errors in bulk generation gracefully', async () => {
      // Arrange
      const params = {
        userId: 'user-123',
        couponIds: ['coupon-1', 'invalid-coupon'],
        source: 'personal_channel'
      };

      mockAffiliateLinkRepository.getAffiliateStoreById
        .mockResolvedValueOnce(mockStore)
        .mockResolvedValueOnce(null);

      const mockAffiliateLink: AffiliateLink = {
        id: 'link-1',
        userId: params.userId,
        telegramSubId: 'test_subid',
        originalUrl: 'https://example.com/coupon/coupon-1',
        affiliateUrl: 'https://affiliate.example.com/track',
        storeId: 'store-1',
        storeName: 'Test Store',
        linkType: 'coupon',
        source: 'personal_channel',
        metadata: {},
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockAffiliateLinkRepository.createSubIdMapping.mockResolvedValue({} as any);
      mockAffiliateLinkRepository.createAffiliateLink.mockResolvedValue(mockAffiliateLink);

      // Act
      const result = await affiliateLinkService.generateBulkLinks(params);

      // Assert
      expect(result).toHaveLength(1); // Only successful generation
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to generate link for coupon invalid-coupon'),
        expect.any(Error)
      );
    });
  });
});
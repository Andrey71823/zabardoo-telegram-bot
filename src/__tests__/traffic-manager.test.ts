import { TrafficManagerService } from '../services/traffic/TrafficManagerService';
import { TrafficManagerRepository } from '../repositories/TrafficManagerRepository';
import { ClickEvent, ClickSession, ConversionEvent } from '../models/TrafficManager';
import { Logger } from '../config/logger';

// Mock dependencies
jest.mock('../repositories/TrafficManagerRepository');
jest.mock('../config/logger');

describe('TrafficManagerService', () => {
  let trafficManagerService: TrafficManagerService;
  let mockTrafficManagerRepository: jest.Mocked<TrafficManagerRepository>;
  let mockLogger: jest.Mocked<Logger>;

  const mockClickEvent: ClickEvent = {
    id: 'click-event-1',
    clickId: 'click_123456_abcdef',
    userId: 'user-123',
    telegramUserId: '123456789',
    sessionId: 'session_abc123_456789',
    storeId: 'store-1',
    storeName: 'Test Store',
    originalUrl: 'https://teststore.com/product/123',
    destinationUrl: 'https://affiliate.teststore.com/track?url=...',
    source: 'personal_channel',
    sourceDetails: {
      channelId: 'channel-123',
      messageId: 'msg-456'
    },
    userAgent: 'Mozilla/5.0...',
    ipAddress: '192.168.1.1',
    deviceInfo: {
      platform: 'iOS',
      browser: 'Safari',
      isMobile: true
    },
    geoLocation: {
      country: 'IN',
      city: 'Mumbai'
    },
    utmParams: {
      source: 'telegram',
      medium: 'bot',
      campaign: 'zabardoo'
    },
    metadata: {},
    clickedAt: new Date(),
    createdAt: new Date()
  };

  const mockClickSession: ClickSession = {
    id: 'session-1',
    sessionId: 'session_abc123_456789',
    userId: 'user-123',
    telegramUserId: '123456789',
    startedAt: new Date(),
    lastActivityAt: new Date(),
    clickCount: 1,
    uniqueLinksClicked: 1,
    conversionCount: 0,
    totalRevenue: 0,
    totalCommission: 0,
    deviceInfo: {
      platform: 'iOS',
      browser: 'Safari'
    },
    isActive: true,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    mockTrafficManagerRepository = new TrafficManagerRepository(null as any) as jest.Mocked<TrafficManagerRepository>;
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    } as any;

    trafficManagerService = new TrafficManagerService(mockTrafficManagerRepository, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateClickId', () => {
    it('should generate unique click ID with correct format', () => {
      const clickId1 = trafficManagerService.generateClickId();
      const clickId2 = trafficManagerService.generateClickId();

      expect(clickId1).toMatch(/^click_[a-z0-9]+_[a-f0-9]{16}$/);
      expect(clickId2).toMatch(/^click_[a-z0-9]+_[a-f0-9]{16}$/);
      expect(clickId1).not.toBe(clickId2);
    });
  });

  describe('generateSessionId', () => {
    it('should generate unique session ID with correct format', () => {
      const userId = 'user-123';
      const sessionId1 = trafficManagerService.generateSessionId(userId);
      const sessionId2 = trafficManagerService.generateSessionId(userId);

      expect(sessionId1).toMatch(/^session_[a-f0-9]{8}_[a-z0-9]+$/);
      expect(sessionId2).toMatch(/^session_[a-f0-9]{8}_[a-z0-9]+$/);
      expect(sessionId1).not.toBe(sessionId2);
    });

    it('should generate consistent hash for same user', () => {
      const userId = 'user-123';
      const sessionId1 = trafficManagerService.generateSessionId(userId);
      const sessionId2 = trafficManagerService.generateSessionId(userId);

      // Extract user hash part (should be same)
      const hash1 = sessionId1.split('_')[1];
      const hash2 = sessionId2.split('_')[1];
      expect(hash1).toBe(hash2);
    });
  });

  describe('trackClick', () => {
    it('should track click successfully with new session', async () => {
      // Arrange
      const trackParams = {
        userId: 'user-123',
        telegramUserId: '123456789',
        storeId: 'store-1',
        storeName: 'Test Store',
        originalUrl: 'https://teststore.com/product/123',
        destinationUrl: 'https://affiliate.teststore.com/track',
        source: 'personal_channel' as const,
        sourceDetails: {
          channelId: 'channel-123',
          messageId: 'msg-456'
        },
        deviceInfo: {
          platform: 'iOS',
          browser: 'Safari'
        }
      };

      mockTrafficManagerRepository.getActiveSession.mockResolvedValue(null);
      mockTrafficManagerRepository.createClickSession.mockResolvedValue(mockClickSession);
      mockTrafficManagerRepository.recordClickEvent.mockResolvedValue(mockClickEvent);
      mockTrafficManagerRepository.updateClickSession.mockResolvedValue(mockClickSession);
      mockTrafficManagerRepository.getTrafficSourceBySourceId.mockResolvedValue(null);
      mockTrafficManagerRepository.createTrafficSource.mockResolvedValue({} as any);

      // Act
      const result = await trafficManagerService.trackClick(trackParams);

      // Assert
      expect(result).toEqual(mockClickEvent);
      expect(mockTrafficManagerRepository.getActiveSession).toHaveBeenCalledWith('user-123');
      expect(mockTrafficManagerRepository.createClickSession).toHaveBeenCalled();
      expect(mockTrafficManagerRepository.recordClickEvent).toHaveBeenCalled();
      expect(mockTrafficManagerRepository.updateClickSession).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Click tracked')
      );
    });

    it('should reuse existing active session', async () => {
      // Arrange
      const trackParams = {
        userId: 'user-123',
        telegramUserId: '123456789',
        storeId: 'store-1',
        storeName: 'Test Store',
        originalUrl: 'https://teststore.com/product/123',
        destinationUrl: 'https://affiliate.teststore.com/track',
        source: 'personal_channel' as const,
        sourceDetails: {
          channelId: 'channel-123'
        }
      };

      mockTrafficManagerRepository.getActiveSession.mockResolvedValue(mockClickSession);
      mockTrafficManagerRepository.recordClickEvent.mockResolvedValue(mockClickEvent);
      mockTrafficManagerRepository.updateClickSession.mockResolvedValue(mockClickSession);
      mockTrafficManagerRepository.getTrafficSourceBySourceId.mockResolvedValue({} as any);
      mockTrafficManagerRepository.updateTrafficSourceMetrics.mockResolvedValue();

      // Act
      const result = await trafficManagerService.trackClick(trackParams);

      // Assert
      expect(result).toEqual(mockClickEvent);
      expect(mockTrafficManagerRepository.createClickSession).not.toHaveBeenCalled();
      expect(mockTrafficManagerRepository.updateClickSession).toHaveBeenCalledWith(
        mockClickSession.sessionId,
        expect.objectContaining({
          clickCount: mockClickSession.clickCount + 1,
          lastActivityAt: expect.any(Date)
        })
      );
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const trackParams = {
        userId: 'user-123',
        telegramUserId: '123456789',
        storeId: 'store-1',
        storeName: 'Test Store',
        originalUrl: 'https://teststore.com/product/123',
        destinationUrl: 'https://affiliate.teststore.com/track',
        source: 'personal_channel' as const,
        sourceDetails: {}
      };

      mockTrafficManagerRepository.getActiveSession.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(trafficManagerService.trackClick(trackParams)).rejects.toThrow('Database error');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to track click:', expect.any(Error));
    });
  });

  describe('trackConversion', () => {
    it('should track conversion successfully', async () => {
      // Arrange
      const conversionParams = {
        clickId: 'click_123456_abcdef',
        orderId: 'order-789',
        orderValue: 1000,
        commission: 50,
        commissionRate: 5.0,
        currency: 'INR',
        products: [
          {
            productId: 'prod-1',
            productName: 'Test Product',
            category: 'Electronics',
            price: 1000,
            quantity: 1,
            commission: 50
          }
        ],
        conversionType: 'purchase' as const,
        paymentMethod: 'UPI'
      };

      const mockConversionEvent: ConversionEvent = {
        id: 'conversion-1',
        clickId: conversionParams.clickId,
        userId: mockClickEvent.userId,
        telegramUserId: mockClickEvent.telegramUserId,
        sessionId: mockClickEvent.sessionId,
        orderId: conversionParams.orderId,
        storeId: mockClickEvent.storeId,
        storeName: mockClickEvent.storeName,
        orderValue: conversionParams.orderValue,
        commission: conversionParams.commission,
        commissionRate: conversionParams.commissionRate,
        currency: conversionParams.currency,
        products: conversionParams.products,
        conversionType: conversionParams.conversionType,
        attributionModel: 'last_click',
        attributionData: {
          firstClickSource: mockClickEvent.source,
          lastClickSource: mockClickEvent.source,
          touchpointCount: 1,
          journeyDuration: 0
        },
        paymentMethod: conversionParams.paymentMethod,
        discountApplied: 0,
        conversionTime: new Date(),
        processingStatus: 'pending',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockTrafficManagerRepository.getClickEventByClickId.mockResolvedValue(mockClickEvent);
      mockTrafficManagerRepository.recordConversionEvent.mockResolvedValue(mockConversionEvent);
      mockTrafficManagerRepository.updateClickSession.mockResolvedValue(mockClickSession);
      mockTrafficManagerRepository.getTrafficSourceBySourceId.mockResolvedValue({} as any);
      mockTrafficManagerRepository.updateTrafficSourceMetrics.mockResolvedValue();

      // Act
      const result = await trafficManagerService.trackConversion(conversionParams);

      // Assert
      expect(result).toEqual(mockConversionEvent);
      expect(mockTrafficManagerRepository.getClickEventByClickId).toHaveBeenCalledWith(conversionParams.clickId);
      expect(mockTrafficManagerRepository.recordConversionEvent).toHaveBeenCalled();
      expect(mockTrafficManagerRepository.updateClickSession).toHaveBeenCalledWith(
        mockClickEvent.sessionId,
        expect.objectContaining({
          conversionCount: 1,
          totalRevenue: conversionParams.orderValue,
          totalCommission: conversionParams.commission
        })
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Conversion tracked')
      );
    });

    it('should throw error when click event not found', async () => {
      // Arrange
      const conversionParams = {
        clickId: 'invalid-click-id',
        orderId: 'order-789',
        orderValue: 1000,
        commission: 50,
        commissionRate: 5.0,
        currency: 'INR',
        products: [],
        conversionType: 'purchase' as const
      };

      mockTrafficManagerRepository.getClickEventByClickId.mockResolvedValue(null);

      // Act & Assert
      await expect(trafficManagerService.trackConversion(conversionParams)).rejects.toThrow(
        'Click event not found for clickId: invalid-click-id'
      );
    });

    it('should handle conversion tracking errors', async () => {
      // Arrange
      const conversionParams = {
        clickId: 'click_123456_abcdef',
        orderId: 'order-789',
        orderValue: 1000,
        commission: 50,
        commissionRate: 5.0,
        currency: 'INR',
        products: [],
        conversionType: 'purchase' as const
      };

      mockTrafficManagerRepository.getClickEventByClickId.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(trafficManagerService.trackConversion(conversionParams)).rejects.toThrow('Database error');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to track conversion:', expect.any(Error));
    });
  });

  describe('getClickAnalytics', () => {
    it('should return click analytics with summary', async () => {
      // Arrange
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      
      const mockClickAnalytics = [
        {
          date: new Date('2024-01-01'),
          hour: 10,
          sourceType: 'personal_channel',
          totalClicks: 100,
          uniqueUsers: 50
        }
      ];

      const mockConversionAnalytics = [
        {
          source: 'personal_channel',
          store_id: 'store-1',
          store_name: 'Test Store',
          total_clicks: '100',
          unique_users: '50',
          conversions: '5',
          total_revenue: '5000.00',
          total_commission: '250.00',
          conversion_rate: '5.00',
          avg_order_value: '1000.00'
        }
      ];

      mockTrafficManagerRepository.getClickAnalytics.mockResolvedValue(mockClickAnalytics as any);
      mockTrafficManagerRepository.getConversionAnalytics.mockResolvedValue(mockConversionAnalytics);

      // Act
      const result = await trafficManagerService.getClickAnalytics(startDate, endDate);

      // Assert
      expect(result).toHaveProperty('clickAnalytics');
      expect(result).toHaveProperty('conversionAnalytics');
      expect(result).toHaveProperty('summary');
      expect(result.summary).toHaveProperty('totalClicks');
      expect(result.summary).toHaveProperty('conversionRate');
      expect(mockTrafficManagerRepository.getClickAnalytics).toHaveBeenCalledWith(startDate, endDate, undefined);
      expect(mockTrafficManagerRepository.getConversionAnalytics).toHaveBeenCalledWith(startDate, endDate);
    });

    it('should handle analytics errors', async () => {
      // Arrange
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockTrafficManagerRepository.getClickAnalytics.mockRejectedValue(new Error('Analytics error'));

      // Act & Assert
      await expect(trafficManagerService.getClickAnalytics(startDate, endDate)).rejects.toThrow('Analytics error');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to get click analytics:', expect.any(Error));
    });
  });

  describe('getTopPerformingSources', () => {
    it('should return top performing sources', async () => {
      // Arrange
      const mockTopSources = [
        {
          source_name: 'Personal Channel 1',
          source_type: 'personal_channel',
          source_id: 'channel-1',
          total_clicks: 500,
          unique_users: 200,
          conversions: 25,
          total_revenue: 25000,
          total_commission: 1250,
          conversion_rate: 5.0
        }
      ];

      mockTrafficManagerRepository.getTopPerformingSources.mockResolvedValue(mockTopSources);

      // Act
      const result = await trafficManagerService.getTopPerformingSources(30, 10);

      // Assert
      expect(result).toEqual(mockTopSources);
      expect(mockTrafficManagerRepository.getTopPerformingSources).toHaveBeenCalledWith(30, 10);
    });

    it('should handle errors when getting top sources', async () => {
      // Arrange
      mockTrafficManagerRepository.getTopPerformingSources.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(trafficManagerService.getTopPerformingSources()).rejects.toThrow('Database error');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to get top performing sources:', expect.any(Error));
    });
  });

  describe('getUserClickEvents', () => {
    it('should return user click events', async () => {
      // Arrange
      const userId = 'user-123';
      const mockClickEvents = [mockClickEvent];

      mockTrafficManagerRepository.getClickEventsByUser.mockResolvedValue(mockClickEvents);

      // Act
      const result = await trafficManagerService.getUserClickEvents(userId, 50);

      // Assert
      expect(result).toEqual(mockClickEvents);
      expect(mockTrafficManagerRepository.getClickEventsByUser).toHaveBeenCalledWith(userId, 50);
    });

    it('should handle errors when getting user click events', async () => {
      // Arrange
      const userId = 'user-123';
      mockTrafficManagerRepository.getClickEventsByUser.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(trafficManagerService.getUserClickEvents(userId)).rejects.toThrow('Database error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Failed to get click events for user ${userId}:`,
        expect.any(Error)
      );
    });
  });

  describe('endSession', () => {
    it('should end active session', async () => {
      // Arrange
      const userId = 'user-123';
      const activeSession = { ...mockClickSession, isActive: true };
      
      // Simulate active session in memory
      (trafficManagerService as any).activeSessions.set(userId, activeSession);
      
      mockTrafficManagerRepository.updateClickSession.mockResolvedValue({
        ...activeSession,
        isActive: false,
        endedAt: new Date()
      });

      // Act
      await trafficManagerService.endSession(userId);

      // Assert
      expect(mockTrafficManagerRepository.updateClickSession).toHaveBeenCalledWith(
        activeSession.sessionId,
        expect.objectContaining({
          endedAt: expect.any(Date),
          duration: expect.any(Number),
          isActive: false
        })
      );
      expect((trafficManagerService as any).activeSessions.has(userId)).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Session ended for user')
      );
    });

    it('should handle ending non-existent session gracefully', async () => {
      // Arrange
      const userId = 'non-existent-user';

      // Act
      await trafficManagerService.endSession(userId);

      // Assert
      expect(mockTrafficManagerRepository.updateClickSession).not.toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });
  });
});
import { Pool } from 'pg';
import { ConversionTrackingService, ConversionWebhookPayload } from '../services/conversion/ConversionTrackingService';
import { ConversionTrackingRepository } from '../repositories/ConversionTrackingRepository';
import { TrafficManagerRepository } from '../repositories/TrafficManagerRepository';
import { ConversionPixel, ConversionRule, ConversionWebhook } from '../models/ConversionTracking';

// Mock dependencies
jest.mock('pg');
jest.mock('../repositories/ConversionTrackingRepository');
jest.mock('../repositories/TrafficManagerRepository');
jest.mock('axios');

describe('ConversionTrackingService', () => {
  let service: ConversionTrackingService;
  let mockPool: jest.Mocked<Pool>;
  let mockConversionRepo: jest.Mocked<ConversionTrackingRepository>;
  let mockTrafficRepo: jest.Mocked<TrafficManagerRepository>;

  beforeEach(() => {
    mockPool = new Pool() as jest.Mocked<Pool>;
    service = new ConversionTrackingService(mockPool);
    
    mockConversionRepo = service['conversionRepo'] as jest.Mocked<ConversionTrackingRepository>;
    mockTrafficRepo = service['trafficRepo'] as jest.Mocked<TrafficManagerRepository>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleConversionWebhook', () => {
    const mockPayload: ConversionWebhookPayload = {
      orderId: 'order-123',
      clickId: 'click-456',
      userId: 'user-789',
      storeId: 'store-001',
      storeName: 'Test Store',
      orderValue: 100.00,
      currency: 'INR',
      commission: 5.00,
      commissionRate: 5.0,
      products: [{
        id: 'prod-1',
        name: 'Test Product',
        category: 'electronics',
        price: 100.00,
        quantity: 1
      }],
      customerInfo: {
        email: 'test@example.com',
        phone: '+91-9876543210'
      },
      metadata: {}
    };

    const mockClickEvent = {
      id: 'click-456',
      clickId: 'click-456',
      userId: 'user-789',
      clickTime: new Date('2024-01-01T10:00:00Z'),
      userAgent: 'Mozilla/5.0',
      ipAddress: '192.168.1.1'
    };

    beforeEach(() => {
      mockTrafficRepo.getClickEvent.mockResolvedValue(mockClickEvent);
      mockTrafficRepo.getConversionByOrderId.mockResolvedValue(null);
      mockConversionRepo.getActiveConversionRules.mockResolvedValue([]);
      mockTrafficRepo.createConversionEvent.mockResolvedValue({
        id: 'conv-123',
        ...mockPayload,
        conversionTime: new Date(),
        processingStatus: 'pending',
        appliedRules: [],
        createdAt: new Date(),
        updatedAt: new Date()
      } as any);
      mockConversionRepo.getConversionPixelsByStore.mockResolvedValue([]);
      mockConversionRepo.getActiveWebhooksForEvent.mockResolvedValue([]);
    });

    it('should process conversion webhook successfully', async () => {
      const result = await service.handleConversionWebhook(mockPayload);

      expect(mockTrafficRepo.getClickEvent).toHaveBeenCalledWith(mockPayload.clickId);
      expect(mockTrafficRepo.getConversionByOrderId).toHaveBeenCalledWith(mockPayload.orderId);
      expect(mockTrafficRepo.createConversionEvent).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.orderId).toBe(mockPayload.orderId);
    });

    it('should throw error if click event not found', async () => {
      mockTrafficRepo.getClickEvent.mockResolvedValue(null);

      await expect(service.handleConversionWebhook(mockPayload))
        .rejects.toThrow('Click event not found: click-456');
    });

    it('should return existing conversion for duplicate orders', async () => {
      const existingConversion = {
        id: 'existing-conv',
        orderId: mockPayload.orderId
      };
      mockTrafficRepo.getConversionByOrderId.mockResolvedValue(existingConversion as any);

      const result = await service.handleConversionWebhook(mockPayload);

      expect(result).toBe(existingConversion);
      expect(mockTrafficRepo.createConversionEvent).not.toHaveBeenCalled();
    });

    it('should apply conversion rules and adjust commission', async () => {
      const mockRule: ConversionRule = {
        id: 'rule-1',
        name: 'High Value Bonus',
        description: 'Bonus for orders over 50',
        conditions: [{
          field: 'orderValue',
          operator: 'greater_than',
          value: 50
        }],
        actions: [{
          type: 'set_commission_rate',
          parameters: { rate: 7.5 }
        }],
        priority: 1,
        isActive: true,
        usageCount: 0,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockConversionRepo.getActiveConversionRules.mockResolvedValue([mockRule]);

      await service.handleConversionWebhook(mockPayload);

      expect(mockConversionRepo.incrementRuleUsage).toHaveBeenCalledWith('rule-1');
      
      const createCall = mockTrafficRepo.createConversionEvent.mock.calls[0][0];
      expect(createCall.commission).toBe(7.5); // 100 * 7.5%
      expect(createCall.commissionRate).toBe(7.5);
    });

    it('should detect fraud for suspicious conversions', async () => {
      // Mock suspicious click (very recent)
      const suspiciousClick = {
        ...mockClickEvent,
        clickTime: new Date(Date.now() - 5000) // 5 seconds ago
      };
      mockTrafficRepo.getClickEvent.mockResolvedValue(suspiciousClick);
      mockTrafficRepo.getConversionsByUser.mockResolvedValue([]);

      await service.handleConversionWebhook(mockPayload);

      expect(mockConversionRepo.createConversionFraud).toHaveBeenCalled();
      
      const fraudCall = mockConversionRepo.createConversionFraud.mock.calls[0][0];
      expect(fraudCall.fraudIndicators).toContain('suspiciously_fast_conversion');
      expect(fraudCall.riskScore).toBeGreaterThan(0);
    });

    it('should fire conversion pixels', async () => {
      const mockPixel: ConversionPixel = {
        id: 'pixel-1',
        storeId: 'store-001',
        storeName: 'Test Store',
        pixelType: 'postback',
        pixelId: 'px123',
        isActive: true,
        trackingCode: 'https://example.com/pixel?order={{ORDER_ID}}&value={{ORDER_VALUE}}',
        conversionEvents: ['purchase'],
        customParameters: {},
        testMode: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockConversionRepo.getConversionPixelsByStore.mockResolvedValue([mockPixel]);

      await service.handleConversionWebhook(mockPayload);

      expect(mockConversionRepo.getConversionPixelsByStore).toHaveBeenCalledWith('store-001');
    });

    it('should trigger conversion webhooks', async () => {
      const mockWebhook: ConversionWebhook = {
        id: 'webhook-1',
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        payload: { event: 'conversion' },
        events: ['conversion_created'],
        retryAttempts: 3,
        timeout: 30,
        isActive: true,
        successCount: 0,
        errorCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockConversionRepo.getActiveWebhooksForEvent.mockResolvedValue([mockWebhook]);

      await service.handleConversionWebhook(mockPayload);

      expect(mockConversionRepo.getActiveWebhooksForEvent).toHaveBeenCalledWith('conversion_created');
    });
  });

  describe('fraud detection', () => {
    it('should detect excessive conversions from same user', async () => {
      const mockConversion = {
        id: 'conv-123',
        userId: 'user-789',
        conversionTime: new Date(),
        orderValue: 100
      };

      const mockClick = {
        clickTime: new Date(Date.now() - 60000), // 1 minute ago
        userAgent: 'Mozilla/5.0',
        ipAddress: '192.168.1.1'
      };

      // Mock 6 conversions in last 24 hours (suspicious)
      mockTrafficRepo.getConversionsByUser.mockResolvedValue(
        Array(6).fill(mockConversion)
      );

      const fraudResult = await service['detectFraud'](mockConversion as any, mockClick);

      expect(fraudResult.isFraud).toBe(true);
      expect(fraudResult.indicators).toContain('excessive_conversions_24h');
      expect(fraudResult.riskScore).toBeGreaterThanOrEqual(50);
    });

    it('should detect bot user agents', async () => {
      const mockConversion = {
        id: 'conv-123',
        userId: 'user-789',
        conversionTime: new Date(),
        orderValue: 100
      };

      const mockClick = {
        clickTime: new Date(Date.now() - 60000),
        userAgent: 'curl/7.68.0', // Bot user agent
        ipAddress: '192.168.1.1'
      };

      mockTrafficRepo.getConversionsByUser.mockResolvedValue([]);

      const fraudResult = await service['detectFraud'](mockConversion as any, mockClick);

      expect(fraudResult.indicators).toContain('bot_user_agent');
      expect(fraudResult.riskScore).toBeGreaterThan(0);
    });
  });

  describe('attribution calculation', () => {
    it('should calculate last-click attribution correctly', async () => {
      const mockConversion = {
        id: 'conv-123',
        userId: 'user-789',
        conversionTime: new Date(),
        orderValue: 100,
        commission: 5
      };

      const mockClicks = [
        {
          id: 'click-1',
          clickId: 'click-1',
          source: 'google',
          clickTime: new Date(Date.now() - 3600000), // 1 hour ago
          sourceDetails: {}
        },
        {
          id: 'click-2',
          clickId: 'click-2',
          source: 'facebook',
          clickTime: new Date(Date.now() - 1800000), // 30 minutes ago
          sourceDetails: {}
        }
      ];

      mockTrafficRepo.getClicksByUser.mockResolvedValue(mockClicks);

      await service['calculateAttribution'](mockConversion as any);

      expect(mockConversionRepo.createConversionAttribution).toHaveBeenCalled();
      
      const attributionCall = mockConversionRepo.createConversionAttribution.mock.calls[0][0];
      expect(attributionCall.attributionModel).toBe('last_click');
      expect(attributionCall.touchpoints).toHaveLength(2);
      
      // Last click should get full attribution
      const lastTouchpoint = attributionCall.touchpoints[1];
      expect(lastTouchpoint.weight).toBe(1);
      expect(lastTouchpoint.conversionValue).toBe(100);
    });

    it('should calculate linear attribution correctly', async () => {
      const mockConversion = {
        id: 'conv-123',
        userId: 'user-789',
        conversionTime: new Date(),
        orderValue: 100,
        commission: 5
      };

      const mockClicks = [
        { id: 'click-1', source: 'google', clickTime: new Date(Date.now() - 3600000) },
        { id: 'click-2', source: 'facebook', clickTime: new Date(Date.now() - 1800000) }
      ];

      mockTrafficRepo.getClicksByUser.mockResolvedValue(mockClicks as any);

      const weights = service['calculateAttributionWeights'](
        mockClicks.map((click, index) => ({
          id: click.id,
          clickId: click.id,
          source: click.source,
          sourceDetails: {},
          timestamp: click.clickTime,
          weight: 0,
          position: index + 1,
          timeSinceFirstClick: 0,
          timeSinceLastClick: 0,
          conversionValue: 0,
          commission: 0
        })),
        'linear'
      );

      expect(weights).toEqual([0.5, 0.5]);
    });
  });

  describe('conversion management', () => {
    it('should confirm conversion successfully', async () => {
      const mockConversion = { id: 'conv-123', orderId: 'order-123' };
      mockTrafficRepo.getConversionEvent.mockResolvedValue(mockConversion as any);
      mockConversionRepo.getActiveWebhooksForEvent.mockResolvedValue([]);

      await service.confirmConversion('conv-123');

      expect(mockTrafficRepo.updateConversionStatus).toHaveBeenCalledWith('conv-123', 'confirmed');
    });

    it('should cancel conversion successfully', async () => {
      const mockConversion = { id: 'conv-123', orderId: 'order-123' };
      mockTrafficRepo.getConversionEvent.mockResolvedValue(mockConversion as any);
      mockConversionRepo.getActiveWebhooksForEvent.mockResolvedValue([]);

      await service.cancelConversion('conv-123', 'Customer cancelled');

      expect(mockTrafficRepo.updateConversionStatus).toHaveBeenCalledWith('conv-123', 'cancelled');
    });

    it('should handle partial refund correctly', async () => {
      const mockConversion = { 
        id: 'conv-123', 
        orderId: 'order-123',
        orderValue: 100,
        commission: 5
      };
      mockTrafficRepo.getConversionEvent.mockResolvedValue(mockConversion as any);
      mockConversionRepo.getActiveWebhooksForEvent.mockResolvedValue([]);

      await service.refundConversion('conv-123', 50); // 50% refund

      expect(mockTrafficRepo.updateConversionCommission).toHaveBeenCalledWith('conv-123', 2.5);
    });

    it('should handle full refund correctly', async () => {
      const mockConversion = { 
        id: 'conv-123', 
        orderId: 'order-123',
        orderValue: 100,
        commission: 5
      };
      mockTrafficRepo.getConversionEvent.mockResolvedValue(mockConversion as any);
      mockConversionRepo.getActiveWebhooksForEvent.mockResolvedValue([]);

      await service.refundConversion('conv-123'); // Full refund

      expect(mockTrafficRepo.updateConversionStatus).toHaveBeenCalledWith('conv-123', 'refunded');
    });
  });

  describe('rule evaluation', () => {
    it('should evaluate simple conditions correctly', async () => {
      const payload: ConversionWebhookPayload = {
        orderId: 'order-123',
        clickId: 'click-456',
        userId: 'user-789',
        storeId: 'store-001',
        storeName: 'Test Store',
        orderValue: 150.00,
        currency: 'INR',
        commission: 7.50,
        commissionRate: 5.0,
        products: [{
          id: 'prod-1',
          name: 'Test Product',
          category: 'electronics',
          price: 150.00,
          quantity: 1
        }],
        customerInfo: {},
        metadata: {}
      };

      // Test greater_than condition
      const condition1 = {
        field: 'orderValue',
        operator: 'greater_than' as const,
        value: 100
      };
      expect(service['evaluateCondition'](condition1, payload)).toBe(true);

      // Test equals condition
      const condition2 = {
        field: 'productCategory',
        operator: 'equals' as const,
        value: 'electronics'
      };
      expect(service['evaluateCondition'](condition2, payload)).toBe(true);

      // Test contains condition
      const condition3 = {
        field: 'currency',
        operator: 'contains' as const,
        value: 'INR'
      };
      expect(service['evaluateCondition'](condition3, payload)).toBe(true);
    });

    it('should execute rule actions correctly', async () => {
      const payload: ConversionWebhookPayload = {
        orderId: 'order-123',
        clickId: 'click-456',
        userId: 'user-789',
        storeId: 'store-001',
        storeName: 'Test Store',
        orderValue: 100.00,
        currency: 'INR',
        commission: 5.00,
        commissionRate: 5.0,
        products: [],
        customerInfo: {},
        metadata: {}
      };

      const actions = [
        {
          type: 'set_commission_rate' as const,
          parameters: { rate: 8.0 }
        },
        {
          type: 'add_bonus' as const,
          parameters: { amount: 2.0 }
        }
      ];

      const result = service['executeRuleActions'](actions, payload);

      expect(result.commissionRate).toBe(8.0);
      expect(result.commission).toBe(10.0); // 8% of 100 + 2 bonus
    });
  });
});
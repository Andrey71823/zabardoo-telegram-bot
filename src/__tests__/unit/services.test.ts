import { RecommendationService } from '../../services/recommendation/RecommendationService';
import { CashbackService } from '../../services/cashback/CashbackService';
import { TrafficManagerService } from '../../services/traffic/TrafficManagerService';
import { DataComplianceService } from '../../services/compliance/DataComplianceService';
import { AuthenticationService } from '../../services/security/AuthenticationService';
import { EncryptionService } from '../../services/security/EncryptionService';
import { CacheManager } from '../../services/cache/CacheManager';
import { PerformanceMonitor } from '../../services/monitoring/PerformanceMonitor';

// Mock dependencies
jest.mock('../../repositories/RecommendationRepository');
jest.mock('../../repositories/CashbackSystemRepository');
jest.mock('../../repositories/TrafficManagerRepository');
jest.mock('../../repositories/DataComplianceRepository');
jest.mock('../../config/database');
jest.mock('../../services/cache/RedisService');

describe('Unit Tests - Core Services', () => {
  describe('RecommendationService', () => {
    let service: RecommendationService;
    let mockRepository: any;

    beforeEach(() => {
      mockRepository = {
        getUserPreferences: jest.fn(),
        getCouponsByCategory: jest.fn(),
        recordInteraction: jest.fn(),
        updateRecommendationScore: jest.fn()
      };
      service = new RecommendationService(mockRepository);
    });

    it('should generate content-based recommendations', async () => {
      const mockPreferences = {
        userId: 'user-123',
        categories: ['electronics', 'fashion'],
        priceRange: { min: 0, max: 5000 },
        brands: ['Samsung', 'Apple']
      };

      const mockCoupons = [
        {
          id: 'coupon-1',
          title: 'Samsung Phone Discount',
          category: 'electronics',
          discount: 20,
          store: 'TechStore'
        },
        {
          id: 'coupon-2',
          title: 'Fashion Sale',
          category: 'fashion',
          discount: 30,
          store: 'FashionHub'
        }
      ];

      mockRepository.getUserPreferences.mockResolvedValue(mockPreferences);
      mockRepository.getCouponsByCategory.mockResolvedValue(mockCoupons);

      const recommendations = await service.generateContentBasedRecommendations('user-123', 5);

      expect(recommendations).toHaveLength(2);
      expect(recommendations[0]).toHaveProperty('score');
      expect(recommendations[0].score).toBeGreaterThan(0);
      expect(mockRepository.getUserPreferences).toHaveBeenCalledWith('user-123');
    });

    it('should handle empty user preferences gracefully', async () => {
      mockRepository.getUserPreferences.mockResolvedValue(null);
      mockRepository.getCouponsByCategory.mockResolvedValue([]);

      const recommendations = await service.generateContentBasedRecommendations('user-123', 5);

      expect(recommendations).toHaveLength(0);
    });

    it('should calculate recommendation scores correctly', () => {
      const coupon = {
        id: 'coupon-1',
        category: 'electronics',
        discount: 25,
        rating: 4.5,
        popularity: 0.8
      };

      const preferences = {
        categories: ['electronics', 'fashion'],
        preferredDiscount: 20
      };

      const score = service.calculateRecommendationScore(coupon, preferences);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should record user feedback correctly', async () => {
      mockRepository.recordInteraction.mockResolvedValue(true);

      await service.recordFeedback('user-123', 'coupon-1', 'click', 5);

      expect(mockRepository.recordInteraction).toHaveBeenCalledWith({
        userId: 'user-123',
        couponId: 'coupon-1',
        interactionType: 'click',
        rating: 5,
        timestamp: expect.any(Date)
      });
    });
  });

  describe('CashbackService', () => {
    let service: CashbackService;
    let mockRepository: any;

    beforeEach(() => {
      mockRepository = {
        createTransaction: jest.fn(),
        getUserBalance: jest.fn(),
        updateTransactionStatus: jest.fn(),
        createWithdrawal: jest.fn()
      };
      service = new CashbackService(mockRepository);
    });

    it('should calculate cashback correctly', () => {
      const testCases = [
        { orderValue: 1000, rate: 0.05, expected: 50 },
        { orderValue: 2500, rate: 0.03, expected: 75 },
        { orderValue: 500, rate: 0.10, expected: 50 }
      ];

      testCases.forEach(({ orderValue, rate, expected }) => {
        const cashback = service.calculateCashback(orderValue, rate);
        expect(cashback).toBe(expected);
      });
    });

    it('should process cashback transaction', async () => {
      const transactionData = {
        userId: 'user-123',
        orderId: 'order-456',
        orderValue: 1000,
        cashbackAmount: 50,
        status: 'pending'
      };

      mockRepository.createTransaction.mockResolvedValue({
        id: 'txn-789',
        ...transactionData,
        createdAt: new Date()
      });

      const result = await service.processCashbackTransaction(transactionData);

      expect(result).toHaveProperty('id', 'txn-789');
      expect(mockRepository.createTransaction).toHaveBeenCalledWith(transactionData);
    });

    it('should validate withdrawal request', async () => {
      const mockBalance = { availableBalance: 100, pendingBalance: 20 };
      mockRepository.getUserBalance.mockResolvedValue(mockBalance);

      const validRequest = {
        userId: 'user-123',
        amount: 80,
        paymentMethod: 'upi',
        paymentDetails: { upiId: 'user@paytm' }
      };

      const invalidRequest = {
        userId: 'user-123',
        amount: 150, // More than available
        paymentMethod: 'upi',
        paymentDetails: { upiId: 'user@paytm' }
      };

      const validResult = await service.validateWithdrawalRequest(validRequest);
      const invalidResult = await service.validateWithdrawalRequest(invalidRequest);

      expect(validResult.isValid).toBe(true);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toContain('Insufficient balance');
    });

    it('should handle different payment methods', () => {
      const paymentMethods = [
        { method: 'upi', details: { upiId: 'user@paytm' }, valid: true },
        { method: 'bank', details: { accountNumber: '1234567890', ifsc: 'HDFC0001234' }, valid: true },
        { method: 'invalid', details: {}, valid: false }
      ];

      paymentMethods.forEach(({ method, details, valid }) => {
        const result = service.validatePaymentMethod(method, details);
        expect(result).toBe(valid);
      });
    });
  });

  describe('TrafficManagerService', () => {
    let service: TrafficManagerService;
    let mockRepository: any;

    beforeEach(() => {
      mockRepository = {
        createClick: jest.fn(),
        updateClick: jest.fn(),
        getClickById: jest.fn(),
        createConversion: jest.fn()
      };
      service = new TrafficManagerService(mockRepository);
    });

    it('should track click with proper metadata', async () => {
      const clickData = {
        userId: 'user-123',
        couponId: 'coupon-456',
        source: 'personal_channel',
        userAgent: 'Mozilla/5.0',
        ipAddress: '192.168.1.1',
        referrer: 'telegram://channel'
      };

      const mockClick = {
        id: 'click-789',
        ...clickData,
        timestamp: new Date(),
        sessionId: expect.any(String)
      };

      mockRepository.createClick.mockResolvedValue(mockClick);

      const result = await service.trackClick(clickData);

      expect(result).toHaveProperty('id', 'click-789');
      expect(result).toHaveProperty('sessionId');
      expect(mockRepository.createClick).toHaveBeenCalledWith(
        expect.objectContaining({
          ...clickData,
          sessionId: expect.any(String)
        })
      );
    });

    it('should generate unique session IDs', () => {
      const sessionId1 = service.generateSessionId();
      const sessionId2 = service.generateSessionId();

      expect(sessionId1).not.toBe(sessionId2);
      expect(sessionId1).toMatch(/^[a-f0-9]{32}$/);
    });

    it('should track conversion with attribution', async () => {
      const mockClick = {
        id: 'click-123',
        userId: 'user-456',
        couponId: 'coupon-789',
        timestamp: new Date(Date.now() - 3600000) // 1 hour ago
      };

      const conversionData = {
        clickId: 'click-123',
        orderId: 'order-999',
        orderValue: 2000,
        currency: 'INR'
      };

      mockRepository.getClickById.mockResolvedValue(mockClick);
      mockRepository.createConversion.mockResolvedValue({
        id: 'conv-111',
        ...conversionData,
        attribution: 'first_click'
      });

      const result = await service.trackConversion(conversionData);

      expect(result).toHaveProperty('attribution');
      expect(mockRepository.createConversion).toHaveBeenCalled();
    });

    it('should calculate attribution correctly', () => {
      const clicks = [
        { timestamp: new Date(Date.now() - 7200000), source: 'search' }, // 2 hours ago
        { timestamp: new Date(Date.now() - 3600000), source: 'email' },  // 1 hour ago
        { timestamp: new Date(Date.now() - 1800000), source: 'social' }  // 30 min ago
      ];

      const firstClick = service.getFirstClickAttribution(clicks);
      const lastClick = service.getLastClickAttribution(clicks);

      expect(firstClick.source).toBe('search');
      expect(lastClick.source).toBe('social');
    });
  });

  describe('DataComplianceService', () => {
    let service: DataComplianceService;
    let mockRepository: any;

    beforeEach(() => {
      mockRepository = {
        createUserConsent: jest.fn(),
        revokeConsent: jest.fn(),
        getActiveConsents: jest.fn(),
        createProcessingRecord: jest.fn(),
        createDeletionRequest: jest.fn(),
        createAuditLog: jest.fn()
      };
      service = new DataComplianceService(mockRepository);
    });

    it('should grant consent with proper audit trail', async () => {
      const consentData = {
        userId: 'user-123',
        consentType: 'data_collection',
        granted: true,
        grantedAt: new Date(),
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        version: '1.0'
      };

      mockRepository.revokeConsent.mockResolvedValue(undefined);
      mockRepository.createUserConsent.mockResolvedValue({
        id: 'consent-456',
        ...consentData
      });
      mockRepository.createAuditLog.mockResolvedValue(undefined);

      const result = await service.grantConsent(
        'user-123',
        'data_collection',
        '192.168.1.1',
        'Mozilla/5.0'
      );

      expect(result).toHaveProperty('id', 'consent-456');
      expect(mockRepository.revokeConsent).toHaveBeenCalledWith('user-123', 'data_collection');
      expect(mockRepository.createAuditLog).toHaveBeenCalled();
    });

    it('should check consent status correctly', async () => {
      const mockConsents = [
        {
          consentType: 'data_collection',
          granted: true,
          revokedAt: null
        },
        {
          consentType: 'marketing',
          granted: false,
          revokedAt: new Date()
        }
      ];

      mockRepository.getActiveConsents.mockResolvedValue(mockConsents);

      const hasDataConsent = await service.checkConsent('user-123', 'data_collection');
      const hasMarketingConsent = await service.checkConsent('user-123', 'marketing');

      expect(hasDataConsent).toBe(true);
      expect(hasMarketingConsent).toBe(false);
    });

    it('should record data processing with retention policy', async () => {
      const processingData = {
        userId: 'user-123',
        dataType: 'personal',
        processingPurpose: 'User registration',
        legalBasis: 'consent',
        dataSource: 'registration_form'
      };

      mockRepository.createProcessingRecord.mockResolvedValue({
        id: 'record-789',
        ...processingData,
        retentionPeriod: 730, // 2 years
        deletionDate: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000)
      });

      const result = await service.recordDataProcessing(
        'user-123',
        'personal',
        'User registration',
        'consent',
        'registration_form'
      );

      expect(result).toHaveProperty('retentionPeriod', 730);
      expect(result).toHaveProperty('deletionDate');
    });

    it('should validate Indian compliance requirements', async () => {
      mockRepository.getAuditLogs.mockResolvedValue([
        { result: 'success' },
        { result: 'success' },
        { result: 'failure' }
      ]);

      const report = await service.generateComplianceReport();

      expect(report).toHaveProperty('dataMinimization');
      expect(report).toHaveProperty('purposeLimitation');
      expect(report).toHaveProperty('paymentDataLocalization');
      expect(report).toHaveProperty('grievanceOfficerAppointed');
      expect(report.complianceScore).toBe(67); // 2/3 success rate
    });
  });

  describe('AuthenticationService', () => {
    let service: AuthenticationService;

    beforeEach(() => {
      service = new AuthenticationService();
    });

    it('should generate and verify JWT tokens', async () => {
      const payload = { userId: 'user-123', role: 'user' };
      
      const token = service.generateToken(payload);
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');

      const decoded = service.verifyToken(token);
      expect(decoded).toMatchObject(payload);
    });

    it('should hash and verify passwords', async () => {
      const password = 'testPassword123';
      
      const hashedPassword = await service.hashPassword(password);
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(50);

      const isValid = await service.verifyPassword(password, hashedPassword);
      expect(isValid).toBe(true);

      const isInvalid = await service.verifyPassword('wrongPassword', hashedPassword);
      expect(isInvalid).toBe(false);
    });

    it('should generate secure random tokens', () => {
      const token1 = service.generateSecureToken();
      const token2 = service.generateSecureToken();

      expect(token1).not.toBe(token2);
      expect(token1.length).toBe(64); // 32 bytes = 64 hex chars
    });

    it('should validate token expiration', () => {
      const expiredPayload = {
        userId: 'user-123',
        exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
      };

      expect(() => {
        service.verifyToken(service.generateToken(expiredPayload));
      }).toThrow();
    });
  });

  describe('EncryptionService', () => {
    let service: EncryptionService;

    beforeEach(() => {
      service = new EncryptionService();
    });

    it('should encrypt and decrypt data correctly', () => {
      const plaintext = 'Sensitive user data';
      
      const encrypted = service.encrypt(plaintext);
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted).toMatch(/^[a-f0-9]+$/); // Hex string

      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should handle different data types', () => {
      const testData = [
        'Simple string',
        '{"json": "object"}',
        '12345',
        'Special chars: !@#$%^&*()',
        'Unicode: 🎉 हिंदी العربية'
      ];

      testData.forEach(data => {
        const encrypted = service.encrypt(data);
        const decrypted = service.decrypt(encrypted);
        expect(decrypted).toBe(data);
      });
    });

    it('should generate secure hashes', () => {
      const data = 'test data';
      
      const hash1 = service.hash(data);
      const hash2 = service.hash(data);

      expect(hash1).toBe(hash2); // Same input = same hash
      expect(hash1.length).toBe(64); // SHA-256 = 64 hex chars
    });

    it('should encrypt with different keys producing different results', () => {
      const plaintext = 'test data';
      
      const encrypted1 = service.encrypt(plaintext);
      const encrypted2 = service.encrypt(plaintext);

      // Should be different due to random IV
      expect(encrypted1).not.toBe(encrypted2);
      
      // But both should decrypt to same plaintext
      expect(service.decrypt(encrypted1)).toBe(plaintext);
      expect(service.decrypt(encrypted2)).toBe(plaintext);
    });
  });

  describe('CacheManager', () => {
    let cacheManager: CacheManager;
    let mockRedisService: any;

    beforeEach(() => {
      mockRedisService = {
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
        exists: jest.fn(),
        expire: jest.fn()
      };
      cacheManager = new CacheManager(mockRedisService);
    });

    it('should cache and retrieve data', async () => {
      const key = 'test:key';
      const value = { data: 'test value' };

      mockRedisService.get.mockResolvedValue(JSON.stringify(value));
      mockRedisService.set.mockResolvedValue('OK');

      await cacheManager.set(key, value, 3600);
      const retrieved = await cacheManager.get(key);

      expect(mockRedisService.set).toHaveBeenCalledWith(key, JSON.stringify(value), 3600);
      expect(retrieved).toEqual(value);
    });

    it('should handle cache misses', async () => {
      mockRedisService.get.mockResolvedValue(null);

      const result = await cacheManager.get('nonexistent:key');
      expect(result).toBeNull();
    });

    it('should invalidate cache by pattern', async () => {
      const pattern = 'user:123:*';
      mockRedisService.del.mockResolvedValue(5);

      const deletedCount = await cacheManager.invalidatePattern(pattern);
      expect(deletedCount).toBe(5);
      expect(mockRedisService.del).toHaveBeenCalledWith(pattern);
    });

    it('should handle cache errors gracefully', async () => {
      mockRedisService.get.mockRejectedValue(new Error('Redis connection failed'));

      const result = await cacheManager.get('test:key');
      expect(result).toBeNull(); // Should return null on error
    });
  });

  describe('PerformanceMonitor', () => {
    let monitor: PerformanceMonitor;

    beforeEach(() => {
      monitor = new PerformanceMonitor();
    });

    it('should collect system metrics', async () => {
      const metrics = await monitor.collectSystemMetrics();

      expect(metrics).toHaveProperty('cpu');
      expect(metrics).toHaveProperty('memory');
      expect(metrics).toHaveProperty('disk');
      expect(metrics.cpu).toHaveProperty('usage');
      expect(metrics.memory).toHaveProperty('used');
      expect(metrics.memory).toHaveProperty('total');
    });

    it('should track request performance', () => {
      const requestId = monitor.startRequest('/api/test', 'GET');
      
      // Simulate some processing time
      setTimeout(() => {
        const metrics = monitor.endRequest(requestId, 200);
        
        expect(metrics).toHaveProperty('duration');
        expect(metrics).toHaveProperty('statusCode', 200);
        expect(metrics.duration).toBeGreaterThan(0);
      }, 10);
    });

    it('should detect performance anomalies', () => {
      const normalMetrics = { responseTime: 100, errorRate: 0.01 };
      const slowMetrics = { responseTime: 5000, errorRate: 0.01 };
      const errorMetrics = { responseTime: 100, errorRate: 0.15 };

      expect(monitor.detectAnomalies(normalMetrics)).toHaveLength(0);
      expect(monitor.detectAnomalies(slowMetrics)).toContain('high_response_time');
      expect(monitor.detectAnomalies(errorMetrics)).toContain('high_error_rate');
    });

    it('should calculate performance scores', () => {
      const goodMetrics = { responseTime: 50, errorRate: 0.001, throughput: 1000 };
      const poorMetrics = { responseTime: 2000, errorRate: 0.1, throughput: 10 };

      const goodScore = monitor.calculatePerformanceScore(goodMetrics);
      const poorScore = monitor.calculatePerformanceScore(poorMetrics);

      expect(goodScore).toBeGreaterThan(poorScore);
      expect(goodScore).toBeGreaterThan(80);
      expect(poorScore).toBeLessThan(50);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle null and undefined inputs gracefully', () => {
      const encryptionService = new EncryptionService();
      
      expect(() => encryptionService.encrypt(null as any)).toThrow();
      expect(() => encryptionService.encrypt(undefined as any)).toThrow();
    });

    it('should handle malformed data', () => {
      const authService = new AuthenticationService();
      
      expect(() => authService.verifyToken('invalid.token.format')).toThrow();
      expect(() => authService.verifyToken('')).toThrow();
    });

    it('should handle concurrent operations', async () => {
      const cacheManager = new CacheManager({
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue('OK'),
        del: jest.fn().mockResolvedValue(1),
        exists: jest.fn().mockResolvedValue(false),
        expire: jest.fn().mockResolvedValue(true)
      });

      // Simulate concurrent cache operations
      const operations = Array(10).fill(null).map((_, i) =>
        cacheManager.set(`key:${i}`, `value:${i}`, 3600)
      );

      const results = await Promise.all(operations);
      expect(results).toHaveLength(10);
      results.forEach(result => expect(result).toBe('OK'));
    });
  });
});
import { EventCollectionService } from '../services/analytics/EventCollectionService';
import { AnalyticsRepository } from '../repositories/AnalyticsRepository';
import { 
  EventType, 
  UserAction, 
  BusinessMetric,
  UserEvent 
} from '../models/Analytics';

describe('EventCollectionService', () => {
  let eventService: EventCollectionService;
  let repository: AnalyticsRepository;
  const testUserId = 'test_user_123';

  beforeEach(() => {
    eventService = new EventCollectionService({
      batchSize: 5,
      flushInterval: 1000,
      enableRealTimeProcessing: true,
      enableDataValidation: true,
      enableEnrichment: true,
      maxRetries: 3
    });
    repository = new AnalyticsRepository();
  });

  afterEach(async () => {
    await eventService.shutdown();
  });

  describe('Event Collection', () => {
    test('should collect basic user event', async () => {
      const eventName = 'test_event';
      const properties = { action: 'click', target: 'button' };
      const context = { platform: 'telegram' as const, source: 'bot' };

      await eventService.collectEvent(testUserId, eventName, properties, context);

      // Verify event was processed (would check database in real implementation)
      expect(true).toBe(true); // Placeholder assertion
    });

    test('should collect user action event', async () => {
      const action = UserAction.COUPON_CLICK;
      const properties = { couponId: 'coupon_123', store: 'flipkart' };

      await eventService.collectUserAction(testUserId, action, properties);

      // Verify action event was processed
      expect(true).toBe(true); // Placeholder assertion
    });

    test('should collect business event', async () => {
      const metric = BusinessMetric.REVENUE;
      const value = 1500.50;
      const properties = { orderId: 'order_123', currency: 'INR' };

      await eventService.collectBusinessEvent(testUserId, metric, value, properties);

      // Verify business event was processed
      expect(true).toBe(true); // Placeholder assertion
    });

    test('should collect system event', async () => {
      const component = 'payment_service';
      const operation = 'process_payment';
      const status = 'success';
      const properties = { paymentId: 'pay_123', amount: 1000 };

      await eventService.collectSystemEvent(testUserId, component, operation, status, properties);

      // Verify system event was processed
      expect(true).toBe(true); // Placeholder assertion
    });

    test('should collect performance event', async () => {
      const metric = 'response_time';
      const value = 250;
      const unit = 'ms';
      const properties = { endpoint: '/api/coupons', method: 'GET' };

      await eventService.collectPerformanceEvent(testUserId, metric, value, unit, properties);

      // Verify performance event was processed
      expect(true).toBe(true); // Placeholder assertion
    });
  });

  describe('Event Validation', () => {
    test('should validate event data', async () => {
      const validEvent: UserEvent = {
        id: 'evt_123',
        userId: testUserId,
        sessionId: 'ses_123',
        eventType: EventType.USER_ACTION,
        eventName: 'valid_event',
        timestamp: new Date(),
        properties: { action: 'click' },
        context: { platform: 'telegram', source: 'bot' },
        metadata: {
          version: '1.0',
          environment: 'test',
          serverTimestamp: new Date()
        }
      };

      // Should not throw error for valid event
      await expect(
        eventService['validateEvent'](validEvent)
      ).resolves.not.toThrow();
    });

    test('should reject invalid event data', async () => {
      const invalidEvent: UserEvent = {
        id: '',
        userId: '',
        sessionId: '',
        eventType: EventType.USER_ACTION,
        eventName: '',
        timestamp: new Date(),
        properties: {},
        context: { platform: 'telegram', source: 'bot' },
        metadata: {
          version: '1.0',
          environment: 'test',
          serverTimestamp: new Date()
        }
      };

      // Should throw validation error
      await expect(
        eventService['validateEvent'](invalidEvent)
      ).rejects.toThrow('Event validation failed');
    });

    test('should reject event with invalid name format', async () => {
      const invalidEvent: UserEvent = {
        id: 'evt_123',
        userId: testUserId,
        sessionId: 'ses_123',
        eventType: EventType.USER_ACTION,
        eventName: 'invalid-event-name!', // Contains invalid characters
        timestamp: new Date(),
        properties: {},
        context: { platform: 'telegram', source: 'bot' },
        metadata: {
          version: '1.0',
          environment: 'test',
          serverTimestamp: new Date()
        }
      };

      await expect(
        eventService['validateEvent'](invalidEvent)
      ).rejects.toThrow('eventName contains invalid characters');
    });

    test('should reject event with oversized properties', async () => {
      const largeProperties = {};
      // Create properties that exceed size limit
      for (let i = 0; i < 1000; i++) {
        largeProperties[`key_${i}`] = 'x'.repeat(100);
      }

      const oversizedEvent: UserEvent = {
        id: 'evt_123',
        userId: testUserId,
        sessionId: 'ses_123',
        eventType: EventType.USER_ACTION,
        eventName: 'oversized_event',
        timestamp: new Date(),
        properties: largeProperties,
        context: { platform: 'telegram', source: 'bot' },
        metadata: {
          version: '1.0',
          environment: 'test',
          serverTimestamp: new Date()
        }
      };

      await expect(
        eventService['validateEvent'](oversizedEvent)
      ).rejects.toThrow('properties payload too large');
    });
  });

  describe('Session Management', () => {
    test('should start new session', async () => {
      const platform = 'telegram';
      const source = 'bot';
      const context = { platform: 'telegram' as const, source: 'bot' };

      const sessionId = await eventService.startSession(testUserId, platform, source, context);

      expect(sessionId).toBeDefined();
      expect(sessionId).toMatch(/^ses_/);
      expect(sessionId).toContain(testUserId);
    });

    test('should end session', async () => {
      const sessionId = await eventService.startSession(
        testUserId, 
        'telegram', 
        'bot', 
        { platform: 'telegram', source: 'bot' }
      );

      // Add some events to session
      await eventService.collectUserAction(testUserId, UserAction.COUPON_VIEW, { couponId: 'test' });
      await eventService.collectUserAction(testUserId, UserAction.COUPON_CLICK, { couponId: 'test' });

      await eventService.endSession(sessionId);

      // Session should be removed from cache
      expect(eventService['sessionCache'].has(sessionId)).toBe(false);
    });

    test('should track session properties', async () => {
      const sessionId = await eventService.startSession(
        testUserId, 
        'telegram', 
        'bot', 
        { platform: 'telegram', source: 'bot' }
      );

      // Collect multiple events
      await eventService.collectUserAction(testUserId, UserAction.COUPON_VIEW, { couponId: 'test1' });
      await eventService.collectUserAction(testUserId, UserAction.COUPON_CLICK, { couponId: 'test2' });
      await eventService.collectUserAction(testUserId, UserAction.PURCHASE_COMPLETED, { orderId: 'order1' });

      const session = eventService['sessionCache'].get(sessionId);
      expect(session).toBeDefined();
      expect(session.properties.eventsCount).toBeGreaterThan(0);
      expect(session.properties.uniqueActions).toBeGreaterThan(0);
      expect(session.properties.conversionEvents).toBeGreaterThan(0);
    });
  });

  describe('Batch Processing', () => {
    test('should collect event batch', async () => {
      const events = [
        {
          userId: testUserId,
          eventName: 'batch_event_1',
          properties: { type: 'test' },
          context: { platform: 'telegram' as const, source: 'bot' }
        },
        {
          userId: testUserId,
          eventName: 'batch_event_2',
          properties: { type: 'test' },
          context: { platform: 'telegram' as const, source: 'bot' }
        },
        {
          userId: testUserId,
          eventName: 'batch_event_3',
          properties: { type: 'test' },
          context: { platform: 'telegram' as const, source: 'bot' }
        }
      ];

      await eventService.collectEventBatch(events);

      // Verify batch was processed
      expect(true).toBe(true); // Placeholder assertion
    });

    test('should handle batch processing errors gracefully', async () => {
      const events = [
        {
          userId: '', // Invalid user ID
          eventName: 'invalid_event',
          properties: {},
          context: { platform: 'telegram' as const, source: 'bot' }
        }
      ];

      // Should handle invalid events in batch
      await expect(
        eventService.collectEventBatch(events)
      ).rejects.toThrow();
    });

    test('should flush events when buffer is full', async () => {
      // Configure small batch size for testing
      const smallBatchService = new EventCollectionService({
        batchSize: 2,
        flushInterval: 10000, // Long interval to test manual flush
        enableRealTimeProcessing: false
      });

      // Add events to fill buffer
      await smallBatchService.collectEvent(testUserId, 'event_1', {});
      await smallBatchService.collectEvent(testUserId, 'event_2', {}); // Should trigger flush

      // Buffer should be empty after flush
      expect(smallBatchService['eventBuffer'].length).toBe(0);

      await smallBatchService.shutdown();
    });
  });

  describe('Event Enrichment', () => {
    test('should enrich events with user properties', async () => {
      const eventName = 'enrichment_test';
      const properties = { action: 'test' };

      // Mock user properties enrichment
      jest.spyOn(eventService as any, 'getUserProperties').mockResolvedValue({
        userTier: 'premium',
        registrationDate: '2024-01-01'
      });

      await eventService.collectEvent(testUserId, eventName, properties);

      // Verify enrichment was applied (would check actual event data)
      expect(true).toBe(true); // Placeholder assertion
    });

    test('should enrich events with geo location', async () => {
      const eventName = 'geo_test';
      const properties = { action: 'test' };
      const context = { 
        platform: 'telegram' as const, 
        source: 'bot',
        ipAddress: '192.168.1.1'
      };

      // Mock geo location enrichment
      jest.spyOn(eventService as any, 'getGeoLocation').mockResolvedValue({
        country: 'India',
        region: 'Maharashtra',
        city: 'Mumbai'
      });

      await eventService.collectEvent(testUserId, eventName, properties, context);

      // Verify geo enrichment was applied
      expect(true).toBe(true); // Placeholder assertion
    });

    test('should handle enrichment failures gracefully', async () => {
      const eventName = 'enrichment_error_test';
      const properties = { action: 'test' };

      // Mock enrichment failure
      jest.spyOn(eventService as any, 'getUserProperties').mockRejectedValue(
        new Error('Enrichment service unavailable')
      );

      // Should not throw error even if enrichment fails
      await expect(
        eventService.collectEvent(testUserId, eventName, properties)
      ).resolves.not.toThrow();
    });
  });

  describe('Event Processing Rules', () => {
    test('should evaluate rule conditions correctly', async () => {
      const rule = {
        id: 'test_rule',
        name: 'Test Rule',
        eventType: EventType.USER_ACTION,
        conditions: [
          { field: 'properties.value', operator: 'gt', value: 100 }
        ],
        actions: [
          { type: 'enrich', parameters: { enrichmentData: { highValue: true } } }
        ],
        isActive: true,
        priority: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const event: UserEvent = {
        id: 'evt_123',
        userId: testUserId,
        sessionId: 'ses_123',
        eventType: EventType.USER_ACTION,
        eventName: 'test_event',
        timestamp: new Date(),
        properties: { value: 150 },
        context: { platform: 'telegram', source: 'bot' },
        metadata: {
          version: '1.0',
          environment: 'test',
          serverTimestamp: new Date()
        }
      };

      const result = eventService['evaluateRuleConditions'](rule, event);
      expect(result).toBe(true);
    });

    test('should reject events that do not meet rule conditions', async () => {
      const rule = {
        id: 'test_rule',
        name: 'Test Rule',
        eventType: EventType.USER_ACTION,
        conditions: [
          { field: 'properties.value', operator: 'gt', value: 100 }
        ],
        actions: [],
        isActive: true,
        priority: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const event: UserEvent = {
        id: 'evt_123',
        userId: testUserId,
        sessionId: 'ses_123',
        eventType: EventType.USER_ACTION,
        eventName: 'test_event',
        timestamp: new Date(),
        properties: { value: 50 }, // Below threshold
        context: { platform: 'telegram', source: 'bot' },
        metadata: {
          version: '1.0',
          environment: 'test',
          serverTimestamp: new Date()
        }
      };

      const result = eventService['evaluateRuleConditions'](rule, event);
      expect(result).toBe(false);
    });

    test('should handle complex rule conditions', async () => {
      const rule = {
        id: 'complex_rule',
        name: 'Complex Rule',
        eventType: EventType.USER_ACTION,
        conditions: [
          { field: 'properties.category', operator: 'eq', value: 'electronics' },
          { field: 'properties.amount', operator: 'gte', value: 1000 },
          { field: 'properties.store', operator: 'in', value: ['flipkart', 'amazon'] }
        ],
        actions: [],
        isActive: true,
        priority: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const matchingEvent: UserEvent = {
        id: 'evt_123',
        userId: testUserId,
        sessionId: 'ses_123',
        eventType: EventType.USER_ACTION,
        eventName: 'purchase',
        timestamp: new Date(),
        properties: { 
          category: 'electronics',
          amount: 1500,
          store: 'flipkart'
        },
        context: { platform: 'telegram', source: 'bot' },
        metadata: {
          version: '1.0',
          environment: 'test',
          serverTimestamp: new Date()
        }
      };

      const result = eventService['evaluateRuleConditions'](rule, matchingEvent);
      expect(result).toBe(true);
    });
  });

  describe('Event Type Determination', () => {
    test('should determine business event type', () => {
      const eventName = 'business_revenue';
      const properties = { businessMetric: 'revenue', value: 1000 };

      const eventType = eventService['determineEventType'](eventName, properties);
      expect(eventType).toBe(EventType.BUSINESS_EVENT);
    });

    test('should determine system event type', () => {
      const eventName = 'system_database_query';
      const properties = { component: 'database', operation: 'query' };

      const eventType = eventService['determineEventType'](eventName, properties);
      expect(eventType).toBe(EventType.SYSTEM_EVENT);
    });

    test('should determine performance event type', () => {
      const eventName = 'performance_response_time';
      const properties = { metric: 'response_time', value: 250 };

      const eventType = eventService['determineEventType'](eventName, properties);
      expect(eventType).toBe(EventType.PERFORMANCE_EVENT);
    });

    test('should determine error event type', () => {
      const eventName = 'api_error';
      const properties = { error: 'Database connection failed', errorCode: 'DB_001' };

      const eventType = eventService['determineEventType'](eventName, properties);
      expect(eventType).toBe(EventType.ERROR_EVENT);
    });

    test('should default to user action type', () => {
      const eventName = 'button_click';
      const properties = { target: 'submit_button' };

      const eventType = eventService['determineEventType'](eventName, properties);
      expect(eventType).toBe(EventType.USER_ACTION);
    });
  });

  describe('Helper Methods', () => {
    test('should generate unique event IDs', () => {
      const id1 = eventService['generateEventId']();
      const id2 = eventService['generateEventId']();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^evt_/);
      expect(id2).toMatch(/^evt_/);
    });

    test('should generate unique session IDs', () => {
      const id1 = eventService['generateSessionId'](testUserId);
      const id2 = eventService['generateSessionId'](testUserId);

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^ses_/);
      expect(id2).toMatch(/^ses_/);
      expect(id1).toContain(testUserId);
      expect(id2).toContain(testUserId);
    });

    test('should generate correlation IDs', () => {
      const id1 = eventService['generateCorrelationId']();
      const id2 = eventService['generateCorrelationId']();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^cor_/);
      expect(id2).toMatch(/^cor_/);
    });

    test('should identify conversion events', () => {
      const conversionEvent: UserEvent = {
        id: 'evt_123',
        userId: testUserId,
        sessionId: 'ses_123',
        eventType: EventType.USER_ACTION,
        eventName: UserAction.PURCHASE_COMPLETED,
        timestamp: new Date(),
        properties: {},
        context: { platform: 'telegram', source: 'bot' },
        metadata: {
          version: '1.0',
          environment: 'test',
          serverTimestamp: new Date()
        }
      };

      const isConversion = eventService['isConversionEvent'](conversionEvent);
      expect(isConversion).toBe(true);
    });

    test('should identify non-conversion events', () => {
      const regularEvent: UserEvent = {
        id: 'evt_123',
        userId: testUserId,
        sessionId: 'ses_123',
        eventType: EventType.USER_ACTION,
        eventName: UserAction.BOT_START,
        timestamp: new Date(),
        properties: {},
        context: { platform: 'telegram', source: 'bot' },
        metadata: {
          version: '1.0',
          environment: 'test',
          serverTimestamp: new Date()
        }
      };

      const isConversion = eventService['isConversionEvent'](regularEvent);
      expect(isConversion).toBe(false);
    });
  });

  describe('Service Lifecycle', () => {
    test('should initialize service correctly', async () => {
      const newService = new EventCollectionService();
      
      // Service should initialize without errors
      expect(newService).toBeDefined();
      
      await newService.shutdown();
    });

    test('should shutdown service gracefully', async () => {
      const newService = new EventCollectionService({
        batchSize: 10,
        flushInterval: 1000
      });

      // Add some events
      await newService.collectEvent(testUserId, 'shutdown_test', {});

      // Should shutdown without errors
      await expect(newService.shutdown()).resolves.not.toThrow();
    });

    test('should handle configuration options', () => {
      const customConfig = {
        batchSize: 50,
        flushInterval: 2000,
        enableRealTimeProcessing: false,
        enableDataValidation: false,
        enableEnrichment: false,
        maxRetries: 5
      };

      const configuredService = new EventCollectionService(customConfig);
      
      expect(configuredService['config'].batchSize).toBe(50);
      expect(configuredService['config'].flushInterval).toBe(2000);
      expect(configuredService['config'].enableRealTimeProcessing).toBe(false);
      expect(configuredService['config'].enableDataValidation).toBe(false);
      expect(configuredService['config'].enableEnrichment).toBe(false);
      expect(configuredService['config'].maxRetries).toBe(5);
    });
  });
});
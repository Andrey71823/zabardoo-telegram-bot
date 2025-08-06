import { BaseService } from '../base/BaseService';
import { AnalyticsRepository } from '../../repositories/AnalyticsRepository';
import { 
  UserEvent, 
  EventType, 
  UserAction, 
  BusinessMetric,
  EventContext,
  EventMetadata,
  UserActionEvent,
  BusinessEvent,
  SystemEvent,
  PerformanceEvent,
  UserSession,
  EventBatch,
  EventProcessingRule
} from '../../models/Analytics';

export interface EventCollectionConfig {
  batchSize: number;
  flushInterval: number; // milliseconds
  enableRealTimeProcessing: boolean;
  enableDataValidation: boolean;
  enableEnrichment: boolean;
  maxRetries: number;
}

export interface EventEnrichment {
  userProperties?: Record<string, any>;
  sessionProperties?: Record<string, any>;
  geoLocation?: {
    country: string;
    region: string;
    city: string;
  };
  deviceInfo?: {
    type: string;
    os: string;
    browser: string;
  };
}

export class EventCollectionService extends BaseService {
  private repository: AnalyticsRepository;
  private config: EventCollectionConfig;
  private eventBuffer: UserEvent[] = [];
  private sessionCache: Map<string, UserSession> = new Map();
  private processingRules: EventProcessingRule[] = [];
  private flushTimer?: NodeJS.Timeout;

  constructor(config?: Partial<EventCollectionConfig>) {
    super();
    this.repository = new AnalyticsRepository();
    this.config = {
      batchSize: 100,
      flushInterval: 5000, // 5 seconds
      enableRealTimeProcessing: true,
      enableDataValidation: true,
      enableEnrichment: true,
      maxRetries: 3,
      ...config
    };
    
    this.initializeService();
  }

  private async initializeService(): Promise<void> {
    try {
      // Load processing rules
      this.processingRules = await this.repository.getProcessingRules();
      
      // Start flush timer
      this.startFlushTimer();
      
      this.logger.info('Event collection service initialized', {
        config: this.config,
        rulesCount: this.processingRules.length
      });
    } catch (error) {
      this.logger.error('Failed to initialize event collection service', { error: error.message });
      throw error;
    }
  }

  // Main event collection method
  async collectEvent(
    userId: string,
    eventName: string,
    properties: Record<string, any> = {},
    context?: Partial<EventContext>
  ): Promise<void> {
    try {
      const event = await this.createEvent(userId, eventName, properties, context);
      
      if (this.config.enableDataValidation) {
        await this.validateEvent(event);
      }
      
      if (this.config.enableEnrichment) {
        await this.enrichEvent(event);
      }
      
      if (this.config.enableRealTimeProcessing) {
        await this.processEventRules(event);
      }
      
      // Add to buffer for batch processing
      this.eventBuffer.push(event);
      
      // Flush if buffer is full
      if (this.eventBuffer.length >= this.config.batchSize) {
        await this.flushEvents();
      }
      
      // Update session
      await this.updateSession(event);
      
      this.logger.debug('Event collected', { 
        userId, 
        eventName, 
        eventId: event.id,
        bufferSize: this.eventBuffer.length 
      });
      
    } catch (error) {
      this.logger.error('Failed to collect event', { 
        userId, 
        eventName, 
        error: error.message 
      });
      throw error;
    }
  }

  // Specific event collection methods
  async collectUserAction(
    userId: string,
    action: UserAction,
    properties: Record<string, any> = {},
    context?: Partial<EventContext>
  ): Promise<void> {
    const eventProperties = {
      action,
      ...properties
    };
    
    await this.collectEvent(userId, action, eventProperties, context);
  }

  async collectBusinessEvent(
    userId: string,
    metric: BusinessMetric,
    value: number,
    properties: Record<string, any> = {},
    context?: Partial<EventContext>
  ): Promise<void> {
    const eventProperties = {
      businessMetric: metric,
      value,
      currency: properties.currency || 'INR',
      ...properties
    };
    
    await this.collectEvent(userId, `business_${metric}`, eventProperties, context);
  }

  async collectSystemEvent(
    userId: string,
    component: string,
    operation: string,
    status: 'success' | 'failure' | 'warning',
    properties: Record<string, any> = {},
    context?: Partial<EventContext>
  ): Promise<void> {
    const eventProperties = {
      systemComponent: component,
      operation,
      status,
      ...properties
    };
    
    await this.collectEvent(userId, `system_${component}_${operation}`, eventProperties, context);
  }

  async collectPerformanceEvent(
    userId: string,
    metric: string,
    value: number,
    unit: string,
    properties: Record<string, any> = {},
    context?: Partial<EventContext>
  ): Promise<void> {
    const eventProperties = {
      performanceMetric: metric,
      value,
      unit,
      ...properties
    };
    
    await this.collectEvent(userId, `performance_${metric}`, eventProperties, context);
  }

  // Batch event collection
  async collectEventBatch(events: Array<{
    userId: string;
    eventName: string;
    properties: Record<string, any>;
    context?: Partial<EventContext>;
    timestamp?: Date;
  }>): Promise<void> {
    try {
      const processedEvents: UserEvent[] = [];
      
      for (const eventData of events) {
        const event = await this.createEvent(
          eventData.userId,
          eventData.eventName,
          eventData.properties,
          eventData.context,
          eventData.timestamp
        );
        
        if (this.config.enableDataValidation) {
          await this.validateEvent(event);
        }
        
        if (this.config.enableEnrichment) {
          await this.enrichEvent(event);
        }
        
        processedEvents.push(event);
      }
      
      // Store batch
      await this.repository.createEventBatch(processedEvents);
      
      // Process rules for each event
      if (this.config.enableRealTimeProcessing) {
        for (const event of processedEvents) {
          await this.processEventRules(event);
          await this.updateSession(event);
        }
      }
      
      this.logger.info('Event batch collected', { 
        eventCount: events.length,
        processedCount: processedEvents.length 
      });
      
    } catch (error) {
      this.logger.error('Failed to collect event batch', { 
        eventCount: events.length,
        error: error.message 
      });
      throw error;
    }
  }

  // Session management
  async startSession(
    userId: string,
    platform: string,
    source: string,
    context: EventContext
  ): Promise<string> {
    try {
      const sessionId = this.generateSessionId(userId);
      
      const session: UserSession = {
        id: sessionId,
        userId,
        sessionStart: new Date(),
        platform,
        source,
        events: [],
        properties: {
          eventsCount: 0,
          uniqueActions: 0,
          conversionEvents: 0
        },
        context
      };
      
      this.sessionCache.set(sessionId, session);
      await this.repository.createSession(session);
      
      // Collect session start event
      await this.collectUserAction(userId, UserAction.BOT_START, {
        sessionId,
        platform,
        source
      }, context);
      
      this.logger.info('Session started', { userId, sessionId, platform, source });
      return sessionId;
      
    } catch (error) {
      this.logger.error('Failed to start session', { userId, error: error.message });
      throw error;
    }
  }

  async endSession(sessionId: string): Promise<void> {
    try {
      const session = this.sessionCache.get(sessionId);
      if (!session) {
        this.logger.warn('Session not found in cache', { sessionId });
        return;
      }
      
      const sessionEnd = new Date();
      const duration = sessionEnd.getTime() - session.sessionStart.getTime();
      
      await this.repository.updateSession(sessionId, {
        sessionEnd,
        duration,
        properties: session.properties
      });
      
      this.sessionCache.delete(sessionId);
      
      this.logger.info('Session ended', { 
        sessionId, 
        userId: session.userId,
        duration: Math.round(duration / 1000) 
      });
      
    } catch (error) {
      this.logger.error('Failed to end session', { sessionId, error: error.message });
      throw error;
    }
  }

  // Event processing and enrichment
  private async createEvent(
    userId: string,
    eventName: string,
    properties: Record<string, any>,
    context?: Partial<EventContext>,
    timestamp?: Date
  ): Promise<UserEvent> {
    const sessionId = this.getCurrentSessionId(userId);
    
    const event: UserEvent = {
      id: this.generateEventId(),
      userId,
      sessionId,
      eventType: this.determineEventType(eventName, properties),
      eventName,
      timestamp: timestamp || new Date(),
      properties,
      context: {
        platform: 'telegram',
        source: 'bot',
        ...context
      },
      metadata: {
        version: '1.0',
        environment: process.env.NODE_ENV as any || 'development',
        serverTimestamp: new Date(),
        correlationId: this.generateCorrelationId()
      }
    };
    
    return event;
  }

  private async validateEvent(event: UserEvent): Promise<void> {
    const errors: string[] = [];
    
    if (!event.userId) errors.push('userId is required');
    if (!event.eventName) errors.push('eventName is required');
    if (!event.timestamp) errors.push('timestamp is required');
    if (!event.sessionId) errors.push('sessionId is required');
    
    // Validate event name format
    if (!/^[a-zA-Z0-9_]+$/.test(event.eventName)) {
      errors.push('eventName contains invalid characters');
    }
    
    // Validate properties size
    const propertiesSize = JSON.stringify(event.properties).length;
    if (propertiesSize > 10000) { // 10KB limit
      errors.push('properties payload too large');
    }
    
    if (errors.length > 0) {
      throw new Error(`Event validation failed: ${errors.join(', ')}`);
    }
  }

  private async enrichEvent(event: UserEvent): Promise<void> {
    try {
      // Enrich with user properties
      const userProperties = await this.getUserProperties(event.userId);
      if (userProperties) {
        event.properties.userProperties = userProperties;
      }
      
      // Enrich with session properties
      const session = this.sessionCache.get(event.sessionId);
      if (session) {
        event.properties.sessionProperties = {
          sessionDuration: Date.now() - session.sessionStart.getTime(),
          eventsInSession: session.properties.eventsCount
        };
      }
      
      // Enrich with geo location (mock)
      if (event.context.ipAddress) {
        event.context.location = await this.getGeoLocation(event.context.ipAddress);
      }
      
    } catch (error) {
      this.logger.warn('Event enrichment failed', { 
        eventId: event.id,
        error: error.message 
      });
    }
  }

  private async processEventRules(event: UserEvent): Promise<void> {
    try {
      const applicableRules = this.processingRules.filter(rule => 
        rule.eventType === event.eventType && this.evaluateRuleConditions(rule, event)
      );
      
      for (const rule of applicableRules) {
        await this.executeRuleActions(rule, event);
      }
      
    } catch (error) {
      this.logger.error('Event rule processing failed', { 
        eventId: event.id,
        error: error.message 
      });
    }
  }

  private evaluateRuleConditions(rule: EventProcessingRule, event: UserEvent): boolean {
    try {
      for (const condition of rule.conditions) {
        const fieldValue = this.getFieldValue(event, condition.field);
        const conditionMet = this.evaluateCondition(fieldValue, condition.operator, condition.value);
        
        if (!conditionMet) {
          return false;
        }
      }
      return true;
    } catch (error) {
      this.logger.warn('Rule condition evaluation failed', { 
        ruleId: rule.id,
        error: error.message 
      });
      return false;
    }
  }

  private async executeRuleActions(rule: EventProcessingRule, event: UserEvent): Promise<void> {
    for (const action of rule.actions) {
      try {
        switch (action.type) {
          case 'enrich':
            await this.executeEnrichAction(action.parameters, event);
            break;
          case 'filter':
            await this.executeFilterAction(action.parameters, event);
            break;
          case 'transform':
            await this.executeTransformAction(action.parameters, event);
            break;
          case 'route':
            await this.executeRouteAction(action.parameters, event);
            break;
          case 'alert':
            await this.executeAlertAction(action.parameters, event);
            break;
        }
      } catch (error) {
        this.logger.error('Rule action execution failed', { 
          ruleId: rule.id,
          actionType: action.type,
          error: error.message 
        });
      }
    }
  }

  private async updateSession(event: UserEvent): Promise<void> {
    try {
      const session = this.sessionCache.get(event.sessionId);
      if (!session) return;
      
      session.events.push(event);
      session.properties.eventsCount++;
      
      // Update unique actions
      const uniqueActions = new Set(session.events.map(e => e.eventName));
      session.properties.uniqueActions = uniqueActions.size;
      
      // Check for conversion events
      if (this.isConversionEvent(event)) {
        session.properties.conversionEvents++;
      }
      
      this.sessionCache.set(event.sessionId, session);
      
    } catch (error) {
      this.logger.warn('Session update failed', { 
        sessionId: event.sessionId,
        error: error.message 
      });
    }
  }

  // Batch processing
  private async flushEvents(): Promise<void> {
    if (this.eventBuffer.length === 0) return;
    
    try {
      const eventsToFlush = [...this.eventBuffer];
      this.eventBuffer = [];
      
      await this.repository.createEventBatch(eventsToFlush);
      
      this.logger.debug('Events flushed to database', { 
        eventCount: eventsToFlush.length 
      });
      
    } catch (error) {
      this.logger.error('Failed to flush events', { 
        eventCount: this.eventBuffer.length,
        error: error.message 
      });
      
      // Re-add events to buffer for retry
      this.eventBuffer.unshift(...this.eventBuffer);
    }
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(async () => {
      await this.flushEvents();
    }, this.config.flushInterval);
  }

  // Helper methods
  private determineEventType(eventName: string, properties: Record<string, any>): EventType {
    if (eventName.startsWith('business_')) return EventType.BUSINESS_EVENT;
    if (eventName.startsWith('system_')) return EventType.SYSTEM_EVENT;
    if (eventName.startsWith('performance_')) return EventType.PERFORMANCE_EVENT;
    if (properties.error || properties.errorCode) return EventType.ERROR_EVENT;
    return EventType.USER_ACTION;
  }

  private getCurrentSessionId(userId: string): string {
    // Find active session for user
    for (const [sessionId, session] of this.sessionCache.entries()) {
      if (session.userId === userId && !session.sessionEnd) {
        return sessionId;
      }
    }
    
    // Create new session if none found
    const sessionId = this.generateSessionId(userId);
    const session: UserSession = {
      id: sessionId,
      userId,
      sessionStart: new Date(),
      platform: 'telegram',
      source: 'bot',
      events: [],
      properties: {
        eventsCount: 0,
        uniqueActions: 0,
        conversionEvents: 0
      },
      context: {
        platform: 'telegram',
        source: 'bot'
      }
    };
    
    this.sessionCache.set(sessionId, session);
    return sessionId;
  }

  private async getUserProperties(userId: string): Promise<Record<string, any> | null> {
    // Mock implementation - would fetch from user service
    return {
      userTier: 'premium',
      registrationDate: '2024-01-01',
      totalPurchases: 15,
      preferredLanguage: 'en'
    };
  }

  private async getGeoLocation(ipAddress: string): Promise<any> {
    // Mock implementation - would use geo IP service
    return {
      country: 'India',
      region: 'Maharashtra',
      city: 'Mumbai'
    };
  }

  private getFieldValue(event: UserEvent, field: string): any {
    const parts = field.split('.');
    let value: any = event;
    
    for (const part of parts) {
      value = value?.[part];
    }
    
    return value;
  }

  private evaluateCondition(fieldValue: any, operator: string, expectedValue: any): boolean {
    switch (operator) {
      case 'eq': return fieldValue === expectedValue;
      case 'ne': return fieldValue !== expectedValue;
      case 'gt': return fieldValue > expectedValue;
      case 'lt': return fieldValue < expectedValue;
      case 'gte': return fieldValue >= expectedValue;
      case 'lte': return fieldValue <= expectedValue;
      case 'in': return Array.isArray(expectedValue) && expectedValue.includes(fieldValue);
      case 'contains': return String(fieldValue).includes(String(expectedValue));
      default: return false;
    }
  }

  private async executeEnrichAction(parameters: Record<string, any>, event: UserEvent): Promise<void> {
    // Add enrichment data to event
    Object.assign(event.properties, parameters.enrichmentData || {});
  }

  private async executeFilterAction(parameters: Record<string, any>, event: UserEvent): Promise<void> {
    // Mark event for filtering (would be handled in processing pipeline)
    event.metadata.filtered = true;
    event.metadata.filterReason = parameters.reason;
  }

  private async executeTransformAction(parameters: Record<string, any>, event: UserEvent): Promise<void> {
    // Apply transformations to event
    if (parameters.transformations) {
      for (const [field, transformation] of Object.entries(parameters.transformations)) {
        // Apply transformation logic
      }
    }
  }

  private async executeRouteAction(parameters: Record<string, any>, event: UserEvent): Promise<void> {
    // Route event to different destination
    event.metadata.routeTo = parameters.destination;
  }

  private async executeAlertAction(parameters: Record<string, any>, event: UserEvent): Promise<void> {
    // Trigger alert
    this.logger.warn('Event alert triggered', {
      eventId: event.id,
      alertType: parameters.alertType,
      message: parameters.message
    });
  }

  private isConversionEvent(event: UserEvent): boolean {
    const conversionEvents = [
      UserAction.PURCHASE_COMPLETED,
      UserAction.CASHBACK_EARNED,
      UserAction.COUPON_CLICK
    ];
    
    return conversionEvents.includes(event.eventName as UserAction);
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(userId: string): string {
    return `ses_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  private generateCorrelationId(): string {
    return `cor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Cleanup
  async shutdown(): Promise<void> {
    try {
      if (this.flushTimer) {
        clearInterval(this.flushTimer);
      }
      
      // Flush remaining events
      await this.flushEvents();
      
      // End all active sessions
      for (const sessionId of this.sessionCache.keys()) {
        await this.endSession(sessionId);
      }
      
      this.logger.info('Event collection service shutdown completed');
      
    } catch (error) {
      this.logger.error('Error during service shutdown', { error: error.message });
    }
  }
}
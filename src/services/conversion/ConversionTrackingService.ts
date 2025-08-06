import { Pool } from 'pg';
import { ConversionTrackingRepository } from '../../repositories/ConversionTrackingRepository';
import { TrafficManagerRepository } from '../../repositories/TrafficManagerRepository';
import { BaseService } from '../base/BaseService';
import { 
  ConversionPixel, 
  ConversionRule, 
  ConversionWebhook, 
  ConversionFraud, 
  ConversionAttribution,
  ConversionCondition,
  ConversionAction,
  AttributionTouchpoint
} from '../../models/ConversionTracking';
import { ConversionEvent } from '../../models/TrafficManager';
import axios from 'axios';
import { logger } from '../../config/logger';

export interface ConversionWebhookPayload {
  orderId: string;
  clickId: string;
  userId: string;
  storeId: string;
  storeName: string;
  orderValue: number;
  currency: string;
  commission: number;
  commissionRate: number;
  products: Array<{
    id: string;
    name: string;
    category: string;
    price: number;
    quantity: number;
  }>;
  customerInfo: {
    email?: string;
    phone?: string;
    location?: string;
  };
  metadata: Record<string, any>;
}

export interface FraudDetectionResult {
  isFraud: boolean;
  riskScore: number;
  indicators: string[];
  reason: string;
}

export class ConversionTrackingService extends BaseService {
  private conversionRepo: ConversionTrackingRepository;
  private trafficRepo: TrafficManagerRepository;

  constructor(pool: Pool) {
    super();
    this.conversionRepo = new ConversionTrackingRepository(pool);
    this.trafficRepo = new TrafficManagerRepository(pool);
  }

  // Webhook handling for conversion events
  async handleConversionWebhook(payload: ConversionWebhookPayload): Promise<ConversionEvent> {
    try {
      logger.info('Processing conversion webhook', { 
        orderId: payload.orderId, 
        clickId: payload.clickId 
      });

      // Validate click exists and get click data
      const clickEvent = await this.trafficRepo.getClickEvent(payload.clickId);
      if (!clickEvent) {
        throw new Error(`Click event not found: ${payload.clickId}`);
      }

      // Check for duplicate conversions
      const existingConversion = await this.trafficRepo.getConversionByOrderId(payload.orderId);
      if (existingConversion) {
        logger.warn('Duplicate conversion detected', { 
          orderId: payload.orderId,
          existingId: existingConversion.id 
        });
        return existingConversion;
      }

      // Apply conversion rules
      const appliedRules = await this.applyConversionRules(payload);
      
      // Calculate final commission based on rules
      let finalCommission = payload.commission;
      let finalCommissionRate = payload.commissionRate;
      
      for (const rule of appliedRules) {
        const result = this.executeRuleActions(rule.actions, payload);
        if (result.commission !== undefined) {
          finalCommission = result.commission;
        }
        if (result.commissionRate !== undefined) {
          finalCommissionRate = result.commissionRate;
        }
      }

      // Create conversion event
      const conversionEvent: Omit<ConversionEvent, 'id' | 'createdAt' | 'updatedAt'> = {
        clickId: payload.clickId,
        userId: payload.userId,
        orderId: payload.orderId,
        storeId: payload.storeId,
        storeName: payload.storeName,
        orderValue: payload.orderValue,
        currency: payload.currency,
        commission: finalCommission,
        commissionRate: finalCommissionRate,
        conversionTime: new Date(),
        processingStatus: 'pending',
        products: payload.products,
        customerInfo: payload.customerInfo,
        appliedRules: appliedRules.map(r => r.id),
        metadata: {
          ...payload.metadata,
          originalCommission: payload.commission,
          originalCommissionRate: payload.commissionRate,
          rulesApplied: appliedRules.length
        }
      };

      const conversion = await this.trafficRepo.createConversionEvent(conversionEvent);

      // Perform fraud detection
      const fraudResult = await this.detectFraud(conversion, clickEvent);
      if (fraudResult.isFraud) {
        await this.handleFraudDetection(conversion, fraudResult);
      }

      // Calculate attribution
      await this.calculateAttribution(conversion);

      // Fire conversion pixels
      await this.fireConversionPixels(conversion);

      // Trigger webhooks
      await this.triggerConversionWebhooks('conversion_created', conversion);

      // Update rule usage counters
      for (const rule of appliedRules) {
        await this.conversionRepo.incrementRuleUsage(rule.id);
      }

      logger.info('Conversion processed successfully', { 
        conversionId: conversion.id,
        orderId: payload.orderId 
      });

      return conversion;

    } catch (error) {
      logger.error('Error processing conversion webhook', { 
        error: error.message,
        orderId: payload.orderId 
      });
      throw error;
    }
  }

  // Apply conversion rules to determine commission adjustments
  private async applyConversionRules(payload: ConversionWebhookPayload): Promise<ConversionRule[]> {
    const rules = await this.conversionRepo.getActiveConversionRules(
      payload.storeId,
      payload.products[0]?.category
    );

    const appliedRules: ConversionRule[] = [];

    for (const rule of rules) {
      if (await this.evaluateRuleConditions(rule.conditions, payload)) {
        appliedRules.push(rule);
      }
    }

    return appliedRules;
  }

  // Evaluate rule conditions against conversion data
  private async evaluateRuleConditions(
    conditions: ConversionCondition[], 
    payload: ConversionWebhookPayload
  ): Promise<boolean> {
    if (conditions.length === 0) return true;

    let result = true;
    let currentLogicalOp = 'AND';

    for (const condition of conditions) {
      const conditionResult = this.evaluateCondition(condition, payload);
      
      if (currentLogicalOp === 'AND') {
        result = result && conditionResult;
      } else {
        result = result || conditionResult;
      }

      currentLogicalOp = condition.logicalOperator || 'AND';
    }

    return result;
  }

  private evaluateCondition(condition: ConversionCondition, payload: ConversionWebhookPayload): boolean {
    let fieldValue: any;

    switch (condition.field) {
      case 'orderValue':
        fieldValue = payload.orderValue;
        break;
      case 'productCategory':
        fieldValue = payload.products[0]?.category;
        break;
      case 'storeId':
        fieldValue = payload.storeId;
        break;
      case 'currency':
        fieldValue = payload.currency;
        break;
      default:
        fieldValue = payload.metadata[condition.field];
    }

    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'not_equals':
        return fieldValue !== condition.value;
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value);
      case 'less_than':
        return Number(fieldValue) < Number(condition.value);
      case 'contains':
        return String(fieldValue).includes(String(condition.value));
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
      default:
        return false;
    }
  }

  // Execute rule actions to modify conversion parameters
  private executeRuleActions(actions: ConversionAction[], payload: ConversionWebhookPayload): any {
    const result: any = {};

    for (const action of actions) {
      switch (action.type) {
        case 'set_commission_rate':
          result.commissionRate = action.parameters.rate;
          result.commission = payload.orderValue * (action.parameters.rate / 100);
          break;
        case 'add_bonus':
          result.commission = (result.commission || payload.commission) + action.parameters.amount;
          break;
        case 'send_notification':
          // Will be handled separately
          break;
        case 'tag_user':
          result.userTags = action.parameters.tags;
          break;
        case 'trigger_webhook':
          result.webhookUrl = action.parameters.url;
          break;
      }
    }

    return result;
  }

  // Fraud detection system
  private async detectFraud(conversion: ConversionEvent, clickEvent: any): Promise<FraudDetectionResult> {
    const indicators: string[] = [];
    let riskScore = 0;

    // Check for duplicate conversions from same user
    const userConversions = await this.trafficRepo.getConversionsByUser(
      conversion.userId,
      new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      new Date()
    );

    if (userConversions.length > 5) {
      indicators.push('excessive_conversions_24h');
      riskScore += 30;
    }

    // Check time between click and conversion
    const timeDiff = conversion.conversionTime.getTime() - clickEvent.clickTime.getTime();
    if (timeDiff < 10000) { // Less than 10 seconds
      indicators.push('suspiciously_fast_conversion');
      riskScore += 25;
    }

    // Check for unusual order values
    const avgOrderValue = await this.getAverageOrderValue(conversion.storeId);
    if (conversion.orderValue > avgOrderValue * 10) {
      indicators.push('unusually_high_order_value');
      riskScore += 20;
    }

    // Check for bot-like patterns
    if (clickEvent.userAgent && this.isBotUserAgent(clickEvent.userAgent)) {
      indicators.push('bot_user_agent');
      riskScore += 40;
    }

    // Check IP reputation (simplified)
    if (clickEvent.ipAddress && await this.isHighRiskIP(clickEvent.ipAddress)) {
      indicators.push('high_risk_ip');
      riskScore += 35;
    }

    const isFraud = riskScore >= 50;
    
    return {
      isFraud,
      riskScore,
      indicators,
      reason: isFraud ? `Risk score: ${riskScore}, Indicators: ${indicators.join(', ')}` : 'No fraud detected'
    };
  }

  private async handleFraudDetection(conversion: ConversionEvent, fraudResult: FraudDetectionResult): Promise<void> {
    const fraudCase: Omit<ConversionFraud, 'id' | 'createdAt' | 'updatedAt'> = {
      conversionId: conversion.id,
      clickId: conversion.clickId,
      userId: conversion.userId,
      fraudType: this.determineFraudType(fraudResult.indicators),
      riskScore: fraudResult.riskScore,
      fraudIndicators: fraudResult.indicators,
      detectionMethod: 'automatic',
      status: fraudResult.riskScore >= 80 ? 'confirmed_fraud' : 'pending',
      metadata: {
        detectionTime: new Date(),
        conversionValue: conversion.orderValue,
        reason: fraudResult.reason
      }
    };

    await this.conversionRepo.createConversionFraud(fraudCase);

    // Update conversion status if high risk
    if (fraudResult.riskScore >= 80) {
      await this.trafficRepo.updateConversionStatus(conversion.id, 'fraud_detected');
    }

    logger.warn('Fraud detected in conversion', {
      conversionId: conversion.id,
      riskScore: fraudResult.riskScore,
      indicators: fraudResult.indicators
    });
  }

  private determineFraudType(indicators: string[]): string {
    if (indicators.includes('excessive_conversions_24h')) return 'duplicate_conversion';
    if (indicators.includes('bot_user_agent')) return 'bot_traffic';
    if (indicators.includes('suspiciously_fast_conversion')) return 'invalid_click';
    return 'suspicious_pattern';
  }

  // Attribution calculation
  private async calculateAttribution(conversion: ConversionEvent): Promise<void> {
    try {
      // Get all clicks from this user in the attribution window (30 days)
      const attributionWindow = 30 * 24 * 60 * 60 * 1000; // 30 days in ms
      const windowStart = new Date(conversion.conversionTime.getTime() - attributionWindow);
      
      const userClicks = await this.trafficRepo.getClicksByUser(
        conversion.userId,
        windowStart,
        conversion.conversionTime
      );

      if (userClicks.length === 0) return;

      // Create touchpoints
      const touchpoints: AttributionTouchpoint[] = userClicks.map((click, index) => ({
        id: click.id,
        clickId: click.clickId,
        source: click.source,
        sourceDetails: click.sourceDetails,
        timestamp: click.clickTime,
        weight: 0, // Will be calculated based on model
        position: index === 0 ? 1 : (index === userClicks.length - 1 ? -1 : index + 1),
        timeSinceFirstClick: click.clickTime.getTime() - userClicks[0].clickTime.getTime(),
        timeSinceLastClick: conversion.conversionTime.getTime() - click.clickTime.getTime(),
        conversionValue: conversion.orderValue / userClicks.length,
        commission: conversion.commission / userClicks.length
      }));

      // Apply attribution model (default: last click)
      const attributionModel = 'last_click';
      const weights = this.calculateAttributionWeights(touchpoints, attributionModel);
      
      // Update touchpoints with calculated weights
      touchpoints.forEach((touchpoint, index) => {
        touchpoint.weight = weights[index];
        touchpoint.conversionValue = conversion.orderValue * weights[index];
        touchpoint.commission = conversion.commission * weights[index];
      });

      const attribution: Omit<ConversionAttribution, 'id' | 'createdAt' | 'updatedAt'> = {
        conversionId: conversion.id,
        userId: conversion.userId,
        attributionModel,
        touchpoints,
        attributionWeights: weights.reduce((acc, weight, index) => {
          acc[touchpoints[index].source] = (acc[touchpoints[index].source] || 0) + weight;
          return acc;
        }, {} as Record<string, number>),
        totalWeight: weights.reduce((sum, weight) => sum + weight, 0),
        calculatedAt: new Date(),
        metadata: {
          totalTouchpoints: touchpoints.length,
          attributionWindow: attributionWindow / (24 * 60 * 60 * 1000) // days
        }
      };

      await this.conversionRepo.createConversionAttribution(attribution);

    } catch (error) {
      logger.error('Error calculating attribution', { 
        conversionId: conversion.id, 
        error: error.message 
      });
    }
  }

  private calculateAttributionWeights(touchpoints: AttributionTouchpoint[], model: string): number[] {
    const count = touchpoints.length;
    
    switch (model) {
      case 'first_click':
        return touchpoints.map((_, index) => index === 0 ? 1 : 0);
      
      case 'last_click':
        return touchpoints.map((_, index) => index === count - 1 ? 1 : 0);
      
      case 'linear':
        return touchpoints.map(() => 1 / count);
      
      case 'time_decay':
        const decayRate = 0.7;
        const weights = touchpoints.map((_, index) => Math.pow(decayRate, count - 1 - index));
        const sum = weights.reduce((a, b) => a + b, 0);
        return weights.map(w => w / sum);
      
      case 'position_based':
        if (count === 1) return [1];
        if (count === 2) return [0.4, 0.4];
        const firstLast = 0.4;
        const middle = 0.2 / (count - 2);
        return touchpoints.map((_, index) => {
          if (index === 0 || index === count - 1) return firstLast;
          return middle;
        });
      
      default:
        return touchpoints.map((_, index) => index === count - 1 ? 1 : 0);
    }
  }

  // Fire conversion pixels
  private async fireConversionPixels(conversion: ConversionEvent): Promise<void> {
    try {
      const pixels = await this.conversionRepo.getConversionPixelsByStore(conversion.storeId);
      
      for (const pixel of pixels) {
        if (pixel.testMode && process.env.NODE_ENV === 'production') continue;
        
        await this.firePixel(pixel, conversion);
      }
    } catch (error) {
      logger.error('Error firing conversion pixels', { 
        conversionId: conversion.id, 
        error: error.message 
      });
    }
  }

  private async firePixel(pixel: ConversionPixel, conversion: ConversionEvent): Promise<void> {
    try {
      let pixelUrl = pixel.trackingCode;
      
      // Replace placeholders in tracking code
      const replacements = {
        '{{ORDER_ID}}': conversion.orderId,
        '{{ORDER_VALUE}}': conversion.orderValue.toString(),
        '{{CURRENCY}}': conversion.currency,
        '{{USER_ID}}': conversion.userId,
        '{{CLICK_ID}}': conversion.clickId,
        ...pixel.customParameters
      };

      for (const [placeholder, value] of Object.entries(replacements)) {
        pixelUrl = pixelUrl.replace(new RegExp(placeholder, 'g'), String(value));
      }

      if (pixel.pixelType === 'postback') {
        await axios.get(pixelUrl, { timeout: 5000 });
      } else {
        // For Facebook, Google pixels - would need specific implementation
        logger.info('Pixel fired', { pixelType: pixel.pixelType, url: pixelUrl });
      }

    } catch (error) {
      logger.error('Error firing pixel', { 
        pixelId: pixel.id, 
        error: error.message 
      });
    }
  }

  // Webhook triggers
  private async triggerConversionWebhooks(event: string, conversion: ConversionEvent): Promise<void> {
    try {
      const webhooks = await this.conversionRepo.getActiveWebhooksForEvent(event);
      
      for (const webhook of webhooks) {
        await this.executeWebhook(webhook, conversion);
      }
    } catch (error) {
      logger.error('Error triggering webhooks', { 
        event, 
        conversionId: conversion.id, 
        error: error.message 
      });
    }
  }

  private async executeWebhook(webhook: ConversionWebhook, conversion: ConversionEvent): Promise<void> {
    try {
      const payload = {
        ...webhook.payload,
        conversion,
        timestamp: new Date().toISOString()
      };

      const response = await axios({
        method: webhook.method,
        url: webhook.url,
        headers: webhook.headers,
        data: payload,
        timeout: webhook.timeout * 1000
      });

      await this.conversionRepo.updateWebhookStats(webhook.id, true);
      
      logger.info('Webhook executed successfully', { 
        webhookId: webhook.id, 
        status: response.status 
      });

    } catch (error) {
      await this.conversionRepo.updateWebhookStats(webhook.id, false);
      
      logger.error('Webhook execution failed', { 
        webhookId: webhook.id, 
        error: error.message 
      });

      // Implement retry logic here if needed
    }
  }

  // Helper methods
  private async getAverageOrderValue(storeId: string): Promise<number> {
    const stats = await this.conversionRepo.getConversionStats(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      new Date(),
      storeId
    );
    return Number(stats.average_order_value) || 0;
  }

  private isBotUserAgent(userAgent: string): boolean {
    const botPatterns = [
      /bot/i, /crawler/i, /spider/i, /scraper/i,
      /curl/i, /wget/i, /python/i, /java/i
    ];
    return botPatterns.some(pattern => pattern.test(userAgent));
  }

  private async isHighRiskIP(ipAddress: string): Promise<boolean> {
    // Simplified IP risk check - in production, use a service like MaxMind
    const highRiskRanges = ['10.0.0.0/8', '192.168.0.0/16', '172.16.0.0/12'];
    // This is a placeholder - implement proper IP risk checking
    return false;
  }

  // Public API methods
  async confirmConversion(conversionId: string): Promise<void> {
    await this.trafficRepo.updateConversionStatus(conversionId, 'confirmed');
    await this.triggerConversionWebhooks('conversion_confirmed', 
      await this.trafficRepo.getConversionEvent(conversionId)
    );
  }

  async cancelConversion(conversionId: string, reason?: string): Promise<void> {
    await this.trafficRepo.updateConversionStatus(conversionId, 'cancelled');
    await this.triggerConversionWebhooks('conversion_cancelled', 
      await this.trafficRepo.getConversionEvent(conversionId)
    );
  }

  async refundConversion(conversionId: string, refundAmount?: number): Promise<void> {
    const conversion = await this.trafficRepo.getConversionEvent(conversionId);
    if (refundAmount && refundAmount < conversion.orderValue) {
      // Partial refund - adjust commission proportionally
      const refundRatio = refundAmount / conversion.orderValue;
      const newCommission = conversion.commission * (1 - refundRatio);
      await this.trafficRepo.updateConversionCommission(conversionId, newCommission);
    } else {
      // Full refund
      await this.trafficRepo.updateConversionStatus(conversionId, 'refunded');
    }
    
    await this.triggerConversionWebhooks('conversion_refunded', conversion);
  }
}
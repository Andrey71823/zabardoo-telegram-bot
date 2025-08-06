import { BaseService } from '../base/BaseService';
import { CashbackTrackingService, CashbackTrackingEvent, CashbackStatusUpdate } from './CashbackTrackingService';
import { ConversionTrackingService } from '../conversion/ConversionTrackingService';

export interface WebhookPayload {
  event: string;
  data: any;
  timestamp: string;
  signature?: string;
  source: string;
}

export interface ConversionWebhookData {
  userId: string;
  transactionId: string;
  orderId: string;
  amount: number;
  currency: string;
  store: string;
  category?: string;
  products?: Array<{
    id: string;
    name: string;
    category: string;
    price: number;
    quantity: number;
  }>;
  affiliateId?: string;
  clickId?: string;
  conversionId?: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'refunded';
  metadata?: any;
}

export interface AffiliateWebhookData {
  transactionId: string;
  status: 'approved' | 'rejected' | 'pending';
  commissionAmount: number;
  reason?: string;
  metadata?: any;
}

export class CashbackWebhookService extends BaseService {
  private cashbackTrackingService: CashbackTrackingService;
  private conversionService: ConversionTrackingService;

  constructor() {
    super();
    this.cashbackTrackingService = new CashbackTrackingService();
    this.conversionService = new ConversionTrackingService();
  }

  // Main webhook handler
  async handleWebhook(payload: WebhookPayload): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      this.logger.info('Processing webhook', { 
        event: payload.event, 
        source: payload.source,
        timestamp: payload.timestamp 
      });

      // Verify webhook signature if provided
      if (payload.signature) {
        const isValid = await this.verifyWebhookSignature(payload);
        if (!isValid) {
          throw new Error('Invalid webhook signature');
        }
      }

      // Route to appropriate handler based on event type
      let result;
      switch (payload.event) {
        case 'conversion.created':
        case 'conversion.confirmed':
        case 'conversion.cancelled':
        case 'conversion.refunded':
          result = await this.handleConversionWebhook(payload);
          break;

        case 'affiliate.commission.approved':
        case 'affiliate.commission.rejected':
          result = await this.handleAffiliateWebhook(payload);
          break;

        case 'store.transaction.updated':
          result = await this.handleStoreTransactionWebhook(payload);
          break;

        case 'user.account.updated':
          result = await this.handleUserAccountWebhook(payload);
          break;

        default:
          this.logger.warn('Unknown webhook event', { event: payload.event });
          return { success: false, message: 'Unknown event type' };
      }

      this.logger.info('Webhook processed successfully', { 
        event: payload.event,
        result: result?.success 
      });

      return result || { success: true, message: 'Webhook processed' };

    } catch (error) {
      this.logger.error('Webhook processing failed', { 
        event: payload.event,
        error: error.message 
      });
      return { success: false, message: error.message };
    }
  }

  // Handle conversion-related webhooks
  private async handleConversionWebhook(payload: WebhookPayload): Promise<{ success: boolean; message: string; data?: any }> {
    const data = payload.data as ConversionWebhookData;

    try {
      switch (payload.event) {
        case 'conversion.created':
          return await this.handleConversionCreated(data);
        
        case 'conversion.confirmed':
          return await this.handleConversionConfirmed(data);
        
        case 'conversion.cancelled':
          return await this.handleConversionCancelled(data);
        
        case 'conversion.refunded':
          return await this.handleConversionRefunded(data);
        
        default:
          return { success: false, message: 'Unknown conversion event' };
      }
    } catch (error) {
      this.logger.error('Conversion webhook handling failed', { 
        event: payload.event,
        transactionId: data.transactionId,
        error: error.message 
      });
      throw error;
    }
  }

  // Handle affiliate commission webhooks
  private async handleAffiliateWebhook(payload: WebhookPayload): Promise<{ success: boolean; message: string; data?: any }> {
    const data = payload.data as AffiliateWebhookData;

    try {
      const statusUpdate: CashbackStatusUpdate = {
        transactionId: data.transactionId,
        status: data.status === 'approved' ? 'confirmed' : 
                data.status === 'rejected' ? 'cancelled' : 'pending',
        reason: data.reason,
        metadata: {
          commissionAmount: data.commissionAmount,
          affiliateData: data.metadata,
          processedAt: new Date()
        }
      };

      await this.cashbackTrackingService.updateCashbackStatus(statusUpdate);

      return { 
        success: true, 
        message: `Cashback status updated to ${statusUpdate.status}`,
        data: { transactionId: data.transactionId, status: statusUpdate.status }
      };

    } catch (error) {
      this.logger.error('Affiliate webhook handling failed', { 
        transactionId: data.transactionId,
        error: error.message 
      });
      throw error;
    }
  }

  // Handle store transaction webhooks
  private async handleStoreTransactionWebhook(payload: WebhookPayload): Promise<{ success: boolean; message: string; data?: any }> {
    const data = payload.data;

    try {
      // Update cashback status based on store transaction status
      const statusUpdate: CashbackStatusUpdate = {
        transactionId: data.transactionId,
        status: this.mapStoreStatusToCashbackStatus(data.status),
        reason: data.reason || 'Store transaction status updated',
        metadata: {
          storeData: data,
          updatedAt: new Date()
        }
      };

      await this.cashbackTrackingService.updateCashbackStatus(statusUpdate);

      return { 
        success: true, 
        message: 'Cashback updated from store transaction',
        data: { transactionId: data.transactionId }
      };

    } catch (error) {
      this.logger.error('Store transaction webhook handling failed', { error: error.message });
      throw error;
    }
  }

  // Handle user account webhooks
  private async handleUserAccountWebhook(payload: WebhookPayload): Promise<{ success: boolean; message: string; data?: any }> {
    const data = payload.data;

    try {
      // Handle user account changes that might affect cashback eligibility
      if (data.accountStatus === 'suspended' || data.accountStatus === 'banned') {
        // Cancel pending cashback transactions for this user
        await this.cancelUserPendingCashback(data.userId, 'User account suspended');
      }

      return { 
        success: true, 
        message: 'User account webhook processed',
        data: { userId: data.userId }
      };

    } catch (error) {
      this.logger.error('User account webhook handling failed', { error: error.message });
      throw error;
    }
  }

  // Specific conversion event handlers
  private async handleConversionCreated(data: ConversionWebhookData): Promise<{ success: boolean; message: string; data?: any }> {
    // Create cashback tracking event
    const trackingEvent: CashbackTrackingEvent = {
      userId: data.userId,
      transactionId: data.transactionId,
      amount: data.amount,
      currency: data.currency,
      store: data.store,
      category: data.category,
      affiliateId: data.affiliateId,
      clickId: data.clickId,
      conversionId: data.conversionId,
      metadata: {
        orderId: data.orderId,
        products: data.products,
        webhookSource: 'conversion.created',
        ...data.metadata
      },
      timestamp: new Date()
    };

    const cashbackTransaction = await this.cashbackTrackingService.trackCashbackEvent(trackingEvent);

    return {
      success: true,
      message: cashbackTransaction ? 'Cashback created' : 'No cashback applicable',
      data: { 
        cashbackTransactionId: cashbackTransaction?.id,
        cashbackAmount: cashbackTransaction?.amount 
      }
    };
  }

  private async handleConversionConfirmed(data: ConversionWebhookData): Promise<{ success: boolean; message: string; data?: any }> {
    const statusUpdate: CashbackStatusUpdate = {
      transactionId: data.transactionId,
      status: 'confirmed',
      reason: 'Conversion confirmed by merchant',
      metadata: {
        confirmedAmount: data.amount,
        confirmationData: data.metadata,
        confirmedAt: new Date()
      }
    };

    await this.cashbackTrackingService.updateCashbackStatus(statusUpdate);

    return {
      success: true,
      message: 'Cashback confirmed',
      data: { transactionId: data.transactionId }
    };
  }

  private async handleConversionCancelled(data: ConversionWebhookData): Promise<{ success: boolean; message: string; data?: any }> {
    const statusUpdate: CashbackStatusUpdate = {
      transactionId: data.transactionId,
      status: 'cancelled',
      reason: 'Conversion cancelled by merchant',
      metadata: {
        cancellationData: data.metadata,
        cancelledAt: new Date()
      }
    };

    await this.cashbackTrackingService.updateCashbackStatus(statusUpdate);

    return {
      success: true,
      message: 'Cashback cancelled',
      data: { transactionId: data.transactionId }
    };
  }

  private async handleConversionRefunded(data: ConversionWebhookData): Promise<{ success: boolean; message: string; data?: any }> {
    const statusUpdate: CashbackStatusUpdate = {
      transactionId: data.transactionId,
      status: 'cancelled',
      reason: 'Transaction refunded',
      metadata: {
        refundData: data.metadata,
        refundedAt: new Date()
      }
    };

    await this.cashbackTrackingService.updateCashbackStatus(statusUpdate);

    // If cashback was already paid out, create a reversal transaction
    await this.handleCashbackReversal(data.transactionId, data.amount);

    return {
      success: true,
      message: 'Cashback reversed due to refund',
      data: { transactionId: data.transactionId }
    };
  }

  // Batch webhook processing
  async processBatchWebhooks(payloads: WebhookPayload[]): Promise<{ processed: number; failed: number; results: any[] }> {
    const results = [];
    let processed = 0;
    let failed = 0;

    this.logger.info('Processing batch webhooks', { count: payloads.length });

    for (const payload of payloads) {
      try {
        const result = await this.handleWebhook(payload);
        results.push({ payload, result, success: true });
        processed++;
      } catch (error) {
        results.push({ payload, error: error.message, success: false });
        failed++;
      }
    }

    this.logger.info('Batch webhook processing completed', { processed, failed, total: payloads.length });

    return { processed, failed, results };
  }

  // Webhook retry mechanism
  async retryFailedWebhook(payload: WebhookPayload, maxRetries: number = 3): Promise<{ success: boolean; attempts: number; lastError?: string }> {
    let attempts = 0;
    let lastError = '';

    while (attempts < maxRetries) {
      attempts++;
      
      try {
        const result = await this.handleWebhook(payload);
        if (result.success) {
          this.logger.info('Webhook retry successful', { 
            event: payload.event,
            attempts 
          });
          return { success: true, attempts };
        }
        lastError = result.message;
      } catch (error) {
        lastError = error.message;
        this.logger.warn('Webhook retry failed', { 
          event: payload.event,
          attempt: attempts,
          error: error.message 
        });
      }

      // Exponential backoff
      if (attempts < maxRetries) {
        await this.delay(Math.pow(2, attempts) * 1000);
      }
    }

    this.logger.error('Webhook retry exhausted', { 
      event: payload.event,
      attempts,
      lastError 
    });

    return { success: false, attempts, lastError };
  }

  // Helper methods
  private async verifyWebhookSignature(payload: WebhookPayload): Promise<boolean> {
    // Implementation would verify webhook signature based on source
    // This is a mock implementation
    try {
      // Different verification logic for different sources
      switch (payload.source) {
        case 'flipkart':
          return this.verifyFlipkartSignature(payload);
        case 'amazon':
          return this.verifyAmazonSignature(payload);
        case 'myntra':
          return this.verifyMyntraSignature(payload);
        default:
          return true; // Allow unknown sources for now
      }
    } catch (error) {
      this.logger.error('Signature verification failed', { error: error.message });
      return false;
    }
  }

  private verifyFlipkartSignature(payload: WebhookPayload): boolean {
    // Mock Flipkart signature verification
    return payload.signature?.startsWith('flipkart_') || false;
  }

  private verifyAmazonSignature(payload: WebhookPayload): boolean {
    // Mock Amazon signature verification
    return payload.signature?.startsWith('amazon_') || false;
  }

  private verifyMyntraSignature(payload: WebhookPayload): boolean {
    // Mock Myntra signature verification
    return payload.signature?.startsWith('myntra_') || false;
  }

  private mapStoreStatusToCashbackStatus(storeStatus: string): 'pending' | 'confirmed' | 'cancelled' | 'disputed' {
    const statusMap: { [key: string]: 'pending' | 'confirmed' | 'cancelled' | 'disputed' } = {
      'approved': 'confirmed',
      'confirmed': 'confirmed',
      'paid': 'confirmed',
      'rejected': 'cancelled',
      'cancelled': 'cancelled',
      'refunded': 'cancelled',
      'disputed': 'disputed',
      'pending': 'pending'
    };

    return statusMap[storeStatus.toLowerCase()] || 'pending';
  }

  private async cancelUserPendingCashback(userId: string, reason: string): Promise<void> {
    try {
      // This would cancel all pending cashback transactions for a user
      this.logger.info('Cancelling user pending cashback', { userId, reason });
      
      // Implementation would query and update pending transactions
      // For now, just log the action
      
    } catch (error) {
      this.logger.error('Failed to cancel user pending cashback', { 
        userId, 
        error: error.message 
      });
    }
  }

  private async handleCashbackReversal(transactionId: string, amount: number): Promise<void> {
    try {
      // Create a reversal transaction if cashback was already paid
      this.logger.info('Processing cashback reversal', { transactionId, amount });
      
      // Implementation would create reversal transaction
      // For now, just log the action
      
    } catch (error) {
      this.logger.error('Failed to process cashback reversal', { 
        transactionId, 
        error: error.message 
      });
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
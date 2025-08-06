import { BaseService } from '../base/BaseService';
import { CashbackService } from './CashbackService';
import { ConversionTrackingService } from '../conversion/ConversionTrackingService';
import { CashbackSystemRepository } from '../../repositories/CashbackSystemRepository';
import { ConversionTrackingRepository } from '../../repositories/ConversionTrackingRepository';
import { 
  CashbackTransaction, 
  CashbackTransactionType, 
  TransactionStatus,
  CashbackRule 
} from '../../models/CashbackSystem';
import { 
  Conversion, 
  ConversionStatus 
} from '../../models/ConversionTracking';

export interface CashbackTrackingEvent {
  userId: string;
  transactionId: string;
  amount: number;
  currency: string;
  store: string;
  category?: string;
  affiliateId?: string;
  clickId?: string;
  conversionId?: string;
  metadata?: any;
  timestamp: Date;
}

export interface CashbackCalculationResult {
  cashbackAmount: number;
  appliedRules: CashbackRule[];
  eligibilityReasons: string[];
  ineligibilityReasons: string[];
}

export interface CashbackStatusUpdate {
  transactionId: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'disputed';
  reason?: string;
  metadata?: any;
}

export class CashbackTrackingService extends BaseService {
  private cashbackService: CashbackService;
  private conversionService: ConversionTrackingService;
  private cashbackRepository: CashbackSystemRepository;
  private conversionRepository: ConversionTrackingRepository;

  constructor() {
    super();
    this.cashbackService = new CashbackService();
    this.conversionService = new ConversionTrackingService();
    this.cashbackRepository = new CashbackSystemRepository();
    this.conversionRepository = new ConversionTrackingRepository();
  }

  // Main cashback tracking entry point
  async trackCashbackEvent(event: CashbackTrackingEvent): Promise<CashbackTransaction | null> {
    try {
      this.logger.info('Processing cashback tracking event', { 
        userId: event.userId, 
        transactionId: event.transactionId,
        amount: event.amount 
      });

      // Validate event data
      const validation = await this.validateCashbackEvent(event);
      if (!validation.isValid) {
        this.logger.warn('Cashback event validation failed', { 
          transactionId: event.transactionId,
          reasons: validation.reasons 
        });
        return null;
      }

      // Check if cashback already processed for this transaction
      const existingCashback = await this.cashbackRepository.getCashbackTransactionByTransactionId(event.transactionId);
      if (existingCashback) {
        this.logger.info('Cashback already processed for transaction', { transactionId: event.transactionId });
        return existingCashback;
      }

      // Calculate cashback amount
      const calculation = await this.calculateCashback(event);
      if (calculation.cashbackAmount <= 0) {
        this.logger.info('No cashback applicable', { 
          transactionId: event.transactionId,
          reasons: calculation.ineligibilityReasons 
        });
        return null;
      }

      // Process cashback transaction
      const cashbackTransaction = await this.cashbackService.processCashback(
        event.userId,
        event.amount,
        event.transactionId,
        {
          store: event.store,
          category: event.category,
          affiliateId: event.affiliateId,
          clickId: event.clickId,
          conversionId: event.conversionId,
          appliedRules: calculation.appliedRules.map(r => ({ id: r.id, rate: r.cashbackRate })),
          calculatedAmount: calculation.cashbackAmount,
          ...event.metadata
        }
      );

      // Link with conversion if available
      if (event.conversionId) {
        await this.linkCashbackToConversion(cashbackTransaction.id, event.conversionId);
      }

      // Send notification
      await this.sendCashbackNotification(event.userId, cashbackTransaction);

      this.logger.info('Cashback tracking completed', {
        userId: event.userId,
        transactionId: event.transactionId,
        cashbackAmount: calculation.cashbackAmount,
        cashbackTransactionId: cashbackTransaction.id
      });

      return cashbackTransaction;

    } catch (error) {
      this.logger.error('Failed to track cashback event', { 
        transactionId: event.transactionId,
        error: error.message 
      });
      throw error;
    }
  }

  // Update cashback status based on transaction status
  async updateCashbackStatus(update: CashbackStatusUpdate): Promise<void> {
    try {
      const cashbackTransaction = await this.cashbackRepository.getCashbackTransactionByTransactionId(update.transactionId);
      if (!cashbackTransaction) {
        throw new Error('Cashback transaction not found');
      }

      switch (update.status) {
        case 'confirmed':
          await this.confirmCashback(cashbackTransaction.id, update.reason, update.metadata);
          break;
        case 'cancelled':
          await this.cancelCashback(cashbackTransaction.id, update.reason, update.metadata);
          break;
        case 'disputed':
          await this.disputeCashback(cashbackTransaction.id, update.reason, update.metadata);
          break;
        default:
          this.logger.warn('Unknown cashback status update', { status: update.status });
      }

      this.logger.info('Cashback status updated', {
        transactionId: update.transactionId,
        status: update.status,
        reason: update.reason
      });

    } catch (error) {
      this.logger.error('Failed to update cashback status', { 
        transactionId: update.transactionId,
        error: error.message 
      });
      throw error;
    }
  }

  // Batch process cashback for multiple transactions
  async batchProcessCashback(events: CashbackTrackingEvent[]): Promise<{ processed: number; failed: number; results: any[] }> {
    const results = [];
    let processed = 0;
    let failed = 0;

    this.logger.info('Starting batch cashback processing', { count: events.length });

    for (const event of events) {
      try {
        const result = await this.trackCashbackEvent(event);
        results.push({ event, result, success: true });
        processed++;
      } catch (error) {
        results.push({ event, error: error.message, success: false });
        failed++;
      }
    }

    this.logger.info('Batch cashback processing completed', { processed, failed, total: events.length });

    return { processed, failed, results };
  }

  // Get cashback tracking analytics
  async getCashbackTrackingAnalytics(dateRange?: { from: Date; to: Date }): Promise<any> {
    try {
      const analytics = await this.cashbackRepository.getCashbackAnalytics(undefined, dateRange);
      
      // Add tracking-specific metrics
      const trackingMetrics = await this.getTrackingMetrics(dateRange);
      
      return {
        ...analytics,
        tracking: trackingMetrics
      };

    } catch (error) {
      this.logger.error('Failed to get cashback tracking analytics', { error: error.message });
      throw error;
    }
  }

  // Private helper methods
  private async validateCashbackEvent(event: CashbackTrackingEvent): Promise<{ isValid: boolean; reasons: string[] }> {
    const reasons: string[] = [];

    // Basic validation
    if (!event.userId) reasons.push('User ID is required');
    if (!event.transactionId) reasons.push('Transaction ID is required');
    if (!event.amount || event.amount <= 0) reasons.push('Valid amount is required');
    if (!event.store) reasons.push('Store is required');

    // Business rules validation
    if (event.amount < 50) reasons.push('Transaction amount below minimum threshold');
    if (event.amount > 100000) reasons.push('Transaction amount above maximum threshold');

    // Check if user is eligible for cashback
    const userEligibility = await this.checkUserEligibility(event.userId);
    if (!userEligibility.isEligible) {
      reasons.push(...userEligibility.reasons);
    }

    // Check if store is eligible
    const storeEligibility = await this.checkStoreEligibility(event.store);
    if (!storeEligibility.isEligible) {
      reasons.push(...storeEligibility.reasons);
    }

    return {
      isValid: reasons.length === 0,
      reasons
    };
  }

  private async calculateCashback(event: CashbackTrackingEvent): Promise<CashbackCalculationResult> {
    const appliedRules: CashbackRule[] = [];
    const eligibilityReasons: string[] = [];
    const ineligibilityReasons: string[] = [];

    // Get active cashback rules
    const rules = await this.cashbackRepository.getActiveCashbackRules();
    
    let maxCashback = 0;
    let bestRule: CashbackRule | null = null;

    for (const rule of rules) {
      const isApplicable = await this.isRuleApplicable(rule, event);
      
      if (isApplicable.applicable) {
        const cashback = Math.min(
          event.amount * (rule.cashbackRate / 100),
          rule.maxCashbackAmount || Infinity
        );

        if (cashback > maxCashback) {
          maxCashback = cashback;
          bestRule = rule;
        }

        appliedRules.push(rule);
        eligibilityReasons.push(`Rule "${rule.name}" applied: ${rule.cashbackRate}% rate`);
      } else {
        ineligibilityReasons.push(`Rule "${rule.name}" not applicable: ${isApplicable.reason}`);
      }
    }

    // Apply any promotional bonuses
    const promotionalBonus = await this.calculatePromotionalBonus(event, maxCashback);
    maxCashback += promotionalBonus;

    if (promotionalBonus > 0) {
      eligibilityReasons.push(`Promotional bonus applied: ₹${promotionalBonus}`);
    }

    return {
      cashbackAmount: Math.round(maxCashback * 100) / 100, // Round to 2 decimal places
      appliedRules,
      eligibilityReasons,
      ineligibilityReasons
    };
  }

  private async isRuleApplicable(rule: CashbackRule, event: CashbackTrackingEvent): Promise<{ applicable: boolean; reason?: string }> {
    // Check minimum transaction amount
    if (rule.minimumTransactionAmount && event.amount < rule.minimumTransactionAmount) {
      return { applicable: false, reason: `Amount below minimum ₹${rule.minimumTransactionAmount}` };
    }

    // Check category filter
    if (rule.categoryFilter && rule.categoryFilter.length > 0) {
      if (!event.category || !rule.categoryFilter.includes(event.category)) {
        return { applicable: false, reason: 'Category not in filter' };
      }
    }

    // Check store filter
    if (rule.storeFilter && rule.storeFilter.length > 0) {
      if (!rule.storeFilter.includes(event.store)) {
        return { applicable: false, reason: 'Store not in filter' };
      }
    }

    // Check validity period
    const now = new Date();
    if (rule.validFrom && now < rule.validFrom) {
      return { applicable: false, reason: 'Rule not yet active' };
    }
    if (rule.validUntil && now > rule.validUntil) {
      return { applicable: false, reason: 'Rule expired' };
    }

    return { applicable: true };
  }

  private async calculatePromotionalBonus(event: CashbackTrackingEvent, baseCashback: number): Promise<number> {
    try {
      const promotions = await this.cashbackRepository.getActivePromotions();
      let totalBonus = 0;

      for (const promotion of promotions) {
        if (await this.isPromotionApplicable(promotion, event)) {
          let bonus = 0;

          switch (promotion.promotionType) {
            case 'PERCENTAGE_BONUS':
              bonus = baseCashback * (promotion.bonusRate / 100);
              break;
            case 'FIXED_BONUS':
              bonus = promotion.bonusAmount;
              break;
            case 'MULTIPLIER':
              bonus = baseCashback * (promotion.bonusRate - 1);
              break;
          }

          if (promotion.maximumBonus) {
            bonus = Math.min(bonus, promotion.maximumBonus);
          }

          totalBonus += bonus;
        }
      }

      return totalBonus;
    } catch (error) {
      this.logger.error('Failed to calculate promotional bonus', { error: error.message });
      return 0;
    }
  }

  private async isPromotionApplicable(promotion: any, event: CashbackTrackingEvent): Promise<boolean> {
    const now = new Date();
    
    // Check validity period
    if (now < promotion.startDate || now > promotion.endDate) {
      return false;
    }

    // Check minimum transaction
    if (promotion.minimumTransaction && event.amount < promotion.minimumTransaction) {
      return false;
    }

    // Check usage limit
    if (promotion.usageLimit && promotion.usageCount >= promotion.usageLimit) {
      return false;
    }

    // Check target users
    if (promotion.targetUsers && promotion.targetUsers.length > 0) {
      if (!promotion.targetUsers.includes(event.userId)) {
        return false;
      }
    }

    // Check target categories
    if (promotion.targetCategories && promotion.targetCategories.length > 0) {
      if (!event.category || !promotion.targetCategories.includes(event.category)) {
        return false;
      }
    }

    // Check target stores
    if (promotion.targetStores && promotion.targetStores.length > 0) {
      if (!promotion.targetStores.includes(event.store)) {
        return false;
      }
    }

    return true;
  }

  private async checkUserEligibility(userId: string): Promise<{ isEligible: boolean; reasons: string[] }> {
    const reasons: string[] = [];

    try {
      // Check if user has active cashback account
      const account = await this.cashbackRepository.getCashbackAccountByUserId(userId);
      if (!account || !account.isActive) {
        reasons.push('User cashback account is inactive');
      }

      // Check for any user restrictions or bans
      // This would integrate with user management system
      
      return {
        isEligible: reasons.length === 0,
        reasons
      };
    } catch (error) {
      reasons.push('Failed to verify user eligibility');
      return { isEligible: false, reasons };
    }
  }

  private async checkStoreEligibility(store: string): Promise<{ isEligible: boolean; reasons: string[] }> {
    const reasons: string[] = [];

    try {
      // Check if store is in blacklist
      const blacklistedStores = ['fraudulent-store', 'suspended-store'];
      if (blacklistedStores.includes(store)) {
        reasons.push('Store is blacklisted');
      }

      // Check if store has active cashback program
      // This would integrate with store management system

      return {
        isEligible: reasons.length === 0,
        reasons
      };
    } catch (error) {
      reasons.push('Failed to verify store eligibility');
      return { isEligible: false, reasons };
    }
  }

  private async confirmCashback(cashbackTransactionId: string, reason?: string, metadata?: any): Promise<void> {
    await this.cashbackService.confirmCashback(cashbackTransactionId);
    
    // Update metadata with confirmation details
    await this.cashbackRepository.updateCashbackTransaction(cashbackTransactionId, {
      metadata: {
        confirmationReason: reason,
        confirmationMetadata: metadata,
        confirmedAt: new Date()
      }
    });
  }

  private async cancelCashback(cashbackTransactionId: string, reason?: string, metadata?: any): Promise<void> {
    await this.cashbackRepository.updateCashbackTransaction(cashbackTransactionId, {
      status: TransactionStatus.CANCELLED,
      metadata: {
        cancellationReason: reason,
        cancellationMetadata: metadata,
        cancelledAt: new Date()
      }
    });

    // Reverse any pending balance changes
    const transaction = await this.cashbackRepository.getCashbackTransaction(cashbackTransactionId);
    if (transaction) {
      const account = await this.cashbackRepository.getCashbackAccount(transaction.accountId);
      if (account && transaction.status === TransactionStatus.PENDING) {
        await this.cashbackRepository.updateCashbackAccount(account.id, {
          pendingBalance: account.pendingBalance - transaction.amount
        });
      }
    }
  }

  private async disputeCashback(cashbackTransactionId: string, reason?: string, metadata?: any): Promise<void> {
    // Create dispute record
    const dispute = {
      id: this.generateId(),
      userId: '',
      transactionId: cashbackTransactionId,
      type: 'CASHBACK_DISPUTE',
      description: reason || 'Cashback transaction disputed',
      status: 'OPEN',
      createdAt: new Date()
    };

    await this.cashbackRepository.createCashbackDispute(dispute);

    // Update transaction status
    await this.cashbackRepository.updateCashbackTransaction(cashbackTransactionId, {
      status: TransactionStatus.PENDING,
      metadata: {
        disputeReason: reason,
        disputeMetadata: metadata,
        disputedAt: new Date(),
        disputeId: dispute.id
      }
    });
  }

  private async linkCashbackToConversion(cashbackTransactionId: string, conversionId: string): Promise<void> {
    try {
      // Update cashback transaction with conversion link
      await this.cashbackRepository.updateCashbackTransaction(cashbackTransactionId, {
        metadata: {
          linkedConversionId: conversionId,
          linkedAt: new Date()
        }
      });

      // Update conversion with cashback link
      await this.conversionRepository.updateConversion(conversionId, {
        metadata: {
          linkedCashbackId: cashbackTransactionId,
          cashbackLinkedAt: new Date()
        }
      });

      this.logger.info('Cashback linked to conversion', { cashbackTransactionId, conversionId });
    } catch (error) {
      this.logger.error('Failed to link cashback to conversion', { 
        cashbackTransactionId, 
        conversionId, 
        error: error.message 
      });
    }
  }

  private async sendCashbackNotification(userId: string, transaction: CashbackTransaction): Promise<void> {
    try {
      const notification = {
        id: this.generateId(),
        userId,
        type: 'CASHBACK_EARNED',
        title: 'Cashback Earned!',
        message: `You've earned ₹${transaction.amount} cashback on your recent purchase.`,
        data: {
          transactionId: transaction.id,
          amount: transaction.amount,
          originalAmount: transaction.originalAmount
        },
        isRead: false,
        createdAt: new Date()
      };

      await this.cashbackRepository.createCashbackNotification(notification);
      this.logger.info('Cashback notification sent', { userId, amount: transaction.amount });
    } catch (error) {
      this.logger.error('Failed to send cashback notification', { userId, error: error.message });
    }
  }

  private async getTrackingMetrics(dateRange?: { from: Date; to: Date }): Promise<any> {
    // Implementation would query database for tracking-specific metrics
    return {
      totalEventsProcessed: 0,
      successfulCashbacks: 0,
      failedCashbacks: 0,
      averageProcessingTime: 0,
      topPerformingStores: [],
      topPerformingCategories: []
    };
  }

  private generateId(): string {
    return `cbt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
import { BaseService } from '../base/BaseService';
import { CashbackSystemRepository } from '../../repositories/CashbackSystemRepository';
import { 
  PaymentMethod, 
  CashbackAccount, 
  CashbackTransaction, 
  WithdrawalRequest,
  CashbackRule,
  ReferralProgram,
  PaymentValidationResult,
  CashbackAnalytics,
  TransactionStatus,
  WithdrawalStatus,
  PaymentMethodType,
  CashbackTransactionType
} from '../../models/CashbackSystem';

export class CashbackService extends BaseService {
  private repository: CashbackSystemRepository;

  constructor() {
    super();
    this.repository = new CashbackSystemRepository();
  }

  // Payment Methods Management
  async addPaymentMethod(userId: string, methodData: Partial<PaymentMethod>): Promise<PaymentMethod> {
    try {
      // Validate payment method data
      const validationResult = await this.validatePaymentMethod(methodData);
      if (!validationResult.isValid) {
        throw new Error(`Invalid payment method: ${validationResult.errors.join(', ')}`);
      }

      const paymentMethod: PaymentMethod = {
        id: this.generateId(),
        userId,
        type: methodData.type!,
        details: methodData.details!,
        isVerified: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...methodData
      };

      const created = await this.repository.createPaymentMethod(paymentMethod);
      
      // Start verification process
      await this.initiatePaymentMethodVerification(created.id);
      
      this.logger.info('Payment method added', { userId, methodId: created.id, type: created.type });
      return created;
    } catch (error) {
      this.logger.error('Failed to add payment method', { userId, error: error.message });
      throw error;
    }
  }

  async validatePaymentMethod(methodData: Partial<PaymentMethod>): Promise<PaymentValidationResult> {
    const errors: string[] = [];
    
    if (!methodData.type) {
      errors.push('Payment method type is required');
    }
    
    if (!methodData.details) {
      errors.push('Payment method details are required');
    }

    // Type-specific validation
    if (methodData.type && methodData.details) {
      switch (methodData.type) {
        case PaymentMethodType.UPI:
          if (!this.isValidUPI(methodData.details.upiId)) {
            errors.push('Invalid UPI ID format');
          }
          break;
        case PaymentMethodType.PAYTM:
          if (!this.isValidPhoneNumber(methodData.details.phoneNumber)) {
            errors.push('Invalid PayTM phone number');
          }
          break;
        case PaymentMethodType.PHONEPE:
          if (!this.isValidPhoneNumber(methodData.details.phoneNumber)) {
            errors.push('Invalid PhonePe phone number');
          }
          break;
        case PaymentMethodType.BANK_ACCOUNT:
          if (!methodData.details.accountNumber || !methodData.details.ifscCode) {
            errors.push('Bank account number and IFSC code are required');
          }
          if (!this.isValidIFSC(methodData.details.ifscCode)) {
            errors.push('Invalid IFSC code format');
          }
          break;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  // Cashback Account Management
  async getCashbackAccount(userId: string): Promise<CashbackAccount> {
    try {
      let account = await this.repository.getCashbackAccountByUserId(userId);
      
      if (!account) {
        // Create new cashback account
        account = await this.createCashbackAccount(userId);
      }
      
      return account;
    } catch (error) {
      this.logger.error('Failed to get cashback account', { userId, error: error.message });
      throw error;
    }
  }

  private async createCashbackAccount(userId: string): Promise<CashbackAccount> {
    const account: CashbackAccount = {
      id: this.generateId(),
      userId,
      balance: 0,
      pendingBalance: 0,
      totalEarned: 0,
      totalWithdrawn: 0,
      currency: 'INR',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const created = await this.repository.createCashbackAccount(account);
    this.logger.info('Cashback account created', { userId, accountId: created.id });
    return created;
  }

  // Cashback Processing
  async processCashback(userId: string, amount: number, transactionId: string, metadata: any = {}): Promise<CashbackTransaction> {
    try {
      const account = await this.getCashbackAccount(userId);
      const rules = await this.repository.getActiveCashbackRules();
      
      // Calculate cashback amount based on rules
      const cashbackAmount = await this.calculateCashback(amount, metadata, rules);
      
      if (cashbackAmount <= 0) {
        throw new Error('No cashback applicable for this transaction');
      }

      // Create cashback transaction
      const transaction: CashbackTransaction = {
        id: this.generateId(),
        accountId: account.id,
        userId,
        type: CashbackTransactionType.EARNED,
        amount: cashbackAmount,
        originalAmount: amount,
        transactionId,
        status: TransactionStatus.PENDING,
        metadata: {
          ...metadata,
          processedAt: new Date(),
          rules: rules.map(r => ({ id: r.id, rate: r.cashbackRate }))
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const created = await this.repository.createCashbackTransaction(transaction);
      
      // Update account pending balance
      await this.repository.updateCashbackAccount(account.id, {
        pendingBalance: account.pendingBalance + cashbackAmount,
        updatedAt: new Date()
      });

      this.logger.info('Cashback processed', { 
        userId, 
        transactionId, 
        cashbackAmount, 
        originalAmount: amount 
      });

      return created;
    } catch (error) {
      this.logger.error('Failed to process cashback', { userId, transactionId, error: error.message });
      throw error;
    }
  }

  async confirmCashback(transactionId: string): Promise<void> {
    try {
      const transaction = await this.repository.getCashbackTransaction(transactionId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      if (transaction.status !== TransactionStatus.PENDING) {
        throw new Error('Transaction is not in pending status');
      }

      const account = await this.repository.getCashbackAccount(transaction.accountId);
      if (!account) {
        throw new Error('Cashback account not found');
      }

      // Update transaction status
      await this.repository.updateCashbackTransaction(transactionId, {
        status: TransactionStatus.COMPLETED,
        updatedAt: new Date()
      });

      // Move from pending to available balance
      await this.repository.updateCashbackAccount(account.id, {
        balance: account.balance + transaction.amount,
        pendingBalance: account.pendingBalance - transaction.amount,
        totalEarned: account.totalEarned + transaction.amount,
        updatedAt: new Date()
      });

      this.logger.info('Cashback confirmed', { transactionId, amount: transaction.amount });
    } catch (error) {
      this.logger.error('Failed to confirm cashback', { transactionId, error: error.message });
      throw error;
    }
  }

  // Withdrawal Processing
  async requestWithdrawal(userId: string, amount: number, paymentMethodId: string): Promise<WithdrawalRequest> {
    try {
      const account = await this.getCashbackAccount(userId);
      const paymentMethod = await this.repository.getPaymentMethod(paymentMethodId);

      // Validate withdrawal request
      if (!paymentMethod || paymentMethod.userId !== userId) {
        throw new Error('Invalid payment method');
      }

      if (!paymentMethod.isVerified || !paymentMethod.isActive) {
        throw new Error('Payment method is not verified or inactive');
      }

      if (amount > account.balance) {
        throw new Error('Insufficient balance');
      }

      if (amount < 100) { // Minimum withdrawal amount
        throw new Error('Minimum withdrawal amount is ₹100');
      }

      // Create withdrawal request
      const withdrawal: WithdrawalRequest = {
        id: this.generateId(),
        accountId: account.id,
        userId,
        amount,
        paymentMethodId,
        status: WithdrawalStatus.PENDING,
        requestedAt: new Date(),
        metadata: {
          paymentMethodType: paymentMethod.type,
          requestedAmount: amount
        }
      };

      const created = await this.repository.createWithdrawalRequest(withdrawal);

      // Reserve the amount (reduce available balance)
      await this.repository.updateCashbackAccount(account.id, {
        balance: account.balance - amount,
        updatedAt: new Date()
      });

      // Create withdrawal transaction
      const transaction: CashbackTransaction = {
        id: this.generateId(),
        accountId: account.id,
        userId,
        type: CashbackTransactionType.WITHDRAWN,
        amount: -amount,
        transactionId: created.id,
        status: TransactionStatus.PENDING,
        metadata: {
          withdrawalId: created.id,
          paymentMethodId
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.repository.createCashbackTransaction(transaction);

      this.logger.info('Withdrawal requested', { userId, amount, withdrawalId: created.id });
      return created;
    } catch (error) {
      this.logger.error('Failed to request withdrawal', { userId, amount, error: error.message });
      throw error;
    }
  }

  async processWithdrawal(withdrawalId: string): Promise<void> {
    try {
      const withdrawal = await this.repository.getWithdrawalRequest(withdrawalId);
      if (!withdrawal) {
        throw new Error('Withdrawal request not found');
      }

      if (withdrawal.status !== WithdrawalStatus.PENDING) {
        throw new Error('Withdrawal is not in pending status');
      }

      const paymentMethod = await this.repository.getPaymentMethod(withdrawal.paymentMethodId);
      if (!paymentMethod) {
        throw new Error('Payment method not found');
      }

      // Process payment based on method type
      const paymentResult = await this.processPayment(withdrawal, paymentMethod);

      if (paymentResult.success) {
        // Update withdrawal status
        await this.repository.updateWithdrawalRequest(withdrawalId, {
          status: WithdrawalStatus.COMPLETED,
          processedAt: new Date(),
          metadata: {
            ...withdrawal.metadata,
            paymentResult,
            completedAt: new Date()
          }
        });

        // Update account
        const account = await this.repository.getCashbackAccount(withdrawal.accountId);
        await this.repository.updateCashbackAccount(withdrawal.accountId, {
          totalWithdrawn: account.totalWithdrawn + withdrawal.amount,
          updatedAt: new Date()
        });

        this.logger.info('Withdrawal processed successfully', { withdrawalId, amount: withdrawal.amount });
      } else {
        // Handle failed payment
        await this.handleFailedWithdrawal(withdrawalId, paymentResult.error);
      }
    } catch (error) {
      this.logger.error('Failed to process withdrawal', { withdrawalId, error: error.message });
      await this.handleFailedWithdrawal(withdrawalId, error.message);
      throw error;
    }
  }

  // Analytics and Reporting
  async getCashbackAnalytics(userId?: string, dateRange?: { from: Date; to: Date }): Promise<CashbackAnalytics> {
    try {
      const analytics = await this.repository.getCashbackAnalytics(userId, dateRange);
      return analytics;
    } catch (error) {
      this.logger.error('Failed to get cashback analytics', { userId, error: error.message });
      throw error;
    }
  }

  // Referral Program
  async processReferralCashback(referrerId: string, refereeId: string, transactionAmount: number): Promise<void> {
    try {
      const referralPrograms = await this.repository.getActiveReferralPrograms();
      
      for (const program of referralPrograms) {
        if (transactionAmount >= program.minimumTransactionAmount) {
          // Give cashback to referrer
          await this.processCashback(referrerId, program.referrerReward, `referral_${refereeId}`, {
            type: 'referral_reward',
            refereeId,
            programId: program.id
          });

          // Give cashback to referee if applicable
          if (program.refereeReward > 0) {
            await this.processCashback(refereeId, program.refereeReward, `referral_bonus_${referrerId}`, {
              type: 'referral_bonus',
              referrerId,
              programId: program.id
            });
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to process referral cashback', { referrerId, refereeId, error: error.message });
      throw error;
    }
  }

  // Private helper methods
  private async calculateCashback(amount: number, metadata: any, rules: CashbackRule[]): Promise<number> {
    let maxCashback = 0;

    for (const rule of rules) {
      if (this.isRuleApplicable(rule, metadata)) {
        const cashback = Math.min(
          amount * (rule.cashbackRate / 100),
          rule.maxCashbackAmount || Infinity
        );
        maxCashback = Math.max(maxCashback, cashback);
      }
    }

    return Math.round(maxCashback * 100) / 100; // Round to 2 decimal places
  }

  private isRuleApplicable(rule: CashbackRule, metadata: any): boolean {
    // Check category filter
    if (rule.categoryFilter && rule.categoryFilter.length > 0) {
      if (!metadata.category || !rule.categoryFilter.includes(metadata.category)) {
        return false;
      }
    }

    // Check store filter
    if (rule.storeFilter && rule.storeFilter.length > 0) {
      if (!metadata.store || !rule.storeFilter.includes(metadata.store)) {
        return false;
      }
    }

    // Check minimum amount
    if (rule.minimumTransactionAmount && metadata.amount < rule.minimumTransactionAmount) {
      return false;
    }

    return true;
  }

  private async processPayment(withdrawal: WithdrawalRequest, paymentMethod: PaymentMethod): Promise<{ success: boolean; error?: string; transactionId?: string }> {
    // Mock payment processing - in real implementation, integrate with actual payment gateways
    try {
      switch (paymentMethod.type) {
        case PaymentMethodType.UPI:
          return await this.processUPIPayment(withdrawal, paymentMethod);
        case PaymentMethodType.PAYTM:
          return await this.processPayTMPayment(withdrawal, paymentMethod);
        case PaymentMethodType.PHONEPE:
          return await this.processPhonePePayment(withdrawal, paymentMethod);
        case PaymentMethodType.BANK_ACCOUNT:
          return await this.processBankTransfer(withdrawal, paymentMethod);
        default:
          return { success: false, error: 'Unsupported payment method' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  private async processUPIPayment(withdrawal: WithdrawalRequest, paymentMethod: PaymentMethod): Promise<{ success: boolean; error?: string; transactionId?: string }> {
    // Mock UPI payment processing
    return {
      success: true,
      transactionId: `UPI_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  private async processPayTMPayment(withdrawal: WithdrawalRequest, paymentMethod: PaymentMethod): Promise<{ success: boolean; error?: string; transactionId?: string }> {
    // Mock PayTM payment processing
    return {
      success: true,
      transactionId: `PAYTM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  private async processPhonePePayment(withdrawal: WithdrawalRequest, paymentMethod: PaymentMethod): Promise<{ success: boolean; error?: string; transactionId?: string }> {
    // Mock PhonePe payment processing
    return {
      success: true,
      transactionId: `PHONEPE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  private async processBankTransfer(withdrawal: WithdrawalRequest, paymentMethod: PaymentMethod): Promise<{ success: boolean; error?: string; transactionId?: string }> {
    // Mock bank transfer processing
    return {
      success: true,
      transactionId: `BANK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  private async handleFailedWithdrawal(withdrawalId: string, error: string): Promise<void> {
    try {
      const withdrawal = await this.repository.getWithdrawalRequest(withdrawalId);
      if (!withdrawal) return;

      // Update withdrawal status to failed
      await this.repository.updateWithdrawalRequest(withdrawalId, {
        status: WithdrawalStatus.FAILED,
        metadata: {
          ...withdrawal.metadata,
          error,
          failedAt: new Date()
        }
      });

      // Restore the amount to user's balance
      const account = await this.repository.getCashbackAccount(withdrawal.accountId);
      await this.repository.updateCashbackAccount(withdrawal.accountId, {
        balance: account.balance + withdrawal.amount,
        updatedAt: new Date()
      });

      this.logger.info('Withdrawal failed, amount restored', { withdrawalId, amount: withdrawal.amount });
    } catch (restoreError) {
      this.logger.error('Failed to handle failed withdrawal', { withdrawalId, error: restoreError.message });
    }
  }

  private async initiatePaymentMethodVerification(paymentMethodId: string): Promise<void> {
    // Mock verification process - in real implementation, send verification amount or OTP
    setTimeout(async () => {
      try {
        await this.repository.updatePaymentMethod(paymentMethodId, {
          isVerified: true,
          updatedAt: new Date()
        });
        this.logger.info('Payment method verified', { paymentMethodId });
      } catch (error) {
        this.logger.error('Failed to verify payment method', { paymentMethodId, error: error.message });
      }
    }, 5000); // Mock 5 second verification delay
  }

  // Validation helpers
  private isValidUPI(upiId: string): boolean {
    const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
    return upiRegex.test(upiId);
  }

  private isValidPhoneNumber(phoneNumber: string): boolean {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phoneNumber);
  }

  private isValidIFSC(ifscCode: string): boolean {
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    return ifscRegex.test(ifscCode);
  }

  private generateId(): string {
    return `cb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
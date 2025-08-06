import { BaseService } from '../base/BaseService';
import { CashbackService } from './CashbackService';
import { CashbackSystemRepository } from '../../repositories/CashbackSystemRepository';
import { 
  CashbackAccount, 
  CashbackTransaction, 
  WithdrawalRequest, 
  PaymentMethod,
  WithdrawalStatus,
  TransactionStatus,
  CashbackTransactionType 
} from '../../models/CashbackSystem';

export interface BalanceInfo {
  userId: string;
  availableBalance: number;
  pendingBalance: number;
  totalEarned: number;
  totalWithdrawn: number;
  currency: string;
  lastUpdated: Date;
}

export interface TransactionHistory {
  transactions: CashbackTransaction[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  summary: {
    totalEarned: number;
    totalWithdrawn: number;
    pendingAmount: number;
    completedTransactions: number;
  };
}

export interface WithdrawalHistory {
  withdrawals: WithdrawalRequest[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  summary: {
    totalRequested: number;
    totalCompleted: number;
    totalPending: number;
    totalFailed: number;
  };
}

export interface WithdrawalLimits {
  minimumAmount: number;
  maximumAmount: number;
  dailyLimit: number;
  monthlyLimit: number;
  remainingDailyLimit: number;
  remainingMonthlyLimit: number;
}

export interface BalanceSummary {
  balance: BalanceInfo;
  recentTransactions: CashbackTransaction[];
  pendingWithdrawals: WithdrawalRequest[];
  availablePaymentMethods: PaymentMethod[];
  withdrawalLimits: WithdrawalLimits;
}

export class CashbackBalanceService extends BaseService {
  private cashbackService: CashbackService;
  private repository: CashbackSystemRepository;

  constructor() {
    super();
    this.cashbackService = new CashbackService();
    this.repository = new CashbackSystemRepository();
  }

  // Get comprehensive balance information
  async getBalanceInfo(userId: string): Promise<BalanceInfo> {
    try {
      const account = await this.cashbackService.getCashbackAccount(userId);
      
      return {
        userId,
        availableBalance: account.balance,
        pendingBalance: account.pendingBalance,
        totalEarned: account.totalEarned,
        totalWithdrawn: account.totalWithdrawn,
        currency: account.currency,
        lastUpdated: account.updatedAt
      };

    } catch (error) {
      this.logger.error('Failed to get balance info', { userId, error: error.message });
      throw error;
    }
  }

  // Get complete balance summary for dashboard
  async getBalanceSummary(userId: string): Promise<BalanceSummary> {
    try {
      const [
        balance,
        recentTransactions,
        pendingWithdrawals,
        paymentMethods,
        withdrawalLimits
      ] = await Promise.all([
        this.getBalanceInfo(userId),
        this.getRecentTransactions(userId, 5),
        this.getPendingWithdrawals(userId),
        this.getAvailablePaymentMethods(userId),
        this.getWithdrawalLimits(userId)
      ]);

      return {
        balance,
        recentTransactions,
        pendingWithdrawals,
        availablePaymentMethods: paymentMethods,
        withdrawalLimits
      };

    } catch (error) {
      this.logger.error('Failed to get balance summary', { userId, error: error.message });
      throw error;
    }
  }

  // Get transaction history with pagination
  async getTransactionHistory(
    userId: string, 
    page: number = 1, 
    limit: number = 20,
    filters?: {
      type?: CashbackTransactionType;
      status?: TransactionStatus;
      dateFrom?: Date;
      dateTo?: Date;
      minAmount?: number;
      maxAmount?: number;
    }
  ): Promise<TransactionHistory> {
    try {
      const account = await this.repository.getCashbackAccountByUserId(userId);
      if (!account) {
        throw new Error('Cashback account not found');
      }

      const offset = (page - 1) * limit;
      
      // Build query conditions
      const conditions: any = { accountId: account.id };
      
      if (filters) {
        if (filters.type) conditions.type = filters.type;
        if (filters.status) conditions.status = filters.status;
        if (filters.dateFrom) conditions.createdAt = { $gte: filters.dateFrom };
        if (filters.dateTo) {
          conditions.createdAt = conditions.createdAt || {};
          conditions.createdAt.$lte = filters.dateTo;
        }
        if (filters.minAmount) conditions.amount = { $gte: filters.minAmount };
        if (filters.maxAmount) {
          conditions.amount = conditions.amount || {};
          conditions.amount.$lte = filters.maxAmount;
        }
      }

      const [transactions, totalCount] = await Promise.all([
        this.repository.getCashbackTransactionsByConditions(conditions, limit, offset),
        this.repository.getCashbackTransactionsCount(conditions)
      ]);

      // Calculate summary
      const summary = await this.calculateTransactionSummary(account.id, filters);

      return {
        transactions,
        totalCount,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        summary
      };

    } catch (error) {
      this.logger.error('Failed to get transaction history', { userId, error: error.message });
      throw error;
    }
  }

  // Get withdrawal history with pagination
  async getWithdrawalHistory(
    userId: string,
    page: number = 1,
    limit: number = 20,
    filters?: {
      status?: WithdrawalStatus;
      dateFrom?: Date;
      dateTo?: Date;
      minAmount?: number;
      maxAmount?: number;
    }
  ): Promise<WithdrawalHistory> {
    try {
      const account = await this.repository.getCashbackAccountByUserId(userId);
      if (!account) {
        throw new Error('Cashback account not found');
      }

      const offset = (page - 1) * limit;
      
      const conditions: any = { accountId: account.id };
      
      if (filters) {
        if (filters.status) conditions.status = filters.status;
        if (filters.dateFrom) conditions.requestedAt = { $gte: filters.dateFrom };
        if (filters.dateTo) {
          conditions.requestedAt = conditions.requestedAt || {};
          conditions.requestedAt.$lte = filters.dateTo;
        }
        if (filters.minAmount) conditions.amount = { $gte: filters.minAmount };
        if (filters.maxAmount) {
          conditions.amount = conditions.amount || {};
          conditions.amount.$lte = filters.maxAmount;
        }
      }

      const [withdrawals, totalCount] = await Promise.all([
        this.repository.getWithdrawalRequestsByConditions(conditions, limit, offset),
        this.repository.getWithdrawalRequestsCount(conditions)
      ]);

      // Calculate summary
      const summary = await this.calculateWithdrawalSummary(account.id, filters);

      return {
        withdrawals,
        totalCount,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        summary
      };

    } catch (error) {
      this.logger.error('Failed to get withdrawal history', { userId, error: error.message });
      throw error;
    }
  }

  // Request withdrawal with comprehensive validation
  async requestWithdrawal(
    userId: string,
    amount: number,
    paymentMethodId: string,
    options?: {
      priority?: 'normal' | 'high';
      notes?: string;
    }
  ): Promise<WithdrawalRequest> {
    try {
      // Validate withdrawal limits
      const limits = await this.getWithdrawalLimits(userId);
      
      if (amount < limits.minimumAmount) {
        throw new Error(`Minimum withdrawal amount is ₹${limits.minimumAmount}`);
      }
      
      if (amount > limits.maximumAmount) {
        throw new Error(`Maximum withdrawal amount is ₹${limits.maximumAmount}`);
      }
      
      if (amount > limits.remainingDailyLimit) {
        throw new Error(`Daily withdrawal limit exceeded. Remaining: ₹${limits.remainingDailyLimit}`);
      }
      
      if (amount > limits.remainingMonthlyLimit) {
        throw new Error(`Monthly withdrawal limit exceeded. Remaining: ₹${limits.remainingMonthlyLimit}`);
      }

      // Process withdrawal through main cashback service
      const withdrawal = await this.cashbackService.requestWithdrawal(userId, amount, paymentMethodId);

      // Add additional metadata if provided
      if (options) {
        await this.repository.updateWithdrawalRequest(withdrawal.id, {
          metadata: {
            ...withdrawal.metadata,
            priority: options.priority || 'normal',
            notes: options.notes,
            requestOptions: options
          }
        });
      }

      this.logger.info('Withdrawal requested via balance service', {
        userId,
        amount,
        withdrawalId: withdrawal.id,
        priority: options?.priority
      });

      return withdrawal;

    } catch (error) {
      this.logger.error('Failed to request withdrawal', { userId, amount, error: error.message });
      throw error;
    }
  }

  // Cancel pending withdrawal
  async cancelWithdrawal(userId: string, withdrawalId: string, reason?: string): Promise<void> {
    try {
      const withdrawal = await this.repository.getWithdrawalRequest(withdrawalId);
      
      if (!withdrawal) {
        throw new Error('Withdrawal request not found');
      }
      
      if (withdrawal.userId !== userId) {
        throw new Error('Unauthorized to cancel this withdrawal');
      }
      
      if (withdrawal.status !== WithdrawalStatus.PENDING) {
        throw new Error('Can only cancel pending withdrawals');
      }

      // Update withdrawal status
      await this.repository.updateWithdrawalRequest(withdrawalId, {
        status: WithdrawalStatus.CANCELLED,
        metadata: {
          ...withdrawal.metadata,
          cancellationReason: reason || 'Cancelled by user',
          cancelledAt: new Date(),
          cancelledBy: userId
        }
      });

      // Restore balance
      const account = await this.repository.getCashbackAccount(withdrawal.accountId);
      if (account) {
        await this.repository.updateCashbackAccount(account.id, {
          balance: account.balance + withdrawal.amount,
          updatedAt: new Date()
        });
      }

      this.logger.info('Withdrawal cancelled', { userId, withdrawalId, reason });

    } catch (error) {
      this.logger.error('Failed to cancel withdrawal', { userId, withdrawalId, error: error.message });
      throw error;
    }
  }

  // Get withdrawal status and tracking info
  async getWithdrawalStatus(userId: string, withdrawalId: string): Promise<{
    withdrawal: WithdrawalRequest;
    paymentMethod: PaymentMethod;
    timeline: Array<{
      status: string;
      timestamp: Date;
      description: string;
    }>;
  }> {
    try {
      const withdrawal = await this.repository.getWithdrawalRequest(withdrawalId);
      
      if (!withdrawal) {
        throw new Error('Withdrawal request not found');
      }
      
      if (withdrawal.userId !== userId) {
        throw new Error('Unauthorized to view this withdrawal');
      }

      const paymentMethod = await this.repository.getPaymentMethod(withdrawal.paymentMethodId);
      
      // Build timeline from withdrawal metadata and status changes
      const timeline = this.buildWithdrawalTimeline(withdrawal);

      return {
        withdrawal,
        paymentMethod,
        timeline
      };

    } catch (error) {
      this.logger.error('Failed to get withdrawal status', { userId, withdrawalId, error: error.message });
      throw error;
    }
  }

  // Get balance analytics for user
  async getBalanceAnalytics(userId: string, period: 'week' | 'month' | 'quarter' | 'year' = 'month'): Promise<{
    periodSummary: {
      totalEarned: number;
      totalWithdrawn: number;
      netGain: number;
      transactionCount: number;
      averageTransaction: number;
    };
    trends: Array<{
      date: string;
      earned: number;
      withdrawn: number;
      balance: number;
    }>;
    topCategories: Array<{
      category: string;
      amount: number;
      percentage: number;
    }>;
    topStores: Array<{
      store: string;
      amount: number;
      percentage: number;
    }>;
  }> {
    try {
      const account = await this.repository.getCashbackAccountByUserId(userId);
      if (!account) {
        throw new Error('Cashback account not found');
      }

      const dateRange = this.getDateRangeForPeriod(period);
      
      const [periodSummary, trends, topCategories, topStores] = await Promise.all([
        this.calculatePeriodSummary(account.id, dateRange),
        this.calculateBalanceTrends(account.id, dateRange, period),
        this.getTopCategories(account.id, dateRange),
        this.getTopStores(account.id, dateRange)
      ]);

      return {
        periodSummary,
        trends,
        topCategories,
        topStores
      };

    } catch (error) {
      this.logger.error('Failed to get balance analytics', { userId, error: error.message });
      throw error;
    }
  }

  // Export transaction history
  async exportTransactionHistory(
    userId: string,
    format: 'csv' | 'excel' | 'pdf',
    filters?: {
      dateFrom?: Date;
      dateTo?: Date;
      type?: CashbackTransactionType;
    }
  ): Promise<{
    filename: string;
    data: Buffer;
    mimeType: string;
  }> {
    try {
      const account = await this.repository.getCashbackAccountByUserId(userId);
      if (!account) {
        throw new Error('Cashback account not found');
      }

      // Get all transactions for export (no pagination)
      const conditions: any = { accountId: account.id };
      if (filters) {
        if (filters.type) conditions.type = filters.type;
        if (filters.dateFrom) conditions.createdAt = { $gte: filters.dateFrom };
        if (filters.dateTo) {
          conditions.createdAt = conditions.createdAt || {};
          conditions.createdAt.$lte = filters.dateTo;
        }
      }

      const transactions = await this.repository.getCashbackTransactionsByConditions(conditions);

      // Generate export based on format
      switch (format) {
        case 'csv':
          return this.generateCSVExport(transactions, userId);
        case 'excel':
          return this.generateExcelExport(transactions, userId);
        case 'pdf':
          return this.generatePDFExport(transactions, userId);
        default:
          throw new Error('Unsupported export format');
      }

    } catch (error) {
      this.logger.error('Failed to export transaction history', { userId, format, error: error.message });
      throw error;
    }
  }

  // Private helper methods
  private async getRecentTransactions(userId: string, limit: number): Promise<CashbackTransaction[]> {
    const account = await this.repository.getCashbackAccountByUserId(userId);
    if (!account) return [];

    return await this.repository.getCashbackTransactionsByConditions(
      { accountId: account.id },
      limit,
      0,
      { createdAt: -1 }
    );
  }

  private async getPendingWithdrawals(userId: string): Promise<WithdrawalRequest[]> {
    const account = await this.repository.getCashbackAccountByUserId(userId);
    if (!account) return [];

    return await this.repository.getWithdrawalRequestsByConditions({
      accountId: account.id,
      status: WithdrawalStatus.PENDING
    });
  }

  private async getAvailablePaymentMethods(userId: string): Promise<PaymentMethod[]> {
    return await this.repository.getPaymentMethodsByUserId(userId, {
      isActive: true,
      isVerified: true
    });
  }

  private async getWithdrawalLimits(userId: string): Promise<WithdrawalLimits> {
    // Get user's withdrawal limits (could be based on user tier, verification status, etc.)
    const baseLimit = {
      minimumAmount: 100,
      maximumAmount: 50000,
      dailyLimit: 25000,
      monthlyLimit: 100000
    };

    // Calculate remaining limits
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const [dailyWithdrawn, monthlyWithdrawn] = await Promise.all([
      this.getTotalWithdrawnInPeriod(userId, today, new Date()),
      this.getTotalWithdrawnInPeriod(userId, monthStart, new Date())
    ]);

    return {
      ...baseLimit,
      remainingDailyLimit: Math.max(0, baseLimit.dailyLimit - dailyWithdrawn),
      remainingMonthlyLimit: Math.max(0, baseLimit.monthlyLimit - monthlyWithdrawn)
    };
  }

  private async getTotalWithdrawnInPeriod(userId: string, startDate: Date, endDate: Date): Promise<number> {
    const account = await this.repository.getCashbackAccountByUserId(userId);
    if (!account) return 0;

    const withdrawals = await this.repository.getWithdrawalRequestsByConditions({
      accountId: account.id,
      status: WithdrawalStatus.COMPLETED,
      processedAt: { $gte: startDate, $lte: endDate }
    });

    return withdrawals.reduce((total, withdrawal) => total + withdrawal.amount, 0);
  }

  private async calculateTransactionSummary(accountId: string, filters?: any): Promise<any> {
    // Mock implementation - would calculate actual summary from database
    return {
      totalEarned: 1250.50,
      totalWithdrawn: 800.00,
      pendingAmount: 150.25,
      completedTransactions: 25
    };
  }

  private async calculateWithdrawalSummary(accountId: string, filters?: any): Promise<any> {
    // Mock implementation - would calculate actual summary from database
    return {
      totalRequested: 1200.00,
      totalCompleted: 800.00,
      totalPending: 200.00,
      totalFailed: 200.00
    };
  }

  private buildWithdrawalTimeline(withdrawal: WithdrawalRequest): Array<{
    status: string;
    timestamp: Date;
    description: string;
  }> {
    const timeline = [
      {
        status: 'requested',
        timestamp: withdrawal.requestedAt,
        description: 'Withdrawal request submitted'
      }
    ];

    if (withdrawal.processedAt) {
      timeline.push({
        status: withdrawal.status.toLowerCase(),
        timestamp: withdrawal.processedAt,
        description: `Withdrawal ${withdrawal.status.toLowerCase()}`
      });
    }

    return timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  private getDateRangeForPeriod(period: string): { from: Date; to: Date } {
    const now = new Date();
    const from = new Date();

    switch (period) {
      case 'week':
        from.setDate(now.getDate() - 7);
        break;
      case 'month':
        from.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        from.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        from.setFullYear(now.getFullYear() - 1);
        break;
    }

    return { from, to: now };
  }

  private async calculatePeriodSummary(accountId: string, dateRange: { from: Date; to: Date }): Promise<any> {
    // Mock implementation
    return {
      totalEarned: 450.75,
      totalWithdrawn: 200.00,
      netGain: 250.75,
      transactionCount: 12,
      averageTransaction: 37.56
    };
  }

  private async calculateBalanceTrends(accountId: string, dateRange: { from: Date; to: Date }, period: string): Promise<any[]> {
    // Mock implementation
    return [
      { date: '2024-01-01', earned: 50.25, withdrawn: 0, balance: 50.25 },
      { date: '2024-01-02', earned: 75.50, withdrawn: 0, balance: 125.75 },
      { date: '2024-01-03', earned: 30.00, withdrawn: 100.00, balance: 55.75 }
    ];
  }

  private async getTopCategories(accountId: string, dateRange: { from: Date; to: Date }): Promise<any[]> {
    // Mock implementation
    return [
      { category: 'Electronics', amount: 150.25, percentage: 45.5 },
      { category: 'Fashion', amount: 100.50, percentage: 30.4 },
      { category: 'Grocery', amount: 80.00, percentage: 24.1 }
    ];
  }

  private async getTopStores(accountId: string, dateRange: { from: Date; to: Date }): Promise<any[]> {
    // Mock implementation
    return [
      { store: 'Flipkart', amount: 180.75, percentage: 54.7 },
      { store: 'Amazon', amount: 90.50, percentage: 27.4 },
      { store: 'Myntra', amount: 59.50, percentage: 18.0 }
    ];
  }

  private generateCSVExport(transactions: CashbackTransaction[], userId: string): {
    filename: string;
    data: Buffer;
    mimeType: string;
  } {
    const csvHeader = 'Date,Type,Amount,Status,Store,Transaction ID\n';
    const csvRows = transactions.map(txn => 
      `${txn.createdAt.toISOString()},${txn.type},${txn.amount},${txn.status},${txn.metadata?.store || 'N/A'},${txn.transactionId || txn.id}`
    ).join('\n');

    const csvContent = csvHeader + csvRows;
    
    return {
      filename: `cashback_transactions_${userId}_${new Date().toISOString().split('T')[0]}.csv`,
      data: Buffer.from(csvContent, 'utf8'),
      mimeType: 'text/csv'
    };
  }

  private generateExcelExport(transactions: CashbackTransaction[], userId: string): {
    filename: string;
    data: Buffer;
    mimeType: string;
  } {
    // Mock implementation - would use a library like xlsx
    return {
      filename: `cashback_transactions_${userId}_${new Date().toISOString().split('T')[0]}.xlsx`,
      data: Buffer.from('Excel export not implemented', 'utf8'),
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
  }

  private generatePDFExport(transactions: CashbackTransaction[], userId: string): {
    filename: string;
    data: Buffer;
    mimeType: string;
  } {
    // Mock implementation - would use a library like pdfkit
    return {
      filename: `cashback_transactions_${userId}_${new Date().toISOString().split('T')[0]}.pdf`,
      data: Buffer.from('PDF export not implemented', 'utf8'),
      mimeType: 'application/pdf'
    };
  }
}
import { Pool } from 'pg';
import { 
  IndianPaymentMethod, 
  CashbackAccount, 
  CashbackTransaction, 
  WithdrawalRequest, 
  CashbackRule,
  ReferralProgram,
  UserReferral,
  PaymentValidation,
  CashbackAnalytics,
  TaxCalculation,
  CashbackNotification,
  CashbackDispute
} from '../models/CashbackSystem';
import { BaseRepository } from './base/BaseRepository';

export class CashbackSystemRepository extends BaseRepository {
  constructor(pool: Pool) {
    super(pool);
  }

  // Indian Payment Method operations
  async createPaymentMethod(paymentMethod: Omit<IndianPaymentMethod, 'id' | 'createdAt' | 'updatedAt'>): Promise<IndianPaymentMethod> {
    const query = `
      INSERT INTO indian_payment_methods (
        user_id, payment_type, payment_details, is_active, is_verified,
        verification_date, verification_method, last_used, usage_count, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      paymentMethod.userId, paymentMethod.paymentType, JSON.stringify(paymentMethod.paymentDetails),
      paymentMethod.isActive, paymentMethod.isVerified, paymentMethod.verificationDate,
      paymentMethod.verificationMethod, paymentMethod.lastUsed, paymentMethod.usageCount,
      JSON.stringify(paymentMethod.metadata)
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToPaymentMethod(result.rows[0]);
  }

  async getPaymentMethodsByUser(userId: string): Promise<IndianPaymentMethod[]> {
    const query = `
      SELECT * FROM indian_payment_methods 
      WHERE user_id = $1 AND is_active = true
      ORDER BY is_verified DESC, last_used DESC NULLS LAST, created_at DESC
    `;
    const result = await this.pool.query(query, [userId]);
    return result.rows.map(row => this.mapRowToPaymentMethod(row));
  }

  async updatePaymentMethodVerification(
    paymentMethodId: string, 
    isVerified: boolean, 
    verificationMethod: string
  ): Promise<void> {
    const query = `
      UPDATE indian_payment_methods 
      SET is_verified = $1, verification_date = NOW(), verification_method = $2, updated_at = NOW()
      WHERE id = $3
    `;
    await this.pool.query(query, [isVerified, verificationMethod, paymentMethodId]);
  }

  // Cashback Account operations
  async createCashbackAccount(account: Omit<CashbackAccount, 'id' | 'createdAt' | 'updatedAt'>): Promise<CashbackAccount> {
    const query = `
      INSERT INTO cashback_accounts (
        user_id, current_balance, pending_balance, total_earned, total_withdrawn,
        currency, account_status, kyc_status, kyc_documents, withdrawal_settings,
        tax_information, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const values = [
      account.userId, account.currentBalance, account.pendingBalance, account.totalEarned,
      account.totalWithdrawn, account.currency, account.accountStatus, account.kycStatus,
      JSON.stringify(account.kycDocuments), JSON.stringify(account.withdrawalSettings),
      JSON.stringify(account.taxInformation), JSON.stringify(account.metadata)
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToCashbackAccount(result.rows[0]);
  }

  async getCashbackAccountByUser(userId: string): Promise<CashbackAccount | null> {
    const query = 'SELECT * FROM cashback_accounts WHERE user_id = $1';
    const result = await this.pool.query(query, [userId]);
    return result.rows.length > 0 ? this.mapRowToCashbackAccount(result.rows[0]) : null;
  }

  async updateAccountBalance(
    userId: string, 
    currentBalance: number, 
    pendingBalance: number, 
    totalEarned: number, 
    totalWithdrawn: number
  ): Promise<void> {
    const query = `
      UPDATE cashback_accounts 
      SET current_balance = $1, pending_balance = $2, total_earned = $3, 
          total_withdrawn = $4, updated_at = NOW()
      WHERE user_id = $5
    `;
    await this.pool.query(query, [currentBalance, pendingBalance, totalEarned, totalWithdrawn, userId]);
  }

  // Cashback Transaction operations
  async createCashbackTransaction(transaction: Omit<CashbackTransaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<CashbackTransaction> {
    const query = `
      INSERT INTO cashback_transactions (
        user_id, transaction_type, amount, currency, description, source_type,
        source_id, source_details, status, processing_date, confirmation_date,
        expiry_date, commission_rate, tax_deducted, net_amount, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;

    const values = [
      transaction.userId, transaction.transactionType, transaction.amount, transaction.currency,
      transaction.description, transaction.sourceType, transaction.sourceId,
      JSON.stringify(transaction.sourceDetails), transaction.status, transaction.processingDate,
      transaction.confirmationDate, transaction.expiryDate, transaction.commissionRate,
      transaction.taxDeducted, transaction.netAmount, JSON.stringify(transaction.metadata)
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToCashbackTransaction(result.rows[0]);
  }

  async getCashbackTransactionsByUser(
    userId: string, 
    limit: number = 50, 
    offset: number = 0
  ): Promise<CashbackTransaction[]> {
    const query = `
      SELECT * FROM cashback_transactions 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;
    const result = await this.pool.query(query, [userId, limit, offset]);
    return result.rows.map(row => this.mapRowToCashbackTransaction(row));
  }

  async updateTransactionStatus(transactionId: string, status: string, confirmationDate?: Date): Promise<void> {
    const query = `
      UPDATE cashback_transactions 
      SET status = $1, confirmation_date = $2, updated_at = NOW()
      WHERE id = $3
    `;
    await this.pool.query(query, [status, confirmationDate, transactionId]);
  }

  // Withdrawal Request operations
  async createWithdrawalRequest(withdrawal: Omit<WithdrawalRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<WithdrawalRequest> {
    const query = `
      INSERT INTO withdrawal_requests (
        user_id, amount, currency, payment_method_id, payment_method, processing_fee,
        net_amount, tax_deducted, status, request_date, retry_count, max_retries, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const values = [
      withdrawal.userId, withdrawal.amount, withdrawal.currency, withdrawal.paymentMethodId,
      JSON.stringify(withdrawal.paymentMethod), withdrawal.processingFee, withdrawal.netAmount,
      withdrawal.taxDeducted, withdrawal.status, withdrawal.requestDate, withdrawal.retryCount,
      withdrawal.maxRetries, JSON.stringify(withdrawal.metadata)
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToWithdrawalRequest(result.rows[0]);
  }

  async getWithdrawalRequestsByUser(userId: string): Promise<WithdrawalRequest[]> {
    const query = `
      SELECT * FROM withdrawal_requests 
      WHERE user_id = $1 
      ORDER BY request_date DESC
    `;
    const result = await this.pool.query(query, [userId]);
    return result.rows.map(row => this.mapRowToWithdrawalRequest(row));
  }

  async getPendingWithdrawals(): Promise<WithdrawalRequest[]> {
    const query = `
      SELECT * FROM withdrawal_requests 
      WHERE status IN ('pending', 'processing') 
      ORDER BY request_date ASC
    `;
    const result = await this.pool.query(query);
    return result.rows.map(row => this.mapRowToWithdrawalRequest(row));
  }

  async updateWithdrawalStatus(
    withdrawalId: string, 
    status: string, 
    transactionId?: string, 
    failureReason?: string
  ): Promise<void> {
    const query = `
      UPDATE withdrawal_requests 
      SET status = $1, transaction_id = $2, failure_reason = $3, 
          processing_date = CASE WHEN $1 = 'processing' THEN NOW() ELSE processing_date END,
          completion_date = CASE WHEN $1 IN ('completed', 'failed') THEN NOW() ELSE completion_date END,
          updated_at = NOW()
      WHERE id = $4
    `;
    await this.pool.query(query, [status, transactionId, failureReason, withdrawalId]);
  }

  // Cashback Rule operations
  async createCashbackRule(rule: Omit<CashbackRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<CashbackRule> {
    const query = `
      INSERT INTO cashback_rules (
        name, description, rule_type, is_active, priority, conditions, rewards,
        valid_from, valid_to, usage_limit, usage_count, applicable_stores,
        applicable_categories, user_segments, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;

    const values = [
      rule.name, rule.description, rule.ruleType, rule.isActive, rule.priority,
      JSON.stringify(rule.conditions), JSON.stringify(rule.rewards), rule.validFrom,
      rule.validTo, rule.usageLimit, rule.usageCount, JSON.stringify(rule.applicableStores),
      JSON.stringify(rule.applicableCategories), JSON.stringify(rule.userSegments),
      JSON.stringify(rule.metadata)
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToCashbackRule(result.rows[0]);
  }

  async getActiveCashbackRules(storeId?: string, category?: string): Promise<CashbackRule[]> {
    let query = `
      SELECT * FROM cashback_rules 
      WHERE is_active = true 
        AND valid_from <= NOW() 
        AND (valid_to IS NULL OR valid_to >= NOW())
        AND (usage_limit IS NULL OR usage_count < usage_limit)
    `;
    const values = [];
    let paramIndex = 1;

    if (storeId) {
      query += ` AND (applicable_stores = '[]' OR applicable_stores @> $${paramIndex})`;
      values.push(JSON.stringify([storeId]));
      paramIndex++;
    }

    if (category) {
      query += ` AND (applicable_categories = '[]' OR applicable_categories @> $${paramIndex})`;
      values.push(JSON.stringify([category]));
      paramIndex++;
    }

    query += ' ORDER BY priority ASC';

    const result = await this.pool.query(query, values);
    return result.rows.map(row => this.mapRowToCashbackRule(row));
  }

  async incrementRuleUsage(ruleId: string): Promise<void> {
    const query = `
      UPDATE cashback_rules 
      SET usage_count = usage_count + 1, updated_at = NOW()
      WHERE id = $1
    `;
    await this.pool.query(query, [ruleId]);
  }

  // Referral Program operations
  async createReferralProgram(program: Omit<ReferralProgram, 'id' | 'createdAt' | 'updatedAt'>): Promise<ReferralProgram> {
    const query = `
      INSERT INTO referral_programs (
        name, description, program_type, is_active, referrer_reward, referee_reward,
        conditions, valid_from, valid_to, max_referrals, total_referrals,
        total_rewards_paid, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const values = [
      program.name, program.description, program.programType, program.isActive,
      JSON.stringify(program.referrerReward), JSON.stringify(program.refereeReward),
      JSON.stringify(program.conditions), program.validFrom, program.validTo,
      program.maxReferrals, program.totalReferrals, program.totalRewardsPaid,
      JSON.stringify(program.metadata)
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToReferralProgram(result.rows[0]);
  }

  async getActiveReferralPrograms(): Promise<ReferralProgram[]> {
    const query = `
      SELECT * FROM referral_programs 
      WHERE is_active = true 
        AND valid_from <= NOW() 
        AND (valid_to IS NULL OR valid_to >= NOW())
      ORDER BY created_at DESC
    `;
    const result = await this.pool.query(query);
    return result.rows.map(row => this.mapRowToReferralProgram(row));
  }

  // User Referral operations
  async createUserReferral(referral: Omit<UserReferral, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserReferral> {
    const query = `
      INSERT INTO user_referrals (
        referrer_id, referee_id, referral_code, program_id, status, referral_date,
        qualification_date, reward_date, referrer_reward_amount, referee_reward_amount,
        qualifying_order_id, qualifying_order_value, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const values = [
      referral.referrerId, referral.refereeId, referral.referralCode, referral.programId,
      referral.status, referral.referralDate, referral.qualificationDate, referral.rewardDate,
      referral.referrerRewardAmount, referral.refereeRewardAmount, referral.qualifyingOrderId,
      referral.qualifyingOrderValue, JSON.stringify(referral.metadata)
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToUserReferral(result.rows[0]);
  }

  async getReferralsByUser(userId: string, type: 'referrer' | 'referee' = 'referrer'): Promise<UserReferral[]> {
    const field = type === 'referrer' ? 'referrer_id' : 'referee_id';
    const query = `
      SELECT * FROM user_referrals 
      WHERE ${field} = $1 
      ORDER BY referral_date DESC
    `;
    const result = await this.pool.query(query, [userId]);
    return result.rows.map(row => this.mapRowToUserReferral(row));
  }

  async updateReferralStatus(referralId: string, status: string, qualifyingOrderId?: string): Promise<void> {
    const query = `
      UPDATE user_referrals 
      SET status = $1, 
          qualification_date = CASE WHEN $1 = 'qualified' THEN NOW() ELSE qualification_date END,
          reward_date = CASE WHEN $1 = 'rewarded' THEN NOW() ELSE reward_date END,
          qualifying_order_id = COALESCE($2, qualifying_order_id),
          updated_at = NOW()
      WHERE id = $3
    `;
    await this.pool.query(query, [status, qualifyingOrderId, referralId]);
  }

  // Payment Validation operations
  async createPaymentValidation(validation: Omit<PaymentValidation, 'id' | 'createdAt' | 'updatedAt'>): Promise<PaymentValidation> {
    const query = `
      INSERT INTO payment_validations (
        payment_method_id, validation_type, validation_status, validation_data,
        attempts, max_attempts, expiry_date, completed_at, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      validation.paymentMethodId, validation.validationType, validation.validationStatus,
      JSON.stringify(validation.validationData), JSON.stringify(validation.attempts),
      validation.maxAttempts, validation.expiryDate, validation.completedAt,
      JSON.stringify(validation.metadata)
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToPaymentValidation(result.rows[0]);
  }

  async updateValidationStatus(validationId: string, status: string, validationData: any): Promise<void> {
    const query = `
      UPDATE payment_validations 
      SET validation_status = $1, validation_data = $2, 
          completed_at = CASE WHEN $1 IN ('success', 'failed', 'expired') THEN NOW() ELSE completed_at END,
          updated_at = NOW()
      WHERE id = $3
    `;
    await this.pool.query(query, [status, JSON.stringify(validationData), validationId]);
  }

  // Analytics operations
  async getCashbackSummary(userId: string, startDate: Date, endDate: Date): Promise<any> {
    const query = `
      SELECT 
        COUNT(*) as total_transactions,
        SUM(CASE WHEN transaction_type = 'earned' THEN amount ELSE 0 END) as total_earned,
        SUM(CASE WHEN transaction_type = 'withdrawn' THEN amount ELSE 0 END) as total_withdrawn,
        AVG(CASE WHEN transaction_type = 'earned' THEN amount ELSE NULL END) as avg_earning,
        COUNT(CASE WHEN transaction_type = 'earned' THEN 1 END) as earning_transactions,
        COUNT(CASE WHEN transaction_type = 'withdrawn' THEN 1 END) as withdrawal_transactions
      FROM cashback_transactions 
      WHERE user_id = $1 AND created_at BETWEEN $2 AND $3 AND status = 'confirmed'
    `;

    const result = await this.pool.query(query, [userId, startDate, endDate]);
    return result.rows[0];
  }

  async getTopEarningUsers(limit: number = 10): Promise<any[]> {
    const query = `
      SELECT 
        ca.user_id,
        ca.total_earned,
        ca.total_withdrawn,
        ca.current_balance,
        COUNT(ct.id) as transaction_count,
        MAX(ct.created_at) as last_transaction
      FROM cashback_accounts ca
      LEFT JOIN cashback_transactions ct ON ca.user_id = ct.user_id
      WHERE ca.account_status = 'active'
      GROUP BY ca.user_id, ca.total_earned, ca.total_withdrawn, ca.current_balance
      ORDER BY ca.total_earned DESC
      LIMIT $1
    `;

    const result = await this.pool.query(query, [limit]);
    return result.rows;
  }

  // Helper methods
  private mapRowToPaymentMethod(row: any): IndianPaymentMethod {
    return {
      id: row.id,
      userId: row.user_id,
      paymentType: row.payment_type,
      paymentDetails: JSON.parse(row.payment_details || '{}'),
      isActive: row.is_active,
      isVerified: row.is_verified,
      verificationDate: row.verification_date,
      verificationMethod: row.verification_method,
      lastUsed: row.last_used,
      usageCount: row.usage_count,
      metadata: JSON.parse(row.metadata || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapRowToCashbackAccount(row: any): CashbackAccount {
    return {
      id: row.id,
      userId: row.user_id,
      currentBalance: parseFloat(row.current_balance),
      pendingBalance: parseFloat(row.pending_balance),
      totalEarned: parseFloat(row.total_earned),
      totalWithdrawn: parseFloat(row.total_withdrawn),
      currency: row.currency,
      accountStatus: row.account_status,
      kycStatus: row.kyc_status,
      kycDocuments: JSON.parse(row.kyc_documents || '[]'),
      withdrawalSettings: JSON.parse(row.withdrawal_settings || '{}'),
      taxInformation: JSON.parse(row.tax_information || '{}'),
      metadata: JSON.parse(row.metadata || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapRowToCashbackTransaction(row: any): CashbackTransaction {
    return {
      id: row.id,
      userId: row.user_id,
      transactionType: row.transaction_type,
      amount: parseFloat(row.amount),
      currency: row.currency,
      description: row.description,
      sourceType: row.source_type,
      sourceId: row.source_id,
      sourceDetails: JSON.parse(row.source_details || '{}'),
      status: row.status,
      processingDate: row.processing_date,
      confirmationDate: row.confirmation_date,
      expiryDate: row.expiry_date,
      commissionRate: row.commission_rate,
      taxDeducted: row.tax_deducted ? parseFloat(row.tax_deducted) : undefined,
      netAmount: parseFloat(row.net_amount),
      metadata: JSON.parse(row.metadata || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapRowToWithdrawalRequest(row: any): WithdrawalRequest {
    return {
      id: row.id,
      userId: row.user_id,
      amount: parseFloat(row.amount),
      currency: row.currency,
      paymentMethodId: row.payment_method_id,
      paymentMethod: JSON.parse(row.payment_method || '{}'),
      processingFee: parseFloat(row.processing_fee),
      netAmount: parseFloat(row.net_amount),
      taxDeducted: parseFloat(row.tax_deducted),
      status: row.status,
      requestDate: row.request_date,
      processingDate: row.processing_date,
      completionDate: row.completion_date,
      failureReason: row.failure_reason,
      transactionId: row.transaction_id,
      bankReference: row.bank_reference,
      approvedBy: row.approved_by,
      processingNotes: row.processing_notes,
      retryCount: row.retry_count,
      maxRetries: row.max_retries,
      metadata: JSON.parse(row.metadata || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapRowToCashbackRule(row: any): CashbackRule {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      ruleType: row.rule_type,
      isActive: row.is_active,
      priority: row.priority,
      conditions: JSON.parse(row.conditions || '[]'),
      rewards: JSON.parse(row.rewards || '[]'),
      validFrom: row.valid_from,
      validTo: row.valid_to,
      usageLimit: row.usage_limit,
      usageCount: row.usage_count,
      applicableStores: JSON.parse(row.applicable_stores || '[]'),
      applicableCategories: JSON.parse(row.applicable_categories || '[]'),
      userSegments: JSON.parse(row.user_segments || '[]'),
      metadata: JSON.parse(row.metadata || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapRowToReferralProgram(row: any): ReferralProgram {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      programType: row.program_type,
      isActive: row.is_active,
      referrerReward: JSON.parse(row.referrer_reward || '{}'),
      refereeReward: JSON.parse(row.referee_reward || '{}'),
      conditions: JSON.parse(row.conditions || '[]'),
      validFrom: row.valid_from,
      validTo: row.valid_to,
      maxReferrals: row.max_referrals,
      totalReferrals: row.total_referrals,
      totalRewardsPaid: parseFloat(row.total_rewards_paid),
      metadata: JSON.parse(row.metadata || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapRowToUserReferral(row: any): UserReferral {
    return {
      id: row.id,
      referrerId: row.referrer_id,
      refereeId: row.referee_id,
      referralCode: row.referral_code,
      programId: row.program_id,
      status: row.status,
      referralDate: row.referral_date,
      qualificationDate: row.qualification_date,
      rewardDate: row.reward_date,
      referrerRewardAmount: parseFloat(row.referrer_reward_amount),
      refereeRewardAmount: parseFloat(row.referee_reward_amount),
      qualifyingOrderId: row.qualifying_order_id,
      qualifyingOrderValue: row.qualifying_order_value ? parseFloat(row.qualifying_order_value) : undefined,
      metadata: JSON.parse(row.metadata || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapRowToPaymentValidation(row: any): PaymentValidation {
    return {
      id: row.id,
      paymentMethodId: row.payment_method_id,
      validationType: row.validation_type,
      validationStatus: row.validation_status,
      validationData: JSON.parse(row.validation_data || '{}'),
      attempts: JSON.parse(row.attempts || '[]'),
      maxAttempts: row.max_attempts,
      expiryDate: row.expiry_date,
      completedAt: row.completed_at,
      metadata: JSON.parse(row.metadata || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}
export interface IndianPaymentMethod {
  id: string;
  userId: string;
  paymentType: 'upi' | 'paytm' | 'phonepe' | 'bank_account' | 'wallet';
  paymentDetails: UPIDetails | PayTMDetails | PhonePeDetails | BankAccountDetails | WalletDetails;
  isActive: boolean;
  isVerified: boolean;
  verificationDate?: Date;
  verificationMethod?: 'otp' | 'penny_drop' | 'manual';
  lastUsed?: Date;
  usageCount: number;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface UPIDetails {
  upiId: string;
  upiHandle: string; // @paytm, @phonepe, @googlepay, etc.
  holderName: string;
  bankName?: string;
  verificationStatus: 'pending' | 'verified' | 'failed';
  lastVerificationAttempt?: Date;
}

export interface PayTMDetails {
  paytmNumber: string;
  holderName: string;
  walletId?: string;
  kycStatus: 'pending' | 'partial' | 'full';
  verificationStatus: 'pending' | 'verified' | 'failed';
}

export interface PhonePeDetails {
  phonepeNumber: string;
  holderName: string;
  walletId?: string;
  kycStatus: 'pending' | 'partial' | 'full';
  verificationStatus: 'pending' | 'verified' | 'failed';
}

export interface BankAccountDetails {
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  branchName: string;
  accountHolderName: string;
  accountType: 'savings' | 'current';
  verificationStatus: 'pending' | 'verified' | 'failed';
  pennyDropAmount?: number;
  pennyDropReference?: string;
}

export interface WalletDetails {
  walletType: 'amazon_pay' | 'mobikwik' | 'freecharge' | 'other';
  walletId: string;
  holderName: string;
  verificationStatus: 'pending' | 'verified' | 'failed';
}

export interface CashbackAccount {
  id: string;
  userId: string;
  currentBalance: number;
  pendingBalance: number;
  totalEarned: number;
  totalWithdrawn: number;
  currency: string;
  accountStatus: 'active' | 'suspended' | 'closed';
  kycStatus: 'not_required' | 'pending' | 'submitted' | 'verified' | 'rejected';
  kycDocuments?: KYCDocument[];
  withdrawalSettings: WithdrawalSettings;
  taxInformation: TaxInformation;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface KYCDocument {
  documentType: 'pan_card' | 'aadhaar' | 'voter_id' | 'passport' | 'driving_license';
  documentNumber: string;
  documentUrl: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  verificationDate?: Date;
  rejectionReason?: string;
  expiryDate?: Date;
}

export interface WithdrawalSettings {
  minimumAmount: number;
  maximumAmount: number;
  dailyLimit: number;
  monthlyLimit: number;
  processingFee: number;
  processingFeeType: 'fixed' | 'percentage';
  autoWithdrawal: boolean;
  autoWithdrawalThreshold?: number;
  preferredPaymentMethod?: string;
}

export interface TaxInformation {
  panNumber?: string;
  gstNumber?: string;
  tdsApplicable: boolean;
  tdsRate: number;
  taxExemptionCertificate?: string;
  form16Available: boolean;
}

export interface CashbackTransaction {
  id: string;
  userId: string;
  transactionType: 'earned' | 'withdrawn' | 'refunded' | 'adjusted' | 'bonus';
  amount: number;
  currency: string;
  description: string;
  sourceType: 'purchase' | 'referral' | 'bonus' | 'promotion' | 'adjustment';
  sourceId: string; // order_id, referral_id, etc.
  sourceDetails: Record<string, any>;
  status: 'pending' | 'confirmed' | 'cancelled' | 'failed';
  processingDate?: Date;
  confirmationDate?: Date;
  expiryDate?: Date;
  commissionRate?: number;
  taxDeducted?: number;
  netAmount: number;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  paymentMethodId: string;
  paymentMethod: IndianPaymentMethod;
  processingFee: number;
  netAmount: number;
  taxDeducted: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  requestDate: Date;
  processingDate?: Date;
  completionDate?: Date;
  failureReason?: string;
  transactionId?: string;
  bankReference?: string;
  approvedBy?: string;
  processingNotes?: string;
  retryCount: number;
  maxRetries: number;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CashbackRule {
  id: string;
  name: string;
  description: string;
  ruleType: 'percentage' | 'fixed' | 'tiered' | 'bonus' | 'referral';
  isActive: boolean;
  priority: number;
  conditions: CashbackCondition[];
  rewards: CashbackReward[];
  validFrom: Date;
  validTo?: Date;
  usageLimit?: number;
  usageCount: number;
  applicableStores: string[];
  applicableCategories: string[];
  userSegments: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CashbackCondition {
  field: string; // 'order_value', 'store_id', 'category', 'user_tier', etc.
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'between';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface CashbackReward {
  rewardType: 'percentage' | 'fixed_amount' | 'bonus_multiplier';
  value: number;
  maxAmount?: number;
  minAmount?: number;
  description: string;
  conditions?: string[];
}

export interface ReferralProgram {
  id: string;
  name: string;
  description: string;
  programType: 'standard' | 'tiered' | 'milestone' | 'limited_time';
  isActive: boolean;
  referrerReward: ReferralReward;
  refereeReward: ReferralReward;
  conditions: ReferralCondition[];
  validFrom: Date;
  validTo?: Date;
  maxReferrals?: number;
  totalReferrals: number;
  totalRewardsPaid: number;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReferralReward {
  rewardType: 'cashback' | 'bonus_points' | 'discount_coupon' | 'free_product';
  value: number;
  currency?: string;
  description: string;
  conditions: string[];
  expiryDays?: number;
}

export interface ReferralCondition {
  conditionType: 'first_purchase' | 'minimum_order_value' | 'category_purchase' | 'time_limit';
  value: any;
  description: string;
}

export interface UserReferral {
  id: string;
  referrerId: string;
  refereeId: string;
  referralCode: string;
  programId: string;
  status: 'pending' | 'qualified' | 'rewarded' | 'expired' | 'cancelled';
  referralDate: Date;
  qualificationDate?: Date;
  rewardDate?: Date;
  referrerRewardAmount: number;
  refereeRewardAmount: number;
  qualifyingOrderId?: string;
  qualifyingOrderValue?: number;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentValidation {
  id: string;
  paymentMethodId: string;
  validationType: 'upi_verification' | 'bank_verification' | 'wallet_verification' | 'penny_drop';
  validationStatus: 'pending' | 'in_progress' | 'success' | 'failed' | 'expired';
  validationData: ValidationData;
  attempts: ValidationAttempt[];
  maxAttempts: number;
  expiryDate: Date;
  completedAt?: Date;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ValidationData {
  // For UPI validation
  upiId?: string;
  upiResponse?: UPIValidationResponse;
  
  // For bank account validation
  accountNumber?: string;
  ifscCode?: string;
  pennyDropAmount?: number;
  pennyDropReference?: string;
  bankResponse?: BankValidationResponse;
  
  // For wallet validation
  walletId?: string;
  walletResponse?: WalletValidationResponse;
}

export interface UPIValidationResponse {
  isValid: boolean;
  holderName?: string;
  bankName?: string;
  errorCode?: string;
  errorMessage?: string;
  responseTime: number;
}

export interface BankValidationResponse {
  isValid: boolean;
  accountHolderName?: string;
  bankName?: string;
  branchName?: string;
  accountType?: string;
  pennyDropStatus?: 'success' | 'failed' | 'pending';
  errorCode?: string;
  errorMessage?: string;
  responseTime: number;
}

export interface WalletValidationResponse {
  isValid: boolean;
  holderName?: string;
  walletBalance?: number;
  kycStatus?: string;
  errorCode?: string;
  errorMessage?: string;
  responseTime: number;
}

export interface ValidationAttempt {
  attemptNumber: number;
  attemptDate: Date;
  status: 'success' | 'failed' | 'timeout';
  errorCode?: string;
  errorMessage?: string;
  responseTime: number;
  metadata: Record<string, any>;
}

export interface CashbackAnalytics {
  id: string;
  userId?: string;
  storeId?: string;
  category?: string;
  analyticsType: 'user_summary' | 'store_summary' | 'category_summary' | 'overall_summary';
  dateRange: DateRange;
  metrics: CashbackMetrics;
  trends: CashbackTrends;
  comparisons: CashbackComparison[];
  calculatedAt: Date;
  metadata: Record<string, any>;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
  preset?: 'today' | 'yesterday' | 'last_7_days' | 'last_30_days' | 'last_90_days' | 'custom';
}

export interface CashbackMetrics {
  totalEarned: number;
  totalWithdrawn: number;
  pendingAmount: number;
  averageEarningPerTransaction: number;
  totalTransactions: number;
  withdrawalCount: number;
  averageWithdrawalAmount: number;
  conversionRate: number; // earnings to withdrawals
  retentionRate: number;
  topEarningCategories: CategoryEarning[];
  topEarningStores: StoreEarning[];
  paymentMethodDistribution: PaymentMethodStats[];
}

export interface CategoryEarning {
  category: string;
  totalEarned: number;
  transactionCount: number;
  averageEarning: number;
  percentage: number;
}

export interface StoreEarning {
  storeId: string;
  storeName: string;
  totalEarned: number;
  transactionCount: number;
  averageEarning: number;
  percentage: number;
}

export interface PaymentMethodStats {
  paymentType: string;
  usageCount: number;
  totalAmount: number;
  averageAmount: number;
  successRate: number;
  percentage: number;
}

export interface CashbackTrends {
  earningsTrend: TrendDataPoint[];
  withdrawalsTrend: TrendDataPoint[];
  balanceTrend: TrendDataPoint[];
  userGrowthTrend: TrendDataPoint[];
  seasonality: SeasonalityData[];
}

export interface TrendDataPoint {
  date: Date;
  value: number;
  change?: number;
  changePercent?: number;
}

export interface SeasonalityData {
  period: 'hour' | 'day_of_week' | 'day_of_month' | 'month';
  value: string | number;
  averageMetric: number;
  indexValue: number; // 100 = average, >100 = above average
}

export interface CashbackComparison {
  comparisonType: 'previous_period' | 'same_period_last_year' | 'benchmark';
  currentValue: number;
  comparisonValue: number;
  change: number;
  changePercent: number;
  significance: 'positive' | 'negative' | 'neutral';
}

export interface TaxCalculation {
  id: string;
  userId: string;
  financialYear: string;
  totalEarnings: number;
  taxableAmount: number;
  tdsDeducted: number;
  tdsRate: number;
  exemptAmount: number;
  exemptionReason?: string;
  taxLiability: number;
  form16Generated: boolean;
  form16Url?: string;
  calculatedAt: Date;
  metadata: Record<string, any>;
}

export interface CashbackNotification {
  id: string;
  userId: string;
  notificationType: 'earning_credited' | 'withdrawal_processed' | 'payment_failed' | 'kyc_required' | 'tax_document_ready';
  title: string;
  message: string;
  amount?: number;
  currency?: string;
  actionRequired: boolean;
  actionUrl?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  channels: ('telegram' | 'email' | 'sms' | 'push')[];
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  sentAt?: Date;
  readAt?: Date;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CashbackDispute {
  id: string;
  userId: string;
  disputeType: 'missing_cashback' | 'incorrect_amount' | 'withdrawal_failed' | 'unauthorized_transaction';
  relatedTransactionId?: string;
  relatedWithdrawalId?: string;
  description: string;
  expectedAmount?: number;
  actualAmount?: number;
  evidence: DisputeEvidence[];
  status: 'submitted' | 'under_review' | 'resolved' | 'rejected' | 'escalated';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  resolution?: DisputeResolution;
  submittedAt: Date;
  resolvedAt?: Date;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface DisputeEvidence {
  evidenceType: 'screenshot' | 'receipt' | 'email' | 'transaction_proof' | 'other';
  description: string;
  fileUrl?: string;
  submittedAt: Date;
}

export interface DisputeResolution {
  resolutionType: 'cashback_credited' | 'amount_adjusted' | 'withdrawal_reprocessed' | 'no_action_required';
  resolutionAmount?: number;
  resolutionNotes: string;
  compensationOffered?: string;
  resolvedBy: string;
  resolvedAt: Date;
  customerSatisfaction?: number; // 1-5 rating
}

export interface CashbackPromotion {
  id: string;
  name: string;
  description: string;
  promotionType: 'bonus_cashback' | 'double_cashback' | 'category_boost' | 'store_specific' | 'referral_bonus';
  bonusMultiplier: number;
  maxBonusAmount?: number;
  conditions: PromotionCondition[];
  targetSegments: string[];
  validFrom: Date;
  validTo: Date;
  budget: number;
  spentAmount: number;
  participantCount: number;
  isActive: boolean;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface PromotionCondition {
  conditionType: 'minimum_order_value' | 'specific_category' | 'specific_store' | 'first_time_user' | 'user_tier';
  value: any;
  description: string;
}
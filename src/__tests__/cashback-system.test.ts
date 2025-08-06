import { CashbackService } from '../services/cashback/CashbackService';
import { 
  PaymentMethodType, 
  TransactionStatus, 
  WithdrawalStatus,
  CashbackTransactionType 
} from '../models/CashbackSystem';

describe('CashbackService', () => {
  let cashbackService: CashbackService;
  const testUserId = 'test_user_123';

  beforeEach(() => {
    cashbackService = new CashbackService();
  });

  describe('Payment Method Management', () => {
    test('should add UPI payment method', async () => {
      const paymentMethodData = {
        type: PaymentMethodType.UPI,
        details: {
          upiId: 'user@paytm',
          holderName: 'Test User'
        }
      };

      const paymentMethod = await cashbackService.addPaymentMethod(testUserId, paymentMethodData);

      expect(paymentMethod).toBeDefined();
      expect(paymentMethod.userId).toBe(testUserId);
      expect(paymentMethod.type).toBe(PaymentMethodType.UPI);
      expect(paymentMethod.details.upiId).toBe('user@paytm');
      expect(paymentMethod.isActive).toBe(true);
      expect(paymentMethod.isVerified).toBe(false);
    });

    test('should add PayTM payment method', async () => {
      const paymentMethodData = {
        type: PaymentMethodType.PAYTM,
        details: {
          phoneNumber: '9876543210',
          holderName: 'Test User'
        }
      };

      const paymentMethod = await cashbackService.addPaymentMethod(testUserId, paymentMethodData);

      expect(paymentMethod).toBeDefined();
      expect(paymentMethod.type).toBe(PaymentMethodType.PAYTM);
      expect(paymentMethod.details.phoneNumber).toBe('9876543210');
    });

    test('should add bank account payment method', async () => {
      const paymentMethodData = {
        type: PaymentMethodType.BANK_ACCOUNT,
        details: {
          accountNumber: '1234567890',
          ifscCode: 'HDFC0001234',
          accountHolderName: 'Test User',
          bankName: 'HDFC Bank'
        }
      };

      const paymentMethod = await cashbackService.addPaymentMethod(testUserId, paymentMethodData);

      expect(paymentMethod).toBeDefined();
      expect(paymentMethod.type).toBe(PaymentMethodType.BANK_ACCOUNT);
      expect(paymentMethod.details.accountNumber).toBe('1234567890');
      expect(paymentMethod.details.ifscCode).toBe('HDFC0001234');
    });

    test('should validate UPI ID format', async () => {
      const validationResult = await cashbackService.validatePaymentMethod({
        type: PaymentMethodType.UPI,
        details: { upiId: 'invalid-upi' }
      });

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors).toContain('Invalid UPI ID format');
    });

    test('should validate phone number format', async () => {
      const validationResult = await cashbackService.validatePaymentMethod({
        type: PaymentMethodType.PAYTM,
        details: { phoneNumber: '123456' }
      });

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors).toContain('Invalid PayTM phone number');
    });

    test('should validate IFSC code format', async () => {
      const validationResult = await cashbackService.validatePaymentMethod({
        type: PaymentMethodType.BANK_ACCOUNT,
        details: { 
          accountNumber: '1234567890',
          ifscCode: 'INVALID'
        }
      });

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors).toContain('Invalid IFSC code format');
    });
  });

  describe('Cashback Account Management', () => {
    test('should create cashback account for new user', async () => {
      const account = await cashbackService.getCashbackAccount(testUserId);

      expect(account).toBeDefined();
      expect(account.userId).toBe(testUserId);
      expect(account.balance).toBe(0);
      expect(account.pendingBalance).toBe(0);
      expect(account.totalEarned).toBe(0);
      expect(account.totalWithdrawn).toBe(0);
      expect(account.currency).toBe('INR');
      expect(account.isActive).toBe(true);
    });

    test('should return existing cashback account', async () => {
      // First call creates the account
      const account1 = await cashbackService.getCashbackAccount(testUserId);
      
      // Second call should return the same account
      const account2 = await cashbackService.getCashbackAccount(testUserId);

      expect(account1.id).toBe(account2.id);
      expect(account1.userId).toBe(account2.userId);
    });
  });

  describe('Cashback Processing', () => {
    test('should process cashback for transaction', async () => {
      const transactionAmount = 1000;
      const transactionId = 'txn_123';

      const cashbackTransaction = await cashbackService.processCashback(
        testUserId, 
        transactionAmount, 
        transactionId,
        { category: 'electronics', store: 'flipkart' }
      );

      expect(cashbackTransaction).toBeDefined();
      expect(cashbackTransaction.userId).toBe(testUserId);
      expect(cashbackTransaction.type).toBe(CashbackTransactionType.EARNED);
      expect(cashbackTransaction.originalAmount).toBe(transactionAmount);
      expect(cashbackTransaction.amount).toBeGreaterThan(0);
      expect(cashbackTransaction.status).toBe(TransactionStatus.PENDING);
      expect(cashbackTransaction.transactionId).toBe(transactionId);
    });

    test('should confirm pending cashback', async () => {
      // First process cashback
      const cashbackTransaction = await cashbackService.processCashback(
        testUserId, 
        1000, 
        'txn_123'
      );

      // Then confirm it
      await cashbackService.confirmCashback(cashbackTransaction.id);

      // Check account balance updated
      const account = await cashbackService.getCashbackAccount(testUserId);
      expect(account.balance).toBeGreaterThan(0);
      expect(account.totalEarned).toBeGreaterThan(0);
    });

    test('should calculate cashback based on rules', async () => {
      const electronicsTransaction = await cashbackService.processCashback(
        testUserId, 
        1000, 
        'txn_electronics',
        { category: 'electronics' }
      );

      const fashionTransaction = await cashbackService.processCashback(
        testUserId, 
        1000, 
        'txn_fashion',
        { category: 'fashion' }
      );

      // Electronics should have higher cashback rate than default
      expect(electronicsTransaction.amount).toBeGreaterThan(20); // 3.5% of 1000
      expect(fashionTransaction.amount).toBeGreaterThan(30); // 4% of 1000
    });
  });

  describe('Withdrawal Processing', () => {
    beforeEach(async () => {
      // Setup: Add payment method and cashback balance
      const paymentMethod = await cashbackService.addPaymentMethod(testUserId, {
        type: PaymentMethodType.UPI,
        details: { upiId: 'user@paytm', holderName: 'Test User' }
      });

      // Process and confirm cashback to have balance
      const cashbackTransaction = await cashbackService.processCashback(testUserId, 5000, 'setup_txn');
      await cashbackService.confirmCashback(cashbackTransaction.id);
    });

    test('should request withdrawal', async () => {
      const account = await cashbackService.getCashbackAccount(testUserId);
      const paymentMethods = await cashbackService.repository.getPaymentMethodsByUserId(testUserId);
      
      // Mock payment method as verified
      await cashbackService.repository.updatePaymentMethod(paymentMethods[0].id, { isVerified: true });

      const withdrawalAmount = 200;
      const withdrawal = await cashbackService.requestWithdrawal(
        testUserId, 
        withdrawalAmount, 
        paymentMethods[0].id
      );

      expect(withdrawal).toBeDefined();
      expect(withdrawal.userId).toBe(testUserId);
      expect(withdrawal.amount).toBe(withdrawalAmount);
      expect(withdrawal.status).toBe(WithdrawalStatus.PENDING);
      expect(withdrawal.paymentMethodId).toBe(paymentMethods[0].id);
    });

    test('should reject withdrawal for insufficient balance', async () => {
      const paymentMethods = await cashbackService.repository.getPaymentMethodsByUserId(testUserId);
      await cashbackService.repository.updatePaymentMethod(paymentMethods[0].id, { isVerified: true });

      await expect(
        cashbackService.requestWithdrawal(testUserId, 10000, paymentMethods[0].id)
      ).rejects.toThrow('Insufficient balance');
    });

    test('should reject withdrawal below minimum amount', async () => {
      const paymentMethods = await cashbackService.repository.getPaymentMethodsByUserId(testUserId);
      await cashbackService.repository.updatePaymentMethod(paymentMethods[0].id, { isVerified: true });

      await expect(
        cashbackService.requestWithdrawal(testUserId, 50, paymentMethods[0].id)
      ).rejects.toThrow('Minimum withdrawal amount is ₹100');
    });

    test('should reject withdrawal for unverified payment method', async () => {
      const paymentMethods = await cashbackService.repository.getPaymentMethodsByUserId(testUserId);

      await expect(
        cashbackService.requestWithdrawal(testUserId, 200, paymentMethods[0].id)
      ).rejects.toThrow('Payment method is not verified or inactive');
    });

    test('should process withdrawal successfully', async () => {
      const paymentMethods = await cashbackService.repository.getPaymentMethodsByUserId(testUserId);
      await cashbackService.repository.updatePaymentMethod(paymentMethods[0].id, { isVerified: true });

      const withdrawal = await cashbackService.requestWithdrawal(testUserId, 200, paymentMethods[0].id);
      
      await cashbackService.processWithdrawal(withdrawal.id);

      const updatedWithdrawal = await cashbackService.repository.getWithdrawalRequest(withdrawal.id);
      expect(updatedWithdrawal.status).toBe(WithdrawalStatus.COMPLETED);
      expect(updatedWithdrawal.processedAt).toBeDefined();
    });
  });

  describe('Referral Program', () => {
    test('should process referral cashback', async () => {
      const referrerId = 'referrer_123';
      const refereeId = 'referee_456';
      const transactionAmount = 1000;

      await cashbackService.processReferralCashback(referrerId, refereeId, transactionAmount);

      // Check referrer got reward
      const referrerAccount = await cashbackService.getCashbackAccount(referrerId);
      expect(referrerAccount.pendingBalance).toBeGreaterThan(0);

      // Check referee got bonus
      const refereeAccount = await cashbackService.getCashbackAccount(refereeId);
      expect(refereeAccount.pendingBalance).toBeGreaterThan(0);
    });

    test('should not process referral for small transactions', async () => {
      const referrerId = 'referrer_123';
      const refereeId = 'referee_456';
      const smallTransactionAmount = 100; // Below minimum

      await cashbackService.processReferralCashback(referrerId, refereeId, smallTransactionAmount);

      const referrerAccount = await cashbackService.getCashbackAccount(referrerId);
      expect(referrerAccount.pendingBalance).toBe(0);
    });
  });

  describe('Analytics', () => {
    test('should get cashback analytics', async () => {
      // Setup some transactions
      await cashbackService.processCashback(testUserId, 1000, 'txn_1');
      await cashbackService.processCashback(testUserId, 2000, 'txn_2');

      const analytics = await cashbackService.getCashbackAnalytics();

      expect(analytics).toBeDefined();
      expect(analytics.totalUsers).toBeGreaterThan(0);
      expect(analytics.totalTransactions).toBeGreaterThan(0);
      expect(analytics.totalCashbackEarned).toBeGreaterThan(0);
    });

    test('should get user-specific analytics', async () => {
      await cashbackService.processCashback(testUserId, 1000, 'txn_1');

      const analytics = await cashbackService.getCashbackAnalytics(testUserId);

      expect(analytics).toBeDefined();
      expect(analytics.totalUsers).toBe(1);
    });

    test('should get analytics for date range', async () => {
      const dateRange = {
        from: new Date('2024-01-01'),
        to: new Date('2024-12-31')
      };

      const analytics = await cashbackService.getCashbackAnalytics(undefined, dateRange);

      expect(analytics).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid payment method type', async () => {
      await expect(
        cashbackService.addPaymentMethod(testUserId, {
          type: 'INVALID_TYPE' as PaymentMethodType,
          details: {}
        })
      ).rejects.toThrow();
    });

    test('should handle missing payment method details', async () => {
      await expect(
        cashbackService.addPaymentMethod(testUserId, {
          type: PaymentMethodType.UPI,
          details: {}
        })
      ).rejects.toThrow();
    });

    test('should handle withdrawal for non-existent payment method', async () => {
      await expect(
        cashbackService.requestWithdrawal(testUserId, 200, 'non_existent_id')
      ).rejects.toThrow('Invalid payment method');
    });

    test('should handle processing non-existent withdrawal', async () => {
      await expect(
        cashbackService.processWithdrawal('non_existent_id')
      ).rejects.toThrow('Withdrawal request not found');
    });
  });

  describe('Validation Helpers', () => {
    test('should validate UPI ID formats', () => {
      const service = new CashbackService();
      
      expect(service['isValidUPI']('user@paytm')).toBe(true);
      expect(service['isValidUPI']('test.user@phonepe')).toBe(true);
      expect(service['isValidUPI']('user123@gpay')).toBe(true);
      
      expect(service['isValidUPI']('invalid')).toBe(false);
      expect(service['isValidUPI']('user@')).toBe(false);
      expect(service['isValidUPI']('@paytm')).toBe(false);
    });

    test('should validate phone numbers', () => {
      const service = new CashbackService();
      
      expect(service['isValidPhoneNumber']('9876543210')).toBe(true);
      expect(service['isValidPhoneNumber']('8765432109')).toBe(true);
      expect(service['isValidPhoneNumber']('7654321098')).toBe(true);
      
      expect(service['isValidPhoneNumber']('1234567890')).toBe(false);
      expect(service['isValidPhoneNumber']('98765432')).toBe(false);
      expect(service['isValidPhoneNumber']('98765432100')).toBe(false);
    });

    test('should validate IFSC codes', () => {
      const service = new CashbackService();
      
      expect(service['isValidIFSC']('HDFC0001234')).toBe(true);
      expect(service['isValidIFSC']('ICIC0005678')).toBe(true);
      expect(service['isValidIFSC']('SBIN0009876')).toBe(true);
      
      expect(service['isValidIFSC']('HDFC1234')).toBe(false);
      expect(service['isValidIFSC']('hdfc0001234')).toBe(false);
      expect(service['isValidIFSC']('HDFC00012345')).toBe(false);
    });
  });
});
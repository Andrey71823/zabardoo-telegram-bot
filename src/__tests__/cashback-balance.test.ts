import { CashbackBalanceService } from '../services/cashback/CashbackBalanceService';
import { CashbackBotCommands } from '../services/telegram/CashbackBotCommands';
import { 
  PaymentMethodType, 
  WithdrawalStatus, 
  CashbackTransactionType,
  TransactionStatus 
} from '../models/CashbackSystem';

describe('CashbackBalanceService', () => {
  let balanceService: CashbackBalanceService;
  const testUserId = 'balance_user_123';

  beforeEach(() => {
    balanceService = new CashbackBalanceService();
  });

  describe('Balance Information', () => {
    test('should get balance info for user', async () => {
      const balanceInfo = await balanceService.getBalanceInfo(testUserId);

      expect(balanceInfo).toBeDefined();
      expect(balanceInfo.userId).toBe(testUserId);
      expect(balanceInfo.currency).toBe('INR');
      expect(typeof balanceInfo.availableBalance).toBe('number');
      expect(typeof balanceInfo.pendingBalance).toBe('number');
      expect(typeof balanceInfo.totalEarned).toBe('number');
      expect(typeof balanceInfo.totalWithdrawn).toBe('number');
      expect(balanceInfo.lastUpdated).toBeInstanceOf(Date);
    });

    test('should get comprehensive balance summary', async () => {
      const summary = await balanceService.getBalanceSummary(testUserId);

      expect(summary).toBeDefined();
      expect(summary.balance).toBeDefined();
      expect(Array.isArray(summary.recentTransactions)).toBe(true);
      expect(Array.isArray(summary.pendingWithdrawals)).toBe(true);
      expect(Array.isArray(summary.availablePaymentMethods)).toBe(true);
      expect(summary.withdrawalLimits).toBeDefined();
      expect(summary.withdrawalLimits.minimumAmount).toBeGreaterThan(0);
      expect(summary.withdrawalLimits.maximumAmount).toBeGreaterThan(0);
    });
  });

  describe('Transaction History', () => {
    test('should get transaction history with pagination', async () => {
      const history = await balanceService.getTransactionHistory(testUserId, 1, 10);

      expect(history).toBeDefined();
      expect(Array.isArray(history.transactions)).toBe(true);
      expect(typeof history.totalCount).toBe('number');
      expect(history.currentPage).toBe(1);
      expect(typeof history.totalPages).toBe('number');
      expect(history.summary).toBeDefined();
      expect(typeof history.summary.totalEarned).toBe('number');
      expect(typeof history.summary.totalWithdrawn).toBe('number');
    });

    test('should filter transaction history by type', async () => {
      const filters = {
        type: CashbackTransactionType.EARNED,
        dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        dateTo: new Date()
      };

      const history = await balanceService.getTransactionHistory(testUserId, 1, 10, filters);

      expect(history).toBeDefined();
      expect(Array.isArray(history.transactions)).toBe(true);
    });

    test('should filter transaction history by amount range', async () => {
      const filters = {
        minAmount: 50,
        maxAmount: 500
      };

      const history = await balanceService.getTransactionHistory(testUserId, 1, 10, filters);

      expect(history).toBeDefined();
      expect(Array.isArray(history.transactions)).toBe(true);
    });

    test('should filter transaction history by status', async () => {
      const filters = {
        status: TransactionStatus.COMPLETED
      };

      const history = await balanceService.getTransactionHistory(testUserId, 1, 10, filters);

      expect(history).toBeDefined();
      expect(Array.isArray(history.transactions)).toBe(true);
    });
  });

  describe('Withdrawal History', () => {
    test('should get withdrawal history with pagination', async () => {
      const history = await balanceService.getWithdrawalHistory(testUserId, 1, 10);

      expect(history).toBeDefined();
      expect(Array.isArray(history.withdrawals)).toBe(true);
      expect(typeof history.totalCount).toBe('number');
      expect(history.currentPage).toBe(1);
      expect(typeof history.totalPages).toBe('number');
      expect(history.summary).toBeDefined();
      expect(typeof history.summary.totalRequested).toBe('number');
      expect(typeof history.summary.totalCompleted).toBe('number');
    });

    test('should filter withdrawal history by status', async () => {
      const filters = {
        status: WithdrawalStatus.COMPLETED
      };

      const history = await balanceService.getWithdrawalHistory(testUserId, 1, 10, filters);

      expect(history).toBeDefined();
      expect(Array.isArray(history.withdrawals)).toBe(true);
    });

    test('should filter withdrawal history by date range', async () => {
      const filters = {
        dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        dateTo: new Date()
      };

      const history = await balanceService.getWithdrawalHistory(testUserId, 1, 10, filters);

      expect(history).toBeDefined();
      expect(Array.isArray(history.withdrawals)).toBe(true);
    });
  });

  describe('Withdrawal Management', () => {
    beforeEach(async () => {
      // Setup: Create cashback balance and payment method
      await balanceService.cashbackService.processCashback(testUserId, 5000, 'setup_txn');
      await balanceService.cashbackService.addPaymentMethod(testUserId, {
        type: PaymentMethodType.UPI,
        details: { upiId: 'test@paytm', holderName: 'Test User' }
      });
    });

    test('should request withdrawal with validation', async () => {
      const paymentMethods = await balanceService.cashbackService.repository.getPaymentMethodsByUserId(testUserId);
      
      // Mock payment method as verified
      await balanceService.cashbackService.repository.updatePaymentMethod(paymentMethods[0].id, { 
        isVerified: true 
      });

      const withdrawal = await balanceService.requestWithdrawal(
        testUserId,
        200,
        paymentMethods[0].id,
        { priority: 'normal', notes: 'Test withdrawal' }
      );

      expect(withdrawal).toBeDefined();
      expect(withdrawal.userId).toBe(testUserId);
      expect(withdrawal.amount).toBe(200);
      expect(withdrawal.status).toBe(WithdrawalStatus.PENDING);
    });

    test('should reject withdrawal below minimum amount', async () => {
      const paymentMethods = await balanceService.cashbackService.repository.getPaymentMethodsByUserId(testUserId);
      await balanceService.cashbackService.repository.updatePaymentMethod(paymentMethods[0].id, { 
        isVerified: true 
      });

      await expect(
        balanceService.requestWithdrawal(testUserId, 50, paymentMethods[0].id)
      ).rejects.toThrow('Minimum withdrawal amount');
    });

    test('should reject withdrawal above maximum amount', async () => {
      const paymentMethods = await balanceService.cashbackService.repository.getPaymentMethodsByUserId(testUserId);
      await balanceService.cashbackService.repository.updatePaymentMethod(paymentMethods[0].id, { 
        isVerified: true 
      });

      await expect(
        balanceService.requestWithdrawal(testUserId, 100000, paymentMethods[0].id)
      ).rejects.toThrow('Maximum withdrawal amount');
    });

    test('should cancel pending withdrawal', async () => {
      const paymentMethods = await balanceService.cashbackService.repository.getPaymentMethodsByUserId(testUserId);
      await balanceService.cashbackService.repository.updatePaymentMethod(paymentMethods[0].id, { 
        isVerified: true 
      });

      const withdrawal = await balanceService.requestWithdrawal(testUserId, 200, paymentMethods[0].id);
      
      await balanceService.cancelWithdrawal(testUserId, withdrawal.id, 'Test cancellation');

      const updatedWithdrawal = await balanceService.cashbackService.repository.getWithdrawalRequest(withdrawal.id);
      expect(updatedWithdrawal.status).toBe(WithdrawalStatus.CANCELLED);
    });

    test('should get withdrawal status with timeline', async () => {
      const paymentMethods = await balanceService.cashbackService.repository.getPaymentMethodsByUserId(testUserId);
      await balanceService.cashbackService.repository.updatePaymentMethod(paymentMethods[0].id, { 
        isVerified: true 
      });

      const withdrawal = await balanceService.requestWithdrawal(testUserId, 200, paymentMethods[0].id);
      
      const status = await balanceService.getWithdrawalStatus(testUserId, withdrawal.id);

      expect(status).toBeDefined();
      expect(status.withdrawal).toBeDefined();
      expect(status.paymentMethod).toBeDefined();
      expect(Array.isArray(status.timeline)).toBe(true);
      expect(status.timeline.length).toBeGreaterThan(0);
    });

    test('should reject unauthorized withdrawal cancellation', async () => {
      const paymentMethods = await balanceService.cashbackService.repository.getPaymentMethodsByUserId(testUserId);
      await balanceService.cashbackService.repository.updatePaymentMethod(paymentMethods[0].id, { 
        isVerified: true 
      });

      const withdrawal = await balanceService.requestWithdrawal(testUserId, 200, paymentMethods[0].id);
      
      await expect(
        balanceService.cancelWithdrawal('different_user', withdrawal.id)
      ).rejects.toThrow('Unauthorized');
    });
  });

  describe('Balance Analytics', () => {
    test('should get balance analytics for different periods', async () => {
      const periods = ['week', 'month', 'quarter', 'year'] as const;

      for (const period of periods) {
        const analytics = await balanceService.getBalanceAnalytics(testUserId, period);

        expect(analytics).toBeDefined();
        expect(analytics.periodSummary).toBeDefined();
        expect(typeof analytics.periodSummary.totalEarned).toBe('number');
        expect(typeof analytics.periodSummary.totalWithdrawn).toBe('number');
        expect(typeof analytics.periodSummary.netGain).toBe('number');
        expect(Array.isArray(analytics.trends)).toBe(true);
        expect(Array.isArray(analytics.topCategories)).toBe(true);
        expect(Array.isArray(analytics.topStores)).toBe(true);
      }
    });

    test('should calculate period summary correctly', async () => {
      const analytics = await balanceService.getBalanceAnalytics(testUserId, 'month');

      expect(analytics.periodSummary.netGain).toBe(
        analytics.periodSummary.totalEarned - analytics.periodSummary.totalWithdrawn
      );

      if (analytics.periodSummary.transactionCount > 0) {
        expect(analytics.periodSummary.averageTransaction).toBeGreaterThan(0);
      }
    });
  });

  describe('Export Functionality', () => {
    test('should export transaction history as CSV', async () => {
      const exportData = await balanceService.exportTransactionHistory(testUserId, 'csv');

      expect(exportData).toBeDefined();
      expect(exportData.filename).toContain('.csv');
      expect(exportData.mimeType).toBe('text/csv');
      expect(exportData.data).toBeInstanceOf(Buffer);
    });

    test('should export transaction history as Excel', async () => {
      const exportData = await balanceService.exportTransactionHistory(testUserId, 'excel');

      expect(exportData).toBeDefined();
      expect(exportData.filename).toContain('.xlsx');
      expect(exportData.mimeType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(exportData.data).toBeInstanceOf(Buffer);
    });

    test('should export transaction history as PDF', async () => {
      const exportData = await balanceService.exportTransactionHistory(testUserId, 'pdf');

      expect(exportData).toBeDefined();
      expect(exportData.filename).toContain('.pdf');
      expect(exportData.mimeType).toBe('application/pdf');
      expect(exportData.data).toBeInstanceOf(Buffer);
    });

    test('should export with date filters', async () => {
      const filters = {
        dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        dateTo: new Date(),
        type: CashbackTransactionType.EARNED
      };

      const exportData = await balanceService.exportTransactionHistory(testUserId, 'csv', filters);

      expect(exportData).toBeDefined();
      expect(exportData.filename).toContain('.csv');
    });

    test('should reject unsupported export format', async () => {
      await expect(
        balanceService.exportTransactionHistory(testUserId, 'xml' as any)
      ).rejects.toThrow('Unsupported export format');
    });
  });

  describe('Error Handling', () => {
    test('should handle non-existent user gracefully', async () => {
      const nonExistentUserId = 'non_existent_user';

      const balanceInfo = await balanceService.getBalanceInfo(nonExistentUserId);
      expect(balanceInfo).toBeDefined();
      expect(balanceInfo.availableBalance).toBe(0);
    });

    test('should handle withdrawal for non-existent withdrawal ID', async () => {
      await expect(
        balanceService.getWithdrawalStatus(testUserId, 'non_existent_id')
      ).rejects.toThrow('Withdrawal request not found');
    });

    test('should handle cancellation of non-pending withdrawal', async () => {
      // This would require setting up a completed withdrawal first
      // For now, we'll test the error path
      await expect(
        balanceService.cancelWithdrawal(testUserId, 'non_existent_id')
      ).rejects.toThrow();
    });
  });
});

describe('CashbackBotCommands', () => {
  let botCommands: CashbackBotCommands;
  const testUserId = 'bot_user_123';
  const testChatId = 'chat_123';

  beforeEach(() => {
    botCommands = new CashbackBotCommands();
  });

  describe('Balance Command', () => {
    test('should handle balance command', async () => {
      const mockMessage = {
        chat: { id: testChatId, type: 'private' },
        from: { id: testUserId, username: 'testuser', first_name: 'Test' },
        text: '/balance',
        message_id: 123
      };

      // Mock the telegram service to avoid actual API calls
      jest.spyOn(botCommands['telegramService'], 'sendMessage').mockResolvedValue(undefined);

      await botCommands.handleBalanceCommand(mockMessage);

      expect(botCommands['telegramService'].sendMessage).toHaveBeenCalledWith(
        testChatId,
        expect.stringContaining('Your Cashback Balance'),
        expect.objectContaining({
          parse_mode: 'Markdown',
          reply_markup: expect.any(Object)
        })
      );
    });

    test('should handle balance command error gracefully', async () => {
      const mockMessage = {
        chat: { id: testChatId, type: 'private' },
        from: { id: 'invalid_user', username: 'testuser', first_name: 'Test' },
        text: '/balance',
        message_id: 123
      };

      // Mock service to throw error
      jest.spyOn(botCommands['balanceService'], 'getBalanceSummary').mockRejectedValue(new Error('Service error'));
      jest.spyOn(botCommands['telegramService'], 'sendMessage').mockResolvedValue(undefined);

      await botCommands.handleBalanceCommand(mockMessage);

      expect(botCommands['telegramService'].sendMessage).toHaveBeenCalledWith(
        testChatId,
        expect.stringContaining('Sorry, I couldn\'t retrieve your balance information')
      );
    });
  });

  describe('Withdraw Command', () => {
    test('should handle withdraw command with verified payment methods', async () => {
      const mockMessage = {
        chat: { id: testChatId, type: 'private' },
        from: { id: testUserId, username: 'testuser', first_name: 'Test' },
        text: '/withdraw',
        message_id: 123
      };

      // Mock payment methods
      jest.spyOn(botCommands['cashbackService'].repository, 'getPaymentMethodsByUserId').mockResolvedValue([
        {
          id: 'pm_1',
          userId: testUserId,
          type: PaymentMethodType.UPI,
          details: { upiId: 'test@paytm' },
          isVerified: true,
          isActive: true
        } as any
      ]);

      jest.spyOn(botCommands['balanceService'], 'getBalanceInfo').mockResolvedValue({
        userId: testUserId,
        availableBalance: 500,
        pendingBalance: 0,
        totalEarned: 500,
        totalWithdrawn: 0,
        currency: 'INR',
        lastUpdated: new Date()
      });

      jest.spyOn(botCommands['telegramService'], 'sendMessage').mockResolvedValue(undefined);

      await botCommands.handleWithdrawCommand(mockMessage);

      expect(botCommands['telegramService'].sendMessage).toHaveBeenCalledWith(
        testChatId,
        expect.stringContaining('Withdraw Cashback'),
        expect.objectContaining({
          parse_mode: 'Markdown',
          reply_markup: expect.any(Object)
        })
      );
    });

    test('should handle withdraw command without payment methods', async () => {
      const mockMessage = {
        chat: { id: testChatId, type: 'private' },
        from: { id: testUserId, username: 'testuser', first_name: 'Test' },
        text: '/withdraw',
        message_id: 123
      };

      // Mock no payment methods
      jest.spyOn(botCommands['cashbackService'].repository, 'getPaymentMethodsByUserId').mockResolvedValue([]);
      jest.spyOn(botCommands['telegramService'], 'sendMessage').mockResolvedValue(undefined);

      await botCommands.handleWithdrawCommand(mockMessage);

      expect(botCommands['telegramService'].sendMessage).toHaveBeenCalledWith(
        testChatId,
        expect.stringContaining('You need to add and verify a payment method'),
        expect.objectContaining({
          reply_markup: expect.objectContaining({
            inline_keyboard: expect.arrayContaining([
              expect.arrayContaining([
                expect.objectContaining({
                  text: '➕ Add Payment Method',
                  callback_data: 'add_payment_method'
                })
              ])
            ])
          })
        })
      );
    });
  });

  describe('History Command', () => {
    test('should handle history command', async () => {
      const mockMessage = {
        chat: { id: testChatId, type: 'private' },
        from: { id: testUserId, username: 'testuser', first_name: 'Test' },
        text: '/history',
        message_id: 123
      };

      jest.spyOn(botCommands['balanceService'], 'getTransactionHistory').mockResolvedValue({
        transactions: [
          {
            id: 'txn_1',
            type: CashbackTransactionType.EARNED,
            amount: 50,
            createdAt: new Date(),
            metadata: { store: 'Flipkart' }
          } as any
        ],
        totalCount: 1,
        currentPage: 1,
        totalPages: 1,
        summary: {
          totalEarned: 50,
          totalWithdrawn: 0,
          pendingAmount: 0,
          completedTransactions: 1
        }
      });

      jest.spyOn(botCommands['telegramService'], 'sendMessage').mockResolvedValue(undefined);

      await botCommands.handleHistoryCommand(mockMessage);

      expect(botCommands['telegramService'].sendMessage).toHaveBeenCalledWith(
        testChatId,
        expect.stringContaining('Transaction History'),
        expect.objectContaining({
          parse_mode: 'Markdown',
          reply_markup: expect.any(Object)
        })
      );
    });
  });

  describe('Callback Query Handling', () => {
    test('should handle refresh balance callback', async () => {
      const mockCallbackQuery = {
        id: 'callback_123',
        from: { id: testUserId, username: 'testuser' },
        message: {
          chat: { id: testChatId },
          message_id: 456
        },
        data: 'refresh_balance'
      };

      jest.spyOn(botCommands['balanceService'], 'getBalanceSummary').mockResolvedValue({
        balance: {
          userId: testUserId,
          availableBalance: 500,
          pendingBalance: 0,
          totalEarned: 500,
          totalWithdrawn: 0,
          currency: 'INR',
          lastUpdated: new Date()
        },
        recentTransactions: [],
        pendingWithdrawals: [],
        availablePaymentMethods: [],
        withdrawalLimits: {
          minimumAmount: 100,
          maximumAmount: 50000,
          dailyLimit: 25000,
          monthlyLimit: 100000,
          remainingDailyLimit: 25000,
          remainingMonthlyLimit: 100000
        }
      });

      jest.spyOn(botCommands['telegramService'], 'editMessage').mockResolvedValue(undefined);
      jest.spyOn(botCommands['telegramService'], 'answerCallbackQuery').mockResolvedValue(undefined);

      await botCommands.handleCallbackQuery(mockCallbackQuery);

      expect(botCommands['telegramService'].editMessage).toHaveBeenCalledWith(
        testChatId,
        456,
        expect.stringContaining('Your Cashback Balance'),
        expect.objectContaining({
          parse_mode: 'Markdown',
          reply_markup: expect.any(Object)
        })
      );

      expect(botCommands['telegramService'].answerCallbackQuery).toHaveBeenCalledWith('callback_123');
    });

    test('should handle quick withdraw callback', async () => {
      const mockCallbackQuery = {
        id: 'callback_123',
        from: { id: testUserId, username: 'testuser' },
        message: {
          chat: { id: testChatId },
          message_id: 456
        },
        data: 'quick_withdraw_500'
      };

      // Mock payment methods
      jest.spyOn(botCommands['cashbackService'].repository, 'getPaymentMethodsByUserId').mockResolvedValue([
        {
          id: 'pm_1',
          userId: testUserId,
          type: PaymentMethodType.UPI,
          details: { upiId: 'test@paytm' },
          isVerified: true,
          isActive: true
        } as any
      ]);

      jest.spyOn(botCommands['balanceService'], 'requestWithdrawal').mockResolvedValue({
        id: 'withdrawal_123',
        amount: 500,
        status: WithdrawalStatus.PENDING
      } as any);

      jest.spyOn(botCommands['telegramService'], 'sendMessage').mockResolvedValue(undefined);
      jest.spyOn(botCommands['telegramService'], 'answerCallbackQuery').mockResolvedValue(undefined);

      await botCommands.handleCallbackQuery(mockCallbackQuery);

      expect(botCommands['telegramService'].sendMessage).toHaveBeenCalledWith(
        testChatId,
        expect.stringContaining('Withdrawal request submitted'),
        expect.objectContaining({
          parse_mode: 'Markdown'
        })
      );
    });

    test('should handle unknown callback query', async () => {
      const mockCallbackQuery = {
        id: 'callback_123',
        from: { id: testUserId, username: 'testuser' },
        message: {
          chat: { id: testChatId },
          message_id: 456
        },
        data: 'unknown_callback'
      };

      jest.spyOn(botCommands['telegramService'], 'answerCallbackQuery').mockResolvedValue(undefined);

      await botCommands.handleCallbackQuery(mockCallbackQuery);

      expect(botCommands['telegramService'].answerCallbackQuery).toHaveBeenCalledWith('callback_123');
    });
  });

  describe('Message Formatting', () => {
    test('should format balance message correctly', async () => {
      const mockSummary = {
        balance: {
          userId: testUserId,
          availableBalance: 1250.50,
          pendingBalance: 150.25,
          totalEarned: 2000.75,
          totalWithdrawn: 600.00,
          currency: 'INR',
          lastUpdated: new Date()
        },
        recentTransactions: [
          {
            id: 'txn_1',
            type: CashbackTransactionType.EARNED,
            amount: 50.25,
            metadata: { store: 'Flipkart' }
          } as any
        ],
        pendingWithdrawals: [
          {
            id: 'wd_1',
            amount: 200,
            status: WithdrawalStatus.PENDING
          } as any
        ],
        availablePaymentMethods: [],
        withdrawalLimits: {
          minimumAmount: 100,
          maximumAmount: 50000,
          dailyLimit: 25000,
          monthlyLimit: 100000,
          remainingDailyLimit: 25000,
          remainingMonthlyLimit: 100000
        }
      };

      const message = botCommands['formatBalanceMessage'](mockSummary);

      expect(message).toContain('Your Cashback Balance');
      expect(message).toContain('₹1250.50');
      expect(message).toContain('₹150.25');
      expect(message).toContain('₹2000.75');
      expect(message).toContain('₹600.00');
      expect(message).toContain('Pending Withdrawals');
      expect(message).toContain('Recent Transactions');
      expect(message).toContain('Flipkart');
    });

    test('should format withdrawal status message correctly', async () => {
      const mockWithdrawalStatus = {
        withdrawal: {
          id: 'wd_123',
          amount: 500,
          status: WithdrawalStatus.PROCESSING
        },
        paymentMethod: {
          type: PaymentMethodType.UPI,
          details: { upiId: 'test@paytm' }
        },
        timeline: [
          {
            status: 'requested',
            timestamp: new Date(),
            description: 'Withdrawal request submitted'
          },
          {
            status: 'processing',
            timestamp: new Date(),
            description: 'Withdrawal is being processed'
          }
        ]
      };

      const message = botCommands['formatWithdrawalStatusMessage'](mockWithdrawalStatus);

      expect(message).toContain('Withdrawal Status');
      expect(message).toContain('wd_123');
      expect(message).toContain('₹500');
      expect(message).toContain('UPI (test@paytm)');
      expect(message).toContain('PROCESSING');
      expect(message).toContain('Timeline');
      expect(message).toContain('Withdrawal request submitted');
    });
  });
});
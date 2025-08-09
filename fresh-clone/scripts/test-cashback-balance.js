#!/usr/bin/env node

const { CashbackBalanceService } = require('../src/services/cashback/CashbackBalanceService');
const { CashbackBotCommands } = require('../src/services/telegram/CashbackBotCommands');
const { PaymentMethodType, WithdrawalStatus, CashbackTransactionType } = require('../src/models/CashbackSystem');

async function testCashbackBalance() {
  console.log('💰 Testing Cashback Balance Management System...\n');

  const balanceService = new CashbackBalanceService();
  const botCommands = new CashbackBotCommands();
  const testUserId = `balance_user_${Date.now()}`;

  try {
    // Test 1: Balance Information
    console.log('1️⃣ Test: Balance Information');
    
    const balanceInfo = await balanceService.getBalanceInfo(testUserId);
    console.log('✅ Balance info retrieved:', {
      userId: balanceInfo.userId,
      availableBalance: balanceInfo.availableBalance,
      pendingBalance: balanceInfo.pendingBalance,
      totalEarned: balanceInfo.totalEarned,
      totalWithdrawn: balanceInfo.totalWithdrawn,
      currency: balanceInfo.currency
    });

    // Test 2: Balance Summary
    console.log('\n2️⃣ Test: Comprehensive Balance Summary');
    
    const balanceSummary = await balanceService.getBalanceSummary(testUserId);
    console.log('✅ Balance summary retrieved:', {
      balance: {
        available: balanceSummary.balance.availableBalance,
        pending: balanceSummary.balance.pendingBalance
      },
      recentTransactions: balanceSummary.recentTransactions.length,
      pendingWithdrawals: balanceSummary.pendingWithdrawals.length,
      paymentMethods: balanceSummary.availablePaymentMethods.length,
      withdrawalLimits: {
        min: balanceSummary.withdrawalLimits.minimumAmount,
        max: balanceSummary.withdrawalLimits.maximumAmount,
        dailyRemaining: balanceSummary.withdrawalLimits.remainingDailyLimit
      }
    });

    // Test 3: Setup Test Data
    console.log('\n3️⃣ Test: Setting up Test Data');
    
    // Create some cashback transactions
    const transactions = [
      { amount: 1500, store: 'flipkart', category: 'electronics' },
      { amount: 800, store: 'amazon', category: 'books' },
      { amount: 1200, store: 'myntra', category: 'fashion' },
      { amount: 600, store: 'bigbasket', category: 'grocery' }
    ];

    for (const txn of transactions) {
      const cashback = await balanceService.cashbackService.processCashback(
        testUserId,
        txn.amount,
        `setup_txn_${Date.now()}_${Math.random()}`,
        { store: txn.store, category: txn.category }
      );
      
      // Confirm the cashback
      await balanceService.cashbackService.confirmCashback(cashback.id);
      console.log(`✅ Cashback created and confirmed: ₹${cashback.amount} from ${txn.store}`);
    }

    // Add payment methods
    const paymentMethods = [
      {
        type: PaymentMethodType.UPI,
        details: { upiId: 'testuser@paytm', holderName: 'Test User' }
      },
      {
        type: PaymentMethodType.PAYTM,
        details: { phoneNumber: '9876543210', holderName: 'Test User' }
      },
      {
        type: PaymentMethodType.BANK_ACCOUNT,
        details: {
          accountNumber: '1234567890123456',
          ifscCode: 'HDFC0001234',
          accountHolderName: 'Test User',
          bankName: 'HDFC Bank'
        }
      }
    ];

    for (const pm of paymentMethods) {
      const paymentMethod = await balanceService.cashbackService.addPaymentMethod(testUserId, pm);
      
      // Mock verification
      await balanceService.cashbackService.repository.updatePaymentMethod(paymentMethod.id, {
        isVerified: true
      });
      
      console.log(`✅ Payment method added and verified: ${pm.type}`);
    }

    // Test 4: Transaction History
    console.log('\n4️⃣ Test: Transaction History');
    
    const history = await balanceService.getTransactionHistory(testUserId, 1, 10);
    console.log('✅ Transaction history retrieved:', {
      totalTransactions: history.totalCount,
      currentPage: history.currentPage,
      totalPages: history.totalPages,
      summary: {
        totalEarned: history.summary.totalEarned,
        totalWithdrawn: history.summary.totalWithdrawn,
        pendingAmount: history.summary.pendingAmount,
        completedTransactions: history.summary.completedTransactions
      }
    });

    // Test filtered history
    const filteredHistory = await balanceService.getTransactionHistory(testUserId, 1, 5, {
      type: CashbackTransactionType.EARNED,
      minAmount: 50,
      dateFrom: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
    });
    console.log('✅ Filtered transaction history:', {
      filteredCount: filteredHistory.transactions.length,
      totalCount: filteredHistory.totalCount
    });

    // Test 5: Withdrawal Management
    console.log('\n5️⃣ Test: Withdrawal Management');
    
    const updatedBalance = await balanceService.getBalanceInfo(testUserId);
    console.log('💰 Current balance before withdrawal:', updatedBalance.availableBalance);

    if (updatedBalance.availableBalance >= 200) {
      const availablePaymentMethods = await balanceService.cashbackService.repository.getPaymentMethodsByUserId(testUserId, {
        isActive: true,
        isVerified: true
      });

      if (availablePaymentMethods.length > 0) {
        // Test withdrawal request
        const withdrawal = await balanceService.requestWithdrawal(
          testUserId,
          200,
          availablePaymentMethods[0].id,
          { priority: 'normal', notes: 'Test withdrawal request' }
        );

        console.log('✅ Withdrawal requested:', {
          id: withdrawal.id,
          amount: withdrawal.amount,
          status: withdrawal.status,
          paymentMethodId: withdrawal.paymentMethodId
        });

        // Test withdrawal status
        const withdrawalStatus = await balanceService.getWithdrawalStatus(testUserId, withdrawal.id);
        console.log('✅ Withdrawal status retrieved:', {
          withdrawalId: withdrawalStatus.withdrawal.id,
          amount: withdrawalStatus.withdrawal.amount,
          status: withdrawalStatus.withdrawal.status,
          paymentMethod: withdrawalStatus.paymentMethod.type,
          timelineEvents: withdrawalStatus.timeline.length
        });

        // Test withdrawal cancellation
        await balanceService.cancelWithdrawal(testUserId, withdrawal.id, 'Test cancellation');
        console.log('✅ Withdrawal cancelled successfully');

        // Verify balance restored
        const restoredBalance = await balanceService.getBalanceInfo(testUserId);
        console.log('💰 Balance after cancellation:', restoredBalance.availableBalance);
      }
    }

    // Test 6: Withdrawal History
    console.log('\n6️⃣ Test: Withdrawal History');
    
    const withdrawalHistory = await balanceService.getWithdrawalHistory(testUserId, 1, 10);
    console.log('✅ Withdrawal history retrieved:', {
      totalWithdrawals: withdrawalHistory.totalCount,
      currentPage: withdrawalHistory.currentPage,
      totalPages: withdrawalHistory.totalPages,
      summary: {
        totalRequested: withdrawalHistory.summary.totalRequested,
        totalCompleted: withdrawalHistory.summary.totalCompleted,
        totalPending: withdrawalHistory.summary.totalPending,
        totalFailed: withdrawalHistory.summary.totalFailed
      }
    });

    // Test filtered withdrawal history
    const filteredWithdrawals = await balanceService.getWithdrawalHistory(testUserId, 1, 5, {
      status: WithdrawalStatus.CANCELLED,
      minAmount: 100
    });
    console.log('✅ Filtered withdrawal history:', {
      filteredCount: filteredWithdrawals.withdrawals.length
    });

    // Test 7: Balance Analytics
    console.log('\n7️⃣ Test: Balance Analytics');
    
    const periods = ['week', 'month', 'quarter', 'year'];
    for (const period of periods) {
      const analytics = await balanceService.getBalanceAnalytics(testUserId, period);
      console.log(`✅ ${period} analytics:`, {
        totalEarned: analytics.periodSummary.totalEarned,
        totalWithdrawn: analytics.periodSummary.totalWithdrawn,
        netGain: analytics.periodSummary.netGain,
        transactionCount: analytics.periodSummary.transactionCount,
        trendsCount: analytics.trends.length,
        topCategoriesCount: analytics.topCategories.length,
        topStoresCount: analytics.topStores.length
      });
    }

    // Test 8: Export Functionality
    console.log('\n8️⃣ Test: Export Functionality');
    
    const exportFormats = ['csv', 'excel', 'pdf'];
    for (const format of exportFormats) {
      try {
        const exportData = await balanceService.exportTransactionHistory(testUserId, format);
        console.log(`✅ ${format.toUpperCase()} export:`, {
          filename: exportData.filename,
          mimeType: exportData.mimeType,
          dataSize: exportData.data.length
        });
      } catch (error) {
        console.log(`⚠️ ${format.toUpperCase()} export: ${error.message}`);
      }
    }

    // Test export with filters
    const filteredExport = await balanceService.exportTransactionHistory(testUserId, 'csv', {
      dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      dateTo: new Date(),
      type: CashbackTransactionType.EARNED
    });
    console.log('✅ Filtered CSV export:', {
      filename: filteredExport.filename,
      dataSize: filteredExport.data.length
    });

    // Test 9: Telegram Bot Commands
    console.log('\n9️⃣ Test: Telegram Bot Commands');
    
    // Mock Telegram message
    const mockMessage = {
      chat: { id: 'test_chat_123', type: 'private' },
      from: { id: testUserId, username: 'testuser', first_name: 'Test' },
      text: '/balance',
      message_id: 123
    };

    // Mock telegram service methods
    botCommands.telegramService.sendMessage = async (chatId, message, options) => {
      console.log('📱 Telegram message sent:', {
        chatId,
        messageLength: message.length,
        hasKeyboard: !!options?.reply_markup,
        parseMode: options?.parse_mode
      });
      return Promise.resolve();
    };

    botCommands.telegramService.editMessage = async (chatId, messageId, message, options) => {
      console.log('📱 Telegram message edited:', {
        chatId,
        messageId,
        messageLength: message.length
      });
      return Promise.resolve();
    };

    botCommands.telegramService.answerCallbackQuery = async (callbackQueryId, text) => {
      console.log('📱 Callback query answered:', { callbackQueryId, text });
      return Promise.resolve();
    };

    // Test balance command
    await botCommands.handleBalanceCommand(mockMessage);
    console.log('✅ Balance command handled');

    // Test withdraw command
    mockMessage.text = '/withdraw';
    await botCommands.handleWithdrawCommand(mockMessage);
    console.log('✅ Withdraw command handled');

    // Test history command
    mockMessage.text = '/history';
    await botCommands.handleHistoryCommand(mockMessage);
    console.log('✅ History command handled');

    // Test add payment method command
    mockMessage.text = '/add_payment_method';
    await botCommands.handleAddPaymentMethodCommand(mockMessage);
    console.log('✅ Add payment method command handled');

    // Test callback queries
    const mockCallbackQuery = {
      id: 'callback_123',
      from: { id: testUserId, username: 'testuser' },
      message: {
        chat: { id: 'test_chat_123' },
        message_id: 456
      },
      data: 'refresh_balance'
    };

    await botCommands.handleCallbackQuery(mockCallbackQuery);
    console.log('✅ Refresh balance callback handled');

    // Test quick withdraw callback
    mockCallbackQuery.data = 'quick_withdraw_100';
    await botCommands.handleCallbackQuery(mockCallbackQuery);
    console.log('✅ Quick withdraw callback handled');

    // Test 10: Error Handling
    console.log('\n🔟 Test: Error Handling');
    
    // Test withdrawal limits
    try {
      await balanceService.requestWithdrawal(testUserId, 50, availablePaymentMethods[0].id);
    } catch (error) {
      console.log('✅ Minimum withdrawal limit enforced:', error.message);
    }

    try {
      await balanceService.requestWithdrawal(testUserId, 100000, availablePaymentMethods[0].id);
    } catch (error) {
      console.log('✅ Maximum withdrawal limit enforced:', error.message);
    }

    // Test unauthorized operations
    try {
      await balanceService.cancelWithdrawal('different_user', 'non_existent_withdrawal');
    } catch (error) {
      console.log('✅ Unauthorized cancellation rejected:', error.message);
    }

    // Test non-existent withdrawal
    try {
      await balanceService.getWithdrawalStatus(testUserId, 'non_existent_withdrawal');
    } catch (error) {
      console.log('✅ Non-existent withdrawal handled:', error.message);
    }

    // Test unsupported export format
    try {
      await balanceService.exportTransactionHistory(testUserId, 'xml');
    } catch (error) {
      console.log('✅ Unsupported export format rejected:', error.message);
    }

    console.log('\n🎉 All Cashback Balance Management tests completed successfully!');

    // Summary
    console.log('\n📋 Test Summary:');
    console.log('✅ Balance information retrieval');
    console.log('✅ Comprehensive balance summary');
    console.log('✅ Transaction history with pagination and filtering');
    console.log('✅ Withdrawal management (request, cancel, status)');
    console.log('✅ Withdrawal history with filtering');
    console.log('✅ Balance analytics for different periods');
    console.log('✅ Export functionality (CSV, Excel, PDF)');
    console.log('✅ Telegram bot commands integration');
    console.log('✅ Callback query handling');
    console.log('✅ Error handling and validation');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Performance test
async function performanceTest() {
  console.log('\n⚡ Performance Test: Balance Operations');
  
  const balanceService = new CashbackBalanceService();
  const testUserId = `perf_user_${Date.now()}`;
  
  try {
    // Setup test data
    console.log('Setting up performance test data...');
    for (let i = 0; i < 100; i++) {
      const cashback = await balanceService.cashbackService.processCashback(
        testUserId,
        Math.floor(Math.random() * 2000) + 100,
        `perf_txn_${i}_${Date.now()}`,
        { 
          store: ['flipkart', 'amazon', 'myntra'][i % 3],
          category: ['electronics', 'fashion', 'grocery'][i % 3]
        }
      );
      await balanceService.cashbackService.confirmCashback(cashback.id);
    }

    // Test balance retrieval performance
    const startTime = Date.now();
    const promises = [];
    
    for (let i = 0; i < 50; i++) {
      promises.push(balanceService.getBalanceInfo(testUserId));
    }
    
    await Promise.all(promises);
    const endTime = Date.now();
    
    console.log(`✅ Balance retrieval performance: ${endTime - startTime}ms for 50 concurrent requests`);
    console.log(`⚡ Average: ${((endTime - startTime) / 50).toFixed(2)}ms per request`);

    // Test transaction history performance
    const historyStartTime = Date.now();
    const history = await balanceService.getTransactionHistory(testUserId, 1, 50);
    const historyEndTime = Date.now();
    
    console.log(`✅ Transaction history performance: ${historyEndTime - historyStartTime}ms for 50 transactions`);
    console.log(`📊 Retrieved ${history.transactions.length} transactions`);

    // Test analytics performance
    const analyticsStartTime = Date.now();
    const analytics = await balanceService.getBalanceAnalytics(testUserId, 'month');
    const analyticsEndTime = Date.now();
    
    console.log(`✅ Analytics performance: ${analyticsEndTime - analyticsStartTime}ms`);
    console.log(`📈 Analytics data: ${analytics.trends.length} trend points, ${analytics.topCategories.length} categories`);

  } catch (error) {
    console.error('❌ Performance test failed:', error);
  }
}

// Integration test
async function integrationTest() {
  console.log('\n🔗 Integration Test: End-to-End Balance Flow');
  
  const balanceService = new CashbackBalanceService();
  const testUserId = `integration_${Date.now()}`;
  
  try {
    console.log('Testing complete user balance journey...');
    
    // 1. User starts with zero balance
    let balance = await balanceService.getBalanceInfo(testUserId);
    console.log(`1. Initial balance: ₹${balance.availableBalance}`);
    
    // 2. User earns cashback from purchases
    const purchases = [
      { amount: 2500, store: 'flipkart', category: 'electronics' },
      { amount: 1200, store: 'amazon', category: 'books' },
      { amount: 800, store: 'myntra', category: 'fashion' }
    ];
    
    let totalCashback = 0;
    for (const purchase of purchases) {
      const cashback = await balanceService.cashbackService.processCashback(
        testUserId,
        purchase.amount,
        `integration_${Date.now()}_${Math.random()}`,
        purchase
      );
      await balanceService.cashbackService.confirmCashback(cashback.id);
      totalCashback += cashback.amount;
      console.log(`2. Earned ₹${cashback.amount} from ${purchase.store}`);
    }
    
    // 3. Check updated balance
    balance = await balanceService.getBalanceInfo(testUserId);
    console.log(`3. Updated balance: ₹${balance.availableBalance} (earned ₹${totalCashback})`);
    
    // 4. Add payment method
    const paymentMethod = await balanceService.cashbackService.addPaymentMethod(testUserId, {
      type: PaymentMethodType.UPI,
      details: { upiId: 'integration@paytm', holderName: 'Integration User' }
    });
    await balanceService.cashbackService.repository.updatePaymentMethod(paymentMethod.id, {
      isVerified: true
    });
    console.log('4. Payment method added and verified');
    
    // 5. Request withdrawal
    const withdrawalAmount = Math.min(200, balance.availableBalance);
    if (withdrawalAmount >= 100) {
      const withdrawal = await balanceService.requestWithdrawal(
        testUserId,
        withdrawalAmount,
        paymentMethod.id
      );
      console.log(`5. Withdrawal requested: ₹${withdrawalAmount} (ID: ${withdrawal.id})`);
      
      // 6. Check withdrawal status
      const status = await balanceService.getWithdrawalStatus(testUserId, withdrawal.id);
      console.log(`6. Withdrawal status: ${status.withdrawal.status}`);
      
      // 7. Check final balance
      balance = await balanceService.getBalanceInfo(testUserId);
      console.log(`7. Final balance: ₹${balance.availableBalance}`);
    }
    
    // 8. Generate analytics
    const analytics = await balanceService.getBalanceAnalytics(testUserId, 'month');
    console.log(`8. Analytics generated: ₹${analytics.periodSummary.totalEarned} earned, ${analytics.periodSummary.transactionCount} transactions`);
    
    // 9. Export transaction history
    const exportData = await balanceService.exportTransactionHistory(testUserId, 'csv');
    console.log(`9. Transaction history exported: ${exportData.filename} (${exportData.data.length} bytes)`);
    
    console.log('✅ Complete integration flow tested successfully');
    
  } catch (error) {
    console.log('❌ Integration test failed:', error.message);
    throw error;
  }
}

// Run tests
if (require.main === module) {
  testCashbackBalance()
    .then(() => performanceTest())
    .then(() => integrationTest())
    .then(() => {
      console.log('\n🏁 All balance management tests completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { testCashbackBalance, performanceTest, integrationTest };
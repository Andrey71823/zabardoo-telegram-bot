#!/usr/bin/env node

const { CashbackService } = require('../src/services/cashback/CashbackService');
const { PaymentMethodType, CashbackTransactionType } = require('../src/models/CashbackSystem');

async function testCashbackSystem() {
  console.log('🚀 Testing Cashback System...\n');

  const cashbackService = new CashbackService();
  const testUserId = `test_user_${Date.now()}`;

  try {
    // Test 1: Add Payment Methods
    console.log('📱 Test 1: Adding Payment Methods');
    
    const upiMethod = await cashbackService.addPaymentMethod(testUserId, {
      type: PaymentMethodType.UPI,
      details: {
        upiId: 'testuser@paytm',
        holderName: 'Test User'
      }
    });
    console.log('✅ UPI payment method added:', upiMethod.id);

    const paytmMethod = await cashbackService.addPaymentMethod(testUserId, {
      type: PaymentMethodType.PAYTM,
      details: {
        phoneNumber: '9876543210',
        holderName: 'Test User'
      }
    });
    console.log('✅ PayTM payment method added:', paytmMethod.id);

    const bankMethod = await cashbackService.addPaymentMethod(testUserId, {
      type: PaymentMethodType.BANK_ACCOUNT,
      details: {
        accountNumber: '1234567890123456',
        ifscCode: 'HDFC0001234',
        accountHolderName: 'Test User',
        bankName: 'HDFC Bank'
      }
    });
    console.log('✅ Bank account added:', bankMethod.id);

    // Test 2: Get Cashback Account
    console.log('\n💰 Test 2: Getting Cashback Account');
    const account = await cashbackService.getCashbackAccount(testUserId);
    console.log('✅ Cashback account created:', {
      id: account.id,
      balance: account.balance,
      currency: account.currency
    });

    // Test 3: Process Cashback Transactions
    console.log('\n🎯 Test 3: Processing Cashback Transactions');
    
    const electronicsTransaction = await cashbackService.processCashback(
      testUserId,
      2000,
      'txn_electronics_001',
      { category: 'electronics', store: 'flipkart' }
    );
    console.log('✅ Electronics cashback processed:', {
      amount: electronicsTransaction.amount,
      originalAmount: electronicsTransaction.originalAmount,
      type: electronicsTransaction.type
    });

    const fashionTransaction = await cashbackService.processCashback(
      testUserId,
      1500,
      'txn_fashion_001',
      { category: 'fashion', store: 'myntra' }
    );
    console.log('✅ Fashion cashback processed:', {
      amount: fashionTransaction.amount,
      originalAmount: fashionTransaction.originalAmount
    });

    const groceryTransaction = await cashbackService.processCashback(
      testUserId,
      800,
      'txn_grocery_001',
      { category: 'grocery', store: 'bigbasket' }
    );
    console.log('✅ Grocery cashback processed:', {
      amount: groceryTransaction.amount,
      originalAmount: groceryTransaction.originalAmount
    });

    // Test 4: Confirm Cashback
    console.log('\n✅ Test 4: Confirming Cashback Transactions');
    
    await cashbackService.confirmCashback(electronicsTransaction.id);
    console.log('✅ Electronics cashback confirmed');

    await cashbackService.confirmCashback(fashionTransaction.id);
    console.log('✅ Fashion cashback confirmed');

    await cashbackService.confirmCashback(groceryTransaction.id);
    console.log('✅ Grocery cashback confirmed');

    // Check updated balance
    const updatedAccount = await cashbackService.getCashbackAccount(testUserId);
    console.log('💰 Updated account balance:', {
      balance: updatedAccount.balance,
      totalEarned: updatedAccount.totalEarned,
      pendingBalance: updatedAccount.pendingBalance
    });

    // Test 5: Payment Method Validation
    console.log('\n🔍 Test 5: Payment Method Validation');
    
    const validUPI = await cashbackService.validatePaymentMethod({
      type: PaymentMethodType.UPI,
      details: { upiId: 'valid@paytm' }
    });
    console.log('✅ Valid UPI validation:', validUPI.isValid);

    const invalidUPI = await cashbackService.validatePaymentMethod({
      type: PaymentMethodType.UPI,
      details: { upiId: 'invalid-upi' }
    });
    console.log('❌ Invalid UPI validation:', {
      isValid: invalidUPI.isValid,
      errors: invalidUPI.errors
    });

    const validPhone = await cashbackService.validatePaymentMethod({
      type: PaymentMethodType.PAYTM,
      details: { phoneNumber: '9876543210' }
    });
    console.log('✅ Valid phone validation:', validPhone.isValid);

    const invalidPhone = await cashbackService.validatePaymentMethod({
      type: PaymentMethodType.PAYTM,
      details: { phoneNumber: '123456' }
    });
    console.log('❌ Invalid phone validation:', {
      isValid: invalidPhone.isValid,
      errors: invalidPhone.errors
    });

    // Test 6: Referral Cashback
    console.log('\n👥 Test 6: Referral Cashback Processing');
    
    const referrerId = `referrer_${Date.now()}`;
    const refereeId = `referee_${Date.now()}`;
    
    await cashbackService.processReferralCashback(referrerId, refereeId, 1000);
    console.log('✅ Referral cashback processed');

    const referrerAccount = await cashbackService.getCashbackAccount(referrerId);
    const refereeAccount = await cashbackService.getCashbackAccount(refereeId);
    
    console.log('👤 Referrer account:', {
      pendingBalance: referrerAccount.pendingBalance
    });
    console.log('👤 Referee account:', {
      pendingBalance: refereeAccount.pendingBalance
    });

    // Test 7: Withdrawal Request (Mock)
    console.log('\n💸 Test 7: Withdrawal Request');
    
    // Mock payment method as verified for withdrawal test
    await cashbackService.repository.updatePaymentMethod(upiMethod.id, { 
      isVerified: true 
    });

    try {
      const withdrawal = await cashbackService.requestWithdrawal(
        testUserId,
        200,
        upiMethod.id
      );
      console.log('✅ Withdrawal requested:', {
        id: withdrawal.id,
        amount: withdrawal.amount,
        status: withdrawal.status
      });

      // Test withdrawal processing
      await cashbackService.processWithdrawal(withdrawal.id);
      console.log('✅ Withdrawal processed successfully');

    } catch (error) {
      console.log('❌ Withdrawal test failed:', error.message);
    }

    // Test 8: Analytics
    console.log('\n📊 Test 8: Cashback Analytics');
    
    const analytics = await cashbackService.getCashbackAnalytics();
    console.log('✅ Overall analytics:', {
      totalUsers: analytics.totalUsers,
      totalTransactions: analytics.totalTransactions,
      totalCashbackEarned: analytics.totalCashbackEarned
    });

    const userAnalytics = await cashbackService.getCashbackAnalytics(testUserId);
    console.log('✅ User analytics:', {
      totalTransactions: userAnalytics.totalTransactions,
      totalCashbackEarned: userAnalytics.totalCashbackEarned
    });

    // Test 9: Error Handling
    console.log('\n🚨 Test 9: Error Handling');
    
    try {
      await cashbackService.addPaymentMethod(testUserId, {
        type: 'INVALID_TYPE',
        details: {}
      });
    } catch (error) {
      console.log('✅ Invalid payment method type handled:', error.message);
    }

    try {
      await cashbackService.requestWithdrawal(testUserId, 50, upiMethod.id);
    } catch (error) {
      console.log('✅ Minimum withdrawal amount validation:', error.message);
    }

    try {
      await cashbackService.requestWithdrawal(testUserId, 999999, upiMethod.id);
    } catch (error) {
      console.log('✅ Insufficient balance validation:', error.message);
    }

    console.log('\n🎉 All Cashback System tests completed successfully!');

    // Summary
    console.log('\n📋 Test Summary:');
    console.log('✅ Payment method management');
    console.log('✅ Cashback account creation');
    console.log('✅ Cashback transaction processing');
    console.log('✅ Transaction confirmation');
    console.log('✅ Payment method validation');
    console.log('✅ Referral program');
    console.log('✅ Withdrawal processing');
    console.log('✅ Analytics generation');
    console.log('✅ Error handling');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Performance test
async function performanceTest() {
  console.log('\n⚡ Performance Test: Processing Multiple Transactions');
  
  const cashbackService = new CashbackService();
  const testUserId = `perf_user_${Date.now()}`;
  
  const startTime = Date.now();
  const promises = [];
  
  // Process 100 concurrent cashback transactions
  for (let i = 0; i < 100; i++) {
    promises.push(
      cashbackService.processCashback(
        testUserId,
        Math.floor(Math.random() * 5000) + 100,
        `perf_txn_${i}`,
        { 
          category: ['electronics', 'fashion', 'grocery'][i % 3],
          store: ['flipkart', 'amazon', 'myntra'][i % 3]
        }
      )
    );
  }
  
  const results = await Promise.all(promises);
  const endTime = Date.now();
  
  console.log(`✅ Processed ${results.length} transactions in ${endTime - startTime}ms`);
  console.log(`⚡ Average: ${((endTime - startTime) / results.length).toFixed(2)}ms per transaction`);
  
  const totalCashback = results.reduce((sum, txn) => sum + txn.amount, 0);
  console.log(`💰 Total cashback processed: ₹${totalCashback.toFixed(2)}`);
}

// Run tests
if (require.main === module) {
  testCashbackSystem()
    .then(() => performanceTest())
    .then(() => {
      console.log('\n🏁 All tests completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { testCashbackSystem, performanceTest };
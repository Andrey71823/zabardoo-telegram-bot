import { BaseService } from '../base/BaseService';
import { CashbackBalanceService, BalanceSummary } from '../cashback/CashbackBalanceService';
import { CashbackService } from '../cashback/CashbackService';
import { TelegramBotService } from './TelegramBotService';
import { 
  PaymentMethodType, 
  WithdrawalStatus, 
  CashbackTransactionType 
} from '../../models/CashbackSystem';

export interface TelegramMessage {
  chat: {
    id: string;
    type: string;
  };
  from: {
    id: string;
    username?: string;
    first_name?: string;
  };
  text: string;
  message_id: number;
}

export interface InlineKeyboard {
  inline_keyboard: Array<Array<{
    text: string;
    callback_data: string;
  }>>;
}

export class CashbackBotCommands extends BaseService {
  private balanceService: CashbackBalanceService;
  private cashbackService: CashbackService;
  private telegramService: TelegramBotService;

  constructor() {
    super();
    this.balanceService = new CashbackBalanceService();
    this.cashbackService = new CashbackService();
    this.telegramService = new TelegramBotService();
  }

  // Handle /balance command
  async handleBalanceCommand(message: TelegramMessage): Promise<void> {
    try {
      const userId = message.from.id;
      const chatId = message.chat.id;

      const balanceSummary = await this.balanceService.getBalanceSummary(userId);
      
      const balanceMessage = this.formatBalanceMessage(balanceSummary);
      const keyboard = this.createBalanceKeyboard();

      await this.telegramService.sendMessage(chatId, balanceMessage, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });

      this.logger.info('Balance command handled', { userId, chatId });

    } catch (error) {
      this.logger.error('Failed to handle balance command', { 
        userId: message.from.id,
        error: error.message 
      });
      
      await this.telegramService.sendMessage(
        message.chat.id,
        '❌ Sorry, I couldn\'t retrieve your balance information. Please try again later.'
      );
    }
  }

  // Handle /withdraw command
  async handleWithdrawCommand(message: TelegramMessage): Promise<void> {
    try {
      const userId = message.from.id;
      const chatId = message.chat.id;

      // Check if user has verified payment methods
      const paymentMethods = await this.cashbackService.repository.getPaymentMethodsByUserId(userId, {
        isActive: true,
        isVerified: true
      });

      if (paymentMethods.length === 0) {
        await this.telegramService.sendMessage(
          chatId,
          '⚠️ You need to add and verify a payment method before withdrawing.\n\nUse /add_payment_method to get started.',
          {
            reply_markup: {
              inline_keyboard: [[
                { text: '➕ Add Payment Method', callback_data: 'add_payment_method' }
              ]]
            }
          }
        );
        return;
      }

      // Show withdrawal options
      const balance = await this.balanceService.getBalanceInfo(userId);
      const limits = await this.balanceService['getWithdrawalLimits'](userId);

      const withdrawMessage = this.formatWithdrawMessage(balance, limits);
      const keyboard = this.createWithdrawKeyboard(paymentMethods);

      await this.telegramService.sendMessage(chatId, withdrawMessage, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });

      this.logger.info('Withdraw command handled', { userId, chatId });

    } catch (error) {
      this.logger.error('Failed to handle withdraw command', { 
        userId: message.from.id,
        error: error.message 
      });
      
      await this.telegramService.sendMessage(
        message.chat.id,
        '❌ Sorry, I couldn\'t process your withdrawal request. Please try again later.'
      );
    }
  }

  // Handle /history command
  async handleHistoryCommand(message: TelegramMessage): Promise<void> {
    try {
      const userId = message.from.id;
      const chatId = message.chat.id;

      const history = await this.balanceService.getTransactionHistory(userId, 1, 10);
      
      const historyMessage = this.formatHistoryMessage(history);
      const keyboard = this.createHistoryKeyboard();

      await this.telegramService.sendMessage(chatId, historyMessage, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });

      this.logger.info('History command handled', { userId, chatId });

    } catch (error) {
      this.logger.error('Failed to handle history command', { 
        userId: message.from.id,
        error: error.message 
      });
      
      await this.telegramService.sendMessage(
        message.chat.id,
        '❌ Sorry, I couldn\'t retrieve your transaction history. Please try again later.'
      );
    }
  }

  // Handle /add_payment_method command
  async handleAddPaymentMethodCommand(message: TelegramMessage): Promise<void> {
    try {
      const userId = message.from.id;
      const chatId = message.chat.id;

      const paymentMethodMessage = this.formatAddPaymentMethodMessage();
      const keyboard = this.createPaymentMethodKeyboard();

      await this.telegramService.sendMessage(chatId, paymentMethodMessage, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });

      this.logger.info('Add payment method command handled', { userId, chatId });

    } catch (error) {
      this.logger.error('Failed to handle add payment method command', { 
        userId: message.from.id,
        error: error.message 
      });
    }
  }

  // Handle /my_withdrawals command
  async handleMyWithdrawalsCommand(message: TelegramMessage): Promise<void> {
    try {
      const userId = message.from.id;
      const chatId = message.chat.id;

      const withdrawalHistory = await this.balanceService.getWithdrawalHistory(userId, 1, 10);
      
      const withdrawalsMessage = this.formatWithdrawalsMessage(withdrawalHistory);
      const keyboard = this.createWithdrawalsKeyboard();

      await this.telegramService.sendMessage(chatId, withdrawalsMessage, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });

      this.logger.info('My withdrawals command handled', { userId, chatId });

    } catch (error) {
      this.logger.error('Failed to handle my withdrawals command', { 
        userId: message.from.id,
        error: error.message 
      });
    }
  }

  // Handle callback queries (inline button presses)
  async handleCallbackQuery(callbackQuery: any): Promise<void> {
    try {
      const userId = callbackQuery.from.id;
      const chatId = callbackQuery.message.chat.id;
      const data = callbackQuery.data;

      switch (data) {
        case 'refresh_balance':
          await this.handleRefreshBalance(userId, chatId, callbackQuery.message.message_id);
          break;
        
        case 'view_transactions':
          await this.handleViewTransactions(userId, chatId);
          break;
        
        case 'quick_withdraw_100':
        case 'quick_withdraw_500':
        case 'quick_withdraw_1000':
          await this.handleQuickWithdraw(userId, chatId, data);
          break;
        
        case 'add_payment_method':
          await this.handleAddPaymentMethodCallback(userId, chatId);
          break;
        
        case 'add_upi':
        case 'add_paytm':
        case 'add_phonepe':
        case 'add_bank':
          await this.handleAddSpecificPaymentMethod(userId, chatId, data);
          break;
        
        case 'export_csv':
        case 'export_excel':
          await this.handleExportHistory(userId, chatId, data);
          break;
        
        default:
          if (data.startsWith('withdraw_')) {
            await this.handleWithdrawWithMethod(userId, chatId, data);
          } else if (data.startsWith('cancel_withdrawal_')) {
            await this.handleCancelWithdrawal(userId, chatId, data);
          } else if (data.startsWith('view_withdrawal_')) {
            await this.handleViewWithdrawal(userId, chatId, data);
          }
          break;
      }

      // Answer callback query to remove loading state
      await this.telegramService.answerCallbackQuery(callbackQuery.id);

    } catch (error) {
      this.logger.error('Failed to handle callback query', { 
        userId: callbackQuery.from.id,
        data: callbackQuery.data,
        error: error.message 
      });
      
      await this.telegramService.answerCallbackQuery(
        callbackQuery.id,
        'Sorry, something went wrong. Please try again.'
      );
    }
  }

  // Private handler methods
  private async handleRefreshBalance(userId: string, chatId: string, messageId: number): Promise<void> {
    const balanceSummary = await this.balanceService.getBalanceSummary(userId);
    const balanceMessage = this.formatBalanceMessage(balanceSummary);
    const keyboard = this.createBalanceKeyboard();

    await this.telegramService.editMessage(chatId, messageId, balanceMessage, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }

  private async handleViewTransactions(userId: string, chatId: string): Promise<void> {
    const history = await this.balanceService.getTransactionHistory(userId, 1, 5);
    const historyMessage = this.formatHistoryMessage(history);
    const keyboard = this.createHistoryKeyboard();

    await this.telegramService.sendMessage(chatId, historyMessage, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }

  private async handleQuickWithdraw(userId: string, chatId: string, data: string): Promise<void> {
    const amount = parseInt(data.split('_')[2]);
    
    // Get user's default payment method
    const paymentMethods = await this.cashbackService.repository.getPaymentMethodsByUserId(userId, {
      isActive: true,
      isVerified: true
    });

    if (paymentMethods.length === 0) {
      await this.telegramService.sendMessage(
        chatId,
        '⚠️ Please add a payment method first before withdrawing.'
      );
      return;
    }

    try {
      const withdrawal = await this.balanceService.requestWithdrawal(
        userId,
        amount,
        paymentMethods[0].id
      );

      await this.telegramService.sendMessage(
        chatId,
        `✅ Withdrawal request submitted!\n\n💰 Amount: ₹${amount}\n🆔 Request ID: \`${withdrawal.id}\`\n⏱️ Processing time: 1-3 business days`,
        { parse_mode: 'Markdown' }
      );

    } catch (error) {
      await this.telegramService.sendMessage(
        chatId,
        `❌ Withdrawal failed: ${error.message}`
      );
    }
  }

  private async handleAddPaymentMethodCallback(userId: string, chatId: string): Promise<void> {
    const message = this.formatAddPaymentMethodMessage();
    const keyboard = this.createPaymentMethodKeyboard();

    await this.telegramService.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }

  private async handleAddSpecificPaymentMethod(userId: string, chatId: string, data: string): Promise<void> {
    const type = data.split('_')[1].toUpperCase();
    
    let instructions = '';
    switch (type) {
      case 'UPI':
        instructions = '📱 *Add UPI Payment Method*\n\nPlease send your UPI ID in the format:\n`/add_upi your-upi-id@bank`\n\nExample: `/add_upi john@paytm`';
        break;
      case 'PAYTM':
        instructions = '📱 *Add PayTM Payment Method*\n\nPlease send your PayTM phone number:\n`/add_paytm 9876543210`';
        break;
      case 'PHONEPE':
        instructions = '📱 *Add PhonePe Payment Method*\n\nPlease send your PhonePe phone number:\n`/add_phonepe 9876543210`';
        break;
      case 'BANK':
        instructions = '🏦 *Add Bank Account*\n\nPlease send your bank details:\n`/add_bank AccountNumber IFSC AccountHolderName`\n\nExample: `/add_bank 1234567890 HDFC0001234 John Doe`';
        break;
    }

    await this.telegramService.sendMessage(chatId, instructions, {
      parse_mode: 'Markdown'
    });
  }

  private async handleExportHistory(userId: string, chatId: string, data: string): Promise<void> {
    const format = data.split('_')[1] as 'csv' | 'excel';
    
    try {
      const exportData = await this.balanceService.exportTransactionHistory(userId, format);
      
      await this.telegramService.sendDocument(chatId, {
        filename: exportData.filename,
        data: exportData.data
      }, `📊 Your transaction history export (${format.toUpperCase()})`);

    } catch (error) {
      await this.telegramService.sendMessage(
        chatId,
        `❌ Export failed: ${error.message}`
      );
    }
  }

  private async handleWithdrawWithMethod(userId: string, chatId: string, data: string): Promise<void> {
    const paymentMethodId = data.split('_')[1];
    
    await this.telegramService.sendMessage(
      chatId,
      '💰 *Enter Withdrawal Amount*\n\nPlease send the amount you want to withdraw:\n`/withdraw_amount 500`\n\n_Minimum: ₹100, Maximum: ₹50,000_',
      { parse_mode: 'Markdown' }
    );

    // Store the selected payment method for the next step
    // In a real implementation, you'd use a state management system
  }

  private async handleCancelWithdrawal(userId: string, chatId: string, data: string): Promise<void> {
    const withdrawalId = data.split('_')[2];
    
    try {
      await this.balanceService.cancelWithdrawal(userId, withdrawalId, 'Cancelled by user via Telegram');
      
      await this.telegramService.sendMessage(
        chatId,
        `✅ Withdrawal cancelled successfully!\n\n🆔 Request ID: \`${withdrawalId}\`\n💰 Amount has been restored to your balance.`,
        { parse_mode: 'Markdown' }
      );

    } catch (error) {
      await this.telegramService.sendMessage(
        chatId,
        `❌ Failed to cancel withdrawal: ${error.message}`
      );
    }
  }

  private async handleViewWithdrawal(userId: string, chatId: string, data: string): Promise<void> {
    const withdrawalId = data.split('_')[2];
    
    try {
      const withdrawalStatus = await this.balanceService.getWithdrawalStatus(userId, withdrawalId);
      const statusMessage = this.formatWithdrawalStatusMessage(withdrawalStatus);
      
      await this.telegramService.sendMessage(chatId, statusMessage, {
        parse_mode: 'Markdown'
      });

    } catch (error) {
      await this.telegramService.sendMessage(
        chatId,
        `❌ Failed to get withdrawal status: ${error.message}`
      );
    }
  }

  // Message formatting methods
  private formatBalanceMessage(summary: BalanceSummary): string {
    const { balance, recentTransactions, pendingWithdrawals } = summary;
    
    let message = `💰 *Your Cashback Balance*\n\n`;
    message += `💳 Available: *₹${balance.availableBalance.toFixed(2)}*\n`;
    message += `⏳ Pending: ₹${balance.pendingBalance.toFixed(2)}\n`;
    message += `📈 Total Earned: ₹${balance.totalEarned.toFixed(2)}\n`;
    message += `📤 Total Withdrawn: ₹${balance.totalWithdrawn.toFixed(2)}\n\n`;

    if (pendingWithdrawals.length > 0) {
      message += `⏳ *Pending Withdrawals:*\n`;
      pendingWithdrawals.forEach(withdrawal => {
        message += `• ₹${withdrawal.amount} - ${withdrawal.status}\n`;
      });
      message += `\n`;
    }

    if (recentTransactions.length > 0) {
      message += `📊 *Recent Transactions:*\n`;
      recentTransactions.slice(0, 3).forEach(txn => {
        const emoji = txn.type === CashbackTransactionType.EARNED ? '💰' : '📤';
        message += `${emoji} ₹${Math.abs(txn.amount)} - ${txn.metadata?.store || 'System'}\n`;
      });
    }

    message += `\n🕐 Last updated: ${balance.lastUpdated.toLocaleString()}`;

    return message;
  }

  private formatWithdrawMessage(balance: any, limits: any): string {
    let message = `💸 *Withdraw Cashback*\n\n`;
    message += `💳 Available Balance: *₹${balance.availableBalance.toFixed(2)}*\n\n`;
    message += `📋 *Withdrawal Limits:*\n`;
    message += `• Minimum: ₹${limits.minimumAmount}\n`;
    message += `• Maximum: ₹${limits.maximumAmount}\n`;
    message += `• Daily Remaining: ₹${limits.remainingDailyLimit}\n`;
    message += `• Monthly Remaining: ₹${limits.remainingMonthlyLimit}\n\n`;
    message += `⏱️ Processing time: 1-3 business days`;

    return message;
  }

  private formatHistoryMessage(history: any): string {
    let message = `📊 *Transaction History*\n\n`;
    
    if (history.transactions.length === 0) {
      message += `No transactions found.`;
      return message;
    }

    message += `📈 *Summary:*\n`;
    message += `• Total Earned: ₹${history.summary.totalEarned}\n`;
    message += `• Total Withdrawn: ₹${history.summary.totalWithdrawn}\n`;
    message += `• Pending: ₹${history.summary.pendingAmount}\n\n`;

    message += `📋 *Recent Transactions:*\n`;
    history.transactions.forEach((txn: any, index: number) => {
      if (index < 5) {
        const emoji = txn.type === CashbackTransactionType.EARNED ? '💰' : '📤';
        const date = new Date(txn.createdAt).toLocaleDateString();
        message += `${emoji} ₹${Math.abs(txn.amount)} - ${txn.metadata?.store || 'System'} (${date})\n`;
      }
    });

    if (history.totalCount > 5) {
      message += `\n... and ${history.totalCount - 5} more transactions`;
    }

    return message;
  }

  private formatWithdrawalsMessage(withdrawalHistory: any): string {
    let message = `📤 *My Withdrawals*\n\n`;
    
    if (withdrawalHistory.withdrawals.length === 0) {
      message += `No withdrawals found.`;
      return message;
    }

    message += `📊 *Summary:*\n`;
    message += `• Total Requested: ₹${withdrawalHistory.summary.totalRequested}\n`;
    message += `• Completed: ₹${withdrawalHistory.summary.totalCompleted}\n`;
    message += `• Pending: ₹${withdrawalHistory.summary.totalPending}\n\n`;

    message += `📋 *Recent Withdrawals:*\n`;
    withdrawalHistory.withdrawals.forEach((withdrawal: any, index: number) => {
      if (index < 5) {
        const statusEmoji = this.getWithdrawalStatusEmoji(withdrawal.status);
        const date = new Date(withdrawal.requestedAt).toLocaleDateString();
        message += `${statusEmoji} ₹${withdrawal.amount} - ${withdrawal.status} (${date})\n`;
      }
    });

    return message;
  }

  private formatAddPaymentMethodMessage(): string {
    return `💳 *Add Payment Method*\n\nChoose your preferred payment method for cashback withdrawals:\n\n🔹 UPI - Instant transfers\n🔹 PayTM - Quick and secure\n🔹 PhonePe - Easy withdrawals\n🔹 Bank Account - Traditional banking\n\nAll payment methods are secured and verified.`;
  }

  private formatWithdrawalStatusMessage(withdrawalStatus: any): string {
    const { withdrawal, paymentMethod, timeline } = withdrawalStatus;
    
    let message = `📤 *Withdrawal Status*\n\n`;
    message += `🆔 Request ID: \`${withdrawal.id}\`\n`;
    message += `💰 Amount: ₹${withdrawal.amount}\n`;
    message += `📱 Method: ${this.getPaymentMethodDisplay(paymentMethod)}\n`;
    message += `📊 Status: ${this.getWithdrawalStatusEmoji(withdrawal.status)} ${withdrawal.status}\n\n`;

    if (timeline.length > 0) {
      message += `📅 *Timeline:*\n`;
      timeline.forEach((event: any) => {
        const date = new Date(event.timestamp).toLocaleString();
        message += `• ${event.description} (${date})\n`;
      });
    }

    return message;
  }

  // Keyboard creation methods
  private createBalanceKeyboard(): InlineKeyboard {
    return {
      inline_keyboard: [
        [
          { text: '🔄 Refresh', callback_data: 'refresh_balance' },
          { text: '📊 Transactions', callback_data: 'view_transactions' }
        ],
        [
          { text: '💸 Withdraw ₹100', callback_data: 'quick_withdraw_100' },
          { text: '💸 Withdraw ₹500', callback_data: 'quick_withdraw_500' }
        ],
        [
          { text: '💸 Withdraw ₹1000', callback_data: 'quick_withdraw_1000' },
          { text: '💳 Add Payment Method', callback_data: 'add_payment_method' }
        ]
      ]
    };
  }

  private createWithdrawKeyboard(paymentMethods: any[]): InlineKeyboard {
    const keyboard: any[][] = [];
    
    // Add payment method buttons
    paymentMethods.forEach(method => {
      keyboard.push([{
        text: `💳 ${this.getPaymentMethodDisplay(method)}`,
        callback_data: `withdraw_${method.id}`
      }]);
    });

    // Add quick amount buttons
    keyboard.push([
      { text: '💸 ₹100', callback_data: 'quick_withdraw_100' },
      { text: '💸 ₹500', callback_data: 'quick_withdraw_500' },
      { text: '💸 ₹1000', callback_data: 'quick_withdraw_1000' }
    ]);

    return { inline_keyboard: keyboard };
  }

  private createHistoryKeyboard(): InlineKeyboard {
    return {
      inline_keyboard: [
        [
          { text: '📊 Export CSV', callback_data: 'export_csv' },
          { text: '📊 Export Excel', callback_data: 'export_excel' }
        ],
        [
          { text: '🔄 Refresh', callback_data: 'view_transactions' }
        ]
      ]
    };
  }

  private createPaymentMethodKeyboard(): InlineKeyboard {
    return {
      inline_keyboard: [
        [
          { text: '📱 UPI', callback_data: 'add_upi' },
          { text: '📱 PayTM', callback_data: 'add_paytm' }
        ],
        [
          { text: '📱 PhonePe', callback_data: 'add_phonepe' },
          { text: '🏦 Bank Account', callback_data: 'add_bank' }
        ]
      ]
    };
  }

  private createWithdrawalsKeyboard(): InlineKeyboard {
    return {
      inline_keyboard: [
        [
          { text: '🔄 Refresh', callback_data: 'refresh_withdrawals' }
        ]
      ]
    };
  }

  // Helper methods
  private getWithdrawalStatusEmoji(status: string): string {
    const emojiMap: { [key: string]: string } = {
      [WithdrawalStatus.PENDING]: '⏳',
      [WithdrawalStatus.PROCESSING]: '⚙️',
      [WithdrawalStatus.COMPLETED]: '✅',
      [WithdrawalStatus.FAILED]: '❌',
      [WithdrawalStatus.CANCELLED]: '🚫'
    };
    return emojiMap[status] || '❓';
  }

  private getPaymentMethodDisplay(paymentMethod: any): string {
    if (!paymentMethod) return 'Unknown';

    switch (paymentMethod.type) {
      case PaymentMethodType.UPI:
        return `UPI (${paymentMethod.details.upiId})`;
      case PaymentMethodType.PAYTM:
        return `PayTM (${paymentMethod.details.phoneNumber})`;
      case PaymentMethodType.PHONEPE:
        return `PhonePe (${paymentMethod.details.phoneNumber})`;
      case PaymentMethodType.BANK_ACCOUNT:
        return `Bank (****${paymentMethod.details.accountNumber?.slice(-4)})`;
      default:
        return paymentMethod.type;
    }
  }
}
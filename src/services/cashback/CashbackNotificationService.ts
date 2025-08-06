import { BaseService } from '../base/BaseService';
import { CashbackSystemRepository } from '../../repositories/CashbackSystemRepository';
import { TelegramBotService } from '../telegram/TelegramBotService';
import { 
  CashbackTransaction, 
  WithdrawalRequest, 
  CashbackNotification 
} from '../../models/CashbackSystem';

export interface NotificationTemplate {
  type: string;
  title: string;
  message: string;
  telegramMessage?: string;
  variables: string[];
}

export interface NotificationPreferences {
  userId: string;
  enableCashbackEarned: boolean;
  enableCashbackConfirmed: boolean;
  enableWithdrawalProcessed: boolean;
  enablePromotionalOffers: boolean;
  enableWeeklySummary: boolean;
  preferredLanguage: string;
  telegramNotifications: boolean;
  emailNotifications: boolean;
}

export class CashbackNotificationService extends BaseService {
  private repository: CashbackSystemRepository;
  private telegramService: TelegramBotService;
  private templates: Map<string, NotificationTemplate>;

  constructor() {
    super();
    this.repository = new CashbackSystemRepository();
    this.telegramService = new TelegramBotService();
    this.templates = new Map();
    this.initializeTemplates();
  }

  // Send cashback earned notification
  async notifyCashbackEarned(userId: string, transaction: CashbackTransaction): Promise<void> {
    try {
      const preferences = await this.getUserNotificationPreferences(userId);
      
      if (!preferences.enableCashbackEarned) {
        this.logger.info('Cashback earned notifications disabled for user', { userId });
        return;
      }

      const template = this.templates.get('CASHBACK_EARNED');
      if (!template) {
        throw new Error('Cashback earned template not found');
      }

      const variables = {
        amount: transaction.amount.toFixed(2),
        originalAmount: transaction.originalAmount?.toFixed(2) || '0',
        store: transaction.metadata?.store || 'Unknown Store',
        transactionId: transaction.transactionId || transaction.id
      };

      const notification = await this.createNotification(userId, template, variables);
      
      // Send via enabled channels
      if (preferences.telegramNotifications) {
        await this.sendTelegramNotification(userId, template, variables);
      }

      if (preferences.emailNotifications) {
        await this.sendEmailNotification(userId, template, variables);
      }

      this.logger.info('Cashback earned notification sent', { 
        userId, 
        amount: transaction.amount,
        channels: this.getEnabledChannels(preferences)
      });

    } catch (error) {
      this.logger.error('Failed to send cashback earned notification', { 
        userId, 
        transactionId: transaction.id,
        error: error.message 
      });
    }
  }

  // Send cashback confirmed notification
  async notifyCashbackConfirmed(userId: string, transaction: CashbackTransaction): Promise<void> {
    try {
      const preferences = await this.getUserNotificationPreferences(userId);
      
      if (!preferences.enableCashbackConfirmed) {
        return;
      }

      const template = this.templates.get('CASHBACK_CONFIRMED');
      if (!template) {
        throw new Error('Cashback confirmed template not found');
      }

      const account = await this.repository.getCashbackAccountByUserId(userId);
      const variables = {
        amount: transaction.amount.toFixed(2),
        balance: account?.balance.toFixed(2) || '0',
        store: transaction.metadata?.store || 'Unknown Store'
      };

      await this.createNotification(userId, template, variables);
      
      if (preferences.telegramNotifications) {
        await this.sendTelegramNotification(userId, template, variables);
      }

      this.logger.info('Cashback confirmed notification sent', { userId, amount: transaction.amount });

    } catch (error) {
      this.logger.error('Failed to send cashback confirmed notification', { 
        userId, 
        error: error.message 
      });
    }
  }

  // Send withdrawal processed notification
  async notifyWithdrawalProcessed(userId: string, withdrawal: WithdrawalRequest): Promise<void> {
    try {
      const preferences = await this.getUserNotificationPreferences(userId);
      
      if (!preferences.enableWithdrawalProcessed) {
        return;
      }

      const template = this.templates.get('WITHDRAWAL_PROCESSED');
      if (!template) {
        throw new Error('Withdrawal processed template not found');
      }

      const paymentMethod = await this.repository.getPaymentMethod(withdrawal.paymentMethodId);
      const variables = {
        amount: withdrawal.amount.toFixed(2),
        paymentMethod: this.getPaymentMethodDisplay(paymentMethod),
        withdrawalId: withdrawal.id,
        processedDate: withdrawal.processedAt?.toLocaleDateString() || new Date().toLocaleDateString()
      };

      await this.createNotification(userId, template, variables);
      
      if (preferences.telegramNotifications) {
        await this.sendTelegramNotification(userId, template, variables);
      }

      this.logger.info('Withdrawal processed notification sent', { 
        userId, 
        amount: withdrawal.amount,
        withdrawalId: withdrawal.id 
      });

    } catch (error) {
      this.logger.error('Failed to send withdrawal processed notification', { 
        userId, 
        withdrawalId: withdrawal.id,
        error: error.message 
      });
    }
  }

  // Send promotional offer notification
  async notifyPromotionalOffer(userId: string, offerData: any): Promise<void> {
    try {
      const preferences = await this.getUserNotificationPreferences(userId);
      
      if (!preferences.enablePromotionalOffers) {
        return;
      }

      const template = this.templates.get('PROMOTIONAL_OFFER');
      if (!template) {
        throw new Error('Promotional offer template not found');
      }

      const variables = {
        offerTitle: offerData.title,
        offerDescription: offerData.description,
        bonusRate: offerData.bonusRate?.toString() || '0',
        validUntil: offerData.validUntil?.toLocaleDateString() || 'Limited time',
        stores: offerData.stores?.join(', ') || 'All stores'
      };

      await this.createNotification(userId, template, variables);
      
      if (preferences.telegramNotifications) {
        await this.sendTelegramNotification(userId, template, variables);
      }

      this.logger.info('Promotional offer notification sent', { userId, offer: offerData.title });

    } catch (error) {
      this.logger.error('Failed to send promotional offer notification', { 
        userId, 
        error: error.message 
      });
    }
  }

  // Send weekly cashback summary
  async sendWeeklySummary(userId: string): Promise<void> {
    try {
      const preferences = await this.getUserNotificationPreferences(userId);
      
      if (!preferences.enableWeeklySummary) {
        return;
      }

      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);
      
      const summary = await this.getWeeklyCashbackSummary(userId, weekStart, new Date());
      
      if (summary.totalEarned === 0) {
        this.logger.info('No cashback activity for weekly summary', { userId });
        return;
      }

      const template = this.templates.get('WEEKLY_SUMMARY');
      if (!template) {
        throw new Error('Weekly summary template not found');
      }

      const variables = {
        totalEarned: summary.totalEarned.toFixed(2),
        transactionCount: summary.transactionCount.toString(),
        topStore: summary.topStore || 'N/A',
        currentBalance: summary.currentBalance.toFixed(2),
        weekPeriod: `${weekStart.toLocaleDateString()} - ${new Date().toLocaleDateString()}`
      };

      await this.createNotification(userId, template, variables);
      
      if (preferences.telegramNotifications) {
        await this.sendTelegramNotification(userId, template, variables);
      }

      this.logger.info('Weekly summary sent', { userId, totalEarned: summary.totalEarned });

    } catch (error) {
      this.logger.error('Failed to send weekly summary', { userId, error: error.message });
    }
  }

  // Batch send notifications
  async sendBatchNotifications(notifications: Array<{
    userId: string;
    type: string;
    data: any;
  }>): Promise<{ sent: number; failed: number; results: any[] }> {
    const results = [];
    let sent = 0;
    let failed = 0;

    this.logger.info('Sending batch notifications', { count: notifications.length });

    for (const notification of notifications) {
      try {
        switch (notification.type) {
          case 'CASHBACK_EARNED':
            await this.notifyCashbackEarned(notification.userId, notification.data);
            break;
          case 'CASHBACK_CONFIRMED':
            await this.notifyCashbackConfirmed(notification.userId, notification.data);
            break;
          case 'WITHDRAWAL_PROCESSED':
            await this.notifyWithdrawalProcessed(notification.userId, notification.data);
            break;
          case 'PROMOTIONAL_OFFER':
            await this.notifyPromotionalOffer(notification.userId, notification.data);
            break;
          case 'WEEKLY_SUMMARY':
            await this.sendWeeklySummary(notification.userId);
            break;
          default:
            throw new Error(`Unknown notification type: ${notification.type}`);
        }

        results.push({ notification, success: true });
        sent++;
      } catch (error) {
        results.push({ notification, error: error.message, success: false });
        failed++;
      }
    }

    this.logger.info('Batch notifications completed', { sent, failed, total: notifications.length });

    return { sent, failed, results };
  }

  // Manage user notification preferences
  async updateNotificationPreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<void> {
    try {
      const currentPreferences = await this.getUserNotificationPreferences(userId);
      const updatedPreferences = { ...currentPreferences, ...preferences };

      // Save to database (implementation would store in user preferences table)
      this.logger.info('Notification preferences updated', { userId, preferences });

    } catch (error) {
      this.logger.error('Failed to update notification preferences', { userId, error: error.message });
      throw error;
    }
  }

  // Get notification history
  async getNotificationHistory(userId: string, limit: number = 50): Promise<CashbackNotification[]> {
    try {
      return await this.repository.getCashbackNotificationsByUserId(userId, limit);
    } catch (error) {
      this.logger.error('Failed to get notification history', { userId, error: error.message });
      throw error;
    }
  }

  // Mark notifications as read
  async markNotificationsAsRead(userId: string, notificationIds: string[]): Promise<void> {
    try {
      for (const notificationId of notificationIds) {
        await this.repository.updateCashbackNotification(notificationId, { isRead: true });
      }

      this.logger.info('Notifications marked as read', { userId, count: notificationIds.length });
    } catch (error) {
      this.logger.error('Failed to mark notifications as read', { userId, error: error.message });
      throw error;
    }
  }

  // Private helper methods
  private async createNotification(userId: string, template: NotificationTemplate, variables: any): Promise<CashbackNotification> {
    const notification: CashbackNotification = {
      id: this.generateId(),
      userId,
      type: template.type,
      title: this.replaceVariables(template.title, variables),
      message: this.replaceVariables(template.message, variables),
      data: variables,
      isRead: false,
      createdAt: new Date()
    };

    return await this.repository.createCashbackNotification(notification);
  }

  private async sendTelegramNotification(userId: string, template: NotificationTemplate, variables: any): Promise<void> {
    try {
      const message = template.telegramMessage 
        ? this.replaceVariables(template.telegramMessage, variables)
        : this.replaceVariables(template.message, variables);

      // Get user's Telegram chat ID (implementation would fetch from user data)
      const chatId = await this.getUserTelegramChatId(userId);
      
      if (chatId) {
        await this.telegramService.sendMessage(chatId, message);
      }
    } catch (error) {
      this.logger.error('Failed to send Telegram notification', { userId, error: error.message });
    }
  }

  private async sendEmailNotification(userId: string, template: NotificationTemplate, variables: any): Promise<void> {
    try {
      // Email notification implementation would go here
      this.logger.info('Email notification would be sent', { userId, template: template.type });
    } catch (error) {
      this.logger.error('Failed to send email notification', { userId, error: error.message });
    }
  }

  private async getUserNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    // Mock implementation - in real app, this would fetch from database
    return {
      userId,
      enableCashbackEarned: true,
      enableCashbackConfirmed: true,
      enableWithdrawalProcessed: true,
      enablePromotionalOffers: true,
      enableWeeklySummary: true,
      preferredLanguage: 'en',
      telegramNotifications: true,
      emailNotifications: false
    };
  }

  private async getUserTelegramChatId(userId: string): Promise<string | null> {
    // Mock implementation - would fetch from user data
    return `chat_${userId}`;
  }

  private async getWeeklyCashbackSummary(userId: string, startDate: Date, endDate: Date): Promise<any> {
    try {
      const account = await this.repository.getCashbackAccountByUserId(userId);
      
      // Mock implementation - would calculate actual weekly summary
      return {
        totalEarned: 150.50,
        transactionCount: 5,
        topStore: 'Flipkart',
        currentBalance: account?.balance || 0
      };
    } catch (error) {
      this.logger.error('Failed to get weekly summary', { userId, error: error.message });
      return {
        totalEarned: 0,
        transactionCount: 0,
        topStore: null,
        currentBalance: 0
      };
    }
  }

  private getPaymentMethodDisplay(paymentMethod: any): string {
    if (!paymentMethod) return 'Unknown Payment Method';

    switch (paymentMethod.type) {
      case 'UPI':
        return `UPI (${paymentMethod.details.upiId})`;
      case 'PAYTM':
        return `PayTM (${paymentMethod.details.phoneNumber})`;
      case 'PHONEPE':
        return `PhonePe (${paymentMethod.details.phoneNumber})`;
      case 'BANK_ACCOUNT':
        return `Bank Account (****${paymentMethod.details.accountNumber?.slice(-4)})`;
      default:
        return paymentMethod.type;
    }
  }

  private getEnabledChannels(preferences: NotificationPreferences): string[] {
    const channels = [];
    if (preferences.telegramNotifications) channels.push('telegram');
    if (preferences.emailNotifications) channels.push('email');
    return channels;
  }

  private replaceVariables(template: string, variables: any): string {
    let result = template;
    
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      result = result.replace(new RegExp(placeholder, 'g'), String(value));
    }
    
    return result;
  }

  private initializeTemplates(): void {
    this.templates.set('CASHBACK_EARNED', {
      type: 'CASHBACK_EARNED',
      title: 'Cashback Earned! 🎉',
      message: 'You\'ve earned ₹{{amount}} cashback on your ₹{{originalAmount}} purchase from {{store}}!',
      telegramMessage: '🎉 *Cashback Earned!*\n\nYou\'ve earned *₹{{amount}}* cashback on your ₹{{originalAmount}} purchase from {{store}}!\n\nTransaction ID: `{{transactionId}}`',
      variables: ['amount', 'originalAmount', 'store', 'transactionId']
    });

    this.templates.set('CASHBACK_CONFIRMED', {
      type: 'CASHBACK_CONFIRMED',
      title: 'Cashback Confirmed ✅',
      message: 'Your ₹{{amount}} cashback from {{store}} has been confirmed and added to your balance. Current balance: ₹{{balance}}',
      telegramMessage: '✅ *Cashback Confirmed*\n\nYour ₹{{amount}} cashback from {{store}} has been confirmed and added to your balance.\n\n💰 Current balance: *₹{{balance}}*',
      variables: ['amount', 'store', 'balance']
    });

    this.templates.set('WITHDRAWAL_PROCESSED', {
      type: 'WITHDRAWAL_PROCESSED',
      title: 'Withdrawal Processed 💸',
      message: 'Your withdrawal of ₹{{amount}} to {{paymentMethod}} has been processed successfully on {{processedDate}}.',
      telegramMessage: '💸 *Withdrawal Processed*\n\nYour withdrawal of *₹{{amount}}* to {{paymentMethod}} has been processed successfully.\n\n📅 Processed on: {{processedDate}}\n🆔 Withdrawal ID: `{{withdrawalId}}`',
      variables: ['amount', 'paymentMethod', 'processedDate', 'withdrawalId']
    });

    this.templates.set('PROMOTIONAL_OFFER', {
      type: 'PROMOTIONAL_OFFER',
      title: 'Special Cashback Offer! 🔥',
      message: '{{offerTitle}}: {{offerDescription}}. Get {{bonusRate}}% extra cashback at {{stores}}. Valid until {{validUntil}}.',
      telegramMessage: '🔥 *Special Cashback Offer!*\n\n*{{offerTitle}}*\n{{offerDescription}}\n\n💰 Get *{{bonusRate}}%* extra cashback at {{stores}}\n⏰ Valid until: {{validUntil}}',
      variables: ['offerTitle', 'offerDescription', 'bonusRate', 'stores', 'validUntil']
    });

    this.templates.set('WEEKLY_SUMMARY', {
      type: 'WEEKLY_SUMMARY',
      title: 'Your Weekly Cashback Summary 📊',
      message: 'This week ({{weekPeriod}}): You earned ₹{{totalEarned}} from {{transactionCount}} transactions. Top store: {{topStore}}. Current balance: ₹{{currentBalance}}',
      telegramMessage: '📊 *Your Weekly Cashback Summary*\n\n📅 Period: {{weekPeriod}}\n💰 Total earned: *₹{{totalEarned}}*\n🛒 Transactions: {{transactionCount}}\n🏪 Top store: {{topStore}}\n💳 Current balance: *₹{{currentBalance}}*',
      variables: ['weekPeriod', 'totalEarned', 'transactionCount', 'topStore', 'currentBalance']
    });
  }

  private generateId(): string {
    return `cbn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
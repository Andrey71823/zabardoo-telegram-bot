import { EventEmitter } from 'events';
import { logger } from '../../config/logger';
import { BotUser } from '../telegram/EnhancedTelegramBot';

export interface SmartNotification {
  id: string;
  userId: string;
  type: 'price_drop' | 'flash_sale' | 'personalized_deal' | 'achievement' | 'quest_reminder' | 'cashback_ready';
  title: string;
  message: string;
  emoji: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  scheduledFor: Date;
  sent: boolean;
  data?: any;
}

export interface NotificationPreferences {
  priceDrops: boolean;
  flashSales: boolean;
  personalizedDeals: boolean;
  achievements: boolean;
  questReminders: boolean;
  cashbackUpdates: boolean;
  quietHours: { start: string; end: string };
  frequency: 'instant' | 'hourly' | 'daily';
}

export class SmartNotificationService extends EventEmitter {
  private notifications: Map<string, SmartNotification[]> = new Map();
  private userPreferences: Map<string, NotificationPreferences> = new Map();
  private notificationQueue: SmartNotification[] = [];
  private processingTimer?: NodeJS.Timeout;

  constructor() {
    super();
    this.startNotificationProcessor();
    logger.info('SmartNotificationService: Initialized with AI-powered notifications! 🔔');
  }

  async schedulePersonalizedNotification(
    user: BotUser,
    type: SmartNotification['type'],
    data: any
  ): Promise<void> {
    const notification = await this.createSmartNotification(user, type, data);
    
    if (!notification) return;

    // Add to user's notification list
    const userNotifications = this.notifications.get(user.id) || [];
    userNotifications.push(notification);
    this.notifications.set(user.id, userNotifications);

    // Add to processing queue
    this.notificationQueue.push(notification);

    logger.info(`SmartNotificationService: Scheduled ${type} notification for user ${user.id}`);
  }

  private async createSmartNotification(
    user: BotUser,
    type: SmartNotification['type'],
    data: any
  ): Promise<SmartNotification | null> {
    const preferences = this.getUserPreferences(user.id);
    
    // Check if user wants this type of notification
    if (!this.shouldSendNotification(type, preferences)) {
      return null;
    }

    const scheduledFor = this.calculateOptimalTime(user, type, preferences);
    
    const notification: SmartNotification = {
      id: `${user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: user.id,
      type,
      title: '',
      message: '',
      emoji: '',
      priority: this.calculatePriority(type, data),
      scheduledFor,
      sent: false,
      data
    };

    // Generate personalized content
    await this.generateNotificationContent(notification, user, data);

    return notification;
  }

  private async generateNotificationContent(
    notification: SmartNotification,
    user: BotUser,
    data: any
  ): Promise<void> {
    const timeOfDay = this.getTimeOfDay();
    const userName = user.firstName;
    const userLevel = user.level;
    const levelEmoji = this.getLevelEmoji(userLevel);

    switch (notification.type) {
      case 'price_drop':
        notification.emoji = '📉';
        notification.title = `Price Drop Alert! ${levelEmoji}`;
        notification.message = `Hey ${userName}! 🎉\n\nThe ${data.productName} you were watching just dropped to ₹${data.newPrice} (was ₹${data.oldPrice})!\n\n💰 Save ₹${data.oldPrice - data.newPrice} right now!\n\n⏰ Hurry, only ${data.stock} left in stock!`;
        break;

      case 'flash_sale':
        notification.emoji = '⚡';
        notification.title = `Flash Sale Alert! ${levelEmoji}`;
        notification.message = `${timeOfDay} ${userName}! ⚡\n\n🔥 FLASH SALE in your favorite category: ${data.category}!\n\n💥 Up to ${data.discount}% OFF\n⏰ Only ${data.timeLeft} left!\n\n🏃‍♂️ Don't miss out - these deals are flying off the shelves!`;
        break;

      case 'personalized_deal':
        notification.emoji = '🎯';
        notification.title = `Perfect Deal for You! ${levelEmoji}`;
        notification.message = `${userName}, I found something special! 🎯\n\n✨ ${data.dealTitle}\n💰 ${data.discount}% OFF - Save ₹${data.savings}\n🎁 Plus ${data.cashback}% cashback!\n\n🤖 AI Confidence: ${data.matchScore}% perfect match for you!`;
        break;

      case 'achievement':
        notification.emoji = '🏆';
        notification.title = `Achievement Unlocked! ${levelEmoji}`;
        notification.message = `Congratulations ${userName}! 🎉\n\n🏆 You've unlocked: "${data.achievementName}"\n${data.achievementEmoji} ${data.description}\n\n🎁 Rewards:\n⚡ +${data.xpReward} XP\n💰 +₹${data.cashbackBonus} bonus cashback!`;
        break;

      case 'quest_reminder':
        notification.emoji = '🎮';
        notification.title = `Quest Reminder ${levelEmoji}`;
        notification.message = `${userName}, don't forget! 🎮\n\n📋 Daily Quest: "${data.questTitle}"\n${data.questEmoji} ${data.description}\n\n📊 Progress: ${data.progress}/${data.target}\n🎁 Reward: ${data.xpReward} XP + ₹${data.cashbackReward}\n\n⏰ ${data.timeLeft} left to complete!`;
        break;

      case 'cashback_ready':
        notification.emoji = '💸';
        notification.title = `Cashback Ready! ${levelEmoji}`;
        notification.message = `Great news ${userName}! 💸\n\n✅ Your cashback of ₹${data.amount} is ready!\n🏦 From: ${data.storeName}\n📅 Purchase: ${data.purchaseDate}\n\n💳 Withdraw now or keep earning more!\n\n🎯 Total pending: ₹${data.totalPending}`;
        break;
    }
  }

  private calculateOptimalTime(
    user: BotUser,
    type: SmartNotification['type'],
    preferences: NotificationPreferences
  ): Date {
    const now = new Date();
    const userTimezone = user.preferences?.notificationTime || '09:00';
    
    // Parse user's preferred notification time
    const [hours, minutes] = userTimezone.split(':').map(Number);
    
    // Check quiet hours
    const quietStart = preferences.quietHours.start;
    const quietEnd = preferences.quietHours.end;
    
    if (this.isInQuietHours(now, quietStart, quietEnd)) {
      // Schedule for after quiet hours
      const nextDay = new Date(now);
      nextDay.setDate(nextDay.getDate() + 1);
      nextDay.setHours(hours, minutes, 0, 0);
      return nextDay;
    }

    // Immediate notifications for urgent types
    if (type === 'flash_sale' || type === 'achievement') {
      return now;
    }

    // Schedule based on frequency preference
    switch (preferences.frequency) {
      case 'instant':
        return now;
      case 'hourly':
        const nextHour = new Date(now);
        nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
        return nextHour;
      case 'daily':
        const nextDay = new Date(now);
        nextDay.setDate(nextDay.getDate() + 1);
        nextDay.setHours(hours, minutes, 0, 0);
        return nextDay;
      default:
        return now;
    }
  }

  private calculatePriority(type: SmartNotification['type'], data: any): SmartNotification['priority'] {
    switch (type) {
      case 'flash_sale':
        return data.timeLeft < 3600000 ? 'urgent' : 'high'; // Less than 1 hour
      case 'price_drop':
        return data.discountPercent > 50 ? 'high' : 'medium';
      case 'achievement':
        return data.rarity === 'legendary' ? 'high' : 'medium';
      case 'cashback_ready':
        return data.amount > 1000 ? 'high' : 'medium';
      case 'personalized_deal':
        return data.matchScore > 90 ? 'high' : 'medium';
      case 'quest_reminder':
        return data.timeLeft < 7200000 ? 'medium' : 'low'; // Less than 2 hours
      default:
        return 'medium';
    }
  }

  private startNotificationProcessor(): void {
    this.processingTimer = setInterval(() => {
      this.processNotificationQueue();
    }, 60000); // Check every minute
  }

  private async processNotificationQueue(): Promise<void> {
    const now = new Date();
    const readyNotifications = this.notificationQueue.filter(
      notification => !notification.sent && notification.scheduledFor <= now
    );

    for (const notification of readyNotifications) {
      try {
        await this.sendNotification(notification);
        notification.sent = true;
        
        // Remove from queue
        const index = this.notificationQueue.indexOf(notification);
        if (index > -1) {
          this.notificationQueue.splice(index, 1);
        }
        
        this.emit('notificationSent', notification);
        
      } catch (error) {
        logger.error(`SmartNotificationService: Failed to send notification ${notification.id}:`, error);
      }
    }
  }

  private async sendNotification(notification: SmartNotification): Promise<void> {
    // Emit event for the bot to handle
    this.emit('sendNotification', {
      userId: notification.userId,
      title: notification.title,
      message: notification.message,
      emoji: notification.emoji,
      priority: notification.priority,
      data: notification.data
    });

    logger.info(`SmartNotificationService: Sent ${notification.type} notification to user ${notification.userId}`);
  }

  private getUserPreferences(userId: string): NotificationPreferences {
    if (!this.userPreferences.has(userId)) {
      this.userPreferences.set(userId, {
        priceDrops: true,
        flashSales: true,
        personalizedDeals: true,
        achievements: true,
        questReminders: true,
        cashbackUpdates: true,
        quietHours: { start: '22:00', end: '08:00' },
        frequency: 'instant'
      });
    }
    return this.userPreferences.get(userId)!;
  }

  private shouldSendNotification(type: SmartNotification['type'], preferences: NotificationPreferences): boolean {
    switch (type) {
      case 'price_drop': return preferences.priceDrops;
      case 'flash_sale': return preferences.flashSales;
      case 'personalized_deal': return preferences.personalizedDeals;
      case 'achievement': return preferences.achievements;
      case 'quest_reminder': return preferences.questReminders;
      case 'cashback_ready': return preferences.cashbackUpdates;
      default: return true;
    }
  }

  private isInQuietHours(now: Date, quietStart: string, quietEnd: string): boolean {
    const currentTime = now.getHours() * 100 + now.getMinutes();
    const startTime = parseInt(quietStart.replace(':', ''));
    const endTime = parseInt(quietEnd.replace(':', ''));
    
    if (startTime > endTime) {
      // Quiet hours span midnight
      return currentTime >= startTime || currentTime <= endTime;
    } else {
      return currentTime >= startTime && currentTime <= endTime;
    }
  }

  private getTimeOfDay(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    if (hour < 21) return 'Good evening';
    return 'Good night';
  }

  private getLevelEmoji(level: number): string {
    const emojis = ['🌱', '🛍️', '🔍', '🏹', '🥷', '💎', '🧙‍♂️', '⭐', '🔥', '👑'];
    return emojis[Math.min(level - 1, emojis.length - 1)] || '🌱';
  }

  // Public methods
  updateUserPreferences(userId: string, preferences: Partial<NotificationPreferences>): void {
    const current = this.getUserPreferences(userId);
    this.userPreferences.set(userId, { ...current, ...preferences });
    logger.info(`SmartNotificationService: Updated preferences for user ${userId}`);
  }

  getUserNotifications(userId: string, limit: number = 10): SmartNotification[] {
    const notifications = this.notifications.get(userId) || [];
    return notifications
      .sort((a, b) => b.scheduledFor.getTime() - a.scheduledFor.getTime())
      .slice(0, limit);
  }

  destroy(): void {
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
    }
    logger.info('SmartNotificationService: Destroyed');
  }
}
import { EnhancedTelegramBot } from './EnhancedTelegramBot';
import { GameificationService } from '../gamification/GameificationService';
import { SmartNotificationService } from '../notification/SmartNotificationService';
import { VoiceProcessingService } from '../ai/VoiceProcessingService';
import { ImageRecognitionService } from '../ai/ImageRecognitionService';
import { logger } from '../../config/logger';

export class BotIntegrationService {
  private bot: EnhancedTelegramBot;
  private gamificationService: GameificationService;
  private notificationService: SmartNotificationService;
  private voiceService: VoiceProcessingService;
  private imageService: ImageRecognitionService;

  constructor(botToken: string) {
    // Initialize services
    this.gamificationService = new GameificationService();
    this.notificationService = new SmartNotificationService();
    this.voiceService = new VoiceProcessingService();
    this.imageService = new ImageRecognitionService();
    
    // Initialize enhanced bot
    this.bot = new EnhancedTelegramBot(botToken);
    
    this.setupIntegrations();
    logger.info('BotIntegrationService: All services integrated successfully! 🚀');
  }

  private setupIntegrations(): void {
    // Gamification events
    this.gamificationService.on('levelUp', (data) => {
      this.handleLevelUp(data);
    });

    this.gamificationService.on('achievementUnlocked', (data) => {
      this.handleAchievementUnlocked(data);
    });

    this.gamificationService.on('questCompleted', (data) => {
      this.handleQuestCompleted(data);
    });

    // Notification events
    this.notificationService.on('sendNotification', (notification) => {
      this.handleSendNotification(notification);
    });

    this.notificationService.on('notificationSent', (notification) => {
      logger.info(`BotIntegrationService: Notification sent to user ${notification.userId}`);
    });

    // Voice processing events
    this.voiceService.on('voiceProcessed', (data) => {
      this.handleVoiceProcessed(data);
    });

    // Image recognition events
    this.imageService.on('productRecognized', (data) => {
      this.handleProductRecognized(data);
    });

    // Bot events
    this.bot.on('userInteraction', (data) => {
      this.handleUserInteraction(data);
    });
  }

  private async handleLevelUp(data: any): Promise<void> {
    const { userId, oldLevel, newLevel, benefits } = data;
    
    try {
      // Send level up notification
      await this.notificationService.schedulePersonalizedNotification(
        { id: userId } as any,
        'achievement',
        {
          achievementName: `Level ${newLevel} Reached!`,
          achievementEmoji: this.getLevelEmoji(newLevel),
          description: `Congratulations! You've reached Level ${newLevel}!`,
          xpReward: newLevel * 50,
          cashbackBonus: newLevel * 25,
          benefits
        }
      );

      logger.info(`BotIntegrationService: Level up notification sent for user ${userId}`);
    } catch (error) {
      logger.error('BotIntegrationService: Error handling level up:', error);
    }
  }

  private async handleAchievementUnlocked(data: any): Promise<void> {
    const { userId, achievements } = data;
    
    try {
      for (const achievement of achievements) {
        await this.notificationService.schedulePersonalizedNotification(
          { id: userId } as any,
          'achievement',
          {
            achievementName: achievement.name,
            achievementEmoji: achievement.emoji,
            description: achievement.description,
            xpReward: achievement.xpReward,
            cashbackBonus: achievement.cashbackBonus,
            rarity: achievement.rarity
          }
        );
      }

      logger.info(`BotIntegrationService: Achievement notifications sent for user ${userId}`);
    } catch (error) {
      logger.error('BotIntegrationService: Error handling achievement unlock:', error);
    }
  }

  private async handleQuestCompleted(data: any): Promise<void> {
    const { userId, quest } = data;
    
    try {
      // Send quest completion notification
      await this.bot.sendNotification(
        parseInt(userId.split('_')[1]), // Extract telegram ID
        'Quest Completed! 🎮',
        `🎉 Congratulations! You've completed the quest "${quest.title}"!\n\n` +
        `🎁 Rewards earned:\n` +
        `⚡ +${quest.xpReward} XP\n` +
        `💰 +₹${quest.cashbackReward} cashback\n\n` +
        `Keep up the great work! 🚀`
      );

      logger.info(`BotIntegrationService: Quest completion notification sent for user ${userId}`);
    } catch (error) {
      logger.error('BotIntegrationService: Error handling quest completion:', error);
    }
  }

  private async handleSendNotification(notification: any): Promise<void> {
    try {
      const telegramId = parseInt(notification.userId.split('_')[1]);
      await this.bot.sendNotification(
        telegramId,
        notification.title,
        notification.message,
        notification.data
      );
    } catch (error) {
      logger.error('BotIntegrationService: Error sending notification:', error);
    }
  }

  private handleVoiceProcessed(data: any): void {
    const { userId, transcript, result } = data;
    
    // Award additional XP for successful voice processing
    this.gamificationService.awardXP(userId, 5, 'successful_voice_processing');
    
    logger.info(`BotIntegrationService: Voice processed for user ${userId}: "${transcript}"`);
  }

  private handleProductRecognized(data: any): void {
    const { userId, result } = data;
    
    // Award XP based on recognition confidence
    const xpReward = Math.floor(result.confidence / 10);
    this.gamificationService.awardXP(userId, xpReward, 'product_recognition');
    
    logger.info(`BotIntegrationService: Product recognized for user ${userId}: ${result.productName}`);
  }

  private handleUserInteraction(data: any): void {
    const { userId, action, details } = data;
    
    // Update user activity and award micro-XP
    this.gamificationService.awardXP(userId, 1, 'interaction');
    
    // Update quest progress based on action
    switch (action) {
      case 'view_deal':
        this.gamificationService.updateQuestProgress(userId, 'view_deals');
        break;
      case 'share_deal':
        this.gamificationService.updateQuestProgress(userId, 'share_deal');
        break;
      case 'make_purchase':
        this.gamificationService.updateQuestProgress(userId, 'make_purchase');
        break;
    }
  }

  // Public methods for external integration
  async sendPersonalizedDealAlert(userId: string, deal: any): Promise<void> {
    try {
      await this.notificationService.schedulePersonalizedNotification(
        { id: userId } as any,
        'personalized_deal',
        {
          dealTitle: deal.title,
          discount: deal.discount,
          savings: deal.originalPrice - deal.discountedPrice,
          cashback: deal.cashback,
          matchScore: deal.matchScore || 85,
          store: deal.store
        }
      );
    } catch (error) {
      logger.error('BotIntegrationService: Error sending deal alert:', error);
    }
  }

  async sendPriceDropAlert(userId: string, product: any): Promise<void> {
    try {
      await this.notificationService.schedulePersonalizedNotification(
        { id: userId } as any,
        'price_drop',
        {
          productName: product.name,
          oldPrice: product.oldPrice,
          newPrice: product.newPrice,
          stock: product.stock || 10,
          discountPercent: Math.round(((product.oldPrice - product.newPrice) / product.oldPrice) * 100)
        }
      );
    } catch (error) {
      logger.error('BotIntegrationService: Error sending price drop alert:', error);
    }
  }

  async sendFlashSaleAlert(userId: string, sale: any): Promise<void> {
    try {
      await this.notificationService.schedulePersonalizedNotification(
        { id: userId } as any,
        'flash_sale',
        {
          category: sale.category,
          discount: sale.discount,
          timeLeft: sale.timeLeft,
          dealsCount: sale.dealsCount || 50
        }
      );
    } catch (error) {
      logger.error('BotIntegrationService: Error sending flash sale alert:', error);
    }
  }

  async sendCashbackReadyNotification(userId: string, cashback: any): Promise<void> {
    try {
      await this.notificationService.schedulePersonalizedNotification(
        { id: userId } as any,
        'cashback_ready',
        {
          amount: cashback.amount,
          storeName: cashback.store,
          purchaseDate: cashback.purchaseDate,
          totalPending: cashback.totalPending
        }
      );
    } catch (error) {
      logger.error('BotIntegrationService: Error sending cashback notification:', error);
    }
  }

  // Analytics and monitoring
  getServiceStats(): any {
    return {
      bot: {
        userCount: this.bot.getUserCount(),
        activeUsers: this.bot.getActiveUsers().length
      },
      gamification: {
        // Add gamification stats
      },
      notifications: {
        // Add notification stats
      },
      voice: {
        // Add voice processing stats
      },
      image: {
        // Add image recognition stats
      }
    };
  }

  // Utility methods
  private getLevelEmoji(level: number): string {
    const emojis = ['🌱', '🛍️', '🔍', '🏹', '🥷', '💎', '🧙‍♂️', '⭐', '🔥', '👑'];
    return emojis[Math.min(level - 1, emojis.length - 1)] || '🌱';
  }

  // Cleanup
  destroy(): void {
    try {
      this.bot.destroy();
      this.gamificationService.destroy();
      this.notificationService.destroy();
      this.voiceService.destroy();
      this.imageService.destroy();
      
      logger.info('BotIntegrationService: All services destroyed successfully');
    } catch (error) {
      logger.error('BotIntegrationService: Error during cleanup:', error);
    }
  }
}
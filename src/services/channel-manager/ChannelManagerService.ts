import { BaseService } from '../base/BaseService';
import { Request, Response } from 'express';
import { UserRepository } from '../../repositories/UserRepository';
import { PersonalChannelRepository } from '../../repositories/PersonalChannelRepository';
import { TelegramBotService } from '../telegram/TelegramBotService';
import { pgPool } from '../../config/database';
import { CreateUserRequest, User } from '../../models/User';
import { ChannelMessage, ChannelActivity } from '../../models/PersonalChannel';
import config from '../../config';
import { recordCouponRecommendation } from '../../config/monitoring';

export class ChannelManagerService extends BaseService {
  private userRepository: UserRepository;
  private channelRepository: PersonalChannelRepository;
  private telegramBot: TelegramBotService;

  constructor() {
    super('channel-manager', 3001);
    this.userRepository = new UserRepository(pgPool);
    this.channelRepository = new PersonalChannelRepository(pgPool);
    
    if (!config.apis.telegram.botToken) {
      throw new Error('Telegram bot token is required');
    }
    
    this.telegramBot = new TelegramBotService(config.apis.telegram.botToken);
  }

  protected async initialize(): Promise<void> {
    // Setup webhook if configured
    if (config.apis.telegram.webhookUrl) {
      await this.telegramBot.setWebhook(config.apis.telegram.webhookUrl);
    }
  }

  protected setupServiceRoutes(): void {
    // User management routes
    this.app.post('/users', this.createUser.bind(this));
    this.app.get('/users/:telegramId', this.getUserByTelegramId.bind(this));
    this.app.put('/users/:telegramId/activity', this.updateUserActivity.bind(this));
    
    // Personal channel management routes
    this.app.post('/personal-channel', this.createPersonalChannel.bind(this));
    this.app.get('/personal-channel/:userId', this.getPersonalChannel.bind(this));
    this.app.post('/personal-channel/:channelId/message', this.sendToPersonalChannel.bind(this));
    this.app.get('/personal-channel/:channelId/activity', this.getChannelActivity.bind(this));
    
    // Bulk operations
    this.app.post('/personal-channels/bulk-message', this.sendBulkMessages.bind(this));
    this.app.post('/personal-channels/sync-coupon', this.syncCouponToPersonalChannels.bind(this));
    
    // Channel analytics
    this.app.get('/analytics/channels', this.getChannelAnalytics.bind(this));
    this.app.get('/analytics/users', this.getUserAnalytics.bind(this));
    
    // Webhook endpoint for Telegram
    this.app.post('/webhook/telegram', this.handleTelegramWebhook.bind(this));
  }

  protected async checkServiceHealth(): Promise<boolean> {
    try {
      // Check database connections
      const testUser = await this.userRepository.getActiveUsers(1);
      const testChannels = await this.channelRepository.getActiveChannels(1);
      
      this.logger.info('Channel Manager health check passed');
      return true;
    } catch (error) {
      this.logger.error('Channel Manager health check failed:', error);
      return false;
    }
  }

  // User Management Methods
  private async createUser(req: Request, res: Response): Promise<void> {
    try {
      const userData: CreateUserRequest = req.body;
      
      if (!userData.telegramId || !userData.firstName) {
        res.status(400).json({ error: 'telegramId and firstName are required' });
        return;
      }

      // Check if user already exists
      const existingUser = await this.userRepository.getUserByTelegramId(userData.telegramId);
      if (existingUser) {
        res.status(409).json({ error: 'User already exists', user: existingUser });
        return;
      }

      // Create user
      const user = await this.userRepository.createUser(userData);
      
      // Create personal channel
      const channelData = {
        userId: user.id,
        channelId: user.personalChannelId
      };
      
      const channel = await this.channelRepository.createPersonalChannel(channelData);
      
      this.logger.info(`Created user ${user.telegramId} with personal channel ${channel.channelId}`);
      
      res.status(201).json({
        user,
        channel,
        message: 'User and personal channel created successfully'
      });
    } catch (error) {
      this.logger.error('Error creating user:', error);
      res.status(500).json({ error: 'Failed to create user' });
    }
  }

  private async getUserByTelegramId(req: Request, res: Response): Promise<void> {
    try {
      const telegramId = parseInt(req.params.telegramId);
      
      if (isNaN(telegramId)) {
        res.status(400).json({ error: 'Invalid telegram ID' });
        return;
      }

      const user = await this.userRepository.getUserByTelegramId(telegramId);
      
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const channel = await this.channelRepository.getChannelByUserId(user.id);
      
      res.json({ user, channel });
    } catch (error) {
      this.logger.error('Error getting user:', error);
      res.status(500).json({ error: 'Failed to get user' });
    }
  }

  private async updateUserActivity(req: Request, res: Response): Promise<void> {
    try {
      const telegramId = parseInt(req.params.telegramId);
      
      if (isNaN(telegramId)) {
        res.status(400).json({ error: 'Invalid telegram ID' });
        return;
      }

      await this.userRepository.updateLastActive(telegramId);
      
      res.json({ success: true, timestamp: new Date() });
    } catch (error) {
      this.logger.error('Error updating user activity:', error);
      res.status(500).json({ error: 'Failed to update user activity' });
    }
  }

  // Personal Channel Management Methods
  private async createPersonalChannel(req: Request, res: Response): Promise<void> {
    try {
      const { telegramId, firstName, lastName, username, languageCode } = req.body;
      
      if (!telegramId || !firstName) {
        res.status(400).json({ error: 'telegramId and firstName are required' });
        return;
      }

      // Create user first
      const userData: CreateUserRequest = {
        telegramId,
        firstName,
        lastName,
        username,
        languageCode
      };

      const user = await this.userRepository.createUser(userData);
      
      // Create personal channel
      const channelData = {
        userId: user.id,
        channelId: user.personalChannelId
      };
      
      const channel = await this.channelRepository.createPersonalChannel(channelData);
      
      // Send welcome message
      const welcomeMessage: ChannelMessage = {
        channelId: channel.channelId,
        message: `🎉 Добро пожаловать в Zabardoo, ${firstName}!\n\nВаш персональный канал готов к работе. Здесь вы будете получать персонализированные рекомендации купонов и сможете общаться с AI-помощником.\n\n💡 Напишите "помощь" чтобы узнать больше о возможностях.`,
        messageType: 'text'
      };
      
      await this.telegramBot.sendMessage(welcomeMessage);
      
      this.logger.info(`Created personal channel for user ${telegramId}`);
      res.status(201).json({ user, channel });
    } catch (error) {
      this.logger.error('Error creating personal channel:', error);
      res.status(500).json({ error: 'Failed to create personal channel' });
    }
  }

  private async getPersonalChannel(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      
      const channel = await this.channelRepository.getChannelByUserId(userId);
      
      if (!channel) {
        res.status(404).json({ error: 'Personal channel not found' });
        return;
      }

      const user = await this.userRepository.getUserById(userId);
      
      res.json({ channel, user });
    } catch (error) {
      this.logger.error('Error getting personal channel:', error);
      res.status(500).json({ error: 'Failed to get personal channel' });
    }
  }

  private async sendToPersonalChannel(req: Request, res: Response): Promise<void> {
    try {
      const { channelId } = req.params;
      const { message, messageType = 'text', metadata } = req.body;
      
      if (!message) {
        res.status(400).json({ error: 'message is required' });
        return;
      }

      const channel = await this.channelRepository.getChannelByChannelId(channelId);
      if (!channel) {
        res.status(404).json({ error: 'Channel not found' });
        return;
      }

      const channelMessage: ChannelMessage = {
        channelId,
        message,
        messageType,
        metadata
      };

      const success = await this.telegramBot.sendMessage(channelMessage);
      
      if (success) {
        // Record activity
        const activity: ChannelActivity = {
          channelId,
          userId: channel.userId,
          activityType: 'message_sent',
          timestamp: new Date(),
          metadata: { messageType, success: true }
        };
        
        await this.channelRepository.recordActivity(activity);
        
        // Update channel last message time
        await this.channelRepository.updateChannel(channelId, {
          lastMessageAt: new Date()
        });
      }

      this.logger.info(`Sent message to personal channel ${channelId}: ${success ? 'success' : 'failed'}`);
      res.json({ success, timestamp: new Date() });
    } catch (error) {
      this.logger.error('Error sending to personal channel:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  }

  private async getChannelActivity(req: Request, res: Response): Promise<void> {
    try {
      const { channelId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const activity = await this.channelRepository.getChannelActivity(channelId, limit);
      
      res.json({ channelId, activity, count: activity.length });
    } catch (error) {
      this.logger.error('Error getting channel activity:', error);
      res.status(500).json({ error: 'Failed to get channel activity' });
    }
  }

  // Bulk Operations
  private async sendBulkMessages(req: Request, res: Response): Promise<void> {
    try {
      const { messages } = req.body;
      
      if (!Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({ error: 'messages array is required' });
        return;
      }

      const result = await this.telegramBot.sendBulkMessages(messages);
      
      this.logger.info(`Bulk message results: ${result.success} success, ${result.failed} failed`);
      res.json(result);
    } catch (error) {
      this.logger.error('Error sending bulk messages:', error);
      res.status(500).json({ error: 'Failed to send bulk messages' });
    }
  }

  private async syncCouponToPersonalChannels(req: Request, res: Response): Promise<void> {
    try {
      const { coupon, targetUsers, messageTemplate } = req.body;
      
      if (!coupon || !targetUsers || !Array.isArray(targetUsers)) {
        res.status(400).json({ error: 'coupon and targetUsers array are required' });
        return;
      }

      const messages: ChannelMessage[] = [];
      
      for (const userId of targetUsers) {
        const user = await this.userRepository.getUserById(userId);
        if (!user) continue;
        
        const channel = await this.channelRepository.getChannelByUserId(userId);
        if (!channel || !channel.isActive) continue;
        
        const personalizedMessage = messageTemplate || 
          `🎯 Персональная рекомендация для вас!\n\n${coupon.title}\n${coupon.description}\n\n💰 Скидка: ${coupon.discount_value}${coupon.discount_type === 'percentage' ? '%' : '₹'}`;
        
        messages.push({
          channelId: channel.channelId,
          message: personalizedMessage,
          messageType: 'coupon',
          metadata: {
            couponId: coupon.id,
            buttons: [{
              text: '🛒 Получить купон',
              url: coupon.site_page_url
            }]
          }
        });
        
        // Record recommendation metric
        recordCouponRecommendation('personal', 'targeted');
      }

      const result = await this.telegramBot.sendBulkMessages(messages);
      
      this.logger.info(`Synced coupon ${coupon.id} to ${targetUsers.length} personal channels`);
      res.json({ 
        success: true, 
        targetUsers: targetUsers.length,
        messagesSent: result.success,
        messagesFailed: result.failed,
        timestamp: new Date() 
      });
    } catch (error) {
      this.logger.error('Error syncing coupon to personal channels:', error);
      res.status(500).json({ error: 'Failed to sync coupon' });
    }
  }

  // Analytics Methods
  private async getChannelAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const activeChannels = await this.channelRepository.getActiveChannels(1000);
      const totalChannels = activeChannels.length;
      
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      const recentlyActiveChannels = activeChannels.filter(channel => 
        channel.lastMessageAt && channel.lastMessageAt > oneHourAgo
      );
      
      const averageEngagement = activeChannels.reduce((sum, channel) => 
        sum + channel.engagementScore, 0) / totalChannels || 0;
      
      const analytics = {
        totalPersonalChannels: totalChannels,
        activeChannels: recentlyActiveChannels.length,
        messagesLastHour: recentlyActiveChannels.length,
        averageEngagement: Math.round(averageEngagement * 100) / 100,
        timestamp: new Date(),
      };

      res.json(analytics);
    } catch (error) {
      this.logger.error('Error getting channel analytics:', error);
      res.status(500).json({ error: 'Failed to get analytics' });
    }
  }

  private async getUserAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const activeUsers = await this.userRepository.getActiveUsers(1000);
      const totalUsers = activeUsers.length;
      
      const totalLifetimeValue = activeUsers.reduce((sum, user) => 
        sum + user.lifetimeValue, 0);
      
      const averageLifetimeValue = totalLifetimeValue / totalUsers || 0;
      
      const highRiskUsers = activeUsers.filter(user => user.churnRisk > 0.7).length;
      
      const analytics = {
        totalUsers,
        activeUsers: totalUsers,
        averageLifetimeValue: Math.round(averageLifetimeValue * 100) / 100,
        highRiskUsers,
        totalLifetimeValue: Math.round(totalLifetimeValue * 100) / 100,
        timestamp: new Date(),
      };

      res.json(analytics);
    } catch (error) {
      this.logger.error('Error getting user analytics:', error);
      res.status(500).json({ error: 'Failed to get user analytics' });
    }
  }

  // Webhook Handler
  private async handleTelegramWebhook(req: Request, res: Response): Promise<void> {
    try {
      const update = req.body;
      
      this.telegramBot.processUpdate(update);
      
      // Update user activity if message is from a user
      if (update.message?.from?.id) {
        await this.userRepository.updateLastActive(update.message.from.id);
      }
      
      res.status(200).json({ ok: true });
    } catch (error) {
      this.logger.error('Error handling Telegram webhook:', error);
      res.status(500).json({ error: 'Failed to process webhook' });
    }
  }
}

// Start service if run directly
if (require.main === module) {
  const service = new ChannelManagerService();
  service.setupGracefulShutdown();
  service.start();
}
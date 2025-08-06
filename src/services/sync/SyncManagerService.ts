import { BaseService } from '../base/BaseService';
import { Request, Response } from 'express';
import { ContentSyncRepository } from '../../repositories/ContentSyncRepository';
import { UserRepository } from '../../repositories/UserRepository';
import { PersonalChannelRepository } from '../../repositories/PersonalChannelRepository';
import { GroupRepository } from '../../repositories/GroupRepository';
import { TelegramBotService } from '../telegram/TelegramBotService';
import { ContentSyncService } from './ContentSyncService';
import { pgPool } from '../../config/database';
import { ContentSyncRule, UserContentPreference } from '../../models/ContentSync';
import config from '../../config';

export class SyncManagerService extends BaseService {
  private syncRepository: ContentSyncRepository;
  private userRepository: UserRepository;
  private channelRepository: PersonalChannelRepository;
  private groupRepository: GroupRepository;
  private telegramBot: TelegramBotService;
  private contentSyncService: ContentSyncService;

  constructor() {
    super('sync-manager', 3008);
    
    this.syncRepository = new ContentSyncRepository(pgPool);
    this.userRepository = new UserRepository(pgPool);
    this.channelRepository = new PersonalChannelRepository(pgPool);
    this.groupRepository = new GroupRepository(pgPool);
    
    if (!config.apis.telegram.botToken) {
      throw new Error('Telegram bot token is required');
    }
    
    this.telegramBot = new TelegramBotService(config.apis.telegram.botToken);
    this.contentSyncService = new ContentSyncService(
      this.syncRepository,
      this.userRepository,
      this.channelRepository,
      this.groupRepository,
      this.telegramBot
    );
  }

  protected async initialize(): Promise<void> {
    // Start the sync processor
    this.contentSyncService.startSyncProcessor(30000); // 30 seconds
    this.logger.info('Content sync processor started');
  }

  protected setupServiceRoutes(): void {
    // Sync Rules Management
    this.app.post('/sync-rules', this.createSyncRule.bind(this));
    this.app.get('/sync-rules', this.getSyncRules.bind(this));
    this.app.get('/sync-rules/:ruleId', this.getSyncRule.bind(this));
    this.app.put('/sync-rules/:ruleId', this.updateSyncRule.bind(this));
    this.app.delete('/sync-rules/:ruleId', this.deleteSyncRule.bind(this));

    // Popular Content Management
    this.app.get('/popular-content', this.getPopularContent.bind(this));
    this.app.post('/popular-content/analyze/:groupId', this.analyzeGroupContent.bind(this));
    this.app.put('/popular-content/:contentId/popularity', this.updateContentPopularity.bind(this));

    // User Preferences Management
    this.app.get('/users/:userId/preferences', this.getUserPreferences.bind(this));
    this.app.put('/users/:userId/preferences', this.updateUserPreferences.bind(this));
    this.app.delete('/users/:userId/preferences', this.resetUserPreferences.bind(this));

    // Sync Jobs Management
    this.app.get('/sync-jobs', this.getSyncJobs.bind(this));
    this.app.post('/sync-jobs/process', this.processSyncJobs.bind(this));
    this.app.post('/sync-jobs/manual', this.createManualSyncJob.bind(this));
    this.app.get('/sync-jobs/:jobId', this.getSyncJob.bind(this));

    // Content Synchronization
    this.app.post('/sync/group-to-channels', this.syncGroupToChannels.bind(this));
    this.app.post('/sync/popular-content', this.syncPopularContent.bind(this));
    this.app.post('/sync/test', this.testSync.bind(this));

    // Analytics
    this.app.get('/analytics/sync', this.getSyncAnalytics.bind(this));
    this.app.get('/analytics/popular-content', this.getPopularContentAnalytics.bind(this));
    this.app.get('/analytics/user-preferences', this.getUserPreferencesAnalytics.bind(this));

    // Webhooks
    this.app.post('/webhook/content-update', this.handleContentUpdate.bind(this));
  }

  protected async checkServiceHealth(): Promise<boolean> {
    try {
      const rules = await this.contentSyncService.getSyncRules(true);
      return true;
    } catch (error) {
      this.logger.error('Sync Manager health check failed:', error);
      return false;
    }
  }

  // Sync Rules Management
  private async createSyncRule(req: Request, res: Response): Promise<void> {
    try {
      const ruleData: Partial<ContentSyncRule> = req.body;
      
      if (!ruleData.sourceType || !ruleData.sourceId || !ruleData.targetType) {
        res.status(400).json({ error: 'sourceType, sourceId, and targetType are required' });
        return;
      }

      const rule = await this.contentSyncService.createSyncRule(ruleData);
      
      this.logger.info(`Created sync rule: ${rule.sourceType}:${rule.sourceId} -> ${rule.targetType}`);
      res.status(201).json(rule);
    } catch (error) {
      this.logger.error('Error creating sync rule:', error);
      res.status(500).json({ error: 'Failed to create sync rule' });
    }
  }

  private async getSyncRules(req: Request, res: Response): Promise<void> {
    try {
      const isActive = req.query.active === 'true' ? true : req.query.active === 'false' ? false : undefined;
      const rules = await this.contentSyncService.getSyncRules(isActive);
      
      res.json({ rules, count: rules.length });
    } catch (error) {
      this.logger.error('Error getting sync rules:', error);
      res.status(500).json({ error: 'Failed to get sync rules' });
    }
  }

  private async updateSyncRule(req: Request, res: Response): Promise<void> {
    try {
      const { ruleId } = req.params;
      const updates = req.body;
      
      const rule = await this.contentSyncService.updateSyncRule(ruleId, updates);
      
      if (!rule) {
        res.status(404).json({ error: 'Sync rule not found' });
        return;
      }

      res.json(rule);
    } catch (error) {
      this.logger.error('Error updating sync rule:', error);
      res.status(500).json({ error: 'Failed to update sync rule' });
    }
  }

  // Popular Content Management
  private async getPopularContent(req: Request, res: Response): Promise<void> {
    try {
      const minScore = parseInt(req.query.minScore as string) || 50;
      const contentType = req.query.contentType as string;
      const limit = parseInt(req.query.limit as string) || 100;
      
      const content = await this.contentSyncService.getPopularContent(minScore, contentType);
      
      res.json({ content, count: content.length });
    } catch (error) {
      this.logger.error('Error getting popular content:', error);
      res.status(500).json({ error: 'Failed to get popular content' });
    }
  }

  private async analyzeGroupContent(req: Request, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      
      await this.contentSyncService.analyzeAndSyncPopularContent(groupId);
      
      res.json({ success: true, message: 'Content analysis started' });
    } catch (error) {
      this.logger.error('Error analyzing group content:', error);
      res.status(500).json({ error: 'Failed to analyze group content' });
    }
  }

  // User Preferences Management
  private async getUserPreferences(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      
      const preferences = await this.contentSyncService.getUserPreferences(userId);
      
      if (!preferences) {
        res.status(404).json({ error: 'User preferences not found' });
        return;
      }

      res.json(preferences);
    } catch (error) {
      this.logger.error('Error getting user preferences:', error);
      res.status(500).json({ error: 'Failed to get user preferences' });
    }
  }

  private async updateUserPreferences(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const preferences: Partial<UserContentPreference> = req.body;
      
      const updatedPreferences = await this.contentSyncService.updateUserPreferences(userId, preferences);
      
      this.logger.info(`Updated preferences for user ${userId}`);
      res.json(updatedPreferences);
    } catch (error) {
      this.logger.error('Error updating user preferences:', error);
      res.status(500).json({ error: 'Failed to update user preferences' });
    }
  }

  // Sync Jobs Management
  private async processSyncJobs(req: Request, res: Response): Promise<void> {
    try {
      await this.contentSyncService.processSyncJobs();
      
      res.json({ success: true, message: 'Sync jobs processing started' });
    } catch (error) {
      this.logger.error('Error processing sync jobs:', error);
      res.status(500).json({ error: 'Failed to process sync jobs' });
    }
  }

  private async createManualSyncJob(req: Request, res: Response): Promise<void> {
    try {
      const { ruleId, sourceContent, targetChannels } = req.body;
      
      if (!ruleId || !sourceContent || !targetChannels) {
        res.status(400).json({ error: 'ruleId, sourceContent, and targetChannels are required' });
        return;
      }

      const job = await this.syncRepository.createSyncJob({
        ruleId,
        sourceContent,
        targetChannels,
        status: 'pending'
      });
      
      res.status(201).json(job);
    } catch (error) {
      this.logger.error('Error creating manual sync job:', error);
      res.status(500).json({ error: 'Failed to create sync job' });
    }
  }

  // Content Synchronization
  private async syncGroupToChannels(req: Request, res: Response): Promise<void> {
    try {
      const { groupId, messageId, targetFilters } = req.body;
      
      if (!groupId || !messageId) {
        res.status(400).json({ error: 'groupId and messageId are required' });
        return;
      }

      // Get the message from group
      const messages = await this.groupRepository.getRecentMessages(groupId, 100);
      const message = messages.find(msg => msg.messageId === messageId);
      
      if (!message) {
        res.status(404).json({ error: 'Message not found' });
        return;
      }

      // Create sync job
      const job = await this.syncRepository.createSyncJob({
        ruleId: 'manual-sync',
        sourceContent: {
          id: message.messageId,
          type: message.messageType,
          content: message.content,
          metadata: {}
        },
        targetChannels: [], // Will be populated based on filters
        status: 'pending'
      });

      res.json({ success: true, jobId: job.id });
    } catch (error) {
      this.logger.error('Error syncing group to channels:', error);
      res.status(500).json({ error: 'Failed to sync content' });
    }
  }

  private async testSync(req: Request, res: Response): Promise<void> {
    try {
      const { userId, content } = req.body;
      
      if (!userId || !content) {
        res.status(400).json({ error: 'userId and content are required' });
        return;
      }

      // Get user's personal channel
      const user = await this.userRepository.getUserById(userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const channel = await this.channelRepository.getChannelByUserId(userId);
      if (!channel) {
        res.status(404).json({ error: 'Personal channel not found' });
        return;
      }

      // Send test message
      const success = await this.telegramBot.sendMessage({
        channelId: channel.channelId,
        message: `🧪 Тестовая синхронизация\n\n${content}\n\n⚡ Это тестовое сообщение системы синхронизации контента.`,
        messageType: 'text'
      });

      res.json({ success, channelId: channel.channelId });
    } catch (error) {
      this.logger.error('Error testing sync:', error);
      res.status(500).json({ error: 'Failed to test sync' });
    }
  }

  // Analytics
  private async getSyncAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      
      const analytics = await this.contentSyncService.getSyncAnalytics(startDate, endDate);
      
      res.json({
        period: { startDate, endDate },
        analytics
      });
    } catch (error) {
      this.logger.error('Error getting sync analytics:', error);
      res.status(500).json({ error: 'Failed to get sync analytics' });
    }
  }

  private async getPopularContentAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const popularContent = await this.contentSyncService.getPopularContent(70);
      
      const analytics = {
        totalPopularContent: popularContent.length,
        averagePopularityScore: popularContent.reduce((sum, content) => sum + content.popularityScore, 0) / popularContent.length || 0,
        topContent: popularContent.slice(0, 10),
        contentByType: this.groupBy(popularContent, 'contentType'),
        timestamp: new Date()
      };

      res.json(analytics);
    } catch (error) {
      this.logger.error('Error getting popular content analytics:', error);
      res.status(500).json({ error: 'Failed to get popular content analytics' });
    }
  }

  // Webhook Handler
  private async handleContentUpdate(req: Request, res: Response): Promise<void> {
    try {
      const { sourceType, sourceId, content, action } = req.body;
      
      if (action === 'new_popular_content') {
        await this.contentSyncService.analyzeAndSyncPopularContent(sourceId);
      }
      
      res.status(200).json({ ok: true });
    } catch (error) {
      this.logger.error('Error handling content update:', error);
      res.status(500).json({ error: 'Failed to handle content update' });
    }
  }

  // Helper methods
  private groupBy(array: any[], key: string): Record<string, number> {
    return array.reduce((result, item) => {
      const group = item[key];
      result[group] = (result[group] || 0) + 1;
      return result;
    }, {});
  }

  // Placeholder methods for missing endpoints
  private async getSyncRule(req: Request, res: Response): Promise<void> {
    res.json({ message: 'Get single sync rule not implemented yet' });
  }

  private async deleteSyncRule(req: Request, res: Response): Promise<void> {
    res.json({ message: 'Delete sync rule not implemented yet' });
  }

  private async updateContentPopularity(req: Request, res: Response): Promise<void> {
    res.json({ message: 'Update content popularity not implemented yet' });
  }

  private async resetUserPreferences(req: Request, res: Response): Promise<void> {
    res.json({ message: 'Reset user preferences not implemented yet' });
  }

  private async getSyncJobs(req: Request, res: Response): Promise<void> {
    res.json({ message: 'Get sync jobs not implemented yet' });
  }

  private async getSyncJob(req: Request, res: Response): Promise<void> {
    res.json({ message: 'Get single sync job not implemented yet' });
  }

  private async syncPopularContent(req: Request, res: Response): Promise<void> {
    res.json({ message: 'Sync popular content not implemented yet' });
  }

  private async getUserPreferencesAnalytics(req: Request, res: Response): Promise<void> {
    res.json({ message: 'User preferences analytics not implemented yet' });
  }
}

// Start service if run directly
if (require.main === module) {
  const service = new SyncManagerService();
  service.setupGracefulShutdown();
  service.start();
}
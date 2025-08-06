import { ContentSyncRepository } from '../../repositories/ContentSyncRepository';
import { UserRepository } from '../../repositories/UserRepository';
import { PersonalChannelRepository } from '../../repositories/PersonalChannelRepository';
import { GroupRepository } from '../../repositories/GroupRepository';
import { TelegramBotService } from '../telegram/TelegramBotService';
import { ContentSyncRule, ContentSyncJob, PopularContent, UserContentPreference } from '../../models/ContentSync';
import { ChannelMessage } from '../../models/PersonalChannel';
import { logger } from '../../config/logger';
import { recordCouponRecommendation } from '../../config/monitoring';

export class ContentSyncService {
  private syncRepository: ContentSyncRepository;
  private userRepository: UserRepository;
  private channelRepository: PersonalChannelRepository;
  private groupRepository: GroupRepository;
  private telegramBot: TelegramBotService;
  private isProcessing: boolean = false;

  constructor(
    syncRepository: ContentSyncRepository,
    userRepository: UserRepository,
    channelRepository: PersonalChannelRepository,
    groupRepository: GroupRepository,
    telegramBot: TelegramBotService
  ) {
    this.syncRepository = syncRepository;
    this.userRepository = userRepository;
    this.channelRepository = channelRepository;
    this.groupRepository = groupRepository;
    this.telegramBot = telegramBot;
  }

  // Main sync processing method
  async processSyncJobs(): Promise<void> {
    if (this.isProcessing) {
      logger.debug('Sync job processing already in progress');
      return;
    }

    this.isProcessing = true;
    
    try {
      const pendingJobs = await this.syncRepository.getPendingSyncJobs(10);
      
      if (pendingJobs.length === 0) {
        logger.debug('No pending sync jobs found');
        return;
      }

      logger.info(`Processing ${pendingJobs.length} sync jobs`);

      for (const job of pendingJobs) {
        await this.processSingleJob(job);
      }
    } catch (error) {
      logger.error('Error processing sync jobs:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processSingleJob(job: ContentSyncJob): Promise<void> {
    try {
      // Update job status to processing
      await this.syncRepository.updateSyncJob(job.id, {
        status: 'processing',
        startedAt: new Date()
      });

      const results = {
        totalTargets: job.targetChannels.length,
        successful: 0,
        failed: 0,
        errors: [] as string[]
      };

      // Process each target channel
      for (const channelId of job.targetChannels) {
        try {
          const success = await this.syncToChannel(job.sourceContent, channelId);
          if (success) {
            results.successful++;
          } else {
            results.failed++;
            results.errors.push(`Failed to sync to channel ${channelId}`);
          }
        } catch (error) {
          results.failed++;
          results.errors.push(`Error syncing to ${channelId}: ${error instanceof Error ? error.message : String(error)}`);
          logger.error(`Error syncing to channel ${channelId}:`, error);
        }

        // Add small delay to avoid rate limiting
        await this.delay(100);
      }

      // Update job with results
      await this.syncRepository.updateSyncJob(job.id, {
        status: results.failed === 0 ? 'completed' : 'failed',
        completedAt: new Date(),
        results
      });

      logger.info(`Sync job ${job.id} completed: ${results.successful}/${results.totalTargets} successful`);

    } catch (error) {
      await this.syncRepository.updateSyncJob(job.id, {
        status: 'failed',
        completedAt: new Date(),
        results: {
          totalTargets: job.targetChannels.length,
          successful: 0,
          failed: job.targetChannels.length,
          errors: [error instanceof Error ? error.message : String(error)]
        }
      });
      
      logger.error(`Sync job ${job.id} failed:`, error);
    }
  }

  private async syncToChannel(sourceContent: any, channelId: string): Promise<boolean> {
    try {
      // Get channel information
      const channel = await this.channelRepository.getChannelByChannelId(channelId);
      if (!channel || !channel.isActive) {
        return false;
      }

      // Get user preferences
      const userPreferences = await this.syncRepository.getUserContentPreferences(channel.userId);
      
      // Check if content matches user preferences
      if (!this.matchesUserPreferences(sourceContent, userPreferences)) {
        return false;
      }

      // Format message for personal channel
      const message = this.formatSyncMessage(sourceContent);
      
      // Send message
      const success = await this.telegramBot.sendMessage(message);
      
      if (success) {
        // Record activity
        await this.channelRepository.recordActivity({
          channelId,
          userId: channel.userId,
          activityType: 'message_sent',
          timestamp: new Date(),
          metadata: {
            syncedContent: true,
            sourceType: sourceContent.type,
            sourceId: sourceContent.id
          }
        });

        // Record metrics
        if (sourceContent.type === 'coupon') {
          recordCouponRecommendation('personal', 'synced');
        }
      }

      return success;
    } catch (error) {
      logger.error('Error syncing to channel:', error);
      return false;
    }
  }

  private matchesUserPreferences(content: any, preferences: UserContentPreference | null): boolean {
    if (!preferences) {
      return true; // Default to sync if no preferences set
    }

    // Check content type
    if (preferences.contentTypes.length > 0 && !preferences.contentTypes.includes(content.type)) {
      return false;
    }

    // Check category preferences
    if (content.metadata?.category) {
      if (preferences.excludedCategories.includes(content.metadata.category)) {
        return false;
      }
      
      if (preferences.preferredCategories.length > 0 && 
          !preferences.preferredCategories.includes(content.metadata.category)) {
        return false;
      }
    }

    // Check store preferences
    if (content.metadata?.store) {
      if (preferences.excludedStores.includes(content.metadata.store)) {
        return false;
      }
      
      if (preferences.preferredStores.length > 0 && 
          !preferences.preferredStores.includes(content.metadata.store)) {
        return false;
      }
    }

    // Check discount threshold
    if (preferences.minDiscountThreshold && content.metadata?.discountValue) {
      if (content.metadata.discountValue < preferences.minDiscountThreshold) {
        return false;
      }
    }

    // Check if only popular content is preferred
    if (preferences.onlyPopularContent && (!content.popularity || content.popularity < 70)) {
      return false;
    }

    return true;
  }

  private formatSyncMessage(sourceContent: any): ChannelMessage {
    const { type, content, metadata } = sourceContent;

    let message = '';
    let messageType: 'text' | 'coupon' | 'photo' | 'recommendation' = 'text';
    let messageMetadata: any = {};

    switch (type) {
      case 'coupon':
        messageType = 'coupon';
        message = this.formatCouponMessage(content, metadata);
        messageMetadata = {
          couponId: sourceContent.id,
          buttons: [{
            text: '🛒 Получить купон',
            url: metadata.link || '#'
          }]
        };
        break;

      case 'popular_content':
        messageType = 'recommendation';
        message = `🔥 Популярное предложение!\n\n${content}`;
        if (metadata.link) {
          messageMetadata.buttons = [{
            text: '👀 Посмотреть',
            url: metadata.link
          }];
        }
        break;

      default:
        message = `📢 ${content}`;
        break;
    }

    return {
      channelId: '', // Will be set by caller
      message,
      messageType,
      metadata: messageMetadata
    };
  }

  private formatCouponMessage(content: string, metadata: any): string {
    const { store, discountValue, discountType, couponCode } = metadata;
    
    let discountText = '';
    if (discountValue) {
      discountText = discountType === 'percentage' 
        ? `${discountValue}% OFF`
        : `₹${discountValue} OFF`;
    }

    return `🎯 Синхронизированное предложение${store ? ` от ${store}` : ''}!

${content}

${discountText ? `💰 **${discountText}**` : ''}
${couponCode ? `🎫 Код: \`${couponCode}\`` : ''}

🔄 Автоматически отобрано для вас на основе ваших предпочтений`;
  }

  // Content analysis and popularity tracking
  async analyzeAndSyncPopularContent(groupId: string): Promise<void> {
    try {
      // Get recent messages from group
      const recentMessages = await this.groupRepository.getRecentMessages(groupId, 100);
      
      // Filter coupon messages
      const couponMessages = recentMessages.filter(msg => msg.messageType === 'coupon');
      
      for (const message of couponMessages) {
        // Calculate engagement metrics (simplified)
        const engagementMetrics = {
          views: Math.floor(Math.random() * 1000) + 100,
          clicks: Math.floor(Math.random() * 100) + 10,
          shares: Math.floor(Math.random() * 50),
          reactions: Math.floor(Math.random() * 200) + 20,
          comments: Math.floor(Math.random() * 30)
        };

        // Record as popular content
        const popularContent = await this.syncRepository.recordPopularContent({
          sourceId: message.messageId,
          sourceType: 'group',
          contentType: 'coupon',
          title: this.extractTitle(message.content),
          content: message.content,
          metadata: this.extractCouponMetadata(message.content),
          popularityScore: this.calculatePopularityScore(engagementMetrics),
          engagementMetrics,
          syncCount: 0
        });

        // Create sync job if content is popular enough
        if (popularContent.popularityScore >= 70) {
          await this.createSyncJobForPopularContent(popularContent);
        }
      }
    } catch (error) {
      logger.error('Error analyzing popular content:', error);
    }
  }

  private async createSyncJobForPopularContent(content: PopularContent): Promise<void> {
    try {
      // Get active sync rules for popular content
      const syncRules = await this.syncRepository.getSyncRules(true);
      const popularContentRules = syncRules.filter(rule => 
        rule.sourceType === 'group' && 
        rule.targetType === 'personal_channels' &&
        (rule.contentFilters.minPopularityScore || 0) <= content.popularityScore
      );

      for (const rule of popularContentRules) {
        // Get target channels based on rule filters
        const targetChannels = await this.getTargetChannels(rule);
        
        if (targetChannels.length > 0) {
          await this.syncRepository.createSyncJob({
            ruleId: rule.id,
            sourceContent: {
              id: content.id,
              type: 'popular_content',
              content: content.content,
              metadata: content.metadata,
              popularity: content.popularityScore,
              engagement: content.popularityScore
            },
            targetChannels,
            status: 'pending',
            scheduledAt: rule.syncTiming.immediate ? undefined : this.calculateScheduledTime(rule.syncTiming)
          });
        }
      }
    } catch (error) {
      logger.error('Error creating sync job for popular content:', error);
    }
  }

  private async getTargetChannels(rule: ContentSyncRule): Promise<string[]> {
    try {
      const { targetFilters } = rule;
      const channels: string[] = [];

      // Get users based on filters
      const users = await this.userRepository.getActiveUsers(1000);
      
      for (const user of users) {
        // Apply filters
        if (targetFilters.minEngagement && user.lifetimeValue < (targetFilters.minEngagement * 100)) {
          continue;
        }
        
        if (targetFilters.maxChurnRisk && user.churnRisk > targetFilters.maxChurnRisk) {
          continue;
        }

        // Get user's personal channel
        const channel = await this.channelRepository.getChannelByUserId(user.id);
        if (channel && channel.isActive) {
          channels.push(channel.channelId);
        }
      }

      return channels;
    } catch (error) {
      logger.error('Error getting target channels:', error);
      return [];
    }
  }

  private calculateScheduledTime(syncTiming: any): Date {
    const now = new Date();
    const delay = syncTiming.delay || 0; // minutes
    
    if (syncTiming.scheduled && syncTiming.scheduled.hours) {
      // Find next scheduled hour
      const currentHour = now.getHours();
      const scheduledHours = syncTiming.scheduled.hours.sort((a: number, b: number) => a - b);
      
      let nextHour = scheduledHours.find((hour: number) => hour > currentHour);
      if (!nextHour) {
        nextHour = scheduledHours[0]; // Next day
      }
      
      const scheduledTime = new Date(now);
      scheduledTime.setHours(nextHour, 0, 0, 0);
      
      if (nextHour <= currentHour) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
      }
      
      return scheduledTime;
    }
    
    // Default: add delay to current time
    return new Date(now.getTime() + delay * 60 * 1000);
  }

  private extractTitle(content: string): string {
    const lines = content.split('\n').filter(line => line.trim());
    return lines[0]?.substring(0, 100) || 'Untitled';
  }

  private extractCouponMetadata(content: string): any {
    const metadata: any = {};
    
    // Extract discount
    const percentageMatch = content.match(/(\d+)%/);
    if (percentageMatch) {
      metadata.discountType = 'percentage';
      metadata.discountValue = parseInt(percentageMatch[1]);
    }
    
    const fixedMatch = content.match(/₹(\d+)/);
    if (fixedMatch && !metadata.discountValue) {
      metadata.discountType = 'fixed';
      metadata.discountValue = parseInt(fixedMatch[1]);
    }
    
    // Extract coupon code
    const codeMatch = content.match(/код[:\s]*([A-Z0-9]+)/i) || content.match(/code[:\s]*([A-Z0-9]+)/i);
    if (codeMatch) {
      metadata.couponCode = codeMatch[1];
    }
    
    // Extract link
    const linkMatch = content.match(/(https?:\/\/[^\s]+)/);
    if (linkMatch) {
      metadata.link = linkMatch[1];
    }
    
    return metadata;
  }

  private calculatePopularityScore(metrics: any): number {
    const { views = 0, clicks = 0, shares = 0, reactions = 0, comments = 0 } = metrics;
    
    const score = (
      views * 0.1 +
      clicks * 2 +
      shares * 5 +
      reactions * 1 +
      comments * 3
    );
    
    return Math.min(Math.max(Math.round(score / 10), 0), 100);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public API methods
  async createSyncRule(ruleData: Partial<ContentSyncRule>): Promise<ContentSyncRule> {
    return await this.syncRepository.createSyncRule(ruleData);
  }

  async getSyncRules(isActive?: boolean): Promise<ContentSyncRule[]> {
    return await this.syncRepository.getSyncRules(isActive);
  }

  async updateSyncRule(id: string, updates: Partial<ContentSyncRule>): Promise<ContentSyncRule | null> {
    return await this.syncRepository.updateSyncRule(id, updates);
  }

  async getPopularContent(minScore: number = 50, contentType?: string): Promise<PopularContent[]> {
    return await this.syncRepository.getPopularContent(minScore, contentType);
  }

  async updateUserPreferences(userId: string, preferences: Partial<UserContentPreference>): Promise<UserContentPreference> {
    return await this.syncRepository.updateUserContentPreferences(userId, preferences);
  }

  async getUserPreferences(userId: string): Promise<UserContentPreference | null> {
    return await this.syncRepository.getUserContentPreferences(userId);
  }

  async getSyncAnalytics(startDate: Date, endDate: Date): Promise<any> {
    return await this.syncRepository.getSyncAnalytics(startDate, endDate);
  }

  // Start periodic sync processing
  startSyncProcessor(intervalMs: number = 30000): void {
    setInterval(() => {
      this.processSyncJobs().catch(error => {
        logger.error('Error in sync processor:', error);
      });
    }, intervalMs);
    
    logger.info(`Content sync processor started with ${intervalMs}ms interval`);
  }
}
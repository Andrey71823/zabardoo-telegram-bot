import { BaseService } from '../base/BaseService';
import { NotificationCampaignRepository } from '../../repositories/NotificationCampaignRepository';
import { UserManagementRepository } from '../../repositories/UserManagementRepository';
import { 
  Campaign, 
  CampaignExecution,
  NotificationTemplate,
  UserNotificationPreference,
  NotificationDelivery,
  CampaignFilter,
  CampaignStats,
  AutomatedCampaignTrigger,
  BulkNotification
} from '../../models/NotificationCampaign';

export class NotificationCampaignService extends BaseService {
  private repository: NotificationCampaignRepository;
  private userRepository: UserManagementRepository;

  constructor() {
    super('NotificationCampaignService');
    this.repository = new NotificationCampaignRepository();
    this.userRepository = new UserManagementRepository();
  }

  protected setupServiceRoutes(): void {
    // Service routes will be handled by the controller
  }

  protected async checkServiceHealth(): Promise<boolean> {
    try {
      // Basic health check - try to get campaign stats
      await this.repository.getCampaignStats();
      return true;
    } catch (error) {
      this.logger.error('Notification campaign service health check failed:', error);
      return false;
    }
  }

  /**
   * Get campaigns with filtering and pagination
   */
  async getCampaigns(filter: CampaignFilter): Promise<{
    campaigns: Campaign[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      this.logger.info('Getting campaigns with filter:', filter);
      return await this.repository.getCampaigns(filter);
    } catch (error) {
      this.logger.error('Error getting campaigns:', error);
      throw new Error('Failed to retrieve campaigns');
    }
  }

  /**
   * Get campaign by ID
   */
  async getCampaignById(id: string): Promise<Campaign | null> {
    try {
      this.logger.info('Getting campaign by ID:', id);
      return await this.repository.getCampaignById(id);
    } catch (error) {
      this.logger.error('Error getting campaign by ID:', error);
      throw new Error('Failed to retrieve campaign');
    }
  }

  /**
   * Create new campaign
   */
  async createCampaign(campaignData: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt'>): Promise<Campaign> {
    try {
      this.logger.info('Creating new campaign:', campaignData.name);

      // Validate campaign data
      await this.validateCampaignData(campaignData);

      // Initialize metrics
      const campaign = {
        ...campaignData,
        metrics: {
          targetCount: 0,
          sentCount: 0,
          deliveredCount: 0,
          failedCount: 0,
          openedCount: 0,
          clickedCount: 0,
          convertedCount: 0,
          unsubscribedCount: 0,
          deliveryRate: 0,
          openRate: 0,
          clickRate: 0,
          conversionRate: 0,
          unsubscribeRate: 0,
          revenue: 0,
          costPerConversion: 0,
          roi: 0
        }
      };

      const result = await this.repository.createCampaign(campaign);
      this.logger.info('Campaign created successfully:', result.id);
      return result;
    } catch (error) {
      this.logger.error('Error creating campaign:', error);
      throw error;
    }
  }

  /**
   * Update campaign
   */
  async updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign | null> {
    try {
      this.logger.info('Updating campaign:', id);

      // Get existing campaign
      const existingCampaign = await this.repository.getCampaignById(id);
      if (!existingCampaign) {
        throw new Error('Campaign not found');
      }

      // Validate updates
      if (updates.targetAudience || updates.content || updates.schedule) {
        await this.validateCampaignData({ ...existingCampaign, ...updates });
      }

      const result = await this.repository.updateCampaign(id, updates);
      this.logger.info('Campaign updated successfully:', id);
      return result;
    } catch (error) {
      this.logger.error('Error updating campaign:', error);
      throw error;
    }
  }

  /**
   * Delete campaign
   */
  async deleteCampaign(id: string): Promise<boolean> {
    try {
      this.logger.info('Deleting campaign:', id);

      // Check if campaign can be deleted (not running)
      const campaign = await this.repository.getCampaignById(id);
      if (campaign && campaign.status === 'running') {
        throw new Error('Cannot delete running campaign');
      }

      const result = await this.repository.deleteCampaign(id);
      this.logger.info('Campaign deleted successfully:', id);
      return result;
    } catch (error) {
      this.logger.error('Error deleting campaign:', error);
      throw error;
    }
  }

  /**
   * Execute campaign
   */
  async executeCampaign(campaignId: string, executionType: 'manual' | 'scheduled' | 'triggered' = 'manual'): Promise<CampaignExecution> {
    try {
      this.logger.info('Executing campaign:', campaignId);

      const campaign = await this.repository.getCampaignById(campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      if (campaign.status === 'running') {
        throw new Error('Campaign is already running');
      }

      // Get target users
      const targetUsers = await this.getTargetUsers(campaign.targetAudience);
      
      // Create execution record
      const execution = await this.repository.createCampaignExecution({
        campaignId,
        executionType,
        status: 'running',
        startedAt: new Date(),
        totalBatches: Math.ceil(targetUsers.length / 100), // 100 users per batch
        completedBatches: 0,
        currentBatch: 1,
        batchSize: 100,
        results: {
          targetUsers: targetUsers.length,
          processedUsers: 0,
          successfulSends: 0,
          failedSends: 0,
          skippedUsers: 0,
          errors: []
        }
      });

      // Update campaign status
      await this.repository.updateCampaign(campaignId, { 
        status: 'running',
        startedAt: new Date(),
        metrics: {
          ...campaign.metrics,
          targetCount: targetUsers.length
        }
      });

      // Start processing in background
      this.processCampaignExecution(execution, targetUsers, campaign);

      this.logger.info('Campaign execution started:', execution.id);
      return execution;
    } catch (error) {
      this.logger.error('Error executing campaign:', error);
      throw error;
    }
  }

  /**
   * Pause campaign
   */
  async pauseCampaign(campaignId: string): Promise<Campaign | null> {
    try {
      this.logger.info('Pausing campaign:', campaignId);
      
      const result = await this.repository.updateCampaign(campaignId, { 
        status: 'paused' 
      });
      
      this.logger.info('Campaign paused successfully:', campaignId);
      return result;
    } catch (error) {
      this.logger.error('Error pausing campaign:', error);
      throw error;
    }
  }

  /**
   * Resume campaign
   */
  async resumeCampaign(campaignId: string): Promise<Campaign | null> {
    try {
      this.logger.info('Resuming campaign:', campaignId);
      
      const result = await this.repository.updateCampaign(campaignId, { 
        status: 'running' 
      });
      
      this.logger.info('Campaign resumed successfully:', campaignId);
      return result;
    } catch (error) {
      this.logger.error('Error resuming campaign:', error);
      throw error;
    }
  }

  /**
   * Get campaign statistics
   */
  async getCampaignStats(dateRange?: { from: Date; to: Date }): Promise<CampaignStats> {
    try {
      this.logger.info('Getting campaign statistics');
      return await this.repository.getCampaignStats(dateRange);
    } catch (error) {
      this.logger.error('Error getting campaign stats:', error);
      throw new Error('Failed to retrieve campaign statistics');
    }
  }

  /**
   * Send bulk notification
   */
  async sendBulkNotification(notification: Omit<BulkNotification, 'id' | 'createdAt' | 'updatedAt' | 'results' | 'status'>): Promise<BulkNotification> {
    try {
      this.logger.info('Sending bulk notification:', notification.title);

      // Get target users
      const targetUsers = await this.getTargetUsersForBulkNotification(notification.recipients);

      // Create bulk notification record
      const bulkNotification: BulkNotification = {
        ...notification,
        id: this.generateId(),
        status: 'sending',
        results: {
          targetCount: targetUsers.length,
          sentCount: 0,
          deliveredCount: 0,
          failedCount: 0,
          errors: []
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        sentAt: new Date()
      };

      // Process notifications
      await this.processBulkNotification(bulkNotification, targetUsers);

      this.logger.info('Bulk notification sent successfully:', bulkNotification.id);
      return bulkNotification;
    } catch (error) {
      this.logger.error('Error sending bulk notification:', error);
      throw error;
    }
  }

  /**
   * Get notification templates
   */
  async getNotificationTemplates(category?: string): Promise<NotificationTemplate[]> {
    try {
      this.logger.info('Getting notification templates');
      return await this.repository.getNotificationTemplates(category);
    } catch (error) {
      this.logger.error('Error getting notification templates:', error);
      throw new Error('Failed to retrieve notification templates');
    }
  }

  /**
   * Create notification template
   */
  async createNotificationTemplate(template: Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<NotificationTemplate> {
    try {
      this.logger.info('Creating notification template:', template.name);

      // Initialize usage stats
      const templateWithUsage = {
        ...template,
        usage: {
          timesUsed: 0,
          averagePerformance: {
            openRate: 0,
            clickRate: 0,
            conversionRate: 0
          }
        }
      };

      const result = await this.repository.createNotificationTemplate(templateWithUsage);
      this.logger.info('Notification template created successfully:', result.id);
      return result;
    } catch (error) {
      this.logger.error('Error creating notification template:', error);
      throw error;
    }
  }

  /**
   * Get user notification preferences
   */
  async getUserNotificationPreferences(userId: string): Promise<UserNotificationPreference> {
    try {
      this.logger.info('Getting user notification preferences:', userId);
      
      let preferences = await this.repository.getUserNotificationPreferences(userId);
      
      // If no preferences exist, create default ones
      if (!preferences) {
        const defaultPreferences = {
          telegram: true,
          email: true,
          push: true,
          sms: false,
          promotional: true,
          transactional: true,
          informational: true,
          reminders: true,
          maxPerDay: 10,
          maxPerWeek: 50,
          quietHours: {
            enabled: false,
            startTime: '22:00',
            endTime: '08:00',
            timezone: 'Asia/Kolkata'
          },
          categories: [],
          stores: [],
          globalUnsubscribe: false,
          unsubscribedCategories: [],
          unsubscribedCampaignTypes: []
        };

        preferences = await this.repository.updateUserNotificationPreferences(userId, defaultPreferences);
      }

      return preferences;
    } catch (error) {
      this.logger.error('Error getting user notification preferences:', error);
      throw error;
    }
  }

  /**
   * Update user notification preferences
   */
  async updateUserNotificationPreferences(userId: string, preferences: UserNotificationPreference['preferences']): Promise<UserNotificationPreference> {
    try {
      this.logger.info('Updating user notification preferences:', userId);
      
      const result = await this.repository.updateUserNotificationPreferences(userId, preferences);
      this.logger.info('User notification preferences updated successfully:', userId);
      return result;
    } catch (error) {
      this.logger.error('Error updating user notification preferences:', error);
      throw error;
    }
  }

  /**
   * Schedule campaign
   */
  async scheduleCampaign(campaignId: string, scheduledAt: Date): Promise<Campaign | null> {
    try {
      this.logger.info('Scheduling campaign:', campaignId, 'at', scheduledAt);

      const campaign = await this.repository.getCampaignById(campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Update campaign schedule
      const updatedSchedule = {
        ...campaign.schedule,
        type: 'scheduled' as const,
        scheduledAt
      };

      const result = await this.repository.updateCampaign(campaignId, {
        status: 'scheduled',
        schedule: updatedSchedule
      });

      this.logger.info('Campaign scheduled successfully:', campaignId);
      return result;
    } catch (error) {
      this.logger.error('Error scheduling campaign:', error);
      throw error;
    }
  }

  /**
   * Test A/B campaign variants
   */
  async testABCampaignVariants(campaignId: string): Promise<{ winnerVariantId: string; results: any }> {
    try {
      this.logger.info('Testing A/B campaign variants:', campaignId);

      const campaign = await this.repository.getCampaignById(campaignId);
      if (!campaign || !campaign.abTest?.enabled) {
        throw new Error('Campaign not found or A/B testing not enabled');
      }

      // This is a simplified implementation
      // In production, you would analyze actual performance data
      const variants = campaign.abTest.variants;
      const results = variants.map(variant => ({
        variantId: variant.id,
        clickRate: Math.random() * 0.1, // Random for demo
        conversionRate: Math.random() * 0.05,
        engagementRate: Math.random() * 0.15
      }));

      // Determine winner based on criteria
      let winnerVariantId = variants[0].id;
      let bestScore = 0;

      results.forEach(result => {
        let score = 0;
        switch (campaign.abTest!.winnerCriteria) {
          case 'click_rate':
            score = result.clickRate;
            break;
          case 'conversion_rate':
            score = result.conversionRate;
            break;
          case 'engagement_rate':
            score = result.engagementRate;
            break;
        }

        if (score > bestScore) {
          bestScore = score;
          winnerVariantId = result.variantId;
        }
      });

      this.logger.info('A/B test completed, winner:', winnerVariantId);
      return { winnerVariantId, results };
    } catch (error) {
      this.logger.error('Error testing A/B campaign variants:', error);
      throw error;
    }
  }

  // Private helper methods

  /**
   * Validate campaign data
   */
  private async validateCampaignData(campaign: Partial<Campaign>): Promise<void> {
    if (!campaign.name || campaign.name.trim().length === 0) {
      throw new Error('Campaign name is required');
    }

    if (!campaign.content?.title || campaign.content.title.trim().length === 0) {
      throw new Error('Campaign title is required');
    }

    if (!campaign.content?.message || campaign.content.message.trim().length === 0) {
      throw new Error('Campaign message is required');
    }

    if (!campaign.targetAudience) {
      throw new Error('Target audience is required');
    }

    if (campaign.schedule?.type === 'scheduled' && !campaign.schedule.scheduledAt) {
      throw new Error('Scheduled date is required for scheduled campaigns');
    }

    if (campaign.abTest?.enabled) {
      if (!campaign.abTest.variants || campaign.abTest.variants.length < 2) {
        throw new Error('At least 2 variants are required for A/B testing');
      }

      const totalPercentage = campaign.abTest.variants.reduce((sum, variant) => sum + variant.percentage, 0);
      if (totalPercentage !== 100) {
        throw new Error('A/B test variant percentages must sum to 100');
      }
    }
  }

  /**
   * Get target users based on audience criteria
   */
  private async getTargetUsers(targetAudience: Campaign['targetAudience']): Promise<string[]> {
    try {
      let userIds: string[] = [];

      if (targetAudience.userIds && targetAudience.userIds.length > 0) {
        userIds = targetAudience.userIds;
      } else if (targetAudience.segmentIds && targetAudience.segmentIds.length > 0) {
        // Get users from segments
        for (const segmentId of targetAudience.segmentIds) {
          const segmentUsers = await this.getUsersFromSegment(segmentId);
          userIds.push(...segmentUsers);
        }
      } else if (targetAudience.filters) {
        // Get users based on filters
        const result = await this.userRepository.getUsers(targetAudience.filters);
        userIds = result.users.map(user => user.id);
      }

      // Remove excluded users
      if (targetAudience.excludeUserIds && targetAudience.excludeUserIds.length > 0) {
        userIds = userIds.filter(id => !targetAudience.excludeUserIds!.includes(id));
      }

      // Remove duplicates
      return [...new Set(userIds)];
    } catch (error) {
      this.logger.error('Error getting target users:', error);
      throw error;
    }
  }

  /**
   * Get users from segment
   */
  private async getUsersFromSegment(segmentId: string): Promise<string[]> {
    // This would typically query a user segments table
    // For now, return empty array as placeholder
    return [];
  }

  /**
   * Get target users for bulk notification
   */
  private async getTargetUsersForBulkNotification(recipients: BulkNotification['recipients']): Promise<string[]> {
    try {
      let userIds: string[] = [];

      switch (recipients.type) {
        case 'all_users':
          const allUsers = await this.userRepository.getUsers({ isActive: true });
          userIds = allUsers.users.map(user => user.id);
          break;

        case 'segment':
          if (recipients.segmentIds) {
            for (const segmentId of recipients.segmentIds) {
              const segmentUsers = await this.getUsersFromSegment(segmentId);
              userIds.push(...segmentUsers);
            }
          }
          break;

        case 'custom_list':
          if (recipients.userIds) {
            userIds = recipients.userIds;
          }
          break;
      }

      // Apply filters if provided
      if (recipients.filters) {
        const filteredUsers = await this.userRepository.getUsers(recipients.filters);
        const filteredUserIds = filteredUsers.users.map(user => user.id);
        userIds = userIds.filter(id => filteredUserIds.includes(id));
      }

      return [...new Set(userIds)];
    } catch (error) {
      this.logger.error('Error getting target users for bulk notification:', error);
      throw error;
    }
  }

  /**
   * Process campaign execution in background
   */
  private async processCampaignExecution(execution: CampaignExecution, targetUsers: string[], campaign: Campaign): Promise<void> {
    try {
      // This would typically be processed in a queue/background job
      // For now, simulate the processing
      
      let processedUsers = 0;
      let successfulSends = 0;
      let failedSends = 0;

      for (const userId of targetUsers) {
        try {
          // Check user preferences
          const preferences = await this.getUserNotificationPreferences(userId);
          
          if (this.shouldSkipUser(preferences, campaign)) {
            execution.results.skippedUsers++;
            continue;
          }

          // Create notification delivery
          await this.repository.createNotificationDelivery({
            campaignId: campaign.id,
            executionId: execution.id,
            userId,
            content: campaign.content,
            channel: campaign.delivery.channel,
            status: 'sent',
            scheduledAt: new Date(),
            sentAt: new Date(),
            interactions: {
              opened: false,
              clicked: false,
              converted: false,
              unsubscribed: false
            },
            retryCount: 0
          });

          successfulSends++;
        } catch (error) {
          failedSends++;
          execution.results.errors.push({
            userId,
            error: error.message,
            timestamp: new Date()
          });
        }

        processedUsers++;
      }

      // Update execution results
      await this.repository.updateCampaignExecution(execution.id, {
        status: 'completed',
        completedAt: new Date(),
        results: {
          ...execution.results,
          processedUsers,
          successfulSends,
          failedSends
        }
      });

      // Update campaign metrics
      await this.repository.updateCampaign(campaign.id, {
        status: 'completed',
        completedAt: new Date(),
        metrics: {
          ...campaign.metrics,
          sentCount: successfulSends,
          failedCount: failedSends,
          deliveryRate: successfulSends / (successfulSends + failedSends) * 100
        }
      });

    } catch (error) {
      this.logger.error('Error processing campaign execution:', error);
      
      // Mark execution as failed
      await this.repository.updateCampaignExecution(execution.id, {
        status: 'failed',
        completedAt: new Date()
      });
    }
  }

  /**
   * Process bulk notification
   */
  private async processBulkNotification(notification: BulkNotification, targetUsers: string[]): Promise<void> {
    try {
      let sentCount = 0;
      let failedCount = 0;

      for (const userId of targetUsers) {
        try {
          // Send notification (this would integrate with actual notification service)
          // For now, just simulate success
          sentCount++;
        } catch (error) {
          failedCount++;
          notification.results.errors.push({
            userId,
            error: error.message
          });
        }
      }

      // Update results
      notification.results.sentCount = sentCount;
      notification.results.failedCount = failedCount;
      notification.status = 'completed';
      notification.completedAt = new Date();

    } catch (error) {
      this.logger.error('Error processing bulk notification:', error);
      notification.status = 'failed';
      notification.completedAt = new Date();
    }
  }

  /**
   * Check if user should be skipped based on preferences
   */
  private shouldSkipUser(preferences: UserNotificationPreference, campaign: Campaign): boolean {
    // Check global unsubscribe
    if (preferences.preferences.globalUnsubscribe) {
      return true;
    }

    // Check channel preferences
    if (!preferences.preferences[campaign.delivery.channel]) {
      return true;
    }

    // Check quiet hours
    if (preferences.preferences.quietHours.enabled) {
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
      
      if (currentTime >= preferences.preferences.quietHours.startTime || 
          currentTime <= preferences.preferences.quietHours.endTime) {
        return true;
      }
    }

    return false;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}
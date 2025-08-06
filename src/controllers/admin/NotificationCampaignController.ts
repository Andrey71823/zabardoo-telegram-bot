import { Request, Response } from 'express';
import { NotificationCampaignService } from '../../services/admin/NotificationCampaignService';
import { 
  Campaign, 
  CampaignFilter,
  NotificationTemplate,
  BulkNotification
} from '../../models/NotificationCampaign';

export class NotificationCampaignController {
  private campaignService: NotificationCampaignService;

  constructor() {
    this.campaignService = new NotificationCampaignService();
  }

  /**
   * Get campaigns with filtering and pagination
   */
  async getCampaigns(req: Request, res: Response): Promise<void> {
    try {
      const filter: CampaignFilter = {
        status: req.query.status ? (req.query.status as string).split(',') : undefined,
        type: req.query.type ? (req.query.type as string).split(',') : undefined,
        createdBy: req.query.createdBy as string,
        dateRange: req.query.dateFrom && req.query.dateTo ? {
          from: new Date(req.query.dateFrom as string),
          to: new Date(req.query.dateTo as string)
        } : undefined,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        search: req.query.search as string,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20
      };

      const result = await this.campaignService.getCampaigns(filter);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get campaigns'
      });
    }
  }

  /**
   * Get campaign by ID
   */
  async getCampaignById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const campaign = await this.campaignService.getCampaignById(id);
      
      if (!campaign) {
        res.status(404).json({
          success: false,
          error: 'Campaign not found'
        });
        return;
      }

      res.json({
        success: true,
        data: campaign
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get campaign'
      });
    }
  }

  /**
   * Create new campaign
   */
  async createCampaign(req: Request, res: Response): Promise<void> {
    try {
      const campaignData = req.body;
      
      // Add creator information
      campaignData.createdBy = req.user?.id || 'admin';
      campaignData.tags = campaignData.tags || [];

      const campaign = await this.campaignService.createCampaign(campaignData);
      
      res.status(201).json({
        success: true,
        data: campaign
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create campaign'
      });
    }
  }

  /**
   * Update campaign
   */
  async updateCampaign(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;

      const campaign = await this.campaignService.updateCampaign(id, updates);
      
      if (!campaign) {
        res.status(404).json({
          success: false,
          error: 'Campaign not found'
        });
        return;
      }

      res.json({
        success: true,
        data: campaign
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update campaign'
      });
    }
  }

  /**
   * Delete campaign
   */
  async deleteCampaign(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const success = await this.campaignService.deleteCampaign(id);
      
      if (!success) {
        res.status(404).json({
          success: false,
          error: 'Campaign not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Campaign deleted successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete campaign'
      });
    }
  }

  /**
   * Execute campaign
   */
  async executeCampaign(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { executionType } = req.body;

      const execution = await this.campaignService.executeCampaign(id, executionType || 'manual');
      
      res.json({
        success: true,
        data: execution,
        message: 'Campaign execution started'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute campaign'
      });
    }
  }

  /**
   * Pause campaign
   */
  async pauseCampaign(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const campaign = await this.campaignService.pauseCampaign(id);
      
      if (!campaign) {
        res.status(404).json({
          success: false,
          error: 'Campaign not found'
        });
        return;
      }

      res.json({
        success: true,
        data: campaign,
        message: 'Campaign paused successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to pause campaign'
      });
    }
  }

  /**
   * Resume campaign
   */
  async resumeCampaign(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const campaign = await this.campaignService.resumeCampaign(id);
      
      if (!campaign) {
        res.status(404).json({
          success: false,
          error: 'Campaign not found'
        });
        return;
      }

      res.json({
        success: true,
        data: campaign,
        message: 'Campaign resumed successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to resume campaign'
      });
    }
  }

  /**
   * Schedule campaign
   */
  async scheduleCampaign(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { scheduledAt } = req.body;

      if (!scheduledAt) {
        res.status(400).json({
          success: false,
          error: 'Scheduled date is required'
        });
        return;
      }

      const campaign = await this.campaignService.scheduleCampaign(id, new Date(scheduledAt));
      
      if (!campaign) {
        res.status(404).json({
          success: false,
          error: 'Campaign not found'
        });
        return;
      }

      res.json({
        success: true,
        data: campaign,
        message: 'Campaign scheduled successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to schedule campaign'
      });
    }
  }

  /**
   * Test A/B campaign variants
   */
  async testABCampaignVariants(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await this.campaignService.testABCampaignVariants(id);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to test A/B variants'
      });
    }
  }

  /**
   * Get campaign statistics
   */
  async getCampaignStats(req: Request, res: Response): Promise<void> {
    try {
      const dateRange = req.query.dateFrom && req.query.dateTo ? {
        from: new Date(req.query.dateFrom as string),
        to: new Date(req.query.dateTo as string)
      } : undefined;

      const stats = await this.campaignService.getCampaignStats(dateRange);
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get campaign statistics'
      });
    }
  }

  /**
   * Send bulk notification
   */
  async sendBulkNotification(req: Request, res: Response): Promise<void> {
    try {
      const notificationData = req.body;
      
      // Add creator information
      notificationData.createdBy = req.user?.id || 'admin';

      const result = await this.campaignService.sendBulkNotification(notificationData);
      
      res.json({
        success: true,
        data: result,
        message: 'Bulk notification sent successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send bulk notification'
      });
    }
  }

  /**
   * Get notification templates
   */
  async getNotificationTemplates(req: Request, res: Response): Promise<void> {
    try {
      const category = req.query.category as string;
      const templates = await this.campaignService.getNotificationTemplates(category);
      
      res.json({
        success: true,
        data: templates
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get notification templates'
      });
    }
  }

  /**
   * Create notification template
   */
  async createNotificationTemplate(req: Request, res: Response): Promise<void> {
    try {
      const templateData = req.body;
      
      // Add creator information
      templateData.createdBy = req.user?.id || 'admin';
      templateData.isActive = templateData.isActive !== undefined ? templateData.isActive : true;

      const template = await this.campaignService.createNotificationTemplate(templateData);
      
      res.status(201).json({
        success: true,
        data: template
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create notification template'
      });
    }
  }

  /**
   * Get user notification preferences
   */
  async getUserNotificationPreferences(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const preferences = await this.campaignService.getUserNotificationPreferences(userId);
      
      res.json({
        success: true,
        data: preferences
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user notification preferences'
      });
    }
  }

  /**
   * Update user notification preferences
   */
  async updateUserNotificationPreferences(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const preferences = req.body;

      const result = await this.campaignService.updateUserNotificationPreferences(userId, preferences);
      
      res.json({
        success: true,
        data: result,
        message: 'User notification preferences updated successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update user notification preferences'
      });
    }
  }

  /**
   * Preview campaign
   */
  async previewCampaign(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { userId } = req.query;

      const campaign = await this.campaignService.getCampaignById(id);
      
      if (!campaign) {
        res.status(404).json({
          success: false,
          error: 'Campaign not found'
        });
        return;
      }

      // Generate preview content
      let previewContent = campaign.content;

      // If userId provided, personalize the content
      if (userId) {
        // This would typically fetch user data and replace variables
        // For now, just return the basic content
        previewContent = {
          ...campaign.content,
          title: campaign.content.title.replace('{{firstName}}', 'John'),
          message: campaign.content.message.replace('{{firstName}}', 'John')
        };
      }

      res.json({
        success: true,
        data: {
          campaign: {
            id: campaign.id,
            name: campaign.name,
            type: campaign.type,
            status: campaign.status
          },
          content: previewContent,
          delivery: campaign.delivery,
          targetAudience: campaign.targetAudience
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to preview campaign'
      });
    }
  }

  /**
   * Duplicate campaign
   */
  async duplicateCampaign(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const campaign = await this.campaignService.getCampaignById(id);
      
      if (!campaign) {
        res.status(404).json({
          success: false,
          error: 'Campaign not found'
        });
        return;
      }

      // Create duplicate campaign
      const duplicateData = {
        ...campaign,
        name: `${campaign.name} (Copy)`,
        status: 'draft' as const,
        createdBy: req.user?.id || 'admin',
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

      // Remove fields that shouldn't be copied
      delete (duplicateData as any).id;
      delete (duplicateData as any).createdAt;
      delete (duplicateData as any).updatedAt;
      delete (duplicateData as any).startedAt;
      delete (duplicateData as any).completedAt;

      const duplicatedCampaign = await this.campaignService.createCampaign(duplicateData);
      
      res.status(201).json({
        success: true,
        data: duplicatedCampaign,
        message: 'Campaign duplicated successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to duplicate campaign'
      });
    }
  }

  /**
   * Get campaign performance analytics
   */
  async getCampaignAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const period = req.query.period as string || 'week';
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

      const campaign = await this.campaignService.getCampaignById(id);
      
      if (!campaign) {
        res.status(404).json({
          success: false,
          error: 'Campaign not found'
        });
        return;
      }

      // Generate analytics data (simplified for demo)
      const analytics = {
        campaignId: id,
        period,
        startDate,
        endDate,
        delivery: {
          sent: campaign.metrics.sentCount,
          delivered: campaign.metrics.deliveredCount,
          failed: campaign.metrics.failedCount,
          bounced: 0,
          deliveryRate: campaign.metrics.deliveryRate
        },
        engagement: {
          opened: campaign.metrics.openedCount,
          clicked: campaign.metrics.clickedCount,
          converted: campaign.metrics.convertedCount,
          unsubscribed: campaign.metrics.unsubscribedCount,
          openRate: campaign.metrics.openRate,
          clickRate: campaign.metrics.clickRate,
          conversionRate: campaign.metrics.conversionRate,
          unsubscribeRate: campaign.metrics.unsubscribeRate
        },
        revenue: {
          total: campaign.metrics.revenue,
          perRecipient: campaign.metrics.sentCount > 0 ? campaign.metrics.revenue / campaign.metrics.sentCount : 0,
          perClick: campaign.metrics.clickedCount > 0 ? campaign.metrics.revenue / campaign.metrics.clickedCount : 0,
          perConversion: campaign.metrics.convertedCount > 0 ? campaign.metrics.revenue / campaign.metrics.convertedCount : 0,
          roi: campaign.metrics.roi
        },
        audience: {
          byLocation: [],
          byLanguage: [],
          byActivityLevel: [],
          byChannel: []
        },
        timeline: [],
        platforms: [],
        generatedAt: new Date()
      };

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get campaign analytics'
      });
    }
  }
}
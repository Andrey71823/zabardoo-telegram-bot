import { Request, Response } from 'express';
import { UserManagementService } from '../../services/admin/UserManagementService';
import { 
  User, 
  UserFilter, 
  BanAction,
  UserExport 
} from '../../models/UserManagement';

export class UserManagementController {
  private userService: UserManagementService;

  constructor() {
    this.userService = new UserManagementService();
  }

  /**
   * Get users with filtering and pagination
   */
  async getUsers(req: Request, res: Response): Promise<void> {
    try {
      const filter: UserFilter = {
        isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
        isBanned: req.query.isBanned ? req.query.isBanned === 'true' : undefined,
        channelStatus: req.query.channelStatus as any,
        registrationDateRange: req.query.registrationFrom && req.query.registrationTo ? {
          from: new Date(req.query.registrationFrom as string),
          to: new Date(req.query.registrationTo as string)
        } : undefined,
        lastActiveDateRange: req.query.lastActiveFrom && req.query.lastActiveTo ? {
          from: new Date(req.query.lastActiveFrom as string),
          to: new Date(req.query.lastActiveTo as string)
        } : undefined,
        totalSpentRange: req.query.minSpent || req.query.maxSpent ? {
          min: req.query.minSpent ? parseFloat(req.query.minSpent as string) : undefined,
          max: req.query.maxSpent ? parseFloat(req.query.maxSpent as string) : undefined
        } : undefined,
        couponsUsedRange: req.query.minCoupons || req.query.maxCoupons ? {
          min: req.query.minCoupons ? parseInt(req.query.minCoupons as string) : undefined,
          max: req.query.maxCoupons ? parseInt(req.query.maxCoupons as string) : undefined
        } : undefined,
        location: req.query.location as string,
        language: req.query.language as string,
        hasPersonalChannel: req.query.hasPersonalChannel ? req.query.hasPersonalChannel === 'true' : undefined,
        activityLevel: req.query.activityLevel as any,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as any
      };

      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

      const result = await this.userService.getUsers(filter, page, limit);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get users'
      });
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = await this.userService.getUserById(id);
      
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user'
      });
    }
  }

  /**
   * Search users
   */
  async searchUsers(req: Request, res: Response): Promise<void> {
    try {
      const { query } = req.query;
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

      if (!query) {
        res.status(400).json({
          success: false,
          error: 'Search query is required'
        });
        return;
      }

      const result = await this.userService.searchUsers(query as string, page, limit);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search users'
      });
    }
  }

  /**
   * Update user
   */
  async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;

      const user = await this.userService.updateUser(id, updates);
      
      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update user'
      });
    }
  }

  /**
   * Ban or unban user
   */
  async banUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { action, reason, duration } = req.body;
      const moderatorId = req.user?.id || 'admin';

      if (!['ban', 'unban'].includes(action)) {
        res.status(400).json({
          success: false,
          error: 'Invalid action. Must be "ban" or "unban"'
        });
        return;
      }

      const user = await this.userService.banUser(
        id, 
        action as BanAction, 
        moderatorId, 
        reason, 
        duration
      );
      
      res.json({
        success: true,
        data: user,
        message: `User ${action}ned successfully`
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update user ban status'
      });
    }
  }

  /**
   * Manage personal channel
   */
  async managePersonalChannel(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { action, reason } = req.body;
      const moderatorId = req.user?.id || 'admin';

      if (!['create', 'delete', 'suspend', 'restore'].includes(action)) {
        res.status(400).json({
          success: false,
          error: 'Invalid action. Must be "create", "delete", "suspend", or "restore"'
        });
        return;
      }

      const result = await this.userService.managePersonalChannel(
        id, 
        action, 
        moderatorId, 
        reason
      );
      
      res.json({
        success: true,
        data: result,
        message: `Channel ${action}d successfully`
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to manage personal channel'
      });
    }
  }

  /**
   * Get user activity
   */
  async getUserActivity(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

      const result = await this.userService.getUserActivity(id, page, limit);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user activity'
      });
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(req: Request, res: Response): Promise<void> {
    try {
      const dateRange = req.query.dateFrom && req.query.dateTo ? {
        from: new Date(req.query.dateFrom as string),
        to: new Date(req.query.dateTo as string)
      } : undefined;

      const stats = await this.userService.getUserStats(dateRange);
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user statistics'
      });
    }
  }

  /**
   * Segment users
   */
  async segmentUsers(req: Request, res: Response): Promise<void> {
    try {
      const criteria = req.body;
      const segments = await this.userService.segmentUsers(criteria);
      
      res.json({
        success: true,
        data: segments
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to segment users'
      });
    }
  }

  /**
   * Bulk operations on users
   */
  async bulkUserOperation(req: Request, res: Response): Promise<void> {
    try {
      const { userIds, operation, reason, duration } = req.body;
      const operatorId = req.user?.id || 'admin';

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        res.status(400).json({
          success: false,
          error: 'User IDs array is required'
        });
        return;
      }

      if (!['ban', 'unban', 'suspend_channel', 'restore_channel', 'delete_channel'].includes(operation)) {
        res.status(400).json({
          success: false,
          error: 'Invalid operation'
        });
        return;
      }

      const result = await this.userService.bulkUserOperation(
        userIds, 
        operation, 
        operatorId, 
        { reason, duration }
      );
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to perform bulk operation'
      });
    }
  }

  /**
   * Export users
   */
  async exportUsers(req: Request, res: Response): Promise<void> {
    try {
      const filter: UserFilter = req.body.filter || {};
      const format = req.body.format || 'csv';
      const exportOptions: UserExport = req.body.exportOptions || {};

      const result = await this.userService.exportUsers(filter, format, exportOptions);
      
      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.send(result.data);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export users'
      });
    }
  }

  /**
   * Get moderation logs
   */
  async getModerationLogs(req: Request, res: Response): Promise<void> {
    try {
      const filter = {
        userId: req.query.userId as string,
        moderatorId: req.query.moderatorId as string,
        action: req.query.action as string,
        dateRange: req.query.dateFrom && req.query.dateTo ? {
          from: new Date(req.query.dateFrom as string),
          to: new Date(req.query.dateTo as string)
        } : undefined
      };

      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

      const result = await this.userService.getModerationLogs(filter, page, limit);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get moderation logs'
      });
    }
  }

  /**
   * Get user engagement metrics
   */
  async getUserEngagementMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const dateRange = req.query.dateFrom && req.query.dateTo ? {
        from: new Date(req.query.dateFrom as string),
        to: new Date(req.query.dateTo as string)
      } : undefined;

      const metrics = await this.userService.getUserEngagementMetrics(id, dateRange);
      
      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user engagement metrics'
      });
    }
  }

  /**
   * Send notification to users
   */
  async sendNotificationToUsers(req: Request, res: Response): Promise<void> {
    try {
      const { userIds, notification } = req.body;
      const senderId = req.user?.id || 'admin';

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        res.status(400).json({
          success: false,
          error: 'User IDs array is required'
        });
        return;
      }

      if (!notification || !notification.title || !notification.message) {
        res.status(400).json({
          success: false,
          error: 'Notification title and message are required'
        });
        return;
      }

      const result = await this.userService.sendNotificationToUsers(
        userIds, 
        notification, 
        senderId
      );
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send notifications'
      });
    }
  }

  /**
   * Get ban list
   */
  async getBanList(req: Request, res: Response): Promise<void> {
    try {
      const filter: UserFilter = {
        isBanned: true,
        sortBy: req.query.sortBy as string || 'bannedAt',
        sortOrder: req.query.sortOrder as any || 'desc'
      };

      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

      const result = await this.userService.getUsers(filter, page, limit);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get ban list'
      });
    }
  }

  /**
   * Get users with suspended channels
   */
  async getSuspendedChannels(req: Request, res: Response): Promise<void> {
    try {
      const filter: UserFilter = {
        channelStatus: 'suspended',
        sortBy: req.query.sortBy as string || 'lastActiveAt',
        sortOrder: req.query.sortOrder as any || 'desc'
      };

      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

      const result = await this.userService.getUsers(filter, page, limit);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get suspended channels'
      });
    }
  }

  /**
   * Get group moderation settings
   */
  async getGroupModerationSettings(req: Request, res: Response): Promise<void> {
    try {
      // This would typically fetch from a group moderation settings table
      // For now, return default settings
      const defaultSettings = {
        autoModeration: {
          enabled: true,
          spamDetection: true,
          linkFiltering: true,
          profanityFilter: true,
          duplicateMessageFilter: true
        },
        restrictions: {
          newMemberRestrictions: true,
          messageFrequencyLimit: 5,
          linkPostingAllowed: false,
          mediaPostingAllowed: true,
          forwardingAllowed: true
        },
        moderators: [],
        bannedWords: ['spam', 'scam', 'fake'],
        allowedDomains: ['telegram.org', 'zabardoo.com'],
        warningThresholds: {
          autoWarn: 3,
          autoMute: 5,
          autoBan: 10
        }
      };

      res.json({
        success: true,
        data: defaultSettings
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get group moderation settings'
      });
    }
  }

  /**
   * Update group moderation settings
   */
  async updateGroupModerationSettings(req: Request, res: Response): Promise<void> {
    try {
      const settings = req.body;
      const moderatorId = req.user?.id || 'admin';

      // In a real implementation, you would save these settings to the database
      // For now, just return the updated settings
      
      res.json({
        success: true,
        data: {
          ...settings,
          updatedBy: moderatorId,
          updatedAt: new Date()
        },
        message: 'Group moderation settings updated successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update group moderation settings'
      });
    }
  }
}
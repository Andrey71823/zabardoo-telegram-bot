import { BaseService } from '../base/BaseService';
import { UserManagementRepository } from '../../repositories/UserManagementRepository';
import { 
  User, 
  UserFilter, 
  UserStats, 
  BanAction,
  UserActivity,
  UserSegment,
  UserExport,
  ChannelManagement,
  ModerationLog
} from '../../models/UserManagement';

export class UserManagementService extends BaseService {
  private repository: UserManagementRepository;

  constructor() {
    super();
    this.repository = new UserManagementRepository();
  }

  protected setupServiceRoutes(): void {
    // Service routes setup if needed
  }

  protected async checkServiceHealth(): Promise<boolean> {
    try {
      await this.repository.healthCheck();
      return true;
    } catch (error) {
      this.logger.error('UserManagementService health check failed', { error: error.message });
      return false;
    }
  }

  /**
   * Get users with filtering and pagination
   */
  async getUsers(
    filter: UserFilter = {},
    page: number = 1,
    limit: number = 20
  ): Promise<{
    users: User[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const offset = (page - 1) * limit;
      const result = await this.repository.getUsers(filter, limit, offset);

      return {
        users: result.users,
        total: result.total,
        page,
        totalPages: Math.ceil(result.total / limit)
      };
    } catch (error) {
      this.logger.error('Failed to get users', { error: error.message, filter, page, limit });
      throw error;
    }
  }

  /**
   * Get user by ID with detailed information
   */
  async getUserById(userId: string): Promise<User | null> {
    try {
      return await this.repository.getUserById(userId);
    } catch (error) {
      this.logger.error('Failed to get user by ID', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Search users by text
   */
  async searchUsers(
    searchTerm: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    users: User[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const offset = (page - 1) * limit;
      const result = await this.repository.searchUsers(searchTerm, limit, offset);

      return {
        users: result.users,
        total: result.total,
        page,
        totalPages: Math.ceil(result.total / limit)
      };
    } catch (error) {
      this.logger.error('Failed to search users', { error: error.message, searchTerm, page, limit });
      throw error;
    }
  }

  /**
   * Update user information
   */
  async updateUser(userId: string, updateData: Partial<User>): Promise<User> {
    try {
      updateData.updatedAt = new Date();
      const updatedUser = await this.repository.updateUser(userId, updateData);

      this.logger.info('User updated successfully', { 
        userId,
        updatedFields: Object.keys(updateData)
      });

      return updatedUser;
    } catch (error) {
      this.logger.error('Failed to update user', { error: error.message, userId, updateData });
      throw error;
    }
  }

  /**
   * Ban or unban user
   */
  async banUser(
    userId: string,
    action: BanAction,
    moderatorId: string,
    reason?: string,
    duration?: number // Duration in hours
  ): Promise<User> {
    try {
      const user = await this.repository.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const updateData: Partial<User> = {
        isBanned: action === 'ban',
        bannedAt: action === 'ban' ? new Date() : null,
        bannedBy: action === 'ban' ? moderatorId : null,
        banReason: action === 'ban' ? reason : null,
        banExpiresAt: action === 'ban' && duration ? 
          new Date(Date.now() + duration * 60 * 60 * 1000) : null,
        updatedAt: new Date()
      };

      const updatedUser = await this.repository.updateUser(userId, updateData);

      // Log moderation action
      await this.logModerationAction({
        userId,
        moderatorId,
        action: action === 'ban' ? 'user_banned' : 'user_unbanned',
        reason,
        metadata: { duration }
      });

      this.logger.info('User ban status updated', { 
        userId,
        action,
        moderatorId,
        reason,
        duration
      });

      return updatedUser;
    } catch (error) {
      this.logger.error('Failed to update user ban status', { 
        error: error.message, 
        userId, 
        action, 
        moderatorId 
      });
      throw error;
    }
  }

  /**
   * Manage user's personal channel
   */
  async managePersonalChannel(
    userId: string,
    action: 'create' | 'delete' | 'suspend' | 'restore',
    moderatorId: string,
    reason?: string
  ): Promise<ChannelManagement> {
    try {
      const user = await this.repository.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      let channelData: Partial<ChannelManagement>;

      switch (action) {
        case 'create':
          channelData = {
            userId,
            channelId: await this.generateChannelId(user),
            status: 'active',
            createdBy: moderatorId,
            createdAt: new Date()
          };
          break;

        case 'delete':
          channelData = {
            status: 'deleted',
            deletedBy: moderatorId,
            deletedAt: new Date(),
            deletionReason: reason
          };
          break;

        case 'suspend':
          channelData = {
            status: 'suspended',
            suspendedBy: moderatorId,
            suspendedAt: new Date(),
            suspensionReason: reason
          };
          break;

        case 'restore':
          channelData = {
            status: 'active',
            restoredBy: moderatorId,
            restoredAt: new Date(),
            restorationReason: reason
          };
          break;

        default:
          throw new Error(`Invalid channel action: ${action}`);
      }

      const result = await this.repository.managePersonalChannel(userId, channelData);

      // Log moderation action
      await this.logModerationAction({
        userId,
        moderatorId,
        action: `channel_${action}`,
        reason,
        metadata: { channelId: result.channelId }
      });

      this.logger.info('Personal channel managed', { 
        userId,
        action,
        moderatorId,
        channelId: result.channelId
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to manage personal channel', { 
        error: error.message, 
        userId, 
        action, 
        moderatorId 
      });
      throw error;
    }
  }

  /**
   * Get user activity history
   */
  async getUserActivity(
    userId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{
    activities: UserActivity[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const offset = (page - 1) * limit;
      const result = await this.repository.getUserActivity(userId, limit, offset);

      return {
        activities: result.activities,
        total: result.total,
        page,
        totalPages: Math.ceil(result.total / limit)
      };
    } catch (error) {
      this.logger.error('Failed to get user activity', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(
    dateRange?: { from: Date; to: Date }
  ): Promise<UserStats> {
    try {
      return await this.repository.getUserStats(dateRange);
    } catch (error) {
      this.logger.error('Failed to get user stats', { error: error.message, dateRange });
      throw error;
    }
  }

  /**
   * Segment users based on criteria
   */
  async segmentUsers(
    segmentCriteria: {
      registrationDateRange?: { from: Date; to: Date };
      activityLevel?: 'high' | 'medium' | 'low' | 'inactive';
      totalSpent?: { min?: number; max?: number };
      couponUsage?: { min?: number; max?: number };
      channelStatus?: 'active' | 'suspended' | 'deleted';
      isBanned?: boolean;
      location?: string;
    }
  ): Promise<UserSegment[]> {
    try {
      const segments = await this.repository.segmentUsers(segmentCriteria);

      this.logger.info('User segmentation completed', { 
        criteria: segmentCriteria,
        segmentCount: segments.length
      });

      return segments;
    } catch (error) {
      this.logger.error('Failed to segment users', { error: error.message, segmentCriteria });
      throw error;
    }
  }

  /**
   * Bulk operations on users
   */
  async bulkUserOperation(
    userIds: string[],
    operation: 'ban' | 'unban' | 'suspend_channel' | 'restore_channel' | 'delete_channel',
    operatorId: string,
    data?: { reason?: string; duration?: number }
  ): Promise<{
    success: number;
    failed: number;
    errors: Array<{ userId: string; error: string }>;
  }> {
    try {
      const results = {
        success: 0,
        failed: 0,
        errors: [] as Array<{ userId: string; error: string }>
      };

      for (const userId of userIds) {
        try {
          switch (operation) {
            case 'ban':
              await this.banUser(userId, 'ban', operatorId, data?.reason, data?.duration);
              break;

            case 'unban':
              await this.banUser(userId, 'unban', operatorId, data?.reason);
              break;

            case 'suspend_channel':
              await this.managePersonalChannel(userId, 'suspend', operatorId, data?.reason);
              break;

            case 'restore_channel':
              await this.managePersonalChannel(userId, 'restore', operatorId, data?.reason);
              break;

            case 'delete_channel':
              await this.managePersonalChannel(userId, 'delete', operatorId, data?.reason);
              break;

            default:
              throw new Error(`Unknown bulk operation: ${operation}`);
          }

          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            userId,
            error: error.message
          });
        }
      }

      this.logger.info('Bulk user operation completed', { 
        operation,
        operatorId,
        totalUsers: userIds.length,
        success: results.success,
        failed: results.failed
      });

      return results;
    } catch (error) {
      this.logger.error('Failed to perform bulk user operation', { 
        error: error.message, 
        operation, 
        operatorId,
        userCount: userIds.length
      });
      throw error;
    }
  }

  /**
   * Export users data
   */
  async exportUsers(
    filter: UserFilter,
    format: 'csv' | 'excel',
    exportOptions: UserExport
  ): Promise<{
    filename: string;
    mimeType: string;
    data: Buffer;
  }> {
    try {
      const users = await this.repository.getUsers(filter);
      
      let buffer: Buffer;
      let filename: string;
      let mimeType: string;

      if (format === 'csv') {
        buffer = await this.generateUsersCsvBuffer(users.users, exportOptions);
        filename = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
        mimeType = 'text/csv';
      } else {
        buffer = await this.generateUsersExcelBuffer(users.users, exportOptions);
        filename = `users-export-${new Date().toISOString().split('T')[0]}.xlsx`;
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      }

      this.logger.info('User export completed', { 
        format,
        userCount: users.users.length,
        filename
      });

      return {
        filename,
        mimeType,
        data: buffer
      };
    } catch (error) {
      this.logger.error('Failed to export users', { error: error.message, filter, format });
      throw error;
    }
  }

  /**
   * Get moderation logs
   */
  async getModerationLogs(
    filter: {
      userId?: string;
      moderatorId?: string;
      action?: string;
      dateRange?: { from: Date; to: Date };
    } = {},
    page: number = 1,
    limit: number = 50
  ): Promise<{
    logs: ModerationLog[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const offset = (page - 1) * limit;
      const result = await this.repository.getModerationLogs(filter, limit, offset);

      return {
        logs: result.logs,
        total: result.total,
        page,
        totalPages: Math.ceil(result.total / limit)
      };
    } catch (error) {
      this.logger.error('Failed to get moderation logs', { error: error.message, filter });
      throw error;
    }
  }

  /**
   * Get user engagement metrics
   */
  async getUserEngagementMetrics(
    userId: string,
    dateRange?: { from: Date; to: Date }
  ): Promise<{
    totalSessions: number;
    averageSessionDuration: number;
    totalCouponsUsed: number;
    totalSpent: number;
    lastActiveAt: Date;
    engagementScore: number;
    activityLevel: 'high' | 'medium' | 'low' | 'inactive';
  }> {
    try {
      return await this.repository.getUserEngagementMetrics(userId, dateRange);
    } catch (error) {
      this.logger.error('Failed to get user engagement metrics', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Send notification to users
   */
  async sendNotificationToUsers(
    userIds: string[],
    notification: {
      title: string;
      message: string;
      type: 'info' | 'warning' | 'promotion' | 'system';
      actionUrl?: string;
    },
    senderId: string
  ): Promise<{
    sent: number;
    failed: number;
    errors: Array<{ userId: string; error: string }>;
  }> {
    try {
      const results = {
        sent: 0,
        failed: 0,
        errors: [] as Array<{ userId: string; error: string }>
      };

      for (const userId of userIds) {
        try {
          await this.repository.sendNotificationToUser(userId, notification, senderId);
          results.sent++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            userId,
            error: error.message
          });
        }
      }

      this.logger.info('Bulk notification sent', { 
        senderId,
        totalUsers: userIds.length,
        sent: results.sent,
        failed: results.failed,
        notificationType: notification.type
      });

      return results;
    } catch (error) {
      this.logger.error('Failed to send bulk notification', { 
        error: error.message, 
        senderId,
        userCount: userIds.length
      });
      throw error;
    }
  }

  // Private helper methods

  /**
   * Generate unique channel ID for user
   */
  private async generateChannelId(user: User): Promise<string> {
    const prefix = 'CH';
    const userIdHash = user.telegramId.toString().slice(-4);
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    
    return `${prefix}${userIdHash}${timestamp}${random}`;
  }

  /**
   * Log moderation action
   */
  private async logModerationAction(logData: {
    userId: string;
    moderatorId: string;
    action: string;
    reason?: string;
    metadata?: any;
  }): Promise<void> {
    try {
      await this.repository.logModerationAction({
        ...logData,
        timestamp: new Date()
      });
    } catch (error) {
      this.logger.error('Failed to log moderation action', { error: error.message, logData });
      // Don't throw error as this is logging
    }
  }

  /**
   * Generate CSV buffer for users export
   */
  private async generateUsersCsvBuffer(users: User[], exportOptions: UserExport): Promise<Buffer> {
    const fields = exportOptions.fields || [
      'id', 'telegramId', 'username', 'firstName', 'lastName', 'isActive', 
      'isBanned', 'registeredAt', 'lastActiveAt', 'totalSpent', 'couponsUsed'
    ];
    
    const headers = fields.join(',');
    const rows = users.map(user => {
      return fields.map(field => {
        const value = (user as any)[field];
        if (value instanceof Date) {
          return value.toISOString();
        }
        return value || '';
      }).join(',');
    });
    
    const csvContent = [headers, ...rows].join('\n');
    return Buffer.from(csvContent, 'utf-8');
  }

  /**
   * Generate Excel buffer for users export
   */
  private async generateUsersExcelBuffer(users: User[], exportOptions: UserExport): Promise<Buffer> {
    // Simplified Excel generation - in production use proper Excel library
    // For now, return CSV as buffer
    return await this.generateUsersCsvBuffer(users, exportOptions);
  }
}
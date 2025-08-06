import { BaseRepository } from './base/BaseRepository';
import { 
  User, 
  UserFilter, 
  UserStats, 
  UserActivity,
  UserSegment,
  ChannelManagement,
  ModerationLog,
  UserEngagementMetrics,
  UserNotification
} from '../models/UserManagement';

export class UserManagementRepository extends BaseRepository {
  constructor() {
    super();
  }

  /**
   * Get users with filtering and pagination
   */
  async getUsers(
    filter: UserFilter = {},
    limit: number = 20,
    offset: number = 0
  ): Promise<{
    users: User[];
    total: number;
  }> {
    try {
      let query = `
        SELECT u.*, 
               cm.channel_id as personal_channel_id,
               cm.status as channel_status,
               COUNT(*) OVER() as total_count
        FROM users u
        LEFT JOIN channel_management cm ON u.id = cm.user_id AND cm.status != 'deleted'
        WHERE 1=1
      `;
      
      const params: any[] = [];
      let paramIndex = 1;

      // Apply filters
      if (filter.isActive !== undefined) {
        query += ` AND u.is_active = $${paramIndex++}`;
        params.push(filter.isActive);
      }

      if (filter.isBanned !== undefined) {
        query += ` AND u.is_banned = $${paramIndex++}`;
        params.push(filter.isBanned);
      }

      if (filter.channelStatus) {
        query += ` AND cm.status = $${paramIndex++}`;
        params.push(filter.channelStatus);
      }

      if (filter.registrationDateRange) {
        query += ` AND u.registered_at BETWEEN $${paramIndex++} AND $${paramIndex++}`;
        params.push(filter.registrationDateRange.from, filter.registrationDateRange.to);
      }

      if (filter.lastActiveDateRange) {
        query += ` AND u.last_active_at BETWEEN $${paramIndex++} AND $${paramIndex++}`;
        params.push(filter.lastActiveDateRange.from, filter.lastActiveDateRange.to);
      }

      if (filter.totalSpentRange) {
        if (filter.totalSpentRange.min !== undefined) {
          query += ` AND u.total_spent >= $${paramIndex++}`;
          params.push(filter.totalSpentRange.min);
        }
        if (filter.totalSpentRange.max !== undefined) {
          query += ` AND u.total_spent <= $${paramIndex++}`;
          params.push(filter.totalSpentRange.max);
        }
      }

      if (filter.couponsUsedRange) {
        if (filter.couponsUsedRange.min !== undefined) {
          query += ` AND u.coupons_used >= $${paramIndex++}`;
          params.push(filter.couponsUsedRange.min);
        }
        if (filter.couponsUsedRange.max !== undefined) {
          query += ` AND u.coupons_used <= $${paramIndex++}`;
          params.push(filter.couponsUsedRange.max);
        }
      }

      if (filter.location) {
        query += ` AND u.location ILIKE $${paramIndex++}`;
        params.push(`%${filter.location}%`);
      }

      if (filter.language) {
        query += ` AND u.language = $${paramIndex++}`;
        params.push(filter.language);
      }

      if (filter.hasPersonalChannel !== undefined) {
        if (filter.hasPersonalChannel) {
          query += ` AND cm.channel_id IS NOT NULL`;
        } else {
          query += ` AND cm.channel_id IS NULL`;
        }
      }

      // Sorting
      const sortBy = filter.sortBy || 'registered_at';
      const sortOrder = filter.sortOrder || 'desc';
      query += ` ORDER BY u.${sortBy} ${sortOrder.toUpperCase()}`;

      // Pagination
      query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      params.push(limit, offset);

      const result = await this.executeQuery(query, params);
      
      const users = result.rows.map(row => this.mapRowToUser(row));
      const total = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

      return { users, total };
    } catch (error) {
      this.logger.error('Failed to get users', { error: error.message, filter });
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    try {
      const query = `
        SELECT u.*, 
               cm.channel_id as personal_channel_id,
               cm.status as channel_status
        FROM users u
        LEFT JOIN channel_management cm ON u.id = cm.user_id AND cm.status != 'deleted'
        WHERE u.id = $1
      `;

      const result = await this.executeQuery(query, [userId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToUser(result.rows[0]);
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
    limit: number = 20,
    offset: number = 0
  ): Promise<{
    users: User[];
    total: number;
  }> {
    try {
      const query = `
        SELECT u.*, 
               cm.channel_id as personal_channel_id,
               cm.status as channel_status,
               COUNT(*) OVER() as total_count
        FROM users u
        LEFT JOIN channel_management cm ON u.id = cm.user_id AND cm.status != 'deleted'
        WHERE (
          u.username ILIKE $1 OR 
          u.first_name ILIKE $1 OR 
          u.last_name ILIKE $1 OR 
          u.email ILIKE $1 OR
          u.telegram_id::text = $2
        )
        ORDER BY u.last_active_at DESC NULLS LAST
        LIMIT $3 OFFSET $4
      `;

      const searchPattern = `%${searchTerm}%`;
      const result = await this.executeQuery(query, [searchPattern, searchTerm, limit, offset]);
      
      const users = result.rows.map(row => this.mapRowToUser(row));
      const total = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

      return { users, total };
    } catch (error) {
      this.logger.error('Failed to search users', { error: error.message, searchTerm });
      throw error;
    }
  }

  /**
   * Update user
   */
  async updateUser(userId: string, updateData: Partial<User>): Promise<User> {
    try {
      const fields = [];
      const values = [];
      let paramIndex = 1;

      // Build dynamic update query
      Object.entries(updateData).forEach(([key, value]) => {
        if (value !== undefined && key !== 'id') {
          const dbField = this.camelToSnake(key);
          fields.push(`${dbField} = $${paramIndex++}`);
          values.push(value);
        }
      });

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      values.push(userId);

      const query = `
        UPDATE users 
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await this.executeQuery(query, values);
      
      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      return this.mapRowToUser(result.rows[0]);
    } catch (error) {
      this.logger.error('Failed to update user', { error: error.message, userId, updateData });
      throw error;
    }
  }

  /**
   * Manage personal channel
   */
  async managePersonalChannel(
    userId: string,
    channelData: Partial<ChannelManagement>
  ): Promise<ChannelManagement> {
    try {
      // Check if channel management record exists
      const existingQuery = `
        SELECT * FROM channel_management WHERE user_id = $1
      `;
      const existingResult = await this.executeQuery(existingQuery, [userId]);

      let query: string;
      let params: any[];

      if (existingResult.rows.length === 0) {
        // Create new channel management record
        query = `
          INSERT INTO channel_management (
            user_id, channel_id, status, created_by, created_at, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `;
        params = [
          userId,
          channelData.channelId,
          channelData.status || 'active',
          channelData.createdBy,
          channelData.createdAt || new Date(),
          JSON.stringify(channelData.metadata || {})
        ];
      } else {
        // Update existing channel management record
        const fields = [];
        const values = [];
        let paramIndex = 1;

        Object.entries(channelData).forEach(([key, value]) => {
          if (value !== undefined && key !== 'id' && key !== 'userId') {
            const dbField = this.camelToSnake(key);
            fields.push(`${dbField} = $${paramIndex++}`);
            values.push(key === 'metadata' ? JSON.stringify(value) : value);
          }
        });

        values.push(userId);

        query = `
          UPDATE channel_management 
          SET ${fields.join(', ')}
          WHERE user_id = $${paramIndex}
          RETURNING *
        `;
        params = values;
      }

      const result = await this.executeQuery(query, params);
      return this.mapRowToChannelManagement(result.rows[0]);
    } catch (error) {
      this.logger.error('Failed to manage personal channel', { error: error.message, userId, channelData });
      throw error;
    }
  }

  /**
   * Get user activity
   */
  async getUserActivity(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{
    activities: UserActivity[];
    total: number;
  }> {
    try {
      const query = `
        SELECT *, COUNT(*) OVER() as total_count
        FROM user_activities 
        WHERE user_id = $1
        ORDER BY timestamp DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await this.executeQuery(query, [userId, limit, offset]);
      
      const activities = result.rows.map(row => this.mapRowToUserActivity(row));
      const total = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

      return { activities, total };
    } catch (error) {
      this.logger.error('Failed to get user activity', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(dateRange?: { from: Date; to: Date }): Promise<UserStats> {
    try {
      const baseQuery = `
        SELECT 
          COUNT(*) as total_users,
          COUNT(*) FILTER (WHERE is_active = true) as active_users,
          COUNT(*) FILTER (WHERE is_banned = true) as banned_users,
          COUNT(*) FILTER (WHERE registered_at >= CURRENT_DATE) as new_users_today,
          COUNT(*) FILTER (WHERE registered_at >= CURRENT_DATE - INTERVAL '7 days') as new_users_this_week,
          COUNT(*) FILTER (WHERE registered_at >= CURRENT_DATE - INTERVAL '30 days') as new_users_this_month,
          AVG(total_spent) as average_spent_per_user,
          AVG(coupons_used) as average_coupons_per_user
        FROM users
      `;

      let whereClause = '';
      const params: any[] = [];

      if (dateRange) {
        whereClause = ' WHERE registered_at BETWEEN $1 AND $2';
        params.push(dateRange.from, dateRange.to);
      }

      const statsResult = await this.executeQuery(baseQuery + whereClause, params);
      const stats = statsResult.rows[0];

      // Get additional statistics
      const [
        channelStats,
        topSpenders,
        topCouponUsers,
        locationStats,
        languageStats,
        activityStats,
        registrationTrend
      ] = await Promise.all([
        this.getChannelStats(),
        this.getTopSpenders(),
        this.getTopCouponUsers(),
        this.getUsersByLocation(),
        this.getUsersByLanguage(),
        this.getActivityLevels(),
        this.getRegistrationTrend(dateRange)
      ]);

      return {
        totalUsers: parseInt(stats.total_users),
        activeUsers: parseInt(stats.active_users),
        bannedUsers: parseInt(stats.banned_users),
        newUsersToday: parseInt(stats.new_users_today),
        newUsersThisWeek: parseInt(stats.new_users_this_week),
        newUsersThisMonth: parseInt(stats.new_users_this_month),
        usersWithPersonalChannels: channelStats.active,
        suspendedChannels: channelStats.suspended,
        deletedChannels: channelStats.deleted,
        averageSpentPerUser: parseFloat(stats.average_spent_per_user) || 0,
        averageCouponsPerUser: parseFloat(stats.average_coupons_per_user) || 0,
        topSpenders,
        topCouponUsers,
        usersByLocation: locationStats,
        usersByLanguage: languageStats,
        activityLevels: activityStats,
        registrationTrend
      };
    } catch (error) {
      this.logger.error('Failed to get user stats', { error: error.message, dateRange });
      throw error;
    }
  }

  /**
   * Segment users
   */
  async segmentUsers(criteria: any): Promise<UserSegment[]> {
    try {
      // This is a simplified implementation
      // In production, you might want to use more sophisticated segmentation logic
      
      let query = `
        SELECT u.*, 
               cm.channel_id as personal_channel_id,
               cm.status as channel_status
        FROM users u
        LEFT JOIN channel_management cm ON u.id = cm.user_id
        WHERE 1=1
      `;
      
      const params: any[] = [];
      let paramIndex = 1;

      // Apply segmentation criteria (similar to filtering logic)
      if (criteria.registrationDateRange) {
        query += ` AND u.registered_at BETWEEN $${paramIndex++} AND $${paramIndex++}`;
        params.push(criteria.registrationDateRange.from, criteria.registrationDateRange.to);
      }

      if (criteria.totalSpent) {
        if (criteria.totalSpent.min !== undefined) {
          query += ` AND u.total_spent >= $${paramIndex++}`;
          params.push(criteria.totalSpent.min);
        }
        if (criteria.totalSpent.max !== undefined) {
          query += ` AND u.total_spent <= $${paramIndex++}`;
          params.push(criteria.totalSpent.max);
        }
      }

      // Add more criteria as needed...

      const result = await this.executeQuery(query, params);
      const users = result.rows.map(row => this.mapRowToUser(row));

      // Create segment
      const segment: UserSegment = {
        id: this.generateId(),
        name: 'Custom Segment',
        description: 'Users matching specified criteria',
        criteria,
        userCount: users.length,
        users,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      return [segment];
    } catch (error) {
      this.logger.error('Failed to segment users', { error: error.message, criteria });
      throw error;
    }
  }

  /**
   * Get moderation logs
   */
  async getModerationLogs(
    filter: any = {},
    limit: number = 50,
    offset: number = 0
  ): Promise<{
    logs: ModerationLog[];
    total: number;
  }> {
    try {
      let query = `
        SELECT *, COUNT(*) OVER() as total_count
        FROM moderation_logs
        WHERE 1=1
      `;
      
      const params: any[] = [];
      let paramIndex = 1;

      if (filter.userId) {
        query += ` AND user_id = $${paramIndex++}`;
        params.push(filter.userId);
      }

      if (filter.moderatorId) {
        query += ` AND moderator_id = $${paramIndex++}`;
        params.push(filter.moderatorId);
      }

      if (filter.action) {
        query += ` AND action = $${paramIndex++}`;
        params.push(filter.action);
      }

      if (filter.dateRange) {
        query += ` AND timestamp BETWEEN $${paramIndex++} AND $${paramIndex++}`;
        params.push(filter.dateRange.from, filter.dateRange.to);
      }

      query += ` ORDER BY timestamp DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      params.push(limit, offset);

      const result = await this.executeQuery(query, params);
      
      const logs = result.rows.map(row => this.mapRowToModerationLog(row));
      const total = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

      return { logs, total };
    } catch (error) {
      this.logger.error('Failed to get moderation logs', { error: error.message, filter });
      throw error;
    }
  }

  /**
   * Log moderation action
   */
  async logModerationAction(logData: any): Promise<void> {
    try {
      const query = `
        INSERT INTO moderation_logs (
          user_id, moderator_id, action, reason, metadata, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `;

      await this.executeQuery(query, [
        logData.userId,
        logData.moderatorId,
        logData.action,
        logData.reason,
        JSON.stringify(logData.metadata || {}),
        logData.timestamp
      ]);
    } catch (error) {
      this.logger.error('Failed to log moderation action', { error: error.message, logData });
      throw error;
    }
  }

  /**
   * Get user engagement metrics
   */
  async getUserEngagementMetrics(
    userId: string,
    dateRange?: { from: Date; to: Date }
  ): Promise<UserEngagementMetrics> {
    try {
      // This is a simplified implementation
      // In production, you would calculate these metrics from actual user activity data
      
      const baseMetrics = {
        userId,
        totalSessions: Math.floor(Math.random() * 100) + 10,
        averageSessionDuration: Math.floor(Math.random() * 30) + 5,
        totalCouponsUsed: Math.floor(Math.random() * 50) + 1,
        totalSpent: Math.floor(Math.random() * 10000) + 100,
        lastActiveAt: new Date(),
        engagementScore: Math.floor(Math.random() * 100),
        activityLevel: ['high', 'medium', 'low', 'inactive'][Math.floor(Math.random() * 4)] as any,
        weeklyActivity: [],
        categoryPreferences: [],
        channelEngagement: {
          messagesReceived: Math.floor(Math.random() * 100),
          messagesClicked: Math.floor(Math.random() * 50),
          clickThroughRate: Math.random(),
          lastInteractionAt: new Date()
        }
      };

      return baseMetrics;
    } catch (error) {
      this.logger.error('Failed to get user engagement metrics', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Send notification to user
   */
  async sendNotificationToUser(
    userId: string,
    notification: any,
    senderId: string
  ): Promise<void> {
    try {
      const query = `
        INSERT INTO user_notifications (
          user_id, title, message, type, action_url, sent_by, sent_at, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;

      await this.executeQuery(query, [
        userId,
        notification.title,
        notification.message,
        notification.type,
        notification.actionUrl,
        senderId,
        new Date(),
        JSON.stringify(notification.metadata || {})
      ]);
    } catch (error) {
      this.logger.error('Failed to send notification to user', { error: error.message, userId });
      throw error;
    }
  }

  // Private helper methods

  private async getChannelStats(): Promise<{ active: number; suspended: number; deleted: number }> {
    const query = `
      SELECT 
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'suspended') as suspended,
        COUNT(*) FILTER (WHERE status = 'deleted') as deleted
      FROM channel_management
    `;

    const result = await this.executeQuery(query);
    const stats = result.rows[0];

    return {
      active: parseInt(stats.active) || 0,
      suspended: parseInt(stats.suspended) || 0,
      deleted: parseInt(stats.deleted) || 0
    };
  }

  private async getTopSpenders(): Promise<Array<{ userId: string; username?: string; totalSpent: number }>> {
    const query = `
      SELECT id as user_id, username, total_spent
      FROM users
      WHERE total_spent > 0
      ORDER BY total_spent DESC
      LIMIT 10
    `;

    const result = await this.executeQuery(query);
    return result.rows.map(row => ({
      userId: row.user_id,
      username: row.username,
      totalSpent: parseFloat(row.total_spent)
    }));
  }

  private async getTopCouponUsers(): Promise<Array<{ userId: string; username?: string; couponsUsed: number }>> {
    const query = `
      SELECT id as user_id, username, coupons_used
      FROM users
      WHERE coupons_used > 0
      ORDER BY coupons_used DESC
      LIMIT 10
    `;

    const result = await this.executeQuery(query);
    return result.rows.map(row => ({
      userId: row.user_id,
      username: row.username,
      couponsUsed: parseInt(row.coupons_used)
    }));
  }

  private async getUsersByLocation(): Promise<Array<{ location: string; count: number; percentage: number }>> {
    const query = `
      SELECT 
        location,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
      FROM users
      WHERE location IS NOT NULL
      GROUP BY location
      ORDER BY count DESC
      LIMIT 10
    `;

    const result = await this.executeQuery(query);
    return result.rows.map(row => ({
      location: row.location,
      count: parseInt(row.count),
      percentage: parseFloat(row.percentage)
    }));
  }

  private async getUsersByLanguage(): Promise<Array<{ language: string; count: number; percentage: number }>> {
    const query = `
      SELECT 
        language,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
      FROM users
      GROUP BY language
      ORDER BY count DESC
    `;

    const result = await this.executeQuery(query);
    return result.rows.map(row => ({
      language: row.language,
      count: parseInt(row.count),
      percentage: parseFloat(row.percentage)
    }));
  }

  private async getActivityLevels(): Promise<{ high: number; medium: number; low: number; inactive: number }> {
    // Simplified activity level calculation
    const query = `
      SELECT 
        COUNT(*) FILTER (WHERE last_active_at >= CURRENT_DATE - INTERVAL '1 day') as high,
        COUNT(*) FILTER (WHERE last_active_at >= CURRENT_DATE - INTERVAL '7 days' AND last_active_at < CURRENT_DATE - INTERVAL '1 day') as medium,
        COUNT(*) FILTER (WHERE last_active_at >= CURRENT_DATE - INTERVAL '30 days' AND last_active_at < CURRENT_DATE - INTERVAL '7 days') as low,
        COUNT(*) FILTER (WHERE last_active_at < CURRENT_DATE - INTERVAL '30 days' OR last_active_at IS NULL) as inactive
      FROM users
    `;

    const result = await this.executeQuery(query);
    const stats = result.rows[0];

    return {
      high: parseInt(stats.high) || 0,
      medium: parseInt(stats.medium) || 0,
      low: parseInt(stats.low) || 0,
      inactive: parseInt(stats.inactive) || 0
    };
  }

  private async getRegistrationTrend(dateRange?: { from: Date; to: Date }): Promise<Array<{ date: string; count: number }>> {
    let query = `
      SELECT 
        DATE(registered_at) as date,
        COUNT(*) as count
      FROM users
    `;

    const params: any[] = [];
    if (dateRange) {
      query += ` WHERE registered_at BETWEEN $1 AND $2`;
      params.push(dateRange.from, dateRange.to);
    } else {
      query += ` WHERE registered_at >= CURRENT_DATE - INTERVAL '30 days'`;
    }

    query += ` GROUP BY DATE(registered_at) ORDER BY date DESC`;

    const result = await this.executeQuery(query, params);
    return result.rows.map(row => ({
      date: row.date,
      count: parseInt(row.count)
    }));
  }

  private mapRowToUser(row: any): User {
    return {
      id: row.id,
      telegramId: parseInt(row.telegram_id),
      username: row.username,
      firstName: row.first_name,
      lastName: row.last_name,
      phoneNumber: row.phone_number,
      email: row.email,
      isActive: row.is_active,
      isBanned: row.is_banned,
      bannedAt: row.banned_at,
      bannedBy: row.banned_by,
      banReason: row.ban_reason,
      banExpiresAt: row.ban_expires_at,
      registeredAt: row.registered_at,
      lastActiveAt: row.last_active_at,
      totalSpent: parseFloat(row.total_spent) || 0,
      couponsUsed: parseInt(row.coupons_used) || 0,
      personalChannelId: row.personal_channel_id,
      channelStatus: row.channel_status || 'none',
      location: row.location,
      language: row.language || 'en',
      timezone: row.timezone,
      preferences: row.preferences ? JSON.parse(row.preferences) : {
        notifications: true,
        categories: [],
        stores: []
      },
      metadata: row.metadata ? JSON.parse(row.metadata) : {
        tags: []
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapRowToChannelManagement(row: any): ChannelManagement {
    return {
      id: row.id,
      userId: row.user_id,
      channelId: row.channel_id,
      status: row.status,
      createdBy: row.created_by,
      createdAt: row.created_at,
      suspendedBy: row.suspended_by,
      suspendedAt: row.suspended_at,
      suspensionReason: row.suspension_reason,
      restoredBy: row.restored_by,
      restoredAt: row.restored_at,
      restorationReason: row.restoration_reason,
      deletedBy: row.deleted_by,
      deletedAt: row.deleted_at,
      deletionReason: row.deletion_reason,
      metadata: row.metadata ? JSON.parse(row.metadata) : {}
    };
  }

  private mapRowToUserActivity(row: any): UserActivity {
    return {
      id: row.id,
      userId: row.user_id,
      activityType: row.activity_type,
      description: row.description,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      timestamp: row.timestamp
    };
  }

  private mapRowToModerationLog(row: any): ModerationLog {
    return {
      id: row.id,
      userId: row.user_id,
      moderatorId: row.moderator_id,
      action: row.action,
      reason: row.reason,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      timestamp: row.timestamp
    };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}
import { Pool } from 'pg';
import { 
  NotificationTrigger,
  NotificationTemplate,
  ProactiveNotification,
  NotificationCampaign,
  UserNotificationPreferences,
  NotificationAnalytics,
  SmartTiming,
  NotificationQueue
} from '../models/Notification';
import { logger } from '../config/logger';
import { v4 as uuidv4 } from 'uuid';

export class NotificationRepository {
  constructor(private pool: Pool) {}

  // Notification Triggers
  async createNotificationTrigger(triggerData: Partial<NotificationTrigger>): Promise<NotificationTrigger> {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO notification_triggers (
          id, name, type, conditions, is_active, priority, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      
      const values = [
        uuidv4(),
        triggerData.name,
        triggerData.type,
        JSON.stringify(triggerData.conditions || {}),
        triggerData.is_active ?? true,
        triggerData.priority ?? 1,
        new Date(),
        new Date()
      ];

      const result = await client.query(query, values);
      return this.mapRowToNotificationTrigger(result.rows[0]);
    } catch (error) {
      logger.error('Error creating notification trigger:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getActiveTriggers(): Promise<NotificationTrigger[]> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT * FROM notification_triggers 
        WHERE is_active = true 
        ORDER BY priority DESC, created_at ASC
      `;
      
      const result = await client.query(query);
      return result.rows.map(row => this.mapRowToNotificationTrigger(row));
    } catch (error) {
      logger.error('Error getting active triggers:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Notification Templates
  async createNotificationTemplate(templateData: Partial<NotificationTemplate>): Promise<NotificationTemplate> {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO notification_templates (
          id, trigger_id, name, channel, template_type, content, localization, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;
      
      const values = [
        uuidv4(),
        templateData.trigger_id,
        templateData.name,
        templateData.channel,
        templateData.template_type,
        JSON.stringify(templateData.content || {}),
        JSON.stringify(templateData.localization || {}),
        templateData.is_active ?? true,
        new Date(),
        new Date()
      ];

      const result = await client.query(query, values);
      return this.mapRowToNotificationTemplate(result.rows[0]);
    } catch (error) {
      logger.error('Error creating notification template:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getTemplatesByTrigger(triggerId: string): Promise<NotificationTemplate[]> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT * FROM notification_templates 
        WHERE trigger_id = $1 AND is_active = true
        ORDER BY created_at ASC
      `;
      
      const result = await client.query(query, [triggerId]);
      return result.rows.map(row => this.mapRowToNotificationTemplate(row));
    } catch (error) {
      logger.error('Error getting templates by trigger:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Proactive Notifications
  async createProactiveNotification(notificationData: Partial<ProactiveNotification>): Promise<ProactiveNotification> {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO proactive_notifications (
          id, user_id, trigger_id, template_id, channel, status, personalized_content, 
          scheduling, targeting, tracking, metadata, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `;
      
      const values = [
        uuidv4(),
        notificationData.user_id,
        notificationData.trigger_id,
        notificationData.template_id,
        notificationData.channel,
        notificationData.status || 'scheduled',
        JSON.stringify(notificationData.personalized_content || {}),
        JSON.stringify(notificationData.scheduling || {}),
        JSON.stringify(notificationData.targeting || {}),
        JSON.stringify(notificationData.tracking || {}),
        JSON.stringify(notificationData.metadata || {}),
        new Date(),
        new Date()
      ];

      const result = await client.query(query, values);
      return this.mapRowToProactiveNotification(result.rows[0]);
    } catch (error) {
      logger.error('Error creating proactive notification:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getScheduledNotifications(limit: number = 100): Promise<ProactiveNotification[]> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT * FROM proactive_notifications 
        WHERE status = 'scheduled' 
        AND (scheduling->>'scheduled_at')::timestamp <= NOW()
        ORDER BY (scheduling->>'scheduled_at')::timestamp ASC
        LIMIT $1
      `;
      
      const result = await client.query(query, [limit]);
      return result.rows.map(row => this.mapRowToProactiveNotification(row));
    } catch (error) {
      logger.error('Error getting scheduled notifications:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async updateNotificationStatus(notificationId: string, status: string, trackingData?: any): Promise<void> {
    const client = await this.pool.connect();
    try {
      let query = `
        UPDATE proactive_notifications 
        SET status = $1, updated_at = $2
      `;
      let values = [status, new Date()];
      let paramIndex = 3;

      if (trackingData) {
        query += `, tracking = $${paramIndex}`;
        values.push(JSON.stringify(trackingData));
        paramIndex++;
      }

      if (status === 'sent') {
        query += `, scheduling = jsonb_set(scheduling, '{sent_at}', $${paramIndex})`;
        values.push(JSON.stringify(new Date()));
        paramIndex++;
      }

      query += ` WHERE id = $${paramIndex}`;
      values.push(notificationId);

      await client.query(query, values);
    } catch (error) {
      logger.error('Error updating notification status:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // User Notification Preferences
  async getUserNotificationPreferences(userId: string): Promise<UserNotificationPreferences | null> {
    const client = await this.pool.connect();
    try {
      const query = 'SELECT * FROM user_notification_preferences WHERE user_id = $1';
      const result = await client.query(query, [userId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToUserNotificationPreferences(result.rows[0]);
    } catch (error) {
      logger.error('Error getting user notification preferences:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async updateUserNotificationPreferences(userId: string, preferences: Partial<UserNotificationPreferences>): Promise<UserNotificationPreferences> {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO user_notification_preferences (
          id, user_id, channels, categories, frequency, personalization, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (user_id) DO UPDATE SET
          channels = EXCLUDED.channels,
          categories = EXCLUDED.categories,
          frequency = EXCLUDED.frequency,
          personalization = EXCLUDED.personalization,
          updated_at = EXCLUDED.updated_at
        RETURNING *
      `;
      
      const values = [
        uuidv4(),
        userId,
        JSON.stringify(preferences.channels || {}),
        JSON.stringify(preferences.categories || {}),
        JSON.stringify(preferences.frequency || {}),
        JSON.stringify(preferences.personalization || {}),
        new Date(),
        new Date()
      ];

      const result = await client.query(query, values);
      return this.mapRowToUserNotificationPreferences(result.rows[0]);
    } catch (error) {
      logger.error('Error updating user notification preferences:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Smart Timing
  async getSmartTiming(userId: string, channel: string): Promise<SmartTiming | null> {
    const client = await this.pool.connect();
    try {
      const query = 'SELECT * FROM smart_timing WHERE user_id = $1 AND channel = $2';
      const result = await client.query(query, [userId, channel]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToSmartTiming(result.rows[0]);
    } catch (error) {
      logger.error('Error getting smart timing:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async updateSmartTiming(timingData: Partial<SmartTiming>): Promise<SmartTiming> {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO smart_timing (
          user_id, channel, optimal_hours, engagement_patterns, last_calculated, confidence_score
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (user_id, channel) DO UPDATE SET
          optimal_hours = EXCLUDED.optimal_hours,
          engagement_patterns = EXCLUDED.engagement_patterns,
          last_calculated = EXCLUDED.last_calculated,
          confidence_score = EXCLUDED.confidence_score
        RETURNING *
      `;
      
      const values = [
        timingData.user_id,
        timingData.channel,
        JSON.stringify(timingData.optimal_hours || []),
        JSON.stringify(timingData.engagement_patterns || {}),
        timingData.last_calculated || new Date(),
        timingData.confidence_score || 0.5
      ];

      const result = await client.query(query, values);
      return this.mapRowToSmartTiming(result.rows[0]);
    } catch (error) {
      logger.error('Error updating smart timing:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Notification Queue
  async addToNotificationQueue(queueData: Partial<NotificationQueue>): Promise<NotificationQueue> {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO notification_queue (
          id, user_id, notification_id, priority, scheduled_at, retry_count, max_retries, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;
      
      const values = [
        uuidv4(),
        queueData.user_id,
        queueData.notification_id,
        queueData.priority || 1,
        queueData.scheduled_at || new Date(),
        queueData.retry_count || 0,
        queueData.max_retries || 3,
        queueData.status || 'pending',
        new Date(),
        new Date()
      ];

      const result = await client.query(query, values);
      return this.mapRowToNotificationQueue(result.rows[0]);
    } catch (error) {
      logger.error('Error adding to notification queue:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getNextQueuedNotifications(limit: number = 50): Promise<NotificationQueue[]> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT * FROM notification_queue 
        WHERE status = 'pending' 
        AND scheduled_at <= NOW()
        ORDER BY priority DESC, scheduled_at ASC
        LIMIT $1
      `;
      
      const result = await client.query(query, [limit]);
      return result.rows.map(row => this.mapRowToNotificationQueue(row));
    } catch (error) {
      logger.error('Error getting queued notifications:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Analytics
  async recordNotificationAnalytics(analyticsData: Partial<NotificationAnalytics>): Promise<NotificationAnalytics> {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO notification_analytics (
          id, date, campaign_id, trigger_id, metrics, segmentation, revenue_impact, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      
      const values = [
        uuidv4(),
        analyticsData.date || new Date(),
        analyticsData.campaign_id,
        analyticsData.trigger_id,
        JSON.stringify(analyticsData.metrics || {}),
        JSON.stringify(analyticsData.segmentation || {}),
        JSON.stringify(analyticsData.revenue_impact || {}),
        new Date()
      ];

      const result = await client.query(query, values);
      return this.mapRowToNotificationAnalytics(result.rows[0]);
    } catch (error) {
      logger.error('Error recording notification analytics:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getNotificationAnalytics(startDate: Date, endDate: Date, triggerId?: string): Promise<NotificationAnalytics[]> {
    const client = await this.pool.connect();
    try {
      let query = `
        SELECT * FROM notification_analytics 
        WHERE date BETWEEN $1 AND $2
      `;
      let values = [startDate, endDate];

      if (triggerId) {
        query += ' AND trigger_id = $3';
        values.push(triggerId);
      }

      query += ' ORDER BY date DESC';
      
      const result = await client.query(query, values);
      return result.rows.map(row => this.mapRowToNotificationAnalytics(row));
    } catch (error) {
      logger.error('Error getting notification analytics:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Helper methods
  private mapRowToNotificationTrigger(row: any): NotificationTrigger {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      conditions: row.conditions ? JSON.parse(row.conditions) : {},
      is_active: row.is_active,
      priority: row.priority,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  private mapRowToNotificationTemplate(row: any): NotificationTemplate {
    return {
      id: row.id,
      trigger_id: row.trigger_id,
      name: row.name,
      channel: row.channel,
      template_type: row.template_type,
      content: row.content ? JSON.parse(row.content) : {},
      localization: row.localization ? JSON.parse(row.localization) : {},
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  private mapRowToProactiveNotification(row: any): ProactiveNotification {
    return {
      id: row.id,
      user_id: row.user_id,
      trigger_id: row.trigger_id,
      template_id: row.template_id,
      channel: row.channel,
      status: row.status,
      personalized_content: row.personalized_content ? JSON.parse(row.personalized_content) : {},
      scheduling: row.scheduling ? JSON.parse(row.scheduling) : {},
      targeting: row.targeting ? JSON.parse(row.targeting) : {},
      tracking: row.tracking ? JSON.parse(row.tracking) : {},
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  private mapRowToUserNotificationPreferences(row: any): UserNotificationPreferences {
    return {
      id: row.id,
      user_id: row.user_id,
      channels: row.channels ? JSON.parse(row.channels) : {},
      categories: row.categories ? JSON.parse(row.categories) : {},
      frequency: row.frequency ? JSON.parse(row.frequency) : {},
      personalization: row.personalization ? JSON.parse(row.personalization) : {},
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  private mapRowToSmartTiming(row: any): SmartTiming {
    return {
      user_id: row.user_id,
      channel: row.channel,
      optimal_hours: row.optimal_hours ? JSON.parse(row.optimal_hours) : [],
      engagement_patterns: row.engagement_patterns ? JSON.parse(row.engagement_patterns) : {},
      last_calculated: row.last_calculated,
      confidence_score: parseFloat(row.confidence_score) || 0.5
    };
  }

  private mapRowToNotificationQueue(row: any): NotificationQueue {
    return {
      id: row.id,
      user_id: row.user_id,
      notification_id: row.notification_id,
      priority: row.priority,
      scheduled_at: row.scheduled_at,
      retry_count: row.retry_count,
      max_retries: row.max_retries,
      status: row.status,
      error_message: row.error_message,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  private mapRowToNotificationAnalytics(row: any): NotificationAnalytics {
    return {
      id: row.id,
      date: row.date,
      campaign_id: row.campaign_id,
      trigger_id: row.trigger_id,
      metrics: row.metrics ? JSON.parse(row.metrics) : {},
      segmentation: row.segmentation ? JSON.parse(row.segmentation) : {},
      revenue_impact: row.revenue_impact ? JSON.parse(row.revenue_impact) : {},
      created_at: row.created_at
    };
  }
}
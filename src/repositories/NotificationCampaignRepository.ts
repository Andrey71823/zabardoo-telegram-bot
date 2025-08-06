import { BaseRepository } from './base/BaseRepository';
import { 
  Campaign, 
  CampaignExecution,
  NotificationTemplate,
  UserNotificationPreference,
  NotificationDelivery,
  CampaignFilter,
  CampaignStats,
  AutomatedCampaignTrigger,
  BulkNotification,
  NotificationAnalytics
} from '../models/NotificationCampaign';

export class NotificationCampaignRepository extends BaseRepository {

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
      const page = filter.page || 1;
      const limit = filter.limit || 20;
      const offset = (page - 1) * limit;

      let whereConditions: string[] = [];
      let params: any[] = [];
      let paramIndex = 1;

      // Build WHERE conditions
      if (filter.status && filter.status.length > 0) {
        whereConditions.push(`status = ANY($${paramIndex})`);
        params.push(filter.status);
        paramIndex++;
      }

      if (filter.type && filter.type.length > 0) {
        whereConditions.push(`type = ANY($${paramIndex})`);
        params.push(filter.type);
        paramIndex++;
      }

      if (filter.createdBy) {
        whereConditions.push(`created_by = $${paramIndex}`);
        params.push(filter.createdBy);
        paramIndex++;
      }

      if (filter.dateRange) {
        whereConditions.push(`created_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
        params.push(filter.dateRange.from, filter.dateRange.to);
        paramIndex += 2;
      }

      if (filter.tags && filter.tags.length > 0) {
        whereConditions.push(`tags && $${paramIndex}`);
        params.push(filter.tags);
        paramIndex++;
      }

      if (filter.search) {
        whereConditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
        params.push(`%${filter.search}%`);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Build ORDER BY clause
      const sortBy = filter.sortBy || 'created_at';
      const sortOrder = filter.sortOrder || 'desc';
      const orderClause = `ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM campaigns
        ${whereClause}
      `;

      const countResult = await this.db.query(countQuery, params);
      const total = parseInt(countResult.rows[0].total);

      // Get campaigns
      const query = `
        SELECT *
        FROM campaigns
        ${whereClause}
        ${orderClause}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      params.push(limit, offset);
      const result = await this.db.query(query, params);

      const campaigns = result.rows.map(row => this.mapRowToCampaign(row));
      const totalPages = Math.ceil(total / limit);

      return {
        campaigns,
        total,
        page,
        totalPages
      };
    } catch (error) {
      this.logger.error('Error getting campaigns:', error);
      throw error;
    }
  }

  /**
   * Get campaign by ID
   */
  async getCampaignById(id: string): Promise<Campaign | null> {
    try {
      const query = 'SELECT * FROM campaigns WHERE id = $1';
      const result = await this.db.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToCampaign(result.rows[0]);
    } catch (error) {
      this.logger.error('Error getting campaign by ID:', error);
      throw error;
    }
  }

  /**
   * Create new campaign
   */
  async createCampaign(campaign: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt'>): Promise<Campaign> {
    try {
      const id = this.generateId();
      const now = new Date();

      const query = `
        INSERT INTO campaigns (
          id, name, description, type, status, priority,
          target_audience, content, schedule, ab_test, delivery,
          metrics, created_by, created_at, updated_at, tags, notes
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
        ) RETURNING *
      `;

      const values = [
        id, campaign.name, campaign.description, campaign.type, campaign.status,
        campaign.priority, JSON.stringify(campaign.targetAudience),
        JSON.stringify(campaign.content), JSON.stringify(campaign.schedule),
        JSON.stringify(campaign.abTest), JSON.stringify(campaign.delivery),
        JSON.stringify(campaign.metrics), campaign.createdBy, now, now,
        campaign.tags, campaign.notes
      ];

      const result = await this.db.query(query, values);
      return this.mapRowToCampaign(result.rows[0]);
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
      const setClause: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      // Build SET clause dynamically
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined && key !== 'id' && key !== 'createdAt') {
          const dbField = this.camelToSnake(key);
          
          // Handle JSON fields
          if (['targetAudience', 'content', 'schedule', 'abTest', 'delivery', 'metrics'].includes(key)) {
            setClause.push(`${dbField} = $${paramIndex}`);
            params.push(JSON.stringify(value));
          } else {
            setClause.push(`${dbField} = $${paramIndex}`);
            params.push(value);
          }
          paramIndex++;
        }
      });

      if (setClause.length === 0) {
        return await this.getCampaignById(id);
      }

      setClause.push(`updated_at = $${paramIndex}`);
      params.push(new Date());
      paramIndex++;

      params.push(id);

      const query = `
        UPDATE campaigns 
        SET ${setClause.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await this.db.query(query, params);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToCampaign(result.rows[0]);
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
      const query = 'DELETE FROM campaigns WHERE id = $1';
      const result = await this.db.query(query, [id]);
      return result.rowCount > 0;
    } catch (error) {
      this.logger.error('Error deleting campaign:', error);
      throw error;
    }
  }

  /**
   * Create campaign execution
   */
  async createCampaignExecution(execution: Omit<CampaignExecution, 'id' | 'createdAt' | 'updatedAt'>): Promise<CampaignExecution> {
    try {
      const id = this.generateId();
      const now = new Date();

      const query = `
        INSERT INTO campaign_executions (
          id, campaign_id, execution_type, status, started_at,
          total_batches, completed_batches, current_batch, batch_size,
          results, ab_test_results, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
        ) RETURNING *
      `;

      const values = [
        id, execution.campaignId, execution.executionType, execution.status,
        execution.startedAt, execution.totalBatches, execution.completedBatches,
        execution.currentBatch, execution.batchSize, JSON.stringify(execution.results),
        JSON.stringify(execution.abTestResults), now, now
      ];

      const result = await this.db.query(query, values);
      return this.mapRowToCampaignExecution(result.rows[0]);
    } catch (error) {
      this.logger.error('Error creating campaign execution:', error);
      throw error;
    }
  }

  /**
   * Update campaign execution
   */
  async updateCampaignExecution(id: string, updates: Partial<CampaignExecution>): Promise<CampaignExecution | null> {
    try {
      const setClause: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined && key !== 'id' && key !== 'createdAt') {
          const dbField = this.camelToSnake(key);
          
          if (['results', 'abTestResults'].includes(key)) {
            setClause.push(`${dbField} = $${paramIndex}`);
            params.push(JSON.stringify(value));
          } else {
            setClause.push(`${dbField} = $${paramIndex}`);
            params.push(value);
          }
          paramIndex++;
        }
      });

      if (setClause.length === 0) {
        return await this.getCampaignExecutionById(id);
      }

      setClause.push(`updated_at = $${paramIndex}`);
      params.push(new Date());
      paramIndex++;

      params.push(id);

      const query = `
        UPDATE campaign_executions 
        SET ${setClause.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await this.db.query(query, params);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToCampaignExecution(result.rows[0]);
    } catch (error) {
      this.logger.error('Error updating campaign execution:', error);
      throw error;
    }
  }

  /**
   * Get campaign execution by ID
   */
  async getCampaignExecutionById(id: string): Promise<CampaignExecution | null> {
    try {
      const query = 'SELECT * FROM campaign_executions WHERE id = $1';
      const result = await this.db.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToCampaignExecution(result.rows[0]);
    } catch (error) {
      this.logger.error('Error getting campaign execution by ID:', error);
      throw error;
    }
  }

  /**
   * Get notification templates
   */
  async getNotificationTemplates(category?: string): Promise<NotificationTemplate[]> {
    try {
      let query = 'SELECT * FROM notification_templates WHERE is_active = true';
      const params: any[] = [];

      if (category) {
        query += ' AND category = $1';
        params.push(category);
      }

      query += ' ORDER BY name ASC';

      const result = await this.db.query(query, params);
      return result.rows.map(row => this.mapRowToNotificationTemplate(row));
    } catch (error) {
      this.logger.error('Error getting notification templates:', error);
      throw error;
    }
  }

  /**
   * Create notification template
   */
  async createNotificationTemplate(template: Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<NotificationTemplate> {
    try {
      const id = this.generateId();
      const now = new Date();

      const query = `
        INSERT INTO notification_templates (
          id, name, description, category, content, variables,
          usage, is_active, created_by, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
        ) RETURNING *
      `;

      const values = [
        id, template.name, template.description, template.category,
        JSON.stringify(template.content), JSON.stringify(template.variables),
        JSON.stringify(template.usage), template.isActive, template.createdBy,
        now, now
      ];

      const result = await this.db.query(query, values);
      return this.mapRowToNotificationTemplate(result.rows[0]);
    } catch (error) {
      this.logger.error('Error creating notification template:', error);
      throw error;
    }
  }

  /**
   * Get user notification preferences
   */
  async getUserNotificationPreferences(userId: string): Promise<UserNotificationPreference | null> {
    try {
      const query = 'SELECT * FROM user_notification_preferences WHERE user_id = $1';
      const result = await this.db.query(query, [userId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToUserNotificationPreference(result.rows[0]);
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
      const now = new Date();

      const query = `
        INSERT INTO user_notification_preferences (user_id, preferences, updated_at)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id) 
        DO UPDATE SET preferences = $2, updated_at = $3
        RETURNING *
      `;

      const values = [userId, JSON.stringify(preferences), now];
      const result = await this.db.query(query, values);
      return this.mapRowToUserNotificationPreference(result.rows[0]);
    } catch (error) {
      this.logger.error('Error updating user notification preferences:', error);
      throw error;
    }
  }

  /**
   * Create notification delivery
   */
  async createNotificationDelivery(delivery: Omit<NotificationDelivery, 'id' | 'createdAt' | 'updatedAt'>): Promise<NotificationDelivery> {
    try {
      const id = this.generateId();
      const now = new Date();

      const query = `
        INSERT INTO notification_deliveries (
          id, campaign_id, execution_id, user_id, content, channel,
          status, scheduled_at, interactions, message_id, retry_count,
          ab_test_variant_id, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
        ) RETURNING *
      `;

      const values = [
        id, delivery.campaignId, delivery.executionId, delivery.userId,
        JSON.stringify(delivery.content), delivery.channel, delivery.status,
        delivery.scheduledAt, JSON.stringify(delivery.interactions),
        delivery.messageId, delivery.retryCount, delivery.abTestVariantId,
        now, now
      ];

      const result = await this.db.query(query, values);
      return this.mapRowToNotificationDelivery(result.rows[0]);
    } catch (error) {
      this.logger.error('Error creating notification delivery:', error);
      throw error;
    }
  }

  /**
   * Update notification delivery
   */
  async updateNotificationDelivery(id: string, updates: Partial<NotificationDelivery>): Promise<NotificationDelivery | null> {
    try {
      const setClause: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined && key !== 'id' && key !== 'createdAt') {
          const dbField = this.camelToSnake(key);
          
          if (['content', 'interactions'].includes(key)) {
            setClause.push(`${dbField} = $${paramIndex}`);
            params.push(JSON.stringify(value));
          } else {
            setClause.push(`${dbField} = $${paramIndex}`);
            params.push(value);
          }
          paramIndex++;
        }
      });

      if (setClause.length === 0) {
        return await this.getNotificationDeliveryById(id);
      }

      setClause.push(`updated_at = $${paramIndex}`);
      params.push(new Date());
      paramIndex++;

      params.push(id);

      const query = `
        UPDATE notification_deliveries 
        SET ${setClause.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await this.db.query(query, params);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToNotificationDelivery(result.rows[0]);
    } catch (error) {
      this.logger.error('Error updating notification delivery:', error);
      throw error;
    }
  }

  /**
   * Get notification delivery by ID
   */
  async getNotificationDeliveryById(id: string): Promise<NotificationDelivery | null> {
    try {
      const query = 'SELECT * FROM notification_deliveries WHERE id = $1';
      const result = await this.db.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToNotificationDelivery(result.rows[0]);
    } catch (error) {
      this.logger.error('Error getting notification delivery by ID:', error);
      throw error;
    }
  }

  /**
   * Get campaign statistics
   */
  async getCampaignStats(dateRange?: { from: Date; to: Date }): Promise<CampaignStats> {
    try {
      let whereClause = '';
      const params: any[] = [];

      if (dateRange) {
        whereClause = 'WHERE created_at BETWEEN $1 AND $2';
        params.push(dateRange.from, dateRange.to);
      }

      // Get basic campaign stats
      const campaignStatsQuery = `
        SELECT 
          COUNT(*) as total_campaigns,
          COUNT(*) FILTER (WHERE status IN ('running', 'scheduled')) as active_campaigns,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_campaigns,
          COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled_campaigns
        FROM campaigns
        ${whereClause}
      `;

      const campaignStatsResult = await this.db.query(campaignStatsQuery, params);
      const campaignStats = campaignStatsResult.rows[0];

      // Get performance metrics
      const metricsQuery = `
        SELECT 
          COALESCE(SUM((metrics->>'sentCount')::int), 0) as total_sent,
          COALESCE(SUM((metrics->>'deliveredCount')::int), 0) as total_delivered,
          COALESCE(SUM((metrics->>'openedCount')::int), 0) as total_opened,
          COALESCE(SUM((metrics->>'clickedCount')::int), 0) as total_clicked,
          COALESCE(SUM((metrics->>'convertedCount')::int), 0) as total_converted,
          COALESCE(SUM((metrics->>'revenue')::numeric), 0) as total_revenue,
          COALESCE(AVG((metrics->>'deliveryRate')::numeric), 0) as avg_delivery_rate,
          COALESCE(AVG((metrics->>'openRate')::numeric), 0) as avg_open_rate,
          COALESCE(AVG((metrics->>'clickRate')::numeric), 0) as avg_click_rate,
          COALESCE(AVG((metrics->>'conversionRate')::numeric), 0) as avg_conversion_rate,
          COALESCE(AVG((metrics->>'roi')::numeric), 0) as avg_roi
        FROM campaigns
        ${whereClause}
      `;

      const metricsResult = await this.db.query(metricsQuery, params);
      const metrics = metricsResult.rows[0];

      // Get top campaigns
      const topCampaignsQuery = `
        SELECT 
          id as campaign_id,
          name,
          'conversion_rate' as metric,
          (metrics->>'conversionRate')::numeric as value
        FROM campaigns
        ${whereClause}
        ORDER BY (metrics->>'conversionRate')::numeric DESC
        LIMIT 5
      `;

      const topCampaignsResult = await this.db.query(topCampaignsQuery, params);
      const topCampaigns = topCampaignsResult.rows;

      // Get campaigns by type
      const campaignsByTypeQuery = `
        SELECT 
          type,
          COUNT(*) as count,
          ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
        FROM campaigns
        ${whereClause}
        GROUP BY type
        ORDER BY count DESC
      `;

      const campaignsByTypeResult = await this.db.query(campaignsByTypeQuery, params);
      const campaignsByType = campaignsByTypeResult.rows;

      // Get performance trend (last 30 days)
      const trendQuery = `
        SELECT 
          DATE(created_at) as date,
          COALESCE(SUM((metrics->>'sentCount')::int), 0) as sent,
          COALESCE(SUM((metrics->>'deliveredCount')::int), 0) as delivered,
          COALESCE(SUM((metrics->>'openedCount')::int), 0) as opened,
          COALESCE(SUM((metrics->>'clickedCount')::int), 0) as clicked,
          COALESCE(SUM((metrics->>'convertedCount')::int), 0) as converted,
          COALESCE(SUM((metrics->>'revenue')::numeric), 0) as revenue
        FROM campaigns
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30
      `;

      const trendResult = await this.db.query(trendQuery);
      const performanceTrend = trendResult.rows.map(row => ({
        date: row.date,
        sent: parseInt(row.sent),
        delivered: parseInt(row.delivered),
        opened: parseInt(row.opened),
        clicked: parseInt(row.clicked),
        converted: parseInt(row.converted),
        revenue: parseFloat(row.revenue)
      }));

      return {
        totalCampaigns: parseInt(campaignStats.total_campaigns),
        activeCampaigns: parseInt(campaignStats.active_campaigns),
        completedCampaigns: parseInt(campaignStats.completed_campaigns),
        scheduledCampaigns: parseInt(campaignStats.scheduled_campaigns),
        totalSent: parseInt(metrics.total_sent),
        totalDelivered: parseInt(metrics.total_delivered),
        totalOpened: parseInt(metrics.total_opened),
        totalClicked: parseInt(metrics.total_clicked),
        totalConverted: parseInt(metrics.total_converted),
        totalRevenue: parseFloat(metrics.total_revenue),
        averageDeliveryRate: parseFloat(metrics.avg_delivery_rate),
        averageOpenRate: parseFloat(metrics.avg_open_rate),
        averageClickRate: parseFloat(metrics.avg_click_rate),
        averageConversionRate: parseFloat(metrics.avg_conversion_rate),
        averageROI: parseFloat(metrics.avg_roi),
        topCampaigns,
        campaignsByType,
        performanceTrend
      };
    } catch (error) {
      this.logger.error('Error getting campaign stats:', error);
      throw error;
    }
  }

  // Private helper methods

  private mapRowToCampaign(row: any): Campaign {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      type: row.type,
      status: row.status,
      priority: row.priority,
      targetAudience: JSON.parse(row.target_audience || '{}'),
      content: JSON.parse(row.content || '{}'),
      schedule: JSON.parse(row.schedule || '{}'),
      abTest: JSON.parse(row.ab_test || 'null'),
      delivery: JSON.parse(row.delivery || '{}'),
      metrics: JSON.parse(row.metrics || '{}'),
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      tags: row.tags || [],
      notes: row.notes
    };
  }

  private mapRowToCampaignExecution(row: any): CampaignExecution {
    return {
      id: row.id,
      campaignId: row.campaign_id,
      executionType: row.execution_type,
      status: row.status,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      duration: row.duration,
      totalBatches: row.total_batches,
      completedBatches: row.completed_batches,
      currentBatch: row.current_batch,
      batchSize: row.batch_size,
      results: JSON.parse(row.results || '{}'),
      abTestResults: JSON.parse(row.ab_test_results || 'null'),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapRowToNotificationTemplate(row: any): NotificationTemplate {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      content: JSON.parse(row.content || '{}'),
      variables: JSON.parse(row.variables || '[]'),
      usage: JSON.parse(row.usage || '{}'),
      isActive: row.is_active,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapRowToUserNotificationPreference(row: any): UserNotificationPreference {
    return {
      userId: row.user_id,
      preferences: JSON.parse(row.preferences || '{}'),
      updatedAt: row.updated_at
    };
  }

  private mapRowToNotificationDelivery(row: any): NotificationDelivery {
    return {
      id: row.id,
      campaignId: row.campaign_id,
      executionId: row.execution_id,
      userId: row.user_id,
      content: JSON.parse(row.content || '{}'),
      channel: row.channel,
      status: row.status,
      scheduledAt: row.scheduled_at,
      sentAt: row.sent_at,
      deliveredAt: row.delivered_at,
      failedAt: row.failed_at,
      interactions: JSON.parse(row.interactions || '{}'),
      messageId: row.message_id,
      errorMessage: row.error_message,
      retryCount: row.retry_count,
      abTestVariantId: row.ab_test_variant_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}
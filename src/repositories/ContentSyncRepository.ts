import { Pool } from 'pg';
import { ContentSyncRule, ContentSyncJob, PopularContent, UserContentPreference } from '../models/ContentSync';
import { logger } from '../config/logger';
import { v4 as uuidv4 } from 'uuid';

export class ContentSyncRepository {
  constructor(private pool: Pool) {}

  // Content Sync Rules
  async createSyncRule(ruleData: Partial<ContentSyncRule>): Promise<ContentSyncRule> {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO content_sync_rules (
          id, source_type, source_id, target_type, target_filters, 
          content_filters, sync_timing, is_active, priority, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
      
      const values = [
        uuidv4(),
        ruleData.sourceType,
        ruleData.sourceId,
        ruleData.targetType,
        JSON.stringify(ruleData.targetFilters || {}),
        JSON.stringify(ruleData.contentFilters || {}),
        JSON.stringify(ruleData.syncTiming || {}),
        ruleData.isActive ?? true,
        ruleData.priority ?? 1,
        new Date(),
        new Date()
      ];

      const result = await client.query(query, values);
      return this.mapRowToSyncRule(result.rows[0]);
    } catch (error) {
      logger.error('Error creating sync rule:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getSyncRules(isActive?: boolean): Promise<ContentSyncRule[]> {
    const client = await this.pool.connect();
    try {
      let query = 'SELECT * FROM content_sync_rules';
      const values: any[] = [];
      
      if (isActive !== undefined) {
        query += ' WHERE is_active = $1';
        values.push(isActive);
      }
      
      query += ' ORDER BY priority DESC, created_at ASC';
      
      const result = await client.query(query, values);
      return result.rows.map(row => this.mapRowToSyncRule(row));
    } catch (error) {
      logger.error('Error getting sync rules:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async updateSyncRule(id: string, updates: Partial<ContentSyncRule>): Promise<ContentSyncRule | null> {
    const client = await this.pool.connect();
    try {
      const setClause: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined && key !== 'id') {
          if (key === 'targetFilters' || key === 'contentFilters' || key === 'syncTiming') {
            setClause.push(`${this.camelToSnake(key)} = $${paramIndex}`);
            values.push(JSON.stringify(value));
          } else {
            setClause.push(`${this.camelToSnake(key)} = $${paramIndex}`);
            values.push(value);
          }
          paramIndex++;
        }
      });

      if (setClause.length === 0) {
        return await this.getSyncRuleById(id);
      }

      setClause.push(`updated_at = $${paramIndex}`);
      values.push(new Date());
      values.push(id);

      const query = `
        UPDATE content_sync_rules 
        SET ${setClause.join(', ')}
        WHERE id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToSyncRule(result.rows[0]);
    } catch (error) {
      logger.error('Error updating sync rule:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Content Sync Jobs
  async createSyncJob(jobData: Partial<ContentSyncJob>): Promise<ContentSyncJob> {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO content_sync_jobs (
          id, rule_id, source_content, target_channels, status, 
          scheduled_at, results, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      
      const values = [
        uuidv4(),
        jobData.ruleId,
        JSON.stringify(jobData.sourceContent || {}),
        JSON.stringify(jobData.targetChannels || []),
        jobData.status ?? 'pending',
        jobData.scheduledAt,
        JSON.stringify(jobData.results || { totalTargets: 0, successful: 0, failed: 0 }),
        new Date()
      ];

      const result = await client.query(query, values);
      return this.mapRowToSyncJob(result.rows[0]);
    } catch (error) {
      logger.error('Error creating sync job:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getPendingSyncJobs(limit: number = 50): Promise<ContentSyncJob[]> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT * FROM content_sync_jobs 
        WHERE status = 'pending' 
        AND (scheduled_at IS NULL OR scheduled_at <= $1)
        ORDER BY created_at ASC 
        LIMIT $2
      `;
      
      const result = await client.query(query, [new Date(), limit]);
      return result.rows.map(row => this.mapRowToSyncJob(row));
    } catch (error) {
      logger.error('Error getting pending sync jobs:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async updateSyncJob(id: string, updates: Partial<ContentSyncJob>): Promise<ContentSyncJob | null> {
    const client = await this.pool.connect();
    try {
      const setClause: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined && key !== 'id') {
          if (key === 'sourceContent' || key === 'targetChannels' || key === 'results') {
            setClause.push(`${this.camelToSnake(key)} = $${paramIndex}`);
            values.push(JSON.stringify(value));
          } else {
            setClause.push(`${this.camelToSnake(key)} = $${paramIndex}`);
            values.push(value);
          }
          paramIndex++;
        }
      });

      if (setClause.length === 0) {
        return await this.getSyncJobById(id);
      }

      values.push(id);

      const query = `
        UPDATE content_sync_jobs 
        SET ${setClause.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToSyncJob(result.rows[0]);
    } catch (error) {
      logger.error('Error updating sync job:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Popular Content
  async recordPopularContent(contentData: Partial<PopularContent>): Promise<PopularContent> {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO popular_content (
          id, source_id, source_type, content_type, title, content, 
          metadata, popularity_score, engagement_metrics, sync_count, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (source_id, source_type) DO UPDATE SET
          popularity_score = EXCLUDED.popularity_score,
          engagement_metrics = EXCLUDED.engagement_metrics,
          last_synced_at = CURRENT_TIMESTAMP
        RETURNING *
      `;
      
      const values = [
        uuidv4(),
        contentData.sourceId,
        contentData.sourceType,
        contentData.contentType,
        contentData.title,
        contentData.content,
        JSON.stringify(contentData.metadata || {}),
        contentData.popularityScore ?? 0,
        JSON.stringify(contentData.engagementMetrics || {}),
        contentData.syncCount ?? 0,
        new Date()
      ];

      const result = await client.query(query, values);
      return this.mapRowToPopularContent(result.rows[0]);
    } catch (error) {
      logger.error('Error recording popular content:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getPopularContent(
    minScore: number = 50, 
    contentType?: string, 
    limit: number = 100
  ): Promise<PopularContent[]> {
    const client = await this.pool.connect();
    try {
      let query = `
        SELECT * FROM popular_content 
        WHERE popularity_score >= $1
      `;
      const values: any[] = [minScore];
      let paramIndex = 2;

      if (contentType) {
        query += ` AND content_type = $${paramIndex}`;
        values.push(contentType);
        paramIndex++;
      }

      query += ` ORDER BY popularity_score DESC, created_at DESC LIMIT $${paramIndex}`;
      values.push(limit);

      const result = await client.query(query, values);
      return result.rows.map(row => this.mapRowToPopularContent(row));
    } catch (error) {
      logger.error('Error getting popular content:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async updateContentPopularity(sourceId: string, sourceType: string, metrics: any): Promise<void> {
    const client = await this.pool.connect();
    try {
      const popularityScore = this.calculatePopularityScore(metrics);
      
      const query = `
        UPDATE popular_content 
        SET popularity_score = $1, engagement_metrics = $2, last_synced_at = $3
        WHERE source_id = $4 AND source_type = $5
      `;

      await client.query(query, [
        popularityScore,
        JSON.stringify(metrics),
        new Date(),
        sourceId,
        sourceType
      ]);
    } catch (error) {
      logger.error('Error updating content popularity:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // User Content Preferences
  async getUserContentPreferences(userId: string): Promise<UserContentPreference | null> {
    const client = await this.pool.connect();
    try {
      const query = 'SELECT * FROM user_content_preferences WHERE user_id = $1';
      const result = await client.query(query, [userId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToUserPreference(result.rows[0]);
    } catch (error) {
      logger.error('Error getting user content preferences:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async updateUserContentPreferences(
    userId: string, 
    preferences: Partial<UserContentPreference>
  ): Promise<UserContentPreference> {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO user_content_preferences (
          id, user_id, preferred_categories, preferred_stores, excluded_categories,
          excluded_stores, max_messages_per_day, preferred_times, timezone,
          content_types, min_discount_threshold, only_popular_content,
          personalized_recommendations, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (user_id) DO UPDATE SET
          preferred_categories = EXCLUDED.preferred_categories,
          preferred_stores = EXCLUDED.preferred_stores,
          excluded_categories = EXCLUDED.excluded_categories,
          excluded_stores = EXCLUDED.excluded_stores,
          max_messages_per_day = EXCLUDED.max_messages_per_day,
          preferred_times = EXCLUDED.preferred_times,
          timezone = EXCLUDED.timezone,
          content_types = EXCLUDED.content_types,
          min_discount_threshold = EXCLUDED.min_discount_threshold,
          only_popular_content = EXCLUDED.only_popular_content,
          personalized_recommendations = EXCLUDED.personalized_recommendations,
          updated_at = EXCLUDED.updated_at
        RETURNING *
      `;
      
      const values = [
        uuidv4(),
        userId,
        JSON.stringify(preferences.preferredCategories || []),
        JSON.stringify(preferences.preferredStores || []),
        JSON.stringify(preferences.excludedCategories || []),
        JSON.stringify(preferences.excludedStores || []),
        preferences.maxMessagesPerDay ?? 10,
        JSON.stringify(preferences.preferredTimes || [9, 12, 18, 21]),
        preferences.timezone ?? 'Asia/Kolkata',
        JSON.stringify(preferences.contentTypes || ['coupon', 'text']),
        preferences.minDiscountThreshold,
        preferences.onlyPopularContent ?? false,
        preferences.personalizedRecommendations ?? true,
        new Date(),
        new Date()
      ];

      const result = await client.query(query, values);
      return this.mapRowToUserPreference(result.rows[0]);
    } catch (error) {
      logger.error('Error updating user content preferences:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Analytics
  async getSyncAnalytics(startDate: Date, endDate: Date): Promise<any> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT 
          COUNT(*) as total_jobs,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_jobs,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_jobs,
          AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_processing_time
        FROM content_sync_jobs 
        WHERE created_at BETWEEN $1 AND $2
      `;

      const result = await client.query(query, [startDate, endDate]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error getting sync analytics:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Helper methods
  private async getSyncRuleById(id: string): Promise<ContentSyncRule | null> {
    const client = await this.pool.connect();
    try {
      const query = 'SELECT * FROM content_sync_rules WHERE id = $1';
      const result = await client.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToSyncRule(result.rows[0]);
    } catch (error) {
      logger.error('Error getting sync rule by ID:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  private async getSyncJobById(id: string): Promise<ContentSyncJob | null> {
    const client = await this.pool.connect();
    try {
      const query = 'SELECT * FROM content_sync_jobs WHERE id = $1';
      const result = await client.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToSyncJob(result.rows[0]);
    } catch (error) {
      logger.error('Error getting sync job by ID:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  private calculatePopularityScore(metrics: any): number {
    const { views = 0, clicks = 0, shares = 0, reactions = 0, comments = 0 } = metrics;
    
    // Weighted scoring algorithm
    const score = (
      views * 1 +
      clicks * 5 +
      shares * 10 +
      reactions * 3 +
      comments * 8
    );
    
    return Math.min(Math.max(score, 0), 100);
  }

  private mapRowToSyncRule(row: any): ContentSyncRule {
    return {
      id: row.id,
      sourceType: row.source_type,
      sourceId: row.source_id,
      targetType: row.target_type,
      targetFilters: row.target_filters ? JSON.parse(row.target_filters) : {},
      contentFilters: row.content_filters ? JSON.parse(row.content_filters) : {},
      syncTiming: row.sync_timing ? JSON.parse(row.sync_timing) : {},
      isActive: row.is_active,
      priority: parseInt(row.priority) || 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapRowToSyncJob(row: any): ContentSyncJob {
    return {
      id: row.id,
      ruleId: row.rule_id,
      sourceContent: row.source_content ? JSON.parse(row.source_content) : {},
      targetChannels: row.target_channels ? JSON.parse(row.target_channels) : [],
      status: row.status,
      scheduledAt: row.scheduled_at,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      results: row.results ? JSON.parse(row.results) : { totalTargets: 0, successful: 0, failed: 0 },
      createdAt: row.created_at
    };
  }

  private mapRowToPopularContent(row: any): PopularContent {
    return {
      id: row.id,
      sourceId: row.source_id,
      sourceType: row.source_type,
      contentType: row.content_type,
      title: row.title,
      content: row.content,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      popularityScore: parseFloat(row.popularity_score) || 0,
      engagementMetrics: row.engagement_metrics ? JSON.parse(row.engagement_metrics) : {},
      createdAt: row.created_at,
      lastSyncedAt: row.last_synced_at,
      syncCount: parseInt(row.sync_count) || 0
    };
  }

  private mapRowToUserPreference(row: any): UserContentPreference {
    return {
      id: row.id,
      userId: row.user_id,
      preferredCategories: row.preferred_categories ? JSON.parse(row.preferred_categories) : [],
      preferredStores: row.preferred_stores ? JSON.parse(row.preferred_stores) : [],
      excludedCategories: row.excluded_categories ? JSON.parse(row.excluded_categories) : [],
      excludedStores: row.excluded_stores ? JSON.parse(row.excluded_stores) : [],
      maxMessagesPerDay: parseInt(row.max_messages_per_day) || 10,
      preferredTimes: row.preferred_times ? JSON.parse(row.preferred_times) : [9, 12, 18, 21],
      timezone: row.timezone || 'Asia/Kolkata',
      contentTypes: row.content_types ? JSON.parse(row.content_types) : ['coupon', 'text'],
      minDiscountThreshold: parseFloat(row.min_discount_threshold),
      onlyPopularContent: row.only_popular_content || false,
      personalizedRecommendations: row.personalized_recommendations ?? true,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}
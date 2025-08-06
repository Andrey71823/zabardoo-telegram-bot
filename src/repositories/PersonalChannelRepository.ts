import { Pool } from 'pg';
import { PersonalChannel, CreatePersonalChannelRequest, UpdatePersonalChannelRequest, ChannelActivity } from '../models/PersonalChannel';
import { logger } from '../config/logger';
import { v4 as uuidv4 } from 'uuid';

export class PersonalChannelRepository {
  constructor(private pool: Pool) {}

  async createPersonalChannel(channelData: CreatePersonalChannelRequest): Promise<PersonalChannel> {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO personal_channels (
          id, user_id, channel_id, is_active, engagement_score, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      
      const values = [
        uuidv4(),
        channelData.userId,
        channelData.channelId,
        true,
        0.0,
        new Date(),
        new Date()
      ];

      const result = await client.query(query, values);
      return this.mapRowToPersonalChannel(result.rows[0]);
    } catch (error) {
      logger.error('Error creating personal channel:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getChannelByUserId(userId: string): Promise<PersonalChannel | null> {
    const client = await this.pool.connect();
    try {
      const query = 'SELECT * FROM personal_channels WHERE user_id = $1';
      const result = await client.query(query, [userId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToPersonalChannel(result.rows[0]);
    } catch (error) {
      logger.error('Error getting channel by user ID:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getChannelByChannelId(channelId: string): Promise<PersonalChannel | null> {
    const client = await this.pool.connect();
    try {
      const query = 'SELECT * FROM personal_channels WHERE channel_id = $1';
      const result = await client.query(query, [channelId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToPersonalChannel(result.rows[0]);
    } catch (error) {
      logger.error('Error getting channel by channel ID:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async updateChannel(channelId: string, updates: UpdatePersonalChannelRequest): Promise<PersonalChannel | null> {
    const client = await this.pool.connect();
    try {
      const setClause = [];
      const values = [];
      let paramIndex = 1;

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          setClause.push(`${this.camelToSnake(key)} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      });

      if (setClause.length === 0) {
        return await this.getChannelByChannelId(channelId);
      }

      setClause.push(`updated_at = $${paramIndex}`);
      values.push(new Date());
      values.push(channelId);

      const query = `
        UPDATE personal_channels 
        SET ${setClause.join(', ')}
        WHERE channel_id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToPersonalChannel(result.rows[0]);
    } catch (error) {
      logger.error('Error updating channel:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async recordActivity(activity: ChannelActivity): Promise<void> {
    const client = await this.pool.connect();
    try {
      // Update last message time in personal_channels
      if (activity.activityType === 'message_sent') {
        await client.query(
          'UPDATE personal_channels SET last_message_at = $1 WHERE channel_id = $2',
          [activity.timestamp, activity.channelId]
        );
      }

      // Record activity in group_interactions table (reusing for channel activities)
      const query = `
        INSERT INTO group_interactions (
          id, user_id, group_id, interaction_type, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `;
      
      const values = [
        uuidv4(),
        activity.userId,
        activity.channelId,
        activity.activityType,
        JSON.stringify(activity.metadata || {}),
        activity.timestamp
      ];

      await client.query(query, values);
    } catch (error) {
      logger.error('Error recording channel activity:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getChannelActivity(channelId: string, limit: number = 50): Promise<ChannelActivity[]> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT * FROM group_interactions 
        WHERE group_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2
      `;
      
      const result = await client.query(query, [channelId, limit]);
      return result.rows.map(row => ({
        channelId: row.group_id,
        userId: row.user_id,
        activityType: row.interaction_type,
        timestamp: row.created_at,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined
      }));
    } catch (error) {
      logger.error('Error getting channel activity:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getActiveChannels(limit: number = 100): Promise<PersonalChannel[]> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT * FROM personal_channels 
        WHERE is_active = true 
        ORDER BY last_message_at DESC NULLS LAST, updated_at DESC 
        LIMIT $1
      `;
      
      const result = await client.query(query, [limit]);
      return result.rows.map(row => this.mapRowToPersonalChannel(row));
    } catch (error) {
      logger.error('Error getting active channels:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async updateEngagementScore(channelId: string, score: number): Promise<void> {
    const client = await this.pool.connect();
    try {
      const query = `
        UPDATE personal_channels 
        SET engagement_score = $1, updated_at = $2 
        WHERE channel_id = $3
      `;
      
      await client.query(query, [score, new Date(), channelId]);
    } catch (error) {
      logger.error('Error updating engagement score:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  private mapRowToPersonalChannel(row: any): PersonalChannel {
    return {
      id: row.id,
      userId: row.user_id,
      channelId: row.channel_id,
      isActive: row.is_active,
      lastMessageAt: row.last_message_at,
      engagementScore: parseFloat(row.engagement_score) || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}
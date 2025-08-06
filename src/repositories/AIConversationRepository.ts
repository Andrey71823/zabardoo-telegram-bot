import { Pool } from 'pg';
import { AIConversation, AIMessage, AIPromptTemplate, CouponRecommendation } from '../models/AIAssistant';
import { logger } from '../config/logger';
import { v4 as uuidv4 } from 'uuid';

export class AIConversationRepository {
  constructor(private pool: Pool) {}

  // AI Conversations
  async createConversation(conversationData: Partial<AIConversation>): Promise<AIConversation> {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO ai_conversations (
          id, user_id, channel_id, status, context, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      
      const values = [
        uuidv4(),
        conversationData.userId,
        conversationData.channelId,
        conversationData.status || 'active',
        JSON.stringify(conversationData.context || {}),
        new Date(),
        new Date()
      ];

      const result = await client.query(query, values);
      return this.mapRowToConversation(result.rows[0]);
    } catch (error) {
      logger.error('Error creating AI conversation:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getConversationByUserId(userId: string): Promise<AIConversation | null> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT * FROM ai_conversations 
        WHERE user_id = $1 AND status = 'active'
        ORDER BY updated_at DESC 
        LIMIT 1
      `;
      const result = await client.query(query, [userId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToConversation(result.rows[0]);
    } catch (error) {
      logger.error('Error getting conversation by user ID:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async updateConversation(id: string, updates: Partial<AIConversation>): Promise<AIConversation | null> {
    const client = await this.pool.connect();
    try {
      const setClause: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined && key !== 'id') {
          if (key === 'context') {
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
        return await this.getConversationById(id);
      }

      setClause.push(`updated_at = $${paramIndex}`);
      values.push(new Date());
      values.push(id);

      const query = `
        UPDATE ai_conversations 
        SET ${setClause.join(', ')}
        WHERE id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToConversation(result.rows[0]);
    } catch (error) {
      logger.error('Error updating conversation:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // AI Messages
  async addMessage(messageData: Partial<AIMessage>): Promise<AIMessage> {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO ai_messages (
          id, conversation_id, role, content, message_type, metadata, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      
      const values = [
        uuidv4(),
        messageData.conversationId,
        messageData.role,
        messageData.content,
        messageData.messageType || 'text',
        JSON.stringify(messageData.metadata || {}),
        new Date()
      ];

      const result = await client.query(query, values);
      return this.mapRowToMessage(result.rows[0]);
    } catch (error) {
      logger.error('Error adding AI message:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getConversationMessages(conversationId: string, limit: number = 50): Promise<AIMessage[]> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT * FROM ai_messages 
        WHERE conversation_id = $1 
        ORDER BY timestamp ASC 
        LIMIT $2
      `;
      
      const result = await client.query(query, [conversationId, limit]);
      return result.rows.map(row => this.mapRowToMessage(row));
    } catch (error) {
      logger.error('Error getting conversation messages:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getRecentMessages(conversationId: string, count: number = 10): Promise<AIMessage[]> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT * FROM ai_messages 
        WHERE conversation_id = $1 
        ORDER BY timestamp DESC 
        LIMIT $2
      `;
      
      const result = await client.query(query, [conversationId, count]);
      return result.rows.map(row => this.mapRowToMessage(row)).reverse();
    } catch (error) {
      logger.error('Error getting recent messages:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Prompt Templates
  async createPromptTemplate(templateData: Partial<AIPromptTemplate>): Promise<AIPromptTemplate> {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO ai_prompt_templates (
          id, name, category, template, variables, is_active, priority, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      
      const values = [
        uuidv4(),
        templateData.name,
        templateData.category,
        templateData.template,
        JSON.stringify(templateData.variables || []),
        templateData.isActive ?? true,
        templateData.priority ?? 1,
        new Date(),
        new Date()
      ];

      const result = await client.query(query, values);
      return this.mapRowToPromptTemplate(result.rows[0]);
    } catch (error) {
      logger.error('Error creating prompt template:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getPromptTemplates(category?: string, isActive?: boolean): Promise<AIPromptTemplate[]> {
    const client = await this.pool.connect();
    try {
      let query = 'SELECT * FROM ai_prompt_templates WHERE 1=1';
      const values: any[] = [];
      let paramIndex = 1;

      if (category) {
        query += ` AND category = $${paramIndex}`;
        values.push(category);
        paramIndex++;
      }

      if (isActive !== undefined) {
        query += ` AND is_active = $${paramIndex}`;
        values.push(isActive);
        paramIndex++;
      }

      query += ' ORDER BY priority DESC, created_at ASC';

      const result = await client.query(query, values);
      return result.rows.map(row => this.mapRowToPromptTemplate(row));
    } catch (error) {
      logger.error('Error getting prompt templates:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Coupon Recommendations
  async recordRecommendation(recommendationData: Partial<CouponRecommendation>): Promise<CouponRecommendation> {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO coupon_recommendations (
          id, user_id, coupon_id, recommendation_reason, confidence, 
          personalized_message, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      
      const values = [
        uuidv4(),
        recommendationData.userId,
        recommendationData.couponId,
        recommendationData.recommendationReason,
        recommendationData.confidence || 0.5,
        recommendationData.personalizedMessage,
        JSON.stringify(recommendationData.metadata || {}),
        new Date()
      ];

      const result = await client.query(query, values);
      return this.mapRowToRecommendation(result.rows[0]);
    } catch (error) {
      logger.error('Error recording recommendation:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async updateRecommendationAcceptance(
    recommendationId: string, 
    wasAccepted: boolean
  ): Promise<CouponRecommendation | null> {
    const client = await this.pool.connect();
    try {
      const query = `
        UPDATE coupon_recommendations 
        SET was_accepted = $1, accepted_at = $2
        WHERE id = $3
        RETURNING *
      `;

      const result = await client.query(query, [
        wasAccepted,
        wasAccepted ? new Date() : null,
        recommendationId
      ]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToRecommendation(result.rows[0]);
    } catch (error) {
      logger.error('Error updating recommendation acceptance:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getUserRecommendations(userId: string, limit: number = 20): Promise<CouponRecommendation[]> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT * FROM coupon_recommendations 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2
      `;
      
      const result = await client.query(query, [userId, limit]);
      return result.rows.map(row => this.mapRowToRecommendation(row));
    } catch (error) {
      logger.error('Error getting user recommendations:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Analytics
  async getConversationAnalytics(startDate: Date, endDate: Date): Promise<any> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT 
          COUNT(*) as total_conversations,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_conversations,
          AVG(
            (SELECT COUNT(*) FROM ai_messages WHERE conversation_id = ai_conversations.id)
          ) as avg_conversation_length
        FROM ai_conversations 
        WHERE created_at BETWEEN $1 AND $2
      `;

      const result = await client.query(query, [startDate, endDate]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error getting conversation analytics:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getRecommendationAnalytics(startDate: Date, endDate: Date): Promise<any> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT 
          COUNT(*) as total_recommendations,
          COUNT(CASE WHEN was_accepted = true THEN 1 END) as accepted_recommendations,
          AVG(confidence) as avg_confidence,
          COUNT(CASE WHEN was_accepted = true THEN 1 END)::float / COUNT(*)::float as acceptance_rate
        FROM coupon_recommendations 
        WHERE created_at BETWEEN $1 AND $2
      `;

      const result = await client.query(query, [startDate, endDate]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error getting recommendation analytics:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Helper methods
  private async getConversationById(id: string): Promise<AIConversation | null> {
    const client = await this.pool.connect();
    try {
      const query = 'SELECT * FROM ai_conversations WHERE id = $1';
      const result = await client.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToConversation(result.rows[0]);
    } catch (error) {
      logger.error('Error getting conversation by ID:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  private mapRowToConversation(row: any): AIConversation {
    return {
      id: row.id,
      userId: row.user_id,
      channelId: row.channel_id,
      status: row.status,
      context: row.context ? JSON.parse(row.context) : {},
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapRowToMessage(row: any): AIMessage {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      role: row.role,
      content: row.content,
      messageType: row.message_type,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      timestamp: row.timestamp
    };
  }

  private mapRowToPromptTemplate(row: any): AIPromptTemplate {
    return {
      id: row.id,
      name: row.name,
      category: row.category,
      template: row.template,
      variables: row.variables ? JSON.parse(row.variables) : [],
      isActive: row.is_active,
      priority: parseInt(row.priority) || 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapRowToRecommendation(row: any): CouponRecommendation {
    return {
      id: row.id,
      userId: row.user_id,
      couponId: row.coupon_id,
      recommendationReason: row.recommendation_reason,
      confidence: parseFloat(row.confidence) || 0,
      personalizedMessage: row.personalized_message,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      createdAt: row.created_at,
      wasAccepted: row.was_accepted,
      acceptedAt: row.accepted_at
    };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}
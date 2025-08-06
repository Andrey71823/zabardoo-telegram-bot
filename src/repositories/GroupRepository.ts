import { Pool } from 'pg';
import { Group, GroupMessage, GroupMember, ModerationRule, CouponCreationRequest } from '../models/Group';
import { logger } from '../config/logger';
import { v4 as uuidv4 } from 'uuid';

export class GroupRepository {
  constructor(private pool: Pool) {}

  // Group Management
  async createGroup(groupData: Partial<Group>): Promise<Group> {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO groups (
          id, telegram_group_id, name, description, is_active, 
          member_count, moderation_level, allow_coupon_creation, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;
      
      const values = [
        uuidv4(),
        groupData.telegramGroupId,
        groupData.name,
        groupData.description,
        groupData.isActive ?? true,
        groupData.memberCount ?? 0,
        groupData.moderationLevel ?? 'medium',
        groupData.allowCouponCreation ?? true,
        new Date(),
        new Date()
      ];

      const result = await client.query(query, values);
      return this.mapRowToGroup(result.rows[0]);
    } catch (error) {
      logger.error('Error creating group:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getGroupByTelegramId(telegramGroupId: string): Promise<Group | null> {
    const client = await this.pool.connect();
    try {
      const query = 'SELECT * FROM groups WHERE telegram_group_id = $1';
      const result = await client.query(query, [telegramGroupId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToGroup(result.rows[0]);
    } catch (error) {
      logger.error('Error getting group by telegram ID:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async updateGroup(id: string, updates: Partial<Group>): Promise<Group | null> {
    const client = await this.pool.connect();
    try {
      const setClause = [];
      const values = [];
      let paramIndex = 1;

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined && key !== 'id') {
          setClause.push(`${this.camelToSnake(key)} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      });

      if (setClause.length === 0) {
        return await this.getGroupById(id);
      }

      setClause.push(`updated_at = $${paramIndex}`);
      values.push(new Date());
      values.push(id);

      const query = `
        UPDATE groups 
        SET ${setClause.join(', ')}
        WHERE id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToGroup(result.rows[0]);
    } catch (error) {
      logger.error('Error updating group:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Group Messages
  async recordGroupMessage(messageData: Partial<GroupMessage>): Promise<GroupMessage> {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO group_messages (
          id, group_id, user_id, message_id, content, message_type, 
          is_moderated, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      
      const values = [
        uuidv4(),
        messageData.groupId,
        messageData.userId,
        messageData.messageId,
        messageData.content,
        messageData.messageType ?? 'text',
        false,
        new Date()
      ];

      const result = await client.query(query, values);
      return this.mapRowToGroupMessage(result.rows[0]);
    } catch (error) {
      logger.error('Error recording group message:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async moderateMessage(messageId: string, action: string, reason?: string, moderatorId?: string): Promise<GroupMessage | null> {
    const client = await this.pool.connect();
    try {
      const query = `
        UPDATE group_messages 
        SET is_moderated = true, moderation_action = $1, moderation_reason = $2, 
            moderator_id = $3, moderated_at = $4
        WHERE message_id = $5
        RETURNING *
      `;

      const result = await client.query(query, [action, reason, moderatorId, new Date(), messageId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToGroupMessage(result.rows[0]);
    } catch (error) {
      logger.error('Error moderating message:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getRecentMessages(groupId: string, limit: number = 50): Promise<GroupMessage[]> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT * FROM group_messages 
        WHERE group_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2
      `;
      
      const result = await client.query(query, [groupId, limit]);
      return result.rows.map(row => this.mapRowToGroupMessage(row));
    } catch (error) {
      logger.error('Error getting recent messages:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Group Members
  async addGroupMember(memberData: Partial<GroupMember>): Promise<GroupMember> {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO group_members (
          id, group_id, user_id, role, status, joined_at, 
          last_active_at, warning_count, contribution_score
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (group_id, user_id) DO UPDATE SET
          status = EXCLUDED.status,
          last_active_at = EXCLUDED.last_active_at
        RETURNING *
      `;
      
      const values = [
        uuidv4(),
        memberData.groupId,
        memberData.userId,
        memberData.role ?? 'member',
        memberData.status ?? 'active',
        new Date(),
        new Date(),
        0,
        0
      ];

      const result = await client.query(query, values);
      return this.mapRowToGroupMember(result.rows[0]);
    } catch (error) {
      logger.error('Error adding group member:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async updateMemberStatus(groupId: string, userId: string, status: string, reason?: string): Promise<GroupMember | null> {
    const client = await this.pool.connect();
    try {
      const query = `
        UPDATE group_members 
        SET status = $1, last_active_at = $2
        WHERE group_id = $3 AND user_id = $4
        RETURNING *
      `;

      const result = await client.query(query, [status, new Date(), groupId, userId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToGroupMember(result.rows[0]);
    } catch (error) {
      logger.error('Error updating member status:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async incrementWarningCount(groupId: string, userId: string): Promise<number> {
    const client = await this.pool.connect();
    try {
      const query = `
        UPDATE group_members 
        SET warning_count = warning_count + 1
        WHERE group_id = $1 AND user_id = $2
        RETURNING warning_count
      `;

      const result = await client.query(query, [groupId, userId]);
      return result.rows[0]?.warning_count || 0;
    } catch (error) {
      logger.error('Error incrementing warning count:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Moderation Rules
  async createModerationRule(ruleData: Partial<ModerationRule>): Promise<ModerationRule> {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO moderation_rules (
          id, group_id, rule_type, is_active, parameters, action, severity, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      
      const values = [
        uuidv4(),
        ruleData.groupId,
        ruleData.ruleType,
        ruleData.isActive ?? true,
        JSON.stringify(ruleData.parameters || {}),
        ruleData.action ?? 'warn',
        ruleData.severity ?? 'medium',
        new Date()
      ];

      const result = await client.query(query, values);
      return this.mapRowToModerationRule(result.rows[0]);
    } catch (error) {
      logger.error('Error creating moderation rule:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getModerationRules(groupId: string): Promise<ModerationRule[]> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT * FROM moderation_rules 
        WHERE group_id = $1 AND is_active = true
        ORDER BY severity DESC, created_at ASC
      `;
      
      const result = await client.query(query, [groupId]);
      return result.rows.map(row => this.mapRowToModerationRule(row));
    } catch (error) {
      logger.error('Error getting moderation rules:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Coupon Creation Requests
  async createCouponRequest(requestData: Partial<CouponCreationRequest>): Promise<CouponCreationRequest> {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO coupon_creation_requests (
          id, group_id, user_id, message_id, title, description, store,
          discount_type, discount_value, coupon_code, link, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `;
      
      const values = [
        uuidv4(),
        requestData.groupId,
        requestData.userId,
        requestData.messageId,
        requestData.title,
        requestData.description,
        requestData.store,
        requestData.discountType,
        requestData.discountValue,
        requestData.couponCode,
        requestData.link,
        'pending',
        new Date()
      ];

      const result = await client.query(query, values);
      return this.mapRowToCouponRequest(result.rows[0]);
    } catch (error) {
      logger.error('Error creating coupon request:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getPendingCouponRequests(groupId: string): Promise<CouponCreationRequest[]> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT * FROM coupon_creation_requests 
        WHERE group_id = $1 AND status = 'pending'
        ORDER BY created_at ASC
      `;
      
      const result = await client.query(query, [groupId]);
      return result.rows.map(row => this.mapRowToCouponRequest(row));
    } catch (error) {
      logger.error('Error getting pending coupon requests:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async moderateCouponRequest(requestId: string, status: string, moderatorId: string, notes?: string): Promise<CouponCreationRequest | null> {
    const client = await this.pool.connect();
    try {
      const query = `
        UPDATE coupon_creation_requests 
        SET status = $1, moderator_id = $2, moderation_notes = $3, moderated_at = $4
        WHERE id = $5
        RETURNING *
      `;

      const result = await client.query(query, [status, moderatorId, notes, new Date(), requestId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToCouponRequest(result.rows[0]);
    } catch (error) {
      logger.error('Error moderating coupon request:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Helper methods
  private async getGroupById(id: string): Promise<Group | null> {
    const client = await this.pool.connect();
    try {
      const query = 'SELECT * FROM groups WHERE id = $1';
      const result = await client.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToGroup(result.rows[0]);
    } catch (error) {
      logger.error('Error getting group by ID:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  private mapRowToGroup(row: any): Group {
    return {
      id: row.id,
      telegramGroupId: row.telegram_group_id,
      name: row.name,
      description: row.description,
      isActive: row.is_active,
      memberCount: parseInt(row.member_count) || 0,
      moderationLevel: row.moderation_level,
      allowCouponCreation: row.allow_coupon_creation,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapRowToGroupMessage(row: any): GroupMessage {
    return {
      id: row.id,
      groupId: row.group_id,
      userId: row.user_id,
      messageId: row.message_id,
      content: row.content,
      messageType: row.message_type,
      isModerated: row.is_moderated,
      moderationAction: row.moderation_action,
      moderationReason: row.moderation_reason,
      createdAt: row.created_at,
      moderatedAt: row.moderated_at
    };
  }

  private mapRowToGroupMember(row: any): GroupMember {
    return {
      id: row.id,
      groupId: row.group_id,
      userId: row.user_id,
      role: row.role,
      status: row.status,
      joinedAt: row.joined_at,
      lastActiveAt: row.last_active_at,
      warningCount: parseInt(row.warning_count) || 0,
      contributionScore: parseFloat(row.contribution_score) || 0
    };
  }

  private mapRowToModerationRule(row: any): ModerationRule {
    return {
      id: row.id,
      groupId: row.group_id,
      ruleType: row.rule_type,
      isActive: row.is_active,
      parameters: row.parameters ? JSON.parse(row.parameters) : {},
      action: row.action,
      severity: row.severity,
      createdAt: row.created_at
    };
  }

  private mapRowToCouponRequest(row: any): CouponCreationRequest {
    return {
      id: row.id,
      groupId: row.group_id,
      userId: row.user_id,
      messageId: row.message_id,
      title: row.title,
      description: row.description,
      store: row.store,
      discountType: row.discount_type,
      discountValue: parseFloat(row.discount_value),
      couponCode: row.coupon_code,
      link: row.link,
      status: row.status,
      moderatorId: row.moderator_id,
      moderationNotes: row.moderation_notes,
      createdAt: row.created_at,
      moderatedAt: row.moderated_at
    };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}
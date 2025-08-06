import { Pool } from 'pg';
import { User, CreateUserRequest, UpdateUserRequest } from '../models/User';
import { logger } from '../config/logger';
import { v4 as uuidv4 } from 'uuid';

export class UserRepository {
  constructor(private pool: Pool) {}

  async createUser(userData: CreateUserRequest): Promise<User> {
    const client = await this.pool.connect();
    try {
      const personalChannelId = `channel_${userData.firstName.toLowerCase()}_${userData.telegramId}`;
      
      const query = `
        INSERT INTO users (
          id, telegram_id, username, first_name, last_name, 
          language_code, personal_channel_id, created_at, last_active_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      
      const values = [
        uuidv4(),
        userData.telegramId,
        userData.username,
        userData.firstName,
        userData.lastName,
        userData.languageCode || 'en',
        personalChannelId,
        new Date(),
        new Date()
      ];

      const result = await client.query(query, values);
      return this.mapRowToUser(result.rows[0]);
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getUserByTelegramId(telegramId: number): Promise<User | null> {
    const client = await this.pool.connect();
    try {
      const query = 'SELECT * FROM users WHERE telegram_id = $1';
      const result = await client.query(query, [telegramId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToUser(result.rows[0]);
    } catch (error) {
      logger.error('Error getting user by telegram ID:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getUserById(id: string): Promise<User | null> {
    const client = await this.pool.connect();
    try {
      const query = 'SELECT * FROM users WHERE id = $1';
      const result = await client.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToUser(result.rows[0]);
    } catch (error) {
      logger.error('Error getting user by ID:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async updateUser(id: string, updates: UpdateUserRequest): Promise<User | null> {
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
        return await this.getUserById(id);
      }

      setClause.push(`updated_at = $${paramIndex}`);
      values.push(new Date());
      values.push(id);

      const query = `
        UPDATE users 
        SET ${setClause.join(', ')}
        WHERE id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToUser(result.rows[0]);
    } catch (error) {
      logger.error('Error updating user:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async updateLastActive(telegramId: number): Promise<void> {
    const client = await this.pool.connect();
    try {
      const query = `
        UPDATE users 
        SET last_active_at = $1 
        WHERE telegram_id = $2
      `;
      
      await client.query(query, [new Date(), telegramId]);
    } catch (error) {
      logger.error('Error updating last active:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getActiveUsers(limit: number = 100): Promise<User[]> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT * FROM users 
        WHERE is_active = true 
        ORDER BY last_active_at DESC 
        LIMIT $1
      `;
      
      const result = await client.query(query, [limit]);
      return result.rows.map(row => this.mapRowToUser(row));
    } catch (error) {
      logger.error('Error getting active users:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  private mapRowToUser(row: any): User {
    return {
      id: row.id,
      telegramId: parseInt(row.telegram_id),
      username: row.username,
      firstName: row.first_name,
      lastName: row.last_name,
      languageCode: row.language_code,
      personalChannelId: row.personal_channel_id,
      createdAt: row.created_at,
      lastActiveAt: row.last_active_at,
      churnRisk: parseFloat(row.churn_risk) || 0,
      lifetimeValue: parseFloat(row.lifetime_value) || 0,
      isActive: row.is_active
    };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}
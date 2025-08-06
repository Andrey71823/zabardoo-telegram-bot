import { createClient, RedisClientType } from 'redis';
import { logger } from '../../config/logger';

export class RedisService {
  private client: RedisClientType;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        connectTimeout: 5000,
        lazyConnect: true,
        reconnectStrategy: (retries) => {
          if (retries > this.maxReconnectAttempts) {
            logger.error('Redis: Max reconnection attempts reached');
            return false;
          }
          return Math.min(retries * 100, 3000);
        }
      }
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      logger.info('Redis: Connecting...');
    });

    this.client.on('ready', () => {
      logger.info('Redis: Connected and ready');
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.client.on('error', (error) => {
      logger.error('Redis: Connection error:', error);
      this.isConnected = false;
    });

    this.client.on('end', () => {
      logger.warn('Redis: Connection ended');
      this.isConnected = false;
    });

    this.client.on('reconnecting', () => {
      this.reconnectAttempts++;
      logger.info(`Redis: Reconnecting... (attempt ${this.reconnectAttempts})`);
    });
  }

  async connect(): Promise<void> {
    try {
      if (!this.isConnected) {
        await this.client.connect();
      }
    } catch (error) {
      logger.error('Redis: Failed to connect:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.isConnected) {
        await this.client.disconnect();
        this.isConnected = false;
      }
    } catch (error) {
      logger.error('Redis: Failed to disconnect:', error);
    }
  }

  isReady(): boolean {
    return this.isConnected;
  }

  // Basic operations
  async get(key: string): Promise<string | null> {
    try {
      if (!this.isConnected) {
        logger.warn('Redis: Not connected, skipping get operation');
        return null;
      }
      return await this.client.get(key);
    } catch (error) {
      logger.error(`Redis: Error getting key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    try {
      if (!this.isConnected) {
        logger.warn('Redis: Not connected, skipping set operation');
        return false;
      }

      if (ttlSeconds) {
        await this.client.setEx(key, ttlSeconds, value);
      } else {
        await this.client.set(key, value);
      }
      return true;
    } catch (error) {
      logger.error(`Redis: Error setting key ${key}:`, error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      if (!this.isConnected) {
        logger.warn('Redis: Not connected, skipping delete operation');
        return false;
      }
      const result = await this.client.del(key);
      return result > 0;
    } catch (error) {
      logger.error(`Redis: Error deleting key ${key}:`, error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      if (!this.isConnected) {
        return false;
      }
      const result = await this.client.exists(key);
      return result > 0;
    } catch (error) {
      logger.error(`Redis: Error checking existence of key ${key}:`, error);
      return false;
    }
  }

  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    try {
      if (!this.isConnected) {
        return false;
      }
      const result = await this.client.expire(key, ttlSeconds);
      return result;
    } catch (error) {
      logger.error(`Redis: Error setting expiration for key ${key}:`, error);
      return false;
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      if (!this.isConnected) {
        return -1;
      }
      return await this.client.ttl(key);
    } catch (error) {
      logger.error(`Redis: Error getting TTL for key ${key}:`, error);
      return -1;
    }
  }

  // JSON operations
  async getJSON<T>(key: string): Promise<T | null> {
    try {
      const value = await this.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error(`Redis: Error parsing JSON for key ${key}:`, error);
      return null;
    }
  }

  async setJSON<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
    try {
      const jsonString = JSON.stringify(value);
      return await this.set(key, jsonString, ttlSeconds);
    } catch (error) {
      logger.error(`Redis: Error stringifying JSON for key ${key}:`, error);
      return false;
    }
  }

  // Hash operations
  async hGet(key: string, field: string): Promise<string | null> {
    try {
      if (!this.isConnected) return null;
      return await this.client.hGet(key, field);
    } catch (error) {
      logger.error(`Redis: Error getting hash field ${field} from key ${key}:`, error);
      return null;
    }
  }

  async hSet(key: string, field: string, value: string): Promise<boolean> {
    try {
      if (!this.isConnected) return false;
      const result = await this.client.hSet(key, field, value);
      return result > 0;
    } catch (error) {
      logger.error(`Redis: Error setting hash field ${field} in key ${key}:`, error);
      return false;
    }
  }

  async hGetAll(key: string): Promise<Record<string, string> | null> {
    try {
      if (!this.isConnected) return null;
      return await this.client.hGetAll(key);
    } catch (error) {
      logger.error(`Redis: Error getting all hash fields from key ${key}:`, error);
      return null;
    }
  }

  async hDel(key: string, field: string): Promise<boolean> {
    try {
      if (!this.isConnected) return false;
      const result = await this.client.hDel(key, field);
      return result > 0;
    } catch (error) {
      logger.error(`Redis: Error deleting hash field ${field} from key ${key}:`, error);
      return false;
    }
  }

  // List operations
  async lPush(key: string, value: string): Promise<number> {
    try {
      if (!this.isConnected) return 0;
      return await this.client.lPush(key, value);
    } catch (error) {
      logger.error(`Redis: Error pushing to list ${key}:`, error);
      return 0;
    }
  }

  async rPop(key: string): Promise<string | null> {
    try {
      if (!this.isConnected) return null;
      return await this.client.rPop(key);
    } catch (error) {
      logger.error(`Redis: Error popping from list ${key}:`, error);
      return null;
    }
  }

  async lRange(key: string, start: number, stop: number): Promise<string[]> {
    try {
      if (!this.isConnected) return [];
      return await this.client.lRange(key, start, stop);
    } catch (error) {
      logger.error(`Redis: Error getting range from list ${key}:`, error);
      return [];
    }
  }

  async lLen(key: string): Promise<number> {
    try {
      if (!this.isConnected) return 0;
      return await this.client.lLen(key);
    } catch (error) {
      logger.error(`Redis: Error getting length of list ${key}:`, error);
      return 0;
    }
  }

  // Set operations
  async sAdd(key: string, member: string): Promise<boolean> {
    try {
      if (!this.isConnected) return false;
      const result = await this.client.sAdd(key, member);
      return result > 0;
    } catch (error) {
      logger.error(`Redis: Error adding member to set ${key}:`, error);
      return false;
    }
  }

  async sRem(key: string, member: string): Promise<boolean> {
    try {
      if (!this.isConnected) return false;
      const result = await this.client.sRem(key, member);
      return result > 0;
    } catch (error) {
      logger.error(`Redis: Error removing member from set ${key}:`, error);
      return false;
    }
  }

  async sMembers(key: string): Promise<string[]> {
    try {
      if (!this.isConnected) return [];
      return await this.client.sMembers(key);
    } catch (error) {
      logger.error(`Redis: Error getting members of set ${key}:`, error);
      return [];
    }
  }

  async sIsMember(key: string, member: string): Promise<boolean> {
    try {
      if (!this.isConnected) return false;
      return await this.client.sIsMember(key, member);
    } catch (error) {
      logger.error(`Redis: Error checking membership in set ${key}:`, error);
      return false;
    }
  }

  // Sorted set operations
  async zAdd(key: string, score: number, member: string): Promise<boolean> {
    try {
      if (!this.isConnected) return false;
      const result = await this.client.zAdd(key, { score, value: member });
      return result > 0;
    } catch (error) {
      logger.error(`Redis: Error adding to sorted set ${key}:`, error);
      return false;
    }
  }

  async zRange(key: string, start: number, stop: number): Promise<string[]> {
    try {
      if (!this.isConnected) return [];
      return await this.client.zRange(key, start, stop);
    } catch (error) {
      logger.error(`Redis: Error getting range from sorted set ${key}:`, error);
      return [];
    }
  }

  async zRangeByScore(key: string, min: number, max: number): Promise<string[]> {
    try {
      if (!this.isConnected) return [];
      return await this.client.zRangeByScore(key, min, max);
    } catch (error) {
      logger.error(`Redis: Error getting range by score from sorted set ${key}:`, error);
      return [];
    }
  }

  // Utility methods
  async flushAll(): Promise<boolean> {
    try {
      if (!this.isConnected) return false;
      await this.client.flushAll();
      return true;
    } catch (error) {
      logger.error('Redis: Error flushing all data:', error);
      return false;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      if (!this.isConnected) return [];
      return await this.client.keys(pattern);
    } catch (error) {
      logger.error(`Redis: Error getting keys with pattern ${pattern}:`, error);
      return [];
    }
  }

  async info(): Promise<string> {
    try {
      if (!this.isConnected) return '';
      return await this.client.info();
    } catch (error) {
      logger.error('Redis: Error getting info:', error);
      return '';
    }
  }

  // Pipeline operations for batch processing
  async pipeline(operations: Array<() => Promise<any>>): Promise<any[]> {
    try {
      if (!this.isConnected) return [];
      
      const multi = this.client.multi();
      operations.forEach(op => op());
      
      return await multi.exec();
    } catch (error) {
      logger.error('Redis: Error executing pipeline:', error);
      return [];
    }
  }
}

// Singleton instance
export const redisService = new RedisService();
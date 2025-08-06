import { redisService } from './RedisService';
import { logger } from '../../config/logger';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string; // Key prefix
  serialize?: boolean; // Whether to serialize/deserialize JSON
  fallback?: boolean; // Whether to use fallback when cache fails
}

export interface CacheStats {
  hits: number;
  misses: number;
  errors: number;
  hitRate: number;
}

export class CacheManager {
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    errors: 0,
    hitRate: 0
  };

  private defaultOptions: CacheOptions = {
    ttl: 3600, // 1 hour default
    prefix: 'zabardoo:',
    serialize: true,
    fallback: true
  };

  constructor() {
    // Initialize Redis connection
    this.initializeRedis();
  }

  private async initializeRedis(): Promise<void> {
    try {
      await redisService.connect();
      logger.info('CacheManager: Redis connection established');
    } catch (error) {
      logger.error('CacheManager: Failed to connect to Redis:', error);
    }
  }

  private buildKey(key: string, prefix?: string): string {
    const keyPrefix = prefix || this.defaultOptions.prefix;
    return `${keyPrefix}${key}`;
  }

  private updateStats(hit: boolean, error: boolean = false): void {
    if (error) {
      this.stats.errors++;
    } else if (hit) {
      this.stats.hits++;
    } else {
      this.stats.misses++;
    }

    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    const opts = { ...this.defaultOptions, ...options };
    const cacheKey = this.buildKey(key, opts.prefix);

    try {
      let value: string | null;

      if (opts.serialize) {
        const result = await redisService.getJSON<T>(cacheKey);
        if (result !== null) {
          this.updateStats(true);
          return result;
        }
      } else {
        value = await redisService.get(cacheKey);
        if (value !== null) {
          this.updateStats(true);
          return value as unknown as T;
        }
      }

      this.updateStats(false);
      return null;
    } catch (error) {
      this.updateStats(false, true);
      logger.error(`CacheManager: Error getting key ${cacheKey}:`, error);
      
      if (opts.fallback) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, options?: CacheOptions): Promise<boolean> {
    const opts = { ...this.defaultOptions, ...options };
    const cacheKey = this.buildKey(key, opts.prefix);

    try {
      let success: boolean;

      if (opts.serialize) {
        success = await redisService.setJSON(cacheKey, value, opts.ttl);
      } else {
        success = await redisService.set(cacheKey, value as string, opts.ttl);
      }

      if (!success) {
        this.updateStats(false, true);
      }

      return success;
    } catch (error) {
      this.updateStats(false, true);
      logger.error(`CacheManager: Error setting key ${cacheKey}:`, error);
      
      if (opts.fallback) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string, options?: CacheOptions): Promise<boolean> {
    const opts = { ...this.defaultOptions, ...options };
    const cacheKey = this.buildKey(key, opts.prefix);

    try {
      return await redisService.del(cacheKey);
    } catch (error) {
      this.updateStats(false, true);
      logger.error(`CacheManager: Error deleting key ${cacheKey}:`, error);
      
      if (opts.fallback) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Check if key exists in cache
   */
  async exists(key: string, options?: CacheOptions): Promise<boolean> {
    const opts = { ...this.defaultOptions, ...options };
    const cacheKey = this.buildKey(key, opts.prefix);

    try {
      return await redisService.exists(cacheKey);
    } catch (error) {
      this.updateStats(false, true);
      logger.error(`CacheManager: Error checking existence of key ${cacheKey}:`, error);
      return false;
    }
  }

  /**
   * Get or set pattern - if key doesn't exist, execute function and cache result
   */
  async getOrSet<T>(
    key: string, 
    fetchFunction: () => Promise<T>, 
    options?: CacheOptions
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key, options);
    if (cached !== null) {
      return cached;
    }

    // Execute function to get fresh data
    try {
      const freshData = await fetchFunction();
      
      // Cache the result
      await this.set(key, freshData, options);
      
      return freshData;
    } catch (error) {
      logger.error(`CacheManager: Error in getOrSet for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidatePattern(pattern: string, options?: CacheOptions): Promise<number> {
    const opts = { ...this.defaultOptions, ...options };
    const searchPattern = this.buildKey(pattern, opts.prefix);

    try {
      const keys = await redisService.keys(searchPattern);
      
      if (keys.length === 0) {
        return 0;
      }

      let deletedCount = 0;
      for (const key of keys) {
        const deleted = await redisService.del(key);
        if (deleted) deletedCount++;
      }

      logger.info(`CacheManager: Invalidated ${deletedCount} keys matching pattern ${searchPattern}`);
      return deletedCount;
    } catch (error) {
      logger.error(`CacheManager: Error invalidating pattern ${searchPattern}:`, error);
      return 0;
    }
  }

  /**
   * Cache with tags for group invalidation
   */
  async setWithTags<T>(key: string, value: T, tags: string[], options?: CacheOptions): Promise<boolean> {
    const opts = { ...this.defaultOptions, ...options };
    
    try {
      // Set the main cache entry
      const success = await this.set(key, value, options);
      
      if (success) {
        // Add key to each tag set
        for (const tag of tags) {
          const tagKey = this.buildKey(`tag:${tag}`, opts.prefix);
          await redisService.sAdd(tagKey, this.buildKey(key, opts.prefix));
          
          // Set expiration for tag set (longer than cache entries)
          await redisService.expire(tagKey, (opts.ttl || 3600) * 2);
        }
      }
      
      return success;
    } catch (error) {
      logger.error(`CacheManager: Error setting key with tags ${key}:`, error);
      return false;
    }
  }

  /**
   * Invalidate all cache entries with specific tag
   */
  async invalidateByTag(tag: string, options?: CacheOptions): Promise<number> {
    const opts = { ...this.defaultOptions, ...options };
    const tagKey = this.buildKey(`tag:${tag}`, opts.prefix);

    try {
      const keys = await redisService.sMembers(tagKey);
      
      if (keys.length === 0) {
        return 0;
      }

      let deletedCount = 0;
      for (const key of keys) {
        const deleted = await redisService.del(key);
        if (deleted) deletedCount++;
      }

      // Remove the tag set itself
      await redisService.del(tagKey);

      logger.info(`CacheManager: Invalidated ${deletedCount} keys with tag ${tag}`);
      return deletedCount;
    } catch (error) {
      logger.error(`CacheManager: Error invalidating by tag ${tag}:`, error);
      return 0;
    }
  }

  /**
   * Batch operations
   */
  async mget<T>(keys: string[], options?: CacheOptions): Promise<(T | null)[]> {
    const results: (T | null)[] = [];
    
    for (const key of keys) {
      const value = await this.get<T>(key, options);
      results.push(value);
    }
    
    return results;
  }

  async mset<T>(entries: Array<{ key: string; value: T }>, options?: CacheOptions): Promise<boolean[]> {
    const results: boolean[] = [];
    
    for (const entry of entries) {
      const success = await this.set(entry.key, entry.value, options);
      results.push(success);
    }
    
    return results;
  }

  /**
   * Cache warming - preload frequently accessed data
   */
  async warmCache(warmingFunctions: Array<{
    key: string;
    fetchFunction: () => Promise<any>;
    options?: CacheOptions;
  }>): Promise<void> {
    logger.info(`CacheManager: Starting cache warming for ${warmingFunctions.length} entries`);
    
    const promises = warmingFunctions.map(async ({ key, fetchFunction, options }) => {
      try {
        const data = await fetchFunction();
        await this.set(key, data, options);
        logger.debug(`CacheManager: Warmed cache for key ${key}`);
      } catch (error) {
        logger.error(`CacheManager: Failed to warm cache for key ${key}:`, error);
      }
    });

    await Promise.allSettled(promises);
    logger.info('CacheManager: Cache warming completed');
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      errors: 0,
      hitRate: 0
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    redis: boolean;
    stats: CacheStats;
    info?: any;
  }> {
    try {
      const isRedisReady = redisService.isReady();
      
      if (isRedisReady) {
        // Test basic operations
        const testKey = 'health:check';
        const testValue = Date.now().toString();
        
        await redisService.set(testKey, testValue, 10);
        const retrieved = await redisService.get(testKey);
        await redisService.del(testKey);
        
        const isWorking = retrieved === testValue;
        
        return {
          status: isWorking ? 'healthy' : 'unhealthy',
          redis: isWorking,
          stats: this.getStats()
        };
      } else {
        return {
          status: 'unhealthy',
          redis: false,
          stats: this.getStats()
        };
      }
    } catch (error) {
      logger.error('CacheManager: Health check failed:', error);
      return {
        status: 'unhealthy',
        redis: false,
        stats: this.getStats(),
        info: error.message
      };
    }
  }

  /**
   * Cleanup expired keys and optimize memory
   */
  async cleanup(): Promise<void> {
    try {
      logger.info('CacheManager: Starting cleanup process');
      
      // Get Redis info for memory usage
      const info = await redisService.info();
      logger.debug('CacheManager: Redis info before cleanup:', info);
      
      // Note: Redis automatically handles expired key cleanup
      // This method can be extended for custom cleanup logic
      
      logger.info('CacheManager: Cleanup process completed');
    } catch (error) {
      logger.error('CacheManager: Cleanup process failed:', error);
    }
  }
}

// Singleton instance
export const cacheManager = new CacheManager();
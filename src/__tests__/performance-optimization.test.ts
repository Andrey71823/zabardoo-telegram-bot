import { CacheManager } from '../services/cache/CacheManager';
import { QueryOptimizer } from '../services/database/QueryOptimizer';
import { ConnectionPool } from '../services/database/ConnectionPool';
import { 
  UserCacheStrategy, 
  CouponCacheStrategy, 
  AnalyticsCacheStrategy 
} from '../services/cache/CacheStrategies';

// Mock Redis service
jest.mock('../services/cache/RedisService', () => ({
  redisService: {
    connect: jest.fn().mockResolvedValue(true),
    isReady: jest.fn().mockReturnValue(true),
    get: jest.fn(),
    set: jest.fn().mockResolvedValue(true),
    setEx: jest.fn().mockResolvedValue(true),
    del: jest.fn().mockResolvedValue(true),
    exists: jest.fn().mockResolvedValue(true),
    getJSON: jest.fn(),
    setJSON: jest.fn().mockResolvedValue(true),
    sAdd: jest.fn().mockResolvedValue(1),
    sMembers: jest.fn().mockResolvedValue([]),
    keys: jest.fn().mockResolvedValue([])
  }
}));

describe('Performance Optimization System', () => {
  
  describe('CacheManager', () => {
    let cacheManager: CacheManager;

    beforeEach(() => {
      cacheManager = new CacheManager();
      jest.clearAllMocks();
    });

    describe('Basic Cache Operations', () => {
      it('should set and get cache values', async () => {
        const key = 'test:key';
        const value = { id: 1, name: 'Test' };

        const setResult = await cacheManager.set(key, value);
        expect(setResult).toBe(true);

        // Mock the get operation
        const { redisService } = require('../services/cache/RedisService');
        redisService.getJSON.mockResolvedValue(value);

        const getResult = await cacheManager.get(key);
        expect(getResult).toEqual(value);
      });

      it('should handle cache misses gracefully', async () => {
        const { redisService } = require('../services/cache/RedisService');
        redisService.getJSON.mockResolvedValue(null);

        const result = await cacheManager.get('nonexistent:key');
        expect(result).toBeNull();
      });

      it('should implement getOrSet pattern', async () => {
        const key = 'test:getOrSet';
        const fetchFunction = jest.fn().mockResolvedValue({ data: 'fresh' });

        // Mock cache miss first, then cache hit
        const { redisService } = require('../services/cache/RedisService');
        redisService.getJSON
          .mockResolvedValueOnce(null) // First call - cache miss
          .mockResolvedValueOnce({ data: 'fresh' }); // Second call - cache hit

        // First call should execute fetch function
        const result1 = await cacheManager.getOrSet(key, fetchFunction);
        expect(result1).toEqual({ data: 'fresh' });
        expect(fetchFunction).toHaveBeenCalledTimes(1);

        // Second call should use cached value
        const result2 = await cacheManager.getOrSet(key, fetchFunction);
        expect(result2).toEqual({ data: 'fresh' });
        expect(fetchFunction).toHaveBeenCalledTimes(1); // Should not be called again
      });

      it('should handle cache with tags', async () => {
        const key = 'test:tagged';
        const value = { id: 1 };
        const tags = ['users', 'active'];

        const result = await cacheManager.setWithTags(key, value, tags);
        expect(result).toBe(true);

        const { redisService } = require('../services/cache/RedisService');
        expect(redisService.sAdd).toHaveBeenCalledTimes(tags.length);
      });

      it('should invalidate cache by tag', async () => {
        const tag = 'users';
        const { redisService } = require('../services/cache/RedisService');
        redisService.sMembers.mockResolvedValue(['user:1', 'user:2']);
        redisService.del.mockResolvedValue(true);

        const result = await cacheManager.invalidateByTag(tag);
        expect(result).toBe(2);
        expect(redisService.del).toHaveBeenCalledTimes(3); // 2 keys + tag set
      });
    });

    describe('Cache Statistics', () => {
      it('should track cache hits and misses', async () => {
        const { redisService } = require('../services/cache/RedisService');
        
        // Mock cache hit
        redisService.getJSON.mockResolvedValueOnce({ data: 'cached' });
        await cacheManager.get('hit:key');

        // Mock cache miss
        redisService.getJSON.mockResolvedValueOnce(null);
        await cacheManager.get('miss:key');

        const stats = cacheManager.getStats();
        expect(stats.hits).toBe(1);
        expect(stats.misses).toBe(1);
        expect(stats.hitRate).toBe(50);
      });

      it('should reset statistics', () => {
        const initialStats = cacheManager.getStats();
        cacheManager.resetStats();
        const resetStats = cacheManager.getStats();
        
        expect(resetStats.hits).toBe(0);
        expect(resetStats.misses).toBe(0);
        expect(resetStats.errors).toBe(0);
        expect(resetStats.hitRate).toBe(0);
      });
    });

    describe('Health Check', () => {
      it('should perform health check successfully', async () => {
        const { redisService } = require('../services/cache/RedisService');
        redisService.set.mockResolvedValue(true);
        redisService.get.mockResolvedValue('test-value');
        redisService.del.mockResolvedValue(true);

        const health = await cacheManager.healthCheck();
        expect(health.status).toBe('healthy');
        expect(health.redis).toBe(true);
      });

      it('should detect unhealthy cache', async () => {
        const { redisService } = require('../services/cache/RedisService');
        redisService.isReady.mockReturnValue(false);

        const health = await cacheManager.healthCheck();
        expect(health.status).toBe('unhealthy');
        expect(health.redis).toBe(false);
      });
    });
  });

  describe('Cache Strategies', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe('UserCacheStrategy', () => {
      it('should cache user data', async () => {
        const userId = 'user123';
        const userData = { id: userId, name: 'John Doe', email: 'john@example.com' };

        const result = await UserCacheStrategy.setUser(userId, userData);
        expect(result).toBe(true);
      });

      it('should retrieve cached user data', async () => {
        const userId = 'user123';
        const userData = { id: userId, name: 'John Doe' };

        const { redisService } = require('../services/cache/RedisService');
        redisService.get.mockResolvedValue(JSON.stringify(userData));

        const result = await UserCacheStrategy.getUser(userId);
        expect(result).toEqual(userData);
      });

      it('should handle user session caching', async () => {
        const userId = 'user123';
        const sessionData = { token: 'abc123', expires: Date.now() + 3600000 };

        await UserCacheStrategy.setUserSession(userId, sessionData);
        
        const { redisService } = require('../services/cache/RedisService');
        expect(redisService.setJSON).toHaveBeenCalledWith(
          `user:session:${userId}`,
          sessionData,
          3600
        );
      });
    });

    describe('CouponCacheStrategy', () => {
      it('should cache coupon data with tags', async () => {
        const couponId = 'coupon123';
        const couponData = {
          id: couponId,
          storeId: 'store456',
          category: 'electronics',
          discount: 20
        };

        const result = await CouponCacheStrategy.setCoupon(couponId, couponData);
        expect(result).toBe(true);
      });

      it('should cache active coupons list', async () => {
        const activeCoupons = [
          { id: 'coupon1', discount: 10 },
          { id: 'coupon2', discount: 20 }
        ];

        const result = await CouponCacheStrategy.setActiveCoupons(activeCoupons);
        expect(result).toBe(true);
      });

      it('should invalidate store-specific coupons', async () => {
        const storeId = 'store123';
        
        const { redisService } = require('../services/cache/RedisService');
        redisService.sMembers.mockResolvedValue(['coupon:1', 'coupon:2']);
        redisService.del.mockResolvedValue(true);

        const result = await CouponCacheStrategy.invalidateStore(storeId);
        expect(result).toBe(2);
      });
    });

    describe('AnalyticsCacheStrategy', () => {
      it('should cache dashboard statistics', async () => {
        const stats = {
          totalUsers: 1000,
          totalCoupons: 500,
          totalRevenue: 50000
        };

        const result = await AnalyticsCacheStrategy.setDashboardStats(stats);
        expect(result).toBe(true);
      });

      it('should cache user analytics by period', async () => {
        const userId = 'user123';
        const period = 'monthly';
        const analytics = {
          couponsUsed: 15,
          totalSavings: 500,
          favoriteCategories: ['electronics', 'fashion']
        };

        const result = await AnalyticsCacheStrategy.setUserAnalytics(userId, period, analytics);
        expect(result).toBe(true);
      });
    });
  });

  describe('QueryOptimizer', () => {
    let queryOptimizer: QueryOptimizer;

    beforeEach(() => {
      queryOptimizer = new QueryOptimizer(1000); // 1 second threshold
    });

    describe('Query Recording', () => {
      it('should record query metrics', () => {
        const query = 'SELECT * FROM users WHERE id = $1';
        const executionTime = 500;
        const rowsAffected = 1;
        const parameters = ['user123'];

        queryOptimizer.recordQuery(query, executionTime, rowsAffected, parameters);

        const stats = queryOptimizer.getPerformanceStats();
        expect(stats.totalQueries).toBe(1);
        expect(stats.averageExecutionTime).toBe(500);
      });

      it('should identify slow queries', () => {
        // Record a slow query
        queryOptimizer.recordQuery('SELECT * FROM large_table', 2000, 1000);
        
        // Record a fast query
        queryOptimizer.recordQuery('SELECT * FROM users WHERE id = $1', 50, 1);

        const stats = queryOptimizer.getPerformanceStats();
        expect(stats.totalQueries).toBe(2);
        expect(stats.slowQueries).toBe(1);
        expect(stats.slowQueryPercentage).toBe(50);
      });

      it('should normalize queries for analysis', () => {
        // Record similar queries with different parameters
        queryOptimizer.recordQuery('SELECT * FROM users WHERE id = $1', 100, 1, ['user1']);
        queryOptimizer.recordQuery('SELECT * FROM users WHERE id = $1', 120, 1, ['user2']);
        queryOptimizer.recordQuery('SELECT * FROM users WHERE id = $1', 90, 1, ['user3']);

        const analysis = queryOptimizer.analyzeQueries();
        expect(analysis.frequentQueries).toHaveLength(1);
        expect(analysis.frequentQueries[0].count).toBe(3);
      });
    });

    describe('Query Analysis', () => {
      beforeEach(() => {
        // Add some test data
        queryOptimizer.recordQuery('SELECT * FROM users WHERE user_id = $1', 1500, 1);
        queryOptimizer.recordQuery('SELECT * FROM coupons WHERE store_id = $1 AND status = $2', 2000, 50);
        queryOptimizer.recordQuery('SELECT * FROM orders ORDER BY created_at DESC', 800, 100);
        queryOptimizer.recordQuery('SELECT u.*, p.* FROM users u JOIN profiles p ON u.id = p.user_id', 3000, 200);
      });

      it('should generate optimization suggestions', () => {
        const analysis = queryOptimizer.analyzeQueries();
        
        expect(analysis.suggestions.length).toBeGreaterThan(0);
        
        // Should suggest indexes for WHERE clauses
        const indexSuggestions = analysis.suggestions.filter(s => s.type === 'index');
        expect(indexSuggestions.length).toBeGreaterThan(0);
        
        // Should suggest JOIN optimization for slow JOINs
        const joinSuggestions = analysis.suggestions.filter(s => s.type === 'join_optimization');
        expect(joinSuggestions.length).toBeGreaterThan(0);
      });

      it('should identify frequent queries', () => {
        // Record the same query multiple times
        for (let i = 0; i < 10; i++) {
          queryOptimizer.recordQuery('SELECT * FROM users WHERE email = $1', 200, 1);
        }

        const analysis = queryOptimizer.analyzeQueries();
        const frequentQuery = analysis.frequentQueries.find(q => 
          q.query.includes('email')
        );
        
        expect(frequentQuery).toBeDefined();
        expect(frequentQuery!.count).toBe(10);
      });

      it('should generate optimization report', () => {
        const report = queryOptimizer.generateOptimizationReport();
        
        expect(report.summary).toBeDefined();
        expect(report.analysis).toBeDefined();
        expect(report.recommendations).toBeDefined();
        expect(report.indexSuggestions).toBeDefined();
        
        expect(report.summary.totalQueries).toBeGreaterThan(0);
        expect(report.recommendations.length).toBeGreaterThan(0);
      });
    });

    describe('Performance Statistics', () => {
      it('should calculate performance statistics correctly', () => {
        queryOptimizer.recordQuery('Fast query', 100, 1);
        queryOptimizer.recordQuery('Slow query', 2000, 1);
        queryOptimizer.recordQuery('Medium query', 500, 1);

        const stats = queryOptimizer.getPerformanceStats();
        
        expect(stats.totalQueries).toBe(3);
        expect(stats.slowQueries).toBe(1);
        expect(stats.averageExecutionTime).toBe((100 + 2000 + 500) / 3);
        expect(stats.slowQueryPercentage).toBeCloseTo(33.33, 1);
      });

      it('should track top slow queries', () => {
        queryOptimizer.recordQuery('Very slow query', 5000, 1);
        queryOptimizer.recordQuery('Slow query', 2000, 1);
        queryOptimizer.recordQuery('Fast query', 100, 1);

        const stats = queryOptimizer.getPerformanceStats();
        
        expect(stats.topSlowQueries).toHaveLength(2);
        expect(stats.topSlowQueries[0].executionTime).toBe(5000);
        expect(stats.topSlowQueries[1].executionTime).toBe(2000);
      });
    });
  });

  describe('Integration Tests', () => {
    it('should integrate cache and query optimization', async () => {
      const cacheManager = new CacheManager();
      const queryOptimizer = new QueryOptimizer();

      // Simulate a database query that gets cached
      const fetchUserData = async (userId: string) => {
        // Simulate query execution time
        const startTime = Date.now();
        await new Promise(resolve => setTimeout(resolve, 100));
        const executionTime = Date.now() - startTime;
        
        // Record query metrics
        queryOptimizer.recordQuery(
          'SELECT * FROM users WHERE id = $1',
          executionTime,
          1,
          [userId]
        );

        return { id: userId, name: 'John Doe' };
      };

      // First call - should execute query and cache result
      const { redisService } = require('../services/cache/RedisService');
      redisService.getJSON.mockResolvedValueOnce(null); // Cache miss
      
      const result1 = await cacheManager.getOrSet(
        `user:${123}`,
        () => fetchUserData('123')
      );

      expect(result1).toEqual({ id: '123', name: 'John Doe' });

      // Second call - should use cached result
      redisService.getJSON.mockResolvedValueOnce({ id: '123', name: 'John Doe' }); // Cache hit
      
      const result2 = await cacheManager.getOrSet(
        `user:${123}`,
        () => fetchUserData('123')
      );

      expect(result2).toEqual({ id: '123', name: 'John Doe' });

      // Verify query was only executed once
      const stats = queryOptimizer.getPerformanceStats();
      expect(stats.totalQueries).toBe(1);

      // Verify cache statistics
      const cacheStats = cacheManager.getStats();
      expect(cacheStats.hits).toBe(1);
      expect(cacheStats.misses).toBe(1);
    });
  });
});

describe('ConnectionPool', () => {
  let connectionPool: ConnectionPool;

  beforeEach(() => {
    // Mock pg Pool
    const mockPool = {
      connect: jest.fn(),
      query: jest.fn(),
      end: jest.fn(),
      on: jest.fn(),
      totalCount: 10,
      idleCount: 5,
      waitingCount: 0
    };

    // Mock the Pool constructor
    jest.doMock('pg', () => ({
      Pool: jest.fn(() => mockPool)
    }));

    connectionPool = new ConnectionPool({
      max: 10,
      min: 2,
      idleTimeoutMillis: 30000
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Query Execution', () => {
    it('should execute queries with connection pooling', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1 }),
        release: jest.fn()
      };

      const { Pool } = require('pg');
      const mockPool = new Pool();
      mockPool.connect.mockResolvedValue(mockClient);

      // Override the pool instance
      (connectionPool as any).pool = mockPool;

      const result = await connectionPool.query('SELECT * FROM users WHERE id = $1', [1]);

      expect(result.rows).toEqual([{ id: 1 }]);
      expect(result.rowCount).toBe(1);
      expect(mockClient.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1', [1]);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle query errors gracefully', async () => {
      const mockClient = {
        query: jest.fn().mockRejectedValue(new Error('Query failed')),
        release: jest.fn()
      };

      const { Pool } = require('pg');
      const mockPool = new Pool();
      mockPool.connect.mockResolvedValue(mockClient);

      (connectionPool as any).pool = mockPool;

      await expect(
        connectionPool.query('INVALID SQL')
      ).rejects.toThrow('Query failed');

      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should retry failed queries', async () => {
      const mockClient = {
        query: jest.fn()
          .mockRejectedValueOnce(new Error('ECONNRESET'))
          .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }),
        release: jest.fn()
      };

      const { Pool } = require('pg');
      const mockPool = new Pool();
      mockPool.connect.mockResolvedValue(mockClient);

      (connectionPool as any).pool = mockPool;

      const result = await connectionPool.query('SELECT * FROM users WHERE id = $1', [1]);

      expect(result.rows).toEqual([{ id: 1 }]);
      expect(mockClient.query).toHaveBeenCalledTimes(2);
    });
  });

  describe('Transaction Support', () => {
    it('should execute transactions correctly', async () => {
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce(undefined) // BEGIN
          .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }) // User query
          .mockResolvedValueOnce(undefined), // COMMIT
        release: jest.fn()
      };

      const { Pool } = require('pg');
      const mockPool = new Pool();
      mockPool.connect.mockResolvedValue(mockClient);

      (connectionPool as any).pool = mockPool;

      const result = await connectionPool.transaction(async (client) => {
        const userResult = await client.query('SELECT * FROM users WHERE id = $1', [1]);
        return userResult.rows[0];
      });

      expect(result).toEqual({ id: 1 });
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback transactions on error', async () => {
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce(undefined) // BEGIN
          .mockRejectedValueOnce(new Error('Query failed')) // User query fails
          .mockResolvedValueOnce(undefined), // ROLLBACK
        release: jest.fn()
      };

      const { Pool } = require('pg');
      const mockPool = new Pool();
      mockPool.connect.mockResolvedValue(mockClient);

      (connectionPool as any).pool = mockPool;

      await expect(
        connectionPool.transaction(async (client) => {
          await client.query('INVALID SQL');
        })
      ).rejects.toThrow('Query failed');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('Pool Statistics', () => {
    it('should track pool statistics', () => {
      const stats = connectionPool.getStats();

      expect(stats).toHaveProperty('totalConnections');
      expect(stats).toHaveProperty('idleConnections');
      expect(stats).toHaveProperty('waitingClients');
      expect(stats).toHaveProperty('maxConnections');
      expect(stats).toHaveProperty('activeQueries');
      expect(stats).toHaveProperty('totalQueries');
    });

    it('should provide detailed pool information', () => {
      const info = connectionPool.getPoolInfo();

      expect(info).toHaveProperty('config');
      expect(info).toHaveProperty('stats');
      expect(info).toHaveProperty('activeQueries');
      expect(Array.isArray(info.activeQueries)).toBe(true);
    });
  });

  describe('Health Check', () => {
    it('should perform health check successfully', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [{ health_check: 1 }] }),
        release: jest.fn()
      };

      const { Pool } = require('pg');
      const mockPool = new Pool();
      mockPool.connect.mockResolvedValue(mockClient);

      (connectionPool as any).pool = mockPool;

      const health = await connectionPool.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.details.canConnect).toBe(true);
      expect(typeof health.details.responseTime).toBe('number');
    });

    it('should detect unhealthy pool', async () => {
      const { Pool } = require('pg');
      const mockPool = new Pool();
      mockPool.connect.mockRejectedValue(new Error('Connection failed'));

      (connectionPool as any).pool = mockPool;

      const health = await connectionPool.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.details.canConnect).toBe(false);
      expect(health.details.error).toBe('Connection failed');
    });
  });
});
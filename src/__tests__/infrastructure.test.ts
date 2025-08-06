import request from 'supertest';
import { logger } from '../config/logger';
import { checkDatabaseHealth } from '../config/database';

// Mock database connections for testing
jest.mock('../config/database', () => ({
  connectDatabases: jest.fn().mockResolvedValue(undefined),
  checkDatabaseHealth: jest.fn().mockResolvedValue({ postgres: true, redis: true }),
  pgPool: {
    connect: jest.fn().mockResolvedValue({
      query: jest.fn().mockResolvedValue({ rows: [] }),
      release: jest.fn(),
    }),
    end: jest.fn(),
    on: jest.fn(),
  },
  redisClient: {
    connect: jest.fn().mockResolvedValue(undefined),
    quit: jest.fn().mockResolvedValue(undefined),
    ping: jest.fn().mockResolvedValue('PONG'),
    on: jest.fn(),
  },
}));

describe('Infrastructure Tests', () => {
  describe('Logger', () => {
    it('should create logger instance', () => {
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    it('should log messages without errors', () => {
      expect(() => {
        logger.info('Test info message');
        logger.warn('Test warning message');
        logger.error('Test error message');
        logger.debug('Test debug message');
      }).not.toThrow();
    });
  });

  describe('Database Health Check', () => {
    it('should return health status for databases', async () => {
      const health = await checkDatabaseHealth();
      
      expect(health).toBeDefined();
      expect(health).toHaveProperty('postgres');
      expect(health).toHaveProperty('redis');
      expect(typeof health.postgres).toBe('boolean');
      expect(typeof health.redis).toBe('boolean');
    });
  });

  describe('Configuration', () => {
    it('should load configuration values', () => {
      const config = require('../config').default;
      
      expect(config).toBeDefined();
      expect(config).toHaveProperty('port');
      expect(config).toHaveProperty('nodeEnv');
      expect(config).toHaveProperty('database');
      expect(config).toHaveProperty('services');
      expect(config).toHaveProperty('security');
      expect(config).toHaveProperty('monitoring');
    });

    it('should have database configuration', () => {
      const config = require('../config').default;
      
      expect(config.database).toHaveProperty('postgres');
      expect(config.database).toHaveProperty('redis');
      expect(config.database.postgres).toHaveProperty('host');
      expect(config.database.postgres).toHaveProperty('port');
      expect(config.database.postgres).toHaveProperty('database');
    });

    it('should have service configuration', () => {
      const config = require('../config').default;
      
      expect(config.services).toHaveProperty('channelManager');
      expect(config.services).toHaveProperty('aiAssistant');
      expect(config.services).toHaveProperty('couponService');
      expect(config.services).toHaveProperty('trafficManager');
      expect(config.services).toHaveProperty('analyticsService');
      expect(config.services).toHaveProperty('retentionEngine');
    });
  });

  describe('Monitoring', () => {
    it('should have monitoring configuration', () => {
      const { 
        httpRequestsTotal, 
        httpRequestDuration, 
        activeConnections,
        databaseConnections 
      } = require('../config/monitoring');
      
      expect(httpRequestsTotal).toBeDefined();
      expect(httpRequestDuration).toBeDefined();
      expect(activeConnections).toBeDefined();
      expect(databaseConnections).toBeDefined();
    });

    it('should create metrics middleware', () => {
      const { metricsMiddleware } = require('../config/monitoring');
      const middleware = metricsMiddleware('test-service');
      
      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });
  });
});
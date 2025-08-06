import { Pool, PoolConfig } from 'pg';
import { createClient, RedisClientType } from 'redis';
import { logger } from './logger';

// PostgreSQL Configuration
const pgConfig: PoolConfig = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'zabardoo',
  user: process.env.POSTGRES_USER || 'zabardoo_user',
  password: process.env.POSTGRES_PASSWORD || 'zabardoo_password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// PostgreSQL Pool
export const pgPool = new Pool(pgConfig);

// Redis Configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
};

// Redis Client
export const redisClient: RedisClientType = createClient({
  socket: {
    host: redisConfig.host,
    port: redisConfig.port,
  },
});

// Database connection handlers
export const connectDatabases = async (): Promise<void> => {
  try {
    // Test PostgreSQL connection
    const pgClient = await pgPool.connect();
    await pgClient.query('SELECT NOW()');
    pgClient.release();
    logger.info('PostgreSQL connected successfully');

    // Connect Redis
    await redisClient.connect();
    logger.info('Redis connected successfully');

    // Setup connection error handlers
    pgPool.on('error', (err) => {
      logger.error('PostgreSQL pool error:', err);
    });

    redisClient.on('error', (err) => {
      logger.error('Redis client error:', err);
    });

  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
};

export const disconnectDatabases = async (): Promise<void> => {
  try {
    await pgPool.end();
    await redisClient.quit();
    logger.info('Databases disconnected successfully');
  } catch (error) {
    logger.error('Error disconnecting databases:', error);
  }
};

// Health check functions
export const checkDatabaseHealth = async (): Promise<{ postgres: boolean; redis: boolean }> => {
  const health = { postgres: false, redis: false };

  try {
    const pgClient = await pgPool.connect();
    await pgClient.query('SELECT 1');
    pgClient.release();
    health.postgres = true;
  } catch (error) {
    logger.error('PostgreSQL health check failed:', error);
  }

  try {
    await redisClient.ping();
    health.redis = true;
  } catch (error) {
    logger.error('Redis health check failed:', error);
  }

  return health;
};
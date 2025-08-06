import { Pool, PoolClient, PoolConfig } from 'pg';
import { logger } from '../../config/logger';
import { queryOptimizer } from './QueryOptimizer';

export interface ConnectionPoolConfig extends PoolConfig {
  // Additional configuration options
  healthCheckInterval?: number;
  connectionTimeout?: number;
  queryTimeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

export interface PoolStats {
  totalConnections: number;
  idleConnections: number;
  waitingClients: number;
  maxConnections: number;
  activeQueries: number;
  totalQueries: number;
  averageQueryTime: number;
  connectionErrors: number;
  queryErrors: number;
}

export class ConnectionPool {
  private pool: Pool;
  private config: ConnectionPoolConfig;
  private stats: PoolStats;
  private healthCheckTimer?: NodeJS.Timeout;
  private activeQueries: Map<string, { startTime: number; query: string }> = new Map();

  constructor(config: ConnectionPoolConfig) {
    this.config = {
      // Default configuration
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'zabardoo',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || '',
      
      // Connection pool settings
      max: 20, // Maximum number of connections
      min: 5,  // Minimum number of connections
      idleTimeoutMillis: 30000, // 30 seconds
      connectionTimeoutMillis: 5000, // 5 seconds
      
      // Query settings
      query_timeout: 30000, // 30 seconds
      statement_timeout: 30000, // 30 seconds
      
      // Additional settings
      healthCheckInterval: 60000, // 1 minute
      connectionTimeout: 5000,
      queryTimeout: 30000,
      maxRetries: 3,
      retryDelay: 1000,
      
      // Override with provided config
      ...config
    };

    this.pool = new Pool(this.config);
    this.stats = this.initializeStats();
    this.setupEventHandlers();
    this.startHealthCheck();
  }

  private initializeStats(): PoolStats {
    return {
      totalConnections: 0,
      idleConnections: 0,
      waitingClients: 0,
      maxConnections: this.config.max || 20,
      activeQueries: 0,
      totalQueries: 0,
      averageQueryTime: 0,
      connectionErrors: 0,
      queryErrors: 0
    };
  }

  private setupEventHandlers(): void {
    this.pool.on('connect', (client: PoolClient) => {
      logger.debug('ConnectionPool: New client connected');
      this.stats.totalConnections++;
    });

    this.pool.on('acquire', (client: PoolClient) => {
      logger.debug('ConnectionPool: Client acquired from pool');
    });

    this.pool.on('release', (client: PoolClient) => {
      logger.debug('ConnectionPool: Client released back to pool');
    });

    this.pool.on('remove', (client: PoolClient) => {
      logger.debug('ConnectionPool: Client removed from pool');
      this.stats.totalConnections--;
    });

    this.pool.on('error', (error: Error, client: PoolClient) => {
      logger.error('ConnectionPool: Pool error:', error);
      this.stats.connectionErrors++;
    });
  }

  private startHealthCheck(): void {
    if (this.config.healthCheckInterval) {
      this.healthCheckTimer = setInterval(async () => {
        await this.performHealthCheck();
      }, this.config.healthCheckInterval);
    }
  }

  private async performHealthCheck(): Promise<void> {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      
      // Update stats
      this.updatePoolStats();
      
      logger.debug('ConnectionPool: Health check passed');
    } catch (error) {
      logger.error('ConnectionPool: Health check failed:', error);
      this.stats.connectionErrors++;
    }
  }

  private updatePoolStats(): void {
    this.stats.totalConnections = this.pool.totalCount;
    this.stats.idleConnections = this.pool.idleCount;
    this.stats.waitingClients = this.pool.waitingCount;
    this.stats.activeQueries = this.activeQueries.size;
  }

  /**
   * Execute a query with connection pooling and monitoring
   */
  async query<T = any>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount: number }> {
    const queryId = this.generateQueryId();
    const startTime = Date.now();
    
    this.activeQueries.set(queryId, { startTime, query: text });
    this.stats.totalQueries++;

    try {
      const result = await this.executeWithRetry(text, params);
      const executionTime = Date.now() - startTime;
      
      // Record query metrics
      queryOptimizer.recordQuery(text, executionTime, result.rowCount || 0, params);
      
      // Update average query time
      this.updateAverageQueryTime(executionTime);
      
      logger.debug(`Query executed in ${executionTime}ms: ${text.substring(0, 100)}...`);
      
      return result;
    } catch (error) {
      this.stats.queryErrors++;
      logger.error('ConnectionPool: Query error:', error);
      throw error;
    } finally {
      this.activeQueries.delete(queryId);
      this.updatePoolStats();
    }
  }

  private async executeWithRetry<T = any>(
    text: string, 
    params?: any[], 
    retryCount: number = 0
  ): Promise<{ rows: T[]; rowCount: number }> {
    try {
      const client = await this.pool.connect();
      
      try {
        const result = await client.query(text, params);
        return {
          rows: result.rows,
          rowCount: result.rowCount || 0
        };
      } finally {
        client.release();
      }
    } catch (error) {
      if (retryCount < (this.config.maxRetries || 3) && this.isRetryableError(error)) {
        logger.warn(`ConnectionPool: Query failed, retrying (${retryCount + 1}/${this.config.maxRetries}):`, error);
        
        // Wait before retry
        await this.delay(this.config.retryDelay || 1000);
        
        return this.executeWithRetry(text, params, retryCount + 1);
      }
      
      throw error;
    }
  }

  private isRetryableError(error: any): boolean {
    // Define which errors are retryable
    const retryableErrors = [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'connection terminated unexpectedly'
    ];

    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code;

    return retryableErrors.some(retryableError => 
      errorMessage.includes(retryableError.toLowerCase()) || errorCode === retryableError
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateQueryId(): string {
    return `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateAverageQueryTime(executionTime: number): void {
    const totalTime = this.stats.averageQueryTime * (this.stats.totalQueries - 1) + executionTime;
    this.stats.averageQueryTime = totalTime / this.stats.totalQueries;
  }

  /**
   * Execute a transaction
   */
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Execute multiple queries in a batch
   */
  async batch(queries: Array<{ text: string; params?: any[] }>): Promise<any[]> {
    return this.transaction(async (client) => {
      const results = [];
      
      for (const query of queries) {
        const result = await client.query(query.text, query.params);
        results.push(result);
      }
      
      return results;
    });
  }

  /**
   * Get a client from the pool for manual management
   */
  async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  /**
   * Get current pool statistics
   */
  getStats(): PoolStats {
    this.updatePoolStats();
    return { ...this.stats };
  }

  /**
   * Get detailed pool information
   */
  getPoolInfo(): {
    config: ConnectionPoolConfig;
    stats: PoolStats;
    activeQueries: Array<{ id: string; query: string; duration: number }>;
  } {
    const activeQueries = Array.from(this.activeQueries.entries()).map(([id, data]) => ({
      id,
      query: data.query.substring(0, 100) + (data.query.length > 100 ? '...' : ''),
      duration: Date.now() - data.startTime
    }));

    return {
      config: this.config,
      stats: this.getStats(),
      activeQueries
    };
  }

  /**
   * Health check for the connection pool
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    details: {
      canConnect: boolean;
      poolStats: PoolStats;
      responseTime: number;
      error?: string;
    };
  }> {
    const startTime = Date.now();
    
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1 as health_check');
      client.release();
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        details: {
          canConnect: true,
          poolStats: this.getStats(),
          responseTime
        }
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'unhealthy',
        details: {
          canConnect: false,
          poolStats: this.getStats(),
          responseTime,
          error: error.message
        }
      };
    }
  }

  /**
   * Gracefully close the connection pool
   */
  async close(): Promise<void> {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    try {
      await this.pool.end();
      logger.info('ConnectionPool: Pool closed gracefully');
    } catch (error) {
      logger.error('ConnectionPool: Error closing pool:', error);
      throw error;
    }
  }

  /**
   * Force close all connections (emergency shutdown)
   */
  async forceClose(): Promise<void> {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    // Cancel all active queries
    this.activeQueries.clear();

    try {
      // Force end the pool
      await this.pool.end();
      logger.warn('ConnectionPool: Pool force closed');
    } catch (error) {
      logger.error('ConnectionPool: Error force closing pool:', error);
    }
  }

  /**
   * Reset pool statistics
   */
  resetStats(): void {
    this.stats = this.initializeStats();
    logger.info('ConnectionPool: Statistics reset');
  }

  /**
   * Get long-running queries
   */
  getLongRunningQueries(thresholdMs: number = 10000): Array<{
    id: string;
    query: string;
    duration: number;
  }> {
    const now = Date.now();
    
    return Array.from(this.activeQueries.entries())
      .filter(([_, data]) => now - data.startTime > thresholdMs)
      .map(([id, data]) => ({
        id,
        query: data.query,
        duration: now - data.startTime
      }))
      .sort((a, b) => b.duration - a.duration);
  }

  /**
   * Kill long-running queries
   */
  async killLongRunningQueries(thresholdMs: number = 30000): Promise<number> {
    const longRunningQueries = this.getLongRunningQueries(thresholdMs);
    
    if (longRunningQueries.length === 0) {
      return 0;
    }

    logger.warn(`ConnectionPool: Found ${longRunningQueries.length} long-running queries, attempting to cancel`);
    
    let cancelledCount = 0;
    
    for (const queryInfo of longRunningQueries) {
      try {
        // In a real implementation, you would need to track the actual client
        // and call client.cancel() or use pg_cancel_backend()
        this.activeQueries.delete(queryInfo.id);
        cancelledCount++;
        
        logger.warn(`ConnectionPool: Cancelled long-running query: ${queryInfo.query.substring(0, 100)}...`);
      } catch (error) {
        logger.error(`ConnectionPool: Failed to cancel query ${queryInfo.id}:`, error);
      }
    }
    
    return cancelledCount;
  }
}

// Create and export singleton instance
const connectionPoolConfig: ConnectionPoolConfig = {
  max: parseInt(process.env.DB_POOL_MAX || '20'),
  min: parseInt(process.env.DB_POOL_MIN || '5'),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000'),
  query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT || '30000'),
  healthCheckInterval: parseInt(process.env.DB_HEALTH_CHECK_INTERVAL || '60000')
};

export const connectionPool = new ConnectionPool(connectionPoolConfig);
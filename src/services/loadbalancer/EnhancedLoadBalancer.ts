import { EventEmitter } from 'events';
import { logger } from '../../config/logger';
import { 
  ServerInstance, 
  LoadBalancingStrategy,
  loadBalancingStrategies,
  AdaptiveStrategy,
  ResourceBasedStrategy
} from './LoadBalancerStrategies';

export { ServerInstance } from './LoadBalancerStrategies';

export interface LoadBalancerConfig {
  strategy: string;
  healthCheckInterval: number;
  healthCheckTimeout: number;
  maxRetries: number;
  retryDelay: number;
  enableStickySessions: boolean;
  sessionTimeout: number;
}

export interface LoadBalancerStats {
  totalRequests: number;
  totalFailures: number;
  averageResponseTime: number;
  requestsPerSecond: number;
  activeConnections: number;
  currentStrategy: string;
  serverStats: Map<string, {
    requests: number;
    failures: number;
    averageResponseTime: number;
    currentConnections: number;
    healthStatus: 'healthy' | 'unhealthy' | 'unknown';
    lastHealthCheck: Date;
  }>;
}

export interface StickySession {
  sessionId: string;
  serverId: string;
  createdAt: Date;
  lastAccessed: Date;
  expiresAt: Date;
}

export class EnhancedLoadBalancer extends EventEmitter {
  private servers: Map<string, ServerInstance> = new Map();
  private strategy: LoadBalancingStrategy;
  private config: LoadBalancerConfig;
  private stats: LoadBalancerStats;
  private healthCheckTimer?: NodeJS.Timeout;
  private isHealthCheckRunning = false;
  private stickySessions: Map<string, StickySession> = new Map();
  private sessionCleanupTimer?: NodeJS.Timeout;
  private requestHistory: { timestamp: number; serverId: string; responseTime: number; success: boolean }[] = [];

  constructor(config: Partial<LoadBalancerConfig> = {}) {
    super();
    
    this.config = {
      strategy: 'round-robin',
      healthCheckInterval: 30000,
      healthCheckTimeout: 5000,
      maxRetries: 3,
      retryDelay: 1000,
      enableStickySessions: false,
      sessionTimeout: 1800000, // 30 minutes
      ...config
    };

    this.strategy = this.createStrategy(this.config.strategy);
    
    this.stats = {
      totalRequests: 0,
      totalFailures: 0,
      averageResponseTime: 0,
      requestsPerSecond: 0,
      activeConnections: 0,
      currentStrategy: this.config.strategy,
      serverStats: new Map()
    };

    // Start session cleanup if sticky sessions are enabled
    if (this.config.enableStickySessions) {
      this.startSessionCleanup();
    }
  }

  /**
   * Create load balancing strategy instance
   */
  private createStrategy(strategyName: string): LoadBalancingStrategy {
    const StrategyClass = loadBalancingStrategies[strategyName as keyof typeof loadBalancingStrategies];
    if (!StrategyClass) {
      logger.warn(`LoadBalancer: Unknown strategy ${strategyName}, falling back to round-robin`);
      return new loadBalancingStrategies['round-robin']();
    }
    return new StrategyClass();
  }

  /**
   * Change load balancing strategy
   */
  setStrategy(strategyName: string): boolean {
    try {
      const newStrategy = this.createStrategy(strategyName);
      
      // Transfer metrics to new strategy
      this.servers.forEach((server, serverId) => {
        newStrategy.updateServerMetrics(serverId, server);
      });

      this.strategy = newStrategy;
      this.config.strategy = strategyName;
      this.stats.currentStrategy = strategyName;

      logger.info(`LoadBalancer: Changed strategy to ${strategyName}`);
      this.emit('strategyChanged', strategyName);
      return true;
    } catch (error) {
      logger.error(`LoadBalancer: Failed to change strategy to ${strategyName}:`, error);
      return false;
    }
  }

  /**
   * Add a server to the load balancer
   */
  addServer(server: Omit<ServerInstance, 'healthy' | 'currentConnections' | 'lastHealthCheck'>): void {
    const serverInstance: ServerInstance = {
      ...server,
      healthy: true,
      currentConnections: 0,
      lastHealthCheck: new Date(),
      metadata: server.metadata || {}
    };

    this.servers.set(server.id, serverInstance);
    this.stats.serverStats.set(server.id, {
      requests: 0,
      failures: 0,
      averageResponseTime: 0,
      currentConnections: 0,
      healthStatus: 'unknown',
      lastHealthCheck: new Date()
    });

    // Update strategy with new server
    this.strategy.updateServerMetrics(server.id, serverInstance);

    logger.info(`LoadBalancer: Added server ${server.id} (${server.host}:${server.port})`);
    this.emit('serverAdded', serverInstance);
  }

  /**
   * Remove a server from the load balancer
   */
  removeServer(serverId: string): boolean {
    const removed = this.servers.delete(serverId);
    this.stats.serverStats.delete(serverId);
    
    // Remove sticky sessions for this server
    for (const [sessionId, session] of this.stickySessions.entries()) {
      if (session.serverId === serverId) {
        this.stickySessions.delete(sessionId);
      }
    }
    
    if (removed) {
      logger.info(`LoadBalancer: Removed server ${serverId}`);
      this.emit('serverRemoved', serverId);
    }
    
    return removed;
  }

  /**
   * Get the next available server using configured strategy
   */
  getNextServer(request?: any): ServerInstance | null {
    // Check for sticky session first
    if (this.config.enableStickySessions && request?.sessionId) {
      const session = this.stickySessions.get(request.sessionId);
      if (session && session.expiresAt > new Date()) {
        const server = this.servers.get(session.serverId);
        if (server && server.healthy) {
          // Update session last accessed time
          session.lastAccessed = new Date();
          return server;
        } else {
          // Remove invalid session
          this.stickySessions.delete(request.sessionId);
        }
      }
    }

    // Use load balancing strategy
    const server = this.strategy.selectServer(Array.from(this.servers.values()), request);
    
    if (!server) {
      logger.warn('LoadBalancer: No healthy servers available');
      return null;
    }

    // Create sticky session if enabled
    if (this.config.enableStickySessions && request?.sessionId) {
      const expiresAt = new Date(Date.now() + this.config.sessionTimeout);
      this.stickySessions.set(request.sessionId, {
        sessionId: request.sessionId,
        serverId: server.id,
        createdAt: new Date(),
        lastAccessed: new Date(),
        expiresAt
      });
    }

    return server;
  }

  /**
   * Record a request to a server
   */
  recordRequest(serverId: string, responseTime: number, success: boolean = true): void {
    const server = this.servers.get(serverId);
    const serverStats = this.stats.serverStats.get(serverId);
    
    if (!server || !serverStats) {
      return;
    }

    // Record in history for rate calculation
    this.requestHistory.push({
      timestamp: Date.now(),
      serverId,
      responseTime,
      success
    });

    // Keep only last 5 minutes of history
    const fiveMinutesAgo = Date.now() - 300000;
    this.requestHistory = this.requestHistory.filter(req => req.timestamp > fiveMinutesAgo);

    // Update global stats
    this.stats.totalRequests++;
    if (!success) {
      this.stats.totalFailures++;
    }

    // Update server stats
    serverStats.requests++;
    if (!success) {
      serverStats.failures++;
    }

    // Update response times
    const totalResponseTime = serverStats.averageResponseTime * (serverStats.requests - 1);
    serverStats.averageResponseTime = (totalResponseTime + responseTime) / serverStats.requests;

    const globalTotalResponseTime = this.stats.averageResponseTime * (this.stats.totalRequests - 1);
    this.stats.averageResponseTime = (globalTotalResponseTime + responseTime) / this.stats.totalRequests;

    // Update server response time and metrics
    server.responseTime = serverStats.averageResponseTime;
    this.strategy.updateServerMetrics(serverId, { responseTime });

    // Update resource-based strategy if applicable
    if (this.strategy instanceof ResourceBasedStrategy) {
      // Simulate CPU and memory metrics (in production, get from monitoring)
      const cpuUsage = 20 + Math.random() * 60; // 20-80%
      const memoryUsage = 30 + Math.random() * 50; // 30-80%
      this.strategy.updateResourceMetrics(serverId, cpuUsage, memoryUsage);
    }

    this.emit('requestRecorded', { serverId, responseTime, success });
  }

  /**
   * Update server connection count
   */
  updateServerConnections(serverId: string, connections: number): void {
    const server = this.servers.get(serverId);
    const serverStats = this.stats.serverStats.get(serverId);
    
    if (server && serverStats) {
      server.currentConnections = connections;
      serverStats.currentConnections = connections;
      
      // Update strategy with connection info
      this.strategy.updateServerMetrics(serverId, { currentConnections: connections });
      
      // Update total active connections
      this.stats.activeConnections = Array.from(this.servers.values())
        .reduce((total, s) => total + s.currentConnections, 0);
    }
  }

  /**
   * Start health checks for all servers
   */
  startHealthChecks(): void {
    if (this.isHealthCheckRunning) {
      logger.warn('LoadBalancer: Health checks already running');
      return;
    }

    this.isHealthCheckRunning = true;
    this.healthCheckTimer = setInterval(() => {
      this.performHealthChecks();
    }, this.config.healthCheckInterval);

    logger.info(`LoadBalancer: Started health checks with ${this.config.healthCheckInterval}ms interval`);
    this.emit('healthChecksStarted');
  }

  /**
   * Stop health checks
   */
  stopHealthChecks(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
    
    this.isHealthCheckRunning = false;
    logger.info('LoadBalancer: Stopped health checks');
    this.emit('healthChecksStopped');
  }

  /**
   * Perform health checks on all servers
   */
  private async performHealthChecks(): Promise<void> {
    const healthCheckPromises = Array.from(this.servers.values()).map(server => 
      this.checkServerHealth(server)
    );

    await Promise.allSettled(healthCheckPromises);
  }

  /**
   * Check health of a single server with retries
   */
  private async checkServerHealth(server: ServerInstance): Promise<void> {
    let attempts = 0;
    let isHealthy = false;
    let responseTime = 0;

    while (attempts < this.config.maxRetries && !isHealthy) {
      try {
        const startTime = Date.now();
        isHealthy = await this.performHealthCheck(server);
        responseTime = Date.now() - startTime;
        
        if (!isHealthy && attempts < this.config.maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
        }
      } catch (error) {
        logger.error(`LoadBalancer: Health check attempt ${attempts + 1} failed for server ${server.id}:`, error);
      }
      
      attempts++;
    }

    const wasHealthy = server.healthy;
    server.healthy = isHealthy;
    server.lastHealthCheck = new Date();
    
    if (isHealthy) {
      server.responseTime = responseTime;
    }

    // Update server stats
    const serverStats = this.stats.serverStats.get(server.id);
    if (serverStats) {
      serverStats.healthStatus = isHealthy ? 'healthy' : 'unhealthy';
      serverStats.lastHealthCheck = new Date();
    }

    // Emit events for health status changes
    if (wasHealthy !== isHealthy) {
      if (isHealthy) {
        logger.info(`LoadBalancer: Server ${server.id} is now healthy (${attempts} attempts)`);
        this.emit('serverHealthy', server);
      } else {
        logger.warn(`LoadBalancer: Server ${server.id} is now unhealthy after ${attempts} attempts`);
        this.emit('serverUnhealthy', server);
      }
    }
  }

  /**
   * Perform actual health check (can be overridden)
   */
  private async performHealthCheck(server: ServerInstance): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Health check timeout'));
      }, this.config.healthCheckTimeout);

      // Simulate health check - in real implementation, make HTTP request
      setTimeout(() => {
        clearTimeout(timeout);
        // Simulate 95% success rate
        resolve(Math.random() > 0.05);
      }, 50 + Math.random() * 100);
    });
  }

  /**
   * Start sticky session cleanup
   */
  private startSessionCleanup(): void {
    this.sessionCleanupTimer = setInterval(() => {
      const now = new Date();
      for (const [sessionId, session] of this.stickySessions.entries()) {
        if (session.expiresAt < now) {
          this.stickySessions.delete(sessionId);
        }
      }
    }, 60000); // Cleanup every minute
  }

  /**
   * Get all servers
   */
  getServers(): ServerInstance[] {
    return Array.from(this.servers.values());
  }

  /**
   * Get healthy servers only
   */
  getHealthyServers(): ServerInstance[] {
    return Array.from(this.servers.values()).filter(server => server.healthy);
  }

  /**
   * Get load balancer statistics
   */
  getStats(): LoadBalancerStats {
    // Calculate requests per second from recent history
    const oneMinuteAgo = Date.now() - 60000;
    const recentRequests = this.requestHistory.filter(req => req.timestamp > oneMinuteAgo);
    this.stats.requestsPerSecond = recentRequests.length / 60; // requests per second

    // Update current strategy name for adaptive strategy
    if (this.strategy instanceof AdaptiveStrategy) {
      this.stats.currentStrategy = `adaptive (${this.strategy.getCurrentStrategyName()})`;
    }
    
    return { ...this.stats };
  }

  /**
   * Get detailed server statistics
   */
  getDetailedStats(): any {
    const stats = this.getStats();
    
    return {
      ...stats,
      servers: Array.from(this.servers.values()).map(server => ({
        ...server,
        stats: this.stats.serverStats.get(server.id)
      })),
      stickySessions: this.config.enableStickySessions ? {
        total: this.stickySessions.size,
        sessions: Array.from(this.stickySessions.values())
      } : null,
      requestHistory: this.requestHistory.slice(-100), // Last 100 requests
      config: this.config
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      totalFailures: 0,
      averageResponseTime: 0,
      requestsPerSecond: 0,
      activeConnections: 0,
      currentStrategy: this.config.strategy,
      serverStats: new Map()
    };

    // Reinitialize server stats
    this.servers.forEach((_, serverId) => {
      this.stats.serverStats.set(serverId, {
        requests: 0,
        failures: 0,
        averageResponseTime: 0,
        currentConnections: 0,
        healthStatus: 'unknown',
        lastHealthCheck: new Date()
      });
    });

    this.requestHistory = [];

    logger.info('LoadBalancer: Statistics reset');
    this.emit('statsReset');
  }

  /**
   * Get server by ID
   */
  getServer(serverId: string): ServerInstance | undefined {
    return this.servers.get(serverId);
  }

  /**
   * Update server weight
   */
  updateServerWeight(serverId: string, weight: number): boolean {
    const server = this.servers.get(serverId);
    if (server) {
      server.weight = weight;
      this.strategy.updateServerMetrics(serverId, { weight });
      logger.info(`LoadBalancer: Updated weight for server ${serverId} to ${weight}`);
      this.emit('serverWeightUpdated', { serverId, weight });
      return true;
    }
    return false;
  }

  /**
   * Update server max connections
   */
  updateServerMaxConnections(serverId: string, maxConnections: number): boolean {
    const server = this.servers.get(serverId);
    if (server) {
      server.maxConnections = maxConnections;
      this.strategy.updateServerMetrics(serverId, { maxConnections });
      logger.info(`LoadBalancer: Updated max connections for server ${serverId} to ${maxConnections}`);
      this.emit('serverMaxConnectionsUpdated', { serverId, maxConnections });
      return true;
    }
    return false;
  }

  /**
   * Force server health status
   */
  setServerHealth(serverId: string, healthy: boolean): boolean {
    const server = this.servers.get(serverId);
    if (server) {
      const wasHealthy = server.healthy;
      server.healthy = healthy;
      server.lastHealthCheck = new Date();

      const serverStats = this.stats.serverStats.get(serverId);
      if (serverStats) {
        serverStats.healthStatus = healthy ? 'healthy' : 'unhealthy';
        serverStats.lastHealthCheck = new Date();
      }

      if (wasHealthy !== healthy) {
        logger.info(`LoadBalancer: Manually set server ${serverId} health to ${healthy ? 'healthy' : 'unhealthy'}`);
        this.emit(healthy ? 'serverHealthy' : 'serverUnhealthy', server);
      }
      
      return true;
    }
    return false;
  }

  /**
   * Get configuration
   */
  getConfig(): LoadBalancerConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<LoadBalancerConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };

    // Handle strategy change
    if (newConfig.strategy && newConfig.strategy !== oldConfig.strategy) {
      this.setStrategy(newConfig.strategy);
    }

    // Handle sticky sessions change
    if (newConfig.enableStickySessions !== oldConfig.enableStickySessions) {
      if (newConfig.enableStickySessions && !oldConfig.enableStickySessions) {
        this.startSessionCleanup();
      } else if (!newConfig.enableStickySessions && oldConfig.enableStickySessions) {
        if (this.sessionCleanupTimer) {
          clearInterval(this.sessionCleanupTimer);
          this.sessionCleanupTimer = undefined;
        }
        this.stickySessions.clear();
      }
    }

    // Restart health checks if interval changed
    if (newConfig.healthCheckInterval && newConfig.healthCheckInterval !== oldConfig.healthCheckInterval) {
      if (this.isHealthCheckRunning) {
        this.stopHealthChecks();
        this.startHealthChecks();
      }
    }

    logger.info('LoadBalancer: Configuration updated');
    this.emit('configUpdated', this.config);
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopHealthChecks();
    
    if (this.sessionCleanupTimer) {
      clearInterval(this.sessionCleanupTimer);
      this.sessionCleanupTimer = undefined;
    }
    
    this.servers.clear();
    this.stats.serverStats.clear();
    this.stickySessions.clear();
    this.requestHistory = [];
    
    logger.info('LoadBalancer: Destroyed');
  }
}

// Export singleton instance
export const enhancedLoadBalancer = new EnhancedLoadBalancer();
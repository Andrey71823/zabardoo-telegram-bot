import { EventEmitter } from 'events';
import { logger } from '../../config/logger';

export interface ServiceInstance {
  id: string;
  host: string;
  port: number;
  protocol: 'http' | 'https';
  weight: number;
  status: 'healthy' | 'unhealthy' | 'draining';
  healthCheckUrl?: string;
  metadata?: Record<string, any>;
  lastHealthCheck?: Date;
  responseTime?: number;
  activeConnections: number;
  totalRequests: number;
  failedRequests: number;
  createdAt: Date;
}

export interface LoadBalancerConfig {
  algorithm: 'round-robin' | 'weighted-round-robin' | 'least-connections' | 'ip-hash' | 'random';
  healthCheck: {
    enabled: boolean;
    interval: number; // milliseconds
    timeout: number; // milliseconds
    retries: number;
    path: string;
    expectedStatus?: number[];
  };
  failover: {
    enabled: boolean;
    maxFailures: number;
    recoveryTime: number; // milliseconds
  };
  sticky: {
    enabled: boolean;
    cookieName?: string;
    sessionTimeout?: number; // milliseconds
  };
}

export interface LoadBalancerStats {
  totalRequests: number;
  totalFailures: number;
  averageResponseTime: number;
  activeConnections: number;
  healthyInstances: number;
  unhealthyInstances: number;
  requestsPerSecond: number;
  uptime: number;
}

export class LoadBalancer extends EventEmitter {
  private instances: Map<string, ServiceInstance> = new Map();
  private config: LoadBalancerConfig;
  private stats: LoadBalancerStats;
  private healthCheckTimer?: NodeJS.Timeout;
  private roundRobinIndex: number = 0;
  private stickySessionMap: Map<string, string> = new Map();
  private requestHistory: Array<{ timestamp: number; responseTime: number }> = [];
  private startTime: number = Date.now();

  constructor(config: LoadBalancerConfig) {
    super();
    this.config = {
      algorithm: 'round-robin',
      healthCheck: {
        enabled: true,
        interval: 30000, // 30 seconds
        timeout: 5000, // 5 seconds
        retries: 3,
        path: '/health',
        expectedStatus: [200]
      },
      failover: {
        enabled: true,
        maxFailures: 3,
        recoveryTime: 60000 // 1 minute
      },
      sticky: {
        enabled: false,
        cookieName: 'lb-session',
        sessionTimeout: 3600000 // 1 hour
      },
      ...config
    };

    this.stats = this.initializeStats();
    this.startHealthChecks();
  }

  private initializeStats(): LoadBalancerStats {
    return {
      totalRequests: 0,
      totalFailures: 0,
      averageResponseTime: 0,
      activeConnections: 0,
      healthyInstances: 0,
      unhealthyInstances: 0,
      requestsPerSecond: 0,
      uptime: 0
    };
  }

  /**
   * Add a service instance to the load balancer
   */
  addInstance(instance: Omit<ServiceInstance, 'id' | 'activeConnections' | 'totalRequests' | 'failedRequests' | 'createdAt'>): string {
    const id = this.generateInstanceId();
    const serviceInstance: ServiceInstance = {
      ...instance,
      id,
      activeConnections: 0,
      totalRequests: 0,
      failedRequests: 0,
      createdAt: new Date()
    };

    this.instances.set(id, serviceInstance);
    this.updateStats();
    
    logger.info(`LoadBalancer: Added instance ${id} (${instance.host}:${instance.port})`);
    this.emit('instanceAdded', serviceInstance);
    
    return id;
  }

  /**
   * Remove a service instance from the load balancer
   */
  removeInstance(instanceId: string): boolean {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      return false;
    }

    // Mark as draining first to allow existing connections to complete
    instance.status = 'draining';
    
    // Remove after a delay to allow graceful shutdown
    setTimeout(() => {
      this.instances.delete(instanceId);
      this.updateStats();
      logger.info(`LoadBalancer: Removed instance ${instanceId}`);
      this.emit('instanceRemoved', instance);
    }, 5000);

    return true;
  }

  /**
   * Get the next available instance based on the load balancing algorithm
   */
  getNextInstance(clientId?: string): ServiceInstance | null {
    const healthyInstances = Array.from(this.instances.values())
      .filter(instance => instance.status === 'healthy');

    if (healthyInstances.length === 0) {
      logger.warn('LoadBalancer: No healthy instances available');
      return null;
    }

    // Handle sticky sessions
    if (this.config.sticky.enabled && clientId) {
      const stickyInstanceId = this.stickySessionMap.get(clientId);
      if (stickyInstanceId) {
        const stickyInstance = this.instances.get(stickyInstanceId);
        if (stickyInstance && stickyInstance.status === 'healthy') {
          return stickyInstance;
        } else {
          // Remove invalid sticky session
          this.stickySessionMap.delete(clientId);
        }
      }
    }

    let selectedInstance: ServiceInstance;

    switch (this.config.algorithm) {
      case 'round-robin':
        selectedInstance = this.roundRobinSelection(healthyInstances);
        break;
      case 'weighted-round-robin':
        selectedInstance = this.weightedRoundRobinSelection(healthyInstances);
        break;
      case 'least-connections':
        selectedInstance = this.leastConnectionsSelection(healthyInstances);
        break;
      case 'ip-hash':
        selectedInstance = this.ipHashSelection(healthyInstances, clientId || '');
        break;
      case 'random':
        selectedInstance = this.randomSelection(healthyInstances);
        break;
      default:
        selectedInstance = this.roundRobinSelection(healthyInstances);
    }

    // Set sticky session if enabled
    if (this.config.sticky.enabled && clientId) {
      this.stickySessionMap.set(clientId, selectedInstance.id);
      
      // Clean up expired sessions
      setTimeout(() => {
        this.stickySessionMap.delete(clientId);
      }, this.config.sticky.sessionTimeout || 3600000);
    }

    return selectedInstance;
  }

  private roundRobinSelection(instances: ServiceInstance[]): ServiceInstance {
    const instance = instances[this.roundRobinIndex % instances.length];
    this.roundRobinIndex = (this.roundRobinIndex + 1) % instances.length;
    return instance;
  }

  private weightedRoundRobinSelection(instances: ServiceInstance[]): ServiceInstance {
    const totalWeight = instances.reduce((sum, instance) => sum + instance.weight, 0);
    let randomWeight = Math.random() * totalWeight;
    
    for (const instance of instances) {
      randomWeight -= instance.weight;
      if (randomWeight <= 0) {
        return instance;
      }
    }
    
    return instances[0]; // Fallback
  }

  private leastConnectionsSelection(instances: ServiceInstance[]): ServiceInstance {
    return instances.reduce((min, instance) => 
      instance.activeConnections < min.activeConnections ? instance : min
    );
  }

  private ipHashSelection(instances: ServiceInstance[], clientId: string): ServiceInstance {
    const hash = this.simpleHash(clientId);
    const index = hash % instances.length;
    return instances[index];
  }

  private randomSelection(instances: ServiceInstance[]): ServiceInstance {
    const index = Math.floor(Math.random() * instances.length);
    return instances[index];
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Record a request to an instance
   */
  recordRequest(instanceId: string, responseTime: number, success: boolean): void {
    const instance = this.instances.get(instanceId);
    if (!instance) return;

    instance.totalRequests++;
    instance.responseTime = responseTime;
    
    if (!success) {
      instance.failedRequests++;
      this.handleInstanceFailure(instance);
    }

    // Update global stats
    this.stats.totalRequests++;
    if (!success) {
      this.stats.totalFailures++;
    }

    // Track request history for RPS calculation
    this.requestHistory.push({ timestamp: Date.now(), responseTime });
    
    // Keep only last minute of history
    const oneMinuteAgo = Date.now() - 60000;
    this.requestHistory = this.requestHistory.filter(req => req.timestamp > oneMinuteAgo);

    this.updateStats();
  }

  /**
   * Record connection start/end
   */
  recordConnection(instanceId: string, increment: boolean): void {
    const instance = this.instances.get(instanceId);
    if (!instance) return;

    if (increment) {
      instance.activeConnections++;
      this.stats.activeConnections++;
    } else {
      instance.activeConnections = Math.max(0, instance.activeConnections - 1);
      this.stats.activeConnections = Math.max(0, this.stats.activeConnections - 1);
    }
  }

  private handleInstanceFailure(instance: ServiceInstance): void {
    if (!this.config.failover.enabled) return;

    const failureRate = instance.failedRequests / instance.totalRequests;
    const recentFailures = instance.failedRequests; // Simplified - should track recent failures

    if (recentFailures >= this.config.failover.maxFailures) {
      logger.warn(`LoadBalancer: Marking instance ${instance.id} as unhealthy due to failures`);
      instance.status = 'unhealthy';
      this.emit('instanceUnhealthy', instance);

      // Schedule recovery check
      setTimeout(() => {
        if (instance.status === 'unhealthy') {
          logger.info(`LoadBalancer: Attempting to recover instance ${instance.id}`);
          this.performHealthCheck(instance);
        }
      }, this.config.failover.recoveryTime);
    }
  }

  /**
   * Start health checks for all instances
   */
  private startHealthChecks(): void {
    if (!this.config.healthCheck.enabled) return;

    this.healthCheckTimer = setInterval(() => {
      this.performHealthChecks();
    }, this.config.healthCheck.interval);

    logger.info('LoadBalancer: Health checks started');
  }

  private async performHealthChecks(): Promise<void> {
    const promises = Array.from(this.instances.values()).map(instance => 
      this.performHealthCheck(instance)
    );

    await Promise.allSettled(promises);
    this.updateStats();
  }

  private async performHealthCheck(instance: ServiceInstance): Promise<void> {
    const url = instance.healthCheckUrl || 
      `${instance.protocol}://${instance.host}:${instance.port}${this.config.healthCheck.path}`;

    const startTime = Date.now();
    let isHealthy = false;

    try {
      // Use fetch or http client to check health
      const response = await this.makeHealthCheckRequest(url);
      const responseTime = Date.now() - startTime;
      
      const expectedStatuses = this.config.healthCheck.expectedStatus || [200];
      isHealthy = expectedStatuses.includes(response.status);
      
      instance.responseTime = responseTime;
      instance.lastHealthCheck = new Date();

      if (isHealthy && instance.status === 'unhealthy') {
        logger.info(`LoadBalancer: Instance ${instance.id} recovered`);
        instance.status = 'healthy';
        instance.failedRequests = 0; // Reset failure count
        this.emit('instanceRecovered', instance);
      } else if (!isHealthy && instance.status === 'healthy') {
        logger.warn(`LoadBalancer: Instance ${instance.id} failed health check`);
        instance.status = 'unhealthy';
        this.emit('instanceUnhealthy', instance);
      }

    } catch (error) {
      logger.error(`LoadBalancer: Health check failed for instance ${instance.id}:`, error);
      if (instance.status === 'healthy') {
        instance.status = 'unhealthy';
        this.emit('instanceUnhealthy', instance);
      }
    }
  }

  private async makeHealthCheckRequest(url: string): Promise<{ status: number }> {
    // Simplified health check - in real implementation use fetch or axios
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Health check timeout'));
      }, this.config.healthCheck.timeout);

      // Simulate health check
      setTimeout(() => {
        clearTimeout(timeout);
        resolve({ status: 200 });
      }, Math.random() * 100);
    });
  }

  /**
   * Update load balancer statistics
   */
  private updateStats(): void {
    const instances = Array.from(this.instances.values());
    
    this.stats.healthyInstances = instances.filter(i => i.status === 'healthy').length;
    this.stats.unhealthyInstances = instances.filter(i => i.status === 'unhealthy').length;
    
    // Calculate average response time
    const responseTimes = instances
      .filter(i => i.responseTime !== undefined)
      .map(i => i.responseTime!);
    
    if (responseTimes.length > 0) {
      this.stats.averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    }

    // Calculate requests per second
    const now = Date.now();
    const recentRequests = this.requestHistory.filter(req => now - req.timestamp <= 1000);
    this.stats.requestsPerSecond = recentRequests.length;

    // Calculate uptime
    this.stats.uptime = Date.now() - this.startTime;
  }

  /**
   * Get current load balancer statistics
   */
  getStats(): LoadBalancerStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * Get all instances with their current status
   */
  getInstances(): ServiceInstance[] {
    return Array.from(this.instances.values());
  }

  /**
   * Get healthy instances only
   */
  getHealthyInstances(): ServiceInstance[] {
    return Array.from(this.instances.values())
      .filter(instance => instance.status === 'healthy');
  }

  /**
   * Update instance configuration
   */
  updateInstance(instanceId: string, updates: Partial<ServiceInstance>): boolean {
    const instance = this.instances.get(instanceId);
    if (!instance) return false;

    Object.assign(instance, updates);
    logger.info(`LoadBalancer: Updated instance ${instanceId}`);
    this.emit('instanceUpdated', instance);
    
    return true;
  }

  /**
   * Drain an instance (stop sending new requests but allow existing to complete)
   */
  drainInstance(instanceId: string): boolean {
    const instance = this.instances.get(instanceId);
    if (!instance) return false;

    instance.status = 'draining';
    logger.info(`LoadBalancer: Draining instance ${instanceId}`);
    this.emit('instanceDraining', instance);
    
    return true;
  }

  /**
   * Get load balancer configuration
   */
  getConfig(): LoadBalancerConfig {
    return { ...this.config };
  }

  /**
   * Update load balancer configuration
   */
  updateConfig(updates: Partial<LoadBalancerConfig>): void {
    this.config = { ...this.config, ...updates };
    
    // Restart health checks if configuration changed
    if (updates.healthCheck) {
      this.stopHealthChecks();
      this.startHealthChecks();
    }
    
    logger.info('LoadBalancer: Configuration updated');
    this.emit('configUpdated', this.config);
  }

  /**
   * Stop health checks
   */
  private stopHealthChecks(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
  }

  /**
   * Shutdown the load balancer gracefully
   */
  async shutdown(): Promise<void> {
    logger.info('LoadBalancer: Shutting down...');
    
    this.stopHealthChecks();
    
    // Drain all instances
    for (const instance of this.instances.values()) {
      if (instance.status === 'healthy') {
        instance.status = 'draining';
      }
    }

    // Wait for active connections to complete
    const maxWaitTime = 30000; // 30 seconds
    const startTime = Date.now();
    
    while (this.stats.activeConnections > 0 && Date.now() - startTime < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      this.updateStats();
    }

    this.instances.clear();
    this.stickySessionMap.clear();
    this.requestHistory = [];
    
    logger.info('LoadBalancer: Shutdown complete');
    this.emit('shutdown');
  }

  /**
   * Health check for the load balancer itself
   */
  healthCheck(): {
    status: 'healthy' | 'unhealthy';
    details: {
      totalInstances: number;
      healthyInstances: number;
      unhealthyInstances: number;
      stats: LoadBalancerStats;
    };
  } {
    const stats = this.getStats();
    const isHealthy = stats.healthyInstances > 0;

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      details: {
        totalInstances: this.instances.size,
        healthyInstances: stats.healthyInstances,
        unhealthyInstances: stats.unhealthyInstances,
        stats
      }
    };
  }

  private generateInstanceId(): string {
    return `instance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance for global use
export const loadBalancer = new LoadBalancer({
  algorithm: 'least-connections',
  healthCheck: {
    enabled: true,
    interval: 30000,
    timeout: 5000,
    retries: 3,
    path: '/health'
  },
  failover: {
    enabled: true,
    maxFailures: 3,
    recoveryTime: 60000
  },
  sticky: {
    enabled: false
  }
});
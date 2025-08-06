import { logger } from '../../config/logger';

export interface ServerInstance {
  id: string;
  host: string;
  port: number;
  weight: number;
  healthy: boolean;
  currentConnections: number;
  maxConnections: number;
  responseTime: number;
  lastHealthCheck: Date;
  metadata: {
    region?: string;
    zone?: string;
    version?: string;
    capabilities?: string[];
  };
}

export interface LoadBalancingStrategy {
  name: string;
  selectServer(servers: ServerInstance[], request?: any): ServerInstance | null;
  updateServerMetrics(serverId: string, metrics: Partial<ServerInstance>): void;
}

/**
 * Round Robin Load Balancing Strategy
 */
export class RoundRobinStrategy implements LoadBalancingStrategy {
  name = 'round-robin';
  private currentIndex = 0;

  selectServer(servers: ServerInstance[]): ServerInstance | null {
    const healthyServers = servers.filter(server => server.healthy);
    
    if (healthyServers.length === 0) {
      return null;
    }

    const server = healthyServers[this.currentIndex % healthyServers.length];
    this.currentIndex = (this.currentIndex + 1) % healthyServers.length;
    
    return server;
  }

  updateServerMetrics(serverId: string, metrics: Partial<ServerInstance>): void {
    // Round robin doesn't need to track metrics for selection
  }
}

/**
 * Weighted Round Robin Load Balancing Strategy
 */
export class WeightedRoundRobinStrategy implements LoadBalancingStrategy {
  name = 'weighted-round-robin';
  private currentWeights: Map<string, number> = new Map();

  selectServer(servers: ServerInstance[]): ServerInstance | null {
    const healthyServers = servers.filter(server => server.healthy);
    
    if (healthyServers.length === 0) {
      return null;
    }

    // Initialize weights if not set
    healthyServers.forEach(server => {
      if (!this.currentWeights.has(server.id)) {
        this.currentWeights.set(server.id, 0);
      }
    });

    // Find server with highest current weight
    let selectedServer: ServerInstance | null = null;
    let maxWeight = -1;

    for (const server of healthyServers) {
      const currentWeight = this.currentWeights.get(server.id)! + server.weight;
      this.currentWeights.set(server.id, currentWeight);

      if (currentWeight > maxWeight) {
        maxWeight = currentWeight;
        selectedServer = server;
      }
    }

    if (selectedServer) {
      // Reduce selected server's weight by total weight
      const totalWeight = healthyServers.reduce((sum, s) => sum + s.weight, 0);
      const currentWeight = this.currentWeights.get(selectedServer.id)!;
      this.currentWeights.set(selectedServer.id, currentWeight - totalWeight);
    }

    return selectedServer;
  }

  updateServerMetrics(serverId: string, metrics: Partial<ServerInstance>): void {
    // Weighted round robin uses static weights
  }
}

/**
 * Least Connections Load Balancing Strategy
 */
export class LeastConnectionsStrategy implements LoadBalancingStrategy {
  name = 'least-connections';

  selectServer(servers: ServerInstance[]): ServerInstance | null {
    const healthyServers = servers.filter(server => server.healthy);
    
    if (healthyServers.length === 0) {
      return null;
    }

    // Find server with least connections
    return healthyServers.reduce((min, server) => 
      server.currentConnections < min.currentConnections ? server : min
    );
  }

  updateServerMetrics(serverId: string, metrics: Partial<ServerInstance>): void {
    // Metrics are updated externally, strategy just reads them
  }
}

/**
 * Weighted Least Connections Load Balancing Strategy
 */
export class WeightedLeastConnectionsStrategy implements LoadBalancingStrategy {
  name = 'weighted-least-connections';

  selectServer(servers: ServerInstance[]): ServerInstance | null {
    const healthyServers = servers.filter(server => server.healthy);
    
    if (healthyServers.length === 0) {
      return null;
    }

    // Calculate connection ratio (connections / weight) and select minimum
    return healthyServers.reduce((min, server) => {
      const serverRatio = server.currentConnections / server.weight;
      const minRatio = min.currentConnections / min.weight;
      return serverRatio < minRatio ? server : min;
    });
  }

  updateServerMetrics(serverId: string, metrics: Partial<ServerInstance>): void {
    // Metrics are updated externally, strategy just reads them
  }
}

/**
 * Least Response Time Load Balancing Strategy
 */
export class LeastResponseTimeStrategy implements LoadBalancingStrategy {
  name = 'least-response-time';

  selectServer(servers: ServerInstance[]): ServerInstance | null {
    const healthyServers = servers.filter(server => server.healthy);
    
    if (healthyServers.length === 0) {
      return null;
    }

    // Find server with lowest response time
    return healthyServers.reduce((min, server) => 
      server.responseTime < min.responseTime ? server : min
    );
  }

  updateServerMetrics(serverId: string, metrics: Partial<ServerInstance>): void {
    // Response time is updated externally
  }
}

/**
 * IP Hash Load Balancing Strategy
 */
export class IPHashStrategy implements LoadBalancingStrategy {
  name = 'ip-hash';

  selectServer(servers: ServerInstance[], request?: any): ServerInstance | null {
    const healthyServers = servers.filter(server => server.healthy);
    
    if (healthyServers.length === 0) {
      return null;
    }

    // Use client IP to consistently route to same server
    const clientIP = request?.clientIP || request?.ip || '127.0.0.1';
    const hash = this.hashString(clientIP);
    const index = hash % healthyServers.length;
    
    return healthyServers[index];
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  updateServerMetrics(serverId: string, metrics: Partial<ServerInstance>): void {
    // IP hash doesn't use dynamic metrics
  }
}

/**
 * Random Load Balancing Strategy
 */
export class RandomStrategy implements LoadBalancingStrategy {
  name = 'random';

  selectServer(servers: ServerInstance[]): ServerInstance | null {
    const healthyServers = servers.filter(server => server.healthy);
    
    if (healthyServers.length === 0) {
      return null;
    }

    const randomIndex = Math.floor(Math.random() * healthyServers.length);
    return healthyServers[randomIndex];
  }

  updateServerMetrics(serverId: string, metrics: Partial<ServerInstance>): void {
    // Random strategy doesn't use metrics
  }
}

/**
 * Weighted Random Load Balancing Strategy
 */
export class WeightedRandomStrategy implements LoadBalancingStrategy {
  name = 'weighted-random';

  selectServer(servers: ServerInstance[]): ServerInstance | null {
    const healthyServers = servers.filter(server => server.healthy);
    
    if (healthyServers.length === 0) {
      return null;
    }

    const totalWeight = healthyServers.reduce((sum, server) => sum + server.weight, 0);
    let random = Math.random() * totalWeight;

    for (const server of healthyServers) {
      random -= server.weight;
      if (random <= 0) {
        return server;
      }
    }

    // Fallback to last server
    return healthyServers[healthyServers.length - 1];
  }

  updateServerMetrics(serverId: string, metrics: Partial<ServerInstance>): void {
    // Weighted random uses static weights
  }
}

/**
 * Resource-based Load Balancing Strategy
 * Considers CPU, memory, and connection load
 */
export class ResourceBasedStrategy implements LoadBalancingStrategy {
  name = 'resource-based';
  private serverMetrics: Map<string, {
    cpuUsage: number;
    memoryUsage: number;
    connectionRatio: number;
  }> = new Map();

  selectServer(servers: ServerInstance[]): ServerInstance | null {
    const healthyServers = servers.filter(server => server.healthy);
    
    if (healthyServers.length === 0) {
      return null;
    }

    // Calculate resource score for each server (lower is better)
    return healthyServers.reduce((best, server) => {
      const serverScore = this.calculateResourceScore(server);
      const bestScore = this.calculateResourceScore(best);
      return serverScore < bestScore ? server : best;
    });
  }

  private calculateResourceScore(server: ServerInstance): number {
    const metrics = this.serverMetrics.get(server.id);
    if (!metrics) {
      // If no metrics available, use connection ratio only
      return server.currentConnections / server.maxConnections;
    }

    // Weighted combination of resource usage
    const cpuWeight = 0.4;
    const memoryWeight = 0.3;
    const connectionWeight = 0.3;

    return (
      metrics.cpuUsage * cpuWeight +
      metrics.memoryUsage * memoryWeight +
      metrics.connectionRatio * connectionWeight
    );
  }

  updateServerMetrics(serverId: string, metrics: Partial<ServerInstance>): void {
    const currentMetrics = this.serverMetrics.get(serverId) || {
      cpuUsage: 0,
      memoryUsage: 0,
      connectionRatio: 0
    };

    // Update metrics if provided
    if (metrics.currentConnections !== undefined && metrics.maxConnections !== undefined) {
      currentMetrics.connectionRatio = metrics.currentConnections / metrics.maxConnections;
    }

    this.serverMetrics.set(serverId, currentMetrics);
  }

  /**
   * Update CPU and memory metrics for a server
   */
  updateResourceMetrics(serverId: string, cpuUsage: number, memoryUsage: number): void {
    const currentMetrics = this.serverMetrics.get(serverId) || {
      cpuUsage: 0,
      memoryUsage: 0,
      connectionRatio: 0
    };

    currentMetrics.cpuUsage = cpuUsage / 100; // Convert to ratio
    currentMetrics.memoryUsage = memoryUsage / 100; // Convert to ratio

    this.serverMetrics.set(serverId, currentMetrics);
  }
}

/**
 * Adaptive Load Balancing Strategy
 * Dynamically switches between strategies based on conditions
 */
export class AdaptiveStrategy implements LoadBalancingStrategy {
  name = 'adaptive';
  private strategies: Map<string, LoadBalancingStrategy> = new Map();
  private currentStrategy: LoadBalancingStrategy;
  private lastStrategyChange = Date.now();
  private strategyChangeInterval = 60000; // 1 minute

  constructor() {
    // Initialize available strategies
    this.strategies.set('round-robin', new RoundRobinStrategy());
    this.strategies.set('least-connections', new LeastConnectionsStrategy());
    this.strategies.set('least-response-time', new LeastResponseTimeStrategy());
    this.strategies.set('resource-based', new ResourceBasedStrategy());

    // Start with round robin
    this.currentStrategy = this.strategies.get('round-robin')!;
  }

  selectServer(servers: ServerInstance[], request?: any): ServerInstance | null {
    // Adapt strategy based on current conditions
    this.adaptStrategy(servers);
    
    return this.currentStrategy.selectServer(servers, request);
  }

  private adaptStrategy(servers: ServerInstance[]): void {
    const now = Date.now();
    
    // Only change strategy if enough time has passed
    if (now - this.lastStrategyChange < this.strategyChangeInterval) {
      return;
    }

    const healthyServers = servers.filter(server => server.healthy);
    if (healthyServers.length === 0) {
      return;
    }

    // Calculate system metrics
    const avgConnections = healthyServers.reduce((sum, s) => sum + s.currentConnections, 0) / healthyServers.length;
    const avgResponseTime = healthyServers.reduce((sum, s) => sum + s.responseTime, 0) / healthyServers.length;
    const connectionVariance = this.calculateVariance(healthyServers.map(s => s.currentConnections));
    const responseTimeVariance = this.calculateVariance(healthyServers.map(s => s.responseTime));

    let newStrategy: string;

    // Decision logic for strategy selection
    if (avgResponseTime > 1000) {
      // High response times - use least response time
      newStrategy = 'least-response-time';
    } else if (connectionVariance > avgConnections * 0.5) {
      // High connection variance - use least connections
      newStrategy = 'least-connections';
    } else if (responseTimeVariance > avgResponseTime * 0.3) {
      // High response time variance - use resource-based
      newStrategy = 'resource-based';
    } else {
      // Normal conditions - use round robin
      newStrategy = 'round-robin';
    }

    if (newStrategy !== this.currentStrategy.name) {
      this.currentStrategy = this.strategies.get(newStrategy)!;
      this.lastStrategyChange = now;
      
      logger.info(`LoadBalancer: Adapted strategy to ${newStrategy}`);
    }
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  }

  updateServerMetrics(serverId: string, metrics: Partial<ServerInstance>): void {
    // Update metrics for all strategies
    this.strategies.forEach(strategy => {
      strategy.updateServerMetrics(serverId, metrics);
    });
  }

  /**
   * Get current active strategy name
   */
  getCurrentStrategyName(): string {
    return this.currentStrategy.name;
  }
}

// Export all strategies
export const loadBalancingStrategies = {
  'round-robin': RoundRobinStrategy,
  'weighted-round-robin': WeightedRoundRobinStrategy,
  'least-connections': LeastConnectionsStrategy,
  'weighted-least-connections': WeightedLeastConnectionsStrategy,
  'least-response-time': LeastResponseTimeStrategy,
  'ip-hash': IPHashStrategy,
  'random': RandomStrategy,
  'weighted-random': WeightedRandomStrategy,
  'resource-based': ResourceBasedStrategy,
  'adaptive': AdaptiveStrategy
};
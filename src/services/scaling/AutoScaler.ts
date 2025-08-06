import { EventEmitter } from 'events';
import { logger } from '../../config/logger';
import { LoadBalancer, ServiceInstance } from '../loadbalancer/LoadBalancer';

export interface ScalingMetrics {
  cpuUsage: number; // percentage
  memoryUsage: number; // percentage
  requestsPerSecond: number;
  averageResponseTime: number; // milliseconds
  activeConnections: number;
  errorRate: number; // percentage
  queueLength?: number;
}

export interface ScalingRule {
  id: string;
  name: string;
  metric: keyof ScalingMetrics;
  operator: 'greater_than' | 'less_than' | 'equals';
  threshold: number;
  duration: number; // milliseconds - how long condition must persist
  cooldown: number; // milliseconds - minimum time between scaling actions
  action: 'scale_up' | 'scale_down';
  scaleAmount: number; // number of instances to add/remove
  enabled: boolean;
}

export interface AutoScalerConfig {
  minInstances: number;
  maxInstances: number;
  targetInstanceType: string;
  metricsInterval: number; // milliseconds
  evaluationInterval: number; // milliseconds
  scaleUpCooldown: number; // milliseconds
  scaleDownCooldown: number; // milliseconds
  defaultRules: ScalingRule[];
}

export interface ScalingAction {
  id: string;
  timestamp: Date;
  action: 'scale_up' | 'scale_down';
  reason: string;
  ruleId: string;
  instancesChanged: number;
  beforeCount: number;
  afterCount: number;
  metrics: ScalingMetrics;
}

export interface AutoScalerStats {
  currentInstances: number;
  targetInstances: number;
  totalScaleUps: number;
  totalScaleDowns: number;
  lastScalingAction?: Date;
  averageScalingTime: number;
  metricsHistory: Array<{ timestamp: Date; metrics: ScalingMetrics }>;
}

export class AutoScaler extends EventEmitter {
  private config: AutoScalerConfig;
  private loadBalancer: LoadBalancer;
  private rules: Map<string, ScalingRule> = new Map();
  private ruleStates: Map<string, { conditionStartTime?: number; lastTriggered?: number }> = new Map();
  private metricsHistory: Array<{ timestamp: Date; metrics: ScalingMetrics }> = [];
  private scalingHistory: ScalingAction[] = [];
  private metricsTimer?: NodeJS.Timeout;
  private evaluationTimer?: NodeJS.Timeout;
  private isScaling: boolean = false;
  private stats: AutoScalerStats;

  constructor(config: AutoScalerConfig, loadBalancer: LoadBalancer) {
    super();
    this.config = {
      minInstances: 2,
      maxInstances: 10,
      targetInstanceType: 'standard',
      metricsInterval: 10000, // 10 seconds
      evaluationInterval: 30000, // 30 seconds
      scaleUpCooldown: 300000, // 5 minutes
      scaleDownCooldown: 600000, // 10 minutes
      defaultRules: [],
      ...config
    };

    this.loadBalancer = loadBalancer;
    this.stats = this.initializeStats();
    
    // Initialize default rules
    this.initializeDefaultRules();
    
    // Start monitoring
    this.startMonitoring();
  }

  private initializeStats(): AutoScalerStats {
    return {
      currentInstances: 0,
      targetInstances: this.config.minInstances,
      totalScaleUps: 0,
      totalScaleDowns: 0,
      averageScalingTime: 0,
      metricsHistory: []
    };
  }

  private initializeDefaultRules(): void {
    const defaultRules: ScalingRule[] = [
      {
        id: 'high-cpu-scale-up',
        name: 'Scale up on high CPU usage',
        metric: 'cpuUsage',
        operator: 'greater_than',
        threshold: 80,
        duration: 120000, // 2 minutes
        cooldown: 300000, // 5 minutes
        action: 'scale_up',
        scaleAmount: 1,
        enabled: true
      },
      {
        id: 'low-cpu-scale-down',
        name: 'Scale down on low CPU usage',
        metric: 'cpuUsage',
        operator: 'less_than',
        threshold: 20,
        duration: 600000, // 10 minutes
        cooldown: 600000, // 10 minutes
        action: 'scale_down',
        scaleAmount: 1,
        enabled: true
      },
      {
        id: 'high-memory-scale-up',
        name: 'Scale up on high memory usage',
        metric: 'memoryUsage',
        operator: 'greater_than',
        threshold: 85,
        duration: 180000, // 3 minutes
        cooldown: 300000, // 5 minutes
        action: 'scale_up',
        scaleAmount: 1,
        enabled: true
      },
      {
        id: 'high-response-time-scale-up',
        name: 'Scale up on high response time',
        metric: 'averageResponseTime',
        operator: 'greater_than',
        threshold: 2000, // 2 seconds
        duration: 60000, // 1 minute
        cooldown: 300000, // 5 minutes
        action: 'scale_up',
        scaleAmount: 2,
        enabled: true
      },
      {
        id: 'high-error-rate-scale-up',
        name: 'Scale up on high error rate',
        metric: 'errorRate',
        operator: 'greater_than',
        threshold: 5, // 5%
        duration: 60000, // 1 minute
        cooldown: 300000, // 5 minutes
        action: 'scale_up',
        scaleAmount: 1,
        enabled: true
      }
    ];

    // Add default rules and any custom rules from config
    [...defaultRules, ...this.config.defaultRules].forEach(rule => {
      this.addRule(rule);
    });
  }

  /**
   * Add a scaling rule
   */
  addRule(rule: ScalingRule): void {
    this.rules.set(rule.id, rule);
    this.ruleStates.set(rule.id, {});
    logger.info(`AutoScaler: Added rule ${rule.id}: ${rule.name}`);
    this.emit('ruleAdded', rule);
  }

  /**
   * Remove a scaling rule
   */
  removeRule(ruleId: string): boolean {
    const removed = this.rules.delete(ruleId);
    this.ruleStates.delete(ruleId);
    
    if (removed) {
      logger.info(`AutoScaler: Removed rule ${ruleId}`);
      this.emit('ruleRemoved', ruleId);
    }
    
    return removed;
  }

  /**
   * Update a scaling rule
   */
  updateRule(ruleId: string, updates: Partial<ScalingRule>): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;

    Object.assign(rule, updates);
    logger.info(`AutoScaler: Updated rule ${ruleId}`);
    this.emit('ruleUpdated', rule);
    
    return true;
  }

  /**
   * Enable or disable a rule
   */
  toggleRule(ruleId: string, enabled: boolean): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;

    rule.enabled = enabled;
    
    // Reset rule state when disabled
    if (!enabled) {
      this.ruleStates.set(ruleId, {});
    }
    
    logger.info(`AutoScaler: ${enabled ? 'Enabled' : 'Disabled'} rule ${ruleId}`);
    this.emit('ruleToggled', { ruleId, enabled });
    
    return true;
  }

  /**
   * Start monitoring and evaluation
   */
  private startMonitoring(): void {
    // Start metrics collection
    this.metricsTimer = setInterval(() => {
      this.collectMetrics();
    }, this.config.metricsInterval);

    // Start rule evaluation
    this.evaluationTimer = setInterval(() => {
      this.evaluateRules();
    }, this.config.evaluationInterval);

    logger.info('AutoScaler: Monitoring started');
  }

  /**
   * Collect current metrics from the system
   */
  private async collectMetrics(): Promise<void> {
    try {
      const metrics = await this.getCurrentMetrics();
      
      // Store metrics history
      this.metricsHistory.push({
        timestamp: new Date(),
        metrics
      });

      // Keep only last hour of metrics
      const oneHourAgo = Date.now() - 3600000;
      this.metricsHistory = this.metricsHistory.filter(
        entry => entry.timestamp.getTime() > oneHourAgo
      );

      this.stats.metricsHistory = this.metricsHistory.slice(-100); // Keep last 100 entries
      
      this.emit('metricsCollected', metrics);
    } catch (error) {
      logger.error('AutoScaler: Error collecting metrics:', error);
    }
  }

  /**
   * Get current system metrics
   */
  private async getCurrentMetrics(): Promise<ScalingMetrics> {
    const lbStats = this.loadBalancer.getStats();
    
    // In a real implementation, these would come from actual system monitoring
    const metrics: ScalingMetrics = {
      cpuUsage: await this.getCpuUsage(),
      memoryUsage: await this.getMemoryUsage(),
      requestsPerSecond: lbStats.requestsPerSecond,
      averageResponseTime: lbStats.averageResponseTime,
      activeConnections: lbStats.activeConnections,
      errorRate: lbStats.totalRequests > 0 ? (lbStats.totalFailures / lbStats.totalRequests) * 100 : 0
    };

    return metrics;
  }

  private async getCpuUsage(): Promise<number> {
    // Simulate CPU usage - in real implementation, use system monitoring
    const baseUsage = 30 + Math.random() * 40; // 30-70% base
    const instances = this.loadBalancer.getHealthyInstances();
    const loadFactor = instances.length > 0 ? Math.min(100, baseUsage * (5 / instances.length)) : 90;
    return Math.round(loadFactor);
  }

  private async getMemoryUsage(): Promise<number> {
    // Simulate memory usage - in real implementation, use system monitoring
    const baseUsage = 40 + Math.random() * 30; // 40-70% base
    const instances = this.loadBalancer.getHealthyInstances();
    const loadFactor = instances.length > 0 ? Math.min(100, baseUsage * (4 / instances.length)) : 85;
    return Math.round(loadFactor);
  }

  /**
   * Evaluate all scaling rules
   */
  private async evaluateRules(): Promise<void> {
    if (this.isScaling) {
      logger.debug('AutoScaler: Skipping evaluation - scaling in progress');
      return;
    }

    const currentMetrics = await this.getCurrentMetrics();
    const now = Date.now();

    for (const [ruleId, rule] of this.rules.entries()) {
      if (!rule.enabled) continue;

      const ruleState = this.ruleStates.get(ruleId)!;
      const conditionMet = this.evaluateCondition(rule, currentMetrics);

      if (conditionMet) {
        // Start tracking condition duration
        if (!ruleState.conditionStartTime) {
          ruleState.conditionStartTime = now;
          logger.debug(`AutoScaler: Rule ${ruleId} condition started`);
        }

        // Check if condition has persisted long enough
        const conditionDuration = now - ruleState.conditionStartTime;
        if (conditionDuration >= rule.duration) {
          // Check cooldown period
          const timeSinceLastTrigger = ruleState.lastTriggered ? now - ruleState.lastTriggered : Infinity;
          if (timeSinceLastTrigger >= rule.cooldown) {
            await this.executeScalingAction(rule, currentMetrics);
            ruleState.lastTriggered = now;
            ruleState.conditionStartTime = undefined;
          } else {
            logger.debug(`AutoScaler: Rule ${ruleId} in cooldown period`);
          }
        }
      } else {
        // Reset condition tracking
        if (ruleState.conditionStartTime) {
          ruleState.conditionStartTime = undefined;
          logger.debug(`AutoScaler: Rule ${ruleId} condition ended`);
        }
      }
    }

    this.updateStats();
  }

  /**
   * Evaluate if a rule condition is met
   */
  private evaluateCondition(rule: ScalingRule, metrics: ScalingMetrics): boolean {
    const metricValue = metrics[rule.metric];
    
    switch (rule.operator) {
      case 'greater_than':
        return metricValue > rule.threshold;
      case 'less_than':
        return metricValue < rule.threshold;
      case 'equals':
        return metricValue === rule.threshold;
      default:
        return false;
    }
  }

  /**
   * Execute a scaling action
   */
  private async executeScalingAction(rule: ScalingRule, metrics: ScalingMetrics): Promise<void> {
    if (this.isScaling) {
      logger.warn('AutoScaler: Scaling already in progress, skipping action');
      return;
    }

    this.isScaling = true;
    const startTime = Date.now();

    try {
      const currentInstances = this.loadBalancer.getHealthyInstances().length;
      let targetInstances = currentInstances;

      if (rule.action === 'scale_up') {
        targetInstances = Math.min(this.config.maxInstances, currentInstances + rule.scaleAmount);
      } else if (rule.action === 'scale_down') {
        targetInstances = Math.max(this.config.minInstances, currentInstances - rule.scaleAmount);
      }

      if (targetInstances === currentInstances) {
        logger.info(`AutoScaler: No scaling needed - already at limits (current: ${currentInstances})`);
        return;
      }

      const instancesChanged = targetInstances - currentInstances;
      
      logger.info(`AutoScaler: Executing ${rule.action} - ${currentInstances} -> ${targetInstances} instances (rule: ${rule.name})`);

      // Record scaling action
      const scalingAction: ScalingAction = {
        id: this.generateActionId(),
        timestamp: new Date(),
        action: rule.action,
        reason: rule.name,
        ruleId: rule.id,
        instancesChanged: Math.abs(instancesChanged),
        beforeCount: currentInstances,
        afterCount: targetInstances,
        metrics: { ...metrics }
      };

      this.scalingHistory.push(scalingAction);

      // Perform the actual scaling
      if (rule.action === 'scale_up') {
        await this.scaleUp(instancesChanged);
        this.stats.totalScaleUps++;
      } else {
        await this.scaleDown(Math.abs(instancesChanged));
        this.stats.totalScaleDowns++;
      }

      const scalingTime = Date.now() - startTime;
      this.updateAverageScalingTime(scalingTime);

      this.emit('scalingAction', scalingAction);
      logger.info(`AutoScaler: Scaling completed in ${scalingTime}ms`);

    } catch (error) {
      logger.error('AutoScaler: Scaling action failed:', error);
      this.emit('scalingError', { rule, error });
    } finally {
      this.isScaling = false;
    }
  }

  /**
   * Scale up by adding instances
   */
  private async scaleUp(instanceCount: number): Promise<void> {
    for (let i = 0; i < instanceCount; i++) {
      const instance = await this.createNewInstance();
      this.loadBalancer.addInstance(instance);
      logger.info(`AutoScaler: Added new instance ${instance.host}:${instance.port}`);
    }
  }

  /**
   * Scale down by removing instances
   */
  private async scaleDown(instanceCount: number): Promise<void> {
    const instances = this.loadBalancer.getHealthyInstances()
      .sort((a, b) => a.activeConnections - b.activeConnections); // Remove least busy first

    for (let i = 0; i < Math.min(instanceCount, instances.length); i++) {
      const instance = instances[i];
      this.loadBalancer.drainInstance(instance.id);
      logger.info(`AutoScaler: Draining instance ${instance.host}:${instance.port}`);
      
      // Schedule removal after drain period
      setTimeout(() => {
        this.loadBalancer.removeInstance(instance.id);
        this.terminateInstance(instance);
      }, 30000); // 30 seconds drain time
    }
  }

  /**
   * Create a new service instance
   */
  private async createNewInstance(): Promise<Omit<ServiceInstance, 'id' | 'activeConnections' | 'totalRequests' | 'failedRequests' | 'createdAt'>> {
    // In a real implementation, this would create actual infrastructure
    const port = 3000 + Math.floor(Math.random() * 1000);
    
    return {
      host: 'localhost',
      port,
      protocol: 'http',
      weight: 1,
      status: 'healthy',
      healthCheckUrl: `http://localhost:${port}/health`,
      metadata: {
        instanceType: this.config.targetInstanceType,
        createdBy: 'autoscaler'
      }
    };
  }

  /**
   * Terminate a service instance
   */
  private async terminateInstance(instance: ServiceInstance): Promise<void> {
    // In a real implementation, this would terminate actual infrastructure
    logger.info(`AutoScaler: Terminated instance ${instance.host}:${instance.port}`);
  }

  /**
   * Manually trigger scaling
   */
  async manualScale(action: 'scale_up' | 'scale_down', instanceCount: number, reason: string): Promise<void> {
    if (this.isScaling) {
      throw new Error('Scaling already in progress');
    }

    const currentInstances = this.loadBalancer.getHealthyInstances().length;
    let targetInstances = currentInstances;

    if (action === 'scale_up') {
      targetInstances = Math.min(this.config.maxInstances, currentInstances + instanceCount);
    } else {
      targetInstances = Math.max(this.config.minInstances, currentInstances - instanceCount);
    }

    if (targetInstances === currentInstances) {
      throw new Error('Cannot scale - already at limits');
    }

    const metrics = await this.getCurrentMetrics();
    const scalingAction: ScalingAction = {
      id: this.generateActionId(),
      timestamp: new Date(),
      action,
      reason: `Manual scaling: ${reason}`,
      ruleId: 'manual',
      instancesChanged: Math.abs(targetInstances - currentInstances),
      beforeCount: currentInstances,
      afterCount: targetInstances,
      metrics
    };

    this.scalingHistory.push(scalingAction);

    if (action === 'scale_up') {
      await this.scaleUp(targetInstances - currentInstances);
      this.stats.totalScaleUps++;
    } else {
      await this.scaleDown(currentInstances - targetInstances);
      this.stats.totalScaleDowns++;
    }

    this.emit('scalingAction', scalingAction);
    logger.info(`AutoScaler: Manual scaling completed - ${currentInstances} -> ${targetInstances} instances`);
  }

  /**
   * Get current autoscaler statistics
   */
  getStats(): AutoScalerStats {
    this.updateStats();
    return { ...this.stats };
  }

  private updateStats(): void {
    this.stats.currentInstances = this.loadBalancer.getHealthyInstances().length;
    this.stats.lastScalingAction = this.scalingHistory.length > 0 
      ? this.scalingHistory[this.scalingHistory.length - 1].timestamp 
      : undefined;
  }

  private updateAverageScalingTime(scalingTime: number): void {
    const totalActions = this.stats.totalScaleUps + this.stats.totalScaleDowns;
    if (totalActions === 1) {
      this.stats.averageScalingTime = scalingTime;
    } else {
      this.stats.averageScalingTime = 
        (this.stats.averageScalingTime * (totalActions - 1) + scalingTime) / totalActions;
    }
  }

  /**
   * Get scaling history
   */
  getScalingHistory(limit?: number): ScalingAction[] {
    const history = [...this.scalingHistory].reverse();
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * Get all scaling rules
   */
  getRules(): ScalingRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get current metrics
   */
  async getMetrics(): Promise<ScalingMetrics> {
    return await this.getCurrentMetrics();
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = undefined;
    }

    if (this.evaluationTimer) {
      clearInterval(this.evaluationTimer);
      this.evaluationTimer = undefined;
    }

    logger.info('AutoScaler: Monitoring stopped');
    this.emit('stopped');
  }

  /**
   * Health check for the autoscaler
   */
  healthCheck(): {
    status: 'healthy' | 'unhealthy';
    details: {
      isMonitoring: boolean;
      isScaling: boolean;
      rulesCount: number;
      currentInstances: number;
      targetRange: { min: number; max: number };
      lastMetricsCollection?: Date;
    };
  } {
    const lastMetrics = this.metricsHistory[this.metricsHistory.length - 1];
    
    return {
      status: this.metricsTimer && this.evaluationTimer ? 'healthy' : 'unhealthy',
      details: {
        isMonitoring: !!(this.metricsTimer && this.evaluationTimer),
        isScaling: this.isScaling,
        rulesCount: this.rules.size,
        currentInstances: this.stats.currentInstances,
        targetRange: {
          min: this.config.minInstances,
          max: this.config.maxInstances
        },
        lastMetricsCollection: lastMetrics?.timestamp
      }
    };
  }

  private generateActionId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export configured autoscaler instance
export const autoScaler = new AutoScaler({
  minInstances: 2,
  maxInstances: 10,
  targetInstanceType: 'standard',
  metricsInterval: 10000,
  evaluationInterval: 30000,
  scaleUpCooldown: 300000,
  scaleDownCooldown: 600000,
  defaultRules: []
}, require('../loadbalancer/LoadBalancer').loadBalancer);
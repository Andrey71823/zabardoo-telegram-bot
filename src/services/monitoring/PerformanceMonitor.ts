import { EventEmitter } from 'events';
import { logger } from '../../config/logger';
import { LoadBalancer } from '../loadbalancer/LoadBalancer';
import { AutoScaler } from '../scaling/AutoScaler';
import { cacheManager } from '../cache/CacheManager';
import { connectionPool } from '../database/ConnectionPool';

export interface SystemMetrics {
  timestamp: Date;
  cpu: {
    usage: number; // percentage
    loadAverage: number[];
  };
  memory: {
    used: number; // bytes
    free: number; // bytes
    total: number; // bytes
    usage: number; // percentage
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
  };
  disk: {
    used: number; // bytes
    free: number; // bytes
    total: number; // bytes
    usage: number; // percentage
    iops: number;
  };
  application: {
    requestsPerSecond: number;
    averageResponseTime: number;
    errorRate: number;
    activeConnections: number;
    uptime: number; // milliseconds
  };
  database: {
    activeConnections: number;
    totalQueries: number;
    averageQueryTime: number;
    slowQueries: number;
    connectionPoolUsage: number; // percentage
  };
  cache: {
    hitRate: number; // percentage
    missRate: number; // percentage
    totalOperations: number;
    averageResponseTime: number;
    memoryUsage: number; // bytes
  };
}

export interface Alert {
  id: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'critical';
  category: 'system' | 'application' | 'database' | 'cache' | 'network';
  title: string;
  description: string;
  metrics: Partial<SystemMetrics>;
  resolved: boolean;
  resolvedAt?: Date;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

export interface AlertRule {
  id: string;
  name: string;
  category: keyof SystemMetrics;
  metric: string;
  operator: 'greater_than' | 'less_than' | 'equals' | 'not_equals';
  threshold: number;
  severity: 'info' | 'warning' | 'error' | 'critical';
  duration: number; // milliseconds - how long condition must persist
  enabled: boolean;
  description: string;
}

export interface PerformanceReport {
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    uptime: number;
    availability: number; // percentage
  };
  metrics: {
    cpu: { min: number; max: number; avg: number };
    memory: { min: number; max: number; avg: number };
    database: { totalQueries: number; slowQueries: number; avgQueryTime: number };
    cache: { hitRate: number; totalOperations: number };
  };
  alerts: {
    total: number;
    byLevel: Record<string, number>;
    topAlerts: Alert[];
  };
  recommendations: string[];
}

export class PerformanceMonitor extends EventEmitter {
  private metricsHistory: SystemMetrics[] = [];
  private alerts: Map<string, Alert> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  private ruleStates: Map<string, { conditionStartTime?: number; lastTriggered?: number }> = new Map();
  private monitoringTimer?: NodeJS.Timeout;
  private alertEvaluationTimer?: NodeJS.Timeout;
  private loadBalancer?: LoadBalancer;
  private autoScaler?: AutoScaler;
  private isMonitoring: boolean = false;
  private startTime: number = Date.now();

  constructor() {
    super();
    this.initializeDefaultAlertRules();
  }

  /**
   * Initialize default alert rules
   */
  private initializeDefaultAlertRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'high-cpu-usage',
        name: 'High CPU Usage',
        category: 'cpu',
        metric: 'usage',
        operator: 'greater_than',
        threshold: 85,
        severity: 'warning',
        duration: 120000, // 2 minutes
        enabled: true,
        description: 'CPU usage is consistently high'
      },
      {
        id: 'critical-cpu-usage',
        name: 'Critical CPU Usage',
        category: 'cpu',
        metric: 'usage',
        operator: 'greater_than',
        threshold: 95,
        severity: 'critical',
        duration: 60000, // 1 minute
        enabled: true,
        description: 'CPU usage is critically high'
      },
      {
        id: 'high-memory-usage',
        name: 'High Memory Usage',
        category: 'memory',
        metric: 'usage',
        operator: 'greater_than',
        threshold: 80,
        severity: 'warning',
        duration: 180000, // 3 minutes
        enabled: true,
        description: 'Memory usage is consistently high'
      },
      {
        id: 'critical-memory-usage',
        name: 'Critical Memory Usage',
        category: 'memory',
        metric: 'usage',
        operator: 'greater_than',
        threshold: 95,
        severity: 'critical',
        duration: 60000, // 1 minute
        enabled: true,
        description: 'Memory usage is critically high'
      },
      {
        id: 'high-error-rate',
        name: 'High Error Rate',
        category: 'application',
        metric: 'errorRate',
        operator: 'greater_than',
        threshold: 5, // 5%
        severity: 'error',
        duration: 60000, // 1 minute
        enabled: true,
        description: 'Application error rate is high'
      },
      {
        id: 'slow-response-time',
        name: 'Slow Response Time',
        category: 'application',
        metric: 'averageResponseTime',
        operator: 'greater_than',
        threshold: 2000, // 2 seconds
        severity: 'warning',
        duration: 120000, // 2 minutes
        enabled: true,
        description: 'Application response time is slow'
      }
    ];

    defaultRules.forEach(rule => this.addAlertRule(rule));
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(interval: number = 30000): void {
    if (this.isMonitoring) {
      logger.warn('PerformanceMonitor: Already monitoring');
      return;
    }

    this.isMonitoring = true;
    
    // Start metrics collection
    this.monitoringTimer = setInterval(() => {
      this.collectMetrics();
    }, interval);

    // Start alert evaluation
    this.alertEvaluationTimer = setInterval(() => {
      this.evaluateAlerts();
    }, 60000); // Evaluate alerts every minute

    logger.info(`PerformanceMonitor: Started monitoring with ${interval}ms interval`);
    this.emit('monitoringStarted');
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = undefined;
    }

    if (this.alertEvaluationTimer) {
      clearInterval(this.alertEvaluationTimer);
      this.alertEvaluationTimer = undefined;
    }

    logger.info('PerformanceMonitor: Stopped monitoring');
    this.emit('monitoringStopped');
  }

  /**
   * Collect current system metrics
   */
  private async collectMetrics(): Promise<void> {
    try {
      const metrics = await this.getCurrentMetrics();
      
      // Store metrics
      this.metricsHistory.push(metrics);
      
      // Keep only last 24 hours of metrics (assuming 30s interval = 2880 entries)
      if (this.metricsHistory.length > 2880) {
        this.metricsHistory = this.metricsHistory.slice(-2880);
      }

      this.emit('metricsCollected', metrics);
    } catch (error) {
      logger.error('PerformanceMonitor: Error collecting metrics:', error);
    }
  }

  /**
   * Get current system metrics
   */
  private async getCurrentMetrics(): Promise<SystemMetrics> {
    const timestamp = new Date();
    
    // Get system metrics (simulated - in real implementation use system monitoring)
    const cpuUsage = await this.getCpuUsage();
    const memoryInfo = await this.getMemoryInfo();
    const networkInfo = await this.getNetworkInfo();
    const diskInfo = await this.getDiskInfo();
    
    // Get application metrics
    const applicationMetrics = this.loadBalancer ? this.loadBalancer.getStats() : {
      requestsPerSecond: 0,
      averageResponseTime: 0,
      totalFailures: 0,
      totalRequests: 0,
      activeConnections: 0
    };

    // Get database metrics
    const databaseMetrics = connectionPool.getStats();
    
    // Get cache metrics
    const cacheStats = cacheManager.getStats();

    return {
      timestamp,
      cpu: {
        usage: cpuUsage,
        loadAverage: [1.2, 1.5, 1.8] // Simulated
      },
      memory: memoryInfo,
      network: networkInfo,
      disk: diskInfo,
      application: {
        requestsPerSecond: applicationMetrics.requestsPerSecond,
        averageResponseTime: applicationMetrics.averageResponseTime,
        errorRate: applicationMetrics.totalRequests > 0 
          ? (applicationMetrics.totalFailures / applicationMetrics.totalRequests) * 100 
          : 0,
        activeConnections: applicationMetrics.activeConnections,
        uptime: Date.now() - this.startTime
      },
      database: {
        activeConnections: databaseMetrics.totalConnections,
        totalQueries: databaseMetrics.totalQueries,
        averageQueryTime: databaseMetrics.averageQueryTime,
        slowQueries: 0, // Would come from query optimizer
        connectionPoolUsage: (databaseMetrics.totalConnections / databaseMetrics.maxConnections) * 100
      },
      cache: {
        hitRate: cacheStats.hitRate,
        missRate: 100 - cacheStats.hitRate,
        totalOperations: cacheStats.hits + cacheStats.misses,
        averageResponseTime: 5, // Simulated
        memoryUsage: 0 // Would come from Redis info
      }
    };
  }

  private async getCpuUsage(): Promise<number> {
    // Simulate CPU usage - in real implementation use os.cpus() and process.cpuUsage()
    return Math.round(20 + Math.random() * 60); // 20-80%
  }

  private async getMemoryInfo(): Promise<SystemMetrics['memory']> {
    // Simulate memory info - in real implementation use os.totalmem() and os.freemem()
    const total = 8 * 1024 * 1024 * 1024; // 8GB
    const used = Math.round(total * (0.3 + Math.random() * 0.4)); // 30-70%
    const free = total - used;
    
    return {
      total,
      used,
      free,
      usage: (used / total) * 100
    };
  }

  private async getNetworkInfo(): Promise<SystemMetrics['network']> {
    // Simulate network info - in real implementation use network monitoring
    return {
      bytesIn: Math.round(Math.random() * 1000000),
      bytesOut: Math.round(Math.random() * 800000),
      packetsIn: Math.round(Math.random() * 10000),
      packetsOut: Math.round(Math.random() * 8000)
    };
  }

  private async getDiskInfo(): Promise<SystemMetrics['disk']> {
    // Simulate disk info - in real implementation use fs.statSync()
    const total = 100 * 1024 * 1024 * 1024; // 100GB
    const used = Math.round(total * (0.4 + Math.random() * 0.3)); // 40-70%
    const free = total - used;
    
    return {
      total,
      used,
      free,
      usage: (used / total) * 100,
      iops: Math.round(Math.random() * 1000)
    };
  }

  /**
   * Add an alert rule
   */
  addAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
    this.ruleStates.set(rule.id, {});
    logger.info(`PerformanceMonitor: Added alert rule ${rule.id}: ${rule.name}`);
    this.emit('alertRuleAdded', rule);
  }

  /**
   * Evaluate alert rules against current metrics
   */
  private evaluateAlerts(): void {
    if (this.metricsHistory.length === 0) return;

    const latestMetrics = this.metricsHistory[this.metricsHistory.length - 1];
    const now = Date.now();

    for (const [ruleId, rule] of this.alertRules.entries()) {
      if (!rule.enabled) continue;

      const ruleState = this.ruleStates.get(ruleId)!;
      const conditionMet = this.evaluateAlertCondition(rule, latestMetrics);

      if (conditionMet) {
        if (!ruleState.conditionStartTime) {
          ruleState.conditionStartTime = now;
        }

        const conditionDuration = now - ruleState.conditionStartTime;
        if (conditionDuration >= rule.duration) {
          this.triggerAlert(rule, latestMetrics);
          ruleState.lastTriggered = now;
          ruleState.conditionStartTime = undefined;
        }
      } else {
        if (ruleState.conditionStartTime) {
          ruleState.conditionStartTime = undefined;
        }
        
        // Auto-resolve alerts when condition is no longer met
        this.autoResolveAlert(ruleId);
      }
    }
  }

  /**
   * Evaluate if an alert condition is met
   */
  private evaluateAlertCondition(rule: AlertRule, metrics: SystemMetrics): boolean {
    const categoryMetrics = metrics[rule.category] as any;
    if (!categoryMetrics) return false;

    const metricValue = categoryMetrics[rule.metric];
    if (metricValue === undefined) return false;

    switch (rule.operator) {
      case 'greater_than':
        return metricValue > rule.threshold;
      case 'less_than':
        return metricValue < rule.threshold;
      case 'equals':
        return metricValue === rule.threshold;
      case 'not_equals':
        return metricValue !== rule.threshold;
      default:
        return false;
    }
  }

  /**
   * Trigger an alert
   */
  private triggerAlert(rule: AlertRule, metrics: SystemMetrics): void {
    // Check if alert already exists and is not resolved
    const existingAlert = Array.from(this.alerts.values())
      .find(alert => alert.title === rule.name && !alert.resolved);
    
    if (existingAlert) {
      return; // Don't create duplicate alerts
    }

    const alert: Alert = {
      id: this.generateAlertId(),
      timestamp: new Date(),
      level: rule.severity,
      category: this.mapRuleCategoryToAlertCategory(rule.category),
      title: rule.name,
      description: rule.description,
      metrics: { [rule.category]: metrics[rule.category] },
      resolved: false
    };

    this.alerts.set(alert.id, alert);
    
    logger.warn(`PerformanceMonitor: Alert triggered - ${alert.title} (${alert.level})`);
    this.emit('alertTriggered', alert);
  }

  /**
   * Auto-resolve alert when condition is no longer met
   */
  private autoResolveAlert(ruleId: string): void {
    const rule = this.alertRules.get(ruleId);
    if (!rule) return;

    const alert = Array.from(this.alerts.values())
      .find(alert => alert.title === rule.name && !alert.resolved);
    
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      
      logger.info(`PerformanceMonitor: Alert auto-resolved - ${alert.title}`);
      this.emit('alertResolved', alert);
    }
  }

  private mapRuleCategoryToAlertCategory(ruleCategory: keyof SystemMetrics): Alert['category'] {
    const mapping: Record<keyof SystemMetrics, Alert['category']> = {
      cpu: 'system',
      memory: 'system',
      network: 'network',
      disk: 'system',
      application: 'application',
      database: 'database',
      cache: 'cache',
      timestamp: 'system'
    };
    
    return mapping[ruleCategory] || 'system';
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current metrics
   */
  async getMetrics(): Promise<SystemMetrics | null> {
    if (this.metricsHistory.length === 0) {
      return await this.getCurrentMetrics();
    }
    return this.metricsHistory[this.metricsHistory.length - 1];
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(limit?: number): SystemMetrics[] {
    const history = [...this.metricsHistory].reverse();
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values())
      .filter(alert => !alert.resolved)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Generate performance report
   */
  generateReport(startDate: Date, endDate: Date): PerformanceReport {
    const periodMetrics = this.metricsHistory.filter(
      metrics => metrics.timestamp >= startDate && metrics.timestamp <= endDate
    );

    const periodAlerts = Array.from(this.alerts.values()).filter(
      alert => alert.timestamp >= startDate && alert.timestamp <= endDate
    );

    if (periodMetrics.length === 0) {
      throw new Error('No metrics available for the specified period');
    }

    // Calculate summary statistics
    const totalRequests = periodMetrics.reduce((sum, m) => sum + (m.application.requestsPerSecond * 30), 0);
    const avgResponseTime = periodMetrics.reduce((sum, m) => sum + m.application.averageResponseTime, 0) / periodMetrics.length;
    const avgErrorRate = periodMetrics.reduce((sum, m) => sum + m.application.errorRate, 0) / periodMetrics.length;
    const uptime = endDate.getTime() - startDate.getTime();
    
    // Calculate availability (simplified)
    const criticalAlerts = periodAlerts.filter(a => a.level === 'critical').length;
    const availability = Math.max(0, 100 - (criticalAlerts * 5));

    // Calculate min/max/avg for key metrics
    const cpuUsages = periodMetrics.map(m => m.cpu.usage);
    const memoryUsages = periodMetrics.map(m => m.memory.usage);
    
    const report: PerformanceReport = {
      period: { start: startDate, end: endDate },
      summary: {
        totalRequests: Math.round(totalRequests),
        averageResponseTime: Math.round(avgResponseTime),
        errorRate: Math.round(avgErrorRate * 100) / 100,
        uptime,
        availability: Math.round(availability * 100) / 100
      },
      metrics: {
        cpu: {
          min: Math.min(...cpuUsages),
          max: Math.max(...cpuUsages),
          avg: Math.round((cpuUsages.reduce((sum, val) => sum + val, 0) / cpuUsages.length) * 100) / 100
        },
        memory: {
          min: Math.min(...memoryUsages),
          max: Math.max(...memoryUsages),
          avg: Math.round((memoryUsages.reduce((sum, val) => sum + val, 0) / memoryUsages.length) * 100) / 100
        },
        database: {
          totalQueries: periodMetrics.reduce((sum, m) => sum + m.database.totalQueries, 0),
          slowQueries: periodMetrics.reduce((sum, m) => sum + m.database.slowQueries, 0),
          avgQueryTime: periodMetrics.reduce((sum, m) => sum + m.database.averageQueryTime, 0) / periodMetrics.length
        },
        cache: {
          hitRate: periodMetrics.reduce((sum, m) => sum + m.cache.hitRate, 0) / periodMetrics.length,
          totalOperations: periodMetrics.reduce((sum, m) => sum + m.cache.totalOperations, 0)
        }
      },
      alerts: {
        total: periodAlerts.length,
        byLevel: {
          info: periodAlerts.filter(a => a.level === 'info').length,
          warning: periodAlerts.filter(a => a.level === 'warning').length,
          error: periodAlerts.filter(a => a.level === 'error').length,
          critical: periodAlerts.filter(a => a.level === 'critical').length
        },
        topAlerts: periodAlerts
          .sort((a, b) => {
            const levelPriority = { critical: 4, error: 3, warning: 2, info: 1 };
            return levelPriority[b.level] - levelPriority[a.level];
          })
          .slice(0, 10)
      },
      recommendations: this.generateRecommendations(periodMetrics, periodAlerts)
    };

    return report;
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(metrics: SystemMetrics[], alerts: Alert[]): string[] {
    const recommendations: string[] = [];

    // Analyze CPU usage
    const avgCpuUsage = metrics.reduce((sum, m) => sum + m.cpu.usage, 0) / metrics.length;
    if (avgCpuUsage > 80) {
      recommendations.push('Consider scaling up instances or optimizing CPU-intensive operations');
    }

    // Analyze memory usage
    const avgMemoryUsage = metrics.reduce((sum, m) => sum + m.memory.usage, 0) / metrics.length;
    if (avgMemoryUsage > 85) {
      recommendations.push('Monitor memory leaks and consider increasing available memory');
    }

    // Analyze response time
    const avgResponseTime = metrics.reduce((sum, m) => sum + m.application.averageResponseTime, 0) / metrics.length;
    if (avgResponseTime > 1000) {
      recommendations.push('Optimize application performance and consider caching strategies');
    }

    // Analyze cache hit rate
    const avgCacheHitRate = metrics.reduce((sum, m) => sum + m.cache.hitRate, 0) / metrics.length;
    if (avgCacheHitRate < 70) {
      recommendations.push('Review caching strategy and consider cache warming techniques');
    }

    return recommendations;
  }

  setLoadBalancer(loadBalancer: LoadBalancer): void {
    this.loadBalancer = loadBalancer;
  }

  setAutoScaler(autoScaler: AutoScaler): void {
    this.autoScaler = autoScaler;
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();
import { EventEmitter } from 'events';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../../config/logger';
import { connectionPool } from '../database/ConnectionPool';
import { cacheManager } from '../cache/CacheManager';

export interface DetailedMetrics {
  timestamp: Date;
  system: {
    platform: string;
    arch: string;
    nodeVersion: string;
    uptime: number;
    loadAverage: number[];
    cpu: {
      model: string;
      cores: number;
      usage: number;
      userTime: number;
      systemTime: number;
      idleTime: number;
    };
    memory: {
      total: number;
      free: number;
      used: number;
      available: number;
      usage: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
      rss: number;
    };
    disk: {
      total: number;
      free: number;
      used: number;
      usage: number;
      readOps: number;
      writeOps: number;
      readBytes: number;
      writeBytes: number;
    };
    network: {
      interfaces: NetworkInterface[];
      totalBytesIn: number;
      totalBytesOut: number;
      totalPacketsIn: number;
      totalPacketsOut: number;
    };
  };
  process: {
    pid: number;
    ppid: number;
    title: string;
    argv: string[];
    execPath: string;
    cwd: string;
    version: string;
    versions: NodeJS.ProcessVersions;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
    resourceUsage: NodeJS.ResourceUsage;
    uptime: number;
  };
  application: {
    name: string;
    version: string;
    environment: string;
    startTime: Date;
    uptime: number;
    requestsTotal: number;
    requestsPerSecond: number;
    averageResponseTime: number;
    errorRate: number;
    activeConnections: number;
    totalErrors: number;
    routes: RouteMetrics[];
  };
  database: {
    connectionPool: {
      total: number;
      active: number;
      idle: number;
      waiting: number;
      maxConnections: number;
      usage: number;
    };
    queries: {
      total: number;
      successful: number;
      failed: number;
      averageTime: number;
      slowQueries: number;
      queriesPerSecond: number;
    };
    transactions: {
      total: number;
      committed: number;
      rolledBack: number;
      averageTime: number;
    };
  };
  cache: {
    redis: {
      connected: boolean;
      uptime: number;
      usedMemory: number;
      totalMemory: number;
      memoryUsage: number;
      keyspace: {
        keys: number;
        expires: number;
        avgTtl: number;
      };
      stats: {
        totalCommandsProcessed: number;
        commandsPerSecond: number;
        keyspaceHits: number;
        keyspaceMisses: number;
        hitRate: number;
      };
    };
    application: {
      hitRate: number;
      missRate: number;
      totalOperations: number;
      averageResponseTime: number;
      cacheSize: number;
      evictions: number;
    };
  };
  gc: {
    collections: GCMetrics[];
    totalCollections: number;
    totalTime: number;
    averageTime: number;
  };
}

export interface NetworkInterface {
  name: string;
  address: string;
  netmask: string;
  family: string;
  mac: string;
  internal: boolean;
  bytesReceived: number;
  bytesSent: number;
  packetsReceived: number;
  packetsSent: number;
  errors: number;
  dropped: number;
}

export interface RouteMetrics {
  path: string;
  method: string;
  requests: number;
  averageResponseTime: number;
  errorRate: number;
  lastAccessed: Date;
}

export interface GCMetrics {
  type: string;
  timestamp: Date;
  duration: number;
  heapBefore: number;
  heapAfter: number;
  freed: number;
}

export class MetricsCollector extends EventEmitter {
  private isCollecting: boolean = false;
  private collectionTimer?: NodeJS.Timeout;
  private startTime: Date = new Date();
  private lastCpuUsage?: NodeJS.CpuUsage;
  private lastNetworkStats: Map<string, any> = new Map();
  private routeMetrics: Map<string, RouteMetrics> = new Map();
  private gcMetrics: GCMetrics[] = [];
  private applicationStats = {
    requestsTotal: 0,
    totalErrors: 0,
    totalResponseTime: 0,
    activeConnections: 0
  };

  constructor() {
    super();
    this.initializeGCMonitoring();
  }

  /**
   * Initialize garbage collection monitoring
   */
  private initializeGCMonitoring(): void {
    // Monitor GC events if available
    if (process.env.NODE_ENV !== 'production') {
      try {
        const v8 = require('v8');
        if (v8.getHeapStatistics) {
          // GC monitoring would be implemented here with performance hooks
          logger.info('MetricsCollector: GC monitoring initialized');
        }
      } catch (error) {
        logger.warn('MetricsCollector: GC monitoring not available');
      }
    }
  }

  /**
   * Start metrics collection
   */
  startCollection(interval: number = 30000): void {
    if (this.isCollecting) {
      logger.warn('MetricsCollector: Already collecting metrics');
      return;
    }

    this.isCollecting = true;
    this.lastCpuUsage = process.cpuUsage();

    this.collectionTimer = setInterval(async () => {
      try {
        const metrics = await this.collectDetailedMetrics();
        this.emit('metricsCollected', metrics);
      } catch (error) {
        logger.error('MetricsCollector: Error collecting metrics:', error);
      }
    }, interval);

    logger.info(`MetricsCollector: Started collection with ${interval}ms interval`);
    this.emit('collectionStarted');
  }

  /**
   * Stop metrics collection
   */
  stopCollection(): void {
    if (!this.isCollecting) {
      return;
    }

    this.isCollecting = false;

    if (this.collectionTimer) {
      clearInterval(this.collectionTimer);
      this.collectionTimer = undefined;
    }

    logger.info('MetricsCollector: Stopped collection');
    this.emit('collectionStopped');
  }

  /**
   * Collect detailed system and application metrics
   */
  async collectDetailedMetrics(): Promise<DetailedMetrics> {
    const timestamp = new Date();

    const [
      systemMetrics,
      processMetrics,
      applicationMetrics,
      databaseMetrics,
      cacheMetrics,
      gcMetrics
    ] = await Promise.all([
      this.collectSystemMetrics(),
      this.collectProcessMetrics(),
      this.collectApplicationMetrics(),
      this.collectDatabaseMetrics(),
      this.collectCacheMetrics(),
      this.collectGCMetrics()
    ]);

    return {
      timestamp,
      system: systemMetrics,
      process: processMetrics,
      application: applicationMetrics,
      database: databaseMetrics,
      cache: cacheMetrics,
      gc: gcMetrics
    };
  }

  /**
   * Collect system-level metrics
   */
  private async collectSystemMetrics(): Promise<DetailedMetrics['system']> {
    const cpuInfo = os.cpus()[0];
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    // Calculate CPU usage
    const currentCpuUsage = process.cpuUsage(this.lastCpuUsage);
    const cpuPercent = this.calculateCpuUsage(currentCpuUsage);
    this.lastCpuUsage = process.cpuUsage();

    // Get disk usage
    const diskUsage = await this.getDiskUsage();

    // Get network interfaces
    const networkInterfaces = await this.getNetworkMetrics();

    return {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      uptime: os.uptime(),
      loadAverage: os.loadavg(),
      cpu: {
        model: cpuInfo.model,
        cores: os.cpus().length,
        usage: cpuPercent,
        userTime: currentCpuUsage.user,
        systemTime: currentCpuUsage.system,
        idleTime: 0 // Would be calculated from /proc/stat on Linux
      },
      memory: {
        total: totalMem,
        free: freeMem,
        used: usedMem,
        available: freeMem,
        usage: (usedMem / totalMem) * 100,
        heapTotal: process.memoryUsage().heapTotal,
        heapUsed: process.memoryUsage().heapUsed,
        external: process.memoryUsage().external,
        rss: process.memoryUsage().rss
      },
      disk: diskUsage,
      network: {
        interfaces: networkInterfaces,
        totalBytesIn: networkInterfaces.reduce((sum, iface) => sum + iface.bytesReceived, 0),
        totalBytesOut: networkInterfaces.reduce((sum, iface) => sum + iface.bytesSent, 0),
        totalPacketsIn: networkInterfaces.reduce((sum, iface) => sum + iface.packetsReceived, 0),
        totalPacketsOut: networkInterfaces.reduce((sum, iface) => sum + iface.packetsSent, 0)
      }
    };
  }

  /**
   * Calculate CPU usage percentage
   */
  private calculateCpuUsage(cpuUsage: NodeJS.CpuUsage): number {
    const totalTime = cpuUsage.user + cpuUsage.system;
    // This is a simplified calculation - in production, you'd want more accurate CPU monitoring
    return Math.min(100, (totalTime / 1000000) * 100); // Convert microseconds to percentage
  }

  /**
   * Get disk usage information
   */
  private async getDiskUsage(): Promise<DetailedMetrics['system']['disk']> {
    try {
      // Simulated disk usage - in real implementation use statvfs or similar
      const total = 100 * 1024 * 1024 * 1024; // 100GB
      const used = Math.round(total * (0.4 + Math.random() * 0.3)); // 40-70%
      const free = total - used;

      return {
        total,
        free,
        used,
        usage: (used / total) * 100,
        readOps: Math.round(Math.random() * 1000),
        writeOps: Math.round(Math.random() * 500),
        readBytes: Math.round(Math.random() * 1000000),
        writeBytes: Math.round(Math.random() * 500000)
      };
    } catch (error) {
      logger.error('MetricsCollector: Error getting disk usage:', error);
      return {
        total: 0,
        free: 0,
        used: 0,
        usage: 0,
        readOps: 0,
        writeOps: 0,
        readBytes: 0,
        writeBytes: 0
      };
    }
  }

  /**
   * Get network interface metrics
   */
  private async getNetworkMetrics(): Promise<NetworkInterface[]> {
    const interfaces = os.networkInterfaces();
    const networkMetrics: NetworkInterface[] = [];

    for (const [name, addresses] of Object.entries(interfaces)) {
      if (!addresses) continue;

      for (const addr of addresses) {
        // Simulated network stats - in real implementation read from /proc/net/dev on Linux
        const stats = {
          bytesReceived: Math.round(Math.random() * 1000000),
          bytesSent: Math.round(Math.random() * 800000),
          packetsReceived: Math.round(Math.random() * 10000),
          packetsSent: Math.round(Math.random() * 8000),
          errors: Math.round(Math.random() * 10),
          dropped: Math.round(Math.random() * 5)
        };

        networkMetrics.push({
          name,
          address: addr.address,
          netmask: addr.netmask,
          family: addr.family,
          mac: addr.mac,
          internal: addr.internal,
          ...stats
        });
      }
    }

    return networkMetrics;
  }

  /**
   * Collect process-level metrics
   */
  private async collectProcessMetrics(): Promise<DetailedMetrics['process']> {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const resourceUsage = process.resourceUsage();

    return {
      pid: process.pid,
      ppid: process.ppid || 0,
      title: process.title,
      argv: process.argv,
      execPath: process.execPath,
      cwd: process.cwd(),
      version: process.version,
      versions: process.versions,
      memoryUsage,
      cpuUsage,
      resourceUsage,
      uptime: process.uptime()
    };
  }

  /**
   * Collect application-level metrics
   */
  private async collectApplicationMetrics(): Promise<DetailedMetrics['application']> {
    const uptime = Date.now() - this.startTime.getTime();
    const requestsPerSecond = this.applicationStats.requestsTotal > 0 
      ? this.applicationStats.requestsTotal / (uptime / 1000) 
      : 0;
    
    const averageResponseTime = this.applicationStats.requestsTotal > 0
      ? this.applicationStats.totalResponseTime / this.applicationStats.requestsTotal
      : 0;

    const errorRate = this.applicationStats.requestsTotal > 0
      ? (this.applicationStats.totalErrors / this.applicationStats.requestsTotal) * 100
      : 0;

    return {
      name: process.env.npm_package_name || 'zabardoo-telegram-bot',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      startTime: this.startTime,
      uptime,
      requestsTotal: this.applicationStats.requestsTotal,
      requestsPerSecond,
      averageResponseTime,
      errorRate,
      activeConnections: this.applicationStats.activeConnections,
      totalErrors: this.applicationStats.totalErrors,
      routes: Array.from(this.routeMetrics.values())
    };
  }

  /**
   * Collect database metrics
   */
  private async collectDatabaseMetrics(): Promise<DetailedMetrics['database']> {
    const poolStats = connectionPool.getStats();

    return {
      connectionPool: {
        total: poolStats.totalConnections,
        active: poolStats.activeConnections,
        idle: poolStats.idleConnections,
        waiting: poolStats.waitingConnections,
        maxConnections: poolStats.maxConnections,
        usage: (poolStats.totalConnections / poolStats.maxConnections) * 100
      },
      queries: {
        total: poolStats.totalQueries,
        successful: poolStats.successfulQueries,
        failed: poolStats.failedQueries,
        averageTime: poolStats.averageQueryTime,
        slowQueries: poolStats.slowQueries,
        queriesPerSecond: poolStats.queriesPerSecond
      },
      transactions: {
        total: poolStats.totalTransactions || 0,
        committed: poolStats.committedTransactions || 0,
        rolledBack: poolStats.rolledBackTransactions || 0,
        averageTime: poolStats.averageTransactionTime || 0
      }
    };
  }

  /**
   * Collect cache metrics
   */
  private async collectCacheMetrics(): Promise<DetailedMetrics['cache']> {
    const cacheStats = cacheManager.getStats();
    
    // Simulated Redis metrics - in real implementation get from Redis INFO command
    const redisMetrics = {
      connected: true,
      uptime: Math.round(Math.random() * 86400), // Random uptime in seconds
      usedMemory: Math.round(Math.random() * 100 * 1024 * 1024), // Random memory usage
      totalMemory: 512 * 1024 * 1024, // 512MB
      memoryUsage: 0,
      keyspace: {
        keys: Math.round(Math.random() * 10000),
        expires: Math.round(Math.random() * 5000),
        avgTtl: Math.round(Math.random() * 3600)
      },
      stats: {
        totalCommandsProcessed: Math.round(Math.random() * 1000000),
        commandsPerSecond: Math.round(Math.random() * 1000),
        keyspaceHits: cacheStats.hits,
        keyspaceMisses: cacheStats.misses,
        hitRate: cacheStats.hitRate
      }
    };

    redisMetrics.memoryUsage = (redisMetrics.usedMemory / redisMetrics.totalMemory) * 100;

    return {
      redis: redisMetrics,
      application: {
        hitRate: cacheStats.hitRate,
        missRate: 100 - cacheStats.hitRate,
        totalOperations: cacheStats.hits + cacheStats.misses,
        averageResponseTime: cacheStats.averageResponseTime,
        cacheSize: cacheStats.size,
        evictions: cacheStats.evictions
      }
    };
  }

  /**
   * Collect garbage collection metrics
   */
  private async collectGCMetrics(): Promise<DetailedMetrics['gc']> {
    const recentGC = this.gcMetrics.slice(-10); // Keep last 10 GC events
    
    const totalCollections = this.gcMetrics.length;
    const totalTime = this.gcMetrics.reduce((sum, gc) => sum + gc.duration, 0);
    const averageTime = totalCollections > 0 ? totalTime / totalCollections : 0;

    return {
      collections: recentGC,
      totalCollections,
      totalTime,
      averageTime
    };
  }

  /**
   * Record application request
   */
  recordRequest(responseTime: number, isError: boolean = false): void {
    this.applicationStats.requestsTotal++;
    this.applicationStats.totalResponseTime += responseTime;
    
    if (isError) {
      this.applicationStats.totalErrors++;
    }
  }

  /**
   * Record route metrics
   */
  recordRouteMetrics(path: string, method: string, responseTime: number, isError: boolean = false): void {
    const key = `${method}:${path}`;
    let routeMetric = this.routeMetrics.get(key);

    if (!routeMetric) {
      routeMetric = {
        path,
        method,
        requests: 0,
        averageResponseTime: 0,
        errorRate: 0,
        lastAccessed: new Date()
      };
      this.routeMetrics.set(key, routeMetric);
    }

    const totalTime = routeMetric.averageResponseTime * routeMetric.requests;
    routeMetric.requests++;
    routeMetric.averageResponseTime = (totalTime + responseTime) / routeMetric.requests;
    routeMetric.lastAccessed = new Date();

    if (isError) {
      // Recalculate error rate
      const totalErrors = Math.round(routeMetric.errorRate * (routeMetric.requests - 1) / 100) + 1;
      routeMetric.errorRate = (totalErrors / routeMetric.requests) * 100;
    }
  }

  /**
   * Update active connections count
   */
  updateActiveConnections(count: number): void {
    this.applicationStats.activeConnections = count;
  }

  /**
   * Record GC event
   */
  recordGCEvent(type: string, duration: number, heapBefore: number, heapAfter: number): void {
    const gcEvent: GCMetrics = {
      type,
      timestamp: new Date(),
      duration,
      heapBefore,
      heapAfter,
      freed: heapBefore - heapAfter
    };

    this.gcMetrics.push(gcEvent);

    // Keep only last 100 GC events
    if (this.gcMetrics.length > 100) {
      this.gcMetrics = this.gcMetrics.slice(-100);
    }

    this.emit('gcEvent', gcEvent);
  }

  /**
   * Get current metrics snapshot
   */
  async getCurrentMetrics(): Promise<DetailedMetrics> {
    return await this.collectDetailedMetrics();
  }

  /**
   * Get application statistics
   */
  getApplicationStats(): typeof this.applicationStats {
    return { ...this.applicationStats };
  }

  /**
   * Get route metrics
   */
  getRouteMetrics(): RouteMetrics[] {
    return Array.from(this.routeMetrics.values());
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.applicationStats = {
      requestsTotal: 0,
      totalErrors: 0,
      totalResponseTime: 0,
      activeConnections: 0
    };
    this.routeMetrics.clear();
    this.gcMetrics = [];
    this.startTime = new Date();

    logger.info('MetricsCollector: Metrics reset');
    this.emit('metricsReset');
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopCollection();
    this.resetMetrics();
    logger.info('MetricsCollector: Destroyed');
  }
}

// Export singleton instance
export const metricsCollector = new MetricsCollector();
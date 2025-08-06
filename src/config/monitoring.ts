import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';
import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

// Collect default metrics
collectDefaultMetrics({ register });

// Custom metrics
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'service'],
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code', 'service'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
});

export const activeConnections = new Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  labelNames: ['service'],
});

export const databaseConnections = new Gauge({
  name: 'database_connections',
  help: 'Number of database connections',
  labelNames: ['database', 'status'],
});

export const telegramApiRequests = new Counter({
  name: 'telegram_api_requests_total',
  help: 'Total number of Telegram API requests',
  labelNames: ['method', 'status'],
});

export const couponRecommendations = new Counter({
  name: 'coupon_recommendations_total',
  help: 'Total number of coupon recommendations made',
  labelNames: ['channel_type', 'user_segment'],
});

export const userRetentionRate = new Gauge({
  name: 'user_retention_rate',
  help: 'User retention rate percentage',
  labelNames: ['period', 'cohort'],
});

// Middleware for HTTP metrics
export const metricsMiddleware = (serviceName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    
    // Increment active connections
    activeConnections.inc({ service: serviceName });
    
    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000;
      const route = req.route?.path || req.path;
      
      // Record metrics
      httpRequestsTotal.inc({
        method: req.method,
        route,
        status_code: res.statusCode,
        service: serviceName,
      });
      
      httpRequestDuration.observe(
        {
          method: req.method,
          route,
          status_code: res.statusCode,
          service: serviceName,
        },
        duration
      );
      
      // Decrement active connections
      activeConnections.dec({ service: serviceName });
    });
    
    next();
  };
};

// Health check metrics
export const updateDatabaseMetrics = (postgres: boolean, redis: boolean) => {
  databaseConnections.set({ database: 'postgres', status: 'connected' }, postgres ? 1 : 0);
  databaseConnections.set({ database: 'postgres', status: 'disconnected' }, postgres ? 0 : 1);
  databaseConnections.set({ database: 'redis', status: 'connected' }, redis ? 1 : 0);
  databaseConnections.set({ database: 'redis', status: 'disconnected' }, redis ? 0 : 1);
};

// Business metrics helpers
export const recordCouponRecommendation = (channelType: 'personal' | 'group', userSegment: string) => {
  couponRecommendations.inc({ channel_type: channelType, user_segment: userSegment });
};

export const recordTelegramApiCall = (method: string, success: boolean) => {
  telegramApiRequests.inc({ method, status: success ? 'success' : 'error' });
};

export const updateRetentionRate = (period: string, cohort: string, rate: number) => {
  userRetentionRate.set({ period, cohort }, rate);
};

// Metrics endpoint handler
export const getMetrics = async (req: Request, res: Response) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    logger.error('Error generating metrics:', error);
    res.status(500).end('Error generating metrics');
  }
};

// Initialize monitoring
export const initializeMonitoring = () => {
  logger.info('Monitoring system initialized');
  
  // Set up periodic health checks
  setInterval(async () => {
    try {
      const { checkDatabaseHealth } = await import('./database');
      const health = await checkDatabaseHealth();
      updateDatabaseMetrics(health.postgres, health.redis);
    } catch (error) {
      logger.error('Health check failed:', error);
    }
  }, 30000); // Check every 30 seconds
};
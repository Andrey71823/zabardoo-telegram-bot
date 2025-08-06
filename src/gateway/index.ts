import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { logger, loggerStream } from '../config/logger';
import { metricsMiddleware, getMetrics, initializeMonitoring } from '../config/monitoring';
import { connectDatabases, checkDatabaseHealth } from '../config/database';
import { performanceMonitor } from '../services/monitoring/PerformanceMonitor';
import { alertingService } from '../services/monitoring/AlertingService';
import { metricsCollector } from '../services/monitoring/MetricsCollector';
import config from '../config';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: config.security.rateLimitWindowMs,
  max: config.security.rateLimitMax,
  message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

// Monitoring middleware
app.use(metricsMiddleware('api-gateway'));

// Enhanced monitoring middleware for detailed metrics
app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    const isError = res.statusCode >= 400;
    
    // Record request in metrics collector
    metricsCollector.recordRequest(responseTime, isError);
    metricsCollector.recordRouteMetrics(req.path, req.method, responseTime, isError);
  });
  
  next();
});

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await checkDatabaseHealth();
    const isHealthy = dbHealth.postgres && dbHealth.redis;
    
    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealth,
        gateway: true,
      },
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    });
  }
});

// Metrics endpoint
app.get('/metrics', getMetrics);

// Enhanced monitoring endpoints
app.get('/monitoring/status', async (req, res) => {
  try {
    const currentMetrics = await performanceMonitor.getMetrics();
    const activeAlerts = performanceMonitor.getActiveAlerts();
    const detailedMetrics = await metricsCollector.getCurrentMetrics();
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      monitoring: {
        performanceMonitor: {
          isRunning: currentMetrics !== null,
          lastUpdate: currentMetrics?.timestamp,
          activeAlerts: activeAlerts.length
        },
        metricsCollector: {
          applicationStats: metricsCollector.getApplicationStats(),
          routeMetrics: metricsCollector.getRouteMetrics().slice(0, 10) // Top 10 routes
        }
      },
      system: currentMetrics ? {
        cpu: currentMetrics.cpu,
        memory: currentMetrics.memory,
        application: currentMetrics.application
      } : null
    });
  } catch (error) {
    logger.error('Monitoring status error:', error);
    res.status(500).json({
      error: 'Failed to get monitoring status',
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/monitoring/alerts', (req, res) => {
  try {
    const activeAlerts = performanceMonitor.getActiveAlerts();
    const allAlerts = performanceMonitor.getAllAlerts(50); // Last 50 alerts
    
    res.json({
      active: activeAlerts,
      recent: allAlerts,
      summary: {
        total: allAlerts.length,
        active: activeAlerts.length,
        byLevel: {
          critical: activeAlerts.filter(a => a.level === 'critical').length,
          error: activeAlerts.filter(a => a.level === 'error').length,
          warning: activeAlerts.filter(a => a.level === 'warning').length,
          info: activeAlerts.filter(a => a.level === 'info').length
        }
      }
    });
  } catch (error) {
    logger.error('Alerts endpoint error:', error);
    res.status(500).json({
      error: 'Failed to get alerts',
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/monitoring/metrics/detailed', async (req, res) => {
  try {
    const detailedMetrics = await metricsCollector.getCurrentMetrics();
    res.json(detailedMetrics);
  } catch (error) {
    logger.error('Detailed metrics error:', error);
    res.status(500).json({
      error: 'Failed to get detailed metrics',
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/monitoring/report', async (req, res) => {
  try {
    const { hours = 1 } = req.query;
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (Number(hours) * 60 * 60 * 1000));
    
    const report = performanceMonitor.generateReport(startDate, endDate);
    res.json(report);
  } catch (error) {
    logger.error('Performance report error:', error);
    res.status(500).json({
      error: 'Failed to generate performance report',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Service proxy configurations
const serviceProxies = {
  '/api/channels': {
    target: `http://${config.services.channelManager.host}:${config.services.channelManager.port}`,
    pathRewrite: { '^/api/channels': '' },
  },
  '/api/ai': {
    target: `http://${config.services.aiAssistant.host}:${config.services.aiAssistant.port}`,
    pathRewrite: { '^/api/ai': '' },
  },
  '/api/coupons': {
    target: `http://${config.services.couponService.host}:${config.services.couponService.port}`,
    pathRewrite: { '^/api/coupons': '' },
  },
  '/api/traffic': {
    target: `http://${config.services.trafficManager.host}:${config.services.trafficManager.port}`,
    pathRewrite: { '^/api/traffic': '' },
  },
  '/api/analytics': {
    target: `http://${config.services.analyticsService.host}:${config.services.analyticsService.port}`,
    pathRewrite: { '^/api/analytics': '' },
  },
  '/api/retention': {
    target: `http://${config.services.retentionEngine.host}:${config.services.retentionEngine.port}`,
    pathRewrite: { '^/api/retention': '' },
  },
  '/api/groups': {
    target: `http://group-manager:3007`,
    pathRewrite: { '^/api/groups': '' },
  },
  '/api/sync': {
    target: `http://sync-manager:3008`,
    pathRewrite: { '^/api/sync': '' },
  },
};

// Setup service proxies
Object.entries(serviceProxies).forEach(([path, proxyConfig]) => {
  app.use(path, createProxyMiddleware({
    ...proxyConfig,
    changeOrigin: true,
    timeout: 30000,
    proxyTimeout: 30000,
    onError: (err, req, res) => {
      logger.error(`Proxy error for ${path}:`, err);
      res.status(503).json({
        error: 'Service temporarily unavailable',
        service: path,
        timestamp: new Date().toISOString(),
      });
    },
    onProxyReq: (proxyReq, req, res) => {
      logger.debug(`Proxying ${req.method} ${req.url} to ${proxyConfig.target}`);
    },
  }));
});

// Serve monitoring dashboard
app.use('/monitoring', express.static('public'));

// Default route
app.get('/', (req, res) => {
  res.json({
    name: 'Zabardoo Telegram Bot API Gateway',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      metrics: '/metrics',
      monitoring: '/monitoring/monitoring-dashboard.html',
      services: Object.keys(serviceProxies),
    },
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
  });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    timestamp: new Date().toISOString(),
  });
});

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}, shutting down gracefully`);
  
  // Stop monitoring services
  performanceMonitor.stopMonitoring();
  metricsCollector.stopCollection();
  alertingService.destroy();
  
  logger.info('Monitoring services stopped');
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const startServer = async () => {
  try {
    // Initialize monitoring
    initializeMonitoring();
    
    // Initialize enhanced monitoring system
    logger.info('Initializing enhanced monitoring system...');
    
    // Initialize alerting service
    await alertingService.initialize();
    
    // Start performance monitoring
    performanceMonitor.startMonitoring(30000); // Every 30 seconds
    
    // Start detailed metrics collection
    metricsCollector.startCollection(30000); // Every 30 seconds
    
    // Connect to databases
    await connectDatabases();
    
    // Track active connections
    const server = app.listen(config.port, () => {
      logger.info(`API Gateway running on port ${config.port}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info(`Health check: http://localhost:${config.port}/health`);
      logger.info(`Metrics: http://localhost:${config.port}/metrics`);
      logger.info(`Monitoring status: http://localhost:${config.port}/monitoring/status`);
      logger.info(`Active alerts: http://localhost:${config.port}/monitoring/alerts`);
      logger.info('Enhanced monitoring system started successfully');
    });

    // Track connection count
    let connectionCount = 0;
    server.on('connection', (socket) => {
      connectionCount++;
      metricsCollector.updateActiveConnections(connectionCount);
      
      socket.on('close', () => {
        connectionCount--;
        metricsCollector.updateActiveConnections(connectionCount);
      });
    });

    // Setup monitoring event listeners
    performanceMonitor.on('alertTriggered', (alert) => {
      logger.warn(`Performance Alert: ${alert.title} - ${alert.description}`);
    });

    alertingService.on('alertHandled', (alert) => {
      logger.info(`Alert handled: ${alert.title}`);
    });

    metricsCollector.on('metricsCollected', (metrics) => {
      logger.debug(`Metrics collected - CPU: ${metrics.system.cpu.usage.toFixed(1)}%, Memory: ${metrics.system.memory.usage.toFixed(1)}%`);
    });

  } catch (error) {
    logger.error('Failed to start API Gateway:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

export default app;
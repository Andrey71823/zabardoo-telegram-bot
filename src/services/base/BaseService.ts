import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { logger, createServiceLogger } from '../../config/logger';
import { metricsMiddleware, getMetrics } from '../../config/monitoring';
import { connectDatabases, checkDatabaseHealth } from '../../config/database';
import config from '../../config';

export abstract class BaseService {
  protected app: express.Application;
  protected logger: typeof logger;
  protected serviceName: string;
  protected port: number;

  constructor(serviceName: string, port: number) {
    this.serviceName = serviceName;
    this.port = port;
    this.app = express();
    this.logger = createServiceLogger(serviceName);
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(compression());

    // Monitoring middleware
    this.app.use(metricsMiddleware(this.serviceName));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      try {
        const dbHealth = await checkDatabaseHealth();
        const serviceHealth = await this.checkServiceHealth();
        const isHealthy = dbHealth.postgres && dbHealth.redis && serviceHealth;
        
        res.status(isHealthy ? 200 : 503).json({
          status: isHealthy ? 'healthy' : 'unhealthy',
          service: this.serviceName,
          timestamp: new Date().toISOString(),
          checks: {
            database: dbHealth,
            service: serviceHealth,
          },
        });
      } catch (error) {
        this.logger.error('Health check failed:', error);
        res.status(503).json({
          status: 'unhealthy',
          service: this.serviceName,
          timestamp: new Date().toISOString(),
          error: 'Health check failed',
        });
      }
    });

    // Metrics endpoint
    this.app.get('/metrics', getMetrics);

    // Service info endpoint
    this.app.get('/', (req, res) => {
      res.json({
        service: this.serviceName,
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
      });
    });

    // Setup service-specific routes
    this.setupServiceRoutes();

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Endpoint not found',
        service: this.serviceName,
        path: req.originalUrl,
        timestamp: new Date().toISOString(),
      });
    });

    // Error handler
    this.app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      this.logger.error('Unhandled error:', err);
      res.status(500).json({
        error: 'Internal server error',
        service: this.serviceName,
        timestamp: new Date().toISOString(),
      });
    });
  }

  protected abstract setupServiceRoutes(): void;
  protected abstract checkServiceHealth(): Promise<boolean>;

  public async start(): Promise<void> {
    try {
      // Connect to databases
      await connectDatabases();
      
      // Initialize service
      await this.initialize();
      
      // Start server
      this.app.listen(this.port, () => {
        this.logger.info(`${this.serviceName} running on port ${this.port}`);
        this.logger.info(`Environment: ${config.nodeEnv}`);
        this.logger.info(`Health check: http://localhost:${this.port}/health`);
      });
    } catch (error) {
      this.logger.error(`Failed to start ${this.serviceName}:`, error);
      process.exit(1);
    }
  }

  protected async initialize(): Promise<void> {
    // Override in child classes for service-specific initialization
  }

  protected gracefulShutdown(signal: string): void {
    this.logger.info(`Received ${signal}, shutting down ${this.serviceName} gracefully`);
    process.exit(0);
  }

  public setupGracefulShutdown(): void {
    process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));
  }
}
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';
import { createServer } from 'http';

// Import services
import { EnhancedTelegramBot } from './services/telegram/EnhancedTelegramBot';
import { AIAssistantService } from './services/ai/AIAssistantService';
import { RecommendationService } from './services/recommendation/RecommendationService';
import { CashbackService } from './services/cashback/CashbackService';
import { UserManagementService } from './services/admin/UserManagementService';

// Import config
import config from './config';
import { logger } from './config/logger';

class ZabardooApp {
  private app: express.Application;
  private server: any;
  private telegramBot: EnhancedTelegramBot;
  private aiService: AIAssistantService;
  private recommendationService: RecommendationService;
  private cashbackService: CashbackService;
  private userManagementService: UserManagementService;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.initializeServices();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
          scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "https://api.telegram.org"]
        }
      }
    }));

    // CORS
    this.app.use(cors({
      origin: process.env.NODE_ENV === 'production' 
        ? ['https://zabardoo.com', /\.ondigitalocean\.app$/]
        : true,
      credentials: true
    }));

    // Compression
    this.app.use(compression());

    // Logging
    this.app.use(morgan('combined', {
      stream: { write: (message) => logger.info(message.trim()) }
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Static files
    this.app.use(express.static(path.join(__dirname, 'public')));
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      });
    });

    // Root route
    this.app.get('/', (req, res) => {
      res.json({
        message: 'Zabardoo Telegram Bot API',
        version: '1.0.0',
        status: 'running',
        endpoints: {
          health: '/health',
          webhook: '/webhook',
          admin: '/admin',
          api: '/api'
        }
      });
    });

    // Admin dashboard
    this.app.get('/admin', (req, res) => {
      res.sendFile(path.join(__dirname, 'public/admin/unified-dashboard.html'));
    });

    // API routes will be added by services
    this.app.use('/api', express.Router());
  }

  private async initializeServices(): Promise<void> {
    try {
      logger.info('🚀 Initializing Zabardoo services...');

      // Initialize AI Service
      this.aiService = new AIAssistantService();
      await this.aiService.start();
      logger.info('✅ AI Assistant Service started');

      // Initialize Recommendation Service
      this.recommendationService = new RecommendationService();
      await this.recommendationService.start();
      logger.info('✅ Recommendation Service started');

      // Initialize Cashback Service
      this.cashbackService = new CashbackService();
      await this.cashbackService.start();
      logger.info('✅ Cashback Service started');

      // Initialize User Management Service
      this.userManagementService = new UserManagementService();
      await this.userManagementService.start();
      logger.info('✅ User Management Service started');

      // Initialize Telegram Bot (should be last)
      this.telegramBot = new EnhancedTelegramBot();
      await this.telegramBot.start();
      logger.info('✅ Telegram Bot started');

      // Setup webhook route
      this.app.post('/webhook', (req, res) => {
        this.telegramBot.handleWebhook(req, res);
      });

      logger.info('🎉 All services initialized successfully');

    } catch (error) {
      logger.error('❌ Failed to initialize services:', error);
      process.exit(1);
    }
  }

  public async start(): Promise<void> {
    const port = process.env.PORT || config.server.port || 8080;
    
    this.server = createServer(this.app);
    
    this.server.listen(port, () => {
      logger.info(`🚀 Zabardoo Telegram Bot started on port ${port}`);
      logger.info(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🌐 Health check: http://localhost:${port}/health`);
      logger.info(`👨‍💼 Admin dashboard: http://localhost:${port}/admin`);
      
      if (process.env.NODE_ENV === 'production') {
        logger.info(`🔗 Webhook URL: ${process.env.WEBHOOK_URL || 'Not configured'}`);
      }
    });

    // Graceful shutdown
    this.setupGracefulShutdown();
  }

  private setupGracefulShutdown(): void {
    const gracefulShutdown = async (signal: string) => {
      logger.info(`📴 Received ${signal}. Starting graceful shutdown...`);
      
      try {
        // Stop accepting new requests
        this.server.close(() => {
          logger.info('🔌 HTTP server closed');
        });

        // Stop services
        if (this.telegramBot) {
          await this.telegramBot.stop();
          logger.info('🤖 Telegram Bot stopped');
        }

        if (this.aiService) {
          await this.aiService.stop();
          logger.info('🧠 AI Service stopped');
        }

        if (this.recommendationService) {
          await this.recommendationService.stop();
          logger.info('💡 Recommendation Service stopped');
        }

        if (this.cashbackService) {
          await this.cashbackService.stop();
          logger.info('💰 Cashback Service stopped');
        }

        if (this.userManagementService) {
          await this.userManagementService.stop();
          logger.info('👥 User Management Service stopped');
        }

        logger.info('✅ Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };

    // Handle different termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // nodemon restart

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('💥 Uncaught Exception:', error);
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('unhandledRejection');
    });
  }
}

// Start the application
if (require.main === module) {
  const app = new ZabardooApp();
  app.start().catch((error) => {
    logger.error('💥 Failed to start application:', error);
    process.exit(1);
  });
}

export default ZabardooApp;
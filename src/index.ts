import { logger } from './config/logger';
import { initializeMonitoring } from './config/monitoring';
import { connectDatabases } from './config/database';
import config from './config';

// Import services
import app from './gateway';

const startApplication = async () => {
  try {
    logger.info('Starting Zabardoo Telegram Bot System...');
    
    // Initialize monitoring
    initializeMonitoring();
    logger.info('Monitoring system initialized');
    
    // Connect to databases
    await connectDatabases();
    logger.info('Database connections established');
    
    // Start API Gateway
    app.listen(config.port, () => {
      logger.info(`API Gateway running on port ${config.port}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info(`Health check: http://localhost:${config.port}/health`);
      logger.info(`Metrics: http://localhost:${config.port}/metrics`);
      logger.info('Zabardoo Telegram Bot System started successfully');
    });
    
  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}, shutting down gracefully`);
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the application
if (require.main === module) {
  startApplication();
}

export default app;
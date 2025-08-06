import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
  // Server configuration
  port: parseInt(process.env.PORT || '3000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database configuration
  database: {
    postgres: {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'zabardoo',
      user: process.env.POSTGRES_USER || 'zabardoo_user',
      password: process.env.POSTGRES_PASSWORD || 'zabardoo_password',
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    },
  },
  
  // Service configuration
  services: {
    channelManager: {
      host: process.env.CHANNEL_MANAGER_HOST || 'localhost',
      port: parseInt(process.env.CHANNEL_MANAGER_PORT || '3001'),
    },
    aiAssistant: {
      host: process.env.AI_ASSISTANT_HOST || 'localhost',
      port: parseInt(process.env.AI_ASSISTANT_PORT || '3002'),
    },
    couponService: {
      host: process.env.COUPON_SERVICE_HOST || 'localhost',
      port: parseInt(process.env.COUPON_SERVICE_PORT || '3003'),
    },
    trafficManager: {
      host: process.env.TRAFFIC_MANAGER_HOST || 'localhost',
      port: parseInt(process.env.TRAFFIC_MANAGER_PORT || '3004'),
    },
    analyticsService: {
      host: process.env.ANALYTICS_SERVICE_HOST || 'localhost',
      port: parseInt(process.env.ANALYTICS_SERVICE_PORT || '3005'),
    },
    retentionEngine: {
      host: process.env.RETENTION_ENGINE_HOST || 'localhost',
      port: parseInt(process.env.RETENTION_ENGINE_PORT || '3006'),
    },
  },
  
  // External APIs
  apis: {
    telegram: {
      botToken: process.env.TELEGRAM_BOT_TOKEN || '',
      webhookUrl: process.env.TELEGRAM_WEBHOOK_URL || '',
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    },
  },
  
  // Security
  security: {
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
  
  // Monitoring
  monitoring: {
    metricsPath: process.env.METRICS_PATH || '/metrics',
    healthPath: process.env.HEALTH_PATH || '/health',
  },
};

export default config;
// Mock config first
jest.mock('../config', () => ({
  default: {
    port: 3001,
    nodeEnv: 'test',
    database: {
      postgres: {
        host: 'localhost',
        port: 5432,
        database: 'zabardoo_test',
        user: 'test_user',
        password: 'test_password',
      },
      redis: {
        host: 'localhost',
        port: 6379,
      },
    },
    services: {
      channelManager: { host: 'localhost', port: 3001 },
      aiAssistant: { host: 'localhost', port: 3002 },
      couponService: { host: 'localhost', port: 3003 },
      trafficManager: { host: 'localhost', port: 3004 },
      analyticsService: { host: 'localhost', port: 3005 },
      retentionEngine: { host: 'localhost', port: 3006 },
    },
    apis: {
      telegram: {
        botToken: 'test_bot_token',
        webhookUrl: 'https://test.com/webhook'
      },
      openai: {
        apiKey: 'test_openai_key',
        model: 'gpt-3.5-turbo',
      },
    },
    security: {
      jwtSecret: 'test_secret',
      rateLimitWindowMs: 900000,
      rateLimitMax: 100,
    },
    logging: {
      level: 'error',
    },
    monitoring: {
      metricsPath: '/metrics',
      healthPath: '/health',
    },
  }
}));

// Mock dependencies
jest.mock('../config/database', () => ({
  connectDatabases: jest.fn().mockResolvedValue(undefined),
  checkDatabaseHealth: jest.fn().mockResolvedValue({ postgres: true, redis: true }),
  pgPool: {
    connect: jest.fn().mockResolvedValue({
      query: jest.fn().mockResolvedValue({ rows: [] }),
      release: jest.fn(),
    }),
    end: jest.fn(),
    on: jest.fn(),
  },
  redisClient: {
    connect: jest.fn().mockResolvedValue(undefined),
    quit: jest.fn().mockResolvedValue(undefined),
    ping: jest.fn().mockResolvedValue('PONG'),
    on: jest.fn(),
  },
}));

jest.mock('../repositories/UserRepository');
jest.mock('../repositories/PersonalChannelRepository');
jest.mock('../services/telegram/TelegramBotService');

import request from 'supertest';
import { ChannelManagerService } from '../services/channel-manager/ChannelManagerService';

describe('Channel Manager Service', () => {
  let app: any;
  let service: ChannelManagerService;

  beforeAll(async () => {
    try {
      service = new ChannelManagerService();
      app = service['app']; // Access private app property for testing
    } catch (error) {
      console.error('Failed to create service:', error);
      throw error;
    }
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('service', 'channel-manager');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Service Info', () => {
    it('should return service information', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body).toHaveProperty('service', 'channel-manager');
      expect(response.body).toHaveProperty('version', '1.0.0');
      expect(response.body).toHaveProperty('status', 'running');
    });
  });

  describe('User Management', () => {
    it('should validate required fields for user creation', async () => {
      const response = await request(app)
        .post('/users')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('telegramId and firstName are required');
    });

    it('should handle invalid telegram ID in user lookup', async () => {
      const response = await request(app)
        .get('/users/invalid_id')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid telegram ID');
    });

    it('should handle user activity update with invalid ID', async () => {
      const response = await request(app)
        .put('/users/invalid_id/activity')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid telegram ID');
    });
  });

  describe('Personal Channel Management', () => {
    it('should validate required fields for channel creation', async () => {
      const response = await request(app)
        .post('/personal-channel')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('telegramId and firstName are required');
    });

    it('should validate message content for channel messaging', async () => {
      const response = await request(app)
        .post('/personal-channel/test_channel/message')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'message is required');
    });
  });

  describe('Bulk Operations', () => {
    it('should validate messages array for bulk messaging', async () => {
      const response = await request(app)
        .post('/personal-channels/bulk-message')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'messages array is required');
    });

    it('should validate empty messages array', async () => {
      const response = await request(app)
        .post('/personal-channels/bulk-message')
        .send({ messages: [] })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'messages array is required');
    });

    it('should validate coupon sync parameters', async () => {
      const response = await request(app)
        .post('/personal-channels/sync-coupon')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('coupon and targetUsers array are required');
    });
  });

  describe('Analytics Endpoints', () => {
    it('should return channel analytics', async () => {
      const response = await request(app)
        .get('/analytics/channels')
        .expect(200);

      expect(response.body).toHaveProperty('totalPersonalChannels');
      expect(response.body).toHaveProperty('activeChannels');
      expect(response.body).toHaveProperty('messagesLastHour');
      expect(response.body).toHaveProperty('averageEngagement');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should return user analytics', async () => {
      const response = await request(app)
        .get('/analytics/users')
        .expect(200);

      expect(response.body).toHaveProperty('totalUsers');
      expect(response.body).toHaveProperty('activeUsers');
      expect(response.body).toHaveProperty('averageLifetimeValue');
      expect(response.body).toHaveProperty('highRiskUsers');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Webhook Handler', () => {
    it('should handle telegram webhook', async () => {
      const webhookUpdate = {
        update_id: 123,
        message: {
          message_id: 456,
          from: { id: 789, first_name: 'Test' },
          chat: { id: 789, type: 'private' },
          date: Math.floor(Date.now() / 1000),
          text: 'Hello'
        }
      };

      const response = await request(app)
        .post('/webhook/telegram')
        .send(webhookUpdate)
        .expect(200);

      expect(response.body).toHaveProperty('ok', true);
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for unknown endpoints', async () => {
      const response = await request(app)
        .get('/unknown-endpoint')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Endpoint not found');
      expect(response.body).toHaveProperty('service', 'channel-manager');
    });
  });
});
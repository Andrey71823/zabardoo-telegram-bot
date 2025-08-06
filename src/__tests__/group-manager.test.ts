// Mock config first
jest.mock('../config', () => ({
  default: {
    port: 3007,
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
    apis: {
      telegram: {
        botToken: 'test_bot_token',
        webhookUrl: 'https://test.com/webhook'
      },
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
}));

jest.mock('../repositories/GroupRepository');
jest.mock('../repositories/UserRepository');
jest.mock('../repositories/PersonalChannelRepository');
jest.mock('../services/telegram/TelegramBotService');
jest.mock('../services/moderation/ModerationService');

import request from 'supertest';
import { GroupManagerService } from '../services/group/GroupManagerService';

describe('Group Manager Service', () => {
  let app: any;
  let service: GroupManagerService;

  beforeAll(async () => {
    try {
      service = new GroupManagerService();
      app = service['app'];
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
      expect(response.body).toHaveProperty('service', 'group-manager');
    });
  });

  describe('Group Management', () => {
    it('should validate required fields for group creation', async () => {
      const response = await request(app)
        .post('/groups')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('telegramGroupId and name are required');
    });

    it('should handle group not found', async () => {
      const response = await request(app)
        .get('/groups/nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Group not found');
    });
  });

  describe('Member Management', () => {
    it('should validate userId for adding member', async () => {
      const response = await request(app)
        .post('/groups/test-group/members')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'userId is required');
    });

    it('should validate status for updating member', async () => {
      const response = await request(app)
        .put('/groups/test-group/members/user123')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'status is required');
    });
  });

  describe('Message Moderation', () => {
    it('should validate required fields for message moderation', async () => {
      const response = await request(app)
        .post('/groups/test-group/moderate')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('messageId, userId, and content are required');
    });

    it('should validate action for taking action on message', async () => {
      const response = await request(app)
        .post('/groups/test-group/messages/msg123/action')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'action and moderatorId are required');
    });
  });

  describe('Coupon Creation Assistance', () => {
    it('should validate required fields for coupon assistance', async () => {
      const response = await request(app)
        .post('/groups/test-group/assist-coupon')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'userId and messageContent are required');
    });

    it('should validate required fields for coupon request moderation', async () => {
      const response = await request(app)
        .post('/groups/test-group/coupon-requests/req123/moderate')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'status and moderatorId are required');
    });
  });

  describe('Analytics', () => {
    it('should return group analytics for non-existent group', async () => {
      const response = await request(app)
        .get('/groups/nonexistent/analytics')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Group not found');
    });

    it('should return all groups analytics', async () => {
      const response = await request(app)
        .get('/analytics/groups')
        .expect(200);

      expect(response.body).toHaveProperty('totalGroups');
      expect(response.body).toHaveProperty('activeGroups');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Webhook Handler', () => {
    it('should handle group update webhook', async () => {
      const webhookUpdate = {
        message: {
          message_id: 123,
          chat: { id: -1001234567890, type: 'group' },
          from: { id: 456, first_name: 'Test' },
          text: 'Test message'
        }
      };

      const response = await request(app)
        .post('/webhook/group-update')
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
      expect(response.body).toHaveProperty('service', 'group-manager');
    });
  });
});
import { Pool } from 'pg';
import { createClient } from 'redis';

// Global test setup
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/zabardoo_test';
  process.env.REDIS_URL = process.env.TEST_REDIS_URL || 'redis://localhost:6379/1';
  
  // Increase timeout for integration tests
  jest.setTimeout(30000);
});

// Global test teardown
afterAll(async () => {
  // Close database connections
  if (global.testDbPool) {
    await global.testDbPool.end();
  }
  
  // Close Redis connections
  if (global.testRedisClient) {
    await global.testRedisClient.quit();
  }
});

// Mock external services
jest.mock('../../services/telegram/TelegramBotService', () => ({
  TelegramBotService: jest.fn().mockImplementation(() => ({
    sendMessage: jest.fn().mockResolvedValue({ message_id: 123 }),
    createChannel: jest.fn().mockResolvedValue({ id: 'channel-123' }),
    inviteUserToChannel: jest.fn().mockResolvedValue(true),
    sendToChannel: jest.fn().mockResolvedValue(true)
  }))
}));

jest.mock('../../services/ai/OpenAIService', () => ({
  OpenAIService: jest.fn().mockImplementation(() => ({
    generateResponse: jest.fn().mockResolvedValue('AI generated response'),
    analyzeText: jest.fn().mockResolvedValue({ sentiment: 'positive', confidence: 0.8 })
  }))
}));

// Mock payment services
jest.mock('../../services/payment/PaymentGateway', () => ({
  PaymentGateway: jest.fn().mockImplementation(() => ({
    processPayment: jest.fn().mockResolvedValue({ success: true, transactionId: 'txn-123' }),
    validateUPI: jest.fn().mockReturnValue(true),
    validateBankAccount: jest.fn().mockReturnValue(true)
  }))
}));

// Mock email service
jest.mock('../../services/notification/EmailService', () => ({
  EmailService: jest.fn().mockImplementation(() => ({
    sendEmail: jest.fn().mockResolvedValue(true),
    sendBulkEmail: jest.fn().mockResolvedValue({ sent: 10, failed: 0 })
  }))
}));

// Test utilities
export const createTestUser = (overrides = {}) => ({
  id: 'test-user-' + Date.now(),
  telegramId: '123456789',
  username: 'testuser',
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
  phone: '+919876543210',
  isActive: true,
  createdAt: new Date(),
  ...overrides
});

export const createTestCoupon = (overrides = {}) => ({
  id: 'test-coupon-' + Date.now(),
  title: 'Test Coupon',
  description: 'Test coupon description',
  code: 'TEST50',
  discount: 50,
  discountType: 'percentage',
  store: 'Test Store',
  category: 'electronics',
  validFrom: new Date(),
  validUntil: new Date(Date.now() + 86400000),
  isActive: true,
  ...overrides
});

export const createTestTransaction = (overrides = {}) => ({
  id: 'test-txn-' + Date.now(),
  userId: 'test-user-123',
  orderId: 'order-123',
  amount: 1000,
  currency: 'INR',
  status: 'completed',
  createdAt: new Date(),
  ...overrides
});

export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const mockApiResponse = (data: any, success = true) => ({
  success,
  data,
  message: success ? 'Operation successful' : 'Operation failed',
  timestamp: new Date().toISOString()
});

// Database test utilities
export const setupTestDatabase = async () => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  // Run migrations
  const migrationFiles = [
    '001-create-tables.sql',
    '002-create-indexes.sql',
    // Add all migration files
  ];

  for (const file of migrationFiles) {
    try {
      const migrationPath = `../../../database/migrations/${file}`;
      const migration = require(migrationPath);
      await pool.query(migration);
    } catch (error) {
      console.warn(`Migration ${file} failed or not found:`, error.message);
    }
  }

  global.testDbPool = pool;
  return pool;
};

export const cleanupTestDatabase = async (pool: Pool) => {
  // Clean up test data
  const tables = [
    'user_consents',
    'data_processing_records',
    'cashback_transactions',
    'affiliate_links',
    'coupons',
    'users'
  ];

  for (const table of tables) {
    try {
      await pool.query(`DELETE FROM ${table} WHERE id LIKE 'test-%' OR id LIKE 'e2e-%'`);
    } catch (error) {
      console.warn(`Failed to clean table ${table}:`, error.message);
    }
  }
};

// Redis test utilities
export const setupTestRedis = async () => {
  const client = createClient({
    url: process.env.REDIS_URL
  });

  await client.connect();
  await client.flushDb(); // Clear test database

  global.testRedisClient = client;
  return client;
};

// Performance testing utilities
export const measurePerformance = async (fn: Function, iterations = 1) => {
  const startTime = process.hrtime.bigint();
  
  for (let i = 0; i < iterations; i++) {
    await fn();
  }
  
  const endTime = process.hrtime.bigint();
  const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
  
  return {
    totalTime: duration,
    averageTime: duration / iterations,
    iterations
  };
};

// Load testing utilities
export const runLoadTest = async (fn: Function, concurrency = 10, duration = 5000) => {
  const startTime = Date.now();
  const results: any[] = [];
  let completed = 0;
  let errors = 0;

  const workers = Array(concurrency).fill(null).map(async () => {
    while (Date.now() - startTime < duration) {
      try {
        const start = Date.now();
        await fn();
        const end = Date.now();
        results.push({ duration: end - start, success: true });
        completed++;
      } catch (error) {
        results.push({ error: error.message, success: false });
        errors++;
      }
    }
  });

  await Promise.all(workers);

  const successfulResults = results.filter(r => r.success);
  const avgResponseTime = successfulResults.length > 0 
    ? successfulResults.reduce((sum, r) => sum + r.duration, 0) / successfulResults.length 
    : 0;

  return {
    totalRequests: completed + errors,
    successful: completed,
    errors,
    successRate: ((completed / (completed + errors)) * 100).toFixed(2),
    averageResponseTime: avgResponseTime.toFixed(2),
    requestsPerSecond: ((completed + errors) / (duration / 1000)).toFixed(2)
  };
};

// Assertion helpers
export const expectValidApiResponse = (response: any) => {
  expect(response).toHaveProperty('success');
  expect(response).toHaveProperty('data');
  expect(response).toHaveProperty('message');
  expect(typeof response.success).toBe('boolean');
};

export const expectValidUser = (user: any) => {
  expect(user).toHaveProperty('id');
  expect(user).toHaveProperty('telegramId');
  expect(user).toHaveProperty('username');
  expect(user).toHaveProperty('createdAt');
  expect(typeof user.id).toBe('string');
  expect(typeof user.telegramId).toBe('string');
};

export const expectValidCoupon = (coupon: any) => {
  expect(coupon).toHaveProperty('id');
  expect(coupon).toHaveProperty('title');
  expect(coupon).toHaveProperty('code');
  expect(coupon).toHaveProperty('discount');
  expect(coupon).toHaveProperty('store');
  expect(coupon).toHaveProperty('category');
  expect(typeof coupon.discount).toBe('number');
  expect(coupon.discount).toBeGreaterThan(0);
};

// Mock data generators
export const generateMockUsers = (count: number) => {
  return Array(count).fill(null).map((_, i) => createTestUser({
    id: `mock-user-${i}`,
    username: `mockuser${i}`,
    email: `mockuser${i}@example.com`
  }));
};

export const generateMockCoupons = (count: number) => {
  const categories = ['electronics', 'fashion', 'food', 'travel', 'books'];
  const stores = ['Amazon', 'Flipkart', 'Myntra', 'Zomato', 'BookMyShow'];
  
  return Array(count).fill(null).map((_, i) => createTestCoupon({
    id: `mock-coupon-${i}`,
    title: `Mock Coupon ${i}`,
    code: `MOCK${i}`,
    category: categories[i % categories.length],
    store: stores[i % stores.length],
    discount: Math.floor(Math.random() * 50) + 10
  }));
};

// Environment validation
export const validateTestEnvironment = () => {
  const requiredEnvVars = [
    'DATABASE_URL',
    'REDIS_URL',
    'JWT_SECRET',
    'ENCRYPTION_KEY'
  ];

  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

// Test data cleanup
export const cleanupTestData = async () => {
  if (global.testDbPool) {
    await cleanupTestDatabase(global.testDbPool);
  }
  
  if (global.testRedisClient) {
    await global.testRedisClient.flushDb();
  }
};

// Export all utilities
export default {
  createTestUser,
  createTestCoupon,
  createTestTransaction,
  waitFor,
  mockApiResponse,
  setupTestDatabase,
  cleanupTestDatabase,
  setupTestRedis,
  measurePerformance,
  runLoadTest,
  expectValidApiResponse,
  expectValidUser,
  expectValidCoupon,
  generateMockUsers,
  generateMockCoupons,
  validateTestEnvironment,
  cleanupTestData
};
// Test setup file
import { logger } from '../config/logger';

// Suppress logs during testing
logger.level = 'error';

// Global test setup
beforeAll(async () => {
  // Setup code that runs before all tests
});

afterAll(async () => {
  // Cleanup code that runs after all tests
});

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.POSTGRES_HOST = 'localhost';
process.env.POSTGRES_PORT = '5432';
process.env.POSTGRES_DB = 'zabardoo_test';
process.env.POSTGRES_USER = 'test_user';
process.env.POSTGRES_PASSWORD = 'test_password';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
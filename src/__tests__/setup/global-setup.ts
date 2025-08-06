import { Pool } from 'pg';
import { createClient } from 'redis';
import fs from 'fs';
import path from 'path';

export default async function globalSetup() {
  console.log('🚀 Setting up global test environment...');

  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/zabardoo_test';
  process.env.REDIS_URL = process.env.TEST_REDIS_URL || 'redis://localhost:6379/1';
  process.env.JWT_SECRET = 'test-jwt-secret-key';
  process.env.ENCRYPTION_KEY = 'test-encryption-key-32-characters';
  process.env.TELEGRAM_BOT_TOKEN = 'test-telegram-bot-token';
  process.env.OPENAI_API_KEY = 'test-openai-api-key';

  try {
    // Setup test database
    await setupTestDatabase();
    
    // Setup test Redis
    await setupTestRedis();
    
    // Create test directories
    createTestDirectories();
    
    console.log('✅ Global test setup completed');
  } catch (error) {
    console.error('❌ Global test setup failed:', error);
    throw error;
  }
}

async function setupTestDatabase() {
  console.log('📊 Setting up test database...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection established');

    // Run test migrations
    await runTestMigrations(pool);
    
    // Seed test data
    await seedTestData(pool);
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

async function runTestMigrations(pool: Pool) {
  console.log('🔄 Running test migrations...');
  
  const migrationDir = path.join(__dirname, '../../../database/migrations');
  
  if (!fs.existsSync(migrationDir)) {
    console.log('⚠️  Migration directory not found, skipping migrations');
    return;
  }

  const migrationFiles = fs.readdirSync(migrationDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  for (const file of migrationFiles) {
    try {
      const migrationPath = path.join(migrationDir, file);
      const migration = fs.readFileSync(migrationPath, 'utf8');
      
      await pool.query(migration);
      console.log(`✅ Migration ${file} completed`);
    } catch (error) {
      console.warn(`⚠️  Migration ${file} failed:`, error.message);
      // Continue with other migrations
    }
  }
}

async function seedTestData(pool: Pool) {
  console.log('🌱 Seeding test data...');
  
  try {
    // Create test users
    await pool.query(`
      INSERT INTO users (id, telegram_id, username, first_name, last_name, email, phone, is_active)
      VALUES 
        ('test-user-1', '111111111', 'testuser1', 'Test', 'User1', 'test1@example.com', '+919876543210', true),
        ('test-user-2', '222222222', 'testuser2', 'Test', 'User2', 'test2@example.com', '+919876543211', true),
        ('test-user-3', '333333333', 'testuser3', 'Test', 'User3', 'test3@example.com', '+919876543212', true)
      ON CONFLICT (id) DO NOTHING
    `);

    // Create test coupons
    await pool.query(`
      INSERT INTO coupons (id, title, description, code, discount, discount_type, store, category, valid_from, valid_until, is_active)
      VALUES 
        ('test-coupon-1', 'Test Electronics Coupon', 'Great discount on electronics', 'ELEC50', 50, 'percentage', 'TechStore', 'electronics', NOW(), NOW() + INTERVAL '30 days', true),
        ('test-coupon-2', 'Test Fashion Coupon', 'Fashion sale coupon', 'FASHION30', 30, 'percentage', 'FashionHub', 'fashion', NOW(), NOW() + INTERVAL '30 days', true),
        ('test-coupon-3', 'Test Food Coupon', 'Food delivery discount', 'FOOD100', 100, 'fixed', 'FoodApp', 'food', NOW(), NOW() + INTERVAL '30 days', true)
      ON CONFLICT (id) DO NOTHING
    `);

    // Create test stores
    await pool.query(`
      INSERT INTO indian_stores (id, name, domain, category, commission_rate, is_active, country)
      VALUES 
        ('test-store-1', 'Test Electronics Store', 'testelectronics.com', 'electronics', 0.05, true, 'India'),
        ('test-store-2', 'Test Fashion Store', 'testfashion.com', 'fashion', 0.08, true, 'India'),
        ('test-store-3', 'Test Food Store', 'testfood.com', 'food', 0.10, true, 'India')
      ON CONFLICT (id) DO NOTHING
    `);

    console.log('✅ Test data seeded successfully');
  } catch (error) {
    console.warn('⚠️  Test data seeding failed:', error.message);
    // Continue anyway as this is not critical
  }
}

async function setupTestRedis() {
  console.log('🔴 Setting up test Redis...');
  
  try {
    const client = createClient({
      url: process.env.REDIS_URL
    });

    await client.connect();
    
    // Clear test database
    await client.flushDb();
    
    // Set some test data
    await client.set('test:setup', 'completed');
    
    await client.quit();
    
    console.log('✅ Redis setup completed');
  } catch (error) {
    console.error('❌ Redis setup failed:', error);
    throw error;
  }
}

function createTestDirectories() {
  console.log('📁 Creating test directories...');
  
  const directories = [
    'test-reports',
    'coverage',
    'logs/test',
    'uploads/test',
    'temp/test'
  ];

  directories.forEach(dir => {
    const fullPath = path.join(__dirname, '../../../', dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`✅ Created directory: ${dir}`);
    }
  });
}

// Export for use in other test files
export const testConfig = {
  database: {
    url: process.env.DATABASE_URL,
    pool: {
      min: 1,
      max: 5
    }
  },
  redis: {
    url: process.env.REDIS_URL
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: '1h'
  },
  encryption: {
    key: process.env.ENCRYPTION_KEY
  }
};
import { Pool } from 'pg';
import { createClient } from 'redis';
import fs from 'fs';
import path from 'path';

export default async function globalTeardown() {
  console.log('🧹 Starting global test cleanup...');

  try {
    // Cleanup test database
    await cleanupTestDatabase();
    
    // Cleanup test Redis
    await cleanupTestRedis();
    
    // Cleanup test files
    cleanupTestFiles();
    
    console.log('✅ Global test cleanup completed');
  } catch (error) {
    console.error('❌ Global test cleanup failed:', error);
    // Don't throw error to avoid masking test failures
  }
}

async function cleanupTestDatabase() {
  console.log('🗑️  Cleaning up test database...');
  
  if (!process.env.DATABASE_URL) {
    console.log('⚠️  No database URL found, skipping database cleanup');
    return;
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    // Clean up test data (anything with 'test-' or 'e2e-' prefix)
    const cleanupQueries = [
      "DELETE FROM compliance_audit_logs WHERE user_id LIKE 'test-%' OR user_id LIKE 'e2e-%'",
      "DELETE FROM data_deletion_requests WHERE user_id LIKE 'test-%' OR user_id LIKE 'e2e-%'",
      "DELETE FROM data_processing_records WHERE user_id LIKE 'test-%' OR user_id LIKE 'e2e-%'",
      "DELETE FROM user_consents WHERE user_id LIKE 'test-%' OR user_id LIKE 'e2e-%'",
      "DELETE FROM cashback_withdrawals WHERE user_id LIKE 'test-%' OR user_id LIKE 'e2e-%'",
      "DELETE FROM cashback_transactions WHERE user_id LIKE 'test-%' OR user_id LIKE 'e2e-%'",
      "DELETE FROM user_recommendations WHERE user_id LIKE 'test-%' OR user_id LIKE 'e2e-%'",
      "DELETE FROM user_interactions WHERE user_id LIKE 'test-%' OR user_id LIKE 'e2e-%'",
      "DELETE FROM conversion_tracking WHERE user_id LIKE 'test-%' OR user_id LIKE 'e2e-%'",
      "DELETE FROM traffic_clicks WHERE user_id LIKE 'test-%' OR user_id LIKE 'e2e-%'",
      "DELETE FROM affiliate_links WHERE user_id LIKE 'test-%' OR user_id LIKE 'e2e-%'",
      "DELETE FROM coupon_sync_logs WHERE coupon_id LIKE 'test-%' OR coupon_id LIKE 'e2e-%'",
      "DELETE FROM coupons WHERE id LIKE 'test-%' OR id LIKE 'e2e-%'",
      "DELETE FROM personal_channels WHERE user_id LIKE 'test-%' OR user_id LIKE 'e2e-%'",
      "DELETE FROM users WHERE id LIKE 'test-%' OR id LIKE 'e2e-%'",
      "DELETE FROM indian_stores WHERE id LIKE 'test-%' OR id LIKE 'e2e-%'"
    ];

    for (const query of cleanupQueries) {
      try {
        const result = await pool.query(query);
        if (result.rowCount && result.rowCount > 0) {
          console.log(`✅ Cleaned ${result.rowCount} rows from ${query.split(' ')[2]}`);
        }
      } catch (error) {
        console.warn(`⚠️  Cleanup query failed: ${query}`, error.message);
      }
    }

    // Reset sequences if needed
    try {
      await pool.query(`
        SELECT setval(pg_get_serial_sequence('users', 'id'), 1, false);
        SELECT setval(pg_get_serial_sequence('coupons', 'id'), 1, false);
      `);
    } catch (error) {
      // Ignore sequence reset errors
    }

    console.log('✅ Database cleanup completed');
  } catch (error) {
    console.error('❌ Database cleanup failed:', error);
  } finally {
    await pool.end();
  }
}

async function cleanupTestRedis() {
  console.log('🔴 Cleaning up test Redis...');
  
  if (!process.env.REDIS_URL) {
    console.log('⚠️  No Redis URL found, skipping Redis cleanup');
    return;
  }

  try {
    const client = createClient({
      url: process.env.REDIS_URL
    });

    await client.connect();
    
    // Get all test keys
    const testKeys = await client.keys('test:*');
    const e2eKeys = await client.keys('e2e:*');
    const allTestKeys = [...testKeys, ...e2eKeys];

    if (allTestKeys.length > 0) {
      await client.del(allTestKeys);
      console.log(`✅ Cleaned ${allTestKeys.length} Redis keys`);
    }

    // Clear the entire test database (since we're using database 1 for tests)
    await client.flushDb();
    
    await client.quit();
    
    console.log('✅ Redis cleanup completed');
  } catch (error) {
    console.error('❌ Redis cleanup failed:', error);
  }
}

function cleanupTestFiles() {
  console.log('📁 Cleaning up test files...');
  
  const cleanupPaths = [
    'temp/test',
    'uploads/test',
    'logs/test'
  ];

  cleanupPaths.forEach(dirPath => {
    const fullPath = path.join(__dirname, '../../../', dirPath);
    
    if (fs.existsSync(fullPath)) {
      try {
        // Remove all files in the directory
        const files = fs.readdirSync(fullPath);
        files.forEach(file => {
          const filePath = path.join(fullPath, file);
          if (fs.statSync(filePath).isFile()) {
            fs.unlinkSync(filePath);
          }
        });
        
        console.log(`✅ Cleaned directory: ${dirPath}`);
      } catch (error) {
        console.warn(`⚠️  Failed to clean directory ${dirPath}:`, error.message);
      }
    }
  });

  // Clean up specific test files
  const testFiles = [
    'test-reports/temp-*.json',
    'coverage/temp-*',
    'logs/test-*.log'
  ];

  testFiles.forEach(pattern => {
    try {
      // Simple pattern matching for cleanup
      const basePath = path.dirname(pattern);
      const fileName = path.basename(pattern);
      const fullBasePath = path.join(__dirname, '../../../', basePath);
      
      if (fs.existsSync(fullBasePath)) {
        const files = fs.readdirSync(fullBasePath);
        const matchingFiles = files.filter(file => {
          // Simple wildcard matching
          const regex = new RegExp(fileName.replace('*', '.*'));
          return regex.test(file);
        });
        
        matchingFiles.forEach(file => {
          const filePath = path.join(fullBasePath, file);
          fs.unlinkSync(filePath);
        });
        
        if (matchingFiles.length > 0) {
          console.log(`✅ Cleaned ${matchingFiles.length} files matching ${pattern}`);
        }
      }
    } catch (error) {
      console.warn(`⚠️  Failed to clean files matching ${pattern}:`, error.message);
    }
  });
}

// Cleanup function that can be called manually
export const manualCleanup = async () => {
  console.log('🧹 Running manual cleanup...');
  await globalTeardown();
};

// Emergency cleanup for stuck processes
export const emergencyCleanup = async () => {
  console.log('🚨 Running emergency cleanup...');
  
  try {
    // Force close all database connections
    if (global.testDbPool) {
      await global.testDbPool.end();
    }
    
    // Force close Redis connections
    if (global.testRedisClient) {
      await global.testRedisClient.quit();
    }
    
    // Kill any hanging processes
    process.exit(0);
  } catch (error) {
    console.error('❌ Emergency cleanup failed:', error);
    process.exit(1);
  }
};

// Handle process termination
process.on('SIGINT', emergencyCleanup);
process.on('SIGTERM', emergencyCleanup);
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception during teardown:', error);
  emergencyCleanup();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection during teardown:', reason);
  emergencyCleanup();
});
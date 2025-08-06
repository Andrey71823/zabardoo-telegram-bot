#!/usr/bin/env node

const { Pool } = require('pg');
const colors = require('colors');

async function verifyCouponSync() {
  console.log('🔍 Verifying Coupon Sync System...\n'.cyan.bold);

  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'zabardoo_test',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password'
  });

  const checks = [];

  try {
    // Check 1: Database tables exist
    console.log('📋 Checking database tables...'.yellow);
    
    const tableChecks = [
      'coupon_sync',
      'coupon_sync_status', 
      'sync_configuration'
    ];

    for (const table of tableChecks) {
      try {
        const result = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = $1
          )
        `, [table]);
        
        if (result.rows[0].exists) {
          console.log(`  ✅ Table ${table} exists`.green);
          checks.push({ name: `Table ${table}`, status: 'pass' });
        } else {
          console.log(`  ❌ Table ${table} missing`.red);
          checks.push({ name: `Table ${table}`, status: 'fail' });
        }
      } catch (error) {
        console.log(`  ❌ Error checking table ${table}: ${error.message}`.red);
        checks.push({ name: `Table ${table}`, status: 'error' });
      }
    }

    // Check 2: Required indexes exist
    console.log('\n📊 Checking database indexes...'.yellow);
    
    const indexChecks = [
      'idx_coupon_sync_external_id',
      'idx_coupon_sync_active',
      'idx_coupon_sync_popularity',
      'idx_coupon_sync_status_status',
      'idx_sync_config_enabled'
    ];

    for (const index of indexChecks) {
      try {
        const result = await pool.query(`
          SELECT EXISTS (
            SELECT FROM pg_indexes 
            WHERE indexname = $1
          )
        `, [index]);
        
        if (result.rows[0].exists) {
          console.log(`  ✅ Index ${index} exists`.green);
          checks.push({ name: `Index ${index}`, status: 'pass' });
        } else {
          console.log(`  ❌ Index ${index} missing`.red);
          checks.push({ name: `Index ${index}`, status: 'fail' });
        }
      } catch (error) {
        console.log(`  ❌ Error checking index ${index}: ${error.message}`.red);
        checks.push({ name: `Index ${index}`, status: 'error' });
      }
    }

    // Check 3: Required functions exist
    console.log('\n⚙️ Checking database functions...'.yellow);
    
    const functionChecks = [
      'update_updated_at_column',
      'cleanup_old_sync_records',
      'get_sync_stats'
    ];

    for (const func of functionChecks) {
      try {
        const result = await pool.query(`
          SELECT EXISTS (
            SELECT FROM pg_proc 
            WHERE proname = $1
          )
        `, [func]);
        
        if (result.rows[0].exists) {
          console.log(`  ✅ Function ${func} exists`.green);
          checks.push({ name: `Function ${func}`, status: 'pass' });
        } else {
          console.log(`  ❌ Function ${func} missing`.red);
          checks.push({ name: `Function ${func}`, status: 'fail' });
        }
      } catch (error) {
        console.log(`  ❌ Error checking function ${func}: ${error.message}`.red);
        checks.push({ name: `Function ${func}`, status: 'error' });
      }
    }

    // Check 4: Test basic CRUD operations
    console.log('\n🔧 Testing CRUD operations...'.yellow);
    
    try {
      // Test coupon creation
      const insertResult = await pool.query(`
        INSERT INTO coupon_sync (
          external_id, title, description, discount, discount_type,
          store, store_id, category, category_id, affiliate_url, original_url,
          start_date, end_date, source
        ) VALUES (
          'verify-test-001', 'Verification Test Coupon', 'Test description',
          '25% OFF', 'percentage', 'Test Store', 'test-store-001',
          'Test Category', 'test-cat-001', 'https://example.com/affiliate',
          'https://example.com/original', NOW(), NOW() + INTERVAL '7 days', 'api'
        ) RETURNING id
      `);
      
      const couponId = insertResult.rows[0].id;
      console.log(`  ✅ Coupon creation successful (ID: ${couponId})`.green);
      checks.push({ name: 'Coupon creation', status: 'pass' });

      // Test coupon retrieval
      const selectResult = await pool.query(`
        SELECT * FROM coupon_sync WHERE id = $1
      `, [couponId]);
      
      if (selectResult.rows.length > 0) {
        console.log(`  ✅ Coupon retrieval successful`.green);
        checks.push({ name: 'Coupon retrieval', status: 'pass' });
      } else {
        console.log(`  ❌ Coupon retrieval failed`.red);
        checks.push({ name: 'Coupon retrieval', status: 'fail' });
      }

      // Test coupon update
      const updateResult = await pool.query(`
        UPDATE coupon_sync 
        SET title = 'Updated Verification Test Coupon', popularity = 100
        WHERE id = $1
        RETURNING title, popularity, updated_at
      `, [couponId]);
      
      if (updateResult.rows.length > 0 && updateResult.rows[0].popularity === 100) {
        console.log(`  ✅ Coupon update successful`.green);
        checks.push({ name: 'Coupon update', status: 'pass' });
      } else {
        console.log(`  ❌ Coupon update failed`.red);
        checks.push({ name: 'Coupon update', status: 'fail' });
      }

      // Test sync status creation
      const syncStatusResult = await pool.query(`
        INSERT INTO coupon_sync_status (
          coupon_id, sync_type, status, attempts, max_attempts
        ) VALUES ($1, 'create', 'completed', 1, 3)
        RETURNING id
      `, [couponId]);
      
      if (syncStatusResult.rows.length > 0) {
        console.log(`  ✅ Sync status creation successful`.green);
        checks.push({ name: 'Sync status creation', status: 'pass' });
      } else {
        console.log(`  ❌ Sync status creation failed`.red);
        checks.push({ name: 'Sync status creation', status: 'fail' });
      }

      // Clean up test data
      await pool.query(`DELETE FROM coupon_sync_status WHERE coupon_id = $1`, [couponId]);
      await pool.query(`DELETE FROM coupon_sync WHERE id = $1`, [couponId]);
      console.log(`  ✅ Test data cleanup successful`.green);

    } catch (error) {
      console.log(`  ❌ CRUD operations test failed: ${error.message}`.red);
      checks.push({ name: 'CRUD operations', status: 'error' });
    }

    // Check 5: Test database functions
    console.log('\n🧮 Testing database functions...'.yellow);
    
    try {
      // Test get_sync_stats function
      const statsResult = await pool.query('SELECT * FROM get_sync_stats()');
      if (statsResult.rows.length > 0) {
        const stats = statsResult.rows[0];
        console.log(`  ✅ get_sync_stats function works`.green);
        console.log(`    Total coupons: ${stats.total_coupons}`.gray);
        console.log(`    Active coupons: ${stats.active_coupons}`.gray);
        console.log(`    Pending syncs: ${stats.pending_syncs}`.gray);
        checks.push({ name: 'get_sync_stats function', status: 'pass' });
      } else {
        console.log(`  ❌ get_sync_stats function failed`.red);
        checks.push({ name: 'get_sync_stats function', status: 'fail' });
      }
    } catch (error) {
      console.log(`  ❌ Database functions test failed: ${error.message}`.red);
      checks.push({ name: 'Database functions', status: 'error' });
    }

    // Check 6: Verify file structure
    console.log('\n📁 Checking file structure...'.yellow);
    
    const fs = require('fs');
    const path = require('path');
    
    const requiredFiles = [
      'src/models/CouponSync.ts',
      'src/repositories/CouponSyncRepository.ts',
      'src/services/coupon/CouponSyncService.ts',
      'src/__tests__/coupon-sync.test.ts',
      'database/migrations/004-create-coupon-sync-tables.sql'
    ];

    for (const file of requiredFiles) {
      try {
        if (fs.existsSync(path.join(process.cwd(), file))) {
          console.log(`  ✅ File ${file} exists`.green);
          checks.push({ name: `File ${file}`, status: 'pass' });
        } else {
          console.log(`  ❌ File ${file} missing`.red);
          checks.push({ name: `File ${file}`, status: 'fail' });
        }
      } catch (error) {
        console.log(`  ❌ Error checking file ${file}: ${error.message}`.red);
        checks.push({ name: `File ${file}`, status: 'error' });
      }
    }

    // Check 7: Verify TypeScript compilation
    console.log('\n🔧 Checking TypeScript compilation...'.yellow);
    
    try {
      const { execSync } = require('child_process');
      execSync('npx tsc --noEmit --skipLibCheck', { stdio: 'pipe' });
      console.log(`  ✅ TypeScript compilation successful`.green);
      checks.push({ name: 'TypeScript compilation', status: 'pass' });
    } catch (error) {
      console.log(`  ❌ TypeScript compilation failed`.red);
      console.log(`    ${error.message}`.gray);
      checks.push({ name: 'TypeScript compilation', status: 'fail' });
    }

    // Summary
    console.log('\n📊 Verification Summary'.cyan.bold);
    console.log('='.repeat(50).cyan);
    
    const passed = checks.filter(c => c.status === 'pass').length;
    const failed = checks.filter(c => c.status === 'fail').length;
    const errors = checks.filter(c => c.status === 'error').length;
    const total = checks.length;

    console.log(`Total checks: ${total}`.white);
    console.log(`Passed: ${passed}`.green);
    console.log(`Failed: ${failed}`.red);
    console.log(`Errors: ${errors}`.yellow);
    
    const successRate = ((passed / total) * 100).toFixed(1);
    console.log(`Success rate: ${successRate}%`.cyan);

    if (failed === 0 && errors === 0) {
      console.log('\n🎉 All verifications passed! Coupon Sync system is ready.'.green.bold);
      return true;
    } else {
      console.log('\n⚠️ Some verifications failed. Please check the issues above.'.yellow.bold);
      
      // Show failed checks
      const failedChecks = checks.filter(c => c.status !== 'pass');
      if (failedChecks.length > 0) {
        console.log('\n❌ Failed checks:'.red.bold);
        failedChecks.forEach(check => {
          console.log(`  • ${check.name} (${check.status})`.red);
        });
      }
      
      return false;
    }

  } catch (error) {
    console.error('❌ Verification failed with error:'.red.bold, error);
    return false;
  } finally {
    await pool.end();
  }
}

// Run verification
if (require.main === module) {
  verifyCouponSync()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Verification error:', error);
      process.exit(1);
    });
}

module.exports = { verifyCouponSync };
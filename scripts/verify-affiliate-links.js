#!/usr/bin/env node

const { Pool } = require('pg');
const colors = require('colors');

async function verifyAffiliateLinkSystem() {
  console.log('🔍 Verifying Affiliate Link System...\n'.cyan.bold);

  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'bazaarguru_test',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password'
  });

  const checks = [];

  try {
    // Check 1: Database tables exist
    console.log('📋 Checking database tables...'.yellow);
    
    const tableChecks = [
      'affiliate_stores',
      'affiliate_links',
      'link_clicks',
      'sub_id_mappings',
      'traffic_attribution'
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
      'idx_affiliate_stores_domain',
      'idx_affiliate_stores_active',
      'idx_affiliate_links_sub_id',
      'idx_affiliate_links_user_id',
      'idx_link_clicks_affiliate_link',
      'idx_sub_id_mappings_user_id'
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
      'get_affiliate_stats',
      'cleanup_old_affiliate_data',
      'get_conversion_report'
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
      // Test affiliate store creation
      const storeResult = await pool.query(`
        INSERT INTO affiliate_stores (
          name, domain, affiliate_network, tracking_template, commission_rate
        ) VALUES (
          'Verify Test Store', 'verifytest.com', 'Test Network',
          'https://affiliate.verifytest.com/track?url={original_url}&subid={sub_id}', 5.0
        ) RETURNING id
      `);
      
      const storeId = storeResult.rows[0].id;
      console.log(`  ✅ Affiliate store creation successful (ID: ${storeId})`.green);
      checks.push({ name: 'Affiliate store creation', status: 'pass' });

      // Test affiliate link creation
      const linkResult = await pool.query(`
        INSERT INTO affiliate_links (
          original_url, affiliate_url, telegram_sub_id, user_id, store_id,
          store_name, link_type, source
        ) VALUES (
          'https://verifytest.com/product/123',
          'https://affiliate.verifytest.com/track?url=https%3A%2F%2Fverifytest.com%2Fproduct%2F123&subid=verify_test',
          'verify_test_subid', 'user-verify-123', $1,
          'Verify Test Store', 'direct', 'personal_channel'
        ) RETURNING id
      `, [storeId]);
      
      const linkId = linkResult.rows[0].id;
      console.log(`  ✅ Affiliate link creation successful (ID: ${linkId})`.green);
      checks.push({ name: 'Affiliate link creation', status: 'pass' });

      // Test link click recording
      const clickResult = await pool.query(`
        INSERT INTO link_clicks (
          affiliate_link_id, user_id, telegram_sub_id, ip_address, device_info
        ) VALUES ($1, 'user-verify-123', 'verify_test_subid', '192.168.1.1', '{"platform": "test"}')
        RETURNING id
      `, [linkId]);
      
      const clickId = clickResult.rows[0].id;
      console.log(`  ✅ Link click recording successful (ID: ${clickId})`.green);
      checks.push({ name: 'Link click recording', status: 'pass' });

      // Test SubID mapping creation
      const mappingResult = await pool.query(`
        INSERT INTO sub_id_mappings (
          telegram_sub_id, user_id, source, metadata
        ) VALUES ('verify_mapping_subid', 'user-verify-123', 'test', '{"test": true}')
        RETURNING telegram_sub_id
      `);
      
      console.log(`  ✅ SubID mapping creation successful`.green);
      checks.push({ name: 'SubID mapping creation', status: 'pass' });

      // Clean up test data
      await pool.query(`DELETE FROM link_clicks WHERE id = $1`, [clickId]);
      await pool.query(`DELETE FROM affiliate_links WHERE id = $1`, [linkId]);
      await pool.query(`DELETE FROM affiliate_stores WHERE id = $1`, [storeId]);
      await pool.query(`DELETE FROM sub_id_mappings WHERE telegram_sub_id = 'verify_mapping_subid'`);
      console.log(`  ✅ Test data cleanup successful`.green);

    } catch (error) {
      console.log(`  ❌ CRUD operations test failed: ${error.message}`.red);
      checks.push({ name: 'CRUD operations', status: 'error' });
    }

    // Check 5: Test database functions
    console.log('\n🧮 Testing database functions...'.yellow);
    
    try {
      // Test get_affiliate_stats function
      const statsResult = await pool.query('SELECT * FROM get_affiliate_stats()');
      if (statsResult.rows.length > 0) {
        const stats = statsResult.rows[0];
        console.log(`  ✅ get_affiliate_stats function works`.green);
        console.log(`    Total links: ${stats.total_links}`.gray);
        console.log(`    Active links: ${stats.active_links}`.gray);
        console.log(`    Total clicks: ${stats.total_clicks}`.gray);
        console.log(`    Total conversions: ${stats.total_conversions}`.gray);
        checks.push({ name: 'get_affiliate_stats function', status: 'pass' });
      } else {
        console.log(`  ❌ get_affiliate_stats function failed`.red);
        checks.push({ name: 'get_affiliate_stats function', status: 'fail' });
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
      'src/models/AffiliateLink.ts',
      'src/repositories/AffiliateLinkRepository.ts',
      'src/services/affiliate/AffiliateLinkService.ts',
      'src/__tests__/affiliate-link.test.ts',
      'database/migrations/005-create-affiliate-link-tables.sql'
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

    // Check 8: Test sample affiliate stores data
    console.log('\n🏪 Checking sample affiliate stores...'.yellow);
    
    try {
      const storesResult = await pool.query('SELECT name, domain, commission_rate FROM affiliate_stores WHERE is_active = true');
      if (storesResult.rows.length > 0) {
        console.log(`  ✅ Found ${storesResult.rows.length} active affiliate stores`.green);
        storesResult.rows.forEach((store, index) => {
          console.log(`    ${index + 1}. ${store.name} (${store.domain}) - ${store.commission_rate}%`.gray);
        });
        checks.push({ name: 'Sample affiliate stores', status: 'pass' });
      } else {
        console.log(`  ⚠️ No affiliate stores found`.yellow);
        checks.push({ name: 'Sample affiliate stores', status: 'warn' });
      }
    } catch (error) {
      console.log(`  ❌ Error checking affiliate stores: ${error.message}`.red);
      checks.push({ name: 'Sample affiliate stores', status: 'error' });
    }

    // Summary
    console.log('\n📊 Verification Summary'.cyan.bold);
    console.log('='.repeat(50).cyan);
    
    const passed = checks.filter(c => c.status === 'pass').length;
    const failed = checks.filter(c => c.status === 'fail').length;
    const errors = checks.filter(c => c.status === 'error').length;
    const warnings = checks.filter(c => c.status === 'warn').length;
    const total = checks.length;

    console.log(`Total checks: ${total}`.white);
    console.log(`Passed: ${passed}`.green);
    console.log(`Failed: ${failed}`.red);
    console.log(`Errors: ${errors}`.yellow);
    console.log(`Warnings: ${warnings}`.yellow);
    
    const successRate = ((passed / total) * 100).toFixed(1);
    console.log(`Success rate: ${successRate}%`.cyan);

    if (failed === 0 && errors === 0) {
      console.log('\n🎉 All verifications passed! Affiliate Link system is ready.'.green.bold);
      return true;
    } else {
      console.log('\n⚠️ Some verifications failed. Please check the issues above.'.yellow.bold);
      
      // Show failed checks
      const failedChecks = checks.filter(c => c.status !== 'pass' && c.status !== 'warn');
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
  verifyAffiliateLinkSystem()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Verification error:', error);
      process.exit(1);
    });
}

module.exports = { verifyAffiliateLinkSystem };
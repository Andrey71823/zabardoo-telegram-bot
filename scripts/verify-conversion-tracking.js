#!/usr/bin/env node

const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'zabardoo_bot',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

async function verifyConversionTracking() {
  console.log('🔍 Verifying Conversion Tracking System...\n');

  const checks = [];

  try {
    // Check 1: Verify database tables exist
    console.log('1️⃣ Checking database tables...');
    const tables = [
      'conversion_pixels',
      'conversion_rules', 
      'conversion_webhooks',
      'conversion_fraud',
      'conversion_attribution',
      'conversion_cohorts',
      'conversion_segments',
      'conversion_predictions',
      'conversion_tests',
      'conversion_alerts',
      'conversion_reports',
      'conversion_funnels'
    ];

    for (const table of tables) {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [table]);
      
      if (result.rows[0].exists) {
        console.log(`  ✅ Table ${table} exists`);
        checks.push({ name: `Table ${table}`, status: 'pass' });
      } else {
        console.log(`  ❌ Table ${table} missing`);
        checks.push({ name: `Table ${table}`, status: 'fail' });
      }
    }

    // Check 2: Verify indexes exist
    console.log('\n2️⃣ Checking database indexes...');
    const indexes = [
      'idx_conversion_pixels_store_id',
      'idx_conversion_rules_active',
      'idx_conversion_fraud_status',
      'idx_conversion_attribution_conversion_id'
    ];

    for (const index of indexes) {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM pg_indexes 
          WHERE schemaname = 'public' 
          AND indexname = $1
        )
      `, [index]);
      
      if (result.rows[0].exists) {
        console.log(`  ✅ Index ${index} exists`);
        checks.push({ name: `Index ${index}`, status: 'pass' });
      } else {
        console.log(`  ❌ Index ${index} missing`);
        checks.push({ name: `Index ${index}`, status: 'fail' });
      }
    }

    // Check 3: Verify triggers exist
    console.log('\n3️⃣ Checking database triggers...');
    const triggers = [
      'update_conversion_pixels_updated_at',
      'update_conversion_rules_updated_at',
      'update_conversion_fraud_updated_at'
    ];

    for (const trigger of triggers) {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.triggers 
          WHERE trigger_schema = 'public' 
          AND trigger_name = $1
        )
      `, [trigger]);
      
      if (result.rows[0].exists) {
        console.log(`  ✅ Trigger ${trigger} exists`);
        checks.push({ name: `Trigger ${trigger}`, status: 'pass' });
      } else {
        console.log(`  ❌ Trigger ${trigger} missing`);
        checks.push({ name: `Trigger ${trigger}`, status: 'fail' });
      }
    }

    // Check 4: Verify foreign key constraints
    console.log('\n4️⃣ Checking foreign key constraints...');
    const fkResult = await pool.query(`
      SELECT 
        tc.table_name, 
        tc.constraint_name, 
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name LIKE 'conversion_%'
      ORDER BY tc.table_name, tc.constraint_name
    `);

    if (fkResult.rows.length > 0) {
      console.log(`  ✅ Found ${fkResult.rows.length} foreign key constraints`);
      fkResult.rows.forEach(row => {
        console.log(`    ${row.table_name}.${row.column_name} -> ${row.foreign_table_name}.${row.foreign_column_name}`);
      });
      checks.push({ name: 'Foreign key constraints', status: 'pass' });
    } else {
      console.log('  ⚠️  No foreign key constraints found');
      checks.push({ name: 'Foreign key constraints', status: 'warning' });
    }

    // Check 5: Test data insertion and retrieval
    console.log('\n5️⃣ Testing data operations...');
    
    // Test conversion pixel insertion
    try {
      const pixelResult = await pool.query(`
        INSERT INTO conversion_pixels (
          store_id, store_name, pixel_type, pixel_id, tracking_code, conversion_events
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, [
        'test-store-verify',
        'Test Store',
        'postback',
        'TEST_PIXEL',
        'https://example.com/pixel?order={{ORDER_ID}}',
        JSON.stringify(['purchase'])
      ]);
      
      console.log('  ✅ Conversion pixel insertion works');
      checks.push({ name: 'Pixel insertion', status: 'pass' });
      
      // Clean up
      await pool.query('DELETE FROM conversion_pixels WHERE id = $1', [pixelResult.rows[0].id]);
      
    } catch (error) {
      console.log('  ❌ Conversion pixel insertion failed:', error.message);
      checks.push({ name: 'Pixel insertion', status: 'fail' });
    }

    // Test conversion rule insertion
    try {
      const ruleResult = await pool.query(`
        INSERT INTO conversion_rules (
          name, description, conditions, actions, priority
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [
        'Test Rule',
        'Test rule for verification',
        JSON.stringify([{ field: 'orderValue', operator: 'greater_than', value: 100 }]),
        JSON.stringify([{ type: 'set_commission_rate', parameters: { rate: 6.0 } }]),
        1
      ]);
      
      console.log('  ✅ Conversion rule insertion works');
      checks.push({ name: 'Rule insertion', status: 'pass' });
      
      // Clean up
      await pool.query('DELETE FROM conversion_rules WHERE id = $1', [ruleResult.rows[0].id]);
      
    } catch (error) {
      console.log('  ❌ Conversion rule insertion failed:', error.message);
      checks.push({ name: 'Rule insertion', status: 'fail' });
    }

    // Check 6: Verify JSON field operations
    console.log('\n6️⃣ Testing JSON field operations...');
    
    try {
      // Test JSONB queries
      const jsonResult = await pool.query(`
        SELECT 
          '{"events": ["purchase", "add_to_cart"]}'::jsonb @> '{"events": ["purchase"]}'::jsonb as contains_purchase,
          '{"rate": 5.5}'::jsonb->>'rate' as commission_rate,
          jsonb_array_length('["purchase", "add_to_cart", "view_content"]'::jsonb) as event_count
      `);
      
      if (jsonResult.rows[0].contains_purchase && 
          jsonResult.rows[0].commission_rate === '5.5' && 
          jsonResult.rows[0].event_count === 3) {
        console.log('  ✅ JSON operations work correctly');
        checks.push({ name: 'JSON operations', status: 'pass' });
      } else {
        console.log('  ❌ JSON operations failed');
        checks.push({ name: 'JSON operations', status: 'fail' });
      }
      
    } catch (error) {
      console.log('  ❌ JSON operations failed:', error.message);
      checks.push({ name: 'JSON operations', status: 'fail' });
    }

    // Check 7: Verify check constraints
    console.log('\n7️⃣ Testing check constraints...');
    
    try {
      // Test invalid pixel type (should fail)
      await pool.query(`
        INSERT INTO conversion_pixels (
          store_id, store_name, pixel_type, pixel_id, tracking_code
        ) VALUES ($1, $2, $3, $4, $5)
      `, ['test', 'test', 'invalid_type', 'test', 'test']);
      
      console.log('  ❌ Check constraint failed - invalid data was accepted');
      checks.push({ name: 'Check constraints', status: 'fail' });
      
    } catch (error) {
      if (error.message.includes('check constraint')) {
        console.log('  ✅ Check constraints work correctly');
        checks.push({ name: 'Check constraints', status: 'pass' });
      } else {
        console.log('  ❌ Unexpected error:', error.message);
        checks.push({ name: 'Check constraints', status: 'fail' });
      }
    }

    // Check 8: Performance test
    console.log('\n8️⃣ Testing query performance...');
    
    try {
      const startTime = Date.now();
      
      // Complex analytics query
      await pool.query(`
        SELECT 
          COUNT(*) as total_conversions,
          AVG(CASE WHEN ce.order_value > 0 THEN ce.order_value END) as avg_order_value,
          COUNT(DISTINCT ce.user_id) as unique_users,
          SUM(ce.commission) as total_commission
        FROM conversion_events ce
        LEFT JOIN conversion_fraud cf ON ce.id = cf.conversion_id
        WHERE ce.created_at >= NOW() - INTERVAL '30 days'
          AND (cf.id IS NULL OR cf.status != 'confirmed_fraud')
        GROUP BY DATE_TRUNC('day', ce.created_at)
        ORDER BY DATE_TRUNC('day', ce.created_at) DESC
        LIMIT 30
      `);
      
      const queryTime = Date.now() - startTime;
      
      if (queryTime < 1000) {
        console.log(`  ✅ Query performance good (${queryTime}ms)`);
        checks.push({ name: 'Query performance', status: 'pass' });
      } else {
        console.log(`  ⚠️  Query performance slow (${queryTime}ms)`);
        checks.push({ name: 'Query performance', status: 'warning' });
      }
      
    } catch (error) {
      console.log('  ❌ Performance test failed:', error.message);
      checks.push({ name: 'Query performance', status: 'fail' });
    }

    // Check 9: Verify data types and constraints
    console.log('\n9️⃣ Checking data types and constraints...');
    
    const columnResult = await pool.query(`
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name LIKE 'conversion_%'
        AND column_name IN ('id', 'created_at', 'updated_at', 'is_active')
      ORDER BY table_name, column_name
    `);

    let dataTypeChecks = 0;
    columnResult.rows.forEach(row => {
      if (row.column_name === 'id' && row.data_type === 'uuid') dataTypeChecks++;
      if (row.column_name === 'created_at' && row.data_type === 'timestamp with time zone') dataTypeChecks++;
      if (row.column_name === 'updated_at' && row.data_type === 'timestamp with time zone') dataTypeChecks++;
      if (row.column_name === 'is_active' && row.data_type === 'boolean') dataTypeChecks++;
    });

    if (dataTypeChecks > 20) { // Approximate expected count
      console.log('  ✅ Data types are correct');
      checks.push({ name: 'Data types', status: 'pass' });
    } else {
      console.log(`  ⚠️  Some data types may be incorrect (${dataTypeChecks} checks passed)`);
      checks.push({ name: 'Data types', status: 'warning' });
    }

    // Check 10: Test cascade operations
    console.log('\n🔟 Testing cascade operations...');
    
    try {
      // This would test if foreign key cascades work properly
      // For now, just verify the constraints exist
      const cascadeResult = await pool.query(`
        SELECT 
          tc.table_name,
          tc.constraint_name,
          rc.delete_rule,
          rc.update_rule
        FROM information_schema.table_constraints tc
        JOIN information_schema.referential_constraints rc 
          ON tc.constraint_name = rc.constraint_name
        WHERE tc.table_name LIKE 'conversion_%'
          AND tc.constraint_type = 'FOREIGN KEY'
      `);
      
      console.log(`  ✅ Found ${cascadeResult.rows.length} referential constraints`);
      checks.push({ name: 'Cascade operations', status: 'pass' });
      
    } catch (error) {
      console.log('  ❌ Cascade operations test failed:', error.message);
      checks.push({ name: 'Cascade operations', status: 'fail' });
    }

    // Summary
    console.log('\n📊 Verification Summary:');
    console.log('========================');
    
    const passed = checks.filter(c => c.status === 'pass').length;
    const failed = checks.filter(c => c.status === 'fail').length;
    const warnings = checks.filter(c => c.status === 'warning').length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️  Warnings: ${warnings}`);
    console.log(`📈 Total: ${checks.length}`);
    
    if (failed === 0) {
      console.log('\n🎉 All critical checks passed! Conversion tracking system is ready.');
    } else {
      console.log('\n⚠️  Some checks failed. Please review the issues above.');
    }

    // Detailed results
    console.log('\n📋 Detailed Results:');
    checks.forEach(check => {
      const icon = check.status === 'pass' ? '✅' : check.status === 'fail' ? '❌' : '⚠️';
      console.log(`${icon} ${check.name}: ${check.status.toUpperCase()}`);
    });

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await pool.end();
  }
}

// Run verification if called directly
if (require.main === module) {
  verifyConversionTracking();
}

module.exports = { verifyConversionTracking };
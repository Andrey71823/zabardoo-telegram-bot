#!/usr/bin/env node

const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'bazaarguru_bot',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

async function verifyTrafficAnalytics() {
  console.log('🔍 Verifying Traffic Analytics System...\n');

  const checks = [];

  try {
    // Check 1: Verify analytics tables exist
    console.log('1️⃣ Checking analytics tables...');
    const tables = [
      'traffic_dashboards',
      'traffic_reports',
      'ab_tests',
      'channel_performance',
      'user_journeys',
      'roi_analysis',
      'analytics_alerts',
      'analytics_insights',
      'data_exports',
      'analytics_sessions',
      'analytics_events'
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

    // Check 2: Verify materialized views exist
    console.log('\n2️⃣ Checking materialized views...');
    const views = [
      'daily_traffic_summary',
      'channel_performance_summary'
    ];

    for (const view of views) {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM pg_matviews 
          WHERE schemaname = 'public' 
          AND matviewname = $1
        )
      `, [view]);
      
      if (result.rows[0].exists) {
        console.log(`  ✅ Materialized view ${view} exists`);
        checks.push({ name: `Materialized view ${view}`, status: 'pass' });
      } else {
        console.log(`  ❌ Materialized view ${view} missing`);
        checks.push({ name: `Materialized view ${view}`, status: 'fail' });
      }
    }

    // Check 3: Verify indexes exist
    console.log('\n3️⃣ Checking analytics indexes...');
    const indexes = [
      'idx_traffic_dashboards_owner',
      'idx_ab_tests_status',
      'idx_channel_performance_channel',
      'idx_user_journeys_user',
      'idx_analytics_alerts_active',
      'idx_analytics_insights_status',
      'idx_analytics_sessions_user',
      'idx_analytics_events_session'
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

    // Check 4: Verify GIN indexes for JSONB columns
    console.log('\n4️⃣ Checking GIN indexes...');
    const ginIndexes = [
      'idx_traffic_dashboards_widgets',
      'idx_ab_tests_variants',
      'idx_channel_performance_metrics',
      'idx_user_journeys_touchpoints',
      'idx_analytics_insights_evidence'
    ];

    for (const index of ginIndexes) {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM pg_indexes 
          WHERE schemaname = 'public' 
          AND indexname = $1
          AND indexdef LIKE '%USING gin%'
        )
      `, [index]);
      
      if (result.rows[0].exists) {
        console.log(`  ✅ GIN index ${index} exists`);
        checks.push({ name: `GIN index ${index}`, status: 'pass' });
      } else {
        console.log(`  ❌ GIN index ${index} missing`);
        checks.push({ name: `GIN index ${index}`, status: 'fail' });
      }
    }

    // Check 5: Test dashboard operations
    console.log('\n5️⃣ Testing dashboard operations...');
    
    try {
      // Test dashboard insertion
      const dashboardResult = await pool.query(`
        INSERT INTO traffic_dashboards (
          name, description, dashboard_type, date_range, owner_id
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [
        'Test Dashboard',
        'Verification test dashboard',
        'overview',
        JSON.stringify({ startDate: '2024-01-01', endDate: '2024-01-31' }),
        'test-user'
      ]);
      
      console.log('  ✅ Dashboard insertion works');
      checks.push({ name: 'Dashboard insertion', status: 'pass' });
      
      // Test dashboard query
      const queryResult = await pool.query(`
        SELECT * FROM traffic_dashboards WHERE id = $1
      `, [dashboardResult.rows[0].id]);
      
      if (queryResult.rows.length > 0) {
        console.log('  ✅ Dashboard query works');
        checks.push({ name: 'Dashboard query', status: 'pass' });
      }
      
      // Clean up
      await pool.query('DELETE FROM traffic_dashboards WHERE id = $1', [dashboardResult.rows[0].id]);
      
    } catch (error) {
      console.log('  ❌ Dashboard operations failed:', error.message);
      checks.push({ name: 'Dashboard operations', status: 'fail' });
    }

    // Check 6: Test A/B test operations
    console.log('\n6️⃣ Testing A/B test operations...');
    
    try {
      const abTestResult = await pool.query(`
        INSERT INTO ab_tests (
          name, description, test_type, status, start_date, target_metric,
          variants, success_criteria, statistical_settings
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `, [
        'Test A/B Test',
        'Verification test',
        'ui_variation',
        'draft',
        new Date(),
        'conversion_rate',
        JSON.stringify([
          { id: 'control', name: 'Control', isControl: true, trafficWeight: 50 },
          { id: 'variant', name: 'Variant', isControl: false, trafficWeight: 50 }
        ]),
        JSON.stringify({ primaryMetric: 'conversion_rate', significanceLevel: 0.05 }),
        JSON.stringify({ confidenceLevel: 95, testType: 'two_tailed' })
      ]);
      
      console.log('  ✅ A/B test insertion works');
      checks.push({ name: 'A/B test insertion', status: 'pass' });
      
      // Clean up
      await pool.query('DELETE FROM ab_tests WHERE id = $1', [abTestResult.rows[0].id]);
      
    } catch (error) {
      console.log('  ❌ A/B test operations failed:', error.message);
      checks.push({ name: 'A/B test operations', status: 'fail' });
    }

    // Check 7: Test JSONB operations
    console.log('\n7️⃣ Testing JSONB operations...');
    
    try {
      // Test JSONB queries
      const jsonResult = await pool.query(`
        SELECT 
          '{"widgets": [{"type": "chart", "title": "Revenue"}]}'::jsonb @> '{"widgets": [{"type": "chart"}]}'::jsonb as contains_chart,
          '{"metrics": {"revenue": 1000, "conversions": 50}}'::jsonb->>'metrics' as metrics_json,
          jsonb_array_length('["control", "variant", "test"]'::jsonb) as variant_count,
          '{"conditions": [{"type": "threshold", "value": 100}]}'::jsonb #> '{conditions,0,value}' as condition_value
      `);
      
      const row = jsonResult.rows[0];
      if (row.contains_chart && row.variant_count === 3 && row.condition_value === '100') {
        console.log('  ✅ JSONB operations work correctly');
        checks.push({ name: 'JSONB operations', status: 'pass' });
      } else {
        console.log('  ❌ JSONB operations failed');
        checks.push({ name: 'JSONB operations', status: 'fail' });
      }
      
    } catch (error) {
      console.log('  ❌ JSONB operations failed:', error.message);
      checks.push({ name: 'JSONB operations', status: 'fail' });
    }

    // Check 8: Test check constraints
    console.log('\n8️⃣ Testing check constraints...');
    
    try {
      // Test invalid dashboard type (should fail)
      await pool.query(`
        INSERT INTO traffic_dashboards (
          name, dashboard_type, date_range, owner_id
        ) VALUES ($1, $2, $3, $4)
      `, ['Test', 'invalid_type', '{}', 'test']);
      
      console.log('  ❌ Check constraint failed - invalid data was accepted');
      checks.push({ name: 'Check constraints', status: 'fail' });
      
    } catch (error) {
      if (error.message.includes('check constraint') || error.message.includes('invalid input value')) {
        console.log('  ✅ Check constraints work correctly');
        checks.push({ name: 'Check constraints', status: 'pass' });
      } else {
        console.log('  ❌ Unexpected error:', error.message);
        checks.push({ name: 'Check constraints', status: 'fail' });
      }
    }

    // Check 9: Test materialized view refresh
    console.log('\n9️⃣ Testing materialized view refresh...');
    
    try {
      const startTime = Date.now();
      
      await pool.query('REFRESH MATERIALIZED VIEW daily_traffic_summary');
      await pool.query('REFRESH MATERIALIZED VIEW channel_performance_summary');
      
      const refreshTime = Date.now() - startTime;
      
      console.log(`  ✅ Materialized views refreshed successfully (${refreshTime}ms)`);
      checks.push({ name: 'Materialized view refresh', status: 'pass' });
      
      // Test querying materialized views
      const viewResult = await pool.query('SELECT COUNT(*) FROM daily_traffic_summary');
      console.log(`  ✅ Daily traffic summary has ${viewResult.rows[0].count} records`);
      
    } catch (error) {
      console.log('  ❌ Materialized view refresh failed:', error.message);
      checks.push({ name: 'Materialized view refresh', status: 'fail' });
    }

    // Check 10: Test analytics functions
    console.log('\n🔟 Testing analytics functions...');
    
    try {
      // Test refresh function
      await pool.query('SELECT refresh_analytics_views()');
      
      console.log('  ✅ Analytics refresh function works');
      checks.push({ name: 'Analytics functions', status: 'pass' });
      
    } catch (error) {
      console.log('  ❌ Analytics functions failed:', error.message);
      checks.push({ name: 'Analytics functions', status: 'fail' });
    }

    // Check 11: Test complex analytics queries
    console.log('\n1️⃣1️⃣ Testing complex analytics queries...');
    
    try {
      const startTime = Date.now();
      
      // Complex aggregation query
      const complexResult = await pool.query(`
        WITH daily_stats AS (
          SELECT 
            DATE(ce.click_time) as date,
            ce.source,
            COUNT(DISTINCT ce.click_id) as clicks,
            COUNT(DISTINCT conv.id) as conversions,
            COALESCE(SUM(conv.order_value), 0) as revenue
          FROM click_events ce
          LEFT JOIN conversion_events conv ON ce.click_id = conv.click_id
          WHERE ce.click_time >= CURRENT_DATE - INTERVAL '30 days'
          GROUP BY DATE(ce.click_time), ce.source
        ),
        channel_performance AS (
          SELECT 
            source,
            SUM(clicks) as total_clicks,
            SUM(conversions) as total_conversions,
            SUM(revenue) as total_revenue,
            CASE 
              WHEN SUM(clicks) > 0 
              THEN ROUND((SUM(conversions)::decimal / SUM(clicks) * 100), 2)
              ELSE 0 
            END as conversion_rate
          FROM daily_stats
          GROUP BY source
        )
        SELECT 
          cp.*,
          RANK() OVER (ORDER BY total_revenue DESC) as revenue_rank,
          PERCENT_RANK() OVER (ORDER BY conversion_rate) as conversion_percentile
        FROM channel_performance cp
        WHERE total_clicks > 0
        ORDER BY total_revenue DESC
        LIMIT 10
      `);
      
      const queryTime = Date.now() - startTime;
      
      if (queryTime < 5000) {
        console.log(`  ✅ Complex analytics query performance good (${queryTime}ms)`);
        checks.push({ name: 'Complex query performance', status: 'pass' });
      } else {
        console.log(`  ⚠️  Complex analytics query performance slow (${queryTime}ms)`);
        checks.push({ name: 'Complex query performance', status: 'warning' });
      }
      
      console.log(`  📊 Query returned ${complexResult.rows.length} results`);
      
    } catch (error) {
      console.log('  ❌ Complex analytics queries failed:', error.message);
      checks.push({ name: 'Complex query performance', status: 'fail' });
    }

    // Check 12: Test foreign key relationships
    console.log('\n1️⃣2️⃣ Testing foreign key relationships...');
    
    try {
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
          AND (tc.table_name LIKE 'analytics_%' OR tc.table_name LIKE 'traffic_%' OR tc.table_name = 'user_journeys')
        ORDER BY tc.table_name, tc.constraint_name
      `);

      if (fkResult.rows.length > 0) {
        console.log(`  ✅ Found ${fkResult.rows.length} foreign key constraints`);
        fkResult.rows.forEach(row => {
          console.log(`    ${row.table_name}.${row.column_name} -> ${row.foreign_table_name}.${row.foreign_column_name}`);
        });
        checks.push({ name: 'Foreign key relationships', status: 'pass' });
      } else {
        console.log('  ⚠️  No foreign key constraints found');
        checks.push({ name: 'Foreign key relationships', status: 'warning' });
      }
      
    } catch (error) {
      console.log('  ❌ Foreign key relationship test failed:', error.message);
      checks.push({ name: 'Foreign key relationships', status: 'fail' });
    }

    // Check 13: Test data types and constraints
    console.log('\n1️⃣3️⃣ Checking data types and constraints...');
    
    const columnResult = await pool.query(`
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND (table_name LIKE 'traffic_%' OR table_name LIKE 'analytics_%' OR table_name = 'user_journeys' OR table_name = 'ab_tests')
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

    if (dataTypeChecks > 15) { // Approximate expected count
      console.log('  ✅ Data types are correct');
      checks.push({ name: 'Data types', status: 'pass' });
    } else {
      console.log(`  ⚠️  Some data types may be incorrect (${dataTypeChecks} checks passed)`);
      checks.push({ name: 'Data types', status: 'warning' });
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
      console.log('\n🎉 All critical checks passed! Traffic analytics system is ready.');
    } else {
      console.log('\n⚠️  Some checks failed. Please review the issues above.');
    }

    // Detailed results
    console.log('\n📋 Detailed Results:');
    checks.forEach(check => {
      const icon = check.status === 'pass' ? '✅' : check.status === 'fail' ? '❌' : '⚠️';
      console.log(`${icon} ${check.name}: ${check.status.toUpperCase()}`);
    });

    // Performance recommendations
    console.log('\n🚀 Performance Recommendations:');
    console.log('- Consider partitioning large analytics tables by date');
    console.log('- Set up automated materialized view refresh schedule');
    console.log('- Monitor query performance and add indexes as needed');
    console.log('- Implement data retention policies for old analytics data');
    console.log('- Consider using read replicas for heavy analytics queries');

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await pool.end();
  }
}

// Run verification if called directly
if (require.main === module) {
  verifyTrafficAnalytics();
}

module.exports = { verifyTrafficAnalytics };
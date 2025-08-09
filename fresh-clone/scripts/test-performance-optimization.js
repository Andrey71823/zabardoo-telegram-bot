#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3010'; // Admin server for testing

console.log('🚀 Starting Performance Optimization System Tests...\n');

// Test data
const testQueries = [
  {
    name: 'User lookup by ID',
    query: 'SELECT * FROM users WHERE id = $1',
    params: ['user123'],
    expectedTime: 50
  },
  {
    name: 'Coupons by store',
    query: 'SELECT * FROM coupons WHERE store_id = $1 AND status = $2',
    params: ['store456', 'active'],
    expectedTime: 200
  },
  {
    name: 'Analytics aggregation',
    query: 'SELECT COUNT(*), AVG(amount) FROM transactions WHERE created_at >= $1',
    params: ['2024-01-01'],
    expectedTime: 1500
  },
  {
    name: 'Complex join query',
    query: 'SELECT u.*, p.*, c.* FROM users u JOIN profiles p ON u.id = p.user_id JOIN campaigns c ON u.id = c.user_id',
    params: [],
    expectedTime: 3000
  }
];

const cacheTestData = [
  {
    key: 'user:123',
    value: { id: '123', name: 'John Doe', email: 'john@example.com' },
    ttl: 1800
  },
  {
    key: 'coupons:active',
    value: [
      { id: 'coupon1', discount: 20, store: 'Flipkart' },
      { id: 'coupon2', discount: 15, store: 'Amazon' }
    ],
    ttl: 600
  },
  {
    key: 'analytics:dashboard',
    value: {
      totalUsers: 1247,
      totalCoupons: 3456,
      totalRevenue: 45678
    },
    ttl: 300
  }
];

// Test functions
async function testCacheOperations() {
  console.log('🗄️  Testing Cache Operations...\n');
  
  try {
    // Test cache set operations
    console.log('1. Testing cache SET operations...');
    for (const testData of cacheTestData) {
      try {
        const response = await axios.post(`${BASE_URL}/api/test/cache/set`, {
          key: testData.key,
          value: testData.value,
          ttl: testData.ttl
        });
        
        if (response.data.success) {
          console.log(`   ✅ SET ${testData.key}: Success`);
        } else {
          console.log(`   ❌ SET ${testData.key}: Failed - ${response.data.error}`);
        }
      } catch (error) {
        console.log(`   ❌ SET ${testData.key}: Error - ${error.message}`);
      }
    }

    // Test cache get operations
    console.log('\n2. Testing cache GET operations...');
    for (const testData of cacheTestData) {
      try {
        const response = await axios.get(`${BASE_URL}/api/test/cache/get/${encodeURIComponent(testData.key)}`);
        
        if (response.data.success && response.data.data) {
          console.log(`   ✅ GET ${testData.key}: Cache hit`);
          console.log(`      Data: ${JSON.stringify(response.data.data).substring(0, 100)}...`);
        } else {
          console.log(`   ❌ GET ${testData.key}: Cache miss`);
        }
      } catch (error) {
        console.log(`   ❌ GET ${testData.key}: Error - ${error.message}`);
      }
    }

    // Test cache statistics
    console.log('\n3. Testing cache statistics...');
    try {
      const response = await axios.get(`${BASE_URL}/api/test/cache/stats`);
      
      if (response.data.success) {
        const stats = response.data.data;
        console.log('   ✅ Cache Statistics:');
        console.log(`      Hits: ${stats.hits}`);
        console.log(`      Misses: ${stats.misses}`);
        console.log(`      Hit Rate: ${stats.hitRate.toFixed(2)}%`);
        console.log(`      Errors: ${stats.errors}`);
      }
    } catch (error) {
      console.log(`   ❌ Cache stats error: ${error.message}`);
    }

    // Test cache health
    console.log('\n4. Testing cache health check...');
    try {
      const response = await axios.get(`${BASE_URL}/api/test/cache/health`);
      
      if (response.data.success) {
        const health = response.data.data;
        console.log(`   ✅ Cache Health: ${health.status}`);
        console.log(`      Redis: ${health.redis ? 'Connected' : 'Disconnected'}`);
        if (health.info) {
          console.log(`      Info: ${health.info}`);
        }
      }
    } catch (error) {
      console.log(`   ❌ Cache health error: ${error.message}`);
    }

  } catch (error) {
    console.error('❌ Cache operations test failed:', error.message);
  }
}

async function testQueryOptimization() {
  console.log('🔍 Testing Query Optimization...\n');
  
  try {
    // Simulate query executions
    console.log('1. Simulating query executions...');
    for (const testQuery of testQueries) {
      try {
        const response = await axios.post(`${BASE_URL}/api/test/query/execute`, {
          query: testQuery.query,
          params: testQuery.params,
          simulatedTime: testQuery.expectedTime
        });
        
        if (response.data.success) {
          console.log(`   ✅ ${testQuery.name}: ${response.data.executionTime}ms`);
          if (response.data.executionTime > 1000) {
            console.log(`      ⚠️  Slow query detected!`);
          }
        }
      } catch (error) {
        console.log(`   ❌ ${testQuery.name}: Error - ${error.message}`);
      }
    }

    // Get query performance statistics
    console.log('\n2. Getting query performance statistics...');
    try {
      const response = await axios.get(`${BASE_URL}/api/test/query/stats`);
      
      if (response.data.success) {
        const stats = response.data.data;
        console.log('   ✅ Query Performance Statistics:');
        console.log(`      Total Queries: ${stats.totalQueries}`);
        console.log(`      Slow Queries: ${stats.slowQueries}`);
        console.log(`      Average Execution Time: ${stats.averageExecutionTime.toFixed(2)}ms`);
        console.log(`      Slow Query Percentage: ${stats.slowQueryPercentage.toFixed(2)}%`);
        
        if (stats.topSlowQueries.length > 0) {
          console.log('      Top Slow Queries:');
          stats.topSlowQueries.slice(0, 3).forEach((query, index) => {
            console.log(`        ${index + 1}. ${query.executionTime}ms - ${query.query.substring(0, 50)}...`);
          });
        }
      }
    } catch (error) {
      console.log(`   ❌ Query stats error: ${error.message}`);
    }

    // Get optimization suggestions
    console.log('\n3. Getting optimization suggestions...');
    try {
      const response = await axios.get(`${BASE_URL}/api/test/query/analyze`);
      
      if (response.data.success) {
        const analysis = response.data.data;
        console.log('   ✅ Query Analysis Results:');
        
        if (analysis.suggestions.length > 0) {
          console.log('      Optimization Suggestions:');
          analysis.suggestions.slice(0, 5).forEach((suggestion, index) => {
            console.log(`        ${index + 1}. [${suggestion.impact.toUpperCase()}] ${suggestion.type}`);
            console.log(`           ${suggestion.description}`);
            console.log(`           Suggestion: ${suggestion.suggestion.substring(0, 80)}...`);
          });
        }
        
        if (analysis.frequentQueries.length > 0) {
          console.log('      Most Frequent Queries:');
          analysis.frequentQueries.slice(0, 3).forEach((query, index) => {
            console.log(`        ${index + 1}. ${query.count} times, avg ${query.avgTime.toFixed(2)}ms`);
            console.log(`           ${query.query.substring(0, 60)}...`);
          });
        }
      }
    } catch (error) {
      console.log(`   ❌ Query analysis error: ${error.message}`);
    }

    // Generate optimization report
    console.log('\n4. Generating optimization report...');
    try {
      const response = await axios.get(`${BASE_URL}/api/test/query/report`);
      
      if (response.data.success) {
        const report = response.data.data;
        console.log('   ✅ Optimization Report Generated:');
        console.log(`      Report Period: ${report.summary.dataCollectionPeriod?.start} to ${report.summary.dataCollectionPeriod?.end}`);
        console.log(`      Total Recommendations: ${report.recommendations.length}`);
        console.log(`      Index Suggestions: ${report.indexSuggestions.length}`);
        
        if (report.indexSuggestions.length > 0) {
          console.log('      Recommended Indexes:');
          report.indexSuggestions.slice(0, 3).forEach((suggestion, index) => {
            console.log(`        ${index + 1}. ${suggestion}`);
          });
        }
      }
    } catch (error) {
      console.log(`   ❌ Optimization report error: ${error.message}`);
    }

  } catch (error) {
    console.error('❌ Query optimization test failed:', error.message);
  }
}

async function testConnectionPooling() {
  console.log('🔗 Testing Connection Pooling...\n');
  
  try {
    // Test pool statistics
    console.log('1. Getting connection pool statistics...');
    try {
      const response = await axios.get(`${BASE_URL}/api/test/pool/stats`);
      
      if (response.data.success) {
        const stats = response.data.data;
        console.log('   ✅ Connection Pool Statistics:');
        console.log(`      Total Connections: ${stats.totalConnections}`);
        console.log(`      Idle Connections: ${stats.idleConnections}`);
        console.log(`      Waiting Clients: ${stats.waitingClients}`);
        console.log(`      Max Connections: ${stats.maxConnections}`);
        console.log(`      Active Queries: ${stats.activeQueries}`);
        console.log(`      Total Queries: ${stats.totalQueries}`);
        console.log(`      Average Query Time: ${stats.averageQueryTime.toFixed(2)}ms`);
        console.log(`      Connection Errors: ${stats.connectionErrors}`);
        console.log(`      Query Errors: ${stats.queryErrors}`);
      }
    } catch (error) {
      console.log(`   ❌ Pool stats error: ${error.message}`);
    }

    // Test pool health
    console.log('\n2. Testing connection pool health...');
    try {
      const response = await axios.get(`${BASE_URL}/api/test/pool/health`);
      
      if (response.data.success) {
        const health = response.data.data;
        console.log(`   ✅ Pool Health: ${health.status}`);
        console.log(`      Can Connect: ${health.details.canConnect}`);
        console.log(`      Response Time: ${health.details.responseTime}ms`);
        
        if (health.details.error) {
          console.log(`      Error: ${health.details.error}`);
        }
      }
    } catch (error) {
      console.log(`   ❌ Pool health error: ${error.message}`);
    }

    // Test concurrent connections
    console.log('\n3. Testing concurrent connections...');
    try {
      const concurrentRequests = Array.from({ length: 10 }, (_, i) => 
        axios.post(`${BASE_URL}/api/test/pool/query`, {
          query: 'SELECT $1 as test_id',
          params: [i]
        })
      );

      const startTime = Date.now();
      const results = await Promise.allSettled(concurrentRequests);
      const endTime = Date.now();

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      console.log(`   ✅ Concurrent Connections Test:`);
      console.log(`      Total Requests: 10`);
      console.log(`      Successful: ${successful}`);
      console.log(`      Failed: ${failed}`);
      console.log(`      Total Time: ${endTime - startTime}ms`);
      console.log(`      Average Time per Request: ${(endTime - startTime) / 10}ms`);
    } catch (error) {
      console.log(`   ❌ Concurrent connections error: ${error.message}`);
    }

    // Test long-running queries detection
    console.log('\n4. Testing long-running queries detection...');
    try {
      const response = await axios.get(`${BASE_URL}/api/test/pool/long-running`);
      
      if (response.data.success) {
        const longRunning = response.data.data;
        console.log(`   ✅ Long-running Queries: ${longRunning.length}`);
        
        if (longRunning.length > 0) {
          longRunning.forEach((query, index) => {
            console.log(`      ${index + 1}. Duration: ${query.duration}ms`);
            console.log(`         Query: ${query.query.substring(0, 60)}...`);
          });
        } else {
          console.log('      No long-running queries detected');
        }
      }
    } catch (error) {
      console.log(`   ❌ Long-running queries error: ${error.message}`);
    }

  } catch (error) {
    console.error('❌ Connection pooling test failed:', error.message);
  }
}

async function testCacheStrategies() {
  console.log('📋 Testing Cache Strategies...\n');
  
  try {
    // Test user cache strategy
    console.log('1. Testing User Cache Strategy...');
    const userId = 'test-user-123';
    const userData = {
      id: userId,
      name: 'Test User',
      email: 'test@example.com',
      preferences: { theme: 'dark', language: 'en' }
    };

    try {
      // Set user data
      const setResponse = await axios.post(`${BASE_URL}/api/test/cache/user/set`, {
        userId,
        userData
      });
      
      if (setResponse.data.success) {
        console.log(`   ✅ User data cached for ${userId}`);
        
        // Get user data
        const getResponse = await axios.get(`${BASE_URL}/api/test/cache/user/get/${userId}`);
        
        if (getResponse.data.success && getResponse.data.data) {
          console.log(`   ✅ User data retrieved from cache`);
          console.log(`      Name: ${getResponse.data.data.name}`);
          console.log(`      Email: ${getResponse.data.data.email}`);
        } else {
          console.log(`   ❌ Failed to retrieve user data from cache`);
        }
      }
    } catch (error) {
      console.log(`   ❌ User cache strategy error: ${error.message}`);
    }

    // Test coupon cache strategy
    console.log('\n2. Testing Coupon Cache Strategy...');
    const storeId = 'flipkart';
    const coupons = [
      { id: 'coupon1', discount: 20, category: 'electronics' },
      { id: 'coupon2', discount: 15, category: 'fashion' }
    ];

    try {
      // Set store coupons
      const setResponse = await axios.post(`${BASE_URL}/api/test/cache/coupons/store/set`, {
        storeId,
        coupons
      });
      
      if (setResponse.data.success) {
        console.log(`   ✅ Store coupons cached for ${storeId}`);
        
        // Get store coupons
        const getResponse = await axios.get(`${BASE_URL}/api/test/cache/coupons/store/get/${storeId}`);
        
        if (getResponse.data.success && getResponse.data.data) {
          console.log(`   ✅ Store coupons retrieved from cache`);
          console.log(`      Coupon count: ${getResponse.data.data.length}`);
        }
      }
    } catch (error) {
      console.log(`   ❌ Coupon cache strategy error: ${error.message}`);
    }

    // Test analytics cache strategy
    console.log('\n3. Testing Analytics Cache Strategy...');
    const dashboardStats = {
      totalUsers: 1247,
      activeUsers: 892,
      totalCoupons: 3456,
      totalRevenue: 45678,
      conversionRate: 12.5
    };

    try {
      // Set dashboard stats
      const setResponse = await axios.post(`${BASE_URL}/api/test/cache/analytics/dashboard/set`, {
        stats: dashboardStats
      });
      
      if (setResponse.data.success) {
        console.log(`   ✅ Dashboard stats cached`);
        
        // Get dashboard stats
        const getResponse = await axios.get(`${BASE_URL}/api/test/cache/analytics/dashboard/get`);
        
        if (getResponse.data.success && getResponse.data.data) {
          console.log(`   ✅ Dashboard stats retrieved from cache`);
          console.log(`      Total Users: ${getResponse.data.data.totalUsers}`);
          console.log(`      Total Revenue: ${getResponse.data.data.totalRevenue}`);
          console.log(`      Conversion Rate: ${getResponse.data.data.conversionRate}%`);
        }
      }
    } catch (error) {
      console.log(`   ❌ Analytics cache strategy error: ${error.message}`);
    }

    // Test cache invalidation
    console.log('\n4. Testing Cache Invalidation...');
    try {
      const response = await axios.post(`${BASE_URL}/api/test/cache/invalidate`, {
        tag: 'users'
      });
      
      if (response.data.success) {
        console.log(`   ✅ Cache invalidation successful`);
        console.log(`      Invalidated keys: ${response.data.invalidatedCount}`);
      }
    } catch (error) {
      console.log(`   ❌ Cache invalidation error: ${error.message}`);
    }

  } catch (error) {
    console.error('❌ Cache strategies test failed:', error.message);
  }
}

async function generatePerformanceReport() {
  console.log('📊 Generating Performance Report...\n');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/test/performance/report`);
    
    if (response.data.success) {
      const report = response.data.data;
      
      console.log('✅ Performance Report Generated:');
      console.log(`   Report Date: ${new Date().toISOString()}`);
      console.log(`   Test Duration: ${report.testDuration || 'N/A'}`);
      
      // Cache Performance
      if (report.cache) {
        console.log('\n   🗄️  Cache Performance:');
        console.log(`      Hit Rate: ${report.cache.hitRate}%`);
        console.log(`      Total Operations: ${report.cache.totalOperations}`);
        console.log(`      Average Response Time: ${report.cache.averageResponseTime}ms`);
        console.log(`      Error Rate: ${report.cache.errorRate}%`);
      }
      
      // Query Performance
      if (report.queries) {
        console.log('\n   🔍 Query Performance:');
        console.log(`      Total Queries: ${report.queries.totalQueries}`);
        console.log(`      Slow Queries: ${report.queries.slowQueries}`);
        console.log(`      Average Execution Time: ${report.queries.averageExecutionTime}ms`);
        console.log(`      Optimization Suggestions: ${report.queries.suggestions}`);
      }
      
      // Connection Pool Performance
      if (report.connectionPool) {
        console.log('\n   🔗 Connection Pool Performance:');
        console.log(`      Pool Utilization: ${report.connectionPool.utilization}%`);
        console.log(`      Average Wait Time: ${report.connectionPool.averageWaitTime}ms`);
        console.log(`      Connection Errors: ${report.connectionPool.errors}`);
        console.log(`      Concurrent Connections: ${report.connectionPool.maxConcurrent}`);
      }
      
      // Recommendations
      if (report.recommendations && report.recommendations.length > 0) {
        console.log('\n   💡 Performance Recommendations:');
        report.recommendations.forEach((rec, index) => {
          console.log(`      ${index + 1}. [${rec.priority}] ${rec.title}`);
          console.log(`         ${rec.description}`);
        });
      }
      
      // Save report to file
      const reportPath = path.join(__dirname, '../test-reports/performance-optimization-report.json');
      const reportDir = path.dirname(reportPath);
      
      if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
      }
      
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n   📄 Report saved to: ${reportPath}`);
      
    } else {
      console.log('❌ Failed to generate performance report');
    }
  } catch (error) {
    console.error('❌ Performance report generation failed:', error.message);
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Performance Optimization System Tests...');
  console.log('Base URL:', BASE_URL);
  console.log('='.repeat(60));
  
  const startTime = Date.now();
  
  try {
    // Run all test suites
    await testCacheOperations();
    await testQueryOptimization();
    await testConnectionPooling();
    await testCacheStrategies();
    await generatePerformanceReport();
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 Performance Optimization Tests Completed!');
    console.log(`⏱️  Total Test Time: ${totalTime}ms`);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('💥 Test suite failed:', error.message);
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes('--help')) {
  console.log(`
Performance Optimization Test Suite

Usage: node test-performance-optimization.js [options]

Options:
  --help          Show this help message
  
Environment Variables:
  ADMIN_PORT      Admin server port (default: 3010)
  
Test Categories:
  - Cache Operations (Redis caching, strategies, invalidation)
  - Query Optimization (slow query detection, suggestions)
  - Connection Pooling (pool statistics, health checks)
  - Cache Strategies (user, coupon, analytics caching)
  - Performance Reporting (comprehensive analysis)
  
Examples:
  node test-performance-optimization.js
  ADMIN_PORT=3011 node test-performance-optimization.js
  `);
  process.exit(0);
}

// Run tests
runAllTests().catch(error => {
  console.error('💥 Test runner failed:', error);
  process.exit(1);
});
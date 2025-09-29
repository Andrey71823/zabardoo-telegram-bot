const axios = require('axios');
const fs = require('fs');
const path = require('path');

class PerformanceBenchmark {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:3000';
    this.warmupRequests = options.warmupRequests || 100;
    this.benchmarkRequests = options.benchmarkRequests || 1000;
    this.concurrency = options.concurrency || 10;
    this.results = {
      endpoints: {},
      summary: {},
      environment: {}
    };
  }

  async runBenchmark() {
    console.log('🏃 Starting Performance Benchmark for bazaarGuru Telegram Bot');
    console.log('=' .repeat(60));
    console.log(`Base URL: ${this.baseUrl}`);
    console.log(`Warmup Requests: ${this.warmupRequests}`);
    console.log(`Benchmark Requests: ${this.benchmarkRequests}`);
    console.log(`Concurrency: ${this.concurrency}`);
    console.log('=' .repeat(60));

    try {
      await this.collectEnvironmentInfo();
      await this.warmupSystem();
      await this.benchmarkEndpoints();
      this.generateBenchmarkReport();
    } catch (error) {
      console.error('❌ Benchmark failed:', error.message);
      process.exit(1);
    }
  }

  async collectEnvironmentInfo() {
    console.log('🔍 Collecting environment information...');
    
    const os = require('os');
    
    this.results.environment = {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      cpus: os.cpus().length,
      memory: os.totalmem(),
      freeMemory: os.freemem(),
      loadAverage: os.loadavg(),
      timestamp: new Date().toISOString()
    };

    // Get system info from the application
    try {
      const response = await axios.get(`${this.baseUrl}/api/monitoring/metrics`, { timeout: 5000 });
      if (response.data.success) {
        this.results.environment.application = response.data.data.system;
      }
    } catch (error) {
      console.log('⚠️  Could not collect application metrics');
    }
  }

  async warmupSystem() {
    console.log('🔥 Warming up system...');
    
    const warmupEndpoints = [
      '/api/health',
      '/api/coupons?limit=10',
      '/api/recommendations/trending?limit=5'
    ];

    for (const endpoint of warmupEndpoints) {
      for (let i = 0; i < this.warmupRequests / warmupEndpoints.length; i++) {
        try {
          await axios.get(`${this.baseUrl}${endpoint}`, { timeout: 5000 });
        } catch (error) {
          // Ignore warmup errors
        }
      }
    }

    console.log('✅ System warmed up');
  }

  async benchmarkEndpoints() {
    const endpoints = [
      {
        name: 'Health Check',
        method: 'GET',
        path: '/api/health',
        description: 'Basic health check endpoint'
      },
      {
        name: 'Coupons List',
        method: 'GET',
        path: '/api/coupons?limit=20',
        description: 'Fetch list of coupons'
      },
      {
        name: 'Coupon Search',
        method: 'GET',
        path: '/api/coupons/search?query=electronics&limit=10',
        description: 'Search coupons by query'
      },
      {
        name: 'Trending Recommendations',
        method: 'GET',
        path: '/api/recommendations/trending?limit=10',
        description: 'Get trending recommendations'
      },
      {
        name: 'User Registration',
        method: 'POST',
        path: '/api/users',
        description: 'Register new user',
        data: () => ({
          id: `bench-user-${Date.now()}-${Math.random()}`,
          telegramId: Math.floor(Math.random() * 1000000).toString(),
          username: `benchuser${Math.floor(Math.random() * 10000)}`
        })
      },
      {
        name: 'Analytics Event',
        method: 'POST',
        path: '/api/analytics/events',
        description: 'Record analytics event',
        data: () => ({
          userId: `bench-user-${Math.floor(Math.random() * 1000)}`,
          eventType: 'page_view',
          eventData: { page: 'benchmark' }
        })
      },
      {
        name: 'Cashback Balance',
        method: 'GET',
        path: '/api/cashback/balance/bench-user-123',
        description: 'Get user cashback balance'
      },
      {
        name: 'Stores List',
        method: 'GET',
        path: '/api/stores?limit=20',
        description: 'Fetch list of stores'
      },
      {
        name: 'Categories',
        method: 'GET',
        path: '/api/categories',
        description: 'Get coupon categories'
      },
      {
        name: 'Dashboard Metrics',
        method: 'GET',
        path: '/api/dashboard/business-metrics?period=today',
        description: 'Business dashboard metrics'
      }
    ];

    for (const endpoint of endpoints) {
      console.log(`\n📊 Benchmarking: ${endpoint.name}`);
      await this.benchmarkEndpoint(endpoint);
    }
  }

  async benchmarkEndpoint(endpoint) {
    const results = {
      name: endpoint.name,
      method: endpoint.method,
      path: endpoint.path,
      description: endpoint.description,
      requests: [],
      statistics: {}
    };

    // Run concurrent requests
    const requestsPerWorker = Math.ceil(this.benchmarkRequests / this.concurrency);
    const workers = [];

    for (let i = 0; i < this.concurrency; i++) {
      workers.push(this.runWorkerRequests(endpoint, requestsPerWorker));
    }

    const workerResults = await Promise.all(workers);
    
    // Aggregate results
    workerResults.forEach(workerResult => {
      results.requests.push(...workerResult);
    });

    // Calculate statistics
    results.statistics = this.calculateStatistics(results.requests);
    
    this.results.endpoints[endpoint.name] = results;
    
    // Print summary
    console.log(`   Requests: ${results.requests.length}`);
    console.log(`   Success Rate: ${results.statistics.successRate.toFixed(2)}%`);
    console.log(`   Avg Response Time: ${results.statistics.avgResponseTime.toFixed(2)}ms`);
    console.log(`   95th Percentile: ${results.statistics.p95ResponseTime.toFixed(2)}ms`);
    console.log(`   Throughput: ${results.statistics.requestsPerSecond.toFixed(2)} RPS`);
  }

  async runWorkerRequests(endpoint, requestCount) {
    const requests = [];
    
    for (let i = 0; i < requestCount; i++) {
      const startTime = process.hrtime.bigint();
      
      try {
        const config = {
          method: endpoint.method,
          url: `${this.baseUrl}${endpoint.path}`,
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'PerformanceBenchmark/1.0'
          }
        };

        if (endpoint.data) {
          config.data = endpoint.data();
        }

        const response = await axios(config);
        const endTime = process.hrtime.bigint();
        const responseTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds

        requests.push({
          success: true,
          statusCode: response.status,
          responseTime,
          timestamp: Date.now(),
          size: JSON.stringify(response.data).length
        });

      } catch (error) {
        const endTime = process.hrtime.bigint();
        const responseTime = Number(endTime - startTime) / 1000000;

        requests.push({
          success: false,
          statusCode: error.response ? error.response.status : 0,
          responseTime,
          timestamp: Date.now(),
          error: error.message,
          size: 0
        });
      }
    }

    return requests;
  }

  calculateStatistics(requests) {
    const successfulRequests = requests.filter(r => r.success);
    const responseTimes = requests.map(r => r.responseTime);
    const successfulResponseTimes = successfulRequests.map(r => r.responseTime);
    
    responseTimes.sort((a, b) => a - b);
    successfulResponseTimes.sort((a, b) => a - b);

    const totalTime = Math.max(...requests.map(r => r.timestamp)) - Math.min(...requests.map(r => r.timestamp));
    const totalSize = requests.reduce((sum, r) => sum + r.size, 0);

    return {
      totalRequests: requests.length,
      successfulRequests: successfulRequests.length,
      failedRequests: requests.length - successfulRequests.length,
      successRate: (successfulRequests.length / requests.length) * 100,
      
      // Response time statistics
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      avgResponseTime: responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length,
      medianResponseTime: responseTimes[Math.floor(responseTimes.length / 2)],
      
      // Percentiles
      p50ResponseTime: this.percentile(responseTimes, 50),
      p90ResponseTime: this.percentile(responseTimes, 90),
      p95ResponseTime: this.percentile(responseTimes, 95),
      p99ResponseTime: this.percentile(responseTimes, 99),
      
      // Throughput
      requestsPerSecond: totalTime > 0 ? (requests.length / totalTime) * 1000 : 0,
      
      // Data transfer
      totalDataTransferred: totalSize,
      avgResponseSize: totalSize / requests.length,
      
      // Error analysis
      errorTypes: this.analyzeErrors(requests.filter(r => !r.success)),
      statusCodeDistribution: this.analyzeStatusCodes(requests)
    };
  }

  percentile(sortedArray, percentile) {
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }

  analyzeErrors(failedRequests) {
    const errorTypes = {};
    failedRequests.forEach(request => {
      const errorType = request.statusCode > 0 ? `HTTP_${request.statusCode}` : 'NETWORK_ERROR';
      errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
    });
    return errorTypes;
  }

  analyzeStatusCodes(requests) {
    const statusCodes = {};
    requests.forEach(request => {
      statusCodes[request.statusCode] = (statusCodes[request.statusCode] || 0) + 1;
    });
    return statusCodes;
  }

  generateBenchmarkReport() {
    console.log('\n🏆 PERFORMANCE BENCHMARK RESULTS');
    console.log('=' .repeat(80));
    
    // Environment info
    console.log('🖥️  Environment:');
    console.log(`   Node.js: ${this.results.environment.nodeVersion}`);
    console.log(`   Platform: ${this.results.environment.platform} (${this.results.environment.arch})`);
    console.log(`   CPUs: ${this.results.environment.cpus}`);
    console.log(`   Memory: ${(this.results.environment.memory / 1024 / 1024 / 1024).toFixed(2)} GB`);
    
    // Overall summary
    const allRequests = Object.values(this.results.endpoints).reduce((sum, endpoint) => sum + endpoint.requests.length, 0);
    const allSuccessful = Object.values(this.results.endpoints).reduce((sum, endpoint) => sum + endpoint.statistics.successfulRequests, 0);
    const overallSuccessRate = (allSuccessful / allRequests) * 100;
    
    console.log('\n📊 Overall Summary:');
    console.log(`   Total Requests: ${allRequests}`);
    console.log(`   Success Rate: ${overallSuccessRate.toFixed(2)}%`);
    console.log(`   Total Endpoints: ${Object.keys(this.results.endpoints).length}`);
    
    // Endpoint results table
    console.log('\n📈 Endpoint Performance:');
    console.log('Endpoint'.padEnd(25) + ' | ' + 'Requests'.padEnd(8) + ' | ' + 'Success%'.padEnd(8) + ' | ' + 'Avg RT'.padEnd(8) + ' | ' + 'P95 RT'.padEnd(8) + ' | ' + 'RPS'.padEnd(8) + ' | Status');
    console.log('-'.repeat(90));
    
    Object.values(this.results.endpoints).forEach(endpoint => {
      const stats = endpoint.statistics;
      const status = stats.successRate >= 99 ? '✅' : stats.successRate >= 95 ? '⚠️' : '❌';
      
      console.log(
        endpoint.name.substring(0, 24).padEnd(25) + ' | ' +
        stats.totalRequests.toString().padEnd(8) + ' | ' +
        stats.successRate.toFixed(1).padEnd(8) + ' | ' +
        stats.avgResponseTime.toFixed(1).padEnd(8) + ' | ' +
        stats.p95ResponseTime.toFixed(1).padEnd(8) + ' | ' +
        stats.requestsPerSecond.toFixed(1).padEnd(8) + ' | ' +
        status
      );
    });
    
    // Performance rankings
    console.log('\n🥇 Performance Rankings:');
    
    // Fastest endpoints
    const fastestEndpoints = Object.values(this.results.endpoints)
      .sort((a, b) => a.statistics.avgResponseTime - b.statistics.avgResponseTime)
      .slice(0, 3);
    
    console.log('   Fastest Endpoints:');
    fastestEndpoints.forEach((endpoint, index) => {
      console.log(`   ${index + 1}. ${endpoint.name}: ${endpoint.statistics.avgResponseTime.toFixed(2)}ms`);
    });
    
    // Highest throughput
    const highestThroughput = Object.values(this.results.endpoints)
      .sort((a, b) => b.statistics.requestsPerSecond - a.statistics.requestsPerSecond)
      .slice(0, 3);
    
    console.log('   Highest Throughput:');
    highestThroughput.forEach((endpoint, index) => {
      console.log(`   ${index + 1}. ${endpoint.name}: ${endpoint.statistics.requestsPerSecond.toFixed(2)} RPS`);
    });
    
    // Performance recommendations
    console.log('\n💡 Performance Recommendations:');
    this.generatePerformanceRecommendations();
    
    // Save detailed report
    this.saveBenchmarkReport();
    
    console.log('\n🏁 Performance benchmark completed!');
  }

  generatePerformanceRecommendations() {
    const slowEndpoints = Object.values(this.results.endpoints)
      .filter(endpoint => endpoint.statistics.avgResponseTime > 500)
      .sort((a, b) => b.statistics.avgResponseTime - a.statistics.avgResponseTime);
    
    if (slowEndpoints.length > 0) {
      console.log('   🐌 Slow Endpoints (>500ms):');
      slowEndpoints.forEach(endpoint => {
        console.log(`      - ${endpoint.name}: ${endpoint.statistics.avgResponseTime.toFixed(2)}ms - Consider optimization`);
      });
    }
    
    const lowThroughputEndpoints = Object.values(this.results.endpoints)
      .filter(endpoint => endpoint.statistics.requestsPerSecond < 50)
      .sort((a, b) => a.statistics.requestsPerSecond - b.statistics.requestsPerSecond);
    
    if (lowThroughputEndpoints.length > 0) {
      console.log('   📉 Low Throughput Endpoints (<50 RPS):');
      lowThroughputEndpoints.forEach(endpoint => {
        console.log(`      - ${endpoint.name}: ${endpoint.statistics.requestsPerSecond.toFixed(2)} RPS - Consider scaling`);
      });
    }
    
    const errorProneEndpoints = Object.values(this.results.endpoints)
      .filter(endpoint => endpoint.statistics.successRate < 99);
    
    if (errorProneEndpoints.length > 0) {
      console.log('   ❌ Error-Prone Endpoints (<99% success):');
      errorProneEndpoints.forEach(endpoint => {
        console.log(`      - ${endpoint.name}: ${endpoint.statistics.successRate.toFixed(2)}% - Investigate errors`);
      });
    }
    
    // General recommendations
    console.log('   🎯 General Recommendations:');
    console.log('      - Implement caching for frequently accessed data');
    console.log('      - Optimize database queries and add proper indexes');
    console.log('      - Consider implementing connection pooling');
    console.log('      - Monitor and optimize memory usage');
    console.log('      - Set up performance monitoring and alerting');
  }

  saveBenchmarkReport() {
    const report = {
      timestamp: new Date().toISOString(),
      configuration: {
        baseUrl: this.baseUrl,
        warmupRequests: this.warmupRequests,
        benchmarkRequests: this.benchmarkRequests,
        concurrency: this.concurrency
      },
      results: this.results
    };
    
    // Ensure reports directory exists
    const reportsDir = path.join(__dirname, '../benchmark-reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    const reportFile = path.join(reportsDir, `benchmark-${Date.now()}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    console.log(`\n📄 Detailed report saved: ${reportFile}`);
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace('--', '');
    const value = args[i + 1];
    
    switch (key) {
      case 'url':
        options.baseUrl = value;
        break;
      case 'warmup':
        options.warmupRequests = parseInt(value);
        break;
      case 'requests':
        options.benchmarkRequests = parseInt(value);
        break;
      case 'concurrency':
        options.concurrency = parseInt(value);
        break;
    }
  }
  
  const benchmark = new PerformanceBenchmark(options);
  benchmark.runBenchmark().catch(console.error);
}

module.exports = PerformanceBenchmark;
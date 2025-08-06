const axios = require('axios');
const cluster = require('cluster');
const os = require('os');

class LoadTestRunner {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:3000';
    this.concurrency = options.concurrency || 100;
    this.duration = options.duration || 60000; // 60 seconds
    this.rampUpTime = options.rampUpTime || 10000; // 10 seconds
    this.testScenarios = options.scenarios || ['basic', 'api', 'user_journey'];
    this.results = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      requestsPerSecond: 0,
      errors: {},
      responseTimeDistribution: {
        '< 100ms': 0,
        '100-500ms': 0,
        '500ms-1s': 0,
        '1s-2s': 0,
        '> 2s': 0
      },
      statusCodes: {},
      scenarios: {}
    };
    this.startTime = null;
    this.workers = [];
  }

  async runLoadTest() {
    console.log('🚀 Starting Load Test for Zabardoo Telegram Bot');
    console.log('=' .repeat(60));
    console.log(`Base URL: ${this.baseUrl}`);
    console.log(`Concurrency: ${this.concurrency} users`);
    console.log(`Duration: ${this.duration / 1000} seconds`);
    console.log(`Ramp-up Time: ${this.rampUpTime / 1000} seconds`);
    console.log(`Test Scenarios: ${this.testScenarios.join(', ')}`);
    console.log('=' .repeat(60));

    try {
      // Pre-test health check
      await this.healthCheck();
      
      // Run load test
      if (cluster.isMaster) {
        await this.runMasterProcess();
      } else {
        await this.runWorkerProcess();
      }
    } catch (error) {
      console.error('❌ Load test failed:', error.message);
      process.exit(1);
    }
  }

  async healthCheck() {
    console.log('🏥 Running pre-test health check...');
    
    try {
      const response = await axios.get(`${this.baseUrl}/api/health`, { timeout: 5000 });
      if (response.status === 200 && response.data.success) {
        console.log('✅ Health check passed');
      } else {
        throw new Error('Health check failed - invalid response');
      }
    } catch (error) {
      throw new Error(`Health check failed: ${error.message}`);
    }
  }

  async runMasterProcess() {
    const numWorkers = Math.min(this.concurrency, os.cpus().length);
    const usersPerWorker = Math.ceil(this.concurrency / numWorkers);
    
    console.log(`📊 Spawning ${numWorkers} worker processes (${usersPerWorker} users each)`);
    
    this.startTime = Date.now();
    
    // Spawn workers
    for (let i = 0; i < numWorkers; i++) {
      const worker = cluster.fork({
        WORKER_ID: i,
        USERS_PER_WORKER: usersPerWorker,
        BASE_URL: this.baseUrl,
        DURATION: this.duration,
        RAMP_UP_TIME: this.rampUpTime,
        SCENARIOS: JSON.stringify(this.testScenarios)
      });
      
      this.workers.push(worker);
      
      worker.on('message', (message) => {
        if (message.type === 'result') {
          this.aggregateResults(message.data);
        }
      });
    }

    // Wait for all workers to complete
    await new Promise((resolve) => {
      let completedWorkers = 0;
      
      this.workers.forEach(worker => {
        worker.on('exit', () => {
          completedWorkers++;
          if (completedWorkers === numWorkers) {
            resolve();
          }
        });
      });
      
      // Timeout safety
      setTimeout(() => {
        console.log('⏰ Test duration completed, terminating workers...');
        this.workers.forEach(worker => worker.kill());
        resolve();
      }, this.duration + this.rampUpTime + 10000);
    });

    this.generateReport();
  }

  async runWorkerProcess() {
    const workerId = parseInt(process.env.WORKER_ID);
    const usersPerWorker = parseInt(process.env.USERS_PER_WORKER);
    const baseUrl = process.env.BASE_URL;
    const duration = parseInt(process.env.DURATION);
    const rampUpTime = parseInt(process.env.RAMP_UP_TIME);
    const scenarios = JSON.parse(process.env.SCENARIOS);

    const workerResults = {
      requests: [],
      errors: {},
      statusCodes: {}
    };

    const startTime = Date.now();
    const endTime = startTime + duration;
    
    // Stagger worker start times for ramp-up
    const workerDelay = (rampUpTime / this.workers.length) * workerId;
    await this.sleep(workerDelay);

    console.log(`👷 Worker ${workerId} starting with ${usersPerWorker} virtual users`);

    // Create virtual users
    const users = [];
    for (let i = 0; i < usersPerWorker; i++) {
      users.push(this.createVirtualUser(i + (workerId * usersPerWorker), scenarios, workerResults));
    }

    // Start all virtual users
    const userPromises = users.map(user => user.start(endTime));
    
    // Wait for all users to complete
    await Promise.all(userPromises);

    // Send results back to master
    process.send({
      type: 'result',
      data: workerResults
    });

    process.exit(0);
  }

  createVirtualUser(userId, scenarios, workerResults) {
    return {
      id: userId,
      scenarios,
      results: workerResults,
      
      async start(endTime) {
        while (Date.now() < endTime) {
          try {
            // Randomly select a scenario
            const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
            await this.executeScenario(scenario);
            
            // Random delay between requests (100-1000ms)
            await this.sleep(Math.random() * 900 + 100);
          } catch (error) {
            // Continue on error
          }
        }
      },

      async executeScenario(scenario) {
        switch (scenario) {
          case 'basic':
            await this.basicScenario();
            break;
          case 'api':
            await this.apiScenario();
            break;
          case 'user_journey':
            await this.userJourneyScenario();
            break;
          case 'heavy_load':
            await this.heavyLoadScenario();
            break;
          default:
            await this.basicScenario();
        }
      },

      async basicScenario() {
        // Simple health check
        await this.makeRequest('GET', '/api/health');
      },

      async apiScenario() {
        // API endpoints testing
        const endpoints = [
          '/api/coupons?limit=10',
          '/api/recommendations/trending?limit=5',
          '/api/stores',
          '/api/categories'
        ];
        
        const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
        await this.makeRequest('GET', endpoint);
      },

      async userJourneyScenario() {
        // Simulate user journey
        try {
          // 1. Health check
          await this.makeRequest('GET', '/api/health');
          
          // 2. Browse coupons
          await this.makeRequest('GET', '/api/coupons?category=electronics&limit=10');
          
          // 3. Get recommendations
          await this.makeRequest('GET', '/api/recommendations/trending?limit=5');
          
          // 4. View specific coupon
          await this.makeRequest('GET', '/api/coupons/search?query=mobile');
          
          // 5. Check analytics
          await this.makeRequest('GET', '/api/analytics/health');
        } catch (error) {
          // Continue on error
        }
      },

      async heavyLoadScenario() {
        // Heavy operations
        const operations = [
          () => this.makeRequest('GET', '/api/analytics/dashboard'),
          () => this.makeRequest('GET', '/api/cashback/transactions/user-123?limit=50'),
          () => this.makeRequest('GET', '/api/recommendations/user/user-123?limit=20'),
          () => this.makeRequest('POST', '/api/analytics/events', {
            userId: `load-test-${this.id}`,
            eventType: 'page_view',
            eventData: { page: 'home' }
          })
        ];
        
        const operation = operations[Math.floor(Math.random() * operations.length)];
        await operation();
      },

      async makeRequest(method, path, data = null) {
        const startTime = Date.now();
        
        try {
          const config = {
            method,
            url: `${process.env.BASE_URL}${path}`,
            timeout: 10000,
            headers: {
              'User-Agent': `LoadTest-User-${this.id}`,
              'Content-Type': 'application/json'
            }
          };
          
          if (data) {
            config.data = data;
          }
          
          const response = await axios(config);
          const responseTime = Date.now() - startTime;
          
          // Record successful request
          this.results.requests.push({
            method,
            path,
            statusCode: response.status,
            responseTime,
            success: true,
            timestamp: Date.now()
          });
          
          // Update status code count
          this.results.statusCodes[response.status] = (this.results.statusCodes[response.status] || 0) + 1;
          
        } catch (error) {
          const responseTime = Date.now() - startTime;
          const statusCode = error.response ? error.response.status : 0;
          
          // Record failed request
          this.results.requests.push({
            method,
            path,
            statusCode,
            responseTime,
            success: false,
            error: error.message,
            timestamp: Date.now()
          });
          
          // Update error count
          const errorKey = error.response ? `HTTP_${statusCode}` : error.code || 'UNKNOWN';
          this.results.errors[errorKey] = (this.results.errors[errorKey] || 0) + 1;
          
          // Update status code count
          this.results.statusCodes[statusCode] = (this.results.statusCodes[statusCode] || 0) + 1;
        }
      },

      sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
      }
    };
  }

  aggregateResults(workerResults) {
    workerResults.requests.forEach(request => {
      this.results.totalRequests++;
      
      if (request.success) {
        this.results.successfulRequests++;
      } else {
        this.results.failedRequests++;
      }
      
      // Response time statistics
      this.results.minResponseTime = Math.min(this.results.minResponseTime, request.responseTime);
      this.results.maxResponseTime = Math.max(this.results.maxResponseTime, request.responseTime);
      
      // Response time distribution
      if (request.responseTime < 100) {
        this.results.responseTimeDistribution['< 100ms']++;
      } else if (request.responseTime < 500) {
        this.results.responseTimeDistribution['100-500ms']++;
      } else if (request.responseTime < 1000) {
        this.results.responseTimeDistribution['500ms-1s']++;
      } else if (request.responseTime < 2000) {
        this.results.responseTimeDistribution['1s-2s']++;
      } else {
        this.results.responseTimeDistribution['> 2s']++;
      }
    });

    // Aggregate errors
    Object.keys(workerResults.errors).forEach(errorType => {
      this.results.errors[errorType] = (this.results.errors[errorType] || 0) + workerResults.errors[errorType];
    });

    // Aggregate status codes
    Object.keys(workerResults.statusCodes).forEach(statusCode => {
      this.results.statusCodes[statusCode] = (this.results.statusCodes[statusCode] || 0) + workerResults.statusCodes[statusCode];
    });
  }

  generateReport() {
    const totalTime = Date.now() - this.startTime;
    const totalTimeSeconds = totalTime / 1000;
    
    // Calculate average response time
    if (this.results.totalRequests > 0) {
      this.results.requestsPerSecond = (this.results.totalRequests / totalTimeSeconds).toFixed(2);
    }

    console.log('\n📊 LOAD TEST RESULTS');
    console.log('=' .repeat(60));
    
    // Summary
    console.log('📈 Summary:');
    console.log(`   Total Requests: ${this.results.totalRequests}`);
    console.log(`   Successful: ${this.results.successfulRequests} (${((this.results.successfulRequests / this.results.totalRequests) * 100).toFixed(2)}%)`);
    console.log(`   Failed: ${this.results.failedRequests} (${((this.results.failedRequests / this.results.totalRequests) * 100).toFixed(2)}%)`);
    console.log(`   Requests/Second: ${this.results.requestsPerSecond}`);
    console.log(`   Test Duration: ${totalTimeSeconds.toFixed(2)}s`);
    
    // Response Times
    console.log('\n⏱️  Response Times:');
    console.log(`   Min: ${this.results.minResponseTime}ms`);
    console.log(`   Max: ${this.results.maxResponseTime}ms`);
    
    // Response Time Distribution
    console.log('\n📊 Response Time Distribution:');
    Object.keys(this.results.responseTimeDistribution).forEach(range => {
      const count = this.results.responseTimeDistribution[range];
      const percentage = ((count / this.results.totalRequests) * 100).toFixed(1);
      console.log(`   ${range.padEnd(10)}: ${count.toString().padStart(6)} (${percentage}%)`);
    });
    
    // Status Codes
    console.log('\n🔢 Status Codes:');
    Object.keys(this.results.statusCodes).sort().forEach(statusCode => {
      const count = this.results.statusCodes[statusCode];
      const percentage = ((count / this.results.totalRequests) * 100).toFixed(1);
      console.log(`   ${statusCode.padEnd(3)}: ${count.toString().padStart(6)} (${percentage}%)`);
    });
    
    // Errors
    if (Object.keys(this.results.errors).length > 0) {
      console.log('\n❌ Errors:');
      Object.keys(this.results.errors).forEach(errorType => {
        const count = this.results.errors[errorType];
        console.log(`   ${errorType}: ${count}`);
      });
    }
    
    // Performance Assessment
    console.log('\n🎯 Performance Assessment:');
    this.assessPerformance();
    
    // Save detailed report
    this.saveDetailedReport();
    
    console.log('\n🏁 Load test completed!');
  }

  assessPerformance() {
    const successRate = (this.results.successfulRequests / this.results.totalRequests) * 100;
    const avgResponseTime = this.results.maxResponseTime; // Simplified
    const rps = parseFloat(this.results.requestsPerSecond);
    
    // Success Rate Assessment
    if (successRate >= 99.5) {
      console.log('   ✅ Success Rate: Excellent (≥99.5%)');
    } else if (successRate >= 99) {
      console.log('   ✅ Success Rate: Good (≥99%)');
    } else if (successRate >= 95) {
      console.log('   ⚠️  Success Rate: Acceptable (≥95%)');
    } else {
      console.log('   ❌ Success Rate: Poor (<95%)');
    }
    
    // Response Time Assessment
    if (avgResponseTime <= 200) {
      console.log('   ✅ Response Time: Excellent (≤200ms)');
    } else if (avgResponseTime <= 500) {
      console.log('   ✅ Response Time: Good (≤500ms)');
    } else if (avgResponseTime <= 1000) {
      console.log('   ⚠️  Response Time: Acceptable (≤1s)');
    } else {
      console.log('   ❌ Response Time: Poor (>1s)');
    }
    
    // Throughput Assessment
    if (rps >= 1000) {
      console.log('   ✅ Throughput: Excellent (≥1000 RPS)');
    } else if (rps >= 500) {
      console.log('   ✅ Throughput: Good (≥500 RPS)');
    } else if (rps >= 100) {
      console.log('   ⚠️  Throughput: Acceptable (≥100 RPS)');
    } else {
      console.log('   ❌ Throughput: Poor (<100 RPS)');
    }
    
    // Overall Assessment
    const overallScore = (successRate >= 99 ? 1 : 0) + 
                        (avgResponseTime <= 500 ? 1 : 0) + 
                        (rps >= 500 ? 1 : 0);
    
    if (overallScore === 3) {
      console.log('   🎉 Overall: System performs excellently under load!');
    } else if (overallScore === 2) {
      console.log('   👍 Overall: System performs well under load');
    } else if (overallScore === 1) {
      console.log('   ⚠️  Overall: System performance needs improvement');
    } else {
      console.log('   ❌ Overall: System performance is inadequate');
    }
  }

  saveDetailedReport() {
    const report = {
      timestamp: new Date().toISOString(),
      configuration: {
        baseUrl: this.baseUrl,
        concurrency: this.concurrency,
        duration: this.duration,
        rampUpTime: this.rampUpTime,
        scenarios: this.testScenarios
      },
      results: this.results,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        cpus: os.cpus().length,
        memory: os.totalmem()
      }
    };
    
    const fs = require('fs');
    const path = require('path');
    
    // Ensure reports directory exists
    const reportsDir = path.join(__dirname, '../load-test-reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    const reportFile = path.join(reportsDir, `load-test-${Date.now()}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    console.log(`\n📄 Detailed report saved: ${reportFile}`);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
      case 'concurrency':
      case 'c':
        options.concurrency = parseInt(value);
        break;
      case 'duration':
      case 'd':
        options.duration = parseInt(value) * 1000; // Convert to ms
        break;
      case 'ramp-up':
        options.rampUpTime = parseInt(value) * 1000; // Convert to ms
        break;
      case 'scenarios':
        options.scenarios = value.split(',');
        break;
    }
  }
  
  const loadTest = new LoadTestRunner(options);
  loadTest.runLoadTest().catch(console.error);
}

module.exports = LoadTestRunner;
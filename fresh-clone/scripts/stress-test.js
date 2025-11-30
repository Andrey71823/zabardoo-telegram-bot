const axios = require('axios');
const cluster = require('cluster');
const os = require('os');

class StressTestRunner {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:3000';
    this.maxConcurrency = options.maxConcurrency || 1000;
    this.stepSize = options.stepSize || 50;
    this.stepDuration = options.stepDuration || 30000; // 30 seconds per step
    this.breakingPoint = null;
    this.results = [];
    this.currentStep = 0;
  }

  async runStressTest() {
    console.log('💥 Starting Stress Test for bazaarGuru Telegram Bot');
    console.log('=' .repeat(60));
    console.log(`Base URL: ${this.baseUrl}`);
    console.log(`Max Concurrency: ${this.maxConcurrency} users`);
    console.log(`Step Size: ${this.stepSize} users`);
    console.log(`Step Duration: ${this.stepDuration / 1000} seconds`);
    console.log('=' .repeat(60));

    try {
      await this.healthCheck();
      await this.runStressSteps();
      this.generateStressReport();
    } catch (error) {
      console.error('❌ Stress test failed:', error.message);
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

  async runStressSteps() {
    let currentConcurrency = this.stepSize;
    
    while (currentConcurrency <= this.maxConcurrency) {
      console.log(`\n🔥 Step ${++this.currentStep}: Testing with ${currentConcurrency} concurrent users`);
      
      const stepResult = await this.runStressStep(currentConcurrency);
      this.results.push(stepResult);
      
      // Check if we've reached the breaking point
      if (stepResult.successRate < 95 || stepResult.avgResponseTime > 5000) {
        console.log(`💔 Breaking point reached at ${currentConcurrency} concurrent users`);
        this.breakingPoint = currentConcurrency;
        break;
      }
      
      // Check if system is still healthy
      try {
        await this.healthCheck();
      } catch (error) {
        console.log(`💔 System became unhealthy at ${currentConcurrency} concurrent users`);
        this.breakingPoint = currentConcurrency;
        break;
      }
      
      currentConcurrency += this.stepSize;
      
      // Brief pause between steps
      console.log('⏸️  Pausing 10 seconds before next step...');
      await this.sleep(10000);
    }
  }

  async runStressStep(concurrency) {
    const LoadTestRunner = require('./load-test');
    
    const loadTest = new LoadTestRunner({
      baseUrl: this.baseUrl,
      concurrency: concurrency,
      duration: this.stepDuration,
      rampUpTime: 5000, // Quick ramp-up for stress test
      scenarios: ['basic', 'api', 'user_journey']
    });

    // Capture the results
    const originalGenerateReport = loadTest.generateReport;
    let stepResults = null;
    
    loadTest.generateReport = function() {
      stepResults = {
        concurrency: concurrency,
        totalRequests: this.results.totalRequests,
        successfulRequests: this.results.successfulRequests,
        failedRequests: this.results.failedRequests,
        successRate: (this.results.successfulRequests / this.results.totalRequests) * 100,
        requestsPerSecond: parseFloat(this.results.requestsPerSecond),
        avgResponseTime: this.results.maxResponseTime, // Simplified
        minResponseTime: this.results.minResponseTime,
        maxResponseTime: this.results.maxResponseTime,
        errors: this.results.errors,
        statusCodes: this.results.statusCodes,
        responseTimeDistribution: this.results.responseTimeDistribution
      };
      
      // Don't print the full report for each step
      console.log(`   📊 Results: ${stepResults.totalRequests} requests, ${stepResults.successRate.toFixed(2)}% success, ${stepResults.requestsPerSecond} RPS, ${stepResults.avgResponseTime}ms avg`);
    };

    if (cluster.isMaster) {
      await loadTest.runMasterProcess();
    } else {
      await loadTest.runWorkerProcess();
    }

    return stepResults;
  }

  generateStressReport() {
    console.log('\n💥 STRESS TEST RESULTS');
    console.log('=' .repeat(60));
    
    // Summary
    console.log('📈 Test Summary:');
    console.log(`   Total Steps: ${this.results.length}`);
    console.log(`   Max Concurrency Tested: ${Math.max(...this.results.map(r => r.concurrency))}`);
    console.log(`   Breaking Point: ${this.breakingPoint || 'Not reached'}`);
    
    // Step-by-step results
    console.log('\n📊 Step-by-Step Results:');
    console.log('Concurrency | Requests | Success% | RPS    | Avg RT | Max RT | Status');
    console.log('-'.repeat(70));
    
    this.results.forEach(result => {
      const status = result.successRate >= 99 ? '✅' : result.successRate >= 95 ? '⚠️' : '❌';
      console.log(
        `${result.concurrency.toString().padStart(10)} | ` +
        `${result.totalRequests.toString().padStart(8)} | ` +
        `${result.successRate.toFixed(1).padStart(7)}% | ` +
        `${result.requestsPerSecond.toString().padStart(6)} | ` +
        `${result.avgResponseTime.toString().padStart(6)}ms | ` +
        `${result.maxResponseTime.toString().padStart(6)}ms | ` +
        `${status}`
      );
    });
    
    // Performance degradation analysis
    console.log('\n📉 Performance Degradation Analysis:');
    this.analyzePerformanceDegradation();
    
    // Recommendations
    console.log('\n💡 Recommendations:');
    this.generateRecommendations();
    
    // Save detailed report
    this.saveStressReport();
    
    console.log('\n🏁 Stress test completed!');
  }

  analyzePerformanceDegradation() {
    if (this.results.length < 2) {
      console.log('   Not enough data points for analysis');
      return;
    }

    const firstResult = this.results[0];
    const lastResult = this.results[this.results.length - 1];
    
    // Success rate degradation
    const successRateDrop = firstResult.successRate - lastResult.successRate;
    console.log(`   Success Rate: ${firstResult.successRate.toFixed(2)}% → ${lastResult.successRate.toFixed(2)}% (${successRateDrop > 0 ? '-' : '+'}${Math.abs(successRateDrop).toFixed(2)}%)`);
    
    // Response time increase
    const responseTimeIncrease = ((lastResult.avgResponseTime - firstResult.avgResponseTime) / firstResult.avgResponseTime) * 100;
    console.log(`   Avg Response Time: ${firstResult.avgResponseTime}ms → ${lastResult.avgResponseTime}ms (+${responseTimeIncrease.toFixed(1)}%)`);
    
    // Throughput analysis
    const throughputChange = ((lastResult.requestsPerSecond - firstResult.requestsPerSecond) / firstResult.requestsPerSecond) * 100;
    console.log(`   Throughput: ${firstResult.requestsPerSecond} → ${lastResult.requestsPerSecond} RPS (${throughputChange > 0 ? '+' : ''}${throughputChange.toFixed(1)}%)`);
    
    // Find optimal concurrency
    const optimalResult = this.results.reduce((best, current) => {
      const bestScore = best.successRate * 0.4 + (best.requestsPerSecond / 10) * 0.4 + (1000 / best.avgResponseTime) * 0.2;
      const currentScore = current.successRate * 0.4 + (current.requestsPerSecond / 10) * 0.4 + (1000 / current.avgResponseTime) * 0.2;
      return currentScore > bestScore ? current : best;
    });
    
    console.log(`   Optimal Concurrency: ${optimalResult.concurrency} users (${optimalResult.requestsPerSecond} RPS, ${optimalResult.successRate.toFixed(2)}% success)`);
  }

  generateRecommendations() {
    const lastResult = this.results[this.results.length - 1];
    
    if (this.breakingPoint) {
      console.log(`   🎯 System can handle up to ${this.breakingPoint - this.stepSize} concurrent users reliably`);
      console.log(`   ⚠️  Performance degrades significantly beyond ${this.breakingPoint} users`);
    } else {
      console.log(`   🎉 System handled ${this.maxConcurrency} concurrent users without breaking`);
      console.log(`   📈 Consider testing with higher concurrency to find the actual limit`);
    }
    
    // Response time recommendations
    if (lastResult.avgResponseTime > 1000) {
      console.log(`   🐌 High response times detected - consider optimizing database queries and caching`);
    }
    
    // Error rate recommendations
    if (lastResult.successRate < 99) {
      console.log(`   ❌ Error rate is high - investigate failed requests and improve error handling`);
    }
    
    // Throughput recommendations
    if (lastResult.requestsPerSecond < 100) {
      console.log(`   📉 Low throughput - consider horizontal scaling or performance optimization`);
    }
    
    // Resource recommendations
    console.log(`   💾 Monitor CPU, memory, and database connections during peak load`);
    console.log(`   🔄 Consider implementing circuit breakers and rate limiting`);
    console.log(`   📊 Set up monitoring alerts for key performance metrics`);
  }

  saveStressReport() {
    const report = {
      timestamp: new Date().toISOString(),
      configuration: {
        baseUrl: this.baseUrl,
        maxConcurrency: this.maxConcurrency,
        stepSize: this.stepSize,
        stepDuration: this.stepDuration
      },
      breakingPoint: this.breakingPoint,
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
    const reportsDir = path.join(__dirname, '../stress-test-reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    const reportFile = path.join(reportsDir, `stress-test-${Date.now()}.json`);
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
      case 'max-concurrency':
        options.maxConcurrency = parseInt(value);
        break;
      case 'step-size':
        options.stepSize = parseInt(value);
        break;
      case 'step-duration':
        options.stepDuration = parseInt(value) * 1000; // Convert to ms
        break;
    }
  }
  
  const stressTest = new StressTestRunner(options);
  stressTest.runStressTest().catch(console.error);
}

module.exports = StressTestRunner;
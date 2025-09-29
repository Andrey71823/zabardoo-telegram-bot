const LoadTestRunner = require('./load-test');
const StressTestRunner = require('./stress-test');
const PerformanceBenchmark = require('./performance-benchmark');
const fs = require('fs');
const path = require('path');

class PerformanceTestSuite {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:3000';
    this.testTypes = options.testTypes || ['benchmark', 'load', 'stress'];
    this.outputDir = options.outputDir || path.join(__dirname, '../performance-reports');
    this.results = {
      timestamp: new Date().toISOString(),
      baseUrl: this.baseUrl,
      testResults: {},
      summary: {},
      recommendations: []
    };
  }

  async runAllTests() {
    console.log('🚀 Starting Complete Performance Test Suite');
    console.log('=' .repeat(60));
    console.log(`Base URL: ${this.baseUrl}`);
    console.log(`Test Types: ${this.testTypes.join(', ')}`);
    console.log('=' .repeat(60));

    try {
      // Ensure output directory exists
      this.ensureOutputDirectory();

      // Run pre-test health check
      await this.preTestHealthCheck();

      // Run selected tests
      if (this.testTypes.includes('benchmark')) {
        await this.runBenchmarkTest();
      }

      if (this.testTypes.includes('load')) {
        await this.runLoadTest();
      }

      if (this.testTypes.includes('stress')) {
        await this.runStressTest();
      }

      // Generate comprehensive report
      this.generateComprehensiveReport();

    } catch (error) {
      console.error('❌ Performance test suite failed:', error.message);
      process.exit(1);
    }
  }

  ensureOutputDirectory() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async preTestHealthCheck() {
    console.log('\n🏥 Running pre-test system health check...');
    
    const axios = require('axios');
    
    try {
      // Basic health check
      const healthResponse = await axios.get(`${this.baseUrl}/api/health`, { timeout: 10000 });
      if (!healthResponse.data.success) {
        throw new Error('Health check failed');
      }

      // Check system metrics
      try {
        const metricsResponse = await axios.get(`${this.baseUrl}/api/monitoring/metrics`, { timeout: 10000 });
        if (metricsResponse.data.success) {
          const metrics = metricsResponse.data.data.system;
          console.log(`   CPU Usage: ${metrics.cpu.usage.toFixed(2)}%`);
          console.log(`   Memory Usage: ${((metrics.memory.used / metrics.memory.total) * 100).toFixed(2)}%`);
          console.log(`   Load Average: ${metrics.loadAverage.join(', ')}`);
          
          // Store baseline metrics
          this.results.baselineMetrics = metrics;
        }
      } catch (error) {
        console.log('   ⚠️  Could not collect system metrics');
      }

      console.log('   ✅ System is healthy and ready for testing');

    } catch (error) {
      throw new Error(`Pre-test health check failed: ${error.message}`);
    }
  }

  async runBenchmarkTest() {
    console.log('\n🏃 Running Performance Benchmark...');
    
    const benchmark = new PerformanceBenchmark({
      baseUrl: this.baseUrl,
      warmupRequests: 50,
      benchmarkRequests: 500,
      concurrency: 5
    });

    // Capture benchmark results
    const originalSaveBenchmarkReport = benchmark.saveBenchmarkReport;
    benchmark.saveBenchmarkReport = () => {
      this.results.testResults.benchmark = {
        endpoints: benchmark.results.endpoints,
        environment: benchmark.results.environment,
        summary: this.summarizeBenchmarkResults(benchmark.results.endpoints)
      };
      originalSaveBenchmarkReport.call(benchmark);
    };

    await benchmark.runBenchmark();
    console.log('   ✅ Benchmark test completed');
  }

  async runLoadTest() {
    console.log('\n⚡ Running Load Test...');
    
    const loadTest = new LoadTestRunner({
      baseUrl: this.baseUrl,
      concurrency: 100,
      duration: 60000, // 1 minute
      rampUpTime: 10000,
      scenarios: ['basic', 'api', 'user_journey']
    });

    // Capture load test results
    const originalGenerateReport = loadTest.generateReport;
    loadTest.generateReport = function() {
      // Don't print the full report
      console.log(`   📊 Load Test Results: ${this.results.totalRequests} requests, ${((this.results.successfulRequests / this.results.totalRequests) * 100).toFixed(2)}% success, ${this.results.requestsPerSecond} RPS`);
    };

    if (require('cluster').isMaster) {
      await loadTest.runMasterProcess();
      
      this.results.testResults.load = {
        totalRequests: loadTest.results.totalRequests,
        successfulRequests: loadTest.results.successfulRequests,
        failedRequests: loadTest.results.failedRequests,
        successRate: (loadTest.results.successfulRequests / loadTest.results.totalRequests) * 100,
        requestsPerSecond: parseFloat(loadTest.results.requestsPerSecond),
        responseTimeDistribution: loadTest.results.responseTimeDistribution,
        errors: loadTest.results.errors
      };
    }

    console.log('   ✅ Load test completed');
  }

  async runStressTest() {
    console.log('\n💥 Running Stress Test...');
    
    const stressTest = new StressTestRunner({
      baseUrl: this.baseUrl,
      maxConcurrency: 500,
      stepSize: 50,
      stepDuration: 30000 // 30 seconds per step
    });

    // Capture stress test results
    const originalGenerateStressReport = stressTest.generateStressReport;
    stressTest.generateStressReport = function() {
      console.log(`   💪 Stress Test Results: Breaking point at ${this.breakingPoint || 'not reached'} users`);
    };

    if (require('cluster').isMaster) {
      await stressTest.runStressSteps();
      
      this.results.testResults.stress = {
        breakingPoint: stressTest.breakingPoint,
        maxConcurrencyTested: Math.max(...stressTest.results.map(r => r.concurrency)),
        steps: stressTest.results,
        optimalConcurrency: this.findOptimalConcurrency(stressTest.results)
      };
    }

    console.log('   ✅ Stress test completed');
  }

  summarizeBenchmarkResults(endpoints) {
    const endpointStats = Object.values(endpoints);
    
    return {
      totalEndpoints: endpointStats.length,
      avgResponseTime: endpointStats.reduce((sum, ep) => sum + ep.statistics.avgResponseTime, 0) / endpointStats.length,
      avgThroughput: endpointStats.reduce((sum, ep) => sum + ep.statistics.requestsPerSecond, 0) / endpointStats.length,
      overallSuccessRate: endpointStats.reduce((sum, ep) => sum + ep.statistics.successRate, 0) / endpointStats.length,
      fastestEndpoint: endpointStats.reduce((fastest, ep) => 
        ep.statistics.avgResponseTime < fastest.statistics.avgResponseTime ? ep : fastest
      ),
      slowestEndpoint: endpointStats.reduce((slowest, ep) => 
        ep.statistics.avgResponseTime > slowest.statistics.avgResponseTime ? ep : slowest
      )
    };
  }

  findOptimalConcurrency(stressResults) {
    if (stressResults.length === 0) return null;
    
    return stressResults.reduce((optimal, current) => {
      const optimalScore = optimal.successRate * 0.4 + (optimal.requestsPerSecond / 10) * 0.4 + (1000 / optimal.avgResponseTime) * 0.2;
      const currentScore = current.successRate * 0.4 + (current.requestsPerSecond / 10) * 0.4 + (1000 / current.avgResponseTime) * 0.2;
      return currentScore > optimalScore ? current : optimal;
    });
  }

  generateComprehensiveReport() {
    console.log('\n📊 COMPREHENSIVE PERFORMANCE REPORT');
    console.log('=' .repeat(80));

    // Executive Summary
    console.log('📋 Executive Summary:');
    this.generateExecutiveSummary();

    // Test Results Summary
    console.log('\n📈 Test Results Summary:');
    this.summarizeTestResults();

    // Performance Analysis
    console.log('\n🔍 Performance Analysis:');
    this.analyzePerformance();

    // Recommendations
    console.log('\n💡 Recommendations:');
    this.generateRecommendations();

    // Capacity Planning
    console.log('\n📊 Capacity Planning:');
    this.generateCapacityPlan();

    // Save comprehensive report
    this.saveComprehensiveReport();

    console.log('\n🏁 Performance test suite completed!');
  }

  generateExecutiveSummary() {
    const summary = this.results.summary;
    
    // Overall system health
    let overallHealth = 'Good';
    let healthScore = 0;
    
    if (this.results.testResults.benchmark) {
      const benchmarkSummary = this.results.testResults.benchmark.summary;
      if (benchmarkSummary.overallSuccessRate >= 99 && benchmarkSummary.avgResponseTime <= 500) {
        healthScore += 1;
      }
    }
    
    if (this.results.testResults.load) {
      const loadResults = this.results.testResults.load;
      if (loadResults.successRate >= 99 && loadResults.requestsPerSecond >= 100) {
        healthScore += 1;
      }
    }
    
    if (this.results.testResults.stress) {
      const stressResults = this.results.testResults.stress;
      if (!stressResults.breakingPoint || stressResults.breakingPoint >= 200) {
        healthScore += 1;
      }
    }
    
    if (healthScore === 3) {
      overallHealth = 'Excellent';
    } else if (healthScore === 2) {
      overallHealth = 'Good';
    } else if (healthScore === 1) {
      overallHealth = 'Fair';
    } else {
      overallHealth = 'Poor';
    }
    
    console.log(`   Overall System Health: ${overallHealth}`);
    console.log(`   Tests Completed: ${Object.keys(this.results.testResults).length}`);
    console.log(`   Test Duration: ${new Date().toISOString()}`);
    
    summary.overallHealth = overallHealth;
    summary.healthScore = healthScore;
  }

  summarizeTestResults() {
    if (this.results.testResults.benchmark) {
      const benchmark = this.results.testResults.benchmark.summary;
      console.log(`   🏃 Benchmark: ${benchmark.totalEndpoints} endpoints, ${benchmark.avgResponseTime.toFixed(2)}ms avg, ${benchmark.overallSuccessRate.toFixed(2)}% success`);
    }
    
    if (this.results.testResults.load) {
      const load = this.results.testResults.load;
      console.log(`   ⚡ Load Test: ${load.totalRequests} requests, ${load.successRate.toFixed(2)}% success, ${load.requestsPerSecond} RPS`);
    }
    
    if (this.results.testResults.stress) {
      const stress = this.results.testResults.stress;
      console.log(`   💥 Stress Test: Max ${stress.maxConcurrencyTested} users, breaking point at ${stress.breakingPoint || 'not reached'}`);
    }
  }

  analyzePerformance() {
    const analysis = [];
    
    // Response time analysis
    if (this.results.testResults.benchmark) {
      const avgResponseTime = this.results.testResults.benchmark.summary.avgResponseTime;
      if (avgResponseTime <= 200) {
        analysis.push('✅ Response times are excellent (≤200ms)');
      } else if (avgResponseTime <= 500) {
        analysis.push('✅ Response times are good (≤500ms)');
      } else if (avgResponseTime <= 1000) {
        analysis.push('⚠️  Response times are acceptable (≤1s)');
      } else {
        analysis.push('❌ Response times are poor (>1s)');
      }
    }
    
    // Throughput analysis
    if (this.results.testResults.load) {
      const rps = this.results.testResults.load.requestsPerSecond;
      if (rps >= 1000) {
        analysis.push('✅ Throughput is excellent (≥1000 RPS)');
      } else if (rps >= 500) {
        analysis.push('✅ Throughput is good (≥500 RPS)');
      } else if (rps >= 100) {
        analysis.push('⚠️  Throughput is acceptable (≥100 RPS)');
      } else {
        analysis.push('❌ Throughput is poor (<100 RPS)');
      }
    }
    
    // Scalability analysis
    if (this.results.testResults.stress) {
      const breakingPoint = this.results.testResults.stress.breakingPoint;
      if (!breakingPoint || breakingPoint >= 500) {
        analysis.push('✅ System scales well (≥500 concurrent users)');
      } else if (breakingPoint >= 200) {
        analysis.push('✅ System has good scalability (≥200 concurrent users)');
      } else if (breakingPoint >= 100) {
        analysis.push('⚠️  System has limited scalability (≥100 concurrent users)');
      } else {
        analysis.push('❌ System has poor scalability (<100 concurrent users)');
      }
    }
    
    analysis.forEach(item => console.log(`   ${item}`));
    this.results.analysis = analysis;
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Performance recommendations
    if (this.results.testResults.benchmark) {
      const benchmark = this.results.testResults.benchmark.summary;
      if (benchmark.avgResponseTime > 500) {
        recommendations.push('🐌 Optimize slow endpoints - consider caching and database optimization');
      }
      if (benchmark.overallSuccessRate < 99) {
        recommendations.push('❌ Investigate and fix error-prone endpoints');
      }
    }
    
    // Load test recommendations
    if (this.results.testResults.load) {
      const load = this.results.testResults.load;
      if (load.successRate < 99) {
        recommendations.push('⚠️  Improve error handling and system stability under load');
      }
      if (load.requestsPerSecond < 100) {
        recommendations.push('📈 Consider horizontal scaling to improve throughput');
      }
    }
    
    // Stress test recommendations
    if (this.results.testResults.stress) {
      const stress = this.results.testResults.stress;
      if (stress.breakingPoint && stress.breakingPoint < 200) {
        recommendations.push('💪 Implement auto-scaling to handle traffic spikes');
        recommendations.push('🔧 Optimize resource usage and connection pooling');
      }
    }
    
    // General recommendations
    recommendations.push('📊 Set up continuous performance monitoring');
    recommendations.push('🚨 Configure performance alerts and thresholds');
    recommendations.push('🔄 Implement circuit breakers and rate limiting');
    recommendations.push('💾 Monitor database performance and optimize queries');
    
    recommendations.forEach(rec => console.log(`   ${rec}`));
    this.results.recommendations = recommendations;
  }

  generateCapacityPlan() {
    const capacityPlan = {
      currentCapacity: {},
      recommendations: {},
      scaling: {}
    };
    
    if (this.results.testResults.stress && this.results.testResults.stress.optimalConcurrency) {
      const optimal = this.results.testResults.stress.optimalConcurrency;
      capacityPlan.currentCapacity.optimalUsers = optimal.concurrency;
      capacityPlan.currentCapacity.optimalRPS = optimal.requestsPerSecond;
      
      console.log(`   Optimal Capacity: ${optimal.concurrency} concurrent users`);
      console.log(`   Optimal Throughput: ${optimal.requestsPerSecond.toFixed(2)} RPS`);
    }
    
    if (this.results.testResults.stress && this.results.testResults.stress.breakingPoint) {
      const breakingPoint = this.results.testResults.stress.breakingPoint;
      const safeCapacity = Math.floor(breakingPoint * 0.8); // 80% of breaking point
      
      capacityPlan.recommendations.safeCapacity = safeCapacity;
      capacityPlan.recommendations.maxCapacity = breakingPoint;
      
      console.log(`   Safe Operating Capacity: ${safeCapacity} concurrent users`);
      console.log(`   Maximum Capacity: ${breakingPoint} concurrent users`);
      
      // Scaling recommendations
      if (breakingPoint < 500) {
        console.log(`   🔧 Scaling Needed: Consider adding more server instances`);
        capacityPlan.scaling.recommendation = 'horizontal_scaling_needed';
      } else {
        console.log(`   ✅ Current Capacity: Sufficient for most workloads`);
        capacityPlan.scaling.recommendation = 'capacity_sufficient';
      }
    }
    
    this.results.capacityPlan = capacityPlan;
  }

  saveComprehensiveReport() {
    const reportFile = path.join(this.outputDir, `comprehensive-performance-report-${Date.now()}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(this.results, null, 2));
    
    // Also save a human-readable summary
    const summaryFile = path.join(this.outputDir, `performance-summary-${Date.now()}.txt`);
    const summaryContent = this.generateTextSummary();
    fs.writeFileSync(summaryFile, summaryContent);
    
    console.log(`\n📄 Comprehensive report saved: ${reportFile}`);
    console.log(`📄 Summary report saved: ${summaryFile}`);
  }

  generateTextSummary() {
    let summary = 'bazaarGuru TELEGRAM BOT - PERFORMANCE TEST SUMMARY\n';
    summary += '=' .repeat(60) + '\n\n';
    
    summary += `Test Date: ${this.results.timestamp}\n`;
    summary += `Base URL: ${this.results.baseUrl}\n`;
    summary += `Overall Health: ${this.results.summary.overallHealth}\n\n`;
    
    if (this.results.testResults.benchmark) {
      const benchmark = this.results.testResults.benchmark.summary;
      summary += 'BENCHMARK RESULTS:\n';
      summary += `- Endpoints Tested: ${benchmark.totalEndpoints}\n`;
      summary += `- Average Response Time: ${benchmark.avgResponseTime.toFixed(2)}ms\n`;
      summary += `- Overall Success Rate: ${benchmark.overallSuccessRate.toFixed(2)}%\n\n`;
    }
    
    if (this.results.testResults.load) {
      const load = this.results.testResults.load;
      summary += 'LOAD TEST RESULTS:\n';
      summary += `- Total Requests: ${load.totalRequests}\n`;
      summary += `- Success Rate: ${load.successRate.toFixed(2)}%\n`;
      summary += `- Throughput: ${load.requestsPerSecond} RPS\n\n`;
    }
    
    if (this.results.testResults.stress) {
      const stress = this.results.testResults.stress;
      summary += 'STRESS TEST RESULTS:\n';
      summary += `- Max Concurrency Tested: ${stress.maxConcurrencyTested}\n`;
      summary += `- Breaking Point: ${stress.breakingPoint || 'Not reached'}\n`;
      if (stress.optimalConcurrency) {
        summary += `- Optimal Concurrency: ${stress.optimalConcurrency.concurrency} users\n`;
      }
      summary += '\n';
    }
    
    summary += 'RECOMMENDATIONS:\n';
    this.results.recommendations.forEach(rec => {
      summary += `- ${rec.replace(/[🐌❌⚠️📈💪🔧📊🚨🔄💾]/g, '').trim()}\n`;
    });
    
    return summary;
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
      case 'tests':
        options.testTypes = value.split(',');
        break;
      case 'output':
        options.outputDir = value;
        break;
    }
  }
  
  const testSuite = new PerformanceTestSuite(options);
  testSuite.runAllTests().catch(console.error);
}

module.exports = PerformanceTestSuite;
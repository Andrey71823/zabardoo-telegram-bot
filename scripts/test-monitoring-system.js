#!/usr/bin/env node

const { performanceMonitor } = require('../src/services/monitoring/PerformanceMonitor');
const { alertingService } = require('../src/services/monitoring/AlertingService');
const { metricsCollector } = require('../src/services/monitoring/MetricsCollector');
const { logger } = require('../src/config/logger');

/**
 * Test script for the monitoring system
 */
class MonitoringSystemTest {
  constructor() {
    this.testResults = {
      performanceMonitor: { passed: 0, failed: 0, tests: [] },
      alertingService: { passed: 0, failed: 0, tests: [] },
      metricsCollector: { passed: 0, failed: 0, tests: [] },
      integration: { passed: 0, failed: 0, tests: [] }
    };
  }

  /**
   * Run all monitoring system tests
   */
  async runAllTests() {
    console.log('🔍 Starting Monitoring System Tests...\n');

    try {
      await this.testPerformanceMonitor();
      await this.testAlertingService();
      await this.testMetricsCollector();
      await this.testIntegration();

      this.printResults();
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    }
  }

  /**
   * Test Performance Monitor
   */
  async testPerformanceMonitor() {
    console.log('📊 Testing Performance Monitor...');

    // Test 1: Start/Stop Monitoring
    await this.runTest('performanceMonitor', 'Start/Stop Monitoring', async () => {
      return new Promise((resolve, reject) => {
        let startCalled = false;
        let stopCalled = false;

        const startHandler = () => { startCalled = true; };
        const stopHandler = () => { stopCalled = true; };

        performanceMonitor.on('monitoringStarted', startHandler);
        performanceMonitor.on('monitoringStopped', stopHandler);

        performanceMonitor.startMonitoring(1000);
        
        setTimeout(() => {
          performanceMonitor.stopMonitoring();
          
          setTimeout(() => {
            performanceMonitor.removeListener('monitoringStarted', startHandler);
            performanceMonitor.removeListener('monitoringStopped', stopHandler);
            
            if (startCalled && stopCalled) {
              resolve('Monitoring start/stop works correctly');
            } else {
              reject(new Error(`Start called: ${startCalled}, Stop called: ${stopCalled}`));
            }
          }, 100);
        }, 100);
      });
    });

    // Test 2: Metrics Collection
    await this.runTest('performanceMonitor', 'Metrics Collection', async () => {
      return new Promise((resolve, reject) => {
        let metricsCollected = false;

        const metricsHandler = (metrics) => {
          metricsCollected = true;
          
          if (metrics && metrics.timestamp && metrics.cpu && metrics.memory) {
            resolve('Metrics collection works correctly');
          } else {
            reject(new Error('Invalid metrics structure'));
          }
        };

        performanceMonitor.on('metricsCollected', metricsHandler);
        performanceMonitor.startMonitoring(500);

        setTimeout(() => {
          performanceMonitor.stopMonitoring();
          performanceMonitor.removeListener('metricsCollected', metricsHandler);
          
          if (!metricsCollected) {
            reject(new Error('No metrics were collected'));
          }
        }, 1000);
      });
    });

    // Test 3: Alert Rules Management
    await this.runTest('performanceMonitor', 'Alert Rules Management', async () => {
      const testRule = {
        id: 'test-rule-pm',
        name: 'Test Rule',
        category: 'cpu',
        metric: 'usage',
        operator: 'greater_than',
        threshold: 90,
        severity: 'warning',
        duration: 60000,
        enabled: true,
        description: 'Test alert rule'
      };

      performanceMonitor.addAlertRule(testRule);
      
      const rules = performanceMonitor.getAlertRules();
      const addedRule = rules.find(r => r.id === 'test-rule-pm');
      
      if (!addedRule) {
        throw new Error('Rule was not added');
      }

      const removed = performanceMonitor.removeAlertRule('test-rule-pm');
      if (!removed) {
        throw new Error('Rule was not removed');
      }

      const rulesAfterRemoval = performanceMonitor.getAlertRules();
      const removedRule = rulesAfterRemoval.find(r => r.id === 'test-rule-pm');
      
      if (removedRule) {
        throw new Error('Rule was not properly removed');
      }

      return 'Alert rules management works correctly';
    });

    // Test 4: Current Metrics Retrieval
    await this.runTest('performanceMonitor', 'Current Metrics Retrieval', async () => {
      const metrics = await performanceMonitor.getMetrics();
      
      if (!metrics) {
        throw new Error('No metrics returned');
      }

      if (!metrics.timestamp || !metrics.cpu || !metrics.memory || !metrics.application) {
        throw new Error('Incomplete metrics structure');
      }

      return 'Current metrics retrieval works correctly';
    });

    console.log('✅ Performance Monitor tests completed\n');
  }

  /**
   * Test Alerting Service
   */
  async testAlertingService() {
    console.log('🚨 Testing Alerting Service...');

    // Test 1: Initialization
    await this.runTest('alertingService', 'Initialization', async () => {
      await alertingService.initialize();
      
      const channels = alertingService.getNotificationChannels();
      const rules = alertingService.getEscalationRules();
      
      if (channels.length === 0) {
        throw new Error('No notification channels found');
      }
      
      if (rules.length === 0) {
        throw new Error('No escalation rules found');
      }

      return 'Alerting service initialization works correctly';
    });

    // Test 2: Notification Channels Management
    await this.runTest('alertingService', 'Notification Channels Management', async () => {
      const testChannel = {
        id: 'test-channel-as',
        name: 'Test Channel',
        type: 'webhook',
        config: { url: 'https://example.com/test' },
        enabled: true,
        alertLevels: ['error', 'critical']
      };

      alertingService.addNotificationChannel(testChannel);
      
      const channels = alertingService.getNotificationChannels();
      const addedChannel = channels.find(c => c.id === 'test-channel-as');
      
      if (!addedChannel) {
        throw new Error('Channel was not added');
      }

      const removed = alertingService.removeNotificationChannel('test-channel-as');
      if (!removed) {
        throw new Error('Channel was not removed');
      }

      return 'Notification channels management works correctly';
    });

    // Test 3: Channel Testing
    await this.runTest('alertingService', 'Channel Testing', async () => {
      const result = await alertingService.testNotificationChannel('console-log');
      
      if (!result) {
        throw new Error('Console channel test failed');
      }

      return 'Channel testing works correctly';
    });

    // Test 4: Alert Handling
    await this.runTest('alertingService', 'Alert Handling', async () => {
      return new Promise((resolve, reject) => {
        let alertHandled = false;

        const alertHandler = (alert) => {
          alertHandled = true;
          if (alert && alert.id === 'test-alert-as') {
            resolve('Alert handling works correctly');
          } else {
            reject(new Error('Invalid alert received'));
          }
        };

        alertingService.on('alertHandled', alertHandler);

        // Simulate alert from performance monitor
        const testAlert = {
          id: 'test-alert-as',
          timestamp: new Date(),
          level: 'warning',
          category: 'system',
          title: 'Test Alert',
          description: 'Test alert for alerting service',
          metrics: {},
          resolved: false
        };

        performanceMonitor.emit('alertTriggered', testAlert);

        setTimeout(() => {
          alertingService.removeListener('alertHandled', alertHandler);
          if (!alertHandled) {
            reject(new Error('Alert was not handled'));
          }
        }, 1000);
      });
    });

    console.log('✅ Alerting Service tests completed\n');
  }

  /**
   * Test Metrics Collector
   */
  async testMetricsCollector() {
    console.log('📈 Testing Metrics Collector...');

    // Test 1: Start/Stop Collection
    await this.runTest('metricsCollector', 'Start/Stop Collection', async () => {
      return new Promise((resolve, reject) => {
        let startCalled = false;
        let stopCalled = false;

        const startHandler = () => { startCalled = true; };
        const stopHandler = () => { stopCalled = true; };

        metricsCollector.on('collectionStarted', startHandler);
        metricsCollector.on('collectionStopped', stopHandler);

        metricsCollector.startCollection(1000);
        
        setTimeout(() => {
          metricsCollector.stopCollection();
          
          setTimeout(() => {
            metricsCollector.removeListener('collectionStarted', startHandler);
            metricsCollector.removeListener('collectionStopped', stopHandler);
            
            if (startCalled && stopCalled) {
              resolve('Collection start/stop works correctly');
            } else {
              reject(new Error(`Start called: ${startCalled}, Stop called: ${stopCalled}`));
            }
          }, 100);
        }, 100);
      });
    });

    // Test 2: Detailed Metrics Collection
    await this.runTest('metricsCollector', 'Detailed Metrics Collection', async () => {
      const metrics = await metricsCollector.getCurrentMetrics();
      
      if (!metrics) {
        throw new Error('No metrics returned');
      }

      const requiredSections = ['system', 'process', 'application', 'database', 'cache', 'gc'];
      for (const section of requiredSections) {
        if (!metrics[section]) {
          throw new Error(`Missing metrics section: ${section}`);
        }
      }

      return 'Detailed metrics collection works correctly';
    });

    // Test 3: Request Recording
    await this.runTest('metricsCollector', 'Request Recording', async () => {
      const initialStats = metricsCollector.getApplicationStats();
      const initialRequests = initialStats.requestsTotal;
      const initialErrors = initialStats.totalErrors;

      metricsCollector.recordRequest(100, false);
      metricsCollector.recordRequest(200, true);

      const updatedStats = metricsCollector.getApplicationStats();
      
      if (updatedStats.requestsTotal !== initialRequests + 2) {
        throw new Error('Request count not updated correctly');
      }
      
      if (updatedStats.totalErrors !== initialErrors + 1) {
        throw new Error('Error count not updated correctly');
      }

      return 'Request recording works correctly';
    });

    // Test 4: Route Metrics
    await this.runTest('metricsCollector', 'Route Metrics', async () => {
      metricsCollector.recordRouteMetrics('/api/test', 'GET', 150, false);
      metricsCollector.recordRouteMetrics('/api/test', 'GET', 250, true);

      const routeMetrics = metricsCollector.getRouteMetrics();
      const testRoute = routeMetrics.find(r => r.path === '/api/test' && r.method === 'GET');
      
      if (!testRoute) {
        throw new Error('Route metrics not recorded');
      }
      
      if (testRoute.requests !== 2) {
        throw new Error('Route request count incorrect');
      }
      
      if (testRoute.averageResponseTime !== 200) {
        throw new Error('Route average response time incorrect');
      }

      return 'Route metrics recording works correctly';
    });

    // Test 5: GC Event Recording
    await this.runTest('metricsCollector', 'GC Event Recording', async () => {
      return new Promise((resolve, reject) => {
        const gcHandler = (gcEvent) => {
          if (gcEvent.type === 'test-gc' && gcEvent.duration === 50) {
            resolve('GC event recording works correctly');
          } else {
            reject(new Error('Invalid GC event received'));
          }
        };

        metricsCollector.on('gcEvent', gcHandler);
        metricsCollector.recordGCEvent('test-gc', 50, 1000000, 800000);

        setTimeout(() => {
          metricsCollector.removeListener('gcEvent', gcHandler);
          reject(new Error('GC event not received'));
        }, 1000);
      });
    });

    console.log('✅ Metrics Collector tests completed\n');
  }

  /**
   * Test Integration
   */
  async testIntegration() {
    console.log('🔗 Testing Integration...');

    // Test 1: Full System Integration
    await this.runTest('integration', 'Full System Integration', async () => {
      return new Promise(async (resolve, reject) => {
        let alertTriggered = false;
        let metricsCollected = false;
        let alertHandled = false;

        const alertHandler = () => { alertTriggered = true; };
        const metricsHandler = () => { metricsCollected = true; };
        const notificationHandler = () => { alertHandled = true; };

        performanceMonitor.on('alertTriggered', alertHandler);
        metricsCollector.on('metricsCollected', metricsHandler);
        alertingService.on('alertHandled', notificationHandler);

        // Initialize alerting service
        await alertingService.initialize();

        // Add a low-threshold rule to trigger alerts
        const testRule = {
          id: 'integration-test-rule',
          name: 'Integration Test Rule',
          category: 'cpu',
          metric: 'usage',
          operator: 'greater_than',
          threshold: 0, // Very low threshold
          severity: 'warning',
          duration: 100, // Short duration
          enabled: true,
          description: 'Integration test rule'
        };

        performanceMonitor.addAlertRule(testRule);

        // Start monitoring
        performanceMonitor.startMonitoring(200);
        metricsCollector.startCollection(200);

        // Record some activity
        metricsCollector.recordRequest(100, false);
        metricsCollector.recordRequest(200, true);
        metricsCollector.updateActiveConnections(5);

        setTimeout(() => {
          performanceMonitor.stopMonitoring();
          metricsCollector.stopCollection();
          performanceMonitor.removeAlertRule('integration-test-rule');

          performanceMonitor.removeListener('alertTriggered', alertHandler);
          metricsCollector.removeListener('metricsCollected', metricsHandler);
          alertingService.removeListener('alertHandled', notificationHandler);

          if (metricsCollected) {
            resolve('Full system integration works correctly');
          } else {
            reject(new Error(`Integration test failed - Metrics: ${metricsCollected}, Alert: ${alertTriggered}, Handled: ${alertHandled}`));
          }
        }, 1000);
      });
    });

    // Test 2: Performance Under Load
    await this.runTest('integration', 'Performance Under Load', async () => {
      // Simulate high load
      const startTime = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        metricsCollector.recordRequest(Math.random() * 500, Math.random() > 0.9);
        if (i % 100 === 0) {
          metricsCollector.recordRouteMetrics(`/api/endpoint${i % 10}`, 'GET', Math.random() * 300, Math.random() > 0.95);
        }
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      if (duration > 5000) { // Should complete within 5 seconds
        throw new Error(`Performance test took too long: ${duration}ms`);
      }

      const stats = metricsCollector.getApplicationStats();
      if (stats.requestsTotal < 1000) {
        throw new Error('Not all requests were recorded');
      }

      return `Performance under load works correctly (${duration}ms for 1000 requests)`;
    });

    // Test 3: Memory Usage
    await this.runTest('integration', 'Memory Usage', async () => {
      const initialMemory = process.memoryUsage();
      
      // Start all monitoring services
      performanceMonitor.startMonitoring(100);
      metricsCollector.startCollection(100);
      await alertingService.initialize();

      // Let them run for a bit
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Stop services
      performanceMonitor.stopMonitoring();
      metricsCollector.stopCollection();

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable (less than 50MB)
      if (memoryIncrease > 50 * 1024 * 1024) {
        throw new Error(`Excessive memory usage: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
      }

      return `Memory usage is acceptable (${Math.round(memoryIncrease / 1024 / 1024)}MB increase)`;
    });

    console.log('✅ Integration tests completed\n');
  }

  /**
   * Run a single test
   */
  async runTest(category, testName, testFunction) {
    try {
      const result = await testFunction();
      this.testResults[category].passed++;
      this.testResults[category].tests.push({ name: testName, status: 'PASSED', message: result });
      console.log(`  ✅ ${testName}: PASSED`);
    } catch (error) {
      this.testResults[category].failed++;
      this.testResults[category].tests.push({ name: testName, status: 'FAILED', message: error.message });
      console.log(`  ❌ ${testName}: FAILED - ${error.message}`);
    }
  }

  /**
   * Print test results summary
   */
  printResults() {
    console.log('\n📋 Test Results Summary:');
    console.log('========================');

    let totalPassed = 0;
    let totalFailed = 0;

    for (const [category, results] of Object.entries(this.testResults)) {
      const categoryName = category.charAt(0).toUpperCase() + category.slice(1).replace(/([A-Z])/g, ' $1');
      console.log(`\n${categoryName}:`);
      console.log(`  Passed: ${results.passed}`);
      console.log(`  Failed: ${results.failed}`);
      
      totalPassed += results.passed;
      totalFailed += results.failed;

      if (results.failed > 0) {
        console.log('  Failed tests:');
        results.tests
          .filter(test => test.status === 'FAILED')
          .forEach(test => console.log(`    - ${test.name}: ${test.message}`));
      }
    }

    console.log('\n========================');
    console.log(`Total Tests: ${totalPassed + totalFailed}`);
    console.log(`Passed: ${totalPassed}`);
    console.log(`Failed: ${totalFailed}`);
    console.log(`Success Rate: ${((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1)}%`);

    if (totalFailed === 0) {
      console.log('\n🎉 All monitoring system tests passed!');
    } else {
      console.log(`\n⚠️  ${totalFailed} test(s) failed. Please review the issues above.`);
      process.exit(1);
    }
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new MonitoringSystemTest();
  tester.runAllTests().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = MonitoringSystemTest;
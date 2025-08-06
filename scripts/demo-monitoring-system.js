#!/usr/bin/env node

const { performanceMonitor } = require('../src/services/monitoring/PerformanceMonitor');
const { alertingService } = require('../src/services/monitoring/AlertingService');
const { metricsCollector } = require('../src/services/monitoring/MetricsCollector');
const { logger } = require('../src/config/logger');

/**
 * Demo script for the complete monitoring system
 */
class MonitoringSystemDemo {
  constructor() {
    this.isRunning = false;
    this.demoTimer = null;
  }

  /**
   * Start the monitoring system demo
   */
  async startDemo() {
    console.log('🚀 Starting Monitoring System Demo...\n');

    try {
      // Initialize all monitoring services
      await this.initializeServices();
      
      // Setup demo scenarios
      await this.setupDemoScenarios();
      
      // Start monitoring
      this.startMonitoring();
      
      // Run demo scenarios
      this.runDemoScenarios();
      
      // Setup graceful shutdown
      this.setupShutdown();
      
      console.log('✅ Monitoring System Demo is running!');
      console.log('📊 View the dashboard at: http://localhost:3000/monitoring/monitoring-dashboard.html');
      console.log('🔍 API endpoints:');
      console.log('   - Status: http://localhost:3000/monitoring/status');
      console.log('   - Alerts: http://localhost:3000/monitoring/alerts');
      console.log('   - Detailed Metrics: http://localhost:3000/monitoring/metrics/detailed');
      console.log('   - Performance Report: http://localhost:3000/monitoring/report?hours=1');
      console.log('\n⏹️  Press Ctrl+C to stop the demo\n');

    } catch (error) {
      console.error('❌ Failed to start monitoring demo:', error);
      process.exit(1);
    }
  }

  /**
   * Initialize monitoring services
   */
  async initializeServices() {
    console.log('🔧 Initializing monitoring services...');

    // Initialize alerting service
    await alertingService.initialize();
    console.log('  ✅ Alerting service initialized');

    // Start performance monitoring
    performanceMonitor.startMonitoring(10000); // Every 10 seconds for demo
    console.log('  ✅ Performance monitor started');

    // Start metrics collection
    metricsCollector.startCollection(10000); // Every 10 seconds for demo
    console.log('  ✅ Metrics collector started');

    // Setup event listeners
    this.setupEventListeners();
    console.log('  ✅ Event listeners configured');
  }

  /**
   * Setup event listeners for monitoring services
   */
  setupEventListeners() {
    // Performance monitor events
    performanceMonitor.on('monitoringStarted', () => {
      logger.info('📊 Performance monitoring started');
    });

    performanceMonitor.on('metricsCollected', (metrics) => {
      logger.debug(`📈 Metrics collected - CPU: ${metrics.cpu.usage.toFixed(1)}%, Memory: ${metrics.memory.usage.toFixed(1)}%`);
    });

    performanceMonitor.on('alertTriggered', (alert) => {
      console.log(`🚨 ALERT TRIGGERED: ${alert.title} (${alert.level.toUpperCase()})`);
      console.log(`   Description: ${alert.description}`);
      console.log(`   Time: ${alert.timestamp.toLocaleString()}\n`);
    });

    performanceMonitor.on('alertResolved', (alert) => {
      console.log(`✅ ALERT RESOLVED: ${alert.title}`);
      console.log(`   Resolved at: ${alert.resolvedAt?.toLocaleString()}\n`);
    });

    // Alerting service events
    alertingService.on('alertHandled', (alert) => {
      logger.info(`📢 Alert notification sent: ${alert.title}`);
    });

    alertingService.on('alertEscalated', (alert, rule) => {
      console.log(`⚠️  ALERT ESCALATED: ${alert.title}`);
      console.log(`   Escalation rule: ${rule.name}`);
      console.log(`   Time threshold exceeded: ${rule.timeThreshold}ms\n`);
    });

    // Metrics collector events
    metricsCollector.on('collectionStarted', () => {
      logger.info('📊 Detailed metrics collection started');
    });

    metricsCollector.on('metricsCollected', (metrics) => {
      logger.debug(`📊 Detailed metrics collected - App requests: ${metrics.application.requestsTotal}`);
    });

    metricsCollector.on('gcEvent', (gcEvent) => {
      logger.debug(`🗑️  GC Event: ${gcEvent.type} - ${gcEvent.duration}ms, freed ${(gcEvent.freed / 1024 / 1024).toFixed(2)}MB`);
    });
  }

  /**
   * Setup demo scenarios
   */
  async setupDemoScenarios() {
    console.log('🎭 Setting up demo scenarios...');

    // Add custom alert rules for demo
    const demoRules = [
      {
        id: 'demo-high-requests',
        name: 'Demo: High Request Rate',
        category: 'application',
        metric: 'requestsPerSecond',
        operator: 'greater_than',
        threshold: 10,
        severity: 'warning',
        duration: 30000, // 30 seconds
        enabled: true,
        description: 'Demo alert for high request rate'
      },
      {
        id: 'demo-high-response-time',
        name: 'Demo: High Response Time',
        category: 'application',
        metric: 'averageResponseTime',
        operator: 'greater_than',
        threshold: 500,
        severity: 'error',
        duration: 20000, // 20 seconds
        enabled: true,
        description: 'Demo alert for high response time'
      },
      {
        id: 'demo-memory-usage',
        name: 'Demo: High Memory Usage',
        category: 'memory',
        metric: 'usage',
        operator: 'greater_than',
        threshold: 60,
        severity: 'warning',
        duration: 25000, // 25 seconds
        enabled: true,
        description: 'Demo alert for high memory usage'
      }
    ];

    demoRules.forEach(rule => {
      performanceMonitor.addAlertRule(rule);
    });

    console.log(`  ✅ Added ${demoRules.length} demo alert rules`);

    // Add demo notification channel
    const demoChannel = {
      id: 'demo-console',
      name: 'Demo Console Notifications',
      type: 'webhook',
      config: { url: 'console' },
      enabled: true,
      alertLevels: ['info', 'warning', 'error', 'critical']
    };

    alertingService.addNotificationChannel(demoChannel);
    console.log('  ✅ Added demo notification channel');
  }

  /**
   * Start monitoring
   */
  startMonitoring() {
    this.isRunning = true;
    console.log('🔍 Monitoring services are now active...\n');
  }

  /**
   * Run demo scenarios
   */
  runDemoScenarios() {
    let scenarioCount = 0;
    const scenarios = [
      () => this.simulateHighLoad(),
      () => this.simulateSlowResponses(),
      () => this.simulateNormalLoad(),
      () => this.simulateErrorSpike(),
      () => this.simulateMemoryPressure()
    ];

    // Run scenarios every 2 minutes
    this.demoTimer = setInterval(() => {
      if (!this.isRunning) return;

      const scenario = scenarios[scenarioCount % scenarios.length];
      scenario();
      scenarioCount++;
    }, 120000); // 2 minutes

    // Start with initial scenario
    setTimeout(() => this.simulateHighLoad(), 5000);
  }

  /**
   * Simulate high load scenario
   */
  simulateHighLoad() {
    console.log('🔥 Demo Scenario: Simulating high load...');
    
    // Simulate many requests
    for (let i = 0; i < 50; i++) {
      setTimeout(() => {
        const responseTime = 100 + Math.random() * 200;
        const isError = Math.random() > 0.95;
        
        metricsCollector.recordRequest(responseTime, isError);
        metricsCollector.recordRouteMetrics('/api/demo', 'GET', responseTime, isError);
      }, i * 100);
    }

    metricsCollector.updateActiveConnections(25);
    console.log('  📈 Generated 50 requests with high concurrency');
  }

  /**
   * Simulate slow responses
   */
  simulateSlowResponses() {
    console.log('🐌 Demo Scenario: Simulating slow responses...');
    
    // Simulate slow requests
    for (let i = 0; i < 20; i++) {
      setTimeout(() => {
        const responseTime = 800 + Math.random() * 1000; // 800-1800ms
        const isError = Math.random() > 0.9;
        
        metricsCollector.recordRequest(responseTime, isError);
        metricsCollector.recordRouteMetrics('/api/slow', 'POST', responseTime, isError);
      }, i * 200);
    }

    console.log('  🕐 Generated 20 slow requests (800-1800ms response time)');
  }

  /**
   * Simulate normal load
   */
  simulateNormalLoad() {
    console.log('✅ Demo Scenario: Simulating normal load...');
    
    // Simulate normal requests
    for (let i = 0; i < 15; i++) {
      setTimeout(() => {
        const responseTime = 50 + Math.random() * 150; // 50-200ms
        const isError = Math.random() > 0.98;
        
        metricsCollector.recordRequest(responseTime, isError);
        metricsCollector.recordRouteMetrics('/api/normal', 'GET', responseTime, isError);
      }, i * 300);
    }

    metricsCollector.updateActiveConnections(5);
    console.log('  📊 Generated 15 normal requests with good response times');
  }

  /**
   * Simulate error spike
   */
  simulateErrorSpike() {
    console.log('💥 Demo Scenario: Simulating error spike...');
    
    // Simulate requests with high error rate
    for (let i = 0; i < 30; i++) {
      setTimeout(() => {
        const responseTime = 200 + Math.random() * 300;
        const isError = Math.random() > 0.7; // 30% error rate
        
        metricsCollector.recordRequest(responseTime, isError);
        metricsCollector.recordRouteMetrics('/api/error-prone', 'POST', responseTime, isError);
      }, i * 150);
    }

    console.log('  ❌ Generated 30 requests with 30% error rate');
  }

  /**
   * Simulate memory pressure
   */
  simulateMemoryPressure() {
    console.log('🧠 Demo Scenario: Simulating memory pressure...');
    
    // Simulate GC events
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const heapBefore = 50 * 1024 * 1024 + Math.random() * 20 * 1024 * 1024;
        const heapAfter = heapBefore * 0.7;
        const duration = 10 + Math.random() * 40;
        
        metricsCollector.recordGCEvent('major', duration, heapBefore, heapAfter);
      }, i * 1000);
    }

    console.log('  🗑️  Simulated 5 major GC events');
  }

  /**
   * Setup graceful shutdown
   */
  setupShutdown() {
    const shutdown = (signal) => {
      console.log(`\n🛑 Received ${signal}, shutting down monitoring demo...`);
      
      this.isRunning = false;
      
      if (this.demoTimer) {
        clearInterval(this.demoTimer);
      }

      // Stop monitoring services
      performanceMonitor.stopMonitoring();
      metricsCollector.stopCollection();
      alertingService.destroy();

      console.log('✅ Monitoring services stopped');
      console.log('👋 Demo completed successfully!');
      
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }

  /**
   * Display current status
   */
  async displayStatus() {
    try {
      const metrics = await performanceMonitor.getMetrics();
      const alerts = performanceMonitor.getActiveAlerts();
      const appStats = metricsCollector.getApplicationStats();

      console.log('\n📊 Current System Status:');
      console.log('========================');
      
      if (metrics) {
        console.log(`CPU Usage: ${metrics.cpu.usage.toFixed(1)}%`);
        console.log(`Memory Usage: ${metrics.memory.usage.toFixed(1)}%`);
        console.log(`Response Time: ${metrics.application.averageResponseTime.toFixed(0)}ms`);
        console.log(`Requests/sec: ${metrics.application.requestsPerSecond.toFixed(1)}`);
      }

      console.log(`\nApplication Stats:`);
      console.log(`Total Requests: ${appStats.requestsTotal}`);
      console.log(`Total Errors: ${appStats.totalErrors}`);
      console.log(`Active Connections: ${appStats.activeConnections}`);

      console.log(`\nActive Alerts: ${alerts.length}`);
      alerts.forEach(alert => {
        console.log(`  - ${alert.title} (${alert.level.toUpperCase()})`);
      });

      console.log('========================\n');
    } catch (error) {
      console.error('Error displaying status:', error);
    }
  }
}

// Run demo if this script is executed directly
if (require.main === module) {
  const demo = new MonitoringSystemDemo();
  
  // Display status every 60 seconds
  setInterval(() => {
    demo.displayStatus();
  }, 60000);
  
  demo.startDemo().catch(error => {
    console.error('Demo execution failed:', error);
    process.exit(1);
  });
}

module.exports = MonitoringSystemDemo;
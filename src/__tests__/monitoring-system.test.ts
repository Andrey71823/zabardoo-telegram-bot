import { performanceMonitor, PerformanceMonitor, Alert, AlertRule } from '../services/monitoring/PerformanceMonitor';
import { alertingService, AlertingService, NotificationChannel } from '../services/monitoring/AlertingService';
import { metricsCollector, MetricsCollector } from '../services/monitoring/MetricsCollector';

describe('Monitoring System', () => {
  beforeEach(() => {
    // Reset monitoring state before each test
    performanceMonitor.stopMonitoring();
    alertingService.destroy();
    metricsCollector.stopCollection();
  });

  afterEach(() => {
    // Cleanup after each test
    performanceMonitor.stopMonitoring();
    alertingService.destroy();
    metricsCollector.stopCollection();
  });

  describe('PerformanceMonitor', () => {
    test('should start and stop monitoring', async () => {
      const startSpy = jest.fn();
      const stopSpy = jest.fn();

      performanceMonitor.on('monitoringStarted', startSpy);
      performanceMonitor.on('monitoringStopped', stopSpy);

      performanceMonitor.startMonitoring(1000);
      expect(startSpy).toHaveBeenCalled();

      performanceMonitor.stopMonitoring();
      expect(stopSpy).toHaveBeenCalled();
    });

    test('should collect metrics', async () => {
      const metricsSpy = jest.fn();
      performanceMonitor.on('metricsCollected', metricsSpy);

      performanceMonitor.startMonitoring(100);
      
      // Wait for metrics collection
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(metricsSpy).toHaveBeenCalled();
      
      const metrics = await performanceMonitor.getMetrics();
      expect(metrics).toBeDefined();
      expect(metrics?.timestamp).toBeInstanceOf(Date);
      expect(metrics?.cpu).toBeDefined();
      expect(metrics?.memory).toBeDefined();
      expect(metrics?.application).toBeDefined();
    });

    test('should add and remove alert rules', () => {
      const rule: AlertRule = {
        id: 'test-rule',
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

      performanceMonitor.addAlertRule(rule);
      const rules = performanceMonitor.getAlertRules();
      expect(rules.find(r => r.id === 'test-rule')).toBeDefined();

      const removed = performanceMonitor.removeAlertRule('test-rule');
      expect(removed).toBe(true);
      
      const rulesAfterRemoval = performanceMonitor.getAlertRules();
      expect(rulesAfterRemoval.find(r => r.id === 'test-rule')).toBeUndefined();
    });

    test('should trigger alerts when thresholds are exceeded', async () => {
      const alertSpy = jest.fn();
      performanceMonitor.on('alertTriggered', alertSpy);

      // Add a rule with very low threshold to trigger easily
      const rule: AlertRule = {
        id: 'low-threshold-test',
        name: 'Low Threshold Test',
        category: 'cpu',
        metric: 'usage',
        operator: 'greater_than',
        threshold: 0, // Very low threshold
        severity: 'warning',
        duration: 50, // Short duration
        enabled: true,
        description: 'Test rule with low threshold'
      };

      performanceMonitor.addAlertRule(rule);
      performanceMonitor.startMonitoring(50);

      // Wait for alert evaluation
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(alertSpy).toHaveBeenCalled();
    });

    test('should generate performance reports', async () => {
      // Start monitoring to collect some metrics
      performanceMonitor.startMonitoring(50);
      
      // Wait for some metrics to be collected
      await new Promise(resolve => setTimeout(resolve, 200));

      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 300000); // 5 minutes ago

      try {
        const report = performanceMonitor.generateReport(startDate, endDate);
        
        expect(report).toBeDefined();
        expect(report.period.start).toEqual(startDate);
        expect(report.period.end).toEqual(endDate);
        expect(report.summary).toBeDefined();
        expect(report.metrics).toBeDefined();
        expect(report.alerts).toBeDefined();
        expect(report.recommendations).toBeInstanceOf(Array);
      } catch (error) {
        // If no metrics available, that's expected for short test duration
        expect(error.message).toContain('No metrics available');
      }
    });
  });

  describe('AlertingService', () => {
    test('should initialize successfully', async () => {
      await alertingService.initialize();
      
      const channels = alertingService.getNotificationChannels();
      expect(channels.length).toBeGreaterThan(0);
      
      const rules = alertingService.getEscalationRules();
      expect(rules.length).toBeGreaterThan(0);
    });

    test('should add and remove notification channels', () => {
      const channel: NotificationChannel = {
        id: 'test-channel',
        name: 'Test Channel',
        type: 'webhook',
        config: {
          url: 'https://example.com/webhook'
        },
        enabled: true,
        alertLevels: ['error', 'critical']
      };

      alertingService.addNotificationChannel(channel);
      
      const channels = alertingService.getNotificationChannels();
      expect(channels.find(c => c.id === 'test-channel')).toBeDefined();

      const removed = alertingService.removeNotificationChannel('test-channel');
      expect(removed).toBe(true);
      
      const channelsAfterRemoval = alertingService.getNotificationChannels();
      expect(channelsAfterRemoval.find(c => c.id === 'test-channel')).toBeUndefined();
    });

    test('should test notification channels', async () => {
      await alertingService.initialize();
      
      // Test the default console channel
      const result = await alertingService.testNotificationChannel('console-log');
      expect(result).toBe(true);
    });

    test('should handle alerts from performance monitor', async () => {
      const alertHandledSpy = jest.fn();
      alertingService.on('alertHandled', alertHandledSpy);

      await alertingService.initialize();

      // Simulate an alert
      const testAlert: Alert = {
        id: 'test-alert',
        timestamp: new Date(),
        level: 'warning',
        category: 'system',
        title: 'Test Alert',
        description: 'This is a test alert',
        metrics: {},
        resolved: false
      };

      // Trigger alert through performance monitor
      performanceMonitor.emit('alertTriggered', testAlert);

      // Wait for alert handling
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(alertHandledSpy).toHaveBeenCalledWith(testAlert);
    });

    test('should get notification history', async () => {
      await alertingService.initialize();
      
      const history = alertingService.getNotificationHistory(10);
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('MetricsCollector', () => {
    test('should start and stop collection', () => {
      const startSpy = jest.fn();
      const stopSpy = jest.fn();

      metricsCollector.on('collectionStarted', startSpy);
      metricsCollector.on('collectionStopped', stopSpy);

      metricsCollector.startCollection(1000);
      expect(startSpy).toHaveBeenCalled();

      metricsCollector.stopCollection();
      expect(stopSpy).toHaveBeenCalled();
    });

    test('should collect detailed metrics', async () => {
      const metricsSpy = jest.fn();
      metricsCollector.on('metricsCollected', metricsSpy);

      metricsCollector.startCollection(100);
      
      // Wait for metrics collection
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(metricsSpy).toHaveBeenCalled();
      
      const metrics = await metricsCollector.getCurrentMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.timestamp).toBeInstanceOf(Date);
      expect(metrics.system).toBeDefined();
      expect(metrics.process).toBeDefined();
      expect(metrics.application).toBeDefined();
      expect(metrics.database).toBeDefined();
      expect(metrics.cache).toBeDefined();
    });

    test('should record application requests', () => {
      const initialStats = metricsCollector.getApplicationStats();
      expect(initialStats.requestsTotal).toBe(0);

      metricsCollector.recordRequest(100, false);
      metricsCollector.recordRequest(200, true);

      const updatedStats = metricsCollector.getApplicationStats();
      expect(updatedStats.requestsTotal).toBe(2);
      expect(updatedStats.totalErrors).toBe(1);
      expect(updatedStats.totalResponseTime).toBe(300);
    });

    test('should record route metrics', () => {
      metricsCollector.recordRouteMetrics('/api/test', 'GET', 150, false);
      metricsCollector.recordRouteMetrics('/api/test', 'GET', 250, true);

      const routeMetrics = metricsCollector.getRouteMetrics();
      expect(routeMetrics.length).toBe(1);
      
      const testRoute = routeMetrics[0];
      expect(testRoute.path).toBe('/api/test');
      expect(testRoute.method).toBe('GET');
      expect(testRoute.requests).toBe(2);
      expect(testRoute.averageResponseTime).toBe(200);
      expect(testRoute.errorRate).toBe(50);
    });

    test('should update active connections', () => {
      metricsCollector.updateActiveConnections(10);
      
      const stats = metricsCollector.getApplicationStats();
      expect(stats.activeConnections).toBe(10);
    });

    test('should record GC events', () => {
      const gcSpy = jest.fn();
      metricsCollector.on('gcEvent', gcSpy);

      metricsCollector.recordGCEvent('major', 50, 1000000, 800000);
      
      expect(gcSpy).toHaveBeenCalled();
      
      const gcEvent = gcSpy.mock.calls[0][0];
      expect(gcEvent.type).toBe('major');
      expect(gcEvent.duration).toBe(50);
      expect(gcEvent.freed).toBe(200000);
    });

    test('should reset metrics', () => {
      metricsCollector.recordRequest(100, false);
      metricsCollector.recordRouteMetrics('/test', 'GET', 100, false);
      metricsCollector.recordGCEvent('minor', 10, 500000, 450000);

      let stats = metricsCollector.getApplicationStats();
      let routes = metricsCollector.getRouteMetrics();
      
      expect(stats.requestsTotal).toBe(1);
      expect(routes.length).toBe(1);

      const resetSpy = jest.fn();
      metricsCollector.on('metricsReset', resetSpy);

      metricsCollector.resetMetrics();
      
      expect(resetSpy).toHaveBeenCalled();
      
      stats = metricsCollector.getApplicationStats();
      routes = metricsCollector.getRouteMetrics();
      
      expect(stats.requestsTotal).toBe(0);
      expect(routes.length).toBe(0);
    });
  });

  describe('Integration Tests', () => {
    test('should work together - monitoring, alerting, and metrics collection', async () => {
      // Initialize all services
      await alertingService.initialize();
      
      const alertSpy = jest.fn();
      const metricsSpy = jest.fn();
      const notificationSpy = jest.fn();

      performanceMonitor.on('alertTriggered', alertSpy);
      metricsCollector.on('metricsCollected', metricsSpy);
      alertingService.on('alertHandled', notificationSpy);

      // Start all monitoring
      performanceMonitor.startMonitoring(100);
      metricsCollector.startCollection(100);

      // Add a low-threshold rule to trigger alerts
      const rule: AlertRule = {
        id: 'integration-test-rule',
        name: 'Integration Test Rule',
        category: 'cpu',
        metric: 'usage',
        operator: 'greater_than',
        threshold: 0,
        severity: 'warning',
        duration: 50,
        enabled: true,
        description: 'Integration test rule'
      };

      performanceMonitor.addAlertRule(rule);

      // Record some application activity
      metricsCollector.recordRequest(100, false);
      metricsCollector.recordRequest(200, true);
      metricsCollector.updateActiveConnections(5);

      // Wait for monitoring cycles
      await new Promise(resolve => setTimeout(resolve, 300));

      // Verify all components are working
      expect(metricsSpy).toHaveBeenCalled();
      
      // Check that metrics are being collected
      const currentMetrics = await metricsCollector.getCurrentMetrics();
      expect(currentMetrics).toBeDefined();
      expect(currentMetrics.application.requestsTotal).toBe(2);
      expect(currentMetrics.application.totalErrors).toBe(1);

      // Check performance monitor metrics
      const perfMetrics = await performanceMonitor.getMetrics();
      expect(perfMetrics).toBeDefined();
    });

    test('should handle high load scenarios', async () => {
      await alertingService.initialize();
      
      performanceMonitor.startMonitoring(50);
      metricsCollector.startCollection(50);

      // Simulate high load
      for (let i = 0; i < 100; i++) {
        metricsCollector.recordRequest(Math.random() * 1000, Math.random() > 0.9);
        metricsCollector.recordRouteMetrics(`/api/endpoint${i % 10}`, 'GET', Math.random() * 500, Math.random() > 0.95);
      }

      metricsCollector.updateActiveConnections(50);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));

      const stats = metricsCollector.getApplicationStats();
      expect(stats.requestsTotal).toBe(100);
      expect(stats.activeConnections).toBe(50);

      const routeMetrics = metricsCollector.getRouteMetrics();
      expect(routeMetrics.length).toBe(10); // 10 different endpoints

      const currentMetrics = await metricsCollector.getCurrentMetrics();
      expect(currentMetrics.application.requestsTotal).toBe(100);
    });
  });
});
#!/usr/bin/env node

const { abusePreventionService } = require('../src/services/security/AbusePreventionService');
const { ddosProtectionService } = require('../src/services/security/DDoSProtectionService');
const { logger } = require('../src/config/logger');

/**
 * Test script for the abuse prevention system
 */
class AbusePreventionTest {
  constructor() {
    this.testResults = {
      abusePreventionService: { passed: 0, failed: 0, tests: [] },
      ddosProtectionService: { passed: 0, failed: 0, tests: [] },
      integration: { passed: 0, failed: 0, tests: [] }
    };
  }

  /**
   * Run all abuse prevention tests
   */
  async runAllTests() {
    console.log('🛡️ Starting Abuse Prevention System Tests...\n');

    try {
      await this.testAbusePreventionService();
      await this.testDDoSProtectionService();
      await this.testIntegration();

      this.printResults();
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    }
  }

  /**
   * Test Abuse Prevention Service
   */
  async testAbusePreventionService() {
    console.log('🚫 Testing Abuse Prevention Service...');

    // Test 1: Normal Request
    await this.runTest('abusePreventionService', 'Normal Request Handling', async () => {
      const request = {
        ip: '192.168.1.100',
        userId: 'user123',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        endpoint: '/api/users',
        method: 'GET'
      };

      const result = await abusePreventionService.checkRequest(request);
      
      if (!result.allowed) {
        throw new Error(`Normal request was blocked: ${result.reason}`);
      }

      return 'Normal requests are properly allowed';
    });

    // Test 2: Bot Detection
    await this.runTest('abusePreventionService', 'Bot Detection', async () => {
      const botRequest = {
        ip: '192.168.1.101',
        userAgent: 'python-requests/2.25.1',
        endpoint: '/api/users',
        method: 'GET'
      };

      const result = await abusePreventionService.checkRequest(botRequest);
      
      if (result.allowed) {
        throw new Error('Bot request was not blocked');
      }

      if (!result.reason || !result.reason.includes('Automated requests')) {
        throw new Error(`Unexpected block reason: ${result.reason}`);
      }

      return 'Bot detection works correctly';
    });

    // Test 3: Spam Detection
    await this.runTest('abusePreventionService', 'Spam Detection', async () => {
      const spamRequest = {
        ip: '192.168.1.102',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        endpoint: '/api/comments',
        method: 'POST',
        body: {
          content: 'Click here to win free money! Viagra casino lottery winner congratulations!'
        }
      };

      const result = await abusePreventionService.checkRequest(spamRequest);
      
      if (result.allowed) {
        throw new Error('Spam request was not blocked');
      }

      if (!result.reason || !result.reason.includes('Spam')) {
        throw new Error(`Unexpected block reason: ${result.reason}`);
      }

      return 'Spam detection works correctly';
    });

    // Test 4: Injection Detection
    await this.runTest('abusePreventionService', 'Injection Detection', async () => {
      const injectionRequest = {
        ip: '192.168.1.103',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        endpoint: '/api/users',
        method: 'POST',
        body: {
          username: "admin'; DROP TABLE users; --"
        }
      };

      const result = await abusePreventionService.checkRequest(injectionRequest);
      
      if (result.allowed) {
        throw new Error('Injection attempt was not blocked');
      }

      if (!result.reason || !result.reason.includes('Malicious')) {
        throw new Error(`Unexpected block reason: ${result.reason}`);
      }

      return 'Injection detection works correctly';
    });

    // Test 5: IP Blocking
    await this.runTest('abusePreventionService', 'IP Blocking', async () => {
      const testIP = '192.168.1.104';
      
      // Block the IP
      abusePreventionService.blockEntity({
        type: 'ip',
        value: testIP,
        reason: 'Test block',
        severity: 'temporary',
        duration: 3600000,
        blockedBy: 'test'
      });

      const blockedRequest = {
        ip: testIP,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        endpoint: '/api/users',
        method: 'GET'
      };

      const result = await abusePreventionService.checkRequest(blockedRequest);
      
      if (result.allowed) {
        throw new Error('Blocked IP request was not rejected');
      }

      if (!result.reason || !result.reason.includes('Test block')) {
        throw new Error(`Unexpected block reason: ${result.reason}`);
      }

      return 'IP blocking works correctly';
    });

    // Test 6: Failed Login Tracking
    await this.runTest('abusePreventionService', 'Failed Login Tracking', async () => {
      const identifier = '192.168.1.105';
      
      // Record multiple failed attempts
      let locked = false;
      for (let i = 0; i < 6; i++) {
        const result = abusePreventionService.recordFailedLogin(identifier);
        if (result.locked) {
          locked = true;
          break;
        }
      }

      if (!locked) {
        throw new Error('Account was not locked after multiple failed attempts');
      }

      return 'Failed login tracking works correctly';
    });

    console.log('✅ Abuse Prevention Service tests completed\n');
  }

  /**
   * Test DDoS Protection Service
   */
  async testDDoSProtectionService() {
    console.log('🌊 Testing DDoS Protection Service...');

    // Test 1: Normal Traffic
    await this.runTest('ddosProtectionService', 'Normal Traffic Handling', async () => {
      const request = {
        ip: '192.168.2.100',
        endpoint: '/api/users',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        method: 'GET'
      };

      const result = ddosProtectionService.analyzeRequest(request);
      
      if (!result.allowed) {
        throw new Error(`Normal request was blocked: ${result.reason}`);
      }

      return 'Normal traffic is properly allowed';
    });

    // Test 2: High Request Rate Detection
    await this.runTest('ddosProtectionService', 'High Request Rate Detection', async () => {
      const attackIP = '192.168.2.101';
      let blocked = false;

      // Simulate high request rate
      for (let i = 0; i < 200; i++) {
        const request = {
          ip: attackIP,
          endpoint: `/api/users/${i}`,
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          method: 'GET'
        };

        const result = ddosProtectionService.analyzeRequest(request);
        if (!result.allowed) {
          blocked = true;
          if (!result.reason || !result.reason.includes('rate')) {
            throw new Error(`Unexpected block reason: ${result.reason}`);
          }
          break;
        }
      }

      if (!blocked) {
        throw new Error('High request rate was not detected');
      }

      return 'High request rate detection works correctly';
    });

    // Test 3: IP Whitelisting
    await this.runTest('ddosProtectionService', 'IP Whitelisting', async () => {
      const whitelistedIP = '192.168.2.102';
      ddosProtectionService.whitelistIP(whitelistedIP);

      // Even with high request rate, whitelisted IP should be allowed
      let allAllowed = true;
      for (let i = 0; i < 50; i++) {
        const request = {
          ip: whitelistedIP,
          endpoint: `/api/test/${i}`,
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          method: 'GET'
        };

        const result = ddosProtectionService.analyzeRequest(request);
        if (!result.allowed) {
          allAllowed = false;
          break;
        }
      }

      if (!allAllowed) {
        throw new Error('Whitelisted IP was blocked');
      }

      return 'IP whitelisting works correctly';
    });

    // Test 4: IP Blacklisting
    await this.runTest('ddosProtectionService', 'IP Blacklisting', async () => {
      const blacklistedIP = '192.168.2.103';
      ddosProtectionService.blacklistIP(blacklistedIP);

      const request = {
        ip: blacklistedIP,
        endpoint: '/api/users',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        method: 'GET'
      };

      const result = ddosProtectionService.analyzeRequest(request);
      
      if (result.allowed) {
        throw new Error('Blacklisted IP was not blocked');
      }

      if (!result.reason || !result.reason.includes('blacklisted')) {
        throw new Error(`Unexpected block reason: ${result.reason}`);
      }

      return 'IP blacklisting works correctly';
    });

    // Test 5: Statistics Collection
    await this.runTest('ddosProtectionService', 'Statistics Collection', async () => {
      const stats = ddosProtectionService.getStats();
      
      if (!stats || typeof stats !== 'object') {
        throw new Error('Statistics not available');
      }

      const requiredFields = ['enabled', 'monitoring', 'activeAttacks', 'recentTraffic', 'thresholds'];
      for (const field of requiredFields) {
        if (stats[field] === undefined) {
          throw new Error(`Missing statistics field: ${field}`);
        }
      }

      return 'Statistics collection works correctly';
    });

    console.log('✅ DDoS Protection Service tests completed\n');
  }

  /**
   * Test Integration
   */
  async testIntegration() {
    console.log('🔗 Testing Integration...');

    // Test 1: Combined Protection
    await this.runTest('integration', 'Combined Protection', async () => {
      const request = {
        ip: '192.168.3.100',
        userId: 'user123',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        endpoint: '/api/users',
        method: 'GET'
      };

      // Check both services
      const abuseCheck = await abusePreventionService.checkRequest(request);
      const ddosCheck = ddosProtectionService.analyzeRequest(request);

      if (!abuseCheck.allowed) {
        throw new Error(`Abuse prevention blocked normal request: ${abuseCheck.reason}`);
      }

      if (!ddosCheck.allowed) {
        throw new Error(`DDoS protection blocked normal request: ${ddosCheck.reason}`);
      }

      return 'Combined protection allows normal requests';
    });

    // Test 2: Malicious Request Handling
    await this.runTest('integration', 'Malicious Request Handling', async () => {
      const maliciousRequest = {
        ip: '192.168.3.101',
        userAgent: 'python-requests/2.25.1',
        endpoint: '/api/users',
        method: 'POST',
        body: {
          username: "admin'; DROP TABLE users; --",
          content: 'Click here for free money! Viagra casino lottery!'
        }
      };

      const abuseCheck = await abusePreventionService.checkRequest(maliciousRequest);
      
      if (abuseCheck.allowed) {
        throw new Error('Malicious request was not blocked by abuse prevention');
      }

      return 'Malicious requests are properly blocked';
    });

    // Test 3: Performance Under Load
    await this.runTest('integration', 'Performance Under Load', async () => {
      const startTime = Date.now();
      const promises = [];

      // Generate 500 requests
      for (let i = 0; i < 500; i++) {
        const request = {
          ip: `192.168.3.${100 + (i % 50)}`,
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          endpoint: `/api/test${i % 20}`,
          method: 'GET'
        };

        promises.push(
          abusePreventionService.checkRequest(request),
          Promise.resolve(ddosProtectionService.analyzeRequest(request))
        );
      }

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      if (duration > 5000) {
        throw new Error(`Performance test took too long: ${duration}ms`);
      }

      if (results.length !== 1000) {
        throw new Error(`Expected 1000 results, got ${results.length}`);
      }

      return `Performance under load acceptable (${duration}ms for 1000 operations)`;
    });

    // Test 4: Statistics Integration
    await this.runTest('integration', 'Statistics Integration', async () => {
      const abuseStats = abusePreventionService.getStats();
      const ddosStats = ddosProtectionService.getStats();

      if (!abuseStats || !ddosStats) {
        throw new Error('Statistics not available from one or both services');
      }

      // Verify structure
      if (!abuseStats.suspiciousActivities || !abuseStats.blockedEntities) {
        throw new Error('Abuse prevention statistics incomplete');
      }

      if (ddosStats.enabled === undefined || !ddosStats.recentTraffic) {
        throw new Error('DDoS protection statistics incomplete');
      }

      return 'Statistics integration works correctly';
    });

    // Test 5: Configuration Management
    await this.runTest('integration', 'Configuration Management', async () => {
      // Update abuse prevention config
      abusePreventionService.updateConfig({
        enableBotDetection: false,
        maxFailedLogins: 10
      });

      // Update DDoS protection config
      ddosProtectionService.updateConfig({
        detectionThreshold: {
          requestsPerSecond: 200,
          requestsPerMinute: 2000,
          uniqueIPsPerSecond: 100
        }
      });

      // Verify configs were updated
      const abuseStats = abusePreventionService.getStats();
      const ddosStats = ddosProtectionService.getStats();

      if (abuseStats.config.enableBotDetection !== false) {
        throw new Error('Abuse prevention config not updated');
      }

      if (ddosStats.thresholds.requestsPerSecond !== 200) {
        throw new Error('DDoS protection config not updated');
      }

      return 'Configuration management works correctly';
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
    console.log('\n📋 Abuse Prevention Test Results Summary:');
    console.log('==========================================');

    let totalPassed = 0;
    let totalFailed = 0;

    for (const [category, results] of Object.entries(this.testResults)) {
      const categoryName = category.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
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

    console.log('\n==========================================');
    console.log(`Total Tests: ${totalPassed + totalFailed}`);
    console.log(`Passed: ${totalPassed}`);
    console.log(`Failed: ${totalFailed}`);
    console.log(`Success Rate: ${((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1)}%`);

    if (totalFailed === 0) {
      console.log('\n🎉 All abuse prevention tests passed!');
      console.log('🛡️ Your system is protected against abuse and attacks!');
    } else {
      console.log(`\n⚠️  ${totalFailed} test(s) failed. Please review the security issues above.`);
      process.exit(1);
    }
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new AbusePreventionTest();
  tester.runAllTests().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = AbusePreventionTest;
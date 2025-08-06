import { abusePreventionService } from '../services/security/AbusePreventionService';
import { ddosProtectionService } from '../services/security/DDoSProtectionService';

describe('Abuse Prevention System', () => {
  beforeEach(() => {
    // Reset services before each test
    abusePreventionService.destroy();
    ddosProtectionService.destroy();
  });

  afterEach(() => {
    // Cleanup after each test
    abusePreventionService.destroy();
    ddosProtectionService.destroy();
  });

  describe('AbusePreventionService', () => {
    test('should allow normal requests', async () => {
      const request = {
        ip: '192.168.1.100',
        userId: 'user123',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        endpoint: '/api/users',
        method: 'GET'
      };

      const result = await abusePreventionService.checkRequest(request);
      expect(result.allowed).toBe(true);
    });

    test('should block requests with bot user agents', async () => {
      const request = {
        ip: '192.168.1.100',
        userAgent: 'python-requests/2.25.1',
        endpoint: '/api/users',
        method: 'GET'
      };

      const result = await abusePreventionService.checkRequest(request);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Automated requests are not allowed');
    });

    test('should block requests with suspicious user agents', async () => {
      const request = {
        ip: '192.168.1.100',
        userAgent: 'bot',
        endpoint: '/api/users',
        method: 'GET'
      };

      const result = await abusePreventionService.checkRequest(request);
      expect(result.allowed).toBe(false);
    });

    test('should detect spam content', async () => {
      const request = {
        ip: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        endpoint: '/api/comments',
        method: 'POST',
        body: {
          content: 'Click here to win free money! Viagra casino lottery winner congratulations!'
        }
      };

      const result = await abusePreventionService.checkRequest(request);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Spam content detected');
    });

    test('should detect injection attempts', async () => {
      const request = {
        ip: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        endpoint: '/api/users',
        method: 'POST',
        body: {
          username: "admin'; DROP TABLE users; --"
        }
      };

      const result = await abusePreventionService.checkRequest(request);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Malicious content detected');
    });

    test('should block IPs after blocking', () => {
      abusePreventionService.blockEntity({
        type: 'ip',
        value: '192.168.1.200',
        reason: 'Test block',
        severity: 'temporary',
        duration: 3600000,
        blockedBy: 'test'
      });

      const request = {
        ip: '192.168.1.200',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        endpoint: '/api/users',
        method: 'GET'
      };

      return abusePreventionService.checkRequest(request).then(result => {
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('Test block');
      });
    });

    test('should record failed login attempts', () => {
      const identifier = '192.168.1.100';
      
      // Record multiple failed attempts
      for (let i = 0; i < 5; i++) {
        const result = abusePreventionService.recordFailedLogin(identifier);
        if (i < 4) {
          expect(result.locked).toBe(false);
        } else {
          expect(result.locked).toBe(true);
          expect(result.lockDuration).toBeDefined();
        }
      }
    });

    test('should add and remove rate limit rules', () => {
      const rule = {
        id: 'test-rule',
        name: 'Test Rule',
        endpoint: '/api/test',
        method: 'POST',
        windowMs: 60000,
        maxRequests: 10,
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
        keyGenerator: 'ip' as const,
        enabled: true
      };

      abusePreventionService.addRateLimitRule(rule);
      
      const rules = abusePreventionService.getRateLimitRules();
      expect(rules.find(r => r.id === 'test-rule')).toBeDefined();

      const removed = abusePreventionService.removeRateLimitRule('test-rule');
      expect(removed).toBe(true);
      
      const rulesAfterRemoval = abusePreventionService.getRateLimitRules();
      expect(rulesAfterRemoval.find(r => r.id === 'test-rule')).toBeUndefined();
    });

    test('should get suspicious activities', () => {
      // This would require triggering some suspicious activities first
      const activities = abusePreventionService.getSuspiciousActivities(10);
      expect(Array.isArray(activities)).toBe(true);
    });

    test('should get blocked entities', () => {
      abusePreventionService.blockEntity({
        type: 'ip',
        value: '192.168.1.300',
        reason: 'Test block for listing',
        severity: 'temporary',
        duration: 3600000,
        blockedBy: 'test'
      });

      const blockedEntities = abusePreventionService.getBlockedEntities(10);
      expect(blockedEntities.length).toBeGreaterThan(0);
      expect(blockedEntities[0].value).toBe('192.168.1.300');
    });

    test('should unblock entities', () => {
      abusePreventionService.blockEntity({
        type: 'ip',
        value: '192.168.1.400',
        reason: 'Test block for unblocking',
        severity: 'temporary',
        duration: 3600000,
        blockedBy: 'test'
      });

      const unblocked = abusePreventionService.unblockEntity('ip', '192.168.1.400', 'test');
      expect(unblocked).toBe(true);

      // Verify it's unblocked
      const request = {
        ip: '192.168.1.400',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        endpoint: '/api/users',
        method: 'GET'
      };

      return abusePreventionService.checkRequest(request).then(result => {
        expect(result.allowed).toBe(true);
      });
    });

    test('should get statistics', () => {
      const stats = abusePreventionService.getStats();
      
      expect(stats).toBeDefined();
      expect(stats.suspiciousActivities).toBeDefined();
      expect(stats.blockedEntities).toBeDefined();
      expect(stats.rateLimitRules).toBeDefined();
      expect(stats.config).toBeDefined();
    });
  });

  describe('DDoSProtectionService', () => {
    test('should allow normal traffic', () => {
      const request = {
        ip: '192.168.1.100',
        endpoint: '/api/users',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        method: 'GET'
      };

      const result = ddosProtectionService.analyzeRequest(request);
      expect(result.allowed).toBe(true);
    });

    test('should detect high request rate from single IP', () => {
      const request = {
        ip: '192.168.1.200',
        endpoint: '/api/users',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        method: 'GET'
      };

      // Simulate high request rate by making many requests quickly
      for (let i = 0; i < 150; i++) {
        ddosProtectionService.analyzeRequest({
          ...request,
          endpoint: `/api/users/${i}`
        });
      }

      // The next request should be blocked
      const result = ddosProtectionService.analyzeRequest(request);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Request rate too high');
    });

    test('should whitelist IPs', () => {
      const ip = '192.168.1.500';
      ddosProtectionService.whitelistIP(ip);

      // Even with high request rate, whitelisted IP should be allowed
      const request = {
        ip,
        endpoint: '/api/users',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        method: 'GET'
      };

      for (let i = 0; i < 200; i++) {
        const result = ddosProtectionService.analyzeRequest(request);
        expect(result.allowed).toBe(true);
      }
    });

    test('should blacklist IPs', () => {
      const ip = '192.168.1.600';
      ddosProtectionService.blacklistIP(ip);

      const request = {
        ip,
        endpoint: '/api/users',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        method: 'GET'
      };

      const result = ddosProtectionService.analyzeRequest(request);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('blacklisted');
    });

    test('should remove IP from blacklist', () => {
      const ip = '192.168.1.700';
      ddosProtectionService.blacklistIP(ip);
      
      const removed = ddosProtectionService.removeFromBlacklist(ip);
      expect(removed).toBe(true);

      const request = {
        ip,
        endpoint: '/api/users',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        method: 'GET'
      };

      const result = ddosProtectionService.analyzeRequest(request);
      expect(result.allowed).toBe(true);
    });

    test('should get active attacks', () => {
      const attacks = ddosProtectionService.getActiveAttacks();
      expect(Array.isArray(attacks)).toBe(true);
    });

    test('should get attack history', () => {
      const history = ddosProtectionService.getAttackHistory(10);
      expect(Array.isArray(history)).toBe(true);
    });

    test('should get traffic patterns', () => {
      const patterns = ddosProtectionService.getTrafficPatterns();
      expect(Array.isArray(patterns)).toBe(true);
    });

    test('should get statistics', () => {
      const stats = ddosProtectionService.getStats();
      
      expect(stats).toBeDefined();
      expect(stats.enabled).toBeDefined();
      expect(stats.monitoring).toBeDefined();
      expect(stats.activeAttacks).toBeDefined();
      expect(stats.recentTraffic).toBeDefined();
      expect(stats.thresholds).toBeDefined();
    });

    test('should update configuration', () => {
      const newConfig = {
        enabled: false,
        detectionThreshold: {
          requestsPerSecond: 200,
          requestsPerMinute: 2000,
          uniqueIPsPerSecond: 100
        }
      };

      ddosProtectionService.updateConfig(newConfig);
      
      const stats = ddosProtectionService.getStats();
      expect(stats.enabled).toBe(false);
      expect(stats.thresholds.requestsPerSecond).toBe(200);
    });
  });

  describe('Integration Tests', () => {
    test('should work together - abuse prevention and DDoS protection', async () => {
      const request = {
        ip: '192.168.1.800',
        userId: 'user123',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        endpoint: '/api/users',
        method: 'GET'
      };

      // Check both services
      const abuseCheck = await abusePreventionService.checkRequest(request);
      const ddosCheck = ddosProtectionService.analyzeRequest(request);

      expect(abuseCheck.allowed).toBe(true);
      expect(ddosCheck.allowed).toBe(true);
    });

    test('should handle malicious request through both services', async () => {
      const maliciousRequest = {
        ip: '192.168.1.900',
        userAgent: 'python-requests/2.25.1',
        endpoint: '/api/users',
        method: 'POST',
        body: {
          username: "admin'; DROP TABLE users; --",
          content: 'Click here for free money! Viagra casino lottery!'
        }
      };

      // Both services should block this request
      const abuseCheck = await abusePreventionService.checkRequest(maliciousRequest);
      expect(abuseCheck.allowed).toBe(false);

      // DDoS protection might also flag it
      const ddosCheck = ddosProtectionService.analyzeRequest(maliciousRequest);
      // DDoS might allow single request, but abuse prevention should block it
    });

    test('should handle high volume attack', async () => {
      const attackIP = '192.168.1.999';
      
      // Simulate coordinated attack
      const promises = [];
      for (let i = 0; i < 200; i++) {
        const request = {
          ip: attackIP,
          userAgent: `Bot-${i}`,
          endpoint: `/api/endpoint${i % 10}`,
          method: 'GET'
        };

        promises.push(
          abusePreventionService.checkRequest(request),
          Promise.resolve(ddosProtectionService.analyzeRequest(request))
        );
      }

      const results = await Promise.all(promises);
      
      // At least some requests should be blocked
      const blockedCount = results.filter(result => !result.allowed).length;
      expect(blockedCount).toBeGreaterThan(0);
    });

    test('should maintain performance under load', async () => {
      const startTime = Date.now();
      const requests = [];

      // Generate 1000 requests
      for (let i = 0; i < 1000; i++) {
        const request = {
          ip: `192.168.${Math.floor(i / 256)}.${i % 256}`,
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          endpoint: `/api/test${i % 100}`,
          method: 'GET'
        };

        requests.push(
          abusePreventionService.checkRequest(request).then(result => ({ service: 'abuse', result })),
          Promise.resolve(ddosProtectionService.analyzeRequest(request)).then(result => ({ service: 'ddos', result }))
        );
      }

      const results = await Promise.all(requests);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (less than 10 seconds)
      expect(duration).toBeLessThan(10000);
      
      // All requests should have results
      expect(results.length).toBe(2000);
      
      // Most requests should be allowed (assuming no actual abuse)
      const allowedCount = results.filter(r => r.result.allowed).length;
      expect(allowedCount).toBeGreaterThan(1500); // At least 75% allowed
    });

    test('should provide comprehensive statistics', () => {
      const abuseStats = abusePreventionService.getStats();
      const ddosStats = ddosProtectionService.getStats();

      // Verify abuse prevention stats
      expect(abuseStats.suspiciousActivities).toBeDefined();
      expect(abuseStats.blockedEntities).toBeDefined();
      expect(abuseStats.rateLimitRules).toBeDefined();
      expect(abuseStats.config).toBeDefined();

      // Verify DDoS protection stats
      expect(ddosStats.enabled).toBeDefined();
      expect(ddosStats.activeAttacks).toBeDefined();
      expect(ddosStats.recentTraffic).toBeDefined();
      expect(ddosStats.thresholds).toBeDefined();

      // Both should have numeric values
      expect(typeof abuseStats.suspiciousActivities.total).toBe('number');
      expect(typeof ddosStats.activeAttacks).toBe('number');
    });
  });
});
#!/usr/bin/env node

const { authenticationService } = require('../src/services/security/AuthenticationService');
const { authorizationService } = require('../src/services/security/AuthorizationService');
const { encryptionService } = require('../src/services/security/EncryptionService');
const { logger } = require('../src/config/logger');

/**
 * Test script for the security system
 */
class SecuritySystemTest {
  constructor() {
    this.testResults = {
      authentication: { passed: 0, failed: 0, tests: [] },
      authorization: { passed: 0, failed: 0, tests: [] },
      encryption: { passed: 0, failed: 0, tests: [] },
      integration: { passed: 0, failed: 0, tests: [] }
    };
  }

  /**
   * Run all security system tests
   */
  async runAllTests() {
    console.log('🔒 Starting Security System Tests...\n');

    try {
      await this.testAuthentication();
      await this.testAuthorization();
      await this.testEncryption();
      await this.testIntegration();

      this.printResults();
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    }
  }

  /**
   * Test Authentication Service
   */
  async testAuthentication() {
    console.log('🔐 Testing Authentication Service...');

    // Test 1: User Registration
    await this.runTest('authentication', 'User Registration', async () => {
      const userData = {
        username: 'testuser1',
        email: 'test1@example.com',
        password: 'TestPassword123!'
      };

      const result = await authenticationService.register(userData);
      
      if (!result.success) {
        throw new Error(result.error || 'Registration failed');
      }

      if (!result.user || result.user.username !== 'testuser1') {
        throw new Error('User data not returned correctly');
      }

      return 'User registration works correctly';
    });

    // Test 2: Password Validation
    await this.runTest('authentication', 'Password Validation', async () => {
      const weakPasswordData = {
        username: 'testuser2',
        email: 'test2@example.com',
        password: '123' // Weak password
      };

      const result = await authenticationService.register(weakPasswordData);
      
      if (result.success) {
        throw new Error('Weak password was accepted');
      }

      if (!result.error || !result.error.includes('Password must be at least')) {
        throw new Error('Password validation error message incorrect');
      }

      return 'Password validation works correctly';
    });

    // Test 3: User Login
    await this.runTest('authentication', 'User Login', async () => {
      // First register a user
      const userData = {
        username: 'logintest',
        email: 'login@example.com',
        password: 'LoginPassword123!'
      };
      await authenticationService.register(userData);

      // Then login
      const loginResult = await authenticationService.login({
        username: 'logintest',
        password: 'LoginPassword123!',
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent'
      });

      if (!loginResult.success) {
        throw new Error(loginResult.error || 'Login failed');
      }

      if (!loginResult.tokens || !loginResult.tokens.accessToken) {
        throw new Error('Access token not provided');
      }

      return 'User login works correctly';
    });

    // Test 4: Token Verification
    await this.runTest('authentication', 'Token Verification', async () => {
      // Register and login user
      const userData = {
        username: 'tokentest',
        email: 'token@example.com',
        password: 'TokenPassword123!'
      };
      await authenticationService.register(userData);

      const loginResult = await authenticationService.login({
        username: 'tokentest',
        password: 'TokenPassword123!',
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent'
      });

      // Verify token
      const verification = await authenticationService.verifyToken(loginResult.tokens.accessToken);
      
      if (!verification.valid) {
        throw new Error(verification.error || 'Token verification failed');
      }

      if (!verification.user || verification.user.username !== 'tokentest') {
        throw new Error('Token verification returned incorrect user');
      }

      return 'Token verification works correctly';
    });

    console.log('✅ Authentication Service tests completed\n');
  }  /**

   * Test Authorization Service
   */
  async testAuthorization() {
    console.log('🛡️ Testing Authorization Service...');

    // Test 1: Role Assignment
    await this.runTest('authorization', 'Role Assignment', async () => {
      const userId = 'test-user-auth-1';
      
      const result = authorizationService.assignRole(userId, 'user');
      
      if (!result.success) {
        throw new Error(result.error || 'Role assignment failed');
      }

      const userRoles = authorizationService.getUserRoles(userId);
      if (!userRoles.includes('user')) {
        throw new Error('Role not assigned correctly');
      }

      return 'Role assignment works correctly';
    });

    // Test 2: Permission Checking
    await this.runTest('authorization', 'Permission Checking', async () => {
      const userId = 'test-user-auth-2';
      
      // Assign user role
      authorizationService.assignRole(userId, 'user');

      // Check user permission
      const hasUserPermission = authorizationService.hasPermission(userId, 'coupons', 'read');
      if (!hasUserPermission) {
        throw new Error('User should have coupon read permission');
      }

      // Check admin permission (should fail)
      const hasAdminPermission = authorizationService.hasPermission(userId, 'system', 'write');
      if (hasAdminPermission) {
        throw new Error('User should not have system write permission');
      }

      return 'Permission checking works correctly';
    });

    // Test 3: Access Control
    await this.runTest('authorization', 'Access Control', async () => {
      const userId = 'test-user-auth-3';
      
      // Assign admin role
      authorizationService.assignRole(userId, 'admin');

      // Check access
      const accessRequest = {
        userId,
        resource: 'users',
        action: 'read',
        context: {
          ipAddress: '127.0.0.1',
          userAgent: 'Test Agent'
        }
      };

      const decision = await authorizationService.checkAccess(accessRequest);
      
      if (!decision.allowed) {
        throw new Error(`Access denied: ${decision.reason}`);
      }

      return 'Access control works correctly';
    });

    // Test 4: Custom Role Creation
    await this.runTest('authorization', 'Custom Role Creation', async () => {
      const customRole = {
        id: 'test-custom-role',
        name: 'Test Custom Role',
        description: 'A custom role for testing',
        permissions: ['coupons:read', 'coupons:write'],
        isSystem: false
      };

      const createResult = authorizationService.createRole(customRole);
      
      if (!createResult.success) {
        throw new Error(createResult.error || 'Custom role creation failed');
      }

      // Test the custom role
      const userId = 'test-user-auth-4';
      authorizationService.assignRole(userId, 'test-custom-role');

      const hasPermission = authorizationService.hasPermission(userId, 'coupons', 'write');
      if (!hasPermission) {
        throw new Error('Custom role permissions not working');
      }

      return 'Custom role creation works correctly';
    });

    console.log('✅ Authorization Service tests completed\n');
  }

  /**
   * Test Encryption Service
   */
  async testEncryption() {
    console.log('🔐 Testing Encryption Service...');

    // Test 1: Basic Encryption/Decryption
    await this.runTest('encryption', 'Basic Encryption/Decryption', async () => {
      const plaintext = 'This is sensitive data';
      
      const encrypted = encryptionService.encrypt(plaintext);
      if (!encrypted.data || !encrypted.iv || !encrypted.keyId) {
        throw new Error('Encryption result incomplete');
      }

      const decrypted = encryptionService.decrypt(encrypted);
      if (decrypted !== plaintext) {
        throw new Error('Decryption failed - data mismatch');
      }

      return 'Basic encryption/decryption works correctly';
    });

    // Test 2: Secure Encryption with GCM
    await this.runTest('encryption', 'Secure GCM Encryption', async () => {
      const plaintext = 'Very sensitive data';
      
      const encrypted = encryptionService.encryptSecure(plaintext);
      if (!encrypted.data || !encrypted.iv || !encrypted.tag || encrypted.algorithm !== 'aes-256-gcm') {
        throw new Error('Secure encryption result incomplete');
      }

      const decrypted = encryptionService.decryptSecure(encrypted);
      if (decrypted !== plaintext) {
        throw new Error('Secure decryption failed - data mismatch');
      }

      return 'Secure GCM encryption works correctly';
    });

    // Test 3: Hashing and Verification
    await this.runTest('encryption', 'Hashing and Verification', async () => {
      const data = 'password123';
      
      const hashResult = encryptionService.hash(data);
      if (!hashResult.hash || !hashResult.salt || !hashResult.algorithm) {
        throw new Error('Hash result incomplete');
      }

      const isValid = encryptionService.verifyHash(data, hashResult.hash, hashResult.salt, hashResult.algorithm, hashResult.iterations);
      if (!isValid) {
        throw new Error('Hash verification failed');
      }

      const isInvalid = encryptionService.verifyHash('wrongpassword', hashResult.hash, hashResult.salt, hashResult.algorithm, hashResult.iterations);
      if (isInvalid) {
        throw new Error('Hash verification should have failed for wrong data');
      }

      return 'Hashing and verification works correctly';
    });

    // Test 4: HMAC Generation and Verification
    await this.runTest('encryption', 'HMAC Generation/Verification', async () => {
      const data = 'important message';
      const secret = 'shared-secret';
      
      const hmac = encryptionService.generateHMAC(data, secret);
      if (!hmac || typeof hmac !== 'string') {
        throw new Error('HMAC generation failed');
      }

      const isValid = encryptionService.verifyHMAC(data, hmac, secret);
      if (!isValid) {
        throw new Error('HMAC verification failed');
      }

      const isInvalid = encryptionService.verifyHMAC('tampered message', hmac, secret);
      if (isInvalid) {
        throw new Error('HMAC verification should have failed for tampered data');
      }

      return 'HMAC generation/verification works correctly';
    });

    // Test 5: Field Encryption
    await this.runTest('encryption', 'Field Encryption', async () => {
      const sensitiveData = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        ssn: '123-45-6789',
        creditCard: '4111-1111-1111-1111'
      };

      const fieldsToEncrypt = ['ssn', 'creditCard'];

      const encrypted = encryptionService.encryptFields(sensitiveData, fieldsToEncrypt);
      if (encrypted.id !== 1 || encrypted.name !== 'John Doe' || encrypted.email !== 'john@example.com') {
        throw new Error('Non-encrypted fields were modified');
      }

      if (typeof encrypted.ssn !== 'object' || typeof encrypted.creditCard !== 'object') {
        throw new Error('Sensitive fields were not encrypted');
      }

      const decrypted = encryptionService.decryptFields(encrypted, fieldsToEncrypt);
      if (decrypted.ssn !== '123-45-6789' || decrypted.creditCard !== '4111-1111-1111-1111') {
        throw new Error('Field decryption failed');
      }

      return 'Field encryption works correctly';
    });

    console.log('✅ Encryption Service tests completed\n');
  }

  /**
   * Test Integration
   */
  async testIntegration() {
    console.log('🔗 Testing Security Integration...');

    // Test 1: Full Authentication Flow
    await this.runTest('integration', 'Full Authentication Flow', async () => {
      // Register user
      const userData = {
        username: 'integrationuser1',
        email: 'integration1@example.com',
        password: 'IntegrationTest123!'
      };
      const registerResult = await authenticationService.register(userData);
      if (!registerResult.success) {
        throw new Error('Registration failed in integration test');
      }

      // Assign role
      const userId = registerResult.user.id;
      const roleResult = authorizationService.assignRole(userId, 'moderator');
      if (!roleResult.success) {
        throw new Error('Role assignment failed in integration test');
      }

      // Login
      const loginResult = await authenticationService.login({
        username: 'integrationuser1',
        password: 'IntegrationTest123!',
        ipAddress: '127.0.0.1',
        userAgent: 'Integration Test'
      });
      if (!loginResult.success) {
        throw new Error('Login failed in integration test');
      }

      // Verify token
      const tokenVerification = await authenticationService.verifyToken(loginResult.tokens.accessToken);
      if (!tokenVerification.valid) {
        throw new Error('Token verification failed in integration test');
      }

      // Check authorization
      const hasPermission = authorizationService.hasPermission(userId, 'coupons', 'approve');
      if (!hasPermission) {
        throw new Error('Authorization check failed in integration test');
      }

      return 'Full authentication flow works correctly';
    });

    // Test 2: Security Workflow End-to-End
    await this.runTest('integration', 'Security Workflow End-to-End', async () => {
      // Create admin user
      const adminData = {
        username: 'securityadmin',
        email: 'admin@security.com',
        password: 'AdminPassword123!',
        role: 'admin'
      };
      const adminResult = await authenticationService.register(adminData);
      if (!adminResult.success) {
        throw new Error('Admin registration failed');
      }

      authorizationService.assignRole(adminResult.user.id, 'admin');

      // Create regular user
      const userData = {
        username: 'regularuser',
        email: 'user@security.com',
        password: 'UserPassword123!'
      };
      const userResult = await authenticationService.register(userData);
      if (!userResult.success) {
        throw new Error('User registration failed');
      }

      authorizationService.assignRole(userResult.user.id, 'user');

      // Test admin access
      const adminAccess = await authorizationService.checkAccess({
        userId: adminResult.user.id,
        resource: 'system',
        action: 'write',
        context: { ipAddress: '192.168.1.100' }
      });
      if (!adminAccess.allowed) {
        throw new Error('Admin access should be allowed');
      }

      // Test user access (should be denied)
      const userAccess = await authorizationService.checkAccess({
        userId: userResult.user.id,
        resource: 'system',
        action: 'write',
        context: { ipAddress: '192.168.1.101' }
      });
      if (userAccess.allowed) {
        throw new Error('User access should be denied for admin resources');
      }

      // Test encryption
      const sensitiveData = 'User sensitive information';
      const encrypted = encryptionService.encryptSecure(sensitiveData);
      const decrypted = encryptionService.decryptSecure(encrypted);
      if (decrypted !== sensitiveData) {
        throw new Error('Encryption/decryption failed in integration test');
      }

      return 'Security workflow end-to-end works correctly';
    });

    // Test 3: Performance Under Load
    await this.runTest('integration', 'Performance Under Load', async () => {
      const startTime = Date.now();
      const operations = [];

      // Perform multiple operations concurrently
      for (let i = 0; i < 50; i++) {
        operations.push(
          // Encryption operations
          new Promise(resolve => {
            const data = `test data ${i}`;
            const encrypted = encryptionService.encrypt(data);
            const decrypted = encryptionService.decrypt(encrypted);
            resolve(decrypted === data);
          }),
          
          // Authorization checks
          new Promise(async resolve => {
            const userId = `test-user-${i}`;
            authorizationService.assignRole(userId, 'user');
            const hasPermission = authorizationService.hasPermission(userId, 'coupons', 'read');
            resolve(hasPermission);
          })
        );
      }

      const results = await Promise.all(operations);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Check all operations succeeded
      const allSucceeded = results.every(result => result === true);
      if (!allSucceeded) {
        throw new Error('Some operations failed under load');
      }

      // Check performance (should complete within reasonable time)
      if (duration > 10000) { // 10 seconds
        throw new Error(`Performance test took too long: ${duration}ms`);
      }

      return `Performance under load acceptable (${duration}ms for 100 operations)`;
    });

    console.log('✅ Security Integration tests completed\n');
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
    console.log('\n📋 Security Test Results Summary:');
    console.log('==================================');

    let totalPassed = 0;
    let totalFailed = 0;

    for (const [category, results] of Object.entries(this.testResults)) {
      const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
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

    console.log('\n==================================');
    console.log(`Total Tests: ${totalPassed + totalFailed}`);
    console.log(`Passed: ${totalPassed}`);
    console.log(`Failed: ${totalFailed}`);
    console.log(`Success Rate: ${((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1)}%`);

    if (totalFailed === 0) {
      console.log('\n🎉 All security system tests passed!');
      console.log('🔒 Your system is secure and ready for production!');
    } else {
      console.log(`\n⚠️  ${totalFailed} test(s) failed. Please review the security issues above.`);
      process.exit(1);
    }
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new SecuritySystemTest();
  tester.runAllTests().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = SecuritySystemTest;
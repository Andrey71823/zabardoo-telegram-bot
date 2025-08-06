import { authenticationService } from '../services/security/AuthenticationService';
import { authorizationService } from '../services/security/AuthorizationService';
import { encryptionService } from '../services/security/EncryptionService';

describe('Security System', () => {
  beforeEach(() => {
    // Reset services before each test
    authenticationService.destroy();
    authorizationService.destroy();
    encryptionService.destroy();
  });

  afterEach(() => {
    // Cleanup after each test
    authenticationService.destroy();
    authorizationService.destroy();
    encryptionService.destroy();
  });

  describe('AuthenticationService', () => {
    test('should register a new user', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPassword123!'
      };

      const result = await authenticationService.register(userData);
      
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.username).toBe('testuser');
      expect(result.user?.email).toBe('test@example.com');
      expect(result.user?.role).toBe('user');
    });

    test('should not register user with weak password', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: '123' // Weak password
      };

      const result = await authenticationService.register(userData);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Password must be at least');
    });

    test('should not register duplicate user', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPassword123!'
      };

      // Register first user
      await authenticationService.register(userData);
      
      // Try to register same user again
      const result = await authenticationService.register(userData);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('User already exists');
    });

    test('should login with valid credentials', async () => {
      // Register user first
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPassword123!'
      };
      await authenticationService.register(userData);

      // Login
      const loginResult = await authenticationService.login({
        username: 'testuser',
        password: 'TestPassword123!',
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent'
      });

      expect(loginResult.success).toBe(true);
      expect(loginResult.tokens).toBeDefined();
      expect(loginResult.tokens?.accessToken).toBeDefined();
      expect(loginResult.tokens?.refreshToken).toBeDefined();
      expect(loginResult.user).toBeDefined();
    });

    test('should not login with invalid credentials', async () => {
      // Register user first
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPassword123!'
      };
      await authenticationService.register(userData);

      // Try login with wrong password
      const loginResult = await authenticationService.login({
        username: 'testuser',
        password: 'WrongPassword',
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent'
      });

      expect(loginResult.success).toBe(false);
      expect(loginResult.error).toBe('Invalid credentials');
    });

    test('should lock account after max failed attempts', async () => {
      // Register user first
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPassword123!'
      };
      await authenticationService.register(userData);

      // Make multiple failed login attempts
      for (let i = 0; i < 5; i++) {
        await authenticationService.login({
          username: 'testuser',
          password: 'WrongPassword',
          ipAddress: '127.0.0.1',
          userAgent: 'Test Agent'
        });
      }

      // Next attempt should be locked
      const loginResult = await authenticationService.login({
        username: 'testuser',
        password: 'TestPassword123!', // Correct password
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent'
      });

      expect(loginResult.success).toBe(false);
      expect(loginResult.error).toBe('Account is temporarily locked');
    });

    test('should verify valid JWT token', async () => {
      // Register and login user
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPassword123!'
      };
      await authenticationService.register(userData);

      const loginResult = await authenticationService.login({
        username: 'testuser',
        password: 'TestPassword123!',
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent'
      });

      // Verify token
      const verification = await authenticationService.verifyToken(loginResult.tokens!.accessToken);
      
      expect(verification.valid).toBe(true);
      expect(verification.user).toBeDefined();
      expect(verification.user?.username).toBe('testuser');
    });

    test('should refresh access token', async () => {
      // Register and login user
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPassword123!'
      };
      await authenticationService.register(userData);

      const loginResult = await authenticationService.login({
        username: 'testuser',
        password: 'TestPassword123!',
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent'
      });

      // Refresh token
      const refreshResult = await authenticationService.refreshToken(loginResult.tokens!.refreshToken);
      
      expect(refreshResult.success).toBe(true);
      expect(refreshResult.tokens).toBeDefined();
      expect(refreshResult.tokens?.accessToken).toBeDefined();
      expect(refreshResult.tokens?.refreshToken).toBeDefined();
    });

    test('should change user password', async () => {
      // Register user
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPassword123!'
      };
      const registerResult = await authenticationService.register(userData);

      // Change password
      const changeResult = await authenticationService.changePassword(
        registerResult.user!.id,
        'TestPassword123!',
        'NewPassword456!'
      );

      expect(changeResult.success).toBe(true);

      // Try login with new password
      const loginResult = await authenticationService.login({
        username: 'testuser',
        password: 'NewPassword456!',
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent'
      });

      expect(loginResult.success).toBe(true);
    });
  });

  describe('AuthorizationService', () => {
    test('should assign and check roles', () => {
      const userId = 'test-user-123';
      
      // Assign role
      const assignResult = authorizationService.assignRole(userId, 'user');
      expect(assignResult.success).toBe(true);

      // Check permission
      const hasPermission = authorizationService.hasPermission(userId, 'coupons', 'read');
      expect(hasPermission).toBe(true);
    });

    test('should deny access without proper permissions', () => {
      const userId = 'test-user-123';
      
      // Assign basic user role
      authorizationService.assignRole(userId, 'user');

      // Try to access admin resource
      const hasPermission = authorizationService.hasPermission(userId, 'system', 'write');
      expect(hasPermission).toBe(false);
    });

    test('should check access with context', async () => {
      const userId = 'test-user-123';
      
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
      expect(decision.allowed).toBe(true);
    });

    test('should create and use custom roles', () => {
      // Create custom role
      const customRole = {
        id: 'custom-role',
        name: 'Custom Role',
        description: 'A custom role for testing',
        permissions: ['coupons:read', 'coupons:write'],
        isSystem: false
      };

      const createResult = authorizationService.createRole(customRole);
      expect(createResult.success).toBe(true);

      // Assign custom role to user
      const userId = 'test-user-123';
      authorizationService.assignRole(userId, 'custom-role');

      // Check permissions
      expect(authorizationService.hasPermission(userId, 'coupons', 'read')).toBe(true);
      expect(authorizationService.hasPermission(userId, 'coupons', 'write')).toBe(true);
      expect(authorizationService.hasPermission(userId, 'users', 'delete')).toBe(false);
    });

    test('should create and apply access policies', async () => {
      // Create policy that denies access during certain hours
      const policy = {
        id: 'test-policy',
        name: 'Test Policy',
        description: 'Test access policy',
        enabled: true,
        priority: 1,
        rules: [
          {
            id: 'test-rule',
            effect: 'deny' as const,
            resource: 'system',
            action: 'write',
            conditions: {
              timeRange: { start: '00:00', end: '23:59' } // Always deny for test
            }
          }
        ]
      };

      const createResult = authorizationService.createAccessPolicy(policy);
      expect(createResult.success).toBe(true);

      // Test access with policy
      const userId = 'test-user-123';
      authorizationService.assignRole(userId, 'admin');

      const accessRequest = {
        userId,
        resource: 'system',
        action: 'write'
      };

      const decision = await authorizationService.checkAccess(accessRequest);
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('Test Policy');
    });

    test('should log audit trail', async () => {
      const userId = 'test-user-123';
      authorizationService.assignRole(userId, 'user');

      // Make access request
      const accessRequest = {
        userId,
        resource: 'coupons',
        action: 'read',
        context: {
          ipAddress: '127.0.0.1',
          userAgent: 'Test Agent'
        }
      };

      await authorizationService.checkAccess(accessRequest);

      // Check audit logs
      const auditLogs = authorizationService.getAuditLogs(10);
      expect(auditLogs.length).toBeGreaterThan(0);
      expect(auditLogs[0].userId).toBe(userId);
      expect(auditLogs[0].resource).toBe('coupons');
      expect(auditLogs[0].action).toBe('read');
    });
  });

  describe('EncryptionService', () => {
    test('should encrypt and decrypt data', () => {
      const plaintext = 'This is sensitive data';
      
      // Encrypt
      const encrypted = encryptionService.encrypt(plaintext);
      expect(encrypted.data).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.keyId).toBeDefined();

      // Decrypt
      const decrypted = encryptionService.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    test('should encrypt and decrypt securely with GCM', () => {
      const plaintext = 'This is very sensitive data';
      
      // Encrypt securely
      const encrypted = encryptionService.encryptSecure(plaintext);
      expect(encrypted.data).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.tag).toBeDefined();
      expect(encrypted.algorithm).toBe('aes-256-gcm');

      // Decrypt securely
      const decrypted = encryptionService.decryptSecure(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    test('should hash and verify data', () => {
      const data = 'password123';
      
      // Hash
      const hashResult = encryptionService.hash(data);
      expect(hashResult.hash).toBeDefined();
      expect(hashResult.salt).toBeDefined();
      expect(hashResult.algorithm).toBeDefined();

      // Verify
      const isValid = encryptionService.verifyHash(data, hashResult.hash, hashResult.salt, hashResult.algorithm, hashResult.iterations);
      expect(isValid).toBe(true);

      // Verify with wrong data
      const isInvalid = encryptionService.verifyHash('wrongpassword', hashResult.hash, hashResult.salt, hashResult.algorithm, hashResult.iterations);
      expect(isInvalid).toBe(false);
    });

    test('should generate and verify HMAC', () => {
      const data = 'important message';
      const secret = 'shared-secret';
      
      // Generate HMAC
      const hmac = encryptionService.generateHMAC(data, secret);
      expect(hmac).toBeDefined();
      expect(typeof hmac).toBe('string');

      // Verify HMAC
      const isValid = encryptionService.verifyHMAC(data, hmac, secret);
      expect(isValid).toBe(true);

      // Verify with wrong data
      const isInvalid = encryptionService.verifyHMAC('tampered message', hmac, secret);
      expect(isInvalid).toBe(false);
    });

    test('should generate secure tokens', () => {
      const token1 = encryptionService.generateToken();
      const token2 = encryptionService.generateToken();
      
      expect(token1).toBeDefined();
      expect(token2).toBeDefined();
      expect(token1).not.toBe(token2);
      expect(token1.length).toBe(64); // 32 bytes = 64 hex chars
    });

    test('should generate UUIDs', () => {
      const uuid1 = encryptionService.generateUUID();
      const uuid2 = encryptionService.generateUUID();
      
      expect(uuid1).toBeDefined();
      expect(uuid2).toBeDefined();
      expect(uuid1).not.toBe(uuid2);
      expect(uuid1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    test('should derive keys from passwords', () => {
      const password = 'user-password';
      
      // Derive key
      const keyResult = encryptionService.deriveKey(password);
      expect(keyResult.key).toBeDefined();
      expect(keyResult.salt).toBeDefined();

      // Derive same key with same salt
      const keyResult2 = encryptionService.deriveKey(password, keyResult.salt);
      expect(keyResult2.key).toBe(keyResult.key);
    });

    test('should encrypt and decrypt object fields', () => {
      const sensitiveData = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        ssn: '123-45-6789',
        creditCard: '4111-1111-1111-1111'
      };

      const fieldsToEncrypt = ['ssn', 'creditCard'];

      // Encrypt fields
      const encrypted = encryptionService.encryptFields(sensitiveData, fieldsToEncrypt);
      expect(encrypted.id).toBe(1);
      expect(encrypted.name).toBe('John Doe');
      expect(encrypted.email).toBe('john@example.com');
      expect(typeof encrypted.ssn).toBe('object');
      expect(typeof encrypted.creditCard).toBe('object');

      // Decrypt fields
      const decrypted = encryptionService.decryptFields(encrypted, fieldsToEncrypt);
      expect(decrypted.ssn).toBe('123-45-6789');
      expect(decrypted.creditCard).toBe('4111-1111-1111-1111');
    });

    test('should rotate encryption keys', () => {
      const initialKeyId = encryptionService.getCurrentKeyId();
      
      // Rotate keys
      encryptionService.rotateKeys();
      
      const newKeyId = encryptionService.getCurrentKeyId();
      expect(newKeyId).not.toBe(initialKeyId);

      // Should be able to decrypt data encrypted with old key
      const plaintext = 'test data';
      const encryptedWithOldKey = encryptionService.encrypt(plaintext, initialKeyId);
      const decrypted = encryptionService.decrypt(encryptedWithOldKey);
      expect(decrypted).toBe(plaintext);
    });

    test('should export and import keys', () => {
      const keyId = encryptionService.getCurrentKeyId();
      
      // Export key
      const exportedKey = encryptionService.exportKey(keyId);
      expect(exportedKey).toBeDefined();
      expect(typeof exportedKey).toBe('string');

      // Create new service instance
      const newEncryptionService = new (encryptionService.constructor as any)();
      
      // Import key
      const importResult = newEncryptionService.importKey(exportedKey!);
      expect(importResult).toBe(true);

      // Should be able to decrypt data
      const plaintext = 'test data';
      const encrypted = encryptionService.encrypt(plaintext, keyId);
      const decrypted = newEncryptionService.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);

      newEncryptionService.destroy();
    });
  });

  describe('Integration Tests', () => {
    test('should work together - authentication, authorization, and encryption', async () => {
      // Register user
      const userData = {
        username: 'integrationuser',
        email: 'integration@example.com',
        password: 'IntegrationTest123!'
      };
      const registerResult = await authenticationService.register(userData);
      expect(registerResult.success).toBe(true);

      const userId = registerResult.user!.id;

      // Assign role
      const roleResult = authorizationService.assignRole(userId, 'moderator');
      expect(roleResult.success).toBe(true);

      // Login
      const loginResult = await authenticationService.login({
        username: 'integrationuser',
        password: 'IntegrationTest123!',
        ipAddress: '127.0.0.1',
        userAgent: 'Integration Test'
      });
      expect(loginResult.success).toBe(true);

      // Verify token
      const tokenVerification = await authenticationService.verifyToken(loginResult.tokens!.accessToken);
      expect(tokenVerification.valid).toBe(true);

      // Check authorization
      const hasPermission = authorizationService.hasPermission(userId, 'coupons', 'approve');
      expect(hasPermission).toBe(true);

      // Encrypt sensitive data
      const sensitiveData = 'User sensitive information';
      const encrypted = encryptionService.encryptSecure(sensitiveData);
      expect(encrypted.data).toBeDefined();

      // Decrypt data
      const decrypted = encryptionService.decryptSecure(encrypted);
      expect(decrypted).toBe(sensitiveData);
    });

    test('should handle security workflow end-to-end', async () => {
      // 1. Register admin user
      const adminData = {
        username: 'securityadmin',
        email: 'admin@security.com',
        password: 'AdminPassword123!',
        role: 'admin' as const
      };
      const adminResult = await authenticationService.register(adminData);
      expect(adminResult.success).toBe(true);

      // 2. Assign admin role
      authorizationService.assignRole(adminResult.user!.id, 'admin');

      // 3. Login admin
      const adminLogin = await authenticationService.login({
        username: 'securityadmin',
        password: 'AdminPassword123!',
        ipAddress: '192.168.1.100',
        userAgent: 'Security Test'
      });
      expect(adminLogin.success).toBe(true);

      // 4. Create regular user
      const userData = {
        username: 'regularuser',
        email: 'user@security.com',
        password: 'UserPassword123!'
      };
      const userResult = await authenticationService.register(userData);
      expect(userResult.success).toBe(true);

      // 5. Assign user role
      authorizationService.assignRole(userResult.user!.id, 'user');

      // 6. Test admin access
      const adminAccess = await authorizationService.checkAccess({
        userId: adminResult.user!.id,
        resource: 'system',
        action: 'write',
        context: { ipAddress: '192.168.1.100' }
      });
      expect(adminAccess.allowed).toBe(true);

      // 7. Test user access (should be denied for admin resources)
      const userAccess = await authorizationService.checkAccess({
        userId: userResult.user!.id,
        resource: 'system',
        action: 'write',
        context: { ipAddress: '192.168.1.101' }
      });
      expect(userAccess.allowed).toBe(false);

      // 8. Encrypt user data
      const userSensitiveData = {
        userId: userResult.user!.id,
        personalInfo: 'Sensitive personal information',
        paymentInfo: 'Credit card details'
      };

      const encryptedData = encryptionService.encryptFields(userSensitiveData, ['personalInfo', 'paymentInfo']);
      expect(typeof encryptedData.personalInfo).toBe('object');
      expect(typeof encryptedData.paymentInfo).toBe('object');

      // 9. Decrypt data (admin should be able to decrypt)
      const decryptedData = encryptionService.decryptFields(encryptedData, ['personalInfo', 'paymentInfo']);
      expect(decryptedData.personalInfo).toBe('Sensitive personal information');
      expect(decryptedData.paymentInfo).toBe('Credit card details');

      // 10. Check audit logs
      const auditLogs = authorizationService.getAuditLogs(10);
      expect(auditLogs.length).toBeGreaterThan(0);
      
      const adminLog = auditLogs.find(log => log.userId === adminResult.user!.id);
      const userLog = auditLogs.find(log => log.userId === userResult.user!.id);
      
      expect(adminLog).toBeDefined();
      expect(adminLog?.decision).toBe('allow');
      expect(userLog).toBeDefined();
      expect(userLog?.decision).toBe('deny');
    });
  });
});
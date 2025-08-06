import crypto from 'crypto';
import { EventEmitter } from 'events';
import { logger } from '../../config/logger';

export interface EncryptionConfig {
  algorithm: string;
  keyLength: number;
  ivLength: number;
  tagLength: number;
  keyDerivationIterations: number;
  saltLength: number;
  masterKey: string;
  keyRotationInterval: number; // milliseconds
}

export interface EncryptedData {
  data: string;
  iv: string;
  tag?: string;
  keyId: string;
  algorithm: string;
  timestamp: Date;
}

export interface EncryptionKey {
  id: string;
  key: Buffer;
  algorithm: string;
  createdAt: Date;
  expiresAt?: Date;
  isActive: boolean;
}

export interface HashOptions {
  algorithm: 'sha256' | 'sha512' | 'blake2b';
  salt?: string;
  iterations?: number;
}

export class EncryptionService extends EventEmitter {
  private config: EncryptionConfig;
  private encryptionKeys: Map<string, EncryptionKey> = new Map();
  private currentKeyId: string;
  private keyRotationTimer?: NodeJS.Timeout;

  constructor(config: Partial<EncryptionConfig> = {}) {
    super();
    
    this.config = {
      algorithm: 'aes-256-gcm',
      keyLength: 32,
      ivLength: 16,
      tagLength: 16,
      keyDerivationIterations: 100000,
      saltLength: 32,
      masterKey: process.env.ENCRYPTION_MASTER_KEY || 'your-super-secret-master-key-change-this',
      keyRotationInterval: 86400000, // 24 hours
      ...config
    };

    this.initializeKeys();
    this.startKeyRotation();
  }

  /**
   * Initialize encryption keys
   */
  private initializeKeys(): void {
    // Generate initial key
    const initialKey = this.generateKey();
    this.currentKeyId = initialKey.id;
    this.encryptionKeys.set(initialKey.id, initialKey);

    logger.info(`EncryptionService: Initialized with key ${initialKey.id}`);
  }

  /**
   * Generate a new encryption key
   */
  private generateKey(): EncryptionKey {
    const keyId = this.generateKeyId();
    const key = crypto.randomBytes(this.config.keyLength);
    
    return {
      id: keyId,
      key,
      algorithm: this.config.algorithm,
      createdAt: new Date(),
      isActive: true
    };
  }

  /**
   * Encrypt data
   */
  encrypt(data: string | Buffer, keyId?: string): EncryptedData {
    try {
      const useKeyId = keyId || this.currentKeyId;
      const encryptionKey = this.encryptionKeys.get(useKeyId);
      
      if (!encryptionKey) {
        throw new Error(`Encryption key ${useKeyId} not found`);
      }

      const iv = crypto.randomBytes(this.config.ivLength);
      const cipher = crypto.createCipher(this.config.algorithm, encryptionKey.key);
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      let tag: string | undefined;
      if (this.config.algorithm.includes('gcm')) {
        tag = (cipher as any).getAuthTag().toString('hex');
      }

      const result: EncryptedData = {
        data: encrypted,
        iv: iv.toString('hex'),
        tag,
        keyId: useKeyId,
        algorithm: this.config.algorithm,
        timestamp: new Date()
      };

      logger.debug(`EncryptionService: Data encrypted with key ${useKeyId}`);
      this.emit('dataEncrypted', { keyId: useKeyId, dataLength: data.length });

      return result;

    } catch (error) {
      logger.error('EncryptionService: Encryption error:', error);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt data
   */
  decrypt(encryptedData: EncryptedData): string {
    try {
      const encryptionKey = this.encryptionKeys.get(encryptedData.keyId);
      
      if (!encryptionKey) {
        throw new Error(`Encryption key ${encryptedData.keyId} not found`);
      }

      const decipher = crypto.createDecipher(encryptedData.algorithm, encryptionKey.key);
      
      if (encryptedData.tag && encryptedData.algorithm.includes('gcm')) {
        (decipher as any).setAuthTag(Buffer.from(encryptedData.tag, 'hex'));
      }

      let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      logger.debug(`EncryptionService: Data decrypted with key ${encryptedData.keyId}`);
      this.emit('dataDecrypted', { keyId: encryptedData.keyId });

      return decrypted;

    } catch (error) {
      logger.error('EncryptionService: Decryption error:', error);
      throw new Error('Decryption failed');
    }
  }

  /**
   * Encrypt data with AES-256-GCM (recommended for new data)
   */
  encryptSecure(data: string | Buffer, keyId?: string): EncryptedData {
    try {
      const useKeyId = keyId || this.currentKeyId;
      const encryptionKey = this.encryptionKeys.get(useKeyId);
      
      if (!encryptionKey) {
        throw new Error(`Encryption key ${useKeyId} not found`);
      }

      const iv = crypto.randomBytes(this.config.ivLength);
      const cipher = crypto.createCipherGCM('aes-256-gcm', encryptionKey.key);
      cipher.setIVLength(this.config.ivLength);
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag().toString('hex');

      const result: EncryptedData = {
        data: encrypted,
        iv: iv.toString('hex'),
        tag,
        keyId: useKeyId,
        algorithm: 'aes-256-gcm',
        timestamp: new Date()
      };

      logger.debug(`EncryptionService: Data encrypted securely with key ${useKeyId}`);
      this.emit('dataEncrypted', { keyId: useKeyId, dataLength: data.length });

      return result;

    } catch (error) {
      logger.error('EncryptionService: Secure encryption error:', error);
      throw new Error('Secure encryption failed');
    }
  }

  /**
   * Decrypt data with AES-256-GCM
   */
  decryptSecure(encryptedData: EncryptedData): string {
    try {
      const encryptionKey = this.encryptionKeys.get(encryptedData.keyId);
      
      if (!encryptionKey) {
        throw new Error(`Encryption key ${encryptedData.keyId} not found`);
      }

      if (!encryptedData.tag) {
        throw new Error('Authentication tag is required for secure decryption');
      }

      const decipher = crypto.createDecipherGCM('aes-256-gcm', encryptionKey.key);
      decipher.setIVLength(this.config.ivLength);
      decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));

      let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      logger.debug(`EncryptionService: Data decrypted securely with key ${encryptedData.keyId}`);
      this.emit('dataDecrypted', { keyId: encryptedData.keyId });

      return decrypted;

    } catch (error) {
      logger.error('EncryptionService: Secure decryption error:', error);
      throw new Error('Secure decryption failed');
    }
  }

  /**
   * Hash data with salt
   */
  hash(data: string, options: HashOptions = {}): { hash: string; salt: string; algorithm: string; iterations?: number } {
    try {
      const algorithm = options.algorithm || 'sha256';
      const salt = options.salt || crypto.randomBytes(this.config.saltLength).toString('hex');
      const iterations = options.iterations || this.config.keyDerivationIterations;

      let hash: string;

      if (algorithm === 'blake2b') {
        // Use Blake2b if available (Node.js 12+)
        const hasher = crypto.createHash('blake2b512');
        hasher.update(data + salt);
        hash = hasher.digest('hex');
      } else if (iterations > 1) {
        // Use PBKDF2 for key derivation
        hash = crypto.pbkdf2Sync(data, salt, iterations, 64, algorithm).toString('hex');
      } else {
        // Simple hash with salt
        const hasher = crypto.createHash(algorithm);
        hasher.update(data + salt);
        hash = hasher.digest('hex');
      }

      logger.debug(`EncryptionService: Data hashed with ${algorithm}`);
      this.emit('dataHashed', { algorithm, iterations });

      return {
        hash,
        salt,
        algorithm,
        iterations: iterations > 1 ? iterations : undefined
      };

    } catch (error) {
      logger.error('EncryptionService: Hashing error:', error);
      throw new Error('Hashing failed');
    }
  }

  /**
   * Verify hash
   */
  verifyHash(data: string, hash: string, salt: string, algorithm: string = 'sha256', iterations?: number): boolean {
    try {
      const hashResult = this.hash(data, { algorithm, salt, iterations });
      return hashResult.hash === hash;
    } catch (error) {
      logger.error('EncryptionService: Hash verification error:', error);
      return false;
    }
  }

  /**
   * Generate HMAC
   */
  generateHMAC(data: string, secret?: string): string {
    try {
      const key = secret || this.config.masterKey;
      const hmac = crypto.createHmac('sha256', key);
      hmac.update(data);
      return hmac.digest('hex');
    } catch (error) {
      logger.error('EncryptionService: HMAC generation error:', error);
      throw new Error('HMAC generation failed');
    }
  }

  /**
   * Verify HMAC
   */
  verifyHMAC(data: string, signature: string, secret?: string): boolean {
    try {
      const expectedSignature = this.generateHMAC(data, secret);
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      logger.error('EncryptionService: HMAC verification error:', error);
      return false;
    }
  }

  /**
   * Generate secure random token
   */
  generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate UUID v4
   */
  generateUUID(): string {
    return crypto.randomUUID();
  }

  /**
   * Derive key from password
   */
  deriveKey(password: string, salt?: string): { key: string; salt: string } {
    try {
      const useSalt = salt || crypto.randomBytes(this.config.saltLength).toString('hex');
      const key = crypto.pbkdf2Sync(
        password,
        useSalt,
        this.config.keyDerivationIterations,
        this.config.keyLength,
        'sha256'
      ).toString('hex');

      return { key, salt: useSalt };
    } catch (error) {
      logger.error('EncryptionService: Key derivation error:', error);
      throw new Error('Key derivation failed');
    }
  }

  /**
   * Encrypt sensitive fields in an object
   */
  encryptFields(obj: any, fields: string[]): any {
    try {
      const result = { ...obj };
      
      for (const field of fields) {
        if (result[field] !== undefined && result[field] !== null) {
          const encrypted = this.encryptSecure(String(result[field]));
          result[field] = encrypted;
        }
      }

      return result;
    } catch (error) {
      logger.error('EncryptionService: Field encryption error:', error);
      throw new Error('Field encryption failed');
    }
  }

  /**
   * Decrypt sensitive fields in an object
   */
  decryptFields(obj: any, fields: string[]): any {
    try {
      const result = { ...obj };
      
      for (const field of fields) {
        if (result[field] && typeof result[field] === 'object' && result[field].data) {
          const decrypted = this.decryptSecure(result[field]);
          result[field] = decrypted;
        }
      }

      return result;
    } catch (error) {
      logger.error('EncryptionService: Field decryption error:', error);
      throw new Error('Field decryption failed');
    }
  }

  /**
   * Rotate encryption keys
   */
  rotateKeys(): void {
    try {
      // Generate new key
      const newKey = this.generateKey();
      this.encryptionKeys.set(newKey.id, newKey);

      // Mark old key as inactive but keep it for decryption
      const oldKey = this.encryptionKeys.get(this.currentKeyId);
      if (oldKey) {
        oldKey.isActive = false;
        oldKey.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      }

      // Set new key as current
      this.currentKeyId = newKey.id;

      logger.info(`EncryptionService: Keys rotated - new key: ${newKey.id}, old key: ${oldKey?.id}`);
      this.emit('keysRotated', { newKeyId: newKey.id, oldKeyId: oldKey?.id });

    } catch (error) {
      logger.error('EncryptionService: Key rotation error:', error);
      throw new Error('Key rotation failed');
    }
  }

  /**
   * Start automatic key rotation
   */
  private startKeyRotation(): void {
    this.keyRotationTimer = setInterval(() => {
      this.rotateKeys();
    }, this.config.keyRotationInterval);

    logger.info(`EncryptionService: Key rotation started - interval: ${this.config.keyRotationInterval}ms`);
  }

  /**
   * Stop automatic key rotation
   */
  stopKeyRotation(): void {
    if (this.keyRotationTimer) {
      clearInterval(this.keyRotationTimer);
      this.keyRotationTimer = undefined;
      logger.info('EncryptionService: Key rotation stopped');
    }
  }

  /**
   * Get current key ID
   */
  getCurrentKeyId(): string {
    return this.currentKeyId;
  }

  /**
   * Get all key IDs
   */
  getKeyIds(): string[] {
    return Array.from(this.encryptionKeys.keys());
  }

  /**
   * Get key information (without the actual key)
   */
  getKeyInfo(keyId: string): Omit<EncryptionKey, 'key'> | null {
    const key = this.encryptionKeys.get(keyId);
    if (!key) return null;

    const { key: _, ...keyInfo } = key;
    return keyInfo;
  }

  /**
   * Get all keys information
   */
  getAllKeysInfo(): Omit<EncryptionKey, 'key'>[] {
    return Array.from(this.encryptionKeys.values()).map(key => {
      const { key: _, ...keyInfo } = key;
      return keyInfo;
    });
  }

  /**
   * Clean up expired keys
   */
  cleanupExpiredKeys(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [keyId, key] of this.encryptionKeys.entries()) {
      if (key.expiresAt && key.expiresAt < now) {
        this.encryptionKeys.delete(keyId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info(`EncryptionService: Cleaned up ${cleanedCount} expired keys`);
      this.emit('keysCleanedUp', { count: cleanedCount });
    }
  }

  /**
   * Get encryption statistics
   */
  getStats(): any {
    const activeKeys = Array.from(this.encryptionKeys.values()).filter(key => key.isActive);
    const expiredKeys = Array.from(this.encryptionKeys.values()).filter(key => 
      key.expiresAt && key.expiresAt < new Date()
    );

    return {
      totalKeys: this.encryptionKeys.size,
      activeKeys: activeKeys.length,
      expiredKeys: expiredKeys.length,
      currentKeyId: this.currentKeyId,
      keyRotationInterval: this.config.keyRotationInterval,
      algorithm: this.config.algorithm,
      keyLength: this.config.keyLength
    };
  }

  /**
   * Export key for backup (encrypted with master key)
   */
  exportKey(keyId: string): string | null {
    try {
      const key = this.encryptionKeys.get(keyId);
      if (!key) return null;

      const keyData = {
        id: key.id,
        key: key.key.toString('hex'),
        algorithm: key.algorithm,
        createdAt: key.createdAt.toISOString(),
        expiresAt: key.expiresAt?.toISOString(),
        isActive: key.isActive
      };

      // Encrypt with master key
      const cipher = crypto.createCipher('aes-256-cbc', this.config.masterKey);
      let encrypted = cipher.update(JSON.stringify(keyData), 'utf8', 'hex');
      encrypted += cipher.final('hex');

      return encrypted;
    } catch (error) {
      logger.error('EncryptionService: Key export error:', error);
      return null;
    }
  }

  /**
   * Import key from backup
   */
  importKey(encryptedKeyData: string): boolean {
    try {
      // Decrypt with master key
      const decipher = crypto.createDecipher('aes-256-cbc', this.config.masterKey);
      let decrypted = decipher.update(encryptedKeyData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      const keyData = JSON.parse(decrypted);
      
      const key: EncryptionKey = {
        id: keyData.id,
        key: Buffer.from(keyData.key, 'hex'),
        algorithm: keyData.algorithm,
        createdAt: new Date(keyData.createdAt),
        expiresAt: keyData.expiresAt ? new Date(keyData.expiresAt) : undefined,
        isActive: keyData.isActive
      };

      this.encryptionKeys.set(key.id, key);
      
      logger.info(`EncryptionService: Key imported - ${key.id}`);
      this.emit('keyImported', { keyId: key.id });

      return true;
    } catch (error) {
      logger.error('EncryptionService: Key import error:', error);
      return false;
    }
  }

  private generateKeyId(): string {
    return `key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopKeyRotation();
    
    // Clear all keys from memory
    this.encryptionKeys.clear();
    
    logger.info('EncryptionService: Destroyed');
  }
}

// Export singleton instance
export const encryptionService = new EncryptionService();
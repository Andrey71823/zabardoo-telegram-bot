import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { EventEmitter } from 'events';
import { logger } from '../../config/logger';

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'user' | 'moderator';
  isActive: boolean;
  lastLogin?: Date;
  loginAttempts: number;
  lockedUntil?: Date;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface LoginAttempt {
  id: string;
  userId?: string;
  username: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  timestamp: Date;
  failureReason?: string;
}

export interface SecurityConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  refreshTokenExpiresIn: string;
  bcryptRounds: number;
  maxLoginAttempts: number;
  lockoutDuration: number; // milliseconds
  passwordMinLength: number;
  passwordRequireSpecialChars: boolean;
  sessionTimeout: number; // milliseconds
  enableTwoFactor: boolean;
}

export class AuthenticationService extends EventEmitter {
  private config: SecurityConfig;
  private users: Map<string, User> = new Map();
  private refreshTokens: Map<string, { userId: string; expiresAt: Date }> = new Map();
  private loginAttempts: LoginAttempt[] = [];
  private activeSessions: Map<string, { userId: string; lastActivity: Date }> = new Map();
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: Partial<SecurityConfig> = {}) {
    super();
    
    this.config = {
      jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
      jwtExpiresIn: '15m',
      refreshTokenExpiresIn: '7d',
      bcryptRounds: 12,
      maxLoginAttempts: 5,
      lockoutDuration: 900000, // 15 minutes
      passwordMinLength: 8,
      passwordRequireSpecialChars: true,
      sessionTimeout: 3600000, // 1 hour
      enableTwoFactor: false,
      ...config
    };

    this.startCleanupTimer();
    this.initializeDefaultUsers();
  }

  /**
   * Initialize default admin user
   */
  private async initializeDefaultUsers(): Promise<void> {
    const adminExists = Array.from(this.users.values()).some(user => user.role === 'admin');
    
    if (!adminExists) {
      const adminUser: User = {
        id: 'admin-001',
        username: 'admin',
        email: 'admin@zabardoo.com',
        passwordHash: await this.hashPassword('admin123!'),
        role: 'admin',
        isActive: true,
        loginAttempts: 0,
        twoFactorEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.users.set(adminUser.id, adminUser);
      logger.info('AuthenticationService: Default admin user created');
    }
  }

  /**
   * Register a new user
   */
  async register(userData: {
    username: string;
    email: string;
    password: string;
    role?: 'admin' | 'user' | 'moderator';
  }): Promise<{ success: boolean; user?: Omit<User, 'passwordHash'>; error?: string }> {
    try {
      // Validate input
      const validation = this.validateUserData(userData);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Check if user already exists
      const existingUser = Array.from(this.users.values()).find(
        user => user.username === userData.username || user.email === userData.email
      );

      if (existingUser) {
        return { success: false, error: 'User already exists' };
      }

      // Create new user
      const userId = this.generateUserId();
      const passwordHash = await this.hashPassword(userData.password);

      const newUser: User = {
        id: userId,
        username: userData.username,
        email: userData.email,
        passwordHash,
        role: userData.role || 'user',
        isActive: true,
        loginAttempts: 0,
        twoFactorEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.users.set(userId, newUser);

      logger.info(`AuthenticationService: User registered - ${userData.username}`);
      this.emit('userRegistered', { userId, username: userData.username });

      // Return user without password hash
      const { passwordHash: _, ...userWithoutPassword } = newUser;
      return { success: true, user: userWithoutPassword };

    } catch (error) {
      logger.error('AuthenticationService: Registration error:', error);
      return { success: false, error: 'Registration failed' };
    }
  }

  /**
   * Authenticate user login
   */
  async login(credentials: {
    username: string;
    password: string;
    ipAddress: string;
    userAgent: string;
    twoFactorCode?: string;
  }): Promise<{ success: boolean; tokens?: AuthToken; user?: Omit<User, 'passwordHash'>; error?: string }> {
    const loginAttempt: LoginAttempt = {
      id: this.generateAttemptId(),
      username: credentials.username,
      ipAddress: credentials.ipAddress,
      userAgent: credentials.userAgent,
      success: false,
      timestamp: new Date()
    };

    try {
      // Find user
      const user = Array.from(this.users.values()).find(
        u => u.username === credentials.username || u.email === credentials.username
      );

      if (!user) {
        loginAttempt.failureReason = 'User not found';
        this.loginAttempts.push(loginAttempt);
        return { success: false, error: 'Invalid credentials' };
      }

      loginAttempt.userId = user.id;

      // Check if user is active
      if (!user.isActive) {
        loginAttempt.failureReason = 'Account disabled';
        this.loginAttempts.push(loginAttempt);
        return { success: false, error: 'Account is disabled' };
      }

      // Check if account is locked
      if (this.isAccountLocked(user)) {
        loginAttempt.failureReason = 'Account locked';
        this.loginAttempts.push(loginAttempt);
        return { success: false, error: 'Account is temporarily locked' };
      }

      // Verify password
      const passwordValid = await this.verifyPassword(credentials.password, user.passwordHash);
      if (!passwordValid) {
        user.loginAttempts++;
        user.updatedAt = new Date();

        if (user.loginAttempts >= this.config.maxLoginAttempts) {
          user.lockedUntil = new Date(Date.now() + this.config.lockoutDuration);
          logger.warn(`AuthenticationService: Account locked - ${user.username}`);
          this.emit('accountLocked', { userId: user.id, username: user.username });
        }

        loginAttempt.failureReason = 'Invalid password';
        this.loginAttempts.push(loginAttempt);
        return { success: false, error: 'Invalid credentials' };
      }

      // Check two-factor authentication
      if (user.twoFactorEnabled && this.config.enableTwoFactor) {
        if (!credentials.twoFactorCode) {
          return { success: false, error: 'Two-factor authentication code required' };
        }

        const twoFactorValid = this.verifyTwoFactorCode(user.twoFactorSecret!, credentials.twoFactorCode);
        if (!twoFactorValid) {
          loginAttempt.failureReason = 'Invalid 2FA code';
          this.loginAttempts.push(loginAttempt);
          return { success: false, error: 'Invalid two-factor authentication code' };
        }
      }

      // Successful login
      user.loginAttempts = 0;
      user.lastLogin = new Date();
      user.updatedAt = new Date();
      user.lockedUntil = undefined;

      loginAttempt.success = true;
      this.loginAttempts.push(loginAttempt);

      // Generate tokens
      const tokens = await this.generateTokens(user);

      // Create session
      const sessionId = this.generateSessionId();
      this.activeSessions.set(sessionId, {
        userId: user.id,
        lastActivity: new Date()
      });

      logger.info(`AuthenticationService: User logged in - ${user.username}`);
      this.emit('userLoggedIn', { userId: user.id, username: user.username, ipAddress: credentials.ipAddress });

      // Return user without password hash
      const { passwordHash: _, ...userWithoutPassword } = user;
      return { success: true, tokens, user: userWithoutPassword };

    } catch (error) {
      logger.error('AuthenticationService: Login error:', error);
      loginAttempt.failureReason = 'System error';
      this.loginAttempts.push(loginAttempt);
      return { success: false, error: 'Login failed' };
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<{ success: boolean; tokens?: AuthToken; error?: string }> {
    try {
      const tokenData = this.refreshTokens.get(refreshToken);
      if (!tokenData || tokenData.expiresAt < new Date()) {
        this.refreshTokens.delete(refreshToken);
        return { success: false, error: 'Invalid or expired refresh token' };
      }

      const user = this.users.get(tokenData.userId);
      if (!user || !user.isActive) {
        this.refreshTokens.delete(refreshToken);
        return { success: false, error: 'User not found or inactive' };
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      // Remove old refresh token
      this.refreshTokens.delete(refreshToken);

      logger.info(`AuthenticationService: Token refreshed for user ${user.username}`);
      return { success: true, tokens };

    } catch (error) {
      logger.error('AuthenticationService: Token refresh error:', error);
      return { success: false, error: 'Token refresh failed' };
    }
  }

  /**
   * Logout user
   */
  async logout(refreshToken: string, sessionId?: string): Promise<{ success: boolean }> {
    try {
      // Remove refresh token
      const tokenData = this.refreshTokens.get(refreshToken);
      if (tokenData) {
        this.refreshTokens.delete(refreshToken);
        
        const user = this.users.get(tokenData.userId);
        if (user) {
          logger.info(`AuthenticationService: User logged out - ${user.username}`);
          this.emit('userLoggedOut', { userId: user.id, username: user.username });
        }
      }

      // Remove session
      if (sessionId) {
        this.activeSessions.delete(sessionId);
      }

      return { success: true };

    } catch (error) {
      logger.error('AuthenticationService: Logout error:', error);
      return { success: true }; // Always return success for logout
    }
  }

  /**
   * Verify JWT token
   */
  async verifyToken(token: string): Promise<{ valid: boolean; user?: Omit<User, 'passwordHash'>; error?: string }> {
    try {
      const decoded = jwt.verify(token, this.config.jwtSecret) as any;
      
      const user = this.users.get(decoded.userId);
      if (!user || !user.isActive) {
        return { valid: false, error: 'User not found or inactive' };
      }

      // Return user without password hash
      const { passwordHash: _, ...userWithoutPassword } = user;
      return { valid: true, user: userWithoutPassword };

    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return { valid: false, error: 'Token expired' };
      } else if (error instanceof jwt.JsonWebTokenError) {
        return { valid: false, error: 'Invalid token' };
      }
      
      logger.error('AuthenticationService: Token verification error:', error);
      return { valid: false, error: 'Token verification failed' };
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const user = this.users.get(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Verify current password
      const currentPasswordValid = await this.verifyPassword(currentPassword, user.passwordHash);
      if (!currentPasswordValid) {
        return { success: false, error: 'Current password is incorrect' };
      }

      // Validate new password
      const validation = this.validatePassword(newPassword);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Update password
      user.passwordHash = await this.hashPassword(newPassword);
      user.updatedAt = new Date();

      logger.info(`AuthenticationService: Password changed for user ${user.username}`);
      this.emit('passwordChanged', { userId, username: user.username });

      return { success: true };

    } catch (error) {
      logger.error('AuthenticationService: Password change error:', error);
      return { success: false, error: 'Password change failed' };
    }
  }

  /**
   * Enable two-factor authentication
   */
  enableTwoFactor(userId: string): { success: boolean; secret?: string; qrCode?: string; error?: string } {
    try {
      const user = this.users.get(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      if (!this.config.enableTwoFactor) {
        return { success: false, error: 'Two-factor authentication is disabled' };
      }

      const secret = this.generateTwoFactorSecret();
      user.twoFactorSecret = secret;
      user.twoFactorEnabled = true;
      user.updatedAt = new Date();

      // Generate QR code URL (in real implementation, use qrcode library)
      const qrCode = `otpauth://totp/Zabardoo:${user.username}?secret=${secret}&issuer=Zabardoo`;

      logger.info(`AuthenticationService: Two-factor authentication enabled for user ${user.username}`);
      this.emit('twoFactorEnabled', { userId, username: user.username });

      return { success: true, secret, qrCode };

    } catch (error) {
      logger.error('AuthenticationService: Two-factor enable error:', error);
      return { success: false, error: 'Failed to enable two-factor authentication' };
    }
  }

  /**
   * Disable two-factor authentication
   */
  disableTwoFactor(userId: string): { success: boolean; error?: string } {
    try {
      const user = this.users.get(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      user.twoFactorEnabled = false;
      user.twoFactorSecret = undefined;
      user.updatedAt = new Date();

      logger.info(`AuthenticationService: Two-factor authentication disabled for user ${user.username}`);
      this.emit('twoFactorDisabled', { userId, username: user.username });

      return { success: true };

    } catch (error) {
      logger.error('AuthenticationService: Two-factor disable error:', error);
      return { success: false, error: 'Failed to disable two-factor authentication' };
    }
  }

  /**
   * Get user by ID
   */
  getUser(userId: string): Omit<User, 'passwordHash'> | null {
    const user = this.users.get(userId);
    if (!user) return null;

    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Get all users (admin only)
   */
  getAllUsers(): Omit<User, 'passwordHash'>[] {
    return Array.from(this.users.values()).map(user => {
      const { passwordHash: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
  }

  /**
   * Update user
   */
  updateUser(userId: string, updates: Partial<Pick<User, 'email' | 'role' | 'isActive'>>): { success: boolean; error?: string } {
    try {
      const user = this.users.get(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      if (updates.email) user.email = updates.email;
      if (updates.role) user.role = updates.role;
      if (updates.isActive !== undefined) user.isActive = updates.isActive;
      user.updatedAt = new Date();

      logger.info(`AuthenticationService: User updated - ${user.username}`);
      this.emit('userUpdated', { userId, username: user.username, updates });

      return { success: true };

    } catch (error) {
      logger.error('AuthenticationService: User update error:', error);
      return { success: false, error: 'User update failed' };
    }
  }

  /**
   * Delete user
   */
  deleteUser(userId: string): { success: boolean; error?: string } {
    try {
      const user = this.users.get(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Don't allow deleting the last admin
      if (user.role === 'admin') {
        const adminCount = Array.from(this.users.values()).filter(u => u.role === 'admin').length;
        if (adminCount <= 1) {
          return { success: false, error: 'Cannot delete the last admin user' };
        }
      }

      this.users.delete(userId);

      // Remove all refresh tokens for this user
      for (const [token, data] of this.refreshTokens.entries()) {
        if (data.userId === userId) {
          this.refreshTokens.delete(token);
        }
      }

      // Remove all sessions for this user
      for (const [sessionId, session] of this.activeSessions.entries()) {
        if (session.userId === userId) {
          this.activeSessions.delete(sessionId);
        }
      }

      logger.info(`AuthenticationService: User deleted - ${user.username}`);
      this.emit('userDeleted', { userId, username: user.username });

      return { success: true };

    } catch (error) {
      logger.error('AuthenticationService: User deletion error:', error);
      return { success: false, error: 'User deletion failed' };
    }
  }

  /**
   * Get login attempts
   */
  getLoginAttempts(limit: number = 100): LoginAttempt[] {
    return this.loginAttempts
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get active sessions
   */
  getActiveSessions(): Array<{ sessionId: string; userId: string; username: string; lastActivity: Date }> {
    return Array.from(this.activeSessions.entries()).map(([sessionId, session]) => {
      const user = this.users.get(session.userId);
      return {
        sessionId,
        userId: session.userId,
        username: user?.username || 'Unknown',
        lastActivity: session.lastActivity
      };
    });
  }

  /**
   * Get authentication statistics
   */
  getStats(): any {
    const now = Date.now();
    const oneDayAgo = now - 86400000;
    const oneHourAgo = now - 3600000;

    const recentAttempts = this.loginAttempts.filter(attempt => 
      attempt.timestamp.getTime() > oneDayAgo
    );

    return {
      totalUsers: this.users.size,
      activeUsers: Array.from(this.users.values()).filter(user => user.isActive).length,
      lockedUsers: Array.from(this.users.values()).filter(user => this.isAccountLocked(user)).length,
      twoFactorUsers: Array.from(this.users.values()).filter(user => user.twoFactorEnabled).length,
      activeSessions: this.activeSessions.size,
      refreshTokens: this.refreshTokens.size,
      loginAttempts: {
        total: this.loginAttempts.length,
        last24h: recentAttempts.length,
        last1h: this.loginAttempts.filter(attempt => 
          attempt.timestamp.getTime() > oneHourAgo
        ).length,
        successful: recentAttempts.filter(attempt => attempt.success).length,
        failed: recentAttempts.filter(attempt => !attempt.success).length
      }
    };
  }

  // Private helper methods

  private validateUserData(userData: { username: string; email: string; password: string }): { valid: boolean; error?: string } {
    if (!userData.username || userData.username.length < 3) {
      return { valid: false, error: 'Username must be at least 3 characters long' };
    }

    if (!userData.email || !this.isValidEmail(userData.email)) {
      return { valid: false, error: 'Invalid email address' };
    }

    const passwordValidation = this.validatePassword(userData.password);
    if (!passwordValidation.valid) {
      return passwordValidation;
    }

    return { valid: true };
  }

  private validatePassword(password: string): { valid: boolean; error?: string } {
    if (!password || password.length < this.config.passwordMinLength) {
      return { valid: false, error: `Password must be at least ${this.config.passwordMinLength} characters long` };
    }

    if (this.config.passwordRequireSpecialChars) {
      const hasUpperCase = /[A-Z]/.test(password);
      const hasLowerCase = /[a-z]/.test(password);
      const hasNumbers = /\d/.test(password);
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

      if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
        return { 
          valid: false, 
          error: 'Password must contain uppercase, lowercase, numbers, and special characters' 
        };
      }
    }

    return { valid: true };
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.config.bcryptRounds);
  }

  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  private isAccountLocked(user: User): boolean {
    return user.lockedUntil ? user.lockedUntil > new Date() : false;
  }

  private async generateTokens(user: User): Promise<AuthToken> {
    const payload = {
      userId: user.id,
      username: user.username,
      role: user.role
    };

    const accessToken = jwt.sign(payload, this.config.jwtSecret, {
      expiresIn: this.config.jwtExpiresIn
    });

    const refreshToken = this.generateRefreshToken();
    const refreshExpiresAt = new Date();
    refreshExpiresAt.setTime(refreshExpiresAt.getTime() + this.parseTimeToMs(this.config.refreshTokenExpiresIn));

    this.refreshTokens.set(refreshToken, {
      userId: user.id,
      expiresAt: refreshExpiresAt
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseTimeToMs(this.config.jwtExpiresIn) / 1000,
      tokenType: 'Bearer'
    };
  }

  private generateRefreshToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private generateTwoFactorSecret(): string {
    return crypto.randomBytes(20).toString('base32');
  }

  private verifyTwoFactorCode(secret: string, code: string): boolean {
    // Simplified TOTP verification - in real implementation use speakeasy library
    const timeStep = Math.floor(Date.now() / 30000);
    const expectedCode = this.generateTOTP(secret, timeStep);
    return code === expectedCode;
  }

  private generateTOTP(secret: string, timeStep: number): string {
    // Simplified TOTP generation - in real implementation use speakeasy library
    const hash = crypto.createHmac('sha1', Buffer.from(secret, 'base32'));
    hash.update(Buffer.from(timeStep.toString()));
    const hmac = hash.digest();
    const offset = hmac[hmac.length - 1] & 0xf;
    const code = ((hmac[offset] & 0x7f) << 24) |
                 ((hmac[offset + 1] & 0xff) << 16) |
                 ((hmac[offset + 2] & 0xff) << 8) |
                 (hmac[offset + 3] & 0xff);
    return (code % 1000000).toString().padStart(6, '0');
  }

  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAttemptId(): string {
    return `attempt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private parseTimeToMs(timeString: string): number {
    const unit = timeString.slice(-1);
    const value = parseInt(timeString.slice(0, -1));
    
    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return parseInt(timeString);
    }
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, 300000); // Cleanup every 5 minutes
  }

  private cleanup(): void {
    const now = new Date();

    // Clean expired refresh tokens
    for (const [token, data] of this.refreshTokens.entries()) {
      if (data.expiresAt < now) {
        this.refreshTokens.delete(token);
      }
    }

    // Clean inactive sessions
    const sessionTimeout = this.config.sessionTimeout;
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (now.getTime() - session.lastActivity.getTime() > sessionTimeout) {
        this.activeSessions.delete(sessionId);
      }
    }

    // Clean old login attempts (keep last 1000)
    if (this.loginAttempts.length > 1000) {
      this.loginAttempts = this.loginAttempts
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 1000);
    }

    // Unlock expired account locks
    for (const user of this.users.values()) {
      if (user.lockedUntil && user.lockedUntil < now) {
        user.lockedUntil = undefined;
        user.loginAttempts = 0;
        user.updatedAt = now;
        logger.info(`AuthenticationService: Account unlocked - ${user.username}`);
        this.emit('accountUnlocked', { userId: user.id, username: user.username });
      }
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    this.users.clear();
    this.refreshTokens.clear();
    this.loginAttempts = [];
    this.activeSessions.clear();

    logger.info('AuthenticationService: Destroyed');
  }
}

// Export singleton instance
export const authenticationService = new AuthenticationService();
import { EventEmitter } from 'events';
import { logger } from '../../config/logger';

export interface SuspiciousActivity {
  id: string;
  userId?: string;
  ipAddress: string;
  userAgent: string;
  activityType: 'rate_limit_exceeded' | 'suspicious_login' | 'bot_behavior' | 'spam_detected' | 'ddos_attempt' | 'injection_attempt';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  metadata: { [key: string]: any };
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface BlockedEntity {
  id: string;
  type: 'ip' | 'user' | 'user_agent' | 'country';
  value: string;
  reason: string;
  severity: 'temporary' | 'permanent';
  blockedAt: Date;
  expiresAt?: Date;
  blockedBy: string;
  metadata?: { [key: string]: any };
}

export interface RateLimitRule {
  id: string;
  name: string;
  endpoint: string;
  method: string;
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests: boolean;
  skipFailedRequests: boolean;
  keyGenerator: 'ip' | 'user' | 'combined';
  enabled: boolean;
}

export interface AbusePreventionConfig {
  enableRateLimit: boolean;
  enableBotDetection: boolean;
  enableSpamDetection: boolean;
  enableDDoSProtection: boolean;
  enableInjectionProtection: boolean;
  maxFailedLogins: number;
  loginLockoutDuration: number;
  suspiciousActivityThreshold: number;
  autoBlockEnabled: boolean;
  geoBlockingEnabled: boolean;
  blockedCountries: string[];
}

export class AbusePreventionService extends EventEmitter {
  private config: AbusePreventionConfig;
  private suspiciousActivities: Map<string, SuspiciousActivity> = new Map();
  private blockedEntities: Map<string, BlockedEntity> = new Map();
  private rateLimitRules: Map<string, RateLimitRule> = new Map();
  private requestCounts: Map<string, { count: number; resetTime: number }> = new Map();
  private failedLoginAttempts: Map<string, { count: number; lastAttempt: Date }> = new Map();
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: Partial<AbusePreventionConfig> = {}) {
    super();
    
    this.config = {
      enableRateLimit: true,
      enableBotDetection: true,
      enableSpamDetection: true,
      enableDDoSProtection: true,
      enableInjectionProtection: true,
      maxFailedLogins: 5,
      loginLockoutDuration: 900000, // 15 minutes
      suspiciousActivityThreshold: 10,
      autoBlockEnabled: true,
      geoBlockingEnabled: false,
      blockedCountries: [],
      ...config
    };

    this.initializeDefaultRules();
    this.startCleanupTimer();
  }

  /**
   * Initialize default rate limit rules
   */
  private initializeDefaultRules(): void {
    const defaultRules: RateLimitRule[] = [
      {
        id: 'auth-login',
        name: 'Authentication Login',
        endpoint: '/auth/login',
        method: 'POST',
        windowMs: 900000, // 15 minutes
        maxRequests: 5,
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
        keyGenerator: 'ip',
        enabled: true
      },
      {
        id: 'auth-register',
        name: 'Authentication Register',
        endpoint: '/auth/register',
        method: 'POST',
        windowMs: 3600000, // 1 hour
        maxRequests: 3,
        skipSuccessfulRequests: true,
        skipFailedRequests: false,
        keyGenerator: 'ip',
        enabled: true
      },
      {
        id: 'api-general',
        name: 'General API',
        endpoint: '/api/*',
        method: '*',
        windowMs: 900000, // 15 minutes
        maxRequests: 1000,
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
        keyGenerator: 'combined',
        enabled: true
      }
    ];

    defaultRules.forEach(rule => {
      this.rateLimitRules.set(rule.id, rule);
    });

    logger.info(`AbusePreventionService: Initialized ${defaultRules.length} default rate limit rules`);
  }  /
**
   * Check if request should be blocked
   */
  async checkRequest(request: {
    ip: string;
    userId?: string;
    userAgent: string;
    endpoint: string;
    method: string;
    body?: any;
    headers?: { [key: string]: string };
  }): Promise<{ allowed: boolean; reason?: string; blockDuration?: number }> {
    try {
      // Check if IP is blocked
      const ipBlocked = this.isBlocked('ip', request.ip);
      if (ipBlocked.blocked) {
        return { allowed: false, reason: ipBlocked.reason, blockDuration: ipBlocked.duration };
      }

      // Check if user is blocked
      if (request.userId) {
        const userBlocked = this.isBlocked('user', request.userId);
        if (userBlocked.blocked) {
          return { allowed: false, reason: userBlocked.reason, blockDuration: userBlocked.duration };
        }
      }

      // Check rate limits
      if (this.config.enableRateLimit) {
        const rateLimitCheck = this.checkRateLimit(request);
        if (!rateLimitCheck.allowed) {
          this.recordSuspiciousActivity({
            userId: request.userId,
            ipAddress: request.ip,
            userAgent: request.userAgent,
            activityType: 'rate_limit_exceeded',
            severity: 'medium',
            description: `Rate limit exceeded for ${request.endpoint}`,
            metadata: { endpoint: request.endpoint, method: request.method }
          });
          return rateLimitCheck;
        }
      }

      // Check for bot behavior
      if (this.config.enableBotDetection) {
        const botCheck = this.detectBotBehavior(request);
        if (!botCheck.allowed) {
          return botCheck;
        }
      }

      // Check for spam
      if (this.config.enableSpamDetection && request.body) {
        const spamCheck = this.detectSpam(request);
        if (!spamCheck.allowed) {
          return spamCheck;
        }
      }

      // Check for injection attempts
      if (this.config.enableInjectionProtection) {
        const injectionCheck = this.detectInjectionAttempts(request);
        if (!injectionCheck.allowed) {
          return injectionCheck;
        }
      }

      // Check for DDoS patterns
      if (this.config.enableDDoSProtection) {
        const ddosCheck = this.detectDDoSPatterns(request);
        if (!ddosCheck.allowed) {
          return ddosCheck;
        }
      }

      return { allowed: true };

    } catch (error) {
      logger.error('AbusePreventionService: Request check error:', error);
      return { allowed: true }; // Fail open to avoid blocking legitimate requests
    }
  }

  /**
   * Check if entity is blocked
   */
  private isBlocked(type: string, value: string): { blocked: boolean; reason?: string; duration?: number } {
    const blockKey = `${type}:${value}`;
    const blockedEntity = this.blockedEntities.get(blockKey);

    if (!blockedEntity) {
      return { blocked: false };
    }

    // Check if block has expired
    if (blockedEntity.expiresAt && blockedEntity.expiresAt < new Date()) {
      this.blockedEntities.delete(blockKey);
      logger.info(`AbusePreventionService: Block expired for ${type}: ${value}`);
      return { blocked: false };
    }

    const duration = blockedEntity.expiresAt 
      ? blockedEntity.expiresAt.getTime() - Date.now()
      : undefined;

    return {
      blocked: true,
      reason: blockedEntity.reason,
      duration
    };
  }

  /**
   * Check rate limits
   */
  private checkRateLimit(request: {
    ip: string;
    userId?: string;
    endpoint: string;
    method: string;
  }): { allowed: boolean; reason?: string; resetTime?: number } {
    // Find matching rate limit rule
    const rule = this.findMatchingRule(request.endpoint, request.method);
    if (!rule || !rule.enabled) {
      return { allowed: true };
    }

    // Generate key based on rule configuration
    let key: string;
    switch (rule.keyGenerator) {
      case 'ip':
        key = `rate_limit:${rule.id}:${request.ip}`;
        break;
      case 'user':
        key = `rate_limit:${rule.id}:${request.userId || 'anonymous'}`;
        break;
      case 'combined':
        key = `rate_limit:${rule.id}:${request.ip}:${request.userId || 'anonymous'}`;
        break;
      default:
        key = `rate_limit:${rule.id}:${request.ip}`;
    }

    const now = Date.now();
    const windowStart = now - rule.windowMs;
    
    let requestCount = this.requestCounts.get(key);
    
    // Reset if window has passed
    if (!requestCount || requestCount.resetTime < windowStart) {
      requestCount = { count: 0, resetTime: now + rule.windowMs };
      this.requestCounts.set(key, requestCount);
    }

    // Check if limit exceeded
    if (requestCount.count >= rule.maxRequests) {
      return {
        allowed: false,
        reason: `Rate limit exceeded: ${rule.maxRequests} requests per ${rule.windowMs}ms`,
        resetTime: requestCount.resetTime
      };
    }

    // Increment counter
    requestCount.count++;
    
    return { allowed: true };
  }

  /**
   * Find matching rate limit rule
   */
  private findMatchingRule(endpoint: string, method: string): RateLimitRule | null {
    for (const rule of this.rateLimitRules.values()) {
      if (this.matchesPattern(endpoint, rule.endpoint) && 
          (rule.method === '*' || rule.method === method)) {
        return rule;
      }
    }
    return null;
  }

  /**
   * Check if endpoint matches pattern
   */
  private matchesPattern(endpoint: string, pattern: string): boolean {
    if (pattern === '*') return true;
    if (pattern.endsWith('/*')) {
      const prefix = pattern.slice(0, -2);
      return endpoint.startsWith(prefix);
    }
    return endpoint === pattern;
  }

  /**
   * Detect bot behavior
   */
  private detectBotBehavior(request: {
    userAgent: string;
    ip: string;
    userId?: string;
  }): { allowed: boolean; reason?: string } {
    const userAgent = request.userAgent.toLowerCase();
    
    // Check for common bot user agents
    const botPatterns = [
      'bot', 'crawler', 'spider', 'scraper', 'curl', 'wget', 'python-requests',
      'scrapy', 'selenium', 'phantomjs', 'headless', 'automated'
    ];

    const isSuspiciousUserAgent = botPatterns.some(pattern => userAgent.includes(pattern));
    
    if (isSuspiciousUserAgent) {
      this.recordSuspiciousActivity({
        userId: request.userId,
        ipAddress: request.ip,
        userAgent: request.userAgent,
        activityType: 'bot_behavior',
        severity: 'medium',
        description: 'Suspicious user agent detected',
        metadata: { userAgent: request.userAgent, patterns: botPatterns.filter(p => userAgent.includes(p)) }
      });

      return {
        allowed: false,
        reason: 'Automated requests are not allowed'
      };
    }

    // Check for missing or suspicious user agent
    if (!request.userAgent || request.userAgent.length < 10) {
      this.recordSuspiciousActivity({
        userId: request.userId,
        ipAddress: request.ip,
        userAgent: request.userAgent,
        activityType: 'bot_behavior',
        severity: 'low',
        description: 'Missing or suspicious user agent',
        metadata: { userAgent: request.userAgent }
      });

      return {
        allowed: false,
        reason: 'Invalid user agent'
      };
    }

    return { allowed: true };
  }

  /**
   * Detect spam content
   */
  private detectSpam(request: {
    body: any;
    ip: string;
    userId?: string;
    userAgent: string;
  }): { allowed: boolean; reason?: string } {
    const content = JSON.stringify(request.body).toLowerCase();
    
    // Spam keywords
    const spamKeywords = [
      'viagra', 'cialis', 'casino', 'lottery', 'winner', 'congratulations',
      'click here', 'free money', 'make money fast', 'work from home',
      'weight loss', 'diet pills', 'crypto', 'bitcoin', 'investment opportunity'
    ];

    const spamCount = spamKeywords.filter(keyword => content.includes(keyword)).length;
    
    if (spamCount >= 3) {
      this.recordSuspiciousActivity({
        userId: request.userId,
        ipAddress: request.ip,
        userAgent: request.userAgent,
        activityType: 'spam_detected',
        severity: 'high',
        description: 'Spam content detected',
        metadata: { spamKeywords: spamKeywords.filter(k => content.includes(k)), spamCount }
      });

      return {
        allowed: false,
        reason: 'Spam content detected'
      };
    }

    // Check for excessive repetition
    const words = content.split(/\s+/);
    const wordCount = new Map<string, number>();
    
    words.forEach(word => {
      if (word.length > 3) {
        wordCount.set(word, (wordCount.get(word) || 0) + 1);
      }
    });

    const maxRepetition = Math.max(...Array.from(wordCount.values()));
    if (maxRepetition > 10) {
      this.recordSuspiciousActivity({
        userId: request.userId,
        ipAddress: request.ip,
        userAgent: request.userAgent,
        activityType: 'spam_detected',
        severity: 'medium',
        description: 'Excessive word repetition detected',
        metadata: { maxRepetition, totalWords: words.length }
      });

      return {
        allowed: false,
        reason: 'Spam-like content detected'
      };
    }

    return { allowed: true };
  }

  /**
   * Detect injection attempts
   */
  private detectInjectionAttempts(request: {
    body?: any;
    ip: string;
    userId?: string;
    userAgent: string;
    headers?: { [key: string]: string };
  }): { allowed: boolean; reason?: string } {
    const content = JSON.stringify({
      body: request.body,
      headers: request.headers
    }).toLowerCase();

    // SQL injection patterns
    const sqlPatterns = [
      'union select', 'drop table', 'delete from', 'insert into',
      'update set', 'exec(', 'execute(', 'sp_', 'xp_',
      "' or '1'='1", '" or "1"="1', '1=1--', '1=1#'
    ];

    // XSS patterns
    const xssPatterns = [
      '<script', '</script>', 'javascript:', 'onload=', 'onerror=',
      'onclick=', 'onmouseover=', 'alert(', 'document.cookie',
      'eval(', 'expression('
    ];

    // Command injection patterns
    const cmdPatterns = [
      '$(', '`', '&&', '||', ';cat', ';ls', ';pwd',
      '/etc/passwd', '/bin/sh', 'cmd.exe', 'powershell'
    ];

    const allPatterns = [...sqlPatterns, ...xssPatterns, ...cmdPatterns];
    const detectedPatterns = allPatterns.filter(pattern => content.includes(pattern));

    if (detectedPatterns.length > 0) {
      this.recordSuspiciousActivity({
        userId: request.userId,
        ipAddress: request.ip,
        userAgent: request.userAgent,
        activityType: 'injection_attempt',
        severity: 'critical',
        description: 'Injection attempt detected',
        metadata: { detectedPatterns, contentLength: content.length }
      });

      // Auto-block for injection attempts
      if (this.config.autoBlockEnabled) {
        this.blockEntity({
          type: 'ip',
          value: request.ip,
          reason: 'Injection attempt detected',
          severity: 'temporary',
          duration: 3600000, // 1 hour
          blockedBy: 'system'
        });
      }

      return {
        allowed: false,
        reason: 'Malicious content detected'
      };
    }

    return { allowed: true };
  }

  /**
   * Detect DDoS patterns
   */
  private detectDDoSPatterns(request: {
    ip: string;
    userId?: string;
    userAgent: string;
  }): { allowed: boolean; reason?: string } {
    const now = Date.now();
    const windowMs = 60000; // 1 minute window
    const maxRequestsPerMinute = 100;

    const key = `ddos_check:${request.ip}`;
    let requestCount = this.requestCounts.get(key);

    if (!requestCount || requestCount.resetTime < now - windowMs) {
      requestCount = { count: 1, resetTime: now + windowMs };
      this.requestCounts.set(key, requestCount);
      return { allowed: true };
    }

    requestCount.count++;

    if (requestCount.count > maxRequestsPerMinute) {
      this.recordSuspiciousActivity({
        userId: request.userId,
        ipAddress: request.ip,
        userAgent: request.userAgent,
        activityType: 'ddos_attempt',
        severity: 'critical',
        description: 'Potential DDoS attack detected',
        metadata: { requestsPerMinute: requestCount.count, threshold: maxRequestsPerMinute }
      });

      // Auto-block for DDoS attempts
      if (this.config.autoBlockEnabled) {
        this.blockEntity({
          type: 'ip',
          value: request.ip,
          reason: 'DDoS attack detected',
          severity: 'temporary',
          duration: 1800000, // 30 minutes
          blockedBy: 'system'
        });
      }

      return {
        allowed: false,
        reason: 'Too many requests detected'
      };
    }

    return { allowed: true };
  }

  /**
   * Record suspicious activity
   */
  private recordSuspiciousActivity(activity: Omit<SuspiciousActivity, 'id' | 'timestamp' | 'resolved'>): void {
    const suspiciousActivity: SuspiciousActivity = {
      id: this.generateActivityId(),
      timestamp: new Date(),
      resolved: false,
      ...activity
    };

    this.suspiciousActivities.set(suspiciousActivity.id, suspiciousActivity);

    logger.warn(`AbusePreventionService: Suspicious activity detected - ${activity.activityType}`, {
      ip: activity.ipAddress,
      userId: activity.userId,
      severity: activity.severity,
      description: activity.description
    });

    this.emit('suspiciousActivity', suspiciousActivity);

    // Auto-block if threshold exceeded
    if (this.config.autoBlockEnabled && this.shouldAutoBlock(activity)) {
      this.autoBlock(activity);
    }
  }

  /**
   * Check if should auto-block based on activity
   */
  private shouldAutoBlock(activity: SuspiciousActivity): boolean {
    const recentActivities = Array.from(this.suspiciousActivities.values())
      .filter(a => 
        a.ipAddress === activity.ipAddress &&
        Date.now() - a.timestamp.getTime() < 3600000 // Last hour
      );

    return recentActivities.length >= this.config.suspiciousActivityThreshold;
  }

  /**
   * Auto-block entity based on suspicious activity
   */
  private autoBlock(activity: SuspiciousActivity): void {
    const duration = this.getBlockDuration(activity.severity);
    
    this.blockEntity({
      type: 'ip',
      value: activity.ipAddress,
      reason: `Auto-blocked due to suspicious activity: ${activity.activityType}`,
      severity: 'temporary',
      duration,
      blockedBy: 'system',
      metadata: { activityId: activity.id, activityType: activity.activityType }
    });
  }

  /**
   * Get block duration based on severity
   */
  private getBlockDuration(severity: string): number {
    switch (severity) {
      case 'low': return 300000; // 5 minutes
      case 'medium': return 900000; // 15 minutes
      case 'high': return 3600000; // 1 hour
      case 'critical': return 86400000; // 24 hours
      default: return 900000; // 15 minutes
    }
  }  /
**
   * Block an entity
   */
  blockEntity(block: {
    type: 'ip' | 'user' | 'user_agent' | 'country';
    value: string;
    reason: string;
    severity: 'temporary' | 'permanent';
    duration?: number;
    blockedBy: string;
    metadata?: { [key: string]: any };
  }): void {
    const blockKey = `${block.type}:${block.value}`;
    const expiresAt = block.severity === 'permanent' || !block.duration 
      ? undefined 
      : new Date(Date.now() + block.duration);

    const blockedEntity: BlockedEntity = {
      id: this.generateBlockId(),
      type: block.type,
      value: block.value,
      reason: block.reason,
      severity: block.severity,
      blockedAt: new Date(),
      expiresAt,
      blockedBy: block.blockedBy,
      metadata: block.metadata
    };

    this.blockedEntities.set(blockKey, blockedEntity);

    logger.warn(`AbusePreventionService: Blocked ${block.type}: ${block.value}`, {
      reason: block.reason,
      severity: block.severity,
      duration: block.duration,
      blockedBy: block.blockedBy
    });

    this.emit('entityBlocked', blockedEntity);
  }

  /**
   * Unblock an entity
   */
  unblockEntity(type: string, value: string, unblockedBy: string): boolean {
    const blockKey = `${type}:${value}`;
    const blockedEntity = this.blockedEntities.get(blockKey);

    if (!blockedEntity) {
      return false;
    }

    this.blockedEntities.delete(blockKey);

    logger.info(`AbusePreventionService: Unblocked ${type}: ${value} by ${unblockedBy}`);
    this.emit('entityUnblocked', { ...blockedEntity, unblockedBy, unblockedAt: new Date() });

    return true;
  }

  /**
   * Record failed login attempt
   */
  recordFailedLogin(identifier: string): { locked: boolean; lockDuration?: number } {
    const now = new Date();
    let attempts = this.failedLoginAttempts.get(identifier);

    if (!attempts) {
      attempts = { count: 1, lastAttempt: now };
    } else {
      // Reset counter if last attempt was more than lockout duration ago
      if (now.getTime() - attempts.lastAttempt.getTime() > this.config.loginLockoutDuration) {
        attempts = { count: 1, lastAttempt: now };
      } else {
        attempts.count++;
        attempts.lastAttempt = now;
      }
    }

    this.failedLoginAttempts.set(identifier, attempts);

    if (attempts.count >= this.config.maxFailedLogins) {
      // Auto-block for excessive failed logins
      if (this.config.autoBlockEnabled) {
        this.blockEntity({
          type: 'ip',
          value: identifier,
          reason: 'Excessive failed login attempts',
          severity: 'temporary',
          duration: this.config.loginLockoutDuration,
          blockedBy: 'system'
        });
      }

      return { locked: true, lockDuration: this.config.loginLockoutDuration };
    }

    return { locked: false };
  }

  /**
   * Clear failed login attempts
   */
  clearFailedLogins(identifier: string): void {
    this.failedLoginAttempts.delete(identifier);
  }

  /**
   * Add rate limit rule
   */
  addRateLimitRule(rule: RateLimitRule): void {
    this.rateLimitRules.set(rule.id, rule);
    logger.info(`AbusePreventionService: Added rate limit rule ${rule.id}: ${rule.name}`);
    this.emit('rateLimitRuleAdded', rule);
  }

  /**
   * Remove rate limit rule
   */
  removeRateLimitRule(ruleId: string): boolean {
    const removed = this.rateLimitRules.delete(ruleId);
    if (removed) {
      logger.info(`AbusePreventionService: Removed rate limit rule ${ruleId}`);
      this.emit('rateLimitRuleRemoved', ruleId);
    }
    return removed;
  }

  /**
   * Get suspicious activities
   */
  getSuspiciousActivities(limit: number = 100, filters?: {
    activityType?: string;
    severity?: string;
    ipAddress?: string;
    userId?: string;
    resolved?: boolean;
    startDate?: Date;
    endDate?: Date;
  }): SuspiciousActivity[] {
    let activities = Array.from(this.suspiciousActivities.values());

    if (filters) {
      activities = activities.filter(activity => {
        if (filters.activityType && activity.activityType !== filters.activityType) return false;
        if (filters.severity && activity.severity !== filters.severity) return false;
        if (filters.ipAddress && activity.ipAddress !== filters.ipAddress) return false;
        if (filters.userId && activity.userId !== filters.userId) return false;
        if (filters.resolved !== undefined && activity.resolved !== filters.resolved) return false;
        if (filters.startDate && activity.timestamp < filters.startDate) return false;
        if (filters.endDate && activity.timestamp > filters.endDate) return false;
        return true;
      });
    }

    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get blocked entities
   */
  getBlockedEntities(limit: number = 100, filters?: {
    type?: string;
    severity?: string;
    blockedBy?: string;
    active?: boolean;
  }): BlockedEntity[] {
    let entities = Array.from(this.blockedEntities.values());

    if (filters) {
      entities = entities.filter(entity => {
        if (filters.type && entity.type !== filters.type) return false;
        if (filters.severity && entity.severity !== filters.severity) return false;
        if (filters.blockedBy && entity.blockedBy !== filters.blockedBy) return false;
        if (filters.active !== undefined) {
          const isActive = !entity.expiresAt || entity.expiresAt > new Date();
          if (filters.active !== isActive) return false;
        }
        return true;
      });
    }

    return entities
      .sort((a, b) => b.blockedAt.getTime() - a.blockedAt.getTime())
      .slice(0, limit);
  }

  /**
   * Get rate limit rules
   */
  getRateLimitRules(): RateLimitRule[] {
    return Array.from(this.rateLimitRules.values());
  }

  /**
   * Resolve suspicious activity
   */
  resolveSuspiciousActivity(activityId: string, resolvedBy: string): boolean {
    const activity = this.suspiciousActivities.get(activityId);
    if (!activity || activity.resolved) {
      return false;
    }

    activity.resolved = true;
    activity.resolvedAt = new Date();
    activity.resolvedBy = resolvedBy;

    logger.info(`AbusePreventionService: Suspicious activity resolved by ${resolvedBy} - ${activity.activityType}`);
    this.emit('suspiciousActivityResolved', activity);

    return true;
  }

  /**
   * Get abuse prevention statistics
   */
  getStats(): any {
    const now = Date.now();
    const oneDayAgo = now - 86400000;
    const oneHourAgo = now - 3600000;

    const recentActivities = Array.from(this.suspiciousActivities.values())
      .filter(activity => activity.timestamp.getTime() > oneDayAgo);

    const activeBlocks = Array.from(this.blockedEntities.values())
      .filter(entity => !entity.expiresAt || entity.expiresAt > new Date());

    return {
      suspiciousActivities: {
        total: this.suspiciousActivities.size,
        last24h: recentActivities.length,
        last1h: Array.from(this.suspiciousActivities.values())
          .filter(activity => activity.timestamp.getTime() > oneHourAgo).length,
        byType: this.groupBy(recentActivities, 'activityType'),
        bySeverity: this.groupBy(recentActivities, 'severity'),
        resolved: recentActivities.filter(a => a.resolved).length
      },
      blockedEntities: {
        total: this.blockedEntities.size,
        active: activeBlocks.length,
        byType: this.groupBy(activeBlocks, 'type'),
        bySeverity: this.groupBy(activeBlocks, 'severity'),
        autoBlocked: activeBlocks.filter(e => e.blockedBy === 'system').length
      },
      rateLimitRules: {
        total: this.rateLimitRules.size,
        enabled: Array.from(this.rateLimitRules.values()).filter(r => r.enabled).length
      },
      failedLogins: this.failedLoginAttempts.size,
      config: {
        enableRateLimit: this.config.enableRateLimit,
        enableBotDetection: this.config.enableBotDetection,
        enableSpamDetection: this.config.enableSpamDetection,
        enableDDoSProtection: this.config.enableDDoSProtection,
        enableInjectionProtection: this.config.enableInjectionProtection,
        autoBlockEnabled: this.config.autoBlockEnabled
      }
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AbusePreventionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('AbusePreventionService: Configuration updated');
    this.emit('configUpdated', this.config);
  }

  /**
   * Export blocked entities for backup
   */
  exportBlockedEntities(): string {
    const entities = Array.from(this.blockedEntities.values());
    return JSON.stringify(entities, null, 2);
  }

  /**
   * Import blocked entities from backup
   */
  importBlockedEntities(data: string): { imported: number; errors: number } {
    try {
      const entities: BlockedEntity[] = JSON.parse(data);
      let imported = 0;
      let errors = 0;

      entities.forEach(entity => {
        try {
          const blockKey = `${entity.type}:${entity.value}`;
          this.blockedEntities.set(blockKey, entity);
          imported++;
        } catch (error) {
          errors++;
          logger.error('AbusePreventionService: Error importing blocked entity:', error);
        }
      });

      logger.info(`AbusePreventionService: Imported ${imported} blocked entities with ${errors} errors`);
      return { imported, errors };

    } catch (error) {
      logger.error('AbusePreventionService: Error parsing import data:', error);
      return { imported: 0, errors: 1 };
    }
  }

  private groupBy(array: any[], key: string): { [key: string]: number } {
    return array.reduce((groups, item) => {
      const group = item[key] || 'unknown';
      groups[group] = (groups[group] || 0) + 1;
      return groups;
    }, {});
  }

  private generateActivityId(): string {
    return `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateBlockId(): string {
    return `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, 3600000); // Cleanup every hour
  }

  private cleanup(): void {
    const now = new Date();
    let cleanedActivities = 0;
    let cleanedBlocks = 0;
    let cleanedRequests = 0;
    let cleanedLogins = 0;

    // Clean old suspicious activities (keep last 10000)
    if (this.suspiciousActivities.size > 10000) {
      const activities = Array.from(this.suspiciousActivities.entries())
        .sort(([, a], [, b]) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 10000);
      
      this.suspiciousActivities.clear();
      activities.forEach(([id, activity]) => {
        this.suspiciousActivities.set(id, activity);
      });
      
      cleanedActivities = this.suspiciousActivities.size - 10000;
    }

    // Clean expired blocks
    for (const [key, entity] of this.blockedEntities.entries()) {
      if (entity.expiresAt && entity.expiresAt < now) {
        this.blockedEntities.delete(key);
        cleanedBlocks++;
      }
    }

    // Clean old request counts
    for (const [key, count] of this.requestCounts.entries()) {
      if (count.resetTime < now.getTime()) {
        this.requestCounts.delete(key);
        cleanedRequests++;
      }
    }

    // Clean old failed login attempts
    for (const [key, attempts] of this.failedLoginAttempts.entries()) {
      if (now.getTime() - attempts.lastAttempt.getTime() > this.config.loginLockoutDuration * 2) {
        this.failedLoginAttempts.delete(key);
        cleanedLogins++;
      }
    }

    if (cleanedActivities > 0 || cleanedBlocks > 0 || cleanedRequests > 0 || cleanedLogins > 0) {
      logger.info(`AbusePreventionService: Cleanup completed - Activities: ${cleanedActivities}, Blocks: ${cleanedBlocks}, Requests: ${cleanedRequests}, Logins: ${cleanedLogins}`);
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

    this.suspiciousActivities.clear();
    this.blockedEntities.clear();
    this.rateLimitRules.clear();
    this.requestCounts.clear();
    this.failedLoginAttempts.clear();

    logger.info('AbusePreventionService: Destroyed');
  }
}

// Export singleton instance
export const abusePreventionService = new AbusePreventionService();
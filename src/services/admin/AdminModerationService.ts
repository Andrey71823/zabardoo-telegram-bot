import { BaseService } from '../base/BaseService';

interface ModerationRule {
  id: string;
  name: string;
  type: 'spam' | 'profanity' | 'url' | 'keyword' | 'rate_limit' | 'custom';
  pattern?: string | RegExp;
  keywords?: string[];
  action: 'warn' | 'mute' | 'ban' | 'delete' | 'flag';
  severity: 'low' | 'medium' | 'high' | 'critical';
  isActive: boolean;
  autoApply: boolean;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ModerationAction {
  id: string;
  userId: string;
  moderatorId: string;
  action: 'warn' | 'mute' | 'ban' | 'unban' | 'delete_message' | 'flag_user';
  reason: string;
  duration?: number; // minutes
  evidence?: {
    messageId?: string;
    messageContent?: string;
    ruleViolated?: string;
    screenshots?: string[];
  };
  timestamp: Date;
  isActive: boolean;
  appealable: boolean;
}

interface UserViolation {
  id: string;
  userId: string;
  ruleId: string;
  violationType: string;
  content: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  autoDetected: boolean;
  moderatorReviewed: boolean;
  timestamp: Date;
  resolved: boolean;
  resolution?: string;
}

interface UserModerationStatus {
  userId: string;
  status: 'active' | 'warned' | 'muted' | 'banned' | 'flagged';
  warningCount: number;
  muteCount: number;
  banCount: number;
  totalViolations: number;
  riskScore: number; // 0-100
  lastViolation?: Date;
  activePenalties: ModerationAction[];
  trustLevel: 'new' | 'trusted' | 'verified' | 'suspicious' | 'blacklisted';
}

interface ModerationStats {
  totalActions: number;
  actionsByType: Record<string, number>;
  violationsByRule: Record<string, number>;
  autoDetectionRate: number;
  appealRate: number;
  falsePositiveRate: number;
  averageResponseTime: number;
  activeUsers: number;
  bannedUsers: number;
  flaggedUsers: number;
}

interface AdminUser {
  id: string;
  userId: string;
  role: 'super_admin' | 'admin' | 'moderator' | 'support';
  permissions: string[];
  isActive: boolean;
  lastActive: Date;
  actionsPerformed: number;
  createdAt: Date;
}

export class AdminModerationService extends BaseService {
  private moderationRules: Map<string, ModerationRule> = new Map();
  private moderationActions: Map<string, ModerationAction> = new Map();
  private userViolations: Map<string, UserViolation[]> = new Map();
  private userStatuses: Map<string, UserModerationStatus> = new Map();
  private adminUsers: Map<string, AdminUser> = new Map();
  private bannedWords: Set<string> = new Set();
  private whitelistedUsers: Set<string> = new Set();

  constructor() {
    super();
    this.initializeDefaultRules();
    this.initializeBannedWords();
  }

  private initializeDefaultRules(): void {
    const defaultRules: ModerationRule[] = [
      {
        id: 'spam_detection',
        name: 'Spam Detection',
        type: 'spam',
        pattern: /(.)\1{4,}|(.{1,10})\2{3,}/gi, // Repeated characters or patterns
        action: 'warn',
        severity: 'medium',
        isActive: true,
        autoApply: true,
        description: 'Detects spam messages with repeated characters or patterns',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'profanity_filter',
        name: 'Profanity Filter',
        type: 'profanity',
        keywords: ['fuck', 'shit', 'bitch', 'asshole', 'damn', 'bastard', 'chutiya', 'madarchod', 'bhenchod'],
        action: 'delete',
        severity: 'high',
        isActive: true,
        autoApply: true,
        description: 'Filters profanity and offensive language',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'url_blocker',
        name: 'Unauthorized URL Blocker',
        type: 'url',
        pattern: /https?:\/\/(?!(?:zabardoo\.com|telegram\.me|t\.me))[^\s]+/gi,
        action: 'delete',
        severity: 'medium',
        isActive: true,
        autoApply: true,
        description: 'Blocks unauthorized external URLs',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'rate_limit',
        name: 'Message Rate Limiting',
        type: 'rate_limit',
        action: 'mute',
        severity: 'low',
        isActive: true,
        autoApply: true,
        description: 'Prevents message flooding (max 10 messages per minute)',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'scam_keywords',
        name: 'Scam Keywords Detection',
        type: 'keyword',
        keywords: ['free money', 'get rich quick', 'guaranteed profit', 'investment opportunity', 'click here to win'],
        action: 'flag',
        severity: 'critical',
        isActive: true,
        autoApply: false, // Requires manual review
        description: 'Detects potential scam messages',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    defaultRules.forEach(rule => {
      this.moderationRules.set(rule.id, rule);
    });
  }

  private initializeBannedWords(): void {
    const bannedWords = [
      // English profanity
      'fuck', 'shit', 'bitch', 'asshole', 'damn', 'bastard', 'cunt', 'whore',
      // Hindi/Urdu profanity
      'chutiya', 'madarchod', 'bhenchod', 'randi', 'harami', 'kamina', 'saala',
      // Scam-related terms
      'free money', 'get rich quick', 'guaranteed profit', 'investment scam',
      // Spam indicators
      'click here', 'limited time', 'act now', 'urgent'
    ];

    bannedWords.forEach(word => this.bannedWords.add(word.toLowerCase()));
  }

  // Content moderation methods
  async moderateMessage(userId: string, messageContent: string, messageId: string, chatId: string): Promise<{
    allowed: boolean;
    action?: string;
    reason?: string;
    ruleViolated?: string;
  }> {
    // Check if user is whitelisted
    if (this.whitelistedUsers.has(userId)) {
      return { allowed: true };
    }

    // Check if user is banned
    const userStatus = this.getUserModerationStatus(userId);
    if (userStatus.isBanned) {
      return {
        allowed: false,
        action: 'delete',
        reason: 'User is banned',
        ruleViolated: 'user_banned'
      };
    }

    // Check if user is muted
    if (userStatus.isMuted) {
      return {
        allowed: false,
        action: 'delete',
        reason: 'User is muted',
        ruleViolated: 'user_muted'
      };
    }

    // Check rate limiting
    const rateLimitResult = await this.checkRateLimit(userId);
    if (!rateLimitResult.allowed) {
      await this.applyModerationAction({
        userId,
        action: 'mute',
        reason: 'Rate limit exceeded',
        duration: 5, // 5 minutes
        ruleId: 'rate_limit'
      });
      return {
        allowed: false,
        action: 'mute',
        reason: 'Too many messages sent',
        ruleViolated: 'rate_limit'
      };
    }

    // Check against moderation rules
    for (const rule of this.moderationRules.values()) {
      if (!rule.isActive) continue;

      const violation = this.checkRule(messageContent, rule);
      if (violation.violated) {
        // Record violation
        await this.recordViolation({
          userId,
          ruleId: rule.id,
          content: messageContent,
          severity: rule.severity,
          autoDetected: true
        });

        // Apply action if auto-apply is enabled
        if (rule.autoApply) {
          await this.applyModerationAction({
            userId,
            action: rule.action,
            reason: `Violated rule: ${rule.name}`,
            ruleId: rule.id,
            evidence: {
              messageId,
              messageContent,
              ruleViolated: rule.id
            }
          });

          return {
            allowed: false,
            action: rule.action,
            reason: violation.reason,
            ruleViolated: rule.id
          };
        } else {
          // Flag for manual review
          await this.flagForReview(userId, messageContent, rule.id, messageId);
          return {
            allowed: true, // Allow but flag
            action: 'flag',
            reason: `Flagged for review: ${rule.name}`,
            ruleViolated: rule.id
          };
        }
      }
    }

    return { allowed: true };
  }

  private checkRule(content: string, rule: ModerationRule): { violated: boolean; reason?: string } {
    const lowerContent = content.toLowerCase();

    switch (rule.type) {
      case 'spam':
        if (rule.pattern && rule.pattern instanceof RegExp) {
          if (rule.pattern.test(content)) {
            return { violated: true, reason: 'Spam pattern detected' };
          }
        }
        break;

      case 'profanity':
        if (rule.keywords) {
          for (const keyword of rule.keywords) {
            if (lowerContent.includes(keyword.toLowerCase())) {
              return { violated: true, reason: `Profanity detected: ${keyword}` };
            }
          }
        }
        break;

      case 'url':
        if (rule.pattern && rule.pattern instanceof RegExp) {
          if (rule.pattern.test(content)) {
            return { violated: true, reason: 'Unauthorized URL detected' };
          }
        }
        break;

      case 'keyword':
        if (rule.keywords) {
          for (const keyword of rule.keywords) {
            if (lowerContent.includes(keyword.toLowerCase())) {
              return { violated: true, reason: `Suspicious keyword detected: ${keyword}` };
            }
          }
        }
        break;

      case 'custom':
        if (rule.pattern) {
          const pattern = typeof rule.pattern === 'string' ? new RegExp(rule.pattern, 'gi') : rule.pattern;
          if (pattern.test(content)) {
            return { violated: true, reason: 'Custom rule violation' };
          }
        }
        break;
    }

    return { violated: false };
  }

  private async checkRateLimit(userId: string): Promise<{ allowed: boolean; resetTime?: Date }> {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    
    // Get user's recent messages (this would typically come from a database)
    const recentMessages = this.getUserRecentMessages(userId, oneMinuteAgo);
    
    if (recentMessages.length >= 10) { // Max 10 messages per minute
      const resetTime = new Date(recentMessages[0].timestamp.getTime() + 60000);
      return { allowed: false, resetTime };
    }

    return { allowed: true };
  }

  private getUserRecentMessages(userId: string, since: Date): Array<{ timestamp: Date }> {
    // This would typically query a database
    // For now, return empty array as placeholder
    return [];
  }

  // User management methods
  private getUserModerationStatus(userId: string): UserModerationStatus & { isBanned: boolean; isMuted: boolean } {
    const status = this.userStatuses.get(userId) || {
      userId,
      status: 'active',
      warningCount: 0,
      muteCount: 0,
      banCount: 0,
      totalViolations: 0,
      riskScore: 0,
      activePenalties: [],
      trustLevel: 'new'
    };

    const now = new Date();
    const activeBan = status.activePenalties.find(p => p.action === 'ban' && p.isActive);
    const activeMute = status.activePenalties.find(p => p.action === 'mute' && p.isActive);

    // Check if ban/mute has expired
    const isBanned = activeBan ? (activeBan.duration ? 
      (now.getTime() - activeBan.timestamp.getTime()) < (activeBan.duration * 60000) : true) : false;
    
    const isMuted = activeMute ? (activeMute.duration ? 
      (now.getTime() - activeMute.timestamp.getTime()) < (activeMute.duration * 60000) : true) : false;

    return { ...status, isBanned, isMuted };
  }

  async applyModerationAction(params: {
    userId: string;
    action: string;
    reason: string;
    duration?: number;
    ruleId?: string;
    moderatorId?: string;
    evidence?: any;
  }): Promise<ModerationAction> {
    const action: ModerationAction = {
      id: this.generateActionId(),
      userId: params.userId,
      moderatorId: params.moderatorId || 'system',
      action: params.action as any,
      reason: params.reason,
      duration: params.duration,
      timestamp: new Date(),
      isActive: true,
      appealable: params.action !== 'delete_message',
      evidence: params.evidence
    };

    this.moderationActions.set(action.id, action);

    // Update user status
    const userStatus = this.getUserModerationStatus(params.userId);
    userStatus.activePenalties.push(action);

    switch (params.action) {
      case 'warn':
        userStatus.warningCount++;
        userStatus.status = 'warned';
        break;
      case 'mute':
        userStatus.muteCount++;
        userStatus.status = 'muted';
        break;
      case 'ban':
        userStatus.banCount++;
        userStatus.status = 'banned';
        break;
      case 'flag_user':
        userStatus.status = 'flagged';
        break;
    }

    // Update risk score
    userStatus.riskScore = this.calculateRiskScore(userStatus);
    userStatus.trustLevel = this.calculateTrustLevel(userStatus);

    this.userStatuses.set(params.userId, userStatus);

    return action;
  }

  private async recordViolation(params: {
    userId: string;
    ruleId: string;
    content: string;
    severity: string;
    autoDetected: boolean;
  }): Promise<UserViolation> {
    const violation: UserViolation = {
      id: this.generateViolationId(),
      userId: params.userId,
      ruleId: params.ruleId,
      violationType: this.moderationRules.get(params.ruleId)?.type || 'unknown',
      content: params.content,
      severity: params.severity as any,
      autoDetected: params.autoDetected,
      moderatorReviewed: false,
      timestamp: new Date(),
      resolved: false
    };

    const userViolations = this.userViolations.get(params.userId) || [];
    userViolations.push(violation);
    this.userViolations.set(params.userId, userViolations);

    // Update user status
    const userStatus = this.getUserModerationStatus(params.userId);
    userStatus.totalViolations++;
    userStatus.lastViolation = new Date();
    this.userStatuses.set(params.userId, userStatus);

    return violation;
  }

  private async flagForReview(userId: string, content: string, ruleId: string, messageId: string): Promise<void> {
    // This would typically create a review queue entry
    console.log(`Flagged for review: User ${userId}, Rule ${ruleId}, Message ${messageId}`);
  }

  private calculateRiskScore(status: UserModerationStatus): number {
    let score = 0;
    
    // Base score from violations
    score += status.totalViolations * 10;
    score += status.warningCount * 5;
    score += status.muteCount * 15;
    score += status.banCount * 30;

    // Recent activity penalty
    if (status.lastViolation) {
      const daysSinceLastViolation = (Date.now() - status.lastViolation.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLastViolation < 7) {
        score += 20;
      }
    }

    return Math.min(score, 100);
  }

  private calculateTrustLevel(status: UserModerationStatus): 'new' | 'trusted' | 'verified' | 'suspicious' | 'blacklisted' {
    if (status.riskScore >= 80) return 'blacklisted';
    if (status.riskScore >= 60) return 'suspicious';
    if (status.totalViolations === 0 && status.warningCount === 0) return 'trusted';
    if (status.banCount > 0) return 'suspicious';
    return 'new';
  }

  // Admin management methods
  async createAdmin(params: {
    userId: string;
    role: 'super_admin' | 'admin' | 'moderator' | 'support';
    permissions: string[];
  }): Promise<AdminUser> {
    const admin: AdminUser = {
      id: this.generateAdminId(),
      userId: params.userId,
      role: params.role,
      permissions: params.permissions,
      isActive: true,
      lastActive: new Date(),
      actionsPerformed: 0,
      createdAt: new Date()
    };

    this.adminUsers.set(admin.id, admin);
    return admin;
  }

  async getAdminPermissions(userId: string): Promise<string[]> {
    const admin = Array.from(this.adminUsers.values()).find(a => a.userId === userId);
    return admin?.permissions || [];
  }

  async hasPermission(userId: string, permission: string): Promise<boolean> {
    const permissions = await this.getAdminPermissions(userId);
    return permissions.includes(permission) || permissions.includes('*');
  }

  // Rule management methods
  async createModerationRule(rule: Omit<ModerationRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<ModerationRule> {
    const newRule: ModerationRule = {
      id: this.generateRuleId(),
      ...rule,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.moderationRules.set(newRule.id, newRule);
    return newRule;
  }

  async updateModerationRule(ruleId: string, updates: Partial<ModerationRule>): Promise<ModerationRule | null> {
    const rule = this.moderationRules.get(ruleId);
    if (!rule) return null;

    const updatedRule = {
      ...rule,
      ...updates,
      updatedAt: new Date()
    };

    this.moderationRules.set(ruleId, updatedRule);
    return updatedRule;
  }

  async deleteModerationRule(ruleId: string): Promise<boolean> {
    return this.moderationRules.delete(ruleId);
  }

  async getModerationRules(): Promise<ModerationRule[]> {
    return Array.from(this.moderationRules.values());
  }

  // Analytics and reporting methods
  async getModerationStats(period: 'day' | 'week' | 'month' = 'day'): Promise<ModerationStats> {
    const now = new Date();
    const periodStart = new Date();
    
    switch (period) {
      case 'day':
        periodStart.setDate(now.getDate() - 1);
        break;
      case 'week':
        periodStart.setDate(now.getDate() - 7);
        break;
      case 'month':
        periodStart.setMonth(now.getMonth() - 1);
        break;
    }

    const actions = Array.from(this.moderationActions.values())
      .filter(action => action.timestamp >= periodStart);

    const violations = Array.from(this.userViolations.values())
      .flat()
      .filter(violation => violation.timestamp >= periodStart);

    const actionsByType = actions.reduce((acc, action) => {
      acc[action.action] = (acc[action.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const violationsByRule = violations.reduce((acc, violation) => {
      acc[violation.ruleId] = (acc[violation.ruleId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const autoDetected = violations.filter(v => v.autoDetected).length;
    const autoDetectionRate = violations.length > 0 ? (autoDetected / violations.length) * 100 : 0;

    const userStatuses = Array.from(this.userStatuses.values());
    const bannedUsers = userStatuses.filter(s => s.status === 'banned').length;
    const flaggedUsers = userStatuses.filter(s => s.status === 'flagged').length;

    return {
      totalActions: actions.length,
      actionsByType,
      violationsByRule,
      autoDetectionRate,
      appealRate: 0, // Would calculate from appeals data
      falsePositiveRate: 0, // Would calculate from review data
      averageResponseTime: 0, // Would calculate from response times
      activeUsers: userStatuses.filter(s => s.status === 'active').length,
      bannedUsers,
      flaggedUsers
    };
  }

  async getUserViolationHistory(userId: string): Promise<UserViolation[]> {
    return this.userViolations.get(userId) || [];
  }

  async getUserModerationHistory(userId: string): Promise<ModerationAction[]> {
    return Array.from(this.moderationActions.values())
      .filter(action => action.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Utility methods
  async addToWhitelist(userId: string): Promise<void> {
    this.whitelistedUsers.add(userId);
  }

  async removeFromWhitelist(userId: string): Promise<void> {
    this.whitelistedUsers.delete(userId);
  }

  async isWhitelisted(userId: string): Promise<boolean> {
    return this.whitelistedUsers.has(userId);
  }

  async unbanUser(userId: string, moderatorId: string): Promise<void> {
    const userStatus = this.getUserModerationStatus(userId);
    
    // Deactivate active ban
    userStatus.activePenalties.forEach(penalty => {
      if (penalty.action === 'ban' && penalty.isActive) {
        penalty.isActive = false;
      }
    });

    userStatus.status = 'active';
    this.userStatuses.set(userId, userStatus);

    // Record unban action
    await this.applyModerationAction({
      userId,
      action: 'unban',
      reason: 'Manual unban by moderator',
      moderatorId
    });
  }

  async unmuteUser(userId: string, moderatorId: string): Promise<void> {
    const userStatus = this.getUserModerationStatus(userId);
    
    // Deactivate active mute
    userStatus.activePenalties.forEach(penalty => {
      if (penalty.action === 'mute' && penalty.isActive) {
        penalty.isActive = false;
      }
    });

    userStatus.status = 'active';
    this.userStatuses.set(userId, userStatus);
  }

  // ID generators
  private generateActionId(): string {
    return 'action_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private generateViolationId(): string {
    return 'violation_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private generateRuleId(): string {
    return 'rule_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private generateAdminId(): string {
    return 'admin_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Cleanup methods
  async cleanupExpiredActions(): Promise<void> {
    const now = new Date();
    
    for (const [actionId, action] of this.moderationActions.entries()) {
      if (action.duration && action.isActive) {
        const expiryTime = new Date(action.timestamp.getTime() + (action.duration * 60000));
        if (now > expiryTime) {
          action.isActive = false;
          
          // Update user status
          const userStatus = this.getUserModerationStatus(action.userId);
          if (action.action === 'mute') {
            userStatus.status = 'active';
          } else if (action.action === 'ban') {
            userStatus.status = 'active';
          }
          this.userStatuses.set(action.userId, userStatus);
        }
      }
    }
  }

  // Export/Import methods for backup
  async exportModerationData(): Promise<{
    rules: ModerationRule[];
    actions: ModerationAction[];
    violations: Record<string, UserViolation[]>;
    userStatuses: Record<string, UserModerationStatus>;
  }> {
    return {
      rules: Array.from(this.moderationRules.values()),
      actions: Array.from(this.moderationActions.values()),
      violations: Object.fromEntries(this.userViolations.entries()),
      userStatuses: Object.fromEntries(this.userStatuses.entries())
    };
  }

  async importModerationData(data: {
    rules?: ModerationRule[];
    actions?: ModerationAction[];
    violations?: Record<string, UserViolation[]>;
    userStatuses?: Record<string, UserModerationStatus>;
  }): Promise<void> {
    if (data.rules) {
      data.rules.forEach(rule => this.moderationRules.set(rule.id, rule));
    }
    
    if (data.actions) {
      data.actions.forEach(action => this.moderationActions.set(action.id, action));
    }
    
    if (data.violations) {
      Object.entries(data.violations).forEach(([userId, violations]) => {
        this.userViolations.set(userId, violations);
      });
    }
    
    if (data.userStatuses) {
      Object.entries(data.userStatuses).forEach(([userId, status]) => {
        this.userStatuses.set(userId, status);
      });
    }
  }
}
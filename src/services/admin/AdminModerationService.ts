import { EventEmitter } from 'events';
import { logger } from '../../config/logger';

export interface ModerationRule {
  id: string;
  name: string;
  type: 'spam' | 'profanity' | 'scam' | 'inappropriate' | 'custom';
  pattern: string | RegExp;
  action: 'warn' | 'mute' | 'ban' | 'delete';
  severity: 'low' | 'medium' | 'high' | 'critical';
  isActive: boolean;
  createdAt: Date;
}

export interface ModerationAction {
  id: string;
  userId: string;
  moderatorId: string;
  action: 'warn' | 'mute' | 'ban' | 'unban' | 'delete_message';
  reason: string;
  duration?: number; // in minutes
  messageId?: string;
  timestamp: Date;
  isAutomatic: boolean;
}

export interface UserTrustScore {
  userId: string;
  score: number; // 0-100
  violations: number;
  warnings: number;
  lastViolation: Date;
  trustLevel: 'untrusted' | 'low' | 'medium' | 'high' | 'verified';
  joinDate: Date;
}

export interface ContentAnalysis {
  messageId: string;
  userId: string;
  content: string;
  isSpam: boolean;
  isProfane: boolean;
  isScam: boolean;
  toxicityScore: number; // 0-1
  confidence: number; // 0-1
  flaggedRules: string[];
  timestamp: Date;
}

export class AdminModerationService extends EventEmitter {
  private moderationRules: Map<string, ModerationRule> = new Map();
  private userTrustScores: Map<string, UserTrustScore> = new Map();
  private moderationActions: Map<string, ModerationAction> = new Map();
  private bannedUsers: Set<string> = new Set();
  private mutedUsers: Map<string, Date> = new Map(); // userId -> unmute time

  constructor() {
    super();
    this.initializeDefaultRules();
    this.startCleanupTimer();
    logger.info('AdminModerationService initialized with automatic moderation');
  }

  private initializeDefaultRules(): void {
    const defaultRules: Omit<ModerationRule, 'id' | 'createdAt'>[] = [
      // Spam detection
      {
        name: 'Repeated Messages',
        type: 'spam',
        pattern: /(.{10,})\1{2,}/gi, // Repeated text patterns
        action: 'warn',
        severity: 'medium',
        isActive: true
      },
      {
        name: 'Excessive Caps',
        type: 'spam',
        pattern: /[A-Z]{10,}/g, // 10+ consecutive caps
        action: 'warn',
        severity: 'low',
        isActive: true
      },
      {
        name: 'Multiple Links',
        type: 'spam',
        pattern: /(https?:\/\/[^\s]+.*){3,}/gi, // 3+ links in message
        action: 'delete',
        severity: 'high',
        isActive: true
      },

      // Profanity detection (English + Hindi)
      {
        name: 'English Profanity',
        type: 'profanity',
        pattern: /\b(fuck|shit|damn|bitch|asshole|bastard|crap)\b/gi,
        action: 'warn',
        severity: 'medium',
        isActive: true
      },
      {
        name: 'Hindi Profanity',
        type: 'profanity',
        pattern: /\b(बकवास|गधा|बेवकूफ|मूर्ख|पागल)\b/gi,
        action: 'warn',
        severity: 'medium',
        isActive: true
      },

      // Scam detection
      {
        name: 'Fake Offers',
        type: 'scam',
        pattern: /\b(100% free|guaranteed money|instant cash|click here to win|limited time offer)\b/gi,
        action: 'ban',
        severity: 'critical',
        isActive: true
      },
      {
        name: 'Phishing Attempts',
        type: 'scam',
        pattern: /\b(verify your account|click to claim|urgent action required|suspended account)\b/gi,
        action: 'ban',
        severity: 'critical',
        isActive: true
      },

      // Inappropriate content
      {
        name: 'Personal Information',
        type: 'inappropriate',
        pattern: /\b(\d{4}\s?\d{4}\s?\d{4}\s?\d{4}|\d{10}|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g,
        action: 'delete',
        severity: 'high',
        isActive: true
      }
    ];

    defaultRules.forEach(rule => {
      const fullRule: ModerationRule = {
        ...rule,
        id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date()
      };
      this.moderationRules.set(fullRule.id, fullRule);
    });
  }

  async analyzeContent(userId: string, messageId: string, content: string): Promise<ContentAnalysis> {
    const analysis: ContentAnalysis = {
      messageId,
      userId,
      content,
      isSpam: false,
      isProfane: false,
      isScam: false,
      toxicityScore: 0,
      confidence: 0,
      flaggedRules: [],
      timestamp: new Date()
    };

    // Check against all active rules
    for (const rule of this.moderationRules.values()) {
      if (!rule.isActive) continue;

      const pattern = typeof rule.pattern === 'string' ? new RegExp(rule.pattern, 'gi') : rule.pattern;
      
      if (pattern.test(content)) {
        analysis.flaggedRules.push(rule.id);
        
        switch (rule.type) {
          case 'spam':
            analysis.isSpam = true;
            break;
          case 'profanity':
            analysis.isProfane = true;
            break;
          case 'scam':
            analysis.isScam = true;
            break;
        }

        // Calculate toxicity score based on severity
        const severityScore = {
          low: 0.2,
          medium: 0.5,
          high: 0.8,
          critical: 1.0
        };
        
        analysis.toxicityScore = Math.max(analysis.toxicityScore, severityScore[rule.severity]);
      }
    }

    // Calculate confidence based on number of rules triggered
    analysis.confidence = Math.min(1.0, analysis.flaggedRules.length * 0.3);

    // Update user trust score
    await this.updateUserTrustScore(userId, analysis);

    // Auto-moderate if necessary
    if (analysis.flaggedRules.length > 0) {
      await this.autoModerate(userId, messageId, analysis);
    }

    return analysis;
  }

  private async updateUserTrustScore(userId: string, analysis: ContentAnalysis): Promise<void> {
    let userTrust = this.userTrustScores.get(userId);
    
    if (!userTrust) {
      userTrust = {
        userId,
        score: 100, // Start with perfect score
        violations: 0,
        warnings: 0,
        lastViolation: new Date(),
        trustLevel: 'medium',
        joinDate: new Date()
      };
      this.userTrustScores.set(userId, userTrust);
    }

    // Decrease trust score based on violations
    if (analysis.flaggedRules.length > 0) {
      const penalty = analysis.toxicityScore * 20; // Max 20 points penalty
      userTrust.score = Math.max(0, userTrust.score - penalty);
      userTrust.violations++;
      userTrust.lastViolation = new Date();
    } else {
      // Slowly increase trust score for good behavior
      userTrust.score = Math.min(100, userTrust.score + 0.1);
    }

    // Update trust level
    if (userTrust.score >= 90) {
      userTrust.trustLevel = 'high';
    } else if (userTrust.score >= 70) {
      userTrust.trustLevel = 'medium';
    } else if (userTrust.score >= 40) {
      userTrust.trustLevel = 'low';
    } else {
      userTrust.trustLevel = 'untrusted';
    }
  }

  private async autoModerate(userId: string, messageId: string, analysis: ContentAnalysis): Promise<void> {
    const userTrust = this.userTrustScores.get(userId);
    const highestSeverityRule = analysis.flaggedRules
      .map(ruleId => this.moderationRules.get(ruleId)!)
      .sort((a, b) => {
        const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      })[0];

    if (!highestSeverityRule) return;

    let action = highestSeverityRule.action;
    let duration: number | undefined;

    // Adjust action based on user trust score
    if (userTrust && userTrust.trustLevel === 'high' && action === 'ban') {
      action = 'warn'; // Give trusted users benefit of doubt
    } else if (userTrust && userTrust.trustLevel === 'untrusted' && action === 'warn') {
      action = 'mute'; // Be stricter with untrusted users
      duration = 60; // 1 hour mute
    }

    // Execute moderation action
    await this.executeModerationAction({
      userId,
      action: action as ModerationAction['action'],
      reason: `Automatic moderation: ${highestSeverityRule.name}`,
      duration,
      messageId,
      isAutomatic: true,
      moderatorId: 'system'
    });
  }

  async executeModerationAction(params: {
    userId: string;
    action: ModerationAction['action'];
    reason: string;
    duration?: number;
    messageId?: string;
    isAutomatic: boolean;
    moderatorId: string;
  }): Promise<string> {
    const actionId = `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const moderationAction: ModerationAction = {
      id: actionId,
      userId: params.userId,
      moderatorId: params.moderatorId,
      action: params.action,
      reason: params.reason,
      duration: params.duration,
      messageId: params.messageId,
      timestamp: new Date(),
      isAutomatic: params.isAutomatic
    };

    this.moderationActions.set(actionId, moderationAction);

    // Execute the action
    switch (params.action) {
      case 'warn':
        await this.warnUser(params.userId, params.reason);
        break;
      case 'mute':
        await this.muteUser(params.userId, params.duration || 60);
        break;
      case 'ban':
        await this.banUser(params.userId, params.reason);
        break;
      case 'unban':
        await this.unbanUser(params.userId);
        break;
      case 'delete_message':
        await this.deleteMessage(params.messageId!);
        break;
    }

    // Update user trust score
    const userTrust = this.userTrustScores.get(params.userId);
    if (userTrust) {
      if (params.action === 'warn') {
        userTrust.warnings++;
      }
    }

    this.emit('moderationAction', moderationAction);
    logger.info(`Moderation action: ${params.action} on user ${params.userId} by ${params.moderatorId}`);

    return actionId;
  }

  private async warnUser(userId: string, reason: string): Promise<void> {
    this.emit('userWarned', { userId, reason });
  }

  private async muteUser(userId: string, durationMinutes: number): Promise<void> {
    const unmuteTime = new Date(Date.now() + durationMinutes * 60 * 1000);
    this.mutedUsers.set(userId, unmuteTime);
    this.emit('userMuted', { userId, duration: durationMinutes, unmuteTime });
  }

  private async banUser(userId: string, reason: string): Promise<void> {
    this.bannedUsers.add(userId);
    this.emit('userBanned', { userId, reason });
  }

  private async unbanUser(userId: string): Promise<void> {
    this.bannedUsers.delete(userId);
    this.emit('userUnbanned', { userId });
  }

  private async deleteMessage(messageId: string): Promise<void> {
    this.emit('messageDeleted', { messageId });
  }

  isUserBanned(userId: string): boolean {
    return this.bannedUsers.has(userId);
  }

  isUserMuted(userId: string): boolean {
    const unmuteTime = this.mutedUsers.get(userId);
    if (!unmuteTime) return false;
    
    if (new Date() >= unmuteTime) {
      this.mutedUsers.delete(userId);
      return false;
    }
    
    return true;
  }

  getUserTrustScore(userId: string): UserTrustScore | null {
    return this.userTrustScores.get(userId) || null;
  }

  getUserModerationHistory(userId: string): ModerationAction[] {
    return Array.from(this.moderationActions.values())
      .filter(action => action.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  addModerationRule(rule: Omit<ModerationRule, 'id' | 'createdAt'>): string {
    const ruleId = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullRule: ModerationRule = {
      ...rule,
      id: ruleId,
      createdAt: new Date()
    };
    
    this.moderationRules.set(ruleId, fullRule);
    this.emit('ruleAdded', fullRule);
    logger.info(`Added moderation rule: ${rule.name}`);
    
    return ruleId;
  }

  updateModerationRule(ruleId: string, updates: Partial<ModerationRule>): boolean {
    const rule = this.moderationRules.get(ruleId);
    if (!rule) return false;
    
    Object.assign(rule, updates);
    this.emit('ruleUpdated', rule);
    logger.info(`Updated moderation rule: ${ruleId}`);
    
    return true;
  }

  deleteModerationRule(ruleId: string): boolean {
    const deleted = this.moderationRules.delete(ruleId);
    if (deleted) {
      this.emit('ruleDeleted', { ruleId });
      logger.info(`Deleted moderation rule: ${ruleId}`);
    }
    return deleted;
  }

  getModerationRules(): ModerationRule[] {
    return Array.from(this.moderationRules.values());
  }

  getActiveModerationRules(): ModerationRule[] {
    return Array.from(this.moderationRules.values()).filter(rule => rule.isActive);
  }

  getModerationStats(): any {
    const totalUsers = this.userTrustScores.size;
    const totalActions = this.moderationActions.size;
    const totalBanned = this.bannedUsers.size;
    const totalMuted = this.mutedUsers.size;
    const totalRules = this.moderationRules.size;
    const activeRules = Array.from(this.moderationRules.values()).filter(rule => rule.isActive).length;

    const actionTypes = new Map<string, number>();
    const trustLevels = new Map<string, number>();

    Array.from(this.moderationActions.values()).forEach(action => {
      actionTypes.set(action.action, (actionTypes.get(action.action) || 0) + 1);
    });

    Array.from(this.userTrustScores.values()).forEach(user => {
      trustLevels.set(user.trustLevel, (trustLevels.get(user.trustLevel) || 0) + 1);
    });

    return {
      totalUsers,
      totalActions,
      totalBanned,
      totalMuted,
      totalRules,
      activeRules,
      actionTypeDistribution: Object.fromEntries(actionTypes),
      trustLevelDistribution: Object.fromEntries(trustLevels),
      averageTrustScore: totalUsers > 0 ? 
        Array.from(this.userTrustScores.values()).reduce((sum, user) => sum + user.score, 0) / totalUsers : 0
    };
  }

  private startCleanupTimer(): void {
    // Clean up expired mutes every 5 minutes
    setInterval(() => {
      const now = new Date();
      for (const [userId, unmuteTime] of this.mutedUsers.entries()) {
        if (now >= unmuteTime) {
          this.mutedUsers.delete(userId);
          this.emit('userUnmuted', { userId });
        }
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  destroy(): void {
    this.removeAllListeners();
    logger.info('AdminModerationService destroyed');
  }
}
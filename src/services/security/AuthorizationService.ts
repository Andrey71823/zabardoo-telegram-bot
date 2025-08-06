import { EventEmitter } from 'events';
import { logger } from '../../config/logger';

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description: string;
  createdAt: Date;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AccessPolicy {
  id: string;
  name: string;
  description: string;
  rules: AccessRule[];
  enabled: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AccessRule {
  id: string;
  effect: 'allow' | 'deny';
  resource: string;
  action: string;
  conditions?: {
    ipAddress?: string[];
    timeRange?: { start: string; end: string };
    dayOfWeek?: number[];
    userAttributes?: { [key: string]: any };
  };
}

export interface AccessRequest {
  userId: string;
  resource: string;
  action: string;
  context?: {
    ipAddress?: string;
    userAgent?: string;
    timestamp?: Date;
    additionalData?: { [key: string]: any };
  };
}

export interface AccessDecision {
  allowed: boolean;
  reason: string;
  appliedRules: string[];
  timestamp: Date;
}

export interface AuditLog {
  id: string;
  userId: string;
  username: string;
  resource: string;
  action: string;
  decision: 'allow' | 'deny';
  reason: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  additionalData?: { [key: string]: any };
}

export class AuthorizationService extends EventEmitter {
  private permissions: Map<string, Permission> = new Map();
  private roles: Map<string, Role> = new Map();
  private userRoles: Map<string, string[]> = new Map();
  private accessPolicies: Map<string, AccessPolicy> = new Map();
  private auditLogs: AuditLog[] = [];
  private cleanupTimer?: NodeJS.Timeout;

  constructor() {
    super();
    this.initializeDefaultPermissions();
    this.initializeDefaultRoles();
    this.initializeDefaultPolicies();
    this.startCleanupTimer();
  }

  /**
   * Initialize default permissions
   */
  private initializeDefaultPermissions(): void {
    const defaultPermissions: Omit<Permission, 'createdAt'>[] = [
      // User management
      { id: 'users:read', name: 'Read Users', resource: 'users', action: 'read', description: 'View user information' },
      { id: 'users:write', name: 'Write Users', resource: 'users', action: 'write', description: 'Create and update users' },
      { id: 'users:delete', name: 'Delete Users', resource: 'users', action: 'delete', description: 'Delete users' },
      
      // Coupon management
      { id: 'coupons:read', name: 'Read Coupons', resource: 'coupons', action: 'read', description: 'View coupons' },
      { id: 'coupons:write', name: 'Write Coupons', resource: 'coupons', action: 'write', description: 'Create and update coupons' },
      { id: 'coupons:delete', name: 'Delete Coupons', resource: 'coupons', action: 'delete', description: 'Delete coupons' },
      { id: 'coupons:approve', name: 'Approve Coupons', resource: 'coupons', action: 'approve', description: 'Approve coupon submissions' },
      
      // Analytics
      { id: 'analytics:read', name: 'Read Analytics', resource: 'analytics', action: 'read', description: 'View analytics data' },
      { id: 'analytics:export', name: 'Export Analytics', resource: 'analytics', action: 'export', description: 'Export analytics data' },
      
      // System administration
      { id: 'system:read', name: 'Read System', resource: 'system', action: 'read', description: 'View system information' },
      { id: 'system:write', name: 'Write System', resource: 'system', action: 'write', description: 'Modify system settings' },
      { id: 'system:monitor', name: 'Monitor System', resource: 'system', action: 'monitor', description: 'Access monitoring tools' },
      
      // Notifications
      { id: 'notifications:read', name: 'Read Notifications', resource: 'notifications', action: 'read', description: 'View notifications' },
      { id: 'notifications:write', name: 'Write Notifications', resource: 'notifications', action: 'write', description: 'Send notifications' },
      
      // Cashback
      { id: 'cashback:read', name: 'Read Cashback', resource: 'cashback', action: 'read', description: 'View cashback data' },
      { id: 'cashback:write', name: 'Write Cashback', resource: 'cashback', action: 'write', description: 'Process cashback' },
      
      // Reports
      { id: 'reports:read', name: 'Read Reports', resource: 'reports', action: 'read', description: 'View reports' },
      { id: 'reports:generate', name: 'Generate Reports', resource: 'reports', action: 'generate', description: 'Generate new reports' }
    ];

    defaultPermissions.forEach(perm => {
      const permission: Permission = {
        ...perm,
        createdAt: new Date()
      };
      this.permissions.set(permission.id, permission);
    });

    logger.info(`AuthorizationService: Initialized ${defaultPermissions.length} default permissions`);
  }

  /**
   * Initialize default roles
   */
  private initializeDefaultRoles(): void {
    const defaultRoles: Omit<Role, 'createdAt' | 'updatedAt'>[] = [
      {
        id: 'admin',
        name: 'Administrator',
        description: 'Full system access',
        permissions: Array.from(this.permissions.keys()),
        isSystem: true
      },
      {
        id: 'moderator',
        name: 'Moderator',
        description: 'Content moderation and user management',
        permissions: [
          'users:read', 'users:write',
          'coupons:read', 'coupons:write', 'coupons:approve',
          'notifications:read', 'notifications:write',
          'analytics:read',
          'reports:read'
        ],
        isSystem: true
      },
      {
        id: 'user',
        name: 'Regular User',
        description: 'Basic user access',
        permissions: [
          'coupons:read',
          'cashback:read',
          'notifications:read'
        ],
        isSystem: true
      },
      {
        id: 'analyst',
        name: 'Data Analyst',
        description: 'Analytics and reporting access',
        permissions: [
          'analytics:read', 'analytics:export',
          'reports:read', 'reports:generate',
          'coupons:read',
          'users:read'
        ],
        isSystem: false
      }
    ];

    const now = new Date();
    defaultRoles.forEach(roleData => {
      const role: Role = {
        ...roleData,
        createdAt: now,
        updatedAt: now
      };
      this.roles.set(role.id, role);
    });

    logger.info(`AuthorizationService: Initialized ${defaultRoles.length} default roles`);
  }

  /**
   * Initialize default access policies
   */
  private initializeDefaultPolicies(): void {
    const defaultPolicies: Omit<AccessPolicy, 'createdAt' | 'updatedAt'>[] = [
      {
        id: 'business-hours-policy',
        name: 'Business Hours Access',
        description: 'Restrict admin actions to business hours',
        enabled: false,
        priority: 1,
        rules: [
          {
            id: 'business-hours-rule',
            effect: 'deny',
            resource: 'system',
            action: 'write',
            conditions: {
              timeRange: { start: '18:00', end: '09:00' },
              dayOfWeek: [0, 6] // Sunday and Saturday
            }
          }
        ]
      },
      {
        id: 'ip-whitelist-policy',
        name: 'IP Address Whitelist',
        description: 'Allow admin access only from specific IP addresses',
        enabled: false,
        priority: 2,
        rules: [
          {
            id: 'admin-ip-rule',
            effect: 'allow',
            resource: '*',
            action: '*',
            conditions: {
              ipAddress: ['192.168.1.0/24', '10.0.0.0/8']
            }
          }
        ]
      },
      {
        id: 'rate-limit-policy',
        name: 'Rate Limiting',
        description: 'Limit API access rate',
        enabled: true,
        priority: 3,
        rules: [
          {
            id: 'api-rate-limit',
            effect: 'deny',
            resource: 'api',
            action: '*',
            conditions: {
              userAttributes: { requestCount: { $gt: 100 } }
            }
          }
        ]
      }
    ];

    const now = new Date();
    defaultPolicies.forEach(policyData => {
      const policy: AccessPolicy = {
        ...policyData,
        createdAt: now,
        updatedAt: now
      };
      this.accessPolicies.set(policy.id, policy);
    });

    logger.info(`AuthorizationService: Initialized ${defaultPolicies.length} default policies`);
  }

  /**
   * Assign role to user
   */
  assignRole(userId: string, roleId: string): { success: boolean; error?: string } {
    try {
      const role = this.roles.get(roleId);
      if (!role) {
        return { success: false, error: 'Role not found' };
      }

      const userRoles = this.userRoles.get(userId) || [];
      if (!userRoles.includes(roleId)) {
        userRoles.push(roleId);
        this.userRoles.set(userId, userRoles);
      }

      logger.info(`AuthorizationService: Role ${roleId} assigned to user ${userId}`);
      this.emit('roleAssigned', { userId, roleId });

      return { success: true };
    } catch (error) {
      logger.error('AuthorizationService: Role assignment error:', error);
      return { success: false, error: 'Role assignment failed' };
    }
  }

  /**
   * Remove role from user
   */
  removeRole(userId: string, roleId: string): { success: boolean; error?: string } {
    try {
      const userRoles = this.userRoles.get(userId) || [];
      const roleIndex = userRoles.indexOf(roleId);
      
      if (roleIndex > -1) {
        userRoles.splice(roleIndex, 1);
        this.userRoles.set(userId, userRoles);
      }

      logger.info(`AuthorizationService: Role ${roleId} removed from user ${userId}`);
      this.emit('roleRemoved', { userId, roleId });

      return { success: true };
    } catch (error) {
      logger.error('AuthorizationService: Role removal error:', error);
      return { success: false, error: 'Role removal failed' };
    }
  }

  /**
   * Check if user has permission
   */
  hasPermission(userId: string, resource: string, action: string): boolean {
    const userRoles = this.userRoles.get(userId) || [];
    
    for (const roleId of userRoles) {
      const role = this.roles.get(roleId);
      if (role && role.permissions.includes(`${resource}:${action}`)) {
        return true;
      }
      
      // Check for wildcard permissions
      if (role && (role.permissions.includes(`${resource}:*`) || role.permissions.includes('*:*'))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check access with full context and policies
   */
  async checkAccess(request: AccessRequest): Promise<AccessDecision> {
    const startTime = Date.now();
    const appliedRules: string[] = [];
    let decision: AccessDecision = {
      allowed: false,
      reason: 'Access denied by default',
      appliedRules,
      timestamp: new Date()
    };

    try {
      // First check basic role-based permissions
      const hasBasicPermission = this.hasPermission(request.userId, request.resource, request.action);
      
      if (!hasBasicPermission) {
        decision.reason = 'Insufficient permissions';
        this.logAccess(request, decision);
        return decision;
      }

      // Apply access policies in priority order
      const sortedPolicies = Array.from(this.accessPolicies.values())
        .filter(policy => policy.enabled)
        .sort((a, b) => a.priority - b.priority);

      let finalDecision = 'allow';
      let finalReason = 'Access granted by role permissions';

      for (const policy of sortedPolicies) {
        for (const rule of policy.rules) {
          if (this.ruleMatches(rule, request)) {
            appliedRules.push(`${policy.name}:${rule.id}`);
            
            if (rule.effect === 'deny') {
              finalDecision = 'deny';
              finalReason = `Access denied by policy: ${policy.name}`;
              break;
            }
          }
        }
        
        if (finalDecision === 'deny') {
          break;
        }
      }

      decision = {
        allowed: finalDecision === 'allow',
        reason: finalReason,
        appliedRules,
        timestamp: new Date()
      };

      this.logAccess(request, decision);
      
      const duration = Date.now() - startTime;
      logger.debug(`AuthorizationService: Access check completed in ${duration}ms`);

      return decision;

    } catch (error) {
      logger.error('AuthorizationService: Access check error:', error);
      decision.reason = 'Access check failed';
      this.logAccess(request, decision);
      return decision;
    }
  }

  /**
   * Check if a rule matches the request
   */
  private ruleMatches(rule: AccessRule, request: AccessRequest): boolean {
    // Check resource match
    if (rule.resource !== '*' && rule.resource !== request.resource) {
      return false;
    }

    // Check action match
    if (rule.action !== '*' && rule.action !== request.action) {
      return false;
    }

    // Check conditions
    if (rule.conditions) {
      // IP address condition
      if (rule.conditions.ipAddress && request.context?.ipAddress) {
        const ipMatches = rule.conditions.ipAddress.some(allowedIp => 
          this.ipMatches(request.context!.ipAddress!, allowedIp)
        );
        if (!ipMatches) return false;
      }

      // Time range condition
      if (rule.conditions.timeRange) {
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        if (currentTime < rule.conditions.timeRange.start || currentTime > rule.conditions.timeRange.end) {
          return false;
        }
      }

      // Day of week condition
      if (rule.conditions.dayOfWeek) {
        const currentDay = new Date().getDay();
        if (!rule.conditions.dayOfWeek.includes(currentDay)) {
          return false;
        }
      }

      // User attributes condition (simplified)
      if (rule.conditions.userAttributes && request.context?.additionalData) {
        for (const [key, condition] of Object.entries(rule.conditions.userAttributes)) {
          const userValue = request.context.additionalData[key];
          if (!this.evaluateCondition(userValue, condition)) {
            return false;
          }
        }
      }
    }

    return true;
  }

  /**
   * Check if IP address matches pattern
   */
  private ipMatches(ip: string, pattern: string): boolean {
    if (pattern.includes('/')) {
      // CIDR notation
      const [network, prefixLength] = pattern.split('/');
      const networkInt = this.ipToInt(network);
      const ipInt = this.ipToInt(ip);
      const mask = (0xffffffff << (32 - parseInt(prefixLength))) >>> 0;
      
      return (networkInt & mask) === (ipInt & mask);
    } else {
      // Exact match
      return ip === pattern;
    }
  }

  /**
   * Convert IP address to integer
   */
  private ipToInt(ip: string): number {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
  }

  /**
   * Evaluate condition (simplified MongoDB-style operators)
   */
  private evaluateCondition(value: any, condition: any): boolean {
    if (typeof condition === 'object' && condition !== null) {
      for (const [operator, operand] of Object.entries(condition)) {
        switch (operator) {
          case '$gt':
            return value > operand;
          case '$gte':
            return value >= operand;
          case '$lt':
            return value < operand;
          case '$lte':
            return value <= operand;
          case '$eq':
            return value === operand;
          case '$ne':
            return value !== operand;
          case '$in':
            return Array.isArray(operand) && operand.includes(value);
          case '$nin':
            return Array.isArray(operand) && !operand.includes(value);
          default:
            return false;
        }
      }
    }
    
    return value === condition;
  }

  /**
   * Log access attempt
   */
  private logAccess(request: AccessRequest, decision: AccessDecision): void {
    const auditLog: AuditLog = {
      id: this.generateAuditId(),
      userId: request.userId,
      username: 'Unknown', // Would be populated from user service
      resource: request.resource,
      action: request.action,
      decision: decision.allowed ? 'allow' : 'deny',
      reason: decision.reason,
      ipAddress: request.context?.ipAddress,
      userAgent: request.context?.userAgent,
      timestamp: new Date(),
      additionalData: request.context?.additionalData
    };

    this.auditLogs.push(auditLog);
    
    // Emit event for real-time monitoring
    this.emit('accessAttempt', auditLog);

    // Log security events
    if (!decision.allowed) {
      logger.warn(`AuthorizationService: Access denied - User: ${request.userId}, Resource: ${request.resource}, Action: ${request.action}, Reason: ${decision.reason}`);
    }
  }

  /**
   * Create new permission
   */
  createPermission(permission: Omit<Permission, 'createdAt'>): { success: boolean; error?: string } {
    try {
      if (this.permissions.has(permission.id)) {
        return { success: false, error: 'Permission already exists' };
      }

      const newPermission: Permission = {
        ...permission,
        createdAt: new Date()
      };

      this.permissions.set(permission.id, newPermission);
      
      logger.info(`AuthorizationService: Permission created - ${permission.id}`);
      this.emit('permissionCreated', newPermission);

      return { success: true };
    } catch (error) {
      logger.error('AuthorizationService: Permission creation error:', error);
      return { success: false, error: 'Permission creation failed' };
    }
  }

  /**
   * Create new role
   */
  createRole(role: Omit<Role, 'createdAt' | 'updatedAt'>): { success: boolean; error?: string } {
    try {
      if (this.roles.has(role.id)) {
        return { success: false, error: 'Role already exists' };
      }

      // Validate permissions exist
      for (const permissionId of role.permissions) {
        if (!this.permissions.has(permissionId)) {
          return { success: false, error: `Permission ${permissionId} does not exist` };
        }
      }

      const now = new Date();
      const newRole: Role = {
        ...role,
        createdAt: now,
        updatedAt: now
      };

      this.roles.set(role.id, newRole);
      
      logger.info(`AuthorizationService: Role created - ${role.id}`);
      this.emit('roleCreated', newRole);

      return { success: true };
    } catch (error) {
      logger.error('AuthorizationService: Role creation error:', error);
      return { success: false, error: 'Role creation failed' };
    }
  }

  /**
   * Update role
   */
  updateRole(roleId: string, updates: Partial<Pick<Role, 'name' | 'description' | 'permissions'>>): { success: boolean; error?: string } {
    try {
      const role = this.roles.get(roleId);
      if (!role) {
        return { success: false, error: 'Role not found' };
      }

      if (role.isSystem) {
        return { success: false, error: 'Cannot modify system role' };
      }

      // Validate permissions if updating
      if (updates.permissions) {
        for (const permissionId of updates.permissions) {
          if (!this.permissions.has(permissionId)) {
            return { success: false, error: `Permission ${permissionId} does not exist` };
          }
        }
      }

      if (updates.name) role.name = updates.name;
      if (updates.description) role.description = updates.description;
      if (updates.permissions) role.permissions = updates.permissions;
      role.updatedAt = new Date();

      logger.info(`AuthorizationService: Role updated - ${roleId}`);
      this.emit('roleUpdated', { roleId, updates });

      return { success: true };
    } catch (error) {
      logger.error('AuthorizationService: Role update error:', error);
      return { success: false, error: 'Role update failed' };
    }
  }

  /**
   * Delete role
   */
  deleteRole(roleId: string): { success: boolean; error?: string } {
    try {
      const role = this.roles.get(roleId);
      if (!role) {
        return { success: false, error: 'Role not found' };
      }

      if (role.isSystem) {
        return { success: false, error: 'Cannot delete system role' };
      }

      // Remove role from all users
      for (const [userId, userRoles] of this.userRoles.entries()) {
        const roleIndex = userRoles.indexOf(roleId);
        if (roleIndex > -1) {
          userRoles.splice(roleIndex, 1);
          this.userRoles.set(userId, userRoles);
        }
      }

      this.roles.delete(roleId);
      
      logger.info(`AuthorizationService: Role deleted - ${roleId}`);
      this.emit('roleDeleted', roleId);

      return { success: true };
    } catch (error) {
      logger.error('AuthorizationService: Role deletion error:', error);
      return { success: false, error: 'Role deletion failed' };
    }
  }

  /**
   * Create access policy
   */
  createAccessPolicy(policy: Omit<AccessPolicy, 'createdAt' | 'updatedAt'>): { success: boolean; error?: string } {
    try {
      if (this.accessPolicies.has(policy.id)) {
        return { success: false, error: 'Policy already exists' };
      }

      const now = new Date();
      const newPolicy: AccessPolicy = {
        ...policy,
        createdAt: now,
        updatedAt: now
      };

      this.accessPolicies.set(policy.id, newPolicy);
      
      logger.info(`AuthorizationService: Access policy created - ${policy.id}`);
      this.emit('policyCreated', newPolicy);

      return { success: true };
    } catch (error) {
      logger.error('AuthorizationService: Policy creation error:', error);
      return { success: false, error: 'Policy creation failed' };
    }
  }

  /**
   * Get user roles
   */
  getUserRoles(userId: string): string[] {
    return this.userRoles.get(userId) || [];
  }

  /**
   * Get user permissions
   */
  getUserPermissions(userId: string): string[] {
    const userRoles = this.userRoles.get(userId) || [];
    const permissions = new Set<string>();

    for (const roleId of userRoles) {
      const role = this.roles.get(roleId);
      if (role) {
        role.permissions.forEach(permission => permissions.add(permission));
      }
    }

    return Array.from(permissions);
  }

  /**
   * Get all permissions
   */
  getAllPermissions(): Permission[] {
    return Array.from(this.permissions.values());
  }

  /**
   * Get all roles
   */
  getAllRoles(): Role[] {
    return Array.from(this.roles.values());
  }

  /**
   * Get all access policies
   */
  getAllAccessPolicies(): AccessPolicy[] {
    return Array.from(this.accessPolicies.values());
  }

  /**
   * Get audit logs
   */
  getAuditLogs(limit: number = 100, filters?: {
    userId?: string;
    resource?: string;
    action?: string;
    decision?: 'allow' | 'deny';
    startDate?: Date;
    endDate?: Date;
  }): AuditLog[] {
    let logs = [...this.auditLogs];

    if (filters) {
      logs = logs.filter(log => {
        if (filters.userId && log.userId !== filters.userId) return false;
        if (filters.resource && log.resource !== filters.resource) return false;
        if (filters.action && log.action !== filters.action) return false;
        if (filters.decision && log.decision !== filters.decision) return false;
        if (filters.startDate && log.timestamp < filters.startDate) return false;
        if (filters.endDate && log.timestamp > filters.endDate) return false;
        return true;
      });
    }

    return logs
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get authorization statistics
   */
  getStats(): any {
    const now = Date.now();
    const oneDayAgo = now - 86400000;
    const oneHourAgo = now - 3600000;

    const recentLogs = this.auditLogs.filter(log => 
      log.timestamp.getTime() > oneDayAgo
    );

    return {
      permissions: this.permissions.size,
      roles: this.roles.size,
      policies: this.accessPolicies.size,
      usersWithRoles: this.userRoles.size,
      auditLogs: {
        total: this.auditLogs.length,
        last24h: recentLogs.length,
        last1h: this.auditLogs.filter(log => 
          log.timestamp.getTime() > oneHourAgo
        ).length,
        allowed: recentLogs.filter(log => log.decision === 'allow').length,
        denied: recentLogs.filter(log => log.decision === 'deny').length
      }
    };
  }

  private generateAuditId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, 3600000); // Cleanup every hour
  }

  private cleanup(): void {
    // Keep only last 10000 audit logs
    if (this.auditLogs.length > 10000) {
      this.auditLogs = this.auditLogs
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 10000);
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

    this.permissions.clear();
    this.roles.clear();
    this.userRoles.clear();
    this.accessPolicies.clear();
    this.auditLogs = [];

    logger.info('AuthorizationService: Destroyed');
  }
}

// Export singleton instance
export const authorizationService = new AuthorizationService();
import { EventEmitter } from 'events';
import { logger } from '../../config/logger';

export interface DDoSAttack {
  id: string;
  startTime: Date;
  endTime?: Date;
  sourceIPs: string[];
  targetEndpoints: string[];
  requestCount: number;
  peakRPS: number;
  attackType: 'volumetric' | 'protocol' | 'application' | 'mixed';
  severity: 'low' | 'medium' | 'high' | 'critical';
  mitigated: boolean;
  mitigationActions: string[];
}

export interface TrafficPattern {
  ip: string;
  requestCount: number;
  requestsPerSecond: number;
  endpoints: Map<string, number>;
  userAgents: Set<string>;
  firstSeen: Date;
  lastSeen: Date;
  suspicious: boolean;
  suspicionReasons: string[];
}

export interface DDoSConfig {
  enabled: boolean;
  detectionThreshold: {
    requestsPerSecond: number;
    requestsPerMinute: number;
    uniqueIPsPerSecond: number;
  };
  mitigationActions: {
    enableRateLimit: boolean;
    enableIPBlocking: boolean;
    enableChallengeResponse: boolean;
    enableTrafficShaping: boolean;
  };
  whitelistedIPs: string[];
  blacklistedIPs: string[];
  monitoringWindow: number; // milliseconds
  cleanupInterval: number; // milliseconds
}

export class DDoSProtectionService extends EventEmitter {
  private config: DDoSConfig;
  private trafficPatterns: Map<string, TrafficPattern> = new Map();
  private activeAttacks: Map<string, DDoSAttack> = new Map();
  private requestHistory: Array<{ ip: string; endpoint: string; timestamp: number; userAgent: string }> = [];
  private monitoringTimer?: NodeJS.Timeout;
  private cleanupTimer?: NodeJS.Timeout;
  private isMonitoring = false;

  constructor(config: Partial<DDoSConfig> = {}) {
    super();
    
    this.config = {
      enabled: true,
      detectionThreshold: {
        requestsPerSecond: 100,
        requestsPerMinute: 1000,
        uniqueIPsPerSecond: 50
      },
      mitigationActions: {
        enableRateLimit: true,
        enableIPBlocking: true,
        enableChallengeResponse: false,
        enableTrafficShaping: true
      },
      whitelistedIPs: ['127.0.0.1', '::1'],
      blacklistedIPs: [],
      monitoringWindow: 60000, // 1 minute
      cleanupInterval: 300000, // 5 minutes
      ...config
    };

    this.startMonitoring();
  }

  /**
   * Analyze incoming request for DDoS patterns
   */
  analyzeRequest(request: {
    ip: string;
    endpoint: string;
    userAgent: string;
    method: string;
    headers?: { [key: string]: string };
  }): { allowed: boolean; reason?: string; action?: string } {
    if (!this.config.enabled) {
      return { allowed: true };
    }

    const now = Date.now();
    
    // Check whitelist
    if (this.config.whitelistedIPs.includes(request.ip)) {
      return { allowed: true };
    }

    // Check blacklist
    if (this.config.blacklistedIPs.includes(request.ip)) {
      return { 
        allowed: false, 
        reason: 'IP is blacklisted',
        action: 'blocked'
      };
    }

    // Record request
    this.recordRequest(request, now);

    // Update traffic pattern
    this.updateTrafficPattern(request, now);

    // Check for attack patterns
    const attackDetection = this.detectAttackPatterns(request.ip, now);
    if (!attackDetection.allowed) {
      return attackDetection;
    }

    // Check global traffic patterns
    const globalCheck = this.checkGlobalTrafficPatterns(now);
    if (!globalCheck.allowed) {
      return globalCheck;
    }

    return { allowed: true };
  }

  /**
   * Record request in history
   */
  private recordRequest(request: {
    ip: string;
    endpoint: string;
    userAgent: string;
  }, timestamp: number): void {
    this.requestHistory.push({
      ip: request.ip,
      endpoint: request.endpoint,
      timestamp,
      userAgent: request.userAgent
    });

    // Keep only recent history (last 5 minutes)
    const cutoff = timestamp - 300000;
    this.requestHistory = this.requestHistory.filter(req => req.timestamp > cutoff);
  }

  /**
   * Update traffic pattern for IP
   */
  private updateTrafficPattern(request: {
    ip: string;
    endpoint: string;
    userAgent: string;
  }, timestamp: number): void {
    let pattern = this.trafficPatterns.get(request.ip);
    
    if (!pattern) {
      pattern = {
        ip: request.ip,
        requestCount: 0,
        requestsPerSecond: 0,
        endpoints: new Map(),
        userAgents: new Set(),
        firstSeen: new Date(timestamp),
        lastSeen: new Date(timestamp),
        suspicious: false,
        suspicionReasons: []
      };
      this.trafficPatterns.set(request.ip, pattern);
    }

    // Update pattern
    pattern.requestCount++;
    pattern.lastSeen = new Date(timestamp);
    pattern.userAgents.add(request.userAgent);
    
    const endpointCount = pattern.endpoints.get(request.endpoint) || 0;
    pattern.endpoints.set(request.endpoint, endpointCount + 1);

    // Calculate requests per second
    const timeWindow = Math.max(1, (timestamp - pattern.firstSeen.getTime()) / 1000);
    pattern.requestsPerSecond = pattern.requestCount / timeWindow;

    // Check for suspicious patterns
    this.analyzeSuspiciousPatterns(pattern);
  }

  /**
   * Analyze suspicious patterns in traffic
   */
  private analyzeSuspiciousPatterns(pattern: TrafficPattern): void {
    const suspicionReasons: string[] = [];

    // High request rate
    if (pattern.requestsPerSecond > this.config.detectionThreshold.requestsPerSecond) {
      suspicionReasons.push(`High request rate: ${pattern.requestsPerSecond.toFixed(2)} RPS`);
    }

    // Single endpoint targeting
    const totalRequests = pattern.requestCount;
    const maxEndpointRequests = Math.max(...Array.from(pattern.endpoints.values()));
    if (maxEndpointRequests / totalRequests > 0.8 && totalRequests > 50) {
      suspicionReasons.push('Single endpoint targeting detected');
    }

    // Limited user agents (bot-like behavior)
    if (pattern.userAgents.size === 1 && pattern.requestCount > 20) {
      suspicionReasons.push('Single user agent with high request count');
    }

    // Very short time window with many requests
    const timeWindow = pattern.lastSeen.getTime() - pattern.firstSeen.getTime();
    if (timeWindow < 10000 && pattern.requestCount > 100) { // 100 requests in 10 seconds
      suspicionReasons.push('Burst traffic pattern detected');
    }

    pattern.suspicious = suspicionReasons.length > 0;
    pattern.suspicionReasons = suspicionReasons;

    if (pattern.suspicious && suspicionReasons.length > 0) {
      logger.warn(`DDoSProtectionService: Suspicious traffic pattern detected from ${pattern.ip}`, {
        requestsPerSecond: pattern.requestsPerSecond,
        totalRequests: pattern.requestCount,
        reasons: suspicionReasons
      });
    }
  }

  /**
   * Detect attack patterns for specific IP
   */
  private detectAttackPatterns(ip: string, timestamp: number): { allowed: boolean; reason?: string; action?: string } {
    const pattern = this.trafficPatterns.get(ip);
    if (!pattern) {
      return { allowed: true };
    }

    // Check if IP is already part of an active attack
    const activeAttack = Array.from(this.activeAttacks.values())
      .find(attack => !attack.endTime && attack.sourceIPs.includes(ip));

    if (activeAttack) {
      return {
        allowed: false,
        reason: 'IP is part of active DDoS attack',
        action: 'blocked'
      };
    }

    // Check thresholds
    if (pattern.requestsPerSecond > this.config.detectionThreshold.requestsPerSecond) {
      this.triggerAttackDetection(ip, 'volumetric', pattern);
      return {
        allowed: false,
        reason: `Request rate too high: ${pattern.requestsPerSecond.toFixed(2)} RPS`,
        action: 'rate_limited'
      };
    }

    // Check for application layer attacks
    if (pattern.suspicious && pattern.suspicionReasons.length >= 2) {
      this.triggerAttackDetection(ip, 'application', pattern);
      return {
        allowed: false,
        reason: 'Suspicious application layer traffic detected',
        action: 'challenge_required'
      };
    }

    return { allowed: true };
  }

  /**
   * Check global traffic patterns
   */
  private checkGlobalTrafficPatterns(timestamp: number): { allowed: boolean; reason?: string; action?: string } {
    const recentRequests = this.requestHistory.filter(req => 
      timestamp - req.timestamp < 60000 // Last minute
    );

    const requestsPerMinute = recentRequests.length;
    const uniqueIPs = new Set(recentRequests.map(req => req.ip)).size;
    const requestsPerSecond = recentRequests.filter(req => 
      timestamp - req.timestamp < 1000 // Last second
    ).length;

    // Check global thresholds
    if (requestsPerSecond > this.config.detectionThreshold.requestsPerSecond * 2) {
      this.triggerGlobalAttackDetection('volumetric', {
        requestsPerSecond,
        requestsPerMinute,
        uniqueIPs
      });
      
      return {
        allowed: false,
        reason: 'Global request rate threshold exceeded',
        action: 'traffic_shaped'
      };
    }

    if (uniqueIPs > this.config.detectionThreshold.uniqueIPsPerSecond && requestsPerSecond > 50) {
      this.triggerGlobalAttackDetection('distributed', {
        requestsPerSecond,
        requestsPerMinute,
        uniqueIPs
      });
      
      return {
        allowed: false,
        reason: 'Distributed attack pattern detected',
        action: 'challenge_required'
      };
    }

    return { allowed: true };
  }

  /**
   * Trigger attack detection for specific IP
   */
  private triggerAttackDetection(ip: string, attackType: DDoSAttack['attackType'], pattern: TrafficPattern): void {
    const attackId = this.generateAttackId();
    const attack: DDoSAttack = {
      id: attackId,
      startTime: new Date(),
      sourceIPs: [ip],
      targetEndpoints: Array.from(pattern.endpoints.keys()),
      requestCount: pattern.requestCount,
      peakRPS: pattern.requestsPerSecond,
      attackType,
      severity: this.calculateSeverity(pattern.requestsPerSecond),
      mitigated: false,
      mitigationActions: []
    };

    this.activeAttacks.set(attackId, attack);

    logger.warn(`DDoSProtectionService: DDoS attack detected from ${ip}`, {
      attackId,
      attackType,
      requestsPerSecond: pattern.requestsPerSecond,
      severity: attack.severity
    });

    this.emit('attackDetected', attack);
    this.applyMitigation(attack);
  }

  /**
   * Trigger global attack detection
   */
  private triggerGlobalAttackDetection(attackType: string, metrics: {
    requestsPerSecond: number;
    requestsPerMinute: number;
    uniqueIPs: number;
  }): void {
    const attackId = this.generateAttackId();
    const recentIPs = Array.from(new Set(
      this.requestHistory
        .filter(req => Date.now() - req.timestamp < 60000)
        .map(req => req.ip)
    ));

    const attack: DDoSAttack = {
      id: attackId,
      startTime: new Date(),
      sourceIPs: recentIPs,
      targetEndpoints: Array.from(new Set(
        this.requestHistory
          .filter(req => Date.now() - req.timestamp < 60000)
          .map(req => req.endpoint)
      )),
      requestCount: metrics.requestsPerMinute,
      peakRPS: metrics.requestsPerSecond,
      attackType: attackType as DDoSAttack['attackType'],
      severity: this.calculateSeverity(metrics.requestsPerSecond),
      mitigated: false,
      mitigationActions: []
    };

    this.activeAttacks.set(attackId, attack);

    logger.warn(`DDoSProtectionService: Global DDoS attack detected`, {
      attackId,
      attackType,
      sourceIPs: recentIPs.length,
      requestsPerSecond: metrics.requestsPerSecond,
      severity: attack.severity
    });

    this.emit('attackDetected', attack);
    this.applyMitigation(attack);
  }

  /**
   * Calculate attack severity
   */
  private calculateSeverity(requestsPerSecond: number): DDoSAttack['severity'] {
    const threshold = this.config.detectionThreshold.requestsPerSecond;
    
    if (requestsPerSecond > threshold * 10) return 'critical';
    if (requestsPerSecond > threshold * 5) return 'high';
    if (requestsPerSecond > threshold * 2) return 'medium';
    return 'low';
  }

  /**
   * Apply mitigation measures
   */
  private applyMitigation(attack: DDoSAttack): void {
    const actions: string[] = [];

    // IP blocking
    if (this.config.mitigationActions.enableIPBlocking) {
      attack.sourceIPs.forEach(ip => {
        if (!this.config.whitelistedIPs.includes(ip)) {
          this.config.blacklistedIPs.push(ip);
          actions.push(`Blocked IP: ${ip}`);
        }
      });
    }

    // Rate limiting
    if (this.config.mitigationActions.enableRateLimit) {
      actions.push('Applied aggressive rate limiting');
    }

    // Challenge response
    if (this.config.mitigationActions.enableChallengeResponse) {
      actions.push('Enabled challenge-response for suspicious traffic');
    }

    // Traffic shaping
    if (this.config.mitigationActions.enableTrafficShaping) {
      actions.push('Applied traffic shaping rules');
    }

    attack.mitigationActions = actions;
    attack.mitigated = actions.length > 0;

    logger.info(`DDoSProtectionService: Applied mitigation for attack ${attack.id}`, {
      actions: actions.length,
      mitigationActions: actions
    });

    this.emit('mitigationApplied', { attack, actions });
  }

  /**
   * Start monitoring
   */
  private startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;

    // Monitor traffic patterns
    this.monitoringTimer = setInterval(() => {
      this.monitorTrafficPatterns();
    }, this.config.monitoringWindow);

    // Cleanup old data
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);

    logger.info('DDoSProtectionService: Monitoring started');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;

    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = undefined;
    }

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    logger.info('DDoSProtectionService: Monitoring stopped');
  }

  /**
   * Monitor traffic patterns
   */
  private monitorTrafficPatterns(): void {
    const now = Date.now();
    const activePatterns = Array.from(this.trafficPatterns.values())
      .filter(pattern => now - pattern.lastSeen.getTime() < 300000); // Active in last 5 minutes

    // Check for coordinated attacks
    const suspiciousPatterns = activePatterns.filter(pattern => pattern.suspicious);
    
    if (suspiciousPatterns.length > 10) {
      logger.warn(`DDoSProtectionService: Multiple suspicious patterns detected: ${suspiciousPatterns.length}`);
      
      // Check if this could be a coordinated attack
      const coordinatedAttack = this.detectCoordinatedAttack(suspiciousPatterns);
      if (coordinatedAttack) {
        this.triggerCoordinatedAttackDetection(suspiciousPatterns);
      }
    }

    // Update attack status
    this.updateAttackStatus();
  }

  /**
   * Detect coordinated attack
   */
  private detectCoordinatedAttack(patterns: TrafficPattern[]): boolean {
    if (patterns.length < 5) return false;

    // Check for similar timing
    const startTimes = patterns.map(p => p.firstSeen.getTime());
    const timeSpread = Math.max(...startTimes) - Math.min(...startTimes);
    
    // If attacks started within 2 minutes of each other
    if (timeSpread < 120000) {
      return true;
    }

    // Check for similar targets
    const allEndpoints = new Set<string>();
    patterns.forEach(pattern => {
      pattern.endpoints.forEach((_, endpoint) => allEndpoints.add(endpoint));
    });

    // If most patterns target the same endpoints
    const commonEndpoints = Array.from(allEndpoints).filter(endpoint => {
      const patternsWithEndpoint = patterns.filter(p => p.endpoints.has(endpoint));
      return patternsWithEndpoint.length / patterns.length > 0.7;
    });

    return commonEndpoints.length > 0;
  }

  /**
   * Trigger coordinated attack detection
   */
  private triggerCoordinatedAttackDetection(patterns: TrafficPattern[]): void {
    const attackId = this.generateAttackId();
    const sourceIPs = patterns.map(p => p.ip);
    const totalRequests = patterns.reduce((sum, p) => sum + p.requestCount, 0);
    const maxRPS = Math.max(...patterns.map(p => p.requestsPerSecond));

    const attack: DDoSAttack = {
      id: attackId,
      startTime: new Date(Math.min(...patterns.map(p => p.firstSeen.getTime()))),
      sourceIPs,
      targetEndpoints: Array.from(new Set(
        patterns.flatMap(p => Array.from(p.endpoints.keys()))
      )),
      requestCount: totalRequests,
      peakRPS: maxRPS,
      attackType: 'mixed',
      severity: this.calculateSeverity(maxRPS),
      mitigated: false,
      mitigationActions: []
    };

    this.activeAttacks.set(attackId, attack);

    logger.error(`DDoSProtectionService: Coordinated DDoS attack detected`, {
      attackId,
      sourceIPs: sourceIPs.length,
      totalRequests,
      peakRPS: maxRPS,
      severity: attack.severity
    });

    this.emit('coordinatedAttackDetected', attack);
    this.applyMitigation(attack);
  }

  /**
   * Update attack status
   */
  private updateAttackStatus(): void {
    const now = Date.now();
    
    for (const [attackId, attack] of this.activeAttacks.entries()) {
      if (attack.endTime) continue;

      // Check if attack has subsided
      const recentRequests = this.requestHistory.filter(req => 
        attack.sourceIPs.includes(req.ip) && 
        now - req.timestamp < 60000 // Last minute
      );

      const currentRPS = recentRequests.length / 60;
      
      // If RPS has dropped below threshold for 5 minutes, consider attack ended
      if (currentRPS < this.config.detectionThreshold.requestsPerSecond * 0.1) {
        const timeSinceStart = now - attack.startTime.getTime();
        if (timeSinceStart > 300000) { // 5 minutes
          attack.endTime = new Date();
          
          logger.info(`DDoSProtectionService: Attack ${attackId} has ended`, {
            duration: timeSinceStart,
            totalRequests: attack.requestCount,
            peakRPS: attack.peakRPS
          });

          this.emit('attackEnded', attack);
        }
      }
    }
  }

  /**
   * Cleanup old data
   */
  private cleanup(): void {
    const now = Date.now();
    let cleanedPatterns = 0;
    let cleanedAttacks = 0;

    // Clean old traffic patterns (older than 1 hour)
    for (const [ip, pattern] of this.trafficPatterns.entries()) {
      if (now - pattern.lastSeen.getTime() > 3600000) {
        this.trafficPatterns.delete(ip);
        cleanedPatterns++;
      }
    }

    // Clean old attacks (older than 24 hours)
    for (const [attackId, attack] of this.activeAttacks.entries()) {
      if (attack.endTime && now - attack.endTime.getTime() > 86400000) {
        this.activeAttacks.delete(attackId);
        cleanedAttacks++;
      }
    }

    // Clean request history (keep only last 5 minutes)
    const cutoff = now - 300000;
    const initialLength = this.requestHistory.length;
    this.requestHistory = this.requestHistory.filter(req => req.timestamp > cutoff);
    const cleanedRequests = initialLength - this.requestHistory.length;

    if (cleanedPatterns > 0 || cleanedAttacks > 0 || cleanedRequests > 0) {
      logger.debug(`DDoSProtectionService: Cleanup completed - Patterns: ${cleanedPatterns}, Attacks: ${cleanedAttacks}, Requests: ${cleanedRequests}`);
    }
  }

  /**
   * Get active attacks
   */
  getActiveAttacks(): DDoSAttack[] {
    return Array.from(this.activeAttacks.values())
      .filter(attack => !attack.endTime)
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  /**
   * Get attack history
   */
  getAttackHistory(limit: number = 50): DDoSAttack[] {
    return Array.from(this.activeAttacks.values())
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, limit);
  }

  /**
   * Get traffic patterns
   */
  getTrafficPatterns(suspicious: boolean = false): TrafficPattern[] {
    const patterns = Array.from(this.trafficPatterns.values());
    return suspicious 
      ? patterns.filter(p => p.suspicious)
      : patterns;
  }

  /**
   * Get DDoS protection statistics
   */
  getStats(): any {
    const now = Date.now();
    const activeAttacks = this.getActiveAttacks();
    const recentRequests = this.requestHistory.filter(req => now - req.timestamp < 300000);
    const uniqueIPs = new Set(recentRequests.map(req => req.ip)).size;

    return {
      enabled: this.config.enabled,
      monitoring: this.isMonitoring,
      activeAttacks: activeAttacks.length,
      totalAttacks: this.activeAttacks.size,
      trafficPatterns: this.trafficPatterns.size,
      suspiciousPatterns: Array.from(this.trafficPatterns.values()).filter(p => p.suspicious).length,
      recentTraffic: {
        requestsLast5Min: recentRequests.length,
        uniqueIPsLast5Min: uniqueIPs,
        requestsPerSecond: recentRequests.filter(req => now - req.timestamp < 1000).length
      },
      blacklistedIPs: this.config.blacklistedIPs.length,
      whitelistedIPs: this.config.whitelistedIPs.length,
      thresholds: this.config.detectionThreshold
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<DDoSConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.enabled !== undefined) {
      if (newConfig.enabled && !this.isMonitoring) {
        this.startMonitoring();
      } else if (!newConfig.enabled && this.isMonitoring) {
        this.stopMonitoring();
      }
    }

    logger.info('DDoSProtectionService: Configuration updated');
    this.emit('configUpdated', this.config);
  }

  /**
   * Whitelist IP
   */
  whitelistIP(ip: string): void {
    if (!this.config.whitelistedIPs.includes(ip)) {
      this.config.whitelistedIPs.push(ip);
      
      // Remove from blacklist if present
      const blacklistIndex = this.config.blacklistedIPs.indexOf(ip);
      if (blacklistIndex > -1) {
        this.config.blacklistedIPs.splice(blacklistIndex, 1);
      }

      logger.info(`DDoSProtectionService: IP whitelisted: ${ip}`);
      this.emit('ipWhitelisted', ip);
    }
  }

  /**
   * Blacklist IP
   */
  blacklistIP(ip: string): void {
    if (!this.config.blacklistedIPs.includes(ip) && !this.config.whitelistedIPs.includes(ip)) {
      this.config.blacklistedIPs.push(ip);
      logger.info(`DDoSProtectionService: IP blacklisted: ${ip}`);
      this.emit('ipBlacklisted', ip);
    }
  }

  /**
   * Remove IP from blacklist
   */
  removeFromBlacklist(ip: string): boolean {
    const index = this.config.blacklistedIPs.indexOf(ip);
    if (index > -1) {
      this.config.blacklistedIPs.splice(index, 1);
      logger.info(`DDoSProtectionService: IP removed from blacklist: ${ip}`);
      this.emit('ipRemovedFromBlacklist', ip);
      return true;
    }
    return false;
  }

  private generateAttackId(): string {
    return `ddos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopMonitoring();
    this.trafficPatterns.clear();
    this.activeAttacks.clear();
    this.requestHistory = [];
    logger.info('DDoSProtectionService: Destroyed');
  }
}

// Export singleton instance
export const ddosProtectionService = new DDoSProtectionService();
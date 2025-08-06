import { Pool } from 'pg';
import { RetentionEngineRepository } from '../../repositories/RetentionEngineRepository';
import { BaseService } from '../base/BaseService';
import { 
  UserChurnRisk, 
  RetentionCampaign, 
  RetentionAlert,
  EscalationRule,
  InterventionRecommendation
} from '../../models/RetentionEngine';
import { logger } from '../../config/logger';

export interface EscalationTrigger {
  type: 'risk_increase' | 'campaign_failure' | 'time_based' | 'engagement_drop' | 'revenue_impact';
  threshold: number;
  timeWindow: number; // hours
  conditions: EscalationCondition[];
}

export interface EscalationCondition {
  field: string;
  operator: 'greater_than' | 'less_than' | 'equals' | 'percentage_change';
  value: number;
  comparisonPeriod?: 'previous_day' | 'previous_week' | 'previous_month';
}

export interface EscalationAction {
  actionType: 'increase_offer' | 'change_channel' | 'personal_outreach' | 'executive_intervention' | 'emergency_campaign';
  priority: 'low' | 'medium' | 'high' | 'critical';
  parameters: Record<string, any>;
  cost: number;
  expectedImpact: number;
  timeframe: string;
}

export interface EscalationPlan {
  id: string;
  name: string;
  description: string;
  triggers: EscalationTrigger[];
  escalationLevels: EscalationLevel[];
  maxEscalationLevel: number;
  cooldownPeriod: number; // hours
  isActive: boolean;
  metadata: Record<string, any>;
}

export interface EscalationLevel {
  level: number;
  name: string;
  description: string;
  actions: EscalationAction[];
  successCriteria: SuccessCriteria;
  failureAction: 'escalate' | 'end' | 'repeat' | 'custom';
  maxAttempts: number;
}

export interface SuccessCriteria {
  metric: string;
  targetValue: number;
  timeframe: number; // hours
  measurementMethod: 'absolute' | 'percentage_change' | 'relative_to_baseline';
}

export class RetentionEscalationService extends BaseService {
  private retentionRepo: RetentionEngineRepository;
  
  private defaultEscalationPlans: EscalationPlan[] = [
    {
      id: 'high-risk-escalation',
      name: 'High Risk User Escalation',
      description: 'Escalation plan for users with high churn risk',
      triggers: [
        {
          type: 'risk_increase',
          threshold: 80,
          timeWindow: 24,
          conditions: [
            {
              field: 'churn_risk_score',
              operator: 'greater_than',
              value: 80
            }
          ]
        }
      ],
      escalationLevels: [
        {
          level: 1,
          name: 'Automated Intervention',
          description: 'Send personalized discount offer',
          actions: [
            {
              actionType: 'increase_offer',
              priority: 'medium',
              parameters: {
                discountIncrease: 10,
                maxDiscount: 25,
                validityDays: 7
              },
              cost: 50,
              expectedImpact: 60,
              timeframe: '24 hours'
            }
          ],
          successCriteria: {
            metric: 'user_engagement',
            targetValue: 1,
            timeframe: 48,
            measurementMethod: 'absolute'
          },
          failureAction: 'escalate',
          maxAttempts: 2
        },
        {
          level: 2,
          name: 'Multi-Channel Outreach',
          description: 'Contact user through multiple channels',
          actions: [
            {
              actionType: 'change_channel',
              priority: 'high',
              parameters: {
                channels: ['telegram', 'email', 'push'],
                personalizedMessage: true,
                includePhoneCall: false
              },
              cost: 100,
              expectedImpact: 75,
              timeframe: '12 hours'
            }
          ],
          successCriteria: {
            metric: 'user_response',
            targetValue: 1,
            timeframe: 72,
            measurementMethod: 'absolute'
          },
          failureAction: 'escalate',
          maxAttempts: 1
        },
        {
          level: 3,
          name: 'Personal Intervention',
          description: 'Direct personal outreach from customer success team',
          actions: [
            {
              actionType: 'personal_outreach',
              priority: 'critical',
              parameters: {
                assignToCSM: true,
                includePhoneCall: true,
                maxOfferValue: 50,
                executiveEscalation: false
              },
              cost: 200,
              expectedImpact: 85,
              timeframe: '4 hours'
            }
          ],
          successCriteria: {
            metric: 'user_reactivation',
            targetValue: 1,
            timeframe: 168,
            measurementMethod: 'absolute'
          },
          failureAction: 'end',
          maxAttempts: 1
        }
      ],
      maxEscalationLevel: 3,
      cooldownPeriod: 168, // 1 week
      isActive: true,
      metadata: {
        createdBy: 'system',
        lastUpdated: new Date()
      }
    }
  ];

  constructor(pool: Pool) {
    super();
    this.retentionRepo = new RetentionEngineRepository(pool);
  }

  // Monitor and trigger escalations
  async monitorEscalationTriggers(): Promise<void> {
    try {
      logger.info('Monitoring escalation triggers');

      for (const plan of this.defaultEscalationPlans) {
        if (!plan.isActive) continue;

        for (const trigger of plan.triggers) {
          await this.checkEscalationTrigger(plan, trigger);
        }
      }

      logger.info('Escalation monitoring completed');
    } catch (error) {
      logger.error('Error monitoring escalation triggers', { error: error.message });
    }
  }

  // Check individual escalation trigger
  private async checkEscalationTrigger(plan: EscalationPlan, trigger: EscalationTrigger): Promise<void> {
    try {
      const triggeredUsers = await this.findTriggeredUsers(trigger);
      
      if (triggeredUsers.length === 0) return;

      logger.info('Escalation trigger activated', { 
        planId: plan.id, 
        triggerType: trigger.type, 
        userCount: triggeredUsers.length 
      });

      for (const user of triggeredUsers) {
        await this.executeEscalationPlan(plan, user);
      }

    } catch (error) {
      logger.error('Error checking escalation trigger', { 
        planId: plan.id, 
        triggerType: trigger.type, 
        error: error.message 
      });
    }
  }

  // Find users that match escalation trigger conditions
  private async findTriggeredUsers(trigger: EscalationTrigger): Promise<UserChurnRisk[]> {
    try {
      const users: UserChurnRisk[] = [];

      switch (trigger.type) {
        case 'risk_increase':
          const highRiskUsers = await this.retentionRepo.getHighRiskUsers('high', 100);
          users.push(...highRiskUsers.filter(user => 
            user.churnRiskScore >= trigger.threshold
          ));
          break;

        case 'engagement_drop':
          const atRiskUsers = await this.retentionRepo.getUsersByActivityStatus('at_risk', 100);
          // Would implement engagement drop detection
          break;

        case 'campaign_failure':
          // Would check failed campaigns and affected users
          break;

        case 'time_based':
          // Would check users based on time criteria
          break;

        case 'revenue_impact':
          // Would check users with high revenue impact
          break;
      }

      return users.filter(user => this.evaluateEscalationConditions(user, trigger.conditions));
    } catch (error) {
      logger.error('Error finding triggered users', { 
        triggerType: trigger.type, 
        error: error.message 
      });
      return [];
    }
  }

  // Evaluate escalation conditions for a user
  private evaluateEscalationConditions(user: UserChurnRisk, conditions: EscalationCondition[]): boolean {
    for (const condition of conditions) {
      if (!this.evaluateCondition(user, condition)) {
        return false;
      }
    }
    return true;
  }

  // Evaluate individual condition
  private evaluateCondition(user: UserChurnRisk, condition: EscalationCondition): boolean {
    let fieldValue: number;

    switch (condition.field) {
      case 'churn_risk_score':
        fieldValue = user.churnRiskScore;
        break;
      case 'engagement_score':
        fieldValue = user.engagementScore;
        break;
      case 'days_since_last_activity':
        fieldValue = user.daysSinceLastActivity;
        break;
      case 'lifetime_value':
        fieldValue = user.lifetimeValue;
        break;
      default:
        return false;
    }

    switch (condition.operator) {
      case 'greater_than':
        return fieldValue > condition.value;
      case 'less_than':
        return fieldValue < condition.value;
      case 'equals':
        return fieldValue === condition.value;
      case 'percentage_change':
        // Would implement percentage change calculation
        return true;
      default:
        return false;
    }
  }

  // Execute escalation plan for user
  async executeEscalationPlan(plan: EscalationPlan, user: UserChurnRisk): Promise<void> {
    try {
      logger.info('Executing escalation plan', { 
        planId: plan.id, 
        userId: user.userId 
      });

      // Check if user is in cooldown period
      if (await this.isUserInCooldown(user.userId, plan.cooldownPeriod)) {
        logger.info('User in cooldown period, skipping escalation', { 
          userId: user.userId, 
          planId: plan.id 
        });
        return;
      }

      // Get current escalation level for user
      const currentLevel = await this.getCurrentEscalationLevel(user.userId, plan.id);
      
      if (currentLevel >= plan.maxEscalationLevel) {
        logger.info('User reached max escalation level', { 
          userId: user.userId, 
          currentLevel, 
          maxLevel: plan.maxEscalationLevel 
        });
        return;
      }

      // Execute next escalation level
      const nextLevel = plan.escalationLevels[currentLevel];
      const success = await this.executeEscalationLevel(plan, user, nextLevel);

      if (success) {
        logger.info('Escalation level successful', { 
          planId: plan.id, 
          userId: user.userId, 
          level: nextLevel.level 
        });
        await this.recordEscalationSuccess(user.userId, plan.id, nextLevel.level);
      } else {
        logger.info('Escalation level failed', { 
          planId: plan.id, 
          userId: user.userId, 
          level: nextLevel.level 
        });
        await this.handleEscalationFailure(plan, user, nextLevel);
      }

    } catch (error) {
      logger.error('Error executing escalation plan', { 
        planId: plan.id, 
        userId: user.userId, 
        error: error.message 
      });
    }
  }

  // Execute individual escalation level
  private async executeEscalationLevel(
    plan: EscalationPlan, 
    user: UserChurnRisk, 
    level: EscalationLevel
  ): Promise<boolean> {
    try {
      logger.info('Executing escalation level', { 
        planId: plan.id, 
        userId: user.userId, 
        level: level.level 
      });

      // Execute all actions in the level
      for (const action of level.actions) {
        await this.executeEscalationAction(user, action);
      }

      // Wait for success criteria evaluation period
      await this.waitForSuccessCriteria(level.successCriteria);

      // Check if success criteria met
      const success = await this.evaluateSuccessCriteria(user, level.successCriteria);

      return success;
    } catch (error) {
      logger.error('Error executing escalation level', { 
        planId: plan.id, 
        userId: user.userId, 
        level: level.level, 
        error: error.message 
      });
      return false;
    }
  }

  // Execute escalation action
  private async executeEscalationAction(user: UserChurnRisk, action: EscalationAction): Promise<void> {
    try {
      logger.info('Executing escalation action', { 
        userId: user.userId, 
        actionType: action.actionType 
      });

      switch (action.actionType) {
        case 'increase_offer':
          await this.increaseOffer(user, action.parameters);
          break;

        case 'change_channel':
          await this.changeChannel(user, action.parameters);
          break;

        case 'personal_outreach':
          await this.personalOutreach(user, action.parameters);
          break;

        case 'executive_intervention':
          await this.executiveIntervention(user, action.parameters);
          break;

        case 'emergency_campaign':
          await this.emergencyCampaign(user, action.parameters);
          break;

        default:
          logger.warn('Unknown escalation action type', { actionType: action.actionType });
      }

      // Record action execution
      await this.recordActionExecution(user.userId, action);

    } catch (error) {
      logger.error('Error executing escalation action', { 
        userId: user.userId, 
        actionType: action.actionType, 
        error: error.message 
      });
    }
  }

  // Increase offer for user
  private async increaseOffer(user: UserChurnRisk, parameters: Record<string, any>): Promise<void> {
    const { discountIncrease, maxDiscount, validityDays } = parameters;
    
    // Calculate new discount amount
    const currentDiscount = this.getCurrentUserDiscount(user.userId);
    const newDiscount = Math.min(currentDiscount + discountIncrease, maxDiscount);
    
    // Send increased offer
    const message = `🎉 Special Escalated Offer!

We really want you back! Here's an even better deal:

💰 ${newDiscount}% OFF your next purchase
⏰ Valid for ${validityDays} days
🎫 Code: ESCALATE${user.userId.slice(-4).toUpperCase()}

This is our best offer - don't miss out! 👆`;

    await this.sendTelegramMessage(user.userId, message);
    
    logger.info('Increased offer sent', { 
      userId: user.userId, 
      newDiscount, 
      validityDays 
    });
  }

  // Change communication channel
  private async changeChannel(user: UserChurnRisk, parameters: Record<string, any>): Promise<void> {
    const { channels, personalizedMessage, includePhoneCall } = parameters;
    
    for (const channel of channels) {
      const message = personalizedMessage ? 
        await this.getPersonalizedMessage(user) : 
        this.getGenericMessage();
      
      switch (channel) {
        case 'telegram':
          await this.sendTelegramMessage(user.userId, message);
          break;
        case 'email':
          await this.sendEmailMessage(user.userId, message);
          break;
        case 'push':
          await this.sendPushNotification(user.userId, message);
          break;
      }
    }
    
    if (includePhoneCall) {
      await this.schedulePhoneCall(user.userId);
    }
    
    logger.info('Multi-channel outreach executed', { 
      userId: user.userId, 
      channels, 
      includePhoneCall 
    });
  }

  // Personal outreach from customer success
  private async personalOutreach(user: UserChurnRisk, parameters: Record<string, any>): Promise<void> {
    const { assignToCSM, includePhoneCall, maxOfferValue, executiveEscalation } = parameters;
    
    // Assign to customer success manager
    if (assignToCSM) {
      await this.assignToCSM(user.userId, maxOfferValue);
    }
    
    // Schedule phone call
    if (includePhoneCall) {
      await this.scheduleUrgentPhoneCall(user.userId);
    }
    
    // Create alert for team
    await this.createEscalationAlert(user, 'personal_outreach', parameters);
    
    logger.info('Personal outreach initiated', { 
      userId: user.userId, 
      assignToCSM, 
      includePhoneCall 
    });
  }

  // Executive intervention
  private async executiveIntervention(user: UserChurnRisk, parameters: Record<string, any>): Promise<void> {
    // Create high-priority alert for executives
    await this.createExecutiveAlert(user, parameters);
    
    // Send executive-level personalized message
    const executiveMessage = await this.getExecutiveMessage(user);
    await this.sendTelegramMessage(user.userId, executiveMessage);
    
    logger.info('Executive intervention triggered', { userId: user.userId });
  }

  // Emergency campaign
  private async emergencyCampaign(user: UserChurnRisk, parameters: Record<string, any>): Promise<void> {
    // Create emergency retention campaign for this user
    const campaignConfig = {
      name: `Emergency Retention - ${user.userId}`,
      targetUsers: [user.userId],
      maxBudget: parameters.maxBudget || 500,
      urgency: 'critical'
    };
    
    await this.createEmergencyCampaign(campaignConfig);
    
    logger.info('Emergency campaign created', { userId: user.userId });
  }

  // Helper methods (mock implementations)
  private async isUserInCooldown(userId: string, cooldownHours: number): Promise<boolean> {
    // Mock implementation - would check actual cooldown records
    return false;
  }

  private async getCurrentEscalationLevel(userId: string, planId: string): Promise<number> {
    // Mock implementation - would check actual escalation history
    return 0;
  }

  private async waitForSuccessCriteria(criteria: SuccessCriteria): Promise<void> {
    // Mock implementation - would implement actual waiting logic
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  private async evaluateSuccessCriteria(user: UserChurnRisk, criteria: SuccessCriteria): Promise<boolean> {
    // Mock implementation - would evaluate actual success criteria
    return Math.random() > 0.6; // 40% success rate
  }

  private async recordEscalationSuccess(userId: string, planId: string, level: number): Promise<void> {
    logger.info('Recording escalation success', { userId, planId, level });
  }

  private async handleEscalationFailure(plan: EscalationPlan, user: UserChurnRisk, level: EscalationLevel): Promise<void> {
    switch (level.failureAction) {
      case 'escalate':
        // Will be handled in next monitoring cycle
        break;
      case 'end':
        await this.endEscalation(user.userId, plan.id);
        break;
      case 'repeat':
        await this.repeatEscalationLevel(plan, user, level);
        break;
    }
  }

  private async recordActionExecution(userId: string, action: EscalationAction): Promise<void> {
    logger.info('Recording action execution', { userId, actionType: action.actionType });
  }

  private getCurrentUserDiscount(userId: string): number {
    // Mock implementation
    return 15; // Current 15% discount
  }

  private async getPersonalizedMessage(user: UserChurnRisk): Promise<string> {
    return `Hi ${user.userId}, we've noticed you haven't been active lately. We'd love to have you back!`;
  }

  private getGenericMessage(): string {
    return "We miss you! Come back and enjoy exclusive offers.";
  }

  private async sendTelegramMessage(userId: string, message: string): Promise<void> {
    logger.info('Sending Telegram message', { userId, messageLength: message.length });
  }

  private async sendEmailMessage(userId: string, message: string): Promise<void> {
    logger.info('Sending email message', { userId, messageLength: message.length });
  }

  private async sendPushNotification(userId: string, message: string): Promise<void> {
    logger.info('Sending push notification', { userId, messageLength: message.length });
  }

  private async schedulePhoneCall(userId: string): Promise<void> {
    logger.info('Scheduling phone call', { userId });
  }

  private async scheduleUrgentPhoneCall(userId: string): Promise<void> {
    logger.info('Scheduling urgent phone call', { userId });
  }

  private async assignToCSM(userId: string, maxOfferValue: number): Promise<void> {
    logger.info('Assigning to CSM', { userId, maxOfferValue });
  }

  private async createEscalationAlert(user: UserChurnRisk, type: string, parameters: any): Promise<void> {
    const alert: Omit<RetentionAlert, 'id' | 'createdAt' | 'updatedAt'> = {
      alertType: 'churn_spike',
      severity: 'high',
      title: `Escalation Required: ${type}`,
      description: `User ${user.userId} requires ${type} intervention`,
      affectedUsers: 1,
      metric: 'churn_risk_score',
      currentValue: user.churnRiskScore,
      thresholdValue: 70,
      deviation: user.churnRiskScore - 70,
      detectedAt: new Date(),
      status: 'new',
      relatedCampaigns: [],
      recommendedActions: [`Execute ${type} for user ${user.userId}`],
      metadata: { escalationType: type, parameters }
    };

    await this.retentionRepo.createRetentionAlert(alert);
  }

  private async createExecutiveAlert(user: UserChurnRisk, parameters: any): Promise<void> {
    logger.info('Creating executive alert', { userId: user.userId });
  }

  private async getExecutiveMessage(user: UserChurnRisk): Promise<string> {
    return `Dear valued customer, as a high-value user, we want to personally ensure your satisfaction...`;
  }

  private async createEmergencyCampaign(config: any): Promise<void> {
    logger.info('Creating emergency campaign', { config });
  }

  private async endEscalation(userId: string, planId: string): Promise<void> {
    logger.info('Ending escalation', { userId, planId });
  }

  private async repeatEscalationLevel(plan: EscalationPlan, user: UserChurnRisk, level: EscalationLevel): Promise<void> {
    logger.info('Repeating escalation level', { userId: user.userId, level: level.level });
  }
}
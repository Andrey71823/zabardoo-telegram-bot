import { BaseService } from '../base/BaseService';
import { Request, Response } from 'express';
import { NotificationRepository } from '../../repositories/NotificationRepository';
import { UserRepository } from '../../repositories/UserRepository';
import { RecommendationRepository } from '../../repositories/RecommendationRepository';
import { pgPool } from '../../config/database';
import { 
  NotificationTrigger,
  NotificationTemplate,
  ProactiveNotification,
  UserNotificationPreferences,
  SmartTiming,
  BehavioralPattern
} from '../../models/Notification';
import config from '../../config';

export class ProactiveNotificationService extends BaseService {
  private notificationRepository: NotificationRepository;
  private userRepository: UserRepository;
  private recommendationRepository: RecommendationRepository;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor() {
    super('proactive-notification-service', 3010);
    
    this.notificationRepository = new NotificationRepository(pgPool);
    this.userRepository = new UserRepository(pgPool);
    this.recommendationRepository = new RecommendationRepository(pgPool);
  }

  protected setupServiceRoutes(): void {
    // Trigger Management
    this.app.post('/triggers', this.createTrigger.bind(this));
    this.app.get('/triggers', this.getTriggers.bind(this));
    this.app.put('/triggers/:triggerId', this.updateTrigger.bind(this));
    this.app.delete('/triggers/:triggerId', this.deleteTrigger.bind(this));

    // Template Management
    this.app.post('/templates', this.createTemplate.bind(this));
    this.app.get('/templates', this.getTemplates.bind(this));
    this.app.get('/templates/trigger/:triggerId', this.getTemplatesByTrigger.bind(this));

    // Notification Management
    this.app.post('/notifications', this.createNotification.bind(this));
    this.app.get('/notifications/user/:userId', this.getUserNotifications.bind(this));
    this.app.put('/notifications/:notificationId/status', this.updateNotificationStatus.bind(this));

    // User Preferences
    this.app.get('/preferences/:userId', this.getUserPreferences.bind(this));
    this.app.put('/preferences/:userId', this.updateUserPreferences.bind(this));

    // Smart Timing
    this.app.get('/timing/:userId/:channel', this.getSmartTiming.bind(this));
    this.app.post('/timing/calculate', this.calculateOptimalTiming.bind(this));

    // Behavioral Analysis
    this.app.post('/analyze/behavior', this.analyzeBehavior.bind(this));
    this.app.post('/analyze/churn-risk', this.analyzeChurnRisk.bind(this));
    this.app.post('/analyze/engagement', this.analyzeEngagement.bind(this));

    // Campaign Management
    this.app.post('/campaigns', this.createCampaign.bind(this));
    this.app.get('/campaigns', this.getCampaigns.bind(this));
    this.app.post('/campaigns/:campaignId/start', this.startCampaign.bind(this));

    // Analytics
    this.app.get('/analytics/performance', this.getPerformanceAnalytics.bind(this));
    this.app.get('/analytics/engagement', this.getEngagementAnalytics.bind(this));

    // Processing Control
    this.app.post('/processing/start', this.startProcessing.bind(this));
    this.app.post('/processing/stop', this.stopProcessing.bind(this));
    this.app.get('/processing/status', this.getProcessingStatus.bind(this));
  }

  protected async checkServiceHealth(): Promise<boolean> {
    try {
      const triggers = await this.notificationRepository.getActiveTriggers();
      return true;
    } catch (error) {
      this.logger.error('Proactive Notification Service health check failed:', error);
      return false;
    }
  }

  // Trigger Management
  private async createTrigger(req: Request, res: Response): Promise<void> {
    try {
      const triggerData: Partial<NotificationTrigger> = req.body;
      
      if (!triggerData.name || !triggerData.type) {
        res.status(400).json({ error: 'Name and type are required' });
        return;
      }

      const trigger = await this.notificationRepository.createNotificationTrigger(triggerData);
      
      this.logger.info(`Created notification trigger: ${trigger.name}`);
      res.status(201).json(trigger);
    } catch (error) {
      this.logger.error('Error creating trigger:', error);
      res.status(500).json({ error: 'Failed to create trigger' });
    }
  }

  private async getTriggers(req: Request, res: Response): Promise<void> {
    try {
      const triggers = await this.notificationRepository.getActiveTriggers();
      res.json(triggers);
    } catch (error) {
      this.logger.error('Error getting triggers:', error);
      res.status(500).json({ error: 'Failed to get triggers' });
    }
  }

  // Template Management
  private async createTemplate(req: Request, res: Response): Promise<void> {
    try {
      const templateData: Partial<NotificationTemplate> = req.body;
      
      if (!templateData.trigger_id || !templateData.name || !templateData.channel) {
        res.status(400).json({ error: 'Trigger ID, name, and channel are required' });
        return;
      }

      const template = await this.notificationRepository.createNotificationTemplate(templateData);
      
      this.logger.info(`Created notification template: ${template.name}`);
      res.status(201).json(template);
    } catch (error) {
      this.logger.error('Error creating template:', error);
      res.status(500).json({ error: 'Failed to create template' });
    }
  }

  private async getTemplatesByTrigger(req: Request, res: Response): Promise<void> {
    try {
      const { triggerId } = req.params;
      const templates = await this.notificationRepository.getTemplatesByTrigger(triggerId);
      res.json(templates);
    } catch (error) {
      this.logger.error('Error getting templates by trigger:', error);
      res.status(500).json({ error: 'Failed to get templates' });
    }
  }

  // Behavioral Analysis
  private async analyzeBehavior(req: Request, res: Response): Promise<void> {
    try {
      const { userId, timeWindowHours = 24 } = req.body;
      
      if (!userId) {
        res.status(400).json({ error: 'userId is required' });
        return;
      }

      const behaviorAnalysis = await this.performBehavioralAnalysis(userId, timeWindowHours);
      
      res.json({
        userId,
        timeWindow: timeWindowHours,
        analysis: behaviorAnalysis,
        triggeredPatterns: this.identifyTriggeredPatterns(behaviorAnalysis),
        recommendations: this.generateBehavioralRecommendations(behaviorAnalysis)
      });
    } catch (error) {
      this.logger.error('Error analyzing behavior:', error);
      res.status(500).json({ error: 'Failed to analyze behavior' });
    }
  }

  private async analyzeChurnRisk(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        res.status(400).json({ error: 'userId is required' });
        return;
      }

      const churnRisk = await this.calculateChurnRisk(userId);
      
      res.json({
        userId,
        churnRisk: {
          score: churnRisk.score,
          level: churnRisk.level,
          factors: churnRisk.factors,
          recommendations: churnRisk.recommendations
        },
        suggestedActions: this.generateChurnPreventionActions(churnRisk)
      });
    } catch (error) {
      this.logger.error('Error analyzing churn risk:', error);
      res.status(500).json({ error: 'Failed to analyze churn risk' });
    }
  }

  // Smart Timing
  private async getSmartTiming(req: Request, res: Response): Promise<void> {
    try {
      const { userId, channel } = req.params;
      
      const timing = await this.notificationRepository.getSmartTiming(userId, channel);
      
      if (!timing) {
        // Calculate timing if not exists
        const calculatedTiming = await this.calculateOptimalTimingForUser(userId, channel);
        res.json(calculatedTiming);
      } else {
        res.json(timing);
      }
    } catch (error) {
      this.logger.error('Error getting smart timing:', error);
      res.status(500).json({ error: 'Failed to get smart timing' });
    }
  }

  private async calculateOptimalTiming(req: Request, res: Response): Promise<void> {
    try {
      const { userId, channel } = req.body;
      
      if (!userId || !channel) {
        res.status(400).json({ error: 'userId and channel are required' });
        return;
      }

      const timing = await this.calculateOptimalTimingForUser(userId, channel);
      
      res.json({
        userId,
        channel,
        timing,
        nextOptimalTime: this.getNextOptimalTime(timing),
        confidence: timing.confidence_score
      });
    } catch (error) {
      this.logger.error('Error calculating optimal timing:', error);
      res.status(500).json({ error: 'Failed to calculate optimal timing' });
    }
  }

  // User Preferences
  private async getUserPreferences(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      
      const preferences = await this.notificationRepository.getUserNotificationPreferences(userId);
      
      if (!preferences) {
        // Return default preferences
        const defaultPreferences = this.getDefaultNotificationPreferences(userId);
        res.json(defaultPreferences);
      } else {
        res.json(preferences);
      }
    } catch (error) {
      this.logger.error('Error getting user preferences:', error);
      res.status(500).json({ error: 'Failed to get user preferences' });
    }
  }

  private async updateUserPreferences(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const preferences = req.body;
      
      const updatedPreferences = await this.notificationRepository.updateUserNotificationPreferences(userId, preferences);
      
      this.logger.info(`Updated notification preferences for user ${userId}`);
      res.json(updatedPreferences);
    } catch (error) {
      this.logger.error('Error updating user preferences:', error);
      res.status(500).json({ error: 'Failed to update user preferences' });
    }
  }

  // Processing Control
  private async startProcessing(req: Request, res: Response): Promise<void> {
    try {
      if (this.processingInterval) {
        res.status(400).json({ error: 'Processing is already running' });
        return;
      }

      this.startNotificationProcessing();
      
      res.json({ 
        message: 'Notification processing started',
        status: 'running'
      });
    } catch (error) {
      this.logger.error('Error starting processing:', error);
      res.status(500).json({ error: 'Failed to start processing' });
    }
  }

  private async stopProcessing(req: Request, res: Response): Promise<void> {
    try {
      if (!this.processingInterval) {
        res.status(400).json({ error: 'Processing is not running' });
        return;
      }

      clearInterval(this.processingInterval);
      this.processingInterval = null;
      
      res.json({ 
        message: 'Notification processing stopped',
        status: 'stopped'
      });
    } catch (error) {
      this.logger.error('Error stopping processing:', error);
      res.status(500).json({ error: 'Failed to stop processing' });
    }
  }

  private async getProcessingStatus(req: Request, res: Response): Promise<void> {
    try {
      const isRunning = this.processingInterval !== null;
      
      res.json({
        status: isRunning ? 'running' : 'stopped',
        uptime: isRunning ? Date.now() - (this.processingInterval as any)?._idleStart : 0
      });
    } catch (error) {
      this.logger.error('Error getting processing status:', error);
      res.status(500).json({ error: 'Failed to get processing status' });
    }
  }

  // Core Processing Logic
  private startNotificationProcessing(): void {
    this.processingInterval = setInterval(async () => {
      try {
        await this.processScheduledNotifications();
        await this.evaluateBehavioralTriggers();
        await this.updateSmartTimingData();
      } catch (error) {
        this.logger.error('Error in notification processing cycle:', error);
      }
    }, 60000); // Run every minute

    this.logger.info('Started proactive notification processing');
  }

  private async processScheduledNotifications(): Promise<void> {
    try {
      const scheduledNotifications = await this.notificationRepository.getScheduledNotifications(50);
      
      for (const notification of scheduledNotifications) {
        await this.sendNotification(notification);
      }
    } catch (error) {
      this.logger.error('Error processing scheduled notifications:', error);
    }
  }

  private async evaluateBehavioralTriggers(): Promise<void> {
    try {
      const triggers = await this.notificationRepository.getActiveTriggers();
      const behavioralTriggers = triggers.filter(t => t.type === 'behavioral');
      
      for (const trigger of behavioralTriggers) {
        await this.evaluateTriggerForAllUsers(trigger);
      }
    } catch (error) {
      this.logger.error('Error evaluating behavioral triggers:', error);
    }
  }

  private async sendNotification(notification: ProactiveNotification): Promise<void> {
    try {
      // Update status to sending
      await this.notificationRepository.updateNotificationStatus(notification.id, 'sent');
      
      // Here you would integrate with actual notification channels
      // For now, we'll simulate sending
      this.logger.info(`Sent notification ${notification.id} to user ${notification.user_id} via ${notification.channel}`);
      
      // Update tracking data
      const trackingData = {
        ...notification.tracking,
        sent_at: new Date()
      };
      
      await this.notificationRepository.updateNotificationStatus(notification.id, 'delivered', trackingData);
    } catch (error) {
      this.logger.error(`Error sending notification ${notification.id}:`, error);
      await this.notificationRepository.updateNotificationStatus(notification.id, 'failed');
    }
  }

  // Helper Methods
  private async performBehavioralAnalysis(userId: string, timeWindowHours: number): Promise<any> {
    // Simulate behavioral analysis
    return {
      activity_level: Math.random(),
      engagement_score: Math.random(),
      purchase_intent: Math.random(),
      category_interests: ['Electronics', 'Fashion'],
      last_active: new Date(Date.now() - Math.random() * timeWindowHours * 60 * 60 * 1000),
      session_count: Math.floor(Math.random() * 10),
      avg_session_duration: Math.floor(Math.random() * 300)
    };
  }

  private identifyTriggeredPatterns(analysis: any): string[] {
    const patterns = [];
    
    if (analysis.activity_level < 0.3) {
      patterns.push('low_activity');
    }
    if (analysis.engagement_score > 0.8) {
      patterns.push('high_engagement');
    }
    if (analysis.purchase_intent > 0.7) {
      patterns.push('purchase_intent');
    }
    
    return patterns;
  }

  private generateBehavioralRecommendations(analysis: any): string[] {
    const recommendations = [];
    
    if (analysis.activity_level < 0.3) {
      recommendations.push('Send re-engagement notification');
    }
    if (analysis.purchase_intent > 0.7) {
      recommendations.push('Send targeted coupon recommendations');
    }
    
    return recommendations;
  }

  private async calculateChurnRisk(userId: string): Promise<any> {
    // Simulate churn risk calculation
    const score = Math.random();
    let level = 'low';
    
    if (score > 0.7) level = 'high';
    else if (score > 0.4) level = 'medium';
    
    return {
      score,
      level,
      factors: ['inactivity', 'low_engagement'],
      recommendations: ['Send personalized offers', 'Improve content relevance']
    };
  }

  private generateChurnPreventionActions(churnRisk: any): string[] {
    const actions = [];
    
    if (churnRisk.level === 'high') {
      actions.push('Send immediate retention campaign');
      actions.push('Offer exclusive discount');
    }
    
    return actions;
  }

  private async calculateOptimalTimingForUser(userId: string, channel: string): Promise<SmartTiming> {
    // Simulate smart timing calculation
    const optimalHours = [9, 12, 18, 21]; // Default optimal hours
    const engagementPatterns = {
      hourly_scores: Array.from({length: 24}, () => Math.random()),
      daily_scores: Array.from({length: 7}, () => Math.random()),
      seasonal_adjustments: { 'winter': 1.1, 'summer': 0.9 }
    };
    
    const timing: SmartTiming = {
      user_id: userId,
      channel,
      optimal_hours: optimalHours,
      engagement_patterns: engagementPatterns,
      last_calculated: new Date(),
      confidence_score: 0.75
    };
    
    await this.notificationRepository.updateSmartTiming(timing);
    return timing;
  }

  private getNextOptimalTime(timing: SmartTiming): Date {
    const now = new Date();
    const currentHour = now.getHours();
    
    // Find next optimal hour
    const nextOptimalHour = timing.optimal_hours.find(hour => hour > currentHour) || timing.optimal_hours[0];
    
    const nextTime = new Date(now);
    if (nextOptimalHour <= currentHour) {
      nextTime.setDate(nextTime.getDate() + 1);
    }
    nextTime.setHours(nextOptimalHour, 0, 0, 0);
    
    return nextTime;
  }

  private getDefaultNotificationPreferences(userId: string): UserNotificationPreferences {
    return {
      id: '',
      user_id: userId,
      channels: {
        telegram: true,
        push: true,
        email: false,
        sms: false
      },
      categories: {
        promotional: true,
        recommendations: true,
        alerts: true,
        updates: false
      },
      frequency: {
        max_per_day: 5,
        max_per_week: 20,
        quiet_hours: {
          start: '22:00',
          end: '08:00',
          timezone: 'Asia/Kolkata'
        }
      },
      personalization: {
        use_ai_optimization: true,
        preferred_language: 'en',
        content_style: 'friendly'
      },
      created_at: new Date(),
      updated_at: new Date()
    };
  }

  private async evaluateTriggerForAllUsers(trigger: NotificationTrigger): Promise<void> {
    // This would evaluate the trigger against all users
    // For now, we'll simulate this
    this.logger.info(`Evaluating trigger ${trigger.name} for all users`);
  }

  private async updateSmartTimingData(): Promise<void> {
    // This would update smart timing data based on recent user interactions
    this.logger.info('Updating smart timing data');
  }

  // Placeholder methods for missing endpoints
  private async updateTrigger(req: Request, res: Response): Promise<void> {
    res.json({ message: 'Update trigger not implemented yet' });
  }

  private async deleteTrigger(req: Request, res: Response): Promise<void> {
    res.json({ message: 'Delete trigger not implemented yet' });
  }

  private async getTemplates(req: Request, res: Response): Promise<void> {
    res.json({ message: 'Get templates not implemented yet' });
  }

  private async createNotification(req: Request, res: Response): Promise<void> {
    res.json({ message: 'Create notification not implemented yet' });
  }

  private async getUserNotifications(req: Request, res: Response): Promise<void> {
    res.json({ message: 'Get user notifications not implemented yet' });
  }

  private async updateNotificationStatus(req: Request, res: Response): Promise<void> {
    res.json({ message: 'Update notification status not implemented yet' });
  }

  private async analyzeEngagement(req: Request, res: Response): Promise<void> {
    res.json({ message: 'Analyze engagement not implemented yet' });
  }

  private async createCampaign(req: Request, res: Response): Promise<void> {
    res.json({ message: 'Create campaign not implemented yet' });
  }

  private async getCampaigns(req: Request, res: Response): Promise<void> {
    res.json({ message: 'Get campaigns not implemented yet' });
  }

  private async startCampaign(req: Request, res: Response): Promise<void> {
    res.json({ message: 'Start campaign not implemented yet' });
  }

  private async getPerformanceAnalytics(req: Request, res: Response): Promise<void> {
    res.json({ message: 'Get performance analytics not implemented yet' });
  }

  private async getEngagementAnalytics(req: Request, res: Response): Promise<void> {
    res.json({ message: 'Get engagement analytics not implemented yet' });
  }
}

// Start service if run directly
if (require.main === module) {
  const service = new ProactiveNotificationService();
  service.setupGracefulShutdown();
  service.start();
}
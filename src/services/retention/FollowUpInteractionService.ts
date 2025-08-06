import { Pool } from 'pg';
import { RetentionEngineRepository } from '../../repositories/RetentionEngineRepository';
import { TrafficManagerRepository } from '../../repositories/TrafficManagerRepository';
import { UserRepository } from '../../repositories/UserRepository';
import { RecommendationRepository } from '../../repositories/RecommendationRepository';
import { BaseService } from '../base/BaseService';
import { 
  RetentionCampaign, 
  CampaignAction,
  UserLifecycleStage
} from '../../models/RetentionEngine';
import { ConversionEvent } from '../../models/TrafficManager';
import { logger } from '../../config/logger';

export interface FollowUpConfig {
  type: 'post_purchase' | 'post_signup' | 'seasonal' | 'product_recommendation' | 'loyalty_program';
  triggerEvent: 'purchase_completed' | 'user_registered' | 'season_start' | 'product_viewed' | 'milestone_reached';
  delay: number; // hours
  conditions?: FollowUpCondition[];
  personalization: PersonalizationConfig;
  content: FollowUpContent;
  frequency: 'once' | 'recurring';
  maxOccurrences?: number;
}

export interface FollowUpCondition {
  field: string;
  operator: 'equals' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
}

export interface PersonalizationConfig {
  useUserName: boolean;
  includePurchaseHistory: boolean;
  includeRecommendations: boolean;
  includePersonalizedOffers: boolean;
  dynamicContent: boolean;
}

export interface FollowUpContent {
  subject?: string;
  message: string;
  callToAction: string;
  attachments?: FollowUpAttachment[];
  offers?: FollowUpOffer[];
  recommendations?: ProductRecommendation[];
}

export interface FollowUpAttachment {
  type: 'image' | 'document' | 'video';
  url: string;
  description?: string;
}

export interface FollowUpOffer {
  type: 'discount' | 'cashback' | 'free_shipping' | 'bonus_points';
  value: number;
  description: string;
  validUntil: Date;
  conditions: string[];
}

export interface ProductRecommendation {
  productId: string;
  productName: string;
  category: string;
  price: number;
  discountPrice?: number;
  reason: string;
  confidence: number;
}

export interface FollowUpExecution {
  id: string;
  userId: string;
  followUpType: string;
  triggerEvent: string;
  scheduledAt: Date;
  executedAt?: Date;
  status: 'scheduled' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'converted' | 'failed' | 'cancelled';
  content: FollowUpContent;
  response?: FollowUpResponse;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface FollowUpResponse {
  opened: boolean;
  openedAt?: Date;
  clicked: boolean;
  clickedAt?: Date;
  converted: boolean;
  convertedAt?: Date;
  conversionValue?: number;
  feedback?: string;
}

export interface SeasonalCampaign {
  id: string;
  name: string;
  season: 'spring' | 'summer' | 'monsoon' | 'winter' | 'festival' | 'custom';
  startDate: Date;
  endDate: Date;
  targetSegments: string[];
  content: SeasonalContent;
  performance: SeasonalPerformance;
  isActive: boolean;
}

export interface SeasonalContent {
  theme: string;
  colors: string[];
  images: string[];
  messages: SeasonalMessage[];
  offers: SeasonalOffer[];
}

export interface SeasonalMessage {
  segment: string;
  message: string;
  callToAction: string;
  urgency: 'low' | 'medium' | 'high';
}

export interface SeasonalOffer {
  name: string;
  description: string;
  discountType: 'percentage' | 'fixed' | 'bogo' | 'bundle';
  discountValue: number;
  categories: string[];
  validUntil: Date;
  limitPerUser: number;
}

export interface SeasonalPerformance {
  targetUsers: number;
  reachedUsers: number;
  engagementRate: number;
  conversionRate: number;
  revenue: number;
  roi: number;
}

export class FollowUpInteractionService extends BaseService {
  private retentionRepo: RetentionEngineRepository;
  private trafficRepo: TrafficManagerRepository;
  private userRepo: UserRepository;
  private recommendationRepo: RecommendationRepository;

  constructor(pool: Pool) {
    super();
    this.retentionRepo = new RetentionEngineRepository(pool);
    this.trafficRepo = new TrafficManagerRepository(pool);
    this.userRepo = new UserRepository(pool);
    this.recommendationRepo = new RecommendationRepository(pool);
  }

  // Schedule follow-up interaction
  async scheduleFollowUp(userId: string, config: FollowUpConfig): Promise<FollowUpExecution> {
    try {
      logger.info('Scheduling follow-up interaction', { userId, type: config.type });

      // Check if user meets conditions
      if (config.conditions && !(await this.checkConditions(userId, config.conditions))) {
        throw new Error('User does not meet follow-up conditions');
      }

      // Generate personalized content
      const personalizedContent = await this.generatePersonalizedContent(userId, config);

      // Calculate execution time
      const scheduledAt = new Date(Date.now() + config.delay * 60 * 60 * 1000);

      const followUpExecution: Omit<FollowUpExecution, 'id' | 'createdAt' | 'updatedAt'> = {
        userId,
        followUpType: config.type,
        triggerEvent: config.triggerEvent,
        scheduledAt,
        status: 'scheduled',
        content: personalizedContent,
        metadata: {
          originalConfig: config,
          personalized: true,
          generatedAt: new Date()
        }
      };

      // In a real implementation, this would save to database
      const execution = {
        id: `followup_${Date.now()}_${userId}`,
        ...followUpExecution,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      logger.info('Follow-up interaction scheduled', { 
        executionId: execution.id, 
        scheduledAt 
      });

      return execution;
    } catch (error) {
      logger.error('Error scheduling follow-up interaction', { 
        userId, 
        error: error.message 
      });
      throw error;
    }
  }

  // Send post-purchase follow-up
  async sendPostPurchaseFollowUp(conversionEvent: ConversionEvent): Promise<void> {
    try {
      logger.info('Sending post-purchase follow-up', { 
        userId: conversionEvent.userId, 
        orderId: conversionEvent.orderId 
      });

      // Get user lifecycle stage
      const lifecycleStage = await this.retentionRepo.getLifecycleStageByUser(conversionEvent.userId);

      // Determine follow-up type based on purchase and user stage
      const followUpType = this.determinePostPurchaseFollowUpType(conversionEvent, lifecycleStage);

      // Configure follow-up
      const config: FollowUpConfig = {
        type: 'post_purchase',
        triggerEvent: 'purchase_completed',
        delay: this.calculateOptimalDelay(conversionEvent, lifecycleStage),
        personalization: {
          useUserName: true,
          includePurchaseHistory: true,
          includeRecommendations: true,
          includePersonalizedOffers: true,
          dynamicContent: true
        },
        content: await this.generatePostPurchaseContent(conversionEvent, followUpType),
        frequency: 'once'
      };

      // Schedule the follow-up
      await this.scheduleFollowUp(conversionEvent.userId, config);

      // Schedule additional follow-ups based on purchase value
      if (conversionEvent.orderValue > 2000) {
        await this.scheduleHighValueCustomerFollowUps(conversionEvent);
      }

    } catch (error) {
      logger.error('Error sending post-purchase follow-up', { 
        userId: conversionEvent.userId, 
        error: error.message 
      });
      throw error;
    }
  }

  // Send product recommendations
  async sendProductRecommendations(userId: string, context: 'post_purchase' | 'browsing_behavior' | 'seasonal'): Promise<void> {
    try {
      logger.info('Sending product recommendations', { userId, context });

      // Get user's recommendation data
      const recommendations = await this.recommendationRepo.getUserRecommendations(userId, 5);

      if (recommendations.length === 0) {
        logger.info('No recommendations available for user', { userId });
        return;
      }

      // Convert to product recommendations format
      const productRecommendations: ProductRecommendation[] = recommendations.map(rec => ({
        productId: rec.itemId,
        productName: rec.itemTitle,
        category: rec.category,
        price: rec.price,
        discountPrice: rec.discountPrice,
        reason: rec.reason,
        confidence: rec.confidence
      }));

      const config: FollowUpConfig = {
        type: 'product_recommendation',
        triggerEvent: 'product_viewed',
        delay: context === 'post_purchase' ? 24 : 2, // 24 hours for post-purchase, 2 hours for browsing
        personalization: {
          useUserName: true,
          includePurchaseHistory: false,
          includeRecommendations: true,
          includePersonalizedOffers: true,
          dynamicContent: true
        },
        content: {
          message: this.generateRecommendationMessage(context),
          callToAction: 'View Recommendations',
          recommendations: productRecommendations
        },
        frequency: 'once'
      };

      await this.scheduleFollowUp(userId, config);

    } catch (error) {
      logger.error('Error sending product recommendations', { 
        userId, 
        error: error.message 
      });
      throw error;
    }
  }

  // Create seasonal campaign
  async createSeasonalCampaign(campaign: Omit<SeasonalCampaign, 'id' | 'performance'>): Promise<SeasonalCampaign> {
    try {
      logger.info('Creating seasonal campaign', { name: campaign.name, season: campaign.season });

      const seasonalCampaign: SeasonalCampaign = {
        id: `seasonal_${Date.now()}`,
        ...campaign,
        performance: {
          targetUsers: 0,
          reachedUsers: 0,
          engagementRate: 0,
          conversionRate: 0,
          revenue: 0,
          roi: 0
        }
      };

      // Schedule campaign execution
      await this.scheduleSeasonalCampaignExecution(seasonalCampaign);

      logger.info('Seasonal campaign created', { campaignId: seasonalCampaign.id });

      return seasonalCampaign;
    } catch (error) {
      logger.error('Error creating seasonal campaign', { error: error.message });
      throw error;
    }
  }

  // Send seasonal reminders
  async sendSeasonalReminders(season: string): Promise<void> {
    try {
      logger.info('Sending seasonal reminders', { season });

      // Get active users for seasonal targeting
      const activeUsers = await this.retentionRepo.getUsersByActivityStatus('active', 1000);

      // Get seasonal offers
      const seasonalOffers = await this.getSeasonalOffers(season);

      for (const user of activeUsers) {
        const config: FollowUpConfig = {
          type: 'seasonal',
          triggerEvent: 'season_start',
          delay: 0, // Send immediately
          personalization: {
            useUserName: true,
            includePurchaseHistory: true,
            includeRecommendations: true,
            includePersonalizedOffers: true,
            dynamicContent: true
          },
          content: {
            message: this.generateSeasonalMessage(season, user.userId),
            callToAction: 'Shop Seasonal Deals',
            offers: seasonalOffers
          },
          frequency: 'once'
        };

        await this.scheduleFollowUp(user.userId, config);
      }

      logger.info('Seasonal reminders scheduled', { 
        season, 
        userCount: activeUsers.length 
      });

    } catch (error) {
      logger.error('Error sending seasonal reminders', { season, error: error.message });
      throw error;
    }
  }

  // Execute scheduled follow-ups
  async executeScheduledFollowUps(): Promise<void> {
    try {
      logger.info('Executing scheduled follow-ups');

      // In a real implementation, this would query the database for scheduled follow-ups
      // For now, we'll simulate the process

      const scheduledFollowUps = await this.getScheduledFollowUps();

      for (const followUp of scheduledFollowUps) {
        try {
          await this.executeFollowUp(followUp);
        } catch (error) {
          logger.error('Error executing individual follow-up', { 
            followUpId: followUp.id, 
            error: error.message 
          });
        }
      }

      logger.info('Scheduled follow-ups execution completed', { 
        count: scheduledFollowUps.length 
      });

    } catch (error) {
      logger.error('Error executing scheduled follow-ups', { error: error.message });
      throw error;
    }
  }

  // Track follow-up response
  async trackFollowUpResponse(followUpId: string, response: FollowUpResponse): Promise<void> {
    try {
      logger.info('Tracking follow-up response', { followUpId, response });

      // Update follow-up execution with response data
      // In a real implementation, this would update the database

      // Update user engagement metrics based on response
      if (response.converted) {
        await this.updateUserEngagementScore(followUpId, 'conversion');
      } else if (response.clicked) {
        await this.updateUserEngagementScore(followUpId, 'click');
      } else if (response.opened) {
        await this.updateUserEngagementScore(followUpId, 'open');
      }

    } catch (error) {
      logger.error('Error tracking follow-up response', { 
        followUpId, 
        error: error.message 
      });
      throw error;
    }
  }

  // Private helper methods
  private async checkConditions(userId: string, conditions: FollowUpCondition[]): Promise<boolean> {
    // Simplified condition checking
    // In a real implementation, this would check against user data
    return true;
  }

  private async generatePersonalizedContent(userId: string, config: FollowUpConfig): Promise<FollowUpContent> {
    const user = await this.userRepo.findByTelegramId(userId);
    let content = { ...config.content };

    if (config.personalization.useUserName && user) {
      content.message = content.message.replace('{{firstName}}', user.firstName || 'Valued Customer');
    }

    if (config.personalization.includeRecommendations) {
      const recommendations = await this.recommendationRepo.getUserRecommendations(userId, 3);
      content.recommendations = recommendations.map(rec => ({
        productId: rec.itemId,
        productName: rec.itemTitle,
        category: rec.category,
        price: rec.price,
        discountPrice: rec.discountPrice,
        reason: rec.reason,
        confidence: rec.confidence
      }));
    }

    return content;
  }

  private determinePostPurchaseFollowUpType(
    conversion: ConversionEvent, 
    lifecycleStage: UserLifecycleStage | null
  ): string {
    if (conversion.orderValue > 5000) return 'high_value_thank_you';
    if (lifecycleStage?.currentStage === 'new') return 'first_purchase_welcome';
    return 'standard_thank_you';
  }

  private calculateOptimalDelay(
    conversion: ConversionEvent, 
    lifecycleStage: UserLifecycleStage | null
  ): number {
    // Calculate optimal delay based on purchase value and user stage
    if (conversion.orderValue > 5000) return 2; // 2 hours for high-value purchases
    if (lifecycleStage?.currentStage === 'new') return 4; // 4 hours for new customers
    return 24; // 24 hours for regular customers
  }

  private async generatePostPurchaseContent(
    conversion: ConversionEvent, 
    followUpType: string
  ): Promise<FollowUpContent> {
    const baseContent = {
      message: '',
      callToAction: '',
      offers: [] as FollowUpOffer[]
    };

    switch (followUpType) {
      case 'high_value_thank_you':
        baseContent.message = 'Thank you for your premium purchase! As a valued customer, here\'s an exclusive offer for your next order.';
        baseContent.callToAction = 'Claim VIP Discount';
        baseContent.offers = [{
          type: 'discount' as const,
          value: 15,
          description: '15% off your next purchase',
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          conditions: ['minimum_order_1000']
        }];
        break;

      case 'first_purchase_welcome':
        baseContent.message = 'Welcome to our community! Thank you for your first purchase. Here are some products you might love.';
        baseContent.callToAction = 'Explore More Deals';
        baseContent.offers = [{
          type: 'discount' as const,
          value: 10,
          description: '10% off your next purchase',
          validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          conditions: ['new_customer_only']
        }];
        break;

      default:
        baseContent.message = 'Thank you for your purchase! We hope you love your new items.';
        baseContent.callToAction = 'Shop Similar Items';
        break;
    }

    return baseContent;
  }

  private async scheduleHighValueCustomerFollowUps(conversion: ConversionEvent): Promise<void> {
    // Schedule additional follow-ups for high-value customers
    const followUps = [
      {
        delay: 72, // 3 days
        type: 'product_care_tips',
        message: 'Here are some tips to get the most out of your recent purchase.'
      },
      {
        delay: 168, // 1 week
        type: 'satisfaction_survey',
        message: 'How are you enjoying your recent purchase? We\'d love your feedback.'
      },
      {
        delay: 720, // 30 days
        type: 'replenishment_reminder',
        message: 'Time for a refill? Get your favorites with exclusive savings.'
      }
    ];

    for (const followUp of followUps) {
      const config: FollowUpConfig = {
        type: 'post_purchase',
        triggerEvent: 'purchase_completed',
        delay: followUp.delay,
        personalization: {
          useUserName: true,
          includePurchaseHistory: true,
          includeRecommendations: true,
          includePersonalizedOffers: false,
          dynamicContent: true
        },
        content: {
          message: followUp.message,
          callToAction: 'Learn More'
        },
        frequency: 'once'
      };

      await this.scheduleFollowUp(conversion.userId, config);
    }
  }

  private generateRecommendationMessage(context: string): string {
    switch (context) {
      case 'post_purchase':
        return 'Based on your recent purchase, here are some items you might also love:';
      case 'browsing_behavior':
        return 'We noticed you were looking at these items. Here are some similar products:';
      case 'seasonal':
        return 'Perfect for the season! Check out these trending items:';
      default:
        return 'Personalized recommendations just for you:';
    }
  }

  private async scheduleSeasonalCampaignExecution(campaign: SeasonalCampaign): Promise<void> {
    logger.info('Scheduling seasonal campaign execution', { campaignId: campaign.id });
    // Implementation would schedule campaign execution at start date
  }

  private async getSeasonalOffers(season: string): Promise<FollowUpOffer[]> {
    // Mock seasonal offers
    return [
      {
        type: 'discount',
        value: 20,
        description: `${season} Special - 20% off selected items`,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        conditions: ['seasonal_items_only']
      }
    ];
  }

  private generateSeasonalMessage(season: string, userId: string): string {
    const seasonMessages = {
      spring: 'Spring is here! Refresh your wardrobe with our latest collection.',
      summer: 'Beat the heat with our summer essentials and cool deals!',
      monsoon: 'Stay dry and stylish this monsoon season.',
      winter: 'Cozy up with our winter collection and warm savings.',
      festival: 'Celebrate the festival season with special offers!'
    };

    return seasonMessages[season as keyof typeof seasonMessages] || 'Special seasonal offers just for you!';
  }

  private async getScheduledFollowUps(): Promise<FollowUpExecution[]> {
    // Mock scheduled follow-ups
    return [];
  }

  private async executeFollowUp(followUp: FollowUpExecution): Promise<void> {
    logger.info('Executing follow-up', { followUpId: followUp.id });
    
    // In a real implementation, this would:
    // 1. Send the message via appropriate channel (Telegram, email, etc.)
    // 2. Update the follow-up status
    // 3. Track delivery and engagement
    
    // For now, we'll just log the execution
    logger.info('Follow-up executed successfully', { 
      followUpId: followUp.id,
      userId: followUp.userId,
      type: followUp.followUpType
    });
  }

  private async updateUserEngagementScore(followUpId: string, engagementType: string): Promise<void> {
    logger.info('Updating user engagement score', { followUpId, engagementType });
    // Implementation would update user engagement metrics
  }
}
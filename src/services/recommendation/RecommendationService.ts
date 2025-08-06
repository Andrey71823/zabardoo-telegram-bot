import { BaseService } from '../base/BaseService';
import { Request, Response } from 'express';
import { RecommendationRepository } from '../../repositories/RecommendationRepository';
import { UserRepository } from '../../repositories/UserRepository';
import { RecommendationAlgorithms } from './RecommendationAlgorithms';
import { pgPool } from '../../config/database';
import { 
  UserProfile, 
  RecommendationRequest, 
  RecommendationResult, 
  CouponRecommendation,
  RecommendationEngine,
  RecommendationFeedback
} from '../../models/Recommendation';
import config from '../../config';

export class RecommendationService extends BaseService {
  private recommendationRepository: RecommendationRepository;
  private userRepository: UserRepository;
  private algorithms: RecommendationAlgorithms;

  constructor() {
    super('recommendation-service', 3009);
    
    this.recommendationRepository = new RecommendationRepository(pgPool);
    this.userRepository = new UserRepository(pgPool);
    this.algorithms = new RecommendationAlgorithms();
  }

  protected setupServiceRoutes(): void {
    // User Profile Management
    this.app.post('/profiles', this.createUserProfile.bind(this));
    this.app.get('/profiles/:userId', this.getUserProfile.bind(this));
    this.app.put('/profiles/:userId', this.updateUserProfile.bind(this));
    this.app.delete('/profiles/:userId', this.deleteUserProfile.bind(this));

    // Recommendation Generation
    this.app.post('/recommend', this.generateRecommendations.bind(this));
    this.app.post('/recommend/content-based', this.getContentBasedRecommendations.bind(this));
    this.app.post('/recommend/collaborative', this.getCollaborativeRecommendations.bind(this));
    this.app.post('/recommend/hybrid', this.getHybridRecommendations.bind(this));
    this.app.post('/recommend/trending', this.getTrendingRecommendations.bind(this));

    // Recommendation History
    this.app.get('/users/:userId/recommendations', this.getUserRecommendationHistory.bind(this));
    this.app.get('/recommendations/:recommendationId', this.getRecommendationDetails.bind(this));

    // Feedback Collection
    this.app.post('/feedback', this.recordFeedback.bind(this));
    this.app.get('/feedback/:recommendationId', this.getFeedback.bind(this));
    this.app.post('/feedback/implicit', this.recordImplicitFeedback.bind(this));

    // Recommendation Engines
    this.app.post('/engines', this.createRecommendationEngine.bind(this));
    this.app.get('/engines', this.getRecommendationEngines.bind(this));
    this.app.put('/engines/:engineId', this.updateRecommendationEngine.bind(this));
    this.app.post('/engines/:engineId/evaluate', this.evaluateEngine.bind(this));

    // User Similarity
    this.app.get('/users/:userId/similar', this.getSimilarUsers.bind(this));
    this.app.post('/similarity/calculate', this.calculateUserSimilarity.bind(this));

    // Analytics and Metrics
    this.app.get('/analytics/performance', this.getPerformanceAnalytics.bind(this));
    this.app.get('/analytics/user-segments', this.getUserSegmentAnalytics.bind(this));
    this.app.get('/analytics/category-performance', this.getCategoryPerformance.bind(this));

    // A/B Testing
    this.app.post('/experiments', this.createABTestExperiment.bind(this));
    this.app.get('/experiments', this.getABTestExperiments.bind(this));
    this.app.post('/experiments/:experimentId/assign', this.assignUserToExperiment.bind(this));

    // Real-time Recommendations
    this.app.post('/recommend/realtime', this.getRealtimeRecommendations.bind(this));
    this.app.post('/recommend/contextual', this.getContextualRecommendations.bind(this));
  }

  protected async checkServiceHealth(): Promise<boolean> {
    try {
      // Test database connection and basic functionality
      const engines = await this.recommendationRepository.getActiveRecommendationEngines();
      return true;
    } catch (error) {
      this.logger.error('Recommendation Service health check failed:', error);
      return false;
    }
  }

  // User Profile Management
  private async createUserProfile(req: Request, res: Response): Promise<void> {
    try {
      const profileData: Partial<UserProfile> = req.body;
      
      if (!profileData.userId) {
        res.status(400).json({ error: 'userId is required' });
        return;
      }

      const profile = await this.recommendationRepository.createUserProfile(profileData);
      
      this.logger.info(`Created user profile for user ${profileData.userId}`);
      res.status(201).json(profile);
    } catch (error) {
      this.logger.error('Error creating user profile:', error);
      res.status(500).json({ error: 'Failed to create user profile' });
    }
  }

  private async getUserProfile(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      
      const profile = await this.recommendationRepository.getUserProfile(userId);
      
      if (!profile) {
        res.status(404).json({ error: 'User profile not found' });
        return;
      }

      res.json(profile);
    } catch (error) {
      this.logger.error('Error getting user profile:', error);
      res.status(500).json({ error: 'Failed to get user profile' });
    }
  }

  private async updateUserProfile(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const updates = req.body;
      
      const profile = await this.recommendationRepository.updateUserProfile(userId, updates);
      
      if (!profile) {
        res.status(404).json({ error: 'User profile not found' });
        return;
      }

      res.json(profile);
    } catch (error) {
      this.logger.error('Error updating user profile:', error);
      res.status(500).json({ error: 'Failed to update user profile' });
    }
  }

  // Recommendation Generation
  private async generateRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const { userId, context, filters } = req.body;
      
      if (!userId) {
        res.status(400).json({ error: 'userId is required' });
        return;
      }

      // Record the request
      const request = await this.recommendationRepository.recordRecommendationRequest({
        userId,
        context: context || {},
        filters: filters || { limit: 10 }
      });

      // Get user profile
      const userProfile = await this.recommendationRepository.getUserProfile(userId);
      if (!userProfile) {
        res.status(404).json({ error: 'User profile not found' });
        return;
      }

      // Get available coupons (this would typically come from coupon service)
      const availableCoupons = await this.getAvailableCoupons(filters);
      
      // Get active recommendation engines
      const engines = await this.recommendationRepository.getActiveRecommendationEngines();
      const primaryEngine = engines[0]; // Use highest priority engine
      
      let recommendations: CouponRecommendation[] = [];
      
      // Generate recommendations based on engine type
      if (primaryEngine) {
        switch (primaryEngine.type) {
          case 'content_based':
            const couponFeatures = await this.getCouponFeatures(availableCoupons);
            recommendations = await this.algorithms.contentBasedRecommendations(
              userProfile, availableCoupons, couponFeatures
            );
            break;
            
          case 'collaborative':
            const similarUsers = await this.recommendationRepository.getSimilarUsers(userId, 20);
            recommendations = await this.algorithms.collaborativeFilteringRecommendations(
              userId, userProfile, similarUsers, availableCoupons
            );
            break;
            
          case 'hybrid':
            const features = await this.getCouponFeatures(availableCoupons);
            const similar = await this.recommendationRepository.getSimilarUsers(userId, 20);
            recommendations = await this.algorithms.hybridRecommendations(
              userId, userProfile, availableCoupons, features, similar
            );
            break;
            
          default:
            // Fallback to content-based
            const defaultFeatures = await this.getCouponFeatures(availableCoupons);
            recommendations = await this.algorithms.contentBasedRecommendations(
              userProfile, availableCoupons, defaultFeatures
            );
        }
      }

      // Save results
      const result = await this.recommendationRepository.saveRecommendationResult({
        requestId: request.id,
        userId,
        recommendations,
        metadata: {
          engine_used: primaryEngine?.name || 'default',
          processing_time: Date.now() - new Date(request.timestamp).getTime(),
          total_candidates: availableCoupons.length,
          filtered_count: recommendations.length,
          ranking_factors: ['score', 'personalization', 'predicted_ctr']
        }
      });

      res.json({
        requestId: request.id,
        recommendations,
        metadata: result.metadata
      });

    } catch (error) {
      this.logger.error('Error generating recommendations:', error);
      res.status(500).json({ error: 'Failed to generate recommendations' });
    }
  }

  private async getContentBasedRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const { userId, filters } = req.body;
      
      const userProfile = await this.recommendationRepository.getUserProfile(userId);
      if (!userProfile) {
        res.status(404).json({ error: 'User profile not found' });
        return;
      }

      const availableCoupons = await this.getAvailableCoupons(filters);
      const couponFeatures = await this.getCouponFeatures(availableCoupons);
      
      const recommendations = await this.algorithms.contentBasedRecommendations(
        userProfile, availableCoupons, couponFeatures
      );

      res.json({ recommendations, algorithm: 'content_based' });
    } catch (error) {
      this.logger.error('Error getting content-based recommendations:', error);
      res.status(500).json({ error: 'Failed to get content-based recommendations' });
    }
  }

  private async getHybridRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const { userId, filters } = req.body;
      
      const userProfile = await this.recommendationRepository.getUserProfile(userId);
      if (!userProfile) {
        res.status(404).json({ error: 'User profile not found' });
        return;
      }

      const availableCoupons = await this.getAvailableCoupons(filters);
      const couponFeatures = await this.getCouponFeatures(availableCoupons);
      const similarUsers = await this.recommendationRepository.getSimilarUsers(userId, 20);
      
      const recommendations = await this.algorithms.hybridRecommendations(
        userId, userProfile, availableCoupons, couponFeatures, similarUsers
      );

      res.json({ recommendations, algorithm: 'hybrid' });
    } catch (error) {
      this.logger.error('Error getting hybrid recommendations:', error);
      res.status(500).json({ error: 'Failed to get hybrid recommendations' });
    }
  }

  // Feedback Collection
  private async recordFeedback(req: Request, res: Response): Promise<void> {
    try {
      const feedbackData: Partial<RecommendationFeedback> = req.body;
      
      if (!feedbackData.userId || !feedbackData.couponId || !feedbackData.feedback_type) {
        res.status(400).json({ error: 'userId, couponId, and feedback_type are required' });
        return;
      }

      const feedback = await this.recommendationRepository.recordFeedback(feedbackData);
      
      // Update user profile based on feedback
      await this.updateUserProfileFromFeedback(feedbackData.userId!, feedback);
      
      this.logger.info(`Recorded feedback: ${feedback.feedback_type} for coupon ${feedback.couponId}`);
      res.status(201).json(feedback);
    } catch (error) {
      this.logger.error('Error recording feedback:', error);
      res.status(500).json({ error: 'Failed to record feedback' });
    }
  }

  private async recordImplicitFeedback(req: Request, res: Response): Promise<void> {
    try {
      const { userId, couponId, timeSpent, scrollDepth, interactionCount } = req.body;
      
      const feedback = await this.recommendationRepository.recordFeedback({
        userId,
        couponId,
        feedback_type: 'view',
        implicit_feedback: {
          time_spent: timeSpent || 0,
          scroll_depth: scrollDepth || 0,
          interaction_count: interactionCount || 0
        }
      });

      res.json({ success: true, feedbackId: feedback.id });
    } catch (error) {
      this.logger.error('Error recording implicit feedback:', error);
      res.status(500).json({ error: 'Failed to record implicit feedback' });
    }
  }

  // Analytics
  private async getPerformanceAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { engineId, startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();
      
      const metrics = await this.recommendationRepository.getRecommendationMetrics(
        engineId as string || 'all',
        start,
        end
      );

      const analytics = {
        period: { startDate: start, endDate: end },
        metrics,
        summary: this.calculateAnalyticsSummary(metrics)
      };

      res.json(analytics);
    } catch (error) {
      this.logger.error('Error getting performance analytics:', error);
      res.status(500).json({ error: 'Failed to get performance analytics' });
    }
  }

  // Real-time Recommendations
  private async getRealtimeRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const { userId, context, limit = 5 } = req.body;
      
      // Fast recommendation generation for real-time scenarios
      const userProfile = await this.recommendationRepository.getUserProfile(userId);
      if (!userProfile) {
        res.status(404).json({ error: 'User profile not found' });
        return;
      }

      // Use cached data and simplified algorithms for speed
      const quickCoupons = await this.getQuickAvailableCoupons(limit * 3);
      const quickFeatures = await this.getCouponFeatures(quickCoupons);
      
      const recommendations = await this.algorithms.contentBasedRecommendations(
        userProfile, quickCoupons, quickFeatures
      );

      res.json({ 
        recommendations: recommendations.slice(0, limit),
        generated_at: new Date(),
        is_realtime: true
      });
    } catch (error) {
      this.logger.error('Error getting realtime recommendations:', error);
      res.status(500).json({ error: 'Failed to get realtime recommendations' });
    }
  }

  // Helper methods
  private async getAvailableCoupons(filters: any = {}): Promise<any[]> {
    // This would typically call the coupon service
    // For now, return mock data
    return [
      {
        id: 'coupon-1',
        title: 'Flipkart Electronics Sale',
        category: 'Electronics',
        store: 'Flipkart',
        discount_value: 70,
        discount_type: 'percentage',
        expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'coupon-2',
        title: 'Amazon Fashion Week',
        category: 'Fashion',
        store: 'Amazon',
        discount_value: 50,
        discount_type: 'percentage',
        expiry_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      }
    ];
  }

  private async getQuickAvailableCoupons(limit: number): Promise<any[]> {
    // Fast coupon retrieval for real-time scenarios
    const coupons = await this.getAvailableCoupons();
    return coupons.slice(0, limit);
  }

  private async getCouponFeatures(coupons: any[]): Promise<Map<string, any>> {
    const features = new Map();
    
    for (const coupon of coupons) {
      const feature = await this.recommendationRepository.getCouponFeatures(coupon.id);
      if (feature) {
        features.set(coupon.id, feature);
      } else {
        // Generate basic features if not found
        features.set(coupon.id, {
          couponId: coupon.id,
          features: {
            category_vector: [Math.random(), Math.random(), Math.random()],
            store_popularity: Math.random(),
            discount_attractiveness: coupon.discount_value / 100,
            seasonal_relevance: Math.random(),
            brand_strength: Math.random(),
            price_competitiveness: Math.random(),
            user_rating: Math.random() * 5,
            conversion_history: Math.random()
          },
          embedding: Array.from({length: 50}, () => Math.random()),
          last_updated: new Date()
        });
      }
    }
    
    return features;
  }

  private async updateUserProfileFromFeedback(userId: string, feedback: RecommendationFeedback): Promise<void> {
    try {
      const profile = await this.recommendationRepository.getUserProfile(userId);
      if (!profile) return;

      // Update engagement metrics based on feedback
      const updatedEngagement = { ...profile.engagement };
      
      switch (feedback.feedback_type) {
        case 'click':
          updatedEngagement.click_through_rate = (updatedEngagement.click_through_rate + 0.1) / 2;
          break;
        case 'purchase':
          updatedEngagement.conversion_rate = (updatedEngagement.conversion_rate + 0.1) / 2;
          updatedEngagement.recommendation_acceptance_rate = (updatedEngagement.recommendation_acceptance_rate + 0.2) / 2;
          break;
        case 'dislike':
          updatedEngagement.recommendation_acceptance_rate = Math.max(0, updatedEngagement.recommendation_acceptance_rate - 0.1);
          break;
      }

      await this.recommendationRepository.updateUserProfile(userId, {
        engagement: updatedEngagement
      });
    } catch (error) {
      this.logger.error('Error updating user profile from feedback:', error);
    }
  }

  private calculateAnalyticsSummary(metrics: any[]): any {
    if (metrics.length === 0) {
      return {
        total_recommendations: 0,
        average_ctr: 0,
        average_conversion_rate: 0,
        total_feedback: 0
      };
    }

    const summary = metrics.reduce((acc, metric) => {
      acc.total_recommendations += metric.metrics.total_requests || 0;
      acc.total_ctr += metric.metrics.click_through_rate || 0;
      acc.total_conversion += metric.metrics.conversion_rate || 0;
      return acc;
    }, { total_recommendations: 0, total_ctr: 0, total_conversion: 0 });

    return {
      total_recommendations: summary.total_recommendations,
      average_ctr: summary.total_ctr / metrics.length,
      average_conversion_rate: summary.total_conversion / metrics.length,
      metrics_count: metrics.length
    };
  }

  // Placeholder methods for missing endpoints
  private async deleteUserProfile(req: Request, res: Response): Promise<void> {
    res.json({ message: 'Delete user profile not implemented yet' });
  }

  private async getCollaborativeRecommendations(req: Request, res: Response): Promise<void> {
    res.json({ message: 'Collaborative recommendations not implemented yet' });
  }

  private async getTrendingRecommendations(req: Request, res: Response): Promise<void> {
    res.json({ message: 'Trending recommendations not implemented yet' });
  }

  private async getUserRecommendationHistory(req: Request, res: Response): Promise<void> {
    res.json({ message: 'User recommendation history not implemented yet' });
  }

  private async getRecommendationDetails(req: Request, res: Response): Promise<void> {
    res.json({ message: 'Recommendation details not implemented yet' });
  }

  private async getFeedback(req: Request, res: Response): Promise<void> {
    res.json({ message: 'Get feedback not implemented yet' });
  }

  private async createRecommendationEngine(req: Request, res: Response): Promise<void> {
    res.json({ message: 'Create recommendation engine not implemented yet' });
  }

  private async getRecommendationEngines(req: Request, res: Response): Promise<void> {
    res.json({ message: 'Get recommendation engines not implemented yet' });
  }

  private async updateRecommendationEngine(req: Request, res: Response): Promise<void> {
    res.json({ message: 'Update recommendation engine not implemented yet' });
  }

  private async evaluateEngine(req: Request, res: Response): Promise<void> {
    res.json({ message: 'Evaluate engine not implemented yet' });
  }

  private async getSimilarUsers(req: Request, res: Response): Promise<void> {
    res.json({ message: 'Get similar users not implemented yet' });
  }

  private async calculateUserSimilarity(req: Request, res: Response): Promise<void> {
    res.json({ message: 'Calculate user similarity not implemented yet' });
  }

  private async getUserSegmentAnalytics(req: Request, res: Response): Promise<void> {
    res.json({ message: 'User segment analytics not implemented yet' });
  }

  private async getCategoryPerformance(req: Request, res: Response): Promise<void> {
    res.json({ message: 'Category performance not implemented yet' });
  }

  private async createABTestExperiment(req: Request, res: Response): Promise<void> {
    res.json({ message: 'Create A/B test experiment not implemented yet' });
  }

  private async getABTestExperiments(req: Request, res: Response): Promise<void> {
    res.json({ message: 'Get A/B test experiments not implemented yet' });
  }

  private async assignUserToExperiment(req: Request, res: Response): Promise<void> {
    res.json({ message: 'Assign user to experiment not implemented yet' });
  }

  private async getContextualRecommendations(req: Request, res: Response): Promise<void> {
    res.json({ message: 'Contextual recommendations not implemented yet' });
  }
}

// Start service if run directly
if (require.main === module) {
  const service = new RecommendationService();
  service.setupGracefulShutdown();
  service.start();
}
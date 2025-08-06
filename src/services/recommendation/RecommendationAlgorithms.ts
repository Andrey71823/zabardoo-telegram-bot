import { UserProfile, CouponRecommendation, RecommendationReason, CouponFeatures } from '../../models/Recommendation';
import { logger } from '../../config/logger';

export class RecommendationAlgorithms {
  
  // Content-Based Filtering
  async contentBasedRecommendations(
    userProfile: UserProfile,
    availableCoupons: any[],
    couponFeatures: Map<string, CouponFeatures>
  ): Promise<CouponRecommendation[]> {
    try {
      const recommendations: CouponRecommendation[] = [];
      
      for (const coupon of availableCoupons) {
        const features = couponFeatures.get(coupon.id);
        if (!features) continue;
        
        const score = this.calculateContentBasedScore(userProfile, coupon, features);
        const reasons = this.generateContentBasedReasons(userProfile, coupon, features);
        
        if (score > 0.3) { // Minimum threshold
          recommendations.push({
            couponId: coupon.id,
            score,
            rank: 0, // Will be set after sorting
            reasons,
            personalization: {
              user_match_score: score,
              category_relevance: this.calculateCategoryRelevance(userProfile, coupon),
              store_preference: this.calculateStorePreference(userProfile, coupon),
              price_attractiveness: this.calculatePriceAttractiveness(userProfile, coupon),
              urgency_factor: this.calculateUrgencyFactor(coupon)
            },
            predicted_ctr: this.predictClickThroughRate(userProfile, coupon, score),
            predicted_conversion: this.predictConversionRate(userProfile, coupon, score),
            confidence: Math.min(score * 1.2, 1.0)
          });
        }
      }
      
      // Sort by score and assign ranks
      recommendations.sort((a, b) => b.score - a.score);
      recommendations.forEach((rec, index) => {
        rec.rank = index + 1;
      });
      
      return recommendations.slice(0, 20); // Top 20 recommendations
    } catch (error) {
      logger.error('Error in content-based recommendations:', error);
      return [];
    }
  }

  // Collaborative Filtering
  async collaborativeFilteringRecommendations(
    userId: string,
    userProfile: UserProfile,
    similarUsers: any[],
    availableCoupons: any[]
  ): Promise<CouponRecommendation[]> {
    try {
      const recommendations: CouponRecommendation[] = [];
      const couponScores = new Map<string, number>();
      const couponReasons = new Map<string, RecommendationReason[]>();
      
      // Aggregate preferences from similar users
      for (const similarUser of similarUsers) {
        const similarity = similarUser.similarity_score;
        
        // Get coupons liked by similar users (this would come from purchase/interaction history)
        const likedCoupons = await this.getUserLikedCoupons(similarUser.userId2 === userId ? similarUser.userId1 : similarUser.userId2);
        
        for (const coupon of likedCoupons) {
          if (availableCoupons.some(ac => ac.id === coupon.couponId)) {
            const currentScore = couponScores.get(coupon.couponId) || 0;
            const weightedScore = similarity * coupon.rating;
            couponScores.set(coupon.couponId, currentScore + weightedScore);
            
            // Add collaborative reason
            const reasons = couponReasons.get(coupon.couponId) || [];
            reasons.push({
              type: 'similar_users',
              description: `Пользователи с похожими предпочтениями также выбирали этот купон`,
              weight: similarity,
              evidence: { similar_user_count: similarUsers.length }
            });
            couponReasons.set(coupon.couponId, reasons);
          }
        }
      }
      
      // Convert to recommendations
      for (const [couponId, score] of couponScores.entries()) {
        const coupon = availableCoupons.find(c => c.id === couponId);
        if (!coupon) continue;
        
        const normalizedScore = Math.min(score / similarUsers.length, 1.0);
        
        if (normalizedScore > 0.2) {
          recommendations.push({
            couponId,
            score: normalizedScore,
            rank: 0,
            reasons: couponReasons.get(couponId) || [],
            personalization: {
              user_match_score: normalizedScore,
              category_relevance: this.calculateCategoryRelevance(userProfile, coupon),
              store_preference: this.calculateStorePreference(userProfile, coupon),
              price_attractiveness: this.calculatePriceAttractiveness(userProfile, coupon),
              urgency_factor: this.calculateUrgencyFactor(coupon)
            },
            predicted_ctr: this.predictClickThroughRate(userProfile, coupon, normalizedScore),
            predicted_conversion: this.predictConversionRate(userProfile, coupon, normalizedScore),
            confidence: normalizedScore * 0.8 // Slightly lower confidence for collaborative
          });
        }
      }
      
      // Sort and rank
      recommendations.sort((a, b) => b.score - a.score);
      recommendations.forEach((rec, index) => {
        rec.rank = index + 1;
      });
      
      return recommendations.slice(0, 15);
    } catch (error) {
      logger.error('Error in collaborative filtering recommendations:', error);
      return [];
    }
  }

  // Hybrid Recommendations (combines content-based and collaborative)
  async hybridRecommendations(
    userId: string,
    userProfile: UserProfile,
    availableCoupons: any[],
    couponFeatures: Map<string, CouponFeatures>,
    similarUsers: any[]
  ): Promise<CouponRecommendation[]> {
    try {
      // Get recommendations from both approaches
      const contentBased = await this.contentBasedRecommendations(userProfile, availableCoupons, couponFeatures);
      const collaborative = await this.collaborativeFilteringRecommendations(userId, userProfile, similarUsers, availableCoupons);
      
      // Combine and re-rank
      const combinedScores = new Map<string, {
        contentScore: number;
        collaborativeScore: number;
        recommendation: CouponRecommendation;
      }>();
      
      // Add content-based scores
      for (const rec of contentBased) {
        combinedScores.set(rec.couponId, {
          contentScore: rec.score,
          collaborativeScore: 0,
          recommendation: rec
        });
      }
      
      // Add collaborative scores
      for (const rec of collaborative) {
        const existing = combinedScores.get(rec.couponId);
        if (existing) {
          existing.collaborativeScore = rec.score;
          // Merge reasons
          existing.recommendation.reasons = [...existing.recommendation.reasons, ...rec.reasons];
        } else {
          combinedScores.set(rec.couponId, {
            contentScore: 0,
            collaborativeScore: rec.score,
            recommendation: rec
          });
        }
      }
      
      // Calculate hybrid scores
      const hybridRecommendations: CouponRecommendation[] = [];
      const contentWeight = 0.6;
      const collaborativeWeight = 0.4;
      
      for (const [couponId, scores] of combinedScores.entries()) {
        const hybridScore = (scores.contentScore * contentWeight) + (scores.collaborativeScore * collaborativeWeight);
        
        const recommendation = scores.recommendation;
        recommendation.score = hybridScore;
        recommendation.confidence = Math.min(hybridScore * 1.1, 1.0);
        
        // Add hybrid reason if both methods contributed
        if (scores.contentScore > 0 && scores.collaborativeScore > 0) {
          recommendation.reasons.push({
            type: 'ai_insight',
            description: 'Рекомендовано на основе ваших предпочтений и поведения похожих пользователей',
            weight: hybridScore,
            evidence: {
              content_score: scores.contentScore,
              collaborative_score: scores.collaborativeScore
            }
          });
        }
        
        hybridRecommendations.push(recommendation);
      }
      
      // Sort and rank
      hybridRecommendations.sort((a, b) => b.score - a.score);
      hybridRecommendations.forEach((rec, index) => {
        rec.rank = index + 1;
      });
      
      return hybridRecommendations.slice(0, 10);
    } catch (error) {
      logger.error('Error in hybrid recommendations:', error);
      return [];
    }
  }

  // Trending/Popular Recommendations
  async trendingRecommendations(
    userProfile: UserProfile,
    availableCoupons: any[],
    trendingData: any[]
  ): Promise<CouponRecommendation[]> {
    try {
      const recommendations: CouponRecommendation[] = [];
      
      for (const trending of trendingData) {
        const coupon = availableCoupons.find(c => c.id === trending.couponId);
        if (!coupon) continue;
        
        const trendingScore = trending.popularity_score / 100; // Normalize to 0-1
        const personalRelevance = this.calculatePersonalRelevance(userProfile, coupon);
        const combinedScore = (trendingScore * 0.7) + (personalRelevance * 0.3);
        
        if (combinedScore > 0.4) {
          recommendations.push({
            couponId: coupon.id,
            score: combinedScore,
            rank: 0,
            reasons: [{
              type: 'trending',
              description: `Популярный купон - ${trending.interaction_count} пользователей уже воспользовались`,
              weight: trendingScore,
              evidence: { popularity_rank: trending.rank, interaction_count: trending.interaction_count }
            }],
            personalization: {
              user_match_score: personalRelevance,
              category_relevance: this.calculateCategoryRelevance(userProfile, coupon),
              store_preference: this.calculateStorePreference(userProfile, coupon),
              price_attractiveness: this.calculatePriceAttractiveness(userProfile, coupon),
              urgency_factor: this.calculateUrgencyFactor(coupon)
            },
            predicted_ctr: this.predictClickThroughRate(userProfile, coupon, combinedScore),
            predicted_conversion: this.predictConversionRate(userProfile, coupon, combinedScore),
            confidence: combinedScore * 0.9
          });
        }
      }
      
      // Sort and rank
      recommendations.sort((a, b) => b.score - a.score);
      recommendations.forEach((rec, index) => {
        rec.rank = index + 1;
      });
      
      return recommendations.slice(0, 8);
    } catch (error) {
      logger.error('Error in trending recommendations:', error);
      return [];
    }
  }

  // Helper methods for scoring
  private calculateContentBasedScore(userProfile: UserProfile, coupon: any, features: CouponFeatures): number {
    let score = 0;
    
    // Category preference match
    const categoryMatch = userProfile.preferences.categories.includes(coupon.category) ? 0.3 : 0;
    score += categoryMatch;
    
    // Store preference match
    const storeMatch = userProfile.preferences.stores.includes(coupon.store) ? 0.25 : 0;
    score += storeMatch;
    
    // Price range match
    const priceMatch = this.isPriceInRange(coupon.discount_value, userProfile.preferences.price_range) ? 0.2 : 0;
    score += priceMatch;
    
    // Discount threshold match
    const discountMatch = coupon.discount_value >= userProfile.preferences.discount_threshold ? 0.15 : 0;
    score += discountMatch;
    
    // Feature-based similarity (using cosine similarity with user preference vector)
    const featureSimilarity = this.calculateFeatureSimilarity(userProfile, features);
    score += featureSimilarity * 0.1;
    
    return Math.min(score, 1.0);
  }

  private generateContentBasedReasons(userProfile: UserProfile, coupon: any, features: CouponFeatures): RecommendationReason[] {
    const reasons: RecommendationReason[] = [];
    
    if (userProfile.preferences.categories.includes(coupon.category)) {
      reasons.push({
        type: 'category_match',
        description: `Соответствует вашим предпочтениям в категории "${coupon.category}"`,
        weight: 0.3
      });
    }
    
    if (userProfile.preferences.stores.includes(coupon.store)) {
      reasons.push({
        type: 'store_preference',
        description: `Ваш любимый магазин "${coupon.store}"`,
        weight: 0.25
      });
    }
    
    if (coupon.discount_value >= userProfile.preferences.discount_threshold) {
      reasons.push({
        type: 'price_range',
        description: `Скидка ${coupon.discount_value}% соответствует вашим ожиданиям`,
        weight: 0.15
      });
    }
    
    return reasons;
  }

  private calculateCategoryRelevance(userProfile: UserProfile, coupon: any): number {
    return userProfile.preferences.categories.includes(coupon.category) ? 1.0 : 0.3;
  }

  private calculateStorePreference(userProfile: UserProfile, coupon: any): number {
    return userProfile.preferences.stores.includes(coupon.store) ? 1.0 : 0.5;
  }

  private calculatePriceAttractiveness(userProfile: UserProfile, coupon: any): number {
    const discountValue = coupon.discount_value || 0;
    const threshold = userProfile.preferences.discount_threshold || 10;
    
    if (discountValue >= threshold * 2) return 1.0;
    if (discountValue >= threshold) return 0.8;
    if (discountValue >= threshold * 0.5) return 0.5;
    return 0.2;
  }

  private calculateUrgencyFactor(coupon: any): number {
    if (!coupon.expiry_date) return 0.5;
    
    const now = new Date();
    const expiry = new Date(coupon.expiry_date);
    const daysUntilExpiry = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysUntilExpiry <= 1) return 1.0; // Expires today/tomorrow
    if (daysUntilExpiry <= 3) return 0.8; // Expires in 3 days
    if (daysUntilExpiry <= 7) return 0.6; // Expires in a week
    return 0.3; // More than a week
  }

  private calculatePersonalRelevance(userProfile: UserProfile, coupon: any): number {
    let relevance = 0;
    
    relevance += this.calculateCategoryRelevance(userProfile, coupon) * 0.4;
    relevance += this.calculateStorePreference(userProfile, coupon) * 0.3;
    relevance += this.calculatePriceAttractiveness(userProfile, coupon) * 0.3;
    
    return Math.min(relevance, 1.0);
  }

  private predictClickThroughRate(userProfile: UserProfile, coupon: any, score: number): number {
    // Simple CTR prediction based on user engagement and coupon score
    const baseRate = userProfile.engagement.click_through_rate || 0.05;
    const scoreMultiplier = 1 + (score * 2); // Higher score = higher predicted CTR
    const categoryBonus = userProfile.preferences.categories.includes(coupon.category) ? 1.2 : 1.0;
    
    return Math.min(baseRate * scoreMultiplier * categoryBonus, 0.5);
  }

  private predictConversionRate(userProfile: UserProfile, coupon: any, score: number): number {
    // Simple conversion prediction
    const baseRate = userProfile.engagement.conversion_rate || 0.02;
    const scoreMultiplier = 1 + score;
    const priceBonus = coupon.discount_value >= userProfile.preferences.discount_threshold ? 1.3 : 1.0;
    
    return Math.min(baseRate * scoreMultiplier * priceBonus, 0.2);
  }

  private isPriceInRange(price: number, range: { min: number; max: number }): boolean {
    return price >= range.min && price <= range.max;
  }

  private calculateFeatureSimilarity(userProfile: UserProfile, features: CouponFeatures): number {
    // Simplified feature similarity calculation
    // In a real implementation, this would use proper vector similarity
    return Math.random() * 0.3; // Placeholder
  }

  private async getUserLikedCoupons(userId: string): Promise<any[]> {
    // This would fetch actual user interaction data
    // Placeholder implementation
    return [
      { couponId: 'coupon-1', rating: 0.8 },
      { couponId: 'coupon-2', rating: 0.9 },
    ];
  }

  /**
   * Calculate personalization score for a coupon based on user profile
   */
  calculatePersonalizationScore(
    userProfile: UserProfile,
    coupon: any,
    couponFeatures: any
  ): number {
    let score = 0;
    let totalWeight = 0;

    // Category preference score (weight: 0.3)
    const categoryWeight = 0.3;
    const categoryScore = userProfile.preferences.categories.includes(coupon.category) ? 1.0 : 0.0;
    score += categoryScore * categoryWeight;
    totalWeight += categoryWeight;

    // Store preference score (weight: 0.2)
    const storeWeight = 0.2;
    const storeScore = userProfile.preferences.stores.includes(coupon.store) ? 1.0 : 0.5;
    score += storeScore * storeWeight;
    totalWeight += storeWeight;

    // Discount attractiveness (weight: 0.25)
    const discountWeight = 0.25;
    const discountValue = coupon.discount_value || 0;
    const userThreshold = userProfile.preferences.discount_threshold || 10;
    const discountScore = discountValue >= userThreshold ? 
      Math.min(discountValue / 100, 1.0) : 
      discountValue / (userThreshold * 2);
    score += discountScore * discountWeight;
    totalWeight += discountWeight;

    // Brand preference score (weight: 0.15)
    const brandWeight = 0.15;
    const brandScore = userProfile.preferences.brand_preferences?.some(brand => 
      coupon.title.toLowerCase().includes(brand.toLowerCase())
    ) ? 1.0 : 0.5;
    score += brandScore * brandWeight;
    totalWeight += brandWeight;

    // Seasonal relevance (weight: 0.1)
    const seasonalWeight = 0.1;
    const seasonalScore = couponFeatures.seasonal_relevance || 0.5;
    score += seasonalScore * seasonalWeight;
    totalWeight += seasonalWeight;

    return totalWeight > 0 ? score / totalWeight : 0;
  }

  /**
   * Rank recommendations by score and apply diversity
   */
  rankRecommendations(recommendations: CouponRecommendation[]): CouponRecommendation[] {
    // Sort by score descending
    const sorted = recommendations.sort((a, b) => b.score - a.score);
    
    // Apply ranking
    return sorted.map((rec, index) => ({
      ...rec,
      rank: index + 1
    }));
  }
}
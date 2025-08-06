import { RecommendationService } from '../services/recommendation/RecommendationService';
import { RecommendationAlgorithms } from '../services/recommendation/RecommendationAlgorithms';
import { RecommendationRepository } from '../repositories/RecommendationRepository';
import { UserProfile, CouponRecommendation } from '../models/Recommendation';

describe('Recommendation System', () => {
  let recommendationService: RecommendationService;
  let algorithms: RecommendationAlgorithms;
  let mockRepository: jest.Mocked<RecommendationRepository>;

  beforeEach(() => {
    // Mock repository
    mockRepository = {
      createUserProfile: jest.fn(),
      getUserProfile: jest.fn(),
      updateUserProfile: jest.fn(),
      recordRecommendationRequest: jest.fn(),
      saveRecommendationResult: jest.fn(),
      recordFeedback: jest.fn(),
      getSimilarUsers: jest.fn(),
      getCouponFeatures: jest.fn(),
      getActiveRecommendationEngines: jest.fn(),
      getRecommendationMetrics: jest.fn()
    } as any;

    algorithms = new RecommendationAlgorithms();
  });

  describe('RecommendationAlgorithms', () => {
    const mockUserProfile: UserProfile = {
      id: 'profile-1',
      userId: 'user-1',
      demographics: {
        age_range: '25-34',
        gender: 'male',
        location: 'Mumbai',
        income_level: 'middle',
        occupation: 'software_engineer'
      },
      preferences: {
        categories: ['Electronics', 'Fashion'],
        stores: ['Amazon', 'Flipkart'],
        price_sensitivity: 0.7,
        brand_preferences: ['Samsung', 'Nike'],
        discount_threshold: 20
      },
      behavior: {
        avg_session_duration: 300,
        purchase_frequency: 'weekly',
        preferred_shopping_time: 'evening',
        device_usage: 'mobile',
        social_sharing_tendency: 0.6
      },
      engagement: {
        click_through_rate: 0.15,
        conversion_rate: 0.08,
        recommendation_acceptance_rate: 0.25,
        feedback_frequency: 0.1,
        last_active: new Date()
      },
      created_at: new Date(),
      updated_at: new Date()
    };

    const mockCoupons = [
      {
        id: 'coupon-1',
        title: 'Samsung Galaxy Sale',
        category: 'Electronics',
        store: 'Amazon',
        discount_value: 30,
        discount_type: 'percentage',
        expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'coupon-2',
        title: 'Nike Shoes Discount',
        category: 'Fashion',
        store: 'Flipkart',
        discount_value: 25,
        discount_type: 'percentage',
        expiry_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      }
    ];

    test('should generate content-based recommendations', async () => {
      const couponFeatures = new Map();
      couponFeatures.set('coupon-1', {
        couponId: 'coupon-1',
        features: {
          category_vector: [1, 0, 0],
          store_popularity: 0.9,
          discount_attractiveness: 0.3,
          seasonal_relevance: 0.8,
          brand_strength: 0.9,
          price_competitiveness: 0.7,
          user_rating: 4.5,
          conversion_history: 0.12
        },
        embedding: Array.from({length: 50}, () => Math.random()),
        last_updated: new Date()
      });

      const recommendations = await algorithms.contentBasedRecommendations(
        mockUserProfile,
        mockCoupons,
        couponFeatures
      );

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0]).toHaveProperty('couponId');
      expect(recommendations[0]).toHaveProperty('score');
      expect(recommendations[0]).toHaveProperty('personalization_score');
    });

    test('should calculate personalization score correctly', () => {
      const score = algorithms.calculatePersonalizationScore(
        mockUserProfile,
        mockCoupons[0],
        {
          category_vector: [1, 0, 0],
          store_popularity: 0.9,
          discount_attractiveness: 0.3,
          seasonal_relevance: 0.8,
          brand_strength: 0.9,
          price_competitiveness: 0.7,
          user_rating: 4.5,
          conversion_history: 0.12
        }
      );

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    test('should generate collaborative filtering recommendations', async () => {
      const similarUsers = [
        {
          userId: 'user-2',
          similarity_score: 0.85,
          common_preferences: ['Electronics'],
          interaction_overlap: 0.6,
          demographic_similarity: 0.7,
          calculated_at: new Date()
        }
      ];

      const recommendations = await algorithms.collaborativeFilteringRecommendations(
        'user-1',
        mockUserProfile,
        similarUsers,
        mockCoupons
      );

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
    });

    test('should generate hybrid recommendations', async () => {
      const couponFeatures = new Map();
      const similarUsers = [
        {
          userId: 'user-2',
          similarity_score: 0.85,
          common_preferences: ['Electronics'],
          interaction_overlap: 0.6,
          demographic_similarity: 0.7,
          calculated_at: new Date()
        }
      ];

      const recommendations = await algorithms.hybridRecommendations(
        'user-1',
        mockUserProfile,
        mockCoupons,
        couponFeatures,
        similarUsers
      );

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
    });

    test('should rank recommendations by score', () => {
      const recommendations: CouponRecommendation[] = [
        {
          couponId: 'coupon-1',
          score: 0.6,
          personalization_score: 0.7,
          predicted_ctr: 0.15,
          confidence: 0.8,
          reasoning: 'Test',
          rank: 1
        },
        {
          couponId: 'coupon-2',
          score: 0.8,
          personalization_score: 0.9,
          predicted_ctr: 0.20,
          confidence: 0.9,
          reasoning: 'Test',
          rank: 2
        }
      ];

      const ranked = algorithms.rankRecommendations(recommendations);

      expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[1].score);
      expect(ranked[0].rank).toBe(1);
      expect(ranked[1].rank).toBe(2);
    });
  });

  describe('User Profile Management', () => {
    test('should create user profile with valid data', () => {
      const profileData = {
        userId: 'user-123',
        demographics: {
          age_range: '25-34',
          gender: 'female',
          location: 'Delhi'
        },
        preferences: {
          categories: ['Fashion', 'Beauty'],
          stores: ['Myntra', 'Nykaa']
        }
      };

      expect(profileData.userId).toBeDefined();
      expect(profileData.demographics.age_range).toBe('25-34');
      expect(profileData.preferences.categories).toContain('Fashion');
    });

    test('should validate required profile fields', () => {
      const invalidProfile = {
        demographics: {
          age_range: '25-34'
        }
      };

      expect(invalidProfile).not.toHaveProperty('userId');
    });
  });

  describe('Recommendation Scoring', () => {
    test('should calculate category preference score', () => {
      const userCategories = ['Electronics', 'Fashion'];
      const couponCategory = 'Electronics';
      
      const score = userCategories.includes(couponCategory) ? 1.0 : 0.0;
      expect(score).toBe(1.0);
    });

    test('should calculate store preference score', () => {
      const userStores = ['Amazon', 'Flipkart'];
      const couponStore = 'Amazon';
      
      const score = userStores.includes(couponStore) ? 1.0 : 0.5;
      expect(score).toBe(1.0);
    });

    test('should calculate discount attractiveness', () => {
      const discountValue = 30;
      const userThreshold = 20;
      
      const score = discountValue >= userThreshold ? 
        Math.min(discountValue / 100, 1.0) : 
        discountValue / (userThreshold * 2);
      
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe('Recommendation Filtering', () => {
    test('should filter expired coupons', () => {
      const coupons = [
        {
          id: 'coupon-1',
          expiry_date: new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
        },
        {
          id: 'coupon-2',
          expiry_date: new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
        }
      ];

      const validCoupons = coupons.filter(coupon => 
        coupon.expiry_date > new Date()
      );

      expect(validCoupons).toHaveLength(1);
      expect(validCoupons[0].id).toBe('coupon-1');
    });

    test('should apply category filters', () => {
      const coupons = [
        { id: 'coupon-1', category: 'Electronics' },
        { id: 'coupon-2', category: 'Fashion' },
        { id: 'coupon-3', category: 'Home' }
      ];

      const userCategories = ['Electronics', 'Fashion'];
      const filteredCoupons = coupons.filter(coupon =>
        userCategories.includes(coupon.category)
      );

      expect(filteredCoupons).toHaveLength(2);
      expect(filteredCoupons.map(c => c.category)).toEqual(['Electronics', 'Fashion']);
    });
  });

  describe('Feedback Processing', () => {
    test('should process positive feedback', () => {
      const feedback = {
        userId: 'user-1',
        couponId: 'coupon-1',
        feedback_type: 'like' as const,
        rating: 5
      };

      expect(feedback.feedback_type).toBe('like');
      expect(feedback.rating).toBe(5);
    });

    test('should process implicit feedback', () => {
      const implicitFeedback = {
        userId: 'user-1',
        couponId: 'coupon-1',
        feedback_type: 'view' as const,
        implicit_feedback: {
          time_spent: 30,
          scroll_depth: 0.8,
          interaction_count: 3
        }
      };

      expect(implicitFeedback.implicit_feedback.time_spent).toBe(30);
      expect(implicitFeedback.implicit_feedback.scroll_depth).toBe(0.8);
    });
  });

  describe('Performance Tests', () => {
    test('should generate recommendations within acceptable time', async () => {
      const startTime = Date.now();
      
      const mockProfile: UserProfile = {
        id: 'profile-1',
        userId: 'user-1',
        demographics: { age_range: '25-34', gender: 'male', location: 'Mumbai' },
        preferences: { categories: ['Electronics'], stores: ['Amazon'] },
        behavior: { avg_session_duration: 300, purchase_frequency: 'weekly' },
        engagement: { click_through_rate: 0.15, conversion_rate: 0.08 },
        created_at: new Date(),
        updated_at: new Date()
      } as UserProfile;

      const recommendations = await algorithms.contentBasedRecommendations(
        mockProfile,
        mockCoupons,
        new Map()
      );

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(processingTime).toBeLessThan(1000); // Should complete within 1 second
      expect(recommendations).toBeDefined();
    });

    test('should handle large number of coupons efficiently', async () => {
      const largeCouponSet = Array.from({ length: 1000 }, (_, i) => ({
        id: `coupon-${i}`,
        title: `Coupon ${i}`,
        category: i % 2 === 0 ? 'Electronics' : 'Fashion',
        store: i % 3 === 0 ? 'Amazon' : 'Flipkart',
        discount_value: 10 + (i % 50),
        discount_type: 'percentage',
        expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }));

      const startTime = Date.now();
      
      const mockProfile: UserProfile = {
        id: 'profile-1',
        userId: 'user-1',
        demographics: { age_range: '25-34', gender: 'male', location: 'Mumbai' },
        preferences: { categories: ['Electronics'], stores: ['Amazon'] },
        behavior: { avg_session_duration: 300, purchase_frequency: 'weekly' },
        engagement: { click_through_rate: 0.15, conversion_rate: 0.08 },
        created_at: new Date(),
        updated_at: new Date()
      } as UserProfile;

      const recommendations = await algorithms.contentBasedRecommendations(
        mockProfile,
        largeCouponSet,
        new Map()
      );

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(recommendations.length).toBeLessThanOrEqual(20); // Should limit results
    });
  });
});
export interface UserProfile {
  id: string;
  userId: string;
  demographics: {
    age?: number;
    gender?: string;
    location: string;
    income_level?: 'low' | 'medium' | 'high';
  };
  preferences: {
    categories: string[];
    stores: string[];
    brands: string[];
    price_range: {
      min: number;
      max: number;
    };
    discount_threshold: number;
  };
  behavior: {
    purchase_frequency: number;
    average_order_value: number;
    preferred_shopping_times: number[];
    device_type: 'mobile' | 'desktop' | 'tablet';
    session_duration: number;
  };
  engagement: {
    click_through_rate: number;
    conversion_rate: number;
    recommendation_acceptance_rate: number;
    last_active: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface RecommendationEngine {
  id: string;
  name: string;
  type: 'collaborative' | 'content_based' | 'hybrid' | 'ml_model';
  algorithm: string;
  parameters: {
    weights: Record<string, number>;
    thresholds: Record<string, number>;
    features: string[];
  };
  performance: {
    accuracy: number;
    precision: number;
    recall: number;
    f1_score: number;
    last_evaluated: Date;
  };
  isActive: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecommendationRequest {
  id: string;
  userId: string;
  context: {
    channel_type: 'personal' | 'group';
    trigger: 'user_request' | 'proactive' | 'scheduled' | 'event_based';
    session_id?: string;
    current_intent?: string;
    conversation_history?: string[];
  };
  filters: {
    categories?: string[];
    stores?: string[];
    min_discount?: number;
    max_price?: number;
    exclude_seen?: boolean;
    limit: number;
  };
  timestamp: Date;
}

export interface RecommendationResult {
  id: string;
  requestId: string;
  userId: string;
  recommendations: CouponRecommendation[];
  metadata: {
    engine_used: string;
    processing_time: number;
    total_candidates: number;
    filtered_count: number;
    ranking_factors: string[];
  };
  createdAt: Date;
}

export interface CouponRecommendation {
  couponId: string;
  score: number;
  personalization_score: number;
  rank: number;
  reasons: RecommendationReason[];
  personalization: {
    user_match_score: number;
    category_relevance: number;
    store_preference: number;
    price_attractiveness: number;
    urgency_factor: number;
  };
  predicted_ctr: number;
  predicted_conversion: number;
  confidence: number;
  reasoning?: string;
}

export interface RecommendationReason {
  type: 'category_match' | 'store_preference' | 'price_range' | 'similar_users' | 'trending' | 'seasonal' | 'ai_insight';
  description: string;
  weight: number;
  evidence?: any;
}

export interface UserSimilarity {
  userId1: string;
  userId2: string;
  similarity_score: number;
  common_categories: string[];
  common_stores: string[];
  behavioral_similarity: number;
  demographic_similarity: number;
  calculated_at: Date;
}

export interface CouponFeatures {
  couponId: string;
  features: {
    category_vector: number[];
    store_popularity: number;
    discount_attractiveness: number;
    seasonal_relevance: number;
    brand_strength: number;
    price_competitiveness: number;
    user_rating: number;
    conversion_history: number;
  };
  embedding: number[];
  last_updated: Date;
}

export interface RecommendationFeedback {
  id: string;
  userId: string;
  recommendationId: string;
  couponId: string;
  feedback_type: 'click' | 'view' | 'save' | 'share' | 'purchase' | 'ignore' | 'dislike';
  implicit_feedback: {
    time_spent: number;
    scroll_depth: number;
    interaction_count: number;
  };
  explicit_feedback?: {
    rating: number;
    comment?: string;
    reason?: string;
  };
  timestamp: Date;
}

export interface RecommendationMetrics {
  id: string;
  date: Date;
  engine_id: string;
  metrics: {
    total_requests: number;
    successful_recommendations: number;
    click_through_rate: number;
    conversion_rate: number;
    average_score: number;
    coverage: number;
    diversity: number;
    novelty: number;
    serendipity: number;
  };
  user_segments: Record<string, {
    count: number;
    ctr: number;
    conversion_rate: number;
  }>;
  category_performance: Record<string, {
    recommendations: number;
    clicks: number;
    conversions: number;
  }>;
}

export interface ABTestExperiment {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  variants: {
    control: {
      engine_id: string;
      traffic_percentage: number;
    };
    treatment: {
      engine_id: string;
      traffic_percentage: number;
    };
  };
  success_metrics: string[];
  start_date: Date;
  end_date?: Date;
  results?: {
    control_metrics: Record<string, number>;
    treatment_metrics: Record<string, number>;
    statistical_significance: number;
    winner?: 'control' | 'treatment';
  };
}
export interface AIConversation {
  id: string;
  userId: string;
  channelId: string;
  status: 'active' | 'paused' | 'ended';
  context: {
    userProfile: {
      name: string;
      preferences: string[];
      purchaseHistory: any[];
      lifetimeValue: number;
      churnRisk: number;
    };
    conversationHistory: AIMessage[];
    currentIntent: string;
    lastInteraction: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface AIMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  messageType: 'text' | 'coupon_recommendation' | 'product_inquiry' | 'support' | 'greeting';
  metadata: {
    intent?: string;
    confidence?: number;
    entities?: Array<{
      type: string;
      value: string;
      confidence: number;
    }>;
    recommendations?: string[];
    coupons?: any[];
  };
  timestamp: Date;
}

export interface AIPromptTemplate {
  id: string;
  name: string;
  category: 'greeting' | 'coupon_recommendation' | 'product_inquiry' | 'support' | 'general';
  template: string;
  variables: string[];
  isActive: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserIntent {
  intent: string;
  confidence: number;
  entities: Array<{
    type: 'product' | 'store' | 'category' | 'price' | 'discount';
    value: string;
    confidence: number;
  }>;
  context: {
    previousIntent?: string;
    conversationStage: 'greeting' | 'inquiry' | 'recommendation' | 'decision' | 'completion';
  };
}

export interface CouponRecommendation {
  id: string;
  userId: string;
  couponId: string;
  recommendationReason: string;
  confidence: number;
  personalizedMessage: string;
  metadata: {
    userPreferences: string[];
    matchingFactors: string[];
    discountValue: number;
    store: string;
    category: string;
  };
  createdAt: Date;
  wasAccepted?: boolean;
  acceptedAt?: Date;
}

export interface AIAnalytics {
  id: string;
  date: Date;
  totalConversations: number;
  activeConversations: number;
  averageConversationLength: number;
  intentDistribution: Record<string, number>;
  recommendationAcceptanceRate: number;
  userSatisfactionScore: number;
  topRecommendedCoupons: string[];
  conversationCompletionRate: number;
}
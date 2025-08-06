export interface Group {
  id: string;
  telegramGroupId: string;
  name: string;
  description?: string;
  isActive: boolean;
  memberCount: number;
  moderationLevel: 'low' | 'medium' | 'high';
  allowCouponCreation: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupMessage {
  id: string;
  groupId: string;
  userId: string;
  messageId: string;
  content: string;
  messageType: 'text' | 'coupon' | 'media' | 'link' | 'spam';
  isModerated: boolean;
  moderationAction?: 'approved' | 'deleted' | 'warned' | 'banned';
  moderationReason?: string;
  createdAt: Date;
  moderatedAt?: Date;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: 'member' | 'moderator' | 'admin';
  status: 'active' | 'muted' | 'banned';
  joinedAt: Date;
  lastActiveAt: Date;
  warningCount: number;
  contributionScore: number;
}

export interface ModerationRule {
  id: string;
  groupId: string;
  ruleType: 'spam_detection' | 'link_filter' | 'keyword_filter' | 'rate_limit' | 'duplicate_content';
  isActive: boolean;
  parameters: {
    keywords?: string[];
    allowedDomains?: string[];
    maxMessagesPerMinute?: number;
    minMessageLength?: number;
    maxMessageLength?: number;
    bannedWords?: string[];
  };
  action: 'warn' | 'delete' | 'mute' | 'ban';
  severity: 'low' | 'medium' | 'high';
  createdAt: Date;
}

export interface CouponCreationRequest {
  id: string;
  groupId: string;
  userId: string;
  messageId: string;
  title: string;
  description: string;
  store: string;
  discountType: 'percentage' | 'fixed' | 'offer';
  discountValue?: number;
  couponCode?: string;
  link: string;
  status: 'pending' | 'approved' | 'rejected' | 'published';
  moderatorId?: string;
  moderationNotes?: string;
  createdAt: Date;
  moderatedAt?: Date;
}

export interface GroupAnalytics {
  groupId: string;
  date: Date;
  messageCount: number;
  activeMembers: number;
  couponsCreated: number;
  moderationActions: number;
  engagementRate: number;
  spamDetected: number;
}
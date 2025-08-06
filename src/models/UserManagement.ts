export interface User {
  id: string;
  telegramId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  email?: string;
  isActive: boolean;
  isBanned: boolean;
  bannedAt?: Date;
  bannedBy?: string;
  banReason?: string;
  banExpiresAt?: Date;
  registeredAt: Date;
  lastActiveAt?: Date;
  totalSpent: number;
  couponsUsed: number;
  personalChannelId?: string;
  channelStatus: 'active' | 'suspended' | 'deleted' | 'none';
  location?: string;
  language: string;
  timezone?: string;
  preferences: {
    notifications: boolean;
    categories: string[];
    stores: string[];
  };
  metadata: {
    deviceInfo?: string;
    referralSource?: string;
    firstInteraction?: string;
    tags: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface UserFilter {
  isActive?: boolean;
  isBanned?: boolean;
  channelStatus?: 'active' | 'suspended' | 'deleted' | 'none';
  registrationDateRange?: { from: Date; to: Date };
  lastActiveDateRange?: { from: Date; to: Date };
  totalSpentRange?: { min: number; max: number };
  couponsUsedRange?: { min: number; max: number };
  location?: string;
  language?: string;
  hasPersonalChannel?: boolean;
  activityLevel?: 'high' | 'medium' | 'low' | 'inactive';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  bannedUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  usersWithPersonalChannels: number;
  suspendedChannels: number;
  deletedChannels: number;
  averageSpentPerUser: number;
  averageCouponsPerUser: number;
  topSpenders: Array<{
    userId: string;
    username?: string;
    totalSpent: number;
  }>;
  topCouponUsers: Array<{
    userId: string;
    username?: string;
    couponsUsed: number;
  }>;
  usersByLocation: Array<{
    location: string;
    count: number;
    percentage: number;
  }>;
  usersByLanguage: Array<{
    language: string;
    count: number;
    percentage: number;
  }>;
  activityLevels: {
    high: number;
    medium: number;
    low: number;
    inactive: number;
  };
  registrationTrend: Array<{
    date: string;
    count: number;
  }>;
}

export type BanAction = 'ban' | 'unban';

export interface UserActivity {
  id: string;
  userId: string;
  activityType: 'login' | 'coupon_view' | 'coupon_use' | 'purchase' | 'channel_interaction' | 'search' | 'other';
  description: string;
  metadata: {
    couponId?: string;
    amount?: number;
    searchTerm?: string;
    channelId?: string;
    [key: string]: any;
  };
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

export interface UserSegment {
  id: string;
  name: string;
  description: string;
  criteria: {
    registrationDateRange?: { from: Date; to: Date };
    activityLevel?: 'high' | 'medium' | 'low' | 'inactive';
    totalSpent?: { min?: number; max?: number };
    couponUsage?: { min?: number; max?: number };
    channelStatus?: 'active' | 'suspended' | 'deleted';
    isBanned?: boolean;
    location?: string;
  };
  userCount: number;
  users: User[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UserExport {
  fields?: string[];
  includePersonalData?: boolean;
  includeActivityData?: boolean;
  includePreferences?: boolean;
  dateRange?: { from: Date; to: Date };
}

export interface ChannelManagement {
  id: string;
  userId: string;
  channelId: string;
  status: 'active' | 'suspended' | 'deleted';
  createdBy: string;
  createdAt: Date;
  suspendedBy?: string;
  suspendedAt?: Date;
  suspensionReason?: string;
  restoredBy?: string;
  restoredAt?: Date;
  restorationReason?: string;
  deletedBy?: string;
  deletedAt?: Date;
  deletionReason?: string;
  metadata: {
    messageCount?: number;
    lastMessageAt?: Date;
    subscriberCount?: number;
    engagementRate?: number;
  };
}

export interface ModerationLog {
  id: string;
  userId: string;
  moderatorId: string;
  action: 'user_banned' | 'user_unbanned' | 'channel_created' | 'channel_suspended' | 'channel_restored' | 'channel_deleted' | 'user_updated' | 'notification_sent';
  reason?: string;
  metadata?: {
    duration?: number;
    channelId?: string;
    previousValues?: any;
    newValues?: any;
    [key: string]: any;
  };
  timestamp: Date;
}

export interface UserEngagementMetrics {
  userId: string;
  totalSessions: number;
  averageSessionDuration: number; // in minutes
  totalCouponsUsed: number;
  totalSpent: number;
  lastActiveAt: Date;
  engagementScore: number; // 0-100
  activityLevel: 'high' | 'medium' | 'low' | 'inactive';
  weeklyActivity: Array<{
    week: string;
    sessions: number;
    duration: number;
    couponsUsed: number;
    spent: number;
  }>;
  categoryPreferences: Array<{
    category: string;
    interactionCount: number;
    conversionRate: number;
  }>;
  channelEngagement: {
    messagesReceived: number;
    messagesClicked: number;
    clickThroughRate: number;
    lastInteractionAt?: Date;
  };
}

export interface UserNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'promotion' | 'system';
  actionUrl?: string;
  isRead: boolean;
  sentBy: string;
  sentAt: Date;
  readAt?: Date;
  metadata?: {
    campaignId?: string;
    segmentId?: string;
    [key: string]: any;
  };
}

export interface BanList {
  id: string;
  userId: string;
  telegramId: number;
  username?: string;
  banType: 'temporary' | 'permanent' | 'ip_ban' | 'device_ban';
  reason: string;
  bannedBy: string;
  bannedAt: Date;
  expiresAt?: Date;
  isActive: boolean;
  appealStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  appealReason?: string;
  appealedAt?: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
}

export interface UserRestriction {
  id: string;
  userId: string;
  restrictionType: 'channel_access' | 'coupon_usage' | 'message_sending' | 'group_participation';
  isActive: boolean;
  reason: string;
  appliedBy: string;
  appliedAt: Date;
  expiresAt?: Date;
  metadata?: {
    maxCouponsPerDay?: number;
    allowedChannels?: string[];
    blockedFeatures?: string[];
    [key: string]: any;
  };
}

export interface GroupModerationSettings {
  id: string;
  groupId: string;
  autoModeration: {
    enabled: boolean;
    spamDetection: boolean;
    linkFiltering: boolean;
    profanityFilter: boolean;
    duplicateMessageFilter: boolean;
  };
  restrictions: {
    newMemberRestrictions: boolean;
    messageFrequencyLimit: number; // messages per minute
    linkPostingAllowed: boolean;
    mediaPostingAllowed: boolean;
    forwardingAllowed: boolean;
  };
  moderators: string[]; // User IDs
  bannedWords: string[];
  allowedDomains: string[];
  warningThresholds: {
    autoWarn: number;
    autoMute: number;
    autoBan: number;
  };
  createdAt: Date;
  updatedAt: Date;
}
export interface PersonalChannel {
  id: string;
  userId: string;
  channelId: string;
  isActive: boolean;
  lastMessageAt?: Date;
  engagementScore: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePersonalChannelRequest {
  userId: string;
  channelId: string;
}

export interface UpdatePersonalChannelRequest {
  isActive?: boolean;
  lastMessageAt?: Date;
  engagementScore?: number;
}

export interface ChannelMessage {
  channelId: string;
  message: string;
  messageType: 'text' | 'photo' | 'document' | 'coupon' | 'recommendation';
  metadata?: {
    couponId?: string;
    imageUrl?: string;
    buttons?: Array<{
      text: string;
      url?: string;
      callbackData?: string;
    }>;
  };
}

export interface ChannelActivity {
  channelId: string;
  userId: string;
  activityType: 'message_sent' | 'message_read' | 'button_clicked' | 'link_clicked';
  timestamp: Date;
  metadata?: Record<string, any>;
}
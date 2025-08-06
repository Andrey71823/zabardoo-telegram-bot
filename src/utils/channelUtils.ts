import { User } from '../models/User';
import { PersonalChannel } from '../models/PersonalChannel';

/**
 * Generate a unique channel ID for a user
 */
export function generateChannelId(user: User): string {
  const cleanName = user.firstName.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `channel_${cleanName}_${user.telegramId}`;
}

/**
 * Calculate engagement score based on channel activity
 */
export function calculateEngagementScore(
  messagesReceived: number,
  messagesRead: number,
  linksClicked: number,
  daysActive: number
): number {
  if (daysActive === 0) return 0;
  
  const messageEngagement = (messagesRead / Math.max(messagesReceived, 1)) * 40;
  const clickEngagement = (linksClicked / Math.max(messagesReceived, 1)) * 30;
  const activityBonus = Math.min(daysActive * 2, 30);
  
  return Math.min(messageEngagement + clickEngagement + activityBonus, 100);
}

/**
 * Determine if a channel is considered active
 */
export function isChannelActive(channel: PersonalChannel): boolean {
  if (!channel.isActive) return false;
  
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  return channel.lastMessageAt ? channel.lastMessageAt > sevenDaysAgo : false;
}

/**
 * Format a welcome message for new users
 */
export function formatWelcomeMessage(user: User, languageCode: string = 'en'): string {
  const messages = {
    en: `🎉 Welcome to Zabardoo, ${user.firstName}!

Your personal channel is ready! Here you'll receive personalized coupon recommendations and can chat with our AI assistant.

💡 Type "help" to learn more about what I can do for you.

🛍️ Start saving money with the best deals in India!`,
    
    hi: `🎉 Zabardoo में आपका स्वागत है, ${user.firstName}!

आपका व्यक्तिगत चैनल तैयार है! यहाँ आपको व्यक्तिगत कूपन सिफारिशें मिलेंगी और आप हमारे AI सहायक से बात कर सकते हैं।

💡 "help" टाइप करें ताकि आप जान सकें कि मैं आपके लिए क्या कर सकता हूँ।

🛍️ भारत की सबसे अच्छी डील्स के साथ पैसे बचाना शुरू करें!`
  };
  
  return messages[languageCode as keyof typeof messages] || messages.en;
}

/**
 * Format a coupon recommendation message
 */
export function formatCouponMessage(coupon: any, user: User): string {
  const discountText = coupon.discount_type === 'percentage' 
    ? `${coupon.discount_value}% OFF`
    : coupon.discount_type === 'fixed'
    ? `₹${coupon.discount_value} OFF`
    : 'Special Offer';
    
  return `🎯 Personalized recommendation for you, ${user.firstName}!

🏪 **${coupon.title}**
${coupon.description}

💰 **${discountText}**
${coupon.coupon_code ? `🎫 Code: \`${coupon.coupon_code}\`` : ''}

⏰ ${coupon.expiry_date ? `Valid until: ${new Date(coupon.expiry_date).toLocaleDateString()}` : 'Limited time offer'}

🛒 Click below to get this deal!`;
}

/**
 * Validate channel message content
 */
export function validateChannelMessage(message: string, messageType: string): { valid: boolean; error?: string } {
  if (!message || message.trim().length === 0) {
    return { valid: false, error: 'Message content cannot be empty' };
  }
  
  if (message.length > 4096) {
    return { valid: false, error: 'Message content too long (max 4096 characters)' };
  }
  
  const validTypes = ['text', 'photo', 'document', 'coupon', 'recommendation'];
  if (!validTypes.includes(messageType)) {
    return { valid: false, error: 'Invalid message type' };
  }
  
  return { valid: true };
}

/**
 * Extract user preferences from interaction history
 */
export function extractUserPreferences(activities: any[]): {
  preferredCategories: string[];
  preferredStores: string[];
  engagementPatterns: {
    bestTimeToSend: number; // hour of day
    preferredMessageTypes: string[];
  };
} {
  const categoryClicks: { [key: string]: number } = {};
  const storeClicks: { [key: string]: number } = {};
  const hourlyActivity: { [key: number]: number } = {};
  const messageTypeEngagement: { [key: string]: number } = {};
  
  activities.forEach(activity => {
    if (activity.metadata) {
      // Track category preferences
      if (activity.metadata.category) {
        categoryClicks[activity.metadata.category] = (categoryClicks[activity.metadata.category] || 0) + 1;
      }
      
      // Track store preferences
      if (activity.metadata.store) {
        storeClicks[activity.metadata.store] = (storeClicks[activity.metadata.store] || 0) + 1;
      }
      
      // Track time patterns
      const hour = new Date(activity.timestamp).getHours();
      hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1;
      
      // Track message type engagement
      if (activity.metadata.messageType) {
        messageTypeEngagement[activity.metadata.messageType] = 
          (messageTypeEngagement[activity.metadata.messageType] || 0) + 1;
      }
    }
  });
  
  // Get top preferences
  const preferredCategories = Object.entries(categoryClicks)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([category]) => category);
    
  const preferredStores = Object.entries(storeClicks)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([store]) => store);
    
  // Find best time to send (hour with most activity)
  const bestTimeToSend = Object.entries(hourlyActivity)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || '18'; // default to 6 PM
    
  const preferredMessageTypes = Object.entries(messageTypeEngagement)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([type]) => type);
  
  return {
    preferredCategories,
    preferredStores,
    engagementPatterns: {
      bestTimeToSend: parseInt(bestTimeToSend),
      preferredMessageTypes
    }
  };
}

/**
 * Generate channel analytics summary
 */
export function generateChannelSummary(channels: PersonalChannel[]): {
  totalChannels: number;
  activeChannels: number;
  averageEngagement: number;
  topPerformingChannels: PersonalChannel[];
  inactiveChannels: PersonalChannel[];
} {
  const activeChannels = channels.filter(isChannelActive);
  const averageEngagement = channels.reduce((sum, channel) => sum + channel.engagementScore, 0) / channels.length || 0;
  
  const topPerformingChannels = channels
    .filter(channel => channel.engagementScore > 70)
    .sort((a, b) => b.engagementScore - a.engagementScore)
    .slice(0, 10);
    
  const inactiveChannels = channels.filter(channel => !isChannelActive(channel));
  
  return {
    totalChannels: channels.length,
    activeChannels: activeChannels.length,
    averageEngagement: Math.round(averageEngagement * 100) / 100,
    topPerformingChannels,
    inactiveChannels
  };
}
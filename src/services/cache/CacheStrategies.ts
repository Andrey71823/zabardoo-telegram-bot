import { cacheManager, CacheOptions } from './CacheManager';
import { logger } from '../../config/logger';

/**
 * Cache strategies for different types of data
 */

export class UserCacheStrategy {
  private static readonly PREFIX = 'user:';
  private static readonly DEFAULT_TTL = 1800; // 30 minutes

  static async getUser(userId: string): Promise<any | null> {
    return await cacheManager.get(`${this.PREFIX}${userId}`, {
      ttl: this.DEFAULT_TTL,
      prefix: ''
    });
  }

  static async setUser(userId: string, userData: any): Promise<boolean> {
    return await cacheManager.setWithTags(
      `${this.PREFIX}${userId}`,
      userData,
      ['users', `user:${userId}`],
      {
        ttl: this.DEFAULT_TTL,
        prefix: ''
      }
    );
  }

  static async invalidateUser(userId: string): Promise<boolean> {
    return await cacheManager.delete(`${this.PREFIX}${userId}`, { prefix: '' });
  }

  static async invalidateAllUsers(): Promise<number> {
    return await cacheManager.invalidateByTag('users');
  }

  static async getUserSession(userId: string): Promise<any | null> {
    return await cacheManager.get(`${this.PREFIX}session:${userId}`, {
      ttl: 3600, // 1 hour
      prefix: ''
    });
  }

  static async setUserSession(userId: string, sessionData: any): Promise<boolean> {
    return await cacheManager.set(`${this.PREFIX}session:${userId}`, sessionData, {
      ttl: 3600,
      prefix: ''
    });
  }
}

export class CouponCacheStrategy {
  private static readonly PREFIX = 'coupon:';
  private static readonly DEFAULT_TTL = 3600; // 1 hour

  static async getCoupon(couponId: string): Promise<any | null> {
    return await cacheManager.get(`${this.PREFIX}${couponId}`, {
      ttl: this.DEFAULT_TTL,
      prefix: ''
    });
  }

  static async setCoupon(couponId: string, couponData: any): Promise<boolean> {
    const tags = ['coupons', `coupon:${couponId}`];
    
    // Add store-specific tag if available
    if (couponData.storeId) {
      tags.push(`store:${couponData.storeId}`);
    }
    
    // Add category-specific tag if available
    if (couponData.category) {
      tags.push(`category:${couponData.category}`);
    }

    return await cacheManager.setWithTags(
      `${this.PREFIX}${couponId}`,
      couponData,
      tags,
      {
        ttl: this.DEFAULT_TTL,
        prefix: ''
      }
    );
  }

  static async getActiveCoupons(): Promise<any[] | null> {
    return await cacheManager.get('coupons:active', {
      ttl: 600, // 10 minutes
      prefix: ''
    });
  }

  static async setActiveCoupons(coupons: any[]): Promise<boolean> {
    return await cacheManager.setWithTags(
      'coupons:active',
      coupons,
      ['coupons', 'active-coupons'],
      {
        ttl: 600,
        prefix: ''
      }
    );
  }

  static async getCouponsByStore(storeId: string): Promise<any[] | null> {
    return await cacheManager.get(`coupons:store:${storeId}`, {
      ttl: 1800, // 30 minutes
      prefix: ''
    });
  }

  static async setCouponsByStore(storeId: string, coupons: any[]): Promise<boolean> {
    return await cacheManager.setWithTags(
      `coupons:store:${storeId}`,
      coupons,
      ['coupons', `store:${storeId}`],
      {
        ttl: 1800,
        prefix: ''
      }
    );
  }

  static async invalidateCoupon(couponId: string): Promise<boolean> {
    // Invalidate specific coupon and related data
    await cacheManager.invalidateByTag(`coupon:${couponId}`);
    return await cacheManager.delete(`${this.PREFIX}${couponId}`, { prefix: '' });
  }

  static async invalidateStore(storeId: string): Promise<number> {
    return await cacheManager.invalidateByTag(`store:${storeId}`);
  }

  static async invalidateAllCoupons(): Promise<number> {
    return await cacheManager.invalidateByTag('coupons');
  }
}

export class AnalyticsCacheStrategy {
  private static readonly PREFIX = 'analytics:';
  private static readonly DEFAULT_TTL = 7200; // 2 hours

  static async getDashboardStats(): Promise<any | null> {
    return await cacheManager.get('dashboard:stats', {
      ttl: 300, // 5 minutes
      prefix: ''
    });
  }

  static async setDashboardStats(stats: any): Promise<boolean> {
    return await cacheManager.setWithTags(
      'dashboard:stats',
      stats,
      ['analytics', 'dashboard'],
      {
        ttl: 300,
        prefix: ''
      }
    );
  }

  static async getUserAnalytics(userId: string, period: string): Promise<any | null> {
    return await cacheManager.get(`${this.PREFIX}user:${userId}:${period}`, {
      ttl: this.DEFAULT_TTL,
      prefix: ''
    });
  }

  static async setUserAnalytics(userId: string, period: string, analytics: any): Promise<boolean> {
    return await cacheManager.setWithTags(
      `${this.PREFIX}user:${userId}:${period}`,
      analytics,
      ['analytics', `user:${userId}`, `period:${period}`],
      {
        ttl: this.DEFAULT_TTL,
        prefix: ''
      }
    );
  }

  static async getTrafficAnalytics(period: string): Promise<any | null> {
    return await cacheManager.get(`${this.PREFIX}traffic:${period}`, {
      ttl: 1800, // 30 minutes
      prefix: ''
    });
  }

  static async setTrafficAnalytics(period: string, analytics: any): Promise<boolean> {
    return await cacheManager.setWithTags(
      `${this.PREFIX}traffic:${period}`,
      analytics,
      ['analytics', 'traffic', `period:${period}`],
      {
        ttl: 1800,
        prefix: ''
      }
    );
  }

  static async getConversionFunnel(funnelId: string): Promise<any | null> {
    return await cacheManager.get(`${this.PREFIX}funnel:${funnelId}`, {
      ttl: 3600, // 1 hour
      prefix: ''
    });
  }

  static async setConversionFunnel(funnelId: string, funnelData: any): Promise<boolean> {
    return await cacheManager.setWithTags(
      `${this.PREFIX}funnel:${funnelId}`,
      funnelData,
      ['analytics', 'funnels', `funnel:${funnelId}`],
      {
        ttl: 3600,
        prefix: ''
      }
    );
  }

  static async invalidateAnalytics(): Promise<number> {
    return await cacheManager.invalidateByTag('analytics');
  }

  static async invalidateUserAnalytics(userId: string): Promise<number> {
    return await cacheManager.invalidateByTag(`user:${userId}`);
  }
}

export class CampaignCacheStrategy {
  private static readonly PREFIX = 'campaign:';
  private static readonly DEFAULT_TTL = 1800; // 30 minutes

  static async getCampaign(campaignId: string): Promise<any | null> {
    return await cacheManager.get(`${this.PREFIX}${campaignId}`, {
      ttl: this.DEFAULT_TTL,
      prefix: ''
    });
  }

  static async setCampaign(campaignId: string, campaignData: any): Promise<boolean> {
    const tags = ['campaigns', `campaign:${campaignId}`];
    
    // Add status-specific tag
    if (campaignData.status) {
      tags.push(`status:${campaignData.status}`);
    }
    
    // Add type-specific tag
    if (campaignData.type) {
      tags.push(`type:${campaignData.type}`);
    }

    return await cacheManager.setWithTags(
      `${this.PREFIX}${campaignId}`,
      campaignData,
      tags,
      {
        ttl: this.DEFAULT_TTL,
        prefix: ''
      }
    );
  }

  static async getActiveCampaigns(): Promise<any[] | null> {
    return await cacheManager.get('campaigns:active', {
      ttl: 600, // 10 minutes
      prefix: ''
    });
  }

  static async setActiveCampaigns(campaigns: any[]): Promise<boolean> {
    return await cacheManager.setWithTags(
      'campaigns:active',
      campaigns,
      ['campaigns', 'active-campaigns'],
      {
        ttl: 600,
        prefix: ''
      }
    );
  }

  static async getCampaignStats(campaignId: string): Promise<any | null> {
    return await cacheManager.get(`${this.PREFIX}stats:${campaignId}`, {
      ttl: 300, // 5 minutes
      prefix: ''
    });
  }

  static async setCampaignStats(campaignId: string, stats: any): Promise<boolean> {
    return await cacheManager.setWithTags(
      `${this.PREFIX}stats:${campaignId}`,
      stats,
      ['campaigns', 'campaign-stats', `campaign:${campaignId}`],
      {
        ttl: 300,
        prefix: ''
      }
    );
  }

  static async invalidateCampaign(campaignId: string): Promise<number> {
    return await cacheManager.invalidateByTag(`campaign:${campaignId}`);
  }

  static async invalidateAllCampaigns(): Promise<number> {
    return await cacheManager.invalidateByTag('campaigns');
  }
}

export class RecommendationCacheStrategy {
  private static readonly PREFIX = 'recommendation:';
  private static readonly DEFAULT_TTL = 1800; // 30 minutes

  static async getUserRecommendations(userId: string): Promise<any[] | null> {
    return await cacheManager.get(`${this.PREFIX}user:${userId}`, {
      ttl: this.DEFAULT_TTL,
      prefix: ''
    });
  }

  static async setUserRecommendations(userId: string, recommendations: any[]): Promise<boolean> {
    return await cacheManager.setWithTags(
      `${this.PREFIX}user:${userId}`,
      recommendations,
      ['recommendations', `user:${userId}`],
      {
        ttl: this.DEFAULT_TTL,
        prefix: ''
      }
    );
  }

  static async getPopularRecommendations(): Promise<any[] | null> {
    return await cacheManager.get('recommendations:popular', {
      ttl: 3600, // 1 hour
      prefix: ''
    });
  }

  static async setPopularRecommendations(recommendations: any[]): Promise<boolean> {
    return await cacheManager.setWithTags(
      'recommendations:popular',
      recommendations,
      ['recommendations', 'popular'],
      {
        ttl: 3600,
        prefix: ''
      }
    );
  }

  static async getTrendingRecommendations(): Promise<any[] | null> {
    return await cacheManager.get('recommendations:trending', {
      ttl: 1800, // 30 minutes
      prefix: ''
    });
  }

  static async setTrendingRecommendations(recommendations: any[]): Promise<boolean> {
    return await cacheManager.setWithTags(
      'recommendations:trending',
      recommendations,
      ['recommendations', 'trending'],
      {
        ttl: 1800,
        prefix: ''
      }
    );
  }

  static async invalidateUserRecommendations(userId: string): Promise<boolean> {
    return await cacheManager.delete(`${this.PREFIX}user:${userId}`, { prefix: '' });
  }

  static async invalidateAllRecommendations(): Promise<number> {
    return await cacheManager.invalidateByTag('recommendations');
  }
}

/**
 * Cache warming strategies
 */
export class CacheWarmingService {
  static async warmEssentialData(): Promise<void> {
    logger.info('CacheWarmingService: Starting essential data warming');

    const warmingFunctions = [
      {
        key: 'coupons:active',
        fetchFunction: async () => {
          // This would typically fetch from database
          return []; // Placeholder
        },
        options: { ttl: 600 }
      },
      {
        key: 'dashboard:stats',
        fetchFunction: async () => {
          // This would typically calculate dashboard stats
          return {}; // Placeholder
        },
        options: { ttl: 300 }
      },
      {
        key: 'recommendations:popular',
        fetchFunction: async () => {
          // This would typically fetch popular recommendations
          return []; // Placeholder
        },
        options: { ttl: 3600 }
      }
    ];

    await cacheManager.warmCache(warmingFunctions);
  }

  static async warmUserData(userId: string): Promise<void> {
    logger.info(`CacheWarmingService: Warming data for user ${userId}`);

    const warmingFunctions = [
      {
        key: `user:${userId}`,
        fetchFunction: async () => {
          // Fetch user data from database
          return {}; // Placeholder
        },
        options: { ttl: 1800 }
      },
      {
        key: `recommendation:user:${userId}`,
        fetchFunction: async () => {
          // Generate user recommendations
          return []; // Placeholder
        },
        options: { ttl: 1800 }
      }
    ];

    await cacheManager.warmCache(warmingFunctions);
  }

  static async scheduleRegularWarming(): Promise<void> {
    // Warm essential data every 5 minutes
    setInterval(async () => {
      try {
        await this.warmEssentialData();
      } catch (error) {
        logger.error('CacheWarmingService: Error during scheduled warming:', error);
      }
    }, 5 * 60 * 1000);

    logger.info('CacheWarmingService: Scheduled regular cache warming');
  }
}
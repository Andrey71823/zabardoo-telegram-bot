import { EventEmitter } from 'events';
import { logger } from '../../config/logger';

export interface LootReward {
  id: string;
  name: string;
  type: 'cashback' | 'xp' | 'achievement' | 'discount_coupon' | 'premium_access';
  value: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  emoji: string;
  description: string;
  probability: number; // 0-100
}

export interface SpinResult {
  id: string;
  userId: string;
  reward: LootReward;
  timestamp: Date;
  spinType: 'daily' | 'premium' | 'achievement';
}

export interface UserLootData {
  userId: string;
  dailySpinsUsed: number;
  dailySpinsLimit: number;
  premiumSpinsUsed: number;
  premiumSpinsLimit: number;
  lastDailyReset: Date;
  totalSpins: number;
  totalRewardsEarned: number;
  currentStreak: number;
  longestStreak: number;
  lastSpinDate: Date;
}

export class LootModeService extends EventEmitter {
  private rewards: Map<string, LootReward> = new Map();
  private userLootData: Map<string, UserLootData> = new Map();
  private spinHistory: Map<string, SpinResult[]> = new Map();
  private seasonalMultiplier: number = 1.0;

  constructor() {
    super();
    this.initializeRewards();
    this.startDailyReset();
    logger.info('LootModeService initialized with 4 rarity tiers');
  }

  private initializeRewards(): void {
    const rewards: LootReward[] = [
      // Common rewards (60% probability)
      {
        id: 'common_cashback_small',
        name: 'Small Cashback',
        type: 'cashback',
        value: 10,
        rarity: 'common',
        emoji: '💰',
        description: '₹10 instant cashback',
        probability: 25
      },
      {
        id: 'common_xp_small',
        name: 'XP Boost',
        type: 'xp',
        value: 50,
        rarity: 'common',
        emoji: '⚡',
        description: '50 XP points',
        probability: 20
      },
      {
        id: 'common_discount_5',
        name: '5% Discount',
        type: 'discount_coupon',
        value: 5,
        rarity: 'common',
        emoji: '🎫',
        description: '5% off on next purchase',
        probability: 15
      },

      // Rare rewards (25% probability)
      {
        id: 'rare_cashback_medium',
        name: 'Medium Cashback',
        type: 'cashback',
        value: 50,
        rarity: 'rare',
        emoji: '💎',
        description: '₹50 instant cashback',
        probability: 12
      },
      {
        id: 'rare_xp_medium',
        name: 'XP Surge',
        type: 'xp',
        value: 200,
        rarity: 'rare',
        emoji: '🚀',
        description: '200 XP points',
        probability: 8
      },
      {
        id: 'rare_discount_15',
        name: '15% Discount',
        type: 'discount_coupon',
        value: 15,
        rarity: 'rare',
        emoji: '🎟️',
        description: '15% off on next purchase',
        probability: 5
      },

      // Epic rewards (12% probability)
      {
        id: 'epic_cashback_large',
        name: 'Large Cashback',
        type: 'cashback',
        value: 200,
        rarity: 'epic',
        emoji: '💸',
        description: '₹200 instant cashback',
        probability: 6
      },
      {
        id: 'epic_xp_large',
        name: 'XP Explosion',
        type: 'xp',
        value: 500,
        rarity: 'epic',
        emoji: '💥',
        description: '500 XP points',
        probability: 4
      },
      {
        id: 'epic_premium_access',
        name: 'Premium Access',
        type: 'premium_access',
        value: 7,
        rarity: 'epic',
        emoji: '👑',
        description: '7 days premium access',
        probability: 2
      },

      // Legendary rewards (3% probability)
      {
        id: 'legendary_cashback_mega',
        name: 'Mega Cashback',
        type: 'cashback',
        value: 1000,
        rarity: 'legendary',
        emoji: '🏆',
        description: '₹1000 instant cashback',
        probability: 1.5
      },
      {
        id: 'legendary_achievement',
        name: 'Lucky Legend',
        type: 'achievement',
        value: 1,
        rarity: 'legendary',
        emoji: '🌟',
        description: 'Exclusive legendary achievement',
        probability: 1
      },
      {
        id: 'legendary_discount_50',
        name: 'Half Price Deal',
        type: 'discount_coupon',
        value: 50,
        rarity: 'legendary',
        emoji: '🎊',
        description: '50% off on next purchase',
        probability: 0.5
      }
    ];

    rewards.forEach(reward => this.rewards.set(reward.id, reward));
  }

  private getUserLootData(userId: string): UserLootData {
    if (!this.userLootData.has(userId)) {
      const userData: UserLootData = {
        userId,
        dailySpinsUsed: 0,
        dailySpinsLimit: 3,
        premiumSpinsUsed: 0,
        premiumSpinsLimit: 0,
        lastDailyReset: new Date(),
        totalSpins: 0,
        totalRewardsEarned: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastSpinDate: new Date(0)
      };
      this.userLootData.set(userId, userData);
    }
    return this.userLootData.get(userId)!;
  }

  async spinWheel(userId: string, spinType: 'daily' | 'premium' = 'daily'): Promise<SpinResult | null> {
    const userData = this.getUserLootData(userId);
    
    // Check if user can spin
    if (!this.canUserSpin(userId, spinType)) {
      return null;
    }

    // Update spin counts
    if (spinType === 'daily') {
      userData.dailySpinsUsed++;
    } else {
      userData.premiumSpinsUsed++;
    }

    // Update streak
    const today = new Date().toDateString();
    const lastSpinDay = userData.lastSpinDate.toDateString();
    
    if (today !== lastSpinDay) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (lastSpinDay === yesterday.toDateString()) {
        userData.currentStreak++;
      } else {
        userData.currentStreak = 1;
      }
      
      if (userData.currentStreak > userData.longestStreak) {
        userData.longestStreak = userData.currentStreak;
      }
    }

    userData.lastSpinDate = new Date();
    userData.totalSpins++;

    // Determine reward
    const reward = this.selectReward(userData, spinType);
    
    // Create spin result
    const spinResult: SpinResult = {
      id: `spin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      reward,
      timestamp: new Date(),
      spinType
    };

    // Save to history
    const userHistory = this.spinHistory.get(userId) || [];
    userHistory.push(spinResult);
    if (userHistory.length > 50) { // Keep last 50 spins
      userHistory.shift();
    }
    this.spinHistory.set(userId, userHistory);

    // Update user stats
    userData.totalRewardsEarned += reward.value;

    // Apply reward
    await this.applyReward(userId, reward);

    // Emit events
    this.emit('wheelSpun', { userId, spinResult });
    
    if (reward.rarity === 'legendary') {
      this.emit('legendaryReward', { userId, reward });
    }

    logger.info(`Wheel spin: ${userId} got ${reward.name} (${reward.rarity})`);
    return spinResult;
  }

  private selectReward(userData: UserLootData, spinType: string): LootReward {
    let availableRewards = Array.from(this.rewards.values());
    
    // Apply seasonal multiplier
    const adjustedProbabilities = availableRewards.map(reward => ({
      ...reward,
      probability: reward.probability * this.seasonalMultiplier
    }));

    // Apply streak bonus (increase rare+ rewards probability)
    if (userData.currentStreak >= 7) {
      adjustedProbabilities.forEach(reward => {
        if (reward.rarity !== 'common') {
          reward.probability *= 1.5; // 50% bonus for streak
        }
      });
    }

    // Premium spins have better odds
    if (spinType === 'premium') {
      adjustedProbabilities.forEach(reward => {
        if (reward.rarity === 'rare' || reward.rarity === 'epic') {
          reward.probability *= 2;
        } else if (reward.rarity === 'legendary') {
          reward.probability *= 3;
        }
      });
    }

    // Weighted random selection
    const totalProbability = adjustedProbabilities.reduce((sum, reward) => sum + reward.probability, 0);
    let random = Math.random() * totalProbability;

    for (const reward of adjustedProbabilities) {
      random -= reward.probability;
      if (random <= 0) {
        return this.rewards.get(reward.id)!;
      }
    }

    // Fallback to first common reward
    return adjustedProbabilities.find(r => r.rarity === 'common')!;
  }

  private async applyReward(userId: string, reward: LootReward): Promise<void> {
    switch (reward.type) {
      case 'cashback':
        // In production, add to user's cashback balance
        this.emit('cashbackAwarded', { userId, amount: reward.value });
        break;
        
      case 'xp':
        // In production, add to user's XP
        this.emit('xpAwarded', { userId, amount: reward.value });
        break;
        
      case 'discount_coupon':
        // In production, create discount coupon for user
        this.emit('couponAwarded', { userId, discount: reward.value });
        break;
        
      case 'premium_access':
        // In production, grant premium access
        this.emit('premiumAwarded', { userId, days: reward.value });
        break;
        
      case 'achievement':
        // In production, unlock achievement
        this.emit('achievementUnlocked', { userId, achievementId: reward.id });
        break;
    }
  }

  canUserSpin(userId: string, spinType: 'daily' | 'premium' = 'daily'): boolean {
    const userData = this.getUserLootData(userId);
    
    // Check daily reset
    const now = new Date();
    const lastReset = userData.lastDailyReset;
    
    if (now.toDateString() !== lastReset.toDateString()) {
      userData.dailySpinsUsed = 0;
      userData.lastDailyReset = now;
    }

    if (spinType === 'daily') {
      return userData.dailySpinsUsed < userData.dailySpinsLimit;
    } else {
      return userData.premiumSpinsUsed < userData.premiumSpinsLimit;
    }
  }

  getUserSpinsRemaining(userId: string): { daily: number; premium: number } {
    const userData = this.getUserLootData(userId);
    
    return {
      daily: Math.max(0, userData.dailySpinsLimit - userData.dailySpinsUsed),
      premium: Math.max(0, userData.premiumSpinsLimit - userData.premiumSpinsUsed)
    };
  }

  getUserSpinHistory(userId: string, limit: number = 10): SpinResult[] {
    const history = this.spinHistory.get(userId) || [];
    return history.slice(-limit).reverse(); // Most recent first
  }

  getUserLootStats(userId: string): UserLootData {
    return this.getUserLootData(userId);
  }

  addPremiumSpins(userId: string, count: number): void {
    const userData = this.getUserLootData(userId);
    userData.premiumSpinsLimit += count;
    
    this.emit('premiumSpinsAdded', { userId, count });
    logger.info(`Added ${count} premium spins to user ${userId}`);
  }

  getLeaderboard(type: 'total_spins' | 'total_rewards' | 'current_streak' = 'total_rewards', limit: number = 10): any[] {
    const users = Array.from(this.userLootData.values());
    
    let sortedUsers: UserLootData[];
    
    switch (type) {
      case 'total_spins':
        sortedUsers = users.sort((a, b) => b.totalSpins - a.totalSpins);
        break;
      case 'current_streak':
        sortedUsers = users.sort((a, b) => b.currentStreak - a.currentStreak);
        break;
      default:
        sortedUsers = users.sort((a, b) => b.totalRewardsEarned - a.totalRewardsEarned);
    }

    return sortedUsers.slice(0, limit).map((user, index) => ({
      rank: index + 1,
      userId: user.userId,
      value: type === 'total_spins' ? user.totalSpins : 
             type === 'current_streak' ? user.currentStreak : 
             user.totalRewardsEarned,
      streak: user.currentStreak
    }));
  }

  setSeasonalMultiplier(multiplier: number): void {
    this.seasonalMultiplier = Math.max(0.5, Math.min(3.0, multiplier)); // Clamp between 0.5x and 3x
    this.emit('seasonalMultiplierChanged', { multiplier: this.seasonalMultiplier });
    logger.info(`Seasonal multiplier set to ${this.seasonalMultiplier}x`);
  }

  getRewardsByRarity(rarity: LootReward['rarity']): LootReward[] {
    return Array.from(this.rewards.values()).filter(reward => reward.rarity === rarity);
  }

  private startDailyReset(): void {
    // Reset daily spins at midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    setTimeout(() => {
      this.resetDailySpins();
      
      // Set up daily interval
      setInterval(() => {
        this.resetDailySpins();
      }, 24 * 60 * 60 * 1000); // 24 hours
      
    }, msUntilMidnight);
  }

  private resetDailySpins(): void {
    const now = new Date();
    
    for (const userData of this.userLootData.values()) {
      userData.dailySpinsUsed = 0;
      userData.lastDailyReset = now;
    }
    
    this.emit('dailySpinsReset');
    logger.info('Daily spins reset for all users');
  }

  getStats(): any {
    const totalUsers = this.userLootData.size;
    const totalSpins = Array.from(this.userLootData.values()).reduce((sum, user) => sum + user.totalSpins, 0);
    const totalRewards = Array.from(this.userLootData.values()).reduce((sum, user) => sum + user.totalRewardsEarned, 0);
    
    const rarityDistribution = new Map<string, number>();
    Array.from(this.spinHistory.values()).flat().forEach(spin => {
      const rarity = spin.reward.rarity;
      rarityDistribution.set(rarity, (rarityDistribution.get(rarity) || 0) + 1);
    });

    return {
      totalUsers,
      totalSpins,
      totalRewards,
      averageSpinsPerUser: totalUsers > 0 ? Math.round(totalSpins / totalUsers) : 0,
      seasonalMultiplier: this.seasonalMultiplier,
      rarityDistribution: Object.fromEntries(rarityDistribution),
      totalRewardTypes: this.rewards.size
    };
  }
}
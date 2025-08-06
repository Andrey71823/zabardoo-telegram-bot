import { BaseService } from '../base/BaseService';

interface LootReward {
  id: string;
  type: 'coupon' | 'cashback' | 'points' | 'xp' | 'meme' | 'discount' | 'free_spin' | 'jackpot';
  value: number | string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
  probability: number; // 0-100
  description: string;
  icon: string;
  expiryHours?: number;
  conditions?: {
    minLevel?: number;
    maxUsesPerDay?: number;
    validStores?: string[];
    minPurchaseAmount?: number;
  };
}

interface UserLootSession {
  userId: string;
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  spinsUsed: number;
  maxSpins: number;
  rewardsWon: LootReward[];
  totalValue: number;
  streakCount: number;
  lastSpinTime?: Date;
}

interface SpinResult {
  reward: LootReward;
  isJackpot: boolean;
  streakBonus: boolean;
  animation: {
    duration: number;
    segments: number;
    finalPosition: number;
  };
  message: string;
}

interface LootStats {
  totalSpins: number;
  totalRewards: number;
  totalValue: number;
  rewardsByType: Record<string, number>;
  rewardsByRarity: Record<string, number>;
  averageValue: number;
  jackpotCount: number;
  streakRecord: number;
}

export class LootModeService extends BaseService {
  private lootRewards: Map<string, LootReward> = new Map();
  private userSessions: Map<string, UserLootSession> = new Map();
  private userStats: Map<string, LootStats> = new Map();
  private dailySpinLimits: Map<string, { date: string; spins: number }> = new Map();

  constructor() {
    super();
    this.initializeLootRewards();
  }

  private initializeLootRewards(): void {
    const rewards: LootReward[] = [
      // Common Rewards (60% probability)
      {
        id: 'small_cashback',
        type: 'cashback',
        value: 10,
        rarity: 'common',
        probability: 25,
        description: '₹10 Instant Cashback',
        icon: '💰',
        expiryHours: 24,
        conditions: { minPurchaseAmount: 100 }
      },
      {
        id: 'xp_boost',
        type: 'xp',
        value: 50,
        rarity: 'common',
        probability: 20,
        description: '+50 XP Bonus',
        icon: '⚡',
      },
      {
        id: 'funny_meme',
        type: 'meme',
        value: 'You got a meme! Share it for extra XP!',
        rarity: 'common',
        probability: 15,
        description: 'Exclusive Deal Meme',
        icon: '😂',
      },

      // Rare Rewards (25% probability)
      {
        id: 'medium_cashback',
        type: 'cashback',
        value: 50,
        rarity: 'rare',
        probability: 12,
        description: '₹50 Cashback Bonus',
        icon: '💎',
        expiryHours: 48,
        conditions: { minPurchaseAmount: 500 }
      },
      {
        id: 'store_coupon',
        type: 'coupon',
        value: '15% OFF',
        rarity: 'rare',
        probability: 8,
        description: '15% OFF Any Store',
        icon: '🎫',
        expiryHours: 72,
        conditions: { maxUsesPerDay: 1 }
      },
      {
        id: 'double_points',
        type: 'points',
        value: 200,
        rarity: 'rare',
        probability: 5,
        description: '200 Zabardoo Points',
        icon: '🌟',
      },

      // Epic Rewards (10% probability)
      {
        id: 'big_cashback',
        type: 'cashback',
        value: 100,
        rarity: 'epic',
        probability: 5,
        description: '₹100 Mega Cashback',
        icon: '💸',
        expiryHours: 96,
        conditions: { minPurchaseAmount: 1000 }
      },
      {
        id: 'premium_coupon',
        type: 'coupon',
        value: '25% OFF',
        rarity: 'epic',
        probability: 3,
        description: '25% OFF Premium Brands',
        icon: '🏆',
        expiryHours: 120,
        conditions: { validStores: ['Amazon India', 'Flipkart', 'Myntra'] }
      },
      {
        id: 'free_spins',
        type: 'free_spin',
        value: 3,
        rarity: 'epic',
        probability: 2,
        description: '3 Free Bonus Spins',
        icon: '🎰',
      },

      // Legendary Rewards (4% probability)
      {
        id: 'huge_cashback',
        type: 'cashback',
        value: 250,
        rarity: 'legendary',
        probability: 2,
        description: '₹250 Legendary Cashback',
        icon: '👑',
        expiryHours: 168,
        conditions: { minPurchaseAmount: 2000 }
      },
      {
        id: 'vip_coupon',
        type: 'coupon',
        value: '40% OFF',
        rarity: 'legendary',
        probability: 1.5,
        description: '40% OFF VIP Access',
        icon: '💎',
        expiryHours: 240,
        conditions: { minLevel: 10 }
      },
      {
        id: 'mega_points',
        type: 'points',
        value: 1000,
        rarity: 'legendary',
        probability: 0.5,
        description: '1000 Mega Points',
        icon: '🔥',
      },

      // Mythic Rewards (1% probability)
      {
        id: 'jackpot_cashback',
        type: 'jackpot',
        value: 500,
        rarity: 'mythic',
        probability: 0.5,
        description: '₹500 JACKPOT CASHBACK!',
        icon: '🎊',
        expiryHours: 720,
      },
      {
        id: 'ultimate_coupon',
        type: 'coupon',
        value: '50% OFF',
        rarity: 'mythic',
        probability: 0.3,
        description: '50% OFF EVERYTHING!',
        icon: '🌈',
        expiryHours: 480,
        conditions: { minLevel: 20 }
      },
      {
        id: 'diamond_status',
        type: 'discount',
        value: 'Diamond VIP Status for 30 days',
        rarity: 'mythic',
        probability: 0.2,
        description: 'Diamond VIP Status',
        icon: '💎',
      }
    ];

    rewards.forEach(reward => {
      this.lootRewards.set(reward.id, reward);
    });
  }

  // Daily Spin Management
  async getDailySpinsRemaining(userId: string): Promise<{
    remaining: number;
    maxSpins: number;
    resetTime: Date;
  }> {
    const today = new Date().toDateString();
    const userSpins = this.dailySpinLimits.get(userId);
    
    const maxSpins = await this.getMaxDailySpins(userId);
    
    if (!userSpins || userSpins.date !== today) {
      // Reset for new day
      this.dailySpinLimits.set(userId, { date: today, spins: 0 });
      return {
        remaining: maxSpins,
        maxSpins,
        resetTime: this.getNextMidnight()
      };
    }

    return {
      remaining: Math.max(0, maxSpins - userSpins.spins),
      maxSpins,
      resetTime: this.getNextMidnight()
    };
  }

  private async getMaxDailySpins(userId: string): Promise<number> {
    // Base spins + level bonus + VIP bonus
    const baseSpins = 5;
    const userLevel = await this.getUserLevel(userId);
    const levelBonus = Math.floor(userLevel / 5); // +1 spin every 5 levels
    const vipBonus = await this.getVIPBonus(userId);
    
    return baseSpins + levelBonus + vipBonus;
  }

  // Spin the Wheel
  async spinWheel(userId: string): Promise<SpinResult | { error: string }> {
    // Check daily spin limit
    const spinsInfo = await this.getDailySpinsRemaining(userId);
    if (spinsInfo.remaining <= 0) {
      return { error: 'Daily spin limit reached! Come back tomorrow for more spins.' };
    }

    // Check cooldown (prevent spam)
    const lastSpin = await this.getLastSpinTime(userId);
    const cooldownMs = 30000; // 30 seconds
    if (lastSpin && Date.now() - lastSpin.getTime() < cooldownMs) {
      const remainingSeconds = Math.ceil((cooldownMs - (Date.now() - lastSpin.getTime())) / 1000);
      return { error: `Please wait ${remainingSeconds} seconds before spinning again.` };
    }

    // Update spin count
    await this.incrementDailySpins(userId);
    await this.setLastSpinTime(userId, new Date());

    // Get user session
    let session = this.userSessions.get(userId);
    if (!session) {
      session = await this.createLootSession(userId);
    }

    // Calculate streak bonus
    const streakBonus = await this.calculateStreakBonus(userId);
    
    // Select reward based on probability
    const reward = await this.selectReward(userId, streakBonus);
    
    // Check for jackpot
    const isJackpot = reward.rarity === 'mythic' || Math.random() < 0.001; // 0.1% extra jackpot chance

    // Create spin animation
    const animation = this.generateSpinAnimation(reward);

    // Update session
    session.spinsUsed++;
    session.rewardsWon.push(reward);
    session.totalValue += this.getRewardValue(reward);
    session.lastSpinTime = new Date();
    
    if (streakBonus) {
      session.streakCount++;
    }

    this.userSessions.set(userId, session);

    // Update user stats
    await this.updateUserStats(userId, reward, isJackpot);

    // Generate result message
    const message = this.generateResultMessage(reward, isJackpot, streakBonus);

    return {
      reward,
      isJackpot,
      streakBonus,
      animation,
      message
    };
  }

  private async selectReward(userId: string, streakBonus: boolean): Promise<LootReward> {
    const rewards = Array.from(this.lootRewards.values());
    const userLevel = await this.getUserLevel(userId);
    
    // Filter rewards based on user level and conditions
    const availableRewards = rewards.filter(reward => {
      if (reward.conditions?.minLevel && userLevel < reward.conditions.minLevel) {
        return false;
      }
      return true;
    });

    // Adjust probabilities for streak bonus
    let adjustedRewards = availableRewards.map(reward => ({
      ...reward,
      probability: streakBonus ? reward.probability * 1.5 : reward.probability
    }));

    // Normalize probabilities
    const totalProbability = adjustedRewards.reduce((sum, r) => sum + r.probability, 0);
    adjustedRewards = adjustedRewards.map(r => ({
      ...r,
      probability: (r.probability / totalProbability) * 100
    }));

    // Select reward using weighted random
    const random = Math.random() * 100;
    let cumulativeProbability = 0;

    for (const reward of adjustedRewards) {
      cumulativeProbability += reward.probability;
      if (random <= cumulativeProbability) {
        return reward;
      }
    }

    // Fallback to most common reward
    return adjustedRewards.find(r => r.rarity === 'common') || adjustedRewards[0];
  }

  private generateSpinAnimation(reward: LootReward): SpinResult['animation'] {
    const segments = 20; // Number of segments on the wheel
    const rewardPosition = Math.floor(Math.random() * segments);
    const extraSpins = 3 + Math.floor(Math.random() * 3); // 3-5 full rotations
    const finalPosition = (extraSpins * segments) + rewardPosition;
    
    return {
      duration: 3000 + Math.random() * 2000, // 3-5 seconds
      segments,
      finalPosition
    };
  }

  private generateResultMessage(reward: LootReward, isJackpot: boolean, streakBonus: boolean): string {
    let message = '';

    if (isJackpot) {
      message += '🎊 JACKPOT! 🎊\n';
    }

    if (streakBonus) {
      message += '🔥 STREAK BONUS! 🔥\n';
    }

    const rarityMessages = {
      common: '✨ Nice!',
      rare: '🌟 Great!',
      epic: '🏆 Amazing!',
      legendary: '👑 Legendary!',
      mythic: '🌈 MYTHIC REWARD!'
    };

    message += `${rarityMessages[reward.rarity]} You won:\n`;
    message += `${reward.icon} ${reward.description}\n\n`;

    if (reward.expiryHours) {
      message += `⏰ Expires in ${reward.expiryHours} hours\n`;
    }

    if (reward.conditions) {
      if (reward.conditions.minPurchaseAmount) {
        message += `💰 Min purchase: ₹${reward.conditions.minPurchaseAmount}\n`;
      }
      if (reward.conditions.validStores) {
        message += `🏪 Valid at: ${reward.conditions.validStores.join(', ')}\n`;
      }
    }

    message += '\n🎰 Spin again for more rewards!';

    return message;
  }

  // Loot Session Management
  private async createLootSession(userId: string): Promise<UserLootSession> {
    const maxSpins = await this.getMaxDailySpins(userId);
    
    const session: UserLootSession = {
      userId,
      sessionId: this.generateId(),
      startTime: new Date(),
      spinsUsed: 0,
      maxSpins,
      rewardsWon: [],
      totalValue: 0,
      streakCount: 0
    };

    this.userSessions.set(userId, session);
    return session;
  }

  async getLootSession(userId: string): Promise<UserLootSession | null> {
    return this.userSessions.get(userId) || null;
  }

  async endLootSession(userId: string): Promise<UserLootSession | null> {
    const session = this.userSessions.get(userId);
    if (session) {
      session.endTime = new Date();
      this.userSessions.delete(userId);
      return session;
    }
    return null;
  }

  // Streak System
  private async calculateStreakBonus(userId: string): Promise<boolean> {
    const session = this.userSessions.get(userId);
    if (!session) return false;

    const lastSpinTime = session.lastSpinTime;
    if (!lastSpinTime) return false;

    const timeDiff = Date.now() - lastSpinTime.getTime();
    const streakWindow = 24 * 60 * 60 * 1000; // 24 hours

    // Streak continues if last spin was within 24 hours
    return timeDiff <= streakWindow;
  }

  // Statistics
  async getUserLootStats(userId: string): Promise<LootStats> {
    return this.userStats.get(userId) || {
      totalSpins: 0,
      totalRewards: 0,
      totalValue: 0,
      rewardsByType: {},
      rewardsByRarity: {},
      averageValue: 0,
      jackpotCount: 0,
      streakRecord: 0
    };
  }

  private async updateUserStats(userId: string, reward: LootReward, isJackpot: boolean): Promise<void> {
    let stats = this.userStats.get(userId) || {
      totalSpins: 0,
      totalRewards: 0,
      totalValue: 0,
      rewardsByType: {},
      rewardsByRarity: {},
      averageValue: 0,
      jackpotCount: 0,
      streakRecord: 0
    };

    stats.totalSpins++;
    stats.totalRewards++;
    stats.totalValue += this.getRewardValue(reward);
    stats.rewardsByType[reward.type] = (stats.rewardsByType[reward.type] || 0) + 1;
    stats.rewardsByRarity[reward.rarity] = (stats.rewardsByRarity[reward.rarity] || 0) + 1;
    stats.averageValue = stats.totalValue / stats.totalRewards;

    if (isJackpot) {
      stats.jackpotCount++;
    }

    const session = this.userSessions.get(userId);
    if (session && session.streakCount > stats.streakRecord) {
      stats.streakRecord = session.streakCount;
    }

    this.userStats.set(userId, stats);
  }

  // Reward Management
  async claimReward(userId: string, rewardId: string): Promise<{
    success: boolean;
    message: string;
    appliedValue?: number;
  }> {
    const session = this.userSessions.get(userId);
    if (!session) {
      return { success: false, message: 'No active loot session found' };
    }

    const reward = session.rewardsWon.find(r => r.id === rewardId);
    if (!reward) {
      return { success: false, message: 'Reward not found in your session' };
    }

    // Check if reward is expired
    if (reward.expiryHours) {
      const rewardTime = session.lastSpinTime || session.startTime;
      const expiryTime = new Date(rewardTime.getTime() + (reward.expiryHours * 60 * 60 * 1000));
      if (new Date() > expiryTime) {
        return { success: false, message: 'This reward has expired' };
      }
    }

    // Apply reward based on type
    switch (reward.type) {
      case 'cashback':
        await this.applyCashback(userId, Number(reward.value));
        return {
          success: true,
          message: `₹${reward.value} cashback added to your account!`,
          appliedValue: Number(reward.value)
        };

      case 'points':
        await this.applyPoints(userId, Number(reward.value));
        return {
          success: true,
          message: `${reward.value} Zabardoo Points added!`,
          appliedValue: Number(reward.value)
        };

      case 'xp':
        await this.applyXP(userId, Number(reward.value));
        return {
          success: true,
          message: `+${reward.value} XP added!`,
          appliedValue: Number(reward.value)
        };

      case 'coupon':
        const couponCode = await this.generateCouponCode(reward);
        return {
          success: true,
          message: `Coupon code generated: ${couponCode}\nUse it for ${reward.value} discount!`
        };

      case 'free_spin':
        await this.addFreeSpins(userId, Number(reward.value));
        return {
          success: true,
          message: `${reward.value} free spins added to your account!`,
          appliedValue: Number(reward.value)
        };

      case 'meme':
        return {
          success: true,
          message: `${reward.value}\n\nShare this meme for +25 XP!`
        };

      default:
        return {
          success: true,
          message: `${reward.description} has been applied to your account!`
        };
    }
  }

  // Wheel Configuration
  async getWheelConfiguration(): Promise<{
    segments: Array<{
      id: string;
      label: string;
      icon: string;
      color: string;
      rarity: string;
    }>;
    colors: Record<string, string>;
  }> {
    const rewards = Array.from(this.lootRewards.values());
    const colors = {
      common: '#95a5a6',
      rare: '#3498db',
      epic: '#9b59b6',
      legendary: '#f39c12',
      mythic: '#e74c3c'
    };

    const segments = rewards.map(reward => ({
      id: reward.id,
      label: reward.description,
      icon: reward.icon,
      color: colors[reward.rarity],
      rarity: reward.rarity
    }));

    return { segments, colors };
  }

  // Utility Methods
  private getRewardValue(reward: LootReward): number {
    if (typeof reward.value === 'number') {
      return reward.value;
    }
    
    // Extract numeric value from string rewards
    const match = reward.value.toString().match(/\d+/);
    return match ? parseInt(match[0]) : 0;
  }

  private async getUserLevel(userId: string): Promise<number> {
    // This would integrate with the gamification service
    return 5; // Default level
  }

  private async getVIPBonus(userId: string): Promise<number> {
    // This would check user's VIP status
    return 0; // Default no bonus
  }

  private getNextMidnight(): Date {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }

  private async getLastSpinTime(userId: string): Promise<Date | null> {
    const session = this.userSessions.get(userId);
    return session?.lastSpinTime || null;
  }

  private async setLastSpinTime(userId: string, time: Date): Promise<void> {
    const session = this.userSessions.get(userId);
    if (session) {
      session.lastSpinTime = time;
      this.userSessions.set(userId, session);
    }
  }

  private async incrementDailySpins(userId: string): Promise<void> {
    const today = new Date().toDateString();
    const userSpins = this.dailySpinLimits.get(userId);
    
    if (!userSpins || userSpins.date !== today) {
      this.dailySpinLimits.set(userId, { date: today, spins: 1 });
    } else {
      userSpins.spins++;
      this.dailySpinLimits.set(userId, userSpins);
    }
  }

  // Integration Methods (would connect to other services)
  private async applyCashback(userId: string, amount: number): Promise<void> {
    console.log(`Applied ₹${amount} cashback to user ${userId}`);
  }

  private async applyPoints(userId: string, points: number): Promise<void> {
    console.log(`Applied ${points} points to user ${userId}`);
  }

  private async applyXP(userId: string, xp: number): Promise<void> {
    console.log(`Applied ${xp} XP to user ${userId}`);
  }

  private async generateCouponCode(reward: LootReward): Promise<string> {
    return `LOOT${Date.now().toString(36).toUpperCase()}`;
  }

  private async addFreeSpins(userId: string, spins: number): Promise<void> {
    const today = new Date().toDateString();
    const userSpins = this.dailySpinLimits.get(userId);
    
    if (!userSpins || userSpins.date !== today) {
      this.dailySpinLimits.set(userId, { date: today, spins: Math.max(0, -spins) });
    } else {
      userSpins.spins = Math.max(0, userSpins.spins - spins);
      this.dailySpinLimits.set(userId, userSpins);
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Admin Methods
  async addCustomReward(reward: Omit<LootReward, 'id'>): Promise<LootReward> {
    const newReward: LootReward = {
      id: this.generateId(),
      ...reward
    };

    this.lootRewards.set(newReward.id, newReward);
    return newReward;
  }

  async updateRewardProbability(rewardId: string, newProbability: number): Promise<boolean> {
    const reward = this.lootRewards.get(rewardId);
    if (reward) {
      reward.probability = newProbability;
      this.lootRewards.set(rewardId, reward);
      return true;
    }
    return false;
  }

  async getGlobalLootStats(): Promise<{
    totalSpins: number;
    totalUsers: number;
    rewardDistribution: Record<string, number>;
    averageSpinsPerUser: number;
    jackpotFrequency: number;
  }> {
    const allStats = Array.from(this.userStats.values());
    
    const totalSpins = allStats.reduce((sum, stats) => sum + stats.totalSpins, 0);
    const totalUsers = allStats.length;
    const totalJackpots = allStats.reduce((sum, stats) => sum + stats.jackpotCount, 0);

    const rewardDistribution: Record<string, number> = {};
    allStats.forEach(stats => {
      Object.entries(stats.rewardsByRarity).forEach(([rarity, count]) => {
        rewardDistribution[rarity] = (rewardDistribution[rarity] || 0) + count;
      });
    });

    return {
      totalSpins,
      totalUsers,
      rewardDistribution,
      averageSpinsPerUser: totalUsers > 0 ? totalSpins / totalUsers : 0,
      jackpotFrequency: totalSpins > 0 ? (totalJackpots / totalSpins) * 100 : 0
    };
  }
}
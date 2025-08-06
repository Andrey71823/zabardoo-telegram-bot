import { BaseService } from '../base/BaseService';

interface ReferralUser {
  id: string;
  userId: string;
  referralCode: string;
  referralLink: string;
  totalReferrals: number;
  activeReferrals: number;
  totalEarnings: number;
  pendingEarnings: number;
  withdrawableEarnings: number;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond';
  joinedAt: Date;
  lastActivityAt: Date;
  isActive: boolean;
  bonusMultiplier: number;
  specialPerks: string[];
}

interface Referral {
  id: string;
  referrerId: string;
  referredUserId: string;
  referralCode: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  signupDate: Date;
  firstPurchaseDate?: Date;
  totalPurchases: number;
  totalSpent: number;
  commissionEarned: number;
  commissionPaid: number;
  lastActivityDate: Date;
  metadata: {
    signupSource: string;
    deviceType: string;
    location?: string;
    firstCategory?: string;
  };
}

interface ReferralReward {
  id: string;
  userId: string;
  referralId: string;
  type: 'signup_bonus' | 'purchase_commission' | 'milestone_bonus' | 'tier_bonus' | 'special_event';
  amount: number;
  currency: 'INR' | 'points';
  description: string;
  earnedAt: Date;
  paidAt?: Date;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  metadata: any;
}

interface ReferralCampaign {
  id: string;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  rules: {
    signupBonus: number;
    purchaseCommissionRate: number;
    minimumPurchaseAmount: number;
    maxRewardsPerUser: number;
    tierMultipliers: Record<string, number>;
  };
  targets: {
    totalReferrals: number;
    totalRevenue: number;
    conversionRate: number;
  };
  currentStats: {
    totalReferrals: number;
    totalRevenue: number;
    conversionRate: number;
  };
}

interface ReferralStats {
  totalUsers: number;
  totalReferrals: number;
  totalEarnings: number;
  totalPaid: number;
  conversionRate: number;
  averageOrderValue: number;
  topReferrers: Array<{
    userId: string;
    name: string;
    referrals: number;
    earnings: number;
  }>;
  tierDistribution: Record<string, number>;
  monthlyGrowth: number;
}

export class ReferralService extends BaseService {
  private referralUsers: Map<string, ReferralUser> = new Map();
  private referrals: Map<string, Referral> = new Map();
  private rewards: Map<string, ReferralReward[]> = new Map();
  private campaigns: Map<string, ReferralCampaign> = new Map();

  // User Management
  async createReferralUser(userId: string, userData: {
    name: string;
    email: string;
    phone?: string;
  }): Promise<ReferralUser> {
    const referralCode = this.generateReferralCode(userData.name);
    const referralLink = this.generateReferralLink(referralCode);

    const referralUser: ReferralUser = {
      id: this.generateId(),
      userId,
      referralCode,
      referralLink,
      totalReferrals: 0,
      activeReferrals: 0,
      totalEarnings: 0,
      pendingEarnings: 0,
      withdrawableEarnings: 0,
      tier: 'Bronze',
      joinedAt: new Date(),
      lastActivityAt: new Date(),
      isActive: true,
      bonusMultiplier: 1.0,
      specialPerks: []
    };

    this.referralUsers.set(userId, referralUser);
    return referralUser;
  }

  async getReferralUser(userId: string): Promise<ReferralUser | null> {
    return this.referralUsers.get(userId) || null;
  }

  async updateReferralUser(userId: string, updates: Partial<ReferralUser>): Promise<ReferralUser | null> {
    const user = this.referralUsers.get(userId);
    if (user) {
      const updatedUser = { ...user, ...updates };
      this.referralUsers.set(userId, updatedUser);
      return updatedUser;
    }
    return null;
  }

  // Referral Management
  async createReferral(referralCode: string, newUserId: string, metadata: {
    signupSource: string;
    deviceType: string;
    location?: string;
  }): Promise<Referral | null> {
    // Find referrer by code
    const referrer = Array.from(this.referralUsers.values())
      .find(user => user.referralCode === referralCode);

    if (!referrer) {
      return null;
    }

    const referral: Referral = {
      id: this.generateId(),
      referrerId: referrer.userId,
      referredUserId: newUserId,
      referralCode,
      status: 'pending',
      signupDate: new Date(),
      totalPurchases: 0,
      totalSpent: 0,
      commissionEarned: 0,
      commissionPaid: 0,
      lastActivityDate: new Date(),
      metadata
    };

    this.referrals.set(referral.id, referral);

    // Update referrer stats
    referrer.totalReferrals++;
    referrer.activeReferrals++;
    referrer.lastActivityAt = new Date();
    this.referralUsers.set(referrer.userId, referrer);

    // Award signup bonus
    await this.awardSignupBonus(referrer.userId, referral.id);

    return referral;
  }

  async processReferralPurchase(referredUserId: string, purchaseAmount: number, metadata: any): Promise<void> {
    // Find referral by referred user
    const referral = Array.from(this.referrals.values())
      .find(ref => ref.referredUserId === referredUserId && ref.status === 'active');

    if (!referral) {
      return;
    }

    // Update referral stats
    referral.totalPurchases++;
    referral.totalSpent += purchaseAmount;
    referral.lastActivityDate = new Date();

    // Mark as active on first purchase
    if (referral.totalPurchases === 1) {
      referral.status = 'active';
      referral.firstPurchaseDate = new Date();
    }

    this.referrals.set(referral.id, referral);

    // Calculate and award commission
    await this.awardPurchaseCommission(referral.referrerId, referral.id, purchaseAmount, metadata);

    // Check for milestone bonuses
    await this.checkMilestoneBonuses(referral.referrerId);

    // Update tier if needed
    await this.updateUserTier(referral.referrerId);
  }

  // Reward Management
  private async awardSignupBonus(referrerId: string, referralId: string): Promise<void> {
    const campaign = this.getActiveCampaign();
    const bonusAmount = campaign?.rules.signupBonus || 50; // Default ₹50

    const reward: ReferralReward = {
      id: this.generateId(),
      userId: referrerId,
      referralId,
      type: 'signup_bonus',
      amount: bonusAmount,
      currency: 'INR',
      description: `Signup bonus for successful referral`,
      earnedAt: new Date(),
      status: 'pending',
      metadata: { campaign: campaign?.id }
    };

    await this.addReward(referrerId, reward);
  }

  private async awardPurchaseCommission(referrerId: string, referralId: string, purchaseAmount: number, metadata: any): Promise<void> {
    const campaign = this.getActiveCampaign();
    const commissionRate = campaign?.rules.purchaseCommissionRate || 0.05; // Default 5%
    const referrer = this.referralUsers.get(referrerId);
    
    if (!referrer) return;

    const baseCommission = purchaseAmount * commissionRate;
    const finalCommission = baseCommission * referrer.bonusMultiplier;

    const reward: ReferralReward = {
      id: this.generateId(),
      userId: referrerId,
      referralId,
      type: 'purchase_commission',
      amount: finalCommission,
      currency: 'INR',
      description: `${(commissionRate * 100).toFixed(1)}% commission on ₹${purchaseAmount} purchase`,
      earnedAt: new Date(),
      status: 'pending',
      metadata: { 
        purchaseAmount, 
        commissionRate, 
        bonusMultiplier: referrer.bonusMultiplier,
        ...metadata 
      }
    };

    await this.addReward(referrerId, reward);

    // Update referral commission
    const referral = this.referrals.get(referralId);
    if (referral) {
      referral.commissionEarned += finalCommission;
      this.referrals.set(referralId, referral);
    }
  }

  private async addReward(userId: string, reward: ReferralReward): Promise<void> {
    const userRewards = this.rewards.get(userId) || [];
    userRewards.push(reward);
    this.rewards.set(userId, userRewards);

    // Update user earnings
    const user = this.referralUsers.get(userId);
    if (user) {
      user.pendingEarnings += reward.amount;
      user.totalEarnings += reward.amount;
      this.referralUsers.set(userId, user);
    }
  }

  // Tier Management
  private async updateUserTier(userId: string): Promise<void> {
    const user = this.referralUsers.get(userId);
    if (!user) return;

    const newTier = this.calculateTier(user.totalReferrals, user.totalEarnings);
    
    if (newTier !== user.tier) {
      const oldTier = user.tier;
      user.tier = newTier;
      user.bonusMultiplier = this.getTierMultiplier(newTier);
      user.specialPerks = this.getTierPerks(newTier);
      
      this.referralUsers.set(userId, user);

      // Award tier upgrade bonus
      await this.awardTierBonus(userId, oldTier, newTier);
    }
  }

  private calculateTier(totalReferrals: number, totalEarnings: number): ReferralUser['tier'] {
    if (totalReferrals >= 100 || totalEarnings >= 50000) return 'Diamond';
    if (totalReferrals >= 50 || totalEarnings >= 25000) return 'Platinum';
    if (totalReferrals >= 25 || totalEarnings >= 10000) return 'Gold';
    if (totalReferrals >= 10 || totalEarnings >= 5000) return 'Silver';
    return 'Bronze';
  }

  private getTierMultiplier(tier: ReferralUser['tier']): number {
    const multipliers = {
      'Bronze': 1.0,
      'Silver': 1.2,
      'Gold': 1.5,
      'Platinum': 2.0,
      'Diamond': 2.5
    };
    return multipliers[tier];
  }

  private getTierPerks(tier: ReferralUser['tier']): string[] {
    const perks = {
      'Bronze': ['Basic referral tracking'],
      'Silver': ['Basic referral tracking', 'Monthly bonus rewards', 'Priority support'],
      'Gold': ['Basic referral tracking', 'Monthly bonus rewards', 'Priority support', 'Exclusive deals access'],
      'Platinum': ['Basic referral tracking', 'Monthly bonus rewards', 'Priority support', 'Exclusive deals access', 'Personal account manager'],
      'Diamond': ['Basic referral tracking', 'Monthly bonus rewards', 'Priority support', 'Exclusive deals access', 'Personal account manager', 'VIP events access', 'Custom referral codes']
    };
    return perks[tier];
  }

  private async awardTierBonus(userId: string, oldTier: string, newTier: string): Promise<void> {
    const bonusAmounts = {
      'Silver': 500,
      'Gold': 1000,
      'Platinum': 2500,
      'Diamond': 5000
    };

    const bonusAmount = bonusAmounts[newTier as keyof typeof bonusAmounts] || 0;

    if (bonusAmount > 0) {
      const reward: ReferralReward = {
        id: this.generateId(),
        userId,
        referralId: '',
        type: 'tier_bonus',
        amount: bonusAmount,
        currency: 'INR',
        description: `Tier upgrade bonus: ${oldTier} → ${newTier}`,
        earnedAt: new Date(),
        status: 'approved',
        metadata: { oldTier, newTier }
      };

      await this.addReward(userId, reward);
    }
  }

  // Milestone Management
  private async checkMilestoneBonuses(userId: string): Promise<void> {
    const user = this.referralUsers.get(userId);
    if (!user) return;

    const milestones = [
      { referrals: 5, bonus: 250, description: 'First 5 referrals milestone' },
      { referrals: 10, bonus: 500, description: 'First 10 referrals milestone' },
      { referrals: 25, bonus: 1250, description: 'First 25 referrals milestone' },
      { referrals: 50, bonus: 2500, description: 'First 50 referrals milestone' },
      { referrals: 100, bonus: 5000, description: 'First 100 referrals milestone' }
    ];

    for (const milestone of milestones) {
      if (user.totalReferrals === milestone.referrals) {
        const reward: ReferralReward = {
          id: this.generateId(),
          userId,
          referralId: '',
          type: 'milestone_bonus',
          amount: milestone.bonus,
          currency: 'INR',
          description: milestone.description,
          earnedAt: new Date(),
          status: 'approved',
          metadata: { milestone: milestone.referrals }
        };

        await this.addReward(userId, reward);
        break;
      }
    }
  }

  // Analytics and Reporting
  async getReferralStats(): Promise<ReferralStats> {
    const allUsers = Array.from(this.referralUsers.values());
    const allReferrals = Array.from(this.referrals.values());
    const allRewards = Array.from(this.rewards.values()).flat();

    const totalUsers = allUsers.length;
    const totalReferrals = allReferrals.length;
    const totalEarnings = allRewards.reduce((sum, reward) => sum + reward.amount, 0);
    const totalPaid = allRewards.filter(r => r.status === 'paid').reduce((sum, reward) => sum + reward.amount, 0);
    
    const activeReferrals = allReferrals.filter(r => r.status === 'active').length;
    const conversionRate = totalReferrals > 0 ? (activeReferrals / totalReferrals) * 100 : 0;
    
    const totalSpent = allReferrals.reduce((sum, ref) => sum + ref.totalSpent, 0);
    const averageOrderValue = activeReferrals > 0 ? totalSpent / activeReferrals : 0;

    const topReferrers = allUsers
      .sort((a, b) => b.totalReferrals - a.totalReferrals)
      .slice(0, 10)
      .map(user => ({
        userId: user.userId,
        name: `User ${user.userId.slice(-4)}`, // In real app, get actual name
        referrals: user.totalReferrals,
        earnings: user.totalEarnings
      }));

    const tierDistribution = allUsers.reduce((acc, user) => {
      acc[user.tier] = (acc[user.tier] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate monthly growth (simplified)
    const thisMonth = new Date();
    thisMonth.setDate(1);
    const thisMonthReferrals = allReferrals.filter(r => r.signupDate >= thisMonth).length;
    const monthlyGrowth = totalReferrals > 0 ? (thisMonthReferrals / totalReferrals) * 100 : 0;

    return {
      totalUsers,
      totalReferrals,
      totalEarnings,
      totalPaid,
      conversionRate,
      averageOrderValue,
      topReferrers,
      tierDistribution,
      monthlyGrowth
    };
  }

  async getUserReferrals(userId: string): Promise<Referral[]> {
    return Array.from(this.referrals.values())
      .filter(referral => referral.referrerId === userId)
      .sort((a, b) => b.signupDate.getTime() - a.signupDate.getTime());
  }

  async getUserRewards(userId: string): Promise<ReferralReward[]> {
    return this.rewards.get(userId) || [];
  }

  // Payment Management
  async processWithdrawal(userId: string, amount: number, paymentMethod: {
    type: 'upi' | 'bank' | 'paytm';
    details: any;
  }): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    const user = this.referralUsers.get(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    if (amount > user.withdrawableEarnings) {
      return { success: false, error: 'Insufficient withdrawable balance' };
    }

    if (amount < 100) {
      return { success: false, error: 'Minimum withdrawal amount is ₹100' };
    }

    // Process withdrawal (integrate with payment gateway)
    const transactionId = this.generateTransactionId();
    
    // Update user balance
    user.withdrawableEarnings -= amount;
    user.pendingEarnings -= amount;
    this.referralUsers.set(userId, user);

    // Mark rewards as paid
    const userRewards = this.rewards.get(userId) || [];
    let remainingAmount = amount;
    
    for (const reward of userRewards) {
      if (reward.status === 'approved' && remainingAmount > 0) {
        if (reward.amount <= remainingAmount) {
          reward.status = 'paid';
          reward.paidAt = new Date();
          remainingAmount -= reward.amount;
        }
      }
    }

    this.rewards.set(userId, userRewards);

    return { success: true, transactionId };
  }

  // Campaign Management
  async createCampaign(campaign: Omit<ReferralCampaign, 'id' | 'currentStats'>): Promise<ReferralCampaign> {
    const newCampaign: ReferralCampaign = {
      id: this.generateId(),
      currentStats: {
        totalReferrals: 0,
        totalRevenue: 0,
        conversionRate: 0
      },
      ...campaign
    };

    this.campaigns.set(newCampaign.id, newCampaign);
    return newCampaign;
  }

  private getActiveCampaign(): ReferralCampaign | null {
    const now = new Date();
    return Array.from(this.campaigns.values())
      .find(campaign => 
        campaign.isActive && 
        campaign.startDate <= now && 
        campaign.endDate >= now
      ) || null;
  }

  // Utility Methods
  private generateReferralCode(name: string): string {
    const cleanName = name.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4);
    const randomSuffix = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `${cleanName}${randomSuffix}`;
  }

  private generateReferralLink(code: string): string {
    return `https://zabardoo.com/ref/${code}`;
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private generateTransactionId(): string {
    return 'TXN' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();
  }

  // Validation Methods
  async validateReferralCode(code: string): Promise<boolean> {
    return Array.from(this.referralUsers.values())
      .some(user => user.referralCode === code && user.isActive);
  }

  async canUserRefer(userId: string): Promise<{ canRefer: boolean; reason?: string }> {
    const user = this.referralUsers.get(userId);
    
    if (!user) {
      return { canRefer: false, reason: 'User not found in referral system' };
    }

    if (!user.isActive) {
      return { canRefer: false, reason: 'Referral account is inactive' };
    }

    const campaign = this.getActiveCampaign();
    if (campaign && user.totalReferrals >= campaign.rules.maxRewardsPerUser) {
      return { canRefer: false, reason: 'Maximum referrals limit reached for current campaign' };
    }

    return { canRefer: true };
  }

  // Export/Import for data management
  async exportUserData(userId: string): Promise<{
    user: ReferralUser | null;
    referrals: Referral[];
    rewards: ReferralReward[];
  }> {
    const user = this.referralUsers.get(userId);
    const referrals = await this.getUserReferrals(userId);
    const rewards = await this.getUserRewards(userId);

    return { user, referrals, rewards };
  }
}
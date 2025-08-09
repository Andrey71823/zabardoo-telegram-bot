import { EventEmitter } from 'events';
import { logger } from '../../config/logger';

export interface ReferralTier {
  id: string;
  name: string;
  minReferrals: number;
  commissionRate: number; // Percentage
  bonusReward: number; // Fixed bonus in INR
  benefits: string[];
  emoji: string;
}

export interface ReferralUser {
  id: string;
  telegramId: number;
  referralCode: string;
  referredBy?: string;
  totalReferrals: number;
  activeReferrals: number;
  totalEarnings: number;
  pendingEarnings: number;
  currentTier: string;
  joinedAt: Date;
  lastActivity: Date;
}

export interface ReferralTransaction {
  id: string;
  referrerId: string;
  refereeId: string;
  type: 'signup' | 'purchase' | 'tier_bonus';
  amount: number;
  status: 'pending' | 'approved' | 'paid';
  createdAt: Date;
  paidAt?: Date;
  metadata?: any;
}

export class ReferralService extends EventEmitter {
  private tiers: Map<string, ReferralTier> = new Map();
  private users: Map<string, ReferralUser> = new Map();
  private transactions: Map<string, ReferralTransaction> = new Map();

  constructor() {
    super();
    this.initializeTiers();
    logger.info('ReferralService initialized with 4 tiers');
  }

  private initializeTiers(): void {
    const tiers: ReferralTier[] = [
      {
        id: 'bronze',
        name: 'Bronze Saver',
        minReferrals: 0,
        commissionRate: 5,
        bonusReward: 100,
        emoji: '🥉',
        benefits: [
          '5% commission on referral purchases',
          '₹100 signup bonus',
          'Basic deal alerts'
        ]
      },
      {
        id: 'silver',
        name: 'Silver Hunter',
        minReferrals: 5,
        commissionRate: 8,
        bonusReward: 500,
        emoji: '🥈',
        benefits: [
          '8% commission on referral purchases',
          '₹500 tier upgrade bonus',
          'Priority deal notifications',
          'Exclusive silver deals'
        ]
      },
      {
        id: 'gold',
        name: 'Gold Master',
        minReferrals: 15,
        commissionRate: 12,
        bonusReward: 1500,
        emoji: '🥇',
        benefits: [
          '12% commission on referral purchases',
          '₹1500 tier upgrade bonus',
          'VIP customer support',
          'Early access to flash sales',
          'Monthly bonus rewards'
        ]
      },
      {
        id: 'diamond',
        name: 'Diamond Elite',
        minReferrals: 50,
        commissionRate: 20,
        bonusReward: 5000,
        emoji: '💎',
        benefits: [
          '20% commission on referral purchases',
          '₹5000 tier upgrade bonus',
          'Personal deal curator',
          'Exclusive diamond-only deals',
          'Direct line to management',
          'Annual appreciation gifts'
        ]
      }
    ];

    tiers.forEach(tier => this.tiers.set(tier.id, tier));
  }

  async createReferralUser(telegramId: number, referredBy?: string): Promise<ReferralUser> {
    const userId = `user_${telegramId}`;
    
    // Check if user already exists
    if (this.users.has(userId)) {
      return this.users.get(userId)!;
    }

    const referralCode = this.generateReferralCode(telegramId);
    
    const user: ReferralUser = {
      id: userId,
      telegramId,
      referralCode,
      referredBy,
      totalReferrals: 0,
      activeReferrals: 0,
      totalEarnings: 0,
      pendingEarnings: 0,
      currentTier: 'bronze',
      joinedAt: new Date(),
      lastActivity: new Date()
    };

    this.users.set(userId, user);

    // Process referral if user was referred
    if (referredBy) {
      await this.processReferralSignup(referredBy, userId);
    }

    logger.info(`Created referral user: ${userId} with code: ${referralCode}`);
    return user;
  }

  private generateReferralCode(telegramId: number): string {
    const base = telegramId.toString();
    const hash = base.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return `ZAB${hash.toString(36).toUpperCase().substr(0, 6)}`;
  }

  async processReferralSignup(referrerCode: string, newUserId: string): Promise<boolean> {
    try {
      // Find referrer by code
      const referrer = Array.from(this.users.values()).find(user => user.referralCode === referrerCode);
      
      if (!referrer) {
        logger.warn(`Referrer not found for code: ${referrerCode}`);
        return false;
      }

      // Update referrer stats
      referrer.totalReferrals += 1;
      referrer.activeReferrals += 1;
      referrer.lastActivity = new Date();

      // Create signup transaction
      const transaction: ReferralTransaction = {
        id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        referrerId: referrer.id,
        refereeId: newUserId,
        type: 'signup',
        amount: 50, // ₹50 for each signup
        status: 'approved',
        createdAt: new Date(),
        metadata: { referralCode: referrerCode }
      };

      this.transactions.set(transaction.id, transaction);
      referrer.totalEarnings += transaction.amount;
      referrer.pendingEarnings += transaction.amount;

      // Check for tier upgrade
      await this.checkTierUpgrade(referrer.id);

      this.emit('referralSignup', { referrer, newUserId, transaction });
      logger.info(`Processed referral signup: ${referrerCode} -> ${newUserId}`);
      
      return true;
    } catch (error) {
      logger.error('Error processing referral signup:', error);
      return false;
    }
  }

  async processReferralPurchase(userId: string, purchaseAmount: number): Promise<void> {
    try {
      const user = this.users.get(userId);
      if (!user || !user.referredBy) return;

      // Find referrer
      const referrer = Array.from(this.users.values()).find(u => u.referralCode === user.referredBy);
      if (!referrer) return;

      const tier = this.tiers.get(referrer.currentTier);
      if (!tier) return;

      // Calculate commission
      const commission = Math.round(purchaseAmount * (tier.commissionRate / 100));

      // Create purchase transaction
      const transaction: ReferralTransaction = {
        id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        referrerId: referrer.id,
        refereeId: userId,
        type: 'purchase',
        amount: commission,
        status: 'pending',
        createdAt: new Date(),
        metadata: { purchaseAmount, commissionRate: tier.commissionRate }
      };

      this.transactions.set(transaction.id, transaction);
      referrer.pendingEarnings += commission;
      referrer.lastActivity = new Date();

      this.emit('referralPurchase', { referrer, user, transaction });
      logger.info(`Processed referral purchase: ${commission} INR for ${referrer.id}`);
    } catch (error) {
      logger.error('Error processing referral purchase:', error);
    }
  }

  private async checkTierUpgrade(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (!user) return;

    const currentTier = this.tiers.get(user.currentTier);
    if (!currentTier) return;

    // Find next tier
    const allTiers = Array.from(this.tiers.values()).sort((a, b) => a.minReferrals - b.minReferrals);
    const nextTier = allTiers.find(tier => 
      tier.minReferrals > currentTier.minReferrals && 
      user.totalReferrals >= tier.minReferrals
    );

    if (nextTier) {
      const oldTier = user.currentTier;
      user.currentTier = nextTier.id;

      // Create tier bonus transaction
      const transaction: ReferralTransaction = {
        id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        referrerId: userId,
        refereeId: userId,
        type: 'tier_bonus',
        amount: nextTier.bonusReward,
        status: 'approved',
        createdAt: new Date(),
        metadata: { oldTier, newTier: nextTier.id }
      };

      this.transactions.set(transaction.id, transaction);
      user.totalEarnings += transaction.amount;
      user.pendingEarnings += transaction.amount;

      this.emit('tierUpgrade', { user, oldTier, newTier: nextTier, transaction });
      logger.info(`Tier upgrade: ${userId} from ${oldTier} to ${nextTier.id}`);
    }
  }

  getReferralUser(userId: string): ReferralUser | undefined {
    return this.users.get(userId);
  }

  getUserByReferralCode(code: string): ReferralUser | undefined {
    return Array.from(this.users.values()).find(user => user.referralCode === code);
  }

  getUserReferrals(userId: string): ReferralUser[] {
    const user = this.users.get(userId);
    if (!user) return [];

    return Array.from(this.users.values()).filter(u => u.referredBy === user.referralCode);
  }

  getUserTransactions(userId: string): ReferralTransaction[] {
    return Array.from(this.transactions.values())
      .filter(txn => txn.referrerId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async processPayment(userId: string, amount: number, paymentMethod: 'upi' | 'paytm' | 'bank'): Promise<boolean> {
    try {
      const user = this.users.get(userId);
      if (!user || user.pendingEarnings < amount) {
        return false;
      }

      // Update user earnings
      user.pendingEarnings -= amount;
      
      // Mark relevant transactions as paid
      const pendingTransactions = Array.from(this.transactions.values())
        .filter(txn => txn.referrerId === userId && txn.status === 'pending')
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

      let remainingAmount = amount;
      for (const txn of pendingTransactions) {
        if (remainingAmount <= 0) break;
        
        if (txn.amount <= remainingAmount) {
          txn.status = 'paid';
          txn.paidAt = new Date();
          remainingAmount -= txn.amount;
        }
      }

      this.emit('paymentProcessed', { user, amount, paymentMethod });
      logger.info(`Payment processed: ₹${amount} for ${userId} via ${paymentMethod}`);
      
      return true;
    } catch (error) {
      logger.error('Error processing payment:', error);
      return false;
    }
  }

  getLeaderboard(limit: number = 10): any[] {
    return Array.from(this.users.values())
      .sort((a, b) => b.totalEarnings - a.totalEarnings)
      .slice(0, limit)
      .map((user, index) => ({
        rank: index + 1,
        userId: user.id,
        telegramId: user.telegramId,
        totalReferrals: user.totalReferrals,
        totalEarnings: user.totalEarnings,
        currentTier: user.currentTier,
        tierEmoji: this.tiers.get(user.currentTier)?.emoji || '🥉'
      }));
  }

  getTierInfo(tierId: string): ReferralTier | undefined {
    return this.tiers.get(tierId);
  }

  getAllTiers(): ReferralTier[] {
    return Array.from(this.tiers.values()).sort((a, b) => a.minReferrals - b.minReferrals);
  }

  getStats(): any {
    const totalUsers = this.users.size;
    const totalTransactions = this.transactions.size;
    const totalEarnings = Array.from(this.users.values()).reduce((sum, user) => sum + user.totalEarnings, 0);
    const totalReferrals = Array.from(this.users.values()).reduce((sum, user) => sum + user.totalReferrals, 0);

    const tierDistribution = new Map<string, number>();
    Array.from(this.users.values()).forEach(user => {
      tierDistribution.set(user.currentTier, (tierDistribution.get(user.currentTier) || 0) + 1);
    });

    return {
      totalUsers,
      totalTransactions,
      totalEarnings,
      totalReferrals,
      averageEarningsPerUser: totalUsers > 0 ? Math.round(totalEarnings / totalUsers) : 0,
      tierDistribution: Object.fromEntries(tierDistribution)
    };
  }
}
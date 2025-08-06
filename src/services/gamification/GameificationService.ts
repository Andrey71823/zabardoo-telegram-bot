import { EventEmitter } from 'events';
import { logger } from '../../config/logger';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  emoji: string;
  xpReward: number;
  cashbackBonus: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  requirements: AchievementRequirement[];
}

export interface AchievementRequirement {
  type: 'purchases' | 'savings' | 'referrals' | 'streak' | 'level' | 'social';
  value: number;
  timeframe?: 'daily' | 'weekly' | 'monthly' | 'all_time';
}

export interface DailyQuest {
  id: string;
  title: string;
  description: string;
  emoji: string;
  xpReward: number;
  cashbackReward: number;
  type: 'view_deals' | 'make_purchase' | 'share_deal' | 'invite_friend' | 'use_voice' | 'scan_product';
  target: number;
  progress: number;
  completed: boolean;
  expiresAt: Date;
}

export interface UserLevel {
  level: number;
  name: string;
  emoji: string;
  xpRequired: number;
  benefits: string[];
  cashbackMultiplier: number;
}

export class GameificationService extends EventEmitter {
  private achievements: Map<string, Achievement> = new Map();
  private userProgress: Map<string, any> = new Map();
  private dailyQuests: Map<string, DailyQuest[]> = new Map();

  constructor() {
    super();
    this.initializeAchievements();
    this.initializeLevels();
    logger.info('GameificationService: Initialized with achievements and quests! 🎮');
  }

  private initializeAchievements(): void {
    const achievements: Achievement[] = [
      {
        id: 'first_purchase',
        name: 'First Blood',
        description: 'Made your first purchase',
        emoji: '🎯',
        xpReward: 100,
        cashbackBonus: 50,
        rarity: 'common',
        requirements: [{ type: 'purchases', value: 1 }]
      },
      {
        id: 'savings_master',
        name: 'Savings Master',
        description: 'Saved ₹10,000 in total',
        emoji: '💰',
        xpReward: 500,
        cashbackBonus: 200,
        rarity: 'rare',
        requirements: [{ type: 'savings', value: 10000 }]
      },
      {
        id: 'streak_warrior',
        name: 'Streak Warrior',
        description: 'Maintained 30-day login streak',
        emoji: '🔥',
        xpReward: 300,
        cashbackBonus: 100,
        rarity: 'epic',
        requirements: [{ type: 'streak', value: 30 }]
      },
      {
        id: 'referral_king',
        name: 'Referral King',
        description: 'Invited 50 friends',
        emoji: '👑',
        xpReward: 1000,
        cashbackBonus: 500,
        rarity: 'legendary',
        requirements: [{ type: 'referrals', value: 50 }]
      },
      {
        id: 'voice_explorer',
        name: 'Voice Explorer',
        description: 'Used voice search 10 times',
        emoji: '🎤',
        xpReward: 150,
        cashbackBonus: 75,
        rarity: 'common',
        requirements: [{ type: 'social', value: 10 }]
      },
      {
        id: 'deal_hunter',
        name: 'Deal Hunter',
        description: 'Found 100 deals',
        emoji: '🏹',
        xpReward: 400,
        cashbackBonus: 150,
        rarity: 'rare',
        requirements: [{ type: 'purchases', value: 100 }]
      }
    ];

    achievements.forEach(achievement => {
      this.achievements.set(achievement.id, achievement);
    });
  }

  private initializeLevels(): void {
    // Level progression system
    this.levels = [
      { level: 1, name: 'Newbie Saver', emoji: '🌱', xpRequired: 0, benefits: ['Basic cashback'], cashbackMultiplier: 1.0 },
      { level: 2, name: 'Smart Shopper', emoji: '🛍️', xpRequired: 100, benefits: ['Daily quests'], cashbackMultiplier: 1.1 },
      { level: 3, name: 'Deal Seeker', emoji: '🔍', xpRequired: 300, benefits: ['Voice search'], cashbackMultiplier: 1.2 },
      { level: 4, name: 'Bargain Hunter', emoji: '🏹', xpRequired: 600, benefits: ['Premium notifications'], cashbackMultiplier: 1.3 },
      { level: 5, name: 'Savings Ninja', emoji: '🥷', xpRequired: 1000, benefits: ['Exclusive deals'], cashbackMultiplier: 1.4 },
      { level: 6, name: 'Cashback Master', emoji: '💎', xpRequired: 1500, benefits: ['Priority support'], cashbackMultiplier: 1.5 },
      { level: 7, name: 'Deal Wizard', emoji: '🧙‍♂️', xpRequired: 2200, benefits: ['Custom alerts'], cashbackMultiplier: 1.6 },
      { level: 8, name: 'Savings Legend', emoji: '⭐', xpRequired: 3000, benefits: ['VIP access'], cashbackMultiplier: 1.7 },
      { level: 9, name: 'Discount God', emoji: '🔥', xpRequired: 4000, benefits: ['Beta features'], cashbackMultiplier: 1.8 },
      { level: 10, name: 'Zabardoo Champion', emoji: '👑', xpRequired: 5500, benefits: ['All perks'], cashbackMultiplier: 2.0 }
    ];
  }

  async awardXP(userId: string, amount: number, reason: string): Promise<{ levelUp: boolean; newLevel?: number; achievements?: Achievement[] }> {
    const userProgress = this.getUserProgress(userId);
    const oldLevel = this.calculateLevel(userProgress.xp);
    
    userProgress.xp += amount;
    userProgress.totalXP += amount;
    
    const newLevel = this.calculateLevel(userProgress.xp);
    const levelUp = newLevel > oldLevel;
    
    // Check for new achievements
    const newAchievements = await this.checkAchievements(userId, userProgress);
    
    // Update streak if daily login
    if (reason === 'daily_login') {
      this.updateStreak(userId, userProgress);
    }
    
    this.userProgress.set(userId, userProgress);
    
    logger.info(`GameificationService: Awarded ${amount} XP to user ${userId} for ${reason}`);
    
    if (levelUp) {
      this.emit('levelUp', { userId, oldLevel, newLevel, benefits: this.levels[newLevel - 1].benefits });
    }
    
    if (newAchievements.length > 0) {
      this.emit('achievementUnlocked', { userId, achievements: newAchievements });
    }
    
    return { levelUp, newLevel: levelUp ? newLevel : undefined, achievements: newAchievements };
  }

  async generateDailyQuests(userId: string): Promise<DailyQuest[]> {
    const userProgress = this.getUserProgress(userId);
    const userLevel = this.calculateLevel(userProgress.xp);
    
    const questTemplates = [
      {
        type: 'view_deals',
        title: 'Deal Explorer',
        description: 'View 5 hot deals',
        emoji: '👀',
        target: 5,
        xpReward: 50,
        cashbackReward: 25
      },
      {
        type: 'make_purchase',
        title: 'Smart Buyer',
        description: 'Make 1 purchase using a coupon',
        emoji: '🛒',
        target: 1,
        xpReward: 200,
        cashbackReward: 100
      },
      {
        type: 'share_deal',
        title: 'Deal Sharer',
        description: 'Share 3 deals with friends',
        emoji: '📤',
        target: 3,
        xpReward: 75,
        cashbackReward: 50
      },
      {
        type: 'use_voice',
        title: 'Voice Master',
        description: 'Use voice search 2 times',
        emoji: '🎤',
        target: 2,
        xpReward: 100,
        cashbackReward: 30
      },
      {
        type: 'scan_product',
        title: 'Scanner Pro',
        description: 'Scan 3 products with camera',
        emoji: '📸',
        target: 3,
        xpReward: 120,
        cashbackReward: 40
      }
    ];
    
    // Select 3 random quests based on user level
    const selectedQuests = this.selectQuestsForLevel(questTemplates, userLevel);
    
    const dailyQuests: DailyQuest[] = selectedQuests.map((template, index) => ({
      id: `${userId}_${Date.now()}_${index}`,
      title: template.title,
      description: template.description,
      emoji: template.emoji,
      type: template.type as any,
      target: template.target,
      progress: 0,
      completed: false,
      xpReward: Math.floor(template.xpReward * (1 + userLevel * 0.1)),
      cashbackReward: Math.floor(template.cashbackReward * (1 + userLevel * 0.1)),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    }));
    
    this.dailyQuests.set(userId, dailyQuests);
    
    logger.info(`GameificationService: Generated ${dailyQuests.length} daily quests for user ${userId}`);
    
    return dailyQuests;
  }

  async updateQuestProgress(userId: string, questType: string, increment: number = 1): Promise<DailyQuest[]> {
    const userQuests = this.dailyQuests.get(userId) || [];
    const updatedQuests: DailyQuest[] = [];
    
    for (const quest of userQuests) {
      if (quest.type === questType && !quest.completed && quest.expiresAt > new Date()) {
        quest.progress = Math.min(quest.progress + increment, quest.target);
        
        if (quest.progress >= quest.target && !quest.completed) {
          quest.completed = true;
          
          // Award rewards
          await this.awardXP(userId, quest.xpReward, `quest_${quest.type}`);
          
          updatedQuests.push(quest);
          
          this.emit('questCompleted', { userId, quest });
        }
      }
    }
    
    this.dailyQuests.set(userId, userQuests);
    
    return updatedQuests;
  }

  private getUserProgress(userId: string): any {
    if (!this.userProgress.has(userId)) {
      this.userProgress.set(userId, {
        xp: 0,
        totalXP: 0,
        level: 1,
        streak: 0,
        lastLogin: null,
        achievements: [],
        stats: {
          purchases: 0,
          savings: 0,
          referrals: 0,
          voiceSearches: 0,
          productScans: 0,
          dealsViewed: 0,
          dealsShared: 0
        }
      });
    }
    return this.userProgress.get(userId);
  }

  private calculateLevel(xp: number): number {
    for (let i = this.levels.length - 1; i >= 0; i--) {
      if (xp >= this.levels[i].xpRequired) {
        return this.levels[i].level;
      }
    }
    return 1;
  }

  private async checkAchievements(userId: string, userProgress: any): Promise<Achievement[]> {
    const newAchievements: Achievement[] = [];
    
    for (const [id, achievement] of this.achievements) {
      if (userProgress.achievements.includes(id)) continue;
      
      let requirementsMet = true;
      
      for (const requirement of achievement.requirements) {
        const userValue = this.getUserStatValue(userProgress, requirement.type);
        if (userValue < requirement.value) {
          requirementsMet = false;
          break;
        }
      }
      
      if (requirementsMet) {
        userProgress.achievements.push(id);
        newAchievements.push(achievement);
        
        // Award achievement rewards
        userProgress.xp += achievement.xpReward;
        
        logger.info(`GameificationService: User ${userId} unlocked achievement: ${achievement.name}`);
      }
    }
    
    return newAchievements;
  }

  private getUserStatValue(userProgress: any, statType: string): number {
    switch (statType) {
      case 'purchases': return userProgress.stats.purchases;
      case 'savings': return userProgress.stats.savings;
      case 'referrals': return userProgress.stats.referrals;
      case 'streak': return userProgress.streak;
      case 'level': return userProgress.level;
      case 'social': return userProgress.stats.voiceSearches + userProgress.stats.dealsShared;
      default: return 0;
    }
  }

  private updateStreak(userId: string, userProgress: any): void {
    const now = new Date();
    const lastLogin = userProgress.lastLogin ? new Date(userProgress.lastLogin) : null;
    
    if (lastLogin) {
      const daysDiff = Math.floor((now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === 1) {
        userProgress.streak += 1;
      } else if (daysDiff > 1) {
        userProgress.streak = 1;
      }
    } else {
      userProgress.streak = 1;
    }
    
    userProgress.lastLogin = now;
  }

  private selectQuestsForLevel(templates: any[], userLevel: number): any[] {
    // Higher level users get more challenging quests
    const availableQuests = templates.filter(quest => {
      if (userLevel < 3 && (quest.type === 'use_voice' || quest.type === 'scan_product')) {
        return false;
      }
      return true;
    });
    
    // Shuffle and select 3 quests
    const shuffled = availableQuests.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3);
  }

  // Public getters
  getUserLevel(userId: string): UserLevel {
    const userProgress = this.getUserProgress(userId);
    const level = this.calculateLevel(userProgress.xp);
    return this.levels[level - 1];
  }

  getUserAchievements(userId: string): Achievement[] {
    const userProgress = this.getUserProgress(userId);
    return userProgress.achievements.map((id: string) => this.achievements.get(id)).filter(Boolean);
  }

  getDailyQuests(userId: string): DailyQuest[] {
    return this.dailyQuests.get(userId) || [];
  }

  private levels: UserLevel[] = [];
}
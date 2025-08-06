import TelegramBot from 'node-telegram-bot-api';
import { EventEmitter } from 'events';
import { logger } from '../../config/logger';
import { GameificationService } from '../gamification/GameificationService';
import { SmartNotificationService } from '../notification/SmartNotificationService';
import { VoiceProcessingService } from '../ai/VoiceProcessingService';
import { ImageRecognitionService } from '../ai/ImageRecognitionService';

export interface BotUser {
  id: string;
  telegramId: number;
  username?: string;
  firstName: string;
  lastName?: string;
  level: number;
  xp: number;
  streak: number;
  lastActive: Date;
  preferences: UserPreferences;
  achievements: string[];
  isPremium: boolean;
}

export interface UserPreferences {
  categories: string[];
  priceRange: { min: number; max: number };
  brands: string[];
  notificationTime: string;
  language: 'en' | 'hi' | 'te' | 'ta';
  theme: 'light' | 'dark' | 'colorful';
}

export class EnhancedTelegramBot extends EventEmitter {
  private bot: TelegramBot;
  private gamificationService: GameificationService;
  private smartNotificationService: SmartNotificationService;
  private voiceService: VoiceProcessingService;
  private imageService: ImageRecognitionService;
  private users: Map<number, BotUser> = new Map();
  private activeConversations: Map<number, string> = new Map();

  constructor(token: string) {
    super();
    this.bot = new TelegramBot(token, { polling: true });
    this.gamificationService = new GameificationService();
    this.smartNotificationService = new SmartNotificationService();
    this.voiceService = new VoiceProcessingService();
    this.imageService = new ImageRecognitionService();
    
    this.setupEventHandlers();
    this.setupCommands();
    
    logger.info('Enhanced Telegram Bot initialized with superpowers! 🚀');
  }

  private setupEventHandlers(): void {
    // Text messages with smart processing
    this.bot.on('message', this.handleMessage.bind(this));
    
    // Voice messages
    this.bot.on('voice', this.handleVoiceMessage.bind(this));
    
    // Photos for product recognition
    this.bot.on('photo', this.handlePhotoMessage.bind(this));
    
    // Callback queries for interactive buttons
    this.bot.on('callback_query', this.handleCallbackQuery.bind(this));
    
    // Inline queries for search
    this.bot.on('inline_query', this.handleInlineQuery.bind(this));
  }  p
rivate setupCommands(): void {
    // Main menu command
    this.bot.onText(/\/start/, this.handleStart.bind(this));
    
    // Smart search with AI
    this.bot.onText(/\/search (.+)/, this.handleSmartSearch.bind(this));
    
    // Daily quest system
    this.bot.onText(/\/quest/, this.handleDailyQuest.bind(this));
    
    // Profile and achievements
    this.bot.onText(/\/profile/, this.handleProfile.bind(this));
    
    // Leaderboard
    this.bot.onText(/\/leaderboard/, this.handleLeaderboard.bind(this));
    
    // Premium features
    this.bot.onText(/\/premium/, this.handlePremium.bind(this));
    
    // Settings
    this.bot.onText(/\/settings/, this.handleSettings.bind(this));
    
    // Help with personality
    this.bot.onText(/\/help/, this.handleHelp.bind(this));
  }

  private async handleStart(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const user = msg.from;
    
    if (!user) return;

    // Register or get existing user
    const botUser = await this.getOrCreateUser(user);
    
    // Award XP for daily login
    await this.gamificationService.awardXP(botUser.id, 10, 'daily_login');
    
    // Create stunning welcome message
    const welcomeMessage = this.createWelcomeMessage(botUser);
    const keyboard = this.createMainMenuKeyboard(botUser);
    
    await this.bot.sendMessage(chatId, welcomeMessage, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
    
    // Send personalized recommendations
    setTimeout(() => {
      this.sendPersonalizedRecommendations(chatId, botUser);
    }, 2000);
  }

  private createWelcomeMessage(user: BotUser): string {
    const timeOfDay = this.getTimeOfDay();
    const levelEmoji = this.getLevelEmoji(user.level);
    const streakEmoji = user.streak > 0 ? '🔥'.repeat(Math.min(user.streak, 5)) : '';
    
    return `
🎉 <b>${timeOfDay}, ${user.firstName}!</b> ${levelEmoji}

💎 <b>Level ${user.level}</b> • ⚡ <b>${user.xp} XP</b> ${streakEmoji}
${user.streak > 0 ? `🔥 <b>${user.streak} day streak!</b>` : ''}

🎯 <b>Today's Mission:</b> Find 3 amazing deals!
💰 <b>Your Savings:</b> ₹${await this.getTotalSavings(user.id)}
🏆 <b>Achievements:</b> ${user.achievements.length}/50

${user.isPremium ? '👑 <b>Premium Member</b> - Exclusive deals await!' : '✨ <b>Upgrade to Premium</b> for 2x cashback!'}

<i>Ready to save some serious money? Let's go! 🚀</i>
    `.trim();
  }

  private createMainMenuKeyboard(user: BotUser): TelegramBot.InlineKeyboardMarkup {
    const keyboard: TelegramBot.InlineKeyboardButton[][] = [
      [
        { text: '🔥 Hot Deals', callback_data: 'hot_deals' },
        { text: '🎯 For You', callback_data: 'personalized' }
      ],
      [
        { text: '🔍 Smart Search', callback_data: 'smart_search' },
        { text: '📸 Scan Product', callback_data: 'scan_product' }
      ],
      [
        { text: '🎮 Daily Quest', callback_data: 'daily_quest' },
        { text: '💰 Cashback', callback_data: 'cashback' }
      ],
      [
        { text: '🏆 Achievements', callback_data: 'achievements' },
        { text: '👥 Leaderboard', callback_data: 'leaderboard' }
      ]
    ];

    if (user.isPremium) {
      keyboard.push([
        { text: '👑 Premium Deals', callback_data: 'premium_deals' }
      ]);
    } else {
      keyboard.push([
        { text: '✨ Get Premium', callback_data: 'get_premium' }
      ]);
    }

    keyboard.push([
      { text: '⚙️ Settings', callback_data: 'settings' },
      { text: '📊 My Stats', callback_data: 'stats' }
    ]);

    return { inline_keyboard: keyboard };
  }

  private async handleCallbackQuery(query: TelegramBot.CallbackQuery): Promise<void> {
    const chatId = query.message?.chat.id;
    const userId = query.from.id;
    const data = query.data;
    
    if (!chatId || !data) return;

    const user = this.users.get(userId);
    if (!user) return;

    // Award XP for interaction
    await this.gamificationService.awardXP(user.id, 2, 'interaction');

    switch (data) {
      case 'hot_deals':
        await this.showHotDeals(chatId, user);
        break;
      case 'personalized':
        await this.showPersonalizedDeals(chatId, user);
        break;
      case 'smart_search':
        await this.initiateSmartSearch(chatId, user);
        break;
      case 'scan_product':
        await this.initiateScanProduct(chatId, user);
        break;
      case 'daily_quest':
        await this.showDailyQuest(chatId, user);
        break;
      case 'cashback':
        await this.showCashbackInfo(chatId, user);
        break;
      case 'achievements':
        await this.showAchievements(chatId, user);
        break;
      case 'leaderboard':
        await this.showLeaderboard(chatId, user);
        break;
      case 'premium_deals':
        await this.showPremiumDeals(chatId, user);
        break;
      case 'get_premium':
        await this.showPremiumOffer(chatId, user);
        break;
      case 'settings':
        await this.showSettings(chatId, user);
        break;
      case 'stats':
        await this.showUserStats(chatId, user);
        break;
    }

    // Answer callback query to remove loading state
    await this.bot.answerCallbackQuery(query.id);
  } 
 private async handleMessage(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    const text = msg.text;
    
    if (!userId || !text) return;

    const user = await this.getOrCreateUser(msg.from!);
    
    // Award XP for interaction
    await this.gamificationService.awardXP(user.id, 1, 'message');
    
    // Check if user is in a conversation flow
    const conversationState = this.activeConversations.get(userId);
    
    if (conversationState) {
      await this.handleConversationFlow(chatId, user, text, conversationState);
      return;
    }

    // Handle natural language queries
    if (!text.startsWith('/')) {
      await this.handleNaturalLanguageQuery(chatId, user, text);
    }
  }

  private async handleVoiceMessage(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    const voice = msg.voice;
    
    if (!userId || !voice) return;

    const user = await this.getOrCreateUser(msg.from!);
    
    // Show typing indicator
    await this.bot.sendChatAction(chatId, 'typing');
    
    try {
      // Download voice file
      const fileLink = await this.bot.getFileLink(voice.file_id);
      const response = await fetch(fileLink);
      const audioBuffer = Buffer.from(await response.arrayBuffer());
      
      // Process voice
      const voiceResult = await this.voiceService.processVoiceMessage(audioBuffer, user.id);
      
      // Award XP for voice usage
      await this.gamificationService.awardXP(user.id, 15, 'voice_search');
      await this.gamificationService.updateQuestProgress(user.id, 'use_voice');
      
      // Generate voice response
      const responseText = await this.voiceService.generateVoiceResponse(voiceResult, []);
      
      // Send response with search results
      await this.sendVoiceSearchResults(chatId, user, voiceResult, responseText);
      
    } catch (error) {
      logger.error('Enhanced Telegram Bot: Voice processing error:', error);
      await this.bot.sendMessage(chatId, '🎤 Sorry, I couldn\'t understand your voice message. Please try again or type your request! 😊');
    }
  }

  private async handlePhotoMessage(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    const photo = msg.photo;
    
    if (!userId || !photo) return;

    const user = await this.getOrCreateUser(msg.from!);
    
    // Show typing indicator
    await this.bot.sendChatAction(chatId, 'typing');
    
    try {
      // Get the highest resolution photo
      const bestPhoto = photo[photo.length - 1];
      const fileLink = await this.bot.getFileLink(bestPhoto.file_id);
      const response = await fetch(fileLink);
      const imageBuffer = Buffer.from(await response.arrayBuffer());
      
      // Validate image
      const validation = this.imageService.validateImage(imageBuffer);
      if (!validation.valid) {
        await this.bot.sendMessage(chatId, `📸 ${validation.error} Please try with a different image! 😊`);
        return;
      }
      
      // Process image
      const recognitionResult = await this.imageService.recognizeProduct(imageBuffer, user.id);
      
      // Award XP for image scanning
      await this.gamificationService.awardXP(user.id, 20, 'product_scan');
      await this.gamificationService.updateQuestProgress(user.id, 'scan_product');
      
      // Send recognition results
      await this.sendImageRecognitionResults(chatId, user, recognitionResult);
      
    } catch (error) {
      logger.error('Enhanced Telegram Bot: Image processing error:', error);
      await this.bot.sendMessage(chatId, '📸 Sorry, I couldn\'t analyze your image. Please try with a clearer product photo! 😊');
    }
  }

  private async sendVoiceSearchResults(
    chatId: number, 
    user: BotUser, 
    voiceResult: any, 
    responseText: string
  ): Promise<void> {
    // Send voice response
    await this.bot.sendMessage(chatId, `🎤 ${responseText}`, { parse_mode: 'HTML' });
    
    // Create search keyboard
    const keyboard: TelegramBot.InlineKeyboardButton[][] = [
      [
        { text: '🔍 Search Now', callback_data: `search_${voiceResult.query}` },
        { text: '🎯 Refine Search', callback_data: 'refine_search' }
      ]
    ];
    
    // Add suggestion buttons
    voiceResult.suggestions.forEach((suggestion: string, index: number) => {
      if (index < 2) {
        keyboard.push([
          { text: `💡 ${suggestion}`, callback_data: `search_${suggestion}` }
        ]);
      }
    });
    
    await this.bot.sendMessage(chatId, 
      `🎯 <b>Voice Search Results</b>\n\n` +
      `🔍 Query: "${voiceResult.query}"\n` +
      `🎪 Confidence: ${voiceResult.confidence}%\n` +
      `🎭 Intent: ${voiceResult.intent}\n\n` +
      `Choose an option below:`,
      {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: keyboard }
      }
    );
  }

  private async sendImageRecognitionResults(
    chatId: number, 
    user: BotUser, 
    result: any
  ): Promise<void> {
    const description = await this.imageService.generateProductDescription(result);
    
    const message = `📸 <b>Product Recognition Results</b>\n\n` +
      `🎯 <b>${result.productName}</b>\n` +
      `📂 Category: ${result.category}\n` +
      `${result.brand ? `🏷️ Brand: ${result.brand}\n` : ''}` +
      `🎪 Confidence: ${result.confidence}%\n` +
      `${result.estimatedPrice ? `💰 Est. Price: ₹${result.estimatedPrice.min} - ₹${result.estimatedPrice.max}\n` : ''}` +
      `\n${description}`;
    
    const keyboard: TelegramBot.InlineKeyboardButton[][] = [
      [
        { text: '🔍 Find Deals', callback_data: `search_${result.productName}` },
        { text: '💰 Check Prices', callback_data: `price_${result.productName}` }
      ]
    ];
    
    // Add feature buttons
    if (result.features.length > 0) {
      keyboard.push([
        { text: `🔧 Features (${result.features.length})`, callback_data: `features_${result.productName}` }
      ]);
    }
    
    // Add similar products
    if (result.similarProducts.length > 0) {
      keyboard.push([
        { text: '🔄 Similar Products', callback_data: `similar_${result.productName}` }
      ]);
    }
    
    await this.bot.sendMessage(chatId, message, {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  private async showHotDeals(chatId: number, user: BotUser): Promise<void> {
    // Award XP for viewing deals
    await this.gamificationService.awardXP(user.id, 5, 'view_deals');
    await this.gamificationService.updateQuestProgress(user.id, 'view_deals');
    
    const hotDeals = await this.getHotDeals(user);
    
    const message = `🔥 <b>Hot Deals Just for You!</b> ${this.getLevelEmoji(user.level)}\n\n` +
      `🎯 <b>Personalized based on your Level ${user.level} preferences</b>\n\n`;
    
    await this.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
    
    // Send deals as carousel
    for (let i = 0; i < Math.min(hotDeals.length, 5); i++) {
      const deal = hotDeals[i];
      await this.sendDealCard(chatId, deal, user);
    }
    
    // Show more deals button
    const keyboard: TelegramBot.InlineKeyboardButton[][] = [
      [
        { text: '🔥 More Hot Deals', callback_data: 'more_hot_deals' },
        { text: '🎯 Personalized', callback_data: 'personalized' }
      ],
      [
        { text: '🏠 Main Menu', callback_data: 'main_menu' }
      ]
    ];
    
    await this.bot.sendMessage(chatId, '👆 Swipe up for more amazing deals!', {
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  private async showDailyQuest(chatId: number, user: BotUser): Promise<void> {
    const quests = await this.gamificationService.getDailyQuests(user.id);
    
    if (quests.length === 0) {
      const newQuests = await this.gamificationService.generateDailyQuests(user.id);
      await this.sendDailyQuests(chatId, user, newQuests);
    } else {
      await this.sendDailyQuests(chatId, user, quests);
    }
  }

  private async sendDailyQuests(chatId: number, user: BotUser, quests: any[]): Promise<void> {
    const completedQuests = quests.filter(q => q.completed).length;
    const totalXP = quests.reduce((sum, q) => sum + (q.completed ? q.xpReward : 0), 0);
    const totalCashback = quests.reduce((sum, q) => sum + (q.completed ? q.cashbackReward : 0), 0);
    
    let message = `🎮 <b>Daily Quests</b> ${this.getLevelEmoji(user.level)}\n\n` +
      `📊 Progress: ${completedQuests}/${quests.length} completed\n` +
      `⚡ Earned: ${totalXP} XP\n` +
      `💰 Earned: ₹${totalCashback} cashback\n\n`;
    
    quests.forEach((quest, index) => {
      const status = quest.completed ? '✅' : '⏳';
      const progress = quest.completed ? quest.target : quest.progress;
      const progressBar = this.createProgressBar(progress, quest.target);
      
      message += `${status} <b>${quest.title}</b> ${quest.emoji}\n`;
      message += `   ${quest.description}\n`;
      message += `   ${progressBar} ${progress}/${quest.target}\n`;
      message += `   🎁 ${quest.xpReward} XP + ₹${quest.cashbackReward}\n\n`;
    });
    
    const keyboard: TelegramBot.InlineKeyboardButton[][] = [
      [
        { text: '🔄 Refresh Quests', callback_data: 'refresh_quests' },
        { text: '🏆 Achievements', callback_data: 'achievements' }
      ],
      [
        { text: '🏠 Main Menu', callback_data: 'main_menu' }
      ]
    ];
    
    await this.bot.sendMessage(chatId, message, {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  private async showAchievements(chatId: number, user: BotUser): Promise<void> {
    const userAchievements = this.gamificationService.getUserAchievements(user.id);
    const totalAchievements = 50; // Total available achievements
    
    let message = `🏆 <b>Your Achievements</b> ${this.getLevelEmoji(user.level)}\n\n` +
      `📊 Unlocked: ${userAchievements.length}/${totalAchievements}\n` +
      `⭐ Completion: ${Math.round((userAchievements.length / totalAchievements) * 100)}%\n\n`;
    
    // Group achievements by rarity
    const grouped = this.groupAchievementsByRarity(userAchievements);
    
    Object.entries(grouped).forEach(([rarity, achievements]) => {
      if (achievements.length > 0) {
        const rarityEmoji = this.getRarityEmoji(rarity);
        message += `${rarityEmoji} <b>${rarity.toUpperCase()}</b> (${achievements.length})\n`;
        
        achievements.slice(0, 3).forEach((achievement: any) => {
          message += `${achievement.emoji} ${achievement.name}\n`;
        });
        
        if (achievements.length > 3) {
          message += `   ... and ${achievements.length - 3} more\n`;
        }
        message += '\n';
      }
    });
    
    const keyboard: TelegramBot.InlineKeyboardButton[][] = [
      [
        { text: '🎯 View All', callback_data: 'all_achievements' },
        { text: '📊 Progress', callback_data: 'achievement_progress' }
      ],
      [
        { text: '🏠 Main Menu', callback_data: 'main_menu' }
      ]
    ];
    
    await this.bot.sendMessage(chatId, message, {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  // Utility methods
  private async getOrCreateUser(telegramUser: TelegramBot.User): Promise<BotUser> {
    if (this.users.has(telegramUser.id)) {
      return this.users.get(telegramUser.id)!;
    }

    const user: BotUser = {
      id: `user_${telegramUser.id}`,
      telegramId: telegramUser.id,
      username: telegramUser.username,
      firstName: telegramUser.first_name,
      lastName: telegramUser.last_name,
      level: 1,
      xp: 0,
      streak: 0,
      lastActive: new Date(),
      preferences: {
        categories: [],
        priceRange: { min: 0, max: 100000 },
        brands: [],
        notificationTime: '09:00',
        language: 'en',
        theme: 'colorful'
      },
      achievements: [],
      isPremium: false
    };

    this.users.set(telegramUser.id, user);
    return user;
  }

  private getTimeOfDay(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    if (hour < 21) return 'Good evening';
    return 'Good night';
  }

  private getLevelEmoji(level: number): string {
    const emojis = ['🌱', '🛍️', '🔍', '🏹', '🥷', '💎', '🧙‍♂️', '⭐', '🔥', '👑'];
    return emojis[Math.min(level - 1, emojis.length - 1)] || '🌱';
  }

  private createProgressBar(current: number, total: number, length: number = 10): string {
    const filled = Math.round((current / total) * length);
    const empty = length - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  private groupAchievementsByRarity(achievements: any[]): { [key: string]: any[] } {
    return achievements.reduce((groups, achievement) => {
      const rarity = achievement.rarity || 'common';
      if (!groups[rarity]) groups[rarity] = [];
      groups[rarity].push(achievement);
      return groups;
    }, {});
  }

  private getRarityEmoji(rarity: string): string {
    const emojis = {
      common: '🥉',
      rare: '🥈',
      epic: '🥇',
      legendary: '💎'
    };
    return emojis[rarity as keyof typeof emojis] || '🏅';
  }

  private async getTotalSavings(userId: string): Promise<number> {
    // This would fetch from database
    return Math.floor(Math.random() * 50000) + 10000;
  }

  private async getHotDeals(user: BotUser): Promise<any[]> {
    // This would fetch from your deals API
    return [
      {
        id: 'deal1',
        title: 'Samsung Galaxy S24 Ultra',
        originalPrice: 124999,
        discountedPrice: 89999,
        discount: 28,
        store: 'Flipkart',
        category: 'electronics',
        image: 'https://example.com/samsung.jpg',
        cashback: 5,
        rating: 4.5,
        reviews: 1250
      }
    ];
  }

  private async sendDealCard(chatId: number, deal: any, user: BotUser): Promise<void> {
    const savings = deal.originalPrice - deal.discountedPrice;
    const cashbackAmount = Math.floor(deal.discountedPrice * (deal.cashback / 100));
    
    const message = `🎯 <b>${deal.title}</b>\n\n` +
      `💰 <s>₹${deal.originalPrice.toLocaleString()}</s> → <b>₹${deal.discountedPrice.toLocaleString()}</b>\n` +
      `🔥 <b>${deal.discount}% OFF</b> • Save ₹${savings.toLocaleString()}\n` +
      `💸 <b>+₹${cashbackAmount} Cashback</b>\n` +
      `🏪 ${deal.store} • ⭐ ${deal.rating} (${deal.reviews} reviews)\n`;
    
    const keyboard: TelegramBot.InlineKeyboardButton[][] = [
      [
        { text: '🛒 Get Deal', callback_data: `get_deal_${deal.id}` },
        { text: '❤️ Save', callback_data: `save_deal_${deal.id}` }
      ],
      [
        { text: '📊 Compare', callback_data: `compare_${deal.id}` },
        { text: '📤 Share', callback_data: `share_deal_${deal.id}` }
      ]
    ];
    
    await this.bot.sendMessage(chatId, message, {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  // Public methods for external integration
  async sendNotification(userId: number, title: string, message: string, data?: any): Promise<void> {
    try {
      await this.bot.sendMessage(userId, `🔔 <b>${title}</b>\n\n${message}`, {
        parse_mode: 'HTML'
      });
    } catch (error) {
      logger.error(`Enhanced Telegram Bot: Failed to send notification to user ${userId}:`, error);
    }
  }

  async broadcastMessage(userIds: number[], message: string): Promise<void> {
    for (const userId of userIds) {
      try {
        await this.bot.sendMessage(userId, message, { parse_mode: 'HTML' });
        await new Promise(resolve => setTimeout(resolve, 100)); // Rate limiting
      } catch (error) {
        logger.error(`Enhanced Telegram Bot: Failed to broadcast to user ${userId}:`, error);
      }
    }
  }

  getBot(): TelegramBot {
    return this.bot;
  }

  getUserCount(): number {
    return this.users.size;
  }

  getActiveUsers(hours: number = 24): BotUser[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return Array.from(this.users.values()).filter(user => user.lastActive > cutoff);
  }
}
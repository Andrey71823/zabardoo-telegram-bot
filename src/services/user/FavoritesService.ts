import { EventEmitter } from 'events';
import { logger } from '../../config/logger';

export interface FavoriteItem {
  id: string;
  userId: string;
  productName: string;
  productUrl: string;
  originalPrice: number;
  currentPrice: number;
  discount: number;
  store: string;
  category: string;
  imageUrl?: string;
  addedAt: Date;
  lastChecked: Date;
  isActive: boolean;
  priceHistory: PricePoint[];
}

export interface PricePoint {
  price: number;
  timestamp: Date;
}

export interface UserHistory {
  id: string;
  userId: string;
  action: 'view' | 'click' | 'favorite' | 'purchase';
  productName: string;
  store: string;
  category: string;
  timestamp: Date;
  metadata?: any;
}

export class FavoritesService extends EventEmitter {
  private favorites: Map<string, FavoriteItem[]> = new Map();
  private userHistory: Map<string, UserHistory[]> = new Map();
  private priceCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.startPriceMonitoring();
    logger.info('FavoritesService initialized with price monitoring');
  }

  async addToFavorites(userId: string, item: Omit<FavoriteItem, 'id' | 'userId' | 'addedAt' | 'lastChecked' | 'isActive' | 'priceHistory'>): Promise<string> {
    const favoriteItem: FavoriteItem = {
      id: `fav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      addedAt: new Date(),
      lastChecked: new Date(),
      isActive: true,
      priceHistory: [{ price: item.currentPrice, timestamp: new Date() }],
      ...item
    };

    const userFavorites = this.favorites.get(userId) || [];
    
    // Check if item already exists
    const existingIndex = userFavorites.findIndex(fav => 
      fav.productName.toLowerCase() === item.productName.toLowerCase() && 
      fav.store === item.store
    );

    if (existingIndex >= 0) {
      // Update existing item
      userFavorites[existingIndex] = { ...userFavorites[existingIndex], ...favoriteItem };
    } else {
      // Add new item
      userFavorites.push(favoriteItem);
    }

    this.favorites.set(userId, userFavorites);
    
    // Log to history
    this.addToHistory(userId, 'favorite', item.productName, item.store, item.category);
    
    logger.info(`Added to favorites: ${item.productName} for user ${userId}`);
    this.emit('itemAdded', { userId, item: favoriteItem });
    
    return favoriteItem.id;
  }

  async removeFromFavorites(userId: string, itemId: string): Promise<boolean> {
    const userFavorites = this.favorites.get(userId) || [];
    const itemIndex = userFavorites.findIndex(item => item.id === itemId);
    
    if (itemIndex >= 0) {
      const removedItem = userFavorites.splice(itemIndex, 1)[0];
      this.favorites.set(userId, userFavorites);
      
      logger.info(`Removed from favorites: ${removedItem.productName} for user ${userId}`);
      this.emit('itemRemoved', { userId, item: removedItem });
      
      return true;
    }
    
    return false;
  }

  getUserFavorites(userId: string, category?: string): FavoriteItem[] {
    const userFavorites = this.favorites.get(userId) || [];
    
    if (category) {
      return userFavorites.filter(item => 
        item.isActive && item.category.toLowerCase() === category.toLowerCase()
      );
    }
    
    return userFavorites.filter(item => item.isActive);
  }

  async checkPriceUpdates(userId: string): Promise<FavoriteItem[]> {
    const userFavorites = this.favorites.get(userId) || [];
    const updatedItems: FavoriteItem[] = [];

    for (const item of userFavorites) {
      if (!item.isActive) continue;

      // Simulate price check (in production, call actual APIs)
      const newPrice = this.simulatePriceCheck(item);
      
      if (newPrice !== item.currentPrice) {
        item.currentPrice = newPrice;
        item.discount = Math.round(((item.originalPrice - newPrice) / item.originalPrice) * 100);
        item.lastChecked = new Date();
        item.priceHistory.push({ price: newPrice, timestamp: new Date() });
        
        // Keep only last 30 price points
        if (item.priceHistory.length > 30) {
          item.priceHistory = item.priceHistory.slice(-30);
        }
        
        updatedItems.push(item);
        
        // Emit price drop event if price decreased
        if (newPrice < item.originalPrice * 0.9) { // 10% or more discount
          this.emit('priceDropAlert', { userId, item });
        }
      }
    }

    if (updatedItems.length > 0) {
      this.favorites.set(userId, userFavorites);
      logger.info(`Price updates found for ${updatedItems.length} items for user ${userId}`);
    }

    return updatedItems;
  }

  private simulatePriceCheck(item: FavoriteItem): number {
    // Simulate price fluctuation (±20% of current price)
    const variation = (Math.random() - 0.5) * 0.4; // -20% to +20%
    const newPrice = Math.max(
      item.originalPrice * 0.5, // Minimum 50% of original price
      Math.round(item.currentPrice * (1 + variation))
    );
    return newPrice;
  }

  addToHistory(userId: string, action: UserHistory['action'], productName: string, store: string, category: string, metadata?: any): void {
    const historyItem: UserHistory = {
      id: `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      action,
      productName,
      store,
      category,
      timestamp: new Date(),
      metadata
    };

    const userHistoryList = this.userHistory.get(userId) || [];
    userHistoryList.push(historyItem);
    
    // Keep only last 100 history items
    if (userHistoryList.length > 100) {
      userHistoryList.splice(0, userHistoryList.length - 100);
    }
    
    this.userHistory.set(userId, userHistoryList);
  }

  getUserHistory(userId: string, limit: number = 20): UserHistory[] {
    const userHistoryList = this.userHistory.get(userId) || [];
    return userHistoryList.slice(-limit).reverse(); // Most recent first
  }

  getPersonalizedRecommendations(userId: string): any[] {
    const userHistoryList = this.userHistory.get(userId) || [];
    const userFavorites = this.favorites.get(userId) || [];
    
    // Analyze user preferences
    const categoryPreferences = new Map<string, number>();
    const storePreferences = new Map<string, number>();
    
    [...userHistoryList, ...userFavorites].forEach(item => {
      const category = 'category' in item ? item.category : item.category;
      const store = 'store' in item ? item.store : item.store;
      
      categoryPreferences.set(category, (categoryPreferences.get(category) || 0) + 1);
      storePreferences.set(store, (storePreferences.get(store) || 0) + 1);
    });
    
    // Generate mock recommendations based on preferences
    const topCategories = Array.from(categoryPreferences.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category]) => category);
    
    return this.generateMockRecommendations(topCategories);
  }

  private generateMockRecommendations(categories: string[]): any[] {
    const mockProducts = [
      { name: 'Samsung Galaxy S24', category: 'Electronics', price: 65000, discount: 25, store: 'Flipkart' },
      { name: 'Nike Air Max', category: 'Fashion', price: 8999, discount: 30, store: 'Myntra' },
      { name: 'Lakme Foundation', category: 'Beauty', price: 899, discount: 20, store: 'Nykaa' },
      { name: 'iPhone 15 Pro', category: 'Electronics', price: 134900, discount: 15, store: 'Amazon' },
      { name: 'Zara Dress', category: 'Fashion', price: 2999, discount: 40, store: 'Zara' }
    ];
    
    return mockProducts
      .filter(product => categories.length === 0 || categories.includes(product.category))
      .slice(0, 5)
      .map(product => ({
        ...product,
        id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        reason: `Based on your interest in ${product.category}`,
        confidence: Math.floor(Math.random() * 30) + 70 // 70-100%
      }));
  }

  async getExpiringDeals(userId: string): Promise<FavoriteItem[]> {
    const userFavorites = this.favorites.get(userId) || [];
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    
    // Mock expiring deals (in production, check actual expiry dates)
    return userFavorites
      .filter(item => item.isActive)
      .filter(() => Math.random() < 0.3) // 30% chance of expiring soon
      .slice(0, 3);
  }

  private startPriceMonitoring(): void {
    // Check prices every hour
    this.priceCheckInterval = setInterval(async () => {
      const allUsers = Array.from(this.favorites.keys());
      
      for (const userId of allUsers) {
        try {
          await this.checkPriceUpdates(userId);
        } catch (error) {
          logger.error(`Price check failed for user ${userId}:`, error);
        }
      }
    }, 60 * 60 * 1000); // 1 hour
  }

  getStats(): any {
    const totalFavorites = Array.from(this.favorites.values()).reduce((sum, favs) => sum + favs.length, 0);
    const totalHistory = Array.from(this.userHistory.values()).reduce((sum, hist) => sum + hist.length, 0);
    
    return {
      totalUsers: this.favorites.size,
      totalFavorites,
      totalHistory,
      averageFavoritesPerUser: this.favorites.size > 0 ? Math.round(totalFavorites / this.favorites.size) : 0
    };
  }

  destroy(): void {
    if (this.priceCheckInterval) {
      clearInterval(this.priceCheckInterval);
    }
    this.removeAllListeners();
    logger.info('FavoritesService destroyed');
  }
}
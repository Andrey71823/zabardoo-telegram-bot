import { BaseService } from '../base/BaseService';

interface FavoriteItem {
  id: string;
  userId: string;
  type: 'deal' | 'store' | 'category' | 'product';
  itemId: string;
  title: string;
  description?: string;
  imageUrl?: string;
  originalPrice?: number;
  discountedPrice?: number;
  discount?: string;
  cashback?: string;
  storeId?: string;
  storeName?: string;
  categoryId?: string;
  expiryDate?: Date;
  isActive: boolean;
  addedAt: Date;
  lastViewedAt?: Date;
  clickCount: number;
  tags: string[];
  metadata: any;
}

interface UserHistory {
  id: string;
  userId: string;
  action: 'view' | 'click' | 'purchase' | 'share' | 'search';
  itemType: 'deal' | 'store' | 'category' | 'product';
  itemId: string;
  itemTitle: string;
  metadata: {
    price?: number;
    discount?: string;
    cashback?: string;
    storeName?: string;
    categoryName?: string;
    searchQuery?: string;
    referrer?: string;
    deviceType?: string;
    location?: string;
  };
  timestamp: Date;
  sessionId?: string;
}

interface FavoritesStats {
  totalFavorites: number;
  favoritesByType: Record<string, number>;
  favoritesByStore: Record<string, number>;
  favoritesByCategory: Record<string, number>;
  expiringSoon: number;
  averageDiscount: number;
  totalPotentialSavings: number;
}

interface HistoryStats {
  totalActions: number;
  actionsByType: Record<string, number>;
  mostViewedCategories: Array<{ category: string; count: number }>;
  mostViewedStores: Array<{ store: string; count: number }>;
  averageSessionDuration: number;
  lastActiveDate: Date;
  totalClicks: number;
  conversionRate: number;
}

export class FavoritesService extends BaseService {
  private favorites: Map<string, FavoriteItem[]> = new Map();
  private history: Map<string, UserHistory[]> = new Map();

  // Favorites Management
  async addToFavorites(userId: string, item: Omit<FavoriteItem, 'id' | 'userId' | 'addedAt' | 'clickCount' | 'isActive'>): Promise<FavoriteItem> {
    const favoriteItem: FavoriteItem = {
      id: this.generateId(),
      userId,
      addedAt: new Date(),
      clickCount: 0,
      isActive: true,
      ...item
    };

    const userFavorites = this.favorites.get(userId) || [];
    
    // Check if item already exists
    const existingIndex = userFavorites.findIndex(fav => 
      fav.type === item.type && fav.itemId === item.itemId
    );

    if (existingIndex >= 0) {
      // Update existing favorite
      userFavorites[existingIndex] = { ...userFavorites[existingIndex], ...favoriteItem, id: userFavorites[existingIndex].id };
      this.favorites.set(userId, userFavorites);
      return userFavorites[existingIndex];
    } else {
      // Add new favorite
      userFavorites.push(favoriteItem);
      this.favorites.set(userId, userFavorites);
      
      // Log to history
      await this.addToHistory(userId, {
        action: 'view',
        itemType: item.type,
        itemId: item.itemId,
        itemTitle: item.title,
        metadata: {
          price: item.discountedPrice,
          discount: item.discount,
          cashback: item.cashback,
          storeName: item.storeName,
          categoryName: item.categoryId
        }
      });

      return favoriteItem;
    }
  }

  async removeFromFavorites(userId: string, favoriteId: string): Promise<boolean> {
    const userFavorites = this.favorites.get(userId) || [];
    const initialLength = userFavorites.length;
    
    const updatedFavorites = userFavorites.filter(fav => fav.id !== favoriteId);
    this.favorites.set(userId, updatedFavorites);
    
    return updatedFavorites.length < initialLength;
  }

  async getFavorites(userId: string, filters?: {
    type?: string;
    category?: string;
    store?: string;
    isActive?: boolean;
    sortBy?: 'addedAt' | 'lastViewedAt' | 'clickCount' | 'expiryDate';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }): Promise<FavoriteItem[]> {
    let userFavorites = this.favorites.get(userId) || [];

    // Apply filters
    if (filters) {
      if (filters.type) {
        userFavorites = userFavorites.filter(fav => fav.type === filters.type);
      }
      if (filters.category) {
        userFavorites = userFavorites.filter(fav => fav.categoryId === filters.category);
      }
      if (filters.store) {
        userFavorites = userFavorites.filter(fav => fav.storeId === filters.store);
      }
      if (filters.isActive !== undefined) {
        userFavorites = userFavorites.filter(fav => fav.isActive === filters.isActive);
      }

      // Sort
      if (filters.sortBy) {
        userFavorites.sort((a, b) => {
          const aVal = a[filters.sortBy!];
          const bVal = b[filters.sortBy!];
          
          if (aVal < bVal) return filters.sortOrder === 'desc' ? 1 : -1;
          if (aVal > bVal) return filters.sortOrder === 'desc' ? -1 : 1;
          return 0;
        });
      }

      // Pagination
      if (filters.offset) {
        userFavorites = userFavorites.slice(filters.offset);
      }
      if (filters.limit) {
        userFavorites = userFavorites.slice(0, filters.limit);
      }
    }

    return userFavorites;
  }

  async isFavorite(userId: string, itemType: string, itemId: string): Promise<boolean> {
    const userFavorites = this.favorites.get(userId) || [];
    return userFavorites.some(fav => fav.type === itemType && fav.itemId === itemId && fav.isActive);
  }

  async updateFavorite(userId: string, favoriteId: string, updates: Partial<FavoriteItem>): Promise<FavoriteItem | null> {
    const userFavorites = this.favorites.get(userId) || [];
    const favoriteIndex = userFavorites.findIndex(fav => fav.id === favoriteId);
    
    if (favoriteIndex >= 0) {
      userFavorites[favoriteIndex] = { ...userFavorites[favoriteIndex], ...updates };
      this.favorites.set(userId, userFavorites);
      return userFavorites[favoriteIndex];
    }
    
    return null;
  }

  // History Management
  async addToHistory(userId: string, historyItem: Omit<UserHistory, 'id' | 'userId' | 'timestamp'>): Promise<UserHistory> {
    const historyEntry: UserHistory = {
      id: this.generateId(),
      userId,
      timestamp: new Date(),
      ...historyItem
    };

    const userHistory = this.history.get(userId) || [];
    userHistory.push(historyEntry);
    
    // Keep only last 1000 entries per user
    if (userHistory.length > 1000) {
      userHistory.splice(0, userHistory.length - 1000);
    }
    
    this.history.set(userId, userHistory);
    return historyEntry;
  }

  async getHistory(userId: string, filters?: {
    action?: string;
    itemType?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
  }): Promise<UserHistory[]> {
    let userHistory = this.history.get(userId) || [];

    // Apply filters
    if (filters) {
      if (filters.action) {
        userHistory = userHistory.filter(h => h.action === filters.action);
      }
      if (filters.itemType) {
        userHistory = userHistory.filter(h => h.itemType === filters.itemType);
      }
      if (filters.dateFrom) {
        userHistory = userHistory.filter(h => h.timestamp >= filters.dateFrom!);
      }
      if (filters.dateTo) {
        userHistory = userHistory.filter(h => h.timestamp <= filters.dateTo!);
      }

      // Pagination
      if (filters.offset) {
        userHistory = userHistory.slice(filters.offset);
      }
      if (filters.limit) {
        userHistory = userHistory.slice(0, filters.limit);
      }
    }

    return userHistory.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async clearHistory(userId: string, olderThan?: Date): Promise<number> {
    const userHistory = this.history.get(userId) || [];
    const initialLength = userHistory.length;
    
    if (olderThan) {
      const filteredHistory = userHistory.filter(h => h.timestamp > olderThan);
      this.history.set(userId, filteredHistory);
      return initialLength - filteredHistory.length;
    } else {
      this.history.set(userId, []);
      return initialLength;
    }
  }

  // Statistics and Analytics
  async getFavoritesStats(userId: string): Promise<FavoritesStats> {
    const userFavorites = this.favorites.get(userId) || [];
    const activeFavorites = userFavorites.filter(fav => fav.isActive);

    const favoritesByType = activeFavorites.reduce((acc, fav) => {
      acc[fav.type] = (acc[fav.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const favoritesByStore = activeFavorites.reduce((acc, fav) => {
      if (fav.storeName) {
        acc[fav.storeName] = (acc[fav.storeName] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const favoritesByCategory = activeFavorites.reduce((acc, fav) => {
      if (fav.categoryId) {
        acc[fav.categoryId] = (acc[fav.categoryId] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const now = new Date();
    const expiringSoon = activeFavorites.filter(fav => 
      fav.expiryDate && fav.expiryDate.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000 // 7 days
    ).length;

    const discounts = activeFavorites
      .map(fav => parseFloat(fav.discount?.replace('%', '') || '0'))
      .filter(d => d > 0);
    const averageDiscount = discounts.length > 0 ? discounts.reduce((a, b) => a + b, 0) / discounts.length : 0;

    const totalPotentialSavings = activeFavorites.reduce((total, fav) => {
      if (fav.originalPrice && fav.discountedPrice) {
        return total + (fav.originalPrice - fav.discountedPrice);
      }
      return total;
    }, 0);

    return {
      totalFavorites: activeFavorites.length,
      favoritesByType,
      favoritesByStore,
      favoritesByCategory,
      expiringSoon,
      averageDiscount,
      totalPotentialSavings
    };
  }

  async getHistoryStats(userId: string): Promise<HistoryStats> {
    const userHistory = this.history.get(userId) || [];

    const actionsByType = userHistory.reduce((acc, h) => {
      acc[h.action] = (acc[h.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const categoryViews = userHistory
      .filter(h => h.metadata.categoryName)
      .reduce((acc, h) => {
        const category = h.metadata.categoryName!;
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const mostViewedCategories = Object.entries(categoryViews)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const storeViews = userHistory
      .filter(h => h.metadata.storeName)
      .reduce((acc, h) => {
        const store = h.metadata.storeName!;
        acc[store] = (acc[store] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const mostViewedStores = Object.entries(storeViews)
      .map(([store, count]) => ({ store, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const lastActiveDate = userHistory.length > 0 ? 
      new Date(Math.max(...userHistory.map(h => h.timestamp.getTime()))) : 
      new Date(0);

    const totalClicks = actionsByType['click'] || 0;
    const totalViews = actionsByType['view'] || 0;
    const conversionRate = totalViews > 0 ? totalClicks / totalViews : 0;

    return {
      totalActions: userHistory.length,
      actionsByType,
      mostViewedCategories,
      mostViewedStores,
      averageSessionDuration: 0, // Would need session tracking
      lastActiveDate,
      totalClicks,
      conversionRate
    };
  }

  // Expiry Management
  async getExpiringFavorites(userId: string, daysAhead: number = 7): Promise<FavoriteItem[]> {
    const userFavorites = this.favorites.get(userId) || [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + daysAhead);

    return userFavorites.filter(fav => 
      fav.isActive && 
      fav.expiryDate && 
      fav.expiryDate <= cutoffDate &&
      fav.expiryDate > new Date()
    );
  }

  async sendExpiryReminders(userId: string): Promise<FavoriteItem[]> {
    const expiringFavorites = await this.getExpiringFavorites(userId, 3); // 3 days ahead
    
    // In a real implementation, this would send notifications
    console.log(`Sending expiry reminders for ${expiringFavorites.length} items to user ${userId}`);
    
    return expiringFavorites;
  }

  // Recommendations based on favorites and history
  async getRecommendations(userId: string, limit: number = 10): Promise<any[]> {
    const userFavorites = this.favorites.get(userId) || [];
    const userHistory = this.history.get(userId) || [];

    // Analyze user preferences
    const preferredCategories = userFavorites
      .map(fav => fav.categoryId)
      .filter(Boolean)
      .reduce((acc, cat) => {
        acc[cat!] = (acc[cat!] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const preferredStores = userFavorites
      .map(fav => fav.storeId)
      .filter(Boolean)
      .reduce((acc, store) => {
        acc[store!] = (acc[store!] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    // Generate recommendations based on preferences
    const recommendations = [];
    
    // This would integrate with actual deal/product services
    for (const [category, count] of Object.entries(preferredCategories)) {
      recommendations.push({
        type: 'category_recommendation',
        category,
        reason: `You have ${count} favorites in ${category}`,
        confidence: Math.min(count / 5, 1)
      });
    }

    return recommendations.slice(0, limit);
  }

  // Utility methods
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  async exportUserData(userId: string): Promise<{
    favorites: FavoriteItem[];
    history: UserHistory[];
    stats: {
      favorites: FavoritesStats;
      history: HistoryStats;
    };
  }> {
    const favorites = await this.getFavorites(userId);
    const history = await this.getHistory(userId);
    const favoritesStats = await this.getFavoritesStats(userId);
    const historyStats = await this.getHistoryStats(userId);

    return {
      favorites,
      history,
      stats: {
        favorites: favoritesStats,
        history: historyStats
      }
    };
  }

  async importUserData(userId: string, data: {
    favorites: FavoriteItem[];
    history: UserHistory[];
  }): Promise<void> {
    // Clear existing data
    this.favorites.set(userId, []);
    this.history.set(userId, []);

    // Import favorites
    for (const favorite of data.favorites) {
      await this.addToFavorites(userId, favorite);
    }

    // Import history
    this.history.set(userId, data.history.map(h => ({ ...h, userId })));
  }
}
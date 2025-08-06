import { IndianStoreService } from '../services/stores/IndianStoreService';
import { IndianStoreRepository } from '../repositories/IndianStoreRepository';
import { IndianStore } from '../models/IndianStore';
import { Logger } from '../config/logger';

// Mock dependencies
jest.mock('../repositories/IndianStoreRepository');
jest.mock('../config/logger');

describe('IndianStoreService', () => {
  let indianStoreService: IndianStoreService;
  let mockIndianStoreRepository: jest.Mocked<IndianStoreRepository>;
  let mockLogger: jest.Mocked<Logger>;

  const mockStore: IndianStore = {
    id: 'store-1',
    name: 'Flipkart',
    domain: 'flipkart.com',
    logo: 'https://img1a.flixcart.com/www/linchpin/fk-cp-zion/img/flipkart-plus_8d85f4.png',
    categories: ['Electronics', 'Fashion', 'Home'],
    priority: 1,
    isPopular: true,
    isActive: true,
    commissionRate: 3.5,
    conversionRate: 0.085,
    apiEndpoint: 'https://affiliate-api.flipkart.net/affiliate/api',
    affiliateNetwork: 'Flipkart Affiliate',
    trackingParams: {
      affid: 'zabardoo',
      subid: '{telegram_sub_id}',
      source: 'telegram'
    },
    supportedRegions: ['IN'],
    paymentMethods: ['UPI', 'PayTM', 'Credit Card'],
    specialFeatures: ['Big Billion Days', 'Flipkart Plus'],
    seasonalTrends: {
      'Q4': ['Big Billion Days', 'Diwali Sale']
    },
    targetAudience: {
      ageGroups: ['18-25', '26-35'],
      interests: ['Technology', 'Fashion'],
      demographics: ['Urban', 'Semi-Urban'],
      income: ['Middle', 'Upper-Middle']
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    mockIndianStoreRepository = new IndianStoreRepository(null as any) as jest.Mocked<IndianStoreRepository>;
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    } as any;

    indianStoreService = new IndianStoreService(mockIndianStoreRepository, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initializePopularStores', () => {
    it('should initialize all popular Indian stores', async () => {
      // Arrange
      mockIndianStoreRepository.getStoreByDomain.mockResolvedValue(null);
      mockIndianStoreRepository.createStore.mockResolvedValue(mockStore);

      // Act
      const result = await indianStoreService.initializePopularStores();

      // Assert
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      expect(mockIndianStoreRepository.createStore).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Initializing popular Indian stores...');
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Successfully initialized')
      );
    });

    it('should update existing stores instead of creating duplicates', async () => {
      // Arrange
      mockIndianStoreRepository.getStoreByDomain.mockResolvedValue(mockStore);
      mockIndianStoreRepository.updateStore.mockResolvedValue(mockStore);

      // Act
      const result = await indianStoreService.initializePopularStores();

      // Assert
      expect(result).toBeInstanceOf(Array);
      expect(mockIndianStoreRepository.updateStore).toHaveBeenCalled();
      expect(mockIndianStoreRepository.createStore).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully during initialization', async () => {
      // Arrange
      mockIndianStoreRepository.getStoreByDomain.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(indianStoreService.initializePopularStores()).rejects.toThrow('Database error');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to initialize popular stores:', expect.any(Error));
    });

    it('should continue initialization even if individual store fails', async () => {
      // Arrange
      mockIndianStoreRepository.getStoreByDomain
        .mockResolvedValueOnce(null) // First store succeeds
        .mockRejectedValueOnce(new Error('Store error')) // Second store fails
        .mockResolvedValueOnce(null); // Third store succeeds

      mockIndianStoreRepository.createStore.mockResolvedValue(mockStore);

      // Act
      const result = await indianStoreService.initializePopularStores();

      // Assert
      expect(result).toBeInstanceOf(Array);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to initialize store'),
        expect.any(Error)
      );
    });
  });

  describe('getPopularStores', () => {
    it('should return popular stores', async () => {
      // Arrange
      const expectedStores = [mockStore];
      mockIndianStoreRepository.getPopularStores.mockResolvedValue(expectedStores);

      // Act
      const result = await indianStoreService.getPopularStores();

      // Assert
      expect(result).toEqual(expectedStores);
      expect(mockIndianStoreRepository.getPopularStores).toHaveBeenCalled();
    });

    it('should handle errors when getting popular stores', async () => {
      // Arrange
      mockIndianStoreRepository.getPopularStores.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(indianStoreService.getPopularStores()).rejects.toThrow('Database error');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to get popular stores:', expect.any(Error));
    });
  });

  describe('getStoresByCategory', () => {
    it('should return stores filtered by category', async () => {
      // Arrange
      const category = 'Electronics';
      const expectedStores = [mockStore];
      mockIndianStoreRepository.getStoresByCategory.mockResolvedValue(expectedStores);

      // Act
      const result = await indianStoreService.getStoresByCategory(category);

      // Assert
      expect(result).toEqual(expectedStores);
      expect(mockIndianStoreRepository.getStoresByCategory).toHaveBeenCalledWith(category);
    });

    it('should handle errors when getting stores by category', async () => {
      // Arrange
      const category = 'Electronics';
      mockIndianStoreRepository.getStoresByCategory.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(indianStoreService.getStoresByCategory(category)).rejects.toThrow('Database error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Failed to get stores by category ${category}:`,
        expect.any(Error)
      );
    });
  });

  describe('searchStores', () => {
    it('should return stores matching search query', async () => {
      // Arrange
      const query = 'flip';
      const expectedStores = [mockStore];
      mockIndianStoreRepository.searchStores.mockResolvedValue(expectedStores);

      // Act
      const result = await indianStoreService.searchStores(query);

      // Assert
      expect(result).toEqual(expectedStores);
      expect(mockIndianStoreRepository.searchStores).toHaveBeenCalledWith(query);
    });

    it('should handle errors during store search', async () => {
      // Arrange
      const query = 'flip';
      mockIndianStoreRepository.searchStores.mockRejectedValue(new Error('Search error'));

      // Act & Assert
      await expect(indianStoreService.searchStores(query)).rejects.toThrow('Search error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Failed to search stores with query ${query}:`,
        expect.any(Error)
      );
    });
  });

  describe('getRecommendedStores', () => {
    it('should return recommended stores for user without preferences', async () => {
      // Arrange
      const userId = 'user-123';
      const expectedStores = [mockStore];
      mockIndianStoreRepository.getPopularStores.mockResolvedValue(expectedStores);

      // Act
      const result = await indianStoreService.getRecommendedStores(userId);

      // Assert
      expect(result).toEqual(expectedStores);
      expect(mockIndianStoreRepository.getPopularStores).toHaveBeenCalled();
    });

    it('should filter stores by user preferences', async () => {
      // Arrange
      const userId = 'user-123';
      const preferences = ['Electronics'];
      const allStores = [
        mockStore, // Has Electronics category
        {
          ...mockStore,
          id: 'store-2',
          name: 'Beauty Store',
          categories: ['Beauty'] // No Electronics category
        }
      ];
      mockIndianStoreRepository.getPopularStores.mockResolvedValue(allStores as IndianStore[]);

      // Act
      const result = await indianStoreService.getRecommendedStores(userId, preferences);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].categories).toContain('Electronics');
    });

    it('should limit results to top 10 stores', async () => {
      // Arrange
      const userId = 'user-123';
      const manyStores = Array.from({ length: 15 }, (_, i) => ({
        ...mockStore,
        id: `store-${i}`,
        priority: i + 1
      }));
      mockIndianStoreRepository.getPopularStores.mockResolvedValue(manyStores as IndianStore[]);

      // Act
      const result = await indianStoreService.getRecommendedStores(userId);

      // Assert
      expect(result).toHaveLength(10);
    });

    it('should handle errors when getting recommended stores', async () => {
      // Arrange
      const userId = 'user-123';
      mockIndianStoreRepository.getPopularStores.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(indianStoreService.getRecommendedStores(userId)).rejects.toThrow('Database error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Failed to get recommended stores for user ${userId}:`,
        expect.any(Error)
      );
    });
  });

  describe('getStoreStats', () => {
    it('should return store statistics', async () => {
      // Arrange
      const expectedStats = {
        totalStores: 10,
        activeStores: 8,
        popularStores: 5,
        categoriesCount: 6,
        averageCommission: 4.2,
        averageConversion: 0.085,
        topCategories: ['Electronics', 'Fashion'],
        regionCoverage: ['IN']
      };
      mockIndianStoreRepository.getStoreStats.mockResolvedValue(expectedStats);

      // Act
      const result = await indianStoreService.getStoreStats();

      // Assert
      expect(result).toEqual(expectedStats);
      expect(mockIndianStoreRepository.getStoreStats).toHaveBeenCalled();
    });

    it('should handle errors when getting store statistics', async () => {
      // Arrange
      mockIndianStoreRepository.getStoreStats.mockRejectedValue(new Error('Stats error'));

      // Act & Assert
      await expect(indianStoreService.getStoreStats()).rejects.toThrow('Stats error');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to get store statistics:', expect.any(Error));
    });
  });

  describe('updateStorePriorities', () => {
    it('should update store priorities based on performance', async () => {
      // Arrange
      const stores = [
        { ...mockStore, id: 'store-1', conversionRate: 0.1, commissionRate: 5.0 },
        { ...mockStore, id: 'store-2', conversionRate: 0.08, commissionRate: 4.0 },
        { ...mockStore, id: 'store-3', conversionRate: 0.12, commissionRate: 3.0 }
      ];
      mockIndianStoreRepository.getAllStores.mockResolvedValue(stores as IndianStore[]);
      mockIndianStoreRepository.updateStore.mockResolvedValue(mockStore);

      // Act
      await indianStoreService.updateStorePriorities();

      // Assert
      expect(mockIndianStoreRepository.getAllStores).toHaveBeenCalled();
      expect(mockIndianStoreRepository.updateStore).toHaveBeenCalledTimes(3);
      expect(mockLogger.info).toHaveBeenCalledWith('Updating store priorities based on performance...');
      expect(mockLogger.info).toHaveBeenCalledWith('Store priorities updated successfully');
    });

    it('should handle errors during priority update', async () => {
      // Arrange
      mockIndianStoreRepository.getAllStores.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(indianStoreService.updateStorePriorities()).rejects.toThrow('Database error');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to update store priorities:', expect.any(Error));
    });
  });

  describe('getTrendingStores', () => {
    it('should return trending stores sorted by conversion rate', async () => {
      // Arrange
      const stores = [
        { ...mockStore, id: 'store-1', conversionRate: 0.08 },
        { ...mockStore, id: 'store-2', conversionRate: 0.12 },
        { ...mockStore, id: 'store-3', conversionRate: 0.10 }
      ];
      mockIndianStoreRepository.getPopularStores.mockResolvedValue(stores as IndianStore[]);

      // Act
      const result = await indianStoreService.getTrendingStores(2);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].conversionRate).toBe(0.12); // Highest conversion rate first
      expect(result[1].conversionRate).toBe(0.10);
    });

    it('should handle errors when getting trending stores', async () => {
      // Arrange
      mockIndianStoreRepository.getPopularStores.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(indianStoreService.getTrendingStores()).rejects.toThrow('Database error');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to get trending stores:', expect.any(Error));
    });
  });
});
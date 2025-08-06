import { IndianStoreRepository } from '../../repositories/IndianStoreRepository';
import { IndianStore, StoreIntegration, StoreCoupon, StoreCategory } from '../../models/IndianStore';
import { BaseService } from '../base/BaseService';
import { Logger } from '../../config/logger';
import axios, { AxiosInstance } from 'axios';

export class IndianStoreService extends BaseService {
  private indianStoreRepository: IndianStoreRepository;
  private logger: Logger;
  private httpClient: AxiosInstance;

  // Популярные индийские магазины с их конфигурациями
  private readonly POPULAR_INDIAN_STORES = {
    flipkart: {
      name: 'Flipkart',
      domain: 'flipkart.com',
      logo: 'https://img1a.flixcart.com/www/linchpin/fk-cp-zion/img/flipkart-plus_8d85f4.png',
      categories: ['Electronics', 'Fashion', 'Home', 'Books', 'Sports'],
      priority: 1,
      isPopular: true,
      commissionRate: 3.5,
      apiEndpoint: 'https://affiliate-api.flipkart.net/affiliate/api',
      affiliateNetwork: 'Flipkart Affiliate',
      trackingParams: {
        affid: 'zabardoo',
        subid: '{telegram_sub_id}',
        source: 'telegram'
      }
    },
    amazon: {
      name: 'Amazon India',
      domain: 'amazon.in',
      logo: 'https://m.media-amazon.com/images/G/31/img16/favicon/favicon-32x32._CB485963803_.png',
      categories: ['Electronics', 'Fashion', 'Home', 'Books', 'Beauty', 'Sports'],
      priority: 2,
      isPopular: true,
      commissionRate: 4.0,
      apiEndpoint: 'https://webservices.amazon.in/paapi5/searchitems',
      affiliateNetwork: 'Amazon Associates',
      trackingParams: {
        tag: 'zabardoo-21',
        linkCode: 'as2',
        subid: '{telegram_sub_id}'
      }
    },
    myntra: {
      name: 'Myntra',
      domain: 'myntra.com',
      logo: 'https://constant.myntassets.com/web/assets/img/MyntraWebSprite_27_01_2021.png',
      categories: ['Fashion', 'Beauty', 'Home'],
      priority: 3,
      isPopular: true,
      commissionRate: 5.5,
      apiEndpoint: 'https://www.myntra.com/gateway/v2/search',
      affiliateNetwork: 'Myntra Affiliate',
      trackingParams: {
        partner: 'zabardoo',
        subid: '{telegram_sub_id}',
        source: 'telegram'
      }
    },
    nykaa: {
      name: 'Nykaa',
      domain: 'nykaa.com',
      logo: 'https://adn-static1.nykaa.com/media/wysiwyg/2019/lnykaa-logo-header-beauty.svg',
      categories: ['Beauty', 'Fashion', 'Health'],
      priority: 4,
      isPopular: true,
      commissionRate: 6.0,
      apiEndpoint: 'https://www.nykaa.com/api/affiliate/products',
      affiliateNetwork: 'Nykaa Affiliate',
      trackingParams: {
        affiliate: 'zabardoo',
        subid: '{telegram_sub_id}',
        utm_source: 'telegram'
      }
    },
    swiggy: {
      name: 'Swiggy',
      domain: 'swiggy.com',
      logo: 'https://res.cloudinary.com/swiggy/image/upload/fl_lossy,f_auto,q_auto,w_508,h_320/portal/c/logo_2018.png',
      categories: ['Food', 'Grocery'],
      priority: 5,
      isPopular: true,
      commissionRate: 3.0,
      apiEndpoint: 'https://www.swiggy.com/dapi/restaurants/list/v5',
      affiliateNetwork: 'Swiggy Partners',
      trackingParams: {
        partner_id: 'zabardoo',
        subid: '{telegram_sub_id}',
        source: 'telegram'
      }
    },
    makemytrip: {
      name: 'MakeMyTrip',
      domain: 'makemytrip.com',
      logo: 'https://imgak.mmtcdn.com/pwa_v3/pwa_commons_assets/desktop/logo-mmtIndia.png',
      categories: ['Travel', 'Hotels'],
      priority: 6,
      isPopular: true,
      commissionRate: 5.0,
      apiEndpoint: 'https://www.makemytrip.com/api/affiliate/search',
      affiliateNetwork: 'MakeMyTrip Affiliate',
      trackingParams: {
        affid: 'zabardoo',
        subid: '{telegram_sub_id}',
        utm_source: 'telegram'
      }
    },
    bigbasket: {
      name: 'BigBasket',
      domain: 'bigbasket.com',
      logo: 'https://www.bigbasket.com/media/uploads/banner_images/hp_m_health_suppliment_250421_400.jpg',
      categories: ['Grocery', 'Health'],
      priority: 7,
      isPopular: true,
      commissionRate: 2.5,
      apiEndpoint: 'https://www.bigbasket.com/affiliate/api/products',
      affiliateNetwork: 'BigBasket Affiliate',
      trackingParams: {
        affiliate_id: 'zabardoo',
        subid: '{telegram_sub_id}'
      }
    },
    ajio: {
      name: 'Ajio',
      domain: 'ajio.com',
      logo: 'https://assets.ajio.com/static/img/Ajio-Logo.svg',
      categories: ['Fashion', 'Beauty', 'Home'],
      priority: 8,
      isPopular: true,
      commissionRate: 4.5,
      apiEndpoint: 'https://www.ajio.com/api/affiliate/products',
      affiliateNetwork: 'Ajio Affiliate',
      trackingParams: {
        partner: 'zabardoo',
        subid: '{telegram_sub_id}'
      }
    },
    paytmmall: {
      name: 'Paytm Mall',
      domain: 'paytmmall.com',
      logo: 'https://assetscdn1.paytm.com/images/catalog/view_item/728701/paytm-logo.png',
      categories: ['Electronics', 'Fashion', 'Home', 'Travel'],
      priority: 9,
      isPopular: true,
      commissionRate: 3.8,
      apiEndpoint: 'https://mall.paytm.com/api/affiliate/search',
      affiliateNetwork: 'Paytm Affiliate',
      trackingParams: {
        affiliate: 'zabardoo',
        subid: '{telegram_sub_id}'
      }
    },
    lenskart: {
      name: 'Lenskart',
      domain: 'lenskart.com',
      logo: 'https://static1.lenskart.com/media/desktop/img/site-images/main_logo.svg',
      categories: ['Eyewear', 'Health'],
      priority: 10,
      isPopular: true,
      commissionRate: 6.5,
      apiEndpoint: 'https://www.lenskart.com/api/affiliate/products',
      affiliateNetwork: 'Lenskart Affiliate',
      trackingParams: {
        partner: 'zabardoo',
        subid: '{telegram_sub_id}'
      }
    }
  };

  constructor(indianStoreRepository: IndianStoreRepository, logger: Logger) {
    super();
    this.indianStoreRepository = indianStoreRepository;
    this.logger = logger;
    this.httpClient = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': 'Zabardoo-Bot/1.0',
        'Accept': 'application/json'
      }
    });
  }

  /**
   * Инициализация всех популярных индийских магазинов
   */
  async initializePopularStores(): Promise<IndianStore[]> {
    try {
      this.logger.info('Initializing popular Indian stores...');
      const stores: IndianStore[] = [];

      for (const [key, storeConfig] of Object.entries(this.POPULAR_INDIAN_STORES)) {
        try {
          const store = await this.createOrUpdateStore(key, storeConfig);
          stores.push(store);
          this.logger.info(`Initialized store: ${store.name}`);
        } catch (error) {
          this.logger.error(`Failed to initialize store ${storeConfig.name}:`, error);
        }
      }

      this.logger.info(`Successfully initialized ${stores.length} popular Indian stores`);
      return stores;

    } catch (error) {
      this.logger.error('Failed to initialize popular stores:', error);
      throw error;
    }
  }

  /**
   * Создание или обновление магазина
   */
  private async createOrUpdateStore(key: string, config: any): Promise<IndianStore> {
    const existingStore = await this.indianStoreRepository.getStoreByDomain(config.domain);

    const storeData = {
      name: config.name,
      domain: config.domain,
      logo: config.logo,
      categories: config.categories,
      priority: config.priority,
      isPopular: config.isPopular,
      isActive: true,
      commissionRate: config.commissionRate,
      conversionRate: this.getEstimatedConversionRate(key),
      apiEndpoint: config.apiEndpoint,
      affiliateNetwork: config.affiliateNetwork,
      trackingParams: config.trackingParams,
      supportedRegions: ['IN'], // Индия
      paymentMethods: this.getPopularPaymentMethods(),
      specialFeatures: this.getStoreSpecialFeatures(key),
      seasonalTrends: this.getSeasonalTrends(key),
      targetAudience: this.getTargetAudience(key)
    };

    if (existingStore) {
      return await this.indianStoreRepository.updateStore(existingStore.id, storeData);
    } else {
      return await this.indianStoreRepository.createStore(storeData);
    }
  }

  /**
   * Получение оценочного коэффициента конверсии для магазина
   */
  private getEstimatedConversionRate(storeKey: string): number {
    const conversionRates = {
      flipkart: 0.085,
      amazon: 0.092,
      myntra: 0.078,
      nykaa: 0.089,
      swiggy: 0.150,
      makemytrip: 0.072,
      bigbasket: 0.120,
      ajio: 0.065,
      paytmmall: 0.068,
      lenskart: 0.075
    };
    return conversionRates[storeKey] || 0.070;
  }

  /**
   * Получение популярных способов оплаты в Индии
   */
  private getPopularPaymentMethods(): string[] {
    return [
      'UPI', 'PayTM', 'PhonePe', 'GooglePay', 'NetBanking', 
      'Credit Card', 'Debit Card', 'Cash on Delivery', 'Wallets'
    ];
  }

  /**
   * Получение специальных функций магазина
   */
  private getStoreSpecialFeatures(storeKey: string): string[] {
    const features = {
      flipkart: ['Big Billion Days', 'Flipkart Plus', 'No Cost EMI', 'Exchange Offers'],
      amazon: ['Prime Delivery', 'Great Indian Festival', 'Lightning Deals', 'Amazon Pay'],
      myntra: ['End of Reason Sale', 'Try & Buy', 'Style Pass', 'Rapid Delivery'],
      nykaa: ['Beauty Bonanza', 'Pink Friday', 'Free Samples', 'Beauty Advice'],
      swiggy: ['Super', 'One', 'Instamart', 'Genie'],
      makemytrip: ['DoubleBlack', 'myBiz', 'myPartner', 'Trip Money'],
      bigbasket: ['BB Star', 'Express Delivery', 'Fresh Guarantee', 'Smart Basket'],
      ajio: ['AJIO Gold', 'Luxe', 'Own Label', 'International Brands'],
      paytmmall: ['Paytm Cashback', 'Mall Credits', 'Postpaid', 'Gold Membership'],
      lenskart: ['Home Eye Test', '3D Try On', 'Blu Lenses', 'Roboto Eye Test']
    };
    return features[storeKey] || ['Quality Products', 'Fast Delivery', 'Easy Returns'];
  }

  /**
   * Получение сезонных трендов
   */
  private getSeasonalTrends(storeKey: string): Record<string, string[]> {
    const trends = {
      flipkart: {
        'Q1': ['Republic Day Sale', 'Valentine Offers'],
        'Q2': ['Summer Sale', 'Mobile Bonanza'],
        'Q3': ['Monsoon Sale', 'Back to School'],
        'Q4': ['Big Billion Days', 'Diwali Sale']
      },
      amazon: {
        'Q1': ['Great Republic Day Sale', 'Valentine Special'],
        'Q2': ['Summer Sale', 'Prime Day'],
        'Q3': ['Monsoon Special', 'Back to School'],
        'Q4': ['Great Indian Festival', 'New Year Sale']
      },
      myntra: {
        'Q1': ['Republic Day Sale', 'Valentine Fashion'],
        'Q2': ['Summer Fashion', 'Wedding Season'],
        'Q3': ['Monsoon Fashion', 'Festive Prep'],
        'Q4': ['End of Reason Sale', 'Winter Collection']
      }
    };
    return trends[storeKey] || {
      'Q1': ['New Year Sale'], 'Q2': ['Summer Sale'], 
      'Q3': ['Monsoon Sale'], 'Q4': ['Festival Sale']
    };
  }

  /**
   * Получение целевой аудитории
   */
  private getTargetAudience(storeKey: string): Record<string, any> {
    const audiences = {
      flipkart: {
        ageGroups: ['18-25', '26-35', '36-45'],
        interests: ['Technology', 'Fashion', 'Home'],
        demographics: ['Urban', 'Semi-Urban'],
        income: ['Middle', 'Upper-Middle']
      },
      amazon: {
        ageGroups: ['25-35', '36-45', '46-55'],
        interests: ['Books', 'Electronics', 'Home'],
        demographics: ['Urban', 'Semi-Urban', 'Rural'],
        income: ['Middle', 'Upper-Middle', 'High']
      },
      myntra: {
        ageGroups: ['18-25', '26-35'],
        interests: ['Fashion', 'Beauty', 'Lifestyle'],
        demographics: ['Urban', 'Metro'],
        income: ['Middle', 'Upper-Middle']
      },
      nykaa: {
        ageGroups: ['18-30', '31-40'],
        interests: ['Beauty', 'Skincare', 'Fashion'],
        demographics: ['Urban', 'Metro'],
        income: ['Middle', 'Upper-Middle', 'High']
      },
      swiggy: {
        ageGroups: ['18-35'],
        interests: ['Food', 'Convenience', 'Quick Service'],
        demographics: ['Urban', 'Metro'],
        income: ['Lower-Middle', 'Middle', 'Upper-Middle']
      }
    };
    return audiences[storeKey] || {
      ageGroups: ['18-45'],
      interests: ['Shopping', 'Deals'],
      demographics: ['Urban'],
      income: ['Middle']
    };
  }

  /**
   * Получение всех популярных магазинов
   */
  async getPopularStores(): Promise<IndianStore[]> {
    try {
      return await this.indianStoreRepository.getPopularStores();
    } catch (error) {
      this.logger.error('Failed to get popular stores:', error);
      throw error;
    }
  }

  /**
   * Получение магазинов по категории
   */
  async getStoresByCategory(category: string): Promise<IndianStore[]> {
    try {
      return await this.indianStoreRepository.getStoresByCategory(category);
    } catch (error) {
      this.logger.error(`Failed to get stores by category ${category}:`, error);
      throw error;
    }
  }

  /**
   * Поиск магазинов
   */
  async searchStores(query: string): Promise<IndianStore[]> {
    try {
      return await this.indianStoreRepository.searchStores(query);
    } catch (error) {
      this.logger.error(`Failed to search stores with query ${query}:`, error);
      throw error;
    }
  }

  /**
   * Получение рекомендованных магазинов для пользователя
   */
  async getRecommendedStores(userId: string, preferences?: string[]): Promise<IndianStore[]> {
    try {
      // Получаем популярные магазины
      let stores = await this.getPopularStores();

      // Если есть предпочтения пользователя, фильтруем по категориям
      if (preferences && preferences.length > 0) {
        stores = stores.filter(store => 
          store.categories.some(category => 
            preferences.some(pref => 
              category.toLowerCase().includes(pref.toLowerCase())
            )
          )
        );
      }

      // Сортируем по приоритету и популярности
      stores.sort((a, b) => {
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        return b.conversionRate - a.conversionRate;
      });

      return stores.slice(0, 10); // Возвращаем топ-10

    } catch (error) {
      this.logger.error(`Failed to get recommended stores for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Получение статистики по магазинам
   */
  async getStoreStats(): Promise<any> {
    try {
      const stats = await this.indianStoreRepository.getStoreStats();
      return {
        totalStores: stats.totalStores,
        activeStores: stats.activeStores,
        popularStores: stats.popularStores,
        categoriesCount: stats.categoriesCount,
        averageCommission: stats.averageCommission,
        averageConversion: stats.averageConversion,
        topCategories: stats.topCategories,
        regionCoverage: stats.regionCoverage
      };
    } catch (error) {
      this.logger.error('Failed to get store statistics:', error);
      throw error;
    }
  }

  /**
   * Обновление приоритетов магазинов на основе производительности
   */
  async updateStorePriorities(): Promise<void> {
    try {
      this.logger.info('Updating store priorities based on performance...');
      
      const stores = await this.indianStoreRepository.getAllStores();
      
      // Сортируем по конверсии и комиссии
      stores.sort((a, b) => {
        const scoreA = a.conversionRate * a.commissionRate;
        const scoreB = b.conversionRate * b.commissionRate;
        return scoreB - scoreA;
      });

      // Обновляем приоритеты
      for (let i = 0; i < stores.length; i++) {
        await this.indianStoreRepository.updateStore(stores[i].id, {
          priority: i + 1
        });
      }

      this.logger.info('Store priorities updated successfully');

    } catch (error) {
      this.logger.error('Failed to update store priorities:', error);
      throw error;
    }
  }

  /**
   * Получение трендовых магазинов
   */
  async getTrendingStores(limit: number = 5): Promise<IndianStore[]> {
    try {
      const stores = await this.getPopularStores();
      
      // Сортируем по конверсии (трендовые = высокая конверсия)
      stores.sort((a, b) => b.conversionRate - a.conversionRate);
      
      return stores.slice(0, limit);

    } catch (error) {
      this.logger.error('Failed to get trending stores:', error);
      throw error;
    }
  }
}
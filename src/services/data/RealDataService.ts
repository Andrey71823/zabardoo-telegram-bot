import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import { logger } from '../../config/logger';

export interface RealProduct {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  originalPrice: number;
  discount: number;
  discountPercentage: number;
  store: string;
  storeUrl: string;
  affiliateUrl: string;
  imageUrl: string;
  rating: number;
  reviewCount: number;
  availability: boolean;
  features: string[];
  description: string;
  cashbackRate: number;
  lastUpdated: Date;
}

export interface RealCoupon {
  id: string;
  title: string;
  description: string;
  code?: string;
  store: string;
  category: string;
  discountType: 'percentage' | 'fixed' | 'offer';
  discountValue?: number;
  minOrderValue?: number;
  maxDiscount?: number;
  expiryDate?: Date;
  isActive: boolean;
  affiliateUrl: string;
  termsAndConditions: string[];
  usageCount: number;
  successRate: number;
  lastVerified: Date;
}

export interface IndianStore {
  id: string;
  name: string;
  domain: string;
  apiEndpoint?: string;
  affiliateId: string;
  categories: string[];
  isActive: boolean;
  averageDeliveryTime: string;
  paymentMethods: string[];
  regions: string[];
  commission: number;
  apiKey?: string;
}

interface RawCatalogProduct {
  id: string;
  title: string;
  shortTitle?: string;
  brand?: string;
  category?: string;
  subCategory?: string;
  store: string;
  storeCode: string;
  storeUrl: string;
  affiliateUrl: string;
  discountedPrice: number;
  originalPrice: number;
  discount?: number;
  discountValue?: number;
  cashback?: number;
  cashbackRate?: number;
  coupon?: string | null;
  rating?: number;
  reviewCount?: number;
  image?: string;
  shortDescription?: string;
  description?: string;
  availability?: string;
  features?: string[];
  updatedAt?: string;
  lastChecked?: string;
}

export class RealDataService extends EventEmitter {
  private stores: Map<string, IndianStore> = new Map();
  private productCache: Map<string, RealProduct[]> = new Map();
  // Coupons are not yet implemented, but the interface expects them to exist
  private couponCache: Map<string, RealCoupon[]> = new Map();
  private cacheExpiry: number = 30 * 60 * 1000; // 30 minutes
  private catalog: RealProduct[] = [];

  constructor() {
    super();
    this.loadCatalogProducts();
    this.initializeStores();
    this.startCacheCleanup();
    logger.info('RealDataService ready with local catalog data');
  }

  private loadCatalogProducts(): void {
    try {
      const catalogPath = path.resolve(process.cwd(), 'data', 'product-catalog.json');
      if (!fs.existsSync(catalogPath)) {
        logger.warn(`RealDataService: catalog file not found at ${catalogPath}`);
        this.catalog = [];
        return;
      }

      const rawContent = fs.readFileSync(catalogPath, 'utf8');
      const rawProducts: RawCatalogProduct[] = JSON.parse(rawContent);

      this.catalog = rawProducts.map((product): RealProduct => ({
        id: product.id,
        name: product.title,
        brand: product.brand || 'Unknown',
        category: product.category || 'general',
        price: Number(product.discountedPrice) || 0,
        originalPrice: Number(product.originalPrice) || Number(product.discountedPrice) || 0,
        discount: Number(product.discountValue ?? 0),
        discountPercentage: Number(product.discount ?? 0),
        store: product.store,
        storeUrl: product.storeUrl,
        affiliateUrl: product.affiliateUrl,
        imageUrl: product.image || '',
        rating: Number(product.rating ?? 0),
        reviewCount: Number(product.reviewCount ?? 0),
        availability: (product.availability || 'in_stock').toLowerCase() === 'in_stock',
        features: Array.isArray(product.features) ? product.features : [],
        description: product.description || product.shortDescription || '',
        cashbackRate: Number(product.cashbackRate ?? product.cashback ?? 0),
        lastUpdated: new Date(product.updatedAt || product.lastChecked || Date.now())
      }));
    } catch (error) {
      logger.error('RealDataService: failed to load catalog data', { error });
      this.catalog = [];
    }
  }

  private initializeStores(): void {
    this.stores.clear();
    for (const product of this.catalog) {
      const storeId = this.getStoreIdFromProduct(product);
      if (!this.stores.has(storeId)) {
        const domain = this.extractDomain(product.storeUrl);
        this.stores.set(storeId, {
          id: storeId,
          name: product.store,
          domain,
          affiliateId: '',
          categories: [product.category],
          isActive: true,
          averageDeliveryTime: '2-5 days',
          paymentMethods: ['UPI', 'Credit Card', 'Debit Card', 'Net Banking'],
          regions: ['India'],
          commission: 5
        });
      } else {
        const store = this.stores.get(storeId)!;
        if (!store.categories.includes(product.category)) {
          store.categories.push(product.category);
        }
      }
    }
  }

  private getStoreIdFromProduct(product: RealProduct): string {
    return product.store
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private extractDomain(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.hostname;
    } catch {
      return url.replace(/^https?:\/\//, '').split('/')[0] || 'example.com';
    }
  }

  private tokenize(query: string): string[] {
    return query
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter(Boolean);
  }

  async searchProducts(query: string, category?: string, maxResults: number = 20): Promise<RealProduct[]> {
    const cacheKey = `products_${query}_${category || 'all'}_${maxResults}`;
    const cached = this.productCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const tokens = this.tokenize(query);
    let results = this.catalog.slice();

    if (category) {
      const normalizedCategory = category.toLowerCase();
      results = results.filter(product => product.category.toLowerCase().includes(normalizedCategory));
    }

    if (tokens.length > 0) {
      results = results.filter(product => {
        const haystack = [
          product.name,
          product.brand,
          product.category,
          product.description,
          product.features.join(' '),
          product.store
        ]
          .join(' ')
          .toLowerCase();

        return tokens.every(token => haystack.includes(token));
      });
    }

    results.sort((a, b) => {
      const discountDiff = (b.discountPercentage || 0) - (a.discountPercentage || 0);
      if (discountDiff !== 0) return discountDiff;
      const ratingDiff = (b.rating || 0) - (a.rating || 0);
      if (ratingDiff !== 0) return ratingDiff;
      return b.lastUpdated.getTime() - a.lastUpdated.getTime();
    });

    const limited = results.slice(0, maxResults);
    this.productCache.set(cacheKey, limited);
    return limited;
  }

  async getCoupons(storeId?: string, category?: string): Promise<RealCoupon[]> {
    if (storeId || category) {
      logger.debug('RealDataService.getCoupons called with params:', { storeId, category });
    }
    // Coupon integration is not implemented yet. Return an empty array to keep the API stable.
    return [];
  }

  async getProductById(productId: string): Promise<RealProduct | null> {
    const cached = this.productCache.get(productId);
    if (cached && cached.length > 0) {
      return cached[0];
    }

    const product = this.catalog.find(item => item.id === productId) || null;
    if (product) {
      this.productCache.set(productId, [product]);
    }
    return product;
  }

  async getStoreInfo(storeId: string): Promise<IndianStore | null> {
    return this.stores.get(storeId) || null;
  }

  async getAllStores(): Promise<IndianStore[]> {
    return Array.from(this.stores.values());
  }

  private startCacheCleanup(): void {
    setInterval(() => {
      const threshold = Date.now() - this.cacheExpiry;

      for (const [key, products] of this.productCache.entries()) {
        if (products.length === 0) {
          this.productCache.delete(key);
          continue;
        }

        const oldest = products.reduce((min, product) => {
          return product.lastUpdated.getTime() < min ? product.lastUpdated.getTime() : min;
        }, products[0].lastUpdated.getTime());

        if (oldest < threshold) {
          this.productCache.delete(key);
        }
      }

      for (const [key, coupons] of this.couponCache.entries()) {
        if (coupons.length === 0) {
          this.couponCache.delete(key);
          continue;
        }

        const newest = coupons.reduce((max, coupon) => {
          const verified = coupon.lastVerified.getTime();
          return verified > max ? verified : max;
        }, coupons[0].lastVerified.getTime());

        if (newest < threshold) {
          this.couponCache.delete(key);
        }
      }
    }, 10 * 60 * 1000);
  }
}

export default RealDataService;

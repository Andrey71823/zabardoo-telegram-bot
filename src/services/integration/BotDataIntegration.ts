import RealDataService, { RealProduct, RealCoupon } from '../data/RealDataService';
import { logger } from '../../config/logger';

export interface BotProductResponse {
  id: string;
  name: string;
  price: string;
  originalPrice: string;
  discount: string;
  store: string;
  url: string;
  image: string;
  rating: string;
  cashback: string;
  features: string[];
}

export interface BotCouponResponse {
  id: string;
  title: string;
  description: string;
  code?: string;
  store: string;
  discount: string;
  validity: string;
  url: string;
  terms: string[];
}

export class BotDataIntegration {
  private realDataService: RealDataService;

  constructor() {
    this.realDataService = new RealDataService();
    logger.info('BotDataIntegration initialized');
  }

  async searchProductsForBot(query: string, category?: string, limit: number = 10): Promise<BotProductResponse[]> {
    try {
      const products = await this.realDataService.searchProducts(query, category, limit);
      
      return products.map(product => this.formatProductForBot(product));
    } catch (error) {
      logger.error('Error searching products for bot:', error);
      return [];
    }
  }

  async getCouponsForBot(store?: string, category?: string): Promise<BotCouponResponse[]> {
    try {
      const coupons = await this.realDataService.getCoupons(store, category);
      
      return coupons.map(coupon => this.formatCouponForBot(coupon));
    } catch (error) {
      logger.error('Error getting coupons for bot:', error);
      return [];
    }
  }

  async getProductDetailsForBot(productId: string): Promise<BotProductResponse | null> {
    try {
      const product = await this.realDataService.getProductById(productId);
      
      if (!product) return null;
      
      return this.formatProductForBot(product);
    } catch (error) {
      logger.error('Error getting product details for bot:', error);
      return null;
    }
  }

  private formatProductForBot(product: RealProduct): BotProductResponse {
    return {
      id: product.id,
      name: product.name,
      price: `₹${product.price.toLocaleString('en-IN')}`,
      originalPrice: `₹${product.originalPrice.toLocaleString('en-IN')}`,
      discount: `${product.discountPercentage}% OFF (Save ₹${product.discount.toLocaleString('en-IN')})`,
      store: product.store,
      url: product.affiliateUrl,
      image: product.imageUrl,
      rating: `${product.rating}/5 (${product.reviewCount.toLocaleString('en-IN')} reviews)`,
      cashback: `${product.cashbackRate}% Cashback`,
      features: product.features
    };
  }

  private formatCouponForBot(coupon: RealCoupon): BotCouponResponse {
    const validity = coupon.expiryDate 
      ? `Valid till ${coupon.expiryDate.toLocaleDateString('en-IN')}`
      : 'Limited time offer';

    let discountText = '';
    if (coupon.discountType === 'percentage') {
      discountText = `${coupon.discountValue}% OFF`;
      if (coupon.maxDiscount) {
        discountText += ` (Max ₹${coupon.maxDiscount.toLocaleString('en-IN')})`;
      }
    } else if (coupon.discountType === 'fixed') {
      discountText = `₹${coupon.discountValue?.toLocaleString('en-IN')} OFF`;
    } else {
      discountText = 'Special Offer';
    }

    return {
      id: coupon.id,
      title: coupon.title,
      description: coupon.description,
      code: coupon.code,
      store: coupon.store,
      discount: discountText,
      validity: validity,
      url: coupon.affiliateUrl,
      terms: coupon.termsAndConditions
    };
  }

  // Helper method to get formatted product message for Telegram
  formatProductMessage(product: BotProductResponse): string {
    let message = `🛍️ *${product.name}*\n\n`;
    message += `💰 *Price:* ${product.price}\n`;
    message += `~~${product.originalPrice}~~ ${product.discount}\n\n`;
    message += `🏪 *Store:* ${product.store}\n`;
    message += `⭐ *Rating:* ${product.rating}\n`;
    message += `💸 *Cashback:* ${product.cashback}\n\n`;
    
    if (product.features.length > 0) {
      message += `✨ *Features:*\n`;
      product.features.forEach(feature => {
        message += `• ${feature}\n`;
      });
      message += '\n';
    }
    
    message += `🔗 [Buy Now](${product.url})`;
    
    return message;
  }

  // Helper method to get formatted coupon message for Telegram
  formatCouponMessage(coupon: BotCouponResponse): string {
    let message = `🎟️ *${coupon.title}*\n\n`;
    message += `📝 ${coupon.description}\n\n`;
    message += `🏪 *Store:* ${coupon.store}\n`;
    message += `💰 *Discount:* ${coupon.discount}\n`;
    message += `⏰ *Validity:* ${coupon.validity}\n\n`;
    
    if (coupon.code) {
      message += `🔑 *Coupon Code:* \`${coupon.code}\`\n\n`;
    }
    
    if (coupon.terms.length > 0) {
      message += `📋 *Terms & Conditions:*\n`;
      coupon.terms.forEach(term => {
        message += `• ${term}\n`;
      });
      message += '\n';
    }
    
    message += `🔗 [Get Deal](${coupon.url})`;
    
    return message;
  }

  // Method to get trending products
  async getTrendingProducts(limit: number = 5): Promise<BotProductResponse[]> {
    try {
      // Get products from different categories
      const categories = ['Electronics', 'Fashion', 'Beauty', 'Home'];
      const allProducts: BotProductResponse[] = [];

      for (const category of categories) {
        const products = await this.searchProductsForBot('trending', category, 2);
        allProducts.push(...products);
      }

      return allProducts.slice(0, limit);
    } catch (error) {
      logger.error('Error getting trending products:', error);
      return [];
    }
  }

  // Method to get deals of the day
  async getDealsOfTheDay(limit: number = 10): Promise<BotProductResponse[]> {
    try {
      const products = await this.realDataService.searchProducts('deals', undefined, limit * 2);
      
      // Filter products with high discounts (>20%)
      const highDiscountProducts = products
        .filter(product => product.discountPercentage > 20)
        .slice(0, limit);

      return highDiscountProducts.map(product => this.formatProductForBot(product));
    } catch (error) {
      logger.error('Error getting deals of the day:', error);
      return [];
    }
  }
}

export default BotDataIntegration;
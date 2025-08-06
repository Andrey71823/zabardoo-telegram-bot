import { BaseService } from '../base/BaseService';
import { CouponManagementRepository } from '../../repositories/CouponManagementRepository';
import { 
  Coupon, 
  CouponFilter, 
  CouponStats, 
  BulkOperation, 
  ModerationAction,
  CouponTemplate,
  CouponValidation,
  CouponImport,
  CouponExport
} from '../../models/CouponManagement';

export class CouponManagementService extends BaseService {
  private repository: CouponManagementRepository;

  constructor() {
    super('CouponManagementService');
    this.repository = new CouponManagementRepository();
  }

  protected setupServiceRoutes(): void {
    // Service routes will be handled by the controller
  }

  protected async checkServiceHealth(): Promise<boolean> {
    try {
      // Basic health check - try to get coupon stats
      await this.repository.getCouponStats();
      return true;
    } catch (error) {
      this.logger.error('Coupon management service health check failed:', error);
      return false;
    }
  }

  /**
   * Get coupons with filtering and pagination
   */
  async getCoupons(filter: CouponFilter): Promise<{
    coupons: Coupon[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      this.logger.info('Getting coupons with filter:', filter);
      return await this.repository.getCoupons(filter);
    } catch (error) {
      this.logger.error('Error getting coupons:', error);
      throw new Error('Failed to retrieve coupons');
    }
  }

  /**
   * Get coupon by ID
   */
  async getCouponById(id: string): Promise<Coupon | null> {
    try {
      this.logger.info('Getting coupon by ID:', id);
      return await this.repository.getCouponById(id);
    } catch (error) {
      this.logger.error('Error getting coupon by ID:', error);
      throw new Error('Failed to retrieve coupon');
    }
  }

  /**
   * Create new coupon with validation
   */
  async createCoupon(couponData: Omit<Coupon, 'id' | 'createdAt' | 'updatedAt'>): Promise<Coupon> {
    try {
      this.logger.info('Creating new coupon:', couponData.title);

      // Validate coupon data
      const validation = await this.validateCoupon(couponData);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      // Set default values
      const coupon = {
        ...couponData,
        usedCount: couponData.usedCount || 0,
        clickCount: couponData.clickCount || 0,
        conversionCount: couponData.conversionCount || 0,
        revenue: couponData.revenue || 0,
        status: couponData.status || 'pending',
        priority: couponData.priority || 0,
        tags: couponData.tags || [],
        isExclusive: couponData.isExclusive || false,
        isFeatured: couponData.isFeatured || false
      };

      const result = await this.repository.createCoupon(coupon);
      this.logger.info('Coupon created successfully:', result.id);
      return result;
    } catch (error) {
      this.logger.error('Error creating coupon:', error);
      throw error;
    }
  }

  /**
   * Update coupon with validation
   */
  async updateCoupon(id: string, updates: Partial<Coupon>): Promise<Coupon | null> {
    try {
      this.logger.info('Updating coupon:', id);

      // Get existing coupon
      const existingCoupon = await this.repository.getCouponById(id);
      if (!existingCoupon) {
        throw new Error('Coupon not found');
      }

      // Validate updates
      const updatedCoupon = { ...existingCoupon, ...updates };
      const validation = await this.validateCoupon(updatedCoupon);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      const result = await this.repository.updateCoupon(id, updates);
      this.logger.info('Coupon updated successfully:', id);
      return result;
    } catch (error) {
      this.logger.error('Error updating coupon:', error);
      throw error;
    }
  }

  /**
   * Delete coupon
   */
  async deleteCoupon(id: string): Promise<boolean> {
    try {
      this.logger.info('Deleting coupon:', id);
      const result = await this.repository.deleteCoupon(id);
      this.logger.info('Coupon deleted successfully:', id);
      return result;
    } catch (error) {
      this.logger.error('Error deleting coupon:', error);
      throw error;
    }
  }

  /**
   * Get coupon statistics
   */
  async getCouponStats(filter?: Partial<CouponFilter>): Promise<CouponStats> {
    try {
      this.logger.info('Getting coupon statistics');
      return await this.repository.getCouponStats(filter);
    } catch (error) {
      this.logger.error('Error getting coupon stats:', error);
      throw new Error('Failed to retrieve coupon statistics');
    }
  }

  /**
   * Perform bulk operations on coupons
   */
  async performBulkOperation(operation: BulkOperation): Promise<{
    success: number;
    failed: number;
    errors: Array<{ id: string; error: string }>;
  }> {
    try {
      this.logger.info('Performing bulk operation:', operation.operation, 'on', operation.couponIds.length, 'coupons');
      
      // Validate operation
      if (!operation.couponIds || operation.couponIds.length === 0) {
        throw new Error('No coupon IDs provided for bulk operation');
      }

      const result = await this.repository.performBulkOperation(operation);
      this.logger.info('Bulk operation completed:', result);
      return result;
    } catch (error) {
      this.logger.error('Error performing bulk operation:', error);
      throw error;
    }
  }

  /**
   * Get coupons pending moderation
   */
  async getPendingModerationCoupons(): Promise<Coupon[]> {
    try {
      this.logger.info('Getting coupons pending moderation');
      return await this.repository.getPendingModerationCoupons();
    } catch (error) {
      this.logger.error('Error getting pending moderation coupons:', error);
      throw new Error('Failed to retrieve pending coupons');
    }
  }

  /**
   * Moderate coupon (approve, reject, request changes)
   */
  async moderateCoupon(action: ModerationAction): Promise<Coupon | null> {
    try {
      this.logger.info('Moderating coupon:', action.couponId, 'action:', action.action);
      
      // Validate moderation action
      if (!action.moderatorId) {
        throw new Error('Moderator ID is required');
      }

      if (action.action === 'reject' && !action.notes) {
        throw new Error('Rejection reason is required');
      }

      const result = await this.repository.moderateCoupon(action);
      this.logger.info('Coupon moderated successfully:', action.couponId);
      return result;
    } catch (error) {
      this.logger.error('Error moderating coupon:', error);
      throw error;
    }
  }

  /**
   * Validate coupon data
   */
  async validateCoupon(coupon: Partial<Coupon>): Promise<CouponValidation> {
    const errors: Array<{ field: string; message: string }> = [];
    const warnings: Array<{ field: string; message: string }> = [];

    // Required fields validation
    if (!coupon.title || coupon.title.trim().length === 0) {
      errors.push({ field: 'title', message: 'Title is required' });
    }

    if (!coupon.description || coupon.description.trim().length === 0) {
      errors.push({ field: 'description', message: 'Description is required' });
    }

    if (!coupon.store || coupon.store.trim().length === 0) {
      errors.push({ field: 'store', message: 'Store is required' });
    }

    if (!coupon.category || coupon.category.trim().length === 0) {
      errors.push({ field: 'category', message: 'Category is required' });
    }

    if (!coupon.affiliateLink || coupon.affiliateLink.trim().length === 0) {
      errors.push({ field: 'affiliateLink', message: 'Affiliate link is required' });
    }

    if (!coupon.createdBy || coupon.createdBy.trim().length === 0) {
      errors.push({ field: 'createdBy', message: 'Creator is required' });
    }

    // Discount validation
    if (coupon.discount !== undefined) {
      if (coupon.discount < 0) {
        errors.push({ field: 'discount', message: 'Discount cannot be negative' });
      }
      if (coupon.discountType === 'percentage' && coupon.discount > 100) {
        errors.push({ field: 'discount', message: 'Percentage discount cannot exceed 100%' });
      }
    }

    // Date validation
    if (coupon.validFrom && coupon.validTo) {
      if (coupon.validFrom >= coupon.validTo) {
        errors.push({ field: 'validTo', message: 'Valid to date must be after valid from date' });
      }
    }

    if (coupon.validTo && coupon.validTo <= new Date()) {
      warnings.push({ field: 'validTo', message: 'Coupon expires in the past or very soon' });
    }

    // Usage limit validation
    if (coupon.usageLimit !== undefined && coupon.usageLimit < 0) {
      errors.push({ field: 'usageLimit', message: 'Usage limit cannot be negative' });
    }

    // Priority validation
    if (coupon.priority !== undefined && (coupon.priority < 0 || coupon.priority > 10)) {
      warnings.push({ field: 'priority', message: 'Priority should be between 0 and 10' });
    }

    // URL validation
    if (coupon.affiliateLink && !this.isValidUrl(coupon.affiliateLink)) {
      errors.push({ field: 'affiliateLink', message: 'Invalid affiliate link URL' });
    }

    if (coupon.imageUrl && !this.isValidUrl(coupon.imageUrl)) {
      errors.push({ field: 'imageUrl', message: 'Invalid image URL' });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get available coupon templates
   */
  async getCouponTemplates(): Promise<CouponTemplate[]> {
    try {
      // For now, return predefined templates
      // In the future, this could be stored in database
      return [
        {
          id: 'percentage-discount',
          name: 'Percentage Discount',
          description: 'Standard percentage discount coupon',
          template: {
            discountType: 'percentage',
            usageLimit: 1000,
            priority: 5,
            isExclusive: false,
            isFeatured: false,
            status: 'pending'
          },
          isDefault: true,
          createdBy: 'system',
          createdAt: new Date()
        },
        {
          id: 'fixed-discount',
          name: 'Fixed Amount Discount',
          description: 'Fixed amount discount coupon',
          template: {
            discountType: 'fixed',
            usageLimit: 500,
            priority: 5,
            isExclusive: false,
            isFeatured: false,
            status: 'pending'
          },
          isDefault: false,
          createdBy: 'system',
          createdAt: new Date()
        },
        {
          id: 'free-shipping',
          name: 'Free Shipping',
          description: 'Free shipping offer',
          template: {
            discountType: 'freeShipping',
            discount: 0,
            usageLimit: 2000,
            priority: 3,
            isExclusive: false,
            isFeatured: false,
            status: 'pending'
          },
          isDefault: false,
          createdBy: 'system',
          createdAt: new Date()
        }
      ];
    } catch (error) {
      this.logger.error('Error getting coupon templates:', error);
      throw new Error('Failed to retrieve coupon templates');
    }
  }

  /**
   * Duplicate coupon
   */
  async duplicateCoupon(id: string, createdBy: string): Promise<Coupon> {
    try {
      this.logger.info('Duplicating coupon:', id);

      const originalCoupon = await this.repository.getCouponById(id);
      if (!originalCoupon) {
        throw new Error('Original coupon not found');
      }

      // Create duplicate with modified fields
      const duplicateData = {
        ...originalCoupon,
        title: `${originalCoupon.title} (Copy)`,
        code: `${originalCoupon.code}_COPY_${Date.now()}`,
        status: 'pending' as const,
        createdBy,
        usedCount: 0,
        clickCount: 0,
        conversionCount: 0,
        revenue: 0,
        moderatedBy: undefined,
        moderatedAt: undefined,
        moderationNotes: undefined
      };

      // Remove fields that shouldn't be copied
      delete (duplicateData as any).id;
      delete (duplicateData as any).createdAt;
      delete (duplicateData as any).updatedAt;

      const result = await this.repository.createCoupon(duplicateData);
      this.logger.info('Coupon duplicated successfully:', result.id);
      return result;
    } catch (error) {
      this.logger.error('Error duplicating coupon:', error);
      throw error;
    }
  }

  /**
   * Get coupon performance metrics
   */
  async getCouponPerformance(id: string): Promise<{
    coupon: Coupon;
    metrics: {
      clickThroughRate: number;
      conversionRate: number;
      revenuePerClick: number;
      averageOrderValue: number;
      totalRevenue: number;
    };
  }> {
    try {
      this.logger.info('Getting coupon performance:', id);

      const coupon = await this.repository.getCouponById(id);
      if (!coupon) {
        throw new Error('Coupon not found');
      }

      const clickThroughRate = coupon.usedCount > 0 ? (coupon.clickCount / coupon.usedCount) * 100 : 0;
      const conversionRate = coupon.clickCount > 0 ? (coupon.conversionCount / coupon.clickCount) * 100 : 0;
      const revenuePerClick = coupon.clickCount > 0 ? coupon.revenue / coupon.clickCount : 0;
      const averageOrderValue = coupon.conversionCount > 0 ? coupon.revenue / coupon.conversionCount : 0;

      return {
        coupon,
        metrics: {
          clickThroughRate,
          conversionRate,
          revenuePerClick,
          averageOrderValue,
          totalRevenue: coupon.revenue
        }
      };
    } catch (error) {
      this.logger.error('Error getting coupon performance:', error);
      throw error;
    }
  }

  /**
   * Search coupons by text
   */
  async searchCoupons(query: string, limit: number = 20): Promise<Coupon[]> {
    try {
      this.logger.info('Searching coupons:', query);

      const filter: CouponFilter = {
        search: query,
        limit,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      };

      const result = await this.repository.getCoupons(filter);
      return result.coupons;
    } catch (error) {
      this.logger.error('Error searching coupons:', error);
      throw error;
    }
  }

  /**
   * Get coupons by store
   */
  async getCouponsByStore(store: string, limit: number = 50): Promise<Coupon[]> {
    try {
      this.logger.info('Getting coupons by store:', store);

      const filter: CouponFilter = {
        store: [store],
        limit,
        sortBy: 'priority',
        sortOrder: 'desc'
      };

      const result = await this.repository.getCoupons(filter);
      return result.coupons;
    } catch (error) {
      this.logger.error('Error getting coupons by store:', error);
      throw error;
    }
  }

  /**
   * Get coupons by category
   */
  async getCouponsByCategory(category: string, limit: number = 50): Promise<Coupon[]> {
    try {
      this.logger.info('Getting coupons by category:', category);

      const filter: CouponFilter = {
        category: [category],
        limit,
        sortBy: 'priority',
        sortOrder: 'desc'
      };

      const result = await this.repository.getCoupons(filter);
      return result.coupons;
    } catch (error) {
      this.logger.error('Error getting coupons by category:', error);
      throw error;
    }
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}
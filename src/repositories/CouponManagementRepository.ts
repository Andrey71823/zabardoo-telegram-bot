import { BaseRepository } from './base/BaseRepository';
import { 
  Coupon, 
  CouponFilter, 
  CouponStats, 
  BulkOperation, 
  ModerationAction,
  CouponTemplate,
  CouponImport,
  CouponExport
} from '../models/CouponManagement';

export class CouponManagementRepository extends BaseRepository {
  
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
      const page = filter.page || 1;
      const limit = filter.limit || 20;
      const offset = (page - 1) * limit;

      let whereConditions: string[] = [];
      let params: any[] = [];
      let paramIndex = 1;

      // Build WHERE conditions
      if (filter.status && filter.status.length > 0) {
        whereConditions.push(`status = ANY($${paramIndex})`);
        params.push(filter.status);
        paramIndex++;
      }

      if (filter.store && filter.store.length > 0) {
        whereConditions.push(`store = ANY($${paramIndex})`);
        params.push(filter.store);
        paramIndex++;
      }

      if (filter.category && filter.category.length > 0) {
        whereConditions.push(`category = ANY($${paramIndex})`);
        params.push(filter.category);
        paramIndex++;
      }

      if (filter.dateFrom) {
        whereConditions.push(`created_at >= $${paramIndex}`);
        params.push(filter.dateFrom);
        paramIndex++;
      }

      if (filter.dateTo) {
        whereConditions.push(`created_at <= $${paramIndex}`);
        params.push(filter.dateTo);
        paramIndex++;
      }

      if (filter.createdBy) {
        whereConditions.push(`created_by = $${paramIndex}`);
        params.push(filter.createdBy);
        paramIndex++;
      }

      if (filter.source && filter.source.length > 0) {
        whereConditions.push(`source = ANY($${paramIndex})`);
        params.push(filter.source);
        paramIndex++;
      }

      if (filter.isExclusive !== undefined) {
        whereConditions.push(`is_exclusive = $${paramIndex}`);
        params.push(filter.isExclusive);
        paramIndex++;
      }

      if (filter.isFeatured !== undefined) {
        whereConditions.push(`is_featured = $${paramIndex}`);
        params.push(filter.isFeatured);
        paramIndex++;
      }

      if (filter.search) {
        whereConditions.push(`(title ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR code ILIKE $${paramIndex})`);
        params.push(`%${filter.search}%`);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Build ORDER BY clause
      const sortBy = filter.sortBy || 'created_at';
      const sortOrder = filter.sortOrder || 'desc';
      const orderClause = `ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM coupons
        ${whereClause}
      `;

      const countResult = await this.db.query(countQuery, params);
      const total = parseInt(countResult.rows[0].total);

      // Get coupons
      const query = `
        SELECT 
          id, title, description, code, discount, discount_type,
          store, store_id, category, valid_from, valid_to,
          usage_limit, used_count, status, priority, tags,
          affiliate_link, image_url, terms_and_conditions,
          created_by, created_at, updated_at, moderated_by,
          moderated_at, moderation_notes, source, is_exclusive,
          is_featured, click_count, conversion_count, revenue
        FROM coupons
        ${whereClause}
        ${orderClause}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      params.push(limit, offset);
      const result = await this.db.query(query, params);

      const coupons = result.rows.map(row => ({
        id: row.id,
        title: row.title,
        description: row.description,
        code: row.code,
        discount: row.discount,
        discountType: row.discount_type,
        store: row.store,
        storeId: row.store_id,
        category: row.category,
        validFrom: row.valid_from,
        validTo: row.valid_to,
        usageLimit: row.usage_limit,
        usedCount: row.used_count,
        status: row.status,
        priority: row.priority,
        tags: row.tags || [],
        affiliateLink: row.affiliate_link,
        imageUrl: row.image_url,
        termsAndConditions: row.terms_and_conditions,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        moderatedBy: row.moderated_by,
        moderatedAt: row.moderated_at,
        moderationNotes: row.moderation_notes,
        source: row.source,
        isExclusive: row.is_exclusive,
        isFeatured: row.is_featured,
        clickCount: row.click_count,
        conversionCount: row.conversion_count,
        revenue: row.revenue
      }));

      const totalPages = Math.ceil(total / limit);

      return {
        coupons,
        total,
        page,
        totalPages
      };
    } catch (error) {
      this.logger.error('Error getting coupons:', error);
      throw error;
    }
  }

  /**
   * Get coupon by ID
   */
  async getCouponById(id: string): Promise<Coupon | null> {
    try {
      const query = `
        SELECT 
          id, title, description, code, discount, discount_type,
          store, store_id, category, valid_from, valid_to,
          usage_limit, used_count, status, priority, tags,
          affiliate_link, image_url, terms_and_conditions,
          created_by, created_at, updated_at, moderated_by,
          moderated_at, moderation_notes, source, is_exclusive,
          is_featured, click_count, conversion_count, revenue
        FROM coupons
        WHERE id = $1
      `;

      const result = await this.db.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        title: row.title,
        description: row.description,
        code: row.code,
        discount: row.discount,
        discountType: row.discount_type,
        store: row.store,
        storeId: row.store_id,
        category: row.category,
        validFrom: row.valid_from,
        validTo: row.valid_to,
        usageLimit: row.usage_limit,
        usedCount: row.used_count,
        status: row.status,
        priority: row.priority,
        tags: row.tags || [],
        affiliateLink: row.affiliate_link,
        imageUrl: row.image_url,
        termsAndConditions: row.terms_and_conditions,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        moderatedBy: row.moderated_by,
        moderatedAt: row.moderated_at,
        moderationNotes: row.moderation_notes,
        source: row.source,
        isExclusive: row.is_exclusive,
        isFeatured: row.is_featured,
        clickCount: row.click_count,
        conversionCount: row.conversion_count,
        revenue: row.revenue
      };
    } catch (error) {
      this.logger.error('Error getting coupon by ID:', error);
      throw error;
    }
  }

  /**
   * Create new coupon
   */
  async createCoupon(coupon: Omit<Coupon, 'id' | 'createdAt' | 'updatedAt'>): Promise<Coupon> {
    try {
      const id = this.generateId();
      const now = new Date();

      const query = `
        INSERT INTO coupons (
          id, title, description, code, discount, discount_type,
          store, store_id, category, valid_from, valid_to,
          usage_limit, used_count, status, priority, tags,
          affiliate_link, image_url, terms_and_conditions,
          created_by, created_at, updated_at, source, is_exclusive,
          is_featured, click_count, conversion_count, revenue
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
          $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28
        ) RETURNING *
      `;

      const values = [
        id, coupon.title, coupon.description, coupon.code, coupon.discount,
        coupon.discountType, coupon.store, coupon.storeId, coupon.category,
        coupon.validFrom, coupon.validTo, coupon.usageLimit, coupon.usedCount,
        coupon.status, coupon.priority, coupon.tags, coupon.affiliateLink,
        coupon.imageUrl, coupon.termsAndConditions, coupon.createdBy, now, now,
        coupon.source, coupon.isExclusive, coupon.isFeatured, coupon.clickCount,
        coupon.conversionCount, coupon.revenue
      ];

      const result = await this.db.query(query, values);
      const row = result.rows[0];

      return {
        id: row.id,
        title: row.title,
        description: row.description,
        code: row.code,
        discount: row.discount,
        discountType: row.discount_type,
        store: row.store,
        storeId: row.store_id,
        category: row.category,
        validFrom: row.valid_from,
        validTo: row.valid_to,
        usageLimit: row.usage_limit,
        usedCount: row.used_count,
        status: row.status,
        priority: row.priority,
        tags: row.tags || [],
        affiliateLink: row.affiliate_link,
        imageUrl: row.image_url,
        termsAndConditions: row.terms_and_conditions,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        moderatedBy: row.moderated_by,
        moderatedAt: row.moderated_at,
        moderationNotes: row.moderation_notes,
        source: row.source,
        isExclusive: row.is_exclusive,
        isFeatured: row.is_featured,
        clickCount: row.click_count,
        conversionCount: row.conversion_count,
        revenue: row.revenue
      };
    } catch (error) {
      this.logger.error('Error creating coupon:', error);
      throw error;
    }
  }

  /**
   * Update coupon
   */
  async updateCoupon(id: string, updates: Partial<Coupon>): Promise<Coupon | null> {
    try {
      const setClause: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      // Build SET clause dynamically
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined && key !== 'id' && key !== 'createdAt') {
          const dbField = this.camelToSnake(key);
          setClause.push(`${dbField} = $${paramIndex}`);
          params.push(value);
          paramIndex++;
        }
      });

      if (setClause.length === 0) {
        return await this.getCouponById(id);
      }

      setClause.push(`updated_at = $${paramIndex}`);
      params.push(new Date());
      paramIndex++;

      params.push(id);

      const query = `
        UPDATE coupons 
        SET ${setClause.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await this.db.query(query, params);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        title: row.title,
        description: row.description,
        code: row.code,
        discount: row.discount,
        discountType: row.discount_type,
        store: row.store,
        storeId: row.store_id,
        category: row.category,
        validFrom: row.valid_from,
        validTo: row.valid_to,
        usageLimit: row.usage_limit,
        usedCount: row.used_count,
        status: row.status,
        priority: row.priority,
        tags: row.tags || [],
        affiliateLink: row.affiliate_link,
        imageUrl: row.image_url,
        termsAndConditions: row.terms_and_conditions,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        moderatedBy: row.moderated_by,
        moderatedAt: row.moderated_at,
        moderationNotes: row.moderation_notes,
        source: row.source,
        isExclusive: row.is_exclusive,
        isFeatured: row.is_featured,
        clickCount: row.click_count,
        conversionCount: row.conversion_count,
        revenue: row.revenue
      };
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
      const query = 'DELETE FROM coupons WHERE id = $1';
      const result = await this.db.query(query, [id]);
      return result.rowCount > 0;
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
      let whereConditions: string[] = [];
      let params: any[] = [];
      let paramIndex = 1;

      // Apply filters if provided
      if (filter?.dateFrom) {
        whereConditions.push(`created_at >= $${paramIndex}`);
        params.push(filter.dateFrom);
        paramIndex++;
      }

      if (filter?.dateTo) {
        whereConditions.push(`created_at <= $${paramIndex}`);
        params.push(filter.dateTo);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get basic stats
      const statsQuery = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
          COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive,
          COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
          COALESCE(SUM(click_count), 0) as total_clicks,
          COALESCE(SUM(conversion_count), 0) as total_conversions,
          COALESCE(SUM(revenue), 0) as total_revenue,
          COALESCE(AVG(discount), 0) as average_discount
        FROM coupons
        ${whereClause}
      `;

      const statsResult = await this.db.query(statsQuery, params);
      const stats = statsResult.rows[0];

      // Get top stores
      const storesQuery = `
        SELECT 
          store,
          COUNT(*) as count,
          COALESCE(SUM(revenue), 0) as revenue
        FROM coupons
        ${whereClause}
        GROUP BY store
        ORDER BY revenue DESC
        LIMIT 10
      `;

      const storesResult = await this.db.query(storesQuery, params);
      const topStores = storesResult.rows.map(row => ({
        store: row.store,
        count: parseInt(row.count),
        revenue: parseFloat(row.revenue)
      }));

      // Get top categories
      const categoriesQuery = `
        SELECT 
          category,
          COUNT(*) as count,
          COALESCE(SUM(revenue), 0) as revenue
        FROM coupons
        ${whereClause}
        GROUP BY category
        ORDER BY revenue DESC
        LIMIT 10
      `;

      const categoriesResult = await this.db.query(categoriesQuery, params);
      const topCategories = categoriesResult.rows.map(row => ({
        category: row.category,
        count: parseInt(row.count),
        revenue: parseFloat(row.revenue)
      }));

      const totalClicks = parseInt(stats.total_clicks);
      const totalConversions = parseInt(stats.total_conversions);
      const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

      return {
        total: parseInt(stats.total),
        active: parseInt(stats.active),
        inactive: parseInt(stats.inactive),
        expired: parseInt(stats.expired),
        pending: parseInt(stats.pending),
        rejected: parseInt(stats.rejected),
        totalClicks,
        totalConversions,
        totalRevenue: parseFloat(stats.total_revenue),
        conversionRate,
        averageDiscount: parseFloat(stats.average_discount),
        topStores,
        topCategories
      };
    } catch (error) {
      this.logger.error('Error getting coupon stats:', error);
      throw error;
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
      const results = {
        success: 0,
        failed: 0,
        errors: [] as Array<{ id: string; error: string }>
      };

      for (const couponId of operation.couponIds) {
        try {
          switch (operation.operation) {
            case 'activate':
              await this.updateCoupon(couponId, { status: 'active' });
              break;
            case 'deactivate':
              await this.updateCoupon(couponId, { status: 'inactive' });
              break;
            case 'delete':
              await this.deleteCoupon(couponId);
              break;
            case 'updateCategory':
              if (operation.parameters?.category) {
                await this.updateCoupon(couponId, { category: operation.parameters.category });
              }
              break;
            case 'updatePriority':
              if (operation.parameters?.priority !== undefined) {
                await this.updateCoupon(couponId, { priority: operation.parameters.priority });
              }
              break;
            case 'feature':
              await this.updateCoupon(couponId, { isFeatured: true });
              break;
            case 'unfeature':
              await this.updateCoupon(couponId, { isFeatured: false });
              break;
          }
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            id: couponId,
            error: error.message
          });
        }
      }

      return results;
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
      const query = `
        SELECT 
          id, title, description, code, discount, discount_type,
          store, store_id, category, valid_from, valid_to,
          usage_limit, used_count, status, priority, tags,
          affiliate_link, image_url, terms_and_conditions,
          created_by, created_at, updated_at, source, is_exclusive,
          is_featured, click_count, conversion_count, revenue
        FROM coupons
        WHERE status = 'pending'
        ORDER BY created_at ASC
      `;

      const result = await this.db.query(query);

      return result.rows.map(row => ({
        id: row.id,
        title: row.title,
        description: row.description,
        code: row.code,
        discount: row.discount,
        discountType: row.discount_type,
        store: row.store,
        storeId: row.store_id,
        category: row.category,
        validFrom: row.valid_from,
        validTo: row.valid_to,
        usageLimit: row.usage_limit,
        usedCount: row.used_count,
        status: row.status,
        priority: row.priority,
        tags: row.tags || [],
        affiliateLink: row.affiliate_link,
        imageUrl: row.image_url,
        termsAndConditions: row.terms_and_conditions,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        moderatedBy: row.moderated_by,
        moderatedAt: row.moderated_at,
        moderationNotes: row.moderation_notes,
        source: row.source,
        isExclusive: row.is_exclusive,
        isFeatured: row.is_featured,
        clickCount: row.click_count,
        conversionCount: row.conversion_count,
        revenue: row.revenue
      }));
    } catch (error) {
      this.logger.error('Error getting pending moderation coupons:', error);
      throw error;
    }
  }

  /**
   * Moderate coupon
   */
  async moderateCoupon(action: ModerationAction): Promise<Coupon | null> {
    try {
      const updates: Partial<Coupon> = {
        moderatedBy: action.moderatorId,
        moderatedAt: new Date(),
        moderationNotes: action.notes,
        ...action.changes
      };

      switch (action.action) {
        case 'approve':
          updates.status = 'active';
          break;
        case 'reject':
          updates.status = 'rejected';
          break;
        case 'requestChanges':
          updates.status = 'pending';
          break;
      }

      return await this.updateCoupon(action.couponId, updates);
    } catch (error) {
      this.logger.error('Error moderating coupon:', error);
      throw error;
    }
  }

  // Helper method to convert camelCase to snake_case
  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}
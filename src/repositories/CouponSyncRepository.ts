import { Pool } from 'pg';
import { CouponSync, CouponSyncStatus, SyncConfiguration, WebsiteCoupon } from '../models/CouponSync';
import { BaseRepository } from './base/BaseRepository';

export class CouponSyncRepository extends BaseRepository {
  constructor(pool: Pool) {
    super(pool);
  }

  // Coupon CRUD operations
  async createCoupon(coupon: Omit<CouponSync, 'id' | 'createdAt' | 'updatedAt'>): Promise<CouponSync> {
    const query = `
      INSERT INTO coupon_sync (
        external_id, title, description, code, discount, discount_type, discount_value,
        store, store_id, category, category_id, image_url, affiliate_url, original_url,
        start_date, end_date, is_active, is_verified, popularity, success_rate,
        tags, conditions, min_order_value, max_discount, usage_limit, used_count,
        source, last_sync_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28
      ) RETURNING *
    `;

    const values = [
      coupon.externalId, coupon.title, coupon.description, coupon.code,
      coupon.discount, coupon.discountType, coupon.discountValue,
      coupon.store, coupon.storeId, coupon.category, coupon.categoryId,
      coupon.imageUrl, coupon.affiliateUrl, coupon.originalUrl,
      coupon.startDate, coupon.endDate, coupon.isActive, coupon.isVerified,
      coupon.popularity, coupon.successRate, JSON.stringify(coupon.tags),
      coupon.conditions, coupon.minOrderValue, coupon.maxDiscount,
      coupon.usageLimit, coupon.usedCount, coupon.source, coupon.lastSyncAt
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToCoupon(result.rows[0]);
  }

  async updateCoupon(id: string, updates: Partial<CouponSync>): Promise<CouponSync | null> {
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        const dbColumn = this.camelToSnake(key);
        if (key === 'tags') {
          setClause.push(`${dbColumn} = $${paramIndex}`);
          values.push(JSON.stringify(value));
        } else {
          setClause.push(`${dbColumn} = $${paramIndex}`);
          values.push(value);
        }
        paramIndex++;
      }
    }

    if (setClause.length === 0) return null;

    setClause.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE coupon_sync 
      SET ${setClause.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return result.rows.length > 0 ? this.mapRowToCoupon(result.rows[0]) : null;
  }

  async getCouponByExternalId(externalId: string): Promise<CouponSync | null> {
    const query = 'SELECT * FROM coupon_sync WHERE external_id = $1';
    const result = await this.pool.query(query, [externalId]);
    return result.rows.length > 0 ? this.mapRowToCoupon(result.rows[0]) : null;
  }

  async getCouponById(id: string): Promise<CouponSync | null> {
    const query = 'SELECT * FROM coupon_sync WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rows.length > 0 ? this.mapRowToCoupon(result.rows[0]) : null;
  }

  async getActiveCoupons(limit: number = 100, offset: number = 0): Promise<CouponSync[]> {
    const query = `
      SELECT * FROM coupon_sync 
      WHERE is_active = true AND end_date > NOW()
      ORDER BY popularity DESC, created_at DESC
      LIMIT $1 OFFSET $2
    `;
    const result = await this.pool.query(query, [limit, offset]);
    return result.rows.map(row => this.mapRowToCoupon(row));
  }

  async getCouponsByStore(storeId: string, limit: number = 50): Promise<CouponSync[]> {
    const query = `
      SELECT * FROM coupon_sync 
      WHERE store_id = $1 AND is_active = true AND end_date > NOW()
      ORDER BY popularity DESC, created_at DESC
      LIMIT $2
    `;
    const result = await this.pool.query(query, [storeId, limit]);
    return result.rows.map(row => this.mapRowToCoupon(row));
  }

  async getCouponsByCategory(categoryId: string, limit: number = 50): Promise<CouponSync[]> {
    const query = `
      SELECT * FROM coupon_sync 
      WHERE category_id = $1 AND is_active = true AND end_date > NOW()
      ORDER BY popularity DESC, created_at DESC
      LIMIT $2
    `;
    const result = await this.pool.query(query, [categoryId, limit]);
    return result.rows.map(row => this.mapRowToCoupon(row));
  }

  // Sync Status operations
  async createSyncStatus(status: Omit<CouponSyncStatus, 'id' | 'createdAt' | 'updatedAt'>): Promise<CouponSyncStatus> {
    const query = `
      INSERT INTO coupon_sync_status (
        coupon_id, sync_type, status, error_message, attempts, max_attempts, next_retry_at, synced_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      status.couponId, status.syncType, status.status, status.errorMessage,
      status.attempts, status.maxAttempts, status.nextRetryAt, status.syncedAt
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToSyncStatus(result.rows[0]);
  }

  async updateSyncStatus(id: string, updates: Partial<CouponSyncStatus>): Promise<CouponSyncStatus | null> {
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        const dbColumn = this.camelToSnake(key);
        setClause.push(`${dbColumn} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (setClause.length === 0) return null;

    setClause.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE coupon_sync_status 
      SET ${setClause.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return result.rows.length > 0 ? this.mapRowToSyncStatus(result.rows[0]) : null;
  }

  async getPendingSyncTasks(limit: number = 50): Promise<CouponSyncStatus[]> {
    const query = `
      SELECT * FROM coupon_sync_status 
      WHERE status IN ('pending', 'failed') 
        AND (next_retry_at IS NULL OR next_retry_at <= NOW())
        AND attempts < max_attempts
      ORDER BY created_at ASC
      LIMIT $1
    `;
    const result = await this.pool.query(query, [limit]);
    return result.rows.map(row => this.mapRowToSyncStatus(row));
  }

  // Sync Configuration operations
  async createSyncConfig(config: Omit<SyncConfiguration, 'id' | 'createdAt' | 'updatedAt'>): Promise<SyncConfiguration> {
    const query = `
      INSERT INTO sync_configuration (
        name, endpoint, api_key, sync_interval, is_enabled, last_sync_at, next_sync_at, sync_filters
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      config.name, config.endpoint, config.apiKey, config.syncInterval,
      config.isEnabled, config.lastSyncAt, config.nextSyncAt, JSON.stringify(config.syncFilters)
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToSyncConfig(result.rows[0]);
  }

  async getActiveSyncConfigs(): Promise<SyncConfiguration[]> {
    const query = `
      SELECT * FROM sync_configuration 
      WHERE is_enabled = true AND (next_sync_at IS NULL OR next_sync_at <= NOW())
      ORDER BY next_sync_at ASC
    `;
    const result = await this.pool.query(query);
    return result.rows.map(row => this.mapRowToSyncConfig(row));
  }

  async updateSyncConfig(id: string, updates: Partial<SyncConfiguration>): Promise<SyncConfiguration | null> {
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        const dbColumn = this.camelToSnake(key);
        if (key === 'syncFilters') {
          setClause.push(`${dbColumn} = $${paramIndex}`);
          values.push(JSON.stringify(value));
        } else {
          setClause.push(`${dbColumn} = $${paramIndex}`);
          values.push(value);
        }
        paramIndex++;
      }
    }

    if (setClause.length === 0) return null;

    setClause.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE sync_configuration 
      SET ${setClause.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return result.rows.length > 0 ? this.mapRowToSyncConfig(result.rows[0]) : null;
  }

  // Helper methods
  private mapRowToCoupon(row: any): CouponSync {
    return {
      id: row.id,
      externalId: row.external_id,
      title: row.title,
      description: row.description,
      code: row.code,
      discount: row.discount,
      discountType: row.discount_type,
      discountValue: row.discount_value,
      store: row.store,
      storeId: row.store_id,
      category: row.category,
      categoryId: row.category_id,
      imageUrl: row.image_url,
      affiliateUrl: row.affiliate_url,
      originalUrl: row.original_url,
      startDate: row.start_date,
      endDate: row.end_date,
      isActive: row.is_active,
      isVerified: row.is_verified,
      popularity: row.popularity,
      successRate: row.success_rate,
      tags: JSON.parse(row.tags || '[]'),
      conditions: row.conditions,
      minOrderValue: row.min_order_value,
      maxDiscount: row.max_discount,
      usageLimit: row.usage_limit,
      usedCount: row.used_count,
      source: row.source,
      lastSyncAt: row.last_sync_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapRowToSyncStatus(row: any): CouponSyncStatus {
    return {
      id: row.id,
      couponId: row.coupon_id,
      syncType: row.sync_type,
      status: row.status,
      errorMessage: row.error_message,
      attempts: row.attempts,
      maxAttempts: row.max_attempts,
      nextRetryAt: row.next_retry_at,
      syncedAt: row.synced_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapRowToSyncConfig(row: any): SyncConfiguration {
    return {
      id: row.id,
      name: row.name,
      endpoint: row.endpoint,
      apiKey: row.api_key,
      syncInterval: row.sync_interval,
      isEnabled: row.is_enabled,
      lastSyncAt: row.last_sync_at,
      nextSyncAt: row.next_sync_at,
      syncFilters: JSON.parse(row.sync_filters || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}
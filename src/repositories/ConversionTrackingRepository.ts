import { Pool } from 'pg';
import { ConversionPixel, ConversionRule, ConversionWebhook, ConversionFraud, ConversionAttribution, ConversionCohort, ConversionSegment } from '../models/ConversionTracking';
import { BaseRepository } from './base/BaseRepository';

export class ConversionTrackingRepository extends BaseRepository {
  constructor(pool: Pool) {
    super(pool);
  }

  // Conversion Pixel operations
  async createConversionPixel(pixel: Omit<ConversionPixel, 'id' | 'createdAt' | 'updatedAt'>): Promise<ConversionPixel> {
    const query = `
      INSERT INTO conversion_pixels (
        store_id, store_name, pixel_type, pixel_id, is_active, tracking_code,
        conversion_events, custom_parameters, test_mode
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      pixel.storeId, pixel.storeName, pixel.pixelType, pixel.pixelId, pixel.isActive,
      pixel.trackingCode, JSON.stringify(pixel.conversionEvents),
      JSON.stringify(pixel.customParameters), pixel.testMode
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToConversionPixel(result.rows[0]);
  }

  async getConversionPixelsByStore(storeId: string): Promise<ConversionPixel[]> {
    const query = 'SELECT * FROM conversion_pixels WHERE store_id = $1 AND is_active = true';
    const result = await this.pool.query(query, [storeId]);
    return result.rows.map(row => this.mapRowToConversionPixel(row));
  }

  async updateConversionPixel(id: string, updates: Partial<ConversionPixel>): Promise<ConversionPixel | null> {
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        const dbColumn = this.camelToSnake(key);
        if (['conversionEvents', 'customParameters'].includes(key)) {
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
      UPDATE conversion_pixels 
      SET ${setClause.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return result.rows.length > 0 ? this.mapRowToConversionPixel(result.rows[0]) : null;
  }

  // Conversion Rule operations
  async createConversionRule(rule: Omit<ConversionRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<ConversionRule> {
    const query = `
      INSERT INTO conversion_rules (
        name, description, store_id, category, conditions, actions, priority,
        is_active, valid_from, valid_to, usage_limit, usage_count, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const values = [
      rule.name, rule.description, rule.storeId, rule.category,
      JSON.stringify(rule.conditions), JSON.stringify(rule.actions), rule.priority,
      rule.isActive, rule.validFrom, rule.validTo, rule.usageLimit,
      rule.usageCount, JSON.stringify(rule.metadata)
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToConversionRule(result.rows[0]);
  }

  async getActiveConversionRules(storeId?: string, category?: string): Promise<ConversionRule[]> {
    let query = `
      SELECT * FROM conversion_rules 
      WHERE is_active = true 
        AND (valid_from IS NULL OR valid_from <= NOW())
        AND (valid_to IS NULL OR valid_to >= NOW())
        AND (usage_limit IS NULL OR usage_count < usage_limit)
    `;
    const values = [];
    let paramIndex = 1;

    if (storeId) {
      query += ` AND (store_id IS NULL OR store_id = $${paramIndex})`;
      values.push(storeId);
      paramIndex++;
    }

    if (category) {
      query += ` AND (category IS NULL OR category = $${paramIndex})`;
      values.push(category);
      paramIndex++;
    }

    query += ' ORDER BY priority ASC';

    const result = await this.pool.query(query, values);
    return result.rows.map(row => this.mapRowToConversionRule(row));
  }

  async incrementRuleUsage(ruleId: string): Promise<void> {
    const query = `
      UPDATE conversion_rules 
      SET usage_count = usage_count + 1, updated_at = NOW()
      WHERE id = $1
    `;
    await this.pool.query(query, [ruleId]);
  }

  // Conversion Webhook operations
  async createConversionWebhook(webhook: Omit<ConversionWebhook, 'id' | 'createdAt' | 'updatedAt'>): Promise<ConversionWebhook> {
    const query = `
      INSERT INTO conversion_webhooks (
        name, url, method, headers, payload, events, retry_attempts,
        timeout, is_active, success_count, error_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const values = [
      webhook.name, webhook.url, webhook.method, JSON.stringify(webhook.headers),
      JSON.stringify(webhook.payload), JSON.stringify(webhook.events),
      webhook.retryAttempts, webhook.timeout, webhook.isActive,
      webhook.successCount, webhook.errorCount
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToConversionWebhook(result.rows[0]);
  }

  async getActiveWebhooksForEvent(event: string): Promise<ConversionWebhook[]> {
    const query = `
      SELECT * FROM conversion_webhooks 
      WHERE is_active = true AND events @> $1
      ORDER BY name
    `;
    const result = await this.pool.query(query, [JSON.stringify([event])]);
    return result.rows.map(row => this.mapRowToConversionWebhook(row));
  }

  async updateWebhookStats(webhookId: string, success: boolean): Promise<void> {
    const query = success
      ? `UPDATE conversion_webhooks SET success_count = success_count + 1, last_triggered = NOW(), updated_at = NOW() WHERE id = $1`
      : `UPDATE conversion_webhooks SET error_count = error_count + 1, last_triggered = NOW(), updated_at = NOW() WHERE id = $1`;
    
    await this.pool.query(query, [webhookId]);
  }

  // Conversion Fraud operations
  async createConversionFraud(fraud: Omit<ConversionFraud, 'id' | 'createdAt' | 'updatedAt'>): Promise<ConversionFraud> {
    const query = `
      INSERT INTO conversion_fraud (
        conversion_id, click_id, user_id, fraud_type, risk_score, fraud_indicators,
        detection_method, status, reviewed_by, reviewed_at, notes, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const values = [
      fraud.conversionId, fraud.clickId, fraud.userId, fraud.fraudType,
      fraud.riskScore, JSON.stringify(fraud.fraudIndicators), fraud.detectionMethod,
      fraud.status, fraud.reviewedBy, fraud.reviewedAt, fraud.notes,
      JSON.stringify(fraud.metadata)
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToConversionFraud(result.rows[0]);
  }

  async getFraudCasesByStatus(status: string, limit: number = 50): Promise<ConversionFraud[]> {
    const query = `
      SELECT * FROM conversion_fraud 
      WHERE status = $1 
      ORDER BY created_at DESC 
      LIMIT $2
    `;
    const result = await this.pool.query(query, [status, limit]);
    return result.rows.map(row => this.mapRowToConversionFraud(row));
  }

  async updateFraudStatus(fraudId: string, status: string, reviewedBy?: string, notes?: string): Promise<void> {
    const query = `
      UPDATE conversion_fraud 
      SET status = $1, reviewed_by = $2, reviewed_at = NOW(), notes = $3, updated_at = NOW()
      WHERE id = $4
    `;
    await this.pool.query(query, [status, reviewedBy, notes, fraudId]);
  }

  // Analytics queries
  async getConversionStats(startDate: Date, endDate: Date, storeId?: string): Promise<any> {
    let query = `
      SELECT 
        COUNT(*) as total_conversions,
        COUNT(DISTINCT user_id) as unique_converters,
        SUM(order_value) as total_revenue,
        AVG(order_value) as average_order_value,
        SUM(commission) as total_commission,
        AVG(commission_rate) as average_commission_rate,
        COUNT(CASE WHEN processing_status = 'confirmed' THEN 1 END) as confirmed_conversions,
        COUNT(CASE WHEN processing_status = 'cancelled' THEN 1 END) as cancelled_conversions,
        COUNT(CASE WHEN processing_status = 'refunded' THEN 1 END) as refunded_conversions
      FROM conversion_events 
      WHERE conversion_time BETWEEN $1 AND $2
    `;
    
    const values = [startDate, endDate];
    
    if (storeId) {
      query += ' AND store_id = $3';
      values.push(storeId);
    }

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async getConversionsBySource(startDate: Date, endDate: Date): Promise<any[]> {
    const query = `
      SELECT 
        ce.source,
        COUNT(conv.id) as conversions,
        COUNT(DISTINCT conv.user_id) as unique_converters,
        SUM(conv.order_value) as total_revenue,
        AVG(conv.order_value) as average_order_value,
        SUM(conv.commission) as total_commission
      FROM click_events ce
      JOIN conversion_events conv ON ce.click_id = conv.click_id
      WHERE conv.conversion_time BETWEEN $1 AND $2
      GROUP BY ce.source
      ORDER BY total_revenue DESC
    `;

    const result = await this.pool.query(query, [startDate, endDate]);
    return result.rows;
  }

  async getFraudStats(startDate: Date, endDate: Date): Promise<any> {
    const query = `
      SELECT 
        COUNT(*) as total_fraud_cases,
        COUNT(CASE WHEN status = 'confirmed_fraud' THEN 1 END) as confirmed_fraud,
        COUNT(CASE WHEN status = 'false_positive' THEN 1 END) as false_positives,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_review,
        AVG(risk_score) as average_risk_score,
        fraud_type,
        COUNT(*) as fraud_count
      FROM conversion_fraud 
      WHERE created_at BETWEEN $1 AND $2
      GROUP BY fraud_type
      ORDER BY fraud_count DESC
    `;

    const result = await this.pool.query(query, [startDate, endDate]);
    return result.rows;
  }

  // Helper methods
  private mapRowToConversionPixel(row: any): ConversionPixel {
    return {
      id: row.id,
      storeId: row.store_id,
      storeName: row.store_name,
      pixelType: row.pixel_type,
      pixelId: row.pixel_id,
      isActive: row.is_active,
      trackingCode: row.tracking_code,
      conversionEvents: JSON.parse(row.conversion_events || '[]'),
      customParameters: JSON.parse(row.custom_parameters || '{}'),
      testMode: row.test_mode,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapRowToConversionRule(row: any): ConversionRule {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      storeId: row.store_id,
      category: row.category,
      conditions: JSON.parse(row.conditions || '[]'),
      actions: JSON.parse(row.actions || '[]'),
      priority: row.priority,
      isActive: row.is_active,
      validFrom: row.valid_from,
      validTo: row.valid_to,
      usageLimit: row.usage_limit,
      usageCount: row.usage_count,
      metadata: JSON.parse(row.metadata || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapRowToConversionWebhook(row: any): ConversionWebhook {
    return {
      id: row.id,
      name: row.name,
      url: row.url,
      method: row.method,
      headers: JSON.parse(row.headers || '{}'),
      payload: JSON.parse(row.payload || '{}'),
      events: JSON.parse(row.events || '[]'),
      retryAttempts: row.retry_attempts,
      timeout: row.timeout,
      isActive: row.is_active,
      lastTriggered: row.last_triggered,
      successCount: row.success_count,
      errorCount: row.error_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapRowToConversionFraud(row: any): ConversionFraud {
    return {
      id: row.id,
      conversionId: row.conversion_id,
      clickId: row.click_id,
      userId: row.user_id,
      fraudType: row.fraud_type,
      riskScore: row.risk_score,
      fraudIndicators: JSON.parse(row.fraud_indicators || '[]'),
      detectionMethod: row.detection_method,
      status: row.status,
      reviewedBy: row.reviewed_by,
      reviewedAt: row.reviewed_at,
      notes: row.notes,
      metadata: JSON.parse(row.metadata || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapRowToConversionAttribution(row: any): ConversionAttribution {
    return {
      id: row.id,
      conversionId: row.conversion_id,
      userId: row.user_id,
      attributionModel: row.attribution_model,
      touchpoints: JSON.parse(row.touchpoints || '[]'),
      attributionWeights: JSON.parse(row.attribution_weights || '{}'),
      totalWeight: row.total_weight,
      calculatedAt: row.calculated_at,
      metadata: JSON.parse(row.metadata || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapRowToConversionCohort(row: any): ConversionCohort {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      cohortType: row.cohort_type,
      startDate: row.start_date,
      endDate: row.end_date,
      userCount: row.user_count,
      totalConversions: row.total_conversions,
      totalRevenue: row.total_revenue,
      averageOrderValue: row.average_order_value,
      retentionRates: JSON.parse(row.retention_rates || '{}'),
      metadata: JSON.parse(row.metadata || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapRowToConversionSegment(row: any): ConversionSegment {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      segmentType: row.segment_type,
      criteria: JSON.parse(row.criteria || '[]'),
      userCount: row.user_count,
      conversionMetrics: JSON.parse(row.conversion_metrics || '{}'),
      isActive: row.is_active,
      lastCalculated: row.last_calculated,
      metadata: JSON.parse(row.metadata || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}
import { Pool } from 'pg';
import { ClickEvent, ClickSession, TrafficSource, ClickAnalytics, UserJourney, ConversionEvent, TrafficReport } from '../models/TrafficManager';
import { BaseRepository } from './base/BaseRepository';

export class TrafficManagerRepository extends BaseRepository {
  constructor(pool: Pool) {
    super(pool);
  }

  // Click Event operations
  async recordClickEvent(clickEvent: Omit<ClickEvent, 'id' | 'createdAt'>): Promise<ClickEvent> {
    const query = `
      INSERT INTO click_events (
        click_id, user_id, telegram_user_id, session_id, affiliate_link_id, coupon_id,
        store_id, store_name, original_url, destination_url, source, source_details,
        user_agent, ip_address, referrer, device_info, geo_location, utm_params,
        metadata, clicked_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *
    `;

    const values = [
      clickEvent.clickId, clickEvent.userId, clickEvent.telegramUserId, clickEvent.sessionId,
      clickEvent.affiliateLinkId, clickEvent.couponId, clickEvent.storeId, clickEvent.storeName,
      clickEvent.originalUrl, clickEvent.destinationUrl, clickEvent.source,
      JSON.stringify(clickEvent.sourceDetails), clickEvent.userAgent, clickEvent.ipAddress,
      clickEvent.referrer, JSON.stringify(clickEvent.deviceInfo), 
      JSON.stringify(clickEvent.geoLocation), JSON.stringify(clickEvent.utmParams),
      JSON.stringify(clickEvent.metadata), clickEvent.clickedAt
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToClickEvent(result.rows[0]);
  }

  async getClickEventById(id: string): Promise<ClickEvent | null> {
    const query = 'SELECT * FROM click_events WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rows.length > 0 ? this.mapRowToClickEvent(result.rows[0]) : null;
  }

  async getClickEventByClickId(clickId: string): Promise<ClickEvent | null> {
    const query = 'SELECT * FROM click_events WHERE click_id = $1';
    const result = await this.pool.query(query, [clickId]);
    return result.rows.length > 0 ? this.mapRowToClickEvent(result.rows[0]) : null;
  }

  async getClickEventsByUser(userId: string, limit: number = 100): Promise<ClickEvent[]> {
    const query = `
      SELECT * FROM click_events 
      WHERE user_id = $1 
      ORDER BY clicked_at DESC 
      LIMIT $2
    `;
    const result = await this.pool.query(query, [userId, limit]);
    return result.rows.map(row => this.mapRowToClickEvent(row));
  }

  async getClickEventsBySession(sessionId: string): Promise<ClickEvent[]> {
    const query = `
      SELECT * FROM click_events 
      WHERE session_id = $1 
      ORDER BY clicked_at ASC
    `;
    const result = await this.pool.query(query, [sessionId]);
    return result.rows.map(row => this.mapRowToClickEvent(row));
  }

  // Click Session operations
  async createClickSession(session: Omit<ClickSession, 'id' | 'createdAt' | 'updatedAt'>): Promise<ClickSession> {
    const query = `
      INSERT INTO click_sessions (
        session_id, user_id, telegram_user_id, started_at, last_activity_at,
        ended_at, duration, click_count, unique_links_clicked, conversion_count,
        total_revenue, total_commission, device_info, geo_location, is_active, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;

    const values = [
      session.sessionId, session.userId, session.telegramUserId, session.startedAt,
      session.lastActivityAt, session.endedAt, session.duration, session.clickCount,
      session.uniqueLinksClicked, session.conversionCount, session.totalRevenue,
      session.totalCommission, JSON.stringify(session.deviceInfo),
      JSON.stringify(session.geoLocation), session.isActive, JSON.stringify(session.metadata)
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToClickSession(result.rows[0]);
  }

  async updateClickSession(sessionId: string, updates: Partial<ClickSession>): Promise<ClickSession | null> {
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        const dbColumn = this.camelToSnake(key);
        if (['deviceInfo', 'geoLocation', 'metadata'].includes(key)) {
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
    values.push(sessionId);

    const query = `
      UPDATE click_sessions 
      SET ${setClause.join(', ')}
      WHERE session_id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return result.rows.length > 0 ? this.mapRowToClickSession(result.rows[0]) : null;
  }

  async getActiveSession(userId: string): Promise<ClickSession | null> {
    const query = `
      SELECT * FROM click_sessions 
      WHERE user_id = $1 AND is_active = true 
      ORDER BY last_activity_at DESC 
      LIMIT 1
    `;
    const result = await this.pool.query(query, [userId]);
    return result.rows.length > 0 ? this.mapRowToClickSession(result.rows[0]) : null;
  }

  // Traffic Source operations
  async createTrafficSource(source: Omit<TrafficSource, 'id' | 'createdAt' | 'updatedAt'>): Promise<TrafficSource> {
    const query = `
      INSERT INTO traffic_sources (
        name, type, description, source_id, is_active, priority, tracking_enabled,
        custom_params, performance_metrics
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      source.name, source.type, source.description, source.sourceId, source.isActive,
      source.priority, source.trackingEnabled, JSON.stringify(source.customParams),
      JSON.stringify(source.performanceMetrics)
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToTrafficSource(result.rows[0]);
  }

  async getTrafficSourceById(id: string): Promise<TrafficSource | null> {
    const query = 'SELECT * FROM traffic_sources WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rows.length > 0 ? this.mapRowToTrafficSource(result.rows[0]) : null;
  }

  async getTrafficSourceBySourceId(sourceId: string): Promise<TrafficSource | null> {
    const query = 'SELECT * FROM traffic_sources WHERE source_id = $1';
    const result = await this.pool.query(query, [sourceId]);
    return result.rows.length > 0 ? this.mapRowToTrafficSource(result.rows[0]) : null;
  }

  async getAllTrafficSources(): Promise<TrafficSource[]> {
    const query = 'SELECT * FROM traffic_sources WHERE is_active = true ORDER BY priority ASC';
    const result = await this.pool.query(query);
    return result.rows.map(row => this.mapRowToTrafficSource(row));
  }

  async updateTrafficSourceMetrics(sourceId: string, metrics: any): Promise<void> {
    const query = `
      UPDATE traffic_sources 
      SET performance_metrics = $1, updated_at = NOW()
      WHERE source_id = $2
    `;
    await this.pool.query(query, [JSON.stringify(metrics), sourceId]);
  }

  // Conversion Event operations
  async recordConversionEvent(conversion: Omit<ConversionEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<ConversionEvent> {
    const query = `
      INSERT INTO conversion_events (
        click_id, user_id, telegram_user_id, session_id, journey_id, order_id,
        store_id, store_name, order_value, commission, commission_rate, currency,
        products, conversion_type, attribution_model, attribution_data,
        payment_method, discount_applied, coupon_used, conversion_time,
        processing_status, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      RETURNING *
    `;

    const values = [
      conversion.clickId, conversion.userId, conversion.telegramUserId, conversion.sessionId,
      conversion.journeyId, conversion.orderId, conversion.storeId, conversion.storeName,
      conversion.orderValue, conversion.commission, conversion.commissionRate, conversion.currency,
      JSON.stringify(conversion.products), conversion.conversionType, conversion.attributionModel,
      JSON.stringify(conversion.attributionData), conversion.paymentMethod, conversion.discountApplied,
      conversion.couponUsed, conversion.conversionTime, conversion.processingStatus,
      JSON.stringify(conversion.metadata)
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToConversionEvent(result.rows[0]);
  }

  async getConversionByClickId(clickId: string): Promise<ConversionEvent | null> {
    const query = 'SELECT * FROM conversion_events WHERE click_id = $1';
    const result = await this.pool.query(query, [clickId]);
    return result.rows.length > 0 ? this.mapRowToConversionEvent(result.rows[0]) : null;
  }

  async getConversionsByUser(userId: string, limit: number = 50): Promise<ConversionEvent[]> {
    const query = `
      SELECT * FROM conversion_events 
      WHERE user_id = $1 
      ORDER BY conversion_time DESC 
      LIMIT $2
    `;
    const result = await this.pool.query(query, [userId, limit]);
    return result.rows.map(row => this.mapRowToConversionEvent(row));
  }

  // Analytics operations
  async getClickAnalytics(startDate: Date, endDate: Date, sourceType?: string): Promise<ClickAnalytics[]> {
    let query = `
      SELECT 
        DATE(clicked_at) as date,
        EXTRACT(HOUR FROM clicked_at) as hour,
        source as source_type,
        store_id,
        COUNT(*) as total_clicks,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT CASE WHEN session_id NOT IN (
          SELECT session_id FROM click_events ce2 
          WHERE ce2.user_id = click_events.user_id 
          AND ce2.clicked_at < click_events.clicked_at
        ) THEN user_id END) as new_users
      FROM click_events 
      WHERE clicked_at BETWEEN $1 AND $2
    `;

    const values = [startDate, endDate];

    if (sourceType) {
      query += ' AND source = $3';
      values.push(sourceType);
    }

    query += `
      GROUP BY DATE(clicked_at), EXTRACT(HOUR FROM clicked_at), source, store_id
      ORDER BY date DESC, hour DESC
    `;

    const result = await this.pool.query(query, values);
    return result.rows.map(row => this.mapRowToClickAnalytics(row));
  }

  async getConversionAnalytics(startDate: Date, endDate: Date): Promise<any[]> {
    const query = `
      SELECT 
        ce.source,
        ce.store_id,
        ce.store_name,
        COUNT(ce.id) as total_clicks,
        COUNT(DISTINCT ce.user_id) as unique_users,
        COUNT(conv.id) as conversions,
        COALESCE(SUM(conv.order_value), 0) as total_revenue,
        COALESCE(SUM(conv.commission), 0) as total_commission,
        CASE 
          WHEN COUNT(ce.id) > 0 THEN ROUND((COUNT(conv.id)::decimal / COUNT(ce.id)) * 100, 2)
          ELSE 0 
        END as conversion_rate,
        CASE 
          WHEN COUNT(conv.id) > 0 THEN ROUND(AVG(conv.order_value), 2)
          ELSE 0 
        END as avg_order_value
      FROM click_events ce
      LEFT JOIN conversion_events conv ON ce.click_id = conv.click_id
      WHERE ce.clicked_at BETWEEN $1 AND $2
      GROUP BY ce.source, ce.store_id, ce.store_name
      ORDER BY total_clicks DESC
    `;

    const result = await this.pool.query(query, [startDate, endDate]);
    return result.rows;
  }

  async getTopPerformingSources(days: number = 30, limit: number = 10): Promise<any[]> {
    const query = `
      SELECT 
        ts.name as source_name,
        ts.type as source_type,
        ts.source_id,
        COUNT(ce.id) as total_clicks,
        COUNT(DISTINCT ce.user_id) as unique_users,
        COUNT(conv.id) as conversions,
        COALESCE(SUM(conv.order_value), 0) as total_revenue,
        COALESCE(SUM(conv.commission), 0) as total_commission,
        CASE 
          WHEN COUNT(ce.id) > 0 THEN ROUND((COUNT(conv.id)::decimal / COUNT(ce.id)) * 100, 2)
          ELSE 0 
        END as conversion_rate
      FROM traffic_sources ts
      LEFT JOIN click_events ce ON ts.source_id = ce.source_details->>'channelId' 
        OR ts.source_id = ce.source_details->>'groupId'
      LEFT JOIN conversion_events conv ON ce.click_id = conv.click_id
      WHERE ce.clicked_at >= NOW() - INTERVAL '${days} days'
      GROUP BY ts.id, ts.name, ts.type, ts.source_id
      ORDER BY total_revenue DESC, conversion_rate DESC
      LIMIT $1
    `;

    const result = await this.pool.query(query, [limit]);
    return result.rows;
  }

  // Helper methods
  private mapRowToClickEvent(row: any): ClickEvent {
    return {
      id: row.id,
      clickId: row.click_id,
      userId: row.user_id,
      telegramUserId: row.telegram_user_id,
      sessionId: row.session_id,
      affiliateLinkId: row.affiliate_link_id,
      couponId: row.coupon_id,
      storeId: row.store_id,
      storeName: row.store_name,
      originalUrl: row.original_url,
      destinationUrl: row.destination_url,
      source: row.source,
      sourceDetails: JSON.parse(row.source_details || '{}'),
      userAgent: row.user_agent,
      ipAddress: row.ip_address,
      referrer: row.referrer,
      deviceInfo: JSON.parse(row.device_info || '{}'),
      geoLocation: JSON.parse(row.geo_location || '{}'),
      utmParams: JSON.parse(row.utm_params || '{}'),
      metadata: JSON.parse(row.metadata || '{}'),
      clickedAt: row.clicked_at,
      createdAt: row.created_at
    };
  }

  private mapRowToClickSession(row: any): ClickSession {
    return {
      id: row.id,
      sessionId: row.session_id,
      userId: row.user_id,
      telegramUserId: row.telegram_user_id,
      startedAt: row.started_at,
      lastActivityAt: row.last_activity_at,
      endedAt: row.ended_at,
      duration: row.duration,
      clickCount: row.click_count,
      uniqueLinksClicked: row.unique_links_clicked,
      conversionCount: row.conversion_count,
      totalRevenue: parseFloat(row.total_revenue || '0'),
      totalCommission: parseFloat(row.total_commission || '0'),
      deviceInfo: JSON.parse(row.device_info || '{}'),
      geoLocation: JSON.parse(row.geo_location || '{}'),
      isActive: row.is_active,
      metadata: JSON.parse(row.metadata || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapRowToTrafficSource(row: any): TrafficSource {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      description: row.description,
      sourceId: row.source_id,
      isActive: row.is_active,
      priority: row.priority,
      trackingEnabled: row.tracking_enabled,
      customParams: JSON.parse(row.custom_params || '{}'),
      performanceMetrics: JSON.parse(row.performance_metrics || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapRowToConversionEvent(row: any): ConversionEvent {
    return {
      id: row.id,
      clickId: row.click_id,
      userId: row.user_id,
      telegramUserId: row.telegram_user_id,
      sessionId: row.session_id,
      journeyId: row.journey_id,
      orderId: row.order_id,
      storeId: row.store_id,
      storeName: row.store_name,
      orderValue: parseFloat(row.order_value),
      commission: parseFloat(row.commission),
      commissionRate: parseFloat(row.commission_rate),
      currency: row.currency,
      products: JSON.parse(row.products || '[]'),
      conversionType: row.conversion_type,
      attributionModel: row.attribution_model,
      attributionData: JSON.parse(row.attribution_data || '{}'),
      paymentMethod: row.payment_method,
      discountApplied: parseFloat(row.discount_applied || '0'),
      couponUsed: row.coupon_used,
      conversionTime: row.conversion_time,
      processingStatus: row.processing_status,
      metadata: JSON.parse(row.metadata || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapRowToClickAnalytics(row: any): ClickAnalytics {
    return {
      id: row.id || `${row.date}_${row.hour}_${row.source_type}_${row.store_id}`,
      date: row.date,
      hour: parseInt(row.hour),
      sourceType: row.source_type,
      sourceId: row.source_id || '',
      storeId: row.store_id,
      totalClicks: parseInt(row.total_clicks),
      uniqueUsers: parseInt(row.unique_users),
      newUsers: parseInt(row.new_users || '0'),
      returningUsers: parseInt(row.unique_users) - parseInt(row.new_users || '0'),
      bounceRate: 0, // Будет рассчитываться отдельно
      averageSessionDuration: 0, // Будет рассчитываться отдельно
      topDevices: {},
      topLocations: {},
      topReferrers: {},
      conversionMetrics: {
        conversions: 0,
        conversionRate: 0,
        revenue: 0,
        commission: 0,
        averageOrderValue: 0
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}
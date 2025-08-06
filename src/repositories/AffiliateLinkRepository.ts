import { Pool } from 'pg';
import { AffiliateLink, LinkClick, AffiliateStore, LinkGeneration, SubIdMapping, TrafficAttribution } from '../models/AffiliateLink';
import { BaseRepository } from './base/BaseRepository';

export class AffiliateLinkRepository extends BaseRepository {
  constructor(pool: Pool) {
    super(pool);
  }

  // Affiliate Link CRUD operations
  async createAffiliateLink(link: Omit<AffiliateLink, 'id' | 'createdAt' | 'updatedAt'>): Promise<AffiliateLink> {
    const query = `
      INSERT INTO affiliate_links (
        original_url, affiliate_url, short_url, telegram_sub_id, user_id, coupon_id,
        store_id, store_name, link_type, source, metadata, is_active, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const values = [
      link.originalUrl, link.affiliateUrl, link.shortUrl, link.telegramSubId,
      link.userId, link.couponId, link.storeId, link.storeName, link.linkType,
      link.source, JSON.stringify(link.metadata), link.isActive, link.expiresAt
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToAffiliateLink(result.rows[0]);
  }

  async getAffiliateLinkById(id: string): Promise<AffiliateLink | null> {
    const query = 'SELECT * FROM affiliate_links WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rows.length > 0 ? this.mapRowToAffiliateLink(result.rows[0]) : null;
  }

  async getAffiliateLinkBySubId(telegramSubId: string): Promise<AffiliateLink | null> {
    const query = 'SELECT * FROM affiliate_links WHERE telegram_sub_id = $1 AND is_active = true';
    const result = await this.pool.query(query, [telegramSubId]);
    return result.rows.length > 0 ? this.mapRowToAffiliateLink(result.rows[0]) : null;
  }

  async getAffiliateLinksByUser(userId: string, limit: number = 50): Promise<AffiliateLink[]> {
    const query = `
      SELECT * FROM affiliate_links 
      WHERE user_id = $1 AND is_active = true
      ORDER BY created_at DESC
      LIMIT $2
    `;
    const result = await this.pool.query(query, [userId, limit]);
    return result.rows.map(row => this.mapRowToAffiliateLink(row));
  }

  async updateAffiliateLink(id: string, updates: Partial<AffiliateLink>): Promise<AffiliateLink | null> {
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        const dbColumn = this.camelToSnake(key);
        if (key === 'metadata') {
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
      UPDATE affiliate_links 
      SET ${setClause.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return result.rows.length > 0 ? this.mapRowToAffiliateLink(result.rows[0]) : null;
  }

  // Link Click operations
  async recordLinkClick(click: Omit<LinkClick, 'id' | 'clickedAt'>): Promise<LinkClick> {
    const query = `
      INSERT INTO link_clicks (
        affiliate_link_id, user_id, telegram_sub_id, ip_address, user_agent,
        referrer, session_id, device_info, conversion_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      click.affiliateLinkId, click.userId, click.telegramSubId, click.ipAddress,
      click.userAgent, click.referrer, click.sessionId, JSON.stringify(click.deviceInfo),
      JSON.stringify(click.conversionData)
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToLinkClick(result.rows[0]);
  }

  async getLinkClicksByAffiliate(affiliateLinkId: string, limit: number = 100): Promise<LinkClick[]> {
    const query = `
      SELECT * FROM link_clicks 
      WHERE affiliate_link_id = $1
      ORDER BY clicked_at DESC
      LIMIT $2
    `;
    const result = await this.pool.query(query, [affiliateLinkId, limit]);
    return result.rows.map(row => this.mapRowToLinkClick(row));
  }

  async updateLinkClickConversion(clickId: string, conversionData: any): Promise<LinkClick | null> {
    const query = `
      UPDATE link_clicks 
      SET conversion_data = $1
      WHERE id = $2
      RETURNING *
    `;
    const result = await this.pool.query(query, [JSON.stringify(conversionData), clickId]);
    return result.rows.length > 0 ? this.mapRowToLinkClick(result.rows[0]) : null;
  }

  // Affiliate Store operations
  async createAffiliateStore(store: Omit<AffiliateStore, 'id' | 'createdAt' | 'updatedAt'>): Promise<AffiliateStore> {
    const query = `
      INSERT INTO affiliate_stores (
        name, domain, affiliate_network, tracking_template, sub_id_parameter,
        commission_rate, cookie_duration, is_active, supported_countries,
        link_formats, custom_parameters
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const values = [
      store.name, store.domain, store.affiliateNetwork, store.trackingTemplate,
      store.subIdParameter, store.commissionRate, store.cookieDuration,
      store.isActive, JSON.stringify(store.supportedCountries),
      JSON.stringify(store.linkFormats), JSON.stringify(store.customParameters)
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToAffiliateStore(result.rows[0]);
  }

  async getAffiliateStoreById(id: string): Promise<AffiliateStore | null> {
    const query = 'SELECT * FROM affiliate_stores WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rows.length > 0 ? this.mapRowToAffiliateStore(result.rows[0]) : null;
  }

  async getAffiliateStoreByDomain(domain: string): Promise<AffiliateStore | null> {
    const query = 'SELECT * FROM affiliate_stores WHERE domain = $1 AND is_active = true';
    const result = await this.pool.query(query, [domain]);
    return result.rows.length > 0 ? this.mapRowToAffiliateStore(result.rows[0]) : null;
  }

  async getAllActiveStores(): Promise<AffiliateStore[]> {
    const query = 'SELECT * FROM affiliate_stores WHERE is_active = true ORDER BY name';
    const result = await this.pool.query(query);
    return result.rows.map(row => this.mapRowToAffiliateStore(row));
  }

  // SubId Mapping operations
  async createSubIdMapping(mapping: Omit<SubIdMapping, 'createdAt' | 'lastUsedAt'>): Promise<SubIdMapping> {
    const query = `
      INSERT INTO sub_id_mappings (
        telegram_sub_id, user_id, channel_id, source, metadata, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      mapping.telegramSubId, mapping.userId, mapping.channelId,
      mapping.source, JSON.stringify(mapping.metadata), mapping.isActive
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToSubIdMapping(result.rows[0]);
  }

  async getSubIdMapping(telegramSubId: string): Promise<SubIdMapping | null> {
    const query = 'SELECT * FROM sub_id_mappings WHERE telegram_sub_id = $1';
    const result = await this.pool.query(query, [telegramSubId]);
    return result.rows.length > 0 ? this.mapRowToSubIdMapping(result.rows[0]) : null;
  }

  async updateSubIdLastUsed(telegramSubId: string): Promise<void> {
    const query = `
      UPDATE sub_id_mappings 
      SET last_used_at = NOW()
      WHERE telegram_sub_id = $1
    `;
    await this.pool.query(query, [telegramSubId]);
  }

  // Traffic Attribution operations
  async createTrafficAttribution(attribution: Omit<TrafficAttribution, 'id' | 'createdAt' | 'updatedAt'>): Promise<TrafficAttribution> {
    const query = `
      INSERT INTO traffic_attribution (
        telegram_sub_id, user_id, affiliate_link_id, click_id, source, medium,
        campaign, content, term, first_click, last_click, click_count, conversion_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const values = [
      attribution.telegramSubId, attribution.userId, attribution.affiliateLinkId,
      attribution.clickId, attribution.source, attribution.medium, attribution.campaign,
      attribution.content, attribution.term, attribution.firstClick, attribution.lastClick,
      attribution.clickCount, JSON.stringify(attribution.conversionData)
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToTrafficAttribution(result.rows[0]);
  }

  async getTrafficAttributionBySubId(telegramSubId: string): Promise<TrafficAttribution[]> {
    const query = `
      SELECT * FROM traffic_attribution 
      WHERE telegram_sub_id = $1
      ORDER BY last_click DESC
    `;
    const result = await this.pool.query(query, [telegramSubId]);
    return result.rows.map(row => this.mapRowToTrafficAttribution(row));
  }

  async updateTrafficAttribution(id: string, updates: Partial<TrafficAttribution>): Promise<TrafficAttribution | null> {
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        const dbColumn = this.camelToSnake(key);
        if (key === 'conversionData') {
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
      UPDATE traffic_attribution 
      SET ${setClause.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return result.rows.length > 0 ? this.mapRowToTrafficAttribution(result.rows[0]) : null;
  }

  // Analytics queries
  async getClickStatsByUser(userId: string, days: number = 30): Promise<any> {
    const query = `
      SELECT 
        COUNT(*) as total_clicks,
        COUNT(DISTINCT affiliate_link_id) as unique_links,
        COUNT(CASE WHEN conversion_data->>'converted' = 'true' THEN 1 END) as conversions,
        AVG(CASE WHEN conversion_data->>'orderValue' IS NOT NULL 
            THEN (conversion_data->>'orderValue')::numeric END) as avg_order_value,
        SUM(CASE WHEN conversion_data->>'commission' IS NOT NULL 
            THEN (conversion_data->>'commission')::numeric END) as total_commission
      FROM link_clicks lc
      JOIN affiliate_links al ON lc.affiliate_link_id = al.id
      WHERE al.user_id = $1 
        AND lc.clicked_at >= NOW() - INTERVAL '${days} days'
    `;
    const result = await this.pool.query(query, [userId]);
    return result.rows[0];
  }

  async getTopPerformingLinks(userId: string, limit: number = 10): Promise<any[]> {
    const query = `
      SELECT 
        al.id,
        al.store_name,
        al.link_type,
        al.source,
        COUNT(lc.id) as click_count,
        COUNT(CASE WHEN lc.conversion_data->>'converted' = 'true' THEN 1 END) as conversion_count,
        SUM(CASE WHEN lc.conversion_data->>'commission' IS NOT NULL 
            THEN (lc.conversion_data->>'commission')::numeric END) as total_commission
      FROM affiliate_links al
      LEFT JOIN link_clicks lc ON al.id = lc.affiliate_link_id
      WHERE al.user_id = $1 AND al.is_active = true
      GROUP BY al.id, al.store_name, al.link_type, al.source
      ORDER BY click_count DESC, conversion_count DESC
      LIMIT $2
    `;
    const result = await this.pool.query(query, [userId, limit]);
    return result.rows;
  }

  // Helper methods
  private mapRowToAffiliateLink(row: any): AffiliateLink {
    return {
      id: row.id,
      originalUrl: row.original_url,
      affiliateUrl: row.affiliate_url,
      shortUrl: row.short_url,
      telegramSubId: row.telegram_sub_id,
      userId: row.user_id,
      couponId: row.coupon_id,
      storeId: row.store_id,
      storeName: row.store_name,
      linkType: row.link_type,
      source: row.source,
      metadata: JSON.parse(row.metadata || '{}'),
      isActive: row.is_active,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapRowToLinkClick(row: any): LinkClick {
    return {
      id: row.id,
      affiliateLinkId: row.affiliate_link_id,
      userId: row.user_id,
      telegramSubId: row.telegram_sub_id,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      referrer: row.referrer,
      clickedAt: row.clicked_at,
      sessionId: row.session_id,
      deviceInfo: JSON.parse(row.device_info || '{}'),
      conversionData: JSON.parse(row.conversion_data || '{}')
    };
  }

  private mapRowToAffiliateStore(row: any): AffiliateStore {
    return {
      id: row.id,
      name: row.name,
      domain: row.domain,
      affiliateNetwork: row.affiliate_network,
      trackingTemplate: row.tracking_template,
      subIdParameter: row.sub_id_parameter,
      commissionRate: row.commission_rate,
      cookieDuration: row.cookie_duration,
      isActive: row.is_active,
      supportedCountries: JSON.parse(row.supported_countries || '[]'),
      linkFormats: JSON.parse(row.link_formats || '{}'),
      customParameters: JSON.parse(row.custom_parameters || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapRowToSubIdMapping(row: any): SubIdMapping {
    return {
      telegramSubId: row.telegram_sub_id,
      userId: row.user_id,
      channelId: row.channel_id,
      source: row.source,
      metadata: JSON.parse(row.metadata || '{}'),
      isActive: row.is_active,
      createdAt: row.created_at,
      lastUsedAt: row.last_used_at
    };
  }

  private mapRowToTrafficAttribution(row: any): TrafficAttribution {
    return {
      id: row.id,
      telegramSubId: row.telegram_sub_id,
      userId: row.user_id,
      affiliateLinkId: row.affiliate_link_id,
      clickId: row.click_id,
      source: row.source,
      medium: row.medium,
      campaign: row.campaign,
      content: row.content,
      term: row.term,
      firstClick: row.first_click,
      lastClick: row.last_click,
      clickCount: row.click_count,
      conversionData: JSON.parse(row.conversion_data || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}
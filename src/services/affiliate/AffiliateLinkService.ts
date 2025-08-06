import crypto from 'crypto';
import { URL } from 'url';
import { AffiliateLinkRepository } from '../../repositories/AffiliateLinkRepository';
import { AffiliateLink, AffiliateStore, LinkClick, SubIdMapping } from '../../models/AffiliateLink';
import { BaseService } from '../base/BaseService';
import { Logger } from '../../config/logger';

export class AffiliateLinkService extends BaseService {
  private affiliateLinkRepository: AffiliateLinkRepository;
  private logger: Logger;

  constructor(affiliateLinkRepository: AffiliateLinkRepository, logger: Logger) {
    super();
    this.affiliateLinkRepository = affiliateLinkRepository;
    this.logger = logger;
  }

  /**
   * Генерация уникального Telegram SubID
   */
  generateTelegramSubId(userId: string, source: string, channelId?: string): string {
    const timestamp = Date.now().toString(36);
    const userHash = crypto.createHash('md5').update(userId).digest('hex').substring(0, 8);
    const sourceHash = crypto.createHash('md5').update(source).digest('hex').substring(0, 4);
    const channelHash = channelId ? crypto.createHash('md5').update(channelId).digest('hex').substring(0, 4) : 'gen';
    
    return `tg_${userHash}_${sourceHash}_${channelHash}_${timestamp}`;
  }

  /**
   * Создание аффилейтской ссылки
   */
  async generateAffiliateLink(params: {
    userId: string;
    originalUrl: string;
    storeId: string;
    couponId?: string;
    linkType: 'coupon' | 'offer' | 'direct';
    source: 'personal_channel' | 'group' | 'ai_recommendation' | 'search';
    channelId?: string;
    metadata?: Record<string, any>;
  }): Promise<AffiliateLink> {
    try {
      // Получаем информацию о магазине
      const store = await this.affiliateLinkRepository.getAffiliateStoreById(params.storeId);
      if (!store) {
        throw new Error(`Store not found: ${params.storeId}`);
      }

      // Генерируем уникальный SubID
      const telegramSubId = this.generateTelegramSubId(params.userId, params.source, params.channelId);

      // Создаем маппинг SubID
      await this.createSubIdMapping(telegramSubId, params.userId, params.source, params.channelId, params.metadata);

      // Генерируем аффилейтскую ссылку
      const affiliateUrl = this.buildAffiliateUrl(params.originalUrl, store, telegramSubId, params.linkType);

      // Создаем короткую ссылку (опционально)
      const shortUrl = await this.generateShortUrl(affiliateUrl);

      // Сохраняем в базу данных
      const affiliateLink = await this.affiliateLinkRepository.createAffiliateLink({
        originalUrl: params.originalUrl,
        affiliateUrl,
        shortUrl,
        telegramSubId,
        userId: params.userId,
        couponId: params.couponId,
        storeId: params.storeId,
        storeName: store.name,
        linkType: params.linkType,
        source: params.source,
        metadata: params.metadata || {},
        isActive: true,
        expiresAt: this.calculateExpirationDate(store.cookieDuration)
      });

      this.logger.info(`Generated affiliate link for user ${params.userId}, store ${store.name}, subId ${telegramSubId}`);
      return affiliateLink;

    } catch (error) {
      this.logger.error(`Failed to generate affiliate link:`, error);
      throw error;
    }
  }

  /**
   * Построение аффилейтской ссылки с параметрами отслеживания
   */
  private buildAffiliateUrl(originalUrl: string, store: AffiliateStore, telegramSubId: string, linkType: string): string {
    try {
      const url = new URL(originalUrl);
      
      // Используем шаблон отслеживания магазина
      let trackingUrl = store.trackingTemplate;
      
      // Заменяем плейсхолдеры в шаблоне
      trackingUrl = trackingUrl.replace('{original_url}', encodeURIComponent(originalUrl));
      trackingUrl = trackingUrl.replace('{sub_id}', telegramSubId);
      trackingUrl = trackingUrl.replace('{link_type}', linkType);
      trackingUrl = trackingUrl.replace('{domain}', store.domain);

      // Добавляем дополнительные параметры
      const finalUrl = new URL(trackingUrl);
      
      // Добавляем SubID параметр
      finalUrl.searchParams.set(store.subIdParameter, telegramSubId);
      
      // Добавляем UTM параметры для отслеживания
      finalUrl.searchParams.set('utm_source', 'telegram');
      finalUrl.searchParams.set('utm_medium', 'bot');
      finalUrl.searchParams.set('utm_campaign', 'zabardoo');
      finalUrl.searchParams.set('utm_content', linkType);
      
      // Добавляем кастомные параметры магазина
      if (store.customParameters) {
        Object.entries(store.customParameters).forEach(([key, value]) => {
          finalUrl.searchParams.set(key, value.replace('{sub_id}', telegramSubId));
        });
      }

      return finalUrl.toString();

    } catch (error) {
      this.logger.error(`Failed to build affiliate URL:`, error);
      throw new Error(`Invalid URL format: ${originalUrl}`);
    }
  }

  /**
   * Создание маппинга SubID
   */
  private async createSubIdMapping(
    telegramSubId: string, 
    userId: string, 
    source: string, 
    channelId?: string, 
    metadata?: Record<string, any>
  ): Promise<SubIdMapping> {
    return await this.affiliateLinkRepository.createSubIdMapping({
      telegramSubId,
      userId,
      channelId,
      source,
      metadata: metadata || {},
      isActive: true
    });
  }

  /**
   * Генерация короткой ссылки
   */
  private async generateShortUrl(longUrl: string): Promise<string> {
    // Простая реализация - можно заменить на внешний сервис (bit.ly, tinyurl и т.д.)
    const hash = crypto.createHash('md5').update(longUrl).digest('hex').substring(0, 8);
    return `https://zabardoo.com/l/${hash}`;
  }

  /**
   * Расчет даты истечения ссылки
   */
  private calculateExpirationDate(cookieDurationDays: number): Date {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + cookieDurationDays);
    return expirationDate;
  }

  /**
   * Отслеживание клика по ссылке
   */
  async trackLinkClick(params: {
    telegramSubId: string;
    ipAddress?: string;
    userAgent?: string;
    referrer?: string;
    sessionId?: string;
    deviceInfo?: any;
  }): Promise<LinkClick | null> {
    try {
      // Находим аффилейтскую ссылку по SubID
      const affiliateLink = await this.affiliateLinkRepository.getAffiliateLinkBySubId(params.telegramSubId);
      if (!affiliateLink) {
        this.logger.warn(`Affiliate link not found for SubID: ${params.telegramSubId}`);
        return null;
      }

      // Обновляем время последнего использования SubID
      await this.affiliateLinkRepository.updateSubIdLastUsed(params.telegramSubId);

      // Записываем клик
      const linkClick = await this.affiliateLinkRepository.recordLinkClick({
        affiliateLinkId: affiliateLink.id,
        userId: affiliateLink.userId,
        telegramSubId: params.telegramSubId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        referrer: params.referrer,
        sessionId: params.sessionId,
        deviceInfo: params.deviceInfo || {},
        conversionData: { converted: false }
      });

      this.logger.info(`Tracked click for SubID: ${params.telegramSubId}, Link: ${affiliateLink.id}`);
      return linkClick;

    } catch (error) {
      this.logger.error(`Failed to track link click:`, error);
      throw error;
    }
  }

  /**
   * Обновление данных о конверсии
   */
  async updateConversion(params: {
    telegramSubId: string;
    orderId: string;
    orderValue: number;
    commission: number;
    conversionTime?: Date;
  }): Promise<void> {
    try {
      // Находим все клики по данному SubID
      const affiliateLink = await this.affiliateLinkRepository.getAffiliateLinkBySubId(params.telegramSubId);
      if (!affiliateLink) {
        this.logger.warn(`Affiliate link not found for conversion SubID: ${params.telegramSubId}`);
        return;
      }

      const clicks = await this.affiliateLinkRepository.getLinkClicksByAffiliate(affiliateLink.id);
      
      // Обновляем последний клик как конвертированный (last-click attribution)
      if (clicks.length > 0) {
        const lastClick = clicks[0]; // Первый в списке = последний по времени
        
        await this.affiliateLinkRepository.updateLinkClickConversion(lastClick.id, {
          converted: true,
          orderId: params.orderId,
          orderValue: params.orderValue,
          commission: params.commission,
          conversionTime: params.conversionTime || new Date()
        });

        this.logger.info(`Updated conversion for SubID: ${params.telegramSubId}, Order: ${params.orderId}, Value: ${params.orderValue}`);
      }

    } catch (error) {
      this.logger.error(`Failed to update conversion:`, error);
      throw error;
    }
  }

  /**
   * Получение статистики по ссылкам пользователя
   */
  async getUserLinkStats(userId: string, days: number = 30): Promise<any> {
    try {
      const stats = await this.affiliateLinkRepository.getClickStatsByUser(userId, days);
      const topLinks = await this.affiliateLinkRepository.getTopPerformingLinks(userId, 10);

      return {
        period: `${days} days`,
        totalClicks: parseInt(stats.total_clicks) || 0,
        uniqueLinks: parseInt(stats.unique_links) || 0,
        conversions: parseInt(stats.conversions) || 0,
        conversionRate: stats.total_clicks > 0 ? (stats.conversions / stats.total_clicks * 100).toFixed(2) : '0.00',
        averageOrderValue: parseFloat(stats.avg_order_value) || 0,
        totalCommission: parseFloat(stats.total_commission) || 0,
        topPerformingLinks: topLinks.map(link => ({
          storeId: link.id,
          storeName: link.store_name,
          linkType: link.link_type,
          source: link.source,
          clicks: parseInt(link.click_count) || 0,
          conversions: parseInt(link.conversion_count) || 0,
          commission: parseFloat(link.total_commission) || 0,
          conversionRate: link.click_count > 0 ? (link.conversion_count / link.click_count * 100).toFixed(2) : '0.00'
        }))
      };

    } catch (error) {
      this.logger.error(`Failed to get user link stats:`, error);
      throw error;
    }
  }

  /**
   * Получение информации о ссылке по SubID
   */
  async getLinkInfo(telegramSubId: string): Promise<AffiliateLink | null> {
    try {
      return await this.affiliateLinkRepository.getAffiliateLinkBySubId(telegramSubId);
    } catch (error) {
      this.logger.error(`Failed to get link info:`, error);
      throw error;
    }
  }

  /**
   * Деактивация ссылки
   */
  async deactivateLink(linkId: string): Promise<void> {
    try {
      await this.affiliateLinkRepository.updateAffiliateLink(linkId, { isActive: false });
      this.logger.info(`Deactivated affiliate link: ${linkId}`);
    } catch (error) {
      this.logger.error(`Failed to deactivate link:`, error);
      throw error;
    }
  }

  /**
   * Массовая генерация ссылок для купонов
   */
  async generateBulkLinks(params: {
    userId: string;
    couponIds: string[];
    source: string;
    channelId?: string;
  }): Promise<AffiliateLink[]> {
    const results: AffiliateLink[] = [];

    for (const couponId of params.couponIds) {
      try {
        // Здесь должна быть логика получения информации о купоне
        // Для примера используем заглушку
        const mockCouponUrl = `https://example.com/coupon/${couponId}`;
        const mockStoreId = 'store-1'; // Должно браться из купона

        const link = await this.generateAffiliateLink({
          userId: params.userId,
          originalUrl: mockCouponUrl,
          storeId: mockStoreId,
          couponId,
          linkType: 'coupon',
          source: params.source as any,
          channelId: params.channelId
        });

        results.push(link);

      } catch (error) {
        this.logger.error(`Failed to generate link for coupon ${couponId}:`, error);
      }
    }

    return results;
  }

  /**
   * Очистка истекших ссылок
   */
  async cleanupExpiredLinks(): Promise<number> {
    try {
      // Здесь должна быть логика очистки истекших ссылок
      // Для примера возвращаем 0
      this.logger.info('Cleaned up expired affiliate links');
      return 0;
    } catch (error) {
      this.logger.error(`Failed to cleanup expired links:`, error);
      throw error;
    }
  }
}
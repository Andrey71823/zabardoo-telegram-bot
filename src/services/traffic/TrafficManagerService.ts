import crypto from 'crypto';
import { TrafficManagerRepository } from '../../repositories/TrafficManagerRepository';
import { ClickEvent, ClickSession, TrafficSource, ConversionEvent } from '../../models/TrafficManager';
import { BaseService } from '../base/BaseService';
import { Logger } from '../../config/logger';

export class TrafficManagerService extends BaseService {
  private trafficManagerRepository: TrafficManagerRepository;
  private logger: Logger;
  private activeSessions: Map<string, ClickSession> = new Map();

  constructor(trafficManagerRepository: TrafficManagerRepository, logger: Logger) {
    super();
    this.trafficManagerRepository = trafficManagerRepository;
    this.logger = logger;
    
    // Очистка неактивных сессий каждые 5 минут
    setInterval(() => this.cleanupInactiveSessions(), 5 * 60 * 1000);
  }

  /**
   * Генерация уникального ID клика
   */
  generateClickId(): string {
    const timestamp = Date.now().toString(36);
    const randomBytes = crypto.randomBytes(8).toString('hex');
    return `click_${timestamp}_${randomBytes}`;
  }

  /**
   * Генерация ID сессии
   */
  generateSessionId(userId: string): string {
    const timestamp = Date.now().toString(36);
    const userHash = crypto.createHash('md5').update(userId).digest('hex').substring(0, 8);
    return `session_${userHash}_${timestamp}`;
  }

  /**
   * Отслеживание клика
   */
  async trackClick(params: {
    userId: string;
    telegramUserId: string;
    storeId: string;
    storeName: string;
    originalUrl: string;
    destinationUrl: string;
    source: 'personal_channel' | 'group' | 'ai_recommendation' | 'search' | 'notification';
    sourceDetails: {
      channelId?: string;
      groupId?: string;
      messageId?: string;
      botCommand?: string;
      campaignId?: string;
    };
    affiliateLinkId?: string;
    couponId?: string;
    userAgent?: string;
    ipAddress?: string;
    referrer?: string;
    deviceInfo?: any;
    geoLocation?: any;
    utmParams?: any;
    metadata?: Record<string, any>;
  }): Promise<ClickEvent> {
    try {
      // Генерируем уникальный ID клика
      const clickId = this.generateClickId();

      // Получаем или создаем активную сессию
      const session = await this.getOrCreateSession(params.userId, params.telegramUserId, params.deviceInfo, params.geoLocation);

      // Создаем событие клика
      const clickEvent = await this.trafficManagerRepository.recordClickEvent({
        clickId,
        userId: params.userId,
        telegramUserId: params.telegramUserId,
        sessionId: session.sessionId,
        affiliateLinkId: params.affiliateLinkId,
        couponId: params.couponId,
        storeId: params.storeId,
        storeName: params.storeName,
        originalUrl: params.originalUrl,
        destinationUrl: params.destinationUrl,
        source: params.source,
        sourceDetails: params.sourceDetails,
        userAgent: params.userAgent,
        ipAddress: params.ipAddress,
        referrer: params.referrer,
        deviceInfo: params.deviceInfo || {},
        geoLocation: params.geoLocation,
        utmParams: params.utmParams,
        metadata: params.metadata || {},
        clickedAt: new Date()
      });

      // Обновляем сессию
      await this.updateSessionActivity(session.sessionId, {
        clickCount: session.clickCount + 1,
        lastActivityAt: new Date()
      });

      // Обновляем метрики источника трафика
      await this.updateTrafficSourceMetrics(params.source, params.sourceDetails);

      this.logger.info(`Click tracked: ${clickId} for user ${params.userId} from ${params.source}`);
      return clickEvent;

    } catch (error) {
      this.logger.error('Failed to track click:', error);
      throw error;
    }
  }

  /**
   * Получение или создание активной сессии
   */
  private async getOrCreateSession(
    userId: string, 
    telegramUserId: string, 
    deviceInfo?: any, 
    geoLocation?: any
  ): Promise<ClickSession> {
    // Проверяем активную сессию в памяти
    let session = this.activeSessions.get(userId);
    
    if (!session) {
      // Проверяем в базе данных
      session = await this.trafficManagerRepository.getActiveSession(userId);
    }

    // Если сессии нет или она истекла, создаем новую
    if (!session || this.isSessionExpired(session)) {
      const sessionId = this.generateSessionId(userId);
      const now = new Date();

      session = await this.trafficManagerRepository.createClickSession({
        sessionId,
        userId,
        telegramUserId,
        startedAt: now,
        lastActivityAt: now,
        clickCount: 0,
        uniqueLinksClicked: 0,
        conversionCount: 0,
        totalRevenue: 0,
        totalCommission: 0,
        deviceInfo: deviceInfo || {},
        geoLocation: geoLocation,
        isActive: true,
        metadata: {}
      });

      this.activeSessions.set(userId, session);
    }

    return session;
  }

  /**
   * Проверка истечения сессии (30 минут неактивности)
   */
  private isSessionExpired(session: ClickSession): boolean {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    return session.lastActivityAt < thirtyMinutesAgo;
  }

  /**
   * Обновление активности сессии
   */
  private async updateSessionActivity(sessionId: string, updates: Partial<ClickSession>): Promise<void> {
    await this.trafficManagerRepository.updateClickSession(sessionId, updates);
    
    // Обновляем в памяти
    for (const [userId, session] of this.activeSessions.entries()) {
      if (session.sessionId === sessionId) {
        Object.assign(session, updates);
        break;
      }
    }
  }

  /**
   * Завершение сессии
   */
  async endSession(userId: string): Promise<void> {
    const session = this.activeSessions.get(userId);
    if (session) {
      const now = new Date();
      const duration = Math.floor((now.getTime() - session.startedAt.getTime()) / 1000);

      await this.trafficManagerRepository.updateClickSession(session.sessionId, {
        endedAt: now,
        duration,
        isActive: false
      });

      this.activeSessions.delete(userId);
      this.logger.info(`Session ended for user ${userId}, duration: ${duration}s`);
    }
  }

  /**
   * Очистка неактивных сессий
   */
  private async cleanupInactiveSessions(): Promise<void> {
    const expiredSessions: string[] = [];

    for (const [userId, session] of this.activeSessions.entries()) {
      if (this.isSessionExpired(session)) {
        expiredSessions.push(userId);
      }
    }

    for (const userId of expiredSessions) {
      await this.endSession(userId);
    }

    if (expiredSessions.length > 0) {
      this.logger.info(`Cleaned up ${expiredSessions.length} expired sessions`);
    }
  }

  /**
   * Обновление метрик источника трафика
   */
  private async updateTrafficSourceMetrics(
    sourceType: string, 
    sourceDetails: Record<string, any>
  ): Promise<void> {
    try {
      const sourceId = sourceDetails.channelId || sourceDetails.groupId || sourceType;
      let trafficSource = await this.trafficManagerRepository.getTrafficSourceBySourceId(sourceId);

      if (!trafficSource) {
        // Создаем новый источник трафика
        trafficSource = await this.trafficManagerRepository.createTrafficSource({
          name: this.getSourceName(sourceType, sourceDetails),
          type: sourceType as any,
          description: `Auto-created source for ${sourceType}`,
          sourceId,
          isActive: true,
          priority: this.getSourcePriority(sourceType),
          trackingEnabled: true,
          customParams: sourceDetails,
          performanceMetrics: {
            totalClicks: 1,
            uniqueUsers: 1,
            conversions: 0,
            conversionRate: 0,
            averageOrderValue: 0,
            totalRevenue: 0,
            totalCommission: 0,
            lastUpdated: new Date()
          }
        });
      } else {
        // Обновляем метрики существующего источника
        const metrics = trafficSource.performanceMetrics;
        metrics.totalClicks += 1;
        metrics.lastUpdated = new Date();

        await this.trafficManagerRepository.updateTrafficSourceMetrics(sourceId, metrics);
      }

    } catch (error) {
      this.logger.error('Failed to update traffic source metrics:', error);
    }
  }

  /**
   * Получение имени источника трафика
   */
  private getSourceName(sourceType: string, sourceDetails: Record<string, any>): string {
    switch (sourceType) {
      case 'personal_channel':
        return `Personal Channel ${sourceDetails.channelId || 'Unknown'}`;
      case 'group':
        return `Group ${sourceDetails.groupId || 'Unknown'}`;
      case 'ai_recommendation':
        return 'AI Recommendations';
      case 'search':
        return 'Search Results';
      case 'notification':
        return 'Push Notifications';
      default:
        return `Unknown Source (${sourceType})`;
    }
  }

  /**
   * Получение приоритета источника трафика
   */
  private getSourcePriority(sourceType: string): number {
    const priorities = {
      'personal_channel': 1,
      'ai_recommendation': 2,
      'group': 3,
      'search': 4,
      'notification': 5
    };
    return priorities[sourceType] || 999;
  }

  /**
   * Отслеживание конверсии
   */
  async trackConversion(params: {
    clickId: string;
    orderId: string;
    orderValue: number;
    commission: number;
    commissionRate: number;
    currency: string;
    products: any[];
    conversionType: 'purchase' | 'signup' | 'subscription' | 'lead';
    paymentMethod?: string;
    discountApplied?: number;
    couponUsed?: string;
    metadata?: Record<string, any>;
  }): Promise<ConversionEvent> {
    try {
      // Получаем информацию о клике
      const clickEvent = await this.trafficManagerRepository.getClickEventByClickId(params.clickId);
      if (!clickEvent) {
        throw new Error(`Click event not found for clickId: ${params.clickId}`);
      }

      // Создаем событие конверсии
      const conversionEvent = await this.trafficManagerRepository.recordConversionEvent({
        clickId: params.clickId,
        userId: clickEvent.userId,
        telegramUserId: clickEvent.telegramUserId,
        sessionId: clickEvent.sessionId,
        orderId: params.orderId,
        storeId: clickEvent.storeId,
        storeName: clickEvent.storeName,
        orderValue: params.orderValue,
        commission: params.commission,
        commissionRate: params.commissionRate,
        currency: params.currency,
        products: params.products,
        conversionType: params.conversionType,
        attributionModel: 'last_click', // По умолчанию last-click attribution
        attributionData: {
          firstClickSource: clickEvent.source,
          lastClickSource: clickEvent.source,
          touchpointCount: 1,
          journeyDuration: 0
        },
        paymentMethod: params.paymentMethod,
        discountApplied: params.discountApplied || 0,
        couponUsed: params.couponUsed,
        conversionTime: new Date(),
        processingStatus: 'pending',
        metadata: params.metadata || {}
      });

      // Обновляем сессию
      await this.updateSessionActivity(clickEvent.sessionId, {
        conversionCount: 1,
        totalRevenue: params.orderValue,
        totalCommission: params.commission
      });

      // Обновляем метрики источника трафика
      await this.updateSourceConversionMetrics(clickEvent.source, clickEvent.sourceDetails, params.orderValue, params.commission);

      this.logger.info(`Conversion tracked: ${params.orderId} for click ${params.clickId}, value: ${params.orderValue}`);
      return conversionEvent;

    } catch (error) {
      this.logger.error('Failed to track conversion:', error);
      throw error;
    }
  }

  /**
   * Обновление метрик конверсии источника трафика
   */
  private async updateSourceConversionMetrics(
    sourceType: string,
    sourceDetails: Record<string, any>,
    orderValue: number,
    commission: number
  ): Promise<void> {
    try {
      const sourceId = sourceDetails.channelId || sourceDetails.groupId || sourceType;
      const trafficSource = await this.trafficManagerRepository.getTrafficSourceBySourceId(sourceId);

      if (trafficSource) {
        const metrics = trafficSource.performanceMetrics;
        metrics.conversions += 1;
        metrics.totalRevenue += orderValue;
        metrics.totalCommission += commission;
        metrics.conversionRate = (metrics.conversions / metrics.totalClicks) * 100;
        metrics.averageOrderValue = metrics.totalRevenue / metrics.conversions;
        metrics.lastUpdated = new Date();

        await this.trafficManagerRepository.updateTrafficSourceMetrics(sourceId, metrics);
      }

    } catch (error) {
      this.logger.error('Failed to update source conversion metrics:', error);
    }
  }

  /**
   * Получение аналитики кликов
   */
  async getClickAnalytics(startDate: Date, endDate: Date, sourceType?: string): Promise<any> {
    try {
      const analytics = await this.trafficManagerRepository.getClickAnalytics(startDate, endDate, sourceType);
      const conversionAnalytics = await this.trafficManagerRepository.getConversionAnalytics(startDate, endDate);

      return {
        clickAnalytics: analytics,
        conversionAnalytics,
        summary: this.calculateAnalyticsSummary(analytics, conversionAnalytics)
      };

    } catch (error) {
      this.logger.error('Failed to get click analytics:', error);
      throw error;
    }
  }

  /**
   * Расчет сводной аналитики
   */
  private calculateAnalyticsSummary(clickAnalytics: any[], conversionAnalytics: any[]): any {
    const totalClicks = clickAnalytics.reduce((sum, item) => sum + item.totalClicks, 0);
    const uniqueUsers = new Set(clickAnalytics.map(item => item.uniqueUsers)).size;
    const totalConversions = conversionAnalytics.reduce((sum, item) => sum + parseInt(item.conversions), 0);
    const totalRevenue = conversionAnalytics.reduce((sum, item) => sum + parseFloat(item.total_revenue), 0);
    const totalCommission = conversionAnalytics.reduce((sum, item) => sum + parseFloat(item.total_commission), 0);

    return {
      totalClicks,
      uniqueUsers,
      totalConversions,
      conversionRate: totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(2) : '0.00',
      totalRevenue: totalRevenue.toFixed(2),
      totalCommission: totalCommission.toFixed(2),
      averageOrderValue: totalConversions > 0 ? (totalRevenue / totalConversions).toFixed(2) : '0.00',
      returnOnAdSpend: totalCommission > 0 ? ((totalRevenue / totalCommission) * 100).toFixed(2) : '0.00'
    };
  }

  /**
   * Получение топ источников трафика
   */
  async getTopPerformingSources(days: number = 30, limit: number = 10): Promise<any[]> {
    try {
      return await this.trafficManagerRepository.getTopPerformingSources(days, limit);
    } catch (error) {
      this.logger.error('Failed to get top performing sources:', error);
      throw error;
    }
  }

  /**
   * Получение событий клика для пользователя
   */
  async getUserClickEvents(userId: string, limit: number = 100): Promise<ClickEvent[]> {
    try {
      return await this.trafficManagerRepository.getClickEventsByUser(userId, limit);
    } catch (error) {
      this.logger.error(`Failed to get click events for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Получение конверсий для пользователя
   */
  async getUserConversions(userId: string, limit: number = 50): Promise<ConversionEvent[]> {
    try {
      return await this.trafficManagerRepository.getConversionsByUser(userId, limit);
    } catch (error) {
      this.logger.error(`Failed to get conversions for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Получение всех источников трафика
   */
  async getAllTrafficSources(): Promise<TrafficSource[]> {
    try {
      return await this.trafficManagerRepository.getAllTrafficSources();
    } catch (error) {
      this.logger.error('Failed to get all traffic sources:', error);
      throw error;
    }
  }
}
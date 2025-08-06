import axios, { AxiosInstance } from 'axios';
import { CouponSyncRepository } from '../../repositories/CouponSyncRepository';
import { CouponSync, CouponSyncStatus, SyncConfiguration, WebsiteCoupon } from '../../models/CouponSync';
import { BaseService } from '../base/BaseService';
import { Logger } from '../../config/logger';

export class CouponSyncService extends BaseService {
  private couponSyncRepository: CouponSyncRepository;
  private httpClient: AxiosInstance;
  private logger: Logger;

  constructor(couponSyncRepository: CouponSyncRepository, logger: Logger) {
    super();
    this.couponSyncRepository = couponSyncRepository;
    this.logger = logger;
    this.httpClient = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Zabardoo-Bot/1.0'
      }
    });
  }

  /**
   * Синхронизация всех активных конфигураций
   */
  async syncAllConfigurations(): Promise<void> {
    try {
      const configs = await this.couponSyncRepository.getActiveSyncConfigs();
      this.logger.info(`Starting sync for ${configs.length} configurations`);

      for (const config of configs) {
        try {
          await this.syncConfiguration(config);
        } catch (error) {
          this.logger.error(`Failed to sync configuration ${config.name}:`, error);
        }
      }
    } catch (error) {
      this.logger.error('Failed to sync configurations:', error);
      throw error;
    }
  }

  /**
   * Синхронизация конкретной конфигурации
   */
  async syncConfiguration(config: SyncConfiguration): Promise<void> {
    try {
      this.logger.info(`Starting sync for configuration: ${config.name}`);

      // Получаем купоны с сайта
      const websiteCoupons = await this.fetchCouponsFromWebsite(config);
      this.logger.info(`Fetched ${websiteCoupons.length} coupons from website`);

      // Обрабатываем каждый купон
      let created = 0;
      let updated = 0;
      let errors = 0;

      for (const websiteCoupon of websiteCoupons) {
        try {
          const result = await this.processCoupon(websiteCoupon, config);
          if (result === 'created') created++;
          else if (result === 'updated') updated++;
        } catch (error) {
          errors++;
          this.logger.error(`Failed to process coupon ${websiteCoupon.id}:`, error);
          
          // Создаем запись об ошибке синхронизации
          await this.createSyncError(websiteCoupon.id, 'create', error.message);
        }
      }

      // Обновляем статус конфигурации
      const nextSyncAt = new Date(Date.now() + config.syncInterval * 60 * 1000);
      await this.couponSyncRepository.updateSyncConfig(config.id, {
        lastSyncAt: new Date(),
        nextSyncAt
      });

      this.logger.info(`Sync completed for ${config.name}: ${created} created, ${updated} updated, ${errors} errors`);
    } catch (error) {
      this.logger.error(`Failed to sync configuration ${config.name}:`, error);
      throw error;
    }
  }

  /**
   * Получение купонов с сайта
   */
  private async fetchCouponsFromWebsite(config: SyncConfiguration): Promise<WebsiteCoupon[]> {
    try {
      const headers: any = {};
      if (config.apiKey) {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
      }

      // Строим URL с фильтрами
      const url = this.buildApiUrl(config);
      
      const response = await this.httpClient.get(url, { headers });
      
      if (response.status !== 200) {
        throw new Error(`API returned status ${response.status}`);
      }

      // Предполагаем, что API возвращает массив купонов или объект с полем data
      const coupons = Array.isArray(response.data) ? response.data : response.data.data || [];
      
      return coupons.map(coupon => this.mapWebsiteCouponToModel(coupon));
    } catch (error) {
      this.logger.error(`Failed to fetch coupons from ${config.endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Построение URL API с фильтрами
   */
  private buildApiUrl(config: SyncConfiguration): string {
    const url = new URL(config.endpoint);
    
    if (config.syncFilters.categories?.length) {
      url.searchParams.set('categories', config.syncFilters.categories.join(','));
    }
    
    if (config.syncFilters.stores?.length) {
      url.searchParams.set('stores', config.syncFilters.stores.join(','));
    }
    
    if (config.syncFilters.minDiscount) {
      url.searchParams.set('min_discount', config.syncFilters.minDiscount.toString());
    }
    
    if (config.syncFilters.onlyActive) {
      url.searchParams.set('active_only', 'true');
    }

    // Добавляем лимит для пагинации
    url.searchParams.set('limit', '1000');
    
    return url.toString();
  }

  /**
   * Обработка отдельного купона
   */
  private async processCoupon(websiteCoupon: WebsiteCoupon, config: SyncConfiguration): Promise<'created' | 'updated' | 'skipped'> {
    // Проверяем, существует ли купон
    const existingCoupon = await this.couponSyncRepository.getCouponByExternalId(websiteCoupon.id);
    
    if (existingCoupon) {
      // Проверяем, нужно ли обновление
      if (this.shouldUpdateCoupon(existingCoupon, websiteCoupon)) {
        const updates = this.mapWebsiteCouponToUpdates(websiteCoupon);
        await this.couponSyncRepository.updateCoupon(existingCoupon.id, {
          ...updates,
          lastSyncAt: new Date()
        });
        
        // Создаем запись о синхронизации
        await this.createSyncStatus(existingCoupon.id, 'update', 'completed');
        
        return 'updated';
      }
      return 'skipped';
    } else {
      // Создаем новый купон
      const newCoupon = this.mapWebsiteCouponToCouponSync(websiteCoupon);
      const created = await this.couponSyncRepository.createCoupon(newCoupon);
      
      // Создаем запись о синхронизации
      await this.createSyncStatus(created.id, 'create', 'completed');
      
      return 'created';
    }
  }

  /**
   * Проверка необходимости обновления купона
   */
  private shouldUpdateCoupon(existing: CouponSync, website: WebsiteCoupon): boolean {
    return (
      existing.title !== website.title ||
      existing.description !== website.description ||
      existing.discount !== website.discount ||
      existing.isActive !== website.isActive ||
      existing.endDate.getTime() !== new Date(website.endDate).getTime() ||
      existing.affiliateUrl !== website.affiliateUrl
    );
  }

  /**
   * Маппинг купона с сайта в модель базы данных
   */
  private mapWebsiteCouponToCouponSync(websiteCoupon: WebsiteCoupon): Omit<CouponSync, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      externalId: websiteCoupon.id,
      title: websiteCoupon.title,
      description: websiteCoupon.description,
      code: websiteCoupon.code,
      discount: websiteCoupon.discount,
      discountType: websiteCoupon.discountType as any,
      discountValue: websiteCoupon.discountValue,
      store: websiteCoupon.store.name,
      storeId: websiteCoupon.store.id,
      category: websiteCoupon.category.name,
      categoryId: websiteCoupon.category.id,
      imageUrl: websiteCoupon.imageUrl,
      affiliateUrl: websiteCoupon.affiliateUrl,
      originalUrl: websiteCoupon.affiliateUrl, // Используем affiliate как original
      startDate: new Date(websiteCoupon.startDate),
      endDate: new Date(websiteCoupon.endDate),
      isActive: websiteCoupon.isActive,
      isVerified: websiteCoupon.isVerified,
      popularity: 0, // Будет рассчитываться отдельно
      successRate: 0, // Будет рассчитываться отдельно
      tags: websiteCoupon.tags,
      conditions: websiteCoupon.conditions,
      minOrderValue: websiteCoupon.minOrderValue,
      maxDiscount: websiteCoupon.maxDiscount,
      usageLimit: websiteCoupon.usageLimit,
      usedCount: websiteCoupon.usedCount,
      source: 'api',
      lastSyncAt: new Date()
    };
  }

  /**
   * Маппинг обновлений купона
   */
  private mapWebsiteCouponToUpdates(websiteCoupon: WebsiteCoupon): Partial<CouponSync> {
    return {
      title: websiteCoupon.title,
      description: websiteCoupon.description,
      code: websiteCoupon.code,
      discount: websiteCoupon.discount,
      discountType: websiteCoupon.discountType as any,
      discountValue: websiteCoupon.discountValue,
      store: websiteCoupon.store.name,
      category: websiteCoupon.category.name,
      imageUrl: websiteCoupon.imageUrl,
      affiliateUrl: websiteCoupon.affiliateUrl,
      endDate: new Date(websiteCoupon.endDate),
      isActive: websiteCoupon.isActive,
      isVerified: websiteCoupon.isVerified,
      tags: websiteCoupon.tags,
      conditions: websiteCoupon.conditions,
      minOrderValue: websiteCoupon.minOrderValue,
      maxDiscount: websiteCoupon.maxDiscount,
      usageLimit: websiteCoupon.usageLimit,
      usedCount: websiteCoupon.usedCount
    };
  }

  /**
   * Маппинг купона с сайта в стандартную модель
   */
  private mapWebsiteCouponToModel(coupon: any): WebsiteCoupon {
    return {
      id: coupon.id || coupon.external_id,
      title: coupon.title,
      description: coupon.description || '',
      code: coupon.code,
      discount: coupon.discount,
      discountType: coupon.discount_type || coupon.discountType || 'percentage',
      discountValue: coupon.discount_value || coupon.discountValue,
      store: {
        id: coupon.store?.id || coupon.store_id,
        name: coupon.store?.name || coupon.store_name,
        logo: coupon.store?.logo
      },
      category: {
        id: coupon.category?.id || coupon.category_id,
        name: coupon.category?.name || coupon.category_name
      },
      imageUrl: coupon.image_url || coupon.imageUrl,
      affiliateUrl: coupon.affiliate_url || coupon.affiliateUrl || coupon.url,
      startDate: coupon.start_date || coupon.startDate || new Date().toISOString(),
      endDate: coupon.end_date || coupon.endDate,
      isActive: coupon.is_active !== undefined ? coupon.is_active : coupon.isActive !== undefined ? coupon.isActive : true,
      isVerified: coupon.is_verified !== undefined ? coupon.is_verified : coupon.isVerified !== undefined ? coupon.isVerified : false,
      conditions: coupon.conditions || coupon.terms,
      minOrderValue: coupon.min_order_value || coupon.minOrderValue,
      maxDiscount: coupon.max_discount || coupon.maxDiscount,
      usageLimit: coupon.usage_limit || coupon.usageLimit,
      usedCount: coupon.used_count || coupon.usedCount || 0,
      tags: coupon.tags || [],
      createdAt: coupon.created_at || coupon.createdAt || new Date().toISOString(),
      updatedAt: coupon.updated_at || coupon.updatedAt || new Date().toISOString()
    };
  }

  /**
   * Создание записи о статусе синхронизации
   */
  private async createSyncStatus(couponId: string, syncType: 'create' | 'update' | 'delete', status: 'completed' | 'failed', errorMessage?: string): Promise<void> {
    await this.couponSyncRepository.createSyncStatus({
      couponId,
      syncType,
      status,
      errorMessage,
      attempts: 1,
      maxAttempts: 3,
      syncedAt: status === 'completed' ? new Date() : undefined
    });
  }

  /**
   * Создание записи об ошибке синхронизации
   */
  private async createSyncError(externalId: string, syncType: 'create' | 'update' | 'delete', errorMessage: string): Promise<void> {
    await this.couponSyncRepository.createSyncStatus({
      couponId: externalId, // Используем external ID если купон еще не создан
      syncType,
      status: 'failed',
      errorMessage,
      attempts: 1,
      maxAttempts: 3,
      nextRetryAt: new Date(Date.now() + 60 * 60 * 1000) // Повтор через час
    });
  }

  /**
   * Обработка неудачных синхронизаций
   */
  async retryFailedSyncs(): Promise<void> {
    try {
      const failedSyncs = await this.couponSyncRepository.getPendingSyncTasks(50);
      this.logger.info(`Retrying ${failedSyncs.length} failed syncs`);

      for (const syncTask of failedSyncs) {
        try {
          await this.retrySyncTask(syncTask);
        } catch (error) {
          this.logger.error(`Failed to retry sync task ${syncTask.id}:`, error);
        }
      }
    } catch (error) {
      this.logger.error('Failed to retry failed syncs:', error);
      throw error;
    }
  }

  /**
   * Повтор задачи синхронизации
   */
  private async retrySyncTask(syncTask: CouponSyncStatus): Promise<void> {
    try {
      // Увеличиваем счетчик попыток
      const newAttempts = syncTask.attempts + 1;
      
      if (newAttempts >= syncTask.maxAttempts) {
        // Превышено максимальное количество попыток
        await this.couponSyncRepository.updateSyncStatus(syncTask.id, {
          status: 'failed',
          attempts: newAttempts,
          errorMessage: `Max attempts (${syncTask.maxAttempts}) exceeded`
        });
        return;
      }

      // Обновляем статус на "processing"
      await this.couponSyncRepository.updateSyncStatus(syncTask.id, {
        status: 'processing',
        attempts: newAttempts
      });

      // Здесь должна быть логика повтора конкретной операции
      // В зависимости от syncType (create, update, delete)
      
      // Для примера, помечаем как завершенную
      await this.couponSyncRepository.updateSyncStatus(syncTask.id, {
        status: 'completed',
        syncedAt: new Date()
      });

    } catch (error) {
      // Обновляем статус ошибки
      const nextRetryAt = new Date(Date.now() + Math.pow(2, syncTask.attempts) * 60 * 60 * 1000); // Экспоненциальная задержка
      
      await this.couponSyncRepository.updateSyncStatus(syncTask.id, {
        status: 'failed',
        attempts: syncTask.attempts + 1,
        errorMessage: error.message,
        nextRetryAt
      });
      
      throw error;
    }
  }

  /**
   * Получение статистики синхронизации
   */
  async getSyncStats(): Promise<{
    totalCoupons: number;
    activeCoupons: number;
    pendingSyncs: number;
    failedSyncs: number;
    lastSyncTime?: Date;
  }> {
    // Здесь должны быть запросы к базе данных для получения статистики
    // Для примера возвращаем заглушку
    return {
      totalCoupons: 0,
      activeCoupons: 0,
      pendingSyncs: 0,
      failedSyncs: 0
    };
  }
}
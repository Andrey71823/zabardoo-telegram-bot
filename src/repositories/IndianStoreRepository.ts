import { Pool } from 'pg';
import { IndianStore, StoreCategory, RegionalPreference, StoreIntegration, IndianMarketData, FestivalCalendar } from '../models/IndianStore';
import { BaseRepository } from './base/BaseRepository';

export class IndianStoreRepository extends BaseRepository {
  constructor(pool: Pool) {
    super(pool);
  }

  // Indian Store CRUD operations
  async createIndianStore(store: Omit<IndianStore, 'id' | 'createdAt' | 'updatedAt'>): Promise<IndianStore> {
    const query = `
      INSERT INTO indian_stores (
        name, display_name, domain, logo, description, categories, is_popular,
        popularity_rank, region, languages, payment_methods, delivery_info,
        affiliate_info, special_features, seasonal_info, target_audience,
        metrics, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `;

    const values = [
      store.name, store.displayName, store.domain, store.logo, store.description,
      JSON.stringify(store.categories), store.isPopular, store.popularityRank,
      store.region, JSON.stringify(store.languages), JSON.stringify(store.paymentMethods),
      JSON.stringify(store.deliveryInfo), JSON.stringify(store.affiliateInfo),
      JSON.stringify(store.specialFeatures), 
const BaseAPIService = require('../base-api-service');
const config = require('../../config/api-config');
const querystring = require('querystring');

class MapsService extends BaseAPIService {
  constructor() {
    super(config);
  }

  // Получить ближайшие магазины
  async getNearbyStores(lat, lng, category, options = {}) {
    const cacheKey = this.generateCacheKey('stores', { lat, lng, category, ...options });
    const cached = this.getCache(cacheKey);

    if (cached) {
      return cached;
    }

    const stores = await this.searchNearbyStores(lat, lng, category, options);
    this.setCache(cacheKey, stores, config.CACHE.TTL_MAPS);

    return stores;
  }

  // Поиск ближайших магазинов через Google Places API
  async searchNearbyStores(lat, lng, category, options) {
    const apiKey = config.API_KEYS.GOOGLE_MAPS_API_KEY;
    const radius = options.radius || 5000; // 5km
    const keyword = this.getStoreKeyword(category);

    const url = `${config.API_ENDPOINTS.GOOGLE_MAPS}/place/nearbysearch/json?${querystring.stringify({
      location: `${lat},${lng}`,
      radius: radius,
      keyword: keyword,
      key: apiKey,
      type: 'store',
      rankby: 'prominence'
    })}`;

    try {
      const response = await this.makeRequest(url);
      return this.parseGooglePlacesResponse(response, category);
    } catch (error) {
      console.error('Google Maps API error:', error);
      return this.getFallbackStores(category);
    }
  }

  // Получить детали магазина
  async getStoreDetails(placeId) {
    const cacheKey = this.generateCacheKey('store_details', { placeId });
    const cached = this.getCache(cacheKey);

    if (cached) {
      return cached;
    }

    const apiKey = config.API_KEYS.GOOGLE_MAPS_API_KEY;
    const url = `${config.API_ENDPOINTS.GOOGLE_MAPS}/place/details/json?${querystring.stringify({
      place_id: placeId,
      fields: 'name,formatted_address,formatted_phone_number,opening_hours,website,rating,reviews,photos',
      key: apiKey
    })}`;

    try {
      const response = await this.makeRequest(url);
      const details = this.parseStoreDetails(response);
      this.setCache(cacheKey, details, config.CACHE.TTL_MAPS);
      return details;
    } catch (error) {
      console.error('Store details API error:', error);
      return null;
    }
  }

  // Получить расстояние и время пути
  async getDistanceMatrix(origins, destinations, mode = 'driving') {
    const apiKey = config.API_KEYS.GOOGLE_MAPS_API_KEY;
    const url = `${config.API_ENDPOINTS.GOOGLE_MAPS}/distancematrix/json?${querystring.stringify({
      origins: origins.join('|'),
      destinations: destinations.join('|'),
      mode: mode,
      units: 'metric',
      key: apiKey
    })}`;

    try {
      const response = await this.makeRequest(url);
      return this.parseDistanceMatrix(response);
    } catch (error) {
      console.error('Distance Matrix API error:', error);
      return null;
    }
  }

  // Геокодирование адреса
  async geocodeAddress(address) {
    const cacheKey = this.generateCacheKey('geocode', { address });
    const cached = this.getCache(cacheKey);

    if (cached) {
      return cached;
    }

    const apiKey = config.API_KEYS.GOOGLE_MAPS_API_KEY;
    const url = `${config.API_ENDPOINTS.GOOGLE_MAPS}/geocode/json?${querystring.stringify({
      address: address,
      key: apiKey
    })}`;

    try {
      const response = await this.makeRequest(url);
      const result = this.parseGeocodeResponse(response);
      this.setCache(cacheKey, result, config.CACHE.TTL_MAPS);
      return result;
    } catch (error) {
      console.error('Geocoding API error:', error);
      return null;
    }
  }

  // Парсинг ответа Google Places API
  parseGooglePlacesResponse(response, category) {
    if (!response.results) return [];

    return response.results.map(place => ({
      id: place.place_id,
      name: place.name,
      address: place.vicinity,
      rating: place.rating || 0,
      userRatingsTotal: place.user_ratings_total || 0,
      priceLevel: place.price_level,
      location: {
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng
      },
      photos: place.photos?.map(photo => ({
        photoReference: photo.photo_reference,
        width: photo.width,
        height: photo.height
      })) || [],
      types: place.types,
      category: category,
      source: 'google_maps',
      openNow: place.opening_hours?.open_now,
      permanentlyClosed: place.permanently_closed
    }));
  }

  // Парсинг деталей магазина
  parseStoreDetails(response) {
    if (!response.result) return null;

    const result = response.result;
    return {
      name: result.name,
      address: result.formatted_address,
      phone: result.formatted_phone_number,
      website: result.website,
      rating: result.rating,
      reviews: result.reviews?.map(review => ({
        author: review.author_name,
        rating: review.rating,
        text: review.text,
        time: review.time
      })) || [],
      openingHours: result.opening_hours?.weekday_text || [],
      photos: result.photos?.map(photo => photo.photo_reference) || [],
      isOpen: result.opening_hours?.open_now
    };
  }

  // Парсинг Distance Matrix
  parseDistanceMatrix(response) {
    if (!response.rows || response.rows.length === 0) return null;

    return response.rows[0].elements.map((element, index) => ({
      destinationIndex: index,
      distance: element.distance?.text,
      distanceValue: element.distance?.value,
      duration: element.duration?.text,
      durationValue: element.duration?.value,
      status: element.status
    }));
  }

  // Парсинг геокодирования
  parseGeocodeResponse(response) {
    if (!response.results || response.results.length === 0) return null;

    const result = response.results[0];
    return {
      address: result.formatted_address,
      location: {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng
      },
      placeId: result.place_id,
      types: result.types
    };
  }

  // Ключевые слова для поиска магазинов по категориям
  getStoreKeyword(category) {
    const keywords = {
      electronics: 'electronics store mobile phone computer laptop',
      fashion: 'clothing store fashion boutique shopping mall',
      food: 'restaurant cafe food delivery grocery store supermarket',
      shoes: 'shoe store footwear boutique',
      accessories: 'jewelry store watch store accessory shop boutique'
    };

    return keywords[category] || 'store shop';
  }

  // Fallback магазины на случай недоступности API
  getFallbackStores(category) {
    const fallbacks = {
      electronics: [
        {
          id: 'fallback_electronics_1',
          name: 'Croma',
          address: 'Connaught Place, New Delhi',
          rating: 4.2,
          category: 'electronics',
          source: 'fallback'
        },
        {
          id: 'fallback_electronics_2',
          name: 'Reliance Digital',
          address: 'Karol Bagh, New Delhi',
          rating: 4.0,
          category: 'electronics',
          source: 'fallback'
        }
      ],
      fashion: [
        {
          id: 'fallback_fashion_1',
          name: 'Pantaloons',
          address: 'Rajouri Garden, New Delhi',
          rating: 4.1,
          category: 'fashion',
          source: 'fallback'
        },
        {
          id: 'fallback_fashion_2',
          name: 'Westside',
          address: 'DLF Mall, New Delhi',
          rating: 4.3,
          category: 'fashion',
          source: 'fallback'
        }
      ]
    };

    return fallbacks[category] || [];
  }
}

module.exports = MapsService;


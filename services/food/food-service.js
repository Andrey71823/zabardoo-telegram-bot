const BaseAPIService = require('../base-api-service');
const config = require('../../config/api-config');

class FoodService extends BaseAPIService {
  constructor() {
    super(config);
    this.sources = {
      zomato: this.fetchZomatoRestaurants.bind(this),
      swiggy: this.fetchSwiggyRestaurants.bind(this),
    };
  }

  // Получить рестораны рядом
  async getNearbyRestaurants(lat, lng, options = {}) {
    const cacheKey = this.generateCacheKey('restaurants', { lat, lng, ...options });
    const cached = this.getCache(cacheKey);

    if (cached) {
      return cached;
    }

    const restaurants = await this.fetchFromAllSources(lat, lng, options);
    this.setCache(cacheKey, restaurants, config.CACHE.TTL_FOOD);

    return restaurants;
  }

  // Получить предложения по еде
  async getFoodDeals(options = {}) {
    const cacheKey = this.generateCacheKey('food_deals', options);
    const cached = this.getCache(cacheKey);

    if (cached) {
      return cached;
    }

    const deals = await this.fetchFoodDeals(options);
    this.setCache(cacheKey, deals, config.CACHE.TTL_FOOD);

    return deals;
  }

  // Получить рестораны из всех источников
  async fetchFromAllSources(lat, lng, options) {
    const allRestaurants = [];

    for (const [source, fetcher] of Object.entries(this.sources)) {
      try {
        const restaurants = await fetcher(lat, lng, options);
        allRestaurants.push(...restaurants);
      } catch (error) {
        console.error(`Error fetching restaurants from ${source}:`, error.message);
      }
    }

    // Удаляем дубликаты и сортируем по рейтингу
    const unique = this.removeDuplicates(allRestaurants);
    return unique
      .sort((a, b) => b.rating - a.rating)
      .slice(0, options.limit || 15);
  }

  // Zomato API интеграция
  async fetchZomatoRestaurants(lat, lng, options) {
    const url = `${config.API_ENDPOINTS.ZOMATO}/search`;
    const params = {
      lat: lat,
      lon: lng,
      radius: options.radius || 2000, // 2km
      sort: 'rating',
      order: 'desc',
      count: 20
    };

    try {
      const response = await this.makeRequest(`${url}?${querystring.stringify(params)}`, {
        headers: {
          'user-key': config.API_KEYS.ZOMATO_API_KEY,
          'Accept': 'application/json'
        }
      });

      return this.parseZomatoResponse(response);
    } catch (error) {
      console.error('Zomato API error:', error);
      return this.getFallbackRestaurants('zomato');
    }
  }

  // Swiggy API интеграция
  async fetchSwiggyRestaurants(lat, lng, options) {
    const url = `${config.API_ENDPOINTS.SWIGGY}/restaurants/list/v5`;
    const payload = {
      lat: lat,
      lng: lng,
      is_seo_homepage_enabled: true,
      includePreOrder: true
    };

    try {
      const response = await this.makeRequest(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        data: payload
      });

      return this.parseSwiggyResponse(response);
    } catch (error) {
      console.error('Swiggy API error:', error);
      return this.getFallbackRestaurants('swiggy');
    }
  }

  // Получить акции и скидки на еду
  async fetchFoodDeals(options) {
    const deals = [];

    // Zomato deals
    try {
      const zomatoDeals = await this.fetchZomatoDeals();
      deals.push(...zomatoDeals);
    } catch (error) {
      console.error('Zomato deals error:', error);
    }

    // Swiggy deals
    try {
      const swiggyDeals = await this.fetchSwiggyDeals();
      deals.push(...swiggyDeals);
    } catch (error) {
      console.error('Swiggy deals error:', error);
    }

    return deals;
  }

  // Парсинг ответов от Zomato
  parseZomatoResponse(response) {
    if (!response.restaurants) return [];

    return response.restaurants.map(restaurant => ({
      id: restaurant.restaurant.id,
      name: restaurant.restaurant.name,
      cuisines: restaurant.restaurant.cuisines,
      rating: parseFloat(restaurant.restaurant.user_rating.aggregate_rating),
      votes: restaurant.restaurant.user_rating.votes,
      priceRange: restaurant.restaurant.price_range,
      currency: restaurant.restaurant.currency,
      location: {
        address: restaurant.restaurant.location.address,
        locality: restaurant.restaurant.location.locality,
        city: restaurant.restaurant.location.city,
        latitude: restaurant.restaurant.location.latitude,
        longitude: restaurant.restaurant.location.longitude
      },
      photos: restaurant.restaurant.photos_url,
      menu: restaurant.restaurant.menu_url,
      featuredImage: restaurant.restaurant.featured_image,
      hasOnlineDelivery: restaurant.restaurant.has_online_delivery,
      isDeliveringNow: restaurant.restaurant.is_delivering_now,
      source: 'zomato',
      deliveryTime: restaurant.restaurant.delivery_time || '30-45 мин'
    }));
  }

  // Парсинг ответов от Swiggy
  parseSwiggyResponse(response) {
    if (!response?.data?.cards) return [];

    const restaurants = [];

    response.data.cards.forEach(card => {
      if (card?.card?.card?.gridElements?.infoWithStyle?.restaurants) {
        card.card.card.gridElements.infoWithStyle.restaurants.forEach(restaurant => {
          restaurants.push({
            id: restaurant.info.id,
            name: restaurant.info.name,
            cuisines: restaurant.info.cuisines?.join(', '),
            rating: parseFloat(restaurant.info.avgRatingString || 0),
            votes: restaurant.info.totalRatingsString,
            priceRange: restaurant.info.costForTwo,
            currency: '₹',
            location: {
              address: restaurant.info.locality,
              locality: restaurant.info.areaName,
              city: restaurant.info.city
            },
            photos: restaurant.info.cloudinaryImageId,
            menu: restaurant.cta?.link,
            featuredImage: `https://res.cloudinary.com/swiggy/image/upload/${restaurant.info.cloudinaryImageId}`,
            hasOnlineDelivery: restaurant.info.isOpen,
            isDeliveringNow: true,
            source: 'swiggy',
            deliveryTime: restaurant.info.sla?.deliveryTime || '25-35 мин'
          });
        });
      }
    });

    return restaurants;
  }

  // Получить акции от Zomato
  async fetchZomatoDeals() {
    const url = `${config.API_ENDPOINTS.ZOMATO}/collections`;

    try {
      const response = await this.makeRequest(url, {
        headers: {
          'user-key': config.API_KEYS.ZOMATO_API_KEY
        }
      });

      return this.parseZomatoDeals(response);
    } catch (error) {
      return [];
    }
  }

  // Fallback рестораны
  getFallbackRestaurants(source) {
    return [
      {
        id: `fallback_${source}_1`,
        name: 'Domino\'s Pizza',
        cuisines: 'Pizza, Italian',
        rating: 4.2,
        votes: '500+',
        priceRange: 2,
        currency: '₹',
        location: {
          address: 'Connaught Place, New Delhi',
          locality: 'Connaught Place',
          city: 'New Delhi'
        },
        hasOnlineDelivery: true,
        isDeliveringNow: true,
        source: source,
        deliveryTime: '25-35 мин'
      },
      {
        id: `fallback_${source}_2`,
        name: 'McDonald\'s',
        cuisines: 'Burger, Fast Food',
        rating: 4.1,
        votes: '800+',
        priceRange: 2,
        currency: '₹',
        location: {
          address: 'Karol Bagh, New Delhi',
          locality: 'Karol Bagh',
          city: 'New Delhi'
        },
        hasOnlineDelivery: true,
        isDeliveringNow: true,
        source: source,
        deliveryTime: '15-25 мин'
      }
    ];
  }

  // Удаление дубликатов ресторанов
  removeDuplicates(restaurants) {
    const seen = new Set();
    return restaurants.filter(restaurant => {
      const key = `${restaurant.name}_${restaurant.location.city}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  // Парсинг акций от Zomato
  parseZomatoDeals(response) {
    if (!response.collections) return [];

    return response.collections.map(collection => ({
      id: collection.collection.collection_id,
      title: collection.collection.title,
      description: collection.collection.description,
      imageUrl: collection.collection.image_url,
      restaurantsCount: collection.collection.res_count,
      source: 'zomato'
    }));
  }
}

module.exports = FoodService;


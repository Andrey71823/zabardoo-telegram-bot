const BaseAPIService = require('../base-api-service');
const config = require('../../config/api-config');

class ProductsService extends BaseAPIService {
  constructor() {
    super(config);
    this.sources = {
      flipkart: this.fetchFlipkartProducts.bind(this),
      amazon: this.fetchAmazonProducts.bind(this),
      myntra: this.fetchMyntraProducts.bind(this),
    };
  }

  // Получить товары по категории
  async getProducts(category, options = {}) {
    const cacheKey = this.generateCacheKey('products', { category, ...options });
    const cached = this.getCache(cacheKey);

    if (cached) {
      return cached;
    }

    const products = await this.fetchFromAllSources(category, options);
    this.setCache(cacheKey, products, config.CACHE.TTL_PRODUCTS);

    return products;
  }

  // Получить товары из всех источников
  async fetchFromAllSources(category, options) {
    const allProducts = [];

    for (const [source, fetcher] of Object.entries(this.sources)) {
      try {
        const products = await fetcher(category, options);
        allProducts.push(...products);
      } catch (error) {
        console.error(`Error fetching from ${source}:`, error.message);
      }
    }

    // Сортировка по скидке (от большей к меньшей)
    return allProducts
      .sort((a, b) => b.discountPercent - a.discountPercent)
      .slice(0, options.limit || 20);
  }

  // Flipkart API интеграция
  async fetchFlipkartProducts(category, options) {
    const affiliateId = config.API_KEYS.FLIPKART_AFFILIATE_ID;
    const url = `${config.API_ENDPOINTS.FLIPKART}/feeds/${affiliateId}/category/${category}.json`;

    try {
      const response = await this.makeRequest(url, {
        headers: {
          'Fk-Affiliate-Id': affiliateId,
          'Fk-Affiliate-Token': config.API_KEYS.FLIPKART_AFFILIATE_TOKEN
        }
      });

      return this.parseFlipkartResponse(response, category);
    } catch (error) {
      console.error('Flipkart API error:', error);
      return this.getFallbackProducts(category, 'flipkart');
    }
  }

  // Amazon API интеграция
  async fetchAmazonProducts(category, options) {
    const params = {
      Service: 'AWSECommerceService',
      Operation: 'ItemSearch',
      SearchIndex: this.mapCategoryToAmazon(category),
      Keywords: options.query || '',
      ResponseGroup: 'ItemAttributes,Offers,Images',
      AssociateTag: config.API_KEYS.AMAZON_ASSOCIATE_TAG
    };

    try {
      const signedUrl = this.signAmazonRequest(params);
      const response = await this.makeRequest(signedUrl);

      return this.parseAmazonResponse(response, category);
    } catch (error) {
      console.error('Amazon API error:', error);
      return this.getFallbackProducts(category, 'amazon');
    }
  }

  // Myntra API интеграция
  async fetchMyntraProducts(category, options) {
    const url = `${config.API_ENDPOINTS.MYNTRA}/products`;
    const params = {
      category: category,
      sort: 'discount',
      page: options.page || 1,
      perPage: 20
    };

    try {
      const response = await this.makeRequest(`${url}?${querystring.stringify(params)}`, {
        headers: {
          'Authorization': `Bearer ${config.API_KEYS.MYNTRA_API_KEY}`
        }
      });

      return this.parseMyntraResponse(response, category);
    } catch (error) {
      console.error('Myntra API error:', error);
      return this.getFallbackProducts(category, 'myntra');
    }
  }

  // Парсинг ответов от разных API
  parseFlipkartResponse(response, category) {
    if (!response.products) return [];

    return response.products.map(product => ({
      id: product.productId,
      title: product.productBaseInfoV1.title,
      price: product.productBaseInfoV1.flipkartSpecialPrice || product.productBaseInfoV1.maximumRetailPrice,
      originalPrice: product.productBaseInfoV1.maximumRetailPrice,
      discountPercent: product.productBaseInfoV1.discountPercentage || 0,
      imageUrl: product.productBaseInfoV1.imageUrls?.['400x400'] || '',
      affiliateUrl: product.productBaseInfoV1.productUrl,
      source: 'flipkart',
      category: category,
      rating: product.productBaseInfoV1.averageRating || 0,
      brand: product.productBaseInfoV1.productBrand
    }));
  }

  parseAmazonResponse(response, category) {
    if (!response.Items?.Item) return [];

    return response.Items.Item.map(item => ({
      id: item.ASIN[0],
      title: item.ItemAttributes[0].Title[0],
      price: parseFloat(item.ItemAttributes[0].ListPrice?.[0].Amount[0] || 0) / 100,
      originalPrice: parseFloat(item.ItemAttributes[0].ListPrice?.[0].Amount[0] || 0) / 100,
      discountPercent: 0, // Amazon редко показывает скидки в API
      imageUrl: item.LargeImage?.[0].URL[0] || '',
      affiliateUrl: item.DetailPageURL[0],
      source: 'amazon',
      category: category,
      rating: parseFloat(item.CustomerReviews?.[0].AverageRating?.[0] || 0),
      brand: item.ItemAttributes[0].Brand?.[0] || ''
    }));
  }

  parseMyntraResponse(response, category) {
    if (!response.data) return [];

    return response.data.map(product => ({
      id: product.id,
      title: product.name,
      price: product.price,
      originalPrice: product.mrp,
      discountPercent: product.discount || 0,
      imageUrl: product.images?.[0]?.url || '',
      affiliateUrl: product.url,
      source: 'myntra',
      category: category,
      rating: product.rating || 0,
      brand: product.brand
    }));
  }

  // Fallback данные на случай если API недоступны
  getFallbackProducts(category, source) {
    const fallbacks = {
      electronics: [
        {
          id: `fallback_${source}_1`,
          title: 'iPhone 15 Pro',
          price: 134900,
          originalPrice: 139900,
          discountPercent: 3,
          source: source,
          category: 'electronics'
        }
      ],
      fashion: [
        {
          id: `fallback_${source}_2`,
          title: 'Nike Air Max',
          price: 12999,
          originalPrice: 15999,
          discountPercent: 18,
          source: source,
          category: 'fashion'
        }
      ]
    };

    return fallbacks[category] || [];
  }

  // Маппинг категорий для Amazon
  mapCategoryToAmazon(category) {
    const mapping = {
      electronics: 'Electronics',
      fashion: 'Fashion',
      shoes: 'Shoes',
      accessories: 'Jewelry'
    };
    return mapping[category] || 'All';
  }

  // Подпись запроса для Amazon API
  signAmazonRequest(params) {
    // Amazon требует специальной подписи запросов
    // Это упрощенная версия, в реальности нужна полная реализация
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${encodeURIComponent(params[key])}`)
      .join('&');

    return `${config.API_ENDPOINTS.AMAZON}/onca/xml?${sortedParams}`;
  }
}

module.exports = ProductsService;


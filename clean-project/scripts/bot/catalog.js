const fs = require('fs');
const path = require('path');

const DATA_FILE = path.resolve(__dirname, '..', '..', 'data', 'sample-products.json');

const CATEGORIES = [
  { id: 'electronics', icon: '📱', labels: { ru: 'Электроника', en: 'Electronics', hi: 'Electronics' } },
  { id: 'fashion', icon: '👗', labels: { ru: 'Одежда', en: 'Fashion', hi: 'Fashion' } },
  { id: 'beauty', icon: '💄', labels: { ru: 'Красота', en: 'Beauty', hi: 'Beauty' } },
  { id: 'sports', icon: '🏃', labels: { ru: 'Спорт', en: 'Sports', hi: 'Sports' } },
  { id: 'home', icon: '🏠', labels: { ru: 'Дом и техника', en: 'Home & Living', hi: 'Home & Living' } }
];

const STORES = [
  {
    id: 'flipkart',
    name: 'Flipkart',
    icon: '🛒',
    url: 'https://www.flipkart.com',
    tagline: {
      ru: 'Официальные скидки Flipkart + бонусы за онлайн-оплату',
      en: 'Official Flipkart offers with online payment bonuses',
      hi: 'Flipkart ki official deals, online payment bonus ke saath'
    }
  },
  {
    id: 'amazon',
    name: 'Amazon India',
    icon: '📦',
    url: 'https://www.amazon.in',
    tagline: {
      ru: 'Prime-доставка и банковский кешбэк',
      en: 'Prime delivery + bank cashback bundles',
      hi: 'Prime delivery aur bank cashback combo'
    }
  },
  {
    id: 'myntra',
    name: 'Myntra',
    icon: '🛍️',
    url: 'https://www.myntra.com',
    tagline: {
      ru: 'Мода с extra-coupon и бесплатными возвратами',
      en: 'Fashion with extra coupons and free returns',
      hi: 'Fashion deals, extra coupon aur free return'
    }
  },
  {
    id: 'ajio',
    name: 'Ajio',
    icon: '👟',
    url: 'https://www.ajio.com',
    tagline: {
      ru: 'Аутлет-скидки и бонусы за первый заказ',
      en: 'Outlet-level prices + first order bonus',
      hi: 'Outlet waali prices, first order bonus'
    }
  },
  {
    id: 'croma',
    name: 'Croma',
    icon: '🔌',
    url: 'https://www.croma.com',
    tagline: {
      ru: 'Техника с официальной гарантией',
      en: 'Electronics with authorised warranty',
      hi: 'Electronics official warranty ke saath'
    }
  },
  {
    id: 'nykaa',
    name: 'Nykaa',
    icon: '💅',
    url: 'https://www.nykaa.com',
    tagline: {
      ru: 'Красота и уход с эксклюзивными наборами',
      en: 'Beauty & care with exclusive bundles',
      hi: 'Beauty aur skincare exclusive bundles'
    }
  }
];

const numberOnly = (value) => {
  if (value === undefined || value === null) return null;
  const cleaned = String(value).replace(/[^0-9.]/g, '');
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
};

const loadProducts = () => {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data)
      ? data.map((item) => ({
          ...item,
          lastChecked: item.lastChecked || new Date().toISOString()
        }))
      : [];
  } catch (error) {
    console.error('Failed to load sample products:', error.message);
    return [];
  }
};

const tokenize = (text) => {
  if (!text) return [];
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token && token.length > 1);
};

const matchesTokens = (product, tokens) => {
  if (!tokens.length) return true;
  const haystack = [
    product.name,
    product.brand,
    product.category,
    product.store,
    ...(product.tags || [])
  ]
    .join(' ')
    .toLowerCase();
  return tokens.every((token) => haystack.includes(token));
};

const rankProducts = (products) => {
  return products
    .slice()
    .sort((a, b) => {
      const discountDiff = (b.discountPercent || 0) - (a.discountPercent || 0);
      if (discountDiff !== 0) return discountDiff;
      const cashbackDiff = (b.cashbackPercent || 0) - (a.cashbackPercent || 0);
      if (cashbackDiff !== 0) return cashbackDiff;
      const priceDiff = (a.price || Infinity) - (b.price || Infinity);
      if (priceDiff !== 0) return priceDiff;
      const dateA = new Date(a.lastChecked || 0).getTime();
      const dateB = new Date(b.lastChecked || 0).getTime();
      return dateB - dateA;
    });
};

const searchProducts = (products, rawQuery, options = {}) => {
  const query = String(rawQuery || '').trim();
  const tokens = tokenize(query);
  const budgetFromQuery = numberOnly(query);
  const limit = options.limit || 10;
  const favorites = new Set(options.favorites || []);
  const budgetLimit = options.budget || budgetFromQuery;

  const filtered = products.filter((product) => {
    if (budgetLimit && product.price && Number(product.price) > budgetLimit) {
      return false;
    }
    if (favorites.size && !favorites.has(product.category)) {
      return false;
    }
    if (options.category && product.category !== options.category) {
      return false;
    }
    return matchesTokens(product, tokens);
  });

  const ranked = rankProducts(filtered);
  return {
    items: ranked.slice(0, limit),
    total: ranked.length
  };
};

const getDealsByCategory = (products, categoryId) => {
  const filtered = products.filter((product) => product.category === categoryId);
  return rankProducts(filtered);
};

const getDealsByStore = (products, storeId) => {
  const filtered = products.filter((product) => {
    if (product.storeSlug) {
      return product.storeSlug === storeId;
    }
    return (product.store || '').toLowerCase().includes(storeId);
  });
  return rankProducts(filtered);
};

const getHotDeals = (products, limit = 25) => {
  return products
    .slice()
    .sort((a, b) => new Date(b.lastChecked || 0) - new Date(a.lastChecked || 0))
    .slice(0, limit);
};

const getStoreById = (storeId) => STORES.find((store) => store.id === storeId);
const getCategoryById = (categoryId) => CATEGORIES.find((category) => category.id === categoryId);

module.exports = {
  loadProducts,
  searchProducts,
  rankProducts,
  getDealsByCategory,
  getDealsByStore,
  getHotDeals,
  CATEGORIES,
  STORES,
  getStoreById,
  getCategoryById
};

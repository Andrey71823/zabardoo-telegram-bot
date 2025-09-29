const { getLocale, translate } = require('./i18n');

const formatCurrency = (value, lang = 'en') => {
  if (value === undefined || value === null) {
    return '--';
  }
  const locale = getLocale(lang);
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(Number(value));
  } catch (error) {
    return `₹${Number(value).toFixed(0)}`;
  }
};

const formatPercent = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return '--';
  }
  return `${num}%`;
};

const formatDateTime = (value, lang = 'en') => {
  if (!value) {
    return '--';
  }
  const locale = getLocale(lang);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  } catch (error) {
    return date.toISOString();
  }
};

const getDiscountLabel = (product, lang) => {
  if (product.discountPercent) {
    return `-${formatPercent(product.discountPercent)}`;
  }
  if (product.originalPrice && product.price && product.originalPrice > product.price) {
    const percent = Math.round(100 - (product.price / product.originalPrice) * 100);
    if (percent > 0) {
      return `-${percent}%`;
    }
  }
  return translate(lang, 'product.discountFallback');
};

const getCouponSavings = (product, lang) => {
  if (!product.couponCode) {
    return translate(lang, 'product.savingsFallback');
  }
  if (product.couponType === 'percent' && product.couponValue) {
    return formatPercent(product.couponValue);
  }
  if (product.couponType === 'amount' && product.couponValue) {
    return formatCurrency(product.couponValue, lang);
  }
  return translate(lang, 'product.savingsFallback');
};

const buildComparisons = (product, lang) => {
  if (!product.storePrices || !product.storePrices.length) {
    return null;
  }
  const comparisons = product.storePrices
    .map((item) => `${item.store} ${formatCurrency(item.price, lang)}`)
    .join(' | ');
  return translate(lang, 'product.storeComparisons', { comparisons });
};

const formatProductEntry = (product, index, lang = 'en') => {
  const price = formatCurrency(product.price, lang);
  const original = product.originalPrice && product.originalPrice > product.price
    ? ` -> ${formatCurrency(product.originalPrice, lang)}`
    : '';
  const discountRaw = getDiscountLabel(product, lang);
  const discount = discountRaw && discountRaw !== translate(lang, 'product.discountFallback')
    ? ` • ${discountRaw}`
    : '';

  const lines = [
    translate(lang, 'product.headline', {
      index,
      icon: product.icon || '🛍️',
      link: product.link || product.url || product.affiliateUrl || '#',
      name: product.name
    }),
    translate(lang, 'product.priceLine', { price, original, discount }),
    translate(lang, 'product.storeLine', {
      store: product.store,
      brand: product.brand || product.category || '--'
    })
  ];

  if (product.couponCode) {
    lines.push(
      translate(lang, 'product.couponLine', {
        code: product.couponCode,
        savings: getCouponSavings(product, lang)
      })
    );
  } else {
    lines.push(translate(lang, 'product.noCoupon'));
  }

  const comparisons = buildComparisons(product, lang);
  if (comparisons) {
    lines.push(comparisons);
  }

  if (product.minOrder) {
    lines.push(
      translate(lang, 'product.minOrderLine', {
        minOrder: formatCurrency(product.minOrder, lang)
      })
    );
  }

  lines.push(
    translate(lang, 'product.lastCheckedLine', {
      datetime: formatDateTime(product.lastChecked, lang)
    })
  );

  if (product.highlights && product.highlights.length) {
    lines.push(
      translate(lang, 'product.highlightsLine', {
        list: product.highlights.slice(0, 2).join(' | ')
      })
    );
  }

  return lines.join('\n');
};

module.exports = {
  formatCurrency,
  formatPercent,
  formatDateTime,
  formatProductEntry,
  getDiscountLabel,
  getCouponSavings
};

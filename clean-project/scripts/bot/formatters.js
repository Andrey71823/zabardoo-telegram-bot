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

/**
 * Чистый формат карточки товара с воздухом между строками
 */
const formatProductEntry = (product, index, lang = 'en') => {
  const price = formatCurrency(product.price, lang);
  const originalPrice = product.originalPrice && product.originalPrice > product.price
    ? formatCurrency(product.originalPrice, lang)
    : null;
  const discountRaw = getDiscountLabel(product, lang);
  
  const link = product.link || product.url || product.affiliateUrl || '#';
  const icon = product.icon || '🛍️';
  
  const lines = [
    `${index}. ${icon} <a href="${link}"><b>${product.name}</b></a>`,
    '',
    `💰 <b>${price}</b>${originalPrice ? ` <s>${originalPrice}</s>` : ''} ${discountRaw !== translate(lang, 'product.discountFallback') ? ` <b>${discountRaw}</b>` : ''}`,
    `🏪 ${product.store}${product.brand ? ` • ${product.brand}` : ''}`
  ];

  // Промокод
  if (product.couponCode) {
    lines.push(`🎫 Promo code: <code>${product.couponCode}</code> (${getCouponSavings(product, lang)})`);
  } else {
    lines.push(`🎫 Promo code: auto-applied at checkout`);
  }

  // Сравнение цен
  if (product.storePrices && product.storePrices.length > 1) {
    const comparisons = product.storePrices
      .map(p => `${p.store} ${formatCurrency(p.price, lang)}`)
      .join(' | ');
    lines.push(`🛒 ${comparisons}`);
  }

  // Мин. заказ + дата в одну строку для компактности
  const extras = [];
  if (product.minOrder) {
    extras.push(`📦 Min: ${formatCurrency(product.minOrder, lang)}`);
  }
  if (product.lastChecked) {
    extras.push(`⏰ ${formatDateTime(product.lastChecked, lang)}`);
  }
  if (extras.length) {
    lines.push('');
    lines.push(extras.join('  •  '));
  }

  // Фишки товара
  if (product.highlights && product.highlights.length) {
    lines.push(`✨ ${product.highlights.slice(0, 2).join(' | ')}`);
  }

  return lines.join('\n');
};

/**
 * Детальный формат карточки (для одиночного просмотра)
 */
const formatProductDetailed = (product, lang = 'en') => {
  const price = formatCurrency(product.price, lang);
  const originalPrice = product.originalPrice && product.originalPrice > product.price
    ? formatCurrency(product.originalPrice, lang)
    : null;
  const discountRaw = getDiscountLabel(product, lang);
  
  const link = product.link || product.url || product.affiliateUrl || '#';
  const icon = product.icon || '🛍️';
  
  const lines = [
    `${icon} <a href="${link}"><b>${product.name}</b></a>`,
    '',
    `💰 <b>${price}</b>${originalPrice ? ` <s>${originalPrice}</s>` : ''} ${discountRaw !== translate(lang, 'product.discountFallback') ? `<b>${discountRaw}</b>` : ''}`,
    `🏪 ${product.store}${product.brand ? ` • ${product.brand}` : ''}`
  ];

  if (product.couponCode) {
    lines.push(`🎫 Промокод: <code>${product.couponCode}</code> (${getCouponSavings(product, lang)})`);
  }

  if (product.storePrices && product.storePrices.length > 1) {
    lines.push('');
    lines.push('📊 Сравнение цен:');
    product.storePrices.forEach(p => {
      const marker = p.store === product.store ? '✓' : '•';
      lines.push(`   ${marker} ${p.store}: ${formatCurrency(p.price, lang)}`);
    });
  }

  if (product.highlights && product.highlights.length) {
    lines.push('');
    lines.push(`✨ ${product.highlights.join(' • ')}`);
  }

  lines.push('');
  lines.push(`⏰ ${formatDateTime(product.lastChecked, lang)}`);

  return lines.join('\n');
};

module.exports = {
  formatCurrency,
  formatPercent,
  formatDateTime,
  formatProductEntry,
  formatProductDetailed,
  getDiscountLabel,
  getCouponSavings
};

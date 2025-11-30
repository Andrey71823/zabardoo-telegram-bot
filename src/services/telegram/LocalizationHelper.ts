type TranslationMap = Record<string, string>;

export interface LanguageMeta {
  native: string;
  english: string;
  emoji: string;
  locale: string;
}

export const LANGUAGE_META: Record<string, LanguageMeta> = {
  en: { native: 'English', english: 'English', emoji: '🇬🇧', locale: 'en-IN' },
  hi: { native: 'हिन्दी', english: 'Hindi', emoji: '🇮🇳', locale: 'hi-IN' },
  bn: { native: 'বাংলা', english: 'Bengali', emoji: '🇧🇩', locale: 'bn-IN' }
};

export const DEFAULT_LANGUAGE = 'en';

export const supportedLanguages = Object.keys(LANGUAGE_META);

const baseEnglishTranslations: TranslationMap = {
  'bot.name': 'BazaarGuru',
  'user.friend': 'friend',
  'start.welcome': '{greeting}, {name}! I am {botName}, your personal deal hunter for India.',
  'start.howItWorks': 'I aggregate live discounts from trusted stores like {stores}. We never sell products ourselves - every link opens the official store page.',
  'start.nextSteps': 'Browse hot deals, filter by category, search, or switch language using the buttons below.',
  'disclaimer.short': 'We show curated discounts from partner stores. Small selection today? It simply means only verified offers are live right now.',
  'menu.hotDeals': '🔥 Hot deals',
  'menu.categories': '🗂 Categories',
  'menu.stores': '🏬 Stores',
  'menu.search': '🔍 Search',
  'menu.language': '🌐 Language',
  'menu.help': 'ℹ️ About',
  'action.back': '⬅️ Main menu',
  'action.moreFromStore': 'More from {store}',
  'action.openDeal': 'Open in {store}',
  'help.title': 'Why shoppers love BazaarGuru',
  'help.point1': 'We check official stores like {stores} for real discounts, coupons, and cashback.',
  'help.point2': 'You buy directly from the store through affiliate links, so cashback is tracked automatically.',
  'help.point3': 'Only verified offers get through. If the list looks short today, expired deals were filtered out.',
  'help.point4': 'Set alerts for price drops or new coupons and never miss savings again.',
  'help.footer': 'Have questions? Just type them here and I\'ll help!',
  'language.pick': 'Choose a language below 👇',
  'language.current': 'Current language: {language}',
  'stores.listTitle': 'Available partner stores:',
  'stores.moreComing': 'More stores are being added soon. Stay tuned!',
  'message.hotDealsHeadline': '🔥 Today\'s top verified deals ({count})',
  'message.chooseCategory': 'Pick a category to see today\'s discounted highlights.',
  'message.storeDeals': 'Fresh offers from {store}:',
  'message.categoryDeals': 'Hand-picked {category} deals:',
  'message.resultsFor': 'Top matches for “{query}”:',
  'message.noDeals': 'No verified discounts at the moment. I\'ll keep looking – try again soon or search for a product.',
  'message.aggregatorNote': 'Reminder: BazaarGuru is your discount guide. Prices and stock are controlled by each store.',
  'search.prompt': '🔎 <b>Smart search in three ways</b>\n🎤 <b>Voice</b> – hold the mic and say “find iPhone 15 under 70k”.\n🖼️ <b>Photo</b> – drop a product picture and I\'ll match similar deals.\n⌨️ <b>Text</b> – type a brand, category, store or coupon code.\nSend me your query – I\'ll do the hunting.',
  'deal.price': '{current} (was {original})',
  'deal.discount': '{discount}% off',
  'deal.cashback': '{cashback}% extra cashback',
  'deal.store': 'Store: {store}',
  'deal.coupon': 'Promo code: {code}',
  'deal.noCoupon': 'No promo code needed',
  'deal.updated': 'Verified {time}',
  'deal.linkNotice': 'Tap the button to open the official store page.',
  'deal.limited': 'Limited stock – confirm on the store page.'
};

const translations: Record<string, TranslationMap> = {
  en: baseEnglishTranslations,
  hi: {
    ...baseEnglishTranslations,
    'menu.hotDeals': '🔥 बेहतरीन ऑफ़र',
    'menu.categories': '🗂 श्रेणियाँ',
    'menu.stores': '🏬 स्टोर',
    'menu.search': '🔍 खोज',
    'menu.language': '🌐 भाषा',
    'menu.help': 'ℹ️ सहायता',
    'language.pick': 'नीचे से भाषा चुनें 👇',
    'language.current': 'वर्तमान भाषा: {language}'
  },
  bn: {
    ...baseEnglishTranslations,
    'menu.hotDeals': '🔥 সেরা অফার',
    'menu.categories': '🗂 বিভাগ',
    'menu.stores': '🏬 দোকান',
    'menu.search': '🔍 সার্চ',
    'menu.language': '🌐 ভাষা',
    'menu.help': 'ℹ️ তথ্য',
    'language.pick': 'নীচে ভাষা নির্বাচন করুন 👇',
    'language.current': 'বর্তমান ভাষা: {language}'
  }
};

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) {
    return template;
  }

  return template.replace(/\{([^}]+)}/g, (_, key) => {
    const value = params[key.trim()];
    return value !== undefined ? String(value) : `{${key}}`;
  });
}

export function translate(language: string, key: string, params?: Record<string, string | number>): string {
  const lang = supportedLanguages.includes(language) ? language : DEFAULT_LANGUAGE;
  const langTranslations = translations[lang];
  const fallbackTranslations = translations[DEFAULT_LANGUAGE];

  const template = langTranslations[key] ?? fallbackTranslations[key] ?? key;
  return interpolate(template, params);
}

export function resolveLanguageCode(code?: string | null): string {
  if (!code) {
    return DEFAULT_LANGUAGE;
  }

  const normalized = code.toLowerCase();
  if (supportedLanguages.includes(normalized)) {
    return normalized;
  }

  // Match based on locale prefix, e.g. en-US -> en
  const prefix = normalized.split('-')[0];
  if (supportedLanguages.includes(prefix)) {
    return prefix;
  }

  return DEFAULT_LANGUAGE;
}

export function getLanguageNativeName(code: string): string {
  return LANGUAGE_META[code]?.native ?? code;
}

export function getLanguageLabel(code: string): string {
  const meta = LANGUAGE_META[code];
  if (!meta) {
    return code;
  }
  return `${meta.emoji} ${meta.native}`;
}

export function formatCurrency(amount: number, language: string): string {
  const locale = LANGUAGE_META[language]?.locale ?? LANGUAGE_META[DEFAULT_LANGUAGE].locale;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatList(items: string[], language: string): string {
  if (items.length === 0) {
    return '';
  }

  const locale = LANGUAGE_META[language]?.locale ?? LANGUAGE_META[DEFAULT_LANGUAGE].locale;
  const ListFormatCtor = (Intl as unknown as { ListFormat?: new (...args: unknown[]) => { format(values: string[]): string } }).ListFormat;

  if (typeof ListFormatCtor === 'function') {
    const formatter = new ListFormatCtor(locale, { style: 'long', type: 'conjunction' });
    return formatter.format(items);
  }

  if (items.length === 1) {
    return items[0];
  }
  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

export default {
  translate,
  supportedLanguages,
  resolveLanguageCode,
  getLanguageNativeName,
  getLanguageLabel,
  formatCurrency,
  formatList,
  DEFAULT_LANGUAGE,
  LANGUAGE_META
};


#!/usr/bin/env node

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const {
  DEFAULT_LANG,
  SUPPORTED_LANGS,
  translate,
  TEXTS
} = require('./bot/i18n');
const {
  loadProducts,
  searchProducts,
  getDealsByCategory,
  getDealsByStore,
  getHotDeals,
  rankProducts,
  CATEGORIES,
  STORES,
  getStoreById,
  getCategoryById
} = require('./bot/catalog');
const {
  formatProductEntry,
  formatCurrency,
  formatPercent
} = require('./bot/formatters');

const NOTIFICATION_TYPES = [
  { id: 'price' },
  { id: 'cashback' },
  { id: 'coupon' }
];

const BUDGET_OPTIONS = [5000, 10000, 20000, 50000, 100000];

const chunk = (array, size) => {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
};

const unique = (items) => Array.from(new Set((items || []).filter(Boolean)));

const withIcon = (product) => ({
  ...product,
  icon: getCategoryById(product.category)?.icon || '🛍️'
});

class BazaarGuruAggregatorBot {
  constructor(token) {
    if (!token) {
      throw new Error('Bot token is required. Set TELEGRAM_BOT_TOKEN in your environment.');
    }

    this.bot = new TelegramBot(token, { polling: true });
    this.products = loadProducts();
    this.users = new Map();
    this.notificationIntervalMinutes = Number(process.env.NOTIFICATION_INTERVAL_MINUTES || 30);
    this.notificationMinGapMinutes = Number(process.env.NOTIFICATION_MIN_GAP_MINUTES || 180);
    this.notificationMaxPerTick = Number(process.env.NOTIFICATION_MAX_PER_TICK || 1);

    this.registerHandlers();
    this.startNotificationLoop();
    console.log('🚀 BazaarGuru Aggregator Bot is running.');
  }

  registerHandlers() {
    this.bot.on('message', (msg) => this.handleMessage(msg));
    this.bot.on('callback_query', (query) => this.handleCallback(query));
  }

  getUser(chatId) {
    let user = this.users.get(chatId);
    if (!user) {
      user = {
        chatId,
        language: DEFAULT_LANG,
        state: null,
        preferences: {
          favorites: new Set(),
          budget: null,
          notifications: {
            price: false,
            cashback: false,
            coupon: false
          }
        },
        stats: {
          searches: 0,
          lastSearchAt: null
        },
        lists: new Map()
      };
      this.users.set(chatId, user);
    }
    return user;
  }

  t(user, path, params) {
    return translate(user.language, path, params);
  }

  mainMenuButton(user) {
    return { text: this.t(user, 'common.mainMenu'), callback_data: 'back_main' };
  }

  async handleMessage(msg) {
    if (!msg || !msg.chat) {
      return;
    }
    const chatId = msg.chat.id;
    const user = this.getUser(chatId);
    const text = msg.text ? msg.text.trim() : '';

    if (text.startsWith('/start')) {
      return this.handleStart(chatId, user, msg.from?.first_name || msg.chat.first_name || '����');
    }

    if (text.startsWith('/help')) {
      return this.sendHelp(chatId, user);
    }

    if (text.startsWith('/language')) {
      return this.sendLanguageMenu(chatId, user);
    }

    if (text.startsWith('/search')) {
      user.state = 'awaiting_search';
      return this.sendSearchInstructions(chatId, user, true);
    }

    if (text.startsWith('/cashback')) {
      return this.bot.sendMessage(chatId, this.t(user, 'extras.cashbackSoon'), { parse_mode: 'HTML' });
    }

    if (msg.voice) {
      return this.bot.sendMessage(chatId, this.t(user, 'search.fallbackVoice'), { parse_mode: 'HTML' });
    }

    if (msg.photo) {
      return this.bot.sendMessage(chatId, this.t(user, 'search.fallbackPhoto'), { parse_mode: 'HTML' });
    }

    if (text) {
      user.state = 'awaiting_search';
      return this.processSearch(chatId, user, text);
    }
  }

  async handleStart(chatId, user, name) {
    const intro = [
      this.t(user, 'aggregator.intro', { name }),
      this.t(user, 'aggregator.pitch'),
      this.t(user, 'aggregator.disclaimer'),
      this.t(user, 'aggregator.reminder')
    ].join('\n');

    await this.bot.sendMessage(chatId, intro, { parse_mode: 'HTML' });
    return this.sendMainMenu(chatId, user);
  }

  async sendMainMenu(chatId, user) {
    const menu = this.t(user, 'menu');
    const keyboard = {
      inline_keyboard: [
        [
          { text: menu.buttons.hotDeals, callback_data: 'hot_deals' },
          { text: menu.buttons.topDeals, callback_data: 'top_deals' }
        ],
        [
          { text: menu.buttons.categories, callback_data: 'open_categories' },
          { text: menu.buttons.search, callback_data: 'search_product' }
        ],
        [
          { text: menu.buttons.personal, callback_data: 'open_personal' },
          { text: menu.buttons.stores, callback_data: 'open_stores' }
        ],
        [
          { text: menu.buttons.language, callback_data: 'open_language' },
          { text: menu.buttons.help, callback_data: 'open_help' }
        ]
      ]
    };

    await this.bot.sendMessage(chatId, menu.title, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  async sendHelp(chatId, user) {
    const help = this.t(user, 'help');
    const message = [
      help.title,
      '',
      help.intro,
      help.faqTitle,
      ...help.faqItems,
      '',
      help.commands,
      help.contact,
      '',
      this.t(user, 'aggregatorFooter')
    ].join('\n');

    await this.bot.sendMessage(chatId, message, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: this.t(user, 'menu.buttons.search'), callback_data: 'search_product' }],
          [this.mainMenuButton(user)]
        ]
      }
    });
  }

  async sendLanguageMenu(chatId, user) {
    const rows = chunk(
      SUPPORTED_LANGS.map((lang) => {
        const languageName = TEXTS[lang]?.languageName || lang;
        const suffix = user.language === lang ? ' ✅' : '';
        return { text: `${languageName}${suffix}`, callback_data: `set_language_${lang}` };
      }),
      2
    );

    await this.bot.sendMessage(chatId, this.t(user, 'languagePrompt'), {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [...rows, [this.mainMenuButton(user)]]
      }
    });
  }

  async sendCategories(chatId, user) {
    const rows = chunk(
      CATEGORIES.map((category) => ({
        text: `${category.icon} ${category.labels[user.language] || category.labels[DEFAULT_LANG]}`,
        callback_data: `category_${category.id}`
      })),
      2
    );

    const message = [
      this.t(user, 'categories.title'),
      '',
      this.t(user, 'categories.hint'),
      '',
      this.t(user, 'aggregatorFooter')
    ].join('\n');

    await this.bot.sendMessage(chatId, message, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [...rows, [this.mainMenuButton(user)]]
      }
    });
  }

  async sendStores(chatId, user) {
    const rows = chunk(
      STORES.map((store) => ({
        text: `${store.icon} ${store.name}`,
        callback_data: `store_${store.id}`
      })),
      3
    );

    const listLines = STORES.map((store) => {
      const tagline = store.tagline[user.language] || store.tagline[DEFAULT_LANG];
      return `${store.icon} <a href="${store.url}">${store.name}</a> � ${tagline}`;
    });

    const message = [
      this.t(user, 'storesBlock.title'),
      '',
      this.t(user, 'storesBlock.hint'),
      '',
      listLines.join('\n'),
      '',
      this.t(user, 'aggregatorFooter')
    ].join('\n');

    await this.bot.sendMessage(chatId, message, {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup: {
        inline_keyboard: [...rows, [this.mainMenuButton(user)]]
      }
    });
  }

  async sendSearchInstructions(chatId, user, highlight = false) {
    const search = this.t(user, 'search');
    const message = [
      search.introTitle,
      search.introSubtitle,
      '',
      search.howTitle,
      ...search.bullets,
      '',
      search.clarify
    ].join('\n');

    await this.bot.sendMessage(chatId, message, {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup: {
        inline_keyboard: [
          [
            { text: this.t(user, 'menu.buttons.categories'), callback_data: 'open_categories' },
            { text: this.t(user, 'menu.buttons.personal'), callback_data: 'open_personal' }
          ],
          [this.mainMenuButton(user)]
        ]
      }
    });
    if (highlight) {
      await this.bot.sendMessage(chatId, search.awaiting, { parse_mode: 'HTML' });
    }
  }

  async processSearch(chatId, user, rawQuery) {
    const query = String(rawQuery || '').trim();
    if (!query) {
      return this.sendSearchInstructions(chatId, user);
    }

    const { items, total } = searchProducts(this.products, query, {
      favorites: Array.from(user.preferences.favorites || []),
      budget: user.preferences.budget,
      limit: 10
    });

    user.stats.searches += 1;
    user.stats.lastSearchAt = Date.now();

    if (!total) {
      await this.bot.sendMessage(chatId, this.t(user, 'searchNone'), { parse_mode: 'HTML' });
      const fallbackDeals = rankProducts(this.products).slice(0, 10);
      if (fallbackDeals.length) {
        await this.sendDealsFromList(chatId, user, this.t(user, 'searchFallbackTitle'), fallbackDeals, {
          contextId: 'fallback'
        });
      }
      return;
    }

    const duration = (Math.random() * 0.6 + 0.4).toFixed(1);
    const priceValues = items.map((item) => Number(item.price)).filter(Number.isFinite);
    const discountValues = items.map((item) => Number(item.discountPercent)).filter(Number.isFinite);
    const cashbackValues = items.map((item) => Number(item.cashbackPercent)).filter(Number.isFinite);
    const bestPrice = priceValues.length ? Math.min(...priceValues) : null;
    const bestDiscount = discountValues.length ? Math.max(...discountValues) : null;
    const bestCashback = cashbackValues.length ? Math.max(...cashbackValues) : null;
    const storeList = unique(items.map((item) => item.store)).join(', ');

    const lines = [
      this.t(user, 'searchSummary.heading', { query }),
      '',
      this.t(user, 'searchSummary.statsTitle', { duration }),
      this.t(user, 'searchSummary.count', { count: total }),
      this.t(user, 'searchSummary.bestPrice', {
        bestPrice: bestPrice !== null ? formatCurrency(bestPrice, user.language) : '�'
      }),
      this.t(user, 'searchSummary.bestDiscount', {
        bestDiscount: bestDiscount !== null ? formatPercent(bestDiscount) : '�'
      }),
      this.t(user, 'searchSummary.bestCashback', {
        cashback: bestCashback !== null ? formatPercent(bestCashback) : '�'
      }),
      this.t(user, 'searchSummary.stores', { stores: storeList || '�' }),
      ''
    ];

    const topPicks = items.slice(0, 3).map(withIcon);
    const others = items.slice(3, 10).map(withIcon);

    if (topPicks.length) {
      lines.push(this.t(user, 'searchTopPicksTitle'));
      topPicks.forEach((product, index) => {
        lines.push(formatProductEntry(product, index + 1, user.language));
        lines.push('');
      });
    }

    if (others.length) {
      lines.push(this.t(user, 'searchOtherTitle'));
      others.forEach((product, index) => {
        lines.push(formatProductEntry(product, index + 1 + topPicks.length, user.language));
        lines.push('');
      });
    }

    lines.push(this.t(user, 'aggregatorFooter'));

    const keyboard = {
      inline_keyboard: [
        [
          { text: this.t(user, 'menu.buttons.stores'), callback_data: 'open_stores' },
          { text: this.t(user, 'refineSearch'), callback_data: 'refine_search' }
        ],
        [this.mainMenuButton(user)]
      ]
    };

    await this.bot.sendMessage(chatId, lines.join('\n'), {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup: keyboard
    });
  }


  async sendDealsFromList(chatId, user, title, deals, options = {}) {
    const contextId = options.contextId || null;
    const pageSize = options.pageSize || 10;
    const start = options.start || 0;
    const reuseContext = Boolean(options.reuseContext);
    const extraRows = options.extraRows || null;

    const filtered = this.filterDealsByPreferences(deals, user);

    if (!filtered.length) {
      await this.bot.sendMessage(chatId, this.t(user, 'lists.noDeals'), {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: [[this.mainMenuButton(user)]] }
      });
      return;
    }

    if (contextId && !reuseContext) {
      this.saveListContext(user, contextId, {
        items: filtered,
        title,
        pageSize,
        extraRows
      });
    }

    const slice = filtered.slice(start, start + pageSize);
    if (!slice.length) {
      await this.bot.sendMessage(chatId, this.t(user, 'lists.noMore'), {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: [[this.mainMenuButton(user)]] }
      });
      return;
    }

    const lines = [title, ''];
    const filterNote = this.buildFilterNote(user);
    if (filterNote) {
      lines.push(filterNote, '');
    }

    slice.map(withIcon).forEach((product, index) => {
      lines.push(
        formatProductEntry(product, start + index + 1, user.language)
      );
      lines.push('');
    });
    lines.push(this.t(user, 'aggregatorFooter'));

    const inline_keyboard = [];

    if (contextId && start + pageSize < filtered.length) {
      inline_keyboard.push([
        {
          text: this.t(user, 'lists.showMore', {
            count: Math.min(pageSize, filtered.length - (start + pageSize))
          }),
          callback_data: `list_more|${contextId}|${start + pageSize}`
        }
      ]);
    }

    if (extraRows && extraRows.length) {
      inline_keyboard.push(...extraRows);
    } else {
      inline_keyboard.push([
        { text: this.t(user, 'refineSearch'), callback_data: 'refine_search' },
        { text: this.t(user, 'menu.buttons.personal'), callback_data: 'open_personal' }
      ]);
    }

    inline_keyboard.push([this.mainMenuButton(user)]);

    await this.bot.sendMessage(chatId, lines.join('\n'), {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup: { inline_keyboard }
    });
  }

  filterDealsByPreferences(deals, user) {
    if (!Array.isArray(deals)) {
      return [];
    }
    const preferences = user?.preferences || {};
    const favorites = preferences.favorites instanceof Set
      ? preferences.favorites
      : new Set(preferences.favorites || []);
    const hasFavorites = favorites.size > 0;
    const budgetLimit = Number(preferences.budget);
    const hasBudget = Number.isFinite(budgetLimit) && budgetLimit > 0;

    if (!hasFavorites && !hasBudget) {
      return deals;
    }

    return deals.filter((product) => {
      if (hasFavorites && product.category && !favorites.has(product.category)) {
        return false;
      }
      if (hasBudget && product.price && Number(product.price) > budgetLimit) {
        return false;
      }
      return true;
    });
  }

  buildFilterNote(user) {
    const preferences = user?.preferences || {};
    const parts = [];
    const favorites = preferences.favorites instanceof Set
      ? preferences.favorites
      : new Set(preferences.favorites || []);

    if (favorites.size) {
      const names = Array.from(favorites)
        .map((id) => getCategoryById(id))
        .filter(Boolean)
        .map((category) => category.labels[user.language] || category.labels[DEFAULT_LANG]);
      if (names.length) {
        parts.push(this.t(user, 'filters.byFavorites', { list: names.join(', ') }));
      }
    }

    const budgetLimit = Number(preferences.budget);
    if (Number.isFinite(budgetLimit) && budgetLimit > 0) {
      parts.push(
        this.t(user, 'filters.byBudget', {
          value: formatCurrency(budgetLimit, user.language)
        })
      );
    }

    if (!parts.length) {
      return null;
    }

    return this.t(user, 'filters.active', { details: parts.join(' · ') });
  }

  saveListContext(user, contextId, context) {
    if (!contextId) {
      return;
    }
    if (!user.lists || !(user.lists instanceof Map)) {
      user.lists = new Map();
    }
    user.lists.set(contextId, { ...context, savedAt: Date.now() });
    if (user.lists.size > 8) {
      const oldestKey = user.lists.keys().next().value;
      if (oldestKey !== undefined) {
        user.lists.delete(oldestKey);
      }
    }
  }

  getListContext(user, contextId) {
    if (!contextId || !user.lists || !(user.lists instanceof Map)) {
      return null;
    }
    return user.lists.get(contextId) || null;
  }

  async sendPersonalDashboard(chatId, user) {
    const favorites = Array.from(user.preferences.favorites || []);
    const favoriteNames = favorites.length
      ? favorites
          .map((id) => getCategoryById(id))
          .filter(Boolean)
          .map((category) => category.labels[user.language] || category.labels[DEFAULT_LANG])
          .join(' � ')
      : null;

    const notifications = NOTIFICATION_TYPES.filter((type) => user.preferences.notifications[type.id]);

    const lines = [
      this.t(user, 'personal.title'),
      '',
      this.t(user, 'personal.subtitle'),
      ''
    ];

    lines.push(
      favoriteNames
        ? this.t(user, 'personal.favoritesLine', { list: favoriteNames })
        : this.t(user, 'personal.favoritesEmpty')
    );

    lines.push(
      this.t(user, 'personal.budgetLine', {
        value: user.preferences.budget
          ? formatCurrency(user.preferences.budget, user.language)
          : this.t(user, 'personal.budgetUnlimited')
      })
    );

    lines.push(
      notifications.length
        ? this.t(user, 'personal.notificationsLine', {
            list: notifications
              .map((type) => this.t(user, `personal.notificationLabels.${type.id}`))
              .join(' � ')
          })
        : this.t(user, 'personal.notificationsEmpty')
    );

    lines.push('', this.t(user, 'aggregatorFooter'));

    await this.bot.sendMessage(chatId, lines.join('\n'), {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: this.t(user, 'personal.buttons.categories'), callback_data: 'personal_categories' },
            { text: this.t(user, 'personal.buttons.budget'), callback_data: 'personal_budget' }
          ],
          [
            { text: this.t(user, 'personal.buttons.notifications'), callback_data: 'personal_notifications' },
            { text: this.t(user, 'personal.buttons.back'), callback_data: 'back_main' }
          ],
          [this.mainMenuButton(user)]
        ]
      }
    });
  }

  async sendPersonalCategories(chatId, user) {
    const favorites = user.preferences.favorites || new Set();
    const buttons = CATEGORIES.map((category) => {
      const isSelected = favorites.has(category.id);
      const label = `${isSelected ? '✅ ' : ''}${category.icon} ${category.labels[user.language] || category.labels[DEFAULT_LANG]}`;
      return { text: label, callback_data: `toggle_category_${category.id}` };
    });

    const rows = chunk(buttons, 2);
    await this.bot.sendMessage(chatId, this.t(user, 'personal.chooseCategories'), {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [...rows, [{ text: this.t(user, 'personal.buttons.back'), callback_data: 'open_personal' }], [this.mainMenuButton(user)]]
      }
    });
  }

  async sendBudgetMenu(chatId, user) {
    const rows = chunk(
      BUDGET_OPTIONS.map((amount) => ({
        text: formatCurrency(amount, user.language),
        callback_data: `set_budget_${amount}`
      })),
      2
    );

    rows.push([{ text: this.t(user, 'personal.budgetUnlimited'), callback_data: 'set_budget_off' }]);
    rows.push([{ text: this.t(user, 'personal.buttons.back'), callback_data: 'open_personal' }]);

    await this.bot.sendMessage(chatId, this.t(user, 'personal.chooseBudget'), {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: [...rows, [this.mainMenuButton(user)]] }
    });
  }

  async sendNotificationsMenu(chatId, user) {
    const buttons = NOTIFICATION_TYPES.map((type) => {
      const enabled = user.preferences.notifications[type.id];
      const label = `${enabled ? '✅' : '🔔'} ${this.t(user, `personal.notificationLabels.${type.id}`)}`;
      return { text: label, callback_data: `toggle_notification_${type.id}` };
    });

    const rows = chunk(buttons, 2);
    rows.push([{ text: this.t(user, 'personal.buttons.back'), callback_data: 'open_personal' }]);

    await this.bot.sendMessage(chatId, this.t(user, 'personal.buttons.notifications'), {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: [...rows, [this.mainMenuButton(user)]] }
    });
  }

  toggleCategory(user, categoryId) {
    const favorites = user.preferences.favorites || new Set();
    user.preferences.favorites = favorites;
    if (favorites.has(categoryId)) {
      favorites.delete(categoryId);
      return this.t(user, 'personal.categoryOff', {
        name: getCategoryById(categoryId)?.labels[user.language] || categoryId
      });
    }
    favorites.add(categoryId);
    return this.t(user, 'personal.categoryOn', {
      name: getCategoryById(categoryId)?.labels[user.language] || categoryId
    });
  }

  setBudget(user, value) {
    if (value === 'off') {
      user.preferences.budget = null;
      return this.t(user, 'personal.budgetSet', {
        value: this.t(user, 'personal.budgetUnlimited')
      });
    }
    const num = Number(value);
    if (Number.isFinite(num)) {
      user.preferences.budget = num;
      return this.t(user, 'personal.budgetSet', {
        value: formatCurrency(num, user.language)
      });
    }
    return null;
  }

  toggleNotification(user, typeId) {
    const notifications = user.preferences.notifications;
    notifications[typeId] = !notifications[typeId];
    return notifications[typeId]
      ? this.t(user, 'personal.notificationOn', {
          name: this.t(user, `personal.notificationLabels.${typeId}`)
        })
      : this.t(user, 'personal.notificationOff', {
          name: this.t(user, `personal.notificationLabels.${typeId}`)
        });
  }

  async sendSampleNotification(chatId, user, typeId) {
    const sourceList = user.preferences.favorites?.size
      ? this.products.filter((item) => user.preferences.favorites.has(item.category))
      : this.products;
    const product = rankProducts(sourceList)[0];
    if (!product) return;

    switch (typeId) {
      case 'price':
        await this.bot.sendMessage(
          chatId,
          this.t(user, 'personal.sample.price', {
            product: product.name,
            price: formatCurrency(product.price, user.language),
            oldPrice: formatCurrency(product.originalPrice || product.price * 1.1, user.language)
          }),
          { parse_mode: 'HTML', disable_web_page_preview: true }
        );
        break;
      case 'cashback':
        await this.bot.sendMessage(
          chatId,
          this.t(user, 'personal.sample.cashback', {
            product: product.name,
            cashback: formatPercent(product.cashbackPercent || 5)
          }),
          { parse_mode: 'HTML', disable_web_page_preview: true }
        );
        break;
      case 'coupon':
        await this.bot.sendMessage(
          chatId,
          this.t(user, 'personal.sample.coupon', {
            code: product.couponCode || 'DEAL10',
            hours: 6
          }),
          { parse_mode: 'HTML', disable_web_page_preview: true }
        );
        break;
      default:
        break;
    }
  }

  startNotificationLoop() {
    if (!this.notificationIntervalMinutes || this.notificationIntervalMinutes <= 0) {
      return;
    }
    const intervalMs = this.notificationIntervalMinutes * 60 * 1000;
    this.notificationTimer = setInterval(() => {
      this.runNotificationTick().catch((error) => {
        console.error('Scheduled notification error:', error.message);
      });
    }, intervalMs);
    if (this.notificationTimer && typeof this.notificationTimer.unref === 'function') {
      this.notificationTimer.unref();
    }
  }

  async runNotificationTick() {
    const now = Date.now();
    const minGapMs = Math.max(1, this.notificationMinGapMinutes || 0) * 60 * 1000;
    const tasks = [];

    for (const user of this.users.values()) {
      if (!user || !user.chatId) {
        continue;
      }
      const enabledTypes = NOTIFICATION_TYPES.filter((type) => user.preferences?.notifications?.[type.id]);
      if (!enabledTypes.length) {
        continue;
      }

      user.notificationState = user.notificationState || { lastSent: {}, lastProduct: {} };
      let sentCount = 0;

      for (const type of enabledTypes) {
        if (sentCount >= this.notificationMaxPerTick) {
          break;
        }
        const lastSent = user.notificationState.lastSent[type.id];
        if (lastSent && now - lastSent < minGapMs) {
          continue;
        }

        const product = this.selectProductForNotification(user, type.id, user.notificationState);
        if (!product) {
          continue;
        }

        const payload = this.buildNotificationPayload(user, type.id, product);
        if (!payload) {
          continue;
        }

        tasks.push(
          this.bot
            .sendMessage(user.chatId, payload.text, {
              parse_mode: 'HTML',
              disable_web_page_preview: true
            })
            .catch((error) => console.error('Auto notification send error:', error.message))
        );

        user.notificationState.lastSent[type.id] = now;
        user.notificationState.lastProduct[type.id] = product.id || product.name;
        sentCount += 1;
      }
    }

    if (tasks.length) {
      await Promise.allSettled(tasks);
    }
  }

  buildNotificationPayload(user, typeId, product) {
    const link = product.affiliateUrl || product.url || product.link || '';
    const storeName = product.store || product.source || this.t(user, 'menu.buttons.stores');
    const oldPriceValue = product.originalPrice && product.originalPrice > product.price
      ? product.originalPrice
      : (product.price ? product.price * 1.1 : null);
    const params = {
      product: product.name,
      store: storeName,
      price: formatCurrency(product.price, user.language),
      oldPrice: oldPriceValue ? formatCurrency(oldPriceValue, user.language) : formatCurrency(product.price, user.language),
      cashback: formatPercent(product.cashbackPercent || product.discountPercent || 5),
      code: product.couponCode || 'DEAL10',
      hours: 6,
      link
    };

    const header = this.t(user, 'notificationsAuto.header');
    const bodyKey = `notificationsAuto.${typeId}`;
    const body = this.t(user, bodyKey, params);
    const footer = link ? this.t(user, 'notificationsAuto.footer', params) : '';

    const lines = [header];
    if (body && body !== bodyKey) {
      lines.push(body);
    } else {
      lines.push(`${params.product} — ${params.price}`);
    }
    if (footer && footer !== 'notificationsAuto.footer') {
      lines.push(footer);
    }
    lines.push(this.t(user, 'aggregatorFooter'));

    return {
      text: lines.join('\n')
    };
  }

  selectProductForNotification(user, typeId, state) {
    const candidates = this.getCandidateProducts(user, typeId);
    if (!candidates.length) {
      return null;
    }
    const lastId = state.lastProduct?.[typeId];
    return candidates.find((item) => (item.id || item.name) !== lastId) || candidates[0];
  }

  getCandidateProducts(user, typeId) {
    const favorites = user.preferences?.favorites;
    let pool = Array.from(this.products || []);

    if (favorites && favorites instanceof Set && favorites.size) {
      const favouritePool = pool.filter((item) => favorites.has(item.category));
      if (favouritePool.length) {
        pool = favouritePool;
      }
    }

    if (typeId === 'cashback') {
      const cashbackPool = pool.filter((item) => Number(item.cashbackPercent) > 0);
      if (cashbackPool.length) {
        pool = cashbackPool;
      }
    }

    if (typeId === 'coupon') {
      const couponPool = pool.filter((item) => Boolean(item.couponCode));
      if (couponPool.length) {
        pool = couponPool;
      }
    }

    return rankProducts(pool);
  }

  async handleCallback(query) {
    if (!query || !query.message) {
      return;
    }
    const chatId = query.message.chat.id;
    const user = this.getUser(chatId);
    const data = query.data || '';

    const acknowledge = async (text = '', alert = false) => {
      try {
        await this.bot.answerCallbackQuery(query.id, { text, show_alert: alert });
      } catch (error) {
        console.error('answerCallbackQuery error:', error.message);
      }
    };

    if (data.startsWith('list_more|')) {
      await acknowledge();
      const [, contextId, startStr] = data.split('|');
      const context = this.getListContext(user, contextId);
      if (!context || !context.items || !context.items.length) {
        await this.bot.sendMessage(chatId, this.t(user, 'lists.noMore'), {
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: [[this.mainMenuButton(user)]] }
        });
        return;
      }
      const nextStart = Number(startStr) || 0;
      return this.sendDealsFromList(chatId, user, context.title, context.items, {
        contextId,
        start: nextStart,
        pageSize: context.pageSize || 5,
        extraRows: context.extraRows || null,
        reuseContext: true
      });
    }

    if (data === 'hot_deals') {
      await acknowledge();
      const deals = getHotDeals(this.products);
      return this.sendDealsFromList(chatId, user, this.t(user, 'deals.hotTitle'), deals, {
        contextId: 'hot'
      });
    }

    if (data === 'top_deals') {
      await acknowledge();
      const deals = rankProducts(this.products);
      return this.sendDealsFromList(chatId, user, this.t(user, 'deals.topTitle'), deals, {
        contextId: 'top'
      });
    }

    if (data === 'open_categories') {
      await acknowledge();
      return this.sendCategories(chatId, user);
    }

    if (data === 'open_stores') {
      await acknowledge();
      return this.sendStores(chatId, user);
    }

    if (data === 'open_personal') {
      await acknowledge();
      return this.sendPersonalDashboard(chatId, user);
    }

    if (data === 'personal_categories') {
      await acknowledge();
      return this.sendPersonalCategories(chatId, user);
    }

    if (data === 'personal_budget') {
      await acknowledge();
      return this.sendBudgetMenu(chatId, user);
    }

    if (data === 'personal_notifications') {
      await acknowledge();
      return this.sendNotificationsMenu(chatId, user);
    }

    if (data === 'open_language') {
      await acknowledge();
      return this.sendLanguageMenu(chatId, user);
    }

    if (data === 'open_help') {
      await acknowledge();
      return this.sendHelp(chatId, user);
    }

    if (data === 'search_product' || data === 'refine_search') {
      await acknowledge();
      user.state = 'awaiting_search';
      return this.sendSearchInstructions(chatId, user, true);
    }

    if (data === 'back_main') {
      await acknowledge();
      return this.sendMainMenu(chatId, user);
    }

    if (data.startsWith('category_')) {
      await acknowledge();
      const categoryId = data.replace('category_', '');
      const category = getCategoryById(categoryId);
      if (!category) {
        return;
      }
      const deals = getDealsByCategory(this.products, categoryId);
      const title = this.t(user, 'deals.categoryTitle', {
        category: category.labels[user.language] || category.labels[DEFAULT_LANG]
      });
      return this.sendDealsFromList(chatId, user, title, deals, {
        contextId: `category:${categoryId}`
      });
    }

    if (data.startsWith('store_')) {
      await acknowledge();
      const storeId = data.replace('store_', '');
      const store = getStoreById(storeId);
      if (!store) {
        return;
      }
      const deals = getDealsByStore(this.products, storeId);
      const title = this.t(user, 'deals.storeTitle', { store: store.name });
      return this.sendDealsFromList(chatId, user, title, deals, {
        contextId: `store:${storeId}`
      });
    }

    if (data.startsWith('toggle_category_')) {
      const categoryId = data.replace('toggle_category_', '');
      const message = this.toggleCategory(user, categoryId);
      await acknowledge(message);
      return this.sendPersonalCategories(chatId, user);
    }

    if (data.startsWith('set_budget_')) {
      const value = data.replace('set_budget_', '');
      const message = this.setBudget(user, value === 'off' ? 'off' : value);
      await acknowledge(message || '');
      return this.sendPersonalDashboard(chatId, user);
    }

    if (data.startsWith('toggle_notification_')) {
      const typeId = data.replace('toggle_notification_', '');
      const message = this.toggleNotification(user, typeId);
      await acknowledge(message);
      await this.sendNotificationsMenu(chatId, user);
      if (user.preferences.notifications[typeId]) {
        await this.sendSampleNotification(chatId, user, typeId);
      }
      return;
    }

    if (data.startsWith('set_language_')) {
      const lang = data.replace('set_language_', '');
      if (SUPPORTED_LANGS.includes(lang)) {
        this.setLanguage(user, lang);
        const confirmation = this.t(user, 'languageSaved', {
          language: TEXTS[lang]?.languageName || lang
        });
        await acknowledge(confirmation);
        await this.bot.sendMessage(chatId, confirmation, { parse_mode: 'HTML' });
        return this.sendMainMenu(chatId, user);
      }
      await acknowledge();
      return;
    }
  }

  setLanguage(user, lang) {
    user.language = lang;
  }
}

module.exports = BazaarGuruAggregatorBot;

if (require.main === module) {
  const token = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN || process.env.BAZAARGURU_TELEGRAM_TOKEN;
  if (!token) {
    console.error('? TELEGRAM_BOT_TOKEN is not set. Please add it to your environment before running the bot.');
    process.exit(1);
  }
  // eslint-disable-next-line no-new
  new BazaarGuruAggregatorBot(token);
}





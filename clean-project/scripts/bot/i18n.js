const DEFAULT_LANG = 'en';
const SUPPORTED_LANGS = ['en', 'ru', 'hi', 'hn'];

const TEXTS = {
  ru: {
    languageName: 'Русский',
    common: {
      mainMenu: '🏠 Главное меню'
    },
    aggregator: {
      intro: 'Привет, {name}! Это BazaarGuru — агрегатор официальных скидок и промокодов.',
      pitch: 'Мы показываем лучшие выгоды партнёров и ведём напрямую в магазин за покупкой.',
      disclaimer: 'Мы не склад и не маркетплейс: заказ оформляется на сайте магазина, проверяй наличие и условия.',
      reminder: 'Следим за Flipkart, Amazon, Myntra, Ajio, Croma и Nykaa. Актуальность уточняй у магазина.'
    },
    menu: {
      title: '🏠 Главное меню BazaarGuru',
      buttons: {
        hotDeals: '🔥 Скидки дня',
        topDeals: '⭐ ТОП 10',
        categories: '🗂 Категории',
        search: '🔍 Поиск',
        personal: '💡 Персональное',
        stores: '🏬 Магазины',
        language: '🌐 Язык',
        help: 'ℹ️ Помощь'
      }
    },
    search: {
      introTitle: '🔍 Найдём всё нужное через умный поиск.',
      introSubtitle: '💡 Напиши, что ищешь, или воспользуйся кнопками ниже.',
      howTitle: 'Как искать:',
      bullets: [
        '• Текстом: «OnePlus до 60000», «курти Biba до 1500»',
        '• Голосом: удержи микрофон и назови запрос',
        '• Фото: отправь снимок товара — покажу похожие варианты'
      ],
      clarify: '🎤 Чем точнее запрос, тем выгоднее подборка.',
      awaiting: 'Жду текстовый запрос или выбери категорию ниже.',
      fallbackVoice: 'Голосовой поиск появится после подключения партнёрских API. Пока напиши запрос текстом.',
      fallbackPhoto: 'Фото-поиск скоро появится. Напиши запрос словами — уже подберу скидки.',
      processingVoice: 'Распознаю голосовое сообщение...',
      processingImage: 'Анализирую изображение...',
      voiceRecognized: 'Распознано',
      voiceError: 'Не удалось распознать голос. Попробуй ещё раз или напиши текстом.',
      imageRecognized: 'Товар распознан',
      imageError: 'Не удалось распознать изображение. Попробуй другое фото или напиши текстом.',
      category: 'Категория',
      searchingFor: 'Ищу',
      analyzed: 'Анализ запроса',
      suggestions: 'Рекомендации',
      trySearching: 'Попробуй поискать',
      processingImageWithText: 'Анализирую фото с подписью'
    },
    searchSummary: {
      heading: '🧠 Ищу «{query}»…',
      statsTitle: '⚡ Нашёл за {duration} c:',
      count: '• Предложений: {count}',
      bestPrice: '• Лучшая цена: {bestPrice}',
      bestDiscount: '• Максимальная скидка: {bestDiscount}',
      bestCashback: '• Кэшбэк: до {cashback}',
      stores: '• Магазины: {stores}'
    },
    searchTopPicksTitle: '🔥 Главные находки:',
    searchOtherTitle: '🛍 Ещё варианты:',
    searchFallbackTitle: '🔥 Горячие предложения прямо сейчас:',
    searchNone: '😔 По запросу ничего не нашлось. Уточни запрос или выбери категорию.',
    categories: {
      title: '🗂 Категории',
      hint: 'Выбирай направление — покажу свежие скидки мгновенно.'
    },
    storesBlock: {
      title: '🏬 Партнёрские магазины',
      hint: 'Все ссылки ведут на официальные витрины. Перед покупкой проверь наличие и условия.'
    },
    deals: {
      hotTitle: '🔥 Свежее прямо сейчас:',
      topTitle: '⭐ ТОП-10 предложений недели:',
      categoryTitle: '🛍 {category}: выгодные подборки',
      storeTitle: '🏬 {store}: лучшие скидки'
    },
    product: {
      headline: '{index}. {icon} <a href="{link}"><b>{name}</b></a>',
      priceLine: '   💰 {price}{original}{discount}',
      storeLine: '   🏷️ {store} • {brand}',
      couponLine: '   🎫 Промокод: {code} ({savings})',
      noCoupon: '   🎫 Промокод применится при оформлении на сайте магазина',
      storeComparisons: '   🛒 {comparisons}',
      minOrderLine: '   📦 Мин. заказ: {minOrder}',
      lastCheckedLine: '   ⏰ Проверено: {datetime}',
      highlightsLine: '   ✨ Важно: {list}',
      discountFallback: 'скидка уточняется',
      savingsFallback: 'дополнительная выгода'
    },
    personal: {
      title: '💡 Персональные настройки',
      subtitle: 'Нажми на категории, задай бюджет и включи уведомления — буду присылать нужные скидки.',
      favoritesLine: '❤️ Любимые категории: {list}',
      favoritesEmpty: '❤️ Категории пока не выбраны.',
      budgetLine: '💰 Слежу за бюджетом: {value}',
      budgetUnlimited: 'без ограничений',
      notificationsLine: '🔔 Уведомления: {list}',
      notificationsEmpty: '🔔 Уведомления выключены.',
      buttons: {
        categories: '🗂 Категории',
        budget: '💰 Бюджет',
        notifications: '🔔 Уведомления',
        back: '⬅️ Назад'
      },
      chooseCategories: 'Одно нажатие добавляет категорию, повторное убирает. Отмеченные показываю чаще.',
      chooseBudget: 'Выбери лимит бюджета, чтобы скрывать дорогие товары:',
      budgetSet: 'Готово! Лимит: {value}.',
      notificationLabels: {
        price: 'Падение цены',
        cashback: 'Возврат кешбэка',
        coupon: 'Купон заканчивается'
      },
      notificationOn: 'Уведомления «{name}» включены.',
      notificationOff: 'Уведомления «{name}» выключены.',
      categoryOn: 'Добавил в любимые: {name}.',
      categoryOff: 'Убрал из любимых: {name}.',
      sample: {
        price: '🎯 Пример: {product} упал в цене до {price} (было {oldPrice}).',
        cashback: '💸 Пример: по {product} снова действует кешбэк {cashback}.',
        coupon: '⏳ Пример: промокод {code} истекает через {hours} ч.'
      }
    },
    help: {
      title: 'ℹ️ Помощь',
      intro: 'BazaarGuru — агрегатор официальных скидок. Мы не продаём товары, показываем где выгодно купить.',
      faqTitle: '❓ Частые вопросы',
      faqItems: [
        'Откуда товары? — Из официальных витрин по партнёрским API; показываем только актуальные акции.',
        'Почему ассортимент ограничен? — Мы фильтруем лучшие предложения, остальное ищи на сайте магазина.',
        'Как использовать промокод? — Нажми ссылку товара и введи код при оформлении на сайте магазина.'
      ],
      commands: '📋 Команды: /start — главное меню, /deal — горячие предложения, /search — поиск, /profile — профиль (скоро), /cashback — кешбэк (инструкция), /help — помощь, /language — язык.',
      contact: '🤝 Связаться с нами: partner@bazaar.guru'
    },
    extras: {
      cashbackSoon: 'Функцию кешбэка подключим после интеграции с партнёрскими API. Пока следи за разделом «Персональное».'
    },
    messages: {
      profileSoon: '👤 Профиль скоро появится. Мы готовим блок статистики (поиски, клики, экономия). Уже сейчас отмечай любимые категории и бюджеты — эти данные автоматически появятся в профиле.',
      cashbackSoon: '💰 Раздел кешбэка скоро появится. Следите за обновлениями!'
    },
    filters: {
      active: 'Фильтр: {details}',
      byFavorites: 'любимые категории ({list})',
      byBudget: 'бюджет до {value}'
    },
    lists: {
      showMore: '⏭ Показать ещё',
      noMore: 'Пока больше нет предложений — загляни позже.',
      noDeals: 'Для этого фильтра пока нет результатов. Сообщу, как только появится что-то подходящее.'
    },
    notificationsAuto: {
      header: '🔔 Автоуведомление: свежая выгода',
      price: '📉 {product} в {store}: {price} (было {oldPrice}).',
      cashback: '💸 {product}: кэшбэк до {cashback} в {store}.',
      coupon: '🎟️ Промокод {code} на {product} в {store} действует ещё {hours} ч.',
      footer: '👉 <a href="{link}">Открыть предложение</a>'
    },
    languagePrompt: '🌐 Выбери язык интерфейса:',
    languageSaved: '✅ Язык сменён на {language}.',
    aggregatorFooter: 'Мы показываем действующие акции партнёрских магазинов. Перед заказом проверяй условия на сайте.',
    back: '⬅️ Назад',
    more: '⏭ Показать ещё',
    refineSearch: '🎯 Уточнить поиск'
  },
  en: {
    languageName: 'English',
    common: {
      mainMenu: '🏠 Main Menu'
    },
    aggregator: {
      intro: 'Hi {name}! This is BazaarGuru — your official deals aggregator.',
      pitch: 'We surface the best partner discounts and send you straight to the store to buy.',
      disclaimer: 'We do not run a warehouse: confirm stock and checkout on the store website.',
      reminder: 'We monitor Flipkart, Amazon, Myntra, Ajio, Croma and Nykaa. Always recheck availability with the store.'
    },
    menu: {
      title: '🏠 BazaarGuru Main Menu',
      buttons: {
        hotDeals: '🔥 Hot Deals',
        topDeals: '⭐ Top 10',
        categories: '🛍️ Categories',
        search: '🔍 Search',
        personal: '🎯 Personal',
        stores: '🏬 Stores',
        language: '🌐 Language',
        help: 'ℹ️ Help'
      }
    },
    search: {
      introTitle: '🔍 Find every deal with smart search!',
      introSubtitle: '💡 Type what you need or pick a category below.',
      howTitle: '🔎 How to search:',
      bullets: [
        '• Text: “OnePlus under 60000”, “Biba kurti under 1500”',
        '• Voice: hold the mic in Telegram and say your request',
        '• Photo: send a product picture — I will match similar deals'
      ],
      clarify: '🎤 Be specific for sharper results!',
      awaiting: 'Describe brand, model, category or budget — I will match it instantly.',
      fallbackVoice: 'Voice search is coming after partner API access. For now, type the request — I will fetch deals.',
      fallbackPhoto: 'Photo search is on the roadmap. Share the request as text for instant offers.',
      processingVoice: 'Processing your voice message...',
      processingImage: 'Analyzing the image...',
      voiceRecognized: 'Recognized',
      voiceError: 'Could not recognize voice. Try again or type your query.',
      imageRecognized: 'Product identified',
      imageError: 'Could not analyze the image. Try another photo or type your query.',
      category: 'Category',
      searchingFor: 'Searching for',
      analyzed: 'Query analysis',
      suggestions: 'Suggestions',
      trySearching: 'Try searching for',
      processingImageWithText: 'Analyzing image with caption'
    },
    searchSummary: {
      heading: '🧠 Looking up “{query}”…',
      statsTitle: '⚡ Found in {duration}s:',
      count: '• Offers: {count}',
      bestPrice: '• Best price: {bestPrice}',
      bestDiscount: '• Top discount: {bestDiscount}',
      bestCashback: '• Cashback: up to {cashback}',
      stores: '• Stores: {stores}'
    },
    searchTopPicksTitle: '🔥 Top picks:',
    searchOtherTitle: '🛒 More options:',
    searchFallbackTitle: '🔥 Fresh hot deals to browse:',
    searchNone: '😔 No direct match. Refine the request or pick a category.',
    categories: {
      title: '🛍️ Categories',
      hint: 'Choose a focus — I will show discounted items immediately.'
    },
    storesBlock: {
      title: '🏬 Partner stores',
      hint: 'All links go to official storefronts. Always double-check stock before ordering.'
    },
    deals: {
      hotTitle: '🔥 Fresh right now:',
      topTitle: '⭐ Weekly Top 10 deals:',
      categoryTitle: '🛒 {category}: best savings',
      storeTitle: '🏬 {store}: highlighted deals'
    },
    product: {
      headline: '{index}. {icon} <a href="{link}"><b>{name}</b></a>',
      priceLine: '   💰 {price}{original}{discount}',
      storeLine: '   🏷️ {store} • {brand}',
      couponLine: '   🎟️ Promo code: {code} ({savings})',
      noCoupon: '   🎟️ Promo auto-applies at checkout',
      storeComparisons: '   🛒 {comparisons}',
      minOrderLine: '   📦 Min. order: {minOrder}',
      lastCheckedLine: '   ⏰ Checked: {datetime}',
      highlightsLine: '   ✨ Highlights: {list}',
      discountFallback: 'discount pending',
      savingsFallback: 'extra savings'
    },
    personal: {
      title: '🎯 Personal dashboard',
      subtitle: 'Tap favourite categories, set a budget and enable alerts — I will tailor the deals.',
      favoritesLine: '❤️ Favourite categories: {list}',
      favoritesEmpty: '❤️ No favourites yet.',
      budgetLine: '💰 Budget cap: {value}',
      budgetUnlimited: 'no limit',
      notificationsLine: '🔔 Alerts: {list}',
      notificationsEmpty: '🔔 Alerts are off.',
      buttons: {
        categories: '🛍️ Categories',
        budget: '💰 Budget',
        notifications: '🔔 Alerts',
        back: '⬅️ Back'
      },
      chooseCategories: 'Tap once to add, tap again to remove. Highlighted categories show up more often.',
      chooseBudget: 'Pick your comfortable limit to hide pricey items:',
      budgetSet: 'Budget updated: {value}.',
      notificationLabels: {
        price: 'Price drop',
        cashback: 'Cashback return',
        coupon: 'Expiring coupon'
      },
      notificationOn: '“{name}” alerts enabled — we’ll push fresh triggers.',
      notificationOff: '“{name}” alerts disabled.',
      categoryOn: 'Added to favourites: {name}.',
      categoryOff: 'Removed from favourites: {name}.',
      sample: {
        price: '📉 Example: {product} now {price} (was {oldPrice}).',
        cashback: '💸 Example: cashback {cashback} is back on {product}.',
        coupon: '⏰ Example: coupon {code} expires in {hours}h.'
      }
    },
    help: {
      title: 'ℹ️ Help & FAQ',
      intro: 'BazaarGuru is an aggregator of verified discounts. We do not sell stock — we highlight where to save.',
      faqTitle: '✅ FAQ',
      faqItems: [
        'Where do products come from? — Official storefronts via partner APIs; we only show live deals.',
        'Why is the assortment curated? — We highlight the biggest savings; the full catalog is on the store site.',
        'How do I use a promo code? — Tap the link and apply the code on the partner checkout page.'
      ],
      commands: '📋 Commands: /start — menu, /deal — hot deals, /search — search, /profile — stats (coming soon), /cashback — cashback guide, /help — FAQ, /language — switch language.',
      contact: '🤝 Partner with us: partner@bazaar.guru'
    },
    extras: {
      cashbackSoon: 'Cashback tracking unlocks after partner API integration. Watch the Personal tab for updates.'
    },
    messages: {
      profileSoon: '👤 Profile analytics are coming soon. We’re tracking usage so you can show searches, clicks, savings and streaks for every user. Favourites and budgets you set now will automatically appear there.',
      cashbackSoon: '💰 Cashback tracking coming soon — stay tuned.'
    },
    filters: {
      active: 'Filter: {details}',
      byFavorites: 'favourite categories ({list})',
      byBudget: 'budget up to {value}'
    },
    lists: {
      showMore: 'Show {count} more',
      noMore: 'No more deals right now — check back soon.',
      noDeals: 'No deals yet for this selection. I’ll alert you as soon as something appears.'
    },
    notificationsAuto: {
      header: '🔔 Auto alert: fresh savings',
      price: '📉 {product} at {store}: {price} (was {oldPrice}).',
      cashback: '💸 {product}: cashback up to {cashback} at {store}.',
      coupon: '🎟️ Coupon {code} on {product} at {store} stays active for {hours}h.',
      footer: '👉 <a href="{link}">Open the offer</a>'
    },
    languagePrompt: '🌐 Choose your interface language:',
    languageSaved: '✅ Language switched to {language}.',
    aggregatorFooter: 'We showcase live partner offers. Please confirm stock and terms on the store website.',
    back: '⬅️ Back',
    more: 'Show more',
    refineSearch: '🎯 Refine search'
  },
  hi: {
    languageName: 'हिन्दी',
    common: {
      mainMenu: '🏠 मुख्य मेनू'
    },
    aggregator: {
      intro: 'नमस्ते, {name}! BazaarGuru आपका आधिकारिक ऑफ़र एग्रीगेटर है।',
      pitch: 'हम पार्टनर स्टोर्स की सबसे अच्छी छूट दिखाते हैं और सीधे खरीदारी पेज तक ले जाते हैं।',
      disclaimer: 'हम खुद सामान नहीं बेचते — कृपया ऑर्डर हमेशा स्टोर की वेबसाइट पर पूरा करें।',
      reminder: 'हम Flipkart, Amazon, Myntra, Ajio, Croma और Nykaa की ताज़ा डील्स ट्रैक करते हैं। खरीद से पहले स्टोर की साइट पर विवरण देखें।'
    },
    menu: {
      title: '🏠 BazaarGuru मुख्य मेनू',
      buttons: {
        hotDeals: '🔥 आज की डील्स',
        topDeals: '⭐ टॉप 10',
        categories: '🗂 श्रेणियाँ',
        search: '🔍 खोज',
        personal: '🎯 व्यक्तिगत',
        stores: '🏬 स्टोर',
        language: '🌐 भाषा',
        help: 'ℹ️ सहायता'
      }
    },
    search: {
      introTitle: '🔍 स्मार्ट सर्च से सब कुछ ढूँढें।',
      introSubtitle: '💡 बस जो चाहिए लिखें या नीचे की श्रेणी चुनें।',
      howTitle: 'कैसे खोजें:',
      bullets: [
        '• टेक्स्ट लिखें: "OnePlus 60000 से कम", "Biba कुर्ती 1500 तक"',
        '• आवाज़ से बोलें: माइक्रोफोन दबाएँ और क्वेरी बोलें',
        '• फोटो भेजें: प्रोडक्ट की तस्वीर भेजें, मैं मिलते-जुलते ऑफ़र दिखाऊँगा'
      ],
      clarify: '🎤 क्वेरी जितनी स्पष्ट होगी, नतीजे उतने बेहतर मिलेंगे।',
      awaiting: 'ब्रांड, मॉडल या बजट लिखें — मैं तुरंत मैच करूँगा।',
      fallbackVoice: 'वॉइस सर्च पार्टनर API के बाद सक्रिय होगा। अभी टेक्स्ट भेजें।',
      fallbackPhoto: 'फोटो सर्च जल्द आएगा। फिलहाल टेक्स्ट में बताएं — तुरंत ऑफ़र मिलेंगे।',
      processingVoice: 'आवाज़ पहचान रहा हूँ...',
      processingImage: 'तस्वीर का विश्लेषण कर रहा हूँ...',
      voiceRecognized: 'पहचाना गया',
      voiceError: 'आवाज़ नहीं पहचान पाया। फिर से कोशिश करें या टेक्स्ट में लिखें।',
      imageRecognized: 'उत्पाद पहचाना गया',
      imageError: 'तस्वीर नहीं पहचान पाया। दूसरी फोटो भेजें या टेक्स्ट में लिखें।',
      category: 'श्रेणी',
      searchingFor: 'खोज रहा हूँ',
      analyzed: 'क्वेरी विश्लेषण',
      suggestions: 'सुझाव',
      trySearching: 'यह खोजें',
      processingImageWithText: 'फोटो और टेक्स्ट का विश्लेषण'
    },
    searchSummary: {
      heading: '🧠 “{query}” की तलाश…',
      statsTitle: '⚡ {duration}s में मिला:',
      count: '• ऑफ़र: {count}',
      bestPrice: '• सबसे अच्छी कीमत: {bestPrice}',
      bestDiscount: '• अधिकतम छूट: {bestDiscount}',
      bestCashback: '• कैशबैक: {cashback} तक',
      stores: '• स्टोर: {stores}'
    },
    searchTopPicksTitle: '🔥 शीर्ष ऑफ़र:',
    searchOtherTitle: '🛍 और विकल्प:',
    searchFallbackTitle: '🔥 अभी के ताज़ा ऑफ़र:',
    searchNone: '😔 इस क्वेरी पर कुछ नहीं मिला। क्वेरी बदलें या कोई श्रेणी चुनें।',
    categories: {
      title: '🗂 श्रेणियाँ',
      hint: 'कोई श्रेणी चुनें और तुरंत छूट देखें।'
    },
    storesBlock: {
      title: '🏬 पार्टनर स्टोर',
      hint: 'सारी लिंक आधिकारिक स्टोर पर ले जाती हैं। ऑर्डर से पहले विवरण जाँचें।'
    },
    deals: {
      hotTitle: '🔥 अभी के ताज़ा ऑफ़र:',
      topTitle: '⭐ साप्ताहिक टॉप 10 ऑफ़र:',
      categoryTitle: '🛍 {category}: विशेष बचत',
      storeTitle: '🏬 {store}: प्रमुख ऑफ़र'
    },
    product: {
      headline: '{index}. {icon} <a href="{link}"><b>{name}</b></a>',
      priceLine: '   💰 {price}{original}{discount}',
      storeLine: '   🏷️ {store} • {brand}',
      couponLine: '   🎫 कूपन: {code} ({savings})',
      noCoupon: '   🎫 कूपन चेकआउट पर स्वतः लागू होगा',
      storeComparisons: '   🛒 {comparisons}',
      minOrderLine: '   📦 न्यूनतम ऑर्डर: {minOrder}',
      lastCheckedLine: '   ⏰ जाँच समय: {datetime}',
      highlightsLine: '   ✨ मुख्य बातें: {list}',
      discountFallback: 'छूट की पुष्टि जारी',
      savingsFallback: 'अतिरिक्त बचत'
    },
    personal: {
      title: '🎯 व्यक्तिगत डैशबोर्ड',
      subtitle: 'मनपसंद श्रेणियाँ चुनें, बजट सेट करें और अलर्ट ऑन करें — मैं आपके लिए ऑफ़र भेजूँगा।',
      favoritesLine: '❤️ पसंदीदा श्रेणियाँ: {list}',
      favoritesEmpty: '❤️ अभी कोई पसंदीदा नहीं है।',
      budgetLine: '💰 बजट सीमा: {value}',
      budgetUnlimited: 'कोई सीमा नहीं',
      notificationsLine: '🔔 अलर्ट: {list}',
      notificationsEmpty: '🔔 अलर्ट बंद हैं।',
      buttons: {
        categories: '🗂 श्रेणियाँ',
        budget: '💰 बजट',
        notifications: '🔔 अलर्ट',
        back: '⬅️ वापस'
      },
      chooseCategories: 'एक टैप से जोड़ें, दोबारा टैप से हटाएँ। पसंदीदा ऑफ़र ज़्यादा दिखेंगे।',
      chooseBudget: 'महँगी वस्तुएँ छिपाने के लिए बजट सीमा चुनें:',
      budgetSet: 'हो गया! सीमा: {value}.',
      notificationLabels: {
        price: 'कीमत गिरी',
        cashback: 'कैशबैक वापस',
        coupon: 'कूपन समाप्त होने वाला है'
      },
      notificationOn: '“{name}” अलर्ट चालू।',
      notificationOff: '“{name}” अलर्ट बंद।',
      categoryOn: '{name} पसंदीदा में जोड़ा गया।',
      categoryOff: '{name} पसंदीदा से हटाया गया।',
      sample: {
        price: '🎯 उदाहरण: {product} अब {price} (पहले {oldPrice}).',
        cashback: '💸 उदाहरण: {product} पर {cashback} कैशबैक।',
        coupon: '⏳ उदाहरण: कूपन {code} {hours} घंटों में समाप्त होगा।'
      }
    },
    help: {
      title: 'ℹ️ सहायता',
      intro: 'BazaarGuru सत्यापित छूटों का एग्रीगेटर है। हम केवल बताते हैं कि कहाँ बचत है।',
      faqTitle: '❓ सामान्य प्रश्न',
      faqItems: [
        'उत्पाद कहाँ से आते हैं? — आधिकारिक स्टोरफ्रंट और पार्टनर API से; हम सिर्फ सक्रिय ऑफ़र दिखाते हैं।',
        'चयन सीमित क्यों है? — हम केवल सर्वश्रेष्ठ डील्स दिखाते हैं, पूरी सूची स्टोर की वेबसाइट पर है।',
        'कूपन कैसे उपयोग करें? — लिंक खोलें और स्टोर चेकआउट पर कोड डालें।'
      ],
      commands: '📋 कमांड: /start — मेनू, /deal — गर्म ऑफ़र, /search — खोज, /profile — प्रोफ़ाइल (जल्द), /cashback — कैशबैक गाइड, /help — सहायता, /language — भाषा बदलें।',
      contact: '🤝 हमसे संपर्क करें: partner@bazaar.guru'
    },
    extras: {
      cashbackSoon: 'कैशबैक ट्रैकिंग पार्टनर API के बाद सक्रिय होगी। तब तक व्यक्तिगत सेक्शन देखें।'
    },
    messages: {
      profileSoon: '👤 प्रोफ़ाइल और विस्तृत आँकड़े जल्द आ रहे हैं। अभी से पसंदीदा श्रेणियाँ और बजट सेट करें — यही डेटा नए प्रोफ़ाइल सेक्शन में दिखेगा।',
      cashbackSoon: '💰 कैशबैक ट्रैकिंग जल्द आ रही है — अपडेट का इंतज़ार करें।'
    },
    filters: {
      active: 'फ़िल्टर: {details}',
      byFavorites: 'पसंदीदा श्रेणियाँ ({list})',
      byBudget: '{value} तक बजट'
    },
    lists: {
      showMore: '⏭ और {count} दिखाएँ',
      noMore: 'इस समय और ऑफ़र नहीं हैं — जल्द ही फिर देखें।',
      noDeals: 'इस चयन के लिए अभी कोई ऑफ़र नहीं है। नया आते ही सूचित करेंगे।'
    },
    notificationsAuto: {
      header: '🔔 स्वचालित अलर्ट: नई बचत',
      price: '📉 {product} @ {store}: {price} (पहले {oldPrice}).',
      cashback: '💸 {product}: {store} पर {cashback} तक कैशबैक।',
      coupon: '🎟️ कूपन {code} {product} के लिए {store} पर {hours} घंटे मान्य है।',
      footer: '👉 <a href="{link}">ऑफ़र खोलें</a>'
    },
    languagePrompt: '🌐 अपनी भाषा चुनें:',
    languageSaved: '✅ भाषा {language} पर सेट हो गई।',
    aggregatorFooter: 'हम पार्टनर स्टोर्स के ताज़ा ऑफ़र दिखाते हैं। ऑर्डर से पहले शर्तें पढ़ें।',
    back: '⬅️ वापस',
    more: '⏭ और दिखाएँ',
    refineSearch: '🎯 खोज सटीक करें'
  },
  hn: {
    languageName: 'Hinglish',
    common: {
      mainMenu: '🏠 Main Menu'
    },
    aggregator: {
      intro: 'Namaste {name}! Ye hai BazaarGuru — official deals ka aggregator.',
      pitch: 'Hum best partner discounts dikha kar seedhe store ki website tak le jaate hain.',
      disclaimer: 'Hum khud bechne wale nahi hain — order store ki site par hi complete karo.',
      reminder: 'Flipkart, Amazon, Myntra, Ajio, Croma aur Nykaa ko hum live track karte hain. Order se pehle details check kar lo.'
    },
    menu: {
      title: '🏠 BazaarGuru Main Menu',
      buttons: {
        hotDeals: '🔥 Aaj ki deals',
        topDeals: '⭐ Top 10',
        categories: '🗂 Categories',
        search: '🔍 Search',
        personal: '🎯 Personal',
        stores: '🏬 Stores',
        language: '🌐 Bhasha',
        help: 'ℹ️ Madad'
      }
    },
    search: {
      introTitle: '🔍 Smart search se jo chahiye sab milega.',
      introSubtitle: '💡 Bas likho ya neeche buttons use karo.',
      howTitle: 'Kaise search kare:',
      bullets: [
        '• Text: “OnePlus 60000 ke andar”, “Biba kurti 1500 tak”',
        '• Voice: mic dabao aur query bolo',
        '• Photo: product ki photo bhejo, main similar deals dikhauga'
      ],
      clarify: '🎤 Query jitni clear hogi, deal utni perfect milegi.',
      awaiting: 'Text bhejo ya category choose karo — main turant match karta hoon.',
      fallbackVoice: 'Voice search partner API ke baad activate hoga. Tab tak text bhejo.',
      fallbackPhoto: 'Photo search bhi roadmap pe hai. Filhaal text query bhejo — deals turant milenge.',
      processingVoice: 'Voice message process kar raha hoon...',
      processingImage: 'Image analyze kar raha hoon...',
      voiceRecognized: 'Samjha',
      voiceError: 'Voice samajh nahi aaya. Dobara try karo ya text mein likho.',
      imageRecognized: 'Product pehchaan liya',
      imageError: 'Image samajh nahi aaya. Doosri photo bhejo ya text mein likho.',
      category: 'Category',
      searchingFor: 'Dhoond raha hoon',
      analyzed: 'Query analysis',
      suggestions: 'Suggestions',
      trySearching: 'Ye search karo',
      processingImageWithText: 'Photo aur text analyze kar raha hoon'
    },
    searchSummary: {
      heading: '🧠 “{query}” dhoond raha hoon…',
      statsTitle: '⚡ {duration}s mein mila:',
      count: '• Offers: {count}',
      bestPrice: '• Best price: {bestPrice}',
      bestDiscount: '• Top discount: {bestDiscount}',
      bestCashback: '• Cashback: {cashback} tak',
      stores: '• Stores: {stores}'
    },
    searchTopPicksTitle: '🔥 Top picks:',
    searchOtherTitle: '🛍 Aur options:',
    searchFallbackTitle: '🔥 Abhi ke fresh deals dekho:',
    searchNone: '😔 Is query par kuch nahi mila. Query refine karo ya koi category chuno.',
    categories: {
      title: '🗂 Categories',
      hint: 'Category choose karo aur turant deals dekho.'
    },
    storesBlock: {
      title: '🏬 Partner stores',
      hint: 'Saari links official storefronts par le jaati hain. Order se pehle details check kar lo.'
    },
    deals: {
      hotTitle: '🔥 Fresh deals abhi:',
      topTitle: '⭐ Hafte ki Top-10 deals:',
      categoryTitle: '🛍 {category}: best savings',
      storeTitle: '🏬 {store}: highlight offers'
    },
    product: {
      headline: '{index}. {icon} <a href="{link}"><b>{name}</b></a>',
      priceLine: '   💰 {price}{original}{discount}',
      storeLine: '   🏷️ {store} • {brand}',
      couponLine: '   🎫 Coupon: {code} ({savings})',
      noCoupon: '   🎫 Coupon checkout par auto apply hoga',
      storeComparisons: '   🛒 {comparisons}',
      minOrderLine: '   📦 Min order: {minOrder}',
      lastCheckedLine: '   ⏰ Checked: {datetime}',
      highlightsLine: '   ✨ Highlights: {list}',
      discountFallback: 'discount confirm ho raha hai',
      savingsFallback: 'extra bachat'
    },
    personal: {
      title: '🎯 Personal dashboard',
      subtitle: 'Pasand ki categories tap karo, budget set karo aur alerts on karo — main deals customise karunga.',
      favoritesLine: '❤️ Favourite categories: {list}',
      favoritesEmpty: '❤️ Abhi koi favourite nahi.',
      budgetLine: '💰 Budget limit: {value}',
      budgetUnlimited: 'limit nahi',
      notificationsLine: '🔔 Alerts: {list}',
      notificationsEmpty: '🔔 Alerts off hain.',
      buttons: {
        categories: '🗂 Categories',
        budget: '💰 Budget',
        notifications: '🔔 Alerts',
        back: '⬅️ Back'
      },
      chooseCategories: 'Tap ek baar add, dobara tap remove. Highlighted categories zyada dikhenge.',
      chooseBudget: 'Budget limit choose karo:',
      budgetSet: 'Ho gaya! Limit: {value}.',
      notificationLabels: {
        price: 'Price drop',
        cashback: 'Cashback wapas',
        coupon: 'Coupon expire'
      },
      notificationOn: 'Alerts “{name}” on ho gaye.',
      notificationOff: 'Alerts “{name}” off ho gaye.',
      categoryOn: '{name} favourites mein add.',
      categoryOff: '{name} favourites se remove.',
      sample: {
        price: '🎯 Example: {product} ab {price} (pehle {oldPrice}).',
        cashback: '💸 Example: {product} par {cashback} cashback.',
        coupon: '⏳ Example: coupon {code} {hours} ghante mein khatam.'
      }
    },
    help: {
      title: 'ℹ️ Madad',
      intro: 'BazaarGuru ek savings aggregator hai. Hum sirf dikhate hain kahan discount mil raha है.',
      faqTitle: '❓ FAQ',
      faqItems: [
        'Products kahan se aate hain? — Official storefronts ke partner APIs se; sirf active deals dikhte हैं.',
        'Assortment kam kyu है? — Hum best offers highlight karte hain, full catalog store website par hai.',
        'Coupon kaise use kare? — Link kholo aur checkout par code apply karo.'
      ],
      commands: '📋 Commands: /start — main menu, /deal — hot deals, /search — search, /profile — profile (jaldi), /cashback — cashback guide, /help — help, /language — bhasha badlo.',
      contact: '🤝 Humein likho: partner@bazaar.guru'
    },
    extras: {
      cashbackSoon: 'Cashback feature partner API ke baad launch hoga. Tab tak Personal section follow karo.'
    },
    messages: {
      profileSoon: '👤 Profile module jald aa raha है. Analytics tayyar kar rahe hain taaki aap searches, clicks aur savings user ko dikha sako. Favourites aur budgets abhi set karo — wahi data profile mein dikhega.',
      cashbackSoon: '💰 Cashback dashboard jaldi aa raha hai. Partner reports plug hote hi yahan balance dikhayenge.'
    },
    filters: {
      active: 'Filter: {details}',
      byFavorites: 'favourite categories ({list})',
      byBudget: 'budget {value} tak'
    },
    lists: {
      showMore: '⏭ Aur {count} dikhao',
      noMore: 'Filhaal aur deals nahi — jaldi check karo.',
      noDeals: 'Is selection par abhi deals nahi. Nayi offer aate hi bataunga.'
    },
    notificationsAuto: {
      header: '🔔 Auto alert: nayi savings',
      price: '📉 {product} @ {store}: {price} (pehle {oldPrice}).',
      cashback: '💸 {product}: cashback {cashback} tak {store} par.',
      coupon: '🎟️ Coupon {code} {product} ke liye {store} par {hours} ghante valid है.',
      footer: '👉 <a href="{link}">Deal kholo</a>'
    },
    languagePrompt: '🌐 Apni bhasha chuno:',
    languageSaved: '✅ Language {language} set ho गया.',
    aggregatorFooter: 'Hum partner stores کی active deals दिखाते hain. Order से पहले store की site पर details check karo.',
    back: '⬅️ Back',
    more: '⏭ Aur dikhao',
    refineSearch: '🎯 Search refine karo'
  }
};

const LOCALE_MAP = {
  ru: 'ru-RU',
  en: 'en-IN',
  hi: 'hi-IN',
  hn: 'en-IN'
};

const applyTemplate = (template, params = {}) => {
  if (typeof template !== 'string') {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_, key) => {
    if (params[key] === undefined || params[key] === null) {
      return `{${key}}`;
    }
    return params[key];
  });
};

const walkPath = (obj, path) => {
  return path.split('.').reduce((acc, part) => {
    if (!acc) {
      return undefined;
    }
    return acc[part];
  }, obj);
};

const getLocale = (lang) => LOCALE_MAP[lang] || LOCALE_MAP[DEFAULT_LANG];

const translate = (lang, path, params = {}) => {
  const pack = TEXTS[lang] || TEXTS[DEFAULT_LANG];
  const value = walkPath(pack, path);

  if (Array.isArray(value)) {
    return value.map((item) => (typeof item === 'string' ? applyTemplate(item, params) : item));
  }

  if (typeof value === 'string') {
    return applyTemplate(value, params);
  }

  if (value !== undefined) {
    return value;
  }

  const fallback = walkPath(TEXTS[DEFAULT_LANG], path);

  if (Array.isArray(fallback)) {
    return fallback.map((item) => (typeof item === 'string' ? applyTemplate(item, params) : item));
  }

  if (typeof fallback === 'string') {
    return applyTemplate(fallback, params);
  }

  return path;
};

module.exports = {
  DEFAULT_LANG,
  SUPPORTED_LANGS,
  TEXTS,
  getLocale,
  translate
};

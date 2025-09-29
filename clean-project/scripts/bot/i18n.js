const DEFAULT_LANG = 'ru';
const SUPPORTED_LANGS = ['ru', 'en', 'hi'];

const TEXTS = {
  ru: {
    languageName: 'Р СѓСЃСЃРєРёР№',
    common: {
      mainMenu: 'рџЏ  Р“Р»Р°РІРЅРѕРµ РјРµРЅСЋ'
    },
    aggregator: {
      intro: 'РџСЂРёРІРµС‚, {name}! Р­С‚Рѕ BazaarGuru вЂ” Р°РіСЂРµРіР°С‚РѕСЂ РѕС„РёС†РёР°Р»СЊРЅС‹С… СЃРєРёРґРѕРє Рё РїСЂРѕРјРѕРєРѕРґРѕРІ.',
      pitch: 'РњС‹ РїРѕРєР°Р·С‹РІР°РµРј Р»СѓС‡С€РёРµ РІС‹РіРѕРґС‹ РїР°СЂС‚РЅС‘СЂРѕРІ Рё РІРµРґС‘Рј РЅР°РїСЂСЏРјСѓСЋ РІ РјР°РіР°Р·РёРЅ Р·Р° РїРѕРєСѓРїРєРѕР№.',
      disclaimer: 'РњС‹ РЅРµ СЃРєР»Р°Рґ Рё РЅРµ РјР°СЂРєРµС‚РїР»РµР№СЃ: РѕС„РѕСЂРјР»СЏР№ Р·Р°РєР°Р· РЅР° СЃР°Р№С‚Рµ РјР°РіР°Р·РёРЅР°, РїСЂРѕРІРµСЂСЏСЏ РЅР°Р»РёС‡РёРµ Рё СѓСЃР»РѕРІРёСЏ.',
      reminder: 'РЎР»РµРґРёРј Р·Р° Flipkart, Amazon, Myntra, Ajio, Croma Рё Nykaa. РђРєС‚СѓР°Р»СЊРЅРѕСЃС‚СЊ СѓС‚РѕС‡РЅСЏР№ Сѓ РјР°РіР°Р·РёРЅР°.'
    },
    menu: {
      title: 'рџЏ  Р“Р»Р°РІРЅРѕРµ РјРµРЅСЋ BazaarGuru',
      buttons: {
        hotDeals: 'рџ”Ґ РЎРєРёРґРєРё РґРЅСЏ',
        topDeals: 'в­ђ РўРћРџ 10',
        categories: 'рџ—‚ РљР°С‚РµРіРѕСЂРёРё',
        search: 'рџ”Ќ РџРѕРёСЃРє',
        personal: 'рџ’Ў РџРµСЂСЃРѕРЅР°Р»СЊРЅРѕРµ',
        stores: 'рџЏ¬ РњР°РіР°Р·РёРЅС‹',
        language: 'рџЊђ РЇР·С‹Рє',
        help: 'рџ† РџРѕРјРѕС‰СЊ'
      }
    },
    search: {
      introTitle: 'рџ”Ќ РќР°Р№РґС‘Рј РІСЃС‘ РЅСѓР¶РЅРѕРµ С‡РµСЂРµР· СѓРјРЅС‹Р№ РїРѕРёСЃРє.',
      introSubtitle: 'РќР°РїРёС€Рё, С‡С‚Рѕ РёС‰РµС€СЊ, РёР»Рё РІРѕСЃРїРѕР»СЊР·СѓР№СЃСЏ РєРЅРѕРїРєР°РјРё РЅРёР¶Рµ.',
      howTitle: 'РљР°Рє РёСЃРєР°С‚СЊ:',
      bullets: [
        'вЂў РўРµРєСЃС‚РѕРј: В«OnePlus РґРѕ 60000В», В«РєСѓСЂС‚Рё Biba РґРѕ 1500В»',
        'вЂў Р“РѕР»РѕСЃРѕРј: СѓРґРµСЂР¶Рё РјРёРєСЂРѕС„РѕРЅ Рё РЅР°Р·РѕРІРё Р·Р°РїСЂРѕСЃ',
        'вЂў Р¤РѕС‚Рѕ: РѕС‚РїСЂР°РІСЊ СЃРЅРёРјРѕРє С‚РѕРІР°СЂР° вЂ” РїРѕРєР°Р¶Сѓ РїРѕС…РѕР¶РёРµ РІР°СЂРёР°РЅС‚С‹'
      ],
      clarify: 'Р§РµРј С‚РѕС‡РЅРµРµ Р·Р°РїСЂРѕСЃ, С‚РµРј РІС‹РіРѕРґРЅРµРµ РїРѕРґР±РѕСЂРєР°.',
      awaiting: 'Р–РґСѓ С‚РµРєСЃС‚РѕРІС‹Р№ Р·Р°РїСЂРѕСЃ РёР»Рё РІС‹Р±РµСЂРё РєР°С‚РµРіРѕСЂРёСЋ РЅРёР¶Рµ.',
      fallbackVoice: 'Р“РѕР»РѕСЃРѕРІРѕР№ РїРѕРёСЃРє РїРѕРґРєР»СЋС‡РёРј С‡РµСЂРµР· РїР°СЂС‚РЅС‘СЂСЃРєРёР№ API. РџРѕРєР° РЅР°РїРёС€Рё Р·Р°РїСЂРѕСЃ С‚РµРєСЃС‚РѕРј.',
      fallbackPhoto: 'Р¤РѕС‚Рѕ-РїРѕРёСЃРє СЃРєРѕСЂРѕ РїРѕСЏРІРёС‚СЃСЏ. РќР°РїРёС€Рё Р·Р°РїСЂРѕСЃ СЃР»РѕРІР°РјРё вЂ” СѓР¶Рµ РїРѕРґР±РµСЂСѓ СЃРєРёРґРєРё.'
    },
    searchSummary: {
      heading: 'РС‰Сѓ В«{query}В»вЂ¦',
      statsTitle: 'РќР°С€С‘Р» Р·Р° {duration} СЃРµРє:',
      count: 'вЂў РџСЂРµРґР»РѕР¶РµРЅРёР№: {count}',
      bestPrice: 'вЂў Р›СѓС‡С€Р°СЏ С†РµРЅР°: {bestPrice}',
      bestDiscount: 'вЂў РњР°РєСЃРёРјР°Р»СЊРЅР°СЏ СЃРєРёРґРєР°: {bestDiscount}',
      bestCashback: 'вЂў РљСЌС€Р±РµРє: РґРѕ {cashback}',
      stores: 'вЂў РњР°РіР°Р·РёРЅС‹: {stores}'
    },
    searchTopPicksTitle: 'рџ”Ґ Р“Р»Р°РІРЅС‹Рµ РЅР°С…РѕРґРєРё:',
    searchOtherTitle: 'рџ›Ќ Р•С‰С‘ РІР°СЂРёР°РЅС‚С‹:',
    searchFallbackTitle: 'рџ”Ґ Р“РѕСЂСЏС‡РёРµ РїСЂРµРґР»РѕР¶РµРЅРёСЏ РїСЂСЏРјРѕ СЃРµР№С‡Р°СЃ:',
    searchNone: 'рџ” РџРѕ Р·Р°РїСЂРѕСЃСѓ РЅРёС‡РµРіРѕ РЅРµ РЅР°С€С‘Р». РџРѕРїСЂРѕР±СѓР№ СѓС‚РѕС‡РЅРёС‚СЊ РёР»Рё РІС‹Р±РµСЂРё РєР°С‚РµРіРѕСЂРёСЋ вЂ” РЅРёР¶Рµ СѓР¶Рµ РµСЃС‚СЊ РіРѕС‚РѕРІС‹Рµ РїРѕРґР±РѕСЂРєРё.',
    categories: {
      title: 'рџ—‚ РљР°С‚РµРіРѕСЂРёРё',
      hint: 'Р’С‹Р±РёСЂР°Р№ РЅР°РїСЂР°РІР»РµРЅРёРµ вЂ” РїРѕРєР°Р¶Сѓ СЃРІРµР¶РёРµ СЃРєРёРґРєРё РјРѕРјРµРЅС‚Р°Р»СЊРЅРѕ.'
    },
    storesBlock: {
      title: 'рџЏ¬ РџР°СЂС‚РЅС‘СЂСЃРєРёРµ РјР°РіР°Р·РёРЅС‹',
      hint: 'Р’СЃРµ СЃСЃС‹Р»РєРё РІРµРґСѓС‚ РЅР° РѕС„РёС†РёР°Р»СЊРЅС‹Рµ РІРёС‚СЂРёРЅС‹. РЈС‚РѕС‡РЅСЏР№ РЅР°Р»РёС‡РёРµ РїРµСЂРµРґ РїРѕРєСѓРїРєРѕР№.'
    },
    deals: {
      hotTitle: 'рџ”Ґ РЎРІРµР¶РµРµ РїСЂСЏРјРѕ СЃРµР№С‡Р°СЃ:',
      topTitle: 'в­ђ РўРћРџвЂ‘10 РїСЂРµРґР»РѕР¶РµРЅРёР№ РЅРµРґРµР»Рё:',
      categoryTitle: 'рџ›Ќ {category}: РІС‹РіРѕРґРЅС‹Рµ РїРѕРґР±РѕСЂРєРё',
      storeTitle: 'рџЏ¬ {store}: Р»СѓС‡С€РёРµ СЃРєРёРґРєРё'
    },
    product: {
      headline: '{index}. {icon} <a href="{link}"><b>{name}</b></a>',
      priceLine: '   рџ’° {price}{original}{discount}',
      storeLine: '   рџЏ·пёЏ {store} вЂў {brand}',
      couponLine: '   рџЋ« РџСЂРѕРјРѕРєРѕРґ: {code} ({savings})',
      noCoupon: '   рџЋ« РџСЂРѕРјРѕРєРѕРґ РїСЂРёРјРµРЅРёС‚СЃСЏ РїСЂРё РѕС„РѕСЂРјР»РµРЅРёРё РЅР° СЃР°Р№С‚Рµ РјР°РіР°Р·РёРЅР°',
      storeComparisons: '   рџ›’ {comparisons}',
      minOrderLine: '   рџ“¦ РњРёРЅ. Р·Р°РєР°Р·: {minOrder}',
      lastCheckedLine: '   вЏ° РџСЂРѕРІРµСЂРµРЅРѕ: {datetime}',
      highlightsLine: '   вњЁ Р’Р°Р¶РЅРѕ: {list}',
      discountFallback: 'СЃРєРёРґРєР° СѓС‚РѕС‡РЅСЏРµС‚СЃСЏ',
      savingsFallback: 'РґРѕРїРѕР»РЅРёС‚РµР»СЊРЅР°СЏ РІС‹РіРѕРґР°'
    },
    personal: {
      title: 'рџ’Ў РџРµСЂСЃРѕРЅР°Р»СЊРЅС‹Рµ РЅР°СЃС‚СЂРѕР№РєРё',
      subtitle: 'РќР°Р¶РјРё РЅР° РєР°С‚РµРіРѕСЂРёРё, Р·Р°РґР°Р№ Р±СЋРґР¶РµС‚ Рё РІРєР»СЋС‡Рё СѓРІРµРґРѕРјР»РµРЅРёСЏ вЂ” Р±СѓРґСѓ РїСЂРёСЃС‹Р»Р°С‚СЊ РЅСѓР¶РЅС‹Рµ СЃРєРёРґРєРё.',
      favoritesLine: 'вќ¤пёЏ Р›СЋР±РёРјС‹Рµ РєР°С‚РµРіРѕСЂРёРё: {list}',
      favoritesEmpty: 'вќ¤пёЏ РљР°С‚РµРіРѕСЂРёРё РїРѕРєР° РЅРµ РІС‹Р±СЂР°РЅС‹.',
      budgetLine: 'рџ’° РЎР»РµР¶Сѓ Р·Р° Р±СЋРґР¶РµС‚РѕРј: {value}',
      budgetUnlimited: 'Р±РµР· РѕРіСЂР°РЅРёС‡РµРЅРёР№',
      notificationsLine: 'рџ”” РЈРІРµРґРѕРјР»РµРЅРёСЏ: {list}',
      notificationsEmpty: 'рџ”” РЈРІРµРґРѕРјР»РµРЅРёСЏ РІС‹РєР»СЋС‡РµРЅС‹.',
      buttons: {
        categories: 'рџ—‚ РљР°С‚РµРіРѕСЂРёРё',
        budget: 'рџ’° Р‘СЋРґР¶РµС‚',
        notifications: 'рџ”” РЈРІРµРґРѕРјР»РµРЅРёСЏ',
        back: 'в¬…пёЏ РќР°Р·Р°Рґ'
      },
      chooseCategories: 'РћРґРЅРѕ РЅР°Р¶Р°С‚РёРµ РґРѕР±Р°РІР»СЏРµС‚ РєР°С‚РµРіРѕСЂРёСЋ, РїРѕРІС‚РѕСЂРЅРѕРµ СѓР±РёСЂР°РµС‚. РћС‚РјРµС‡РµРЅРЅС‹Рµ РїРѕРєР°Р·С‹РІР°СЋ С‡Р°С‰Рµ.',
      chooseBudget: 'Р’С‹Р±РµСЂРё Р»РёРјРёС‚ Р±СЋРґР¶РµС‚Р°, С‡С‚РѕР±С‹ СЃРєСЂС‹РІР°С‚СЊ РґРѕСЂРѕРіРёРµ С‚РѕРІР°СЂС‹:',
      budgetSet: 'Р“РѕС‚РѕРІРѕ! Р›РёРјРёС‚: {value}.',
      notificationLabels: {
        price: 'РџР°РґРµРЅРёРµ С†РµРЅС‹',
        cashback: 'Р’РѕР·РІСЂР°С‚ РєРµС€Р±СЌРєР°',
        coupon: 'РљСѓРїРѕРЅ Р·Р°РєР°РЅС‡РёРІР°РµС‚СЃСЏ'
      },
      notificationOn: 'РЈРІРµРґРѕРјР»РµРЅРёСЏ В«{name}В» РІРєР»СЋС‡РµРЅС‹.',
      notificationOff: 'РЈРІРµРґРѕРјР»РµРЅРёСЏ В«{name}В» РІС‹РєР»СЋС‡РµРЅС‹.',
      categoryOn: 'Р”РѕР±Р°РІРёР» РІ Р»СЋР±РёРјС‹Рµ: {name}.',
      categoryOff: 'РЈР±СЂР°Р» РёР· Р»СЋР±РёРјС‹С…: {name}.',
      sample: {
        price: 'рџЋЇ РџСЂРёРјРµСЂ: {product} СѓРїР°Р» РІ С†РµРЅРµ РґРѕ {price} (Р±С‹Р»Рѕ {oldPrice}).',
        cashback: 'рџ’ё РџСЂРёРјРµСЂ: РїРѕ {product} СЃРЅРѕРІР° РґРµР№СЃС‚РІСѓРµС‚ РєРµС€Р±СЌРє {cashback}.',
        coupon: 'вЏі РџСЂРёРјРµСЂ: РїСЂРѕРјРѕРєРѕРґ {code} РёСЃС‚РµРєР°РµС‚ С‡РµСЂРµР· {hours} С‡.'
      }
    },
    help: {
      title: 'рџ† РџРѕРјРѕС‰СЊ',
      intro: 'BazaarGuru вЂ” Р°РіСЂРµРіР°С‚РѕСЂ РѕС„РёС†РёР°Р»СЊРЅС‹С… СЃРєРёРґРѕРє. РњС‹ РЅРµ РїСЂРѕРґР°С‘Рј С‚РѕРІР°СЂС‹, РїРѕРєР°Р·С‹РІР°РµРј РіРґРµ РІС‹РіРѕРґРЅРѕ РєСѓРїРёС‚СЊ.',
      faqTitle: 'вќ“ Р§Р°СЃС‚С‹Рµ РІРѕРїСЂРѕСЃС‹',
      faqItems: [
        'РћС‚РєСѓРґР° С‚РѕРІР°СЂС‹? вЂ” РР· РѕС„РёС†РёР°Р»СЊРЅС‹С… РІРёС‚СЂРёРЅ РїРѕ РїР°СЂС‚РЅС‘СЂСЃРєРёРј API; РїРѕРєР°Р·С‹РІР°РµРј С‚РѕР»СЊРєРѕ Р°РєС‚СѓР°Р»СЊРЅС‹Рµ Р°РєС†РёРё.',
        'РџРѕС‡РµРјСѓ Р°СЃСЃРѕСЂС‚РёРјРµРЅС‚ РѕРіСЂР°РЅРёС‡РµРЅ? вЂ” РњС‹ С„РёР»СЊС‚СЂСѓРµРј Р»СѓС‡С€РёРµ РїСЂРµРґР»РѕР¶РµРЅРёСЏ, РѕСЃС‚Р°Р»СЊРЅРѕРµ РёС‰Рё РЅР° СЃР°Р№С‚Рµ РјР°РіР°Р·РёРЅР°.',
        'РљР°Рє РёСЃРїРѕР»СЊР·РѕРІР°С‚СЊ РїСЂРѕРјРѕРєРѕРґ? вЂ” РќР°Р¶РјРё СЃСЃС‹Р»РєСѓ С‚РѕРІР°СЂР° Рё РІРІРµРґРё РєРѕРґ РїСЂРё РѕС„РѕСЂРјР»РµРЅРёРё РЅР° СЃР°Р№С‚Рµ РјР°РіР°Р·РёРЅР°.'
      ],
      commands: 'рџ“‹ РљРѕРјР°РЅРґС‹: /start вЂ” РіР»Р°РІРЅРѕРµ РјРµРЅСЋ, /search вЂ” РїРѕРёСЃРє, /help вЂ” РїРѕРјРѕС‰СЊ, /language вЂ” СЏР·С‹Рє.',
      contact: 'рџ¤ќ РЎРІСЏР·Р°С‚СЊСЃСЏ СЃ РЅР°РјРё: partner@bazaar.guru'
    },
    extras: {
      cashbackSoon: 'Р¤СѓРЅРєС†РёСЋ РєРµС€Р±СЌРєР° РїРѕРґРєР»СЋС‡РёРј РїРѕСЃР»Рµ РёРЅС‚РµРіСЂР°С†РёРё СЃ РїР°СЂС‚РЅС‘СЂСЃРєРёРјРё API. РџРѕРєР° СЃР»РµРґРё Р·Р° СЂР°Р·РґРµР»РѕРј В«РџРµСЂСЃРѕРЅР°Р»СЊРЅРѕРµВ».'
    },
    notificationsAuto: {
      header: '🔔 Автоуведомление: свежая выгода',
      price: '📉 {product} в {store}: {price} (было {oldPrice}).',
      cashback: '💸 {product}: кэшбек до {cashback} в {store}.',
      coupon: '🎟️ Промокод {code} на {product} в {store} действует ещё {hours} ч.',
      footer: '👉 <a href="{link}">Открыть предложение</a>'
    },
    languagePrompt: 'рџЊђ Р’С‹Р±РµСЂРё СЏР·С‹Рє РёРЅС‚РµСЂС„РµР№СЃР°:',
    languageSaved: 'вњ… РЇР·С‹Рє СЃРјРµРЅС‘РЅ РЅР° {language}.',
    aggregatorFooter: 'РњС‹ РїРѕРєР°Р·С‹РІР°РµРј РґРµР№СЃС‚РІСѓСЋС‰РёРµ Р°РєС†РёРё РїР°СЂС‚РЅС‘СЂСЃРєРёС… РјР°РіР°Р·РёРЅРѕРІ. РџРµСЂРµРґ Р·Р°РєР°Р·РѕРј РїСЂРѕРІРµСЂСЏР№ СѓСЃР»РѕРІРёСЏ РЅР° СЃР°Р№С‚Рµ.',
    back: 'в¬…пёЏ РќР°Р·Р°Рґ',
    more: 'вЏ­ РџРѕРєР°Р·Р°С‚СЊ РµС‰С‘',
    refineSearch: 'рџЋЇ РЈС‚РѕС‡РЅРёС‚СЊ РїРѕРёСЃРє'
  },
  en: {
    languageName: 'English',
    common: {
      mainMenu: 'рџЏ  Main Menu'
    },
    aggregator: {
      intro: 'Hi {name}! This is BazaarGuru вЂ” your official deals aggregator.',
      pitch: 'We surface the best partner discounts and send you straight to the store to buy.',
      disclaimer: 'We do not run a warehouse: confirm stock and checkout on the store website.',
      reminder: 'We monitor Flipkart, Amazon, Myntra, Ajio, Croma and Nykaa. Always recheck availability with the store.'
    },
    menu: {
      title: 'рџЏ  BazaarGuru Main Menu',
      buttons: {
        hotDeals: 'рџ”Ґ Hot Deals',
        topDeals: 'в­ђ Top 10',
        categories: 'рџ—‚ Categories',
        search: 'рџ”Ќ Search',
        personal: 'рџ’Ў Personal',
        stores: 'рџЏ¬ Stores',
        language: 'рџЊђ Language',
        help: 'рџ† Help'
      }
    },
    search: {
      introTitle: 'рџ”Ќ Find every deal with smart search.',
      introSubtitle: 'Type your need or tap the quick buttons.',
      howTitle: 'How to search:',
      bullets: [
        'вЂў Text: вЂњOnePlus under 60000вЂќ, вЂњBiba kurti under 1500вЂќ',
        'вЂў Voice: hold the mic and speak your query',
        'вЂў Photo: send a product photo вЂ“ I will match similar deals'
      ],
      clarify: 'The clearer the query, the sharper the deals.',
      awaiting: 'Send a text query or pick a category below.',
      fallbackVoice: 'Voice search is coming with partner APIs. For now, send the request as text.',
      fallbackPhoto: 'Photo search is on the roadmap. Share a text query and I will fetch the discounts.'
    },
    searchSummary: {
      heading: 'Searching вЂњ{query}вЂќвЂ¦',
      statsTitle: 'Found in {duration}s:',
      count: 'вЂў Offers: {count}',
      bestPrice: 'вЂў Best price: {bestPrice}',
      bestDiscount: 'вЂў Top discount: {bestDiscount}',
      bestCashback: 'вЂў Cashback: up to {cashback}',
      stores: 'вЂў Stores: {stores}'
    },
    searchTopPicksTitle: 'рџ”Ґ Top picks:',
    searchOtherTitle: 'рџ›Ќ More options:',
    searchFallbackTitle: 'рџ”Ґ Fresh hot deals to browse:',
    searchNone: 'рџ” Nothing matched this query. Refine it or pick a category вЂ” I already fetched live deals below.',
    categories: {
      title: 'рџ—‚ Categories',
      hint: 'Pick a focus and I will show discounted items instantly.'
    },
    storesBlock: {
      title: 'рџЏ¬ Partner stores',
      hint: 'All links go to official storefronts. Double-check stock before ordering.'
    },
    deals: {
      hotTitle: 'рџ”Ґ Fresh right now:',
      topTitle: 'в­ђ Weekly Top-10 deals:',
      categoryTitle: 'рџ›Ќ {category}: best savings',
      storeTitle: 'рџЏ¬ {store}: highlighted deals'
    },
    product: {
      headline: '{index}. {icon} <a href="{link}"><b>{name}</b></a>',
      priceLine: '   рџ’° {price}{original}{discount}',
      storeLine: '   рџЏ·пёЏ {store} вЂў {brand}',
      couponLine: '   рџЋ« Promo code: {code} ({savings})',
      noCoupon: '   рџЋ« Promo will auto-apply on the store checkout',
      storeComparisons: '   рџ›’ {comparisons}',
      minOrderLine: '   рџ“¦ Min. order: {minOrder}',
      lastCheckedLine: '   вЏ° Checked: {datetime}',
      highlightsLine: '   вњЁ Highlights: {list}',
      discountFallback: 'discount pending',
      savingsFallback: 'extra savings'
    },
    personal: {
      title: 'рџ’Ў Personal dashboard',
      subtitle: 'Tap favourite categories, set a budget and enable alerts вЂ” I will tailor the deals.',
      favoritesLine: 'вќ¤пёЏ Favourite categories: {list}',
      favoritesEmpty: 'вќ¤пёЏ No favourites yet.',
      budgetLine: 'рџ’° Budget cap: {value}',
      budgetUnlimited: 'no limit',
      notificationsLine: 'рџ”” Alerts: {list}',
      notificationsEmpty: 'рџ”” Alerts are off.',
      buttons: {
        categories: 'рџ—‚ Categories',
        budget: 'рџ’° Budget',
        notifications: 'рџ”” Alerts',
        back: 'в¬…пёЏ Back'
      },
      chooseCategories: 'Tap to add a category, tap again to remove it. Highlighted ones show up more often.',
      chooseBudget: 'Choose a budget limit to hide pricey items:',
      budgetSet: 'Done! Limit: {value}.',
      notificationLabels: {
        price: 'Price drop',
        cashback: 'Cashback return',
        coupon: 'Expiring coupon'
      },
      notificationOn: 'Alerts вЂњ{name}вЂќ enabled.',
      notificationOff: 'Alerts вЂњ{name}вЂќ disabled.',
      categoryOn: 'Added to favourites: {name}.',
      categoryOff: 'Removed from favourites: {name}.',
      sample: {
        price: 'рџЋЇ Example: {product} dropped to {price} (was {oldPrice}).',
        cashback: 'рџ’ё Example: cashback {cashback} back on {product}.',
        coupon: 'вЏі Example: coupon {code} expires in {hours}h.'
      }
    },
    help: {
      title: 'рџ† Help',
      intro: 'BazaarGuru is a savings aggregator. We do not sell products; we surface where the discount lives.',
      faqTitle: 'вќ“ FAQ',
      faqItems: [
        'Where do products come from? вЂ” Official storefronts via partner APIs; we only show active deals.',
        'Why is the assortment limited? вЂ” We highlight the best offers, the full catalog is on the store website.',
        'How do I use a promo code? вЂ” Tap the link and apply the code during checkout on the store page.'
      ],
      commands: 'рџ“‹ Commands: /start вЂ” main menu, /search вЂ” search, /help вЂ” help, /language вЂ” language.',
      contact: 'рџ¤ќ Contact us: partner@bazaar.guru'
    },
    extras: {
      cashbackSoon: 'Cashback tracking will appear after partner API integration. For now monitor the Personal section.'
    },
    filters: {
      active: 'Filter: {details}',
      byFavorites: 'favourite categories ({list})',
      byBudget: 'budget up to {value}'
    },
    lists: {
      showMore: 'Show {count} more',
      noMore: 'No more deals right now пїЅ check back soon.',
      noDeals: 'No deals yet for this selection. I will alert you when something appears.'
    },
    notificationsAuto: {
      header: '🔔 Auto alert: fresh savings',
      price: '📉 {product} at {store}: {price} (was {oldPrice}).',
      cashback: '💸 {product}: cashback up to {cashback} at {store}.',
      coupon: '🎟️ Coupon {code} on {product} at {store} stays active for {hours}h.',
      footer: '👉 <a href="{link}">Open the deal</a>'
    },
    languagePrompt: 'рџЊђ Choose your language:',
    languageSaved: 'вњ… Language switched to {language}.',
    aggregatorFooter: 'We showcase live partner offers. Please confirm stock and terms on the store website.',
    back: 'в¬…пёЏ Back',
    more: 'вЏ­ Show more',
    refineSearch: 'рџЋЇ Refine search'
  },
  hi: {
    languageName: 'Hinglish',
    common: {
      mainMenu: 'рџЏ  Main Menu'
    },
    aggregator: {
      intro: 'Namaste {name}! Ye hai BazaarGuru вЂ” official deals ka aggregator.',
      pitch: 'Hum best partner discounts dikha kar seedhe store ki website tak le jaate hain.',
      disclaimer: 'Hum khud bechne wale nahi hain вЂ” order store ki site par hi complete karo.',
      reminder: 'Flipkart, Amazon, Myntra, Ajio, Croma aur Nykaa par nazar rakhte hain. Order se pehle availability check kar lo.'
    },
    menu: {
      title: 'рџЏ  BazaarGuru Main Menu',
      buttons: {
        hotDeals: 'рџ”Ґ Aaj ki deals',
        topDeals: 'в­ђ Top 10',
        categories: 'рџ—‚ Categories',
        search: 'рџ”Ќ Search',
        personal: 'рџ’Ў Personal',
        stores: 'рџЏ¬ Stores',
        language: 'рџЊђ Bhasha',
        help: 'рџ† Madad'
      }
    },
    search: {
      introTitle: 'рџ”Ќ Smart search se jo chahiye sab milega.',
      introSubtitle: 'Bas likho ya neeche buttons use karo.',
      howTitle: 'Kaise search kare:',
      bullets: [
        'вЂў Text: вЂњOnePlus 60000 ke andarвЂќ, вЂњBiba kurti 1500 takвЂќ',
        'вЂў Voice: mic dabao aur query bolo',
        'вЂў Photo: product ki photo bhejo, main similar deals dikhauga'
      ],
      clarify: 'Query jitni clear hogi, deal utni perfect milegi.',
      awaiting: 'Text bhejo ya category choose karo.',
      fallbackVoice: 'Voice search partner API se jald aa raha hai. Tab tak text bhejo.',
      fallbackPhoto: 'Photo search bhi jald aa raha hai. Filhaal text query bhejo, deals turant milenge.'
    },
    searchSummary: {
      heading: '"{query}" dhoond raha hoonвЂ¦',
      statsTitle: '{duration}s mein mila:',
      count: 'вЂў Offers: {count}',
      bestPrice: 'вЂў Best price: {bestPrice}',
      bestDiscount: 'вЂў Max discount: {bestDiscount}',
      bestCashback: 'вЂў Cashback: {cashback} tak',
      stores: 'вЂў Stores: {stores}'
    },
    searchTopPicksTitle: 'рџ”Ґ Top picks:',
    searchOtherTitle: 'рџ›Ќ Aur options:',
    searchFallbackTitle: 'рџ”Ґ Abhi ke best deals dekho:',
    searchNone: 'рџ” Is query par kuch nahi mila. Query refine karo ya neeche category choose karo вЂ” hot deals ready hain.',
    categories: {
      title: 'рџ—‚ Categories',
      hint: 'Category choose karo aur turant deals dekho.'
    },
    storesBlock: {
      title: 'рџЏ¬ Partner stores',
      hint: 'Saari links official storefronts par le jaati hain. Order se pehle availability check kar lo.'
    },
    deals: {
      hotTitle: 'рџ”Ґ Fresh deals abhi:',
      topTitle: 'в­ђ Hafte ki Top-10 deals:',
      categoryTitle: 'рџ›Ќ {category}: best deals',
      storeTitle: 'рџЏ¬ {store}: top offers'
    },
    product: {
      headline: '{index}. {icon} <a href="{link}"><b>{name}</b></a>',
      priceLine: '   рџ’° {price}{original}{discount}',
      storeLine: '   рџЏ·пёЏ {store} вЂў {brand}',
      couponLine: '   рџЋ« Coupon: {code} ({savings})',
      noCoupon: '   рџЋ« Coupon checkout par auto apply hoga',
      storeComparisons: '   рџ›’ {comparisons}',
      minOrderLine: '   рџ“¦ Min order: {minOrder}',
      lastCheckedLine: '   вЏ° Checked: {datetime}',
      highlightsLine: '   вњЁ Highlights: {list}',
      discountFallback: 'discount confirm ho raha hai',
      savingsFallback: 'extra bachat'
    },
    personal: {
      title: 'рџ’Ў Personal dashboard',
      subtitle: 'Pasand ki categories tap karo, budget set karo aur alerts on karo вЂ” main deals customise karunga.',
      favoritesLine: 'вќ¤пёЏ Favourite categories: {list}',
      favoritesEmpty: 'вќ¤пёЏ Abhi koi favourite nahi.',
      budgetLine: 'рџ’° Budget limit: {value}',
      budgetUnlimited: 'limit nahi',
      notificationsLine: 'рџ”” Alerts: {list}',
      notificationsEmpty: 'рџ”” Alerts off hain.',
      buttons: {
        categories: 'рџ—‚ Categories',
        budget: 'рџ’° Budget',
        notifications: 'рџ”” Alerts',
        back: 'в¬…пёЏ Back'
      },
      chooseCategories: 'Category add karne ke liye ek tap, hatane ke liye dobara tap.',
      chooseBudget: 'Budget limit choose karo:',
      budgetSet: 'Ho gaya! Limit: {value}.',
      notificationLabels: {
        price: 'Price drop',
        cashback: 'Cashback wapas',
        coupon: 'Coupon expire'
      },
      notificationOn: 'Alerts вЂњ{name}вЂќ on ho gaye.',
      notificationOff: 'Alerts вЂњ{name}вЂќ off ho gaye.',
      categoryOn: '{name} favourites mein add.',
      categoryOff: '{name} favourites se remove.',
      sample: {
        price: 'рџЋЇ Example: {product} ab {price} (pehle {oldPrice}).',
        cashback: 'рџ’ё Example: {product} par {cashback} cashback.',
        coupon: 'вЏі Example: coupon {code} {hours} ghante mein khatam.'
      }
    },
    help: {
      title: 'рџ† Madad',
      intro: 'BazaarGuru ek savings aggregator hai. Hum sirf dikhate hain kahan discount mil raha hai.',
      faqTitle: 'вќ“ FAQ',
      faqItems: [
        'Products kahan se aate hain? вЂ” Official storefronts ke partner APIs se; sirf active deals dikhte hain.',
        'Assortment kam kyu hai? вЂ” Hum best offers highlight karte hain, full catalog store website par hai.',
        'Coupon kaise use kare? вЂ” Link kholo aur checkout par code apply karo.'
      ],
      commands: 'рџ“‹ Commands: /start вЂ” main menu, /search вЂ” search, /help вЂ” help, /language вЂ” bhasha badlo.',
      contact: 'рџ¤ќ Humein likho: partner@bazaar.guru'
    },
    extras: {
      cashbackSoon: 'Cashback feature partner API ke baad launch hoga. Tab tak Personal section follow karo.'
    },
    filters: {
      active: 'Filter: {details}',
      byFavorites: 'favourite categories ({list})',
      byBudget: 'budget {value} tak'
    },
    lists: {
      showMore: 'Aur {count} dikhao',
      noMore: 'Filhaal aur deals nahi пїЅ jaldi check karo.',
      noDeals: 'Is selection par abhi deals nahi. Nayi offer aate hi bataunga.'
    },
    notificationsAuto: {
      header: '🔔 Auto alert: nayi savings',
      price: '📉 {product} @ {store}: {price} (pehle {oldPrice}).',
      cashback: '💸 {product}: cashback {cashback} tak {store} par.',
      coupon: '🎟️ Coupon {code} {product} ke liye {store} par {hours} ghante valid hai.',
      footer: '👉 <a href="{link}">Deal kholo</a>'
    },
    languagePrompt: 'рџЊђ Apni bhasha chuno:',
    languageSaved: 'вњ… Language {language} set ho gaya.',
    aggregatorFooter: 'Hum partner stores ki active deals dikhate hain. Order se pehle store website par details check kar lo.',
    back: 'в¬…пёЏ Back',
    more: 'вЏ­ Aur dikhao',
    refineSearch: 'рџЋЇ Search refine karo'
  }
};

const LOCALE_MAP = {
  ru: 'ru-RU',
  en: 'en-IN',
  hi: 'en-IN'
};

const applyTemplate = (template, params = {}) => {
  if (typeof template !== 'string') {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    if (params[key] === undefined || params[key] === null) {
      return `{${key}}`;
    }
    return String(params[key]);
  });
};

const walkPath = (obj, path) =>
  path.split('.').reduce((acc, key) => {
    if (acc && Object.prototype.hasOwnProperty.call(acc, key)) {
      return acc[key];
    }
    return undefined;
  }, obj);

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


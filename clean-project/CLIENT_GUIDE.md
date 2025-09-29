# 🚀 Руководство клиента по BazaarGuru Bot

Этот файл — короткий маршрут для владельца бота. Пройдите шаги сверху вниз, и ваш BazaarGuru Bot будет приносить комиссию с реальных скидок.

## 1. Что входит в комплект
```
clean-project/
├── README.md                      # краткий старт
├── package.json                   # зависимости
├── .env.example                   # образец конфигурации
├── data/sample-products.json      # демо-товары и промокоды
├── scripts/bazaarguru-wow-bot.js  # основной бот
└── презентация клиенту/
    ├── SAFE_PROJECT_OVERVIEW.md   # демо-сценарий
    ├── SAFE_BUSINESS_OVERVIEW.md  # монетизация
    ├── UNIQUE_FEATURES_ANALYSIS.md# уникальные фишки
    ├── CLIENT_SETUP_GUIDE.md      # это руководство
    └── CLIENT_SETUP_CHECKLIST.md  # чек-лист галочек
```

## 2. Быстрый запуск демо (5 минут)
1. `npm install`
2. Скопируйте `.env.example` → `.env`, вставьте `TELEGRAM_BOT_TOKEN`
3. Запустите `node clean-project/scripts/bazaarguru-wow-bot.js`
4. Откройте бот в Telegram и пройдите сценарий из `SAFE_PROJECT_OVERVIEW.md`

## 3. Чем владеете после запуска
- Мультиязычное меню (RU / EN / Hinglish)
- Смарт-поиск с карточками (магазин, цена, промокод, дата проверки)
- Персональные настройки (категории, бюджет, автоуведомления)
- Честный UX: всегда говорим, что мы агрегатор выгод
- Демоданные в `sample-products.json`, готовые к замене на реальные

## 4. Подключаем реальные данные
1. Получите партнёрские ключи (Flipkart, Amazon, Myntra, Ajio, Croma, Nykaa) — подробные инструкции в `API_SETUP_GUIDE.md`
2. Настройте функцию `loadProducts()` (`scripts/bot/catalog.js`), чтобы она подгружала товары из API или вашей БД
3. Если магазин выдаёт отдельные купоны — добавьте их в `data/manual-promocodes.json` или создайте сервис импорта
4. Убедитесь, что поле `lastChecked` у товаров обновляется не реже 24 часов

## 5. Голос и поиск по фото (опционально)
- Подключите провайдера распознавания речи (Google / Azure / AWS / Yandex), добавьте ключи в `.env` (`SPEECH_API_KEY`, `SPEECH_API_URL`) и передайте расшифровку в `processSearch`
- Для фото используйте Google Vision / AWS Rekognition / Clarifai: распознаём категории, преобразуем в текстовый запрос
- Пока API не подключены, пользователи получают честный fallback «доступно только текстом»

## 6. Автоуведомления
- Настройте переменные:
  ```env
  NOTIFICATION_INTERVAL_MINUTES=30
  NOTIFICATION_MIN_GAP_MINUTES=180
  NOTIFICATION_MAX_PER_TICK=1
  ```
- Бот уже умеет отправлять оповещения с учётом любимых категорий и бюджета
- Для постоянной работы используйте PM2/systemd или вынесите воркер в отдельный процесс

## 7. Документация, которая вам поможет
- `CLIENT_SETUP_CHECKLIST.md` — чек-лист на один взгляд
- `API_SETUP_GUIDE.md` — где именно получить ключи магазинов и сервисов
- `SAFE_*` файлы — презентации для клиентов и инвесторов

## 8. Поддержка
- Email: partner@bazaar.guru
- Telegram: @bazaarGuru_team

Если нужна помощь с интеграцией API или адаптацией под бренд — напишите, помогу довести до 100%.

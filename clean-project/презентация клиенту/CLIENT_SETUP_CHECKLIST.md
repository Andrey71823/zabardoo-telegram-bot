# Client Setup Checklist — пошаговый план

## 0. Подготовка
- [ ] Скопировал репозиторий / распаковал архив
- [ ] Установил Node.js LTS
- [ ] Создал токен бота в BotFather

## 1. Демо
- [ ] `npm install`
- [ ] Создал `.env`, добавил `TELEGRAM_BOT_TOKEN`
- [ ] Запустил `node clean-project/scripts/bazaarguru-wow-bot.js`
- [ ] Проверил `/start`, смену языка, поиск, персональные настройки

## 2. Реальные данные
- [ ] Зарегистрировался в Flipkart Affiliate (ID + Token)
- [ ] Получил Amazon PA-API Access/Secret/Partner Tag
- [ ] Отправил заявки в Myntra, Ajio, Croma, Nykaa (получил ключи или фиды)
- [ ] Настроил `loadProducts()` — товары приходят из API/БД
- [ ] Обновил промокоды (`manual-promocodes.json` или сервис)

## 3. Кешбэк (по желанию)
- [ ] Включил отчёты заказов/конверсий в партнёрских кабинетах (Flipkart, Amazon, Ajio, Croma, Nykaa)
- [ ] Добавил передачу Telegram user ID в subID/custom tag при генерации ссылок
- [ ] Настроил выгрузку отчётов в таблицу `cashback_transactions` и привязал к пользователям
- [ ] Обновил `RealDataService`/API, чтобы показывать начисления в боте

## 4. Голос / Фото (если нужно)
- [ ] Активировал Speech API (Google/Azure/AWS/Яндекс)
- [ ] Прописал ключи в `.env`
- [ ] Проверил, что голосовой запрос превращается в текстовый поиск
- [ ] Подключил Vision API / Rekognition / Clarifai для фото

## 5. Автоуведомления и аналитика
- [ ] Настроил `NOTIFICATION_INTERVAL_MINUTES`, `NOTIFICATION_MIN_GAP_MINUTES`, `NOTIFICATION_MAX_PER_TICK`
- [ ] Запустил монитора или cron/PM2 для постоянной работы
- [ ] Добавил UTM и проверил отчёты в партнёрских панелях

## 6. Финальные правки
- [ ] Обновил FAQ и контактные данные на свои
- [ ] Проверил, что лейблы и тексты корректны на всех языках
- [ ] Подготовил презентации для Telderi (SAFE_* + уникальные файлы)

Готово! Бот можно демонстрировать и запускать в бой. Если потребуется помощь — partner@bazaar.guru / @bazaarGuru_team.

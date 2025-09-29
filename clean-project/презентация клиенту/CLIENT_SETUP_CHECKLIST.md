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

## 3. Голос / Фото (если нужно)
- [ ] Активировал Speech API (Google/Azure/AWS/Яндекс)
- [ ] Прописал ключи в `.env`
- [ ] Проверил, что голосовой запрос превращается в текстовый поиск
- [ ] Подключил Vision API / Rekognition / Clarifai для фото

## 4. Автоуведомления и аналитика
- [ ] Настроил `NOTIFICATION_INTERVAL_MINUTES`, `NOTIFICATION_MIN_GAP_MINUTES`, `NOTIFICATION_MAX_PER_TICK`
- [ ] Запустил монитора или cron/PM2 для постоянной работы
- [ ] Добавил UTM и проверил отчёты в партнёрских панелях



Готово! Бот можно демонстрировать и запускать в бой. Если потребуется помощь — partner@bazaar.guru / @bazaarGuru_team.

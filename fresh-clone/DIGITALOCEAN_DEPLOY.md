# Деплой на DigitalOcean

## Шаг 1: Подготовка GitHub репозитория

1. Создайте новый репозиторий на GitHub:
   - Зайдите на https://github.com/new
   - Название: `zabardoo-telegram-bot`
   - Описание: `Telegram bot for coupon recommendations with AI assistant`
   - Сделайте репозиторий публичным или приватным (на ваш выбор)

2. Инициализируйте Git в проекте:
```bash
git init
git add .
git commit -m "Initial commit: Zabardoo Telegram Bot with AI features"
git branch -M main
git remote add origin https://github.com/Andrey7823/zabardoo-telegram-bot.git
git push -u origin main
```

## Шаг 2: Настройка DigitalOcean App Platform

1. Зайдите в DigitalOcean: https://cloud.digitalocean.com/
2. Перейдите в раздел "Apps"
3. Нажмите "Create App"
4. Выберите "GitHub" как источник
5. Выберите ваш репозиторий `zabardoo-telegram-bot`
6. Выберите ветку `main`

## Шаг 3: Конфигурация приложения

### Основные настройки:
- **Name**: zabardoo-bot
- **Region**: Frankfurt (ближе к России)
- **Plan**: Basic ($5/месяц для начала)

### Environment Variables (переменные окружения):
```
NODE_ENV=production
PORT=8080
TELEGRAM_BOT_TOKEN=ваш_токен_бота
DATABASE_URL=postgresql://username:password@host:port/database
OPENAI_API_KEY=ваш_openai_ключ
REDIS_URL=redis://localhost:6379
JWT_SECRET=ваш_jwt_секрет
WEBHOOK_URL=https://ваше-приложение.ondigitalocean.app/webhook
```

## Шаг 4: Настройка базы данных

1. В DigitalOcean создайте PostgreSQL базу данных:
   - Перейдите в "Databases"
   - Создайте новую PostgreSQL базу
   - Скопируйте connection string

2. Добавьте Redis для кэширования:
   - Можно использовать Redis Labs или встроенный Redis

## Шаг 5: Настройка домена и SSL

1. В настройках App Platform добавьте свой домен
2. SSL сертификат настроится автоматически

## Шаг 6: Мониторинг и логи

- Логи доступны в разделе "Runtime Logs"
- Метрики в разделе "Insights"
- Настройте алерты для мониторинга

## Команды для локальной разработки:

```bash
# Установка зависимостей
npm install

# Запуск в режиме разработки
npm run dev

# Запуск тестов
npm test

# Сборка для продакшена
npm run build

# Запуск продакшен версии
npm start
```

## Полезные команды Git:

```bash
# Добавить изменения
git add .

# Коммит
git commit -m "Описание изменений"

# Отправить на GitHub
git push origin main

# Посмотреть статус
git status

# Посмотреть историю
git log --oneline
```

## Стоимость:
- App Platform: $5-12/месяц
- PostgreSQL: $15/месяц
- Redis: $15/месяц (опционально)
- **Итого**: ~$20-40/месяц

## Автоматический деплой:
После настройки каждый push в main ветку будет автоматически деплоить новую версию.
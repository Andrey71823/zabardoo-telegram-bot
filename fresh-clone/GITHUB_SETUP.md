# Настройка GitHub и деплой на DigitalOcean

## Быстрый старт

### 1. Создание GitHub репозитория

1. Перейдите на https://github.com/new
2. Заполните данные:
   - **Repository name**: `zabardoo-telegram-bot`
   - **Description**: `Telegram bot for coupon recommendations with AI assistant`
   - **Visibility**: Public (или Private, если хотите)
   - ✅ Add a README file (можно не ставить, у нас уже есть)
   - ✅ Add .gitignore (выберите Node)
   - **License**: MIT (опционально)

3. Нажмите **Create repository**

### 2. Загрузка кода в GitHub

Выполните команды в терминале (в папке проекта):

```bash
# Инициализация Git
git init

# Добавление всех файлов
git add .

# Первый коммит
git commit -m "Initial commit: Zabardoo Telegram Bot with AI features"

# Установка основной ветки
git branch -M main

# Добавление remote origin (замените на ваш URL)
git remote add origin https://github.com/Andrey7823/zabardoo-telegram-bot.git

# Отправка в GitHub
git push -u origin main
```

### 3. Автоматический скрипт (Windows)

Запустите файл `scripts/github-setup.bat` - он сделает все автоматически.

## Деплой на DigitalOcean

### 1. Создание приложения

1. Зайдите в https://cloud.digitalocean.com/
2. Перейдите в раздел **Apps**
3. Нажмите **Create App**
4. Выберите **GitHub** как источник
5. Авторизуйтесь в GitHub
6. Выберите репозиторий `zabardoo-telegram-bot`
7. Выберите ветку `main`
8. Нажмите **Next**

### 2. Настройка приложения

**Основные настройки:**
- **App name**: `zabardoo-bot`
- **Region**: Frankfurt (ближе к России)
- **Plan**: Basic ($5/месяц)

**Build & Deploy Settings:**
- **Build Command**: `npm run build`
- **Run Command**: `npm start`
- **HTTP Port**: `8080`

### 3. Переменные окружения

Добавьте следующие переменные в разделе **Environment Variables**:

```
NODE_ENV=production
PORT=8080
TELEGRAM_BOT_TOKEN=ваш_токен_бота_от_BotFather
OPENAI_API_KEY=ваш_ключ_от_OpenAI
DATABASE_URL=будет_создан_автоматически
REDIS_URL=redis://localhost:6379
JWT_SECRET=ваш_секретный_ключ_для_JWT
WEBHOOK_URL=https://ваше-приложение.ondigitalocean.app/webhook
```

### 4. База данных

1. В том же процессе создания приложения добавьте **Database**
2. Выберите **PostgreSQL**
3. Plan: **Basic ($15/месяц)**
4. DigitalOcean автоматически создаст `DATABASE_URL`

### 5. Финальные настройки

1. Проверьте все настройки
2. Нажмите **Create Resources**
3. Дождитесь завершения деплоя (5-10 минут)

## После деплоя

### 1. Настройка Telegram Webhook

После успешного деплоя получите URL вашего приложения и настройте webhook:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://ваше-приложение.ondigitalocean.app/webhook"}'
```

### 2. Проверка работы

1. Откройте ваш бот в Telegram
2. Отправьте команду `/start`
3. Проверьте логи в DigitalOcean Dashboard

### 3. Мониторинг

- **Логи**: Apps → ваше приложение → Runtime Logs
- **Метрики**: Apps → ваше приложение → Insights
- **Алерты**: Settings → Alerts

## Стоимость

- **App Platform**: $5/месяц (Basic)
- **PostgreSQL**: $15/месяц (Basic)
- **Трафик**: Включен в план
- **SSL**: Бесплатно
- **Домен**: Бесплатный поддомен .ondigitalocean.app

**Итого**: ~$20/месяц

## Полезные команды

```bash
# Обновление кода
git add .
git commit -m "Update: описание изменений"
git push origin main

# Просмотр статуса
git status

# Просмотр истории
git log --oneline

# Создание новой ветки
git checkout -b feature/новая-функция

# Слияние веток
git checkout main
git merge feature/новая-функция
```

## Автоматический деплой

После настройки каждый `git push` в ветку `main` будет автоматически деплоить новую версию на DigitalOcean.

## Поддержка

Если возникнут проблемы:
1. Проверьте логи в DigitalOcean
2. Убедитесь, что все переменные окружения настроены
3. Проверьте, что токен бота корректный
4. Убедитесь, что webhook настроен правильно
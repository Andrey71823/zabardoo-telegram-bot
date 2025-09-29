# 🚀 Руководство по Развертыванию и Тестированию

## Архитектура Системы

Наша система состоит из нескольких микросервисов:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Telegram Bot  │    │  Admin Panel    │    │ Business Dashboard│
│   (Port 3000)   │    │  (Port 3010)    │    │   (Port 3020)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   API Gateway   │
                    │   (Port 8080)   │
                    └─────────────────┘
                                 │
                    ┌─────────────────┐
                    │   PostgreSQL    │
                    │   Redis Cache   │
                    └─────────────────┘
```

## 🛠️ Установка и Настройка

### 1. Установка зависимостей
```bash
npm install
```

### 2. Настройка переменных окружения
Создайте файл `.env`:
```env
# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_GROUP_ID=your_group_id
OPENAI_API_KEY=your_openai_key

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/bazaarGuru
REDIS_URL=redis://localhost:6379

# Ports
BOT_PORT=3000
ADMIN_PORT=3010
DASHBOARD_PORT=3020
GATEWAY_PORT=8080

# External APIs
AFFILIATE_API_KEY=your_affiliate_key
```

### 3. Запуск базы данных
```bash
# Запуск PostgreSQL и Redis через Docker
docker-compose up -d postgres redis

# Или установите локально:
# PostgreSQL: https://www.postgresql.org/download/
# Redis: https://redis.io/download
```

### 4. Миграции базы данных
```bash
# Выполните все миграции
node scripts/run-migrations.js
```

## 🚀 Запуск Сервисов

### Вариант 1: Запуск всех сервисов одновременно
```bash
# Запуск всей системы через Docker Compose
docker-compose up

# Или через npm scripts
npm run start:all
```

### Вариант 2: Запуск сервисов по отдельности

#### Telegram Bot
```bash
npm run start:bot
# или
node src/services/telegram/TelegramBotService.js
```

#### Административная панель
```bash
npm run start:admin
# или
node src/servers/adminServer.js
```

#### Бизнес-дашборд
```bash
npm run start:dashboard
# или  
node src/servers/dashboardServer.js
```

#### API Gateway
```bash
npm run start:gateway
# или
node src/gateway/index.js
```

## 🌐 Доступ к Интерфейсам

После запуска сервисов:

### 📱 Telegram Bot
- Найдите вашего бота в Telegram: `@your_bot_username`
- Команды: `/start`, `/help`, `/balance`, `/coupons`

### 🔧 Административная панель
- URL: http://localhost:3010
- Разделы:
  - **Купоны**: http://localhost:3010/admin/coupon-management.html
  - **Пользователи**: http://localhost:3010/admin/user-management.html  
  - **Уведомления**: http://localhost:3010/admin/notification-campaigns.html

### 📊 Бизнес-дашборд
- URL: http://localhost:3020
- Разделы:
  - **Основной дашборд**: http://localhost:3020/dashboard.html
  - **Бизнес-метрики**: http://localhost:3020/business-dashboard.html

### 🌐 API Gateway
- URL: http://localhost:8080
- Health check: http://localhost:8080/health
- API документация: http://localhost:8080/api-docs

## 🧪 Тестирование Системы

### 1. Проверка работоспособности
```bash
# Проверка всех сервисов
node scripts/verify-infrastructure.js

# Проверка конкретных компонентов
node scripts/test-coupon-management.js
node scripts/test-user-management.js
node scripts/test-notification-campaigns.js
node scripts/test-cashback-system.js
```

### 2. Unit тесты
```bash
# Запуск всех тестов
npm test

# Запуск конкретных тестов
npm test -- --testPathPattern=coupon-management
npm test -- --testPathPattern=user-management
npm test -- --testPathPattern=notification-campaigns
```

### 3. Интеграционные тесты
```bash
# Тестирование API endpoints
node scripts/test-api-integration.js

# Тестирование базы данных
node scripts/test-database-integration.js
```

## 📋 Основные Функции для Тестирования

### В Telegram Bot:
1. **Регистрация пользователя**: Отправьте `/start`
2. **Получение купонов**: Отправьте `/coupons`
3. **Проверка баланса**: Отправьте `/balance`
4. **AI-помощник**: Задайте вопрос боту
5. **Персональный канал**: Проверьте уведомления

### В Админ-панели:
1. **Управление купонами**: Создание, редактирование, модерация
2. **Управление пользователями**: Просмотр, блокировка, статистика
3. **Кампании**: Создание рассылок, A/B тесты
4. **Аналитика**: Просмотр метрик и отчетов

### В Бизнес-дашборде:
1. **Метрики**: Конверсии, доходность, ROI
2. **Аналитика**: Воронки, когорты, сегментация
3. **Прогнозы**: Тренды, сезонность, рост
4. **Отчеты**: Экспорт данных, инсайты

## 🔍 Мониторинг и Логи

### Просмотр логов
```bash
# Логи всех сервисов
docker-compose logs -f

# Логи конкретного сервиса
docker-compose logs -f telegram-bot
docker-compose logs -f admin-panel
docker-compose logs -f dashboard
```

### Health checks
```bash
# Проверка статуса всех сервисов
curl http://localhost:3000/health  # Telegram Bot
curl http://localhost:3010/health  # Admin Panel  
curl http://localhost:3020/health  # Dashboard
curl http://localhost:8080/health  # Gateway
```

## 🐛 Отладка

### Частые проблемы:

1. **Порты заняты**:
   ```bash
   # Проверьте какие порты используются
   netstat -tulpn | grep :3000
   netstat -tulpn | grep :3010
   ```

2. **База данных недоступна**:
   ```bash
   # Проверьте подключение к PostgreSQL
   psql -h localhost -U your_user -d bazaarGuru
   ```

3. **Redis недоступен**:
   ```bash
   # Проверьте Redis
   redis-cli ping
   ```

4. **Telegram Bot не отвечает**:
   - Проверьте токен бота
   - Убедитесь что webhook не настроен
   - Проверьте логи: `docker-compose logs telegram-bot`

## 📊 Метрики и Мониторинг

### Ключевые метрики для отслеживания:
- **Пользователи**: Регистрации, активность, удержание
- **Купоны**: Использование, конверсии, доходность  
- **Кампании**: Доставляемость, открытия, клики
- **Система**: CPU, память, время отклика
- **База данных**: Количество запросов, время выполнения

### Дашборды для мониторинга:
- **Операционные метрики**: http://localhost:3020/dashboard.html
- **Бизнес-метрики**: http://localhost:3020/business-dashboard.html
- **Административные**: http://localhost:3010

## 🚀 Развертывание в Production

### 1. Подготовка к продакшену
```bash
# Сборка для продакшена
npm run build

# Оптимизация Docker образов
docker-compose -f docker-compose.prod.yml build
```

### 2. Переменные окружения для продакшена
```env
NODE_ENV=production
DATABASE_URL=postgresql://prod_user:prod_pass@prod_host:5432/bazaarGuru_prod
REDIS_URL=redis://prod_redis:6379
TELEGRAM_BOT_TOKEN=prod_bot_token
```

### 3. Мониторинг в продакшене
- Настройте алерты для критических метрик
- Используйте логирование в централизованную систему
- Настройте автоматические бэкапы базы данных

## 📞 Поддержка

Если возникли проблемы:
1. Проверьте логи сервисов
2. Убедитесь что все зависимости установлены
3. Проверьте переменные окружения
4. Запустите тесты для диагностики
5. Проверьте health checks всех сервисов

---

**Важно**: Эта система предназначена для работы с реальными пользователями Telegram, поэтому убедитесь что у вас есть:
- Действующий Telegram Bot Token
- Настроенная группа/канал
- Доступ к внешним API (OpenAI, партнерские программы)
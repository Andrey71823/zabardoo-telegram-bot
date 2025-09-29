# 🔑 Настройка API ключей для BazaarGuru Bot

## 📋 Необходимые API ключи

### 1. **Telegram Bot Token** (Обязательно)
```bash
# Получить у @BotFather в Telegram
TELEGRAM_BOT_TOKEN=8381471660:AAEK_I4XHl3emmH1s5K_hwuzMeNQbjtqsB0
```

### 2. **Google Maps Platform API** (Для карт)
```bash
# https://console.cloud.google.com/apis/credentials
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Включить следующие API:
# - Maps JavaScript API
# - Places API
# - Geocoding API
# - Distance Matrix API
```

### 3. **Zomato API** (Для ресторанов)
```bash
# https://developers.zomato.com/api
ZOMATO_API_KEY=your_zomato_api_key_here
```

### 4. **Amazon Product Advertising API**
```bash
# https://affiliate-program.amazon.in/
AMAZON_ACCESS_KEY=your_amazon_access_key_here
AMAZON_SECRET_KEY=your_amazon_secret_key_here
AMAZON_ASSOCIATE_TAG=bazaarguru-21
```

### 5. **Flipkart Affiliate API**
```bash
# https://affiliate.flipkart.com/
FLIPKART_AFFILIATE_ID=your_flipkart_affiliate_id_here
FLIPKART_AFFILIATE_TOKEN=your_flipkart_affiliate_token_here
```

### 6. **Myntra API**
```bash
# https://developer.myntra.com/
MYNTRA_API_KEY=your_myntra_api_key_here
```

## 🚀 Как получить API ключи

### Telegram Bot Token
1. Откройте Telegram
2. Найдите @BotFather
3. Отправьте `/newbot`
4. Следуйте инструкциям
5. Сохраните токен

### Google Maps API
1. Перейдите на [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте новый проект или выберите существующий
3. Включите необходимые API
4. Создайте API ключ
5. Ограничьте использование ключа

### Zomato API
1. Зарегистрируйтесь на [Zomato Developers](https://developers.zomato.com/api)
2. Создайте приложение
3. Получите API ключ

### Amazon API
1. Зарегистрируйтесь в [Amazon Associates](https://affiliate-program.amazon.in/)
2. Получите Access Key и Secret Key
3. Создайте Associate Tag

## 📝 Создание файла .env

Создайте файл `.env` в корне проекта:

```bash
cp .env.example .env
# Или создайте новый файл с вашими ключами
```

Пример содержимого `.env`:

```env
# Telegram
TELEGRAM_BOT_TOKEN=8381471660:AAEK_I4XHl3emmH1s5K_hwuzMeNQbjtqsB0

# Google Maps
GOOGLE_MAPS_API_KEY=AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Zomato
ZOMATO_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Amazon
AMAZON_ACCESS_KEY=AKIAxxxxxxxxxxxxxx
AMAZON_SECRET_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AMAZON_ASSOCIATE_TAG=bazaarguru-21

# И так далее...
```

## 🔄 Запуск синхронизации данных

После настройки всех API ключей:

```bash
# Автоматическая синхронизация каждые 30 минут
node scripts/data-sync.js

# Одноразовая синхронизация
node scripts/data-sync.js once

# Синхронизация конкретной категории
node scripts/data-sync.js sync products electronics
node scripts/data-sync.js sync promocodes fashion

# Очистка кэша
node scripts/data-sync.js clear
```

## 📊 Мониторинг синхронизации

Система автоматически:
- ✅ Синхронизирует данные каждые 30 минут
- 🧹 Очищает устаревший кэш каждые 30 минут
- 📈 Логирует статистику каждый час
- 🚨 Обрабатывает ошибки API

## 🔧 Структура данных

```
data/
├── cache/              # Кэш API ответов
├── manual-promocodes.json  # Ручные промокоды
└── logs/               # Логи синхронизации

services/
├── api-orchestrator.js     # Главный оркестратор
├── products/              # Сервисы товаров
├── food/                  # Сервисы еды
├── maps/                  # Сервисы карт
├── promocodes/            # Сервисы промокодов
└── cache/                 # Управление кэшем

config/
└── api-config.js         # Конфигурация API
```

## ⚠️ Важные замечания

1. **Безопасность**: Никогда не коммитьте `.env` файл в Git
2. **Лимиты API**: Соблюдайте ограничения на запросы
3. **Кэширование**: Данные кэшируются для оптимизации
4. **Fallback**: При недоступности API используются резервные данные

## 🎯 Следующие шаги

1. Настройте все необходимые API ключи
2. Запустите синхронизацию: `node scripts/data-sync.js`
3. Проверьте логи на ошибки
4. Запустите бота: `node scripts/bazaarguru-wow-bot.js`


# Дизайн Развертывания Дашбордов

## Обзор

Развертывание дашбордов на DigitalOcean дроплет должно быть выполнено максимально безопасно, с сохранением всей функциональности и дизайна локальной версии. Используется подход "blue-green deployment" для минимизации рисков.

## Архитектура Развертывания

### Текущее Состояние Сервера
```
DigitalOcean Droplet
├── Telegram Bot (работает)
├── Существующие файлы
└── Порты: 3000 (бот), другие...
```

### Целевое Состояние
```
DigitalOcean Droplet
├── Telegram Bot (работает, не трогаем)
├── Dashboard Server (порт 8080)
├── Static Files (/public)
└── API Endpoints (/api, /monitoring)
```

## Компоненты Развертывания

### 1. Подготовка Окружения

**Файлы для развертывания:**
- `server.js` - основной веб-сервер
- `public/` - все статические файлы дашбордов
- `package.json` - зависимости (только для дашбордов)
- `.env` - переменные окружения

**Структура файлов:**
```
/opt/zabardoo-dashboard/
├── server.js
├── package.json
├── .env
├── public/
│   ├── dashboard.html
│   ├── dashboard-simple.html
│   ├── dashboard-fixed.html
│   ├── admin/
│   │   ├── user-management.html
│   │   ├── user-management-nexus.html
│   │   └── unified-dashboard.html
│   └── monitoring/
│       └── monitoring-dashboard.html
└── logs/
```

### 2. Безопасная Процедура Развертывания

**Этапы развертывания:**

1. **Backup Phase**
   - Создание снапшота дроплета
   - Резервное копирование текущих файлов
   - Сохранение конфигурации

2. **Preparation Phase**
   - Создание отдельной директории для дашбордов
   - Установка зависимостей
   - Проверка портов

3. **Deployment Phase**
   - Загрузка файлов
   - Настройка окружения
   - Запуск сервера

4. **Verification Phase**
   - Проверка доступности
   - Тестирование функций
   - Мониторинг логов

### 3. Конфигурация Сервера

**server.js конфигурация:**
```javascript
const port = process.env.PORT || 8080;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'", "'unsafe-inline'", 'https:'],
      "style-src": ["'self'", "'unsafe-inline'", 'https:'],
      "img-src": ["'self'", 'data:', 'https:']
    }
  }
}));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.get('/api/dashboard/metrics', handleMetrics);
app.get('/monitoring/status', handleMonitoring);
```

**Переменные окружения:**
```env
NODE_ENV=production
PORT=8080
ADMIN_TOKEN=your_secure_token
CORS_ALLOWED_ORIGINS=https://your-domain.com
```

### 4. Процесс Менеджмент

**PM2 конфигурация:**
```json
{
  "name": "zabardoo-dashboard",
  "script": "server.js",
  "cwd": "/opt/zabardoo-dashboard",
  "env": {
    "NODE_ENV": "production",
    "PORT": "8080"
  },
  "error_file": "./logs/err.log",
  "out_file": "./logs/out.log",
  "log_file": "./logs/combined.log"
}
```

## Интерфейсы и API

### Dashboard Endpoints
```typescript
interface DashboardAPI {
  // Основные метрики
  'GET /api/dashboard/metrics': BusinessMetrics
  'GET /api/dashboard/insights': DashboardInsights
  'GET /api/dashboard/realtime': RealtimeData
  'GET /api/dashboard/export': ExportData
  
  // Мониторинг
  'GET /monitoring/status': SystemStatus
  'GET /monitoring/alerts': AlertData
  
  // Статические файлы
  'GET /': MainDashboard
  'GET /admin': AdminPanel
  'GET /dashboard.html': BusinessDashboard
}
```

### Модели Данных
```typescript
interface BusinessMetrics {
  overview: {
    totalUsers: number
    activeUsers: number
    totalRevenue: number
    conversionRate: number
  }
  revenue: {
    monthlyRevenueTrend: MonthlyData[]
    revenueByChannel: ChannelData[]
  }
}

interface SystemStatus {
  system: {
    uptime: number
    cpu: CPUMetrics
    memory: MemoryMetrics
  }
  application: {
    requestsPerSecond: number
    averageResponseTime: number
  }
}
```

## Безопасность

### Security Measures
1. **Helmet.js** - защита заголовков
2. **CORS** - контроль доступа
3. **Rate Limiting** - защита от DDoS
4. **Admin Authentication** - защита админ панели
5. **HTTPS** - шифрование трафика

### Мониторинг
1. **Health Checks** - проверка состояния
2. **Error Logging** - логирование ошибок
3. **Performance Metrics** - метрики производительности
4. **Uptime Monitoring** - мониторинг доступности

## Rollback Strategy

### Процедура Отката
1. Остановка нового сервера
2. Восстановление из backup
3. Перезапуск старой версии
4. Проверка функциональности

### Критерии для Отката
- Ошибки загрузки дашбордов
- Проблемы с API
- Нарушение работы бота
- Критические ошибки безопасности

## Тестирование

### Smoke Tests
```bash
# Проверка доступности
curl -f http://localhost:8080/health

# Проверка дашборда
curl -f http://localhost:8080/

# Проверка API
curl -f http://localhost:8080/api/dashboard/metrics

# Проверка админ панели
curl -f http://localhost:8080/admin
```

### Функциональные Тесты
1. Загрузка всех дашбордов
2. Работа интерактивных элементов
3. API responses
4. Аутентификация
5. Мониторинг метрик
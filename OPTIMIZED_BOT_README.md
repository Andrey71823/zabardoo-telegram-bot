# 🚀 BazaarGuru Optimized Bot

## Масштабируемая версия для тысяч пользователей

### ⚡ Возможности оптимизации:

- ✅ **Webhook вместо Polling** - для высокой производительности
- ✅ **Redis кэширование** - распределенное хранение данных
- ✅ **Rate Limiting** - защита от перегрузок
- ✅ **Message Queue** - асинхронная обработка сообщений
- ✅ **Кластеризация** - использование всех ядер CPU
- ✅ **Мониторинг** - отслеживание производительности
- ✅ **Graceful Shutdown** - корректное завершение работы

---

## 📦 Быстрая установка

### 1. Настройка production окружения
```bash
npm run setup:production
```

### 2. Настройка переменных окружения
```bash
cp .env.production .env
# Отредактируйте .env файл с вашими API ключами
```

### 3. Запуск оптимизированного бота
```bash
npm run start:optimized
```

---

## 🎯 Команды управления

### Запуск и остановка
```bash
# Запуск в кластерном режиме
npm run start:cluster

# Остановка
npm run stop:cluster

# Перезапуск
npm run restart:cluster
```

### Мониторинг
```bash
# Веб-интерфейс PM2
npm run monitor

# Просмотр логов
npm run logs

# Масштабирование (добавление/удаление инстансов)
npm run scale +2  # Добавить 2 инстанса
npm run scale -1  # Удалить 1 инстанс
```

### Мониторинг бота
```bash
# Запуск мониторинга производительности
node scripts/monitor-optimized-bot.js

# Одноразовая проверка здоровья
node scripts/monitor-optimized-bot.js --once

# Экспорт метрик
node scripts/monitor-optimized-bot.js --export
```

---

## 📊 Мониторинг и метрики

### Health Check endpoints:
```
http://localhost:3000/health  - Статус здоровья
http://localhost:3000/stats   - Статистика бота
```

### PM2 команды:
```bash
pm2 list                    # Список всех процессов
pm2 monit                   # Веб-интерфейс мониторинга
pm2 logs bazaarguru-optimized  # Просмотр логов
pm2 restart bazaarguru-optimized  # Перезапуск
pm2 stop bazaarguru-optimized     # Остановка
pm2 delete bazaarguru-optimized   # Удаление
```

---

## 🏗️ Архитектура

```
┌─────────────────┐    ┌─────────────────┐
│   NGINX Load    │────│   Node.js App   │
│    Balancer     │    │   (Express)     │
└─────────────────┘    └─────────────────┘
                              │
                    ┌─────────┼─────────┐
                    │         │         │
            ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
            │ Redis Cache │ │ Message     │ │ PostgreSQL  │
            │             │ │ Queue (Bull)│ │ Database    │
            └─────────────┘ └─────────────┘ └─────────────┘
```

### Компоненты:
- **Express Server** - Webhook обработка
- **Redis** - Кэширование и сессии
- **Bull Queue** - Очереди сообщений
- **PM2** - Процесс менеджер
- **Nginx** - Load balancer

---

## ⚙️ Конфигурация

### Переменные окружения (.env):
```env
# Основные
TELEGRAM_BOT_TOKEN=your_token
PORT=3000
NODE_ENV=production

# Redis
REDIS_URL=redis://127.0.0.1:6379

# Webhook
WEBHOOK_URL=https://yourdomain.com/webhook

# API ключи (добавьте свои)
GOOGLE_MAPS_API_KEY=your_key
AMAZON_ACCESS_KEY=your_key
# ... остальные ключи
```

### PM2 конфигурация (ecosystem.config.js):
```javascript
{
  name: 'bazaarguru-optimized',
  script: './scripts/bazaarguru-optimized-bot.js',
  instances: 'max',      // Все CPU ядра
  exec_mode: 'cluster',  // Кластерный режим
  max_memory_restart: '500M', // Перезапуск при 500MB
  restart_delay: 1000    // Задержка перезапуска
}
```

---

## 🚨 Мониторинг алертов

### Уровни алертов:
- 🔴 **CRITICAL**: Требует немедленного внимания
  - Бот недоступен
  - >85% использования памяти
  - >100 ошибок

- 🟡 **WARNING**: Требует внимания
  - >70% использования памяти
  - >50 ошибок
  - Высокая нагрузка CPU

- ℹ️ **INFO**: Информационные сообщения
  - Бот запущен/остановлен
  - Изменения конфигурации

---

## 📈 Масштабирование

### Горизонтальное масштабирование:
```bash
# Добавить инстансы
pm2 scale bazaarguru-optimized +2

# Удалить инстансы
pm2 scale bazaarguru-optimized -1
```

### Вертикальное масштабирование:
```bash
# Увеличить лимиты
pm2 reload ecosystem.config.js --max-memory-restart 1G
```

---

## 🔧 Устранение неисправностей

### Проблема: Высокое использование памяти
```bash
# Проверить
pm2 monit

# Решение: увеличить лимит или оптимизировать код
pm2 reload ecosystem.config.js --max-memory-restart 1G
```

### Проблема: Долгое время отклика
```bash
# Проверить логи
npm run logs

# Решение: добавить Redis кэширование
# или увеличить количество инстансов
pm2 scale bazaarguru-optimized +1
```

### Проблема: Rate limiting Telegram
```bash
# Проверить статистику
curl http://localhost:3000/stats

# Решение: добавить задержки между запросами
# или использовать webhook вместо polling
```

---

## 📋 Чек-лист запуска

### Перед запуском:
- [ ] Настроено production окружение (`npm run setup:production`)
- [ ] Созданы все необходимые директории (logs, data, etc.)
- [ ] Настроены переменные окружения (.env)
- [ ] Установлены все зависимости
- [ ] Настроен Redis (если используется)
- [ ] Настроен webhook URL

### После запуска:
- [ ] Проверить здоровье: `http://localhost:3000/health`
- [ ] Запустить мониторинг: `npm run monitor`
- [ ] Проверить логи: `npm run logs`
- [ ] Настроить алерты и уведомления

---

## 🎉 Готов к запуску!

### Быстрый старт:
```bash
# 1. Настройка
npm run setup:production

# 2. Запуск
npm run start:optimized

# 3. Мониторинг
npm run monitor
```

### Продвинутый запуск:
```bash
# 1. Настройка
node scripts/setup-production.js

# 2. Запуск кластера
npm run start:cluster

# 3. Масштабирование
npm run scale +2

# 4. Мониторинг
node scripts/monitor-optimized-bot.js
```

---

## 📞 Поддержка

### Ресурсы:
- 📖 Документация: `SCALING_GUIDE.md`
- 🔧 Мониторинг: `scripts/monitor-optimized-bot.js`
- ⚙️ Конфигурация: `ecosystem.config.js`
- 📊 Метрики: `http://localhost:3000/health`

### Полезные команды:
```bash
# Просмотр всех процессов
pm2 list

# Детальный мониторинг
pm2 monit

# Просмотр логов в реальном времени
pm2 logs bazaarguru-optimized --lines 100

# Перезапуск с новой конфигурацией
pm2 reload ecosystem.config.js
```

**🚀 Ваш бот готов выдержать тысячи пользователей!**



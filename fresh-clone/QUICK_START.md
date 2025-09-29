# 🚀 Быстрый Запуск bazaarGuru Bot System

## 1. Запуск всей системы одной командой

```bash
npm start
```

## 2. Что вы увидите после запуска

После выполнения команды откроются **4 сервиса**:

### 🤖 Telegram Bot Service (Порт 3000)
- **URL**: http://localhost:3000/health
- **Что делает**: Эмулирует Telegram бота
- **Демо данные**: 3 пользователя, сообщения

### 🔧 Admin Panel (Порт 3010) 
- **URL**: http://localhost:3010
- **Главные страницы**:
  - **Купоны**: http://localhost:3010/admin/coupon-management.html
  - **Пользователи**: http://localhost:3010/admin/user-management.html  
  - **Кампании**: http://localhost:3010/admin/notification-campaigns.html

### 📊 Business Dashboard (Порт 3020)
- **URL**: http://localhost:3020
- **Главные страницы**:
  - **Дашборд**: http://localhost:3020/dashboard.html
  - **Бизнес-метрики**: http://localhost:3020/business-dashboard.html

### 🌐 API Gateway (Порт 8080)
- **URL**: http://localhost:8080
- **API документация**: http://localhost:8080/api-docs
- **Список сервисов**: http://localhost:8080/services

## 3. Как проверить что все работает

### Вариант 1: Автоматическая проверка
```bash
npm run health
```

### Вариант 2: Ручная проверка
Откройте в браузере:
1. http://localhost:3000/health ✅
2. http://localhost:3010/health ✅  
3. http://localhost:3020/health ✅
4. http://localhost:8080/health ✅

## 4. Основные интерфейсы для демонстрации

### 🎯 Admin Panel - Управление Купонами
**URL**: http://localhost:3010/admin/coupon-management.html

**Что можно делать**:
- ✅ Создавать новые купоны
- ✅ Редактировать существующие
- ✅ Модерировать купоны из группы
- ✅ Массовые операции
- ✅ Импорт/экспорт CSV
- ✅ Статистика и аналитика

### 👥 Admin Panel - Управление Пользователями  
**URL**: http://localhost:3010/admin/user-management.html

**Что можно делать**:
- ✅ Просматривать всех пользователей
- ✅ Управлять персональными каналами
- ✅ Модерировать группы
- ✅ Бан-листы и ограничения
- ✅ Аналитика пользователей

### 📢 Admin Panel - Кампании и Уведомления
**URL**: http://localhost:3010/admin/notification-campaigns.html

**Что можно делать**:
- ✅ Создавать кампании уведомлений
- ✅ Массовые рассылки
- ✅ A/B тестирование сообщений
- ✅ Планировщик автоматических кампаний
- ✅ Шаблоны уведомлений
- ✅ Аналитика кампаний

### 📈 Business Dashboard - Аналитика
**URL**: http://localhost:3020/dashboard.html

**Что можно увидеть**:
- ✅ Ключевые метрики бизнеса
- ✅ Графики роста пользователей
- ✅ Анализ доходности
- ✅ Конверсии и ROI
- ✅ Интерактивные дашборды

## 5. Тестирование функций

### Тест Telegram Bot API
```bash
# Проверить статус бота
curl http://localhost:3000/api/bot/status

# Получить список пользователей
curl http://localhost:3000/api/bot/users

# Получить сообщения
curl http://localhost:3000/api/bot/messages
```

### Тест Admin Panel API
```bash
# Статистика купонов
curl http://localhost:3010/api/admin/coupons/stats

# Список пользователей
curl http://localhost:3010/api/admin/users

# Статистика кампаний
curl http://localhost:3010/api/admin/notification-campaigns/campaigns/stats
```

### Тест Business Dashboard API
```bash
# Статистика дашборда
curl http://localhost:3020/api/dashboard/stats

# Аналитические данные
curl http://localhost:3020/api/dashboard/analytics
```

## 6. Демо-сценарии для показа

### Сценарий 1: Управление Купонами
1. Откройте http://localhost:3010/admin/coupon-management.html
2. Нажмите "Создать Купон"
3. Заполните форму (магазин, скидка, описание)
4. Сохраните и посмотрите в списке
5. Попробуйте фильтры и поиск

### Сценарий 2: Создание Кампании
1. Откройте http://localhost:3010/admin/notification-campaigns.html
2. Нажмите "Создать Кампанию"
3. Настройте целевую аудиторию
4. Создайте сообщение
5. Запустите кампанию

### Сценарий 3: Просмотр Аналитики
1. Откройте http://localhost:3020/dashboard.html
2. Изучите ключевые метрики
3. Посмотрите графики роста
4. Перейдите на http://localhost:3020/business-dashboard.html
5. Изучите бизнес-метрики

## 7. Остановка системы

Нажмите **Ctrl+C** в терминале где запущен `npm start`

## 8. Если что-то не работает

### Проверьте порты
```bash
# Windows
netstat -an | findstr :3000
netstat -an | findstr :3010
netstat -an | findstr :3020
netstat -an | findstr :8080
```

### Перезапустите отдельный сервис
```bash
npm run start:bot      # Только бот
npm run start:admin    # Только админка
npm run start:dashboard # Только дашборд
npm run start:gateway  # Только gateway
```

### Проверьте логи
Все ошибки будут показаны в консоли где запущен `npm start`

---

## 🎉 Готово!

Теперь у вас работает полная система bazaarGuru Telegram Bot с:
- ✅ Telegram Bot Service (демо-режим)
- ✅ Admin Panel (3 раздела управления)
- ✅ Business Dashboard (аналитика)
- ✅ API Gateway (центральная точка)

**Все интерфейсы работают без базы данных в демо-режиме!**
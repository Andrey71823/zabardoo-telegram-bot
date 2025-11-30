# BazaarGuru Bot

BazaarGuru Bot — демонстрационный Telegram-агрегатор официальных скидок и промокодов из Flipkart, Amazon, Myntra, Ajio, Croma и Nykaa.

## Быстрый запуск
1. Установите зависимости:
   ```bash
   npm install
   ```
2. Создайте файл `.env` и добавьте токен бота:
   ```env
   TELEGRAM_BOT_TOKEN=ваш_токен
   ```
3. Запустите бота (из корня репозитория):
   ```bash
   node clean-project/scripts/bazaarguru-wow-bot.js
   ```

## Основные возможности
- Мультиязычное меню и тексты (RU / EN / Hinglish).
- Умный поиск по товарам с подсказками и карточками (магазин, цена, промокод, дата проверки).
- Персональные настройки: любимые категории, лимиты бюджета, уведомления о скидках.
- Магазины и категории с удобной навигацией (3×3) и кнопкой возврата в главное меню.
- Автоматические уведомления о price drop / купонах на основе демо-данных.

## Демо-данные
Файл `clean-project/data/sample-products.json` содержит 25 товаров и промокодов для демонстрации. Чтобы подключить реальные источники, замените загрузку в `loadProducts()` (см. `scripts/bot/catalog.js`).

## Документация
- `презентация клиенту/SAFE_PROJECT_OVERVIEW.md` — обзор продукта и сценарий демо.
- `презентация клиенту/SAFE_BUSINESS_OVERVIEW.md` — бизнес-модель и юнит-экономика.
- `презентация клиенту/UNIQUE_FEATURES_ANALYSIS.md` — конкурентные преимущества и roadmap.
- `API_SETUP_GUIDE.md`, `PROMOCODES_GUIDE.md` — инструкции по подключению реальных данных.

## Фоновые уведомления
Активируйте авторассылку скидок через переменные окружения:
```env
NOTIFICATION_INTERVAL_MINUTES=30
NOTIFICATION_MIN_GAP_MINUTES=180
NOTIFICATION_MAX_PER_TICK=1
```
- `NOTIFICATION_INTERVAL_MINUTES` — как часто выполнять проверку (в минутах).
- `NOTIFICATION_MIN_GAP_MINUTES` — минимальный перерыв между уведомлениями одного типа для пользователя.
- `NOTIFICATION_MAX_PER_TICK` — максимум сообщений за один цикл.

## Поддержка
Вопросы по настройке: partner@bazaar.guru или Telegram @bazaarGuru_team.

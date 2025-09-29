# BazaarGuru Bot — презентация для покупателя

## 1. Что это?
Telegram-бот, который за секунды показывает официальные скидки и купоны из Flipkart, Amazon, Myntra, Ajio, Croma и Nykaa. Пользователь открывает чат, делает запрос — и сразу видит карточки с ценой, промокодом и ссылкой на магазин.

## 2. Почему это привлекает покупателей
1. **Честная модель** — на каждом шаге напоминаем «мы агрегатор выгод, не склад».
2. **Карточки, как у маркетплейсов** — магазин, цена, старая цена, промокод, условия, дата проверки.
3. **Мультиязычие** — RU / EN / Hinglish, все фразы лежат в словаре, легко добавить новые.
4. **Персонализация и пуши** — любимые категории, бюджеты, автоуведомления о скидках и купонах.
5. **Готовность к интеграции** — `loadProducts()` ждёт реальные API, всё остальное уже работает.

## 3. Шаг за шагом: получаем ключи магазинов
- **Flipkart**
  1. Зайдите на [affiliate.flipkart.com](https://affiliate.flipkart.com/), создайте аккаунт.
  2. После входа откройте меню `Tools → Affiliate API`. Нажмите `Generate Token`.
  3. Скопируйте `Affiliate ID` и `Token`, добавьте в `.env`:
     ```env
     FLIPKART_AFFILIATE_ID=...
     FLIPKART_AFFILIATE_TOKEN=...
     ```
  4. Добавьте адаптер `fetchFlipkartProducts()` и подключите его в `loadProducts()`.

- **Amazon (PA-API)**
  1. Зарегистрируйтесь в [Amazon Associates](https://affiliate-program.amazon.in/).
  2. В консоли Associates откройте `Tools → Product Advertising API → Manage Your Credentials`.
  3. Создайте `Access key` / `Secret key`, впишите в `.env`:
     ```env
     AMAZON_ACCESS_KEY=...
     AMAZON_SECRET_KEY=...
     AMAZON_PARTNER_TAG=ваш-AssociateTag
     ```
  4. Используйте endpoint `paapi5/getitems`, возвращайте товары в формате `sample-products.json`.

- **Myntra**
  1. Форма подключения: [partner.myntra.com](https://partner.myntra.com/).
  2. После подтверждения в кабинете откройте `API Details` и скачайте JSON-фид или ключ.
  3. Создайте файл `scripts/services/products/myntra.js`, который превращает фид в массив товаров.

- **Ajio**
  1. Заявка: [partnerships.ajio.com](https://partnerships.ajio.com/).
  2. В письме-подтверждении будет ссылка на `Affiliate Console`. Там в разделе `API Keys` нажмите `Generate`.
  3. Сохраните `clientId` и `clientSecret` в `.env`, добавьте адаптер в `loadProducts()`.

- **Croma**
  1. Оставьте заявку на [croma.com/affiliate-program](https://www.croma.com/affiliate-program).
  2. После входа откройте `Dashboard → API Access`. Сгенерируйте токен.
  3. Используйте эндпоинт `/catalog/v1/products`. Добавьте товары в `loadProducts()`.

- **Nykaa**
  1. Напишите на affiliate@nykaa.com или заполните форму [nykaa.com/affiliate-program](https://www.nykaa.com/affiliate-program).
  2. После подтверждения зайдите в кабинет → `API` → `Generate Key`.
  3. Добавьте ключи в `.env`, создайте адаптер `nykaa.js`.

## 4. Подключаем голос и поиск по фото
- **Речь (пример: Google Speech-to-Text)**
  1. В консоли Google Cloud создайте проект, включите `Speech-to-Text`.
  2. Создайте сервисный аккаунт, скачайте `key.json`, пропишите в `.env`:
     ```env
     GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
     SPEECH_LANGUAGE_CODE=ru-RU
     ```
  3. В `handleMessage` обработайте `msg.voice`: скачайте файл, вызовите API, результат передайте в `processSearch`.

- **Фото (пример: Google Vision)**
  1. Включите `Vision API`, используйте тот же `key.json`.
  2. В `handleMessage` обработайте `msg.photo`: скачайте изображение, вызовите `labelDetection` или `productSearch`.
  3. На основе найденных меток сформируйте текстовый запрос.

Альтернативы: AWS Rekognition + Transcribe, Azure Cognitive Services, Яндекс SpeechKit + Vision. Шаги аналогичные: получить ключ, вызвать API, передать результат в поиск.

## 5. А что с промокодами и уведомлениями?
- Промокоды: храните в `data/manual-promocodes.json` или подтягивайте из партнёрского API и выбирайте по `storeSlug`.
- Автоуведомления: бот уже умеет отправлять сообщения. Настройте частоту через `.env`:
  ```env
  NOTIFICATION_INTERVAL_MINUTES=30
  NOTIFICATION_MIN_GAP_MINUTES=180
  NOTIFICATION_MAX_PER_TICK=1
  ```

## 6. Roadmap запуска после покупки
| День | Шаг | Результат |
| --- | --- | --- |
| 1 | Получить ключи Flipkart, Amazon, отправить заявки Myntra/Ajio/Croma/Nykaa | Реальные товары в выдаче |
| 2 | Настроить `loadProducts()` и промокоды | Карточки показывают живые цены |
| 3 | Подключить голос/фото (по желанию), автоуведомления | Уведомления с реальными ссылками |
| 4 | Добавить UTM, запустить Telegram Ads | Привести первых пользователей |
| 5+ | Настроить брендовые push’и, анализ в Looker Sheets | Рост выручки |

## 7. Что отдаём вместе с проектом
- Исходный код (`clean-project/scripts/bazaarguru-wow-bot.js`, `scripts/bot/*`).
- Демо-датасет `data/sample-products.json`.
- Презентации и гайды (`SAFE_*`, `CLIENT_SETUP_GUIDE`, `CLIENT_SETUP_CHECKLIST`, `API_SETUP_GUIDE`).
- Честный FAQ и контакты для связи.

## 8. Контакты
- Email: partner@bazaar.guru
- Telegram: @bazaarGuru_team

Выполните шаги — и бот начнёт приносить комиссию. Нужна помощь с интеграцией? Напишите, проведу за руку.

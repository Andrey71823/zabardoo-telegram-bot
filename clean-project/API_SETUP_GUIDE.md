# API Setup Guide — подключаем реальные данные к BazaarGuru Bot

Этот документ — для владельца, который хочет перевести бот из демо-режима в боевой. Здесь собраны пошаговые инструкции: где получить ключи магазинов, какие кнопки нажать и как включить голос/фото-поиск.

## 1. Что понадобится перед стартом
- Аккаунт владельца бота (Telegram токен уже в `.env`).
- Партнёрские аккаунты магазинов (Flipkart, Amazon, Myntra, Ajio, Croma, Nykaa).
- Облачный аккаунт для распознавания речи/изображений (Google Cloud, Azure, AWS или Яндекс).

## 2. Интеграция магазинов

### 2.1 Flipkart Affiliate API
1. Перейдите на [affiliate.flipkart.com](https://affiliate.flipkart.com/), нажмите `Join Now`, заполните форму.
2. После входа откройте меню **Tools → Affiliate API**.
3. Нажмите кнопку `Generate Token`. Скопируйте `Affiliate ID` и `Token`.
4. Добавьте их в `.env`:
   ```env
   FLIPKART_AFFILIATE_ID=ваш_ID
   FLIPKART_AFFILIATE_TOKEN=ваш_token
   ```
5. Создайте файл `scripts/services/products/flipkart.js`, который вызывает эндпоинт `/api/3.0/product/` и возвращает товары в формате `sample-products.json`.
6. Подключите этот адаптер в `loadProducts()` (файл `scripts/bot/catalog.js`).

### 2.2 Amazon Product Advertising API (PA-API)
1. Зарегистрируйтесь в [Amazon Associates](https://affiliate-program.amazon.in/).
2. После активации откройте `Tools → Product Advertising API` и нажмите `Add credentials`.
3. Скопируйте `Access key`, `Secret key`, Associate Tag.
4. Добавьте их в `.env`:
   ```env
   AMAZON_ACCESS_KEY=...
   AMAZON_SECRET_KEY=...
   AMAZON_PARTNER_TAG=...
   ```
5. Используйте SDK или запрос `https://webservices.amazon.in/paapi5/getitems`. Параметры: `PartnerTag`, `PartnerType=Associates`, `ItemIds`.
6. Сконвертируйте ответ в объект товара и объедините с массивом других магазинов.

### 2.3 Myntra
1. Подайте заявку на [partner.myntra.com](https://partner.myntra.com/).
2. После подтверждения войдите в кабинет → раздел `API Details` → кнопка `Download Feed` или `Generate Key`.
3. Если это CSV/JSON — создайте адаптер `scripts/services/products/myntra.js`, который парсит файл и возвращает массив.
4. Добавьте адаптер в `loadProducts()`.

### 2.4 Ajio
1. Заполните форму на [partnerships.ajio.com](https://partnerships.ajio.com/) → дождитесь письма.
2. В письме будет ссылка на `Affiliate Console`. После входа откройте `API Keys` и нажмите `Generate`.
3. Добавьте `clientId` и `clientSecret` в `.env` и реализуйте запрос `/api/v1/catalogue` (пример в документации Ajio).
4. Подключите адаптер в `loadProducts()`.

### 2.5 Croma
1. Оставьте заявку на [croma.com/affiliate-program](https://www.croma.com/affiliate-program).
2. После модерации в панели откройте `Dashboard → API Access → Generate Token`.
3. Используйте REST-эндпоинт `/catalog/v1/products`. Не забудьте передавать токен в заголовке `Authorization`.
4. Сохраните товары в нужном формате и добавьте в общую выдачу.

### 2.6 Nykaa
1. Напишите на affiliate@nykaa.com или заполните форму [nykaa.com/affiliate-program](https://www.nykaa.com/affiliate-program).
2. После подтверждения в кабинете откройте `Settings → API` и нажмите `Generate Key`.
3. Добавьте ключи в `.env`, создайте адаптер `nykaa.js`, который возвращает `store='Nykaa'`, `storeSlug='nykaa'`.

### 2.7 Промокоды
- Если магазин даёт отдельные купоны, добавьте их в `data/manual-promocodes.json`.
- В коде создайте функцию `pickPromocode(storeSlug, category)` и используйте её в карточках.

## 3. Голосовой поиск
### Вариант: Google Speech-to-Text
1. В [Google Cloud Console](https://console.cloud.google.com/) создайте проект, включите API `Speech-to-Text`.
2. Создайте сервисный аккаунт → `Create key` → JSON.
3. Установите SDK: `npm install @google-cloud/speech`.
4. В `.env` добавьте:
   ```env
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
   SPEECH_LANGUAGE_CODE=ru-RU # или другой
   ```
5. В `handleMessage` обработайте `msg.voice`: скачайте файл через `getFile`, сохраните во временную папку, вызовите `speechClient.recognize`, распознанный текст передайте в `processSearch`.
6. Добавьте обработку ошибок (если сервис недоступен — отвечаем fallback).

### Альтернативы
- **Azure Speech** — портал Azure → `Create Speech resource` → ключи в `.env` (`AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`).
- **AWS Transcribe** — IAM пользователь + разрешение Transcribe, используем SDK AWS.
- **Яндекс SpeechKit** — создаём API-ключ, отправляем аудио на `stt.yandex.net`.

## 4. Кешбэк интеграция
1. Включите отчёты заказов и комиссий в каждом партнёрском кабинете (Flipkart Affiliate → Reports, Amazon Associates → Earnings Reports, Ajio/Croma/Nykaa — через вашего менеджера).
2. При формировании ссылок передавайте Telegram user ID (или hash пользователя) в поле subID/custom tag.
3. Соберите таблицу `cashback_transactions` с полями: `userId`, `store`, `orderId`, `status`, `orderAmount`, `cashbackAmount`, `payoutDate`.
4. Создайте сервис, который раз в день подтягивает отчёты, обновляет таблицу и отдаёт данные через метод `RealDataService` (можно расширить `src/services/data/RealDataService.ts`).
5. Добавьте пользовательские уведомления о новых начислениях (см. автоуведомления в `.env`).

## 5. Поиск по фото
### Пример: Google Vision
1. Включите `Vision API` в том же проекте Google Cloud.
2. Установите `npm install @google-cloud/vision`.
3. В `handleMessage` обработайте `msg.photo`: скачайте изображение (лучше максимальный размер), вызовите `visionClient.labelDetection` или `productSearch`.
4. Преобразуйте метки (`labels`) в ключевые слова (бренд, категория) и передайте строку в `processSearch`.
5. Если точный товар не найден, используйте fallback «пока покажу похожие варианты».

### Альтернативы
- **AWS Rekognition** — `DetectLabels` или `SearchProducts`.
- **Azure Computer Vision** — `Analyze Image` с опцией `Tags`.
- **Clarifai** — модель `general-image-recognition`.

## 6. Автоуведомления на живых данных
1. Убедитесь, что `loadProducts()` возвращает актуальные товары (есть `lastChecked` ≤24 часа).
2. Настройте интервалы в `.env`:
   ```env
   NOTIFICATION_INTERVAL_MINUTES=30
   NOTIFICATION_MIN_GAP_MINUTES=180
   NOTIFICATION_MAX_PER_TICK=1
   ```
3. При деплое используйте PM2/systemd или вынесите `runNotificationTick` в отдельный воркер.
4. После включения проверяйте, что уведомления содержат ссылку и промокод.

## 7. Тест-план после интеграции
- `/start` на всех языках
- Смена языка → проверяем, что кнопки и тексты переводятся
- `🔍` поиск примеров: «OnePlus до 50000», «курти Biba до 1500», «Sony TV discount»
- Карточки: проверяем цену, промокод, дату, ссылку
- Персональные настройки: выбираем категории, бюджет, включаем уведомления, получаем push
- /help → FAQ и контакты

## 8. Контакты для помощи
- partner@bazaar.guru
- Telegram @bazaarGuru_team

Готово! Следуйте шагам, и ваш BazaarGuru Bot будет работать на реальных скидках.

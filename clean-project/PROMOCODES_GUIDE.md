# 🎁 Руководство по работе с промокодами

## 📋 Способы получения промокодов

### 1. **РУЧНЫЕ ПРОМОКОДЫ** (Самый простой способ)
```json
{
  "code": "FLIP500",
  "title": "Flipkart ₹500 OFF",
  "description": "Дополнительная скидка ₹500 на электронику",
  "discountType": "fixed",
  "discountValue": 500,
  "minimumOrder": 2000,
  "category": "electronics",
  "store": "flipkart.com"
}
```

**Где взять:**
- Создайте в личном кабинете партнера (Amazon Associates, Flipkart Affiliate)
- Используйте существующие промокоды магазинов
- Создайте свои уникальные промокоды

### 2. **ПАРТНЕРСКИЕ ПРОГРАММЫ**

#### **Amazon Associates**
```bash
# В личном кабинете Amazon:
1. Зайдите в Associates Central
2. Создайте Links & Banners
3. Сгенерируйте промокоды
4. Используйте в товарах
```

#### **Flipkart Affiliate**
```bash
# В Flipkart Affiliate:
1. Войдите в аккаунт
2. Создайте Deep Links
3. Получите промокоды
4. Добавьте в систему
```

#### **Myntra Affiliate**
```bash
# В Myntra Partner Program:
1. Зарегистрируйтесь как партнер
2. Создайте промокоды
3. Интегрируйте с товарами
```

### 3. **АВТОМАТИЧЕСКАЯ ГЕНЕРАЦИЯ**

Система может автоматически генерировать промокоды:

```javascript
// Пример автоматической генерации
const generatePromocode = (product, discount) => {
  return {
    code: `BG${product.id}${discount}`,
    title: `${product.name} - ${discount}% OFF`,
    discountValue: discount,
    category: product.category,
    store: product.source
  };
};
```

## 🔄 Как привязываются промокоды к товарам

### **Вариант 1: Ручная привязка**
```json
// В товаре указываем промокод
{
  "id": "iphone15",
  "name": "iPhone 15 Pro",
  "price": 134900,
  "promocode": "APPLE500"
}
```

### **Вариант 2: Автоматическая привязка по категории**
```javascript
// Система автоматически подбирает промокод
if (product.category === 'electronics' && product.source === 'flipkart') {
  product.promocode = 'FLIP200'; // Из базы промокодов
}
```

### **Вариант 3: Генерация на лету**
```javascript
// При показе товара генерируем уникальный промокод
const userPromocode = generateUniqueCode(userId, productId);
// Привязываем к пользователю на 24 часа
```

## 📱 Примеры для разных категорий

### **Электроника (Amazon + Flipkart)**
```json
[
  {
    "code": "AMZ150",
    "store": "amazon.in",
    "category": "electronics",
    "discountValue": 150,
    "minimumOrder": 2000
  },
  {
    "code": "FLIP200",
    "store": "flipkart.com",
    "category": "electronics",
    "discountValue": 200,
    "minimumOrder": 1000
  }
]
```

### **Одежда (Myntra + Ajio)**
```json
[
  {
    "code": "MYNTRA20",
    "store": "myntra.com",
    "category": "fashion",
    "discountValue": 20,
    "discountType": "percentage"
  },
  {
    "code": "AJIO300",
    "store": "ajio.com",
    "category": "fashion",
    "discountValue": 300,
    "minimumOrder": 1500
  }
]
```

### **Еда (Zomato + Swiggy)**
```json
[
  {
    "code": "ZOMATO30",
    "store": "zomato.com",
    "category": "food",
    "discountValue": 30,
    "discountType": "percentage"
  },
  {
    "code": "SWIGGY50",
    "store": "swiggy.com",
    "category": "food",
    "discountValue": 50,
    "minimumOrder": 400
  }
]
```

## 🛠️ Настройка промокодов

### **1. Добавление ручных промокодов**
```bash
# Отредактируйте файл data/manual-promocodes.json
{
  "code": "ВАШ_ПРОМОКОД",
  "title": "Название скидки",
  "description": "Описание",
  "discountType": "fixed|percentage",
  "discountValue": 500,
  "minimumOrder": 1000,
  "category": "electronics|fashion|food",
  "store": "amazon.in|flipkart.com|myntra.com",
  "expiryDate": "2024-12-31T23:59:59.000Z"
}
```

### **2. Настройка партнерских программ**

#### **Amazon Associates:**
1. Зайдите в [Amazon Associates](https://affiliate-program.amazon.in/)
2. Создайте промокоды в разделе "Coupons"
3. Скопируйте коды в систему

#### **Flipkart Affiliate:**
1. Войдите в [Flipkart Affiliate](https://affiliate.flipkart.com/)
2. Создайте купоны в разделе "Coupons & Offers"
3. Добавьте в базу данных

### **3. Автоматическая синхронизация**
```bash
# Синхронизация промокодов
node scripts/data-sync.js sync promocodes electronics
node scripts/data-sync.js sync promocodes fashion
node scripts/data-sync.js sync promocodes food
```

## 🎯 Логика работы в боте

### **Показ товаров с промокодами:**
```
📱 iPhone 15 Pro
💰 ₹1,34,900 → ₹1,34,400
🎁 Промокод: APPLE500 (-₹500)
🏪 Amazon

🎁 Промокод: AMAZON500 (-₹500) = ₹1,33,900
```

### **Валидация промокодов:**
```javascript
// Проверка промокода перед применением
const validation = await validatePromocode(code, store, amount);
if (validation.valid) {
  const discount = calculateDiscount(promocode, amount);
  const finalPrice = amount - discount;
}
```

## 📊 Мониторинг и аналитика

### **Статистика использования:**
- Количество примененных промокодов
- Общая экономия пользователей
- Популярные промокоды по категориям
- Конверсия промокодов

### **Управление истекшими промокодами:**
```javascript
// Автоматическая очистка
const expiredCodes = promocodes.filter(code => !isActive(code));
expiredCodes.forEach(code => removeExpiredCode(code.id));
```

## 🚀 Быстрый старт

### **Шаг 1: Добавьте базовые промокоды**
```bash
# Скопируйте существующие из data/manual-promocodes.json
# Измените коды, магазины и скидки
```

### **Шаг 2: Подключите партнерские программы**
```bash
# Amazon Associates - самый простой старт
# Создайте 5-10 промокодов для электроники
```

### **Шаг 3: Тестируйте систему**
```bash
# Проверьте валидацию промокодов
node scripts/test-promocodes.js
```

### **Шаг 4: Автоматизируйте**
```bash
# Включите автоматическую синхронизацию
node scripts/data-sync.js
```

## 💡 Советы по промокодам

1. **Создавайте уникальные коды** для каждой категории
2. **Устанавливайте realistic скидки** (5-30%)
3. **Добавляйте minimum order** для нормальной маржи
4. **Регулярно обновляйте** промокоды
5. **Тестируйте валидацию** перед запуском
6. **Мониторьте использование** для оптимизации

## 🔧 Расширенные возможности

### **Персональные промокоды**
```javascript
// Генерация уникального промокода для пользователя
const personalCode = `BG${userId}${Date.now().toString(36)}`;
```

### **Сезонные акции**
```javascript
// Автоматическое создание праздничных промокодов
const holidayCodes = generateHolidayPromocodes();
```

### **A/B тестирование**
```javascript
// Тестирование разных скидок
const testGroupA = { discount: 10 };
const testGroupB = { discount: 15 };
```

Теперь вы знаете все способы работы с промокодами! 🎉


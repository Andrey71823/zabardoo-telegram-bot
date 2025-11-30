#!/usr/bin/env node

// Скрипт для тестирования системы промокодов
const PromocodesService = require('../services/promocodes/promocodes-service');

async function testPromocodes() {
  console.log('🧪 Тестирование системы промокодов\n');

  const promocodesService = new PromocodesService();

  try {
    // Тест 1: Получение всех активных промокодов
    console.log('📋 Тест 1: Получение всех активных промокодов');
    const allPromocodes = await promocodesService.getAllActivePromocodes();
    console.log(`✅ Найдено ${allPromocodes.length} активных промокодов\n`);

    // Тест 2: Получение промокодов по категориям
    const categories = ['electronics', 'fashion', 'food', 'shoes'];

    for (const category of categories) {
      console.log(`📱 Тест 2: Промокоды категории "${category}"`);
      const categoryPromocodes = await promocodesService.getPromocodes(category);
      console.log(`✅ Найдено ${categoryPromocodes.length} промокодов`);

      if (categoryPromocodes.length > 0) {
        console.log('📄 Примеры:');
        categoryPromocodes.slice(0, 2).forEach(code => {
          console.log(`   - ${code.code}: ${code.title} (${code.discountValue}${code.discountType === 'percentage' ? '%' : '₹'})`);
        });
      }
      console.log('');
    }

    // Тест 3: Валидация промокодов
    console.log('🔍 Тест 3: Валидация промокодов');

    const testCases = [
      { code: 'FLIP500', store: 'flipkart.com', amount: 2500 },
      { code: 'MYNTRA20', store: 'myntra.com', amount: 1200 },
      { code: 'FOOD30', store: 'zomato.com', amount: 400 },
      { code: 'INVALID', store: 'test.com', amount: 1000 }
    ];

    for (const testCase of testCases) {
      const validation = await promocodesService.validatePromocode(
        testCase.code,
        testCase.store,
        testCase.amount
      );

      console.log(`   ${testCase.code} (${testCase.store}): ${validation.valid ? '✅ Валиден' : '❌ ' + validation.reason}`);

      if (validation.valid) {
        console.log(`   💰 Скидка: ₹${validation.discount.discount} | Итого: ₹${testCase.amount - validation.discount.discount}`);
      }
    }
    console.log('');

    // Тест 4: Добавление нового промокода
    console.log('➕ Тест 4: Добавление нового промокода');
    const newPromocode = {
      code: 'TEST25',
      title: 'Тестовая скидка 25%',
      description: 'Тестовый промокод для проверки',
      discountType: 'percentage',
      discountValue: 25,
      minimumOrder: 500,
      category: 'general',
      store: 'test-store.com',
      expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };

    const saveResult = await promocodesService.savePromocode(newPromocode);
    console.log(`✅ Промокод ${newPromocode.code} ${saveResult ? 'сохранен' : 'не сохранен'}\n`);

    // Тест 5: Проверка после добавления
    console.log('🔄 Тест 5: Проверка после добавления');
    const validation = await promocodesService.validatePromocode('TEST25', 'test-store.com', 1000);
    console.log(`   TEST25 валидация: ${validation.valid ? '✅ Успешно' : '❌ Ошибка'}`);

    if (validation.valid) {
      console.log(`   💰 Скидка 25% от ₹1000 = ₹${validation.discount.discount}`);
    }

  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message);
  }
}

// Функция для демонстрации создания промокодов
function showPromocodeExamples() {
  console.log('\n📝 ПРИМЕРЫ ПРОМОКОДОВ ДЛЯ РАЗНЫХ МАГАЗИНОВ:');
  console.log('=' .repeat(50));

  const examples = [
    {
      store: 'Amazon India',
      codes: [
        'AMZ150 - ₹150 скидка на электронику',
        'AMZ500 - ₹500 скидка от ₹2000',
        'AMZ20 - 20% скидка на одежду'
      ]
    },
    {
      store: 'Flipkart',
      codes: [
        'FLIP200 - ₹200 на электронику',
        'FLIP500 - ₹500 от ₹1500',
        'FLIP30 - 30% на fashion'
      ]
    },
    {
      store: 'Myntra',
      codes: [
        'MYNTRA20 - 20% на одежду',
        'MYNTRA300 - ₹300 от ₹1000',
        'MYNTRA50 - ₹50 на аксессуары'
      ]
    },
    {
      store: 'Zomato',
      codes: [
        'ZOMATO30 - 30% на доставку',
        'ZOMATO150 - ₹150 от ₹500',
        'ZOMATO50 - ₹50 на напитки'
      ]
    }
  ];

  examples.forEach(example => {
    console.log(`🏪 ${example.store}:`);
    example.codes.forEach(code => console.log(`   ${code}`));
    console.log('');
  });
}

// Запуск тестов
if (require.main === module) {
  testPromocodes()
    .then(() => {
      showPromocodeExamples();
      console.log('\n🎉 Тестирование завершено!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Критическая ошибка:', error);
      process.exit(1);
    });
}

module.exports = { testPromocodes, showPromocodeExamples };


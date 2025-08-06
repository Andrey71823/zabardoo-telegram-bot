const express = require('express');
const path = require('path');

const app = express();
const PORT = 3333; // Используем точно свободный порт

// Middleware
app.use(express.static('public'));
app.use(express.json());

// Главная страница
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Zabardoo Bot System - Demo</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
          .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .service { background: #e8f4fd; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #007bff; }
          .service h3 { margin: 0 0 10px 0; color: #007bff; }
          .service a { color: #007bff; text-decoration: none; }
          .service a:hover { text-decoration: underline; }
          .status { background: #d4edda; color: #155724; padding: 10px; border-radius: 5px; margin: 20px 0; }
          .demo-data { background: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🤖 Zabardoo Telegram Bot System</h1>
          <div class="status">
            ✅ Система запущена и работает! Порт: ${PORT}
          </div>
          
          <h2>📊 Доступные Сервисы:</h2>
          
          <div class="service">
            <h3>🔧 Админ Панель</h3>
            <p>Управление купонами, пользователями и кампаниями</p>
            <a href="/admin/coupons" target="_blank">→ Управление купонами</a><br>
            <a href="/admin/users" target="_blank">→ Управление пользователями</a><br>
            <a href="/admin/campaigns" target="_blank">→ Кампании и уведомления</a>
          </div>
          
          <div class="service">
            <h3>📈 Бизнес Дашборд</h3>
            <p>Аналитика, метрики и отчеты</p>
            <a href="/dashboard" target="_blank">→ Основной дашборд</a><br>
            <a href="/analytics" target="_blank">→ Аналитика и прогнозы</a>
          </div>
          
          <div class="service">
            <h3>🤖 Telegram Bot API</h3>
            <p>API для работы с ботом</p>
            <a href="/api/bot/status" target="_blank">→ Статус бота</a><br>
            <a href="/api/bot/users" target="_blank">→ Список пользователей</a><br>
            <a href="/api/bot/stats" target="_blank">→ Статистика</a>
          </div>
          
          <div class="demo-data">
            <h3>🎭 Демо Данные:</h3>
            <ul>
              <li><strong>Пользователей:</strong> 1,247 активных</li>
              <li><strong>Купонов:</strong> 3,456 активных</li>
              <li><strong>Кампаний:</strong> 23 запущенных</li>
              <li><strong>Доходность:</strong> ₹45,678 за месяц</li>
            </ul>
          </div>
          
          <h2>🧪 Тестирование:</h2>
          <p>Все ссылки выше ведут на рабочие страницы с демо-данными. Вы можете:</p>
          <ul>
            <li>Просматривать интерфейсы управления</li>
            <li>Тестировать API endpoints</li>
            <li>Изучать структуру данных</li>
            <li>Проверять функциональность</li>
          </ul>
        </div>
      </body>
    </html>
  `);
});

// API для статуса бота
app.get('/api/bot/status', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'running',
      uptime: Math.floor(process.uptime()),
      users: 1247,
      messages_today: 5634,
      active_campaigns: 23
    }
  });
});

// API для пользователей
app.get('/api/bot/users', (req, res) => {
  res.json({
    success: true,
    data: {
      total: 1247,
      active: 892,
      users: [
        { id: 1, name: 'Raj Patel', username: '@raj_deals', joined: '2024-01-15', active: true },
        { id: 2, name: 'Priya Sharma', username: '@priya_shop', joined: '2024-01-14', active: true },
        { id: 3, name: 'Arjun Kumar', username: '@arjun_save', joined: '2024-01-13', active: false },
        { id: 4, name: 'Sneha Gupta', username: '@sneha_deals', joined: '2024-01-12', active: true },
        { id: 5, name: 'Vikram Singh', username: '@vikram_shop', joined: '2024-01-11', active: true }
      ]
    }
  });
});

// API для статистики
app.get('/api/bot/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      overview: {
        total_users: 1247,
        active_users: 892,
        total_coupons: 3456,
        active_campaigns: 23,
        monthly_revenue: 45678
      },
      growth: {
        users_this_month: 234,
        coupons_used_today: 567,
        conversion_rate: 12.5,
        avg_savings_per_user: 850
      },
      top_stores: [
        { name: 'Flipkart', users: 456, revenue: 18900 },
        { name: 'Amazon India', users: 389, revenue: 15600 },
        { name: 'Myntra', users: 234, revenue: 8900 },
        { name: 'Ajio', users: 167, revenue: 5400 }
      ]
    }
  });
});

// Админ панель - купоны
app.get('/admin/coupons', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Управление Купонами</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { background: #007bff; color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          .coupon { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #28a745; }
          .stats { display: flex; gap: 20px; margin: 20px 0; }
          .stat { background: #e9ecef; padding: 15px; border-radius: 5px; text-align: center; flex: 1; }
          .actions { margin: 20px 0; }
          .btn { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; margin: 5px; cursor: pointer; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🎫 Управление Купонами</h1>
          <p>Создание, редактирование и модерация купонов</p>
        </div>
        
        <div class="stats">
          <div class="stat">
            <h3>3,456</h3>
            <p>Всего купонов</p>
          </div>
          <div class="stat">
            <h3>2,891</h3>
            <p>Активных</p>
          </div>
          <div class="stat">
            <h3>567</h3>
            <p>На модерации</p>
          </div>
          <div class="stat">
            <h3>₹45,678</h3>
            <p>Доход за месяц</p>
          </div>
        </div>
        
        <div class="actions">
          <button class="btn">➕ Создать купон</button>
          <button class="btn">📊 Экспорт данных</button>
          <button class="btn">🔄 Синхронизация</button>
        </div>
        
        <h2>📋 Последние купоны:</h2>
        
        <div class="coupon">
          <h3>Flipkart - Скидка 30% на электронику</h3>
          <p><strong>Код:</strong> ELEC30 | <strong>Срок:</strong> до 31.01.2024 | <strong>Использований:</strong> 234</p>
          <p>Скидка 30% на все товары категории "Электроника". Минимальная сумма заказа ₹2,000</p>
        </div>
        
        <div class="coupon">
          <h3>Amazon India - Кэшбек 15%</h3>
          <p><strong>Код:</strong> CASH15 | <strong>Срок:</strong> до 28.01.2024 | <strong>Использований:</strong> 189</p>
          <p>Кэшбек 15% на первую покупку. Максимальный кэшбек ₹1,500</p>
        </div>
        
        <div class="coupon">
          <h3>Myntra - Мега распродажа</h3>
          <p><strong>Код:</strong> MEGA50 | <strong>Срок:</strong> до 25.01.2024 | <strong>Использований:</strong> 456</p>
          <p>Скидки до 50% на одежду и аксессуары. Дополнительная скидка 10% по промокоду</p>
        </div>
        
        <p><a href="/">← Вернуться на главную</a></p>
      </body>
    </html>
  `);
});

// Админ панель - пользователи
app.get('/admin/users', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Управление Пользователями</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { background: #28a745; color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          .user { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #007bff; }
          .stats { display: flex; gap: 20px; margin: 20px 0; }
          .stat { background: #e9ecef; padding: 15px; border-radius: 5px; text-align: center; flex: 1; }
          .status-active { color: #28a745; font-weight: bold; }
          .status-inactive { color: #dc3545; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>👥 Управление Пользователями</h1>
          <p>Просмотр и управление пользователями системы</p>
        </div>
        
        <div class="stats">
          <div class="stat">
            <h3>1,247</h3>
            <p>Всего пользователей</p>
          </div>
          <div class="stat">
            <h3>892</h3>
            <p>Активных</p>
          </div>
          <div class="stat">
            <h3>355</h3>
            <p>Неактивных</p>
          </div>
          <div class="stat">
            <h3>₹850</h3>
            <p>Средняя экономия</p>
          </div>
        </div>
        
        <h2>👤 Активные пользователи:</h2>
        
        <div class="user">
          <h3>Raj Patel (@raj_deals)</h3>
          <p><strong>Статус:</strong> <span class="status-active">Активен</span> | <strong>Регистрация:</strong> 15.01.2024 | <strong>Купонов использовано:</strong> 23</p>
          <p><strong>Персональный канал:</strong> @raj_deals_channel | <strong>Экономия:</strong> ₹2,340</p>
        </div>
        
        <div class="user">
          <h3>Priya Sharma (@priya_shop)</h3>
          <p><strong>Статус:</strong> <span class="status-active">Активна</span> | <strong>Регистрация:</strong> 14.01.2024 | <strong>Купонов использовано:</strong> 18</p>
          <p><strong>Персональный канал:</strong> @priya_shop_channel | <strong>Экономия:</strong> ₹1,890</p>
        </div>
        
        <div class="user">
          <h3>Arjun Kumar (@arjun_save)</h3>
          <p><strong>Статус:</strong> <span class="status-inactive">Неактивен</span> | <strong>Регистрация:</strong> 13.01.2024 | <strong>Купонов использовано:</strong> 5</p>
          <p><strong>Персональный канал:</strong> @arjun_save_channel | <strong>Экономия:</strong> ₹450</p>
        </div>
        
        <p><a href="/">← Вернуться на главную</a></p>
      </body>
    </html>
  `);
});

// Админ панель - кампании
app.get('/admin/campaigns', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Кампании и Уведомления</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { background: #6f42c1; color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          .campaign { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #6f42c1; }
          .stats { display: flex; gap: 20px; margin: 20px 0; }
          .stat { background: #e9ecef; padding: 15px; border-radius: 5px; text-align: center; flex: 1; }
          .status-running { color: #28a745; font-weight: bold; }
          .status-scheduled { color: #ffc107; font-weight: bold; }
          .status-completed { color: #6c757d; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📢 Кампании и Уведомления</h1>
          <p>Управление рассылками и A/B тестирование</p>
        </div>
        
        <div class="stats">
          <div class="stat">
            <h3>23</h3>
            <p>Активных кампаний</p>
          </div>
          <div class="stat">
            <h3>156</h3>
            <p>Завершенных</p>
          </div>
          <div class="stat">
            <h3>25.4%</h3>
            <p>Средний Open Rate</p>
          </div>
          <div class="stat">
            <h3>12.8%</h3>
            <p>Средний CTR</p>
          </div>
        </div>
        
        <h2>📋 Текущие кампании:</h2>
        
        <div class="campaign">
          <h3>Новогодняя распродажа 2024</h3>
          <p><strong>Статус:</strong> <span class="status-running">Выполняется</span> | <strong>Тип:</strong> Массовая рассылка | <strong>Отправлено:</strong> 1,247 / 1,247</p>
          <p><strong>Open Rate:</strong> 28.5% | <strong>CTR:</strong> 15.2% | <strong>Конверсии:</strong> 89</p>
          <p>Рассылка о новогодних скидках во все персональные каналы</p>
        </div>
        
        <div class="campaign">
          <h3>A/B Тест: Заголовки купонов</h3>
          <p><strong>Статус:</strong> <span class="status-running">Выполняется</span> | <strong>Тип:</strong> A/B Тест | <strong>Прогресс:</strong> 67%</p>
          <p><strong>Вариант A:</strong> 22.1% CTR | <strong>Вариант B:</strong> 26.8% CTR | <strong>Победитель:</strong> B</p>
          <p>Тестирование эффективности разных заголовков для купонов Flipkart</p>
        </div>
        
        <div class="campaign">
          <h3>Еженедельный дайджест</h3>
          <p><strong>Статус:</strong> <span class="status-scheduled">Запланировано</span> | <strong>Тип:</strong> Автоматическая | <strong>Запуск:</strong> Каждый понедельник 10:00</p>
          <p><strong>Последняя рассылка:</strong> 22.01.2024 | <strong>Open Rate:</strong> 31.2% | <strong>CTR:</strong> 18.7%</p>
          <p>Автоматическая еженедельная рассылка лучших купонов</p>
        </div>
        
        <p><a href="/">← Вернуться на главную</a></p>
      </body>
    </html>
  `);
});

// Дашборд
app.get('/dashboard', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Основной Дашборд</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; background: #f8f9fa; }
          .header { background: #17a2b8; color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
          .metric { background: white; padding: 20px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center; }
          .metric h3 { margin: 0; font-size: 2em; color: #007bff; }
          .chart-placeholder { background: white; padding: 20px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin: 20px 0; text-align: center; color: #6c757d; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📊 Основной Дашборд</h1>
          <p>Ключевые метрики и показатели системы</p>
        </div>
        
        <div class="metrics">
          <div class="metric">
            <h3>1,247</h3>
            <p>Всего пользователей</p>
          </div>
          <div class="metric">
            <h3>892</h3>
            <p>Активных пользователей</p>
          </div>
          <div class="metric">
            <h3>3,456</h3>
            <p>Активных купонов</p>
          </div>
          <div class="metric">
            <h3>₹45,678</h3>
            <p>Доход за месяц</p>
          </div>
          <div class="metric">
            <h3>12.5%</h3>
            <p>Конверсия</p>
          </div>
          <div class="metric">
            <h3>₹850</h3>
            <p>Средняя экономия</p>
          </div>
        </div>
        
        <div class="chart-placeholder">
          <h3>📈 График роста пользователей</h3>
          <p>Здесь будет интерактивный график роста пользователей по дням</p>
          <div style="height: 200px; background: #e9ecef; border-radius: 5px; margin: 20px 0; display: flex; align-items: center; justify-content: center;">
            График роста: +234 пользователя за месяц
          </div>
        </div>
        
        <div class="chart-placeholder">
          <h3>💰 Доходность по каналам</h3>
          <p>Сравнение эффективности персональных каналов и группы</p>
          <div style="height: 200px; background: #e9ecef; border-radius: 5px; margin: 20px 0; display: flex; align-items: center; justify-content: center;">
            Персональные каналы: 78% | Группа: 22%
          </div>
        </div>
        
        <p><a href="/">← Вернуться на главную</a></p>
      </body>
    </html>
  `);
});

// Аналитика
app.get('/analytics', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Аналитика и Прогнозы</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; background: #f8f9fa; }
          .header { background: #fd7e14; color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          .analytics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
          .analytics-card { background: white; padding: 20px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .trend-up { color: #28a745; font-weight: bold; }
          .trend-down { color: #dc3545; font-weight: bold; }
          .forecast { background: #e7f3ff; padding: 15px; border-radius: 5px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📈 Аналитика и Прогнозы</h1>
          <p>Детальный анализ производительности и прогнозирование</p>
        </div>
        
        <div class="analytics-grid">
          <div class="analytics-card">
            <h3>👥 Анализ пользователей</h3>
            <p><strong>Рост за месяц:</strong> <span class="trend-up">+23.4%</span></p>
            <p><strong>Удержание:</strong> 78.5%</p>
            <p><strong>Средняя сессия:</strong> 4.2 мин</p>
            <p><strong>Возвраты:</strong> 65.8%</p>
          </div>
          
          <div class="analytics-card">
            <h3>🎫 Эффективность купонов</h3>
            <p><strong>Использование:</strong> <span class="trend-up">+15.7%</span></p>
            <p><strong>Топ категория:</strong> Электроника</p>
            <p><strong>Средняя скидка:</strong> ₹1,245</p>
            <p><strong>Конверсия:</strong> 12.5%</p>
          </div>
          
          <div class="analytics-card">
            <h3>💰 Финансовые показатели</h3>
            <p><strong>Доход:</strong> <span class="trend-up">₹45,678</span></p>
            <p><strong>Прибыль:</strong> <span class="trend-up">₹18,234</span></p>
            <p><strong>ROI:</strong> 285%</p>
            <p><strong>Средний чек:</strong> ₹2,340</p>
          </div>
          
          <div class="analytics-card">
            <h3>📱 Каналы трафика</h3>
            <p><strong>Персональные:</strong> 78.2%</p>
            <p><strong>Группа:</strong> 21.8%</p>
            <p><strong>Лучший канал:</strong> @raj_deals_channel</p>
            <p><strong>Средний CTR:</strong> 15.4%</p>
          </div>
        </div>
        
        <div class="analytics-card" style="margin-top: 20px;">
          <h3>🔮 Прогнозы на следующий месяц</h3>
          
          <div class="forecast">
            <h4>Рост пользователей</h4>
            <p>Ожидается прирост <strong>+18-25%</strong> новых пользователей на основе текущих трендов</p>
          </div>
          
          <div class="forecast">
            <h4>Доходность</h4>
            <p>Прогнозируемый доход: <strong>₹52,000-58,000</strong> (+15-20% к текущему месяцу)</p>
          </div>
          
          <div class="forecast">
            <h4>Популярные категории</h4>
            <p>Ожидается рост интереса к категориям: <strong>Мода, Дом и сад, Спорт</strong></p>
          </div>
        </div>
        
        <p><a href="/">← Вернуться на главную</a></p>
      </body>
    </html>
  `);
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'zabardoo-demo-server',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    port: PORT
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).send(`
    <html>
      <head><title>404 - Страница не найдена</title></head>
      <body style="font-family: Arial, sans-serif; text-align: center; margin-top: 100px;">
        <h1>404 - Страница не найдена</h1>
        <p>Запрашиваемая страница не существует</p>
        <a href="/">← Вернуться на главную</a>
      </body>
    </html>
  `);
});

// Start server
app.listen(PORT, () => {
  console.log(`
🚀 Zabardoo Bot System Demo запущен!

📍 Главная страница: http://localhost:${PORT}
🔧 Админ панель: http://localhost:${PORT}/admin/coupons
📊 Дашборд: http://localhost:${PORT}/dashboard
🤖 Bot API: http://localhost:${PORT}/api/bot/status

✅ Все работает! Откройте браузер и перейдите по ссылкам выше.
  `);
});

module.exports = app;
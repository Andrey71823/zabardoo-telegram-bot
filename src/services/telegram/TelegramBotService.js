const express = require('express');
const cors = require('cors');

const app = express();
require('dotenv').config();
const PORT = process.env.BOT_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Demo bot state
let botState = {
  isRunning: false,
  users: [],
  messages: [],
  startTime: new Date()
};

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'telegram-bot',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    botState: {
      isRunning: botState.isRunning,
      totalUsers: botState.users.length,
      totalMessages: botState.messages.length,
      startTime: botState.startTime
    }
  });
});

// Bot status
app.get('/api/bot/status', (req, res) => {
  res.json({
    success: true,
    data: {
      status: botState.isRunning ? 'running' : 'stopped',
      users: botState.users.length,
      messages: botState.messages.length,
      uptime: Math.floor((Date.now() - botState.startTime.getTime()) / 1000)
    }
  });
});

// Start bot
app.post('/api/bot/start', (req, res) => {
  botState.isRunning = true;
  botState.startTime = new Date();
  
  console.log('🤖 Telegram Bot started (Demo Mode)');
  
  res.json({
    success: true,
    message: 'Bot started successfully',
    data: {
      status: 'running',
      startTime: botState.startTime
    }
  });
});

// Stop bot
app.post('/api/bot/stop', (req, res) => {
  botState.isRunning = false;
  
  console.log('🛑 Telegram Bot stopped');
  
  res.json({
    success: true,
    message: 'Bot stopped successfully',
    data: {
      status: 'stopped'
    }
  });
});

// Webhook endpoint (demo)
app.post('/api/bot/webhook', (req, res) => {
  const update = req.body;
  
  console.log('📨 Received webhook update:', JSON.stringify(update, null, 2));
  
  // Simulate message processing
  if (update.message) {
    const message = update.message;
    const user = message.from;
    
    // Add user if not exists
    if (!botState.users.find(u => u.id === user.id)) {
      botState.users.push({
        id: user.id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        joinedAt: new Date()
      });
      console.log(`👤 New user joined: ${user.first_name} (@${user.username})`);
    }
    
    // Store message
    botState.messages.push({
      id: message.message_id,
      from: user.id,
      text: message.text,
      date: new Date(message.date * 1000)
    });
    
    // Simulate bot response
    console.log(`💬 Message from ${user.first_name}: ${message.text}`);
    
    // Demo responses
    let response = '';
    if (message.text === '/start') {
      response = `Привет, ${user.first_name}! 👋\n\nДобро пожаловать в Zabardoo Bot!\n\nДоступные команды:\n/coupons - Получить купоны\n/balance - Проверить баланс\n/help - Помощь`;
    } else if (message.text === '/coupons') {
      response = `🎫 Актуальные купоны:\n\n1. Flipkart - скидка 20%\n2. Amazon India - кэшбек 15%\n3. Myntra - скидка 30%\n\nВыберите купон для получения ссылки!`;
    } else if (message.text === '/balance') {
      response = `💰 Ваш баланс: ₹250.00\n\n📊 Статистика:\n• Использовано купонов: 12\n• Заработано кэшбека: ₹1,250\n• Доступно для вывода: ₹250`;
    } else if (message.text === '/help') {
      response = `ℹ️ Помощь по боту:\n\n🤖 Zabardoo Bot поможет вам:\n• Найти лучшие купоны\n• Получить кэшбек\n• Отслеживать покупки\n\nКоманды:\n/start - Начать работу\n/coupons - Купоны\n/balance - Баланс\n/help - Эта справка`;
    } else {
      response = `Спасибо за сообщение! 😊\n\nИспользуйте /help для просмотра доступных команд.`;
    }
    
    console.log(`🤖 Bot response: ${response}`);
  }
  
  res.json({ ok: true });
});

// Get users
app.get('/api/bot/users', (req, res) => {
  res.json({
    success: true,
    data: {
      users: botState.users,
      total: botState.users.length
    }
  });
});

// Get messages
app.get('/api/bot/messages', (req, res) => {
  res.json({
    success: true,
    data: {
      messages: botState.messages.slice(-50), // Last 50 messages
      total: botState.messages.length
    }
  });
});

// Send message (demo)
app.post('/api/bot/send-message', (req, res) => {
  const { userId, text } = req.body;
  
  console.log(`📤 Sending message to user ${userId}: ${text}`);
  
  // Simulate message sending
  const message = {
    id: Date.now(),
    to: userId,
    text: text,
    sent: true,
    timestamp: new Date()
  };
  
  res.json({
    success: true,
    message: 'Message sent successfully',
    data: message
  });
});

// Demo data initialization
function initializeDemoData() {
  console.log('🎭 Initializing demo data...');
  
  // Add some demo users
  botState.users = [
    {
      id: 123456789,
      username: 'demo_user1',
      first_name: 'Raj',
      last_name: 'Patel',
      joinedAt: new Date(Date.now() - 86400000) // 1 day ago
    },
    {
      id: 987654321,
      username: 'demo_user2',
      first_name: 'Priya',
      last_name: 'Sharma',
      joinedAt: new Date(Date.now() - 172800000) // 2 days ago
    },
    {
      id: 456789123,
      username: 'demo_user3',
      first_name: 'Arjun',
      last_name: 'Kumar',
      joinedAt: new Date(Date.now() - 259200000) // 3 days ago
    }
  ];
  
  // Add some demo messages
  botState.messages = [
    {
      id: 1,
      from: 123456789,
      text: '/start',
      date: new Date(Date.now() - 86400000)
    },
    {
      id: 2,
      from: 987654321,
      text: '/coupons',
      date: new Date(Date.now() - 172800000)
    },
    {
      id: 3,
      from: 456789123,
      text: '/balance',
      date: new Date(Date.now() - 259200000)
    }
  ];
  
  botState.isRunning = true;
  console.log('✅ Demo data initialized');
}

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Bot service error:', err);
  res.status(500).json({
    error: 'Internal server error',
    timestamp: new Date().toISOString(),
  });
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`Telegram Bot Service received ${signal}, shutting down gracefully`);
  botState.isRunning = false;
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
app.listen(PORT, () => {
  console.log(`🤖 Telegram Bot Service running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Bot API: http://localhost:${PORT}/api/bot`);
  
  // Initialize demo data
  initializeDemoData();
  
  console.log('\n📱 Demo Mode Active:');
  console.log('   - Bot is running in demo mode');
  console.log('   - No real Telegram connection');
  console.log('   - Use webhook endpoint for testing');
  console.log('   - Demo users and messages loaded');
});

module.exports = app;
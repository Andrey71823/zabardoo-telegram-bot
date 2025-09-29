#!/usr/bin/env node

// Скрипт мониторинга оптимизированного бота
const https = require('https');

class BotMonitor {
  constructor() {
    this.baseUrl = 'http://localhost:3000';
    this.interval = 30000; // 30 секунд
    this.alerts = [];
  }

  // Запуск мониторинга
  async start() {
    console.log('📊 Запуск мониторинга BazaarGuru Optimized Bot\n');
    console.log(`🔄 Интервал проверки: ${this.interval / 1000} секунд\n`);

    // Немедленная проверка
    await this.checkHealth();

    // Периодическая проверка
    setInterval(async () => {
      await this.checkHealth();
      this.displayAlerts();
    }, this.interval);

    // Мониторинг ресурсов
    setInterval(() => {
      this.checkSystemResources();
    }, 60000); // Каждую минуту
  }

  // Проверка здоровья бота
  async checkHealth() {
    try {
      const health = await this.makeRequest('/health');
      this.displayHealthStatus(health);
      this.checkThresholds(health);
    } catch (error) {
      console.error('❌ Ошибка проверки здоровья:', error.message);
      this.addAlert('CRITICAL', 'Бот недоступен', error.message);
    }
  }

  // Проверка статистики
  async checkStats() {
    try {
      const stats = await this.makeRequest('/stats');
      this.displayStats(stats);
      return stats;
    } catch (error) {
      console.error('❌ Ошибка получения статистики:', error.message);
      return null;
    }
  }

  // Проверка системных ресурсов
  checkSystemResources() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    const memoryMB = Math.floor(memUsage.heapUsed / 1024 / 1024);
    const memoryPercent = Math.floor((memUsage.heapUsed / memUsage.heapTotal) * 100);

    console.log(`💾 Память: ${memoryMB}MB (${memoryPercent}%)`);

    if (memoryPercent > 80) {
      this.addAlert('WARNING', 'Высокое использование памяти', `${memoryPercent}%`);
    }

    if (cpuUsage.user > 10000000) { // 10 секунд CPU time
      this.addAlert('WARNING', 'Высокая загрузка CPU', 'Проверьте производительность');
    }
  }

  // HTTP запрос к боту
  makeRequest(path) {
    return new Promise((resolve, reject) => {
      const url = this.baseUrl + path;
      const req = https.get(url, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            if (res.statusCode === 200) {
              const result = JSON.parse(data);
              resolve(result);
            } else {
              reject(new Error(`HTTP ${res.statusCode}`));
            }
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(5000, () => {
        req.abort();
        reject(new Error('Timeout'));
      });
    });
  }

  // Отображение статуса здоровья
  displayHealthStatus(health) {
    const uptime = Math.floor(health.uptime / 60);
    const memoryMB = Math.floor(health.memory.used / 1024 / 1024);

    console.log(`🏥 Здоровье бота: ${health.status.toUpperCase()}`);
    console.log(`⏱️  Uptime: ${uptime} минут`);
    console.log(`💾 Память: ${memoryMB}MB / ${health.memory.total}MB`);
    console.log(`📊 Ошибок: ${health.stats.errors}`);
    console.log('');
  }

  // Отображение статистики
  displayStats(stats) {
    console.log('📈 Статистика бота:');
    console.log(`📨 Сообщений обработано: ${stats.messagesProcessed || 0}`);
    console.log(`📋 Очередь: ${stats.queueSize || 0}`);
    console.log(`⚙️  Активных задач: ${stats.activeJobs || 0}`);
    console.log('');
  }

  // Проверка пороговых значений
  checkThresholds(health) {
    const memoryPercent = (health.memory.used / health.memory.total) * 100;

    // Проверка памяти
    if (memoryPercent > 85) {
      this.addAlert('CRITICAL', 'Критическое использование памяти', `${memoryPercent.toFixed(1)}%`);
    } else if (memoryPercent > 70) {
      this.addAlert('WARNING', 'Высокое использование памяти', `${memoryPercent.toFixed(1)}%`);
    }

    // Проверка ошибок
    if (health.stats.errors > 100) {
      this.addAlert('CRITICAL', 'Много ошибок', `${health.stats.errors} ошибок`);
    } else if (health.stats.errors > 50) {
      this.addAlert('WARNING', 'Повышенное количество ошибок', `${health.stats.errors} ошибок`);
    }

    // Проверка времени работы
    if (health.uptime < 300) { // 5 минут
      this.addAlert('INFO', 'Бот недавно запущен', `${Math.floor(health.uptime / 60)} минут`);
    }
  }

  // Добавление алерта
  addAlert(level, title, message) {
    const alert = {
      id: Date.now(),
      level,
      title,
      message,
      timestamp: new Date().toISOString()
    };

    this.alerts.unshift(alert);

    // Ограничение количества алертов
    if (this.alerts.length > 50) {
      this.alerts = this.alerts.slice(0, 50);
    }
  }

  // Отображение алертов
  displayAlerts() {
    if (this.alerts.length === 0) return;

    console.log('🚨 Алерты:');

    // Показать последние 5 алертов
    const recentAlerts = this.alerts.slice(0, 5);

    recentAlerts.forEach(alert => {
      const icon = {
        'CRITICAL': '🔴',
        'WARNING': '🟡',
        'INFO': 'ℹ️'
      }[alert.level] || '⚪';

      console.log(`${icon} ${alert.level}: ${alert.title}`);
      console.log(`   ${alert.message}`);
    });

    console.log('');
  }

  // Экспорт метрик
  async exportMetrics() {
    try {
      const health = await this.makeRequest('/health');
      const stats = await this.makeRequest('/stats');

      const metrics = {
        timestamp: new Date().toISOString(),
        health,
        stats,
        alerts: this.alerts.slice(0, 10),
        system: {
          memory: process.memoryUsage(),
          uptime: process.uptime(),
          platform: process.platform,
          nodeVersion: process.version
        }
      };

      const fs = require('fs');
      const path = require('path');
      const metricsPath = path.join(__dirname, '../logs/metrics.json');

      fs.writeFileSync(metricsPath, JSON.stringify(metrics, null, 2));
      console.log('✅ Метрики экспортированы в logs/metrics.json');

    } catch (error) {
      console.error('❌ Ошибка экспорта метрик:', error.message);
    }
  }

  // Остановка мониторинга
  stop() {
    console.log('🛑 Остановка мониторинга...');
    this.exportMetrics();
    process.exit(0);
  }
}

// CLI интерфейс
const args = process.argv.slice(2);
const monitor = new BotMonitor();

if (args.includes('--export') || args.includes('-e')) {
  monitor.exportMetrics();
} else if (args.includes('--once') || args.includes('-o')) {
  monitor.checkHealth().then(() => monitor.checkStats());
} else if (args.includes('--help') || args.includes('-h')) {
  console.log(`
📊 Мониторинг BazaarGuru Optimized Bot

Использование:
  node scripts/monitor-optimized-bot.js          # Запуск непрерывного мониторинга
  node scripts/monitor-optimized-bot.js --once   # Одноразовая проверка
  node scripts/monitor-optimized-bot.js --export # Экспорт метрик
  node scripts/monitor-optimized-bot.js --help   # Справка

Метрики:
  🏥 Здоровье бота (uptime, память, ошибки)
  📈 Статистика (сообщения, очередь, задачи)
  🚨 Алерты (критические события)
  💾 Системные ресурсы (CPU, память)

Пороги алертов:
  🔴 CRITICAL: >85% памяти, >100 ошибок
  🟡 WARNING: >70% памяти, >50 ошибок
  ℹ️ INFO: Информационные сообщения
  `);
} else {
  // Обработка сигналов завершения
  process.on('SIGINT', () => monitor.stop());
  process.on('SIGTERM', () => monitor.stop());

  monitor.start();
}

module.exports = BotMonitor;



#!/usr/bin/env node

// Скрипт для запуска оптимизированного бота с PM2
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class OptimizedBotLauncher {
  constructor() {
    this.pm2Config = {
      name: 'bazaarguru-optimized',
      script: path.join(__dirname, 'bazaarguru-optimized-bot.js'),
      instances: 'max', // Автоматически определяет количество CPU
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3000,
        REDIS_URL: process.env.REDIS_URL || 'redis://127.0.0.1:6379'
      },
      error_log: path.join(__dirname, '../logs/pm2-error.log'),
      out_log: path.join(__dirname, '../logs/pm2-out.log'),
      log_log: path.join(__dirname, '../logs/pm2-combined.log'),
      merge_logs: true,
      time: true,
      watch: false,
      max_memory_restart: '500M',
      restart_delay: 1000,
      max_restarts: 10,
      min_uptime: '10s'
    };
  }

  // Создание директории для логов
  createLogDirectory() {
    const logDir = path.join(__dirname, '../logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
      console.log('📁 Created logs directory');
    }
  }

  // Проверка наличия зависимостей
  async checkDependencies() {
    const requiredDeps = [
      'express',
      'redis',
      'bull',
      'express-rate-limit',
      'compression',
      'helmet',
      'cors'
    ];

    const missingDeps = [];

    for (const dep of requiredDeps) {
      try {
        require.resolve(dep);
      } catch (error) {
        missingDeps.push(dep);
      }
    }

    if (missingDeps.length > 0) {
      console.log('📦 Installing missing dependencies...');
      await this.installDependencies(missingDeps);
    } else {
      console.log('✅ All dependencies are installed');
    }
  }

  // Установка зависимостей
  installDependencies(deps) {
    return new Promise((resolve, reject) => {
      const npm = spawn('npm', ['install', ...deps], {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      });

      npm.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Dependencies installed successfully');
          resolve();
        } else {
          reject(new Error(`Failed to install dependencies (exit code: ${code})`));
        }
      });

      npm.on('error', reject);
    });
  }

  // Проверка наличия PM2
  checkPM2() {
    return new Promise((resolve) => {
      const pm2 = spawn('pm2', ['--version'], {
        stdio: 'pipe'
      });

      pm2.on('close', (code) => {
        resolve(code === 0);
      });

      pm2.on('error', () => {
        resolve(false);
      });
    });
  }

  // Установка PM2
  installPM2() {
    console.log('📦 Installing PM2...');
    return new Promise((resolve, reject) => {
      const npm = spawn('npm', ['install', '-g', 'pm2'], {
        stdio: 'inherit'
      });

      npm.on('close', (code) => {
        if (code === 0) {
          console.log('✅ PM2 installed successfully');
          resolve();
        } else {
          reject(new Error('Failed to install PM2'));
        }
      });

      npm.on('error', reject);
    });
  }

  // Запуск бота с PM2
  async startBot() {
    console.log('🚀 Starting BazaarGuru Optimized Bot with PM2...');

    const pm2 = spawn('pm2', ['start', this.pm2Config.script, '--name', this.pm2Config.name], {
      stdio: 'inherit'
    });

    return new Promise((resolve, reject) => {
      pm2.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Bot started successfully');
          console.log('\n📊 PM2 Commands:');
          console.log('  pm2 list                    # Show all processes');
          console.log('  pm2 monit                   # Monitor processes');
          console.log('  pm2 logs bazaarguru-optimized  # Show logs');
          console.log('  pm2 stop bazaarguru-optimized   # Stop bot');
          console.log('  pm2 restart bazaarguru-optimized # Restart bot');
          console.log('  pm2 delete bazaarguru-optimized  # Delete process');
          resolve();
        } else {
          reject(new Error(`Failed to start bot (exit code: ${code})`));
        }
      });

      pm2.on('error', reject);
    });
  }

  // Настройка webhook
  async setupWebhook() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const webhookUrl = process.env.WEBHOOK_URL || `https://yourdomain.com/webhook`;

    if (!token) {
      console.warn('⚠️  TELEGRAM_BOT_TOKEN not found. Skipping webhook setup.');
      return;
    }

    console.log('🔗 Setting up webhook...');

    try {
      const https = require('https');
      const url = `https://api.telegram.org/bot${token}/setWebhook?url=${webhookUrl}`;

      await new Promise((resolve, reject) => {
        https.get(url, (res) => {
          let data = '';
          res.on('data', (chunk) => data += chunk);
          res.on('end', () => {
            try {
              const result = JSON.parse(data);
              if (result.ok) {
                console.log('✅ Webhook set successfully');
                resolve();
              } else {
                reject(new Error(result.description));
              }
            } catch (error) {
              reject(error);
            }
          });
        }).on('error', reject);
      });
    } catch (error) {
      console.error('❌ Failed to set webhook:', error.message);
      console.log('ℹ️  You can set webhook manually later');
    }
  }

  // Основной метод запуска
  async launch() {
    try {
      console.log('🎯 Launching BazaarGuru Optimized Bot...\n');

      // Шаг 1: Создание директорий
      console.log('📁 Step 1: Creating directories...');
      this.createLogDirectory();

      // Шаг 2: Проверка зависимостей
      console.log('📦 Step 2: Checking dependencies...');
      await this.checkDependencies();

      // Шаг 3: Проверка PM2
      console.log('⚙️  Step 3: Checking PM2...');
      const hasPM2 = await this.checkPM2();
      if (!hasPM2) {
        await this.installPM2();
      } else {
        console.log('✅ PM2 is installed');
      }

      // Шаг 4: Настройка webhook
      console.log('🔗 Step 4: Setting up webhook...');
      await this.setupWebhook();

      // Шаг 5: Запуск бота
      console.log('🚀 Step 5: Starting bot...');
      await this.startBot();

      console.log('\n🎉 BazaarGuru Optimized Bot launched successfully!');
      console.log('\n📊 Monitoring:');
      console.log('  http://localhost:3000/health  - Health check');
      console.log('  http://localhost:3000/stats   - Bot statistics');
      console.log('  pm2 monit                     - PM2 monitoring');

    } catch (error) {
      console.error('❌ Failed to launch bot:', error.message);
      console.log('\n🔧 Troubleshooting:');
      console.log('1. Check if all environment variables are set');
      console.log('2. Make sure Redis is running (if using Redis)');
      console.log('3. Check firewall settings for webhook');
      console.log('4. Verify Telegram bot token is valid');

      process.exit(1);
    }
  }
}

// Запуск
if (require.main === module) {
  const launcher = new OptimizedBotLauncher();
  launcher.launch().catch(console.error);
}

module.exports = OptimizedBotLauncher;



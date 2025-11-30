#!/usr/bin/env node

// Скрипт настройки production окружения
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class ProductionSetup {
  constructor() {
    this.checks = {
      nodeVersion: false,
      npmVersion: false,
      redis: false,
      pm2: false,
      dependencies: false,
      envFile: false
    };
  }

  // Основной метод настройки
  async setup() {
    console.log('🚀 Настройка production окружения для BazaarGuru Bot\n');

    try {
      await this.runChecks();
      await this.installDependencies();
      await this.setupRedis();
      await this.setupPM2();
      await this.createEnvTemplate();
      await this.createDirectories();
      await this.generateConfig();

      console.log('\n✅ Production окружение настроено!');
      console.log('\n📋 Следующие шаги:');
      console.log('1. Настройте переменные окружения в .env файле');
      console.log('2. Запустите Redis: redis-server');
      console.log('3. Запустите бота: npm run start:optimized');

    } catch (error) {
      console.error('❌ Ошибка настройки:', error.message);
      process.exit(1);
    }
  }

  // Проверка системных требований
  async runChecks() {
    console.log('🔍 Проверка системных требований...\n');

    // Node.js version
    const nodeVersion = process.version;
    console.log(`Node.js: ${nodeVersion}`);
    this.checks.nodeVersion = true;

    // NPM version
    try {
      const npmVersion = await this.getCommandOutput('npm --version');
      console.log(`NPM: ${npmVersion.trim()}`);
      this.checks.npmVersion = true;
    } catch (error) {
      console.log('❌ NPM не установлен');
    }

    // Redis check
    try {
      await this.getCommandOutput('redis-cli ping');
      console.log('✅ Redis: Запущен');
      this.checks.redis = true;
    } catch (error) {
      console.log('⚠️  Redis: Не запущен (нужно установить и запустить)');
    }

    // PM2 check
    try {
      await this.getCommandOutput('pm2 --version');
      console.log('✅ PM2: Установлен');
      this.checks.pm2 = true;
    } catch (error) {
      console.log('⚠️  PM2: Не установлен (будет установлен автоматически)');
    }

    console.log('');
  }

  // Установка зависимостей
  async installDependencies() {
    console.log('📦 Установка зависимостей...');

    const dependencies = [
      'express',
      'redis',
      'bull',
      'express-rate-limit',
      'compression',
      'helmet',
      'cors',
      'pm2'
    ];

    try {
      await this.runCommand('npm install ' + dependencies.join(' '));
      console.log('✅ Зависимости установлены');
      this.checks.dependencies = true;
    } catch (error) {
      throw new Error('Не удалось установить зависимости');
    }
  }

  // Настройка Redis
  async setupRedis() {
    console.log('🗄️  Настройка Redis...');

    // Создание конфигурации Redis
    const redisConfig = `# Redis configuration for BazaarGuru Bot
bind 127.0.0.1
port 6379
timeout 0
tcp-keepalive 300
daemonize yes
supervised no
loglevel notice
logfile "./logs/redis.log"
databases 16
save 900 1
save 300 10
save 60 10000
stop-writes-on-bgsave-error no
rdbcompression yes
rdbchecksum yes
dbfilename dump.rdb
dir "./data/redis"
maxmemory 256mb
maxmemory-policy allkeys-lru
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec
no-appendfsync-on-rewrite no
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
lua-time-limit 5000
slowlog-log-slower-than 10000
slowlog-max-len 128
notify-keyspace-events ""
hash-max-ziplist-entries 512
hash-max-ziplist-value 64
list-max-ziplist-entries 512
list-max-ziplist-value 64
set-max-intset-entries 512
zset-max-ziplist-entries 128
zset-max-ziplist-value 64
hll-sparse-max-bytes 3000
activerehashing yes
client-output-buffer-limit normal 0 0 0
client-output-buffer-limit slave 256mb 64mb 60
client-output-buffer-limit pubsub 32mb 8mb 60
hz 10
aof-rewrite-incremental-fsync yes
`;

    const redisDir = path.join(__dirname, '../data/redis');
    if (!fs.existsSync(redisDir)) {
      fs.mkdirSync(redisDir, { recursive: true });
    }

    fs.writeFileSync(path.join(__dirname, '../redis.conf'), redisConfig);
    console.log('✅ Конфигурация Redis создана');
  }

  // Настройка PM2
  async setupPM2() {
    console.log('⚙️  Настройка PM2...');

    try {
      // Проверка PM2
      await this.getCommandOutput('pm2 --version');
      console.log('✅ PM2 уже установлен');
    } catch (error) {
      // Установка PM2
      await this.runCommand('npm install -g pm2');
      console.log('✅ PM2 установлен');
    }

    this.checks.pm2 = true;
  }

  // Создание шаблона .env файла
  createEnvTemplate() {
    console.log('📝 Создание шаблона .env файла...');

    const envTemplate = `# Production Environment Configuration for BazaarGuru Bot

# ===========================================
# TELEGRAM BOT CONFIGURATION
# ===========================================
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here

# ===========================================
# SERVER CONFIGURATION
# ===========================================
PORT=3000
NODE_ENV=production

# ===========================================
# REDIS CONFIGURATION
# ===========================================
REDIS_URL=redis://127.0.0.1:6379
REDIS_PASSWORD=

# ===========================================
# WEBHOOK CONFIGURATION
# ===========================================
WEBHOOK_URL=https://yourdomain.com/webhook
WEBHOOK_SECRET=

# ===========================================
# EXTERNAL API KEYS
# ===========================================
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
ZOMATO_API_KEY=your_zomato_api_key
SWIGGY_API_KEY=your_swiggy_api_key
AMAZON_ACCESS_KEY=your_amazon_access_key
AMAZON_SECRET_KEY=your_amazon_secret_key
AMAZON_ASSOCIATE_TAG=bazaarguru-21
FLIPKART_AFFILIATE_ID=your_flipkart_affiliate_id
FLIPKART_AFFILIATE_TOKEN=your_flipkart_affiliate_token
MYNTRA_API_KEY=your_myntra_api_key

# ===========================================
# MONITORING & LOGGING
# ===========================================
LOG_LEVEL=info
ENABLE_METRICS=true
METRICS_PORT=9090

# ===========================================
# SECURITY
# ===========================================
JWT_SECRET=your_jwt_secret_here
API_RATE_LIMIT=100
MAX_REQUEST_SIZE=10mb

# ===========================================
# DATABASE (Optional)
# ===========================================
DATABASE_URL=postgresql://user:password@localhost:5432/bazaarguru
REDIS_CACHE_TTL=3600

# ===========================================
# AFFILIATE PROGRAMS
# ===========================================
AFFILIATE_AMAZON_TAG=your_amazon_tag
AFFILIATE_FLIPKART_ID=your_flipkart_id
AFFILIATE_MYNTRA_ID=your_myntra_id
AFFILIATE_ZOMATO_ID=your_zomato_id

# ===========================================
# EMAIL CONFIGURATION (Optional)
# ===========================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# ===========================================
# ANALYTICS (Optional)
# ===========================================
GOOGLE_ANALYTICS_ID=GA_MEASUREMENT_ID
MIXPANEL_TOKEN=your_mixpanel_token
`;

    const envPath = path.join(__dirname, '../.env.production');
    if (!fs.existsSync(envPath)) {
      fs.writeFileSync(envPath, envTemplate);
      console.log('✅ Шаблон .env.production создан');
      console.log('ℹ️  Скопируйте нужные переменные в ваш .env файл');
    } else {
      console.log('⚠️  Файл .env.production уже существует');
    }
  }

  // Создание необходимых директорий
  createDirectories() {
    console.log('📁 Создание директорий...');

    const directories = [
      'logs',
      'data',
      'data/redis',
      'data/cache',
      'data/uploads',
      'backups'
    ];

    directories.forEach(dir => {
      const dirPath = path.join(__dirname, '..', dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`✅ Создана директория: ${dir}`);
      }
    });
  }

  // Генерация конфигурационных файлов
  generateConfig() {
    console.log('⚙️  Генерация конфигурационных файлов...');

    // PM2 ecosystem файл
    const ecosystemPath = path.join(__dirname, '../ecosystem.config.js');
    if (!fs.existsSync(ecosystemPath)) {
      const ecosystemConfig = `module.exports = {
  apps: [{
    name: 'bazaarguru-optimized',
    script: './scripts/bazaarguru-optimized-bot.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      REDIS_URL: 'redis://127.0.0.1:6379'
    },
    error_log: './logs/pm2-error.log',
    out_log: './logs/pm2-out.log',
    log_log: './logs/pm2-combined.log',
    merge_logs: true,
    time: true,
    max_memory_restart: '500M',
    restart_delay: 1000
  }]
};`;
      fs.writeFileSync(ecosystemPath, ecosystemConfig);
      console.log('✅ Файл ecosystem.config.js создан');
    }

    // Nginx конфигурация
    const nginxConfig = `upstream bazaarguru_backend {
    server 127.0.0.1:3000;
    keepalive 32;
}

server {
    listen 80;
    server_name yourdomain.com;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Webhook endpoint
    location /webhook {
        proxy_pass http://bazaarguru_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # Health check
    location /health {
        proxy_pass http://bazaarguru_backend;
        access_log off;
    }

    # Stats
    location /stats {
        proxy_pass http://bazaarguru_backend;
        allow 127.0.0.1;
        deny all;
    }
}`;

    fs.writeFileSync(path.join(__dirname, '../nginx.conf'), nginxConfig);
    console.log('✅ Nginx конфигурация создана');
  }

  // Вспомогательные методы
  getCommandOutput(command) {
    return new Promise((resolve, reject) => {
      const [cmd, ...args] = command.split(' ');
      const child = spawn(cmd, args, { stdio: 'pipe' });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(stderr || `Command failed with code ${code}`));
        }
      });

      child.on('error', reject);
    });
  }

  runCommand(command) {
    return new Promise((resolve, reject) => {
      const [cmd, ...args] = command.split(' ');
      const child = spawn(cmd, args, {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with code ${code}`));
        }
      });

      child.on('error', reject);
    });
  }

  // Метод для быстрого запуска
  async quickStart() {
    console.log('🚀 Быстрый запуск BazaarGuru Bot...\n');

    try {
      // Проверка наличия .env файла
      const envPath = path.join(__dirname, '../.env');
      if (!fs.existsSync(envPath)) {
        console.log('❌ Файл .env не найден!');
        console.log('📝 Создайте .env файл на основе .env.production');
        return;
      }

      // Запуск Redis
      console.log('🗄️  Запуск Redis...');
      try {
        await this.runCommand('redis-server ./redis.conf');
        console.log('✅ Redis запущен');
      } catch (error) {
        console.log('⚠️  Redis не удалось запустить автоматически');
        console.log('ℹ️  Запустите Redis вручную: redis-server ./redis.conf');
      }

      // Небольшая пауза
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Запуск бота
      console.log('🤖 Запуск бота...');
      await this.runCommand('pm2 start ecosystem.config.js');

      console.log('\n🎉 BazaarGuru Bot запущен!');
      console.log('\n📊 Мониторинг:');
      console.log('  pm2 monit                    - Мониторинг процессов');
      console.log('  pm2 logs bazaarguru-optimized - Просмотр логов');
      console.log('  http://localhost:3000/health - Проверка здоровья');

    } catch (error) {
      console.error('❌ Ошибка быстрого запуска:', error.message);
    }
  }
}

// CLI интерфейс
const args = process.argv.slice(2);
const setup = new ProductionSetup();

if (args.includes('--quick-start') || args.includes('-q')) {
  setup.quickStart();
} else if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🛠️  BazaarGuru Production Setup

Использование:
  node scripts/setup-production.js           # Полная настройка
  node scripts/setup-production.js --quick-start  # Быстрый запуск
  node scripts/setup-production.js --help   # Справка

Команды:
  setup    - Полная настройка production окружения
  quick    - Быстрый запуск (требует предварительной настройки)
  help     - Показать эту справку
  `);
} else {
  setup.setup();
}

module.exports = ProductionSetup;



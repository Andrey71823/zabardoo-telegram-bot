// PM2 Ecosystem Configuration for BazaarGuru Optimized Bot
module.exports = {
  apps: [{
    name: 'bazaarguru-optimized',
    script: './scripts/bazaarguru-optimized-bot.js',
    instances: 'max', // Использовать все CPU cores
    exec_mode: 'cluster', // Cluster mode для масштабирования
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      REDIS_URL: 'redis://127.0.0.1:6379',
      TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN
    },
    error_log: './logs/pm2-error.log',
    out_log: './logs/pm2-out.log',
    log_log: './logs/pm2-combined.log',
    merge_logs: true,
    time: true,
    watch: false,
    max_memory_restart: '500M', // Перезапуск при 500MB
    restart_delay: 1000,
    max_restarts: 10,
    min_uptime: '10s',
    // Автоматический перезапуск при падении
    autorestart: true,
    // Настройки graceful shutdown
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,
    // Environment variables для production
    env_production: {
      NODE_ENV: 'production',
      PORT: process.env.PORT || 3000,
      REDIS_URL: process.env.REDIS_URL || 'redis://127.0.0.1:6379'
    }
  }],

  // Настройки развертывания
  deploy: {
    production: {
      user: 'node',
      host: 'your-server.com',
      ref: 'origin/master',
      repo: 'git@github.com:your-username/bazaarguru-bot.git',
      path: '/var/www/bazaarguru-bot',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};



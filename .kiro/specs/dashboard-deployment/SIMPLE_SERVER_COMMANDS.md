# 🚀 Простые Команды для Сервера

## Вы уже подключены к серверу! Просто копируйте и вставляйте команды:

### Шаг 1: Проверим что у нас есть
```bash
# Проверим Node.js
node --version

# Проверим PM2
pm2 --version

# Посмотрим что работает
pm2 status
```

### Шаг 2: Создадим папку для дашборда
```bash
# Создаем папку
sudo mkdir -p /opt/zabardoo-dashboard
sudo mkdir -p /opt/zabardoo-dashboard/logs

# Даем права
sudo chown -R $USER:$USER /opt/zabardoo-dashboard

# Переходим в папку
cd /opt/zabardoo-dashboard

# Проверим что мы в правильной папке
pwd
```

### Шаг 3: Создадим файлы дашборда
Сейчас я создам все файлы прямо на сервере. Просто копируйте команды:

```bash
# Создаем package.json
cat > package.json << 'EOF'
{
  "name": "zabardoo-dashboard",
  "version": "1.0.0",
  "description": "Zabardoo Dashboard Server",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "compression": "^1.7.4",
    "express-rate-limit": "^6.10.0"
  }
}
EOF

echo "✅ package.json создан"
```

```bash
# Создаем .env файл
cat > .env << 'EOF'
NODE_ENV=production
PORT=8080
ADMIN_TOKEN=zabardoo_admin_2024_secure
CORS_ALLOWED_ORIGINS=http://206.189.62.169:8080,https://206.189.62.169:8080
EOF

echo "✅ .env создан"
```

### Шаг 4: Установим зависимости
```bash
# Установим пакеты
npm install

echo "✅ Зависимости установлены"
```

### Шаг 5: Остановим старый процесс (если есть)
```bash
# Остановим старый дашборд если он есть
pm2 stop zabardoo-dashboard 2>/dev/null || echo "Старого процесса нет"
pm2 delete zabardoo-dashboard 2>/dev/null || echo "Нечего удалять"
```

### Шаг 6: Проверим что Telegram бот работает
```bash
# Посмотрим процессы
ps aux | grep telegram

# Проверим PM2
pm2 status
```

**ВАЖНО:** Убедитесь что ваш Telegram бот все еще работает!

### Шаг 7: Скажите мне результат
После выполнения команд выше, скажите мне:
1. Какая версия Node.js? (из команды `node --version`)
2. Работает ли Telegram бот? (из команды `pm2 status`)
3. Есть ли ошибки при установке пакетов?

Тогда я создам остальные файлы и запущу дашборд!

---

## 🔍 Если что-то пошло не так:

### Если нет Node.js:
```bash
# Установим Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Если нет PM2:
```bash
# Установим PM2
sudo npm install -g pm2
```

### Если ошибки с правами:
```bash
# Исправим права
sudo chown -R $USER:$USER /opt/zabardoo-dashboard
```

---

**Начните с Шага 1 и скажите мне результаты!** 🚀
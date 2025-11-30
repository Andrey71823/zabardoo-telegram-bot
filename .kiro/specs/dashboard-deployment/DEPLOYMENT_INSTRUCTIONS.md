# 🚀 Zabardoo Dashboard Deployment Instructions

## ⚠️ ВАЖНО: Создайте снапшот ПЕРЕД началом!

### Шаг 1: Создание Снапшота DigitalOcean (ОБЯЗАТЕЛЬНО!)
1. Зайдите в [DigitalOcean Dashboard](https://cloud.digitalocean.com)
2. Перейдите к дроплету `ubuntu-s-1vcpu-1gb-fra1-01`
3. Нажмите вкладку **"Snapshots"**
4. Нажмите **"Take Snapshot"**
5. Дождитесь завершения (обычно 2-5 минут)

### Шаг 2: Подготовка файлов
Все файлы уже подготовлены в папке `deployment/`:
- ✅ server.js (веб-сервер)
- ✅ public/ (все дашборды)
- ✅ package.json (зависимости)
- ✅ .env (настройки)
- ✅ ecosystem.config.js (PM2 конфигурация)

### Шаг 3: Создание архива
```powershell
# В папке deployment создайте архив
Compress-Archive -Path "server.js", "package.json", ".env", "ecosystem.config.js", "public" -DestinationPath "dashboard-deployment.zip"
```

### Шаг 4: Загрузка на сервер
```bash
# Загрузите архив на сервер
scp deployment/dashboard-deployment.zip root@206.189.62.169:/tmp/
```

### Шаг 5: Подключение к серверу
```bash
ssh root@206.189.62.169
```

### Шаг 6: Развертывание на сервере
```bash
# 1. Создание директории
sudo mkdir -p /opt/zabardoo-dashboard
sudo mkdir -p /opt/zabardoo-dashboard/logs
sudo chown -R $USER:$USER /opt/zabardoo-dashboard

# 2. Распаковка файлов
cd /opt/zabardoo-dashboard
unzip /tmp/dashboard-deployment.zip
rm /tmp/dashboard-deployment.zip

# 3. Установка зависимостей
npm install --production

# 4. Остановка старого процесса (если есть)
pm2 stop zabardoo-dashboard 2>/dev/null || true
pm2 delete zabardoo-dashboard 2>/dev/null || true

# 5. Запуск нового дашборда
pm2 start ecosystem.config.js
pm2 save

# 6. Проверка статуса
pm2 status
```

### Шаг 7: Проверка развертывания
Откройте в браузере:
- **Админ панель**: http://206.189.62.169:8080/admin
- **Health check**: http://206.189.62.169:8080/health
- **API метрики**: http://206.189.62.169:8080/api/dashboard/metrics

### Шаг 8: Проверка Telegram бота
```bash
# Убедитесь что бот все еще работает
ps aux | grep telegram
# или
pm2 status
```

## 🔧 Troubleshooting

### Если порт 8080 занят:
```bash
sudo lsof -i :8080
sudo kill -9 <PID>
```

### Если ошибки разрешений:
```bash
sudo chown -R $USER:$USER /opt/zabardoo-dashboard
chmod -R 755 /opt/zabardoo-dashboard
```

### Просмотр логов:
```bash
pm2 logs zabardoo-dashboard
# или
tail -f /opt/zabardoo-dashboard/logs/combined.log
```

## 🚨 Откат в случае проблем

### Быстрый откат:
```bash
pm2 stop zabardoo-dashboard
pm2 delete zabardoo-dashboard
```

### Полный откат через снапшот:
1. Зайдите в DigitalOcean Dashboard
2. Перейдите к дроплету
3. Нажмите "Snapshots"
4. Выберите созданный снапшот
5. Нажмите "Restore Droplet"

## ✅ Успешное развертывание

После успешного развертывания вы должны увидеть:
- ✅ Dashboard доступен: http://206.189.62.169:8080/admin
- ✅ Точно такой же дизайн как локально
- ✅ Все функции работают
- ✅ Telegram бот продолжает работать
- ✅ PM2 показывает процесс "online"

## 📱 Финальные URL
- **Главная**: http://206.189.62.169:8080/
- **Админ панель**: http://206.189.62.169:8080/admin
- **Unified Dashboard**: http://206.189.62.169:8080/admin/unified-dashboard.html
- **User Management**: http://206.189.62.169:8080/admin/user-management.html
- **Health Check**: http://206.189.62.169:8080/health

🎉 **Готово! Ваш дашборд развернут безопасно и работает точно как в локальной версии!**
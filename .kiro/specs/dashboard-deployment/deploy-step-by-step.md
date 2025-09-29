# 🚀 Пошаговое Развертывание Zabardoo Dashboard

## Шаг 1: Создание снапшота (ОБЯЗАТЕЛЬНО!)

1. Зайдите в https://cloud.digitalocean.com
2. Найдите дроплет `ubuntu-s-1vcpu-1gb-fra1-01` (IP: 206.189.62.169)
3. Нажмите на дроплет → вкладка **"Snapshots"**
4. Нажмите **"Take Snapshot"**
5. Введите имя: `before-dashboard-deploy-$(date +%Y%m%d)`
6. Дождитесь завершения (2-5 минут)

✅ **Снапшот создан - можно продолжать!**

---

## Шаг 2: Загрузка архива на сервер

Откройте терминал/командную строку и выполните:

```bash
# Загрузка архива на сервер
scp deployment/dashboard-deployment.zip root@206.189.62.169:/tmp/
```

**Ожидаемый результат:**
```
dashboard-deployment.zip    100%   90KB   1.2MB/s   00:00
```

---

## Шаг 3: Подключение к серверу

```bash
ssh root@206.189.62.169
```

**Вы должны увидеть приглашение сервера:**
```
root@ubuntu-s-1vcpu-1gb-fra1-01:~#
```

---

## Шаг 4: Проверка текущего состояния

Выполните на сервере:

```bash
# Проверка Telegram бота
echo "🤖 Checking Telegram bot..."
ps aux | grep telegram | grep -v grep
if [ $? -eq 0 ]; then
    echo "✅ Telegram bot is running"
else
    echo "⚠️  Telegram bot not found"
fi

# Проверка порта 8080
echo "🔍 Checking port 8080..."
netstat -tuln | grep :8080
if [ $? -eq 0 ]; then
    echo "⚠️  Port 8080 is in use"
else
    echo "✅ Port 8080 is available"
fi

# Проверка Node.js и PM2
echo "📦 Checking dependencies..."
echo "Node.js: $(node --version 2>/dev/null || echo 'not installed')"
echo "PM2: $(pm2 --version 2>/dev/null || echo 'not installed')"
```

---

## Шаг 5: Создание директории

```bash
# Создание директории для дашборда
sudo mkdir -p /opt/zabardoo-dashboard
sudo mkdir -p /opt/zabardoo-dashboard/logs
sudo chown -R $USER:$USER /opt/zabardoo-dashboard

echo "✅ Directory created: /opt/zabardoo-dashboard"
```

---

## Шаг 6: Распаковка файлов

```bash
# Переход в директорию и распаковка
cd /opt/zabardoo-dashboard
unzip -o /tmp/dashboard-deployment.zip
rm /tmp/dashboard-deployment.zip

# Проверка файлов
ls -la
echo "✅ Files extracted"
```

**Вы должны увидеть:**
```
-rw-r--r-- 1 root root   xxx .env
-rw-r--r-- 1 root root   xxx ecosystem.config.js
-rw-r--r-- 1 root root   xxx package.json
drwxr-xr-x 2 root root  xxxx public/
-rw-r--r-- 1 root root   xxx server.js
```

---

## Шаг 7: Установка зависимостей

```bash
# Установка npm пакетов
npm install --production

echo "✅ Dependencies installed"
```

---

## Шаг 8: Остановка старого процесса (если есть)

```bash
# Остановка существующего дашборда
pm2 stop zabardoo-dashboard 2>/dev/null || echo "No existing process"
pm2 delete zabardoo-dashboard 2>/dev/null || echo "No existing process to delete"

echo "✅ Old processes stopped"
```

---

## Шаг 9: Запуск нового дашборда

```bash
# Запуск через PM2
pm2 start ecosystem.config.js
pm2 save

echo "✅ Dashboard started"
```

---

## Шаг 10: Проверка статуса

```bash
# Проверка PM2 процессов
pm2 status

# Проверка логов
pm2 logs zabardoo-dashboard --lines 10
```

**Ожидаемый результат PM2:**
```
┌─────┬────────────────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┬──────────┬──────────┬──────────┐
│ id  │ name               │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │ status    │ cpu      │ mem      │ user     │ watching │
├─────┼────────────────────┼─────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┼──────────┼──────────┼──────────┼──────────┤
│ 0   │ zabardoo-dashboard │ default     │ 1.0.0   │ fork    │ 12345    │ 0s     │ 0    │ online    │ 0%       │ 25.0mb   │ root     │ disabled │
└─────┴────────────────────┴─────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┴──────────┴──────────┴──────────┴──────────┘
```

---

## Шаг 11: Тестирование endpoints

```bash
# Проверка health check
curl -f http://localhost:8080/health
echo ""

# Проверка админ панели
curl -f http://localhost:8080/admin
echo ""

# Проверка API
curl -f http://localhost:8080/api/dashboard/metrics
echo ""
```

---

## Шаг 12: Финальная проверка Telegram бота

```bash
# Убедитесь что бот все еще работает
echo "🤖 Final Telegram bot check..."
ps aux | grep telegram | grep -v grep
if [ $? -eq 0 ]; then
    echo "✅ Telegram bot is still running - SUCCESS!"
else
    echo "❌ WARNING: Telegram bot may have stopped!"
fi
```

---

## 🎉 Успешное развертывание!

Если все шаги прошли успешно, откройте в браузере:

### 📱 Основные URL:
- **Админ панель**: http://206.189.62.169:8080/admin
- **Unified Dashboard**: http://206.189.62.169:8080/admin/unified-dashboard.html
- **User Management**: http://206.189.62.169:8080/admin/user-management.html
- **Health Check**: http://206.189.62.169:8080/health

### 🔧 Полезные команды:
```bash
pm2 logs zabardoo-dashboard    # Просмотр логов
pm2 restart zabardoo-dashboard # Перезапуск
pm2 stop zabardoo-dashboard    # Остановка
pm2 monit                      # Мониторинг в реальном времени
```

---

## 🚨 В случае проблем:

### Быстрый откат:
```bash
pm2 stop zabardoo-dashboard
pm2 delete zabardoo-dashboard
```

### Полный откат через снапшот:
1. DigitalOcean Dashboard → Droplets
2. Найдите ваш дроплет → Snapshots
3. Выберите созданный снапшот → Restore

---

✅ **Ваш дашборд теперь работает с точно таким же дизайном как в локальной версии!**
# 🚀 Ручное Развертывание Дашбордов - Пошаговая Инструкция

## ⚠️ ВАЖНО: Сначала создай снапшот в DigitalOcean!

### Шаг 1: Создание снапшота (ОБЯЗАТЕЛЬНО!)
1. В DigitalOcean панели найди дроплет `ubuntu-s-1vcpu-1gb-fra1-01`
2. Перейди на вкладку **"Snapshots"**
3. Нажми **"Take Snapshot"**
4. Дождись завершения (2-5 минут)

### Шаг 2: Загрузка архива на сервер
Открой PowerShell в папке проекта и выполни:

```powershell
scp deployment\dashboard-deployment.zip root@206.189.62.169:/tmp/
```

### Шаг 3: Подключение к серверу
```powershell
ssh root@206.189.62.169
```

### Шаг 4: Выполнение команд на сервере
Скопируй и вставь команды по одной:

```bash
# Проверка текущего состояния
echo "🔍 Checking system status..."
node --version
pm2 --version || npm install -g pm2
ps aux | grep telegram | head -3

# Создание директории
sudo mkdir -p /opt/bazaarGuru-dashboard/logs
sudo chown -R $USER:$USER /opt/bazaarGuru-dashboard
cd /opt/bazaarGuru-dashboard

# Распаковка файлов
unzip -o /tmp/dashboard-deployment.zip
rm /tmp/dashboard-deployment.zip
ls -la

# Установка зависимостей
npm install --production

# Остановка старого процесса
pm2 stop bazaarGuru-dashboard 2>/dev/null || echo "No existing process"
pm2 delete bazaarGuru-dashboard 2>/dev/null || echo "No existing process to delete"

# Запуск нового процесса
pm2 start ecosystem.config.js
pm2 save
pm2 status

# Проверка работы
sleep 3
curl http://localhost:8080/health
curl http://localhost:8080/admin

# Финальная проверка Telegram бота
ps aux | grep telegram | head -3
```

### Шаг 5: Проверка результата
Открой в браузере:
- **http://206.189.62.169:8080/admin** - должен выглядеть точно как локально

### Шаг 6: Если что-то пошло не так
```bash
# Остановка дашборда
pm2 stop bazaarGuru-dashboard
pm2 delete bazaarGuru-dashboard

# Или полный откат через снапшот в DigitalOcean панели
```

## 🎯 Ожидаемый результат:
- ✅ Dashboard работает: http://206.189.62.169:8080/admin
- ✅ Дизайн точно такой же как локально
- ✅ Telegram бот продолжает работать
- ✅ PM2 показывает процесс "online"

## 📱 Все URL после развертывания:
- **Admin Panel**: http://206.189.62.169:8080/admin
- **Unified Dashboard**: http://206.189.62.169:8080/admin/unified-dashboard.html
- **User Management**: http://206.189.62.169:8080/admin/user-management.html
- **Health Check**: http://206.189.62.169:8080/health
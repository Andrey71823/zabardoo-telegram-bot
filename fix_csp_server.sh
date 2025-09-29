#!/bin/bash

# Скрипт для автоматического исправления CSP в server.js на сервере

echo "🔧 Исправление CSP в server.js..."

# Остановить dashboard
echo "⏹️ Остановка dashboard..."
pm2 stop dashboard

# Создать backup
echo "💾 Создание backup..."
cp ~/bazaarGuru-dashboard/server.js ~/bazaarGuru-dashboard/server.js.backup.$(date +%Y%m%d_%H%M%S)

# Исправить CSP - заменить весь блок contentSecurityPolicy на false
echo "🛠️ Исправление CSP настроек..."
sed -i '/contentSecurityPolicy: {/,/},/c\
  contentSecurityPolicy: false,' ~/bazaarGuru-dashboard/server.js

# Перезапустить dashboard
echo "🚀 Перезапуск dashboard..."
pm2 start ~/bazaarGuru-dashboard/server.js --name dashboard

# Проверить статус
echo "✅ Проверка статуса..."
pm2 status dashboard

echo "🎉 Готово! Проверьте дашборд в браузере:"
echo "   http://206.189.62.159:8080/admin"
echo ""
echo "📋 Если что-то пошло не так, восстановите backup:"
echo "   pm2 stop dashboard"
echo "   cp ~/bazaarGuru-dashboard/server.js.backup.* ~/bazaarGuru-dashboard/server.js"
echo "   pm2 start ~/bazaarGuru-dashboard/server.js --name dashboard"
#!/bin/bash

# 🚀 bazaarGuru Dashboard Auto-Deploy Script
# Безопасное развертывание дашбордов на DigitalOcean сервер

set -e  # Остановка при любой ошибке

SERVER_IP="206.189.62.169"
SERVER_USER="root"
DEPLOY_DIR="/opt/bazaarGuru-dashboard"
ARCHIVE_NAME="dashboard-deployment.zip"

echo "🚀 Starting bazaarGuru Dashboard Deployment..."
echo "📡 Server: $SERVER_IP"
echo "📁 Deploy Directory: $DEPLOY_DIR"
echo ""

# Проверка локального архива
if [ ! -f "deployment/$ARCHIVE_NAME" ]; then
    echo "❌ Error: deployment/$ARCHIVE_NAME not found!"
    echo "Please run: npm run create-deployment-package"
    exit 1
fi

echo "✅ Found deployment package: deployment/$ARCHIVE_NAME"

# 1. Загрузка архива на сервер
echo "📤 Uploading deployment package to server..."
scp "deployment/$ARCHIVE_NAME" "$SERVER_USER@$SERVER_IP:/tmp/"

if [ $? -eq 0 ]; then
    echo "✅ Upload successful"
else
    echo "❌ Upload failed"
    exit 1
fi

# 2. Выполнение развертывания на сервере
echo "🔧 Executing deployment on server..."
ssh "$SERVER_USER@$SERVER_IP" << 'ENDSSH'
set -e

echo "🔍 Checking current system status..."

# Проверка Telegram бота
if pgrep -f "telegram" > /dev/null; then
    echo "✅ Telegram bot is running"
else
    echo "⚠️  Warning: Telegram bot not detected"
fi

# Проверка Node.js
if command -v node > /dev/null; then
    echo "✅ Node.js: $(node --version)"
else
    echo "❌ Node.js not found"
    exit 1
fi

# Проверка PM2
if command -v pm2 > /dev/null; then
    echo "✅ PM2: $(pm2 --version)"
else
    echo "❌ PM2 not found"
    exit 1
fi

echo ""
echo "🏗️  Setting up deployment directory..."

# Создание директории
sudo mkdir -p /opt/bazaarGuru-dashboard/logs
sudo chown -R $USER:$USER /opt/bazaarGuru-dashboard

# Переход в директорию
cd /opt/bazaarGuru-dashboard

echo "📦 Extracting deployment package..."
unzip -o /tmp/dashboard-deployment.zip
rm /tmp/dashboard-deployment.zip

echo "📋 Installing dependencies..."
npm install --production --silent

echo "🔄 Managing PM2 processes..."
# Остановка старого процесса
pm2 stop bazaarGuru-dashboard 2>/dev/null || echo "No existing process to stop"
pm2 delete bazaarGuru-dashboard 2>/dev/null || echo "No existing process to delete"

echo "🚀 Starting new dashboard process..."
pm2 start ecosystem.config.js
pm2 save

echo "✅ Dashboard deployment completed!"

# Проверка статуса
echo ""
echo "📊 Process Status:"
pm2 status

echo ""
echo "🔍 Health Check:"
sleep 3
curl -f http://localhost:8080/health || echo "Health check failed"

echo ""
echo "🤖 Final Telegram Bot Check:"
if pgrep -f "telegram" > /dev/null; then
    echo "✅ Telegram bot is still running - SUCCESS!"
else
    echo "⚠️  Warning: Telegram bot may have stopped!"
fi

ENDSSH

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 DEPLOYMENT SUCCESSFUL!"
    echo ""
    echo "📱 Your dashboard is now available at:"
    echo "   http://$SERVER_IP:8080/admin"
    echo ""
    echo "🔗 All dashboard URLs:"
    echo "   • Admin Panel: http://$SERVER_IP:8080/admin"
    echo "   • Unified Dashboard: http://$SERVER_IP:8080/admin/unified-dashboard.html"
    echo "   • User Management: http://$SERVER_IP:8080/admin/user-management.html"
    echo "   • Health Check: http://$SERVER_IP:8080/health"
    echo ""
    echo "✅ Deployment completed successfully!"
else
    echo ""
    echo "❌ DEPLOYMENT FAILED!"
    echo "Please check the error messages above."
    exit 1
fi
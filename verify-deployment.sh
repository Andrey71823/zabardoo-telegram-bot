#!/bin/bash

# 🔍 BazaarGuru Dashboard Deployment Verification Script

SERVER_IP="206.189.62.169"
SERVER_USER="root"

echo "🔍 Verifying BazaarGuru Dashboard Deployment..."
echo "📡 Server: $SERVER_IP"
echo ""

# Функция для проверки URL
check_url() {
    local url=$1
    local name=$2
    
    echo -n "Checking $name... "
    if curl -f -s "$url" > /dev/null; then
        echo "✅ OK"
        return 0
    else
        echo "❌ FAILED"
        return 1
    fi
}

# Проверка основных URL
echo "🌐 Testing Dashboard URLs:"
check_url "http://$SERVER_IP:8080/health" "Health Check"
check_url "http://$SERVER_IP:8080/" "Main Page"
check_url "http://$SERVER_IP:8080/admin" "Admin Panel"
check_url "http://$SERVER_IP:8080/admin/unified-dashboard.html" "Unified Dashboard"
check_url "http://$SERVER_IP:8080/admin/user-management.html" "User Management"
check_url "http://$SERVER_IP:8080/api/dashboard/metrics" "API Metrics"
check_url "http://$SERVER_IP:8080/monitoring/status" "Monitoring Status"

echo ""

# Проверка статуса на сервере
echo "🔧 Checking Server Status:"
ssh "$SERVER_USER@$SERVER_IP" << 'ENDSSH'

echo "📊 PM2 Process Status:"
pm2 status

echo ""
echo "🤖 Telegram Bot Status:"
if pgrep -f "telegram" > /dev/null; then
    echo "✅ Telegram bot is running"
    ps aux | grep telegram | grep -v grep | head -3
else
    echo "⚠️  Telegram bot not detected"
fi

echo ""
echo "🔍 Dashboard Process Details:"
pm2 show bazaarguru-dashboard 2>/dev/null || echo "Dashboard process not found"

echo ""
echo "📝 Recent Dashboard Logs:"
pm2 logs bazaarguru-dashboard --lines 5 2>/dev/null || echo "No logs available"

echo ""
echo "🌐 Port 8080 Status:"
netstat -tuln | grep :8080 || echo "Port 8080 not listening"

ENDSSH

echo ""
echo "🎯 Deployment Verification Complete!"
echo ""
echo "📱 If all checks passed, your dashboard is ready at:"
echo "   http://$SERVER_IP:8080/admin"
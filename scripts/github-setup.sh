#!/bin/bash

# GitHub Setup Script for bazaarGuru Telegram Bot

echo "🚀 Настройка GitHub репозитория для bazaarGuru Telegram Bot"

# Проверяем, установлен ли git
if ! command -v git &> /dev/null; then
    echo "❌ Git не установлен. Установите Git и попробуйте снова."
    exit 1
fi

# Инициализируем git репозиторий
echo "📁 Инициализация Git репозитория..."
git init

# Добавляем все файлы
echo "📝 Добавление файлов в репозиторий..."
git add .

# Создаем первый коммит
echo "💾 Создание первого коммита..."
git commit -m "Initial commit: bazaarGuru Telegram Bot with AI features

Features:
- Telegram Bot with menu system
- AI Assistant with OpenAI integration
- Coupon recommendation system
- User management and analytics
- Admin dashboard
- Security and monitoring
- Database migrations
- Comprehensive testing suite
- Docker support
- DigitalOcean deployment ready"

# Устанавливаем основную ветку
echo "🌿 Установка основной ветки..."
git branch -M main

# Добавляем remote origin
echo "🔗 Добавление remote origin..."
echo "Введите URL вашего GitHub репозитория (например: https://github.com/Andrey7823/bazaarGuru-telegram-bot.git):"
read REPO_URL

if [ -z "$REPO_URL" ]; then
    echo "❌ URL репозитория не может быть пустым"
    exit 1
fi

git remote add origin $REPO_URL

# Пушим в GitHub
echo "⬆️ Отправка кода в GitHub..."
git push -u origin main

echo "✅ Репозиторий успешно создан и код отправлен в GitHub!"
echo ""
echo "🔗 Ваш репозиторий: $REPO_URL"
echo ""
echo "📋 Следующие шаги:"
echo "1. Перейдите в DigitalOcean App Platform"
echo "2. Создайте новое приложение"
echo "3. Подключите ваш GitHub репозиторий"
echo "4. Настройте переменные окружения"
echo "5. Деплойте приложение"
echo ""
echo "📖 Подробная инструкция в файле DIGITALOCEAN_DEPLOY.md"
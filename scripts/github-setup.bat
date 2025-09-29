@echo off
echo 🚀 Настройка GitHub репозитория для bazaarGuru Telegram Bot

REM Проверяем, установлен ли git
git --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Git не установлен. Установите Git и попробуйте снова.
    pause
    exit /b 1
)

REM Инициализируем git репозиторий
echo 📁 Инициализация Git репозитория...
git init

REM Добавляем все файлы
echo 📝 Добавление файлов в репозиторий...
git add .

REM Создаем первый коммит
echo 💾 Создание первого коммита...
git commit -m "Initial commit: bazaarGuru Telegram Bot with AI features"

REM Устанавливаем основную ветку
echo 🌿 Установка основной ветки...
git branch -M main

REM Добавляем remote origin
echo 🔗 Добавление remote origin...
set /p REPO_URL="Введите URL вашего GitHub репозитория: "

if "%REPO_URL%"=="" (
    echo ❌ URL репозитория не может быть пустым
    pause
    exit /b 1
)

git remote add origin %REPO_URL%

REM Пушим в GitHub
echo ⬆️ Отправка кода в GitHub...
git push -u origin main

echo ✅ Репозиторий успешно создан и код отправлен в GitHub!
echo.
echo 🔗 Ваш репозиторий: %REPO_URL%
echo.
echo 📋 Следующие шаги:
echo 1. Перейдите в DigitalOcean App Platform
echo 2. Создайте новое приложение
echo 3. Подключите ваш GitHub репозиторий
echo 4. Настройте переменные окружения
echo 5. Деплойте приложение
echo.
echo 📖 Подробная инструкция в файле DIGITALOCEAN_DEPLOY.md
pause
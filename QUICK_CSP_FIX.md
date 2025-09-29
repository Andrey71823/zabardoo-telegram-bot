# Быстрое исправление CSP - одной командой

## Вариант 1: Автоматический скрипт
```bash
# Скопировать и выполнить эту команду на сервере:
curl -s https://raw.githubusercontent.com/your-repo/fix_csp_server.sh | bash
```

## Вариант 2: Ручные команды (копировать и вставить все сразу)
```bash
# Остановить dashboard
pm2 stop dashboard

# Создать backup
cp ~/bazaarGuru-dashboard/server.js ~/bazaarGuru-dashboard/server.js.backup

# Исправить CSP одной командой
sed -i '/contentSecurityPolicy: {/,/},/c\  contentSecurityPolicy: false,' ~/bazaarGuru-dashboard/server.js

# Перезапустить
pm2 start ~/bazaarGuru-dashboard/server.js --name dashboard

# Проверить
pm2 status dashboard
```

## Вариант 3: Если sed не работает - используйте nano
```bash
pm2 stop dashboard
nano ~/bazaarGuru-dashboard/server.js
```

В nano найдите строки:
```javascript
contentSecurityPolicy: {
  useDefaults: true,
  directives: {
    // ... много строк ...
  }
},
```

Замените весь этот блок на:
```javascript
contentSecurityPolicy: false,
```

Сохраните (Ctrl+X, Y, Enter) и перезапустите:
```bash
pm2 start ~/bazaarGuru-dashboard/server.js --name dashboard
```

## Проверка результата
После исправления откройте в браузере:
- http://206.189.62.159:8080/admin
- Нажмите F12 → Console
- Обновите страницу
- Убедитесь что нет ошибок "Refused to execute inline script"
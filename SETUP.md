# Настройка BFF и API защиты

## 🚀 Быстрая настройка

### 1. Создайте .env файл
```bash
cp env.example .env
```

### 2. Сгенерируйте API ключ
```bash
npm run generate-api-key
```

### 3. Добавьте API ключ в .env
Скопируйте сгенерированный ключ в `.env` файл:
```env
API_SECRET_KEY=your_generated_key_here
VITE_API_SECRET_KEY=your_generated_key_here
```

### 4. Настройте Outline Wiki
Получите API ключ из Outline Wiki и добавьте:
```env
OUTLINE_BASE_URL=https://wiki.loov.ru
OUTLINE_API_KEY=your_outline_api_key_here
```

### 5. Настройте CORS
Добавьте разрешенные домены:
```env
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,https://your-domain.com
```

### 6. Запустите сервер
```bash
npm run server:dev
```

### 7. Протестируйте API
```bash
npm run test-api
```

## 🔒 Безопасность

### API Авторизация
- Все API endpoints защищены секретным ключом
- Ключ передается в заголовке: `Authorization: Bearer your_key`
- Без ключа запросы отклоняются с кодом 401

### CORS Защита
- Сервер проверяет origin всех запросов
- Разрешены только домены из `ALLOWED_ORIGINS`
- Запросы с неразрешенных доменов блокируются

### Логирование
- Все API запросы логируются
- Отображается статус авторизации
- Блокированные запросы помечаются 🚫

## 📊 API Endpoints

### Outline Wiki (через BFF)
- `GET /api/outline/documents` - Документы
- `GET /api/outline/documents/:id` - Документ
- `POST /api/outline/search` - Поиск
- `GET /api/outline/documents/:id/content` - Содержимое
- `POST /api/outline/attachments/redirect` - Вложения

### Системные
- `GET /health` - Проверка состояния
- `GET /api/version` - Информация о версии

## 🧪 Тестирование

### Автоматические тесты
```bash
npm run test-api
```

### Ручное тестирование
```bash
# Health check
curl http://localhost:3000/health

# API с авторизацией
curl -H "Authorization: Bearer your_key" \
     -H "Origin: http://localhost:3000" \
     http://localhost:3000/api/outline/documents

# Тест вложений
curl -H "Authorization: Bearer your_key" \
     -H "Content-Type: application/json" \
     -X POST \
     -d '{"id": "your-attachment-id"}' \
     http://localhost:3000/api/outline/attachments/redirect

# Тест CORS защиты
curl -H "Origin: http://malicious-site.com" \
     http://localhost:3000/api/outline/documents
```
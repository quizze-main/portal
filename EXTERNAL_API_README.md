# External API Documentation

Внешний API для отправки сообщений сотрудникам через Telegram.

## Настройка

### Переменные окружения

Добавьте в ваш `.env` файл:

```env
# External API
EXTERNAL_API_KEY=your_secure_api_key_here

# Frappe ERP (уже должно быть настроено)
FRAPPE_BASE_URL=http://localhost:8000
FRAPPE_API_KEY=your_api_key_here
FRAPPE_API_SECRET=your_api_secret_here

# Telegram Bot (уже должно быть настроено)
TELEGRAM_BOT_TOKEN=your_bot_token_here
```

## API Endpoints

### Отправка сообщения сотруднику

**POST** `/api/external/send-message`

Отправляет сообщение конкретному сотруднику через Telegram.

#### Заголовки

- `Content-Type: application/json`
- `X-API-Key: your_api_key` или `Authorization: Bearer your_api_key`

#### Тело запроса

```json
{
  "employee_id": "EMP001",
  "message": "Привет! Это тестовое сообщение."
}
```

#### Параметры

| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `employee_id` | string | ✅ | ID сотрудника в Frappe |
| `message` | string | ✅ | Текст сообщения для отправки |

#### Ответы

**Успешная отправка (200):**
```json
{
  "success": true,
  "message": "Message sent successfully",
  "employee_name": "Иван Иванов",
  "chat_id": "123456789"
}
```

**Ошибка - сотрудник не найден (404):**
```json
{
  "error": "Employee not found"
}
```

**Ошибка - chat_id не установлен (400):**
```json
{
  "error": "Employee chat_id not set",
  "employee_name": "Иван Иванов",
  "employee_id": "EMP001"
}
```

**Ошибка - неверный API ключ (401):**
```json
{
  "error": "Invalid API key"
}
```

**Ошибка - отсутствуют обязательные параметры (400):**
```json
{
  "error": "employee_id is required"
}
```

## Примеры использования

### cURL

```bash
# Отправка сообщения
curl -X POST http://localhost:3000/api/external/send-message \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{
    "employee_id": "EMP001",
    "message": "Привет! Это тестовое сообщение."
  }'
```

### JavaScript/Node.js

```javascript
const response = await fetch('http://localhost:3000/api/external/send-message', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your_api_key'
  },
  body: JSON.stringify({
    employee_id: 'EMP001',
    message: 'Привет! Это тестовое сообщение.'
  })
});

const data = await response.json();
console.log(data);
```

### Python

```python
import requests

response = requests.post(
    'http://localhost:3000/api/external/send-message',
    headers={
        'Content-Type': 'application/json',
        'X-API-Key': 'your_api_key'
    },
    json={
        'employee_id': 'EMP001',
        'message': 'Привет! Это тестовое сообщение.'
    }
)

print(response.json())
```

## Тестирование

### Swagger UI

Для удобного тестирования API доступен Swagger UI:

```
http://localhost:3000/api-docs
```

Swagger UI позволяет:
- Просматривать все доступные API эндпоинты
- Тестировать запросы прямо из браузера
- Автоматически добавлять заголовки авторизации
- Видеть примеры запросов и ответов



## Безопасность

- API защищен ключом `EXTERNAL_API_KEY`
- Ключ передается в заголовке `X-API-Key` или `Authorization: Bearer`
- Все запросы логируются с детальной информацией
- Ошибки не раскрывают внутреннюю структуру системы

## Логирование

Все запросы к внешнему API логируются с информацией:
- employee_id
- employee_name (если найден)
- chat_id (если установлен)
- длина сообщения
- статус отправки

## Требования

Для работы API необходимо:
1. Настроенный Frappe ERP с API ключами
2. Настроенный Telegram бот с токеном
3. У сотрудников должен быть установлен `custom_tg_chat_id` в Frappe 
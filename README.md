# Staff Focus App

Мобильное веб-приложение для сотрудников Loov с интеграцией Frappe ERP и Outline Wiki.

## Vendored dashboard (loovis-sandbox) via git subtree

Исходный репозиторий `LoovTeam/loovis-sandbox` подключён в этот проект как **git subtree** в папку `_vendor/loovis-sandbox`.
Так можно быстро подтягивать апдейты из оригинала обычным коммитом (без submodules).

- **Обновить subtree** (подтянуть свежий `main`):

```bash
git fetch loovis-sandbox main
git subtree pull --prefix=_vendor/loovis-sandbox loovis-sandbox main --squash
```

## 🌙 Темная тема

Приложение поддерживает автоматическое переключение между светлой и темной темами.

### Как использовать:
1. Откройте страницу "Профиль" через нижнюю навигацию
2. В правом верхнем углу найдите переключатель темы
3. Нажмите на переключатель для смены темы
4. Выбранная тема сохраняется автоматически

### Технические детали:
- Использует встроенную поддержку Tailwind CSS (`dark:` utilities)
- Интегрирован с `next-themes` для управления состоянием
- Автоматическое сохранение в localStorage
- Плавные переходы между темами
- Поддержка всех компонентов UI

### Демонстрация:
На странице профиля добавлена демонстрационная карточка, показывающая адаптацию цветов и текста под выбранную тему.

## 🚀 Быстрый старт

### 1. Установка зависимостей
```bash
npm install
```

### 2. Настройка переменных окружения
```bash
cp env.example .env
```

### 3. Генерация API ключа
```bash
npm run generate-api-key
```

Скопируйте сгенерированный ключ в `.env` файл:
```env
API_SECRET_KEY=your_generated_key_here
VITE_API_SECRET_KEY=your_generated_key_here
```

### 4. Настройка Outline Wiki
Получите API ключ из Outline Wiki и добавьте в `.env`:
```env
OUTLINE_BASE_URL=https://wiki.loov.ru
OUTLINE_API_KEY=your_outline_api_key_here
```

### 5. Настройка CORS
Добавьте разрешенные домены в `.env`:
```env
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,https://your-domain.com
```

### 6. Запуск в режиме разработки
```bash
npm run dev
```

### 7. Запуск сервера
```bash
npm run server:dev
```

## 🔧 Конфигурация

### Переменные окружения

#### Frappe ERP
- `FRAPPE_BASE_URL` - URL сервера Frappe
- `FRAPPE_API_KEY` - API ключ Frappe
- `FRAPPE_API_SECRET` - API секрет Frappe

#### Outline Wiki
- `OUTLINE_BASE_URL` - URL сервера Outline Wiki
- `OUTLINE_API_KEY` - API ключ Outline Wiki

#### API Security
- `API_SECRET_KEY` - Секретный ключ для защиты API (генерируется автоматически)
- `ALLOWED_ORIGINS` - Список разрешенных доменов для CORS

#### Frontend
- `VITE_API_BASE_URL` - URL API сервера
- `VITE_API_SECRET_KEY` - Секретный ключ для фронтенда

#### Telegram Bot
- `TELEGRAM_BOT_TOKEN` - Токен Telegram бота
- `LOOV_IS_STAFF_PORTAL_URL` - URL портала для меню бота

## 🏗️ Архитектура

### BFF (Backend for Frontend)
Приложение использует BFF паттерн для:
- Проксирования запросов к Outline Wiki API
- Защиты от CORS проблем
- Централизованной авторизации
- Логирования и мониторинга

### API Endpoints

#### Outline Wiki
- `GET /api/outline/collections` - Получение коллекций
- `GET /api/outline/documents` - Получение документов
- `GET /api/outline/documents/:id` - Получение документа
- `POST /api/outline/search` - Поиск документов
- `GET /api/outline/documents/:id/content` - Получение содержимого
- `GET /api/outline/collections/:id/documents` - Получение структуры коллекции с иерархией документов

#### Frappe ERP
- `GET /api/employee/:id` - Получение сотрудника
- `GET /api/tasks` - Получение задач
- `POST /api/tasks` - Создание задачи
- `PUT /api/tasks/:id` - Обновление задачи

## 🔒 Безопасность

### API Авторизация
Все API endpoints защищены секретным ключом, который передается в заголовке:
```
Authorization: Bearer your_api_secret_key
```

### CORS Защита
Сервер проверяет origin запросов и разрешает только указанные в `ALLOWED_ORIGINS`.

### Логирование
Все API запросы логируются с указанием статуса авторизации.

## 📱 Функциональность

### Дашборд
- Обзор задач и активности
- Быстрые действия

### Стандарты
- Просмотр стандартов компании
- Отслеживание выполнения

### База знаний
- Поиск по документам Outline Wiki
- Просмотр коллекций с иерархической структурой
- Детальный просмотр документов
- Автоматическая фильтрация скрытых документов (начинающихся с дефиса)

### Профиль
- Информация о сотруднике
- Настройки

## 🐳 Docker

### Локальная разработка
```bash
# Debug режим с поддержкой отладки Node.js
docker compose -f docker-compose.local.yml up --build
```

### Разработка
```bash
npm run docker:dev
```

### Продакшн
```bash
npm run docker:prod
```

## 📝 Скрипты

- `npm run dev` - Запуск в режиме разработки
- `npm run build` - Сборка для продакшна
- `npm run server:dev` - Запуск сервера
- `npm run generate-api-key` - Генерация API ключа
- `npm run test-api` - Тестирование API
- `npm run setup-webhook` - Настройка Telegram webhook

## 🔍 Отладка

### Логи сервера
Сервер выводит подробные логи:
- ✅ Успешные API запросы
- 🚫 Заблокированные CORS запросы
- 🔑 Статус авторизации
- 📚/📄 Операции с Outline Wiki

### Health Check
```bash
curl http://localhost:3000/health
```

## 🤝 Разработка

### Структура проекта
```
src/
├── components/     # React компоненты
├── pages/         # Страницы приложения
├── hooks/         # React хуки
├── lib/           # Клиенты API
├── contexts/      # React контексты
└── types/         # TypeScript типы
```

### Добавление новых API endpoints
1. Добавьте endpoint в `server.js`
2. Обновите клиент в `src/lib/`
3. Добавьте типы в `src/types/`
4. Создайте хук в `src/hooks/`


## 🏗️ Архитектура приложения

Приложение состоит из:
- **Frontend**: React + Vite + TypeScript
- **Backend**: Express.js сервер с API и Telegram Web App
- **Интеграция**: Frappe ERP API
- **Инфраструктура**: Docker

### Дополнительные API Endpoints

#### Telegram Bot
- `POST /api/telegram` - Webhook для Telegram
- `POST /api/telegram/set-webhook` - Установка webhook
- `GET /api/telegram/get-webhook` - Проверка webhook

#### Стандарты
- `GET /api/standards` - Получение стандартов
   
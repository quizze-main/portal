# 🚀 Скрипт миграции статей из Outline во Frappe Wiki

Этот скрипт позволяет мигрировать статьи из Outline в Frappe Wiki с автоматической обработкой изображений.

## ✨ Возможности

- 📄 Перенос статей из Outline в Frappe Wiki
- 🖼️ Автоматическая загрузка и замена изображений
- 🔍 Проверка существования статей (пропуск дубликатов)
- 📊 Подробная статистика процесса миграции
- 🐳 Запуск через Docker для изоляции
- ⚙️ Настройка через переменные окружения

## 🛠️ Установка и настройка

### 1. Подготовка переменных окружения

Скопируйте файл с примером настроек:
```bash
cp env.migrate.example .env.migrate
```

Отредактируйте `.env.migrate` и укажите ваши API ключи:
```bash
# Outline API настройки
OUTLINE_BASE_URL=https://outline.loov.ru
OUTLINE_API_KEY=your_outline_api_key_here

# Frappe API настройки  
FRAPPE_BASE_URL=https://loovtest.erpnext.com
FRAPPE_API_KEY=your_frappe_api_key_here
FRAPPE_API_SECRET=your_frappe_api_secret_here

# URL для миграции (один из вариантов):
# 1. Прямо в ENV через запятую:
MIGRATION_URLS=https://outline.loov.ru/doc/article1-ABC123,https://outline.loov.ru/doc/article2-DEF456

# 2. Или указать файл с URL:
# MIGRATION_URLS_FILE=migration-input/my-urls.txt
```

### 2. Создание файла с URL (если не используете ENV)

```bash
mkdir -p migration-input
echo "https://outline.loov.ru/doc/merchendajzing-s-uchetom-prioriteta-loov-hSBN3LQ9bq" > migration-input/urls.txt
```

## 🚀 Использование

### Простой запуск через npm

```bash
# Установка зависимостей
npm install

# Загрузка переменных окружения и запуск
npm run migrate
```

### Запуск через Docker

```bash
# Запуск с автоматической сборкой
npm run migrate:docker

# Или вручную
docker compose -f docker-compose.migrate.yml up --build
```

### Прямой запуск Node.js

```bash
# С загрузкой .env.migrate
export $(cat .env.migrate | xargs) && node scripts/migrate-outline-to-frappe.js
```

## 📝 Форматы входных данных

### Вариант 1: Переменная окружения MIGRATION_URLS

```bash
# В .env.migrate:
MIGRATION_URLS=https://outline.loov.ru/doc/article1-ABC123,https://outline.loov.ru/doc/article2-DEF456,https://outline.loov.ru/s/SHORT123
```

### Вариант 2: Файл с URL

Создайте текстовый файл `migration-input/urls.txt` (или другой через `MIGRATION_URLS_FILE`) с URL статей (по одному на строку):

```
https://outline.loov.ru/doc/merchendajzing-s-uchetom-prioriteta-loov-hSBN3LQ9bq
https://outline.loov.ru/doc/another-article-XYZ789
https://outline.loov.ru/s/SHORT123
```

### Поддерживаемые форматы URL

- Полный URL: `https://outline.loov.ru/doc/article-name-ABC123`
- Короткий URL: `https://outline.loov.ru/s/ABC123`

### Приоритет источников URL

1. **MIGRATION_URLS** (переменная окружения) - наивысший приоритет
2. **Файл** указанный в MIGRATION_URLS_FILE
3. **migration-input/urls.txt** (по умолчанию)

## 🔧 Принцип работы

1. **Извлечение ID документа** из URL Outline
2. **Получение метаданных** статьи (название, автор, etc.)
3. **Проверка существования** статьи с таким названием в Frappe
4. **Загрузка содержимого** статьи в формате Markdown
5. **Поиск изображений** в контенте (markdown и HTML форматы)
6. **Загрузка изображений** в Frappe Files
7. **Замена ссылок** на изображения в тексте статьи
8. **Создание статьи** в Frappe Wiki
9. **Отчёт о результатах** миграции

## 🖼️ Обработка изображений

Скрипт автоматически:
- Находит все изображения в статье (`![alt](url)` и `<img src="url">`)
- Скачивает их с оригинальных URL
- Загружает в Frappe как публичные файлы
- Заменяет в тексте на HTML теги с новыми URL
- Сохраняет оригинальные размеры (width/height) если они были указаны

Формат замены:
```html
<img src="https://loovtest.erpnext.com/private/files/image_123.jpg" alt="Описание" width="100" height="100"><br>
```

## 📊 Статистика и логирование

Скрипт выводит подробную информацию о процессе:
- ✅ Успешно мигрированные статьи
- ⚠️ Пропущенные статьи (уже существуют)
- ❌ Статьи с ошибками
- 🖼️ Количество обработанных изображений для каждой статьи

## 🐳 Docker конфигурация

### Структура файлов

- `scripts/Dockerfile.migrate` - Docker образ для скрипта
- `docker-compose.migrate.yml` - Docker Compose конфигурация
- `scripts/run-migration.sh` - Удобный скрипт для запуска

### Переменные окружения в Docker

Переменные автоматически передаются из `.env.migrate` файла в контейнер.

## ⚠️ Важные замечания

1. **Дубликаты**: Скрипт автоматически пропускает статьи с названиями, которые уже существуют в Frappe
2. **Ошибки изображений**: Если какое-то изображение не удаётся загрузить, скрипт продолжает работу с остальными
3. **API лимиты**: Между запросами есть пауза в 1 секунду для предотвращения перегрузки API
4. **Публичные файлы**: Все изображения загружаются как публичные файлы в Frappe

## 🔍 Устранение неполадок

### Ошибка "API key not configured"
Проверьте, что все переменные окружения правильно заданы в `.env.migrate`

### Ошибка "Document not found"
Убедитесь, что URL статьи корректный и документ доступен

### Ошибка загрузки изображений
Проверьте, что изображения доступны по исходным URL и что у Frappe есть права на загрузку файлов

### Ошибка создания статьи
Убедитесь, что у API ключа Frappe есть права на создание Wiki Article

## 🤝 Примеры использования

### Миграция одной статьи
```bash
./scripts/run-migration.sh --urls "https://outline.loov.ru/doc/merchendajzing-s-uchetom-prioriteta-loov-hSBN3LQ9bq"
```

### Массовая миграция
1. Создайте файл `migration-input/articles.txt`:
   ```
   https://outline.loov.ru/doc/article1-ABC123
   https://outline.loov.ru/doc/article2-DEF456
   https://outline.loov.ru/doc/article3-GHI789
   ```

2. Запустите миграцию:
   ```bash
   ./scripts/run-migration.sh --file articles.txt
   ```

### Интерактивный режим
```bash
./scripts/run-migration.sh --interactive
# Выберите опцию и следуйте инструкциям
```

## 📚 API Reference

### Outline API
- `POST /api/documents.info` - получение метаданных документа
- `POST /api/documents.export` - экспорт содержимого документа

### Frappe API  
- `GET /api/resource/Wiki Article` - проверка существования статей
- `POST /api/resource/Wiki Article` - создание новой статьи
- `POST /api/method/upload_file` - загрузка файлов 

# 📚 Миграция Wiki Pages из Outline во Frappe

Этот скрипт автоматически мигрирует Wiki Pages из Outline во Frappe ERPNext, включая **полную обработку аттачментов и изображений**.

## 🎯 Возможности

### ✅ Поддерживаемые элементы контента
- **📄 Текстовое содержимое** - полный Markdown с HTML тегами
- **🖼️ Изображения** - прямые ссылки на изображения в статьях
- **📎 Аттачменты-ссылки** - файлы, прикрепленные как ссылки `[filename](/api/outline/attachments.redirect?id=...)`
- **🖼️ Аттачменты-изображения** - изображения, прикрепленные как аттачменты `![alt](/api/outline/attachments.redirect?id=...)`
- **📋 Метаданные** - заголовок, маршрут, настройки публикации

### 🔄 Процесс обработки аттачментов

1. **Извлечение**: Скрипт автоматически находит все аттачменты в контенте статьи
2. **Загрузка из Outline**: Получает информацию об аттачменте через Outline API
3. **Скачивание**: Загружает файл аттачмента
4. **Загрузка во Frappe**: Загружает файл в систему Frappe как публичный файл
5. **Замена ссылок**: Заменяет оригинальные ссылки на аттачменты на новые ссылки Frappe
6. **Присоединение к статье**: Добавляет аттачменты в Wiki Page как связанные файлы

### 📝 Форматы обработки

#### Изображения-аттачменты
**Исходный формат в Outline:**
```markdown
![Название изображения](/api/outline/attachments.redirect?id=attachment-id)
```

**Результат во Frappe:**
```html
<img src="https://frappe-site.com/files/filename.jpg" alt="Название изображения" width="100" height="100"><br>
```

#### Файлы-аттачменты  
**Исходный формат в Outline:**
```markdown
[Название файла](/api/outline/attachments.redirect?id=attachment-id)
```

**Результат во Frappe:**
```html
<a href="https://frappe-site.com/files/filename.pdf" target="_blank" class="attachment-link">📎 Название файла</a>
```

#### Обычные изображения
**Исходный формат в Outline:**
```markdown
![Alt text](https://example.com/image.jpg)
```

**Результат во Frappe:**
```html
<img src="https://frappe-site.com/files/migrated_image.jpg" alt="Alt text" width="100" height="100"><br>
```

## ⚙️ Настройка

### Переменные окружения (.env.migrate)
```bash
# Outline
OUTLINE_BASE_URL=https://your-outline.com
OUTLINE_API_KEY=your-outline-api-key

# Frappe
FRAPPE_BASE_URL=https://your-frappe-site.com  
FRAPPE_API_KEY=your-frappe-api-key
FRAPPE_API_SECRET=your-frappe-api-secret

# Источник URL статей (выберите один)
MIGRATION_URLS="url1,url2,url3"  # Прямо в ENV
MIGRATION_URLS_FILE=migration-input/urls.txt  # Из файла
```

### Формат файла URLs (migration-input/urls.txt)
```
https://outline.loov.ru/doc/article-1-title-id
https://outline.loov.ru/doc/article-2-title-id
https://outline.loov.ru/s/shortId1
https://outline.loov.ru/s/shortId2
```

## 🚀 Запуск миграции

### Docker (рекомендуется)
```bash
# Создайте .env.migrate с настройками
cp env.migrate.example .env.migrate
# Отредактируйте файл

# Запустите миграцию
docker-compose -f docker-compose.migrate.yml up --build
```

### Node.js
```bash
# Установите зависимости
npm install

# Создайте файл настроек
cp env.migrate.example .env.migrate
# Отредактируйте .env.migrate

# Запустите скрипт
node scripts/migrate-outline-to-frappe.js
```

## 📊 Статистика и отчетность

Скрипт выводит подробную статистику по завершении:
```
📈 ИТОГОВАЯ СТАТИСТИКА:
==================================================
✅ Успешно мигрированы: 5
⚠️ Пропущены (уже существуют): 2  
❌ Ошибки: 1

🎉 Успешно мигрированные статьи:
  - Стандарты работы (3 изображений, 2 аттачментов)
  - Инструкция по оборудованию (1 изображений, 5 аттачментов)
  - Политика безопасности (0 изображений, 1 аттачментов)
```

## 🔧 Техническая информация

### API эндпоинты Outline
- `POST /api/documents.info` - информация о документе
- `POST /api/documents.export` - содержимое документа  
- `POST /api/attachments.redirect` - информация об аттачменте

### API эндпоинты Frappe
- `POST /api/resource/Wiki Page` - создание Wiki Page
- `POST /api/method/upload_file` - загрузка файлов

### Структура данных Wiki Page
```json
{
  "doctype": "Wiki Page",
  "title": "Название статьи",
  "content": "HTML контент с замененными ссылками",
  "route": "standarts/translitirovannoe-nazvanie",
  "published": 1,
  "allow_guest": 1,
  "attachments": [
    {
      "file_name": "filename.pdf",
      "file_url": "/files/filename.pdf", 
      "is_private": 0
    }
  ]
}
```

## 🛠️ Отладка

### Логирование
Скрипт выводит подробные логи:
- 🔗 HTTP запросы к API
- 📖 Обработка документов
- 🖼️ Загрузка изображений  
- 📎 Обработка аттачментов
- ✅/❌ Результаты операций

### Типичные ошибки
1. **401 Unauthorized** - проверьте API ключи
2. **404 Not Found** - проверьте URL Outline/Frappe
3. **500 Server Error** - проверьте права доступа к файлам во Frappe
4. **Network timeout** - большие файлы могут требовать больше времени

## 📋 Checklist перед миграцией

- [ ] Настроены переменные окружения в `.env.migrate`
- [ ] Проверена доступность Outline API (тестовый запрос)
- [ ] Проверена доступность Frappe API (тестовый запрос)  
- [ ] Подготовлен список URL статей для миграции
- [ ] Во Frappe настроены права на создание Wiki Pages
- [ ] Во Frappe настроены права на загрузку файлов
- [ ] Достаточно места на диске для временных файлов

## 🎯 Результат миграции

После успешной миграции во Frappe будет создана Wiki Page со следующими характеристиками:

✅ **Полное содержимое** из Outline  
✅ **Все изображения** загружены и отображаются  
✅ **Все аттачменты** загружены и доступны для скачивания  
✅ **Корректные ссылки** на файлы в системе Frappe  
✅ **SEO-friendly URL** на основе транслитерации заголовка  
✅ **Публичный доступ** без необходимости авторизации 
# 🚀 Быстрый старт: Миграция статей из Outline в Frappe

## 1. Настройка

```bash
# Скопируйте настройки
cp env.migrate.example .env.migrate

# Отредактируйте .env.migrate и укажите API ключи
nano .env.migrate
```

## 2. Добавьте URL статей

### Вариант 1: Прямо в .env.migrate
```bash
# Добавьте в .env.migrate:
MIGRATION_URLS=https://outline.loov.ru/doc/merchendajzing-s-uchetom-prioriteta-loov-hSBN3LQ9bq,https://outline.loov.ru/doc/another-article-XYZ789
```

### Вариант 2: Создайте файл с URL
```bash
# Создайте файл с URL
echo "https://outline.loov.ru/doc/merchendajzing-s-uchetom-prioriteta-loov-hSBN3LQ9bq" > migration-input/urls.txt
echo "https://outline.loov.ru/doc/another-article-XYZ789" >> migration-input/urls.txt
```

## 3. Запуск миграции

### Простой запуск через npm
```bash
npm install
npm run migrate
```

### Запуск через Docker
```bash
npm run migrate:docker
```

## 4. Что происходит

✅ Скрипт автоматически:
- Извлекает статьи из Outline
- Скачивает и переносит все изображения
- Создаёт статьи в Frappe Wiki
- Показывает детальную статистику

⚠️ **Важно**: Статьи с одинаковыми названиями пропускаются автоматически

Подробная документация: [MIGRATION_README.md](MIGRATION_README.md) 
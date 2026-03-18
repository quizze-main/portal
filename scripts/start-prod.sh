#!/bin/bash

# Скрипт для запуска production окружения с автоматическим получением коммита

set -e

echo "🚀 Starting production environment..."

# Получаем информацию о коммите
export COMMIT_HASH=$(git rev-parse HEAD 2>/dev/null || echo 'unknown')
export SHORT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')
export COMMIT_TIME=$(git log -1 --format=%cd --date=iso 2>/dev/null || echo 'unknown')
export BUILD_TIME=$(date -u +'%Y-%m-%dT%H:%M:%SZ')

echo "📋 Version info:"
echo "   Commit: $SHORT_HASH"
echo "   Build time: $BUILD_TIME"

# Запускаем docker compose prod
docker compose -f docker-compose.prod.yml up --build -d

echo "✅ Production environment started!"
echo "   Container: staff-focus-app-prod"
echo "   Version: $SHORT_HASH" 
#!/bin/bash

# Скрипт для запуска dev окружения с автоматическим получением коммита

set -e

echo "🚀 Starting development environment..."

# Получаем информацию о коммите
export COMMIT_HASH=$(git rev-parse HEAD 2>/dev/null || echo 'unknown')
export SHORT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')
export COMMIT_TIME=$(git log -1 --format=%cd --date=iso 2>/dev/null || echo 'unknown')
export BUILD_TIME=$(date -u +'%Y-%m-%dT%H:%M:%SZ')

echo "📋 Version info:"
echo "   Commit: $SHORT_HASH"
echo "   Build time: $BUILD_TIME"

# Запускаем docker compose dev
docker compose -f docker-compose.dev.yml up --build

echo "✅ Development environment started!" 
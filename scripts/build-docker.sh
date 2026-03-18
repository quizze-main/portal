#!/bin/bash

# Скрипт для автоматической сборки Docker с передачей информации о коммите

set -e

echo "🔍 Getting git information..."

# Получаем информацию о коммите
COMMIT_HASH=$(git rev-parse HEAD 2>/dev/null || echo 'unknown')
SHORT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')
COMMIT_TIME=$(git log -1 --format=%cd --date=iso 2>/dev/null || echo 'unknown')
BUILD_TIME=$(date -u +'%Y-%m-%dT%H:%M:%SZ')

echo "📋 Version info:"
echo "   Commit: $SHORT_HASH"
echo "   Build time: $BUILD_TIME"

# Определяем тег образа
IMAGE_TAG=${1:-"staff-focus-app:latest"}

echo "🐳 Building Docker image: $IMAGE_TAG"

# Собираем Docker образ с передачей build args
docker build \
  --build-arg COMMIT_HASH="$COMMIT_HASH" \
  --build-arg SHORT_HASH="$SHORT_HASH" \
  --build-arg COMMIT_TIME="$COMMIT_TIME" \
  --build-arg BUILD_TIME="$BUILD_TIME" \
  -t "$IMAGE_TAG" .

echo "✅ Docker image built successfully!"
echo "   Image: $IMAGE_TAG"
echo "   Version: $SHORT_HASH" 
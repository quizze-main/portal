#!/bin/sh

# Автоматически получаем информацию о коммите если переменные не установлены
if [ -z "$COMMIT_HASH" ]; then
  export COMMIT_HASH=$(git rev-parse HEAD 2>/dev/null || echo 'unknown')
fi

if [ -z "$SHORT_HASH" ]; then
  export SHORT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')
fi

if [ -z "$COMMIT_TIME" ]; then
  export COMMIT_TIME=$(git log -1 --format=%cd --date=iso 2>/dev/null || echo 'unknown')
fi

if [ -z "$BUILD_TIME" ]; then
  export BUILD_TIME=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
fi

echo "🚀 Starting with version info:"
echo "   Commit: $SHORT_HASH"
echo "   Build time: $BUILD_TIME"
echo "   API KEY: $VITE_API_SECRET_KEY"

# Run Prisma migrations if DATABASE_URL is set
if [ -n "$DATABASE_URL" ]; then
  echo "📦 Running Prisma migrations..."
  npx prisma migrate deploy 2>&1 || echo "⚠️ Prisma migrate failed, continuing..."
fi

exec npm start 
FROM node:20-slim

WORKDIR /app

# Установка git для получения информации о коммите
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# Установка зависимостей (включая dev)
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Копирование файлов сервера и фронта
COPY ./ ./

# Build args for version info
ARG COMMIT_HASH
ARG BUILD_TIME
ARG SHORT_HASH
ARG COMMIT_TIME
ARG VITE_API_SECRET_KEY
ARG VITE_API_BASE_URL
ARG VITE_OUTLINE_BASE_URL
ARG VITE_FRAPPE_BASE_URL
ARG VITE_TG_BOT_USERNAME
ARG YANDEX_TREKER_AUTH_TOKEN
ARG X_ORG_ID

# Устанавливаем переменные окружения из build args или получаем автоматически
ENV COMMIT_HASH=${COMMIT_HASH}
ENV BUILD_TIME=${BUILD_TIME}
ENV SHORT_HASH=${SHORT_HASH}
ENV COMMIT_TIME=${COMMIT_TIME}
ENV VITE_API_SECRET_KEY=${VITE_API_SECRET_KEY}
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_OUTLINE_BASE_URL=${VITE_OUTLINE_BASE_URL}
ENV VITE_FRAPPE_BASE_URL=${VITE_FRAPPE_BASE_URL}
ENV VITE_TG_BOT_USERNAME=${VITE_TG_BOT_USERNAME}
ENV YANDEX_TREKER_AUTH_TOKEN=${YANDEX_TREKER_AUTH_TOKEN}
ENV X_ORG_ID=${X_ORG_ID}

# Generate Prisma client
RUN npx prisma generate

# Сборка фронтенда (создаст папку dist)
ENV NODE_OPTIONS="--max-old-space-size=1536"
RUN npm run build

# Создание директории для статических файлов
RUN mkdir -p /app/dist

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Открываем порт
EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"] 
import { createClient } from 'redis';
import { createHash } from 'crypto';

let redisClient = null;
let isConnected = false;

/**
 * Инициализация Redis клиента.
 * Вызывается один раз при старте сервера.
 */
export async function initRedisCache() {
  const REDIS_URL = process.env.REDIS_URL;
  const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

  // Debug: показываем все переменные с REDIS в имени
  const redisEnvVars = Object.keys(process.env).filter(k => k.includes('REDIS'));
  console.log('🔍 Redis debug:', {
    REDIS_URL: REDIS_URL ? `${REDIS_URL.slice(0, 20)}...` : 'undefined',
    allRedisVars: redisEnvVars,
    cwd: process.cwd()
  });

  if (!REDIS_URL) {
    console.log('⚠️  REDIS_URL not configured, caching disabled');
    return false;
  }

  try {
    const options = {
      url: REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error('❌ Redis: max reconnection attempts reached');
            return new Error('Max reconnection attempts reached');
          }
          return Math.min(retries * 100, 3000);
        },
      },
    };

    if (REDIS_PASSWORD) {
      options.password = REDIS_PASSWORD;
    }

    redisClient = createClient(options);

    redisClient.on('error', (err) => {
      console.error('❌ Redis error:', err.message);
      isConnected = false;
    });

    redisClient.on('connect', () => {
      console.log('🔄 Redis connecting...');
    });

    redisClient.on('ready', () => {
      console.log('✅ Redis connected');
      isConnected = true;
    });

    redisClient.on('end', () => {
      console.log('⚪ Redis disconnected');
      isConnected = false;
    });

    await redisClient.connect();
    return true;
  } catch (error) {
    console.error('❌ Redis init failed:', error.message);
    isConnected = false;
    return false;
  }
}

/**
 * Проверка подключения к Redis.
 */
export function isRedisConnected() {
  return isConnected && redisClient?.isOpen;
}

/**
 * Генерация ключа кэша из параметров запроса.
 * @param {string} prefix - Префикс ключа (например, 'leader_metrics')
 * @param {object} params - Параметры запроса
 * @returns {string} Ключ кэша
 */
export function generateCacheKey(prefix, params) {
  // Сортируем ключи для консистентности
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      const value = params[key];
      // Массивы сортируем тоже
      acc[key] = Array.isArray(value) ? [...value].sort() : value;
      return acc;
    }, {});

  const hash = createHash('md5')
    .update(JSON.stringify(sortedParams))
    .digest('hex')
    .slice(0, 12);

  return `${prefix}:${hash}`;
}

/**
 * Получение данных из кэша.
 * @param {string} key - Ключ кэша
 * @returns {Promise<object|null>} Данные или null если не найдено/ошибка
 */
export async function getFromCache(key) {
  if (!isRedisConnected()) return null;

  try {
    const data = await redisClient.get(key);
    if (!data) return null;

    const parsed = JSON.parse(data);
    return parsed;
  } catch (error) {
    console.error('❌ Redis get error:', error.message);
    return null;
  }
}

/**
 * Сохранение данных в кэш.
 * @param {string} key - Ключ кэша
 * @param {object} data - Данные для сохранения
 * @param {number} ttlSeconds - Время жизни в секундах
 * @returns {Promise<boolean>} Успешность операции
 */
export async function setInCache(key, data, ttlSeconds) {
  if (!isRedisConnected()) return false;

  try {
    await redisClient.setEx(key, ttlSeconds, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('❌ Redis set error:', error.message);
    return false;
  }
}

/**
 * Удаление данных из кэша.
 * @param {string} key - Ключ кэша
 * @returns {Promise<boolean>} Успешность операции
 */
export async function deleteFromCache(key) {
  if (!isRedisConnected()) return false;

  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    console.error('❌ Redis del error:', error.message);
    return false;
  }
}

/**
 * Удаление всех ключей по паттерну.
 * @param {string} pattern - Паттерн (например, 'leader_metrics:*')
 * @returns {Promise<number>} Количество удалённых ключей
 */
export async function deleteByPattern(pattern) {
  if (!isRedisConnected()) return 0;

  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length === 0) return 0;

    await redisClient.del(keys);
    return keys.length;
  } catch (error) {
    console.error('❌ Redis del pattern error:', error.message);
    return 0;
  }
}

/**
 * Wrapper для кэширования результата функции.
 * @param {string} cacheKey - Ключ кэша
 * @param {number} ttlSeconds - Время жизни в секундах
 * @param {Function} fetchFn - Функция получения данных (должна возвращать Promise)
 * @returns {Promise<{data: any, fromCache: boolean}>}
 */
export async function withCache(cacheKey, ttlSeconds, fetchFn) {
  // Пробуем получить из кэша
  const cached = await getFromCache(cacheKey);
  if (cached !== null) {
    return { data: cached, fromCache: true };
  }

  // Выполняем запрос
  const data = await fetchFn();

  // Сохраняем в кэш (async, не ждём)
  setInCache(cacheKey, data, ttlSeconds).catch(() => {});

  return { data, fromCache: false };
}

/**
 * Graceful shutdown Redis.
 */
export async function closeRedisCache() {
  if (redisClient) {
    try {
      await redisClient.quit();
      console.log('⚪ Redis connection closed');
    } catch (error) {
      console.error('❌ Redis close error:', error.message);
    }
  }
}

// TTL константы для разных типов данных (в секундах)
export const CACHE_TTL = {
  LEADER_METRICS: 5 * 60,      // 5 минут - метрики лидеров
  MANAGER_RANKING: 5 * 60,     // 5 минут - рейтинг менеджеров
  BRANCH_RANKING: 5 * 60,      // 5 минут - рейтинг филиалов
  ANALYTICS: 5 * 60,           // 5 минут - аналитика
  UNCLOSED_ORDERS: 3 * 60,     // 3 минуты - незакрытые заказы
  REVIEWS: 5 * 60,             // 5 минут - отзывы
};

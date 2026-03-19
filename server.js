import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';
import logger, { loggerWithUser } from './src/server/logger.js';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { startPeriodicSync } from './src/server/frappe-sync.js';
import { findEmployeeById, findEmployeeByTgUsername } from './src/server/org-data.js';

// Настройка __dirname для ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Загружаем переменные окружения
const env = process.env;

// Настройка CORS
const allowedOrigins = env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000'];

const corsOptions = {
  origin: function (origin, callback) {
    // Разрешаем запросы без origin (например, мобильные приложения)
    if (!origin) {
      return callback(null, true);
    }
    
    // Проверяем статические origins
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Проверяем ngrok URLs (паттерн: https://*.ngrok-free.app)
    const ngrokPattern = /^https:\/\/.*\.ngrok-free\.app$/;
    if (ngrokPattern.test(origin)) {
      logger.info('CORS: ngrok origin allowed', { origin });
      return callback(null, true);
    }
    
    logger.warn('CORS blocked origin', { origin });
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200
};

// Rate limiting (отключён для localhost в dev-режиме)
const isDevMode = process.env.DEBUG_MODE === 'true' || process.env.NODE_ENV === 'local';
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 1000, // максимум 1000 запросов с одного IP за 15 минут
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: isDevMode ? () => true : undefined,
  // Настройка для работы с прокси-серверами
  keyGenerator: (req) => {
    // Используем X-Forwarded-For если доступен, иначе req.ip
    return req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
  },
});

// Инициализация Express
const app = express();

// Настройка trust proxy для работы с прокси-серверами
// Это необходимо для корректной работы rate limiting и получения реальных IP адресов
app.set('trust proxy', 1);

// Middleware для детального логирования запросов (упрощенная версия)
app.use((req, res, next) => {
  // Логируем только для POST запросов к API и только в debug режиме
  if (req.method === 'POST' && req.path.startsWith('/api/') && logger.isDebugEnabled()) {
    // Логируем базовую информацию о запросе без чтения тела
    logger.debug('Incoming API request', {
      url: req.url,
      method: req.method,
      contentType: req.get('Content-Type'),
      contentLength: req.get('Content-Length'),
      userAgent: req.get('User-Agent'),
      accept: req.get('Accept'),
      authorization: req.get('Authorization') ? 'present' : 'absent',
      xApiKey: req.get('x-api-key') ? 'present' : 'absent',
      ip: req.ip,
      hostname: req.hostname,
      protocol: req.protocol,
      originalUrl: req.originalUrl,
      path: req.path,
      query: req.query,
      params: req.params
    });
  }
  next();
});

// Middleware
app.use(limiter);
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Обработчик ошибок body-parser
app.use((error, req, res, next) => {
  // Обрабатываем ошибки парсинга JSON и body
  if (error.status === 400 && (
    error instanceof SyntaxError || 
    error.message.includes('JSON') || 
    error.message.includes('parse') ||
    error.message.includes('stream encoding')
  )) {
    // Логируем на error уровне для мониторинга
    loggerWithUser.error(req, 'Body parsing error', {
      error: error.message || error.toString(),
      errorType: error.constructor.name,
      errorStatus: error.status,
      errorStack: error.stack,
      url: req.url,
      method: req.method,
      contentType: req.get('Content-Type'),
      body: req.body
    });
    
    // Дополнительно логируем на debug уровне для детального анализа
    if (logger.isDebugEnabled()) {
      logger.debug('Detailed body parsing error analysis', {
        error: error.message || error.toString(),
        errorType: error.constructor.name,
        errorStatus: error.status,
        errorStack: error.stack,
        url: req.url,
        method: req.method,
        contentType: req.get('Content-Type'),
        contentLength: req.get('Content-Length'),
        userAgent: req.get('User-Agent'),
        accept: req.get('Accept'),
        body: req.body,
        headers: Object.keys(req.headers).reduce((acc, key) => {
          if (!['authorization', 'x-api-key', 'cookie'].includes(key.toLowerCase())) {
            acc[key] = req.get(key);
          }
          return acc;
        }, {}),
        // Дополнительная информация для отладки
        ip: req.ip,
        hostname: req.hostname,
        protocol: req.protocol,
        originalUrl: req.originalUrl,
        path: req.path,
        query: req.query,
        params: req.params,
        timestamp: new Date().toISOString()
      });
    }
    
    return res.status(400).json({ 
      error: 'Invalid request format',
      details: error.message || 'Request body could not be parsed'
    });
  }
  
  next(error);
});

// Middleware для проверки JWT из cookie
app.use((req, res, next) => {
    const token = req.cookies?.token;
    const JWT_SECRET = process.env.JWT_SECRET;

    if (!token || !JWT_SECRET) {
        // Dev fallback: set default user so API works without login
        req.user = { tg_username: 'fedulovdm', employeename: 'fedulovdm', tg_chat_id: 'fedulovdm', demo: false };
        return next();
    }
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        // Dev override: promote demo users to fedulovdm
        if (process.env.NODE_ENV !== 'production' && req.user?.demo) {
            req.user = { ...req.user, tg_username: 'fedulovdm', employeename: 'fedulovdm', tg_chat_id: 'fedulovdm', demo: false };
        }
    } catch (e) {
        loggerWithUser.warn(req, 'JWT verification failed', {
            error: e.message,
            token: token ? `${token.substring(0, 10)}...` : 'null',
            url: req.url
        });
        if (process.env.NODE_ENV === 'production') {
            req.user = null;
        } else {
            // Dev fallback: don't block on expired/invalid tokens
            req.user = { tg_username: 'fedulovdm', employeename: 'fedulovdm', tg_chat_id: 'fedulovdm', demo: false };
        }
    }
    next();
});

// API авторизация для защищенных эндпоинтов
const apiAuthMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const expectedToken = env.API_SECRET_KEY;
    
    if (!expectedToken) {
        loggerWithUser.warn(req, 'API_SECRET_KEY not configured - authentication disabled');
        return next();
    }
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        loggerWithUser.warn(req, 'API request without valid Bearer token', {
            url: req.url,
            method: req.method,
            headers: req.headers,
            ip: req.ip
        });
        return res.status(401).json({ error: 'Authorization required' });
    }
    
    const token = authHeader.substring(7);
    
    if (token !== expectedToken) {
        loggerWithUser.warn(req, 'API request with invalid token', {
            url: req.url,
            method: req.method,
            providedToken: token.substring(0, 8) + '...',
            expectedToken: expectedToken.substring(0, 8) + '...',
            ip: req.ip
        });
        return res.status(401).json({ error: 'Invalid authorization token' });
    }
    
    loggerWithUser.info(req, 'API request authorized', {
        url: req.url,
        method: req.method,
        ip: req.ip
    });
    next();
};

// Логирование запросов
app.use((req, res, next) => {
    // Не логируем /health
    if (req.path === '/health') return next();
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const level = res.statusCode >= 400 ? 'warn' : 'info';
        const message = `${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`;
        const data = {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration: duration,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            referer: req.get('Referer')
        };
        
        if (level === 'warn') {
            loggerWithUser.warn(req, message, data);
        } else {
            loggerWithUser.info(req, message, data);
        }
    });
    next();
});

app.use('/static', express.static(path.join(__dirname, 'static')));

// Статические файлы из public (для PWA файлов в продакшене)
app.use(express.static(path.join(__dirname, 'public')));

// Импорт модулей
import { setupTelegramRoutes, initializeTelegramBot } from './src/server/telegram.js';
import { setupInternalApiRoutes, initializeInternalApi } from './src/server/internal-api.js';
import { setupExternalApiRoutes, initializeExternalApi } from './src/server/external-api.js';
import { setupSwagger } from './src/server/swagger.js';
import { registerSse } from './src/server/realtime.js';
import { setupKbRoutes } from './src/server/kb-providers.js';
import { setupDashboardMetricsRoutes } from './src/server/dashboard-metrics.js';
import { setupMotivationConfigRoutes } from './src/server/motivation-config.js';
import { setupSalaryConfigRoutes } from './src/server/salary-config-api.js';
import { setupDataSourceRoutes, initializeDataSources, readConfig as readDataSourcesConfig, mergeEnvDefaults as mergeDataSourceEnvDefaults, getDataSourceHealthChecks } from './src/server/data-sources.js';
import { setupMetricPlansRoutes } from './src/server/metric-plans-api.js';
import { setDynamicIntegrations } from './src/server/health-checks.js';
import { initRedisCache, closeRedisCache, isRedisConnected } from './src/server/cache.js';
import { initDatabase, closeDatabase, isDbConnected } from './src/server/db.js';
import { setupSalaryAdminRoutes } from './src/server/salary-admin.js';
import { setupShiftScheduleRoutes } from './src/server/shift-schedule-api.js';
import { startPollingScheduler, stopPollingScheduler } from './src/server/adapters/polling-scheduler.js';
import { startViewRefreshScheduler, stopViewRefreshScheduler } from './src/server/analytics-views.js';

// Регистрируем внутренние API эндпоинты (с авторизацией)
setupInternalApiRoutes(app);

// Регистрируем KB-провайдеры (отдельный модуль, с авторизацией)
setupKbRoutes(app);

// Регистрируем маршруты конфигурации метрик дашборда
setupDashboardMetricsRoutes(app);

// Регистрируем маршруты планов метрик
setupMetricPlansRoutes(app);

// Регистрируем маршруты конфигурации мотивации
setupMotivationConfigRoutes(app);

// Регистрируем маршруты конфигурации зарплат
setupSalaryConfigRoutes(app);

// Регистрируем маршруты источников данных (коннекторы)
setupDataSourceRoutes(app);

// Регистрируем Telegram эндпоинты (без авторизации)
setupTelegramRoutes(app);

// Регистрируем внешние API эндпоинты (с API key авторизацией)
setupExternalApiRoutes(app);

// Регистрируем админку расчёта зарплат
setupSalaryAdminRoutes(app);

// Регистрируем маршруты графика смен
setupShiftScheduleRoutes(app);

// Регистрируем SSE стрим для in-app уведомлений
registerSse(app);

// Настраиваем Swagger документацию
setupSwagger(app);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        redis: isRedisConnected() ? 'connected' : 'disconnected',
        postgres: isDbConnected() ? 'connected' : 'disconnected'
    });
});

// Version endpoint
app.get('/api/version', (req, res) => {
    const commitHash = env.COMMIT_HASH || env.SHORT_HASH || 'unknown';
    const shortHash = env.SHORT_HASH || (env.COMMIT_HASH ? env.COMMIT_HASH.substring(0, 7) : 'unknown');
    const buildTime = env.BUILD_TIME || env.COMMIT_TIME || new Date().toISOString();
    const commitTime = env.COMMIT_TIME || 'unknown';
    
    res.json({
        commitHash,
        buildTime,
        shortHash,
        commitTime
    });
});

// Cache bust endpoint для принудительного обновления кеша
app.post('/api/cache-bust', (req, res) => {
    res.json({
        success: true,
        message: 'Cache bust triggered',
        timestamp: new Date().toISOString(),
        version: env.COMMIT_HASH || env.SHORT_HASH || 'unknown'
    });
});

// Endpoint для авторизации через Telegram WebApp
app.post('/api/auth/telegram', async (req, res) => {
    const { tg_username, employeename, tg_chat_id } = req.body;
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
        process.stderr.write('JWT_SECRET не задан, авторизация невозможна\n');
        process.exit(1);
    }
    if (!tg_username || !tg_chat_id) {
        return res.status(400).json({ error: 'tg_username и tg_chat_id обязательны' });
    }
    // Resolve designation + department for metric field mapping filtering
    let designation = null;
    let department = null;
    try {
      const empIdMatch = employeename?.match(/\(([^)]+)\)/);
      const empId = empIdMatch ? empIdMatch[1] : null;
      if (empId) {
        // Try own data first (org-data.js handles PG→JSON fallback)
        const orgResult = await findEmployeeById(empId).catch(() => null);
        if (orgResult?.data) {
          designation = orgResult.data.designation || null;
          department = orgResult.data.department || null;
        }
        // Fallback to Frappe if own data didn't resolve and Frappe is available
        if (!designation && !department && process.env.FRAPPE_BASE_URL) {
          const frappeRes = await fetch(
            `${process.env.FRAPPE_BASE_URL}/api/resource/Employee/${encodeURIComponent(empId)}?fields=["designation","department"]`,
            {
              headers: { 'Authorization': `token ${process.env.FRAPPE_API_KEY}:${process.env.FRAPPE_API_SECRET}` },
              signal: AbortSignal.timeout(5000),
            }
          );
          if (frappeRes.ok) {
            const data = await frappeRes.json();
            designation = data?.data?.designation || null;
            department = data?.data?.department || null;
          }
        }
      }
    } catch (err) {
      console.warn('Designation/department lookup failed:', err?.message || err);
    }

    const payload = {
        tg_username,
        employeename,
        tg_chat_id,
        designation,
        department,
        demo: false
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
    });
    res.json({ success: true });
});

// Dev auto-login (no PIN required, only when DEV_AUTO_LOGIN=true)
app.post('/api/auth/dev-auto', async (req, res) => {
    if (process.env.DEV_AUTO_LOGIN !== 'true' || process.env.NODE_ENV === 'production') {
        return res.status(403).json({ error: 'Dev auto-login is disabled' });
    }
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
        return res.status(500).json({ error: 'JWT_SECRET not configured' });
    }
    const demoTgUsername = 'fedulovdm';
    // Resolve designation + department — try own data first, fallback to Frappe
    let designation = null;
    let department = null;
    try {
      const orgResult = await findEmployeeByTgUsername(demoTgUsername).catch(() => null);
      if (orgResult?.data?.[0]) {
        designation = orgResult.data[0].designation || null;
        department = orgResult.data[0].department || null;
      }
      if (!designation && !department && process.env.FRAPPE_BASE_URL) {
        const frappeRes = await fetch(
          `${process.env.FRAPPE_BASE_URL}/api/resource/Employee?filters=[["status","=","Active"],["custom_tg_username","=","${demoTgUsername}"]]&fields=["designation","department"]&limit_page_length=1`,
          {
            headers: { 'Authorization': `token ${process.env.FRAPPE_API_KEY}:${process.env.FRAPPE_API_SECRET}` },
            signal: AbortSignal.timeout(5000),
          }
        );
        if (frappeRes.ok) {
          const data = await frappeRes.json();
          const emp = data?.data?.[0];
          designation = emp?.designation || null;
          department = emp?.department || null;
        }
      }
    } catch (err) {
      console.warn('Dev-auto: designation/department lookup failed:', err?.message || err);
    }
    const payload = {
        tg_username: demoTgUsername,
        employeename: demoTgUsername,
        tg_chat_id: demoTgUsername,
        designation,
        department,
        demo: false
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
    res.cookie('token', token, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000,
        path: '/',
    });
    res.json({ success: true });
});

// Endpoint для демо-режима (вход по пинкоду)
app.post('/api/auth/demo', async (req, res) => {
    const { pincode } = req.body;
    const JWT_SECRET = process.env.JWT_SECRET;
    const DEMO_PIN = process.env.DEMO_PIN;
    if (!JWT_SECRET) {
        process.stderr.write('JWT_SECRET не задан, авторизация невозможна\n');
        process.exit(1);
    }
    if (!DEMO_PIN) {
        process.stderr.write('DEMO_PIN не задан, демо-режим невозможен\n');
        return res.status(500).json({ error: 'DEMO_PIN не задан, демо-режим невозможен' });
    }
    if (pincode !== DEMO_PIN) {
        return res.status(401).json({ error: 'Неверный пинкод' });
    }
    const demoTgUsername = 'fedulovdm';
    // Resolve designation + department — try own data first, fallback to Frappe
    let designation = null;
    let department = null;
    try {
      const orgResult = await findEmployeeByTgUsername(demoTgUsername).catch(() => null);
      if (orgResult?.data?.[0]) {
        designation = orgResult.data[0].designation || null;
        department = orgResult.data[0].department || null;
      }
      if (!designation && !department && process.env.FRAPPE_BASE_URL) {
        const frappeRes = await fetch(
          `${process.env.FRAPPE_BASE_URL}/api/resource/Employee?filters=[["status","=","Active"],["custom_tg_username","=","${demoTgUsername}"]]&fields=["designation","department"]&limit_page_length=1`,
          {
            headers: { 'Authorization': `token ${process.env.FRAPPE_API_KEY}:${process.env.FRAPPE_API_SECRET}` },
            signal: AbortSignal.timeout(5000),
          }
        );
        if (frappeRes.ok) {
          const data = await frappeRes.json();
          const emp = data?.data?.[0];
          designation = emp?.designation || null;
          department = emp?.department || null;
        }
      }
    } catch (err) {
      console.warn('Demo: designation/department lookup failed:', err?.message || err);
    }
    const payload = {
        tg_username: demoTgUsername,
        employeename: demoTgUsername,
        tg_chat_id: demoTgUsername,
        designation,
        department,
        demo: true
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000,
        path: '/',
    });
    res.json({ success: true });
});

// Endpoint для logout (перезагрузить аккаунт)
app.post('/api/logout', (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
    });
    res.json({ success: true });
});

// В режиме разработки проксируем Vite-specific пути к Vite dev server
if (process.env.NODE_ENV === 'local' || process.env.DEBUG_MODE === 'true') {
  // Проксируем Vite-specific пути к Vite dev server
  const viteProxy = createProxyMiddleware({
    target: 'http://localhost:5173', // Внутри контейнера Vite доступен на localhost
    changeOrigin: true,
    ws: true, // Поддержка WebSocket для HMR
    logLevel: 'silent',
    pathFilter: (pathname) => {
      // Проксируем только Vite-specific пути
      return pathname.startsWith('/@vite/client') || 
             pathname.startsWith('/src/') || 
             pathname.startsWith('/node_modules/') || 
             pathname.startsWith('/@react-refresh');
    },
    onError: (err, req, res) => {
      // Если Vite dev server недоступен, логируем ошибку
      logger.warn('Vite dev server not available', { error: err.message });
      return false; // Продолжаем обработку запроса
    }
  });
  
  app.use(viteProxy);
  
  // Для всех остальных маршрутов возвращаем index.html (SPA routing)
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
  });
} else {
  // В продакшене используем собранные файлы
  const distDir = path.join(__dirname, 'dist');
  app.use(express.static(distDir, {
    setHeaders: (res, path) => {
      // Отключаем кеширование в debug режиме
      if (process.env.NODE_ENV === 'local' || process.env.DEBUG_MODE === 'true') {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    }
  }));
  
  // Для всех остальных маршрутов возвращаем index.html (SPA routing)
  app.get('*', (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

// Общий обработчик ошибок
app.use((error, req, res, next) => {
  // Логируем на error уровне для мониторинга
  loggerWithUser.error(req, 'Unhandled error', {
    error: error.message || error.toString(),
    errorType: error.constructor.name,
    errorStack: error.stack,
    url: req.url,
    method: req.method,
    contentType: req.get('Content-Type')
  });
  
  // Дополнительно логируем на debug уровне для детального анализа
  if (logger.isDebugEnabled()) {
    logger.debug('Detailed unhandled error analysis', {
      error: error.message || error.toString(),
      errorType: error.constructor.name,
      errorStack: error.stack,
      url: req.url,
      method: req.method,
      contentType: req.get('Content-Type'),
      contentLength: req.get('Content-Length'),
      userAgent: req.get('User-Agent'),
      accept: req.get('Accept'),
      headers: Object.keys(req.headers).reduce((acc, key) => {
        if (!['authorization', 'x-api-key', 'cookie'].includes(key.toLowerCase())) {
          acc[key] = req.get(key);
        }
        return acc;
      }, {}),
      // Дополнительная информация для отладки
      ip: req.ip,
      hostname: req.hostname,
      protocol: req.protocol,
      originalUrl: req.originalUrl,
      path: req.path,
      query: req.query,
      params: req.params,
      timestamp: new Date().toISOString()
    });
  }
  
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'local' ? (error.message || error.toString()) : 'Something went wrong'
  });
});

// Инициализация модулей
initializeInternalApi();
initializeTelegramBot();
initializeExternalApi();

// Инициализация источников данных и регистрация в health checks
initializeDataSources().then(async () => {
  const dsConfig = mergeDataSourceEnvDefaults(await readDataSourcesConfig());
  setDynamicIntegrations(getDataSourceHealthChecks(dsConfig));
}).catch(err => {
  console.error('Failed to initialize data sources:', err.message);
});

// Инициализация PostgreSQL
initDatabase().then((connected) => {
  if (connected) {
    logger.info('PostgreSQL database initialized');
    // Start background schedulers after DB is ready
    startPollingScheduler();
    startViewRefreshScheduler();
  }
}).catch((err) => {
  logger.warn('PostgreSQL init failed, using JSON file storage', { error: err.message });
});

// Инициализация Redis кэша
initRedisCache().then((connected) => {
  if (connected) {
    logger.info('Redis cache initialized');
  }
}).catch((err) => {
  logger.warn('Redis cache init failed, continuing without cache', { error: err.message });
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received, shutting down gracefully...`);
  stopPollingScheduler();
  stopViewRefreshScheduler();
  await closeRedisCache();
  await closeDatabase();
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));


const PORT = env.PORT || 3000;
app.listen(PORT, () => {
    logger.info('Server started', {
        port: PORT,
        version: env.COMMIT_HASH || 'unknown',
        buildTime: env.BUILD_TIME || 'unknown',
        host: env.HOST || 'localhost',
        logLevel: logger.getLogLevel(),
        debugEnabled: logger.isDebugEnabled(),
        orgDataSource: env.ORG_DATA_SOURCE || 'frappe',
        apiEndpoints: `${env.LOOV_IS_STAFF_PORTAL_URL || `http://localhost:${PORT}`}/api/*`,
        healthCheck: `http://localhost:${PORT}/health`,
        telegramWebhook: `${env.LOOV_IS_STAFF_PORTAL_URL || `http://localhost:${PORT}`}/api/telegram`
    });

    // Start periodic Frappe sync if enabled (transition period)
    startPeriodicSync();
}); 
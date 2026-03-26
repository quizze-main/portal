import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import { PassThrough } from 'stream';
import FormData from 'form-data';
import multer from 'multer';
import logger, { loggerWithUser } from './logger.js';
import { requireAuth } from './requireAuth.js';
import { getIntegrationsMetadata, healthCheckById, getAllIntegrations } from './health-checks.js';
import { readConfig as readDashboardMetricsConfig } from './dashboard-metrics.js';
import { getSourceById, fetchFromSource, buildAuthHeaders } from './data-sources.js';
import { extractByPath } from './jsonpath.js';
import { proRatePlan, parseLocalDate, getWorkingDaysInRange, getISOWeekKey } from './plan-prorate.js';
import { extractDependencies, validateDAG, getEvaluationOrder, evaluate as evaluateFormula } from './formula-engine.js';
import { resolvePlan, readPlans as readMetricPlans } from './metric-plans-api.js';
import { generateCacheKey, withCache, CACHE_TTL, isRedisConnected } from './cache.js';
import { aggregate } from './aggregation-engine.js';
import { getDynamicPlan } from './plan-engine.js';
import { calculateForecast, buildDateContext } from './forecast-engine.js';
import { setupEventRoutes } from './event-ingestion.js';
import { listAdapters, clearAdapterCache } from './adapters/adapter-loader.js';
import { manualPoll } from './adapters/polling-scheduler.js';
import { getMonthlyByBranch, getMonthlyByEmployee, getDailyEvents, refreshAllViews, getViewRefreshStatus } from './analytics-views.js';
import { exportMetricsCsv, exportEventsCsv, exportMonthlyReport } from './export-engine.js';
import * as orgData from './org-data.js';
import * as rbac from './rbac.js';
import * as userSettingsDb from './user-settings.js';
import { runFullSync, getSyncStatus } from './frappe-sync.js';

const env = process.env || {};

// ORG_DATA_SOURCE controls where org structure data comes from:
// 'frappe' — current Frappe API (default, no changes)
// 'postgres' — own PostgreSQL database (falls back to JSON when DB not connected)
// 'dual' — PostgreSQL primary + Frappe background comparison
let ORG_DATA_SOURCE = env.ORG_DATA_SOURCE || 'frappe';

// Конфигурация Frappe
const FRAPPE_BASE_URL = env.FRAPPE_BASE_URL || 'http://localhost:8000';
const FRAPPE_API_KEY = env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = env.FRAPPE_API_SECRET;

// Конфигурация Outline
const OUTLINE_BASE_URL = env.OUTLINE_BASE_URL || 'https://wiki.loov.ru';
const OUTLINE_API_KEY = env.OUTLINE_API_KEY;

// Конфигурация Tracker (loov dashboards)
const TRACKER_API_URL = env.TRACKER_API_URL || 'https://tracker.loov.ru';
const TRACKER_API_TOKEN = env.TRACKER_API_TOKEN;

// Конфигурация Yandex Tracker (Green button feedback)
const YANDEX_TREKER_AUTH_TOKEN = env.YANDEX_TREKER_AUTH_TOKEN; // Bearer token
const X_ORG_ID = env.X_ORG_ID; // Organization ID for Yandex Tracker

// Employee.custom_employee_shift_format is a Link to a custom doctype.
// In our Frappe it currently returns the linked doc ID (not a label).
// IDs (from your screenshot):
// - 2/2: 0248ad52vt
// - 5/2: d216invhir
const SHIFT_ID_2_2 = '0248ad52vt';
const SHIFT_ID_5_2 = 'd216invhir';

// LEADER_DASHBOARD_TOP_METRICS and METRICS_MAP are now loaded dynamically
// from dashboard-metrics.js config (data/dashboard-metrics.json)

// Функция для фильтрации документов, исключающая те, что начинаются с дефиса
const filterHiddenDocuments = (documents) => {
  return documents.filter(doc => {
    // Проверяем, содержит ли название дефис в начале (после возможных скобок и пробелов)
    const cleanTitle = doc.title.trim();
    // Ищем дефис в начале названия или после открывающих скобок
    return !cleanTitle.match(/^[([{\s]*-/);
  });
};

// Тестирование Outline API при запуске
async function testOutlineAPI() {
  logger.info('Тестирование Outline API при запуске', {
    outlineBaseUrl: OUTLINE_BASE_URL,
    outlineApiKey: OUTLINE_API_KEY ? `${OUTLINE_API_KEY.substring(0, 8)}...` : 'не задан'
  });
  
  if (!OUTLINE_API_KEY) {
    logger.error('Outline API key не задан');
    return;
  }

  try {
    // Тестируем запрос auth.info
    const testUrl = `${OUTLINE_BASE_URL}/api/auth.info`;
    logger.info('Тестовый запрос к Outline API', { testUrl });
    
    const response = await fetch(testUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OUTLINE_API_KEY}`,
        'Content-Type': 'application/json',
      }
    });

    logger.info('Ответ Outline API', {
      status: response.status,
      statusText: response.statusText
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Outline API test failed', {
        status: response.status,
        statusText: response.statusText,
        url: testUrl,
        body: errorText
      });
    } else {
      const data = await response.json();
      logger.info('Outline API test successful', { data });
    }
  } catch (error) {
    logger.error(error.message, {
      context: 'testOutlineAPI',
      url: `${OUTLINE_BASE_URL}/api/auth.info`,
      stack: error.stack,
      name: error.name
    });
  }
}

// Регистрация всех внутренних API эндпоинтов
export function setupInternalApiRoutes(app) {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  });

  const extractEmployeeIdFromEmployeename = (employeename) => {
    if (!employeename || typeof employeename !== 'string') return null;
    // expected: "Full Name (HR-EMP-0001)"
    const match = employeename.match(/\(([^()]+)\)\s*$/);
    return match?.[1] ? String(match[1]).trim() : null;
  };

  // Server-side version of getDashboardPositionCategory (mirrors src/lib/roleUtils.ts)
  const _getDashboardPositionCategory = (designation) => {
    const d = String(designation || '').toLowerCase().replace(/ё/g, 'е');
    if (d.includes('руководитель') || d.includes('директор')) return 'leader';
    if (d.includes('старш') && (d.includes('менеджер') || d.includes('продавец'))) return 'senior_manager';
    if (d.includes('оптометрист')) return 'optometrist';
    if (d.includes('5/2')) return 'manager_5_2';
    if (d.includes('2/2')) return 'manager_2_2';
    if (d.includes('универсал')) return 'universal_manager';
    if (d.includes('менеджер') || d.includes('продавец') || d.includes('консультант')) return 'manager';
    if (d.includes('кассир')) return 'other';
    return 'other';
  };

  const findEmployeeIdByTgUsername = async (req, tgUsername) => {
    if (!tgUsername) return null;
    const username = String(tgUsername).trim();
    if (!username) return null;

    // Try own data first when not in frappe mode
    if (ORG_DATA_SOURCE !== 'frappe') {
      try {
        const result = await orgData.findEmployeeByTgUsername(username);
        const emp = result?.data?.[0];
        if (emp?.name) return String(emp.name);
      } catch (e) {
        loggerWithUser.warn(req, 'Own data error in findEmployeeIdByTgUsername', { error: e.message, username });
      }
      if (ORG_DATA_SOURCE !== 'dual') return null;
    }

    // Frappe fallback
    if (!FRAPPE_BASE_URL || !FRAPPE_API_KEY || !FRAPPE_API_SECRET) return null;

    const url = `${FRAPPE_BASE_URL}/api/resource/Employee?filters=[["status","=","Active"],["custom_tg_username","=","${username}"]]&fields=["name"]&limit_page_length=1`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      loggerWithUser.error(req, 'Frappe error searching employee by tg username', { status: response.status, body: text });
      return null;
    }

    const result = await response.json().catch(() => ({}));
    const employeeId = Array.isArray(result?.data) && result.data[0]?.name ? String(result.data[0].name) : null;
    return employeeId;
  };

  const getLatestEmployeeImageFileUrl = async (req, employeeId) => {
    // Pick most recent public File attached to this employee (and preferably to image field)
    const filters = [
      '["attached_to_doctype","=","Employee"]',
      `["attached_to_name","=","${employeeId}"]`
    ];

    const url = `${FRAPPE_BASE_URL}/api/resource/File?filters=[${filters.join(',')}]&fields=["file_url","attached_to_field","creation","modified","name"]&order_by=creation desc&limit_page_length=5`;
    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
        'Content-Type': 'application/json',
      }
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      loggerWithUser.warn(req, 'Frappe failed to list File for employee', { status: resp.status, body: text, employeeId });
      return null;
    }

    const data = await resp.json().catch(() => ({}));
    const items = Array.isArray(data?.data) ? data.data : [];
    // Prefer files attached specifically to Employee.image field, otherwise just newest
    const preferred = items.find((it) => String(it?.attached_to_field || '') === 'image') || items[0];
    return preferred?.file_url ? String(preferred.file_url) : null;
  };

  const getShiftFormatKind = (rawId) => {
    const id = rawId ? String(rawId).trim() : '';
    if (!id) return null;
    if (id === SHIFT_ID_2_2) return '2/2';
    if (id === SHIFT_ID_5_2) return '5/2';
    return null;
  };

  const resolveCurrentEmployeeId = async (req) => {
    let employeeId = extractEmployeeIdFromEmployeename(req.user?.employeename);
    if (!employeeId && req.user?.tg_username) {
      employeeId = await findEmployeeIdByTgUsername(req, req.user.tg_username);
    }
    return employeeId || null;
  };

  const listEmployeeImageFiles = async (req, employeeId, limit = 30) => {
    const filters = [
      '["attached_to_doctype","=","Employee"]',
      `["attached_to_name","=","${employeeId}"]`
    ];

    const url = `${FRAPPE_BASE_URL}/api/resource/File?filters=[${filters.join(',')}]&fields=["file_url","file_name","attached_to_field","creation","name","is_private"]&order_by=creation desc&limit_page_length=${limit}`;
    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
        'Content-Type': 'application/json',
      }
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      loggerWithUser.warn(req, 'Frappe failed to list File for employee', { status: resp.status, body: text, employeeId });
      return [];
    }

    const data = await resp.json().catch(() => ({}));
    const items = Array.isArray(data?.data) ? data.data : [];
    const uniq = new Set();
    const out = [];

    for (const it of items) {
      const fileDocName = it?.name ? String(it.name).trim() : '';
      const fileUrl = it?.file_url ? String(it.file_url).trim() : '';
      if (!fileUrl) continue;
      const fileName = it?.file_name ? String(it.file_name).trim() : '';
      // Deduplicate by File docname (not file_url) so history keeps multiple uploads even if file_url collides
      const uniqKey = fileDocName || fileUrl;
      if (uniq.has(uniqKey)) continue;
      uniq.add(uniqKey);
      out.push({
        file_url: fileUrl,
        file_name: fileName || undefined,
        creation: it?.creation ? String(it.creation) : undefined,
        name: fileDocName || undefined,
      });
    }

    return out;
  };
  
  // Проксирование изображений и вложений БЕЗ авторизации
  app.get('/api/outline/attachments/redirect', async (req, res) => {
    try {
      const { id, url } = req.query;
      
      // Поддерживаем оба варианта: id (новый) и url (старый)
      if (!id && !url) {
        logger.error('Missing attachment ID or URL parameter');
        return res.status(400).json({ error: 'ID or URL parameter is required' });
      }

      if (!OUTLINE_API_KEY) {
        logger.error('Outline API key not configured');
        return res.status(500).json({ error: 'Outline API key not configured' });
      }

      let targetUrl = url;
      
      if (id) {
        // Если передан ID, формируем URL для Outline API
        targetUrl = `${OUTLINE_BASE_URL}/api/attachments.redirect?id=${encodeURIComponent(id)}`;
      }

      logger.info('Проксирование изображения', { id, targetUrl });

      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${OUTLINE_API_KEY}`,
          'User-Agent': 'Staff-Focus-App/1.0',
        }
      });
      
      if (!response.ok) {
        logger.error('Failed to fetch image', {
          status: response.status,
          statusText: response.statusText,
          url: targetUrl,
          id: id
        });
        return res.status(response.status).json({ 
          error: 'Failed to fetch image',
          details: response.statusText,
          status: response.status
        });
      }

      // Получаем тип контента для правильного отображения
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const contentLength = response.headers.get('content-length');
      
      // Устанавливаем заголовки для кэширования
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=3600'); // Кэшируем на 1 час
      
      if (contentLength) {
        res.setHeader('Content-Length', contentLength);
      }

      // Передаем содержимое
      const buffer = await response.arrayBuffer();
      logger.info('Изображение успешно загружено', {
        id: id,
        contentType: contentType,
        size: buffer.byteLength
      });
      
      res.send(Buffer.from(buffer));
    } catch (error) {
      logger.error(error.message, {
        context: 'proxying image',
        id: req.query.id,
        url: req.query.url
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Outline API endpoints
  /**
   * @swagger
   * /api/outline/collections:
   *   get:
   *     summary: Получение списка коллекций
   *     description: Получает список всех коллекций из Outline Wiki
   *     tags: [Outline API]
   *     security:
   *       - BearerAuth: []
   *     responses:
   *       200:
   *         description: Список коллекций успешно получен
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: string
   *                       name:
   *                         type: string
   *                       description:
   *                         type: string
   *       401:
   *         description: Не авторизован
   *       500:
   *         description: Внутренняя ошибка сервера
   */
  app.get('/api/outline/collections', requireAuth, async (req, res) => {
    try {
      if (!OUTLINE_API_KEY) {
        console.error('❌ Outline API key not configured');
        return res.status(500).json({ error: 'Outline API key not configured' });
      }

      const url = `${OUTLINE_BASE_URL}/api/collections.list`;
      const body = JSON.stringify({ offset: 0, limit: 100 });
      console.log(`🔗 Запрос к Outline API (collections.list): ${url}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OUTLINE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Outline API error (collections.list):', {
          status: response.status,
          statusText: response.statusText,
          url,
          body,
          responseBody: errorText,
        });
        return res.status(response.status).json({
          error: 'Failed to fetch collections',
          details: response.statusText,
          status: response.status,
        });
      }

      const data = await response.json();
      console.log('✅ Получены коллекции из Outline:', { count: data.data?.length || 0 });
      res.json(data);
    } catch (error) {
      console.error('❌ Error fetching collections:', {
        message: error.message,
        stack: error.stack,
        url: `${OUTLINE_BASE_URL}/api/collections.list`,
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Получение информации о конкретной коллекции
  app.get('/api/outline/collection/:collectionId', requireAuth, async (req, res) => {
    try {
      const { collectionId } = req.params;

      if (!OUTLINE_API_KEY) {
        console.error('❌ Outline API key not configured');
        return res.status(500).json({ error: 'Outline API key not configured' });
      }

      const url = `${OUTLINE_BASE_URL}/api/collections.info`;
      const body = JSON.stringify({ id: collectionId });
      console.log(`🔗 Запрос к Outline API (collections.info): ${url}`, { collectionId });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OUTLINE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Outline API error (collections.info):', {
          status: response.status,
          statusText: response.statusText,
          url,
          collectionId,
          body,
          responseBody: errorText,
        });
        return res.status(response.status).json({
          error: 'Failed to fetch collection',
          details: response.statusText,
          status: response.status,
        });
      }

      const data = await response.json();
      console.log('✅ Получена коллекция из Outline:', {
        collectionId,
        name: data.data?.name,
      });
      res.json(data);
    } catch (error) {
      console.error('❌ Error fetching collection:', {
        message: error.message,
        stack: error.stack,
        collectionId: req.params.collectionId,
        url: `${OUTLINE_BASE_URL}/api/collections.info`,
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/outline/documents', requireAuth, async (req, res) => {
    if (!OUTLINE_API_KEY) {
      logger.error('Outline API key not configured');
      return res.status(500).json({ error: 'Outline API key not configured' });
    }

    const url = `${OUTLINE_BASE_URL}/api/documents.list`;
    const body = JSON.stringify({
      offset: 0,
      limit: 100,
      sort: "updatedAt",
      direction: "DESC"
    });
    logger.info('Запрос к Outline API', { url });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OUTLINE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: body
    });

    if (!response.ok) {
      const errorText = await response.text();
      loggerWithUser.error(req, 'Outline API error', {
        status: response.status,
        statusText: response.statusText,
        url: url,
        body: body,
        headers: Object.fromEntries(response.headers.entries()),
        responseBody: errorText
      });
      return res.status(response.status).json({ 
        error: 'Failed to fetch documents',
        details: response.statusText,
        status: response.status
      });
    }

    const data = await response.json();
    
    // Фильтруем документы, начинающиеся с дефиса
    if (data.data && Array.isArray(data.data)) {
      const originalCount = data.data.length;
      data.data = filterHiddenDocuments(data.data);
      loggerWithUser.info(req, 'Получены документы из Outline', {
        count: data.data.length,
        filteredOut: originalCount - data.data.length,
        url: url
      });
    } else {
      loggerWithUser.info(req, 'Получены документы из Outline', {
        count: data.data?.length || 0,
        url: url
      });
    }
    
    res.json(data);
  });

  // Получение конкретного документа
  app.get('/api/outline/documents/:documentId', requireAuth, async (req, res) => {
    const { documentId } = req.params;
    
    if (!OUTLINE_API_KEY) {
      loggerWithUser.error(req, 'Outline API key not configured');
      return res.status(500).json({ error: 'Outline API key not configured' });
    }

    const url = `${OUTLINE_BASE_URL}/api/documents.info`;
    const body = JSON.stringify({ id: documentId });
    loggerWithUser.info(req, 'Запрос к Outline API', { url });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OUTLINE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: body
    });

    if (!response.ok) {
      const errorText = await response.text();
      loggerWithUser.error(req, 'Outline API error', {
        status: response.status,
        statusText: response.statusText,
        url: url,
        documentId: documentId,
        body: body,
        headers: Object.fromEntries(response.headers.entries()),
        responseBody: errorText
      });
      return res.status(response.status).json({ 
        error: 'Failed to fetch document',
        details: response.statusText,
        status: response.status
      });
    }

    const data = await response.json();
    loggerWithUser.info(req, 'Получен документ из Outline', {
      documentId: documentId,
      title: data.data?.title,
      url: url
    });
    res.json(data);
  });

  // Поиск документов
  /**
   * @swagger
   * /api/outline/search:
   *   post:
   *     summary: Поиск документов
   *     description: Поиск документов в Outline Wiki по тексту
   *     tags: [Outline API]
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - query
   *             properties:
   *               query:
   *                 type: string
   *                 description: Поисковый запрос
   *                 example: "API документация"
   *               includeArchived:
   *                 type: boolean
   *                 description: Включать ли архивные документы
   *                 default: false
   *               includeDrafts:
   *                 type: boolean
   *                 description: Включать ли черновики
   *                 default: false
   *     responses:
   *       200:
   *         description: Результаты поиска
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: object
   *                   properties:
   *                     results:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           document:
   *                             type: object
   *                           context:
   *                             type: string
   *                           ranking:
   *                             type: number
   *                     totalCount:
   *                       type: number
   *       400:
   *         description: Неверный запрос
   *       401:
   *         description: Не авторизован
   *       500:
   *         description: Внутренняя ошибка сервера
   */
  app.post('/api/outline/search', requireAuth, async (req, res) => {
    const { query, includeArchived = false, includeDrafts = false } = req.body;
    
    if (!OUTLINE_API_KEY) {
      loggerWithUser.error(req, 'Outline API key not configured');
      return res.status(500).json({ error: 'Outline API key not configured' });
    }

    if (!query || query.length < 2) {
      loggerWithUser.error(req, 'Search query too short', { query, length: query?.length });
      return res.status(400).json({ error: 'Search query must be at least 2 characters long' });
    }

    const url = `${OUTLINE_BASE_URL}/api/documents.search`;
    const body = JSON.stringify({ 
      query, 
      includeArchived, 
      includeDrafts,
      offset: 0,
      limit: 100
    });
    loggerWithUser.info(req, 'Запрос к Outline API', { url, query, includeArchived, includeDrafts });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OUTLINE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: body
    });

    if (!response.ok) {
      const errorText = await response.text();
      loggerWithUser.error(req, 'Outline API error', {
        status: response.status,
        statusText: response.statusText,
        url: url,
        query: query,
        body: body,
        headers: Object.fromEntries(response.headers.entries()),
        responseBody: errorText
      });
      return res.status(response.status).json({ 
        error: 'Failed to search documents',
        details: response.statusText,
        status: response.status
      });
    }

    const data = await response.json();
    
    // Преобразуем структуру ответа Outline API в ожидаемую структуру
    const transformedData = {
      data: {
        results: data.data?.map(item => ({
          document: item.document,
          context: item.context,
          ranking: item.ranking
        })) || [],
        totalCount: data.pagination?.total || 0
      }
    };
    
    // Фильтруем результаты поиска, исключая документы, начинающиеся с дефиса
    if (transformedData.data.results && Array.isArray(transformedData.data.results)) {
      const originalCount = transformedData.data.results.length;
      transformedData.data.results = transformedData.data.results.filter(item => {
        if (!item.document) return false;
        // Проверяем, содержит ли название дефис в начале (после возможных скобок и пробелов)
        const cleanTitle = item.document.title.trim();
        // Ищем дефис в начале названия или после открывающих скобок
        return !cleanTitle.match(/^[([{\s]*-/);
      });
      transformedData.data.totalCount = transformedData.data.results.length;
      loggerWithUser.info(req, 'Результаты поиска в Outline', {
        query: query,
        totalCount: transformedData.data.totalCount,
        resultsCount: transformedData.data.results.length,
        filteredOut: originalCount - transformedData.data.results.length,
        url: url
      });
    } else {
      loggerWithUser.info(req, 'Результаты поиска в Outline', {
        query: query,
        totalCount: transformedData.data.totalCount,
        resultsCount: transformedData.data.results.length,
        url: url
      });
    }
    
    res.json(transformedData);
  });

  // Получение содержимого документа
  app.get('/api/outline/documents/:documentId/content', requireAuth, async (req, res) => {
    const { documentId } = req.params;
    
    if (!OUTLINE_API_KEY) {
      loggerWithUser.error(req, '❌ Outline API key not configured');
      return res.status(500).json({ error: 'Outline API key not configured' });
    }

    const url = `${OUTLINE_BASE_URL}/api/documents.export`;
    const body = JSON.stringify({ 
      id: documentId
    });
    loggerWithUser.info(req, 'Запрос к Outline API', { url });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OUTLINE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: body
    });

    if (!response.ok) {
      const errorText = await response.text();
      loggerWithUser.error(req, 'Outline API error', {
        status: response.status,
        statusText: response.statusText,
        url: url,
        documentId: documentId,
        body: body,
        headers: Object.fromEntries(response.headers.entries()),
        responseBody: errorText
      });
      return res.status(response.status).json({ 
        error: 'Failed to fetch document content',
        details: response.statusText,
        status: response.status
      });
    }

    // Проверяем тип контента
    const contentType = response.headers.get('content-type') || '';
    let content;
    
    if (contentType.includes('application/json')) {
      // Если JSON, извлекаем из data.data
      const jsonData = await response.json();
      content = jsonData.data || jsonData;
    } else {
      // Если текст, просто читаем
      content = await response.text();
    }
    
    // Заменяем \n на реальные переносы строк если это строка
    if (typeof content === 'string') {
      content = content.replace(/\\n/g, '\n');
    }
    
    loggerWithUser.info(req, 'Получено содержимое документа из Outline', {
      documentId: documentId,
      contentLength: content.length,
      contentType: contentType,
      url: url
    });
    res.send(content);
  });

  // Получение структуры коллекции с иерархией документов
  app.get('/api/outline/collections/:collectionId/documents', requireAuth, async (req, res) => {
    const { collectionId } = req.params;
    
    if (!OUTLINE_API_KEY) {
      loggerWithUser.error(req, '❌ Outline API key not configured');
      return res.status(500).json({ error: 'Outline API key not configured' });
    }

    const url = `${OUTLINE_BASE_URL}/api/collections.documents`;
    const body = JSON.stringify({ 
      id: collectionId
    });
    loggerWithUser.info(req, 'Запрос к Outline API для получения структуры коллекции', { 
      url, 
      collectionId 
    });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OUTLINE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: body
    });

    if (!response.ok) {
      const errorText = await response.text();
      loggerWithUser.error(req, 'Outline API error при получении структуры коллекции', {
        status: response.status,
        statusText: response.statusText,
        url: url,
        collectionId: collectionId,
        body: body,
        responseBody: errorText
      });
      return res.status(response.status).json({ 
        error: 'Failed to fetch collection structure',
        details: response.statusText,
        status: response.status
      });
    }

    const data = await response.json();
    
    // Фильтруем скрытые документы (начинающиеся с дефиса)
    const filterHiddenDocuments = (documents) => {
      return documents.filter(doc => {
        const cleanTitle = doc.title.trim();
        return !cleanTitle.match(/^[([{\s]*-/);
      }).map(doc => ({
        ...doc,
        children: doc.children ? filterHiddenDocuments(doc.children) : []
      }));
    };

    const filteredData = {
      data: filterHiddenDocuments(data.data || [])
    };
    
    loggerWithUser.info(req, 'Получена структура коллекции из Outline', {
      collectionId: collectionId,
      documentsCount: filteredData.data.length,
      url: url
    });
    
    res.json(filteredData);
  });

  // Поиск сотрудников
  app.get('/api/frappe/employees/search', requireAuth, async (req, res) => {
    const { query: queryStr, department, limit = 10 } = req.query;

    // ── PostgreSQL path ──
    if (ORG_DATA_SOURCE !== 'frappe') {
      try {
        const result = await orgData.searchEmployees({ queryStr, department, limit: Number(limit) });
        loggerWithUser.info(req, 'Поиск сотрудников выполнен (PG)', { query: queryStr, department, count: result.data?.length || 0 });
        return res.json(result);
      } catch (error) {
        loggerWithUser.error(req, 'Ошибка поиска сотрудников (PG)', { error: error.message });
        if (ORG_DATA_SOURCE === 'dual') { /* fallthrough to Frappe */ } else {
          return res.status(500).json({ error: 'Failed to search employees' });
        }
      }
    }

    // ── Frappe path (original) ──
    if (!FRAPPE_API_KEY || !FRAPPE_API_SECRET) {
      loggerWithUser.warn(req, 'Frappe API credentials not configured');
      return res.json({ data: [] });
    }

    try {
      let filters = ['["status","=","Active"]'];

      if (department) {
        filters.push(`["department","=","${department}"]`);
      }

      if (queryStr) {
        filters.push(`["employee_name","like","%${queryStr}%"]`);
      }

      const url = `${FRAPPE_BASE_URL}/api/resource/Employee?filters=[${filters.join(',')}]&fields=["user_id", "custom_itigris_user_id", "designation", "employee_name", "custom_tg_username", "custom_employee_shift_format", "reports_to", "name", "department", "image", "company_email"]&limit_page_length=${limit}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Frappe API error: ${response.status}`);
      }

      const result = await response.json();
      loggerWithUser.info(req, 'Поиск сотрудников выполнен', { query: queryStr, department, count: result.data?.length || 0 });
      res.json(result);
    } catch (error) {
      loggerWithUser.error(req, 'Ошибка поиска сотрудников', { error: error.message, query: queryStr, department });
      res.status(500).json({ error: 'Failed to search employees' });
    }
  });

  // --- Employees by stores (for manager ranking table) ---
  app.get('/api/frappe/employees/by-stores', requireAuth, async (req, res) => {
    const { store_id, department_id } = req.query || {};
    const store_ids = req.query?.store_ids;
    const department_ids = req.query?.department_ids;
    const limitRaw = req.query?.limit;
    const onlyManagersRaw = req.query?.only_managers;

    const limit = Math.max(1, Math.min(1000, parseInt(String(limitRaw ?? '200'), 10) || 200));
    const onlyManagers = String(onlyManagersRaw ?? 'false').toLowerCase() === 'true';

    const normalizeList = (v) => {
      if (Array.isArray(v)) return v.map((x) => String(x)).filter(Boolean);
      if (v === undefined || v === null) return [];
      return [String(v)].filter(Boolean);
    };

    const requestedStoreIds = Array.from(new Set([
      ...normalizeList(store_id),
      ...normalizeList(store_ids),
    ])).map((s) => s.trim()).filter(Boolean);

    const requestedDepartmentIds = Array.from(new Set([
      ...normalizeList(department_id),
      ...normalizeList(department_ids),
    ])).map((s) => s.trim()).filter(Boolean);

    try {
      res.setHeader('Cache-Control', 'no-store');

      // ── PostgreSQL path ──
      if (ORG_DATA_SOURCE !== 'frappe') {
        try {
          let items = [];
          if (requestedStoreIds.length > 0) {
            items = await orgData.getEmployeesByStoreIds(requestedStoreIds, { limit, onlyManagers });
          } else if (requestedDepartmentIds.length > 0) {
            const allItems = [];
            for (const deptId of requestedDepartmentIds) {
              const deptResult = await orgData.getEmployeesByDepartmentId(deptId);
              const deptItems = Array.isArray(deptResult?.data) ? deptResult.data : [];
              allItems.push(...deptItems);
            }
            items = allItems.slice(0, limit);
            if (onlyManagers) {
              const managerRe = /менеджер/i;
              items = items.filter((e) => managerRe.test(String(e?.designation || '')));
            }
          } else {
            return res.status(400).json({
              error: 'No department ids resolved',
              details: 'Provide department_id(s) or store_id(s) that can be mapped to departments',
            });
          }

          loggerWithUser.info(req, 'Получены сотрудники по филиалам (PG)', {
            requestedStoreIdsCount: requestedStoreIds.length,
            departmentIdsCount: requestedDepartmentIds.length,
            count: items.length, onlyManagers,
          });

          if (ORG_DATA_SOURCE === 'dual') {
            // Fire-and-forget: also fetch from Frappe and compare
            (async () => {
              try {
                // simplified comparison — just count
                const empId = await resolveCurrentEmployeeId(req);
                if (!empId) return;
                loggerWithUser.info(req, 'Dual-read by-stores: PG returned ' + items.length + ' employees');
              } catch { /* ignore dual-read errors */ }
            })();
          }

          return res.json({ data: items });
        } catch (pgErr) {
          loggerWithUser.error(req, 'PG error in employees/by-stores', { error: pgErr.message });
          if (ORG_DATA_SOURCE === 'dual') { /* fallthrough to Frappe */ } else {
            return res.status(500).json({ error: 'Database error', details: pgErr.message });
          }
        }
      }

      // ── Frappe path ──
      if (!FRAPPE_API_KEY || !FRAPPE_API_SECRET) {
        loggerWithUser.error(req, 'Frappe API credentials not configured');
        return res.status(500).json({ error: 'Frappe API credentials not configured' });
      }

      let departmentIdList = requestedDepartmentIds;
      let storeToDepartment = new Map();

      if (departmentIdList.length === 0 && requestedStoreIds.length > 0) {
        const employeeId = await resolveCurrentEmployeeId(req);
        if (!employeeId) {
          return res.status(400).json({ error: 'Cannot resolve employeeId for current user' });
        }

        const methodUrl = `${FRAPPE_BASE_URL}/api/method/loovis_get_employee_role`;
        const frappeResp = await fetch(methodUrl, {
          method: 'POST',
          headers: {
            'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ employee_id: employeeId })
        });

        const text = await frappeResp.text().catch(() => '');
        let json;
        try { json = JSON.parse(text); } catch { json = null; }

        if (!frappeResp.ok) {
          loggerWithUser.error(req, 'Frappe loovis_get_employee_role error (by-stores)', {
            status: frappeResp.status, statusText: frappeResp.statusText, body: text, employee_id: employeeId,
          });
          return res.status(frappeResp.status).json({ error: 'Frappe API error', details: text });
        }

        const data = json?.data || json?.message || json || {};
        storeToDepartment = new Map();
        const walk = (nodes) => {
          if (!Array.isArray(nodes)) return;
          for (const n of nodes) {
            const storeId = n?.custom_store_id != null ? String(n.custom_store_id).trim() : '';
            const depId = n?.id != null ? String(n.id).trim() : '';
            if (storeId && depId) {
              if (!storeToDepartment.has(storeId)) storeToDepartment.set(storeId, depId);
            }
            walk(n?.sub_departments);
          }
        };
        walk(data?.departments);

        departmentIdList = requestedStoreIds
          .map((sid) => storeToDepartment.get(sid))
          .filter(Boolean);
      }

      departmentIdList = Array.from(new Set(departmentIdList)).filter(Boolean);

      if (departmentIdList.length === 0) {
        return res.status(400).json({
          error: 'No department ids resolved',
          details: 'Provide department_id(s) or store_id(s) that can be mapped to departments',
        });
      }

      const filters = [["status","=","Active"], ["department","in", departmentIdList]];
      const fields = ["user_id", "custom_itigris_user_id", "designation", "employee_name", "custom_tg_username", "reports_to", "name", "department", "image", "company_email"];
      const url = `${FRAPPE_BASE_URL}/api/resource/Employee?filters=${encodeURIComponent(JSON.stringify(filters))}&fields=${encodeURIComponent(JSON.stringify(fields))}&limit_page_length=${limit}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`, 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        loggerWithUser.error(req, 'Frappe error fetching employees by stores', { status: response.status, body });
        return res.status(response.status).json({ error: 'Frappe API error', details: body });
      }

      const result = await response.json();
      let items = Array.isArray(result?.data) ? result.data : [];

      if (requestedStoreIds.length > 0 && storeToDepartment && storeToDepartment.size > 0) {
        const departmentToStore = new Map();
        for (const sid of requestedStoreIds) {
          const dep = storeToDepartment.get(sid);
          if (dep && !departmentToStore.has(dep)) departmentToStore.set(dep, sid);
        }
        items = items.map((e) => {
          const dep = e?.department != null ? String(e.department).trim() : '';
          const store_id_resolved = dep ? departmentToStore.get(dep) : undefined;
          return store_id_resolved ? { ...e, store_id: store_id_resolved } : e;
        });
      }

      if (onlyManagers) {
        const managerRe = /менеджер/i;
        items = items.filter((e) => {
          const designation = e?.designation != null ? String(e.designation) : '';
          return managerRe.test(designation);
        });
      }

      loggerWithUser.info(req, 'Получены сотрудники по филиалам', {
        requestedStoreIdsCount: requestedStoreIds.length, departmentIdsCount: departmentIdList.length,
        count: items.length, onlyManagers,
      });

      return res.json({ data: items });
    } catch (error) {
      loggerWithUser.error(req, 'Ошибка получения сотрудников по филиалам', { error: error.message });
      return res.status(500).json({ error: 'Failed to fetch employees by stores', details: error.message });
    }
  });

  /**
   * @swagger
   * /api/frappe/employees/{employeeId}:
   *   get:
   *     summary: Получение сотрудника по ID
   *     description: Получает информацию о сотруднике по его ID в Frappe
   *     tags: [Frappe API]
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: path
   *         name: employeeId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID сотрудника в Frappe
   *         example: "EMP001"
   *     responses:
   *       200:
   *         description: Информация о сотруднике
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: object
   *                   properties:
   *                     employee_name:
   *                       type: string
   *                     designation:
   *                       type: string
   *                     department:
   *                       type: string
   *                     custom_tg_username:
   *                       type: string
   *       401:
   *         description: Не авторизован
   *       404:
   *         description: Сотрудник не найден
   *       500:
   *         description: Внутренняя ошибка сервера
   */
  app.get('/api/frappe/employees/:employeeId', requireAuth, async (req, res) => {
    const { employeeId } = req.params;

    // ── PostgreSQL path ──
    if (ORG_DATA_SOURCE !== 'frappe') {
      try {
        const result = await orgData.findEmployeeById(employeeId);
        loggerWithUser.info(req, 'Получен сотрудник по ID (PG)', { employeeId, employeeName: result.data?.employee_name });
        return res.json(result);
      } catch (error) {
        loggerWithUser.error(req, 'Ошибка получения сотрудника по ID (PG)', { error: error.message, employeeId });
        if (ORG_DATA_SOURCE === 'dual') { /* fallthrough to Frappe */ } else {
          return res.status(500).json({ error: 'Failed to fetch employee' });
        }
      }
    }

    // ── Frappe path (original) ──
    if (!FRAPPE_API_KEY || !FRAPPE_API_SECRET) {
      loggerWithUser.warn(req, 'Frappe API credentials not configured');
      return res.json({ data: [] });
    }

    try {
      const url = `${FRAPPE_BASE_URL}/api/resource/Employee/${encodeURIComponent(employeeId)}?fields=["user_id", "custom_itigris_user_id", "designation", "employee_name", "custom_tg_username", "custom_employee_shift_format", "reports_to", "name", "department", "image", "company_email"]`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Frappe API error: ${response.status}`);
      }

      const result = await response.json();
      // Derive schedule kind from linked ID and strip the raw ID from response.
      if (result?.data?.custom_employee_shift_format) {
        const kind = getShiftFormatKind(result.data.custom_employee_shift_format);
        if (kind) result.data.custom_employee_shift_format_kind = kind;
        delete result.data.custom_employee_shift_format;
      }
      loggerWithUser.info(req, 'Получен сотрудник по ID', { employeeId, employeeName: result.data?.employee_name });
      res.json(result);
    } catch (error) {
      loggerWithUser.error(req, 'Ошибка получения сотрудника по ID', { error: error.message, employeeId });
      res.status(500).json({ error: 'Failed to fetch employee' });
    }
  });

  // Получение itigris_user_id по employeeId
  app.get('/api/frappe/employees/:employeeId/itigris-user-id', requireAuth, async (req, res) => {
    const { employeeId } = req.params;

    // Try own data first
    if (ORG_DATA_SOURCE !== 'frappe') {
      try {
        const empResult = await orgData.findEmployeeById(employeeId);
        const itigrisUserId = empResult?.data?.custom_itigris_user_id;
        if (itigrisUserId) {
          return res.json({ itigris_user_id: itigrisUserId });
        }
        if (ORG_DATA_SOURCE !== 'dual') {
          return res.status(404).json({ error: 'itigris_user_id not found' });
        }
      } catch (e) {
        if (ORG_DATA_SOURCE !== 'dual') return res.status(500).json({ error: 'Failed to fetch itigris_user_id', details: e.message });
      }
    }

    if (!FRAPPE_API_KEY || !FRAPPE_API_SECRET) {
      return res.status(500).json({ error: 'Frappe API credentials not configured' });
    }
    try {
      const url = `${FRAPPE_BASE_URL}/api/resource/Employee/${encodeURIComponent(employeeId)}?fields=["custom_itigris_user_id"]`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
          'Content-Type': 'application/json',
        }
      });
      if (!response.ok) {
        return res.status(response.status).json({ error: 'Frappe API error', details: await response.text() });
      }
      const result = await response.json();
      const itigrisUserId = result.data?.custom_itigris_user_id;
      if (!itigrisUserId) {
        return res.status(404).json({ error: 'itigris_user_id not found' });
      }
      res.json({ itigris_user_id: itigrisUserId });
    } catch (error) {
      loggerWithUser.error(req, 'Ошибка получения itigris_user_id', { error: error.message, employeeId });
      res.status(500).json({ error: 'Failed to fetch itigris_user_id', details: error.message });
    }
  });

  // Поиск сотрудника по Telegram username
  app.get('/api/frappe/employees/find-by-telegram/:username', async (req, res) => {
    const { username } = req.params;
    const { chat_id } = req.query; // Получаем chat_id из query параметров

    // ── PostgreSQL path (CRITICAL: auto-fallback to Frappe on error) ──
    if (ORG_DATA_SOURCE !== 'frappe') {
      try {
        res.setHeader('Cache-Control', 'no-store');
        const result = await orgData.findEmployeeByTgUsername(username);
        const employee = result.data && result.data.length > 0 ? result.data[0] : null;

        if (employee && chat_id) {
          const currentChatId = employee.custom_tg_chat_id;
          if (!currentChatId || currentChatId === '') {
            await orgData.updateEmployeeChatId(employee.name, chat_id);
            employee.custom_tg_chat_id = chat_id;
            loggerWithUser.info(req, 'Обновлен tg_chat_id (PG)', { username, employeeName: employee.employee_name, chatId: chat_id });
          }
        }

        if (employee) {
          loggerWithUser.info(req, 'Найден активный сотрудник (PG)', { username, employeeName: employee.employee_name });
          return res.json({ data: employee });
        } else {
          loggerWithUser.info(req, 'Активный сотрудник с Telegram username не найден (PG)', { username });
          return res.json({ data: null });
        }
      } catch (pgError) {
        // CRITICAL: Always fallback to Frappe for auth — never block users
        loggerWithUser.error(req, 'PG error in find-by-telegram, falling back to Frappe', { error: pgError.message, username });
        // fallthrough to Frappe path below
      }
    }

    // ── Frappe path (original) ──
    if (!FRAPPE_API_KEY || !FRAPPE_API_SECRET) {
      loggerWithUser.warn(req, 'Frappe API credentials not configured');
      return res.json({ data: [] });
    }

    try {
      // prevent stale caching on clients (avatar may change often)
      res.setHeader('Cache-Control', 'no-store');
      // Прямой поиск по custom_tg_username
      const url = `${FRAPPE_BASE_URL}/api/resource/Employee?filters=[["status","=","Active"],["custom_tg_username","=","${username}"]]&fields=["user_id", "custom_itigris_user_id", "designation", "employee_name", "custom_tg_username", "custom_employee_shift_format", "custom_tg_chat_id", "reports_to", "name", "department", "image", "company_email"]`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Frappe API error: ${response.status}`);
      }

      const result = await response.json();
      const employee = result.data && result.data.length > 0 ? result.data[0] : null;
      
      if (employee) {
        // Derive schedule kind from linked ID and strip the raw ID from response.
        if (employee.custom_employee_shift_format) {
          const kind = getShiftFormatKind(employee.custom_employee_shift_format);
          if (kind) employee.custom_employee_shift_format_kind = kind;
          delete employee.custom_employee_shift_format;
        }

        // Проверяем и обновляем custom_tg_chat_id если передан chat_id
        if (chat_id) {
          const currentChatId = employee.custom_tg_chat_id;
          
          if (!currentChatId || currentChatId === '') {
            // Если chat_id пустой или null, обновляем его
            try {
              const updateUrl = `${FRAPPE_BASE_URL}/api/resource/Employee/${employee.name}`;
              const updateResponse = await fetch(updateUrl, {
                method: 'PUT',
                headers: {
                  'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ custom_tg_chat_id: chat_id })
              });

              if (updateResponse.ok) {
                loggerWithUser.info(req, 'Обновлен custom_tg_chat_id для сотрудника', { 
                  username, 
                  employeeName: employee.employee_name,
                  oldChatId: currentChatId,
                  newChatId: chat_id 
                });
                // Обновляем данные в объекте employee
                employee.custom_tg_chat_id = chat_id;
              } else {
                loggerWithUser.error(req, 'Ошибка обновления custom_tg_chat_id', { 
                  username, 
                  employeeName: employee.employee_name,
                  chatId: chat_id,
                  status: updateResponse.status 
                });
              }
            } catch (updateError) {
              loggerWithUser.error(req, 'Ошибка при обновлении custom_tg_chat_id', { 
                error: updateError.message, 
                username, 
                employeeName: employee.employee_name,
                chatId: chat_id 
              });
            }
          } else if (currentChatId !== chat_id) {
            // Если chat_id уже есть и отличается от нового, логируем warning
            loggerWithUser.warn(req, 'custom_tg_chat_id уже существует и отличается от нового', { 
              username, 
              employeeName: employee.employee_name,
              currentChatId: currentChatId,
              newChatId: chat_id 
            });
          }
        }
        
        loggerWithUser.info(req, 'Найден активный сотрудник', { username, employeeName: employee.employee_name });
        res.json({ data: employee });
      } else {
        loggerWithUser.info(req, 'Активный сотрудник с Telegram username не найден', { username });
        res.json({ data: null });
      }
    } catch (error) {
      loggerWithUser.error(req, 'Ошибка поиска сотрудника', { error: error.message, username });
      res.status(500).json({ error: 'Failed to find employee' });
    }
  });

  // Получение руководителя по ID сотрудника
  app.get('/api/frappe/employees/:employeeId/manager', requireAuth, async (req, res) => {
    const { employeeId } = req.params;

    // ── PostgreSQL path ──
    if (ORG_DATA_SOURCE !== 'frappe') {
      try {
        const result = await orgData.getEmployeeManager(employeeId);
        loggerWithUser.info(req, 'Получен руководитель (PG)', { employeeId, managerName: result.data?.employee_name });
        return res.json(result);
      } catch (error) {
        loggerWithUser.error(req, 'PG error in employee manager', { error: error.message, employeeId });
        if (ORG_DATA_SOURCE === 'dual') { /* fallthrough to Frappe */ } else {
          return res.status(500).json({ error: 'Failed to fetch manager' });
        }
      }
    }

    // ── Frappe path ──
    if (!FRAPPE_API_KEY || !FRAPPE_API_SECRET) {
      loggerWithUser.warn(req, 'Frappe API credentials not configured');
      return res.json({ data: [] });
    }

    try {
      const url = `${FRAPPE_BASE_URL}/api/resource/Employee/${employeeId}?fields=["user_id", "custom_itigris_user_id", "designation", "employee_name", "custom_tg_username", "custom_employee_shift_format", "image"]`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Frappe API error: ${response.status}`);
      }

      const result = await response.json();
      loggerWithUser.info(req, 'Получен руководитель из Frappe', { employeeId, managerName: result.data?.employee_name });
      res.json(result);
    } catch (error) {
      loggerWithUser.error(req, 'Ошибка получения руководителя', { error: error.message, employeeId });
      res.status(500).json({ error: 'Failed to fetch manager' });
    }
  });

  /**
   * @swagger
   * /api/frappe/employees/{employeeId}/tasks:
   *   get:
   *     summary: Получение задач для сотрудника
   *     description: Получает список задач для конкретного сотрудника
   *     tags: [Frappe API]
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: path
   *         name: employeeId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID сотрудника в Frappe
   *         example: "EMP001"
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [all, Open, Completed]
   *         description: Фильтр по статусу задач
   *         example: "all"
   *       - in: query
   *         name: role
   *         schema:
   *           type: string
   *           enum: [all, assignee, author]
   *         description: Фильтр по роли в задаче
   *         example: "all"
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: Поиск по названию задачи
   *         example: "API"
   *       - in: query
   *         name: days
   *         schema:
   *           type: string
   *         description: Количество дней для фильтрации (задачи за последние N дней)
   *         example: "7"
   *     responses:
   *       200:
   *         description: Список задач
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       name:
   *                         type: string
   *                       subject:
   *                         type: string
   *                       status:
   *                         type: string
   *                       creation:
   *                         type: string
   *                       completed_on:
   *                         type: string
   *       401:
   *         description: Не авторизован
   *       500:
   *         description: Внутренняя ошибка сервера
   */
  app.get('/api/frappe/employees/:employeeId/tasks', requireAuth, async (req, res) => {
    const { employeeId } = req.params;
    const { status = 'all', role = 'all', search = '', days = '' } = req.query;
    
    if (!FRAPPE_API_KEY || !FRAPPE_API_SECRET) {
      loggerWithUser.warn(req, 'Frappe API credentials not configured, returning empty tasks');
      return res.json({ data: [] });
    }

    try {
      let filters = [];
      
      // Фильтр по статусу
      if (status === 'Open') {
        filters.push('["status","=","Open"]');
      } else if (status === 'Completed') {
        filters.push('["status","=","Completed"]');
      }
      
      // Фильтр по роли
      if (role === 'assignee') {
        filters.push(`["custom_assignee_employee","=","${employeeId}"]`);
      } else if (role === 'author') {
        filters.push(`["custom_author_employee","=","${employeeId}"]`);
      } else {
        // Для 'all' - получаем задачи где сотрудник либо исполнитель, либо автор
        filters.push(`["custom_assignee_employee","=","${employeeId}"]`);
      }

      // Фильтр по дате (задачи за последние N дней)
      if (days && !isNaN(parseInt(days))) {
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(days));
        const dateFilter = daysAgo.toISOString().split('T')[0]; // YYYY-MM-DD формат
        filters.push(`["creation",">=","${dateFilter}"]`);
      }

      const fields = '["name", "subject", "status", "custom_assignee_employee", "custom_author_employee", "description", "creation", "modified", "completed_on"]';
      const orderBy = 'creation desc';
      
      let url = `${FRAPPE_BASE_URL}/api/resource/Task?filters=[${filters.join(',')}]&fields=${fields}&order_by=${orderBy}`;
      
      // Добавляем поиск если указан
      if (search) {
        url += `&filters=[${filters.join(',')},["subject","like","%${search}%"]]`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Frappe API error: ${response.status}`);
      }

      const result = await response.json();
      
      // Если role === 'all', получаем также задачи где сотрудник автор
      if (role === 'all') {
        const authorFilters = filters.filter(f => !f.includes('custom_assignee_employee'));
        authorFilters.push(`["custom_author_employee","=","${employeeId}"]`);
        
        const authorUrl = `${FRAPPE_BASE_URL}/api/resource/Task?filters=[${authorFilters.join(',')}]&fields=${fields}&order_by=${orderBy}`;
        const authorResponse = await fetch(authorUrl, {
          method: 'GET',
          headers: {
            'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
            'Content-Type': 'application/json',
          }
        });

        if (authorResponse.ok) {
          const authorResult = await authorResponse.json();
          // Объединяем результаты и убираем дубликаты
          const allTasks = [...result.data, ...authorResult.data];
          const uniqueTasks = allTasks.filter((task, index, self) => 
            index === self.findIndex(t => t.name === task.name)
          );
          result.data = uniqueTasks.sort((a, b) => new Date(b.creation).getTime() - new Date(a.creation).getTime());
        }
      }

      loggerWithUser.info(req, 'Получены задачи из Frappe', { 
        employeeId, 
        taskStatus: status, 
        role, 
        days,
        count: result.data?.length || 0 
      });
      res.json(result);
    } catch (error) {
      loggerWithUser.error(req, 'Ошибка получения задач', { error: error.message, employeeId });
      res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  });

  // Обновление статуса задачи
  app.put('/api/frappe/tasks/:taskName/status', requireAuth, async (req, res) => {
    const { taskName } = req.params;
    const { status } = req.body;
    
    if (!FRAPPE_API_KEY || !FRAPPE_API_SECRET) {
      loggerWithUser.warn(req, 'Frappe API credentials not configured');
      return res.json({ data: [] });
    }

    try {
      const url = `${FRAPPE_BASE_URL}/api/resource/Task/${taskName}`;
      
      // Определяем данные для обновления
      const updateData = { status: status };
      
      // Если задача завершается, проставляем текущую дату (YYYY-MM-DD)
      if (status === 'Completed') {
        updateData.completed_on = new Date().toISOString().split('T')[0];
      } else if (status === 'Open') {
        // Если задача переоткрывается, очищаем поле completed_on (пустая строка надёжнее, чем null)
        updateData.completed_on = '';
      }
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        loggerWithUser.error(req, 'Frappe error updating task status', { status: response.status, body: errorText, url });
        return res.status(response.status).json({ error: 'Frappe API error', status: response.status, details: errorText });
      }

      const result = await response.json();
      loggerWithUser.info(req, 'Статус задачи обновлен', { taskName, taskStatus: status });
      res.json(result);
    } catch (error) {
      loggerWithUser.error(req, 'Ошибка обновления статуса задачи', { error: error.message, taskName, taskStatus: status });
      res.status(500).json({ error: 'Failed to update task status', details: error.message });
    }
  });

  // Получение задачи по имени (ID)
  app.get('/api/frappe/tasks/:taskName', requireAuth, async (req, res) => {
    const { taskName } = req.params;
    if (!FRAPPE_API_KEY || !FRAPPE_API_SECRET) {
      loggerWithUser.warn(req, 'Frappe API credentials not configured');
      return res.json({ data: [] });
    }

    try {
      const url = `${FRAPPE_BASE_URL}/api/resource/Task/${taskName}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return res.status(404).json({ error: 'Task not found' });
        }
        throw new Error(`Frappe API error: ${response.status}`);
      }

      const result = await response.json();
      loggerWithUser.info(req, 'Получена задача по имени', { taskName });
      res.json(result);
    } catch (error) {
      loggerWithUser.error(req, 'Ошибка получения задачи по имени', { error: error.message, taskName });
      res.status(500).json({ error: 'Failed to fetch task' });
    }
  });

  // Создание новой задачи
  app.post('/api/frappe/tasks', requireAuth, async (req, res) => {
    const { subject, description, assigneeId, authorId } = req.body;
    
    if (!FRAPPE_API_KEY || !FRAPPE_API_SECRET) {
      loggerWithUser.warn(req, 'Frappe API credentials not configured');
      return res.json({ data: [] });
    }

    try {
      const taskData = {
        subject: subject,
        description: description || '',
        custom_assignee_employee: assigneeId,
        custom_author_employee: authorId,
        status: 'Open'
      };

      const response = await fetch(`${FRAPPE_BASE_URL}/api/resource/Task`, {
        method: 'POST',
        headers: {
          'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData)
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        loggerWithUser.error(req, 'Frappe error creating task', { status: response.status, body: errorText });
        return res.status(response.status).json({ error: 'Frappe API error', status: response.status, details: errorText });
      }

      const result = await response.json();
      loggerWithUser.info(req, 'Задача создана', { 
        subject, 
        assigneeId, 
        authorId, 
        taskName: result.data?.name 
      });
      res.json(result);
    } catch (error) {
      loggerWithUser.error(req, 'Ошибка создания задачи', { error: error.message, subject, assigneeId, authorId });
      res.status(500).json({ error: 'Failed to create task', details: error.message });
    }
  });

  // Обновление задачи
  app.put('/api/frappe/tasks/:taskName', requireAuth, async (req, res) => {
    const { taskName } = req.params;
    const updates = req.body;
    
    if (!FRAPPE_API_KEY || !FRAPPE_API_SECRET) {
      loggerWithUser.warn(req, 'Frappe API credentials not configured');
      return res.json({ data: [] });
    }

    try {
      const url = `${FRAPPE_BASE_URL}/api/resource/Task/${taskName}`;
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        loggerWithUser.error(req, 'Frappe error updating task', { status: response.status, body: errorText, url });
        return res.status(response.status).json({ error: 'Frappe API error', status: response.status, details: errorText });
      }

      const result = await response.json();
      loggerWithUser.info(req, 'Задача обновлена', { taskName, updates });
      res.json(result);
    } catch (error) {
      loggerWithUser.error(req, 'Ошибка обновления задачи', { error: error.message, taskName, updates });
      res.status(500).json({ error: 'Failed to update task', details: error.message });
    }
  });

  // Получение сотрудников по департаменту
  app.get('/api/frappe/employees/by-department/:department', requireAuth, async (req, res) => {
    const { department } = req.params;
    const { limit = 10 } = req.query;

    // ── PostgreSQL path ──
    if (ORG_DATA_SOURCE !== 'frappe') {
      try {
        const result = await orgData.getEmployeesByDepartmentId(department);
        // Apply limit
        if (result?.data && result.data.length > parseInt(limit)) {
          result.data = result.data.slice(0, parseInt(limit));
        }
        loggerWithUser.info(req, 'Получены сотрудники по департаменту (PG)', { department, count: result.data?.length || 0 });
        return res.json(result);
      } catch (error) {
        loggerWithUser.error(req, 'PG error in employees by department', { error: error.message, department });
        if (ORG_DATA_SOURCE === 'dual') { /* fallthrough to Frappe */ } else {
          return res.status(500).json({ error: 'Failed to fetch employees by department' });
        }
      }
    }

    // ── Frappe path ──
    if (!FRAPPE_API_KEY || !FRAPPE_API_SECRET) {
      loggerWithUser.warn(req, 'Frappe API credentials not configured');
      return res.json({ data: [] });
    }

    try {
      const url = `${FRAPPE_BASE_URL}/api/resource/Employee?filters=[["status","=","Active"],["department","=","${department}"]]&fields=["user_id", "custom_itigris_user_id", "designation", "employee_name", "custom_tg_username", "custom_employee_shift_format", "reports_to", "name", "department", "image", "company_email"]&limit_page_length=${limit}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Frappe API error: ${response.status}`);
      }

      const result = await response.json();
      loggerWithUser.info(req, 'Получены сотрудники по департаменту', { department, count: result.data?.length || 0 });
      res.json(result);
    } catch (error) {
      loggerWithUser.error(req, 'Ошибка получения сотрудников по департаменту', { error: error.message, department });
      res.status(500).json({ error: 'Failed to fetch employees by department' });
    }
  });

  // Получение сотрудников с внешними ID (для маппинга метрик)
  app.get('/api/frappe/employees-with-external-ids', requireAuth, async (req, res) => {
    // ── PostgreSQL path ──
    if (ORG_DATA_SOURCE !== 'frappe') {
      try {
        const result = await orgData.getEmployeesWithExternalIds();
        return res.json(result);
      } catch (error) {
        loggerWithUser.error(req, 'PG error in employees-with-external-ids', { error: error.message });
        if (ORG_DATA_SOURCE === 'dual') { /* fallthrough to Frappe */ } else {
          return res.status(500).json({ error: 'Failed to fetch employees' });
        }
      }
    }

    // ── Frappe path ──
    if (!FRAPPE_API_KEY || !FRAPPE_API_SECRET) {
      return res.status(500).json({ error: 'Frappe API credentials not configured' });
    }
    try {
      const url = `${FRAPPE_BASE_URL}/api/resource/Employee?filters=[["status","=","Active"]]&fields=["name","employee_name","custom_itigris_user_id","department"]&limit_page_length=200`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
          'Content-Type': 'application/json',
        }
      });
      if (!response.ok) throw new Error(`Frappe API error: ${response.status}`);
      const result = await response.json();
      res.json(result);
    } catch (error) {
      loggerWithUser.error(req, 'Error fetching employees with external IDs', { error: error.message });
      res.status(500).json({ error: 'Failed to fetch employees' });
    }
  });

  // Получение изображения сотрудника
  app.get('/api/frappe/employees/:employeeId/image', requireAuth, async (req, res) => {
    const { employeeId } = req.params;

    try {
      // Resolve image URL — try own data first
      let imageUrl = null;
      if (ORG_DATA_SOURCE !== 'frappe') {
        try {
          const empResult = await orgData.findEmployeeById(employeeId);
          imageUrl = empResult?.data?.image || null;
        } catch { /* fallthrough */ }
      }

      // Fallback to Frappe for URL if not found in own data
      if (!imageUrl && FRAPPE_API_KEY && FRAPPE_API_SECRET) {
        const url = `${FRAPPE_BASE_URL}/api/resource/Employee/${employeeId}?fields=["image"]`;
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
            'Content-Type': 'application/json',
          }
        });
        if (response.ok) {
          const result = await response.json();
          imageUrl = result.data?.image;
        }
      }
      
      if (imageUrl) {
        // Проксируем изображение
        const imageResponse = await fetch(`${FRAPPE_BASE_URL}${imageUrl}`, {
          headers: {
            'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
          }
        });

        if (imageResponse.ok) {
          const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
          res.setHeader('Content-Type', contentType);
          res.setHeader('Cache-Control', 'public, max-age=3600');
          
          const buffer = await imageResponse.arrayBuffer();
          res.send(Buffer.from(buffer));
        } else {
          res.status(404).json({ error: 'Image not found' });
        }
      } else {
        res.status(404).json({ error: 'No image for employee' });
      }
    } catch (error) {
      loggerWithUser.error(req, 'Ошибка получения изображения сотрудника', { error: error.message, employeeId });
      res.status(500).json({ error: 'Failed to fetch employee image' });
    }
  });

  // ==== KB Bookmarks via Frappe (proxy) ====
  // Get bookmarks for employee
  app.get('/api/kb/bookmarks', requireAuth, async (req, res) => {
    const employee = req.query.employee;
    if (!FRAPPE_API_KEY || !FRAPPE_API_SECRET) {
      loggerWithUser.warn(req, 'Frappe API credentials not configured');
      return res.json({ data: [] });
    }
    if (!employee || typeof employee !== 'string') {
      return res.status(400).json({ error: 'employee is required' });
    }
    try {
      const url = `${FRAPPE_BASE_URL}/api/method/kb_bookmarks_get_article?employee=${encodeURIComponent(employee)}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
          'Content-Type': 'application/json',
        }
      });
      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch { data = { message: null }; }
      if (!response.ok) {
        loggerWithUser.error(req, 'Frappe kb_bookmarks_get_article error', { status: response.status, body: text, employee });
        return res.status(response.status).json({ error: 'Frappe API error', details: text });
      }
      const items = (data?.message?.items || []).map((it) => ({
        name: it?.name,
        article_id: it?.article_id,
        title: it?.title ?? null,
        updated_at: it?.updated_at || null
      }));
      return res.json({ items, ok: data?.message?.ok === true });
    } catch (error) {
      loggerWithUser.error(req, 'Ошибка получения закладок из Frappe', { error: error.message, employee });
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });

  // Set bookmark state for an article
  app.post('/api/kb/bookmarks', requireAuth, async (req, res) => {
    if (!FRAPPE_API_KEY || !FRAPPE_API_SECRET) {
      loggerWithUser.warn(req, 'Frappe API credentials not configured');
      return res.json({ data: [] });
    }
    const { employee, article_id, bookmarked, title } = req.body || {};
    if (!employee || !article_id || typeof bookmarked === 'undefined') {
      return res.status(400).json({ error: 'employee, article_id and bookmarked are required' });
    }
    try {
      const url = `${FRAPPE_BASE_URL}/api/method/kb_bookmarks_set_article`;
      const payload = { employee, article_id, bookmarked, ...(bookmarked ? { title } : {}) };
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch { data = {}; }
      if (!response.ok) {
        loggerWithUser.error(req, 'Frappe kb_bookmarks_set_article error', { status: response.status, body: text, employee, article_id, bookmarked });
        return res.status(response.status).json({ error: 'Frappe API error', details: text });
      }
      const msg = data?.message || {};
      return res.json({
        ok: msg?.ok === true,
        name: msg?.name,
        article_id: msg?.article_id,
        bookmarked: msg?.bookmarked,
        updated_at: msg?.updated_at
      });
    } catch (error) {
      loggerWithUser.error(req, 'Ошибка установки закладки в Frappe', { error: error.message, employee, article_id, bookmarked });
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });

  // BFF endpoint для Dashboard
  app.get('/api/dashboard', requireAuth, async (req, res) => {
    if (!TRACKER_API_URL || !TRACKER_API_TOKEN) {
      return res.status(500).json({ error: 'Tracker API credentials not configured' });
    }
    try {
      // Примерные запросы к tracker.loov.ru (замени на реальные, если знаешь нужные endpoints)
      // Здесь предполагается, что у tracker есть нужные методы, либо их нужно будет реализовать там
      const fetchTracker = async (path, params = {}) => {
        const url = new URL(path, TRACKER_API_URL);
        Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
        const response = await fetch(url.toString(), {
          headers: { 'Authorization': `Bearer ${TRACKER_API_TOKEN}` }
        });
        if (!response.ok) throw new Error(`Tracker API error: ${response.statusText}`);
        return response.json();
      };

      // --- Created Orders (СЗ) ---
      // Не закрытые сделки (только по Itigris)
      const openDeals = await fetchTracker('/api/open-deals', { system: 'itigris' });
      // Факт выручка по СЗ за день
      const revenueToday = await fetchTracker('/api/revenue-today', { system: 'itigris' });
      // Оправы, линзы (по СЗ) проданные за день
      const salesToday = await fetchTracker('/api/sales-today', { system: 'itigris' });

      // --- Closed Orders (ЗЗ) ---
      // Прогноз
      const forecast = await fetchTracker('/api/forecast');
      // План/факт месяц
      const planFactMonth = await fetchTracker('/api/plan-fact-month');
      // План/факт день
      const planFactDay = await fetchTracker('/api/plan-fact-day');

      // Формируем ответ
      res.json({
        createdOrders: {
          openDeals: {
            count: openDeals.count,
            amount: openDeals.amount
          },
          revenueToday: revenueToday.amount,
          categories: [
            { name: 'Оправы', count: salesToday.frames.count, avgPrice: salesToday.frames.avgPrice },
            { name: 'Линзы', count: salesToday.lenses.count, avgPrice: salesToday.lenses.avgPrice }
          ]
        },
        closedOrders: {
          forecast: { percent: forecast.percent, amount: forecast.amount },
          planFactMonth: { plan: planFactMonth.plan, fact: planFactMonth.fact, percent: planFactMonth.percent },
          planFactDay: { plan: planFactDay.plan, fact: planFactDay.fact, percent: planFactDay.percent }
        }
      });
    } catch (error) {
      console.error('Error in /api/dashboard:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard data', details: error.message });
    }
  });

  // --- NEW: Proxy Tracker Dashboards ---
  app.get('/api/dashboards', requireAuth, async (req, res) => {
    if (!TRACKER_API_URL || !TRACKER_API_TOKEN) {
      return res.status(500).json({ error: 'Tracker API credentials not configured' });
    }
    
    try {
      const url = new URL('/api/v1/portal/analytics/dashboards', TRACKER_API_URL);
      // Переносим все query-параметры
      Object.entries(req.query).forEach(([k, v]) => {
        if (Array.isArray(v)) {
          v.forEach(value => url.searchParams.append(k, value));
        } else if (v !== undefined) {
          url.searchParams.append(k, v);
        }
      });

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${TRACKER_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const text = await response.text();
        loggerWithUser.error(req, 'Tracker dashboards error', { status: response.status, statusText: response.statusText, body: text });
        return res.status(response.status).json({ error: 'Failed to fetch dashboards', details: response.statusText });
      }

      const data = await response.json();
      return res.json(data);
    } catch (error) {
      loggerWithUser.error(req, 'Ошибка проксирования dashboards', { error: error.message });
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });

  // --- NEW: Proxy Tracker Feedbacks ---
  app.get('/api/feedbacks', requireAuth, async (req, res) => {
    if (!TRACKER_API_URL || !TRACKER_API_TOKEN) {
      return res.status(500).json({ error: 'Tracker API credentials not configured' });
    }

    try {
      const url = new URL('/api/v1/portal/analytics/feedbacks', TRACKER_API_URL);
      // Переносим все query-параметры как есть, поддерживая повторяющиеся ключи (employee_ids)
      Object.entries(req.query).forEach(([k, v]) => {
        if (Array.isArray(v)) {
          v.forEach(value => url.searchParams.append(k, value));
        } else if (v !== undefined) {
          url.searchParams.append(k, v);
        }
      });

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${TRACKER_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const text = await response.text();
        loggerWithUser.error(req, 'Tracker feedbacks error', { status: response.status, statusText: response.statusText, body: text });
        return res.status(response.status).json({ error: 'Failed to fetch feedbacks', details: response.statusText });
      }

      const data = await response.json();
      return res.json(data);
    } catch (error) {
      loggerWithUser.error(req, 'Ошибка проксирования feedbacks', { error: error.message });
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });

  // --- NEW: Proxy Tracker Unclosed Orders ---
  app.get('/api/unclosed-orders', requireAuth, async (req, res) => {
    if (!TRACKER_API_URL || !TRACKER_API_TOKEN) {
      return res.status(500).json({ error: 'Tracker API credentials not configured' });
    }

    try {
      const url = new URL('/api/v1/portal/analytics/unclosed_orders', TRACKER_API_URL);

      // Прокидываем все query-параметры от клиента
      Object.entries(req.query).forEach(([k, v]) => {
        if (Array.isArray(v)) {
          v.forEach(value => url.searchParams.append(k, value));
        } else if (v !== undefined) {
          url.searchParams.append(k, v);
        }
      });

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${TRACKER_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const text = await response.text();
        loggerWithUser.error(req, 'Tracker unclosed_orders error', { status: response.status, statusText: response.statusText, body: text });
        return res.status(response.status).json({ error: 'Failed to fetch unclosed orders', details: response.statusText });
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      loggerWithUser.error(req, 'Ошибка проксирования unclosed_orders', { error: error.message });
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });

  // --- Shared helpers for leader metrics ---

  // Normalize number values from various sources
  const _toNumber = (v) => {
    if (v === null || v === undefined) return null;
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    const n = parseFloat(String(v).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  };

  // Build normalized metric response from fact/plan/meta (V2: uses metricType + thresholds)
  const _buildMetricResponse = (metricCfg, fact, plan, forecastRaw, lossOrOver, valueType, valuePostfixType, remainingWorkingDays = 0, dateCtx = null) => {
    const unitFromPostfix =
      valuePostfixType === 'rubles' ? '₽'
        : valuePostfixType === 'percent' ? '%'
        : undefined;

    const isPercentage = valueType === 'percentage' || unitFromPostfix === '%';
    const unit = unitFromPostfix ?? metricCfg.unit;

    let reserve = lossOrOver > 0 ? Math.ceil(lossOrOver) : undefined;
    let loss = lossOrOver < 0 ? Math.ceil(Math.abs(lossOrOver)) : undefined;
    const reserveUnit = metricCfg.id === 'conversion_rate' && reserve !== undefined ? '₽' : undefined;

    // Determine calculation mode: V2 metricType takes precedence, fallback to forecastLabel
    const mt = metricCfg.metricType;
    let forecastLabel = metricCfg.forecastLabel;
    if (!forecastLabel) {
      if (mt === 'absolute') forecastLabel = 'remaining';
      else if (mt === 'averaged' || mt === 'percentage') forecastLabel = 'deviation';
      else if (valuePostfixType === 'rubles') forecastLabel = 'forecast';
      else if (valuePostfixType === 'percent') forecastLabel = 'deviation';
      else forecastLabel = isPercentage ? 'deviation' : 'forecast';
    }

    const forecastUnit = metricCfg.forecastUnit || '%';

    let forecastValue = 0;
    let forecast = undefined;

    if (forecastLabel === 'deviation') {
      forecastValue = plan > 0 ? Math.round(((fact / plan) - 1) * 100 * 100) / 100 : 0;
    } else if (forecastLabel === 'remaining') {
      // Dynamic remaining plan: show % completion as forecast, remaining amount as forecastValue
      const remaining = plan - fact;
      forecastValue = remaining > 0 ? remaining : 0;
      forecast = plan > 0 ? Math.round((fact / plan) * 100) : 0;
    } else {
      const basis = forecastRaw ?? fact;
      forecast = plan > 0 ? Math.round((basis / plan) * 100) : 0;
      forecastValue = forecast;
    }

    // Status from configurable thresholds (V2) or hardcoded defaults
    const thresholds = metricCfg.thresholds || {};
    let status = 'warning';
    if (forecastLabel === 'deviation') {
      const critVal = thresholds.critical ?? -5;
      const goodVal = thresholds.good ?? 5;
      if (forecastValue <= critVal) status = 'critical';
      else if (forecastValue >= goodVal) status = 'good';
    } else if (forecastLabel === 'remaining') {
      // Status based on % completion (forecast field)
      const critVal = thresholds.critical ?? 70;
      const goodVal = thresholds.good ?? 95;
      if (forecast > 0) {
        if (forecast <= critVal) status = 'critical';
        else if (forecast >= goodVal) status = 'good';
      }
    } else {
      const critVal = thresholds.critical ?? 70;
      const goodVal = thresholds.good ?? 95;
      if (forecastValue > 0) {
        if (forecastValue <= critVal) status = 'critical';
        else if (forecastValue >= goodVal) status = 'good';
      }
    }

    // V7: Predictive forecast (end-of-month projection)
    let predictedValue = undefined;
    let predictedCompletion = undefined;
    let dailyRate = undefined;
    try {
      const effectiveDateCtx = dateCtx || buildDateContext(remainingWorkingDays);
      const prediction = calculateForecast(metricCfg, fact, plan, effectiveDateCtx);
      if (prediction) {
        predictedValue = prediction.predictedValue;
        predictedCompletion = prediction.predictedCompletion;
        dailyRate = prediction.dailyRate;
      }
    } catch (err) {
      console.warn(`[forecast-engine] Error for metric ${metricCfg?.id}: ${err.message}`);
    }

    // For auto lossMode, recalculate reserve/loss using predicted end-of-month value
    if (metricCfg.lossMode === 'auto' && predictedValue != null) {
      const predictedLossOrOver = predictedValue - plan;
      reserve = predictedLossOrOver > 0 ? Math.ceil(predictedLossOrOver) : undefined;
      loss = predictedLossOrOver < 0 ? Math.ceil(Math.abs(predictedLossOrOver)) : undefined;
    }

    return {
      id: metricCfg.id,
      name: metricCfg.name,
      current: fact,
      plan,
      unit,
      trend: 'stable',
      trendValue: 0,
      status,
      color: metricCfg.color || null,
      reserve,
      reserveUnit,
      loss,
      forecast,
      forecastValue,
      forecastUnit,
      forecastLabel,
      // V2 fields in response
      metricType: metricCfg.metricType || null,
      valueType: metricCfg.valueType || null,
      decimalPlaces: metricCfg.decimalPlaces ?? 0,
      // V2: remaining daily plan for 'remaining' forecast mode
      remainingDailyPlan: forecastLabel === 'remaining' && remainingWorkingDays > 0
        ? Math.round(Math.max(0, plan - fact) / remainingWorkingDays)
        : undefined,
      // V7: Predictive forecast
      predictedValue,
      predictedCompletion,
      dailyRate,
    };
  };

  // Calculate loss_or_overperformance based on metric lossMode config
  function _calculateLossOrOver(metricCfg, fact, plan, externalData, valuesMap) {
    try {
      const mode = metricCfg.lossMode || 'disabled';
      switch (mode) {
        case 'auto':
          return fact - plan;
        case 'formula':
          if (!metricCfg.lossFormula) return 0;
          return evaluateFormula(metricCfg.lossFormula, valuesMap || {}).result;
        case 'jsonpath':
          if (!metricCfg.jsonPathLoss || !externalData) return 0;
          return _toNumber(extractByPath(externalData, metricCfg.jsonPathLoss)) ?? 0;
        case 'tracker':
          return 0; // handled separately in tracker results path
        case 'disabled':
        default:
          return 0;
      }
    } catch (err) {
      logger.warn('_calculateLossOrOver error', { metric: metricCfg.id, error: err.message });
      return 0;
    }
  }

  // Merge global data source fieldMappings with per-metric fieldMappings.
  // Per-metric values override global values for the same apiField+entityType.
  function mergeFieldMappings(sourceMappings = [], metricMappings = []) {
    const merged = sourceMappings.map(m => ({ ...m, values: { ...m.values } }));
    for (const mfm of metricMappings) {
      const existing = merged.find(m => m.apiField === mfm.apiField && m.entityType === mfm.entityType);
      if (existing) {
        // Per-metric values override global
        for (const [k, v] of Object.entries(mfm.values || {})) {
          if (v || v === '0') existing.values[k] = v;
        }
      } else {
        merged.push({ ...mfm, values: { ...(mfm.values || {}) } });
      }
    }
    return merged;
  }

  // Fetch data for a list of metric configs (tracker/manual/external), returns array of metric responses
  async function _fetchMetricsData(req, enabledMetrics) {
    // V2: Bindings filter — skip metrics not visible for requested store
    let storeFilterGlobal = null;
    if (req.query.store_ids) {
      storeFilterGlobal = Array.isArray(req.query.store_ids) ? req.query.store_ids : [req.query.store_ids];
    } else if (req.query.store_id) {
      storeFilterGlobal = [req.query.store_id];
    }

    const employeeIdFilter = req.query.employee_id || null;
    // V3: Resolve employee_id from JWT for fieldMappings
    const currentEmployeeId = extractEmployeeIdFromEmployeename(req.user?.employeename) || null;

    // Pre-load data source fieldMappings for external_api metrics
    const _sourceFieldMappingsCache = {};
    for (const m of enabledMetrics) {
      if (m.source === 'external_api' && m.dataSourceId && !_sourceFieldMappingsCache[m.dataSourceId]) {
        try {
          const src = await getSourceById(m.dataSourceId);
          _sourceFieldMappingsCache[m.dataSourceId] = src?.fieldMappings || [];
        } catch { _sourceFieldMappingsCache[m.dataSourceId] = []; }
      }
    }

    const filteredMetrics = enabledMetrics.filter(m => {
      // V3: For external_api metrics — merge global + per-metric fieldMappings for visibility
      if (m.source === 'external_api') {
        const sourceFMs = _sourceFieldMappingsCache[m.dataSourceId] || [];
        const metricFMs = Array.isArray(m.fieldMappings) ? m.fieldMappings : [];
        const merged = mergeFieldMappings(sourceFMs, metricFMs);

        if (merged.length > 0) {
          // Branch visibility
          const branchMappings = merged.filter(fm => fm.entityType === 'branch');
          if (branchMappings.length > 0 && storeFilterGlobal) {
            const hasValueForStore = branchMappings.some(fm =>
              storeFilterGlobal.some(sid => fm.values && fm.values[sid])
            );
            if (!hasValueForStore) {
              loggerWithUser.debug(req, `Metric ${m.id} filtered: no branch fieldMapping for stores`, { storeFilterGlobal });
              return false;
            }
          }
          // Department visibility
          const deptMappings = merged.filter(fm => fm.entityType === 'department');
          if (deptMappings.length > 0 && req.user?.department) {
            const hasValueForDept = deptMappings.some(fm => fm.values && fm.values[req.user.department]);
            if (!hasValueForDept) {
              loggerWithUser.debug(req, `Metric ${m.id} filtered: no dept fieldMapping`, { department: req.user.department });
              return false;
            }
          }
          // Designation visibility
          const desigMappings = merged.filter(fm => fm.entityType === 'designation');
          if (desigMappings.length > 0 && req.user?.designation) {
            const hasValueForDesig = desigMappings.some(fm => fm.values && fm.values[req.user.designation]);
            if (!hasValueForDesig) {
              loggerWithUser.debug(req, `Metric ${m.id} filtered: no designation fieldMapping`, { designation: req.user.designation });
              return false;
            }
          }
          // custom: always visible (static params, no auto-filter)
          return true;
        }
      }

      // Legacy bindings-based visibility for tracker/manual/external_api without fieldMappings
      if (!m.bindings || m.bindings.length === 0) return true; // no bindings = visible to all
      // Employee scope: if employee_id in request, include metrics bound to that employee
      if (employeeIdFilter && m.bindings.some(b =>
        b.scope === 'employee' && b.scopeId === employeeIdFilter && b.enabled !== false
      )) return true;
      if (!storeFilterGlobal) return true; // no store filter in request
      const hasMatchingBinding = m.bindings.some(b =>
        b.scope === 'branch' && storeFilterGlobal.includes(b.scopeId) && b.enabled !== false
      ) || m.bindings.some(b => b.scope === 'network' && b.enabled !== false);
      if (!hasMatchingBinding) {
        loggerWithUser.debug(req, `Metric ${m.id} filtered: no matching binding`, {
          storeFilter: storeFilterGlobal,
          bindings: m.bindings?.map(b => ({ scope: b.scope, scopeId: b.scopeId, enabled: b.enabled })),
        });
      }
      return hasMatchingBinding;
    });

    if (filteredMetrics.length < enabledMetrics.length) {
      loggerWithUser.debug(req, '_fetchMetricsData visibility filter', {
        before: enabledMetrics.length,
        after: filteredMetrics.length,
        filtered: enabledMetrics.filter(m => !filteredMetrics.includes(m)).map(m => m.id),
      });
    }

    // V2: Load all metric plans for plan resolution
    const { plans: allMetricPlans } = await readMetricPlans().catch(() => ({ plans: [] }));

    // V2: Calculate remaining working days for 'remaining' forecast mode
    let _remainingWorkingDays = 0;
    if (req.query.date_to) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dateTo = parseLocalDate(req.query.date_to);
      if (dateTo >= today) {
        _remainingWorkingDays = getWorkingDaysInRange(today, dateTo);
      }
    }

    const trackerMetrics = filteredMetrics.filter(m => m.source === 'tracker');
    const manualMetrics = filteredMetrics.filter(m => m.source === 'manual');
    const externalMetrics = filteredMetrics.filter(m => m.source === 'external_api');

    let trackerResults = [];
    if (trackerMetrics.length > 0) {
      // Resolve tracker URL/auth from data source config, fallback to env vars
      const trackerSource = await getSourceById('tracker').catch(() => null);
      const effectiveTrackerUrl = trackerSource?.baseUrl || TRACKER_API_URL;
      const effectiveTrackerHeaders = trackerSource
        ? { ...buildAuthHeaders(trackerSource.authType, trackerSource.authConfig), 'Content-Type': 'application/json' }
        : { 'Authorization': `Bearer ${TRACKER_API_TOKEN}`, 'Content-Type': 'application/json' };

      if (!effectiveTrackerUrl) {
        loggerWithUser.warn(req, 'Tracker API credentials not configured, skipping tracker metrics');
      } else {
        const urls = trackerMetrics.map(m => {
          return { metric: m, url: new URL(`/api/v1/portal/analytics/metrics/${m.trackerCode || m.id}`, effectiveTrackerUrl) };
        });

        Object.entries(req.query).forEach(([k, v]) => {
          if (k === 'store_id' && req.query?.store_ids === undefined) {
            if (Array.isArray(v)) {
              v.forEach(value => urls.forEach(u => u.url.searchParams.append('store_ids', value)));
            } else if (v !== undefined) {
              urls.forEach(u => u.url.searchParams.append('store_ids', v));
            }
            return;
          }
          if (Array.isArray(v)) {
            v.forEach(value => urls.forEach(u => u.url.searchParams.append(k, value)));
          } else if (v !== undefined) {
            urls.forEach(u => u.url.searchParams.append(k, v));
          }
        });

        const results = await Promise.allSettled(
          urls.map(async ({ metric, url }) => {
            const response = await fetch(url.toString(), {
              method: 'GET',
              headers: effectiveTrackerHeaders
            });
            if (!response.ok) {
              const text = await response.text();
              loggerWithUser.error(req, 'Tracker top leader metrics error', {
                status: response.status,
                statusText: response.statusText,
                body: text,
                url: url.toString()
              });
              const error = new Error(`Request failed: ${response.status}`);
              error.status = response.status;
              error.body = text;
              throw error;
            }
            return { metric, data: await response.json() };
          })
        );

        const error422 = results.find(r => r.status === 'rejected' && r.reason?.status === 422);
        if (error422) {
          const err = new Error('Validation error from Tracker API');
          err.status = 422;
          err.body = error422.reason?.body || error422.reason?.message;
          throw err;
        }

        trackerResults = results
          .filter(r => r.status === 'fulfilled')
          .map(r => {
            const { metric, data } = r.value;
            const fact = _toNumber(data?.fact_value) ?? 0;
            const plan = _toNumber(data?.plan_value) ?? 0;
            const forecastRaw = _toNumber(data?.forecast_value);
            const valueType = data?.value_type ? String(data.value_type) : '';
            const valuePostfixType = data?.value_postfix_type ? String(data.value_postfix_type) : '';

            // V2: Plan override from metric-plans
            let effectivePlan = plan;
            if (allMetricPlans.length > 0 && req.query.date_from) {
              const period = req.query.date_from.substring(0, 7); // YYYY-MM
              const storeId = storeFilterGlobal?.[0] || null;
              const resolved = resolvePlan(metric.id, storeId, null, period, allMetricPlans);
              if (resolved !== null) effectivePlan = resolved;
            }

            // Respect metric lossMode config (previously tracker value was always used)
            let lossOrOver = 0;
            const lossMode = metric.lossMode || 'disabled';
            if (lossMode === 'tracker') {
              lossOrOver = _toNumber(data?.loss_or_overperformance) ?? 0;
            } else if (lossMode !== 'disabled') {
              // 'auto', 'formula', 'jsonpath' — delegate to existing function
              lossOrOver = _calculateLossOrOver(metric, fact, effectivePlan, data, null);
            }

            return _buildMetricResponse(metric, fact, effectivePlan, forecastRaw, lossOrOver, valueType, valuePostfixType, _remainingWorkingDays);
          });
      }
    }

    const manualResults = manualMetrics.map(metric => {
      const entries = metric.manualData || [];
      const dateFrom = req.query.date_from;
      const dateTo = req.query.date_to;
      const proRateMethod = metric.planProRateMethod || 'working_days';

      // Determine requested store(s)
      let storeFilter = null;
      if (req.query.store_ids) {
        storeFilter = Array.isArray(req.query.store_ids) ? req.query.store_ids : [req.query.store_ids];
      } else if (req.query.store_id) {
        storeFilter = [req.query.store_id];
      }

      // Helper: aggregate store entries (multi-store support for "All branches" mode)
      const _aggregateStoreEntries = (periodEntries, aggregation) => {
        if (!storeFilter || storeFilter.length <= 1) {
          // Single store or no filter — existing behavior
          let entry = null;
          if (storeFilter) entry = periodEntries.find(e => storeFilter.includes(e.storeId || ''));
          if (!entry) entry = periodEntries.find(e => !e.storeId);
          if (!entry && periodEntries.length > 0) entry = periodEntries[0];
          return entry ? { fact: _toNumber(entry.fact) ?? 0, plan: _toNumber(entry.plan) ?? 0 } : { fact: 0, plan: 0 };
        }

        // Multi-store: aggregate matching entries
        const matchingEntries = periodEntries.filter(e => e.storeId && storeFilter.includes(e.storeId));

        if (matchingEntries.length === 0) {
          // Fallback: network-level entry (no storeId)
          const networkEntry = periodEntries.find(e => !e.storeId);
          return networkEntry ? { fact: _toNumber(networkEntry.fact) ?? 0, plan: _toNumber(networkEntry.plan) ?? 0 } : { fact: 0, plan: 0 };
        }

        const facts = matchingEntries.map(e => _toNumber(e.fact) ?? 0);
        const plans = matchingEntries.map(e => _toNumber(e.plan) ?? 0);

        if (aggregation === 'simple_average' || aggregation === 'weighted_average') {
          return {
            fact: facts.reduce((s, v) => s + v, 0) / facts.length,
            plan: plans.reduce((s, v) => s + v, 0) / plans.length,
          };
        }
        // Default: sum (for 'absolute' metrics and fallback)
        return {
          fact: facts.reduce((s, v) => s + v, 0),
          plan: plans.reduce((s, v) => s + v, 0),
        };
      };

      // Build set of YYYY-MM periods from date range
      const matchingPeriods = new Set();
      if (dateFrom && dateTo) {
        const from = parseLocalDate(dateFrom);
        const to = parseLocalDate(dateTo);
        const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
        while (cursor <= to) {
          matchingPeriods.add(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`);
          cursor.setMonth(cursor.getMonth() + 1);
        }
      }

      let totalFact = 0;
      let totalPlan = 0;

      if (matchingPeriods.size > 0) {
        const fromDate = parseLocalDate(dateFrom);
        const toDate = parseLocalDate(dateTo);

        for (const period of matchingPeriods) {
          const monthlyEntries = entries.filter(e => e.period === period && e.period.length === 7);
          const aggregated = _aggregateStoreEntries(monthlyEntries, metric.aggregation);
          const monthlyPlan = aggregated.plan;
          const monthlyFact = aggregated.fact;

          const [pYear, pMonth] = period.split('-').map(Number);
          const monthStart = new Date(pYear, pMonth - 1, 1);
          const monthEnd = new Date(pYear, pMonth, 0);

          const rangeStart = fromDate > monthStart ? fromDate : monthStart;
          const rangeEnd = toDate < monthEnd ? toDate : monthEnd;

          // V2: use configurable pro-rate method from plan-prorate module
          totalPlan += proRatePlan(monthlyPlan, proRateMethod, pYear, pMonth - 1, rangeStart, rangeEnd);

          // Daily entries (YYYY-MM-DD) within date range for this month
          const dailyEntries = entries.filter(e => {
            if (e.period.length !== 10 || !e.period.startsWith(period)) return false;
            const entryDate = parseLocalDate(e.period);
            return entryDate >= rangeStart && entryDate <= rangeEnd;
          });

          // Aggregate daily entries across stores
          const filteredDailyEntries = !storeFilter ? dailyEntries :
            storeFilter.length <= 1
              ? dailyEntries.filter(e => storeFilter.includes(e.storeId || '') || !e.storeId)
              : dailyEntries.filter(e => e.storeId && storeFilter.includes(e.storeId));

          if (filteredDailyEntries.length > 0) {
            if (storeFilter && storeFilter.length > 1 && (metric.aggregation === 'simple_average' || metric.aggregation === 'weighted_average')) {
              // Group daily entries by date, then average across stores per day
              const byDate = {};
              for (const de of filteredDailyEntries) {
                if (!byDate[de.period]) byDate[de.period] = [];
                byDate[de.period].push(_toNumber(de.fact) ?? 0);
              }
              for (const dateFacts of Object.values(byDate)) {
                totalFact += dateFacts.reduce((s, v) => s + v, 0) / dateFacts.length;
              }
            } else {
              for (const de of filteredDailyEntries) {
                totalFact += _toNumber(de.fact) ?? 0;
              }
            }
          } else {
            totalFact += monthlyFact;
          }
        }
      } else {
        const monthlyEntries = entries.filter(e => e.period.length === 7);
        if (monthlyEntries.length > 0) {
          const latestEntry = monthlyEntries[monthlyEntries.length - 1];
          totalFact = _toNumber(latestEntry.fact) ?? 0;
          totalPlan = _toNumber(latestEntry.plan) ?? 0;
        }
      }

      // V2: plan override from metric-plans storage
      let effectivePlan = totalPlan;
      if (allMetricPlans.length > 0 && req.query.date_from) {
        const period = req.query.date_from.substring(0, 7);
        const storeId = storeFilterGlobal?.[0] || null;
        const resolved = resolvePlan(metric.id, storeId, null, period, allMetricPlans);
        if (resolved !== null) effectivePlan = resolved;
      }

      return _buildMetricResponse(metric, totalFact, effectivePlan, null, _calculateLossOrOver(metric, totalFact, effectivePlan, null, null), '', '', _remainingWorkingDays);
    });

    let externalResults = [];
    if (externalMetrics.length > 0) {
      const extResults = await Promise.allSettled(
        externalMetrics.map(async (metric) => {
          let data;

          // Build query params from metric config
          const _queryParams = {};
          if (Array.isArray(metric.externalQueryParams)) {
            for (const { key, value } of metric.externalQueryParams) {
              if (key) _queryParams[key] = value;
            }
          }

          // V3: Apply merged fieldMappings (global from data source + per-metric overrides)
          const _sourceFMs = _sourceFieldMappingsCache[metric.dataSourceId] || [];
          const _metricFMs = Array.isArray(metric.fieldMappings) ? metric.fieldMappings : [];
          const _mergedFMs = mergeFieldMappings(_sourceFMs, _metricFMs);
          for (const mapping of _mergedFMs) {
            if (mapping.entityType === 'branch' && storeFilterGlobal?.length > 0) {
              const storeId = storeFilterGlobal[0];
              const mappedValue = mapping.values?.[storeId];
              if (mappedValue) _queryParams[mapping.apiField] = mappedValue;
            }
            if (mapping.entityType === 'employee' && currentEmployeeId) {
              const mappedValue = mapping.values?.[currentEmployeeId];
              if (mappedValue) _queryParams[mapping.apiField] = mappedValue;
            }
            if (mapping.entityType === 'department' && req.user?.department) {
              const mappedValue = mapping.values?.[req.user.department];
              if (mappedValue) _queryParams[mapping.apiField] = mappedValue;
            }
            if (mapping.entityType === 'designation' && req.user?.designation) {
              const mappedValue = mapping.values?.[req.user.designation];
              if (mappedValue) _queryParams[mapping.apiField] = mappedValue;
            }
            if (mapping.entityType === 'custom') {
              // Custom: apply first non-empty value as static param
              for (const val of Object.values(mapping.values || {})) {
                if (val) { _queryParams[mapping.apiField] = val; break; }
              }
            }
          }

          // Legacy: Merge per-store overrides from matching binding (backward compat)
          if (storeFilterGlobal?.length > 0 && Array.isArray(metric.bindings)) {
            const _storeId = storeFilterGlobal[0];
            const matchingBinding = metric.bindings.find(
              b => b.scope === 'branch' && b.scopeId === _storeId && b.enabled !== false
            );
            if (matchingBinding?.queryParamOverrides) {
              for (const { key, value } of matchingBinding.queryParamOverrides) {
                if (key) _queryParams[key] = value;
              }
            }
          }
          let _body = null;
          if (metric.externalBody) {
            try { _body = JSON.parse(metric.externalBody); } catch { _body = null; }
          }

          if (metric.dataSourceId) {
            // NEW PATH: use data source connector
            const source = await getSourceById(metric.dataSourceId);
            if (!source) throw new Error(`Data source "${metric.dataSourceId}" not found`);
            data = await fetchFromSource(source, metric.externalPath || '/', _queryParams, {
              method: metric.externalMethod || 'GET',
              body: _body,
            });
          } else if (metric.externalUrl) {
            // LEGACY PATH: direct URL fetch (backward compatible)
            const legacyUrl = new URL(metric.externalUrl);
            for (const [k, v] of Object.entries(_queryParams)) {
              legacyUrl.searchParams.append(k, String(v));
            }
            const response = await fetch(legacyUrl.toString(), {
              method: metric.externalMethod || 'GET',
              headers: {
                'Content-Type': 'application/json',
                ...(metric.externalHeaders || {}),
              },
              body: _body && metric.externalMethod === 'POST' ? JSON.stringify(_body) : undefined,
              signal: AbortSignal.timeout(10000),
            });
            if (!response.ok) {
              throw new Error(`External API ${metric.externalUrl} returned ${response.status}`);
            }
            data = await response.json();
          } else {
            return { metric, fact: 0, plan: 0 };
          }

          const fact = _toNumber(extractByPath(data, metric.jsonPathFact)) ?? 0;
          const plan = _toNumber(extractByPath(data, metric.jsonPathPlan)) ?? 0;
          return { metric, fact, plan, data };
        })
      );

      const fulfilledExt = extResults
        .filter(r => r.status === 'fulfilled')
        .map(r => {
          const { metric, fact, plan, data } = r.value;
          // V2: plan override from metric-plans storage
          let effectivePlan = plan;
          if (allMetricPlans.length > 0 && req.query.date_from) {
            const period = req.query.date_from.substring(0, 7);
            const storeId = storeFilterGlobal?.[0] || null;
            const resolved = resolvePlan(metric.id, storeId, null, period, allMetricPlans);
            if (resolved !== null) effectivePlan = resolved;
          }
          return _buildMetricResponse(metric, fact, effectivePlan, null, _calculateLossOrOver(metric, fact, effectivePlan, data, null), '', '', _remainingWorkingDays);
        });

      // Include failed external metrics with zeros + error flag (so admin preview can show status)
      const failedExt = extResults
        .filter(r => r.status === 'rejected')
        .map((r, idx) => {
          const metric = externalMetrics[extResults.indexOf(r)] || externalMetrics[idx];
          loggerWithUser.warn(req, 'External API metric fetch failed', { metricId: metric?.id, error: r.reason?.message });
          if (!metric) return null;
          const resp = _buildMetricResponse(metric, 0, 0, null, 0, '', '', _remainingWorkingDays);
          resp._fetchError = r.reason?.message || 'Unknown error';
          return resp;
        })
        .filter(Boolean);

      externalResults = [...fulfilledExt, ...failedExt];
    }

    const allResults = [...trackerResults, ...manualResults, ...externalResults];

    // V2: Evaluate computed (formula) metrics
    const computedMetrics = enabledMetrics.filter(m => (m.metricType === 'computed' || m.source === 'computed') && m.formula);
    if (computedMetrics.length > 0) {
      // Build values map from already-fetched results
      // Supports {metric}, {metric.fact}, {metric.plan} in formulas
      const valuesMap = {};
      for (const r of allResults) {
        valuesMap[r.id] = r.current;              // bare {metric} = fact (backward compat)
        valuesMap[r.id + '.fact'] = r.current;     // {metric.fact}
        valuesMap[r.id + '.plan'] = r.plan ?? 0;   // {metric.plan}
      }

      // Evaluate in topological order
      const order = getEvaluationOrder(computedMetrics);
      for (const metricId of order) {
        const metric = computedMetrics.find(m => m.id === metricId);
        if (!metric) continue;

        const { result, error } = evaluateFormula(metric.formula, valuesMap);
        if (error) {
          loggerWithUser.warn(req, 'Formula evaluation error', { metricId, formula: metric.formula, error });
        }

        valuesMap[metricId] = result;
        valuesMap[metricId + '.fact'] = result;

        // Build response — plan for computed metrics: try metric-plans storage first, fallback to manualData
        const manualPlan = (metric.manualData || []).find(e => e.period.length === 7);
        let effectivePlan = manualPlan ? (_toNumber(manualPlan.plan) ?? 0) : 0;

        // V2: plan override from metric-plans storage (same pattern as tracker/manual/external)
        if (allMetricPlans.length > 0 && req.query.date_from) {
          const period = req.query.date_from.substring(0, 7);
          const storeId = storeFilterGlobal?.[0] || null;
          const resolved = resolvePlan(metric.id, storeId, null, period, allMetricPlans);
          if (resolved !== null) effectivePlan = resolved;
        }

        valuesMap[metricId + '.plan'] = effectivePlan;
        allResults.push(_buildMetricResponse(metric, result, effectivePlan, null, _calculateLossOrOver(metric, result, effectivePlan, null, valuesMap), '', '', _remainingWorkingDays));
      }
    }

    const orderedIds = enabledMetrics.map(m => m.id);
    return orderedIds
      .map(id => allResults.find(r => r.id === id))
      .filter(Boolean);
  }

  // --- Daily Plan Graph ---
  app.get('/api/metric-daily-graph', requireAuth, async (req, res) => {
    const { metric_name, date_from, date_to, subject_type, subject_ids, is_aggregated } = req.query;

    if (!metric_name || !date_from || !date_to || !subject_type || !subject_ids) {
      return res.status(400).json({ error: 'Missing required params: metric_name, date_from, date_to, subject_type, subject_ids' });
    }

    res.setHeader('Cache-Control', 'no-store');

    // --- Manual / computed metrics: build response from manualData ---
    try {
      const dashConfig = await readDashboardMetricsConfig();
      const metricCfg = (dashConfig.metrics || []).find(m => m.id === metric_name);

      if (metricCfg && (metricCfg.source === 'manual' || metricCfg.source === 'computed')) {
        const entries = metricCfg.manualData || [];
        const ids = Array.isArray(subject_ids) ? subject_ids : [subject_ids];
        const isAgg = is_aggregated === 'true';

        // Generate all dates in range
        const fromDate = new Date(date_from + 'T00:00:00');
        const toDate = new Date(date_to + 'T00:00:00');
        const dates = [];
        for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
          dates.push(d.toISOString().slice(0, 10));
        }

        // Find monthly plan (period = "YYYY-MM")
        const month = date_from.slice(0, 7);
        const daysInMonth = new Date(
          parseInt(month.slice(0, 4)), parseInt(month.slice(5, 7)), 0
        ).getDate();

        // Helper: get monthly plan for a storeId
        const getMonthPlan = (storeId) => {
          // Try store-specific first, then global (empty storeId)
          const storeEntry = entries.find(e => e.period === month && e.storeId === storeId);
          if (storeEntry) return storeEntry.plan || 0;
          const globalEntry = entries.find(e => e.period === month && (!e.storeId || e.storeId === ''));
          return globalEntry ? (globalEntry.plan || 0) : 0;
        };

        // Helper: get daily fact for a date and storeId
        const getDayFact = (date, storeId) => {
          const entry = entries.find(
            e => e.period === date && (e.storeId === storeId || (!storeId && (!e.storeId || e.storeId === '')))
          );
          return entry ? (entry.fact || 0) : 0;
        };

        const result = { code: metric_name, data: {} };

        if (isAgg) {
          // Aggregated: sum across all requested storeIds
          const dayMap = {};
          for (const date of dates) {
            let totalFact = 0;
            let totalPlan = 0;
            for (const sid of ids) {
              totalFact += getDayFact(date, sid);
              totalPlan += getMonthPlan(sid) / daysInMonth;
            }
            // Also add facts without storeId (global entries)
            const globalFact = entries.find(e => e.period === date && (!e.storeId || e.storeId === ''));
            if (globalFact && ids.length === 0) {
              totalFact += globalFact.fact || 0;
            }
            dayMap[date] = { fact_value: totalFact, plan_value: Math.round(totalPlan * 100) / 100 };
          }
          result.data['aggregated'] = dayMap;
        } else {
          // Per-store
          for (const sid of ids) {
            const dayMap = {};
            const dailyPlan = getMonthPlan(sid) / daysInMonth;
            for (const date of dates) {
              dayMap[date] = {
                fact_value: getDayFact(date, sid),
                plan_value: Math.round(dailyPlan * 100) / 100,
              };
            }
            result.data[sid] = dayMap;
          }
        }

        return res.json(result);
      }
    } catch (cfgErr) {
      loggerWithUser.warn(req, 'Failed to check metric config for manual source', { error: cfgErr.message });
    }

    // --- Tracker metrics: proxy to Tracker API ---
    if (!TRACKER_API_URL || !TRACKER_API_TOKEN) {
      return res.status(500).json({ error: 'Tracker API credentials not configured' });
    }

    try {
      // Resolve tracker code: if metric_name is a custom id (e.g. "revcrea"),
      // use its trackerCode (e.g. "revenue_created") for the Tracker API call
      let trackerMetricName = metric_name;
      try {
        const dashCfg = await readDashboardMetricsConfig();
        const cfg = (dashCfg.metrics || []).find(m => m.id === metric_name);
        if (cfg && cfg.trackerCode) {
          trackerMetricName = cfg.trackerCode;
        }
      } catch (_) { /* use original metric_name */ }

      const url = new URL(
        `/api/v1/portal/analytics/metrics/${encodeURIComponent(trackerMetricName)}/daily_plan_graph`,
        TRACKER_API_URL
      );
      url.searchParams.set('date_from', date_from);
      url.searchParams.set('date_to', date_to);
      url.searchParams.set('subject_type', subject_type);

      const ids = Array.isArray(subject_ids) ? subject_ids : [subject_ids];
      ids.forEach(id => url.searchParams.append('subject_ids', id));
      url.searchParams.set('is_aggregated', is_aggregated === 'true' ? 'true' : 'false');

      const cacheKey = generateCacheKey('daily_graph', {
        metric: metric_name, date_from, date_to, subject_type,
        subject_ids: ids.sort().join(','), is_aggregated,
      });

      const { data, fromCache } = await withCache(
        cacheKey,
        CACHE_TTL.ANALYTICS,
        () => {
          return fetch(url.toString(), {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${TRACKER_API_TOKEN}`,
              'Content-Type': 'application/json',
            },
          }).then(async (response) => {
            if (!response.ok) {
              const text = await response.text();
              const error = new Error(`Tracker daily_plan_graph error: ${response.status}`);
              error.status = response.status;
              error.body = text;
              throw error;
            }
            return response.json();
          });
        }
      );

      if (fromCache) {
        loggerWithUser.debug(req, 'Daily plan graph served from cache');
      }

      return res.json(data);
    } catch (error) {
      loggerWithUser.error(req, 'Error fetching daily plan graph', { error: error.message });
      return res.status(error.status || 500).json({ error: 'Failed to fetch daily plan graph', details: error.message });
    }
  });

  // --- Proxy Tracker Top Metrics (dynamic config) ---
  app.get('/api/top-leader-metrics', requireAuth, async (req, res) => {
    try {
      // --- RAW MODE: bypass config, return raw Tracker API payloads (for ranking tables) ---
      const isRaw = String(req.query?.raw ?? '').toLowerCase() === 'true' || String(req.query?.raw ?? '') === '1';
      if (isRaw) {
        if (!TRACKER_API_URL || !TRACKER_API_TOKEN) {
          return res.status(500).json({ error: 'Tracker API credentials not configured' });
        }
        res.setHeader('Cache-Control', 'no-store');

        const LEADER_METRICS_CODES = ['revenue_created', 'revenue_closed', 'frames_count', 'conversion_rate', 'csi', 'avg_glasses_price', 'margin_rate', 'avg_repaires_price'];

        const metricCodes = (() => {
          const rawCodes = req.query?.metric_codes;
          const list = Array.isArray(rawCodes) ? rawCodes.map(String) : rawCodes != null ? [String(rawCodes)] : [];
          const flattened = list.flatMap(s => s.split(',')).map(s => s.trim()).filter(Boolean);
          const cleaned = flattened.filter(c => /^[a-z_]+$/i.test(c));
          return cleaned.length > 0 ? cleaned : LEADER_METRICS_CODES;
        })();

        // Collect query params for Tracker API (skip raw, metric_codes)
        const queryParams = {};
        Object.entries(req.query).forEach(([k, v]) => {
          if (k === 'metric_codes' || k === 'raw') return;
          if (k === 'store_id' && req.query?.store_ids === undefined) {
            queryParams['store_ids'] = Array.isArray(v) ? v : [v];
            return;
          }
          queryParams[k] = v;
        });

        // Fallback dates — Tracker API requires both
        const today = new Date().toISOString().slice(0, 10);
        const firstOfMonth = (() => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); })();
        if (!queryParams.date_from && !queryParams.date_to) {
          queryParams.date_from = firstOfMonth;
          queryParams.date_to = today;
        } else if (!queryParams.date_to && queryParams.date_from) {
          const d = new Date(queryParams.date_from);
          const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
          const t = new Date(today);
          queryParams.date_to = (last > t ? t : last).toISOString().slice(0, 10);
        } else if (!queryParams.date_from && queryParams.date_to) {
          const d = new Date(queryParams.date_to);
          queryParams.date_from = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
        }

        // Resolve tracker URL/auth from data source config, fallback to env vars
        let effectiveTrackerUrl = TRACKER_API_URL;
        let effectiveTrackerHeaders = { 'Authorization': `Bearer ${TRACKER_API_TOKEN}`, 'Content-Type': 'application/json' };
        try {
          const trackerSource = typeof getSourceById === 'function' ? await getSourceById('tracker').catch(() => null) : null;
          if (trackerSource?.baseUrl) {
            effectiveTrackerUrl = trackerSource.baseUrl;
            effectiveTrackerHeaders = { ...buildAuthHeaders(trackerSource.authType, trackerSource.authConfig), 'Content-Type': 'application/json' };
          }
        } catch { /* use defaults */ }

        const results = await Promise.allSettled(
          metricCodes.map(async (metricCode) => {
            const url = new URL(`/api/v1/portal/analytics/metrics/${metricCode}`, effectiveTrackerUrl);
            Object.entries(queryParams).forEach(([k, v]) => {
              if (Array.isArray(v)) {
                v.forEach(value => url.searchParams.append(k, value));
              } else if (v !== undefined) {
                url.searchParams.append(k, v);
              }
            });

            const response = await fetch(url.toString(), { method: 'GET', headers: effectiveTrackerHeaders });
            if (!response.ok) {
              const text = await response.text();
              loggerWithUser.error(req, 'Tracker raw metric error', { status: response.status, url: url.toString(), body: text });
              const error = new Error(`Request failed: ${response.status}`);
              error.status = response.status;
              error.body = text;
              throw error;
            }
            const json = await response.json();
            // Ensure `code` field is present (Tracker API may omit it)
            if (!json.code) json.code = metricCode;
            return json;
          })
        );

        const rawPayloads = results
          .filter(r => r.status === 'fulfilled')
          .map(r => r.value);

        // Include widgets (rankings etc.) for dashboard rendering
        let widgets;
        let rankingLossConfig;
        try {
          const dashConfig = await readDashboardMetricsConfig();
          widgets = dashConfig.widgets;
          rankingLossConfig = dashConfig.rankingLossConfig;
        } catch { /* ignore */ }

        return res.json({
          data: rawPayloads,
          widgets: widgets || [],
          // Backward compat: keep rankingLossConfig for old clients
          rankingLossConfig: rankingLossConfig || { mode: 'metric', metricCode: 'revenue_created', formula: '' },
        });
      }

      // --- NORMAL MODE: config-driven metrics ---
      const metricsConfig = await readDashboardMetricsConfig();
      const allEnabled = metricsConfig.metrics
        .filter(m => m.enabled)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      // V2: filter by visibleToPositions using designation from JWT
      // Admin preview can skip this filter to see all metrics
      const skipPositionFilter = req.query.skipPositionFilter === '1';
      const userDesignation = req.user?.designation || null;
      const userCategory = userDesignation ? _getDashboardPositionCategory(userDesignation) : null;
      const positionFiltered = skipPositionFilter
        ? allEnabled
        : allEnabled.filter(m =>
            !m.visibleToPositions?.length || (userCategory && m.visibleToPositions.includes(userCategory))
          );

      if (positionFiltered.length === 0) {
        loggerWithUser.warn(req, 'No metrics after position filter', {
          totalEnabled: allEnabled.length,
          userCategory,
          skipPositionFilter,
        });
        return res.json([]);
      }

      // Split into top-level (no parentId) and children
      const topLevelMetrics = positionFiltered.filter(m => !m.parentId);
      const childIds = new Set(positionFiltered.filter(m => m.parentId).map(m => m.parentId));

      // Only fetch data for top-level metrics
      const topMetrics = await _fetchMetricsData(req, topLevelMetrics);

      if (topMetrics.length === 0) {
        loggerWithUser.warn(req, 'No metrics returned after fetch', {
          totalEnabled: topLevelMetrics.length,
          positionFiltered: positionFiltered.length,
        });
        return res.json([]);
      }

      // Add hasChildren flag so frontend knows which metrics are clickable
      const result = topMetrics.map(m => ({
        ...m,
        hasChildren: childIds.has(m.id),
      }));

      res.json(result);
    } catch (error) {
      if (error.status === 422) {
        return res.status(422).json({
          error: 'Validation error',
          details: error.body || error.message
        });
      }
      loggerWithUser.error(req, 'Ошибка проксирования top-leader-metrics', { error: error.message });
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });

  // --- Child metrics for a parent metric (drill-down) ---
  app.get('/api/top-leader-metrics/:parentId/children', requireAuth, async (req, res) => {
    try {
      const { parentId } = req.params;
      const metricsConfig = await readDashboardMetricsConfig();
      const allEnabled = metricsConfig.metrics
        .filter(m => m.enabled)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      // V2: filter by visibleToPositions using designation from JWT
      const skipPositionFilter = req.query.skipPositionFilter === '1';
      const userDesignation = req.user?.designation || null;
      const userCategory = userDesignation ? _getDashboardPositionCategory(userDesignation) : null;
      const positionFiltered = skipPositionFilter
        ? allEnabled
        : allEnabled.filter(m =>
            !m.visibleToPositions?.length || (userCategory && m.visibleToPositions.includes(userCategory))
          );

      const parent = positionFiltered.find(m => m.id === parentId);
      if (!parent) {
        return res.status(404).json({ error: `Metric "${parentId}" not found` });
      }

      const childMetrics = positionFiltered.filter(m => m.parentId === parentId);

      // Fetch data for parent + children together
      const metricsToFetch = [parent, ...childMetrics];
      const results = await _fetchMetricsData(req, metricsToFetch);

      const parentResult = results.find(r => r.id === parentId) || null;
      const childResults = results.filter(r => r.id !== parentId);

      res.json({
        parent: parentResult,
        children: childResults,
      });
    } catch (error) {
      if (error.status === 422) {
        return res.status(422).json({
          error: 'Validation error',
          details: error.body || error.message
        });
      }
      loggerWithUser.error(req, 'Ошибка загрузки дочерних метрик', { error: error.message, parentId: req.params.parentId });
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });

  // --- Time-series data for a single metric (grouped by day/week/month) ---
  app.get('/api/top-leader-metrics/:metricId/series', requireAuth, async (req, res) => {
    try {
      const { metricId } = req.params;
      const groupBy = req.query.group_by || 'day'; // day | week | month
      const dateFrom = req.query.date_from;
      const dateTo = req.query.date_to;

      if (!dateFrom || !dateTo) {
        return res.status(400).json({ error: 'date_from and date_to are required' });
      }

      const metricsConfig = await readDashboardMetricsConfig();
      const metric = metricsConfig.metrics.find(m => m.id === metricId && m.enabled);
      if (!metric) {
        return res.status(404).json({ error: `Metric "${metricId}" not found` });
      }

      // Store filter
      let storeFilter = null;
      if (req.query.store_ids) {
        storeFilter = Array.isArray(req.query.store_ids) ? req.query.store_ids : [req.query.store_ids];
      } else if (req.query.store_id) {
        storeFilter = [req.query.store_id];
      }

      const from = parseLocalDate(dateFrom);
      const to = parseLocalDate(dateTo);

      if (metric.source === 'manual') {
        const entries = metric.manualData || [];

        // Collect daily entries in range
        const dailyEntries = entries.filter(e => {
          if (e.period.length !== 10) return false;
          const d = parseLocalDate(e.period);
          if (d < from || d > to) return false;
          if (storeFilter && storeFilter.length > 0) {
            return storeFilter.includes(e.storeId || '') || (!e.storeId && storeFilter.length === 1);
          }
          return true;
        });

        // Group by key
        const groups = {};
        for (const entry of dailyEntries) {
          const key = groupBy === 'week' ? getISOWeekKey(entry.period)
            : groupBy === 'month' ? entry.period.substring(0, 7)
            : entry.period; // day
          if (!groups[key]) groups[key] = { facts: [], plans: [] };
          groups[key].facts.push(_toNumber(entry.fact) ?? 0);
          groups[key].plans.push(_toNumber(entry.plan) ?? 0);
        }

        const isAvg = metric.aggregation === 'simple_average' || metric.aggregation === 'weighted_average';
        const series = Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).map(([period, data]) => ({
          period,
          fact: isAvg
            ? Math.round(data.facts.reduce((s, v) => s + v, 0) / data.facts.length * 100) / 100
            : data.facts.reduce((s, v) => s + v, 0),
          plan: isAvg
            ? Math.round(data.plans.reduce((s, v) => s + v, 0) / (data.plans.length || 1) * 100) / 100
            : data.plans.reduce((s, v) => s + v, 0),
        }));

        return res.json({ metricId, groupBy, series });
      }

      if (metric.source === 'tracker') {
        // Pass group_by to Tracker API and proxy the response
        const trackerSource = await getSourceById('tracker').catch(() => null);
        const effectiveTrackerUrl = trackerSource?.baseUrl || TRACKER_API_URL;
        const effectiveTrackerHeaders = trackerSource
          ? { ...buildAuthHeaders(trackerSource.authType, trackerSource.authConfig), 'Content-Type': 'application/json' }
          : { 'Authorization': `Bearer ${TRACKER_API_TOKEN}`, 'Content-Type': 'application/json' };

        if (!effectiveTrackerUrl) {
          return res.status(502).json({ error: 'Tracker API not configured' });
        }

        const url = new URL(`/api/v1/portal/analytics/metrics/${metric.trackerCode || metric.id}`, effectiveTrackerUrl);
        url.searchParams.set('date_from', dateFrom);
        url.searchParams.set('date_to', dateTo);
        url.searchParams.set('group_by', groupBy);
        if (storeFilter) {
          storeFilter.forEach(id => url.searchParams.append('store_ids', id));
        }

        const resp = await fetch(url.toString(), { headers: effectiveTrackerHeaders, signal: AbortSignal.timeout(15000) });
        if (!resp.ok) {
          return res.status(resp.status).json({ error: 'Tracker API error', details: await resp.text().catch(() => '') });
        }
        const data = await resp.json();
        return res.json({ metricId, groupBy, series: data.series || data });
      }

      // external_api and computed — grouping not supported yet
      return res.json({ metricId, groupBy, series: [], message: 'Grouping not supported for this metric source' });
    } catch (error) {
      loggerWithUser.error(req, 'Ошибка загрузки series метрики', { error: error.message, metricId: req.params.metricId });
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });

  // --- Motivation: fetch metric values for linked KPIs ---
  app.get('/api/motivation/metric-values', requireAuth, async (req, res) => {
    try {
      const { metricIds, storeId, scope } = req.query;

      if (!metricIds || typeof metricIds !== 'string') {
        return res.status(400).json({ error: 'metricIds query parameter is required' });
      }
      // scope=employee → личные данные (без storeId), scope=branch (default) → данные филиала
      const isEmployeeScope = scope === 'employee';
      if (!isEmployeeScope && (!storeId || typeof storeId !== 'string')) {
        return res.status(400).json({ error: 'storeId query parameter is required' });
      }

      const ids = metricIds.split(',').map(s => s.trim()).filter(Boolean);
      if (ids.length === 0) {
        return res.status(400).json({ error: 'At least one metricId is required' });
      }
      if (ids.length > 20) {
        return res.status(400).json({ error: 'Too many metricIds (max 20)' });
      }

      // Date range: use optional `period` query param (YYYY-MM) or default to current month
      let year, month;
      if (req.query.period && /^\d{4}-\d{2}$/.test(req.query.period)) {
        [year, month] = req.query.period.split('-').map(Number);
        month = month - 1; // 0-based
      } else {
        const now = new Date();
        year = now.getFullYear();
        month = now.getMonth();
      }
      const dateFrom = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const dateTo = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const metricsConfig = await readDashboardMetricsConfig();
      const requestedMetrics = metricsConfig.metrics.filter(m => ids.includes(m.id) && m.enabled);

      const period = `${year}-${String(month + 1).padStart(2, '0')}`;

      if (requestedMetrics.length === 0) {
        return res.json({ values: {}, period, storeId: storeId || null });
      }

      // Synthetic req: для employee scope не передаём store_id → manual data вернёт записи без storeId (личные)
      const syntheticQuery = { date_from: dateFrom, date_to: dateTo };
      if (isEmployeeScope) {
        // Pass employee_id so bindings filter can match employee-scoped metrics
        syntheticQuery.employee_id = req.user?.employee_id || req.query.employee_id || null;
      } else {
        syntheticQuery.store_id = storeId;
      }
      const syntheticReq = { ...req, query: syntheticQuery };
      const results = await _fetchMetricsData(syntheticReq, requestedMetrics);

      const values = {};
      for (const r of results) {
        const percent = r.plan > 0 ? Math.round((r.current / r.plan) * 10000) / 100 : 0;
        values[r.id] = { fact: r.current, plan: r.plan, percent };
      }

      res.json({ values, period, storeId: storeId || null });
    } catch (error) {
      if (error.status === 422) {
        return res.status(422).json({ error: 'Validation error', details: error.body || error.message });
      }
      loggerWithUser.error(req, 'Error fetching motivation metric values', { error: error.message });
      res.status(500).json({ error: 'Failed to fetch metric values', details: error.message });
    }
  });

  // --- Manager breakdown: per-manager plan/fact for a branch ---
  app.get('/api/motivation/manager-breakdown', requireAuth, async (req, res) => {
    try {
      const { branchId, period, metricIds: metricIdsRaw } = req.query;
      if (!branchId || !period || !metricIdsRaw) {
        return res.status(400).json({ error: 'branchId, period and metricIds are required' });
      }
      const metricIds = String(metricIdsRaw).split(',').map(s => s.trim()).filter(Boolean);
      if (metricIds.length === 0 || metricIds.length > 30) {
        return res.status(400).json({ error: 'metricIds: 1-30 required' });
      }

      // 1. Fetch ALL employees for this branch
      const storeId = String(branchId);
      let allEmployees = [];
      try {
        if (ORG_DATA_SOURCE !== 'frappe') {
          // Use own data (PG → JSON fallback)
          const storeResult = await orgData.getEmployeesByStoreIds([storeId]);
          allEmployees = (Array.isArray(storeResult) ? storeResult : [])
            .map(e => ({
              employee_id: e.name,
              employee_name: e.employee_name,
              itigris_id: e.custom_itigris_user_id || null,
              category: _getDashboardPositionCategory(e.designation),
            }))
            .filter(e => e.category !== 'leader');
        } else {
          // Frappe path
          const employeeId = await resolveCurrentEmployeeId(req);
          if (employeeId) {
            const roleUrl = `${FRAPPE_BASE_URL}/api/method/loovis_get_employee_role`;
            const roleRes = await fetch(roleUrl, {
              method: 'POST',
              headers: {
                'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ employee_id: employeeId }),
            });
            const roleJson = await roleRes.json();
            const roleData = roleJson?.data || roleJson?.message || roleJson || {};

            // Walk department tree to find department matching storeId
            let deptId = null;
            const walkDepts = (nodes) => {
              if (!Array.isArray(nodes)) return;
              for (const n of nodes) {
                const sid = n?.custom_store_id != null ? String(n.custom_store_id).trim() : '';
                if (sid === storeId && n?.id) {
                  deptId = String(n.id).trim();
                }
                walkDepts(n?.sub_departments);
              }
            };
            walkDepts(roleData?.departments);

            if (deptId) {
              const fields = JSON.stringify(["name","employee_name","designation","custom_itigris_user_id"]);
              const filters = JSON.stringify([["department","=",deptId],["status","=","Active"]]);
              const empUrl = `${FRAPPE_BASE_URL}/api/resource/Employee?filters=${encodeURIComponent(filters)}&fields=${encodeURIComponent(fields)}&limit_page_length=100`;
              const empRes = await fetch(empUrl, {
                headers: { 'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}` },
              });
              const empData = await empRes.json();
              allEmployees = (empData?.data || [])
                .map(e => ({
                  employee_id: e.name,
                  employee_name: e.employee_name,
                  itigris_id: e.custom_itigris_user_id || null,
                  category: _getDashboardPositionCategory(e.designation),
                }))
                .filter(e => e.category !== 'leader');
            } else {
              loggerWithUser.warn(req, 'manager-breakdown: department not found for storeId', { storeId });
            }
          }
        }
        if (allEmployees.length === 0) {
          loggerWithUser.warn(req, 'manager-breakdown: no non-leader employees found', { storeId });
        }
      } catch (err) {
        loggerWithUser.warn(req, 'manager-breakdown: failed to fetch employees', { error: err.message, storeId });
      }

      // Calculate remaining working days for forecast/predictive fields
      let _breakdownRemainingWorkingDays = 0;
      try {
        const [pYear, pMonth] = String(period).split('-').map(Number);
        const monthEnd = new Date(pYear, pMonth, 0); // last day of month
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (monthEnd >= today) {
          _breakdownRemainingWorkingDays = getWorkingDaysInRange(today, monthEnd);
        }
      } catch (_) { /* ignore */ }

      // 2. Load metric configs + plans
      const metricsConfig = await readDashboardMetricsConfig();
      const allMetrics = metricsConfig.metrics || [];
      const requestedMetrics = allMetrics.filter(m => metricIds.includes(m.id) && m.enabled);

      // 2b. For computed metrics, ensure their formula dependencies are also loaded
      const computedMetrics = requestedMetrics.filter(m => (m.metricType === 'computed' || m.source === 'computed') && m.formula);
      const depIds = new Set();
      for (const cm of computedMetrics) {
        const deps = cm.formulaDependencies?.length ? cm.formulaDependencies : extractDependencies(cm.formula);
        for (const dep of deps) depIds.add(dep);
      }
      // Add dependency metrics that aren't already requested
      const extraDepMetrics = allMetrics.filter(m => depIds.has(m.id) && m.enabled && !metricIds.includes(m.id));
      const allNeededMetrics = [...requestedMetrics, ...extraDepMetrics];

      const { plans: allPlans } = await readMetricPlans().catch(() => ({ plans: [] }));
      const allEmployeeIds = new Set(allEmployees.map(e => e.employee_id));
      const periodStr = String(period);

      // Employee-level plans: employeeId → metricId → planValue
      const planMap = {};
      for (const p of allPlans) {
        if (p.scope === 'employee' && allEmployeeIds.has(p.scopeId) && metricIds.includes(p.metricId) && p.period === periodStr) {
          if (!planMap[p.scopeId]) planMap[p.scopeId] = {};
          planMap[p.scopeId][p.metricId] = p.planValue;
        }
      }

      // Branch-level plans: metricId → planValue
      const branchPlanMap = {};
      for (const p of allPlans) {
        if (p.scope === 'branch' && p.scopeId === storeId && metricIds.includes(p.metricId) && p.period === periodStr) {
          branchPlanMap[p.metricId] = p.planValue;
        }
      }

      // 3. Fetch facts from all sources

      // 3a. Manual metrics — extract employee-scoped manual entries
      // manualFacts: employeeId → metricId → { fact }
      const manualFacts = {};
      const manualMetrics = allNeededMetrics.filter(m => m.source === 'manual');
      for (const metric of manualMetrics) {
        const isAvg = metric.metricType === 'averaged' || metric.metricType === 'percentage';
        const entries = (metric.manualData || []).filter(d => {
          // Match period: exact YYYY-MM or daily entries within the month (YYYY-MM-DD)
          const dp = String(d.period || '');
          const matchesPeriod = dp === periodStr || dp.startsWith(periodStr + '-');
          const matchesStore = !d.storeId || d.storeId === storeId;
          return matchesPeriod && matchesStore && d.employeeId;
        });
        for (const entry of entries) {
          if (!manualFacts[entry.employeeId]) manualFacts[entry.employeeId] = {};
          const existing = manualFacts[entry.employeeId][metric.id];
          const entryFact = typeof entry.fact === 'number' ? entry.fact : null;
          if (existing) {
            existing._count = (existing._count || 1) + 1;
            if (isAvg) {
              // Running average for averaged/percentage metrics
              existing.fact = ((existing.fact ?? 0) * (existing._count - 1) + (entryFact ?? 0)) / existing._count;
            } else {
              // Sum for absolute metrics
              existing.fact = (existing.fact ?? 0) + (entryFact ?? 0);
            }
          } else {
            manualFacts[entry.employeeId][metric.id] = { fact: entryFact, _count: 1 };
          }
        }
      }

      // 3b. Tracker metrics
      const trackerMetrics = allNeededMetrics.filter(m => m.source === 'tracker');

      // itigrisId → metricId → { fact, plan }
      const trackerFacts = {};
      if (trackerMetrics.length > 0) {
        const trackerSource = await getSourceById('tracker').catch(() => null);
        const effectiveTrackerUrl = trackerSource?.baseUrl || TRACKER_API_URL;
        const effectiveTrackerHeaders = trackerSource
          ? { ...buildAuthHeaders(trackerSource.authType, trackerSource.authConfig), 'Content-Type': 'application/json' }
          : { 'Authorization': `Bearer ${TRACKER_API_TOKEN}`, 'Content-Type': 'application/json' };

        if (effectiveTrackerUrl) {
          const [pYear, pMonth] = String(period).split('-').map(Number);
          const dateFrom = `${pYear}-${String(pMonth).padStart(2, '0')}-01`;
          const lastDay = new Date(pYear, pMonth, 0).getDate();
          const dateTo = `${pYear}-${String(pMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

          const urls = trackerMetrics.map(m => {
            const url = new URL(`/api/v1/portal/analytics/metrics/${m.trackerCode || m.id}`, effectiveTrackerUrl);
            url.searchParams.set('date_from', dateFrom);
            url.searchParams.set('date_to', dateTo);
            url.searchParams.set('by_managers', 'True');
            url.searchParams.append('store_ids', storeId);
            return { metric: m, url };
          });

          const results = await Promise.allSettled(
            urls.map(async ({ metric, url }) => {
              const response = await fetch(url.toString(), { method: 'GET', headers: effectiveTrackerHeaders });
              if (!response.ok) return null;
              const json = await response.json().catch(() => null);
              return { metricId: metric.id, data: json };
            })
          );

          const toNum = (v) => {
            if (v === null || v === undefined) return null;
            const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
            return Number.isFinite(n) ? n : null;
          };

          for (const r of results) {
            if (r.status !== 'fulfilled' || !r.value?.data?.managers) continue;
            const { metricId, data } = r.value;
            const mgrs = typeof data.managers === 'object' ? data.managers : {};
            for (const [itigrisIdRaw, m] of Object.entries(mgrs)) {
              const itigrisId = String(itigrisIdRaw).trim().replace(/^itigris[-_]/i, '').trim();
              if (!itigrisId) continue;
              if (!trackerFacts[itigrisId]) trackerFacts[itigrisId] = {};
              trackerFacts[itigrisId][metricId] = {
                fact: toNum(m?.fact_value) ?? 0,
                plan: toNum(m?.plan_value) ?? 0,
              };
            }
          }
        }
      }

      // 4. Build per-metric response for non-computed metrics first
      // Also collect per-employee facts for computed metric evaluation
      // employeeFacts: employeeId → metricId → fact
      const employeeFacts = {};
      const byMetric = {};

      const nonComputedMetrics = allNeededMetrics.filter(m => !((m.metricType === 'computed' || m.source === 'computed') && m.formula));

      for (const metric of nonComputedMetrics) {
        const mid = metric.id;
        const vtp = metric.visibleToPositions || [];

        const relevantEmployees = allEmployees.filter(emp => {
          if (vtp.length === 0) return true;
          return vtp.includes(emp.category);
        });

        const relevantCount = relevantEmployees.length || 1;

        const managers = relevantEmployees.map(emp => {
          const trackerData = emp.itigris_id ? trackerFacts[emp.itigris_id]?.[mid] : null;
          const manualData = manualFacts[emp.employee_id]?.[mid] ?? null;
          const fact = trackerData?.fact ?? manualData?.fact ?? null;

          // Store fact for computed metrics
          if (!employeeFacts[emp.employee_id]) employeeFacts[emp.employee_id] = {};
          employeeFacts[emp.employee_id][mid] = fact;

          let plan = planMap[emp.employee_id]?.[mid] ?? null;
          if (plan == null && trackerData?.plan) {
            plan = trackerData.plan;
          }
          if (plan == null && branchPlanMap[mid] != null) {
            const isAvg = metric.metricType === 'averaged' || metric.metricType === 'percentage';
            plan = isAvg
              ? branchPlanMap[mid]
              : Math.round((branchPlanMap[mid] / relevantCount) * 100) / 100;
          }

          // Store plan for computed metrics
          if (plan != null) {
            if (!employeeFacts[emp.employee_id]) employeeFacts[emp.employee_id] = {};
            employeeFacts[emp.employee_id][mid + '.plan'] = plan;
          }

          const percent = plan && plan > 0 && fact != null ? Math.round((fact / plan) * 10000) / 100 : null;

          // Enrich with reserve/loss/forecast/predicted via _buildMetricResponse
          const effectiveFact = fact ?? 0;
          const effectivePlan = plan ?? 0;
          const lossOrOver = _calculateLossOrOver(metric, effectiveFact, effectivePlan, null, null);
          const enriched = _buildMetricResponse(metric, effectiveFact, effectivePlan, null, lossOrOver, '', '', _breakdownRemainingWorkingDays);

          return {
            employee_id: emp.employee_id,
            employee_name: emp.employee_name,
            category: emp.category,
            plan,
            fact,
            percent,
            // Derived fields for KPI card parity
            reserve: enriched.reserve,
            reserveUnit: enriched.reserveUnit,
            loss: enriched.loss,
            forecast: enriched.forecast,
            forecastValue: enriched.forecastValue,
            forecastUnit: enriched.forecastUnit,
            forecastLabel: enriched.forecastLabel,
            status: enriched.status,
            predictedValue: enriched.predictedValue,
            predictedCompletion: enriched.predictedCompletion,
            dailyRate: enriched.dailyRate,
          };
        });

        // Only include in response if it was originally requested (not just a dependency)
        if (metricIds.includes(mid)) {
          byMetric[mid] = { managers };
        }
      }

      // 5. Evaluate computed metrics per employee using formula engine
      if (computedMetrics.length > 0) {
        const order = getEvaluationOrder(computedMetrics);

        for (const metricId of order) {
          const metric = computedMetrics.find(m => m.id === metricId);
          if (!metric) continue;

          const vtp = metric.visibleToPositions || [];
          const relevantEmployees = allEmployees.filter(emp => {
            if (vtp.length === 0) return true;
            return vtp.includes(emp.category);
          });
          const relevantCount = relevantEmployees.length || 1;

          const managers = relevantEmployees.map(emp => {
            // Build per-employee valuesMap for formula evaluation
            const valuesMap = {};
            const empFacts = employeeFacts[emp.employee_id] || {};
            for (const [key, val] of Object.entries(empFacts)) {
              if (val != null) valuesMap[key] = val;
              // Also set {metric.fact} alias for bare metric refs
              if (!key.includes('.') && val != null) {
                valuesMap[key + '.fact'] = val;
              }
            }

            const { result, error: formulaError } = evaluateFormula(metric.formula, valuesMap);
            if (formulaError) {
              loggerWithUser.warn(req, 'manager-breakdown: formula error', { metricId, employeeId: emp.employee_id, error: formulaError });
            }

            const fact = Number.isFinite(result) ? result : null;

            // Store computed fact for downstream computed metrics
            if (!employeeFacts[emp.employee_id]) employeeFacts[emp.employee_id] = {};
            employeeFacts[emp.employee_id][metricId] = fact;
            employeeFacts[emp.employee_id][metricId + '.fact'] = fact;

            // Plan for computed: employee-level → branch-level
            let plan = planMap[emp.employee_id]?.[metricId] ?? null;
            if (plan == null && branchPlanMap[metricId] != null) {
              const isAvg = metric.metricType === 'averaged' || metric.metricType === 'percentage';
              plan = isAvg
                ? branchPlanMap[metricId]
                : Math.round((branchPlanMap[metricId] / relevantCount) * 100) / 100;
            }
            // Fallback: manualData plan (period-level)
            if (plan == null) {
              const manualPlan = (metric.manualData || []).find(e => String(e.period || '') === periodStr && (!e.storeId || e.storeId === storeId));
              if (manualPlan?.plan != null) {
                const isAvg = metric.metricType === 'averaged' || metric.metricType === 'percentage';
                plan = isAvg
                  ? manualPlan.plan
                  : Math.round((manualPlan.plan / relevantCount) * 100) / 100;
              }
            }

            if (plan != null) {
              employeeFacts[emp.employee_id][metricId + '.plan'] = plan;
            }

            const percent = plan && plan > 0 && fact != null ? Math.round((fact / plan) * 10000) / 100 : null;

            // Enrich with reserve/loss/forecast/predicted via _buildMetricResponse
            const effectiveFact = fact ?? 0;
            const effectivePlan = plan ?? 0;
            const lossOrOver = _calculateLossOrOver(metric, effectiveFact, effectivePlan, null, null);
            const enriched = _buildMetricResponse(metric, effectiveFact, effectivePlan, null, lossOrOver, '', '', _breakdownRemainingWorkingDays);

            return {
              employee_id: emp.employee_id,
              employee_name: emp.employee_name,
              category: emp.category,
              plan,
              fact,
              percent,
              // Derived fields for KPI card parity
              reserve: enriched.reserve,
              reserveUnit: enriched.reserveUnit,
              loss: enriched.loss,
              forecast: enriched.forecast,
              forecastValue: enriched.forecastValue,
              forecastUnit: enriched.forecastUnit,
              forecastLabel: enriched.forecastLabel,
              status: enriched.status,
              predictedValue: enriched.predictedValue,
              predictedCompletion: enriched.predictedCompletion,
              dailyRate: enriched.dailyRate,
            };
          });

          if (metricIds.includes(metricId)) {
            byMetric[metricId] = { managers };
          }
        }
      }

      const response = { byMetric, period: String(period), branchId: storeId };
      // Dev-mode diagnostics
      if (process.env.NODE_ENV !== 'production') {
        response._debug = {
          totalEmployees: allEmployees.length,
          metricCounts: Object.fromEntries(Object.entries(byMetric).map(([k, v]) => [k, v.managers.length])),
          trackerFactKeys: Object.keys(trackerFacts),
          computedMetricIds: computedMetrics.map(m => m.id),
          computedOrder: computedMetrics.length > 0 ? getEvaluationOrder(computedMetrics) : [],
          employeeFactsSample: Object.keys(employeeFacts).length > 0
            ? { [Object.keys(employeeFacts)[0]]: employeeFacts[Object.keys(employeeFacts)[0]] }
            : {},
        };
      }
      res.json(response);
    } catch (error) {
      loggerWithUser.error(req, 'Error fetching manager breakdown', { error: error.message });
      res.status(500).json({ error: 'Failed to fetch manager breakdown', details: error.message });
    }
  });

  // --- NEW: Leader dashboard manager ranking (by_managers=True) ---
  app.get('/api/leader-dashboard/manager-ranking', requireAuth, async (req, res) => {
    if (!TRACKER_API_URL || !TRACKER_API_TOKEN) {
      return res.status(500).json({ error: 'Tracker API credentials not configured' });
    }

    const toList = (v) => {
      if (v === undefined || v === null) return [];
      if (Array.isArray(v)) return v.map((x) => String(x)).flatMap((x) => x.split(',')).map((x) => x.trim()).filter(Boolean);
      return String(v).split(',').map((x) => x.trim()).filter(Boolean);
    };

    // same set as ManagerRankingTable columns
    const METRIC_CODES = [
      'revenue_created',
      'revenue_closed',
      'frames_count',
      'avg_glasses_price',
      'conversion_rate',
      'csi',
      'margin_rate',
    ];

    try {
      const date_from = req.query?.date_from != null ? String(req.query.date_from) : undefined;
      const date_to = req.query?.date_to != null ? String(req.query.date_to) : undefined;

      const storeIds = (() => {
        const explicit = toList(req.query?.store_ids);
        if (explicit.length > 0) return explicit;
        return toList(req.query?.store_id);
      })();

      if (storeIds.length === 0) {
        return res.status(400).json({ error: 'store_ids is required' });
      }

      const urls = METRIC_CODES.map((metric) => new URL(`/api/v1/portal/analytics/metrics/${metric}`, TRACKER_API_URL));
      for (const url of urls) {
        if (date_from) url.searchParams.set('date_from', date_from);
        if (date_to) url.searchParams.set('date_to', date_to);
        url.searchParams.set('by_managers', 'True');
        storeIds.forEach((sid) => url.searchParams.append('store_ids', sid));
      }

      const debugEnabled =
        String(env.DEBUG_MODE ?? '').toLowerCase() === 'true' ||
        String(req.query?.debug ?? '').toLowerCase() === 'true' ||
        String(req.query?.debug ?? '') === '1';

      const results = await Promise.allSettled(
        urls.map(async (url) => {
          const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${TRACKER_API_TOKEN}`,
              'Content-Type': 'application/json'
            }
          });

          const text = await response.text().catch(() => '');
          if (!response.ok) {
            loggerWithUser.error(req, 'Tracker manager ranking metric error', {
              status: response.status,
              statusText: response.statusText,
              body: text,
              url: url.toString()
            });
            const error = new Error(`Request failed: ${response.status}`);
            error.status = response.status;
            error.body = text;
            throw error;
          }

          try {
            return JSON.parse(text);
          } catch {
            return {};
          }
        })
      );

      const error422 = results.find(result =>
        result.status === 'rejected' &&
        result.reason?.status === 422
      );
      if (error422) {
        return res.status(422).json({
          error: 'Validation error',
          details: error422.reason?.body || error422.reason?.message
        });
      }

      const toNumber = (v) => {
        if (v === null || v === undefined) return null;
        if (typeof v === 'number') return Number.isFinite(v) ? v : null;
        const n = parseFloat(String(v).replace(',', '.'));
        return Number.isFinite(n) ? n : null;
      };

      const per_manager = {};
      const debug = debugEnabled ? { metrics: [], rejected: [], per_manager_count: 0 } : undefined;

      const fulfilled = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
      for (const data of fulfilled) {
        const code = data?.code ? String(data.code) : '';
        if (!code) continue;
        const managers = data?.managers && typeof data.managers === 'object' ? data.managers : {};
        if (debugEnabled) {
          const keys = managers && typeof managers === 'object' ? Object.keys(managers) : [];
          debug.metrics.push({
            code,
            has_managers_field: data?.managers !== undefined,
            managers_type: Array.isArray(data?.managers) ? 'array' : typeof data?.managers,
            managers_count: keys.length,
            sample_keys: keys.slice(0, 12),
          });
        }
        for (const [itigrisIdRaw, m] of Object.entries(managers)) {
          const itigrisId = String(itigrisIdRaw).trim().replace(/^itigris[-_]/i, '').trim();
          if (!itigrisId) continue;
          if (!per_manager[itigrisId]) per_manager[itigrisId] = {};
          per_manager[itigrisId][code] = {
            fact_value: toNumber(m?.fact_value) ?? 0,
            plan_value: toNumber(m?.plan_value) ?? 0,
            forecast_value: toNumber(m?.forecast_value),
            loss_or_overperformance: toNumber(m?.loss_or_overperformance) ?? 0,
          };
        }
      }

      if (debugEnabled) {
        results.forEach((r, idx) => {
          if (r.status === 'rejected') {
            debug.rejected.push({
              metric: METRIC_CODES[idx],
              status: r.reason?.status,
              message: r.reason?.message,
              body: String(r.reason?.body || '').slice(0, 500),
            });
          }
        });
        debug.per_manager_count = Object.keys(per_manager).length;
      }

      return res.json({
        metric_codes: METRIC_CODES,
        store_ids: storeIds,
        date_from,
        date_to,
        per_manager,
        ...(debugEnabled ? { debug } : {}),
      });
    } catch (error) {
      loggerWithUser.error(req, 'Ошибка получения рейтинга менеджеров (Tracker)', { error: error.message });
      return res.status(500).json({ error: 'Failed to fetch manager ranking', details: error.message });
    }
  });

  // --- Green Button: Create issue in Yandex Tracker ---
  app.post('/api/forms/green-feedback', requireAuth, async (req, res) => {
    try {
      if (!YANDEX_TREKER_AUTH_TOKEN || !X_ORG_ID) {
        loggerWithUser.error(req, 'Yandex Tracker credentials not configured');
        return res.status(500).json({ error: 'Yandex Tracker credentials not configured' });
      }

      const { anonymous, feedbackText, departmentText, companyEmail } = req.body || {};

      if (!feedbackText || typeof feedbackText !== 'string') {
        return res.status(400).json({ error: 'feedbackText is required' });
      }

      const today = new Date();
      const dateStr = today.toLocaleDateString('ru-RU');

      const descriptionParts = [
        `Отзыв: ${feedbackText}`,
        `Клуб/Отдел: ${departmentText || ''}`
      ];

      // Определяем автора: если не анонимно — используем логин пользователя
      let author = 'admindatalens';
      const notAnonymous = anonymous === false || anonymous === 'no' || anonymous === 'Нет' || anonymous === 'нет';
      if (notAnonymous && typeof companyEmail === 'string' && companyEmail) {
        const email = String(companyEmail).trim();
        const beforeAt = email.includes('@') ? email.split('@')[0] : email;
        // Если домен loov.team — берём часть до @, иначе тоже часть до @ как логин
        author = beforeAt || author;
      }

      const body = {
        summary: `Отзыв от ${dateStr}`,
        queue: 'LF',
        description: descriptionParts.join('\n'),
        author,
        // Пытаемся добавить наблюдателя сразу при создании (если поддерживается)
        followers: 'tb'
      };

      const response = await fetch('https://api.tracker.yandex.net/v2/issues', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${YANDEX_TREKER_AUTH_TOKEN}`,
          'X-Org-ID': X_ORG_ID,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const text = await response.text();
      if (!response.ok) {
        loggerWithUser.error(req, 'Yandex Tracker create issue failed', { status: response.status, body: text });
        return res.status(response.status).json({ error: 'Failed to create issue', details: text });
      }

      let data;
      try { data = JSON.parse(text); } catch { data = {}; }
      loggerWithUser.info(req, 'Yandex Tracker issue created', { key: data?.key, id: data?.id });
      const issueKeyOrId = data?.key || data?.id;

      // Надежно добавляем наблюдателя через отдельный вызов API (на случай, если поле followers при создании игнорируется)
      if (issueKeyOrId) {
        try {
          // Пробуем через PATCH на саму задачу, указывая логин строкой
          const followersPayload = { followers: 'tb' };
          const followersResp = await fetch(`https://api.tracker.yandex.net/v2/issues/${encodeURIComponent(issueKeyOrId)}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${YANDEX_TREKER_AUTH_TOKEN}`,
              'X-Org-ID': X_ORG_ID,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(followersPayload)
          });
          if (!followersResp.ok) {
            const followersText = await followersResp.text();
            loggerWithUser.warn(req, 'Failed to add follower tb to issue', { status: followersResp.status, body: followersText, issue: issueKeyOrId });
          } else {
            loggerWithUser.info(req, 'Follower tb added to issue', { issue: issueKeyOrId });
          }
        } catch (e) {
          loggerWithUser.warn(req, 'Error while adding follower tb', { error: e?.message, issue: issueKeyOrId });
        }
      }

      return res.json({ key: data?.key, id: data?.id, raw: data });
    } catch (error) {
      loggerWithUser.error(req, 'Unexpected error creating Yandex Tracker issue', { error: error.message });
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });

  /**
   * @swagger
   * /api/frappe/departments/{departmentId}:
   *   get:
   *     summary: Получение информации о департаменте
   *     description: Возвращает данные Department, включая custom_store_id
   *     tags: [Frappe API]
   *     parameters:
   *       - in: path
   *         name: departmentId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID департамента (name в Frappe)
   *     responses:
   *       200:
   *         description: Информация о департаменте
   *       401:
   *         description: Не авторизован
   *       404:
   *         description: Департамент не найден
   */
  app.get('/api/frappe/departments/:departmentId', requireAuth, async (req, res) => {
    const { departmentId } = req.params;

    // Try own data source first (PG → JSON fallback)
    if (ORG_DATA_SOURCE !== 'frappe') {
      try {
        const result = await orgData.getDepartmentById(departmentId);
        if (result?.data) {
          loggerWithUser.info(req, 'Получен департамент (own)', { departmentId, custom_store_id: result.data.custom_store_id });
          return res.json(result);
        }
        if (ORG_DATA_SOURCE === 'dual') { /* fallthrough to Frappe */ } else {
          return res.status(404).json({ error: 'Department not found' });
        }
      } catch (e) {
        if (ORG_DATA_SOURCE !== 'dual') return res.status(500).json({ error: 'Failed to fetch department', details: e.message });
      }
    }

    if (!FRAPPE_API_KEY || !FRAPPE_API_SECRET) {
      return res.status(500).json({ error: 'Frappe API credentials not configured' });
    }

    try {
      const url = `${FRAPPE_BASE_URL}/api/resource/Department/${encodeURIComponent(departmentId)}?fields=["name","department_name","custom_store_id"]`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return res.status(404).json({ error: 'Department not found' });
        }
        throw new Error(`Frappe API error: ${response.status}`);
      }

      const result = await response.json();
      loggerWithUser.info(req, 'Получен департамент', {
        departmentId,
        custom_store_id: result.data?.custom_store_id,
      });
      res.json(result);
    } catch (error) {
      loggerWithUser.error(req, 'Ошибка получения департамента', { error: error.message, departmentId });
      res.status(500).json({ error: 'Failed to fetch department' });
    }
  });

  /**
   * loovis_get_employee_role proxy (access level + allowed stores).
   *
   * Returns flattened store list from nested departments tree:
   * - only nodes with custom_store_id
   * - deduped by store_id
   *
   * NOTE: We intentionally resolve employee_id from auth payload to prevent spoofing.
   */
  app.post('/api/frappe/loovis/employee-role', requireAuth, async (req, res) => {
    try {
      // Resolve employee docname (e.g. HR-EMP-00138)
      const employeeId = await resolveCurrentEmployeeId(req);
      if (!employeeId) {
        return res.status(400).json({ error: 'Cannot resolve employeeId for current user' });
      }

      // ── PostgreSQL path ──
      if (ORG_DATA_SOURCE !== 'frappe') {
        try {
          const result = await rbac.resolveEmployeeRole(employeeId);
          loggerWithUser.info(req, 'Employee role resolved (PG)', { employeeId, role: result.loovis_role, stores: result.stores?.length });
          res.setHeader('Cache-Control', 'no-store');
          return res.json(result);
        } catch (pgError) {
          loggerWithUser.error(req, 'PG error in employee-role, falling back to Frappe', { error: pgError.message, employeeId });
          if (ORG_DATA_SOURCE !== 'dual') {
            return res.status(500).json({ error: 'Internal server error', details: pgError.message });
          }
          // fallthrough to Frappe
        }
      }

      // ── Frappe path (original) ──
      if (!FRAPPE_API_KEY || !FRAPPE_API_SECRET) {
        loggerWithUser.error(req, 'Frappe API credentials not configured');
        return res.status(500).json({ error: 'Frappe API credentials not configured' });
      }

      const methodUrl = `${FRAPPE_BASE_URL}/api/method/loovis_get_employee_role`;
      const frappeResp = await fetch(methodUrl, {
        method: 'POST',
        headers: {
          'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ employee_id: employeeId })
      });

      const text = await frappeResp.text().catch(() => '');
      let json;
      try { json = JSON.parse(text); } catch { json = null; }

      if (!frappeResp.ok) {
        loggerWithUser.error(req, 'Frappe loovis_get_employee_role error', {
          status: frappeResp.status,
          statusText: frappeResp.statusText,
          body: text,
          employee_id: employeeId
        });
        return res.status(frappeResp.status).json({ error: 'Frappe API error', details: text });
      }

      const data = json?.data || json?.message || json || {};

      const collectStores = (departments) => {
        const out = [];
        const seen = new Set();
        const stripLrSuffix = (value) => {
          const s = value != null ? String(value) : '';
          return s.replace(/\s*-\s*LR\s*$/i, '').trim();
        };
        const walk = (nodes) => {
          if (!Array.isArray(nodes)) return;
          for (const n of nodes) {
            const storeId = n?.custom_store_id != null ? String(n.custom_store_id).trim() : '';
            const name = n?.name != null ? String(n.name).trim() : '';
            const departmentId = n?.id != null ? String(n.id).trim() : '';
            if (storeId) {
              const key = storeId;
              if (!seen.has(key)) {
                seen.add(key);
                out.push({
                  store_id: storeId,
                  name: stripLrSuffix(name || departmentId || storeId) || storeId,
                  department_id: departmentId || null
                });
              }
            }
            walk(n?.sub_departments);
          }
        };
        walk(departments);
        return out;
      };

      const stores = collectStores(data?.departments);

      res.setHeader('Cache-Control', 'no-store');
      return res.json({
        employee_id: data?.employee_id ? String(data.employee_id) : employeeId,
        loovis_role: data?.loovis_role ? String(data.loovis_role) : null,
        source: data?.source ? String(data.source) : null,
        stores,
      });
    } catch (error) {
      loggerWithUser.error(req, 'Error in /api/frappe/loovis/employee-role', { error: error.message, stack: error.stack });
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });

  /**
   * User settings proxy (LoovIs user settings).
   *
   * - GET /api/frappe/user-settings -> loovis_user_settings_get
   * - POST /api/frappe/user-settings -> loovis_user_settings_upsert
   *
   * NOTE: employee_id is resolved from auth payload to prevent spoofing.
   */
  app.get('/api/frappe/user-settings', requireAuth, async (req, res) => {
    try {
      const employeeId = await resolveCurrentEmployeeId(req);
      if (!employeeId) {
        return res.status(400).json({ error: 'Cannot resolve employeeId for current user' });
      }

      // ── PostgreSQL path ──
      if (ORG_DATA_SOURCE !== 'frappe') {
        try {
          const data = await userSettingsDb.getUserSettings(employeeId);
          res.setHeader('Cache-Control', 'no-store');
          return res.json(data);
        } catch (pgError) {
          loggerWithUser.error(req, 'PG error in GET user-settings', { error: pgError.message, employeeId });
          if (ORG_DATA_SOURCE !== 'dual') {
            return res.status(500).json({ error: 'Internal server error', details: pgError.message });
          }
          // fallthrough to Frappe
        }
      }

      // ── Frappe path (original) ──
      if (!FRAPPE_API_KEY || !FRAPPE_API_SECRET) {
        loggerWithUser.error(req, 'Frappe API credentials not configured');
        return res.status(500).json({ error: 'Frappe API credentials not configured' });
      }

      const url = `${FRAPPE_BASE_URL}/api/method/loovis_user_settings_get?employee_id=${encodeURIComponent(employeeId)}`;
      const frappeResp = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
          'Content-Type': 'application/json',
        }
      });

      const text = await frappeResp.text().catch(() => '');
      let json;
      try { json = JSON.parse(text); } catch { json = null; }

      if (!frappeResp.ok) {
        loggerWithUser.error(req, 'Frappe loovis_user_settings_get error', {
          status: frappeResp.status,
          statusText: frappeResp.statusText,
          body: text,
          employee_id: employeeId
        });
        return res.status(frappeResp.status).json({ error: 'Frappe API error', details: text });
      }

      const data = json?.data || json?.message || json || {};
      res.setHeader('Cache-Control', 'no-store');
      return res.json(data);
    } catch (error) {
      loggerWithUser.error(req, 'Error in GET /api/frappe/user-settings', { error: error.message, stack: error.stack });
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });

  app.post('/api/frappe/user-settings', requireAuth, async (req, res) => {
    try {
      const employeeId = await resolveCurrentEmployeeId(req);
      if (!employeeId) {
        return res.status(400).json({ error: 'Cannot resolve employeeId for current user' });
      }

      const active_variant_mode = req.body?.active_variant_mode != null ? String(req.body.active_variant_mode).trim() : '';
      const last_client = req.body?.last_client != null ? String(req.body.last_client).trim() : '';
      const blobs = Array.isArray(req.body?.blobs) ? req.body.blobs : [];

      // ── PostgreSQL path ──
      if (ORG_DATA_SOURCE !== 'frappe') {
        try {
          const data = await userSettingsDb.upsertUserSettings(employeeId, { blobs, active_variant_mode, last_client });
          res.setHeader('Cache-Control', 'no-store');
          return res.json(data);
        } catch (pgError) {
          loggerWithUser.error(req, 'PG error in POST user-settings', { error: pgError.message, employeeId });
          if (ORG_DATA_SOURCE !== 'dual') {
            return res.status(500).json({ error: 'Internal server error', details: pgError.message });
          }
          // fallthrough to Frappe
        }
      }

      // ── Frappe path (original) ──
      if (!FRAPPE_API_KEY || !FRAPPE_API_SECRET) {
        loggerWithUser.error(req, 'Frappe API credentials not configured');
        return res.status(500).json({ error: 'Frappe API credentials not configured' });
      }

      const form = new URLSearchParams();
      form.set('employee_id', employeeId);
      if (active_variant_mode) form.set('active_variant_mode', active_variant_mode);
      if (last_client) form.set('last_client', last_client);
      form.set('blobs', JSON.stringify(blobs));

      const url = `${FRAPPE_BASE_URL}/api/method/loovis_user_settings_upsert`;
      const frappeResp = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form.toString(),
      });

      const text = await frappeResp.text().catch(() => '');
      let json;
      try { json = JSON.parse(text); } catch { json = null; }

      if (!frappeResp.ok) {
        loggerWithUser.error(req, 'Frappe loovis_user_settings_upsert error', {
          status: frappeResp.status,
          statusText: frappeResp.statusText,
          body: text,
          employee_id: employeeId
        });
        return res.status(frappeResp.status).json({ error: 'Frappe API error', details: text });
      }

      const data = json?.data || json?.message || json || {};
      res.setHeader('Cache-Control', 'no-store');
      return res.json(data);
    } catch (error) {
      loggerWithUser.error(req, 'Error in POST /api/frappe/user-settings', { error: error.message, stack: error.stack });
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });

  /**
   * Upload profile photo for current user and attach it to Employee.image in Frappe.
   * Expects multipart/form-data with field "file".
   */
  app.post('/api/profile/photo', requireAuth, upload.single('file'), async (req, res) => {
    try {
      if (!FRAPPE_API_KEY || !FRAPPE_API_SECRET) {
        loggerWithUser.error(req, 'Frappe API credentials not configured');
        return res.status(500).json({ error: 'Frappe API credentials not configured' });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: 'file is required' });
      }
      if (!file.mimetype || !String(file.mimetype).startsWith('image/')) {
        return res.status(400).json({ error: 'Only image/* is allowed' });
      }

      // Determine employee docname (e.g. HR-EMP-0001) from auth payload or fallback to tg_username lookup
      const employeeId = await resolveCurrentEmployeeId(req);

      if (!employeeId) {
        return res.status(400).json({ error: 'Cannot resolve employeeId for current user' });
      }

      // 1) Upload file to Frappe and attach to Employee doc
      // IMPORTANT: use unique filename to avoid file_url collisions and aggressive caching in Telegram WebView
      const extFromMime = (() => {
        const m = String(file.mimetype || '').toLowerCase();
        if (m.includes('png')) return 'png';
        if (m.includes('webp')) return 'webp';
        if (m.includes('gif')) return 'gif';
        return 'jpg';
      })();
      const safeEmployee = String(employeeId).replace(/[^a-z0-9_-]/gi, '_');
      const uniqueFilename = `profile_${safeEmployee}_${Date.now()}.${extFromMime}`;
      const form = new FormData();
      form.append('file', file.buffer, {
        filename: uniqueFilename,
        contentType: file.mimetype,
      });
      form.append('doctype', 'Employee');
      form.append('docname', employeeId);
      form.append('fieldname', 'image');
      form.append('is_private', '0');

      const uploadUrl = `${FRAPPE_BASE_URL}/api/method/upload_file`;
      const uploadResp = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
          ...form.getHeaders(),
        },
        body: form,
      });

      const uploadText = await uploadResp.text().catch(() => '');
      let uploadJson;
      try { uploadJson = JSON.parse(uploadText); } catch { uploadJson = null; }

      if (!uploadResp.ok) {
        loggerWithUser.error(req, 'Frappe upload_file failed', {
          status: uploadResp.status,
          statusText: uploadResp.statusText,
          body: uploadText
        });
        return res.status(uploadResp.status).json({ error: 'Frappe upload_file failed', details: uploadText });
      }

      const uploadedFileUrl = uploadJson?.message?.file_url || uploadJson?.file_url || null;
      if (!uploadedFileUrl) {
        loggerWithUser.error(req, 'Frappe upload_file: file_url missing', { body: uploadJson || uploadText });
        return res.status(500).json({ error: 'Frappe upload_file: file_url missing' });
      }

      // 2) Resolve most recent image file (users can have multiple attachments; we want the newest one)
      const latestFileUrl = await getLatestEmployeeImageFileUrl(req, employeeId);
      const fileUrlToUse = latestFileUrl || uploadedFileUrl;

      // 3) Explicitly set Employee.image (some setups rely on this field for avatar rendering)
      const updateUrl = `${FRAPPE_BASE_URL}/api/resource/Employee/${encodeURIComponent(employeeId)}`;
      const updateResp = await fetch(updateUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: fileUrlToUse }),
      });

      if (!updateResp.ok) {
        const updateText = await updateResp.text().catch(() => '');
        loggerWithUser.error(req, 'Frappe failed to update Employee.image', {
          status: updateResp.status,
          employeeId,
          fileUrl: fileUrlToUse,
          body: updateText
        });
        return res.status(updateResp.status).json({ error: 'Failed to update Employee.image', details: updateText, file_url: fileUrlToUse });
      }

      loggerWithUser.info(req, 'Profile photo uploaded', { employeeId, uploadedFileUrl, fileUrlToUse, latestFileUrl });
      return res.json({ ok: true, employeeId, file_url: fileUrlToUse });
    } catch (error) {
      loggerWithUser.error(req, 'Error uploading profile photo', { error: error.message, stack: error.stack });
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });

  /**
   * Remove profile photo for current user (clears Employee.image in Frappe).
   */
  app.delete('/api/profile/photo', requireAuth, async (req, res) => {
    try {
      if (!FRAPPE_API_KEY || !FRAPPE_API_SECRET) {
        loggerWithUser.error(req, 'Frappe API credentials not configured');
        return res.status(500).json({ error: 'Frappe API credentials not configured' });
      }

      let employeeId = extractEmployeeIdFromEmployeename(req.user?.employeename);
      if (!employeeId && req.user?.tg_username) {
        employeeId = await findEmployeeIdByTgUsername(req, req.user.tg_username);
      }

      if (!employeeId) {
        return res.status(400).json({ error: 'Cannot resolve employeeId for current user' });
      }

      const updateUrl = `${FRAPPE_BASE_URL}/api/resource/Employee/${encodeURIComponent(employeeId)}`;
      const updateResp = await fetch(updateUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: '' }),
      });

      if (!updateResp.ok) {
        const updateText = await updateResp.text().catch(() => '');
        loggerWithUser.error(req, 'Frappe failed to clear Employee.image', {
          status: updateResp.status,
          employeeId,
          body: updateText
        });
        return res.status(updateResp.status).json({ error: 'Failed to clear Employee.image', details: updateText });
      }

      loggerWithUser.info(req, 'Profile photo removed', { employeeId });
      return res.json({ ok: true, employeeId });
    } catch (error) {
      loggerWithUser.error(req, 'Error removing profile photo', { error: error.message, stack: error.stack });
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });

  /**
   * List all uploaded profile photos for current user (history).
   */
  app.get('/api/profile/photos', requireAuth, async (req, res) => {
    try {
      if (!FRAPPE_API_KEY || !FRAPPE_API_SECRET) {
        loggerWithUser.error(req, 'Frappe API credentials not configured');
        return res.status(500).json({ error: 'Frappe API credentials not configured' });
      }

      let employeeId = extractEmployeeIdFromEmployeename(req.user?.employeename);
      if (!employeeId && req.user?.tg_username) {
        employeeId = await findEmployeeIdByTgUsername(req, req.user.tg_username);
      }

      if (!employeeId) {
        return res.status(400).json({ error: 'Cannot resolve employeeId for current user' });
      }

      res.setHeader('Cache-Control', 'no-store');

      const items = await listEmployeeImageFiles(req, employeeId, 50);
      return res.json({ ok: true, employeeId, items });
    } catch (error) {
      loggerWithUser.error(req, 'Error listing profile photos', { error: error.message, stack: error.stack });
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });

  /**
   * List profile photo history for a specific employee (same-department only).
   * GET /api/frappe/employees/:employeeId/photos
   */
  app.get('/api/frappe/employees/:employeeId/photos', requireAuth, async (req, res) => {
    try {
      if (!FRAPPE_API_KEY || !FRAPPE_API_SECRET) {
        loggerWithUser.error(req, 'Frappe API credentials not configured');
        return res.status(500).json({ error: 'Frappe API credentials not configured' });
      }

      const targetEmployeeId = req.params.employeeId;
      if (!targetEmployeeId) return res.status(400).json({ error: 'employeeId is required' });

      // Resolve current employeeId from auth
      let currentEmployeeId = extractEmployeeIdFromEmployeename(req.user?.employeename);
      if (!currentEmployeeId && req.user?.tg_username) {
        currentEmployeeId = await findEmployeeIdByTgUsername(req, req.user.tg_username);
      }
      if (!currentEmployeeId) {
        return res.status(400).json({ error: 'Cannot resolve employeeId for current user' });
      }

      // Allow only within same department to avoid leaking photos across org
      const fields = 'fields=["department","name"]';
      const currentUrl = `${FRAPPE_BASE_URL}/api/resource/Employee/${encodeURIComponent(currentEmployeeId)}?${fields}`;
      const targetUrl = `${FRAPPE_BASE_URL}/api/resource/Employee/${encodeURIComponent(targetEmployeeId)}?${fields}`;

      const [curResp, tgtResp] = await Promise.all([
        fetch(currentUrl, {
          method: 'GET',
          headers: {
            'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
            'Content-Type': 'application/json',
          }
        }),
        fetch(targetUrl, {
          method: 'GET',
          headers: {
            'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
            'Content-Type': 'application/json',
          }
        })
      ]);

      if (!curResp.ok) return res.status(curResp.status).json({ error: 'Current employee not found' });
      if (!tgtResp.ok) return res.status(tgtResp.status).json({ error: 'Target employee not found' });

      const cur = await curResp.json().catch(() => ({}));
      const tgt = await tgtResp.json().catch(() => ({}));
      const curDept = cur?.data?.department ? String(cur.data.department) : '';
      const tgtDept = tgt?.data?.department ? String(tgt.data.department) : '';

      if (curDept && tgtDept && curDept !== tgtDept) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      res.setHeader('Cache-Control', 'no-store');
      const items = await listEmployeeImageFiles(req, targetEmployeeId, 50);
      return res.json({ ok: true, employeeId: targetEmployeeId, items });
    } catch (error) {
      loggerWithUser.error(req, 'Error listing employee profile photos', { error: error.message, stack: error.stack });
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });

  /**
   * Proxy a specific profile photo by File docname (to avoid mobile webview caching / cross-domain issues).
   * GET /api/profile/photos/file/<File.name>
   */
  app.get('/api/profile/photos/file/:fileName', requireAuth, async (req, res) => {
    try {
      if (!FRAPPE_API_KEY || !FRAPPE_API_SECRET) {
        loggerWithUser.error(req, 'Frappe API credentials not configured');
        return res.status(500).json({ error: 'Frappe API credentials not configured' });
      }

      const fileName = req.params.fileName;
      if (!fileName) return res.status(400).json({ error: 'fileName is required' });

      // Fetch File meta to get file_url
      const metaUrl = `${FRAPPE_BASE_URL}/api/resource/File/${encodeURIComponent(fileName)}?fields=["file_url","is_private","attached_to_doctype","attached_to_name"]`;
      const metaResp = await fetch(metaUrl, {
        method: 'GET',
        headers: {
          'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
          'Content-Type': 'application/json',
        }
      });
      if (!metaResp.ok) {
        const text = await metaResp.text().catch(() => '');
        return res.status(metaResp.status).json({ error: 'File not found', details: text });
      }
      const meta = await metaResp.json().catch(() => ({}));
      const fileUrl = meta?.data?.file_url ? String(meta.data.file_url) : '';
      if (!fileUrl) return res.status(404).json({ error: 'file_url missing' });

      // Proxy the actual file bytes
      const fileResp = await fetch(`${FRAPPE_BASE_URL}${fileUrl}`, {
        headers: { 'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}` }
      });
      if (!fileResp.ok) {
        const text = await fileResp.text().catch(() => '');
        return res.status(fileResp.status).json({ error: 'Image not found', details: text });
      }

      res.setHeader('Cache-Control', 'no-store');
      const contentType = fileResp.headers.get('content-type') || 'image/jpeg';
      res.setHeader('Content-Type', contentType);
      const buffer = await fileResp.arrayBuffer();
      return res.send(Buffer.from(buffer));
    } catch (error) {
      loggerWithUser.error(req, 'Error proxying profile photo file', { error: error.message, stack: error.stack });
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });

  /**
   * Proxy current user's avatar image (Employee.image) as bytes from server side.
   * GET /api/profile/photo/image
   */
  app.get('/api/profile/photo/image', requireAuth, async (req, res) => {
    try {
      if (!FRAPPE_API_KEY || !FRAPPE_API_SECRET) {
        loggerWithUser.error(req, 'Frappe API credentials not configured');
        return res.status(500).json({ error: 'Frappe API credentials not configured' });
      }

      let employeeId = extractEmployeeIdFromEmployeename(req.user?.employeename);
      if (!employeeId && req.user?.tg_username) {
        employeeId = await findEmployeeIdByTgUsername(req, req.user.tg_username);
      }
      if (!employeeId) {
        return res.status(400).json({ error: 'Cannot resolve employeeId for current user' });
      }

      const empUrl = `${FRAPPE_BASE_URL}/api/resource/Employee/${encodeURIComponent(employeeId)}?fields=["image"]`;
      const empResp = await fetch(empUrl, {
        method: 'GET',
        headers: {
          'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
          'Content-Type': 'application/json',
        }
      });
      if (!empResp.ok) {
        const text = await empResp.text().catch(() => '');
        return res.status(empResp.status).json({ error: 'Employee not found', details: text });
      }
      const emp = await empResp.json().catch(() => ({}));
      const imagePath = emp?.data?.image ? String(emp.data.image).trim() : '';
      if (!imagePath) return res.status(404).json({ error: 'No image for employee' });

      const absolute = /^https?:\/\//i.test(imagePath) ? imagePath : `${FRAPPE_BASE_URL}${imagePath.startsWith('/') ? imagePath : `/${imagePath}`}`;
      const fileResp = await fetch(absolute, {
        headers: { 'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}` }
      });
      if (!fileResp.ok) {
        const text = await fileResp.text().catch(() => '');
        return res.status(fileResp.status).json({ error: 'Image not found', details: text });
      }

      res.setHeader('Cache-Control', 'no-store');
      const contentType = fileResp.headers.get('content-type') || 'image/jpeg';
      res.setHeader('Content-Type', contentType);
      const buffer = await fileResp.arrayBuffer();
      return res.send(Buffer.from(buffer));
    } catch (error) {
      loggerWithUser.error(req, 'Error proxying current profile photo', { error: error.message, stack: error.stack });
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });

  // ── Admin: list all designations ──
  app.get('/api/admin/designations', requireAuth, async (req, res) => {
    if (ORG_DATA_SOURCE !== 'frappe') {
      try {
        const result = await orgData.getAllDesignations();
        return res.json(result);
      } catch (e) {
        loggerWithUser.error(req, 'PG error in designations', { error: e.message });
        if (ORG_DATA_SOURCE !== 'dual') return res.status(500).json({ error: 'Failed to fetch designations' });
      }
    }
    if (!FRAPPE_API_KEY || !FRAPPE_API_SECRET) {
      return res.status(500).json({ error: 'Frappe API credentials not configured' });
    }
    try {
      const url = `${FRAPPE_BASE_URL}/api/resource/Designation?fields=["name"]&limit_page_length=0`;
      const response = await fetch(url, { method: 'GET', headers: { 'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`, 'Content-Type': 'application/json' } });
      if (!response.ok) throw new Error(`Frappe API error: ${response.status}`);
      const result = await response.json();
      res.json(result);
    } catch (error) {
      loggerWithUser.error(req, 'Ошибка получения должностей', { error: error.message });
      res.status(500).json({ error: 'Failed to fetch designations' });
    }
  });

  // ── Admin: list all departments ──
  app.get('/api/admin/departments', requireAuth, async (req, res) => {
    if (ORG_DATA_SOURCE !== 'frappe') {
      try {
        const result = await orgData.getAllDepartments();
        return res.json(result);
      } catch (e) {
        loggerWithUser.error(req, 'PG error in departments', { error: e.message });
        if (ORG_DATA_SOURCE !== 'dual') return res.status(500).json({ error: 'Failed to fetch departments' });
      }
    }
    if (!FRAPPE_API_KEY || !FRAPPE_API_SECRET) {
      return res.status(500).json({ error: 'Frappe API credentials not configured' });
    }
    try {
      const url = `${FRAPPE_BASE_URL}/api/resource/Department?fields=["name","department_name","custom_store_id","parent_department"]&limit_page_length=0`;
      const response = await fetch(url, { method: 'GET', headers: { 'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`, 'Content-Type': 'application/json' } });
      if (!response.ok) throw new Error(`Frappe API error: ${response.status}`);
      const result = await response.json();
      res.json(result);
    } catch (error) {
      loggerWithUser.error(req, 'Ошибка получения департаментов', { error: error.message });
      res.status(500).json({ error: 'Failed to fetch departments' });
    }
  });

  // ── Admin: org tree (departments + employees in one call) ──
  app.get('/api/admin/org/tree', requireAuth, async (req, res) => {
    if (ORG_DATA_SOURCE !== 'frappe') {
      try {
        const result = await orgData.getDepartmentTree();
        loggerWithUser.info(req, 'Org tree data fetched (PG)', { departments: result.departments?.length, employees: result.employees?.length });
        return res.json(result);
      } catch (e) {
        loggerWithUser.error(req, 'PG error in org tree', { error: e.message });
        if (ORG_DATA_SOURCE !== 'dual') return res.status(500).json({ error: 'Failed to fetch org tree' });
      }
    }
    if (!FRAPPE_API_KEY || !FRAPPE_API_SECRET) {
      return res.status(500).json({ error: 'Frappe API credentials not configured' });
    }
    try {
      const [deptResp, empResp] = await Promise.all([
        fetch(`${FRAPPE_BASE_URL}/api/resource/Department?fields=${encodeURIComponent('["name","department_name","custom_store_id","parent_department","is_group"]')}&limit_page_length=0`, {
          headers: { 'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`, 'Content-Type': 'application/json' }
        }),
        fetch(`${FRAPPE_BASE_URL}/api/resource/Employee?filters=${encodeURIComponent('[["status","=","Active"]]')}&fields=${encodeURIComponent('["name","employee_name","first_name","designation","department","reports_to","custom_tg_username","company_email","image","status","date_of_birth","date_of_joining","gender"]')}&limit_page_length=0`, {
          headers: { 'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`, 'Content-Type': 'application/json' }
        }),
      ]);
      if (!deptResp.ok) throw new Error(`Frappe Department API error: ${deptResp.status}`);
      if (!empResp.ok) throw new Error(`Frappe Employee API error: ${empResp.status}`);
      const deptResult = await deptResp.json();
      const empResult = await empResp.json();
      res.json({ departments: deptResult.data || [], employees: empResult.data || [] });
    } catch (error) {
      loggerWithUser.error(req, 'Error fetching org tree', { error: error.message });
      res.status(500).json({ error: 'Failed to fetch org tree', details: error.message });
    }
  });

  // ── Admin: create department ──
  app.post('/api/admin/departments', requireAuth, async (req, res) => {
    const { department_name, parent_department, custom_store_id, is_group } = req.body;
    if (!department_name?.trim()) {
      return res.status(400).json({ error: 'department_name is required' });
    }
    if (ORG_DATA_SOURCE !== 'frappe') {
      try {
        const result = await orgData.createDepartment({ department_name: department_name.trim(), parent_department, custom_store_id, is_group });
        loggerWithUser.info(req, 'Department created (PG)', { name: result.data?.name });
        return res.json(result);
      } catch (e) {
        loggerWithUser.error(req, 'PG error creating department', { error: e.message });
        if (ORG_DATA_SOURCE !== 'dual') return res.status(500).json({ error: 'Failed to create department', details: e.message });
      }
    }
    if (!FRAPPE_API_KEY || !FRAPPE_API_SECRET) {
      return res.status(500).json({ error: 'Frappe API credentials not configured' });
    }
    try {
      const response = await fetch(`${FRAPPE_BASE_URL}/api/resource/Department`, {
        method: 'POST',
        headers: { 'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department_name: department_name.trim(),
          parent_department: parent_department || undefined,
          custom_store_id: custom_store_id || undefined,
          is_group: is_group ? 1 : 0,
          company: 'Loov Russia',
        }),
      });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        let details = text;
        try { const parsed = JSON.parse(text); details = parsed.exc_type || parsed._server_messages || text; } catch {}
        return res.status(response.status).json({ error: 'Frappe error', details });
      }
      const result = await response.json();
      loggerWithUser.info(req, 'Department created', { name: result.data?.name });
      res.json({ data: result.data });
    } catch (error) {
      loggerWithUser.error(req, 'Error creating department', { error: error.message });
      res.status(500).json({ error: 'Failed to create department', details: error.message });
    }
  });

  // ── Admin: update department ──
  app.put('/api/admin/departments/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const { department_name, parent_department, custom_store_id } = req.body;
    if (parent_department && parent_department === id) {
      return res.status(400).json({ error: 'Department cannot be its own parent' });
    }
    if (ORG_DATA_SOURCE !== 'frappe') {
      try {
        const result = await orgData.updateDepartment(id, { department_name, parent_department, custom_store_id });
        loggerWithUser.info(req, 'Department updated (PG)', { name: id });
        return res.json(result);
      } catch (e) {
        loggerWithUser.error(req, 'PG error updating department', { error: e.message });
        if (ORG_DATA_SOURCE !== 'dual') return res.status(500).json({ error: 'Failed to update department', details: e.message });
      }
    }
    if (!FRAPPE_API_KEY || !FRAPPE_API_SECRET) {
      return res.status(500).json({ error: 'Frappe API credentials not configured' });
    }
    try {
      const body = {};
      if (department_name !== undefined) body.department_name = department_name;
      if (parent_department !== undefined) body.parent_department = parent_department;
      if (custom_store_id !== undefined) body.custom_store_id = custom_store_id;
      const response = await fetch(`${FRAPPE_BASE_URL}/api/resource/Department/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        let details = text;
        try { const parsed = JSON.parse(text); details = parsed.exc_type || parsed._server_messages || text; } catch {}
        return res.status(response.status).json({ error: 'Frappe error', details });
      }
      const result = await response.json();
      loggerWithUser.info(req, 'Department updated', { name: id });
      res.json({ data: result.data });
    } catch (error) {
      loggerWithUser.error(req, 'Error updating department', { error: error.message });
      res.status(500).json({ error: 'Failed to update department', details: error.message });
    }
  });

  // ── Admin: delete department ──
  app.delete('/api/admin/departments/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    if (ORG_DATA_SOURCE !== 'frappe') {
      try {
        await orgData.deleteDepartment(id);
        loggerWithUser.info(req, 'Department deleted (PG)', { name: id });
        return res.json({ ok: true });
      } catch (e) {
        loggerWithUser.error(req, 'PG error deleting department', { error: e.message });
        if (ORG_DATA_SOURCE !== 'dual') return res.status(500).json({ error: 'Failed to delete department', details: e.message });
      }
    }
    if (!FRAPPE_API_KEY || !FRAPPE_API_SECRET) {
      return res.status(500).json({ error: 'Frappe API credentials not configured' });
    }
    try {
      const response = await fetch(`${FRAPPE_BASE_URL}/api/resource/Department/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`, 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        let details = text;
        try { const parsed = JSON.parse(text); details = parsed.exc_type || parsed._server_messages || text; } catch {}
        return res.status(response.status).json({ error: 'Frappe error', details });
      }
      loggerWithUser.info(req, 'Department deleted', { name: id });
      res.json({ ok: true });
    } catch (error) {
      loggerWithUser.error(req, 'Error deleting department', { error: error.message });
      res.status(500).json({ error: 'Failed to delete department', details: error.message });
    }
  });

  // ── Admin: create employee ──
  app.post('/api/admin/employees', requireAuth, async (req, res) => {
    const { first_name, employee_name, designation, department, reports_to, custom_tg_username, company_email, date_of_birth, date_of_joining, gender } = req.body;
    if (!first_name?.trim()) {
      return res.status(400).json({ error: 'first_name is required' });
    }
    if (!date_of_birth || !date_of_joining || !gender) {
      return res.status(400).json({ error: 'date_of_birth, date_of_joining and gender are required' });
    }
    if (ORG_DATA_SOURCE !== 'frappe') {
      try {
        const result = await orgData.createEmployee({ first_name: first_name.trim(), employee_name, designation, department, reports_to, custom_tg_username, company_email, date_of_birth, date_of_joining, gender });
        loggerWithUser.info(req, 'Employee created (PG)', { name: result.data?.name });
        return res.json(result);
      } catch (e) {
        loggerWithUser.error(req, 'PG error creating employee', { error: e.message });
        if (ORG_DATA_SOURCE !== 'dual') return res.status(500).json({ error: 'Failed to create employee', details: e.message });
      }
    }
    if (!FRAPPE_API_KEY || !FRAPPE_API_SECRET) {
      return res.status(500).json({ error: 'Frappe API credentials not configured' });
    }
    try {
      const body = { first_name: first_name.trim(), date_of_birth, date_of_joining, gender, company: 'Loov Russia', status: 'Active' };
      if (employee_name) body.employee_name = employee_name;
      if (designation) body.designation = designation;
      if (department) body.department = department;
      if (reports_to) body.reports_to = reports_to;
      if (custom_tg_username) body.custom_tg_username = custom_tg_username;
      if (company_email) body.company_email = company_email;
      const response = await fetch(`${FRAPPE_BASE_URL}/api/resource/Employee`, {
        method: 'POST',
        headers: { 'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        let details = text;
        try { const parsed = JSON.parse(text); details = parsed.exc_type || parsed._server_messages || text; } catch {}
        return res.status(response.status).json({ error: 'Frappe error', details });
      }
      const result = await response.json();
      loggerWithUser.info(req, 'Employee created', { name: result.data?.name });
      res.json({ data: result.data });
    } catch (error) {
      loggerWithUser.error(req, 'Error creating employee', { error: error.message });
      res.status(500).json({ error: 'Failed to create employee', details: error.message });
    }
  });

  // ── Admin: update employee ──
  app.put('/api/admin/employees/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const { employee_name, first_name, designation, department, reports_to, custom_tg_username, company_email, date_of_birth, date_of_joining, gender } = req.body;
    if (ORG_DATA_SOURCE !== 'frappe') {
      try {
        const result = await orgData.updateEmployee(id, { employee_name, first_name, designation, department, reports_to, custom_tg_username, company_email, date_of_birth, date_of_joining, gender });
        loggerWithUser.info(req, 'Employee updated (PG)', { name: id });
        return res.json(result);
      } catch (e) {
        loggerWithUser.error(req, 'PG error updating employee', { error: e.message });
        if (ORG_DATA_SOURCE !== 'dual') return res.status(500).json({ error: 'Failed to update employee', details: e.message });
      }
    }
    if (!FRAPPE_API_KEY || !FRAPPE_API_SECRET) {
      return res.status(500).json({ error: 'Frappe API credentials not configured' });
    }
    try {
      const body = {};
      if (employee_name !== undefined) body.employee_name = employee_name;
      if (first_name !== undefined) body.first_name = first_name;
      if (designation !== undefined) body.designation = designation;
      if (department !== undefined) body.department = department;
      if (reports_to !== undefined) body.reports_to = reports_to;
      if (custom_tg_username !== undefined) body.custom_tg_username = custom_tg_username;
      if (company_email !== undefined) body.company_email = company_email;
      if (date_of_birth !== undefined) body.date_of_birth = date_of_birth;
      if (date_of_joining !== undefined) body.date_of_joining = date_of_joining;
      if (gender !== undefined) body.gender = gender;
      const response = await fetch(`${FRAPPE_BASE_URL}/api/resource/Employee/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        let details = text;
        try { const parsed = JSON.parse(text); details = parsed.exc_type || parsed._server_messages || text; } catch {}
        return res.status(response.status).json({ error: 'Frappe error', details });
      }
      const result = await response.json();
      loggerWithUser.info(req, 'Employee updated', { name: id });
      res.json({ data: result.data });
    } catch (error) {
      loggerWithUser.error(req, 'Error updating employee', { error: error.message });
      res.status(500).json({ error: 'Failed to update employee', details: error.message });
    }
  });

  // ── Admin: deactivate employee (soft delete) ──
  app.delete('/api/admin/employees/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    if (ORG_DATA_SOURCE !== 'frappe') {
      try {
        await orgData.deactivateEmployee(id);
        loggerWithUser.info(req, 'Employee deactivated (PG)', { name: id });
        return res.json({ ok: true });
      } catch (e) {
        loggerWithUser.error(req, 'PG error deactivating employee', { error: e.message });
        if (ORG_DATA_SOURCE !== 'dual') return res.status(500).json({ error: 'Failed to deactivate employee', details: e.message });
      }
    }
    if (!FRAPPE_API_KEY || !FRAPPE_API_SECRET) {
      return res.status(500).json({ error: 'Frappe API credentials not configured' });
    }
    try {
      const response = await fetch(`${FRAPPE_BASE_URL}/api/resource/Employee/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Left' }),
      });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        let details = text;
        try { const parsed = JSON.parse(text); details = parsed.exc_type || parsed._server_messages || text; } catch {}
        return res.status(response.status).json({ error: 'Frappe error', details });
      }
      loggerWithUser.info(req, 'Employee deactivated', { name: id });
      res.json({ ok: true });
    } catch (error) {
      loggerWithUser.error(req, 'Error deactivating employee', { error: error.message });
      res.status(500).json({ error: 'Failed to deactivate employee', details: error.message });
    }
  });

  // ── Admin: Frappe sync endpoints ──
  app.post('/api/admin/sync/frappe', requireAuth, async (req, res) => {
    try {
      loggerWithUser.info(req, 'Manual Frappe sync triggered');
      const result = await runFullSync();
      res.json(result);
    } catch (error) {
      loggerWithUser.error(req, 'Error running Frappe sync', { error: error.message });
      res.status(500).json({ error: 'Sync failed', details: error.message });
    }
  });

  app.get('/api/admin/sync/status', requireAuth, async (req, res) => {
    try {
      const status = await getSyncStatus();
      res.json(status);
    } catch (error) {
      loggerWithUser.error(req, 'Error getting sync status', { error: error.message });
      res.status(500).json({ error: 'Failed to get sync status', details: error.message });
    }
  });

  // ── Admin: org config (runtime toggle) ──
  app.get('/api/admin/org/config', requireAuth, async (req, res) => {
    res.json({
      orgDataSource: ORG_DATA_SOURCE,
      frappeConfigured: !!(env.FRAPPE_BASE_URL && env.FRAPPE_API_KEY),
      databaseConfigured: !!env.DATABASE_URL,
    });
  });

  app.post('/api/admin/org/config', requireAuth, async (req, res) => {
    const { orgDataSource } = req.body;
    const valid = ['frappe', 'postgres', 'dual'];
    if (!valid.includes(orgDataSource)) {
      return res.status(400).json({ error: `Invalid orgDataSource. Must be one of: ${valid.join(', ')}` });
    }
    const previous = ORG_DATA_SOURCE;
    ORG_DATA_SOURCE = orgDataSource;
    loggerWithUser.info(req, `ORG_DATA_SOURCE changed: ${previous} → ${orgDataSource}`);
    res.json({ orgDataSource: ORG_DATA_SOURCE, previous });
  });

  // ── Admin: integrations health-check ──
  app.get('/api/admin/integrations', requireAuth, async (req, res) => {
    const allIntegrations = getAllIntegrations();
    const meta = allIntegrations.map(({ id, name, category, envVars }) => ({
      id, name, category, envVars: envVars || [],
    }));

    const results = await Promise.allSettled(
      allIntegrations.map(async (integration, idx) => {
        try {
          return { ...meta[idx], ...(await integration.check()) };
        } catch (err) {
          return { ...meta[idx], ok: false, message: err.message || 'Unknown error' };
        }
      })
    );

    const maskCredential = (key, value) => {
      if (!value) return null;
      const lower = key.toLowerCase();
      if (lower.includes('password') || lower.includes('secret')) return '****';
      if (typeof value === 'string' && value.length > 6) return value.slice(0, 6) + '...';
      return value;
    };

    const integrations = results.map((r, idx) => {
      const item = r.status === 'fulfilled' ? r.value : { ...meta[idx], ok: false, message: 'Check failed' };
      const envSnapshot = {};
      for (const key of item.envVars || []) {
        envSnapshot[key] = maskCredential(key, process.env[key] || null);
      }
      return {
        id: item.id,
        name: item.name,
        category: item.category,
        ok: item.ok,
        message: item.message,
        latency: item.latency || null,
        env: envSnapshot,
      };
    });

    res.json({ integrations, checkedAt: new Date().toISOString() });
  });

  // ==================== Phase 2: Aggregation & Dynamic Plan endpoints ====================

  // Aggregation engine — SQL-based metric grouping
  app.get('/api/metrics/aggregate', requireAuth, async (req, res) => {
    try {
      const metricIds = req.query.metric_ids
        ? (Array.isArray(req.query.metric_ids) ? req.query.metric_ids : req.query.metric_ids.split(','))
        : [];
      const { date_from, date_to, group_by = 'month' } = req.query;

      if (!metricIds.length || !date_from || !date_to) {
        return res.status(400).json({ error: 'metric_ids, date_from, date_to are required' });
      }

      const filters = {};
      if (req.query.branch_ids) {
        filters.branchIds = Array.isArray(req.query.branch_ids) ? req.query.branch_ids : req.query.branch_ids.split(',');
      }
      if (req.query.employee_ids) {
        filters.employeeIds = Array.isArray(req.query.employee_ids) ? req.query.employee_ids : req.query.employee_ids.split(',');
      }
      if (req.query.client_ids) {
        filters.clientIds = Array.isArray(req.query.client_ids) ? req.query.client_ids : req.query.client_ids.split(',');
      }

      const result = await aggregate({
        metricIds,
        dateFrom: date_from,
        dateTo: date_to,
        groupBy: group_by,
        filters,
      });

      res.json(result);
    } catch (err) {
      console.error('[internal-api] Aggregation error:', err);
      res.status(500).json({ error: 'Aggregation failed' });
    }
  });

  // Dynamic daily plan for a metric
  app.get('/api/metrics/:id/dynamic-plan', requireAuth, async (req, res) => {
    try {
      const metricId = req.params.id;
      const { branch_id, employee_id, period } = req.query;

      const result = await getDynamicPlan(metricId, {
        branchId: branch_id,
        employeeId: employee_id,
        period,
      });

      if (!result) {
        return res.status(404).json({ error: 'Plan not found or database not connected' });
      }

      res.json({ data: result });
    } catch (err) {
      console.error('[internal-api] Dynamic plan error:', err);
      res.status(500).json({ error: 'Dynamic plan calculation failed' });
    }
  });

  // Client dimension — search clients
  app.get('/api/admin/clients/search', requireAuth, async (req, res) => {
    try {
      const { isPrismaConnected: dbOk, rawQuery: dbQuery } = await import('./prisma.js');
      if (!dbOk()) return res.json({ data: [] });

      const { q = '', branch_id, limit = 20 } = req.query;
      const conditions = [];
      const params = [];
      let paramIdx = 1;

      if (q) {
        conditions.push(`(name ILIKE $${paramIdx} OR external_id ILIKE $${paramIdx})`);
        params.push(`%${q}%`);
        paramIdx++;
      }
      if (branch_id) {
        conditions.push(`branch_id = $${paramIdx}`);
        params.push(branch_id);
        paramIdx++;
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const result = await dbQuery(
        `SELECT id, external_id, name, branch_id, employee_id, client_type, source_id FROM dim_clients ${where} ORDER BY name LIMIT $${paramIdx}`,
        [...params, Math.min(parseInt(limit) || 20, 100)]
      );

      res.json({ data: result?.rows || [] });
    } catch (err) {
      console.error('[internal-api] Client search error:', err);
      res.status(500).json({ error: 'Client search failed' });
    }
  });

  // List clients (paginated)
  app.get('/api/admin/clients', requireAuth, async (req, res) => {
    try {
      const { isPrismaConnected: dbOk, rawQuery: dbQuery } = await import('./prisma.js');
      if (!dbOk()) return res.json({ data: [], total: 0 });

      const limit = Math.min(parseInt(req.query.limit) || 50, 200);
      const offset = parseInt(req.query.offset) || 0;

      const countRes = await dbQuery('SELECT COUNT(*) FROM dim_clients');
      const total = parseInt(countRes?.rows?.[0]?.count) || 0;

      const result = await dbQuery(
        'SELECT id, external_id, name, branch_id, employee_id, client_type, source_id, created_at FROM dim_clients ORDER BY name LIMIT $1 OFFSET $2',
        [limit, offset]
      );

      res.json({ data: result?.rows || [], total });
    } catch (err) {
      console.error('[internal-api] Client list error:', err);
      res.status(500).json({ error: 'Failed to list clients' });
    }
  });

  // Register event ingestion routes
  setupEventRoutes(app, requireAuth);

  // ==================== Phase 3: CRM Adapter endpoints ====================

  // List registered adapters
  app.get('/api/admin/adapters', requireAuth, async (req, res) => {
    try {
      const adapters = await listAdapters();
      res.json({ data: adapters });
    } catch (err) {
      console.error('[internal-api] List adapters error:', err);
      res.status(500).json({ error: 'Failed to list adapters' });
    }
  });

  // Save/update custom adapter in registry
  app.post('/api/admin/adapters', requireAuth, async (req, res) => {
    try {
      const { isPrismaConnected: dbOk, rawQuery: dbQuery } = await import('./prisma.js');
      if (!dbOk()) return res.status(503).json({ error: 'Database not connected' });

      const { id, name, description, version, supportedEvents, adapterCode, aiGenerated, aiPrompt } = req.body;
      if (!id || !name) return res.status(400).json({ error: 'id and name are required' });

      const result = await dbQuery(`
        INSERT INTO adapter_registry (id, name, description, version, supported_events, adapter_code, ai_generated, ai_prompt)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name, description = EXCLUDED.description, version = EXCLUDED.version,
          supported_events = EXCLUDED.supported_events, adapter_code = EXCLUDED.adapter_code,
          ai_generated = EXCLUDED.ai_generated, ai_prompt = EXCLUDED.ai_prompt,
          updated_at = now()
        RETURNING *
      `, [id, name, description || null, version || '1.0.0',
          supportedEvents || [], adapterCode || null, aiGenerated || false, aiPrompt || null]);

      clearAdapterCache();
      res.json({ data: result?.rows?.[0] });
    } catch (err) {
      console.error('[internal-api] Save adapter error:', err);
      res.status(500).json({ error: 'Failed to save adapter' });
    }
  });

  // Delete custom adapter
  app.delete('/api/admin/adapters/:id', requireAuth, async (req, res) => {
    try {
      const { isPrismaConnected: dbOk, rawQuery: dbQuery } = await import('./prisma.js');
      if (!dbOk()) return res.status(503).json({ error: 'Database not connected' });

      // Prevent deleting built-in adapters
      if (['amocrm', 'tracker', 'manual'].includes(req.params.id)) {
        return res.status(400).json({ error: 'Cannot delete built-in adapter' });
      }

      await dbQuery('DELETE FROM adapter_registry WHERE id = $1', [req.params.id]);
      clearAdapterCache(req.params.id);
      res.json({ success: true });
    } catch (err) {
      console.error('[internal-api] Delete adapter error:', err);
      res.status(500).json({ error: 'Failed to delete adapter' });
    }
  });

  // Manually trigger a poll for a data source
  app.post('/api/admin/data-sources/:id/poll', requireAuth, async (req, res) => {
    try {
      const result = await manualPoll(req.params.id);
      res.json(result);
    } catch (err) {
      console.error('[internal-api] Manual poll error:', err);
      res.status(500).json({ error: 'Manual poll failed' });
    }
  });

  // ==================== Phase 4: Analytics & Export endpoints ====================

  // Time-series: monthly by branch (from materialized view)
  app.get('/api/analytics/monthly-by-branch', requireAuth, async (req, res) => {
    try {
      const { metric_id, branch_ids, date_from, date_to } = req.query;
      if (!metric_id) return res.status(400).json({ error: 'metric_id required' });

      const data = await getMonthlyByBranch(metric_id, {
        branchIds: branch_ids ? (Array.isArray(branch_ids) ? branch_ids : branch_ids.split(',')) : undefined,
        dateFrom: date_from,
        dateTo: date_to,
      });
      res.json({ data });
    } catch (err) {
      console.error('[internal-api] Monthly by branch error:', err);
      res.status(500).json({ error: 'Query failed' });
    }
  });

  // Time-series: monthly by employee (from materialized view)
  app.get('/api/analytics/monthly-by-employee', requireAuth, async (req, res) => {
    try {
      const { metric_id, employee_ids, branch_ids, date_from, date_to } = req.query;
      if (!metric_id) return res.status(400).json({ error: 'metric_id required' });

      const data = await getMonthlyByEmployee(metric_id, {
        employeeIds: employee_ids ? (Array.isArray(employee_ids) ? employee_ids : employee_ids.split(',')) : undefined,
        branchIds: branch_ids ? (Array.isArray(branch_ids) ? branch_ids : branch_ids.split(',')) : undefined,
        dateFrom: date_from,
        dateTo: date_to,
      });
      res.json({ data });
    } catch (err) {
      console.error('[internal-api] Monthly by employee error:', err);
      res.status(500).json({ error: 'Query failed' });
    }
  });

  // Time-series: daily events (from materialized view)
  app.get('/api/analytics/daily-events', requireAuth, async (req, res) => {
    try {
      const data = await getDailyEvents({
        eventType: req.query.event_type,
        branchIds: req.query.branch_ids ? (Array.isArray(req.query.branch_ids) ? req.query.branch_ids : req.query.branch_ids.split(',')) : undefined,
        dateFrom: req.query.date_from,
        dateTo: req.query.date_to,
      });
      res.json({ data });
    } catch (err) {
      console.error('[internal-api] Daily events error:', err);
      res.status(500).json({ error: 'Query failed' });
    }
  });

  // Materialized views management
  app.get('/api/admin/analytics/views', requireAuth, async (req, res) => {
    try {
      const status = await getViewRefreshStatus();
      res.json({ data: status });
    } catch (err) {
      console.error('[internal-api] View status error:', err);
      res.status(500).json({ error: 'Failed to get view status' });
    }
  });

  app.post('/api/admin/analytics/views/refresh', requireAuth, async (req, res) => {
    try {
      const results = await refreshAllViews();
      res.json({ data: results });
    } catch (err) {
      console.error('[internal-api] View refresh error:', err);
      res.status(500).json({ error: 'Refresh failed' });
    }
  });

  // Export: metrics CSV
  app.get('/api/export/metrics', requireAuth, async (req, res) => {
    try {
      const metricIds = req.query.metric_ids
        ? (Array.isArray(req.query.metric_ids) ? req.query.metric_ids : req.query.metric_ids.split(','))
        : [];
      const { date_from, date_to, group_by } = req.query;

      if (!metricIds.length || !date_from || !date_to) {
        return res.status(400).json({ error: 'metric_ids, date_from, date_to required' });
      }

      const csv = await exportMetricsCsv({
        metricIds,
        dateFrom: date_from,
        dateTo: date_to,
        groupBy: group_by || 'day',
        branchIds: req.query.branch_ids?.split(','),
        employeeIds: req.query.employee_ids?.split(','),
        clientIds: req.query.client_ids?.split(','),
      });

      const filename = `metrics_${date_from}_${date_to}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (err) {
      console.error('[internal-api] Export metrics error:', err);
      res.status(500).json({ error: 'Export failed' });
    }
  });

  // Export: events CSV
  app.get('/api/export/events', requireAuth, async (req, res) => {
    try {
      const csv = await exportEventsCsv({
        sourceId: req.query.source_id,
        eventType: req.query.event_type,
        branchId: req.query.branch_id,
        dateFrom: req.query.date_from,
        dateTo: req.query.date_to,
        limit: parseInt(req.query.limit) || 5000,
      });

      const filename = `events_${req.query.date_from || 'all'}_${req.query.date_to || 'all'}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (err) {
      console.error('[internal-api] Export events error:', err);
      res.status(500).json({ error: 'Export failed' });
    }
  });

  // Export: monthly report CSV (cross-tab: metrics × branches)
  app.get('/api/export/monthly-report', requireAuth, async (req, res) => {
    try {
      const { period } = req.query;
      if (!period) return res.status(400).json({ error: 'period required (YYYY-MM)' });

      const csv = await exportMonthlyReport({
        period,
        metricIds: req.query.metric_ids?.split(','),
        branchIds: req.query.branch_ids?.split(','),
      });

      const filename = `report_${period}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (err) {
      console.error('[internal-api] Export report error:', err);
      res.status(500).json({ error: 'Export failed' });
    }
  });

  // ─── Mission (shared text) ───
  const __internalApiFilename = fileURLToPath(import.meta.url);
  const __internalApiDirname = path.dirname(__internalApiFilename);
  const MISSION_FILE = path.resolve(__internalApiDirname, '../../data/mission.json');

  app.get('/api/mission', requireAuth, (req, res) => {
    try {
      if (fs.existsSync(MISSION_FILE)) {
        const data = JSON.parse(fs.readFileSync(MISSION_FILE, 'utf-8'));
        return res.json({ text: data.text || '' });
      }
      res.json({ text: '' });
    } catch (err) {
      logger.error('Failed to read mission', err);
      res.status(500).json({ error: 'Failed to read mission' });
    }
  });

  app.put('/api/mission', requireAuth, (req, res) => {
    try {
      const { text } = req.body;
      if (typeof text !== 'string' || text.length > 500) {
        return res.status(400).json({ error: 'Invalid mission text (max 500 chars)' });
      }
      fs.writeFileSync(MISSION_FILE, JSON.stringify({ text: text.trim() }, null, 2), 'utf-8');
      loggerWithUser(req).info('Mission updated');
      res.json({ ok: true, text: text.trim() });
    } catch (err) {
      logger.error('Failed to save mission', err);
      res.status(500).json({ error: 'Failed to save mission' });
    }
  });

  logger.info('Internal API routes registered');
}

// Инициализация внутреннего API
export async function initializeInternalApi() {
  // Запускаем тест Outline API
  await testOutlineAPI();
} 
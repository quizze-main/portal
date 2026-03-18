import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import logger from './logger.js';
import { requireAuth } from './requireAuth.js';
import { extractByPath } from './jsonpath.js';
import { isDbConnected, query } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const env = process.env || {};

const DATA_DIR = path.resolve(__dirname, '../../data');
const CONFIG_PATH = path.join(DATA_DIR, 'data-sources.json');

// ─── Auth type definitions ───

const AUTH_TYPES = {
  none: {
    label: 'Без авторизации',
    fields: [],
  },
  bearer: {
    label: 'Bearer Token',
    fields: [
      { key: 'token', label: 'Token', required: true, secret: true, placeholder: 'your-api-token' },
    ],
  },
  api_key_secret: {
    label: 'API Key + Secret',
    fields: [
      { key: 'api_key', label: 'API Key', required: true, secret: false, placeholder: 'api-key' },
      { key: 'api_secret', label: 'API Secret', required: true, secret: true, placeholder: 'api-secret' },
      { key: 'format', label: 'Header Format', required: false, secret: false, placeholder: 'token {api_key}:{api_secret}' },
    ],
  },
  basic: {
    label: 'Basic Auth',
    fields: [
      { key: 'username', label: 'Username', required: true, secret: false, placeholder: '' },
      { key: 'password', label: 'Password', required: true, secret: true, placeholder: '' },
    ],
  },
  custom_headers: {
    label: 'Custom Headers',
    fields: [
      { key: 'headers', label: 'Headers (JSON)', required: true, secret: true, placeholder: '{"X-API-Key": "..."}' },
    ],
  },
};

// ─── Pagination type definitions ───

const PAGINATION_TYPES = {
  none: {
    label: 'Без пагинации',
    fields: [],
  },
  offset: {
    label: 'Offset / Limit',
    fields: [
      { key: 'limitParam', label: 'Limit param', placeholder: 'limit', default: 'limit' },
      { key: 'offsetParam', label: 'Offset param', placeholder: 'offset', default: 'offset' },
      { key: 'pageSize', label: 'Page size', placeholder: '100', default: '100' },
      { key: 'totalPath', label: 'Total count JSONPath', placeholder: 'meta.total', default: '' },
    ],
  },
  cursor: {
    label: 'Cursor-based',
    fields: [
      { key: 'cursorParam', label: 'Cursor param', placeholder: 'cursor', default: 'cursor' },
      { key: 'nextCursorPath', label: 'Next cursor JSONPath', placeholder: 'meta.next_cursor', default: '' },
      { key: 'pageSize', label: 'Page size', placeholder: '100', default: '100' },
      { key: 'limitParam', label: 'Limit param', placeholder: 'limit', default: 'limit' },
    ],
  },
  page: {
    label: 'Page number',
    fields: [
      { key: 'pageParam', label: 'Page param', placeholder: 'page', default: 'page' },
      { key: 'pageSize', label: 'Page size', placeholder: '100', default: '100' },
      { key: 'limitParam', label: 'Per-page param', placeholder: 'per_page', default: 'per_page' },
      { key: 'totalPagesPath', label: 'Total pages JSONPath', placeholder: 'meta.total_pages', default: '' },
    ],
  },
};

// ─── Config storage (dual-read: DB + JSON fallback) ───

async function readConfigFromJson() {
  try {
    if (!existsSync(CONFIG_PATH)) return { sources: {} };
    const raw = await readFile(CONFIG_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { sources: {} };
  }
}

async function readConfigFromDb() {
  const { rows } = await query(`
    SELECT id, label, base_url AS "baseUrl",
      auth_type AS "authType", auth_config AS "authConfig",
      pagination_type AS "paginationType", pagination_config AS "paginationConfig",
      health_check_path AS "healthCheckPath", health_check_method AS "healthCheckMethod",
      timeout_ms AS "timeout", enabled, built_in AS "builtIn",
      source_origin AS "sourceOrigin",
      adapter_type AS "adapterType", adapter_config AS "adapterConfig",
      webhook_secret AS "webhookSecret", poll_interval_s AS "pollIntervalS",
      field_mappings AS "fieldMappings",
      last_test_at AS "lastTestAt", last_test_status AS "lastTestStatus"
    FROM data_sources ORDER BY id
  `);
  // Convert to existing format: { sources: [...] }
  return { sources: rows };
}

export async function readConfig() {
  if (isDbConnected()) {
    try {
      return await readConfigFromDb();
    } catch (err) {
      logger.warn('DB readConfig (data-sources) failed, falling back to JSON', { error: err.message });
    }
  }
  return readConfigFromJson();
}

async function writeConfig(config) {
  // Always write JSON
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');

  // Sync to DB
  if (isDbConnected()) {
    try {
      const sources = Array.isArray(config.sources) ? config.sources : Object.values(config.sources || {});
      for (const ds of sources) {
        await query(`
          INSERT INTO data_sources (id, label, base_url, auth_type, auth_config, pagination_type, pagination_config,
            health_check_path, timeout_ms, enabled, built_in, source_origin, field_mappings)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (id) DO UPDATE SET
            label = EXCLUDED.label, base_url = EXCLUDED.base_url,
            auth_type = EXCLUDED.auth_type, auth_config = EXCLUDED.auth_config,
            enabled = EXCLUDED.enabled, field_mappings = EXCLUDED.field_mappings,
            updated_at = now()
        `, [
          ds.id, ds.label, ds.baseUrl || null,
          ds.authType || 'none', JSON.stringify(ds.authConfig || {}),
          ds.paginationType || 'none', JSON.stringify(ds.paginationConfig || {}),
          ds.healthCheckPath || '/', ds.timeout || 10000,
          ds.enabled !== false, ds.builtIn === true,
          ds.sourceOrigin || 'manual', JSON.stringify(ds.fieldMappings || [])
        ]);
      }
    } catch (err) {
      logger.warn('DB writeConfig (data-sources) failed', { error: err.message });
    }
  }
}

// ─── Env defaults ───

/**
 * Merge env-based defaults for built-in data sources.
 * Currently seeds "tracker" from TRACKER_API_URL / TRACKER_API_TOKEN.
 */
export function mergeEnvDefaults(config) {
  const result = { ...config, sources: { ...config.sources } };

  const trackerUrl = env.TRACKER_API_URL;
  const trackerToken = env.TRACKER_API_TOKEN;

  if (!result.sources.tracker) {
    // Seed tracker from env if not yet in config
    if (trackerUrl || trackerToken) {
      result.sources.tracker = {
        id: 'tracker',
        label: 'Loovis Tracker',
        baseUrl: trackerUrl || '',
        authType: 'bearer',
        authConfig: { token: trackerToken || '' },
        paginationType: 'none',
        paginationConfig: {},
        healthCheckPath: '/api/v1/portal/analytics/dashboards',
        healthCheckMethod: 'GET',
        timeout: 10000,
        enabled: true,
        builtIn: true,
        source: 'env',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
  } else if (result.sources.tracker.source !== 'manual') {
    // Keep env values in sync for non-manually-overridden tracker
    if (trackerUrl) result.sources.tracker.baseUrl = trackerUrl;
    if (trackerToken) {
      result.sources.tracker.authConfig = { ...result.sources.tracker.authConfig, token: trackerToken };
    }
  }

  return result;
}

// ─── Auth helpers ───

/**
 * Build Authorization headers based on auth type and config.
 */
export function buildAuthHeaders(authType, authConfig) {
  const cfg = authConfig || {};
  switch (authType) {
    case 'bearer':
      return cfg.token ? { Authorization: `Bearer ${cfg.token}` } : {};

    case 'api_key_secret': {
      const format = cfg.format || 'token {api_key}:{api_secret}';
      const value = format
        .replace('{api_key}', cfg.api_key || '')
        .replace('{api_secret}', cfg.api_secret || '');
      return { Authorization: value };
    }

    case 'basic': {
      const encoded = Buffer.from(`${cfg.username || ''}:${cfg.password || ''}`).toString('base64');
      return { Authorization: `Basic ${encoded}` };
    }

    case 'custom_headers': {
      try {
        const parsed = typeof cfg.headers === 'string' ? JSON.parse(cfg.headers) : (cfg.headers || {});
        return parsed;
      } catch {
        return {};
      }
    }

    default:
      return {};
  }
}

// ─── Fetch ───

/**
 * Execute an HTTP request against a configured data source.
 *
 * @param {object} source - Data source config object
 * @param {string} requestPath - API path to append to baseUrl (e.g. "/api/v1/metrics")
 * @param {object} queryParams - Query parameters to add
 * @param {object} options - { method: 'GET'|'POST', body: object|null }
 * @returns {Promise<object>} Parsed JSON response
 */
export async function fetchFromSource(source, requestPath = '/', queryParams = {}, options = {}) {
  const { method = 'GET', body = null } = options;
  const baseUrl = (source.baseUrl || '').replace(/\/+$/, '');
  const cleanPath = requestPath.startsWith('/') ? requestPath : `/${requestPath}`;

  const url = new URL(cleanPath, baseUrl);
  for (const [k, v] of Object.entries(queryParams)) {
    if (v !== undefined && v !== null) {
      if (Array.isArray(v)) {
        v.forEach(val => url.searchParams.append(k, String(val)));
      } else {
        url.searchParams.append(k, String(v));
      }
    }
  }

  const authHeaders = buildAuthHeaders(source.authType, source.authConfig);
  const timeout = source.timeout || 10000;

  const fetchOptions = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    signal: AbortSignal.timeout(timeout),
  };

  if (body && method !== 'GET') {
    fetchOptions.body = JSON.stringify(body);
  }

  const response = await fetch(url.toString(), fetchOptions);
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    const err = new Error(`Data source "${source.id}" request failed: HTTP ${response.status}`);
    err.status = response.status;
    err.body = text;
    throw err;
  }

  return response.json();
}

// ─── Paginated fetch ───

const MAX_PAGES = 50;

/**
 * Fetch all pages from a data source, using its pagination config.
 * Returns a single JSON response for paginationType=none, or an array of responses for paginated sources.
 */
export async function fetchAllPages(source, requestPath = '/', queryParams = {}, options = {}) {
  if (!source.paginationType || source.paginationType === 'none') {
    return fetchFromSource(source, requestPath, queryParams, options);
  }

  const cfg = source.paginationConfig || {};
  const allPages = [];

  if (source.paginationType === 'offset') {
    const limitParam = cfg.limitParam || 'limit';
    const offsetParam = cfg.offsetParam || 'offset';
    const pageSize = parseInt(cfg.pageSize) || 100;
    const totalPath = cfg.totalPath || '';

    let offset = 0;
    let total = Infinity;

    for (let page = 0; page < MAX_PAGES && offset < total; page++) {
      const params = { ...queryParams, [limitParam]: pageSize, [offsetParam]: offset };
      const result = await fetchFromSource(source, requestPath, params, options);
      allPages.push(result);

      if (totalPath) {
        const resolvedTotal = extractByPath(result, totalPath);
        if (resolvedTotal != null) total = Number(resolvedTotal);
        else break; // no total found — stop after first page
      } else {
        break; // no totalPath configured — single page only
      }

      offset += pageSize;
    }
  } else if (source.paginationType === 'cursor') {
    const cursorParam = cfg.cursorParam || 'cursor';
    const nextCursorPath = cfg.nextCursorPath || '';
    const pageSize = parseInt(cfg.pageSize) || 100;
    const limitParam = cfg.limitParam || 'limit';

    let cursor = null;

    for (let page = 0; page < MAX_PAGES; page++) {
      const params = { ...queryParams, [limitParam]: pageSize };
      if (cursor) params[cursorParam] = cursor;

      const result = await fetchFromSource(source, requestPath, params, options);
      allPages.push(result);

      if (!nextCursorPath) break;
      const nextCursor = extractByPath(result, nextCursorPath);
      if (!nextCursor) break;
      cursor = nextCursor;
    }
  } else if (source.paginationType === 'page') {
    const pageParam = cfg.pageParam || 'page';
    const pageSize = parseInt(cfg.pageSize) || 100;
    const limitParam = cfg.limitParam || 'per_page';
    const totalPagesPath = cfg.totalPagesPath || '';

    let totalPages = Infinity;

    for (let page = 1; page <= Math.min(totalPages, MAX_PAGES); page++) {
      const params = { ...queryParams, [pageParam]: page, [limitParam]: pageSize };
      const result = await fetchFromSource(source, requestPath, params, options);
      allPages.push(result);

      if (totalPagesPath) {
        const resolved = extractByPath(result, totalPagesPath);
        if (resolved != null) totalPages = Number(resolved);
        else break;
      } else {
        break;
      }
    }
  }

  return allPages.length === 1 ? allPages[0] : allPages;
}

// ─── Source lookup ───

export async function getSourceById(id) {
  const raw = await readConfig();
  const config = mergeEnvDefaults(raw);
  return config.sources[id] || null;
}

// ─── Secret masking ───

function maskSecrets(source) {
  const result = { ...source, authConfig: { ...source.authConfig } };
  const authType = AUTH_TYPES[source.authType];
  if (!authType) return result;

  for (const field of authType.fields) {
    if (field.secret && result.authConfig[field.key]) {
      const val = result.authConfig[field.key];
      if (typeof val === 'string') {
        result.authConfig[field.key] = val.length > 8 ? val.slice(0, 8) + '...' : '***';
      }
    }
  }
  return result;
}

// ─── Health checks ───

/**
 * Generate health check entries for all enabled data sources.
 * Returns array compatible with health-checks.js integrations format.
 */
export function getDataSourceHealthChecks(config) {
  return Object.values(config.sources)
    .filter(s => s.enabled)
    .map(source => ({
      id: `ds_${source.id}`,
      name: source.label || source.id,
      category: 'data_source',
      envVars: [],
      check: async () => {
        const healthPath = source.healthCheckPath || '/';
        const healthMethod = source.healthCheckMethod || 'GET';
        const baseUrl = (source.baseUrl || '').replace(/\/+$/, '');

        if (!baseUrl) return { ok: false, message: 'No base URL configured' };

        const url = new URL(healthPath, baseUrl);
        const authHeaders = buildAuthHeaders(source.authType, source.authConfig);
        const start = Date.now();

        try {
          const res = await fetch(url.toString(), {
            method: healthMethod,
            headers: { ...authHeaders, 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(5000),
          });
          const latency = Date.now() - start;

          // Accept 422 as "alive" (e.g. Tracker returns 422 without required params)
          if (res.status === 422) return { ok: true, message: 'OK (422 - alive)', latency };
          if (!res.ok) return { ok: false, message: `HTTP ${res.status}`, latency };
          return { ok: true, message: 'OK', latency };
        } catch (err) {
          const latency = Date.now() - start;
          return { ok: false, message: err.message || 'Connection failed', latency };
        }
      },
    }));
}

// ─── Validation ───

function validateSource(body) {
  const errors = [];
  if (!body.id || typeof body.id !== 'string') {
    errors.push('id is required');
  } else if (!/^[a-z0-9_]+$/.test(body.id)) {
    errors.push('id must be lowercase alphanumeric with underscores only');
  }
  if (!body.label || typeof body.label !== 'string') {
    errors.push('label is required');
  }
  if (body.authType && !AUTH_TYPES[body.authType]) {
    errors.push(`Unknown auth type: ${body.authType}`);
  }
  if (body.paginationType && !PAGINATION_TYPES[body.paginationType]) {
    errors.push(`Unknown pagination type: ${body.paginationType}`);
  }
  return errors;
}

// ─── Routes ───

export function setupDataSourceRoutes(app) {
  // GET /api/admin/data-sources — list all (masked), include type metadata
  app.get('/api/admin/data-sources', requireAuth, async (_req, res) => {
    try {
      const raw = await readConfig();
      const config = mergeEnvDefaults(raw);
      const sources = Object.values(config.sources).map(maskSecrets);
      res.json({ sources, authTypes: AUTH_TYPES, paginationTypes: PAGINATION_TYPES });
    } catch (err) {
      logger.error('GET /api/admin/data-sources error', { error: err.message });
      res.status(500).json({ error: 'Failed to load data sources' });
    }
  });

  // GET /api/admin/data-sources/:id — get single (masked)
  app.get('/api/admin/data-sources/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const raw = await readConfig();
      const config = mergeEnvDefaults(raw);
      const source = config.sources[id];
      if (!source) return res.status(404).json({ error: `Data source "${id}" not found` });
      res.json({ source: maskSecrets(source) });
    } catch (err) {
      logger.error('GET /api/admin/data-sources/:id error', { error: err.message });
      res.status(500).json({ error: 'Failed to load data source' });
    }
  });

  // POST /api/admin/data-sources — create new
  app.post('/api/admin/data-sources', requireAuth, async (req, res) => {
    try {
      const body = req.body || {};
      const errors = validateSource(body);
      if (errors.length > 0) return res.status(400).json({ error: errors.join('; ') });

      const config = await readConfig();
      const merged = mergeEnvDefaults(config);
      if (merged.sources[body.id]) {
        return res.status(409).json({ error: `Data source "${body.id}" already exists` });
      }

      const now = new Date().toISOString();
      const source = {
        id: body.id,
        label: body.label,
        baseUrl: body.baseUrl || '',
        authType: body.authType || 'none',
        authConfig: body.authConfig || {},
        paginationType: body.paginationType || 'none',
        paginationConfig: body.paginationConfig || {},
        healthCheckPath: body.healthCheckPath || '/',
        healthCheckMethod: body.healthCheckMethod || 'GET',
        timeout: body.timeout || 10000,
        enabled: body.enabled !== false,
        builtIn: false,
        source: 'manual',
        fieldMappings: Array.isArray(body.fieldMappings) ? body.fieldMappings : [],
        createdAt: now,
        updatedAt: now,
      };

      config.sources = config.sources || {};
      config.sources[source.id] = source;
      await writeConfig(config);

      logger.info('Data source created', { id: source.id });
      res.json({ source: maskSecrets(source) });
    } catch (err) {
      logger.error('POST /api/admin/data-sources error', { error: err.message });
      res.status(500).json({ error: 'Failed to create data source' });
    }
  });

  // PUT /api/admin/data-sources/:id — update
  app.put('/api/admin/data-sources/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const config = await readConfig();
      const merged = mergeEnvDefaults(config);

      if (!merged.sources[id]) {
        return res.status(404).json({ error: `Data source "${id}" not found` });
      }

      const existing = merged.sources[id];
      const body = req.body || {};

      if (body.authType && !AUTH_TYPES[body.authType]) {
        return res.status(400).json({ error: `Unknown auth type: ${body.authType}` });
      }
      if (body.paginationType && !PAGINATION_TYPES[body.paginationType]) {
        return res.status(400).json({ error: `Unknown pagination type: ${body.paginationType}` });
      }

      const updated = {
        ...existing,
        label: body.label ?? existing.label,
        baseUrl: body.baseUrl ?? existing.baseUrl,
        authType: body.authType ?? existing.authType,
        authConfig: body.authConfig ?? existing.authConfig,
        paginationType: body.paginationType ?? existing.paginationType,
        paginationConfig: body.paginationConfig ?? existing.paginationConfig,
        healthCheckPath: body.healthCheckPath ?? existing.healthCheckPath,
        healthCheckMethod: body.healthCheckMethod ?? existing.healthCheckMethod,
        timeout: body.timeout ?? existing.timeout,
        enabled: body.enabled ?? existing.enabled,
        fieldMappings: body.fieldMappings !== undefined ? body.fieldMappings : (existing.fieldMappings || []),
        source: 'manual', // Once manually edited, stop env sync
        updatedAt: new Date().toISOString(),
      };

      // Write back to raw config (not merged) to persist
      if (!config.sources) config.sources = {};
      config.sources[id] = updated;
      await writeConfig(config);

      logger.info('Data source updated', { id });
      res.json({ source: maskSecrets(updated) });
    } catch (err) {
      logger.error('PUT /api/admin/data-sources/:id error', { error: err.message });
      res.status(500).json({ error: 'Failed to update data source' });
    }
  });

  // DELETE /api/admin/data-sources/:id
  app.delete('/api/admin/data-sources/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const config = await readConfig();
      const merged = mergeEnvDefaults(config);

      if (!merged.sources[id]) {
        return res.status(404).json({ error: `Data source "${id}" not found` });
      }

      if (merged.sources[id].builtIn) {
        return res.status(403).json({ error: 'Cannot delete built-in data source' });
      }

      delete config.sources[id];
      await writeConfig(config);

      logger.info('Data source deleted', { id });
      res.json({ ok: true });
    } catch (err) {
      logger.error('DELETE /api/admin/data-sources/:id error', { error: err.message });
      res.status(500).json({ error: 'Failed to delete data source' });
    }
  });

  // POST /api/admin/data-sources/:id/test — test saved source connection
  app.post('/api/admin/data-sources/:id/test', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const raw = await readConfig();
      const config = mergeEnvDefaults(raw);
      const source = config.sources[id];

      if (!source) return res.status(404).json({ error: `Data source "${id}" not found` });

      const healthPath = source.healthCheckPath || '/';
      const healthMethod = source.healthCheckMethod || 'GET';
      const baseUrl = (source.baseUrl || '').replace(/\/+$/, '');

      if (!baseUrl) return res.json({ ok: false, message: 'No base URL configured' });

      const url = new URL(healthPath, baseUrl);
      const authHeaders = buildAuthHeaders(source.authType, source.authConfig);
      const start = Date.now();

      const fetchRes = await fetch(url.toString(), {
        method: healthMethod,
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(source.timeout || 10000),
      });

      const latency = Date.now() - start;
      const ok = fetchRes.ok || fetchRes.status === 422;
      const message = ok ? 'OK' : `HTTP ${fetchRes.status}`;

      // Persist test result
      if (raw.sources && raw.sources[id]) {
        raw.sources[id].lastTestAt = new Date().toISOString();
        raw.sources[id].lastTestStatus = message;
        await writeConfig(raw);
      }

      res.json({ ok, message, latency });
    } catch (err) {
      res.json({ ok: false, message: err.message || 'Connection failed' });
    }
  });

  // POST /api/admin/data-sources/:id/test-request — test with raw response preview
  // Unlike fetchFromSource(), this returns response body even on non-2xx statuses (e.g. 422)
  // so the API Explorer can show the actual API response for debugging.
  app.post('/api/admin/data-sources/:id/test-request', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { path: customPath, method: customMethod, queryParams: customQueryParams } = req.body || {};
      const source = await getSourceById(id);
      if (!source) return res.status(404).json({ ok: false, error: `Data source "${id}" not found` });

      const testPath = customPath || source.healthCheckPath || '/';

      // Build URL (same logic as fetchFromSource)
      const baseUrl = (source.baseUrl || '').replace(/\/+$/, '');
      const cleanPath = testPath.startsWith('/') ? testPath : `/${testPath}`;
      const url = new URL(cleanPath, baseUrl);
      for (const [k, v] of Object.entries(customQueryParams || {})) {
        if (v !== undefined && v !== null) url.searchParams.append(k, String(v));
      }

      const authHeaders = buildAuthHeaders(source.authType, source.authConfig);
      const start = Date.now();
      const response = await fetch(url.toString(), {
        method: customMethod || 'GET',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        signal: AbortSignal.timeout(source.timeout || 10000),
      });
      const latency = Date.now() - start;

      // Parse body regardless of HTTP status
      let data;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('json')) {
        data = await response.json().catch(() => null);
      } else {
        data = await response.text().catch(() => '');
      }

      const rawStr = JSON.stringify(data, null, 2);
      const truncated = rawStr.length > 10240;

      res.json({
        ok: response.ok,
        status: response.status,
        data: truncated ? rawStr.slice(0, 10240) + '\n... (truncated)' : data,
        truncated,
        latency,
      });
    } catch (err) {
      res.json({ ok: false, error: err.message || 'Request failed' });
    }
  });

  // POST /api/admin/data-sources/:id/discover — discover available metric templates
  app.post('/api/admin/data-sources/:id/discover', requireAuth, async (req, res) => {
    const { id } = req.params;
    console.log(`[discover] START sourceId=${id}`);

    // Safety timeout — ensure we always respond within 30 seconds
    const safetyTimer = setTimeout(() => {
      console.log(`[discover] SAFETY TIMEOUT sourceId=${id}`);
      if (!res.headersSent) {
        res.status(504).json({ error: 'Discovery timed out after 30 seconds' });
      }
    }, 30000);

    try {
      logger.info('Discover metrics request', { sourceId: id });
      const source = await getSourceById(id);
      if (!source) { clearTimeout(safetyTimer); return res.status(404).json({ error: `Data source "${id}" not found` }); }
      if (!source.enabled) { clearTimeout(safetyTimer); return res.status(400).json({ error: 'Data source is disabled' }); }
      console.log(`[discover] source found: ${source.label}, importing discovery module...`);

      const { discoverMetrics } = await import('./source-discovery.js');
      console.log(`[discover] module imported, running discoverMetrics...`);
      const result = await discoverMetrics(source);
      console.log(`[discover] discovery done, categories=${result.categories?.length}`);

      // Mark templates that already exist as metrics
      const { readConfig: readMetricsConfig } = await import('./dashboard-metrics.js');
      const metricsConfig = await readMetricsConfig();
      const existingIds = new Set(metricsConfig.metrics.map(m => m.id));

      for (const category of result.categories) {
        for (const item of category.items) {
          item.alreadyExists = existingIds.has(item.templateId);
        }
      }

      const totalTemplates = result.categories.reduce((sum, c) => sum + c.items.length, 0);
      console.log(`[discover] DONE sourceId=${id}, templates=${totalTemplates}`);
      logger.info('Discover metrics complete', { sourceId: id, categories: result.categories.length, templates: totalTemplates });
      clearTimeout(safetyTimer);
      if (!res.headersSent) res.json(result);
    } catch (err) {
      console.log(`[discover] ERROR sourceId=${id}:`, err.message);
      logger.error('Discover metrics failed', { sourceId: id, error: err.message, stack: err.stack });
      clearTimeout(safetyTimer);
      if (!res.headersSent) res.status(500).json({ error: 'Discovery failed: ' + (err.message || 'Unknown error') });
    }
  });

  // POST /api/admin/data-sources/test-extraction — test metric extraction (JSONPath + fetch)
  app.post('/api/admin/data-sources/test-extraction', requireAuth, async (req, res) => {
    try {
      const {
        dataSourceId, url, path: reqPath, method,
        queryParams, body: reqBody, headers,
        jsonPathFact, jsonPathPlan,
      } = req.body || {};

      let rawData;
      const start = Date.now();

      // Build query params object
      const qp = {};
      if (Array.isArray(queryParams)) {
        for (const { key, value } of queryParams) {
          if (key) qp[key] = value;
        }
      }

      // Parse body
      let parsedBody = null;
      if (reqBody) {
        try { parsedBody = typeof reqBody === 'string' ? JSON.parse(reqBody) : reqBody; } catch { /* ignore */ }
      }

      if (dataSourceId) {
        const source = await getSourceById(dataSourceId);
        if (!source) return res.status(404).json({ ok: false, error: `Data source "${dataSourceId}" not found` });
        rawData = await fetchFromSource(source, reqPath || '/', qp, {
          method: method || 'GET',
          body: parsedBody,
        });
      } else if (url) {
        const fetchUrl = new URL(url);
        for (const [k, v] of Object.entries(qp)) {
          fetchUrl.searchParams.append(k, String(v));
        }
        const response = await fetch(fetchUrl.toString(), {
          method: method || 'GET',
          headers: { 'Content-Type': 'application/json', ...(headers || {}) },
          body: parsedBody && method !== 'GET' ? JSON.stringify(parsedBody) : undefined,
          signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        rawData = await response.json();
      } else {
        return res.status(400).json({ ok: false, error: 'Either dataSourceId or url is required' });
      }

      const latency = Date.now() - start;

      // Truncate raw response for safety (max 10KB serialized)
      const rawStr = JSON.stringify(rawData);
      const truncated = rawStr.length > 10240;
      const rawResponse = truncated ? JSON.parse(rawStr.slice(0, 10240) + '"}') : rawData;

      const extractedFact = jsonPathFact ? extractByPath(rawData, jsonPathFact) : null;
      const extractedPlan = jsonPathPlan ? extractByPath(rawData, jsonPathPlan) : null;

      res.json({
        ok: true,
        rawResponse: truncated ? rawStr.slice(0, 10240) : rawData,
        rawResponseTruncated: truncated,
        extractedFact,
        extractedPlan,
        factPath: jsonPathFact || '',
        planPath: jsonPathPlan || '',
        latency,
      });
    } catch (err) {
      res.json({ ok: false, error: err.message || 'Extraction test failed' });
    }
  });

  // POST /api/admin/data-sources/test-inline — test unsaved config
  app.post('/api/admin/data-sources/test-inline', requireAuth, async (req, res) => {
    try {
      const body = req.body || {};
      const baseUrl = (body.baseUrl || '').replace(/\/+$/, '');

      if (!baseUrl) return res.json({ ok: false, message: 'No base URL provided' });

      const healthPath = body.healthCheckPath || '/';
      const healthMethod = body.healthCheckMethod || 'GET';
      const url = new URL(healthPath, baseUrl);
      const authHeaders = buildAuthHeaders(body.authType || 'none', body.authConfig || {});
      const start = Date.now();

      const fetchRes = await fetch(url.toString(), {
        method: healthMethod,
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(body.timeout || 10000),
      });

      const latency = Date.now() - start;
      const ok = fetchRes.ok || fetchRes.status === 422;
      const message = ok ? 'OK' : `HTTP ${fetchRes.status}`;

      res.json({ ok, message, latency });
    } catch (err) {
      res.json({ ok: false, message: err.message || 'Connection failed' });
    }
  });
}

// ─── Initialization ───

export async function initializeDataSources() {
  const raw = await readConfig();
  const config = mergeEnvDefaults(raw);

  // Auto-save if tracker was seeded from env
  if (config.sources.tracker && !raw.sources?.tracker) {
    await writeConfig(config);
    logger.info('Data source "tracker" seeded from env vars');
  }

  const count = Object.keys(config.sources).length;
  logger.info(`Data sources initialized: ${count} source(s)`);

  return config;
}

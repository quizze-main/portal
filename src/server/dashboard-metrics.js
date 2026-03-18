import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import logger from './logger.js';
import { requireAuth } from './requireAuth.js';
import { isDbConnected, query } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../../data');
const CONFIG_PATH = path.join(DATA_DIR, 'dashboard-metrics.json');

// Default seed — current 8 hardcoded metrics migrated as initial config
// Default widgets — seeded when no widgets exist
const DEFAULT_WIDGETS = [
  {
    id: 'ranking_branches',
    type: 'ranking',
    name: 'Рейтинг филиалов',
    enabled: true,
    order: 100,
    config: {
      entityType: 'branch',
      metricCodes: ['revenue_created', 'revenue_closed', 'frames_count', 'conversion_rate', 'csi', 'avg_glasses_price', 'margin_rate', 'avg_repaires_price'],
      lossConfig: { mode: 'metric', metricCode: 'revenue_created', formula: '' }
    }
  },
  {
    id: 'ranking_managers',
    type: 'ranking',
    name: 'Рейтинг менеджеров',
    enabled: true,
    order: 200,
    config: {
      entityType: 'manager',
      metricCodes: ['revenue_created', 'revenue_closed', 'frames_count', 'avg_glasses_price', 'conversion_rate', 'csi', 'margin_rate'],
      lossConfig: { mode: 'metric', metricCode: 'revenue_created', formula: '' }
    }
  }
];

const DEFAULT_METRICS = [
  { id: 'revenue_created', name: 'Выручка СЗ', unit: '₽', forecastUnit: '%', forecastLabel: 'forecast', widgetType: 'kpi_forecast', parentId: null, source: 'tracker', trackerCode: 'revenue_created', color: '#3B82F6', enabled: true, order: 0 },
  { id: 'revenue_closed', name: 'Выручка ЗЗ', unit: '₽', forecastUnit: '%', forecastLabel: 'forecast', widgetType: 'kpi_forecast', parentId: null, source: 'tracker', trackerCode: 'revenue_closed', color: '#06B6D4', enabled: true, order: 1 },
  { id: 'frames_count', name: 'Кол-во ФЛ', unit: 'шт', forecastUnit: '%', forecastLabel: 'forecast', widgetType: 'kpi_forecast', parentId: null, source: 'tracker', trackerCode: 'frames_count', color: '#8B5CF6', enabled: true, order: 2 },
  { id: 'conversion_rate', name: 'Конверсия', unit: '%', forecastUnit: '%', forecastLabel: 'deviation', widgetType: 'kpi_deviation', parentId: null, source: 'tracker', trackerCode: 'conversion_rate', color: '#10B981', enabled: true, order: 3 },
  { id: 'csi', name: 'CSI', unit: '%', forecastUnit: '%', forecastLabel: 'deviation', widgetType: 'kpi_deviation', parentId: null, source: 'tracker', trackerCode: 'csi', color: '#F59E0B', enabled: true, order: 4 },
  { id: 'avg_glasses_price', name: 'Ср. стоимость очков', unit: '₽', forecastUnit: '%', forecastLabel: 'deviation', widgetType: 'kpi_deviation', parentId: null, source: 'tracker', trackerCode: 'avg_glasses_price', color: '#EF4444', enabled: true, order: 5 },
  { id: 'margin_rate', name: 'Маржинальность', unit: '₽', forecastUnit: '%', forecastLabel: 'deviation', widgetType: 'kpi_deviation', parentId: null, source: 'tracker', trackerCode: 'margin_rate', color: '#EC4899', enabled: true, order: 6 },
  { id: 'avg_repaires_price', name: 'Ср. стоимость ремонтов', unit: '₽', forecastUnit: '%', forecastLabel: 'deviation', widgetType: 'kpi_deviation', parentId: null, source: 'tracker', trackerCode: 'avg_repaires_price', color: '#6366F1', enabled: true, order: 7 },
];

// Migrate legacy metrics that lack widgetType/parentId fields + V2 fields
function migrateMetric(m) {
  if (!m.widgetType) {
    m.widgetType = m.forecastLabel === 'deviation' ? 'kpi_deviation' : 'kpi_forecast';
  }
  if (m.parentId === undefined) {
    m.parentId = null;
  }
  if (!Array.isArray(m.visibleToPositions)) {
    m.visibleToPositions = [];
  }
  if (m.dataSourceId === undefined) m.dataSourceId = null;
  if (m.externalPath === undefined) m.externalPath = '';
  if (m.externalQueryParams === undefined) m.externalQueryParams = [];
  if (m.externalBody === undefined) m.externalBody = null;

  // V2: auto-infer from existing data
  if (!m.metricType) {
    if (m.formula) m.metricType = 'computed';
    else m.metricType = m.widgetType === 'kpi_deviation' ? 'averaged' : 'absolute';
  }
  if (!m.valueType) {
    const u = (m.unit || '').toLowerCase();
    if (u === '₽' || u === 'руб' || u === 'руб.') m.valueType = 'currency';
    else if (u === '%') m.valueType = 'percentage';
    else if (u === 'шт' || u === 'шт.') m.valueType = 'count';
    else m.valueType = 'count';
  }
  if (!m.aggregation) {
    m.aggregation = m.metricType === 'absolute' ? 'sum' : 'simple_average';
  }
  if (!m.planPeriod) m.planPeriod = 'month';
  if (!m.planProRateMethod) m.planProRateMethod = 'working_days';
  if (m.decimalPlaces === undefined) {
    m.decimalPlaces = (m.valueType === 'percentage' || m.valueType === 'ratio') ? 1 : 0;
  }
  if (!m.thresholds) {
    m.thresholds = m.forecastLabel === 'deviation'
      ? { critical: -5, good: 5 }
      : { critical: 70, good: 95 };
  }
  if (m.formula === undefined) m.formula = '';
  if (!Array.isArray(m.formulaDependencies)) m.formulaDependencies = [];
  if (!Array.isArray(m.bindings)) m.bindings = [];
  // Sanitize bindings: remove empty queryParamOverrides entries
  for (const b of m.bindings) {
    if (Array.isArray(b.queryParamOverrides)) {
      b.queryParamOverrides = b.queryParamOverrides.filter(o => o.key);
      if (b.queryParamOverrides.length === 0) delete b.queryParamOverrides;
    }
  }

  // V3: Initialize fieldMappings
  if (!Array.isArray(m.fieldMappings)) m.fieldMappings = [];
  // Sanitize fieldMappings: remove entries with empty values
  m.fieldMappings = m.fieldMappings.filter(fm => fm.apiField && fm.entityType);
  for (const fm of m.fieldMappings) {
    if (!fm.values || typeof fm.values !== 'object') fm.values = {};
    // Remove empty-value entries
    for (const [k, v] of Object.entries(fm.values)) {
      if (!v && v !== '0') delete fm.values[k];
    }
  }

  // V3: Migrate queryParamOverrides → fieldMappings (one-time auto-migration)
  if (m.fieldMappings.length === 0 && m.source === 'external_api') {
    const overrideMap = {}; // apiField → { entityId → value }
    for (const b of m.bindings) {
      if (b.scope === 'branch' && Array.isArray(b.queryParamOverrides)) {
        for (const o of b.queryParamOverrides) {
          if (!o.key) continue;
          if (!overrideMap[o.key]) overrideMap[o.key] = {};
          overrideMap[o.key][b.scopeId] = o.value;
        }
      }
    }
    for (const [apiField, values] of Object.entries(overrideMap)) {
      m.fieldMappings.push({
        id: apiField.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 32),
        apiField,
        entityType: 'branch',
        label: apiField,
        values,
      });
    }
  }

  // V4: Loss/reserve configuration
  const VALID_LOSS_MODES = ['auto', 'formula', 'jsonpath', 'disabled', 'tracker'];
  if (!m.lossMode || !VALID_LOSS_MODES.includes(m.lossMode)) {
    m.lossMode = m.source === 'tracker' ? 'tracker' : 'disabled';
  }
  if (m.lossFormula === undefined) m.lossFormula = '';
  if (m.jsonPathLoss === undefined) m.jsonPathLoss = '';

  return m;
}

// ─── DB-backed helpers ───

async function readConfigFromDb() {
  const { rows } = await query(`
    SELECT id, name, description, unit,
      metric_type AS "metricType", value_type AS "valueType",
      aggregation_method AS "aggregation",
      plan_period AS "planPeriod", plan_prorate_method AS "planProRateMethod",
      widget_type AS "widgetType", forecast_label AS "forecastLabel",
      forecast_unit AS "forecastUnit", color,
      decimal_places AS "decimalPlaces", display_order AS "order",
      parent_id AS "parentId",
      threshold_critical, threshold_good,
      source_type AS "source", data_source_id AS "dataSourceId",
      tracker_code AS "trackerCode",
      external_path AS "externalPath", external_query_params AS "externalQueryParams",
      external_body AS "externalBody",
      formula, formula_dependencies AS "formulaDependencies",
      enabled, visible_to_positions AS "visibleToPositions",
      bindings, metadata,
      loss_mode AS "lossMode", loss_formula AS "lossFormula",
      json_path_loss AS "jsonPathLoss"
    FROM metric_definitions
    ORDER BY display_order, id
  `);

  // Load field mappings and manual data for each metric
  for (const m of rows) {
    m.thresholds = {};
    if (m.threshold_critical != null) m.thresholds.critical = Number(m.threshold_critical);
    if (m.threshold_good != null) m.thresholds.good = Number(m.threshold_good);
    delete m.threshold_critical;
    delete m.threshold_good;

    const fmResult = await query(
      'SELECT api_field AS "apiField", entity_type AS "entityType", label, values FROM metric_field_mappings WHERE metric_id = $1',
      [m.id]
    );
    m.fieldMappings = fmResult?.rows || [];

    const mdResult = await query(
      'SELECT period, branch_id AS "storeId", fact_value AS "fact", plan_value AS "plan" FROM manual_metric_data WHERE metric_id = $1',
      [m.id]
    );
    m.manualData = (mdResult?.rows || []).map(d => ({
      period: d.period, storeId: d.storeId || '', fact: Number(d.fact), plan: Number(d.plan)
    }));
  }

  // Read widgets from DB
  let widgets = [];
  try {
    const wResult = await query(`
      SELECT id, type, name, enabled, display_order AS "order", parent_id AS "parentId", config
      FROM dashboard_widgets
      ORDER BY display_order, id
    `);
    widgets = wResult.rows || [];
  } catch {
    // Table may not exist yet — use defaults
    widgets = [...DEFAULT_WIDGETS];
  }

  // Read non-metric config (rankingLossConfig) from JSON file (backward compat)
  let rankingLossConfig;
  try {
    if (existsSync(CONFIG_PATH)) {
      const raw = await readFile(CONFIG_PATH, 'utf-8');
      const jsonConfig = JSON.parse(raw);
      rankingLossConfig = jsonConfig.rankingLossConfig;
    }
  } catch { /* ignore */ }

  return { metrics: rows, widgets: widgets.length ? widgets : DEFAULT_WIDGETS, rankingLossConfig };
}

async function writeMetricToDb(metric) {
  await query(`
    INSERT INTO metric_definitions (
      id, name, description, unit,
      metric_type, value_type, aggregation_method,
      plan_period, plan_prorate_method,
      widget_type, forecast_label, forecast_unit, color,
      decimal_places, display_order, parent_id,
      threshold_critical, threshold_good,
      source_type, data_source_id, tracker_code,
      external_path, external_query_params, external_body,
      formula, formula_dependencies,
      enabled, visible_to_positions, bindings, metadata,
      loss_mode, loss_formula, json_path_loss
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
      $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
      $31, $32, $33
    ) ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name, description = EXCLUDED.description, unit = EXCLUDED.unit,
      metric_type = EXCLUDED.metric_type, value_type = EXCLUDED.value_type,
      aggregation_method = EXCLUDED.aggregation_method,
      plan_period = EXCLUDED.plan_period, plan_prorate_method = EXCLUDED.plan_prorate_method,
      widget_type = EXCLUDED.widget_type, forecast_label = EXCLUDED.forecast_label,
      forecast_unit = EXCLUDED.forecast_unit, color = EXCLUDED.color,
      decimal_places = EXCLUDED.decimal_places, display_order = EXCLUDED.display_order,
      parent_id = EXCLUDED.parent_id,
      threshold_critical = EXCLUDED.threshold_critical, threshold_good = EXCLUDED.threshold_good,
      source_type = EXCLUDED.source_type, data_source_id = EXCLUDED.data_source_id,
      tracker_code = EXCLUDED.tracker_code,
      external_path = EXCLUDED.external_path, external_query_params = EXCLUDED.external_query_params,
      external_body = EXCLUDED.external_body,
      formula = EXCLUDED.formula, formula_dependencies = EXCLUDED.formula_dependencies,
      enabled = EXCLUDED.enabled, visible_to_positions = EXCLUDED.visible_to_positions,
      bindings = EXCLUDED.bindings, metadata = EXCLUDED.metadata,
      loss_mode = EXCLUDED.loss_mode, loss_formula = EXCLUDED.loss_formula,
      json_path_loss = EXCLUDED.json_path_loss,
      updated_at = now()
  `, [
    metric.id, metric.name, metric.description || null, metric.unit || '',
    metric.metricType || 'absolute', metric.valueType || 'count', metric.aggregation || 'sum',
    metric.planPeriod || 'month', metric.planProRateMethod || 'working_days',
    metric.widgetType || 'kpi_forecast', metric.forecastLabel || 'forecast',
    metric.forecastUnit || '%', metric.color || '#3B82F6',
    metric.decimalPlaces ?? 0, metric.order ?? 0, metric.parentId || null,
    metric.thresholds?.critical ?? null, metric.thresholds?.good ?? null,
    metric.source || 'tracker', metric.dataSourceId || null, metric.trackerCode || null,
    metric.externalPath || null, JSON.stringify(metric.externalQueryParams || []),
    metric.externalBody ? JSON.stringify(metric.externalBody) : null,
    metric.formula || null, metric.formulaDependencies || [],
    metric.enabled !== false, metric.visibleToPositions || [],
    JSON.stringify(metric.bindings || []), JSON.stringify(metric.metadata || {}),
    metric.lossMode || 'disabled', metric.lossFormula || null, metric.jsonPathLoss || null
  ]);

  // Sync field mappings
  if (Array.isArray(metric.fieldMappings)) {
    await query('DELETE FROM metric_field_mappings WHERE metric_id = $1 AND data_source_id IS NULL', [metric.id]);
    for (const fm of metric.fieldMappings) {
      if (!fm.apiField || !fm.entityType) continue;
      await query(
        'INSERT INTO metric_field_mappings (metric_id, api_field, entity_type, label, values) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING',
        [metric.id, fm.apiField, fm.entityType, fm.label || null, JSON.stringify(fm.values || {})]
      );
    }
  }

  // Sync manual data
  if (Array.isArray(metric.manualData)) {
    await query('DELETE FROM manual_metric_data WHERE metric_id = $1', [metric.id]);
    for (const md of metric.manualData) {
      await query(
        'INSERT INTO manual_metric_data (metric_id, period, branch_id, fact_value, plan_value) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING',
        [metric.id, md.period || md.date, md.storeId || null, md.fact ?? md.value ?? 0, md.plan ?? 0]
      );
    }
  }
}

// ─── Dual-read config ───

async function readConfigFromJson() {
  try {
    if (!existsSync(CONFIG_PATH)) return { metrics: [...DEFAULT_METRICS], widgets: [...DEFAULT_WIDGETS] };
    const raw = await readFile(CONFIG_PATH, 'utf-8');
    const config = JSON.parse(raw);
    if (!config.metrics || !config.metrics.length) {
      config.metrics = [...DEFAULT_METRICS];
    }
    config.metrics = config.metrics.map(migrateMetric);
    if (!config.widgets || !config.widgets.length) {
      config.widgets = [...DEFAULT_WIDGETS];
    }
    return config;
  } catch {
    return { metrics: [...DEFAULT_METRICS], widgets: [...DEFAULT_WIDGETS] };
  }
}

export async function readConfig() {
  if (isDbConnected()) {
    try {
      return await readConfigFromDb();
    } catch (err) {
      logger.warn('DB readConfig failed, falling back to JSON', { error: err.message });
    }
  }
  return readConfigFromJson();
}

async function writeConfig(config) {
  // Always write to JSON (backward compat)
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');

  // Also write to DB if connected
  if (isDbConnected()) {
    try {
      for (const m of config.metrics) {
        await writeMetricToDb(m);
      }
    } catch (err) {
      logger.warn('DB writeConfig failed', { error: err.message });
    }
  }
}

// Helper: resolve Frappe employee ID from tg_username (cached in memory)
const employeeIdCache = new Map(); // tg_username -> { id, name, ts }
const EMPLOYEE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function resolveEmployeeFromJwt(req) {
  const tgUsername = req.user?.tg_username;
  if (!tgUsername) return { employeeId: '', employeeName: req.user?.employeename || '' };

  const cached = employeeIdCache.get(tgUsername);
  if (cached && Date.now() - cached.ts < EMPLOYEE_CACHE_TTL) {
    return { employeeId: cached.id, employeeName: cached.name };
  }

  try {
    const FRAPPE_BASE_URL = process.env.FRAPPE_BASE_URL;
    const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
    const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;
    if (!FRAPPE_BASE_URL || !FRAPPE_API_KEY) {
      return { employeeId: '', employeeName: req.user?.employeename || '' };
    }

    const url = `${FRAPPE_BASE_URL}/api/resource/Employee?filters=[["status","=","Active"],["custom_tg_username","=","${tgUsername}"]]&fields=["name","employee_name"]&limit_page_length=1`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const result = await response.json();
      const emp = Array.isArray(result?.data) && result.data[0];
      if (emp?.name) {
        const entry = { id: emp.name, name: emp.employee_name || req.user?.employeename || '', ts: Date.now() };
        employeeIdCache.set(tgUsername, entry);
        return { employeeId: entry.id, employeeName: entry.name };
      }
    }
  } catch (err) {
    logger.error('resolveEmployeeFromJwt error', { error: err.message, tgUsername });
  }

  return { employeeId: '', employeeName: req.user?.employeename || '' };
}

export function setupDashboardMetricsRoutes(app) {
  // GET /api/admin/dashboard-metrics — list all metric configs
  app.get('/api/admin/dashboard-metrics', requireAuth, async (_req, res) => {
    try {
      const config = await readConfig();
      res.json({ metrics: config.metrics });
    } catch (err) {
      logger.error('GET /api/admin/dashboard-metrics error', { error: err.message });
      res.status(500).json({ error: 'Failed to load metrics config' });
    }
  });

  // POST /api/admin/dashboard-metrics — create new metric
  app.post('/api/admin/dashboard-metrics', requireAuth, async (req, res) => {
    try {
      const config = await readConfig();
      const body = req.body || {};

      if (!body.id || !body.name) {
        return res.status(400).json({ error: 'id and name are required' });
      }

      // Check for duplicate ID
      if (config.metrics.some(m => m.id === body.id)) {
        return res.status(409).json({ error: `Metric with id "${body.id}" already exists` });
      }

      const minOrder = config.metrics.reduce((min, m) => Math.min(min, m.order ?? 0), 0);

      // Validate parentId if provided
      if (body.parentId) {
        const parent = config.metrics.find(m => m.id === body.parentId);
        if (!parent) {
          return res.status(400).json({ error: `Parent metric "${body.parentId}" not found` });
        }
        if (parent.parentId) {
          return res.status(400).json({ error: 'Nesting deeper than 2 levels is not allowed' });
        }
      }

      const metric = migrateMetric({
        id: body.id,
        name: body.name,
        unit: body.unit || '',
        forecastUnit: body.forecastUnit || '%',
        forecastLabel: body.forecastLabel || 'forecast',
        widgetType: body.widgetType || 'kpi_forecast',
        parentId: body.parentId || null,
        source: body.source || 'tracker',
        trackerCode: body.trackerCode || '',
        externalUrl: body.externalUrl || '',
        externalMethod: body.externalMethod || 'GET',
        externalHeaders: body.externalHeaders || {},
        jsonPathFact: body.jsonPathFact || '',
        jsonPathPlan: body.jsonPathPlan || '',
        manualData: body.manualData || [],
        color: body.color || '#3B82F6',
        enabled: body.enabled !== false,
        order: body.order ?? minOrder - 1,
        visibleToPositions: Array.isArray(body.visibleToPositions) ? body.visibleToPositions : [],
        dataSourceId: body.dataSourceId || null,
        externalPath: body.externalPath || '',
        externalQueryParams: Array.isArray(body.externalQueryParams) ? body.externalQueryParams : [],
        externalBody: body.externalBody || null,
        // V2 fields (migrateMetric will auto-infer missing ones)
        metricType: body.metricType,
        valueType: body.valueType,
        aggregation: body.aggregation,
        planPeriod: body.planPeriod,
        planProRateMethod: body.planProRateMethod,
        formula: body.formula,
        formulaDependencies: Array.isArray(body.formulaDependencies) ? body.formulaDependencies : undefined,
        decimalPlaces: body.decimalPlaces,
        thresholds: body.thresholds,
        bindings: Array.isArray(body.bindings) ? body.bindings : undefined,
        // V4: Loss/reserve config
        lossMode: body.lossMode,
        lossFormula: body.lossFormula,
        jsonPathLoss: body.jsonPathLoss,
      });

      config.metrics.push(metric);
      await writeConfig(config);
      logger.info('Dashboard metric created', { id: metric.id });
      res.json({ metric });
    } catch (err) {
      logger.error('POST /api/admin/dashboard-metrics error', { error: err.message });
      res.status(500).json({ error: 'Failed to create metric' });
    }
  });

  // PUT /api/admin/dashboard-metrics/reorder — batch update order
  app.put('/api/admin/dashboard-metrics/reorder', requireAuth, async (req, res) => {
    try {
      const { ids } = req.body || {};
      if (!Array.isArray(ids)) {
        return res.status(400).json({ error: 'ids array is required' });
      }

      const config = await readConfig();
      // Update order based on position in ids array
      for (const metric of config.metrics) {
        const idx = ids.indexOf(metric.id);
        if (idx !== -1) {
          metric.order = idx;
        }
      }

      await writeConfig(config);
      logger.info('Dashboard metrics reordered', { ids });
      res.json({ ok: true });
    } catch (err) {
      logger.error('PUT /api/admin/dashboard-metrics/reorder error', { error: err.message });
      res.status(500).json({ error: 'Failed to reorder metrics' });
    }
  });

  // GET /api/admin/dashboard-metrics/daily-facts — batch load facts for a single date
  // NOTE: must be before /:id routes so Express doesn't match "daily-facts" as :id
  app.get('/api/admin/dashboard-metrics/daily-facts', requireAuth, async (req, res) => {
    try {
      const { date, storeId } = req.query;
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: 'date query param required (YYYY-MM-DD)' });
      }

      const config = await readConfig();
      const manualMetrics = (config.metrics || []).filter(m => m.source === 'manual' && m.enabled);

      const facts = {};
      for (const metric of manualMetrics) {
        const entries = metric.manualData || [];
        const entry = entries.find(
          d => d.period === date && (!storeId || (d.storeId || '') === storeId)
        );
        if (entry) {
          facts[metric.id] = { fact: entry.fact };
        }
      }

      // Also compute month-to-date totals for context
      const month = date.slice(0, 7); // YYYY-MM
      const monthTotals = {};
      for (const metric of manualMetrics) {
        const entries = metric.manualData || [];
        let sum = 0;
        for (const d of entries) {
          if (d.period.length === 10 && d.period.startsWith(month) && (!storeId || (d.storeId || '') === storeId)) {
            sum += d.fact || 0;
          }
        }
        monthTotals[metric.id] = sum;
      }

      res.json({ facts, monthTotals });
    } catch (err) {
      logger.error('GET /api/admin/dashboard-metrics/daily-facts error', { error: err.message });
      res.status(500).json({ error: 'Failed to load daily facts' });
    }
  });

  // GET /api/admin/dashboard-metrics/facts-overview — aggregated facts for multiple branches (leader view)
  app.get('/api/admin/dashboard-metrics/facts-overview', requireAuth, async (req, res) => {
    try {
      const { date, storeIds } = req.query;
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: 'date query param required (YYYY-MM-DD)' });
      }
      const storeIdList = (storeIds || '').split(',').filter(Boolean);
      if (storeIdList.length === 0) {
        return res.status(400).json({ error: 'storeIds query param required (comma-separated)' });
      }

      const config = await readConfig();
      const manualMetrics = (config.metrics || []).filter(m => m.source === 'manual' && m.enabled);
      const month = date.slice(0, 7);

      const branches = {};
      for (const sid of storeIdList) {
        const facts = {};
        const monthTotals = {};
        const employees = {};

        for (const metric of manualMetrics) {
          const entries = metric.manualData || [];

          let branchDayTotal = 0;
          let branchMonthTotal = 0;

          for (const d of entries) {
            if ((d.storeId || '') !== sid) continue;

            const eid = d.employeeId || '__unknown__';
            const ename = d.employeeName || 'Без автора';

            if (!employees[eid]) {
              employees[eid] = { name: ename, facts: {}, monthTotals: {}, filled: false };
            }

            // Day fact
            if (d.period === date) {
              const val = d.fact || 0;
              employees[eid].facts[metric.id] = { fact: val };
              employees[eid].filled = true;
              branchDayTotal += val;
            }

            // Month total
            if (d.period.length === 10 && d.period.startsWith(month)) {
              const val = d.fact || 0;
              employees[eid].monthTotals[metric.id] = (employees[eid].monthTotals[metric.id] || 0) + val;
              branchMonthTotal += val;
            }
          }

          if (branchDayTotal > 0 || Object.values(employees).some(e => e.facts[metric.id])) {
            facts[metric.id] = { fact: branchDayTotal };
          }
          monthTotals[metric.id] = branchMonthTotal;
        }

        branches[sid] = {
          facts,
          monthTotals,
          filled: Object.keys(facts).length > 0,
          employees,
        };
      }

      // Aggregate totals across all branches
      const totalsByMetric = {};
      for (const metric of manualMetrics) {
        totalsByMetric[metric.id] = storeIdList.reduce(
          (acc, sid) => acc + (branches[sid]?.monthTotals[metric.id] || 0), 0
        );
      }

      res.json({
        branches,
        totalsByMetric,
        date,
        metrics: manualMetrics.map(m => ({ id: m.id, name: m.name, color: m.color, unit: m.unit })),
      });
    } catch (err) {
      logger.error('GET /api/admin/dashboard-metrics/facts-overview error', { error: err.message });
      res.status(500).json({ error: 'Failed to load facts overview' });
    }
  });

  // POST /api/admin/dashboard-metrics/daily-facts — batch save facts for a single date
  app.post('/api/admin/dashboard-metrics/daily-facts', requireAuth, async (req, res) => {
    try {
      const { date, storeId, entries } = req.body || {};
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: 'date is required (YYYY-MM-DD)' });
      }
      if (!Array.isArray(entries) || entries.length === 0) {
        return res.status(400).json({ error: 'entries array is required' });
      }
      if (entries.length > 50) {
        return res.status(400).json({ error: 'Too many entries (max 50)' });
      }

      // Resolve employee identity from JWT
      const { employeeId, employeeName } = await resolveEmployeeFromJwt(req);

      const config = await readConfig();
      let savedCount = 0;

      for (const { metricId, fact } of entries) {
        if (!metricId) continue;
        const metric = config.metrics.find(m => m.id === metricId);
        if (!metric || metric.source !== 'manual') continue;

        if (!metric.manualData) metric.manualData = [];

        const sid = storeId || '';
        const eid = employeeId || '';

        // Match by (period, storeId, employeeId) for per-employee tracking
        const existingIdx = metric.manualData.findIndex(
          d => d.period === date && (d.storeId || '') === sid && (d.employeeId || '') === eid
        );

        const entry = {
          period: date,
          storeId: sid,
          employeeId: eid,
          employeeName: employeeName,
          fact: typeof fact === 'number' ? fact : parseFloat(fact) || 0,
          plan: 0,
        };

        if (existingIdx !== -1) {
          metric.manualData[existingIdx] = entry;
        } else {
          metric.manualData.push(entry);
        }
        savedCount++;
      }

      await writeConfig(config);
      logger.info('Daily facts batch saved', { date, storeId, employeeId, count: savedCount });
      res.json({ ok: true, count: savedCount });
    } catch (err) {
      logger.error('POST /api/admin/dashboard-metrics/daily-facts error', { error: err.message });
      res.status(500).json({ error: 'Failed to save daily facts' });
    }
  });

  // GET /api/admin/dashboard-metrics/fact-history — recent fact entries per metric
  app.get('/api/admin/dashboard-metrics/fact-history', requireAuth, async (req, res) => {
    try {
      const { storeId, days = '14' } = req.query;
      const numDays = Math.min(Math.max(parseInt(days, 10) || 14, 1), 90);

      // Build date range [today - numDays .. today]
      const today = new Date();
      const cutoff = new Date(today);
      cutoff.setDate(cutoff.getDate() - numDays);
      const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`;

      const config = await readConfig();
      const manualMetrics = (config.metrics || []).filter(m => m.source === 'manual' && m.enabled);

      // Collect recent entries per metric, grouped by date
      const history = {}; // { [metricId]: { name, color, unit, entries: [{date, fact}] } }
      const filledDates = new Set();

      for (const metric of manualMetrics) {
        const entries = (metric.manualData || [])
          .filter(d =>
            d.period.length === 10 &&
            d.period >= cutoffStr &&
            (!storeId || (d.storeId || '') === storeId)
          )
          .sort((a, b) => b.period.localeCompare(a.period));

        if (entries.length > 0) {
          history[metric.id] = {
            name: metric.name,
            color: metric.color,
            unit: metric.unit,
            entries: entries.map(e => ({ date: e.period, fact: e.fact })),
          };
          for (const e of entries) filledDates.add(e.period);
        }
      }

      // Summary: which dates have any data filled
      const recentDates = Array.from(filledDates).sort().reverse().slice(0, numDays);

      res.json({ history, recentDates, days: numDays });
    } catch (err) {
      logger.error('GET /api/admin/dashboard-metrics/fact-history error', { error: err.message });
      res.status(500).json({ error: 'Failed to load fact history' });
    }
  });

  // PUT /api/admin/dashboard-metrics/:id — update metric config
  app.put('/api/admin/dashboard-metrics/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const config = await readConfig();
      const idx = config.metrics.findIndex(m => m.id === id);

      if (idx === -1) {
        return res.status(404).json({ error: `Metric "${id}" not found` });
      }

      const body = req.body || {};
      const existing = config.metrics[idx];

      // Sanitize bindings
      if (Array.isArray(body.bindings)) {
        const validScopes = ['network', 'branch', 'employee'];
        body.bindings = body.bindings.map(b => ({
          ...b,
          enabled: b.enabled !== false, // coerce to boolean
          scope: validScopes.includes(b.scope) ? b.scope : 'branch',
        }));
      }

      // Sanitize visibleToPositions
      if (Array.isArray(body.visibleToPositions)) {
        const knownCategories = ['leader', 'senior_manager', 'optometrist', 'manager_5_2', 'manager_2_2', 'universal_manager', 'manager', 'other'];
        body.visibleToPositions = body.visibleToPositions.filter(v => knownCategories.includes(v));
      }

      // Validate parentId if changing
      if (body.parentId !== undefined && body.parentId !== null && body.parentId !== existing.parentId) {
        if (body.parentId === id) {
          return res.status(400).json({ error: 'Metric cannot be its own parent' });
        }
        const parent = config.metrics.find(m => m.id === body.parentId);
        if (!parent) {
          return res.status(400).json({ error: `Parent metric "${body.parentId}" not found` });
        }
        if (parent.parentId) {
          return res.status(400).json({ error: 'Nesting deeper than 2 levels is not allowed' });
        }
        // Prevent making a parent into a child if it has children
        const hasChildren = config.metrics.some(m => m.parentId === id);
        if (hasChildren) {
          return res.status(400).json({ error: 'Cannot nest a metric that has sub-metrics' });
        }
      }

      config.metrics[idx] = migrateMetric({
        ...existing,
        name: body.name ?? existing.name,
        unit: body.unit ?? existing.unit,
        forecastUnit: body.forecastUnit ?? existing.forecastUnit,
        forecastLabel: body.forecastLabel ?? existing.forecastLabel,
        widgetType: body.widgetType ?? existing.widgetType ?? 'kpi_forecast',
        parentId: body.parentId !== undefined ? (body.parentId || null) : (existing.parentId ?? null),
        source: body.source ?? existing.source,
        trackerCode: body.trackerCode ?? existing.trackerCode,
        externalUrl: body.externalUrl ?? existing.externalUrl,
        externalMethod: body.externalMethod ?? existing.externalMethod,
        externalHeaders: body.externalHeaders ?? existing.externalHeaders,
        jsonPathFact: body.jsonPathFact ?? existing.jsonPathFact,
        jsonPathPlan: body.jsonPathPlan ?? existing.jsonPathPlan,
        manualData: body.manualData ?? existing.manualData,
        color: body.color ?? existing.color ?? '#3B82F6',
        enabled: body.enabled ?? existing.enabled,
        order: body.order ?? existing.order,
        visibleToPositions: Array.isArray(body.visibleToPositions) ? body.visibleToPositions : (existing.visibleToPositions ?? []),
        dataSourceId: body.dataSourceId !== undefined ? (body.dataSourceId || null) : (existing.dataSourceId ?? null),
        externalPath: body.externalPath ?? existing.externalPath ?? '',
        externalQueryParams: body.externalQueryParams !== undefined
          ? (Array.isArray(body.externalQueryParams) ? body.externalQueryParams : [])
          : (existing.externalQueryParams ?? []),
        externalBody: body.externalBody !== undefined ? (body.externalBody || null) : (existing.externalBody ?? null),
        // V2 fields
        metricType: body.metricType ?? existing.metricType,
        valueType: body.valueType ?? existing.valueType,
        aggregation: body.aggregation ?? existing.aggregation,
        planPeriod: body.planPeriod ?? existing.planPeriod,
        planProRateMethod: body.planProRateMethod ?? existing.planProRateMethod,
        formula: body.formula ?? existing.formula,
        formulaDependencies: Array.isArray(body.formulaDependencies) ? body.formulaDependencies : (existing.formulaDependencies ?? []),
        decimalPlaces: body.decimalPlaces ?? existing.decimalPlaces,
        thresholds: body.thresholds ?? existing.thresholds,
        bindings: Array.isArray(body.bindings) ? body.bindings : (existing.bindings ?? []),
        // V4: Loss/reserve config
        lossMode: body.lossMode ?? existing.lossMode,
        lossFormula: body.lossFormula ?? existing.lossFormula,
        jsonPathLoss: body.jsonPathLoss ?? existing.jsonPathLoss,
      });

      await writeConfig(config);
      logger.info('Dashboard metric updated', { id });
      res.json({ metric: config.metrics[idx] });
    } catch (err) {
      logger.error('PUT /api/admin/dashboard-metrics/:id error', { error: err.message });
      res.status(500).json({ error: 'Failed to update metric' });
    }
  });

  // DELETE /api/admin/dashboard-metrics/:id — delete metric
  app.delete('/api/admin/dashboard-metrics/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const config = await readConfig();
      const idx = config.metrics.findIndex(m => m.id === id);

      if (idx === -1) {
        return res.status(404).json({ error: `Metric "${id}" not found` });
      }

      config.metrics.splice(idx, 1);
      // Promote children to top-level
      for (const m of config.metrics) {
        if (m.parentId === id) {
          m.parentId = null;
        }
      }
      await writeConfig(config);
      logger.info('Dashboard metric deleted', { id });
      res.json({ ok: true });
    } catch (err) {
      logger.error('DELETE /api/admin/dashboard-metrics/:id error', { error: err.message });
      res.status(500).json({ error: 'Failed to delete metric' });
    }
  });

  // GET /api/admin/dashboard-metrics/:id/manual-data — get manual data entries
  app.get('/api/admin/dashboard-metrics/:id/manual-data', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const config = await readConfig();
      const metric = config.metrics.find(m => m.id === id);

      if (!metric) {
        return res.status(404).json({ error: `Metric "${id}" not found` });
      }

      res.json({ data: metric.manualData || [] });
    } catch (err) {
      logger.error('GET /api/admin/dashboard-metrics/:id/manual-data error', { error: err.message });
      res.status(500).json({ error: 'Failed to load manual data' });
    }
  });

  // POST /api/admin/dashboard-metrics/:id/manual-data — add/update manual data entry
  app.post('/api/admin/dashboard-metrics/:id/manual-data', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const config = await readConfig();
      const metric = config.metrics.find(m => m.id === id);

      if (!metric) {
        return res.status(404).json({ error: `Metric "${id}" not found` });
      }

      const { period, storeId, fact, plan } = req.body || {};
      if (!period) {
        return res.status(400).json({ error: 'period is required' });
      }

      if (!metric.manualData) metric.manualData = [];

      // Upsert: match on period + storeId
      const existingIdx = metric.manualData.findIndex(
        d => d.period === period && (d.storeId || '') === (storeId || '')
      );

      const entry = {
        period,
        storeId: storeId || '',
        fact: typeof fact === 'number' ? fact : parseFloat(fact) || 0,
        plan: typeof plan === 'number' ? plan : parseFloat(plan) || 0,
      };

      if (existingIdx !== -1) {
        metric.manualData[existingIdx] = entry;
      } else {
        metric.manualData.push(entry);
      }

      await writeConfig(config);
      logger.info('Dashboard metric manual data saved', { id, period, storeId });
      res.json({ entry });
    } catch (err) {
      logger.error('POST /api/admin/dashboard-metrics/:id/manual-data error', { error: err.message });
      res.status(500).json({ error: 'Failed to save manual data' });
    }
  });

  // POST /api/admin/dashboard-metrics/:id/manual-data/bulk — batch upsert manual data entries
  app.post('/api/admin/dashboard-metrics/:id/manual-data/bulk', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const config = await readConfig();
      const metric = config.metrics.find(m => m.id === id);

      if (!metric) {
        return res.status(404).json({ error: `Metric "${id}" not found` });
      }

      const { entries } = req.body || {};
      if (!Array.isArray(entries) || entries.length === 0) {
        return res.status(400).json({ error: 'entries array is required' });
      }
      if (entries.length > 100) {
        return res.status(400).json({ error: 'Too many entries (max 100)' });
      }

      if (!metric.manualData) metric.manualData = [];

      for (const raw of entries) {
        const { period, storeId, fact, plan } = raw || {};
        if (!period) continue;

        const existingIdx = metric.manualData.findIndex(
          d => d.period === period && (d.storeId || '') === (storeId || '')
        );

        const entry = {
          period,
          storeId: storeId || '',
          fact: typeof fact === 'number' ? fact : parseFloat(fact) || 0,
          plan: typeof plan === 'number' ? plan : parseFloat(plan) || 0,
        };

        if (existingIdx !== -1) {
          metric.manualData[existingIdx] = entry;
        } else {
          metric.manualData.push(entry);
        }
      }

      await writeConfig(config);
      logger.info('Dashboard metric manual data bulk saved', { id, count: entries.length });
      res.json({ ok: true, count: entries.length });
    } catch (err) {
      logger.error('POST /api/admin/dashboard-metrics/:id/manual-data/bulk error', { error: err.message });
      res.status(500).json({ error: 'Failed to bulk save manual data' });
    }
  });

  // ─── Widget CRUD ───

  // Helper: write a single widget to DB
  async function writeWidgetToDb(widget) {
    await query(`
      INSERT INTO dashboard_widgets (id, type, name, enabled, display_order, parent_id, config)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        type = EXCLUDED.type, name = EXCLUDED.name, enabled = EXCLUDED.enabled,
        display_order = EXCLUDED.display_order, parent_id = EXCLUDED.parent_id, config = EXCLUDED.config,
        updated_at = now()
    `, [widget.id, widget.type, widget.name, widget.enabled !== false, widget.order ?? 0, widget.parentId || null, JSON.stringify(widget.config || {})]);
  }

  // Helper: validate ranking widget config
  function validateRankingConfig(config) {
    if (!config || typeof config !== 'object') return 'config is required';
    if (!['branch', 'manager'].includes(config.entityType)) return 'config.entityType must be "branch" or "manager"';
    if (!Array.isArray(config.metricCodes) || config.metricCodes.length === 0) return 'config.metricCodes must be a non-empty array';
    if (config.lossConfig) {
      const lc = config.lossConfig;
      const validModes = ['metric', 'formula', 'auto', 'disabled'];
      if (lc.mode && !validModes.includes(lc.mode)) return `lossConfig.mode must be one of: ${validModes.join(', ')}`;
      if ((lc.mode === 'metric' || lc.mode === 'auto') && lc.metricCode && !/^[a-z0-9_]+$/i.test(lc.metricCode)) {
        return 'lossConfig.metricCode must contain only alphanumeric characters and underscores';
      }
      if (lc.mode === 'formula' && lc.formula) {
        const testExpr = String(lc.formula).replace(/\{[a-z0-9_]+(?:\.[a-z]+)?\}/gi, '0');
        if (!/^[\d\s+\-*/().]+$/.test(testExpr)) return 'Formula contains invalid characters';
      }
    }
    return null;
  }

  function validateChartConfig(config) {
    if (!config || typeof config !== 'object') return 'config is required';

    // Default subjectType to 'store' if missing
    if (config.subjectType && !['store', 'manager'].includes(config.subjectType)) {
      return 'config.subjectType must be "store" or "manager"';
    }

    // Metric selector mode: no series needed
    if (config.isMetricSelector === true) {
      return null;
    }

    // New format: metricSeries array
    if (Array.isArray(config.metricSeries) && config.metricSeries.length > 0) {
      if (config.metricSeries.length > 5) return 'metricSeries max 5 items';
      for (const s of config.metricSeries) {
        if (!s.metricCode || !/^[a-z0-9_]+$/i.test(s.metricCode)) return 'each series.metricCode is required and must be alphanumeric';
        if (!['bar', 'line'].includes(s.chartType)) return 'each series.chartType must be "bar" or "line"';
        if (s.barStyle && !['dynamic', 'static'].includes(s.barStyle)) return 'each series.barStyle must be "dynamic" or "static"';
      }
      // Apply defaults for optional fields
      if (!config.subjectType) config.subjectType = 'store';
      if (config.isAggregated === undefined) config.isAggregated = true;
      return null;
    }

    // Legacy format: single metricCode
    if (!config.metricCode || !/^[a-z0-9_]+$/i.test(config.metricCode)) return 'config.metricCode or config.metricSeries is required';
    if (!['bar', 'percent'].includes(config.chartType)) return 'config.chartType must be "bar" or "percent"';
    return null;
  }

  // GET /api/admin/widgets — list all widgets
  app.get('/api/admin/widgets', requireAuth, async (_req, res) => {
    try {
      const config = await readConfig();
      res.json({ widgets: config.widgets || DEFAULT_WIDGETS });
    } catch (err) {
      logger.error('GET /api/admin/widgets error', { error: err.message });
      res.status(500).json({ error: 'Failed to load widgets' });
    }
  });

  // POST /api/admin/widgets — create widget
  app.post('/api/admin/widgets', requireAuth, async (req, res) => {
    try {
      const body = req.body || {};
      if (!body.id || !body.name || !body.type) {
        return res.status(400).json({ error: 'id, name, and type are required' });
      }

      const VALID_TYPES = ['ranking', 'chart'];
      if (!VALID_TYPES.includes(body.type)) {
        return res.status(400).json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` });
      }

      if (body.type === 'ranking') {
        const err = validateRankingConfig(body.config);
        if (err) return res.status(400).json({ error: err });
      }
      if (body.type === 'chart') {
        const err = validateChartConfig(body.config);
        if (err) return res.status(400).json({ error: err });
      }

      const config = await readConfig();
      if (config.widgets.some(w => w.id === body.id)) {
        return res.status(409).json({ error: `Widget with id "${body.id}" already exists` });
      }

      const maxOrder = config.widgets.reduce((max, w) => Math.max(max, w.order ?? 0), 0);

      const widget = {
        id: body.id,
        type: body.type,
        name: body.name,
        enabled: body.enabled !== false,
        order: body.order ?? maxOrder + 100,
        parentId: body.parentId || null,
        config: body.config || {},
      };

      // Ensure lossConfig defaults
      if (widget.type === 'ranking' && !widget.config.lossConfig) {
        widget.config.lossConfig = { mode: 'metric', metricCode: 'revenue_created', formula: '' };
      }

      config.widgets.push(widget);
      await writeConfig(config);

      if (isDbConnected()) {
        try { await writeWidgetToDb(widget); } catch (e) { logger.warn('DB writeWidget failed', { error: e.message }); }
      }

      logger.info('Widget created', { id: widget.id, type: widget.type });
      res.json({ widget });
    } catch (err) {
      logger.error('POST /api/admin/widgets error', { error: err.message });
      res.status(500).json({ error: 'Failed to create widget' });
    }
  });

  // PUT /api/admin/widgets/reorder — batch reorder widgets (MUST be before :id route)
  app.put('/api/admin/widgets/reorder', requireAuth, async (req, res) => {
    try {
      const { ids } = req.body || {};
      if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids array is required' });

      const config = await readConfig();
      for (const widget of config.widgets) {
        const idx = ids.indexOf(widget.id);
        if (idx !== -1) widget.order = (idx + 1) * 100;
      }

      await writeConfig(config);

      if (isDbConnected()) {
        try {
          for (const widget of config.widgets) {
            await query('UPDATE dashboard_widgets SET display_order = $1, updated_at = now() WHERE id = $2', [widget.order, widget.id]);
          }
        } catch (e) { logger.warn('DB reorderWidgets failed', { error: e.message }); }
      }

      logger.info('Widgets reordered', { ids });
      res.json({ ok: true });
    } catch (err) {
      logger.error('PUT /api/admin/widgets/reorder error', { error: err.message });
      res.status(500).json({ error: 'Failed to reorder widgets' });
    }
  });

  // PUT /api/admin/widgets/:id — update widget
  app.put('/api/admin/widgets/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const config = await readConfig();
      const idx = config.widgets.findIndex(w => w.id === id);
      if (idx === -1) return res.status(404).json({ error: `Widget "${id}" not found` });

      const body = req.body || {};
      const existing = config.widgets[idx];

      // Validate config if provided
      const newType = body.type ?? existing.type;
      const newConfig = body.config ?? existing.config;
      if (newType === 'ranking') {
        const err = validateRankingConfig(newConfig);
        if (err) return res.status(400).json({ error: err });
      }
      if (newType === 'chart') {
        const err = validateChartConfig(newConfig);
        if (err) return res.status(400).json({ error: err });
      }

      config.widgets[idx] = {
        ...existing,
        name: body.name ?? existing.name,
        type: body.type ?? existing.type,
        enabled: body.enabled ?? existing.enabled,
        order: body.order ?? existing.order,
        parentId: body.parentId !== undefined ? (body.parentId || null) : (existing.parentId || null),
        config: body.config ?? existing.config,
      };

      await writeConfig(config);

      if (isDbConnected()) {
        try { await writeWidgetToDb(config.widgets[idx]); } catch (e) { logger.warn('DB writeWidget failed', { error: e.message }); }
      }

      logger.info('Widget updated', { id });
      res.json({ widget: config.widgets[idx] });
    } catch (err) {
      logger.error('PUT /api/admin/widgets/:id error', { error: err.message });
      res.status(500).json({ error: 'Failed to update widget' });
    }
  });

  // DELETE /api/admin/widgets/:id — delete widget
  app.delete('/api/admin/widgets/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const config = await readConfig();
      const idx = config.widgets.findIndex(w => w.id === id);
      if (idx === -1) return res.status(404).json({ error: `Widget "${id}" not found` });

      config.widgets.splice(idx, 1);
      await writeConfig(config);

      if (isDbConnected()) {
        try { await query('DELETE FROM dashboard_widgets WHERE id = $1', [id]); } catch (e) { logger.warn('DB deleteWidget failed', { error: e.message }); }
      }

      logger.info('Widget deleted', { id });
      res.json({ ok: true });
    } catch (err) {
      logger.error('DELETE /api/admin/widgets/:id error', { error: err.message });
      res.status(500).json({ error: 'Failed to delete widget' });
    }
  });

  // Backward compat: GET /api/admin/ranking-loss-config — reads from first ranking widget
  app.get('/api/admin/ranking-loss-config', requireAuth, async (_req, res) => {
    try {
      const config = await readConfig();
      const rankingWidget = (config.widgets || []).find(w => w.type === 'ranking');
      const lossConfig = rankingWidget?.config?.lossConfig || { mode: 'metric', metricCode: 'revenue_created', formula: '' };
      res.json(lossConfig);
    } catch (err) {
      logger.error('GET /api/admin/ranking-loss-config error', { error: err.message });
      res.status(500).json({ error: 'Failed to load ranking loss config' });
    }
  });

  // DELETE /api/admin/dashboard-metrics/:id/manual-data — delete a manual data entry
  app.delete('/api/admin/dashboard-metrics/:id/manual-data', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const config = await readConfig();
      const metric = config.metrics.find(m => m.id === id);

      if (!metric) {
        return res.status(404).json({ error: `Metric "${id}" not found` });
      }

      const { period, storeId } = req.body || {};
      if (!period) {
        return res.status(400).json({ error: 'period is required' });
      }

      if (!metric.manualData) metric.manualData = [];

      const initialLen = metric.manualData.length;
      metric.manualData = metric.manualData.filter(
        d => !(d.period === period && (d.storeId || '') === (storeId || ''))
      );

      if (metric.manualData.length === initialLen) {
        return res.status(404).json({ error: 'Manual data entry not found' });
      }

      await writeConfig(config);
      logger.info('Dashboard metric manual data deleted', { id, period, storeId });
      res.json({ ok: true });
    } catch (err) {
      logger.error('DELETE /api/admin/dashboard-metrics/:id/manual-data error', { error: err.message });
      res.status(500).json({ error: 'Failed to delete manual data' });
    }
  });
}

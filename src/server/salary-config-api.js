import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger, { loggerWithUser } from './logger.js';
import { requireAuth } from './requireAuth.js';
import { isDbConnected, query } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Путь к файлу с конфигурациями зарплат
const DATA_DIR = path.resolve(__dirname, '../../data');
const CONFIG_FILE = path.join(DATA_DIR, 'salary-configs.json');

// Validation constants
const KEY_PATTERN = /^[a-zA-Z0-9_-]{1,100}$/;
const FORBIDDEN_KEYS = ['__proto__', 'constructor', 'prototype'];
const MAX_KPI_COUNT = 30;
const MAX_MATRIX_ROWS = 15;
const MAX_MATRIX_COLS = 15;
const MAX_BASE_SALARY = 10_000_000;
const MAX_PLAN = 100_000_000;

/**
 * Block demo users from write operations (disabled in dev)
 */
function requireNonDemo(req, res, next) {
  // TODO: re-enable in production
  next();
}

/**
 * Validate :key route parameter format
 */
function validateKey(key) {
  if (!key || !KEY_PATTERN.test(key) || FORBIDDEN_KEYS.includes(key)) {
    return false;
  }
  return true;
}

/**
 * Validate config payload structure and values
 */
function validateConfig(configData) {
  if (!configData || typeof configData !== 'object') {
    return 'Invalid config data';
  }
  if (!configData.matrix || typeof configData.matrix !== 'object') {
    return 'Missing or invalid matrix';
  }
  if (!Array.isArray(configData.kpis)) {
    return 'Missing or invalid kpis';
  }
  if (typeof configData.baseSalary !== 'number' || configData.baseSalary < 0 || configData.baseSalary > MAX_BASE_SALARY) {
    return 'Invalid baseSalary';
  }
  if (configData.personalPlan !== undefined && (typeof configData.personalPlan !== 'number' || configData.personalPlan < 0 || configData.personalPlan > MAX_PLAN)) {
    return 'Invalid personalPlan';
  }
  if (configData.clubPlan !== undefined && (typeof configData.clubPlan !== 'number' || configData.clubPlan < 0 || configData.clubPlan > MAX_PLAN)) {
    return 'Invalid clubPlan';
  }
  // Matrix size limits
  const matrixRows = Object.keys(configData.matrix);
  if (matrixRows.length > MAX_MATRIX_ROWS) {
    return `Matrix exceeds ${MAX_MATRIX_ROWS} rows`;
  }
  for (const row of matrixRows) {
    const cols = configData.matrix[row];
    if (!cols || typeof cols !== 'object') {
      return 'Invalid matrix row';
    }
    if (Object.keys(cols).length > MAX_MATRIX_COLS) {
      return `Matrix row exceeds ${MAX_MATRIX_COLS} columns`;
    }
    for (const val of Object.values(cols)) {
      if (typeof val !== 'number' || val < 0 || val > 100) {
        return 'Matrix values must be numbers between 0 and 100';
      }
    }
  }
  // KPI count limit
  if (configData.kpis.length > MAX_KPI_COUNT) {
    return `KPIs exceed limit of ${MAX_KPI_COUNT}`;
  }
  // Axis labels (optional strings, max 100 chars)
  if (configData.managerAxisLabel !== undefined) {
    if (typeof configData.managerAxisLabel !== 'string' || configData.managerAxisLabel.length > 100) {
      return 'Invalid managerAxisLabel';
    }
  }
  if (configData.clubAxisLabel !== undefined) {
    if (typeof configData.clubAxisLabel !== 'string' || configData.clubAxisLabel.length > 100) {
      return 'Invalid clubAxisLabel';
    }
  }
  // Level definitions (optional arrays, min 1 element)
  if (configData.managerLevels !== undefined) {
    if (!Array.isArray(configData.managerLevels) || configData.managerLevels.length < 1) {
      return 'managerLevels must have at least 1 element';
    }
  }
  if (configData.clubLevels !== undefined) {
    if (!Array.isArray(configData.clubLevels) || configData.clubLevels.length < 1) {
      return 'clubLevels must have at least 1 element';
    }
  }
  // Linked metric IDs (optional strings)
  if (configData.managerLinkedMetricId !== undefined && configData.managerLinkedMetricId !== null) {
    if (typeof configData.managerLinkedMetricId !== 'string' || configData.managerLinkedMetricId.length > 100) {
      return 'Invalid managerLinkedMetricId';
    }
  }
  if (configData.clubLinkedMetricId !== undefined && configData.clubLinkedMetricId !== null) {
    if (typeof configData.clubLinkedMetricId !== 'string' || configData.clubLinkedMetricId.length > 100) {
      return 'Invalid clubLinkedMetricId';
    }
  }
  return null;
}

/**
 * Чтение конфигураций из JSON файла
 */
function readConfigsFromJson() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    logger.error('Failed to read salary configs', { error: err.message });
  }
  return {};
}

async function readConfigsFromDb() {
  const result = await query('SELECT * FROM salary_configs ORDER BY id');
  const configs = {};
  for (const row of result.rows) {
    configs[row.id] = {
      baseSalary: Number(row.base_salary),
      personalPlan: row.personal_plan != null ? Number(row.personal_plan) : undefined,
      clubPlan: row.club_plan != null ? Number(row.club_plan) : undefined,
      matrix: row.matrix,
      kpis: row.kpis,
      clubLevels: row.club_levels,
      managerLevels: row.manager_levels,
      managerAxisLabel: row.metadata?.managerAxisLabel,
      clubAxisLabel: row.metadata?.clubAxisLabel,
    };
  }
  return configs;
}

function readConfigs() {
  if (isDbConnected()) {
    // Note: this is sync in current usage — we return a promise-like approach
    // For backward compat, we fall through to JSON sync read
    // DB read is async; callers of readConfigs are sync → keep JSON as primary for now
    // DB sync will be done via write path
  }
  return readConfigsFromJson();
}

/**
 * Запись конфигураций в JSON файл (atomic via temp file)
 */
function writeConfigs(configs) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tmpFile = CONFIG_FILE + '.tmp';
    fs.writeFileSync(tmpFile, JSON.stringify(configs, null, 2), 'utf-8');
    fs.renameSync(tmpFile, CONFIG_FILE);

    // Async sync to DB (fire-and-forget)
    if (isDbConnected()) {
      (async () => {
        try {
          for (const [key, cfg] of Object.entries(configs)) {
            if (!cfg || typeof cfg !== 'object' || !cfg.matrix) continue;
            const parts = key.split('_');
            const branchId = parts[0] || key;
            const positionId = parts.slice(1).join('_') || 'default';
            await query(`
              INSERT INTO salary_configs (id, branch_id, position_id, base_salary, personal_plan, club_plan, matrix, kpis, club_levels, manager_levels, metadata)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
              ON CONFLICT (id) DO UPDATE SET
                matrix = EXCLUDED.matrix, kpis = EXCLUDED.kpis,
                base_salary = EXCLUDED.base_salary, updated_at = now()
            `, [key, branchId, positionId, cfg.baseSalary ?? 0, cfg.personalPlan ?? null, cfg.clubPlan ?? null,
                JSON.stringify(cfg.matrix), JSON.stringify(cfg.kpis || []),
                JSON.stringify(cfg.clubLevels || []), JSON.stringify(cfg.managerLevels || []),
                JSON.stringify({ managerAxisLabel: cfg.managerAxisLabel, clubAxisLabel: cfg.clubAxisLabel })]);
          }
        } catch (err) {
          logger.warn('DB salary config sync failed', { error: err.message });
        }
      })();
    }

    return true;
  } catch (err) {
    logger.error('Failed to write salary configs', { error: err.message });
    return false;
  }
}

/**
 * Регистрация API эндпоинтов для управления конфигурациями зарплат
 */
export function setupSalaryConfigRoutes(app) {
  /**
   * GET /api/salary/configs
   * Получить все конфигурации или конкретную по ?branch=X&position=Y
   */
  app.get('/api/salary/configs', requireAuth, async (req, res) => {
    try {
      const { branch, position } = req.query;
      const configs = readConfigs();

      if (branch && position) {
        const key = `${branch}_${position}`;
        const config = configs[key] || null;
        return res.json({ ok: true, config });
      }

      return res.json({ ok: true, configs });
    } catch (error) {
      loggerWithUser.error(req, 'Error in GET /api/salary/configs', { error: error.message });
      return res.status(500).json({ ok: false, error: 'Internal server error' });
    }
  });

  /**
   * PUT /api/salary/configs/:key
   * Обновить конфигурацию для конкретного филиала + должности
   * key = branchId_positionId (напр. moscow_club_manager)
   */
  app.put('/api/salary/configs/:key', requireAuth, requireNonDemo, async (req, res) => {
    try {
      const { key } = req.params;

      if (!validateKey(key)) {
        return res.status(400).json({ ok: false, error: 'Invalid key format' });
      }

      const configData = req.body;
      const validationError = validateConfig(configData);
      if (validationError) {
        return res.status(400).json({ ok: false, error: validationError });
      }

      const configs = readConfigs();
      configs[key] = configData;

      if (!writeConfigs(configs)) {
        return res.status(500).json({ ok: false, error: 'Failed to save config' });
      }

      loggerWithUser.info(req, `Salary config updated: ${key}`, {
        baseSalary: configData.baseSalary,
        personalPlan: configData.personalPlan,
        kpiCount: configData.kpis?.length,
      });

      return res.json({ ok: true });
    } catch (error) {
      loggerWithUser.error(req, 'Error in PUT /api/salary/configs/:key', { error: error.message });
      return res.status(500).json({ ok: false, error: 'Internal server error' });
    }
  });

  /**
   * DELETE /api/salary/configs/:key
   * Удалить кастомную конфигурацию (вернуться к дефолту)
   */
  app.delete('/api/salary/configs/:key', requireAuth, requireNonDemo, async (req, res) => {
    try {
      const { key } = req.params;

      if (!validateKey(key)) {
        return res.status(400).json({ ok: false, error: 'Invalid key format' });
      }

      const configs = readConfigs();

      if (configs[key]) {
        delete configs[key];
        writeConfigs(configs);
        loggerWithUser.info(req, `Salary config deleted: ${key}`);
      }

      return res.json({ ok: true });
    } catch (error) {
      loggerWithUser.error(req, 'Error in DELETE /api/salary/configs/:key', { error: error.message });
      return res.status(500).json({ ok: false, error: 'Internal server error' });
    }
  });
}

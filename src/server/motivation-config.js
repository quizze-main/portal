import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js';
import { requireAuth } from './requireAuth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../../data');
const CONFIG_PATH = path.join(DATA_DIR, 'motivation-config.json');

const CLUB_LEVELS = ['<95%', '100%', '110%>'];
const MANAGER_LEVELS = ['<100%', '100%', '110%', '120%', '130%'];

// --- Helpers ---

async function readConfig() {
  try {
    if (!existsSync(CONFIG_PATH)) return { configs: {} };
    const raw = await readFile(CONFIG_PATH, 'utf-8');
    const data = JSON.parse(raw);
    return { configs: data.configs || {} };
  } catch {
    return { configs: {} };
  }
}

async function writeConfig(config) {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

// --- Validation ---

function validateMatrix(matrix) {
  if (!matrix || typeof matrix !== 'object') return 'matrix is required';
  for (const cl of CLUB_LEVELS) {
    if (!matrix[cl] || typeof matrix[cl] !== 'object') {
      return `matrix is missing club level "${cl}"`;
    }
    for (const ml of MANAGER_LEVELS) {
      const val = matrix[cl][ml];
      if (typeof val !== 'number' || !isFinite(val)) {
        return `matrix[${cl}][${ml}] must be a finite number, got ${val}`;
      }
    }
  }
  return null;
}

function validateKpis(kpis) {
  if (!Array.isArray(kpis)) return 'kpis must be an array';
  for (let i = 0; i < kpis.length; i++) {
    const kpi = kpis[i];
    if (!kpi.id || typeof kpi.id !== 'string') return `kpis[${i}].id is required`;
    if (!kpi.label || typeof kpi.label !== 'string') return `kpis[${i}].label is required`;
    if (kpi.type === 'multiplier') {
      if (typeof kpi.multiplierRate !== 'number' || !isFinite(kpi.multiplierRate)) {
        return `kpis[${i}].multiplierRate must be a finite number for multiplier type`;
      }
    } else {
      if (!Array.isArray(kpi.tiers)) return `kpis[${i}].tiers must be an array`;
      for (let j = 0; j < kpi.tiers.length; j++) {
        const t = kpi.tiers[j];
        if (typeof t.range !== 'string') return `kpis[${i}].tiers[${j}].range must be a string`;
        if (typeof t.bonus !== 'number' || !isFinite(t.bonus)) return `kpis[${i}].tiers[${j}].bonus must be a number`;
        if (typeof t.minPercent !== 'number') return `kpis[${i}].tiers[${j}].minPercent must be a number`;
        if (typeof t.maxPercent !== 'number') return `kpis[${i}].tiers[${j}].maxPercent must be a number`;
      }
    }
  }
  return null;
}

function validateConfig(body) {
  if (!body.branchId || typeof body.branchId !== 'string') return 'branchId is required';
  if (!body.positionId || typeof body.positionId !== 'string') return 'positionId is required';
  if (body.trackerStoreId !== undefined && body.trackerStoreId !== null && body.trackerStoreId !== '' && typeof body.trackerStoreId !== 'string') {
    return 'trackerStoreId must be a string';
  }
  if (typeof body.baseSalary !== 'number' || body.baseSalary <= 0) return 'baseSalary must be a positive number';
  if (typeof body.personalPlan !== 'number' || body.personalPlan <= 0) return 'personalPlan must be a positive number';
  if (typeof body.clubPlan !== 'number' || body.clubPlan <= 0) return 'clubPlan must be a positive number';

  const matrixErr = validateMatrix(body.matrix);
  if (matrixErr) return matrixErr;

  const kpiErr = validateKpis(body.kpis);
  if (kpiErr) return kpiErr;

  return null;
}

// --- Routes ---

export function setupMotivationConfigRoutes(app) {
  // GET all configs
  app.get('/api/admin/motivation-configs', requireAuth, async (_req, res) => {
    try {
      const data = await readConfig();
      res.json({ configs: data.configs });
    } catch (err) {
      try { logger.error('GET /api/admin/motivation-configs error', { error: err }); } catch { /* safety */ }
      res.status(500).json({ error: 'Failed to load motivation configs', details: err.message });
    }
  });

  // CREATE config
  app.post('/api/admin/motivation-configs', requireAuth, async (req, res) => {
    try {
      const body = req.body || {};

      const validationErr = validateConfig(body);
      if (validationErr) {
        return res.status(400).json({ error: validationErr });
      }

      const key = `${body.branchId}_${body.positionId}`;
      const data = await readConfig();

      if (data.configs[key]) {
        return res.status(409).json({ error: `Config "${key}" already exists` });
      }

      const config = {
        branchId: body.branchId,
        positionId: body.positionId,
        trackerStoreId: body.trackerStoreId || '',
        baseSalary: body.baseSalary,
        personalPlan: body.personalPlan,
        clubPlan: body.clubPlan,
        matrix: body.matrix,
        kpis: body.kpis,
      };

      data.configs[key] = config;
      await writeConfig(data);

      try { logger.info('Motivation config created', { key }); } catch { /* safety */ }
      res.json({ config, key });
    } catch (err) {
      try { logger.error('POST /api/admin/motivation-configs error', { error: err }); } catch { /* safety */ }
      res.status(500).json({ error: 'Failed to create motivation config', details: err.message });
    }
  });

  // UPDATE config
  app.put('/api/admin/motivation-configs/:key', requireAuth, async (req, res) => {
    try {
      const { key } = req.params;
      const body = req.body || {};
      const data = await readConfig();

      if (!data.configs[key]) {
        return res.status(404).json({ error: `Config "${key}" not found` });
      }

      const validationErr = validateConfig(body);
      if (validationErr) {
        return res.status(400).json({ error: validationErr });
      }

      const config = {
        branchId: body.branchId,
        positionId: body.positionId,
        trackerStoreId: body.trackerStoreId || '',
        baseSalary: body.baseSalary,
        personalPlan: body.personalPlan,
        clubPlan: body.clubPlan,
        matrix: body.matrix,
        kpis: body.kpis,
      };

      data.configs[key] = config;
      await writeConfig(data);

      try { logger.info('Motivation config updated', { key }); } catch { /* safety */ }
      res.json({ config, key });
    } catch (err) {
      try { logger.error('PUT /api/admin/motivation-configs error', { error: err }); } catch { /* safety */ }
      res.status(500).json({ error: 'Failed to update motivation config', details: err.message });
    }
  });

  // DELETE config
  app.delete('/api/admin/motivation-configs/:key', requireAuth, async (req, res) => {
    try {
      const { key } = req.params;
      const data = await readConfig();

      if (!data.configs[key]) {
        return res.status(404).json({ error: `Config "${key}" not found` });
      }

      delete data.configs[key];
      await writeConfig(data);

      try { logger.info('Motivation config deleted', { key }); } catch { /* safety */ }
      res.json({ ok: true });
    } catch (err) {
      try { logger.error('DELETE /api/admin/motivation-configs error', { error: err }); } catch { /* safety */ }
      res.status(500).json({ error: 'Failed to delete motivation config', details: err.message });
    }
  });
}

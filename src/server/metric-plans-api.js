import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import logger from './logger.js';
import { requireAuth } from './requireAuth.js';
import { isDbConnected, query } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../../data');
const PLANS_PATH = path.join(DATA_DIR, 'metric-plans.json');

// ─── Storage helpers (dual-read: DB + JSON fallback) ───

async function readPlansFromJson() {
  try {
    if (!existsSync(PLANS_PATH)) return { plans: [] };
    const raw = await readFile(PLANS_PATH, 'utf-8');
    const data = JSON.parse(raw);
    return { plans: Array.isArray(data.plans) ? data.plans : [] };
  } catch {
    return { plans: [] };
  }
}

async function readPlansFromDb() {
  const { rows } = await query(`
    SELECT id, metric_id AS "metricId", scope, scope_id AS "scopeId",
      period, plan_value AS "planValue",
      created_at AS "createdAt", updated_at AS "updatedAt", created_by AS "createdBy"
    FROM metric_plans ORDER BY metric_id, period
  `);
  return { plans: rows.map(r => ({ ...r, planValue: Number(r.planValue) })) };
}

export async function readPlans() {
  if (isDbConnected()) {
    try {
      return await readPlansFromDb();
    } catch (err) {
      logger.warn('DB readPlans failed, falling back to JSON', { error: err.message });
    }
  }
  return readPlansFromJson();
}

async function writePlans(data) {
  // Always write JSON (backward compat)
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
  await writeFile(PLANS_PATH, JSON.stringify(data, null, 2), 'utf-8');

  // Also sync to DB
  if (isDbConnected()) {
    try {
      for (const p of data.plans || []) {
        await query(`
          INSERT INTO metric_plans (id, metric_id, scope, scope_id, period, plan_value, created_at, updated_at, created_by)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (metric_id, scope, scope_id, period) DO UPDATE SET
            plan_value = EXCLUDED.plan_value, updated_at = now()
        `, [p.id, p.metricId, p.scope, p.scopeId, p.period, p.planValue, p.createdAt || new Date(), p.updatedAt || new Date(), p.createdBy || null]);
      }
    } catch (err) {
      logger.warn('DB writePlans failed', { error: err.message });
    }
  }
}

// ─── Plan Resolver ───

/**
 * Resolve plan value for a metric with hierarchical scope fallback.
 *
 * Lookup order:
 *   1. employee + employeeId + exact period
 *   2. branch + storeId + exact period
 *   3. network + '*' + exact period
 *   4. Same hierarchy but with quarter → /3, year → /12
 *   5. null (not found → caller uses manualData fallback)
 *
 * @param {string} metricId
 * @param {string|null} storeId - branch store ID
 * @param {string|null} employeeId
 * @param {string} period - YYYY-MM format
 * @param {Array} allPlans - all MetricPlan entries
 * @returns {number|null}
 */
export function resolvePlan(metricId, storeId, employeeId, period, allPlans) {
  if (!allPlans || allPlans.length === 0) return null;

  // Filter plans for this metric
  const metricPlans = allPlans.filter(p => p.metricId === metricId);
  if (metricPlans.length === 0) return null;

  // Extract year and month from YYYY-MM
  const [year, month] = period.split('-').map(Number);
  const quarter = Math.ceil(month / 3);
  const quarterKey = `${year}-Q${quarter}`;
  const yearKey = `${year}`;

  // Build lookup candidates in priority order
  const candidates = [];

  // 1. Employee scope (exact period → quarter → year)
  if (employeeId) {
    candidates.push({ scope: 'employee', scopeId: employeeId, period, divisor: 1 });
    candidates.push({ scope: 'employee', scopeId: employeeId, period: quarterKey, divisor: 3 });
    candidates.push({ scope: 'employee', scopeId: employeeId, period: yearKey, divisor: 12 });
  }

  // 2. Branch scope
  if (storeId) {
    candidates.push({ scope: 'branch', scopeId: storeId, period, divisor: 1 });
    candidates.push({ scope: 'branch', scopeId: storeId, period: quarterKey, divisor: 3 });
    candidates.push({ scope: 'branch', scopeId: storeId, period: yearKey, divisor: 12 });
  }

  // 3. Network scope
  candidates.push({ scope: 'network', scopeId: '*', period, divisor: 1 });
  candidates.push({ scope: 'network', scopeId: '*', period: quarterKey, divisor: 3 });
  candidates.push({ scope: 'network', scopeId: '*', period: yearKey, divisor: 12 });

  for (const c of candidates) {
    const found = metricPlans.find(
      p => p.scope === c.scope && p.scopeId === c.scopeId && p.period === c.period
    );
    if (found) {
      return found.planValue / c.divisor;
    }
  }

  return null;
}

// ─── Routes ───

export function setupMetricPlansRoutes(app) {
  // GET /api/admin/metric-plans — list all plans (optional ?metricId filter)
  app.get('/api/admin/metric-plans', requireAuth, async (req, res) => {
    try {
      const { plans } = await readPlans();
      const { metricId } = req.query;
      const filtered = metricId
        ? plans.filter(p => p.metricId === metricId)
        : plans;
      res.json({ plans: filtered });
    } catch (err) {
      logger.error('metric-plans GET error', { error: err.message });
      res.status(500).json({ error: 'Failed to read plans' });
    }
  });

  // GET /api/admin/metric-plans/matrix — plans for a metric+period (matrix UI)
  app.get('/api/admin/metric-plans/matrix', requireAuth, async (req, res) => {
    try {
      const { metricId, period } = req.query;
      if (!metricId) return res.status(400).json({ error: 'metricId required' });
      const { plans } = await readPlans();
      const filtered = plans.filter(p =>
        p.metricId === metricId && (!period || p.period === period)
      );
      res.json({ plans: filtered });
    } catch (err) {
      logger.error('metric-plans matrix error', { error: err.message });
      res.status(500).json({ error: 'Failed to read plans' });
    }
  });

  // POST /api/admin/metric-plans — create a plan
  app.post('/api/admin/metric-plans', requireAuth, async (req, res) => {
    try {
      const { metricId, scope, scopeId, period, planValue } = req.body;
      if (!metricId || !scope || !scopeId || !period || planValue == null) {
        return res.status(400).json({ error: 'metricId, scope, scopeId, period, planValue required' });
      }
      if (!['network', 'branch', 'employee'].includes(scope)) {
        return res.status(400).json({ error: 'scope must be network|branch|employee' });
      }

      const data = await readPlans();
      const now = new Date().toISOString();

      // Upsert: if plan with same metricId+scope+scopeId+period exists, update it
      const existingIdx = data.plans.findIndex(
        p => p.metricId === metricId && p.scope === scope && p.scopeId === scopeId && p.period === period
      );

      let plan;
      if (existingIdx >= 0) {
        data.plans[existingIdx].planValue = Number(planValue);
        data.plans[existingIdx].updatedAt = now;
        plan = data.plans[existingIdx];
      } else {
        plan = {
          id: crypto.randomUUID(),
          metricId,
          scope,
          scopeId,
          period,
          planValue: Number(planValue),
          createdAt: now,
          updatedAt: now,
        };
        data.plans.push(plan);
      }

      await writePlans(data);
      res.status(201).json({ plan });
    } catch (err) {
      logger.error('metric-plans POST error', { error: err.message });
      res.status(500).json({ error: 'Failed to create plan' });
    }
  });

  // POST /api/admin/metric-plans/bulk — bulk create/upsert (max 100)
  app.post('/api/admin/metric-plans/bulk', requireAuth, async (req, res) => {
    try {
      const { entries } = req.body;
      if (!Array.isArray(entries) || entries.length === 0) {
        return res.status(400).json({ error: 'entries array required' });
      }
      if (entries.length > 100) {
        return res.status(400).json({ error: 'Max 100 entries per request' });
      }

      const data = await readPlans();
      const now = new Date().toISOString();
      let created = 0;
      let updated = 0;

      for (const entry of entries) {
        const { metricId, scope, scopeId, period, planValue } = entry;
        if (!metricId || !scope || !scopeId || !period || planValue == null) continue;

        const existingIdx = data.plans.findIndex(
          p => p.metricId === metricId && p.scope === scope && p.scopeId === scopeId && p.period === period
        );

        if (existingIdx >= 0) {
          data.plans[existingIdx].planValue = Number(planValue);
          data.plans[existingIdx].updatedAt = now;
          updated++;
        } else {
          data.plans.push({
            id: crypto.randomUUID(),
            metricId,
            scope,
            scopeId,
            period,
            planValue: Number(planValue),
            createdAt: now,
            updatedAt: now,
          });
          created++;
        }
      }

      await writePlans(data);
      res.json({ created, updated });
    } catch (err) {
      logger.error('metric-plans bulk error', { error: err.message });
      res.status(500).json({ error: 'Failed to bulk create plans' });
    }
  });

  // PUT /api/admin/metric-plans/:id — update a plan
  app.put('/api/admin/metric-plans/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const data = await readPlans();
      const idx = data.plans.findIndex(p => p.id === id);
      if (idx < 0) return res.status(404).json({ error: 'Plan not found' });

      const { scope, scopeId, period, planValue } = req.body;
      if (scope) data.plans[idx].scope = scope;
      if (scopeId !== undefined) data.plans[idx].scopeId = scopeId;
      if (period) data.plans[idx].period = period;
      if (planValue != null) data.plans[idx].planValue = Number(planValue);
      data.plans[idx].updatedAt = new Date().toISOString();

      await writePlans(data);
      res.json({ plan: data.plans[idx] });
    } catch (err) {
      logger.error('metric-plans PUT error', { error: err.message });
      res.status(500).json({ error: 'Failed to update plan' });
    }
  });

  // DELETE /api/admin/metric-plans/:id — delete a plan
  app.delete('/api/admin/metric-plans/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const data = await readPlans();
      const idx = data.plans.findIndex(p => p.id === id);
      if (idx < 0) return res.status(404).json({ error: 'Plan not found' });

      data.plans.splice(idx, 1);
      await writePlans(data);
      res.json({ ok: true });
    } catch (err) {
      logger.error('metric-plans DELETE error', { error: err.message });
      res.status(500).json({ error: 'Failed to delete plan' });
    }
  });
}

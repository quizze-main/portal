const env = process.env || {};

/**
 * Metadata and health-check functions for all external integrations.
 */

const integrations = [
  {
    id: 'frappe',
    name: 'Frappe ERP',
    category: 'core',
    envVars: ['FRAPPE_BASE_URL', 'FRAPPE_API_KEY', 'FRAPPE_API_SECRET'],
    check: async () => {
      const url = env.FRAPPE_BASE_URL;
      const key = env.FRAPPE_API_KEY;
      const secret = env.FRAPPE_API_SECRET;
      if (!url || !key || !secret) return { ok: false, message: 'Missing env vars' };
      const start = Date.now();
      const res = await fetch(`${url}/api/method/ping`, {
        headers: { Authorization: `token ${key}:${secret}` },
        signal: AbortSignal.timeout(5000),
      });
      const latency = Date.now() - start;
      if (!res.ok) return { ok: false, message: `HTTP ${res.status}`, latency };
      return { ok: true, message: 'OK', latency };
    },
  },
  {
    id: 'outline',
    name: 'Outline Wiki',
    category: 'core',
    envVars: ['OUTLINE_BASE_URL', 'OUTLINE_API_KEY'],
    check: async () => {
      const url = env.OUTLINE_BASE_URL;
      const key = env.OUTLINE_API_KEY;
      if (!url || !key) return { ok: false, message: 'Missing env vars' };
      const start = Date.now();
      const res = await fetch(`${url}/api/auth.info`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: '{}',
        signal: AbortSignal.timeout(5000),
      });
      const latency = Date.now() - start;
      if (!res.ok) return { ok: false, message: `HTTP ${res.status}`, latency };
      return { ok: true, message: 'OK', latency };
    },
  },
  {
    id: 'tracker',
    name: 'Loovis Tracker',
    category: 'external',
    envVars: ['TRACKER_API_URL', 'TRACKER_API_TOKEN'],
    check: async () => {
      const url = env.TRACKER_API_URL;
      const token = env.TRACKER_API_TOKEN;
      if (!url || !token) return { ok: false, message: 'Missing env vars' };
      const start = Date.now();
      const res = await fetch(`${url}/api/v1/portal/analytics/dashboards`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(5000),
      });
      const latency = Date.now() - start;
      // 422 = server is alive but rejects request without required params
      if (res.status === 422) return { ok: true, message: 'OK (422 - alive)', latency };
      if (!res.ok) return { ok: false, message: `HTTP ${res.status}`, latency };
      return { ok: true, message: 'OK', latency };
    },
  },
  {
    id: 'telegram',
    name: 'Telegram Bot',
    category: 'external',
    envVars: ['TELEGRAM_BOT_TOKEN'],
    check: async () => {
      const token = env.TELEGRAM_BOT_TOKEN;
      if (!token) return { ok: false, message: 'Missing env vars' };
      const start = Date.now();
      const res = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
        signal: AbortSignal.timeout(5000),
      });
      const latency = Date.now() - start;
      if (!res.ok) return { ok: false, message: `HTTP ${res.status}`, latency };
      return { ok: true, message: 'OK', latency };
    },
  },
  {
    id: 'yandex_tracker',
    name: 'Yandex Tracker',
    category: 'external',
    envVars: ['YANDEX_TREKER_AUTH_TOKEN', 'X_ORG_ID'],
    check: async () => {
      const token = env.YANDEX_TREKER_AUTH_TOKEN;
      const orgId = env.X_ORG_ID;
      if (!token || !orgId) return { ok: false, message: 'Missing env vars' };
      const start = Date.now();
      const res = await fetch('https://api.tracker.yandex.net/v2/myself', {
        headers: { Authorization: `Bearer ${token}`, 'X-Org-ID': orgId },
        signal: AbortSignal.timeout(5000),
      });
      const latency = Date.now() - start;
      if (!res.ok) return { ok: false, message: `HTTP ${res.status}`, latency };
      return { ok: true, message: 'OK', latency };
    },
  },
  {
    id: 'opensearch',
    name: 'OpenSearch',
    category: 'logging',
    envVars: ['OPENSEARCH_URL', 'OPENSEARCH_USERNAME', 'OPENSEARCH_PASSWORD'],
    check: async () => {
      const url = env.OPENSEARCH_URL;
      const user = env.OPENSEARCH_USERNAME;
      const pass = env.OPENSEARCH_PASSWORD;
      if (!url || !user || !pass) return { ok: false, message: 'Missing env vars' };
      return { ok: true, message: 'Env configured (no live check)' };
    },
  },
  {
    id: 'victoria_logs',
    name: 'VictoriaLogs',
    category: 'logging',
    envVars: ['VICTORIA_LOGS_URL'],
    check: async () => {
      const url = env.VICTORIA_LOGS_URL;
      if (!url) return { ok: false, message: 'Missing env vars' };
      const start = Date.now();
      const res = await fetch(`${url}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      const latency = Date.now() - start;
      if (!res.ok) return { ok: false, message: `HTTP ${res.status}`, latency };
      return { ok: true, message: 'OK', latency };
    },
  },
  {
    id: 'sms_gateway',
    name: 'SMS Gateway',
    category: 'dev',
    envVars: ['SMS_HTTP_URL'],
    check: async () => {
      const url = env.SMS_HTTP_URL;
      if (!url) return { ok: false, message: 'Missing env vars' };
      return { ok: true, message: 'Env configured (no live check)' };
    },
  },
  {
    id: 'ngrok',
    name: 'ngrok',
    category: 'dev',
    envVars: ['NODE_ENV', 'SHOW_DEV_TO_PUBLIC'],
    check: async () => {
      const isLocal = env.NODE_ENV === 'local';
      const showDev = env.SHOW_DEV_TO_PUBLIC === 'true';
      if (!isLocal && !showDev) return { ok: false, message: 'Not in local/dev mode' };
      return { ok: true, message: `NODE_ENV=${env.NODE_ENV || '(unset)'}, SHOW_DEV_TO_PUBLIC=${env.SHOW_DEV_TO_PUBLIC || '(unset)'}` };
    },
  },
  {
    id: 'org_database',
    name: 'Org Structure DB',
    category: 'core',
    envVars: ['DATABASE_URL', 'ORG_DATA_SOURCE'],
    check: async () => {
      const dbUrl = env.DATABASE_URL;
      const source = env.ORG_DATA_SOURCE || 'frappe';
      if (!dbUrl) return { ok: false, message: 'DATABASE_URL not configured' };
      if (source === 'frappe') return { ok: true, message: `Mode: frappe (PG not primary)` };
      try {
        const { default: pg } = await import('pg');
        const pool = new pg.Pool({ connectionString: dbUrl, max: 1, connectionTimeoutMillis: 3000 });
        const start = Date.now();
        const empResult = await pool.query(`SELECT COUNT(*) AS cnt FROM dim_employees WHERE status = 'Active'`);
        const roleResult = await pool.query(`SELECT COUNT(*) AS cnt FROM rbac_employee_roles`);
        const deptResult = await pool.query(`SELECT COUNT(*) AS cnt FROM org_departments WHERE enabled = true`);
        const latency = Date.now() - start;
        await pool.end();
        const emps = parseInt(empResult.rows[0]?.cnt || 0);
        const roles = parseInt(roleResult.rows[0]?.cnt || 0);
        const depts = parseInt(deptResult.rows[0]?.cnt || 0);
        if (emps === 0) return { ok: false, message: `No active employees in DB`, latency };
        return { ok: true, message: `Mode: ${source} | ${emps} employees, ${roles} roles, ${depts} depts`, latency };
      } catch (e) {
        return { ok: false, message: `DB error: ${e.message}` };
      }
    },
  },
];

/** Build a map id → check function */
export const healthCheckById = Object.fromEntries(
  integrations.map((i) => [i.id, i.check])
);

/** Return metadata for all integrations (no secrets, no checks) */
export function getIntegrationsMetadata() {
  return integrations.map(({ id, name, category, envVars }) => ({
    id,
    name,
    category,
    envVars,
  }));
}

// ─── Dynamic integrations (data sources) ───

let _dynamicIntegrations = [];

/** Register dynamic integrations (e.g. from data-sources.js) */
export function setDynamicIntegrations(items) {
  _dynamicIntegrations = items || [];
}

/** Return all integrations: static + dynamic */
export function getAllIntegrations() {
  return [...integrations, ..._dynamicIntegrations];
}

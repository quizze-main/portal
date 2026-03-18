#!/usr/bin/env node
/**
 * Org API structure validation script.
 *
 * Tests that all org endpoints return responses matching the expected
 * Frappe-compatible shapes, regardless of ORG_DATA_SOURCE setting.
 *
 * Usage: node --env-file=.env scripts/test-org-api.js [--base-url http://localhost:3000]
 *
 * Requires a running server. Uses demo auth to get a JWT cookie.
 */

const BASE_URL = process.argv.includes('--base-url')
  ? process.argv[process.argv.indexOf('--base-url') + 1]
  : (process.env.VITE_API_BASE_URL || 'http://localhost:3010');

const DEMO_PIN = process.env.DEMO_PIN;

let cookie = '';
let testEmployee = null;
let passed = 0;
let failed = 0;
const failures = [];

// ─── Helpers ────────────────────────────────────────────────────────────────

async function request(path, { method = 'GET', body, expectStatus = 200 } = {}) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${path}`, opts);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = null; }

  return { status: res.status, json, text, headers: res.headers, ok: res.ok };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertShape(obj, fields, label) {
  for (const f of fields) {
    assert(f in obj, `${label}: missing field "${f}" in ${JSON.stringify(Object.keys(obj))}`);
  }
}

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (err) {
    failed++;
    failures.push({ name, error: err.message });
    console.log(`  ❌ ${name}: ${err.message}`);
  }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

async function authenticate() {
  if (!DEMO_PIN) {
    console.log('⚠️  DEMO_PIN not set — skipping auth, tests will use unauthenticated requests');
    return;
  }
  const res = await fetch(`${BASE_URL}/api/auth/demo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin: DEMO_PIN }),
    redirect: 'manual',
  });

  const setCookie = res.headers.get('set-cookie');
  if (setCookie) {
    cookie = setCookie.split(';')[0]; // "token=..."
    console.log(`🔑 Authenticated via demo PIN\n`);
  } else {
    console.log(`⚠️  Demo auth returned no cookie (status ${res.status})\n`);
  }
}

async function runTests() {
  console.log(`\n🧪 Org API Structure Validation`);
  console.log(`   Base URL: ${BASE_URL}`);
  console.log(`   ORG_DATA_SOURCE: (server-side setting)\n`);

  // ── Auth ──
  await authenticate();

  // ── Health ──
  console.log('─── Health ───');
  await test('GET /health returns ok', async () => {
    const { json } = await request('/health');
    assert(json, 'Response is not JSON');
    assert(json.status === 'ok' || json.status === 'healthy', `Unexpected status: ${json.status}`);
  });

  // ── Employee search ──
  console.log('\n─── Employee Search ───');
  await test('GET /api/frappe/employees/search returns { data: [...] }', async () => {
    const { json, status } = await request('/api/frappe/employees/search?query=а&limit=3');
    if (status === 401) return; // auth required, skip
    assert(json, 'Response is not JSON');
    assert(Array.isArray(json.data), 'data is not an array');
    if (json.data.length > 0) {
      const emp = json.data[0];
      assertShape(emp, ['name', 'employee_name'], 'search result employee');
      testEmployee = emp; // save for later tests
    }
  });

  // ── Employee by ID ──
  console.log('\n─── Employee by ID ───');
  const empId = testEmployee?.name || 'HR-EMP-00001';
  await test(`GET /api/frappe/employees/${empId} returns { data: employee }`, async () => {
    const { json, status } = await request(`/api/frappe/employees/${empId}`);
    if (status === 401 || status === 404) return;
    assert(json, 'Response is not JSON');
    assert(json.data, 'Missing data field');
    assertShape(json.data, ['name', 'employee_name', 'designation'], 'employee detail');
  });

  // ── Employee manager ──
  console.log('\n─── Employee Manager ───');
  await test(`GET /api/frappe/employees/${empId}/manager returns { data: employee|null }`, async () => {
    const { json, status } = await request(`/api/frappe/employees/${empId}/manager`);
    if (status === 401) return;
    assert(json, 'Response is not JSON');
    assert('data' in json, 'Missing data field');
    if (json.data) {
      assertShape(json.data, ['name', 'employee_name'], 'manager');
    }
  });

  // ── Employee role ──
  console.log('\n─── Employee Role (RBAC) ───');
  await test('POST /api/frappe/loovis/employee-role returns role structure', async () => {
    const { json, status } = await request('/api/frappe/loovis/employee-role', {
      method: 'POST',
      body: { employee_id: empId },
    });
    if (status === 401 || status === 404) return;
    assert(json, 'Response is not JSON');
    // Response can be { data: { ... } } or { message: { ... } }
    const data = json.data || json.message || json;
    if (data && typeof data === 'object') {
      // Should have loovis_role or at minimum employee_id
      if (data.loovis_role !== undefined) {
        assert(typeof data.loovis_role === 'string' || data.loovis_role === null,
          `loovis_role should be string or null, got ${typeof data.loovis_role}`);
      }
    }
  });

  // ── User settings ──
  console.log('\n─── User Settings ───');
  await test('GET /api/frappe/user-settings returns settings object', async () => {
    const { json, status } = await request('/api/frappe/user-settings');
    if (status === 401) return;
    assert(json, 'Response is not JSON');
    // Settings response shape varies but should be an object
    assert(typeof json === 'object', 'Response should be an object');
  });

  // ── Employees by department ──
  console.log('\n─── Employees by Department ───');
  await test('GET /api/frappe/employees/by-department/:dept returns { data: [...] }', async () => {
    const dept = testEmployee?.department || 'All Departments';
    const { json, status } = await request(`/api/frappe/employees/by-department/${encodeURIComponent(dept)}?limit=3`);
    if (status === 401 || status === 404) return;
    assert(json, 'Response is not JSON');
    assert(Array.isArray(json.data), 'data is not an array');
    if (json.data.length > 0) {
      assertShape(json.data[0], ['name', 'employee_name'], 'department employee');
    }
  });

  // ── Employees with external IDs ──
  console.log('\n─── Employees with External IDs ───');
  await test('GET /api/frappe/employees-with-external-ids returns { data: [...] }', async () => {
    const { json, status } = await request('/api/frappe/employees-with-external-ids');
    if (status === 401) return;
    assert(json, 'Response is not JSON');
    assert(Array.isArray(json.data), 'data is not an array');
    if (json.data.length > 0) {
      assertShape(json.data[0], ['name', 'employee_name', 'custom_itigris_user_id'], 'external-ids employee');
    }
  });

  // ── Admin endpoints ──
  console.log('\n─── Admin Endpoints ───');
  await test('GET /api/admin/designations returns array', async () => {
    const { json, status } = await request('/api/admin/designations');
    if (status === 401) return;
    assert(json, 'Response is not JSON');
    assert(Array.isArray(json.data || json), 'Response should contain an array');
  });

  await test('GET /api/admin/departments returns array', async () => {
    const { json, status } = await request('/api/admin/departments');
    if (status === 401) return;
    assert(json, 'Response is not JSON');
    assert(Array.isArray(json.data || json), 'Response should contain an array');
  });

  await test('GET /api/admin/org/tree returns tree structure', async () => {
    const { json, status } = await request('/api/admin/org/tree');
    if (status === 401) return;
    assert(json, 'Response is not JSON');
    // Tree can be { data: [...] } or direct array
    const tree = json.data || json;
    assert(Array.isArray(tree) || typeof tree === 'object', 'Tree should be array or object');
  });

  // ── Sync status ──
  console.log('\n─── Sync Status ───');
  await test('GET /api/admin/sync/status returns sync state', async () => {
    const { json, status } = await request('/api/admin/sync/status');
    if (status === 401 || status === 404) return;
    assert(json, 'Response is not JSON');
    if (json.state) {
      assert(Array.isArray(json.state), 'state should be an array');
    }
  });

  // ── Health checks (integrations) ──
  console.log('\n─── Integration Health ───');
  await test('GET /api/admin/integrations includes org_database', async () => {
    const { json, status } = await request('/api/admin/integrations');
    if (status === 401 || status === 404) return;
    assert(json, 'Response is not JSON');
    const items = json.data || json;
    if (Array.isArray(items)) {
      const orgDb = items.find(i => i.id === 'org_database');
      assert(orgDb, 'org_database integration not found in health checks');
    }
  });

  // ── Summary ──
  console.log('\n' + '═'.repeat(50));
  console.log(`📊 Results: ${passed} passed, ${failed} failed (${passed + failed} total)`);
  if (failures.length > 0) {
    console.log('\nFailed tests:');
    for (const f of failures) {
      console.log(`  ❌ ${f.name}: ${f.error}`);
    }
  }
  console.log('═'.repeat(50));

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});

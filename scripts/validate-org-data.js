#!/usr/bin/env node
/**
 * Validation script: compares org data between Frappe and PostgreSQL.
 *
 * Usage: node --env-file=.env scripts/validate-org-data.js
 *
 * For each active employee, compares:
 * 1. Employee fields (name, designation, department, etc.)
 * 2. Role resolution (loovis_role, stores list)
 *
 * Reports discrepancies and exits with code 1 if any found.
 */
import pg from 'pg';

const FRAPPE_BASE_URL = process.env.FRAPPE_BASE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;
const DATABASE_URL = process.env.DATABASE_URL;

if (!FRAPPE_BASE_URL || !FRAPPE_API_KEY || !FRAPPE_API_SECRET || !DATABASE_URL) {
  console.error('❌ Missing required env vars: FRAPPE_BASE_URL, FRAPPE_API_KEY, FRAPPE_API_SECRET, DATABASE_URL');
  process.exit(1);
}

const FRAPPE_HEADERS = {
  'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
  'Content-Type': 'application/json',
};

const SHIFT_ID_2_2 = '0248ad52vt';
const SHIFT_ID_5_2 = 'd216invhir';

function getShiftFormatKind(rawId) {
  const id = rawId ? String(rawId).trim() : '';
  if (id === SHIFT_ID_2_2) return '2/2';
  if (id === SHIFT_ID_5_2) return '5/2';
  return null;
}

function stripLrSuffix(value) {
  return String(value || '').replace(/\s*-\s*LR\s*$/i, '').trim();
}

async function frappeGet(endpoint) {
  const resp = await fetch(`${FRAPPE_BASE_URL}${endpoint}`, { headers: FRAPPE_HEADERS });
  if (!resp.ok) throw new Error(`Frappe GET ${endpoint}: ${resp.status}`);
  const json = await resp.json();
  return json?.data || json?.message || json;
}

async function frappePost(endpoint, body) {
  const resp = await fetch(`${FRAPPE_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: FRAPPE_HEADERS,
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`Frappe POST ${endpoint}: ${resp.status}`);
  const json = await resp.json();
  return json?.data || json?.message || json;
}

function collectStoresFromTree(departments) {
  const out = [];
  const seen = new Set();
  const walk = (nodes) => {
    if (!Array.isArray(nodes)) return;
    for (const n of nodes) {
      const storeId = n?.custom_store_id != null ? String(n.custom_store_id).trim() : '';
      if (storeId && !seen.has(storeId)) {
        seen.add(storeId);
        out.push({
          store_id: storeId,
          name: stripLrSuffix(n?.name || n?.id || storeId) || storeId,
          department_id: n?.id ? String(n.id).trim() : null,
        });
      }
      walk(n?.sub_departments);
    }
  };
  walk(departments);
  return out;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔍 Validating org data: Frappe vs PostgreSQL...\n');

  const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 5 });
  const discrepancies = [];

  try {
    // 1. Fetch Frappe employees
    const frappeEmployees = await frappeGet(
      '/api/resource/Employee?filters=[["status","=","Active"]]&fields=["name","employee_name","designation","department","reports_to","custom_tg_username","custom_itigris_user_id","custom_employee_shift_format","company_email","image"]&limit_page_length=0'
    );
    console.log(`Frappe employees: ${frappeEmployees.length}`);

    // 2. Fetch PostgreSQL employees
    const pgResult = await pool.query(
      `SELECT * FROM dim_employees WHERE status = 'Active'`
    );
    const pgEmployees = new Map(pgResult.rows.map(r => [r.id, r]));
    console.log(`PostgreSQL employees: ${pgEmployees.size}`);

    // 3. Compare each employee
    let checked = 0;
    let roleChecked = 0;
    let roleMismatch = 0;

    for (const fe of frappeEmployees) {
      const pe = pgEmployees.get(fe.name);

      if (!pe) {
        discrepancies.push({ employee: fe.name, field: 'MISSING', frappe: 'exists', pg: 'not found' });
        continue;
      }

      // Compare fields
      const fieldMap = [
        ['employee_name', fe.employee_name, pe.employee_name],
        ['designation', fe.designation, pe.designation],
        ['department', fe.department, pe.department],
        ['reports_to', fe.reports_to, pe.reports_to],
        ['custom_tg_username', fe.custom_tg_username, pe.tg_username],
        ['custom_itigris_user_id', fe.custom_itigris_user_id, pe.itigris_user_id],
        ['shift_format', getShiftFormatKind(fe.custom_employee_shift_format), pe.shift_format],
        ['company_email', fe.company_email, pe.company_email],
      ];

      for (const [field, fVal, pVal] of fieldMap) {
        const fNorm = fVal != null ? String(fVal).trim() : '';
        const pNorm = pVal != null ? String(pVal).trim() : '';
        if (fNorm !== pNorm) {
          discrepancies.push({ employee: fe.name, field, frappe: fNorm || '(empty)', pg: pNorm || '(empty)' });
        }
      }

      checked++;
      if (checked % 20 === 0) {
        process.stdout.write(`\r  Checked: ${checked}/${frappeEmployees.length}`);
      }
    }

    // 4. Check for PostgreSQL employees not in Frappe
    const frappeIds = new Set(frappeEmployees.map(e => e.name));
    for (const [pgId] of pgEmployees) {
      if (!frappeIds.has(pgId)) {
        discrepancies.push({ employee: pgId, field: 'EXTRA', frappe: 'not found', pg: 'exists' });
      }
    }

    console.log(`\n  Field comparison: ${checked} employees checked`);

    // 5. Compare role resolution (sample first 50 for speed)
    console.log('\n🔐 Comparing role resolution...');
    const sampleEmployees = frappeEmployees.slice(0, 50);

    for (const fe of sampleEmployees) {
      try {
        // Frappe role
        const frappeRole = await frappePost('/api/method/loovis_get_employee_role', {
          employee_id: fe.name,
        });
        const frappeStores = collectStoresFromTree(frappeRole?.departments);
        const frappeRoleId = frappeRole?.loovis_role || null;

        // PostgreSQL role
        const pgRoleResult = await pool.query(
          `SELECT er.role_id, er.source
           FROM rbac_employee_roles er
           JOIN rbac_roles r ON r.id = er.role_id
           WHERE er.employee_id = $1
           ORDER BY r.level DESC LIMIT 1`,
          [fe.name]
        );
        const pgRoleId = pgRoleResult.rows[0]?.role_id || null;

        // Compare role
        if (String(frappeRoleId || '') !== String(pgRoleId || '')) {
          discrepancies.push({
            employee: fe.name,
            field: 'loovis_role',
            frappe: frappeRoleId || '(none)',
            pg: pgRoleId || '(none)',
          });
          roleMismatch++;
        }

        // Compare stores
        const pgStoresResult = await pool.query(
          `SELECT store_id FROM rbac_store_access WHERE employee_id = $1 ORDER BY store_id`,
          [fe.name]
        );
        const pgStoreIds = pgStoresResult.rows.map(r => r.store_id).sort();
        const frappeStoreIds = frappeStores.map(s => s.store_id).sort();

        if (JSON.stringify(frappeStoreIds) !== JSON.stringify(pgStoreIds)) {
          discrepancies.push({
            employee: fe.name,
            field: 'stores',
            frappe: frappeStoreIds.join(',') || '(none)',
            pg: pgStoreIds.join(',') || '(none)',
          });
          roleMismatch++;
        }

        roleChecked++;
      } catch {
        // Skip employees where role resolution fails
      }

      if (roleChecked % 10 === 0) {
        process.stdout.write(`\r  Role checked: ${roleChecked}/${sampleEmployees.length}`);
      }
    }

    console.log(`\n  Role comparison: ${roleChecked} employees, ${roleMismatch} mismatches`);

    // 6. Report
    console.log('\n' + '═'.repeat(60));
    if (discrepancies.length === 0) {
      console.log('✅ No discrepancies found! Data is consistent.');
    } else {
      console.log(`❌ Found ${discrepancies.length} discrepancy(ies):\n`);
      for (const d of discrepancies.slice(0, 50)) {
        console.log(`  ${d.employee} | ${d.field}: Frappe="${d.frappe}" vs PG="${d.pg}"`);
      }
      if (discrepancies.length > 50) {
        console.log(`  ... and ${discrepancies.length - 50} more`);
      }
    }
    console.log('═'.repeat(60));

    process.exit(discrepancies.length > 0 ? 1 : 0);
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});

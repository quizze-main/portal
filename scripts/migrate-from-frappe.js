#!/usr/bin/env node
/**
 * One-time data migration: Frappe ERP → PostgreSQL org structure.
 *
 * Usage: node --env-file=.env scripts/migrate-from-frappe.js
 *
 * Idempotent: uses INSERT ... ON CONFLICT DO UPDATE throughout.
 * Safe to re-run.
 */
import pg from 'pg';

// ─── Config ─────────────────────────────────────────────────────────────────

const FRAPPE_BASE_URL = process.env.FRAPPE_BASE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;
const DATABASE_URL = process.env.DATABASE_URL;

if (!FRAPPE_BASE_URL || !FRAPPE_API_KEY || !FRAPPE_API_SECRET) {
  console.error('❌ Missing FRAPPE_BASE_URL, FRAPPE_API_KEY, or FRAPPE_API_SECRET');
  process.exit(1);
}
if (!DATABASE_URL) {
  console.error('❌ Missing DATABASE_URL');
  process.exit(1);
}

const FRAPPE_HEADERS = {
  'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
  'Content-Type': 'application/json',
};

// Shift format ID mapping (from internal-api.js lines 48-51)
const SHIFT_ID_2_2 = '0248ad52vt';
const SHIFT_ID_5_2 = 'd216invhir';

function getShiftFormatKind(rawId) {
  const id = rawId ? String(rawId).trim() : '';
  if (!id) return null;
  if (id === SHIFT_ID_2_2) return '2/2';
  if (id === SHIFT_ID_5_2) return '5/2';
  return null;
}

// Designation category computation (mirrors src/lib/roleUtils.ts)
function computeDesignationCategory(designation) {
  const d = String(designation || '').toLowerCase().replace(/ё/g, 'е');
  if (d.includes('руководитель')) return 'leader';
  if (d.includes('старш') && d.includes('менеджер')) return 'senior_manager';
  if (d.includes('оптометрист')) return 'optometrist';
  if (d.includes('5/2')) return 'manager_5_2';
  if (d.includes('2/2')) return 'manager_2_2';
  if (d.includes('универсал')) return 'universal_manager';
  if (d.includes('менеджер')) return 'manager';
  if (d.includes('забот')) return 'care_manager';
  return 'other';
}

function isLeaderCategory(category) {
  return category === 'leader';
}

// ─── Frappe API helpers ─────────────────────────────────────────────────────

async function frappeGet(endpoint) {
  const url = `${FRAPPE_BASE_URL}${endpoint}`;
  const resp = await fetch(url, { headers: FRAPPE_HEADERS });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Frappe GET ${endpoint} failed: ${resp.status} ${text.slice(0, 200)}`);
  }
  const json = await resp.json();
  return json?.data || json?.message || json;
}

async function frappePost(endpoint, body) {
  const url = `${FRAPPE_BASE_URL}${endpoint}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: FRAPPE_HEADERS,
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Frappe POST ${endpoint} failed: ${resp.status} ${text.slice(0, 200)}`);
  }
  const json = await resp.json();
  return json?.data || json?.message || json;
}

// Collect stores from nested department tree (mirrors internal-api.js lines 3825-3855)
function collectStoresFromTree(departments) {
  const out = [];
  const seen = new Set();
  const walk = (nodes) => {
    if (!Array.isArray(nodes)) return;
    for (const n of nodes) {
      const storeId = n?.custom_store_id != null ? String(n.custom_store_id).trim() : '';
      const deptId = n?.id != null ? String(n.id).trim() : '';
      if (storeId && !seen.has(storeId)) {
        seen.add(storeId);
        out.push({ store_id: storeId, department_id: deptId || null });
      }
      walk(n?.sub_departments);
    }
  };
  walk(departments);
  return out;
}

// ─── Main migration ─────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 Starting Frappe → PostgreSQL org structure migration...\n');

  // 1. Fetch all data from Frappe
  console.log('📥 Fetching data from Frappe...');

  const [departments, employees, designations] = await Promise.all([
    frappeGet('/api/resource/Department?fields=["name","department_name","custom_store_id","parent_department","is_group"]&limit_page_length=0'),
    frappeGet('/api/resource/Employee?filters=[["status","=","Active"]]&fields=["name","employee_name","first_name","designation","department","reports_to","custom_tg_username","custom_itigris_user_id","custom_employee_shift_format","company_email","image","user_id","date_of_birth","date_of_joining","gender","custom_tg_chat_id"]&limit_page_length=0'),
    frappeGet('/api/resource/Designation?fields=["name"]&limit_page_length=0'),
  ]);

  console.log(`  Departments: ${departments.length}`);
  console.log(`  Employees: ${employees.length}`);
  console.log(`  Designations: ${designations.length}`);

  // 2. Resolve roles for each employee
  console.log('\n🔐 Resolving employee roles...');
  const roleMap = new Map(); // employeeId → { role, stores }

  let resolved = 0;
  let failed = 0;
  for (const emp of employees) {
    try {
      const result = await frappePost('/api/method/loovis_get_employee_role', {
        employee_id: emp.name,
      });
      const stores = collectStoresFromTree(result?.departments);
      roleMap.set(emp.name, {
        role: result?.loovis_role || null,
        source: result?.source || null,
        stores,
      });
      resolved++;
    } catch (err) {
      // Some employees may not have roles assigned
      roleMap.set(emp.name, { role: null, source: null, stores: [] });
      failed++;
    }

    if ((resolved + failed) % 10 === 0) {
      process.stdout.write(`\r  Resolved: ${resolved}, failed: ${failed} / ${employees.length}`);
    }
  }
  console.log(`\n  Total resolved: ${resolved}, failed: ${failed}`);

  // 3. Connect to PostgreSQL and insert everything
  console.log('\n💾 Writing to PostgreSQL...');
  const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 5 });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 3a. org_networks
    await client.query(
      `INSERT INTO org_networks (id, name) VALUES ($1, $2)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = now()`,
      ['loov-russia', 'Loov Russia']
    );
    console.log('  ✅ org_networks: 1 record');

    // 3b. org_designations
    let desigCount = 0;
    for (const d of designations) {
      const category = computeDesignationCategory(d.name);
      await client.query(
        `INSERT INTO org_designations (name, category, is_leader)
         VALUES ($1, $2, $3)
         ON CONFLICT (name) DO UPDATE SET
           category = EXCLUDED.category,
           is_leader = EXCLUDED.is_leader,
           updated_at = now()`,
        [d.name, category, isLeaderCategory(category)]
      );
      desigCount++;
    }
    console.log(`  ✅ org_designations: ${desigCount} records`);

    // 3c. dim_branches — from departments with custom_store_id
    let branchCount = 0;
    for (const dept of departments) {
      if (dept.custom_store_id) {
        const storeName = dept.department_name || dept.name;
        await client.query(
          `INSERT INTO dim_branches (id, name, store_id, network_id, enabled)
           VALUES ($1, $2, $3, 'loov-russia', true)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             store_id = EXCLUDED.store_id,
             network_id = EXCLUDED.network_id,
             updated_at = now()`,
          [dept.custom_store_id, storeName, dept.custom_store_id]
        );
        branchCount++;
      }
    }
    console.log(`  ✅ dim_branches: ${branchCount} records`);

    // 3d. org_departments
    // First pass: insert without parent_id to avoid FK violations
    let deptCount = 0;
    for (const dept of departments) {
      await client.query(
        `INSERT INTO org_departments (id, department_name, store_id, is_group, enabled)
         VALUES ($1, $2, $3, $4, true)
         ON CONFLICT (id) DO UPDATE SET
           department_name = EXCLUDED.department_name,
           store_id = EXCLUDED.store_id,
           is_group = EXCLUDED.is_group,
           updated_at = now()`,
        [dept.name, dept.department_name, dept.custom_store_id || null, dept.is_group || false]
      );
      deptCount++;
    }
    // Second pass: set parent_id and branch_id
    for (const dept of departments) {
      if (dept.parent_department) {
        await client.query(
          `UPDATE org_departments SET parent_id = $2, updated_at = now() WHERE id = $1`,
          [dept.name, dept.parent_department]
        );
      }
      // Link to branch via store_id
      if (dept.custom_store_id) {
        await client.query(
          `UPDATE org_departments SET branch_id = $2, updated_at = now() WHERE id = $1`,
          [dept.name, dept.custom_store_id]
        );
      }
    }
    console.log(`  ✅ org_departments: ${deptCount} records`);

    // 3e. dim_employees
    // First pass: insert without reports_to to avoid FK violations
    let empCount = 0;
    for (const emp of employees) {
      const shiftFormat = getShiftFormatKind(emp.custom_employee_shift_format);
      await client.query(
        `INSERT INTO dim_employees (
          id, name, employee_name, first_name, designation, department, department_id,
          tg_username, itigris_user_id, company_email, image_url, frappe_user,
          tg_chat_id, date_of_birth, date_of_joining, gender, shift_format,
          status, frappe_id, enabled
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'Active',$18,true)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          employee_name = EXCLUDED.employee_name,
          first_name = EXCLUDED.first_name,
          designation = EXCLUDED.designation,
          department = EXCLUDED.department,
          department_id = EXCLUDED.department_id,
          tg_username = EXCLUDED.tg_username,
          itigris_user_id = EXCLUDED.itigris_user_id,
          company_email = EXCLUDED.company_email,
          image_url = EXCLUDED.image_url,
          frappe_user = EXCLUDED.frappe_user,
          tg_chat_id = EXCLUDED.tg_chat_id,
          date_of_birth = EXCLUDED.date_of_birth,
          date_of_joining = EXCLUDED.date_of_joining,
          gender = EXCLUDED.gender,
          shift_format = EXCLUDED.shift_format,
          frappe_id = EXCLUDED.frappe_id,
          status = 'Active',
          enabled = true,
          updated_at = now()`,
        [
          emp.name,                                 // id
          emp.employee_name || emp.first_name,      // name
          emp.employee_name,                        // employee_name
          emp.first_name || null,                   // first_name
          emp.designation || null,                  // designation
          emp.department || null,                   // department
          emp.department || null,                   // department_id (FK to org_departments)
          emp.custom_tg_username || null,           // tg_username
          emp.custom_itigris_user_id || null,       // itigris_user_id
          emp.company_email || null,                // company_email
          emp.image || null,                        // image_url
          emp.user_id || null,                      // frappe_user
          emp.custom_tg_chat_id || null,            // tg_chat_id
          emp.date_of_birth || null,                // date_of_birth
          emp.date_of_joining || null,              // date_of_joining
          emp.gender || null,                       // gender
          shiftFormat,                              // shift_format
          emp.name,                                 // frappe_id
        ]
      );
      empCount++;
    }
    // Second pass: set reports_to
    for (const emp of employees) {
      if (emp.reports_to) {
        await client.query(
          `UPDATE dim_employees SET reports_to = $2, updated_at = now() WHERE id = $1`,
          [emp.name, emp.reports_to]
        );
      }
    }
    console.log(`  ✅ dim_employees: ${empCount} records`);

    // 3f. rbac_employee_roles
    let roleCount = 0;
    for (const [empId, roleData] of roleMap) {
      if (roleData.role) {
        await client.query(
          `INSERT INTO rbac_employee_roles (employee_id, role_id, source, granted_at)
           VALUES ($1, $2, $3, now())
           ON CONFLICT (employee_id, role_id) DO UPDATE SET
             source = EXCLUDED.source,
             granted_at = now()`,
          [empId, roleData.role, roleData.source || 'frappe_sync']
        );
        roleCount++;
      }
    }
    console.log(`  ✅ rbac_employee_roles: ${roleCount} records`);

    // 3g. rbac_store_access
    let storeAccessCount = 0;
    for (const [empId, roleData] of roleMap) {
      for (const store of roleData.stores) {
        await client.query(
          `INSERT INTO rbac_store_access (employee_id, store_id, department_id, source)
           VALUES ($1, $2, $3, 'frappe_sync')
           ON CONFLICT (employee_id, store_id) DO UPDATE SET
             department_id = EXCLUDED.department_id,
             source = EXCLUDED.source`,
          [empId, store.store_id, store.department_id || null]
        );
        storeAccessCount++;
      }
    }
    console.log(`  ✅ rbac_store_access: ${storeAccessCount} records`);

    // 3h. Initialize emp_id_seq to max existing HR-EMP number + 100
    const maxIdResult = await client.query(
      `SELECT MAX(CAST(SUBSTRING(id FROM 'HR-EMP-([0-9]+)') AS INTEGER)) AS max_num
       FROM dim_employees
       WHERE id ~ '^HR-EMP-[0-9]+$'`
    );
    const maxNum = maxIdResult.rows[0]?.max_num || 0;
    const nextVal = maxNum + 100;
    await client.query(`SELECT setval('emp_id_seq', $1, true)`, [nextVal]);
    console.log(`  ✅ emp_id_seq set to ${nextVal} (max existing: ${maxNum})`);

    // 3i. Record sync state
    const syncEntities = ['employees', 'departments', 'designations', 'roles', 'store_access'];
    const counts = {
      employees: empCount,
      departments: deptCount,
      designations: desigCount,
      roles: roleCount,
      store_access: storeAccessCount,
    };
    for (const entity of syncEntities) {
      await client.query(
        `INSERT INTO sync_state (entity_type, last_sync, record_count)
         VALUES ($1, now(), $2)
         ON CONFLICT (entity_type) DO UPDATE SET
           last_sync = now(),
           record_count = EXCLUDED.record_count`,
        [entity, counts[entity] || 0]
      );
    }

    // Log the sync
    await client.query(
      `INSERT INTO sync_log (entity_type, action, status, records_processed, details)
       VALUES ('all', 'full_sync', 'success', $1, $2)`,
      [
        empCount + deptCount + desigCount + roleCount + storeAccessCount,
        JSON.stringify({
          employees: empCount,
          departments: deptCount,
          designations: desigCount,
          roles: roleCount,
          store_access: storeAccessCount,
          emp_id_seq: nextVal,
        }),
      ]
    );

    await client.query('COMMIT');
    console.log('\n✅ Migration completed successfully!');
    console.log(`\nSummary:`);
    console.log(`  Networks:     1`);
    console.log(`  Designations: ${desigCount}`);
    console.log(`  Branches:     ${branchCount}`);
    console.log(`  Departments:  ${deptCount}`);
    console.log(`  Employees:    ${empCount}`);
    console.log(`  Roles:        ${roleCount}`);
    console.log(`  Store access: ${storeAccessCount}`);
    console.log(`  emp_id_seq:   ${nextVal}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Migration failed, rolled back:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});

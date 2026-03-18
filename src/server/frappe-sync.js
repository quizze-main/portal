/**
 * Frappe Sync module — sync from Frappe → JSON files (+ PostgreSQL when available).
 *
 * Provides on-demand and periodic sync FROM Frappe.
 * Does NOT write back to Frappe.
 *
 * JSON files are ALWAYS written (primary storage).
 * PostgreSQL is written only when DATABASE_URL is configured.
 *
 * Controlled by env vars:
 * - FRAPPE_SYNC_ENABLED=false  — enable periodic sync
 * - FRAPPE_SYNC_INTERVAL_HOURS=6  — interval for auto-sync
 */
import path from 'path';
import { query, isDbConnected } from './db.js';
import { DATA_DIR, writeJsonFile, readJsonRaw, withFileLock } from './json-storage.js';

const FRAPPE_BASE_URL = process.env.FRAPPE_BASE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

const SHIFT_ID_2_2 = '0248ad52vt';
const SHIFT_ID_5_2 = 'd216invhir';

// JSON file paths
const EMPLOYEES_PATH = path.join(DATA_DIR, 'org-employees.json');
const DEPARTMENTS_PATH = path.join(DATA_DIR, 'org-departments.json');
const DESIGNATIONS_PATH = path.join(DATA_DIR, 'org-designations.json');
const ROLES_PATH = path.join(DATA_DIR, 'org-roles.json');

function getShiftFormatKind(rawId) {
  const id = rawId ? String(rawId).trim() : '';
  if (id === SHIFT_ID_2_2) return '2/2';
  if (id === SHIFT_ID_5_2) return '5/2';
  return null;
}

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

function stripLrSuffix(value) {
  const s = value != null ? String(value) : '';
  return s.replace(/\s*-\s*LR\s*$/i, '').trim();
}

const FRAPPE_HEADERS = {
  'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
  'Content-Type': 'application/json',
};

async function frappeGet(endpoint) {
  const resp = await fetch(`${FRAPPE_BASE_URL}${endpoint}`, {
    headers: FRAPPE_HEADERS,
    signal: AbortSignal.timeout(30_000),
  });
  if (!resp.ok) throw new Error(`Frappe GET ${endpoint}: ${resp.status}`);
  const json = await resp.json();
  return json?.data || json?.message || json;
}

async function frappePost(endpoint, body) {
  const resp = await fetch(`${FRAPPE_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: FRAPPE_HEADERS,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  if (!resp.ok) throw new Error(`Frappe POST ${endpoint}: ${resp.status}`);
  const json = await resp.json();
  return json?.data || json?.message || json;
}

/**
 * Run async function for each item with limited concurrency.
 */
async function mapWithConcurrency(items, concurrency, fn) {
  const results = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const settled = await Promise.allSettled(batch.map(fn));
    results.push(...settled);
  }
  return results;
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

// ─── Sync functions ─────────────────────────────────────────────────────────

/**
 * Sync departments from Frappe → JSON (+ PG if connected).
 */
export async function syncDepartmentsFromFrappe() {
  if (!FRAPPE_BASE_URL || !FRAPPE_API_KEY) return { synced: 0, error: 'Frappe not configured' };

  const frappeDepts = await frappeGet(
    '/api/resource/Department?fields=["name","department_name","custom_store_id","parent_department","is_group"]&limit_page_length=0'
  );

  const count = frappeDepts.length;

  // Always write to JSON
  const jsonDepts = frappeDepts.map(d => ({
    id: d.name,
    department_name: d.department_name,
    parent_id: d.parent_department || null,
    store_id: d.custom_store_id || null,
    is_group: d.is_group || false,
    enabled: true,
  }));
  await withFileLock(DEPARTMENTS_PATH, () =>
    writeJsonFile(DEPARTMENTS_PATH, { departments: jsonDepts })
  );
  console.log(`  📁 JSON: ${count} departments written`);

  // PG sync (optional)
  if (isDbConnected()) {
    for (const dept of frappeDepts) {
      await query(
        `INSERT INTO org_departments (id, department_name, store_id, is_group, enabled)
         VALUES ($1, $2, $3, $4, true)
         ON CONFLICT (id) DO UPDATE SET
           department_name = EXCLUDED.department_name,
           store_id = EXCLUDED.store_id,
           is_group = EXCLUDED.is_group,
           updated_at = now()`,
        [dept.name, dept.department_name, dept.custom_store_id || null, dept.is_group || false]
      );
    }

    for (const dept of frappeDepts) {
      if (dept.parent_department) {
        await query(
          `UPDATE org_departments SET parent_id = $2, updated_at = now() WHERE id = $1`,
          [dept.name, dept.parent_department]
        );
      }
    }

    await query(
      `INSERT INTO sync_state (entity_type, last_sync, record_count)
       VALUES ('departments', now(), $1)
       ON CONFLICT (entity_type) DO UPDATE SET last_sync = now(), record_count = $1`,
      [count]
    );
  }

  return { synced: count };
}

/**
 * Sync employees from Frappe → JSON (+ PG if connected).
 */
export async function syncEmployeesFromFrappe() {
  if (!FRAPPE_BASE_URL || !FRAPPE_API_KEY) return { synced: 0, error: 'Frappe not configured' };

  const frappeEmps = await frappeGet(
    '/api/resource/Employee?filters=[["status","=","Active"]]&fields=["name","employee_name","first_name","designation","department","reports_to","custom_tg_username","custom_itigris_user_id","custom_employee_shift_format","company_email","image","user_id","date_of_birth","date_of_joining","gender","custom_tg_chat_id"]&limit_page_length=0'
  );

  const count = frappeEmps.length;

  // Always write to JSON
  let maxEmpNum = 0;
  const jsonEmps = frappeEmps.map(emp => {
    const match = emp.name?.match(/HR-EMP-(\d+)/);
    if (match) maxEmpNum = Math.max(maxEmpNum, parseInt(match[1]));

    return {
      id: emp.name,
      employee_name: emp.employee_name || emp.first_name,
      first_name: emp.first_name || null,
      designation: emp.designation || null,
      department: emp.department || null,
      department_id: emp.department || null,
      reports_to: emp.reports_to || null,
      tg_username: emp.custom_tg_username || null,
      tg_chat_id: emp.custom_tg_chat_id || null,
      itigris_user_id: emp.custom_itigris_user_id || null,
      company_email: emp.company_email || null,
      image_url: emp.image || null,
      frappe_user: emp.user_id || null,
      date_of_birth: emp.date_of_birth || null,
      date_of_joining: emp.date_of_joining || null,
      gender: emp.gender || null,
      shift_format: getShiftFormatKind(emp.custom_employee_shift_format),
      status: 'Active',
      enabled: true,
      frappe_id: emp.name,
    };
  });
  await withFileLock(EMPLOYEES_PATH, () =>
    writeJsonFile(EMPLOYEES_PATH, { employees: jsonEmps, _next_emp_seq: maxEmpNum + 100 })
  );
  console.log(`  📁 JSON: ${count} employees written`);

  // PG sync (optional)
  if (isDbConnected()) {
    for (const emp of frappeEmps) {
      const shiftFormat = getShiftFormatKind(emp.custom_employee_shift_format);
      await query(
        `INSERT INTO dim_employees (
          id, name, employee_name, first_name, designation, department, department_id,
          tg_username, itigris_user_id, company_email, image_url, frappe_user,
          tg_chat_id, date_of_birth, date_of_joining, gender, shift_format,
          status, frappe_id, enabled
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'Active',$18,true)
        ON CONFLICT (id) DO UPDATE SET
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
          status = 'Active',
          enabled = true,
          updated_at = now()`,
        [
          emp.name, emp.employee_name || emp.first_name, emp.employee_name,
          emp.first_name || null, emp.designation || null, emp.department || null,
          emp.department || null, emp.custom_tg_username || null,
          emp.custom_itigris_user_id || null, emp.company_email || null,
          emp.image || null, emp.user_id || null, emp.custom_tg_chat_id || null,
          emp.date_of_birth || null, emp.date_of_joining || null,
          emp.gender || null, shiftFormat, emp.name,
        ]
      );
    }

    for (const emp of frappeEmps) {
      if (emp.reports_to) {
        await query(
          `UPDATE dim_employees SET reports_to = $2, updated_at = now() WHERE id = $1`,
          [emp.name, emp.reports_to]
        );
      }
    }

    await query(
      `INSERT INTO sync_state (entity_type, last_sync, record_count)
       VALUES ('employees', now(), $1)
       ON CONFLICT (entity_type) DO UPDATE SET last_sync = now(), record_count = $1`,
      [count]
    );
  }

  return { synced: count };
}

/**
 * Sync designations from Frappe → JSON (+ PG if connected).
 */
export async function syncDesignationsFromFrappe() {
  if (!FRAPPE_BASE_URL || !FRAPPE_API_KEY) return { synced: 0, error: 'Frappe not configured' };

  const frappeDesignations = await frappeGet(
    '/api/resource/Designation?fields=["name"]&limit_page_length=0'
  );

  const count = frappeDesignations.length;

  // Always write to JSON
  const jsonDesignations = frappeDesignations.map((d, i) => {
    const category = computeDesignationCategory(d.name);
    return {
      id: i + 1,
      name: d.name,
      category,
      is_leader: category === 'leader',
    };
  });
  await withFileLock(DESIGNATIONS_PATH, () =>
    writeJsonFile(DESIGNATIONS_PATH, { designations: jsonDesignations, _next_id: jsonDesignations.length + 1 })
  );
  console.log(`  📁 JSON: ${count} designations written`);

  // PG sync (optional)
  if (isDbConnected()) {
    for (const d of frappeDesignations) {
      const category = computeDesignationCategory(d.name);
      await query(
        `INSERT INTO org_designations (name, category, is_leader)
         VALUES ($1, $2, $3)
         ON CONFLICT (name) DO UPDATE SET
           category = EXCLUDED.category,
           is_leader = EXCLUDED.is_leader,
           updated_at = now()`,
        [d.name, category, category === 'leader']
      );
    }
  }

  return { synced: count };
}

/**
 * Sync roles and store access from Frappe → JSON (+ PG if connected).
 * Calls loovis_get_employee_role for each active employee.
 */
export async function syncRolesFromFrappe() {
  if (!FRAPPE_BASE_URL || !FRAPPE_API_KEY) return { synced: 0, error: 'Frappe not configured' };

  console.log('  🔐 Syncing roles from Frappe...');

  const frappeEmps = await frappeGet(
    '/api/resource/Employee?filters=[["status","=","Active"]]&fields=["name"]&limit_page_length=0'
  );

  const newEmployeeRoles = [];
  const newStoreAccess = [];
  let resolved = 0;
  let errors = 0;

  // Process in batches of 5 concurrent requests
  await mapWithConcurrency(frappeEmps, 5, async (emp) => {
    try {
      const roleData = await frappePost('/api/method/loovis_get_employee_role', {
        employee_id: emp.name,
      });

      const roleId = roleData?.loovis_role || null;
      if (roleId) {
        newEmployeeRoles.push({
          employee_id: emp.name,
          role_id: roleId,
          source: 'frappe_sync',
          granted_by: null,
          granted_at: new Date().toISOString(),
        });
      }

      const stores = collectStoresFromTree(roleData?.departments);
      for (const store of stores) {
        newStoreAccess.push({
          employee_id: emp.name,
          store_id: store.store_id,
          department_id: store.department_id || null,
          source: 'frappe_sync',
        });
      }

      resolved++;
      if (resolved % 10 === 0) {
        console.log(`     Resolved: ${resolved}/${frappeEmps.length}`);
      }
    } catch (err) {
      errors++;
      if (errors <= 3) {
        console.warn(`  Role sync error for ${emp.name}: ${err.message}`);
      }
    }
  });

  // Abort if too many errors (systemic failure)
  if (errors > 5 && resolved === 0) {
    console.error('  Aborting role sync: all requests failed');
    return { synced: 0, errors, error: 'All role requests failed' };
  }

  // Write to JSON atomically: read inside lock, merge, write
  await withFileLock(ROLES_PATH, async () => {
    const rolesData = await readJsonRaw(ROLES_PATH);
    if (!rolesData.roles || rolesData.roles.length === 0) {
      rolesData.roles = [
        { id: 'LIS-R-00000', name: 'Стандарт', description: 'Standard access', level: 0 },
        { id: 'LIS-R-00001', name: 'Менеджер', description: 'Manager access', level: 1 },
      ];
    }
    if (!rolesData.feature_flags) {
      rolesData.feature_flags = [];
    }
    rolesData.employee_roles = newEmployeeRoles;
    rolesData.store_access = newStoreAccess;
    await writeJsonFile(ROLES_PATH, rolesData);
  });
  console.log(`  📁 JSON: ${newEmployeeRoles.length} employee roles, ${newStoreAccess.length} store access entries (${errors} errors)`);

  // PG sync (optional)
  if (isDbConnected()) {
    for (const er of newEmployeeRoles) {
      await query(
        `INSERT INTO rbac_employee_roles (employee_id, role_id, source, granted_by, granted_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (employee_id, role_id) DO UPDATE SET
           source = EXCLUDED.source,
           granted_by = EXCLUDED.granted_by,
           granted_at = EXCLUDED.granted_at`,
        [er.employee_id, er.role_id, er.source, er.granted_by, er.granted_at]
      );
    }
    for (const sa of newStoreAccess) {
      await query(
        `INSERT INTO rbac_store_access (employee_id, store_id, department_id, source)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (employee_id, store_id) DO UPDATE SET
           department_id = EXCLUDED.department_id,
           source = EXCLUDED.source`,
        [sa.employee_id, sa.store_id, sa.department_id, sa.source]
      );
    }
  }

  return { synced: newEmployeeRoles.length, storeAccess: newStoreAccess.length, errors };
}

let isSyncing = false;

/**
 * Run full sync (all entities): Frappe → JSON (+ PG if connected).
 */
export async function runFullSync() {
  if (isSyncing) {
    return { results: {}, errors: ['Sync already in progress'], skipped: true };
  }
  isSyncing = true;

  const results = {};
  const errors = [];

  try {
    try {
      results.designations = await syncDesignationsFromFrappe();
    } catch (e) { errors.push(`designations: ${e.message}`); }

    try {
      results.departments = await syncDepartmentsFromFrappe();
    } catch (e) { errors.push(`departments: ${e.message}`); }

    try {
      results.employees = await syncEmployeesFromFrappe();
    } catch (e) { errors.push(`employees: ${e.message}`); }

    try {
      results.roles = await syncRolesFromFrappe();
    } catch (e) { errors.push(`roles: ${e.message}`); }

    // Log sync to PG if available
    if (isDbConnected()) {
      try {
        await query(
          `INSERT INTO sync_log (entity_type, action, status, details)
           VALUES ('all', 'full_sync', $1, $2)`,
          [
            errors.length > 0 ? 'partial' : 'success',
            JSON.stringify({ results, errors }),
          ]
        );
      } catch (e) {
        console.warn('Could not write sync_log to PG:', e.message);
      }
    }

    console.log(`🔄 Full sync completed: ${JSON.stringify(results)}`);
    if (errors.length > 0) console.warn('🔄 Sync errors:', errors);

    return { results, errors };
  } finally {
    isSyncing = false;
  }
}

/**
 * Get sync status (last sync times + record counts).
 */
export async function getSyncStatus() {
  if (isDbConnected()) {
    try {
      const result = await query(
        `SELECT * FROM sync_state ORDER BY entity_type`
      );
      const logResult = await query(
        `SELECT * FROM sync_log ORDER BY created_at DESC LIMIT 10`
      );
      return {
        state: result?.rows || [],
        recentLogs: logResult?.rows || [],
        source: 'postgres',
      };
    } catch (err) {
      console.warn('DB getSyncStatus failed, returning empty:', err.message);
    }
  }
  return { state: [], recentLogs: [], source: 'json' };
}

// ─── Periodic sync (optional) ───────────────────────────────────────────────

let syncInterval = null;

/**
 * Start periodic sync if enabled via env vars.
 */
export function startPeriodicSync() {
  const enabled = process.env.FRAPPE_SYNC_ENABLED === 'true';
  if (!enabled) return;

  const hours = parseInt(process.env.FRAPPE_SYNC_INTERVAL_HOURS || '6', 10);
  const ms = hours * 60 * 60 * 1000;

  console.log(`🔄 Frappe periodic sync enabled: every ${hours} hours`);

  syncInterval = setInterval(async () => {
    try {
      console.log('🔄 Running periodic Frappe sync...');
      const result = await runFullSync();
      console.log('🔄 Periodic sync completed:', JSON.stringify(result.results));
    } catch (err) {
      console.error('❌ Periodic sync failed:', err.message);
    }
  }, ms);
}

/**
 * Stop periodic sync.
 */
export function stopPeriodicSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

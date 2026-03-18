#!/usr/bin/env node
/**
 * Seed JSON files from Frappe API.
 *
 * Pulls departments, employees, designations, and role assignments from
 * Frappe ERP and writes them to data/org-*.json files for use without PostgreSQL.
 *
 * Usage: node --env-file=.env scripts/seed-json-from-frappe.js
 */
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');

const FRAPPE_BASE_URL = process.env.FRAPPE_BASE_URL;
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

if (!FRAPPE_BASE_URL || !FRAPPE_API_KEY || !FRAPPE_API_SECRET) {
  console.error('❌ Missing required env vars: FRAPPE_BASE_URL, FRAPPE_API_KEY, FRAPPE_API_SECRET');
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

async function writeJson(filename, data) {
  if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true });
  const filePath = path.join(DATA_DIR, filename);
  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`  ✅ ${filename} written`);
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding JSON files from Frappe...\n');

  // 1. Departments
  console.log('📂 Fetching departments...');
  const frappeDepts = await frappeGet(
    '/api/resource/Department?fields=["name","department_name","custom_store_id","parent_department","is_group"]&limit_page_length=0'
  );
  console.log(`   Found ${frappeDepts.length} departments`);

  const departments = frappeDepts.map(d => ({
    id: d.name,
    department_name: d.department_name,
    parent_id: d.parent_department || null,
    store_id: d.custom_store_id || null,
    is_group: d.is_group || false,
    enabled: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  await writeJson('org-departments.json', { departments });

  // 2. Employees
  console.log('\n👥 Fetching employees...');
  const frappeEmps = await frappeGet(
    '/api/resource/Employee?filters=[["status","=","Active"]]&fields=["name","employee_name","first_name","designation","department","reports_to","custom_tg_username","custom_itigris_user_id","custom_employee_shift_format","company_email","image","user_id","date_of_birth","date_of_joining","gender","custom_tg_chat_id"]&limit_page_length=0'
  );
  console.log(`   Found ${frappeEmps.length} active employees`);

  let maxEmpNum = 0;
  const employees = frappeEmps.map(emp => {
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  });

  await writeJson('org-employees.json', {
    employees,
    _next_emp_seq: maxEmpNum + 100,
  });

  // 3. Designations
  console.log('\n🏷️  Fetching designations...');
  const frappeDesignations = await frappeGet(
    '/api/resource/Designation?fields=["name"]&limit_page_length=0'
  );
  console.log(`   Found ${frappeDesignations.length} designations`);

  const designations = frappeDesignations.map((d, i) => {
    const category = computeDesignationCategory(d.name);
    return {
      id: i + 1,
      name: d.name,
      category,
      is_leader: category === 'leader',
    };
  });

  await writeJson('org-designations.json', {
    designations,
    _next_id: designations.length + 1,
  });

  // 4. Roles + store access
  console.log('\n🔐 Fetching roles and store access...');
  const rolesData = {
    roles: [
      { id: 'LIS-R-00000', name: 'Стандарт', description: 'Standard access', level: 0 },
      { id: 'LIS-R-00001', name: 'Менеджер', description: 'Manager access', level: 1 },
    ],
    employee_roles: [],
    store_access: [],
    feature_flags: [
      { flag_name: 'new_dashboard', scope_type: 'store_id', scope_value: '1000000008', enabled: true },
      { flag_name: 'new_dashboard', scope_type: 'store_id', scope_value: '1000000052', enabled: true },
      { flag_name: 'new_dashboard', scope_type: 'store_id', scope_value: '1000000009', enabled: true },
      { flag_name: 'full_dashboard_access', scope_type: 'store_id', scope_value: '1000000009', enabled: true },
    ],
  };

  let roleResolved = 0;
  let roleErrors = 0;

  for (const emp of frappeEmps) {
    try {
      const roleData = await frappePost('/api/method/loovis_get_employee_role', {
        employee_id: emp.name,
      });

      const roleId = roleData?.loovis_role || null;
      if (roleId) {
        rolesData.employee_roles.push({
          employee_id: emp.name,
          role_id: roleId,
          source: 'frappe_sync',
          granted_by: null,
          granted_at: new Date().toISOString(),
        });
      }

      const stores = collectStoresFromTree(roleData?.departments);
      for (const store of stores) {
        rolesData.store_access.push({
          employee_id: emp.name,
          store_id: store.store_id,
          department_id: store.department_id || null,
          source: 'frappe_sync',
        });
      }

      roleResolved++;
      if (roleResolved % 10 === 0) {
        process.stdout.write(`\r   Resolved: ${roleResolved}/${frappeEmps.length}`);
      }
    } catch {
      roleErrors++;
    }
  }

  console.log(`\n   Resolved ${roleResolved} roles (${roleErrors} errors)`);
  console.log(`   Employee roles: ${rolesData.employee_roles.length}`);
  console.log(`   Store access entries: ${rolesData.store_access.length}`);

  await writeJson('org-roles.json', rolesData);

  // 5. Empty user-settings (populated organically)
  await writeJson('user-settings.json', { settings: [] });

  // Summary
  console.log('\n' + '═'.repeat(50));
  console.log('✅ Seed complete!');
  console.log(`   Departments: ${departments.length}`);
  console.log(`   Employees: ${employees.length}`);
  console.log(`   Designations: ${designations.length}`);
  console.log(`   Employee roles: ${rolesData.employee_roles.length}`);
  console.log(`   Store access: ${rolesData.store_access.length}`);
  console.log(`   Next emp seq: ${maxEmpNum + 100}`);
  console.log('═'.repeat(50));
}

main().catch(err => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});

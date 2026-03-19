/**
 * Organizational Data Access Layer (DAL).
 * Provides functions to read/write org entities from PostgreSQL,
 * with automatic JSON file fallback when DB is not connected.
 *
 * CRITICAL CONTRACT: Every function returns data in the EXACT same shape
 * as the current Frappe API responses, so frontend requires zero changes.
 *
 * Follows the dual-persistence pattern from shift-schedule-api.js.
 */
import path from 'path';
import { query, withTransaction, isDbConnected } from './db.js';
import { DATA_DIR, readJsonFile, readJsonRaw, writeJsonFile, withFileLock } from './json-storage.js';

const EMPLOYEES_PATH = path.join(DATA_DIR, 'org-employees.json');
const KARI_EMPLOYEES_PATH = path.join(DATA_DIR, 'kari-employees.json');
const DEPARTMENTS_PATH = path.join(DATA_DIR, 'org-departments.json');
const DESIGNATIONS_PATH = path.join(DATA_DIR, 'org-designations.json');

/**
 * Read employees from both org-employees.json and kari-employees.json,
 * merging by ID (Kari data overrides base data for matching IDs).
 */
async function readMergedEmployees() {
  const base = await readJsonFile(EMPLOYEES_PATH, 'employees');
  const kari = await readJsonFile(KARI_EMPLOYEES_PATH, 'employees');
  if (kari.length === 0) return base;

  const byId = new Map();
  for (const e of base) byId.set(e.id, e);
  for (const e of kari) byId.set(e.id, e); // Kari overrides
  return Array.from(byId.values());
}

// ─── Field mapping helpers ──────────────────────────────────────────────────

/**
 * Map a PostgreSQL employee row to Frappe-compatible API response shape.
 * Works for both PG rows and JSON records (both use PG column names).
 */
function mapEmployeeRow(row) {
  if (!row) return null;
  return {
    name: row.id,
    employee_name: row.employee_name || row.name,
    user_id: row.frappe_user || null,
    designation: row.designation || null,
    custom_tg_username: row.tg_username || null,
    custom_itigris_user_id: row.itigris_user_id || null,
    custom_employee_shift_format_kind: row.shift_format || null,
    reports_to: row.reports_to || null,
    department: row.department || null,
    image: row.image_url || null,
    company_email: row.company_email || null,
    custom_tg_chat_id: row.tg_chat_id || null,
  };
}

/**
 * Map a PostgreSQL employee row to admin API response shape.
 */
function mapAdminEmployeeRow(row) {
  if (!row) return null;
  return {
    name: row.id,
    employee_name: row.employee_name || row.name,
    first_name: row.first_name || null,
    designation: row.designation || null,
    department: row.department || null,
    reports_to: row.reports_to || null,
    custom_tg_username: row.tg_username || null,
    company_email: row.company_email || null,
    image: row.image_url || null,
    date_of_birth: row.date_of_birth || null,
    date_of_joining: row.date_of_joining || null,
    gender: row.gender || null,
    status: row.status || 'Active',
  };
}

/**
 * Map a PostgreSQL department row to Frappe-compatible API response shape.
 */
function mapDepartmentRow(row) {
  if (!row) return null;
  return {
    name: row.id,
    department_name: row.department_name,
    custom_store_id: row.store_id || null,
    parent_department: row.parent_id || null,
    is_group: row.is_group || false,
  };
}

// ─── Employee functions ─────────────────────────────────────────────────────

/**
 * Find employee by Telegram username (used by auth flow).
 * Returns Frappe-shaped response: { data: [employee] } or { data: [] }
 */
export async function findEmployeeByTgUsername(tgUsername) {
  if (isDbConnected()) {
    try {
      const result = await query(
        `SELECT e.*, e.department AS department
         FROM dim_employees e
         WHERE e.tg_username = $1 AND e.status = 'Active'
         LIMIT 1`,
        [tgUsername]
      );
      if (!result || result.rows.length === 0) return { data: [] };
      return { data: [mapEmployeeRow(result.rows[0])] };
    } catch (err) {
      console.warn('DB findEmployeeByTgUsername failed, fallback to JSON', err.message);
    }
  }
  // JSON fallback
  const employees = await readMergedEmployees();
  const found = employees.filter(e => e.tg_username === tgUsername && e.status === 'Active');
  if (found.length === 0) return { data: [] };
  return { data: [mapEmployeeRow(found[0])] };
}

/**
 * Find employee by ID.
 * Returns Frappe-shaped response: { data: employee }
 */
export async function findEmployeeById(employeeId) {
  if (isDbConnected()) {
    try {
      const result = await query(
        `SELECT e.*, e.department AS department
         FROM dim_employees e
         WHERE e.id = $1`,
        [employeeId]
      );
      if (!result || result.rows.length === 0) return { data: null };
      return { data: mapEmployeeRow(result.rows[0]) };
    } catch (err) {
      console.warn('DB findEmployeeById failed, fallback to JSON', err.message);
    }
  }
  const employees = await readMergedEmployees();
  const found = employees.find(e => e.id === employeeId);
  return { data: found ? mapEmployeeRow(found) : null };
}

/**
 * Search employees with optional department and query filters.
 * Returns Frappe-shaped response: { data: [employees] }
 */
export async function searchEmployees({ queryStr, department, limit = 100 }) {
  if (isDbConnected()) {
    try {
      const conditions = [`e.status = 'Active'`];
      const params = [];
      let paramIndex = 1;

      if (department) {
        conditions.push(`e.department = $${paramIndex}`);
        params.push(department);
        paramIndex++;
      }

      if (queryStr) {
        conditions.push(`e.employee_name ILIKE $${paramIndex}`);
        params.push(`%${queryStr}%`);
        paramIndex++;
      }

      params.push(limit);
      const result = await query(
        `SELECT e.*, e.department AS department
         FROM dim_employees e
         WHERE ${conditions.join(' AND ')}
         ORDER BY e.employee_name
         LIMIT $${paramIndex}`,
        params
      );

      if (!result) return { data: [] };
      return { data: result.rows.map(mapEmployeeRow) };
    } catch (err) {
      console.warn('DB searchEmployees failed, fallback to JSON', err.message);
    }
  }
  // JSON fallback
  let employees = await readMergedEmployees();
  employees = employees.filter(e => e.status === 'Active');
  if (department) employees = employees.filter(e => e.department === department);
  if (queryStr) {
    const q = queryStr.toLowerCase();
    employees = employees.filter(e => (e.employee_name || '').toLowerCase().includes(q));
  }
  employees.sort((a, b) => (a.employee_name || '').localeCompare(b.employee_name || ''));
  return { data: employees.slice(0, limit).map(mapEmployeeRow) };
}

/**
 * Get employees by store IDs.
 * Joins with org_departments to resolve store_id → department → employees.
 * Returns array of employees annotated with store_id.
 */
export async function getEmployeesByStoreIds(storeIds, { limit = 200, onlyManagers = false } = {}) {
  if (!storeIds || storeIds.length === 0) return [];

  if (isDbConnected()) {
    try {
      const placeholders = storeIds.map((_, i) => `$${i + 1}`).join(',');
      let managerFilter = '';
      if (onlyManagers) {
        managerFilter = `AND e.designation ILIKE '%менеджер%' AND e.designation NOT ILIKE '%руководитель%'`;
      }

      const result = await query(
        `SELECT e.*, e.department AS department, d.store_id
         FROM dim_employees e
         JOIN org_departments d ON e.department_id = d.id OR e.department = d.id
         WHERE d.store_id IN (${placeholders})
           AND e.status = 'Active'
           ${managerFilter}
         ORDER BY e.employee_name
         LIMIT $${storeIds.length + 1}`,
        [...storeIds, limit]
      );

      if (!result) return [];
      return result.rows.map(row => ({
        ...mapEmployeeRow(row),
        store_id: row.store_id,
      }));
    } catch (err) {
      console.warn('DB getEmployeesByStoreIds failed, fallback to JSON', err.message);
    }
  }
  // JSON fallback: cross-file JOIN simulation
  const departments = await readJsonFile(DEPARTMENTS_PATH, 'departments');
  const deptIdsForStores = new Map();
  for (const dept of departments) {
    if (dept.store_id && storeIds.includes(dept.store_id)) {
      deptIdsForStores.set(dept.id, dept.store_id);
    }
  }

  let employees = await readMergedEmployees();
  employees = employees.filter(e =>
    e.status === 'Active' &&
    (deptIdsForStores.has(e.department_id) || deptIdsForStores.has(e.department))
  );

  if (onlyManagers) {
    employees = employees.filter(e => /менеджер/i.test(e.designation || '') && !/руководитель/i.test(e.designation || ''));
  }

  employees.sort((a, b) => (a.employee_name || '').localeCompare(b.employee_name || ''));
  return employees.slice(0, limit).map(e => ({
    ...mapEmployeeRow(e),
    store_id: deptIdsForStores.get(e.department_id) || deptIdsForStores.get(e.department) || null,
  }));
}

/**
 * Get all active employees in a department.
 * Returns Frappe-shaped response: { data: [employees] }
 */
export async function getEmployeesByDepartmentId(departmentId) {
  if (isDbConnected()) {
    try {
      const result = await query(
        `SELECT e.*, e.department AS department
         FROM dim_employees e
         WHERE e.department = $1 AND e.status = 'Active'
         ORDER BY e.employee_name`,
        [departmentId]
      );
      if (!result) return { data: [] };
      return { data: result.rows.map(mapEmployeeRow) };
    } catch (err) {
      console.warn('DB getEmployeesByDepartmentId failed, fallback to JSON', err.message);
    }
  }
  const employees = await readMergedEmployees();
  const filtered = employees
    .filter(e => e.department === departmentId && e.status === 'Active')
    .sort((a, b) => (a.employee_name || '').localeCompare(b.employee_name || ''));
  return { data: filtered.map(mapEmployeeRow) };
}

/**
 * Get manager data for an employee (via reports_to).
 */
export async function getEmployeeManager(employeeId) {
  if (isDbConnected()) {
    try {
      const result = await query(
        `SELECT m.*, m.department AS department
         FROM dim_employees e
         JOIN dim_employees m ON e.reports_to = m.id
         WHERE e.id = $1`,
        [employeeId]
      );
      if (!result || result.rows.length === 0) return { data: null };
      return { data: mapEmployeeRow(result.rows[0]) };
    } catch (err) {
      console.warn('DB getEmployeeManager failed, fallback to JSON', err.message);
    }
  }
  // JSON fallback: two lookups
  const employees = await readMergedEmployees();
  const emp = employees.find(e => e.id === employeeId);
  if (!emp || !emp.reports_to) return { data: null };
  const manager = employees.find(e => e.id === emp.reports_to);
  return { data: manager ? mapEmployeeRow(manager) : null };
}

/**
 * Create a new employee. Generates HR-EMP-XXXXX ID.
 * Returns Frappe-shaped response: { data: employee }
 */
export async function createEmployee(data) {
  if (isDbConnected()) {
    try {
      return await withTransaction(async (client) => {
        const seqResult = await client.query(`SELECT nextval('emp_id_seq') AS val`);
        const empId = `HR-EMP-${String(seqResult.rows[0].val).padStart(5, '0')}`;

        await client.query(
          `INSERT INTO dim_employees (
            id, name, employee_name, first_name, designation, department, department_id,
            reports_to, tg_username, company_email, image_url,
            date_of_birth, date_of_joining, gender, status, enabled
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'Active', true)`,
          [
            empId,
            data.employee_name || data.first_name,
            data.employee_name || data.first_name,
            data.first_name,
            data.designation || null,
            data.department || null,
            data.department || null,
            data.reports_to || null,
            data.custom_tg_username || null,
            data.company_email || null,
            data.image || null,
            data.date_of_birth || null,
            data.date_of_joining || null,
            data.gender || null,
          ]
        );

        const result = await client.query(
          `SELECT * FROM dim_employees WHERE id = $1`, [empId]
        );
        return { data: mapAdminEmployeeRow(result.rows[0]) };
      });
    } catch (err) {
      console.warn('DB createEmployee failed, fallback to JSON', err.message);
    }
  }
  // JSON fallback
  return withFileLock(EMPLOYEES_PATH, async () => {
    const fileData = await readJsonRaw(EMPLOYEES_PATH);
    if (!Array.isArray(fileData.employees)) fileData.employees = [];

    const seq = fileData._next_emp_seq || 1;
    const empId = `HR-EMP-${String(seq).padStart(5, '0')}`;
    fileData._next_emp_seq = seq + 1;

    const now = new Date().toISOString();
    const record = {
      id: empId,
      employee_name: data.employee_name || data.first_name,
      first_name: data.first_name || null,
      designation: data.designation || null,
      department: data.department || null,
      department_id: data.department || null,
      reports_to: data.reports_to || null,
      tg_username: data.custom_tg_username || null,
      tg_chat_id: null,
      itigris_user_id: null,
      company_email: data.company_email || null,
      image_url: data.image || null,
      frappe_user: null,
      date_of_birth: data.date_of_birth || null,
      date_of_joining: data.date_of_joining || null,
      gender: data.gender || null,
      shift_format: null,
      status: 'Active',
      enabled: true,
      frappe_id: empId,
      created_at: now,
      updated_at: now,
    };

    fileData.employees.push(record);
    await writeJsonFile(EMPLOYEES_PATH, fileData);
    return { data: mapAdminEmployeeRow(record) };
  });
}

/**
 * Update an employee (partial update).
 */
export async function updateEmployee(employeeId, data) {
  const fieldMap = {
    employee_name: 'employee_name',
    first_name: 'first_name',
    designation: 'designation',
    department: 'department',
    reports_to: 'reports_to',
    custom_tg_username: 'tg_username',
    company_email: 'company_email',
    image: 'image_url',
    date_of_birth: 'date_of_birth',
    date_of_joining: 'date_of_joining',
    gender: 'gender',
    status: 'status',
  };

  if (isDbConnected()) {
    try {
      const setClauses = [];
      const params = [];
      let paramIndex = 1;

      for (const [apiField, dbField] of Object.entries(fieldMap)) {
        if (data[apiField] !== undefined) {
          setClauses.push(`${dbField} = $${paramIndex}`);
          params.push(data[apiField]);
          paramIndex++;
        }
      }

      if (data.department !== undefined) {
        setClauses.push(`department_id = $${paramIndex}`);
        params.push(data.department);
        paramIndex++;
      }

      if (setClauses.length === 0) {
        return findEmployeeById(employeeId);
      }

      setClauses.push(`updated_at = now()`);
      params.push(employeeId);

      await query(
        `UPDATE dim_employees SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`,
        params
      );

      const result = await query(`SELECT * FROM dim_employees WHERE id = $1`, [employeeId]);
      if (!result || result.rows.length === 0) return { data: null };
      return { data: mapAdminEmployeeRow(result.rows[0]) };
    } catch (err) {
      console.warn('DB updateEmployee failed, fallback to JSON', err.message);
    }
  }
  // JSON fallback
  return withFileLock(EMPLOYEES_PATH, async () => {
    const fileData = await readJsonRaw(EMPLOYEES_PATH);
    if (!Array.isArray(fileData.employees)) return { data: null };

    const idx = fileData.employees.findIndex(e => e.id === employeeId);
    if (idx < 0) return { data: null };

    const emp = fileData.employees[idx];
    for (const [apiField, dbField] of Object.entries(fieldMap)) {
      if (data[apiField] !== undefined) {
        emp[dbField] = data[apiField];
      }
    }
    if (data.department !== undefined) {
      emp.department_id = data.department;
    }
    emp.updated_at = new Date().toISOString();

    fileData.employees[idx] = emp;
    await writeJsonFile(EMPLOYEES_PATH, fileData);
    return { data: mapAdminEmployeeRow(emp) };
  });
}

/**
 * Deactivate an employee (soft delete — sets status to 'Left').
 */
export async function deactivateEmployee(employeeId) {
  if (isDbConnected()) {
    try {
      await query(
        `UPDATE dim_employees SET status = 'Left', enabled = false, updated_at = now() WHERE id = $1`,
        [employeeId]
      );
      return { message: 'ok' };
    } catch (err) {
      console.warn('DB deactivateEmployee failed, fallback to JSON', err.message);
    }
  }
  return withFileLock(EMPLOYEES_PATH, async () => {
    const fileData = await readJsonRaw(EMPLOYEES_PATH);
    if (!Array.isArray(fileData.employees)) return { message: 'ok' };

    const idx = fileData.employees.findIndex(e => e.id === employeeId);
    if (idx >= 0) {
      fileData.employees[idx].status = 'Left';
      fileData.employees[idx].enabled = false;
      fileData.employees[idx].updated_at = new Date().toISOString();
      await writeJsonFile(EMPLOYEES_PATH, fileData);
    }
    return { message: 'ok' };
  });
}

/**
 * Update employee's Telegram chat ID (used during auth).
 */
export async function updateEmployeeChatId(employeeId, chatId) {
  if (isDbConnected()) {
    try {
      await query(
        `UPDATE dim_employees SET tg_chat_id = $2, updated_at = now() WHERE id = $1`,
        [employeeId, chatId]
      );
      return;
    } catch (err) {
      console.warn('DB updateEmployeeChatId failed, fallback to JSON', err.message);
    }
  }
  return withFileLock(EMPLOYEES_PATH, async () => {
    const fileData = await readJsonRaw(EMPLOYEES_PATH);
    if (!Array.isArray(fileData.employees)) return;

    const idx = fileData.employees.findIndex(e => e.id === employeeId);
    if (idx >= 0) {
      fileData.employees[idx].tg_chat_id = chatId;
      fileData.employees[idx].updated_at = new Date().toISOString();
      await writeJsonFile(EMPLOYEES_PATH, fileData);
    }
  });
}

/**
 * Get all active employees (for migration/validation).
 */
export async function getAllActiveEmployees() {
  if (isDbConnected()) {
    try {
      const result = await query(
        `SELECT * FROM dim_employees WHERE status = 'Active' ORDER BY employee_name`
      );
      if (!result) return [];
      return result.rows.map(mapEmployeeRow);
    } catch (err) {
      console.warn('DB getAllActiveEmployees failed, fallback to JSON', err.message);
    }
  }
  const employees = await readMergedEmployees();
  return employees
    .filter(e => e.status === 'Active')
    .sort((a, b) => (a.employee_name || '').localeCompare(b.employee_name || ''))
    .map(mapEmployeeRow);
}

/**
 * Get employee's itigris user ID.
 */
export async function getEmployeeItigrisId(employeeId) {
  if (isDbConnected()) {
    try {
      const result = await query(
        `SELECT itigris_user_id FROM dim_employees WHERE id = $1`,
        [employeeId]
      );
      if (!result || result.rows.length === 0) return null;
      return result.rows[0].itigris_user_id;
    } catch (err) {
      console.warn('DB getEmployeeItigrisId failed, fallback to JSON', err.message);
    }
  }
  const employees = await readMergedEmployees();
  const emp = employees.find(e => e.id === employeeId);
  return emp ? emp.itigris_user_id || null : null;
}

/**
 * Get employees with external IDs (itigris_user_id).
 */
export async function getEmployeesWithExternalIds() {
  if (isDbConnected()) {
    try {
      const result = await query(
        `SELECT id, employee_name, itigris_user_id, department, designation
         FROM dim_employees
         WHERE status = 'Active' AND itigris_user_id IS NOT NULL
         ORDER BY employee_name`
      );
      if (!result) return { data: [] };
      return {
        data: result.rows.map(row => ({
          name: row.id,
          employee_name: row.employee_name,
          custom_itigris_user_id: row.itigris_user_id,
          department: row.department,
          designation: row.designation,
        }))
      };
    } catch (err) {
      console.warn('DB getEmployeesWithExternalIds failed, fallback to JSON', err.message);
    }
  }
  const employees = await readMergedEmployees();
  return {
    data: employees
      .filter(e => e.status === 'Active' && e.itigris_user_id)
      .sort((a, b) => (a.employee_name || '').localeCompare(b.employee_name || ''))
      .map(e => ({
        name: e.id,
        employee_name: e.employee_name,
        custom_itigris_user_id: e.itigris_user_id,
        department: e.department,
        designation: e.designation,
      }))
  };
}

// ─── Department functions ───────────────────────────────────────────────────

/**
 * Get a single department by ID.
 */
export async function getDepartmentById(departmentId) {
  if (isDbConnected()) {
    try {
      const result = await query(
        `SELECT * FROM org_departments WHERE id = $1`,
        [departmentId]
      );
      if (!result || result.rows.length === 0) return { data: null };
      return { data: mapDepartmentRow(result.rows[0]) };
    } catch (err) {
      console.warn('DB getDepartmentById failed, fallback to JSON', err.message);
    }
  }
  const departments = await readJsonFile(DEPARTMENTS_PATH, 'departments');
  const found = departments.find(d => d.id === departmentId);
  return { data: found ? mapDepartmentRow(found) : null };
}

/**
 * Get all departments.
 * Returns Frappe-shaped response: { data: [departments] }
 */
export async function getAllDepartments() {
  if (isDbConnected()) {
    try {
      const result = await query(
        `SELECT * FROM org_departments WHERE enabled = true ORDER BY department_name`
      );
      if (!result) return { data: [] };
      return { data: result.rows.map(mapDepartmentRow) };
    } catch (err) {
      console.warn('DB getAllDepartments failed, fallback to JSON', err.message);
    }
  }
  const departments = await readJsonFile(DEPARTMENTS_PATH, 'departments');
  return {
    data: departments
      .filter(d => d.enabled !== false)
      .sort((a, b) => (a.department_name || '').localeCompare(b.department_name || ''))
      .map(mapDepartmentRow)
  };
}

/**
 * Get full org tree: departments + employees.
 * Returns { departments: [...], employees: [...] }
 */
export async function getDepartmentTree() {
  if (isDbConnected()) {
    try {
      const [deptResult, empResult] = await Promise.all([
        query(`SELECT * FROM org_departments WHERE enabled = true ORDER BY department_name`),
        query(`SELECT * FROM dim_employees WHERE status = 'Active' ORDER BY employee_name`),
      ]);

      const departments = deptResult ? deptResult.rows.map(mapDepartmentRow) : [];
      const employees = empResult ? empResult.rows.map(mapAdminEmployeeRow) : [];
      return { departments, employees };
    } catch (err) {
      console.warn('DB getDepartmentTree failed, fallback to JSON', err.message);
    }
  }
  const deptRaw = await readJsonFile(DEPARTMENTS_PATH, 'departments');
  const empRaw = await readMergedEmployees();
  const departments = deptRaw.filter(d => d.enabled !== false).map(mapDepartmentRow);
  const employees = empRaw.filter(e => e.status === 'Active').map(mapAdminEmployeeRow);
  return { departments, employees };
}

/**
 * Create a new department.
 * Returns Frappe-shaped response: { data: department }
 */
export async function createDepartment(data) {
  const deptId = `${data.department_name} - LR`;

  if (isDbConnected()) {
    try {
      await query(
        `INSERT INTO org_departments (id, department_name, parent_id, store_id, is_group, enabled)
         VALUES ($1, $2, $3, $4, $5, true)`,
        [
          deptId,
          data.department_name,
          data.parent_department || null,
          data.custom_store_id || null,
          data.is_group || false,
        ]
      );

      const result = await query(`SELECT * FROM org_departments WHERE id = $1`, [deptId]);
      if (!result || result.rows.length === 0) return { data: null };
      return { data: mapDepartmentRow(result.rows[0]) };
    } catch (err) {
      console.warn('DB createDepartment failed, fallback to JSON', err.message);
    }
  }
  // JSON fallback
  return withFileLock(DEPARTMENTS_PATH, async () => {
    const fileData = await readJsonRaw(DEPARTMENTS_PATH);
    if (!Array.isArray(fileData.departments)) fileData.departments = [];

    const now = new Date().toISOString();
    const record = {
      id: deptId,
      department_name: data.department_name,
      parent_id: data.parent_department || null,
      store_id: data.custom_store_id || null,
      is_group: data.is_group || false,
      enabled: true,
      created_at: now,
      updated_at: now,
    };

    fileData.departments.push(record);
    await writeJsonFile(DEPARTMENTS_PATH, fileData);
    return { data: mapDepartmentRow(record) };
  });
}

/**
 * Update a department (partial update).
 */
export async function updateDepartment(departmentId, data) {
  if (data.parent_department && data.parent_department === departmentId) {
    throw new Error('Department cannot be its own parent');
  }

  if (isDbConnected()) {
    try {
      const setClauses = [];
      const params = [];
      let paramIndex = 1;

      if (data.department_name !== undefined) {
        setClauses.push(`department_name = $${paramIndex}`);
        params.push(data.department_name);
        paramIndex++;
      }
      if (data.parent_department !== undefined) {
        setClauses.push(`parent_id = $${paramIndex}`);
        params.push(data.parent_department);
        paramIndex++;
      }
      if (data.custom_store_id !== undefined) {
        setClauses.push(`store_id = $${paramIndex}`);
        params.push(data.custom_store_id);
        paramIndex++;
      }

      if (setClauses.length === 0) {
        return getDepartmentById(departmentId);
      }

      setClauses.push(`updated_at = now()`);
      params.push(departmentId);

      await query(
        `UPDATE org_departments SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`,
        params
      );

      const result = await query(`SELECT * FROM org_departments WHERE id = $1`, [departmentId]);
      if (!result || result.rows.length === 0) return { data: null };
      return { data: mapDepartmentRow(result.rows[0]) };
    } catch (err) {
      console.warn('DB updateDepartment failed, fallback to JSON', err.message);
    }
  }
  // JSON fallback
  return withFileLock(DEPARTMENTS_PATH, async () => {
    const fileData = await readJsonRaw(DEPARTMENTS_PATH);
    if (!Array.isArray(fileData.departments)) return { data: null };

    const idx = fileData.departments.findIndex(d => d.id === departmentId);
    if (idx < 0) return { data: null };

    const dept = fileData.departments[idx];
    if (data.department_name !== undefined) dept.department_name = data.department_name;
    if (data.parent_department !== undefined) dept.parent_id = data.parent_department;
    if (data.custom_store_id !== undefined) dept.store_id = data.custom_store_id;
    dept.updated_at = new Date().toISOString();

    fileData.departments[idx] = dept;
    await writeJsonFile(DEPARTMENTS_PATH, fileData);
    return { data: mapDepartmentRow(dept) };
  });
}

/**
 * Delete a department (hard delete).
 */
export async function deleteDepartment(departmentId) {
  if (isDbConnected()) {
    try {
      await query(`DELETE FROM org_departments WHERE id = $1`, [departmentId]);
      return { message: 'ok' };
    } catch (err) {
      console.warn('DB deleteDepartment failed, fallback to JSON', err.message);
    }
  }
  return withFileLock(DEPARTMENTS_PATH, async () => {
    const fileData = await readJsonRaw(DEPARTMENTS_PATH);
    if (!Array.isArray(fileData.departments)) return { message: 'ok' };

    fileData.departments = fileData.departments.filter(d => d.id !== departmentId);
    await writeJsonFile(DEPARTMENTS_PATH, fileData);
    return { message: 'ok' };
  });
}

// ─── Designation functions ──────────────────────────────────────────────────

/**
 * Get all designations.
 * Returns Frappe-shaped response: { data: [{ name: "..." }] }
 */
export async function getAllDesignations() {
  if (isDbConnected()) {
    try {
      const result = await query(
        `SELECT name FROM org_designations ORDER BY name`
      );
      if (!result) return { data: [] };
      return { data: result.rows.map(row => ({ name: row.name })) };
    } catch (err) {
      console.warn('DB getAllDesignations failed, fallback to JSON', err.message);
    }
  }
  const designations = await readJsonFile(DESIGNATIONS_PATH, 'designations');
  return {
    data: designations
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      .map(d => ({ name: d.name }))
  };
}

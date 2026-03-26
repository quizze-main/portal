/**
 * RBAC Engine — replaces Frappe's loovis_get_employee_role custom method.
 *
 * Resolves employee roles, store access, and feature flags from PostgreSQL,
 * with automatic JSON file fallback when DB is not connected.
 *
 * Returns data in the EXACT same shape consumed by EmployeeProvider.tsx.
 */
import path from 'path';
import { isPrismaConnected as isDbConnected, rawQuery as query, withPrismaTransaction as withTransaction } from './prisma.js';
import { DATA_DIR, readJsonFile, readJsonRaw, writeJsonFile, withFileLock } from './json-storage.js';

const ROLES_PATH = path.join(DATA_DIR, 'org-roles.json');
const DEPARTMENTS_PATH = path.join(DATA_DIR, 'org-departments.json');

// ─── Helper ─────────────────────────────────────────────────────────────────

/**
 * Strip trailing "- LR" suffix from department/store names.
 * Matches the exact logic in internal-api.js lines 3828-3831.
 */
function stripLrSuffix(value) {
  const s = value != null ? String(value) : '';
  return s.replace(/\s*-\s*LR\s*$/i, '').trim();
}

// ─── Core RBAC Resolution ───────────────────────────────────────────────────

/**
 * Resolve employee's role and store access.
 *
 * Returns the EXACT shape consumed by the frontend:
 * {
 *   employee_id: 'HR-EMP-00138',
 *   loovis_role: 'LIS-R-00001',
 *   source: 'manual',
 *   stores: [
 *     { store_id: '1000000008', name: 'Клуб СПб', department_id: 'Клуб СПб - LR' }
 *   ]
 * }
 */
export async function resolveEmployeeRole(employeeId) {
  if (isDbConnected()) {
    try {
      const roleResult = await query(
        `SELECT er.role_id, er.source, r.level
         FROM rbac_employee_roles er
         JOIN rbac_roles r ON r.id = er.role_id
         WHERE er.employee_id = $1
         ORDER BY r.level DESC
         LIMIT 1`,
        [employeeId]
      );

      const role = roleResult?.rows?.[0] || null;

      const storesResult = await query(
        `SELECT sa.store_id, sa.department_id, d.department_name
         FROM rbac_store_access sa
         LEFT JOIN org_departments d ON sa.department_id = d.id
         WHERE sa.employee_id = $1`,
        [employeeId]
      );

      const stores = (storesResult?.rows || []).map(row => ({
        store_id: row.store_id,
        name: stripLrSuffix(row.department_name || row.department_id || row.store_id) || row.store_id,
        department_id: row.department_id || null,
      }));

      return {
        employee_id: employeeId,
        loovis_role: role ? role.role_id : null,
        source: role ? role.source : null,
        stores,
      };
    } catch (err) {
      console.warn('DB resolveEmployeeRole failed, fallback to JSON', err.message);
    }
  }

  // JSON fallback: simulate two JOINs in memory
  const rolesData = await readJsonRaw(ROLES_PATH);
  const departments = await readJsonFile(DEPARTMENTS_PATH, 'departments');

  // 1. Find highest-level role
  const empRoles = (rolesData.employee_roles || []).filter(er => er.employee_id === employeeId);
  let bestRole = null;
  for (const er of empRoles) {
    const roleDef = (rolesData.roles || []).find(r => r.id === er.role_id);
    if (roleDef && (!bestRole || roleDef.level > bestRole._level)) {
      bestRole = { role_id: er.role_id, source: er.source, _level: roleDef.level };
    }
  }

  // 2. Build stores list with department name join
  const storeEntries = (rolesData.store_access || []).filter(sa => sa.employee_id === employeeId);
  const stores = storeEntries.map(sa => {
    const dept = departments.find(d => d.id === sa.department_id);
    return {
      store_id: sa.store_id,
      name: stripLrSuffix(dept?.department_name || sa.department_id || sa.store_id) || sa.store_id,
      department_id: sa.department_id || null,
    };
  });

  return {
    employee_id: employeeId,
    loovis_role: bestRole ? bestRole.role_id : null,
    source: bestRole ? bestRole.source : null,
    stores,
  };
}

// ─── Role Management ────────────────────────────────────────────────────────

/**
 * Grant a role to an employee.
 */
export async function grantRole(employeeId, roleId, source = 'manual', grantedBy = null) {
  if (isDbConnected()) {
    try {
      await query(
        `INSERT INTO rbac_employee_roles (employee_id, role_id, source, granted_by, granted_at)
         VALUES ($1, $2, $3, $4, now())
         ON CONFLICT (employee_id, role_id) DO UPDATE SET
           source = EXCLUDED.source,
           granted_by = EXCLUDED.granted_by,
           granted_at = now()`,
        [employeeId, roleId, source, grantedBy]
      );
      return;
    } catch (err) {
      console.warn('DB grantRole failed, fallback to JSON', err.message);
    }
  }
  return withFileLock(ROLES_PATH, async () => {
    const data = await readJsonRaw(ROLES_PATH);
    if (!Array.isArray(data.employee_roles)) data.employee_roles = [];

    const idx = data.employee_roles.findIndex(
      er => er.employee_id === employeeId && er.role_id === roleId
    );
    const record = {
      employee_id: employeeId,
      role_id: roleId,
      source,
      granted_by: grantedBy,
      granted_at: new Date().toISOString(),
    };

    if (idx >= 0) data.employee_roles[idx] = record;
    else data.employee_roles.push(record);

    await writeJsonFile(ROLES_PATH, data);
  });
}

/**
 * Revoke a role from an employee.
 */
export async function revokeRole(employeeId, roleId) {
  if (isDbConnected()) {
    try {
      await query(
        `DELETE FROM rbac_employee_roles WHERE employee_id = $1 AND role_id = $2`,
        [employeeId, roleId]
      );
      return;
    } catch (err) {
      console.warn('DB revokeRole failed, fallback to JSON', err.message);
    }
  }
  return withFileLock(ROLES_PATH, async () => {
    const data = await readJsonRaw(ROLES_PATH);
    if (!Array.isArray(data.employee_roles)) return;

    data.employee_roles = data.employee_roles.filter(
      er => !(er.employee_id === employeeId && er.role_id === roleId)
    );
    await writeJsonFile(ROLES_PATH, data);
  });
}

/**
 * Get all roles for an employee.
 */
export async function getEmployeeRoles(employeeId) {
  if (isDbConnected()) {
    try {
      const result = await query(
        `SELECT er.*, r.name, r.description, r.level
         FROM rbac_employee_roles er
         JOIN rbac_roles r ON r.id = er.role_id
         WHERE er.employee_id = $1
         ORDER BY r.level DESC`,
        [employeeId]
      );
      return result?.rows || [];
    } catch (err) {
      console.warn('DB getEmployeeRoles failed, fallback to JSON', err.message);
    }
  }
  const data = await readJsonRaw(ROLES_PATH);
  const empRoles = (data.employee_roles || []).filter(er => er.employee_id === employeeId);
  return empRoles
    .map(er => {
      const roleDef = (data.roles || []).find(r => r.id === er.role_id);
      return { ...er, name: roleDef?.name, description: roleDef?.description, level: roleDef?.level || 0 };
    })
    .sort((a, b) => (b.level || 0) - (a.level || 0));
}

// ─── Store Access Management ────────────────────────────────────────────────

/**
 * Grant store access to an employee.
 */
export async function grantStoreAccess(employeeId, storeId, departmentId = null, source = 'manual') {
  if (isDbConnected()) {
    try {
      await query(
        `INSERT INTO rbac_store_access (employee_id, store_id, department_id, source)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (employee_id, store_id) DO UPDATE SET
           department_id = EXCLUDED.department_id,
           source = EXCLUDED.source`,
        [employeeId, storeId, departmentId, source]
      );
      return;
    } catch (err) {
      console.warn('DB grantStoreAccess failed, fallback to JSON', err.message);
    }
  }
  return withFileLock(ROLES_PATH, async () => {
    const data = await readJsonRaw(ROLES_PATH);
    if (!Array.isArray(data.store_access)) data.store_access = [];

    const idx = data.store_access.findIndex(
      sa => sa.employee_id === employeeId && sa.store_id === storeId
    );
    const record = { employee_id: employeeId, store_id: storeId, department_id: departmentId, source };

    if (idx >= 0) data.store_access[idx] = record;
    else data.store_access.push(record);

    await writeJsonFile(ROLES_PATH, data);
  });
}

/**
 * Revoke store access from an employee.
 */
export async function revokeStoreAccess(employeeId, storeId) {
  if (isDbConnected()) {
    try {
      await query(
        `DELETE FROM rbac_store_access WHERE employee_id = $1 AND store_id = $2`,
        [employeeId, storeId]
      );
      return;
    } catch (err) {
      console.warn('DB revokeStoreAccess failed, fallback to JSON', err.message);
    }
  }
  return withFileLock(ROLES_PATH, async () => {
    const data = await readJsonRaw(ROLES_PATH);
    if (!Array.isArray(data.store_access)) return;

    data.store_access = data.store_access.filter(
      sa => !(sa.employee_id === employeeId && sa.store_id === storeId)
    );
    await writeJsonFile(ROLES_PATH, data);
  });
}

/**
 * Replace all store access for an employee (used during sync).
 */
export async function replaceStoreAccess(employeeId, stores, source = 'frappe_sync') {
  if (isDbConnected()) {
    try {
      return await withTransaction(async (client) => {
        await client.query(
          `DELETE FROM rbac_store_access WHERE employee_id = $1`,
          [employeeId]
        );
        for (const store of stores) {
          await client.query(
            `INSERT INTO rbac_store_access (employee_id, store_id, department_id, source)
             VALUES ($1, $2, $3, $4)`,
            [employeeId, store.store_id, store.department_id || null, source]
          );
        }
      });
    } catch (err) {
      console.warn('DB replaceStoreAccess failed, fallback to JSON', err.message);
    }
  }
  // JSON fallback: atomic file write replaces transaction
  return withFileLock(ROLES_PATH, async () => {
    const data = await readJsonRaw(ROLES_PATH);
    if (!Array.isArray(data.store_access)) data.store_access = [];

    data.store_access = data.store_access.filter(sa => sa.employee_id !== employeeId);
    for (const store of stores) {
      data.store_access.push({
        employee_id: employeeId,
        store_id: store.store_id,
        department_id: store.department_id || null,
        source,
      });
    }
    await writeJsonFile(ROLES_PATH, data);
  });
}

// ─── Feature Flags ──────────────────────────────────────────────────────────

/**
 * Get all entries for a feature flag.
 */
export async function getFeatureFlags(flagName) {
  if (isDbConnected()) {
    try {
      const result = await query(
        `SELECT * FROM rbac_feature_flags WHERE flag_name = $1 AND enabled = true`,
        [flagName]
      );
      return result?.rows || [];
    } catch (err) {
      console.warn('DB getFeatureFlags failed, fallback to JSON', err.message);
    }
  }
  const data = await readJsonRaw(ROLES_PATH);
  return (data.feature_flags || []).filter(
    f => f.flag_name === flagName && f.enabled !== false
  );
}

/**
 * Check if a feature flag is enabled for a given scope.
 */
export async function isFeatureEnabled(flagName, { storeId, employeeId, roleId } = {}) {
  if (isDbConnected()) {
    try {
      const conditions = [`flag_name = $1`, `enabled = true`];
      const params = [flagName];
      let paramIndex = 2;

      const scopeChecks = [];
      if (storeId) {
        scopeChecks.push(`(scope_type = 'store_id' AND scope_value = $${paramIndex})`);
        params.push(storeId);
        paramIndex++;
      }
      if (employeeId) {
        scopeChecks.push(`(scope_type = 'employee_id' AND scope_value = $${paramIndex})`);
        params.push(employeeId);
        paramIndex++;
      }
      if (roleId) {
        scopeChecks.push(`(scope_type = 'role_id' AND scope_value = $${paramIndex})`);
        params.push(roleId);
        paramIndex++;
      }

      if (scopeChecks.length === 0) return false;

      conditions.push(`(${scopeChecks.join(' OR ')})`);

      const result = await query(
        `SELECT 1 FROM rbac_feature_flags WHERE ${conditions.join(' AND ')} LIMIT 1`,
        params
      );

      return result?.rows?.length > 0;
    } catch (err) {
      console.warn('DB isFeatureEnabled failed, fallback to JSON', err.message);
    }
  }
  // JSON fallback
  const data = await readJsonRaw(ROLES_PATH);
  const flags = (data.feature_flags || []).filter(
    f => f.flag_name === flagName && f.enabled !== false
  );

  return flags.some(f => {
    if (f.scope_type === 'store_id' && storeId) return f.scope_value === storeId;
    if (f.scope_type === 'employee_id' && employeeId) return f.scope_value === employeeId;
    if (f.scope_type === 'role_id' && roleId) return f.scope_value === roleId;
    return false;
  });
}

// ─── All Roles List ─────────────────────────────────────────────────────────

/**
 * Get all defined roles.
 */
export async function getAllRoles() {
  if (isDbConnected()) {
    try {
      const result = await query(
        `SELECT * FROM rbac_roles ORDER BY level`
      );
      return result?.rows || [];
    } catch (err) {
      console.warn('DB getAllRoles failed, fallback to JSON', err.message);
    }
  }
  const data = await readJsonRaw(ROLES_PATH);
  return (data.roles || []).sort((a, b) => (a.level || 0) - (b.level || 0));
}

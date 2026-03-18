#!/usr/bin/env node
/**
 * Migrate JSON file data into PostgreSQL.
 *
 * Reads data/org-*.json and data/user-settings.json, inserts into PG tables.
 * Idempotent: uses INSERT ... ON CONFLICT DO UPDATE.
 *
 * Requires DATABASE_URL and that migrations (012-015) have been applied.
 *
 * Usage: node --env-file=.env scripts/migrate-json-to-pg.js
 */
import pg from 'pg';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not configured');
  process.exit(1);
}

async function readJson(filename) {
  const filePath = path.join(DATA_DIR, filename);
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(await readFile(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

async function main() {
  console.log('🔄 Migrating JSON data → PostgreSQL...\n');

  const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 5 });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Designations
    const desigData = await readJson('org-designations.json');
    let desigCount = 0;
    if (desigData?.designations) {
      for (const d of desigData.designations) {
        await client.query(
          `INSERT INTO org_designations (name, category, is_leader)
           VALUES ($1, $2, $3)
           ON CONFLICT (name) DO UPDATE SET
             category = EXCLUDED.category,
             is_leader = EXCLUDED.is_leader,
             updated_at = now()`,
          [d.name, d.category || 'other', d.is_leader || false]
        );
        desigCount++;
      }
    }
    console.log(`  ✅ Designations: ${desigCount}`);

    // 2. Departments (two passes for parent_id FK)
    const deptData = await readJson('org-departments.json');
    let deptCount = 0;
    if (deptData?.departments) {
      // First pass: insert without parent_id
      for (const d of deptData.departments) {
        await client.query(
          `INSERT INTO org_departments (id, department_name, store_id, is_group, enabled)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO UPDATE SET
             department_name = EXCLUDED.department_name,
             store_id = EXCLUDED.store_id,
             is_group = EXCLUDED.is_group,
             enabled = EXCLUDED.enabled,
             updated_at = now()`,
          [d.id, d.department_name, d.store_id || null, d.is_group || false, d.enabled !== false]
        );
        deptCount++;
      }
      // Second pass: set parent_id
      for (const d of deptData.departments) {
        if (d.parent_id) {
          await client.query(
            `UPDATE org_departments SET parent_id = $2, updated_at = now() WHERE id = $1`,
            [d.id, d.parent_id]
          );
        }
      }
    }
    console.log(`  ✅ Departments: ${deptCount}`);

    // 3. Employees (two passes for reports_to FK)
    const empData = await readJson('org-employees.json');
    let empCount = 0;
    if (empData?.employees) {
      // First pass: insert without reports_to
      for (const emp of empData.employees) {
        await client.query(
          `INSERT INTO dim_employees (
            id, name, employee_name, first_name, designation, department, department_id,
            tg_username, itigris_user_id, company_email, image_url, frappe_user,
            tg_chat_id, date_of_birth, date_of_joining, gender, shift_format,
            status, frappe_id, enabled
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
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
            status = EXCLUDED.status,
            enabled = EXCLUDED.enabled,
            updated_at = now()`,
          [
            emp.id,
            emp.employee_name || emp.first_name,
            emp.employee_name || emp.first_name,
            emp.first_name || null,
            emp.designation || null,
            emp.department || null,
            emp.department_id || emp.department || null,
            emp.tg_username || null,
            emp.itigris_user_id || null,
            emp.company_email || null,
            emp.image_url || null,
            emp.frappe_user || null,
            emp.tg_chat_id || null,
            emp.date_of_birth || null,
            emp.date_of_joining || null,
            emp.gender || null,
            emp.shift_format || null,
            emp.status || 'Active',
            emp.frappe_id || emp.id,
            emp.enabled !== false,
          ]
        );
        empCount++;
      }
      // Second pass: reports_to
      for (const emp of empData.employees) {
        if (emp.reports_to) {
          await client.query(
            `UPDATE dim_employees SET reports_to = $2, updated_at = now() WHERE id = $1`,
            [emp.id, emp.reports_to]
          );
        }
      }

      // Update sequence
      if (empData._next_emp_seq) {
        await client.query(`SELECT setval('emp_id_seq', $1, false)`, [empData._next_emp_seq]);
      }
    }
    console.log(`  ✅ Employees: ${empCount}`);

    // 4. Roles data
    const rolesData = await readJson('org-roles.json');
    let roleCount = 0;
    let empRoleCount = 0;
    let storeAccessCount = 0;
    let flagCount = 0;

    if (rolesData) {
      // Roles
      for (const r of (rolesData.roles || [])) {
        await client.query(
          `INSERT INTO rbac_roles (id, name, description, level)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             description = EXCLUDED.description,
             level = EXCLUDED.level`,
          [r.id, r.name, r.description || null, r.level || 0]
        );
        roleCount++;
      }

      // Employee roles
      for (const er of (rolesData.employee_roles || [])) {
        await client.query(
          `INSERT INTO rbac_employee_roles (employee_id, role_id, source, granted_by, granted_at)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (employee_id, role_id) DO UPDATE SET
             source = EXCLUDED.source,
             granted_by = EXCLUDED.granted_by,
             granted_at = EXCLUDED.granted_at`,
          [er.employee_id, er.role_id, er.source || 'manual', er.granted_by || null, er.granted_at || new Date().toISOString()]
        );
        empRoleCount++;
      }

      // Store access
      for (const sa of (rolesData.store_access || [])) {
        await client.query(
          `INSERT INTO rbac_store_access (employee_id, store_id, department_id, source)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (employee_id, store_id) DO UPDATE SET
             department_id = EXCLUDED.department_id,
             source = EXCLUDED.source`,
          [sa.employee_id, sa.store_id, sa.department_id || null, sa.source || 'manual']
        );
        storeAccessCount++;
      }

      // Feature flags
      for (const f of (rolesData.feature_flags || [])) {
        await client.query(
          `INSERT INTO rbac_feature_flags (flag_name, scope_type, scope_value, enabled)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (flag_name, scope_type, scope_value) DO UPDATE SET
             enabled = EXCLUDED.enabled`,
          [f.flag_name, f.scope_type, f.scope_value, f.enabled !== false]
        );
        flagCount++;
      }
    }
    console.log(`  ✅ Roles: ${roleCount}`);
    console.log(`  ✅ Employee roles: ${empRoleCount}`);
    console.log(`  ✅ Store access: ${storeAccessCount}`);
    console.log(`  ✅ Feature flags: ${flagCount}`);

    // 5. User settings
    const settingsData = await readJson('user-settings.json');
    let settingsCount = 0;
    if (settingsData?.settings) {
      for (const s of settingsData.settings) {
        await client.query(
          `INSERT INTO user_settings (employee_id, variant, settings, updated_at)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (employee_id, variant) DO UPDATE SET
             settings = EXCLUDED.settings,
             updated_at = EXCLUDED.updated_at`,
          [s.employee_id, s.variant, JSON.stringify(s.settings || {}), s.updated_at || new Date().toISOString()]
        );
        settingsCount++;
      }
    }
    console.log(`  ✅ User settings: ${settingsCount}`);

    await client.query('COMMIT');

    console.log('\n' + '═'.repeat(50));
    console.log('✅ JSON → PostgreSQL migration complete!');
    console.log('═'.repeat(50));
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed, rolled back:', err.message);
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

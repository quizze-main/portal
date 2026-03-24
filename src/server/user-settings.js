/**
 * User Settings module — replaces Frappe's loovis_user_settings DocType.
 *
 * Stores dashboard layout preferences per employee per client variant.
 * Data shape matches the Frappe loovis_user_settings_get/upsert responses.
 *
 * Dual-persistence: PostgreSQL primary, JSON file fallback.
 */
import path from 'path';
import { isPrismaConnected as isDbConnected, rawQuery as query } from './prisma.js';
import { DATA_DIR, readJsonRaw, writeJsonFile, withFileLock } from './json-storage.js';

const SETTINGS_PATH = path.join(DATA_DIR, 'user-settings.json');

/**
 * Get user settings for an employee.
 * Returns the raw settings object (blobs, active_variant_mode, last_client).
 */
export async function getUserSettings(employeeId) {
  if (isDbConnected()) {
    try {
      const result = await query(
        `SELECT variant, settings, updated_at
         FROM user_settings
         WHERE employee_id = $1`,
        [employeeId]
      );

      if (!result || result.rows.length === 0) {
        return { employee_id: employeeId, blobs: [], active_variant_mode: '', last_client: '' };
      }

      const blobs = [];
      let active_variant_mode = '';
      let last_client = '';

      for (const row of result.rows) {
        if (row.variant === 'shared') {
          active_variant_mode = row.settings?.active_variant_mode || '';
          last_client = row.settings?.last_client || '';
        } else {
          blobs.push({
            variant: row.variant,
            ...row.settings,
            updatedAt: row.updated_at?.toISOString() || null,
          });
        }
      }

      return { employee_id: employeeId, blobs, active_variant_mode, last_client };
    } catch (err) {
      console.warn('DB getUserSettings failed, fallback to JSON', err.message);
    }
  }

  // JSON fallback
  const data = await readJsonRaw(SETTINGS_PATH);
  const rows = (data.settings || []).filter(s => s.employee_id === employeeId);

  if (rows.length === 0) {
    return { employee_id: employeeId, blobs: [], active_variant_mode: '', last_client: '' };
  }

  const blobs = [];
  let active_variant_mode = '';
  let last_client = '';

  for (const row of rows) {
    if (row.variant === 'shared') {
      active_variant_mode = row.settings?.active_variant_mode || '';
      last_client = row.settings?.last_client || '';
    } else {
      blobs.push({
        variant: row.variant,
        ...row.settings,
        updatedAt: row.updated_at || null,
      });
    }
  }

  return { employee_id: employeeId, blobs, active_variant_mode, last_client };
}

/**
 * Upsert user settings for an employee.
 * Stores blobs per variant and shared settings separately.
 */
export async function upsertUserSettings(employeeId, { blobs = [], active_variant_mode = '', last_client = '' }) {
  if (isDbConnected()) {
    try {
      await query(
        `INSERT INTO user_settings (employee_id, variant, settings, updated_at)
         VALUES ($1, 'shared', $2, now())
         ON CONFLICT (employee_id, variant) DO UPDATE SET
           settings = EXCLUDED.settings,
           updated_at = now()`,
        [employeeId, JSON.stringify({ active_variant_mode, last_client })]
      );

      for (const blob of blobs) {
        const variant = blob.variant || 'shared';
        if (variant === 'shared') continue;

        const { variant: _v, ...settingsData } = blob;
        await query(
          `INSERT INTO user_settings (employee_id, variant, settings, updated_at)
           VALUES ($1, $2, $3, now())
           ON CONFLICT (employee_id, variant) DO UPDATE SET
             settings = EXCLUDED.settings,
             updated_at = now()`,
          [employeeId, variant, JSON.stringify(settingsData)]
        );
      }

      return getUserSettings(employeeId);
    } catch (err) {
      console.warn('DB upsertUserSettings failed, fallback to JSON', err.message);
    }
  }

  // JSON fallback
  return withFileLock(SETTINGS_PATH, async () => {
    const data = await readJsonRaw(SETTINGS_PATH);
    if (!Array.isArray(data.settings)) data.settings = [];

    const now = new Date().toISOString();

    // Upsert shared variant
    const sharedIdx = data.settings.findIndex(
      s => s.employee_id === employeeId && s.variant === 'shared'
    );
    const sharedRecord = {
      employee_id: employeeId,
      variant: 'shared',
      settings: { active_variant_mode, last_client },
      updated_at: now,
    };
    if (sharedIdx >= 0) data.settings[sharedIdx] = sharedRecord;
    else data.settings.push(sharedRecord);

    // Upsert each variant blob
    for (const blob of blobs) {
      const variant = blob.variant || 'shared';
      if (variant === 'shared') continue;

      const { variant: _v, ...settingsData } = blob;
      const idx = data.settings.findIndex(
        s => s.employee_id === employeeId && s.variant === variant
      );
      const record = {
        employee_id: employeeId,
        variant,
        settings: settingsData,
        updated_at: now,
      };
      if (idx >= 0) data.settings[idx] = record;
      else data.settings.push(record);
    }

    await writeJsonFile(SETTINGS_PATH, data);
    return getUserSettings(employeeId);
  });
}

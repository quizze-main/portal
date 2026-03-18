import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import logger, { loggerWithUser } from './logger.js';
import { requireAuth } from './requireAuth.js';
import { isDbConnected, query } from './db.js';
import { getEmployeeScheduleSummary, getBranchSalaryData } from './shift-schedule-helpers.js';
import * as orgData from './org-data.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../../data');
const ENTRIES_PATH = path.join(DATA_DIR, 'shift-entries.json');
const TEMPLATES_PATH = path.join(DATA_DIR, 'shift-templates.json');

const VALID_SHIFT_TYPES = ['work', 'day_off', 'vacation', 'sick', 'extra_shift', 'day_off_lieu', 'absent'];

const REQUIREMENTS_PATH = path.join(DATA_DIR, 'staffing-requirements.json');

// ─── Storage helpers (dual-read: DB + JSON fallback) ───

async function readEntriesFromJson(branchId, dateFrom, dateTo) {
  try {
    if (!existsSync(ENTRIES_PATH)) return [];
    const raw = await readFile(ENTRIES_PATH, 'utf-8');
    const data = JSON.parse(raw);
    const all = Array.isArray(data.entries) ? data.entries : [];
    return all.filter(e =>
      e.branch_id === branchId && e.date >= dateFrom && e.date <= dateTo
    );
  } catch {
    return [];
  }
}

async function readEntriesFromDb(branchId, dateFrom, dateTo) {
  const result = await query(`
    SELECT id, employee_id, branch_id, date::text, shift_type,
           shift_number, time_start::text, time_end::text, note,
           created_by, created_at, updated_at
    FROM shift_entries
    WHERE branch_id = $1 AND date >= $2 AND date <= $3
    ORDER BY employee_id, date
  `, [branchId, dateFrom, dateTo]);
  return result?.rows || [];
}

async function readEntries(branchId, dateFrom, dateTo) {
  if (isDbConnected()) {
    try {
      return await readEntriesFromDb(branchId, dateFrom, dateTo);
    } catch (err) {
      logger.warn('DB readEntries failed, falling back to JSON', { error: err.message });
    }
  }
  return readEntriesFromJson(branchId, dateFrom, dateTo);
}

async function upsertEntryDb(entry) {
  const result = await query(`
    INSERT INTO shift_entries (id, employee_id, branch_id, date, shift_type, shift_number, time_start, time_end, note, created_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    ON CONFLICT (employee_id, date) DO UPDATE SET
      shift_type = EXCLUDED.shift_type,
      shift_number = EXCLUDED.shift_number,
      time_start = EXCLUDED.time_start,
      time_end = EXCLUDED.time_end,
      note = EXCLUDED.note,
      branch_id = EXCLUDED.branch_id,
      updated_at = now()
    RETURNING id, employee_id, branch_id, date::text, shift_type, shift_number,
              time_start::text, time_end::text, note, created_by, created_at, updated_at
  `, [
    entry.id || crypto.randomUUID(),
    entry.employee_id,
    entry.branch_id,
    entry.date,
    entry.shift_type,
    entry.shift_number || null,
    entry.time_start || null,
    entry.time_end || null,
    entry.note || '',
    entry.created_by || null,
  ]);
  return result?.rows?.[0];
}

async function upsertEntryJson(entry) {
  if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true });
  let data = { entries: [] };
  try {
    if (existsSync(ENTRIES_PATH)) {
      data = JSON.parse(await readFile(ENTRIES_PATH, 'utf-8'));
      if (!Array.isArray(data.entries)) data.entries = [];
    }
  } catch { /* ignore */ }

  const now = new Date().toISOString();
  const idx = data.entries.findIndex(e => e.employee_id === entry.employee_id && e.date === entry.date);
  const record = {
    id: idx >= 0 ? data.entries[idx].id : (entry.id || crypto.randomUUID()),
    employee_id: entry.employee_id,
    branch_id: entry.branch_id,
    date: entry.date,
    shift_type: entry.shift_type,
    shift_number: entry.shift_number || null,
    time_start: entry.time_start || null,
    time_end: entry.time_end || null,
    note: entry.note || '',
    created_by: entry.created_by || null,
    created_at: idx >= 0 ? data.entries[idx].created_at : now,
    updated_at: now,
  };

  if (idx >= 0) data.entries[idx] = record;
  else data.entries.push(record);

  await writeFile(ENTRIES_PATH, JSON.stringify(data, null, 2), 'utf-8');
  return record;
}

async function upsertEntry(entry) {
  if (isDbConnected()) {
    try {
      return await upsertEntryDb(entry);
    } catch (err) {
      logger.warn('DB upsertEntry failed, falling back to JSON', { error: err.message });
    }
  }
  return upsertEntryJson(entry);
}

async function deleteEntryDb(employeeId, date) {
  await query('DELETE FROM shift_entries WHERE employee_id = $1 AND date = $2', [employeeId, date]);
}

async function deleteEntryJson(employeeId, date) {
  if (!existsSync(ENTRIES_PATH)) return;
  try {
    const data = JSON.parse(await readFile(ENTRIES_PATH, 'utf-8'));
    if (!Array.isArray(data.entries)) return;
    data.entries = data.entries.filter(e => !(e.employee_id === employeeId && e.date === date));
    await writeFile(ENTRIES_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch { /* ignore */ }
}

async function deleteEntry(employeeId, date) {
  if (isDbConnected()) {
    try {
      return await deleteEntryDb(employeeId, date);
    } catch (err) {
      logger.warn('DB deleteEntry failed, falling back to JSON', { error: err.message });
    }
  }
  return deleteEntryJson(employeeId, date);
}

// ─── Templates ───

async function readTemplatesFromDb(branchId) {
  const result = await query(`
    SELECT id, name, pattern_type, cycle_days, branch_id, created_by, created_at, updated_at
    FROM shift_templates
    WHERE branch_id IS NULL OR branch_id = $1
    ORDER BY name
  `, [branchId || '']);
  return result?.rows || [];
}

async function readTemplatesFromJson(branchId) {
  try {
    if (!existsSync(TEMPLATES_PATH)) return [];
    const raw = await readFile(TEMPLATES_PATH, 'utf-8');
    const data = JSON.parse(raw);
    const all = Array.isArray(data.templates) ? data.templates : [];
    return all.filter(t => !t.branch_id || t.branch_id === branchId);
  } catch {
    return [];
  }
}

async function readTemplates(branchId) {
  if (isDbConnected()) {
    try {
      return await readTemplatesFromDb(branchId);
    } catch (err) {
      logger.warn('DB readTemplates failed, falling back to JSON', { error: err.message });
    }
  }
  return readTemplatesFromJson(branchId);
}

async function createTemplateDb(template) {
  const result = await query(`
    INSERT INTO shift_templates (id, name, pattern_type, cycle_days, branch_id, created_by)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [
    template.id || crypto.randomUUID(),
    template.name,
    template.pattern_type,
    JSON.stringify(template.cycle_days),
    template.branch_id || null,
    template.created_by || null,
  ]);
  return result?.rows?.[0];
}

async function deleteTemplateDb(id) {
  await query('DELETE FROM shift_templates WHERE id = $1', [id]);
}

// ─── Helpers ───

function getMonthRange(month) {
  // month = "YYYY-MM"
  const [year, m] = month.split('-').map(Number);
  const firstDay = `${month}-01`;
  const lastDay = new Date(year, m, 0).getDate();
  const lastDate = `${month}-${String(lastDay).padStart(2, '0')}`;
  return { firstDay, lastDate, daysInMonth: lastDay };
}

// ─── Routes ───

export function setupShiftScheduleRoutes(app) {

  // GET /api/shift-schedule — entries for a branch + month
  app.get('/api/shift-schedule', requireAuth, async (req, res) => {
    try {
      const { branch_id, month } = req.query;
      if (!branch_id || !month) {
        return res.status(400).json({ error: 'branch_id and month (YYYY-MM) required' });
      }
      const { firstDay, lastDate } = getMonthRange(month);
      const entries = await readEntries(branch_id, firstDay, lastDate);
      res.json({ entries, month, branch_id });
    } catch (err) {
      loggerWithUser.error(req, 'shift-schedule GET error', { error: err.message });
      res.status(500).json({ error: 'Failed to read shift schedule' });
    }
  });

  // PUT /api/shift-schedule/entry — upsert single cell
  app.put('/api/shift-schedule/entry', requireAuth, async (req, res) => {
    try {
      const { employee_id, branch_id, date, shift_type, shift_number, time_start, time_end, note } = req.body;
      if (!employee_id || !branch_id || !date || !shift_type) {
        return res.status(400).json({ error: 'employee_id, branch_id, date, shift_type required' });
      }
      if (!VALID_SHIFT_TYPES.includes(shift_type)) {
        return res.status(400).json({ error: `shift_type must be one of: ${VALID_SHIFT_TYPES.join(', ')}` });
      }

      const entry = await upsertEntry({
        employee_id, branch_id, date, shift_type,
        shift_number: shift_number || null,
        time_start: time_start || null,
        time_end: time_end || null,
        note: note || '',
        created_by: req.user?.employeename || null,
      });

      res.json({ entry });
    } catch (err) {
      loggerWithUser.error(req, 'shift-schedule PUT entry error', { error: err.message });
      res.status(500).json({ error: 'Failed to upsert shift entry' });
    }
  });

  // POST /api/shift-schedule/bulk — bulk upsert (max 200)
  app.post('/api/shift-schedule/bulk', requireAuth, async (req, res) => {
    try {
      const { entries } = req.body;
      if (!Array.isArray(entries) || entries.length === 0) {
        return res.status(400).json({ error: 'entries array required' });
      }
      if (entries.length > 200) {
        return res.status(400).json({ error: 'Max 200 entries per request' });
      }

      let created = 0, updated = 0;
      const createdBy = req.user?.employeename || null;

      for (const e of entries) {
        if (!e.employee_id || !e.branch_id || !e.date || !e.shift_type) continue;
        if (!VALID_SHIFT_TYPES.includes(e.shift_type)) continue;

        // Check if exists to track created vs updated
        if (isDbConnected()) {
          const existing = await query(
            'SELECT id FROM shift_entries WHERE employee_id = $1 AND date = $2',
            [e.employee_id, e.date]
          );
          if (existing?.rows?.length > 0) updated++;
          else created++;
        }

        await upsertEntry({ ...e, created_by: createdBy });
      }

      res.json({ created, updated, total: created + updated });
    } catch (err) {
      loggerWithUser.error(req, 'shift-schedule bulk error', { error: err.message });
      res.status(500).json({ error: 'Failed to bulk upsert shift entries' });
    }
  });

  // DELETE /api/shift-schedule/entry — delete single entry
  app.delete('/api/shift-schedule/entry', requireAuth, async (req, res) => {
    try {
      const { employee_id, date } = req.query;
      if (!employee_id || !date) {
        return res.status(400).json({ error: 'employee_id and date required' });
      }
      await deleteEntry(employee_id, date);
      res.json({ ok: true });
    } catch (err) {
      loggerWithUser.error(req, 'shift-schedule DELETE entry error', { error: err.message });
      res.status(500).json({ error: 'Failed to delete shift entry' });
    }
  });

  // GET /api/shift-schedule/templates
  app.get('/api/shift-schedule/templates', requireAuth, async (req, res) => {
    try {
      const { branch_id } = req.query;
      const templates = await readTemplates(branch_id);
      res.json({ templates });
    } catch (err) {
      loggerWithUser.error(req, 'shift-schedule templates GET error', { error: err.message });
      res.status(500).json({ error: 'Failed to read templates' });
    }
  });

  // POST /api/shift-schedule/templates — create template
  app.post('/api/shift-schedule/templates', requireAuth, async (req, res) => {
    try {
      const { name, pattern_type, cycle_days, branch_id } = req.body;
      if (!name || !pattern_type || !Array.isArray(cycle_days) || cycle_days.length === 0) {
        return res.status(400).json({ error: 'name, pattern_type, cycle_days required' });
      }

      if (isDbConnected()) {
        const template = await createTemplateDb({
          name, pattern_type, cycle_days, branch_id,
          created_by: req.user?.employeename || null,
        });
        return res.status(201).json({ template });
      }

      // JSON fallback
      if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true });
      let data = { templates: [] };
      try {
        if (existsSync(TEMPLATES_PATH)) {
          data = JSON.parse(await readFile(TEMPLATES_PATH, 'utf-8'));
          if (!Array.isArray(data.templates)) data.templates = [];
        }
      } catch { /* ignore */ }

      const template = {
        id: crypto.randomUUID(),
        name, pattern_type, cycle_days,
        branch_id: branch_id || null,
        created_by: req.user?.employeename || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      data.templates.push(template);
      await writeFile(TEMPLATES_PATH, JSON.stringify(data, null, 2), 'utf-8');
      res.status(201).json({ template });
    } catch (err) {
      loggerWithUser.error(req, 'shift-schedule templates POST error', { error: err.message });
      res.status(500).json({ error: 'Failed to create template' });
    }
  });

  // DELETE /api/shift-schedule/templates/:id
  app.delete('/api/shift-schedule/templates/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      if (isDbConnected()) {
        await deleteTemplateDb(id);
      } else {
        // JSON fallback
        if (existsSync(TEMPLATES_PATH)) {
          const data = JSON.parse(await readFile(TEMPLATES_PATH, 'utf-8'));
          if (Array.isArray(data.templates)) {
            data.templates = data.templates.filter(t => t.id !== id);
            await writeFile(TEMPLATES_PATH, JSON.stringify(data, null, 2), 'utf-8');
          }
        }
      }
      res.json({ ok: true });
    } catch (err) {
      loggerWithUser.error(req, 'shift-schedule templates DELETE error', { error: err.message });
      res.status(500).json({ error: 'Failed to delete template' });
    }
  });

  // POST /api/shift-schedule/auto-fill — auto-fill month with template
  app.post('/api/shift-schedule/auto-fill', requireAuth, async (req, res) => {
    try {
      const { employee_id, branch_id, month, template_id, start_offset = 0, preserve_special = true } = req.body;
      if (!employee_id || !branch_id || !month || !template_id) {
        return res.status(400).json({ error: 'employee_id, branch_id, month, template_id required' });
      }

      // Load template
      const templates = await readTemplates(branch_id);
      const template = templates.find(t => t.id === template_id);
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      const cycleDays = template.cycle_days;
      const { firstDay, lastDate, daysInMonth } = getMonthRange(month);

      // Load existing entries to preserve vacation/sick if requested
      let existingEntries = [];
      if (preserve_special) {
        existingEntries = await readEntries(branch_id, firstDay, lastDate);
        existingEntries = existingEntries.filter(e =>
          e.employee_id === employee_id &&
          ['vacation', 'sick', 'day_off_lieu', 'absent'].includes(e.shift_type)
        );
      }
      const preservedDates = new Set(existingEntries.map(e => e.date));

      // Generate entries
      const entries = [];
      const createdBy = req.user?.employeename || null;
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${month}-${String(day).padStart(2, '0')}`;
        if (preservedDates.has(dateStr)) continue;

        const cycleIdx = (day - 1 + Number(start_offset)) % cycleDays.length;
        const cycleDay = cycleDays[cycleIdx];

        entries.push({
          employee_id,
          branch_id,
          date: dateStr,
          shift_type: cycleDay.shift_type,
          shift_number: cycleDay.shift_number || null,
          time_start: cycleDay.time_start || null,
          time_end: cycleDay.time_end || null,
          created_by: createdBy,
        });
      }

      // Bulk upsert
      let created = 0, updated = 0;
      for (const e of entries) {
        if (isDbConnected()) {
          const existing = await query(
            'SELECT id FROM shift_entries WHERE employee_id = $1 AND date = $2',
            [e.employee_id, e.date]
          );
          if (existing?.rows?.length > 0) updated++;
          else created++;
        }
        await upsertEntry(e);
      }

      loggerWithUser.info(req, 'shift-schedule auto-fill', {
        employee_id, month, template: template.name, created, updated,
      });

      res.json({ created, updated, total: created + updated });
    } catch (err) {
      loggerWithUser.error(req, 'shift-schedule auto-fill error', { error: err.message });
      res.status(500).json({ error: 'Failed to auto-fill schedule' });
    }
  });

  // POST /api/shift-schedule/copy-week — copy one week to another
  app.post('/api/shift-schedule/copy-week', requireAuth, async (req, res) => {
    try {
      const { branch_id, employee_id, source_start, target_start } = req.body;
      if (!branch_id || !source_start || !target_start) {
        return res.status(400).json({ error: 'branch_id, source_start, target_start required' });
      }

      // Calculate source week range (7 days)
      const sourceDate = new Date(source_start);
      const targetDate = new Date(target_start);
      const sourceDates = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(sourceDate);
        d.setDate(d.getDate() + i);
        sourceDates.push(d.toISOString().split('T')[0]);
      }

      const sourceFrom = sourceDates[0];
      const sourceTo = sourceDates[6];

      // Read source entries
      let sourceEntries = await readEntries(branch_id, sourceFrom, sourceTo);
      if (employee_id) {
        sourceEntries = sourceEntries.filter(e => e.employee_id === employee_id);
      }

      // Generate target entries
      const entries = [];
      const createdBy = req.user?.employeename || null;
      for (const se of sourceEntries) {
        const sourceDay = new Date(se.date);
        const dayOffset = Math.round((sourceDay - sourceDate) / (1000 * 60 * 60 * 24));
        const targetDay = new Date(targetDate);
        targetDay.setDate(targetDay.getDate() + dayOffset);
        const targetDateStr = targetDay.toISOString().split('T')[0];

        entries.push({
          employee_id: se.employee_id,
          branch_id,
          date: targetDateStr,
          shift_type: se.shift_type,
          shift_number: se.shift_number,
          time_start: se.time_start,
          time_end: se.time_end,
          note: se.note,
          created_by: createdBy,
        });
      }

      let created = 0, updated = 0;
      for (const e of entries) {
        if (isDbConnected()) {
          const existing = await query(
            'SELECT id FROM shift_entries WHERE employee_id = $1 AND date = $2',
            [e.employee_id, e.date]
          );
          if (existing?.rows?.length > 0) updated++;
          else created++;
        }
        await upsertEntry(e);
      }

      loggerWithUser.info(req, 'shift-schedule copy-week', {
        branch_id, source_start, target_start, employee_id, created, updated,
      });

      res.json({ created, updated, total: created + updated });
    } catch (err) {
      loggerWithUser.error(req, 'shift-schedule copy-week error', { error: err.message });
      res.status(500).json({ error: 'Failed to copy week' });
    }
  });

  // ─── Staffing Requirements ───

  // GET /api/shift-schedule/requirements?branch_id=X
  app.get('/api/shift-schedule/requirements', requireAuth, async (req, res) => {
    try {
      const { branch_id } = req.query;
      if (!branch_id) return res.status(400).json({ error: 'branch_id required' });

      const requirements = await readRequirements(branch_id);
      res.json({ requirements });
    } catch (err) {
      loggerWithUser.error(req, 'staffing-requirements GET error', { error: err.message });
      res.status(500).json({ error: 'Failed to read staffing requirements' });
    }
  });

  // PUT /api/shift-schedule/requirements — upsert one requirement
  app.put('/api/shift-schedule/requirements', requireAuth, async (req, res) => {
    try {
      const { branch_id, designation, day_of_week, required_count } = req.body;
      if (!branch_id || !designation || required_count == null) {
        return res.status(400).json({ error: 'branch_id, designation, required_count required' });
      }
      const dow = day_of_week != null ? Number(day_of_week) : null;
      if (dow !== null && (dow < 0 || dow > 6)) {
        return res.status(400).json({ error: 'day_of_week must be 0-6 (Mon-Sun) or null' });
      }

      const requirement = await upsertRequirement({
        branch_id,
        designation,
        day_of_week: dow,
        required_count: Number(required_count),
        created_by: req.user?.employeename || null,
      });
      res.json({ requirement });
    } catch (err) {
      loggerWithUser.error(req, 'staffing-requirements PUT error', { error: err.message });
      res.status(500).json({ error: 'Failed to upsert staffing requirement' });
    }
  });

  // DELETE /api/shift-schedule/requirements/:id
  app.delete('/api/shift-schedule/requirements/:id', requireAuth, async (req, res) => {
    try {
      await deleteRequirement(req.params.id);
      res.json({ ok: true });
    } catch (err) {
      loggerWithUser.error(req, 'staffing-requirements DELETE error', { error: err.message });
      res.status(500).json({ error: 'Failed to delete staffing requirement' });
    }
  });

  // ─── Schedule Integration Endpoints ───

  // GET /api/shift-schedule/employee-summary?employee_id=X&month=YYYY-MM
  app.get('/api/shift-schedule/employee-summary', requireAuth, async (req, res) => {
    try {
      const { employee_id, month } = req.query;
      if (!employee_id || !month) {
        return res.status(400).json({ error: 'employee_id and month (YYYY-MM) required' });
      }
      const [y, m] = month.split('-').map(Number);
      if (!y || !m) return res.status(400).json({ error: 'Invalid month format, use YYYY-MM' });

      const lastDay = new Date(y, m, 0).getDate();
      const dateFrom = `${month}-01`;
      const dateTo = `${month}-${String(lastDay).padStart(2, '0')}`;

      const summary = await getEmployeeScheduleSummary(employee_id, dateFrom, dateTo);
      res.json({ summary, month, employee_id });
    } catch (err) {
      loggerWithUser.error(req, 'employee-summary GET error', { error: err.message });
      res.status(500).json({ error: 'Failed to get employee schedule summary' });
    }
  });

  // GET /api/shift-schedule/salary-data?branch_id=X&month=YYYY-MM
  app.get('/api/shift-schedule/salary-data', requireAuth, async (req, res) => {
    try {
      const { branch_id, month } = req.query;
      if (!branch_id || !month) {
        return res.status(400).json({ error: 'branch_id and month (YYYY-MM) required' });
      }
      const [y, m] = month.split('-').map(Number);
      if (!y || !m) return res.status(400).json({ error: 'Invalid month format, use YYYY-MM' });

      const lastDay = new Date(y, m, 0).getDate();
      const monthStart = `${month}-01`;
      const monthEnd = `${month}-${String(lastDay).padStart(2, '0')}`;

      const data = await getBranchSalaryData(branch_id, monthStart, monthEnd);
      res.json({ data, month, branch_id });
    } catch (err) {
      loggerWithUser.error(req, 'salary-data GET error', { error: err.message });
      res.status(500).json({ error: 'Failed to get salary schedule data' });
    }
  });

  // GET /api/shift-schedule/day-crew?branch_id=X&date=YYYY-MM-DD
  // Returns employees working on a specific date (shift_type: work or extra_shift)
  app.get('/api/shift-schedule/day-crew', requireAuth, async (req, res) => {
    try {
      const { branch_id, date } = req.query;
      if (!branch_id || !date) {
        return res.status(400).json({ error: 'branch_id and date (YYYY-MM-DD) required' });
      }

      // Get all shift entries for this date
      const entries = await readEntries(branch_id, date, date);
      const workingEntries = entries.filter(e =>
        e.shift_type === 'work' || e.shift_type === 'extra_shift'
      );

      if (workingEntries.length === 0) {
        return res.json({ crew: [], date, branch_id });
      }

      // Resolve employee names
      let employeeMap = {};
      try {
        const employees = await orgData.getEmployeesByStoreIds([String(branch_id)]);
        for (const emp of employees) {
          employeeMap[emp.name] = {
            employee_name: emp.employee_name,
            image: emp.image || null,
            designation: emp.designation || null,
          };
        }
      } catch (err) {
        loggerWithUser.warn(req, 'day-crew: failed to resolve employee names', { error: err.message });
      }

      const crew = workingEntries.map(e => ({
        employee_id: e.employee_id,
        employee_name: employeeMap[e.employee_id]?.employee_name || e.employee_id,
        image: employeeMap[e.employee_id]?.image || null,
        designation: employeeMap[e.employee_id]?.designation || null,
        shift_type: e.shift_type,
        shift_number: e.shift_number || null,
        time_start: e.time_start || null,
        time_end: e.time_end || null,
      }));

      res.json({ crew, date, branch_id });
    } catch (err) {
      loggerWithUser.error(req, 'day-crew GET error', { error: err.message });
      res.status(500).json({ error: 'Failed to get day crew data' });
    }
  });
}

// ─── Staffing Requirements Storage ───

async function readRequirementsFromDb(branchId) {
  const result = await query(`
    SELECT id, branch_id, designation, day_of_week, required_count,
           created_by, created_at, updated_at
    FROM staffing_requirements
    WHERE branch_id = $1
    ORDER BY designation, day_of_week
  `, [branchId]);
  return result?.rows || [];
}

async function readRequirementsFromJson(branchId) {
  try {
    if (!existsSync(REQUIREMENTS_PATH)) return [];
    const raw = await readFile(REQUIREMENTS_PATH, 'utf-8');
    const data = JSON.parse(raw);
    const all = Array.isArray(data.requirements) ? data.requirements : [];
    return all.filter(r => r.branch_id === branchId);
  } catch {
    return [];
  }
}

async function readRequirements(branchId) {
  if (isDbConnected()) {
    try {
      return await readRequirementsFromDb(branchId);
    } catch (err) {
      logger.warn('DB readRequirements failed, falling back to JSON', { error: err.message });
    }
  }
  return readRequirementsFromJson(branchId);
}

async function upsertRequirementDb(req) {
  const result = await query(`
    INSERT INTO staffing_requirements (id, branch_id, designation, day_of_week, required_count, created_by)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (branch_id, designation, COALESCE(day_of_week, -1)) DO UPDATE SET
      required_count = EXCLUDED.required_count,
      updated_at = now()
    RETURNING *
  `, [
    crypto.randomUUID(),
    req.branch_id,
    req.designation,
    req.day_of_week,
    req.required_count,
    req.created_by || null,
  ]);
  return result?.rows?.[0];
}

async function upsertRequirementJson(req) {
  if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true });
  let data = { requirements: [] };
  try {
    if (existsSync(REQUIREMENTS_PATH)) {
      data = JSON.parse(await readFile(REQUIREMENTS_PATH, 'utf-8'));
      if (!Array.isArray(data.requirements)) data.requirements = [];
    }
  } catch { /* ignore */ }

  const now = new Date().toISOString();
  const matchKey = r =>
    r.branch_id === req.branch_id &&
    r.designation === req.designation &&
    (r.day_of_week ?? null) === (req.day_of_week ?? null);

  const idx = data.requirements.findIndex(matchKey);
  const record = {
    id: idx >= 0 ? data.requirements[idx].id : crypto.randomUUID(),
    branch_id: req.branch_id,
    designation: req.designation,
    day_of_week: req.day_of_week ?? null,
    required_count: req.required_count,
    created_by: req.created_by || null,
    created_at: idx >= 0 ? data.requirements[idx].created_at : now,
    updated_at: now,
  };

  if (idx >= 0) data.requirements[idx] = record;
  else data.requirements.push(record);

  await writeFile(REQUIREMENTS_PATH, JSON.stringify(data, null, 2), 'utf-8');
  return record;
}

async function upsertRequirement(req) {
  if (isDbConnected()) {
    try {
      return await upsertRequirementDb(req);
    } catch (err) {
      logger.warn('DB upsertRequirement failed, falling back to JSON', { error: err.message });
    }
  }
  return upsertRequirementJson(req);
}

async function deleteRequirementDb(id) {
  await query('DELETE FROM staffing_requirements WHERE id = $1', [id]);
}

async function deleteRequirementJson(id) {
  if (!existsSync(REQUIREMENTS_PATH)) return;
  try {
    const data = JSON.parse(await readFile(REQUIREMENTS_PATH, 'utf-8'));
    if (!Array.isArray(data.requirements)) return;
    data.requirements = data.requirements.filter(r => r.id !== id);
    await writeFile(REQUIREMENTS_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch { /* ignore */ }
}

async function deleteRequirement(id) {
  if (isDbConnected()) {
    try {
      return await deleteRequirementDb(id);
    } catch (err) {
      logger.warn('DB deleteRequirement failed, falling back to JSON', { error: err.message });
    }
  }
  return deleteRequirementJson(id);
}

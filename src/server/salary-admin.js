import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import { isDbConnected, query } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '../../data/salary-sessions.json');

function readSessions() {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeSessions(sessions) {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(sessions, null, 2), 'utf-8');

  // Async sync to DB (fire-and-forget)
  if (isDbConnected()) {
    (async () => {
      try {
        for (const s of sessions) {
          await query(`
            INSERT INTO salary_sessions (id, branch_id, period, club_percent, employees, created_by, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (id) DO UPDATE SET
              employees = EXCLUDED.employees, club_percent = EXCLUDED.club_percent, updated_at = now()
          `, [s.id, s.branchId, s.period, s.clubPercent ?? null,
              JSON.stringify(s.employees || []), s.createdBy || null,
              s.createdAt || new Date(), s.updatedAt || new Date()]);
        }
      } catch (err) {
        console.warn('[salary-admin] DB sync failed:', err.message);
      }
    })();
  }
}

export function setupSalaryAdminRoutes(app) {
  // List all sessions
  app.get('/api/admin/salary/sessions', (req, res) => {
    try {
      const sessions = readSessions();
      // Return summaries (without full employee data) for list view
      const summaries = sessions.map(s => ({
        id: s.id,
        branchId: s.branchId,
        period: s.period,
        clubPercent: s.clubPercent,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        createdBy: s.createdBy,
        employeeCount: s.employees?.length ?? 0,
        totalSalary: (s.employees || []).reduce((sum, e) => sum + (e.total || 0), 0),
      }));
      res.json({ data: summaries });
    } catch (err) {
      console.error('[salary-admin] Error reading sessions:', err);
      res.status(500).json({ error: 'Failed to read sessions' });
    }
  });

  // Get a single session
  app.get('/api/admin/salary/sessions/:id', (req, res) => {
    try {
      const sessions = readSessions();
      const session = sessions.find(s => s.id === req.params.id);
      if (!session) return res.status(404).json({ error: 'Session not found' });
      res.json({ data: session });
    } catch (err) {
      console.error('[salary-admin] Error reading session:', err);
      res.status(500).json({ error: 'Failed to read session' });
    }
  });

  // Save a new session
  app.post('/api/admin/salary/sessions', (req, res) => {
    try {
      const sessions = readSessions();
      const now = new Date().toISOString();
      const session = {
        id: randomUUID(),
        ...req.body,
        createdAt: now,
        updatedAt: now,
        createdBy: req.user?.employeename || req.user?.tg_username || 'unknown',
      };
      sessions.push(session);
      writeSessions(sessions);
      res.json({ data: session });
    } catch (err) {
      console.error('[salary-admin] Error saving session:', err);
      res.status(500).json({ error: 'Failed to save session' });
    }
  });

  // Delete a session
  app.delete('/api/admin/salary/sessions/:id', (req, res) => {
    try {
      let sessions = readSessions();
      const idx = sessions.findIndex(s => s.id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: 'Session not found' });
      sessions.splice(idx, 1);
      writeSessions(sessions);
      res.json({ success: true });
    } catch (err) {
      console.error('[salary-admin] Error deleting session:', err);
      res.status(500).json({ error: 'Failed to delete session' });
    }
  });
}

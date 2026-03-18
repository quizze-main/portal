import { safeGetJson, safeSetJson } from '@/lib/storage';

export type TaskStatus = 'Open' | 'Completed';

type OutboxEntry = {
  status: TaskStatus;
  ts: number; // unix ms when user changed it locally
  attempts?: number;
  lastAttemptTs?: number;
  lastError?: string;
};

type Outbox = Record<string, OutboxEntry>;

const OUTBOX_KEY = 'task_status_outbox_v1';
const OUTBOX_TTL_MS = 24 * 60 * 60 * 1000; // 24h safety window

function loadOutbox(): Outbox {
  const o = safeGetJson<Outbox>(OUTBOX_KEY);
  if (!o || typeof o !== 'object') return {};
  return pruneOutbox(o);
}

function saveOutbox(o: Outbox): void {
  safeSetJson(OUTBOX_KEY, o);
}

function pruneOutbox(o: Outbox): Outbox {
  const now = Date.now();
  let changed = false;
  const next: Outbox = { ...o };
  Object.entries(next).forEach(([key, entry]) => {
    if (!entry || typeof entry.ts !== 'number' || now - entry.ts > OUTBOX_TTL_MS) {
      delete next[key];
      changed = true;
    }
  });
  if (changed) {
    saveOutbox(next);
  }
  return next;
}

export function setPendingTaskStatus(taskName: string, status: TaskStatus): void {
  if (!taskName) return;
  const o = loadOutbox();
  o[taskName] = {
    status,
    ts: Date.now(),
    attempts: o[taskName]?.attempts ?? 0,
    lastAttemptTs: o[taskName]?.lastAttemptTs,
    lastError: o[taskName]?.lastError,
  };
  saveOutbox(o);
}

export function clearPendingTaskStatus(taskName: string): void {
  if (!taskName) return;
  const o = loadOutbox();
  if (!o[taskName]) return;
  delete o[taskName];
  saveOutbox(o);
}

export function getPendingTaskStatus(taskName: string): OutboxEntry | undefined {
  if (!taskName) return undefined;
  const o = loadOutbox();
  return o[taskName];
}

export function applyPendingTaskStatuses<T extends { name: string; status?: string }>(tasks: T[]): T[] {
  const o = loadOutbox();
  const keys = Object.keys(o);
  if (keys.length === 0) return tasks;
  return tasks.map((t) => {
    const pending = o[t.name];
    if (!pending) return t;
    return { ...t, status: pending.status } as T;
  });
}

export async function flushPendingTaskStatuses(
  updateFn: (taskName: string, status: TaskStatus) => Promise<boolean>
): Promise<{ ok: number; failed: number }> {
  const o = loadOutbox();
  const names = Object.keys(o);
  if (names.length === 0) return { ok: 0, failed: 0 };

  let ok = 0;
  let failed = 0;

  for (const taskName of names) {
    const entry = o[taskName];
    if (!entry) continue;

    const nextAttempts = (entry.attempts ?? 0) + 1;
    o[taskName] = { ...entry, attempts: nextAttempts, lastAttemptTs: Date.now() };
    saveOutbox(o);

    try {
      const success = await updateFn(taskName, entry.status);
      if (success) {
        ok += 1;
        delete o[taskName];
        saveOutbox(o);
      } else {
        failed += 1;
        o[taskName] = { ...o[taskName], lastError: 'updateFn returned false' };
        saveOutbox(o);
      }
    } catch (e) {
      failed += 1;
      o[taskName] = { ...o[taskName], lastError: e instanceof Error ? e.message : String(e) };
      saveOutbox(o);
    }
  }

  return { ok, failed };
}


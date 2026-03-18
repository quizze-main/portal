export type TtlCacheEntry<T> = {
  v: 1;
  ts: number; // unix ms
  data: T;
};

export function safeGetItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSetItem(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function safeRemoveItem(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function safeGetJson<T>(key: string): T | undefined {
  const raw = safeGetItem(key);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

export function safeSetJson<T>(key: string, value: T): boolean {
  try {
    return safeSetItem(key, JSON.stringify(value));
  } catch {
    return false;
  }
}

export function readTtlCache<T>(key: string, maxAgeMs: number): T | undefined {
  const entry = safeGetJson<TtlCacheEntry<T>>(key);
  if (!entry || entry.v !== 1 || typeof entry.ts !== 'number') return undefined;
  if (Date.now() - entry.ts > maxAgeMs) return undefined;
  return entry.data;
}

export function readTtlCacheEntry<T>(key: string, maxAgeMs: number): TtlCacheEntry<T> | undefined {
  const entry = safeGetJson<TtlCacheEntry<T>>(key);
  if (!entry || entry.v !== 1 || typeof entry.ts !== 'number') return undefined;
  if (Date.now() - entry.ts > maxAgeMs) return undefined;
  return entry;
}

export function writeTtlCache<T>(key: string, data: T): boolean {
  const entry: TtlCacheEntry<T> = { v: 1, ts: Date.now(), data };
  return safeSetJson(key, entry);
}


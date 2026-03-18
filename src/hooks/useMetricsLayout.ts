import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { internalApiClient, type UserSettingsResponse, type UserSettingsVariant } from '@/lib/internalApiClient';
import { detectClientVariant } from '@/lib/clientVariant';
import { useEmployee } from '@/contexts/EmployeeProvider';

export interface MetricLayoutItem {
  id: string;
  rowIndex: number;
  columnSpan: 1 | 2;
  order: number;
}

export interface RankingColumnsConfig {
  branch?: string[];  // visible metric codes in order for branch ranking
  manager?: string[]; // visible metric codes in order for manager ranking
}

export interface MetricsLayout {
  items: MetricLayoutItem[];
  version: number;
  updatedAt?: number; // unix ms; used to avoid overwriting newer local layout by stale remote
  rankingColumns?: RankingColumnsConfig;
  sectionOrder?: string[]; // ordered section IDs for drag-and-drop reordering
}

const STORAGE_KEY_LEGACY = 'metrics-layout';
const storageKeyForVariant = (variant: UserSettingsVariant) => `metrics-layout.${variant}`;
const LAYOUT_VERSION = 2; // Incremented to reset old layouts
const REMOTE_SCOPE = 'leaderDashboard.layout';
const SYNC_SCOPE = 'leaderDashboard.sync';

type DashboardSyncConfig = {
  tgMobileDesktopSync: boolean;
  desktopLayoutSource: 'desktop_web' | 'desktop_tg';
};

function parseSyncConfig(settings: UserSettingsResponse | null): DashboardSyncConfig {
  const blobs = Array.isArray(settings?.blobs) ? settings!.blobs! : [];
  const blob = blobs.find((b) => String(b?.scope || '') === SYNC_SCOPE && String(b?.variant || '') === 'shared');
  const raw = blob?.payload_json != null ? String(blob.payload_json) : '';
  if (!raw) return { tgMobileDesktopSync: false, desktopLayoutSource: 'desktop_web' };
  try {
    const j = JSON.parse(raw) as any;
    const desktopLayoutSource = (j?.desktopLayoutSource === 'desktop_tg') ? 'desktop_tg' : 'desktop_web';
    // Temporarily force sync OFF for everyone (UI hidden).
    return { tgMobileDesktopSync: false, desktopLayoutSource };
  } catch {
    return { tgMobileDesktopSync: false, desktopLayoutSource: 'desktop_web' };
  }
}

function pickVariantForSave(settings: UserSettingsResponse | null): { saveVariant: UserSettingsVariant; mode: string; sync: DashboardSyncConfig; physical: UserSettingsVariant } {
  const mode = (settings?.active_variant_mode ? String(settings.active_variant_mode) : 'shared_only').trim() || 'shared_only';
  const sync = parseSyncConfig(settings);
  const physical = detectClientVariant();
  if (mode === 'per_variant') {
    // If user prefers using Telegram Desktop layout for the Web desktop client, treat desktop_web as desktop_tg for layout scope
    if (physical === 'desktop_web' && sync.desktopLayoutSource === 'desktop_tg') {
      return { saveVariant: 'desktop_tg', mode, sync, physical };
    }
    return { saveVariant: physical, mode, sync, physical };
  }
  return { saveVariant: 'shared', mode, sync, physical };
}

function pickLayoutFromSettings(settings: UserSettingsResponse | null): MetricsLayout | null {
  const blobs = Array.isArray(settings?.blobs) ? settings!.blobs! : [];
  const { saveVariant, mode } = pickVariantForSave(settings);

  const find = (variant: string) => blobs.find((b) => String(b?.scope || '') === REMOTE_SCOPE && String(b?.variant || '') === variant);
  const preferred = find(saveVariant);
  const fallback = mode === 'per_variant' ? find('shared') : null;
  const blob = preferred || fallback;
  const raw = blob?.payload_json != null ? String(blob.payload_json) : '';
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as MetricsLayout;
    if (parsed?.version !== LAYOUT_VERSION || !Array.isArray(parsed?.items)) return null;
    return { ...parsed, updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0 };
  } catch {
    return null;
  }
}

type PersistMode = 'auto' | 'manual';

export function useMetricsLayout(metricIds: string[], opts?: { persistMode?: PersistMode }) {
  const { userSettings } = useEmployee();
  const persistMode: PersistMode = opts?.persistMode ?? 'auto';
  const physicalVariantRef = useRef<UserSettingsVariant>(detectClientVariant());
  const localVariantRef = useRef<UserSettingsVariant>(physicalVariantRef.current);

  const getReadKeys = useCallback(() => {
    const keys: string[] = [];
    // Prefer the current localVariantRef (aligned to remote saveVariant after hydration)
    keys.push(storageKeyForVariant(localVariantRef.current));
    // Fallback to physical variant (in case localVariant changed or before hydration)
    if (localVariantRef.current !== physicalVariantRef.current) {
      keys.push(storageKeyForVariant(physicalVariantRef.current));
    }
    // Common remote save variant in shared mode (helps avoid initial flicker before hydration)
    keys.push(storageKeyForVariant('shared'));
    // Legacy shared key (read-only fallback, to avoid cross-variant contamination on write)
    keys.push(STORAGE_KEY_LEGACY);
    // Dedupe
    return Array.from(new Set(keys));
  }, []);

  const readLocalLayout = useCallback((): MetricsLayout | null => {
    try {
      const keys = getReadKeys();
      let best: MetricsLayout | null = null;
      let bestTs = -1;

      for (const key of keys) {
        const saved = localStorage.getItem(key);
        if (!saved) continue;
        let parsed: MetricsLayout | null = null;
        try {
          parsed = JSON.parse(saved) as MetricsLayout;
        } catch {
          parsed = null;
        }
        if (!parsed || parsed?.version !== LAYOUT_VERSION || !Array.isArray(parsed?.items)) continue;
        const ts = typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0;
        if (ts > bestTs) {
          bestTs = ts;
          best = { ...parsed, updatedAt: ts };
        }
      }

      return best;
    } catch {
      return null;
    }
  }, [getReadKeys]);

  const writeLocalLayout = useCallback((next: MetricsLayout) => {
    const key = storageKeyForVariant(localVariantRef.current);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

  const [layout, setLayout] = useState<MetricsLayout>(() => {
    const local = readLocalLayout();
    return local ?? createDefaultLayout(metricIds);
  });

  const remoteStateRef = useRef<{ hydrated: boolean; saveVariant: UserSettingsVariant; mode: string; physical: UserSettingsVariant; sync: DashboardSyncConfig }>({
    hydrated: false,
    saveVariant: 'shared',
    mode: 'shared_only',
    physical: 'desktop_web',
    sync: { tgMobileDesktopSync: false, desktopLayoutSource: 'desktop_web' },
  });
  const saveTimerRef = useRef<number | null>(null);
  const metricIdsKey = useMemo(() => metricIds.join(','), [metricIds]);

  // Hydrate from Frappe user settings (more reliable than localStorage in Telegram; also sync across devices)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const settings = userSettings ?? await internalApiClient.getUserSettings();
      if (cancelled) return;

      const pick = pickVariantForSave(settings);
      remoteStateRef.current = { hydrated: true, saveVariant: pick.saveVariant, mode: pick.mode, physical: pick.physical, sync: pick.sync };
      // Align local storage key with the remote save variant to avoid flicker / cross-variant contamination
      localVariantRef.current = pick.saveVariant;

      const remoteLayout = pickLayoutFromSettings(settings);
      if (!remoteLayout) return;

      // If local layout is newer than remote (e.g. user saved and navigated away before debounced remote save),
      // do NOT overwrite local with stale remote.
      const localNow = readLocalLayout();
      const localTs = typeof localNow?.updatedAt === 'number' ? localNow.updatedAt : 0;
      const remoteTs = typeof remoteLayout.updatedAt === 'number' ? remoteLayout.updatedAt : 0;
      if (localNow && localTs > remoteTs) {
        return;
      }

      // Merge with metricIds in case new metrics were added in the app
      const existingIds = new Set(remoteLayout.items.map((i) => i.id));
      const newIds = metricIds.filter((id) => !existingIds.has(id));
      if (newIds.length > 0) {
        const maxRow = Math.max(...remoteLayout.items.map(i => i.rowIndex), -1);
        const newItems: MetricLayoutItem[] = newIds.map((id, idx) => ({
          id,
          rowIndex: maxRow + 1 + Math.floor(idx / 2),
          columnSpan: 1,
          order: idx % 2,
        }));
        const next = { ...remoteLayout, items: [...remoteLayout.items, ...newItems], updatedAt: remoteTs };
        setLayout(next);
        // Refresh local cache from remote on app start/hydration (even in manual mode)
        writeLocalLayout(next);
      } else {
        const next = { ...remoteLayout, updatedAt: remoteTs };
        setLayout(next);
        // Refresh local cache from remote on app start/hydration (even in manual mode)
        writeLocalLayout(next);
      }
    })().catch(() => {
      remoteStateRef.current.hydrated = true;
    });

    return () => {
      cancelled = true;
    };
    // metricIdsKey to re-merge when metric list changes materially
  }, [metricIdsKey, userSettings, readLocalLayout, writeLocalLayout, metricIds]);

  // Sync with metricIds if new metrics added
  useEffect(() => {
    const existingIds = new Set(layout.items.map(i => i.id));
    const newIds = metricIds.filter(id => !existingIds.has(id));
    
    if (newIds.length > 0) {
      const maxRow = Math.max(...layout.items.map(i => i.rowIndex), -1);
      const newItems: MetricLayoutItem[] = newIds.map((id, idx) => ({
        id,
        rowIndex: maxRow + 1 + Math.floor(idx / 2),
        columnSpan: 1,
        order: idx % 2,
      }));
      
      setLayout(prev => ({
        ...prev,
        items: [...prev.items, ...newItems],
        updatedAt: Date.now(),
      }));
    }
  }, [metricIds, layout.items]);

  // Save to localStorage (auto mode only)
  useEffect(() => {
    if (persistMode !== 'auto') return;
    writeLocalLayout(layout);
  }, [layout, persistMode]);

  // Save to Frappe (debounced to avoid spamming during drag) (auto mode only)
  useEffect(() => {
    if (persistMode !== 'auto') return;
    // If we haven't hydrated yet, avoid overwriting remote with defaults immediately
    if (!remoteStateRef.current.hydrated) return;

    if (saveTimerRef.current != null) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    saveTimerRef.current = window.setTimeout(() => {
      const { saveVariant, mode, physical, sync } = remoteStateRef.current;
      const lastClient = physical || detectClientVariant();

      const blobs: Array<{ scope: string; variant: UserSettingsVariant; payload_version: number; payload_json: string }> = [{
        scope: REMOTE_SCOPE,
        variant: saveVariant,
        payload_version: LAYOUT_VERSION,
        payload_json: JSON.stringify(layout),
      }];

      // Optional: sync between Telegram mobile and Telegram desktop variants
      if (mode === 'per_variant' && sync?.tgMobileDesktopSync && (saveVariant === 'mobile_tg' || saveVariant === 'desktop_tg')) {
        const other: UserSettingsVariant = saveVariant === 'mobile_tg' ? 'desktop_tg' : 'mobile_tg';
        blobs.push({
          scope: REMOTE_SCOPE,
          variant: other,
          payload_version: LAYOUT_VERSION,
          payload_json: JSON.stringify(layout),
        });
      }

      void internalApiClient.upsertUserSettings({
        active_variant_mode: mode,
        last_client: lastClient,
        blobs
      });
    }, 800);

    return () => {
      if (persistMode !== 'auto') return;
      // On unmount, flush pending save instead of dropping it (route switch may happen right after "Save")
      if (saveTimerRef.current != null) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
        const { saveVariant, mode, physical, sync } = remoteStateRef.current;
        const lastClient = physical || detectClientVariant();
        const blobs: Array<{ scope: string; variant: UserSettingsVariant; payload_version: number; payload_json: string }> = [{
          scope: REMOTE_SCOPE,
          variant: saveVariant,
          payload_version: LAYOUT_VERSION,
          payload_json: JSON.stringify(layout),
        }];
        if (mode === 'per_variant' && sync?.tgMobileDesktopSync && (saveVariant === 'mobile_tg' || saveVariant === 'desktop_tg')) {
          const other: UserSettingsVariant = saveVariant === 'mobile_tg' ? 'desktop_tg' : 'mobile_tg';
          blobs.push({
            scope: REMOTE_SCOPE,
            variant: other,
            payload_version: LAYOUT_VERSION,
            payload_json: JSON.stringify(layout),
          });
        }
        void internalApiClient.upsertUserSettings({
          active_variant_mode: mode,
          last_client: lastClient,
          blobs
        });
      }
    };
  }, [layout, persistMode]);

  const updateLayout = useCallback((newItems: MetricLayoutItem[]) => {
    setLayout(prev => ({
      ...prev,
      items: newItems,
      updatedAt: Date.now(),
    }));
  }, []);

  const moveMetric = useCallback((metricId: string, targetRowIndex: number, targetOrder: number) => {
    setLayout(prev => {
      const items = [...prev.items];
      const itemIndex = items.findIndex(i => i.id === metricId);
      if (itemIndex === -1) return prev;

      items[itemIndex] = {
        ...items[itemIndex],
        rowIndex: targetRowIndex,
        order: targetOrder,
      };

      return { ...prev, items, updatedAt: Date.now() };
    });
  }, []);

  const setColumnSpan = useCallback((metricId: string, columnSpan: 1 | 2) => {
    setLayout(prev => {
      const items = [...prev.items];
      const itemIndex = items.findIndex(i => i.id === metricId);
      if (itemIndex === -1) return prev;

      items[itemIndex] = {
        ...items[itemIndex],
        columnSpan,
      };

      return { ...prev, items, updatedAt: Date.now() };
    });
  }, []);

  const setRankingColumns = useCallback((type: 'branch' | 'manager', codes: string[]) => {
    setLayout(prev => ({
      ...prev,
      rankingColumns: {
        ...prev.rankingColumns,
        [type]: codes,
      },
      updatedAt: Date.now(),
    }));
  }, []);

  const getRankingColumns = useCallback((type: 'branch' | 'manager'): string[] | undefined => {
    return layout.rankingColumns?.[type];
  }, [layout.rankingColumns]);

  const updateSectionOrder = useCallback((order: string[]) => {
    setLayout(prev => ({
      ...prev,
      sectionOrder: order,
      updatedAt: Date.now(),
    }));
  }, []);

  const resetLayout = useCallback(() => {
    const defaultLayout = createDefaultLayout(metricIds);
    defaultLayout.sectionOrder = undefined;
    setLayout(defaultLayout);
  }, [metricIds]);

  const flushRemoteSave = useCallback(async (layoutOverride?: MetricsLayout) => {
    const payloadLayout = layoutOverride ?? layout;
    if (!remoteStateRef.current.hydrated) {
      // best effort: try to hydrate settings first
      const settings = userSettings ?? await internalApiClient.getUserSettings();
      const pick = pickVariantForSave(settings);
      remoteStateRef.current = { hydrated: true, saveVariant: pick.saveVariant, mode: pick.mode, physical: pick.physical, sync: pick.sync };
    }

    if (saveTimerRef.current != null) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    const { saveVariant, mode, physical, sync } = remoteStateRef.current;
    const lastClient = physical || detectClientVariant();
    const blobs: Array<{ scope: string; variant: UserSettingsVariant; payload_version: number; payload_json: string }> = [{
      scope: REMOTE_SCOPE,
      variant: saveVariant,
      payload_version: LAYOUT_VERSION,
      payload_json: JSON.stringify(payloadLayout),
    }];
    if (mode === 'per_variant' && sync?.tgMobileDesktopSync && (saveVariant === 'mobile_tg' || saveVariant === 'desktop_tg')) {
      const other: UserSettingsVariant = saveVariant === 'mobile_tg' ? 'desktop_tg' : 'mobile_tg';
      blobs.push({
        scope: REMOTE_SCOPE,
        variant: other,
        payload_version: LAYOUT_VERSION,
        payload_json: JSON.stringify(payloadLayout),
      });
    }

    await internalApiClient.upsertUserSettings({
      active_variant_mode: mode,
      last_client: lastClient,
      blobs
    });
  }, [layout, userSettings]);

  const saveNow = useCallback(async () => {
    const now = Date.now();
    const nextLayout: MetricsLayout = { ...layout, updatedAt: now };

    // Optimistic: persist locally immediately
    writeLocalLayout(nextLayout);

    // Persist remotely (best-effort)
    try {
      await flushRemoteSave(nextLayout);
    } catch {
      // Keep local as source of truth; remote will catch up on next successful save
    }

    // Keep state in sync (updatedAt)
    setLayout(nextLayout);
  }, [flushRemoteSave, layout, writeLocalLayout]);

  // Get metrics grouped by rows
  const getRowsLayout = useCallback(() => {
    const rows = new Map<number, MetricLayoutItem[]>();
    
    layout.items.forEach(item => {
      const row = rows.get(item.rowIndex) || [];
      row.push(item);
      rows.set(item.rowIndex, row);
    });

    // Sort each row by order
    rows.forEach((items, key) => {
      rows.set(key, items.sort((a, b) => a.order - b.order));
    });

    // Convert to sorted array
    return Array.from(rows.entries())
      .sort(([a], [b]) => a - b)
      .map(([rowIndex, items]) => ({ rowIndex, items }));
  }, [layout.items]);

  return {
    layout,
    updateLayout,
    moveMetric,
    setColumnSpan,
    setRankingColumns,
    getRankingColumns,
    updateSectionOrder,
    resetLayout,
    getRowsLayout,
    flushRemoteSave,
    saveNow,
  };
}

function createDefaultLayout(metricIds: string[]): MetricsLayout {
  const items: MetricLayoutItem[] = metricIds.map((id, idx) => ({
    id,
    rowIndex: Math.floor(idx / 2),
    columnSpan: 1,
    order: idx % 2,
  }));

  return {
    items,
    version: LAYOUT_VERSION,
    updatedAt: Date.now(),
  };
}

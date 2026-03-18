import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { FullWidthKPIMetric } from '@/components/dashboard/KPIFullWidthCard';
import type { MetricValueData, TrackerMetricResponse } from '@/lib/leaderDashboardApi';
import type { RankingLossConfig, DashboardWidget } from '@/lib/internalApiClient';

/** Все коды метрик для leader dashboard */
export const ALL_METRIC_CODES = [
  'revenue_created',
  'revenue_closed',
  'frames_count',
  'conversion_rate',
  'csi',
  'avg_glasses_price',
  'margin_rate',
  'avg_repaires_price',
] as const;

export type MetricCode = typeof ALL_METRIC_CODES[number];

/** Человекочитаемые названия метрик */
export const METRIC_NAMES: Record<string, string> = {
  revenue_created: 'Выручка СЗ',
  revenue_closed: 'Выручка ЗЗ',
  frames_count: 'Кол-во ФЛ',
  conversion_rate: 'Конверсия',
  csi: 'CSI',
  avg_glasses_price: 'Ср. стоимость очков',
  margin_rate: 'Маржинальность',
  avg_repaires_price: 'Ср. стоимость ремонтов',
};

/** Единицы измерения метрик: CSI и конверсия — %, кол-во ФЛ — без единицы, остальное — ₽ */
export const METRIC_UNITS: Record<string, string> = {
  revenue_created: '₽',
  revenue_closed: '₽',
  frames_count: '',
  conversion_rate: '%',
  csi: '%',
  avg_glasses_price: '₽',
  margin_rate: '₽',
  avg_repaires_price: '₽',
};

/** Конфигурация метрик для рейтинговых таблиц */
export type ForecastLabelType = 'forecast' | 'deviation';

export interface RankingMetricConfigItem {
  code: MetricCode;
  /** camelCase field key in BranchRankingRow */
  branchField: string;
  /** camelCase field key in ManagerRankingRow */
  managerField: string;
  /** Sort field for BranchRankingTable */
  branchSortField: string;
  /** Sort field for ManagerRankingTable */
  managerSortField: string;
  label: string;
  shortLabel: string;
  suffix: string;
  forecastLabel: ForecastLabelType;
  formatValue: 'number' | 'round' | 'identity';
  availableIn: ('branch' | 'manager')[];
}

export const RANKING_METRIC_CONFIG: RankingMetricConfigItem[] = [
  { code: 'revenue_created', branchField: 'revenueCreated', managerField: 'revenueSz', branchSortField: 'revenueCreated', managerSortField: 'revenueSz', label: 'Выручка СЗ', shortLabel: 'Выр. СЗ', suffix: '', forecastLabel: 'forecast', formatValue: 'number', availableIn: ['branch', 'manager'] },
  { code: 'revenue_closed', branchField: 'revenueClosed', managerField: 'revenueZz', branchSortField: 'revenueClosed', managerSortField: 'revenueZz', label: 'Выручка ЗЗ', shortLabel: 'Выр. ЗЗ', suffix: '', forecastLabel: 'forecast', formatValue: 'number', availableIn: ['branch', 'manager'] },
  { code: 'frames_count', branchField: 'framesCount', managerField: 'clientsCount', branchSortField: 'framesCount', managerSortField: 'clientsCount', label: 'Кол-во ФЛ', shortLabel: 'ФЛ', suffix: '', forecastLabel: 'forecast', formatValue: 'round', availableIn: ['branch', 'manager'] },
  { code: 'avg_glasses_price', branchField: 'avgGlassesPrice', managerField: 'avgGlasses', branchSortField: 'avgGlassesPrice', managerSortField: 'avgGlasses', label: 'Ср. стм. очков', shortLabel: 'Ср. очков', suffix: '', forecastLabel: 'deviation', formatValue: 'number', availableIn: ['branch', 'manager'] },
  { code: 'conversion_rate', branchField: 'conversionRate', managerField: 'conversion', branchSortField: 'conversionRate', managerSortField: 'conversion', label: 'Конверсия', shortLabel: 'Конв.', suffix: '%', forecastLabel: 'deviation', formatValue: 'round', availableIn: ['branch', 'manager'] },
  { code: 'csi', branchField: 'csi', managerField: 'csi', branchSortField: 'csi', managerSortField: 'csi', label: 'CSI', shortLabel: 'CSI', suffix: '%', forecastLabel: 'deviation', formatValue: 'round', availableIn: ['branch', 'manager'] },
  { code: 'margin_rate', branchField: 'marginRate', managerField: 'margin', branchSortField: 'marginRate', managerSortField: 'margin', label: 'Маржинальность', shortLabel: 'Маржа', suffix: '', forecastLabel: 'deviation', formatValue: 'number', availableIn: ['branch', 'manager'] },
  { code: 'avg_repaires_price', branchField: 'avgRepairesPrice', managerField: 'avgRepairesPrice', branchSortField: 'avgRepairesPrice', managerSortField: 'avgRepairesPrice', label: 'Ремонты', shortLabel: 'Рем.', suffix: '', forecastLabel: 'forecast', formatValue: 'number', availableIn: ['branch'] },
];

/** Special column code for loss/reserve in ranking tables */
export const LOSS_COLUMN_CODE = '__loss__';

/** Default metric codes for branch ranking */
export const DEFAULT_BRANCH_RANKING_CODES: MetricCode[] = RANKING_METRIC_CONFIG
  .filter(c => c.availableIn.includes('branch'))
  .map(c => c.code);

/** Default metric codes for manager ranking */
export const DEFAULT_MANAGER_RANKING_CODES: MetricCode[] = RANKING_METRIC_CONFIG
  .filter(c => c.availableIn.includes('manager'))
  .map(c => c.code);

// ========== RankingColumnDef — унифицированный column config для рейтингов ==========

export interface RankingColumnDef {
  code: string;
  label: string;
  shortLabel: string;
  width: string;
  suffix: string;
  forecastLabel: ForecastLabelType;
  formatValue: (v: number | null) => string;
}

const fmtNumber = (v: number | null): string => v === null ? '-' : Math.round(v).toLocaleString('ru-RU');
const fmtRound = (v: number | null): string => v === null ? '-' : String(Math.round(v));

/** Строит RankingColumnDef для known metric из RANKING_METRIC_CONFIG */
export function buildRankingColumnDefFromKnown(code: string): RankingColumnDef | null {
  const known = RANKING_METRIC_CONFIG.find(c => c.code === code);
  if (!known) return null;
  return {
    code: known.code,
    label: known.label,
    shortLabel: known.shortLabel,
    width: 'w-[90px]',
    suffix: known.suffix,
    forecastLabel: known.forecastLabel,
    formatValue: known.formatValue === 'round' ? fmtRound : fmtNumber,
  };
}

/** Строит RankingColumnDef из DashboardMetricConfig (каталог метрик) */
export function buildRankingColumnDef(cfg: { id: string; name: string; unit?: string; forecastLabel?: string; trackerCode?: string; valueType?: string }): RankingColumnDef {
  const code = cfg.trackerCode || cfg.id;
  // Check if it's a known metric first
  const known = buildRankingColumnDefFromKnown(code);
  if (known) return known;

  const isPct = cfg.unit === '%' || cfg.valueType === 'percentage';
  return {
    code,
    label: cfg.name,
    shortLabel: cfg.name.length > 12 ? cfg.name.slice(0, 11) + '…' : cfg.name,
    width: 'w-[90px]',
    suffix: isPct ? '%' : '',
    forecastLabel: (cfg.forecastLabel === 'deviation' ? 'deviation' : 'forecast') as ForecastLabelType,
    formatValue: isPct ? fmtRound : fmtNumber,
  };
}

/** Полные данные метрики из API */
export interface MetricFullData extends TrackerMetricResponse {
  // UI-ready данные (преобразованные)
  ui?: FullWidthKPIMetric;
}

/** Query параметры для загрузки метрик */
export interface MetricsQuery {
  storeIds: string[];
  dateFrom?: string;
  dateTo?: string;
  extraCodes?: string[];
}

/** Default ranking loss config (backward compatible — uses revenue_created) */
const DEFAULT_RANKING_LOSS_CONFIG: RankingLossConfig = { mode: 'metric', metricCode: 'revenue_created', formula: '' };

/** Состояние хука */
interface UseLeaderMetricsState {
  metrics: Map<string, MetricFullData>;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  rankingLossConfig: RankingLossConfig;
  widgets: DashboardWidget[];
}

// ========== Глобальный кеш (singleton между компонентами) ==========
const CACHE_TTL = 5 * 60 * 1000; // 5 минут

interface CacheEntry {
  data: Map<string, MetricFullData>;
  rankingLossConfig: RankingLossConfig;
  widgets: DashboardWidget[];
  timestamp: number;
  queryKey: string;
}

let globalCache: CacheEntry | null = null;
let pendingRequest: Promise<FetchResult> | null = null;
let pendingQueryKey: string | null = null; // Для отслеживания какой запрос в процессе

function buildQueryKey(query: MetricsQuery): string {
  const storeKey = [...query.storeIds].sort().join(',');
  const extraKey = query.extraCodes?.length ? query.extraCodes.sort().join(',') : '';
  return `${storeKey}|${query.dateFrom ?? ''}|${query.dateTo ?? ''}|${extraKey}`;
}

function isCacheValid(queryKey: string): boolean {
  if (!globalCache) return false;
  if (globalCache.queryKey !== queryKey) return false;
  return Date.now() - globalCache.timestamp < CACHE_TTL;
}

// ========== API функции ==========

interface FetchResult {
  metrics: Map<string, MetricFullData>;
  rankingLossConfig: RankingLossConfig;
  widgets: DashboardWidget[];
}

async function fetchAllMetrics(query: MetricsQuery): Promise<FetchResult> {
  const params = new URLSearchParams();

  // Merge base codes with any extra codes from ranking columns
  const allCodes = [...new Set([...ALL_METRIC_CODES, ...(query.extraCodes ?? [])])];
  params.set('metric_codes', allCodes.join(','));
  params.set('raw', 'true'); // Получаем полные данные с stores и managers
  params.set('by_managers', 'true'); // Включаем данные по менеджерам

  if (query.dateFrom) params.set('date_from', query.dateFrom);
  if (query.dateTo) params.set('date_to', query.dateTo);
  query.storeIds.forEach(id => params.append('store_ids', id));

  const url = `/api/top-leader-metrics?${params.toString()}`;
  const resp = await fetch(url, { method: 'GET', credentials: 'include', cache: 'no-store' });

  if (!resp.ok) {
    throw new Error(`Failed to load metrics: ${resp.status}`);
  }

  const json = await resp.json();
  const rawData: TrackerMetricResponse[] = json?.data ?? [];

  const result = new Map<string, MetricFullData>();

  for (const item of rawData) {
    if (!item?.code) continue;
    result.set(String(item.code), item as MetricFullData);
  }

  const rankingLossConfig: RankingLossConfig = json?.rankingLossConfig || DEFAULT_RANKING_LOSS_CONFIG;
  const widgets: DashboardWidget[] = json?.widgets || [];

  return { metrics: result, rankingLossConfig, widgets };
}

// ========== Хук ==========

export function useLeaderMetrics(query: MetricsQuery) {
  const [state, setState] = useState<UseLeaderMetricsState>({
    metrics: new Map(),
    loading: true,
    error: null,
    lastUpdated: null,
    rankingLossConfig: DEFAULT_RANKING_LOSS_CONFIG,
    widgets: [],
  });

  // Мемоизируем query чтобы избежать лишних ре-рендеров
  const storeIdsKey = query.storeIds.join(',');
  const extraCodesKey = query.extraCodes?.join(',') ?? '';
  const stableQuery = useMemo<MetricsQuery>(() => ({
    storeIds: query.storeIds,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
    extraCodes: query.extraCodes,
  }), [storeIdsKey, query.dateFrom, query.dateTo, extraCodesKey]);

  const queryKey = useMemo(() => buildQueryKey(stableQuery), [stableQuery]);
  const abortRef = useRef(false);

  // Синхронный сброс при смене query — чтобы не показывать старые данные до useEffect
  // (официальный React-паттерн "adjusting state during render")
  const [prevQueryKey, setPrevQueryKey] = useState(queryKey);
  if (queryKey !== prevQueryKey) {
    setPrevQueryKey(queryKey);
    if (state.metrics.size > 0 || !state.loading) {
      setState({ metrics: new Map(), loading: true, error: null, lastUpdated: null, rankingLossConfig: state.rankingLossConfig, widgets: state.widgets });
    }
  }

  // Загрузка данных
  useEffect(() => {
    if (stableQuery.storeIds.length === 0) {
      setState({ metrics: new Map(), loading: false, error: null, lastUpdated: null, rankingLossConfig: DEFAULT_RANKING_LOSS_CONFIG, widgets: [] });
      return;
    }

    abortRef.current = false;

    const load = async () => {
      // Проверяем кеш
      if (isCacheValid(queryKey)) {
        if (!abortRef.current) {
          setState({
            metrics: globalCache!.data,
            rankingLossConfig: globalCache!.rankingLossConfig,
            widgets: globalCache!.widgets,
            loading: false,
            error: null,
            lastUpdated: new Date(globalCache!.timestamp),
          });
        }
        return;
      }

      // Если уже есть pending запрос с тем же ключом — ждём его (не создаём дубликат)
      if (pendingRequest && pendingQueryKey === queryKey) {
        try {
          const result = await pendingRequest;
          if (!abortRef.current) {
            setState({
              metrics: result.metrics,
              rankingLossConfig: result.rankingLossConfig,
              widgets: result.widgets,
              loading: false,
              error: null,
              lastUpdated: new Date(),
            });
          }
        } catch (e) {
          if (!abortRef.current) {
            setState(prev => ({ ...prev, loading: false, error: (e as Error).message }));
          }
        }
        return;
      }

      // Сразу сбрасываем старые данные — чтобы UI показал скелетоны, а не зависшие цифры
      setState(prev => ({ metrics: new Map(), loading: true, error: null, lastUpdated: null, rankingLossConfig: prev.rankingLossConfig, widgets: prev.widgets }));

      // Создаём новый запрос и запоминаем его queryKey
      pendingQueryKey = queryKey;
      pendingRequest = fetchAllMetrics(stableQuery);

      try {
        const result = await pendingRequest;

        // Сохраняем в кеш
        globalCache = {
          data: result.metrics,
          rankingLossConfig: result.rankingLossConfig,
          widgets: result.widgets,
          timestamp: Date.now(),
          queryKey,
        };

        if (!abortRef.current) {
          setState({
            metrics: result.metrics,
            rankingLossConfig: result.rankingLossConfig,
            widgets: result.widgets,
            loading: false,
            error: null,
            lastUpdated: new Date(),
          });
        }
      } catch (e) {
        if (!abortRef.current) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: (e as Error).message,
          }));
        }
      } finally {
        pendingRequest = null;
        pendingQueryKey = null;
      }
    };

    load();

    return () => {
      abortRef.current = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]); // query не включаем - queryKey уже содержит все нужные данные

  // Геттер данных для конкретного store
  const getStoreMetric = useCallback((code: string, storeId: string): MetricValueData | null => {
    const metric = state.metrics.get(code);
    if (!metric?.stores) return null;

    // Нормализуем ID (убираем itigris- префикс)
    const normalizedId = storeId.replace(/^itigris[-_]/i, '').trim();

    // Пробуем разные форматы ключа
    return metric.stores[storeId]
      ?? metric.stores[`itigris-${normalizedId}`]
      ?? metric.stores[normalizedId]
      ?? null;
  }, [state.metrics]);

  // Геттер данных для конкретного менеджера
  const getManagerMetric = useCallback((code: string, managerId: string): MetricValueData | null => {
    const metric = state.metrics.get(code);
    if (!metric?.managers) return null;

    // Нормализуем ID (убираем itigris- префикс)
    const normalizedId = managerId.replace(/^itigris[-_]/i, '').trim();

    // Пробуем разные форматы ключа
    return metric.managers[managerId]
      ?? metric.managers[`itigris-${normalizedId}`]
      ?? metric.managers[normalizedId]
      ?? null;
  }, [state.metrics]);

  // Геттер общих данных метрики (агрегат по всем stores)
  const getMetric = useCallback((code: string): MetricFullData | null => {
    return state.metrics.get(code) ?? null;
  }, [state.metrics]);

  // Все менеджеры для конкретной метрики
  const getManagersForMetric = useCallback((code: string): Record<string, MetricValueData> => {
    return state.metrics.get(code)?.managers ?? {};
  }, [state.metrics]);

  // Все stores для конкретной метрики
  const getStoresForMetric = useCallback((code: string): Record<string, MetricValueData> => {
    return state.metrics.get(code)?.stores ?? {};
  }, [state.metrics]);

  // Принудительное обновление
  const refresh = useCallback(async () => {
    globalCache = null;
    pendingQueryKey = null; // Сбрасываем pending, чтобы не блокировать обновление
    setState(prev => ({ ...prev, loading: true }));

    try {
      const result = await fetchAllMetrics(stableQuery);
      globalCache = {
        data: result.metrics,
        rankingLossConfig: result.rankingLossConfig,
        widgets: result.widgets,
        timestamp: Date.now(),
        queryKey,
      };
      setState({
        metrics: result.metrics,
        rankingLossConfig: result.rankingLossConfig,
        widgets: result.widgets,
        loading: false,
        error: null,
        lastUpdated: new Date(),
      });
    } catch (e) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: (e as Error).message,
      }));
    }
  }, [stableQuery, queryKey]);

  // Compute ranking loss for a specific entity (manager or store)
  // lossConfigOverride allows ranking widgets to pass their own lossConfig
  const getRankingLoss = useCallback((entityId: string, entityType: 'manager' | 'store', lossConfigOverride?: RankingLossConfig): number | null => {
    const cfg = lossConfigOverride || state.rankingLossConfig;

    if (cfg.mode === 'auto') {
      // Always compute fact - plan directly, ignoring pre-calculated loss
      const getter = entityType === 'manager' ? getManagerMetric : getStoreMetric;
      const m = getter(cfg.metricCode, entityId);
      if (!m) return null;
      const fact = Number(m.fact_value) || 0;
      const plan = Number(m.plan_value);
      return Number.isFinite(plan) ? Math.round(fact - plan) : null;
    }

    if (cfg.mode === 'metric') {
      const getter = entityType === 'manager' ? getManagerMetric : getStoreMetric;
      const m = getter(cfg.metricCode, entityId);
      if (!m) return null;
      const loss = Number(m.loss_or_overperformance);
      if (Number.isFinite(loss)) return Math.round(loss);
      // fallback: fact - plan
      const fact = Number(m.fact_value) || 0;
      const plan = Number(m.plan_value);
      return Number.isFinite(plan) ? Math.round(fact - plan) : null;
    }

    if (cfg.mode === 'formula') {
      // Extract all references from the formula: {code}, {code.fact}, {code.plan}
      const refs = cfg.formula.match(/\{([a-z0-9_]+(?:\.[a-z]+)?)\}/gi)?.map(m => m.slice(1, -1)) || [];

      // Build values map for referenced metrics with accessor support
      const getter = entityType === 'manager' ? getManagerMetric : getStoreMetric;
      const valuesMap: Record<string, number> = {};
      for (const ref of refs) {
        const dotIdx = ref.lastIndexOf('.');
        const hasAccessor = dotIdx > 0 && (ref.endsWith('.fact') || ref.endsWith('.plan'));
        const baseCode = hasAccessor ? ref.slice(0, dotIdx) : ref;
        const accessor = hasAccessor ? ref.slice(dotIdx + 1) : null;

        const entityData = getter(baseCode, entityId);
        if (!entityData) continue;

        if (accessor === 'plan') {
          valuesMap[ref] = Number(entityData.plan_value) || 0;
        } else {
          // bare {code} and {code.fact} both resolve to fact_value
          valuesMap[ref] = Number(entityData.fact_value) || 0;
        }
      }
      try {
        let expr = cfg.formula;
        expr = expr.replace(/\{([^}]+)\}/g, (_, key) => String(valuesMap[key] ?? 0));
        // Sanitize: allow only numbers, operators, parentheses, spaces
        if (!/^[\d\s+\-*/().]+$/.test(expr)) return null;
        const result = new Function('"use strict"; return (' + expr + ')')();
        return Number.isFinite(result) ? Math.round(result) : null;
      } catch {
        return null;
      }
    }

    return null;
  }, [state.metrics, state.rankingLossConfig, getManagerMetric, getStoreMetric]);

  // Get the label for ranking loss column based on config
  const rankingLossLabel = useMemo(() => {
    const cfg = state.rankingLossConfig;
    if (cfg.mode === 'auto') {
      return METRIC_NAMES[cfg.metricCode] ? `Потери (${METRIC_NAMES[cfg.metricCode]})` : 'Потери';
    }
    if (cfg.mode === 'metric') {
      return METRIC_NAMES[cfg.metricCode] ? `Потери (${METRIC_NAMES[cfg.metricCode]})` : 'Потери';
    }
    return 'Потери';
  }, [state.rankingLossConfig]);

  // Get loss label for a specific lossConfig (used by widget-based rankings)
  const getLossLabelForConfig = useCallback((cfg?: RankingLossConfig) => {
    const c = cfg || state.rankingLossConfig;
    if (c.mode === 'disabled') return '';
    if (c.mode === 'metric') {
      return METRIC_NAMES[c.metricCode] ? `Потери (${METRIC_NAMES[c.metricCode]})` : 'Потери';
    }
    return 'Потери';
  }, [state.rankingLossConfig]);

  return {
    ...state,
    getMetric,
    getStoreMetric,
    getManagerMetric,
    getManagersForMetric,
    getStoresForMetric,
    getRankingLoss,
    rankingLossLabel,
    getLossLabelForConfig,
    refresh,
  };
}

// ========== Утилиты для преобразования данных ==========

/** Конвертация строки/числа в number */
export function toNumber(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

/** Конвертация с возможным null */
export function toNumberOrNull(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

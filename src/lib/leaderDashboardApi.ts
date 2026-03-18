import type { FullWidthKPIMetric } from "@/components/dashboard/KPIFullWidthCard";

export type LeaderMetricsQuery = {
  date_from?: string;
  date_to?: string;
  department_id?: string;
  store_id?: string;
  store_ids?: string[];
  skipPositionFilter?: boolean;
};

/** Данные одного менеджера/филиала по одной метрике */
export interface MetricValueData {
  fact_value: string | number;
  plan_value: string | number | null;
  forecast_value: string | number | null;
  loss_or_overperformance: string | number | null;
}

/** Полный ответ метрики от Tracker API (raw формат) */
export interface TrackerMetricResponse {
  code: string;
  type: string;
  value_type: string;
  fact_value: string;
  plan_value: string;
  forecast_value: string;
  loss_or_overperformance: string;
  value_postfix_type: string;
  stores?: Record<string, MetricValueData>;
  managers?: Record<string, MetricValueData>;
}

/** Данные одного менеджера по одной метрике */
export interface ManagerMetricData {
  fact_value: number;
  plan_value: number;
  forecast_value: number | null;
  loss_or_overperformance: number;
}

/** Ответ с данными метрики по менеджерам */
export interface ManagerMetricResponse {
  code: string;
  managers: Record<string, MetricValueData>;
  stores?: Record<string, MetricValueData>;
}

// ========== SessionStorage cache для клиента (персистентный между обновлениями) ==========
const CLIENT_CACHE_TTL = 3 * 60 * 1000; // 3 минуты
const CACHE_PREFIX = 'ldr_';

interface CacheEntry<T> {
  d: T;  // data (сокращаем для экономии места)
  t: number;  // timestamp
}

function getCacheKey(metricCode: string, query: LeaderMetricsQuery): string {
  const storeIdPart = Array.isArray(query.store_ids) && query.store_ids.length > 0
    ? query.store_ids.sort().join(',')
    : query.store_id ?? '';
  return CACHE_PREFIX + 'm_' + [metricCode, query.department_id ?? '', storeIdPart, query.date_from ?? '', query.date_to ?? ''].join('|');
}

function getManagerCacheKey(metricCode: string, storeIds: string[], dateFrom?: string, dateTo?: string): string {
  return CACHE_PREFIX + 'g_' + [metricCode, storeIds.sort().join(','), dateFrom ?? '', dateTo ?? ''].join('|');
}

function getFromCache<T>(key: string): T | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return undefined;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.t > CLIENT_CACHE_TTL) {
      sessionStorage.removeItem(key);
      return undefined;
    }
    return entry.d;
  } catch {
    return undefined;
  }
}

function setInCache<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    const entry: CacheEntry<T> = { d: data, t: Date.now() };
    sessionStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // sessionStorage полон - очищаем старые записи
    cleanupCache();
    try {
      const entry: CacheEntry<T> = { d: data, t: Date.now() };
      sessionStorage.setItem(key, JSON.stringify(entry));
    } catch {
      // Всё ещё не помещается - игнорируем
    }
  }
}

// Очистка устаревших записей
function cleanupCache(): void {
  if (typeof window === 'undefined') return;
  try {
    const now = Date.now();
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(CACHE_PREFIX)) {
        try {
          const raw = sessionStorage.getItem(key);
          if (raw) {
            const entry: CacheEntry<unknown> = JSON.parse(raw);
            if (now - entry.t > CLIENT_CACHE_TTL) {
              keysToRemove.push(key);
            }
          }
        } catch {
          keysToRemove.push(key!);
        }
      }
    }
    keysToRemove.forEach(k => sessionStorage.removeItem(k));
  } catch {
    // Игнорируем
  }
}

// Очистка при загрузке модуля
if (typeof window !== 'undefined') {
  cleanupCache();
}

/** Все коды метрик для leader dashboard */
export const LEADER_METRIC_CODES = [
  'revenue_created',
  'revenue_closed',
  'frames_count',
  'conversion_rate',
  'csi',
  'avg_glasses_price',
  'margin_rate',
  'avg_repaires_price',
] as const;

export type LeaderMetricCode = typeof LEADER_METRIC_CODES[number];

function buildMetricsParams(query: LeaderMetricsQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.date_from) params.set("date_from", query.date_from);
  if (query.date_to) params.set("date_to", query.date_to);
  if (Array.isArray(query.store_ids) && query.store_ids.length > 0) {
    query.store_ids.forEach((id) => {
      if (id) params.append("store_ids", id);
    });
  } else if (query.store_id) {
    params.set("store_id", query.store_id);
  }
  return params;
}

export async function getTopLeaderMetrics(query: LeaderMetricsQuery): Promise<FullWidthKPIMetric[]> {
  const params = buildMetricsParams(query);
  if (query.department_id) params.set("department_id", query.department_id);
  if (query.skipPositionFilter) params.set("skipPositionFilter", "1");
  const url = `/api/top-leader-metrics${params.toString() ? `?${params.toString()}` : ""}`;
  const resp = await fetch(url, { method: "GET", credentials: "include" });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Failed to load leader metrics (${resp.status}): ${text || resp.statusText}`);
  }
  return (await resp.json()) as FullWidthKPIMetric[];
}

export type ChildMetricsResponse = {
  parent: FullWidthKPIMetric | null;
  children: FullWidthKPIMetric[];
};

export async function getChildMetrics(parentId: string, query: LeaderMetricsQuery): Promise<ChildMetricsResponse> {
  const params = buildMetricsParams(query);
  if (query.department_id) params.set("department_id", query.department_id);

  const url = `/api/top-leader-metrics/${encodeURIComponent(parentId)}/children${params.toString() ? `?${params.toString()}` : ""}`;
  const resp = await fetch(url, { method: "GET", credentials: "include" });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Failed to load child metrics (${resp.status}): ${text || resp.statusText}`);
  }
  return (await resp.json()) as ChildMetricsResponse;
}

/**
 * Загружает одну метрику по коду.
 * Используется для progressive loading — каждый виджет грузится независимо.
 * Использует in-memory кеш на клиенте (TTL 3 минуты).
 */
export async function getSingleLeaderMetric(
  metricCode: LeaderMetricCode,
  query: LeaderMetricsQuery
): Promise<FullWidthKPIMetric | null> {
  // Проверяем кеш (sessionStorage)
  const cacheKey = getCacheKey(metricCode, query);
  const cached = getFromCache<FullWidthKPIMetric | null>(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const params = buildMetricsParams(query);
  params.set("metric_codes", metricCode);

  const url = `/api/top-leader-metrics?${params.toString()}`;
  const resp = await fetch(url, { method: "GET", credentials: "include" });

  if (!resp.ok) {
    console.warn(`Failed to load metric ${metricCode}: ${resp.status}`);
    return null;
  }

  const data = (await resp.json()) as FullWidthKPIMetric[];
  const result = data.find(m => m.id === metricCode) ?? data[0] ?? null;

  // Сохраняем в кеш
  setInCache(cacheKey, result);

  return result;
}

/** Коды метрик для рейтинга менеджеров */
export const MANAGER_RANKING_METRIC_CODES = [
  'revenue_created',
  'revenue_closed',
  'frames_count',
  'avg_glasses_price',
  'conversion_rate',
  'csi',
  'margin_rate',
] as const;

export type ManagerRankingMetricCode = typeof MANAGER_RANKING_METRIC_CODES[number];

/**
 * Загружает одну метрику для всех менеджеров.
 * Используется для progressive loading таблицы рейтинга — столбец за столбцом.
 * Использует sessionStorage кеш на клиенте (TTL 3 минуты).
 */
export async function getManagerMetric(
  metricCode: ManagerRankingMetricCode,
  query: { store_ids: string[]; date_from?: string; date_to?: string }
): Promise<ManagerMetricResponse | null> {
  // Проверяем кеш (sessionStorage)
  const cacheKey = getManagerCacheKey(metricCode, query.store_ids, query.date_from, query.date_to);
  const cached = getFromCache<ManagerMetricResponse | null>(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const params = new URLSearchParams();
  params.set("metric_codes", metricCode);
  params.set("by_managers", "True");
  params.set("raw", "true");

  if (query.date_from) params.set("date_from", query.date_from);
  if (query.date_to) params.set("date_to", query.date_to);
  query.store_ids.forEach((id) => params.append("store_ids", id));

  const url = `/api/top-leader-metrics?${params.toString()}`;
  const resp = await fetch(url, { method: "GET", credentials: "include" });

  if (!resp.ok) {
    console.warn(`Failed to load manager metric ${metricCode}: ${resp.status}`);
    // Кешируем null чтобы не повторять failed запросы
    setInCache(cacheKey, null);
    return null;
  }

  const json = await resp.json();
  // raw=true возвращает { data: [{ code, managers: {...} }, ...] }
  const data = json?.data?.[0];
  if (!data?.code) {
    setInCache(cacheKey, null);
    return null;
  }

  const result: ManagerMetricResponse = {
    code: String(data.code),
    managers: data.managers ?? {},
    stores: data.stores,
  };

  // Сохраняем в кеш
  setInCache(cacheKey, result);

  return result;
}

// ========== Daily Plan Graph (chart data per day) ==========

export interface DailyPlanGraphPoint {
  fact_value: number;
  plan_value: number;
}

export interface DailyPlanGraphResponse {
  code: string;
  type?: string;
  value_type?: string;
  value_postfix_type?: string;
  data: Record<string, Record<string, DailyPlanGraphPoint>>;
}

export interface DailyPlanGraphParams {
  metricName: string;
  dateFrom: string;
  dateTo: string;
  subjectType: 'manager' | 'store';
  subjectIds: string[];
  isAggregated: boolean;
}

export async function fetchMetricDailyGraph(params: DailyPlanGraphParams): Promise<DailyPlanGraphResponse> {
  const qs = new URLSearchParams();
  qs.set('metric_name', params.metricName);
  qs.set('date_from', params.dateFrom);
  qs.set('date_to', params.dateTo);
  qs.set('subject_type', params.subjectType);
  params.subjectIds.forEach(id => qs.append('subject_ids', id));
  qs.set('is_aggregated', String(params.isAggregated));

  const resp = await fetch(`/api/metric-daily-graph?${qs.toString()}`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Daily graph API error (${resp.status}): ${text || resp.statusText}`);
  }

  return (await resp.json()) as DailyPlanGraphResponse;
}

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getSingleLeaderMetric,
  LEADER_METRIC_CODES,
  type LeaderMetricCode,
  type LeaderMetricsQuery,
} from '@/lib/leaderDashboardApi';
import type { FullWidthKPIMetric } from '@/components/dashboard/KPIFullWidthCard';
import { readTtlCacheEntry, writeTtlCache } from '@/lib/storage';

export type MetricLoadingState = 'idle' | 'loading' | 'loaded' | 'error';

export interface ProgressiveMetricsState {
  /** Карта метрик по id */
  metrics: Map<string, FullWidthKPIMetric>;
  /** Состояние загрузки каждой метрики */
  loadingStates: Map<string, MetricLoadingState>;
  /** Общий флаг: хотя бы одна метрика ещё грузится */
  isLoading: boolean;
  /** Все метрики загружены */
  isComplete: boolean;
}

interface UseProgressiveMetricsOptions {
  /** Метаданные метрик (имена, цвета, единицы) для fallback */
  metricMeta?: Map<string, Partial<FullWidthKPIMetric>>;
  /** TTL кеша в мс (default: 5 минут) */
  cacheTtlMs?: number;
  /** Отключить загрузку */
  enabled?: boolean;
}

/**
 * Хук для progressive loading метрик.
 * Каждая метрика грузится независимо и появляется в UI как только готова.
 */
export function useProgressiveMetrics(
  query: LeaderMetricsQuery | null,
  options: UseProgressiveMetricsOptions = {}
): ProgressiveMetricsState {
  const { metricMeta, cacheTtlMs = 5 * 60 * 1000, enabled = true } = options;

  const [metrics, setMetrics] = useState<Map<string, FullWidthKPIMetric>>(new Map());
  const [loadingStates, setLoadingStates] = useState<Map<string, MetricLoadingState>>(new Map());

  // Для отмены запросов при изменении query
  const abortControllerRef = useRef<AbortController | null>(null);

  const buildCacheKey = useCallback(
    (metricCode: string) => {
      if (!query) return null;
      const storeScope = Array.isArray(query.store_ids) && query.store_ids.length > 0
        ? `stores:${[...query.store_ids].sort().join(',')}`
        : `store:${query.store_id ?? ''}`;
      return `leaderDashboard.metric_v1:${metricCode}:${query.department_id ?? ''}:${storeScope}:${query.date_from ?? ''}:${query.date_to ?? ''}`;
    },
    [query]
  );

  const enrichMetric = useCallback(
    (metric: FullWidthKPIMetric): FullWidthKPIMetric => {
      const meta = metricMeta?.get(metric.id);
      return {
        ...metric,
        name: metric.name ?? meta?.name ?? metric.id,
        unit: metric.unit ?? meta?.unit ?? '',
        color: (metric.color as string | null) ?? (meta?.color as string | undefined) ?? '#3b82f6',
      };
    },
    [metricMeta]
  );

  useEffect(() => {
    if (!enabled || !query || !query.department_id) {
      return;
    }

    // Отменяем предыдущие запросы
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    // Инициализируем состояния загрузки
    const initialLoadingStates = new Map<string, MetricLoadingState>();
    LEADER_METRIC_CODES.forEach(code => {
      initialLoadingStates.set(code, 'loading');
    });
    setLoadingStates(initialLoadingStates);

    // Проверяем кеш и сразу показываем закешированные значения
    const cachedMetrics = new Map<string, FullWidthKPIMetric>();
    LEADER_METRIC_CODES.forEach(code => {
      const cacheKey = buildCacheKey(code);
      if (cacheKey) {
        const cached = readTtlCacheEntry<FullWidthKPIMetric>(cacheKey, cacheTtlMs);
        if (cached?.data) {
          cachedMetrics.set(code, enrichMetric(cached.data));
        }
      }
    });
    if (cachedMetrics.size > 0) {
      setMetrics(cachedMetrics);
    }

    // Запускаем параллельные запросы
    const fetchMetric = async (metricCode: LeaderMetricCode) => {
      try {
        const data = await getSingleLeaderMetric(metricCode, query);

        if (abortControllerRef.current?.signal.aborted) return;

        if (data) {
          const enriched = enrichMetric(data);

          // Обновляем кеш
          const cacheKey = buildCacheKey(metricCode);
          if (cacheKey) {
            writeTtlCache(cacheKey, enriched);
          }

          // Обновляем state
          setMetrics(prev => new Map(prev).set(metricCode, enriched));
          setLoadingStates(prev => new Map(prev).set(metricCode, 'loaded'));
        } else {
          setLoadingStates(prev => new Map(prev).set(metricCode, 'error'));
        }
      } catch (e) {
        if (abortControllerRef.current?.signal.aborted) return;
        console.warn(`Failed to load metric ${metricCode}:`, e);
        setLoadingStates(prev => new Map(prev).set(metricCode, 'error'));
      }
    };

    // Запускаем все запросы параллельно
    LEADER_METRIC_CODES.forEach(code => {
      fetchMetric(code);
    });

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [query, enabled, buildCacheKey, cacheTtlMs, enrichMetric]);

  // Вычисляем общие флаги
  const isLoading = Array.from(loadingStates.values()).some(s => s === 'loading');
  const isComplete = loadingStates.size === LEADER_METRIC_CODES.length &&
    Array.from(loadingStates.values()).every(s => s === 'loaded' || s === 'error');

  return {
    metrics,
    loadingStates,
    isLoading,
    isComplete,
  };
}

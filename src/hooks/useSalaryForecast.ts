import { useCallback, useRef, useState } from 'react';
import { getSingleLeaderMetric, getManagerMetric, type LeaderMetricCode, type ManagerRankingMetricCode } from '@/lib/leaderDashboardApi';

/** Strip "itigris-" or "itigris_" prefix from Tracker manager keys */
function normalizeItigrisId(raw: string): string {
  return String(raw).trim().replace(/^itigris[-_]/i, '').trim();
}

/** Current month date range (YYYY-MM-DD) */
function getCurrentMonthRange(): { date_from: string; date_to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const lastDay = new Date(y, m, 0).getDate();
  const mm = String(m).padStart(2, '0');
  return {
    date_from: `${y}-${mm}-01`,
    date_to: `${y}-${mm}-${String(lastDay).padStart(2, '0')}`,
  };
}

export interface ForecastData {
  personalPlan: number;
  clubPlan: number;
  personalFact: number;
  clubFact: number;
  personalCurrentFact: number;
  clubCurrentFact: number;
}

export function useSalaryForecast(params: {
  storeId: string | null;
  itigrisUserId: string | null;
  managerMetricCode?: string;
  clubMetricCode?: string;
}) {
  const { storeId, itigrisUserId, managerMetricCode, clubMetricCode } = params;

  const [forecastData, setForecastData] = useState<ForecastData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Counter to discard stale responses when branch switches during a fetch
  const requestIdRef = useRef(0);

  const clearForecast = useCallback(() => {
    requestIdRef.current += 1; // Invalidate any pending fetch
    setForecastData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  const fetchForecast = useCallback(async () => {
    if (!storeId || !itigrisUserId) {
      setError('Отсутствует store_id или itigris_user_id');
      return;
    }

    const myRequestId = ++requestIdRef.current;

    setIsLoading(true);
    setError(null);

    try {
      const { date_from, date_to } = getCurrentMonthRange();
      console.log('[SalaryForecast] Fetching with storeId:', storeId, 'itigrisUserId:', itigrisUserId, 'dates:', date_from, date_to);

      const clubCode = (clubMetricCode || 'revenue_created') as LeaderMetricCode;
      const mgrCode = (managerMetricCode || 'revenue_created') as ManagerRankingMetricCode;

      const [branchMetric, managerMetric] = await Promise.all([
        getSingleLeaderMetric(clubCode, { store_id: storeId, date_from, date_to }),
        getManagerMetric(mgrCode, { store_ids: [storeId], date_from, date_to }),
      ]);

      // Discard if branch changed while we were fetching
      if (requestIdRef.current !== myRequestId) return;

      console.log('[SalaryForecast] branchMetric:', branchMetric);
      console.log('[SalaryForecast] managerMetric:', managerMetric);

      if (!branchMetric) {
        setError(`Не удалось загрузить данные филиала (store_id: ${storeId})`);
        setIsLoading(false);
        return;
      }

      const branchPlan = branchMetric.plan ?? 0;
      const branchForecastPercent = branchMetric.forecast ?? 0;
      const branchForecastMoney = (branchForecastPercent / 100) * branchPlan;
      const branchCurrentFact = branchMetric.current ?? 0;

      let managerPlan = 0;
      let managerForecast = 0;
      let managerCurrentFact = 0;
      let managerFound = false;

      if (managerMetric?.managers) {
        const normalizedTargetId = normalizeItigrisId(itigrisUserId);
        const managerKeys = Object.keys(managerMetric.managers);
        console.log('[SalaryForecast] Looking for itigrisUserId:', itigrisUserId, '→ normalized:', normalizedTargetId);
        console.log('[SalaryForecast] Available manager keys:', managerKeys.map(k => `${k} → ${normalizeItigrisId(k)}`));

        for (const [rawKey, data] of Object.entries(managerMetric.managers)) {
          const normalizedKey = normalizeItigrisId(rawKey);
          if (normalizedKey === normalizedTargetId) {
            managerPlan = data.plan_value ?? 0;
            managerForecast = data.forecast_value ?? 0;
            managerCurrentFact = data.fact_value ?? 0;
            managerFound = true;
            break;
          }
        }
      }

      if (!managerFound) {
        setError('Сотрудник не найден в данных Трекера');
        setIsLoading(false);
        return;
      }

      setForecastData({
        personalPlan: Math.round(managerPlan),
        clubPlan: Math.round(branchPlan),
        personalFact: Math.round(managerForecast),
        clubFact: Math.round(branchForecastMoney),
        personalCurrentFact: Math.round(managerCurrentFact),
        clubCurrentFact: Math.round(branchCurrentFact),
      });
    } catch (err) {
      if (requestIdRef.current !== myRequestId) return;
      console.error('[SalaryForecast] fetch error:', err);
      setError('Ошибка загрузки прогноза');
    } finally {
      if (requestIdRef.current === myRequestId) {
        setIsLoading(false);
      }
    }
  }, [storeId, itigrisUserId, managerMetricCode, clubMetricCode]);

  return {
    forecastData,
    isLoading,
    error,
    fetchForecast,
    clearForecast,
  };
}

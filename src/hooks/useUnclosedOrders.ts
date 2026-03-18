import { useState, useEffect } from 'react';
import { internalApiClient, UnclosedOrdersResponse } from '@/lib/internalApiClient';
import { useEmployee } from '@/contexts/EmployeeProvider';
import { logger } from '@/lib/logger';
import { readTtlCacheEntry, writeTtlCache } from '@/lib/storage';

export const useUnclosedOrders = () => {
  const { employee, storeId, canUseLeaderDashboard } = useEmployee();
  const [data, setData] = useState<UnclosedOrdersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    // Определяем, является ли пользователь руководителем клуба
    const isClubManager = canUseLeaderDashboard;

    // Проверяем наличие необходимых идентификаторов
    if (isClubManager) {
      if (!storeId) {
        setLoading(false);
        setError('Store ID отсутствует');
        return;
      }
    } else {
      if (!employee?.custom_itigris_user_id) {
        setLoading(false);
        setError('Itigris User ID отсутствует');
        return;
      }
    }

    const ttlMs = 5 * 60 * 1000;
    const cacheKey = isClubManager
      ? `unclosed_orders_v1:store:${storeId}`
      : `unclosed_orders_v1:emp:${employee!.custom_itigris_user_id}`;
    const cached = readTtlCacheEntry<UnclosedOrdersResponse>(cacheKey, ttlMs);

    // SWR: показываем кеш мгновенно, сеть — в фоне
    if (cached?.data) {
      setData(cached.data);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const resp = isClubManager
        ? await internalApiClient.getUnclosedOrders(undefined, storeId!)
        : await internalApiClient.getUnclosedOrders(employee!.custom_itigris_user_id);
      setData(resp);
      writeTtlCache(cacheKey, resp);
    } catch (err) {
      setError('Ошибка загрузки данных');
      logger.error('❌ Ошибка загрузки незакрытых заказов:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee?.custom_itigris_user_id, storeId, employee?.designation, canUseLeaderDashboard]);

  return { data, loading, error, reload: load };
}; 
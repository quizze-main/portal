import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'manager-metrics-layout';

const DEFAULT_ORDER = ['created', 'closed', 'forecast', 'losses'];

export function useManagerMetricsLayout() {
  const [metricsOrder, setMetricsOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return DEFAULT_ORDER;
      }
    }
    return DEFAULT_ORDER;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(metricsOrder));
  }, [metricsOrder]);

  const updateOrder = useCallback((newOrder: string[]) => {
    setMetricsOrder(newOrder);
  }, []);

  const resetOrder = useCallback(() => {
    setMetricsOrder(DEFAULT_ORDER);
  }, []);

  return {
    metricsOrder,
    updateOrder,
    resetOrder,
  };
}

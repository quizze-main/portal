import { useState, useCallback, useEffect } from 'react';
import { MetricLayoutItem, MetricsLayout } from './useMetricsLayout';

const STORAGE_KEY_PREFIX = 'manager-detail-layout';
const LAYOUT_VERSION = 1;

export function useManagerDetailLayout(managerId: string, metricIds: string[]) {
  const storageKey = `${STORAGE_KEY_PREFIX}-${managerId}`;

  const [layout, setLayout] = useState<MetricsLayout>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as MetricsLayout;
        if (parsed.version === LAYOUT_VERSION) {
          return parsed;
        }
      }
    } catch {
      // ignore parse errors
    }
    return createDefaultLayout(metricIds);
  });

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
      }));
    }
  }, [metricIds, layout.items]);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(layout));
    } catch {
      // localStorage может быть недоступен (Telegram WebView / private mode)
    }
  }, [layout, storageKey]);

  const updateLayout = useCallback((newItems: MetricLayoutItem[]) => {
    setLayout(prev => ({
      ...prev,
      items: newItems,
    }));
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

      return { ...prev, items };
    });
  }, []);

  const resetLayout = useCallback(() => {
    const defaultLayout = createDefaultLayout(metricIds);
    setLayout(defaultLayout);
  }, [metricIds]);

  return {
    layout,
    updateLayout,
    setColumnSpan,
    resetLayout,
  };
}

function createDefaultLayout(metricIds: string[]): MetricsLayout {
  const items: MetricLayoutItem[] = metricIds.map((id, idx) => ({
    id,
    rowIndex: idx,
    columnSpan: 1,
    order: 0,
  }));

  return {
    items,
    version: LAYOUT_VERSION,
  };
}

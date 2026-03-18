import { useState, useCallback, useEffect } from 'react';

export interface MetricLayoutItem {
  id: string;
  rowIndex: number;
  columnSpan: 1 | 2;
  order: number;
}

export interface MetricsLayout {
  items: MetricLayoutItem[];
  version: number;
}

const STORAGE_KEY = 'metrics-layout';
const LAYOUT_VERSION = 2; // Incremented to reset old layouts

export function useMetricsLayout(metricIds: string[]) {
  const [layout, setLayout] = useState<MetricsLayout>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  }, [layout]);

  const updateLayout = useCallback((newItems: MetricLayoutItem[]) => {
    setLayout(prev => ({
      ...prev,
      items: newItems,
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

      return { ...prev, items };
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

      return { ...prev, items };
    });
  }, []);

  const resetLayout = useCallback(() => {
    const defaultLayout = createDefaultLayout(metricIds);
    setLayout(defaultLayout);
  }, [metricIds]);

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
    resetLayout,
    getRowsLayout,
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
  };
}

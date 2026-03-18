import React, { memo, useMemo, useState } from 'react';
import { ChartWidget } from './ChartWidget';
import type { DashboardMetricConfig, ChartWidgetConfig, ChartMetricSeries } from '@/lib/internalApiClient';
import { CHART_SERIES_COLORS } from '@/lib/internalApiClient';
import { cn } from '@/lib/utils';
import { BarChart3, ChevronDown, Check, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface MetricQuickChartProps {
  metrics: DashboardMetricConfig[];
  storeIds: string[];
  dateFrom?: string;
  dateTo?: string;
  /** Force collapsed state (e.g. in edit mode) */
  forceCollapsed?: boolean;
}

/** Determine chart type based on metric valueType */
function getChartType(m: DashboardMetricConfig): 'bar' | 'line' {
  if (m.valueType === 'percentage') return 'line';
  return 'bar';
}

function MetricQuickChartInner({ metrics, storeIds, dateFrom, dateTo, forceCollapsed }: MetricQuickChartProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const availableMetrics = useMemo(
    () => metrics.filter(m => m.source === 'tracker' || m.source === 'manual' || m.source === 'computed'),
    [metrics],
  );

  const selectedMetric = useMemo(
    () => availableMetrics.find(m => m.id === selectedId) || null,
    [availableMetrics, selectedId],
  );

  const chartConfig = useMemo((): ChartWidgetConfig | null => {
    if (!selectedMetric) return null;
    const chartType = getChartType(selectedMetric);
    const series: ChartMetricSeries = {
      metricCode: selectedMetric.id,
      chartType,
      color: selectedMetric.color || CHART_SERIES_COLORS[0],
      barStyle: chartType === 'bar' ? 'dynamic' : undefined,
    };
    return {
      metricSeries: [series],
      subjectType: 'store',
      isAggregated: true,
    };
  }, [selectedMetric]);

  if (availableMetrics.length === 0) return null;

  return (
    <div className="bg-card border rounded-xl p-3 lg:p-4 space-y-3">
      {/* Header with dropdown + close */}
      <div className="flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-muted-foreground" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1.5 text-sm font-semibold hover:text-primary transition-colors cursor-pointer select-none"
            >
              {selectedMetric ? selectedMetric.name : 'Выберите метрику'}
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 p-1">
            {availableMetrics.map(m => {
              const isActive = selectedId === m.id;
              const chartType = getChartType(m);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedId(m.id)}
                  className={cn(
                    "w-full flex items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground hover:bg-muted/60",
                  )}
                >
                  <span
                    className={cn(
                      "shrink-0",
                      chartType === 'line' ? "w-3.5 h-[2px] rounded-full" : "w-2.5 h-2.5 rounded-sm",
                    )}
                    style={{ backgroundColor: m.color || CHART_SERIES_COLORS[0] }}
                  />
                  <span className="flex-1 truncate">{m.name}</span>
                  {m.unit && (
                    <span className="text-[10px] text-muted-foreground">{m.unit}</span>
                  )}
                  {isActive && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                </button>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Close button */}
        {selectedMetric && (
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            className="ml-auto p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Chart — hidden when forceCollapsed */}
      {!forceCollapsed && (
        chartConfig && selectedMetric ? (
          <ChartWidget
            key={selectedMetric.id}
            config={chartConfig}
            title={selectedMetric.name}
            storeIds={storeIds}
            dateFrom={dateFrom}
            dateTo={dateTo}
            hideHeader
          />
        ) : (
          <div className="py-6 text-center text-xs text-muted-foreground">
            Выберите метрику из списка
          </div>
        )
      )}
    </div>
  );
}

export const MetricQuickChart = memo(MetricQuickChartInner);

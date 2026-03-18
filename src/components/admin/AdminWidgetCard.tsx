import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { GripVertical, Settings, Trash2, BarChart3, LineChart, ListFilter } from 'lucide-react';
import type { DashboardWidget, RankingWidgetConfig, ChartWidgetConfig } from '@/lib/internalApiClient';
import { METRIC_NAMES } from '@/hooks/useLeaderMetrics';
import { cn } from '@/lib/utils';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChartWidget } from '@/components/leader-dashboard/ChartWidget';
import { AdminRankingPreview } from './AdminRankingPreview';

interface AdminWidgetCardProps {
  widget: DashboardWidget;
  onToggleEnabled: (enabled: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  isDragging?: boolean;
  /** Map of parentId → name for display */
  parentName?: string;
  /** Enable dnd-kit sortable behavior */
  sortable?: boolean;
  /** Preview context — needed for live previews */
  previewStoreIds?: string[];
  previewDateFrom?: string;
  previewDateTo?: string;
}

const ENTITY_TYPE_LABELS: Record<string, string> = {
  branch: 'Филиалы',
  manager: 'Сотрудники',
};

const CHART_TYPE_LABELS: Record<string, string> = {
  bar: 'Столбчатый',
  percent: 'Линейный %',
};

const SUBJECT_TYPE_LABELS: Record<string, string> = {
  store: 'Филиал',
  manager: 'Менеджер',
};

function getLossLabel(config: RankingWidgetConfig): string {
  const lc = config.lossConfig;
  if (!lc || lc.mode === 'disabled') return 'выкл.';
  if (lc.mode === 'auto') return `авто (${METRIC_NAMES[lc.metricCode] || lc.metricCode})`;
  if (lc.mode === 'metric') return METRIC_NAMES[lc.metricCode] || lc.metricCode;
  return 'формула';
}

function getChartDescription(config: ChartWidgetConfig): string {
  const subject = SUBJECT_TYPE_LABELS[config.subjectType] || config.subjectType;

  // New multi-metric format
  if (config.metricSeries && config.metricSeries.length > 0) {
    const names = config.metricSeries.map(s => METRIC_NAMES[s.metricCode] || s.metricCode);
    const types = [...new Set(config.metricSeries.map(s => s.chartType === 'line' ? 'Лин' : 'Стлб'))];
    return `${names.join(', ')} · ${types.join('+')} · ${subject}`;
  }

  // Legacy single-metric format
  const metric = METRIC_NAMES[config.metricCode!] || config.metricCode;
  const chart = CHART_TYPE_LABELS[config.chartType!] || config.chartType;
  return `${metric} · ${chart} · ${subject}`;
}

export default function AdminWidgetCard({
  widget,
  onToggleEnabled,
  onEdit,
  onDelete,
  isDragging: isDraggingProp,
  parentName,
  sortable = false,
  previewStoreIds,
  previewDateFrom,
  previewDateTo,
}: AdminWidgetCardProps) {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging: isDraggingSortable,
  } = useSortable({ id: widget.id, disabled: !sortable });

  const isDragging = isDraggingProp || isDraggingSortable;

  const sortableStyle = sortable ? {
    transform: CSS.Transform.toString(transform),
    transition,
  } : undefined;

  const isChart = widget.type === 'chart';
  const chartConfig = isChart ? widget.config as ChartWidgetConfig : null;
  const isMetricSelector = isChart && !!chartConfig?.isMetricSelector;
  const rankingConfig = widget.type === 'ranking' ? widget.config as RankingWidgetConfig : null;

  return (
    <>
      <div
        ref={sortable ? setNodeRef : undefined}
        style={sortableStyle}
        className={cn(
          'border rounded-xl bg-card shadow-sm transition-all',
          !widget.enabled && 'opacity-60',
          isDragging && 'opacity-40 ring-2 ring-dashed ring-primary/50 z-50',
        )}
      >
        <div className="px-3 py-2.5 flex items-center gap-2">
          {/* Drag handle */}
          <button
            ref={sortable ? setActivatorNodeRef : undefined}
            {...(sortable ? { ...attributes, ...listeners } : {})}
            className="touch-none cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground"
          >
            <GripVertical className="w-4 h-4" />
          </button>

          {/* Icon */}
          {isMetricSelector
            ? <ListFilter className="w-4 h-4 text-violet-500 shrink-0" />
            : isChart
              ? <LineChart className="w-4 h-4 text-emerald-500 shrink-0" />
              : <BarChart3 className="w-4 h-4 text-blue-500 shrink-0" />
          }

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{widget.name}</div>
            <div className="text-[11px] text-muted-foreground truncate">
              {isMetricSelector
                ? <>
                    Все метрики · Авто-определение типа
                    {' · '}
                    {widget.parentId ? (parentName || widget.parentId) : 'Главная'}
                  </>
                : isChart && chartConfig
                  ? <>
                      {getChartDescription(chartConfig)}
                      {' · '}
                      {widget.parentId ? (parentName || widget.parentId) : 'Главная'}
                    </>
                  : rankingConfig && <>
                      {ENTITY_TYPE_LABELS[rankingConfig.entityType] || rankingConfig.entityType}
                      {' · '}
                      {rankingConfig.metricCodes?.length || 0} метрик
                      {' · Потери: '}
                      {getLossLabel(rankingConfig)}
                      {' · '}
                      {widget.parentId ? (parentName || widget.parentId) : 'Главная'}
                    </>
              }
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Switch
              checked={widget.enabled}
              onCheckedChange={onToggleEnabled}
              className="scale-75"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              className="h-7 w-7 p-0"
            >
              <Settings className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteConfirmOpen(true)}
              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Live preview for enabled widgets */}
        {widget.enabled && previewStoreIds && previewStoreIds.length > 0 && (
          <div className="px-3 pb-2 pointer-events-none max-h-[160px] overflow-hidden">
            {isChart && chartConfig && !isMetricSelector && (
              <ChartWidget
                config={chartConfig}
                title=""
                storeIds={previewStoreIds}
                dateFrom={previewDateFrom}
                dateTo={previewDateTo}
                compact
              />
            )}
            {rankingConfig && (
              <AdminRankingPreview
                config={rankingConfig}
                storeIds={previewStoreIds}
                dateFrom={previewDateFrom}
                dateTo={previewDateTo}
              />
            )}
          </div>
        )}
      </div>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить виджет?</AlertDialogTitle>
            <AlertDialogDescription>
              Виджет «{widget.name}» будет удалён. Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Save, Plus, Trash2, BarChart3, TrendingUp, Layers, AlertTriangle, ListFilter } from 'lucide-react';
import type { DashboardWidget, ChartWidgetConfig, ChartMetricSeries } from '@/lib/internalApiClient';
import { CHART_SERIES_COLORS, normalizeChartConfig } from '@/lib/internalApiClient';
import { METRIC_NAMES, METRIC_UNITS } from '@/hooks/useLeaderMetrics';
import { LEADER_METRIC_CODES } from '@/lib/leaderDashboardApi';
import { cn } from '@/lib/utils';

type DialogMode = 'create' | 'edit';
type ChartMode = 'bar' | 'line' | 'mixed' | 'selector';
type BarStyle = 'dynamic' | 'static';

interface ChartWidgetEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  widget: DashboardWidget | null;
  onSave: (id: string, data: Partial<DashboardWidget>) => Promise<void>;
  onCreate?: (data: Partial<DashboardWidget>) => Promise<void>;
  isSaving?: boolean;
  parentMetrics?: Array<{ id: string; name: string }>;
  availableMetrics?: Array<{ id: string; name: string; unit?: string; trackerCode?: string }>;
}

const MAX_SERIES = 5;

/** Detect chart mode from existing series */
function detectChartMode(series: ChartMetricSeries[], isMetricSelector?: boolean): ChartMode {
  if (isMetricSelector) return 'selector';
  if (series.length === 0) return 'bar';
  const types = new Set(series.map(s => s.chartType));
  if (types.size === 1) return types.has('line') ? 'line' : 'bar';
  return 'mixed';
}

/** Detect bar style from existing series (chart-level) */
function detectBarStyle(series: ChartMetricSeries[]): BarStyle {
  const bars = series.filter(s => s.chartType === 'bar');
  if (bars.length === 0) return 'dynamic';
  return bars[0].barStyle === 'static' ? 'static' : 'dynamic';
}

function getNextColor(existingSeries: ChartMetricSeries[]): string {
  const usedColors = new Set(existingSeries.map(s => s.color));
  return CHART_SERIES_COLORS.find(c => !usedColors.has(c)) || CHART_SERIES_COLORS[existingSeries.length % CHART_SERIES_COLORS.length];
}

/** Get metric label with unit */
function metricLabel(code: string): string {
  const name = METRIC_NAMES[code] || code;
  const unit = METRIC_UNITS[code];
  return unit ? `${name} (${unit})` : name;
}

export default function ChartWidgetEditDialog({
  open,
  onOpenChange,
  widget,
  onSave,
  onCreate,
  isSaving,
  parentMetrics = [],
  availableMetrics = [],
}: ChartWidgetEditDialogProps) {
  const mode: DialogMode = widget ? 'edit' : 'create';
  const rawConfig = (widget?.config || {}) as ChartWidgetConfig;
  const normalized = normalizeChartConfig(rawConfig);

  // ── State ──
  const [name, setName] = useState(widget?.name || '');
  const [metricSeries, setMetricSeries] = useState<ChartMetricSeries[]>(normalized.metricSeries);
  const [chartMode, setChartMode] = useState<ChartMode>(() => detectChartMode(normalized.metricSeries, rawConfig.isMetricSelector));
  const [barStyle, setBarStyle] = useState<BarStyle>(() => detectBarStyle(normalized.metricSeries));
  const [subjectType, setSubjectType] = useState<'store' | 'manager'>(normalized.subjectType || 'store');
  const [isAggregated, setIsAggregated] = useState(normalized.isAggregated ?? true);
  const [parentId, setParentId] = useState<string | null>(widget?.parentId || null);

  // ── Metric options: catalog has priority over hardcode ──
  const allChartMetrics = useMemo(() => {
    const catalogCodes = new Set<string>();
    const fromCatalog = availableMetrics.map(m => {
      const code = m.trackerCode || m.id;
      catalogCodes.add(code);
      return { code, label: m.name, unit: m.unit || METRIC_UNITS[code] || '' };
    });
    const fromHardcode = (LEADER_METRIC_CODES as readonly string[])
      .filter(c => !catalogCodes.has(c))
      .map(c => ({ code: c, label: METRIC_NAMES[c] || c, unit: METRIC_UNITS[c] || '' }));
    return [...fromHardcode, ...fromCatalog];
  }, [availableMetrics]);

  const chartMetricLabel = (code: string): string => {
    const m = allChartMetrics.find(o => o.code === code);
    if (m) return m.unit ? `${m.label} (${m.unit})` : m.label;
    return metricLabel(code);
  };

  // ── Derived ──
  const isSelector = chartMode === 'selector';
  const hasBars = !isSelector && (chartMode === 'bar' || chartMode === 'mixed');

  // Warn if mixing units
  const unitWarning = useMemo(() => {
    const units = new Set(metricSeries.map(s => METRIC_UNITS[s.metricCode] || ''));
    if (units.size > 1 && units.has('%')) return 'Разные единицы (% и ₽) — будет двойная шкала Y';
    return null;
  }, [metricSeries]);

  // ── Handlers ──
  const handleChartModeChange = (newMode: ChartMode) => {
    setChartMode(newMode);
    // Update all series chartType to match the new mode (bar/line uniform, mixed keeps as-is)
    if (newMode === 'bar') {
      setMetricSeries(prev => prev.map(s => ({ ...s, chartType: 'bar' as const })));
    } else if (newMode === 'line') {
      setMetricSeries(prev => prev.map(s => ({ ...s, chartType: 'line' as const, barStyle: undefined })));
    }
    // 'mixed' — leave series types as they are, user configures per-metric
    // 'selector' — no series needed, all metrics available via dropdown
  };

  const addSeries = () => {
    if (metricSeries.length >= MAX_SERIES) return;
    const usedCodes = new Set(metricSeries.map(s => s.metricCode));
    const nextCode = allChartMetrics.find(c => !usedCodes.has(c.code))?.code || allChartMetrics[0]?.code || 'revenue_created';
    const defaultType = chartMode === 'line' ? 'line' : 'bar';
    setMetricSeries(prev => [...prev, {
      metricCode: nextCode,
      chartType: defaultType,
      color: getNextColor(prev),
    }]);
  };

  const removeSeries = (idx: number) => {
    if (metricSeries.length <= 1) return;
    setMetricSeries(prev => prev.filter((_, i) => i !== idx));
  };

  const updateSeries = (idx: number, patch: Partial<ChartMetricSeries>) => {
    setMetricSeries(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));
  };

  const handleSave = async () => {
    const isSelector = chartMode === 'selector';

    // Apply chart-level barStyle to all bar series before saving
    const finalSeries = isSelector ? [] : metricSeries.map(s => ({
      ...s,
      barStyle: s.chartType === 'bar' ? barStyle : undefined,
    }));

    const chartConfig: ChartWidgetConfig = {
      metricSeries: finalSeries,
      subjectType,
      isAggregated,
      ...(isSelector ? { isMetricSelector: true } : {}),
    };

    const autoName = isSelector
      ? 'Мульти-график'
      : metricSeries.length === 1
        ? `График: ${chartMetricLabel(metricSeries[0].metricCode)}`
        : `График: ${metricSeries.length} метрик`;

    const data: Partial<DashboardWidget> = {
      name: name.trim() || autoName,
      parentId: parentId || null,
      config: chartConfig,
    };

    if (mode === 'edit' && widget) {
      await onSave(widget.id, data);
    } else if (mode === 'create' && onCreate) {
      await onCreate({ ...data, type: 'chart', enabled: true });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">
            {mode === 'create' ? 'Новый график' : 'Настройки графика'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">

          {/* ── Section 1: Chart type ── */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Тип графика</label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: 'bar' as ChartMode, icon: BarChart3, label: 'Столбчатая', desc: 'Столбцы по дням' },
                { value: 'line' as ChartMode, icon: TrendingUp, label: 'Линейная', desc: 'Плавная кривая' },
                { value: 'mixed' as ChartMode, icon: Layers, label: 'Комбинированная', desc: 'Столбцы + линия' },
                { value: 'selector' as ChartMode, icon: ListFilter, label: 'Мульти-график', desc: 'Выбор метрики из списка' },
              ]).map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleChartModeChange(opt.value)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all cursor-pointer",
                    chartMode === opt.value
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-muted-foreground/30 bg-background"
                  )}
                >
                  <opt.icon className={cn("w-5 h-5", chartMode === opt.value ? "text-primary" : "text-muted-foreground")} />
                  <span className={cn("text-xs font-medium", chartMode === opt.value ? "text-primary" : "text-foreground")}>{opt.label}</span>
                  <span className="text-[10px] text-muted-foreground">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Section 2: Bar style (only when chart has bars) ── */}
          {hasBars && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Стиль столбцов</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setBarStyle('dynamic')}
                  className={cn(
                    "flex flex-col items-start gap-1 p-2.5 rounded-lg border-2 transition-all cursor-pointer text-left",
                    barStyle === 'dynamic'
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/30"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="flex gap-0.5">
                      <span className="w-2 h-4 rounded-sm bg-emerald-500" />
                      <span className="w-2 h-3 rounded-sm bg-red-500" />
                      <span className="w-2 h-5 rounded-sm bg-emerald-500" />
                    </span>
                    <span className={cn("text-xs font-medium", barStyle === 'dynamic' ? "text-primary" : "text-foreground")}>По плану</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">Зелёный ≥ план, красный &lt; план</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBarStyle('static')}
                  className={cn(
                    "flex flex-col items-start gap-1 p-2.5 rounded-lg border-2 transition-all cursor-pointer text-left",
                    barStyle === 'static'
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/30"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="flex gap-0.5">
                      <span className="w-2 h-4 rounded-sm bg-blue-500" />
                      <span className="w-2 h-3 rounded-sm bg-blue-500" />
                      <span className="w-2 h-5 rounded-sm bg-blue-500" />
                    </span>
                    <span className={cn("text-xs font-medium", barStyle === 'static' ? "text-primary" : "text-foreground")}>Одноцветный</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">Один цвет на серию</span>
                </button>
              </div>
            </div>
          )}

          {/* ── Selector mode hint ── */}
          {isSelector && (
            <div className="p-3 rounded-lg border border-dashed border-primary/30 bg-primary/5 text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Мульти-график</p>
              <p>На дашборде появится выпадающий список со всеми включёнными метриками. Тип графика (столбчатый / линейный) определяется автоматически.</p>
            </div>
          )}

          {/* ── Section 3: Metrics ── */}
          {!isSelector && <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Метрики</label>
              {metricSeries.length < MAX_SERIES && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={addSeries}
                  className="h-6 px-2 text-xs text-primary"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Добавить
                </Button>
              )}
            </div>

            {unitWarning && (
              <div className="flex items-center gap-1.5 p-2 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="text-[10px] text-amber-700 dark:text-amber-400">{unitWarning}</span>
              </div>
            )}

            <div className="space-y-2">
              {metricSeries.map((s, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 rounded-lg border bg-muted/20">
                  {/* Color picker */}
                  <input
                    type="color"
                    value={s.color}
                    onChange={e => updateSeries(idx, { color: e.target.value })}
                    className="w-6 h-6 rounded border-0 cursor-pointer shrink-0"
                    style={{ padding: 0 }}
                  />

                  {/* Metric select with unit */}
                  <Select
                    value={s.metricCode}
                    onValueChange={v => updateSeries(idx, { metricCode: v })}
                  >
                    <SelectTrigger className="h-7 text-xs flex-1 min-w-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {allChartMetrics.map(opt => (
                        <SelectItem key={opt.code} value={opt.code}>
                          {opt.unit ? `${opt.label} (${opt.unit})` : opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Per-metric chart type toggle (only in mixed mode) */}
                  {chartMode === 'mixed' && (
                    <button
                      type="button"
                      onClick={() => updateSeries(idx, {
                        chartType: s.chartType === 'bar' ? 'line' : 'bar',
                      })}
                      className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium border transition-colors shrink-0 cursor-pointer",
                        s.chartType === 'bar'
                          ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-600"
                          : "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-600"
                      )}
                      title={s.chartType === 'bar' ? 'Столбчатый' : 'Линейный'}
                    >
                      {s.chartType === 'bar'
                        ? <><BarChart3 className="w-3 h-3" /> Стлб</>
                        : <><TrendingUp className="w-3 h-3" /> Лин</>
                      }
                    </button>
                  )}

                  {/* Remove */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSeries(idx)}
                    disabled={metricSeries.length <= 1}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive shrink-0"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>}

          {/* ── Section 4: Data grouping ── */}
          {!isSelector && <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Данные</label>

            <div className="space-y-3 p-3 rounded-lg border bg-muted/10">
              {/* Subject type */}
              <div className="space-y-1.5">
                <span className="text-xs font-medium">Группировка</span>
                <RadioGroup
                  value={subjectType}
                  onValueChange={(v) => setSubjectType(v as 'store' | 'manager')}
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="store" id="st-store" />
                    <label htmlFor="st-store" className="text-xs cursor-pointer">По филиалу</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="manager" id="st-manager" />
                    <label htmlFor="st-manager" className="text-xs cursor-pointer">По менеджеру</label>
                  </div>
                </RadioGroup>
              </div>

              {/* Aggregated */}
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={isAggregated}
                  onCheckedChange={(v) => setIsAggregated(!!v)}
                  className="h-4 w-4"
                />
                <span className="text-xs">Объединить все филиалы в один график</span>
              </label>
            </div>
          </div>}

          {/* ── Section 5: Name & page (secondary) ── */}
          <div className="space-y-3 pt-2 border-t">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Название</label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={isSelector
                  ? 'Мульти-график'
                  : metricSeries.length === 1
                    ? `График: ${METRIC_NAMES[metricSeries[0]?.metricCode] || ''}`
                    : `График: ${metricSeries.length} метрик`
                }
                className="text-sm h-8"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">Страница</label>
              <select
                value={parentId || '__main__'}
                onChange={e => setParentId(e.target.value === '__main__' ? null : e.target.value)}
                className="flex h-8 w-full rounded-md border border-input bg-background px-3 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="__main__">Главная (дашборд)</option>
                {parentMetrics.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
            Отмена
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving || (!isSelector && metricSeries.length === 0)} className="text-xs">
            {isSaving
              ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              : mode === 'create'
                ? <Plus className="w-3.5 h-3.5 mr-1.5" />
                : <Save className="w-3.5 h-3.5 mr-1.5" />
            }
            {mode === 'create' ? 'Создать' : 'Сохранить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

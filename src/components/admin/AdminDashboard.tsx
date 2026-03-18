import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { useEmployee } from '@/contexts/EmployeeProvider';
import { Spinner } from '@/components/Spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Plus,
  GripVertical,
  Trash2,
  Save,
  X,
  Settings,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  Zap,
  Loader2,
  Check,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAdminDashboardMetrics } from '@/hooks/useAdminDashboardMetrics';
import { KPIFullWidthCard, FullWidthKPIMetric } from '@/components/dashboard/KPIFullWidthCard';
import { calculateMetricStatus } from '@/lib/formatters';
import type { DashboardMetricConfig, WidgetType, MetricExtractionTestResult, MetricType, ValueType, AggregationMethod, PlanPeriod, PlanProRateMethod, MetricThresholds } from '@/lib/internalApiClient';
import { internalApiClient } from '@/lib/internalApiClient';
import { cn } from '@/lib/utils';
import { POSITIONS } from '@/data/branchData';
import { AdminDataSources } from './AdminDataSources';
import { FormulaEditor } from './FormulaEditor';
import MetricEditDialog from './MetricEditDialog';
import { useAdminDataSources } from '@/hooks/useAdminDataSources';
import { BRANCHES } from '@/data/branchData';
import { Database, Target, Eye, Settings2, User, BarChart3 } from 'lucide-react';
import ApiExplorerDialog from './ApiExplorerDialog';
import JsonTreeViewer from './JsonTreeViewer';
import AdminWidgetCard from './AdminWidgetCard';
import RankingWidgetEditDialog from './RankingWidgetEditDialog';
import ChartWidgetEditDialog from './ChartWidgetEditDialog';
import { useWidgets } from '@/hooks/useWidgets';
import type { DashboardWidget } from '@/lib/internalApiClient';
import MetricCatalogDialog from './MetricCatalogDialog';
import MetricAssignmentWizard from './MetricAssignmentWizard';
import MetricCreationWizard from './MetricCreationWizard';
import WidgetTypeCards, { type AddWidgetType } from './WidgetTypeCards';
import type { MetricTemplate, WidgetType } from '@/lib/internalApiClient';

// ─── Constants ───
const SOURCE_LABELS: Record<string, string> = {
  tracker: 'Tracker',
  manual: 'Ручной ввод',
  external_api: 'Внешний API',
  computed: 'Формула',
};

const SOURCE_COLORS: Record<string, string> = {
  tracker: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  manual: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  external_api: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  computed: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
};

const COLOR_PRESETS = [
  '#3B82F6', // blue
  '#06B6D4', // cyan
  '#EF4444', // red
  '#10B981', // green
  '#F59E0B', // amber
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#6366F1', // indigo
];

// ─── Widget Types Registry ───
interface WidgetTypeInfo {
  type: WidgetType;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const WIDGET_TYPES: WidgetTypeInfo[] = [
  {
    type: 'kpi_forecast',
    label: 'Прогноз',
    description: 'Кольцевая диаграмма факт/план с прогнозом выполнения',
    icon: (
      <svg viewBox="0 0 40 40" className="w-10 h-10">
        <circle cx="20" cy="20" r="15" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.15" />
        <circle cx="20" cy="20" r="15" fill="none" stroke="#3B82F6" strokeWidth="3"
          strokeDasharray="70 94" strokeDashoffset="-23" strokeLinecap="round" />
        <circle cx="20" cy="20" r="15" fill="none" stroke="#3B82F6" strokeWidth="3" opacity="0.35"
          strokeDasharray="18 94" strokeDashoffset="-93" strokeLinecap="round" />
        <text x="20" y="23" textAnchor="middle" fontSize="9" fontWeight="600" fill="currentColor">75%</text>
      </svg>
    ),
  },
  {
    type: 'kpi_deviation',
    label: 'Отклонение',
    description: 'Спидометр с отклонением ±% от плана',
    icon: (
      <svg viewBox="0 0 40 40" className="w-10 h-10">
        <path d="M 6 28 A 16 16 0 0 1 34 28" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.15" strokeLinecap="round" />
        <path d="M 6 28 A 16 16 0 0 1 13 14" fill="none" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" />
        <path d="M 13 14 A 16 16 0 0 1 27 14" fill="none" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
        <path d="M 27 14 A 16 16 0 0 1 34 28" fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" />
        <line x1="20" y1="27" x2="26" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="20" cy="27" r="2" fill="currentColor" />
        <text x="20" y="37" textAnchor="middle" fontSize="8" fontWeight="600" fill="currentColor">+5%</text>
      </svg>
    ),
  },
];

const WIDGET_TYPE_TO_FORECAST_LABEL: Record<WidgetType, 'forecast' | 'deviation'> = {
  kpi_forecast: 'forecast',
  kpi_deviation: 'deviation',
};

// V2 metric classification labels
const METRIC_TYPE_LABELS: Record<string, string> = {
  absolute: 'Абсолютная',
  averaged: 'Средняя',
  percentage: 'Процентная',
  computed: 'Вычисляемая',
};

const VALUE_TYPE_LABELS: Record<string, string> = {
  currency: 'Деньги (₽)',
  count: 'Штуки (шт)',
  percentage: 'Проценты (%)',
  ratio: 'Коэффициент',
  duration: 'Длительность',
  score: 'Оценка',
};

const AGGREGATION_LABELS: Record<string, string> = {
  sum: 'Сумма',
  simple_average: 'Среднее',
  weighted_average: 'Взвеш. среднее',
  last: 'Последнее',
  min: 'Минимум',
  max: 'Максимум',
};

const PLAN_PERIOD_LABELS: Record<string, string> = {
  day: 'День',
  week: 'Неделя',
  month: 'Месяц',
  quarter: 'Квартал',
  year: 'Год',
};

const PRORATE_METHOD_LABELS: Record<string, string> = {
  working_days: 'Рабочие дни',
  calendar_days: 'Календарные дни',
  none: 'Без пропорции',
};

const DASHBOARD_POSITIONS: { id: string; label: string }[] = [
  { id: 'leader', label: 'Руководитель' },
  ...POSITIONS.reduce<{ id: string; label: string }[]>((acc, p) => {
    if (!acc.some(x => x.id === p.id)) acc.push({ id: p.id, label: p.name });
    return acc;
  }, []),
];

// ─── Widget Type Picker ───
const WidgetTypePicker: React.FC<{
  value: WidgetType;
  onChange: (type: WidgetType) => void;
}> = ({ value, onChange }) => (
  <div>
    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Тип виджета</label>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
      {WIDGET_TYPES.map(wt => (
        <button
          key={wt.type}
          type="button"
          onClick={() => onChange(wt.type)}
          className={cn(
            'flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition-all',
            value === wt.type
              ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
              : 'border-border hover:bg-muted/50'
          )}
        >
          <div className="shrink-0 text-muted-foreground">{wt.icon}</div>
          <div className="min-w-0">
            <div className="text-xs font-medium leading-tight">{wt.label}</div>
            <div className="text-[10px] text-muted-foreground leading-snug mt-0.5">{wt.description}</div>
          </div>
        </button>
      ))}
    </div>
  </div>
);

// ─── Types ───
interface MetricFormData {
  id: string;
  name: string;
  unit: string;
  forecastUnit: string;
  forecastLabel: 'forecast' | 'deviation';
  widgetType: WidgetType;
  parentId: string | null;
  source: 'tracker' | 'manual' | 'external_api';
  trackerCode: string;
  externalUrl: string;
  externalMethod: string;
  externalHeaders: Record<string, string>;
  jsonPathFact: string;
  jsonPathPlan: string;
  color: string;
  enabled: boolean;
  visibleToPositions: string[];
  dataSourceId: string | null;
  externalPath: string;
  externalQueryParams: Array<{ key: string; value: string }>;
  externalBody: string;
  // V2 fields
  metricType: MetricType;
  valueType: ValueType;
  aggregation: AggregationMethod;
  planPeriod: PlanPeriod;
  planProRateMethod: PlanProRateMethod;
  formula: string;
  thresholdCritical: string;
  thresholdGood: string;
  decimalPlaces: number;
  bindings: Array<{ scope: 'network' | 'branch' | 'employee'; scopeId: string; enabled: boolean; queryParamOverrides?: Array<{ key: string; value: string }> }>;
}

const emptyForm: MetricFormData = {
  id: '',
  name: '',
  unit: '',
  forecastUnit: '%',
  forecastLabel: 'forecast',
  widgetType: 'kpi_forecast',
  parentId: null,
  source: 'tracker',
  trackerCode: '',
  externalUrl: '',
  externalMethod: 'GET',
  externalHeaders: {},
  jsonPathFact: '',
  jsonPathPlan: '',
  color: '#3B82F6',
  enabled: true,
  visibleToPositions: [],
  dataSourceId: null,
  externalPath: '',
  externalQueryParams: [],
  externalBody: '',
  // V2 fields
  metricType: 'absolute',
  valueType: 'currency',
  aggregation: 'sum',
  planPeriod: 'month',
  planProRateMethod: 'working_days',
  formula: '',
  thresholdCritical: '',
  thresholdGood: '',
  decimalPlaces: 0,
  bindings: [],
};

function toForm(m: DashboardMetricConfig): MetricFormData {
  return {
    id: m.id,
    name: m.name,
    unit: m.unit,
    forecastUnit: m.forecastUnit,
    forecastLabel: m.forecastLabel,
    widgetType: m.widgetType || (m.forecastLabel === 'deviation' ? 'kpi_deviation' : 'kpi_forecast'),
    parentId: m.parentId || null,
    source: m.source,
    trackerCode: m.trackerCode || '',
    externalUrl: m.externalUrl || '',
    externalMethod: m.externalMethod || 'GET',
    externalHeaders: m.externalHeaders || {},
    jsonPathFact: m.jsonPathFact || '',
    jsonPathPlan: m.jsonPathPlan || '',
    color: m.color || '#3B82F6',
    enabled: m.enabled,
    visibleToPositions: m.visibleToPositions || [],
    dataSourceId: m.dataSourceId || null,
    externalPath: m.externalPath || '',
    externalQueryParams: m.externalQueryParams || [],
    externalBody: m.externalBody || '',
    // V2 fields
    metricType: m.metricType || (m.widgetType === 'kpi_deviation' ? 'averaged' : 'absolute'),
    valueType: m.valueType || (() => {
      const u = (m.unit || '').toLowerCase();
      if (u === '₽' || u === 'руб' || u === 'руб.') return 'currency';
      if (u === '%') return 'percentage';
      return 'count';
    })(),
    aggregation: m.aggregation || (m.widgetType === 'kpi_deviation' ? 'simple_average' : 'sum'),
    planPeriod: m.planPeriod || 'month',
    planProRateMethod: m.planProRateMethod || 'working_days',
    formula: m.formula || '',
    thresholdCritical: m.thresholds?.critical != null ? String(m.thresholds.critical) : '',
    thresholdGood: m.thresholds?.good != null ? String(m.thresholds.good) : '',
    decimalPlaces: m.decimalPlaces ?? 0,
    bindings: (m.bindings || []).map(b => ({
      scope: b.scope,
      scopeId: b.scopeId,
      enabled: b.enabled !== false,
      queryParamOverrides: b.queryParamOverrides,
    })),
  };
}

// ─── Color Swatch Picker ───
const ColorSwatchPicker: React.FC<{
  value: string;
  onChange: (color: string) => void;
}> = ({ value, onChange }) => (
  <div className="flex gap-2 flex-wrap">
    {COLOR_PRESETS.map(color => (
      <button
        key={color}
        onClick={() => onChange(color)}
        className={cn(
          'w-6 h-6 rounded-full transition-all',
          value === color ? 'ring-2 ring-offset-2 ring-primary' : 'hover:scale-110'
        )}
        style={{ backgroundColor: color }}
      />
    ))}
  </div>
);

// ─── Query Params Editor ───
const QueryParamsEditor: React.FC<{
  params: Array<{ key: string; value: string }>;
  onChange: (params: Array<{ key: string; value: string }>) => void;
}> = ({ params, onChange }) => {
  const addParam = () => onChange([...params, { key: '', value: '' }]);
  const removeParam = (i: number) => onChange(params.filter((_, idx) => idx !== i));
  const updateParam = (i: number, field: 'key' | 'value', val: string) => {
    const next = [...params];
    next[i] = { ...next[i], [field]: val };
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground">Query Parameters</label>
        <button onClick={addParam} className="text-xs text-primary hover:underline">+ Добавить</button>
      </div>
      {params.map((p, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
          <Input value={p.key} onChange={e => updateParam(i, 'key', e.target.value)} placeholder="key" className="text-xs h-7" />
          <Input value={p.value} onChange={e => updateParam(i, 'value', e.target.value)} placeholder="value" className="text-xs h-7" />
          <button onClick={() => removeParam(i)} className="text-muted-foreground hover:text-red-500">
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
      {params.length === 0 && (
        <p className="text-[10px] text-muted-foreground">Нет параметров. Нажмите + чтобы добавить ?key=value к запросу.</p>
      )}
    </div>
  );
};

// ─── JSONPath Help Tooltip ───
const JsonPathHelp: React.FC = () => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <HelpCircle className="w-3 h-3 text-muted-foreground cursor-help inline-block ml-1" />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[260px] text-xs">
        <p className="font-medium mb-1">Примеры JSONPath:</p>
        <code className="block text-[10px]">data.value</code>
        <code className="block text-[10px]">results[0].amount</code>
        <code className="block text-[10px]">response.items[-1].fact</code>
        <code className="block text-[10px]">items[*].value → массив</code>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

// ─── Test Extraction Button ───
const TestExtractionBlock: React.FC<{ form: MetricFormData; onPathSelect?: (field: 'jsonPathFact' | 'jsonPathPlan', path: string) => void }> = ({ form, onPathSelect }) => {
  const [result, setResult] = useState<MetricExtractionTestResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  const canTest = form.dataSourceId
    ? !!form.externalPath
    : !!form.externalUrl;

  const handleTest = async () => {
    setIsTesting(true);
    setResult(null);
    try {
      const res = await internalApiClient.testMetricExtraction({
        dataSourceId: form.dataSourceId || undefined,
        url: !form.dataSourceId ? form.externalUrl : undefined,
        path: form.externalPath || undefined,
        method: form.externalMethod || 'GET',
        queryParams: form.externalQueryParams?.length ? form.externalQueryParams : undefined,
        body: form.externalBody || undefined,
        headers: !form.dataSourceId ? form.externalHeaders : undefined,
        jsonPathFact: form.jsonPathFact || undefined,
        jsonPathPlan: form.jsonPathPlan || undefined,
      });
      setResult(res);
    } catch (err: unknown) {
      setResult({ ok: false, error: err instanceof Error ? err.message : 'Test failed' });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={handleTest}
        disabled={isTesting || !canTest}
        className="text-xs h-7"
      >
        {isTesting ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Zap className="w-3 h-3 mr-1" />}
        Тест извлечения
      </Button>

      {result && (
        <div className="border rounded-md p-2 space-y-2 text-xs">
          {result.ok ? (
            <>
              <div className="flex gap-4 items-center flex-wrap">
                <div>
                  <span className="text-muted-foreground">Fact: </span>
                  <span className={`font-mono font-medium ${result.extractedFact != null ? 'text-green-600' : 'text-red-500'}`}>
                    {result.extractedFact != null ? JSON.stringify(result.extractedFact) : 'null'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Plan: </span>
                  <span className={`font-mono font-medium ${result.extractedPlan != null ? 'text-green-600' : 'text-red-500'}`}>
                    {result.extractedPlan != null ? JSON.stringify(result.extractedPlan) : 'null'}
                  </span>
                </div>
                {result.latency != null && (
                  <span className="text-muted-foreground ml-auto">{result.latency}ms</span>
                )}
              </div>
              <button
                onClick={() => setShowRaw(!showRaw)}
                className="text-[10px] text-primary hover:underline"
              >
                {showRaw ? 'Скрыть' : 'Показать'} ответ API
              </button>
              {showRaw && result.rawResponse != null && (
                <div className="border rounded-md overflow-hidden">
                  <JsonTreeViewer
                    data={result.rawResponse}
                    onPathSelect={onPathSelect ? (path) => onPathSelect('jsonPathFact', path) : undefined}
                    selectedPaths={[form.jsonPathFact, form.jsonPathPlan].filter(Boolean)}
                  />
                </div>
              )}
            </>
          ) : (
            <span className="text-red-500">{result.error || 'Test failed'}</span>
          )}
        </div>
      )}
    </div>
  );
};

// ─── AdminMetricCard ───
const AdminMetricCard: React.FC<{
  metric: DashboardMetricConfig;
  children?: DashboardMetricConfig[];
  onToggleEnabled: (enabled: boolean) => void;
  onSave: (data: MetricFormData) => void;
  onDelete: () => void;
  onSaveMapping: (data: { fieldMappings: import('@/lib/internalApiClient').FieldMapping[]; bindings: import('@/lib/internalApiClient').MetricBinding[] }) => Promise<void>;
  onCreateChild?: (data: MetricFormData) => Promise<void>;
  onSaveChild?: (data: MetricFormData) => void;
  onDeleteChild?: (id: string) => void;
  onToggleChildEnabled?: (id: string, enabled: boolean) => void;
  onSaveMappingChild?: (metricId: string, data: { fieldMappings: import('@/lib/internalApiClient').FieldMapping[]; bindings: import('@/lib/internalApiClient').MetricBinding[] }) => Promise<void>;
  dataSources?: { id: string; label: string; enabled: boolean }[];
  availableParents?: DashboardMetricConfig[];
  allMetrics?: DashboardMetricConfig[];
  isSaving: boolean;
  isCreating: boolean;
  liveData?: { fact: number; plan: number; error?: string } | null;
  liveLoading?: boolean;
  liveError?: boolean;
  metricWidgets?: DashboardWidget[];
  onWidgetToggleEnabled?: (id: string, enabled: boolean) => void;
  onWidgetEdit?: (widget: DashboardWidget) => void;
  onWidgetDelete?: (id: string) => void;
  previewStoreIds?: string[];
  previewDateFrom?: string;
  previewDateTo?: string;
}> = React.memo(({ metric, children: childMetrics, onToggleEnabled, onSave, onDelete, onSaveMapping, onCreateChild, onSaveChild, onDeleteChild, onToggleChildEnabled, onSaveMappingChild, availableParents, dataSources = [], allMetrics = [], isSaving, isCreating, liveData, liveLoading: liveLoadingProp, liveError: liveErrorProp, metricWidgets, onWidgetToggleEnabled, onWidgetEdit, onWidgetDelete, previewStoreIds, previewDateFrom, previewDateTo }) => {
  const { storeId: employeeStoreId } = useEmployee();
  const [editOpen, setEditOpen] = useState(false);
  const [editTab, setEditTab] = useState('basic');
  const [localFact, setLocalFact] = useState(0);
  const [localPlan, setLocalPlan] = useState(0);
  const [showNewChild, setShowNewChild] = useState(false);
  const [depthExpanded, setDepthExpanded] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: metric.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Initialize manual fact/plan — filter by storeId (same logic as backend _fetchMetricsData)
  useEffect(() => {
    if (metric.source === 'manual' && metric.manualData?.length) {
      const now = new Date();
      const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const periodEntries = metric.manualData.filter(d => d.period === currentPeriod);

      // Fallback chain: matching store → global entry → any entry for period → latest overall
      let entry = periodEntries.find(e => e.storeId === employeeStoreId);
      if (!entry) entry = periodEntries.find(e => !e.storeId);
      if (!entry && periodEntries.length > 0) entry = periodEntries[0];
      if (!entry) entry = metric.manualData[metric.manualData.length - 1];

      setLocalFact(entry.fact);
      setLocalPlan(entry.plan);
    }
  }, [metric.source, metric.manualData, employeeStoreId]);

  // Live data from parent-level fetch (for non-manual metrics)
  const liveFact = liveData?.fact ?? null;
  const livePlan = liveData?.plan ?? null;
  const liveLoading = liveLoadingProp ?? false;
  const liveError = liveErrorProp ?? false;

  const openEdit = (tab: string) => { setEditTab(tab); setEditOpen(true); };

  // Build preview metric — manual uses stored data, others use live-fetched data
  const previewMetric: FullWidthKPIMetric = useMemo(() => {
    let fact: number;
    let plan: number;
    if (metric.source === 'manual') {
      fact = localFact;
      plan = localPlan;
    } else {
      fact = liveFact ?? 0;
      plan = livePlan ?? 0;
    }
    const color = metric.color || '#3B82F6';

    let forecastValue: number | undefined;
    if (plan > 0) {
      if (metric.forecastLabel === 'deviation') {
        forecastValue = Math.round(((fact - plan) / plan) * 100);
      } else {
        forecastValue = Math.round((fact / plan) * 100);
      }
    }

    return {
      id: metric.id,
      name: metric.name,
      current: fact,
      plan: plan,
      unit: metric.unit,
      trend: 'stable' as const,
      status: plan > 0 ? calculateMetricStatus(fact, plan, undefined, forecastValue, metric.forecastLabel) : 'warning' as const,
      color,
      forecastValue,
      forecastUnit: metric.forecastUnit || '%',
      forecastLabel: metric.forecastLabel,
    };
  }, [metric, localFact, localPlan, liveFact, livePlan]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'border rounded-xl bg-card transition-all shadow-sm',
        isDragging && 'opacity-40 ring-2 ring-dashed ring-primary/50 z-50',
        !metric.enabled && 'opacity-40'
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/50">
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className="touch-none cursor-grab active:cursor-grabbing shrink-0"
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium truncate block">{metric.name}</span>
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium inline-block mt-0.5', SOURCE_COLORS[metric.source] || '')}>
            {SOURCE_LABELS[metric.source] || metric.source}
          </span>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => openEdit('plans')}
            className="p-1.5 rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
            title="Планы"
          >
            <Target className="w-4 h-4" />
          </button>
          <button
            onClick={() => openEdit('mapping')}
            className="p-1.5 rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
            title="Сопоставление"
          >
            <Database className="w-4 h-4" />
          </button>
          <button
            onClick={() => openEdit('basic')}
            className="p-1.5 rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <Settings className="w-4 h-4" />
          </button>
          <Switch
            checked={metric.enabled}
            onCheckedChange={onToggleEnabled}
            className="shrink-0 ml-1"
          />
        </div>
      </div>

      {/* KPI Preview Card */}
      <div className="px-3 py-2">
        <div className="pointer-events-none max-h-[140px] overflow-hidden rounded-lg">
          <KPIFullWidthCard metric={previewMetric} />
        </div>
        {metric.source !== 'manual' && (
          <p className="text-[10px] text-muted-foreground italic text-center mt-1">
            {liveLoading ? (
              <span className="inline-flex items-center gap-1"><Loader2 className="h-2.5 w-2.5 animate-spin" />Загрузка данных...</span>
            ) : liveError ? (
              <span className="text-amber-500">Не удалось загрузить данные</span>
            ) : liveData?.error ? (
              <span className="text-red-500">Ошибка источника: {liveData.error}</span>
            ) : liveFact !== null ? (
              <span className="text-green-600 dark:text-green-400">Данные загружены ({SOURCE_LABELS[metric.source] || metric.source})</span>
            ) : (
              <span className="text-amber-500">Метрика не найдена в ответе — проверьте привязки и видимость</span>
            )}
          </p>
        )}
      </div>

      {/* Metric Edit Dialog */}
      <MetricEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        metric={metric}
        onSave={async (data) => { try { await onSave(data); setEditOpen(false); } catch { toast.error('Не удалось сохранить метрику'); } }}
        onDelete={async () => { try { await onDelete(); setEditOpen(false); } catch { toast.error('Не удалось удалить метрику'); } }}
        onSaveMapping={async (data) => { await onSaveMapping(data); }}
        isSaving={isSaving}
        availableParents={availableParents}
        dataSources={dataSources}
        allMetrics={allMetrics}
        initialTab={editTab}
      />

      {/* Depth toggle — children, widgets, add sub-metric */}
      {(() => {
        const depthCount = (childMetrics?.length || 0) + (metricWidgets?.length || 0);
        const hasDepth = depthCount > 0 || (onCreateChild && !metric.parentId);
        if (!hasDepth) return null;
        return (
          <>
            <div className="px-3 pb-1 pt-0.5">
              <button
                onClick={() => setDepthExpanded(prev => !prev)}
                className="w-full flex items-center gap-1.5 py-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                {depthExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                <span>Глубина метрики</span>
                {depthCount > 0 && (
                  <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full">{depthCount}</span>
                )}
              </button>
            </div>

            {depthExpanded && (
              <>
                {childMetrics && childMetrics.length > 0 && (
                  <ChildMetricsList
                    children={childMetrics}
                    onSave={onSaveChild}
                    onDelete={onDeleteChild}
                    onToggleEnabled={onToggleChildEnabled}
                    onSaveMapping={onSaveMappingChild}
                    isSaving={isSaving}
                    availableParents={availableParents}
                    dataSources={dataSources}
                    allMetrics={allMetrics}
                  />
                )}

                {showNewChild && (
                  <div className="mx-3 mb-2 border-l-2 border-primary/20 pl-3">
                    <NewMetricForm
                      onSave={async (data) => { await onCreateChild?.(data); setShowNewChild(false); }}
                      onCancel={() => setShowNewChild(false)}
                      isSaving={isCreating}
                      availableParents={availableParents}
                      defaultParentId={metric.id}
                      dataSources={dataSources}
                      allMetrics={allMetrics}
                    />
                  </div>
                )}

                {metricWidgets && metricWidgets.length > 0 && (
                  <div className="mx-3 mb-2 space-y-1.5">
                    {metricWidgets.map(w => (
                      <AdminWidgetCard
                        key={w.id}
                        widget={w}
                        onToggleEnabled={enabled => onWidgetToggleEnabled?.(w.id, enabled)}
                        onEdit={() => onWidgetEdit?.(w)}
                        onDelete={() => onWidgetDelete?.(w.id)}
                        parentName={metric.name}
                        previewStoreIds={previewStoreIds}
                        previewDateFrom={previewDateFrom}
                        previewDateTo={previewDateTo}
                      />
                    ))}
                  </div>
                )}

                {onCreateChild && !metric.parentId && !showNewChild && (
                  <div className="px-3 pb-3">
                    <button
                      onClick={() => setShowNewChild(true)}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] text-muted-foreground hover:text-foreground border border-dashed rounded-md hover:bg-muted/50 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Добавить подметрику
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        );
      })()}
    </div>
  );
});
AdminMetricCard.displayName = 'AdminMetricCard';

// ─── Child Metrics List ───
const ChildMetricsList: React.FC<{
  children: DashboardMetricConfig[];
  onSave?: (data: MetricFormData) => void;
  onDelete?: (id: string) => void;
  onToggleEnabled?: (id: string, enabled: boolean) => void;
  onSaveMapping?: (metricId: string, data: { fieldMappings: import('@/lib/internalApiClient').FieldMapping[]; bindings: import('@/lib/internalApiClient').MetricBinding[] }) => Promise<void>;
  isSaving: boolean;
  availableParents?: DashboardMetricConfig[];
  dataSources?: { id: string; label: string; enabled: boolean }[];
  allMetrics?: DashboardMetricConfig[];
}> = ({ children: childMetrics, onSave, onDelete, onToggleEnabled, onSaveMapping, isSaving, availableParents, dataSources = [], allMetrics = [] }) => {
  const [editChild, setEditChild] = useState<string | null>(null);

  return (
    <div className="mx-3 mb-2 border-l-2 border-primary/20 pl-3 space-y-2">
      {childMetrics.map(child => (
        <div key={child.id} className={cn('border rounded-md bg-muted/30', !child.enabled && 'opacity-40')}>
          <div className="flex items-center gap-2 px-2.5 py-1.5">
            <button
              onClick={() => setEditChild(child.id)}
              className="text-muted-foreground hover:text-foreground"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
            <span
              className="text-xs font-medium truncate flex-1 cursor-pointer hover:text-primary"
              onClick={() => setEditChild(child.id)}
            >
              {child.name}
            </span>
            <span className={cn('text-[9px] px-1 py-0.5 rounded-full font-medium', SOURCE_COLORS[child.source] || '')}>
              {SOURCE_LABELS[child.source] || child.source}
            </span>
            <Switch
              checked={child.enabled}
              onCheckedChange={v => onToggleEnabled?.(child.id, v)}
              className="shrink-0 scale-75"
            />
          </div>
          {editChild === child.id && (
            <MetricEditDialog
              open
              onOpenChange={open => { if (!open) setEditChild(null); }}
              metric={child}
              onSave={async (data) => { try { await onSave?.(data); setEditChild(null); } catch { toast.error('Не удалось сохранить метрику'); } }}
              onDelete={async () => { try { await onDelete?.(child.id); setEditChild(null); } catch { toast.error('Не удалось удалить метрику'); } }}
              onSaveMapping={async (data) => { await onSaveMapping?.(child.id, data); }}
              isSaving={isSaving}
              availableParents={availableParents}
              dataSources={dataSources}
              allMetrics={allMetrics}
            />
          )}
        </div>
      ))}
    </div>
  );
};

// ─── New Metric Form ───
const NewMetricForm: React.FC<{
  onSave: (data: MetricFormData) => void;
  onCancel: () => void;
  isSaving: boolean;
  availableParents?: DashboardMetricConfig[];
  defaultParentId?: string | null;
  dataSources?: { id: string; label: string; enabled: boolean }[];
  allMetrics?: DashboardMetricConfig[];
}> = ({ onSave, onCancel, isSaving, availableParents, defaultParentId, dataSources = [], allMetrics = [] }) => {
  const [form, setForm] = useState<MetricFormData>({ ...emptyForm, parentId: defaultParentId || null });
  const [manualPlan, setManualPlan] = useState(0);
  const [explorerOpen, setExplorerOpen] = useState(false);

  const updateField = <K extends keyof MetricFormData>(key: K, value: MetricFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleWidgetTypeChange = (wt: WidgetType) => {
    setForm(prev => ({
      ...prev,
      widgetType: wt,
      forecastLabel: WIDGET_TYPE_TO_FORECAST_LABEL[wt],
    }));
  };

  const canSave = form.id.trim() && form.name.trim();

  // Build preview for new metric
  const previewMetric: FullWidthKPIMetric = useMemo(() => {
    const plan = form.source === 'manual' ? manualPlan : 0;
    return {
      id: form.id || 'new',
      name: form.name || 'Новая метрика',
      current: 0,
      plan: plan,
      unit: form.unit,
      trend: 'stable' as const,
      status: 'warning' as const,
      color: form.color,
      forecastValue: 0,
      forecastUnit: form.forecastUnit || '%',
      forecastLabel: form.forecastLabel,
    };
  }, [form, manualPlan]);

  return (
    <div className="border rounded-lg bg-card p-3 space-y-3 border-primary/30">
      <div className="text-sm font-medium">
        {form.parentId ? 'Новая подметрика' : 'Новая метрика'}
      </div>

      {/* Preview */}
      <div className="pointer-events-none max-h-[90px] overflow-hidden">
        <KPIFullWidthCard metric={previewMetric} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">ID (уникальный)</label>
          <Input
            value={form.id}
            onChange={e => updateField('id', e.target.value.replace(/[^a-z0-9_]/g, ''))}
            placeholder="my_metric"
            className="text-xs h-8"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Название</label>
          <Input
            value={form.name}
            onChange={e => updateField('name', e.target.value)}
            placeholder="Моя метрика"
            className="text-xs h-8"
          />
        </div>
      </div>

      {/* Widget Type */}
      <WidgetTypePicker value={form.widgetType} onChange={handleWidgetTypeChange} />

      {/* V2: Metric Type + Value Type */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Тип метрики</label>
          <Select value={form.metricType} onValueChange={v => {
            const mt = v as MetricType;
            const updates: Partial<MetricFormData> = { metricType: mt };
            if (mt === 'computed') updates.source = 'manual' as const;
            if (mt === 'absolute') updates.aggregation = 'sum';
            else if (mt === 'averaged' || mt === 'percentage') updates.aggregation = 'simple_average';
            setForm(prev => ({ ...prev, ...updates }));
          }}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(METRIC_TYPE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Тип значения</label>
          <Select value={form.valueType} onValueChange={v => updateField('valueType', v as ValueType)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(VALUE_TYPE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Агрегация</label>
          <Select value={form.aggregation} onValueChange={v => updateField('aggregation', v as AggregationMethod)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(AGGREGATION_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* V2: Plan Period + Pro-rate + Decimal */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Период плана</label>
          <Select value={form.planPeriod} onValueChange={v => updateField('planPeriod', v as PlanPeriod)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(PLAN_PERIOD_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Пропорция</label>
          <Select value={form.planProRateMethod} onValueChange={v => updateField('planProRateMethod', v as PlanProRateMethod)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(PRORATE_METHOD_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Знаков после .</label>
          <Input
            type="number"
            min={0}
            max={4}
            value={form.decimalPlaces}
            onChange={e => updateField('decimalPlaces', parseInt(e.target.value) || 0)}
            className="text-xs h-8"
          />
        </div>
      </div>

      {/* V2: Thresholds */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Порог «критично»</label>
          <Input
            type="number"
            value={form.thresholdCritical}
            onChange={e => updateField('thresholdCritical', e.target.value)}
            placeholder={form.forecastLabel === 'deviation' ? '-5' : '70'}
            className="text-xs h-8"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Порог «хорошо»</label>
          <Input
            type="number"
            value={form.thresholdGood}
            onChange={e => updateField('thresholdGood', e.target.value)}
            placeholder={form.forecastLabel === 'deviation' ? '5' : '95'}
            className="text-xs h-8"
          />
        </div>
      </div>

      {/* V2: Formula (only for computed) */}
      {form.metricType === 'computed' && (
        <FormulaEditor
          value={form.formula}
          onChange={v => updateField('formula', v)}
          metrics={allMetrics}
          currentMetricId={form.id}
        />
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Единица</label>
          <Input
            value={form.unit}
            onChange={e => updateField('unit', e.target.value)}
            placeholder="₽, %, шт"
            className="text-xs h-8"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Ед. прогноза</label>
          <Input
            value={form.forecastUnit}
            onChange={e => updateField('forecastUnit', e.target.value)}
            placeholder="%"
            className="text-xs h-8"
          />
        </div>
      </div>

      {/* Parent Metric — hidden in inline sub-metric mode */}
      {!defaultParentId && availableParents && availableParents.length > 0 && (
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Родительская метрика</label>
          <Select
            value={form.parentId || '__none__'}
            onValueChange={v => updateField('parentId', v === '__none__' ? null : v)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Нет (верхний уровень)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Нет (верхний уровень)</SelectItem>
              {availableParents.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Color */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Цвет</label>
        <ColorSwatchPicker value={form.color} onChange={c => updateField('color', c)} />
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Источник данных</label>
        <div className="flex gap-2">
          {(['tracker', 'manual', 'external_api'] as const).map(src => (
            <button
              key={src}
              onClick={() => updateField('source', src)}
              className={cn(
                'text-xs px-3 py-1.5 rounded-md border transition-colors',
                form.source === src
                  ? 'border-primary bg-primary/10 text-primary font-medium'
                  : 'border-border text-muted-foreground hover:bg-muted/50'
              )}
            >
              {SOURCE_LABELS[src]}
            </button>
          ))}
        </div>
      </div>

      {form.source === 'tracker' && (
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Tracker Code</label>
          <Input
            value={form.trackerCode}
            onChange={e => updateField('trackerCode', e.target.value)}
            placeholder="revenue_created"
            className="text-xs h-8"
          />
        </div>
      )}

      {form.source === 'manual' && (
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">План</label>
          <Input
            type="number"
            value={manualPlan || ''}
            onChange={e => setManualPlan(parseFloat(e.target.value) || 0)}
            placeholder="0"
            className="text-xs h-8"
          />
        </div>
      )}

      {form.source === 'external_api' && (
        <div className="space-y-3">
          {/* Data source selector */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Источник данных</label>
            <Select
              value={form.dataSourceId || '__none__'}
              onValueChange={v => updateField('dataSourceId', v === '__none__' ? null : v)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Прямой URL (без коннектора)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Прямой URL</SelectItem>
                {dataSources.filter(ds => ds.enabled).map(ds => (
                  <SelectItem key={ds.id} value={ds.id}>{ds.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {form.dataSourceId ? (
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">API Path</label>
                <Input
                  value={form.externalPath}
                  onChange={e => updateField('externalPath', e.target.value)}
                  placeholder="/api/v1/metrics/revenue"
                  className="text-xs h-8"
                />
              </div>
              <div className="w-[80px]">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Метод</label>
                <Select value={form.externalMethod} onValueChange={v => updateField('externalMethod', v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setExplorerOpen(true)}
                className="text-xs h-8 shrink-0"
                title="Обзор API"
              >
                <Eye className="w-3 h-3 mr-1" />
                Обзор
              </Button>
              {form.dataSourceId && (
                <ApiExplorerDialog
                  open={explorerOpen}
                  onOpenChange={setExplorerOpen}
                  sourceId={form.dataSourceId}
                  sourceLabel={dataSources.find(ds => ds.id === form.dataSourceId)?.label}
                  initialPath={form.externalPath}
                  onSelectFactPath={path => updateField('jsonPathFact', path)}
                  onSelectPlanPath={path => updateField('jsonPathPlan', path)}
                  currentFactPath={form.jsonPathFact}
                  currentPlanPath={form.jsonPathPlan}
                />
              )}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              <div className="col-span-3">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">URL</label>
                <Input
                  value={form.externalUrl}
                  onChange={e => updateField('externalUrl', e.target.value)}
                  placeholder="https://api.example.com/metric"
                  className="text-xs h-8"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Метод</label>
                <Select value={form.externalMethod} onValueChange={v => updateField('externalMethod', v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <QueryParamsEditor
            params={form.externalQueryParams}
            onChange={p => updateField('externalQueryParams', p)}
          />

          {form.externalMethod === 'POST' && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Request Body (JSON)</label>
              <Textarea
                value={form.externalBody}
                onChange={e => updateField('externalBody', e.target.value)}
                placeholder='{"date_from": "2026-01-01", "date_to": "2026-01-31"}'
                className="text-xs font-mono min-h-[60px]"
                rows={3}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                JSON Path (fact) <JsonPathHelp />
              </label>
              <Input
                value={form.jsonPathFact}
                onChange={e => updateField('jsonPathFact', e.target.value)}
                placeholder="data.fact_value"
                className="text-xs h-8"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                JSON Path (plan) <JsonPathHelp />
              </label>
              <Input
                value={form.jsonPathPlan}
                onChange={e => updateField('jsonPathPlan', e.target.value)}
                placeholder="data.plan_value"
                className="text-xs h-8"
              />
            </div>
          </div>

          <TestExtractionBlock form={form} onPathSelect={(field, path) => updateField(field, path)} />
        </div>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={onCancel} className="h-7 text-xs">
          <X className="w-3.5 h-3.5 mr-1" />
          Отмена
        </Button>
        <Button size="sm" onClick={() => {
          const saveData = { ...form };
          if (form.source === 'manual' && manualPlan) {
            const now = new Date();
            const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            (saveData as any).manualData = [{ period, fact: 0, plan: manualPlan }];
          }
          onSave(saveData);
        }} disabled={!canSave || isSaving} className="h-7 text-xs">
          {isSaving ? <Spinner size="sm" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
          Создать
        </Button>
      </div>
    </div>
  );
};

// ─── Main AdminDashboard Component ───
export const AdminDashboard: React.FC = () => {
  const {
    metrics,
    isLoading,
    isError,
    error,
    createMetric,
    updateMetric,
    deleteMetric,
    reorderMetrics,
    isCreating,
    isUpdating,
    refetch,
  } = useAdminDashboardMetrics();

  const { sources: dataSources } = useAdminDataSources();

  const [creationWizardOpen, setCreationWizardOpen] = useState(false);
  const [wizardInitialType, setWizardInitialType] = useState<WidgetType | undefined>();
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [wizardTemplate, setWizardTemplate] = useState<MetricTemplate | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Widgets (rankings, etc.)
  const {
    widgets,
    isLoading: widgetsLoading,
    createWidget: createWidgetFn,
    updateWidget: updateWidgetFn,
    deleteWidget: deleteWidgetFn,
    reorderWidgets,
    isUpdating: isWidgetUpdating,
  } = useWidgets();
  const [editingWidget, setEditingWidget] = useState<DashboardWidget | null>(null);
  const [rankingCreateOpen, setRankingCreateOpen] = useState(false);
  const [chartCreateOpen, setChartCreateOpen] = useState(false);

  const sortedWidgets = useMemo(() =>
    [...widgets].sort((a, b) => {
      // Disabled widgets go to the bottom
      if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
      return (a.order ?? 0) - (b.order ?? 0);
    }),
    [widgets]
  );

  // Split widgets into global (parentId=null) and per-metric (parentId=metricId)
  const { globalWidgets, metricWidgetsMap } = useMemo(() => {
    const global: DashboardWidget[] = [];
    const map = new Map<string, DashboardWidget[]>();
    for (const w of sortedWidgets) {
      if (w.parentId) {
        const arr = map.get(w.parentId) || [];
        arr.push(w);
        map.set(w.parentId, arr);
      } else {
        global.push(w);
      }
    }
    return { globalWidgets: global, metricWidgetsMap: map };
  }, [sortedWidgets]);

  // Single fetch of live metric data for previews (non-manual metrics)
  const { storeId: adminStoreId } = useEmployee();

  // Preview context for widget cards (charts & rankings)
  const previewStoreIds = useMemo(() => adminStoreId ? [String(adminStoreId)] : [], [adminStoreId]);
  const { previewDateFrom, previewDateTo } = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
    return {
      previewDateFrom: `${y}-${m}-01`,
      previewDateTo: `${y}-${m}-${String(lastDay).padStart(2, '0')}`,
    };
  }, []);

  const [liveMetricsMap, setLiveMetricsMap] = useState<Record<string, { fact: number; plan: number; error?: string }>>({});
  const [liveMetricsLoading, setLiveMetricsLoading] = useState(false);
  const [liveMetricsError, setLiveMetricsError] = useState(false);

  useEffect(() => {
    const nonManual = metrics.filter(m => m.source !== 'manual' && m.enabled);
    if (nonManual.length === 0) return;
    let cancelled = false;
    const fetchLive = async () => {
      setLiveMetricsLoading(true);
      setLiveMetricsError(false);
      try {
        const now = new Date();
        const dateFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const dateTo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo, skipPositionFilter: '1' });
        if (adminStoreId) params.set('store_id', String(adminStoreId));
        const resp = await fetch(`/api/top-leader-metrics?${params}`, { credentials: 'include' });
        if (!resp.ok) throw new Error('fetch failed');
        const data = await resp.json();
        if (cancelled) return;
        const arr = Array.isArray(data) ? data : [];
        const map: Record<string, { fact: number; plan: number; error?: string }> = {};
        arr.forEach((m: any) => {
          if (m.id) map[m.id] = { fact: m.current ?? 0, plan: m.plan ?? 0, error: m._fetchError };
        });
        setLiveMetricsMap(map);
      } catch {
        if (!cancelled) setLiveMetricsError(true);
      } finally {
        if (!cancelled) setLiveMetricsLoading(false);
      }
    };
    fetchLive();
    return () => { cancelled = true; };
  }, [metrics, adminStoreId]);

  const handleCreateRankingWidget = useCallback(async (data: Partial<DashboardWidget>) => {
    const id = `ranking_${Date.now()}`;
    try {
      await createWidgetFn({ id, ...data });
      toast.success('Рейтинг создан');
    } catch (e) {
      toast.error((e as Error).message || 'Ошибка создания');
    }
  }, [createWidgetFn]);

  const handleAddWidgetType = useCallback(async (type: AddWidgetType) => {
    if (type === 'ranking') {
      setRankingCreateOpen(true);
    } else if (type === 'chart') {
      setChartCreateOpen(true);
    } else {
      setWizardInitialType(type);
      setCreationWizardOpen(true);
    }
  }, [createWidgetFn]);

  const handleWidgetToggleEnabled = useCallback(async (id: string, enabled: boolean) => {
    try {
      await updateWidgetFn(id, { enabled });
    } catch {
      toast.error('Ошибка обновления');
    }
  }, [updateWidgetFn]);

  const handleWidgetSave = useCallback(async (id: string, data: Partial<DashboardWidget>) => {
    try {
      await updateWidgetFn(id, data);
      toast.success('Виджет сохранён');
    } catch (e) {
      toast.error((e as Error).message || 'Ошибка сохранения');
    }
  }, [updateWidgetFn]);

  const handleWidgetDelete = useCallback(async (id: string) => {
    try {
      await deleteWidgetFn(id);
      toast.success('Виджет удалён');
    } catch {
      toast.error('Ошибка удаления');
    }
  }, [deleteWidgetFn]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor)
  );

  // Group metrics: top-level vs children
  const { topLevel, childrenMap, availableParents } = useMemo(() => {
    const sorted = [...metrics].sort((a, b) => {
      // Disabled metrics go to the bottom
      if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
      return (a.order ?? 0) - (b.order ?? 0);
    });
    const top: DashboardMetricConfig[] = [];
    const cMap = new Map<string, DashboardMetricConfig[]>();

    for (const m of sorted) {
      if (m.parentId) {
        const arr = cMap.get(m.parentId) || [];
        arr.push(m);
        cMap.set(m.parentId, arr);
      } else {
        top.push(m);
      }
    }

    // Available parents = top-level metrics that are not children themselves
    const parents = top.filter(m => !m.parentId);

    return { topLevel: top, childrenMap: cMap, availableParents: parents };
  }, [metrics]);

  // Unified list: top-level metrics + global widgets sorted together
  type UnifiedItem = { id: string; kind: 'metric' | 'widget'; enabled: boolean; order: number };
  const unifiedItems = useMemo(() => {
    const items: UnifiedItem[] = [
      ...topLevel.map(m => ({ id: m.id, kind: 'metric' as const, enabled: m.enabled, order: m.order ?? 0 })),
      ...globalWidgets.map(w => ({ id: w.id, kind: 'widget' as const, enabled: w.enabled, order: w.order ?? 0 })),
    ];
    items.sort((a, b) => {
      if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
      return a.order - b.order;
    });
    return items;
  }, [topLevel, globalWidgets]);

  const metricSet = useMemo(() => new Set(topLevel.map(m => m.id)), [topLevel]);
  const widgetSet = useMemo(() => new Set(globalWidgets.map(w => w.id)), [globalWidgets]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const ids = unifiedItems.map(i => i.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(ids, oldIndex, newIndex);

    // Split into metric and widget IDs preserving relative order
    const metricIds = newOrder.filter(id => metricSet.has(id));
    const widgetIds = newOrder.filter(id => widgetSet.has(id));

    reorderMetrics(metricIds);
    reorderWidgets(widgetIds);
  }, [unifiedItems, metricSet, widgetSet, reorderMetrics, reorderWidgets]);

  const handleToggleEnabled = useCallback(async (id: string, enabled: boolean) => {
    await updateMetric({ id, data: { enabled } });
  }, [updateMetric]);

  const formToPayload = useCallback((form: MetricFormData) => {
    const { thresholdCritical, thresholdGood, ...rest } = form;
    const thresholds: MetricThresholds = {};
    if (thresholdCritical !== '') thresholds.critical = parseFloat(thresholdCritical);
    if (thresholdGood !== '') thresholds.good = parseFloat(thresholdGood);
    // Sanitize bindings: remove empty queryParamOverrides
    const bindings = rest.bindings.map(b => ({
      ...b,
      queryParamOverrides: b.queryParamOverrides?.filter(o => o.key) || undefined,
    })).map(b => b.queryParamOverrides?.length ? b : { scope: b.scope, scopeId: b.scopeId, enabled: b.enabled });
    return { ...rest, bindings, thresholds };
  }, []);

  const handleSave = useCallback(async (form: MetricFormData) => {
    await updateMetric({ id: form.id, data: formToPayload(form) });
  }, [updateMetric, formToPayload]);

  const handleDelete = useCallback(async (id: string) => {
    await deleteMetric(id);
  }, [deleteMetric]);

  const handleSaveMapping = useCallback(async (metricId: string, data: { fieldMappings: import('@/lib/internalApiClient').FieldMapping[]; bindings: import('@/lib/internalApiClient').MetricBinding[] }) => {
    await updateMetric({ id: metricId, data: { fieldMappings: data.fieldMappings, bindings: data.bindings } });
  }, [updateMetric]);

  const handleCreate = useCallback(async (form: MetricFormData) => {
    await createMetric(formToPayload(form));
  }, [createMetric, formToPayload]);

  const activeMetric = activeId ? topLevel.find(m => m.id === activeId) : null;
  const activeWidget = activeId && !activeMetric ? globalWidgets.find(w => w.id === activeId) : null;
  const activeDragName = activeMetric?.name || activeWidget?.name || null;

  const dropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: { active: { opacity: '0.5' } },
    }),
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center text-red-500 py-8 text-sm">
        Ошибка: {(error as Error)?.message || 'Не удалось загрузить конфигурацию метрик'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Data Sources section */}
      <details className="group border rounded-xl bg-card shadow-sm">
        <summary className="px-4 py-3 cursor-pointer text-sm font-medium flex items-center gap-2 list-none [&::-webkit-details-marker]:hidden">
          <Database className="w-4 h-4 text-muted-foreground" />
          Источники данных
          <span className="text-xs text-muted-foreground ml-auto">
            {dataSources.length} {dataSources.length === 1 ? 'источник' : dataSources.length < 5 ? 'источника' : 'источников'}
          </span>
          <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-90" />
        </summary>
        <div className="px-4 pb-4 border-t">
          <AdminDataSources />
        </div>
      </details>

      {/* Unified header: Widgets & Metrics */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Виджеты и метрики</span>
          <span className="text-xs text-muted-foreground">({unifiedItems.length})</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => setCatalogOpen(true)} className="text-xs h-8">
          <Database className="w-3.5 h-3.5 mr-1.5" />
          Из каталога
        </Button>
      </div>

      {/* Add widget type cards */}
      <WidgetTypeCards onSelect={handleAddWidgetType} />

      {/* Edit existing ranking widget */}
      {editingWidget && editingWidget.type === 'ranking' && (
        <RankingWidgetEditDialog
          key={editingWidget.id}
          open
          onOpenChange={open => { if (!open) setEditingWidget(null); }}
          widget={editingWidget}
          onSave={handleWidgetSave}
          isSaving={isWidgetUpdating}
          availableMetrics={metrics.filter(m => m.enabled).map(m => ({ id: m.id, name: m.name, trackerCode: m.trackerCode }))}
          parentMetrics={availableParents.map(p => ({ id: p.id, name: p.name }))}
        />
      )}

      {/* Edit existing chart widget */}
      {editingWidget && editingWidget.type === 'chart' && (
        <ChartWidgetEditDialog
          key={editingWidget.id}
          open
          onOpenChange={open => { if (!open) setEditingWidget(null); }}
          widget={editingWidget}
          onSave={handleWidgetSave}
          isSaving={isWidgetUpdating}
          parentMetrics={availableParents.map(p => ({ id: p.id, name: p.name }))}
          availableMetrics={metrics.filter(m => m.enabled).map(m => ({ id: m.id, name: m.name, unit: m.unit, trackerCode: m.trackerCode }))}
        />
      )}

      {/* Create new ranking widget */}
      {rankingCreateOpen && (
        <RankingWidgetEditDialog
          key="__create__"
          open
          onOpenChange={setRankingCreateOpen}
          widget={null}
          onSave={handleWidgetSave}
          onCreate={handleCreateRankingWidget}
          isSaving={isWidgetUpdating}
          availableMetrics={metrics.filter(m => m.enabled).map(m => ({ id: m.id, name: m.name, trackerCode: m.trackerCode }))}
          parentMetrics={availableParents.map(p => ({ id: p.id, name: p.name }))}
        />
      )}

      {/* Create new chart widget */}
      {chartCreateOpen && (
        <ChartWidgetEditDialog
          key="__chart_create__"
          open
          onOpenChange={setChartCreateOpen}
          widget={null}
          onSave={handleWidgetSave}
          onCreate={async (data) => {
            const id = `chart_${Date.now()}`;
            try {
              await createWidgetFn({ id, ...data });
              toast.success('График создан');
            } catch (e) {
              toast.error((e as Error).message || 'Ошибка создания');
            }
          }}
          isSaving={isWidgetUpdating}
          parentMetrics={availableParents.map(p => ({ id: p.id, name: p.name }))}
          availableMetrics={metrics.filter(m => m.enabled).map(m => ({ id: m.id, name: m.name, unit: m.unit, trackerCode: m.trackerCode }))}
        />
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={unifiedItems.map(i => i.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {unifiedItems.map(item => {
              if (item.kind === 'widget') {
                const widget = globalWidgets.find(w => w.id === item.id);
                if (!widget) return null;
                return (
                  <AdminWidgetCard
                    key={widget.id}
                    widget={widget}
                    onToggleEnabled={enabled => handleWidgetToggleEnabled(widget.id, enabled)}
                    onEdit={() => setEditingWidget(widget)}
                    onDelete={() => handleWidgetDelete(widget.id)}
                    sortable
                    previewStoreIds={previewStoreIds}
                    previewDateFrom={previewDateFrom}
                    previewDateTo={previewDateTo}
                  />
                );
              }
              const metric = topLevel.find(m => m.id === item.id);
              if (!metric) return null;
              return (
                <AdminMetricCard
                  key={metric.id}
                  metric={metric}
                  children={childrenMap.get(metric.id)}
                  onToggleEnabled={enabled => handleToggleEnabled(metric.id, enabled)}
                  onSave={handleSave}
                  onDelete={() => handleDelete(metric.id)}
                  onSaveMapping={async (data) => handleSaveMapping(metric.id, data)}
                  onCreateChild={handleCreate}
                  onSaveChild={handleSave}
                  onDeleteChild={handleDelete}
                  onToggleChildEnabled={handleToggleEnabled}
                  onSaveMappingChild={handleSaveMapping}
                  availableParents={availableParents.filter(p => p.id !== metric.id)}
                  dataSources={dataSources}
                  allMetrics={metrics}
                  isSaving={isUpdating}
                  isCreating={isCreating}
                  liveData={liveMetricsMap[metric.id] || null}
                  liveLoading={liveMetricsLoading}
                  liveError={liveMetricsError && !liveMetricsMap[metric.id]}
                  metricWidgets={metricWidgetsMap.get(metric.id)}
                  onWidgetToggleEnabled={handleWidgetToggleEnabled}
                  onWidgetEdit={setEditingWidget}
                  onWidgetDelete={handleWidgetDelete}
                  previewStoreIds={previewStoreIds}
                  previewDateFrom={previewDateFrom}
                  previewDateTo={previewDateTo}
                />
              );
            })}
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={dropAnimation}>
          {activeDragName ? (
            <div className="opacity-95 shadow-2xl rounded-xl scale-[1.02] bg-card border">
              <div className="px-3 py-2 text-sm font-medium">{activeDragName}</div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <MetricCatalogDialog
        open={catalogOpen}
        onOpenChange={setCatalogOpen}
        dataSources={dataSources}
        existingMetricIds={new Set(metrics.map(m => m.id))}
        onTemplateSelected={(template) => {
          setWizardTemplate(template);
          setCatalogOpen(false);
        }}
      />

      {wizardTemplate && (
        <MetricAssignmentWizard
          open={!!wizardTemplate}
          onOpenChange={(open) => { if (!open) setWizardTemplate(null); }}
          template={wizardTemplate}
          onComplete={() => {
            setWizardTemplate(null);
            refetch();
          }}
          onBackToCatalog={() => {
            setWizardTemplate(null);
            setCatalogOpen(true);
          }}
        />
      )}

      <MetricCreationWizard
        open={creationWizardOpen}
        onOpenChange={setCreationWizardOpen}
        onComplete={() => {
          setCreationWizardOpen(false);
          refetch();
        }}
        availableParents={availableParents}
        dataSources={dataSources}
        allMetrics={metrics}
        initialWidgetType={wizardInitialType}
      />

    </div>
  );
};

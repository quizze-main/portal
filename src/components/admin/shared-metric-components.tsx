import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { X, Plus, Trash2, HelpCircle, Zap, Loader2, GitBranch, User, Users, Briefcase, Settings, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { internalApiClient } from '@/lib/internalApiClient';
import type { WidgetType, MetricExtractionTestResult, FieldMapping, FieldMappingEntityType, DashboardMetricConfig } from '@/lib/internalApiClient';
import type { EmployeeOption, DepartmentOption, DesignationOption } from '@/hooks/useFieldMappingEditor';
import JsonTreeViewer from './JsonTreeViewer';

// ─── Types ───

export interface MetricFormData {
  id: string;
  name: string;
  unit: string;
  forecastUnit: string;
  forecastLabel: 'forecast' | 'deviation';
  widgetType: WidgetType;
  parentId: string | null;
  source: 'tracker' | 'manual' | 'external_api' | 'computed';
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
  metricType: import('@/lib/internalApiClient').MetricType;
  valueType: import('@/lib/internalApiClient').ValueType;
  aggregation: import('@/lib/internalApiClient').AggregationMethod;
  planPeriod: import('@/lib/internalApiClient').PlanPeriod;
  planProRateMethod: import('@/lib/internalApiClient').PlanProRateMethod;
  formula: string;
  thresholdCritical: string;
  thresholdGood: string;
  decimalPlaces: number;
  bindings: Array<{ scope: 'network' | 'branch' | 'employee'; scopeId: string; enabled: boolean; queryParamOverrides?: Array<{ key: string; value: string }> }>;
  // V4: Loss/reserve config
  lossMode: 'auto' | 'formula' | 'jsonpath' | 'disabled' | 'tracker';
  lossFormula: string;
  jsonPathLoss: string;
  // V7: Forecast prediction
  forecastMethod: 'linear' | 'custom' | 'disabled' | '';
  forecastFormula: string;
}

export const emptyForm: MetricFormData = {
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
  lossMode: 'auto',
  lossFormula: '',
  jsonPathLoss: '',
  forecastMethod: '',
  forecastFormula: '',
};

// ─── Converters ───

export function toForm(m: DashboardMetricConfig): MetricFormData {
  return {
    id: m.id,
    name: m.name,
    unit: m.unit,
    forecastUnit: m.forecastUnit,
    forecastLabel: m.forecastLabel,
    widgetType: m.widgetType || (m.forecastLabel === 'deviation' ? 'kpi_deviation' : 'kpi_forecast'),
    parentId: m.parentId || null,
    source: m.metricType === 'computed' && m.source === 'manual' ? 'computed' : m.source,
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
    lossMode: m.lossMode || (m.source === 'tracker' ? 'tracker' : 'disabled'),
    lossFormula: m.lossFormula || '',
    jsonPathLoss: m.jsonPathLoss || '',
    forecastMethod: m.forecastMethod || '',
    forecastFormula: m.forecastFormula || '',
  };
}

// ─── Constants ───

export const COLOR_PRESETS = [
  '#3B82F6', // blue
  '#06B6D4', // cyan
  '#EF4444', // red
  '#10B981', // green
  '#F59E0B', // amber
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#6366F1', // indigo
];

interface WidgetTypeInfo {
  type: WidgetType;
  label: string;
  description: string;
  icon: React.ReactNode;
}

export const WIDGET_TYPES: WidgetTypeInfo[] = [
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

export const WIDGET_TYPE_TO_FORECAST_LABEL: Record<WidgetType, 'forecast' | 'deviation'> = {
  kpi_forecast: 'forecast',
  kpi_deviation: 'deviation',
};

// ─── Widget Type Picker ───

export const WidgetTypePicker: React.FC<{
  value: WidgetType;
  onChange: (type: WidgetType) => void;
}> = ({ value, onChange }) => (
  <div>
    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Тип виджета</label>
    <div className="grid grid-cols-2 gap-2">
      {WIDGET_TYPES.map(wt => (
        <button
          key={wt.type}
          type="button"
          onClick={() => onChange(wt.type)}
          className={cn(
            'flex items-start gap-2 p-2 rounded-lg border text-left transition-all overflow-hidden',
            value === wt.type
              ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
              : 'border-border hover:bg-muted/50'
          )}
        >
          <div className="shrink-0 text-muted-foreground">{wt.icon}</div>
          <div className="min-w-0 overflow-hidden">
            <div className="text-xs font-medium leading-tight truncate">{wt.label}</div>
            <div className="text-[10px] text-muted-foreground leading-snug mt-0.5 line-clamp-3">{wt.description}</div>
          </div>
        </button>
      ))}
    </div>
  </div>
);

// ─── Color Swatch Picker ───

export const ColorSwatchPicker: React.FC<{
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

export const QueryParamsEditor: React.FC<{
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

export const JsonPathHelp: React.FC = () => (
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
        <code className="block text-[10px]">{'items[*].value → массив'}</code>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

// ─── Test Extraction Button ───

export const TestExtractionBlock: React.FC<{
  form: MetricFormData;
  onPathSelect?: (field: 'jsonPathFact' | 'jsonPathPlan', path: string) => void;
}> = ({ form, onPathSelect }) => {
  const [result, setResult] = useState<MetricExtractionTestResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [pathTarget, setPathTarget] = useState<'jsonPathFact' | 'jsonPathPlan'>('jsonPathFact');

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
                  {onPathSelect && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-muted/50 border-b text-[10px]">
                      <span className="text-muted-foreground mr-1">Клик задаёт:</span>
                      <button
                        type="button"
                        onClick={() => setPathTarget('jsonPathFact')}
                        className={cn(
                          'px-1.5 py-0.5 rounded font-medium transition-colors',
                          pathTarget === 'jsonPathFact' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'text-muted-foreground hover:bg-muted'
                        )}
                      >
                        Fact
                      </button>
                      <button
                        type="button"
                        onClick={() => setPathTarget('jsonPathPlan')}
                        className={cn(
                          'px-1.5 py-0.5 rounded font-medium transition-colors',
                          pathTarget === 'jsonPathPlan' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'text-muted-foreground hover:bg-muted'
                        )}
                      >
                        Plan
                      </button>
                    </div>
                  )}
                  <JsonTreeViewer
                    data={result.rawResponse}
                    onPathSelect={onPathSelect ? (path) => onPathSelect(pathTarget, path) : undefined}
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

// ─── Field Mapping Shared Components ───

export const ENTITY_TYPE_LABELS: Record<FieldMappingEntityType, string> = {
  branch: 'Филиал',
  employee: 'Сотрудник',
  department: 'Отдел',
  designation: 'Должность',
  custom: 'Кастомный',
};

export const ENTITY_TYPE_COLORS: Record<FieldMappingEntityType, string> = {
  branch: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  employee: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  department: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  designation: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  custom: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

export function entityTypeIcon(type: FieldMappingEntityType, className = 'w-3.5 h-3.5') {
  switch (type) {
    case 'branch': return <GitBranch className={cn(className, 'text-blue-500')} />;
    case 'employee': return <User className={cn(className, 'text-green-500')} />;
    case 'department': return <Users className={cn(className, 'text-purple-500')} />;
    case 'designation': return <Briefcase className={cn(className, 'text-amber-500')} />;
    case 'custom': return <Settings className={cn(className, 'text-gray-500')} />;
  }
}

// ─── Merged Mapping Section ───

export interface MergedMappingSectionProps {
  mapping: FieldMapping;
  isInherited: boolean;
  overrideValues: Record<string, string>;
  branches: Array<{ slug: string; storeId: string; name: string }>;
  employees: EmployeeOption[];
  loadingEmployees: boolean;
  departments: DepartmentOption[];
  loadingDepartments: boolean;
  designations: DesignationOption[];
  loadingDesignations: boolean;
  sourceLabel: string;
  onSetOverride: (entityId: string, value: string) => void;
  onClearOverride: (entityId: string) => void;
  onRemoveMapping: () => void;
  onAddEmployee: (employeeId: string) => void;
}

export const MergedMappingSection: React.FC<MergedMappingSectionProps> = ({
  mapping,
  isInherited,
  overrideValues,
  branches,
  employees,
  loadingEmployees,
  departments,
  loadingDepartments,
  designations,
  loadingDesignations,
  sourceLabel,
  onSetOverride,
  onClearOverride,
  onRemoveMapping,
  onAddEmployee,
}) => {
  const entityType = mapping.entityType;
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [newCustomKey, setNewCustomKey] = useState('');

  const effectiveValues = { ...mapping.values, ...overrideValues };
  const filledCount = Object.values(effectiveValues).filter(v => v).length;
  const overrideCount = Object.keys(overrideValues).length;

  const filteredEmployees = useMemo(() => {
    if (!employeeSearch.trim()) return employees.slice(0, 20);
    const q = employeeSearch.toLowerCase();
    return employees.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.employee_name.toLowerCase().includes(q) ||
      (e.custom_itigris_user_id || '').toLowerCase().includes(q)
    ).slice(0, 20);
  }, [employees, employeeSearch]);

  const renderEntityRow = (entityId: string, entityLabel: string, entityIdLabel?: string) => {
    const globalValue = mapping.values[entityId] || '';
    const overrideValue = overrideValues[entityId];
    const hasOverride = overrideValue !== undefined;
    const effectiveValue = hasOverride ? overrideValue : globalValue;

    return (
      <div
        key={entityId}
        className={cn(
          'grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_1fr_1fr_auto] gap-x-2 gap-y-1 px-3 py-1.5 sm:py-1 items-center',
          hasOverride ? 'bg-orange-50/30 dark:bg-orange-950/10' : effectiveValue ? 'bg-blue-50/20 dark:bg-blue-950/5' : ''
        )}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs truncate">{entityLabel}</span>
          <code className="text-[10px] text-muted-foreground font-mono sm:hidden shrink-0">({entityIdLabel || entityId})</code>
        </div>
        <code className="hidden sm:block text-[10px] text-muted-foreground font-mono w-20 text-center truncate">{entityIdLabel || entityId}</code>
        {isInherited ? (
          <span className={cn(
            'text-[11px] font-mono px-2 py-1 rounded col-span-1 sm:col-span-1',
            globalValue ? 'bg-muted/50 text-foreground/70' : 'text-muted-foreground italic'
          )}>
            {globalValue || '—'}
          </span>
        ) : (
          <Input
            value={overrideValues[entityId] || ''}
            onChange={e => onSetOverride(entityId, e.target.value)}
            placeholder="—"
            className="text-[11px] h-7 font-mono col-span-1 sm:col-span-1"
          />
        )}
        {isInherited && (
          <Input
            value={hasOverride ? overrideValue : ''}
            onChange={e => onSetOverride(entityId, e.target.value)}
            placeholder={globalValue ? `${globalValue} (глоб.)` : '—'}
            className={cn(
              'text-[11px] h-7 font-mono',
              hasOverride ? 'border-orange-300 dark:border-orange-700' : ''
            )}
          />
        )}
        {!isInherited && <span className="hidden sm:block"></span>}
        <div className="w-6 flex justify-center row-start-1 col-start-2 sm:row-auto sm:col-auto">
          {hasOverride && isInherited && (
            <button type="button" onClick={() => onClearOverride(entityId)} className="text-muted-foreground hover:text-red-500 p-0.5" title="Сбросить оверрайд">
              <X className="w-3 h-3" />
            </button>
          )}
          {entityType === 'custom' && !isInherited && (
            <button type="button" onClick={() => onClearOverride(entityId)} className="text-muted-foreground hover:text-red-500 p-0.5" title="Удалить строку">
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    );
  };

  const footerText = (() => {
    switch (entityType) {
      case 'branch': return `${filledCount} из ${branches.length} филиалов. Без значения = метрика скрыта.`;
      case 'employee': return `${filledCount} сотрудников. Значение — ID во внешней системе.`;
      case 'department': return `${filledCount} из ${departments.length} отделов. Без значения = метрика скрыта для отдела.`;
      case 'designation': return `${filledCount} из ${designations.length} должностей. Без значения = метрика скрыта для должности.`;
      case 'custom': return `${filledCount} кастомных параметров. Последнее значение применяется к запросу.`;
    }
  })();

  return (
    <div className="border rounded-md overflow-hidden">
      <div className="bg-muted/40 px-3 py-2 flex items-center gap-2 border-b">
        {entityTypeIcon(entityType)}
        <div className="flex-1">
          <div className="text-xs font-medium">{mapping.label}</div>
          <div className="text-[10px] text-muted-foreground font-mono">{mapping.apiField}</div>
        </div>
        {isInherited && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground flex items-center gap-1">
            <Link2 className="w-3 h-3" /> {sourceLabel}
          </span>
        )}
        {overrideCount > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
            {overrideCount} оверрайд{overrideCount > 1 ? 'ов' : ''}
          </span>
        )}
        <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', ENTITY_TYPE_COLORS[entityType])}>
          {ENTITY_TYPE_LABELS[entityType]}
        </span>
        {!isInherited && (
          <button type="button" onClick={onRemoveMapping} className="text-muted-foreground hover:text-red-500 p-1" title="Удалить маппинг">
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      <div className="hidden sm:grid grid-cols-[1fr_auto_1fr_1fr_auto] gap-2 px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase border-b bg-muted/20">
        <span>{ENTITY_TYPE_LABELS[entityType]}</span>
        <span className="w-20 text-center">{entityType === 'custom' ? 'Ключ' : 'ID'}</span>
        <span>{isInherited ? `Глобально (${sourceLabel})` : 'Значение'}</span>
        {isInherited ? <span>Оверрайд</span> : <span></span>}
        <span className="w-6"></span>
      </div>

      <div className="divide-y">
        {entityType === 'branch' && branches.map(branch => renderEntityRow(branch.storeId, branch.name, branch.storeId))}

        {entityType === 'employee' && (() => {
          const allEmpIds = new Set([...Object.keys(mapping.values), ...Object.keys(overrideValues)]);
          return Array.from(allEmpIds).map(empId => {
            const emp = employees.find(e => e.name === empId);
            return renderEntityRow(empId, emp?.employee_name || empId, empId);
          });
        })()}

        {entityType === 'department' && (loadingDepartments ? (
          <div className="px-3 py-3 text-[10px] text-muted-foreground flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" /> Загрузка отделов...
          </div>
        ) : departments.map(dept => renderEntityRow(dept.name, dept.department_name || dept.name, dept.name)))}

        {entityType === 'designation' && (loadingDesignations ? (
          <div className="px-3 py-3 text-[10px] text-muted-foreground flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" /> Загрузка должностей...
          </div>
        ) : designations.map(desig => renderEntityRow(desig.name, desig.name)))}

        {entityType === 'custom' && (() => {
          const allKeys = new Set([...Object.keys(mapping.values), ...Object.keys(overrideValues)]);
          return Array.from(allKeys).map(key => renderEntityRow(key, key, key));
        })()}

        {entityType === 'employee' && (
          <div className="px-3 py-2">
            <Input value={employeeSearch} onChange={e => setEmployeeSearch(e.target.value)} placeholder="Поиск сотрудника по имени или ID..." className="text-xs h-7 mb-1.5" />
            {loadingEmployees && <div className="text-[10px] text-muted-foreground flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Загрузка сотрудников...</div>}
            {!loadingEmployees && filteredEmployees.length > 0 && employeeSearch && (
              <div className="max-h-[120px] overflow-y-auto border rounded-md divide-y">
                {filteredEmployees.filter(e => !effectiveValues[e.name]).map(emp => (
                  <button key={emp.name} type="button" onClick={() => onAddEmployee(emp.name)} className="w-full flex items-center gap-2 px-2 py-1 text-left hover:bg-muted/50 transition-colors">
                    <span className="text-xs">{emp.employee_name}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{emp.name}</span>
                    {emp.custom_itigris_user_id && <span className="text-[10px] text-green-600 ml-auto">itg: {emp.custom_itigris_user_id}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {entityType === 'custom' && (
          <div className="px-3 py-2 flex items-center gap-2">
            <Input value={newCustomKey} onChange={e => setNewCustomKey(e.target.value)} placeholder="Новый ключ..." className="text-xs h-7 font-mono flex-1"
              onKeyDown={e => { if (e.key === 'Enter' && newCustomKey.trim()) { onSetOverride(newCustomKey.trim(), ''); setNewCustomKey(''); } }} />
            <Button size="sm" variant="outline" className="h-7 text-xs" disabled={!newCustomKey.trim()} onClick={() => { onSetOverride(newCustomKey.trim(), ''); setNewCustomKey(''); }}>
              <Plus className="w-3 h-3 mr-1" />Добавить
            </Button>
          </div>
        )}
      </div>

      <div className="px-3 py-1.5 bg-muted/20 border-t">
        <span className="text-[10px] text-muted-foreground">
          {footerText}
          {isInherited && overrideCount > 0 && <span className="text-orange-600 ml-1">({overrideCount} переопределено для этой метрики)</span>}
        </span>
      </div>
    </div>
  );
};

// ─── Add Override Mapping Form ───

export interface AddOverrideMappingFormProps {
  onAdd: (apiField: string, entityType: FieldMappingEntityType, label: string) => void;
  onCancel: () => void;
}

export const AddOverrideMappingForm: React.FC<AddOverrideMappingFormProps> = ({ onAdd, onCancel }) => {
  const [apiField, setApiField] = useState('');
  const [entityType, setEntityType] = useState<FieldMappingEntityType>('branch');
  const [label, setLabel] = useState('');

  const handleAdd = () => {
    const field = apiField.trim();
    if (!field) return;
    onAdd(field, entityType, label.trim() || field);
    setApiField('');
    setLabel('');
  };

  return (
    <div className="border rounded-md p-3 space-y-2 bg-blue-50/30 dark:bg-blue-950/10">
      <div className="text-xs font-medium">Добавить маппинг</div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div>
          <label className="text-[10px] text-muted-foreground">Поле API</label>
          <Input value={apiField} onChange={e => setApiField(e.target.value)} placeholder="filter[pipeline_id]" className="text-xs h-7 font-mono" />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground">Тип</label>
          <Select value={entityType} onValueChange={v => setEntityType(v as FieldMappingEntityType)}>
            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="branch">Филиал</SelectItem>
              <SelectItem value="employee">Сотрудник</SelectItem>
              <SelectItem value="department">Отдел</SelectItem>
              <SelectItem value="designation">Должность</SelectItem>
              <SelectItem value="custom">Кастомный</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground">Название</label>
          <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="Pipeline ID" className="text-xs h-7" />
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" className="h-7 text-xs" onClick={handleAdd} disabled={!apiField.trim()}>
          <Plus className="w-3 h-3 mr-1" />Добавить
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onCancel}>
          Отмена
        </Button>
      </div>
    </div>
  );
};

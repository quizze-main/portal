import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/Spinner';
import {
  Settings2,
  Database,
  Building,
  Target,
  Link2,
  Trash2,
  Save,
  Eye,
  Plus,
  X,
  Check,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEmployee } from '@/contexts/EmployeeProvider';
import { BRANCHES } from '@/data/branchData';
import type {
  DashboardMetricConfig,
  WidgetType,
  MetricType,
  ValueType,
  AggregationMethod,
  PlanPeriod,
  PlanProRateMethod,
  MetricThresholds,
  MetricBinding,
} from '@/lib/internalApiClient';
import {
  SOURCE_LABELS,
  SOURCE_COLORS,
  SCOPE_COLORS,
  METRIC_TYPE_LABELS,
  VALUE_TYPE_LABELS,
  AGGREGATION_LABELS,
  PLAN_PERIOD_LABELS,
  PRORATE_METHOD_LABELS,
  DASHBOARD_POSITIONS,
} from './dashboard-constants';
import {
  MetricFormData,
  toForm,
  WidgetTypePicker,
  ColorSwatchPicker,
  QueryParamsEditor,
  JsonPathHelp,
  TestExtractionBlock,
  WIDGET_TYPE_TO_FORECAST_LABEL,
} from './shared-metric-components';
import { FormulaEditor } from './FormulaEditor';
import ApiExplorerDialog from './ApiExplorerDialog';
import { MetricPlansManager } from './MetricPlansManager';
import { MetricMappingContent } from './MetricMappingDialog';
import { KPIFullWidthCard, FullWidthKPIMetric } from '@/components/dashboard/KPIFullWidthCard';
import { calculateMetricStatus } from '@/lib/formatters';

// ─── Props ───

interface MetricEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metric: DashboardMetricConfig;
  onSave: (data: MetricFormData) => void;
  onDelete: () => void;
  onSaveMapping: (data: { fieldMappings: import('@/lib/internalApiClient').FieldMapping[]; bindings: MetricBinding[] }) => Promise<void>;
  isSaving: boolean;
  availableParents?: DashboardMetricConfig[];
  dataSources?: { id: string; label: string; enabled: boolean }[];
  allMetrics?: DashboardMetricConfig[];
  initialTab?: string;
}

// ─── Component ───

const MetricEditDialog: React.FC<MetricEditDialogProps> = ({
  open,
  onOpenChange,
  metric,
  onSave,
  onDelete,
  onSaveMapping,
  isSaving,
  availableParents = [],
  dataSources = [],
  allMetrics = [],
  initialTab = 'basic',
}) => {
  const { storeOptions, storeId: employeeStoreId } = useEmployee();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [form, setForm] = useState<MetricFormData>(() => toForm(metric));
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [explorerOpen, setExplorerOpen] = useState(false);
  const [bindingDropdownOpen, setBindingDropdownOpen] = useState(false);
  const [expandedBindingOverrides, setExpandedBindingOverrides] = useState<Set<number>>(new Set());
  const [employeeIdInput, setEmployeeIdInput] = useState('');

  // Reset form when dialog opens or metric changes
  useEffect(() => {
    if (open) {
      setForm(toForm(metric));
      setActiveTab(initialTab);
      setDeleteOpen(false);
      setDiscardOpen(false);
      setExplorerOpen(false);
      setBindingDropdownOpen(false);
      setExpandedBindingOverrides(new Set());
      setEmployeeIdInput('');
    }
  }, [open, metric, initialTab]);

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

  const hasChanges = useMemo(() => {
    return JSON.stringify(toForm(metric)) !== JSON.stringify(form);
  }, [metric, form]);

  const handleSave = () => {
    onSave(form);
  };

  const handleCancel = () => {
    setForm(toForm(metric));
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen && hasChanges) {
      setDiscardOpen(true);
      return;
    }
    onOpenChange(nextOpen);
  };

  // KPI Preview
  const [localFact, setLocalFact] = useState(0);
  const [localPlan, setLocalPlan] = useState(0);

  useEffect(() => {
    if (metric.source === 'manual' && metric.manualData?.length) {
      const now = new Date();
      const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const periodEntries = metric.manualData.filter(d => d.period === currentPeriod);
      let entry = periodEntries.find(e => e.storeId === employeeStoreId);
      if (!entry) entry = periodEntries.find(e => !e.storeId);
      if (!entry && periodEntries.length > 0) entry = periodEntries[0];
      if (!entry) entry = metric.manualData[metric.manualData.length - 1];
      setLocalFact(entry.fact);
      setLocalPlan(entry.plan);
    }
  }, [metric.source, metric.manualData, employeeStoreId]);

  const previewMetric: FullWidthKPIMetric = useMemo(() => {
    const fact = metric.source === 'manual' ? localFact : 0;
    const plan = metric.source === 'manual' ? localPlan : 0;
    const color = form.color || metric.color || '#3B82F6';
    let forecastValue: number | undefined;
    if (plan > 0) {
      forecastValue = metric.forecastLabel === 'deviation'
        ? Math.round(((fact - plan) / plan) * 100)
        : Math.round((fact / plan) * 100);
    }
    return {
      id: metric.id,
      name: form.name,
      current: fact,
      plan,
      unit: form.unit,
      trend: 'stable' as const,
      status: plan > 0 ? calculateMetricStatus(fact, plan, undefined, forecastValue, metric.forecastLabel) : 'warning' as const,
      color,
      forecastValue,
      forecastUnit: metric.forecastUnit || '%',
      forecastLabel: metric.forecastLabel,
    };
  }, [metric, localFact, localPlan, form.name, form.unit, form.color]);

  const isExternalApi = form.source === 'external_api';

  // ─── Tab: Основное (matches wizard Step 1 layout) ───
  const renderBasicTab = () => (
    <div className="space-y-3">
      {/* 1. ID + Name */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">ID</label>
          <Input value={form.id} disabled className="text-xs h-8" />
        </div>
        <div className="lg:col-span-2">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Название</label>
          <Input value={form.name} onChange={e => updateField('name', e.target.value)} className="text-xs h-8" />
        </div>
      </div>

      {/* 2. Widget type */}
      <WidgetTypePicker value={form.widgetType} onChange={handleWidgetTypeChange} />

      {/* 3. Metric classification (3 cols) */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Тип метрики</label>
          <Select value={form.metricType} onValueChange={v => {
            const mt = v as MetricType;
            const updates: Partial<MetricFormData> = { metricType: mt };
            if (mt === 'computed') updates.source = 'computed' as const;
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

      {/* 4. Units (2 cols) */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Единица</label>
          <Input value={form.unit} onChange={e => updateField('unit', e.target.value)} placeholder="₽, %, шт" className="text-xs h-8" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Ед. прогноза</label>
          <Input value={form.forecastUnit} onChange={e => updateField('forecastUnit', e.target.value)} placeholder="%" className="text-xs h-8" />
        </div>
      </div>

      {/* 5. Thresholds (2 cols) */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Порог «критично»</label>
          <Input type="number" value={form.thresholdCritical} onChange={e => updateField('thresholdCritical', e.target.value)} placeholder={form.forecastLabel === 'deviation' ? '-5' : '70'} className="text-xs h-8" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Порог «хорошо»</label>
          <Input type="number" value={form.thresholdGood} onChange={e => updateField('thresholdGood', e.target.value)} placeholder={form.forecastLabel === 'deviation' ? '5' : '95'} className="text-xs h-8" />
        </div>
      </div>

      {/* 6. Decimal places + Parent (2 cols) */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Знаков после .</label>
          <Input type="number" min={0} max={4} value={form.decimalPlaces} onChange={e => updateField('decimalPlaces', parseInt(e.target.value) || 0)} className="text-xs h-8" />
        </div>
        {availableParents.length > 0 && (
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Родительская метрика</label>
            <Select value={form.parentId || '__none__'} onValueChange={v => updateField('parentId', v === '__none__' ? null : v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Нет (верхний уровень)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Нет (верхний уровень)</SelectItem>
                {availableParents.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* 7. Color */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Цвет</label>
        <ColorSwatchPicker value={form.color} onChange={c => updateField('color', c)} />
      </div>

      {/* 8. Formula (conditional) */}
      {form.metricType === 'computed' && (
        <FormulaEditor value={form.formula} onChange={v => updateField('formula', v)} metrics={allMetrics} currentMetricId={form.id} />
      )}
    </div>
  );

  // ─── Tab: Источник ───
  const renderSourceTab = () => (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Источник данных</label>
        <div className="flex gap-2 flex-wrap">
          {(['tracker', 'manual', 'computed', 'external_api'] as const).map(src => (
            <button
              key={src}
              type="button"
              onClick={() => {
                const updates: Partial<MetricFormData> = { source: src };
                if (src === 'computed') {
                  updates.metricType = 'computed';
                } else if (form.source === 'computed') {
                  updates.metricType = 'absolute';
                }
                setForm(prev => ({ ...prev, ...updates }));
              }}
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
          <Input value={form.trackerCode} onChange={e => updateField('trackerCode', e.target.value)} placeholder="revenue_created" className="text-xs h-8" />
        </div>
      )}

      {form.source === 'manual' && (
        <div className="border rounded-md p-3 text-xs text-muted-foreground">
          Данные вводятся вручную через раздел «Планы».
        </div>
      )}

      {form.source === 'computed' && (
        <FormulaEditor
          value={form.formula}
          onChange={v => updateField('formula', v)}
          metrics={allMetrics}
          currentMetricId={form.id}
        />
      )}

      {isExternalApi && (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Коннектор</label>
            <Select value={form.dataSourceId || '__none__'} onValueChange={v => updateField('dataSourceId', v === '__none__' ? null : v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Прямой URL" /></SelectTrigger>
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
                <Input value={form.externalPath} onChange={e => updateField('externalPath', e.target.value)} placeholder="/api/v1/metrics/revenue" className="text-xs h-8" />
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
              <Button type="button" size="sm" variant="outline" onClick={() => setExplorerOpen(true)} className="text-xs h-8 shrink-0" title="Обзор API">
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
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-3">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">URL</label>
                <Input value={form.externalUrl} onChange={e => updateField('externalUrl', e.target.value)} placeholder="https://api.example.com/metric" className="text-xs h-8" />
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

          <QueryParamsEditor params={form.externalQueryParams} onChange={p => updateField('externalQueryParams', p)} />

          {form.externalMethod === 'POST' && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Request Body (JSON)</label>
              <Textarea value={form.externalBody} onChange={e => updateField('externalBody', e.target.value)} placeholder='{"date_from": "2026-01-01"}' className="text-xs font-mono min-h-[60px]" rows={3} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">JSON Path (fact) <JsonPathHelp /></label>
              <Input value={form.jsonPathFact} onChange={e => updateField('jsonPathFact', e.target.value)} placeholder="data.fact_value" className="text-xs h-8" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">JSON Path (plan) <JsonPathHelp /></label>
              <Input value={form.jsonPathPlan} onChange={e => updateField('jsonPathPlan', e.target.value)} placeholder="data.plan_value" className="text-xs h-8" />
            </div>
          </div>

          <TestExtractionBlock form={form} onPathSelect={(field, path) => updateField(field, path)} />
        </div>
      )}
    </div>
  );

  // ─── Tab: Привязка ───
  const renderBindingsTab = () => (
    <div className="space-y-3">
      <label className="text-xs font-medium text-muted-foreground mb-1 block">Привязки к филиалам</label>
      {form.bindings.length > 0 && (
        <div className="space-y-1 mb-2">
          {form.bindings.map((b, i) => {
            const overrides = b.queryParamOverrides || [];
            const isExpanded = expandedBindingOverrides.has(i);
            const showOverridesToggle = form.source === 'external_api' && b.scope === 'branch';
            return (
              <div key={i}>
                <div className="flex items-center gap-2 text-xs">
                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                    b.scope === 'network' ? SCOPE_COLORS.network :
                    b.scope === 'branch' ? SCOPE_COLORS.branch :
                    SCOPE_COLORS.employee
                  )}>
                    {b.scope === 'network' ? 'Сеть' : b.scope === 'branch' ? 'Филиал' : 'Сотрудник'}
                  </span>
                  <span className="flex-1 truncate">
                    {b.scope === 'network' ? 'Вся сеть' : b.scope === 'employee' ? b.scopeId : (storeOptions.find(s => s.store_id === b.scopeId)?.name || BRANCHES.find(br => br.id === b.scopeId)?.name || b.scopeId)}
                  </span>
                  {showOverridesToggle && (
                    <button
                      type="button"
                      onClick={() => {
                        const next = new Set(expandedBindingOverrides);
                        if (next.has(i)) next.delete(i); else next.add(i);
                        setExpandedBindingOverrides(next);
                      }}
                      className={cn(
                        'flex items-center gap-0.5 text-[10px] px-1 py-0.5 rounded',
                        overrides.length > 0 ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:bg-muted'
                      )}
                      title="API параметры"
                    >
                      <Settings2 className="w-3 h-3" />
                      {overrides.length > 0 && <span>{overrides.length}</span>}
                    </button>
                  )}
                  <Switch
                    checked={b.enabled}
                    onCheckedChange={v => {
                      const next = [...form.bindings];
                      next[i] = { ...next[i], enabled: v };
                      setForm(prev => ({ ...prev, bindings: next }));
                    }}
                    className="scale-75"
                  />
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, bindings: prev.bindings.filter((_, idx) => idx !== i) }))}
                    className="text-muted-foreground hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                {showOverridesToggle && isExpanded && (
                  <div className="ml-6 mt-1 mb-1 p-2 border rounded-md bg-muted/20 space-y-1.5">
                    <div className="text-[10px] text-muted-foreground">
                      API параметры (заменяют базовые для этого филиала)
                    </div>
                    {overrides.map((o, oIdx) => (
                      <div key={oIdx} className="flex gap-1.5 items-center">
                        <Input
                          value={o.key}
                          onChange={e => {
                            const nextBindings = [...form.bindings];
                            const nextOverrides = [...(nextBindings[i].queryParamOverrides || [])];
                            nextOverrides[oIdx] = { ...nextOverrides[oIdx], key: e.target.value };
                            nextBindings[i] = { ...nextBindings[i], queryParamOverrides: nextOverrides };
                            setForm(prev => ({ ...prev, bindings: nextBindings }));
                          }}
                          placeholder="key"
                          className="text-xs h-7 w-[100px]"
                        />
                        <Input
                          value={o.value}
                          onChange={e => {
                            const nextBindings = [...form.bindings];
                            const nextOverrides = [...(nextBindings[i].queryParamOverrides || [])];
                            nextOverrides[oIdx] = { ...nextOverrides[oIdx], value: e.target.value };
                            nextBindings[i] = { ...nextBindings[i], queryParamOverrides: nextOverrides };
                            setForm(prev => ({ ...prev, bindings: nextBindings }));
                          }}
                          placeholder="value"
                          className="text-xs h-7 flex-1"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const nextBindings = [...form.bindings];
                            const nextOverrides = (nextBindings[i].queryParamOverrides || []).filter((_, idx) => idx !== oIdx);
                            nextBindings[i] = { ...nextBindings[i], queryParamOverrides: nextOverrides.length ? nextOverrides : undefined };
                            setForm(prev => ({ ...prev, bindings: nextBindings }));
                          }}
                          className="text-muted-foreground hover:text-red-500 p-0.5"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const nextBindings = [...form.bindings];
                        nextBindings[i] = { ...nextBindings[i], queryParamOverrides: [...overrides, { key: '', value: '' }] };
                        setForm(prev => ({ ...prev, bindings: nextBindings }));
                      }}
                      className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" />
                      Добавить параметр
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <div className="relative">
        <button type="button" onClick={() => setBindingDropdownOpen(!bindingDropdownOpen)} className="text-xs text-primary hover:underline">
          + Добавить привязку
        </button>
        {bindingDropdownOpen && (
          <div className="absolute z-10 mt-1 w-64 max-h-[280px] overflow-y-auto border rounded-md bg-popover shadow-md p-2 space-y-1">
            {!form.bindings.some(b => b.scope === 'network') && (
              <button
                type="button"
                onClick={() => {
                  setForm(prev => ({ ...prev, bindings: [...prev.bindings, { scope: 'network', scopeId: '*', enabled: true }] }));
                  setBindingDropdownOpen(false);
                }}
                className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-muted/50 text-xs text-left"
              >
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', SCOPE_COLORS.network)}>Сеть</span>
                Вся сеть
              </button>
            )}
            {storeOptions.map(s => {
              const alreadyAdded = form.bindings.some(b => b.scope === 'branch' && b.scopeId === s.store_id);
              return (
                <button
                  key={s.store_id}
                  type="button"
                  disabled={alreadyAdded}
                  onClick={() => {
                    setForm(prev => ({ ...prev, bindings: [...prev.bindings, { scope: 'branch', scopeId: s.store_id, enabled: true }] }));
                  }}
                  className={cn(
                    'flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs text-left',
                    alreadyAdded ? 'opacity-40 cursor-default' : 'hover:bg-muted/50 cursor-pointer'
                  )}
                >
                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', SCOPE_COLORS.branch)}>Филиал</span>
                  {s.name}
                  {alreadyAdded && <Check className="w-3 h-3 ml-auto text-muted-foreground" />}
                </button>
              );
            })}
            <div className="border-t pt-1 mt-1">
              <div className="text-[10px] text-muted-foreground px-2 mb-1">Сотрудник</div>
              <div className="flex gap-1 px-1">
                <Input
                  value={employeeIdInput}
                  onChange={e => setEmployeeIdInput(e.target.value)}
                  placeholder="HR-EMP-00001"
                  className="text-xs h-7 flex-1"
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!employeeIdInput.trim()}
                  onClick={() => {
                    const eid = employeeIdInput.trim();
                    if (eid && !form.bindings.some(b => b.scope === 'employee' && b.scopeId === eid)) {
                      setForm(prev => ({ ...prev, bindings: [...prev.bindings, { scope: 'employee', scopeId: eid, enabled: true }] }));
                      setEmployeeIdInput('');
                    }
                  }}
                  className="h-7 text-xs px-2"
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <div className="border-t pt-1 mt-1">
              <button type="button" onClick={() => setBindingDropdownOpen(false)} className="text-[10px] text-muted-foreground hover:text-foreground w-full text-center py-1">
                Закрыть
              </button>
            </div>
          </div>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground mt-1">
        Пустой список = метрика видна всем. Добавьте привязку чтобы ограничить.
      </p>

      {/* Visibility by positions (from wizard Step 3) */}
      <div className="pt-2 border-t">
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Видимость по должностям</label>
        <div className="flex gap-1.5 flex-wrap">
          {DASHBOARD_POSITIONS.map(pos => {
            const selected = form.visibleToPositions.includes(pos.id);
            return (
              <button
                key={pos.id}
                type="button"
                onClick={() => {
                  const next = selected
                    ? form.visibleToPositions.filter(p => p !== pos.id)
                    : [...form.visibleToPositions, pos.id];
                  updateField('visibleToPositions', next);
                }}
                className={cn(
                  'text-[11px] px-2.5 py-1 rounded-md border transition-colors',
                  selected
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : 'border-border text-muted-foreground hover:bg-muted/50'
                )}
              >
                {pos.label}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">Если ничего не выбрано — метрика видна всем</p>
      </div>

      {/* Loss/reserve configuration (from wizard Step 3) */}
      <div className="space-y-2 pt-2 border-t">
        <label className="text-xs font-semibold text-muted-foreground block">Потери и запас</label>
        <Select value={form.lossMode} onValueChange={v => updateField('lossMode', v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Авто (факт − план)</SelectItem>
            <SelectItem value="formula">Формула</SelectItem>
            {form.source === 'external_api' && <SelectItem value="jsonpath">JSONPath (из API)</SelectItem>}
            <SelectItem value="disabled">Отключено</SelectItem>
            {form.source === 'tracker' && <SelectItem value="tracker">Из Tracker API</SelectItem>}
          </SelectContent>
        </Select>
        {form.lossMode === 'formula' && (
          <FormulaEditor value={form.lossFormula} onChange={v => updateField('lossFormula', v)} metrics={allMetrics} currentMetricId={form.id} />
        )}
        {form.lossMode === 'jsonpath' && (
          <Input value={form.jsonPathLoss} onChange={e => updateField('jsonPathLoss', e.target.value)} placeholder="data.loss_or_overperformance" className="text-xs h-8" />
        )}
      </div>

      {/* V7: Forecast prediction settings */}
      <div className="space-y-2 pt-2 border-t">
        <label className="text-xs font-semibold text-muted-foreground block">Прогноз на конец месяца</label>
        <Select value={form.forecastMethod || 'auto'} onValueChange={v => updateField('forecastMethod', v === 'auto' ? '' : v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Авто (по типу метрики)" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Авто (по типу метрики)</SelectItem>
            <SelectItem value="linear">Линейная экстраполяция</SelectItem>
            <SelectItem value="custom">Своя формула</SelectItem>
            <SelectItem value="disabled">Отключено</SelectItem>
          </SelectContent>
        </Select>
        {form.forecastMethod === 'custom' && (
          <div className="space-y-1">
            <Input
              value={form.forecastFormula}
              onChange={e => updateField('forecastFormula', e.target.value)}
              placeholder="{fact} + ({daily_avg} * {remaining_working_days})"
              className="text-xs h-8 font-mono"
            />
            <p className="text-[10px] text-muted-foreground">
              Переменные: {'{fact}'}, {'{plan}'}, {'{daily_avg}'}, {'{elapsed_working_days}'}, {'{remaining_working_days}'}, {'{total_working_days}'}, {'{completion_pct}'}, {'{elapsed_calendar_days}'}, {'{total_calendar_days}'}
            </p>
          </div>
        )}
      </div>

      {/* Plan period settings (from wizard Step 3) */}
      <div className="grid grid-cols-2 gap-3 pt-2 border-t">
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
      </div>
    </div>
  );

  // Footer for settings tabs (basic, source, bindings)
  const isSettingsTab = activeTab === 'basic' || activeTab === 'source' || activeTab === 'bindings';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl h-[95vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-3 pb-2 border-b shrink-0">
          <DialogTitle className="text-sm flex items-center gap-2">
            {metric.name}
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', SOURCE_COLORS[metric.source] || '')}>
              {SOURCE_LABELS[metric.source] || metric.source}
            </span>
          </DialogTitle>
          <DialogDescription className="text-xs leading-tight">
            Редактирование метрики <span className="font-mono">{metric.id}</span>
          </DialogDescription>
        </DialogHeader>

        {/* KPI Preview */}
        <div className="px-5 py-1 shrink-0">
          <div className="pointer-events-none max-h-[70px] overflow-hidden rounded-lg border">
            <KPIFullWidthCard metric={previewMetric} />
          </div>
          {(metric.source === 'tracker' || metric.source === 'external_api') && (
            <p className="text-[10px] text-muted-foreground italic text-center mt-0.5">
              {metric.source === 'tracker' ? 'Данные из Трекера (превью недоступно)' : 'Данные из внешнего API (превью недоступно)'}
            </p>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <TabsList className="w-full justify-start overflow-x-auto rounded-none border-b bg-transparent h-8 px-5 shrink-0">
            <TabsTrigger value="basic" className="text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1.5 px-3">
              <Settings2 className="w-3.5 h-3.5" />
              Основное
            </TabsTrigger>
            <TabsTrigger value="source" className="text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1.5 px-3">
              <Database className="w-3.5 h-3.5" />
              Источник
            </TabsTrigger>
            <TabsTrigger value="bindings" className="text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1.5 px-3">
              <Building className="w-3.5 h-3.5" />
              Привязка
            </TabsTrigger>
            <TabsTrigger value="plans" className="text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1.5 px-3">
              <Target className="w-3.5 h-3.5" />
              Планы
            </TabsTrigger>
            {isExternalApi && (
              <TabsTrigger value="mapping" className="text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1.5 px-3">
                <Link2 className="w-3.5 h-3.5" />
                Маппинг
              </TabsTrigger>
            )}
          </TabsList>

          <div className="flex-1 overflow-y-auto px-5 py-3">
            <TabsContent value="basic" className="mt-0">
              {renderBasicTab()}
            </TabsContent>
            <TabsContent value="source" className="mt-0">
              {renderSourceTab()}
            </TabsContent>
            <TabsContent value="bindings" className="mt-0">
              {renderBindingsTab()}
            </TabsContent>
            <TabsContent value="plans" className="mt-0">
              <MetricPlansManager
                metricId={metric.id}
                metricName={metric.name}
                unit={metric.unit}
                embedded
              />
            </TabsContent>
            {isExternalApi && (
              <TabsContent value="mapping" className="mt-0">
                <MetricMappingContent
                  metric={metric}
                  active={open && activeTab === 'mapping'}
                  onSave={onSaveMapping}
                  embedded
                />
              </TabsContent>
            )}
          </div>
        </Tabs>

        {/* Footer */}
        {isSettingsTab && (
          <div className="flex items-center justify-between px-5 py-2.5 border-t shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteOpen(true)}
              className="text-destructive hover:text-destructive h-7 text-xs"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Удалить
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCancel} disabled={!hasChanges} className="h-7 text-xs">
                Отмена
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving || !hasChanges} className="h-7 text-xs">
                {isSaving ? <Spinner size="sm" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                Сохранить
              </Button>
            </div>
          </div>
        )}

        {/* Unsaved changes confirmation */}
        <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Несохранённые изменения</AlertDialogTitle>
              <AlertDialogDescription>
                Вы внесли изменения. Закрыть без сохранения?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Продолжить редактирование</AlertDialogCancel>
              <AlertDialogAction onClick={() => { setDiscardOpen(false); onOpenChange(false); }}>
                Закрыть без сохранения
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete confirmation */}
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Удалить метрику?</AlertDialogTitle>
              <AlertDialogDescription>
                Метрика &ldquo;{form.name}&rdquo; будет удалена. Это действие нельзя отменить.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete}>Удалить</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
};

export default MetricEditDialog;

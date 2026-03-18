import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Building,
  Target,
  Users,
  Globe,
  Settings2,
  Database,
  Eye,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useEmployee } from '@/contexts/EmployeeProvider';
import { internalApiClient } from '@/lib/internalApiClient';
import type {
  DashboardMetricConfig,
  MetricThresholds,
  PlanPeriod,
  PlanProRateMethod,
  MetricType,
  ValueType,
  AggregationMethod,
  WidgetType,
} from '@/lib/internalApiClient';
import {
  DASHBOARD_POSITIONS,
  PLAN_PERIOD_LABELS,
  PRORATE_METHOD_LABELS,
  SOURCE_LABELS,
  SCOPE_COLORS,
  METRIC_TYPE_LABELS,
  VALUE_TYPE_LABELS,
  AGGREGATION_LABELS,
  generatePeriodOptions,
  type PeriodType,
  PERIOD_TYPE_LABELS,
} from './dashboard-constants';
import {
  MetricFormData,
  emptyForm,
  WidgetTypePicker,
  ColorSwatchPicker,
  QueryParamsEditor,
  JsonPathHelp,
  TestExtractionBlock,
  WIDGET_TYPE_TO_FORECAST_LABEL,
  MergedMappingSection,
  AddOverrideMappingForm,
} from './shared-metric-components';
import { useFieldMappingEditor } from '@/hooks/useFieldMappingEditor';
import { FormulaEditor } from './FormulaEditor';
import ApiExplorerDialog from './ApiExplorerDialog';

// ─── Types ───

interface MetricCreationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  availableParents: DashboardMetricConfig[];
  dataSources: { id: string; label: string; enabled: boolean }[];
  allMetrics: DashboardMetricConfig[];
  initialWidgetType?: WidgetType;
}

type WizardStep = 1 | 2 | 3 | 4;

const STEP_LABELS: Record<WizardStep, string> = {
  1: 'Основное',
  2: 'Источник',
  3: 'Привязка',
  4: 'Готово',
};

const STEP_ICONS: Record<WizardStep, React.ReactNode> = {
  1: <Settings2 className="w-3.5 h-3.5" />,
  2: <Database className="w-3.5 h-3.5" />,
  3: <Building className="w-3.5 h-3.5" />,
  4: <Check className="w-3.5 h-3.5" />,
};

// ─── Component ───

const MetricCreationWizard: React.FC<MetricCreationWizardProps> = ({
  open,
  onOpenChange,
  onComplete,
  availableParents,
  dataSources,
  allMetrics,
  initialWidgetType,
}) => {
  const { storeOptions } = useEmployee();

  // ─── Wizard state ───
  const [step, setStep] = useState<WizardStep>(1);
  const [form, setForm] = useState<MetricFormData>({ ...emptyForm });

  // Step 2
  const [explorerOpen, setExplorerOpen] = useState(false);

  // Step 3: Assignment
  const [bindingMode, setBindingMode] = useState<'network' | 'branches'>('network');
  const [selectedBranches, setSelectedBranches] = useState<Set<string>>(
    () => new Set(storeOptions.map(s => s.store_id))
  );
  const [visibleToPositions, setVisibleToPositions] = useState<string[]>([]);

  // Step 3: Plans
  const [periodType, setPeriodType] = useState<PeriodType>('month');
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [planValues, setPlanValues] = useState<Record<string, string>>({});
  const [applyAllValue, setApplyAllValue] = useState('');

  // Submission
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Field mapping (for external_api)
  const [showAddOverride, setShowAddOverride] = useState(false);
  const isExternalApi = form.source === 'external_api';

  const fieldMappingEditor = useFieldMappingEditor({
    active: step >= 3 && isExternalApi,
    dataSourceId: form.dataSourceId || null,
    source: form.source,
    initialFieldMappings: [],
  });

  const periodOptions = useMemo(() => generatePeriodOptions(periodType), [periodType]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStep(1);
      setForm(initialWidgetType ? { ...emptyForm, widgetType: initialWidgetType } : { ...emptyForm });
      setBindingMode('network');
      setSelectedBranches(new Set(storeOptions.map(s => s.store_id)));
      setVisibleToPositions([]);
      setPeriodType('month');
      const now = new Date();
      setSelectedPeriod(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
      setPlanValues({});
      setApplyAllValue('');
      setShowAddOverride(false);
    }
  }, [open, storeOptions]);

  // ─── Form helpers ───

  const updateField = <K extends keyof MetricFormData>(key: K, value: MetricFormData[K]) => {
    setForm(prev => {
      const next = { ...prev, [key]: value };
      // Auto-set lossMode when source changes
      if (key === 'source') {
        next.lossMode = value === 'tracker' ? 'tracker' : 'auto';
      }
      return next;
    });
  };

  const handleWidgetTypeChange = (wt: WidgetType) => {
    setForm(prev => ({
      ...prev,
      widgetType: wt,
      forecastLabel: WIDGET_TYPE_TO_FORECAST_LABEL[wt],
    }));
  };

  // ─── Step 3 handlers ───

  const toggleBranch = useCallback((branchId: string) => {
    setSelectedBranches(prev => {
      const next = new Set(prev);
      if (next.has(branchId)) next.delete(branchId);
      else next.add(branchId);
      return next;
    });
  }, []);

  const toggleAllBranches = useCallback((checked: boolean) => {
    setSelectedBranches(checked ? new Set(storeOptions.map(s => s.store_id)) : new Set());
  }, [storeOptions]);

  const togglePosition = useCallback((posId: string) => {
    setVisibleToPositions(prev =>
      prev.includes(posId) ? prev.filter(p => p !== posId) : [...prev, posId]
    );
  }, []);

  const handleApplyAll = useCallback(() => {
    if (!applyAllValue) return;
    const newValues: Record<string, string> = {};
    if (bindingMode === 'network') {
      newValues['*'] = applyAllValue;
    } else {
      selectedBranches.forEach(id => {
        newValues[id] = applyAllValue;
      });
    }
    setPlanValues(newValues);
  }, [applyAllValue, bindingMode, selectedBranches]);

  const updatePlanValue = useCallback((scopeId: string, value: string) => {
    setPlanValues(prev => ({ ...prev, [scopeId]: value }));
  }, []);

  // ─── Validation ───

  const canProceed = useMemo(() => {
    switch (step) {
      case 1: return form.id.trim() !== '' && form.name.trim() !== '';
      case 2: {
        if (form.source === 'tracker') return form.trackerCode.trim() !== '';
        if (form.source === 'external_api') {
          return form.dataSourceId ? form.externalPath.trim() !== '' : form.externalUrl.trim() !== '';
        }
        return true;
      }
      case 3: return bindingMode === 'network' || selectedBranches.size > 0;
      case 4: return true;
      default: return false;
    }
  }, [step, form, bindingMode, selectedBranches]);

  // ─── Submission ───

  const branchesForPlan = useMemo(() => {
    if (bindingMode === 'network') return [];
    return storeOptions.filter(s => selectedBranches.has(s.store_id));
  }, [bindingMode, selectedBranches, storeOptions]);

  const hasPlanValues = useMemo(() => {
    return Object.values(planValues).some(v => v && parseFloat(v) > 0);
  }, [planValues]);

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const baseBindings = bindingMode === 'network'
        ? [{ scope: 'network' as const, scopeId: '*', enabled: true }]
        : Array.from(selectedBranches).map(id => ({
            scope: 'branch' as const,
            scopeId: id,
            enabled: true,
          }));

      let bindings = baseBindings;
      if (isExternalApi) {
        const mappingBindings = fieldMappingEditor.deriveBindingsFromMappings();
        const seen = new Set(baseBindings.map(b => `${b.scope}:${b.scopeId}`));
        bindings = [...baseBindings, ...mappingBindings.filter(b => !seen.has(`${b.scope}:${b.scopeId}`))];
      }

      const { thresholdCritical, thresholdGood, ...rest } = form;
      const thresholds: MetricThresholds = {};
      if (thresholdCritical !== '') thresholds.critical = parseFloat(thresholdCritical);
      if (thresholdGood !== '') thresholds.good = parseFloat(thresholdGood);

      const fieldMappings = isExternalApi ? fieldMappingEditor.getCleanOverrides() : undefined;

      await internalApiClient.createDashboardMetric({
        ...rest,
        thresholds,
        bindings,
        visibleToPositions,
        ...(fieldMappings ? { fieldMappings } : {}),
      });

      // Create plans if values were entered
      const planEntries = Object.entries(planValues)
        .filter(([, val]) => val && parseFloat(val) > 0)
        .map(([scopeId, val]) => ({
          metricId: form.id,
          scope: scopeId === '*' ? ('network' as const) : ('branch' as const),
          scopeId,
          period: selectedPeriod,
          planValue: parseFloat(val),
        }));

      if (planEntries.length > 0) {
        try {
          await internalApiClient.bulkCreateMetricPlans(planEntries);
        } catch {
          toast.warning('Метрика создана, но планы не сохранены. Настройте планы в карточке метрики.');
        }
      }

      toast.success(`Метрика "${form.name}" создана`);
      onComplete();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка создания метрики');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    bindingMode, selectedBranches, visibleToPositions, form,
    planValues, selectedPeriod, onComplete, onOpenChange,
  ]);

  // ─── Step Indicator ───

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-1 mb-4">
      {([1, 2, 3, 4] as WizardStep[]).map((s, i) => (
        <React.Fragment key={s}>
          {i > 0 && (
            <div className={cn('h-px w-6', s <= step ? 'bg-primary' : 'bg-border')} />
          )}
          <button
            type="button"
            onClick={() => { if (s < step) setStep(s); }}
            disabled={s > step}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition-colors',
              s === step && 'bg-primary text-primary-foreground',
              s < step && 'bg-primary/15 text-primary cursor-pointer hover:bg-primary/25',
              s > step && 'bg-muted text-muted-foreground cursor-default',
            )}
          >
            {STEP_ICONS[s]}
            <span className="hidden sm:inline">{STEP_LABELS[s]}</span>
          </button>
        </React.Fragment>
      ))}
    </div>
  );

  // ─── Step 1: Основное ───

  const renderStep1 = () => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
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

      {!initialWidgetType && (
        <WidgetTypePicker value={form.widgetType} onChange={handleWidgetTypeChange} />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

      <div className="grid grid-cols-2 gap-3">
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
        {availableParents.length > 0 && (
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Родительская метрика</label>
            <Select
              value={form.parentId || '__none__'}
              onValueChange={v => updateField('parentId', v === '__none__' ? null : v)}
            >
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Нет" /></SelectTrigger>
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

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Цвет</label>
        <ColorSwatchPicker value={form.color} onChange={c => updateField('color', c)} />
      </div>

      {form.metricType === 'computed' && (
        <FormulaEditor
          value={form.formula}
          onChange={v => updateField('formula', v)}
          metrics={allMetrics}
          currentMetricId={form.id}
        />
      )}

    </div>
  );

  // ─── Step 2: Источник ───

  const renderStep2 = () => (
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
                  // Switching away from computed — reset metricType
                  updates.metricType = 'absolute';
                }
                setForm(prev => ({ ...prev, ...updates }));
              }}
              className={cn(
                'text-xs px-3 py-1.5 rounded-md border transition-colors',
                form.source === src
                  ? 'border-primary bg-primary/10 text-primary font-medium'
                  : 'border-border text-muted-foreground hover:bg-muted/50',
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
        <div className="border rounded-md p-3 text-xs text-muted-foreground">
          Данные вводятся вручную. Плановые значения можно задать на следующем шаге.
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

      {form.source === 'external_api' && (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Коннектор</label>
            <Select
              value={form.dataSourceId || '__none__'}
              onValueChange={v => updateField('dataSourceId', v === '__none__' ? null : v)}
            >
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
    </div>
  );

  // ─── Step 3: Привязка и планы ───

  const renderStep3 = () => (
    <div className="space-y-4">
      {/* Binding mode toggle — for ALL sources */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">
          Привязка к филиалам
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setBindingMode('network')}
            className={cn(
              'flex items-center gap-1.5 text-xs px-3 py-2 rounded-md border transition-colors flex-1',
              bindingMode === 'network'
                ? 'border-primary bg-primary/10 text-primary font-medium'
                : 'border-border text-muted-foreground hover:bg-muted/50'
            )}
          >
            <Globe className="w-3.5 h-3.5" />
            Вся сеть
          </button>
          <button
            type="button"
            onClick={() => setBindingMode('branches')}
            className={cn(
              'flex items-center gap-1.5 text-xs px-3 py-2 rounded-md border transition-colors flex-1',
              bindingMode === 'branches'
                ? 'border-primary bg-primary/10 text-primary font-medium'
                : 'border-border text-muted-foreground hover:bg-muted/50'
            )}
          >
            <Building className="w-3.5 h-3.5" />
            По филиалам
          </button>
        </div>
      </div>

      {/* Branch checkboxes */}
      {bindingMode === 'branches' && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-muted-foreground">
              Выбрано: {selectedBranches.size} из {storeOptions.length}
            </span>
            <button
              type="button"
              onClick={() => toggleAllBranches(selectedBranches.size < storeOptions.length)}
              className="text-[10px] text-primary hover:underline"
            >
              {selectedBranches.size === storeOptions.length ? 'Сбросить все' : 'Выбрать все'}
            </button>
          </div>
          <div className="space-y-1.5">
            {storeOptions.map(s => (
              <label
                key={s.store_id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 cursor-pointer"
              >
                <Checkbox
                  checked={selectedBranches.has(s.store_id)}
                  onCheckedChange={() => toggleBranch(s.store_id)}
                />
                <span className="text-xs">{s.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Field mapping — only for external_api, below branch selection */}
      {isExternalApi && (
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block">
            Маппинг данных
          </label>
          <div className="space-y-2">
            {fieldMappingEditor.mergedMappings.map(({ mapping, isInherited, overrideValues }) => (
              <MergedMappingSection
                key={`${mapping.apiField}_${mapping.entityType}`}
                mapping={mapping}
                isInherited={isInherited}
                overrideValues={overrideValues}
                branches={fieldMappingEditor.branches}
                employees={fieldMappingEditor.employees}
                loadingEmployees={fieldMappingEditor.loadingEmployees}
                departments={fieldMappingEditor.departments}
                loadingDepartments={fieldMappingEditor.loadingDepartments}
                designations={fieldMappingEditor.designations}
                loadingDesignations={fieldMappingEditor.loadingDesignations}
                sourceLabel={fieldMappingEditor.sourceLabel}
                onSetOverride={(entityId, value) => fieldMappingEditor.setOverrideValue(mapping.apiField, mapping.entityType, entityId, value)}
                onClearOverride={(entityId) => fieldMappingEditor.clearOverrideValue(mapping.apiField, mapping.entityType, entityId)}
                onRemoveMapping={() => fieldMappingEditor.removeOverrideMapping(mapping.apiField, mapping.entityType)}
                onAddEmployee={(empId) => fieldMappingEditor.addEmployeeToOverride(mapping.apiField, mapping.entityType, empId)}
              />
            ))}

            {showAddOverride ? (
              <AddOverrideMappingForm
                onAdd={(apiField, entityType, label) => {
                  fieldMappingEditor.addOverrideMapping(apiField, entityType, label);
                  setShowAddOverride(false);
                }}
                onCancel={() => setShowAddOverride(false)}
              />
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs w-full"
                onClick={() => setShowAddOverride(true)}
              >
                <Plus className="w-3 h-3 mr-1" />
                Добавить оверрайд
              </Button>
            )}

            {fieldMappingEditor.mergedMappings.length === 0 && !showAddOverride && (
              <div className="text-center py-4 text-muted-foreground text-xs">
                <p>Нет маппинга полей. Настройте маппинг в источнике данных{fieldMappingEditor.sourceLabel ? ` (${fieldMappingEditor.sourceLabel})` : ''}</p>
                <p className="mt-1">или добавьте оверрайд для этой метрики.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Visible to positions */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">
          Видимость по должностям
        </label>
        <div className="flex gap-1.5 flex-wrap">
          {DASHBOARD_POSITIONS.map(pos => {
            const selected = visibleToPositions.includes(pos.id);
            return (
              <button
                key={pos.id}
                type="button"
                onClick={() => togglePosition(pos.id)}
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
        <p className="text-[10px] text-muted-foreground mt-1">
          Если ничего не выбрано — метрика видна всем
        </p>
      </div>

      {/* V4: Loss/reserve configuration */}
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

      {/* V7: Forecast prediction */}
      <div className="space-y-2 pt-2 border-t">
        <label className="text-xs font-semibold text-muted-foreground block">Прогноз на конец месяца</label>
        <Select value={form.forecastMethod || ''} onValueChange={v => updateField('forecastMethod', v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Авто (по типу метрики)" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Авто (по типу метрики)</SelectItem>
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

      {/* Plan period + pro-rate */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-medium text-muted-foreground mb-1 block">
            Период плана
          </label>
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
          <label className="text-[10px] font-medium text-muted-foreground mb-1 block">
            Метод pro-rate
          </label>
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

      {/* Period selector */}
      <div>
        <label className="text-[10px] font-medium text-muted-foreground mb-1 block">
          Период для значений плана
        </label>
        <div className="flex gap-2">
          <Select value={periodType} onValueChange={v => {
            const pt = v as PeriodType;
            setPeriodType(pt);
            const opts = generatePeriodOptions(pt);
            if (opts.length > 0) setSelectedPeriod(opts[Math.min(3, opts.length - 1)]);
          }}>
            <SelectTrigger className="h-8 text-xs w-[100px] shrink-0"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(PERIOD_TYPE_LABELS) as PeriodType[]).map(pt => (
                <SelectItem key={pt} value={pt}>{PERIOD_TYPE_LABELS[pt]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {periodOptions.map(p => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Plan values */}
      <div>
        <label className="text-[10px] font-medium text-muted-foreground mb-1 block">
          Плановые значения {form.unit && `(${form.unit})`}
        </label>

        {bindingMode === 'branches' && branchesForPlan.length > 1 && (
          <div className="flex gap-2 mb-2">
            <Input
              type="number"
              value={applyAllValue}
              onChange={e => setApplyAllValue(e.target.value)}
              placeholder="Значение для всех"
              className="text-xs h-8 flex-1"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleApplyAll}
              disabled={!applyAllValue}
              className="h-8 text-xs shrink-0"
            >
              Применить ко всем
            </Button>
          </div>
        )}

        {bindingMode === 'network' ? (
          <div className="flex items-center gap-2">
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', SCOPE_COLORS.network)}>
              Сеть
            </span>
            <span className="text-xs flex-1">Вся сеть</span>
            <Input
              type="number"
              value={planValues['*'] || ''}
              onChange={e => updatePlanValue('*', e.target.value)}
              placeholder="0"
              className="text-xs h-8 w-28"
            />
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
            {branchesForPlan.map(s => (
              <div key={s.store_id} className="flex items-center gap-2">
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0', SCOPE_COLORS.branch)}>
                  Филиал
                </span>
                <span className="text-xs flex-1 truncate">{s.name}</span>
                <Input
                  type="number"
                  value={planValues[s.store_id] || ''}
                  onChange={e => updatePlanValue(s.store_id, e.target.value)}
                  placeholder="0"
                  className="text-xs h-8 w-28"
                />
              </div>
            ))}
            {branchesForPlan.length === 0 && (
              <p className="text-[10px] text-muted-foreground text-center py-2">
                Нет выбранных филиалов. Вернитесь на шаг назад.
              </p>
            )}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground mt-2">
          Планы можно настроить позже через кнопку «Планы» в карточке метрики
        </p>
      </div>
    </div>
  );

  // ─── Step 4: Подтверждение ───

  const renderStep4 = () => {
    const positionLabels = visibleToPositions.length > 0
      ? visibleToPositions.map(id => DASHBOARD_POSITIONS.find(p => p.id === id)?.label || id)
      : null;

    const branchLabels = bindingMode === 'network'
      ? ['Вся сеть']
      : Array.from(selectedBranches).map(id => storeOptions.find(s => s.store_id === id)?.name || id);

    const activePlans = Object.entries(planValues).filter(([, v]) => v && parseFloat(v) > 0);

    return (
      <div className="space-y-3">
        {/* Metric info */}
        <div className="border rounded-md p-3 space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: form.color }} />
            <div className="text-xs font-semibold">{form.name}</div>
            <span className="text-[10px] text-muted-foreground font-mono">({form.id})</span>
          </div>
          <div className="flex gap-2 text-[10px] text-muted-foreground flex-wrap">
            <span>{METRIC_TYPE_LABELS[form.metricType]}</span>
            <span>{VALUE_TYPE_LABELS[form.valueType]}</span>
            {form.unit && <span>Ед: {form.unit}</span>}
            <span>{AGGREGATION_LABELS[form.aggregation]}</span>
          </div>
        </div>

        {/* Source */}
        <div className="border rounded-md p-3">
          <div className="text-[10px] font-medium text-muted-foreground mb-1">Источник</div>
          <div className="text-xs">
            {SOURCE_LABELS[form.source]}
            {form.source === 'tracker' && form.trackerCode && (
              <span className="text-muted-foreground ml-1 font-mono">({form.trackerCode})</span>
            )}
            {form.source === 'external_api' && (form.dataSourceId || form.externalUrl) && (
              <span className="text-muted-foreground ml-1 font-mono truncate block">
                {form.dataSourceId
                  ? `${dataSources.find(ds => ds.id === form.dataSourceId)?.label}: ${form.externalPath}`
                  : form.externalUrl
                }
              </span>
            )}
          </div>
        </div>

        {/* Positions */}
        <div className="border rounded-md p-3">
          <div className="text-[10px] font-medium text-muted-foreground mb-1">Должности</div>
          <div className="text-xs">
            {positionLabels
              ? positionLabels.join(', ')
              : <span className="text-muted-foreground">Все должности</span>
            }
          </div>
        </div>

        {/* Branches */}
        <div className="border rounded-md p-3">
          <div className="text-[10px] font-medium text-muted-foreground mb-1">Филиалы</div>
          <div className="text-xs">{branchLabels.join(', ')}</div>
        </div>

        {/* Field mapping summary — only for external_api */}
        {isExternalApi && fieldMappingEditor.mergedMappings.length > 0 && (
          <div className="border rounded-md p-3">
            <div className="text-[10px] font-medium text-muted-foreground mb-1">Маппинг данных</div>
            <div className="text-xs">
              {[
                fieldMappingEditor.countMappedByType('branch') > 0 && `${fieldMappingEditor.countMappedByType('branch')} фил.`,
                fieldMappingEditor.countMappedByType('employee') > 0 && `${fieldMappingEditor.countMappedByType('employee')} сотр.`,
                fieldMappingEditor.countMappedByType('department') > 0 && `${fieldMappingEditor.countMappedByType('department')} отд.`,
                fieldMappingEditor.countMappedByType('designation') > 0 && `${fieldMappingEditor.countMappedByType('designation')} долж.`,
                fieldMappingEditor.countMappedByType('custom') > 0 && `${fieldMappingEditor.countMappedByType('custom')} кастом.`,
              ].filter(Boolean).join(', ') || 'Маппинг настроен'}
            </div>
          </div>
        )}

        {/* Plan settings */}
        <div className="border rounded-md p-3">
          <div className="text-[10px] font-medium text-muted-foreground mb-1">Настройки плана</div>
          <div className="flex gap-4 text-xs">
            <span>Период: {PLAN_PERIOD_LABELS[form.planPeriod]}</span>
            <span>Pro-rate: {PRORATE_METHOD_LABELS[form.planProRateMethod]}</span>
          </div>
        </div>

        {/* Plan values */}
        <div className="border rounded-md p-3">
          <div className="text-[10px] font-medium text-muted-foreground mb-1">
            Плановые значения ({selectedPeriod})
          </div>
          {activePlans.length > 0 ? (
            <div className="space-y-1">
              {activePlans.map(([scopeId, val]) => {
                const label = scopeId === '*'
                  ? 'Вся сеть'
                  : (storeOptions.find(s => s.store_id === scopeId)?.name || scopeId);
                return (
                  <div key={scopeId} className="flex justify-between text-xs">
                    <span>{label}</span>
                    <span className="font-medium">{parseFloat(val).toLocaleString('ru-RU')} {form.unit}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Не заданы</p>
          )}
        </div>
      </div>
    );
  };

  // ─── Footer ───

  const renderFooter = () => (
    <div className="flex justify-between pt-3 border-t">
      <div>
        {step > 1 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setStep((step - 1) as WizardStep)}
            className="h-8 text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Назад
          </Button>
        )}
      </div>
      <div>
        {step < 4 ? (
          <Button
            size="sm"
            onClick={() => setStep((step + 1) as WizardStep)}
            disabled={!canProceed}
            className="h-8 text-xs"
          >
            Далее
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="h-8 text-xs"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
            ) : (
              <Check className="w-3.5 h-3.5 mr-1" />
            )}
            Создать метрику
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-sm">Новая метрика</DialogTitle>
          <DialogDescription className="text-xs">
            {STEP_LABELS[step]} — шаг {step} из 4
          </DialogDescription>
        </DialogHeader>

        {renderStepIndicator()}

        <div className="flex-1 min-h-0 overflow-y-auto pr-2">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </div>

        {renderFooter()}
      </DialogContent>
    </Dialog>
  );
};

export default MetricCreationWizard;

import React, { useState, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { BRANCHES } from '@/data/branchData';
import { getAllBranchesWithStoreIds, normalizeBranchId } from '@/data/branchStoreMapping';
import { internalApiClient } from '@/lib/internalApiClient';
import type { MetricTemplate, PlanPeriod, PlanProRateMethod } from '@/lib/internalApiClient';
import {
  DASHBOARD_POSITIONS,
  PLAN_PERIOD_LABELS,
  PRORATE_METHOD_LABELS,
  SCOPE_COLORS,
  SOURCE_LABELS,
  generatePeriodOptions,
  type PeriodType,
  PERIOD_TYPE_LABELS,
} from './dashboard-constants';
import { MergedMappingSection, AddOverrideMappingForm } from './shared-metric-components';
import { useFieldMappingEditor } from '@/hooks/useFieldMappingEditor';

// ─── Types ───

interface MetricAssignmentWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: MetricTemplate;
  onComplete: () => void;
  onBackToCatalog?: () => void;
}

type WizardStep = 1 | 2 | 3;

const STEP_LABELS: Record<WizardStep, string> = {
  1: 'Назначение',
  2: 'План',
  3: 'Подтверждение',
};

const STEP_ICONS: Record<WizardStep, React.ReactNode> = {
  1: <Users className="w-3.5 h-3.5" />,
  2: <Target className="w-3.5 h-3.5" />,
  3: <Check className="w-3.5 h-3.5" />,
};

// ─── Component ───

const MetricAssignmentWizard: React.FC<MetricAssignmentWizardProps> = ({
  open,
  onOpenChange,
  template,
  onComplete,
  onBackToCatalog,
}) => {
  // Step
  const [step, setStep] = useState<WizardStep>(1);

  // Step 1: Assignment
  const [bindingMode, setBindingMode] = useState<'network' | 'branches'>('branches');
  const [selectedBranches, setSelectedBranches] = useState<Set<string>>(
    () => new Set(BRANCHES.map(b => b.id))
  );
  const [visibleToPositions, setVisibleToPositions] = useState<string[]>([]);
  const [showAddOverride, setShowAddOverride] = useState(false);

  // Step 2: Plans
  const [planPeriod, setPlanPeriod] = useState<PlanPeriod>('month');
  const [planProRateMethod, setPlanProRateMethod] = useState<PlanProRateMethod>('working_days');
  const [periodType, setPeriodType] = useState<PeriodType>('month');
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [planValues, setPlanValues] = useState<Record<string, string>>({});
  const [applyAllValue, setApplyAllValue] = useState('');

  // Submission
  const [isSubmitting, setIsSubmitting] = useState(false);

  const periodOptions = useMemo(() => generatePeriodOptions(periodType), [periodType]);

  const unit = template.config.unit || '';

  // ─── Step 1 handlers ───

  const toggleBranch = useCallback((branchId: string) => {
    setSelectedBranches(prev => {
      const next = new Set(prev);
      if (next.has(branchId)) next.delete(branchId);
      else next.add(branchId);
      return next;
    });
  }, []);

  const toggleAllBranches = useCallback((checked: boolean) => {
    setSelectedBranches(checked ? new Set(BRANCHES.map(b => b.id)) : new Set());
  }, []);

  const togglePosition = useCallback((posId: string) => {
    setVisibleToPositions(prev =>
      prev.includes(posId) ? prev.filter(p => p !== posId) : [...prev, posId]
    );
  }, []);

  const isExternalApi = template.config.source === 'external_api';

  const fieldMappingEditor = useFieldMappingEditor({
    active: open && isExternalApi,
    dataSourceId: template.config?.dataSourceId || null,
    source: template.config?.source || '',
    initialFieldMappings: [],
  });

  // ─── Step 2 handlers ───

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

  // ─── Submission ───

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    try {
      // Build base bindings from user branch selection
      const baseBindings = bindingMode === 'network'
        ? [{ scope: 'network' as const, scopeId: '*', enabled: true }]
        : Array.from(selectedBranches).map(id => {
            const storeId = normalizeBranchId(id);
            return {
              scope: 'branch' as const,
              scopeId: storeId,
              enabled: true,
            };
          });

      // For external_api: merge with mapping-derived bindings (employee, etc.)
      let bindings = baseBindings;
      if (isExternalApi) {
        const mappingBindings = fieldMappingEditor.deriveBindingsFromMappings();
        const seen = new Set(baseBindings.map(b => `${b.scope}:${b.scopeId}`));
        bindings = [...baseBindings, ...mappingBindings.filter(b => !seen.has(`${b.scope}:${b.scopeId}`))];
      }

      // Build fieldMappings from field mapping editor (for external_api metrics)
      const fieldMappings = isExternalApi ? fieldMappingEditor.getCleanOverrides() : [];

      // 1. Create the metric
      await internalApiClient.createDashboardMetric({
        id: template.templateId,
        name: template.name,
        enabled: true,
        color: '#3B82F6',
        ...template.config,
        visibleToPositions,
        bindings,
        fieldMappings,
        planPeriod,
        planProRateMethod,
      });

      // 2. Create plans if values were entered (normalize branch IDs)
      const planEntries = Object.entries(planValues)
        .filter(([, val]) => val && parseFloat(val) > 0)
        .map(([scopeId, val]) => ({
          metricId: template.templateId,
          scope: scopeId === '*' ? ('network' as const) : ('branch' as const),
          scopeId: scopeId === '*' ? '*' : normalizeBranchId(scopeId),
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

      toast.success(`Метрика "${template.name}" создана и настроена`);
      onComplete();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка создания метрики');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    bindingMode, selectedBranches, visibleToPositions, planPeriod, isExternalApi,
    planProRateMethod, planValues, selectedPeriod, template, onComplete, onOpenChange, fieldMappingEditor,
  ]);

  // ─── Render helpers ───

  const branchesForPlan = useMemo(() => {
    if (bindingMode === 'network') return [];
    return BRANCHES.filter(b => selectedBranches.has(b.id));
  }, [bindingMode, selectedBranches]);

  const hasPlanValues = useMemo(() => {
    return Object.values(planValues).some(v => v && parseFloat(v) > 0);
  }, [planValues]);

  // ─── Step Indicator ───

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-1 mb-4">
      {([1, 2, 3] as WizardStep[]).map((s, i) => (
        <React.Fragment key={s}>
          {i > 0 && (
            <div className={cn(
              'h-px w-6',
              s <= step ? 'bg-primary' : 'bg-border'
            )} />
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

  // ─── Step 1: Assignment ───

  const renderStep1 = () => (
    <div className="space-y-4">
      {/* Binding mode toggle */}
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
              Выбрано: {selectedBranches.size} из {BRANCHES.length}
            </span>
            <button
              type="button"
              onClick={() => toggleAllBranches(selectedBranches.size < BRANCHES.length)}
              className="text-[10px] text-primary hover:underline"
            >
              {selectedBranches.size === BRANCHES.length ? 'Сбросить все' : 'Выбрать все'}
            </button>
          </div>
          <div className="space-y-1.5">
            {BRANCHES.map(b => (
              <label
                key={b.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 cursor-pointer"
              >
                <Checkbox
                  checked={selectedBranches.has(b.id)}
                  onCheckedChange={() => toggleBranch(b.id)}
                />
                <span className="text-xs">{b.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* External API: Field Mapping section (additional, below branch selection) */}
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
    </div>
  );

  // ─── Step 2: Plan Settings ───

  const renderStep2 = () => (
    <div className="space-y-4">
      {/* Period & Pro-rate selects */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-medium text-muted-foreground mb-1 block">
            Период плана
          </label>
          <Select value={planPeriod} onValueChange={v => setPlanPeriod(v as PlanPeriod)}>
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
          <Select value={planProRateMethod} onValueChange={v => setPlanProRateMethod(v as PlanProRateMethod)}>
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
          Плановые значения {unit && `(${unit})`}
        </label>

        {/* Apply to all */}
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
            {branchesForPlan.map(b => (
              <div key={b.id} className="flex items-center gap-2">
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0', SCOPE_COLORS.branch)}>
                  Филиал
                </span>
                <span className="text-xs flex-1 truncate">{b.name}</span>
                <Input
                  type="number"
                  value={planValues[b.id] || ''}
                  onChange={e => updatePlanValue(b.id, e.target.value)}
                  placeholder="0"
                  className="text-xs h-8 w-28"
                />
              </div>
            ))}
            {branchesForPlan.length === 0 && (
              <p className="text-[10px] text-muted-foreground text-center py-2">
                Нет выбранных филиалов. Вернитесь на шаг 1.
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

  // ─── Step 3: Confirmation ───

  const renderStep3 = () => {
    const positionLabels = visibleToPositions.length > 0
      ? visibleToPositions.map(id => DASHBOARD_POSITIONS.find(p => p.id === id)?.label || id)
      : null;

    const branchLabels = bindingMode === 'network'
      ? ['Вся сеть']
      : Array.from(selectedBranches).map(id => BRANCHES.find(b => b.id === id)?.name || id);

    const activePlans = Object.entries(planValues).filter(([, v]) => v && parseFloat(v) > 0);

    return (
      <div className="space-y-3">
        {/* Metric info */}
        <div className="border rounded-md p-3 space-y-1.5">
          <div className="text-xs font-semibold">{template.name}</div>
          <div className="flex gap-2 text-[10px] text-muted-foreground">
            <span>Источник: {SOURCE_LABELS[template.config.source] || template.config.source}</span>
            {unit && <span>Единица: {unit}</span>}
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

        {/* Mapping (external_api only) */}
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
              ].filter(Boolean).join(', ') || 'Значения из источника данных'}
            </div>
          </div>
        )}

        {/* Plan settings */}
        <div className="border rounded-md p-3">
          <div className="text-[10px] font-medium text-muted-foreground mb-1">Настройки плана</div>
          <div className="flex gap-4 text-xs">
            <span>Период: {PLAN_PERIOD_LABELS[planPeriod]}</span>
            <span>Pro-rate: {PRORATE_METHOD_LABELS[planProRateMethod]}</span>
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
                  : (BRANCHES.find(b => b.id === scopeId)?.name || scopeId);
                return (
                  <div key={scopeId} className="flex justify-between text-xs">
                    <span>{label}</span>
                    <span className="font-medium">{parseFloat(val).toLocaleString('ru-RU')} {unit}</span>
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

  // ─── Footer navigation ───

  const renderFooter = () => (
    <div className="flex justify-between pt-3 border-t">
      <div>
        {step === 1 && onBackToCatalog && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onBackToCatalog}
            className="h-8 text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            В каталог
          </Button>
        )}
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
        {step < 3 ? (
          <Button
            size="sm"
            onClick={() => setStep((step + 1) as WizardStep)}
            disabled={step === 1 && bindingMode === 'branches' && selectedBranches.size === 0}
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
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-sm">Настройка метрики</DialogTitle>
          <DialogDescription className="text-xs truncate">
            {template.name}
          </DialogDescription>
        </DialogHeader>

        {renderStepIndicator()}

        <div className="flex-1 overflow-y-auto pr-1">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </div>

        {renderFooter()}
      </DialogContent>
    </Dialog>
  );
};

export default MetricAssignmentWizard;

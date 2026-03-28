import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSetPlan } from '@/hooks/useSetPlan';
import { internalApiClient, type DashboardMetricConfig, type StoreOption } from '@/lib/internalApiClient';
import { AlertCircle, Check, Divide, Equal, Loader2, Pencil, Users } from 'lucide-react';
import { DailyFactCards } from './DailyFactCards';

/* ── Types ── */

type DistributionStrategy = 'divide' | 'replicate' | 'manual';
type SheetTab = 'plan' | 'fact';

interface SetPlanSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metrics: DashboardMetricConfig[];
  branches: StoreOption[];
  defaultBranchId?: string;
  /** true if user can set plans (leader only) */
  canSetPlan: boolean;
  /** Pre-select metric when opening from PlanFactTable */
  defaultMetricId?: string;
  /** Pre-select period */
  defaultPeriod?: string;
  /** Simplified one-step mode: metric/branch/period shown as text, allows editing existing plan */
  simplified?: boolean;
}

interface ManagerInfo {
  employee_id: string;
  employee_name: string;
}

/* ── Helpers ── */

function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatNumber(n: number): string {
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
}

/** Format a raw numeric string with space separators: "1234567.89" → "1 234 567.89" */
function formatWithSpaces(raw: string): string {
  if (!raw) return '';
  const [intPart, decPart] = raw.split('.');
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return decPart !== undefined ? `${formatted}.${decPart}` : formatted;
}

/** Strip spaces from formatted string: "1 234 567" → "1234567" */
function stripSpaces(s: string): string {
  return s.replace(/\s/g, '');
}

/** Number input that displays digit grouping with spaces */
function FormattedNumberInput({
  value, onChange, disabled, className, placeholder,
}: {
  value: string;
  onChange: (raw: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}) {
  const [displayValue, setDisplayValue] = useState(formatWithSpaces(value));
  const [focused, setFocused] = useState(false);

  // Sync display when value changes externally (not during editing)
  useEffect(() => {
    if (!focused) {
      setDisplayValue(formatWithSpaces(value));
    }
  }, [value, focused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    // Allow only digits, spaces, dots, minus
    const cleaned = input.replace(/[^\d\s.\-]/g, '');
    const raw = stripSpaces(cleaned);
    // Validate it's a valid number pattern
    if (raw === '' || raw === '-' || /^-?\d*\.?\d*$/.test(raw)) {
      setDisplayValue(formatWithSpaces(raw));
      onChange(raw);
    }
  };

  return (
    <Input
      type="text"
      inputMode="decimal"
      placeholder={placeholder || '0'}
      value={displayValue}
      onChange={handleChange}
      onFocus={() => setFocused(true)}
      onBlur={() => { setFocused(false); setDisplayValue(formatWithSpaces(value)); }}
      disabled={disabled}
      className={className}
    />
  );
}

function getInitials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');
}

function distributeEvenly(total: number, count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor((total / count) * 100) / 100;
  const remainder = Math.round((total - base * count) * 100) / 100;
  return Array.from({ length: count }, (_, i) => (i === count - 1 ? base + remainder : base));
}

function getDefaultStrategy(metric: DashboardMetricConfig | undefined): DistributionStrategy {
  if (!metric) return 'divide';
  if (metric.metricType === 'absolute') return 'divide';
  return 'replicate';
}

const STRATEGY_INFO: Record<DistributionStrategy, { label: string; description: string; icon: typeof Divide }> = {
  divide: { label: 'Поровну по всем', description: 'Общий план филиала делится между менеджерами', icon: Divide },
  replicate: { label: 'Одинаковый для каждого', description: 'Каждый менеджер получает тот же план', icon: Equal },
  manual: { label: 'Ручная настройка', description: 'Индивидуальный план для каждого сотрудника', icon: Pencil },
};

/* ── Shared select fields ── */

function MetricSelect({ value, onChange, metrics }: { value: string; onChange: (v: string) => void; metrics: DashboardMetricConfig[] }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground">Метрика</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-10 rounded-xl">
          <SelectValue placeholder="Выберите метрику" />
        </SelectTrigger>
        <SelectContent>
          {metrics.map(m => (
            <SelectItem key={m.id} value={m.id}>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: m.color || '#3b82f6' }} />
                {m.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function BranchSelect({ value, onChange, branches }: { value: string; onChange: (v: string) => void; branches: StoreOption[] }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground">Филиал</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-10 rounded-xl">
          <SelectValue placeholder="Выберите филиал" />
        </SelectTrigger>
        <SelectContent>
          {branches.map(b => (
            <SelectItem key={b.store_id} value={b.store_id}>{b.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function PeriodInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground">Период</label>
      <Input type="month" value={value} min={currentPeriod()} onChange={(e) => onChange(e.target.value)} className="h-10 rounded-xl" />
    </div>
  );
}

/* ── Main component ── */

export function SetPlanSheet({
  open,
  onOpenChange,
  metrics,
  branches,
  defaultBranchId,
  canSetPlan,
  defaultMetricId,
  defaultPeriod,
  simplified,
}: SetPlanSheetProps) {
  const {
    checkExistingPlan, fetchBranchManagers,
    submit, isSubmitting,
  } = useSetPlan();

  const defaultTab: SheetTab = canSetPlan ? 'plan' : 'fact';
  const [activeTab, setActiveTab] = useState<SheetTab>(defaultTab);

  // ── Shared state ──
  const [metricId, setMetricId] = useState('');
  const [branchId, setBranchId] = useState(defaultBranchId || '');
  const [period, setPeriod] = useState(currentPeriod);

  // ── Plan state ──
  const [planValue, setPlanValue] = useState('');
  const [managers, setManagers] = useState<ManagerInfo[]>([]);
  const [managersLoading, setManagersLoading] = useState(false);
  const [existingPlan, setExistingPlan] = useState<number | null>(null);
  const [checkingPlan, setCheckingPlan] = useState(false);
  const [planSubmitted, setPlanSubmitted] = useState(false);
  const [strategy, setStrategy] = useState<DistributionStrategy>('divide');
  const [manualValues, setManualValues] = useState<Record<string, string>>({});


  // Reset on open
  useEffect(() => {
    if (open) {
      setActiveTab(canSetPlan ? 'plan' : 'fact');
      setMetricId(defaultMetricId || '');
      setBranchId(defaultBranchId || '');
      setPeriod(defaultPeriod || currentPeriod());
      setPlanValue('');
      setManagers([]);
      setExistingPlan(null);
      setPlanSubmitted(false);
      setManualValues({});
      // Strategy will be set when metric changes
    }
  }, [open, defaultBranchId, defaultMetricId, defaultPeriod, canSetPlan]);

  // ── Plan: fetch managers ──
  useEffect(() => {
    if (!branchId) { setManagers([]); return; }
    let cancelled = false;
    setManagersLoading(true);
    fetchBranchManagers(branchId)
      .then((emps) => { if (!cancelled) setManagers(emps.map(e => ({ employee_id: e.employee_id, employee_name: e.employee_name }))); })
      .catch(() => { if (!cancelled) setManagers([]); })
      .finally(() => { if (!cancelled) setManagersLoading(false); });
    return () => { cancelled = true; };
  }, [branchId]);

  // ── Plan: check existing ──
  useEffect(() => {
    if (!metricId || !branchId || !period) { setExistingPlan(null); return; }
    let cancelled = false;
    setCheckingPlan(true);
    checkExistingPlan(metricId, period, branchId)
      .then((plan) => {
        if (cancelled) return;
        const val = plan ? plan.planValue : null;
        setExistingPlan(val);
        // In simplified mode, pre-fill the input with existing plan value
        if (simplified && val != null && !planValue) {
          setPlanValue(String(val));
        }
      })
      .catch(() => { if (!cancelled) setExistingPlan(null); })
      .finally(() => { if (!cancelled) setCheckingPlan(false); });
    return () => { cancelled = true; };
  }, [metricId, branchId, period]);

  // ── Plan: derived ──
  const selectedMetric = metrics.find(m => m.id === metricId);
  const unitLabel = selectedMetric?.unit || '';
  const metricColor = selectedMetric?.color || '#3b82f6';
  const numPlanValue = parseFloat(planValue);
  const hasPlanValue = !isNaN(numPlanValue) && numPlanValue > 0;

  // Set default strategy when metric changes
  useEffect(() => {
    setStrategy(getDefaultStrategy(selectedMetric));
    setManualValues({});
  }, [selectedMetric?.id]);

  const isManualValid = strategy === 'manual'
    ? managers.length > 0 && managers.every(m => {
        const v = parseFloat(manualValues[m.employee_id] || '');
        return !isNaN(v) && v >= 0;
      })
    : true;

  const isPlanValid = metricId && branchId && period
    && (strategy === 'manual' ? isManualValid : hasPlanValue)
    && (simplified || existingPlan === null);

  const strategyInfo = STRATEGY_INFO[strategy];
  const StrategyIcon = strategyInfo.icon;

  const managerValues = useMemo(() => {
    if (strategy === 'manual') {
      return managers.map(m => parseFloat(manualValues[m.employee_id] || '0') || 0);
    }
    if (!hasPlanValue || managers.length === 0) return [];
    return strategy === 'replicate' ? managers.map(() => numPlanValue) : distributeEvenly(numPlanValue, managers.length);
  }, [managers.length, numPlanValue, hasPlanValue, strategy, manualValues]);

  const handlePlanSubmit = useCallback(async () => {
    if (!isPlanValid) return;
    try {
      if (strategy === 'manual') {
        // Manual: submit individual employee plans + branch total
        const manualEntries = managers.map(m => ({
          metricId,
          scope: 'employee' as const,
          scopeId: m.employee_id,
          period,
          planValue: parseFloat(manualValues[m.employee_id] || '0') || 0,
        }));
        const branchTotal = manualEntries.reduce((sum, e) => sum + e.planValue, 0);
        await internalApiClient.bulkCreateMetricPlans([
          { metricId, scope: 'branch', scopeId: branchId, period, planValue: branchTotal },
          ...manualEntries,
        ]);
        setPlanSubmitted(true);
      } else {
        await submit({ metricId, branchId, period, planValue: numPlanValue, managerIds: managers.map(m => m.employee_id), strategy: strategy as 'divide' | 'replicate' });
        setPlanSubmitted(true);
      }
    } catch { /* mutation handles */ }
  }, [isPlanValid, metricId, branchId, period, numPlanValue, managers, submit, strategy, manualValues]);

  // ── Fact: derived ──
  const selectedBranch = branches.find(b => b.store_id === branchId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[480px] flex flex-col p-0 gap-0 overflow-hidden">
        <div className="px-4 pt-4 pb-1 shrink-0">
          <SheetHeader>
            <SheetTitle className="text-sm">
              {simplified ? 'Установить план' : canSetPlan ? 'План и факт' : 'Ввод факта'}
            </SheetTitle>
            <SheetDescription className="text-xs leading-tight">
              {simplified
                ? (selectedMetric ? `${selectedMetric.name}${unitLabel ? ` (${unitLabel})` : ''}` : 'Введите значение плана')
                : canSetPlan
                  ? 'Установите план или внесите фактические данные'
                  : 'Внесите фактические данные по ручным метрикам'
              }
            </SheetDescription>
          </SheetHeader>
        </div>

        {/* Tab switcher — only for leaders who have both tabs, hidden in simplified mode */}
        {canSetPlan && !simplified && (
          <div className="px-4 pb-1 shrink-0">
            <div className="flex rounded-xl bg-muted p-1 gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('plan')}
                className={`flex-1 text-sm font-medium py-2 rounded-lg transition-colors ${
                  activeTab === 'plan'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                План
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('fact')}
                className={`flex-1 text-sm font-medium py-2 rounded-lg transition-colors ${
                  activeTab === 'fact'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Факт
              </button>
            </div>
          </div>
        )}

        {/* Tab content */}
        <div className="flex-1 flex flex-col min-h-0">
          {activeTab === 'plan' && canSetPlan && (
            planSubmitted ? (
              <PlanSuccessContent
                metric={selectedMetric} numValue={numPlanValue} unitLabel={unitLabel}
                branch={selectedBranch} managers={managers} managerValues={managerValues}
                strategyInfo={strategyInfo} onClose={() => onOpenChange(false)}
              />
            ) : (
              <PlanFormContent
                metrics={metrics} branches={branches}
                metricId={metricId} setMetricId={setMetricId}
                branchId={branchId} setBranchId={setBranchId}
                period={period} setPeriod={setPeriod}
                planValue={planValue} setPlanValue={setPlanValue}
                selectedMetric={selectedMetric} unitLabel={unitLabel} metricColor={metricColor}
                strategy={strategy} setStrategy={setStrategy} strategyInfo={strategyInfo} StrategyIcon={StrategyIcon}
                existingPlan={existingPlan} checkingPlan={checkingPlan}
                managers={managers} managersLoading={managersLoading}
                managerValues={managerValues} numValue={numPlanValue} hasValue={hasPlanValue}
                manualValues={manualValues} setManualValues={setManualValues}
                isValid={!!isPlanValid} isSubmitting={isSubmitting}
                onSubmit={handlePlanSubmit}
                simplified={simplified}
              />
            )
          )}

          {activeTab === 'fact' && (
            <DailyFactCards
              metrics={metrics}
              branches={branches}
              defaultBranchId={branchId || defaultBranchId || ''}
              onClose={() => onOpenChange(false)}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ── Plan form ── */

function PlanFormContent({
  metrics, branches,
  metricId, setMetricId, branchId, setBranchId, period, setPeriod,
  planValue, setPlanValue,
  selectedMetric, unitLabel, metricColor,
  strategy, setStrategy, strategyInfo, StrategyIcon,
  existingPlan, checkingPlan,
  managers, managersLoading, managerValues, numValue, hasValue,
  manualValues, setManualValues,
  isValid, isSubmitting, onSubmit,
  simplified,
}: {
  metrics: DashboardMetricConfig[]; branches: StoreOption[];
  metricId: string; setMetricId: (v: string) => void;
  branchId: string; setBranchId: (v: string) => void;
  period: string; setPeriod: (v: string) => void;
  planValue: string; setPlanValue: (v: string) => void;
  selectedMetric: DashboardMetricConfig | undefined; unitLabel: string; metricColor: string;
  strategy: DistributionStrategy;
  setStrategy: (s: DistributionStrategy) => void;
  strategyInfo: typeof STRATEGY_INFO[DistributionStrategy];
  StrategyIcon: typeof Divide;
  existingPlan: number | null; checkingPlan: boolean;
  managers: ManagerInfo[]; managersLoading: boolean;
  managerValues: number[]; numValue: number; hasValue: boolean;
  manualValues: Record<string, string>; setManualValues: (v: Record<string, string>) => void;
  isValid: boolean; isSubmitting: boolean; onSubmit: () => void;
  simplified?: boolean;
}) {
  const selectedBranchName = branches.find(b => b.store_id === branchId)?.name;
  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 space-y-3 py-3">
        {simplified ? (
          /* Simplified mode: read-only context info */
          <div className="space-y-2">
            {selectedBranchName && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{selectedBranchName}</span>
                <span>·</span>
                <span>{period}</span>
              </div>
            )}
          </div>
        ) : (
          /* Full mode: selectors */
          <>
            <MetricSelect value={metricId} onChange={setMetricId} metrics={metrics} />
            <BranchSelect value={branchId} onChange={setBranchId} branches={branches} />
            <PeriodInput value={period} onChange={setPeriod} />
          </>
        )}

        {selectedMetric && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Распределение плана</label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['replicate', 'divide', 'manual'] as DistributionStrategy[]).map(s => {
                const info = STRATEGY_INFO[s];
                const Icon = info.icon;
                const active = strategy === s;
                const activeStyles: Record<DistributionStrategy, string> = {
                  replicate: 'bg-violet-50/60 border-violet-300 dark:bg-violet-950/20 dark:border-violet-700',
                  divide: 'bg-blue-50/60 border-blue-300 dark:bg-blue-950/20 dark:border-blue-700',
                  manual: 'bg-amber-50/60 border-amber-300 dark:bg-amber-950/20 dark:border-amber-700',
                };
                const iconStyles: Record<DistributionStrategy, string> = {
                  replicate: 'text-violet-600 dark:text-violet-400',
                  divide: 'text-blue-600 dark:text-blue-400',
                  manual: 'text-amber-600 dark:text-amber-400',
                };
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStrategy(s)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl p-2.5 text-center transition-all border ${
                      active ? activeStyles[s] : 'bg-muted/30 border-transparent hover:bg-muted/60'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${active ? iconStyles[s] : 'text-muted-foreground'}`} />
                    <span className={`text-[10px] leading-tight font-medium ${active ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {info.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground">{strategyInfo.description}</p>
          </div>
        )}

        {checkingPlan && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
            <Loader2 className="h-3 w-3 animate-spin" />Проверяю наличие плана…
          </div>
        )}
        {existingPlan !== null && !checkingPlan && !simplified && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-800 dark:bg-amber-950/20">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-amber-800 dark:text-amber-300">План уже установлен</p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5 tabular-nums">
                  Текущее значение: {formatNumber(existingPlan)} {unitLabel}
                </p>
              </div>
            </div>
          </div>
        )}

        {strategy !== 'manual' && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              {strategy === 'divide' ? 'Общий план филиала' : 'Целевое значение'}
              {simplified && existingPlan !== null && (
                <span className="text-muted-foreground/60 ml-1">(текущий: {formatNumber(existingPlan)})</span>
              )}
            </label>
            <div className="relative">
              <FormattedNumberInput
                value={planValue}
                onChange={setPlanValue}
                disabled={!simplified && existingPlan !== null}
                className="h-11 rounded-xl text-lg font-semibold tabular-nums pr-14 pl-4"
              />
              {unitLabel && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">{unitLabel}</span>}
            </div>
          </div>
        )}

        {branchId && (
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2.5 bg-muted/40 border-b">
              <div className="flex items-center gap-1.5 text-xs font-medium">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />Распределение по менеджерам
              </div>
              {managers.length > 0 && (hasValue || strategy === 'manual') && (
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {strategy === 'manual'
                    ? `${managers.length} чел.`
                    : strategy === 'divide'
                      ? `${formatNumber(numValue)} / ${managers.length} чел.`
                      : `${formatNumber(numValue)} × ${managers.length} чел.`
                  }
                </span>
              )}
            </div>
            <div className="p-2">
              {managersLoading ? (
                <div className="flex flex-col gap-2 p-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-muted animate-pulse" />
                      <div className="flex-1 h-3 rounded bg-muted animate-pulse" />
                      <div className="w-16 h-3 rounded bg-muted animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : managers.length === 0 ? (
                <div className="flex items-center gap-2 p-3 text-xs text-amber-600 dark:text-amber-400">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />Нет менеджеров — план только на уровне филиала
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {managers.map((mgr, i) => {
                    const share = managerValues[i] ?? 0;
                    const manualTotal = strategy === 'manual' ? managerValues.reduce((s, v) => s + v, 0) : 0;
                    const barPct = strategy === 'manual'
                      ? (manualTotal > 0 ? Math.round((share / manualTotal) * 100) : 0)
                      : strategy === 'divide' && numValue > 0
                        ? Math.round((share / numValue) * 100)
                        : (hasValue ? 100 : 0);
                    return (
                      <div key={mgr.employee_id} className="flex items-center gap-2.5 px-2 py-2 first:pt-1 last:pb-1">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-medium text-primary">{getInitials(mgr.employee_name)}</span>
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <span className="text-xs font-medium text-foreground truncate block">{mgr.employee_name}</span>
                          {(hasValue || strategy === 'manual') && share > 0 && (
                            <div className="h-1 rounded-full bg-muted/50 overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${barPct}%`, backgroundColor: metricColor }} />
                            </div>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          {strategy === 'manual' ? (
                            <FormattedNumberInput
                              value={manualValues[mgr.employee_id] || ''}
                              onChange={(v) => setManualValues({ ...manualValues, [mgr.employee_id]: v })}
                              className="w-28 h-8 text-xs text-right tabular-nums rounded-lg"
                            />
                          ) : hasValue ? (
                            <span className="text-xs font-medium tabular-nums">
                              {formatNumber(share)} <span className="text-muted-foreground font-normal">{unitLabel}</span>
                            </span>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {managers.length > 0 && (hasValue || strategy === 'manual') && (
              <div className="flex items-center justify-between px-3 py-2 bg-muted/40 border-t text-xs">
                <span className="text-muted-foreground font-medium">
                  {strategy === 'manual' ? 'Итого' : strategy === 'divide' ? 'Итого' : 'Каждому'}
                </span>
                <span className="font-semibold tabular-nums">
                  {strategy === 'manual'
                    ? `${formatNumber(managerValues.reduce((s, v) => s + v, 0))} ${unitLabel}`
                    : `${formatNumber(numValue)} ${unitLabel}`
                  }
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t bg-background shrink-0">
        <Button className="w-full h-10 rounded-xl text-sm font-medium" disabled={!isValid || isSubmitting} onClick={onSubmit}>
          {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Сохраняю…</> : (simplified && existingPlan !== null ? 'Обновить план' : 'Поставить план')}
        </Button>
      </div>
    </>
  );
}

/* ── Plan success with manager distribution ── */

function PlanSuccessContent({
  metric, numValue, unitLabel, branch, managers, managerValues, strategyInfo, onClose,
}: {
  metric: DashboardMetricConfig | undefined; numValue: number; unitLabel: string;
  branch: StoreOption | undefined;
  managers: ManagerInfo[]; managerValues: number[];
  strategyInfo: typeof STRATEGY_INFO[DistributionStrategy];
  onClose: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
      <div className="rounded-full bg-emerald-50 p-4 dark:bg-emerald-950/30">
        <Check className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-semibold">План установлен</p>
        <p className="text-xs text-muted-foreground">{metric?.name} — {formatNumber(numValue)} {unitLabel}</p>
        {branch && <p className="text-xs text-muted-foreground">{branch.name}</p>}
      </div>
      {managers.length > 0 && (
        <div className="w-full rounded-xl border bg-card shadow-sm overflow-hidden mt-2">
          <div className="flex items-center justify-between px-3 py-2 bg-muted/40 border-b">
            <span className="text-[10px] text-muted-foreground">{strategyInfo.label}</span>
            <span className="text-[10px] font-medium tabular-nums">{managers.length} чел.</span>
          </div>
          <div className="p-2 space-y-1">
            {managers.map((mgr, i) => (
              <div key={mgr.employee_id} className="flex items-center gap-2 px-1 py-0.5">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-[9px] font-medium text-primary">{getInitials(mgr.employee_name)}</span>
                </div>
                <span className="text-xs truncate flex-1">{mgr.employee_name}</span>
                <span className="text-xs font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatNumber(managerValues[i] ?? 0)} {unitLabel}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      <Button variant="outline" size="sm" className="mt-3 rounded-full px-6" onClick={onClose}>Закрыть</Button>
    </div>
  );
}


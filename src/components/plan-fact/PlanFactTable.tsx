import { useMemo, useState, useRef, useCallback, useEffect, Fragment } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ClipboardEdit, TrendingUp, Cloud, Loader2, Check, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { CoverageCell } from '@/hooks/usePlanFactDashboard';
import type { DashboardMetricConfig } from '@/lib/internalApiClient';
import type { ManagerEntry } from '@/hooks/useManagerBreakdown';
import { internalApiClient } from '@/lib/internalApiClient';
import { fmtNum, completionColor, completionTextClass, completionDotClass, completionBgClass } from '@/lib/planFactUtils';
import { cn } from '@/lib/utils';

/** Format a raw numeric string with space separators: "1234567.89" → "1 234 567.89" */
function formatWithSpaces(raw: string): string {
  if (!raw) return '';
  const [intPart, decPart] = raw.split('.');
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return decPart !== undefined ? `${formatted}.${decPart}` : formatted;
}

interface PlanFactTableProps {
  metrics: DashboardMetricConfig[];
  coverageMatrix: Map<string, Map<string, CoverageCell>>;
  selectedBranchId: string;
  allBranchIds: string[];
  canSetPlan: boolean;
  onPlanClick: (metricId: string) => void;
  period: string;
  /** Per-metric manager breakdown: metricId → { managers: [...] } */
  managerData?: Record<string, { managers: ManagerEntry[] }>;
  managerDataLoading?: boolean;
}

function SourceBadge({ source }: { source: string }) {
  const config: Record<string, { icon: typeof TrendingUp; label: string; color: string }> = {
    tracker: { icon: TrendingUp, label: 'трекер', color: 'text-blue-500 dark:text-blue-400' },
    external_api: { icon: Cloud, label: 'внешний API', color: 'text-cyan-500 dark:text-cyan-400' },
    computed: { icon: TrendingUp, label: 'формула', color: 'text-violet-500 dark:text-violet-400' },
    manual: { icon: ClipboardEdit, label: 'вручную', color: 'text-amber-500 dark:text-amber-400' },
  };
  const c = config[source] || config.manual;
  const Icon = c.icon;
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-[9px] shrink-0', c.color)}>
      {source === 'computed'
        ? <span className="font-mono leading-none">f(x)</span>
        : <Icon className="w-2.5 h-2.5" />
      }
      <span>{c.label}</span>
    </span>
  );
}

/** Inline editable fact cell for manual metrics */
function InlineFactInput({ metricId, period, storeId, value, onSaved }: {
  metricId: string; period: string; storeId: string; value: number; onSaved: () => void;
}) {
  const [rawValue, setRawValue] = useState(value ? String(value) : '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [focused, setFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!focused) setRawValue(value ? String(value) : '');
  }, [value, focused]);

  const doSave = useCallback((val: number) => {
    setSaving(true);
    internalApiClient.saveManualData(metricId, { period, fact: val, plan: 0, storeId })
      .then(() => { setSaving(false); setSaved(true); onSaved(); setTimeout(() => setSaved(false), 1500); })
      .catch(() => setSaving(false));
  }, [metricId, period, storeId, onSaved]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const stripped = e.target.value.replace(/\s/g, '');
    if (stripped === '' || /^-?\d*\.?\d*$/.test(stripped)) {
      setRawValue(stripped);
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => doSave(parseFloat(stripped) || 0), 800);
    }
  }, [doSave]);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  return (
    <div className="relative">
      <Input
        type="text"
        inputMode="decimal"
        value={focused ? rawValue : formatWithSpaces(rawValue)}
        onChange={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="—"
        className={cn(
          'h-7 text-xs text-right px-2 w-[90px] border-transparent bg-transparent hover:bg-muted/50 focus:bg-background focus:border-border transition-colors',
          saving && 'border-primary/40',
          saved && !saving && 'border-green-400/40',
        )}
      />
      {saving && <Loader2 className="absolute right-1 top-1.5 w-3 h-3 animate-spin text-primary/60" />}
      {saved && !saving && <Check className="absolute right-1 top-1.5 w-3 h-3 text-green-500" />}
    </div>
  );
}

/** Inline editable plan cell for per-employee plan editing */
function InlinePlanInput({ metricId, period, employeeId, value, onSaved }: {
  metricId: string; period: string; employeeId: string; value: number | null; onSaved: () => void;
}) {
  const [rawValue, setRawValue] = useState(value != null ? String(value) : '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [focused, setFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!focused) setRawValue(value != null ? String(value) : '');
  }, [value, focused]);

  const doSave = useCallback((val: number) => {
    setSaving(true);
    internalApiClient.bulkCreateMetricPlans([{
      metricId,
      scope: 'employee',
      scopeId: employeeId,
      period,
      planValue: val,
    }])
      .then(() => { setSaving(false); setSaved(true); onSaved(); setTimeout(() => setSaved(false), 1500); })
      .catch(() => setSaving(false));
  }, [metricId, period, employeeId, onSaved]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const stripped = e.target.value.replace(/\s/g, '');
    if (stripped === '' || /^-?\d*\.?\d*$/.test(stripped)) {
      setRawValue(stripped);
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => doSave(parseFloat(stripped) || 0), 800);
    }
  }, [doSave]);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  return (
    <div className="relative">
      <Input
        type="text"
        inputMode="decimal"
        value={focused ? rawValue : formatWithSpaces(rawValue)}
        onChange={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="—"
        className={cn(
          'h-6 text-[11px] text-right px-1.5 w-[80px] border-transparent bg-transparent hover:bg-muted/50 focus:bg-background focus:border-border transition-colors',
          saving && 'border-primary/40',
          saved && !saving && 'border-green-400/40',
        )}
      />
      {saving && <Loader2 className="absolute right-0.5 top-1 w-3 h-3 animate-spin text-primary/60" />}
      {saved && !saving && <Check className="absolute right-0.5 top-1 w-3 h-3 text-green-500" />}
    </div>
  );
}

export function PlanFactTable({ metrics, coverageMatrix, selectedBranchId, allBranchIds, canSetPlan, onPlanClick, period, managerData, managerDataLoading }: PlanFactTableProps) {
  const queryClient = useQueryClient();
  const isAllBranches = selectedBranchId === '__all__';
  const [expandedMetrics, setExpandedMetrics] = useState<Set<string>>(new Set());

  const toggleExpand = useCallback((metricId: string) => {
    setExpandedMetrics(prev => {
      const next = new Set(prev);
      next.has(metricId) ? next.delete(metricId) : next.add(metricId);
      return next;
    });
  }, []);

  const handleSaved = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['admin-dashboard-metrics'] });
  }, [queryClient]);

  const handlePlanSaved = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['manager-breakdown'] });
    queryClient.invalidateQueries({ queryKey: ['admin-metric-plans'] });
  }, [queryClient]);

  // Build per-metric row data for selected branch (or aggregate all)
  const rows = useMemo(() => {
    return metrics.map(metric => {
      const storeMap = coverageMatrix.get(metric.id);
      let planValue: number | null = null;
      let factValue: number | null = null;

      if (isAllBranches) {
        // Aggregate across all branches
        let planSum = 0, factSum = 0, planCount = 0, factCount = 0;
        storeMap?.forEach(cell => {
          if (cell.planValue) { planSum += cell.planValue; planCount++; }
          if (cell.factValue) { factSum += cell.factValue; factCount++; }
        });
        const isAvg = metric.metricType === 'averaged' || metric.metricType === 'percentage';
        planValue = planCount > 0 ? (isAvg ? planSum / planCount : planSum) : null;
        factValue = factCount > 0 ? (isAvg ? factSum / factCount : factSum) : null;
      } else {
        const cell = storeMap?.get(selectedBranchId);
        planValue = cell?.planValue ?? null;
        factValue = cell?.factValue ?? null;
      }

      const completionPercent = planValue && planValue > 0 && factValue != null
        ? (factValue / planValue) * 100
        : null;

      return { metric, planValue, factValue, completionPercent };
    });
  }, [metrics, coverageMatrix, selectedBranchId, isAllBranches]);

  // ИТОГО row
  const totals = useMemo(() => {
    let sum = 0, count = 0;
    for (const r of rows) {
      if (r.completionPercent != null) { sum += r.completionPercent; count++; }
    }
    return { avgCompletion: count > 0 ? sum / count : null };
  }, [rows]);

  if (metrics.length === 0) {
    return (
      <Card className="p-6 text-center text-sm text-muted-foreground">
        Нет настроенных метрик
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left font-medium text-muted-foreground p-3 min-w-[140px]">Метрика</th>
              <th className="text-right font-medium text-muted-foreground p-3 w-[90px]">План</th>
              <th className="text-right font-medium text-muted-foreground p-3 w-[90px]">Факт</th>
              <th className="text-right font-medium text-muted-foreground p-3 w-[60px]">%</th>
              <th className="text-center font-medium text-muted-foreground p-3 w-[40px]"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ metric, planValue, factValue, completionPercent }) => {
              const color = completionColor(completionPercent);
              const isManual = metric.source === 'manual';
              // Per-metric manager list from new byMetric response
              const metricManagers = managerData?.[metric.id]?.managers;
              const canExpand = !isAllBranches && !!managerData;
              const isExpanded = expandedMetrics.has(metric.id);

              return (
                <Fragment key={metric.id}>
                <tr
                  className={cn(
                    'border-b border-border/20 hover:bg-muted/20 transition-colors',
                    canExpand && 'cursor-pointer',
                  )}
                  onClick={canExpand ? () => toggleExpand(metric.id) : undefined}
                >
                  {/* Metric name */}
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      {canExpand && (
                        <ChevronRight className={cn(
                          'w-3.5 h-3.5 shrink-0 text-muted-foreground transition-transform duration-200',
                          isExpanded && 'rotate-90',
                        )} />
                      )}
                      <span className="font-medium truncate">{metric.name}</span>
                      {metric.unit && <span className="text-muted-foreground/50 text-[10px] shrink-0">{metric.unit}</span>}
                    </div>
                    <SourceBadge source={metric.source} />
                  </td>

                  {/* Plan value */}
                  <td className="p-3 text-right" onClick={e => e.stopPropagation()}>
                    {canSetPlan && !isAllBranches ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => onPlanClick(metric.id)}
                            className={cn(
                              'text-xs tabular-nums px-2 py-0.5 rounded hover:bg-primary/10 hover:text-primary transition-colors',
                              planValue != null ? 'font-medium' : 'text-muted-foreground/40',
                            )}
                          >
                            {planValue != null ? fmtNum(planValue) : '—'}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">Установить план</TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className={cn('tabular-nums', planValue == null && 'text-muted-foreground/40')}>
                        {planValue != null ? fmtNum(planValue) : '—'}
                      </span>
                    )}
                  </td>

                  {/* Fact value */}
                  <td className="p-3 text-right" onClick={e => e.stopPropagation()}>
                    {isManual && !isAllBranches ? (
                      <InlineFactInput
                        metricId={metric.id}
                        period={period}
                        storeId={selectedBranchId}
                        value={factValue ?? 0}
                        onSaved={handleSaved}
                      />
                    ) : (
                      <span className={cn('tabular-nums', factValue == null && 'text-muted-foreground/40')}>
                        {factValue != null ? fmtNum(factValue) : '—'}
                      </span>
                    )}
                  </td>

                  {/* Completion % */}
                  <td className="p-3 text-right">
                    <span className={cn('font-semibold tabular-nums', completionTextClass(color))}>
                      {completionPercent != null ? `${Math.round(completionPercent)}%` : '—'}
                    </span>
                  </td>

                  {/* Status dot */}
                  <td className="p-3 text-center">
                    <span className={cn('inline-block w-2.5 h-2.5 rounded-full', completionDotClass(color))} />
                  </td>
                </tr>

                {/* Manager sub-rows (per-metric filtered list) */}
                {canExpand && isExpanded && (
                  managerDataLoading ? (
                    <tr className="bg-muted/10">
                      <td colSpan={5} className="p-3 text-center">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mx-auto" />
                      </td>
                    </tr>
                  ) : metricManagers && metricManagers.length > 0 ? (
                    metricManagers.map((manager, idx) => {
                      const mPlan = manager.plan;
                      const mFact = manager.fact;
                      const mPercent = manager.percent;
                      const mColor = completionColor(mPercent);
                      const isLast = idx === metricManagers.length - 1;

                      return (
                        <tr key={manager.employee_id} className="bg-muted/10 border-b border-border/10">
                          <td className="py-2 px-3 pl-6">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-[11px] text-muted-foreground truncate block max-w-[160px]">
                                  <span className="text-muted-foreground/40 mr-1">{isLast ? '└' : '├'}</span>
                                  {manager.employee_name}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">{manager.employee_name}</TooltipContent>
                            </Tooltip>
                          </td>
                          <td className="py-2 px-3 text-right" onClick={e => e.stopPropagation()}>
                            {canSetPlan ? (
                              <InlinePlanInput
                                metricId={metric.id}
                                period={period}
                                employeeId={manager.employee_id}
                                value={mPlan}
                                onSaved={handlePlanSaved}
                              />
                            ) : (
                              <span className={cn('text-[11px] tabular-nums', mPlan == null && 'text-muted-foreground/40')}>
                                {mPlan != null ? fmtNum(mPlan) : '—'}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <span className={cn('text-[11px] tabular-nums', mFact == null && 'text-muted-foreground/40')}>
                              {mFact != null ? fmtNum(mFact) : '—'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right">
                            <span className={cn('text-[11px] font-semibold tabular-nums', completionTextClass(mColor))}>
                              {mPercent != null ? `${Math.round(mPercent)}%` : '—'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className={cn('inline-block w-2 h-2 rounded-full', completionDotClass(mColor))} />
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr className="bg-muted/10">
                      <td colSpan={5} className="py-2 px-3 text-center text-[11px] text-muted-foreground/60">
                        Нет сотрудников для этой метрики
                      </td>
                    </tr>
                  )
                )}
                </Fragment>
              );
            })}

            {/* ИТОГО row */}
            <tr className="border-t-2 border-border/50 font-semibold">
              <td className="p-3 text-muted-foreground">ИТОГО</td>
              <td className="p-3"></td>
              <td className="p-3"></td>
              <td className="p-3 text-right">
                {totals.avgCompletion != null ? (
                  <span className={cn('tabular-nums', completionTextClass(completionColor(totals.avgCompletion)))}>
                    {Math.round(totals.avgCompletion)}%
                  </span>
                ) : '—'}
              </td>
              <td className="p-3 text-center">
                {totals.avgCompletion != null && (
                  <span className={cn('inline-block w-2.5 h-2.5 rounded-full', completionDotClass(completionColor(totals.avgCompletion)))} />
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}

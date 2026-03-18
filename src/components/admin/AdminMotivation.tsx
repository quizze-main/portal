import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Trash2, Plus, Save, ChevronDown, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Spinner } from '@/components/Spinner';

import { useMotivationConfig } from '@/hooks/useMotivationConfig';
import { useAdminDashboardMetrics } from '@/hooks/useAdminDashboardMetrics';
import { BRANCHES, getAvailablePositions } from '@/data/branchData';
import { getSalaryConfig, CLUB_LEVELS, MANAGER_LEVELS } from '@/data/salaryConfig';
import type { MotivationBranchPositionConfig, MotivationKPIConfig, MotivationMatrix } from '@/lib/internalApiClient';

type BranchId = string;

export function AdminMotivation() {
  const {
    configs, isLoading,
    createConfig, updateConfig, deleteConfig,
    isCreating, isUpdating, isDeleting,
  } = useMotivationConfig();

  const { metrics: dashboardMetrics } = useAdminDashboardMetrics();

  const [selectedBranch, setSelectedBranch] = useState<BranchId>(BRANCHES[0].id);
  const [selectedPosition, setSelectedPosition] = useState<string>('');

  const availablePositions = useMemo(() => getAvailablePositions(selectedBranch), [selectedBranch]);

  // Auto-select first position when branch changes
  useEffect(() => {
    if (availablePositions.length > 0) {
      setSelectedPosition(availablePositions[0].id);
    }
  }, [availablePositions]);

  const configKey = `${selectedBranch}_${selectedPosition}`;
  const isCustom = Boolean(configs[configKey]);

  // Source config: API if custom, hardcoded fallback otherwise
  const sourceConfig = useMemo(() => {
    if (configs[configKey]) return configs[configKey];
    return getSalaryConfig(selectedBranch, selectedPosition);
  }, [configs, configKey, selectedBranch, selectedPosition]);

  // --- Edit state ---
  const [trackerStoreId, setTrackerStoreId] = useState('');
  const [baseSalary, setBaseSalary] = useState(0);
  const [personalPlan, setPersonalPlan] = useState(0);
  const [clubPlan, setClubPlan] = useState(0);
  const [matrix, setMatrix] = useState<MotivationMatrix>({});
  const [kpis, setKpis] = useState<MotivationKPIConfig[]>([]);
  const [collapsedKpis, setCollapsedKpis] = useState<Set<string>>(new Set());

  const toggleKpiCollapse = (kpiId: string) => {
    setCollapsedKpis((prev) => {
      const next = new Set(prev);
      if (next.has(kpiId)) next.delete(kpiId);
      else next.add(kpiId);
      return next;
    });
  };

  const collapseAll = () => setCollapsedKpis(new Set(kpis.map((k) => k.id)));
  const expandAll = () => setCollapsedKpis(new Set());

  // Populate form from source config
  useEffect(() => {
    setTrackerStoreId((sourceConfig as MotivationBranchPositionConfig).trackerStoreId || '');
    setBaseSalary(sourceConfig.baseSalary);
    setPersonalPlan(sourceConfig.personalPlan);
    setClubPlan(sourceConfig.clubPlan);
    // Deep-copy matrix and kpis to avoid mutation
    setMatrix(JSON.parse(JSON.stringify(sourceConfig.matrix)));
    setKpis(JSON.parse(JSON.stringify(sourceConfig.kpis)));
  }, [sourceConfig]);

  // --- Matrix helpers ---
  const handleMatrixChange = (cl: string, ml: string, value: string) => {
    const num = parseFloat(value);
    setMatrix((prev) => ({
      ...prev,
      [cl]: { ...prev[cl], [ml]: isNaN(num) ? 0 : num },
    }));
  };

  // --- KPI helpers ---
  const handleKpiFieldChange = (idx: number, field: string, value: string) => {
    setKpis((prev) => prev.map((kpi, i) => i === idx ? { ...kpi, [field]: value } : kpi));
  };

  const handleKpiTypeChange = (idx: number, type: 'tier' | 'multiplier') => {
    setKpis((prev) => prev.map((kpi, i) => {
      if (i !== idx) return kpi;
      return { ...kpi, type, multiplierRate: type === 'multiplier' ? (kpi.multiplierRate || 0) : undefined };
    }));
  };

  const handleTierChange = (kpiIdx: number, tierIdx: number, field: string, value: string) => {
    setKpis((prev) => prev.map((kpi, i) => {
      if (i !== kpiIdx) return kpi;
      const tiers = kpi.tiers.map((t, j) => {
        if (j !== tierIdx) return t;
        if (field === 'range') return { ...t, range: value };
        const num = parseFloat(value);
        return { ...t, [field]: isNaN(num) ? 0 : num };
      });
      return { ...kpi, tiers };
    }));
  };

  const addTier = (kpiIdx: number) => {
    setKpis((prev) => prev.map((kpi, i) => {
      if (i !== kpiIdx) return kpi;
      return { ...kpi, tiers: [...kpi.tiers, { range: '', bonus: 0, minPercent: 0, maxPercent: 100 }] };
    }));
  };

  const removeTier = (kpiIdx: number, tierIdx: number) => {
    setKpis((prev) => prev.map((kpi, i) => {
      if (i !== kpiIdx) return kpi;
      return { ...kpi, tiers: kpi.tiers.filter((_, j) => j !== tierIdx) };
    }));
  };

  const addKpi = () => {
    const id = `kpi_${Date.now()}`;
    setKpis((prev) => [...prev, { id, label: '', description: '', type: 'tier', tiers: [] }]);
  };

  const removeKpi = (idx: number) => {
    setKpis((prev) => prev.filter((_, i) => i !== idx));
  };

  // --- Validation ---
  const validate = (): string | null => {
    if (baseSalary <= 0) return 'Базовая зарплата должна быть > 0';
    if (personalPlan <= 0) return 'Личный план должен быть > 0';
    if (clubPlan <= 0) return 'План клуба должен быть > 0';

    for (const cl of CLUB_LEVELS) {
      for (const ml of MANAGER_LEVELS) {
        if (typeof matrix[cl]?.[ml] !== 'number' || !isFinite(matrix[cl][ml])) {
          return `Заполните ячейку матрицы ${cl} / ${ml}`;
        }
      }
    }

    for (const kpi of kpis) {
      if (!kpi.label.trim()) return 'У KPI отсутствует название';
      if (kpi.type === 'multiplier') {
        if (typeof kpi.multiplierRate !== 'number' || !isFinite(kpi.multiplierRate)) {
          return `KPI "${kpi.label}": multiplierRate должен быть числом`;
        }
      }
    }

    return null;
  };

  // --- Save ---
  const handleSave = async () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }

    const config: MotivationBranchPositionConfig = {
      branchId: selectedBranch,
      positionId: selectedPosition,
      trackerStoreId: trackerStoreId || undefined,
      baseSalary,
      personalPlan,
      clubPlan,
      matrix,
      kpis,
    };

    try {
      if (isCustom) {
        await updateConfig({ key: configKey, config });
        toast.success('Конфигурация обновлена');
      } else {
        await createConfig(config);
        toast.success('Конфигурация создана');
      }
    } catch (e) {
      toast.error((e as Error).message || 'Ошибка сохранения');
    }
  };

  // --- Delete ---
  const handleDelete = async () => {
    try {
      await deleteConfig(configKey);
      toast.success('Кастомная конфигурация удалена, используется дефолт');
    } catch (e) {
      toast.error((e as Error).message || 'Ошибка удаления');
    }
  };

  const isSaving = isCreating || isUpdating;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Branch + Position selectors */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Филиал</label>
            <Select value={selectedBranch} onValueChange={(v) => setSelectedBranch(v)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BRANCHES.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Должность</label>
            <Select value={selectedPosition} onValueChange={setSelectedPosition}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availablePositions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Status indicator */}
        <div className={`text-xs px-3 py-1.5 rounded-md inline-block ${isCustom ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-muted text-muted-foreground'}`}>
          {isCustom ? 'Кастомный конфиг (из админки)' : 'Дефолтный конфиг (hardcoded)'}
        </div>
      </div>

      {/* Base params */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold">Базовые параметры</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Базовая зарплата</label>
            <Input
              type="number"
              value={baseSalary}
              onChange={(e) => setBaseSalary(Number(e.target.value))}
              className="h-9 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Личный план</label>
            <Input
              type="number"
              value={personalPlan}
              onChange={(e) => setPersonalPlan(Number(e.target.value))}
              className="h-9 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">План клуба</label>
            <Input
              type="number"
              value={clubPlan}
              onChange={(e) => setClubPlan(Number(e.target.value))}
              className="h-9 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">ID магазина (Tracker)</label>
            <Input
              value={trackerStoreId}
              onChange={(e) => setTrackerStoreId(e.target.value)}
              placeholder="для авто-расчёта KPI"
              className="h-9 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Matrix */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold">Матрица премий (%)</h3>
        <div className="overflow-x-auto">
          <table className="text-xs border-collapse w-full">
            <thead>
              <tr>
                <th className="p-1.5 text-left text-muted-foreground">Клуб \ Менеджер</th>
                {MANAGER_LEVELS.map((ml) => (
                  <th key={ml} className="p-1.5 text-center text-muted-foreground whitespace-nowrap">{ml}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CLUB_LEVELS.map((cl) => (
                <tr key={cl}>
                  <td className="p-1.5 font-medium whitespace-nowrap">{cl}</td>
                  {MANAGER_LEVELS.map((ml) => (
                    <td key={ml} className="p-1">
                      <Input
                        type="number"
                        step="0.1"
                        value={matrix[cl]?.[ml] ?? ''}
                        onChange={(e) => handleMatrixChange(cl, ml, e.target.value)}
                        className="h-8 w-20 text-center text-xs p-1"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* KPI List */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">KPI показатели</h3>
          <div className="flex items-center gap-1.5">
            {kpis.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground"
                onClick={collapsedKpis.size === kpis.length ? expandAll : collapseAll}
              >
                {collapsedKpis.size === kpis.length ? 'Развернуть все' : 'Свернуть все'}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={addKpi}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              Добавить KPI
            </Button>
          </div>
        </div>

        {kpis.map((kpi, kpiIdx) => {
          const isCollapsed = collapsedKpis.has(kpi.id);
          const tierCount = kpi.tiers?.length ?? 0;
          const typeLabel = kpi.type === 'multiplier' ? 'множитель' : `${tierCount} ур.`;
          const linkedLabel = kpi.linkedMetricId
            ? dashboardMetrics.find(m => m.id === kpi.linkedMetricId)?.name || kpi.linkedMetricId
            : null;

          return (
            <div key={kpi.id} className="border rounded-lg overflow-hidden">
              {/* Collapsible header */}
              <div
                className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleKpiCollapse(kpi.id)}
              >
                {isCollapsed
                  ? <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                }
                <span className="text-sm font-medium truncate flex-1">
                  {kpi.label || <span className="text-muted-foreground italic">Без названия</span>}
                </span>
                <span className="text-[10px] text-muted-foreground shrink-0">{typeLabel}</span>
                {linkedLabel && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-1.5 py-0.5 rounded shrink-0">
                    {linkedLabel}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive shrink-0"
                  onClick={(e) => { e.stopPropagation(); removeKpi(kpiIdx); }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>

              {/* Expandable body */}
              {!isCollapsed && (
                <div className="px-3 pb-3 space-y-3 border-t">
                  <div className="flex-1 grid grid-cols-2 gap-2 pt-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">ID</label>
                      <Input
                        value={kpi.id}
                        onChange={(e) => handleKpiFieldChange(kpiIdx, 'id', e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Название</label>
                      <Input
                        value={kpi.label}
                        onChange={(e) => handleKpiFieldChange(kpiIdx, 'label', e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Описание</label>
                    <Input
                      value={kpi.description}
                      onChange={(e) => handleKpiFieldChange(kpiIdx, 'description', e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted-foreground">Тип:</label>
                      <Select value={kpi.type || 'tier'} onValueChange={(v) => handleKpiTypeChange(kpiIdx, v as 'tier' | 'multiplier')}>
                        <SelectTrigger className="h-8 w-40 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tier">Уровни (tier)</SelectItem>
                          <SelectItem value="multiplier">Множитель (multiplier)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {kpi.type !== 'multiplier' && (
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-muted-foreground">Метрика:</label>
                        <Select
                          value={kpi.linkedMetricId || '_none_'}
                          onValueChange={(v) => handleKpiFieldChange(kpiIdx, 'linkedMetricId', v === '_none_' ? '' : v)}
                        >
                          <SelectTrigger className="h-8 w-52 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_none_">Не привязано</SelectItem>
                            {dashboardMetrics.filter(m => m.enabled).map(m => (
                              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {kpi.type === 'multiplier' ? (
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Ставка за единицу</label>
                      <Input
                        type="number"
                        value={kpi.multiplierRate ?? 0}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setKpis((prev) => prev.map((k, i) => i === kpiIdx ? { ...k, multiplierRate: isNaN(val) ? 0 : val } : k));
                        }}
                        className="h-8 w-32 text-xs"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Уровни (tiers)</span>
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => addTier(kpiIdx)}>
                          <Plus className="w-3 h-3 mr-1" />
                          Tier
                        </Button>
                      </div>
                      {kpi.tiers.map((tier, tierIdx) => (
                        <div key={tierIdx} className="grid grid-cols-5 gap-1.5 items-end">
                          <div>
                            <label className="text-[10px] text-muted-foreground">Диапазон</label>
                            <Input value={tier.range} onChange={(e) => handleTierChange(kpiIdx, tierIdx, 'range', e.target.value)} className="h-7 text-xs" />
                          </div>
                          <div>
                            <label className="text-[10px] text-muted-foreground">Бонус</label>
                            <Input type="number" value={tier.bonus} onChange={(e) => handleTierChange(kpiIdx, tierIdx, 'bonus', e.target.value)} className="h-7 text-xs" />
                          </div>
                          <div>
                            <label className="text-[10px] text-muted-foreground">Min%</label>
                            <Input type="number" value={tier.minPercent} onChange={(e) => handleTierChange(kpiIdx, tierIdx, 'minPercent', e.target.value)} className="h-7 text-xs" />
                          </div>
                          <div>
                            <label className="text-[10px] text-muted-foreground">Max%</label>
                            <Input type="number" value={tier.maxPercent} onChange={(e) => handleTierChange(kpiIdx, tierIdx, 'maxPercent', e.target.value)} className="h-7 text-xs" />
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeTier(kpiIdx, tierIdx)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="rounded-lg border bg-card p-4 flex items-center gap-3">
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="w-4 h-4 mr-1.5" />
          {isSaving ? 'Сохранение...' : 'Сохранить'}
        </Button>

        {isCustom && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isDeleting}>
                <Trash2 className="w-4 h-4 mr-1.5" />
                {isDeleting ? 'Удаление...' : 'Удалить кастомный'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Удалить кастомную конфигурацию?</AlertDialogTitle>
                <AlertDialogDescription>
                  Калькулятор вернётся к дефолтным значениям (hardcoded). Это действие необратимо.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Удалить</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Plus, Trash2, X, Loader2 } from 'lucide-react';
import { useAdminMetricPlans } from '@/hooks/useAdminMetricPlans';
import { useEmployee } from '@/contexts/EmployeeProvider';
import { cn } from '@/lib/utils';
import type { MetricPlan } from '@/lib/internalApiClient';
import {
  SCOPE_LABELS,
  SCOPE_COLORS,
  getScopeLabel,
  generatePeriodOptions,
  PERIOD_TYPE_LABELS,
  type PeriodType,
} from './dashboard-constants';

interface MetricPlansManagerProps {
  metricId: string;
  metricName: string;
  unit: string;
  onClose?: () => void;
  embedded?: boolean;
}

export const MetricPlansManager: React.FC<MetricPlansManagerProps> = ({
  metricId,
  metricName,
  unit,
  onClose,
  embedded = false,
}) => {
  const { storeOptions } = useEmployee();
  const {
    plans,
    isLoading,
    createPlan,
    deletePlan,
    isCreating,
    isDeleting,
  } = useAdminMetricPlans(metricId);

  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterPeriod, setFilterPeriod] = useState<string>('');

  // New plan form state
  const [newScope, setNewScope] = useState<'network' | 'branch' | 'employee'>('branch');
  const [newScopeId, setNewScopeId] = useState('');
  const [newPeriodType, setNewPeriodType] = useState<PeriodType>('month');
  const [newPeriod, setNewPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [newValue, setNewValue] = useState('');

  const periodOptions = useMemo(() => generatePeriodOptions(newPeriodType), [newPeriodType]);

  // Derive filter options from actual plan data + generated options
  const filterPeriodOptions = useMemo(() => {
    const generated = new Set(periodOptions);
    const fromPlans = plans.map(p => p.period);
    for (const p of fromPlans) generated.add(p);
    return [...generated].sort();
  }, [periodOptions, plans]);

  const filteredPlans = useMemo(() => {
    if (!filterPeriod) return plans;
    return plans.filter(p => p.period === filterPeriod);
  }, [plans, filterPeriod]);

  const handleAdd = async () => {
    const scopeId = newScope === 'network' ? '*' : newScopeId;
    if (!scopeId || !newPeriod || !newValue) return;

    try {
      await createPlan({
        metricId,
        scope: newScope,
        scopeId,
        period: newPeriod,
        planValue: parseFloat(newValue),
      });
      setShowAddForm(false);
      setNewValue('');
    } catch {
      toast.error('Не удалось создать план');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deletePlan(deleteId);
      setDeleteId(null);
    } catch {
      toast.error('Не удалось удалить план');
      setDeleteId(null);
    }
  };

  return (
    <div className={cn('space-y-3', !embedded && 'px-3 pb-3 pt-2 border-t')}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          {!embedded && <h4 className="text-xs font-semibold">Планы: {metricName}</h4>}
          <p className="text-[10px] text-muted-foreground">
            Иерархия: Сотрудник → Филиал → Сеть
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAddForm(!showAddForm)}
            className="h-7 text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            Добавить
          </Button>
          {!embedded && onClose && (
            <Button size="sm" variant="ghost" onClick={onClose} className="h-7 text-xs">
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 items-center">
        <Select value={filterPeriod || '__all__'} onValueChange={v => setFilterPeriod(v === '__all__' ? '' : v)}>
          <SelectTrigger className="h-7 text-xs w-[140px]">
            <SelectValue placeholder="Все периоды" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Все периоды</SelectItem>
            {filterPeriodOptions.map(p => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-[10px] text-muted-foreground">
          {filteredPlans.length} записей
        </span>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="border rounded-md p-2.5 space-y-2 bg-muted/30">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Scope</label>
              <Select value={newScope} onValueChange={v => {
                setNewScope(v as 'network' | 'branch' | 'employee');
                if (v === 'network') setNewScopeId('*');
                else setNewScopeId('');
              }}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="network">Сеть</SelectItem>
                  <SelectItem value="branch">Филиал</SelectItem>
                  <SelectItem value="employee">Сотрудник</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">
                {newScope === 'network' ? 'Scope ID' : newScope === 'branch' ? 'Филиал' : 'ID сотрудника'}
              </label>
              {newScope === 'network' ? (
                <Input value="*" disabled className="text-xs h-7" />
              ) : newScope === 'branch' ? (
                <Select value={newScopeId} onValueChange={setNewScopeId}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Выбрать" /></SelectTrigger>
                  <SelectContent>
                    {storeOptions.map(s => (
                      <SelectItem key={s.store_id} value={s.store_id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={newScopeId}
                  onChange={e => setNewScopeId(e.target.value)}
                  placeholder="employee_id"
                  className="text-xs h-7"
                />
              )}
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Период</label>
              <div className="flex gap-1">
                <Select value={newPeriodType} onValueChange={(v) => {
                  setNewPeriodType(v as PeriodType);
                  const opts = generatePeriodOptions(v as PeriodType);
                  if (opts.length > 0) setNewPeriod(opts[0]);
                }}>
                  <SelectTrigger className="h-7 text-xs w-[72px] shrink-0"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PERIOD_TYPE_LABELS) as PeriodType[]).map(pt => (
                      <SelectItem key={pt} value={pt}>{PERIOD_TYPE_LABELS[pt]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={newPeriod} onValueChange={setNewPeriod}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {periodOptions.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">
                План ({unit})
              </label>
              <Input
                type="number"
                value={newValue}
                onChange={e => setNewValue(e.target.value)}
                placeholder="0"
                className="text-xs h-7"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowAddForm(false)} className="h-6 text-[10px]">
              Отмена
            </Button>
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={isCreating || (!newScopeId && newScope !== 'network') || !newValue}
              className="h-6 text-[10px]"
            >
              {isCreating ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Добавить'}
            </Button>
          </div>
        </div>
      )}

      {/* Plans table */}
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      ) : filteredPlans.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          Нет планов. Нажмите «Добавить» чтобы задать план.
        </p>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[10px] h-7 px-2">Scope</TableHead>
                <TableHead className="text-[10px] h-7 px-2">Привязка</TableHead>
                <TableHead className="text-[10px] h-7 px-2">Период</TableHead>
                <TableHead className="text-[10px] h-7 px-2 text-right">План</TableHead>
                <TableHead className="text-[10px] h-7 px-2 w-8"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPlans.map(plan => (
                <TableRow key={plan.id} className="h-8">
                  <TableCell className="px-2 py-1">
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', SCOPE_COLORS[plan.scope])}>
                      {SCOPE_LABELS[plan.scope]}
                    </span>
                  </TableCell>
                  <TableCell className="px-2 py-1 text-xs">
                    {getScopeLabel(plan.scope, plan.scopeId, storeOptions)}
                  </TableCell>
                  <TableCell className="px-2 py-1 text-xs font-mono">
                    {plan.period}
                  </TableCell>
                  <TableCell className="px-2 py-1 text-xs text-right font-medium">
                    {plan.planValue.toLocaleString('ru-RU')} {unit}
                  </TableCell>
                  <TableCell className="px-1 py-1">
                    <button
                      onClick={() => setDeleteId(plan.id)}
                      className="text-muted-foreground hover:text-red-500 p-0.5"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={open => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить план?</AlertDialogTitle>
            <AlertDialogDescription>
              Запись плана будет удалена. Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Удаление...' : 'Удалить'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Plus, Minus, Trash2 } from 'lucide-react';
import type { StaffingRequirement, StaffingRequirementInput } from '@/types/staffing-requirements';

interface StaffingRequirementsDialogProps {
  branchId: string;
  requirements: StaffingRequirement[];
  designations: string[];
  onUpsert: (input: StaffingRequirementInput) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
  isUpdating: boolean;
}

export function StaffingRequirementsDialog({
  branchId,
  requirements,
  designations,
  onUpsert,
  onDelete,
  isUpdating,
}: StaffingRequirementsDialogProps) {
  const [open, setOpen] = useState(false);
  const [newDesignation, setNewDesignation] = useState('');

  const byDesignation = new Map<string, StaffingRequirement>();
  for (const r of requirements) {
    if (!byDesignation.has(r.designation)) {
      byDesignation.set(r.designation, r);
    }
  }
  const rows = Array.from(byDesignation.values());
  const availableDesignations = designations.filter(d => !byDesignation.has(d));

  const handleAdd = async () => {
    if (!newDesignation) return;
    await onUpsert({
      branch_id: branchId,
      designation: newDesignation,
      day_of_week: null,
      required_count: 1,
    });
    setNewDesignation('');
  };

  const handleIncrement = async (req: StaffingRequirement) => {
    await onUpsert({
      branch_id: branchId,
      designation: req.designation,
      day_of_week: null,
      required_count: req.required_count + 1,
    });
  };

  const handleDecrement = async (req: StaffingRequirement) => {
    if (req.required_count <= 1) {
      await onDelete(req.id);
    } else {
      await onUpsert({
        branch_id: branchId,
        designation: req.designation,
        day_of_week: null,
        required_count: req.required_count - 1,
      });
    }
  };

  const handleRemove = async (req: StaffingRequirement) => {
    await onDelete(req.id);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 rounded-lg border-border/50">
          <Users className="w-3.5 h-3.5" />
          Состав смены
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-base">Состав смены</DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground -mt-1">
          Задайте сколько человек каких должностей нужно на смене. Система подсветит отклонения.
        </p>

        <div className="space-y-1.5 mt-2">
          {rows.length > 0 ? (
            rows.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between gap-2 px-3 py-2 bg-muted/40 dark:bg-muted/20 rounded-lg"
              >
                <span className="text-sm font-medium text-foreground flex-1 truncate">
                  {req.designation}
                </span>

                <div className="flex items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 rounded-lg"
                    onClick={() => handleDecrement(req)}
                    disabled={isUpdating}
                  >
                    <Minus className="w-3 h-3" />
                  </Button>

                  <span className="w-8 text-center text-sm font-bold tabular-nums text-foreground">
                    {req.required_count}
                  </span>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 rounded-lg"
                    onClick={() => handleIncrement(req)}
                    disabled={isUpdating}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-destructive ml-0.5"
                    onClick={() => handleRemove(req)}
                    disabled={isUpdating}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-muted-foreground text-center py-6 bg-muted/20 rounded-lg">
              Состав смены не задан
            </div>
          )}

          {/* Add new designation */}
          <div className="flex items-center gap-2 pt-2 border-t border-border/40">
            {availableDesignations.length > 0 ? (
              <Select value={newDesignation} onValueChange={setNewDesignation}>
                <SelectTrigger className="h-8 text-xs flex-1 rounded-lg">
                  <SelectValue placeholder="Выберите должность" />
                </SelectTrigger>
                <SelectContent>
                  {availableDesignations.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="text-xs text-muted-foreground flex-1">
                {designations.length === 0 ? 'Нет должностей' : 'Все должности добавлены'}
              </span>
            )}
            <Button
              size="sm"
              className="h-8 text-xs gap-1 rounded-lg"
              onClick={handleAdd}
              disabled={!newDesignation || isUpdating}
            >
              <Plus className="w-3 h-3" />
              Добавить
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

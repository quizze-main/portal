import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Wand2, Loader2 } from 'lucide-react';
import type { ShiftTemplate, AutoFillParams } from '@/types/shift-schedule';

interface ShiftToolbarProps {
  templates: ShiftTemplate[];
  branchId: string;
  month: string;
  employees: Array<{ name: string; employee_name: string }>;
  onAutoFill: (params: AutoFillParams) => Promise<void>;
  isUpdating: boolean;
}

export function ShiftToolbar({ templates, branchId, month, employees, onAutoFill, isUpdating }: ShiftToolbarProps) {
  const [autoFillOpen, setAutoFillOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [startOffset, setStartOffset] = useState(0);
  const [preserveSpecial, setPreserveSpecial] = useState(true);

  const handleAutoFill = async () => {
    if (!selectedEmployee || !selectedTemplate) return;
    await onAutoFill({
      employee_id: selectedEmployee,
      branch_id: branchId,
      month,
      template_id: selectedTemplate,
      start_offset: startOffset,
      preserve_special: preserveSpecial,
    });
    setAutoFillOpen(false);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs gap-1.5 rounded-lg border-border/50"
        onClick={() => setAutoFillOpen(true)}
        disabled={isUpdating}
      >
        {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
        Автозаполнение
      </Button>

      <Dialog open={autoFillOpen} onOpenChange={setAutoFillOpen}>
        <DialogContent className="sm:max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-base">Автозаполнение графика</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Сотрудник</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger className="h-9 rounded-lg">
                  <SelectValue placeholder="Выберите сотрудника" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.name} value={e.name}>{e.employee_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Шаблон</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger className="h-9 rounded-lg">
                  <SelectValue placeholder="Выберите шаблон" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name} ({t.pattern_type})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Смещение начала цикла</Label>
              <Input
                type="number"
                min={0}
                max={6}
                value={startOffset}
                onChange={(e) => setStartOffset(Number(e.target.value))}
                className="h-9 rounded-lg"
              />
              <p className="text-[10px] text-muted-foreground">
                0 = первый рабочий день цикла, 1 = второй и т.д.
              </p>
            </div>

            <label className="flex items-center gap-2.5 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={preserveSpecial}
                onChange={(e) => setPreserveSpecial(e.target.checked)}
                className="rounded border-border"
              />
              <span className="text-foreground/80">Сохранить отпуска и больничные</span>
            </label>

            <Button
              className="w-full rounded-lg"
              onClick={handleAutoFill}
              disabled={!selectedEmployee || !selectedTemplate || isUpdating}
            >
              {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Заполнить месяц
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings2, Trash2, Plus } from 'lucide-react';
import { internalApiClient } from '@/lib/internalApiClient';
import type { ShiftTemplate, CycleDay } from '@/types/shift-schedule';
import { useQueryClient } from '@tanstack/react-query';

interface ShiftTemplateDialogProps {
  templates: ShiftTemplate[];
  branchId?: string;
}

const DEFAULT_CYCLE_DAY: CycleDay = { shift_type: 'work', shift_number: 1, time_start: '10:00', time_end: '19:00' };

export function ShiftTemplateDialog({ templates, branchId }: ShiftTemplateDialogProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const [name, setName] = useState('');
  const [patternType, setPatternType] = useState<'2/2' | '5/2' | 'custom'>('2/2');
  const [cycleDays, setCycleDays] = useState<CycleDay[]>([
    { ...DEFAULT_CYCLE_DAY },
    { ...DEFAULT_CYCLE_DAY },
    { shift_type: 'day_off' },
    { shift_type: 'day_off' },
  ]);

  const handlePatternChange = (type: '2/2' | '5/2' | 'custom') => {
    setPatternType(type);
    if (type === '2/2') {
      setCycleDays([
        { shift_type: 'work', shift_number: 1, time_start: '10:00', time_end: '19:00' },
        { shift_type: 'work', shift_number: 1, time_start: '10:00', time_end: '19:00' },
        { shift_type: 'day_off' },
        { shift_type: 'day_off' },
      ]);
    } else if (type === '5/2') {
      setCycleDays([
        ...Array(5).fill(null).map(() => ({ shift_type: 'work' as const, shift_number: 1, time_start: '10:00', time_end: '18:00' })),
        { shift_type: 'day_off' as const },
        { shift_type: 'day_off' as const },
      ]);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      await internalApiClient.createShiftTemplate({
        name: name.trim(),
        pattern_type: patternType,
        cycle_days: cycleDays,
        branch_id: branchId || null,
      });
      queryClient.invalidateQueries({ queryKey: ['shift-templates'] });
      setName('');
    } catch (err) {
      console.error('Failed to create template:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await internalApiClient.deleteShiftTemplate(id);
      queryClient.invalidateQueries({ queryKey: ['shift-templates'] });
    } catch (err) {
      console.error('Failed to delete template:', err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 rounded-lg border-border/50">
          <Settings2 className="w-3.5 h-3.5" />
          Шаблоны
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-base">Шаблоны графиков</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {templates.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Существующие</Label>
              {templates.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-2.5 bg-muted/40 dark:bg-muted/20 rounded-lg">
                  <div>
                    <div className="text-sm font-medium">{t.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {t.pattern_type} &middot; {t.cycle_days.length} дней
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(t.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3 border-t border-border/40 pt-4">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Новый шаблон</Label>

            <Input
              placeholder="Название шаблона"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 rounded-lg"
            />

            <Select value={patternType} onValueChange={(v) => handlePatternChange(v as '2/2' | '5/2' | 'custom')}>
              <SelectTrigger className="h-9 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2/2">2/2 (2 рабочих, 2 выходных)</SelectItem>
                <SelectItem value="5/2">5/2 (5 рабочих, 2 выходных)</SelectItem>
                <SelectItem value="custom">Произвольный</SelectItem>
              </SelectContent>
            </Select>

            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Дни цикла</Label>
              {cycleDays.map((cd, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="w-5 text-muted-foreground/60 text-right tabular-nums">{i + 1}</span>
                  <Select
                    value={cd.shift_type}
                    onValueChange={(v) => {
                      const updated = [...cycleDays];
                      updated[i] = { ...updated[i], shift_type: v as CycleDay['shift_type'] };
                      setCycleDays(updated);
                    }}
                  >
                    <SelectTrigger className="h-7 text-xs flex-1 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="work">Смена</SelectItem>
                      <SelectItem value="day_off">Выходной</SelectItem>
                    </SelectContent>
                  </Select>
                  {cd.shift_type === 'work' && (
                    <>
                      <Input
                        type="time"
                        value={cd.time_start || ''}
                        onChange={(e) => {
                          const updated = [...cycleDays];
                          updated[i] = { ...updated[i], time_start: e.target.value };
                          setCycleDays(updated);
                        }}
                        className="h-7 text-xs w-24 rounded-lg"
                      />
                      <span className="text-muted-foreground/50">—</span>
                      <Input
                        type="time"
                        value={cd.time_end || ''}
                        onChange={(e) => {
                          const updated = [...cycleDays];
                          updated[i] = { ...updated[i], time_end: e.target.value };
                          setCycleDays(updated);
                        }}
                        className="h-7 text-xs w-24 rounded-lg"
                      />
                    </>
                  )}
                  {patternType === 'custom' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-lg"
                      onClick={() => setCycleDays(cycleDays.filter((_, j) => j !== i))}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
              {patternType === 'custom' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1 rounded-lg"
                  onClick={() => setCycleDays([...cycleDays, { shift_type: 'work', time_start: '10:00', time_end: '18:00' }])}
                >
                  <Plus className="w-3 h-3" /> Добавить день
                </Button>
              )}
            </div>

            <Button className="w-full rounded-lg" onClick={handleCreate} disabled={!name.trim() || creating}>
              Создать шаблон
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

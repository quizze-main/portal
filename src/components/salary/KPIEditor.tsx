import { Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { KPIConfig, KPITier } from '@/data/salaryConfig';

interface KPIEditorProps {
  kpis: KPIConfig[];
  onChange: (kpis: KPIConfig[]) => void;
  availableMetrics?: Array<{ id: string; name: string }>;
}

export function KPIEditor({ kpis, onChange, availableMetrics }: KPIEditorProps) {
  const updateKPI = (idx: number, updates: Partial<KPIConfig>) => {
    const newKpis = kpis.map((k, i) => i === idx ? { ...k, ...updates } : k);
    onChange(newKpis);
  };

  const removeKPI = (idx: number) => {
    onChange(kpis.filter((_, i) => i !== idx));
  };

  const addKPI = () => {
    const newKPI: KPIConfig = {
      id: `kpi_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      label: 'Новый KPI',
      type: 'tier',
      tiers: [
        { range: 'Выполнено', bonus: 5000, minPercent: 100, maxPercent: 999 },
        { range: 'Не выполнено', bonus: 0, minPercent: 0, maxPercent: 100 },
      ],
    };
    onChange([...kpis, newKPI]);
  };

  const updateTier = (kpiIdx: number, tierIdx: number, updates: Partial<KPITier>) => {
    const kpi = kpis[kpiIdx];
    const newTiers = kpi.tiers.map((t, i) => i === tierIdx ? { ...t, ...updates } : t);
    updateKPI(kpiIdx, { tiers: newTiers });
  };

  const addTier = (kpiIdx: number) => {
    const kpi = kpis[kpiIdx];
    const newTier: KPITier = {
      range: 'Новый уровень',
      bonus: 0,
      minPercent: 0,
      maxPercent: 100,
    };
    updateKPI(kpiIdx, { tiers: [...kpi.tiers, newTier] });
  };

  const removeTier = (kpiIdx: number, tierIdx: number) => {
    const kpi = kpis[kpiIdx];
    if (kpi.tiers.length <= 1) return;
    updateKPI(kpiIdx, { tiers: kpi.tiers.filter((_, i) => i !== tierIdx) });
  };

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-medium text-foreground">KPI показатели</h4>

      {kpis.map((kpi, kpiIdx) => (
        <div key={kpi.id} className="bg-muted/30 rounded-xl p-3 space-y-2">
          {/* KPI Header */}
          <div className="flex items-start gap-2">
            <div className="flex-1 space-y-1.5">
              <Input
                value={kpi.label}
                onChange={e => updateKPI(kpiIdx, { label: e.target.value })}
                placeholder="Название KPI"
                className="h-7 text-xs"
              />
              <div className="flex items-center gap-2">
                <Select
                  value={kpi.type || 'tier'}
                  onValueChange={v => updateKPI(kpiIdx, { type: v as 'tier' | 'multiplier' })}
                >
                  <SelectTrigger className="h-7 text-xs w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tier">Уровни</SelectItem>
                    <SelectItem value="multiplier">Множитель</SelectItem>
                  </SelectContent>
                </Select>

                {kpi.type !== 'multiplier' && availableMetrics && availableMetrics.length > 0 && (
                  <Select
                    value={kpi.linkedMetricId || '_none_'}
                    onValueChange={v => updateKPI(kpiIdx, { linkedMetricId: v === '_none_' ? undefined : v })}
                  >
                    <SelectTrigger className="h-7 text-xs w-40">
                      <SelectValue placeholder="Метрика" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none_">Не привязано</SelectItem>
                      {availableMetrics.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {kpi.type === 'multiplier' && (
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">Ставка:</span>
                    <Input
                      type="number"
                      value={kpi.multiplierRate ?? 0}
                      onChange={e => updateKPI(kpiIdx, { multiplierRate: parseFloat(e.target.value) || 0 })}
                      className="h-7 text-xs w-20"
                    />
                    <span className="text-[10px] text-muted-foreground">₽</span>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => removeKPI(kpiIdx)}
              className="text-destructive hover:text-destructive/80 p-1 shrink-0"
              title="Удалить KPI"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Tiers (only for tier type) */}
          {(kpi.type !== 'multiplier') && (
            <div className="space-y-1 pl-6">
              <div className="grid grid-cols-[1fr_60px_50px_50px_20px] gap-1 text-[9px] text-muted-foreground font-medium px-1">
                <span>Уровень</span>
                <span className="text-center">Бонус ₽</span>
                <span className="text-center">Мин%</span>
                <span className="text-center">Макс%</span>
                <span></span>
              </div>
              {kpi.tiers.map((tier, tierIdx) => (
                <div key={tierIdx} className="grid grid-cols-[1fr_60px_50px_50px_20px] gap-1 items-center">
                  <Input
                    value={tier.range}
                    onChange={e => updateTier(kpiIdx, tierIdx, { range: e.target.value })}
                    className="h-6 text-[10px] px-1"
                  />
                  <Input
                    type="number"
                    value={tier.bonus}
                    onChange={e => updateTier(kpiIdx, tierIdx, { bonus: parseFloat(e.target.value) || 0 })}
                    className="h-6 text-[10px] text-center px-1"
                  />
                  <Input
                    type="number"
                    value={tier.minPercent}
                    onChange={e => updateTier(kpiIdx, tierIdx, { minPercent: parseFloat(e.target.value) || 0 })}
                    className="h-6 text-[10px] text-center px-1"
                  />
                  <Input
                    type="number"
                    value={tier.maxPercent}
                    onChange={e => updateTier(kpiIdx, tierIdx, { maxPercent: parseFloat(e.target.value) || 0 })}
                    className="h-6 text-[10px] text-center px-1"
                  />
                  {kpi.tiers.length > 1 && (
                    <button
                      onClick={() => removeTier(kpiIdx, tierIdx)}
                      className="text-destructive/60 hover:text-destructive p-0"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => addTier(kpiIdx)}
                className="h-6 text-[10px] text-primary"
              >
                <Plus className="h-3 w-3 mr-0.5" />
                Добавить уровень
              </Button>
            </div>
          )}
        </div>
      ))}

      <Button
        variant="outline"
        size="sm"
        onClick={addKPI}
        className="w-full h-8 text-xs"
      >
        <Plus className="h-3 w-3 mr-1" />
        Добавить KPI
      </Button>
    </div>
  );
}

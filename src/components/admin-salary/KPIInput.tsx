import { memo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import type { KPIConfig } from '@/data/salaryConfig';

interface KPIInputProps {
  kpi: KPIConfig;
  value: string | number | undefined;
  onChange: (kpiId: string, value: string | number | null) => void;
}

export const KPIInput = memo(function KPIInput({ kpi, value, onChange }: KPIInputProps) {
  if (kpi.type === 'multiplier') {
    return (
      <div className="flex items-center gap-1">
        <Input
          type="number"
          className="h-6 w-16 text-[11px] px-1"
          placeholder="0"
          value={value ?? ''}
          onChange={(e) => {
            const v = e.target.value;
            onChange(kpi.id, v === '' ? null : parseInt(v, 10) || 0);
          }}
        />
        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
          x{kpi.multiplierRate}
        </span>
      </div>
    );
  }

  // Tier-based KPI
  return (
    <Select
      value={value != null ? String(value) : ''}
      onValueChange={(v) => onChange(kpi.id, v || null)}
    >
      <SelectTrigger className="h-6 w-full text-[11px]">
        <SelectValue placeholder="—" />
      </SelectTrigger>
      <SelectContent>
        {kpi.tiers.map((tier) => (
          <SelectItem key={tier.range} value={tier.range} className="text-xs">
            {tier.range} ({tier.bonus.toLocaleString('ru-RU')} ₽)
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
});

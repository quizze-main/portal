import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { LoovisStoreOption } from '@/lib/internalApiClient';
import type { BranchHealth } from '@/hooks/usePlanFactDashboard';
import { getBranchOverallColor, completionDotClass } from '@/lib/planFactUtils';
import { cn } from '@/lib/utils';

interface BranchDropdownProps {
  branches: LoovisStoreOption[];
  branchHealth: Map<string, BranchHealth>;
  value: string;
  onChange: (branchId: string) => void;
}

export function BranchDropdown({ branches, branchHealth, value, onChange }: BranchDropdownProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 text-xs w-auto min-w-[140px] max-w-[200px]">
        <SelectValue placeholder="Филиал" />
      </SelectTrigger>
      <SelectContent>
        {branches.length > 1 && (
          <SelectItem value="__all__">
            <span className="text-xs">Все филиалы</span>
          </SelectItem>
        )}
        {branches.map(b => {
          const h = branchHealth.get(b.store_id);
          const color = h ? getBranchOverallColor(h) : 'gray';
          return (
            <SelectItem key={b.store_id} value={b.store_id}>
              <span className="flex items-center gap-1.5 text-xs">
                <span className={cn('w-2 h-2 rounded-full shrink-0', completionDotClass(color))} />
                <span className="truncate">{b.name}</span>
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

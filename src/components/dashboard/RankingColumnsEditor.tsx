import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  RANKING_METRIC_CONFIG,
  METRIC_NAMES,
  LOSS_COLUMN_CODE,
} from '@/hooks/useLeaderMetrics';

interface MetricOption {
  code: string;
  label: string;
}

interface RankingColumnsEditorProps {
  type: 'branch' | 'manager';
  visibleColumns: string[];
  onChange: (codes: string[]) => void;
  availableMetrics?: Array<{ id: string; name: string; trackerCode?: string }>;
}

const MIN_COLUMNS = 2;

export function RankingColumnsEditor({ type, visibleColumns, onChange, availableMetrics }: RankingColumnsEditorProps) {
  const [open, setOpen] = useState(false);

  // Merge known metrics + catalog metrics + loss column
  const allOptions: MetricOption[] = useMemo(() => {
    const known = RANKING_METRIC_CONFIG
      .filter(c => c.availableIn.includes(type))
      .map(c => ({ code: c.code, label: METRIC_NAMES[c.code] || c.label }));

    const knownCodes = new Set(known.map(k => k.code));

    // Add catalog metrics that are not already known
    const extra = (availableMetrics || [])
      .filter(m => {
        const code = m.trackerCode || m.id;
        return !knownCodes.has(code);
      })
      .map(m => ({ code: m.trackerCode || m.id, label: m.name }));

    return [...known, ...extra, { code: LOSS_COLUMN_CODE, label: 'Потери/запас' }];
  }, [type, availableMetrics]);

  const visibleSet = new Set(visibleColumns);

  const handleToggle = (code: string) => {
    if (visibleSet.has(code)) {
      if (visibleColumns.length <= MIN_COLUMNS) return;
      onChange(visibleColumns.filter(c => c !== code));
    } else {
      onChange([...visibleColumns, code]);
    }
  };

  return (
    <div className="px-3 py-2 border-b bg-muted/30 flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-3 text-[11px] sm:text-xs gap-1.5 rounded-full border-border/60 bg-background"
          >
            Метрики
            <span className="text-muted-foreground">({visibleColumns.length})</span>
            <ChevronDown className="w-3 h-3 ml-0.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-56 p-2" sideOffset={4}>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {allOptions.map(opt => {
              const checked = visibleSet.has(opt.code);
              const disabled = checked && visibleColumns.length <= MIN_COLUMNS;
              return (
                <label
                  key={opt.code}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer select-none hover:bg-muted/60 transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => handleToggle(opt.code)}
                    disabled={disabled}
                    className="h-3.5 w-3.5"
                  />
                  <span className="text-xs text-foreground">{opt.label}</span>
                </label>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

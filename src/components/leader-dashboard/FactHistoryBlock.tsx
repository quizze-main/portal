import { useMemo } from 'react';
import { CalendarCheck, Clock } from 'lucide-react';
import { Spinner } from '@/components/Spinner';
import { useFactHistory } from '@/hooks/useFactHistory';

/* ── Helpers ── */

const WEEKDAYS_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDate();
  const month = d.toLocaleDateString('ru-RU', { month: 'short' }).replace('.', '');
  return `${day} ${month}`;
}

function formatWeekday(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return WEEKDAYS_SHORT[d.getDay()];
}

function formatNumber(n: number): string {
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/* ── Types ── */

interface FactHistoryBlockProps {
  storeId?: string;
  /** Number of days to look back */
  days?: number;
}

/* ── Component ── */

export function FactHistoryBlock({ storeId, days = 14 }: FactHistoryBlockProps) {
  const { data, isLoading } = useFactHistory(storeId, days);
  const today = todayStr();

  // Build a table: rows = dates, columns = metrics
  const { dates, metricColumns, grid } = useMemo(() => {
    if (!data?.history) return { dates: [] as string[], metricColumns: [] as { id: string; name: string; color?: string; unit?: string }[], grid: {} as Record<string, Record<string, number | null>> };

    const metricIds = Object.keys(data.history);
    const cols = metricIds.map(id => ({
      id,
      name: data.history[id].name,
      color: data.history[id].color,
      unit: data.history[id].unit,
    }));

    // Collect all dates
    const dateSet = new Set<string>();
    for (const m of metricIds) {
      for (const e of data.history[m].entries) {
        dateSet.add(e.date);
      }
    }
    const sortedDates = Array.from(dateSet).sort().reverse();

    // Build grid: grid[date][metricId] = fact | null
    const g: Record<string, Record<string, number | null>> = {};
    for (const d of sortedDates) {
      g[d] = {};
      for (const m of metricIds) {
        const entry = data.history[m].entries.find(e => e.date === d);
        g[d][m] = entry ? entry.fact : null;
      }
    }

    return { dates: sortedDates, metricColumns: cols, grid: g };
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Spinner />
      </div>
    );
  }

  if (dates.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center">
        <Clock className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Нет данных за последние {days} дней</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <CalendarCheck className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Заполненные факты</h3>
        <span className="text-[11px] text-muted-foreground">последние {days} дней</span>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground whitespace-nowrap sticky left-0 bg-muted/40 z-10">
                  Дата
                </th>
                {metricColumns.map(col => (
                  <th key={col.id} className="text-right px-3 py-2 text-xs font-medium text-muted-foreground whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: col.color || '#3b82f6' }} />
                      <span className="truncate max-w-[100px]">{col.name}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dates.map((date, idx) => {
                const isToday = date === today;
                const wd = formatWeekday(date);
                const isWeekend = wd === 'сб' || wd === 'вс';
                return (
                  <tr
                    key={date}
                    className={`border-b last:border-b-0 transition-colors ${
                      isToday ? 'bg-primary/5' : isWeekend ? 'bg-muted/20' : ''
                    }`}
                  >
                    <td className={`px-3 py-2 whitespace-nowrap sticky left-0 z-10 ${
                      isToday ? 'bg-primary/5' : isWeekend ? 'bg-muted/20' : 'bg-card'
                    }`}>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium">{formatDateShort(date)}</span>
                        <span className={`text-[10px] ${isToday ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                          {isToday ? 'сегодня' : wd}
                        </span>
                      </div>
                    </td>
                    {metricColumns.map(col => {
                      const val = grid[date]?.[col.id];
                      return (
                        <td key={col.id} className="text-right px-3 py-2 tabular-nums whitespace-nowrap">
                          {val != null ? (
                            <span className="text-xs font-medium text-foreground">
                              {formatNumber(val)}
                              {col.unit && <span className="text-muted-foreground ml-0.5">{col.unit}</span>}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground/40">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

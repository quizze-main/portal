import { TrendingUp, TrendingDown } from 'lucide-react';

interface KpiMetric {
  name: string;
  fact: number;
  plan: number;
  unit: string;
  trend: 'up' | 'down';
}

const MOCK_METRICS: KpiMetric[] = [
  { name: 'Выручка СЗ', fact: 847_200, plan: 920_000, unit: '\u20BD', trend: 'up' },
  { name: 'Конверсия', fact: 68, plan: 60, unit: '%', trend: 'up' },
  { name: 'CSI', fact: 4.7, plan: 4.5, unit: '', trend: 'up' },
  { name: 'Средний чек', fact: 12_400, plan: 15_000, unit: '\u20BD', trend: 'down' },
];

function formatValue(value: number, unit: string) {
  if (unit === '\u20BD') return `${value.toLocaleString('ru-RU')} ${unit}`;
  if (unit === '%') return `${value}${unit}`;
  return `${value}`;
}

export function InteractiveKpiCard() {
  return (
    <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
      {MOCK_METRICS.map((metric) => {
        const pct = Math.round((metric.fact / metric.plan) * 100);
        const isGood = pct >= 95;
        const isWarn = pct >= 80 && pct < 95;
        const barColor = isGood ? 'bg-emerald-500' : isWarn ? 'bg-amber-500' : 'bg-red-500';
        const textColor = isGood ? 'text-emerald-600' : isWarn ? 'text-amber-600' : 'text-red-600';

        return (
          <div
            key={metric.name}
            className="p-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{metric.name}</span>
              <div className={`flex items-center gap-0.5 text-xs ${textColor}`}>
                {metric.trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {pct}%
              </div>
            </div>
            <div className="text-base font-bold text-gray-900 dark:text-white mb-1">
              {formatValue(metric.fact, metric.unit)}
            </div>
            <div className="text-[11px] text-gray-400 mb-2">
              План: {formatValue(metric.plan, metric.unit)}
            </div>
            <div className="h-1 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

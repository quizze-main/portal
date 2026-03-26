import { PhoneMockup } from './PhoneMockup';
import type { ScreenshotInfo } from './moduleData';

interface BrowserMockupProps {
  children: React.ReactNode;
  className?: string;
  url?: string;
  /** Use plain white background instead of gradient (for real screenshots) */
  noBackground?: boolean;
}

export function BrowserMockup({ children, className = '', url = 'app.overbrain.io', noBackground = false }: BrowserMockupProps) {
  return (
    <div className={`rounded-2xl overflow-hidden border border-gray-200/60 dark:border-gray-700/60 bg-white dark:bg-gray-900 ${className}`}>
      {/* Browser chrome */}
      <div className="bg-gray-50 dark:bg-gray-800/80 px-4 py-2.5 flex items-center gap-3 border-b border-gray-100 dark:border-gray-700/50">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
          <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
          <div className="w-3 h-3 rounded-full bg-[#28C840]" />
        </div>
        <div className="flex-1 bg-gray-100 dark:bg-gray-700/50 rounded-lg px-3 py-1.5 text-xs text-gray-400 dark:text-gray-500 truncate font-mono">
          {url}
        </div>
      </div>
      {/* Content */}
      <div className={noBackground ? 'bg-white dark:bg-gray-900' : 'bg-gradient-to-br from-blue-50/50 via-white to-purple-50/50 dark:from-gray-900 dark:via-gray-850 dark:to-gray-900'}>
        {children}
      </div>
    </div>
  );
}

/** Renders a real screenshot inside a BrowserMockup (desktop) or PhoneMockup (mobile) */
export function ScreenshotMockup({
  src, alt, variant, url, className = '',
}: ScreenshotInfo & { className?: string }) {
  if (variant === 'mobile') {
    return (
      <div className="flex justify-center">
        <PhoneMockup>
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-cover object-top"
            loading="lazy"
          />
        </PhoneMockup>
      </div>
    );
  }

  return (
    <BrowserMockup className={className} url={url} noBackground>
      <img
        src={src}
        alt={alt}
        className="w-full h-auto"
        loading="lazy"
      />
    </BrowserMockup>
  );
}

/** KPI Dashboard mockup */
export function DashboardMockup({ className = '' }: { className?: string }) {
  return (
    <BrowserMockup className={className}>
      <div className="p-5 space-y-4">
        {/* Header bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
              <span className="text-white text-xs font-bold">O</span>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">Overbrain</div>
              <div className="text-[10px] text-gray-400">Дашборд руководителя</div>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-[10px] font-medium text-blue-600 dark:text-blue-400">Март 2026</div>
          </div>
        </div>

        {/* Top metrics row */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Выручка', value: '₽1,757K', plan: '₽1,921K', pct: 92, color: 'from-emerald-400 to-emerald-500' },
            { label: 'Конверсия', value: '68%', plan: '60%', pct: 113, color: 'from-blue-400 to-blue-500' },
            { label: 'Средний чек', value: '₽12.4K', plan: '₽15K', pct: 83, color: 'from-amber-400 to-amber-500' },
            { label: 'CSI', value: '4.7', plan: '4.5', pct: 104, color: 'from-purple-400 to-purple-500' },
          ].map((m) => (
            <div key={m.label} className="bg-white dark:bg-gray-800/60 rounded-xl p-3 border border-gray-100 dark:border-gray-700/50 shadow-sm">
              <div className="text-[10px] text-gray-400 mb-1.5 font-medium">{m.label}</div>
              <div className="text-base font-bold text-gray-900 dark:text-white">{m.value}</div>
              <div className="text-[9px] text-gray-400 mb-2">План: {m.plan}</div>
              <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full bg-gradient-to-r ${m.color}`} style={{ width: `${Math.min(m.pct, 100)}%` }} />
              </div>
              <div className="text-right mt-1">
                <span className={`text-[9px] font-semibold ${m.pct >= 100 ? 'text-emerald-500' : m.pct >= 85 ? 'text-amber-500' : 'text-red-400'}`}>
                  {m.pct}%
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Chart area */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 bg-white dark:bg-gray-800/60 rounded-xl p-4 border border-gray-100 dark:border-gray-700/50 shadow-sm">
            <div className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-3">Выручка по дням</div>
            <div className="flex items-end gap-[3px] h-20">
              {[35, 50, 42, 58, 70, 48, 62, 78, 65, 82, 55, 68, 88, 72, 92, 60, 75, 85].map((h, i) => (
                <div key={i} className="flex-1 bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-sm opacity-80 hover:opacity-100 transition-opacity" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>

          {/* Ranking mini */}
          <div className="bg-white dark:bg-gray-800/60 rounded-xl p-4 border border-gray-100 dark:border-gray-700/50 shadow-sm">
            <div className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-3">Топ менеджеры</div>
            {[
              { name: 'Иванова А.', pct: 113 },
              { name: 'Петров М.', pct: 107 },
              { name: 'Сидорова К.', pct: 98 },
              { name: 'Козлов Д.', pct: 94 },
            ].map((m, i) => (
              <div key={m.name} className="flex items-center gap-2 py-1.5">
                <span className={`text-[10px] font-bold w-4 ${i === 0 ? 'text-amber-500' : 'text-gray-400'}`}>{i + 1}</span>
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-200 to-indigo-300 dark:from-blue-700 dark:to-indigo-700 flex items-center justify-center">
                  <span className="text-[8px] font-bold text-blue-700 dark:text-blue-200">{m.name[0]}</span>
                </div>
                <span className="text-[11px] text-gray-600 dark:text-gray-400 flex-1 truncate">{m.name}</span>
                <span className={`text-[10px] font-semibold ${m.pct >= 100 ? 'text-emerald-500' : 'text-amber-500'}`}>{m.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </BrowserMockup>
  );
}

/** Salary calculator mockup */
export function SalaryMockup({ className = '' }: { className?: string }) {
  return (
    <BrowserMockup className={className}>
      <div className="p-5 space-y-4">
        <div className="text-center py-2">
          <div className="text-[11px] text-gray-400 mb-1 font-medium">Расчётная зарплата за март</div>
          <div className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">₽ 87,400</div>
        </div>
        <div className="space-y-2.5">
          {[
            { label: 'Оклад', value: '₽45,000', color: 'from-gray-300 to-gray-400', width: '52%' },
            { label: 'Бонус за выручку', value: '₽28,400', color: 'from-emerald-400 to-emerald-500', width: '33%' },
            { label: 'KPI × 1.12', value: '₽8,200', color: 'from-blue-400 to-blue-500', width: '9%' },
            { label: 'CSI бонус', value: '₽5,800', color: 'from-purple-400 to-purple-500', width: '6%' },
          ].map((row) => (
            <div key={row.label} className="bg-white dark:bg-gray-800/60 rounded-xl p-3 border border-gray-100 dark:border-gray-700/50 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">{row.label}</span>
                <span className="text-[12px] font-bold text-gray-900 dark:text-white">{row.value}</span>
              </div>
              <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full bg-gradient-to-r ${row.color}`} style={{ width: row.width }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </BrowserMockup>
  );
}

/** Schedule mockup */
export function ScheduleMockup({ className = '' }: { className?: string }) {
  return (
    <BrowserMockup className={className}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[11px] font-semibold text-gray-600 dark:text-gray-400">Март 2026</div>
          <div className="flex gap-1">
            <div className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-[9px] font-medium text-blue-600">2/2</div>
            <div className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-[9px] text-gray-400">5/2</div>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d) => (
            <div key={d} className="text-[8px] text-gray-400 py-1 font-medium">{d}</div>
          ))}
          {Array.from({ length: 31 }, (_, i) => {
            const shifts = [0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1];
            const isShift = shifts[i];
            return (
              <div
                key={i}
                className={`text-[9px] py-1.5 rounded-lg transition-colors ${isShift ? 'bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 text-blue-700 dark:text-blue-300 font-semibold' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
              >
                {i + 1}
              </div>
            );
          })}
        </div>
      </div>
    </BrowserMockup>
  );
}

/** Generic feature mockup with placeholder */
export function FeatureMockup({ label, className = '' }: { label: string; className?: string }) {
  return (
    <BrowserMockup className={className}>
      <div className="p-8 min-h-[220px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 mx-auto mb-3 flex items-center justify-center shadow-inner">
            <span className="text-2xl">📸</span>
          </div>
          <p className="text-sm text-gray-400 font-medium">{label}</p>
        </div>
      </div>
    </BrowserMockup>
  );
}

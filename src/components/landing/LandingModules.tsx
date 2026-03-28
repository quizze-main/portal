import { useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { MODULES } from './moduleData';
import { useFadeInOnScroll } from '@/hooks/useFadeInOnScroll';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ArrowRight } from 'lucide-react';

/** Returns current grid column count matching Tailwind breakpoints: 3 / 4 / 5 */
function useGridCols(): number {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener('resize', cb);
      return () => window.removeEventListener('resize', cb);
    },
    () => (window.innerWidth >= 1024 ? 5 : window.innerWidth >= 640 ? 4 : 3),
    () => 5, // SSR fallback
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Per-card competitor labels — unified for all breakpoints.
   Corner is computed dynamically based on grid column count so the
   same checkerboard pattern works at 3, 4, and 5 columns.

   Formula:
     row = floor(index / cols)
     vertical = row === 0 ? 'top' : 'bottom'
     horizontal = row % 2 === 0 ? 'left' : 'right'

   This yields no adjacent overlap at any column count.
   ═══════════════════════════════════════════════════════════════════ */

type Corner = 'top-right';

function getCorner(_index: number, _cols: number): Corner {
  return 'top-right';
}

interface ModuleLabel {
  label: string;
  rotation: number;
}

const LABELS: Record<string, ModuleLabel> = {
  'leader-dashboard':  { label: 'Tableau / Power BI', rotation: -4 },
  'manager-dashboard': { label: 'Excel-сводки',       rotation: 5 },
  'forecasting':       { label: 'Прогнозы в Excel',   rotation: -3 },
  'salary-calculator': { label: '1С ЗУП + Excel',    rotation: -5 },
  'shift-schedule':    { label: 'Excel-таблицы',      rotation: 5 },
  'employee-profile':  { label: 'ERP карточки',       rotation: -3 },
  'task-management':   { label: 'Trello / Asana',     rotation: 4 },
  'plan-fact':         { label: 'Excel-таблицы',      rotation: 3 },
  'knowledge-base':    { label: 'Notion / Confluence', rotation: -4 },
  'integrations':      { label: 'Zapier / ручная',    rotation: -3 },
  'telegram-bot':      { label: 'Нативное приложение', rotation: 4 },
  'org-communications':{ label: 'Чаты и звонки',      rotation: -3 },
  'flexible-settings': { label: 'Ручная настройка',   rotation: -5 },
};

/** Short labels for small screens (≤sm) */
const SHORT_LABELS: Record<string, string> = {
  'leader-dashboard': 'Tableau', 'manager-dashboard': 'Excel',
  'forecasting': 'Excel', 'salary-calculator': '1С ЗУП',
  'shift-schedule': 'Excel', 'employee-profile': 'ERP',
  'task-management': 'Trello', 'plan-fact': 'Excel',
  'knowledge-base': 'Notion', 'integrations': 'Zapier',
  'telegram-bot': 'Натив', 'org-communications': 'Чаты', 'flexible-settings': 'Вручную',
};

/** Position classes — labels inside top-right corner of the card */
const CORNER_STYLE: Record<Corner, string> = {
  'top-right': 'right-1 top-1',
};

function FadeIn({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const { ref, isVisible } = useFadeInOnScroll();
  return (
    <div ref={ref} className={`transition-all duration-700 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */

interface LandingModulesProps {
  onRequestDemo?: () => void;
}

export function LandingModules({ onRequestDemo }: LandingModulesProps) {
  const [showCompetitors, setShowCompetitors] = useState(false);
  const cols = useGridCols();

  return (
    <section id="modules" className="py-16 md:py-24 px-6">
      <div className="max-w-[960px] mx-auto">
        {/* Header */}
        <FadeIn>
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4 uppercase tracking-wider">
              12 модулей
            </Badge>
            <h2 className="text-[1.75rem] md:text-[2.25rem] font-bold text-foreground mb-4 tracking-tight">
              Всё, что нужно вашей сети в одном месте
            </h2>
            <p className="text-muted-foreground text-lg max-w-lg mx-auto">
              Нажмите на модуль, чтобы узнать подробнее
            </p>
          </div>
        </FadeIn>

        {/* Toggle — above grid */}
        <FadeIn>
          <div className="flex items-center justify-center mb-8">
            <button
              onClick={() => setShowCompetitors(!showCompetitors)}
              className={`relative inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full border text-sm font-medium transition-all duration-300 cursor-pointer select-none ${
                showCompetitors
                  ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 shadow-sm'
                  : 'bg-muted/50 border-border text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <span
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-300 ${
                  showCompetitors ? 'bg-rose-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-300 ${
                    showCompetitors ? 'translate-x-[18px]' : 'translate-x-[3px]'
                  }`}
                />
              </span>
              <Sparkles className={`w-3.5 h-3.5 transition-colors duration-300 ${showCompetitors ? 'text-rose-500' : 'text-muted-foreground/50'}`} />
              <span>Бизнес без Overbrain</span>
            </button>
          </div>
        </FadeIn>

        {/* Module grid — single layout for all breakpoints */}
        <FadeIn>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-4 lg:gap-5">
            {MODULES.map((mod, i) => {
              const Icon = mod.icon;
              const labelData = LABELS[mod.slug];
              const corner = getCorner(i, cols);
              const shortLabel = SHORT_LABELS[mod.slug];

              return (
                <Link
                  key={mod.slug}
                  to={`/landing/module/${mod.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative flex flex-col items-center gap-2 p-3 md:p-4 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-md transition-all duration-200"
                >
                  {/* Competitor label — corner-anchored at all breakpoints */}
                  {showCompetitors && labelData && (
                    <span
                      className={`absolute ${CORNER_STYLE[corner]} z-10 competitor-label whitespace-nowrap px-1 lg:px-1.5 py-0.5 rounded text-rose-600 dark:text-rose-400 pointer-events-none select-none`}
                      style={{
                        fontFamily: "'Caveat', cursive",
                        fontSize: 'clamp(11px, 2vw, 15px)',
                        fontWeight: 600,
                        transform: `rotate(${labelData.rotation}deg)`,
                        animationDelay: `${i * 40}ms`,
                        background: 'linear-gradient(135deg, rgba(255,228,230,0.9), rgba(254,205,211,0.75))',
                      }}
                    >
                      {/* Full label on sm+, short on mobile */}
                      <span className="hidden sm:inline">{labelData.label}</span>
                      <span className="sm:hidden">{shortLabel || labelData.label}</span>
                    </span>
                  )}

                  {/* Module icon */}
                  <div className={`w-11 h-11 md:w-14 md:h-14 rounded-xl ${mod.color} flex items-center justify-center transition-transform duration-200 group-hover:scale-105`}>
                    <Icon className={`w-5 h-5 md:w-6 md:h-6 ${mod.iconColor}`} />
                  </div>

                  {/* Module name */}
                  <span className="text-[11px] md:text-xs font-medium text-foreground text-center leading-tight group-hover:text-primary transition-colors">
                    {mod.name}
                  </span>

                  {/* Metric badge */}
                  {mod.metrics?.profitLabel && (
                    <span className="text-[9px] md:text-[10px] text-emerald-600 dark:text-emerald-400 font-medium leading-tight text-center">
                      {mod.metrics.profitLabel}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </FadeIn>

        {/* CTA button */}
        <FadeIn>
          <div className="flex items-center justify-center mt-10">
            <button
              onClick={onRequestDemo}
              className="inline-flex items-center gap-2.5 px-7 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm cursor-pointer select-none transition-all duration-300"
            >
              Попробовать Overbrain
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </FadeIn>
      </div>

      <style>{`
        @keyframes competitorPopIn {
          0% { opacity: 0; scale: 0.7; }
          70% { scale: 1.05; }
          100% { opacity: 1; scale: 1; }
        }
        .competitor-label {
          animation: competitorPopIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
      `}</style>
    </section>
  );
}

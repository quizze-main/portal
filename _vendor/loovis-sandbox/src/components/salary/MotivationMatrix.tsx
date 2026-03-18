import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIsMobile } from '@/hooks/use-mobile';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  MANAGER_LEVELS,
  CLUB_LEVELS,
  MOTIVATION_MATRIX,
  BASE_SALARY,
  type ManagerLevel,
  type ClubLevel,
  type MatchingCell,
  type MotivationMatrixType,
} from '@/data/salaryConfig';

// Рассчитать динамические пороги для раскраски ячеек
function getMatrixThresholds(matrix: MotivationMatrixType): {
  min: number;
  max: number;
  lowThreshold: number;
  highThreshold: number;
} {
  const allValues: number[] = [];
  
  for (const clubLevel of CLUB_LEVELS) {
    for (const managerLevel of MANAGER_LEVELS) {
      allValues.push(matrix[clubLevel][managerLevel]);
    }
  }
  
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min;
  
  return {
    min,
    max,
    lowThreshold: min + range / 3,
    highThreshold: min + (range * 2) / 3,
  };
}

type DisplayMode = 'percent' | 'amount' | 'total';

interface MotivationMatrixProps {
  currentManagerLevel: ManagerLevel;
  currentClubLevel: ClubLevel;
  personalFact: number;
  personalPlan: number;
  matchingCells?: MatchingCell[];
  currentBonusPercent?: number;
  onCellClick?: (clubLevel: ClubLevel, managerLevel: ManagerLevel) => void;
  matrix?: MotivationMatrixType;
  baseSalary?: number;
}

// Минимальный процент выполнения для каждого уровня менеджера
function getMinPercentForManagerLevel(level: ManagerLevel): number {
  switch (level) {
    case '130%': return 130;
    case '120%': return 120;
    case '110%': return 110;
    case '100%': return 100;
    default: return 87; // <100% — используем типичный процент
  }
}

function formatFull(value: number): string {
  return Math.round(value).toLocaleString('ru-RU');
}

function formatCurrency(value: number): string {
  return Math.round(value).toLocaleString('ru-RU') + ' ₽';
}

export function MotivationMatrix({
  currentManagerLevel,
  currentClubLevel,
  personalFact,
  personalPlan,
  matchingCells,
  currentBonusPercent,
  onCellClick,
  matrix = MOTIVATION_MATRIX,
  baseSalary = BASE_SALARY,
}: MotivationMatrixProps) {
  const [mode, setMode] = useState<DisplayMode>('percent');
  const isMobile = useIsMobile();

  // Используем переданную матрицу вместо глобальной

  // Адаптивный размер шрифта: меньше для длинных чисел на мобильном
  const getCellFontSize = (): string => {
    if (mode === 'percent') {
      return 'text-xs';
    }
    // Для ₽ и Итого — меньший шрифт
    return 'text-[10px] sm:text-xs';
  };

  const getCellValue = (clubLevel: ClubLevel, managerLevel: ManagerLevel): string => {
    const percent = matrix[clubLevel][managerLevel];
    
    // Проверяем: это текущая позиция?
    const isCurrentPosition = clubLevel === currentClubLevel && managerLevel === currentManagerLevel;
    
    // Для текущей позиции — используем реальный personalFact
    // Для остальных — пороговые значения уровней
    let factForLevel: number;
    if (isCurrentPosition) {
      factForLevel = personalFact;
    } else {
      const levelPercent = getMinPercentForManagerLevel(managerLevel);
      factForLevel = personalPlan * (levelPercent / 100);
    }
    
    // Премия = факт × процент матрицы
    const amount = factForLevel * (percent / 100);
    const total = baseSalary + amount;

    switch (mode) {
      case 'percent':
        return `${percent}%`;
      case 'amount':
        return formatFull(amount);
      case 'total':
        return formatFull(total);
    }
  };

  const getCellStyle = (
    clubLevel: ClubLevel,
    managerLevel: ManagerLevel
  ): string => {
    const cellPercent = matrix[clubLevel][managerLevel];
    
    // Текущая позиция по слайдерам — основная ячейка с solid ring
    const isCurrentPosition =
      clubLevel === currentClubLevel && managerLevel === currentManagerLevel;

    if (isCurrentPosition) {
      return 'bg-primary text-primary-foreground font-bold ring-2 ring-primary ring-offset-2';
    }

    // Альтернативные ячейки с таким же % премии — полупрозрачные с dashed border
    if (currentBonusPercent !== undefined && cellPercent === currentBonusPercent) {
      return 'bg-primary/20 text-primary font-semibold border-2 border-dashed border-primary/50';
    }

    // Проверяем matchingCells (для режима без currentBonusPercent)
    if (matchingCells && matchingCells.length > 0) {
      const matchingCell = matchingCells.find(
        c => c.clubLevel === clubLevel && c.managerLevel === managerLevel
      );

      if (matchingCell?.isBest) {
        return 'bg-primary text-primary-foreground font-bold ring-2 ring-primary ring-offset-2';
      }

      if (matchingCell) {
        return 'bg-primary/30 text-primary font-semibold ring-1 ring-primary/50';
      }
    }

    // Динамические цвета на основе порогов матрицы
    const { lowThreshold, highThreshold } = thresholds;
    
    // Верхняя треть: зелёный
    if (cellPercent >= highThreshold) {
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400';
    }
    
    // Средняя треть: синий
    if (cellPercent >= lowThreshold) {
      return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400';
    }
    
    // Нижняя треть: серый
    return 'bg-muted/50 text-muted-foreground';
  };

  // Вычисляем пороги для текущей матрицы
  const thresholds = getMatrixThresholds(matrix);

  const currentPercent = matrix[currentClubLevel][currentManagerLevel];
  const currentAmount = personalFact * (currentPercent / 100);

  const clubLabels: Record<ClubLevel, string> = {
    '<95%': '<95',
    '100%': '100',
    '110%>': '≥110',
  };

  const managerLabels: Record<ManagerLevel, string> = {
    '<100%': '<100',
    '100%': '100',
    '110%': '110',
    '120%': '120',
    '130%': '130',
  };

  return (
    <div className="bg-card rounded-2xl p-3 sm:p-4 shadow-card border-0">
      {/* Заголовок */}
      <h3 className="text-sm font-medium text-foreground mb-3">Матрица премий</h3>

      {/* Табы */}
      <Tabs value={mode} onValueChange={(v) => setMode(v as DisplayMode)} className="mb-3">
        <TabsList className="grid w-full grid-cols-3 h-8">
          <TabsTrigger value="percent" className="text-xs py-1">%</TabsTrigger>
          <TabsTrigger value="amount" className="text-xs py-1">₽</TabsTrigger>
          <TabsTrigger value="total" className="text-xs py-1">Итого</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Заголовок оси X — План менеджера по СЗ */}
      <div className="text-center mb-2">
        <span className="text-[10px] text-muted-foreground font-medium">
          План менеджера по СЗ, %
        </span>
      </div>

      {/* Матрица с горизонтальным скроллом */}
      <div className="overflow-x-auto overflow-y-hidden -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-hide">
        <div className="min-w-[320px] sm:min-w-[360px] flex">
          {/* Заголовок оси Y — План клуба */}
          <div className="flex items-center justify-center w-4 mr-1 flex-shrink-0">
            <span 
              className="text-[10px] text-muted-foreground font-medium whitespace-nowrap"
              style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}
            >
              План филиала по СЗ, %
            </span>
          </div>

          {/* Сама матрица */}
          <div className="flex-1">
            {/* Заголовки столбцов */}
            <div className="grid grid-cols-[28px_repeat(5,minmax(48px,1fr))] sm:grid-cols-[40px_repeat(5,1fr)] gap-1 mb-1">
              <div></div>
              {MANAGER_LEVELS.map((level) => (
                <div
                  key={level}
                  className="text-[9px] sm:text-[10px] text-center text-muted-foreground font-medium py-1"
                >
                  {managerLabels[level]}
                </div>
              ))}
            </div>

            {/* Строки матрицы */}
            {[...CLUB_LEVELS].reverse().map((clubLevel) => (
              <div
                key={clubLevel}
                className="grid grid-cols-[28px_repeat(5,minmax(48px,1fr))] sm:grid-cols-[40px_repeat(5,1fr)] gap-1 mb-1"
              >
                <div className="flex items-center justify-center text-[9px] sm:text-[10px] text-muted-foreground font-medium">
                  {clubLabels[clubLevel]}
                </div>

                {MANAGER_LEVELS.map((managerLevel) => {
                  const cellPercent = matrix[clubLevel][managerLevel];
                  const isCurrentPosition =
                    clubLevel === currentClubLevel && managerLevel === currentManagerLevel;
                  const isAlternative = !isCurrentPosition &&
                    currentBonusPercent !== undefined &&
                    cellPercent === currentBonusPercent;

                  return (
                    <div
                      key={`${clubLevel}-${managerLevel}`}
                      onClick={() => isAlternative && onCellClick?.(clubLevel, managerLevel)}
                      className={`
                        h-9 sm:h-10 flex items-center justify-center rounded-lg
                        ${getCellFontSize()} font-medium transition-all
                        ${getCellStyle(clubLevel, managerLevel)}
                        ${isAlternative ? 'cursor-pointer hover:ring-2 hover:ring-primary/70 hover:scale-[1.02] active:scale-[0.98]' : ''}
                      `}
                    >
                      {getCellValue(clubLevel, managerLevel)}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Индикатор скролла на мобильном */}
      {isMobile && (mode === 'amount' || mode === 'total') && (
        <div className="flex items-center justify-center gap-1 mt-2 text-muted-foreground">
          <ChevronLeft className="h-3 w-3" />
          <span className="text-[10px]">листайте</span>
          <ChevronRight className="h-3 w-3" />
        </div>
      )}

      {/* Текущая позиция */}
      <div className="mt-3 py-2 text-center border-t border-border">
        <span className="text-xs text-muted-foreground">Позиция: </span>
        <span className="text-sm font-semibold text-primary">
          {currentPercent}% → {formatCurrency(currentAmount)}
        </span>
      </div>

      {/* Легенда цветов с динамическими порогами */}
      <div className="flex items-center justify-center gap-4 pt-2 border-t border-border">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-muted/50" />
          <span className="text-[10px] text-muted-foreground">{`< ${thresholds.lowThreshold.toFixed(1)}%`}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-blue-100 dark:bg-blue-500/20" />
          <span className="text-[10px] text-muted-foreground">{`${thresholds.lowThreshold.toFixed(1)}-${thresholds.highThreshold.toFixed(1)}%`}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-emerald-100 dark:bg-emerald-500/20" />
          <span className="text-[10px] text-muted-foreground">{`≥ ${thresholds.highThreshold.toFixed(1)}%`}</span>
        </div>
      </div>
    </div>
  );
}

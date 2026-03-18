import { useState, useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useIsMobile } from '@/hooks/use-mobile';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  MOTIVATION_MATRIX,
  BASE_SALARY,
  DEFAULT_MANAGER_LEVELS,
  DEFAULT_CLUB_LEVELS,
  DEFAULT_MANAGER_AXIS_LABEL,
  DEFAULT_CLUB_AXIS_LABEL,
  getMinPercentForLevel,
  generateLevelLabel,
  type ManagerLevel,
  type ClubLevel,
  type MatchingCell,
  type MotivationMatrixType,
  type LevelDefinition,
  type BranchPositionConfig,
} from '@/data/salaryConfig';

// Рассчитать динамические пороги для раскраски ячеек
function getMatrixThresholds(matrix: MotivationMatrixType, clubLabels: string[], mgrLabels: string[]): {
  min: number;
  max: number;
  lowThreshold: number;
  highThreshold: number;
} {
  const allValues: number[] = [];

  for (const cl of clubLabels) {
    for (const ml of mgrLabels) {
      const v = matrix[cl]?.[ml];
      if (v !== undefined) allValues.push(v);
    }
  }

  if (allValues.length === 0) return { min: 0, max: 0, lowThreshold: 0, highThreshold: 0 };

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

// Сделать короткую метку для отображения в заголовке
function shortLabel(label: string): string {
  return label.replace('%>', '').replace('%', '').replace('>', '≥');
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
  config?: BranchPositionConfig;
  // Edit mode
  isEditMode?: boolean;
  onMatrixChange?: (matrix: MotivationMatrixType) => void;
  onManagerLevelsChange?: (levels: LevelDefinition[]) => void;
  onClubLevelsChange?: (levels: LevelDefinition[]) => void;
  onManagerAxisLabelChange?: (label: string) => void;
  onClubAxisLabelChange?: (label: string) => void;
  // Привязка к метрикам
  onManagerLinkedMetricChange?: (metricId: string | null) => void;
  onClubLinkedMetricChange?: (metricId: string | null) => void;
  availableMetrics?: Array<{ id: string; name: string }>;
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
  config,
  isEditMode = false,
  onMatrixChange,
  onManagerLevelsChange,
  onClubLevelsChange,
  onManagerAxisLabelChange,
  onClubAxisLabelChange,
  onManagerLinkedMetricChange,
  onClubLinkedMetricChange,
  availableMetrics,
}: MotivationMatrixProps) {
  const [mode, setMode] = useState<DisplayMode>('percent');
  const isMobile = useIsMobile();

  // Уровни из конфигурации или дефолтные
  const mgrLevels = config?.managerLevels ?? DEFAULT_MANAGER_LEVELS;
  const clbLevels = config?.clubLevels ?? DEFAULT_CLUB_LEVELS;
  const mgrLabels = useMemo(() => mgrLevels.map(l => l.label), [mgrLevels]);
  const clbLabels = useMemo(() => clbLevels.map(l => l.label), [clbLevels]);
  const colCount = mgrLabels.length;

  // 1D detection и кастомные лейблы осей
  const isClubCollapsed = clbLevels.length === 1;
  const isMgrCollapsed = mgrLevels.length === 1;
  const managerAxisLabel = config?.managerAxisLabel ?? DEFAULT_MANAGER_AXIS_LABEL;
  const clubAxisLabel = config?.clubAxisLabel ?? DEFAULT_CLUB_AXIS_LABEL;

  // Названия привязанных метрик для отображения на осях
  const managerMetricName = useMemo(() => {
    if (!config?.managerLinkedMetricId || !availableMetrics) return null;
    return availableMetrics.find(m => m.id === config.managerLinkedMetricId)?.name ?? null;
  }, [config?.managerLinkedMetricId, availableMetrics]);
  const clubMetricName = useMemo(() => {
    if (!config?.clubLinkedMetricId || !availableMetrics) return null;
    return availableMetrics.find(m => m.id === config.clubLinkedMetricId)?.name ?? null;
  }, [config?.clubLinkedMetricId, availableMetrics]);

  // Вычисляем пороги для текущей матрицы
  const thresholds = useMemo(
    () => getMatrixThresholds(matrix, clbLabels, mgrLabels),
    [matrix, clbLabels, mgrLabels]
  );

  const getMinPercentForMgrLevel = (level: string): number => {
    return getMinPercentForLevel(level, mgrLevels);
  };

  // Адаптивный размер шрифта
  const getCellFontSize = (): string => {
    if (mode === 'percent') return 'text-xs';
    return 'text-[10px] sm:text-xs';
  };

  const getCellValue = (clubLevel: string, managerLevel: string): string => {
    const percent = matrix[clubLevel]?.[managerLevel] ?? 0;

    const isCurrentPosition = clubLevel === currentClubLevel && managerLevel === currentManagerLevel;

    let factForLevel: number;
    if (isCurrentPosition) {
      factForLevel = personalFact;
    } else {
      const levelPercent = getMinPercentForMgrLevel(managerLevel) || 87;
      factForLevel = personalPlan * (levelPercent / 100);
    }

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

  const getCellStyle = (clubLevel: string, managerLevel: string): string => {
    const cellPercent = matrix[clubLevel]?.[managerLevel] ?? 0;

    const isCurrentPosition = clubLevel === currentClubLevel && managerLevel === currentManagerLevel;

    if (isCurrentPosition) {
      return 'bg-primary text-primary-foreground font-bold ring-2 ring-primary ring-offset-2';
    }

    if (currentBonusPercent !== undefined && cellPercent === currentBonusPercent) {
      return 'bg-primary/20 text-primary font-semibold border-2 border-dashed border-primary/50';
    }

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

    const { lowThreshold, highThreshold } = thresholds;

    if (cellPercent >= highThreshold) {
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400';
    }

    if (cellPercent >= lowThreshold) {
      return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400';
    }

    return 'bg-muted/50 text-muted-foreground';
  };

  const currentPercent = matrix[currentClubLevel]?.[currentManagerLevel] ?? 0;
  const currentAmount = personalFact * (currentPercent / 100);

  // --- Edit mode handlers ---

  const handleCellChange = (clubLevel: string, managerLevel: string, value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    const newMatrix = { ...matrix };
    newMatrix[clubLevel] = { ...newMatrix[clubLevel], [managerLevel]: num };
    onMatrixChange?.(newMatrix);
  };

  // --- Helpers: sort + relabel + track identity through sort ---

  type TaggedEntry = { threshold: number; origIdx: number };

  /** Sort entries by threshold, generate labels, build old→new rename map */
  const processLevelChange = (
    oldLevels: LevelDefinition[],
    entries: TaggedEntry[],
  ) => {
    const sorted = [...entries].sort((a, b) => a.threshold - b.threshold);
    const tempLevels = sorted.map(e => ({ label: '', threshold: e.threshold }));
    const newLevels = sorted.map((e, i) => ({
      label: generateLevelLabel(e.threshold, tempLevels, i),
      threshold: e.threshold,
    }));
    const renames = new Map<string, string>();
    const addedLabels: string[] = [];
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].origIdx < 0) {
        addedLabels.push(newLevels[i].label);
      } else {
        const oldLabel = oldLevels[sorted[i].origIdx].label;
        const newLabel = newLevels[i].label;
        if (oldLabel !== newLabel) renames.set(oldLabel, newLabel);
      }
    }
    return { newLevels, renames, addedLabels };
  };

  const applyMgrMatrixChanges = (renames: Map<string, string>, added: string[], removed: string[]) => {
    const m = { ...matrix };
    for (const cl of clbLabels) {
      const row = { ...m[cl] };
      for (const lbl of removed) delete row[lbl];
      for (const [oldL, newL] of renames) { row[newL] = row[oldL] ?? 0; delete row[oldL]; }
      for (const lbl of added) row[lbl] = 0;
      m[cl] = row;
    }
    return m;
  };

  const applyClbMatrixChanges = (renames: Map<string, string>, added: string[], removed: string[]) => {
    const m = { ...matrix };
    for (const lbl of removed) delete m[lbl];
    for (const [oldL, newL] of renames) { m[newL] = m[oldL] ?? {}; delete m[oldL]; }
    for (const lbl of added) {
      const row: Record<string, number> = {};
      for (const ml of mgrLabels) row[ml] = 0;
      m[lbl] = row;
    }
    return m;
  };

  // --- Level CRUD handlers ---

  const handleAddManagerLevel = () => {
    const newThreshold = (mgrLevels[mgrLevels.length - 1]?.threshold ?? 90) + 10;
    const entries: TaggedEntry[] = [
      ...mgrLevels.map((l, i) => ({ threshold: l.threshold, origIdx: i })),
      { threshold: newThreshold, origIdx: -1 },
    ];
    const { newLevels, renames, addedLabels } = processLevelChange(mgrLevels, entries);
    onManagerLevelsChange?.(newLevels);
    onMatrixChange?.(applyMgrMatrixChanges(renames, addedLabels, []));
  };

  const handleRemoveManagerLevel = (idx: number) => {
    if (mgrLevels.length <= 1) return;
    const removedLabel = mgrLevels[idx].label;
    const entries: TaggedEntry[] = mgrLevels
      .map((l, i) => ({ threshold: l.threshold, origIdx: i }))
      .filter((_, i) => i !== idx);
    const { newLevels, renames } = processLevelChange(mgrLevels, entries);
    onManagerLevelsChange?.(newLevels);
    onMatrixChange?.(applyMgrMatrixChanges(renames, [], [removedLabel]));
  };

  const handleAddClubLevel = () => {
    const newThreshold = (clbLevels[clbLevels.length - 1]?.threshold ?? 90) + 10;
    const entries: TaggedEntry[] = [
      ...clbLevels.map((l, i) => ({ threshold: l.threshold, origIdx: i })),
      { threshold: newThreshold, origIdx: -1 },
    ];
    const { newLevels, renames, addedLabels } = processLevelChange(clbLevels, entries);
    onClubLevelsChange?.(newLevels);
    onMatrixChange?.(applyClbMatrixChanges(renames, addedLabels, []));
  };

  const handleRemoveClubLevel = (idx: number) => {
    if (clbLevels.length <= 1) return;
    const removedLabel = clbLevels[idx].label;
    const entries: TaggedEntry[] = clbLevels
      .map((l, i) => ({ threshold: l.threshold, origIdx: i }))
      .filter((_, i) => i !== idx);
    const { newLevels, renames } = processLevelChange(clbLevels, entries);
    onClubLevelsChange?.(newLevels);
    onMatrixChange?.(applyClbMatrixChanges(renames, [], [removedLabel]));
  };

  const handleLevelThresholdEdit = (
    type: 'manager' | 'club',
    idx: number,
    threshold: number
  ) => {
    const levels = type === 'manager' ? mgrLevels : clbLevels;
    const entries: TaggedEntry[] = levels.map((l, i) => ({
      threshold: i === idx ? threshold : l.threshold,
      origIdx: i,
    }));
    const { newLevels, renames } = processLevelChange(levels, entries);
    const changeFn = type === 'manager' ? onManagerLevelsChange : onClubLevelsChange;
    changeFn?.(newLevels);
    if (type === 'manager') {
      onMatrixChange?.(applyMgrMatrixChanges(renames, [], []));
    } else {
      onMatrixChange?.(applyClbMatrixChanges(renames, [], []));
    }
  };

  // Dynamic grid template
  // Edit mode: wider first col + extra col for "+" button
  // In edit mode, always show row labels column (even when collapsed) for clarity
  const showRowLabels = !isClubCollapsed || isEditMode;
  const editExtraCols = isEditMode ? ' 32px' : '';
  const gridCols = isEditMode
    ? `56px repeat(${colCount}, minmax(52px, 1fr))${editExtraCols}`
    : (showRowLabels
        ? `28px repeat(${colCount}, minmax(48px, 1fr))`
        : `repeat(${colCount}, minmax(48px, 1fr))`);
  const gridColsSm = isEditMode
    ? `72px repeat(${colCount}, 1fr)${editExtraCols}`
    : (showRowLabels
        ? `40px repeat(${colCount}, 1fr)`
        : `repeat(${colCount}, 1fr)`);

  return (
    <div className="bg-card rounded-2xl p-3 sm:p-4 shadow-card border-0">
      {/* Заголовок */}
      <h3 className="text-sm font-medium text-foreground mb-1">Матрица премий</h3>

      {/* Подсказка в edit mode: какие оси и что значат значения */}
      {isEditMode && (
        <div className="text-[10px] text-muted-foreground mb-3 space-y-0.5">
          <div>Значения ячеек — <span className="font-medium text-foreground/70">% премии</span> от продаж</div>
          <div>Заголовки столбцов и строк — пороги выполнения плана в %</div>
        </div>
      )}

      {!isEditMode && <div className="mb-3" />}

      {/* Табы */}
      {!isEditMode && (
        <Tabs value={mode} onValueChange={(v) => setMode(v as DisplayMode)} className="mb-3">
          <TabsList className="grid w-full grid-cols-3 h-8">
            <TabsTrigger value="percent" className="text-xs py-1">%</TabsTrigger>
            <TabsTrigger value="amount" className="text-xs py-1">₽</TabsTrigger>
            <TabsTrigger value="total" className="text-xs py-1">Итого</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* Заголовки осей */}
      {isEditMode ? (
        /* Edit mode: оба лейбла горизонтально */
        <div className="space-y-1.5 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground whitespace-nowrap w-20">Столбцы:</span>
            <Input
              value={managerAxisLabel}
              onChange={e => onManagerAxisLabelChange?.(e.target.value)}
              className="h-7 text-xs flex-1"
              placeholder="Название для столбцов (личный план)"
            />
            {availableMetrics && availableMetrics.length > 0 && (
              <Select
                value={config?.managerLinkedMetricId || '_none_'}
                onValueChange={v => onManagerLinkedMetricChange?.(v === '_none_' ? null : v)}
              >
                <SelectTrigger className="h-7 text-xs w-44 shrink-0">
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
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground whitespace-nowrap w-20">Строки:</span>
            <Input
              value={clubAxisLabel}
              onChange={e => onClubAxisLabelChange?.(e.target.value)}
              className="h-7 text-xs flex-1"
              placeholder="Название для строк (план клуба)"
            />
            {availableMetrics && availableMetrics.length > 0 && (
              <Select
                value={config?.clubLinkedMetricId || '_none_'}
                onValueChange={v => onClubLinkedMetricChange?.(v === '_none_' ? null : v)}
              >
                <SelectTrigger className="h-7 text-xs w-44 shrink-0">
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
          </div>
        </div>
      ) : (
        /* View mode: название столбцов сверху */
        <div className="text-center mb-2">
          <span className="text-[10px] text-muted-foreground font-medium">
            {managerAxisLabel}
          </span>
          {managerMetricName && (
            <span className="text-[10px] text-emerald-600 font-medium ml-1">
              ({managerMetricName})
            </span>
          )}
        </div>
      )}

      {/* Матрица с горизонтальным скроллом */}
      <div className="overflow-x-auto overflow-y-hidden -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-hide">
        <div className="min-w-[320px] sm:min-w-[360px] flex">
          {/* Заголовок оси Y — вертикально сбоку (только при 2D матрице) */}
          {!isEditMode && !isClubCollapsed && (
            <div className="flex items-center justify-center mr-1 flex-shrink-0" style={{ width: clubMetricName ? '28px' : '18px' }}>
              <span
                className="text-[10px] text-muted-foreground font-medium whitespace-nowrap"
                style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}
              >
                {clubAxisLabel}
              </span>
              {clubMetricName && (
                <span
                  className="text-[10px] text-emerald-600 font-medium whitespace-nowrap"
                  style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}
                >
                  ({clubMetricName})
                </span>
              )}
            </div>
          )}

          {/* Сама матрица */}
          <div className="flex-1">
            {/* Заголовки столбцов */}
            <div
              className="gap-1 mb-1"
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? gridCols : gridColsSm,
              }}
            >
              {showRowLabels && <div></div>}
              {mgrLabels.map((level, idx) => (
                <div key={level} className="flex items-center justify-center">
                  {isEditMode ? (
                    <div className="relative group w-full">
                      <Input
                        type="number"
                        value={mgrLevels[idx].threshold}
                        onChange={e => handleLevelThresholdEdit('manager', idx, parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs text-center px-1 py-0 w-full min-w-0 bg-muted/40 border-muted pr-4"
                      />
                      <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">%</span>
                      {mgrLevels.length > 1 && (
                        <button
                          onClick={() => handleRemoveManagerLevel(idx)}
                          className="absolute -top-1.5 -right-1.5 h-4 w-4 flex items-center justify-center rounded-full bg-destructive/10 text-destructive/60 hover:bg-destructive/20 hover:text-destructive transition-colors"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="text-[9px] sm:text-[10px] text-muted-foreground font-medium py-1">
                      {shortLabel(level)}
                    </div>
                  )}
                </div>
              ))}
              {isEditMode && (
                <button
                  onClick={handleAddManagerLevel}
                  className="h-8 w-8 flex items-center justify-center rounded-lg border border-dashed border-primary/30 text-primary/60 hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors self-center"
                  title="Добавить столбец"
                >
                  <Plus className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Строки матрицы */}
            {[...clbLabels].reverse().map((clubLevel, rowReverseIdx) => {
              const clbIdx = clbLabels.length - 1 - rowReverseIdx;
              return (
                <div
                  key={clubLevel}
                  className="gap-1 mb-1"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? gridCols : gridColsSm,
                  }}
                >
                  {/* Метка строки */}
                  {showRowLabels && (
                    <div className="flex items-center justify-center">
                      {isEditMode ? (
                        <div className="relative group w-full">
                          <Input
                            type="number"
                            value={clbLevels[clbIdx].threshold}
                            onChange={e => handleLevelThresholdEdit('club', clbIdx, parseFloat(e.target.value) || 0)}
                            className="h-8 text-xs text-center px-1 py-0 w-full min-w-0 bg-muted/40 border-muted pr-4"
                          />
                          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">%</span>
                          {clbLevels.length > 1 && (
                            <button
                              onClick={() => handleRemoveClubLevel(clbIdx)}
                              className="absolute -top-1.5 -right-1.5 h-4 w-4 flex items-center justify-center rounded-full bg-destructive/10 text-destructive/60 hover:bg-destructive/20 hover:text-destructive transition-colors"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-[9px] sm:text-[10px] text-muted-foreground font-medium">
                          {shortLabel(clubLevel)}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Ячейки */}
                  {mgrLabels.map((managerLevel) => {
                    const cellPercent = matrix[clubLevel]?.[managerLevel] ?? 0;
                    const isCurrentPosition =
                      clubLevel === currentClubLevel && managerLevel === currentManagerLevel;
                    const isAlternative = !isCurrentPosition &&
                      currentBonusPercent !== undefined &&
                      cellPercent === currentBonusPercent;

                    if (isEditMode) {
                      return (
                        <div
                          key={`${clubLevel}-${managerLevel}`}
                          className="h-9 sm:h-10 flex items-center justify-center"
                        >
                          <Input
                            type="number"
                            step="0.5"
                            value={cellPercent}
                            onChange={e => handleCellChange(clubLevel, managerLevel, e.target.value)}
                            className="h-8 text-xs text-center p-0 w-full min-w-0"
                          />
                        </div>
                      );
                    }

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
              );
            })}

            {/* Кнопка добавления строки (уровня клуба) */}
            {isEditMode && (
              <div className="mt-1">
                <button
                  onClick={handleAddClubLevel}
                  className="h-8 w-full flex items-center justify-center rounded-lg border border-dashed border-primary/30 text-primary/60 hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors"
                  title="Добавить строку"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Индикатор скролла на мобильном */}
      {!isEditMode && isMobile && (mode === 'amount' || mode === 'total') && (
        <div className="flex items-center justify-center gap-1 mt-2 text-muted-foreground">
          <ChevronLeft className="h-3 w-3" />
          <span className="text-[10px]">листайте</span>
          <ChevronRight className="h-3 w-3" />
        </div>
      )}

      {/* Текущая позиция */}
      {!isEditMode && (
        <div className="mt-3 py-2 text-center border-t border-border">
          <span className="text-xs text-muted-foreground">Позиция: </span>
          <span className="text-sm font-semibold text-primary">
            {currentPercent}% → {formatCurrency(currentAmount)}
          </span>
        </div>
      )}

      {/* Легенда цветов */}
      {!isEditMode && (
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
      )}
    </div>
  );
}

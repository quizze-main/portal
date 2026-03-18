import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Wallet, SlidersHorizontal, Target, TrendingUp, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  calculateSalary,
  calculateRequiredPlanSmart,
  calculateKPIBonus,
  calculateMatchingCells,
  findBestPersonalPercentForTarget,
  findBestCombinationForTarget,
  findBestCombinationWithKPI,
  getKPIBonusByTier,
  getMinPercentForLevel,
  getTypicalPercentForClubLevel,
  BASE_SALARY,
  type ManagerLevel,
  type ClubLevel,
  type MatchingCell,
  type BranchPositionConfig,
  type KPIConfig,
} from '@/data/salaryConfig';

type CalculatorMode = 'forecast' | 'plan' | 'salary';

interface CalculationResult {
  managerLevel: ManagerLevel;
  clubLevel: ClubLevel;
  personalFact: number;
  personalPlan: number;
  matchingCells?: MatchingCell[];
  currentBonusPercent?: number;
  baseSalary?: number;
}

export interface ForecastData {
  personalPlan: number;
  clubPlan: number;
  personalFact: number;
  clubFact: number;
  personalCurrentFact: number;
  clubCurrentFact: number;
}

interface SalaryCalculatorProps {
  config: BranchPositionConfig;
  selectedKPIs: Record<string, string | number>;
  onKPIChange: (kpiId: string, tierRange: string | number | null) => void;
  onCalculationChange?: (result: CalculationResult) => void;
  pendingCellClick?: { clubLevel: ClubLevel; managerLevel: ManagerLevel } | null;
  onCellClickProcessed?: () => void;
  onForecastRequest?: () => void;
  isForecastLoading?: boolean;
  forecastError?: string | null;
  forecastData?: ForecastData | null;
  branchId?: string;
}

// localStorage helpers for persisting manually entered facts
const FACTS_KEY_PREFIX = 'salary-manual-facts-';

function loadSavedFacts(branchId: string): { personalFact: number; clubFact: number } | null {
  try {
    const raw = localStorage.getItem(`${FACTS_KEY_PREFIX}${branchId}`);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data.personalFact === 'number' && typeof data.clubFact === 'number') {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

function saveFacts(branchId: string, facts: { personalFact: number; clubFact: number }) {
  try {
    localStorage.setItem(`${FACTS_KEY_PREFIX}${branchId}`, JSON.stringify(facts));
  } catch { /* ignore */ }
}

function clearSavedFacts(branchId: string) {
  try {
    localStorage.removeItem(`${FACTS_KEY_PREFIX}${branchId}`);
  } catch { /* ignore */ }
}

function formatBonus(value: number): string {
  if (value === 0) return '0 ₽';
  return `+${value.toLocaleString('ru-RU')} ₽`;
}

function formatCurrency(value: number): string {
  return Math.round(value).toLocaleString('ru-RU') + ' ₽';
}

function formatCompact(value: number): string {
  if (value >= 1000000) {
    const millions = value / 1000000;
    return millions % 1 === 0
      ? millions.toFixed(0) + 'М'
      : millions.toFixed(1).replace('.0', '') + 'М';
  }
  if (value >= 1000) {
    return Math.round(value / 1000) + 'к';
  }
  return value.toLocaleString('ru-RU');
}

function parseNumber(value: string): number {
  const cleaned = value.replace(/[^\d]/g, '');
  return parseInt(cleaned, 10) || 0;
}

// ============================================
// CurrencyInput — инпут с форматированием при потере фокуса
// При фокусе показывает чистые цифры, при блюре — форматированное число
// ============================================
interface CurrencyInputProps extends Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange' | 'onFocus' | 'onBlur' | 'type' | 'inputMode'> {
  value: number;
  onValueChange: (num: number) => void;
  onFocus?: () => void;
  showEmpty?: boolean; // show empty string when value is 0
}

function CurrencyInput({ value, onValueChange, onFocus, showEmpty = false, ...props }: CurrencyInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [localValue, setLocalValue] = useState('');

  const displayValue = isFocused
    ? localValue
    : (showEmpty && value === 0) ? '' : value.toLocaleString('ru-RU');

  const handleFocus = () => {
    setIsFocused(true);
    setLocalValue(value === 0 ? '' : String(value));
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    const num = parseInt(localValue.replace(/\D/g, ''), 10) || 0;
    onValueChange(num);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d]/g, '');
    setLocalValue(raw);
    const num = parseInt(raw, 10) || 0;
    onValueChange(num);
  };

  return (
    <Input
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      {...props}
    />
  );
}

// ============================================
// Компонент режима "Моя зарплата" с интерактивными слайдерами
// ============================================

interface SalaryModeContentProps {
  salaryInput: number;
  onSalaryInputChange: (value: string) => void;
  salaryResult: ReturnType<typeof calculateRequiredPlanSmart>;
  personalPlanInput: number;
  clubPlanInput: number;
  baseSalaryInput: number;
  kpis: KPIConfig[];
  config: BranchPositionConfig;
  onCalculationChange?: (result: {
    managerLevel: ManagerLevel;
    clubLevel: ClubLevel;
    personalFact: number;
    personalPlan: number;
    matchingCells?: MatchingCell[];
    currentBonusPercent?: number;
    baseSalary?: number;
  }) => void;
  pendingCellClick?: { clubLevel: ClubLevel; managerLevel: ManagerLevel } | null;
  onCellClickProcessed?: () => void;
  onDesiredSalaryFocus?: () => void;
  isDesiredSalaryTouched?: boolean;
}

function SalaryModeContent({
  salaryInput,
  onSalaryInputChange,
  salaryResult,
  personalPlanInput,
  clubPlanInput,
  baseSalaryInput,
  kpis,
  config,
  onCalculationChange,
  pendingCellClick,
  onCellClickProcessed,
  onDesiredSalaryFocus,
  isDesiredSalaryTouched = false,
}: SalaryModeContentProps) {
  // Синхронно вычисляем начальные KPI тиры — чтобы 2D поиск сразу учитывал их
  const initialKPITiers = useMemo(() => {
    const initial: Record<string, string | number> = {};
    kpis.forEach(kpi => {
      if (kpi.type === 'multiplier') {
        initial[kpi.id] = 0; // Для multiplier: начальное значение 0
      } else if (kpi.tiers.length > 0) {
        initial[kpi.id] = kpi.tiers[0].range; // Для tier: первый уровень
      }
    });
    return initial;
  }, [kpis]);

  // Состояние для интерактивных слайдеров
  const [salaryKPITiers, setSalaryKPITiers] = useState<Record<string, string | number>>(() => initialKPITiers);
  const [personalPercentOverride, setPersonalPercentOverride] = useState<number | null>(null);
  const [clubPercentOverride, setClubPercentOverride] = useState<number | null>(null);
  const [isAutoRecommendation, setIsAutoRecommendation] = useState(true);

  // При смене конфигурации (филиал/должность) сбрасываем KPI на начальные значения
  useEffect(() => {
    setSalaryKPITiers(initialKPITiers);
  }, [initialKPITiers]);

  // Текущий бонус KPI — сумма по всем выбранным KPI
  const currentKPIBonus = useMemo(() => {
    if (kpis.length === 0) return 0;
    return calculateKPIBonus(salaryKPITiers, kpis);
  }, [salaryKPITiers, kpis]);

  // Единый эффект автоподбора: запускается при изменении цели, KPI или конфига
  // Условие: только когда isAutoRecommendation = true
  useEffect(() => {
    if (!isAutoRecommendation) return;
    
    // Ждём, пока KPI инициализированы (для tier-типа должны быть значения)
    const hasTierKPIs = kpis.some(kpi => kpi.type !== 'multiplier' && kpi.tiers.length > 0);
    const kpisReady = !hasTierKPIs || Object.keys(salaryKPITiers).length > 0;
    if (!kpisReady) return;
    
    // 2D поиск: ищем оптимальную комбинацию personalPercent + clubPercent
    const result = findBestCombinationForTarget({
      targetSalary: salaryInput,
      personalPlan: personalPlanInput,
      clubPlan: clubPlanInput,
      selectedKPIs: salaryKPITiers,
      baseSalary: baseSalaryInput,
      config,
    });
    
    if (result) {
      setPersonalPercentOverride(result.personalPercent);
      setClubPercentOverride(result.clubPercent);
    }
  }, [isAutoRecommendation, salaryInput, personalPlanInput, clubPlanInput, salaryKPITiers, baseSalaryInput, config, kpis]);

  // Независимое изменение личного % — отключаем авторекомендацию
  const handlePersonalPercentChange = useCallback((newPercent: number) => {
    setIsAutoRecommendation(false);
    setPersonalPercentOverride(newPercent);
    
    // Пересчитываем % клуба + KPI для достижения целевой зарплаты (2D поиск с фиксированным personal)
    const result = findBestCombinationWithKPI({
      targetSalary: salaryInput,
      personalPlan: personalPlanInput,
      clubPlan: clubPlanInput,
      fixedPersonalPercent: newPercent,
      currentKPIs: salaryKPITiers,
      baseSalary: baseSalaryInput,
      config,
    });
    
    if (result) {
      setClubPercentOverride(result.clubPercent);
      setSalaryKPITiers(result.kpiTiers);
    }
  }, [salaryInput, personalPlanInput, clubPlanInput, salaryKPITiers, baseSalaryInput, config]);

  // Независимое изменение % клуба — отключаем авторекомендацию и пересчитываем личный %
  const handleClubPercentChange = useCallback((newPercent: number) => {
    setIsAutoRecommendation(false);
    setClubPercentOverride(newPercent);
    
    // Пересчитываем личный % + KPI для достижения целевой зарплаты (2D поиск с фиксированным club)
    const result = findBestCombinationWithKPI({
      targetSalary: salaryInput,
      personalPlan: personalPlanInput,
      clubPlan: clubPlanInput,
      fixedClubPercent: newPercent,
      currentKPIs: salaryKPITiers,
      baseSalary: baseSalaryInput,
      config,
    });
    
    if (result) {
      setPersonalPercentOverride(result.personalPercent);
      setSalaryKPITiers(result.kpiTiers);
    }
  }, [salaryInput, personalPlanInput, clubPlanInput, salaryKPITiers, baseSalaryInput, config]);

  // Независимое изменение KPI — включаем авторекомендацию и пересчитываем слайдеры
  const handleSalaryKPIChange = useCallback((kpiId: string, tier: string | number) => {
    setIsAutoRecommendation(true); // KPI изменение включает авто
    setSalaryKPITiers(prev => {
      const newTiers = { ...prev, [kpiId]: tier };
      
      // 2D поиск: пересчитываем оба слайдера для достижения целевой зарплаты с новым KPI
      const result = findBestCombinationForTarget({
        targetSalary: salaryInput,
        personalPlan: personalPlanInput,
        clubPlan: clubPlanInput,
        selectedKPIs: newTiers,
        baseSalary: baseSalaryInput,
        config,
      });
      
      if (result) {
        setPersonalPercentOverride(result.personalPercent);
        setClubPercentOverride(result.clubPercent);
      }
      
      return newTiers;
    });
  }, [salaryInput, personalPlanInput, clubPlanInput, baseSalaryInput, config]);

  // Обработка клика на ячейку матрицы — обновляем слайдеры
  const handleMatrixCellClickInternal = useCallback((clubLevel: ClubLevel, managerLevel: ManagerLevel) => {
    const targetPersonalPercent = getMinPercentForLevel(managerLevel) || 87;
    const targetClubPercent = getTypicalPercentForClubLevel(clubLevel);
    
    setPersonalPercentOverride(targetPersonalPercent);
    setClubPercentOverride(targetClubPercent);
  }, []);

  // Обработка pendingCellClick из родителя (клик на матрицу)
  useEffect(() => {
    if (pendingCellClick) {
      handleMatrixCellClickInternal(pendingCellClick.clubLevel, pendingCellClick.managerLevel);
      onCellClickProcessed?.();
    }
  }, [pendingCellClick, handleMatrixCellClickInternal, onCellClickProcessed]);

  // Расчёт текущего результата на основе слайдеров
  const currentResult = useMemo(() => {
    const personalPercent = personalPercentOverride ?? salaryResult?.requiredPersonalPercent ?? 100;
    const clubPercent = clubPercentOverride ?? salaryResult?.requiredClubPercent ?? 100;
    const personalFact = personalPlanInput * personalPercent / 100;
    const clubFact = clubPlanInput * clubPercent / 100;

    const breakdown = calculateSalary({
      personalFact,
      personalPlan: personalPlanInput,
      clubPercent,
      selectedKPIs: salaryKPITiers,
      baseSalary: baseSalaryInput,
      config,
    });

    return {
      ...breakdown,
      personalPercent,
      clubPercent,
      personalFact,
      clubFact,
    };
  }, [
    personalPercentOverride,
    clubPercentOverride,
    salaryResult,
    personalPlanInput,
    clubPlanInput,
    kpis,
    config,
    salaryKPITiers,
  ]);

  // Передаём результаты в родительский компонент (без matchingCells — используем текущие уровни)
  useEffect(() => {
    onCalculationChange?.({
      managerLevel: currentResult.managerLevel,
      clubLevel: currentResult.clubLevel,
      personalFact: currentResult.personalFact,
      personalPlan: personalPlanInput,
      currentBonusPercent: currentResult.bonusPercent,
      baseSalary: baseSalaryInput,
    });
  }, [currentResult, personalPlanInput, baseSalaryInput, onCalculationChange]);

  const salaryDiff = currentResult.total - salaryInput;
  const isOnTarget = Math.abs(salaryDiff) < 100; // Допуск 100 ₽
  const isAboveTarget = salaryDiff >= 100; // Выше целевой на 100+ ₽

  // Формат валюты
  const formatCurrencyLocal = (value: number): string => {
    return Math.round(value).toLocaleString('ru-RU') + ' ₽';
  };

  return (
    <>
      {/* Желаемая зарплата */}
      <div className="mb-3">
        <Label className="text-[10px] text-muted-foreground mb-1 block">
          Желаемая зарплата
        </Label>
        <div className="relative">
          <CurrencyInput
            value={salaryInput}
            onValueChange={(num) => onSalaryInputChange(String(num))}
            onFocus={() => onDesiredSalaryFocus?.()}
            showEmpty
            className={cn(
              "h-10 text-base text-right font-medium pr-8",
              !isDesiredSalaryTouched && "text-muted-foreground"
            )}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
            ₽
          </span>
        </div>
      </div>

      {salaryResult ? (
        <div className="bg-muted/30 rounded-xl p-2.5 space-y-2">
          {/* Слайдеры в стиле прогресс-баров */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* План менеджера по СЗ */}
            <div className="bg-muted/50 rounded-lg p-2 pb-1">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-muted-foreground">План менеджера по СЗ</span>
                <span className="text-xs font-semibold text-foreground">
                  {(personalPercentOverride ?? salaryResult.requiredPersonalPercent).toFixed(1)}%
                </span>
              </div>
              <div className="px-2">
                <Slider
                  value={[personalPercentOverride ?? salaryResult.requiredPersonalPercent]}
                  min={50}
                  max={200}
                  step={0.1}
                  onValueChange={([value]) => handlePersonalPercentChange(value)}
                  className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4 [&_[role=slider]]:border-primary/50"
                />
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                <span className="text-[13px] font-bold text-foreground">{Math.round(currentResult.personalFact).toLocaleString('ru-RU')}</span> / {personalPlanInput.toLocaleString('ru-RU')} ₽
              </div>
            </div>
            
            {/* План филиала по СЗ */}
            <div className="bg-muted/50 rounded-lg p-2 pb-1">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-muted-foreground">План филиала по СЗ</span>
                <span className="text-xs font-semibold text-foreground">
                  {Math.round(clubPercentOverride ?? salaryResult.requiredClubPercent)}%
                </span>
              </div>
              <div className="px-2">
                <Slider
                  value={[clubPercentOverride ?? salaryResult.requiredClubPercent]}
                  min={90}
                  max={130}
                  step={1}
                  onValueChange={([value]) => handleClubPercentChange(value)}
                  className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4 [&_[role=slider]]:border-primary/50"
                />
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                <span className="text-[13px] font-bold text-foreground">{Math.round(currentResult.clubFact).toLocaleString('ru-RU')}</span> / {clubPlanInput.toLocaleString('ru-RU')} ₽
              </div>
            </div>
          </div>

          {/* KPI — в одну строку */}
          {kpis.length > 0 && (
            <div className={cn(
              "grid gap-2 pt-1",
              kpis.length === 1 ? "grid-cols-1" : "grid-cols-2"
            )}>
              {kpis.map((kpi) => (
                <div key={kpi.id}>
                  <Label className="text-[10px] text-muted-foreground mb-1 block">
                    KPI: {kpi.label}
                  </Label>
                  
                  {kpi.type === 'multiplier' ? (
                    <div className="relative">
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={salaryKPITiers[kpi.id] || ''}
                        onChange={(e) => {
                          const num = parseInt(e.target.value.replace(/\D/g, '') || '0', 10);
                          handleSalaryKPIChange(kpi.id, num);
                        }}
                        className="h-8 text-sm text-right font-medium pr-16"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px]">
                        × {kpi.multiplierRate} ₽
                      </span>
                    </div>
                  ) : (
                    <div className="flex h-8 rounded-md border border-input bg-background overflow-hidden">
                      {kpi.tiers.map((tier) => (
                        <button
                          key={tier.range}
                          type="button"
                          onClick={() => handleSalaryKPIChange(kpi.id, tier.range)}
                          className={cn(
                            "flex-1 text-[10px] font-medium transition-colors flex flex-col items-center justify-center leading-none",
                            salaryKPITiers[kpi.id] === tier.range
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted text-muted-foreground"
                          )}
                        >
                          <span className="leading-none">{tier.range}</span>
                          <span className="text-[9px] leading-none opacity-80">
                            {tier.bonus > 0 ? `+${tier.bonus.toLocaleString('ru-RU')} ₽` : '0 ₽'}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Результат расчёта — в стиле режима "Расчет зарплаты" */}
          <div className="bg-muted/30 rounded-xl p-3 mt-1">
            <div className="text-center">
              <div className="text-[10px] text-muted-foreground mb-1">
                Твоя зарплата составит
              </div>
              <div className="text-xl font-bold text-primary">
                {Math.round(currentResult.total).toLocaleString('ru-RU')} ₽
              </div>
              
              {/* Индикатор: целевая зарплата достигнута, превышена, или ниже */}
              {isOnTarget ? (
                <div className="text-xs font-medium mt-1 text-emerald-500 flex items-center justify-center gap-1">
                  <Check className="h-3 w-3" />
                  = целевая зарплата
                </div>
              ) : isAboveTarget ? (
                <div className="text-xs font-medium mt-1 text-amber-500 flex items-center justify-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Минимум для достижения {salaryInput.toLocaleString('ru-RU')} ₽
                </div>
              ) : (
                <div className="text-xs font-medium mt-1 text-red-500">
                  −{Math.abs(salaryDiff).toLocaleString('ru-RU')} ₽ от целевой
                </div>
              )}
              
              {/* Breakdown */}
              <div className="text-[10px] text-muted-foreground mt-1">
                Оклад {baseSalaryInput.toLocaleString('ru-RU')} + {currentResult.bonusPercent}% премия ({Math.round(currentResult.personalPercent)}% План менеджера + {Math.round(currentResult.clubPercent)}% План филиала по СЗ)
                {currentResult.kpiBonus > 0 && (
                  <span className="text-emerald-500"> + KPI {currentResult.kpiBonus.toLocaleString('ru-RU')} ₽</span>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-muted/30 rounded-xl p-2.5 text-center text-[10px] text-muted-foreground">
          {salaryInput <= BASE_SALARY
            ? 'Введите зарплату выше базовой (40 000 ₽)'
            : 'Недостижимая цель'}
        </div>
      )}
    </>
  );
}

export function SalaryCalculator({
  config,
  selectedKPIs,
  onKPIChange,
  onCalculationChange,
  pendingCellClick,
  onCellClickProcessed,
  onForecastRequest,
  isForecastLoading,
  forecastError,
  forecastData,
  branchId,
}: SalaryCalculatorProps) {
  const [mode, setMode] = useState<CalculatorMode>('forecast');
  const isButtonClickRef = useRef(false);
  const branchIdRef = useRef(branchId);
  branchIdRef.current = branchId;
  
  // Получаем значения из конфигурации
  const kpis = config.kpis;
  
  // Настраиваемые параметры (инициализируем из config)
  const [personalPlanInput, setPersonalPlanInput] = useState(config.personalPlan);
  const [clubPlanInput, setClubPlanInput] = useState(config.clubPlan);
  const [baseSalaryInput, setBaseSalaryInput] = useState(config.baseSalary);
  
  // Существующие инпуты продаж (87% от плана как дефолт)
  const [planInput, setPlanInput] = useState(config.personalPlan);
  const [clubFactInput, setClubFactInput] = useState(config.clubPlan);
  const [salaryInput, setSalaryInput] = useState(80000);

  // Поля, заполненные прогнозом
  const [forecastFields, setForecastFields] = useState<Set<string>>(new Set());

  // Отслеживаем, редактировал ли пользователь поле
  const [isTouched, setIsTouched] = useState({
    personalPlan: false,
    personalSales: false,
    branchSales: false,
    desiredSalary: false,
  });

  // Sync from config when it changes
  useEffect(() => {
    setPersonalPlanInput(config.personalPlan);
    setClubPlanInput(config.clubPlan);
    setBaseSalaryInput(config.baseSalary);
    setPlanInput(config.personalPlan);
    setClubFactInput(config.clubPlan);
    setForecastFields(new Set());
    // Reset touched state on config change
    setIsTouched({
      personalPlan: false,
      personalSales: false,
      branchSales: false,
      desiredSalary: false,
    });
  }, [config]);

  // Применяем данные прогноза при их получении.
  // ВАЖНО: зависимость ТОЛЬКО от forecastData, не от branchId.
  // branchId берём из ref, чтобы избежать race condition:
  // при смене филиала дочерний эффект запускается раньше родительского clearForecast(),
  // и без ref старые данные прогноза «залипают» на новом филиале.
  useEffect(() => {
    if (!forecastData) return;

    const currentBranchId = branchIdRef.current;

    // Планы всегда из API
    setPersonalPlanInput(forecastData.personalPlan);
    setClubPlanInput(forecastData.clubPlan);

    if (isButtonClickRef.current || !currentBranchId) {
      // Кнопка «Прогноз» → берём все данные из API, сбрасываем сохранённые
      setPlanInput(forecastData.personalFact);
      setClubFactInput(forecastData.clubFact);
      setForecastFields(new Set(['personalPlan', 'clubPlan', 'personalFact', 'clubFact']));
      if (currentBranchId) clearSavedFacts(currentBranchId);
      isButtonClickRef.current = false;
    } else {
      // Авто-загрузка → проверяем localStorage на ручные факты
      const saved = loadSavedFacts(currentBranchId);
      if (saved) {
        setPlanInput(saved.personalFact);
        setClubFactInput(saved.clubFact);
        // Не помечаем факты как «прогноз» — они введены вручную
        setForecastFields(new Set(['personalPlan', 'clubPlan']));
      } else {
        setPlanInput(forecastData.personalFact);
        setClubFactInput(forecastData.clubFact);
        setForecastFields(new Set(['personalPlan', 'clubPlan', 'personalFact', 'clubFact']));
      }
    }

    setIsTouched({
      personalPlan: true,
      personalSales: true,
      branchSales: true,
      desiredSalary: false,
    });
  }, [forecastData]);

  // Auto-fetch forecast when switching to forecast tab (if no data yet)
  useEffect(() => {
    if (mode === 'forecast' && !forecastData && !isForecastLoading && onForecastRequest) {
      onForecastRequest();
    }
  }, [mode, forecastData, isForecastLoading, onForecastRequest]);

  // Calculate club percent dynamically from input using clubPlanInput
  const calculatedClubPercent = clubPlanInput > 0 
    ? Math.round((clubFactInput / clubPlanInput) * 100) 
    : 0;

  const kpiBonus = useMemo(() => calculateKPIBonus(selectedKPIs, kpis), [selectedKPIs, kpis]);

  // Режим "Расчет зарплаты": вычисляем зарплату с параметрами из инпутов
  const planResult = useMemo(() => {
    return calculateSalary({
      personalFact: planInput,
      personalPlan: personalPlanInput,
      clubPercent: calculatedClubPercent,
      selectedKPIs,
      baseSalary: baseSalaryInput,
      config,
    });
  }, [planInput, personalPlanInput, calculatedClubPercent, selectedKPIs, baseSalaryInput, config]);

  // Расчёт зарплаты по текущим фактическим данным (не прогноз)
  const currentActualResult = useMemo(() => {
    if (!forecastData) return null;
    const clubPercent = forecastData.clubPlan > 0
      ? (forecastData.clubCurrentFact / forecastData.clubPlan) * 100
      : 0;
    return calculateSalary({
      personalFact: forecastData.personalCurrentFact,
      personalPlan: forecastData.personalPlan,
      clubPercent,
      selectedKPIs,
      baseSalary: baseSalaryInput,
      config,
    });
  }, [forecastData, selectedKPIs, baseSalaryInput, config]);

  // Максимальные KPI для базового расчёта (100% выполнение)
  const maxKPIs = useMemo(() => {
    const result: Record<string, string | number> = {};
    kpis.forEach(kpi => {
      // Для multiplier-типа пропускаем, для tier-типа берём первый tier
      if (kpi.type !== 'multiplier' && kpi.tiers.length > 0) {
        result[kpi.id] = kpi.tiers[0].range;
      }
    });
    return result;
  }, [kpis]);

  // Базовая зарплата при 100% выполнении всех планов и KPI
  const baselineSalary = useMemo(() => {
    return calculateSalary({
      personalFact: personalPlanInput,      // 100% личного плана
      personalPlan: personalPlanInput,
      clubPercent: 100,                     // 100% клуба
      selectedKPIs: maxKPIs,                // 100% KPI (максимальный бонус)
      baseSalary: baseSalaryInput,
      config,
    });
  }, [personalPlanInput, maxKPIs, baseSalaryInput, config]);

  // Режим "Моя зарплата": вычисляем необходимый план с рекомендациями KPI
  const salaryResult = useMemo(() => {
    return calculateRequiredPlanSmart({
      targetSalary: salaryInput,
      personalPlan: personalPlanInput,
      clubPlan: clubPlanInput,
    });
  }, [salaryInput, personalPlanInput, clubPlanInput]);

  // Вычисляем подходящие ячейки матрицы для режима "Моя зарплата"
  const matchingCells = useMemo(() => {
    if (mode !== 'salary' || !salaryResult) return undefined;
    
    return calculateMatchingCells({
      targetSalary: salaryInput,
      personalPlan: personalPlanInput,
      clubPlan: clubPlanInput,
      kpiBonus: salaryResult.kpiBonus,
    });
  }, [mode, salaryInput, personalPlanInput, clubPlanInput, salaryResult]);

  // Передаём результаты расчёта в родительский компонент
  // ТОЛЬКО в режиме "Расчет зарплаты" — в режиме "Моя зарплата" 
  // SalaryModeContent сам вызывает onCalculationChange
  useEffect(() => {
    if (mode !== 'plan') return;
    
    onCalculationChange?.({
      managerLevel: planResult.managerLevel,
      clubLevel: planResult.clubLevel,
      personalFact: planInput,
      personalPlan: personalPlanInput,
      matchingCells: matchingCells,
      currentBonusPercent: planResult.bonusPercent,
      baseSalary: baseSalaryInput,
    });
  }, [mode, planResult.managerLevel, planResult.clubLevel, planResult.bonusPercent, planInput, personalPlanInput, baseSalaryInput, matchingCells, onCalculationChange]);

  const handleSalaryInputChange = (value: string) => {
    const num = parseNumber(value);
    setSalaryInput(num);
  };

  // Обработка клика на ячейку матрицы — в режиме "Расчет зарплаты" обновляем инпуты
  const handleMatrixCellClickInternal = useCallback((clubLevel: ClubLevel, managerLevel: ManagerLevel) => {
    const targetPersonalPercent = getMinPercentForLevel(managerLevel) || 87;
    const targetClubPercent = getTypicalPercentForClubLevel(clubLevel);
    
    const newPersonalFact = Math.round(personalPlanInput * targetPersonalPercent / 100);
    const newClubFact = Math.round(clubPlanInput * targetClubPercent / 100);
    
    setPlanInput(newPersonalFact);
    setClubFactInput(newClubFact);
  }, [personalPlanInput, clubPlanInput]);

  // Обработка pendingCellClick из родителя (клик на матрицу)
  useEffect(() => {
    if (pendingCellClick && mode === 'plan') {
      handleMatrixCellClickInternal(pendingCellClick.clubLevel, pendingCellClick.managerLevel);
      onCellClickProcessed?.();
    }
  }, [pendingCellClick, mode, handleMatrixCellClickInternal, onCellClickProcessed]);

  const salaryDiff = planResult.total - baselineSalary.total;
  const percentOfPlan = personalPlanInput > 0 ? Math.round((planInput / personalPlanInput) * 100) : 0;

  return (
    <div className="bg-card rounded-2xl p-3 sm:p-4 shadow-card border-0">
      <h3 className="text-sm font-medium text-foreground mb-3">Калькулятор</h3>

      {/* Переключатель режима */}
      <Tabs value={mode} onValueChange={(v) => setMode(v as CalculatorMode)} className="mb-3">
        <TabsList className="grid w-full grid-cols-3 h-9">
          <TabsTrigger value="forecast" className="text-xs gap-1">
            <Wallet className="w-3 h-3" />
            Моя зарплата
          </TabsTrigger>
          <TabsTrigger value="plan" className="text-xs gap-1">
            <SlidersHorizontal className="w-3 h-3" />
            Ручной расчет
          </TabsTrigger>
          <TabsTrigger value="salary" className="text-xs gap-1">
            <Target className="w-3 h-3" />
            Цель в деньгах
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {mode === 'forecast' ? (
        /* ─── Таб «Прогноз зарплаты» ─── */
        <div className="space-y-3">
          {isForecastLoading && (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mb-2" />
              <span className="text-sm">Загрузка прогноза...</span>
            </div>
          )}

          {forecastError && !isForecastLoading && (
            <div className="text-center py-6">
              <p className="text-sm text-destructive mb-2">{forecastError}</p>
              {onForecastRequest && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { isButtonClickRef.current = true; onForecastRequest(); }}
                >
                  Повторить
                </Button>
              )}
            </div>
          )}

          {!forecastData && !isForecastLoading && !forecastError && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Данные прогноза недоступны
            </div>
          )}

          {currentActualResult && forecastData && !isForecastLoading && (
            <>
              {/* Твой заработок на сегодня */}
              <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30 rounded-xl p-3">
                <div className="text-center">
                  <div className="text-[10px] text-muted-foreground">Твой заработок на сегодня</div>
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 leading-tight mt-0.5">
                    {formatCurrency(currentActualResult.total)}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    Оклад {baseSalaryInput.toLocaleString('ru-RU')} + {currentActualResult.bonusPercent}% премия
                    {currentActualResult.kpiBonus > 0 && (
                      <span className="text-emerald-600 dark:text-emerald-400"> + KPI {currentActualResult.kpiBonus.toLocaleString('ru-RU')} ₽</span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5 mt-2">
                  <div className="bg-background/60 rounded-md px-2 py-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-muted-foreground">Личный факт СЗ</span>
                      <span className="text-[9px] text-muted-foreground">
                        {forecastData.personalPlan > 0 ? `${Math.round((forecastData.personalCurrentFact / forecastData.personalPlan) * 100)}%` : '—'}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-foreground">{formatCurrency(forecastData.personalCurrentFact)}</div>
                    <Progress value={Math.min(forecastData.personalPlan > 0 ? (forecastData.personalCurrentFact / forecastData.personalPlan) * 100 : 0, 100)} className="h-1 mt-0.5" />
                  </div>
                  <div className="bg-background/60 rounded-md px-2 py-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-muted-foreground">Факт филиала СЗ</span>
                      <span className="text-[9px] text-muted-foreground">
                        {forecastData.clubPlan > 0 ? `${Math.round((forecastData.clubCurrentFact / forecastData.clubPlan) * 100)}%` : '—'}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-foreground">{formatCurrency(forecastData.clubCurrentFact)}</div>
                    <Progress value={Math.min(forecastData.clubPlan > 0 ? (forecastData.clubCurrentFact / forecastData.clubPlan) * 100 : 0, 100)} className="h-1 mt-0.5" />
                  </div>
                </div>
              </div>

              {/* Прогноз на конец месяца */}
              <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/30 rounded-xl p-3">
                <div className="text-center">
                  <div className="text-[10px] text-muted-foreground">Прогноз на конец месяца</div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 leading-tight mt-0.5">
                    {formatCurrency(planResult.total)}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    Оклад {baseSalaryInput.toLocaleString('ru-RU')} + {planResult.bonusPercent}% премия
                    {planResult.kpiBonus > 0 && (
                      <span className="text-blue-600 dark:text-blue-400"> + KPI {planResult.kpiBonus.toLocaleString('ru-RU')} ₽</span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5 mt-2">
                  <div className="bg-background/60 rounded-md px-2 py-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-muted-foreground">Личный прогноз СЗ</span>
                      <span className="text-[9px] text-muted-foreground">
                        {forecastData.personalPlan > 0 ? `${Math.round((forecastData.personalFact / forecastData.personalPlan) * 100)}%` : '—'}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-foreground">{formatCurrency(forecastData.personalFact)}</div>
                    <Progress value={Math.min(forecastData.personalPlan > 0 ? (forecastData.personalFact / forecastData.personalPlan) * 100 : 0, 100)} className="h-1 mt-0.5" />
                  </div>
                  <div className="bg-background/60 rounded-md px-2 py-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-muted-foreground">Прогноз филиала СЗ</span>
                      <span className="text-[9px] text-muted-foreground">
                        {forecastData.clubPlan > 0 ? `${Math.round((forecastData.clubFact / forecastData.clubPlan) * 100)}%` : '—'}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-foreground">{formatCurrency(forecastData.clubFact)}</div>
                    <Progress value={Math.min(forecastData.clubPlan > 0 ? (forecastData.clubFact / forecastData.clubPlan) * 100 : 0, 100)} className="h-1 mt-0.5" />
                  </div>
                </div>
              </div>

              {/* Кнопка обновить прогноз */}
              {onForecastRequest && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs text-muted-foreground"
                  onClick={() => { isButtonClickRef.current = true; onForecastRequest(); }}
                  disabled={isForecastLoading}
                >
                  Обновить прогноз
                </Button>
              )}
            </>
          )}
        </div>
      ) : mode === 'plan' ? (
        <>
          {/* Строка 1: Оклад + все KPI в одну строку */}
          <div className={cn(
            "grid gap-2 mb-3",
            kpis.length === 0 && "grid-cols-1",
            kpis.length === 1 && "grid-cols-1 sm:grid-cols-2",
            kpis.length >= 2 && "grid-cols-1 sm:grid-cols-3"
          )}>
            {/* Оклад */}
            <div>
              <Label className="text-[10px] text-muted-foreground mb-1 block">
                Оклад
              </Label>
              <div className="relative">
                <CurrencyInput
                  value={baseSalaryInput}
                  onValueChange={(num) => setBaseSalaryInput(num)}
                  className="h-10 sm:h-12 text-sm text-right font-medium pr-6"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                  ₽
                </span>
              </div>
            </div>
            
            {/* KPI */}
            {kpis.map((kpi) => (
              <div key={kpi.id}>
                <Label className="text-[10px] text-muted-foreground mb-1 block">
                  KPI: {kpi.label}
                </Label>
                
                {kpi.type === 'multiplier' ? (
                  // Инпут для multiplier-based KPI
                  <div className="relative">
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={selectedKPIs[kpi.id] || ''}
                      onChange={(e) => {
                        const num = parseInt(e.target.value.replace(/\D/g, '') || '0', 10);
                        onKPIChange(kpi.id, num);
                      }}
                      className="h-10 sm:h-12 text-sm text-right font-medium pr-16"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                      × {kpi.multiplierRate} ₽
                    </span>
                  </div>
                ) : (
                  // Кнопки для tier-based KPI
                  <div className={cn(
                    "grid h-10 sm:h-12 rounded-md border border-input bg-background overflow-hidden",
                    kpi.tiers.length === 2 && "grid-cols-2",
                    kpi.tiers.length === 3 && "grid-cols-3",
                    kpi.tiers.length >= 4 && "grid-cols-4"
                  )}>
                    {kpi.tiers.map((tier) => (
                      <button
                        key={tier.range}
                        type="button"
                        onClick={() => onKPIChange(kpi.id, tier.range)}
                        className={cn(
                          // Force full-cell stretch in CSS grid and normalize typography
                          // (Telegram WebView can render inline button baselines oddly).
                          "flex h-full w-full flex-col items-center justify-center gap-0 px-1 py-0.5 text-center leading-none transition-colors",
                          selectedKPIs[kpi.id] === tier.range
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted text-muted-foreground"
                        )}
                      >
                        <span className="text-xs font-medium leading-none">{tier.range}</span>
                        <span className="text-[9px] leading-none opacity-80">
                          {tier.bonus > 0 ? `+${tier.bonus.toLocaleString('ru-RU')} ₽` : '0 ₽'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Строка 2: План менеджера по СЗ + План филиала по СЗ */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <Label className="text-[10px] text-muted-foreground mb-1 block">
                План менеджера по СЗ
              </Label>
              <div className="relative">
                <CurrencyInput
                  value={personalPlanInput}
                  onValueChange={(num) => {
                    setPersonalPlanInput(num);
                    setForecastFields(prev => { if (!prev.has('personalPlan')) return prev; const n = new Set(prev); n.delete('personalPlan'); return n; });
                  }}
                  onFocus={() => {
                    if (!isTouched.personalPlan) {
                      setIsTouched(prev => ({ ...prev, personalPlan: true }));
                    }
                  }}
                  showEmpty
                  className={cn(
                    "h-10 text-sm text-right font-medium pr-6",
                    !isTouched.personalPlan && "text-muted-foreground"
                  )}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                  ₽
                </span>
              </div>
            </div>
            
            <div>
              <Label className="text-[10px] text-muted-foreground mb-1 block">
                План филиала по СЗ
              </Label>
              <div className="relative">
                <CurrencyInput
                  value={clubPlanInput}
                  onValueChange={(num) => {
                    setClubPlanInput(num);
                    setForecastFields(prev => { if (!prev.has('clubPlan')) return prev; const n = new Set(prev); n.delete('clubPlan'); return n; });
                  }}
                  className="h-10 text-sm text-right font-medium pr-6"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                  ₽
                </span>
              </div>
            </div>
          </div>

          {/* Строка 3: Мои продажи + Продажи клуба */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <Label className="text-[10px] text-muted-foreground mb-1 block">
                Факт менеджера по СЗ
                {forecastFields.has('personalFact') && <span className="text-[9px] text-blue-500 ml-1">прогноз</span>}
              </Label>
              <div className="relative">
                <CurrencyInput
                  value={planInput}
                  onValueChange={(num) => {
                    setPlanInput(num);
                    setForecastFields(prev => { if (!prev.has('personalFact')) return prev; const n = new Set(prev); n.delete('personalFact'); return n; });
                    if (branchId) saveFacts(branchId, { personalFact: num, clubFact: clubFactInput });
                  }}
                  onFocus={() => {
                    if (!isTouched.personalSales) {
                      setIsTouched(prev => ({ ...prev, personalSales: true }));
                    }
                  }}
                  showEmpty
                  className={cn(
                    "h-10 text-sm text-right font-medium pr-6",
                    !isTouched.personalSales && "text-muted-foreground",
                    forecastFields.has('personalFact') && "ring-1 ring-blue-400/50 border-blue-300"
                  )}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                  ₽
                </span>
              </div>
            </div>
            
            <div>
              <Label className="text-[10px] text-muted-foreground mb-1 block">
                Факт филиала по СЗ
                {forecastFields.has('clubFact') && <span className="text-[9px] text-blue-500 ml-1">прогноз</span>}
              </Label>
              <div className="relative">
                <CurrencyInput
                  value={clubFactInput}
                  onValueChange={(num) => {
                    setClubFactInput(num);
                    setForecastFields(prev => { if (!prev.has('clubFact')) return prev; const n = new Set(prev); n.delete('clubFact'); return n; });
                    if (branchId) saveFacts(branchId, { personalFact: planInput, clubFact: num });
                  }}
                  onFocus={() => {
                    if (!isTouched.branchSales) {
                      setIsTouched(prev => ({ ...prev, branchSales: true }));
                    }
                  }}
                  showEmpty
                  className={cn(
                    "h-10 text-sm text-right font-medium pr-6",
                    !isTouched.branchSales && "text-muted-foreground",
                    forecastFields.has('clubFact') && "ring-1 ring-blue-400/50 border-blue-300"
                  )}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                  ₽
                </span>
              </div>
            </div>
          </div>

          {/* Прогресс-бары */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            {/* План менеджера прогресс */}
            <div className="bg-muted/30 rounded-lg p-2">
              <div className="flex items-center justify-between gap-2 mb-1 min-w-0">
                <span className="text-[10px] text-muted-foreground truncate min-w-0">
                  План менеджера по СЗ
                </span>
                <span className="text-xs font-semibold shrink-0">{percentOfPlan}%</span>
              </div>
              <Progress value={Math.min(percentOfPlan, 100)} className="h-2" />
              <div className="text-[10px] text-muted-foreground mt-1">
                <span className="text-[13px] font-bold text-foreground">{formatCurrency(planInput).replace(' ₽', '')}</span> / {formatCurrency(personalPlanInput)}
              </div>
            </div>
            
            {/* План филиала прогресс */}
            <div className="bg-muted/30 rounded-lg p-2">
              <div className="flex items-center justify-between gap-2 mb-1 min-w-0">
                <span className="text-[10px] text-muted-foreground truncate min-w-0">
                  План филиала по СЗ
                </span>
                <span className="text-xs font-semibold shrink-0">{calculatedClubPercent}%</span>
              </div>
              <Progress value={Math.min(calculatedClubPercent, 100)} className="h-2" />
              <div className="text-[10px] text-muted-foreground mt-1">
                <span className="text-[13px] font-bold text-foreground">{formatCurrency(clubFactInput).replace(' ₽', '')}</span> / {formatCurrency(clubPlanInput)}
              </div>
            </div>
          </div>

          {/* Результат расчёта */}
          <div className="bg-muted/30 rounded-xl p-3">
            <div className="text-center">
              <div className="text-[10px] text-muted-foreground mb-1">
                {currentActualResult ? 'Прогноз зарплаты на месяц' : 'Твоя зарплата составит'}
              </div>
              <div className={cn(
                "text-xl font-bold",
                currentActualResult ? "text-blue-600 dark:text-blue-400" : "text-primary"
              )}>
                {formatCurrency(planResult.total)}
              </div>
              {salaryDiff !== 0 && (
                <div className={cn(
                  "text-xs font-medium mt-1",
                  salaryDiff > 0 ? "text-emerald-500" : "text-red-500"
                )}>
                  {salaryDiff > 0 ? '+' : '−'}{formatCurrency(Math.abs(salaryDiff))} от 100% выполнения планов и KPI
                </div>
              )}
              <div className="text-[10px] text-muted-foreground mt-1">
                Оклад {baseSalaryInput.toLocaleString('ru-RU')} + {planResult.bonusPercent}% премия ({percentOfPlan}% План менеджера + {calculatedClubPercent}% План филиала по СЗ)
                {planResult.kpiBonus > 0 && (
                  <span className="text-success"> + KPI {planResult.kpiBonus.toLocaleString('ru-RU')} ₽</span>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <SalaryModeContent
          salaryInput={salaryInput}
          onSalaryInputChange={handleSalaryInputChange}
          salaryResult={salaryResult}
          personalPlanInput={personalPlanInput}
          clubPlanInput={clubPlanInput}
          baseSalaryInput={baseSalaryInput}
          kpis={kpis}
          config={config}
          onCalculationChange={onCalculationChange}
          pendingCellClick={pendingCellClick}
          onCellClickProcessed={onCellClickProcessed}
          onDesiredSalaryFocus={() => {
            if (!isTouched.desiredSalary) {
              setSalaryInput(0);
              setIsTouched(prev => ({ ...prev, desiredSalary: true }));
            }
          }}
          isDesiredSalaryTouched={isTouched.desiredSalary}
        />
      )}
    </div>
  );
}

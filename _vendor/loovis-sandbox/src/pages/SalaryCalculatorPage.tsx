import { useState, useMemo, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  MotivationMatrix,
  SalaryCalculator,
} from '@/components/salary';
import { 
  calculateSalary, 
  getSalaryConfig,
  hasSpecificBranchConfig,
  hasSpecificConfig,
  type ManagerLevel, 
  type ClubLevel, 
  type MatchingCell,
  type BranchPositionConfig,
} from '@/data/salaryConfig';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { BRANCHES, getAvailablePositions } from '@/data/branchData';


export default function SalaryCalculatorPage() {
  const [selectedBranch, setSelectedBranch] = useState('moscow_club');
  const [selectedPosition, setSelectedPosition] = useState('manager');
  
  const [calculatorKPIs, setCalculatorKPIs] = useState<Record<string, string | number>>({
    closure_time: '90-100%',
  });

  // Получаем конфигурацию для выбранного филиала и должности
  const config = useMemo<BranchPositionConfig>(() => {
    return getSalaryConfig(selectedBranch, selectedPosition);
  }, [selectedBranch, selectedPosition]);

  // Состояние для динамического результата из калькулятора
  const [calculatorResult, setCalculatorResult] = useState<{
    managerLevel: ManagerLevel;
    clubLevel: ClubLevel;
    personalFact: number;
    personalPlan: number;
    matchingCells?: MatchingCell[];
    currentBonusPercent?: number;
    baseSalary?: number;
  } | null>(null);

  const handleCalculationChange = useCallback((result: {
    managerLevel: ManagerLevel;
    clubLevel: ClubLevel;
    personalFact: number;
    personalPlan: number;
    matchingCells?: MatchingCell[];
    currentBonusPercent?: number;
    baseSalary?: number;
  }) => {
    setCalculatorResult(result);
  }, []);

  // Состояние для передачи клика на ячейку в калькулятор
  const [pendingCellClick, setPendingCellClick] = useState<{ clubLevel: ClubLevel; managerLevel: ManagerLevel } | null>(null);

  // Обработчик клика на ячейку матрицы — передаёт событие в калькулятор
  const handleMatrixCellClick = useCallback((clubLevel: ClubLevel, managerLevel: ManagerLevel) => {
    setPendingCellClick({ clubLevel, managerLevel });
  }, []);

  // Сброс pending после обработки
  const handleCellClickProcessed = useCallback(() => {
    setPendingCellClick(null);
  }, []);

  // Filter positions based on selected branch
  const availablePositions = useMemo(() => {
    return getAvailablePositions(selectedBranch);
  }, [selectedBranch]);

  // Auto-select first available position when branch changes
  useEffect(() => {
    if (availablePositions.length > 0) {
      const isPositionAvailable = availablePositions.some(p => p.id === selectedPosition);
      if (!isPositionAvailable) {
        setSelectedPosition(availablePositions[0].id);
      }
    }
  }, [selectedBranch, availablePositions, selectedPosition]);

  // Сбрасываем KPI при смене конфигурации (филиала/должности)
  useEffect(() => {
    const initialKPIs: Record<string, string | number> = {};
    config.kpis.forEach(kpi => {
      if (kpi.type !== 'multiplier' && kpi.tiers.length > 0) {
        initialKPIs[kpi.id] = kpi.tiers[0].range;
      }
      // Для multiplier оставляем 0 (не добавляем в объект)
    });
    setCalculatorKPIs(initialKPIs);
  }, [config]);

  // Дефолтные значения из конфигурации для начального расчёта
  const forecastBreakdown = useMemo(() => {
    const personalFact = config.personalPlan * 0.87; // 87% выполнения
    const clubPercent = 95; // Типичный % клуба
    return calculateSalary({
      personalFact,
      personalPlan: config.personalPlan,
      clubPercent,
      selectedKPIs: { closure_time: '90-100%' },
      config,
    });
  }, [config]);

  const handleCalculatorKPIChange = (kpiId: string, tierRange: string | number | null) => {
    setCalculatorKPIs((prev) => {
      if (tierRange === null) {
        const { [kpiId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [kpiId]: tierRange };
    });
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <div className="px-4 py-4 max-w-full">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-xl font-bold text-primary text-center mb-4">
            Калькулятор новой мотивации
          </h1>
        <div className="grid grid-cols-2 gap-2">
            {/* Филиал */}
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-xs text-muted-foreground">Филиал</span>
              <div className="flex items-center gap-2">
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger className="flex-1 h-9 bg-card text-sm min-w-0">
                    <SelectValue className="truncate" />
                  </SelectTrigger>
                  <SelectContent>
                    {BRANCHES.map(branch => {
                      const isConfigured = hasSpecificBranchConfig(branch.id);
                      return (
                        <SelectItem 
                          key={branch.id} 
                          value={branch.id}
                          className={isConfigured ? '' : 'text-muted-foreground'}
                        >
                          {branch.name}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <Link to={`/calculator/${selectedBranch}`}>
                  <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
            
            {/* Должность */}
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-xs text-muted-foreground">Должность</span>
              <Select value={selectedPosition} onValueChange={setSelectedPosition}>
                <SelectTrigger className="w-full h-9 bg-card text-sm">
                  <SelectValue className="truncate" />
                </SelectTrigger>
                <SelectContent>
                  {availablePositions.map(pos => {
                    const isConfigured = hasSpecificConfig(selectedBranch, pos.id);
                    return (
                      <SelectItem 
                        key={pos.id} 
                        value={pos.id}
                        className={isConfigured ? '' : 'text-muted-foreground'}
                      >
                        {pos.name}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <SalaryCalculator
            config={config}
            selectedKPIs={calculatorKPIs}
            onKPIChange={handleCalculatorKPIChange}
            onCalculationChange={handleCalculationChange}
            pendingCellClick={pendingCellClick}
            onCellClickProcessed={handleCellClickProcessed}
          />

          <MotivationMatrix
            currentManagerLevel={calculatorResult?.managerLevel ?? forecastBreakdown.managerLevel}
            currentClubLevel={calculatorResult?.clubLevel ?? forecastBreakdown.clubLevel}
            personalFact={calculatorResult?.personalFact ?? config.personalPlan * 0.87}
            personalPlan={calculatorResult?.personalPlan ?? config.personalPlan}
            matchingCells={calculatorResult?.matchingCells}
            currentBonusPercent={calculatorResult?.currentBonusPercent}
            onCellClick={handleMatrixCellClick}
            matrix={config.matrix}
            baseSalary={calculatorResult?.baseSalary ?? config.baseSalary}
          />
        </div>
      </div>
    </div>
  );
}

import { useState, useMemo, useCallback } from 'react';
import { Layout } from '@/components/Layout';
import { BottomNavigation } from '@/components/BottomNavigation';
import {
  EarningsCard,
  MotivationMatrix,
  SalaryCalculator,
  PaymentHistory,
} from '@/components/salary';
import { 
  calculateSalary, 
  getSalaryConfig,
  type ManagerLevel, 
  type ClubLevel, 
  type MatchingCell 
} from '@/data/salaryConfig';

const INITIAL_DATA = {
  personalPlan: 1000000,
  personalFact: 870000,
  clubFact: 2850000,
  clubPlan: 3000000,
};

// Фиксированные KPI для прогноза (реальные данные менеджера)
const FORECAST_KPIS: Record<string, string> = {
  closure_time: '90-100%',
};

const PAYMENT_HISTORY = [
  { month: 'Январь 2025', amount: 98500 },
  { month: 'Декабрь 2024', amount: 112000 },
  { month: 'Ноябрь 2024', amount: 105200 },
];

export default function Salary() {
  // Используем дефолтную конфигурацию для страницы Salary
  const config = useMemo(() => getSalaryConfig('moscow_club', 'manager'), []);
  
  // KPI для калькулятора (интерактивные, отдельно от прогноза)
  const [calculatorKPIs, setCalculatorKPIs] = useState<Record<string, string>>({
    closure_time: '90-100%',
  });

  // Состояние для динамического результата из калькулятора
  const [calculatorResult, setCalculatorResult] = useState<{
    managerLevel: ManagerLevel;
    clubLevel: ClubLevel;
    personalFact: number;
    personalPlan: number;
    matchingCells?: MatchingCell[];
    currentBonusPercent?: number;
  } | null>(null);

  const handleCalculationChange = useCallback((result: {
    managerLevel: ManagerLevel;
    clubLevel: ClubLevel;
    personalFact: number;
    personalPlan: number;
    matchingCells?: MatchingCell[];
    currentBonusPercent?: number;
  }) => {
    setCalculatorResult(result);
  }, []);

  const clubPercent = Math.round((INITIAL_DATA.clubFact / INITIAL_DATA.clubPlan) * 100);
  const forecastPercent = Math.round((INITIAL_DATA.personalFact / INITIAL_DATA.personalPlan) * 100);

  // Фиксированный прогноз — использует FORECAST_KPIS, не зависит от калькулятора
  const forecastBreakdown = useMemo(() => {
    return calculateSalary({
      personalFact: INITIAL_DATA.personalFact,
      personalPlan: INITIAL_DATA.personalPlan,
      clubPercent,
      selectedKPIs: FORECAST_KPIS,
      config,
    });
  }, [clubPercent, config]);

  const handleCalculatorKPIChange = (kpiId: string, tierRange: string | null) => {
    setCalculatorKPIs((prev) => {
      if (tierRange === null) {
        const { [kpiId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [kpiId]: tierRange };
    });
  };

  return (
    <Layout>
      <div className="px-4 py-4 pb-24">
        {/* Header */}
        <div className="text-center mb-4">
          <h1 className="text-xl font-bold text-primary">Зарплата</h1>
        </div>

        <div className="space-y-3">
          {/* 1. Мой заработок + прогрессы */}
          <EarningsCard
            baseSalary={forecastBreakdown.baseSalary}
            bonusPercent={forecastBreakdown.bonusPercent}
            bonusAmount={forecastBreakdown.bonusAmount}
            kpiBonus={forecastBreakdown.kpiBonus}
            total={forecastBreakdown.total}
            personalPercent={forecastPercent}
            personalFact={INITIAL_DATA.personalFact}
            personalPlan={INITIAL_DATA.personalPlan}
            clubPercent={clubPercent}
            clubFact={INITIAL_DATA.clubFact}
            clubPlan={INITIAL_DATA.clubPlan}
          />

          {/* 2. Калькулятор */}
          <SalaryCalculator
            config={config}
            selectedKPIs={calculatorKPIs}
            onKPIChange={handleCalculatorKPIChange}
            onCalculationChange={handleCalculationChange}
          />

          <MotivationMatrix
            currentManagerLevel={calculatorResult?.managerLevel ?? forecastBreakdown.managerLevel}
            currentClubLevel={calculatorResult?.clubLevel ?? forecastBreakdown.clubLevel}
            personalFact={calculatorResult?.personalFact ?? INITIAL_DATA.personalFact}
            personalPlan={calculatorResult?.personalPlan ?? INITIAL_DATA.personalPlan}
            matchingCells={calculatorResult?.matchingCells}
            currentBonusPercent={calculatorResult?.currentBonusPercent}
            matrix={config.matrix}
            baseSalary={config.baseSalary}
          />

          {/* 4. История выплат */}
          <PaymentHistory payments={PAYMENT_HISTORY} />
        </div>
      </div>

      <BottomNavigation />
    </Layout>
  );
}

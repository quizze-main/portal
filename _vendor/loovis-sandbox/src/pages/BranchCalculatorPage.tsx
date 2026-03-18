import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import {
  MotivationMatrix,
  SalaryCalculator,
} from '@/components/salary';
import { 
  calculateSalary, 
  getSalaryConfig,
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
import { BRANCHES, getAvailablePositions, getBranchName } from '@/data/branchData';

export default function BranchCalculatorPage() {
  const { branchId } = useParams<{ branchId: string }>();
  
  // Validate branch exists
  const branchName = branchId ? getBranchName(branchId) : undefined;
  
  // If branch doesn't exist, redirect to main calculator
  if (!branchId || !branchName) {
    return <Navigate to="/calculator" replace />;
  }

  const [selectedPosition, setSelectedPosition] = useState('manager');
  
  const [calculatorKPIs, setCalculatorKPIs] = useState<Record<string, string | number>>({
    closure_time: '90-100%',
  });

  // Get config for the fixed branch and selected position
  const config = useMemo<BranchPositionConfig>(() => {
    return getSalaryConfig(branchId, selectedPosition);
  }, [branchId, selectedPosition]);

  // State for dynamic calculator result
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

  // State for matrix cell click
  const [pendingCellClick, setPendingCellClick] = useState<{ clubLevel: ClubLevel; managerLevel: ManagerLevel } | null>(null);

  const handleMatrixCellClick = useCallback((clubLevel: ClubLevel, managerLevel: ManagerLevel) => {
    setPendingCellClick({ clubLevel, managerLevel });
  }, []);

  const handleCellClickProcessed = useCallback(() => {
    setPendingCellClick(null);
  }, []);

  // Get available positions for this branch
  const availablePositions = useMemo(() => {
    return getAvailablePositions(branchId);
  }, [branchId]);

  // Auto-select first available position if current is not available
  useEffect(() => {
    if (availablePositions.length > 0) {
      const isPositionAvailable = availablePositions.some(p => p.id === selectedPosition);
      if (!isPositionAvailable) {
        setSelectedPosition(availablePositions[0].id);
      }
    }
  }, [branchId, availablePositions, selectedPosition]);

  // Reset KPIs when config changes
  useEffect(() => {
    const initialKPIs: Record<string, string | number> = {};
    config.kpis.forEach(kpi => {
      if (kpi.type !== 'multiplier' && kpi.tiers.length > 0) {
        initialKPIs[kpi.id] = kpi.tiers[0].range;
      }
    });
    setCalculatorKPIs(initialKPIs);
  }, [config]);

  // Default values for initial calculation
  const forecastBreakdown = useMemo(() => {
    const personalFact = config.personalPlan * 0.87;
    const clubPercent = 95;
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
            {branchName}
          </h1>
          <div className="flex flex-col gap-1">
            {/* Position only - branch is fixed */}
            <span className="text-xs text-muted-foreground">Должность</span>
            <Select value={selectedPosition} onValueChange={setSelectedPosition}>
              <SelectTrigger className="w-full h-9 bg-card text-sm">
                <SelectValue className="truncate" />
              </SelectTrigger>
              <SelectContent>
                {availablePositions.map(pos => {
                  const isConfigured = hasSpecificConfig(branchId, pos.id);
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
          />
        </div>
      </div>
    </div>
  );
}

import type { ManagerLevel, ClubLevel } from '@/data/salaryConfig';

export interface SalarySessionEmployee {
  employeeId: string;
  employeeName: string;
  designation: string;
  positionId: string;
  // Tracker data
  branchPlan: number;
  branchFact: number;
  branchPercent: number;
  managerPlan: number;
  managerFact: number;
  managerPercent: number;
  // KPI
  selectedKPIs: Record<string, string | number>;
  // Calculated
  baseSalary: number;
  bonusPercent: number;
  bonusAmount: number;
  kpiBonus: number;
  total: number;
  managerLevel: ManagerLevel;
  clubLevel: ClubLevel;
  explanation: string;
}

export interface SalaryCalculationSession {
  id: string;
  branchId: string;
  period: string;
  clubPercent: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  employees: SalarySessionEmployee[];
}

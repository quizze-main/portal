import { ReactNode } from "react";
import { useEmployee } from "@/contexts/EmployeeProvider";
import { Navigate } from "react-router-dom";

export function RequireClubManager({ children }: { children: ReactNode }) {
  const { employee, canUseLeaderDashboard } = useEmployee();
  const canAccess = canUseLeaderDashboard;

  if (!employee) return null;
  if (!canAccess) return <Navigate to="/" replace />;
  return <>{children}</>;
}



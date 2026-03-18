import { Navigate } from 'react-router-dom';
import { useEmployee } from '@/contexts/EmployeeProvider';

export const RequireAccountant = ({ children }: { children: JSX.Element }) => {
  const { hasAllBranchesAccess } = useEmployee();
  if (!hasAllBranchesAccess) return <Navigate to="/" replace />;
  return children;
};

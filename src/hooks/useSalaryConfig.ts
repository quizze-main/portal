import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { internalApiClient } from '@/lib/internalApiClient';
import { getSalaryConfig as getLocalConfig, type BranchPositionConfig } from '@/data/salaryConfig';

const SALARY_CONFIGS_KEY = ['salary-configs'];

/**
 * Получить все серверные конфигурации зарплат
 */
export function useSalaryConfigs() {
  return useQuery({
    queryKey: SALARY_CONFIGS_KEY,
    queryFn: () => internalApiClient.getSalaryConfigs(),
    staleTime: 5 * 60 * 1000, // 5 минут
    retry: 1,
  });
}

/**
 * Получить конфигурацию зарплаты для конкретного филиала + должности + (опционально) сотрудника.
 * Приоритет: employee override → position config → local hardcoded default.
 */
export function useSalaryConfig(branchId: string, positionId: string, employeeId?: string | null) {
  const { data: serverConfigs } = useSalaryConfigs();

  return useMemo(() => {
    const posKey = `${branchId}_${positionId}`;

    // 1. Try employee-specific override
    if (employeeId) {
      const empKey = `${posKey}_emp_${employeeId}`;
      const empConfig = serverConfigs?.[empKey] as BranchPositionConfig | undefined;
      if (empConfig) return empConfig;
    }

    // 2. Fallback to position-level config
    const serverConfig = serverConfigs?.[posKey] as BranchPositionConfig | undefined;
    if (serverConfig) return serverConfig;

    // 3. Fallback to local hardcoded default
    return getLocalConfig(branchId, positionId);
  }, [branchId, positionId, employeeId, serverConfigs]);
}

/**
 * Информация об источнике конфигурации (employee override vs position default).
 * Используется для UI-индикации.
 */
export function useSalaryConfigSource(branchId: string, positionId: string, employeeId?: string | null) {
  const { data: serverConfigs } = useSalaryConfigs();

  return useMemo(() => {
    if (!employeeId) {
      return { isEmployeeOverride: false, hasEmployeeOverride: false };
    }
    const empKey = `${branchId}_${positionId}_emp_${employeeId}`;
    const hasOverride = !!serverConfigs?.[empKey];
    return { isEmployeeOverride: hasOverride, hasEmployeeOverride: hasOverride };
  }, [branchId, positionId, employeeId, serverConfigs]);
}

/**
 * Мутация для сохранения конфигурации на сервер
 */
export function useSalaryConfigMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, config }: { key: string; config: BranchPositionConfig }) => {
      const success = await internalApiClient.updateSalaryConfig(key, config as unknown as Record<string, unknown>);
      if (!success) throw new Error('Failed to save salary config');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SALARY_CONFIGS_KEY });
    },
  });
}

/**
 * Мутация для удаления кастомной конфигурации (возврат к дефолту)
 */
export function useSalaryConfigDeleteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (key: string) => {
      const success = await internalApiClient.deleteSalaryConfig(key);
      if (!success) throw new Error('Failed to delete salary config');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SALARY_CONFIGS_KEY });
    },
  });
}

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
 * Получить конфигурацию зарплаты для конкретного филиала + должности.
 * Возвращает серверную конфигурацию с fallback на локальный хардкод.
 * Note: returns local config during loading phase, then switches to server config if available.
 */
export function useSalaryConfig(branchId: string, positionId: string) {
  const { data: serverConfigs } = useSalaryConfigs();

  return useMemo(() => {
    const key = `${branchId}_${positionId}`;
    const serverConfig = serverConfigs?.[key] as BranchPositionConfig | undefined;
    return serverConfig ?? getLocalConfig(branchId, positionId);
  }, [branchId, positionId, serverConfigs]);
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

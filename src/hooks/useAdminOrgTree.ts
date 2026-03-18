import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { internalApiClient } from '@/lib/internalApiClient';
import type { CreateDepartmentParams, UpdateDepartmentParams, CreateEmployeeParams, UpdateEmployeeParams } from '@/lib/internalApiClient';
import { buildOrgTree } from '@/lib/orgTreeBuilder';

const ORG_TREE_KEY = ['admin', 'org-tree'];

export function useAdminOrgTree() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ORG_TREE_KEY,
    queryFn: () => internalApiClient.getOrgTree(),
    staleTime: 60_000,
  });

  const tree = useMemo(
    () => query.data ? buildOrgTree(query.data.departments, query.data.employees) : [],
    [query.data]
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ORG_TREE_KEY });

  const createDeptMutation = useMutation({
    mutationFn: (data: CreateDepartmentParams) => internalApiClient.createDepartment(data),
    onSuccess: invalidate,
  });

  const updateDeptMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDepartmentParams }) =>
      internalApiClient.updateDepartment(id, data),
    onSuccess: invalidate,
  });

  const deleteDeptMutation = useMutation({
    mutationFn: (id: string) => internalApiClient.deleteDepartment(id),
    onSuccess: invalidate,
  });

  const createEmpMutation = useMutation({
    mutationFn: (data: CreateEmployeeParams) => internalApiClient.createAdminEmployee(data),
    onSuccess: invalidate,
  });

  const updateEmpMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEmployeeParams }) =>
      internalApiClient.updateAdminEmployee(id, data),
    onSuccess: invalidate,
  });

  const deleteEmpMutation = useMutation({
    mutationFn: (id: string) => internalApiClient.deleteAdminEmployee(id),
    onSuccess: invalidate,
  });

  return {
    rawData: query.data,
    tree,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,

    createDepartment: createDeptMutation,
    updateDepartment: updateDeptMutation,
    deleteDepartment: deleteDeptMutation,

    createEmployee: createEmpMutation,
    updateEmployee: updateEmpMutation,
    deleteEmployee: deleteEmpMutation,
  };
}

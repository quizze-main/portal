import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { DashboardWidget } from '@/lib/internalApiClient';

const WIDGETS_QUERY_KEY = ['admin', 'widgets'];

async function fetchWidgets(): Promise<DashboardWidget[]> {
  try {
    const resp = await fetch('/api/admin/widgets', { credentials: 'include' });
    if (!resp.ok) return []; // Graceful fallback — endpoint may not exist yet
    const json = await resp.json();
    return json.widgets || [];
  } catch {
    return []; // Network error — return empty, dashboard will use fallback rendering
  }
}

async function createWidget(widget: Partial<DashboardWidget>): Promise<DashboardWidget> {
  const resp = await fetch('/api/admin/widgets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(widget),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || `Failed to create widget: ${resp.status}`);
  }
  const json = await resp.json();
  return json.widget;
}

async function updateWidget(id: string, data: Partial<DashboardWidget>): Promise<DashboardWidget> {
  const resp = await fetch(`/api/admin/widgets/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || `Failed to update widget: ${resp.status}`);
  }
  const json = await resp.json();
  return json.widget;
}

async function deleteWidget(id: string): Promise<void> {
  const resp = await fetch(`/api/admin/widgets/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || `Failed to delete widget: ${resp.status}`);
  }
}

async function reorderWidgets(ids: string[]): Promise<void> {
  const resp = await fetch('/api/admin/widgets/reorder', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ ids }),
  });
  if (!resp.ok) throw new Error(`Failed to reorder widgets: ${resp.status}`);
}

export function useWidgets() {
  const queryClient = useQueryClient();

  const { data: widgets = [], isLoading, error } = useQuery({
    queryKey: WIDGETS_QUERY_KEY,
    queryFn: fetchWidgets,
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: createWidget,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: WIDGETS_QUERY_KEY }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<DashboardWidget> }) => updateWidget(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: WIDGETS_QUERY_KEY }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWidget,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: WIDGETS_QUERY_KEY }),
  });

  const reorderMutation = useMutation({
    mutationFn: reorderWidgets,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: WIDGETS_QUERY_KEY }),
  });

  return {
    widgets,
    isLoading,
    error,
    createWidget: createMutation.mutateAsync,
    updateWidget: (id: string, data: Partial<DashboardWidget>) => updateMutation.mutateAsync({ id, data }),
    deleteWidget: deleteMutation.mutateAsync,
    reorderWidgets: reorderMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

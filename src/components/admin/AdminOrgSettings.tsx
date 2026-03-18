import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/Spinner';
import { RefreshCw, Database, FileJson, Cloud, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { internalApiClient } from '@/lib/internalApiClient';

export const AdminOrgSettings: React.FC = () => {
  const queryClient = useQueryClient();

  const config = useQuery({
    queryKey: ['admin', 'org-config'],
    queryFn: () => internalApiClient.getOrgConfig(),
  });

  const syncStatus = useQuery({
    queryKey: ['admin', 'sync-status'],
    queryFn: () => internalApiClient.getSyncStatus(),
    refetchInterval: 30_000,
  });

  const toggleSource = useMutation({
    mutationFn: (source: string) => internalApiClient.setOrgConfig(source),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'org-config'] });
      queryClient.invalidateQueries({ queryKey: ['admin-org-tree'] });
      queryClient.invalidateQueries({ queryKey: ['admin-employees'] });
      toast.success(`Источник данных переключён: ${data.previous} → ${data.orgDataSource}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const triggerSync = useMutation({
    mutationFn: () => internalApiClient.triggerFrappeSync(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'sync-status'] });
      queryClient.invalidateQueries({ queryKey: ['admin-org-tree'] });
      const results = data?.results || {};
      const errors = data?.errors || [];
      toast.success(
        `Синхронизация завершена: ${results.employees?.synced || 0} сотр., ${results.departments?.synced || 0} отд.` +
        (errors.length > 0 ? ` (${errors.length} ошибок)` : '')
      );
    },
    onError: (err: Error) => toast.error(`Ошибка синхронизации: ${err.message}`),
  });

  if (config.isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner size="md" />
      </div>
    );
  }

  const isFrappeMode = config.data?.orgDataSource === 'frappe';
  const isOwnMode = config.data?.orgDataSource === 'postgres';
  const frappeConfigured = config.data?.frappeConfigured ?? false;

  return (
    <div className="space-y-6">
      {/* Data Source Toggle */}
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Источник данных оргструктуры</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Определяет откуда берутся данные о сотрудниках, отделах и ролях
            </p>
          </div>
          <Badge variant={isFrappeMode ? 'default' : 'secondary'} className="shrink-0">
            {isFrappeMode ? 'Frappe API' : isOwnMode ? 'Свои данные' : config.data?.orgDataSource}
          </Badge>
        </div>

        <div className="rounded-lg border p-4 space-y-4">
          {/* Frappe toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <Cloud className="w-4.5 h-4.5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Frappe ERP</p>
                <p className="text-xs text-muted-foreground">
                  {isFrappeMode ? 'Все запросы идут напрямую в Frappe API' : 'Отключён — данные из JSON/БД'}
                </p>
              </div>
            </div>
            <Switch
              checked={isFrappeMode}
              onCheckedChange={(checked) => {
                toggleSource.mutate(checked ? 'frappe' : 'postgres');
              }}
              disabled={toggleSource.isPending}
            />
          </div>

          <div className="border-t" />

          {/* Own data info */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <FileJson className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Свои данные (JSON)</p>
              <p className="text-xs text-muted-foreground">
                {isOwnMode
                  ? 'Активно — управление через админку, данные в JSON-файлах'
                  : 'Будет активировано при отключении Frappe'}
              </p>
            </div>
            {isOwnMode && (
              <Badge variant="outline" className="text-green-600 border-green-300">Активно</Badge>
            )}
          </div>

          {config.data?.databaseConfigured && (
            <>
              <div className="border-t" />
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <Database className="w-4.5 h-4.5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">PostgreSQL</p>
                  <p className="text-xs text-muted-foreground">Подключена — данные хранятся в базе</p>
                </div>
                <Badge variant="outline" className="text-green-600 border-green-300">Подключена</Badge>
              </div>
            </>
          )}
        </div>

        {!isFrappeMode && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <p className="text-xs">
              Frappe отключён. Оргструктура управляется локально. Для обновления данных из Frappe
              используйте кнопку «Синхронизация» ниже.
            </p>
          </div>
        )}
      </div>

      {/* Frappe Sync */}
      {frappeConfigured && (
        <div className="rounded-lg border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Синхронизация из Frappe</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Загрузить актуальные данные из Frappe и обновить локальные файлы
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => triggerSync.mutate()}
              disabled={triggerSync.isPending}
            >
              <RefreshCw className={`w-4 h-4 mr-1.5 ${triggerSync.isPending ? 'animate-spin' : ''}`} />
              {triggerSync.isPending ? 'Синхронизация...' : 'Синхронизировать'}
            </Button>
          </div>

          {syncStatus.data?.state && syncStatus.data.state.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {syncStatus.data.state.map((s: any) => (
                <div key={s.entity_type} className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground capitalize">{s.entity_type}</p>
                  <p className="text-lg font-semibold">{s.record_count}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {s.last_sync ? new Date(s.last_sync).toLocaleString() : '—'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

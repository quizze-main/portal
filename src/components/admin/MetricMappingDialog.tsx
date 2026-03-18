import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Loader2, Save, GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SOURCE_LABELS } from './dashboard-constants';
import { useFieldMappingEditor } from '@/hooks/useFieldMappingEditor';
import { MergedMappingSection, AddOverrideMappingForm } from './shared-metric-components';
import type { DashboardMetricConfig, MetricBinding, FieldMappingEntityType } from '@/lib/internalApiClient';

// ─── Props ───

interface MetricMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metric: DashboardMetricConfig;
  onSave: (data: { fieldMappings: import('@/lib/internalApiClient').FieldMapping[]; bindings: MetricBinding[] }) => Promise<void>;
}

interface MetricMappingContentProps {
  metric: DashboardMetricConfig;
  active?: boolean;
  onSave: (data: { fieldMappings: import('@/lib/internalApiClient').FieldMapping[]; bindings: MetricBinding[] }) => Promise<void>;
  onCancel?: () => void;
  embedded?: boolean;
}

// ─── Content Component (reusable) ───

export const MetricMappingContent: React.FC<MetricMappingContentProps> = ({
  metric,
  active = true,
  onSave,
  onCancel,
  embedded = false,
}) => {
  const isExternalApi = metric.source === 'external_api';

  // ─── Field mapping editor (for external_api) ───
  const editor = useFieldMappingEditor({
    active: active && isExternalApi,
    dataSourceId: metric.dataSourceId || null,
    source: metric.source,
    initialFieldMappings: metric.fieldMappings || [],
  });

  // ─── Legacy bindings state (for tracker/manual) ───
  const [legacyBranchBindings, setLegacyBranchBindings] = useState<Set<string>>(() => {
    const set = new Set<string>();
    for (const b of metric.bindings || []) {
      if (b.scope === 'branch' && b.enabled !== false) set.add(b.scopeId);
    }
    return set;
  });
  const [networkEnabled, setNetworkEnabled] = useState(
    () => (metric.bindings || []).some(b => b.scope === 'network' && b.enabled !== false)
  );

  // Reset legacy state when metric changes
  useEffect(() => {
    const set = new Set<string>();
    for (const b of metric.bindings || []) {
      if (b.scope === 'branch' && b.enabled !== false) set.add(b.scopeId);
    }
    setLegacyBranchBindings(set);
    setNetworkEnabled((metric.bindings || []).some(b => b.scope === 'network' && b.enabled !== false));
    setShowAddOverride(false);
  }, [metric.id, metric.bindings]);

  // ─── Add override form ───
  const [showAddOverride, setShowAddOverride] = useState(false);

  // ─── Saving state ───
  const [isSaving, setIsSaving] = useState(false);

  // ─── Base params (read-only) ───
  const baseParams = useMemo(() => {
    const map: Record<string, string> = {};
    if (Array.isArray(metric.externalQueryParams)) {
      for (const p of metric.externalQueryParams) {
        if (p.key) map[p.key] = p.value;
      }
    }
    return map;
  }, [metric.externalQueryParams]);

  // ─── Legacy binding toggle ───
  const toggleLegacyBranch = useCallback((storeId: string) => {
    setLegacyBranchBindings(prev => {
      const next = new Set(prev);
      if (next.has(storeId)) next.delete(storeId);
      else next.add(storeId);
      return next;
    });
  }, []);

  // ─── Save ───
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const bindings: MetricBinding[] = [];

      if (networkEnabled) {
        bindings.push({ scope: 'network', scopeId: '*', enabled: true });
      }

      if (isExternalApi) {
        bindings.push(...editor.deriveBindingsFromMappings());
        // Deduplicate
        const seen = new Set<string>();
        const unique = bindings.filter(b => {
          const key = `${b.scope}:${b.scopeId}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        bindings.length = 0;
        bindings.push(...unique);
      } else {
        for (const storeId of legacyBranchBindings) {
          bindings.push({ scope: 'branch', scopeId: storeId, enabled: true });
        }
      }

      await onSave({ fieldMappings: editor.getCleanOverrides(), bindings });
    } finally {
      setIsSaving(false);
    }
  }, [networkEnabled, isExternalApi, editor, legacyBranchBindings, onSave]);

  // ─── Stats ───
  const statsText = isExternalApi
    ? [
        editor.countMappedByType('branch') > 0 && `${editor.countMappedByType('branch')} фил.`,
        editor.countMappedByType('employee') > 0 && `${editor.countMappedByType('employee')} сотр.`,
        editor.countMappedByType('department') > 0 && `${editor.countMappedByType('department')} отд.`,
        editor.countMappedByType('designation') > 0 && `${editor.countMappedByType('designation')} долж.`,
        editor.countMappedByType('custom') > 0 && `${editor.countMappedByType('custom')} кастом.`,
      ].filter(Boolean).join(', ') || 'Нет маппинга'
    : `${legacyBranchBindings.size} филиалов${networkEnabled ? ' + вся сеть' : ''}`;

  return (
    <div className="space-y-4">
      {/* Header info (when embedded) */}
      {embedded && (
        <div className="text-xs text-muted-foreground">
          Источник: {SOURCE_LABELS[metric.source] || metric.source}
          {isExternalApi && metric.externalPath && (
            <span className="ml-2 font-mono">{metric.externalPath}</span>
          )}
          {isExternalApi && editor.sourceLabel && (
            <span className="ml-2">({editor.sourceLabel})</span>
          )}
        </div>
      )}

      {/* Base params (read-only) */}
      {isExternalApi && Object.keys(baseParams).length > 0 && (
        <div className="bg-muted/30 rounded-md px-3 py-2">
          <div className="text-[10px] font-medium text-muted-foreground mb-1">
            Базовые параметры запроса (общие для всех)
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(baseParams).map(([k, v]) => (
              <span key={k} className="text-[10px] font-mono bg-background px-1.5 py-0.5 rounded border">
                {k}={v}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Network toggle (tracker/manual only) */}
      {!isExternalApi && (
        <div className="flex items-center gap-2 px-1">
          <Checkbox
            checked={networkEnabled}
            onCheckedChange={(v) => setNetworkEnabled(!!v)}
          />
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
            Сеть
          </span>
          <span className="text-xs text-muted-foreground">Вся сеть (метрика видна всем филиалам)</span>
        </div>
      )}

      {/* External API: Merged Field Mappings */}
      {isExternalApi && (
        <>
          {editor.mergedMappings.map(({ mapping, isInherited, overrideValues }) => (
            <MergedMappingSection
              key={`${mapping.apiField}_${mapping.entityType}`}
              mapping={mapping}
              isInherited={isInherited}
              overrideValues={overrideValues}
              branches={editor.branches}
              employees={editor.employees}
              loadingEmployees={editor.loadingEmployees}
              departments={editor.departments}
              loadingDepartments={editor.loadingDepartments}
              designations={editor.designations}
              loadingDesignations={editor.loadingDesignations}
              sourceLabel={editor.sourceLabel}
              onSetOverride={(entityId, value) => editor.setOverrideValue(mapping.apiField, mapping.entityType, entityId, value)}
              onClearOverride={(entityId) => editor.clearOverrideValue(mapping.apiField, mapping.entityType, entityId)}
              onRemoveMapping={() => editor.removeOverrideMapping(mapping.apiField, mapping.entityType)}
              onAddEmployee={(empId) => editor.addEmployeeToOverride(mapping.apiField, mapping.entityType, empId)}
            />
          ))}

          {showAddOverride ? (
            <AddOverrideMappingForm
              onAdd={(apiField, entityType, label) => {
                editor.addOverrideMapping(apiField, entityType, label);
                setShowAddOverride(false);
              }}
              onCancel={() => setShowAddOverride(false)}
            />
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs w-full"
              onClick={() => setShowAddOverride(true)}
            >
              <Plus className="w-3 h-3 mr-1" />
              Добавить оверрайд для этой метрики
            </Button>
          )}

          {editor.mergedMappings.length === 0 && !showAddOverride && (
            <div className="text-center py-6 text-muted-foreground text-xs">
              <p>Нет маппинга полей. Настройте маппинг в источнике данных{editor.sourceLabel ? ` (${editor.sourceLabel})` : ''}</p>
              <p className="mt-1">или добавьте оверрайд для этой метрики.</p>
            </div>
          )}
        </>
      )}

      {/* Tracker/Manual: Legacy branch checkboxes */}
      {!isExternalApi && (
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-2">
            <GitBranch className="w-3 h-3 inline mr-1" />
            Видимость по филиалам ({legacyBranchBindings.size} выбрано)
          </div>
          <div className="border rounded-md divide-y">
            {editor.branches.map(branch => (
              <div
                key={branch.storeId}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 transition-colors',
                  legacyBranchBindings.has(branch.storeId) && 'bg-blue-50/50 dark:bg-blue-950/20'
                )}
              >
                <Checkbox
                  checked={legacyBranchBindings.has(branch.storeId)}
                  onCheckedChange={() => toggleLegacyBranch(branch.storeId)}
                />
                <span className="text-xs flex-1">{branch.name}</span>
                <span className="text-[10px] text-muted-foreground font-mono">{branch.storeId}</span>
              </div>
            ))}
          </div>
          {legacyBranchBindings.size === 0 && !networkEnabled && (
            <p className="text-[10px] text-muted-foreground mt-1">
              Нет привязок — метрика видна всем филиалам
            </p>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t sticky bottom-0 bg-background pb-1">
        <div className="text-[10px] text-muted-foreground">{statsText}</div>
        <div className="flex gap-2">
          {onCancel && (
            <Button size="sm" variant="outline" onClick={onCancel} className="h-8 text-xs">
              Отмена
            </Button>
          )}
          <Button size="sm" onClick={handleSave} disabled={isSaving} className="h-8 text-xs">
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}
            Сохранить маппинг
          </Button>
        </div>
      </div>
    </div>
  );
};

// ─── Dialog Wrapper (backward compat) ───

export const MetricMappingDialog: React.FC<MetricMappingDialogProps> = ({
  open,
  onOpenChange,
  metric,
  onSave,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-sm">
            Маппинг данных: {metric.name}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Источник: {SOURCE_LABELS[metric.source] || metric.source}
            {metric.source === 'external_api' && metric.externalPath && (
              <span className="ml-2 font-mono">{metric.externalPath}</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1">
          <MetricMappingContent
            metric={metric}
            active={open}
            onSave={onSave}
            onCancel={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

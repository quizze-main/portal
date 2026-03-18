import React, { useMemo, useState, useEffect } from 'react';
import { useLeaderMetrics, METRIC_UNITS, toNumber } from '@/hooks/useLeaderMetrics';
import type { RankingWidgetConfig } from '@/lib/internalApiClient';
import { internalApiClient } from '@/lib/internalApiClient';
import { Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminRankingPreviewProps {
  config: RankingWidgetConfig;
  storeIds: string[];
  dateFrom?: string;
  dateTo?: string;
}

const fmtValue = (v: number, code: string): string => {
  const unit = METRIC_UNITS[code];
  if (unit === '%') return `${Math.round(v)}%`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace('.0', '')}М`;
  if (v >= 1000) return `${Math.round(v / 1000)}К`;
  return String(Math.round(v));
};

function AdminRankingPreviewInner({ config, storeIds, dateFrom, dateTo }: AdminRankingPreviewProps) {
  const { entityType, metricCodes } = config;
  const primaryCode = metricCodes[0];

  const [nameById, setNameById] = useState<Map<string, string>>(new Map());

  const { metrics, loading, error } = useLeaderMetrics({
    storeIds,
    dateFrom,
    dateTo,
    extraCodes: metricCodes,
  });

  // Load names: departments for branches, employees for managers
  useEffect(() => {
    if (storeIds.length === 0) return;
    let cancelled = false;

    if (entityType === 'branch') {
      // Get store names from departments (custom_store_id → department_name)
      // Tracker keys may have "itigris-" prefix, Frappe custom_store_id does not
      internalApiClient.getDepartments()
        .then(depts => {
          if (cancelled) return;
          const map = new Map<string, string>();
          for (const d of depts) {
            if (d.custom_store_id) {
              const sid = String(d.custom_store_id);
              const name = String(d.department_name || d.name);
              map.set(sid, name);
              map.set(`itigris-${sid}`, name);
            }
          }
          setNameById(map);
        })
        .catch(() => {});
    } else {
      // Get employee names, match by custom_itigris_user_id
      internalApiClient.getEmployeesByStores({ storeIds, limit: 500 })
        .then(employees => {
          if (cancelled) return;
          const map = new Map<string, string>();
          for (const e of employees) {
            const itigrisId = e.custom_itigris_user_id ? String(e.custom_itigris_user_id).trim() : '';
            const displayName = String(e.employee_name || e.name);
            if (itigrisId) {
              map.set(itigrisId, displayName);
              map.set(`itigris-${itigrisId}`, displayName);
            }
            map.set(String(e.name), displayName);
          }
          setNameById(map);
        })
        .catch(() => {});
    }

    return () => { cancelled = true; };
  }, [entityType, storeIds]);

  // Extract top-5 rows from ranking data
  const rows = useMemo(() => {
    if (!primaryCode || metrics.size === 0) return [];

    const metricData = metrics.get(primaryCode);
    if (!metricData) return [];

    type Row = { name: string; fact: number; plan: number };
    const items: Row[] = [];

    const source = entityType === 'branch' ? metricData.stores : metricData.managers;
    if (!source) return [];

    for (const [id, data] of Object.entries(source)) {
      items.push({
        name: nameById.get(id) ?? id,
        fact: toNumber(data.fact_value),
        plan: toNumber(data.plan_value),
      });
    }

    items.sort((a, b) => b.fact - a.fact);
    return items.slice(0, 5);
  }, [metrics, primaryCode, entityType, nameById]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-destructive py-3 justify-center">
        <AlertCircle className="w-3 h-3" />
        <span>Ошибка загрузки</span>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="text-[10px] text-muted-foreground py-3 text-center">Нет данных</div>
    );
  }

  return (
    <div className="text-[11px]">
      {/* Header */}
      <div className="grid grid-cols-[1rem_1fr_3.5rem_3.5rem] px-1 py-0.5 text-[10px] text-muted-foreground font-medium border-b">
        <span>#</span>
        <span>{entityType === 'branch' ? 'Филиал' : 'Сотрудник'}</span>
        <span className="text-right">Факт</span>
        <span className="text-right">План</span>
      </div>
      {/* Rows */}
      {rows.map((row, i) => (
        <div
          key={i}
          className={cn(
            "grid grid-cols-[1rem_1fr_3.5rem_3.5rem] px-1 py-0.5",
            i % 2 === 1 && "bg-muted/30"
          )}
        >
          <span className="text-muted-foreground tabular-nums">{i + 1}</span>
          <span className="truncate">{row.name}</span>
          <span className={cn(
            "text-right tabular-nums font-semibold",
            row.plan > 0 && row.fact >= row.plan ? "text-emerald-500" : row.plan > 0 ? "text-red-500" : ""
          )}>
            {fmtValue(row.fact, primaryCode)}
          </span>
          <span className="text-right tabular-nums text-muted-foreground">
            {fmtValue(row.plan, primaryCode)}
          </span>
        </div>
      ))}
      {metricCodes.length > 1 && (
        <div className="text-[9px] text-muted-foreground mt-1 px-1">
          +{metricCodes.length - 1} метр.
        </div>
      )}
    </div>
  );
}

export const AdminRankingPreview = React.memo(AdminRankingPreviewInner);

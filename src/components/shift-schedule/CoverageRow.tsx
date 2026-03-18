import React from 'react';
import { CoverageDayDetail } from './CoverageDayDetail';
import type { DayCoverage } from '@/types/staffing-requirements';

interface CoverageRowProps {
  coverageData: DayCoverage[];
}

function getCoverageColor(cov: DayCoverage): string {
  if (!cov.totalRequired) return '';
  if (cov.totalScheduled >= cov.totalRequired) {
    return cov.totalScheduled === cov.totalRequired
      ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
      : 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300';
  }
  return cov.totalScheduled === 0
    ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
    : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300';
}

export const CoverageRow = React.memo(function CoverageRow({ coverageData }: CoverageRowProps) {
  if (!coverageData.length) return null;

  const hasAnyRequirements = coverageData.some(c => c.totalRequired > 0);
  if (!hasAnyRequirements) return null;

  return (
    <tr className="border-b-2 border-border/50">
      <td className="sticky left-0 z-10 bg-muted/60 dark:bg-muted/30 backdrop-blur-sm border-r border-border/30 px-3 py-1.5">
        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Смена
        </div>
      </td>
      {coverageData.map((cov) => {
        const colorClass = getCoverageColor(cov);
        const hasReqs = cov.totalRequired > 0;
        const surplus = cov.totalScheduled - cov.totalRequired;

        return (
          <CoverageDayDetail key={cov.date} coverage={cov}>
            <td
              className={`
                text-center text-[10px] font-bold
                min-w-[38px] max-w-[44px] py-1.5
                ${hasReqs ? `cursor-pointer ${colorClass} hover:brightness-95 dark:hover:brightness-110 transition-all` : 'text-muted-foreground/30'}
              `}
            >
              {hasReqs ? (
                <>
                  <span className="tabular-nums">{cov.totalScheduled}/{cov.totalRequired}</span>
                  {surplus > 0 && <div className="text-[8px] font-medium text-blue-500 -mt-0.5">+{surplus}</div>}
                </>
              ) : '—'}
            </td>
          </CoverageDayDetail>
        );
      })}
      {/* Summary cell */}
      <td className="sticky right-0 z-10 bg-muted/60 dark:bg-muted/30 backdrop-blur-sm border-l border-border/30 px-1 py-1 text-center">
        {(() => {
          const totalReq = coverageData.reduce((s, c) => s + c.totalRequired, 0);
          const totalSched = coverageData.reduce((s, c) => s + c.totalScheduled, 0);
          if (!totalReq) return null;
          const ratio = totalSched / totalReq;
          const color = ratio >= 1
            ? 'text-emerald-600 dark:text-emerald-400'
            : ratio > 0.5
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-red-600 dark:text-red-400';
          return <span className={`text-[10px] font-bold ${color}`}>{Math.round(ratio * 100)}%</span>;
        })()}
      </td>
    </tr>
  );
});

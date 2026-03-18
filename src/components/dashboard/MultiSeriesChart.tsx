import React, { useMemo, useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { IntegratedBarChartDataPoint } from './IntegratedBarChart';
import type { ChartMetricSeries } from '@/lib/internalApiClient';
import { METRIC_NAMES, METRIC_UNITS } from '@/hooks/useLeaderMetrics';
import { useChartDimensions } from '@/hooks/useChartDimensions';

// ─── Types ──────────────────────────────────────────────────────────

export interface MultiSeriesChartProps {
  /** Data per metric code */
  seriesData: Record<string, IntegratedBarChartDataPoint[]>;
  /** Series config (metric, chart type, color) */
  series: ChartMetricSeries[];
  /** Which series are visible (metric codes) */
  visibleSeries: Set<string>;
  height?: number;
  className?: string;
  /** Toggle a series on/off (if provided, legend becomes interactive) */
  onToggleSeries?: (metricCode: string) => void;
  /** Whether plan lines are hidden */
  hidePlans?: boolean;
  /** Toggle plan lines visibility */
  onTogglePlans?: () => void;
}

// ─── Formatters ─────────────────────────────────────────────────────

const formatCompact = (value: number): string => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace('.0', '')}М`;
  if (value >= 1000) return `${Math.round(value / 1000)}К`;
  return String(Math.round(value));
};

const formatFull = (value: number): string =>
  new Intl.NumberFormat('ru-RU').format(Math.round(value));

const MONTH_GENITIVE = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

const formatTooltipDate = (dateStr: string): string => {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getDate()} ${MONTH_GENITIVE[d.getMonth()]}`;
};

// ─── Smooth path generator (reused from IntegratedBarChart) ─────────

const generateSmoothPath = (points: { x: number; y: number }[], yMin?: number, yMax?: number): string => {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;

  const clamp = (v: number) => {
    if (yMin !== undefined) v = Math.max(yMin, v);
    if (yMax !== undefined) v = Math.min(yMax, v);
    return v;
  };

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const t = 0.3;
    const cp1x = p1.x + (p2.x - p0.x) * t;
    const cp1y = clamp(p1.y + (p2.y - p0.y) * t);
    const cp2x = p2.x - (p3.x - p1.x) * t;
    const cp2y = clamp(p2.y - (p3.y - p1.y) * t);
    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return path;
};

// ─── Helpers ────────────────────────────────────────────────────────

/** Determine if a metric uses % unit */
const isPercentMetric = (code: string) => {
  const unit = METRIC_UNITS[code];
  return unit === '%';
};

/** Format value based on metric unit */
const formatByUnit = (value: number, metricCode: string, compact = true): string => {
  if (isPercentMetric(metricCode)) return `${Math.round(value)}%`;
  return compact ? formatCompact(value) : formatFull(value);
};

/** Compute nice Y-axis ticks for a given data range */
const computeNiceTicks = (rawMax: number, isPct: boolean): { min: number; max: number; ticks: number[] } => {
  if (isPct) {
    const niceMax = Math.min(100, Math.ceil((rawMax * 1.15) / 10) * 10) || 100;
    const step = niceMax <= 50 ? 10 : 20;
    const ticks: number[] = [];
    for (let t = 0; t <= niceMax; t += step) ticks.push(t);
    return { min: 0, max: niceMax, ticks };
  }
  const niceMax = rawMax * 1.2 || 100;
  const step = niceMax > 1_000_000 ? 200_000
    : niceMax > 100_000 ? 50_000
    : niceMax > 10_000 ? 5_000
    : niceMax > 1_000 ? 200
    : niceMax > 100 ? 20
    : 5;
  const ticks: number[] = [];
  for (let t = 0; t <= niceMax; t += step) ticks.push(t);
  if (ticks.length > 8) {
    const newStep = step * 2;
    ticks.length = 0;
    for (let t = 0; t <= niceMax; t += newStep) ticks.push(t);
  }
  return { min: 0, max: niceMax, ticks };
};

// ─── Component ──────────────────────────────────────────────────────

export const MultiSeriesChart: React.FC<MultiSeriesChartProps> = ({
  seriesData,
  series,
  visibleSeries,
  height: heightProp = 240,
  className,
  onToggleSeries,
  hidePlans,
  onTogglePlans,
}) => {
  const internalRef = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tappedIndex, setTappedIndex] = useState<number | null>(null);
  const activeIndex = hoveredIndex ?? tappedIndex;

  // Count data points for adaptive sizing
  const dataPointsCount = useMemo(() => {
    const dateSet = new Set<string>();
    for (const s of series) {
      for (const p of (seriesData[s.metricCode] || [])) {
        if (p.fullDate) dateSet.add(p.fullDate);
      }
    }
    return dateSet.size;
  }, [seriesData, series]);

  const { containerRef, height: adaptiveHeight, isDesktop } = useChartDimensions({
    dataPointsCount,
    baseHeight: heightProp,
    desiredAspectRatio: 3.2,
    maxHeight: 340,
  });

  const height = adaptiveHeight;

  // Dismiss tap on outside touch
  useEffect(() => {
    if (tappedIndex === null) return;
    const dismiss = (e: TouchEvent) => {
      if (internalRef.current && !internalRef.current.contains(e.target as Node)) {
        setTappedIndex(null);
      }
    };
    document.addEventListener('touchstart', dismiss, { passive: true });
    return () => document.removeEventListener('touchstart', dismiss);
  }, [tappedIndex]);

  // ── Collect all dates from ALL series (not just visible) so chart doesn't collapse when toggled off ──
  const allDates = useMemo(() => {
    const dateSet = new Set<string>();
    for (const s of series) {
      for (const p of (seriesData[s.metricCode] || [])) {
        if (p.fullDate) dateSet.add(p.fullDate);
      }
    }
    return [...dateSet].sort();
  }, [seriesData, series]);

  // ── Build lookup: date → { metricCode → datapoint } ──
  const dateMap = useMemo(() => {
    const map: Record<string, Record<string, IntegratedBarChartDataPoint>> = {};
    for (const code of visibleSeries) {
      for (const p of (seriesData[code] || [])) {
        if (!p.fullDate) continue;
        if (!map[p.fullDate]) map[p.fullDate] = {};
        map[p.fullDate][code] = p;
      }
    }
    return map;
  }, [seriesData, visibleSeries]);

  // ── Visible series list ──
  const visibleSeriesList = useMemo(
    () => series.filter(s => visibleSeries.has(s.metricCode)),
    [series, visibleSeries]
  );

  const barSeries = visibleSeriesList.filter(s => s.chartType === 'bar');
  const lineSeries = visibleSeriesList.filter(s => s.chartType === 'line');

  // ── Mode detection ──
  const isSingleLine = lineSeries.length === 1 && barSeries.length === 0;
  const needsDualAxis = barSeries.length > 0 && lineSeries.length > 0;

  // ── Calculate Y ranges per axis ──
  // Unified scale: plan and fact share the same axis for meaningful visual comparison.
  // Only non-future data is used — future plan spikes are clipped by SVG overflow:hidden.
  const { leftScale, rightScale, absMax, pctMax } = useMemo(() => {
    let leftMax = 0;
    let rightMax = 0;
    let leftIsPct = false;
    let rightIsPct = false;
    let absMaxVal = 0;
    let pctMaxVal = 0;

    for (const s of visibleSeriesList) {
      const data = seriesData[s.metricCode] || [];
      const isPct = isPercentMetric(s.metricCode);
      for (const p of data) {
        if (p.isFuture) continue;
        const dayMax = hidePlans ? p.value : Math.max(p.value, p.plan);
        if (isPct) {
          pctMaxVal = Math.max(pctMaxVal, dayMax);
        } else {
          absMaxVal = Math.max(absMaxVal, dayMax);
        }
      }
    }

    if (needsDualAxis) {
      for (const s of barSeries) {
        const data = seriesData[s.metricCode] || [];
        const isPct = isPercentMetric(s.metricCode);
        if (isPct) leftIsPct = true;
        for (const p of data) {
          if (p.isFuture) continue;
          leftMax = hidePlans ? Math.max(leftMax, p.value) : Math.max(leftMax, p.value, p.plan);
        }
      }
      for (const s of lineSeries) {
        const data = seriesData[s.metricCode] || [];
        const isPct = isPercentMetric(s.metricCode);
        if (isPct) rightIsPct = true;
        for (const p of data) {
          if (p.isFuture) continue;
          rightMax = hidePlans ? Math.max(rightMax, p.value) : Math.max(rightMax, p.value, p.plan);
        }
      }
    }

    return {
      leftScale: needsDualAxis ? computeNiceTicks(leftMax || 100, leftIsPct) : null,
      rightScale: needsDualAxis ? computeNiceTicks(rightMax || 100, rightIsPct) : null,
      absMax: (absMaxVal * 1.15) || 100,
      pctMax: Math.max(pctMaxVal * 1.15, 100),
    };
  }, [seriesData, visibleSeriesList, needsDualAxis, barSeries, lineSeries, hidePlans]);

  // ── Dynamic Y-scale for single-line mode (like PercentLineChart) ──
  // Unified scale: uses max of non-future fact+plan values
  const singleLineYScale = useMemo(() => {
    if (!isSingleLine || lineSeries.length === 0) return null;
    const code = lineSeries[0].metricCode;
    const data = seriesData[code] || [];
    const nonFuture = data.filter(d => !d.isFuture);
    const isPct = isPercentMetric(code);
    // For percent metrics, include 0 values (they're real data, not missing)
    const filterFn = isPct ? (v: number) => v >= 0 : (v: number) => v > 0;
    const allValues = hidePlans
      ? nonFuture.map(d => d.value).filter(filterFn)
      : nonFuture.flatMap(d => [d.value, d.plan]).filter(filterFn);
    if (allValues.length === 0) {
      return { min: 0, max: 100, ticks: [0, 20, 40, 60, 80, 100] };
    }

    const valMin = Math.min(...allValues);
    const valMax = Math.max(...allValues);

    if (isPct) {
      // Tight scaling around data extremes — Y-axis starts from near min, not from 0
      const range = valMax - valMin || 5;
      const padding = Math.max(2, range * 0.1);
      const paddedMin = Math.max(0, valMin - padding);
      const paddedMax = Math.min(100, valMax + padding);
      const span = paddedMax - paddedMin;
      // Pick step to get ~4-6 ticks for readability
      const step = span <= 8 ? 1
        : span <= 15 ? 2
        : span <= 30 ? 5
        : span <= 60 ? 10
        : 20;
      // Round to step boundaries but never drift more than 1 step from padded values
      const niceMin = Math.max(0, Math.floor(paddedMin / step) * step);
      const niceMax = Math.min(100, Math.ceil(paddedMax / step) * step);
      const ticks: number[] = [];
      for (let t = niceMin; t <= niceMax; t += step) ticks.push(t);
      return { min: niceMin, max: niceMax, ticks };
    }
    const niceMax = valMax * 1.15 || 100;
    const step = niceMax > 1_000_000 ? 200_000
      : niceMax > 100_000 ? 50_000
      : niceMax > 10_000 ? 5_000
      : niceMax > 1_000 ? 200
      : 20;
    const ticks: number[] = [];
    for (let t = 0; t <= niceMax; t += step) ticks.push(t);
    if (ticks.length > 8) {
      const newStep = step * 2;
      ticks.length = 0;
      for (let t = 0; t <= niceMax; t += newStep) ticks.push(t);
    }
    return { min: 0, max: niceMax, ticks };
  }, [isSingleLine, lineSeries, seriesData, hidePlans]);

  // ── Chart geometry ──
  const paddingTop = 20;
  const paddingBottom = 30;
  const effectiveHeight = height - paddingTop - paddingBottom;
  const baseY = height - paddingBottom;

  // Left padding for Y-axis labels (single-line or dual-axis left)
  const xOffset = (isSingleLine || needsDualAxis) ? 40 : 0;
  // Right padding for right Y-axis in dual-axis mode
  const xPaddingRight = needsDualAxis ? 40 : (isSingleLine ? 12 : 0);

  // ── Y coordinate functions (unified scale — plan and fact share the same axis) ──

  /** Standard getY: unified scale for both fact and plan */
  const getY = (value: number, metricCode: string): number => {
    if (needsDualAxis) {
      const seriesConfig = visibleSeriesList.find(s => s.metricCode === metricCode);
      const isRight = seriesConfig?.chartType === 'line';
      const scale = isRight ? rightScale : leftScale;
      if (scale) {
        const range = scale.max - scale.min || 1;
        return paddingTop + effectiveHeight - ((value - scale.min) / range) * effectiveHeight;
      }
    }
    const isPct = isPercentMetric(metricCode);
    const max = isPct ? pctMax : absMax;
    const normalized = max > 0 ? value / max : 0;
    return paddingTop + effectiveHeight - (normalized * effectiveHeight);
  };

  /** Single-line Y with dynamic zoomed scale */
  const getSingleLineY = (value: number): number => {
    if (!singleLineYScale) return getY(value, lineSeries[0]?.metricCode || '');
    const { min, max } = singleLineYScale;
    const range = max - min || 1;
    return paddingTop + effectiveHeight - ((value - min) / range) * effectiveHeight;
  };

  // ── Column sizing ──
  const MIN_SVG_VIEW_WIDTH = 600;
  const BASE_COL_WIDTH = 28;
  const n = allDates.length;
  const columnWidth = n > 0 ? Math.max(BASE_COL_WIDTH, Math.ceil(MIN_SVG_VIEW_WIDTH / n)) : BASE_COL_WIDTH;
  const colCenter = columnWidth / 2;
  const svgWidth = xOffset + n * columnWidth + xPaddingRight;


  // Helper for x center of a date column
  const getXCenter = (di: number) => xOffset + colCenter + di * columnWidth;

  // Bar layout: grouped bars side by side
  const barCount = barSeries.length;
  const isSingleBarMode = barCount === 1;
  const singleBarWidth = isSingleBarMode
    ? 8
    : barCount > 0
      ? Math.min(40, Math.max(6, Math.floor(columnWidth * 0.7 / barCount)))
      : 0;
  const barGroupWidth = singleBarWidth * barCount;
  const barGroupOffset = -barGroupWidth / 2;

  if (n === 0) return null;

  return (
    <div className={className} ref={containerRef}>
    <div className={cn(
      "scrollbar-hide",
      isDesktop ? "" : "overflow-x-auto -mx-4 px-4"
    )}>
      <div
        className="w-full relative"
        style={isDesktop ? undefined : { minWidth: `${Math.max(svgWidth, 780)}px` }}
        ref={internalRef}
      >
        <svg
          viewBox={`0 0 ${svgWidth} ${height}`}
          className="w-full"
          style={{ height, overflow: 'hidden' }}
          preserveAspectRatio="none"
        >
          {/* Gradient definitions for dynamic bar coloring */}
          {barSeries.some(s => s.barStyle !== 'static') && (
            <defs>
              <linearGradient id="msBarGradientSuccess" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity="0.85" />
                <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity="0.95" />
              </linearGradient>
              <linearGradient id="msBarGradientDestructive" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity="0.85" />
                <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity="0.95" />
              </linearGradient>
            </defs>
          )}

          {/* ── Y-axis grid + labels for single-line mode ── */}
          {isSingleLine && singleLineYScale && singleLineYScale.ticks.map((tick, idx) => {
            const y = getSingleLineY(tick);
            const isBottom = idx === 0;
            const isPct = isPercentMetric(lineSeries[0].metricCode);
            const label = isPct ? `${tick}%` : formatCompact(tick);
            return (
              <g key={`yaxis-${tick}`}>
                <line
                  x1={xOffset}
                  y1={y}
                  x2={svgWidth - xPaddingRight}
                  y2={y}
                  stroke="hsl(var(--border))"
                  strokeWidth={1}
                  strokeDasharray={isBottom ? undefined : "3 3"}
                  opacity={isBottom ? 0.5 : 0.3}
                />
                <text
                  x={xOffset - 6}
                  y={y + 3}
                  textAnchor="end"
                  fontSize={9}
                  fill="hsl(var(--muted-foreground))"
                  opacity={0.7}
                >
                  {label}
                </text>
              </g>
            );
          })}

          {/* ── Dual axis: Left Y-axis (bars) ── */}
          {needsDualAxis && leftScale && leftScale.ticks.map((tick, idx) => {
            const range = leftScale.max - leftScale.min || 1;
            const clamped = Math.max(leftScale.min, Math.min(leftScale.max, tick));
            const y = paddingTop + effectiveHeight - ((clamped - leftScale.min) / range) * effectiveHeight;
            const isBottom = idx === 0;
            const leftIsPct = barSeries.some(s => isPercentMetric(s.metricCode));
            const label = leftIsPct ? `${tick}%` : formatCompact(tick);
            return (
              <g key={`left-y-${tick}`}>
                {/* Grid lines from left axis only */}
                <line
                  x1={xOffset}
                  y1={y}
                  x2={svgWidth - xPaddingRight}
                  y2={y}
                  stroke="hsl(var(--border))"
                  strokeWidth={1}
                  strokeDasharray={isBottom ? undefined : "3 3"}
                  opacity={isBottom ? 0.5 : 0.2}
                />
                <text
                  x={xOffset - 6}
                  y={y + 3}
                  textAnchor="end"
                  fontSize={9}
                  fill="hsl(var(--muted-foreground))"
                  opacity={0.7}
                >
                  {label}
                </text>
              </g>
            );
          })}

          {/* ── Dual axis: Right Y-axis (lines) ── */}
          {needsDualAxis && rightScale && rightScale.ticks.map((tick, idx) => {
            const range = rightScale.max - rightScale.min || 1;
            const clamped = Math.max(rightScale.min, Math.min(rightScale.max, tick));
            const y = paddingTop + effectiveHeight - ((clamped - rightScale.min) / range) * effectiveHeight;
            const rightIsPct = lineSeries.some(s => isPercentMetric(s.metricCode));
            const label = rightIsPct ? `${tick}%` : formatCompact(tick);
            return (
              <g key={`right-y-${tick}`}>
                {/* No grid lines for right axis — would be visual noise */}
                <text
                  x={svgWidth - xPaddingRight + 6}
                  y={y + 3}
                  textAnchor="start"
                  fontSize={9}
                  fill={lineSeries[0]?.color || "hsl(var(--muted-foreground))"}
                  opacity={0.7}
                >
                  {label}
                </text>
              </g>
            );
          })}

          {/* Hover highlight */}
          {allDates.map((_, i) => (
            <rect
              key={`hov-${i}`}
              x={xOffset + i * columnWidth}
              y={0}
              width={columnWidth}
              height={baseY}
              fill={activeIndex === i ? "hsl(var(--muted))" : "transparent"}
              opacity={0.4}
            />
          ))}

          {/* ── Bar series (rendered first, background) ── */}
          {barSeries.map((s, sIdx) => {
            const data = seriesData[s.metricCode] || [];
            const useDynamic = s.barStyle !== 'static'; // default is 'dynamic'
            return allDates.map((dateStr, di) => {
              const point = data.find(p => p.fullDate === dateStr);
              if (!point || point.isFuture || point.value <= 0) return null;

              const cx = getXCenter(di);
              const barX = cx + barGroupOffset + sIdx * singleBarWidth;
              const factY = getY(point.value, s.metricCode);
              const barH = baseY - factY;
              const isAbovePlan = point.value >= point.plan;

              const barFill = useDynamic
                ? (isAbovePlan ? 'url(#msBarGradientSuccess)' : 'url(#msBarGradientDestructive)')
                : s.color;

              return (
                <g key={`bar-${s.metricCode}-${di}`}>
                  <rect
                    x={barX}
                    y={factY}
                    width={singleBarWidth - 1}
                    height={Math.max(barH, 2)}
                    rx={2}
                    fill={barFill}
                    opacity={activeIndex === di ? 1 : 0.85}
                  />
                  {/* Fact value label for dynamic bar mode (only when no dual axis — avoids clutter) */}
                  {useDynamic && !needsDualAxis && (
                    <text
                      x={cx}
                      y={baseY + 12}
                      textAnchor="middle"
                      fontSize={10}
                      fontWeight={600}
                      fill={isAbovePlan ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
                    >
                      {formatByUnit(point.value, s.metricCode)}
                    </text>
                  )}
                </g>
              );
            });
          })}

          {/* ── Plan lines for bar series ── */}
          {!hidePlans && barSeries.map(s => {
            const data = seriesData[s.metricCode] || [];
            const useDynamic = s.barStyle !== 'static';
            const points = allDates.map((dateStr, di) => {
              const point = data.find(p => p.fullDate === dateStr);
              return {
                x: getXCenter(di),
                y: getY(point?.plan || 0, s.metricCode),
                isFuture: point?.isFuture ?? false,
              };
            }).filter((_, di) => {
              const point = data.find(p => p.fullDate === allDates[di]);
              return point && point.plan > 0;
            });
            if (points.length < 2) return null;

            // Dynamic bar: prominent neutral line with plan labels
            // Static bar: subtle dashed line in series color
            if (useDynamic) {
              const futureIdx = points.findIndex(p => p.isFuture);
              const pastPoints = futureIdx === -1 ? points : points.slice(0, futureIdx + 1);
              const futurePoints = futureIdx === -1 ? [] : points.slice(futureIdx);
              return (
                <g key={`plan-bar-${s.metricCode}`}>
                  {pastPoints.length >= 2 && (
                    <path
                      d={generateSmoothPath(pastPoints, paddingTop, baseY)}
                      fill="none"
                      stroke="hsl(var(--muted-foreground))"
                      strokeWidth={2}
                      strokeLinecap="round"
                      opacity={0.7}
                    />
                  )}
                  {futurePoints.length >= 2 && (
                    <path
                      d={generateSmoothPath(futurePoints, paddingTop, baseY)}
                      fill="none"
                      stroke="hsl(var(--muted-foreground))"
                      strokeWidth={2}
                      strokeDasharray="4 3"
                      opacity={0.5}
                    />
                  )}
                  {/* Circle markers + plan value labels (skip in dual-axis to reduce clutter) */}
                  {!needsDualAxis && allDates.map((dateStr, di) => {
                    const point = data.find(p => p.fullDate === dateStr);
                    if (!point || point.plan <= 0) return null;
                    const cx = getXCenter(di);
                    const py = getY(point.plan, s.metricCode);
                    const isFut = point.isFuture ?? false;
                    const label = formatByUnit(point.plan, s.metricCode);
                    const labelW = label.length * 6 + 4;
                    return (
                      <g key={`plan-mk-${di}`}>
                        <circle cx={cx} cy={py} r={2.5}
                          fill="hsl(var(--background))"
                          stroke="hsl(var(--muted-foreground))"
                          strokeWidth={1.5}
                          opacity={isFut ? 0.5 : 0.8}
                        />
                        <rect
                          x={cx - labelW / 2} y={py - 16}
                          width={labelW} height={12}
                          rx={2}
                          fill="hsl(var(--background))"
                          opacity={isFut ? 0.4 : 0.9}
                        />
                        <text
                          x={cx} y={py - 6}
                          textAnchor="middle"
                          fontSize={10} fontWeight={500}
                          fill="hsl(var(--muted-foreground))"
                          opacity={isFut ? 0.5 : 0.7}
                        >
                          {label}
                        </text>
                      </g>
                    );
                  })}
                  {/* In dual-axis mode: just show plan dots (no labels) */}
                  {needsDualAxis && allDates.map((dateStr, di) => {
                    const point = data.find(p => p.fullDate === dateStr);
                    if (!point || point.plan <= 0) return null;
                    const cx = getXCenter(di);
                    const py = getY(point.plan, s.metricCode);
                    const isFut = point.isFuture ?? false;
                    return (
                      <circle
                        key={`plan-mk-${di}`}
                        cx={cx} cy={py} r={2}
                        fill="hsl(var(--background))"
                        stroke="hsl(var(--muted-foreground))"
                        strokeWidth={1.5}
                        opacity={isFut ? 0.4 : 0.6}
                      />
                    );
                  })}
                </g>
              );
            }

            return (
              <path
                key={`plan-bar-${s.metricCode}`}
                d={generateSmoothPath(points, paddingTop, baseY)}
                fill="none"
                stroke={s.color}
                strokeWidth={1.5}
                strokeDasharray="4 3"
                opacity={0.5}
              />
            );
          })}

          {/* ── Line series (fact = solid, plan = dashed) ── */}
          {lineSeries.map(s => {
            const data = seriesData[s.metricCode] || [];

            // ── Single line mode: original PercentLineChart style ──
            if (isSingleLine) {
              const yTop = paddingTop;
              const yBot = paddingTop + effectiveHeight;

              // Collect all points
              const factPts: { x: number; y: number; isFuture: boolean; value: number; plan: number }[] = [];
              const planPts: { x: number; y: number; isFuture: boolean }[] = [];

              allDates.forEach((dateStr, di) => {
                const point = data.find(p => p.fullDate === dateStr);
                const cx = getXCenter(di);
                if (point) {
                  factPts.push({
                    x: cx,
                    y: getSingleLineY(point.value),
                    isFuture: point.isFuture ?? false,
                    value: point.value,
                    plan: point.plan,
                  });
                  planPts.push({
                    x: cx,
                    y: getSingleLineY(point.plan),
                    isFuture: point.isFuture ?? false,
                  });
                }
              });

              const futureStartIndex = factPts.findIndex(p => p.isFuture);
              const pastFactPts = futureStartIndex === -1 ? factPts : factPts.slice(0, futureStartIndex);
              const pastPlanPts = futureStartIndex === -1 ? planPts : planPts.slice(0, futureStartIndex + 1);
              const futurePlanPts = futureStartIndex === -1 ? [] : planPts.slice(futureStartIndex);

              return (
                <g key={`line-${s.metricCode}`}>
                  {/* Plan line — past portion (solid, subtle) */}
                  {!hidePlans && pastPlanPts.length >= 2 && (
                    <path
                      d={generateSmoothPath(pastPlanPts, yTop, yBot)}
                      fill="none"
                      stroke={s.color}
                      strokeWidth={1.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={0.45}
                    />
                  )}
                  {/* Plan line — future portion (dashed) */}
                  {!hidePlans && futurePlanPts.length >= 2 && (
                    <path
                      d={generateSmoothPath(futurePlanPts, yTop, yBot)}
                      fill="none"
                      stroke={s.color}
                      strokeWidth={1.5}
                      strokeDasharray="6 4"
                      opacity={0.3}
                    />
                  )}

                  {/* Fact line — solid (only past days) */}
                  {pastFactPts.length >= 2 && (
                    <path
                      d={generateSmoothPath(pastFactPts, yTop, yBot)}
                      fill="none"
                      stroke={s.color}
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Fact dots — green above plan, red below */}
                  {factPts.map((pt, i) => {
                    if (pt.isFuture) return null;
                    const isAbove = pt.value >= pt.plan;
                    return (
                      <circle
                        key={`dot-${i}`}
                        cx={pt.x}
                        cy={pt.y}
                        r={activeIndex === i ? 4 : 3}
                        fill={isAbove ? "#10B981" : "hsl(var(--destructive))"}
                        stroke="hsl(var(--background))"
                        strokeWidth={1.5}
                        opacity={activeIndex === i ? 1 : 0.9}
                      />
                    );
                  })}

                  {/* Plan dots — hollow circles on past days */}
                  {!hidePlans && planPts.map((pt, i) => {
                    if (pt.isFuture) return null;
                    return (
                      <circle
                        key={`plan-dot-${i}`}
                        cx={pt.x}
                        cy={pt.y}
                        r={activeIndex === i ? 4 : 3}
                        fill="hsl(var(--background))"
                        stroke={s.color}
                        strokeWidth={1.5}
                        opacity={0.6}
                      />
                    );
                  })}

                  {/* Future markers — hollow circles on plan line */}
                  {!hidePlans && planPts.map((pt, i) => {
                    if (!pt.isFuture) return null;
                    return (
                      <circle
                        key={`future-${i}`}
                        cx={pt.x}
                        cy={pt.y}
                        r={3}
                        fill="hsl(var(--background))"
                        stroke={s.color}
                        strokeWidth={1.5}
                        opacity={0.4}
                      />
                    );
                  })}
                </g>
              );
            }

            // ── Multi-line mode: per-series colors ──
            const factPoints: { x: number; y: number }[] = [];
            const planPoints: { x: number; y: number; isFuture: boolean }[] = [];

            allDates.forEach((dateStr, di) => {
              const point = data.find(p => p.fullDate === dateStr);
              const cx = getXCenter(di);
              if (point && !point.isFuture && point.value > 0) {
                factPoints.push({ x: cx, y: getY(point.value, s.metricCode) });
              }
              if (point && point.plan > 0) {
                planPoints.push({ x: cx, y: getY(point.plan, s.metricCode), isFuture: point.isFuture ?? false });
              }
            });

            return (
              <g key={`line-${s.metricCode}`}>
                {/* Plan line (dashed) */}
                {!hidePlans && planPoints.length >= 2 && (
                  <path
                    d={generateSmoothPath(planPoints, paddingTop, baseY)}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    opacity={0.45}
                  />
                )}
                {/* Fact line (solid) */}
                {factPoints.length >= 2 && (
                  <path
                    d={generateSmoothPath(factPoints, paddingTop, baseY)}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                  />
                )}
                {/* Dots on fact line */}
                {factPoints.map((pt, j) => (
                  <circle
                    key={j}
                    cx={pt.x}
                    cy={pt.y}
                    r={3}
                    fill={s.color}
                    stroke="hsl(var(--background))"
                    strokeWidth={1.5}
                  />
                ))}
              </g>
            );
          })}

          {/* ── Active index vertical indicator ── */}
          {activeIndex !== null && (
            <line
              x1={getXCenter(activeIndex)}
              y1={paddingTop}
              x2={getXCenter(activeIndex)}
              y2={baseY}
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={1}
              strokeDasharray="2 2"
              opacity={0.4}
            />
          )}
        </svg>

        {/* ── Tooltip ── */}
        {activeIndex !== null && (() => {
          const dateStr = allDates[activeIndex];
          if (!dateStr) return null;
          const dayData = dateMap[dateStr] || {};
          const leftPct = ((xOffset + (activeIndex + 0.5) * columnWidth) / svgWidth) * 100;
          const isSingleSeries = visibleSeriesList.length === 1;

          // Single series: classic Факт/План/Выполнение format
          if (isSingleSeries) {
            const s = visibleSeriesList[0];
            const p = s ? dayData[s.metricCode] : null;
            const unit = s ? (METRIC_UNITS[s.metricCode] || '') : '';
            const unitLabel = unit && unit !== '%' ? ` ${unit}` : '';
            const isFuture = p?.isFuture ?? false;

            return (
              <div
                className="absolute z-50 pointer-events-none"
                style={{
                  top: paddingTop,
                  left: `clamp(65px, ${leftPct}%, calc(100% - 65px))`,
                  transform: 'translateX(-50%)',
                }}
              >
                <div className="bg-popover text-popover-foreground border border-border rounded-lg shadow-md p-2.5 text-xs whitespace-nowrap">
                  {isFuture ? (
                    <>
                      <div className="font-bold text-foreground mb-1">{formatTooltipDate(dateStr)}</div>
                      <div className="text-muted-foreground">Прогноз</div>
                      {p && (
                        <div className="flex justify-between gap-3 mt-1">
                          <span className="text-muted-foreground">План:</span>
                          <span className="font-medium">{formatByUnit(p.plan, s.metricCode, false)}{unitLabel}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="font-bold text-foreground mb-1.5">{formatTooltipDate(dateStr)}</div>
                      {p && (
                        <div className="space-y-1">
                          <div className="flex justify-between gap-3">
                            <span className="text-muted-foreground">Факт:</span>
                            <span className="font-bold text-foreground">{formatByUnit(p.value, s.metricCode, false)}{unitLabel}</span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-muted-foreground">План:</span>
                            <span className="font-medium text-muted-foreground">{formatByUnit(p.plan, s.metricCode, false)}{unitLabel}</span>
                          </div>
                          {p.plan > 0 && (
                            <div className={cn("flex justify-between gap-3 pt-1 border-t border-border")}>
                              <span className="text-muted-foreground">Выполнение:</span>
                              <span className={cn("font-bold", p.value >= p.plan ? "text-success" : "text-destructive")}>
                                {Math.round((p.value / p.plan) * 100)}%
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          }

          // Multi-series: grouped by axis in dual-axis mode
          const barItems = needsDualAxis ? barSeries : [];
          const lineItems = needsDualAxis ? lineSeries : [];
          const allItems = needsDualAxis ? [...barItems, ...lineItems] : visibleSeriesList;

          return (
            <div
              className="absolute z-50 pointer-events-none"
              style={{
                top: paddingTop,
                left: `clamp(80px, ${leftPct}%, calc(100% - 80px))`,
                transform: 'translateX(-50%)',
              }}
            >
              <div className="bg-popover text-popover-foreground border border-border rounded-lg shadow-md p-2.5 text-xs whitespace-nowrap">
                <div className="font-bold text-foreground mb-1.5">{formatTooltipDate(dateStr)}</div>
                <div className="space-y-1">
                  {allItems.map((s, idx) => {
                    const p = dayData[s.metricCode];
                    if (!p) return null;
                    const unit = METRIC_UNITS[s.metricCode] || '';
                    const name = METRIC_NAMES[s.metricCode] || s.metricCode;
                    // Add separator between bar and line groups in dual-axis mode
                    const showSeparator = needsDualAxis && idx === barItems.length && barItems.length > 0;
                    return (
                      <React.Fragment key={s.metricCode}>
                        {showSeparator && (
                          <div className="border-t border-border/50 my-1" />
                        )}
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "shrink-0",
                              s.chartType === 'line' ? "w-3 h-[2px] rounded-full" : "w-2 h-2 rounded-sm"
                            )}
                            style={{ backgroundColor: s.color }}
                          />
                          <span className="text-muted-foreground">{name}:</span>
                          <span className="font-bold ml-auto">
                            {formatByUnit(p.value, s.metricCode, false)} {unit !== '%' ? unit : ''}
                          </span>
                          <span className="text-muted-foreground text-[10px]">
                            / {formatByUnit(p.plan, s.metricCode, false)}
                          </span>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── Interactive overlay ── */}
        <div
          className="absolute flex pointer-events-none"
          style={{ top: 0, left: (isSingleLine || needsDualAxis) ? xOffset : 0, right: needsDualAxis ? xPaddingRight : (isSingleLine ? xPaddingRight : 0), height: baseY }}
        >
          {allDates.map((_, i) => (
            <div
              key={i}
              className="flex-1 pointer-events-auto cursor-pointer"
              style={{ height: baseY }}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              onTouchStart={(e) => { e.stopPropagation(); setTappedIndex(prev => prev === i ? null : i); }}
            />
          ))}
        </div>

        {/* ── Date labels ── */}
        <div className="flex w-full" style={(isSingleLine || needsDualAxis) ? { paddingLeft: xOffset, paddingRight: xPaddingRight } : undefined}>
          {allDates.map((dateStr, i) => {
            const d = new Date(dateStr + 'T00:00:00');
            const dayOfWeek = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'][d.getDay()];
            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
            // Check if this date is in the future (for opacity)
            const dayPoints = dateMap[dateStr];
            const isFutureDay = dayPoints && Object.values(dayPoints).some(p => p.isFuture);
            return (
              <div
                key={i}
                className={cn(
                  "flex-1 flex flex-col items-center cursor-pointer hover:bg-muted/30 rounded transition-colors py-0.5",
                  isFutureDay && "opacity-50",
                  activeIndex === i && "bg-muted/30"
                )}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                onTouchStart={(e) => { e.stopPropagation(); setTappedIndex(prev => prev === i ? null : i); }}
              >
                <span className={cn(
                  "text-[9px] md:text-[10px] font-medium",
                  isFutureDay ? "text-muted-foreground/50" : "text-muted-foreground"
                )}>
                  {d.getDate()}
                </span>
                <span className={cn(
                  "text-[8px] md:text-[9px]",
                  isWeekend ? "text-warning/70" : "text-muted-foreground/50"
                )}>
                  {dayOfWeek}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>

    {/* ── Unified interactive legend (outside scroll container) ── */}
    {n > 2 && (
      <div className="flex flex-wrap items-center justify-center gap-2 mt-2 text-xs">
        {/* Series toggles */}
        {series.map(s => {
          const name = METRIC_NAMES[s.metricCode] || s.metricCode;
          const isVisible = visibleSeries.has(s.metricCode);
          const isInteractive = !!onToggleSeries;
          const axisHint = needsDualAxis ? (s.chartType === 'bar' ? ' ◀' : ' ▶') : '';
          const Tag = isInteractive ? 'button' : 'span';
          return (
            <Tag
              key={s.metricCode}
              type={isInteractive ? 'button' : undefined}
              onClick={isInteractive ? () => onToggleSeries!(s.metricCode) : undefined}
              className={cn(
                "flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition-all select-none",
                isInteractive && "cursor-pointer",
                isVisible
                  ? "border-border bg-background text-muted-foreground"
                  : "border-transparent bg-muted/50 text-muted-foreground/50 opacity-50",
              )}
            >
              <span
                className={cn(
                  "shrink-0",
                  s.chartType === 'line' ? "w-3.5 h-[2px] rounded-full" : "w-2.5 h-2.5 rounded-sm"
                )}
                style={{ backgroundColor: s.color }}
              />
              <span className="whitespace-nowrap">{name}{axisHint}</span>
            </Tag>
          );
        })}
        {/* Plan toggle */}
        {onTogglePlans && (
          <button
            type="button"
            onClick={onTogglePlans}
            className={cn(
              "flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition-all cursor-pointer select-none",
              !hidePlans
                ? "border-border bg-background text-muted-foreground"
                : "border-transparent bg-muted/50 text-muted-foreground/50 opacity-50",
            )}
          >
            <span className="inline-block w-2.5 h-2.5 rounded-full border-[1.5px] border-muted-foreground/50 bg-background" />
            <span className="whitespace-nowrap">План</span>
          </button>
        )}
        {/* Static plan indicator (when no toggle callback) */}
        {!onTogglePlans && (
          <span className="flex items-center gap-1.5 px-2 py-0.5 text-muted-foreground">
            <span className="inline-block w-2.5 h-2.5 rounded-full border-[1.5px] border-muted-foreground/50 bg-background" />
            <span>План</span>
          </span>
        )}
      </div>
    )}
    <p className="text-[10px] text-muted-foreground text-center mt-2 md:hidden">
      Нажмите на столбец для деталей
    </p>
    </div>
  );
};

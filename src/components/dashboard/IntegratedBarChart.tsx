import React, { useMemo, useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useChartDimensions } from '@/hooks/useChartDimensions';

export interface IntegratedBarChartDataPoint {
  date: string;
  /** ISO date string (YYYY-MM-DD) for tooltip month display */
  fullDate?: string;
  value: number;
  plan: number;
  dayOfWeek?: string;
  isWeekend?: boolean;
  isFuture?: boolean;
}

export interface IntegratedBarChartProps {
  data: IntegratedBarChartDataPoint[];
  height?: number;
  barWidth?: number;
  formatValue?: (value: number) => string;
  formatTooltipValue?: (value: number) => string;
  unit?: string;
  className?: string;
  onBarClick?: (index: number) => void;
  /** Hide plan line and labels — Y-axis scales to fact only */
  hidePlans?: boolean;
}

// Full number format (no K/M abbreviations)
const defaultFormatFull = (value: number): string => {
  return new Intl.NumberFormat('ru-RU').format(Math.round(value));
};

const MONTH_GENITIVE = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

/** "7 марта" — берём месяц из fullDate (ISO) или fallback на текущий */
const formatTooltipDate = (day: IntegratedBarChartDataPoint): string => {
  if (day.fullDate) {
    const d = new Date(day.fullDate + 'T00:00:00');
    return `${d.getDate()} ${MONTH_GENITIVE[d.getMonth()]}`;
  }
  return `${day.date} ${MONTH_GENITIVE[new Date().getMonth()]}`;
};

// Smart label logic - show only important labels to avoid overlapping
const createShouldShowLabel = (data: IntegratedBarChartDataPoint[]) => {
  const nonFutureData = data.filter(d => !d.isFuture);
  const threshold = nonFutureData.length > 25 ? 4 : nonFutureData.length > 15 ? 3 : 2;
  
  // Find local max/min indices
  const extremeIndices = new Set<number>();
  for (let i = 1; i < nonFutureData.length - 1; i++) {
    const prev = nonFutureData[i - 1].value;
    const curr = nonFutureData[i].value;
    const next = nonFutureData[i + 1].value;
    
    if ((curr > prev && curr > next) || (curr < prev && curr < next)) {
      extremeIndices.add(i);
    }
  }
  
  return (index: number, day: IntegratedBarChartDataPoint): boolean => {
    if (day.isFuture) return false;
    
    // Always show first non-future
    const firstNonFutureIndex = data.findIndex(d => !d.isFuture);
    if (index === firstNonFutureIndex) return true;
    
    // Always show last non-future
    const lastNonFutureIndex = data.length - 1 - [...data].reverse().findIndex(d => !d.isFuture);
    if (index === lastNonFutureIndex) return true;
    
    // Show local extremes
    const nonFutureIndex = data.slice(0, index + 1).filter(d => !d.isFuture).length - 1;
    if (extremeIndices.has(nonFutureIndex)) return true;
    
    // Show every Nth label
    return nonFutureIndex % threshold === 0;
  };
};

// Determine key points on plan line for labels
const createPlanKeyPoints = (data: IntegratedBarChartDataPoint[]): Set<number> => {
  const keyPoints = new Set<number>();
  if (data.length === 0) return keyPoints;
  
  // Always show first point
  keyPoints.add(0);
  
  // Always show last point
  keyPoints.add(data.length - 1);
  
  // Find local maxima and minima
  for (let i = 1; i < data.length - 1; i++) {
    const prev = data[i - 1].plan;
    const curr = data[i].plan;
    const next = data[i + 1].plan;
    
    // Local maximum
    if (curr > prev && curr > next) {
      keyPoints.add(i);
    }
    // Local minimum
    if (curr < prev && curr < next) {
      keyPoints.add(i);
    }
  }
  
  // Add points with significant change (>10% difference from previous shown)
  let lastShownIndex = 0;
  for (let i = 1; i < data.length - 1; i++) {
    const lastPlan = data[lastShownIndex].plan;
    const currPlan = data[i].plan;
    const diff = Math.abs(currPlan - lastPlan) / lastPlan;
    
    if (diff > 0.1 && !keyPoints.has(i)) {
      keyPoints.add(i);
      lastShownIndex = i;
    }
  }
  
  return keyPoints;
};

// Generate smooth monotone curve path through points
const generateSmoothPath = (
  points: { x: number; y: number }[],
  yMin?: number,
  yMax?: number,
): string => {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  const clampY = (y: number): number => {
    let v = y;
    if (yMin !== undefined) v = Math.max(yMin, v);
    if (yMax !== undefined) v = Math.min(yMax, v);
    return v;
  };

  // Monotone cubic interpolation for smooth curves
  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    // Calculate tangents
    const tension = 0.3;
    const dx1 = (p2.x - p0.x) * tension;
    const dy1 = (p2.y - p0.y) * tension;
    const dx2 = (p3.x - p1.x) * tension;
    const dy2 = (p3.y - p1.y) * tension;

    const cp1x = p1.x + dx1;
    const cp1y = clampY(p1.y + dy1);
    const cp2x = p2.x - dx2;
    const cp2y = clampY(p2.y - dy2);

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  return path;
};

export const IntegratedBarChart: React.FC<IntegratedBarChartProps> = ({
  data,
  height: heightProp = 140,
  barWidth = 8,
  formatValue = defaultFormatFull,
  formatTooltipValue = defaultFormatFull,
  unit = '₽',
  className,
  onBarClick,
  hidePlans,
}) => {
  const { containerRef: dimRef, height, isDesktop } = useChartDimensions({
    dataPointsCount: data.length,
    baseHeight: heightProp,
    desiredAspectRatio: 3.2,
    maxHeight: 300,
  });
  // Unified scale: plan and fact share the same Y-axis for meaningful visual comparison.
  // Only non-future data is used to compute the range — future plan spikes are clipped by SVG overflow:hidden.
  const maxY = useMemo(() => {
    if (data.length === 0) return 100;

    const nonFutureData = data.filter(d => !d.isFuture);
    const allValues = hidePlans
      ? nonFutureData.map(d => d.value).filter(v => v > 0)
      : nonFutureData.flatMap(d => [d.value, d.plan]).filter(v => v > 0);

    const rawMax = allValues.length > 0 ? Math.max(...allValues) : 100;
    return rawMax * 1.15; // 15% padding above max
  }, [data, hidePlans]);

  const paddingTop = 24;
  const paddingBottom = 30;
  const effectiveHeight = height - paddingTop - paddingBottom;
  const baseY = height - paddingBottom; // X axis position

  /** Y coordinate — unified scale for both fact and plan */
  const getY = (value: number): number => {
    const normalized = value / maxY;
    return paddingTop + effectiveHeight - (normalized * effectiveHeight);
  };

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tappedIndex, setTappedIndex] = useState<number | null>(null);
  const activeIndex = hoveredIndex ?? tappedIndex;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tappedIndex === null) return;
    const dismiss = (e: TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setTappedIndex(null);
      }
    };
    document.addEventListener('touchstart', dismiss, { passive: true });
    return () => document.removeEventListener('touchstart', dismiss);
  }, [tappedIndex]);

  const shouldShowLabel = useMemo(() => createShouldShowLabel(data), [data]);
  
  // Key points for plan labels
  const planKeyPoints = useMemo(() => createPlanKeyPoints(data), [data]);

  // Generate plan line points (using plan-specific scale)
  const planPoints = useMemo(() => {
    return data.map((d, i) => ({
      x: 14 + i * 28, // columnWidth = 28
      y: getY(d.plan),
      isFuture: d.isFuture ?? false
    }));
  }, [data, maxY, effectiveHeight]);

  // Find where future starts for dashed line
  const futureStartIndex = data.findIndex(d => d.isFuture);

  if (data.length === 0) return null;

  const columnWidth = 28;
  const svgPaddingRight = columnWidth / 2; // симметрично левому отступу (первый бар x=14)
  const svgWidth = data.length * columnWidth + svgPaddingRight;

  return (
    <div className={cn("scrollbar-hide", isDesktop ? "" : "overflow-x-auto -mx-4 px-4", className)} ref={dimRef}>
      <div className={cn("w-full relative", !isDesktop && "min-w-[780px]")} ref={containerRef}>
          {/* SVG Chart - stretches to full width */}
          <svg
            viewBox={`0 0 ${svgWidth} ${height}`}
            className="w-full"
            style={{ height, overflow: 'hidden' }}
            preserveAspectRatio="none"
          >
            {/* Gradient definitions */}
            <defs>
              <linearGradient id="barGradientSuccess" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity="0.85" />
                <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity="0.95" />
              </linearGradient>
              <linearGradient id="barGradientDestructive" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity="0.85" />
                <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity="0.95" />
              </linearGradient>
            </defs>

            {/* Hover highlight columns */}
            {data.map((_, i) => {
              const x = i * columnWidth;
              return (
                <rect
                  key={`hover-bg-${i}`}
                  x={x}
                  y={0}
                  width={columnWidth}
                  height={height - paddingBottom}
                  fill={activeIndex === i ? "hsl(var(--muted))" : "transparent"}
                  opacity={0.4}
                  className="transition-all duration-150"
                />
              );
            })}

            {/* Bars from X axis (bottom) up to fact value */}
            {data.map((day, i) => {
              const x = 14 + i * columnWidth;
              const factY = getY(day.value);
              const isAbovePlan = day.value >= day.plan;
              const barHeight = baseY - factY;
              const isFuture = day.isFuture ?? false;
              
              // Skip future days - they only show plan markers
              if (isFuture || barHeight < 1) return null;
              
              const showLabel = shouldShowLabel(i, day);
              
              return (
                <g key={i}>
                  {/* Bar from bottom (baseY) to fact value */}
                  <rect
                    x={x - barWidth / 2}
                    y={factY}
                    width={barWidth}
                    height={Math.max(barHeight, 2)}
                    rx={2}
                    fill={isAbovePlan ? 'url(#barGradientSuccess)' : 'url(#barGradientDestructive)'}
                    className={cn(
                      "transition-opacity",
                      hoveredIndex === i ? "opacity-100" : "opacity-90"
                    )}
                  />
                  
                  {/* Fact value label - below the bar, above dates - ALWAYS show */}
                  <text
                    x={x}
                    y={baseY + 12}
                    textAnchor="middle"
                    fontSize={10}
                    fontWeight={600}
                    fill={isAbovePlan ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
                  >
                    {formatValue(day.value)}
                  </text>
                </g>
              );
            })}

            {/* Plan line - smooth curve OVER the bars (hidden when hidePlans) */}
            {!hidePlans && (
              <>
                {/* Past portion (solid) */}
                {futureStartIndex !== 0 && (
                  <path
                    d={generateSmoothPath(
                      futureStartIndex === -1
                        ? planPoints
                        : planPoints.slice(0, futureStartIndex + 1),
                      paddingTop,
                      baseY,
                    )}
                    fill="none"
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.7}
                  />
                )}

                {/* Future portion (dashed) */}
                {futureStartIndex !== -1 && futureStartIndex < planPoints.length && (
                  <path
                    d={generateSmoothPath(planPoints.slice(futureStartIndex), paddingTop, baseY)}
                    fill="none"
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="4 3"
                    opacity={0.5}
                  />
                )}

                {/* Future markers (circles on plan line) */}
                {data.map((day, i) => {
                  if (!day.isFuture) return null;
                  const x = 14 + i * columnWidth;
                  const y = getY(day.plan);

                  return (
                    <circle
                      key={`future-${i}`}
                      cx={x}
                      cy={y}
                      r={3}
                      fill="hsl(var(--background))"
                      stroke="hsl(var(--muted-foreground))"
                      strokeWidth={1.5}
                      opacity={0.5}
                    />
                  );
                })}

                {/* Plan value labels on curve */}
                {planPoints.map((point, i) => {
                  const planLabel = formatValue(data[i].plan);
                  const isFuture = data[i].isFuture ?? false;
                  const labelWidth = planLabel.length * 6 + 4;
                  // Clamp point Y and label Y to stay within chart bounds
                  const clampedY = Math.max(paddingTop + 2, Math.min(point.y, baseY - 2));
                  const labelY = Math.max(paddingTop + 2, clampedY - 16);
                  const textY = Math.max(paddingTop + 12, clampedY - 6);

                  return (
                    <g key={`plan-label-${i}`}>
                      <circle
                        cx={point.x}
                        cy={clampedY}
                        r={2.5}
                        fill="hsl(var(--background))"
                        stroke="hsl(var(--muted-foreground))"
                        strokeWidth={1.5}
                        opacity={isFuture ? 0.5 : 0.8}
                      />
                      <rect
                        x={point.x - labelWidth / 2}
                        y={labelY}
                        width={labelWidth}
                        height={12}
                        rx={2}
                        fill="hsl(var(--background))"
                        opacity={isFuture ? 0.4 : 0.9}
                      />
                      <text
                        x={point.x}
                        y={textY}
                        textAnchor="middle"
                        fontSize={10}
                        fontWeight={500}
                        fill="hsl(var(--muted-foreground))"
                        opacity={isFuture ? 0.5 : 0.7}
                      >
                        {planLabel}
                      </text>
                    </g>
                  );
                })}
              </>
            )}

          </svg>

          {/* Custom tooltip (works on both hover and tap) */}
          {activeIndex !== null && (() => {
            const day = data[activeIndex];
            const leftPct = (activeIndex + 0.5) / data.length * 100;
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
                  {day.isFuture ? (
                    <>
                      <div className="font-bold text-foreground mb-1">{formatTooltipDate(day)}</div>
                      <div className="text-muted-foreground">Прогноз</div>
                      <div className="flex justify-between gap-3 mt-1">
                        <span className="text-muted-foreground">План:</span>
                        <span className="font-medium">{formatTooltipValue(day.plan)} {unit}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="font-bold text-foreground mb-1.5">{formatTooltipDate(day)}</div>
                      <div className="space-y-1">
                        <div className="flex justify-between gap-3">
                          <span className="text-muted-foreground">Факт:</span>
                          <span className="font-bold text-foreground">{formatTooltipValue(day.value)} {unit}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-muted-foreground">План:</span>
                          <span className="font-medium text-muted-foreground">{formatTooltipValue(day.plan)} {unit}</span>
                        </div>
                        {day.plan > 0 && (
                          <div className="flex justify-between gap-3 pt-1 border-t border-border">
                            <span className="text-muted-foreground">Выполнение:</span>
                            <span className={cn("font-bold", day.value >= day.plan ? "text-success" : "text-destructive")}>
                              {Math.round((day.value / day.plan) * 100)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Interactive overlay */}
          <div
            className="absolute flex pointer-events-none"
            style={{ top: 0, left: 0, right: 0, height: height - paddingBottom }}
          >
            {data.map((_, i) => (
              <div
                key={i}
                className="flex-1 pointer-events-auto cursor-pointer"
                style={{ height: height - paddingBottom }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                onTouchStart={(e) => { e.stopPropagation(); setTappedIndex(prev => prev === i ? null : i); }}
                onClick={() => onBarClick?.(i)}
              />
            ))}
          </div>
          
          {/* Date labels - flex to match SVG stretch */}
          <div className="flex w-full">
            {data.map((day, i) => (
              <div
                key={i}
                className={cn(
                  "flex-1 flex flex-col items-center cursor-pointer hover:bg-muted/30 rounded transition-colors py-0.5",
                  day.isFuture && "opacity-50",
                  activeIndex === i && "bg-muted/30"
                )}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                onTouchStart={(e) => { e.stopPropagation(); setTappedIndex(prev => prev === i ? null : i); }}
                onClick={() => onBarClick?.(i)}
              >
                <span className={cn(
                  "text-[9px] md:text-[10px] font-medium",
                  day.isFuture ? "text-muted-foreground/50" : "text-muted-foreground"
                )}>
                  {day.date}
                </span>
                {day.dayOfWeek && (
                  <span className={cn(
                    "text-[8px] md:text-[9px]",
                    day.isWeekend ? "text-warning/70" : "text-muted-foreground/50"
                  )}>
                    {day.dayOfWeek}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-2 md:hidden">
          Нажмите на столбец для деталей
        </p>
      </div>
  );
};

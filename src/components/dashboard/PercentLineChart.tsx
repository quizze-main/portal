import React, { useMemo, useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

export interface PercentLineChartDataPoint {
  date: string;
  value: number;
  plan: number;
  dayOfWeek?: string;
  isWeekend?: boolean;
  isFuture?: boolean;
}

interface PercentLineChartProps {
  data: PercentLineChartDataPoint[];
  height?: number;
  className?: string;
}

// Monotone cubic interpolation with optional Y-bounds clamping to prevent overshoot
// yMin/yMax are SVG coordinates: yMin = top of chart (100%), yMax = bottom of chart (0%)
const generateSmoothPath = (
  points: { x: number; y: number }[],
  yMin?: number,
  yMax?: number,
): string => {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;

  const clampY = (y: number) => {
    let v = y;
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
    const tension = 0.3;
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = clampY(p1.y + (p2.y - p0.y) * tension);
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = clampY(p2.y - (p3.y - p1.y) * tension);
    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return path;
};

export const PercentLineChart: React.FC<PercentLineChartProps> = ({
  data,
  height = 200,
  className,
}) => {
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

  const paddingLeft = 40;
  const paddingRight = 12;
  const paddingTop = 16;
  const paddingBottom = 32;
  const columnWidth = 28;

  const chartWidth = paddingLeft + data.length * columnWidth + paddingRight;
  const effectiveH = height - paddingTop - paddingBottom;

  // Dynamic Y-axis scale based on actual data range
  const yScale = useMemo(() => {
    if (data.length === 0) return { min: 0, max: 100, ticks: [0, 20, 40, 60, 80, 100] };
    const allValues = data.flatMap(d => d.isFuture ? [d.plan] : [d.value, d.plan]);
    const rawMin = Math.min(...allValues);
    const rawMax = Math.max(...allValues);
    const paddedMin = Math.max(0, rawMin - 5);
    const paddedMax = Math.min(100, rawMax + 5);
    const niceMin = Math.floor(paddedMin / 5) * 5;
    const niceMax = Math.ceil(paddedMax / 5) * 5;
    const range = niceMax - niceMin;
    const step = range <= 25 ? 5 : range <= 60 ? 10 : 20;
    const ticks: number[] = [];
    for (let t = niceMin; t <= niceMax; t += step) ticks.push(t);
    return { min: niceMin, max: niceMax, ticks };
  }, [data]);

  const getY = (pct: number): number => {
    const { min, max } = yScale;
    const range = max - min || 1;
    const clamped = Math.max(min, Math.min(max, pct));
    return paddingTop + effectiveH - ((clamped - min) / range) * effectiveH;
  };

  // Точки кривой факта (только прошедшие дни)
  const factPoints = useMemo(() =>
    data.map((d, i) => ({
      x: paddingLeft + i * columnWidth + columnWidth / 2,
      y: getY(d.value),
      isFuture: d.isFuture ?? false,
    })),
    [data, effectiveH]
  );

  // Точки плана
  const planPoints = useMemo(() =>
    data.map((d, i) => ({
      x: paddingLeft + i * columnWidth + columnWidth / 2,
      y: getY(d.plan),
    })),
    [data, effectiveH]
  );

  // Разделяем факт на прошлое и будущее
  const futureStartIndex = data.findIndex(d => d.isFuture);
  const pastFactPoints = futureStartIndex === -1 ? factPoints : factPoints.slice(0, futureStartIndex);

  if (data.length === 0) return null;

  return (
    <div className={cn("overflow-x-auto scrollbar-hide -mx-4 px-4", className)}>
      <div style={{ width: chartWidth }} className="relative" ref={containerRef}>
          <svg
            viewBox={`0 0 ${chartWidth} ${height}`}
            className="w-full"
            style={{ height }}
          >
            {/* Y-axis grid lines + labels */}
            {yScale.ticks.map((tick, idx) => {
              const y = getY(tick);
              const isBottom = idx === 0;
              return (
                <g key={tick}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={chartWidth - paddingRight}
                    y2={y}
                    stroke="hsl(var(--border))"
                    strokeWidth={1}
                    strokeDasharray={isBottom ? undefined : "3 3"}
                    opacity={isBottom ? 0.5 : 0.3}
                  />
                  <text
                    x={paddingLeft - 6}
                    y={y + 3}
                    textAnchor="end"
                    fontSize={9}
                    fill="hsl(var(--muted-foreground))"
                    opacity={0.7}
                  >
                    {tick}%
                  </text>
                </g>
              );
            })}

            {/* Hover columns */}
            {data.map((_, i) => {
              const x = paddingLeft + i * columnWidth;
              return (
                <rect
                  key={`hover-${i}`}
                  x={x}
                  y={paddingTop}
                  width={columnWidth}
                  height={effectiveH}
                  fill={activeIndex === i ? "hsl(var(--muted))" : "transparent"}
                  opacity={0.3}
                />
              );
            })}

            {/* Plan line — past portion (solid) */}
            {futureStartIndex !== 0 && (
              <path
                d={generateSmoothPath(
                  futureStartIndex === -1
                    ? planPoints
                    : planPoints.slice(0, futureStartIndex + 1),
                  paddingTop,
                  paddingTop + effectiveH,
                )}
                fill="none"
                stroke="#3b82f6"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.45}
              />
            )}
            {/* Plan line — future portion (dashed) */}
            {futureStartIndex !== -1 && futureStartIndex < planPoints.length && (
              <path
                d={generateSmoothPath(planPoints.slice(futureStartIndex), paddingTop, paddingTop + effectiveH)}
                fill="none"
                stroke="#3b82f6"
                strokeWidth={1.5}
                strokeDasharray="6 4"
                opacity={0.3}
              />
            )}

            {/* Fact curve — solid (only past) */}
            {pastFactPoints.length > 1 && (
              <path
                d={generateSmoothPath(pastFactPoints, paddingTop, paddingTop + effectiveH)}
                fill="none"
                stroke="#3b82f6"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Fact dots */}
            {factPoints.map((pt, i) => {
              if (data[i].isFuture) return null;
              const isAbove = data[i].value >= data[i].plan;
              return (
                <circle
                  key={`dot-${i}`}
                  cx={pt.x}
                  cy={pt.y}
                  r={activeIndex === i ? 4 : 3}
                  fill={isAbove ? "#10b981" : "hsl(var(--destructive))"}
                  stroke="hsl(var(--background))"
                  strokeWidth={1.5}
                  opacity={activeIndex === i ? 1 : 0.9}
                  className="transition-all duration-150"
                />
              );
            })}

            {/* Plan dots — past days (hollow) */}
            {data.map((day, i) => {
              if (day.isFuture) return null;
              return (
                <circle
                  key={`plan-dot-${i}`}
                  cx={planPoints[i].x}
                  cy={planPoints[i].y}
                  r={activeIndex === i ? 4 : 3}
                  fill="hsl(var(--background))"
                  stroke="#3b82f6"
                  strokeWidth={1.5}
                  opacity={0.6}
                  className="transition-all duration-150"
                />
              );
            })}

            {/* Future markers on plan */}
            {data.map((day, i) => {
              if (!day.isFuture) return null;
              return (
                <circle
                  key={`future-${i}`}
                  cx={planPoints[i].x}
                  cy={planPoints[i].y}
                  r={3}
                  fill="hsl(var(--background))"
                  stroke="#3b82f6"
                  strokeWidth={1.5}
                  opacity={0.4}
                />
              );
            })}
          </svg>

          {/* Custom tooltip (works on both hover and tap) */}
          {activeIndex !== null && (() => {
            const day = data[activeIndex];
            const colCenterX = paddingLeft + activeIndex * columnWidth + columnWidth / 2;
            const clampedLeft = Math.max(65, Math.min(chartWidth - 65, colCenterX));
            return (
              <div
                className="absolute z-50 pointer-events-none"
                style={{ top: paddingTop, left: clampedLeft, transform: 'translateX(-50%)' }}
              >
                <div className="bg-popover text-popover-foreground border border-border rounded-lg shadow-md p-2.5 text-xs whitespace-nowrap">
                  <div className="font-bold text-foreground mb-1.5">
                    {day.date}{day.dayOfWeek ? `, ${day.dayOfWeek}` : ''}
                  </div>
                  {day.isFuture ? (
                    <div className="text-muted-foreground">
                      <span>План: </span>
                      <span className="font-medium">{Math.round(day.plan)}%</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex justify-between gap-3">
                        <span className="text-muted-foreground">Факт:</span>
                        <span className={cn("font-bold", day.value >= day.plan ? "text-success" : "text-destructive")}>
                          {Math.round(day.value)}%
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-muted-foreground">План:</span>
                        <span className="font-medium text-muted-foreground">{Math.round(day.plan)}%</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Touch/hover overlay */}
          <div
            className="absolute flex pointer-events-none"
            style={{ top: paddingTop, left: paddingLeft, right: paddingRight, height: effectiveH }}
          >
            {data.map((_, i) => (
              <div
                key={i}
                className="flex-1 pointer-events-auto cursor-pointer"
                style={{ height: effectiveH }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                onTouchStart={(e) => { e.stopPropagation(); setTappedIndex(prev => prev === i ? null : i); }}
              />
            ))}
          </div>

          {/* Date labels */}
          <div className="flex w-full" style={{ paddingLeft, paddingRight }}>
            {data.map((day, i) => (
              <div
                key={i}
                className={cn(
                  "flex flex-col items-center cursor-pointer hover:bg-muted/30 rounded transition-colors py-0.5",
                  day.isFuture && "opacity-50",
                  activeIndex === i && "bg-muted/30"
                )}
                style={{ width: columnWidth, flexShrink: 0 }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                onTouchStart={(e) => { e.stopPropagation(); setTappedIndex(prev => prev === i ? null : i); }}
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
      </div>
  );
};

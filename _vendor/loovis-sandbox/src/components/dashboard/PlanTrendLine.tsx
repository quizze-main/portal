import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';

export interface PlanTrendLineProps {
  data: Array<{ 
    plan: number; 
    isFuture?: boolean;
    date?: string;
  }>;
  width: number;
  height: number;
  minValue?: number;
  maxValue?: number;
  showLabels?: boolean;
  showFutureMarkers?: boolean;
  formatValue?: (value: number) => string;
  lineColor?: string;
  labelColor?: string;
  className?: string;
}

const defaultFormat = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1).replace('.0', '')}M`;
  }
  if (value >= 1000) {
    return `${Math.round(value / 1000)}K`;
  }
  return value.toString();
};

export const PlanTrendLine: React.FC<PlanTrendLineProps> = ({
  data,
  width,
  height,
  minValue,
  maxValue,
  showLabels = true,
  showFutureMarkers = true,
  formatValue = defaultFormat,
  lineColor = 'hsl(var(--muted-foreground))',
  labelColor = 'hsl(var(--muted-foreground))',
  className,
}) => {
  const { points, pastPath, futurePath, minPlan, maxPlan, futureMarkerPoints } = useMemo(() => {
    if (data.length === 0) {
      return { points: [], pastPath: '', futurePath: '', minPlan: 0, maxPlan: 0, futureMarkerPoints: [] };
    }

    const plans = data.map(d => d.plan);
    const min = minValue ?? Math.min(...plans);
    const max = maxValue ?? Math.max(...plans);
    const range = max - min || 1;
    
    // Padding to keep line visible
    const padding = height * 0.1;
    const effectiveHeight = height - padding * 2;

    // Calculate points
    const pts = data.map((d, i) => {
      const x = data.length > 1 ? (i / (data.length - 1)) * width : width / 2;
      // Invert Y: higher value = lower Y coordinate
      const normalizedY = (d.plan - min) / range;
      const y = padding + effectiveHeight - (normalizedY * effectiveHeight);
      return { x, y, plan: d.plan, isFuture: d.isFuture ?? false };
    });

    // Find the index where future starts
    const futureStartIndex = pts.findIndex(p => p.isFuture);
    
    // Build past path (solid line)
    let pastPts = futureStartIndex === -1 ? pts : pts.slice(0, futureStartIndex + 1);
    const pastPathStr = pastPts.length > 1 
      ? pastPts.reduce((path, pt, i) => {
          if (i === 0) return `M ${pt.x} ${pt.y}`;
          return `${path} L ${pt.x} ${pt.y}`;
        }, '')
      : '';

    // Build future path (dashed line)
    let futurePts = futureStartIndex === -1 ? [] : pts.slice(futureStartIndex);
    const futurePathStr = futurePts.length > 1
      ? futurePts.reduce((path, pt, i) => {
          if (i === 0) return `M ${pt.x} ${pt.y}`;
          return `${path} L ${pt.x} ${pt.y}`;
        }, '')
      : '';

    // Collect future marker points
    const futureMarkers = pts.filter(p => p.isFuture);

    return { 
      points: pts, 
      pastPath: pastPathStr, 
      futurePath: futurePathStr, 
      minPlan: min, 
      maxPlan: max,
      futureMarkerPoints: futureMarkers 
    };
  }, [data, width, height, minValue, maxValue]);

  if (data.length === 0 || width <= 0 || height <= 0) {
    return null;
  }

  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];

  return (
    <svg 
      width={width} 
      height={height} 
      className={cn("absolute inset-0 pointer-events-none", className)}
      style={{ overflow: 'visible' }}
    >
      {/* Past plan line (solid) */}
      {pastPath && (
        <path
          d={pastPath}
          fill="none"
          stroke={lineColor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.6}
        />
      )}

      {/* Future plan line (dashed) */}
      {futurePath && (
        <path
          d={futurePath}
          fill="none"
          stroke={lineColor}
          strokeWidth={2}
          strokeDasharray="4 3"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.4}
        />
      )}

      {/* Future markers (circles) */}
      {showFutureMarkers && futureMarkerPoints.map((pt, i) => (
        <circle
          key={`future-${i}`}
          cx={pt.x}
          cy={pt.y}
          r={3}
          fill="hsl(var(--background))"
          stroke={lineColor}
          strokeWidth={1.5}
          opacity={0.5}
        />
      ))}

      {/* Left label (first plan value) */}
      {showLabels && firstPoint && (
        <text
          x={0}
          y={firstPoint.y - 6}
          fill={labelColor}
          fontSize={9}
          fontWeight={600}
          textAnchor="start"
          opacity={0.7}
        >
          {formatValue(firstPoint.plan)}
        </text>
      )}

      {/* Right label (last plan value) */}
      {showLabels && lastPoint && (
        <text
          x={width}
          y={lastPoint.y - 6}
          fill={labelColor}
          fontSize={9}
          fontWeight={600}
          textAnchor="end"
          opacity={0.7}
        >
          {formatValue(lastPoint.plan)}
        </text>
      )}
    </svg>
  );
};

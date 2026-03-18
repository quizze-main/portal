import { useRef, useState, useEffect, useMemo } from 'react';

export interface ChartDimensionsOptions {
  /** Number of data points on x-axis */
  dataPointsCount: number;
  /** Base height for mobile / narrow screens (px) */
  baseHeight?: number;
  /** Desired aspect ratio width:height (e.g. 3 means width = 3 * height) */
  desiredAspectRatio?: number;
  /** Maximum chart height (px) */
  maxHeight?: number;
  /** Minimum column width per data point (px) */
  minColumnWidth?: number;
  /** Breakpoint (px) above which adaptive scaling kicks in */
  desktopBreakpoint?: number;
}

export interface ChartDimensions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Computed chart height — increases on wide screens */
  height: number;
  /** Container width (0 until measured) */
  containerWidth: number;
  /** Whether we're in desktop adaptive mode */
  isDesktop: boolean;
}

/**
 * Hook that measures container width via ResizeObserver
 * and computes optimal chart height to maintain readable aspect ratio.
 *
 * Mobile: returns baseHeight as-is (horizontal scroll handles overflow).
 * Desktop (>= breakpoint): height = max(baseHeight, containerWidth / desiredAspectRatio),
 *   capped at maxHeight.
 */
export function useChartDimensions({
  dataPointsCount,
  baseHeight = 220,
  desiredAspectRatio = 2.8,
  maxHeight = 420,
  minColumnWidth = 28,
  desktopBreakpoint = 1024,
}: ChartDimensionsOptions): ChartDimensions {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const isDesktop = containerWidth >= desktopBreakpoint;

  const height = useMemo(() => {
    if (!isDesktop || containerWidth === 0) return baseHeight;

    // Proportional height: wider container → taller chart
    const proportionalHeight = Math.round(containerWidth / desiredAspectRatio);

    // Clamp between baseHeight and maxHeight
    return Math.min(maxHeight, Math.max(baseHeight, proportionalHeight));
  }, [containerWidth, isDesktop, baseHeight, desiredAspectRatio, maxHeight]);

  return { containerRef, height, containerWidth, isDesktop };
}

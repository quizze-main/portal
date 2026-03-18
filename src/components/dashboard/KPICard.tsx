import { ChevronRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { KPISlider, KPIStatus } from "./KPISlider";

export interface KPIMetric {
  id: string;
  name: string;
  shortName?: string;
  level: 1 | 2;
  current: number;
  plan: number;
  reserve?: number;
  forecast: number;
  unit: '₽' | '%' | 'шт';
  trend: 'up' | 'down' | 'stable';
  trendValue?: number;
  status: KPIStatus;
}

interface KPICardProps {
  metric: KPIMetric;
  onClick?: () => void;
  showArrow?: boolean;
  compact?: boolean;
  className?: string;
}

const TrendIcon = ({ trend, value }: { trend: 'up' | 'down' | 'stable'; value?: number }) => {
  const iconClass = "w-3 h-3";
  
  if (trend === 'up') {
    return (
      <span className="flex items-center gap-0.5 text-success text-xs">
        <TrendingUp className={iconClass} />
        {value && <span>+{value}%</span>}
      </span>
    );
  }
  if (trend === 'down') {
    return (
      <span className="flex items-center gap-0.5 text-destructive text-xs">
        <TrendingDown className={iconClass} />
        {value && <span>-{value}%</span>}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-0.5 text-muted-foreground text-xs">
      <Minus className={iconClass} />
    </span>
  );
};

export function KPICard({
  metric,
  onClick,
  showArrow = true,
  compact = false,
  className,
}: KPICardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-card rounded-lg p-3 shadow-card transition-all duration-200",
        onClick && "cursor-pointer hover:shadow-md active:scale-[0.99]",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={cn(
            "font-medium text-card-foreground",
            compact ? "text-sm" : "text-base"
          )}>
            {metric.shortName || metric.name}
          </span>
          <TrendIcon trend={metric.trend} value={metric.trendValue} />
        </div>
        {showArrow && onClick && (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
      </div>

      {/* KPI Slider */}
      <KPISlider
        current={metric.current}
        plan={metric.plan}
        reserve={metric.reserve}
        forecast={metric.forecast}
        status={metric.status}
        unit={metric.unit}
        compact={compact}
        showLabels={!compact}
      />
    </div>
  );
}

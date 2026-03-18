import { Card, CardContent } from '@/components/ui/card';
import { Star, ThumbsUp, Minus, ThumbsDown, Trophy, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { KPIDonutChart } from './KPIDonutChart';

interface CSIMetric {
  current: number;
  plan: number;
}

interface ReviewsDistribution {
  good: number;
  neutral: number;
  bad: number;
}

interface ManagerCSIBlockProps {
  csi: CSIMetric;
  ranking?: number;
  totalManagers?: number;
  reviews?: ReviewsDistribution;
  negativeCount?: number;
  className?: string;
  onClick?: () => void;
}

export function ManagerCSIBlock({ 
  csi,
  ranking,
  totalManagers = 5,
  reviews = { good: 85, neutral: 10, bad: 5 },
  negativeCount = 0,
  className,
  onClick
}: ManagerCSIBlockProps) {
  const csiPercent = Math.round((csi.current / csi.plan) * 100);
  const deviation = csi.current - csi.plan;

  const getStatusBadge = (percent: number) => {
    if (percent >= 100) return 'bg-emerald-100 text-emerald-700';
    if (percent >= 95) return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
  };

  return (
    <Card 
      className={cn(
        "overflow-hidden transition-all",
        onClick && "cursor-pointer hover:shadow-md hover:bg-muted/30",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <div className="p-1 rounded-md bg-orange-100">
              <Star className="w-3.5 h-3.5 text-orange-600" />
            </div>
            <h3 className="text-xs font-semibold text-foreground">CSI и Отзывы</h3>
          </div>
          <div className="flex items-center gap-1.5">
            {ranking && (
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-100 rounded-full">
                <Trophy className="w-2.5 h-2.5 text-amber-500" />
                <span className="text-[10px] font-semibold">#{ranking}</span>
              </div>
            )}
            <span className={cn(
              "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
              getStatusBadge(csiPercent)
            )}>
              {deviation >= 0 ? '+' : ''}{deviation}%
            </span>
            {onClick && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </div>
        </div>

        {/* Main content - vertical stack on very narrow screens */}
        <div className="flex flex-col sm:flex-row gap-2">
          {/* CSI with donut */}
          <div className="flex items-center gap-2 p-2 bg-orange-50/50 rounded-lg sm:flex-1">
            <KPIDonutChart 
              value={csi.current}
              maxValue={csi.plan}
              forecast={csiPercent}
              displayValue={`${csi.current}%`}
              color="#F97316"
              size={44}
            />
            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-muted-foreground">CSI</div>
              <div className="text-sm font-bold text-foreground">
                {csi.current}%<span className="text-muted-foreground font-normal text-[10px]"> / {csi.plan}%</span>
              </div>
            </div>
          </div>

          {/* Reviews segmented bar */}
          <div className="sm:flex-1 p-2 bg-slate-50 rounded-lg">
            <div className="text-[10px] text-muted-foreground mb-2">Отзывы</div>
            
            {/* Segmented progress - increased height */}
            <div className="h-2.5 rounded-full overflow-hidden flex mb-2">
              <div 
                className="bg-emerald-500 transition-all" 
                style={{ width: `${reviews.good}%` }} 
              />
              <div 
                className="bg-slate-300 transition-all" 
                style={{ width: `${reviews.neutral}%` }} 
              />
              <div 
                className="bg-red-500 transition-all" 
                style={{ width: `${reviews.bad}%` }} 
              />
            </div>

            {/* Legend - increased font and icons */}
            <div className="flex justify-between text-[10px]">
              <div className="flex items-center gap-1">
                <ThumbsUp className="w-3 h-3 text-emerald-500" />
                <span className="text-emerald-600 font-semibold">{reviews.good}%</span>
              </div>
              <div className="flex items-center gap-1">
                <Minus className="w-3 h-3 text-slate-400" />
                <span className="text-slate-500 font-semibold">{reviews.neutral}%</span>
              </div>
              <div className="flex items-center gap-1">
                <ThumbsDown className="w-3 h-3 text-red-500" />
                <span className="text-red-600 font-semibold">{reviews.bad}%</span>
                {negativeCount > 0 && (
                  <span className="ml-0.5 px-1 py-0.5 bg-red-100 text-red-700 rounded text-[9px] font-bold">
                    {negativeCount}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

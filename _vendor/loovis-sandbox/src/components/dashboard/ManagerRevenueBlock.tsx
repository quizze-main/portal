import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Package, Users, ShoppingCart, AlertTriangle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFull } from '@/lib/formatters';
import { KPIDonutChart } from './KPIDonutChart';

interface RevenueMetric {
  current: number;
  plan: number;
}

interface AttentionCategory {
  count: number;
  amount: number;
}

interface AttentionOrders {
  count: number;
  amount: number;
  readyForPickup?: AttentionCategory;
  storageExpired?: AttentionCategory;
  deadlineSoon?: AttentionCategory;
  overdue?: AttentionCategory;
}

interface ManagerRevenueBlockProps {
  revenueSz: RevenueMetric;
  revenueZz?: RevenueMetric;
  ordersCount: RevenueMetric;
  clientsCount: RevenueMetric;
  attentionOrders?: AttentionOrders;
  onAttentionClick?: () => void;
  className?: string;
}

export function ManagerRevenueBlock({ 
  revenueSz, 
  revenueZz,
  ordersCount, 
  clientsCount,
  attentionOrders,
  onAttentionClick,
  className 
}: ManagerRevenueBlockProps) {
  const revenueSzPercent = Math.round((revenueSz.current / revenueSz.plan) * 100);
  const revenueZzPercent = revenueZz ? Math.round((revenueZz.current / revenueZz.plan) * 100) : 0;
  const ordersPercent = Math.round((ordersCount.current / ordersCount.plan) * 100);
  const clientsPercent = Math.round((clientsCount.current / clientsCount.plan) * 100);

  const getStatusBadge = (percent: number) => {
    if (percent >= 100) return 'bg-emerald-100 text-emerald-700';
    if (percent >= 80) return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 100) return 'bg-emerald-500';
    if (percent >= 80) return 'bg-amber-500';
    return 'bg-destructive';
  };

  // Calculate combined revenue percentage for header
  const combinedRevenue = revenueZz 
    ? revenueSz.current + revenueZz.current 
    : revenueSz.current;
  const combinedPlan = revenueZz 
    ? revenueSz.plan + revenueZz.plan 
    : revenueSz.plan;
  const combinedPercent = Math.round((combinedRevenue / combinedPlan) * 100);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <div className="p-1 rounded-md bg-blue-100">
              <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <h3 className="text-xs font-semibold text-foreground">Выручка</h3>
          </div>
          <span className={cn(
            "text-[10px] font-semibold px-2 py-0.5 rounded-full",
            getStatusBadge(combinedPercent)
          )}>
            {combinedPercent}%
          </span>
        </div>

        {/* Revenue Cards Row */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          {/* Revenue SZ */}
          <div className="flex items-center gap-2 p-2 bg-blue-50/50 rounded-lg">
            <KPIDonutChart 
              value={revenueSz.current}
              maxValue={revenueSz.plan}
              forecast={revenueSzPercent}
              displayValue={`${revenueSzPercent}%`}
              color="#3B82F6"
              size={44}
            />
            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-muted-foreground font-medium">Выручка СЗ</div>
              <div className="text-xs font-bold text-foreground truncate">
                {formatFull(revenueSz.current, '₽')}
              </div>
              <div className="text-[9px] text-muted-foreground">
                план: {formatFull(revenueSz.plan, '₽')}
              </div>
              <Progress 
                value={Math.min(revenueSzPercent, 100)} 
                className="h-1 mt-1"
                indicatorClassName="bg-blue-500"
              />
            </div>
          </div>

          {/* Revenue ZZ */}
          {revenueZz && (
            <div className="flex items-center gap-2 p-2 bg-cyan-50/50 rounded-lg">
              <KPIDonutChart 
                value={revenueZz.current}
                maxValue={revenueZz.plan}
                forecast={revenueZzPercent}
                displayValue={`${revenueZzPercent}%`}
                color="#06B6D4"
                size={44}
              />
              <div className="min-w-0 flex-1">
                <div className="text-[10px] text-muted-foreground font-medium">Выручка ЗЗ</div>
                <div className="text-xs font-bold text-foreground truncate">
                  {formatFull(revenueZz.current, '₽')}
                </div>
                <div className="text-[9px] text-muted-foreground">
                  план: {formatFull(revenueZz.plan, '₽')}
                </div>
                <Progress 
                  value={Math.min(revenueZzPercent, 100)} 
                  className="h-1 mt-1"
                  indicatorClassName="bg-cyan-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Bottom Row: Orders, Clients, Attention */}
        <div className="grid grid-cols-2 gap-2">
          {/* Orders - detailed */}
          <div className="p-2 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-1.5 mb-1">
              <ShoppingCart className="w-3 h-3 text-blue-500" />
              <span className="text-[10px] text-muted-foreground">Заказы</span>
              <span className={cn(
                "ml-auto text-[10px] font-semibold",
                ordersPercent >= 100 ? "text-emerald-600" : "text-rose-600"
              )}>
                {ordersPercent}%
              </span>
            </div>
            <div className="text-xs font-bold text-foreground">
              {ordersCount.current} / {ordersCount.plan}
            </div>
            <div className="mt-1 h-1 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all",
                  ordersPercent >= 100 ? "bg-emerald-500" : "bg-blue-500"
                )}
                style={{ width: `${Math.min(ordersPercent, 100)}%` }}
              />
            </div>
          </div>

          {/* Clients - detailed */}
          <div className="p-2 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-1.5 mb-1">
              <Users className="w-3 h-3 text-blue-500" />
              <span className="text-[10px] text-muted-foreground">Клиенты ФЛ</span>
              <span className={cn(
                "ml-auto text-[10px] font-semibold",
                clientsPercent >= 100 ? "text-emerald-600" : "text-rose-600"
              )}>
                {clientsPercent}%
              </span>
            </div>
            <div className="text-xs font-bold text-foreground">
              {clientsCount.current} / {clientsCount.plan}
            </div>
            <div className="mt-1 h-1 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all",
                  clientsPercent >= 100 ? "bg-emerald-500" : "bg-blue-500"
                )}
                style={{ width: `${Math.min(clientsPercent, 100)}%` }}
              />
            </div>
          </div>

          {/* Attention Orders - compact mini-widget */}
          {attentionOrders && attentionOrders.count > 0 && (
            <button 
              onClick={onAttentionClick}
              className={cn(
                "col-span-2",
                "bg-gradient-to-r from-rose-100 to-rose-50",
                "border border-rose-200 rounded-lg px-3 py-2.5",
                "hover:from-rose-200 hover:to-rose-100",
                "transition-all text-left"
              )}
            >
              <div className="flex flex-col gap-2">
                {/* Top row: Icon + title + arrow */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span className="text-xs text-rose-700 font-semibold">
                      Требует внимания
                    </span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-rose-400" />
                </div>
                
                {/* Bottom row: 4 categories in full-width grid */}
                <div className="grid grid-cols-4 gap-2">
                  {/* Готовы к выдаче */}
                  <div className="flex flex-col items-center text-center">
                    <span className="text-lg font-bold text-emerald-600">
                      {attentionOrders.readyForPickup?.count || Math.round(attentionOrders.count * 0.28)}
                    </span>
                    <span className="text-[10px] text-muted-foreground leading-tight">
                      Готовы
                    </span>
                    <span className="text-xs font-medium text-foreground mt-0.5">
                      {formatFull(attentionOrders.readyForPickup?.amount || Math.round(attentionOrders.amount * 0.30), '₽')}
                    </span>
                  </div>
                  
                  {/* Срок хранения превышен */}
                  <div className="flex flex-col items-center text-center">
                    <span className="text-lg font-bold text-orange-600">
                      {attentionOrders.storageExpired?.count || Math.round(attentionOrders.count * 0.46)}
                    </span>
                    <span className="text-[10px] text-muted-foreground leading-tight">
                      Срок
                    </span>
                    <span className="text-xs font-medium text-foreground mt-0.5">
                      {formatFull(attentionOrders.storageExpired?.amount || Math.round(attentionOrders.amount * 0.48), '₽')}
                    </span>
                  </div>
                  
                  {/* Скоро дедлайн <2 дней */}
                  <div className="flex flex-col items-center text-center">
                    <span className="text-lg font-bold text-orange-600">
                      {attentionOrders.deadlineSoon?.count || Math.round(attentionOrders.count * 0.12)}
                    </span>
                    <span className="text-[10px] text-muted-foreground leading-tight">
                      Дедлайн
                    </span>
                    <span className="text-xs font-medium text-foreground mt-0.5">
                      {formatFull(attentionOrders.deadlineSoon?.amount || Math.round(attentionOrders.amount * 0.10), '₽')}
                    </span>
                  </div>
                  
                  {/* Просрочен */}
                  <div className="flex flex-col items-center text-center">
                    <span className="text-lg font-bold text-red-600">
                      {attentionOrders.overdue?.count || Math.round(attentionOrders.count * 0.14)}
                    </span>
                    <span className="text-[10px] text-muted-foreground leading-tight">
                      Просрочен
                    </span>
                    <span className="text-xs font-medium text-foreground mt-0.5">
                      {formatFull(attentionOrders.overdue?.amount || Math.round(attentionOrders.amount * 0.12), '₽')}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

import { cn, getManagerAvatar } from "@/lib/utils";
import { ChevronRight, TrendingDown, TrendingUp, FileText, CheckCircle2, LucideIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { DraggableMetricItem } from "./DraggableMetricItem";

export interface ManagerCardData {
  id: string;
  name: string;
  avatar?: string;
  planPercent: number;
  createdOrders: number;
  createdOrdersPlan: number;
  closedOrders: number;
  closedOrdersPlan: number;
  forecast: number;
  losses: number;
}

interface MetricConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  getValue: (manager: ManagerCardData) => string;
  getStatus?: (manager: ManagerCardData) => 'good' | 'warning' | 'critical' | null;
  getBgClass?: (manager: ManagerCardData) => string;
  getIconClass?: (manager: ManagerCardData) => string;
  getLabelClass?: (manager: ManagerCardData) => string;
  getValueClass?: (manager: ManagerCardData) => string;
}

interface ManagerCardProps {
  manager: ManagerCardData;
  onClick?: (id: string) => void;
  className?: string;
  isEditMode?: boolean;
  metricsOrder?: string[];
  onMetricsOrderChange?: (newOrder: string[]) => void;
}

const formatFullNumber = (value: number): string => {
  return value.toLocaleString('ru-RU');
};

const getStatus = (percent: number): 'good' | 'warning' | 'critical' => {
  if (percent >= 95) return 'good';
  if (percent >= 70) return 'warning';
  return 'critical';
};

const getStatusColor = (status: 'good' | 'warning' | 'critical'): string => {
  if (status === 'good') return 'text-success';
  if (status === 'critical') return 'text-destructive';
  return 'text-warning';
};

const getStatusBg = (status: 'good' | 'warning' | 'critical'): string => {
  if (status === 'good') return 'bg-success';
  if (status === 'critical') return 'bg-destructive';
  return 'bg-warning';
};

const METRICS_CONFIG: MetricConfig[] = [
  {
    id: 'created',
    label: 'Созданные заказы',
    icon: FileText,
    getValue: (m) => `${formatFullNumber(m.createdOrders)} ₽`,
    getBgClass: () => 'bg-secondary/50',
    getIconClass: () => 'text-muted-foreground',
    getLabelClass: () => 'text-muted-foreground',
    getValueClass: () => 'text-foreground',
  },
  {
    id: 'closed',
    label: 'Закрытые заказы',
    icon: CheckCircle2,
    getValue: (m) => `${formatFullNumber(m.closedOrders)} ₽`,
    getBgClass: () => 'bg-secondary/50',
    getIconClass: () => 'text-muted-foreground',
    getLabelClass: () => 'text-muted-foreground',
    getValueClass: () => 'text-foreground',
  },
  {
    id: 'forecast',
    label: 'Прогноз',
    icon: TrendingUp,
    getValue: (m) => `${m.forecast}%`,
    getStatus: (m) => getStatus(m.forecast),
    getBgClass: (m) => getStatus(m.forecast) === 'critical' ? 'bg-destructive/10' : 'bg-secondary/50',
    getIconClass: () => 'text-muted-foreground',
    getLabelClass: () => 'text-muted-foreground',
    getValueClass: (m) => getStatusColor(getStatus(m.forecast)),
  },
  {
    id: 'losses',
    label: 'Потери',
    icon: TrendingDown,
    getValue: (m) => m.losses === 0 ? '0 ₽' : `−${formatFullNumber(m.losses)} ₽`,
    getBgClass: (m) => m.losses > 50000 ? 'bg-destructive/10' : m.losses > 0 ? 'bg-warning/10' : 'bg-secondary/50',
    getIconClass: (m) => m.losses > 50000 ? 'text-destructive' : m.losses > 0 ? 'text-warning' : 'text-muted-foreground',
    getLabelClass: (m) => m.losses > 50000 ? 'text-destructive' : m.losses > 0 ? 'text-warning' : 'text-muted-foreground',
    getValueClass: (m) => m.losses > 50000 ? 'text-destructive' : m.losses > 0 ? 'text-warning' : 'text-success',
  },
];

const DEFAULT_ORDER = ['created', 'closed', 'forecast', 'losses'];

export function ManagerCard({ 
  manager, 
  onClick, 
  className,
  isEditMode = false,
  metricsOrder = DEFAULT_ORDER,
  onMetricsOrderChange,
}: ManagerCardProps) {
  const planStatus = getStatus(manager.planPercent);
  const forecastStatus = getStatus(manager.forecast);
  const initials = manager.name.split(' ').map(n => n[0]).join('').slice(0, 2);
  
  const isCritical = planStatus === 'critical' || forecastStatus === 'critical';

  const sortedMetrics = metricsOrder
    .map(id => METRICS_CONFIG.find(m => m.id === id))
    .filter((m): m is MetricConfig => m !== undefined);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = metricsOrder.indexOf(active.id as string);
      const newIndex = metricsOrder.indexOf(over.id as string);
      const newOrder = arrayMove(metricsOrder, oldIndex, newIndex);
      onMetricsOrderChange?.(newOrder);
    }
  };

  const handleCardClick = () => {
    if (!isEditMode) {
      onClick?.(manager.id);
    }
  };

  const renderMetricContent = (metric: MetricConfig) => {
    const Icon = metric.icon;
    return (
      <div className={cn(
        "rounded-lg px-3 py-2 h-full",
        metric.getBgClass?.(manager) || 'bg-secondary/50'
      )}>
        <div className="flex items-center gap-1.5 mb-0.5">
          <Icon className={cn(
            "w-3.5 h-3.5 shrink-0",
            metric.getIconClass?.(manager) || 'text-muted-foreground'
          )} />
          <span className={cn(
            "text-[11px]",
            metric.getLabelClass?.(manager) || 'text-muted-foreground'
          )}>{metric.label}</span>
        </div>
        <div className={cn(
          "text-sm font-semibold",
          metric.getValueClass?.(manager) || 'text-foreground'
        )}>
          {metric.getValue(manager)}
        </div>
      </div>
    );
  };

  return (
    <div 
      className={cn(
        "bg-card rounded-xl p-3 shadow-card border transition-all",
        !isEditMode && "cursor-pointer active:scale-[0.99] hover:shadow-lg",
        isEditMode && "ring-2 ring-primary/20",
        isCritical ? "border-destructive/30 bg-destructive/5" : "border-border/30",
        className
      )}
      onClick={handleCardClick}
    >
      {/* Header with Avatar, Name and Progress */}
      <div className="flex items-center gap-3 mb-3">
        <Avatar className="h-10 w-10 ring-2 ring-primary/10 shrink-0">
          <AvatarImage src={getManagerAvatar(manager.id)} alt={manager.name} />
          <AvatarFallback className="text-xs bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-foreground truncate text-sm">{manager.name}</span>
            <div className="flex items-center gap-1.5">
              <span className={cn("text-base font-bold", getStatusColor(planStatus))}>
                {manager.planPercent}%
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="h-1.5 bg-secondary/60 rounded-full overflow-hidden">
            <div 
              className={cn("h-full rounded-full transition-all duration-500", getStatusBg(planStatus))}
              style={{ width: `${Math.min(manager.planPercent, 100)}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* Metrics Grid with DnD */}
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={metricsOrder} strategy={rectSortingStrategy}>
          <div className={cn(
            "grid grid-cols-2 gap-2 mt-3",
            isEditMode && "pl-4"
          )}>
            {sortedMetrics.map((metric) => (
              <DraggableMetricItem
                key={metric.id}
                id={metric.id}
                isEditMode={isEditMode}
              >
                {renderMetricContent(metric)}
              </DraggableMetricItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

interface ManagerCardListProps {
  managers: ManagerCardData[];
  onManagerClick?: (id: string) => void;
  className?: string;
  isEditMode?: boolean;
  metricsOrder?: string[];
  onMetricsOrderChange?: (newOrder: string[]) => void;
  selectedMetric?: string;
  onMetricChange?: (metricId: string) => void;
  availableMetrics?: { id: string; name: string }[];
}

const DEFAULT_AVAILABLE_METRICS = [
  { id: 'revenue_sz', name: 'Выручка СЗ' },
  { id: 'orders_count', name: 'Кол-во заказов' },
  { id: 'avg_check', name: 'Средний чек' },
  { id: 'conversion', name: 'Конверсия' },
];

export function ManagerCardList({ 
  managers, 
  onManagerClick, 
  className,
  isEditMode = false,
  metricsOrder,
  onMetricsOrderChange,
  selectedMetric,
  onMetricChange,
  availableMetrics = DEFAULT_AVAILABLE_METRICS,
}: ManagerCardListProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {/* Metric selector dropdown */}
      {onMetricChange && availableMetrics.length > 0 && (
        <div className="flex items-center justify-end">
          <select
            value={selectedMetric || availableMetrics[0]?.id}
            onChange={(e) => onMetricChange(e.target.value)}
            className="text-sm bg-card border border-border rounded-lg px-3 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {availableMetrics.map((metric) => (
              <option key={metric.id} value={metric.id}>
                {metric.name}
              </option>
            ))}
          </select>
        </div>
      )}
      
      {/* Manager cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
        {managers.map((manager) => (
          <ManagerCard
            key={manager.id}
            manager={manager}
            onClick={onManagerClick}
            isEditMode={isEditMode}
            metricsOrder={metricsOrder}
            onMetricsOrderChange={onMetricsOrderChange}
          />
        ))}
      </div>
    </div>
  );
}

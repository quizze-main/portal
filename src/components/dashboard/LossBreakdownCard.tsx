import { TrendingDown, Users, Percent, BarChart3, HelpCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { formatFull } from '@/lib/formatters';

const formatCurrency = (value: number) => formatFull(value, '₽');

interface LossCategory {
  id: string;
  label: string;
  value: number;
  percentage: number;
  icon: React.ElementType;
  description: string;
}

interface LossBreakdownCardProps {
  totalLoss: number;
  employeeLoss: number;
  conversionLoss: number;
  arpcLoss: number;
}

export function LossBreakdownCard({
  totalLoss,
  employeeLoss,
  conversionLoss,
  arpcLoss
}: LossBreakdownCardProps) {
  const categories: LossCategory[] = [
    {
      id: 'employee',
      label: 'Эффективность сотрудников',
      value: employeeLoss,
      percentage: Math.round((employeeLoss / totalLoss) * 100),
      icon: Users,
      description: 'Отклонение от лучшего результата -20%'
    },
    {
      id: 'conversion',
      label: 'Потери по конверсии',
      value: conversionLoss,
      percentage: Math.round((conversionLoss / totalLoss) * 100),
      icon: Percent,
      description: 'Отклонение от целевой +20%'
    },
    {
      id: 'arpc',
      label: 'Потери по среднему чеку',
      value: arpcLoss,
      percentage: Math.round((arpcLoss / totalLoss) * 100),
      icon: BarChart3,
      description: 'Отклонение от целевого +10%'
    }
  ].sort((a, b) => b.value - a.value);

  const maxPercentage = Math.max(...categories.map(c => c.percentage));

  return (
    <Card className="p-4 bg-gradient-to-br from-destructive/5 to-destructive/10 border-destructive/20">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-destructive" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Потери</h3>
          </div>
          <span className="text-lg font-bold text-destructive">
            −{formatCurrency(totalLoss)}
          </span>
        </div>

        {/* Loss categories */}
        <div className="space-y-2">
          {categories.map((category) => {
            const Icon = category.icon;
            const barWidth = (category.percentage / maxPercentage) * 100;
            
            return (
              <div key={category.id} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs font-medium text-foreground">{category.label}</span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="p-0.5 rounded-full hover:bg-muted/50 transition-colors flex-shrink-0">
                          <HelpCircle className="w-3 h-3 text-muted-foreground/50 hover:text-muted-foreground transition-colors" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent side="top" className="w-auto max-w-[220px] p-2">
                        <p className="text-xs text-muted-foreground">{category.description}</p>
                      </PopoverContent>
                    </Popover>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-medium flex-shrink-0">
                      {category.percentage}%
                    </Badge>
                  </div>
                  <span className="text-xs font-semibold text-destructive flex-shrink-0">
                    −{formatCurrency(category.value)}
                  </span>
                </div>
                
                {/* Progress bar */}
                <div className="h-1.5 bg-background/50 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-destructive/70 rounded-full transition-all duration-500"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
  );
}

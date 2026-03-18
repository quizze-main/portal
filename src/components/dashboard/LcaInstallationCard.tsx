import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { FilterPeriod } from './FilterBar';
import { lcaDataByPeriod } from '@/data/periodData';
import { KPIGaugeChart } from './KPIGaugeChart';

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('ru-RU').format(Math.round(value));
};

const getPercentColor = (percent: number) => {
  if (percent >= 100) return 'text-success';
  if (percent >= 80) return 'text-warning';
  return 'text-destructive';
};

const getBgColor = (percent: number) => {
  if (percent >= 100) return 'bg-success/10';
  if (percent >= 80) return 'bg-warning/10';
  return 'bg-destructive/10';
};

const getProgressBarColor = (percent: number) => {
  if (percent >= 100) return 'bg-success';
  if (percent >= 80) return 'bg-warning';
  return 'bg-destructive';
};

interface LcaInstallationCardProps {
  period?: FilterPeriod;
}

export const LcaInstallationCard: React.FC<LcaInstallationCardProps> = ({ 
  period = 'month' 
}) => {
  const [isManagersOpen, setIsManagersOpen] = useState(false);
  const navigate = useNavigate();
  
  const data = lcaDataByPeriod[period];
  const conversionPercent = Math.round((data.conversionValue / data.conversionTarget) * 100);
  const deviation = data.conversionValue - data.conversionTarget;
  
  const handleManagerClick = (managerId: string) => {
    navigate(`/dashboard/manager/${managerId}`);
  };
  
  const sortedManagers = [...data.managers].sort((a, b) => b.conversionValue - a.conversionValue);
  
  return (
    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Установка ЛКА</h3>
            <p className="text-xs text-muted-foreground">Личный кабинет клиента</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {/* Clients without LCA */}
          <div className="bg-muted/30 rounded-lg p-3">
            <div className="text-xs text-muted-foreground mb-1">Клиентов без ЛК</div>
            <div className="text-xl font-bold text-foreground">{formatNumber(data.clientsWithoutLca)}</div>
          </div>
          
          {/* Installations */}
          <div className="bg-muted/30 rounded-lg p-3">
            <div className="text-xs text-muted-foreground mb-1">Установок ЛК</div>
            <div className="text-xl font-bold text-foreground">{formatNumber(data.installations)}</div>
          </div>
          
          {/* Conversion Gauge */}
          <div className="col-span-2 lg:col-span-1 flex items-center justify-center">
            <div className="text-center">
              <KPIGaugeChart 
                value={deviation}
                size={80}
              />
              <div className="text-xs text-muted-foreground mt-1">
                Конверсия: <span className={cn("font-bold", getPercentColor(conversionPercent))}>
                  {data.conversionValue}%
                </span> / {data.conversionTarget}%
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Managers accordion */}
      <div className="border-t border-border">
        <button
          onClick={() => setIsManagersOpen(!isManagersOpen)}
          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isManagersOpen ? '' : '-rotate-90'}`} />
            <span className="text-sm font-semibold text-foreground">По менеджерам</span>
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
              {data.managers.length}
            </span>
          </div>
        </button>

        <div 
          className={`overflow-hidden transition-all duration-300 ease-out ${
            isManagersOpen ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="px-4 pb-3 space-y-0.5">
            {sortedManagers.map((manager) => {
              const managerConvPercent = manager.clientsWithoutLca > 0 
                ? Math.round((manager.installations / manager.clientsWithoutLca) * 100) 
                : 0;
              
              return (
                <button
                  key={manager.id}
                  onClick={() => handleManagerClick(manager.id)}
                  className="w-full flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors text-left group"
                >
                  <span className="text-[10px] font-bold text-muted-foreground bg-muted/50 rounded px-1 py-0.5 shrink-0 w-6 text-center">
                    {manager.name.split(' ').map(n => n[0]).join('')}
                  </span>
                  
                  <span className="hidden sm:block text-xs font-medium w-28 truncate shrink-0">
                    {manager.name}
                  </span>
                  
                  <div className="flex-1 h-2 bg-secondary/30 rounded-full overflow-hidden relative min-w-[60px]">
                    <div 
                      style={{ width: `${Math.min(managerConvPercent, 100)}%` }}
                      className={cn(
                        "h-full rounded-full transition-all",
                        getProgressBarColor(manager.conversionValue)
                      )}
                    />
                  </div>
                  
                  <span className="text-xs tabular-nums shrink-0 text-muted-foreground">
                    {manager.installations}/{manager.clientsWithoutLca}
                  </span>
                  
                  <span className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded min-w-[36px] text-center tabular-nums shrink-0",
                    getBgColor(manager.conversionValue),
                    getPercentColor(manager.conversionValue)
                  )}>
                    {manager.conversionValue}%
                  </span>
                  
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

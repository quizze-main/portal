import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, getDaysInMonth } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Layout } from '@/components/Layout';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft } from 'lucide-react';
import { 
  ManagerPerformanceChart, 
  ManagerCategoryTable,
  FilterBar,
  ManagerLossBreakdown,
  ManagerAttentionCard,
  ManagerMissionBlock,
  ManagerRevenueBlock,
  ManagerAvgPriceBlock,
  ManagerCSIBlock,
  ManagerMarginBlock,
  ManagerRepairsBlock,
  ManagerConversionBlock
} from '@/components/dashboard';
import { FilterPeriod } from '@/components/dashboard/FilterBar';
import { managersData, ManagerKPIData, kpiColors } from '@/data/mockData';
import { managersDataByPeriod } from '@/data/periodData';
import { getMonthlyPlan } from '@/data/monthlyPlans';
import { DateRange } from 'react-day-picker';
import { 
  isValidDateRange, 
  calculateAllPlansForDateRange,
  generateChartDataForDateRange,
  generateHourlyChartData,
  isSingleDayRange,
  getDateRangeDays
} from '@/lib/dateRangeUtils';

// Default manager with all optional fields
const defaultManager: ManagerKPIData = {
  id: 'default',
  name: 'Менеджер',
  role: 'Консультант',
  avatar: undefined,
  metricsLevel1: [],
  metricsLevel2: [],
  lostRevenue: 0,
  chartData: [],
  ranking: undefined,
  lossBreakdown: undefined,
  attentionItems: undefined,
  productMetrics: undefined,
  lensMatrix: undefined,
  revenueChartData: undefined
};

export default function ManagerDetail() {
  const { managerId } = useParams<{ managerId: string }>();
  const navigate = useNavigate();
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('month');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  // Check if custom date range is active
  const isCustomRange = isValidDateRange(dateRange);

  // Get plans for custom date range
  const customRangePlans = useMemo(() => {
    if (!isCustomRange) return null;
    return calculateAllPlansForDateRange(dateRange);
  }, [dateRange, isCustomRange]);

  // Get manager from period-specific data source (same as ranking table)
  // For custom range, use month data as base and scale based on custom plans
  const manager = useMemo(() => {
    if (!managerId) return defaultManager;
    
    // For custom range, we'll use month data as base structure
    const basePeriod = isCustomRange ? 'month' : filterPeriod;
    const dataSource = managersDataByPeriod[basePeriod] || managersData;
    const baseManager = dataSource[managerId] || managersData[managerId] || defaultManager;
    
    if (!isCustomRange || !customRangePlans) {
      return baseManager;
    }

    // Scale metrics based on custom date range plans
    const daysInRange = getDateRangeDays(dateRange);
    const scaleFactor = daysInRange / 30; // Relative to month
    
    return {
      ...baseManager,
      lostRevenue: Math.round(baseManager.lostRevenue * scaleFactor),
      metricsLevel1: baseManager.metricsLevel1.map(m => {
        // Map metric id to plan key
        const planKeyMap: Record<string, keyof typeof customRangePlans> = {
          'revenue_sz': 'revenue_sz',
          'revenue_zz': 'revenue_zz',
          'clients_count': 'clients_count',
          'conversion': 'conversion',
          'csi': 'csi',
          'avg_glasses': 'avg_glasses',
          'margin': 'margin'
        };
        
        const planKey = planKeyMap[m.id];
        if (!planKey) {
          // For metrics not in plan, just scale by days
          return {
            ...m,
            current: m.unit === '%' ? m.current : Math.round(m.current * scaleFactor),
            plan: m.unit === '%' ? m.plan : Math.round(m.plan * scaleFactor)
          };
        }
        
        const newPlan = customRangePlans[planKey];
        // Scale current proportionally (maintain ratio to original plan)
        const ratio = m.plan > 0 ? m.current / m.plan : 1;
        const newCurrent = m.unit === '%' ? m.current : Math.round(newPlan * ratio);
        
        return {
          ...m,
          current: newCurrent,
          plan: newPlan
        };
      }),
      metricsLevel2: baseManager.metricsLevel2.map(m => ({
        ...m,
        current: m.unit === '%' ? m.current : Math.round(m.current * scaleFactor),
        plan: m.unit === '%' ? m.plan : Math.round(m.plan * scaleFactor)
      }))
    };
  }, [managerId, filterPeriod, isCustomRange, customRangePlans, dateRange]);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2);
  };

  // Extract metrics for blocks
  const revenueMetric = manager.metricsLevel1.find(m => m.id === 'revenue_sz');
  const revenueZzMetric = manager.metricsLevel1.find(m => m.id === 'revenue_zz');
  const clientsMetric = manager.metricsLevel1.find(m => m.id === 'clients_count');
  const conversionMetric = manager.metricsLevel1.find(m => m.id === 'conversion');
  const csiMetric = manager.metricsLevel1.find(m => m.id === 'csi');
  const avgGlassesMetric = manager.metricsLevel1.find(m => m.id === 'avg_glasses');
  const marginMetric = manager.metricsLevel1.find(m => m.id === 'margin');

  // Conversions data
  const conversions = useMemo(() => [
    { 
      id: 'inspection_sale', 
      name: 'Диагностика → Продажа', 
      value: conversionMetric?.current || 45, 
      target: conversionMetric?.plan || 55 
    },
    { 
      id: 'repair_sale', 
      name: 'Ремонт → Продажа', 
      value: Math.round((conversionMetric?.current || 45) * 0.6), 
      target: 35 
    }
  ], [conversionMetric]);

  // Category data from level 2 metrics
  const categoryColors: Record<string, string> = {
    lenses_count: '#3B82F6',
    frames_count: '#F59E0B'
  };
  
  const categories = useMemo(() => manager.metricsLevel2.map(m => ({
    id: m.id,
    name: m.name,
    quantity: m.current,
    quantityPlan: m.plan,
    color: categoryColors[m.id] || '#8B5CF6'
  })), [manager.metricsLevel2]);

  // Dynamic daily plan generator (90K-140K range with weekend reduction)
  const generateDynamicDailyPlan = (
    dayOfMonth: number,
    dayOfWeek: number, // 0 = вс, 6 = сб
    options: { minPlan: number; maxPlan: number }
  ): number => {
    const { minPlan, maxPlan } = options;
    const range = maxPlan - minPlan;
    
    // Синусоидальный тренд по месяцу (волна)
    const trendValue = Math.sin((dayOfMonth / 31) * Math.PI * 2.5) * 0.3;
    
    // Снижение плана в выходные (на 40%)
    const weekendMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.6 : 1;
    
    // Псевдослучайный шум (seeded для воспроизводимости)
    const seed = (dayOfMonth * 7919 + dayOfWeek * 6151) % 1000 / 1000;
    const noise = (seed - 0.5) * 0.15;
    
    // Итоговый план с учётом всех факторов
    const normalizedValue = 0.5 + trendValue + noise;
    const basePlan = minPlan + range * Math.max(0, Math.min(1, normalizedValue));
    
    return Math.round(basePlan * weekendMultiplier);
  };

  // Generate chart data based on filter period or custom date range
  const generateChartDataForPeriod = (period: FilterPeriod, baseValue: number, planValue: number) => {
    // Диапазон плана: 90K-140K
    const minDailyPlan = 90000;
    const maxDailyPlan = 140000;
    
    switch (period) {
      case 'day':
        const hours = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
        return hours.map((hour, index) => ({
          date: `${hour.toString().padStart(2, '0')}:00`,
          dayName: '',
          monthLabel: undefined,
          isMonthStart: index === 0,
          value: Math.round(baseValue * (0.8 + Math.random() * 0.4)),
          plan: planValue
        }));
      case '3days': {
        const today = new Date();
        return [-2, -1, 0].map((offset, index) => {
          const date = new Date(today);
          date.setDate(date.getDate() + offset);
          const dayOfMonth = date.getDate();
          const dayOfWeek = date.getDay();
          const dayName = format(date, 'EEEEEE', { locale: ru });
          const labels = ['Позавчера', 'Вчера', 'Сегодня'];
          
          // Динамический план для каждого дня
          const dailyPlan = generateDynamicDailyPlan(dayOfMonth, dayOfWeek, {
            minPlan: minDailyPlan,
            maxPlan: maxDailyPlan
          });
          
          // Факт с отклонением от плана
          const variance = 0.85 + Math.sin(dayOfMonth * 0.5) * 0.15;
          
          return {
            date: labels[index],
            dayName,
            monthLabel: undefined,
            isMonthStart: index === 0,
            value: Math.round(dailyPlan * variance),
            plan: dailyPlan
          };
        });
      }
      case 'year':
        const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
        const yearlyPlans = [3500000, 3200000, 3600000, 3400000, 3300000, 3100000, 3000000, 3200000, 3500000, 3700000, 3600000, 3800000];
        return months.map((month, i) => ({
          date: month,
          dayName: '',
          monthLabel: undefined,
          isMonthStart: true,
          value: Math.round(baseValue * 30 * (0.9 + Math.sin(i * Math.PI / 6) * 0.2)),
          plan: yearlyPlans[i] || planValue * 30
        }));
      case '30clients':
        return Array.from({ length: 30 }, (_, i) => ({
          date: `${i + 1}`,
          dayName: '',
          monthLabel: undefined,
          isMonthStart: i === 0,
          value: Math.round(baseValue * (0.7 + Math.random() * 0.6)),
          plan: planValue
        }));
      case 'month':
      default: {
        // Use current calendar month with dynamic daily plan (90K-140K)
        const currentDate = new Date();
        const currentMonthDays = getDaysInMonth(currentDate);
        const currentMonthLabel = format(currentDate, 'LLL', { locale: ru });
        
        return Array.from({ length: currentMonthDays }, (_, i) => {
          const dayNum = i + 1;
          const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNum);
          const dayOfWeek = dayDate.getDay(); // 0=вс, 6=сб
          const dayName = format(dayDate, 'EEEEEE', { locale: ru });
          
          // Динамический план для каждого дня
          const dailyPlan = generateDynamicDailyPlan(dayNum, dayOfWeek, {
            minPlan: minDailyPlan,
            maxPlan: maxDailyPlan
          });
          
          // Факт с отклонением ±20% от плана
          const seed = (dayNum * 1234 + dayOfWeek * 567) % 1000 / 1000;
          const variance = 0.8 + seed * 0.4;
          const factValue = Math.round(dailyPlan * variance);
          
          return {
            date: `${dayNum}`,
            dayName,
            monthLabel: currentMonthLabel,
            isMonthStart: i === 0,
            value: factValue,
            plan: dailyPlan
          };
        });
      }
    }
  };

  // Chart metrics - supports both preset periods and custom date ranges
  const chartMetrics = useMemo(() => {
    // For custom date range
    if (isCustomRange && dateRange?.from && dateRange?.to) {
      const isSingleDay = isSingleDayRange(dateRange);
      
      if (isSingleDay) {
        // Single day - show hourly data
        return [
          {
            id: 'revenue_sz',
            name: 'Выручка СЗ',
            unit: '₽',
            data: generateHourlyChartData(dateRange.from, 'revenue_sz')
          },
          {
            id: 'revenue_zz',
            name: 'Выручка ЗЗ',
            unit: '₽',
            data: generateHourlyChartData(dateRange.from, 'revenue_zz')
          },
          {
            id: 'avg_check',
            name: 'Средний чек',
            unit: '₽',
            data: generateHourlyChartData(dateRange.from, 'avg_glasses')
          },
          {
            id: 'conversion',
            name: 'Конверсия',
            unit: '%',
            data: generateHourlyChartData(dateRange.from, 'conversion', (_, plan) => 
              Math.round(plan * (0.9 + Math.random() * 0.2))
            )
          }
        ];
      }
      
      // Multi-day range - show daily data with proportional plans
      return [
        {
          id: 'revenue_sz',
          name: 'Выручка СЗ',
          unit: '₽',
          data: generateChartDataForDateRange(dateRange, 'revenue_sz')
        },
        {
          id: 'revenue_zz',
          name: 'Выручка ЗЗ',
          unit: '₽',
          data: generateChartDataForDateRange(dateRange, 'revenue_zz')
        },
        {
          id: 'avg_check',
          name: 'Средний чек',
          unit: '₽',
          data: generateChartDataForDateRange(dateRange, 'avg_glasses')
        },
        {
          id: 'conversion',
          name: 'Конверсия',
          unit: '%',
          data: generateChartDataForDateRange(dateRange, 'conversion', (_, plan) => 
            Math.round(plan * (0.9 + Math.random() * 0.2))
          )
        }
      ];
    }
    
    // Standard preset periods
    return [
      {
        id: 'revenue_sz',
        name: 'Выручка СЗ',
        unit: '₽',
        data: generateChartDataForPeriod(filterPeriod, 85000, 90000)
      },
      {
        id: 'revenue_zz',
        name: 'Выручка ЗЗ',
        unit: '₽',
        data: generateChartDataForPeriod(filterPeriod, 75000, 80000)
      },
      {
        id: 'avg_check',
        name: 'Средний чек',
        unit: '₽',
        data: filterPeriod === 'day' 
          ? generateChartDataForPeriod(filterPeriod, 18000, 18000)
          : filterPeriod === '3days'
            ? [
                { date: 'Позавчера', dayName: 'Ср', value: 19200, plan: 18000 },
                { date: 'Вчера', dayName: 'Чт', value: 17800, plan: 18000 },
                { date: 'Сегодня', dayName: 'Пт', value: 18600, plan: 18000 },
              ]
            : generateChartDataForPeriod(filterPeriod, 12000, 12000)
      },
      {
        id: 'conversion',
        name: 'Конверсия',
        unit: '%',
        data: filterPeriod === 'day'
          ? generateChartDataForPeriod(filterPeriod, 1, 1).map(d => ({ ...d, value: Math.round(55 + Math.random() * 20), plan: 60 }))
          : filterPeriod === '3days'
            ? [
                { date: 'Позавчера', dayName: 'Ср', value: 62, plan: 60 },
                { date: 'Вчера', dayName: 'Чт', value: 58, plan: 60 },
                { date: 'Сегодня', dayName: 'Пт', value: 64, plan: 60 },
              ]
            : generateChartDataForPeriod(filterPeriod, 60, 60).map(d => ({
                ...d,
                value: Math.round(55 + Math.sin(d.value * 0.01) * 10 + Math.random() * 5),
                plan: 60
              }))
      }
    ];
  }, [filterPeriod, isCustomRange, dateRange]);

  // Attention items
  const scaledAttentionItems = useMemo(() => {
    if (!manager.attentionItems) return null;
    return {
      unclosedOrders: { 
        count: manager.attentionItems.unclosedOrders.count,
        amount: manager.attentionItems.unclosedOrders.amount
      },
      notOnTime: { count: manager.attentionItems.notOnTime.count },
      repairs: { count: manager.attentionItems.repairs.count },
      pendingFollowUp: { count: manager.attentionItems.pendingFollowUp.count },
    };
  }, [manager.attentionItems]);

  // Loss breakdown
  const scaledLossBreakdown = useMemo(() => {
    if (!manager.lossBreakdown) return null;
    return {
      conversionLoss: manager.lossBreakdown.conversionLoss,
      avgCheckLoss: manager.lossBreakdown.avgCheckLoss,
      clientsLoss: manager.lossBreakdown.clientsLoss,
    };
  }, [manager.lossBreakdown]);

  const totalManagers = Object.keys(managersData).length;

  // Calculate orders count from clients (approximation)
  const ordersCount = clientsMetric ? {
    current: Math.round(clientsMetric.current * 1.1),
    plan: Math.round(clientsMetric.plan * 1.1)
  } : { current: 45, plan: 50 };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-main">
        {/* Header */}
        <div className="px-4 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate(-1)}
              className="h-9 w-9"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Avatar className="w-12 h-12">
              <AvatarImage src={manager.avatar} alt={manager.name} />
              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                {getInitials(manager.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-foreground">{manager.name}</h1>
              <p className="text-sm text-muted-foreground">{manager.role}</p>
            </div>
          </div>


          {/* Period Filter */}
          <FilterBar
            period={filterPeriod}
            onPeriodChange={setFilterPeriod}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
        </div>

        <div className="px-4 space-y-4 pb-24">
          {/* Performance Chart */}
          <ManagerPerformanceChart metrics={chartMetrics} />

          {/* Loss Breakdown */}
          {scaledLossBreakdown && (
            <ManagerLossBreakdown
              totalLoss={manager.lostRevenue}
              conversionLoss={scaledLossBreakdown.conversionLoss}
              avgCheckLoss={scaledLossBreakdown.avgCheckLoss}
              clientsLoss={scaledLossBreakdown.clientsLoss}
            />
          )}

          {/* Mission Block */}
          <ManagerMissionBlock
            diagnostics={{ 
              current: Math.round((clientsMetric?.current || 35) * 0.8), 
              plan: Math.round((clientsMetric?.plan || 40) * 0.85) 
            }}
            lcaInstallations={{ 
              current: Math.round((clientsMetric?.current || 35) * 0.4), 
              plan: Math.round((clientsMetric?.plan || 40) * 0.5) 
            }}
          />

          {/* Revenue Block */}
          {revenueMetric && clientsMetric && (
            <ManagerRevenueBlock
              revenueSz={{ current: revenueMetric.current, plan: revenueMetric.plan }}
              revenueZz={revenueZzMetric ? { current: revenueZzMetric.current, plan: revenueZzMetric.plan } : undefined}
              ordersCount={ordersCount}
              clientsCount={{ current: clientsMetric.current, plan: clientsMetric.plan }}
              attentionOrders={scaledAttentionItems?.unclosedOrders ? {
                ...scaledAttentionItems.unclosedOrders,
                readyForPickup: { 
                  count: 2, 
                  amount: 5400 
                },
                storageExpired: { 
                  count: Math.round(scaledAttentionItems.unclosedOrders.count * 0.65) || 1, 
                  amount: Math.round(scaledAttentionItems.unclosedOrders.amount * 0.65) 
                },
                deadlineSoon: { 
                  count: Math.round(scaledAttentionItems.unclosedOrders.count * 0.16), 
                  amount: Math.round(scaledAttentionItems.unclosedOrders.amount * 0.14) 
                },
                overdue: { 
                  count: Math.round(scaledAttentionItems.unclosedOrders.count * 0.19), 
                  amount: Math.round(scaledAttentionItems.unclosedOrders.amount * 0.18) 
                }
              } : undefined}
              onAttentionClick={() => navigate('/require-attention')}
            />
          )}

          {/* Average Price Block */}
          {avgGlassesMetric && manager.productMetrics && (
            <ManagerAvgPriceBlock
              avgGlassesPrice={{ current: avgGlassesMetric.current, plan: avgGlassesMetric.plan }}
              avgLensPrice={{ 
                current: manager.productMetrics.avgLensCheck.current, 
                plan: manager.productMetrics.avgLensCheck.plan 
              }}
              avgFramePrice={{ 
                current: manager.productMetrics.avgFrameCheck.current, 
                plan: manager.productMetrics.avgFrameCheck.plan 
              }}
              designShare={{ 
                current: manager.productMetrics.designLensShare?.current || 62, 
                plan: manager.productMetrics.designLensShare?.plan || 70 
              }}
              designLensPrice={{ 
                current: 11200, 
                plan: 12000 
              }}
              lensMatrix={manager.lensMatrix}
            />
          )}

          {/* Conversion Block */}
          {conversionMetric && (
            <ManagerConversionBlock
              conversion={{ current: conversionMetric.current, plan: conversionMetric.plan }}
              conversions={conversions}
            />
          )}

          {/* CSI Block */}
          {csiMetric && (
            <ManagerCSIBlock
              csi={{ current: csiMetric.current, plan: csiMetric.plan }}
              ranking={manager.ranking?.csi}
              totalManagers={totalManagers}
              reviews={{ good: 85, neutral: 10, bad: 5 }}
              negativeCount={manager.ranking?.csi === 1 ? 0 : 2}
              onClick={() => navigate('/reviews-detail')}
            />
          )}

          {/* Margin Block */}
          {marginMetric && (
            <ManagerMarginBlock
              margin={{ current: marginMetric.current, plan: marginMetric.plan }}
            />
          )}

          {/* Repairs Block */}
          <ManagerRepairsBlock
            avgRepairPrice={{ 
              current: 2800, 
              plan: 3200 
            }}
            repairsCount={scaledAttentionItems?.repairs.count || 5}
          />


          {/* Empty State */}
          {manager.metricsLevel1.length === 0 && manager.metricsLevel2.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Нет данных по этому менеджеру</p>
            </div>
          )}
        </div>
      </div>
      
      <BottomNavigation />
    </Layout>
  );
}

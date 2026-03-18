import { 
  AlertTriangle, 
  Clock, 
  Wrench, 
  RotateCcw,
  TrendingUp,
  Users,
  Percent,
  Star,
  PiggyBank
} from 'lucide-react';
import { KPIMetric, AttentionItem, MetricChartData, AttentionChipItem } from '@/components/dashboard';
import { KPIStatus } from '@/components/dashboard/KPISlider';
import { TopKPIMetric } from '@/components/dashboard/TopKPICard';

// ==================== TOP 5 KPI METRICS (NEW COMPACT VIEW) ====================

import { FullWidthKPIMetric } from '@/components/dashboard/KPIFullWidthCard';

// ==================== LOSS BREAKDOWN DATA ====================

export const revenueSzLossBreakdown = {
  totalLoss: 780000,
  employeeLoss: 420000,      // Сумма упущенной выгоды по всем сотрудникам
  conversionLoss: 215000,    // Расчёт от целевой конверсии +20%
  arpcLoss: 145000,          // Расчёт от целевого ARPC +10%
  worstEmployee: {
    name: 'Мария Козлова',
    loss: 180000,
    efficiency: 8500,        // Продажи в час (₽)
    bestEfficiency: 13600    // Лучший результат -20% = 17000 * 0.8
  }
};

// KPI color palette
export const kpiColors = {
  revenue_sz: '#3B82F6',    // blue
  revenue_zz: '#06B6D4',    // cyan
  clients_count: '#EF4444', // red
  conversion: '#22C55E',    // green
  csi: '#F59E0B',           // amber
  avg_glasses_price: '#8B5CF6', // violet - для "Ср. стоимость очков"
  margin: '#EC4899',        // pink - для "Маржинальность"
  avg_repair_price: '#F97316', // orange - для "Ср. стоимость ремонтов"
  mission_diagnostics: '#F59E0B', // amber - для "Миссия" (кол-во диагностик)
  my_revenue: '#3B82F6',
  my_clients: '#06B6D4',
  my_conversion: '#22C55E',
  my_avg_check: '#8B5CF6',  // violet
  my_csi: '#F59E0B',
};

export const leaderTopMetrics: FullWidthKPIMetric[] = [
  {
    id: 'revenue_sz',
    name: 'Выручка СЗ',
    current: 2800000,
    plan: 3500000,
    unit: '₽',
    trend: 'up',
    trendValue: 5,
    status: 'warning',
    color: kpiColors.revenue_sz,
    loss: 780000,
    forecast: 80,
    forecastValue: 80,
    forecastUnit: '%',
    forecastLabel: 'forecast'
  },
  {
    id: 'revenue_zz',
    name: 'Выручка ЗЗ',
    current: 2434000,
    plan: 3146000,
    unit: '₽',
    trend: 'up',
    trendValue: 3,
    status: 'warning',
    color: kpiColors.revenue_zz,
    reserve: 320000,
    forecast: 81,
    forecastValue: 77,
    forecastUnit: '%',
    forecastLabel: 'forecast'
  },
  {
    id: 'clients_count',
    name: 'Кол-во ФЛ',
    current: 156,
    plan: 200,
    unit: 'шт',
    trend: 'stable',
    status: 'warning',
    color: kpiColors.clients_count,
    loss: 88000,
    forecast: 78,
    forecastValue: 78,
    forecastUnit: '%',
    forecastLabel: 'forecast'
  },
  {
    id: 'conversion',
    name: 'Конверсия',
    current: 45,
    plan: 55,
    unit: '%',
    trend: 'down',
    trendValue: 3,
    status: 'warning',
    color: kpiColors.conversion,
    loss: 215000,
    forecast: 82,
    forecastValue: -18,
    forecastUnit: '%',
    forecastLabel: 'deviation'
  },
  {
    id: 'csi',
    name: 'CSI',
    current: 100,
    plan: 95,
    unit: '%',
    trend: 'up',
    trendValue: 1,
    status: 'good',
    color: kpiColors.csi,
    forecast: 97,
    forecastValue: 5,
    forecastUnit: '%',
    forecastLabel: 'deviation'
  },
  {
    id: 'avg_glasses_price',
    name: 'Ср. стоимость очков',
    current: 18500,
    plan: 20000,
    unit: '₽',
    trend: 'up',
    trendValue: 2,
    status: 'warning',
    color: kpiColors.avg_glasses_price,
    loss: 122000,
    forecast: 93,
    forecastValue: -8,
    forecastUnit: '%',
    forecastLabel: 'deviation'
  },
  {
    id: 'margin',
    name: 'Маржа',
    current: 1120000,
    plan: 1050000,
    unit: '₽',
    trend: 'stable',
    status: 'good',
    color: kpiColors.margin,
    forecast: 107,
    forecastValue: 7,
    forecastUnit: '%',
    forecastLabel: 'deviation'
  },
  {
    id: 'avg_repair_price',
    name: 'Ср. стоимость ремонтов',
    current: 2800,
    plan: 3200,
    unit: '₽',
    trend: 'up',
    trendValue: 4,
    status: 'warning',
    color: kpiColors.avg_repair_price,
    loss: 32000,
    forecast: 88,
    forecastValue: -12,
    forecastUnit: '%',
    forecastLabel: 'deviation'
  }
];

// Mission metric - special diagnostic KPI
export const missionMetric: FullWidthKPIMetric = {
  id: 'mission_diagnostics',
  name: 'Кол-во диагностик',
  current: 156,
  plan: 180,
  unit: 'шт',
  trend: 'up',
  trendValue: 8,
  status: 'warning',
  color: kpiColors.mission_diagnostics,
  loss: 24,
  forecast: 87,
  forecastValue: -13,
  forecastUnit: '%',
  forecastLabel: 'deviation',
  isMission: true
};

// Period-specific data for filters
export const leaderMetricsByPeriod: Record<string, FullWidthKPIMetric[]> = {
  '3days': [
    { ...leaderTopMetrics[0], current: 280000, plan: 350000, forecast: 78, reserve: undefined },
    { ...leaderTopMetrics[1], current: 243400, plan: 314600, forecast: 75 },
    { ...leaderTopMetrics[2], current: 15, plan: 20, forecast: 72 },
    { ...leaderTopMetrics[3], current: 42, plan: 55, forecast: 76 },
    { ...leaderTopMetrics[4], current: 91, plan: 95, forecast: 96 },
    { ...leaderTopMetrics[5], current: 17800, plan: 20000, forecast: 89, forecastValue: -11 },
    { ...leaderTopMetrics[6], current: 40, plan: 42, forecast: 95, forecastValue: -5 },
    { ...leaderTopMetrics[7], current: 2600, plan: 3200, forecast: 81, forecastValue: -19 },
  ],
  'month': leaderTopMetrics,
  '30clients': [
    { ...leaderTopMetrics[0], current: 850000, plan: 1000000, forecast: 85, reserve: undefined },
    { ...leaderTopMetrics[1], current: 780000, plan: 950000, forecast: 82 },
    { ...leaderTopMetrics[2], current: 30, plan: 30, forecast: 100 },
    { ...leaderTopMetrics[3], current: 48, plan: 55, forecast: 87 },
    { ...leaderTopMetrics[4], current: 93, plan: 95, forecast: 98 },
    { ...leaderTopMetrics[5], current: 21000, plan: 20000, forecast: 105, forecastValue: 5 },
    { ...leaderTopMetrics[6], current: 45, plan: 42, forecast: 107, forecastValue: 7 },
    { ...leaderTopMetrics[7], current: 3100, plan: 3200, forecast: 97, forecastValue: -3 },
  ],
};

export const employeeMetricsByPeriod: Record<string, FullWidthKPIMetric[]> = {
  '3days': [
    { id: 'my_revenue', name: 'Моя выручка', current: 48500, plan: 60000, unit: '₽', trend: 'up', trendValue: 6, status: 'warning', color: kpiColors.my_revenue, forecast: 78 },
    { id: 'my_clients', name: 'Мои клиенты', current: 3, plan: 4, unit: 'шт', trend: 'up', trendValue: 2, status: 'warning', color: kpiColors.my_clients, forecast: 75 },
    { id: 'my_conversion', name: 'Конверсия', current: 50, plan: 55, unit: '%', trend: 'stable', status: 'warning', color: kpiColors.my_conversion, forecast: 91 },
    { id: 'my_avg_check', name: 'Ср. чек', current: 16200, plan: 18000, unit: '₽', trend: 'down', trendValue: 3, status: 'warning', color: kpiColors.my_avg_check, forecast: 90 },
    { id: 'my_csi', name: 'Мой CSI', current: 92, plan: 95, unit: '%', trend: 'stable', status: 'warning', color: kpiColors.my_csi, forecast: 97 },
  ],
  'month': [
    { id: 'my_revenue', name: 'Моя выручка', current: 485000, plan: 600000, unit: '₽', trend: 'up', trendValue: 8, status: 'warning', color: kpiColors.my_revenue, reserve: 45000, forecast: 85 },
    { id: 'my_clients', name: 'Мои клиенты', current: 28, plan: 35, unit: 'шт', trend: 'up', trendValue: 4, status: 'warning', color: kpiColors.my_clients, forecast: 82 },
    { id: 'my_conversion', name: 'Конверсия', current: 52, plan: 55, unit: '%', trend: 'up', trendValue: 2, status: 'good', color: kpiColors.my_conversion, forecast: 96 },
    { id: 'my_avg_check', name: 'Ср. чек', current: 17300, plan: 18000, unit: '₽', trend: 'stable', status: 'good', color: kpiColors.my_avg_check, forecast: 98 },
    { id: 'my_csi', name: 'Мой CSI', current: 94, plan: 95, unit: '%', trend: 'up', trendValue: 1, status: 'good', color: kpiColors.my_csi, forecast: 99 },
  ],
  '30clients': [
    { id: 'my_revenue', name: 'Моя выручка', current: 520000, plan: 540000, unit: '₽', trend: 'up', trendValue: 10, status: 'good', color: kpiColors.my_revenue, forecast: 96 },
    { id: 'my_clients', name: 'Мои клиенты', current: 30, plan: 30, unit: 'шт', trend: 'up', trendValue: 5, status: 'good', color: kpiColors.my_clients, forecast: 100 },
    { id: 'my_conversion', name: 'Конверсия', current: 54, plan: 55, unit: '%', trend: 'up', trendValue: 3, status: 'good', color: kpiColors.my_conversion, forecast: 98 },
    { id: 'my_avg_check', name: 'Ср. чек', current: 17350, plan: 18000, unit: '₽', trend: 'up', trendValue: 2, status: 'good', color: kpiColors.my_avg_check, forecast: 96 },
    { id: 'my_csi', name: 'Мой CSI', current: 95, plan: 95, unit: '%', trend: 'up', trendValue: 2, status: 'good', color: kpiColors.my_csi, forecast: 100 },
  ],
};

export const employeeTopMetrics: FullWidthKPIMetric[] = [
  {
    id: 'my_revenue',
    name: 'Моя выручка',
    current: 485000,
    plan: 600000,
    unit: '₽',
    trend: 'up',
    trendValue: 8,
    status: 'warning',
    color: kpiColors.my_revenue,
    reserve: 45000,
    forecast: 85
  },
  {
    id: 'my_clients',
    name: 'Мои клиенты',
    current: 28,
    plan: 35,
    unit: 'шт',
    trend: 'up',
    trendValue: 4,
    status: 'warning',
    color: kpiColors.my_clients,
    forecast: 82
  },
  {
    id: 'my_conversion',
    name: 'Конверсия',
    current: 52,
    plan: 55,
    unit: '%',
    trend: 'up',
    trendValue: 2,
    status: 'good',
    color: kpiColors.my_conversion,
    forecast: 96
  },
  {
    id: 'my_avg_check',
    name: 'Ср. чек',
    current: 17300,
    plan: 18000,
    unit: '₽',
    trend: 'stable',
    status: 'good',
    color: kpiColors.my_avg_check,
    forecast: 98
  },
  {
    id: 'my_csi',
    name: 'Мой CSI',
    current: 94,
    plan: 95,
    unit: '%',
    trend: 'up',
    trendValue: 1,
    status: 'good',
    color: kpiColors.my_csi,
    forecast: 99
  }
];

// ==================== ATTENTION CHIPS (NEW HORIZONTAL SCROLL) ====================

export const leaderAttentionChips: AttentionChipItem[] = [
  {
    id: 'unclosed_orders',
    label: 'Незакрытые',
    value: 53,
    icon: AlertTriangle,
    color: 'destructive'
  },
  {
    id: 'not_on_time',
    label: 'Не в срок',
    value: 12,
    icon: Clock,
    color: 'warning'
  },
  {
    id: 'repairs',
    label: 'Ремонты',
    value: 7,
    icon: Wrench,
    color: 'warning'
  },
  {
    id: 'returns',
    label: 'Возвраты',
    value: 4,
    icon: RotateCcw,
    color: 'primary'
  }
];

// Icon mapping for metrics
export const metricIcons: Record<string, React.ElementType> = {
  revenue_sz: TrendingUp,
  revenue_zz: PiggyBank,
  clients_count: Users,
  conversion: Percent,
  csi: Star,
};

// ==================== LEADER MODE DATA ====================

// Leader KPI metrics (Level 1)
export const leaderMetricsLevel1: KPIMetric[] = [
  {
    id: 'revenue_sz',
    name: 'Выручка Созданные заказы',
    shortName: 'Выручка СЗ',
    level: 1,
    current: 2800000,
    plan: 3500000,
    reserve: 450000,
    forecast: 80,
    unit: '₽',
    trend: 'up',
    trendValue: 5,
    status: 'warning'
  },
  {
    id: 'revenue_zz',
    name: 'Выручка Закрытые заказы',
    shortName: 'Выручка ЗЗ',
    level: 1,
    current: 2434000,
    plan: 3146000,
    forecast: 81,
    unit: '₽',
    trend: 'up',
    trendValue: 3,
    status: 'warning'
  },
  {
    id: 'clients_count',
    name: 'Количество ФЛ созданные заказы',
    shortName: 'Кол-во ФЛ СЗ',
    level: 1,
    current: 156,
    plan: 200,
    forecast: 78,
    unit: 'шт',
    trend: 'stable',
    status: 'warning'
  },
  {
    id: 'avg_glasses_price',
    name: 'Средняя стоимость очков',
    shortName: 'Ср. стоимость очков',
    level: 1,
    current: 18500,
    plan: 20000,
    forecast: 93,
    unit: '₽',
    trend: 'up',
    trendValue: 2,
    status: 'good'
  },
  {
    id: 'conversion',
    name: 'Общая конверсия в продажу',
    shortName: 'Конверсия',
    level: 1,
    current: 45,
    plan: 55,
    forecast: 82,
    unit: '%',
    trend: 'down',
    trendValue: 3,
    status: 'warning'
  },
  {
    id: 'csi',
    name: 'CSI качество сервиса',
    shortName: 'CSI',
    level: 1,
    current: 92,
    plan: 95,
    forecast: 97,
    unit: '%',
    trend: 'up',
    trendValue: 1,
    status: 'good'
  },
  {
    id: 'margin',
    name: 'Маржинальность',
    shortName: 'Маржинальность',
    level: 1,
    current: 38,
    plan: 42,
    forecast: 90,
    unit: '%',
    trend: 'stable',
    status: 'good'
  },
  {
    id: 'avg_repair_price',
    name: 'Ср. стоимость ремонтов',
    shortName: 'Ср. ремонта',
    level: 1,
    current: 2800,
    plan: 3200,
    forecast: 88,
    unit: '₽',
    trend: 'up',
    trendValue: 4,
    status: 'warning'
  },
  {
    id: 'mission_diagnostics',
    name: 'Миссия (диагностики)',
    shortName: 'Миссия',
    level: 1,
    current: 78,
    plan: 95,
    forecast: 82,
    unit: '%',
    trend: 'stable',
    status: 'warning'
  }
];

// Leader metrics Level 2 (товарные)
export const leaderMetricsLevel2: KPIMetric[] = [
  {
    id: 'lenses_count',
    name: 'Количество линз',
    shortName: 'Кол-во линз',
    level: 2,
    current: 245,
    plan: 300,
    forecast: 82,
    unit: 'шт',
    trend: 'up',
    trendValue: 4,
    status: 'warning'
  },
  {
    id: 'frames_count',
    name: 'Количество оправ',
    shortName: 'Кол-во оправ',
    level: 2,
    current: 189,
    plan: 220,
    forecast: 86,
    unit: 'шт',
    trend: 'up',
    trendValue: 2,
    status: 'warning'
  },
  {
    id: 'avg_lenses_check',
    name: 'Средний чек линз',
    shortName: 'Ср. чек линз',
    level: 2,
    current: 8500,
    plan: 9000,
    forecast: 94,
    unit: '₽',
    trend: 'stable',
    status: 'good'
  },
  {
    id: 'avg_frames_check',
    name: 'Средний чек оправ',
    shortName: 'Ср. чек оправ',
    level: 2,
    current: 12000,
    plan: 13500,
    forecast: 89,
    unit: '₽',
    trend: 'up',
    trendValue: 3,
    status: 'warning'
  },
  {
    id: 'conv_repair_sale',
    name: 'Конверсия ремонт → продажа',
    shortName: 'Ремонт → продажа',
    level: 2,
    current: 25,
    plan: 35,
    forecast: 71,
    unit: '%',
    trend: 'down',
    trendValue: 5,
    status: 'critical'
  },
  {
    id: 'conv_repair_check',
    name: 'Конверсия ремонт → проверка',
    shortName: 'Ремонт → проверка',
    level: 2,
    current: 60,
    plan: 70,
    forecast: 86,
    unit: '%',
    trend: 'up',
    trendValue: 2,
    status: 'warning'
  },
  {
    id: 'conv_check_sale',
    name: 'Конверсия проверка → продажа',
    shortName: 'Проверка → продажа',
    level: 2,
    current: 42,
    plan: 50,
    forecast: 84,
    unit: '%',
    trend: 'stable',
    status: 'warning'
  }
];

// Leader attention items
export const leaderAttentionItems: AttentionItem[] = [
  {
    id: 'unclosed_orders',
    title: 'Незакрытых заказов',
    value: 53,
    subValue: '1 250 500 ₽',
    icon: AlertTriangle,
    variant: 'danger'
  },
  {
    id: 'not_on_time',
    title: 'Неготовых в срок',
    value: '16%',
    subValue: '12 заказов',
    icon: Clock,
    trend: 'down',
    trendValue: '2%',
    variant: 'warning'
  },
  {
    id: 'repairs',
    title: 'Ремонты/Гарантии',
    value: 7,
    subValue: '3 просрочено',
    icon: Wrench,
    variant: 'warning'
  },
  {
    id: 'returns',
    title: 'Возвраты',
    value: 4,
    subValue: '89 500 ₽',
    icon: RotateCcw,
    variant: 'info'
  }
];

// ==================== REVENUE SZ DETAIL DATA ====================

interface ManagerBreakdown {
  id: string;
  name: string;
  avatar?: string;
  value: number;
  plan: number;
}

interface CategoryBreakdown {
  name: string;
  value: number;
  plan: number;
  color: string;
}

export interface ExpandableOrderStat {
  id: string;
  name: string;
  value: number;
  plan: number;
  unit: string;
  managers?: ManagerBreakdown[];
  breakdown?: CategoryBreakdown[];
}

// Managers data for expandable stats
const managersForStats: ManagerBreakdown[] = [
  { id: 'elena_novikova', name: 'Елена Новикова', value: 0, plan: 0 },
  { id: 'anna_petrova', name: 'Анна Петрова', value: 0, plan: 0 },
  { id: 'dmitry_volkov', name: 'Дмитрий Волков', value: 0, plan: 0 },
  { id: 'ivan_sidorov', name: 'Иван Сидоров', value: 0, plan: 0 },
  { id: 'maria_kozlova', name: 'Мария Козлова', value: 0, plan: 0 },
];

// Main order statistics with expandable details
export const revenueSzMainStats: ExpandableOrderStat[] = [
  { 
    id: 'orders_count', 
    name: 'Кол-во заказов', 
    value: 156, 
    plan: 200, 
    unit: 'шт',
    managers: [
      { id: 'elena_novikova', name: 'Елена Новикова', value: 42, plan: 40 },
      { id: 'anna_petrova', name: 'Анна Петрова', value: 35, plan: 40 },
      { id: 'dmitry_volkov', name: 'Дмитрий Волков', value: 31, plan: 40 },
      { id: 'ivan_sidorov', name: 'Иван Сидоров', value: 28, plan: 40 },
      { id: 'maria_kozlova', name: 'Мария Козлова', value: 20, plan: 40 },
    ]
  },
  { 
    id: 'avg_price', 
    name: 'Средняя стоимость', 
    value: 17950, 
    plan: 20000, 
    unit: '₽',
    managers: [
      { id: 'elena_novikova', name: 'Елена Новикова', value: 21500, plan: 20000 },
      { id: 'anna_petrova', name: 'Анна Петрова', value: 19200, plan: 20000 },
      { id: 'dmitry_volkov', name: 'Дмитрий Волков', value: 17800, plan: 20000 },
      { id: 'ivan_sidorov', name: 'Иван Сидоров', value: 16500, plan: 20000 },
      { id: 'maria_kozlova', name: 'Мария Козлова', value: 14750, plan: 20000 },
    ]
  },
  { 
    id: 'checks_count', 
    name: 'Кол-во ФЛ', 
    value: 143, 
    plan: 180, 
    unit: 'шт',
    managers: [
      { id: 'elena_novikova', name: 'Елена Новикова', value: 38, plan: 36 },
      { id: 'anna_petrova', name: 'Анна Петрова', value: 32, plan: 36 },
      { id: 'dmitry_volkov', name: 'Дмитрий Волков', value: 28, plan: 36 },
      { id: 'ivan_sidorov', name: 'Иван Сидоров', value: 25, plan: 36 },
      { id: 'maria_kozlova', name: 'Мария Козлова', value: 20, plan: 36 },
    ]
  },
];

// Stats by period for filtering - with eye checks
export const revenueSzStatsByPeriod: Record<string, ExpandableOrderStat[]> = {
  '30clients': [
    ...revenueSzMainStats,
    { 
      id: 'checks_vision', 
      name: 'Проверки зрения', 
      value: 120, 
      plan: 150, 
      unit: 'шт',
      managers: [
        { id: 'elena_novikova', name: 'Елена Новикова', value: 32, plan: 30 },
        { id: 'anna_petrova', name: 'Анна Петрова', value: 28, plan: 30 },
        { id: 'dmitry_volkov', name: 'Дмитрий Волков', value: 24, plan: 30 },
        { id: 'ivan_sidorov', name: 'Иван Сидоров', value: 20, plan: 30 },
        { id: 'maria_kozlova', name: 'Мария Козлова', value: 16, plan: 30 },
      ]
    },
  ],
  '3days': [
    { 
      id: 'orders_count', 
      name: 'Кол-во заказов', 
      value: 28, 
      plan: 35, 
      unit: 'шт',
      managers: [
        { id: 'elena_novikova', name: 'Елена Новикова', value: 8, plan: 7 },
        { id: 'anna_petrova', name: 'Анна Петрова', value: 6, plan: 7 },
        { id: 'dmitry_volkov', name: 'Дмитрий Волков', value: 5, plan: 7 },
        { id: 'ivan_sidorov', name: 'Иван Сидоров', value: 5, plan: 7 },
        { id: 'maria_kozlova', name: 'Мария Козлова', value: 4, plan: 7 },
      ]
    },
    { 
      id: 'avg_price', 
      name: 'Средняя стоимость', 
      value: 19200, 
      plan: 20000, 
      unit: '₽',
      managers: [
        { id: 'elena_novikova', name: 'Елена Новикова', value: 22000, plan: 20000 },
        { id: 'anna_petrova', name: 'Анна Петрова', value: 20500, plan: 20000 },
        { id: 'dmitry_volkov', name: 'Дмитрий Волков', value: 18200, plan: 20000 },
        { id: 'ivan_sidorov', name: 'Иван Сидоров', value: 17500, plan: 20000 },
        { id: 'maria_kozlova', name: 'Мария Козлова', value: 17800, plan: 20000 },
      ]
    },
    { 
      id: 'checks_count', 
      name: 'Кол-во ФЛ', 
      value: 24, 
      plan: 30, 
      unit: 'шт',
      managers: [
        { id: 'elena_novikova', name: 'Елена Новикова', value: 7, plan: 6 },
        { id: 'anna_petrova', name: 'Анна Петрова', value: 5, plan: 6 },
        { id: 'dmitry_volkov', name: 'Дмитрий Волков', value: 5, plan: 6 },
        { id: 'ivan_sidorov', name: 'Иван Сидоров', value: 4, plan: 6 },
        { id: 'maria_kozlova', name: 'Мария Козлова', value: 3, plan: 6 },
      ]
    },
    { 
      id: 'checks_vision', 
      name: 'Проверки зрения', 
      value: 18, 
      plan: 25, 
      unit: 'шт',
      managers: [
        { id: 'elena_novikova', name: 'Елена Новикова', value: 5, plan: 5 },
        { id: 'anna_petrova', name: 'Анна Петрова', value: 4, plan: 5 },
        { id: 'dmitry_volkov', name: 'Дмитрий Волков', value: 4, plan: 5 },
        { id: 'ivan_sidorov', name: 'Иван Сидоров', value: 3, plan: 5 },
        { id: 'maria_kozlova', name: 'Мария Козлова', value: 2, plan: 5 },
      ]
    },
  ],
  'month': [
    { 
      id: 'orders_count', 
      name: 'Кол-во заказов', 
      value: 487, 
      plan: 600, 
      unit: 'шт',
      managers: [
        { id: 'elena_novikova', name: 'Елена Новикова', value: 125, plan: 120 },
        { id: 'anna_petrova', name: 'Анна Петрова', value: 108, plan: 120 },
        { id: 'dmitry_volkov', name: 'Дмитрий Волков', value: 98, plan: 120 },
        { id: 'ivan_sidorov', name: 'Иван Сидоров', value: 86, plan: 120 },
        { id: 'maria_kozlova', name: 'Мария Козлова', value: 70, plan: 120 },
      ]
    },
    { 
      id: 'avg_price', 
      name: 'Средняя стоимость', 
      value: 18340, 
      plan: 20000, 
      unit: '₽',
      managers: [
        { id: 'elena_novikova', name: 'Елена Новикова', value: 21800, plan: 20000 },
        { id: 'anna_petrova', name: 'Анна Петрова', value: 19500, plan: 20000 },
        { id: 'dmitry_volkov', name: 'Дмитрий Волков', value: 18100, plan: 20000 },
        { id: 'ivan_sidorov', name: 'Иван Сидоров', value: 17200, plan: 20000 },
        { id: 'maria_kozlova', name: 'Мария Козлова', value: 15100, plan: 20000 },
      ]
    },
    { 
      id: 'checks_count', 
      name: 'Кол-во ФЛ', 
      value: 456, 
      plan: 550, 
      unit: 'шт',
      managers: [
        { id: 'elena_novikova', name: 'Елена Новикова', value: 118, plan: 110 },
        { id: 'anna_petrova', name: 'Анна Петрова', value: 102, plan: 110 },
        { id: 'dmitry_volkov', name: 'Дмитрий Волков', value: 92, plan: 110 },
        { id: 'ivan_sidorov', name: 'Иван Сидоров', value: 82, plan: 110 },
        { id: 'maria_kozlova', name: 'Мария Козлова', value: 62, plan: 110 },
      ]
    },
    { 
      id: 'checks_vision', 
      name: 'Проверки зрения', 
      value: 347, 
      plan: 400, 
      unit: 'шт',
      managers: [
        { id: 'elena_novikova', name: 'Елена Новикова', value: 92, plan: 80 },
        { id: 'anna_petrova', name: 'Анна Петрова', value: 78, plan: 80 },
        { id: 'dmitry_volkov', name: 'Дмитрий Волков', value: 68, plan: 80 },
        { id: 'ivan_sidorov', name: 'Иван Сидоров', value: 58, plan: 80 },
        { id: 'maria_kozlova', name: 'Мария Козлова', value: 51, plan: 80 },
      ]
    },
  ],
};

// Product categories - суммы синхронизированы с Выручкой СЗ (2 800 000 / 3 500 000)
export const revenueSzCategories = [
  { 
    id: 'set', 
    name: 'Комплект', 
    quantity: 62, 
    quantityPlan: 78, 
    amount: 1120000, 
    amountPlan: 1400000,
    color: '#8B5CF6',
    description: 'Полный набор: оправа + линзы'
  },
  { 
    id: 'frames', 
    name: 'Оправа', 
    quantity: 112, 
    quantityPlan: 140, 
    amount: 896000, 
    amountPlan: 1120000,
    color: '#F59E0B',
    description: 'Продажа оправ без линз'
  },
  { 
    id: 'lenses', 
    name: 'Линзы', 
    quantity: 157, 
    quantityPlan: 196, 
    amount: 672000, 
    amountPlan: 840000,
    color: '#3B82F6',
    description: 'Очковые линзы всех типов'
  },
  { 
    id: 'repairs', 
    name: 'Ремонты', 
    quantity: 28, 
    quantityPlan: 35, 
    amount: 112000, 
    amountPlan: 140000,
    color: '#EF4444',
    description: 'Ремонт оправ и замена комплектующих'
  },
];

// Conversion metrics (Green theme) - simple version for backward compatibility
export const revenueSzConversions = [
  { id: 'inspection_sale', name: 'Диагностика → Продажа', value: 45, target: 55, count: 347, countLabel: 'диагностик' },
  { id: 'repair_sale', name: 'Ремонт → Продажа', value: 28, target: 35, count: 156, countLabel: 'ремонтов' },
];

// Detailed conversion data for accordion view
export interface ConversionDetailData {
  id: string;
  name: string;
  value: number;
  target: number;
  inputLabel: string;
  inputFact: number;
  inputPlan: number;
  outputLabel: string;
  outputFact: number;
  outputPlan: number;
  lostCount: number;
  lostAmount: number;
}

export const revenueSzConversionsDetailed: ConversionDetailData[] = [
  {
    id: 'inspection_sale',
    name: 'Диагностика → Продажа',
    value: 45,
    target: 55,
    inputLabel: 'Диагностики',
    inputFact: 347,
    inputPlan: 400,
    outputLabel: 'Продажи',
    outputFact: 156,
    outputPlan: 220,
    lostCount: 64,
    lostAmount: 1280000
  },
  {
    id: 'repair_sale',
    name: 'Ремонт → Продажа',
    value: 28,
    target: 35,
    inputLabel: 'Ремонты',
    inputFact: 156,
    inputPlan: 180,
    outputLabel: 'Продажи',
    outputFact: 44,
    outputPlan: 63,
    lostCount: 19,
    lostAmount: 380000
  },
];

// ==================== DYNAMIC PLAN GENERATOR ====================

// Seeded random for reproducible results
const seededRandom = (seed: number): number => {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

// Generate dynamic daily plan with range 95K-170K (or scaled)
const generateDailyPlanValue = (
  dayOfMonth: number,
  dayOfWeek: number,
  options: {
    minPlan?: number;
    maxPlan?: number;
    weekendFactor?: number;
  } = {}
): number => {
  const {
    minPlan = 95000,
    maxPlan = 170000,
    weekendFactor = 0.6
  } = options;
  
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const midPlan = (minPlan + maxPlan) / 2;
  const range = maxPlan - minPlan;
  
  // Sinusoidal trend across month for realistic wave
  const trendValue = Math.sin((dayOfMonth / 31) * Math.PI * 2.5) * 0.3;
  
  // Pseudo-random noise (deterministic for same days)
  const noise = (seededRandom(dayOfMonth * 7 + dayOfWeek) - 0.5) * 0.4;
  
  // Calculate final plan
  let plan = midPlan + range * (trendValue + noise) / 2;
  
  // Reduce plan for weekends
  if (isWeekend) {
    plan = plan * weekendFactor;
  }
  
  return Math.round(Math.max(minPlan * 0.5, Math.min(maxPlan * 1.1, plan)));
};

// Daily chart data for revenue - each bar = 1 day with DYNAMIC PLAN (95K-170K range)
// Generates data for January 2026 (month period)
export const revenueSzDailyChartData = (() => {
  const data: { date: string; value: number; plan: number }[] = [];
  
  // Fact values (existing data pattern)
  const factValues = [
    125000, 98000, 142000, 87000, 135000, 45000, 52000, 128000, 95000, 155000,
    118000, 89000, 48000, 55000, 138000, 122000, 145000, 92000, 108000, 42000,
    58000, 132000, 115000, 148000, 125000, 98000, 52000, 48000, 135000, 128000, 140000
  ];
  
  for (let i = 1; i <= 31; i++) {
    const date = new Date(2026, 0, i); // January 2026
    const dayOfWeek = date.getDay();
    
    // Generate dynamic plan for this day (95K-170K range)
    const plan = generateDailyPlanValue(i, dayOfWeek, {
      minPlan: 95000,
      maxPlan: 170000,
      weekendFactor: 0.6
    });
    
    data.push({
      date: String(i),
      value: factValues[i - 1] || Math.round(plan * (0.7 + seededRandom(i * 19) * 0.6)),
      plan
    });
  }
  
  return data;
})();

// Legacy cumulative chart data for backward compatibility
export const revenueSzChartData = revenueSzDailyChartData;

// Attention alerts (Red/Orange theme)
export const revenueSzAttention = [
  { id: 'overdue', name: 'Просроченные', count: 8, variant: 'critical' as const },
  { id: 'unpaid', name: 'Без оплаты', count: 12, variant: 'warning' as const },
  { id: 'review', name: 'На проверке', count: 5, variant: 'info' as const },
];

// Keep old structure for backward compatibility
export const revenueSzClubMetrics = [
  { id: 'conversion', name: 'Конверсия', current: 45, plan: 55, unit: '%', status: 'warning' as const },
  { id: 'avg_check', name: 'Ср. чек', current: 18500, plan: 20000, unit: '₽', status: 'warning' as const },
  { id: 'upt', name: 'UPT', current: 2.1, plan: 2.5, unit: '', status: 'warning' as const },
  { id: 'checks_count', name: 'Кол-во ФЛ', current: 156, plan: 200, unit: 'шт', status: 'warning' as const },
];

export const revenueSzProductGroups = {
  lenses: { quantity: 245, quantityPlan: 300, amount: 2082500 },
  frames: { quantity: 189, quantityPlan: 220, amount: 2268000 },
};

// Manager Card Data for simplified view with 4 key metrics
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

// Manager data aligned with total metrics:
// Total Fact: 2,800,000₽ | Total Plan: 3,500,000₽ | Total Losses: 780,000₽
export const revenueSzManagersDetail: ManagerCardData[] = [
  {
    id: 'elena_novikova',
    name: 'Елена Новикова',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face',
    planPercent: 111,
    createdOrders: 780000,
    createdOrdersPlan: 700000,
    closedOrders: 780000,
    closedOrdersPlan: 700000,
    forecast: 111,
    losses: 0,
  },
  {
    id: 'anna_petrova',
    name: 'Анна Петрова',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
    planPercent: 93,
    createdOrders: 650000,
    createdOrdersPlan: 700000,
    closedOrders: 650000,
    closedOrdersPlan: 700000,
    forecast: 93,
    losses: 50000,
  },
  {
    id: 'dmitry_volkov',
    name: 'Дмитрий Волков',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face',
    planPercent: 83,
    createdOrders: 580000,
    createdOrdersPlan: 700000,
    closedOrders: 580000,
    closedOrdersPlan: 700000,
    forecast: 83,
    losses: 120000,
  },
  {
    id: 'ivan_sidorov',
    name: 'Иван Сидоров',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
    planPercent: 70,
    createdOrders: 490000,
    createdOrdersPlan: 700000,
    closedOrders: 490000,
    closedOrdersPlan: 700000,
    forecast: 70,
    losses: 210000,
  },
  {
    id: 'maria_kozlova',
    name: 'Мария Козлова',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
    planPercent: 43,
    createdOrders: 300000,
    createdOrdersPlan: 700000,
    closedOrders: 300000,
    closedOrdersPlan: 700000,
    forecast: 43,
    losses: 400000,
  },
];

// Leader chart data
export const leaderChartData: MetricChartData[] = [
  {
    id: 'revenue_sz',
    name: 'Выручка СЗ',
    unit: '₽',
    plan: 3500000,
    current: 2800000,
    forecast: 80,
    status: 'warning',
    data: [
      { date: '1', value: 85000, plan: 116667 },
      { date: '3', value: 310000, plan: 350000 },
      { date: '5', value: 480000, plan: 583333 },
      { date: '7', value: 720000, plan: 816667 },
      { date: '10', value: 1250000, plan: 1166667 },
      { date: '12', value: 1380000, plan: 1400000 },
      { date: '15', value: 1720000, plan: 1750000 },
      { date: '17', value: 2050000, plan: 1983333 },
      { date: '20', value: 2180000, plan: 2333333 },
      { date: '22', value: 2350000, plan: 2566667 },
      { date: '25', value: 2480000, plan: 2916667 },
      { date: '27', value: 2650000, plan: 3150000 },
      { date: '30', value: 2800000, plan: 3500000 },
    ]
  },
  {
    id: 'conversion',
    name: 'Конверсия',
    unit: '%',
    plan: 55,
    current: 45,
    forecast: 82,
    status: 'warning',
    data: [
      { date: '1', value: 48 },
      { date: '5', value: 52 },
      { date: '10', value: 47 },
      { date: '15', value: 44 },
      { date: '20', value: 43 },
      { date: '25', value: 46 },
      { date: '30', value: 45 },
    ]
  },
  {
    id: 'csi',
    name: 'CSI',
    unit: '%',
    plan: 95,
    current: 92,
    forecast: 97,
    status: 'good',
    data: [
      { date: '1', value: 90 },
      { date: '5', value: 91 },
      { date: '10', value: 93 },
      { date: '15', value: 91 },
      { date: '20', value: 92 },
      { date: '25', value: 93 },
      { date: '30', value: 92 },
    ]
  },
];

// ==================== EMPLOYEE MODE DATA ====================

// Employee personal KPI metrics (Level 1)
export const employeeMetricsLevel1: KPIMetric[] = [
  {
    id: 'revenue_sz',
    name: 'Моя выручка СЗ',
    shortName: 'Выручка СЗ',
    level: 1,
    current: 580000,
    plan: 700000,
    forecast: 83,
    unit: '₽',
    trend: 'up',
    trendValue: 7,
    status: 'warning'
  },
  {
    id: 'revenue_zz',
    name: 'Моя выручка ЗЗ',
    shortName: 'Выручка ЗЗ',
    level: 1,
    current: 520000,
    plan: 630000,
    forecast: 82,
    unit: '₽',
    trend: 'up',
    trendValue: 4,
    status: 'warning'
  },
  {
    id: 'clients_count',
    name: 'Мои клиенты ФЛ',
    shortName: 'Клиенты ФЛ',
    level: 1,
    current: 32,
    plan: 40,
    forecast: 80,
    unit: 'шт',
    trend: 'up',
    trendValue: 2,
    status: 'warning'
  },
  {
    id: 'avg_glasses_price',
    name: 'Мой средний чек',
    shortName: 'Средний чек',
    level: 1,
    current: 18125,
    plan: 17500,
    forecast: 104,
    unit: '₽',
    trend: 'up',
    trendValue: 6,
    status: 'good'
  },
  {
    id: 'conversion',
    name: 'Моя конверсия',
    shortName: 'Конверсия',
    level: 1,
    current: 52,
    plan: 55,
    forecast: 95,
    unit: '%',
    trend: 'up',
    trendValue: 5,
    status: 'good'
  },
  {
    id: 'csi',
    name: 'Мой CSI',
    shortName: 'CSI',
    level: 1,
    current: 94,
    plan: 95,
    forecast: 99,
    unit: '%',
    trend: 'up',
    trendValue: 2,
    status: 'good'
  }
];

// Employee metrics Level 2
export const employeeMetricsLevel2: KPIMetric[] = [
  {
    id: 'lenses_count',
    name: 'Мои продажи линз',
    shortName: 'Линзы',
    level: 2,
    current: 48,
    plan: 60,
    forecast: 80,
    unit: 'шт',
    trend: 'up',
    trendValue: 3,
    status: 'warning'
  },
  {
    id: 'frames_count',
    name: 'Мои продажи оправ',
    shortName: 'Оправы',
    level: 2,
    current: 38,
    plan: 44,
    forecast: 86,
    unit: 'шт',
    trend: 'up',
    trendValue: 4,
    status: 'warning'
  },
  {
    id: 'conv_repair_sale',
    name: 'Ремонт → продажа',
    shortName: 'Ремонт → продажа',
    level: 2,
    current: 30,
    plan: 35,
    forecast: 86,
    unit: '%',
    trend: 'up',
    trendValue: 8,
    status: 'warning'
  }
];

// Employee chart data
export const employeeChartData: MetricChartData[] = [
  {
    id: 'revenue_sz',
    name: 'Моя выручка',
    unit: '₽',
    plan: 700000,
    current: 580000,
    forecast: 83,
    status: 'warning',
    data: [
      { date: '1', value: 85000 },
      { date: '5', value: 180000 },
      { date: '10', value: 290000 },
      { date: '15', value: 380000 },
      { date: '20', value: 460000 },
      { date: '25', value: 530000 },
      { date: '30', value: 580000 },
    ]
  },
  {
    id: 'conversion',
    name: 'Моя конверсия',
    unit: '%',
    plan: 55,
    current: 52,
    forecast: 95,
    status: 'good',
    data: [
      { date: '1', value: 48 },
      { date: '5', value: 50 },
      { date: '10', value: 49 },
      { date: '15', value: 51 },
      { date: '20', value: 53 },
      { date: '25', value: 52 },
      { date: '30', value: 52 },
    ]
  },
];

// ==================== MANAGER DATA ====================

// Matrix cell type for lens matrix
interface MatrixCell {
  percent: number;
  avgPrice: number;
  count: number;
}

export interface MatrixDistribution {
  XA: MatrixCell;
  XB: MatrixCell;
  XC: MatrixCell;
  XD: MatrixCell;
  YA: MatrixCell;
  YB: MatrixCell;
  YC: MatrixCell;
  YD: MatrixCell;
  ZA: MatrixCell;
  ZB: MatrixCell;
  ZC: MatrixCell;
  ZD: MatrixCell;
}

export interface ManagerKPIData {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  metricsLevel1: KPIMetric[];
  metricsLevel2: KPIMetric[];
  lostRevenue: number;
  chartData: {
    date: string;
    dayName: string;
    value: number;
    plan: number;
  }[];
  // Extended data for manager detail page
  ranking?: {
    revenue: number;
    conversion: number;
    csi: number;
    avgCheck: number;
    clients: number;
  };
  lossBreakdown?: {
    conversionLoss: number;
    avgCheckLoss: number;
    clientsLoss: number;
  };
  attentionItems?: {
    unclosedOrders: { count: number; amount: number };
    notOnTime: { count: number };
    repairs: { count: number };
    pendingFollowUp: { count: number };
  };
  productMetrics?: {
    avgLensCheck: { current: number; plan: number };
    avgFrameCheck: { current: number; plan: number };
    designLensShare: { current: number; plan: number };
  };
  lensMatrix?: {
    avgLensPrice: number;
    planAvgPrice: number;
    matrixDistribution: MatrixDistribution;
  };
  revenueChartData?: {
    date: string;
    value: number;
    plan: number;
  }[];
}

export const managersData: Record<string, ManagerKPIData> = {
  'anna_petrova': {
    id: 'anna_petrova',
    name: 'Анна Петрова',
    role: 'Старший консультант',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
    lostRevenue: 45000,
    metricsLevel1: [
      { id: 'revenue_sz', name: 'Выручка СЗ', shortName: 'Выручка СЗ', level: 1, current: 680000, plan: 750000, reserve: 35000, forecast: 91, unit: '₽', trend: 'up', trendValue: 8, status: 'good' },
      { id: 'clients_count', name: 'Клиенты ФЛ', shortName: 'Клиенты ФЛ', level: 1, current: 42, plan: 45, reserve: 2, forecast: 93, unit: 'шт', trend: 'up', trendValue: 3, status: 'good' },
      { id: 'conversion', name: 'Конверсия', shortName: 'Конверсия', level: 1, current: 58, plan: 55, reserve: 3, forecast: 105, unit: '%', trend: 'up', trendValue: 5, status: 'good' },
      { id: 'csi', name: 'CSI', shortName: 'CSI', level: 1, current: 96, plan: 95, reserve: 1, forecast: 101, unit: '%', trend: 'up', trendValue: 2, status: 'good' },
      { id: 'revenue_zz', name: 'Выручка ЗЗ', shortName: 'Выручка ЗЗ', level: 1, current: 620000, plan: 700000, reserve: -30000, forecast: 89, unit: '₽', trend: 'up', trendValue: 4, status: 'warning' },
      { id: 'avg_glasses', name: 'Ср. стоимость очков', shortName: 'Ср. стоимость', level: 1, current: 19200, plan: 20000, reserve: 800, forecast: 96, unit: '₽', trend: 'up', trendValue: 2, status: 'good' },
      { id: 'margin', name: 'Маржа', shortName: 'Маржа', level: 1, current: 285000, plan: 315000, reserve: -30000, forecast: 90, unit: '₽', trend: 'stable', status: 'warning' },
    ],
    metricsLevel2: [
      { id: 'lenses_count', name: 'Линзы', shortName: 'Линзы', level: 2, current: 62, plan: 65, reserve: 3, forecast: 95, unit: 'шт', trend: 'up', trendValue: 4, status: 'good' },
      { id: 'frames_count', name: 'Оправы', shortName: 'Оправы', level: 2, current: 48, plan: 50, reserve: 2, forecast: 96, unit: 'шт', trend: 'up', trendValue: 2, status: 'good' },
    ],
    chartData: [
      { date: '01.02', dayName: 'Пн', value: 1.52, plan: 1.50 },
      { date: '02.02', dayName: 'Вт', value: 1.48, plan: 1.50 },
      { date: '03.02', dayName: 'Ср', value: 1.55, plan: 1.50 },
      { date: '04.02', dayName: 'Чт', value: 1.51, plan: 1.50 },
      { date: '05.02', dayName: 'Пт', value: 1.47, plan: 1.50 },
      { date: '06.02', dayName: 'Сб', value: 1.60, plan: 1.50 },
      { date: '07.02', dayName: 'Вс', value: 1.58, plan: 1.50 },
    ],
    ranking: { revenue: 2, conversion: 1, csi: 1, avgCheck: 2, clients: 2 },
    lossBreakdown: { conversionLoss: -15000, avgCheckLoss: -10000, clientsLoss: -20000 },
    attentionItems: { unclosedOrders: { count: 2, amount: 38000 }, notOnTime: { count: 1 }, repairs: { count: 0 }, pendingFollowUp: { count: 1 } },
    productMetrics: { avgLensCheck: { current: 9500, plan: 9000 }, avgFrameCheck: { current: 13200, plan: 13500 }, designLensShare: { current: 68, plan: 70 } },
    lensMatrix: {
      avgLensPrice: 9500,
      planAvgPrice: 9000,
      matrixDistribution: {
        XA: { percent: 12, avgPrice: 18500, count: 8 },
        XB: { percent: 8, avgPrice: 16200, count: 5 },
        XC: { percent: 5, avgPrice: 14800, count: 3 },
        XD: { percent: 2, avgPrice: 12500, count: 1 },
        YA: { percent: 18, avgPrice: 14200, count: 11 },
        YB: { percent: 15, avgPrice: 12800, count: 9 },
        YC: { percent: 8, avgPrice: 11200, count: 5 },
        YD: { percent: 4, avgPrice: 9800, count: 2 },
        ZA: { percent: 10, avgPrice: 9500, count: 6 },
        ZB: { percent: 8, avgPrice: 8200, count: 5 },
        ZC: { percent: 6, avgPrice: 7100, count: 4 },
        ZD: { percent: 4, avgPrice: 6200, count: 3 }
      }
    },
    revenueChartData: [
      { date: '1', value: 28000, plan: 25000 },
      { date: '2', value: 22000, plan: 25000 },
      { date: '3', value: 31000, plan: 25000 },
      { date: '4', value: 24000, plan: 25000 },
      { date: '5', value: 27000, plan: 25000 },
      { date: '6', value: 18000, plan: 25000 },
      { date: '7', value: 15000, plan: 25000 },
    ]
  },
  'ivan_sidorov': {
    id: 'ivan_sidorov',
    name: 'Иван Сидоров',
    role: 'Консультант',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
    lostRevenue: 180000,
    metricsLevel1: [
      { id: 'revenue_sz', name: 'Выручка СЗ', shortName: 'Выручка СЗ', level: 1, current: 520000, plan: 700000, reserve: -80000, forecast: 74, unit: '₽', trend: 'down', trendValue: 3, status: 'critical' },
      { id: 'clients_count', name: 'Клиенты ФЛ', shortName: 'Клиенты ФЛ', level: 1, current: 28, plan: 40, reserve: -6, forecast: 70, unit: 'шт', trend: 'stable', status: 'critical' },
      { id: 'conversion', name: 'Конверсия', shortName: 'Конверсия', level: 1, current: 38, plan: 55, reserve: -8, forecast: 69, unit: '%', trend: 'down', trendValue: 8, status: 'critical' },
      { id: 'csi', name: 'CSI', shortName: 'CSI', level: 1, current: 88, plan: 95, reserve: -3, forecast: 93, unit: '%', trend: 'down', trendValue: 2, status: 'warning' },
      { id: 'revenue_zz', name: 'Выручка ЗЗ', shortName: 'Выручка ЗЗ', level: 1, current: 480000, plan: 650000, reserve: -70000, forecast: 74, unit: '₽', trend: 'down', trendValue: 5, status: 'critical' },
      { id: 'avg_glasses', name: 'Ср. стоимость очков', shortName: 'Ср. стоимость', level: 1, current: 16500, plan: 20000, reserve: -1500, forecast: 83, unit: '₽', trend: 'down', trendValue: 4, status: 'warning' },
      { id: 'margin', name: 'Маржа', shortName: 'Маржа', level: 1, current: 180000, plan: 294000, reserve: -114000, forecast: 61, unit: '₽', trend: 'down', trendValue: 3, status: 'critical' },
    ],
    metricsLevel2: [
      { id: 'lenses_count', name: 'Линзы', shortName: 'Линзы', level: 2, current: 35, plan: 60, reserve: -12, forecast: 58, unit: 'шт', trend: 'down', trendValue: 5, status: 'critical' },
      { id: 'frames_count', name: 'Оправы', shortName: 'Оправы', level: 2, current: 32, plan: 44, reserve: -6, forecast: 73, unit: 'шт', trend: 'stable', status: 'critical' },
    ],
    chartData: [
      { date: '01.02', dayName: 'Пн', value: 1.35, plan: 1.50 },
      { date: '02.02', dayName: 'Вт', value: 1.28, plan: 1.50 },
      { date: '03.02', dayName: 'Ср', value: 1.42, plan: 1.50 },
      { date: '04.02', dayName: 'Чт', value: 1.38, plan: 1.50 },
      { date: '05.02', dayName: 'Пт', value: 1.30, plan: 1.50 },
      { date: '06.02', dayName: 'Сб', value: 1.45, plan: 1.50 },
      { date: '07.02', dayName: 'Вс', value: 1.40, plan: 1.50 },
    ],
    ranking: { revenue: 5, conversion: 5, csi: 4, avgCheck: 5, clients: 5 },
    lossBreakdown: { conversionLoss: 85000, avgCheckLoss: 55000, clientsLoss: 40000 },
    attentionItems: { unclosedOrders: { count: 5, amount: 92000 }, notOnTime: { count: 3 }, repairs: { count: 2 }, pendingFollowUp: { count: 4 } },
    productMetrics: { avgLensCheck: { current: 7200, plan: 9000 }, avgFrameCheck: { current: 9300, plan: 11000 }, designLensShare: { current: 45, plan: 70 } },
    lensMatrix: {
      avgLensPrice: 7200,
      planAvgPrice: 9000,
      matrixDistribution: {
        XA: { percent: 5, avgPrice: 17000, count: 2 },
        XB: { percent: 4, avgPrice: 15000, count: 2 },
        XC: { percent: 3, avgPrice: 13500, count: 1 },
        XD: { percent: 2, avgPrice: 11000, count: 1 },
        YA: { percent: 12, avgPrice: 12500, count: 5 },
        YB: { percent: 18, avgPrice: 10800, count: 8 },
        YC: { percent: 15, avgPrice: 9200, count: 6 },
        YD: { percent: 10, avgPrice: 7800, count: 4 },
        ZA: { percent: 8, avgPrice: 8000, count: 3 },
        ZB: { percent: 10, avgPrice: 6500, count: 4 },
        ZC: { percent: 8, avgPrice: 5800, count: 3 },
        ZD: { percent: 5, avgPrice: 5000, count: 2 }
      }
    }
  },
  'maria_kozlova': {
    id: 'maria_kozlova',
    name: 'Мария Козлова',
    role: 'Консультант',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
    lostRevenue: 110000,
    metricsLevel1: [
      { id: 'revenue_sz', name: 'Выручка СЗ', shortName: 'Выручка СЗ', level: 1, current: 590000, plan: 700000, reserve: -40000, forecast: 84, unit: '₽', trend: 'up', trendValue: 4, status: 'warning' },
      { id: 'clients_count', name: 'Клиенты ФЛ', shortName: 'Клиенты ФЛ', level: 1, current: 35, plan: 40, reserve: -2, forecast: 88, unit: 'шт', trend: 'up', trendValue: 2, status: 'warning' },
      { id: 'conversion', name: 'Конверсия', shortName: 'Конверсия', level: 1, current: 48, plan: 55, reserve: -3, forecast: 87, unit: '%', trend: 'up', trendValue: 3, status: 'warning' },
      { id: 'csi', name: 'CSI', shortName: 'CSI', level: 1, current: 93, plan: 95, reserve: 2, forecast: 98, unit: '%', trend: 'up', trendValue: 1, status: 'good' },
      { id: 'revenue_zz', name: 'Выручка ЗЗ', shortName: 'Выручка ЗЗ', level: 1, current: 550000, plan: 650000, reserve: -35000, forecast: 85, unit: '₽', trend: 'up', trendValue: 3, status: 'warning' },
      { id: 'avg_glasses', name: 'Ср. стоимость очков', shortName: 'Ср. стоимость', level: 1, current: 18000, plan: 20000, reserve: -800, forecast: 90, unit: '₽', trend: 'up', trendValue: 2, status: 'warning' },
      { id: 'margin', name: 'Маржа', shortName: 'Маржа', level: 1, current: 260000, plan: 280000, reserve: -20000, forecast: 93, unit: '₽', trend: 'up', trendValue: 1, status: 'warning' },
    ],
    metricsLevel2: [
      { id: 'lenses_count', name: 'Линзы', shortName: 'Линзы', level: 2, current: 52, plan: 60, reserve: -4, forecast: 87, unit: 'шт', trend: 'up', trendValue: 3, status: 'warning' },
      { id: 'frames_count', name: 'Оправы', shortName: 'Оправы', level: 2, current: 40, plan: 44, reserve: 2, forecast: 91, unit: 'шт', trend: 'up', trendValue: 4, status: 'good' },
    ],
    chartData: [
      { date: '01.02', dayName: 'Пн', value: 1.45, plan: 1.50 },
      { date: '02.02', dayName: 'Вт', value: 1.48, plan: 1.50 },
      { date: '03.02', dayName: 'Ср', value: 1.52, plan: 1.50 },
      { date: '04.02', dayName: 'Чт', value: 1.49, plan: 1.50 },
      { date: '05.02', dayName: 'Пт', value: 1.44, plan: 1.50 },
      { date: '06.02', dayName: 'Сб', value: 1.55, plan: 1.50 },
      { date: '07.02', dayName: 'Вс', value: 1.50, plan: 1.50 },
    ],
    ranking: { revenue: 3, conversion: 3, csi: 2, avgCheck: 3, clients: 3 },
    lossBreakdown: { conversionLoss: 45000, avgCheckLoss: 35000, clientsLoss: 30000 },
    attentionItems: { unclosedOrders: { count: 3, amount: 55000 }, notOnTime: { count: 2 }, repairs: { count: 1 }, pendingFollowUp: { count: 2 } },
    productMetrics: { avgLensCheck: { current: 10200, plan: 9000 }, avgFrameCheck: { current: 14500, plan: 13500 }, designLensShare: { current: 75, plan: 70 } },
    lensMatrix: {
      avgLensPrice: 10200,
      planAvgPrice: 9000,
      matrixDistribution: {
        XA: { percent: 18, avgPrice: 19500, count: 12 },
        XB: { percent: 12, avgPrice: 17200, count: 8 },
        XC: { percent: 6, avgPrice: 15000, count: 4 },
        XD: { percent: 2, avgPrice: 13000, count: 1 },
        YA: { percent: 20, avgPrice: 15000, count: 13 },
        YB: { percent: 14, avgPrice: 13500, count: 9 },
        YC: { percent: 7, avgPrice: 11800, count: 5 },
        YD: { percent: 3, avgPrice: 10200, count: 2 },
        ZA: { percent: 8, avgPrice: 9800, count: 5 },
        ZB: { percent: 5, avgPrice: 8500, count: 3 },
        ZC: { percent: 3, avgPrice: 7200, count: 2 },
        ZD: { percent: 2, avgPrice: 6000, count: 1 }
      }
    }
  },
  'dmitry_volkov': {
    id: 'dmitry_volkov',
    name: 'Дмитрий Волков',
    role: 'Стажер',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face',
    lostRevenue: 70000,
    metricsLevel1: [
      { id: 'revenue_sz', name: 'Выручка СЗ', shortName: 'Выручка СЗ', level: 1, current: 280000, plan: 350000, reserve: -25000, forecast: 80, unit: '₽', trend: 'up', trendValue: 12, status: 'warning' },
      { id: 'clients_count', name: 'Клиенты ФЛ', shortName: 'Клиенты ФЛ', level: 1, current: 18, plan: 25, reserve: -3, forecast: 72, unit: 'шт', trend: 'up', trendValue: 6, status: 'critical' },
      { id: 'conversion', name: 'Конверсия', shortName: 'Конверсия', level: 1, current: 35, plan: 45, reserve: -4, forecast: 78, unit: '%', trend: 'up', trendValue: 10, status: 'warning' },
      { id: 'csi', name: 'CSI', shortName: 'CSI', level: 1, current: 90, plan: 90, reserve: 5, forecast: 100, unit: '%', trend: 'up', trendValue: 5, status: 'good' },
      { id: 'revenue_zz', name: 'Выручка ЗЗ', shortName: 'Выручка ЗЗ', level: 1, current: 250000, plan: 320000, reserve: -25000, forecast: 78, unit: '₽', trend: 'up', trendValue: 8, status: 'warning' },
      { id: 'avg_glasses', name: 'Ср. стоимость очков', shortName: 'Ср. стоимость', level: 1, current: 15500, plan: 18000, reserve: -1000, forecast: 86, unit: '₽', trend: 'up', trendValue: 6, status: 'warning' },
      { id: 'margin', name: 'Маржа', shortName: 'Маржа', level: 1, current: 130000, plan: 161000, reserve: -31000, forecast: 81, unit: '₽', trend: 'up', trendValue: 4, status: 'warning' },
    ],
    metricsLevel2: [
      { id: 'lenses_count', name: 'Линзы', shortName: 'Линзы', level: 2, current: 22, plan: 30, reserve: -4, forecast: 73, unit: 'шт', trend: 'up', trendValue: 8, status: 'critical' },
      { id: 'frames_count', name: 'Оправы', shortName: 'Оправы', level: 2, current: 20, plan: 25, reserve: -2, forecast: 80, unit: 'шт', trend: 'up', trendValue: 5, status: 'warning' },
    ],
    chartData: [
      { date: '01.02', dayName: 'Пн', value: 1.30, plan: 1.40 },
      { date: '02.02', dayName: 'Вт', value: 1.35, plan: 1.40 },
      { date: '03.02', dayName: 'Ср', value: 1.42, plan: 1.40 },
      { date: '04.02', dayName: 'Чт', value: 1.38, plan: 1.40 },
      { date: '05.02', dayName: 'Пт', value: 1.32, plan: 1.40 },
      { date: '06.02', dayName: 'Сб', value: 1.45, plan: 1.40 },
      { date: '07.02', dayName: 'Вс', value: 1.40, plan: 1.40 },
    ],
    ranking: { revenue: 4, conversion: 4, csi: 3, avgCheck: 4, clients: 4 },
    lossBreakdown: { conversionLoss: 35000, avgCheckLoss: 20000, clientsLoss: 15000 },
    attentionItems: { unclosedOrders: { count: 2, amount: 28000 }, notOnTime: { count: 1 }, repairs: { count: 1 }, pendingFollowUp: { count: 1 } },
    productMetrics: { avgLensCheck: { current: 8800, plan: 9000 }, avgFrameCheck: { current: 12800, plan: 13500 }, designLensShare: { current: 62, plan: 70 } },
    lensMatrix: {
      avgLensPrice: 8800,
      planAvgPrice: 9000,
      matrixDistribution: {
        XA: { percent: 10, avgPrice: 18000, count: 6 },
        XB: { percent: 9, avgPrice: 16000, count: 5 },
        XC: { percent: 5, avgPrice: 14200, count: 3 },
        XD: { percent: 3, avgPrice: 12000, count: 2 },
        YA: { percent: 15, avgPrice: 13800, count: 9 },
        YB: { percent: 16, avgPrice: 12200, count: 10 },
        YC: { percent: 10, avgPrice: 10500, count: 6 },
        YD: { percent: 6, avgPrice: 9000, count: 4 },
        ZA: { percent: 9, avgPrice: 8800, count: 5 },
        ZB: { percent: 8, avgPrice: 7500, count: 5 },
        ZC: { percent: 5, avgPrice: 6500, count: 3 },
        ZD: { percent: 4, avgPrice: 5500, count: 2 }
      }
    }
  },
  'elena_novikova': {
    id: 'elena_novikova',
    name: 'Елена Новикова',
    role: 'Консультант',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face',
    lostRevenue: -25000,
    metricsLevel1: [
      { id: 'revenue_sz', name: 'Выручка СЗ', shortName: 'Выручка СЗ', level: 1, current: 730000, plan: 700000, reserve: 45000, forecast: 104, unit: '₽', trend: 'up', trendValue: 6, status: 'good' },
      { id: 'clients_count', name: 'Клиенты ФЛ', shortName: 'Клиенты ФЛ', level: 1, current: 43, plan: 40, reserve: 4, forecast: 108, unit: 'шт', trend: 'up', trendValue: 4, status: 'good' },
      { id: 'conversion', name: 'Конверсия', shortName: 'Конверсия', level: 1, current: 62, plan: 55, reserve: 8, forecast: 113, unit: '%', trend: 'up', trendValue: 7, status: 'good' },
      { id: 'csi', name: 'CSI', shortName: 'CSI', level: 1, current: 97, plan: 95, reserve: 3, forecast: 102, unit: '%', trend: 'up', trendValue: 3, status: 'good' },
      { id: 'revenue_zz', name: 'Выручка ЗЗ', shortName: 'Выручка ЗЗ', level: 1, current: 710000, plan: 680000, reserve: 40000, forecast: 104, unit: '₽', trend: 'up', trendValue: 5, status: 'good' },
      { id: 'avg_glasses', name: 'Ср. стоимость очков', shortName: 'Ср. стоимость', level: 1, current: 21500, plan: 20000, reserve: 2000, forecast: 108, unit: '₽', trend: 'up', trendValue: 4, status: 'good' },
      { id: 'margin', name: 'Маржа', shortName: 'Маржа', level: 1, current: 340000, plan: 315000, reserve: 25000, forecast: 108, unit: '₽', trend: 'up', trendValue: 2, status: 'good' },
    ],
    metricsLevel2: [
      { id: 'lenses_count', name: 'Линзы', shortName: 'Линзы', level: 2, current: 74, plan: 65, reserve: 10, forecast: 114, unit: 'шт', trend: 'up', trendValue: 8, status: 'good' },
      { id: 'frames_count', name: 'Оправы', shortName: 'Оправы', level: 2, current: 49, plan: 44, reserve: 6, forecast: 111, unit: 'шт', trend: 'up', trendValue: 5, status: 'good' },
    ],
    chartData: [
      { date: '01.02', dayName: 'Пн', value: 1.58, plan: 1.50 },
      { date: '02.02', dayName: 'Вт', value: 1.62, plan: 1.50 },
      { date: '03.02', dayName: 'Ср', value: 1.55, plan: 1.50 },
      { date: '04.02', dayName: 'Чт', value: 1.68, plan: 1.50 },
      { date: '05.02', dayName: 'Пт', value: 1.60, plan: 1.50 },
      { date: '06.02', dayName: 'Сб', value: 1.72, plan: 1.50 },
      { date: '07.02', dayName: 'Вс', value: 1.65, plan: 1.50 },
    ],
    lossBreakdown: { conversionLoss: -10000, avgCheckLoss: -8000, clientsLoss: -7000 },
    attentionItems: { unclosedOrders: { count: 1, amount: 18000 }, notOnTime: { count: 0 }, repairs: { count: 0 }, pendingFollowUp: { count: 1 } },
    productMetrics: { avgLensCheck: { current: 9800, plan: 9000 }, avgFrameCheck: { current: 13800, plan: 13500 }, designLensShare: { current: 72, plan: 70 } },
    lensMatrix: {
      avgLensPrice: 9800,
      planAvgPrice: 9000,
      matrixDistribution: {
        XA: { percent: 14, avgPrice: 19000, count: 10 },
        XB: { percent: 10, avgPrice: 16800, count: 7 },
        XC: { percent: 6, avgPrice: 14500, count: 4 },
        XD: { percent: 2, avgPrice: 12200, count: 1 },
        YA: { percent: 17, avgPrice: 14500, count: 12 },
        YB: { percent: 15, avgPrice: 13000, count: 11 },
        YC: { percent: 9, avgPrice: 11500, count: 6 },
        YD: { percent: 4, avgPrice: 9800, count: 3 },
        ZA: { percent: 9, avgPrice: 9200, count: 6 },
        ZB: { percent: 6, avgPrice: 8000, count: 4 },
        ZC: { percent: 5, avgPrice: 6800, count: 3 },
        ZD: { percent: 3, avgPrice: 5800, count: 2 }
      }
    }
  }
};

// ==================== METRIC DETAIL DATA ====================

export interface MetricDetailData {
  metric: {
    id: string;
    name: string;
    current: number;
    plan: number;
    reserve?: number;
    forecast: number;
    unit: '₽' | '%' | 'шт';
    status: KPIStatus;
  };
  managers: {
    id: string;
    name: string;
    avatar?: string;
    current: number;
    plan: number;
    forecast: number;
    status: KPIStatus;
  }[];
}

export const metricDetailData: Record<string, MetricDetailData> = {
  'revenue_sz': {
    metric: {
      id: 'revenue_sz',
      name: 'Выручка Созданные заказы',
      current: 2800000,
      plan: 3500000,
      reserve: 450000,
      forecast: 80,
      unit: '₽',
      status: 'warning'
    },
    managers: [
      { id: 'elena_novikova', name: 'Елена Новикова', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face', current: 730000, plan: 700000, forecast: 104, status: 'good' },
      { id: 'anna_petrova', name: 'Анна Петрова', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face', current: 680000, plan: 750000, forecast: 91, status: 'good' },
      { id: 'maria_kozlova', name: 'Мария Козлова', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face', current: 590000, plan: 700000, forecast: 84, status: 'warning' },
      { id: 'ivan_sidorov', name: 'Иван Сидоров', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face', current: 520000, plan: 700000, forecast: 74, status: 'critical' },
      { id: 'dmitry_volkov', name: 'Дмитрий Волков', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face', current: 280000, plan: 350000, forecast: 80, status: 'warning' },
    ]
  },
  'conversion': {
    metric: {
      id: 'conversion',
      name: 'Общая конверсия в продажу',
      current: 45,
      plan: 55,
      forecast: 82,
      unit: '%',
      status: 'warning'
    },
    managers: [
      { id: 'elena_novikova', name: 'Елена Новикова', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face', current: 62, plan: 55, forecast: 113, status: 'good' },
      { id: 'anna_petrova', name: 'Анна Петрова', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face', current: 58, plan: 55, forecast: 105, status: 'good' },
      { id: 'maria_kozlova', name: 'Мария Козлова', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face', current: 48, plan: 55, forecast: 87, status: 'warning' },
      { id: 'ivan_sidorov', name: 'Иван Сидоров', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face', current: 38, plan: 55, forecast: 69, status: 'critical' },
      { id: 'dmitry_volkov', name: 'Дмитрий Волков', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face', current: 35, plan: 45, forecast: 78, status: 'warning' },
    ]
  },
  'csi': {
    metric: {
      id: 'csi',
      name: 'CSI качество сервиса',
      current: 92,
      plan: 95,
      forecast: 97,
      unit: '%',
      status: 'good'
    },
    managers: [
      { id: 'elena_novikova', name: 'Елена Новикова', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face', current: 97, plan: 95, forecast: 102, status: 'good' },
      { id: 'anna_petrova', name: 'Анна Петрова', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face', current: 96, plan: 95, forecast: 101, status: 'good' },
      { id: 'maria_kozlova', name: 'Мария Козлова', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face', current: 93, plan: 95, forecast: 98, status: 'good' },
      { id: 'dmitry_volkov', name: 'Дмитрий Волков', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face', current: 90, plan: 90, forecast: 100, status: 'good' },
      { id: 'ivan_sidorov', name: 'Иван Сидоров', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face', current: 88, plan: 95, forecast: 93, status: 'warning' },
    ]
  }
};

// ==================== ATTENTION ITEMS DATA ====================

export interface AttentionOrderItem {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  amount: number;
  date: string;
  description: string;
  daysOverdue?: number;
}

export const notOnTimeOrders: AttentionOrderItem[] = [
  { id: '1', orderNumber: 'ITG-2024-0156', customerName: 'Сергей Павлов', phone: '+7 (999) 234-56-78', amount: 18500, date: '2024-01-05', description: 'Прогрессивные линзы Essilor', daysOverdue: 5 },
  { id: '2', orderNumber: 'ITG-2024-0142', customerName: 'Ольга Смирнова', phone: '+7 (999) 345-67-89', amount: 12300, date: '2024-01-03', description: 'Оправа Gucci + линзы', daysOverdue: 7 },
  { id: '3', orderNumber: 'ITG-2024-0138', customerName: 'Алексей Морозов', phone: '+7 (999) 456-78-90', amount: 25600, date: '2024-01-02', description: 'Мультифокальные линзы Zeiss', daysOverdue: 8 },
  { id: '4', orderNumber: 'ITG-2024-0125', customerName: 'Наталья Белова', phone: '+7 (999) 567-89-01', amount: 8900, date: '2023-12-28', description: 'Солнцезащитные очки с диоптриями', daysOverdue: 13 },
  { id: '5', orderNumber: 'ITG-2024-0118', customerName: 'Виктор Кузнецов', phone: '+7 (999) 678-90-12', amount: 31200, date: '2023-12-25', description: 'Премиум линзы Hoya', daysOverdue: 16 },
];

export const repairsOrders: AttentionOrderItem[] = [
  { id: '1', orderNumber: 'REP-2024-0045', customerName: 'Андрей Васильев', phone: '+7 (999) 444-55-66', amount: 4500, date: '2024-01-18', description: 'Ремонт дужки очков', daysOverdue: 2 },
  { id: '2', orderNumber: 'REP-2024-0038', customerName: 'Елена Федорова', phone: '+7 (999) 555-66-77', amount: 2800, date: '2024-01-15', description: 'Замена носоупоров', daysOverdue: 5 },
  { id: '3', orderNumber: 'REP-2024-0032', customerName: 'Михаил Орлов', phone: '+7 (999) 666-77-88', amount: 6200, date: '2024-01-12', description: 'Гарантийный ремонт оправы' },
  { id: '4', orderNumber: 'REP-2024-0028', customerName: 'Татьяна Лебедева', phone: '+7 (999) 777-88-99', amount: 3500, date: '2024-01-10', description: 'Регулировка оправы' },
  { id: '5', orderNumber: 'REP-2024-0021', customerName: 'Павел Соколов', phone: '+7 (999) 888-99-00', amount: 8900, date: '2024-01-08', description: 'Замена линз по гарантии' },
  { id: '6', orderNumber: 'REP-2024-0015', customerName: 'Ирина Попова', phone: '+7 (999) 999-00-11', amount: 1500, date: '2024-01-05', description: 'Замена винтов' },
  { id: '7', orderNumber: 'REP-2024-0009', customerName: 'Николай Новиков', phone: '+7 (999) 000-11-22', amount: 5200, date: '2024-01-03', description: 'Пайка оправы', daysOverdue: 1 },
];

export const returnsOrders: AttentionOrderItem[] = [
  { id: '1', orderNumber: 'RET-2024-0012', customerName: 'Владимир Егоров', phone: '+7 (999) 111-22-33', amount: 24500, date: '2024-01-19', description: 'Возврат — не подошли линзы' },
  { id: '2', orderNumber: 'RET-2024-0009', customerName: 'Светлана Тихонова', phone: '+7 (999) 222-33-44', amount: 18900, date: '2024-01-17', description: 'Возврат — брак оправы' },
  { id: '3', orderNumber: 'RET-2024-0006', customerName: 'Артем Григорьев', phone: '+7 (999) 333-44-55', amount: 32000, date: '2024-01-14', description: 'Возврат — ошибка в рецепте' },
  { id: '4', orderNumber: 'RET-2024-0003', customerName: 'Юлия Макарова', phone: '+7 (999) 444-55-66', amount: 14100, date: '2024-01-10', description: 'Возврат — передумал клиент' },
];

// ==================== OPTOMETRIST RANKING DATA ====================

export interface OptometristKPIMetric {
  id: string;
  name: string;
  current: number;
  plan: number;
  forecast: number;
  unit: string;
}

export interface OptometristKPIData {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  metricsLevel1: OptometristKPIMetric[];
  lostRevenue: number;
}

export const optometristsData: Record<string, OptometristKPIData> = {
  'olga_smirnova': {
    id: 'olga_smirnova',
    name: 'Ольга Смирнова',
    role: 'Старший оптометрист',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&crop=face',
    lostRevenue: 35000,
    metricsLevel1: [
      { id: 'lens_revenue', name: 'Выручка по линзам', current: 480000, plan: 550000, forecast: 87, unit: '₽' },
      { id: 'avg_lens_check', name: 'Ср.чек линзы', current: 9500, plan: 10000, forecast: 95, unit: '₽' },
      { id: 'design_lens_share', name: 'Доля линз с дизайном', current: 42, plan: 50, forecast: 84, unit: '%' },
      { id: 'diag_to_sale', name: 'Конверсия диагн.→продажа', current: 65, plan: 70, forecast: 93, unit: '%' },
      { id: 'repair_to_diag', name: 'Ремонт→диагностика', current: 28, plan: 35, forecast: 80, unit: '%' },
    ]
  },
  'andrey_kuznetsov': {
    id: 'andrey_kuznetsov',
    name: 'Андрей Кузнецов',
    role: 'Оптометрист',
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop&crop=face',
    lostRevenue: -12000,
    metricsLevel1: [
      { id: 'lens_revenue', name: 'Выручка по линзам', current: 520000, plan: 500000, forecast: 104, unit: '₽' },
      { id: 'avg_lens_check', name: 'Ср.чек линзы', current: 10500, plan: 10000, forecast: 105, unit: '₽' },
      { id: 'design_lens_share', name: 'Доля линз с дизайном', current: 55, plan: 50, forecast: 110, unit: '%' },
      { id: 'diag_to_sale', name: 'Конверсия диагн.→продажа', current: 72, plan: 70, forecast: 103, unit: '%' },
      { id: 'repair_to_diag', name: 'Ремонт→диагностика', current: 38, plan: 35, forecast: 109, unit: '%' },
    ]
  },
  'marina_volkova': {
    id: 'marina_volkova',
    name: 'Марина Волкова',
    role: 'Оптометрист',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=face',
    lostRevenue: 48000,
    metricsLevel1: [
      { id: 'lens_revenue', name: 'Выручка по линзам', current: 420000, plan: 500000, forecast: 84, unit: '₽' },
      { id: 'avg_lens_check', name: 'Ср.чек линзы', current: 8800, plan: 10000, forecast: 88, unit: '₽' },
      { id: 'design_lens_share', name: 'Доля линз с дизайном', current: 38, plan: 50, forecast: 76, unit: '%' },
      { id: 'diag_to_sale', name: 'Конверсия диагн.→продажа', current: 60, plan: 70, forecast: 86, unit: '%' },
      { id: 'repair_to_diag', name: 'Ремонт→диагностика', current: 32, plan: 35, forecast: 91, unit: '%' },
    ]
  },
  'sergey_petrov': {
    id: 'sergey_petrov',
    name: 'Сергей Петров',
    role: 'Оптометрист',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
    lostRevenue: -8000,
    metricsLevel1: [
      { id: 'lens_revenue', name: 'Выручка по линзам', current: 510000, plan: 500000, forecast: 102, unit: '₽' },
      { id: 'avg_lens_check', name: 'Ср.чек линзы', current: 9800, plan: 10000, forecast: 98, unit: '₽' },
      { id: 'design_lens_share', name: 'Доля линз с дизайном', current: 48, plan: 50, forecast: 96, unit: '%' },
      { id: 'diag_to_sale', name: 'Конверсия диагн.→продажа', current: 68, plan: 70, forecast: 97, unit: '%' },
      { id: 'repair_to_diag', name: 'Ремонт→диагностика', current: 36, plan: 35, forecast: 103, unit: '%' },
    ]
  },
  'elena_fedorova': {
    id: 'elena_fedorova',
    name: 'Елена Федорова',
    role: 'Младший оптометрист',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
    lostRevenue: 62000,
    metricsLevel1: [
      { id: 'lens_revenue', name: 'Выручка по линзам', current: 380000, plan: 450000, forecast: 84, unit: '₽' },
      { id: 'avg_lens_check', name: 'Ср.чек линзы', current: 8200, plan: 10000, forecast: 82, unit: '₽' },
      { id: 'design_lens_share', name: 'Доля линз с дизайном', current: 35, plan: 50, forecast: 70, unit: '%' },
      { id: 'diag_to_sale', name: 'Конверсия диагн.→продажа', current: 55, plan: 70, forecast: 79, unit: '%' },
      { id: 'repair_to_diag', name: 'Ремонт→диагностика', current: 25, plan: 35, forecast: 71, unit: '%' },
    ]
  },
};

// ==================== AVERAGE PRICE CATEGORIES ====================

export interface AvgPriceCategoryData {
  id: string;
  name: string;
  current: number;
  plan: number;
  unit: string;
}

export const avgPriceCategories: AvgPriceCategoryData[] = [
  { id: 'glasses_complete', name: 'Ср. стоимость очков (комплекта)', current: 18500, plan: 20000, unit: '₽' },
  { id: 'frame', name: 'Ср. стоимость оправы', current: 12000, plan: 13500, unit: '₽' },
  { id: 'lens', name: 'Ср. стоимость линзы', current: 8500, plan: 9000, unit: '₽' },
  { id: 'design_share', name: 'Доля линз с дизайном', current: 62, plan: 70, unit: '%' },
  { id: 'design_lens', name: 'Ср. стоимость линз с дизайном', current: 11200, plan: 12000, unit: '₽' },
];

// ==================== AVERAGE PRICE LOSS BREAKDOWN ====================

export const avgPriceLossBreakdown = {
  totalLoss: 122000,
  frameLoss: 48000,
  lensLoss: 32000,
  designLoss: 42000,
  manufacturingLoss: 23000,
};

// ==================== AVERAGE PRICE DAILY CHART DATA ====================

export const avgPriceDailyChartData = Array.from({ length: 30 }, (_, i) => {
  const day = i + 1;
  const planValue = 20000;
  const variance = Math.random() * 4000 - 2000;
  const value = Math.round(planValue + variance);
  return {
    date: String(day),
    value,
    plan: planValue,
  };
});

// ==================== AVERAGE PRICE MANAGERS DATA ====================

interface AvgPriceMetricValue {
  value: number;
  forecast: number;
}

export interface AvgPriceManagerData {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  planPercent: number;
  glassesComplete: AvgPriceMetricValue;
  frame: AvgPriceMetricValue;
  manufacturing: AvgPriceMetricValue;
  lens: AvgPriceMetricValue;
  designShare: AvgPriceMetricValue;
  designLens: AvgPriceMetricValue;
  repairs: AvgPriceMetricValue;
  lostRevenue: number;
}

// lostRevenue: negative = over-achievement (plan >= 100%), positive = losses (plan < 100%)
// Sum of all lostRevenue values should equal totalLoss (122000) when losses > achievements
export const avgPriceManagersData: AvgPriceManagerData[] = [
  {
    id: 'elena_novikova',
    name: 'Елена Новикова',
    role: 'Консультант',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
    planPercent: 106,
    glassesComplete: { value: 21500, forecast: 108 },
    frame: { value: 14200, forecast: 105 },
    manufacturing: { value: 6800, forecast: 105 },
    lens: { value: 9500, forecast: 106 },
    designShare: { value: 72, forecast: 103 },
    designLens: { value: 12500, forecast: 104 },
    repairs: { value: 3400, forecast: 106 },
    lostRevenue: -18000, // Over-achievement (plan 106%)
  },
  {
    id: 'olga_smirnova',
    name: 'Ольга Смирнова',
    role: 'Младший консультант',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face',
    planPercent: 102,
    glassesComplete: { value: 20400, forecast: 102 },
    frame: { value: 13800, forecast: 102 },
    manufacturing: { value: 6600, forecast: 102 },
    lens: { value: 9100, forecast: 101 },
    designShare: { value: 71, forecast: 101 },
    designLens: { value: 12100, forecast: 101 },
    repairs: { value: 3300, forecast: 103 },
    lostRevenue: -6000, // Over-achievement (plan 102%)
  },
  {
    id: 'anna_petrova',
    name: 'Анна Петрова',
    role: 'Консультант',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face',
    planPercent: 98,
    glassesComplete: { value: 19600, forecast: 98 },
    frame: { value: 13100, forecast: 97 },
    manufacturing: { value: 6500, forecast: 100 },
    lens: { value: 8900, forecast: 99 },
    designShare: { value: 68, forecast: 97 },
    designLens: { value: 11800, forecast: 98 },
    repairs: { value: 3100, forecast: 97 },
    lostRevenue: 12000, // Losses (plan 98%)
  },
  {
    id: 'maria_kozlova',
    name: 'Мария Козлова',
    role: 'Старший консультант',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
    planPercent: 94,
    glassesComplete: { value: 18800, forecast: 94 },
    frame: { value: 12600, forecast: 93 },
    manufacturing: { value: 6200, forecast: 95 },
    lens: { value: 8700, forecast: 97 },
    designShare: { value: 64, forecast: 91 },
    designLens: { value: 11000, forecast: 92 },
    repairs: { value: 2900, forecast: 91 },
    lostRevenue: 32000, // Losses (plan 94%)
  },
  {
    id: 'ivan_sidorov',
    name: 'Иван Сидоров',
    role: 'Консультант',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
    planPercent: 86,
    glassesComplete: { value: 17200, forecast: 86 },
    frame: { value: 11500, forecast: 85 },
    manufacturing: { value: 5700, forecast: 88 },
    lens: { value: 7800, forecast: 87 },
    designShare: { value: 55, forecast: 79 },
    designLens: { value: 10200, forecast: 85 },
    repairs: { value: 2500, forecast: 78 },
    lostRevenue: 48000, // Losses (plan 86%)
  },
  {
    id: 'dmitry_volkov',
    name: 'Дмитрий Волков',
    role: 'Консультант',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face',
    planPercent: 78,
    glassesComplete: { value: 15600, forecast: 78 },
    frame: { value: 10400, forecast: 77 },
    manufacturing: { value: 5200, forecast: 80 },
    lens: { value: 7000, forecast: 78 },
    designShare: { value: 48, forecast: 69 },
    designLens: { value: 9400, forecast: 78 },
    repairs: { value: 2200, forecast: 69 },
    lostRevenue: 54000, // Losses (plan 78%)
  },
];
// Total: -18000 - 6000 + 12000 + 32000 + 48000 + 54000 = 122000 ₽

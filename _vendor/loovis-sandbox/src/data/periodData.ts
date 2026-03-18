import { FilterPeriod } from '@/components/dashboard/FilterBar';
import { 
  leaderTopMetrics, 
  employeeTopMetrics,
  revenueSzDailyChartData,
  avgPriceDailyChartData,
  revenueSzConversionsDetailed,
  revenueSzManagersDetail,
  managersData,
  optometristsData,
  avgPriceManagersData,
  revenueSzLossBreakdown,
  avgPriceLossBreakdown,
  avgPriceCategories,
  type ConversionDetailData,
  type ManagerCardData,
  type AvgPriceCategoryData,
} from './mockData';
import { FullWidthKPIMetric } from '@/components/dashboard/KPIFullWidthCard';

// Helper to expand client periods - all client filters use the same base data with scaling
const expandClientPeriods = <T,>(base: {
  day: T;
  '3days': T;
  month: T;
  year: T;
  '30clients': T;
}, scaleClients?: (data: T, clientCount: number) => T): Record<FilterPeriod, T> => {
  const scale = scaleClients || ((d) => d);
  return {
    ...base,
    '10clients': scale(base['30clients'], 10),
    '20clients': scale(base['30clients'], 20),
    '30clients': scale(base['30clients'], 30),
    '50clients': scale(base['30clients'], 50),
  };
};

// ==================== DYNAMIC PLAN GENERATOR ====================

// Seeded random for reproducible results
const seededRandom = (seed: number): number => {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

// Generate dynamic daily plan with range 95K-170K (or scaled)
export const generateDailyPlanValue = (
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

// ==================== CHART DATA GENERATORS ====================

// Generate hourly data for a single day (only working hours 09:00-21:00)
const generateDayChartData = (basePlan: number) => {
  // Only working hours (09:00 - 21:00)
  const workHours = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
  
  return workHours.map((hour, i) => {
    // Even hourly plan based on daily average
    const hourlyPlan = Math.round(basePlan / workHours.length);
    const variance = (seededRandom(hour * 13) - 0.4) * 0.5;
    const value = Math.round(hourlyPlan * (1 + variance));
    
    return {
      date: `${hour.toString().padStart(2, '0')}:00`,
      value,
      plan: hourlyPlan
    };
  });
};

// Generate 3-day chart data with dynamic plans
const generateThreeDaysChartData = (minPlan: number, maxPlan: number) => {
  // Use dynamic plan for each of 3 days (days 13, 14, 15 of January 2026)
  const days = [
    { date: 'Позавчера', dayOfMonth: 13, dayOfWeek: 1 }, // Пн
    { date: 'Вчера', dayOfMonth: 14, dayOfWeek: 2 },     // Вт
    { date: 'Сегодня', dayOfMonth: 15, dayOfWeek: 3 },   // Ср
  ];
  
  return days.map(day => {
    const plan = generateDailyPlanValue(day.dayOfMonth, day.dayOfWeek, { minPlan, maxPlan });
    const variation = 0.7 + seededRandom(day.dayOfMonth * 11) * 0.6;
    return {
      date: day.date,
      value: Math.round(plan * variation),
      plan,
      dayOfWeek: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'][day.dayOfWeek]
    };
  });
};

// Generate yearly data (12 months) with monthly plans
const generateYearChartData = (monthlyPlan: number) => {
  const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
  return months.map((month, i) => {
    const seasonalMultiplier = 1 + Math.sin((i - 3) * Math.PI / 6) * 0.15;
    const variance = (seededRandom(i * 17) - 0.5) * 0.2;
    return {
      date: month,
      value: Math.round(monthlyPlan * seasonalMultiplier * (1 + variance)),
      plan: monthlyPlan
    };
  });
};

// ==================== DAY OF WEEK HELPERS ====================

const DAYS_OF_WEEK = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

// Current date for determining future days (January 15, 2026)
const CURRENT_DATE = new Date(2026, 0, 15);

// Add day of week info and isFuture flag to chart data (for month period)
const addDayOfWeekToChartData = <T extends { date: string; value: number; plan?: number }>(
  data: T[],
  startDate: Date = new Date(2026, 0, 1) // January 1, 2026
): (T & { dayOfWeek?: string; isWeekend?: boolean; isFuture?: boolean })[] => {
  return data.map((d, i) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const dayOfWeek = DAYS_OF_WEEK[date.getDay()];
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    // Determine if this date is in the future
    const isFuture = date > CURRENT_DATE;
    return { ...d, dayOfWeek, isWeekend, isFuture };
  });
};

// ==================== REVENUE SZ CHART DATA BY PERIOD ====================

export const revenueSzChartDataByPeriod: Record<FilterPeriod, (typeof revenueSzDailyChartData[0] & { dayOfWeek?: string; isWeekend?: boolean })[]> = expandClientPeriods({
  'day': generateDayChartData(132500), // Average of 95K-170K range
  '3days': generateThreeDaysChartData(95000, 170000),
  'month': addDayOfWeekToChartData(revenueSzDailyChartData),
  'year': generateYearChartData(3500000),
  '30clients': revenueSzDailyChartData.slice(0, 30).map((d, i) => ({
    ...d,
    date: `${i + 1}`,
    value: Math.round(d.value * 0.8 + seededRandom(i * 23) * 30000),
  })),
});

// ==================== AVG PRICE CHART DATA BY PERIOD ====================

// Generate average price data for a single day (non-cumulative metric - plan stays constant)
const generateAvgPriceDayChartData = (dailyPlan: number) => {
  const workHours = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
  
  return workHours.map(hour => {
    // Average price fluctuates around the plan (±20%)
    const variance = (Math.random() - 0.5) * 0.4;
    const value = Math.round(dailyPlan * (1 + variance));
    
    return {
      date: `${hour.toString().padStart(2, '0')}:00`,
      value,
      plan: dailyPlan // Plan stays constant for average metrics
    };
  });
};

export const avgPriceChartDataByPeriod: Record<FilterPeriod, (typeof avgPriceDailyChartData[0] & { dayOfWeek?: string; isWeekend?: boolean })[]> = expandClientPeriods({
  'day': generateAvgPriceDayChartData(20000), // Plan is 20000 ₽ per order
  '3days': [
    { date: 'Вчера', value: 19200, plan: 20000 },
    { date: 'Позавчера', value: 21500, plan: 20000 },
    { date: 'Сегодня', value: 18800, plan: 20000 },
  ],
  'month': addDayOfWeekToChartData(avgPriceDailyChartData),
  'year': generateYearChartData(20000).map(d => ({
    ...d,
    value: 15000 + Math.round(d.value / 400),
    plan: 20000
  })),
  '30clients': avgPriceDailyChartData.slice(0, 30).map((d, i) => ({
    ...d,
    date: `${i + 1}`,
    value: 15000 + Math.round(Math.random() * 10000),
  })),
});

// ==================== LEADER METRICS BY PERIOD ====================

const scaleMetrics = (
  metrics: FullWidthKPIMetric[], 
  currentScale: number, 
  planScale: number,
  forecastAdjust: number = 0
): FullWidthKPIMetric[] => {
  return metrics.map(m => {
    const newCurrent = m.unit === '%' ? m.current : Math.round(m.current * currentScale);
    const newPlan = m.unit === '%' ? m.plan : Math.round(m.plan * planScale);
    const newForecast = Math.max(0, Math.min(150, (m.forecast || 0) + forecastAdjust));
    
    return {
      ...m,
      current: newCurrent,
      plan: newPlan,
      forecast: newForecast,
      forecastValue: m.forecastLabel === 'deviation' 
        ? Math.round((newCurrent / newPlan) * 100) - 100
        : newForecast,
      loss: m.loss ? Math.round(m.loss * planScale) : undefined,
      reserve: m.reserve ? Math.round(m.reserve * planScale) : undefined,
    };
  });
};

export const leaderMetricsByPeriodExtended: Record<FilterPeriod, FullWidthKPIMetric[]> = expandClientPeriods({
  'day': scaleMetrics(leaderTopMetrics, 0.033, 0.033, -5), // 1/30 of month
  '3days': scaleMetrics(leaderTopMetrics, 0.1, 0.1, -3),   // 3/30 of month
  'month': leaderTopMetrics,
  'year': scaleMetrics(leaderTopMetrics, 12, 12, 2),      // 12x month
  '30clients': scaleMetrics(leaderTopMetrics, 0.3, 0.3, 5),
});

export const employeeMetricsByPeriodExtended: Record<FilterPeriod, FullWidthKPIMetric[]> = expandClientPeriods({
  'day': scaleMetrics(employeeTopMetrics, 0.033, 0.033, -5),
  '3days': scaleMetrics(employeeTopMetrics, 0.1, 0.1, -3),
  'month': employeeTopMetrics,
  'year': scaleMetrics(employeeTopMetrics, 12, 12, 2),
  '30clients': scaleMetrics(employeeTopMetrics, 0.3, 0.3, 5),
});

// ==================== CONVERSIONS BY PERIOD ====================

const scaleConversions = (
  conversions: ConversionDetailData[], 
  scale: number,
  valueAdjust: number = 0
): ConversionDetailData[] => {
  return conversions.map(c => ({
    ...c,
    value: Math.max(0, Math.min(100, c.value + valueAdjust)),
    inputFact: Math.round(c.inputFact * scale),
    inputPlan: Math.round(c.inputPlan * scale),
    outputFact: Math.round(c.outputFact * scale),
    outputPlan: Math.round(c.outputPlan * scale),
    lostCount: Math.round(c.lostCount * scale),
    lostAmount: Math.round(c.lostAmount * scale),
  }));
};

export const revenueSzConversionsByPeriod: Record<FilterPeriod, ConversionDetailData[]> = expandClientPeriods({
  'day': scaleConversions(revenueSzConversionsDetailed, 0.033, -3),
  '3days': scaleConversions(revenueSzConversionsDetailed, 0.1, -2),
  'month': revenueSzConversionsDetailed,
  'year': scaleConversions(revenueSzConversionsDetailed, 12, 3),
  '30clients': scaleConversions(revenueSzConversionsDetailed, 0.2, 0),
});

// ==================== MANAGERS ON SHIFT BY PERIOD ====================

const scaleManagersDetail = (
  managers: ManagerCardData[], 
  scale: number
): ManagerCardData[] => {
  return managers.map(m => ({
    ...m,
    createdOrders: Math.round(m.createdOrders * scale),
    createdOrdersPlan: Math.round(m.createdOrdersPlan * scale),
    closedOrders: Math.round(m.closedOrders * scale),
    closedOrdersPlan: Math.round(m.closedOrdersPlan * scale),
    losses: Math.round(m.losses * scale),
  }));
};

export const revenueSzManagersByPeriod: Record<FilterPeriod, ManagerCardData[]> = expandClientPeriods({
  'day': scaleManagersDetail(revenueSzManagersDetail, 0.033),
  '3days': scaleManagersDetail(revenueSzManagersDetail, 0.1),
  'month': revenueSzManagersDetail,
  'year': scaleManagersDetail(revenueSzManagersDetail, 12),
  '30clients': scaleManagersDetail(revenueSzManagersDetail, 0.2),
});

// ==================== MANAGER RANKING DATA BY PERIOD ====================

export interface ManagerRankingDataByPeriod {
  managers: typeof managersData;
  optometrists: typeof optometristsData;
  avgPriceManagers: typeof avgPriceManagersData;
}

const scaleManagerKPIMetrics = (
  managers: typeof managersData,
  currentScale: number,
  planScale: number
): typeof managersData => {
  const result: typeof managersData = {};
  
  for (const [key, manager] of Object.entries(managers)) {
    result[key] = {
      ...manager,
      lostRevenue: Math.round(manager.lostRevenue * planScale),
      metricsLevel1: manager.metricsLevel1.map(m => ({
        ...m,
        current: m.unit === '%' ? m.current : Math.round(m.current * currentScale),
        plan: m.unit === '%' ? m.plan : Math.round(m.plan * planScale),
        reserve: m.reserve ? Math.round(m.reserve * planScale) : undefined,
      })),
      metricsLevel2: manager.metricsLevel2.map(m => ({
        ...m,
        current: m.unit === '%' ? m.current : Math.round(m.current * currentScale),
        plan: m.unit === '%' ? m.plan : Math.round(m.plan * planScale),
        reserve: m.reserve ? Math.round(m.reserve * planScale) : undefined,
      })),
    };
  }
  
  return result;
};

const scaleOptometristMetrics = (
  optometrists: typeof optometristsData,
  currentScale: number,
  planScale: number
): typeof optometristsData => {
  const result: typeof optometristsData = {};
  
  for (const [key, opt] of Object.entries(optometrists)) {
    result[key] = {
      ...opt,
      lostRevenue: Math.round(opt.lostRevenue * planScale),
      metricsLevel1: opt.metricsLevel1.map(m => ({
        ...m,
        current: m.unit === '%' ? m.current : Math.round(m.current * currentScale),
        plan: m.unit === '%' ? m.plan : Math.round(m.plan * planScale),
      })),
    };
  }
  
  return result;
};

const scaleAvgPriceManagers = (
  managers: typeof avgPriceManagersData,
  scale: number
): typeof avgPriceManagersData => {
  return managers.map(m => ({
    ...m,
    lostRevenue: Math.round(m.lostRevenue * scale),
    glassesComplete: { ...m.glassesComplete, value: Math.round(m.glassesComplete.value * scale) },
    frame: { ...m.frame, value: Math.round(m.frame.value * scale) },
    manufacturing: { ...m.manufacturing, value: Math.round(m.manufacturing.value * scale) },
    lens: { ...m.lens, value: Math.round(m.lens.value * scale) },
    designShare: m.designShare, // percentage stays same
    designLens: m.designLens,   // percentage stays same
  }));
};

export const managersDataByPeriod: Record<FilterPeriod, typeof managersData> = expandClientPeriods({
  'day': scaleManagerKPIMetrics(managersData, 0.033, 0.033),
  '3days': scaleManagerKPIMetrics(managersData, 0.1, 0.1),
  'month': managersData,
  'year': scaleManagerKPIMetrics(managersData, 12, 12),
  '30clients': scaleManagerKPIMetrics(managersData, 0.3, 0.3),
});

export const optometristsDataByPeriod: Record<FilterPeriod, typeof optometristsData> = expandClientPeriods({
  'day': scaleOptometristMetrics(optometristsData, 0.033, 0.033),
  '3days': scaleOptometristMetrics(optometristsData, 0.1, 0.1),
  'month': optometristsData,
  'year': scaleOptometristMetrics(optometristsData, 12, 12),
  '30clients': scaleOptometristMetrics(optometristsData, 0.3, 0.3),
});

export const avgPriceManagersDataByPeriod: Record<FilterPeriod, typeof avgPriceManagersData> = expandClientPeriods({
  'day': scaleAvgPriceManagers(avgPriceManagersData, 0.033),
  '3days': scaleAvgPriceManagers(avgPriceManagersData, 0.1),
  'month': avgPriceManagersData,
  'year': scaleAvgPriceManagers(avgPriceManagersData, 12),
  '30clients': scaleAvgPriceManagers(avgPriceManagersData, 0.3),
});

// ==================== CHART AXIS LABELS BY PERIOD ====================

export const chartAxisConfig: Record<FilterPeriod, { 
  xAxisLabel: string; 
  title: string;
  tickInterval?: number;
}> = expandClientPeriods({
  'day': { xAxisLabel: 'Час', title: 'Динамика за день', tickInterval: 6 },
  '3days': { xAxisLabel: 'День', title: 'Динамика за 3 дня' },
  'month': { xAxisLabel: 'День', title: 'Динамика за месяц', tickInterval: 10 },
  'year': { xAxisLabel: 'Месяц', title: 'Динамика за год' },
  '30clients': { xAxisLabel: 'Клиент', title: 'По клиентам', tickInterval: 10 },
});

// ==================== LOSS BREAKDOWN BY PERIOD ====================

export const revenueSzLossBreakdownByPeriod: Record<FilterPeriod, typeof revenueSzLossBreakdown> = expandClientPeriods({
  'day': {
    totalLoss: Math.round(revenueSzLossBreakdown.totalLoss / 30),
    employeeLoss: Math.round(revenueSzLossBreakdown.employeeLoss / 30),
    conversionLoss: Math.round(revenueSzLossBreakdown.conversionLoss / 30),
    arpcLoss: Math.round(revenueSzLossBreakdown.arpcLoss / 30),
    worstEmployee: revenueSzLossBreakdown.worstEmployee,
  },
  '3days': {
    totalLoss: Math.round(revenueSzLossBreakdown.totalLoss / 10),
    employeeLoss: Math.round(revenueSzLossBreakdown.employeeLoss / 10),
    conversionLoss: Math.round(revenueSzLossBreakdown.conversionLoss / 10),
    arpcLoss: Math.round(revenueSzLossBreakdown.arpcLoss / 10),
    worstEmployee: revenueSzLossBreakdown.worstEmployee,
  },
  'month': revenueSzLossBreakdown,
  'year': {
    totalLoss: revenueSzLossBreakdown.totalLoss * 12,
    employeeLoss: revenueSzLossBreakdown.employeeLoss * 12,
    conversionLoss: revenueSzLossBreakdown.conversionLoss * 12,
    arpcLoss: revenueSzLossBreakdown.arpcLoss * 12,
    worstEmployee: {
      ...revenueSzLossBreakdown.worstEmployee,
      loss: revenueSzLossBreakdown.worstEmployee.loss * 12,
    },
  },
  '30clients': {
    totalLoss: Math.round(revenueSzLossBreakdown.totalLoss * 0.3),
    employeeLoss: Math.round(revenueSzLossBreakdown.employeeLoss * 0.3),
    conversionLoss: Math.round(revenueSzLossBreakdown.conversionLoss * 0.3),
    arpcLoss: Math.round(revenueSzLossBreakdown.arpcLoss * 0.3),
    worstEmployee: revenueSzLossBreakdown.worstEmployee,
  },
});

// ==================== AVG PRICE LOSS BREAKDOWN BY PERIOD ====================

export const avgPriceLossBreakdownByPeriod: Record<FilterPeriod, typeof avgPriceLossBreakdown> = expandClientPeriods({
  'day': {
    totalLoss: Math.round(avgPriceLossBreakdown.totalLoss / 30),
    frameLoss: Math.round(avgPriceLossBreakdown.frameLoss / 30),
    lensLoss: Math.round(avgPriceLossBreakdown.lensLoss / 30),
    designLoss: Math.round(avgPriceLossBreakdown.designLoss / 30),
    manufacturingLoss: Math.round(avgPriceLossBreakdown.manufacturingLoss / 30),
  },
  '3days': {
    totalLoss: Math.round(avgPriceLossBreakdown.totalLoss / 10),
    frameLoss: Math.round(avgPriceLossBreakdown.frameLoss / 10),
    lensLoss: Math.round(avgPriceLossBreakdown.lensLoss / 10),
    designLoss: Math.round(avgPriceLossBreakdown.designLoss / 10),
    manufacturingLoss: Math.round(avgPriceLossBreakdown.manufacturingLoss / 10),
  },
  'month': avgPriceLossBreakdown,
  'year': {
    totalLoss: avgPriceLossBreakdown.totalLoss * 12,
    frameLoss: avgPriceLossBreakdown.frameLoss * 12,
    lensLoss: avgPriceLossBreakdown.lensLoss * 12,
    designLoss: avgPriceLossBreakdown.designLoss * 12,
    manufacturingLoss: avgPriceLossBreakdown.manufacturingLoss * 12,
  },
  '30clients': {
    totalLoss: Math.round(avgPriceLossBreakdown.totalLoss * 0.3),
    frameLoss: Math.round(avgPriceLossBreakdown.frameLoss * 0.3),
    lensLoss: Math.round(avgPriceLossBreakdown.lensLoss * 0.3),
    designLoss: Math.round(avgPriceLossBreakdown.designLoss * 0.3),
    manufacturingLoss: Math.round(avgPriceLossBreakdown.manufacturingLoss * 0.3),
  },
});

// ==================== AVG PRICE CATEGORIES BY PERIOD ====================

const scaleCategories = (
  categories: AvgPriceCategoryData[],
  currentScale: number,
  planScale: number
): AvgPriceCategoryData[] => {
  return categories.map(c => ({
    ...c,
    current: c.unit === '%' ? c.current : Math.round(c.current * currentScale),
    plan: c.unit === '%' ? c.plan : Math.round(c.plan * planScale),
  }));
};

export const avgPriceCategoriesByPeriod: Record<FilterPeriod, AvgPriceCategoryData[]> = expandClientPeriods({
  'day': scaleCategories(avgPriceCategories, 0.033, 0.033),
  '3days': scaleCategories(avgPriceCategories, 0.1, 0.1),
  'month': avgPriceCategories,
  'year': scaleCategories(avgPriceCategories, 12, 12),
  '30clients': scaleCategories(avgPriceCategories, 0.3, 0.3),
});

// ==================== REVENUE SZ STATS BY PERIOD (EXTENDED) ====================

import { ExpandableOrderStat, revenueSzStatsByPeriod as baseStatsByPeriod } from './mockData';

// Scale stats for new periods
const scaleStats = (
  stats: ExpandableOrderStat[],
  valueScale: number,
  planScale: number
): ExpandableOrderStat[] => {
  return stats.map(s => ({
    ...s,
    value: s.unit === '%' ? s.value : Math.round(s.value * valueScale),
    plan: s.unit === '%' ? s.plan : Math.round(s.plan * planScale),
    managers: s.managers?.map(m => ({
      ...m,
      value: s.unit === '%' ? m.value : Math.round(m.value * valueScale),
      plan: s.unit === '%' ? m.plan : Math.round(m.plan * planScale),
    })),
    breakdown: s.breakdown?.map(b => ({
      ...b,
      value: Math.round(b.value * valueScale),
      plan: Math.round(b.plan * planScale),
    })),
  }));
};

export const revenueSzStatsByPeriodExtended: Record<FilterPeriod, ExpandableOrderStat[]> = expandClientPeriods({
  'day': scaleStats(baseStatsByPeriod['month'] || [], 0.033, 0.033),
  '3days': baseStatsByPeriod['3days'] || [],
  'month': baseStatsByPeriod['month'] || [],
  'year': scaleStats(baseStatsByPeriod['month'] || [], 12, 12),
  '30clients': baseStatsByPeriod['30clients'] || [],
});

// ==================== CLIENTS (ФЛ) DATA BY PERIOD ====================

interface ClientSegmentManager {
  id: string;
  name: string;
  count: number;
  plan: number;
  conversionValue: number;
  conversionTarget: number;
}

interface ClientSegment {
  id: string;
  name: string;
  count: number;
  plan: number;
  conversionValue: number;
  conversionTarget: number;
  managers: ClientSegmentManager[];
}

interface TrafficSource {
  id: string;
  name: string;
  count: number;
  percentage: number;
  trend?: 'up' | 'down' | 'stable';
  previousPeriodCount?: number;
}

interface LcaManager {
  id: string;
  name: string;
  avatar?: string;
  clientsWithoutLca: number;
  installations: number;
  conversionValue: number;
}

interface LcaData {
  clientsWithoutLca: number;
  installations: number;
  conversionValue: number;
  conversionTarget: number;
  managers: LcaManager[];
}

interface ClientManagerData {
  id: string;
  name: string;
  avatar?: string;
  planPercent: number;
  clientsCount: number;
}

interface ClientsRankingRow {
  id: string;
  rank: number;
  name: string;
  avatar?: string;
  planPercent: number;
  total: { value: number; plan: number };
  newClients: { value: number; plan: number };
  repeatClients: { value: number; plan: number };
  oldCheck: { value: number; plan: number };
  lcaInstallations: { value: number; plan: number };
}

// Base managers data for clients
const baseClientManagers: ClientSegmentManager[] = [
  { id: 'elena_novikova', name: 'Елена Новикова', count: 35, plan: 40, conversionValue: 48, conversionTarget: 45 },
  { id: 'anna_petrova', name: 'Анна Петрова', count: 28, plan: 35, conversionValue: 38, conversionTarget: 45 },
  { id: 'maria_kozlova', name: 'Мария Козлова', count: 42, plan: 45, conversionValue: 52, conversionTarget: 45 },
  { id: 'ivan_sidorov', name: 'Иван Сидоров', count: 18, plan: 30, conversionValue: 32, conversionTarget: 45 },
  { id: 'dmitry_volkov', name: 'Дмитрий Волков', count: 33, plan: 35, conversionValue: 44, conversionTarget: 45 },
];

// Base client segments
const baseClientSegments: ClientSegment[] = [
  {
    id: 'new',
    name: 'Новые клиенты',
    count: 56,
    plan: 80,
    conversionValue: 42,
    conversionTarget: 50,
    managers: baseClientManagers.map(m => ({ ...m, count: Math.round(m.count * 0.35), plan: Math.round(m.plan * 0.35) })),
  },
  {
    id: 'repeat',
    name: 'Повторные клиенты',
    count: 68,
    plan: 70,
    conversionValue: 65,
    conversionTarget: 60,
    managers: baseClientManagers.map(m => ({ ...m, count: Math.round(m.count * 0.45), plan: Math.round(m.plan * 0.38), conversionValue: m.conversionValue + 20 })),
  },
  {
    id: 'old_check',
    name: 'Проверка >6 месяцев',
    count: 32,
    plan: 50,
    conversionValue: 38,
    conversionTarget: 45,
    managers: baseClientManagers.map(m => ({ ...m, count: Math.round(m.count * 0.2), plan: Math.round(m.plan * 0.27) })),
  },
];

const scaleClientSegments = (segments: ClientSegment[], scale: number): ClientSegment[] => {
  return segments.map(s => ({
    ...s,
    count: Math.round(s.count * scale),
    plan: Math.round(s.plan * scale),
    managers: s.managers.map(m => ({
      ...m,
      count: Math.round(m.count * scale),
      plan: Math.round(m.plan * scale),
    })),
  }));
};

export const clientSegmentsByPeriod: Record<FilterPeriod, ClientSegment[]> = expandClientPeriods({
  'day': scaleClientSegments(baseClientSegments, 0.033),
  '3days': scaleClientSegments(baseClientSegments, 0.1),
  'month': baseClientSegments,
  'year': scaleClientSegments(baseClientSegments, 12),
  '30clients': scaleClientSegments(baseClientSegments, 0.2),
});

// Base traffic sources
const baseTrafficSources: TrafficSource[] = [
  { id: 'walk_in', name: 'Самоходы', count: 89, percentage: 45, trend: 'up' },
  { id: 'online', name: 'Онлайн', count: 34, percentage: 22, trend: 'up' },
  { id: 'calls', name: 'Звонки', count: 21, percentage: 13, trend: 'stable' },
  { id: 'referral', name: 'По рекомендации', count: 12, percentage: 8, trend: 'up' },
  { id: 'doctors', name: 'От врачей', count: 8, percentage: 5, trend: 'down' },
  { id: 'other', name: 'Другие', count: 11, percentage: 7, trend: 'stable' },
];

const scaleTrafficSources = (sources: TrafficSource[], scale: number): TrafficSource[] => {
  return sources.map(s => ({
    ...s,
    count: Math.round(s.count * scale),
  }));
};

export const trafficSourcesByPeriod: Record<FilterPeriod, TrafficSource[]> = expandClientPeriods({
  'day': scaleTrafficSources(baseTrafficSources, 0.033),
  '3days': scaleTrafficSources(baseTrafficSources, 0.1),
  'month': baseTrafficSources,
  'year': scaleTrafficSources(baseTrafficSources, 12),
  '30clients': scaleTrafficSources(baseTrafficSources, 0.2),
});

// Base LCA data
const baseLcaManagers: LcaManager[] = [
  { id: 'elena_novikova', name: 'Елена Новикова', clientsWithoutLca: 25, installations: 15, conversionValue: 60 },
  { id: 'anna_petrova', name: 'Анна Петрова', clientsWithoutLca: 30, installations: 10, conversionValue: 33 },
  { id: 'maria_kozlova', name: 'Мария Козлова', clientsWithoutLca: 18, installations: 14, conversionValue: 78 },
  { id: 'ivan_sidorov', name: 'Иван Сидоров', clientsWithoutLca: 22, installations: 8, conversionValue: 36 },
  { id: 'dmitry_volkov', name: 'Дмитрий Волков', clientsWithoutLca: 20, installations: 12, conversionValue: 60 },
];

const baseLcaData: LcaData = {
  clientsWithoutLca: 115,
  installations: 59,
  conversionValue: 51,
  conversionTarget: 60,
  managers: baseLcaManagers,
};

const scaleLcaData = (data: LcaData, scale: number): LcaData => ({
  ...data,
  clientsWithoutLca: Math.round(data.clientsWithoutLca * scale),
  installations: Math.round(data.installations * scale),
  managers: data.managers.map(m => ({
    ...m,
    clientsWithoutLca: Math.round(m.clientsWithoutLca * scale),
    installations: Math.round(m.installations * scale),
  })),
});

export const lcaDataByPeriod: Record<FilterPeriod, LcaData> = expandClientPeriods({
  'day': scaleLcaData(baseLcaData, 0.033),
  '3days': scaleLcaData(baseLcaData, 0.1),
  'month': baseLcaData,
  'year': scaleLcaData(baseLcaData, 12),
  '30clients': scaleLcaData(baseLcaData, 0.2),
});

// Clients chart data
// Extended clients chart data with revenue
export interface ClientsChartDataPoint {
  date: string;
  value: number;
  plan: number;
  revenue: number;
  revenuePlan: number;
  dayOfWeek?: string;
  isWeekend?: boolean;
}

const AVG_CHECK = 16500; // Average check value

const generateClientsChartData = (basePlan: number): ClientsChartDataPoint[] => {
  return Array.from({ length: 30 }, (_, i) => {
    const variance = (Math.random() - 0.45) * 0.4;
    const startDate = new Date(2024, 11, 1);
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const dayOfWeek = DAYS_OF_WEEK[date.getDay()];
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const value = Math.round(basePlan * (1 + variance));
    return {
      date: `${i + 1}`,
      value,
      plan: basePlan,
      revenue: value * AVG_CHECK,
      revenuePlan: basePlan * AVG_CHECK,
      dayOfWeek,
      isWeekend,
    };
  });
};

export const clientsChartDataByPeriod: Record<FilterPeriod, ClientsChartDataPoint[]> = expandClientPeriods({
  'day': generateDayChartData(7).map(d => {
    const value = Math.round(d.value / 16667);
    const plan = Math.round((d.plan || 0) / 16667);
    return { ...d, value, plan, revenue: value * AVG_CHECK, revenuePlan: plan * AVG_CHECK };
  }),
  '3days': [
    { date: 'Вчера', value: 6, plan: 7, revenue: 6 * AVG_CHECK, revenuePlan: 7 * AVG_CHECK },
    { date: 'Позавчера', value: 8, plan: 7, revenue: 8 * AVG_CHECK, revenuePlan: 7 * AVG_CHECK },
    { date: 'Сегодня', value: 5, plan: 7, revenue: 5 * AVG_CHECK, revenuePlan: 7 * AVG_CHECK },
  ],
  'month': generateClientsChartData(7),
  'year': generateYearChartData(200).map(d => {
    const value = Math.round(d.value / 17500);
    const plan = Math.round(d.plan / 17500) + 6;
    return { ...d, value, plan, revenue: value * AVG_CHECK, revenuePlan: plan * AVG_CHECK };
  }),
  '30clients': Array.from({ length: 30 }, (_, i) => ({
    date: `${i + 1}`,
    value: Math.random() > 0.5 ? 1 : 0,
    plan: 1,
    revenue: (Math.random() > 0.5 ? 1 : 0) * AVG_CHECK,
    revenuePlan: AVG_CHECK,
  })),
});

// ==================== CLIENTS LOSS DATA ====================

export interface ClientsLossData {
  totalLoss: number;
  missedClients: number;
  avgCheck: number;
  planClients: number;
  factClients: number;
  planRevenue: number;
  factRevenue: number;
}

const calculateClientsLoss = (period: FilterPeriod): ClientsLossData => {
  const chartData = clientsChartDataByPeriod[period];
  const factClients = chartData.reduce((sum, d) => sum + d.value, 0);
  const planClients = chartData.reduce((sum, d) => sum + (d.plan || 0), 0);
  const factRevenue = chartData.reduce((sum, d) => sum + d.revenue, 0);
  const planRevenue = chartData.reduce((sum, d) => sum + d.revenuePlan, 0);
  const missedClients = Math.max(0, planClients - factClients);
  
  return {
    totalLoss: missedClients * AVG_CHECK,
    missedClients,
    avgCheck: AVG_CHECK,
    planClients,
    factClients,
    planRevenue,
    factRevenue,
  };
};

export const clientsLossByPeriod: Record<FilterPeriod, ClientsLossData> = expandClientPeriods({
  'day': calculateClientsLoss('day'),
  '3days': calculateClientsLoss('3days'),
  'month': calculateClientsLoss('month'),
  'year': calculateClientsLoss('year'),
  '30clients': calculateClientsLoss('30clients'),
});

// Clients managers on shift
const baseClientsManagers: ClientManagerData[] = [
  { id: 'elena_novikova', name: 'Елена Новикова', planPercent: 88, clientsCount: 35 },
  { id: 'anna_petrova', name: 'Анна Петрова', planPercent: 80, clientsCount: 28 },
  { id: 'maria_kozlova', name: 'Мария Козлова', planPercent: 93, clientsCount: 42 },
  { id: 'ivan_sidorov', name: 'Иван Сидоров', planPercent: 60, clientsCount: 18 },
  { id: 'dmitry_volkov', name: 'Дмитрий Волков', planPercent: 94, clientsCount: 33 },
];

const scaleClientsManagers = (managers: ClientManagerData[], scale: number): ClientManagerData[] => {
  return managers.map(m => ({
    ...m,
    clientsCount: Math.max(1, Math.round(m.clientsCount * scale)),
  }));
};

export const clientsManagersByPeriod: Record<FilterPeriod, ClientManagerData[]> = expandClientPeriods({
  'day': scaleClientsManagers(baseClientsManagers, 0.033),
  '3days': scaleClientsManagers(baseClientsManagers, 0.1),
  'month': baseClientsManagers,
  'year': scaleClientsManagers(baseClientsManagers, 12),
  '30clients': scaleClientsManagers(baseClientsManagers, 0.2),
});

// Clients ranking data
const baseClientsRanking: ClientsRankingRow[] = [
  {
    id: 'elena_novikova', rank: 1, name: 'Елена Новикова',
    planPercent: 88,
    total: { value: 35, plan: 40 },
    newClients: { value: 12, plan: 14 },
    repeatClients: { value: 16, plan: 15 },
    oldCheck: { value: 7, plan: 11 },
    lcaInstallations: { value: 15, plan: 18 },
  },
  {
    id: 'anna_petrova', rank: 2, name: 'Анна Петрова',
    planPercent: 80,
    total: { value: 28, plan: 35 },
    newClients: { value: 10, plan: 12 },
    repeatClients: { value: 12, plan: 13 },
    oldCheck: { value: 6, plan: 10 },
    lcaInstallations: { value: 10, plan: 15 },
  },
  {
    id: 'maria_kozlova', rank: 3, name: 'Мария Козлова',
    planPercent: 93,
    total: { value: 42, plan: 45 },
    newClients: { value: 15, plan: 16 },
    repeatClients: { value: 18, plan: 17 },
    oldCheck: { value: 9, plan: 12 },
    lcaInstallations: { value: 14, plan: 16 },
  },
  {
    id: 'ivan_sidorov', rank: 4, name: 'Иван Сидоров',
    planPercent: 60,
    total: { value: 18, plan: 30 },
    newClients: { value: 6, plan: 10 },
    repeatClients: { value: 8, plan: 12 },
    oldCheck: { value: 4, plan: 8 },
    lcaInstallations: { value: 8, plan: 14 },
  },
  {
    id: 'dmitry_volkov', rank: 5, name: 'Дмитрий Волков',
    planPercent: 94,
    total: { value: 33, plan: 35 },
    newClients: { value: 13, plan: 12 },
    repeatClients: { value: 14, plan: 13 },
    oldCheck: { value: 6, plan: 10 },
    lcaInstallations: { value: 12, plan: 12 },
  },
];

const scaleClientsRanking = (rows: ClientsRankingRow[], scale: number): ClientsRankingRow[] => {
  return rows.map(r => ({
    ...r,
    total: { value: Math.round(r.total.value * scale), plan: Math.round(r.total.plan * scale) },
    newClients: { value: Math.round(r.newClients.value * scale), plan: Math.round(r.newClients.plan * scale) },
    repeatClients: { value: Math.round(r.repeatClients.value * scale), plan: Math.round(r.repeatClients.plan * scale) },
    oldCheck: { value: Math.round(r.oldCheck.value * scale), plan: Math.round(r.oldCheck.plan * scale) },
    lcaInstallations: { value: Math.round(r.lcaInstallations.value * scale), plan: Math.round(r.lcaInstallations.plan * scale) },
  }));
};

export const clientsRankingByPeriod: Record<FilterPeriod, ClientsRankingRow[]> = expandClientPeriods({
  'day': scaleClientsRanking(baseClientsRanking, 0.033),
  '3days': scaleClientsRanking(baseClientsRanking, 0.1),
  'month': baseClientsRanking,
  'year': scaleClientsRanking(baseClientsRanking, 12),
  '30clients': scaleClientsRanking(baseClientsRanking, 0.2),
});

// ==================== LENS MATRIX DATA ====================

// Lens Matrix types - Dynamic 6 indices × 4 segments
export type LensSegment = 'A' | 'B' | 'C' | 'D';
export type LensIndex = '1.74' | '1.67' | '1.60' | '1.59' | '1.56' | '1.50';
export type LensCell = 'AA' | 'AB' | 'AC' | 'BA' | 'BB' | 'BC' | 'CA' | 'CB' | 'CC'; // Legacy
export type LensCellKey = `${LensIndex}_${LensSegment}`;
export type LensOrderType = 'stock' | 'recipe' | 'all';

// New: Index groups for 3×4 matrix
export type IndexGroup = 'X' | 'Y' | 'Z';
export type GroupCellKey = `${IndexGroup}_${LensSegment}`;

export const LENS_SEGMENTS: LensSegment[] = ['A', 'B', 'C', 'D'];
export const LENS_INDICES: LensIndex[] = ['1.74', '1.67', '1.60', '1.59', '1.56', '1.50'];
export const INDEX_GROUPS: IndexGroup[] = ['X', 'Y', 'Z'];

export const SEGMENT_LABELS: Record<LensSegment, string> = {
  A: 'Премиум',
  B: 'Бизнес',
  C: 'Стандарт',
  D: 'Эконом',
};

export const INDEX_GROUP_LABELS: Record<IndexGroup, string> = {
  X: '1.67–1.74',
  Y: '1.59–1.60',
  Z: '1.50–1.56',
};

export const INDEX_GROUP_MAPPING: Record<IndexGroup, LensIndex[]> = {
  X: ['1.74', '1.67'],
  Y: ['1.60', '1.59'],
  Z: ['1.56', '1.50'],
};

export interface LensMatrixCell {
  segment: LensSegment;
  index: LensIndex;
  percent: number;
  avgPrice: number;
  count: number;
}

export interface AggregatedLensCell {
  group: IndexGroup;
  segment: LensSegment;
  percent: number;
  avgPrice: number;
  count: number;
}

// Matrix cell data with percent, avgPrice and count
export interface MatrixCellData {
  percent: number;
  avgPrice: number;
  count: number;
}

// Matrix distribution for all 12 coordinates (3 groups × 4 segments)
export interface MatrixDistribution {
  XA: MatrixCellData; XB: MatrixCellData; XC: MatrixCellData; XD: MatrixCellData;
  YA: MatrixCellData; YB: MatrixCellData; YC: MatrixCellData; YD: MatrixCellData;
  ZA: MatrixCellData; ZB: MatrixCellData; ZC: MatrixCellData; ZD: MatrixCellData;
}

export type MatrixCoordinate = keyof MatrixDistribution;

export const MATRIX_COORDINATES: MatrixCoordinate[] = [
  'XA', 'XB', 'XC', 'XD',
  'YA', 'YB', 'YC', 'YD',
  'ZA', 'ZB', 'ZC', 'ZD',
];

export function getTopMatrixCoordinates(dist: MatrixDistribution, limit = 4): [MatrixCoordinate, number][] {
  return (Object.entries(dist) as [MatrixCoordinate, MatrixCellData][])
    .filter(([_, cell]) => cell.percent > 0)
    .sort((a, b) => b[1].percent - a[1].percent)
    .slice(0, limit)
    .map(([key, cell]) => [key, cell.percent]);
}

export function getCoordinateSegment(coord: MatrixCoordinate): LensSegment {
  return coord.charAt(1) as LensSegment;
}

export interface LensManagerData {
  id: string;
  name: string;
  topSegment: LensSegment;
  topSegmentPercent: number;
  avgLensPrice: number;
  stockPercent: number;
  lossAmount: number;
  lossReason: string;
  matrixDistribution: MatrixDistribution;
}

export interface LensMatrixData {
  matrix: Record<LensCellKey, LensMatrixCell>;
  stockPercent: number;
  recipePercent: number;
  totalOrders: number;
  avgLensPrice: number;
  planAvgPrice: number;
  managers: LensManagerData[];
}

// Helper to create cell key
export const makeLensCellKey = (index: LensIndex, segment: LensSegment): LensCellKey => 
  `${index}_${segment}`;

export const makeGroupCellKey = (group: IndexGroup, segment: LensSegment): GroupCellKey =>
  `${group}_${segment}`;

export function aggregateLensMatrix(
  matrix: Record<LensCellKey, LensMatrixCell>
): Record<GroupCellKey, AggregatedLensCell> {
  const result = {} as Record<GroupCellKey, AggregatedLensCell>;

  for (const group of INDEX_GROUPS) {
    for (const segment of LENS_SEGMENTS) {
      const indices = INDEX_GROUP_MAPPING[group];
      const cells = indices.map(index => matrix[`${index}_${segment}` as LensCellKey]);

      const totalCount = cells.reduce((sum, c) => sum + c.count, 0);
      const totalPercent = cells.reduce((sum, c) => sum + c.percent, 0);
      
      const weightedPrice = totalCount > 0
        ? cells.reduce((sum, c) => sum + c.avgPrice * c.count, 0) / totalCount
        : 0;

      const key = makeGroupCellKey(group, segment);
      result[key] = {
        group,
        segment,
        percent: totalPercent,
        avgPrice: Math.round(weightedPrice),
        count: totalCount,
      };
    }
  }

  return result;
}

// Base data with 6 indices × 4 segments
const baseLensMatrixData: LensMatrixData = {
  matrix: {
    // Index 1.74
    '1.74_A': { segment: 'A', index: '1.74', percent: 8, avgPrice: 14000, count: 24 },
    '1.74_B': { segment: 'B', index: '1.74', percent: 5, avgPrice: 11000, count: 15 },
    '1.74_C': { segment: 'C', index: '1.74', percent: 2, avgPrice: 8500, count: 6 },
    '1.74_D': { segment: 'D', index: '1.74', percent: 0, avgPrice: 0, count: 0 },
    // Index 1.67
    '1.67_A': { segment: 'A', index: '1.67', percent: 12, avgPrice: 12000, count: 36 },
    '1.67_B': { segment: 'B', index: '1.67', percent: 15, avgPrice: 9000, count: 45 },
    '1.67_C': { segment: 'C', index: '1.67', percent: 6, avgPrice: 6500, count: 18 },
    '1.67_D': { segment: 'D', index: '1.67', percent: 2, avgPrice: 4500, count: 6 },
    // Index 1.60
    '1.60_A': { segment: 'A', index: '1.60', percent: 5, avgPrice: 10000, count: 15 },
    '1.60_B': { segment: 'B', index: '1.60', percent: 10, avgPrice: 7500, count: 30 },
    '1.60_C': { segment: 'C', index: '1.60', percent: 8, avgPrice: 5000, count: 24 },
    '1.60_D': { segment: 'D', index: '1.60', percent: 3, avgPrice: 3500, count: 9 },
    // Index 1.59
    '1.59_A': { segment: 'A', index: '1.59', percent: 2, avgPrice: 9000, count: 6 },
    '1.59_B': { segment: 'B', index: '1.59', percent: 4, avgPrice: 6000, count: 12 },
    '1.59_C': { segment: 'C', index: '1.59', percent: 5, avgPrice: 4000, count: 15 },
    '1.59_D': { segment: 'D', index: '1.59', percent: 2, avgPrice: 2800, count: 6 },
    // Index 1.56
    '1.56_A': { segment: 'A', index: '1.56', percent: 1, avgPrice: 8000, count: 3 },
    '1.56_B': { segment: 'B', index: '1.56', percent: 2, avgPrice: 5500, count: 6 },
    '1.56_C': { segment: 'C', index: '1.56', percent: 3, avgPrice: 3500, count: 9 },
    '1.56_D': { segment: 'D', index: '1.56', percent: 2, avgPrice: 2500, count: 6 },
    // Index 1.50
    '1.50_A': { segment: 'A', index: '1.50', percent: 0, avgPrice: 0, count: 0 },
    '1.50_B': { segment: 'B', index: '1.50', percent: 1, avgPrice: 4000, count: 3 },
    '1.50_C': { segment: 'C', index: '1.50', percent: 2, avgPrice: 2800, count: 6 },
    '1.50_D': { segment: 'D', index: '1.50', percent: 2, avgPrice: 2000, count: 6 },
  },
  stockPercent: 65,
  recipePercent: 35,
  totalOrders: 300,
  avgLensPrice: 7200,
  planAvgPrice: 8500,
  managers: [
    { 
      id: 'elena_novikova', name: 'Елена Новикова', topSegment: 'A', topSegmentPercent: 55, 
      avgLensPrice: 10500, stockPercent: 20, lossAmount: 0, lossReason: '',
      matrixDistribution: { 
        XA: { percent: 30, avgPrice: 14500, count: 9 }, XB: { percent: 15, avgPrice: 11200, count: 5 }, XC: { percent: 5, avgPrice: 8800, count: 2 }, XD: { percent: 0, avgPrice: 0, count: 0 },
        YA: { percent: 20, avgPrice: 10200, count: 6 }, YB: { percent: 10, avgPrice: 7800, count: 3 }, YC: { percent: 5, avgPrice: 5200, count: 2 }, YD: { percent: 0, avgPrice: 0, count: 0 },
        ZA: { percent: 5, avgPrice: 8500, count: 2 }, ZB: { percent: 5, avgPrice: 5800, count: 2 }, ZC: { percent: 5, avgPrice: 3600, count: 2 }, ZD: { percent: 0, avgPrice: 0, count: 0 }
      }
    },
    { 
      id: 'anna_petrova', name: 'Анна Петрова', topSegment: 'B', topSegmentPercent: 45, 
      avgLensPrice: 7000, stockPercent: 55, lossAmount: 32000, lossReason: 'Низкий индекс',
      matrixDistribution: { 
        XA: { percent: 5, avgPrice: 13800, count: 2 }, XB: { percent: 20, avgPrice: 10500, count: 6 }, XC: { percent: 15, avgPrice: 8200, count: 5 }, XD: { percent: 5, avgPrice: 5500, count: 2 },
        YA: { percent: 5, avgPrice: 9800, count: 2 }, YB: { percent: 15, avgPrice: 7200, count: 5 }, YC: { percent: 10, avgPrice: 4800, count: 3 }, YD: { percent: 5, avgPrice: 3200, count: 2 },
        ZA: { percent: 5, avgPrice: 8200, count: 2 }, ZB: { percent: 10, avgPrice: 5500, count: 3 }, ZC: { percent: 5, avgPrice: 3200, count: 2 }, ZD: { percent: 0, avgPrice: 0, count: 0 }
      }
    },
    { 
      id: 'maria_kozlova', name: 'Мария Козлова', topSegment: 'C', topSegmentPercent: 50, 
      avgLensPrice: 6800, stockPercent: 60, lossAmount: 45000, lossReason: 'Средний сегмент',
      matrixDistribution: { 
        XA: { percent: 5, avgPrice: 13500, count: 2 }, XB: { percent: 10, avgPrice: 10200, count: 3 }, XC: { percent: 20, avgPrice: 7800, count: 6 }, XD: { percent: 5, avgPrice: 5200, count: 2 },
        YA: { percent: 5, avgPrice: 9500, count: 2 }, YB: { percent: 10, avgPrice: 7000, count: 3 }, YC: { percent: 20, avgPrice: 4500, count: 6 }, YD: { percent: 5, avgPrice: 3000, count: 2 },
        ZA: { percent: 0, avgPrice: 0, count: 0 }, ZB: { percent: 5, avgPrice: 5200, count: 2 }, ZC: { percent: 10, avgPrice: 3000, count: 3 }, ZD: { percent: 5, avgPrice: 2200, count: 2 }
      }
    },
    { 
      id: 'ivan_sidorov', name: 'Иван Сидоров', topSegment: 'D', topSegmentPercent: 40, 
      avgLensPrice: 4200, stockPercent: 80, lossAmount: 78000, lossReason: 'Эконом сегмент',
      matrixDistribution: { 
        XA: { percent: 0, avgPrice: 0, count: 0 }, XB: { percent: 5, avgPrice: 9800, count: 2 }, XC: { percent: 10, avgPrice: 7500, count: 3 }, XD: { percent: 10, avgPrice: 5000, count: 3 },
        YA: { percent: 5, avgPrice: 9200, count: 2 }, YB: { percent: 5, avgPrice: 6800, count: 2 }, YC: { percent: 15, avgPrice: 4200, count: 5 }, YD: { percent: 15, avgPrice: 2800, count: 5 },
        ZA: { percent: 0, avgPrice: 0, count: 0 }, ZB: { percent: 5, avgPrice: 4800, count: 2 }, ZC: { percent: 15, avgPrice: 2800, count: 5 }, ZD: { percent: 15, avgPrice: 2000, count: 5 }
      }
    },
    { 
      id: 'dmitry_volkov', name: 'Дмитрий Волков', topSegment: 'A', topSegmentPercent: 48, 
      avgLensPrice: 9200, stockPercent: 30, lossAmount: 12000, lossReason: 'Можно повысить',
      matrixDistribution: { 
        XA: { percent: 25, avgPrice: 14200, count: 8 }, XB: { percent: 18, avgPrice: 10800, count: 5 }, XC: { percent: 7, avgPrice: 8500, count: 2 }, XD: { percent: 0, avgPrice: 0, count: 0 },
        YA: { percent: 18, avgPrice: 9800, count: 5 }, YB: { percent: 12, avgPrice: 7500, count: 4 }, YC: { percent: 8, avgPrice: 5000, count: 3 }, YD: { percent: 2, avgPrice: 3200, count: 1 },
        ZA: { percent: 5, avgPrice: 8200, count: 2 }, ZB: { percent: 2, avgPrice: 5500, count: 1 }, ZC: { percent: 0, avgPrice: 0, count: 0 }, ZD: { percent: 3, avgPrice: 2200, count: 1 }
      }
    },
  ],
};

const scaleLensMatrix = (data: LensMatrixData, scale: number): LensMatrixData => ({
  ...data,
  totalOrders: Math.round(data.totalOrders * scale),
  managers: data.managers.map(m => ({
    ...m,
    lossAmount: Math.round(m.lossAmount * scale),
  })),
  matrix: Object.fromEntries(
    Object.entries(data.matrix).map(([key, val]) => [
      key,
      { ...val, count: Math.round(val.count * scale) }
    ])
  ) as Record<LensCellKey, LensMatrixCell>,
});

export const lensMatrixDataByPeriod: Record<FilterPeriod, LensMatrixData> = expandClientPeriods({
  'day': scaleLensMatrix(baseLensMatrixData, 0.033),
  '3days': scaleLensMatrix(baseLensMatrixData, 0.1),
  'month': baseLensMatrixData,
  'year': scaleLensMatrix(baseLensMatrixData, 12),
  '30clients': scaleLensMatrix(baseLensMatrixData, 0.1),
});

// ==================== REVENUE ZZ (CLOSED ORDERS) DATA ====================

// Revenue ZZ chart data - similar structure to SZ but with cyan accent styling in mind
export const revenueZzChartDataByPeriod: Record<FilterPeriod, (typeof revenueSzDailyChartData[0] & { dayOfWeek?: string; isWeekend?: boolean })[]> = expandClientPeriods({
  'day': generateDayChartData(85000), // Daily plan for closed orders (~85% of SZ)
  '3days': generateThreeDaysChartData(80750, 144500), // 85% of SZ range
  'month': addDayOfWeekToChartData(revenueSzDailyChartData.map(d => ({
    ...d,
    value: Math.round(d.value * 0.85), // Closed orders slightly less than created
    plan: Math.round((d.plan || 132500) * 0.85),
  }))),
  'year': generateYearChartData(3000000),
  '30clients': revenueSzDailyChartData.slice(0, 30).map((d, i) => ({
    ...d,
    date: `${i + 1}`,
    value: Math.round(d.value * 0.8 * 0.85),
  })),
});

// Revenue ZZ managers on shift
interface RevenueZzManagerShiftData {
  id: string;
  name: string;
  avatar?: string;
  planPercent: number;
  closedOrders: number;
}

const baseRevenueZzManagers: RevenueZzManagerShiftData[] = [
  { id: 'elena_novikova', name: 'Елена Новикова', planPercent: 108, closedOrders: 486000 },
  { id: 'anna_petrova', name: 'Анна Петрова', planPercent: 72, closedOrders: 324000 },
  { id: 'maria_kozlova', name: 'Мария Козлова', planPercent: 95, closedOrders: 427500 },
  { id: 'ivan_sidorov', name: 'Иван Сидоров', planPercent: 58, closedOrders: 261000 },
  { id: 'dmitry_volkov', name: 'Дмитрий Волков', planPercent: 102, closedOrders: 459000 },
];

const scaleRevenueZzManagers = (managers: RevenueZzManagerShiftData[], scale: number): RevenueZzManagerShiftData[] => {
  return managers.map(m => ({
    ...m,
    closedOrders: Math.round(m.closedOrders * scale),
  }));
};

export const revenueZzManagersByPeriod: Record<FilterPeriod, RevenueZzManagerShiftData[]> = expandClientPeriods({
  'day': scaleRevenueZzManagers(baseRevenueZzManagers, 0.033),
  '3days': scaleRevenueZzManagers(baseRevenueZzManagers, 0.1),
  'month': baseRevenueZzManagers,
  'year': scaleRevenueZzManagers(baseRevenueZzManagers, 12),
  '30clients': scaleRevenueZzManagers(baseRevenueZzManagers, 0.2),
});

// Revenue ZZ loss breakdown
interface RevenueZzLossBreakdown {
  totalLoss: number;
  employeeLoss: number;
  unissuedLoss: number;
  arpcLoss: number;
}

const baseRevenueZzLossBreakdown: RevenueZzLossBreakdown = {
  totalLoss: 380000,
  employeeLoss: 180000,
  unissuedLoss: 120000,
  arpcLoss: 80000,
};

export const revenueZzLossBreakdownByPeriod: Record<FilterPeriod, RevenueZzLossBreakdown> = expandClientPeriods({
  'day': {
    totalLoss: Math.round(baseRevenueZzLossBreakdown.totalLoss / 30),
    employeeLoss: Math.round(baseRevenueZzLossBreakdown.employeeLoss / 30),
    unissuedLoss: Math.round(baseRevenueZzLossBreakdown.unissuedLoss / 30),
    arpcLoss: Math.round(baseRevenueZzLossBreakdown.arpcLoss / 30),
  },
  '3days': {
    totalLoss: Math.round(baseRevenueZzLossBreakdown.totalLoss / 10),
    employeeLoss: Math.round(baseRevenueZzLossBreakdown.employeeLoss / 10),
    unissuedLoss: Math.round(baseRevenueZzLossBreakdown.unissuedLoss / 10),
    arpcLoss: Math.round(baseRevenueZzLossBreakdown.arpcLoss / 10),
  },
  'month': baseRevenueZzLossBreakdown,
  'year': {
    totalLoss: baseRevenueZzLossBreakdown.totalLoss * 12,
    employeeLoss: baseRevenueZzLossBreakdown.employeeLoss * 12,
    unissuedLoss: baseRevenueZzLossBreakdown.unissuedLoss * 12,
    arpcLoss: baseRevenueZzLossBreakdown.arpcLoss * 12,
  },
  '30clients': {
    totalLoss: Math.round(baseRevenueZzLossBreakdown.totalLoss * 0.3),
    employeeLoss: Math.round(baseRevenueZzLossBreakdown.employeeLoss * 0.3),
    unissuedLoss: Math.round(baseRevenueZzLossBreakdown.unissuedLoss * 0.3),
    arpcLoss: Math.round(baseRevenueZzLossBreakdown.arpcLoss * 0.3),
  },
});

// Revenue ZZ stats for ExpandableStatsRow
interface RevenueZzStat {
  id: string;
  label: string;
  value: number;
  plan: number;
  unit?: string;
  icon?: string;
}

const baseRevenueZzStats: RevenueZzStat[] = [
  { id: 'closings_count', label: 'Кол-во закрытий', value: 145, plan: 160, unit: 'шт' },
  { id: 'avg_closing_days', label: 'Ср. время закрытия', value: 5.2, plan: 5, unit: 'дн' },
  { id: 'avg_closing_price', label: 'Ср. стоимость', value: 18500, plan: 20000, unit: '₽' },
  { id: 'on_time_percent', label: '% в срок', value: 78, plan: 85, unit: '%' },
];

const scaleRevenueZzStats = (stats: RevenueZzStat[], valueScale: number, planScale: number): RevenueZzStat[] => {
  return stats.map(s => ({
    ...s,
    value: s.unit === '%' || s.unit === 'дн' ? s.value : Math.round(s.value * valueScale),
    plan: s.unit === '%' || s.unit === 'дн' ? s.plan : Math.round(s.plan * planScale),
  }));
};

export const revenueZzStatsByPeriod: Record<FilterPeriod, RevenueZzStat[]> = expandClientPeriods({
  'day': scaleRevenueZzStats(baseRevenueZzStats, 0.033, 0.033),
  '3days': scaleRevenueZzStats(baseRevenueZzStats, 0.1, 0.1),
  'month': baseRevenueZzStats,
  'year': scaleRevenueZzStats(baseRevenueZzStats, 12, 12),
  '30clients': scaleRevenueZzStats(baseRevenueZzStats, 0.3, 0.3),
});

// Revenue ZZ managers ranking data
export interface RevenueZzManagerData {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  revenueZz: { value: number; plan: number };
  closingsCount: { value: number; plan: number };
  avgClosingDays: { value: number; plan: number };
  onTimePercent: { value: number; plan: number };
  lostRevenue: number;
}

const baseRevenueZzManagersData: RevenueZzManagerData[] = [
  { 
    id: 'elena_novikova', name: 'Елена Новикова', role: 'Старший менеджер',
    revenueZz: { value: 486000, plan: 450000 },
    closingsCount: { value: 32, plan: 30 },
    avgClosingDays: { value: 4.2, plan: 5 },
    onTimePercent: { value: 92, plan: 85 },
    lostRevenue: 36000,
  },
  { 
    id: 'anna_petrova', name: 'Анна Петрова', role: 'Менеджер',
    revenueZz: { value: 324000, plan: 450000 },
    closingsCount: { value: 22, plan: 30 },
    avgClosingDays: { value: 6.8, plan: 5 },
    onTimePercent: { value: 68, plan: 85 },
    lostRevenue: 126000,
  },
  { 
    id: 'maria_kozlova', name: 'Мария Козлова', role: 'Менеджер',
    revenueZz: { value: 427500, plan: 450000 },
    closingsCount: { value: 28, plan: 30 },
    avgClosingDays: { value: 5.1, plan: 5 },
    onTimePercent: { value: 82, plan: 85 },
    lostRevenue: 22500,
  },
  { 
    id: 'ivan_sidorov', name: 'Иван Сидоров', role: 'Младший менеджер',
    revenueZz: { value: 261000, plan: 450000 },
    closingsCount: { value: 18, plan: 30 },
    avgClosingDays: { value: 7.5, plan: 5 },
    onTimePercent: { value: 55, plan: 85 },
    lostRevenue: 189000,
  },
  { 
    id: 'dmitry_volkov', name: 'Дмитрий Волков', role: 'Менеджер',
    revenueZz: { value: 459000, plan: 450000 },
    closingsCount: { value: 30, plan: 30 },
    avgClosingDays: { value: 4.8, plan: 5 },
    onTimePercent: { value: 88, plan: 85 },
    lostRevenue: 9000,
  },
];

const scaleRevenueZzManagersData = (managers: RevenueZzManagerData[], scale: number): RevenueZzManagerData[] => {
  return managers.map(m => ({
    ...m,
    revenueZz: { value: Math.round(m.revenueZz.value * scale), plan: Math.round(m.revenueZz.plan * scale) },
    closingsCount: { value: Math.round(m.closingsCount.value * scale), plan: Math.round(m.closingsCount.plan * scale) },
    // avgClosingDays and onTimePercent stay the same (rate metrics)
    lostRevenue: Math.round(m.lostRevenue * scale),
  }));
};

export const revenueZzManagersDataByPeriod: Record<FilterPeriod, RevenueZzManagerData[]> = expandClientPeriods({
  'day': scaleRevenueZzManagersData(baseRevenueZzManagersData, 0.033),
  '3days': scaleRevenueZzManagersData(baseRevenueZzManagersData, 0.1),
  'month': baseRevenueZzManagersData,
  'year': scaleRevenueZzManagersData(baseRevenueZzManagersData, 12),
  '30clients': scaleRevenueZzManagersData(baseRevenueZzManagersData, 0.3),
});

// ==================== MISSION PAGE DATA ====================

// Types for Mission data
export interface MissionKPIs {
  diagnostics: { current: number; plan: number };
  lca: { current: number; plan: number };
  children: { current: number; plan: number };
  conversion: { current: number; plan: number }; // percentage
}

export interface MissionChartDataPoint {
  date: string;
  value: number;
  plan: number;
  dayOfWeek?: string;
  isWeekend?: boolean;
}

export interface MissionManagerData {
  id: string;
  name: string;
  avatar?: string;
  diagnostics: number;
  diagnosticsPlan: number;
}

export interface AgeSegmentManager {
  id: string;
  name: string;
  avatar?: string;
  count: number;
  plan: number;
}

export interface AgeSegment {
  id: string;
  label: string;
  ageRange: string;
  count: number;
  plan: number;
  icon: 'baby' | 'child' | 'adult' | 'senior';
  isPriority?: boolean;
  managers: AgeSegmentManager[];
}

export interface MissionManagerRankingData {
  id: string;
  name: string;
  role?: string;
  avatar?: string;
  diagnostics: { current: number; plan: number };
  lca: { current: number; plan: number };
  children: { current: number; plan: number };
  conversion: { current: number; plan: number };
}

// Base Mission KPIs (month)
const baseMissionKPIs: MissionKPIs = {
  diagnostics: { current: 156, plan: 180 },
  lca: { current: 68, plan: 80 },
  children: { current: 42, plan: 50 },
  conversion: { current: 68, plan: 65 },
};

// Scale Mission KPIs
const scaleMissionKPIs = (kpis: MissionKPIs, scale: number): MissionKPIs => ({
  diagnostics: { 
    current: Math.round(kpis.diagnostics.current * scale), 
    plan: Math.round(kpis.diagnostics.plan * scale) 
  },
  lca: { 
    current: Math.round(kpis.lca.current * scale), 
    plan: Math.round(kpis.lca.plan * scale) 
  },
  children: { 
    current: Math.round(kpis.children.current * scale), 
    plan: Math.round(kpis.children.plan * scale) 
  },
  conversion: kpis.conversion, // percentage stays same
});

export const missionKPIsByPeriod: Record<FilterPeriod, MissionKPIs> = expandClientPeriods({
  'day': scaleMissionKPIs(baseMissionKPIs, 0.033),
  '3days': scaleMissionKPIs(baseMissionKPIs, 0.1),
  'month': baseMissionKPIs,
  'year': scaleMissionKPIs(baseMissionKPIs, 12),
  '30clients': scaleMissionKPIs(baseMissionKPIs, 0.3),
});

// Mission Chart Data (30 days)
const baseMissionChartData: MissionChartDataPoint[] = Array.from({ length: 30 }, (_, i) => {
  const dailyPlan = 6; // 180 / 30
  const variance = Math.random() * 0.6 - 0.3; // -30% to +30%
  const value = Math.max(2, Math.round(dailyPlan * (1 + variance)));
  const date = new Date(2024, 11, 1);
  date.setDate(date.getDate() + i);
  const dayOfWeek = DAYS_OF_WEEK[date.getDay()];
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  
  return {
    date: `${i + 1}`,
    value,
    plan: dailyPlan,
    dayOfWeek,
    isWeekend,
  };
});

// Generate hourly mission data (09:00-21:00)
const generateMissionDayData = (): MissionChartDataPoint[] => {
  const workHours = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
  const hourlyPlan = 1; // ~6 per day / 13 hours
  
  return workHours.map(hour => ({
    date: `${hour.toString().padStart(2, '0')}:00`,
    value: Math.random() > 0.4 ? Math.round(Math.random() * 2) + 1 : 0,
    plan: hourlyPlan,
  }));
};

export const missionChartDataByPeriod: Record<FilterPeriod, MissionChartDataPoint[]> = expandClientPeriods({
  'day': generateMissionDayData(),
  '3days': [
    { date: 'Позавчера', value: 5, plan: 6 },
    { date: 'Вчера', value: 7, plan: 6 },
    { date: 'Сегодня', value: 4, plan: 6 },
  ],
  'month': baseMissionChartData,
  'year': Array.from({ length: 12 }, (_, i) => ({
    date: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'][i],
    value: Math.round(180 * (0.8 + Math.random() * 0.4)),
    plan: 180,
  })),
  '30clients': baseMissionChartData.slice(0, 30),
});

// Mission managers for chart accordion
const baseMissionManagersForChart: MissionManagerData[] = [
  { id: 'elena_novikova', name: 'Елена Новикова', diagnostics: 38, diagnosticsPlan: 36 },
  { id: 'anna_petrova', name: 'Анна Петрова', diagnostics: 32, diagnosticsPlan: 36 },
  { id: 'maria_kozlova', name: 'Мария Козлова', diagnostics: 35, diagnosticsPlan: 36 },
  { id: 'ivan_sidorov', name: 'Иван Сидоров', diagnostics: 26, diagnosticsPlan: 36 },
  { id: 'dmitry_volkov', name: 'Дмитрий Волков', diagnostics: 25, diagnosticsPlan: 36 },
];

const scaleMissionManagersForChart = (managers: MissionManagerData[], scale: number): MissionManagerData[] => {
  return managers.map(m => ({
    ...m,
    diagnostics: Math.max(1, Math.round(m.diagnostics * scale)),
    diagnosticsPlan: Math.max(1, Math.round(m.diagnosticsPlan * scale)),
  }));
};

export const missionManagersForChartByPeriod: Record<FilterPeriod, MissionManagerData[]> = expandClientPeriods({
  'day': scaleMissionManagersForChart(baseMissionManagersForChart, 0.033),
  '3days': scaleMissionManagersForChart(baseMissionManagersForChart, 0.1),
  'month': baseMissionManagersForChart,
  'year': scaleMissionManagersForChart(baseMissionManagersForChart, 12),
  '30clients': scaleMissionManagersForChart(baseMissionManagersForChart, 0.3),
});

// Age Segments
const baseAgeSegments: AgeSegment[] = [
  {
    id: 'children',
    label: 'Дети',
    ageRange: '0-14 лет',
    count: 28,
    plan: 35,
    icon: 'baby',
    isPriority: true,
    managers: [
      { id: 'elena_novikova', name: 'Елена Новикова', count: 8, plan: 7 },
      { id: 'anna_petrova', name: 'Анна Петрова', count: 5, plan: 7 },
      { id: 'maria_kozlova', name: 'Мария Козлова', count: 6, plan: 7 },
      { id: 'ivan_sidorov', name: 'Иван Сидоров', count: 4, plan: 7 },
      { id: 'dmitry_volkov', name: 'Дмитрий Волков', count: 5, plan: 7 },
    ],
  },
  {
    id: 'teens',
    label: 'Подростки',
    ageRange: '15-18 лет',
    count: 14,
    plan: 15,
    icon: 'child',
    isPriority: true,
    managers: [
      { id: 'elena_novikova', name: 'Елена Новикова', count: 4, plan: 3 },
      { id: 'anna_petrova', name: 'Анна Петрова', count: 2, plan: 3 },
      { id: 'maria_kozlova', name: 'Мария Козлова', count: 3, plan: 3 },
      { id: 'ivan_sidorov', name: 'Иван Сидоров', count: 2, plan: 3 },
      { id: 'dmitry_volkov', name: 'Дмитрий Волков', count: 3, plan: 3 },
    ],
  },
  {
    id: 'adults',
    label: 'Взрослые',
    ageRange: '19-45 лет',
    count: 78,
    plan: 85,
    icon: 'adult',
    managers: [
      { id: 'elena_novikova', name: 'Елена Новикова', count: 18, plan: 17 },
      { id: 'anna_petrova', name: 'Анна Петрова', count: 14, plan: 17 },
      { id: 'maria_kozlova', name: 'Мария Козлова', count: 16, plan: 17 },
      { id: 'ivan_sidorov', name: 'Иван Сидоров', count: 12, plan: 17 },
      { id: 'dmitry_volkov', name: 'Дмитрий Волков', count: 18, plan: 17 },
    ],
  },
  {
    id: 'seniors',
    label: 'Старшая группа',
    ageRange: '45+ лет',
    count: 36,
    plan: 45,
    icon: 'senior',
    managers: [
      { id: 'elena_novikova', name: 'Елена Новикова', count: 8, plan: 9 },
      { id: 'anna_petrova', name: 'Анна Петрова', count: 6, plan: 9 },
      { id: 'maria_kozlova', name: 'Мария Козлова', count: 8, plan: 9 },
      { id: 'ivan_sidorov', name: 'Иван Сидоров', count: 5, plan: 9 },
      { id: 'dmitry_volkov', name: 'Дмитрий Волков', count: 9, plan: 9 },
    ],
  },
];

const scaleAgeSegments = (segments: AgeSegment[], scale: number): AgeSegment[] => {
  return segments.map(seg => ({
    ...seg,
    count: Math.max(1, Math.round(seg.count * scale)),
    plan: Math.max(1, Math.round(seg.plan * scale)),
    managers: seg.managers.map(m => ({
      ...m,
      count: Math.max(0, Math.round(m.count * scale)),
      plan: Math.max(1, Math.round(m.plan * scale)),
    })),
  }));
};

export const missionAgeSegmentsByPeriod: Record<FilterPeriod, AgeSegment[]> = expandClientPeriods({
  'day': scaleAgeSegments(baseAgeSegments, 0.033),
  '3days': scaleAgeSegments(baseAgeSegments, 0.1),
  'month': baseAgeSegments,
  'year': scaleAgeSegments(baseAgeSegments, 12),
  '30clients': scaleAgeSegments(baseAgeSegments, 0.3),
});

// Manager Ranking Data for Mission
const baseMissionManagersRanking: MissionManagerRankingData[] = [
  { 
    id: 'elena_novikova', name: 'Елена Новикова', role: 'Консультант',
    diagnostics: { current: 40, plan: 36 },
    lca: { current: 17, plan: 16 },
    children: { current: 11, plan: 10 },
    conversion: { current: 72, plan: 72 },
  },
  { 
    id: 'anna_petrova', name: 'Анна Петрова', role: 'Консультант',
    diagnostics: { current: 35, plan: 36 },
    lca: { current: 15, plan: 16 },
    children: { current: 10, plan: 10 },
    conversion: { current: 68, plan: 72 },
  },
  { 
    id: 'maria_kozlova', name: 'Мария Козлова', role: 'Консультант',
    diagnostics: { current: 32, plan: 36 },
    lca: { current: 14, plan: 16 },
    children: { current: 9, plan: 10 },
    conversion: { current: 64, plan: 72 },
  },
  { 
    id: 'dmitry_volkov', name: 'Дмитрий Волков', role: 'Консультант',
    diagnostics: { current: 29, plan: 36 },
    lca: { current: 13, plan: 16 },
    children: { current: 9, plan: 10 },
    conversion: { current: 58, plan: 72 },
  },
  { 
    id: 'ivan_sidorov', name: 'Иван Сидоров', role: 'Консультант',
    diagnostics: { current: 27, plan: 36 },
    lca: { current: 12, plan: 16 },
    children: { current: 8, plan: 10 },
    conversion: { current: 58, plan: 72 },
  },
];

const scaleMissionManagersRanking = (managers: MissionManagerRankingData[], scale: number): MissionManagerRankingData[] => {
  return managers.map(m => ({
    ...m,
    diagnostics: { 
      current: Math.max(1, Math.round(m.diagnostics.current * scale)), 
      plan: Math.max(1, Math.round(m.diagnostics.plan * scale)) 
    },
    lca: { 
      current: Math.max(1, Math.round(m.lca.current * scale)), 
      plan: Math.max(1, Math.round(m.lca.plan * scale)) 
    },
    children: { 
      current: Math.max(0, Math.round(m.children.current * scale)), 
      plan: Math.max(1, Math.round(m.children.plan * scale)) 
    },
    conversion: m.conversion, // percentage stays same
  }));
};

export const missionManagersDataByPeriod: Record<FilterPeriod, MissionManagerRankingData[]> = expandClientPeriods({
  'day': scaleMissionManagersRanking(baseMissionManagersRanking, 0.033),
  '3days': scaleMissionManagersRanking(baseMissionManagersRanking, 0.1),
  'month': baseMissionManagersRanking,
  'year': scaleMissionManagersRanking(baseMissionManagersRanking, 12),
  '30clients': scaleMissionManagersRanking(baseMissionManagersRanking, 0.3),
});

// ==================== REPAIRS DATA BY PERIOD ====================

// Generate average repair price chart data
const generateRepairsChartData = (basePlan: number) => {
  const days = Array.from({ length: 30 }, (_, i) => i + 1);
  return days.map(day => {
    const variance = (Math.random() - 0.5) * 0.4;
    return {
      date: `${day}`,
      value: Math.round(basePlan * (1 + variance)),
      plan: basePlan
    };
  });
};

export const repairsChartDataByPeriod: Record<FilterPeriod, { date: string; value: number; plan: number }[]> = expandClientPeriods({
  'day': [
    { date: '09:00', value: 2800, plan: 3200 },
    { date: '11:00', value: 3400, plan: 3200 },
    { date: '13:00', value: 2900, plan: 3200 },
    { date: '15:00', value: 3500, plan: 3200 },
    { date: '17:00', value: 3100, plan: 3200 },
    { date: '19:00', value: 3300, plan: 3200 },
  ],
  '3days': [
    { date: 'Позавчера', value: 3400, plan: 3200 },
    { date: 'Вчера', value: 3100, plan: 3200 },
    { date: 'Сегодня', value: 2900, plan: 3200 },
  ],
  'month': generateRepairsChartData(3200),
  'year': [
    { date: 'Янв', value: 3100, plan: 3200 },
    { date: 'Фев', value: 3300, plan: 3200 },
    { date: 'Мар', value: 3400, plan: 3200 },
    { date: 'Апр', value: 3200, plan: 3200 },
    { date: 'Май', value: 3000, plan: 3200 },
    { date: 'Июн', value: 2900, plan: 3200 },
    { date: 'Июл', value: 3100, plan: 3200 },
    { date: 'Авг', value: 3300, plan: 3200 },
    { date: 'Сен', value: 3500, plan: 3200 },
    { date: 'Окт', value: 3400, plan: 3200 },
    { date: 'Ноя', value: 3200, plan: 3200 },
    { date: 'Дек', value: 3000, plan: 3200 },
  ],
  '30clients': generateRepairsChartData(3200).slice(0, 10),
});

// Repairs loss breakdown interface
export interface RepairsLossReason {
  id: string;
  name: string;
  loss: number;
  percent: number;
}

export interface RepairsLossBreakdown {
  totalLoss: number;
  byReason: RepairsLossReason[];
}

// Repairs loss data by period with breakdown
export const repairsLossByPeriod: Record<FilterPeriod, RepairsLossBreakdown> = expandClientPeriods({
  'day': { 
    totalLoss: 1200,
    byReason: [
      { id: 'low_complexity', name: 'Низкая сложность ремонтов', loss: 528, percent: 44 },
      { id: 'discounts', name: 'Скидки постоянным клиентам', loss: 372, percent: 31 },
      { id: 'underpricing', name: 'Занижение стоимости', loss: 300, percent: 25 },
    ]
  },
  '3days': { 
    totalLoss: 3600,
    byReason: [
      { id: 'low_complexity', name: 'Низкая сложность ремонтов', loss: 1584, percent: 44 },
      { id: 'discounts', name: 'Скидки постоянным клиентам', loss: 1116, percent: 31 },
      { id: 'underpricing', name: 'Занижение стоимости', loss: 900, percent: 25 },
    ]
  },
  'month': { 
    totalLoss: 32000,
    byReason: [
      { id: 'low_complexity', name: 'Низкая сложность ремонтов', loss: 14080, percent: 44 },
      { id: 'discounts', name: 'Скидки постоянным клиентам', loss: 9920, percent: 31 },
      { id: 'underpricing', name: 'Занижение стоимости', loss: 8000, percent: 25 },
    ]
  },
  'year': { 
    totalLoss: 384000,
    byReason: [
      { id: 'low_complexity', name: 'Низкая сложность ремонтов', loss: 168960, percent: 44 },
      { id: 'discounts', name: 'Скидки постоянным клиентам', loss: 119040, percent: 31 },
      { id: 'underpricing', name: 'Занижение стоимости', loss: 96000, percent: 25 },
    ]
  },
  '30clients': { 
    totalLoss: 9600,
    byReason: [
      { id: 'low_complexity', name: 'Низкая сложность ремонтов', loss: 4224, percent: 44 },
      { id: 'discounts', name: 'Скидки постоянным клиентам', loss: 2976, percent: 31 },
      { id: 'underpricing', name: 'Занижение стоимости', loss: 2400, percent: 25 },
    ]
  },
});

// Repairs managers for chart sidebar
export interface RepairsManagerForChart {
  id: string;
  name: string;
  planPercent: number;
  avgRepairPrice: number;
}

export const repairsManagersForChartByPeriod: Record<FilterPeriod, RepairsManagerForChart[]> = expandClientPeriods({
  'day': [
    { id: 'elena_novikova', name: 'Елена Новикова', planPercent: 112, avgRepairPrice: 3580 },
    { id: 'anna_petrova', name: 'Анна Петрова', planPercent: 105, avgRepairPrice: 3360 },
    { id: 'sergey_kuznetsov', name: 'Сергей Кузнецов', planPercent: 98, avgRepairPrice: 3136 },
    { id: 'maria_kozlova', name: 'Мария Козлова', planPercent: 94, avgRepairPrice: 3008 },
    { id: 'dmitry_volkov', name: 'Дмитрий Волков', planPercent: 88, avgRepairPrice: 2816 },
  ],
  '3days': [
    { id: 'elena_novikova', name: 'Елена Новикова', planPercent: 110, avgRepairPrice: 3520 },
    { id: 'anna_petrova', name: 'Анна Петрова', planPercent: 104, avgRepairPrice: 3328 },
    { id: 'sergey_kuznetsov', name: 'Сергей Кузнецов', planPercent: 96, avgRepairPrice: 3072 },
    { id: 'maria_kozlova', name: 'Мария Козлова', planPercent: 92, avgRepairPrice: 2944 },
    { id: 'dmitry_volkov', name: 'Дмитрий Волков', planPercent: 85, avgRepairPrice: 2720 },
  ],
  'month': [
    { id: 'elena_novikova', name: 'Елена Новикова', planPercent: 112, avgRepairPrice: 3580 },
    { id: 'anna_petrova', name: 'Анна Петрова', planPercent: 105, avgRepairPrice: 3360 },
    { id: 'sergey_kuznetsov', name: 'Сергей Кузнецов', planPercent: 98, avgRepairPrice: 3136 },
    { id: 'maria_kozlova', name: 'Мария Козлова', planPercent: 94, avgRepairPrice: 3008 },
    { id: 'dmitry_volkov', name: 'Дмитрий Волков', planPercent: 88, avgRepairPrice: 2816 },
  ],
  'year': [
    { id: 'anna_petrova', name: 'Анна Петрова', planPercent: 108, avgRepairPrice: 3456 },
    { id: 'elena_novikova', name: 'Елена Новикова', planPercent: 106, avgRepairPrice: 3392 },
    { id: 'sergey_kuznetsov', name: 'Сергей Кузнецов', planPercent: 100, avgRepairPrice: 3200 },
    { id: 'maria_kozlova', name: 'Мария Козлова', planPercent: 95, avgRepairPrice: 3040 },
    { id: 'dmitry_volkov', name: 'Дмитрий Волков', planPercent: 90, avgRepairPrice: 2880 },
  ],
  '30clients': [
    { id: 'elena_novikova', name: 'Елена Новикова', planPercent: 115, avgRepairPrice: 3680 },
    { id: 'anna_petrova', name: 'Анна Петрова', planPercent: 107, avgRepairPrice: 3424 },
    { id: 'sergey_kuznetsov', name: 'Сергей Кузнецов', planPercent: 99, avgRepairPrice: 3168 },
    { id: 'maria_kozlova', name: 'Мария Козлова', planPercent: 91, avgRepairPrice: 2912 },
    { id: 'dmitry_volkov', name: 'Дмитрий Волков', planPercent: 84, avgRepairPrice: 2688 },
  ],
});

// Repairs manager ranking data
export interface RepairsManagerData {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  planPercent: number;
  avgRepairPrice: { value: number; forecast: number };
  repairsCount: { value: number; forecast: number };
  lostRevenue: number;
}

const baseRepairsManagersRanking: RepairsManagerData[] = [
  {
    id: 'elena_novikova', name: 'Елена Новикова', role: 'Консультант',
    planPercent: 112,
    avgRepairPrice: { value: 3580, forecast: 112 },
    repairsCount: { value: 18, forecast: 105 },
    lostRevenue: -6840,
  },
  {
    id: 'anna_petrova', name: 'Анна Петрова', role: 'Консультант',
    planPercent: 105,
    avgRepairPrice: { value: 3360, forecast: 105 },
    repairsCount: { value: 15, forecast: 94 },
    lostRevenue: -2400,
  },
  {
    id: 'sergey_kuznetsov', name: 'Сергей Кузнецов', role: 'Консультант',
    planPercent: 98,
    avgRepairPrice: { value: 3136, forecast: 98 },
    repairsCount: { value: 22, forecast: 110 },
    lostRevenue: 1408,
  },
  {
    id: 'maria_kozlova', name: 'Мария Козлова', role: 'Консультант',
    planPercent: 94,
    avgRepairPrice: { value: 3008, forecast: 94 },
    repairsCount: { value: 12, forecast: 75 },
    lostRevenue: 2304,
  },
  {
    id: 'dmitry_volkov', name: 'Дмитрий Волков', role: 'Консультант',
    planPercent: 88,
    avgRepairPrice: { value: 2816, forecast: 88 },
    repairsCount: { value: 14, forecast: 88 },
    lostRevenue: 5376,
  },
  {
    id: 'ivan_sidorov', name: 'Иван Сидоров', role: 'Консультант',
    planPercent: 82,
    avgRepairPrice: { value: 2624, forecast: 82 },
    repairsCount: { value: 10, forecast: 63 },
    lostRevenue: 5760,
  },
];

const scaleRepairsManagersRanking = (managers: RepairsManagerData[], scale: number): RepairsManagerData[] => {
  return managers.map(m => ({
    ...m,
    repairsCount: {
      value: Math.max(1, Math.round(m.repairsCount.value * scale)),
      forecast: m.repairsCount.forecast,
    },
    lostRevenue: Math.round(m.lostRevenue * scale),
  }));
};

export const repairsManagersDataByPeriod: Record<FilterPeriod, RepairsManagerData[]> = expandClientPeriods({
  'day': scaleRepairsManagersRanking(baseRepairsManagersRanking, 0.033),
  '3days': scaleRepairsManagersRanking(baseRepairsManagersRanking, 0.1),
  'month': baseRepairsManagersRanking,
  'year': scaleRepairsManagersRanking(baseRepairsManagersRanking, 12),
  '30clients': scaleRepairsManagersRanking(baseRepairsManagersRanking, 0.3),
});

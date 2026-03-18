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

// ==================== CHART DATA GENERATORS ====================

// Generate hourly data for a single day (only working hours 09:00-21:00)
const generateDayChartData = (basePlan: number) => {
  // Only working hours (09:00 - 21:00)
  const workHours = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
  
  return workHours.map(hour => {
    const hourlyPlan = Math.round(basePlan / workHours.length);
    const variance = (Math.random() - 0.4) * 0.5;
    const value = Math.round(hourlyPlan * (1 + variance));
    
    return {
      date: `${hour.toString().padStart(2, '0')}:00`,
      value,
      plan: hourlyPlan
    };
  });
};

// Generate 3-day chart data (72 hours or 3 points)
const generateThreeDaysChartData = (basePlan: number) => {
  return [
    { date: 'Вчера', value: Math.round(basePlan * 0.92), plan: basePlan },
    { date: 'Позавчера', value: Math.round(basePlan * 1.05), plan: basePlan },
    { date: 'Сегодня', value: Math.round(basePlan * 0.78), plan: basePlan },
  ];
};

// Generate yearly data (12 months)
const generateYearChartData = (monthlyPlan: number) => {
  const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
  return months.map((month, i) => {
    const seasonalMultiplier = 1 + Math.sin((i - 3) * Math.PI / 6) * 0.15;
    const variance = (Math.random() - 0.5) * 0.2;
    return {
      date: month,
      value: Math.round(monthlyPlan * seasonalMultiplier * (1 + variance)),
      plan: monthlyPlan
    };
  });
};

// ==================== DAY OF WEEK HELPERS ====================

const DAYS_OF_WEEK = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

// Add day of week info to chart data (for month period)
const addDayOfWeekToChartData = <T extends { date: string; value: number; plan?: number }>(
  data: T[],
  startDate: Date = new Date(2024, 11, 1) // December 1, 2024 (Sunday)
): (T & { dayOfWeek?: string; isWeekend?: boolean })[] => {
  return data.map((d, i) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const dayOfWeek = DAYS_OF_WEEK[date.getDay()];
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    return { ...d, dayOfWeek, isWeekend };
  });
};

// ==================== REVENUE SZ CHART DATA BY PERIOD ====================

export const revenueSzChartDataByPeriod: Record<FilterPeriod, (typeof revenueSzDailyChartData[0] & { dayOfWeek?: string; isWeekend?: boolean })[]> = {
  'day': generateDayChartData(116667), // Daily plan: 3.5M / 30 days
  '3days': generateThreeDaysChartData(116667),
  'month': addDayOfWeekToChartData(revenueSzDailyChartData),
  'year': generateYearChartData(3500000),
  '30clients': revenueSzDailyChartData.slice(0, 30).map((d, i) => ({
    ...d,
    date: `${i + 1}`,
    value: Math.round(d.value * 0.8 + Math.random() * 30000),
  })),
};

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

export const avgPriceChartDataByPeriod: Record<FilterPeriod, (typeof avgPriceDailyChartData[0] & { dayOfWeek?: string; isWeekend?: boolean })[]> = {
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
};

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

export const leaderMetricsByPeriodExtended: Record<FilterPeriod, FullWidthKPIMetric[]> = {
  'day': scaleMetrics(leaderTopMetrics, 0.033, 0.033, -5), // 1/30 of month
  '3days': scaleMetrics(leaderTopMetrics, 0.1, 0.1, -3),   // 3/30 of month
  'month': leaderTopMetrics,
  'year': scaleMetrics(leaderTopMetrics, 12, 12, 2),      // 12x month
  '30clients': scaleMetrics(leaderTopMetrics, 0.3, 0.3, 5),
};

export const employeeMetricsByPeriodExtended: Record<FilterPeriod, FullWidthKPIMetric[]> = {
  'day': scaleMetrics(employeeTopMetrics, 0.033, 0.033, -5),
  '3days': scaleMetrics(employeeTopMetrics, 0.1, 0.1, -3),
  'month': employeeTopMetrics,
  'year': scaleMetrics(employeeTopMetrics, 12, 12, 2),
  '30clients': scaleMetrics(employeeTopMetrics, 0.3, 0.3, 5),
};

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

export const revenueSzConversionsByPeriod: Record<FilterPeriod, ConversionDetailData[]> = {
  'day': scaleConversions(revenueSzConversionsDetailed, 0.033, -3),
  '3days': scaleConversions(revenueSzConversionsDetailed, 0.1, -2),
  'month': revenueSzConversionsDetailed,
  'year': scaleConversions(revenueSzConversionsDetailed, 12, 3),
  '30clients': scaleConversions(revenueSzConversionsDetailed, 0.2, 0),
};

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

export const revenueSzManagersByPeriod: Record<FilterPeriod, ManagerCardData[]> = {
  'day': scaleManagersDetail(revenueSzManagersDetail, 0.033),
  '3days': scaleManagersDetail(revenueSzManagersDetail, 0.1),
  'month': revenueSzManagersDetail,
  'year': scaleManagersDetail(revenueSzManagersDetail, 12),
  '30clients': scaleManagersDetail(revenueSzManagersDetail, 0.2),
};

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

export const managersDataByPeriod: Record<FilterPeriod, typeof managersData> = {
  'day': scaleManagerKPIMetrics(managersData, 0.033, 0.033),
  '3days': scaleManagerKPIMetrics(managersData, 0.1, 0.1),
  'month': managersData,
  'year': scaleManagerKPIMetrics(managersData, 12, 12),
  '30clients': scaleManagerKPIMetrics(managersData, 0.3, 0.3),
};

export const optometristsDataByPeriod: Record<FilterPeriod, typeof optometristsData> = {
  'day': scaleOptometristMetrics(optometristsData, 0.033, 0.033),
  '3days': scaleOptometristMetrics(optometristsData, 0.1, 0.1),
  'month': optometristsData,
  'year': scaleOptometristMetrics(optometristsData, 12, 12),
  '30clients': scaleOptometristMetrics(optometristsData, 0.3, 0.3),
};

export const avgPriceManagersDataByPeriod: Record<FilterPeriod, typeof avgPriceManagersData> = {
  'day': scaleAvgPriceManagers(avgPriceManagersData, 0.033),
  '3days': scaleAvgPriceManagers(avgPriceManagersData, 0.1),
  'month': avgPriceManagersData,
  'year': scaleAvgPriceManagers(avgPriceManagersData, 12),
  '30clients': scaleAvgPriceManagers(avgPriceManagersData, 0.3),
};

// ==================== CHART AXIS LABELS BY PERIOD ====================

export const chartAxisConfig: Record<FilterPeriod, { 
  xAxisLabel: string; 
  title: string;
  tickInterval?: number;
}> = {
  'day': { xAxisLabel: 'Час', title: 'Динамика за день', tickInterval: 6 },
  '3days': { xAxisLabel: 'День', title: 'Динамика за 3 дня' },
  'month': { xAxisLabel: 'День', title: 'Динамика за месяц', tickInterval: 10 },
  'year': { xAxisLabel: 'Месяц', title: 'Динамика за год' },
  '30clients': { xAxisLabel: 'Клиент', title: 'По клиентам', tickInterval: 10 },
};

// ==================== LOSS BREAKDOWN BY PERIOD ====================

export const revenueSzLossBreakdownByPeriod: Record<FilterPeriod, typeof revenueSzLossBreakdown> = {
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
};

// ==================== AVG PRICE LOSS BREAKDOWN BY PERIOD ====================

export const avgPriceLossBreakdownByPeriod: Record<FilterPeriod, typeof avgPriceLossBreakdown> = {
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
};

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

export const avgPriceCategoriesByPeriod: Record<FilterPeriod, AvgPriceCategoryData[]> = {
  'day': scaleCategories(avgPriceCategories, 0.033, 0.033),
  '3days': scaleCategories(avgPriceCategories, 0.1, 0.1),
  'month': avgPriceCategories,
  'year': scaleCategories(avgPriceCategories, 12, 12),
  '30clients': scaleCategories(avgPriceCategories, 0.3, 0.3),
};

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

export const revenueSzStatsByPeriodExtended: Record<FilterPeriod, ExpandableOrderStat[]> = {
  'day': scaleStats(baseStatsByPeriod['month'] || [], 0.033, 0.033),
  '3days': baseStatsByPeriod['3days'] || [],
  'month': baseStatsByPeriod['month'] || [],
  'year': scaleStats(baseStatsByPeriod['month'] || [], 12, 12),
  '30clients': baseStatsByPeriod['30clients'] || [],
};

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
  { id: '1', name: 'Иванова А.', count: 35, plan: 40, conversionValue: 48, conversionTarget: 45 },
  { id: '2', name: 'Петров К.', count: 28, plan: 35, conversionValue: 38, conversionTarget: 45 },
  { id: '3', name: 'Сидорова М.', count: 42, plan: 45, conversionValue: 52, conversionTarget: 45 },
  { id: '4', name: 'Козлов И.', count: 18, plan: 30, conversionValue: 32, conversionTarget: 45 },
  { id: '5', name: 'Новикова Е.', count: 33, plan: 35, conversionValue: 44, conversionTarget: 45 },
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

export const clientSegmentsByPeriod: Record<FilterPeriod, ClientSegment[]> = {
  'day': scaleClientSegments(baseClientSegments, 0.033),
  '3days': scaleClientSegments(baseClientSegments, 0.1),
  'month': baseClientSegments,
  'year': scaleClientSegments(baseClientSegments, 12),
  '30clients': scaleClientSegments(baseClientSegments, 0.2),
};

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

export const trafficSourcesByPeriod: Record<FilterPeriod, TrafficSource[]> = {
  'day': scaleTrafficSources(baseTrafficSources, 0.033),
  '3days': scaleTrafficSources(baseTrafficSources, 0.1),
  'month': baseTrafficSources,
  'year': scaleTrafficSources(baseTrafficSources, 12),
  '30clients': scaleTrafficSources(baseTrafficSources, 0.2),
};

// Base LCA data
const baseLcaManagers: LcaManager[] = [
  { id: '1', name: 'Иванова А.', clientsWithoutLca: 25, installations: 15, conversionValue: 60 },
  { id: '2', name: 'Петров К.', clientsWithoutLca: 30, installations: 10, conversionValue: 33 },
  { id: '3', name: 'Сидорова М.', clientsWithoutLca: 18, installations: 14, conversionValue: 78 },
  { id: '4', name: 'Козлов И.', clientsWithoutLca: 22, installations: 8, conversionValue: 36 },
  { id: '5', name: 'Новикова Е.', clientsWithoutLca: 20, installations: 12, conversionValue: 60 },
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

export const lcaDataByPeriod: Record<FilterPeriod, LcaData> = {
  'day': scaleLcaData(baseLcaData, 0.033),
  '3days': scaleLcaData(baseLcaData, 0.1),
  'month': baseLcaData,
  'year': scaleLcaData(baseLcaData, 12),
  '30clients': scaleLcaData(baseLcaData, 0.2),
};

// Clients chart data
// Extended clients chart data with revenue
export interface ClientsChartDataPoint {
  date: string;
  value: number;
  plan?: number;
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

export const clientsChartDataByPeriod: Record<FilterPeriod, ClientsChartDataPoint[]> = {
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
};

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

export const clientsLossByPeriod: Record<FilterPeriod, ClientsLossData> = {
  'day': calculateClientsLoss('day'),
  '3days': calculateClientsLoss('3days'),
  'month': calculateClientsLoss('month'),
  'year': calculateClientsLoss('year'),
  '30clients': calculateClientsLoss('30clients'),
};

// Clients managers on shift
const baseClientsManagers: ClientManagerData[] = [
  { id: '1', name: 'Иванова А.', planPercent: 88, clientsCount: 35 },
  { id: '2', name: 'Петров К.', planPercent: 80, clientsCount: 28 },
  { id: '3', name: 'Сидорова М.', planPercent: 93, clientsCount: 42 },
  { id: '4', name: 'Козлов И.', planPercent: 60, clientsCount: 18 },
  { id: '5', name: 'Новикова Е.', planPercent: 94, clientsCount: 33 },
];

const scaleClientsManagers = (managers: ClientManagerData[], scale: number): ClientManagerData[] => {
  return managers.map(m => ({
    ...m,
    clientsCount: Math.max(1, Math.round(m.clientsCount * scale)),
  }));
};

export const clientsManagersByPeriod: Record<FilterPeriod, ClientManagerData[]> = {
  'day': scaleClientsManagers(baseClientsManagers, 0.033),
  '3days': scaleClientsManagers(baseClientsManagers, 0.1),
  'month': baseClientsManagers,
  'year': scaleClientsManagers(baseClientsManagers, 12),
  '30clients': scaleClientsManagers(baseClientsManagers, 0.2),
};

// Clients ranking data
const baseClientsRanking: ClientsRankingRow[] = [
  {
    id: '1', rank: 1, name: 'Иванова А.',
    planPercent: 88,
    total: { value: 35, plan: 40 },
    newClients: { value: 12, plan: 14 },
    repeatClients: { value: 16, plan: 15 },
    oldCheck: { value: 7, plan: 11 },
    lcaInstallations: { value: 15, plan: 18 },
  },
  {
    id: '2', rank: 2, name: 'Петров К.',
    planPercent: 80,
    total: { value: 28, plan: 35 },
    newClients: { value: 10, plan: 12 },
    repeatClients: { value: 12, plan: 13 },
    oldCheck: { value: 6, plan: 10 },
    lcaInstallations: { value: 10, plan: 15 },
  },
  {
    id: '3', rank: 3, name: 'Сидорова М.',
    planPercent: 93,
    total: { value: 42, plan: 45 },
    newClients: { value: 15, plan: 16 },
    repeatClients: { value: 18, plan: 17 },
    oldCheck: { value: 9, plan: 12 },
    lcaInstallations: { value: 14, plan: 16 },
  },
  {
    id: '4', rank: 4, name: 'Козлов И.',
    planPercent: 60,
    total: { value: 18, plan: 30 },
    newClients: { value: 6, plan: 10 },
    repeatClients: { value: 8, plan: 12 },
    oldCheck: { value: 4, plan: 8 },
    lcaInstallations: { value: 8, plan: 14 },
  },
  {
    id: '5', rank: 5, name: 'Новикова Е.',
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

export const clientsRankingByPeriod: Record<FilterPeriod, ClientsRankingRow[]> = {
  'day': scaleClientsRanking(baseClientsRanking, 0.033),
  '3days': scaleClientsRanking(baseClientsRanking, 0.1),
  'month': baseClientsRanking,
  'year': scaleClientsRanking(baseClientsRanking, 12),
  '30clients': scaleClientsRanking(baseClientsRanking, 0.2),
};

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
      id: '1', name: 'Светлова А.', topSegment: 'A', topSegmentPercent: 55, 
      avgLensPrice: 10500, stockPercent: 20, lossAmount: 0, lossReason: '',
      matrixDistribution: { 
        XA: { percent: 30, avgPrice: 14500, count: 9 }, XB: { percent: 15, avgPrice: 11200, count: 5 }, XC: { percent: 5, avgPrice: 8800, count: 2 }, XD: { percent: 0, avgPrice: 0, count: 0 },
        YA: { percent: 20, avgPrice: 10200, count: 6 }, YB: { percent: 10, avgPrice: 7800, count: 3 }, YC: { percent: 5, avgPrice: 5200, count: 2 }, YD: { percent: 0, avgPrice: 0, count: 0 },
        ZA: { percent: 5, avgPrice: 8500, count: 2 }, ZB: { percent: 5, avgPrice: 5800, count: 2 }, ZC: { percent: 5, avgPrice: 3600, count: 2 }, ZD: { percent: 0, avgPrice: 0, count: 0 }
      }
    },
    { 
      id: '2', name: 'Денисов К.', topSegment: 'B', topSegmentPercent: 45, 
      avgLensPrice: 7000, stockPercent: 55, lossAmount: 32000, lossReason: 'Низкий индекс',
      matrixDistribution: { 
        XA: { percent: 5, avgPrice: 13800, count: 2 }, XB: { percent: 20, avgPrice: 10500, count: 6 }, XC: { percent: 15, avgPrice: 8200, count: 5 }, XD: { percent: 5, avgPrice: 5500, count: 2 },
        YA: { percent: 5, avgPrice: 9800, count: 2 }, YB: { percent: 15, avgPrice: 7200, count: 5 }, YC: { percent: 10, avgPrice: 4800, count: 3 }, YD: { percent: 5, avgPrice: 3200, count: 2 },
        ZA: { percent: 5, avgPrice: 8200, count: 2 }, ZB: { percent: 10, avgPrice: 5500, count: 3 }, ZC: { percent: 5, avgPrice: 3200, count: 2 }, ZD: { percent: 0, avgPrice: 0, count: 0 }
      }
    },
    { 
      id: '3', name: 'Петрова М.', topSegment: 'C', topSegmentPercent: 50, 
      avgLensPrice: 6800, stockPercent: 60, lossAmount: 45000, lossReason: 'Средний сегмент',
      matrixDistribution: { 
        XA: { percent: 5, avgPrice: 13500, count: 2 }, XB: { percent: 10, avgPrice: 10200, count: 3 }, XC: { percent: 20, avgPrice: 7800, count: 6 }, XD: { percent: 5, avgPrice: 5200, count: 2 },
        YA: { percent: 5, avgPrice: 9500, count: 2 }, YB: { percent: 10, avgPrice: 7000, count: 3 }, YC: { percent: 20, avgPrice: 4500, count: 6 }, YD: { percent: 5, avgPrice: 3000, count: 2 },
        ZA: { percent: 0, avgPrice: 0, count: 0 }, ZB: { percent: 5, avgPrice: 5200, count: 2 }, ZC: { percent: 10, avgPrice: 3000, count: 3 }, ZD: { percent: 5, avgPrice: 2200, count: 2 }
      }
    },
    { 
      id: '4', name: 'Козлов И.', topSegment: 'D', topSegmentPercent: 40, 
      avgLensPrice: 4200, stockPercent: 80, lossAmount: 78000, lossReason: 'Эконом сегмент',
      matrixDistribution: { 
        XA: { percent: 0, avgPrice: 0, count: 0 }, XB: { percent: 5, avgPrice: 9800, count: 2 }, XC: { percent: 10, avgPrice: 7500, count: 3 }, XD: { percent: 10, avgPrice: 5000, count: 3 },
        YA: { percent: 5, avgPrice: 9200, count: 2 }, YB: { percent: 5, avgPrice: 6800, count: 2 }, YC: { percent: 15, avgPrice: 4200, count: 5 }, YD: { percent: 15, avgPrice: 2800, count: 5 },
        ZA: { percent: 0, avgPrice: 0, count: 0 }, ZB: { percent: 5, avgPrice: 4800, count: 2 }, ZC: { percent: 15, avgPrice: 2800, count: 5 }, ZD: { percent: 15, avgPrice: 2000, count: 5 }
      }
    },
    { 
      id: '5', name: 'Новикова Е.', topSegment: 'A', topSegmentPercent: 48, 
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

export const lensMatrixDataByPeriod: Record<FilterPeriod, LensMatrixData> = {
  'day': scaleLensMatrix(baseLensMatrixData, 0.033),
  '3days': scaleLensMatrix(baseLensMatrixData, 0.1),
  'month': baseLensMatrixData,
  'year': scaleLensMatrix(baseLensMatrixData, 12),
  '30clients': scaleLensMatrix(baseLensMatrixData, 0.1),
};

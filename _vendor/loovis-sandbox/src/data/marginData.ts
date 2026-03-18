import { FilterPeriod } from '@/components/dashboard/FilterBar';

// ===== TYPES =====

export interface MarginCategory {
  id: string;
  name: string;
  margin: number;        // Current margin in rubles
  marginPlan: number;    // Planned margin in rubles
  revenue: number;       // Revenue for this category
  cost: number;          // Cost of goods sold
  marginPercent: number; // Margin as percentage of revenue
}

export interface MarginLossBreakdown {
  totalLoss: number;
  byLowMarginProducts: number;
  byManagerEfficiency: number;
  byExcessiveDiscounts: number;
}

export interface MarginMetricValue {
  value: number;
  forecast: number;
}

export interface MarginManagerRow {
  id: string;
  rank: number;
  name: string;
  role: string;
  avatar: string;
  planPercent: number;
  margin: MarginMetricValue;        // Margin in rubles
  revenue: MarginMetricValue;       // Revenue in rubles
  marginPercent: number;            // Margin % of revenue
  lostMargin: number;               // Lost/reserve margin in rubles
}

export interface MarginChartDataPoint {
  date: string;
  value: number;
  plan: number;
  dayOfWeek?: string;
  isWeekend?: boolean;
  isFuture?: boolean;
}

export interface MarginManagerShiftData {
  id: string;
  name: string;
  avatar: string;
  planPercent: number;
  margin: number;
  marginPlan: number;
}

// ===== HELPER FUNCTIONS =====

const daysOfWeek = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

// Current date for determining future days (January 15, 2026)
const CURRENT_DATE = new Date(2026, 0, 15);

// Seeded random for reproducible results
const seededRandom = (seed: number): number => {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

// Generate dynamic daily plan with configurable range
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
    minPlan = 19200,  // ~27420 * 0.7 for margin
    maxPlan = 35650,  // ~27420 * 1.3 for margin
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

const generateMonthChartData = (basePlan: number): MarginChartDataPoint[] => {
  const data: MarginChartDataPoint[] = [];
  const daysInMonth = 31;
  
  // Scale plan range based on basePlan
  const minPlan = Math.round(basePlan * 0.7);
  const maxPlan = Math.round(basePlan * 1.3);
  
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(2026, 0, i);
    const dayIndex = date.getDay();
    const isWeekend = dayIndex === 0 || dayIndex === 6;
    const isFuture = date > CURRENT_DATE;
    
    // Generate dynamic daily plan
    const dailyPlan = generateDailyPlanValue(i, dayIndex, { minPlan, maxPlan });
    
    // Variation for fact value
    const variation = 0.7 + seededRandom(i * 13) * 0.6;
    
    data.push({
      date: String(i),
      value: isFuture ? 0 : Math.round(dailyPlan * variation),
      plan: dailyPlan,
      dayOfWeek: daysOfWeek[dayIndex],
      isWeekend,
      isFuture
    });
  }
  
  return data;
};

const generateDayChartData = (basePlan: number): MarginChartDataPoint[] => {
  const dayOfMonth = 15;
  const dayOfWeek = 3; // Wednesday
  const minPlan = Math.round(basePlan * 0.7);
  const maxPlan = Math.round(basePlan * 1.3);
  const plan = generateDailyPlanValue(dayOfMonth, dayOfWeek, { minPlan, maxPlan });
  return [{ date: '15', value: Math.round(plan * 0.92), plan, dayOfWeek: 'Ср' }];
};

const generateThreeDaysChartData = (basePlan: number): MarginChartDataPoint[] => {
  const days = [
    { date: '13', dayOfMonth: 13, dayOfWeek: 1, dayOfWeekLabel: 'Пн' },
    { date: '14', dayOfMonth: 14, dayOfWeek: 2, dayOfWeekLabel: 'Вт' },
    { date: '15', dayOfMonth: 15, dayOfWeek: 3, dayOfWeekLabel: 'Ср' }
  ];
  
  const minPlan = Math.round(basePlan * 0.7);
  const maxPlan = Math.round(basePlan * 1.3);
  
  return days.map(day => {
    const plan = generateDailyPlanValue(day.dayOfMonth, day.dayOfWeek, { minPlan, maxPlan });
    const variation = 0.7 + seededRandom(day.dayOfMonth * 11) * 0.6;
    return {
      date: day.date,
      value: Math.round(plan * variation),
      plan,
      dayOfWeek: day.dayOfWeekLabel,
      isWeekend: day.dayOfWeek === 0 || day.dayOfWeek === 6,
      isFuture: false
    };
  });
};

const generateYearChartData = (basePlan: number): MarginChartDataPoint[] => {
  const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
  return months.map((month, i) => ({
    date: month,
    value: Math.round(basePlan * 30 * (0.85 + seededRandom(i * 17) * 0.3)),
    plan: basePlan * 30
  }));
};

// ===== CHART DATA BY PERIOD =====

export const marginChartDataByPeriod: Record<FilterPeriod, MarginChartDataPoint[]> = {
  day: generateDayChartData(27420),
  '3days': generateThreeDaysChartData(27420),
  month: generateMonthChartData(27420),
  year: generateYearChartData(27420),
  '10clients': generateMonthChartData(27420),
  '20clients': generateMonthChartData(27420),
  '30clients': generateMonthChartData(27420),
  '50clients': generateMonthChartData(27420),
};

// ===== LOSS BREAKDOWN BY PERIOD =====

export const marginLossBreakdownByPeriod: Record<FilterPeriod, MarginLossBreakdown> = {
  day: {
    totalLoss: 8500,
    byLowMarginProducts: 3400,
    byManagerEfficiency: 2800,
    byExcessiveDiscounts: 2300,
  },
  '3days': {
    totalLoss: 25500,
    byLowMarginProducts: 10200,
    byManagerEfficiency: 8400,
    byExcessiveDiscounts: 6900,
  },
  month: {
    totalLoss: 107000,
    byLowMarginProducts: 45000,
    byManagerEfficiency: 32000,
    byExcessiveDiscounts: 30000,
  },
  year: {
    totalLoss: 1284000,
    byLowMarginProducts: 540000,
    byManagerEfficiency: 384000,
    byExcessiveDiscounts: 360000,
  },
  '10clients': {
    totalLoss: 35670,
    byLowMarginProducts: 15000,
    byManagerEfficiency: 10670,
    byExcessiveDiscounts: 10000,
  },
  '20clients': {
    totalLoss: 71340,
    byLowMarginProducts: 30000,
    byManagerEfficiency: 21340,
    byExcessiveDiscounts: 20000,
  },
  '30clients': {
    totalLoss: 107000,
    byLowMarginProducts: 45000,
    byManagerEfficiency: 32000,
    byExcessiveDiscounts: 30000,
  },
  '50clients': {
    totalLoss: 178340,
    byLowMarginProducts: 75000,
    byManagerEfficiency: 53340,
    byExcessiveDiscounts: 50000,
  },
};

// ===== CATEGORIES BY PERIOD =====

const baseCategories: MarginCategory[] = [
  { id: 'lenses', name: 'Линзы', margin: 380000, marginPlan: 420000, revenue: 840000, cost: 460000, marginPercent: 45.2 },
  { id: 'frames', name: 'Оправы', margin: 295000, marginPlan: 280000, revenue: 536000, cost: 241000, marginPercent: 55.0 },
  { id: 'accessories', name: 'Доп. товары', margin: 68000, marginPlan: 75000, revenue: 113000, cost: 45000, marginPercent: 60.2 },
  { id: 'repairs', name: 'Ремонты', margin: 42000, marginPlan: 45000, revenue: 65000, cost: 23000, marginPercent: 64.6 },
  { id: 'contacts', name: 'Контактные линзы', margin: 65000, marginPlan: 70000, revenue: 185000, cost: 120000, marginPercent: 35.1 },
];

const scaleCategories = (scale: number): MarginCategory[] => 
  baseCategories.map(c => ({
    ...c,
    margin: Math.round(c.margin * scale),
    marginPlan: Math.round(c.marginPlan * scale),
    revenue: Math.round(c.revenue * scale),
    cost: Math.round(c.cost * scale),
  }));

export const marginCategoriesByPeriod: Record<FilterPeriod, MarginCategory[]> = {
  day: scaleCategories(1/30),
  '3days': scaleCategories(3/30),
  month: baseCategories,
  year: scaleCategories(12),
  '10clients': scaleCategories(0.33),
  '20clients': scaleCategories(0.67),
  '30clients': baseCategories,
  '50clients': scaleCategories(1.67),
};

// ===== MANAGERS DATA =====

const baseMarginManagers = [
  {
    id: '1',
    name: 'Анна Петрова',
    role: 'Старший продавец',
    avatar: '',
    planPercent: 105,
    margin: { value: 285000, forecast: 105 },
    revenue: { value: 630000, forecast: 102 },
    marginPercent: 45.2,
    lostMargin: -13500, // Reserve (over-achievement)
  },
  {
    id: '2',
    name: 'Елена Новикова',
    role: 'Продавец',
    avatar: '',
    planPercent: 98,
    margin: { value: 265000, forecast: 98 },
    revenue: { value: 580000, forecast: 96 },
    marginPercent: 45.7,
    lostMargin: 5400, // Loss
  },
  {
    id: '3',
    name: 'Ирина Козлова',
    role: 'Продавец',
    avatar: '',
    planPercent: 112,
    margin: { value: 302000, forecast: 112 },
    revenue: { value: 648000, forecast: 108 },
    marginPercent: 46.6,
    lostMargin: -32400, // Reserve
  },
  {
    id: '4',
    name: 'Мария Сидорова',
    role: 'Продавец',
    avatar: '',
    planPercent: 89,
    margin: { value: 240000, forecast: 89 },
    revenue: { value: 555000, forecast: 92 },
    marginPercent: 43.2,
    lostMargin: 29700, // Loss
  },
  {
    id: '5',
    name: 'Ольга Васильева',
    role: 'Старший продавец',
    avatar: '',
    planPercent: 94,
    margin: { value: 254000, forecast: 94 },
    revenue: { value: 542000, forecast: 90 },
    marginPercent: 46.9,
    lostMargin: 16200, // Loss
  },
  {
    id: '6',
    name: 'Наталья Морозова',
    role: 'Продавец',
    avatar: '',
    planPercent: 101,
    margin: { value: 273000, forecast: 101 },
    revenue: { value: 598000, forecast: 99 },
    marginPercent: 45.7,
    lostMargin: -2700, // Reserve
  },
  {
    id: '7',
    name: 'Светлана Волкова',
    role: 'Продавец-консультант',
    avatar: '',
    planPercent: 85,
    margin: { value: 229500, forecast: 85 },
    revenue: { value: 510000, forecast: 85 },
    marginPercent: 45.0,
    lostMargin: 40500, // Loss
  },
  {
    id: '8',
    name: 'Татьяна Федорова',
    role: 'Продавец',
    avatar: '',
    planPercent: 77,
    margin: { value: 208000, forecast: 77 },
    revenue: { value: 485000, forecast: 81 },
    marginPercent: 42.9,
    lostMargin: 62100, // Loss
  },
];

const scaleMarginManagers = (scale: number) => 
  baseMarginManagers.map(m => ({
    ...m,
    margin: { value: Math.round(m.margin.value * scale), forecast: m.margin.forecast },
    revenue: { value: Math.round(m.revenue.value * scale), forecast: m.revenue.forecast },
    lostMargin: Math.round(m.lostMargin * scale),
  }));

export const marginManagersDataByPeriod: Record<FilterPeriod, typeof baseMarginManagers> = {
  day: scaleMarginManagers(1/30),
  '3days': scaleMarginManagers(3/30),
  month: baseMarginManagers,
  year: scaleMarginManagers(12),
  '10clients': scaleMarginManagers(0.33),
  '20clients': scaleMarginManagers(0.67),
  '30clients': baseMarginManagers,
  '50clients': scaleMarginManagers(1.67),
};

// ===== MANAGERS FOR CHART SIDEBAR =====

export const marginManagersForChartByPeriod: Record<FilterPeriod, MarginManagerShiftData[]> = {
  day: baseMarginManagers.slice(0, 5).map(m => ({
    id: m.id,
    name: m.name,
    avatar: m.avatar,
    planPercent: m.planPercent,
    margin: Math.round(m.margin.value / 30),
    marginPlan: Math.round(m.margin.value / 30 / m.planPercent * 100),
  })),
  '3days': baseMarginManagers.slice(0, 5).map(m => ({
    id: m.id,
    name: m.name,
    avatar: m.avatar,
    planPercent: m.planPercent,
    margin: Math.round(m.margin.value * 3 / 30),
    marginPlan: Math.round(m.margin.value * 3 / 30 / m.planPercent * 100),
  })),
  month: baseMarginManagers.slice(0, 5).map(m => ({
    id: m.id,
    name: m.name,
    avatar: m.avatar,
    planPercent: m.planPercent,
    margin: m.margin.value,
    marginPlan: Math.round(m.margin.value / m.planPercent * 100),
  })),
  year: baseMarginManagers.slice(0, 5).map(m => ({
    id: m.id,
    name: m.name,
    avatar: m.avatar,
    planPercent: m.planPercent,
    margin: m.margin.value * 12,
    marginPlan: Math.round(m.margin.value * 12 / m.planPercent * 100),
  })),
  '10clients': baseMarginManagers.slice(0, 5).map(m => ({
    id: m.id,
    name: m.name,
    avatar: m.avatar,
    planPercent: m.planPercent,
    margin: Math.round(m.margin.value * 0.33),
    marginPlan: Math.round(m.margin.value * 0.33 / m.planPercent * 100),
  })),
  '20clients': baseMarginManagers.slice(0, 5).map(m => ({
    id: m.id,
    name: m.name,
    avatar: m.avatar,
    planPercent: m.planPercent,
    margin: Math.round(m.margin.value * 0.67),
    marginPlan: Math.round(m.margin.value * 0.67 / m.planPercent * 100),
  })),
  '30clients': baseMarginManagers.slice(0, 5).map(m => ({
    id: m.id,
    name: m.name,
    avatar: m.avatar,
    planPercent: m.planPercent,
    margin: m.margin.value,
    marginPlan: Math.round(m.margin.value / m.planPercent * 100),
  })),
  '50clients': baseMarginManagers.slice(0, 5).map(m => ({
    id: m.id,
    name: m.name,
    avatar: m.avatar,
    planPercent: m.planPercent,
    margin: Math.round(m.margin.value * 1.67),
    marginPlan: Math.round(m.margin.value * 1.67 / m.planPercent * 100),
  })),
};

// ===== AGGREGATED STATS =====

export const marginStatsByPeriod: Record<FilterPeriod, { current: number; plan: number }> = {
  day: { current: 27500, plan: 28333 },
  '3days': { current: 82500, plan: 85000 },
  month: { current: 850000, plan: 890000 },
  year: { current: 10200000, plan: 10680000 },
  '10clients': { current: 283333, plan: 296667 },
  '20clients': { current: 566667, plan: 593333 },
  '30clients': { current: 850000, plan: 890000 },
  '50clients': { current: 1416667, plan: 1483333 },
};

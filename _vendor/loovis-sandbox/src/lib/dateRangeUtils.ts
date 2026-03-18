import { DateRange } from 'react-day-picker';
import { format, eachDayOfInterval, getDaysInMonth, differenceInDays, isValid } from 'date-fns';
import { ru } from 'date-fns/locale';
import { MonthlyPlan, AVERAGED_METRICS, getMonthlyPlan } from '@/data/monthlyPlans';

// Maximum allowed date range (days)
const MAX_RANGE_DAYS = 365;

// Normalize date range (ensure from <= to, limit range)
export function normalizeDateRange(range: DateRange | undefined): DateRange | undefined {
  if (!range?.from) return undefined;
  
  let from = range.from;
  let to = range.to || range.from;
  
  // Swap if from > to
  if (from > to) {
    [from, to] = [to, from];
  }
  
  // Limit range
  const days = differenceInDays(to, from);
  if (days > MAX_RANGE_DAYS) {
    to = new Date(from);
    to.setDate(to.getDate() + MAX_RANGE_DAYS);
  }
  
  return { from, to };
}

// Check if date range is valid and complete
export function isValidDateRange(range: DateRange | undefined): range is { from: Date; to: Date } {
  return !!(range?.from && range?.to && isValid(range.from) && isValid(range.to));
}

// Get number of days in a date range
export function getDateRangeDays(range: DateRange | undefined): number {
  if (!isValidDateRange(range)) return 0;
  return differenceInDays(range.to, range.from) + 1;
}

// Calculate proportional plan for a custom date range
export function calculatePlanForDateRange(
  dateRange: DateRange,
  metricId: keyof MonthlyPlan
): number {
  if (!isValidDateRange(dateRange)) return 0;

  const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
  
  // Group days by month
  const daysByMonth: Record<string, number> = {};
  days.forEach(day => {
    const monthKey = format(day, 'yyyy-MM');
    daysByMonth[monthKey] = (daysByMonth[monthKey] || 0) + 1;
  });

  // For averaged metrics (percentages, averages) - return weighted average
  const isAveragedMetric = AVERAGED_METRICS.includes(metricId);
  if (isAveragedMetric) {
    let totalValue = 0;
    let totalDays = 0;
    
    Object.entries(daysByMonth).forEach(([monthKey, daysCount]) => {
      const plan = getMonthlyPlan(monthKey);
      totalValue += plan[metricId] * daysCount;
      totalDays += daysCount;
    });
    
    return totalDays > 0 ? Math.round(totalValue / totalDays) : 0;
  }

  // For summed metrics - proportional sum based on days in month
  let totalPlan = 0;
  
  Object.entries(daysByMonth).forEach(([monthKey, daysCount]) => {
    const plan = getMonthlyPlan(monthKey);
    const daysInMonth = getDaysInMonth(new Date(monthKey + '-01'));
    const proportionalPlan = (plan[metricId] / daysInMonth) * daysCount;
    totalPlan += proportionalPlan;
  });

  return Math.round(totalPlan);
}

// Calculate all plans for a date range
export function calculateAllPlansForDateRange(
  dateRange: DateRange
): MonthlyPlan | null {
  if (!isValidDateRange(dateRange)) return null;

  const metrics: (keyof MonthlyPlan)[] = [
    'revenue_sz', 'revenue_zz', 'clients_count', 'orders_count',
    'conversion', 'csi', 'avg_glasses', 'avg_lens', 'avg_frame',
    'margin', 'diagnostics', 'lca_installations', 'repairs_count', 'avg_repair_price'
  ];

  const result = {} as MonthlyPlan;
  metrics.forEach(metric => {
    result[metric] = calculatePlanForDateRange(dateRange, metric);
  });

  return result;
}

// Chart data point type
export interface DateRangeChartDataPoint {
  date: string;
  dayName: string;
  value: number;
  plan: number;
  monthLabel?: string;
  isMonthStart?: boolean;
}

// Generate chart data for a custom date range
export function generateChartDataForDateRange(
  dateRange: DateRange,
  metricId: keyof MonthlyPlan,
  factGenerator?: (date: Date, dailyPlan: number, index: number) => number
): DateRangeChartDataPoint[] {
  if (!isValidDateRange(dateRange)) return [];

  const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
  const isAveragedMetric = AVERAGED_METRICS.includes(metricId);
  const results: DateRangeChartDataPoint[] = [];
  let prevMonth: number | null = null;
  
  days.forEach((day, index) => {
    const monthKey = format(day, 'yyyy-MM');
    const plan = getMonthlyPlan(monthKey);
    const daysInMonth = getDaysInMonth(day);
    const currentMonth = day.getMonth();
    
    // Check if this is a month start (for visual separation)
    const isMonthStart = prevMonth !== null && currentMonth !== prevMonth;
    prevMonth = currentMonth;
    
    // For averaged metrics, daily plan = monthly plan (stays constant)
    // For summed metrics, daily plan = monthly plan / days in month
    const dailyPlan = isAveragedMetric 
      ? plan[metricId]
      : plan[metricId] / daysInMonth;
    
    // Generate fact value
    const defaultFactGenerator = (_: Date, daily: number) => {
      const variance = 0.8 + Math.random() * 0.4; // ±20%
      return Math.round(daily * variance);
    };
    
    const value = factGenerator 
      ? factGenerator(day, dailyPlan, index)
      : defaultFactGenerator(day, dailyPlan);
    
    results.push({
      date: format(day, 'd'),  // Just the day number for compact display
      dayName: format(day, 'EEEEEE', { locale: ru }),
      monthLabel: format(day, 'MMM', { locale: ru }),
      isMonthStart: isMonthStart || index === 0,
      value,
      plan: Math.round(dailyPlan)
    });
  });

  return results;
}

// Format date range for display
export function formatDateRangeLabel(range: DateRange | undefined): string {
  if (!range?.from) return 'Выбрать период';
  
  const from = range.from;
  const to = range.to || from;
  
  const totalDays = differenceInDays(to, from) + 1;
  
  if (totalDays === 1) {
    return format(from, 'd MMM', { locale: ru });
  }
  
  // Same month
  if (format(from, 'MM.yyyy') === format(to, 'MM.yyyy')) {
    return `${format(from, 'd')}-${format(to, 'd MMM', { locale: ru })}`;
  }
  
  // Different months
  return `${format(from, 'd MMM', { locale: ru })} - ${format(to, 'd MMM', { locale: ru })}`;
}

// Get summary label for date range (e.g., "45 дней")
export function getDateRangeSummary(range: DateRange | undefined): string | null {
  if (!isValidDateRange(range)) return null;
  
  const days = getDateRangeDays(range);
  
  if (days === 1) return '1 день';
  if (days >= 2 && days <= 4) return `${days} дня`;
  return `${days} дней`;
}

// Check if a single day range (for hourly chart)
export function isSingleDayRange(range: DateRange | undefined): boolean {
  if (!isValidDateRange(range)) return false;
  return differenceInDays(range.to, range.from) === 0;
}

// Generate chart data for single day (hourly)
export function generateHourlyChartData(
  date: Date,
  metricId: keyof MonthlyPlan,
  factGenerator?: (hour: number, hourlyPlan: number) => number
): DateRangeChartDataPoint[] {
  const workHours = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
  const monthKey = format(date, 'yyyy-MM');
  const plan = getMonthlyPlan(monthKey);
  const daysInMonth = getDaysInMonth(date);
  
  const isAveragedMetric = AVERAGED_METRICS.includes(metricId);
  const dailyPlan = isAveragedMetric 
    ? plan[metricId]
    : plan[metricId] / daysInMonth;
  
  // For summed metrics, divide daily plan by working hours
  const hourlyPlan = isAveragedMetric 
    ? dailyPlan 
    : dailyPlan / workHours.length;
  
  return workHours.map((hour, index) => {
    const defaultFact = () => {
      const variance = 0.7 + Math.random() * 0.6;
      return Math.round(hourlyPlan * variance);
    };
    
    const value = factGenerator 
      ? factGenerator(hour, hourlyPlan)
      : defaultFact();
    
    return {
      date: `${hour.toString().padStart(2, '0')}:00`,
      dayName: '',
      monthLabel: undefined,
      isMonthStart: index === 0,
      value,
      plan: Math.round(hourlyPlan)
    };
  });
}

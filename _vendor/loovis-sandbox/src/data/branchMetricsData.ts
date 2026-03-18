import { FilterPeriod } from '@/components/dashboard/FilterBar';
import { FullWidthKPIMetric } from '@/components/dashboard/KPIFullWidthCard';
import { BRANCHES } from './branchData';
import { kpiColors } from './mockData';

// Types for ranking
type ForecastLabel = 'forecast' | 'deviation';

interface MetricIndicator {
  value: number;
  plan: number;
  forecast: number;
  label: ForecastLabel;
}

export interface BranchRankingData {
  id: string;
  rank: number;
  name: string;
  type: string;
  planPercent: number;
  revenueSz: MetricIndicator;
  revenueZz: MetricIndicator;
  clientsCount: MetricIndicator;
  conversion: MetricIndicator;
  csi: MetricIndicator;
  avgGlassesPrice: MetricIndicator;
  margin: MetricIndicator;
  repairs: MetricIndicator;
  lostRevenue: number;
}

// Branch scale factors (relative to Moscow club as baseline)
const branchScales: Record<string, number> = {
  moscow_club: 1.0,
  spb_clinic: 0.66,
  kaliningrad_club: 0.51,
  kaliningrad_clinic: 0.35,
  yakutsk_club: 0.59,
  yakutsk_clinic: 0.26,
  kazan_club: 0.46,
};

// Base metrics for Moscow club (month period) - using same colors as leaderTopMetrics
const baseMetrics: FullWidthKPIMetric[] = [
  {
    id: 'revenue_sz',
    name: 'Выручка СЗ',
    current: 2800000,
    plan: 3500000,
    forecast: 80,
    forecastLabel: 'forecast',
    forecastValue: 80,
    forecastUnit: '%',
    loss: 700000,
    unit: '₽',
    trend: 'up',
    trendValue: 5,
    status: 'warning',
    color: kpiColors.revenue_sz,
  },
  {
    id: 'revenue_zz',
    name: 'Выручка ЗЗ',
    current: 2434000,
    plan: 3146000,
    forecast: 77,
    forecastLabel: 'forecast',
    forecastValue: 77,
    forecastUnit: '%',
    reserve: 320000,
    unit: '₽',
    trend: 'up',
    trendValue: 3,
    status: 'warning',
    color: kpiColors.revenue_zz,
  },
  {
    id: 'clients_count',
    name: 'Кол-во ФЛ',
    current: 156,
    plan: 200,
    forecast: 78,
    forecastLabel: 'forecast',
    forecastValue: 78,
    forecastUnit: '%',
    loss: 44,
    unit: 'шт',
    trend: 'stable',
    status: 'warning',
    color: kpiColors.clients_count,
  },
  {
    id: 'conversion',
    name: 'Конверсия',
    current: 45,
    plan: 55,
    forecast: 82,
    forecastLabel: 'deviation',
    forecastValue: -18,
    forecastUnit: '%',
    loss: 215000,
    unit: '%',
    trend: 'down',
    trendValue: 3,
    status: 'warning',
    color: kpiColors.conversion,
  },
  {
    id: 'csi',
    name: 'CSI',
    current: 100,
    plan: 95,
    forecast: 105,
    forecastLabel: 'deviation',
    forecastValue: 5,
    forecastUnit: '%',
    unit: '%',
    trend: 'up',
    trendValue: 1,
    status: 'good',
    color: kpiColors.csi,
  },
  {
    id: 'avg_glasses_price',
    name: 'Ср. стоимость очков',
    current: 18500,
    plan: 20000,
    forecast: 93,
    forecastLabel: 'deviation',
    forecastValue: -8,
    forecastUnit: '%',
    loss: 122000,
    unit: '₽',
    trend: 'up',
    trendValue: 2,
    status: 'warning',
    color: kpiColors.avg_glasses_price,
  },
  {
    id: 'margin',
    name: 'Маржа',
    current: 840000,
    plan: 1050000,
    forecast: 80,
    forecastLabel: 'deviation',
    forecastValue: -20,
    forecastUnit: '%',
    loss: 210000,
    unit: '₽',
    trend: 'stable',
    status: 'warning',
    color: kpiColors.margin,
  },
  {
    id: 'repairs',
    name: 'Ремонты',
    current: 42,
    plan: 50,
    forecast: 84,
    forecastLabel: 'forecast',
    forecastValue: 84,
    forecastUnit: '%',
    loss: 8,
    unit: 'шт',
    trend: 'down',
    status: 'critical',
    color: kpiColors.avg_repair_price,
  },
];

// Unique variations for each branch (to make data different)
const branchVariations: Record<string, { conversionBonus: number; csiBonus: number; marginMult: number }> = {
  moscow_club: { conversionBonus: 0, csiBonus: 5, marginMult: 0.30 },
  spb_clinic: { conversionBonus: 7, csiBonus: -1, marginMult: 0.32 },
  kaliningrad_club: { conversionBonus: 3, csiBonus: 2, marginMult: 0.28 },
  kaliningrad_clinic: { conversionBonus: 10, csiBonus: -3, marginMult: 0.31 },
  yakutsk_club: { conversionBonus: 6, csiBonus: 0, marginMult: 0.29 },
  yakutsk_clinic: { conversionBonus: 13, csiBonus: -2, marginMult: 0.33 },
  kazan_club: { conversionBonus: 4, csiBonus: 1, marginMult: 0.27 },
};

// Generate metrics for a specific branch
function generateBranchMetrics(branchId: string): FullWidthKPIMetric[] {
  const scale = branchScales[branchId] || 1.0;
  const variation = branchVariations[branchId] || { conversionBonus: 0, csiBonus: 0, marginMult: 0.30 };

  return baseMetrics.map(metric => {
    if (metric.id === 'conversion') {
      const newCurrent = Math.min(100, baseMetrics.find(m => m.id === 'conversion')!.current + variation.conversionBonus);
      return {
        ...metric,
        current: newCurrent,
        forecast: Math.round((newCurrent / metric.plan) * 100),
      };
    }
    
    if (metric.id === 'csi') {
      const newCurrent = Math.max(85, Math.min(100, baseMetrics.find(m => m.id === 'csi')!.current + variation.csiBonus));
      return {
        ...metric,
        current: newCurrent,
        forecast: Math.round((newCurrent / metric.plan) * 100),
      };
    }

    if (metric.unit === '%') {
      return metric;
    }

    const scaledCurrent = Math.round(metric.current * scale);
    const scaledPlan = Math.round(metric.plan * scale);
    const scaledLoss = metric.loss ? Math.round(metric.loss * scale) : undefined;
    
    // Special handling for margin - calculate from revenue
    if (metric.id === 'margin') {
      const revenueSz = Math.round(baseMetrics.find(m => m.id === 'revenue_sz')!.current * scale);
      const marginCurrent = Math.round(revenueSz * variation.marginMult);
      const marginPlan = Math.round(scaledPlan);
      return {
        ...metric,
        current: marginCurrent,
        plan: marginPlan,
        forecast: Math.round((marginCurrent / marginPlan) * 100),
        loss: Math.max(0, marginPlan - marginCurrent),
      };
    }

    return {
      ...metric,
      current: scaledCurrent,
      plan: scaledPlan,
      forecast: Math.round((scaledCurrent / scaledPlan) * 100),
      loss: scaledLoss,
    };
  });
}

// Branch metrics by branchId and period
export const branchMetricsByPeriod: Record<string, Record<FilterPeriod, FullWidthKPIMetric[]>> = {};

// Period multipliers for scaling
const periodMultipliers: Record<FilterPeriod, { current: number; plan: number }> = {
  'day': { current: 0.033, plan: 0.033 },
  '3days': { current: 0.1, plan: 0.1 },
  'month': { current: 1, plan: 1 },
  'year': { current: 12, plan: 12 },
  '10clients': { current: 0.1, plan: 0.1 },
  '20clients': { current: 0.2, plan: 0.2 },
  '30clients': { current: 0.3, plan: 0.3 },
  '50clients': { current: 0.5, plan: 0.5 },
};

// Scale metrics by period
function scaleMetricsByPeriod(metrics: FullWidthKPIMetric[], period: FilterPeriod): FullWidthKPIMetric[] {
  const mult = periodMultipliers[period];
  
  return metrics.map(m => {
    if (m.unit === '%') {
      return m;
    }
    
    const scaledCurrent = Math.round(m.current * mult.current);
    const scaledPlan = Math.round(m.plan * mult.plan);
    
    return {
      ...m,
      current: scaledCurrent,
      plan: scaledPlan,
      forecast: scaledPlan > 0 ? Math.round((scaledCurrent / scaledPlan) * 100) : 0,
      loss: m.loss ? Math.round(m.loss * mult.plan) : undefined,
      reserve: m.reserve ? Math.round(m.reserve * mult.plan) : undefined,
    };
  });
}

// Initialize branch metrics for all branches and periods
BRANCHES.forEach(branch => {
  const monthMetrics = generateBranchMetrics(branch.id);
  branchMetricsByPeriod[branch.id] = {} as Record<FilterPeriod, FullWidthKPIMetric[]>;
  
  const periods: FilterPeriod[] = ['day', '3days', 'month', 'year', '10clients', '20clients', '30clients', '50clients'];
  periods.forEach(period => {
    branchMetricsByPeriod[branch.id][period] = scaleMetricsByPeriod(monthMetrics, period);
  });
});

// Aggregation function for multiple branches
export function aggregateBranchMetrics(
  branchIds: string[],
  period: FilterPeriod
): FullWidthKPIMetric[] {
  if (branchIds.length === 0) {
    return [];
  }
  
  if (branchIds.length === 1) {
    return branchMetricsByPeriod[branchIds[0]]?.[period] || [];
  }
  
  // Get all metrics for selected branches
  const allBranchMetrics = branchIds
    .map(id => branchMetricsByPeriod[id]?.[period])
    .filter(Boolean);
  
  if (allBranchMetrics.length === 0) {
    return [];
  }
  
  // Use first branch's metrics as template
  const template = allBranchMetrics[0];
  
  return template.map((metric, index) => {
    const values = allBranchMetrics.map(m => m[index]);
    
    // For percentage metrics, calculate weighted average (by clients)
    if (metric.unit === '%') {
      const totalCurrent = values.reduce((sum, v) => sum + v.current, 0) / values.length;
      const totalPlan = values.reduce((sum, v) => sum + v.plan, 0) / values.length;
      
      return {
        ...metric,
        current: Math.round(totalCurrent),
        plan: Math.round(totalPlan),
        forecast: totalPlan > 0 ? Math.round((totalCurrent / totalPlan) * 100) : 0,
      };
    }
    
    // For absolute metrics, sum values
    const totalCurrent = values.reduce((sum, v) => sum + v.current, 0);
    const totalPlan = values.reduce((sum, v) => sum + v.plan, 0);
    const totalLoss = values.reduce((sum, v) => sum + (v.loss || 0), 0);
    const totalReserve = values.reduce((sum, v) => sum + (v.reserve || 0), 0);
    
    return {
      ...metric,
      current: totalCurrent,
      plan: totalPlan,
      forecast: totalPlan > 0 ? Math.round((totalCurrent / totalPlan) * 100) : 0,
      loss: totalLoss > 0 ? totalLoss : undefined,
      reserve: totalReserve > 0 ? totalReserve : undefined,
    };
  });
}

// Get all branch IDs
export function getAllBranchIds(): string[] {
  return BRANCHES.map(b => b.id);
}

// Get branch name by ID
export function getBranchName(branchId: string): string {
  return BRANCHES.find(b => b.id === branchId)?.name || branchId;
}

// Get branch type by ID
function getBranchType(branchId: string): string {
  const name = getBranchName(branchId).toLowerCase();
  if (name.includes('клиника')) return 'Клиника';
  return 'Клуб';
}

// Metric label mapping
const metricLabels: Record<string, ForecastLabel> = {
  'revenue_sz': 'forecast',
  'revenue_zz': 'forecast',
  'clients_count': 'forecast',
  'conversion': 'deviation',
  'csi': 'deviation',
  'avg_glasses_price': 'deviation',
  'margin': 'deviation',
  'repairs': 'forecast',
};

// Get branch ranking data for a period
export function getBranchRankingData(period: FilterPeriod): BranchRankingData[] {
  return BRANCHES.map((branch, index) => {
    const metrics = branchMetricsByPeriod[branch.id]?.[period] || [];
    
    const getMetric = (id: string): MetricIndicator => {
      const m = metrics.find(metric => metric.id === id);
      return {
        value: m?.current || 0,
        plan: m?.plan || 0,
        forecast: m?.forecast || 0,
        label: metricLabels[id] || 'forecast',
      };
    };
    
    // Calculate average plan percent
    const avgForecast = metrics.length > 0 
      ? metrics.reduce((sum, m) => sum + m.forecast, 0) / metrics.length
      : 0;
    
    // Calculate total losses (sum of all metric losses)
    const totalLoss = metrics
      .filter(m => m.unit !== '%' && m.loss)
      .reduce((sum, m) => sum + (m.loss || 0), 0);
    
    return {
      id: branch.id,
      rank: index + 1,
      name: branch.name,
      type: getBranchType(branch.id),
      planPercent: Math.round(avgForecast),
      revenueSz: getMetric('revenue_sz'),
      revenueZz: getMetric('revenue_zz'),
      clientsCount: getMetric('clients_count'),
      conversion: getMetric('conversion'),
      csi: getMetric('csi'),
      avgGlassesPrice: getMetric('avg_glasses_price'),
      margin: getMetric('margin'),
      repairs: getMetric('repairs'),
      lostRevenue: totalLoss,
    };
  });
}

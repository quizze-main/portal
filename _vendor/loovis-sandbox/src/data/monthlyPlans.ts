// Monthly plan configuration for proportional date range calculations

export interface MonthlyPlan {
  revenue_sz: number;      // Выручка СЗ - суммируется
  revenue_zz: number;      // Выручка ЗЗ - суммируется
  clients_count: number;   // Количество клиентов - суммируется
  orders_count: number;    // Количество заказов - суммируется
  conversion: number;      // Конверсия % - усредняется
  csi: number;             // CSI % - усредняется
  avg_glasses: number;     // Средняя стоимость очков - усредняется
  avg_lens: number;        // Средняя стоимость линз - усредняется
  avg_frame: number;       // Средняя стоимость оправ - усредняется
  margin: number;          // Маржа ₽ - суммируется
  diagnostics: number;     // Диагностики - суммируется
  lca_installations: number; // Установки ЛКА - суммируется
  repairs_count: number;   // Ремонтов - суммируется
  avg_repair_price: number; // Средняя стоимость ремонта - усредняется
}

// Metrics that should be averaged (percentages and averages) vs summed
export const AVERAGED_METRICS: (keyof MonthlyPlan)[] = [
  'conversion',
  'csi',
  'avg_glasses',
  'avg_lens',
  'avg_frame',
  'avg_repair_price'
];

// Plan configuration by month (key format: 'YYYY-MM')
export const monthlyPlans: Record<string, MonthlyPlan> = {
  '2024-11': {
    revenue_sz: 3200000,
    revenue_zz: 2900000,
    clients_count: 180,
    orders_count: 198,
    conversion: 53,
    csi: 94,
    avg_glasses: 17500,
    avg_lens: 8500,
    avg_frame: 9000,
    margin: 960000,
    diagnostics: 144,
    lca_installations: 90,
    repairs_count: 35,
    avg_repair_price: 3000
  },
  '2024-12': {
    revenue_sz: 4200000,  // Высокий сезон (Новый Год) → ~135К/день
    revenue_zz: 3800000,
    clients_count: 240,
    orders_count: 264,
    conversion: 58,
    csi: 95,
    avg_glasses: 20000,
    avg_lens: 9500,
    avg_frame: 10500,
    margin: 1260000,
    diagnostics: 192,
    lca_installations: 120,
    repairs_count: 45,
    avg_repair_price: 3100
  },
  '2025-01': {
    revenue_sz: 3100000,  // 100К/день (100 000 × 31 день)
    revenue_zz: 2500000,
    clients_count: 160,
    orders_count: 176,
    conversion: 52,
    csi: 94,
    avg_glasses: 16500,
    avg_lens: 8000,
    avg_frame: 8500,
    margin: 930000,
    diagnostics: 128,
    lca_installations: 80,
    repairs_count: 32,
    avg_repair_price: 3200
  },
  '2025-02': {
    revenue_sz: 3200000,
    revenue_zz: 2900000,
    clients_count: 180,
    orders_count: 198,
    conversion: 57,
    csi: 96,
    avg_glasses: 18500,
    avg_lens: 9000,
    avg_frame: 9500,
    margin: 1050000,
    diagnostics: 144,
    lca_installations: 90,
    repairs_count: 32,
    avg_repair_price: 3300
  },
  '2025-03': {
    revenue_sz: 3600000,
    revenue_zz: 3250000,
    clients_count: 210,
    orders_count: 231,
    conversion: 56,
    csi: 95,
    avg_glasses: 18200,
    avg_lens: 8800,
    avg_frame: 9400,
    margin: 1080000,
    diagnostics: 168,
    lca_installations: 105,
    repairs_count: 40,
    avg_repair_price: 3150
  },
  '2026-01': {
    revenue_sz: 3100000,  // 100К/день (100 000 × 31 день)
    revenue_zz: 2500000,
    clients_count: 160,
    orders_count: 176,
    conversion: 52,
    csi: 94,
    avg_glasses: 16500,
    avg_lens: 8000,
    avg_frame: 8500,
    margin: 1050000,
    diagnostics: 128,
    lca_installations: 80,
    repairs_count: 32,
    avg_repair_price: 3200
  },
  // Default fallback plan (used when month is not found)
  'default': {
    revenue_sz: 3500000,
    revenue_zz: 3146000,
    clients_count: 200,
    orders_count: 220,
    conversion: 55,
    csi: 95,
    avg_glasses: 18000,
    avg_lens: 8700,
    avg_frame: 9300,
    margin: 1050000,
    diagnostics: 160,
    lca_installations: 100,
    repairs_count: 38,
    avg_repair_price: 3200
  }
};

// Get plan for a specific month (with fallback)
export function getMonthlyPlan(monthKey: string): MonthlyPlan {
  return monthlyPlans[monthKey] || monthlyPlans['default'];
}

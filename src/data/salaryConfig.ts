/**
 * Конфигурация расчёта зарплаты и матрицы мотивации
 *
 * Архитектура мультиматричной системы:
 * - Каждая комбинация филиал + должность может иметь свою матрицу премий
 * - Уровни менеджера и клуба — динамические (можно добавлять/удалять)
 * - Fallback: default_<position> → default_manager
 */

export const BASE_SALARY = 40000;

// ============================================
// Определение уровней (динамическое)
// ============================================

export interface LevelDefinition {
  label: string;      // Метка: '<100%', '100%', '130%', etc.
  threshold: number;  // Минимальный процент для достижения уровня
}

// Дефолтные уровни менеджера
export const DEFAULT_MANAGER_LEVELS: LevelDefinition[] = [
  { label: '<100%', threshold: 0 },
  { label: '100%', threshold: 100 },
  { label: '110%', threshold: 110 },
  { label: '120%', threshold: 120 },
  { label: '130%', threshold: 130 },
];

// Дефолтные уровни клуба
export const DEFAULT_CLUB_LEVELS: LevelDefinition[] = [
  { label: '<95%', threshold: 0 },
  { label: '100%', threshold: 95 },
  { label: '110%>', threshold: 110 },
];

// Уровни как массивы строк (для обратной совместимости)
export const MANAGER_LEVELS = DEFAULT_MANAGER_LEVELS.map(l => l.label);
export const CLUB_LEVELS = DEFAULT_CLUB_LEVELS.map(l => l.label);

// Типы — строки (динамические, не литералы)
export type ManagerLevel = string;
export type ClubLevel = string;

// Тип матрицы премий N×M (динамический)
export type MotivationMatrixType = Record<string, Record<string, number>>;

// KPI показатели
export interface KPITier {
  range: string;
  bonus: number;
  minPercent: number;
  maxPercent: number;
}

export interface KPIConfig {
  id: string;
  label: string;
  type?: 'tier' | 'multiplier';  // 'tier' = кнопки выбора уровня, 'multiplier' = инпут для ввода количества
  multiplierRate?: number;        // Ставка за единицу (для type='multiplier')
  linkedMetricId?: string;        // Ссылка на dashboard metric для авто-привязки KPI к факту/плану
  tiers: KPITier[];
}

// ============================================
// Конфигурация для филиала + должности
// ============================================

export interface BranchPositionConfig {
  branchId: string;
  positionId: string;
  matrix: MotivationMatrixType;
  kpis: KPIConfig[];
  baseSalary: number;
  personalPlan: number;
  clubPlan: number;
  managerLevels?: LevelDefinition[];
  clubLevels?: LevelDefinition[];
  managerAxisLabel?: string;
  clubAxisLabel?: string;
  managerLinkedMetricId?: string | null;  // привязка оси столбцов к метрике дашборда
  clubLinkedMetricId?: string | null;     // привязка оси строк к метрике дашборда
}

// Дефолтные названия осей
export const DEFAULT_MANAGER_AXIS_LABEL = 'План менеджера по СЗ';
export const DEFAULT_CLUB_AXIS_LABEL = 'План филиала по СЗ';

// Хелперы для определения 1D-матрицы
export function isManagerAxisOnly(config?: BranchPositionConfig): boolean {
  return getClubLevelsFromConfig(config).length === 1;
}

export function isClubAxisOnly(config?: BranchPositionConfig): boolean {
  return getManagerLevelsFromConfig(config).length === 1;
}

export function is1DMatrix(config?: BranchPositionConfig): boolean {
  return isManagerAxisOnly(config) || isClubAxisOnly(config);
}

// Получить уровни менеджера из конфигурации (с fallback на дефолтные)
export function getManagerLevelsFromConfig(config?: BranchPositionConfig): LevelDefinition[] {
  return config?.managerLevels ?? DEFAULT_MANAGER_LEVELS;
}

// Получить уровни клуба из конфигурации (с fallback на дефолтные)
export function getClubLevelsFromConfig(config?: BranchPositionConfig): LevelDefinition[] {
  return config?.clubLevels ?? DEFAULT_CLUB_LEVELS;
}

// Получить метки уровней менеджера (строки)
export function getManagerLevelLabels(config?: BranchPositionConfig): string[] {
  return getManagerLevelsFromConfig(config).map(l => l.label);
}

// Получить метки уровней клуба (строки)
export function getClubLevelLabels(config?: BranchPositionConfig): string[] {
  return getClubLevelsFromConfig(config).map(l => l.label);
}

// Дефолтная матрица (используется как fallback)
export const DEFAULT_MATRIX: MotivationMatrixType = {
  '<95%':  { '<100%': 2.5, '100%': 2.5, '110%': 3.0, '120%': 3.5, '130%': 4.0 },
  '100%':  { '<100%': 2.5, '100%': 3.5, '110%': 4.0, '120%': 4.5, '130%': 5.0 },
  '110%>': { '<100%': 2.5, '100%': 4.0, '110%': 4.5, '120%': 5.0, '130%': 5.5 },
};

// Дефолтный KPI
export const DEFAULT_KPI: KPIConfig[] = [
  {
    id: 'closure_time',
    label: 'Время закрытия заказа до 10 дней',
    tiers: [
      { range: '>100%', bonus: 10000, minPercent: 100, maxPercent: 999 },
      { range: '90-100%', bonus: 5000, minPercent: 90, maxPercent: 100 },
      { range: '<90%', bonus: 0, minPercent: 0, maxPercent: 90 },
    ],
  },
];

// ============================================
// Справочник конфигураций по филиалам и должностям
// ============================================

export const SALARY_CONFIGS: Record<string, BranchPositionConfig> = {
  // === ДЕФОЛТНЫЕ КОНФИГУРАЦИИ ===
  
  // Дефолтный менеджер (fallback для всех филиалов)
  'default_manager': {
    branchId: 'default',
    positionId: 'manager',
    baseSalary: 40000,
    personalPlan: 1000000,
    clubPlan: 3000000,
    matrix: DEFAULT_MATRIX,
    kpis: DEFAULT_KPI,
  },

  // Дефолтный старший менеджер
  'default_senior_manager': {
    branchId: 'default',
    positionId: 'senior_manager',
    baseSalary: 45000,
    personalPlan: 1200000,
    clubPlan: 3000000,
    matrix: DEFAULT_MATRIX,
    kpis: DEFAULT_KPI,
  },

  // Дефолтный оптометрист
  'default_optometrist': {
    branchId: 'default',
    positionId: 'optometrist',
    baseSalary: 35000,
    personalPlan: 800000,
    clubPlan: 3000000,
    matrix: DEFAULT_MATRIX,
    kpis: DEFAULT_KPI,
  },
  
  // === СПЕЦИФИЧЕСКИЕ КОНФИГУРАЦИИ ===
  
  // Казань клуб — Менеджер-универсал
  'kazan_club_universal_manager': {
    branchId: 'kazan_club',
    positionId: 'universal_manager',
    baseSalary: 40000,
    personalPlan: 1000000,
    clubPlan: 1320000,
    matrix: {
      '<95%':  { '<100%': 3.0, '100%': 3.5, '110%': 4.5, '120%': 4.0, '130%': 4.5 },
      '100%':  { '<100%': 3.0, '100%': 4.5, '110%': 5.0, '120%': 5.5, '130%': 6.0 },
      '110%>': { '<100%': 3.0, '100%': 5.0, '110%': 5.5, '120%': 6.0, '130%': 6.5 },
    },
    kpis: [
      {
        id: 'design_lenses',
        label: 'Линзы с дизайном',
        tiers: [
          { range: 'Выполнено', bonus: 5000, minPercent: 100, maxPercent: 999 },
          { range: 'Не выполнено', bonus: 0, minPercent: 0, maxPercent: 100 },
        ],
      },
      {
        id: 'closure_time',
        label: 'Время закрытия заказа менее 10 дней',
        tiers: [
          { range: '90-100%', bonus: 5000, minPercent: 90, maxPercent: 100 },
          { range: '85-90%', bonus: 2500, minPercent: 85, maxPercent: 90 },
          { range: '<85%', bonus: 0, minPercent: 0, maxPercent: 85 },
        ],
      },
    ],
  },
  // Санкт-Петербург клиника — Менеджер заботы
  'spb_clinic_manager': {
    branchId: 'spb_clinic',
    positionId: 'manager',
    baseSalary: 35000,
    personalPlan: 1000000,
    clubPlan: 3500000,
    matrix: {
      '<95%':  { '<100%': 3.0, '100%': 3.5, '110%': 4.0, '120%': 4.5, '130%': 5.0 },
      '100%':  { '<100%': 3.0, '100%': 4.0, '110%': 4.5, '120%': 5.0, '130%': 5.5 },
      '110%>': { '<100%': 3.0, '100%': 4.5, '110%': 5.0, '120%': 5.5, '130%': 6.0 },
    },
    kpis: [
      {
        id: 'closure_time',
        label: 'Время закрытия заказа менее 10 дней',
        tiers: [
          { range: '90-100%', bonus: 10000, minPercent: 90, maxPercent: 100 },
          { range: '85-90%', bonus: 5000, minPercent: 85, maxPercent: 90 },
          { range: '<85%', bonus: 0, minPercent: 0, maxPercent: 85 },
        ],
      },
    ],
  },
  // Калининград клиника — Менеджер заботы
  'kaliningrad_clinic_manager': {
    branchId: 'kaliningrad_clinic',
    positionId: 'manager',
    baseSalary: 30000,
    personalPlan: 1000000,
    clubPlan: 1550000,
    matrix: {
      '<95%':  { '<100%': 2.5, '100%': 3.0, '110%': 3.5, '120%': 4.0, '130%': 4.5 },
      '100%':  { '<100%': 2.5, '100%': 3.5, '110%': 4.0, '120%': 4.5, '130%': 5.0 },
      '110%>': { '<100%': 2.5, '100%': 4.0, '110%': 4.5, '120%': 5.0, '130%': 5.5 },
    },
    kpis: [
      {
        id: 'closure_time',
        label: 'Время закрытия заказа менее 10 дней',
        tiers: [
          { range: '90-100%', bonus: 5000, minPercent: 90, maxPercent: 100 },
          { range: '85-90%', bonus: 2500, minPercent: 85, maxPercent: 90 },
          { range: '<85%', bonus: 0, minPercent: 0, maxPercent: 85 },
        ],
      },
    ],
  },
  // Калининград клиника — Оптометрист
  'kaliningrad_clinic_optometrist': {
    branchId: 'kaliningrad_clinic',
    positionId: 'optometrist',
    baseSalary: 40000,
    personalPlan: 1000000,
    clubPlan: 1550000,
    matrix: {
      '<95%':  { '<100%': 3.0, '100%': 3.5, '110%': 4.0, '120%': 4.5, '130%': 5.0 },
      '100%':  { '<100%': 3.0, '100%': 4.0, '110%': 4.5, '120%': 5.0, '130%': 5.5 },
      '110%>': { '<100%': 3.0, '100%': 4.5, '110%': 5.0, '120%': 5.5, '130%': 6.0 },
    },
    kpis: [
      {
        id: 'lenses_design',
        label: 'Кол-во линз с дизайном',
        tiers: [
          { range: 'Выполнено', bonus: 10000, minPercent: 100, maxPercent: 100 },
          { range: 'Не выполнено', bonus: 0, minPercent: 0, maxPercent: 100 },
        ],
      },
    ],
  },
  // Якутск клуб — Менеджер заботы
  'yakutsk_club_manager': {
    branchId: 'yakutsk_club',
    positionId: 'manager',
    baseSalary: 20000,
    personalPlan: 1000000,
    clubPlan: 9100000,
    matrix: {
      '<95%':  { '<100%': 3.0, '100%': 4.0, '110%': 4.5, '120%': 5.0, '130%': 5.5 },
      '100%':  { '<100%': 3.0, '100%': 4.5, '110%': 5.0, '120%': 5.5, '130%': 6.0 },
      '110%>': { '<100%': 3.0, '100%': 5.0, '110%': 5.5, '120%': 6.0, '130%': 6.5 },
    },
    kpis: [
      {
        id: 'closure_time',
        label: 'Время закрытия заказа менее 10 дней',
        tiers: [
          { range: '90-100%', bonus: 3000, minPercent: 90, maxPercent: 100 },
          { range: '85-90%', bonus: 1500, minPercent: 85, maxPercent: 90 },
          { range: '<85%', bonus: 0, minPercent: 0, maxPercent: 85 },
        ],
      },
    ],
  },
  // Якутск клиника — Менеджер заботы (идентично Якутск клуб)
  'yakutsk_clinic_manager': {
    branchId: 'yakutsk_clinic',
    positionId: 'manager',
    baseSalary: 20000,
    personalPlan: 1000000,
    clubPlan: 4800000,
    matrix: {
      '<95%':  { '<100%': 3.0, '100%': 4.0, '110%': 4.5, '120%': 5.0, '130%': 5.5 },
      '100%':  { '<100%': 3.0, '100%': 4.5, '110%': 5.0, '120%': 5.5, '130%': 6.0 },
      '110%>': { '<100%': 3.0, '100%': 5.0, '110%': 5.5, '120%': 6.0, '130%': 6.5 },
    },
    kpis: [
      {
        id: 'closure_time',
        label: 'Время закрытия заказа менее 10 дней',
        tiers: [
          { range: '90-100%', bonus: 3000, minPercent: 90, maxPercent: 100 },
          { range: '85-90%', bonus: 1500, minPercent: 85, maxPercent: 90 },
          { range: '<85%', bonus: 0, minPercent: 0, maxPercent: 85 },
        ],
      },
    ],
  },
  // Якутск клуб — Старший менеджер
  'yakutsk_club_senior_manager': {
    branchId: 'yakutsk_club',
    positionId: 'senior_manager',
    baseSalary: 30000,
    personalPlan: 1000000,
    clubPlan: 9100000,
    matrix: {
      '<95%':  { '<100%': 3.0, '100%': 4.0, '110%': 4.5, '120%': 5.0, '130%': 5.5 },
      '100%':  { '<100%': 3.0, '100%': 4.5, '110%': 5.0, '120%': 5.5, '130%': 6.0 },
      '110%>': { '<100%': 3.0, '100%': 5.0, '110%': 5.5, '120%': 6.0, '130%': 6.5 },
    },
    kpis: [
      {
        id: 'closure_time',
        label: 'Время закрытия заказа менее 10 дней',
        tiers: [
          { range: '90-100%', bonus: 3000, minPercent: 90, maxPercent: 100 },
          { range: '85-90%', bonus: 1500, minPercent: 85, maxPercent: 90 },
          { range: '<85%', bonus: 0, minPercent: 0, maxPercent: 85 },
        ],
      },
    ],
  },
  // Якутск клиника — Старший менеджер
  'yakutsk_clinic_senior_manager': {
    branchId: 'yakutsk_clinic',
    positionId: 'senior_manager',
    baseSalary: 30000,
    personalPlan: 1000000,
    clubPlan: 4800000,
    matrix: {
      '<95%':  { '<100%': 3.0, '100%': 4.0, '110%': 4.5, '120%': 5.0, '130%': 5.5 },
      '100%':  { '<100%': 3.0, '100%': 4.5, '110%': 5.0, '120%': 5.5, '130%': 6.0 },
      '110%>': { '<100%': 3.0, '100%': 5.0, '110%': 5.5, '120%': 6.0, '130%': 6.5 },
    },
    kpis: [
      {
        id: 'closure_time',
        label: 'Время закрытия заказа менее 10 дней',
        tiers: [
          { range: '90-100%', bonus: 3000, minPercent: 90, maxPercent: 100 },
          { range: '85-90%', bonus: 1500, minPercent: 85, maxPercent: 90 },
          { range: '<85%', bonus: 0, minPercent: 0, maxPercent: 85 },
        ],
      },
    ],
  },
  // Калининград клуб — Старший менеджер
  'kaliningrad_club_senior_manager': {
    branchId: 'kaliningrad_club',
    positionId: 'senior_manager',
    baseSalary: 40000,
    personalPlan: 1000000,
    clubPlan: 3500000,
    matrix: {
      '<95%':  { '<100%': 2.5, '100%': 3.0, '110%': 3.5, '120%': 4.0, '130%': 4.5 },
      '100%':  { '<100%': 2.5, '100%': 3.5, '110%': 4.0, '120%': 4.5, '130%': 5.0 },
      '110%>': { '<100%': 2.5, '100%': 4.0, '110%': 4.5, '120%': 5.0, '130%': 5.5 },
    },
    kpis: [
      {
        id: 'closure_time',
        label: 'Время закрытия заказа менее 10 дней',
        tiers: [
          { range: '90-100%', bonus: 10000, minPercent: 90, maxPercent: 100 },
          { range: '85-90%', bonus: 5000, minPercent: 85, maxPercent: 90 },
          { range: '<85%', bonus: 0, minPercent: 0, maxPercent: 85 },
        ],
      },
    ],
  },
  // Калининград клуб — Менеджер 2/2
  'kaliningrad_club_manager_2_2': {
    branchId: 'kaliningrad_club',
    positionId: 'manager_2_2',
    baseSalary: 21600,
    personalPlan: 1000000,
    clubPlan: 3500000,
    matrix: {
      '<95%':  { '<100%': 4.5, '100%': 5.0, '110%': 5.5, '120%': 6.0, '130%': 6.5 },
      '100%':  { '<100%': 4.5, '100%': 5.5, '110%': 6.0, '120%': 6.5, '130%': 7.0 },
      '110%>': { '<100%': 4.5, '100%': 6.0, '110%': 6.5, '120%': 7.0, '130%': 7.5 },
    },
    kpis: [
      {
        id: 'closure_time',
        label: 'Время закрытия заказа менее 10 дней',
        tiers: [
          { range: '90-100%', bonus: 5000, minPercent: 90, maxPercent: 100 },
          { range: '85-90%', bonus: 2500, minPercent: 85, maxPercent: 90 },
          { range: '<85%', bonus: 0, minPercent: 0, maxPercent: 85 },
        ],
      },
    ],
  },
  // Калининград клуб — Менеджер 5/2
  'kaliningrad_club_manager_5_2': {
    branchId: 'kaliningrad_club',
    positionId: 'manager_5_2',
    baseSalary: 35000,
    personalPlan: 1000000,
    clubPlan: 3500000,
    matrix: {
      '<95%':  { '<100%': 2.5, '100%': 2.5, '110%': 3.0, '120%': 3.5, '130%': 4.0 },
      '100%':  { '<100%': 2.5, '100%': 3.0, '110%': 3.5, '120%': 4.0, '130%': 4.5 },
      '110%>': { '<100%': 2.5, '100%': 3.5, '110%': 4.0, '120%': 4.5, '130%': 5.0 },
    },
    kpis: [
      {
        id: 'closure_time',
        label: 'Время закрытия заказа менее 10 дней',
        tiers: [
          { range: '90-100%', bonus: 5000, minPercent: 90, maxPercent: 100 },
          { range: '85-90%', bonus: 2500, minPercent: 85, maxPercent: 90 },
          { range: '<85%', bonus: 0, minPercent: 0, maxPercent: 85 },
        ],
      },
    ],
  },
  // Калининград клуб — Оптометрист
  'kaliningrad_club_optometrist': {
    branchId: 'kaliningrad_club',
    positionId: 'optometrist',
    baseSalary: 40000,
    personalPlan: 1000000,
    clubPlan: 3500000,
    matrix: {
      '<95%':  { '<100%': 3.0, '100%': 3.5, '110%': 4.0, '120%': 4.5, '130%': 5.0 },
      '100%':  { '<100%': 3.0, '100%': 4.0, '110%': 4.5, '120%': 5.0, '130%': 5.5 },
      '110%>': { '<100%': 3.0, '100%': 4.5, '110%': 5.0, '120%': 5.5, '130%': 6.0 },
    },
    kpis: [
      {
        id: 'lenses_design',
        label: 'Кол-во линз с дизайном',
        tiers: [
          { range: 'Выполнено', bonus: 10000, minPercent: 100, maxPercent: 100 },
          { range: 'Не выполнено', bonus: 0, minPercent: 0, maxPercent: 100 },
        ],
      },
    ],
  },
  // Москва клуб — Старший менеджер
  'moscow_club_senior_manager': {
    branchId: 'moscow_club',
    positionId: 'senior_manager',
    baseSalary: 47500,
    personalPlan: 1000000,
    clubPlan: 5000000,
    matrix: {
      '<95%':  { '<100%': 3.0, '100%': 3.5, '110%': 3.75, '120%': 4.0, '130%': 4.5 },
      '100%':  { '<100%': 3.0, '100%': 4.5, '110%': 5.0, '120%': 5.5, '130%': 6.0 },
      '110%>': { '<100%': 3.0, '100%': 5.0, '110%': 5.5, '120%': 6.0, '130%': 6.5 },
    },
    kpis: [
      {
        id: 'closure_time',
        label: 'Время закрытия заказа менее 10 дней',
        type: 'tier',
        tiers: [
          { range: '90-100%', bonus: 12000, minPercent: 90, maxPercent: 100 },
          { range: '85-90%', bonus: 6000, minPercent: 85, maxPercent: 90 },
          { range: '<85%', bonus: 0, minPercent: 0, maxPercent: 85 },
        ],
      },
    ],
  },
  // Москва клуб — Менеджер
  'moscow_club_manager': {
    branchId: 'moscow_club',
    positionId: 'manager',
    baseSalary: 40000,
    personalPlan: 1000000,
    clubPlan: 5000000,
    matrix: {
      '<95%':  { '<100%': 3.0, '100%': 3.5, '110%': 3.75, '120%': 4.0, '130%': 4.5 },
      '100%':  { '<100%': 3.0, '100%': 4.5, '110%': 5.0, '120%': 5.5, '130%': 6.0 },
      '110%>': { '<100%': 3.0, '100%': 5.0, '110%': 5.5, '120%': 6.0, '130%': 6.5 },
    },
    kpis: [
      {
        id: 'closure_time',
        label: 'Время закрытия заказа менее 10 дней',
        type: 'tier',
        tiers: [
          { range: '90-100%', bonus: 12000, minPercent: 90, maxPercent: 100 },
          { range: '85-90%', bonus: 6000, minPercent: 85, maxPercent: 90 },
          { range: '<85%', bonus: 0, minPercent: 0, maxPercent: 85 },
        ],
      },
    ],
  },
  // Москва клуб — Оптометрист (новый тип KPI: multiplier)
  'moscow_club_optometrist': {
    branchId: 'moscow_club',
    positionId: 'optometrist',
    baseSalary: 40000,
    personalPlan: 1000000,
    clubPlan: 5000000,
    matrix: {
      '<95%':  { '<100%': 3.0, '100%': 3.5, '110%': 3.5, '120%': 4.5, '130%': 5.0 },
      '100%':  { '<100%': 3.0, '100%': 4.0, '110%': 4.5, '120%': 5.0, '130%': 5.5 },
      '110%>': { '<100%': 3.0, '100%': 4.5, '110%': 5.0, '120%': 5.5, '130%': 6.0 },
    },
    kpis: [
      {
        id: 'lenses_design',
        label: '% линз с дизайном',
        type: 'tier',
        tiers: [
          { range: 'Выполнено', bonus: 10000, minPercent: 100, maxPercent: 100 },
          { range: 'Не выполнено', bonus: 0, minPercent: 0, maxPercent: 100 },
        ],
      },
      {
        id: 'checks',
        label: 'Проверки',
        type: 'multiplier',
        multiplierRate: 100,
        tiers: [], // Пустой — бонус вычисляется динамически
      },
    ],
  },
};

/**
 * Получить конфигурацию для филиала и должности
 * Логика поиска:
 * 1. Точное совпадение: branchId_positionId
 * 2. Fallback по должности: default_positionId
 * 3. Финальный fallback: default_manager
 */
export function getSalaryConfig(branchId: string, positionId: string): BranchPositionConfig {
  // 1. Точное совпадение
  const exactKey = `${branchId}_${positionId}`;
  if (SALARY_CONFIGS[exactKey]) {
    return SALARY_CONFIGS[exactKey];
  }
  
  // 2. Fallback по должности
  const positionKey = `default_${positionId}`;
  if (SALARY_CONFIGS[positionKey]) {
    return SALARY_CONFIGS[positionKey];
  }
  
  // 3. Финальный fallback
  return SALARY_CONFIGS['default_manager'];
}

/**
 * Проверить, есть ли хотя бы одна специфическая конфигурация для филиала
 */
export function hasSpecificBranchConfig(branchId: string): boolean {
  return Object.keys(SALARY_CONFIGS).some(key => 
    key.startsWith(`${branchId}_`) && !key.startsWith('default_')
  );
}

/**
 * Проверить, есть ли специфическая конфигурация для филиала + должности
 */
export function hasSpecificConfig(branchId: string, positionId: string): boolean {
  const key = `${branchId}_${positionId}`;
  return key in SALARY_CONFIGS;
}

/**
 * Получить матрицу для филиала и должности
 */
export function getMatrixForConfig(branchId: string, positionId: string): MotivationMatrixType {
  return getSalaryConfig(branchId, positionId).matrix;
}

/**
 * Получить KPI для филиала и должности
 */
export function getKPIsForConfig(branchId: string, positionId: string): KPIConfig[] {
  return getSalaryConfig(branchId, positionId).kpis;
}

// ============================================
// Легаси: глобальные константы для обратной совместимости
// ============================================

// Матрица процентов с продаж (используется как дефолт)
export const MOTIVATION_MATRIX = DEFAULT_MATRIX;

// KPI показатели (дефолтные)
export const KPI_CONFIG = DEFAULT_KPI;

// ============================================
// Функции определения уровней
// ============================================

// Автогенерация метки уровня из порога
export function generateLevelLabel(threshold: number, allLevels: LevelDefinition[], index: number): string {
  if (index === 0 && allLevels.length > 1) {
    return `<${allLevels[1].threshold}%`;
  }
  return `${threshold}%`;
}

// Определение уровня по проценту (универсальная, для динамических уровней)
export function getDynamicLevel(percent: number, levels: LevelDefinition[]): string {
  const sorted = [...levels].sort((a, b) => b.threshold - a.threshold);
  return sorted.find(l => percent >= l.threshold)?.label ?? sorted[sorted.length - 1].label;
}

// Определение уровня менеджера по проценту выполнения плана
export function getManagerLevel(percent: number, config?: BranchPositionConfig): ManagerLevel {
  return getDynamicLevel(percent, getManagerLevelsFromConfig(config));
}

// Определение уровня клуба по проценту выполнения плана
export function getClubLevel(percent: number, config?: BranchPositionConfig): ClubLevel {
  return getDynamicLevel(percent, getClubLevelsFromConfig(config));
}

// Минимальный процент для достижения уровня (динамический)
export function getMinPercentForLevel(level: string, levels?: LevelDefinition[]): number {
  const defs = levels ?? DEFAULT_MANAGER_LEVELS;
  const found = defs.find(l => l.label === level);
  return found?.threshold ?? 0;
}

// Типичный процент для уровня клуба (используется в расчётах)
export function getTypicalPercentForClubLevel(level: string, config?: BranchPositionConfig): number {
  const clubLevels = getClubLevelsFromConfig(config);
  const found = clubLevels.find(l => l.label === level);
  if (!found) return 100;
  // Если threshold > 0, используем его как типичный. Для нижнего уровня — 90.
  return found.threshold > 0 ? found.threshold : 90;
}

// Проверка, что % клуба соответствует уровню матрицы (динамический)
export function isClubPercentValidForLevel(percent: number, level: string, config?: BranchPositionConfig): boolean {
  const clubLevels = getClubLevelsFromConfig(config);
  const sorted = [...clubLevels].sort((a, b) => a.threshold - b.threshold);
  const idx = sorted.findIndex(l => l.label === level);
  if (idx === -1) return false;
  const min = sorted[idx].threshold;
  const max = idx < sorted.length - 1 ? sorted[idx + 1].threshold : Infinity;
  return percent >= min && percent < max;
}

// ============================================
// Функции расчёта с поддержкой конфигурации
// ============================================

// Расчёт премии по матрице
export function calculateBonus(
  personalFact: number,
  personalPlan: number,
  clubPercent: number,
  matrix: MotivationMatrixType = MOTIVATION_MATRIX,
  config?: BranchPositionConfig
): { percent: number; amount: number } {
  const personalPercent = personalPlan > 0 ? (personalFact / personalPlan) * 100 : 0;
  const managerLevel = getManagerLevel(personalPercent, config);
  const clubLevel = getClubLevel(clubPercent, config);

  const percent = matrix[clubLevel]?.[managerLevel] ?? 0;
  const amount = personalFact * (percent / 100);

  return { percent, amount };
}

// Расчёт KPI бонуса (с поддержкой multiplier-типа)
export function calculateKPIBonus(
  selectedKPIs: Record<string, string | number>,
  kpis: KPIConfig[] = KPI_CONFIG
): number {
  return kpis.reduce((total, kpi) => {
    const value = selectedKPIs[kpi.id];
    
    // Multiplier-based KPI: количество × ставка
    if (kpi.type === 'multiplier' && kpi.multiplierRate) {
      // Безопасный парсинг: undefined/null/пустая строка -> 0
      let count = 0;
      if (typeof value === 'number') {
        count = value;
      } else if (value !== undefined && value !== null && value !== '') {
        const parsed = parseInt(String(value), 10);
        count = isNaN(parsed) ? 0 : parsed;
      }
      return total + count * kpi.multiplierRate;
    }
    
    // Tier-based KPI (default): ищем по названию уровня
    if (!value) return total;
    const tier = kpi.tiers.find(t => t.range === value);
    return total + (tier?.bonus || 0);
  }, 0);
}

// Расчёт "усилий" для достижения цели — чем меньше, тем лучше (динамический)
function calculateEffortDynamic(personalPercent: number, clubLevel: string, clubLevels: LevelDefinition[]): number {
  let effort = personalPercent;
  const clubDef = clubLevels.find(l => l.label === clubLevel);
  const clubThreshold = clubDef?.threshold ?? 0;
  // Более высокий план клуба снижает усилия
  if (clubThreshold >= 110) effort -= 20;
  else if (clubThreshold < 95) effort += 15;
  return effort;
}

// Обратная совместимость
function calculateEffort(personalPercent: number, clubLevel: ClubLevel): number {
  return calculateEffortDynamic(personalPercent, clubLevel, DEFAULT_CLUB_LEVELS);
}

// ============================================
// Полный расчёт зарплаты
// ============================================

export interface SalaryBreakdown {
  baseSalary: number;
  bonusPercent: number;
  bonusAmount: number;
  kpiBonus: number;
  total: number;
  managerLevel: ManagerLevel;
  clubLevel: ClubLevel;
}

export function calculateSalary(params: {
  personalFact: number;
  personalPlan: number;
  clubPercent: number;
  selectedKPIs: Record<string, string | number>;
  baseSalary?: number;
  config?: BranchPositionConfig;
}): SalaryBreakdown {
  const cfg = params.config;
  const matrix = cfg?.matrix ?? MOTIVATION_MATRIX;
  const kpis = cfg?.kpis ?? KPI_CONFIG;
  const base = params.baseSalary ?? cfg?.baseSalary ?? BASE_SALARY;

  const { percent, amount } = calculateBonus(
    params.personalFact,
    params.personalPlan,
    params.clubPercent,
    matrix,
    cfg
  );

  const personalPercent = params.personalPlan > 0
    ? (params.personalFact / params.personalPlan) * 100
    : 0;

  const kpiBonus = calculateKPIBonus(params.selectedKPIs, kpis);

  return {
    baseSalary: base,
    bonusPercent: percent,
    bonusAmount: amount,
    kpiBonus,
    total: base + amount + kpiBonus,
    managerLevel: getManagerLevel(personalPercent, cfg),
    clubLevel: getClubLevel(params.clubPercent, cfg),
  };
}

// ============================================
// Генерация комбинаций KPI
// ============================================

function generateKPICombinations(kpis: KPIConfig[] = KPI_CONFIG): Array<Record<string, string | number>> {
  const combinations: Array<Record<string, string | number>> = [];
  
  // Все максимальные KPI (только tier-based)
  const maxKPIs: Record<string, string | number> = {};
  kpis.forEach(kpi => {
    if (kpi.type !== 'multiplier' && kpi.tiers.length > 0) {
      maxKPIs[kpi.id] = kpi.tiers[0].range;
    }
  });
  combinations.push(maxKPIs);
  
  // Только первый KPI максимальный (tier-based)
  kpis.forEach((kpi) => {
    if (kpi.type !== 'multiplier' && kpi.tiers.length > 0) {
      const partialKPIs: Record<string, string | number> = {};
      partialKPIs[kpi.id] = kpi.tiers[0].range;
      combinations.push(partialKPIs);
    }
  });
  
  // Комбинация со средними KPI
  const midKPIs: Record<string, string | number> = {};
  kpis.forEach(kpi => {
    if (kpi.type !== 'multiplier' && kpi.tiers.length > 1) {
      midKPIs[kpi.id] = kpi.tiers[1].range;
    }
  });
  if (Object.keys(midKPIs).length > 0) {
    combinations.push(midKPIs);
  }
  
  // Без KPI
  combinations.push({});
  
  return combinations;
}

// ============================================
// Умный обратный расчёт
// ============================================

export interface SmartTargetCalculation {
  requiredPersonalFact: number;
  requiredPersonalPercent: number;
  requiredClubPercent: number;
  requiredClubFact: number;
  managerLevel: ManagerLevel;
  clubLevel: ClubLevel;
  bonusPercent: number;
  recommendedKPIs: Record<string, string | number>;
  kpiBonus: number;
  isAchievable: boolean;
}

export function calculateRequiredPlanSmart(params: {
  targetSalary: number;
  personalPlan: number;
  clubPlan: number;
  config?: BranchPositionConfig;
}): SmartTargetCalculation | null {
  const { targetSalary, personalPlan, clubPlan } = params;
  const cfg = params.config;
  const matrix = cfg?.matrix ?? MOTIVATION_MATRIX;
  const kpis = cfg?.kpis ?? KPI_CONFIG;
  const baseSalary = cfg?.baseSalary ?? BASE_SALARY;
  const mgrLevels = getManagerLevelsFromConfig(cfg);
  const clbLevels = getClubLevelsFromConfig(cfg);
  const mgrLabels = mgrLevels.map(l => l.label);
  const clbLabels = clbLevels.map(l => l.label);

  // Максимально возможный KPI бонус (только tier-based, multiplier игнорируем)
  const maxKPIBonus = kpis.reduce((sum, kpi) => {
    if (kpi.type === 'multiplier' || kpi.tiers.length === 0) return sum;
    const maxTier = kpi.tiers.reduce((max, t) => t.bonus > max.bonus ? t : max, kpi.tiers[0]);
    return sum + maxTier.bonus;
  }, 0);

  // Максимально возможная зарплата (200% личный, max уровень клуба + max уровень менеджера)
  const maxPersonalFact = personalPlan * 2.0;
  const lastClbLabel = clbLabels[clbLabels.length - 1];
  const lastMgrLabel = mgrLabels[mgrLabels.length - 1];
  const maxBonusPercent = matrix[lastClbLabel]?.[lastMgrLabel] ?? 0;
  const maxPossibleSalary = baseSalary + (maxPersonalFact * maxBonusPercent / 100) + maxKPIBonus;

  if (targetSalary > maxPossibleSalary) {
    return null;
  }

  if (targetSalary <= baseSalary) {
    return null;
  }

  const solutions: Array<{
    personalPercent: number;
    clubPercent: number;
    personalFact: number;
    clubFact: number;
    bonusPercent: number;
    managerLevel: ManagerLevel;
    clubLevel: ClubLevel;
    kpis: Record<string, string | number>;
    kpiBonus: number;
    effort: number;
  }> = [];

  const kpiCombinations = generateKPICombinations(kpis);
  // Приоритет: от самого высокого уровня клуба к самому низкому
  const clubLevelPriority = [...clbLabels].reverse();

  for (const clubLevel of clubLevelPriority) {
    const clubPercent = getTypicalPercentForClubLevel(clubLevel, cfg);

    for (let i = 0; i < mgrLabels.length; i++) {
      const managerLevel = mgrLabels[i];
      const bonusPercent = matrix[clubLevel]?.[managerLevel] ?? 0;
      if (bonusPercent <= 0) continue;
      const minPersonalPercent = getMinPercentForLevel(managerLevel, mgrLevels);

      for (const kpisRecord of kpiCombinations) {
        const kpiBonus = calculateKPIBonus(kpisRecord, kpis);
        const requiredBonusAmount = targetSalary - baseSalary - kpiBonus;

        if (requiredBonusAmount <= 0) {
          const defaultPercent = minPersonalPercent || 50;
          solutions.push({
            personalPercent: defaultPercent,
            clubPercent,
            personalFact: personalPlan * defaultPercent / 100,
            clubFact: clubPlan * clubPercent / 100,
            bonusPercent,
            managerLevel,
            clubLevel,
            kpis: kpisRecord,
            kpiBonus,
            effort: calculateEffortDynamic(defaultPercent, clubLevel, clbLevels),
          });
          continue;
        }

        const requiredFact = requiredBonusAmount / (bonusPercent / 100);
        const actualPersonalPercent = personalPlan > 0 ? (requiredFact / personalPlan) * 100 : 0;

        if (actualPersonalPercent >= minPersonalPercent && actualPersonalPercent <= 200) {
          const actualManagerLevel = getManagerLevel(actualPersonalPercent, cfg);
          const isLastLevel = i === mgrLabels.length - 1;
          const isValidLevel = isLastLevel
            ? actualPersonalPercent >= minPersonalPercent
            : actualManagerLevel === managerLevel;

          if (isValidLevel) {
            solutions.push({
              personalPercent: actualPersonalPercent,
              clubPercent,
              personalFact: requiredFact,
              clubFact: clubPlan * clubPercent / 100,
              bonusPercent,
              managerLevel,
              clubLevel,
              kpis: kpisRecord,
              kpiBonus,
              effort: calculateEffortDynamic(actualPersonalPercent, clubLevel, clbLevels),
            });
          }
        }
      }
    }
  }

  if (solutions.length === 0) return null;
  
  solutions.sort((a, b) => a.effort - b.effort);
  
  const best = solutions[0];
  
  return {
    requiredPersonalFact: best.personalFact,
    requiredPersonalPercent: best.personalPercent,
    requiredClubPercent: best.clubPercent,
    requiredClubFact: best.clubFact,
    managerLevel: best.managerLevel,
    clubLevel: best.clubLevel,
    bonusPercent: best.bonusPercent,
    recommendedKPIs: best.kpis,
    kpiBonus: best.kpiBonus,
    isAchievable: true,
  };
}

// Старая функция для обратной совместимости
export interface TargetCalculation {
  requiredPersonalFact: number;
  requiredPersonalPercent: number;
  requiredClubPercent: number;
  requiredClubFact: number;
  managerLevel: ManagerLevel;
  clubLevel: ClubLevel;
  bonusPercent: number;
  isAchievable: boolean;
}

export function calculateRequiredPlan(params: {
  targetSalary: number;
  personalPlan: number;
  clubPlan: number;
  currentClubPercent: number;
  kpiBonus: number;
  config?: BranchPositionConfig;
}): TargetCalculation | null {
  const result = calculateRequiredPlanSmart({
    targetSalary: params.targetSalary,
    personalPlan: params.personalPlan,
    clubPlan: params.clubPlan,
    config: params.config,
  });
  
  if (!result) return null;
  
  return {
    requiredPersonalFact: result.requiredPersonalFact,
    requiredPersonalPercent: result.requiredPersonalPercent,
    requiredClubPercent: result.requiredClubPercent,
    requiredClubFact: result.requiredClubFact,
    managerLevel: result.managerLevel,
    clubLevel: result.clubLevel,
    bonusPercent: result.bonusPercent,
    isAchievable: result.isAchievable,
  };
}

// ============================================
// Matching Cells для подсветки ячеек матрицы
// ============================================

export interface MatchingCell {
  clubLevel: ClubLevel;
  managerLevel: ManagerLevel;
  bonusPercent: number;
  requiredPersonalPercent: number;
  effort: number;
  isBest: boolean;
}

export function calculateMatchingCells(params: {
  targetSalary: number;
  personalPlan: number;
  clubPlan: number;
  kpiBonus?: number;
  config?: BranchPositionConfig;
}): MatchingCell[] {
  const { targetSalary, personalPlan, kpiBonus = 0 } = params;
  const cfg = params.config;
  const matrix = cfg?.matrix ?? MOTIVATION_MATRIX;
  const baseSalary = cfg?.baseSalary ?? BASE_SALARY;
  const mgrLevels = getManagerLevelsFromConfig(cfg);
  const clbLevels = getClubLevelsFromConfig(cfg);
  const mgrLabels = mgrLevels.map(l => l.label);
  const clbLabels = clbLevels.map(l => l.label);

  const requiredBonusAmount = targetSalary - baseSalary - kpiBonus;

  if (requiredBonusAmount <= 0) {
    return [];
  }

  const matchingCells: MatchingCell[] = [];

  for (const clubLevel of clbLabels) {
    for (let i = 0; i < mgrLabels.length; i++) {
      const managerLevel = mgrLabels[i];
      const bonusPercent = matrix[clubLevel]?.[managerLevel] ?? 0;
      if (bonusPercent <= 0) continue;

      const requiredFact = requiredBonusAmount / (bonusPercent / 100);
      const requiredPersonalPercent = personalPlan > 0
        ? (requiredFact / personalPlan) * 100
        : 0;

      const minPercent = getMinPercentForLevel(managerLevel, mgrLevels);
      const isLastLevel = i === mgrLabels.length - 1;
      const maxPercent = isLastLevel ? 200 : getMinPercentForLevel(mgrLabels[i + 1], mgrLevels) - 0.01;

      if (requiredPersonalPercent >= minPercent && requiredPersonalPercent <= maxPercent) {
        const clubDef = clbLevels.find(l => l.label === clubLevel);
        const clubThreshold = clubDef?.threshold ?? 0;
        let effort = requiredPersonalPercent;
        // Более высокий план клуба снижает усилия
        if (clubThreshold >= 110) effort -= 20;
        else if (clubThreshold < 95) effort += 15;

        matchingCells.push({
          clubLevel,
          managerLevel,
          bonusPercent,
          requiredPersonalPercent,
          effort,
          isBest: false,
        });
      }
    }
  }

  matchingCells.sort((a, b) => a.effort - b.effort);

  if (matchingCells.length > 0) {
    matchingCells[0].isBest = true;
  }

  return matchingCells;
}

// ============================================
// Balanced Plan для интерактивных слайдеров
// ============================================

export interface BalancedResult {
  personalPercent: number;
  clubPercent: number;
  personalFact: number;
  clubFact: number;
  managerLevel: ManagerLevel;
  clubLevel: ClubLevel;
  bonusPercent: number;
  isAchievable: boolean;
}

export function calculateBalancedPlan(params: {
  targetSalary: number;
  personalPlan: number;
  clubPlan: number;
  kpiBonus: number;
  baseSalary?: number;
  fixedPersonalPercent?: number;
  fixedClubPercent?: number;
  config?: BranchPositionConfig;
}): BalancedResult | null {
  const {
    targetSalary,
    personalPlan,
    clubPlan,
    kpiBonus,
    fixedPersonalPercent,
    fixedClubPercent
  } = params;
  const cfg = params.config;
  const matrix = cfg?.matrix ?? MOTIVATION_MATRIX;
  const baseSalary = params.baseSalary ?? cfg?.baseSalary ?? BASE_SALARY;
  const mgrLevels = getManagerLevelsFromConfig(cfg);
  const clbLevels = getClubLevelsFromConfig(cfg);
  const mgrLabels = mgrLevels.map(l => l.label);
  const clbLabels = clbLevels.map(l => l.label);

  const requiredBonusAmount = targetSalary - baseSalary - kpiBonus;

  if (requiredBonusAmount <= 0) {
    const personalPercent = fixedPersonalPercent ?? 50;
    const clubPercent = fixedClubPercent ?? 80;
    const ml = getManagerLevel(personalPercent, cfg);
    const cl = getClubLevel(clubPercent, cfg);
    return {
      personalPercent,
      clubPercent,
      personalFact: personalPlan * personalPercent / 100,
      clubFact: clubPlan * clubPercent / 100,
      managerLevel: ml,
      clubLevel: cl,
      bonusPercent: matrix[cl]?.[ml] ?? 0,
      isAchievable: true,
    };
  }

  // Случай 1: Фиксирован личный %, ищем нужный % клуба
  if (fixedPersonalPercent !== undefined) {
    const managerLevel = getManagerLevel(fixedPersonalPercent, cfg);
    const personalFact = personalPlan * fixedPersonalPercent / 100;

    for (const clubLevel of clbLabels) {
      const bonusPercent = matrix[clubLevel]?.[managerLevel] ?? 0;
      const actualBonus = personalFact * (bonusPercent / 100);

      if (actualBonus >= requiredBonusAmount) {
        const clubDef = clbLevels.find(l => l.label === clubLevel);
        const clubPercent = clubDef && clubDef.threshold > 0 ? clubDef.threshold : 80;

        return {
          personalPercent: fixedPersonalPercent,
          clubPercent,
          personalFact,
          clubFact: clubPlan * clubPercent / 100,
          managerLevel,
          clubLevel,
          bonusPercent,
          isAchievable: true,
        };
      }
    }

    return null;
  }

  // Случай 2: Фиксирован % клуба, ищем нужный личный %
  if (fixedClubPercent !== undefined) {
    const clubLevel = getClubLevel(fixedClubPercent, cfg);
    const clubFact = clubPlan * fixedClubPercent / 100;

    for (let i = 0; i < mgrLabels.length; i++) {
      const managerLevel = mgrLabels[i];
      const bonusPercent = matrix[clubLevel]?.[managerLevel] ?? 0;
      if (bonusPercent <= 0) continue;

      const requiredFact = requiredBonusAmount / (bonusPercent / 100);
      const requiredPersonalPercent = personalPlan > 0
        ? (requiredFact / personalPlan) * 100
        : 0;

      const minPercent = getMinPercentForLevel(managerLevel, mgrLevels);
      const isLastLevel = i === mgrLabels.length - 1;
      const maxPercent = isLastLevel ? 200 : getMinPercentForLevel(mgrLabels[i + 1], mgrLevels) - 0.01;

      if (requiredPersonalPercent >= minPercent && requiredPersonalPercent <= maxPercent) {
        return {
          personalPercent: requiredPersonalPercent,
          clubPercent: fixedClubPercent,
          personalFact: requiredFact,
          clubFact,
          managerLevel,
          clubLevel,
          bonusPercent,
          isAchievable: true,
        };
      }
    }

    return null;
  }

  return null;
}

/**
 * Получить бонус KPI по выбранному уровню (range)
 */
export function getKPIBonusByTier(kpiId: string, tierRange: string, kpis: KPIConfig[] = KPI_CONFIG): number {
  const kpi = kpis.find(k => k.id === kpiId);
  const tier = kpi?.tiers.find(t => t.range === tierRange);
  return tier?.bonus || 0;
}

// ============================================
// Генератор вариантов KPI для 3D поиска
// ============================================

/**
 * Генерирует все возможные комбинации tier-based KPI.
 * Для multiplier-типа использует текущее значение (не меняем автоматически).
 */
export function generateKPIVariants(
  kpis: KPIConfig[],
  currentKPIs: Record<string, string | number>
): Record<string, string | number>[] {
  // Фильтруем только tier-based KPI
  const tierKPIs = kpis.filter(kpi => kpi.type !== 'multiplier' && kpi.tiers.length > 0);
  
  if (tierKPIs.length === 0) {
    // Нет tier KPI — возвращаем только текущие (с multiplier значениями)
    return [{ ...currentKPIs }];
  }
  
  // Рекурсивно генерируем все комбинации tier-based KPI
  const generateCombinations = (index: number, current: Record<string, string | number>): Record<string, string | number>[] => {
    if (index >= tierKPIs.length) {
      return [current];
    }
    
    const kpi = tierKPIs[index];
    const results: Record<string, string | number>[] = [];
    
    for (const tier of kpi.tiers) {
      results.push(...generateCombinations(index + 1, { ...current, [kpi.id]: tier.range }));
    }
    
    return results;
  };
  
  // Начинаем с multiplier KPI (сохраняем текущие значения)
  const baseKPIs: Record<string, string | number> = {};
  kpis.forEach(kpi => {
    if (kpi.type === 'multiplier') {
      baseKPIs[kpi.id] = currentKPIs[kpi.id] ?? 0;
    }
  });
  
  return generateCombinations(0, baseKPIs);
}

// ============================================
// 3D поиск: personalPercent + clubPercent + KPI
// ============================================

export interface FindBestCombinationWithKPIResult {
  personalPercent: number;
  clubPercent: number;
  kpiTiers: Record<string, string | number>;
  isExact: boolean;
  actualSalary: number;
}

/**
 * Трёхмерный поиск оптимальной комбинации personalPercent + clubPercent + KPI
 * для достижения целевой зарплаты.
 * 
 * Параметры:
 * - fixedPersonalPercent: если задан — фиксируем личный %, перебираем club + KPI
 * - fixedClubPercent: если задан — фиксируем % клуба, перебираем personal + KPI
 * - если оба не заданы — полный 3D перебор
 * 
 * Приоритет при подборе:
 * 1. Точное попадание в целевую зарплату (±100 ₽)
 * 2. План филиала ближе к 110%
 * 3. Минимальный личный план
 * 4. Минимальные KPI (меньше усилий)
 */
export function findBestCombinationWithKPI(params: {
  targetSalary: number;
  personalPlan: number;
  clubPlan: number;
  fixedPersonalPercent?: number;
  fixedClubPercent?: number;
  currentKPIs: Record<string, string | number>;
  baseSalary: number;
  config: BranchPositionConfig;
}): FindBestCombinationWithKPIResult | null {
  const {
    targetSalary,
    personalPlan,
    fixedPersonalPercent,
    fixedClubPercent,
    currentKPIs,
    baseSalary,
    config,
  } = params;
  
  // Генерируем все варианты KPI
  const kpiVariants = generateKPIVariants(config.kpis, currentKPIs);
  
  // Функция расчёта "стоимости" KPI (меньше = лучше)
  const getKPICost = (kpis: Record<string, string | number>): number => {
    return calculateKPIBonus(kpis, config.kpis);
  };
  
  const PREFERRED_CLUB = 110;
  const TOLERANCE = 100; // ±100 ₽
  
  let bestResult: {
    personal: number;
    club: number;
    kpis: Record<string, string | number>;
    salary: number;
    diff: number;
    clubDeviation: number;
    kpiCost: number;
  } | null = null;
  
  // Определяем диапазоны поиска
  // Оптимизация: если одна ось = 1 уровень, фиксируем её
  const isClubFixed1D = isManagerAxisOnly(config);
  const isMgrFixed1D = isClubAxisOnly(config);

  const personalMin = fixedPersonalPercent !== undefined ? fixedPersonalPercent : (isMgrFixed1D ? 100 : 50);
  const personalMax = fixedPersonalPercent !== undefined ? fixedPersonalPercent : (isMgrFixed1D ? 100 : 200);
  const personalStep = fixedPersonalPercent !== undefined ? 1 : 5; // Грубый шаг для 3D

  const clubMin = fixedClubPercent !== undefined ? fixedClubPercent : (isClubFixed1D ? 100 : 90);
  const clubMax = fixedClubPercent !== undefined ? fixedClubPercent : (isClubFixed1D ? 100 : 130);
  const clubStep = fixedClubPercent !== undefined ? 1 : 5; // Грубый шаг для 3D
  
  // Фаза 1: Грубый поиск
  for (const kpiVariant of kpiVariants) {
    for (let club = clubMin; club <= clubMax; club += clubStep) {
      for (let personal = personalMin; personal <= personalMax; personal += personalStep) {
        const breakdown = calculateSalary({
          personalFact: personalPlan * personal / 100,
          personalPlan,
          clubPercent: club,
          selectedKPIs: kpiVariant,
          baseSalary,
          config,
        });
        
        const salary = Math.round(breakdown.total);
        const diff = Math.abs(salary - targetSalary);
        const clubDeviation = Math.abs(club - PREFERRED_CLUB);
        const kpiCost = getKPICost(kpiVariant);
        
        const isBetter = !bestResult ||
          diff < bestResult.diff ||
          (diff === bestResult.diff && clubDeviation < bestResult.clubDeviation) ||
          (diff === bestResult.diff && clubDeviation === bestResult.clubDeviation && personal < bestResult.personal) ||
          (diff === bestResult.diff && clubDeviation === bestResult.clubDeviation && personal === bestResult.personal && kpiCost < bestResult.kpiCost);
        
        if (isBetter) {
          bestResult = { personal, club, kpis: kpiVariant, salary, diff, clubDeviation, kpiCost };
        }
      }
    }
  }
  
  if (!bestResult) return null;
  
  // Фаза 2: Точный поиск вокруг лучшего результата
  const searchRange = 10;
  const finePersonalStep = 0.5;
  const fineClubStep = 1;
  
  // Используем только лучший вариант KPI из грубого поиска + его соседей
  const bestKPIVariant = bestResult.kpis;
  const kpiVariantsForFineSearch = [bestKPIVariant];
  
  // Добавляем соседние варианты KPI (±1 уровень для каждого tier KPI)
  const tierKPIs = config.kpis.filter(kpi => kpi.type !== 'multiplier' && kpi.tiers.length > 0);
  for (const kpi of tierKPIs) {
    const currentTierIndex = kpi.tiers.findIndex(t => t.range === bestKPIVariant[kpi.id]);
    
    // Попробовать уровень выше (меньше бонус)
    if (currentTierIndex < kpi.tiers.length - 1) {
      kpiVariantsForFineSearch.push({
        ...bestKPIVariant,
        [kpi.id]: kpi.tiers[currentTierIndex + 1].range,
      });
    }
    
    // Попробовать уровень ниже (больше бонус)
    if (currentTierIndex > 0) {
      kpiVariantsForFineSearch.push({
        ...bestKPIVariant,
        [kpi.id]: kpi.tiers[currentTierIndex - 1].range,
      });
    }
  }
  
  for (const kpiVariant of kpiVariantsForFineSearch) {
    const fineClubMin = Math.max(clubMin, bestResult.club - searchRange);
    const fineClubMax = Math.min(clubMax, bestResult.club + searchRange);
    const finePersonalMin = Math.max(personalMin, bestResult.personal - searchRange);
    const finePersonalMax = Math.min(personalMax, bestResult.personal + searchRange);
    
    for (let club = fineClubMin; club <= fineClubMax; club += fineClubStep) {
      for (let personal = finePersonalMin; personal <= finePersonalMax; personal += finePersonalStep) {
        const breakdown = calculateSalary({
          personalFact: personalPlan * personal / 100,
          personalPlan,
          clubPercent: club,
          selectedKPIs: kpiVariant,
          baseSalary,
          config,
        });
        
        const salary = Math.round(breakdown.total);
        const diff = Math.abs(salary - targetSalary);
        const clubDeviation = Math.abs(club - PREFERRED_CLUB);
        const kpiCost = getKPICost(kpiVariant);
        
        const isBetter =
          diff < bestResult.diff ||
          (diff === bestResult.diff && clubDeviation < bestResult.clubDeviation) ||
          (diff === bestResult.diff && clubDeviation === bestResult.clubDeviation && personal < bestResult.personal) ||
          (diff === bestResult.diff && clubDeviation === bestResult.clubDeviation && personal === bestResult.personal && kpiCost < bestResult.kpiCost);
        
        if (isBetter) {
          bestResult = { personal, club, kpis: kpiVariant, salary, diff, clubDeviation, kpiCost };
        }
      }
    }
  }
  
  return {
    personalPercent: Math.round(bestResult.personal * 10) / 10,
    clubPercent: Math.round(bestResult.club),
    kpiTiers: bestResult.kpis,
    isExact: bestResult.diff <= TOLERANCE,
    actualSalary: bestResult.salary,
  };
}

/**
 * Получить максимальный процент для уровня менеджера (динамический)
 */
export function getMaxPercentForLevel(level: string, levels?: LevelDefinition[]): number {
  const defs = levels ?? DEFAULT_MANAGER_LEVELS;
  const labels = defs.map(l => l.label);
  const idx = labels.indexOf(level);
  if (idx === -1 || idx === labels.length - 1) return 200; // последний уровень
  return getMinPercentForLevel(labels[idx + 1], defs) - 0.01;
}

// ============================================
// 2D Grid-Search для точного подбора комбинации
// личного % и % филиала для целевой зарплаты
// ============================================

export interface FindBestCombinationResult {
  personalPercent: number;
  clubPercent: number;
  isExact: boolean;
  actualSalary: number;
}

/**
 * Двумерный поиск оптимальной комбинации personalPercent + clubPercent
 * для достижения целевой зарплаты с максимальной точностью.
 * 
 * Алгоритм:
 * 1. Фаза 1: Грубый поиск (шаг 1% для обоих) — находит приблизительную область
 * 2. Фаза 2: Точный поиск вокруг лучшего результата (шаг 0.1% personal, 0.5% club)
 * 
 * @returns Лучшая комбинация или null если недостижимо
 */
export function findBestCombinationForTarget(params: {
  targetSalary: number;
  personalPlan: number;
  clubPlan: number;
  selectedKPIs: Record<string, string | number>;
  baseSalary: number;
  config: BranchPositionConfig;
}): FindBestCombinationResult | null {
  const { targetSalary, personalPlan, selectedKPIs, baseSalary, config } = params;
  
  // Проверка: если цель <= оклада — минимальные значения
  if (targetSalary <= baseSalary) {
    // Рассчитываем реальную зарплату для минимальных значений
    const minBreakdown = calculateSalary({
      personalFact: personalPlan * 50 / 100,
      personalPlan,
      clubPercent: 90,
      selectedKPIs,
      baseSalary,
      config,
    });
    return {
      personalPercent: 50,
      clubPercent: 90,
      isExact: true,
      actualSalary: Math.round(minBreakdown.total),
    };
  }
  
  // Фаза 1: Грубый поиск (шаг 1% для обоих параметров)
  // Оптимизация: если одна ось = 1 уровень, фиксируем её
  const isClubFixed = isManagerAxisOnly(config);
  const isMgrFixed = isClubAxisOnly(config);
  let bestResult: { personal: number; club: number; salary: number; diff: number } | null = null;

  const clubMin = isClubFixed ? 100 : 90;
  const clubMax = isClubFixed ? 100 : 130;
  const personalMin = isMgrFixed ? 100 : 50;
  const personalMax = isMgrFixed ? 100 : 200;

  for (let club = clubMin; club <= clubMax; club += 1) {
    for (let personal = personalMin; personal <= personalMax; personal += 1) {
      const breakdown = calculateSalary({
        personalFact: personalPlan * personal / 100,
        personalPlan,
        clubPercent: club,
        selectedKPIs,
        baseSalary,
        config,
      });
      
      const salary = Math.round(breakdown.total);
      const diff = Math.abs(salary - targetSalary);
      
      // Предпочитаем план филиала ближе к 110%
      const PREFERRED_CLUB = 110;
      const clubDeviation = Math.abs(club - PREFERRED_CLUB);
      const bestClubDeviation = bestResult ? Math.abs(bestResult.club - PREFERRED_CLUB) : Infinity;
      
      if (!bestResult || 
          diff < bestResult.diff || 
          (diff === bestResult.diff && clubDeviation < bestClubDeviation) ||
          (diff === bestResult.diff && clubDeviation === bestClubDeviation && personal < bestResult.personal)) {
        bestResult = { personal, club, salary, diff };
      }
    }
  }
  
  if (!bestResult) return null;
  
  // Фаза 2: Точный поиск вокруг лучшего результата
  const searchRange = 5; // ±5%
  
  const fineClubMin = isClubFixed ? 100 : bestResult.club - searchRange;
  const fineClubMax = isClubFixed ? 100 : bestResult.club + searchRange;
  const finePersonalMin = isMgrFixed ? 100 : bestResult.personal - searchRange;
  const finePersonalMax = isMgrFixed ? 100 : bestResult.personal + searchRange;

  for (let club = fineClubMin; club <= fineClubMax; club += 0.5) {
    for (let personal = finePersonalMin; personal <= finePersonalMax; personal += 0.1) {
      if (personal < 50 || personal > 200 || club < 90 || club > 130) continue;
      
      const breakdown = calculateSalary({
        personalFact: personalPlan * personal / 100,
        personalPlan,
        clubPercent: club,
        selectedKPIs,
        baseSalary,
        config,
      });
      
      const salary = Math.round(breakdown.total);
      const diff = Math.abs(salary - targetSalary);
      
      // Предпочитаем план филиала ближе к 110%
      const PREFERRED_CLUB = 110;
      const clubDeviation = Math.abs(club - PREFERRED_CLUB);
      const bestClubDeviation = Math.abs(bestResult.club - PREFERRED_CLUB);
      
      if (diff < bestResult.diff || 
          (diff === bestResult.diff && clubDeviation < bestClubDeviation) ||
          (diff === bestResult.diff && clubDeviation === bestClubDeviation && personal < bestResult.personal)) {
        bestResult = { personal, club, salary, diff };
      }
    }
  }
  
  return {
    personalPercent: Math.round(bestResult.personal * 10) / 10,
    clubPercent: Math.round(bestResult.club * 10) / 10,
    isExact: bestResult.diff <= 100, // Допуск 100 ₽
    actualSalary: bestResult.salary,
  };
}

/**
 * Точный расчёт личного процента для достижения целевой зарплаты.
 * Использует grid-search (симуляцию) по всем возможным значениям слайдера
 * для максимальной точности — такой же, как при ручном движении слайдера.
 * 
 * @param params.step - шаг поиска (по умолчанию 0.1%)
 * @param params.toleranceRub - допуск в рублях для точного попадания (по умолчанию 1 ₽)
 * @returns { percent, isExact, actualSalary } или null если недостижимо
 */
export interface FindBestPercentResult {
  percent: number;
  isExact: boolean;
  actualSalary: number;
}

export function findBestPersonalPercentForTarget(params: {
  targetSalary: number;
  personalPlan: number;
  clubPercent: number;
  selectedKPIs: Record<string, string | number>;
  baseSalary: number;
  config: BranchPositionConfig;
  step?: number;
  minPercent?: number;
  maxPercent?: number;
  toleranceRub?: number;
}): FindBestPercentResult | null {
  const {
    targetSalary,
    personalPlan,
    clubPercent,
    selectedKPIs,
    baseSalary,
    config,
    step = 0.1,
    minPercent = 50,
    maxPercent = 200,
    toleranceRub = 1,
  } = params;

  // Проверка: если целевая <= оклада — сразу минимум
  if (targetSalary <= baseSalary) {
    return { percent: minPercent, isExact: true, actualSalary: baseSalary };
  }

  let bestExact: { percent: number; salary: number } | null = null;
  let bestAbove: { percent: number; salary: number } | null = null;

  // Итерируем по сетке с заданным шагом
  for (let p = minPercent; p <= maxPercent; p = Math.round((p + step) * 10) / 10) {
    const personalFact = personalPlan * p / 100;
    
    const breakdown = calculateSalary({
      personalFact,
      personalPlan,
      clubPercent,
      selectedKPIs,
      baseSalary,
      config,
    });
    
    const roundedTotal = Math.round(breakdown.total);
    
    // Точное попадание (в пределах допуска)
    if (Math.abs(roundedTotal - targetSalary) <= toleranceRub) {
      // Если уже нашли точное — берём минимальный %
      if (!bestExact || p < bestExact.percent) {
        bestExact = { percent: p, salary: roundedTotal };
      }
    }
    
    // Если зарплата >= целевой — кандидат на "минимум для достижения"
    if (roundedTotal >= targetSalary) {
      if (!bestAbove || roundedTotal < bestAbove.salary || 
          (roundedTotal === bestAbove.salary && p < bestAbove.percent)) {
        bestAbove = { percent: p, salary: roundedTotal };
      }
    }
  }

  // Приоритет: точное попадание > минимум для достижения
  if (bestExact) {
    return {
      percent: bestExact.percent,
      isExact: true,
      actualSalary: bestExact.salary,
    };
  }

  if (bestAbove) {
    return {
      percent: bestAbove.percent,
      isExact: false,
      actualSalary: bestAbove.salary,
    };
  }

  // Недостижимо даже на максимуме
  return null;
}

/**
 * Точный расчёт личного процента для достижения целевой зарплаты.
 * Это обёртка над findBestPersonalPercentForTarget для обратной совместимости.
 * 
 * Использует grid-search (симуляцию) вместо аналитического расчёта
 * для максимальной точности — такой же, как при ручном движении слайдера.
 */
export function calculateExactPersonalPercent(params: {
  targetSalary: number;
  personalPlan: number;
  clubPercent: number;
  kpiBonus: number;
  baseSalary: number;
  matrix: MotivationMatrixType;
  config?: BranchPositionConfig;
  selectedKPIs?: Record<string, string | number>;
}): number | null {
  const { targetSalary, personalPlan, clubPercent, kpiBonus, baseSalary, matrix, config, selectedKPIs } = params;
  
  // Если передан config и selectedKPIs — используем точный grid-search
  if (config && selectedKPIs) {
    const result = findBestPersonalPercentForTarget({
      targetSalary,
      personalPlan,
      clubPercent,
      selectedKPIs,
      baseSalary,
      config,
      step: 0.1,
    });
    return result?.percent ?? null;
  }
  
  // Fallback: аналитический расчёт (для обратной совместимости)
  const mgrLevels = config ? getManagerLevelsFromConfig(config) : DEFAULT_MANAGER_LEVELS;
  const mgrLabels = mgrLevels.map(l => l.label);
  const clubLevel = getClubLevel(clubPercent, config);
  const requiredBonusAmount = targetSalary - baseSalary - kpiBonus;

  if (requiredBonusAmount <= 0) {
    return 50;
  }

  let bestSolution: { percent: number; salary: number } | null = null;

  for (const managerLevel of mgrLabels) {
    const bonusPercent = matrix[clubLevel]?.[managerLevel] ?? 0;
    if (bonusPercent <= 0) continue;
    const minPercent = getMinPercentForLevel(managerLevel, mgrLevels);
    const maxPercent = getMaxPercentForLevel(managerLevel, mgrLevels);

    const requiredFact = requiredBonusAmount / (bonusPercent / 100);
    const requiredPercent = (requiredFact / personalPlan) * 100;

    if (requiredPercent >= minPercent && requiredPercent <= maxPercent) {
      return requiredPercent;
    }

    if (requiredPercent < minPercent && minPercent > 0) {
      const factAtMin = personalPlan * minPercent / 100;
      const bonusAtMin = factAtMin * (bonusPercent / 100);
      const salaryAtMin = baseSalary + bonusAtMin + kpiBonus;

      if (salaryAtMin >= targetSalary) {
        if (!bestSolution || salaryAtMin < bestSolution.salary) {
          bestSolution = { percent: minPercent, salary: salaryAtMin };
        }
      }
    }
  }

  if (bestSolution) {
    return bestSolution.percent;
  }

  const lastLabel = mgrLabels[mgrLabels.length - 1];
  const firstLabel = mgrLabels[0];
  const highestBonusPercent = matrix[clubLevel]?.[lastLabel] ?? 0;
  if (highestBonusPercent > 0) {
    const highestFact = requiredBonusAmount / (highestBonusPercent / 100);
    const highestPercent = (highestFact / personalPlan) * 100;
    if (highestPercent > 200) return null;
    const lastThreshold = getMinPercentForLevel(lastLabel, mgrLevels);
    if (highestPercent >= lastThreshold) return highestPercent;
  }

  const lowestBonusPercent = matrix[clubLevel]?.[firstLabel] ?? 0;
  if (lowestBonusPercent > 0) {
    const lowestFact = requiredBonusAmount / (lowestBonusPercent / 100);
    const lowestPercent = (lowestFact / personalPlan) * 100;
    if (lowestPercent < 0) return null;
    if (lowestPercent < 50) return 50;
    return lowestPercent;
  }

  return null;
}

import { FilterPeriod } from '@/components/dashboard/FilterBar';

// ==================== CONVERSION DATA TYPES ====================

export interface ConversionManagerBreakdown {
  id: string;
  name: string;
  role?: string;
  avatar?: string;
  value: number;      // факт конверсии %
  target: number;     // план конверсии %
  inputFact: number;  // входящий поток факт
  outputFact: number; // исходящий поток факт
}

export interface ConversionDetailDataV2 {
  id: string;
  name: string;
  shortName: string;  // Сокращенное имя для мобильной версии
  value: number;           // общая конверсия факт %
  target: number;          // план %
  inputLabel: string;      // название входящего потока
  inputFact: number;       // вход факт
  inputPlan: number;       // вход план
  outputLabel: string;     // название исходящего потока
  outputFact: number;      // выход факт
  outputPlan: number;      // выход план
  lostCount: number;       // упущено единиц
  lostAmount: number;      // упущено рублей
  managers: ConversionManagerBreakdown[];  // разбивка по менеджерам
}

export interface ConversionChartDataPoint {
  date: string;
  flSale: number;
  repairCheck: number;
  repairSale: number;
  flCheck: number;
  checkSale: number;
  flSalePlan: number;
  repairCheckPlan: number;
  repairSalePlan: number;
  flCheckPlan: number;
  checkSalePlan: number;
}

export interface ConversionManagerRow {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  flSale: { current: number; plan: number };
  repairCheck: { current: number; plan: number };
  repairSale: { current: number; plan: number };
  flCheck: { current: number; plan: number };
  checkSale: { current: number; plan: number };
  overallPercent: number;
  lostRevenue: number;
}

// ==================== MOCK DATA FOR MANAGERS ====================

const baseManagers: ConversionManagerBreakdown[] = [
  { id: 'elena_novikova', name: 'Елена Новикова', role: 'Консультант', value: 52, target: 55, inputFact: 48, outputFact: 25 },
  { id: 'anna_petrova', name: 'Анна Петрова', role: 'Старший консультант', value: 48, target: 55, inputFact: 44, outputFact: 21 },
  { id: 'dmitry_volkov', name: 'Дмитрий Волков', role: 'Консультант', value: 42, target: 55, inputFact: 38, outputFact: 16 },
  { id: 'ivan_sidorov', name: 'Иван Сидоров', role: 'Консультант', value: 38, target: 55, inputFact: 32, outputFact: 12 },
  { id: 'maria_kozlova', name: 'Мария Козлова', role: 'Стажёр', value: 35, target: 55, inputFact: 28, outputFact: 10 },
];

// ==================== BASE CONVERSION DATA ====================

const baseConversions: ConversionDetailDataV2[] = [
  {
    id: 'fl_sale',
    name: 'ФЛ → Продажа',
    shortName: 'ФЛ→Прод',
    value: 45,
    target: 55,
    inputLabel: 'Физлица (ФЛ)',
    inputFact: 156,
    inputPlan: 200,
    outputLabel: 'Продажи',
    outputFact: 70,
    outputPlan: 110,
    lostCount: 40,
    lostAmount: 72000,
    managers: baseManagers.map(m => ({
      ...m,
      value: m.value,
      target: 55,
      inputFact: Math.round(m.inputFact * 1.2),
      outputFact: Math.round(m.outputFact * 1.2),
    })),
  },
  {
    id: 'repair_check',
    name: 'Ремонт → Проверка',
    shortName: 'Рем→Пров',
    value: 62,
    target: 70,
    inputLabel: 'Ремонты',
    inputFact: 85,
    inputPlan: 100,
    outputLabel: 'Проверки',
    outputFact: 53,
    outputPlan: 70,
    lostCount: 17,
    lostAmount: 5100,
    managers: baseManagers.map(m => ({
      ...m,
      value: Math.min(m.value + 15, 85),
      target: 70,
      inputFact: Math.round(m.inputFact * 0.6),
      outputFact: Math.round(m.outputFact * 0.8),
    })),
  },
  {
    id: 'repair_sale',
    name: 'Ремонт → Продажа',
    shortName: 'Рем→Прод',
    value: 28,
    target: 35,
    inputLabel: 'Ремонты',
    inputFact: 85,
    inputPlan: 100,
    outputLabel: 'Продажи с ремонта',
    outputFact: 24,
    outputPlan: 35,
    lostCount: 11,
    lostAmount: 19800,
    managers: baseManagers.map(m => ({
      ...m,
      value: Math.max(m.value - 15, 18),
      target: 35,
      inputFact: Math.round(m.inputFact * 0.6),
      outputFact: Math.round(m.outputFact * 0.4),
    })),
  },
  {
    id: 'fl_check',
    name: 'ФЛ → Проверка',
    shortName: 'ФЛ→Пров',
    value: 72,
    target: 80,
    inputLabel: 'Физлица (ФЛ)',
    inputFact: 156,
    inputPlan: 200,
    outputLabel: 'Проверки',
    outputFact: 112,
    outputPlan: 160,
    lostCount: 48,
    lostAmount: 9600,
    managers: baseManagers.map(m => ({
      ...m,
      value: Math.min(m.value + 25, 95),
      target: 80,
      inputFact: Math.round(m.inputFact * 1.2),
      outputFact: Math.round(m.outputFact * 1.8),
    })),
  },
  {
    id: 'check_sale',
    name: 'Проверка → Продажа',
    shortName: 'Пров→Прод',
    value: 63,
    target: 70,
    inputLabel: 'Проверки',
    inputFact: 112,
    inputPlan: 160,
    outputLabel: 'Продажи',
    outputFact: 70,
    outputPlan: 112,
    lostCount: 42,
    lostAmount: 75600,
    managers: baseManagers.map(m => ({
      ...m,
      value: Math.min(m.value + 18, 90),
      target: 70,
      inputFact: Math.round(m.inputFact * 0.9),
      outputFact: Math.round(m.outputFact * 1.1),
    })),
  },
];

// ==================== SCALE FUNCTIONS ====================

const scaleConversions = (conversions: ConversionDetailDataV2[], factor: number): ConversionDetailDataV2[] => {
  return conversions.map(c => ({
    ...c,
    inputFact: Math.round(c.inputFact * factor),
    inputPlan: Math.round(c.inputPlan * factor),
    outputFact: Math.round(c.outputFact * factor),
    outputPlan: Math.round(c.outputPlan * factor),
    lostCount: Math.round(c.lostCount * factor),
    lostAmount: Math.round(c.lostAmount * factor),
    managers: c.managers.map(m => ({
      ...m,
      inputFact: Math.round(m.inputFact * factor),
      outputFact: Math.round(m.outputFact * factor),
    })),
  }));
};

// ==================== CONVERSIONS BY PERIOD ====================

export const conversionsByPeriod: Record<FilterPeriod, ConversionDetailDataV2[]> = {
  'day': scaleConversions(baseConversions, 0.04),
  '3days': scaleConversions(baseConversions, 0.12),
  'month': baseConversions,
  'year': scaleConversions(baseConversions, 12),
  '10clients': scaleConversions(baseConversions, 0.33),
  '20clients': scaleConversions(baseConversions, 0.66),
  '30clients': baseConversions,
  '50clients': scaleConversions(baseConversions, 1.66),
};

// ==================== CHART DATA ====================

const generateChartData = (days: number): ConversionChartDataPoint[] => {
  return Array.from({ length: days }, (_, i) => {
    const date = i < 10 ? `0${i + 1}` : `${i + 1}`;
    const variance = () => (Math.random() - 0.5) * 10;
    
    return {
      date,
      flSale: Math.round(45 + variance()),
      repairCheck: Math.round(62 + variance()),
      repairSale: Math.round(28 + variance()),
      flCheck: Math.round(72 + variance()),
      checkSale: Math.round(63 + variance()),
      flSalePlan: 55,
      repairCheckPlan: 70,
      repairSalePlan: 35,
      flCheckPlan: 80,
      checkSalePlan: 70,
    };
  });
};

export const conversionChartDataByPeriod: Record<FilterPeriod, ConversionChartDataPoint[]> = {
  'day': generateChartData(13), // hours
  '3days': generateChartData(3),
  'month': generateChartData(31),
  'year': generateChartData(12),
  '10clients': generateChartData(10),
  '20clients': generateChartData(20),
  '30clients': generateChartData(30),
  '50clients': generateChartData(50),
};

// ==================== MANAGER RANKING DATA ====================

const createManagerRankingData = (): ConversionManagerRow[] => [
  {
    id: 'elena_novikova',
    name: 'Елена Новикова',
    role: 'Консультант',
    flSale: { current: 52, plan: 55 },
    repairCheck: { current: 75, plan: 70 },
    repairSale: { current: 32, plan: 35 },
    flCheck: { current: 85, plan: 80 },
    checkSale: { current: 72, plan: 70 },
    overallPercent: 102,
    lostRevenue: -5000,
  },
  {
    id: 'anna_petrova',
    name: 'Анна Петрова',
    role: 'Старший консультант',
    flSale: { current: 48, plan: 55 },
    repairCheck: { current: 68, plan: 70 },
    repairSale: { current: 30, plan: 35 },
    flCheck: { current: 78, plan: 80 },
    checkSale: { current: 65, plan: 70 },
    overallPercent: 91,
    lostRevenue: 12500,
  },
  {
    id: 'dmitry_volkov',
    name: 'Дмитрий Волков',
    role: 'Консультант',
    flSale: { current: 42, plan: 55 },
    repairCheck: { current: 60, plan: 70 },
    repairSale: { current: 25, plan: 35 },
    flCheck: { current: 70, plan: 80 },
    checkSale: { current: 58, plan: 70 },
    overallPercent: 78,
    lostRevenue: 28500,
  },
  {
    id: 'ivan_sidorov',
    name: 'Иван Сидоров',
    role: 'Консультант',
    flSale: { current: 38, plan: 55 },
    repairCheck: { current: 55, plan: 70 },
    repairSale: { current: 22, plan: 35 },
    flCheck: { current: 65, plan: 80 },
    checkSale: { current: 52, plan: 70 },
    overallPercent: 70,
    lostRevenue: 41200,
  },
  {
    id: 'maria_kozlova',
    name: 'Мария Козлова',
    role: 'Стажёр',
    flSale: { current: 35, plan: 55 },
    repairCheck: { current: 48, plan: 70 },
    repairSale: { current: 18, plan: 35 },
    flCheck: { current: 58, plan: 80 },
    checkSale: { current: 45, plan: 70 },
    overallPercent: 61,
    lostRevenue: 52000,
  },
];

const scaleManagerData = (data: ConversionManagerRow[], factor: number): ConversionManagerRow[] => {
  return data.map(m => ({
    ...m,
    lostRevenue: Math.round(m.lostRevenue * factor),
  }));
};

export const conversionManagersDataByPeriod: Record<FilterPeriod, ConversionManagerRow[]> = {
  'day': scaleManagerData(createManagerRankingData(), 0.04),
  '3days': scaleManagerData(createManagerRankingData(), 0.12),
  'month': createManagerRankingData(),
  'year': scaleManagerData(createManagerRankingData(), 12),
  '10clients': scaleManagerData(createManagerRankingData(), 0.33),
  '20clients': scaleManagerData(createManagerRankingData(), 0.66),
  '30clients': createManagerRankingData(),
  '50clients': scaleManagerData(createManagerRankingData(), 1.66),
};

// ==================== LOSS DATA ====================

export interface ConversionLossBreakdown {
  totalLoss: number;
  byConversion: {
    id: string;
    name: string;
    loss: number;
  }[];
}

const baseLossBreakdown: ConversionLossBreakdown = {
  totalLoss: 182100,
  byConversion: [
    { id: 'check_sale', name: 'Проверка → Продажа', loss: 75600 },
    { id: 'fl_sale', name: 'ФЛ → Продажа', loss: 72000 },
    { id: 'repair_sale', name: 'Ремонт → Продажа', loss: 19800 },
    { id: 'fl_check', name: 'ФЛ → Проверка', loss: 9600 },
    { id: 'repair_check', name: 'Ремонт → Проверка', loss: 5100 },
  ],
};

const scaleLossBreakdown = (data: ConversionLossBreakdown, factor: number): ConversionLossBreakdown => ({
  totalLoss: Math.round(data.totalLoss * factor),
  byConversion: data.byConversion.map(c => ({
    ...c,
    loss: Math.round(c.loss * factor),
  })),
});

export const conversionLossByPeriod: Record<FilterPeriod, ConversionLossBreakdown> = {
  'day': scaleLossBreakdown(baseLossBreakdown, 0.04),
  '3days': scaleLossBreakdown(baseLossBreakdown, 0.12),
  'month': baseLossBreakdown,
  'year': scaleLossBreakdown(baseLossBreakdown, 12),
  '10clients': scaleLossBreakdown(baseLossBreakdown, 0.33),
  '20clients': scaleLossBreakdown(baseLossBreakdown, 0.66),
  '30clients': baseLossBreakdown,
  '50clients': scaleLossBreakdown(baseLossBreakdown, 1.66),
};

// ==================== SUMMARY DATA ====================

export interface ConversionSummary {
  overall: { current: number; plan: number };
  totalInput: number;
  totalOutput: number;
  totalLost: number;
  totalLostAmount: number;
}

const calculateSummary = (conversions: ConversionDetailDataV2[]): ConversionSummary => {
  const avgCurrent = Math.round(conversions.reduce((sum, c) => sum + c.value, 0) / conversions.length);
  const avgPlan = Math.round(conversions.reduce((sum, c) => sum + c.target, 0) / conversions.length);
  const totalInput = conversions.reduce((sum, c) => sum + c.inputFact, 0);
  const totalOutput = conversions.reduce((sum, c) => sum + c.outputFact, 0);
  const totalLost = conversions.reduce((sum, c) => sum + c.lostCount, 0);
  const totalLostAmount = conversions.reduce((sum, c) => sum + c.lostAmount, 0);
  
  return {
    overall: { current: avgCurrent, plan: avgPlan },
    totalInput,
    totalOutput,
    totalLost,
    totalLostAmount,
  };
};

export const conversionSummaryByPeriod: Record<FilterPeriod, ConversionSummary> = Object.fromEntries(
  Object.entries(conversionsByPeriod).map(([period, conversions]) => [period, calculateSummary(conversions)])
) as Record<FilterPeriod, ConversionSummary>;

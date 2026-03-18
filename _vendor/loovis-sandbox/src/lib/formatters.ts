/**
 * Единый модуль форматирования чисел для дашборда
 * Использует русскую локаль и понятные сокращения
 */

// Форматирование числа с пробелами (русская локаль)
export const formatNumber = (value: number): string => {
  return value.toLocaleString('ru-RU');
};

// Краткое форматирование для компактных карточек (с неразрывными пробелами)
export const formatCompact = (value: number): string => {
  if (value >= 1000000) {
    const formatted = (value / 1000000).toFixed(1).replace('.', ',');
    return `${formatted}\u00A0млн`;
  }
  if (value >= 1000) {
    return `${Math.round(value / 1000)}\u00A0тыс`;
  }
  return value.toString();
};

// Форматирование с единицами измерения (неразрывные пробелы)
export const formatWithUnit = (value: number, unit: string): string => {
  if (unit === '₽' || unit === 'руб') {
    if (value >= 1000000) {
      const formatted = (value / 1000000).toFixed(1).replace('.', ',');
      return `${formatted}\u00A0млн\u00A0₽`;
    }
    if (value >= 1000) {
      return `${Math.round(value / 1000)}\u00A0тыс\u00A0₽`;
    }
    return `${value}\u00A0₽`;
  }
  if (unit === '%') return `${value}%`;
  if (unit === 'шт' || unit === 'шт.') {
    if (value >= 1000) {
      return `${Math.round(value / 1000)}\u00A0тыс`;
    }
    return value.toString();
  }
  return value.toString();
};

// Форматирование значения без единицы (неразрывные пробелы)
export const formatValue = (value: number, unit: string): string => {
  if (unit === '₽' || unit === 'руб') {
    if (value >= 1000000) {
      const formatted = (value / 1000000).toFixed(1).replace('.', ',');
      return `${formatted}\u00A0млн`;
    }
    if (value >= 1000) {
      return `${Math.round(value / 1000)}\u00A0тыс`;
    }
    return value.toString();
  }
  if (unit === '%') return `${value}%`;
  return value.toString();
};

// Форматирование запаса с единицами (неразрывные пробелы)
export const formatReserve = (value: number, unit: string): string => {
  const prefix = value >= 0 ? '+' : '';
  
  if (unit === '₽' || unit === 'руб') {
    if (Math.abs(value) >= 1000000) {
      const formatted = (value / 1000000).toFixed(1).replace('.', ',');
      return `${prefix}${formatted}\u00A0млн\u00A0₽`;
    }
    if (Math.abs(value) >= 1000) {
      return `${prefix}${Math.round(value / 1000)}\u00A0тыс\u00A0₽`;
    }
    return `${prefix}${value}\u00A0₽`;
  }
  
  if (unit === '%') {
    return `${prefix}${value}%`;
  }
  
  // Для количественных показателей (шт, чел и т.д.)
  if (Math.abs(value) >= 1000) {
    return `${prefix}${Math.round(value / 1000)}\u00A0тыс`;
  }
  return `${prefix}${value}`;
};

// Форматирование плана (неразрывные пробелы)
export const formatPlan = (value: number, unit: string): string => {
  if (unit === '₽' || unit === 'руб') {
    if (value >= 1000000) {
      const formatted = (value / 1000000).toFixed(1).replace('.', ',');
      return `${formatted}\u00A0млн`;
    }
    if (value >= 1000) {
      return `${Math.round(value / 1000)}\u00A0тыс`;
    }
    return value.toString();
  }
  if (unit === '%') return `${value}%`;
  return value.toString();
};

// Полное форматирование числа с пробелами (без сокращений)
export const formatFull = (value: number, unit: string): string => {
  const formatted = value.toLocaleString('ru-RU');
  
  if (unit === '₽' || unit === 'руб') {
    return `${formatted}\u00A0₽`;
  }
  if (unit === '%') {
    return `${value}%`;
  }
  return formatted;
};

// Полное форматирование запаса (без сокращений)
export const formatReserveFull = (value: number, unit: string): string => {
  const prefix = value >= 0 ? '+' : '';
  const formatted = Math.abs(value).toLocaleString('ru-RU');
  
  if (unit === '₽' || unit === 'руб') {
    return `${prefix}${formatted}\u00A0₽`;
  }
  if (unit === '%') {
    return `${prefix}${value}%`;
  }
  return `${prefix}${formatted}`;
};

// Динамический расчёт статуса метрики на основе данных
// Подсветка ТОЛЬКО для метрик с отклонением (deviation)
export const calculateMetricStatus = (
  current: number,
  plan: number,
  forecast?: number,
  forecastValue?: number,
  forecastLabel?: string
): 'good' | 'warning' | 'critical' => {
  // Подсветка ТОЛЬКО для метрик с отклонением (deviation)
  if (forecastLabel === 'deviation' && forecastValue !== undefined) {
    if (forecastValue <= -5) return 'critical';
    if (forecastValue >= 5) return 'good';
    return 'warning';
  }
  
  // Для прогнозных метрик — всегда нейтральный статус (без подсветки)
  return 'warning';
};

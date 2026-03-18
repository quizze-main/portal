export type ShiftType = 'work' | 'day_off' | 'vacation' | 'sick' | 'extra_shift' | 'day_off_lieu' | 'absent';

export interface ShiftEntry {
  id: string;
  employee_id: string;
  branch_id: string;
  date: string; // YYYY-MM-DD
  shift_type: ShiftType;
  shift_number?: number | null;
  time_start?: string | null; // HH:MM
  time_end?: string | null;   // HH:MM
  note?: string;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ShiftEntryInput {
  employee_id: string;
  branch_id: string;
  date: string;
  shift_type: ShiftType;
  shift_number?: number | null;
  time_start?: string | null;
  time_end?: string | null;
  note?: string;
}

export interface CycleDay {
  shift_type: ShiftType;
  shift_number?: number;
  time_start?: string;
  time_end?: string;
}

export interface ShiftTemplate {
  id: string;
  name: string;
  pattern_type: '2/2' | '5/2' | 'custom';
  cycle_days: CycleDay[];
  branch_id?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ShiftTemplateInput {
  name: string;
  pattern_type: '2/2' | '5/2' | 'custom';
  cycle_days: CycleDay[];
  branch_id?: string | null;
}

export interface ShiftScheduleResponse {
  entries: ShiftEntry[];
  month: string;
  branch_id: string;
}

export interface AutoFillParams {
  employee_id: string;
  branch_id: string;
  month: string;
  template_id: string;
  start_offset?: number;
  preserve_special?: boolean;
}

export interface CopyWeekParams {
  branch_id: string;
  employee_id?: string;
  source_start: string; // YYYY-MM-DD (Monday)
  target_start: string; // YYYY-MM-DD (Monday)
}

export interface BulkResult {
  created: number;
  updated: number;
  total: number;
}

// Display helpers
export const SHIFT_TYPE_LABELS: Record<ShiftType, string> = {
  work: 'Смена',
  day_off: 'Выходной',
  vacation: 'Отпуск',
  sick: 'Больничный',
  extra_shift: 'Доп. смена',
  day_off_lieu: 'Отгул',
  absent: 'Прогул',
};

export const SHIFT_TYPE_SHORT: Record<ShiftType, string> = {
  work: '',       // shows shift_number or time range
  day_off: 'в',
  vacation: 'О',
  sick: 'б',
  extra_shift: 'ДС',
  day_off_lieu: 'От',
  absent: 'П',
};

export const SHIFT_TYPE_COLORS: Record<ShiftType, { bg: string; text: string }> = {
  work:         { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-200' },
  extra_shift:  { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300' },
  day_off:      { bg: 'bg-gray-50 dark:bg-gray-800', text: 'text-muted-foreground' },
  vacation:     { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' },
  sick:         { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300' },
  absent:       { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300' },
  day_off_lieu: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300' },
};

export interface StaffingRequirement {
  id: string;
  branch_id: string;
  designation: string;
  day_of_week: number | null; // 0=Mon..6=Sun, null=every day
  required_count: number;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface StaffingRequirementInput {
  branch_id: string;
  designation: string;
  day_of_week: number | null;
  required_count: number;
}

export interface DayCoverage {
  date: string;
  dayOfWeek: number; // 0=Mon..6=Sun
  required: DesignationRequirement[];
  actual: DesignationActual[];
  totalRequired: number;
  totalScheduled: number;
}

export interface DesignationRequirement {
  designation: string;
  count: number;
}

export interface DesignationActual {
  designation: string;
  employees: { id: string; name: string }[];
}

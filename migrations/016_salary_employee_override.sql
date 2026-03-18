-- Migration 016: Add employee_id to salary_configs for per-employee overrides
-- Allows saving individual salary configs that override position-level defaults

ALTER TABLE salary_configs ADD COLUMN IF NOT EXISTS employee_id TEXT DEFAULT NULL;

-- Replace the branch+position unique constraint with branch+position+employee
ALTER TABLE salary_configs DROP CONSTRAINT IF EXISTS salary_configs_branch_id_position_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS salary_configs_branch_pos_emp
  ON salary_configs(branch_id, position_id, COALESCE(employee_id, ''));

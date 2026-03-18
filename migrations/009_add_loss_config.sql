-- V4: Add loss/reserve configuration to metric_definitions
ALTER TABLE metric_definitions ADD COLUMN IF NOT EXISTS loss_mode TEXT DEFAULT 'disabled'
  CHECK (loss_mode IN ('auto', 'formula', 'jsonpath', 'disabled', 'tracker'));
ALTER TABLE metric_definitions ADD COLUMN IF NOT EXISTS loss_formula TEXT;
ALTER TABLE metric_definitions ADD COLUMN IF NOT EXISTS json_path_loss TEXT;

-- Migrate existing tracker metrics to use 'tracker' loss mode
UPDATE metric_definitions SET loss_mode = 'tracker' WHERE source_type = 'tracker' AND (loss_mode IS NULL OR loss_mode = 'disabled');

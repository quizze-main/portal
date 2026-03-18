-- Staffing requirements: how many employees of each designation are needed per day-of-week
CREATE TABLE IF NOT EXISTS staffing_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id TEXT NOT NULL,
  designation TEXT NOT NULL,
  day_of_week SMALLINT, -- 0=Mon..6=Sun, NULL=every day
  required_count SMALLINT NOT NULL DEFAULT 1,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Unique constraint: one requirement per branch + designation + day_of_week
CREATE UNIQUE INDEX IF NOT EXISTS staffing_req_branch_desig_dow
  ON staffing_requirements (branch_id, designation, COALESCE(day_of_week, -1));

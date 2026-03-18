-- Migration 007: Salary configs and sessions (replaces salary-configs.json + salary-sessions.json)

CREATE TABLE IF NOT EXISTS salary_configs (
    id          TEXT PRIMARY KEY,
    branch_id   TEXT NOT NULL,
    position_id TEXT NOT NULL,
    base_salary NUMERIC NOT NULL,
    personal_plan NUMERIC,
    club_plan   NUMERIC,
    matrix      JSONB NOT NULL,
    kpis        JSONB NOT NULL DEFAULT '[]',
    club_levels JSONB DEFAULT '[]',
    manager_levels JSONB DEFAULT '[]',
    manager_axis_label TEXT,
    club_axis_label TEXT,
    metadata    JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE (branch_id, position_id)
);

CREATE TABLE IF NOT EXISTS salary_sessions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id   TEXT NOT NULL,
    period      TEXT NOT NULL,
    club_percent NUMERIC,
    employees   JSONB NOT NULL DEFAULT '[]',
    created_by  TEXT,
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_salary_sessions_branch ON salary_sessions(branch_id, period);

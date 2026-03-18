-- Migration 005: Metric snapshots and manual data

-- Pre-aggregated metric values (cache layer)
CREATE TABLE IF NOT EXISTS metric_snapshots (
    id              BIGSERIAL PRIMARY KEY,
    metric_id       TEXT NOT NULL REFERENCES metric_definitions(id) ON DELETE CASCADE,
    branch_id       TEXT,
    employee_id     TEXT,
    client_id       TEXT,
    period_type     TEXT NOT NULL CHECK (period_type IN ('day', 'week', 'dekada', 'month', 'quarter', 'year')),
    period_key      TEXT NOT NULL,
    fact_value      NUMERIC DEFAULT 0,
    plan_value      NUMERIC,
    sample_count    INT DEFAULT 0,
    source          TEXT DEFAULT 'aggregated',
    computed_at     TIMESTAMPTZ DEFAULT now(),
    UNIQUE (metric_id, branch_id, employee_id, client_id, period_type, period_key)
);
CREATE INDEX IF NOT EXISTS idx_snap_metric ON metric_snapshots(metric_id, period_type, period_key);
CREATE INDEX IF NOT EXISTS idx_snap_branch ON metric_snapshots(branch_id, period_type, period_key);

-- Manual data entries (replaces manualData arrays in dashboard-metrics.json)
CREATE TABLE IF NOT EXISTS manual_metric_data (
    id          SERIAL PRIMARY KEY,
    metric_id   TEXT NOT NULL REFERENCES metric_definitions(id) ON DELETE CASCADE,
    period      TEXT NOT NULL,
    branch_id   TEXT,
    employee_id TEXT,
    client_id   TEXT,
    fact_value  NUMERIC DEFAULT 0,
    plan_value  NUMERIC DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE (metric_id, period, branch_id, employee_id, client_id)
);
CREATE INDEX IF NOT EXISTS idx_manual_metric ON manual_metric_data(metric_id, period);

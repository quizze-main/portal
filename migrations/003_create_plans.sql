-- Migration 003: Metric plans (replaces metric-plans.json)

CREATE TABLE IF NOT EXISTS metric_plans (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_id   TEXT NOT NULL REFERENCES metric_definitions(id) ON DELETE CASCADE,
    scope       TEXT NOT NULL CHECK (scope IN ('network', 'branch', 'employee', 'client')),
    scope_id    TEXT NOT NULL,
    period      TEXT NOT NULL,
    plan_value  NUMERIC NOT NULL,
    created_by  TEXT,
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE (metric_id, scope, scope_id, period)
);
CREATE INDEX IF NOT EXISTS idx_plans_metric ON metric_plans(metric_id, period);
CREATE INDEX IF NOT EXISTS idx_plans_scope ON metric_plans(scope, scope_id);

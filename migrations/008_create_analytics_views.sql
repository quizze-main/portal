-- Phase 4: Materialized views for common aggregations
-- These views pre-compute frequent queries to speed up dashboard and export.

-- Monthly aggregation per metric + branch
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_monthly_by_branch AS
SELECT
    s.metric_id,
    s.branch_id,
    TO_CHAR(s.period_key::date, 'YYYY-MM') AS month_key,
    md.metric_type,
    md.aggregation_method,
    CASE
        WHEN md.metric_type IN ('averaged', 'percentage') THEN
            ROUND(CAST(SUM(s.fact_value * COALESCE(s.sample_count, 1)) / NULLIF(SUM(COALESCE(s.sample_count, 1)), 0) AS NUMERIC), 2)
        ELSE
            COALESCE(SUM(s.fact_value), 0)
    END AS fact_value,
    SUM(COALESCE(s.sample_count, 0)) AS sample_count,
    COUNT(*) AS day_count
FROM metric_snapshots s
LEFT JOIN metric_definitions md ON md.id = s.metric_id
WHERE s.period_type = 'day'
GROUP BY s.metric_id, s.branch_id, TO_CHAR(s.period_key::date, 'YYYY-MM'), md.metric_type, md.aggregation_method;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_monthly_branch
    ON mv_monthly_by_branch (metric_id, branch_id, month_key);

-- Monthly aggregation per metric + employee
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_monthly_by_employee AS
SELECT
    s.metric_id,
    s.employee_id,
    s.branch_id,
    TO_CHAR(s.period_key::date, 'YYYY-MM') AS month_key,
    md.metric_type,
    CASE
        WHEN md.metric_type IN ('averaged', 'percentage') THEN
            ROUND(CAST(SUM(s.fact_value * COALESCE(s.sample_count, 1)) / NULLIF(SUM(COALESCE(s.sample_count, 1)), 0) AS NUMERIC), 2)
        ELSE
            COALESCE(SUM(s.fact_value), 0)
    END AS fact_value,
    SUM(COALESCE(s.sample_count, 0)) AS sample_count,
    COUNT(*) AS day_count
FROM metric_snapshots s
LEFT JOIN metric_definitions md ON md.id = s.metric_id
WHERE s.period_type = 'day'
  AND s.employee_id IS NOT NULL
GROUP BY s.metric_id, s.employee_id, s.branch_id, TO_CHAR(s.period_key::date, 'YYYY-MM'), md.metric_type;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_monthly_employee
    ON mv_monthly_by_employee (metric_id, employee_id, month_key);

-- Daily event counts by type + branch (for event dashboard)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_events AS
SELECT
    event_type,
    branch_id,
    event_time::date AS event_date,
    COUNT(*) AS event_count,
    SUM((metric_values->>'revenue')::numeric) FILTER (WHERE metric_values ? 'revenue') AS total_revenue,
    SUM((metric_values->>'items_count')::numeric) FILTER (WHERE metric_values ? 'items_count') AS total_items
FROM events
GROUP BY event_type, branch_id, event_time::date;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_daily_events
    ON mv_daily_events (event_type, branch_id, event_date);

-- Quarterly summary per metric + branch (for quarterly reports)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_quarterly_by_branch AS
SELECT
    s.metric_id,
    s.branch_id,
    TO_CHAR(s.period_key::date, 'YYYY') || '-Q' || EXTRACT(quarter FROM s.period_key::date)::int AS quarter_key,
    md.metric_type,
    CASE
        WHEN md.metric_type IN ('averaged', 'percentage') THEN
            ROUND(CAST(SUM(s.fact_value * COALESCE(s.sample_count, 1)) / NULLIF(SUM(COALESCE(s.sample_count, 1)), 0) AS NUMERIC), 2)
        ELSE
            COALESCE(SUM(s.fact_value), 0)
    END AS fact_value,
    SUM(COALESCE(s.sample_count, 0)) AS sample_count,
    COUNT(*) AS day_count
FROM metric_snapshots s
LEFT JOIN metric_definitions md ON md.id = s.metric_id
WHERE s.period_type = 'day'
GROUP BY s.metric_id, s.branch_id,
    TO_CHAR(s.period_key::date, 'YYYY') || '-Q' || EXTRACT(quarter FROM s.period_key::date)::int,
    md.metric_type;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_quarterly_branch
    ON mv_quarterly_by_branch (metric_id, branch_id, quarter_key);

-- Refresh tracking table
CREATE TABLE IF NOT EXISTS _materialized_view_refresh_log (
    view_name   TEXT PRIMARY KEY,
    last_refresh TIMESTAMPTZ,
    duration_ms  INT,
    row_count    INT
);

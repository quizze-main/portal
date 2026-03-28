-- Migration 001: Dimension tables
-- Branches, employees, clients, calendar view

-- Branches (stores/offices)
CREATE TABLE IF NOT EXISTS dim_branches (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    code        TEXT,
    city        TEXT,
    region      TEXT,
    timezone    TEXT DEFAULT 'Europe/Moscow',
    enabled     BOOLEAN DEFAULT true,
    metadata    JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Employees (managers/staff)
CREATE TABLE IF NOT EXISTS dim_employees (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    branch_id   TEXT REFERENCES dim_branches(id),
    department  TEXT,
    designation TEXT,
    frappe_user TEXT,
    tg_chat_id  TEXT,
    enabled     BOOLEAN DEFAULT true,
    metadata    JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_emp_branch ON dim_employees(branch_id);
CREATE INDEX IF NOT EXISTS idx_emp_designation ON dim_employees(designation);

-- Clients (NEW dimension per CTO requirement)
CREATE TABLE IF NOT EXISTS dim_clients (
    id          TEXT PRIMARY KEY,
    external_id TEXT,
    source_id   TEXT,
    name        TEXT NOT NULL,
    branch_id   TEXT REFERENCES dim_branches(id),
    employee_id TEXT REFERENCES dim_employees(id),
    client_type TEXT,
    metadata    JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_clients_branch ON dim_clients(branch_id);
CREATE INDEX IF NOT EXISTS idx_clients_source ON dim_clients(source_id, external_id);

-- Calendar view for grouping (day/week/month/quarter/year/dekada)
CREATE OR REPLACE VIEW dim_calendar AS
SELECT
    d::date AS date,
    EXTRACT(year FROM d)::int AS year,
    EXTRACT(month FROM d)::int AS month,
    EXTRACT(quarter FROM d)::int AS quarter,
    TO_CHAR(d, 'YYYY-MM') AS month_key,
    TO_CHAR(d, 'YYYY') || '-Q' || EXTRACT(quarter FROM d)::int AS quarter_key,
    TO_CHAR(d, 'IYYY') || '-W' || LPAD(EXTRACT(isoyear FROM d)::text, 2, '0') AS week_key,
    CASE
        WHEN EXTRACT(day FROM d) <= 10 THEN 1
        WHEN EXTRACT(day FROM d) <= 20 THEN 2
        ELSE 3
    END AS dekada,
    CASE WHEN EXTRACT(isodow FROM d) <= 5 THEN true ELSE false END AS is_working_day
FROM generate_series('2024-01-01'::date, '2030-12-31'::date, '1 day') AS d;
-- Migration 002: Metric catalog (replaces dashboard-metrics.json)

CREATE TABLE IF NOT EXISTS metric_definitions (
    id                  TEXT PRIMARY KEY,
    name                TEXT NOT NULL,
    description         TEXT,
    unit                TEXT DEFAULT '',

    -- Classification
    metric_type         TEXT NOT NULL CHECK (metric_type IN ('absolute', 'averaged', 'percentage', 'computed')),
    value_type          TEXT NOT NULL CHECK (value_type IN ('currency', 'count', 'percentage', 'ratio', 'duration', 'score')),
    aggregation_method  TEXT NOT NULL DEFAULT 'sum' CHECK (aggregation_method IN ('sum', 'weighted_average', 'simple_average', 'last', 'min', 'max')),

    -- Plan configuration
    plan_period         TEXT DEFAULT 'month' CHECK (plan_period IN ('day', 'week', 'month', 'quarter', 'year')),
    plan_prorate_method TEXT DEFAULT 'working_days' CHECK (plan_prorate_method IN ('working_days', 'calendar_days', 'none')),

    -- Display
    widget_type         TEXT DEFAULT 'kpi_forecast' CHECK (widget_type IN ('kpi_forecast', 'kpi_deviation')),
    forecast_label      TEXT DEFAULT 'forecast',
    forecast_unit       TEXT DEFAULT '%',
    color               TEXT DEFAULT '#3B82F6',
    decimal_places      INT DEFAULT 0,
    display_order       INT DEFAULT 0,
    parent_id           TEXT REFERENCES metric_definitions(id),

    -- Thresholds
    threshold_critical  NUMERIC,
    threshold_good      NUMERIC,

    -- Source
    source_type         TEXT NOT NULL CHECK (source_type IN ('event', 'tracker', 'external_api', 'manual', 'computed')),
    data_source_id      TEXT,
    tracker_code        TEXT,

    -- External API
    external_path       TEXT,
    external_method     TEXT DEFAULT 'GET',
    external_query_params JSONB DEFAULT '[]',
    external_body       JSONB,
    json_path_fact      TEXT,
    json_path_plan      TEXT,

    -- Computed
    formula             TEXT,
    formula_dependencies TEXT[] DEFAULT '{}',

    -- Visibility
    enabled             BOOLEAN DEFAULT true,
    visible_to_positions TEXT[] DEFAULT '{}',

    -- Legacy compat
    bindings            JSONB DEFAULT '[]',

    metadata            JSONB DEFAULT '{}',
    created_at          TIMESTAMPTZ DEFAULT now(),
    updated_at          TIMESTAMPTZ DEFAULT now()
);

-- Field mappings (normalized from embedded arrays)
CREATE TABLE IF NOT EXISTS metric_field_mappings (
    id              SERIAL PRIMARY KEY,
    metric_id       TEXT REFERENCES metric_definitions(id) ON DELETE CASCADE,
    data_source_id  TEXT,
    api_field       TEXT NOT NULL,
    entity_type     TEXT NOT NULL CHECK (entity_type IN ('branch', 'employee', 'department', 'designation', 'custom', 'client')),
    label           TEXT,
    values          JSONB NOT NULL DEFAULT '{}',
    UNIQUE (metric_id, data_source_id, api_field, entity_type)
);
CREATE INDEX IF NOT EXISTS idx_fm_metric ON metric_field_mappings(metric_id);
CREATE INDEX IF NOT EXISTS idx_fm_source ON metric_field_mappings(data_source_id);
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
-- Migration 004: Event store (core of data platform)

CREATE TABLE IF NOT EXISTS events (
    id              BIGSERIAL PRIMARY KEY,
    event_type      TEXT NOT NULL,
    event_time      TIMESTAMPTZ NOT NULL,
    received_at     TIMESTAMPTZ DEFAULT now(),

    -- Three dimensions (all nullable)
    branch_id       TEXT,
    employee_id     TEXT,
    client_id       TEXT,

    -- Source tracking
    source_id       TEXT NOT NULL,
    external_id     TEXT,

    -- Metric values from event
    metric_values   JSONB NOT NULL DEFAULT '{}',

    -- Full payload for reprocessing
    raw_payload     JSONB,

    processed       BOOLEAN DEFAULT false,
    processed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_events_type_time ON events(event_type, event_time);
CREATE INDEX IF NOT EXISTS idx_events_branch ON events(branch_id, event_time) WHERE branch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_employee ON events(employee_id, event_time) WHERE employee_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_client ON events(client_id, event_time) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_dedup ON events(source_id, external_id);
CREATE INDEX IF NOT EXISTS idx_events_received ON events(received_at);

-- Event types registry
CREATE TABLE IF NOT EXISTS event_types (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    description     TEXT,
    schema          JSONB,
    source_types    TEXT[] DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT now()
);

INSERT INTO event_types (id, name, description) VALUES
    ('order_created', 'Заказ создан', 'Новый заказ создан в CRM'),
    ('order_status_changed', 'Статус заказа изменён', 'Заказ перешёл в новый статус'),
    ('order_closed', 'Заказ закрыт', 'Заказ успешно закрыт'),
    ('order_cancelled', 'Заказ отменён', 'Заказ отменён клиентом или менеджером'),
    ('order_returned', 'Возврат', 'Оформлен возврат по заказу'),
    ('visit_recorded', 'Визит клиента', 'Визит клиента в филиал'),
    ('payment_received', 'Оплата', 'Получена оплата')
ON CONFLICT (id) DO NOTHING;
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
-- Migration 006: Data sources and adapter registry (replaces data-sources.json)

CREATE TABLE IF NOT EXISTS data_sources (
    id              TEXT PRIMARY KEY,
    label           TEXT NOT NULL,
    base_url        TEXT,
    auth_type       TEXT DEFAULT 'none',
    auth_config     JSONB DEFAULT '{}',
    pagination_type TEXT DEFAULT 'none',
    pagination_config JSONB DEFAULT '{}',
    health_check_path TEXT DEFAULT '/',
    health_check_method TEXT DEFAULT 'GET',
    timeout_ms      INT DEFAULT 10000,
    enabled         BOOLEAN DEFAULT true,
    built_in        BOOLEAN DEFAULT false,
    source_origin   TEXT DEFAULT 'manual',

    -- CRM adapter
    adapter_type    TEXT,
    adapter_config  JSONB DEFAULT '{}',
    webhook_secret  TEXT,
    poll_interval_s INT,
    last_poll_at    TIMESTAMPTZ,

    field_mappings  JSONB DEFAULT '[]',
    last_test_at    TIMESTAMPTZ,
    last_test_status TEXT,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Adapter registry
CREATE TABLE IF NOT EXISTS adapter_registry (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    description     TEXT,
    version         TEXT DEFAULT '1.0.0',
    input_schema    JSONB,
    output_schema   JSONB,
    supported_events TEXT[] DEFAULT '{}',
    default_mappings JSONB DEFAULT '{}',
    adapter_code    TEXT,
    ai_generated    BOOLEAN DEFAULT false,
    ai_prompt       TEXT,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Seed known adapters
INSERT INTO adapter_registry (id, name, supported_events) VALUES
    ('amocrm', 'amoCRM', ARRAY['order_created', 'order_status_changed', 'order_closed']),
    ('tracker', 'Loovis Tracker', ARRAY['order_created', 'order_closed', 'visit_recorded']),
    ('manual', 'Manual Entry', ARRAY[]::TEXT[])
ON CONFLICT (id) DO NOTHING;
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
-- V4: Add loss/reserve configuration to metric_definitions
ALTER TABLE metric_definitions ADD COLUMN IF NOT EXISTS loss_mode TEXT DEFAULT 'disabled'
  CHECK (loss_mode IN ('auto', 'formula', 'jsonpath', 'disabled', 'tracker'));
ALTER TABLE metric_definitions ADD COLUMN IF NOT EXISTS loss_formula TEXT;
ALTER TABLE metric_definitions ADD COLUMN IF NOT EXISTS json_path_loss TEXT;

-- Migrate existing tracker metrics to use 'tracker' loss mode
UPDATE metric_definitions SET loss_mode = 'tracker' WHERE source_type = 'tracker' AND (loss_mode IS NULL OR loss_mode = 'disabled');
-- Dashboard widgets table (rankings, charts, funnels, etc.)
CREATE TABLE IF NOT EXISTS dashboard_widgets (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('ranking')),
  name TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  parent_id TEXT DEFAULT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default ranking widgets
INSERT INTO dashboard_widgets (id, type, name, display_order, config) VALUES
  ('ranking_branches', 'ranking', 'Рейтинг филиалов', 100, '{"entityType":"branch","metricCodes":["revenue_created","revenue_closed","frames_count","conversion_rate","csi","avg_glasses_price","margin_rate","avg_repaires_price"],"lossConfig":{"mode":"metric","metricCode":"revenue_created","formula":""}}'),
  ('ranking_managers', 'ranking', 'Рейтинг менеджеров', 200, '{"entityType":"manager","metricCodes":["revenue_created","revenue_closed","frames_count","avg_glasses_price","conversion_rate","csi","margin_rate"],"lossConfig":{"mode":"metric","metricCode":"revenue_created","formula":""}}')
ON CONFLICT (id) DO NOTHING;
-- Shift schedule: one entry per employee per day
CREATE TABLE IF NOT EXISTS shift_entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id     TEXT NOT NULL,
    branch_id       TEXT NOT NULL,
    date            DATE NOT NULL,
    shift_type      TEXT NOT NULL CHECK (shift_type IN (
        'work', 'day_off', 'vacation', 'sick',
        'extra_shift', 'day_off_lieu', 'absent'
    )),
    shift_number    SMALLINT,
    time_start      TIME,
    time_end        TIME,
    note            TEXT DEFAULT '',
    created_by      TEXT,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE (employee_id, date)
);

CREATE INDEX IF NOT EXISTS idx_shift_branch_date ON shift_entries(branch_id, date);
CREATE INDEX IF NOT EXISTS idx_shift_employee_date ON shift_entries(employee_id, date);

-- Reusable schedule templates (2/2, 5/2, custom)
CREATE TABLE IF NOT EXISTS shift_templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    pattern_type    TEXT NOT NULL CHECK (pattern_type IN ('2/2', '5/2', 'custom')),
    cycle_days      JSONB NOT NULL,
    branch_id       TEXT,
    created_by      TEXT,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Seed default templates
INSERT INTO shift_templates (id, name, pattern_type, cycle_days) VALUES
  (gen_random_uuid(), '2/2 (10:00–19:00)', '2/2', '[
    {"shift_type":"work","shift_number":1,"time_start":"10:00","time_end":"19:00"},
    {"shift_type":"work","shift_number":1,"time_start":"10:00","time_end":"19:00"},
    {"shift_type":"day_off"},
    {"shift_type":"day_off"}
  ]'::jsonb),
  (gen_random_uuid(), '2/2 (11:00–20:00)', '2/2', '[
    {"shift_type":"work","shift_number":1,"time_start":"11:00","time_end":"20:00"},
    {"shift_type":"work","shift_number":1,"time_start":"11:00","time_end":"20:00"},
    {"shift_type":"day_off"},
    {"shift_type":"day_off"}
  ]'::jsonb),
  (gen_random_uuid(), '5/2 (10:00–18:00)', '5/2', '[
    {"shift_type":"work","shift_number":1,"time_start":"10:00","time_end":"18:00"},
    {"shift_type":"work","shift_number":1,"time_start":"10:00","time_end":"18:00"},
    {"shift_type":"work","shift_number":1,"time_start":"10:00","time_end":"18:00"},
    {"shift_type":"work","shift_number":1,"time_start":"10:00","time_end":"18:00"},
    {"shift_type":"work","shift_number":1,"time_start":"10:00","time_end":"18:00"},
    {"shift_type":"day_off"},
    {"shift_type":"day_off"}
  ]'::jsonb)
ON CONFLICT DO NOTHING;
-- Migration 012: Organizational structure tables
-- Networks, designations, departments + extend branches and employees

-- Networks / companies (hierarchy root)
CREATE TABLE IF NOT EXISTS org_networks (
    id          TEXT PRIMARY KEY,                -- e.g. 'loov-russia'
    name        TEXT NOT NULL,
    enabled     BOOLEAN DEFAULT true,
    metadata    JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Designations (job titles / positions)
CREATE TABLE IF NOT EXISTS org_designations (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,            -- e.g. "Руководитель клуба"
    category    TEXT,                            -- 'leader','senior_manager','optometrist','manager_5_2','manager_2_2','universal_manager','manager','care_manager','other'
    is_leader   BOOLEAN DEFAULT false,
    metadata    JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Departments (hierarchy via parent_id, self-referencing)
CREATE TABLE IF NOT EXISTS org_departments (
    id              TEXT PRIMARY KEY,            -- Frappe-style: "Клуб СПб - LR"
    department_name TEXT NOT NULL,
    branch_id       TEXT REFERENCES dim_branches(id),
    parent_id       TEXT REFERENCES org_departments(id),
    store_id        TEXT,                        -- maps to Loovis Tracker store (was custom_store_id)
    is_group        BOOLEAN DEFAULT false,
    enabled         BOOLEAN DEFAULT true,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_org_dept_branch ON org_departments(branch_id);
CREATE INDEX IF NOT EXISTS idx_org_dept_store ON org_departments(store_id);
CREATE INDEX IF NOT EXISTS idx_org_dept_parent ON org_departments(parent_id);

-- Extend dim_branches with network and store references
ALTER TABLE dim_branches ADD COLUMN IF NOT EXISTS network_id TEXT REFERENCES org_networks(id);
ALTER TABLE dim_branches ADD COLUMN IF NOT EXISTS store_id TEXT;

-- Extend dim_employees with all Frappe Employee fields
ALTER TABLE dim_employees ADD COLUMN IF NOT EXISTS employee_name TEXT;
ALTER TABLE dim_employees ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE dim_employees ADD COLUMN IF NOT EXISTS tg_username TEXT;
ALTER TABLE dim_employees ADD COLUMN IF NOT EXISTS itigris_user_id TEXT;
ALTER TABLE dim_employees ADD COLUMN IF NOT EXISTS reports_to TEXT REFERENCES dim_employees(id);
ALTER TABLE dim_employees ADD COLUMN IF NOT EXISTS company_email TEXT;
ALTER TABLE dim_employees ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE dim_employees ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE dim_employees ADD COLUMN IF NOT EXISTS date_of_joining DATE;
ALTER TABLE dim_employees ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE dim_employees ADD COLUMN IF NOT EXISTS shift_format TEXT;    -- '2/2' or '5/2'
ALTER TABLE dim_employees ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
ALTER TABLE dim_employees ADD COLUMN IF NOT EXISTS frappe_id TEXT;       -- original HR-EMP-XXXXX for cross-reference
ALTER TABLE dim_employees ADD COLUMN IF NOT EXISTS department_id TEXT REFERENCES org_departments(id);

CREATE INDEX IF NOT EXISTS idx_emp_tg_username ON dim_employees(tg_username);
CREATE INDEX IF NOT EXISTS idx_emp_frappe_id ON dim_employees(frappe_id);
CREATE INDEX IF NOT EXISTS idx_emp_status ON dim_employees(status);
CREATE INDEX IF NOT EXISTS idx_emp_reports_to ON dim_employees(reports_to);
CREATE INDEX IF NOT EXISTS idx_emp_department_id ON dim_employees(department_id);

-- Sequence for generating new employee IDs (HR-EMP-XXXXX format)
-- Will be initialized by migrate-from-frappe.js to max(existing) + 100
CREATE SEQUENCE IF NOT EXISTS emp_id_seq START WITH 1;
-- Migration 013: RBAC tables, feature flags, user settings

-- Roles (access levels)
CREATE TABLE IF NOT EXISTS rbac_roles (
    id          TEXT PRIMARY KEY,                -- 'LIS-R-00000', 'LIS-R-00001'
    name        TEXT,
    description TEXT,
    level       INT DEFAULT 0                   -- priority: higher = more access
);

-- Seed default roles
INSERT INTO rbac_roles (id, name, description, level) VALUES
    ('LIS-R-00000', 'Стандарт', 'Standard access — own store only', 0),
    ('LIS-R-00001', 'Менеджер', 'Manager — single or multi-store access', 1)
ON CONFLICT (id) DO NOTHING;

-- Employee role assignments
CREATE TABLE IF NOT EXISTS rbac_employee_roles (
    employee_id TEXT NOT NULL REFERENCES dim_employees(id) ON DELETE CASCADE,
    role_id     TEXT NOT NULL REFERENCES rbac_roles(id),
    source      TEXT DEFAULT 'manual',          -- 'manual', 'frappe_sync', 'auto'
    granted_by  TEXT,
    granted_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE (employee_id, role_id)
);
CREATE INDEX IF NOT EXISTS idx_rbac_emp_roles_emp ON rbac_employee_roles(employee_id);

-- Store access grants (which stores an employee can see)
CREATE TABLE IF NOT EXISTS rbac_store_access (
    employee_id     TEXT NOT NULL REFERENCES dim_employees(id) ON DELETE CASCADE,
    store_id        TEXT NOT NULL,
    department_id   TEXT REFERENCES org_departments(id),
    source          TEXT DEFAULT 'manual',       -- 'manual', 'frappe_sync', 'auto'
    UNIQUE (employee_id, store_id)
);
CREATE INDEX IF NOT EXISTS idx_rbac_store_emp ON rbac_store_access(employee_id);
CREATE INDEX IF NOT EXISTS idx_rbac_store_store ON rbac_store_access(store_id);

-- Feature flags (replaces hardcoded sets in EmployeeProvider.tsx)
CREATE TABLE IF NOT EXISTS rbac_feature_flags (
    id          SERIAL PRIMARY KEY,
    flag_name   TEXT NOT NULL,                  -- 'new_dashboard', 'full_dashboard_access'
    scope_type  TEXT NOT NULL DEFAULT 'store_id', -- 'store_id', 'employee_id', 'role_id', 'designation'
    scope_value TEXT NOT NULL,
    enabled     BOOLEAN DEFAULT true,
    UNIQUE (flag_name, scope_type, scope_value)
);
CREATE INDEX IF NOT EXISTS idx_ff_flag ON rbac_feature_flags(flag_name);

-- Seed current hardcoded feature flags from EmployeeProvider.tsx
-- NEW_DASHBOARD_ALLOWED_STORE_IDS = ['1000000008', '1000000052', '1000000009']
INSERT INTO rbac_feature_flags (flag_name, scope_type, scope_value) VALUES
    ('new_dashboard', 'store_id', '1000000008'),
    ('new_dashboard', 'store_id', '1000000052'),
    ('new_dashboard', 'store_id', '1000000009')
ON CONFLICT (flag_name, scope_type, scope_value) DO NOTHING;

-- FULL_DASHBOARD_ACCESS_STORE_IDS = ['1000000009']
INSERT INTO rbac_feature_flags (flag_name, scope_type, scope_value) VALUES
    ('full_dashboard_access', 'store_id', '1000000009')
ON CONFLICT (flag_name, scope_type, scope_value) DO NOTHING;

-- User settings (replaces Frappe loovis_user_settings DocType)
CREATE TABLE IF NOT EXISTS user_settings (
    employee_id TEXT NOT NULL REFERENCES dim_employees(id) ON DELETE CASCADE,
    variant     TEXT NOT NULL DEFAULT 'shared',  -- 'mobile_tg', 'desktop_tg', 'mobile_web', 'desktop_web', 'shared'
    settings    JSONB NOT NULL DEFAULT '{}',
    updated_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE (employee_id, variant)
);
CREATE INDEX IF NOT EXISTS idx_user_settings_emp ON user_settings(employee_id);
-- Migration 014: Sync tracking for Frappe → PostgreSQL transition

-- Last sync state per entity type
CREATE TABLE IF NOT EXISTS sync_state (
    entity_type TEXT PRIMARY KEY,       -- 'employees', 'departments', 'designations', 'roles'
    last_sync   TIMESTAMPTZ,
    record_count INT DEFAULT 0,
    metadata    JSONB DEFAULT '{}'
);

-- Sync operation audit log
CREATE TABLE IF NOT EXISTS sync_log (
    id          SERIAL PRIMARY KEY,
    entity_type TEXT NOT NULL,
    action      TEXT NOT NULL,          -- 'full_sync', 'incremental', 'validate'
    status      TEXT DEFAULT 'success', -- 'success', 'error', 'partial'
    records_processed INT DEFAULT 0,
    records_created   INT DEFAULT 0,
    records_updated   INT DEFAULT 0,
    records_errors    INT DEFAULT 0,
    details     JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sync_log_entity ON sync_log(entity_type, created_at DESC);
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
-- Migration 016: Add employee_id to salary_configs for per-employee overrides
-- Allows saving individual salary configs that override position-level defaults

ALTER TABLE salary_configs ADD COLUMN IF NOT EXISTS employee_id TEXT DEFAULT NULL;

-- Replace the branch+position unique constraint with branch+position+employee
ALTER TABLE salary_configs DROP CONSTRAINT IF EXISTS salary_configs_branch_id_position_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS salary_configs_branch_pos_emp
  ON salary_configs(branch_id, position_id, COALESCE(employee_id, ''));

-- App Logs (replaces OpenSearch)
CREATE TABLE IF NOT EXISTS app_logs (
    id          BIGSERIAL PRIMARY KEY,
    timestamp   TIMESTAMPTZ NOT NULL DEFAULT now(),
    level       VARCHAR(10) NOT NULL,
    message     TEXT NOT NULL,
    service     VARCHAR(100) DEFAULT 'staff-focus-app',
    environment VARCHAR(50) DEFAULT 'production',
    payload     JSONB DEFAULT '{}',
    tg_username     VARCHAR(255),
    employeename    VARCHAR(255),
    tg_chat_id      VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_app_logs_timestamp ON app_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_app_logs_level ON app_logs (level);
CREATE INDEX IF NOT EXISTS idx_app_logs_tg_chat_id ON app_logs (tg_chat_id);
CREATE INDEX IF NOT EXISTS idx_app_logs_tg_username ON app_logs (tg_username);

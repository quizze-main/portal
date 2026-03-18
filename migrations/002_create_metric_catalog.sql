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

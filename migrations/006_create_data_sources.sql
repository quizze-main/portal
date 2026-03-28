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
    ('tracker', 'OverBrain Tracker', ARRAY['order_created', 'order_closed', 'visit_recorded']),
    ('manual', 'Manual Entry', ARRAY[]::TEXT[])
ON CONFLICT (id) DO NOTHING;

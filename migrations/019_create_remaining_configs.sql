-- Migration 019: Create remaining config tables
-- Replaces JSON file storage for KB providers, motivation configs, and app configs.

-- KB provider configs (replaces kb-providers.json)
CREATE TABLE IF NOT EXISTS kb_providers (
    id          TEXT PRIMARY KEY,
    type        TEXT NOT NULL,
    name        TEXT NOT NULL,
    config      JSONB NOT NULL DEFAULT '{}',
    enabled     BOOLEAN DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Motivation configs (replaces motivation-config.json)
CREATE TABLE IF NOT EXISTS motivation_configs (
    id              SERIAL PRIMARY KEY,
    key             TEXT NOT NULL UNIQUE,
    branch_id       TEXT NOT NULL,
    position_id     TEXT NOT NULL,
    tracker_store_id TEXT DEFAULT '',
    config          JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_motivation_configs_branch ON motivation_configs(branch_id, position_id);

-- Generic app config (replaces mission.json and other small configs)
CREATE TABLE IF NOT EXISTS app_configs (
    key         TEXT PRIMARY KEY,
    value       JSONB NOT NULL DEFAULT '{}',
    updated_at  TIMESTAMPTZ DEFAULT now()
);

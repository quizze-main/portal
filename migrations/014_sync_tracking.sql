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

-- Migration 018: Create KB bookmarks table
-- Bookmarks were previously stored in Frappe (loovis_kb_bookmark doctype).
-- Now PostgreSQL is the single source of truth.

CREATE TABLE IF NOT EXISTS kb_bookmarks (
    id          SERIAL PRIMARY KEY,
    employee_id TEXT NOT NULL REFERENCES dim_employees(id) ON DELETE CASCADE,
    article_id  TEXT NOT NULL,
    title       TEXT,
    created_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE (employee_id, article_id)
);

CREATE INDEX IF NOT EXISTS idx_kb_bookmarks_emp ON kb_bookmarks(employee_id);

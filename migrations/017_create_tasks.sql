-- Migration 017: Create tasks table
-- Tasks were previously stored in Frappe ERP only.
-- Now PostgreSQL is the single source of truth.

CREATE TABLE IF NOT EXISTS tasks (
    id                   TEXT PRIMARY KEY,
    subject              TEXT NOT NULL,
    description          TEXT DEFAULT '',
    status               TEXT NOT NULL DEFAULT 'Open'
                         CHECK (status IN ('Open','Working','Pending Review',
                                           'Completed','Cancelled','Template')),
    priority             TEXT DEFAULT 'Medium',
    assignee_employee_id TEXT REFERENCES dim_employees(id),
    author_employee_id   TEXT REFERENCES dim_employees(id),
    completed_on         TIMESTAMPTZ,
    created_at           TIMESTAMPTZ DEFAULT now(),
    updated_at           TIMESTAMPTZ DEFAULT now(),
    frappe_id            TEXT UNIQUE
);

CREATE SEQUENCE IF NOT EXISTS task_id_seq START WITH 1;

CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_employee_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_author ON tasks(author_employee_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_created ON tasks(created_at DESC);

-- Migration 020: Create file attachments table
-- Profile photos were previously uploaded to Frappe.
-- Now stored locally with metadata in PostgreSQL.

CREATE TABLE IF NOT EXISTS file_attachments (
    id          SERIAL PRIMARY KEY,
    employee_id TEXT NOT NULL REFERENCES dim_employees(id) ON DELETE CASCADE,
    file_name   TEXT NOT NULL,
    file_url    TEXT NOT NULL,
    file_type   TEXT DEFAULT 'image',
    file_size   INT,
    created_at  TIMESTAMPTZ DEFAULT now(),
    is_active   BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_file_att_emp ON file_attachments(employee_id);

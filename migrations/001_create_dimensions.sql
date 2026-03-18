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

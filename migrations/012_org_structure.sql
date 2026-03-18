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

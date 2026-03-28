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

-- User settings (replaces Frappe user settings DocType)
CREATE TABLE IF NOT EXISTS user_settings (
    employee_id TEXT NOT NULL REFERENCES dim_employees(id) ON DELETE CASCADE,
    variant     TEXT NOT NULL DEFAULT 'shared',  -- 'mobile_tg', 'desktop_tg', 'mobile_web', 'desktop_web', 'shared'
    settings    JSONB NOT NULL DEFAULT '{}',
    updated_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE (employee_id, variant)
);
CREATE INDEX IF NOT EXISTS idx_user_settings_emp ON user_settings(employee_id);

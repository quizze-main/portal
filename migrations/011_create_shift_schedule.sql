-- Shift schedule: one entry per employee per day
CREATE TABLE IF NOT EXISTS shift_entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id     TEXT NOT NULL,
    branch_id       TEXT NOT NULL,
    date            DATE NOT NULL,
    shift_type      TEXT NOT NULL CHECK (shift_type IN (
        'work', 'day_off', 'vacation', 'sick',
        'extra_shift', 'day_off_lieu', 'absent'
    )),
    shift_number    SMALLINT,
    time_start      TIME,
    time_end        TIME,
    note            TEXT DEFAULT '',
    created_by      TEXT,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE (employee_id, date)
);

CREATE INDEX IF NOT EXISTS idx_shift_branch_date ON shift_entries(branch_id, date);
CREATE INDEX IF NOT EXISTS idx_shift_employee_date ON shift_entries(employee_id, date);

-- Reusable schedule templates (2/2, 5/2, custom)
CREATE TABLE IF NOT EXISTS shift_templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    pattern_type    TEXT NOT NULL CHECK (pattern_type IN ('2/2', '5/2', 'custom')),
    cycle_days      JSONB NOT NULL,
    branch_id       TEXT,
    created_by      TEXT,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Seed default templates
INSERT INTO shift_templates (id, name, pattern_type, cycle_days) VALUES
  (gen_random_uuid(), '2/2 (10:00–19:00)', '2/2', '[
    {"shift_type":"work","shift_number":1,"time_start":"10:00","time_end":"19:00"},
    {"shift_type":"work","shift_number":1,"time_start":"10:00","time_end":"19:00"},
    {"shift_type":"day_off"},
    {"shift_type":"day_off"}
  ]'::jsonb),
  (gen_random_uuid(), '2/2 (11:00–20:00)', '2/2', '[
    {"shift_type":"work","shift_number":1,"time_start":"11:00","time_end":"20:00"},
    {"shift_type":"work","shift_number":1,"time_start":"11:00","time_end":"20:00"},
    {"shift_type":"day_off"},
    {"shift_type":"day_off"}
  ]'::jsonb),
  (gen_random_uuid(), '5/2 (10:00–18:00)', '5/2', '[
    {"shift_type":"work","shift_number":1,"time_start":"10:00","time_end":"18:00"},
    {"shift_type":"work","shift_number":1,"time_start":"10:00","time_end":"18:00"},
    {"shift_type":"work","shift_number":1,"time_start":"10:00","time_end":"18:00"},
    {"shift_type":"work","shift_number":1,"time_start":"10:00","time_end":"18:00"},
    {"shift_type":"work","shift_number":1,"time_start":"10:00","time_end":"18:00"},
    {"shift_type":"day_off"},
    {"shift_type":"day_off"}
  ]'::jsonb)
ON CONFLICT DO NOTHING;

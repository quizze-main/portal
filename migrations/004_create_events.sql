-- Migration 004: Event store (core of data platform)

CREATE TABLE IF NOT EXISTS events (
    id              BIGSERIAL PRIMARY KEY,
    event_type      TEXT NOT NULL,
    event_time      TIMESTAMPTZ NOT NULL,
    received_at     TIMESTAMPTZ DEFAULT now(),

    -- Three dimensions (all nullable)
    branch_id       TEXT,
    employee_id     TEXT,
    client_id       TEXT,

    -- Source tracking
    source_id       TEXT NOT NULL,
    external_id     TEXT,

    -- Metric values from event
    metric_values   JSONB NOT NULL DEFAULT '{}',

    -- Full payload for reprocessing
    raw_payload     JSONB,

    processed       BOOLEAN DEFAULT false,
    processed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_events_type_time ON events(event_type, event_time);
CREATE INDEX IF NOT EXISTS idx_events_branch ON events(branch_id, event_time) WHERE branch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_employee ON events(employee_id, event_time) WHERE employee_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_client ON events(client_id, event_time) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_dedup ON events(source_id, external_id);
CREATE INDEX IF NOT EXISTS idx_events_received ON events(received_at);

-- Event types registry
CREATE TABLE IF NOT EXISTS event_types (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    description     TEXT,
    schema          JSONB,
    source_types    TEXT[] DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT now()
);

INSERT INTO event_types (id, name, description) VALUES
    ('order_created', 'Заказ создан', 'Новый заказ создан в CRM'),
    ('order_status_changed', 'Статус заказа изменён', 'Заказ перешёл в новый статус'),
    ('order_closed', 'Заказ закрыт', 'Заказ успешно закрыт'),
    ('order_cancelled', 'Заказ отменён', 'Заказ отменён клиентом или менеджером'),
    ('order_returned', 'Возврат', 'Оформлен возврат по заказу'),
    ('visit_recorded', 'Визит клиента', 'Визит клиента в филиал'),
    ('payment_received', 'Оплата', 'Получена оплата')
ON CONFLICT (id) DO NOTHING;

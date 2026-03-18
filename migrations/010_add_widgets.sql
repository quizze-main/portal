-- Dashboard widgets table (rankings, charts, funnels, etc.)
CREATE TABLE IF NOT EXISTS dashboard_widgets (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('ranking')),
  name TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  parent_id TEXT DEFAULT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default ranking widgets
INSERT INTO dashboard_widgets (id, type, name, display_order, config) VALUES
  ('ranking_branches', 'ranking', 'Рейтинг филиалов', 100, '{"entityType":"branch","metricCodes":["revenue_created","revenue_closed","frames_count","conversion_rate","csi","avg_glasses_price","margin_rate","avg_repaires_price"],"lossConfig":{"mode":"metric","metricCode":"revenue_created","formula":""}}'),
  ('ranking_managers', 'ranking', 'Рейтинг менеджеров', 200, '{"entityType":"manager","metricCodes":["revenue_created","revenue_closed","frames_count","avg_glasses_price","conversion_rate","csi","margin_rate"],"lossConfig":{"mode":"metric","metricCode":"revenue_created","formula":""}}')
ON CONFLICT (id) DO NOTHING;

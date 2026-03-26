/**
 * Seed script for Staff Focus App.
 * Creates test data for all tables required for normal app operation.
 * Idempotent: safe to run multiple times (uses ON CONFLICT DO NOTHING).
 *
 * Usage: npx prisma db seed
 */
import 'dotenv/config';
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 2,
});

// Dynamic current period
const now = new Date();
const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

async function seed() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    console.log(`Seeding database for period ${currentPeriod}...`);

    // ─── Phase 1: Reference data (idempotent re-inserts from baseline) ──────

    await client.query(`
      INSERT INTO rbac_roles (id, name, description, level) VALUES
        ('LIS-R-00000', 'Стандарт', 'Standard access — own store only', 0),
        ('LIS-R-00001', 'Менеджер', 'Manager — single or multi-store access', 1)
      ON CONFLICT (id) DO NOTHING
    `);
    console.log('  rbac_roles: OK');

    await client.query(`
      INSERT INTO event_types (id, name, description) VALUES
        ('order_created', 'Заказ создан', 'Новый заказ создан в CRM'),
        ('order_status_changed', 'Статус заказа изменён', 'Заказ перешёл в новый статус'),
        ('order_closed', 'Заказ закрыт', 'Заказ успешно закрыт'),
        ('order_cancelled', 'Заказ отменён', 'Заказ отменён клиентом или менеджером'),
        ('order_returned', 'Возврат', 'Оформлен возврат по заказу'),
        ('visit_recorded', 'Визит клиента', 'Визит клиента в филиал'),
        ('payment_received', 'Оплата', 'Получена оплата')
      ON CONFLICT (id) DO NOTHING
    `);
    console.log('  event_types: OK');

    await client.query(`
      INSERT INTO adapter_registry (id, name, supported_events) VALUES
        ('amocrm', 'amoCRM', ARRAY['order_created', 'order_status_changed', 'order_closed']),
        ('tracker', 'Loovis Tracker', ARRAY['order_created', 'order_closed', 'visit_recorded']),
        ('manual', 'Manual Entry', ARRAY[]::TEXT[])
      ON CONFLICT (id) DO NOTHING
    `);
    console.log('  adapter_registry: OK');

    await client.query(`
      INSERT INTO rbac_feature_flags (flag_name, scope_type, scope_value) VALUES
        ('new_dashboard', 'store_id', '1000000008'),
        ('new_dashboard', 'store_id', '1000000052'),
        ('new_dashboard', 'store_id', '1000000009'),
        ('full_dashboard_access', 'store_id', '1000000009')
      ON CONFLICT (flag_name, scope_type, scope_value) DO NOTHING
    `);
    console.log('  rbac_feature_flags: OK');

    await client.query(`
      INSERT INTO dashboard_widgets (id, type, name, display_order, config) VALUES
        ('ranking_branches', 'ranking', 'Рейтинг филиалов', 100,
         '{"entityType":"branch","metricCodes":["revenue_created","revenue_closed","frames_count","conversion_rate","csi","avg_glasses_price","margin_rate","avg_repaires_price"],"lossConfig":{"mode":"metric","metricCode":"revenue_created","formula":""}}'),
        ('ranking_managers', 'ranking', 'Рейтинг менеджеров', 200,
         '{"entityType":"manager","metricCodes":["revenue_created","revenue_closed","frames_count","avg_glasses_price","conversion_rate","csi","margin_rate"],"lossConfig":{"mode":"metric","metricCode":"revenue_created","formula":""}}')
      ON CONFLICT (id) DO NOTHING
    `);
    console.log('  dashboard_widgets: OK');

    // ─── Phase 2: Org structure ─────────────────────────────────────────────

    await client.query(`
      INSERT INTO org_networks (id, name, enabled) VALUES
        ('loov-network', 'LoovIS', true)
      ON CONFLICT (id) DO NOTHING
    `);
    console.log('  org_networks: OK');

    await client.query(`
      INSERT INTO dim_branches (id, name, code, city, timezone, enabled, network_id, store_id) VALUES
        ('branch-spb', 'Клуб СПб', 'SPB', 'Санкт-Петербург', 'Europe/Moscow', true, 'loov-network', '1000000008'),
        ('branch-msk', 'Клуб Москва', 'MSK', 'Москва', 'Europe/Moscow', true, 'loov-network', '1000000052'),
        ('branch-klg', 'Клуб Калининград', 'KLG', 'Калининград', 'Europe/Kaliningrad', true, 'loov-network', '1000000009')
      ON CONFLICT (id) DO NOTHING
    `);
    console.log('  dim_branches: OK');

    await client.query(`
      INSERT INTO org_designations (name, category, is_leader) VALUES
        ('Руководитель клуба', 'management', true),
        ('Руководитель клиники', 'management', true),
        ('Старший менеджер', 'sales', false),
        ('Менеджер-консультант', 'sales', false),
        ('Менеджер заботы', 'care', false),
        ('Оптометрист', 'medical', false)
      ON CONFLICT (name) DO NOTHING
    `);
    console.log('  org_designations: OK');

    await client.query(`
      INSERT INTO org_departments (id, department_name, branch_id, store_id, enabled) VALUES
        ('dept-spb', 'Клуб СПб - LR', 'branch-spb', '1000000008', true),
        ('dept-msk', 'Клуб Москва - LR', 'branch-msk', '1000000052', true),
        ('dept-klg', 'Клуб Калининград - LR', 'branch-klg', '1000000009', true)
      ON CONFLICT (id) DO NOTHING
    `);
    console.log('  org_departments: OK');

    // ─── Phase 3: Employees ─────────────────────────────────────────────────

    await client.query(`
      INSERT INTO dim_employees (id, name, employee_name, first_name, tg_username, designation, department, department_id, branch_id, status, enabled) VALUES
        ('HR-EMP-00001', 'Федулов Дмитрий',   'Федулов Дмитрий',   'Дмитрий',  'fedulovdm',  'Руководитель клуба',    'dept-spb', 'dept-spb', 'branch-spb', 'Active', true),
        ('HR-EMP-00002', 'Иванова Анна',       'Иванова Анна',       'Анна',     'ivanovaa',   'Старший менеджер',      'dept-spb', 'dept-spb', 'branch-spb', 'Active', true),
        ('HR-EMP-00003', 'Петров Сергей',      'Петров Сергей',      'Сергей',   'petrovs',    'Менеджер-консультант',  'dept-spb', 'dept-spb', 'branch-spb', 'Active', true),
        ('HR-EMP-00004', 'Сидорова Елена',     'Сидорова Елена',     'Елена',    'sidorovae',  'Оптометрист',           'dept-spb', 'dept-spb', 'branch-spb', 'Active', true),
        ('HR-EMP-00005', 'Козлов Алексей',     'Козлов Алексей',     'Алексей',  'kozlova',    'Руководитель клуба',    'dept-msk', 'dept-msk', 'branch-msk', 'Active', true),
        ('HR-EMP-00006', 'Морозова Ольга',     'Морозова Ольга',     'Ольга',    'morozovao',  'Менеджер-консультант',  'dept-msk', 'dept-msk', 'branch-msk', 'Active', true),
        ('HR-EMP-00007', 'Новиков Игорь',      'Новиков Игорь',      'Игорь',    'novikovi',   'Менеджер заботы',       'dept-msk', 'dept-msk', 'branch-msk', 'Active', true),
        ('HR-EMP-00008', 'Волкова Мария',      'Волкова Мария',      'Мария',    'volkovam',   'Руководитель клиники',  'dept-klg', 'dept-klg', 'branch-klg', 'Active', true),
        ('HR-EMP-00009', 'Соколов Андрей',     'Соколов Андрей',     'Андрей',   'sokolova',   'Менеджер-консультант',  'dept-klg', 'dept-klg', 'branch-klg', 'Active', true),
        ('HR-EMP-00010', 'Лебедева Татьяна',   'Лебедева Татьяна',   'Татьяна',  'lebedevat',  'Менеджер заботы',       'dept-klg', 'dept-klg', 'branch-klg', 'Active', true)
      ON CONFLICT (id) DO NOTHING
    `);

    // Set reports_to hierarchy
    await client.query(`
      UPDATE dim_employees SET reports_to = 'HR-EMP-00001' WHERE id IN ('HR-EMP-00002', 'HR-EMP-00003', 'HR-EMP-00004') AND reports_to IS NULL;
      UPDATE dim_employees SET reports_to = 'HR-EMP-00005' WHERE id IN ('HR-EMP-00006', 'HR-EMP-00007') AND reports_to IS NULL;
      UPDATE dim_employees SET reports_to = 'HR-EMP-00008' WHERE id IN ('HR-EMP-00009', 'HR-EMP-00010') AND reports_to IS NULL;
    `);
    console.log('  dim_employees: OK (10 records)');

    // ─── Phase 4: RBAC assignments ──────────────────────────────────────────

    await client.query(`
      INSERT INTO rbac_employee_roles (employee_id, role_id, source) VALUES
        ('HR-EMP-00001', 'LIS-R-00001', 'seed'),
        ('HR-EMP-00002', 'LIS-R-00000', 'seed'),
        ('HR-EMP-00003', 'LIS-R-00000', 'seed'),
        ('HR-EMP-00004', 'LIS-R-00000', 'seed'),
        ('HR-EMP-00005', 'LIS-R-00001', 'seed'),
        ('HR-EMP-00006', 'LIS-R-00000', 'seed'),
        ('HR-EMP-00007', 'LIS-R-00000', 'seed'),
        ('HR-EMP-00008', 'LIS-R-00001', 'seed'),
        ('HR-EMP-00009', 'LIS-R-00000', 'seed'),
        ('HR-EMP-00010', 'LIS-R-00000', 'seed')
      ON CONFLICT (employee_id, role_id) DO NOTHING
    `);
    console.log('  rbac_employee_roles: OK');

    await client.query(`
      INSERT INTO rbac_store_access (employee_id, store_id, department_id, source) VALUES
        ('HR-EMP-00001', '1000000008', 'dept-spb', 'seed'),
        ('HR-EMP-00001', '1000000052', 'dept-msk', 'seed'),
        ('HR-EMP-00001', '1000000009', 'dept-klg', 'seed'),
        ('HR-EMP-00002', '1000000008', 'dept-spb', 'seed'),
        ('HR-EMP-00003', '1000000008', 'dept-spb', 'seed'),
        ('HR-EMP-00004', '1000000008', 'dept-spb', 'seed'),
        ('HR-EMP-00005', '1000000052', 'dept-msk', 'seed'),
        ('HR-EMP-00006', '1000000052', 'dept-msk', 'seed'),
        ('HR-EMP-00007', '1000000052', 'dept-msk', 'seed'),
        ('HR-EMP-00008', '1000000009', 'dept-klg', 'seed'),
        ('HR-EMP-00009', '1000000009', 'dept-klg', 'seed'),
        ('HR-EMP-00010', '1000000009', 'dept-klg', 'seed')
      ON CONFLICT (employee_id, store_id) DO NOTHING
    `);
    console.log('  rbac_store_access: OK');

    // ─── Phase 5: Metrics ───────────────────────────────────────────────────

    await client.query(`
      INSERT INTO metric_definitions (id, name, unit, metric_type, value_type, aggregation_method, widget_type, forecast_label, forecast_unit, color, source_type, tracker_code, display_order, threshold_critical, threshold_good, loss_mode, enabled) VALUES
        ('revenue_created',    'Выручка СЗ',              '₽',  'absolute',   'currency',   'sum',            'kpi_forecast',  'forecast',  '%', '#3B82F6', 'tracker', 'revenue_created',    0, 70,  95, 'tracker', true),
        ('revenue_closed',     'Выручка ЗЗ',              '₽',  'absolute',   'currency',   'sum',            'kpi_forecast',  'forecast',  '%', '#06B6D4', 'tracker', 'revenue_closed',     1, 70,  95, 'tracker', true),
        ('frames_count',       'Кол-во ФЛ',               'шт', 'absolute',   'count',      'sum',            'kpi_forecast',  'forecast',  '%', '#8B5CF6', 'tracker', 'frames_count',       2, 70,  95, 'tracker', true),
        ('conversion_rate',    'Конверсия',                '%',  'averaged',   'percentage', 'simple_average', 'kpi_deviation', 'deviation', '%', '#10B981', 'tracker', 'conversion_rate',    3, -5,   5, 'tracker', true),
        ('csi',                'CSI',                      '%',  'averaged',   'percentage', 'simple_average', 'kpi_deviation', 'deviation', '%', '#F59E0B', 'tracker', 'csi',                4, -5,   5, 'tracker', true),
        ('avg_glasses_price',  'Ср. стоимость очков',      '₽',  'averaged',   'currency',   'simple_average', 'kpi_deviation', 'deviation', '%', '#EF4444', 'tracker', 'avg_glasses_price',  5, -5,   5, 'tracker', true),
        ('margin_rate',        'Маржинальность',           '₽',  'averaged',   'currency',   'simple_average', 'kpi_deviation', 'deviation', '%', '#EC4899', 'tracker', 'margin_rate',        6, -5,   5, 'tracker', true),
        ('avg_repaires_price', 'Ср. стоимость ремонтов',   '₽',  'averaged',   'currency',   'simple_average', 'kpi_deviation', 'deviation', '%', '#6366F1', 'tracker', 'avg_repaires_price', 7, -5,   5, 'tracker', true)
      ON CONFLICT (id) DO NOTHING
    `);
    console.log('  metric_definitions: OK (8 metrics)');

    // Metric plans — one per metric × branch for current month
    const branches = [
      { id: 'branch-spb', plans: { revenue_created: 5000000, revenue_closed: 4500000, frames_count: 150, conversion_rate: 45, csi: 92, avg_glasses_price: 15000, margin_rate: 45, avg_repaires_price: 3500 } },
      { id: 'branch-msk', plans: { revenue_created: 7000000, revenue_closed: 6500000, frames_count: 200, conversion_rate: 48, csi: 93, avg_glasses_price: 18000, margin_rate: 47, avg_repaires_price: 4000 } },
      { id: 'branch-klg', plans: { revenue_created: 3000000, revenue_closed: 2800000, frames_count: 100, conversion_rate: 42, csi: 90, avg_glasses_price: 12000, margin_rate: 43, avg_repaires_price: 3000 } },
    ];

    for (const branch of branches) {
      for (const [metricId, planValue] of Object.entries(branch.plans)) {
        await client.query(`
          INSERT INTO metric_plans (metric_id, scope, scope_id, period, plan_value)
          VALUES ($1, 'branch', $2, $3, $4)
          ON CONFLICT (metric_id, scope, scope_id, period) DO NOTHING
        `, [metricId, branch.id, currentPeriod, planValue]);
      }
    }
    console.log('  metric_plans: OK (24 plans)');

    // Metric snapshots — facts at 80-110% of plan
    const factMultipliers = [
      { id: 'branch-spb', mult: { revenue_created: 0.76, revenue_closed: 0.80, frames_count: 0.79, conversion_rate: 0.97, csi: 0.99, avg_glasses_price: 0.95, margin_rate: 0.98, avg_repaires_price: 0.96 } },
      { id: 'branch-msk', mult: { revenue_created: 0.80, revenue_closed: 0.80, frames_count: 0.81, conversion_rate: 1.03, csi: 1.01, avg_glasses_price: 1.03, margin_rate: 1.02, avg_repaires_price: 1.04 } },
      { id: 'branch-klg', mult: { revenue_created: 0.80, revenue_closed: 0.82, frames_count: 0.82, conversion_rate: 0.95, csi: 0.99, avg_glasses_price: 0.98, margin_rate: 0.97, avg_repaires_price: 0.95 } },
    ];

    for (const branch of factMultipliers) {
      const plans = branches.find(b => b.id === branch.id).plans;
      for (const [metricId, mult] of Object.entries(branch.mult)) {
        const factValue = Math.round(plans[metricId] * mult * 100) / 100;
        await client.query(`
          INSERT INTO metric_snapshots (metric_id, branch_id, employee_id, client_id, period_type, period_key, fact_value, plan_value, sample_count, source)
          VALUES ($1, $2, NULL, NULL, 'month', $3, $4, $5, 26, 'seed')
          ON CONFLICT (metric_id, branch_id, employee_id, client_id, period_type, period_key) DO NOTHING
        `, [metricId, branch.id, currentPeriod, factValue, plans[metricId]]);
      }
    }
    console.log('  metric_snapshots: OK (24 snapshots)');

    // ─── Phase 6: Events ────────────────────────────────────────────────────

    const eventData = [
      { type: 'order_created',   branchId: 'branch-spb', employeeId: 'HR-EMP-00002', day: 2,  values: { amount: 25000, items_count: 1 } },
      { type: 'order_created',   branchId: 'branch-spb', employeeId: 'HR-EMP-00003', day: 4,  values: { amount: 18000, items_count: 1 } },
      { type: 'order_created',   branchId: 'branch-msk', employeeId: 'HR-EMP-00006', day: 5,  values: { amount: 32000, items_count: 2 } },
      { type: 'order_closed',    branchId: 'branch-spb', employeeId: 'HR-EMP-00002', day: 6,  values: { amount: 25000, revenue: 25000 } },
      { type: 'order_closed',    branchId: 'branch-spb', employeeId: 'HR-EMP-00003', day: 8,  values: { amount: 18000, revenue: 18000 } },
      { type: 'order_closed',    branchId: 'branch-msk', employeeId: 'HR-EMP-00006', day: 9,  values: { amount: 32000, revenue: 32000 } },
      { type: 'visit_recorded',  branchId: 'branch-spb', employeeId: 'HR-EMP-00002', day: 3,  values: {} },
      { type: 'visit_recorded',  branchId: 'branch-msk', employeeId: 'HR-EMP-00006', day: 7,  values: {} },
      { type: 'visit_recorded',  branchId: 'branch-klg', employeeId: 'HR-EMP-00009', day: 10, values: {} },
      { type: 'payment_received', branchId: 'branch-spb', employeeId: 'HR-EMP-00002', day: 11, values: { amount: 25000 } },
      { type: 'payment_received', branchId: 'branch-msk', employeeId: 'HR-EMP-00006', day: 12, values: { amount: 32000 } },
      { type: 'order_created',   branchId: 'branch-klg', employeeId: 'HR-EMP-00009', day: 14, values: { amount: 15000, items_count: 1 } },
      { type: 'order_closed',    branchId: 'branch-klg', employeeId: 'HR-EMP-00009', day: 16, values: { amount: 15000, revenue: 15000 } },
      { type: 'order_created',   branchId: 'branch-spb', employeeId: 'HR-EMP-00003', day: 18, values: { amount: 42000, items_count: 3 } },
      { type: 'order_closed',    branchId: 'branch-msk', employeeId: 'HR-EMP-00006', day: 20, values: { amount: 28000, revenue: 28000 } },
    ];

    for (let i = 0; i < eventData.length; i++) {
      const evt = eventData[i];
      const eventTime = new Date(now.getFullYear(), now.getMonth(), evt.day, 10 + (i % 8), i * 7 % 60);
      const extId = `seed-evt-${String(i + 1).padStart(3, '0')}`;

      // Check if event already exists (no unique constraint on source_id+external_id)
      const existing = await client.query(
        `SELECT 1 FROM events WHERE source_id = 'seed' AND external_id = $1 LIMIT 1`,
        [extId]
      );
      if (existing.rows.length === 0) {
        await client.query(`
          INSERT INTO events (event_type, event_time, branch_id, employee_id, source_id, external_id, metric_values, processed)
          VALUES ($1, $2, $3, $4, 'seed', $5, $6, true)
        `, [evt.type, eventTime.toISOString(), evt.branchId, evt.employeeId, extId, JSON.stringify(evt.values)]);
      }
    }
    console.log('  events: OK (15 events)');

    // ─── Phase 7: Sync state ────────────────────────────────────────────────

    await client.query(`
      INSERT INTO sync_state (entity_type, last_sync, record_count)
      VALUES ('employees', now(), 10)
      ON CONFLICT (entity_type) DO UPDATE SET last_sync = now(), record_count = 10
    `);
    console.log('  sync_state: OK');

    await client.query('COMMIT');
    console.log('\nSeed completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

seed()
  .then(() => pool.end())
  .catch((error) => {
    console.error(error);
    pool.end();
    process.exit(1);
  });

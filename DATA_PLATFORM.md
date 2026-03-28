# Дата-платформа Staff Focus App

> Технический документ для CTO. Описывает текущее состояние, архитектуру, решения по требованиям и план дальнейших работ.

---

## Содержание

- [1. Исходное состояние (до работ)](#1-исходное-состояние-до-работ)
- [2. Что реализовано (Фазы 1–4)](#2-что-реализовано-фазы-14)
  - [2.1. Инвентаризация файлов](#21-инвентаризация-файлов)
  - [2.2. PostgreSQL Schema](#22-postgresql-schema)
  - [2.3. Новые API endpoints](#23-новые-api-endpoints)
- [3. Решения по требованиям CTO](#3-решения-по-требованиям-cto)
  - [3.1. Три измерения: филиал, менеджер, клиент](#31-три-измерения-филиал-менеджер-клиент)
  - [3.2. Абсолютные и усреднённые метрики](#32-абсолютные-и-усреднённые-метрики)
  - [3.3. Динамический дневной план](#33-динамический-дневной-план)
  - [3.4. Группировка по периодам](#34-группировка-по-периодам)
  - [3.5. Событийная модель](#35-событийная-модель)
  - [3.6. CRM-адаптеры и AI-генерация](#36-crm-адаптеры-и-ai-генерация)
  - [3.7. Дата-платформа (PostgreSQL вместо JSON)](#37-дата-платформа-postgresql-вместо-json)
  - [3.8. Масштабируемость](#38-масштабируемость)
  - [3.9. Аналитика (Materialized Views)](#39-аналитика-materialized-views)
  - [3.10. Экспорт данных](#310-экспорт-данных)
- [4. Архитектура](#4-архитектура)
  - [4.1. Слои системы](#41-слои-системы)
  - [4.2. Star Schema](#42-star-schema)
  - [4.3. Data Flow](#43-data-flow)
  - [4.4. Graceful Degradation](#44-graceful-degradation)
- [5. Что ещё необходимо сделать](#5-что-ещё-необходимо-сделать)
  - [Фаза 5. Интеграция и production](#фаза-5-интеграция-и-production)
  - [Фаза 6. Фронтенд](#фаза-6-фронтенд)
  - [Фаза 7. AI-генерация адаптеров](#фаза-7-ai-генерация-адаптеров)
  - [Фаза 8. ClickHouse](#фаза-8-clickhouse-при-необходимости)
- [6. Верификация](#6-верификация)
- [7. Карта файлов](#7-карта-файлов)

---

# 1. Исходное состояние (до работ)

## Хранение данных

7 JSON-файлов в `data/`:

| Файл | Содержимое |
|------|-----------|
| `dashboard-metrics.json` | Каталог метрик (определения, виджеты, пороги) |
| `metric-plans.json` | Планы по метрикам (employee/branch/network × period) |
| `data-sources.json` | Конфигурация внешних API (amoCRM, Tracker) |
| `salary-configs.json` | Зарплатные конфигурации (branch × position) |
| `salary-sessions.json` | Сессии расчёта зарплат |
| `branches.json` | Справочник филиалов |
| `employees.json` | Справочник сотрудников |

**Критический баг**: В production Docker `volumes: []` — при рестарте контейнера все runtime-записи в JSON терялись.

## Что уже работало хорошо (оставлено без изменений)

| Компонент | Файл |
|-----------|------|
| Типы метрик: `absolute`, `averaged`, `percentage`, `computed` | `internalApiClient.ts` |
| Единицы: `currency`, `count`, `percentage`, `ratio`, `duration`, `score` | `internalApiClient.ts` |
| Field mappings: branch, employee, department, designation, custom | `internalApiClient.ts` |
| Иерархическое разрешение планов: employee → branch → network | `metric-plans-api.js` |
| External API абстракция: auth, pagination, JSONPath | `data-sources.js` |
| Source discovery: amoCRM, Tracker | `source-discovery.js` |
| Formula engine: computed-метрики с DAG | `formula-engine.js` |
| Redis кэширование: 5min TTL, graceful degradation | `cache.js` |

## Что отсутствовало (6 пробелов)

1. **Дата-платформа** — JSON без ACID, без индексов, потеря данных в prod
2. **Событийная модель** — нет приёма событий из CRM, только pull
3. **Движок группировки** — нет группировки для manual/external_api источников
4. **Клиентское измерение** — CTO: «привязано к филиалу, менеджеру, клиенту» — клиента не было
5. **Динамический дневной план** — статическое пропорционирование вместо `(план - факт) / дней`
6. **CRM-адаптеры** — нет формального контракта, AI не может генерировать адаптеры

---

# 2. Что реализовано (Фазы 1–4)

Общий объём: **~5 100 строк** нового кода в **19 файлах** + изменения в **8 существующих**. Билд проходит без ошибок.

## 2.1. Инвентаризация файлов

### Фаза 1 — PostgreSQL Foundation

| Файл | Строк | Назначение |
|------|-------|-----------|
| `src/server/db.js` | 89 | Connection pool, `initDatabase()`, `isDbConnected()`, `query()` |
| `migrations/001_create_dimensions.sql` | — | `dim_branches`, `dim_employees`, `dim_clients`, `dim_calendar` |
| `migrations/002_create_metric_catalog.sql` | — | `metric_definitions`, `metric_field_mappings` |
| `migrations/003_create_plans.sql` | — | `metric_plans` |
| `migrations/004_create_events.sql` | — | `events`, `event_types` (7 предустановленных типов) |
| `migrations/005_create_snapshots.sql` | — | `metric_snapshots`, `manual_metric_data` |
| `migrations/006_create_data_sources.sql` | — | `data_sources`, `adapter_registry` |
| `migrations/007_create_salary.sql` | — | `salary_configs`, `salary_sessions` |
| `scripts/run-migrations.js` | 86 | Идемпотентный запуск SQL-миграций (таблица `_migrations`) |
| `scripts/migrate-json-to-pg.js` | 228 | Одноразовый перенос данных из JSON в PostgreSQL |

### Фаза 2 — Event Engine + Grouping + Dynamic Plans

| Файл | Строк | Назначение |
|------|-------|-----------|
| `src/server/aggregation-engine.js` | 236 | SQL-группировка по 7 типам периодов (day/week/dekada/month/quarter/year/client) |
| `src/server/plan-engine.js` | 191 | Динамический дневной план с иерархическим разрешением |
| `src/server/event-ingestion.js` | 326 | Webhook handler, дедупликация, 5 API-маршрутов |

### Фаза 3 — CRM Adapter Framework

| Файл | Строк | Назначение |
|------|-------|-----------|
| `src/server/adapters/types.ts` | 107 | Интерфейсы `CRMAdapter`, `IncomingEvent`, `DiscoveryResult` |
| `src/server/adapters/base-adapter.js` | 122 | Базовый класс с default-реализациями |
| `src/server/adapters/amocrm-adapter.js` | 246 | amoCRM: discover + transformWebhook + poll |
| `src/server/adapters/tracker-adapter.js` | 77 | OverBrain Tracker: 8 предустановленных метрик |
| `src/server/adapters/custom-adapter.js` | 190 | VM sandbox (5s timeout) для AI-генерируемого кода |
| `src/server/adapters/adapter-loader.js` | 162 | Фабрика + авто-детект типа + кэш инстансов |
| `src/server/adapters/polling-scheduler.js` | 163 | Фоновый polling (30s цикл, 60s мин. интервал) |

### Фаза 4 — Analytics + Export

| Файл | Строк | Назначение |
|------|-------|-----------|
| `migrations/008_create_analytics_views.sql` | 99 | 4 materialized views + таблица refresh log |
| `src/server/analytics-views.js` | 296 | MV refresh scheduler + time-series запросы |
| `src/server/export-engine.js` | 263 | CSV-экспорт: метрики, события, месячный отчёт |

### Изменённые файлы

| Файл | Изменения |
|------|----------|
| `server.js` | `initDatabase()`, `startPollingScheduler()`, `startViewRefreshScheduler()`, graceful shutdown |
| `src/server/internal-api.js` | +19 API endpoints; `forecastLabel='remaining'` по умолчанию для absolute |
| `src/server/source-discovery.js` | Делегирование к адаптерам через `getAdapter()`, fallback на legacy |
| `src/lib/internalApiClient.ts` | +20 методов; `'client'` entity type; `'remaining'` forecastLabel |
| `docker-compose.yml` (+4 варианта) | PostgreSQL сервис, volumes, healthcheck, depends_on |
| `package.json` | Зависимость `pg` |
| `env.example` | `DATABASE_URL`, `POSTGRES_USER`, `POSTGRES_PASSWORD` |

## 2.2. PostgreSQL Schema

**15 таблиц + 4 materialized views + 1 view:**

### Dimension-таблицы (справочники)

```
dim_branches     — id, name, code, city, region, timezone, enabled, metadata JSONB
dim_employees    — id, name, branch_id FK, department, designation, frappe_user, tg_chat_id
dim_clients      — id, external_id, source_id, name, branch_id FK, employee_id FK, client_type, metadata JSONB
dim_calendar     — VIEW: date → year, month, quarter, month_key, quarter_key, week_key, dekada (1/2/3), is_working_day
```

### Каталог метрик (заменяет `dashboard-metrics.json`)

```
metric_definitions — ~30 полей:
  Классификация:   metric_type (absolute|averaged|percentage|computed), value_type, aggregation_method
  План:            plan_period, plan_prorate_method (working_days|calendar_days)
  Виджет:          widget_type, forecast_label, forecast_unit, color, decimal_places, display_order
  Пороги:          threshold_critical, threshold_good
  Источник:        source_type (event|tracker|external_api|manual|computed), data_source_id, tracker_code
  External API:    external_path, external_query_params JSONB, json_path_fact, json_path_plan
  Формулы:         formula, formula_dependencies TEXT[]

metric_field_mappings — metric_id × entity_type (branch|employee|department|designation|custom|client) × api_field → values JSONB
```

### Планы (заменяет `metric-plans.json`)

```
metric_plans — metric_id, scope (network|branch|employee|client), scope_id, period (YYYY-MM), plan_value
               UNIQUE (metric_id, scope, scope_id, period)
```

### Event Store (новое)

```
events — event_type, event_time TIMESTAMPTZ,
         branch_id, employee_id, client_id (все nullable),
         source_id, external_id (дедупликация: UNIQUE source_id+external_id),
         metric_values JSONB ({"revenue": 15000, "items_count": 2}),
         raw_payload JSONB, processed BOOLEAN

event_types — id, name, description, schema JSONB
              7 предустановленных: order_created, order_status_changed, order_closed,
              order_cancelled, order_returned, visit_recorded, payment_received
```

### Снимки метрик (кэш агрегаций)

```
metric_snapshots — metric_id, branch_id, employee_id, client_id,
                   period_type (day|week|dekada|month|quarter|year), period_key,
                   fact_value, plan_value, sample_count
                   UNIQUE (metric_id, branch_id, employee_id, client_id, period_type, period_key)

manual_metric_data — metric_id, period, branch_id, employee_id, client_id, fact_value, plan_value
```

### Data Sources и адаптеры (заменяет `data-sources.json`)

```
data_sources     — id, label, base_url, auth_type, auth_config JSONB,
                   adapter_type, adapter_config JSONB, webhook_secret,
                   poll_interval_s, last_poll_at, field_mappings JSONB

adapter_registry — id, name, version, input_schema JSONB, output_schema JSONB,
                   supported_events TEXT[], adapter_code TEXT (JS-код),
                   ai_generated BOOLEAN, ai_prompt TEXT
```

### Зарплаты (заменяет `salary-configs.json` + `salary-sessions.json`)

```
salary_configs  — branch_id, position_id, base_salary, matrix JSONB, kpis JSONB
salary_sessions — branch_id, period, club_percent, employees JSONB
```

### Materialized Views

```
mv_monthly_by_branch    — metric_id × branch_id × month_key → fact_value, sample_count, day_count
mv_monthly_by_employee  — metric_id × employee_id × month_key → fact_value, sample_count, day_count
mv_daily_events         — event_type × branch_id × event_date → event_count, total_revenue, total_items
mv_quarterly_by_branch  — metric_id × branch_id × quarter_key → fact_value, sample_count, day_count

_materialized_view_refresh_log — view_name, last_refresh, duration_ms, row_count
```

### Индексы

```
idx_emp_branch          — dim_employees(branch_id)
idx_clients_branch      — dim_clients(branch_id)
idx_clients_source      — dim_clients(source_id, external_id)
idx_events_type_time    — events(event_type, event_time)
idx_events_branch       — events(branch_id, event_time) WHERE branch_id IS NOT NULL
idx_events_employee     — events(employee_id, event_time) WHERE employee_id IS NOT NULL
idx_events_client       — events(client_id, event_time) WHERE client_id IS NOT NULL
idx_events_dedup        — events(source_id, external_id)
idx_snap_metric         — metric_snapshots(metric_id, period_type, period_key)
idx_plans_metric        — metric_plans(metric_id, period)
+ UNIQUE индексы на каждой MV (для REFRESH CONCURRENTLY)
```

## 2.3. Новые API endpoints

### Event Engine (Фаза 2)

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/events/webhook/:sourceId` | Webhook из CRM. Auth: `x-webhook-secret` header |
| POST | `/api/admin/events` | Ручной ввод событий |
| GET | `/api/admin/events` | Список событий. Фильтры: source_id, event_type, branch_id, employee_id, client_id, date_from, date_to. Пагинация: limit, offset |
| POST | `/api/admin/events/reaggregate` | Re-aggregation: events → metric_snapshots |
| GET | `/api/admin/event-types` | Реестр типов событий |

### Aggregation (Фаза 2)

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/metrics/aggregate` | Группировка метрик. Params: metric_ids, date_from, date_to, group_by (day/week/dekada/month/quarter/year/client), branch_ids, employee_ids, client_ids |
| GET | `/api/metrics/:id/dynamic-plan` | Динамический дневной план. Params: branch_id, employee_id, period |

### Clients (Фаза 2)

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/admin/clients` | Список клиентов. Пагинация: limit, offset |
| GET | `/api/admin/clients/search` | Поиск по имени или external_id. Param: q |

### CRM Adapters (Фаза 3)

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/admin/adapters` | Зарегистрированные адаптеры (built-in + custom) |
| DELETE | `/api/admin/adapters/:id/cache` | Очистка кэша адаптера |
| POST | `/api/admin/data-sources/:id/poll` | Ручной запуск опроса CRM |

### Analytics (Фаза 4)

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/analytics/monthly-by-branch` | Time-series по филиалам |
| GET | `/api/analytics/monthly-by-employee` | Time-series по сотрудникам |
| GET | `/api/analytics/daily-events` | Дневная сводка событий |
| GET | `/api/analytics/view-status` | Статус materialized views |
| POST | `/api/analytics/refresh-views` | Ручное обновление всех views |

### Export (Фаза 4)

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/export/metrics-csv` | CSV метрик: факт, план, кол-во замеров |
| GET | `/api/export/events-csv` | CSV событий (до 50 000 строк) |
| GET | `/api/export/monthly-report` | Кросс-таблица: метрики × филиалы |

---

# 3. Решения по требованиям CTO

## 3.1. Три измерения: филиал, менеджер, клиент

**Требование**: Метрики привязаны к трём измерениям.

**Метод**: Star schema.

```
dim_branches ──┐
               ├── events (fact table) ──── metric_snapshots (aggregated)
dim_employees ─┤     branch_id   (nullable)
               │     employee_id (nullable)
dim_clients ───┘     client_id   (nullable)
```

Все три FK nullable — событие привязывается к любой комбинации. Это позволяет:
- Событие «заказ в филиале» — только `branch_id`
- Событие «продажа менеджером клиенту» — все три
- Сетевая метрика — все три NULL

`dim_clients` — новая таблица: `id`, `external_id` (CRM), `source_id`, `name`, `branch_id`, `employee_id`, `client_type` (individual/corporate), `metadata` JSONB.

## 3.2. Абсолютные и усреднённые метрики

**Требование**: Абсолютные (выручка, кол-во) суммируются. Усреднённые (конверсия, CSI) усредняются.

**Метод**: Разная SQL-агрегация в `aggregation-engine.js`:

| metric_type | Агрегация | Пример |
|-------------|-----------|--------|
| `absolute` | `SUM(fact_value)` | Выручка за месяц = сумма дней |
| `averaged` | `SUM(fact × sample_count) / SUM(sample_count)` | CSI за месяц = взвешенное среднее |
| `percentage` | То же, что averaged | Конверсия |
| `computed` | Формула поверх других метрик | Средний чек = выручка / кол-во |

Также поддержан метод `last` — последнее значение в периоде (для snapshot-метрик).

## 3.3. Динамический дневной план

**Требование**: Для абсолютных: `(план - факт) / оставшиеся рабочие дни`. Для усреднённых: план = константа.

**Метод 1** — Модуль `plan-engine.js`:

```
dynamicDailyPlan(plan=1000000, fact=650000, today='2026-03-15', end='2026-03-31', 'working_days')
→ {
    dailyPlan: 29167,        // 350000 / 12 рабочих дней
    remainingDays: 12,
    remainingPlan: 350000,
    completionPercent: 65.0
  }
```

Иерархическое разрешение плана: employee → branch → network (проверяет `metric_plans` в этом порядке, берёт первый найденный).

Для `averaged`/`percentage`: `dailyPlan = planValue` (план не меняется в течение периода).

**Метод 2** — Изменение default `forecastLabel` в `internal-api.js`:

```javascript
// Было: forecastLabel по умолчанию 'forecast' для всех типов
// Стало:
if (mt === 'absolute') forecastLabel = 'remaining';     // включает (план-факт)/дней
else if (mt === 'averaged' || mt === 'percentage') forecastLabel = 'deviation';
```

Это активирует формулу `remainingDailyPlan = (plan - fact) / remainingWorkingDays` (которая уже была в коде на строке ~2230, но не использовалась по умолчанию) для **всех** абсолютных метрик автоматически.

**API**: `GET /api/metrics/:id/dynamic-plan?branch_id=...&employee_id=...&period=2026-03`

## 3.4. Группировка по периодам

**Требование**: день / неделя / месяц / квартал / год / декада / клиент.

**Метод**: SQL-выражения в `aggregation-engine.js:periodKeyExpr()`:

| groupBy | SQL | Результат |
|---------|-----|-----------|
| `day` | `s.period_key` | `2026-03-11` |
| `week` | `TO_CHAR(date, 'IYYY-WNN')` | `2026-W10` |
| `dekada` | `YYYY-MM` + `-D1`/`-D2`/`-D3` | `2026-03-D2` (11–20 число) |
| `month` | `TO_CHAR(date, 'YYYY-MM')` | `2026-03` |
| `quarter` | `YYYY-QN` | `2026-Q1` |
| `year` | `YYYY` | `2026` |
| `client` | `COALESCE(s.client_id, '__no_client__')` | UUID клиента |

При `group_by=client` — дополнительный JOIN с `dim_clients` для получения имён:
```json
{ "period": "client-uuid-123", "clientName": "Иванов А.А.", "fact": 150000 }
```

**API**: `GET /api/metrics/aggregate?metric_ids=revenue_created&date_from=2026-01-01&date_to=2026-03-31&group_by=dekada&branch_ids=1000000052`

## 3.5. Событийная модель

**Требование**: Приём событий: заказ создан/закрыт/отменён/возвращён, визит клиента, оплата.

**Метод**: Event Store → Aggregation pipeline.

### Таблица `events`

Каждая строка — одно бизнес-событие:
```
id              BIGSERIAL
event_type      'order_created' | 'order_closed' | ... (из event_types)
event_time      TIMESTAMPTZ — когда произошло
branch_id       nullable FK
employee_id     nullable FK
client_id       nullable FK
source_id       'amocrm' | 'tracker' | 'manual'
external_id     для дедупликации (UNIQUE с source_id)
metric_values   JSONB {"revenue": 15000, "items_count": 2}
raw_payload     JSONB — полный оригинал для replay
```

### Два канала приёма

| Канал | Endpoint | Когда |
|-------|----------|-------|
| Webhook | `POST /api/events/webhook/:sourceId` | CRM отправляет POST при событии. Auth: `x-webhook-secret` |
| Polling | Фоновый `polling-scheduler.js` | Каждые 30s проверяет `data_sources.poll_interval_s`, вызывает `adapter.poll()` |

### Pipeline

```
CRM → adapter.transformWebhook() / adapter.poll()
        ↓
  ingestEvents() — дедупликация по (source_id, external_id)
        ↓
  INSERT INTO events — ON CONFLICT DO NOTHING
        ↓
  reaggregate() → aggregateEventsToSnapshots()
        ↓
  INSERT/UPDATE metric_snapshots — предагрегированные дневные данные
```

### Дедупликация

```sql
ON CONFLICT (source_id, external_id) WHERE external_id IS NOT NULL DO NOTHING
```

Если CRM отправит одно и то же событие дважды (webhook retry) — второй INSERT игнорируется.

## 3.6. CRM-адаптеры и AI-генерация

**Требование**: Универсальная платформа, AI генерирует адаптеры для новых CRM.

**Метод**: Формальный интерфейс + фабрика + VM sandbox.

### Интерфейс `CRMAdapter`

```typescript
interface CRMAdapter {
  readonly adapterType: string;          // 'amocrm', 'tracker', 'custom'
  readonly name: string;                 // 'amoCRM Adapter'
  readonly supportedEvents: string[];    // ['order_created', 'order_closed']

  initialize(dataSource): Promise<void>;
  transformWebhook(payload, headers): Promise<IncomingEvent[]>;   // webhook → события
  poll(dataSource, lastPollAt): Promise<IncomingEvent[]>;         // polling → события
  validateWebhook(payload, headers, secret): boolean;             // проверка подлинности
  discover(dataSource): Promise<DiscoveryResult>;                 // обнаружение метрик
}
```

### Built-in адаптеры

| Адаптер | Что делает |
|---------|-----------|
| `AmoCRMAdapter` | **discover**: pipelines, leads по статусам, contacts, companies, tasks. **webhook**: lead status changes → `order_created`/`order_closed`. **poll**: фильтр по `updated_at` |
| `TrackerAdapter` | **discover**: 8 метрик (revenue_created, revenue_closed, frames_count, conversion_rate, csi, avg_glasses_price, avg_repaires_price, margin_rate) |
| `CustomAdapter` | **VM sandbox**: загружает JS-код из `adapter_registry.adapter_code`, исполняет через `vm.createContext()` с timeout 5s |

### Фабрика (`adapter-loader.js`)

```
getAdapter(dataSource) →
  1. Проверить кэш (по sourceId + adapterType)
  2. Если adapterType указан → создать соответствующий класс
  3. Авто-детект по baseUrl: "amocrm" → AmoCRMAdapter, "tracker" → TrackerAdapter
  4. Проверить adapter_registry в DB → CustomAdapter
  5. Fallback → BaseAdapter
```

### AI-генерация (CustomAdapter + VM sandbox)

Поток:
1. Admin описывает CRM API (endpoints, auth, event mapping)
2. Система генерирует JS-код адаптера
3. Код сохраняется в `adapter_registry.adapter_code`
4. `CustomAdapter` загружает код и исполняет через `vm` module

**Безопасность**:
- Доступные globals: `console.log`, `JSON`, `Date`, `Math`, `Array`, `Object`, `String`, `Number`, `RegExp`, `Map`, `Set`, `Promise`, `setTimeout`, `URL`, `URLSearchParams`
- **Заблокировано**: `require`, `import`, `fs`, `process`, `child_process`, `Buffer`, `global`
- Timeout: 5 секунд на исполнение

### Polling Scheduler

```
setInterval(checkAndPoll, 30_000)  — каждые 30 секунд

checkAndPoll():
  SELECT * FROM data_sources WHERE enabled AND poll_interval_s IS NOT NULL
    AND (last_poll_at IS NULL OR last_poll_at + interval < now())

  Для каждого → pollSource() (fire-and-forget, overlap prevention через activePolls Set)

pollSource(source):
  adapter = getAdapter(source)
  events = adapter.poll(source, lastPollAt)
  ingestEvents(source.id, events)
  UPDATE data_sources SET last_poll_at = now()
```

Минимальный интервал: 60 секунд. Защита от overlap: `activePolls` Set.

## 3.7. Дата-платформа (PostgreSQL вместо JSON)

**Требование**: Надёжное хранение, ACID, индексы, потеря данных невозможна.

**Метод**: PostgreSQL 16 в Docker с dual-read паттерном.

### Connection Pool (`db.js`)

```javascript
export async function initDatabase() {
  // Если DATABASE_URL не задан → fallback на JSON
  pool = new pg.Pool({ connectionString: DATABASE_URL, max: 10, idleTimeoutMillis: 30000 });
  // Test connection
  const client = await pool.connect();
  await client.query('SELECT 1');
  connected = true;
}

export function isDbConnected() { return connected && pool !== null; }
export async function query(text, params) {
  if (!isDbConnected()) return null;
  return pool.query(text, params);
}
```

### Dual-read паттерн

Каждый модуль: DB primary → JSON fallback.

```javascript
import { isDbConnected, query } from './db.js';

export async function getMetricDefinitions() {
  if (isDbConnected()) {
    const res = await query('SELECT * FROM metric_definitions WHERE enabled ORDER BY display_order');
    return res?.rows || [];
  }
  return (await readConfig()).metrics;  // JSON fallback
}
```

**Результат**: Убрать `DATABASE_URL` из `.env` → приложение полностью работает на JSON.

### Docker

PostgreSQL добавлен во все 5 docker-compose файлов:

```yaml
postgres:
  image: postgres:16-alpine
  environment:
    POSTGRES_DB: staff_focus
    POSTGRES_USER: ${POSTGRES_USER:-staff_focus}
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
  volumes:
    - postgres_data:/var/lib/postgresql/data    # данные не теряются при рестарте
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-staff_focus}"]
  restart: unless-stopped
```

App `depends_on: postgres: condition: service_healthy`.

### Миграции

```bash
node --env-file=.env scripts/run-migrations.js
```

Идемпотентный: отслеживает применённые миграции в таблице `_migrations`. Каждая миграция в транзакции.

## 3.8. Масштабируемость

**Требование**: Платформа должна масштабироваться за пределы оптики.

**Метод**: 3 уровня.

1. **Universal Schema** — все таблицы generic. Нет hardcoded бизнес-логики оптики. `metric_definitions` описывает метрики через конфигурацию (30 полей), а не код. `event_types` — расширяемый реестр.

2. **Adapter Pattern** — новый CRM подключается через адаптер (4 метода). Built-in или AI-generated через `adapter_registry`.

3. **ClickHouse Path** — при объёме >100K событий/день:
   - Добавить ClickHouse для аналитики
   - PG → ClickHouse репликация (logical replication или batch sync)
   - Aggregation queries переключаются на ClickHouse
   - PG остаётся source of truth для конфигов

## 3.9. Аналитика (Materialized Views)

**Решение**: 4 MV с автоматическим обновлением.

| View | Интервал | Что хранит |
|------|----------|-----------|
| `mv_monthly_by_branch` | 5 мин | Месячные факты: metric_id × branch_id × month_key |
| `mv_monthly_by_employee` | 5 мин | Месячные факты: metric_id × employee_id × month_key |
| `mv_daily_events` | 2 мин | Дневные сводки: event_type × branch_id × date → count, revenue, items |
| `mv_quarterly_by_branch` | 15 мин | Квартальные факты: metric_id × branch_id × quarter_key |

**Scheduler** (`analytics-views.js`):
- Фоновый `setInterval`, минимальный интервал = 2 минуты
- Обновляет только stale views (по `_materialized_view_refresh_log`)
- `REFRESH CONCURRENTLY` (не блокирует чтение) → fallback на обычный refresh если нет unique index

**Time-series API**:
- `getMonthlyByBranch(metricId, { branchIds, dateFrom, dateTo })` — из MV
- `getMonthlyByEmployee(metricId, { employeeIds, branchIds, dateFrom, dateTo })` — из MV
- `getDailyEvents({ eventType, branchIds, dateFrom, dateTo })` — из MV

## 3.10. Экспорт данных

**Решение**: Серверный CSV с UTF-8 BOM (корректное открытие в Excel с кириллицей), разделитель `;`.

| Функция | Формат | Описание |
|---------|--------|----------|
| `exportMetricsCsv()` | Строки: Метрика, Тип, Период, Факт, План, Кол-во замеров | Использует `aggregation-engine` для группировки |
| `exportEventsCsv()` | Строки: ID, Тип, Время, Филиал, Сотрудник, Клиент, Источник, Метрики | До 50 000 событий с фильтрами |
| `exportMonthlyReport()` | Кросс-таблица: Метрика × Филиалы (Факт + План) | Итого по строкам |

---

# 4. Архитектура

## 4.1. Слои системы

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React + TypeScript)            │
│  internalApiClient.ts — 20+ новых методов                   │
└─────────────────────────────┬───────────────────────────────┘
                              │ HTTP /api/*
┌─────────────────────────────┴───────────────────────────────┐
│                    Express.js BFF (server.js)                │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ API Layer — internal-api.js + event-ingestion.js         ││
│  │ 19 новых endpoints + 5 event routes                      ││
│  └───────────────────────┬─────────────────────────────────┘│
│                          │                                   │
│  ┌───────────────────────┴─────────────────────────────────┐│
│  │ Engine Layer                                             ││
│  │  aggregation-engine.js — SQL-группировка (7 периодов)    ││
│  │  plan-engine.js        — динамический дневной план       ││
│  │  export-engine.js      — CSV-экспорт (3 формата)         ││
│  │  analytics-views.js    — MV refresh + time-series        ││
│  │  formula-engine.js     — computed-метрики (legacy)        ││
│  └───────────────────────┬─────────────────────────────────┘│
│                          │                                   │
│  ┌───────────────────────┴─────────────────────────────────┐│
│  │ Adapter Layer — src/server/adapters/                      ││
│  │  adapter-loader.js     — фабрика + авто-детект + кэш     ││
│  │  amocrm-adapter.js     — amoCRM (discover + webhook)     ││
│  │  tracker-adapter.js    — Tracker (discover)               ││
│  │  custom-adapter.js     — VM sandbox для AI-кода           ││
│  │  polling-scheduler.js  — фоновый polling (30s цикл)       ││
│  └───────────────────────┬─────────────────────────────────┘│
│                          │                                   │
│  ┌───────────────────────┴─────────────────────────────────┐│
│  │ Data Layer                                               ││
│  │  db.js       — PostgreSQL pool (max 10, graceful init)   ││
│  │  cache.js    — Redis (5min TTL, graceful degradation)     ││
│  │  data/*.json — JSON fallback (backward compatibility)     ││
│  └─────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
             │                              │
       ┌─────┴─────┐                 ┌──────┴──────┐
       │ PostgreSQL │                 │    Redis    │
       │ 16-alpine  │                 │   (кэш)    │
       └───────────┘                 └─────────────┘
```

## 4.2. Star Schema

```
                     ┌───────────────────┐
                     │   dim_branches    │
                     │ id, name, city    │
                     └─────────┬─────────┘
                               │ branch_id
┌───────────────┐    ┌─────────┴─────────┐    ┌───────────────┐
│ dim_employees │────│      events       │────│  dim_clients   │
│ id, name,     │    │   (fact table)    │    │ id, name,      │
│ branch_id,    │    │                   │    │ external_id,   │
│ designation   │    │ event_type        │    │ source_id,     │
└───────────────┘    │ event_time        │    │ client_type    │
                     │ metric_values {}  │    └───────────────┘
                     │ raw_payload       │
                     └─────────┬─────────┘
                               │ aggregated
                     ┌─────────┴─────────┐
                     │ metric_snapshots  │
                     │ metric_id         │
                     │ branch/emp/client │
                     │ period_type/key   │
                     │ fact_value        │
                     └───────────────────┘
```

## 4.3. Data Flow

```
   CRM (amoCRM)              Manual Input              Tracker API
        │                         │                         │
   webhook POST            POST /admin/events         poll() every Ns
        │                         │                         │
        └────────────┬────────────┘─────────────────────────┘
                     │
         adapter.transformWebhook() / adapter.poll()
                     │
         ingestEvents() — дедупликация (source_id, external_id)
                     │
         ┌───────────┴───────────┐
         │    events table       │   ← raw бизнес-события
         └───────────┬───────────┘
                     │
         aggregateEventsToSnapshots()
                     │
         ┌───────────┴───────────┐
         │  metric_snapshots     │   ← предагрегированные дневные данные
         └───────────┬───────────┘
                     │
         ┌───────────┼───────────────────┐
         │           │                   │
    aggregate()   MV refresh         export
    (on-demand)   (scheduled)        (on-demand)
         │           │                   │
    JSON API    mv_monthly_*        CSV файл
                mv_daily_*
                mv_quarterly_*
```

## 4.4. Graceful Degradation

| Уровень | Что работает |
|---------|-------------|
| **PostgreSQL + Redis** | Все 19 endpoints, MV refresh, polling, экспорт, кэш |
| **PostgreSQL only** | Всё, кроме кэша (медленнее, но функционально) |
| **Без PostgreSQL** | JSON fallback: dashboard-metrics, plans, data-sources. Новые endpoints возвращают `[]` |

Реализация: каждая функция начинается с `if (!isDbConnected()) return null / [] / fallback`.

---

# 5. Что ещё необходимо сделать

## Фаза 5. Интеграция и Production

### 5.1. Миграция реальных данных

Скрипт `scripts/migrate-json-to-pg.js` написан, но не запускался на production.

```bash
# 1. Запустить PostgreSQL
docker compose up -d postgres

# 2. Создать таблицы
node --env-file=.env scripts/run-migrations.js

# 3. Перенести данные
node --env-file=.env scripts/migrate-json-to-pg.js

# 4. Проверить
curl http://localhost:3010/api/admin/dashboard-metrics
```

### 5.2. Dual-read для существующих модулей

Паттерн описан, но не все модули переведены:

- [ ] `dashboard-metrics.js` — CRUD метрик → DB primary, JSON fallback
- [ ] `metric-plans-api.js` — CRUD планов → DB primary, JSON fallback
- [ ] `data-sources.js` — CRUD data sources → DB primary, JSON fallback
- [ ] `salary-config-api.js` — salary configs → DB primary, JSON fallback
- [ ] `salary-admin.js` — salary sessions → DB primary, JSON fallback

### 5.3. Production Docker

- [ ] `POSTGRES_PASSWORD` в production secrets
- [ ] `DATABASE_URL` в production `.env`
- [ ] Backup-стратегия: `pg_dump` cron для `postgres_data` volume
- [ ] `max_connections` PostgreSQL для production нагрузки

### 5.4. E2E тестирование новых endpoints

- [ ] Webhook ingestion + дедупликация + auth
- [ ] Все 7 типов группировки
- [ ] Dynamic plan: absolute vs averaged
- [ ] Экспорт CSV с BOM
- [ ] Кросс-таблица monthly report
- [ ] Time-series из materialized views

## Фаза 6. Фронтенд

### 6.1. Dashboard

- [ ] UI-селектор группировки (день/неделя/месяц/квартал/декада)
- [ ] Фильтр по клиенту (autocomplete → `/api/admin/clients/search`)
- [ ] Отображение динамического дневного плана для absolute-метрик
- [ ] Графики через `internalApiClient.getMetricAggregate()`

### 6.2. Admin — события

- [ ] Страница `/admin/events` — таблица с фильтрами и пагинацией
- [ ] Форма ручного ввода события
- [ ] Кнопка reaggregate

### 6.3. Admin — адаптеры

- [ ] Страница `/admin/adapters` — список built-in + custom
- [ ] Форма AI-генерации адаптера

### 6.4. Admin — экспорт

- [ ] Кнопка «Скачать CSV» на страницах метрик
- [ ] Кнопка «Месячный отчёт»
- [ ] Кнопка «Экспорт событий»

### 6.5. Admin — аналитика

- [ ] Статус materialized views (время, кол-во строк)
- [ ] Кнопка ручного refresh
- [ ] Графики time-series

## Фаза 7. AI-генерация адаптеров

- [ ] Endpoint `POST /api/admin/adapters/generate`
- [ ] Интеграция с Claude API для генерации JS-кода
- [ ] Валидация кода (lint, type check, sandbox test)
- [ ] UI-форма описания CRM API

## Фаза 8. ClickHouse (при необходимости)

**Триггер**: > 100K событий/день или > 10M строк в `metric_snapshots`.

- [ ] ClickHouse в docker-compose
- [ ] PG → ClickHouse репликация
- [ ] Aggregation queries на ClickHouse
- [ ] PG = source of truth для конфигов

---

# 6. Верификация

## Backend (после фаз 1–5)

| # | Проверка | Команда |
|---|----------|---------|
| 1 | Docker стартует | `docker compose up` — PostgreSQL + Redis + App |
| 2 | Миграции | `node scripts/run-migrations.js` — 8 миграций |
| 3 | Данные из JSON | `node scripts/migrate-json-to-pg.js` |
| 4 | Метрики из DB | `curl /api/admin/dashboard-metrics` |
| 5 | JSON fallback | Убрать `DATABASE_URL` → те же данные из JSON |
| 6 | Webhook | `POST /api/events/webhook/test` — событие записано |
| 7 | Дедупликация | Повторный POST → `duplicates: 1` |
| 8 | Группировка | `GET /api/metrics/aggregate?group_by=month` |
| 9 | Dynamic plan | `GET /api/metrics/:id/dynamic-plan` — absolute vs averaged |
| 10 | CSV export | `GET /api/export/monthly-report?period=2026-03` — BOM + кросс-таблица |
| 11 | MV status | `GET /api/analytics/view-status` — 4 views обновлены |
| 12 | Polling | `POST /api/admin/data-sources/:id/poll` |
| 13 | Адаптеры | `GET /api/admin/adapters` — 3 built-in |

## Frontend (после фазы 6)

| # | Проверка |
|---|----------|
| 14 | Dashboard: динамический дневной план для absolute |
| 15 | Dashboard: селектор группировки |
| 16 | Dashboard: фильтр по клиенту |
| 17 | Admin: таблица событий |
| 18 | Admin: CSV скачивается |
| 19 | Admin: статус materialized views |

---

# 7. Карта файлов

```
src/server/
├── db.js                         89 строк   PostgreSQL connection pool
├── aggregation-engine.js        236 строк   SQL-группировка (7 периодов)
├── plan-engine.js               191 строк   Динамический дневной план
├── event-ingestion.js           326 строк   Webhook + дедупликация + 5 routes
├── analytics-views.js           296 строк   MV refresh + time-series
├── export-engine.js             263 строк   CSV-экспорт (3 формата)
├── internal-api.js              ~2500 строк  Main BFF (+19 endpoints)
├── source-discovery.js          269 строк   Модифицирован: adapter delegation
├── adapters/
│   ├── types.ts                 107 строк   CRMAdapter interface
│   ├── base-adapter.js          122 строк   Base class
│   ├── amocrm-adapter.js       246 строк   amoCRM adapter
│   ├── tracker-adapter.js       77 строк   Tracker adapter
│   ├── custom-adapter.js       190 строк   VM sandbox
│   ├── adapter-loader.js       162 строк   Factory + cache
│   └── polling-scheduler.js    163 строк   Background polling

migrations/
├── 001_create_dimensions.sql              dim_branches, dim_employees, dim_clients, dim_calendar
├── 002_create_metric_catalog.sql          metric_definitions, metric_field_mappings
├── 003_create_plans.sql                   metric_plans
├── 004_create_events.sql                  events, event_types
├── 005_create_snapshots.sql               metric_snapshots, manual_metric_data
├── 006_create_data_sources.sql            data_sources, adapter_registry
├── 007_create_salary.sql                  salary_configs, salary_sessions
├── 008_create_analytics_views.sql         4 MVs + refresh_log

scripts/
├── run-migrations.js             86 строк   Идемпотентный migration runner
├── migrate-json-to-pg.js       228 строк   JSON → PostgreSQL (одноразовый)

src/lib/
├── internalApiClient.ts                    +20 методов, client entity type
```

**Итого**: ~5 100 строк нового кода, 8 SQL-миграций, 15 таблиц, 4 materialized views, 19 API endpoints.

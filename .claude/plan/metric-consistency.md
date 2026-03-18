# Implementation Plan: Unified Metric Consistency

## Problem Statement

Метрики отображаются по-разному в трёх местах приложения. Пользователь видит разные значения для одной и той же метрики «Выручка СЗ»:

| Вид | Значение | План | Источник данных |
|-----|----------|------|-----------------|
| **Leader Dashboard** | 50 000 ₽ | 100 000 ₽ | `/api/top-leader-metrics` с фильтром `store_id` |
| **Ввод данных** | 50K ₽ | 100K ₽ | `/api/admin/dashboard-metrics` + фильтр по `storeId` в UI |
| **Админка (превью)** | 10 000 ₽ | 10 000 ₽ | `/api/admin/dashboard-metrics` → первый `manualData` entry без фильтра |

## Root Cause Analysis

### Проблема 1: Admin preview не фильтрует по магазину
**Файл:** `src/components/admin/AdminDashboard.tsx:496-505`

```javascript
// Текущий код: берёт ПЕРВЫЙ entry для текущего периода, без учёта storeId
const current = metric.manualData.find(d => d.period === currentPeriod);
```

В `manualData` хранятся записи для разных магазинов:
- `{ period: "2026-02", storeId: "", fact: 10000, plan: 10000 }` — глобальная
- `{ period: "2026-02", storeId: "1000000052", fact: 50000, plan: 100000 }` — для магазина

`.find()` возвращает первую (глобальную) запись → admin показывает 10K вместо 50K.

### Проблема 2: Admin preview использует захардкоженные значения для tracker-метрик
**Файл:** `src/components/admin/AdminDashboard.tsx:526`

```javascript
const fact = metric.source === 'manual' ? localFact : 75000; // hardcoded!
const plan = metric.source === 'manual' ? localPlan : 100000; // hardcoded!
```

Для tracker-метрик превью всегда показывает 75K/100K — не соответствует реальности.

### Проблема 3: Mock data IDs не совпадают с конфигом
**Файл:** `src/data/mockData.ts` vs `src/server/dashboard-metrics.js`

| Mock ID (mockData.ts) | Config ID (dashboard-metrics.json) |
|----------------------|--------------------------------------|
| `revenue_sz` | `revenue_created` |
| `revenue_zz` | `revenue_closed` |
| `clients_count` | `frames_count` |
| `conversion` | `conversion_rate` |
| `margin` | `margin_rate` |

Dashboard (LeaderDashboardHome.tsx:86-108) использует mock IDs для `buildZeroMetrics()` и `metricMetaById`, но API возвращает config IDs → метаданные не матчатся.

### Проблема 4: Три разных пути получения данных
- **Dashboard:** `getTopLeaderMetrics()` → `/api/top-leader-metrics` (server-side фильтрация store + date)
- **Admin:** `getDashboardMetrics()` → `/api/admin/dashboard-metrics` (весь конфиг с embedded manualData)
- **Manual Entry:** тот же `getDashboardMetrics()`, но UI фильтрует по storeId клиентски

## Task Type
- [x] Frontend
- [x] Backend
- [x] Fullstack

## Technical Solution

**Стратегия:** Единый источник правды — конфиг из `dashboard-metrics.json` + единый API для runtime-данных. Убрать зависимость от mock data, сделать admin preview aware к магазину и реальным данным.

## Implementation Steps

### Step 1: Убрать зависимость Dashboard от mock data IDs
**Файл:** `src/components/leader-dashboard/LeaderDashboardHome.tsx`

**Что делаем:**
- `buildZeroMetrics()` (строки 86-97) сейчас использует `leaderMetricsByPeriodExtended` (mock) для каркаса нулевых метрик. Заменить: загружать конфиг метрик из того же `/api/admin/dashboard-metrics` или из нового lightweight-эндпоинта.
- `metricMetaById` (строки 102-108) строится из mock данных. После того как реальные данные загружены — использовать их напрямую. До загрузки — показывать spinner вместо нулей с фейковыми именами.

**Pseudo-code:**
```typescript
// Вместо leaderMetricsByPeriodExtended из mock:
const { metrics: metricConfigs } = useAdminDashboardMetrics(); // или отдельный лёгкий запрос
const enabledTopLevel = metricConfigs.filter(m => m.enabled && !m.parentId);

const buildZeroMetrics = useCallback((): FullWidthKPIMetric[] => {
  return enabledTopLevel.map(cfg => ({
    id: cfg.id,
    name: cfg.name,
    current: 0,
    plan: 0,
    unit: cfg.unit,
    color: cfg.color,
    forecastValue: 0,
    forecastUnit: cfg.forecastUnit,
    forecastLabel: cfg.forecastLabel,
    trend: 'stable',
    status: 'neutral',
  }));
}, [enabledTopLevel]);
```

**Ожидаемый результат:** Dashboard показывает реальные имена/IDs метрик из конфига, а не из mock.

### Step 2: Сделать Admin preview store-aware
**Файл:** `src/components/admin/AdminDashboard.tsx`

**Что делаем:**
- Добавить `useEmployee()` для получения `storeId` текущего пользователя
- При выборе manual data для превью — фильтровать по `storeId` (как это делает backend в `_fetchMetricsData`)

**Pseudo-code для AdminMetricCard (строки 496-505):**
```typescript
const { storeId } = useEmployee();

useEffect(() => {
  if (metric.source === 'manual' && metric.manualData?.length) {
    const now = new Date();
    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const periodEntries = metric.manualData.filter(d => d.period === currentPeriod);

    // Та же логика fallback что и в backend _fetchMetricsData:
    let entry = periodEntries.find(e => e.storeId === storeId);
    if (!entry) entry = periodEntries.find(e => !e.storeId);
    if (!entry) entry = periodEntries[0];

    if (entry) {
      setLocalFact(entry.fact);
      setLocalPlan(entry.plan);
    }
  }
}, [metric.source, metric.manualData, storeId]);
```

**Ожидаемый результат:** Admin preview для manual-метрик показывает данные для текущего магазина пользователя (50K/100K), а не глобальные (10K/10K).

### Step 3: Убрать hardcoded значения для tracker-метрик в admin preview
**Файл:** `src/components/admin/AdminDashboard.tsx:525-527`

**Вариант A (рекомендуется):** Показывать placeholder-состояние «нет данных» для tracker-метрик, вместо фейковых 75K/100K.

```typescript
const previewMetric: FullWidthKPIMetric = useMemo(() => {
  if (metric.source === 'manual') {
    // Реальные manual data (из Step 2)
    return buildPreviewFromManual(localFact, localPlan, form, metric);
  }
  // Для tracker/external: показываем конфиг без цифр (или "загрузка")
  return {
    id: metric.id,
    name: settingsOpen ? form.name : metric.name,
    current: 0,
    plan: 0,
    unit: settingsOpen ? form.unit : metric.unit,
    trend: 'stable',
    status: 'neutral',
    color: form.color || metric.color || '#3B82F6',
    forecastValue: 0,
    forecastUnit: metric.forecastUnit || '%',
    forecastLabel: metric.forecastLabel,
  };
}, [...]);
```

**Вариант B (более информативный):** Подгружать реальные данные через тот же `_fetchMetricsData` для preview. Но это усложнит код и потребует дополнительный API-запрос — рекомендуется только если пользователь явно хочет видеть live-данные в admin.

**Ожидаемый результат:** Admin не вводит в заблуждение фейковыми значениями.

### Step 4: Вычистить зависимость от mockData
**Файлы:**
- `src/components/leader-dashboard/LeaderDashboardHome.tsx` — убрать импорт `leaderMetricsByPeriodExtended`
- `src/data/periodData.ts` — оставить для справки, но dashboard больше не зависит от него
- `src/data/mockData.ts` — не трогаем (может использоваться в других местах)

**Что делаем:**
Вместо mock-based `metricMetaById` enrichment, dashboard полностью полагается на данные из API. Сервер уже возвращает `name`, `unit`, `color`, `forecastLabel` — дополнительный enrichment не нужен.

```typescript
// Было:
const enriched = data.map((metric) => {
  const meta = metricMetaById.get(metric.id); // из mock!
  return {
    ...metric,
    name: metric.name ?? meta?.name ?? metric.id,
    unit: metric.unit ?? meta?.unit ?? "",
    color: (metric.color as string | null) ?? (meta?.color as string | undefined) ?? "#3b82f6",
  };
});

// Станет:
const enriched = data.map((metric) => ({
  ...metric,
  color: metric.color ?? "#3b82f6",
}));
```

### Step 5 (опционально): Лёгкий endpoint для конфига метрик
Если загрузка полного `/api/admin/dashboard-metrics` для dashboard кажется тяжёлой (manualData не нужен для отображения), можно добавить:

```javascript
// GET /api/dashboard-metrics-config — только мета, без manualData
app.get('/api/dashboard-metrics-config', requireAuth, async (_req, res) => {
  const config = await readConfig();
  const light = config.metrics.map(({ manualData, ...rest }) => rest);
  res.json({ metrics: light });
});
```

Dashboard вызывает его для `buildZeroMetrics`, а admin продолжает использовать полный endpoint.

## Key Files

| File | Operation | Description |
|------|-----------|-------------|
| `src/components/leader-dashboard/LeaderDashboardHome.tsx:82-108` | Modify | Убрать mock-зависимость, строить zero-метрики из конфига |
| `src/components/leader-dashboard/LeaderDashboardHome.tsx:153-161` | Modify | Упростить enrichment — данные уже приходят полные из API |
| `src/components/admin/AdminDashboard.tsx:496-505` | Modify | Фильтровать manualData по storeId |
| `src/components/admin/AdminDashboard.tsx:525-528` | Modify | Убрать hardcoded 75K/100K для tracker preview |
| `src/lib/internalApiClient.ts` | Minor | Добавить метод для lightweight config (если Step 5) |
| `src/server/dashboard-metrics.js` | Minor | Добавить lightweight endpoint (если Step 5) |

## Risks and Mitigation

| Risk | Mitigation |
|------|------------|
| Dashboard показывает пустоту пока грузится конфиг метрик | Показать skeleton/spinner, кэшировать конфиг в React Query |
| `useAdminDashboardMetrics` тянет весь конфиг с manualData для dashboard | Step 5 — лёгкий endpoint без manualData |
| Если у пользователя нет storeId — admin preview не будет знать какой магазин показать | Fallback на глобальную запись (без storeId), как сейчас делает backend |
| Mock данные используются где-то ещё (MetricDetail и т.д.) | Не удалять mockData.ts, только убрать зависимость dashboard от него |

## Estimated Impact
- **Dashboard:** метрики будут отображать реальные имена/цвета/единицы из конфига
- **Admin:** preview будет показывать те же значения что и dashboard для текущего магазина
- **Manual Entry:** уже работает корректно (фильтрует по storeId)
- **Единый источник:** `data/dashboard-metrics.json` → `/api/admin/dashboard-metrics` → все три view

## SESSION_ID
- CODEX_SESSION: N/A (wrapper not available)
- GEMINI_SESSION: N/A (wrapper not available)

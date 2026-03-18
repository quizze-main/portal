# Plan: Руководитель видит факты всех подчинённых сотрудников

## Задача

Руководитель (leader) должен видеть факты, заполненные всеми сотрудниками, которые находятся в его подчинении. Сейчас DailyFactCards показывает факты одного филиала — руководитель не видит, КТО заполнил и что происходит в других филиалах.

## Текущее состояние

### Хранение фактов
- `manual_metric_data` в БД: `(metric_id, period, branch_id, employee_id, fact_value, plan_value)`
- **Колонка `employee_id` существует в БД**, но **НЕ используется** в коде — факты идентифицируются только по `(metric_id, period, branch_id)`
- JSON-конфиг: `manualData[]` хранит `{period, storeId, fact, plan}` — без employee_id

### Роли
- **Менеджер** (isManager): заполняет факты за свой филиал
- **Руководитель** (canUseLeaderDashboard): видит дашборд по всем филиалам, `storeOptions` содержит все доступные филиалы

### Текущий UI
- `PlanFactSheet` → вкладка "fact" → `DailyFactCards` + `BranchDropdown`
- `DailyFactCards` показывает факты **одного филиала** (выбранного через dropdown)
- Нет сводной таблицы по всем филиалам

## Новый дизайн

### Вариант: Сводная таблица фактов по филиалам

Руководитель видит таблицу, где строки — филиалы, столбцы — метрики. Значения = факт за выбранный день.

```
┌─────────────────────────────────────────────────────────────┐
│  ◀  Март 2026  ▶       [13 мар, чт - сегодня]              │
│                                                              │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ... ┌──────┐              │
│  │  1  │ │  2  │ │ ... │ │ [13]│     │  31  │              │
│  └─────┘ └─────┘ └─────┘ └─────┘ ... └──────┘              │
│                                                              │
│  Филиалы на 13 марта:                                       │
│  ┌──────────────────────────────────────────────────┐       │
│  │ Филиал        │ Выручка │ Оправы │ CSI   │ ✓/✗  │       │
│  │───────────────│─────────│────────│───────│──────│       │
│  │ ТЦ Мега       │ 120 000 │   15   │  4.8  │  ✓  │       │
│  │ ТЦ Европа     │  85 000 │   12   │  4.5  │  ✓  │       │
│  │ ТЦ Галерея    │    —    │    —   │   —   │  ✗  │       │
│  │ ТЦ Радуга     │  95 000 │    8   │  4.9  │  ✓  │       │
│  └──────────────────────────────────────────────────┘       │
│                                                              │
│  Итого: 300 000 / 35 / 4.7                                 │
│                                                              │
│  [Нажмите на филиал для подробностей]                       │
└─────────────────────────────────────────────────────────────┘
```

При клике на филиал — открывается текущий `DailyFactCards` для этого филиала (drill-down).

## Task Type
- [x] Frontend
- [x] Backend
- [x] Fullstack

## Implementation Steps

### Step 1: Backend — новый endpoint для сводки фактов по филиалам

Добавить `GET /api/admin/dashboard-metrics/facts-overview`:

```javascript
// GET /api/admin/dashboard-metrics/facts-overview?date=2026-03-13&storeIds=1000000001,1000000002
app.get('/api/admin/dashboard-metrics/facts-overview', requireAuth, async (req, res) => {
  const { date, storeIds } = req.query;
  // date: YYYY-MM-DD
  // storeIds: comma-separated list of store IDs

  const storeIdList = (storeIds || '').split(',').filter(Boolean);
  const config = await readConfig();
  const manualMetrics = config.metrics.filter(m => m.source === 'manual' && m.enabled);

  // For each store, collect facts for the given date + month totals
  const branches = {};
  for (const sid of storeIdList) {
    const facts = {};
    const monthTotals = {};
    const month = date.slice(0, 7);

    for (const metric of manualMetrics) {
      const entries = metric.manualData || [];

      // Day fact
      const dayEntry = entries.find(d => d.period === date && (d.storeId || '') === sid);
      if (dayEntry) facts[metric.id] = { fact: dayEntry.fact };

      // Month total
      let sum = 0;
      for (const d of entries) {
        if (d.period.length === 10 && d.period.startsWith(month) && (d.storeId || '') === sid) {
          sum += d.fact || 0;
        }
      }
      monthTotals[metric.id] = sum;
    }

    const isFilled = Object.keys(facts).length > 0;
    branches[sid] = { facts, monthTotals, filled: isFilled };
  }

  // Aggregate totals across all branches
  const totalsByMetric = {};
  for (const metric of manualMetrics) {
    totalsByMetric[metric.id] = storeIdList.reduce(
      (acc, sid) => acc + (branches[sid]?.monthTotals[metric.id] || 0), 0
    );
  }

  res.json({ branches, totalsByMetric, date, metrics: manualMetrics.map(m => ({ id: m.id, name: m.name, color: m.color, unit: m.unit })) });
});
```

**Файл:** `src/server/dashboard-metrics.js`
**Операция:** Add new endpoint (после `daily-facts` GET)

### Step 2: Frontend — добавить метод в internalApiClient

```typescript
// В internalApiClient.ts
async getFactsOverview(date: string, storeIds: string[]): Promise<FactsOverviewResponse> {
  const params = new URLSearchParams({ date, storeIds: storeIds.join(',') });
  const response = await fetch(`${this.adminBaseUrl}/dashboard-metrics/facts-overview?${params}`, {
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to load facts overview');
  return response.json();
}
```

**Типы:**
```typescript
interface BranchFactsSummary {
  facts: Record<string, { fact: number }>;
  monthTotals: Record<string, number>;
  filled: boolean;
}

interface FactsOverviewResponse {
  branches: Record<string, BranchFactsSummary>;
  totalsByMetric: Record<string, number>;
  date: string;
  metrics: Array<{ id: string; name: string; color?: string; unit?: string }>;
}
```

**Файл:** `src/lib/internalApiClient.ts`

### Step 3: Frontend — хук useFactsOverview

```typescript
// src/hooks/useFactsOverview.ts
import { useQuery } from '@tanstack/react-query';
import { internalApiClient } from '@/lib/internalApiClient';

export function useFactsOverview(date: string, storeIds: string[], enabled = true) {
  return useQuery({
    queryKey: ['facts-overview', date, storeIds.join(',')],
    queryFn: () => internalApiClient.getFactsOverview(date, storeIds),
    enabled: enabled && !!date && storeIds.length > 0,
    staleTime: 30_000,
  });
}
```

**Файл:** `src/hooks/useFactsOverview.ts` (новый файл)

### Step 4: Frontend — компонент LeaderFactsOverview

Новый компонент `LeaderFactsOverview.tsx` — сводная таблица фактов по филиалам:

- Вверху: календарная полоса с навигацией по месяцам (можно переиспользовать из DailyFactCards)
- Таблица филиалов: строка на филиал, столбцы = метрики + статус (✓/✗)
- Строка "Итого" внизу с суммами
- Клик по филиалу → открывает `DailyFactCards` для этого филиала (в Sheet/модальном окне)
- Блокировка будущих дат (как в DailyFactCards)

```tsx
// src/components/leader-dashboard/LeaderFactsOverview.tsx
interface LeaderFactsOverviewProps {
  metrics: DashboardMetricConfig[];
  branches: LoovisStoreOption[];
  onBranchClick?: (branchId: string) => void;
}
```

Ключевые элементы:
1. Переиспользовать calendar strip (месяц + стрелки + дни) из DailyFactCards — вынести в отдельный компонент `MonthCalendarStrip`
2. Таблица: `branches.map(b => ...)` с фактами из `useFactsOverview`
3. Цветовая индикация: зелёный если все метрики заполнены, красный если нет
4. Итого по всем филиалам с цветными точками

**Файл:** `src/components/leader-dashboard/LeaderFactsOverview.tsx` (новый файл)

### Step 5: Вынести MonthCalendarStrip из DailyFactCards

Общая часть — навигация по месяцам + горизонтальный скролл дней — используется и в `DailyFactCards`, и в `LeaderFactsOverview`. Вынести в `MonthCalendarStrip.tsx`:

```tsx
interface MonthCalendarStripProps {
  date: string;
  onDateChange: (date: string) => void;
  calendarMonth: { year: number; month: number };
  onMonthChange: (month: { year: number; month: number }) => void;
  factsByDate?: Record<string, Record<string, number | null>>;  // Optional metric data under days
  manualMetrics?: Array<{ id: string; color?: string }>;
  monthTotals?: Record<string, number>;
}
```

**Файл:** `src/components/leader-dashboard/MonthCalendarStrip.tsx` (новый файл)
**DailyFactCards.tsx:** заменить встроенный calendar strip на `<MonthCalendarStrip />`

### Step 6: Интеграция в PlanFactSheet

В `PlanFactSheet.tsx`, во вкладке "fact":
- Если `canUseLeaderDashboard` и `storeOptions.length > 1` → показывать `LeaderFactsOverview`
- Если менеджер (один филиал) → показывать текущий `DailyFactCards`
- При клике на филиал в `LeaderFactsOverview` → открывать `DailyFactCards` в Sheet

```tsx
{activeTab === 'fact' && (
  canUseLeaderDashboard && storeOptions.length > 1 ? (
    <LeaderFactsOverview
      metrics={enabledMetrics}
      branches={storeOptions}
      onBranchClick={(branchId) => setDrillDownBranch(branchId)}
    />
  ) : (
    <DailyFactCards
      metrics={enabledMetrics}
      branches={storeOptions}
      defaultBranchId={factBranchId}
      onClose={() => setActiveTab('plan')}
    />
  )
)}
```

**Файл:** `src/components/leader-dashboard/PlanFactSheet.tsx`

### Step 7: Drill-down Sheet для филиала

При клике на строку филиала — открыть Sheet с `DailyFactCards` для выбранного филиала:

```tsx
{drillDownBranch && (
  <Sheet open={!!drillDownBranch} onOpenChange={() => setDrillDownBranch(null)}>
    <SheetContent side="bottom" className="h-[90vh]">
      <SheetHeader>
        <SheetTitle>{branchName}</SheetTitle>
      </SheetHeader>
      <DailyFactCards
        metrics={enabledMetrics}
        branches={storeOptions}
        defaultBranchId={drillDownBranch}
        onClose={() => setDrillDownBranch(null)}
      />
    </SheetContent>
  </Sheet>
)}
```

### Step 8: Инвалидация кэша при возврате из drill-down

При закрытии drill-down Sheet — инвалидировать `facts-overview` query чтобы сводная таблица обновилась:

```tsx
const handleDrillDownClose = () => {
  setDrillDownBranch(null);
  queryClient.invalidateQueries({ queryKey: ['facts-overview'] });
};
```

## Key Files

| File | Operation | Description |
|------|-----------|-------------|
| `src/server/dashboard-metrics.js` | Add endpoint | `GET /facts-overview` — сводка фактов по нескольким филиалам |
| `src/lib/internalApiClient.ts` | Add method + types | `getFactsOverview()` + `FactsOverviewResponse` |
| `src/hooks/useFactsOverview.ts` | New file | React Query хук для facts-overview |
| `src/components/leader-dashboard/LeaderFactsOverview.tsx` | New file | Сводная таблица по филиалам |
| `src/components/leader-dashboard/MonthCalendarStrip.tsx` | New file | Вынесенный calendar strip (опционально) |
| `src/components/leader-dashboard/PlanFactSheet.tsx` | Modify | Условный рендер: leader → overview, manager → daily cards |
| `src/components/leader-dashboard/DailyFactCards.tsx` | Minor refactor | Опционально вынести calendar strip |

## Risks and Mitigation

| Risk | Mitigation |
|------|------------|
| Много филиалов (10+) → длинная таблица | Горизонтальный скролл для метрик, вертикальный для филиалов |
| Двойная загрузка данных при drill-down (overview + daily-facts) | React Query кэш, staleTime 30s |
| Calendar strip дублирование кода | Step 5 — вынести в MonthCalendarStrip. Можно сделать в v2 |
| Endpoint возвращает данные по ВСЕМ филиалам сразу — может быть медленно | manualData фильтруется в памяти, для 10-20 филиалов < 50ms |
| Руководитель может редактировать факты чужого филиала через drill-down | Это ОК — руководитель имеет право корректировать |

## Verification

1. `npx vite build` — без ошибок
2. Руководитель (storeOptions.length > 1) видит сводную таблицу на вкладке "Факт"
3. Менеджер (один филиал) видит текущий DailyFactCards
4. Клик по филиалу открывает DailyFactCards в Sheet
5. Факты корректно отображаются по каждому филиалу
6. После ввода факта в drill-down — сводная таблица обновляется
7. Будущие даты заблокированы
8. Итоги по всем филиалам корректно суммируются

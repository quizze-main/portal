# Plan: Таблица фактов для руководителя v2

## Проблема

Текущий UI LeaderFactsOverview непонятен: цветные точки без подписей ("● 999 ● — ● —"), нет разбивки по менеджерам, невозможно понять кто что заполнил.

## Новый дизайн

### UI: Аккордеон-таблица

```
┌─────────────────────────────────────────────────────┐
│  ◀  Март 2026  ▶     13 Март, Пт сегодня           │
│  [10] [11] [12] [▓13▓] [14] [15] [16]              │
├─────────────────────────────────────────────────────┤
│  Заполнено: 2 из 7 филиалов                         │
├─────────────────────────────────────────────────────┤
│ ▼ Якутск клуб                        ✓ Заполнено   │
│   ┌─────────────────────────────────────────────┐   │
│   │  Выручка СЗ     │ тест  │ вторая            │   │
│   │──────────────────│───────│───────────────────│   │
│   │ Итого: 999       │  0    │  0                │   │
│   │──────────────────│───────│───────────────────│   │
│   │ Иванов И.И.      │       │                   │   │
│   │ 999              │  —    │  —                │   │
│   │──────────────────│───────│───────────────────│   │
│   │ Петров П.П.      │       │                   │   │
│   │ —                │  —    │  —                │   │
│   └─────────────────────────────────────────────┘   │
│                                                      │
│ ▶ Якутск клиника                     ✗ Не заполнено │
│ ▶ Санкт-Петербург клиника            ✗ Не заполнено │
│ ▶ Калининград клиника                ✗ Не заполнено │
└─────────────────────────────────────────────────────┘
```

### Мобильная адаптация (< 5 метрик)

Для мобильных: вместо горизонтальной таблицы — **вертикальный список метрик** внутри развёрнутого филиала:

```
▼ Якутск клуб                           ✓ Заполнено
  ┌───────────────────────────────────────────────┐
  │ ИТОГО ЗА ДЕНЬ                                 │
  │ Выручка СЗ: 999 ₽  ·  тест: 0  ·  вторая: 0 │
  ├───────────────────────────────────────────────┤
  │ 👤 Иванов И.И.                                │
  │ Выручка СЗ: 999 ₽  ·  тест: —  ·  вторая: —  │
  ├───────────────────────────────────────────────┤
  │ 👤 Петров П.П.                                │
  │ Выручка СЗ: —  ·  тест: —  ·  вторая: —       │
  └───────────────────────────────────────────────┘
```

Каждая метрика показывается как `Название: значение` — никаких цветных точек.

### Task Type
- [x] Frontend
- [x] Backend
- [x] Fullstack

## Implementation Steps

### Step 1: Backend — добавить employeeId в хранение фактов

**Файл:** `src/server/dashboard-metrics.js` (POST /daily-facts, строки 582-632)

Модифицировать `POST /daily-facts`:
1. Резолвить employee_id из JWT через `findEmployeeIdByTgUsername(req, req.user?.tg_username)`
2. Добавить `employeeId` к каждой записи manualData
3. Изменить upsert ключ: `period + storeId + employeeId`

```javascript
// Было: entry = { period, storeId, fact, plan }
// Стало: entry = { period, storeId, employeeId, employeeName, fact, plan }

// В POST /daily-facts:
const employeeId = await findEmployeeIdByTgUsername(req, req.user?.tg_username);
const employeeName = req.user?.employeename || '';

for (const { metricId, fact } of entries) {
  // ... existing validation ...
  const sid = storeId || '';
  const eid = employeeId || '';

  // NEW: match by (period, storeId, employeeId)
  const existingIdx = metric.manualData.findIndex(
    d => d.period === date && (d.storeId || '') === sid && (d.employeeId || '') === eid
  );

  const entry = {
    period: date,
    storeId: sid,
    employeeId: eid,
    employeeName: employeeName,
    fact: typeof fact === 'number' ? fact : parseFloat(fact) || 0,
    plan: 0,
  };
  // upsert...
}
```

**Обратная совместимость:** Старые записи без `employeeId` остаются как есть. При отображении группируются как "Без автора".

**ВАЖНО:** `findEmployeeIdByTgUsername` определена в `internal-api.js`, нужно либо вынести в shared module, либо передать через замыкание. Проще — сделать аналогичный вызов Frappe прямо в dashboard-metrics.js или импортировать хелпер.

### Step 2: Backend — модифицировать GET /facts-overview для employee breakdown

**Файл:** `src/server/dashboard-metrics.js` (GET /facts-overview, строки 521-579)

Добавить группировку по employeeId внутри каждого branch:

```javascript
// Новая структура ответа:
{
  branches: {
    [storeId]: {
      facts: { [metricId]: { fact: totalValue } },       // агрегат по branch
      monthTotals: { [metricId]: number },
      filled: boolean,
      employees: {                                         // NEW
        [employeeId]: {
          name: string,
          facts: { [metricId]: { fact: number } },
          monthTotals: { [metricId]: number },
          filled: boolean,
        }
      }
    }
  },
  totalsByMetric: { ... },
  date: string,
  metrics: [ ... ]
}
```

Логика:
```javascript
for (const metric of manualMetrics) {
  const entries = metric.manualData || [];

  for (const d of entries) {
    if ((d.storeId || '') !== sid) continue;
    const eid = d.employeeId || '__unknown__';
    const ename = d.employeeName || 'Без автора';

    if (!employees[eid]) {
      employees[eid] = { name: ename, facts: {}, monthTotals: {}, filled: false };
    }

    // Day fact
    if (d.period === date) {
      employees[eid].facts[metric.id] = { fact: d.fact || 0 };
      employees[eid].filled = true;
    }

    // Month total
    if (d.period.length === 10 && d.period.startsWith(month)) {
      employees[eid].monthTotals[metric.id] =
        (employees[eid].monthTotals[metric.id] || 0) + (d.fact || 0);
    }
  }

  // Branch total = sum across all employees
  facts[metric.id] = { fact: Object.values(employees)
    .reduce((acc, emp) => acc + (emp.facts[metric.id]?.fact || 0), 0) };
}
```

### Step 3: Backend — модифицировать GET /daily-facts для employee context

**Файл:** `src/server/dashboard-metrics.js` (GET /daily-facts)

Текущий GET daily-facts возвращает `{metricId, fact, plan}[]` для одного storeId. Нужно:
- Возвращать ВСЕ записи по branch (все employees) если запрашивает leader
- Добавить `employeeId`, `employeeName` к каждой записи

```javascript
// Вместо entries.find(d => d.period === date && storeId matches)
// Собрать все entries по date + storeId, группируя по employeeId
```

### Step 4: Frontend — обновить типы в internalApiClient.ts

**Файл:** `src/lib/internalApiClient.ts`

```typescript
export interface EmployeeFactsSummary {
  name: string;
  facts: Record<string, { fact: number }>;
  monthTotals: Record<string, number>;
  filled: boolean;
}

export interface BranchFactsSummary {
  facts: Record<string, { fact: number }>;
  monthTotals: Record<string, number>;
  filled: boolean;
  employees: Record<string, EmployeeFactsSummary>;  // NEW
}

// FactsOverviewResponse остаётся тем же, но BranchFactsSummary теперь включает employees
```

### Step 5: Frontend — полностью переписать LeaderFactsOverview.tsx

**Файл:** `src/components/leader-dashboard/LeaderFactsOverview.tsx`

Новый дизайн — аккордеон-список филиалов:

```tsx
// Структура компонента:
<div>
  {/* Calendar strip (оставить как есть) */}
  <CalendarStrip date={date} onDateChange={setDate} ... />

  {/* Summary: "Заполнено: N из M" */}
  <div>Заполнено: {filledCount} из {branches.length} филиалов</div>

  {/* Branch accordion list */}
  {branches.map(branch => {
    const branchData = overview?.branches[branch.store_id];
    const isExpanded = expandedBranch === branch.store_id;

    return (
      <div key={branch.store_id}>
        {/* Branch header row — clickable to expand */}
        <button onClick={() => toggleExpand(branch.store_id)}>
          <ChevronRight className={isExpanded ? 'rotate-90' : ''} />
          <span>{branch.name}</span>
          <FilledBadge filled={branchData?.filled} />
        </button>

        {/* Expanded content */}
        {isExpanded && (
          <div className="pl-4 border-l-2">
            {/* Branch totals row */}
            <div className="bg-muted/30 rounded-lg p-3 mb-2">
              <div className="text-xs font-medium text-muted-foreground mb-1">Итого за день</div>
              <div className="grid grid-cols-1 gap-1">
                {manualMetrics.map(m => (
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">{m.name}</span>
                    <span className="text-sm font-medium tabular-nums">
                      {formatNumber(branchData?.facts[m.id]?.fact || 0)}
                      {m.unit && <span className="text-[10px] ml-0.5">{m.unit}</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Employee rows */}
            {Object.entries(branchData?.employees || {}).map(([eid, emp]) => (
              <div key={eid} className="rounded-lg border p-3 mb-1.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium">{emp.name}</span>
                  <FilledBadge filled={emp.filled} small />
                </div>
                <div className="grid grid-cols-1 gap-0.5">
                  {manualMetrics.map(m => (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{m.name}</span>
                      <span className="tabular-nums">
                        {emp.facts[m.id] ? formatNumber(emp.facts[m.id].fact) : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Edit button */}
            <Button size="sm" variant="outline" onClick={() => setDrillDownBranch(branch.store_id)}>
              Редактировать факт
            </Button>
          </div>
        )}
      </div>
    );
  })}
</div>
```

Ключевые изменения:
1. **Аккордеон** вместо карточек: `expandedBranch` state, `ChevronRight` с rotate
2. **Metric names видны**: каждая метрика на отдельной строке с названием и значением
3. **Employee breakdown**: список менеджеров внутри развёрнутого филиала
4. **Drill-down Sheet остаётся**: кнопка "Редактировать факт" → открывает DailyFactCards

### Step 6: Frontend — обновить DailyFactCards для employee context

**Файл:** `src/components/leader-dashboard/DailyFactCards.tsx`

При загрузке фактов (loadFacts) — передавать текущий employee context. При сохранении — backend теперь сам добавляет employeeId из JWT.

Минимальные изменения: DailyFactCards продолжает работать как раньше (сохраняет за storeId), backend добавляет employeeId автоматически.

## Key Files

| File | Operation | Description |
|------|-----------|-------------|
| `src/server/dashboard-metrics.js:582-632` | Modify | POST /daily-facts: добавить employeeId из JWT |
| `src/server/dashboard-metrics.js:521-579` | Modify | GET /facts-overview: добавить employees breakdown |
| `src/lib/internalApiClient.ts` | Modify | Обновить типы BranchFactsSummary + EmployeeFactsSummary |
| `src/components/leader-dashboard/LeaderFactsOverview.tsx` | Rewrite | Аккордеон-таблица с employee breakdown |
| `src/hooks/useFactsOverview.ts` | No change | Хук остаётся как есть |
| `src/components/leader-dashboard/PlanFactSheet.tsx` | No change | Интеграция уже сделана |

## Risks and Mitigation

| Risk | Mitigation |
|------|------------|
| `findEmployeeIdByTgUsername` в другом модуле | Сделать HTTP call к Frappe прямо в dashboard-metrics.js (copy helper) |
| Старые факты без employeeId | Группировать как "__unknown__" / "Без автора" |
| Frappe API для resolve employee — медленный | Кэшировать в памяти (Map) на 5 минут |
| Много менеджеров в развёрнутом филиале | Scroll + lazy render (2-5 менеджеров обычно) |
| DailyFactCards GET загружает факты только по storeId | GET /daily-facts уже не разделяет по employee — загружает ВСЕ за branch, что корректно для суммы |

## Backward Compatibility

- Старые записи `{period, storeId, fact, plan}` (без employeeId) остаются валидными
- `employeeId || ''` = пустая строка = "Без автора"
- GET /facts-overview корректно агрегирует и старые, и новые записи
- POST /daily-facts при отсутствии JWT/employee сохраняет с `employeeId: ''`

## Verification

1. `npx vite build` — без ошибок
2. POST /daily-facts сохраняет с employeeId
3. GET /facts-overview возвращает employees breakdown
4. UI: аккордеон с филиалами → раскрытие → менеджеры с фактами
5. Старые факты (без employeeId) отображаются как "Без автора"
6. Drill-down (DailyFactCards) продолжает работать
7. Итого филиала = сумма фактов менеджеров

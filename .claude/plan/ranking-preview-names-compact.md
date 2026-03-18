# План: Улучшение AdminRankingPreview — названия + компактная таблица

## Context
AdminRankingPreview показывает топ-3 строки рейтинга в админке, но отображает сырые ID вместо человеческих названий. Нужно:
1. Для филиалов (branch) — резолвить ID через `BRANCHES` / `getBranchName()`
2. Для менеджеров (manager) — загружать имена через `getEmployeesByStores()` API
3. Сделать визуально как компактную таблицу (аналог BranchRankingTable/ManagerRankingTable)

## Task Type
- [x] Frontend

## Техническое решение

### Резолвинг имён

**Филиалы:** Используем `BRANCHES` из `src/data/branchData.ts` — это статический массив `{ id, name }`. Строим Map и резолвим `storeId → name`. Если не найдено — показываем ID как fallback.

**Менеджеры:** Вызываем `internalApiClient.getEmployeesByStores({ storeIds, limit: 500 })` один раз и строим Map `employee.name → employee.employee_name`. Это тот же подход что в ManagerRankingTable (строка 376-381).

### Компактная таблица

Взять стилистику из ranking tables:
- Заголовок-строка с колонками: `#`, `Название`, `Факт`, `План`
- Чередующиеся строки (`bg-muted/30`)
- Цветовая индикация: зелёный если факт ≥ план, красный если меньше
- `text-[11px]`, `tabular-nums`, `truncate` для имён
- Максимум 5 строк (вместо 3) для большей наглядности

## Шаги реализации

### 1. Модифицировать AdminRankingPreview
**Файл:** `src/components/admin/AdminRankingPreview.tsx`

**Изменения:**
- Импортировать `BRANCHES` из `@/data/branchData` для резолвинга филиалов
- Импортировать `internalApiClient` для загрузки сотрудников
- Добавить `useState` + `useEffect` для загрузки имён менеджеров (когда `entityType === 'manager'`)
- Построить `nameById: Map<string, string>` — для branch из BRANCHES, для manager из API
- В `rows` useMemo — использовать `nameById.get(id) ?? id` вместо голого `id`
- Добавить `plan` значение в Row тип (для отображения в таблице)
- Переверстать рендер: заголовок + строки с `#`, `Имя`, `Факт`, `План`, индикатор ▲/▼
- Увеличить до 5 строк
- Добавить чередование строк

### Pseudo-code:

```tsx
// Name resolution
const nameById = useMemo(() => {
  if (entityType === 'branch') {
    return new Map(BRANCHES.map(b => [b.id, b.name]));
  }
  return employeeNames; // from useState, loaded via API
}, [entityType, employeeNames]);

// Load manager names
useEffect(() => {
  if (entityType !== 'manager' || storeIds.length === 0) return;
  internalApiClient.getEmployeesByStores({ storeIds, limit: 500 })
    .then(employees => {
      setEmployeeNames(new Map(
        employees.map(e => [String(e.name), e.employee_name || e.name])
      ));
    });
}, [entityType, storeIds]);

// Row construction
rows = items.map(([id, data]) => ({
  name: nameById.get(id) ?? id,
  fact: toNumber(data.fact_value),
  plan: toNumber(data.plan_value),
}))
.sort((a, b) => b.fact - a.fact)
.slice(0, 5);

// Render — compact table
<div>
  {/* Header */}
  <div className="grid grid-cols-[1rem_1fr_3.5rem_3.5rem] px-1 py-0.5 text-[10px] text-muted-foreground font-medium border-b">
    <span>#</span>
    <span>{entityType === 'branch' ? 'Филиал' : 'Сотрудник'}</span>
    <span className="text-right">Факт</span>
    <span className="text-right">План</span>
  </div>
  {/* Rows */}
  {rows.map((row, i) => (
    <div className={cn(
      "grid grid-cols-[1rem_1fr_3.5rem_3.5rem] px-1 py-0.5 text-[11px]",
      i % 2 === 1 && "bg-muted/30"
    )}>
      <span>{i + 1}</span>
      <span className="truncate">{row.name}</span>
      <span className={cn("text-right tabular-nums font-semibold",
        row.fact >= row.plan ? "text-emerald-500" : "text-red-500"
      )}>{fmt(row.fact)}</span>
      <span className="text-right tabular-nums text-muted-foreground">{fmt(row.plan)}</span>
    </div>
  ))}
</div>
```

## Ключевые файлы

| Файл | Операция | Описание |
|------|----------|----------|
| `src/components/admin/AdminRankingPreview.tsx` | Modify | Добавить name resolution + compact table layout |

## Риски и митигация

| Риск | Митигация |
|------|-----------|
| Доп. API запрос для менеджеров | Запрос делается один раз, результат в useState. Кеширование через React lifecycle |
| BRANCHES не содержит все филиалы | Fallback на ID — всегда показываем хоть что-то |
| Много менеджеров — долгая загрузка | `limit: 500` достаточно, показываем loading state |

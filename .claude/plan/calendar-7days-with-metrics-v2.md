# Plan: Календарь по календарному месяцу со стрелками и итогом

## Задача

Переделать календарную полосу в `DailyFactCards.tsx`:
1. **Календарь = календарный месяц** (1–28/30/31), а не "последние 30 дней"
2. **Стрелки ◀ ▶ для переключения месяцев** (как в Plan tab)
3. **В центре между стрелками — название месяца + итог** (сумма по метрикам)
4. Под каждым днём — значения метрик (уже реализовано)
5. Автоскролл к сегодня / выбранному дню (уже реализовано)
6. `useFactHistory` — запрашивать данные за нужный месяц (пересчитать `days`)

## Текущее состояние

- `generateDateRange(30)` — генерирует 30 дней назад от сегодня (не привязано к месяцу)
- `useFactHistory(branchId, 30)` — загружает историю за 30 дней
- Заголовок: `formatDateLabel(date)` — показывает выбранную дату
- Нет навигации по месяцам

## Новый дизайн

```
┌──────────────────────────────────────────────────┐
│  ◀   Март 2026 · Итого: 1 250 / 340 / 89   ▶   │
│                                                   │
│  13 мар, чт  сегодня                              │
│                                                   │
│  ┌─сб─┐ ┌─вс─┐ ... ┌─чт─┐ ┌─пт─┐ ┌─сб─┐       │
│  │  1 │ │  2 │ ... │[13]│ │ 14 │ │ 15 │ ...     │
│  │120 │ │ — │ ... │  . │ │    │ │    │ ...     │
│  │  5 │ │ — │ ... │  . │ │    │ │    │ ...     │
│  └────┘ └────┘ ... └────┘ └────┘ └────┘ ...     │
└──────────────────────────────────────────────────┘
```

Итог в заголовке — сумма `monthTotals` для каждой метрики, через `/`.

## Task Type
- [x] Frontend
- [ ] Backend
- [ ] Fullstack

## Implementation Steps

### Step 1: Заменить `generateDateRange` на `generateMonthDates`

Новая функция генерирует все дни конкретного месяца:

```tsx
function generateMonthDates(year: number, month: number): string[] {
  const dates: string[] = [];
  const daysInMonth = new Date(year, month, 0).getDate(); // month is 1-based
  for (let d = 1; d <= daysInMonth; d++) {
    dates.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  return dates;
}
```

### Step 2: Добавить state для текущего месяца

Вместо фиксированного `generateDateRange(30)`, вводим state `calendarMonth`:

```tsx
// Derive initial month from selected date
const [calendarMonth, setCalendarMonth] = useState(() => {
  const t = todayStr();
  return { year: parseInt(t.slice(0, 4)), month: parseInt(t.slice(5, 7)) };
});

const calendarDates = useMemo(
  () => generateMonthDates(calendarMonth.year, calendarMonth.month),
  [calendarMonth.year, calendarMonth.month]
);
```

### Step 3: Навигация по месяцам — стрелки

Добавить callbacks:

```tsx
const prevMonth = useCallback(() => {
  setCalendarMonth(prev => {
    if (prev.month === 1) return { year: prev.year - 1, month: 12 };
    return { ...prev, month: prev.month - 1 };
  });
}, []);

const nextMonth = useCallback(() => {
  setCalendarMonth(prev => {
    if (prev.month === 12) return { year: prev.year + 1, month: 1 };
    return { ...prev, month: prev.month + 1 };
  });
}, []);
```

### Step 4: Пересчитать `useFactHistory` для месяца

Вместо `useFactHistory(branchId, 30)`, вычислить количество дней от начала месяца до сегодня (или весь месяц если прошлый):

```tsx
const historyDays = useMemo(() => {
  const today = new Date();
  const monthStart = new Date(calendarMonth.year, calendarMonth.month - 1, 1);
  const diffMs = today.getTime() - monthStart.getTime();
  return Math.max(Math.ceil(diffMs / 86400000) + 1, calendarDates.length);
}, [calendarMonth, calendarDates.length]);

const { data: historyData } = useFactHistory(branchId, historyDays);
```

**Важно:** серверный endpoint `fact-history` принимает `days` и считает от сегодня назад. Для прошлых месяцев может потребоваться `days = 90`. Endpoint уже поддерживает `max 90`.

### Step 5: Переделать header — стрелки + месяц + итоги

Заменить текущий header:

```tsx
{/* Month navigation + totals */}
<div className="flex items-center justify-between px-3 mb-1">
  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={prevMonth}>
    <ChevronLeft className="w-4 h-4" />
  </Button>
  <div className="text-center">
    <span className="text-sm font-semibold capitalize">
      {MONTHS_FULL[calendarMonth.month - 1]} {calendarMonth.year}
    </span>
    {/* Month totals per metric, compact */}
    {Object.keys(monthTotals).length > 0 && (
      <div className="flex items-center justify-center gap-1 mt-0.5">
        {manualMetrics.map((m, i) => (
          <span key={m.id} className="text-[10px] tabular-nums text-muted-foreground">
            {i > 0 && <span className="mx-0.5">·</span>}
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-0.5 align-middle" style={{ backgroundColor: m.color || '#3b82f6' }} />
            {formatNumber(monthTotals[m.id] || 0)}
          </span>
        ))}
      </div>
    )}
  </div>
  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={nextMonth}>
    <ChevronRight className="w-4 h-4" />
  </Button>
</div>
```

Нужно добавить массив `MONTHS_FULL`:

```tsx
const MONTHS_FULL = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
```

### Step 6: Оставить строку выбранной даты

Под стрелками, перед скроллом — лейбл выбранной даты (`formatDateLabel(date)` + "сегодня").

### Step 7: Синхронизировать выбор даты и месяц

При клике на дату в календаре — `setDate(d)` уже работает.
При переключении месяца — автоматически выбирать 1-й день нового месяца (или сегодня если это текущий месяц):

```tsx
// After month change, set date to 1st or today
useEffect(() => {
  const todayDate = todayStr();
  const todayMonth = parseInt(todayDate.slice(5, 7));
  const todayYear = parseInt(todayDate.slice(0, 4));
  if (calendarMonth.year === todayYear && calendarMonth.month === todayMonth) {
    setDate(todayDate);
  } else {
    setDate(`${calendarMonth.year}-${String(calendarMonth.month).padStart(2, '0')}-01`);
  }
}, [calendarMonth]);
```

### Step 8: Убрать `showMonth` логику

Все дни одного месяца — всегда показываем день недели.

### Step 9: Пересчитать monthTotals при смене месяца

`monthTotals` возвращается из `getDailyFacts(date, branchId)`. При смене `date` через useEffect (Step 7) автоматически подгрузится новый `monthTotals` для нового месяца — т.к. endpoint вычисляет `month = date.slice(0, 7)`.

Уже работает без изменений.

## Key Files

| File | Operation | Description |
|------|-----------|-------------|
| `DailyFactCards.tsx:38-48` | Replace | `generateDateRange` → `generateMonthDates` |
| `DailyFactCards.tsx:36` | Add | `MONTHS_FULL` array |
| `DailyFactCards.tsx:75,90-96` | Rewrite | `calendarMonth` state + `calendarDates` memo + history days calc |
| `DailyFactCards.tsx:243-248` | Rewrite | Header: стрелки + месяц + итоги вместо `formatDateLabel` |
| `DailyFactCards.tsx:263` | Remove | `showMonth` logic (не нужно, все дни одного месяца) |

## Risks and Mitigation

| Risk | Mitigation |
|------|------------|
| `fact-history` endpoint max 90 дней — не хватит для старых месяцев | Для текущего и прошлого месяца 90 дней хватает. Для более старых — данные могут быть неполные, но это edge case |
| При переключении месяца — два API-запроса (getDailyFacts + getFactHistory) | Оба кэшируются React Query, повторный визит мгновенный |
| `monthTotals` привязан к `getDailyFacts(date)`, а не к `calendarMonth` | Sync через useEffect Step 7: при смене месяца автоматически меняется `date` → перезагружается `monthTotals` |

## Verification

1. `npx vite build` — без ошибок
2. Стрелки переключают месяц, дни обновляются (1–28/30/31)
3. В header — название месяца + итоги с цветными точками
4. Под каждым днём — значения метрик
5. Автоскролл к сегодня при текущем месяце
6. При переключении месяца — выбирается 1-й день

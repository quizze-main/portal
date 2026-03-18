# Plan: Календарь на весь месяц с метриками под каждым днём

## Задача

Переделать календарную полосу в `DailyFactCards.tsx`:
- Календарь **на весь месяц** (30 дней) — горизонтальный скролл
- Видимая область по умолчанию — **последние ~7 дней** (автоскролл вправо)
- Карточки дней **крупнее** — чтобы видимых помещалось ~7
- **Под каждой карточкой дня** — значения всех метрик за этот день

## Текущее состояние

Календарь — горизонтальный скролл 30 кнопок шириной `w-11` (~44px). Под числом — только точка-индикатор (заполнено/нет). Данные истории уже загружены через `useFactHistory(branchId, 30)`.

## Новый дизайн

```
  ◀ скролл                    видимая область (~7 дней)                    ▶
  ┌────┐ ┌────┐  ...  ┌─пн─┐ ┌─вт─┐ ┌─ср─┐ ┌─чт─┐ ┌─пт─┐ ┌─сб─┐ ┌─вс─┐
  │  1 │ │  2 │  ...  │  7 │ │  8 │ │  9 │ │ 10 │ │ 11 │ │ 12 │ │[13]│
  │ —  │ │ —  │  ...  │120 │ │ 95 │ │110 │ │  — │ │130 │ │ 88 │ │  . │
  │ —  │ │ —  │  ...  │  5 │ │  3 │ │  7 │ │  — │ │  4 │ │  6 │ │  . │
  └────┘ └────┘  ...  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘
```

Каждая карточка дня содержит:
- День недели (пн, вт...) — вверху мелким шрифтом
- Число (7, 8, 9...) — крупно
- Значения метрик — по строке на метрику, мелким шрифтом
- `—` если факт не заполнен за этот день
- Выбранный день — primary цвет (как сейчас)
- Заполненный день — emerald фон (как сейчас)

## Task Type
- [x] Frontend
- [ ] Backend
- [ ] Fullstack

## Implementation Steps

### Step 1: Рассчитать ширину карточки = 1/7 видимой области

Карточки должны быть такого размера, чтобы 7 штук помещались в видимую область. Используем CSS `calc()`:

```tsx
// Ширину карточки задаём через inline style, чтобы ровно 7 помещались
// Контейнер имеет px-2 (8px с каждой стороны), gap-1.5 (6px) между карточками
// 7 карточек = 6 гэпов
// cardWidth = calc((100% - 6 * 6px) / 7) ≈ calc((100% - 36px) / 7)
// Но проще: задаём фиксированную ширину через CSS custom property

// Используем w-[calc((100%-36px)/7)] или просто w-[13%] (≈100/7.5)
// Лучше: min-w-[calc((100vw-52px)/7)] — учитывая px-4 контейнера + px-2 календаря
```

**Решение:** задать `min-w-[calc((100%-36px)/7)]` на каждой кнопке, где 36px = 6 гэпов по 6px.

Или проще: `w-[calc(100%/7-5px)]` с `shrink-0`.

### Step 2: Подготовить lookup-карту фактов по дате

```tsx
// Map: date → metricId → fact value
const factsByDate = useMemo(() => {
  const map: Record<string, Record<string, number | null>> = {};
  if (!historyData?.history) return map;
  for (const [metricId, metricData] of Object.entries(historyData.history)) {
    for (const entry of metricData.entries) {
      if (!map[entry.date]) map[entry.date] = {};
      map[entry.date][metricId] = entry.fact;
    }
  }
  return map;
}, [historyData]);
```

### Step 3: Изменить карточку дня — добавить метрики под числом

Заменить filled indicator dot на блок значений метрик:

```tsx
<button
  key={d}
  ref={isSelected ? selectedDateRef : undefined}
  type="button"
  onClick={() => setDate(d)}
  style={{ minWidth: 'calc((100% - 36px) / 7)' }}
  className={`flex flex-col items-center shrink-0 py-2 rounded-lg transition-all ${
    isSelected
      ? 'bg-primary text-primary-foreground shadow-sm'
      : isFilled
        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-foreground hover:bg-emerald-200 dark:hover:bg-emerald-900/50'
        : 'hover:bg-background/80 text-muted-foreground'
  }`}
>
  {/* Weekday / month label */}
  <span className={`text-[10px] leading-none ${...}`}>
    {showMonth ? MONTHS_SHORT[dateObj.getMonth()] : wd}
  </span>
  {/* Day number */}
  <span className={`text-base font-semibold leading-tight mt-0.5 ${...}`}>
    {dayNum}
  </span>
  {/* Metric values */}
  <div className="mt-1 flex flex-col items-center gap-px w-full">
    {manualMetrics.map(m => {
      const val = factsByDate[d]?.[m.id];
      return (
        <span
          key={m.id}
          className={`text-[9px] tabular-nums leading-tight ${
            isSelected ? 'text-primary-foreground/70' : val != null ? 'text-foreground/70' : 'text-muted-foreground/40'
          }`}
        >
          {val != null ? formatNumber(val) : '—'}
        </span>
      );
    })}
  </div>
</button>
```

### Step 4: Убрать мини-историю (стрелки) из footer карточек метрик

Удалить IIFE-блок `(() => { const metricHistory = ... })()` из footer.
Оставить только строку "Итого за месяц".

### Step 5: Автоскролл к выбранному дню (оставить как есть)

`useEffect` с `scrollIntoView` уже работает — при загрузке покажет сегодняшний день (правый край), т.е. видны последние ~7 дней. Оставляем без изменений.

`calendarRef` и `selectedDateRef` — оставляем.

## Key Files

| File | Operation | Description |
|------|-----------|-------------|
| `DailyFactCards.tsx:90-96` | Modify | Добавить `factsByDate` useMemo |
| `DailyFactCards.tsx:237-290` | Rewrite | Карточки: убрать `w-11`, добавить `minWidth` + метрики под числом |
| `DailyFactCards.tsx:353-375` | Remove | Убрать мини-историю стрелками из footer |

## Risks and Mitigation

| Risk | Mitigation |
|------|------------|
| Если метрик много (5+), карточки высокие | Ограничить до 3-4, показать `+N` |
| На маленьких экранах (<360px) тесно | `text-[9px]` + truncate — обрежется |
| Данные загружаются async | Пока нет данных — `—`, потом обновится |
| `gap-1.5` в calc может не совпадать | Используем `gap` в CSS variable или `gap-1` (4px) для точности |

## Verification

1. `npx vite build` — без ошибок
2. Визуально: 30 дней в скролле, видны последние 7
3. Под каждым днём — значения метрик
4. Автоскролл к выбранному дню
5. Footer карточек — только "Итого за месяц"

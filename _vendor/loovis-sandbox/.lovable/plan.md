
# План: Создать сотрудников для каждого филиала

## Текущее состояние

- **7 филиалов** в системе
- **5 менеджеров** без привязки к филиалам (используются глобально)
- Нет связи "филиал → сотрудники"

## Что делаем

Создаём **уникальных сотрудников для каждого филиала** с разными именами и количеством (3-5 человек).

## Структура данных

```typescript
// Новый интерфейс привязки сотрудников к филиалам
export interface BranchEmployee {
  id: string;           // Уникальный ID (branchId_firstName_lastName)
  name: string;         // ФИО
  role: string;         // Должность
  avatar?: string;      // Фото
  branchId: string;     // ID филиала
}

// Маппинг филиал → сотрудники
export const BRANCH_EMPLOYEES: Record<string, BranchEmployee[]>
```

## Распределение сотрудников по филиалам

| Филиал | Кол-во | Имена |
|--------|--------|-------|
| Москва клуб | 5 | Елена Новикова, Анна Петрова, Дмитрий Волков, Иван Сидоров, Мария Козлова |
| СПб клиника | 4 | Ольга Смирнова, Андрей Кузнецов, Татьяна Лебедева, Сергей Павлов |
| Калининград клуб | 4 | Наталья Белова, Виктор Орлов, Екатерина Морозова, Алексей Соколов |
| Калининград клиника | 3 | Марина Волкова, Павел Григорьев, Юлия Федорова |
| Якутск клуб | 4 | Светлана Тихонова, Михаил Попов, Ирина Макарова, Николай Васильев |
| Якутск клиника | 3 | Артем Егоров, Ксения Романова, Денис Захаров |
| Казань клуб | 3 | Оксана Королева, Владимир Степанов, Анастасия Никитина |

**Итого: 26 уникальных сотрудников**

## Изменения по файлам

### 1. `src/data/branchData.ts`

Добавляем:
- Интерфейс `BranchEmployee`
- Константа `BRANCH_EMPLOYEES` с сотрудниками для каждого филиала
- Функция `getBranchEmployees(branchId: string)` — получить сотрудников филиала
- Функция `getEmployeeBranch(employeeId: string)` — получить филиал сотрудника

```typescript
export interface BranchEmployee {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  branchId: string;
}

export const BRANCH_EMPLOYEES: Record<string, BranchEmployee[]> = {
  moscow_club: [
    { id: 'elena_novikova', name: 'Елена Новикова', role: 'Старший консультант', branchId: 'moscow_club', avatar: '...' },
    { id: 'anna_petrova', name: 'Анна Петрова', role: 'Консультант', branchId: 'moscow_club', avatar: '...' },
    // ... ещё 3
  ],
  spb_clinic: [
    { id: 'olga_smirnova_spb', name: 'Ольга Смирнова', role: 'Консультант', branchId: 'spb_clinic', avatar: '...' },
    // ... ещё 3
  ],
  // ... остальные филиалы
};

export function getBranchEmployees(branchId: string): BranchEmployee[] {
  return BRANCH_EMPLOYEES[branchId] || [];
}
```

### 2. `src/data/branchMetricsData.ts`

Обновляем генерацию данных рейтинга филиалов:
- Импортируем `BRANCH_EMPLOYEES`
- Добавляем поле `employeesCount` в `BranchRankingData`

## Использование

После реализации можно будет:
1. Показывать сотрудников конкретного филиала в детальной карточке
2. Фильтровать рейтинг менеджеров по выбранному филиалу
3. Строить аналитику по сотрудникам в рамках филиала

## Сводка изменений

| Файл | Изменение |
|------|-----------|
| `src/data/branchData.ts` | Добавить `BranchEmployee`, `BRANCH_EMPLOYEES`, хелперы |
| `src/data/branchMetricsData.ts` | Добавить `employeesCount` в интерфейс |

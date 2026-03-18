# Plan: Manager-Level Metrics Breakdown in Plan/Fact Table

## Implementation Plan: Manager Metrics Breakdown

### Task Type
- [x] Frontend (expandable rows in PlanFactTable)
- [x] Backend (new endpoint for per-manager data)
- [x] Fullstack (parallel)

### Technical Solution

When a specific branch is selected (not "Все филиалы"), each metric row becomes expandable. Clicking on a metric row reveals per-manager sub-rows showing their individual plan/fact/% values.

**Data availability by source type:**
- **Tracker metrics**: Full plan + fact per manager (plan from MetricPlan scope=employee, fact from Tracker API by_managers)
- **External API metrics**: Plan per manager (from MetricPlan), fact per manager (from Tracker API if available)
- **Manual metrics**: Plan per manager (from MetricPlan distribution), fact = "—" (manual facts are store-level only)
- **Computed metrics**: Plan per manager (if set), fact = "—" (computed at store level)

### Implementation Steps

#### Step 1: New BFF Endpoint — `/api/motivation/manager-breakdown`

**File:** `src/server/internal-api.js`

New endpoint that aggregates manager-level data for a branch:

```
GET /api/motivation/manager-breakdown?branchId=X&period=2026-03&metricIds=a,b,c
```

**Server logic:**
1. Fetch managers for the branch via `loovis_get_employee_role` → department → employees (reuse existing mapping logic from `/api/frappe/employees/by-stores`)
2. Load MetricPlan entries with `scope='employee'` for these managers + requested metrics + period
3. For tracker/external_api metrics: call Tracker API with `by_managers=True` for the store
4. Build response mapping employee → metric → { plan, fact, percent }

**Response:**
```json
{
  "managers": [
    {
      "employee_id": "EMP-001",
      "employee_name": "Иванов Иван",
      "itigris_id": "12345",
      "metrics": {
        "revenue_created": { "plan": 50000, "fact": 42000, "percent": 84 },
        "csi": { "plan": 90, "fact": 88, "percent": 97.8 },
        "manual_metric_1": { "plan": 100, "fact": null, "percent": null }
      }
    }
  ],
  "period": "2026-03",
  "branchId": "store_123"
}
```

**Key details:**
- Manager's itigris_id (`custom_itigris_user_id`) is needed to match Tracker API response keys
- Plans come from MetricPlan where `scope='employee'` and `scopeId=employee_id`
- Facts from Tracker API keyed by `itigris_id`
- For manual metrics, fact = null (not tracked per manager)
- Max 20 metricIds per request (same as existing endpoints)

#### Step 2: Client API Method

**File:** `src/lib/internalApiClient.ts`

```typescript
async getManagerBreakdown(
  branchId: string,
  period: string,
  metricIds: string[],
): Promise<{
  managers: Array<{
    employee_id: string;
    employee_name: string;
    metrics: Record<string, { plan: number | null; fact: number | null; percent: number | null }>;
  }>;
}>
```

#### Step 3: Custom Hook — `useManagerBreakdown`

**File:** `src/hooks/useManagerBreakdown.ts` (new)

```typescript
export function useManagerBreakdown(branchId: string, period: string, metricIds: string[], enabled: boolean) {
  return useQuery({
    queryKey: ['manager-breakdown', branchId, period, metricIds.join(',')],
    queryFn: () => internalApiClient.getManagerBreakdown(branchId, period, metricIds),
    enabled: enabled && !!branchId && branchId !== '__all__' && metricIds.length > 0,
    staleTime: 60_000,
  });
}
```

**Fetching strategy:** Prefetch when branch is selected (not lazy on expand). Data is small (5-10 managers × 10-20 metrics) and allows instant expand/collapse.

#### Step 4: Expand/Collapse UI in PlanFactTable

**File:** `src/components/plan-fact/PlanFactTable.tsx`

**Interaction design:**
- ChevronRight icon at start of metric row (only when branch selected, not "Все филиалы")
- Click on row or chevron → toggles expand
- Chevron rotates 90° when expanded
- Multiple rows can be expanded simultaneously

**Manager sub-row design:**
```
│  ├ Иванов И.И.     │  16 667  │  14 200  │  85%  │ 🟡  │
│  ├ Петрова А.С.    │  16 667  │  18 000  │ 108%  │ 🟢  │
│  └ Сидоров К.Н.    │  16 666  │  12 500  │  75%  │ 🟡  │
```

- Indented with tree connector (├ / └)
- Smaller text (text-[11px])
- Slightly muted background (bg-muted/10)
- Same columns alignment as parent row
- Manager name truncated with tooltip for full name
- If fact = null → show "—" with muted color
- Status dot follows same color logic (green/yellow/red/gray)

**Loading state:** Spinner in expanded area if data not yet loaded

**State management:**
```typescript
const [expandedMetrics, setExpandedMetrics] = useState<Set<string>>(new Set());
const toggleExpand = (metricId: string) => {
  setExpandedMetrics(prev => {
    const next = new Set(prev);
    next.has(metricId) ? next.delete(metricId) : next.add(metricId);
    return next;
  });
};
```

#### Step 5: Wire Up Data Flow

In `ManualDataEntry.tsx`, pass manager breakdown data to `PlanFactTable`:

```typescript
const metricIds = dashboard.metrics.map(m => m.id);
const managerData = useManagerBreakdown(
  selectedBranch,
  period,
  metricIds,
  selectedBranch !== '__all__',
);
```

Pass `managerData.data?.managers` as prop to `PlanFactTable`.

### Key Files

| File | Operation | Description |
|------|-----------|-------------|
| `src/server/internal-api.js` | Modify | Add `/api/motivation/manager-breakdown` endpoint |
| `src/lib/internalApiClient.ts` | Modify | Add `getManagerBreakdown()` method |
| `src/hooks/useManagerBreakdown.ts` | New | React Query hook for manager data |
| `src/components/plan-fact/PlanFactTable.tsx` | Modify | Add expand/collapse rows with manager sub-rows |
| `src/pages/ManualDataEntry.tsx` | Modify | Wire hook + pass data to table |

### Risks and Mitigation

| Risk | Mitigation |
|------|------------|
| Tracker API `by_managers` not available for all metric codes | Gracefully handle: return fact=null for unsupported metrics |
| itigris_id mapping mismatch (Tracker uses itigris ID, MetricPlan uses employee_id) | Endpoint maps both: fetches employees with `custom_itigris_user_id`, builds bidirectional map |
| Large number of managers in a branch | Limit to 50 managers max; data is small per row |
| Manual metric facts not available per manager | Show "—" clearly; SourceBadge already indicates "вручную" |
| Tracker API latency | Prefetch on branch select; staleTime=60s; loading spinner |

### Verification

1. Select a branch → metric rows show expand chevron
2. Click expand → manager sub-rows appear with plan/fact/%/status
3. Tracker metrics show full data (plan + fact + %)
4. Manual metrics show plan only, fact = "—"
5. "Все филиалы" mode → no expand chevrons (aggregated view)
6. Collapse/expand toggles smoothly
7. Multiple metrics can be expanded simultaneously
8. `npx vite build` passes

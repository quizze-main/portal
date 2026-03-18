# Implementation Plan: Extend Field Mapping Entity Types

## Task Type
- [x] Frontend
- [x] Backend
- [x] Fullstack (Parallel)

## Context

Currently `FieldMapping.entityType` supports only `'branch' | 'employee'`. The user wants to expand mappings with more entity types that can have correspondence between internal and external systems.

**What exists now:**
- `branch` — maps store IDs (e.g., `1000000008`) to external values (e.g., AmoCRM pipeline_id)
- `employee` — maps employee IDs (e.g., `HR-EMP-00138`) to external values (e.g., responsible_user_id)

**What the user wants:** More entity types that can be mapped:
- Departments, designations/positions, and arbitrary custom key-value pairs

## Technical Solution

### New Entity Types

| EntityType | Description | Internal ID source | Backend resolution | UI entity list |
|---|---|---|---|---|
| `department` | Frappe departments | `department.name` (e.g., "Клуб Москва") | From JWT: add `department` field to token | `GET /api/admin/departments` (already exists) |
| `designation` | Job titles / positions | `designation.name` (e.g., "Менеджер заботы") | From JWT: `req.user.designation` (already available!) | `GET /api/admin/designations` (already exists) |
| `custom` | Free-form key-value pairs | User-defined keys (e.g., "pipeline_sales", "team_a") | No auto-resolution — static query param injection | Manual input in UI |

### Backend Resolution Logic (how values are applied)

```
Request: GET /api/top-leader-metrics?store_id=1000000008&date_from=2026-03-01
JWT: { employeename: "Дулов (HR-EMP-00138)", designation: "Менеджер заботы", department: "Клуб Москва" }

For each merged fieldMapping:
  entityType === 'branch'      → lookup values[storeFilterGlobal[0]]       // existing
  entityType === 'employee'    → lookup values[currentEmployeeId]           // existing
  entityType === 'department'  → lookup values[req.user.department]         // NEW
  entityType === 'designation' → lookup values[req.user.designation]        // NEW
  entityType === 'custom'      → apply ALL values as static query params   // NEW
```

### Visibility Logic (who sees what)

```
entityType === 'branch'      → visible if values[storeId] exists           // existing
entityType === 'employee'    → visible always (employee-level filtering)   // existing
entityType === 'department'  → visible if values[user.department] exists   // NEW
entityType === 'designation' → visible if values[user.designation] exists  // NEW
entityType === 'custom'      → visible always (static params)             // NEW
```

## Implementation Steps

### Step 1: Add `department` to JWT payload

**File:** `server.js` (lines 360-389)

Expand the Frappe employee fetch to include `department` alongside `designation`:

```javascript
// Current: fields=["designation"]
// New:     fields=["designation","department"]
const frappeRes = await fetch(
  `${FRAPPE_BASE_URL}/api/resource/Employee/${empId}?fields=["designation","department"]`,
  { headers: { 'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}` }, signal: AbortSignal.timeout(5000) }
);
if (frappeRes.ok) {
  const data = await frappeRes.json();
  designation = data?.data?.designation || null;
  department = data?.data?.department || null;  // NEW
}

const payload = {
  tg_username, employeename, tg_chat_id,
  designation,
  department,  // NEW
  demo: false
};
```

- Expected deliverable: JWT now contains `department` field

### Step 2: Expand `FieldMapping.entityType` type

**File:** `src/lib/internalApiClient.ts` (line 411)

```typescript
// Before:
entityType: 'branch' | 'employee';

// After:
entityType: 'branch' | 'employee' | 'department' | 'designation' | 'custom';
```

- Expected deliverable: TypeScript type expanded

### Step 3: Backend — add resolution logic for new entity types

**File:** `src/server/internal-api.js`

**3a. Visibility filter** (~line 2120-2145):
Add department/designation visibility check alongside branch check.

```javascript
// After branch visibility check:
const deptMappings = merged.filter(fm => fm.entityType === 'department');
if (deptMappings.length > 0 && req.user?.department) {
  const hasValueForDept = deptMappings.some(fm => fm.values && fm.values[req.user.department]);
  if (!hasValueForDept) return false;
}

const desigMappings = merged.filter(fm => fm.entityType === 'designation');
if (desigMappings.length > 0 && req.user?.designation) {
  const hasValueForDesig = desigMappings.some(fm => fm.values && fm.values[req.user.designation]);
  if (!hasValueForDesig) return false;
}
// custom: always visible (static params, no auto-filter)
```

**3b. Query param injection** (~line 2430-2450):
Add new cases to the mapping loop.

```javascript
if (mapping.entityType === 'department' && req.user?.department) {
  const mappedValue = mapping.values?.[req.user.department];
  if (mappedValue) _queryParams[mapping.apiField] = mappedValue;
}
if (mapping.entityType === 'designation' && req.user?.designation) {
  const mappedValue = mapping.values?.[req.user.designation];
  if (mappedValue) _queryParams[mapping.apiField] = mappedValue;
}
if (mapping.entityType === 'custom') {
  // Apply ALL custom values as static params
  for (const [, value] of Object.entries(mapping.values || {})) {
    if (value) _queryParams[mapping.apiField] = value;
  }
}
```

- Expected deliverable: Backend applies department/designation/custom mappings

### Step 4: Frontend API — add methods to load departments & designations

**File:** `src/lib/internalApiClient.ts`

Add two methods:

```typescript
async getDepartments(): Promise<Array<{ name: string; department_name: string; custom_store_id?: string; parent_department?: string }>> {
  const response = await fetch(`${this.baseUrl.replace('/frappe', '')}/admin/departments`, { credentials: 'include' });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const result = await response.json();
  return result.data || [];
}

async getDesignations(): Promise<Array<{ name: string }>> {
  const response = await fetch(`${this.baseUrl.replace('/frappe', '')}/admin/designations`, { credentials: 'include' });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const result = await response.json();
  return result.data || [];
}
```

- Expected deliverable: Frontend can fetch department/designation lists

### Step 5: UI — expand DataSourceFieldMappings for new entity types

**File:** `src/components/admin/AdminDataSources.tsx`

In `DataSourceFieldMappings` component:

**5a. Expand entity type selector** — add `department`, `designation`, `custom` options.

**5b. Auto-populate rows per entity type:**
- `branch` → rows from `getAllBranchesWithStoreIds()` (existing)
- `employee` → rows from `getEmployeesWithExternalIds()` (existing)
- `department` → rows from `getDepartments()` (new)
- `designation` → rows from `getDesignations()` (new)
- `custom` → empty, user adds key-value pairs manually

**5c. Lazy-load departments and designations** — similar to employee loading.

**5d. Custom entity type UI** — Instead of auto-populated entity rows, show:
- An "Add row" button
- Two inputs per row: "Key" (custom entity name) and "Value" (API value)

- Expected deliverable: Admin can create mappings for all 5 entity types in data source settings

### Step 6: UI — expand MergedMappingSection for new entity types

**File:** `src/components/admin/MetricMappingDialog.tsx`

In `MergedMappingSection`:

**6a. Load departments and designations** alongside employees.

**6b. Render rows per entity type:**
- `department` → show all departments (name + department_name)
- `designation` → show all designations (name)
- `custom` → show existing key-value pairs with add/edit

**6c. Icons per entity type:**
- `branch` → `Building2` (existing)
- `employee` → `User` (existing)
- `department` → `Users` (team/group icon)
- `designation` → `Briefcase` (job icon)
- `custom` → `Settings` (gear icon)

- Expected deliverable: Metric-level mapping dialog supports all entity types

### Step 7: Build verification

- `npx tsc --noEmit`
- `npx vite build`

## Key Files

| File | Operation | Description |
|------|-----------|-------------|
| `server.js:360-389` | Modify | Add `department` to JWT payload |
| `src/lib/internalApiClient.ts:411` | Modify | Expand `entityType` union |
| `src/lib/internalApiClient.ts` | Modify | Add `getDepartments()` and `getDesignations()` methods |
| `src/server/internal-api.js:2120-2145` | Modify | Add visibility filter for department/designation |
| `src/server/internal-api.js:2430-2450` | Modify | Add query param injection for new types |
| `src/components/admin/AdminDataSources.tsx` | Modify | Expand DataSourceFieldMappings component |
| `src/components/admin/MetricMappingDialog.tsx` | Modify | Expand MergedMappingSection component |

## Risks and Mitigation

| Risk | Mitigation |
|------|------------|
| JWT size increase (adding department) | Minimal: 1 string field, negligible impact |
| Existing JWT tokens lack `department` | Graceful fallback: if `req.user.department` is null, skip department mappings. Users re-auth within 7 days |
| Department names with special chars | Use Frappe `name` field (URL-safe) as key, not `department_name` |
| Custom entity type abuse (too many values) | No hard limit needed — admin UI provides natural constraint |
| Backend perf: checking all entity types | Negligible: O(n) where n = number of fieldMappings (typically < 10) |

## SESSION_ID (for /ccg:execute use)
- CODEX_SESSION: N/A (codeagent-wrapper not available)
- GEMINI_SESSION: N/A (codeagent-wrapper not available)

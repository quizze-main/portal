# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Staff Focus App - мобильное веб-приложение для сотрудников с интеграцией Frappe ERP, Outline Wiki и Telegram Bot. Архитектура: React + Vite (frontend) + Express.js (BFF backend) + Docker.

**Tech stack:** React 18, TypeScript (permissive: `noImplicitAny: false`, `strictNullChecks: false`), Vite + SWC, Express.js, TanStack React Query, shadcn/ui + Tailwind CSS, ES Modules (`"type": "module"` throughout).

**Path alias:** `@/*` maps to `./src/*` (configured in `tsconfig.app.json` and `vite.config.ts`).

## Essential Commands

### Development
```bash
npm run dev              # Frontend only (Vite HMR на порту 3000)
npm run server:dev       # Backend only (Express на порту 3000)
npm run hot-reload       # Both: Vite + Nodemon with auto-reload (recommended for local dev)
```

### Build & Deploy
```bash
npm run build            # Production build
npm run build:dev        # Development build
npm run build:debug      # Debug build с sourcemaps
npm start                # Production server
npm run start:prod       # Build + Production server
```

### Production Deployment

**ВАЖНО:**
- Деплой на прод ТОЛЬКО через агента `deploy-prod`
- Деплой на dev ТОЛЬКО через агента `deploy-dev`
- Проверка сборки (build) ТОЛЬКО через Docker: `docker compose -f docker-compose.prod.yml build`

- **SSH:** `quizze_prod`
- **Путь:** `/opt/portal-prod`
- **Переменные окружения:** `.env` на сервере
- **Workflow:** `.github/workflows/deploy-prod.yml`

### Docker
```bash
npm run docker:local     # Docker compose с hot reload (Traefik + ngrok + webhook-setup)
npm run docker:dev       # Development Docker setup
npm run docker:prod      # Production Docker setup
npm run debug            # Debug build + Node inspector (порт 9229)
```

### Testing & Utils
```bash
npm run lint             # ESLint (flat config, ESLint 9)
npm run generate-api-key # Генерация API_SECRET_KEY
npm run test-api         # Тестирование API эндпоинтов
npm run setup-webhook    # Настройка Telegram webhook
```

Note: No unit test framework is configured. Testing is manual via `npm run test-api` and health checks.

### Database Migrations (Prisma)

Миграции управляются через Prisma ORM и запускаются автоматически при старте приложения (`initPrisma()` в `src/server/prisma.js`):
1. `prisma generate` — генерация Prisma Client
2. `prisma migrate deploy` — применение pending миграций

**Любые изменения схемы БД делать ТОЛЬКО через Prisma CLI:**
```bash
npx prisma migrate dev --name <описание>   # Создать новую миграцию (dev)
npx prisma migrate deploy                   # Применить миграции (prod)
npm run prisma:studio                       # GUI для просмотра данных
```

**НЕ создавать** SQL-файлы миграций вручную. Prisma сам генерирует миграции из `prisma/schema.prisma`.

## Architecture

### BFF (Backend for Frontend) Pattern

All external API calls are proxied through the Express server. Frontend NEVER calls external APIs directly.

**Backend Entry:** `server.js` (ES Modules) → imports from `src/server/*.js`

**Middleware stack in `server.js`:**
1. Rate limiting (1000 req/15min per IP, supports X-Forwarded-For behind proxy)
2. CORS with dynamic origin checking (supports ngrok URLs for dev)
3. Cookie parsing + JWT verification (populates `req.user` from `token` cookie)
4. Body parsing (JSON + URL-encoded)

### Server Modules (`src/server/`)

| Module | Purpose |
|--------|---------|
| `internal-api.js` | Main BFF routing layer (~1500 lines). All `/api/*` endpoints. Uses `frappeApiRequest()` helper for Frappe calls. |
| `logger.js` | Dual logging: PostgreSQL (`app_logs` table) + VictoriaLogs (exponential backoff with full jitter). Auto-disables after 10 consecutive failures. |
| `telegram.js` | Telegram Bot webhook handler. Commands: `/start`, `/help`, `/clearcache`. Auto-detects ngrok for dev. |
| `external-api.js` | External webhook receiver. Telegram message aggregation (1.2s batching window), SMS gateway. Uses `EXTERNAL_API_KEY` auth. |
| `realtime.js` | Server-Sent Events (SSE) for push notifications. Per-chat-id client tracking, 25s heartbeat. |
| `requireAuth.js` | JWT middleware — checks `req.user` set by cookie parser in `server.js`. **Currently bypassed (dev mode: just calls `next()`).** |
| `health-checks.js` | Integration health checks with latency measurement. Used by Admin page to show status of Frappe, Outline, Tracker, etc. |
| `kb-providers.js` | Knowledge base provider abstraction (Outline, future providers). Connection testing, article import, CRUD for KB provider configs. |
| `swagger.js` | Auto-generated API documentation. |

### API Routes Structure

**Core BFF routes (require JWT auth):**
- `/api/frappe/*` — Frappe ERP (employees, tasks, standards, departments, user settings)
- `/api/outline/*` — Outline Wiki (collections, documents, search, attachment proxy)
- `/api/loovis/*` — Loovis Tracker dashboard metrics
- `/api/profile/*` — Profile photo upload/delete with EXIF normalization
- `/api/dashboards` — Analytics dashboard data from Tracker API
- `/api/unclosed-orders` — Orders requiring attention
- `/api/feedbacks` — Customer reviews with date range filtering
- `/api/kb/bookmarks` — Knowledge base bookmarks (Frappe-backed)
- `/api/forms/green` — Custom form submission
- `/api/forms/green-feedback` — Creates Yandex Tracker issue

**Auth routes (no JWT required):**
- `/api/auth/telegram` — Sets JWT cookie (7 days)
- `/api/auth/demo` — Demo mode login with PIN (1 day cookie)

**External (API key auth):**
- `/api/telegram` — Telegram bot webhook
- Routes in `external-api.js` use `EXTERNAL_API_KEY` bearer auth

### Frontend Architecture

**Entry Point:** `src/main.tsx` → `src/App.tsx`

**Core State Management:**
1. **EmployeeProvider** (`src/contexts/EmployeeProvider.tsx`) — central auth + role state
2. **React Query** (TanStack) — server state for all async data
3. **ThemeProvider** — light/dark mode with localStorage persistence

**API Client:** `src/lib/internalApiClient.ts` — singleton class, base URL `/api/frappe`, always uses `credentials: 'include'`.

**Routing** (`src/App.tsx`): Flat route structure (no nesting).
- Public: `/`, `/standards`, `/knowledge`, `/profile`, `/all-tasks`, `/attention-deals`, `/reviews`
- Leader-protected (wrapped in `RequireClubManager`): `/dashboard/metric/:metricId`, `/dashboard/manager/:managerId`, `/dashboard/optometrist/:optometristId`, `/dashboard/reviews-detail`
- Admin: `/admin` — integration health checks, knowledge base management, standards, org structure, mailings
- Deep link handlers: `TelegramStartParamHandler` (supports v1/v2/v3 base64url formats), `StartAfterAuthNavigator`

### Authentication Flow

1. **JWT Cookie-based** (основной):
   - Telegram WebApp → `/api/auth/telegram` → sets httpOnly `token` cookie (7 days)
   - Demo mode → `/api/auth/demo` → sets `token` cookie (1 day, validates against `DEMO_PIN` env var)
   - `server.js` cookie parser decodes JWT into `req.user` for every request
   - `requireAuth.js` middleware gates protected routes

2. **API Secret Key** (external webhooks):
   - `Authorization: Bearer <API_SECRET_KEY>` or `EXTERNAL_API_KEY`

3. **Frappe Credentials** (server-to-server):
   - `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}` header format

### Role-Based Access Control

**Loovis Role System:**
- `LIS-R-00000` — Standard access (own store only)
- `LIS-R-00001` — Manager role (multi-store or all-store access)

**Leader Dashboard Eligibility** (`EmployeeProvider.canUseLeaderDashboard`):
```
hasAllBranchesAccess OR
(LIS-R-00001 with single store AND isLeaderByDesignation) OR
(isLeaderByDesignation AND store_id in ALLOWED_STORE_IDS AND NOT LIS-R-00001)
```

Feature flag: `NEW_DASHBOARD_ALLOWED_STORE_IDS` hardcoded in `EmployeeProvider.tsx`.

### Key Architectural Patterns

**Dual Persistence (Layout):**
- localStorage (fast, offline) + Frappe UserSettings (cross-device sync)
- `useMetricsLayout()` hook: Frappe is authoritative, localStorage is fallback
- Variant-aware: layouts differ per client type (`mobile_tg`, `desktop_tg`, `mobile_web`, `desktop_web`, `shared`)
- Conflict resolution via `updatedAt` timestamps
- Auto-save debounced at 800ms; call `flushRemoteSave()` before navigation in manual mode

**Optimistic UI with Outbox Pattern (Tasks):**
- `useTasks()` hook: Task status changes applied to UI immediately
- Changes queued in localStorage outbox, flushed on `online` event
- Completion timestamps stored separately from Frappe status

**SSE for Real-Time Updates:**
- `src/server/realtime.js`: `broadcastToChat(chatId, payload)` for targeted push
- One-way push (no WebSockets), automatic reconnection, 25s heartbeat

**Image Processing (Profile Photos):**
- `normalizeImageForUpload()` in `internalApiClient.ts`
- Auto-corrects EXIF orientation via `createImageBitmap`
- Scales to max 2048px, converts to JPEG (0.92 quality)
- Graceful fallback for old WebViews

**Telegram Deep Linking:**
Three format generations (all supported for backward compat):
- v3 (current): base64url-encoded task/doc IDs
- v1/v2 (legacy): plain text formats
- Stored in `sessionStorage`, restored after auth via `StartAfterAuthNavigator`

### Logging Architecture

**Dual logging system** (`src/server/logger.js`):
- **PostgreSQL**: Logs stored in `app_logs` table, auto-disables after 10 errors
- **VictoriaLogs**: JSON line protocol at `/insert/jsonline`
  - Exponential backoff with full jitter: `min(CAP, BASE * FACTOR^n) * random()`
  - Configurable via env: `VICTORIA_LOGS_TIMEOUT_MS`, `VICTORIA_LOGS_BACKOFF_BASE_MS`, `VICTORIA_LOGS_BACKOFF_FACTOR`, `VICTORIA_LOGS_BACKOFF_CAP_MS`
  - Auto-disables after 10 consecutive failures
- All logs include user context: `tg_username`, `employeename`, `tg_chat_id` (extracted from JWT)

### Key Integrations

| Integration | Config vars | Used for |
|-------------|------------|----------|
| Frappe ERP | `FRAPPE_BASE_URL`, `FRAPPE_API_KEY`, `FRAPPE_API_SECRET` | Employees, tasks, standards, departments, user settings, file attachments |
| Outline Wiki | `OUTLINE_BASE_URL`, `OUTLINE_API_KEY` | Collections, documents, search. Auto-filters hidden docs (names starting with `-`) |
| Loovis Tracker | `TRACKER_API_URL`, `TRACKER_API_TOKEN` | Leader dashboard metrics (revenue, CSI, conversion), manager rankings |
| Telegram Bot | `TELEGRAM_BOT_TOKEN` | Webhook commands, deep linking to tasks/knowledge |
| Yandex Tracker | `YANDEX_TREKER_AUTH_TOKEN`, `X_ORG_ID` | Feedback form → issue creation |
| PostgreSQL Logs | `DATABASE_URL`, `PG_LOGS_ENABLED` | Backend log storage (table `app_logs`) |
| VictoriaLogs | `VICTORIA_LOGS_URL` | Backend log storage (alternative) |

## Common Development Patterns

### Adding New API Endpoint

1. Backend: add route in `src/server/internal-api.js`:
```javascript
app.get('/api/frappe/new-endpoint', requireAuth, async (req, res) => {
  const result = await frappeApiRequest(req, '/api/resource/DocType', { filters: ... });
  res.json(result);
})
```

2. Frontend: add method in `src/lib/internalApiClient.ts`:
```typescript
async getNewData() {
  const response = await fetch(`${this.baseUrl}/new-endpoint`, {
    credentials: 'include' // Required for JWT cookie
  })
  return response.json()
}
```

3. Hook (optional): create in `src/hooks/use*.ts`:
```typescript
export const useNewData = () => {
  return useQuery({
    queryKey: ['newData'],
    queryFn: () => internalApiClient.getNewData()
  })
}
```

### Adding New Dashboard Component

1. Create in `src/components/dashboard/MyNewCard.tsx`
2. If data needed — add to `useAnalyticsDashboard` hook
3. Add to `Dashboard.tsx` or `LeaderDashboardHome.tsx`
4. For drag-and-drop layout: add ID to `useMetricsLayout` config
5. Use `React.memo` — dashboard has 40+ components

### Working with Frappe DocTypes

- Use `frappeApiRequest()` helper in `src/server/internal-api.js` for Frappe API calls
- Add a specific endpoint if data transformation is needed
- All requests are logged via `src/server/logger.js`
- Frappe auth header format: `token ${API_KEY}:${API_SECRET}`

## Environment Variables

Create `.env` from `env.example`, run `npm run generate-api-key`, fill in remaining values.

**Required:**
- `FRAPPE_BASE_URL`, `FRAPPE_API_KEY`, `FRAPPE_API_SECRET`
- `OUTLINE_BASE_URL`, `OUTLINE_API_KEY`
- `API_SECRET_KEY` (generate via `npm run generate-api-key`)
- `TELEGRAM_BOT_TOKEN`
- `JWT_SECRET`

**Optional:**
- `TRACKER_API_URL`, `TRACKER_API_TOKEN` — Loovis Tracker (leader dashboard)
- `EXTERNAL_API_KEY` — External webhook auth
- `DEMO_PIN` — Demo mode PIN code
- `ALLOWED_ORIGINS` — CORS whitelist
- `PORT` — Server port (default: 3000)
- `PG_LOGS_ENABLED` — Enable/disable PostgreSQL logging (default: true)
- `VICTORIA_LOGS_URL`, `VICTORIA_LOGS_SEND_LOGS` — Alternative log storage
- `YANDEX_TREKER_AUTH_TOKEN`, `X_ORG_ID` — Yandex Tracker feedback

## Development Gotchas

1. **Always `credentials: 'include'`** in fetch calls — JWT is in httpOnly cookie
2. **Don't fetch data in components** — use hooks + React Query
3. **Don't call external APIs from frontend** — go through BFF (`/api/*`)
4. **Backend is ES Modules** — use `import`/`export`, not `require`/`module.exports`
5. **Layout saves are debounced** (800ms) — don't block UI during drag-and-drop
6. **Outline hidden docs** — documents starting with `-` are auto-filtered by backend
7. **Task custom fields** — use `custom_assignee_employee` and `custom_author_employee` (not standard Frappe fields)
8. **`requireAuth.js` is currently a no-op** — dev mode bypass (`next()` only). Production auth is handled by JWT cookie parsing in `server.js`, but the middleware itself does not reject unauthenticated requests right now
9. **ESLint `@typescript-eslint/no-unused-vars` is off** — unused variables won't trigger lint errors
10. **Vite dev server listens on port 3000** (not 5173) — configured in `vite.config.ts` with `host: "::"` and WSS HMR via `staff-focus.localhost`

### Verifying Changes

Backend: `curl http://localhost:3000/health` or `curl http://localhost:3000/api/version`

Frontend: Vite HMR auto-reloads the browser.

### Debugging

```bash
npm run debug  # Node inspector on 0.0.0.0:9229
```
Attach Chrome DevTools: `chrome://inspect`

## Git Subtree (vendored dashboard)

`LoovTeam/loovis-sandbox` is connected as git subtree in `_vendor/loovis-sandbox`. Contains the original Lovable.dev dashboard components (90+ components). Components are ported/extended into `src/components/dashboard/`.

**Update subtree:**
```bash
git fetch loovis-sandbox main
git subtree pull --prefix=_vendor/loovis-sandbox loovis-sandbox main --squash
```

## Docker Notes

- `docker-compose.local.yml` includes: Traefik (reverse proxy + HTTPS), app (hot reload), ngrok (public tunnel for Telegram webhook), webhook-setup (auto-registers webhook)
- Debug mode: Node inspector on port 9229, Vite HMR on port 5173
- Production: multi-stage build, port 80 (configurable via `$PORT`)

## Vite Custom Plugin

`sw-build-time` plugin in `vite.config.ts` injects `__BUILD_TIME__` into `public/sw.js` and defines global constants: `__COMMIT_HASH__`, `__SHORT_HASH__`, `__COMMIT_TIME__`, `__BUILD_TIME__`. Version info is generated by `scripts/get-version.js` into `src/version.json`.

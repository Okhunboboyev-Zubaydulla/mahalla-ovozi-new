---
baseline_commit: f4e098a
---

# Story 4.6: Review Complete and Resilient System Health Coverage

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the **Product Owner**,  
I want System Health to cover every required operational component and remain useful when individual checks, telemetry, or refreshes fail,  
So that I can diagnose the product reliably without confusing missing engineering telemetry with product health.

---

## Acceptance Criteria

1. **Complete Component Coverage Matrix (AC 1)**:
   - Given the Product Owner inspects System Health (`/system-health`),
   - When the District/component matrix is presented,
   - Then it covers all required platform and district components:
     - Global platform components:
       1. `database` (PostgreSQL connection pool, query responsiveness, and database size),
       2. `processing_queue` (pg-boss 10.x queue runtime, worker heartbeat, active queue backlog),
       3. `storage` (database disk capacity and file storage accessibility),
       4. `web_application` (Fastify 5.x HTTP server and Node.js process runtime),
       5. `retention_jobs` (data retention policy enforcement and automated cleanup tasks),
       6. `scheduled_deletion` (scheduled-deletion scheduler and worker job registration capability),
     - District-scoped operational components:
       7. `telegram_bot` (bot token validity, webhook status, and polling responsiveness),
       8. `telegram_groups` (approved Mahalla Telegram group bindings and connectivity),
       9. `message_intake` (inbound message stream freshness and intake queue latency),
       10. `ai_operations` (AI gateway connectivity, model/prompt version, latency, and failure rates),
       11. `district_retention` (district-level retention deadline enforcement),
   - And each component observation declares its scope (`GLOBAL` vs `DISTRICT`) and identifies its affected District where applicable,
   - And no required component is omitted from the health boundary.

2. **Granular Operational Diagnostic Metrics & Metadata (AC 2)**:
   - Given health diagnostics or recent technical errors are evaluated,
   - When the Product Owner inspects component details,
   - Then each component observation provides structured, privacy-safe diagnostic metrics where applicable:
     - `processing_queue`: queue depth (total created + retry backlog), oldest queued job age, failed job count,
     - `message_intake`: timestamp of latest received message, intake processing latency,
     - `ai_operations`: active model identifier, prompt/schema version, average processing latency (ms), recent success/failure counts,
     - `database`: connection pool waiting count, query latency (ms), database size,
     - `storage`: storage access latency (ms) and status,
     - `telegram_bot` & `telegram_groups`: total connected groups, active/failed group counts, last validation timestamp,
   - And raw resident message content, credentials, bot tokens, provider secrets, resident-bearing AI context, and raw upstream error bodies are strictly excluded from diagnostics (AD-09, AD-11),
   - And error messages use sanitized, beginner-readable Uzbek Cyrillic explanations.

3. **Scheduled Deletion Operational Health & Decoupling from Epic 6 (AC 3)**:
   - Given Epic 6 deletion business workflows have not yet been implemented,
   - When scheduled-deletion operational health (`scheduled_deletion`) is evaluated,
   - Then System Health monitors strictly the independently testable technical scheduler/worker capability in pg-boss available at this point in the architecture,
   - And the absence of actual District deletion jobs is considered normal baseline operation (`Healthy`),
   - And zero scheduled deletion jobs can coexist with `Healthy` technical scheduler capability,
   - And stale or insufficient scheduler checks produce `Unknown` under standard health rules,
   - And this story does NOT create cancellation deadlines, District deletion jobs, backup-expiry business milestones, recovery logic, or any other Epic 6 behavior.

4. **Resilient Public Liveness & Readiness Probes (AC 4)**:
   - Given edge proxies (Caddy), Docker health checks, or container orchestrators probe the backend,
   - When HTTP requests are made to probe routes:
     - `GET /api/v1/health` — High-level service health summary; returns HTTP 200 OK if healthy/degraded/delayed/quiet, HTTP 503 Service Unavailable if any critical global component (`database`, `processing_queue`) is `Unavailable`,
     - `GET /api/v1/health/live` — Fast process liveness probe; returns HTTP 200 OK with `{ status: 'ok', timestamp: string }` if the Fastify process is running and event loop is responsive,
     - `GET /api/v1/health/ready` — Deep dependency readiness probe; verifies PostgreSQL connection pool (`checkDbHealth`) and pg-boss queue readiness; returns HTTP 200 OK `{ status: 'ready', timestamp: string, checks: { database: 'ok', queue: 'ok' } }` if ready, or HTTP 503 Service Unavailable with failing check breakdown if database or queue is down,
   - Then these probe routes operate without requiring Product Owner authentication or browser session cookies,
   - And probe responses contain zero credentials, bot tokens, connection strings, or stack traces.

5. **Telemetry-Backend (OTLP) Independence & Direct Truth (AC 5)**:
   - Given the OpenTelemetry collector (OTLP) or another engineering telemetry backend is unreachable, slow, or disabled,
   - When the Product Owner requests System Health,
   - Then application-owned health evaluation continues to query authoritative PostgreSQL tables and direct component state without degradation or failure,
   - And telemetry-backend availability is NOT the source of truth for Product Owner health,
   - And telemetry collector failure cannot fabricate `Healthy`, nor does it cause `Unavailable` for unrelated application components,
   - And insufficient health evidence still produces `Unknown`.

6. **Partial Failure Resilience & Component Error Isolation (AC 6)**:
   - Given one component health check encounters an unexpected error or timeout (e.g., individual Telegram bot validation timeout or single District query error),
   - When System Health renders,
   - Then unaffected District and global component data remains completely usable and rendered,
   - And the failed component safely degrades to `Unavailable`, `Degraded`, or `Unknown` according to evidence-based rules with a sanitized error code (`COMPONENT_PROBE_ERROR`),
   - And an individual component check failure NEVER causes an unhandled rejection, 500 Internal Server Error, or whole-page crash.

7. **Stale Refresh & Client Connectivity Resilience (AC 7)**:
   - Given previously successful System Health data is visible in the browser,
   - When an ordinary background refresh fails or browser network connectivity is lost,
   - Then the last successfully permitted data remains visible read-only,
   - And a persistent stale warning banner is displayed showing the last successful update time in `Asia/Tashkent` format (`DD.MM.YYYY HH:mm`) with a manual "Қайта уриниш" (Retry) action,
   - And the displayed historical snapshot is NOT silently reclassified as newly checked `Healthy`,
   - And browser network loss remains a client-connectivity state and NEVER creates a Product, District, or server health issue.

8. **Responsive UI, Uzbek Cyrillic Localization & Accessibility (AC 8)**:
   - Given the Product Owner reviews System Health on supported viewports (desktop, tablet, mobile),
   - When the health matrix and component tables render,
   - Then layout follows the approved responsive data-collection contract (switching from table to responsive stacked cards on mobile viewports `<= 768px`),
   - And all user-visible text uses approved Uzbek Cyrillic terminology,
   - And state meaning NEVER depends on color alone (combining status icons, Uzbek text badges, and ARIA labels),
   - And all diagnostic timestamps use the approved `Asia/Tashkent` (+05:00) presentation convention,
   - And keyboard navigation, logical focus order, and screen reader announcements remain fully functional.

9. **High Performance & NFR2 Compliance (AC 9)**:
   - Given System Health operates under production-shaped District counts,
   - When representative Product Owner health requests execute,
   - Then at least 95% of health requests become usable within the approved 3-second Console target (NFR2),
   - And parallel component execution (`Promise.allSettled`) prevents slow checks from sequentially blocking the entire response.

10. **Shared Zod Contracts & Boundary Integrity (AC 10)**:
    - Given complete coverage state crosses backend, API, and browser boundaries,
    - When contracts are defined,
    - Then all new component types (`scheduled_deletion`), diagnostic metadata schemas, probe response schemas, and stale state flags are strictly defined in `@mahalla-ovozi/api-contracts`,
    - And database rows, job representations, telemetry-provider types, and translated strings never leak into public API contracts.

---

## Tasks / Subtasks

- [x] **Task 1: Shared API Contract Extensions for Complete Coverage & Probes** (AC: 1, 2, 3, 4, 10)
  - [x] 1.1 Update `ComponentTypeEnumSchema` in `packages/api-contracts/src/health.ts` to include `'scheduled_deletion'`.
  - [x] 1.2 Define `ComponentDiagnosticsSchema` in `packages/api-contracts/src/health.ts` covering all granular AC 2 operational metrics:
    - Queue metrics: `queueDepth?: number`, `failedJobCount?: number`, `oldestQueuedAgeMs?: number`.
    - Database/storage metrics: `waitingConnectionCount?: number`, `databaseSize?: string`, `storageLatencyMs?: number`, `storageStatus?: string`.
    - Telegram metrics: `connectedGroupsCount?: number`, `activeGroupsCount?: number`, `failedGroupsCount?: number`, `lastValidatedAt?: string`.
    - Message intake metrics: `lastMessageReceivedAt?: string`, `intakeLatencyMs?: number`.
    - AI metrics: `activeModelVersion?: string`, `activePromptVersion?: string`, `recentSuccessCount?: number`, `recentFailureCount?: number`, `avgProcessingLatencyMs?: number`.
    - Extend `ComponentHealthObservationSchema` with `diagnostics: ComponentDiagnosticsSchema.nullable().optional()`.
  - [x] 1.3 Define public probe response schemas in `packages/api-contracts/src/health.ts`:
    - `LivenessProbeResponseSchema`: `{ status: 'ok', timestamp: string }`.
    - `ReadinessProbeResponseSchema`: `{ status: 'ready' | 'unready', timestamp: string, checks: { database: 'ok' | 'down', queue: 'ok' | 'down' } }`.
    - `PublicHealthSummaryResponseSchema`: `{ status: HealthStatus, timestamp: string, version?: string }`.
  - [x] 1.4 Export all updated types and build `@mahalla-ovozi/api-contracts`.

- [x] **Task 2: Backend Component Health Checkers Enhancement** (AC: 1, 2, 3, 5, 6)
  - [x] 2.1 Implement `checkScheduledDeletionHealth(boss, config)` in `apps/backend/src/modules/health/health-checker.ts`:
    - Verify pg-boss worker runtime / scheduler capability is active using native `boss.getSchedules()` or queue registration.
    - Return `Healthy` if scheduler is active (even with 0 deletion jobs, strictly decoupled from Epic 6).
    - Return `Unavailable` or `Degraded` if queue connection fails.
  - [x] 2.2 Enrich `checkProcessingQueueHealth` in `health-checker.ts`:
    - Capture queue depth (`created + retry`), `failed` count, and compute oldest queued age using `boss.getQueueSize()` and direct database job counts.
    - Populate `diagnostics` field safely without exposing internal job payloads.
  - [x] 2.3 Enrich `checkDistrictAiHealth` in `health-checker.ts`:
    - Extract active AI model identifier and prompt version from recent `ai_operations` metadata or active profile.
    - Compute recent failure count, success count, and average processing latency.
  - [x] 2.4 Enrich `checkDistrictIntakeHealth`, `checkDistrictBotHealth` & `checkDistrictGroupsHealth`:
    - Include `lastMessageReceivedAt`, `intakeLatencyMs`, connected group counts, active/failed group tallies, and last validation timestamps in diagnostics.
  - [x] 2.5 Ensure all health checker functions use non-throwing defensive boundaries with timeouts (2000ms max per probe with `timer.unref()`) so that single check failures do not throw unhandled exceptions.

- [x] **Task 3: Resilient Public Liveness & Readiness Fastify Probes** (AC: 4, 10)
  - [x] 3.1 In `apps/backend/src/modules/health/health-routes.ts`, add unauthenticated, public probe routes directly on `server` (outside the `createRequireProductOwner` authenticated plugin scope):
    - `GET /api/v1/health/live` — Returns 200 OK `{ status: 'ok', timestamp: new Date().toISOString() }` with `LivenessProbeResponseSchema`.
    - `GET /api/v1/health/ready` — Checks DB pool connection and pg-boss queue readiness; returns 200 if healthy, 503 if DB or queue is unavailable, declaring explicit `{ response: { 200: ReadinessProbeResponseSchema, 503: ReadinessProbeResponseSchema } }`.
    - `GET /api/v1/health` — High-level summary route for external orchestrators/reverse proxies with `PublicHealthSummaryResponseSchema`.
  - [x] 3.2 Verify that public probe routes do not trigger CORS origin rejection for automated health checkers (allow GET requests without browser origin headers).

- [x] **Task 4: Health Service Resilience, Parallelization & Telemetry Independence** (AC: 1, 3, 5, 6, 9)
  - [x] 4.1 Update `getOverallSystemHealth` in `apps/backend/src/modules/health/health-service.ts`:
    - Add `checkScheduledDeletionHealth` to global platform components.
    - Wrap all component checks with `Promise.allSettled` to guarantee that unexpected errors in one probe are caught and converted into `Unknown` or `Unavailable` component observations with `COMPONENT_PROBE_ERROR` without crashing the overall query.
  - [x] 4.2 Update `getDistrictHealth` in `health-service.ts` to include enriched diagnostics and defensive error boundaries using `Promise.allSettled`.
  - [x] 4.3 Ensure telemetry adapter (`adapters/telemetry`) failure or unavailability does not throw or intercept health evaluation execution.

- [x] **Task 5: Frontend UI Enhancements for Diagnostics, Scheduled Deletion & Stale States** (AC: 1, 2, 7, 8)
  - [x] 5.1 Update `COMPONENT_LABEL_MAP` in `apps/web/src/components/health/GlobalComponentsTable.tsx`:
    - Add label and description for `scheduled_deletion`: `name: 'Режалаштирилган ўчириш тизими'`, `description: 'Муддати тугаган маълумотларни режали тозалаш навбати'`.
    - Render diagnostic details (queue depth, latency, db size, version tags) in the details column.
  - [x] 5.2 Update `DistrictHealthMatrix.tsx`:
    - Add column or detail tooltip for AI model version, message intake freshness, and active/failed group counts.
    - Support responsive horizontal scrolling (`scroll={{ x: 900 }}`) and stacked presentation on mobile viewports (`<= 768px`).
  - [x] 5.3 Enhance `SystemHealthPage.tsx`:
    - Implement persistent stale warning banner when `isError` occurs while `data` exists in cache, displaying last successful Tashkent timestamp and a "Қайта уриниш" button.
    - Display client network offline indicator ("Интернет алоқаси мавжуд эмас") distinctly from server health status.
  - [x] 5.4 Update `OverallHealthCard.tsx` to display diagnostic summary metrics (total active districts, global components status breakdown, queue backlog).

- [x] **Task 6: Automated Integration & Unit Verification** (AC: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11)
  - [x] 6.1 Backend Integration Tests (`apps/backend/tests/system-health.test.ts`):
    - Test complete component coverage matrix including `scheduled_deletion`.
    - Test `scheduled_deletion` capability returns `Healthy` with 0 scheduled jobs (Epic 6 decoupling).
    - Test `/api/v1/health/live` returns 200 OK.
    - Test `/api/v1/health/ready` returns 200 OK when DB is up and 503 Service Unavailable when DB is down.
    - Test unhandled component probe failure is isolated via `Promise.allSettled` and does not crash overall health query.
    - Test privacy guardrail asserts zero bot tokens or resident text leak into diagnostic metadata.
  - [x] 6.2 Frontend Unit & Component Tests (`apps/web/tests/unit/SystemHealthPage.test.tsx`):
    - Test rendering of `scheduled_deletion` in global components table.
    - Test stale warning banner when background refetch fails with cached data.
    - Test accessible ARIA attributes and Uzbek Cyrillic labels across all components.
  - [x] 6.3 Full Monorepo Typecheck & CI Verification:
    - Run `pnpm typecheck` across all packages.
    - Run backend and web test suites against isolated test DB.

### Review Findings

- [x] [Review][Patch] Revert `ensureDefaultAiProfiles` from `onConflictDoUpdate` to `onConflictDoNothing` to preserve operator custom configurations [`apps/backend/src/adapters/db/seeds.ts:77-85`]
- [x] [Review][Patch] Fix false-positive `status: 'Healthy'` in `checkRetentionJobHealth` error catch block so DB query errors report `Unavailable` with `RETENTION_CHECK_FAILED` [`apps/backend/src/modules/health/health-checker.ts:413-424`]
- [x] [Review][Patch] Guard against `NaN` in queue counts (`Number.isFinite(...) ? Math.max(0, val) : 0`) in `checkProcessingQueueHealth` [`apps/backend/src/modules/health/health-checker.ts:243-247`]
- [x] [Review][Patch] Extend `assertPrivacyBoundary` to sanitize string values in `obs.diagnostics` and handle flexible stack trace regexes [`apps/backend/src/modules/health/health-checker.ts:36-60`]
- [x] [Review][Patch] Declare explicit Fastify response schemas on authenticated PO health routes [`apps/backend/src/modules/health/health-routes.ts:155-215`]
- [x] [Review][Patch] Check queue probe readiness before returning `Healthy` on public summary probe `/api/v1/health` [`apps/backend/src/modules/health/health-routes.ts:130-132`]
- [x] [Review][Patch] Prevent `1970-01-01` timestamp rendering on initial render by checking `Number.isFinite(dataUpdatedAt) && dataUpdatedAt > 0` in `SystemHealthPage.tsx` [`apps/web/src/pages/SystemHealthPage.tsx:77`]
- [x] [Review][Patch] Add `scroll={{ x: 1140 }}` to `DistrictHealthMatrix.tsx` and `scroll={{ x: 750 }}` to `GlobalComponentsTable.tsx` for smooth mobile scrolling [`DistrictHealthMatrix.tsx:217`, `GlobalComponentsTable.tsx:160`]
- [x] [Review][Patch] Add `district_retention` column to `DistrictHealthMatrix.tsx` to represent all 5 district components in the matrix table [`apps/web/src/components/health/DistrictHealthMatrix.tsx:176`]
- [x] [Review][Defer] Evaluate filtering suspended/cancelled districts in `aggregateOverallSystemHealth` [`apps/backend/src/modules/health/health-evaluator.ts:180-200`] — deferred, pre-existing from Story 4.1

---

## Dev Notes

### Architecture Invariants & Guardrails
- **AD-11 (Observability, Logging, Metrics & Health Probes):** Product Owner System Health is application-owned sanitized state and MUST remain available independently of the engineering telemetry backend (OTLP collector). Raw resident evidence, AI context, search text, credentials, and secrets MUST NOT enter health diagnostics.
- **AD-09 (Security & District Scope):** District-scoped health observations require explicit `districtId`; global platform components are evaluated once at `GLOBAL` scope without duplicating under every District.
- **AD-03 (PostgreSQL & pg-boss):** Test suites MUST run strictly against the isolated test database (`mahalla_ovozi_test` on port 5433).
- **AD-02 (Ant Design 5 & Responsive UI):** Use `theme.useToken()` and Ant Design component tokens. Never use color alone to convey health status.

### Current-Data Verification & Library Best Practices (Verified 2026-08-26)
- **Fastify 5.2.x Route Separation & Schema Compilation:**
  - Public probes (`/api/v1/health/live`, `/api/v1/health/ready`, `/api/v1/health`) MUST be registered directly on `server` (or in an unauthenticated scope), distinct from the `createRequireProductOwner` authenticated plugin scope.
  - Omit `Origin` header handling for automated probes (already supported by `fastifyCors`).
  - Declare explicit Zod response schemas (`200`, `503`) so Fastify 5 compiles optimized `fast-json-stringify` serializers and avoids leaking unexpected internal errors.
- **pg-boss 10.4.2 State Inspection & Timeout Safety:**
  - Use `boss.getSchedules()` for scheduler inspection and `boss.getQueueSize()` / direct database queries for queue backlogs.
  - All asynchronous probe calls must be wrapped in a non-throwing `Promise.race` with a 2000ms unref timeout (`timer.unref()`).
  - `scheduled_deletion` checks pg-boss runtime/scheduler capability. Zero jobs in queue is normal baseline `Healthy` (strictly decoupled from Epic 6).
- **OpenTelemetry JS 2.x & Telemetry Decoupling (AD-11):**
  - OpenTelemetry JS exporter failures log internally to `DiagLogger` and do not crash or throw unhandled rejections in Fastify request handlers.
  - System Health is evaluated directly against PostgreSQL and pg-boss without querying external OTLP collectors.
- **TanStack Query 5.66.x Stale Background Refetch & Offline UI:**
  - Background refetch errors keep previous cached data intact (`isError && data !== undefined`).
  - Render persistent warning alert with `dataUpdatedAt` Tashkent timestamp: `"Маълумотлар эскирган бўлиши мумкин (Сўнгги янгиланиш: DD.MM.YYYY HH:mm)"`.
  - Use `onlineManager.isOnline()` or `navigator.onLine` to detect client network loss and distinguish it from server failures.
- **Ant Design 5.24.x Accessible Status & Responsive Layout:**
  - Apply `theme.useToken()` for container backgrounds, borders, and text colors.
  - Non-color-only accessible badges combining icons, Uzbek Cyrillic text, and `role="status" aria-label="Ҳолат: ..."`.
  - Responsive Table scrolling (`scroll={{ x: 900 }}`) on desktop and stacked card layout on mobile viewports (`<= 768px`).

### Component Scope & Types Reference
```typescript
export const ComponentTypeEnumSchema = z.enum([
  'database',
  'processing_queue',
  'storage',
  'web_application',
  'retention_jobs',
  'scheduled_deletion', // Added in Story 4.6
  'telegram_bot',
  'telegram_groups',
  'message_intake',
  'ai_operations',
  'district_retention',
]);

export const ComponentDiagnosticsSchema = z.object({
  // processing_queue
  queueDepth: z.number().nonnegative().optional(),
  failedJobCount: z.number().nonnegative().optional(),
  oldestQueuedAgeMs: z.number().nonnegative().optional(),
  // database & storage
  waitingConnectionCount: z.number().nonnegative().optional(),
  databaseSize: z.string().optional(),
  storageLatencyMs: z.number().nonnegative().optional(),
  storageStatus: z.string().optional(),
  // telegram_bot & telegram_groups
  connectedGroupsCount: z.number().nonnegative().optional(),
  activeGroupsCount: z.number().nonnegative().optional(),
  failedGroupsCount: z.number().nonnegative().optional(),
  lastValidatedAt: z.string().datetime().optional(),
  // message_intake
  lastMessageReceivedAt: z.string().datetime().optional(),
  intakeLatencyMs: z.number().nonnegative().optional(),
  // ai_operations
  activeModelVersion: z.string().optional(),
  activePromptVersion: z.string().optional(),
  recentSuccessCount: z.number().nonnegative().optional(),
  recentFailureCount: z.number().nonnegative().optional(),
  avgProcessingLatencyMs: z.number().nonnegative().optional(),
}).optional();
```

### Public Probe Endpoints Specification
| Endpoint | Auth | Purpose | Success Status | Failure Status |
|---|---|---|---|---|
| `GET /api/v1/health/live` | None (Public) | Process liveness probe | 200 OK | N/A (Process down) |
| `GET /api/v1/health/ready` | None (Public) | DB pool + Queue readiness | 200 OK | 503 Service Unavailable |
| `GET /api/v1/health` | None (Public) | Service health summary | 200 OK | 503 Service Unavailable |
| `GET /api/v1/health/system` | Product Owner Session | Comprehensive system health | 200 OK | 401 / 403 / 500 |
| `GET /api/v1/districts/:id/health` | Product Owner Session | District-scoped health | 200 OK | 401 / 403 / 404 |

### Uzbek Cyrillic UI Terminology
- `database`: "Маълумотлар базаси"
- `processing_queue`: "Навбат тизими"
- `storage`: "Сақлаш тизими"
- `web_application`: "Веб илова"
- `retention_jobs`: "Маълумотларни сақлаш муддати"
- `scheduled_deletion`: "Режалаштирилган ўчириш тизими"
- `telegram_bot`: "Telegram бот"
- `telegram_groups`: "Telegram гуруҳлар"
- `message_intake`: "Хабарлар қабули"
- `ai_operations`: "АИ операциялари"
- `district_retention`: "Туман маълумотлари муддати"

---

## Dev Agent Record

### Agent Model Used
Gemini 3.7 Flash (High) via Antigravity Agent

### Debug Log References
- No debug logs generated during specification authoring.

### Completion Notes List
- Comprehensive story specification authored for Story 4.6 in accordance with `bmad-create-story` workflow.
- Complete component coverage defined, including `scheduled_deletion` decoupled from Epic 6.
- Public liveness and readiness probe specifications documented.
- Telemetry backend independence and error boundary isolation rules established.

### File List
- `_bmad-output/implementation-artifacts/4-6-review-complete-and-resilient-system-health-coverage.md` (Created)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (Updated)

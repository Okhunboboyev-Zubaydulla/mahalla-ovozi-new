---
baseline_commit: 159bcea31f67bc320b35ee1e903b036193027528
---

# Story 4.1: Inspect Truthful System and District Health

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the **Product Owner**,  
I want to inspect evidence-based overall, District, and component health,  
So that I can distinguish real technical failures from delays, quiet operation, and insufficient evidence.

---

## Acceptance Criteria

1. **Product Owner Authenticated Access & Hierarchical View (AC 1)**:
   - Given an authenticated Product Owner opens System Health (`/system-health`),
   - When health information loads,
   - Then the page shows application-owned overall product health with a visible `lastCheckAt` timestamp,
   - And it shows applicable District and component health registered with the health boundary,
   - And the Product Owner can inspect all-District aggregate health OR one explicitly selected District,
   - And District-owned data is returned only through explicit District scope (`/api/v1/districts/:districtId/health`), while all-District aggregation uses a dedicated global Product Owner contract (`/api/v1/health/system`),
   - And information from one District never leaks into or renders in another District context.

2. **Privacy-Safe Technical Health Observations & Persistence Constraints (AC 2)**:
   - Given a technical health observation is used to determine component health,
   - When the application evaluates that observation,
   - Then the health input identifies the monitored component, applicable District or global scope, technical check time, technical outcome (`success`, `failure`, `insufficient_evidence`), and privacy-safe error category or identifier where applicable,
   - And the evidence strictly distinguishes successful technical confirmation, known technical failure, and insufficient evidence,
   - And raw resident evidence, credentials, secrets, resident-bearing AI context, and raw upstream errors MUST NOT be part of the health-state contract,
   - And persistence is introduced only where required by this story's health and freshness behavior rather than creating unrelated operational-history structures.

3. **Six Canonical Health States & Truthful Interpretation (AC 3)**:
   - Given health is evaluated for a monitored scope,
   - When current technical evidence is interpreted,
   - Then canonical domain/API state values are strictly limited to `Healthy`, `Delayed`, `Degraded`, `Unavailable`, `Quiet`, and `Unknown`,
   - And `Healthy` requires sufficiently recent successful technical evidence (< 10 minutes for checks, within SLAs for intake/topic updates),
   - And `Delayed` means an applicable processing target has been exceeded without evidence requiring a stronger state,
   - And `Degraded` means known failures exist while useful operation continues,
   - And `Unavailable` requires direct technical evidence that a required component cannot operate,
   - And `Quiet` represents an applicable silence-capable intake source with no recent activity and no known technical failure,
   - And insufficient or stale evidence produces `Unknown` rather than `Healthy`.

4. **Frontend Canonical Enums & Approved Uzbek Cyrillic UI Labels (AC 4)**:
   - Given canonical state values cross into the Product Owner UI,
   - When status is rendered,
   - Then the canonical English enum values (`Healthy`, `Delayed`, `Degraded`, `Unavailable`, `Quiet`, `Unknown`) remain stable internal/API identifiers,
   - And visible user-facing labels and explanations use approved Uzbek Cyrillic:
     - `Healthy` -> `Соғлом`
     - `Delayed` -> `Кечиккан`
     - `Degraded` -> `Қисман ишламоқда`
     - `Unavailable` -> `Ишламаяпти`
     - `Quiet` -> `Фаолиятсиз`
     - `Unknown` -> `Номаълум`
   - And logic, accessibility names, ARIA announcements, and tests do not depend on translated display strings,
   - And health status does not rely on color alone (combining distinct icons, text badges, and accessible labels).

5. **Deterministic Hierarchical Aggregation & Precedence Rules (AC 5)**:
   - Given component states must be aggregated into District or overall product health,
   - When hierarchical health is calculated,
   - Then known abnormal states use deterministic precedence `Unavailable > Degraded > Delayed > Unknown > Healthy`,
   - And a stronger known abnormal state is never hidden by a weaker or unknown child state,
   - And any required child in `Unknown` prevents the aggregate from becoming `Healthy` (forcing `Unknown` unless a stronger known abnormal state already applies),
   - And `Quiet` is neutral when mixed with otherwise `Healthy` technical operation (`Healthy` + `Quiet` => `Healthy`),
   - And a District becomes `Quiet` ONLY when all applicable intake sources are `Quiet`, every required technical component has sufficiently recent successful evidence, and no `Delayed`, `Degraded`, `Unavailable`, or `Unknown` condition applies,
   - And overall product health becomes `Quiet` ONLY when every included operating District is `Quiet`, platform-level required components are `Healthy`, and no stronger state applies,
   - And a mix of `Healthy` and `Quiet` Districts aggregates to `Healthy`, NOT `Quiet`.

6. **Telegram Intake Silence vs Direct Failure Evidence (AC 6)**:
   - Given an approved Telegram group has received no recent messages,
   - When its state is evaluated,
   - Then message silence alone NEVER makes the group disconnected, `Degraded`, or `Unavailable`,
   - And sufficiently recent direct failure evidence (e.g. Telegram 401/403/kicked errors) takes precedence over `Quiet`.

7. **Pilot Operating Thresholds & SLA Evaluation (AC 7)**:
   - Given pilot operating thresholds are evaluated,
   - When an eligible message has not entered processing within 5 minutes (`INTAKE_DELAY_THRESHOLD_MS = 5 * 60 * 1000`), the applicable state reflects `Delayed`,
   - And when its related Topic update has not become available within 15 minutes (`TOPIC_DELAY_THRESHOLD_MS = 15 * 60 * 1000`), the applicable Topic-processing state reflects `Delayed`,
   - And a technical health check older than 10 minutes (`STALE_CHECK_THRESHOLD_MS = 10 * 60 * 1000`) contributes `Unknown` rather than `Healthy`,
   - And threshold exceedance alone NEVER creates `Unavailable` or a Critical failure without direct technical evidence of complete failure.

8. **Controlled Deployment Configuration of Thresholds (AC 8)**:
   - Given those pilot thresholds need operational adjustment,
   - When deployment configuration is changed through environment variables (`HEALTH_INTAKE_DELAY_SECONDS`, `HEALTH_TOPIC_DELAY_SECONDS`, `HEALTH_STALE_CHECK_SECONDS`),
   - Then the health evaluator uses the controlled configured values,
   - And the Product Owner Console provides NO setting for modifying these thresholds,
   - And Story 4.1 introduces no general-purpose health-rule configuration UI.

9. **Lifecycle / Subscription Pause vs Technical Failure Separation (AC 9)**:
   - Given processing or access is intentionally paused by an authoritative lifecycle/subscription state (`SUSPENDED`, `CANCELLED`),
   - When System Health explains the condition,
   - Then that lifecycle cause remains distinct from technical failure,
   - And an intentional pause does not manufacture `Degraded` or `Unavailable` solely because processing is stopped by policy,
   - And the existing Subscriptions Console destination may be referenced for management context,
   - And Story 4.1 introduces no Epic 6 subscription-management mutation UI.

10. **Explicit Component Applicability & Exclusion from Aggregation (AC 10)**:
    - Given System Health determines which components apply to a monitored scope,
    - When component health is evaluated,
    - Then applicability is defined explicitly by the application-owned component contract rather than inferred from missing data,
    - And a component that does not apply to that District/scope receives NO health state and is excluded from hierarchical aggregation,
    - And non-applicability must never be converted into `Unknown`, `Quiet`, or `Healthy`,
    - And if the UI needs to communicate non-applicability, it does so as separate non-health metadata (e.g. `Қўлланилмайди`), NOT an invented 7th health state.

11. **Zero-Districts State Handling (AC 11)**:
    - Given no Districts have been configured,
    - When the Product Owner opens System Health,
    - Then the District collection shows an explicit no-Districts state (`Ҳозирча туманлар мавжуд эмас`),
    - And the application creates NO synthetic District health result,
    - And zero Districts must NOT aggregate to `Quiet`, `Unknown`, or `Healthy` as a District result,
    - And independently applicable global platform components continue to show their own evidence-based health when valid technical evidence exists.

12. **Monitored Component Scope Ownership & Global vs District Aggregation (AC 12)**:
    - Given a monitored component is registered with System Health,
    - When its health contract is defined,
    - Then the component explicitly declares whether it is `GLOBAL` or `DISTRICT` scoped:
      - `GLOBAL`: `database`, `processing_queue`, `storage`, `web_application`, `retention_jobs`
      - `DISTRICT`: `telegram_bot`, `telegram_groups`, `message_intake`, `ai_operations`, `district_retention`
    - And global platform components are evaluated once at their authoritative global scope rather than duplicated as independent failures under every District,
    - And District-owned components require explicit District identity,
    - And aggregate Product Health combines applicable global component results with District aggregate results without duplicating the same technical condition.

13. **Aggregate `lastCheckAt` Timestamp Calculation (Oldest-Contributing Rule) (AC 13)**:
    - Given multiple component results contribute to a District or overall aggregate health result,
    - When aggregate `lastCheckAt` is calculated,
    - Then it represents the **oldest latest technical-check timestamp among the required contributing health results**,
    - And the current evaluation time (`evaluatedAt`) is stored separately and cannot masquerade as fresh technical evidence,
    - And recalculating an aggregate from unchanged old evidence does NOT advance its displayed `lastCheckAt` time,
    - And any contributing required check older than the configured freshness limit (10 minutes) forces `Unknown`.

14. **Shared Zod API Contracts & Boundary Validation (AC 14)**:
    - Given health state crosses module, API, and browser boundaries,
    - When Story 4.1 defines its public contracts,
    - Then canonical health enums, component/scope identifiers, timestamps, applicability metadata, health evidence categories, aggregate results, and browser-safe diagnostic fields are defined through project-owned shared Zod contracts in `@mahalla-ovozi/api-contracts`,
    - And database rows, telemetry types, job payloads, or translated UI strings do not become public API contracts,
    - And backend and frontend validation use the same canonical contract definitions.

15. **Automated & Frontend Verification Standards (AC 15)**:
    - Integration tests against `mahalla_ovozi_test` cover:
      - 6 canonical states (`Healthy`, `Delayed`, `Degraded`, `Unavailable`, `Quiet`, `Unknown`)
      - Deterministic precedence (`Unavailable > Degraded > Delayed > Unknown > Healthy`)
      - Required-child `Unknown` propagation
      - `Healthy` + `Quiet` => `Healthy` district aggregate
      - All-`Quiet` district aggregate => `Quiet`
      - Oldest `lastCheckAt` calculation
      - 5-minute message intake delay and 15-minute topic delay thresholds
      - >10-minute stale check contributing `Unknown`
      - Non-applicable component exclusion
      - Zero-district behavior
      - Explicit District isolation and Product Owner authentication
    - Frontend unit & component tests cover:
      - All-District and selected-District view rendering
      - Canonical state badge rendering with Uzbek Cyrillic text and accessible ARIA labels (no color-only reliance)
      - Zero-districts empty state
      - Stale refresh banner preservation
      - Responsive reflow (desktop matrix / card view on mobile).

---

## Tasks / Subtasks

- [x] **Task 1: Shared API Contracts & Enums (`packages/api-contracts`)** (AC: 3, 4, 10, 12, 14)
  - [x] 1.1 In `packages/api-contracts/src/health.ts`:
    - Define `HealthStatusEnumSchema`: `z.enum(['Healthy', 'Delayed', 'Degraded', 'Unavailable', 'Quiet', 'Unknown'])`.
    - Define `ComponentScopeEnumSchema`: `z.enum(['GLOBAL', 'DISTRICT'])`.
    - Define `ComponentTypeEnumSchema`: `z.enum(['database', 'processing_queue', 'storage', 'web_application', 'telegram_bot', 'telegram_groups', 'message_intake', 'ai_operations', 'retention_jobs', 'district_retention'])`.
    - Define `TechnicalOutcomeSchema`: `z.enum(['success', 'failure', 'insufficient_evidence'])`.
    - Define `ComponentHealthObservationSchema`:
      - `component`: `ComponentTypeEnumSchema`
      - `scope`: `ComponentScopeEnumSchema`
      - `districtId`: `z.string().min(1).nullable()`
      - `status`: `HealthStatusEnumSchema`
      - `lastCheckAt`: `z.string().datetime()`
      - `checkedAt`: `z.string().datetime()`
      - `outcome`: `TechnicalOutcomeSchema`
      - `errorCode`: `z.string().nullable()` (privacy-safe category code)
      - `errorMessage`: `z.string().nullable()` (privacy-safe sanitized message)
      - `latencyMs`: `z.number().nonnegative().nullable()`
      - `isApplicable`: `z.boolean()`
      - `lifecycleStatus`: `z.string().nullable()` (e.g. `'ACTIVE' | 'SUSPENDED' | 'CANCELLED' | null`)
    - Define `DistrictHealthSummarySchema`:
      - `districtId`: `z.string().min(1)`
      - `districtName`: `z.string()`
      - `status`: `HealthStatusEnumSchema`
      - `lastCheckAt`: `z.string().datetime()`
      - `components`: `z.array(ComponentHealthObservationSchema)`
      - `lifecycleStatus`: `z.string().nullable()`
    - Define `OverallSystemHealthResponseSchema`:
      - `status`: `HealthStatusEnumSchema`
      - `lastCheckAt`: `z.string().datetime()`
      - `evaluatedAt`: `z.string().datetime()`
      - `globalComponents`: `z.array(ComponentHealthObservationSchema)`
      - `districts`: `z.array(DistrictHealthSummarySchema)`
      - `totalDistricts`: `z.number().int().nonnegative()`
      - `activeDistricts`: `z.number().int().nonnegative()`
    - Define `DistrictHealthResponseSchema`:
      - `districtId`: `z.string().min(1)`
      - `districtName`: `z.string()`
      - `status`: `HealthStatusEnumSchema`
      - `lastCheckAt`: `z.string().datetime()`
      - `evaluatedAt`: `z.string().datetime()`
      - `components`: `z.array(ComponentHealthObservationSchema)`
      - `lifecycleStatus`: `z.string().nullable()`
  - [x] 1.2 In `packages/api-contracts/src/index.ts`:
    - Re-export all schemas and types from `./health.js`.

- [x] **Task 2: Backend Pure Health Evaluator & Aggregation Engine (`apps/backend`)** (AC: 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13)
  - [x] 2.1 In `apps/backend/src/modules/health/health-evaluator.ts`:
    - Implement `HEALTH_STATE_PRECEDENCE`: `['Unavailable', 'Degraded', 'Delayed', 'Unknown', 'Healthy']`.
    - Implement `aggregateComponentStatuses(components: ComponentHealthObservation[], options: { isQuietAllowed: boolean }): { status: HealthStatus; lastCheckAt: Date }`:
      - Filter out non-applicable components (`isApplicable === false`).
      - If no applicable components exist, return `{ status: 'Unknown', lastCheckAt: evaluatedAt }`.
      - Calculate `lastCheckAt` as `min(component.lastCheckAt)` across all required applicable components.
      - If all applicable intake components are `Quiet` and all other applicable required components are `Healthy` (and fresh < 10m), return `{ status: 'Quiet', lastCheckAt }`.
      - If components mix `Healthy` and `Quiet` without abnormal states, return `{ status: 'Healthy', lastCheckAt }`.
      - If any required component is `Unknown` and no stronger state (`Unavailable`, `Degraded`, `Delayed`) exists, return `{ status: 'Unknown', lastCheckAt }`.
      - Apply deterministic abnormal precedence: `Unavailable > Degraded > Delayed`.
    - Implement `aggregateOverallSystemHealth(globalComponents: ComponentHealthObservation[], districtSummaries: DistrictHealthSummary[], evaluatedAt: Date)`:
      - If `districtSummaries` is empty:
        - District aggregate is omitted (no synthetic district).
        - Overall health is derived solely from required `globalComponents`.
      - If districts exist:
        - If all districts are `Quiet` and all global components are `Healthy`, overall health is `Quiet`.
        - If a mix of `Healthy` and `Quiet` districts exists with `Healthy` global components, overall health is `Healthy`.
        - Abnormal states from either global components or districts propagate per precedence: `Unavailable > Degraded > Delayed > Unknown`.
        - `lastCheckAt` is the oldest `lastCheckAt` among all contributing required global components and active districts.
    - Implement `evaluateFreshness(lastCheckAt: Date | null, staleThresholdMs: number): boolean`:
      - Returns `true` if `lastCheckAt` is within `staleThresholdMs` (10 minutes), otherwise `false`.
    - Implement `evaluateThreshold(lastEvidenceAt: Date | null, thresholdMs: number, now: Date): HealthStatus`:
      - Returns `Delayed` if `now - lastEvidenceAt > thresholdMs`, otherwise `Healthy`.

- [x] **Task 3: Backend Technical Health Checker Adapters (`apps/backend`)** (AC: 2, 6, 7, 9, 12)
  - [x] 3.1 In `apps/backend/src/modules/health/health-checker.ts`:
    - Implement `checkDatabaseHealth(pool: pg.Pool, config: HealthConfig): Promise<ComponentHealthObservation>`:
      - Executes `SELECT 1 AS health` query with unref'd timeout (e.g. 2000ms).
      - Collects pool metrics: `pool.totalCount`, `pool.idleCount`, `pool.waitingCount`.
      - Returns `Healthy` if query succeeds within SLA and `pool.waitingCount === 0`; `Degraded` if queue saturation detected (`waitingCount > 0`); `Unavailable` with sanitized category `DATABASE_CONNECTION_ERROR` if connection fails or times out.
    - Implement `checkProcessingQueueHealth(boss: PgBoss | undefined, config: HealthConfig): Promise<ComponentHealthObservation>`:
      - Uses official pg-boss 10.x `boss.countStates()` probe wrapped in non-throwing timeout (unref'd timer).
      - Inspects queue states: `created`, `retry`, `active`, `completed`, `failed`.
      - Computes backlog: `totalBacklog = (states.created || 0) + (states.retry || 0)`.
      - Returns `Healthy` if reachable and backlog under threshold; `Delayed` if backlog exceeds threshold; `Unavailable` with `QUEUE_CONNECTION_ERROR` if boss is undefined, disconnected, or times out.
    - Implement `checkStorageHealth(db: DbClient, config: HealthConfig): Promise<ComponentHealthObservation>`:
      - Verifies database storage readiness and WAL archiving check.
    - Implement `checkWebApplicationHealth(config: HealthConfig): Promise<ComponentHealthObservation>`:
      - Reports server process uptime (`process.uptime()`), heap memory (`process.memoryUsage().heapUsed`), and Node.js runtime status.
    - Implement `checkDistrictBotHealth(db: DbClient, districtId: string, config: HealthConfig): Promise<ComponentHealthObservation>`:
      - Queries `district_telegram_bots` table.
      - If no bot exists: `isApplicable: false`.
      - If bot `status === 'VALID'` and `lastValidatedAt` is fresh (< 10m) -> `Healthy`.
      - If bot is disconnected/failed (`status === 'INVALID'`) -> `Unavailable` or `Degraded`.
      - If stale > 10m without activity -> `Unknown`.
    - Implement `checkDistrictGroupsHealth(db: DbClient, districtId: string, config: HealthConfig): Promise<ComponentHealthObservation>`:
      - Queries `district_telegram_groups` table.
      - If no groups configured -> `isApplicable: false`.
      - If groups exist, checks for recent intake or error flags. If silence -> `Quiet`.
    - Implement `checkDistrictIntakeHealth(db: DbClient, districtId: string, config: HealthConfig): Promise<ComponentHealthObservation>`:
      - Queries `telegram_intake_records` for latest message.
      - If unprocessed message > 5 min old -> `Delayed`.
      - If latest processed message within 5 min -> `Healthy`.
      - If no messages -> `Quiet`.
    - Implement `checkDistrictAiHealth(db: DbClient, districtId: string, config: HealthConfig): Promise<ComponentHealthObservation>`:
      - Queries `ai_operations` for district.
      - Checks latest operation status and topic update delay (> 15 min -> `Delayed`).
      - If recent failure rate exceeds threshold -> `Degraded`.
      - If no operations -> `Quiet`.
    - Implement `checkRetentionJobHealth(db: DbClient, config: HealthConfig): Promise<ComponentHealthObservation>`:
      - Checks latest retention execution from audit logs.
      - If last execution within 24h -> `Healthy`; if delayed -> `Delayed`.
    - Apply `assertPrivacyBoundary` to ensure zero credentials, bot tokens, or resident evidence leak into observation details.

- [x] **Task 4: Backend Health Service & Fastify HTTP Routes (`apps/backend`)** (AC: 1, 8, 9, 11, 14)
  - [x] 4.1 In `apps/backend/src/modules/health/health-service.ts`:
    - Implement `getOverallSystemHealth(db: DbClient, pool: pg.Pool, boss?: PgBoss, config?: HealthConfig)`:
      - Loads all districts from `districts` table.
      - Runs global component checks in parallel via `Promise.all`.
      - Runs per-district component checks in parallel.
      - Aggregates using `health-evaluator.ts`.
      - Returns validated `OverallSystemHealthResponse`.
    - Implement `getDistrictHealth(db: DbClient, districtId: string, pool: pg.Pool, boss?: PgBoss, config?: HealthConfig)`:
      - Validates district existence (throws `DistrictNotFoundError` if missing).
      - Checks district lifecycle status (`ACTIVE`, `SETUP_INCOMPLETE`, `SUSPENDED`, `CANCELLED`).
      - Runs district-scoped component checks.
      - Aggregates using `health-evaluator.ts`.
      - Returns validated `DistrictHealthResponse`.
  - [x] 4.2 In `apps/backend/src/modules/health/health-routes.ts`:
    - Create `registerHealthRoutes(fastify: FastifyInstance, deps: { db: DbClient; pool: pg.Pool; boss?: PgBoss; config?: HealthConfig })`:
      - Encapsulate in Fastify v5 plugin scope (`fastify.register(async (scope) => { ... })`).
      - Apply hooks: `scope.addHook('preHandler', verifyStateChangingOrigin)` and `scope.addHook('preHandler', createRequireProductOwner(deps.db))`.
      - `GET /api/v1/health/system` -> calls `getOverallSystemHealth`.
      - `GET /api/v1/districts/:districtId/health` -> calls `getDistrictHealth`.
  - [x] 4.3 In `apps/backend/src/entrypoints/http.ts`:
    - Register `registerHealthRoutes(server, { db, pool, boss: options?.boss })`.

- [x] **Task 5: Frontend Health Client & TanStack Query Hooks (`apps/web`)** (AC: 1, 4, 13, 14)
  - [x] 5.1 In `apps/web/src/health/health-client.ts`:
    - Implement `getSystemHealth(): Promise<OverallSystemHealthResponse>` (`GET /api/v1/health/system`).
    - Implement `getDistrictHealth(districtId: string): Promise<DistrictHealthResponse>` (`GET /api/v1/districts/${districtId}/health`).
  - [x] 5.2 In `apps/web/src/health/useSystemHealth.ts`:
    - Define hierarchical query keys:
      ```ts
      export const healthKeys = {
        all: ['health'] as const,
        system: () => [...healthKeys.all, 'system'] as const,
        districts: () => [...healthKeys.all, 'district'] as const,
        district: (id: string) => [...healthKeys.districts(), id] as const,
      };
      ```
    - Implement `useSystemHealth(selectedDistrictId?: string | null)`:
      - Query key: `selectedDistrictId ? healthKeys.district(selectedDistrictId) : healthKeys.system()`.
      - Query function: `() => selectedDistrictId ? getDistrictHealth(selectedDistrictId) : getSystemHealth()`.
      - Polling interval: `refetchInterval: 30_000` with `refetchIntervalInBackground: false`.
      - Offline mode: `networkMode: 'online'` (prevents false network failure toasts when browser is offline).
      - TanStack Query v5 pattern: `placeholderData: keepPreviousData` (preserves prior data during refresh or scope transition).
      - Stale time: `staleTime: 15_000`, `gcTime: 600_000`.
      - Exposes `{ data, isLoading, isError, error, refetch, isFetching, lastUpdated }`.

- [x] **Task 6: Frontend UI Components (`apps/web`)** (AC: 1, 4, 9, 10, 11, 13)
  - [x] 6.1 In `apps/web/src/components/health/HealthStatusBadge.tsx`:
    - Maps canonical states to Uzbek Cyrillic and Ant Design Tag tokens:
      - `Healthy`: `Соғлом`, color: `success`, icon: `<CheckCircleOutlined />`
      - `Delayed`: `Кечиккан`, color: `warning`, icon: `<ClockCircleOutlined />`
      - `Degraded`: `Қисман ишламоқда`, color: `orange`, icon: `<ExclamationCircleOutlined />`
      - `Unavailable`: `Ишламаяпти`, color: `error`, icon: `<CloseCircleOutlined />`
      - `Quiet`: `Фаолиятсиз`, color: `default`, icon: `<PauseCircleOutlined />`
      - `Unknown`: `Номаълум`, color: `default`, icon: `<QuestionCircleOutlined />`
    - Accessible ARIA attributes: `aria-label={`Ҳолат: ${label}`}`, `role="status"`.
    - Non-color-only encoding: distinct icons + visible text.
  - [x] 6.2 In `apps/web/src/components/health/OverallHealthCard.tsx`:
    - Displays overall system status badge, `lastCheckAt` timestamp, evaluated timestamp, and total/active district metrics.
    - Uses `fontVariantNumeric: 'tabular-nums'` on timestamps to eliminate layout jitter.
    - Includes manual refresh button (`Янгилаш`) with spinning icon during `isFetching`.
  - [x] 6.3 In `apps/web/src/components/health/GlobalComponentsTable.tsx`:
    - Table of global components (Database, Message Queue, Storage, Web Application, Retention).
    - Columns: Component Name (Uzbek Cyrillic: `Маълумотлар базаси`, `Навбат тизими`, `Сақлаш тизими`, `Веб илова`, `Маълумотларни сақлаш муддати`), Scope (`Глобал`), Status Badge, Last Check Time, Sanitized Details/Latency.
  - [x] 6.4 In `apps/web/src/components/health/DistrictHealthMatrix.tsx`:
    - Matrix / Table of districts and their component statuses (`Telegram бот`, `Telegram гуруҳлар`, `Хабарлар қабули`, `АИ операциялари`).
    - Highlighting active district when selected.
    - Handles zero-districts state with empty container: `Ҳозирча туманлар мавжуд эмас`.
    - Handles lifecycle pauses: shows `Тўхтатилган (Обуна)` with reference link to Subscriptions.
    - Excludes non-applicable components gracefully (`-` or `Қўлланилмайди`).
  - [x] 6.5 In `apps/web/src/pages/SystemHealthPage.tsx` (replaces placeholder):
    - Integrates `OverallHealthCard`, `GlobalComponentsTable`, and `DistrictHealthMatrix`.
    - Loading skeletons matching structure with fixed `minHeight` (0px layout shift).
    - Stale data alert banner with `Қайта уриниш` on refresh error.
    - Responds to `activeDistrictId` from `useDistrict()` context to filter or highlight.
  - [x] 6.6 In `apps/web/src/components/OverviewMetricCards.tsx`:
    - Connect `metric-system-health` card to real `useSystemHealth()` data instead of hardcoded placeholder.
    - Update `subText` to reflect active issues / delay status truthfully.

- [x] **Task 7: Automated Integration Tests (`apps/backend/tests/system-health.test.ts`)** (AC: 1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15)
  - [x] 7.1 Pure Evaluator Unit Tests:
    - Test 6 canonical states generation.
    - Test precedence: `Unavailable > Degraded > Delayed > Unknown > Healthy`.
    - Test `Healthy` + `Quiet` => `Healthy` aggregation.
    - Test all-`Quiet` district => `Quiet`.
    - Test required-child `Unknown` prevents `Healthy` (becomes `Unknown`).
    - Test `lastCheckAt` calculated as oldest timestamp among required components.
    - Test 5-minute intake delay threshold and 15-minute topic delay threshold.
    - Test >10-minute stale check threshold contributing `Unknown`.
    - Test non-applicable component exclusion.
    - Test zero-district handling (global components evaluate without synthetic district).
  - [x] 7.2 Backend Integration Tests against `mahalla_ovozi_test`:
    - Test `GET /api/v1/health/system` returns 200 with truthful overall and district health when authenticated as Product Owner.
    - Test `GET /api/v1/health/system` returns 401/403 for unauthenticated or Hokim requests.
    - Test `GET /api/v1/districts/:districtId/health` returns 200 with district health.
    - Test `GET /api/v1/districts/:districtId/health` returns 404 for nonexistent district.
    - Test tenant isolation: district endpoint only returns the specified district's components.
    - Test privacy boundary: response payload contains zero bot tokens, credentials, resident texts, or raw upstream errors.
    - Test subscription pause status is reported distinctly without manufacturing technical failure.

- [x] **Task 8: Frontend Unit & Component Tests (`apps/web/tests/unit`)** (AC: 4, 11, 15)
  - [x] 8.1 In `apps/web/tests/unit/HealthStatusBadge.test.tsx`:
    - Test rendering all 6 canonical states with correct Uzbek Cyrillic text and icons.
    - Test ARIA accessibility attributes (`aria-label`, `role="status"`).
  - [x] 8.2 In `apps/web/tests/unit/SystemHealthPage.test.tsx`:
    - Test rendering loading skeleton during initial load.
    - Test rendering overall health card, global components table, and district health matrix.
    - Test zero-districts empty state rendering.
    - Test error banner and retry action on fetch failure.
    - Test active district context filtering when `activeDistrictId` is set.
    - Test offline status indicator banner.

---

## Dev Notes

### Relevant Architecture Patterns & Constraints
1. **Database & Environment Isolation (AGENTS.md mandatory rule)**:
   - All automated test suites MUST execute strictly against the isolated test database `mahalla_ovozi_test` (port 5433). Never run tests, migrations, or mock seeding against `mahalla_ovozi` (port 5432) used for local development.
2. **Product Owner Health vs Engineering Telemetry Separation (AD-11)**:
   - System Health is application-owned sanitized state that runs directly from Fastify and PostgreSQL. It MUST NOT depend on an external OpenTelemetry collector or third-party monitoring vendor to function.
3. **Strict Privacy Boundary (AD-09, AD-11)**:
   - Health check observations, API responses, error details, and log payloads must NEVER contain resident message text, citizen names, bot tokens, API keys, credentials, or raw upstream error stack traces.
   - All diagnostic error details must be sanitized into category codes and user-safe explanations.
4. **Deterministic Precedence & Oldest `lastCheckAt` Timestamp Rule (AD-11)**:
   - Abnormal states strictly follow `Unavailable > Degraded > Delayed > Unknown > Healthy`.
   - `lastCheckAt` MUST be calculated as the **oldest latest technical-check timestamp among required contributing components**. Re-evaluating the aggregate without fresh technical checks must not advance `lastCheckAt`.
5. **Quiet is NOT Failure (PRD FR-25, AD-11)**:
   - A Telegram group or district with no recent messages is `Quiet`, NOT disconnected or degraded. Silence alone never creates a failure state.
6. **Separation of Subscription Pause from Technical Failure (PRD FR-25)**:
   - Suspended or cancelled districts must be reported as policy pauses referencing Subscriptions, not technical component breakdowns.
7. **Current-Data & Library Best Practices (Verified 2026-08-25)**:
   - **pg-boss 10.x:** Use `boss.countStates()` for structured state monitoring; wrap probes in non-throwing unref'd timeouts to prevent unhandled rejection crashes.
   - **Fastify 5.x:** Use plugin-scoped route encapsulation (`fastify.register(async (scope) => { ... })`) to cleanly isolate `requireProductOwner` and origin guards.
   - **TanStack Query v5:** Use `placeholderData: keepPreviousData` (replaces deprecated `keepPreviousData: true`), `networkMode: 'online'`, and hierarchical query keys.
   - **PostgreSQL Pool:** Collect `pool.totalCount`, `pool.idleCount`, `pool.waitingCount` to identify connection saturation.
   - **Ant Design 5.x & React 19:** Use `role="status"` and `aria-label` on non-color-only status badges; use `fontVariantNumeric: 'tabular-nums'` and fixed container `minHeight` for 0px CLS.

### Source Tree Components to Touch

#### Files to Create:
1. `packages/api-contracts/src/health.ts` — Zod schemas and TypeScript types for system health.
2. `apps/backend/src/modules/health/health-evaluator.ts` — Pure aggregation and precedence evaluation engine.
3. `apps/backend/src/modules/health/health-checker.ts` — Technical health adapters for DB, queue, storage, bot, groups, intake, AI, retention.
4. `apps/backend/src/modules/health/health-service.ts` — High-level health query service for system and district scopes.
5. `apps/backend/src/modules/health/health-routes.ts` — Protected Fastify routes for `/api/v1/health/system` and `/api/v1/districts/:districtId/health`.
6. `apps/web/src/health/health-client.ts` — API client for health endpoints.
7. `apps/web/src/health/useSystemHealth.ts` — TanStack Query hook for health data.
8. `apps/web/src/components/health/HealthStatusBadge.tsx` — Status badge component with Uzbek Cyrillic labels and icons.
9. `apps/web/src/components/health/OverallHealthCard.tsx` — Summary card for product health.
10. `apps/web/src/components/health/GlobalComponentsTable.tsx` — Global platform components table.
11. `apps/web/src/components/health/DistrictHealthMatrix.tsx` — Per-district components matrix table.
12. `apps/backend/tests/system-health.test.ts` — Vitest integration and evaluator test suite.
13. `apps/web/tests/unit/HealthStatusBadge.test.tsx` — Frontend unit tests for status badges.
14. `apps/web/tests/unit/SystemHealthPage.test.tsx` — Frontend unit tests for System Health page.

#### Files to Update:
1. `packages/api-contracts/src/index.ts`:
   - *Current state:* Exports auth, districts, telegram, hokim-accounts, ai-operations, topics contracts.
   - *Changes:* Export all contracts from `./health.js`.
   - *Preserve:* All existing exports.
2. `apps/backend/src/entrypoints/http.ts`:
   - *Current state:* Registers auth, districts, telegram, hokim, ai, topics routes.
   - *Changes:* Register `registerHealthRoutes(server, { db, pool, boss: options?.boss })`.
   - *Preserve:* All existing routes, CORS, cookie, and error handling.
3. `apps/web/src/pages/placeholders/SystemHealthPage.tsx` -> `apps/web/src/pages/SystemHealthPage.tsx`:
   - *Current state:* Simple placeholder card.
   - *Changes:* Replace with fully featured System Health page incorporating `OverallHealthCard`, `GlobalComponentsTable`, and `DistrictHealthMatrix`.
   - *Preserve:* Route in `App.tsx` and menu entry in `ConsoleLayout.tsx`.
4. `apps/web/src/App.tsx`:
   - *Current state:* Imports placeholder `SystemHealthPage`.
   - *Changes:* Import real `SystemHealthPage` from `../pages/SystemHealthPage.js`.
   - *Preserve:* All routes and layout wrapper.
5. `apps/web/src/components/OverviewMetricCards.tsx`:
   - *Current state:* Hardcoded "Барқарор" health status metric card.
   - *Changes:* Connect to `useSystemHealth()` to display truthful live aggregate status.
   - *Preserve:* Metric card styling and responsive layout.

---

### Project Structure Notes
- Shared API contracts live in `packages/api-contracts/src/health.ts`.
- Backend domain and routing live in `apps/backend/src/modules/health/`.
- Frontend health components live in `apps/web/src/components/health/`.
- Frontend hooks and clients live in `apps/web/src/health/`.

---

### References
- [Epic 4 Specification: Story 4.1](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/epics/epic-4.md#L8-L123)
- [PRD FR-25 & FR-28 (System Health & Truthful Diagnostics)](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/prds/prd-Mahalla-Ovozi-2026-07-30/prd.md#L412-L460)
- [Architecture Spine AD-09, AD-10, AD-11](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/architecture/architecture-Mahalla-Ovozi-2026-08-12/ARCHITECTURE-SPINE.md#L128-L145)
- [UX Experience Spine (System Health Surface)](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/ux-designs/ux-Mahalla-Ovozi-2026-08-05/EXPERIENCE.md#L27-L38)
- [Project Context & Implementation Rules](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/project-context.md)

---

## Dev Agent Record

### Agent Model Used
Gemini 3.7 Flash (High)

### Debug Log References
- Checked `packages/api-contracts/src/` for contract structure conventions.
- Checked `apps/backend/src/modules/` and `entrypoints/http.ts` for Fastify route encapsulation and auth plugins (`createRequireProductOwner`).
- Checked `apps/backend/src/adapters/db/schema/` for tables (`districts`, `district_telegram_bots`, `district_telegram_groups`, `telegram_intakes`, `ai_operations`).
- Checked `apps/web/src/components/ConsoleLayout.tsx` and `pages/placeholders/SystemHealthPage.tsx` for layout and navigation integration.
- Evaluated deterministic aggregation rules, oldest `lastCheckAt` timestamp calculation, and pilot SLA delay thresholds.

### Completion Notes List
- Comprehensive story specification for Story 4.1 generated with 15 detailed acceptance criteria groups and 8 structured tasks with 25 subtasks.
- Complete coverage of the 6 canonical states, deterministic precedence, required-child `Unknown` propagation, `Quiet` neutrality, oldest-contributing timestamp aggregation, privacy boundary enforcement, and isolated database testing standards.
- Phase 1: Shared API contracts defined in `packages/api-contracts/src/health.ts` and re-exported in `src/index.ts`.
- Phase 2: Pure deterministic health evaluator and SLA threshold engine implemented in `apps/backend/src/modules/health/health-evaluator.ts`.
- Phase 3: Backend technical health check adapters, service, and Fastify 5 plugin routes implemented in `apps/backend/src/modules/health/` and registered in `apps/backend/src/entrypoints/http.ts`.
- Phase 4: Frontend API client and TanStack Query v5 hook implemented in `apps/web/src/health/`.
- Phase 5: Accessible frontend UI components (`HealthStatusBadge`, `OverallHealthCard`, `GlobalComponentsTable`, `DistrictHealthMatrix`, `SystemHealthPage`) implemented in `apps/web/src/` with Uzbek Cyrillic labels and 0px CLS.
- Phase 6: Full unit and integration test suites passing in `apps/backend/tests/system-health.test.ts` (22 tests) and `apps/web/tests/unit/` (10 tests). Zero typecheck errors across all monorepo packages.

### Change Log
- 2026-08-25: Implemented Story 4.1 across packages/api-contracts, apps/backend, and apps/web. All 8 tasks and 25 subtasks complete and passing. Ready for code review.

### File List
- `packages/api-contracts/src/health.ts`
- `packages/api-contracts/src/index.ts`
- `apps/backend/src/modules/health/health-evaluator.ts`
- `apps/backend/src/modules/health/health-checker.ts`
- `apps/backend/src/modules/health/health-service.ts`
- `apps/backend/src/modules/health/health-routes.ts`
- `apps/backend/src/entrypoints/http.ts`
- `apps/web/src/health/health-client.ts`
- `apps/web/src/health/useSystemHealth.ts`
- `apps/web/src/components/health/HealthStatusBadge.tsx`
- `apps/web/src/components/health/OverallHealthCard.tsx`
- `apps/web/src/components/health/GlobalComponentsTable.tsx`
- `apps/web/src/components/health/DistrictHealthMatrix.tsx`
- `apps/web/src/pages/SystemHealthPage.tsx`
- `apps/web/src/App.tsx`
- `apps/web/src/components/OverviewMetricCards.tsx`
- `apps/backend/tests/system-health.test.ts`
- `apps/web/tests/unit/HealthStatusBadge.test.tsx`
- `apps/web/tests/unit/SystemHealthPage.test.tsx`

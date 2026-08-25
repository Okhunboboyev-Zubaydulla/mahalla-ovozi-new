---
baseline_commit: 3cecce0
---

# Story 4.2: Investigate Active Operational Issues and Verified Recovery

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the **Product Owner**,  
I want to see active operational issues ranked by severity, understand their scope and recommended next step, and have issues resolve automatically when recovery is verified,  
So that I can address real problems without manual ticket tracking, false alarms, or unverified closeouts.

---

## Acceptance Criteria

1. **Stable Logical Issue Identity & Continuing Deduplication (AC 1)**:
   - Given component health evaluation detects a condition requiring operational attention,
   - When an operational issue is created or refreshed,
   - Then the application creates one active issue identity for that logical condition,
   - And the identity is derived deterministically from its authoritative affected scope (`GLOBAL` vs `DISTRICT`), `districtId` (nullable for global), `component`, and `issueCategory` (`logicalKey = ${scope}:${districtId || 'global'}:${component}:${issueCategory}`), rather than from check time or UI state,
   - And repeated checks showing the same continuing condition update that existing active issue record (`latestCheckAt`, updated sanitized details) rather than creating duplicates,
   - And its original start time (`startedAt`) remains unchanged while the condition continues.

2. **Deterministic Severity Classification & Guardrails (AC 2)**:
   - Given an active issue is evaluated for severity,
   - When its current technical evidence is classified,
   - Then canonical severity values are strictly limited to `Critical`, `Warning`, and `Information`,
   - And direct evidence that an essential required component cannot operate (`Unavailable` state on required components: database connection failure, queue unavailability, bot disconnected/invalid) qualifies for `Critical`,
   - And `Delayed` or `Degraded` technical conditions (queue backlog delay, message intake delay > 5m, topic processing delay > 15m, AI operation degradation) qualify for `Warning` unless stronger direct evidence requires `Critical`,
   - And `Healthy` and `Quiet` never create failure issues by themselves,
   - And an `Unknown` state does not become `Critical` or `Warning` merely because evidence is missing or stale,
   - And `Information` is strictly limited to actionable non-failure operational conditions (e.g. scheduled maintenance notices, lifecycle pause notes) that do not claim a technical failure meeting `Warning` or `Critical` criteria,
   - And `Information` issues must never masquerade as technical component failures or represent healthy baseline operation,
   - And severity derivation is deterministic application logic rather than arbitrary UI labeling.

3. **Canonical Enums & Approved Uzbek Cyrillic UI Labels (AC 3)**:
   - Given canonical issue severity crosses into the UI,
   - When it is displayed,
   - Then internal and API values remain stable canonical enums (`Critical`, `Warning`, `Information`),
   - And visible user-facing labels and explanations use approved Uzbek Cyrillic:
     - `Critical` -> `Муҳим` (Ant Design error red, `<CloseCircleOutlined />`)
     - `Warning` -> `Огоҳлантириш` (Ant Design warning orange, `<ExclamationCircleOutlined />`)
     - `Information` -> `Маълумот` (Ant Design info blue, `<InfoCircleOutlined />`)
   - And severity meaning does not depend on color alone (combining distinct icons, text badges, and accessible ARIA attributes `role="status"` and `aria-label`).

4. **Deterministic Ordering & Tenant Isolation in UI (AC 4)**:
   - Given multiple active issues exist,
   - When System Health or Console Overview displays them,
   - Then issues are ordered strictly by severity `Critical` before `Warning` before `Information`,
   - And ties in severity use deterministic secondary ordering by `startedAt DESC` with `id` tiebreaker rather than unstable presentation,
   - And each issue keeps its affected District and component explicit where applicable,
   - And all-District views never mix or leak protected District-owned detail across District boundaries.

5. **Issue Detail, Recommended Action & Management Routing (AC 5)**:
   - Given the Product Owner opens an issue for detailed inspection,
   - When issue detail is displayed in the desktop Drawer or mobile full-screen panel,
   - Then it shows the affected scope/component, current severity and health condition, original start time (`startedAt`), latest check time (`latestCheckAt`), privacy-safe identifiers, safe error category, sanitized explanation, and recommended next investigation area where applicable,
   - And it routes directly to an existing applicable management surface when one exists:
      - Telegram bot token/connection issue -> routes to Telegram Setup (`/telegram-setup` or `/telegram-setup?districtId=${districtId}`),
      - Telegram group issue -> routes to Telegram Setup mappings (`/telegram-setup` or `/telegram-setup?districtId=${districtId}`),
      - Subscription pause note -> routes to Subscriptions (`/subscriptions`),
   - And if no supported Console action can resolve the condition (e.g. global PostgreSQL connection loss, pg-boss worker stoppage), it clearly explains the next technical area to inspect rather than inventing a synthetic repair capability,
   - And raw resident evidence, credentials, secrets, bot tokens, resident-bearing AI context, and raw upstream stack traces are strictly excluded.

6. **Continuing Issue Evaluation & Audit Deduplication (AC 6)**:
   - Given subsequent checks prove that the same issue condition still exists,
   - When the active issue is refreshed,
   - Then the same issue remains active,
   - And its latest-check metadata (`latestCheckAt`, `metadata`) is updated,
   - And its original start time (`startedAt`) and stable issue identity are preserved,
   - And another failure-start audit transition is NOT emitted merely because the continuing failure was checked again.

7. **Stale Evidence / Unknown State Preserves Active Issues (AC 7)**:
   - Given the evidence required to evaluate an active issue becomes stale (> 10 minutes) or insufficient,
   - When Story 4.1 evaluates the affected health scope as `Unknown`,
   - Then the existing active issue is NOT falsely marked recovered,
   - And loss of evidence alone does not fabricate continuing technical failure beyond what current evidence supports,
   - And the issue remains unresolved until its own required recovery condition is successfully verified or the domain condition is otherwise authoritatively superseded.

8. **Matching-Scope Requirement for Verified Recovery (AC 8)**:
   - Given a technical check succeeds somewhere in the system,
   - When issue recovery is evaluated,
   - Then that success can resolve an issue ONLY IF the check matches the same affected scope (`GLOBAL` vs `DISTRICT`), `districtId` (if applicable), component, and failure condition required by that issue's recovery contract,
   - And an unrelated successful check cannot resolve the issue,
   - And a successful check for another District cannot resolve it.

9. **Automated Verified Recovery & Idempotency (AC 9)**:
   - Given the matching recovery check proves the failed condition no longer exists,
   - When recovery commits,
   - Then the issue transitions from `ACTIVE` to `RESOLVED` automatically,
   - And its recovery time (`resolvedAt`) and privacy-safe supporting metadata are recorded,
   - And no Product Owner acknowledgement or manual close action is required,
   - And the same recovery transition cannot be committed twice by duplicate checks, retries, worker restarts, or concurrent evaluation.

10. **Atomic Failure-Start State + Audit Persistence (AC 10)**:
    - Given one logical issue transitions from absent to active,
    - When that failure transition is committed,
    - Then the state mutation in `operational_issues` and its single failure-start audit record in `audit_events` commit atomically in the same transactional boundary (`db.transaction()`),
    - And if the audit write fails, the issue transition does not commit,
    - And continuing health checks do not produce duplicate failure-start records.

11. **Atomic Verified-Recovery State + Audit Persistence (AC 11)**:
    - Given that same issue later transitions from active to verified recovered,
    - When recovery commits,
    - Then the state transition from `ACTIVE` to `RESOLVED` and its single verified-recovery audit record in `audit_events` commit atomically in the same transactional boundary (`db.transaction()`),
    - And if the audit record cannot be written, the issue remains active and does not falsely claim verified recovery,
    - And duplicate or concurrent recovery evaluation cannot append duplicate recovery transitions.

12. **Distinct Lifecycles for Genuine Recurrence (AC 12)**:
    - Given a resolved issue condition later fails again,
    - When the new failure is evaluated,
    - Then reopening after a genuinely new later occurrence starts a new distinct issue lifecycle with its own `id`, `startedAt`, and failure-start audit event, rather than mutating the previously resolved lifecycle,
    - And a new failure condition cannot be appended onto an already resolved issue record.

13. **Canonical System Actor & Privacy-Safe Audit Metadata (AC 13)**:
    - Given failure or recovery transitions are audited,
    - When their audit metadata is persisted in `audit_events`,
    - Then the actor for automated health and recovery transitions is recorded through an explicit canonical system-actor identity (`actorId: 'system:health-monitor'`, `actorRole: 'SYSTEM'`),
    - And the record contains only privacy-safe actor/system, District/scope, component, issue identifier/category, timestamps, transition/outcome, and approved safe diagnostic identifiers or metadata,
    - And raw resident content, credentials, bot tokens, provider secrets, resident-bearing AI context, and raw upstream errors are excluded,
    - And Story 4.2 does not depend on the later Story 4.4 Audit History browsing UI.

14. **Lifecycle / Subscription Pause Separation (AC 14)**:
    - Given processing or access is intentionally paused by an authoritative lifecycle or subscription state (`SUSPENDED`, `CANCELLED`),
    - When System Health presents that condition,
    - Then the lifecycle cause remains distinct from a technical failure issue,
    - And it cannot become `Critical` or `Warning` merely because intentional processing is stopped,
    - And an applicable route may point toward the established Subscriptions destination (`/subscriptions`),
    - And Story 4.2 adds no Epic 6 subscription-management behavior.

15. **Quiet Intake & Network Resilience Guardrails (AC 15)**:
    - Given an approved Telegram group is merely quiet, the Product Owner browser loses network connectivity, or an operating target is exceeded without stronger evidence,
    - When active issues are evaluated,
    - Then message silence alone creates no technical failure issue,
    - And browser connectivity loss creates no server or District health issue,
    - And target exceedance may produce `Warning` through the applicable delayed condition but cannot produce `Critical` or `Unavailable` without the required direct technical evidence.

16. **Stale Refresh & Accessible Detail Panel Contract (AC 16)**:
    - Given an issue list or detail background refresh fails,
    - When previously loaded issue data remains authorized,
    - Then the last successful permitted data remains visible with stale indication,
    - And the refresh failure does not create, resolve, reopen, or duplicate an operational issue by itself,
    - And the issue detail drawer complies with the `EXPERIENCE.md` `detail-panel` contract: desktop non-modal complementary region beside page, programmatic heading focus, Close control first, Escape dismissal restoring focus to opener, and full-screen mobile reflow.

---

## Tasks / Subtasks

- [x] **Task 1: Shared API Contracts & Enums (`packages/api-contracts`)** (AC: 2, 3, 5, 11)
  - [x] 1.1 In `packages/api-contracts/src/issues.ts`:
    - Define `IssueSeverityEnumSchema`: `z.enum(['Critical', 'Warning', 'Information'])`.
    - Define `IssueStatusEnumSchema`: `z.enum(['ACTIVE', 'RESOLVED'])`.
    - Define `IssueCategoryEnumSchema`: `z.enum(['DATABASE_CONNECTION_ERROR', 'QUEUE_UNAVAILABLE', 'QUEUE_BACKLOG_DELAY', 'STORAGE_UNAVAILABLE', 'WEB_APP_UNAVAILABLE', 'BOT_TOKEN_INVALID', 'BOT_DISCONNECTED', 'TELEGRAM_GROUP_DISCONNECTED', 'MESSAGE_INTAKE_DELAY', 'TOPIC_PROCESSING_DELAY', 'AI_SERVICE_DEGRADED', 'RETENTION_JOB_DELAY', 'DISTRICT_RETENTION_DELAY', 'SUBSCRIPTION_PAUSED_NOTICE', 'OPERATIONAL_MAINTENANCE_NOTICE'])`.
    - Define `OperationalIssuesQuerySchema`: `z.object({ districtId: z.string().optional(), status: IssueStatusEnumSchema.optional(), severity: IssueSeverityEnumSchema.optional() })`.
    - Define `OperationalIssueSchema`:
      - `id`: `z.string()`
      - `logicalKey`: `z.string()`
      - `scope`: `ComponentScopeEnumSchema` (`'GLOBAL' | 'DISTRICT'`)
      - `districtId`: `z.string().min(1).nullable()`
      - `districtName`: `z.string().nullable()`
      - `component`: `ComponentTypeEnumSchema`
      - `issueCategory`: `IssueCategoryEnumSchema`
      - `severity`: `IssueSeverityEnumSchema`
      - `status`: `IssueStatusEnumSchema`
      - `healthStatus`: `HealthStatusEnumSchema`
      - `sanitizedTitle`: `z.string()`
      - `sanitizedDescription`: `z.string()`
      - `recommendedAction`: `z.string()`
      - `targetRoute`: `z.string().nullable()`
      - `startedAt`: `z.string().datetime()`
      - `latestCheckAt`: `z.string().datetime()`
      - `resolvedAt`: `z.string().datetime().nullable()`
      - `metadata`: `z.record(z.unknown()).nullable()`
    - Define `OperationalIssuesListResponseSchema`:
      - `issues`: `z.array(OperationalIssueSchema)`
      - `totalActive`: `z.number().int().nonnegative()`
      - `criticalCount`: `z.number().int().nonnegative()`
      - `warningCount`: `z.number().int().nonnegative()`
      - `infoCount`: `z.number().int().nonnegative()`
      - `evaluatedAt`: `z.string().datetime()`
    - Define `OperationalIssueDetailResponseSchema`:
      - `issue`: `OperationalIssueSchema`
      - `auditEvents`: `z.array(z.object({ id: z.string(), action: z.string(), actorId: z.string().nullable(), actorRole: z.string().nullable(), createdAt: z.string().datetime(), metadata: z.record(z.unknown()).nullable() }))`
  - [x] 1.2 In `packages/api-contracts/src/index.ts`:
    - Re-export all schemas and types from `./issues.js`.

- [x] **Task 2: Database Schema & Migration for Operational Issues (`apps/backend`)** (AC: 1, 6, 8, 9, 10, 11, 12, 13)
  - [x] 2.1 In `apps/backend/src/adapters/db/schema/operational-issues.ts`:
    - Define table `operational_issues` using Drizzle ORM:
      - `id`: `text('id').primaryKey()`
      - `logicalKey`: `text('logical_key').notNull()`
      - `scope`: `text('scope').notNull()` (`'GLOBAL' | 'DISTRICT'`)
      - `districtId`: `text('district_id').references(() => districts.id, { onDelete: 'cascade' })`
      - `component`: `text('component').notNull()`
      - `issueCategory`: `text('issue_category').notNull()`
      - `severity`: `text('severity').notNull()` (`'Critical' | 'Warning' | 'Information'`)
      - `status`: `text('status').notNull()` (`'ACTIVE' | 'RESOLVED'`)
      - `healthStatus`: `text('health_status').notNull()`
      - `sanitizedTitle`: `text('sanitized_title').notNull()`
      - `sanitizedDescription`: `text('sanitized_description').notNull()`
      - `recommendedAction`: `text('recommended_action').notNull()`
      - `targetRoute`: `text('target_route')`
      - `metadata`: `jsonb('metadata').$type<Record<string, unknown>>()`
      - `startedAt`: `timestamp('started_at', { withTimezone: true }).notNull()`
      - `latestCheckAt`: `timestamp('latest_check_at', { withTimezone: true }).notNull()`
      - `resolvedAt`: `timestamp('resolved_at', { withTimezone: true })`
      - `createdAt`: `timestamp('created_at', { withTimezone: true }).notNull().defaultNow()`
      - `updatedAt`: `timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()`
    - Add PostgreSQL check constraints:
      - `check('operational_issues_scope_check', sql\`${table.scope} IN ('GLOBAL', 'DISTRICT')\`)`
      - `check('operational_issues_severity_check', sql\`${table.severity} IN ('Critical', 'Warning', 'Information')\`)`
      - `check('operational_issues_status_check', sql\`${table.status} IN ('ACTIVE', 'RESOLVED')\`)`
      - `check('operational_issues_scope_district_check', sql\`(${table.scope} = 'GLOBAL' AND ${table.districtId} IS NULL) OR (${table.scope} = 'DISTRICT' AND ${table.districtId} IS NOT NULL)\`)`
    - Add partial unique index: `uniqueIndex('operational_issues_active_logical_key_uidx').on(table.logicalKey).where(sql\`\${table.status} = 'ACTIVE'\`)`.
    - Add indexes on `(status, severity)`, `(districtId, status)`, and `startedAt`.
  - [x] 2.2 In `apps/backend/src/adapters/db/schema/index.ts`:
    - Export all symbols from `./operational-issues.js`.
  - [x] 2.3 Generate and apply Drizzle migration for `operational_issues`.

- [x] **Task 3: Backend Pure Issue Evaluator & Deduplication Engine (`apps/backend`)** (AC: 1, 2, 4, 6, 7, 8, 12, 14, 15)
  - [x] 3.1 In `apps/backend/src/modules/issues/issue-evaluator.ts`:
    - Implement `generateLogicalKey(scope: ComponentScope, districtId: string | null, component: ComponentType, issueCategory: string): string`.
    - Implement `classifyIssueSeverity(observation: ComponentHealthObservation): IssueSeverity | null`:
      - `Unavailable` on required component -> `Critical`.
      - `Delayed` or `Degraded` -> `Warning`.
      - `Healthy`, `Quiet`, `Unknown` -> `null` (no failure issue created).
    - Implement `deriveIssueMetadata(observation: ComponentHealthObservation, districtName?: string | null): { sanitizedTitle: string; sanitizedDescription: string; recommendedAction: string; targetRoute: string | null; issueCategory: string }`:
      - Maps components and errors to approved Uzbek Cyrillic titles, safe descriptions, and routes:
        - `telegram_bot` failure -> title: `Telegram бот уланмаган ёки токен нотўғри`, route: `/telegram-setup?districtId=${districtId}`, action: `Бот созламаларини текширинг ва токенни қайта киритинг`, category: `BOT_DISCONNECTED` or `BOT_TOKEN_INVALID`.
        - `telegram_groups` failure -> title: `Telegram гуруҳларига уланишда хатолик`, route: `/telegram-setup?districtId=${districtId}`, action: `Гуруҳ уланишлари ва бот администратор ҳуқуқларини текширинг`, category: `TELEGRAM_GROUP_DISCONNECTED`.
        - `database` failure -> title: `Маълумотлар базасига уланишда хатолик`, route: null, action: `PostgreSQL сервери ҳолати ва тармоқни текширинг`, category: `DATABASE_CONNECTION_ERROR`.
        - `processing_queue` delay/unavailable -> title: `Навбат тизимида кечикиш кузатилмоқда`, route: null, action: `pg-boss worker жараёни ва навбат ҳажмини текширинг`, category: `QUEUE_BACKLOG_DELAY` or `QUEUE_UNAVAILABLE`.
        - `storage` failure -> title: `Маълумотлар сақлаш тизимида хатолик`, route: null, action: `Диск хотираси ва файл сақлагич ҳолатини текширинг`, category: `STORAGE_UNAVAILABLE`.
        - `web_application` failure -> title: `Веб илова ишлашида муаммо`, route: null, action: `Сервер хизмати ва тармоқ ҳолатини текширинг`, category: `WEB_APP_UNAVAILABLE`.
        - `message_intake` delay -> title: `Хабарларни қабул қилишда кечикиш`, route: null, action: `Webhook қабули ва intake навбатини текширинг`, category: `MESSAGE_INTAKE_DELAY`.
        - `ai_operations` delay/degraded -> title: `АИ таҳлил жараёнида кечикиш ёки хатолик`, route: null, action: `АИ провайдери API ҳолати ва квоталарини текширинг`, category: `AI_SERVICE_DEGRADED`.
        - `retention_jobs` delay -> title: `Маълумотларни тозалаш иши кечикмоқда`, route: null, action: `Кунлик тозалаш cron ишини текширинг`, category: `RETENTION_JOB_DELAY`.
        - `district_retention` delay -> title: `Туман маълумотларини тозалаш иши кечикмоқда`, route: null, action: `Туман маълумотларини тозалаш жараёнини текширинг`, category: `DISTRICT_RETENTION_DELAY`.
    - Implement `sortOperationalIssues(issues: OperationalIssue[]): OperationalIssue[]`:
      - Sorts strictly by severity: `Critical` (0) > `Warning` (1) > `Information` (2).
      - Secondary sort: `new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()` (newest first).
      - Deterministic tiebreaker: `a.id.localeCompare(b.id)`.

- [x] **Task 4: Backend Issue Manager with Transactional Audit Boundary (`apps/backend`)** (AC: 1, 6, 8, 9, 10, 11, 13)
  - [x] 4.1 In `apps/backend/src/modules/issues/issue-manager.ts`:
    - Implement `synchronizeOperationalIssues(db: DbClient, observations: ComponentHealthObservation[], options: { districtMap: Map<string, string>; evaluationScope?: { type: 'GLOBAL' } | { type: 'DISTRICT'; districtId: string } | { type: 'SYSTEM' } }): Promise<{ created: number; updated: number; resolved: number }>`:
      - Runs within a single PostgreSQL transaction (`db.transaction(async (tx) => { ... })`).
      - Fetch all currently active issues matching the `evaluationScope` from `operational_issues` with row locking (`FOR UPDATE`).
      - Step 1: For each incoming observation that evaluates to a failure condition (`Critical` or `Warning`):
        - Compute `logicalKey`.
        - If active issue with matching `logicalKey` exists:
          - Update existing issue: `latestCheckAt = now`, `healthStatus = observation.status`, `metadata = safeMeta`, `updatedAt = now`.
          - Do NOT emit duplicate audit record for continuing state.
        - If active issue does NOT exist:
          - Handle concurrent insert race condition (catch error `23505` on partial unique index collision and fall back to continuing update).
          - Generate new issue record (`id = nanoid()`, `status = 'ACTIVE'`, `startedAt = now`, `latestCheckAt = now`).
          - Insert into `operational_issues`.
          - Insert single failure-start audit record into `audit_events`:
            - `id = nanoid()`
            - `districtId = issue.districtId`
            - `actorId = 'system:health-monitor'`
            - `actorRole = 'SYSTEM'`
            - `action = 'OPERATIONAL_ISSUE_DETECTED'`
            - `metadata = { issueId, logicalKey, scope, component, issueCategory, severity, healthStatus, startedAt }`
      - Step 2: For each existing active issue matching the `evaluationScope`:
        - Find matching observation with exact same `(scope, districtId, component)`.
        - If matching observation is `Healthy` (or valid `Quiet`):
          - Transition issue status: `status = 'RESOLVED'`, `resolvedAt = now`, `updatedAt = now`.
          - Insert single verified-recovery audit record into `audit_events`:
            - `id = nanoid()`
            - `districtId = issue.districtId`
            - `actorId = 'system:health-monitor'`
            - `actorRole = 'SYSTEM'`
            - `action = 'OPERATIONAL_ISSUE_RESOLVED'`
            - `metadata = { issueId, logicalKey, scope, component, issueCategory, resolvedAt, durationMs: now - startedAt }`
        - If matching observation is `Unknown`: issue remains `ACTIVE` (no false recovery).
        - If matching observation is still failed: already updated in Step 1.
      - Ensure atomic rollback if any audit write or issue write fails.

- [x] **Task 5: Backend Fastify HTTP Routes & Service (`apps/backend`)** (AC: 1, 4, 5, 11)
  - [x] 5.1 In `apps/backend/src/modules/issues/issue-service.ts`:
    - Implement `getOperationalIssues(db: DbClient, options?: { districtId?: string; status?: 'ACTIVE' | 'RESOLVED'; severity?: IssueSeverity }): Promise<OperationalIssuesListResponse>`.
    - Implement `getOperationalIssueDetail(db: DbClient, issueId: string): Promise<OperationalIssueDetailResponse>`:
      - Fetches issue from `operational_issues`.
      - Fetches related audit events from `audit_events` matching `metadata->>'issueId' = issueId` ordered by `createdAt ASC`.
      - Throws typed `NotFoundError` if issue does not exist.
  - [x] 5.2 In `apps/backend/src/modules/issues/issue-routes.ts`:
    - Create `registerIssueRoutes(fastify: FastifyInstance, deps: { db: DbClient; pool: pg.Pool; boss?: PgBoss })`:
      - Encapsulate in Fastify plugin scope with hooks `verifyStateChangingOrigin` and `createRequireProductOwner(deps.db)`.
      - `GET /api/v1/issues` -> validates `OperationalIssuesQuerySchema`, calls `issueService.getOperationalIssues`.
      - `GET /api/v1/issues/:issueId` -> calls `issueService.getOperationalIssueDetail`.
      - `GET /api/v1/districts/:districtId/issues` -> calls `issueService.getOperationalIssues` with explicit `districtId`.
  - [x] 5.3 In `apps/backend/src/modules/health/health-service.ts`:
    - Integrate `issueManager.synchronizeOperationalIssues(db, allObservations, { districtMap, evaluationScope: { type: 'SYSTEM' } })` into `getOverallSystemHealth`.
    - Integrate `issueManager.synchronizeOperationalIssues(db, districtComponents, { districtMap, evaluationScope: { type: 'DISTRICT', districtId } })` into `getDistrictHealth` so district checks safely update only that district's scope.
  - [x] 5.4 In `apps/backend/src/entrypoints/http.ts`:
    - Register `registerIssueRoutes(server, { db, pool, boss: options?.boss })`.

- [x] **Task 6: Frontend API Client & TanStack Query Hooks (`apps/web`)** (AC: 3, 4, 15, 16)
  - [x] 6.1 In `apps/web/src/issues/issues-client.ts`:
    - Implement `getOperationalIssues(params?: { districtId?: string | null; status?: string; severity?: string }): Promise<OperationalIssuesListResponse>`.
    - Implement `getOperationalIssueDetail(issueId: string): Promise<OperationalIssueDetailResponse>` (`GET /api/v1/issues/:issueId`).
  - [x] 6.2 In `apps/web/src/issues/useOperationalIssues.ts`:
    - Define hierarchical query keys:
      ```ts
      export const issueKeys = {
        all: ['issues'] as const,
        lists: () => [...issueKeys.all, 'list'] as const,
        list: (params?: { districtId?: string | null; status?: string; severity?: string }) =>
          [...issueKeys.lists(), params ?? {}] as const,
        details: () => [...issueKeys.all, 'detail'] as const,
        detail: (id: string) => [...issueKeys.details(), id] as const,
      };
      ```
    - Implement `useOperationalIssues(params?: { districtId?: string | null; status?: string; severity?: string })`:
      - Polling interval: 30s.
      - `placeholderData: keepPreviousData`, `networkMode: 'online'`, `refetchIntervalInBackground: false`.
    - Implement `useOperationalIssueDetail(issueId: string | null)`:
      - Enabled when `issueId` is non-null.

- [x] **Task 7: Accessible Frontend UI Components & Drawer (`apps/web`)** (AC: 3, 4, 5, 14, 16)
  - [x] 7.1 In `apps/web/src/components/issues/IssueSeverityBadge.tsx`:
    - Maps canonical severities to Uzbek Cyrillic and Ant Design Tag tokens:
      - `Critical`: `Муҳим`, color: `error`, icon: `<CloseCircleOutlined />`
      - `Warning`: `Огоҳлантириш`, color: `warning`, icon: `<ExclamationCircleOutlined />`
      - `Information`: `Маълумот`, color: `processing`, icon: `<InfoCircleOutlined />`
    - Accessible attributes: `role="status"`, `aria-label={`Муаммо даражаси: ${label}`}`.
  - [x] 7.2 In `apps/web/src/components/issues/ActiveIssuesList.tsx`:
    - Displays active operational issues in priority order (`Critical > Warning > Information`).
    - Format relative duration using shared helper `formatIssueDuration(startedAt)` (`X дақиқа олдин`, `X соат олдин`, `X кун олдин`).
    - Each issue card/row shows: Severity Badge, Uzbek Cyrillic Title, Affected Scope/District, Component, duration, Recommended Action, and "Батафсил" button.
    - Zero active issues state: Ant Design Result / Empty state `Фаол техник муаммолар мавжуд эмас`.
  - [x] 7.3 In `apps/web/src/components/issues/IssueDetailDrawer.tsx`:
    - Complies with `EXPERIENCE.md` `detail-panel` contract:
      - Desktop: non-modal read-only Drawer beside page (`mask={false}`, `destroyOnClose={true}`, `keyboard={true}`).
      - Focus management: utilize `afterOpenChange(open: boolean)` to programmatically move focus to Drawer title heading (`headingRef.current?.focus()`, `tabIndex={-1}`, `id="issue-detail-drawer-title"`) on open, labelled Close button is first operable element, Escape key dismissal restores focus to originating opener trigger button (`openerRef.current?.focus()`).
      - Mobile (< 768px): full-screen layout with Back/Close button.
      - Content: Full diagnostic metadata (affected component, scope, district, start time, latest check time, safe error category, duration), Recommended next step with primary navigation button (`Бот созламаларига ўтиш`, `Обуна саҳифасига ўтиш`), and Audit Event timeline.
  - [x] 7.4 In `apps/web/src/pages/SystemHealthPage.tsx`:
    - Embed `ActiveIssuesList` between `OverallHealthCard` and `GlobalComponentsTable`.
    - Handle drawer state and focus restoration.
  - [x] 7.5 In `apps/web/src/components/OverviewMetricCards.tsx`:
    - Connect active issues count into the System Health overview card subText:
      - When active issues exist: `${activeCount} та фаол муаммо (${criticalCount} муҳим)`
      - When 0 issues exist: `Фаол техник муаммолар йўқ`

- [x] **Task 8: Automated Integration & Frontend Tests (`apps/backend`, `apps/web`)** (AC: 1–16)
  - [x] 8.1 Backend pure unit tests (`apps/backend/tests/operational-issues-evaluator.test.ts`):
    - Test stable logical key generation (`scope:districtId:component:category`).
    - Test severity classification (`Unavailable` -> `Critical`, `Delayed`/`Degraded` -> `Warning`, `Healthy`/`Quiet` -> `null`).
    - Test deterministic sorting (`Critical > Warning > Information`, secondary `startedAt DESC`, tiebreaker `id`).
    - Test Uzbek Cyrillic diagnostic mappings and target routes.
    - Test deduplication of continuing issues.
    - Test matching-scope requirement for verified recovery.
    - Test `evaluationScope` isolation (district evaluation does not resolve global/other-district issues).
    - Test `Unknown` state does not falsely resolve active issue.
  - [x] 8.2 Backend database integration tests against `mahalla_ovozi_test` on port 5433 (`apps/backend/tests/operational-issues.test.ts`):
    - Test failure-start state and single audit event commit atomically in same transaction.
    - Test continuing health checks update `latestCheckAt` without duplicate audit events.
    - Test matching recovery check automatically transitions issue to `RESOLVED` and inserts recovery audit event atomically.
    - Test unrelated technical check or check for another district does NOT resolve active issue.
    - Test genuine later recurrence after resolution creates new distinct issue lifecycle.
    - Test concurrent check insertion deduplication (partial unique index collision handling).
    - Test `GET /api/v1/issues` returns 200 with truthful sorted list when authenticated as Product Owner.
    - Test `GET /api/v1/issues/:issueId` returns issue detail with related audit history.
    - Test tenant isolation: district endpoint only returns that district's issues.
    - Test privacy boundary: response payloads contain zero bot tokens, credentials, resident text, or raw stack traces.
  - [x] 8.3 Frontend unit & component tests (`apps/web/tests/unit/`):
    - In `apps/web/tests/unit/IssueSeverityBadge.test.tsx`: test rendering all 3 severities with Uzbek Cyrillic text and accessible ARIA attributes.
    - In `apps/web/tests/unit/ActiveIssuesList.test.tsx`: test priority ordering, empty state, duration formatting, and drawer triggering.
    - In `apps/web/tests/unit/IssueDetailDrawer.test.tsx`: test focus management, keyboard Escape dismissal, and management route navigation.

---

## Dev Notes

### Relevant Architecture Patterns & Constraints
1. **Database & Environment Isolation (AGENTS.md mandatory rule)**:
   - All automated test suites MUST execute strictly against the isolated test database `mahalla_ovozi_test` (port 5433). Never run tests, migrations, or mock seeding against `mahalla_ovozi` (port 5432) used for local development.
2. **Product Owner Health & Issue Separation from Engineering Telemetry (AD-11)**:
   - Operational issues and verified recovery are application-owned sanitized domain states stored in PostgreSQL. They MUST NOT depend on an external OpenTelemetry collector, third-party ticketing tool, or alert vendor.
3. **Atomic Transactional State + Audit Boundary (AD-11, Epic 4 AC 10/11)**:
   - Every issue state transition (`absent -> ACTIVE`, `ACTIVE -> RESOLVED`) MUST commit in the exact same database transaction as its single corresponding audit log entry in `audit_events`.
   - The canonical system actor `system:health-monitor` (`SYSTEM`) MUST be recorded.
4. **Strict Privacy Boundary (AD-09, AD-11)**:
   - Operational issue records, API responses, error details, and log payloads must NEVER contain resident message text, citizen names, bot tokens, API keys, credentials, or raw upstream error stack traces.
   - All diagnostic details must be sanitized into standard category codes and user-safe explanations.
5. **Deterministic Precedence & Ordering Rule (AD-11)**:
   - Severity strictly follows `Critical > Warning > Information`.
   - Secondary sorting strictly follows `startedAt DESC` with `id` tiebreaker.
6. **Accessible Non-Modal Detail Panel UX Contract (EXPERIENCE.md)**:
   - Desktop: Non-modal complementary Drawer beside page, programmatic heading focus, Close control first, Escape key dismissal, opener focus restoration.
   - Mobile: Full-screen reflow with Back/Close control.
7. **Current-Data & Library Best Practices (Verified 2026-08-25 via Current-Data Verification)**:
   - **Drizzle ORM 0.45.x:**
     - Declare partial unique index in table extra-config callback:
       `uniqueIndex('operational_issues_active_logical_key_uidx').on(table.logicalKey).where(sql\`${table.status} = 'ACTIVE'\`)`
     - Maintain strict context isolation: all mutations inside `db.transaction(async (tx) => { ... })` must use `tx`, ensuring atomic rollback of both issue states and audit events upon any error.
   - **Fastify 5.x:**
     - Use plugin-scoped route encapsulation (`fastify.register(async (scope) => { ... })`) to isolate `createRequireProductOwner(deps.db)` and `verifyStateChangingOrigin` hooks without leaking to parent or sibling plugins.
     - Validate query parameters using `OperationalIssuesQuerySchema`.
   - **TanStack Query v5 (v5.66.x):**
     - Import `keepPreviousData` directly from `@tanstack/react-query` and configure `placeholderData: keepPreviousData` (replaces deprecated boolean `keepPreviousData: true`).
     - Set `refetchInterval: 30_000` with `refetchIntervalInBackground: false` (suppresses background tab polling) and `networkMode: 'online'` (pauses fetch and prevents false network error toasts when offline).
   - **Ant Design 5.x (v5.24.x) & React 19:**
     - Configure `Drawer` for non-modal read-only inspection: `mask={false}`, `destroyOnClose={true}`, `keyboard={true}`, `placement="right"`, and semantic styling `styles={{ body: { padding: '20px 24px' } }}` (replaces deprecated `bodyStyle`).
     - Wire `afterOpenChange(open: boolean)` lifecycle callback to programmatically move focus to Drawer heading (`headingRef.current?.focus()`, with `tabIndex={-1}`) when opened, and restore focus to trigger opener button (`openerRef.current?.focus()`) upon close/Escape.
     - Integrate semantic status tags and tokens with `theme.useToken()`: `color="error"`, `color="warning"`, `color="processing"`, combined with explicit icons and text.

### Source Tree Components to Touch

#### Files to Create:
1. `packages/api-contracts/src/issues.ts` — Zod schemas and TypeScript types for operational issues.
2. `apps/backend/src/adapters/db/schema/operational-issues.ts` — Drizzle schema for `operational_issues` table.
3. `apps/backend/src/modules/issues/issue-evaluator.ts` — Pure issue classification, key generation, and sorting engine.
4. `apps/backend/src/modules/issues/issue-manager.ts` — Transactional issue synchronization and audit logging manager.
5. `apps/backend/src/modules/issues/issue-service.ts` — Query service for operational issues and details.
6. `apps/backend/src/modules/issues/issue-routes.ts` — Protected Fastify routes for `/api/v1/issues` and `/api/v1/issues/:issueId`.
7. `apps/web/src/issues/issues-client.ts` — API client for operational issues endpoints.
8. `apps/web/src/issues/useOperationalIssues.ts` — TanStack Query hooks for issues and details.
9. `apps/web/src/components/issues/IssueSeverityBadge.tsx` — Severity badge component with Uzbek Cyrillic labels and icons.
10. `apps/web/src/components/issues/ActiveIssuesList.tsx` — Active issues list/card component.
11. `apps/web/src/components/issues/IssueDetailDrawer.tsx` — Accessible drawer component implementing `detail-panel` UX contract.
12. `apps/web/src/utils/duration-format.ts` — Shared Uzbek Cyrillic relative duration formatting helper.
13. `apps/backend/tests/operational-issues.test.ts` — Vitest integration and evaluator test suite.
14. `apps/web/tests/unit/IssueSeverityBadge.test.tsx` — Frontend unit tests for severity badges.
15. `apps/web/tests/unit/ActiveIssuesList.test.tsx` — Frontend unit tests for issues list.
16. `apps/web/tests/unit/IssueDetailDrawer.test.tsx` — Frontend unit tests for issue detail drawer.

#### Files to Update:
1. `packages/api-contracts/src/index.ts`:
   - *Current state:* Exports health, auth, districts, telegram, hokim-accounts, ai-operations, topics contracts.
   - *Changes:* Export all contracts from `./issues.js`.
   - *Preserve:* All existing exports.
2. `apps/backend/src/adapters/db/schema/index.ts`:
   - *Current state:* Exports accounts, sessions, audit, rate-limits, districts, bots, groups, intakes, ai, topics, accepted-evidence, projections, visits.
   - *Changes:* Export all schema definitions from `./operational-issues.js`.
   - *Preserve:* All existing schema exports.
3. `apps/backend/src/entrypoints/http.ts`:
   - *Current state:* Registers auth, districts, telegram, hokim, ai, topics, health routes.
   - *Changes:* Register `registerIssueRoutes(server, { db, pool, boss: options?.boss })`.
   - *Preserve:* All existing routes, CORS, cookie, and error handling.
4. `apps/backend/src/modules/health/health-service.ts`:
   - *Current state:* Queries component health and aggregates system/district status.
   - *Changes:* Call `issueManager.synchronizeOperationalIssues` with explicit `evaluationScope` on health checks to keep issues in sync.
   - *Preserve:* All health aggregation and evaluation logic.
5. `apps/web/src/pages/SystemHealthPage.tsx`:
   - *Current state:* Renders `OverallHealthCard`, `GlobalComponentsTable`, and `DistrictHealthMatrix`.
   - *Changes:* Integrate `ActiveIssuesList` and `IssueDetailDrawer`.
   - *Preserve:* Existing health cards and tables.
6. `apps/web/src/components/OverviewMetricCards.tsx`:
   - *Current state:* Displays System Health metric card with live status.
   - *Changes:* Reflect active issue count in subText when issues exist.
   - *Preserve:* All metric card styling and responsive layout.

---

## Dev Agent Record

### Agent Model Used
Gemini 3.7 Flash (High)

### Debug Log References
- Evaluated Epic 4 lines 124–249 for complete Story 4.2 functional, security, and architectural invariants.
- Checked `packages/api-contracts/src/health.ts` to ensure compatibility and schema extension for `packages/api-contracts/src/issues.ts`.
- Checked `apps/backend/src/adapters/db/schema/audit.ts` to design transactional audit log insertion alongside issue state transitions.
- Checked `EXPERIENCE.md` for `detail-panel` non-modal Drawer accessibility specifications (focus management, Escape dismissal, opener focus restoration).
- Formulated 16 comprehensive Acceptance Criteria and 8 granular tasks with 26 subtasks.
- Reviewed and validated against routing (`App.tsx`), multi-scope isolation, PostgreSQL check constraints, and Drizzle partial unique index concurrency handling.

### Completion Notes List
- Comprehensive story implementation for Story 4.2 executed with full TDD red-green-refactor cycles across backend and frontend.
- **API Contracts (`packages/api-contracts`)**: Authored and exported `IssueSeverityEnumSchema` (`Critical`, `Warning`, `Information`), `IssueStatusEnumSchema`, `IssueCategoryEnumSchema` (15 canonical categories), `OperationalIssuesQuerySchema`, `OperationalIssueSchema`, `OperationalIssuesListResponseSchema`, `IssueAuditEventSchema`, and `OperationalIssueDetailResponseSchema`.
- **Database Architecture & Migration (`apps/backend`)**: Authored `operational_issues` schema table with PostgreSQL check constraints, foreign key to `districts(id)` with cascade deletion, and partial unique index on `logicalKey` for `status = 'ACTIVE'`. Applied migration `0013_shocking_omega_flight.sql` to test DB (port 5433).
- **Pure Evaluator & Issue Manager (`apps/backend`)**: Implemented pure `generateLogicalKey`, `classifyIssueSeverity`, `deriveIssueMetadata` with Uzbek Cyrillic diagnostics and management routing, and `sortOperationalIssues`. Implemented `synchronizeOperationalIssues` running inside atomic transactions with row locks (`FOR UPDATE`), duplicate audit event prevention on continuing checks, race condition handling on partial unique index collisions, and matching-scope automatic verified recovery with zero false recovery on `Unknown` checks.
- **Fastify HTTP Routes & System Health Integration (`apps/backend`)**: Registered `GET /api/v1/issues`, `GET /api/v1/issues/:issueId`, and `GET /api/v1/districts/:districtId/issues` protected by `verifyStateChangingOrigin` and `createRequireProductOwner`. Integrated multi-scope issue synchronization into `getOverallSystemHealth` and `getDistrictHealth`.
- **Frontend State & UI (`apps/web`)**: Authored `issues-client.ts`, `useOperationalIssues.ts` with 30s background polling and `keepPreviousData`, `formatIssueDuration` for Uzbek Cyrillic relative duration, `IssueSeverityBadge` with ARIA status role, `ActiveIssuesList` with priority sorting and empty state, `IssueDetailDrawer` complying with `EXPERIENCE.md` desktop/mobile accessibility specifications, integrated into `SystemHealthPage.tsx`, and connected issue count into `OverviewMetricCards.tsx`.
- **Automated Verification & DoD**: 18 evaluator unit tests (`apps/backend/tests/operational-issues-evaluator.test.ts`), 12 database/HTTP integration tests (`apps/backend/tests/operational-issues.test.ts`), and 12 frontend component tests (`apps/web/tests/unit/`) all passing cleanly. Zero privacy leakage of tokens or stack traces verified. Full monorepo typecheck passed with 0 errors.

### File List
- `packages/api-contracts/src/issues.ts` [NEW]
- `packages/api-contracts/src/index.ts` [MODIFY]
- `apps/backend/src/adapters/db/schema/operational-issues.ts` [NEW]
- `apps/backend/src/adapters/db/schema/index.ts` [MODIFY]
- `apps/backend/drizzle/0013_shocking_omega_flight.sql` [NEW]
- `apps/backend/src/modules/issues/issue-evaluator.ts` [NEW]
- `apps/backend/src/modules/issues/issue-manager.ts` [NEW]
- `apps/backend/src/modules/issues/issue-service.ts` [NEW]
- `apps/backend/src/modules/issues/issue-routes.ts` [NEW]
- `apps/backend/src/modules/health/health-service.ts` [MODIFY]
- `apps/backend/src/entrypoints/http.ts` [MODIFY]
- `apps/backend/tests/operational-issues-evaluator.test.ts` [NEW]
- `apps/backend/tests/operational-issues.test.ts` [NEW]
- `apps/web/src/utils/duration-format.ts` [NEW]
- `apps/web/src/issues/issues-client.ts` [NEW]
- `apps/web/src/issues/useOperationalIssues.ts` [NEW]
- `apps/web/src/components/issues/IssueSeverityBadge.tsx` [NEW]
- `apps/web/src/components/issues/ActiveIssuesList.tsx` [NEW]
- `apps/web/src/components/issues/IssueDetailDrawer.tsx` [NEW]
- `apps/web/src/pages/SystemHealthPage.tsx` [MODIFY]
- `apps/web/src/components/OverviewMetricCards.tsx` [MODIFY]
- `apps/web/tests/unit/IssueSeverityBadge.test.tsx` [NEW]
- `apps/web/tests/unit/ActiveIssuesList.test.tsx` [NEW]
- `apps/web/tests/unit/IssueDetailDrawer.test.tsx` [NEW]
- `apps/web/tests/unit/SystemHealthPage.test.tsx` [MODIFY]
- `_bmad-output/implementation-artifacts/4-2-investigate-active-operational-issues-and-verified-recovery.md` [MODIFY]
- `_bmad-output/implementation-artifacts/sprint-status.yaml` [MODIFY]

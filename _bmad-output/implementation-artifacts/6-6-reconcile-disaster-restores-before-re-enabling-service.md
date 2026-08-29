---
baseline_commit: 65814c1482088f182c1cecf650b284898ca7a5dc
---

# Story 6.6: Reconcile Disaster Restores Before Re-Enabling Service

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the **Product Owner**,  
I want restored historical application state to be reconciled against current deletion and retention rules before normal access returns,  
so that disaster recovery cannot resurrect deleted Districts, expired evidence, or obsolete processing work.

---

## Acceptance Criteria

1. **Restored State Access Blocking & Fail-Closed Readiness Barrier (AC 1, FR32, AD-11)**
   - **Given** a disaster or major infrastructure failure requires PostgreSQL and application state to be restored from a pgBackRest backup containing historical data
   - **When** the restore completes at the infrastructure level
   - **Then** normal product access (public API routes, Product Owner Console UI, Hokim Dashboard, and Telegram intake webhooks) remains blocked until deletion and retention reconciliation succeeds
   - **And** restored historical database state is **NOT** immediately considered authoritative product-visible state
   - **And** the Fastify dependency readiness probe (`GET /api/v1/health/ready`) returns HTTP 503 `unready` with `checks.restoreReconciliation = 'unreconciled'` or `'down'` whenever an un-reconciled restore state is detected
   - **And** background worker processing (AI pipelines, topic assignment, etc.) evaluates reconciliation readiness before executing external or AI side effects.

2. **Surviving Deletion Tombstone Reconciliation & Resurrected District Purging (AC 2, FR32, AD-9, AD-11)**
   - **Given** restored database state contains a District identified by the authoritative external deletion tombstone store as already live-deleted (e.g., because the restored backup snapshot was taken prior to the live deletion)
   - **When** disaster restore reconciliation runs (via CLI command `pnpm reconcile-restore` or system reconciliation service)
   - **Then** that District's restored application data is purged again across all 17 database tables in strict topological dependency order before normal access is enabled:
     1. `topic_projections`
     2. `accepted_evidence`
     3. `topics`
     4. `ai_provider_attempts`
     5. `ai_operations`
     6. `telegram_intake_records`
     7. `district_analysis_settings_drafts`
     8. `district_analysis_settings_versions`
     9. `operational_issues`
     10. `user_dashboard_visits`
     11. `sessions` (Hokim accounts)
     12. `accounts` (Hokim accounts)
     13. `district_telegram_groups`
     14. `district_telegram_bots`
     15. `audit_events` (District-scoped audit records)
     16. `district_subscriptions`
     17. `districts` (parent row)
   - **And** if the restored database is missing the tombstone row in `district_deletion_records`, the surviving tombstone is re-inserted from the external store with `liveDeletionStatus = 'COMPLETED'`, `restoreReconciliationStatus = 'RECONCILED'`, and `restoreReconciliationVerifiedAt = now`
   - **And** if the tombstone already exists in `district_deletion_records`, its `restoreReconciliationStatus` is updated to `'RECONCILED'` with `restoreReconciliationVerifiedAt = now`
   - **And** the District cannot become Active, recoverable, or browsable because an older backup predates its deletion
   - **And** restored subscription, bot token, or configuration state cannot override the external deletion proof.

3. **External Deletion Tombstone Store Integration & Synchronization (AC 3, FR32, AD-11)**
   - **Given** the architecture requires an external deletion-tombstone reconciliation source outside restorable PostgreSQL backup history (AD-11)
   - **When** District live deletion executes (`executeDistrictLiveDeletion` in `district-deletion-service.ts`)
   - **Then** the surviving content-free tombstone record is atomically written/synchronized to the external tombstone store (`ExternalTombstoneStore` port, e.g. JSON file ledger at `TOMBSTONE_STORE_PATH` or `deploy/backup/tombstones.json`)
   - **And** the external store contains only privacy-safe lifecycle identifiers/metadata: `id`, `districtId`, `districtName`, `cancelledAt`, `cancelledById`, `cancellationReason`, `scheduledLiveDeletionAt`, `actualLiveDeletionAt`, `liveDeletionStatus`, `protectedBackupExpiryDeadline`, `backupExpiryStatus`, and `backupExpiryVerifiedAt`
   - **And** the external store strictly excludes resident messages, evidence quotes, usernames, credentials, bot tokens, API keys, private subscription notes, and payment data.

4. **Reapplication of Ordinary Topic & Accepted Evidence Retention (AC 4, FR12, FR32, AD-3, AD-11)**
   - **Given** restored database state contains Topic, Accepted Evidence, or derived projection records whose ordinary 90-day retention deadlines passed while the system was unavailable or since the backup snapshot was taken
   - **When** restore reconciliation runs
   - **Then** existing retention rules are reapplied across all surviving districts before those records become accessible (invoking `reconcileRestoredRetention`)
   - **And** expired records are permanently purged in batches (with row locks and atomic evidence cascades)
   - **And** restoration does **NOT** reset, freeze, or extend their original retention lifetime (all deadlines are computed against authoritative real-world time `NOW()`).

5. **Stale Job Queue & In-Flight Work Suppression (AC 5, FR32, AD-3, AD-11)**
   - **Given** the restored database contains unfinished jobs, queued work, or historical lifecycle state in pg-boss queues (`pgboss.job`)
   - **When** restore reconciliation runs
   - **Then** all pending, active, retry, or delayed jobs belonging to deleted districts are purged and suppressed across all system queues:
     - `telegram-content-qualification`
     - `telegram-semantic-relevance`
     - `telegram-topic-assignment`
     - `telegram-topic-projection`
     - `telegram-topic-retention`
     - `district-subscription-expiry`
     - `district-live-deletion`
     - `district-backup-expiry`
   - **And** any jobs referencing expired evidence or completed historical decisions are cleaned up
   - **And** deleted District work cannot resume under any circumstance
   - **And** completed historical decisions are not replayed merely because an older backup was restored.

6. **Continuity & Zero Duplicate Deletion/Cancellation Audit Events (AC 6, FR32, AD-9, AD-11)**
   - **Given** deletion reconciliation removes a restored District that was already live-deleted prior to the restore
   - **When** the external deletion tombstone proves its prior deletion
   - **Then** reconciliation does **NOT** create a second logical `DISTRICT_CANCELLED` or `DISTRICT_LIVE_DELETED` audit event
   - **And** the surviving deletion proof remains the authoritative continuity record
   - **And** operational verification records exactly one global audit event (`action = 'DISTRICT_RESTORE_RECONCILED'`, `districtId = null`, `actorRole = 'SYSTEM' | 'PRODUCT_OWNER'`) with privacy-safe reconciliation summary metadata:
     - `resurrectedDistrictsPurged: string[]` (deleted district IDs)
     - `districtsEvaluated: number`
     - `expiredTopicsPurged: number`
     - `expiredEvidencePurged: number`
     - `expiredProjectionsPurged: number`
     - `staleJobsPurged: number`
     - `durationMs: number`
     - `outcome: 'SUCCESS'`
   - **And** raw resident evidence, credentials, and deleted private data are strictly excluded from audit payloads.

7. **Fail-Closed Handling & Critical Operational Issue on Failure (AC 7, FR27, FR32, AD-11)**
   - **Given** restore reconciliation fails, encounters an unrecoverable database or storage error, or cannot prove that deletion and retention rules were reapplied safely
   - **When** the system evaluates readiness for normal access
   - **Then** normal application access remains blocked (readiness probe returns 503 `unready`, API requests fail closed with 503 `DISASTER_RESTORE_RECONCILIATION_REQUIRED`)
   - **And** an active `operational_issues` record is created or updated:
     - `scope = 'GLOBAL'`
     - `districtId = null`
     - `logicalKey = 'disaster_restore_reconciliation_failure'`
     - `component = 'scheduled_deletion'`
     - `issueCategory = 'DISASTER_RECOVERY'`
     - `severity = 'Critical'`
     - `status = 'ACTIVE'`
     - `healthStatus = 'UNAVAILABLE'`
     - `sanitizedTitle = 'Фалокатдан сўнг тиклашда маълумотларни мувофиқлаштиришда хатолик юз берди'`
     - `recommendedAction = 'Фалокатдан сўнг маълумотларни мувофиқлаштириш (reconcile-restore) буйруғини қайта ишга туширинг ва журналларни текширинг.'`
   - **And** when restore reconciliation subsequently succeeds, the active operational issue (`logicalKey = 'disaster_restore_reconciliation_failure'`) is automatically marked as `status = 'RESOLVED'` (`resolvedAt = now`).

8. **Re-Enablement of Normal Product Access (AC 8, FR32, AD-11)**
   - **Given** disaster recovery and restore reconciliation complete successfully
   - **When** normal access is re-enabled
   - **Then** all deletion tombstones applicable to the restored point have been reconciled
   - **And** all required retention processing has been reapplied
   - **And** deleted Districts remain permanently unavailable
   - **And** authorized surviving Districts operate normally under their current reconciled lifecycle state
   - **And** the readiness probe returns HTTP 200 `status: 'ready'`, clearing the fail-closed barrier.

9. **Disaster Recovery Runbook & CLI within RPO/RTO Objectives (AC 9, FR32, NFR-4, AD-11)**
   - **Given** disaster recovery procedures are documented and verified
   - **When** DR drills or real recovery operations are executed
   - **Then** deletion and retention reconciliation is included within the approved standard recovery procedure (`deploy/backup/runbook.md`)
   - **And** a dedicated CLI command (`apps/backend/src/entrypoints/reconcile-restore.ts` / `pnpm reconcile-restore`) allows operators to run reconciliation directly after pgBackRest restore
   - **And** an administrative Product Owner REST endpoint (`POST /api/v1/system/reconcile-disaster-restore`) allows on-demand verification and triggering from the Console
   - **And** the complete restore and reconciliation process is proven to be compatible with the architecture's RPO $\le$ 1 hour and RTO $\le$ 8 hours objectives.

10. **Automated Integration & Destructive Restore Verification (AC 10, FR32, AD-3, AD-11)**
    - **Given** automated verification suites execute against the isolated test database (`mahalla_ovozi_test`)
    - **When** test suites execute
    - **Then** integration tests prove access blocking prior to reconciliation, complete purging of resurrected deleted districts across all 17 tables, external tombstone synchronization and re-insertion, ordinary retention reapplication, stale job queue purging, fail-closed behavior on simulated errors, Critical issue lifecycle management, idempotent re-execution, and global audit logging.

---

## Tasks / Subtasks

- [x] **Task 1: Shared API Contracts & Zod Schemas in `@mahalla-ovozi/api-contracts`** (AC: 1, 6, 7, 9)
  - [x] 1.1 In `packages/api-contracts/src/audit.ts`:
    - Add `'DISTRICT_RESTORE_RECONCILED'` and `'DISTRICT_RESTORE_RECONCILIATION_FAILED'` to `DISTRICT_LIFECYCLE_AUDIT_ACTIONS`.
    - Add `'resurrectedDistrictsPurged'`, `'expiredTopicsPurged'`, `'expiredEvidencePurged'`, `'staleJobsPurged'`, `'tombstonesSynchronized'`, and `'durationMs'` to `ALLOWED_METADATA_SEARCH_KEYS`.
  - [x] 1.2 In `packages/api-contracts/src/issues.ts`:
    - Add `'DISASTER_RECOVERY'` to `IssueCategoryEnumSchema` and export updated `IssueCategory` type.
  - [x] 1.3 In `packages/api-contracts/src/health.ts`:
    - Update `ReadinessProbeResponseSchema` to include optional `restoreReconciliation: z.enum(['ok', 'down', 'unreconciled'])` under `checks`.
  - [x] 1.4 In `packages/api-contracts/src/subscriptions.ts`:
    - Define and export `DisasterRestoreReconciliationResultSchema`:
      ```typescript
      export const DisasterRestoreReconciliationResultSchema = z.object({
        success: z.boolean(),
        resurrectedDistrictsPurged: z.array(z.string()),
        districtsEvaluated: z.number().int().nonnegative(),
        expiredTopicsPurged: z.number().int().nonnegative(),
        expiredEvidencePurged: z.number().int().nonnegative(),
        expiredProjectionsPurged: z.number().int().nonnegative(),
        staleJobsPurged: z.number().int().nonnegative(),
        tombstonesSynchronized: z.number().int().nonnegative(),
        errors: z.array(z.object({ scope: z.string(), error: z.string() })),
        durationMs: z.number().int().nonnegative(),
      });
      export type DisasterRestoreReconciliationResult = z.infer<typeof DisasterRestoreReconciliationResultSchema>;
      ```
    - Define and export `ReconcileDisasterRestoreRequestSchema` and `ReconcileDisasterRestoreResponseSchema`.
    - Define and export `DisasterRestoreReconciliationRequiredErrorSchema` (HTTP 503 `DISASTER_RESTORE_RECONCILIATION_REQUIRED`).
  - [x] 1.5 Export new schemas and types from `packages/api-contracts/src/index.ts`.

- [x] **Task 2: External Tombstone Store Port & File Adapter with Atomic Persistence** (AC: 2, 3, 6, 9)
  - [x] 2.1 In `apps/backend/src/adapters/storage/external-tombstone-store.ts`:
    - Define `ExternalTombstoneStore` interface:
      ```typescript
      export interface ExternalTombstoneStore {
        loadAllTombstones(): Promise<DistrictDeletionRecord[]>;
        saveTombstone(record: DistrictDeletionRecord): Promise<void>;
        getTombstone(districtId: string): Promise<DistrictDeletionRecord | null>;
      }
      ```
    - Define `TombstoneStoreCorruptedError` (fail-closed on malformed JSON).
    - Implement `FileExternalTombstoneStore` reading/writing to a configurable persistent file path (`process.env.TOMBSTONE_STORE_PATH` or `deploy/backup/tombstones.json`):
      - Ensure parent directory exists via `fs.mkdir(dir, { recursive: true })`.
      - Atomically write using same-directory temporary file (`.tombstones.<pid>.<time>.<rand>.tmp`).
      - Call `fileHandle.sync()` to flush page cache, followed by `fileHandle.close()` before rename.
      - Perform atomic rename with exponential backoff retry loop (5-8 attempts) to handle Windows `EPERM`/`EBUSY` transient locks.
      - Validate loaded entries strictly with `z.array(DistrictDeletionRecordSchema)`; throw `TombstoneStoreCorruptedError` if corrupted to fail closed.
      - Exclude any non-whitelisted fields to maintain privacy boundary.
    - Implement `InMemoryExternalTombstoneStore` for deterministic unit and integration testing.

- [x] **Task 3: External Tombstone Sync in Live Deletion Service** (AC: 3)
  - [x] 3.1 In `apps/backend/src/modules/subscriptions/district-deletion-service.ts`:
    - Extend `ExecuteDistrictLiveDeletionOptions` with optional `tombstoneStore?: ExternalTombstoneStore`.
    - When live deletion commits and creates the tombstone in `district_deletion_records`, synchronize the record to `tombstoneStore`.
    - If external store sync fails, log structured warning and record an active Critical operational issue (`logicalKey = 'del_sync_fail:<id>'`) to prevent silent deletion loss in external ledger.

- [x] **Task 4: Disaster Restore Reconciliation Engine** (AC: 1, 2, 4, 5, 6, 7, 8)
  - [x] 4.1 In `apps/backend/src/modules/retention/restore-reconciliation.ts`:
    - Refactor and expand `reconcileDisasterRestore`:
      ```typescript
      export interface DisasterRestoreReconciliationOptions {
        now?: Date;
        actor?: { id?: string | null; role?: string | null };
        context?: { ipAddress?: string | null; userAgent?: string | null };
        tombstoneStore?: ExternalTombstoneStore;
        dryRun?: boolean;
      }
      ```
    - **Step 1: External Tombstone Reconciliation & Resurrected District Purge:**
      - Load all tombstones from `tombstoneStore`.
      - For each tombstone, query `districts` table by `districtId` in dedicated locked transactions:
        - If district exists in `districts` (resurrected by restore):
          - Lock district and subscription rows.
          - Execute full 17-table cascading purge (reusing topological purge from `district-deletion-service.ts`).
          - Re-insert or update `district_deletion_records` with `liveDeletionStatus = 'COMPLETED'`, `restoreReconciliationStatus = 'RECONCILED'`, `restoreReconciliationVerifiedAt = now`.
          - Track district in `resurrectedDistrictsPurged`.
        - If district does not exist in `districts`:
          - Ensure `district_deletion_records` has the tombstone; if missing, insert from external store with `restoreReconciliationStatus = 'RECONCILED'`.
          - If already present, update `restoreReconciliationStatus = 'RECONCILED'`, `restoreReconciliationVerifiedAt = now`.
      - Bi-directional sync: if database contains deletion tombstones missing from external store, persist them to `tombstoneStore`.
    - **Step 2: Reapply Ordinary 90-Day Retention:**
      - Re-evaluate all surviving districts' topics and Accepted Evidence against `now` via `TopicRetentionService.purgeDistrictExpiredTopicsBatch`.
      - Track `expiredTopicsPurged`, `expiredEvidencePurged`, `expiredProjectionsPurged`.
    - **Step 3: Suppress Stale pg-boss Jobs:**
      - Execute parameterized SQL against `pgboss.job` to cancel all pending/active/retry jobs for deleted districts:
        ```sql
        UPDATE pgboss.job
        SET state = 'cancelled',
            completed_on = now(),
            output = jsonb_build_object(
              'reason', 'SUPPRESSED_BY_DISASTER_RECONCILIATION',
              'reconciledAt', now()
            )
        WHERE state < 'completed'
          AND data->>'districtId' = ANY($1::text[]);
        ```
      - Track `staleJobsPurged` count.
    - **Step 4: Audit History Logging:**
      - Record exactly one global audit event `action = 'DISTRICT_RESTORE_RECONCILED'` with summary counts and zero private data leaks.
    - **Step 5: Operational Issue Resolution / Creation:**
      - On success: automatically resolve any active `disaster_restore_reconciliation_failure` issue.
      - On error: create/update Critical issue `disaster_restore_reconciliation_failure`, log `DISTRICT_RESTORE_RECONCILIATION_FAILED`, and rethrow typed error.

- [x] **Task 5: Server Entrypoints, Ingress Gating & Health Routes** (AC: 1, 7, 8, 9)
  - [x] 5.1 In `apps/backend/src/entrypoints/reconcile-restore.ts` (NEW):
    - Build standalone CLI executable:
      - Connects to database pool and pg-boss.
      - Instantiates `FileExternalTombstoneStore`.
      - Calls `reconcileDisasterRestore`.
      - Prints structured JSON output and exits with code 0 on success, code 1 on failure.
  - [x] 5.2 In `package.json`:
    - Add `"reconcile-restore": "node --import tsx/esm apps/backend/src/entrypoints/reconcile-restore.ts"`.
  - [x] 5.3 In `apps/backend/src/modules/health/health-routes.ts`:
    - Update `GET /api/v1/health/ready`:
      - Probe database (`isDbOk`), pg-boss (`isQueueOk`), and restore reconciliation state.
      - Check if any unreconciled tombstones or active `disaster_restore_reconciliation_failure` issues exist.
      - If discrepancies exist or external store corrupted, return 503 with `checks.restoreReconciliation = 'unreconciled' | 'down'`, `Retry-After: 5`, and `Cache-Control: no-store`.
  - [x] 5.4 In `apps/backend/src/modules/subscriptions/subscriptions-routes.ts`:
    - Add `POST /api/v1/system/reconcile-disaster-restore`: Product Owner authorized.

- [x] **Task 6: Disaster Recovery Runbook & RPO/RTO Documentation** (AC: 9)
  - [x] 6.1 In `deploy/backup/runbook.md`:
    - Document end-to-end disaster recovery runbook:
      1. Edge traffic isolation (Caddy maintenance mode).
      2. Stop backend and worker containers (`docker compose stop backend worker`).
      3. Infrastructure pgBackRest delta restore (`pgbackrest --stanza=mahalla_ovozi --delta restore`).
      4. Start PostgreSQL in restricted mode and run restore reconciliation CLI (`pnpm reconcile-restore`).
      5. Start backend and verify health readiness probe (`GET /api/v1/health/ready` returns 200 `ready`).
      6. Start workers and re-enable public ingress via Caddy.
    - Validate alignment with RPO $\le$ 1 hour and RTO $\le$ 8 hours targets.

- [x] **Task 7: Comprehensive Integration & Destructive Restore Test Suite** (AC: 10)
  - [x] 7.1 In `apps/backend/tests/disaster-restore-reconciliation.test.ts`:
    - Test 1: Access blocking before reconciliation — verify readiness probe fails when resurrected districts exist.
    - Test 2: Resurrected deleted district purge — seed a deleted district with full 17-table data and external tombstone; run reconciliation; verify complete purge across all 17 tables and zero leaks.
    - Test 3: Tombstone restoration — verify missing `district_deletion_records` row is restored from external store with `restoreReconciliationStatus = 'RECONCILED'`.
    - Test 4: Ordinary retention reapplication — seed surviving district with 91-day-old topics; verify reconciliation purges them without extending lifetime.
    - Test 5: Stale pg-boss job suppression — seed jobs for deleted district; verify reconciliation purges/cancels them.
    - Test 6: Zero duplicate deletion audit events — verify only `DISTRICT_RESTORE_RECONCILED` is emitted, not `DISTRICT_LIVE_DELETED`.
    - Test 7: Fail-closed on error — simulate database error during reconciliation; verify Critical operational issue is created and readiness returns 503.
    - Test 8: Issue resolution on success — verify active operational issue is marked RESOLVED on successful run.
    - Test 9: Idempotency & retry safety — verify re-running reconciliation on an already reconciled system succeeds cleanly as a no-op.
    - Test 10: Product Owner REST API endpoint — POST `/api/v1/system/reconcile-disaster-restore` executes successfully and returns expected schema.

### Review Findings

- [x] [Review][Patch] Readiness probe DOS on normal district live deletion due to default null status [`apps/backend/src/modules/subscriptions/district-deletion-service.ts:246`]
- [x] [Review][Patch] `dryRun` flag ignored in `reconcileDisasterRestore` engine [`apps/backend/src/modules/retention/restore-reconciliation.ts:162`]
- [x] [Review][Patch] PostgreSQL lexicographical text comparison in pg-boss job suppression skips created and retrying jobs [`apps/backend/src/modules/retention/restore-reconciliation.ts:431`]
- [x] [Review][Patch] Un-serialized file writes and O(N^2) sequential disk fsync in `FileExternalTombstoneStore` [`apps/backend/src/adapters/storage/external-tombstone-store.ts:125`]
- [x] [Review][Patch] Potential pg connection pool leak in `POST /api/v1/system/reconcile-disaster-restore` [`apps/backend/src/modules/subscriptions/subscriptions-routes.ts:580`]
- [x] [Review][Patch] Partial retention errors not propagating to fail-closed reconciliation outcome [`apps/backend/src/modules/retention/restore-reconciliation.ts:404`]
- [x] [Review][Patch] Exact match assertion in `system-health.test.ts` missing `restoreReconciliation` probe field [`apps/backend/tests/system-health.test.ts:598`]
- [x] [Review][Patch] Missing `districtsEvaluated` and `expiredProjectionsPurged` in `ALLOWED_METADATA_SEARCH_KEYS` [`packages/api-contracts/src/audit.ts:90`]
- [x] [Review][Patch] Missing `initBossQueues(boss)` in standalone CLI entrypoint `reconcile-restore.ts` [`apps/backend/src/entrypoints/reconcile-restore.ts:24`]
- [x] [Review][Patch] Missing `del_backup_fail:${districtId}` deletion in operational issues during resurrected district purge [`apps/backend/src/modules/retention/restore-reconciliation.ts:243`]

---

## Dev Notes

### 1. Architecture Compliance & Guardrails

- **AD-11 Disaster Recovery & Deletion Reconciliation Invariant:**
  - "Normal application/ingestion access remains disabled after a disaster restore until lifecycle/deletion reconciliation proves permanently deleted Districts and normally expired data cannot reappear operationally. Maintain a minimal current deletion-tombstone reconciliation source outside restorable PostgreSQL backup history; it contains only privacy-safe lifecycle identifiers/metadata, never resident evidence or secrets."
- **AD-03 & AD-09 Transaction & Multi-Tenant Boundary:**
  - All operations require explicit non-empty `districtId` validation (`validateDistrictScope`).
  - Purging operations must lock rows consistently (`districts` row first, then dependent rows).
- **AD-09 Privacy-Safe Audit & Observability:**
  - Tombstones, audit payloads, and operational issues must **NEVER** contain raw resident messages, Accepted Evidence quotes, bot tokens, passwords, or private notes.
- **Fail-Closed Principle:**
  - The system must fail closed (block normal access) if reconciliation has not completed or fails.

### 2. Database Schema & State Transitions

- **`district_deletion_records` Schema:**
  - `liveDeletionStatus`: `'COMPLETED' | 'FAILED'`
  - `backupExpiryStatus`: `'PENDING' | 'VERIFIED' | 'FAILED'`
  - `restoreReconciliationStatus`: `'PENDING' | 'RECONCILED' | 'FAILED' | null`
  - `restoreReconciliationVerifiedAt`: `timestamp with time zone`
- **17-Table Topological Purge Order:**
  1. `topic_projections`
  2. `accepted_evidence`
  3. `topics`
  4. `ai_provider_attempts` (via `ai_operations`)
  5. `ai_operations`
  6. `telegram_intake_records`
  7. `district_analysis_settings_drafts`
  8. `district_analysis_settings_versions`
  9. `operational_issues` (both district-scoped and `del_fail:<id>`)
  10. `user_dashboard_visits`
  11. `sessions` (Hokim accounts)
  12. `accounts` (Hokim accounts)
  13. `district_telegram_groups`
  14. `district_telegram_bots`
  15. `audit_events` (district-scoped)
  16. `district_subscriptions`
  17. `districts`

### 3. Existing Code Being Modified (UPDATE Files)

#### `apps/backend/src/modules/retention/restore-reconciliation.ts`
- **Current State:** Contains initial `reconcileRestoredRetention` function that iterates through districts and calls `purgeDistrictExpiredTopicsBatch`.
- **What this Story Changes:** Expands into the full disaster restore reconciliation coordinator (`reconcileDisasterRestore`), orchestrating:
  1. External tombstone loading & comparison.
  2. Resurrected district detection and 17-table live data purge.
  3. Tombstone re-insertion / status update to `'RECONCILED'`.
  4. 90-day retention reapplication across all surviving districts.
  5. Stale pg-boss job queue suppression for deleted districts.
  6. Single global audit event emission (`DISTRICT_RESTORE_RECONCILED`).
  7. Critical operational issue lifecycle management.
- **What Must Be Preserved:** Batch processing loop and error accumulation in `reconcileRestoredRetention`.

#### `apps/backend/src/modules/subscriptions/district-deletion-service.ts`
- **Current State:** Implements `executeDistrictLiveDeletion`, `verifyDistrictBackupExpiry`, and cron sweeps.
- **What this Story Changes:** Adds external tombstone store synchronization during `executeDistrictLiveDeletion`.
- **What Must Be Preserved:** 17-table purge order, row-level locking order, lock-unblocking tombstone verification, and idempotency guards.

#### `apps/backend/src/modules/health/health-routes.ts`
- **Current State:** Serves `/api/v1/health/live`, `/api/v1/health/ready`, `/api/v1/health`, `/api/v1/health/system`, and `/api/v1/districts/:districtId/health`.
- **What this Story Changes:** Enhances `/api/v1/health/ready` to check disaster restore reconciliation state (validating external tombstone store vs database).
- **What Must Be Preserved:** Fast unauthenticated probe behavior, 2000ms timeouts, and Product Owner authenticated scope.

#### `packages/api-contracts/src/audit.ts`, `issues.ts`, `health.ts`, `subscriptions.ts`
- **Current State:** Defines Zod schemas and TypeScript types for subscription lifecycle, audit actions, issues, and health.
- **What this Story Changes:** Adds disaster restore reconciliation actions, issue categories, request/response contracts, and readiness probe fields.
- **What Must Be Preserved:** Existing schemas, enums, and validation rules.

### 4. Testing Standards & Isolation

- **Database Isolation Rule:** All automated tests must run strictly against `mahalla_ovozi_test` (never `mahalla_ovozi`).
- **Vitest & Fastify Injected Requests:** Use Fastify `.inject()` for route testing and direct service method calls with isolated transactional DB clients.
- **Mock / In-Memory Adapters:** Use `InMemoryExternalTombstoneStore` and `MockBackupRetentionVerifier` for deterministic test assertions.

---

## References

- [Epic 6 Requirements (Story 6.6)](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/epics/epic-6.md#L496-L557)
- [Architecture Baseline AD-11 (Disaster Recovery & Deletion Reconciliation)](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/architecture/architecture-Mahalla-Ovozi-2026-08-12/ARCHITECTURE-SPINE.md#L126-L131)
- [PRD Baseline FR-32 & NFR-4](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/prds/prd-Mahalla-Ovozi-2026-07-30/prd.md#L502-L559)
- [Story 6.4 Implementation Artifact (Live Deletion)](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/implementation-artifacts/6-4-execute-permanent-live-system-district-deletion.md)
- [Story 6.5 Implementation Artifact (Backup Expiry)](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/implementation-artifacts/6-5-verify-protected-backup-expiry.md)
- [Project Context & AI Rules](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/project-context.md)

---

## Dev Agent Record

### Agent Model Used

Gemini 3.7 Flash (High)

### Debug Log References

- Verified all contracts across `packages/api-contracts`
- Inspected database schema in `apps/backend/src/adapters/db/schema/`
- Validated pgBackRest and pg-boss queue integration patterns

### Completion Notes List

- Story 6.6 specification comprehensively created following BMad create-story workflow.
- All 10 Acceptance Criteria mapped to granular Tasks and Subtasks.
- Architecture compliance, UPDATE files, privacy boundaries, and testing isolation rules fully detailed.

### File List

- `_bmad-output/implementation-artifacts/6-6-reconcile-disaster-restores-before-re-enabling-service.md`

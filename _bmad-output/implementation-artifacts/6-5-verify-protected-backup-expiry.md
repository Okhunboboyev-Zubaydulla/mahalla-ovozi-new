---
baseline_commit: 517b01ea37a67e93af18d93c85dfb427ae3cafc9
---

# Story 6.5: Verify Protected-Backup Expiry

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the **Product Owner**,  
I want deleted District data to age out of protected production backups with an independently verified result,  
so that live deletion is not undermined by indefinitely restorable backup copies.

---

## Acceptance Criteria

1. **Independent Protected-Backup Lifecycle Tracking from Live Deletion (AC 1, FR32, AD-11)**
   - **Given** a District has completed permanent live-system deletion (`liveDeletionStatus = 'COMPLETED'` and `actualLiveDeletionAt` is recorded in `district_deletion_records`)
   - **When** its protected-backup lifecycle is evaluated
   - **Then** backups capable of containing that District's deleted data remain subject to the approved backup-expiry window (maximum 30 additional days after live deletion)
   - **And** the backup-expiry deadline (`protectedBackupExpiryDeadline = actualLiveDeletionAt + 30 days`) is independently tracked from the completed live-deletion milestone
   - **And** the backup lifecycle never extends the District's product recovery window (recovery remains permanently unavailable after live deletion).

2. **Authoritative Expiry Verification via Backup Repository Inspection (AC 2, FR32, AD-11)**
   - **Given** protected backup expiry is evaluated for a deleted District
   - **When** the expiry milestone evaluation runs (via background worker, cron sweeper, or on-demand Product Owner verification)
   - **Then** the system independently verifies whether the required backup-retention condition has actually been satisfied in the backup repository (querying the pgBackRest backup metadata/manifest via `BackupRetentionVerifier` port)
   - **And** does **NOT** infer success merely from elapsed time (`now >= protectedBackupExpiryDeadline` alone is never treated as verification proof)
   - **And** determines that backup expiry is satisfied if and only if all active backup snapshots and WAL archives in the repository were created strictly newer than `actualLiveDeletionAt` (proving that all backups created prior to or during the District's live existence have aged out and been purged by infrastructure backup retention policy).

3. **Surviving Privacy-Safe Deletion Proof Milestone Updates (AC 3, FR32, AD-11)**
   - **Given** backup expiry is successfully verified by repository inspection (`isExpired = true`)
   - **When** the milestone commits in `district_deletion_records`
   - **Then** the surviving deletion tombstone is updated with:
     - `backupExpiryStatus = 'VERIFIED'`
     - `backupExpiryVerifiedAt = now`
     - `updatedAt = now`
   - **And** the overall deletion lifecycle is recognized as having completed both required milestones (live deletion and protected-backup expiry)
   - **And** the surviving proof remains strictly content-free, excluding all resident messages, evidence quotes, usernames, credentials, bot tokens, private subscription notes, external payment references, and other deleted District content.

4. **Retry-Safe Milestone Execution, Re-Verification & Idempotency (AC 4, FR32, AD-3)**
   - **Given** backup-expiry verification is retried after worker restart, network uncertainty, timeout, or repeated interaction
   - **When** verification runs again for the same District deletion record
   - **Then** the operation is safe to repeat
   - **And** if `backupExpiryStatus === 'VERIFIED'`, the operation succeeds idempotently as a no-op without altering timestamps, re-running redundant checks, or creating duplicate audit events
   - **And** if `backupExpiryStatus === 'PENDING'` or `'FAILED'`, the latest authoritative backup repository state determines whether the milestone is now satisfied
   - **And** one logical backup-expiry milestone produces exactly one final business result.

5. **Critical System Health Issue on Overdue or Failed Backup Expiry (AC 5, FR27, FR32, AD-11)**
   - **Given** a deleted District has reached or passed its backup expiry deadline (`now >= protectedBackupExpiryDeadline`) and backup repository inspection reveals that pre-deletion backup sets still exist, OR backup repository verification encounters an unrecoverable infrastructure error (e.g. storage unreachable, permission error)
   - **When** the failure is evaluated
   - **Then** `backupExpiryStatus` is marked as `'FAILED'` (if past deadline or on unrecoverable error)
   - **And** the deletion lifecycle is not reported as complete
   - **And** an active `operational_issues` record is created or updated with `scope = 'GLOBAL'`, `districtId = null` (strictly required because the district row is purged from `districts`), `logicalKey = 'del_backup_fail:' + districtId`, `severity = 'Critical'`, `issueCategory = 'BACKUP_EXPIRY_DELAY'`, `component = 'scheduled_deletion'`, and `healthStatus = 'DEGRADED'`
   - **And** System Health surfaces the affected District ID, name, deadline, and diagnostic metadata inside `metadata: { deletedDistrictId, deletedDistrictName, protectedBackupExpiryDeadline, ... }` and `sanitizedDescription` without exposing resident or deleted data
   - **And** when backup expiry is subsequently successfully verified, any active operational issue for that District's backup expiry (`logicalKey = 'del_backup_fail:' + districtId`) is automatically resolved (`status = 'RESOLVED'`, `resolvedAt = now`).

6. **Asynchronous pg-boss Worker Pipeline & Fallback Cron Sweeper (AC 6, FR32, AD-3)**
   - **Given** pg-boss is running in the worker runtime (`apps/backend/src/entrypoints/worker.ts`)
   - **When** deleted districts reach their 30-day backup expiry deadline
   - **Then** the worker processes individual delayed backup expiry verification jobs (`district-backup-expiry` queue)
   - **And** a periodic cron sweeper (`district-backup-expiry-cron` queue, running every 5 minutes in background) scans `district_deletion_records` where `live_deletion_status = 'COMPLETED' AND backup_expiry_status IN ('PENDING', 'FAILED')` as a resilient fallback
   - **And** each pending District is verified within its own isolated transaction with row-level locking (`SELECT ... FOR UPDATE`) and error-handling boundary.

7. **Global Audit Logging with System Actor (AC 7, FR32, AD-9, AD-11)**
   - **Given** backup-expiry verification completes (either verified or failed)
   - **When** Audit History records the event
   - **Then** exactly one global audit event is logged (`action = 'DISTRICT_BACKUP_EXPIRY_VERIFIED'` or `'DISTRICT_BACKUP_EXPIRY_FAILED'`, `districtId = null`, `actorRole = 'SYSTEM'`)
   - **And** metadata records only privacy-safe operational identifiers: `deletedDistrictId`, `deletedDistrictName`, `actualLiveDeletionAt`, `protectedBackupExpiryDeadline`, `backupExpiryVerifiedAt`, `oldestActiveBackupTimestamp`, `verificationMethod`, and `outcome`
   - **And** raw resident evidence, credentials, usernames, and notes are strictly excluded.

8. **Console Read-Only Visibility & Permanent Recovery Denial (AC 8, FR31, FR32, AD-9, AD-10)**
   - **Given** the Product Owner accesses the Console after live deletion
   - **When** backup copies still exist within their protected retention window or have aged out
   - **Then** backups can **NEVER** be browsed as District content through the Console
   - **And** cannot be used by normal product workflows to recover, inspect, or reactivate the deleted District
   - **And** product recovery remains permanently unavailable after live deletion (returning HTTP 404 or HTTP 409)
   - **And** the Product Owner can inspect the deletion tombstone showing both milestones (Live Deletion: `COMPLETED`, Backup Expiry: `PENDING`/`VERIFIED`/`FAILED`) and trigger manual verification in the Console.

9. **Automated Integration & Destructive-Path Verification (AC 9, FR32, AD-3, AD-11)**
   - **Given** automated verification suites run against the isolated test database (`mahalla_ovozi_test`)
   - **When** test suites execute
   - **Then** integration tests prove independent deadline tracking, authoritative repository inspection (non-inference test), successful verification milestone updates, Critical issue creation on overdue/failed expiry with foreign-key safety, automatic issue resolution upon successful verification, idempotent re-runs, fallback cron sweeper execution, and global audit logging.

---

## Tasks / Subtasks

- [ ] **Task 1: Shared API Contracts & Zod Schemas in `@mahalla-ovozi/api-contracts`** (AC: 1, 2, 3, 5, 7)
  - [ ] 1.1 In `packages/api-contracts/src/audit.ts`:
    - Add `'DISTRICT_BACKUP_EXPIRY_VERIFIED'` and `'DISTRICT_BACKUP_EXPIRY_FAILED'` to `DISTRICT_LIFECYCLE_AUDIT_ACTIONS`.
    - Add `'oldestActiveBackupTimestamp'`, `'verificationMethod'`, and `'backupExpiryDeadline'` to `ALLOWED_METADATA_SEARCH_KEYS`.
  - [ ] 1.2 In `packages/api-contracts/src/issues.ts`:
    - Add `'BACKUP_EXPIRY_DELAY'` and `'LIFECYCLE_DELETION'` to `IssueCategoryEnumSchema` and export updated `IssueCategory` type.
  - [ ] 1.3 In `packages/api-contracts/src/subscriptions.ts`:
    - Define and export `VerifyBackupExpiryResponseSchema`:
      ```ts
      export const VerifyBackupExpiryResponseSchema = z.object({
        deletionRecord: DistrictDeletionRecordSchema,
        isExpired: z.boolean(),
        message: z.string(),
      });
      export type VerifyBackupExpiryResponse = z.infer<typeof VerifyBackupExpiryResponseSchema>;
      ```
    - Define and export `BackupExpiryVerificationDetailsSchema`:
      ```ts
      export const BackupExpiryVerificationDetailsSchema = z.object({
        isExpired: z.boolean(),
        oldestActiveBackupTimestamp: z.string().datetime().nullable().optional(),
        verificationMethod: z.string(),
        rawDetails: z.record(z.unknown()).optional(),
      });
      export type BackupExpiryVerificationDetails = z.infer<typeof BackupExpiryVerificationDetailsSchema>;
      ```
  - [ ] 1.4 In `packages/api-contracts/src/index.ts`:
    - Re-export all schemas and types added in 1.1–1.3.
  - [ ] 1.5 Build `@mahalla-ovozi/api-contracts` (`pnpm --filter @mahalla-ovozi/api-contracts build`).

- [ ] **Task 2: Backup Repository Verifier Port & Adapters (Hexagonal Architecture)** (AC: 2, 4, 5)
  - [ ] 2.1 Create `apps/backend/src/modules/subscriptions/ports/backup-retention-verifier.ts`:
    - Define interface `BackupVerificationResult`:
      ```ts
      export interface BackupVerificationResult {
        isExpired: boolean;
        oldestActiveBackupTimestamp: Date | null;
        totalBackupsCount?: number;
        verificationMethod: string;
        rawDetails?: Record<string, unknown>;
        error?: string;
      }
      ```
    - Define interface `BackupRetentionVerifier`:
      ```ts
      export interface BackupRetentionVerifier {
        verifyDistrictBackupExpiry(params: {
          districtId: string;
          actualLiveDeletionAt: Date;
          protectedBackupExpiryDeadline: Date;
        }): Promise<BackupVerificationResult>;
      }
      ```
  - [ ] 2.2 Create `apps/backend/src/adapters/backup/system-backup-verifier.ts`:
    - Implement `SystemBackupRetentionVerifier` implementing `BackupRetentionVerifier`.
    - Define and parse pgBackRest JSON metadata structures:
      ```ts
      export interface PgBackRestTimestamp {
        start: number; // Unix epoch seconds
        stop: number;  // Unix epoch seconds
      }
      export interface PgBackRestBackupInfo {
        label: string;
        type: 'full' | 'diff' | 'incr';
        timestamp: PgBackRestTimestamp;
        prior?: string | null;
        reference?: string[];
      }
      export interface PgBackRestStanzaInfo {
        name: string;
        status: { code: number; message: string; lock?: { held: boolean } };
        backup?: PgBackRestBackupInfo[];
      }
      ```
    - Rule: `isExpired = true` if and only if `totalBackupsCount === 0` OR all active backups have `b.timestamp.start * 1000 > actualLiveDeletionAt.getTime()`.
    - Convert `timestamp.start` to `Date` using `new Date(b.timestamp.start * 1000)`.
    - Supports environment configuration (`PGBACKREST_STANZA`, `PGBACKREST_REPO_PATH`, `BACKUP_INFO_COMMAND`) with safe fallback for environments without pgBackRest installed.
  - [ ] 2.3 Create `apps/backend/src/adapters/backup/mock-backup-verifier.ts` for deterministic testing:
    - Configurable mock verifier supporting:
      - Case A: Oldest backup newer than `actualLiveDeletionAt` -> `isExpired: true`.
      - Case B: Oldest backup older than `actualLiveDeletionAt` (pre-deadline) -> `isExpired: false`.
      - Case C: Oldest backup older than `actualLiveDeletionAt` (post-deadline) -> `isExpired: false`.
      - Case D: Repository error (e.g. storage unreachable / command error) -> throws error or returns error result.

- [ ] **Task 3: Backend Backup Expiry Verification Service & Health Issue Manager Integration** (AC: 1, 2, 3, 4, 5, 7)
  - [ ] 3.1 In `apps/backend/src/modules/subscriptions/district-deletion-service.ts`:
    - Export `verifyDistrictBackupExpiry(db: DbClient, verifier: BackupRetentionVerifier, districtId: string, options?: { actor?: { id?: string | null; role?: string | null }; context?: { ipAddress?: string | null; userAgent?: string | null } })`:
      - Validate `districtId` using `validateDistrictScope(districtId)`.
      - Precondition check: In a transaction, select tombstone row with `FOR UPDATE` from `district_deletion_records` where `districtId = $1`. If not found, throw `DistrictNotFoundError` or `DeletionRecordNotFoundError`. If `liveDeletionStatus !== 'COMPLETED'`, throw `DistrictNotEligibleForDeletionError`.
      - **Idempotency Guard:** If `backupExpiryStatus === 'VERIFIED'`, return existing `DistrictDeletionRecord` immediately without side effects.
      - Invoke `verifier.verifyDistrictBackupExpiry({ districtId, actualLiveDeletionAt: row.actualLiveDeletionAt, protectedBackupExpiryDeadline: row.protectedBackupExpiryDeadline })`.
      - **3-Way State Machine Execution:**
        - **Branch 1 — Repository Confirmed Expired (`result.isExpired === true`):**
          - Update `district_deletion_records` setting `backupExpiryStatus = 'VERIFIED'`, `backupExpiryVerifiedAt = now`, `updatedAt = now`.
          - Automatically resolve any active `operational_issues` where `logicalKey = 'del_backup_fail:' + districtId` (`status = 'RESOLVED'`, `resolvedAt = now`).
          - Record global audit event `'DISTRICT_BACKUP_EXPIRY_VERIFIED'` (`districtId: null`, `actorRole: 'SYSTEM'`, safe metadata).
          - Return updated deletion record, `isExpired: true`, and localized success message.
        - **Branch 2 — Unexpired Pre-Deadline (`result.isExpired === false` AND `now < row.protectedBackupExpiryDeadline`):**
          - Maintain `backupExpiryStatus = 'PENDING'`.
          - Do NOT create an operational issue (normal 30-day retention window is active).
          - Do NOT record failure audit event.
          - Return deletion record, `isExpired: false`, and localized pending message.
        - **Branch 3 — Overdue / Verification Error (`result.isExpired === false` AND `now >= row.protectedBackupExpiryDeadline`) OR Verifier Error:**
          - Update `district_deletion_records` setting `backupExpiryStatus = 'FAILED'`, `updatedAt = now`.
          - Create or update Critical operational issue in `operational_issues`:
            - `scope: 'GLOBAL'`
            - `districtId: null` (Required: district row does not exist in `districts`)
            - `logicalKey: 'del_backup_fail:' + districtId`
            - `component: 'scheduled_deletion'`
            - `issueCategory: 'BACKUP_EXPIRY_DELAY'`
            - `severity: 'Critical'`
            - `status: 'ACTIVE'`
            - `healthStatus: 'DEGRADED'`
            - `sanitizedTitle: 'Туманнинг заҳира нусхалари муддати ўтган ёки хатолик юз берди'`
            - `sanitizedDescription: '30 кунлик муддат ўтган бўлса-да, заҳира омборида туман маълумотларига эга нусхалар мавжуд.'`
            - `metadata: { deletedDistrictId: districtId, deletedDistrictName: row.districtName, protectedBackupExpiryDeadline: row.protectedBackupExpiryDeadline.toISOString(), actualLiveDeletionAt: row.actualLiveDeletionAt.toISOString(), oldestActiveBackupTimestamp: result.oldestActiveBackupTimestamp?.toISOString() ?? null }`
          - Record global audit event `'DISTRICT_BACKUP_EXPIRY_FAILED'` (`districtId: null`, `actorRole: 'SYSTEM'`, safe metadata).
          - Return updated deletion record, `isExpired: false`, and localized error message.
  - [ ] 3.2 Export `processOverdueBackupExpiries(db: DbClient, verifier: BackupRetentionVerifier)`:
    - Query `district_deletion_records` where `live_deletion_status = 'COMPLETED' AND backup_expiry_status IN ('PENDING', 'FAILED')` ordered by `protectedBackupExpiryDeadline ASC` limit 100.
    - Process each pending/failed deletion record in its own isolated transaction and `try-catch` boundary with structured logging.

- [ ] **Task 4: pg-boss Worker Pipeline & Fallback Cron Sweeper Registration** (AC: 4, 5, 6)
  - [ ] 4.1 In `apps/backend/src/adapters/jobs/boss-client.ts`:
    - Add queue constants: `DISTRICT_BACKUP_EXPIRY_QUEUE = 'district-backup-expiry'`, `DISTRICT_BACKUP_EXPIRY_CRON_QUEUE = 'district-backup-expiry-cron'`.
    - Add job interface `DistrictBackupExpiryJobData`: `{ districtId: string; issueId?: string }`.
    - Add helper in `JobSingletonKeys`: `forBackupExpiry(districtId: string): string => 'backup-exp:' + districtId`.
    - Register default queue configs in `DEFAULT_QUEUE_CONFIGS` and update `initBossQueues`.
  - [ ] 4.2 In `apps/backend/src/modules/subscriptions/jobs/district-deletion-job-handler.ts`:
    - Implement `processDistrictBackupExpiryJobs` and register workers for `DISTRICT_BACKUP_EXPIRY_QUEUE`.
    - Register 5-minute recurring cron sweep for `DISTRICT_BACKUP_EXPIRY_CRON_QUEUE` calling `processOverdueBackupExpiries`.
  - [ ] 4.3 In `apps/backend/src/modules/subscriptions/district-deletion-service.ts`:
    - In `executeDistrictLiveDeletion`, accept optional `boss?: PgBoss` in `ExecuteDistrictLiveDeletionOptions`.
    - When `boss` is provided, enqueue delayed job to `DISTRICT_BACKUP_EXPIRY_QUEUE` with:
      ```ts
      const delaySeconds = Math.max(0, Math.floor((protectedBackupExpiryDeadline.getTime() - now.getTime()) / 1000));
      await sendQueueJob(options.boss, DISTRICT_BACKUP_EXPIRY_QUEUE, { districtId }, {
        startAfter: delaySeconds,
        singletonKey: JobSingletonKeys.forBackupExpiry(districtId),
      });
      ```
  - [ ] 4.4 In `apps/backend/src/entrypoints/worker.ts`:
    - Add `backupVerifier: BackupRetentionVerifier` to `WorkerPipelineContext`.
    - Instantiate `SystemBackupRetentionVerifier` (or use injected verifier) and pass to `registerDistrictDeletionJobHandler`.

- [ ] **Task 5: Fastify REST API Routes & Access Guard Enforcement** (AC: 1, 3, 8)
  - [ ] 5.1 In `apps/backend/src/modules/subscriptions/subscriptions-routes.ts`:
    - Register `POST /api/v1/districts/:districtId/deletion-record/verify-backup-expiry`:
      - Protected by Product Owner authentication (`createRequireProductOwner(db)`) and CSRF guard (`verifyStateChangingOrigin`).
      - Calls `verifyDistrictBackupExpiry` with injected verifier and actor context.
      - Returns 200 with `VerifyBackupExpiryResponse`.
    - Ensure `GET /api/v1/districts/:districtId/deletion-record` returns up-to-date `backupExpiryStatus`, `backupExpiryVerifiedAt`, and `protectedBackupExpiryDeadline`.

- [ ] **Task 6: Frontend UI Deletion Milestone Feedback & Expiry Presentation** (AC: 3, 8)
  - [ ] 6.1 In `apps/web/src/api/subscription-client.ts`:
    - Add `verifyDistrictBackupExpiry(districtId: string): Promise<VerifyBackupExpiryResponse>` using `VerifyBackupExpiryResponseSchema`.
  - [ ] 6.2 In `apps/web/src/lib/formatters.ts`:
    - Add localized Uzbek Cyrillic formatting for backup expiry statuses and actions:
      - `BACKUP_EXPIRY_PENDING: 'Заҳира муддати кутилмоқда (Pending)'`
      - `BACKUP_EXPIRY_VERIFIED: 'Заҳира муддати муваффақиятли тасдиқланди (Verified)'`
      - `BACKUP_EXPIRY_FAILED: 'Заҳира муддатини тасдиқлашда хатолик (Failed)'`
      - `DISTRICT_BACKUP_EXPIRY_VERIFIED: 'Туманнинг заҳира нусхалари муддати муваффақиятли тасдиқланди'`
      - `DISTRICT_BACKUP_EXPIRY_FAILED: 'Туманнинг заҳира нусхалари муддатини тасдиқлашда хатолик юз берди'`
  - [ ] 6.3 In `apps/web/src/components/subscriptions/DistrictSubscriptionDetailCard.tsx` (and dedicated deletion card):
    - Render deletion proof summary showing both milestones:
      1. Live Deletion Milestone: `COMPLETED` (`actualLiveDeletionAt`).
      2. Protected-Backup Expiry Milestone: `PENDING` / `VERIFIED` / `FAILED` (`protectedBackupExpiryDeadline`, `backupExpiryVerifiedAt`).
    - Provide "Заҳирани текшириш" (Verify Backup Expiry) button with loading state, feedback alerts, and offline protection (`disabled={isOffline}`).

- [ ] **Task 7: Comprehensive Automated Verification Suite** (AC: 1 to 9)
  - [ ] 7.1 Create backend integration test suite `apps/backend/tests/district-backup-expiry.test.ts`:
    - **Database Isolation Invariant:** Runs strictly against `mahalla_ovozi_test`.
    - Test 1: Successful backup expiry verification when repository confirms pre-deletion snapshots aged out -> `backupExpiryStatus = 'VERIFIED'`, `backupExpiryVerifiedAt = now`.
    - Test 2: Non-inference test: reaching deadline alone does NOT mark status VERIFIED if backups still exist -> status remains `FAILED` / `PENDING`.
    - Test 3: Overdue / unexpired backups past 30 days trigger `backupExpiryStatus = 'FAILED'` and create a Critical `operational_issues` record (`scope = 'GLOBAL'`, `districtId = null`).
    - Test 4: Automatic resolution of Critical operational issue when backup expiry is subsequently verified.
    - Test 5: Idempotency & retry test — verify re-running verification on an already `VERIFIED` record is a safe no-op.
    - Test 6: Stale / incomplete live deletion guard — verify `verifyDistrictBackupExpiry` throws error if live deletion was not completed.
    - Test 7: Recurring cron sweeper test — verify `processOverdueBackupExpiries` scans and processes pending deletion records.
    - Test 8: Global audit logging test — verify `DISTRICT_BACKUP_EXPIRY_VERIFIED` and `DISTRICT_BACKUP_EXPIRY_FAILED` are logged with `districtId = null` and `actorRole = 'SYSTEM'`.
    - Test 9: Privacy boundary test — verify surviving tombstone contains zero resident messages, credentials, or private notes.
  - [ ] 7.2 Create frontend unit test suite `apps/web/tests/unit/DistrictBackupExpiry.test.tsx`:
    - Test deletion milestone status display (`PENDING`, `VERIFIED`, `FAILED`).
    - Test manual verification button interaction and feedback.
  - [ ] 7.3 Run monorepo typecheck (`pnpm typecheck`) and verify zero errors across all packages.

---

## Dev Notes

### Architecture Patterns & Constraints

- **Two-Milestone Deletion Invariant (FR32, AD-11):**
  - Permanent District Offboarding consists of two distinct, verifiable milestones:
    1. **Milestone 1 (Story 6.4):** Permanent live-system data purging across all 17 database tables and creation of the surviving content-free tombstone (`liveDeletionStatus = 'COMPLETED'`).
    2. **Milestone 2 (Story 6.5):** Protected-backup expiry verification in the external backup repository (`backupExpiryStatus = 'VERIFIED'`).
  - The overall deletion lifecycle is complete only when BOTH milestones are verified.
- **Authoritative Verification Invariant (AD-11):**
  - Verification NEVER infers success merely from elapsed time.
  - The system must query the backup repository adapter (`BackupRetentionVerifier`) to authoritatively confirm that all active backup snapshots and WAL archives in the repository are strictly newer than `actualLiveDeletionAt`.
- **Critical Operational Issue Boundary & Foreign Key Invariant (FR27, FR32, AD-11):**
  - Since the district row is deleted from `districts` upon live deletion, any operational issue created for backup expiry MUST set `scope = 'GLOBAL'` and `districtId = null` to satisfy PostgreSQL foreign key and check constraints.
  - Logical key: `del_backup_fail:${districtId}`.
  - Category: `BACKUP_EXPIRY_DELAY`. Severity: `Critical`. Health: `DEGRADED`. Component: `scheduled_deletion`.
  - Deleted district details are preserved strictly inside `metadata: { deletedDistrictId, deletedDistrictName, ... }`.
  - Upon successful verification, any active issue for that District's backup expiry is automatically resolved.
- **Surviving Content-Free Proof Invariant (FR32, AD-11):**
  - The tombstone in `district_deletion_records` contains ONLY privacy-safe lifecycle metadata: `districtId`, `districtName`, timestamps, status values, and deadlines.
  - It contains zero resident messages, evidence quotes, usernames, passwords, bot tokens, internal notes, or external payment data.
- **pg-boss Durable Jobs & Sweeper Invariant (AD-3):**
  - Deletion records are checked asynchronously via pg-boss `DISTRICT_BACKUP_EXPIRY_QUEUE` and a fallback recurring cron sweeper (`DISTRICT_BACKUP_EXPIRY_CRON_QUEUE`, 5-minute interval).
  - Sweepers execute each check within an independent database transaction with `FOR UPDATE` row-level locking.
- **Database & Environment Isolation (Testing Standard):**
  - All automated tests interacting with PostgreSQL or pg-boss queues MUST execute strictly against an isolated test database (`mahalla_ovozi_test`). Never execute test suites or insert mock test fixtures into the active development database (`mahalla_ovozi`).

---

### Source Tree Components & Files

#### Files to Create [NEW]
1. `apps/backend/src/modules/subscriptions/ports/backup-retention-verifier.ts` — Port interface for backup retention verification.
2. `apps/backend/src/adapters/backup/system-backup-verifier.ts` — Production backup verifier adapter querying backup metadata / pgBackRest repository.
3. `apps/backend/src/adapters/backup/mock-backup-verifier.ts` — Mock backup verifier adapter for deterministic test scenarios.
4. `apps/backend/tests/district-backup-expiry.test.ts` — Comprehensive integration test suite verifying backup expiry verification, non-inference, Critical issue creation/resolution, idempotency, and audit logging.
5. `apps/web/tests/unit/DistrictBackupExpiry.test.tsx` — Frontend unit test suite for backup expiry status display and manual verification trigger.

#### Files to Modify [UPDATE]
1. `packages/api-contracts/src/subscriptions.ts` — Add `VerifyBackupExpiryResponseSchema` and `BackupExpiryVerificationDetailsSchema`.
2. `packages/api-contracts/src/audit.ts` — Add `DISTRICT_BACKUP_EXPIRY_VERIFIED` and `DISTRICT_BACKUP_EXPIRY_FAILED` to audit actions.
3. `packages/api-contracts/src/issues.ts` — Add `BACKUP_EXPIRY_DELAY` and `LIFECYCLE_DELETION` to `IssueCategoryEnumSchema`.
4. `packages/api-contracts/src/index.ts` — Re-export new subscription and audit schemas/types.
5. `apps/backend/src/adapters/jobs/boss-client.ts` — Add `DISTRICT_BACKUP_EXPIRY_QUEUE`, `DISTRICT_BACKUP_EXPIRY_CRON_QUEUE`, and singleton key generator.
6. `apps/backend/src/modules/subscriptions/district-deletion-service.ts` — Implement `verifyDistrictBackupExpiry`, `processOverdueBackupExpiries`, and delayed job dispatch.
7. `apps/backend/src/modules/subscriptions/jobs/district-deletion-job-handler.ts` — Register backup expiry job handler and 5-minute cron sweeper.
8. `apps/backend/src/modules/subscriptions/subscriptions-routes.ts` — Register `POST /api/v1/districts/:districtId/deletion-record/verify-backup-expiry`.
9. `apps/backend/src/entrypoints/worker.ts` — Inject backup verifier into worker pipelines.
10. `apps/web/src/api/subscription-client.ts` — Add `verifyDistrictBackupExpiry` client method.
11. `apps/web/src/lib/formatters.ts` — Add localized Cyrillic text for backup expiry statuses and audit actions.
12. `apps/web/src/components/subscriptions/DistrictSubscriptionDetailCard.tsx` — Add backup expiry milestone card and verification action.

---

### References

- **PRD:** `_bmad-output/planning-artifacts/prds/prd-Mahalla-Ovozi-2026-07-30/prd.md` — Section 4.6 (FR-32: Automatic verified District deletion), NFR-4 (Backup & disaster recovery).
- **Architecture Spine:** `_bmad-output/planning-artifacts/architecture/architecture-Mahalla-Ovozi-2026-08-12/ARCHITECTURE-SPINE.md` — AD-1, AD-2, AD-3, AD-4, AD-9, AD-10, AD-11.
- **Epic 6:** `_bmad-output/planning-artifacts/epics/epic-6.md` — Story 6.5 (Verify Protected-Backup Expiry), Story 6.4 (Execute Permanent Live-System District Deletion), Story 6.6 (Reconcile Disaster Restores Before Re-Enabling Service).
- **Story 6.4 Specification:** `_bmad-output/implementation-artifacts/6-4-execute-permanent-live-system-district-deletion.md`.
- **Project Context:** `_bmad-output/project-context.md` — Database isolation rules, testing standards, and architecture invariants.

---

## Dev Agent Record

### Agent Model Used

Gemini 3.7 Flash

### Debug Log References

<!-- To be populated during implementation / review -->

### Completion Notes List

<!-- To be populated during implementation / review -->

### File List

<!-- To be populated during implementation / review -->

---
baseline_commit: 853c3c4b92b6732f7a01d672ea4c9ce93bdfbc13
---

# Story 6.4: Execute Permanent Live-System District Deletion

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the **Product Owner**,  
I want a Cancelled District to be permanently removed from live product systems at its scheduled deadline,  
so that offboarded District data cannot remain accessible or recoverable through normal product flows beyond the approved cancellation window.

---

## Acceptance Criteria

1. **Authoritative 30-Day Cancellation Deadline Verification & Stale Job Safety (AC 1, FR32, AD-3, AD-9)**
   - **Given** a District was previously cancelled and its authoritative 30-day live-deletion deadline arrives (`scheduledTransitionAt <= now` and `scheduledTransitionType = 'LIVE_DELETION'`)
   - **When** the deletion workflow evaluates eligibility to run
   - **Then** it authoritatively verifies that the District and its subscription are still in `CANCELLED` status
   - **And** verifies that no successful recovery or reactivation has invalidated the deletion schedule (if status is `SETUP_INCOMPLETE`, `ACTIVE`, `GRACE`, or `SUSPENDED`, the job aborts safely without mutating any data)
   - **And** operates strictly against the explicitly identified `districtId`
   - **And** a stale cancellation job cannot delete a recovered or reactivated District.

2. **Comprehensive Multi-Table Live Data Purging in Strict Dependency Order (AC 2, FR32, AD-3, AD-4, AD-9)**
   - **Given** live deletion begins for an eligible `CANCELLED` District
   - **When** District-owned live data is removed from PostgreSQL
   - **Then** all remaining live product data for that District is permanently deleted across all tables in a single atomic transaction or retry-safe topological sequence:
     1. `topic_projections` (all projections for the District; resolves `anchor_evidence_id` foreign key restriction)
     2. `accepted_evidence` (all civic evidence records for the District; resolves `topic_id` and `intake_record_id` foreign key restrictions)
     3. `topics` (all topic records for the District)
     4. `ai_provider_attempts` (all provider attempts for the District's AI operations)
     5. `ai_operations` (all semantic relevance and topic matching operations for the District)
     6. `telegram_intake_records` (all intake records and raw payloads for the District)
     7. `district_analysis_settings_drafts` (draft configuration for the District)
     8. `district_analysis_settings_versions` (historical analysis configuration versions for the District)
     9. `operational_issues` (all District-scoped operational and health issues)
     10. `user_dashboard_visits` (all dashboard visit tracking records for the District)
     11. `sessions` (all active and revoked sessions for Hokim accounts assigned to the District)
     12. `accounts` (all District Hokim user accounts assigned to the District)
     13. `district_telegram_groups` (all group-to-mahalla mappings for the District)
     14. `district_telegram_bots` (any remaining bot registration records for the District)
     15. `audit_events` (all District-scoped audit events where `district_id = targetDistrictId`)
     16. `district_subscriptions` (the subscription record for the District)
     17. `districts` (the parent District record itself)
   - **And** normal retention that already removed data is not reversed, reconstructed, or replayed
   - **And** deletion never requires historical Telegram replay or data recovery.

3. **Strict Cross-District Isolation & Tenant Safety Boundary (AC 3, FR32, AD-9)**
   - **Given** shared database tables and infrastructure exist across multiple Districts
   - **When** one District is deleted
   - **Then** only records explicitly matching `district_id = targetDistrictId` are deleted
   - **And** all other Districts, global analysis configurations, global drafts, global audit records, and Product Owner accounts remain completely untouched and unaffected
   - **And** every repository or background deletion operation requires an explicit, non-empty `districtId` parameter (`validateDistrictScope`).

4. **Retry-Safe Milestone Execution & Idempotency (AC 4, FR32, AD-3)**
   - **Given** the deletion worker is retried after timeout, process restart, duplicate scheduling, or uncertain completion
   - **When** the same logical deletion runs again
   - **Then** already-completed milestones can be safely re-evaluated without failing
   - **And** if the District row is already removed and a completed surviving deletion tombstone exists, the operation succeeds idempotently as a no-op
   - **And** repeated execution does not recreate deleted data or cause cross-District effects
   - **And** one logical District deletion produces exactly one final live-deletion tombstone record.

5. **Minimal Content-Free Surviving Deletion Tombstone Persistence (AC 5, FR32, AD-11)**
   - **Given** live deletion succeeds
   - **When** the system persists the surviving deletion proof in `district_deletion_records`
   - **Then** only a minimal content-free deletion tombstone remains outside the deleted District's restorable live data
   - **And** the tombstone contains only:
     - `id`: unique tombstone identifier (e.g. `del_rec_<uuid>`)
     - `districtId`: original District ID
     - `districtName`: original District Name
     - `cancelledAt`: timestamp of cancellation
     - `cancelledById`: actor ID of the Product Owner who performed cancellation
     - `cancellationReason`: non-sensitive cancellation reason
     - `scheduledLiveDeletionAt`: scheduled deletion timestamp
     - `actualLiveDeletionAt`: authoritative actual live deletion timestamp (`now`)
     - `liveDeletionStatus`: `'COMPLETED'`
     - `protectedBackupExpiryDeadline`: calculated as exactly 30 days after actual live deletion (`actualLiveDeletionAt + 30 days`)
     - `backupExpiryStatus`: `'PENDING'` (to be tracked and verified in Story 6.5)
     - `backupExpiryVerifiedAt`: `null`
     - `restoreReconciliationStatus`: `null` (to be evaluated in Story 6.6)
     - `restoreReconciliationVerifiedAt`: `null`
   - **And** the tombstone contains NO resident messages, evidence quotes, usernames, passwords, password hashes, bot tokens, API keys, external payment references, internal subscription notes, or other private District content.

6. **Permanent Recovery Denial & Post-Deletion Access Blocking (AC 6, FR31, FR32, AD-9, AD-10)**
   - **Given** live deletion has completed and the surviving deletion tombstone is persisted
   - **When** any subsequent request attempts to read, recover, activate, or modify the deleted District (e.g., `POST /api/v1/districts/:districtId/subscription/start-recovery` or `POST /api/v1/districts/:districtId/activate`)
   - **Then** product recovery is permanently impossible
   - **And** the request is rejected with HTTP 404 `DISTRICT_NOT_FOUND` or HTTP 409 `DISTRICT_ALREADY_DELETED`
   - **And** no UI or API path can return that District to Active or view deleted evidence through normal Console functionality.

7. **Independent 90-Day Evidence Retention Prior to Live Deletion (AC 7, FR12, FR32, AD-3)**
   - **Given** a Cancelled District has some Topic or Accepted Evidence records whose normal 90-day retention deadline arrives before the 30-day live deletion deadline
   - **When** ordinary background retention processing runs
   - **Then** those expired records are purged at their normal 90-day expiry
   - **And** Cancellation never freezes, delays, or extends their lifetime until the live deletion deadline
   - **And** the subsequent 30-day live deletion simply purges whatever remaining District data still exists.

8. **Client State Purge & UI Concurrency Safety (AC 8, AD-10)**
   - **Given** live deletion becomes authoritative while the Product Owner has the deleted District open in the Console
   - **When** subsequent queries execute or cache invalidation occurs
   - **Then** TanStack Query caches for `['districts']`, `['district', districtId]`, `['subscriptions']`, `['subscription', districtId]`, `['topics', districtId]`, `['evidence', districtId]`, and `['readiness', districtId]` are invalidated and cleared
   - **And** the UI removes the deleted District from active selection and routes safely to the Subscriptions or Districts list
   - **And** stale prior-District responses cannot render or repopulate the interface.

9. **Asynchronous Deletion Worker & Background Cron Sweeper (AC 9, FR32, AD-3)**
   - **Given** pg-boss is running in the worker runtime (`apps/backend/src/entrypoints/worker.ts`)
   - **When** overdue cancelled districts reach their 30-day deadline
   - **Then** the worker processes individual delayed deletion jobs (`district-live-deletion` queue)
   - **And** a periodic cron sweeper (`district-live-deletion-cron` queue, running every minute) scans `district_subscriptions` for `status = 'CANCELLED' AND scheduled_transition_at <= NOW() AND scheduled_transition_type = 'LIVE_DELETION'` as a resilient fallback
   - **And** each overdue District is processed within its own isolated transaction boundary.

10. **Global Audit Logging with System Actor (AC 10, FR32, AD-9, AD-11)**
    - **Given** live deletion completes successfully
    - **When** Audit History records the event
    - **Then** exactly one global audit event is logged (`action = 'DISTRICT_LIVE_DELETED'`, `districtId = null`, `actorRole = 'SYSTEM'`)
    - **And** metadata records only privacy-safe operational identifiers: `deletedDistrictId`, `deletedDistrictName`, `scheduledLiveDeletionAt`, `actualLiveDeletionAt`, and `protectedBackupExpiryDeadline`
    - **And** raw resident evidence, credentials, usernames, and notes are strictly excluded.

11. **Critical System Health Diagnostics on Deletion Failure (AC 11, FR27, FR32, AD-11)**
    - **Given** the live deletion workflow encounters an unrecoverable database or infrastructure error and exhausts its retry policy
    - **When** the failure is evaluated
    - **Then** deletion is not marked as completed
    - **And** an active `operational_issues` issue is created or updated with `severity = 'Critical'`, `issueCategory = 'LIFECYCLE_DELETION'`, and `healthStatus = 'DEGRADED'`
    - **And** System Health surfaces the affected District ID, name, and failed deletion milestone using privacy-safe diagnostic metadata without leaking private content.

12. **Automated Integration & Destructive-Path Verification (AC 12, FR32, AD-3, AD-9)**
    - **Given** automated verification suites run against the isolated test database (`mahalla_ovozi_test`)
    - **When** test suites execute
    - **Then** integration tests prove complete live data removal across all 17 tables, foreign key dependency resolution, strict multi-tenant isolation, recovery prevention after deletion, stale job protection on recovered districts, tombstone persistence, cron sweep execution, and global audit logging.

---

## Tasks / Subtasks

- [ ] **Task 1: Database Schema & Migration for `district_deletion_records`** (AC: 2, 4, 5, 10)
  - [ ] 1.1 In `apps/backend/src/adapters/db/schema/district-deletion-records.ts`, create the `district_deletion_records` table:
    - Columns: `id` (text, PK), `districtId` (text, not null, unique index), `districtName` (text, not null), `cancelledAt` (timestamp with tz), `cancelledById` (text), `cancellationReason` (text), `scheduledLiveDeletionAt` (timestamp with tz, not null), `actualLiveDeletionAt` (timestamp with tz, not null, defaultNow), `liveDeletionStatus` (text, not null, default 'COMPLETED'), `protectedBackupExpiryDeadline` (timestamp with tz, not null), `backupExpiryStatus` (text, not null, default 'PENDING'), `backupExpiryVerifiedAt` (timestamp with tz), `restoreReconciliationStatus` (text), `restoreReconciliationVerifiedAt` (timestamp with tz), `createdAt` (timestamp with tz, not null, defaultNow), `updatedAt` (timestamp with tz, not null, defaultNow).
    - Constraints: Check constraint for `live_deletion_status IN ('COMPLETED', 'FAILED')`, check constraint for `backup_expiry_status IN ('PENDING', 'VERIFIED', 'FAILED')`, check constraint for `restore_reconciliation_status IS NULL OR restore_reconciliation_status IN ('PENDING', 'RECONCILED', 'FAILED')`.
    - Indexes: `uniqueIndex('district_deletion_records_district_id_uidx')`, `index('district_deletion_records_live_deletion_status_idx')`, `index('district_deletion_records_backup_expiry_status_idx')`, `index('district_deletion_records_restore_reconciliation_status_idx')`, `index('district_deletion_records_backup_expiry_deadline_idx')`.
  - [ ] 1.2 Export `districtDeletionRecords` from `apps/backend/src/adapters/db/schema/index.ts`.
  - [ ] 1.3 Generate and apply the Drizzle migration for `district_deletion_records` (`pnpm --filter @mahalla-ovozi/backend db:generate`).

- [ ] **Task 2: Shared API Contracts & Zod Schemas in `@mahalla-ovozi/api-contracts`** (AC: 5, 6, 10)
  - [ ] 2.1 In `packages/api-contracts/src/subscriptions.ts` (or `packages/api-contracts/src/deletion.ts`), define and export:
    - `DistrictDeletionRecordSchema`: Zod schema matching `district_deletion_records` table fields, with `restoreReconciliationStatus: z.enum(['PENDING', 'RECONCILED', 'FAILED']).nullable().optional()`.
    - `ExecuteLiveDeletionResponseSchema`: `z.object({ deletionRecord: DistrictDeletionRecordSchema, message: z.string() })`.
    - `DistrictAlreadyDeletedErrorSchema`: `z.object({ code: z.literal('DISTRICT_ALREADY_DELETED'), message: z.string() })`.
    - `DistrictNotEligibleForDeletionErrorSchema`: `z.object({ code: z.literal('DISTRICT_NOT_ELIGIBLE_FOR_DELETION'), message: z.string() })`.
  - [ ] 2.2 In `packages/api-contracts/src/audit.ts`, add `'DISTRICT_LIVE_DELETED'` to `DISTRICT_LIFECYCLE_AUDIT_ACTIONS`.
  - [ ] 2.3 Build `@mahalla-ovozi/api-contracts` package (`pnpm --filter @mahalla-ovozi/api-contracts build`).

- [ ] **Task 3: Backend District Deletion Service & Topological Cascading Engine** (AC: 1, 2, 3, 4, 5, 6, 7, 10, 11)
  - [ ] 3.1 In `apps/backend/src/modules/subscriptions/district-deletion-service.ts`, implement domain errors and serializers:
    - `DistrictAlreadyDeletedError`: 409 Conflict, code `'DISTRICT_ALREADY_DELETED'`.
    - `DistrictNotEligibleForDeletionError`: 409 Conflict, code `'DISTRICT_NOT_ELIGIBLE_FOR_DELETION'`.
    - `formatDistrictDeletionRecord(row: DistrictDeletionRecordEntity): DistrictDeletionRecord` converting Date fields to ISO-8601 UTC strings.
  - [ ] 3.2 Implement `executeDistrictLiveDeletion(db, districtId, options?)`:
    - Fast-path idempotency check: query `district_deletion_records` where `districtId = $1`. If exists and `liveDeletionStatus === 'COMPLETED'`, return existing formatted record.
    - Acquire row locks in consistent order inside transaction (`districts` first, then `district_subscriptions` second via `SELECT ... FOR UPDATE`).
    - **Lock-unblocking concurrency protection:** If `districts` row is not found under lock (e.g. concurrent worker deleted it and committed while waiting for lock), check `district_deletion_records`. If completed tombstone exists, return existing record idempotently. If no tombstone exists, throw `DistrictNotFoundError(districtId)`.
    - Validate that both `districts.status === 'CANCELLED'` and `district_subscriptions.status === 'CANCELLED'`. If not `CANCELLED`, abort deletion and return null (stale job protection).
    - Validate deletion deadline: if `lockedSub.scheduledTransitionAt > now` (with 60-second clock skew tolerance for workers) and `!options?.bypassDeadlineCheck`, throw `DistrictNotEligibleForDeletionError(districtId)`.
    - Extract cancellation metadata: `cancelledAt = lockedSub.statusStartedAt`, `cancelledById = lockedSub.updatedById`, `cancellationReason = lockedSub.internalNote`, `scheduledLiveDeletionAt = lockedSub.scheduledTransitionAt ?? now`.
    - Compute `actualLiveDeletionAt = now`, `protectedBackupExpiryDeadline = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)`.
    - Insert tombstone record into `district_deletion_records` within transaction.
    - Execute topological deletion in strict dependency order:
      1. `DELETE FROM topic_projections WHERE district_id = districtId`
      2. `DELETE FROM accepted_evidence WHERE district_id = districtId`
      3. `DELETE FROM topics WHERE district_id = districtId`
      4. `DELETE FROM ai_provider_attempts WHERE operation_id IN (SELECT id FROM ai_operations WHERE district_id = districtId)`
      5. `DELETE FROM ai_operations WHERE district_id = districtId`
      6. `DELETE FROM telegram_intake_records WHERE district_id = districtId`
      7. `DELETE FROM district_analysis_settings_drafts WHERE district_id = districtId`
      8. `DELETE FROM district_analysis_settings_versions WHERE district_id = districtId`
      9. `DELETE FROM operational_issues WHERE district_id = districtId`
      10. `DELETE FROM user_dashboard_visits WHERE district_id = districtId`
      11. `DELETE FROM sessions WHERE account_id IN (SELECT id FROM accounts WHERE district_id = districtId)`
      12. `DELETE FROM accounts WHERE district_id = districtId`
      13. `DELETE FROM district_telegram_groups WHERE district_id = districtId`
      14. `DELETE FROM district_telegram_bots WHERE district_id = districtId`
      15. `DELETE FROM audit_events WHERE district_id = districtId`
      16. `DELETE FROM district_subscriptions WHERE district_id = districtId`
      17. `DELETE FROM districts WHERE id = districtId`
    - Record global audit event `DISTRICT_LIVE_DELETED` (`districtId: null`, `actorRole: options?.actor?.role ?? 'SYSTEM'`, `actorId: options?.actor?.id ?? null`, metadata with safe IDs/timestamps).
    - Return formatted `DistrictDeletionRecord`.
  - [ ] 3.3 Implement `processOverdueCancelledDistricts(db)`:
    - Query `district_subscriptions` where `status = 'CANCELLED' AND scheduled_transition_at <= NOW() AND scheduled_transition_type = 'LIVE_DELETION'` with `.orderBy(asc(districtSubscriptions.scheduledTransitionAt))` and `.limit(100)`.
    - Iterate and invoke `executeDistrictLiveDeletion` for each overdue District within its own isolated transaction boundary with structured error logging.
  - [ ] 3.4 In `apps/backend/src/modules/subscriptions/subscriptions-service.ts`:
    - In `startDistrictRecovery` and `activateDistrict`, if `districts` row is not found or before mutation, check `district_deletion_records`. If a tombstone exists, throw `DistrictAlreadyDeletedError(districtId)` (HTTP 409).

- [ ] **Task 4: pg-boss Deletion Worker Pipeline & Cron Sweeper Registration** (AC: 1, 4, 9, 11)
  - [ ] 4.1 In `apps/backend/src/adapters/jobs/boss-client.ts`:
    - Add queue constants: `DISTRICT_LIVE_DELETION_QUEUE = 'district-live-deletion'`, `DISTRICT_LIVE_DELETION_CRON_QUEUE = 'district-live-deletion-cron'`.
    - Add job interface `DistrictLiveDeletionJobData`: `{ districtId: string; issueId?: string }`.
    - Add helper in `JobSingletonKeys`: `forLiveDeletion(districtId: string): string => 'live-del:' + districtId`.
    - Register default queue configs and update `initBossQueues`.
  - [ ] 4.2 Create `apps/backend/src/modules/subscriptions/jobs/district-deletion-job-handler.ts`:
    - Implement `processDistrictDeletionJobs` and `registerDistrictDeletionJobHandler`.
    - Configure delayed job consumer for `DISTRICT_LIVE_DELETION_QUEUE` and 1-minute recurring cron sweep for `DISTRICT_LIVE_DELETION_CRON_QUEUE`.
    - If `executeDistrictLiveDeletion` returns `null` (stale/recovered district), complete job gracefully as safe no-op.
    - On unrecoverable failure, record or update Critical operational issue in `operational_issues`.
  - [ ] 4.3 In `apps/backend/src/entrypoints/worker.ts`:
    - Register `registerDistrictDeletionJobHandler` within `registerWorkerPipelines`.
  - [ ] 4.4 In `apps/backend/src/modules/subscriptions/subscriptions-service.ts`:
    - In `cancelDistrict`, when `boss` is provided, enqueue delayed job to `DISTRICT_LIVE_DELETION_QUEUE` with `startAfter: 30 * 24 * 60 * 60` (30 days in seconds) and singleton key `JobSingletonKeys.forLiveDeletion(districtId)`.

- [ ] **Task 5: Fastify REST API Routes & Access Guard Enforcement** (AC: 1, 5, 6)
  - [ ] 5.1 In `apps/backend/src/modules/subscriptions/subscriptions-routes.ts`:
    - Register `POST /api/v1/districts/:districtId/subscription/execute-live-deletion`:
      - Protected by Product Owner authentication and CSRF.
      - Calls `executeDistrictLiveDeletion` passing `req.actor`.
      - Returns 200 with `ExecuteLiveDeletionResponse`.
    - Register `GET /api/v1/districts/:districtId/deletion-record`:
      - Protected by Product Owner authentication.
      - Returns 200 with `DistrictDeletionRecord` or 404 if not found.

- [ ] **Task 6: Frontend UI Expiry Feedback, State Invalidation & Access Denial Handling** (AC: 6, 8)
  - [ ] 6.1 In `apps/web/src/api/subscription-client.ts`:
    - Add `executeDistrictLiveDeletion(districtId)` and `getDistrictDeletionRecord(districtId)`.
  - [ ] 6.2 In `apps/web/src/lib/formatters.ts`:
    - Add localized string for `DISTRICT_LIVE_DELETED: 'Туман жонли тизимдан бутунлай ўчирилди (Live Deletion Completed)'`.
  - [ ] 6.3 Update `apps/web/src/components/subscriptions/DistrictSubscriptionDetailCard.tsx`:
    - Display explicit alert banner when recovery window has expired (`scheduledTransitionAt <= now`), indicating permanent live-system deletion is scheduled/in-progress.
    - Disable Start Recovery button with clear Uzbek Cyrillic explanation when 30-day window has expired.
  - [ ] 6.4 Update `apps/web/src/pages/SubscriptionsPage.tsx`:
    - Invalidate TanStack query cache on deletion operations across `['subscriptions']`, `['districts']`, `['health']`, and `['audit-history']`.
    - Handle 404 on current detail card gracefully by clearing selection and returning to list view with informational notification.

- [ ] **Task 7: Comprehensive Automated Verification Suite** (AC: 1 to 12)
  - [ ] 7.1 Create backend integration test suite `apps/backend/tests/district-live-deletion.test.ts`:
    - Test 1: Successful live deletion of a cancelled district after 30-day deadline. Verify complete purging across all 17 tables (`topics`, `evidence`, `intakes`, `ai_operations`, `accounts`, `sessions`, `groups`, `subscriptions`, `districts`, etc.).
    - Test 2: Foreign key dependency resolution test — ensure `onDelete: 'restrict'` tables (`topic_projections -> accepted_evidence`, `accepted_evidence -> topics`) delete smoothly without foreign key violation.
    - Test 3: Multi-tenant isolation test — ensure other districts' topics, evidence, accounts, groups, and subscriptions are completely unaffected.
    - Test 4: Tombstone persistence test — verify `district_deletion_records` row is created with correct timestamps, deadlines (`+30 days`), status, and zero private data leaks.
    - Test 5: Idempotency & retry test — verify re-running live deletion for an already deleted district succeeds as a no-op without creating duplicate tombstones or errors.
    - Test 6: Stale job protection test — verify live deletion job safely aborts if district was recovered to `SETUP_INCOMPLETE` or `ACTIVE`.
    - Test 7: Post-deletion recovery prevention test — verify `startDistrictRecovery` and `activateDistrict` return 409/404 after live deletion.
    - Test 8: Background cron sweep test — verify `processOverdueCancelledDistricts` automatically finds and purges overdue cancelled districts.
    - Test 9: Global audit logging test — verify `DISTRICT_LIVE_DELETED` is logged with `districtId = null` and `actorRole = 'SYSTEM'`.
    - Test 10: Critical System Health issue test — verify failed deletion creates/updates a Critical operational issue.
  - [ ] 7.2 Create frontend unit test suite `apps/web/tests/unit/DistrictLiveDeletion.test.tsx`:
    - Test expired recovery window banner and disabled recovery action.
    - Test TanStack query cache invalidation on live deletion.
  - [ ] 7.3 Run monorepo typecheck (`pnpm typecheck`) and verify zero errors across all packages.

---

## Dev Notes

### Architecture Patterns & Constraints

- **Topological Deletion Ordering Invariant (FR32, AD-3, AD-4, AD-9):**
  - Due to referential integrity constraints (`onDelete: 'restrict'` on `topic_projections.anchorEvidenceId` and `accepted_evidence.topicId`), database rows must be deleted in strict topological dependency order before deleting the parent `districts` row:
    ```text
    1. topic_projections
    2. accepted_evidence
    3. topics
    4. ai_provider_attempts
    5. ai_operations
    6. telegram_intake_records
    7. district_analysis_settings_drafts
    8. district_analysis_settings_versions
    9. operational_issues
    10. user_dashboard_visits
    11. sessions (Hokim accounts)
    12. accounts (Hokim accounts)
    13. district_telegram_groups
    14. district_telegram_bots
    15. audit_events (District-scoped)
    16. district_subscriptions
    17. districts
    ```
- **Surviving Deletion Tombstone Invariant (FR32, AD-11):**
  - The tombstone record in `district_deletion_records` is the ONLY surviving evidence of the District's existence.
  - It contains zero resident message content, evidence quotes, usernames, passwords, bot tokens, or private notes.
  - It serves two future architecture invariants:
    1. Protected-Backup Expiry verification in Story 6.5 (`protectedBackupExpiryDeadline = actualLiveDeletionAt + 30 days`).
    2. Disaster-Recovery Restore Reconciliation in Story 6.6 (proving to restored PostgreSQL backups that the District was live-deleted and must be re-purged before opening access).
- **Post-Deletion Access Denial Invariant (FR31, FR32, AD-9, AD-10):**
  - Once live deletion executes, the District row is gone. Normal product APIs return HTTP 404 `DISTRICT_NOT_FOUND`.
  - Recovery attempts return HTTP 409 `RECOVERY_WINDOW_EXPIRED` or `DISTRICT_ALREADY_DELETED`.
- **Global Audit History Invariant (FR32, AD-9, AD-11):**
  - All district-scoped audit events are deleted with the district live data.
  - Exactly one global audit event (`action: 'DISTRICT_LIVE_DELETED'`, `districtId: null`, `actorRole: 'SYSTEM'`) records the permanent deletion milestone in the persistent audit log.
- **pg-boss Durable Jobs & Sweeper Invariant (AD-3):**
  - Deletion is scheduled via pg-boss `DISTRICT_LIVE_DELETION_QUEUE` with a 30-day delay (`startAfter = 30 * 24 * 60 * 60`).
  - A fallback recurring cron sweeper (`DISTRICT_LIVE_DELETION_CRON_QUEUE`, 1-minute interval) ensures overdue cancelled districts are processed even across worker restarts or missed queue events.

---

### Database Schema Specification

```typescript
// apps/backend/src/adapters/db/schema/district-deletion-records.ts
import { sql } from 'drizzle-orm';
import { pgTable, text, timestamp, uniqueIndex, index, check } from 'drizzle-orm/pg-core';

export const districtDeletionRecords = pgTable(
  'district_deletion_records',
  {
    id: text('id').primaryKey(), // 'del_rec_<uuid>'
    districtId: text('district_id').notNull(),
    districtName: text('district_name').notNull(),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    cancelledById: text('cancelled_by_id'),
    cancellationReason: text('cancellation_reason'),
    scheduledLiveDeletionAt: timestamp('scheduled_live_deletion_at', { withTimezone: true }).notNull(),
    actualLiveDeletionAt: timestamp('actual_live_deletion_at', { withTimezone: true }).notNull().defaultNow(),
    liveDeletionStatus: text('live_deletion_status').notNull().default('COMPLETED'),
    protectedBackupExpiryDeadline: timestamp('protected_backup_expiry_deadline', { withTimezone: true }).notNull(),
    backupExpiryStatus: text('backup_expiry_status').notNull().default('PENDING'),
    backupExpiryVerifiedAt: timestamp('backup_expiry_verified_at', { withTimezone: true }),
    restoreReconciliationStatus: text('restore_reconciliation_status'),
    restoreReconciliationVerifiedAt: timestamp('restore_reconciliation_verified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('district_deletion_records_district_id_uidx').on(table.districtId),
    check(
      'district_deletion_records_live_deletion_status_check',
      sql`${table.liveDeletionStatus} IN ('COMPLETED', 'FAILED')`
    ),
    check(
      'district_deletion_records_backup_expiry_status_check',
      sql`${table.backupExpiryStatus} IN ('PENDING', 'VERIFIED', 'FAILED')`
    ),
    check(
      'district_deletion_records_restore_reconciliation_status_check',
      sql`${table.restoreReconciliationStatus} IS NULL OR ${table.restoreReconciliationStatus} IN ('PENDING', 'RECONCILED', 'FAILED')`
    ),
    index('district_deletion_records_live_deletion_status_idx').on(table.liveDeletionStatus),
    index('district_deletion_records_backup_expiry_status_idx').on(table.backupExpiryStatus),
    index('district_deletion_records_restore_reconciliation_status_idx').on(table.restoreReconciliationStatus),
    index('district_deletion_records_backup_expiry_deadline_idx').on(table.protectedBackupExpiryDeadline),
  ]
);

export type DistrictDeletionRecordEntity = typeof districtDeletionRecords.$inferSelect;
export type NewDistrictDeletionRecordEntity = typeof districtDeletionRecords.$inferInsert;
```

---

### API Contract Specification

```typescript
// packages/api-contracts/src/subscriptions.ts (or packages/api-contracts/src/deletion.ts)
import { z } from 'zod';

export const DistrictDeletionRecordSchema = z.object({
  id: z.string().min(1),
  districtId: z.string().min(1),
  districtName: z.string().min(1),
  cancelledAt: z.string().datetime().nullable().optional(),
  cancelledById: z.string().nullable().optional(),
  cancellationReason: z.string().nullable().optional(),
  scheduledLiveDeletionAt: z.string().datetime(),
  actualLiveDeletionAt: z.string().datetime(),
  liveDeletionStatus: z.enum(['COMPLETED', 'FAILED']),
  protectedBackupExpiryDeadline: z.string().datetime(),
  backupExpiryStatus: z.enum(['PENDING', 'VERIFIED', 'FAILED']),
  backupExpiryVerifiedAt: z.string().datetime().nullable().optional(),
  restoreReconciliationStatus: z.enum(['PENDING', 'RECONCILED', 'FAILED']).nullable().optional(),
  restoreReconciliationVerifiedAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type DistrictDeletionRecord = z.infer<typeof DistrictDeletionRecordSchema>;

export const ExecuteLiveDeletionResponseSchema = z.object({
  deletionRecord: DistrictDeletionRecordSchema,
  message: z.string(),
});
export type ExecuteLiveDeletionResponse = z.infer<typeof ExecuteLiveDeletionResponseSchema>;

export const DistrictAlreadyDeletedErrorSchema = z.object({
  code: z.literal('DISTRICT_ALREADY_DELETED'),
  message: z.string(),
});
export type DistrictAlreadyDeletedError = z.infer<typeof DistrictAlreadyDeletedErrorSchema>;

export const DistrictNotEligibleForDeletionErrorSchema = z.object({
  code: z.literal('DISTRICT_NOT_ELIGIBLE_FOR_DELETION'),
  message: z.string(),
});
export type DistrictNotEligibleForDeletionError = z.infer<typeof DistrictNotEligibleForDeletionErrorSchema>;
```

---

### Source Tree Components & Files

#### Files to Create [NEW]
1. `apps/backend/src/adapters/db/schema/district-deletion-records.ts` — Drizzle ORM schema for surviving deletion tombstone records.
2. `apps/backend/src/modules/subscriptions/district-deletion-service.ts` — Core service executing topological live data deletion, idempotency checks, and tombstone persistence.
3. `apps/backend/src/modules/subscriptions/jobs/district-deletion-job-handler.ts` — pg-boss worker handler for delayed deletion execution and recurring cron sweeper.
4. `apps/backend/tests/district-live-deletion.test.ts` — Comprehensive integration test suite verifying 17-table cascading purge, isolation, idempotency, and recovery denial.
5. `apps/web/tests/unit/DistrictLiveDeletion.test.tsx` — Component and page tests for expired recovery window UI feedback and cache invalidation.

#### Files to Modify [UPDATE]
1. `apps/backend/src/adapters/db/schema/index.ts` — Export `districtDeletionRecords`.
2. `packages/api-contracts/src/subscriptions.ts` — Add `DistrictDeletionRecordSchema`, `ExecuteLiveDeletionResponseSchema`, and error schemas.
3. `packages/api-contracts/src/audit.ts` — Add `DISTRICT_LIVE_DELETED` to `DISTRICT_LIFECYCLE_AUDIT_ACTIONS`.
4. `apps/backend/src/adapters/jobs/boss-client.ts` — Add `DISTRICT_LIVE_DELETION_QUEUE`, `DISTRICT_LIVE_DELETION_CRON_QUEUE`, and singleton key generators.
5. `apps/backend/src/modules/subscriptions/subscriptions-service.ts` — Enqueue delayed deletion job in `cancelDistrict`; guard `startDistrictRecovery` against already-deleted districts.
6. `apps/backend/src/modules/subscriptions/subscriptions-routes.ts` — Register Fastify endpoints for live deletion execution and deletion record inspection.
7. `apps/backend/src/entrypoints/worker.ts` — Register `registerDistrictDeletionJobHandler` pipeline.
8. `apps/web/src/api/subscription-client.ts` — Add API client methods for live deletion execution and deletion records.
9. `apps/web/src/lib/formatters.ts` — Add localized Cyrillic text for `DISTRICT_LIVE_DELETED`.
10. `apps/web/src/components/subscriptions/DistrictSubscriptionDetailCard.tsx` — Add expired recovery window alert banner and disable recovery actions.
11. `apps/web/src/pages/SubscriptionsPage.tsx` — Integrate cache invalidation for live-deleted districts.

---

## Project Structure Notes

- **Module Consistency:** District deletion domain logic is housed inside `apps/backend/src/modules/subscriptions/district-deletion-service.ts`.
- **Topological Integrity (AD-3, AD-4):** Strict ordering prevents foreign key constraint violations on restrict-configured tables (`topic_projections`, `accepted_evidence`).
- **Audit & Tombstone Separation (AD-11):** District-scoped audit history is cleanly purged with the district; one global system audit event and the content-free `district_deletion_records` tombstone survive.
- **Contract Adherence (AD-10):** All API contracts and schemas are defined in `@mahalla-ovozi/api-contracts` with runtime Zod validation.

---

## References

- **PRD:** `_bmad-output/planning-artifacts/prds/prd-Mahalla-Ovozi-2026-07-30/prd.md` — Section 4.6 (FR-32: Automatic verified District deletion), NFR-4 (Backup & disaster recovery), NFR-5 (District isolation).
- **Architecture Spine:** `_bmad-output/planning-artifacts/architecture/architecture-Mahalla-Ovozi-2026-08-12/ARCHITECTURE-SPINE.md` — AD-1, AD-2, AD-3, AD-4, AD-9, AD-10, AD-11.
- **Epic 6:** `_bmad-output/planning-artifacts/epics/epic-6.md` — Story 6.4 (Execute Permanent Live-System District Deletion), Story 6.5 (Verify Protected-Backup Expiry), Story 6.6 (Reconcile Disaster Restores Before Re-Enabling Service), Story 6.7 (Review and Diagnose the District Deletion Lifecycle).
- **UX Designs:** `_bmad-output/planning-artifacts/ux-designs/ux-Mahalla-Ovozi-2026-08-05/DESIGN.md`, `EXPERIENCE.md` — Section UJ-4, cancellation timelines, and recovery boundaries.
- **Story 6.1 Reference:** `_bmad-output/implementation-artifacts/6-1-review-and-maintain-district-subscription-records.md`.
- **Story 6.2 Reference:** `_bmad-output/implementation-artifacts/6-2-manage-active-grace-and-suspended-district-service.md`.
- **Story 6.3 Reference:** `_bmad-output/implementation-artifacts/6-3-cancel-and-recover-a-district-before-live-deletion.md`.
- **Project Context:** `_bmad-output/project-context.md` — Core constraints, testing rules, and isolation requirements.

---

## Dev Agent Record

### Agent Model Used

Gemini 3.7 Flash (High)

### Debug Log References

### Completion Notes List

### File List

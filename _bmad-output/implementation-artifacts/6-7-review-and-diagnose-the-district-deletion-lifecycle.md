---
baseline_commit: 7dff36279ea62e01839aa684ff85a38c9a388328
---

# Story 6.7: Review and Diagnose the District Deletion Lifecycle

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the **Product Owner**,  
I want one content-free deletion lifecycle record and clear Critical operational visibility when deletion safety milestones fail,  
so that I can verify permanent offboarding without exposing or recreating deleted District content.

---

## Acceptance Criteria

1. **Audit History Shared Contract Extension with Permanent-Deletion-Proof Discriminator (AC 1, FR24, FR27, FR32, AD-9, AD-11)**
   - **Given** the surviving deletion proof crosses the operational-history/API/browser boundary
   - **When** its contract and read-only presentation are defined
   - **Then** this story extends Epic 4's existing Audit History shared contract (`packages/api-contracts/src/audit.ts`) with an explicit permanent-deletion-proof discriminator (`recordType: 'AUDIT_EVENT' | 'PERMANENT_DELETION_PROOF'`) and typed `PermanentDeletionProofSchema` rather than creating a parallel history system
   - **And** ordinary operational audit records remain distinguishable from permanent deletion proofs via the discriminator (`recordType`)
   - **And** only the approved privacy-safe proof metadata can be returned through that discriminator:
     - `id: string` (tombstone record ID, e.g. `del_rec_<uuid>`)
     - `recordType: 'PERMANENT_DELETION_PROOF'`
     - `districtId: string` (deleted district UUID)
     - `districtName: string` (deleted district name)
     - `cancelledAt?: string` (ISO UTC timestamp of cancellation)
     - `cancelledById?: string | null` (Product Owner ID who authorized cancellation)
     - `cancellationReason?: string | null` (operational cancellation reason/internal note)
     - `scheduledLiveDeletionAt: string` (ISO UTC scheduled deadline)
     - `actualLiveDeletionAt: string` (ISO UTC completion timestamp)
     - `liveDeletionStatus: 'COMPLETED' | 'FAILED'`
     - `protectedBackupExpiryDeadline: string` (ISO UTC 30-day backup expiry target)
     - `backupExpiryStatus: 'PENDING' | 'VERIFIED' | 'FAILED'`
     - `backupExpiryVerifiedAt?: string | null` (ISO UTC timestamp when backup expiry was verified)
     - `restoreReconciliationStatus?: 'PENDING' | 'RECONCILED' | 'FAILED' | null`
     - `restoreReconciliationVerifiedAt?: string | null` (ISO UTC timestamp when restore reconciliation was verified)
     - `lifecycleComplete: boolean` (authoritatively derived as `liveDeletionStatus === 'COMPLETED' && backupExpiryStatus === 'VERIFIED'`)
     - `createdAt: string` (ISO UTC timestamp)
   - **And** the proof contract strictly excludes resident Telegram messages, evidence quotes, usernames, credentials, bot tokens, API keys, private notes, and external payment details
   - **And** `AuditEventDetailSchema` is updated to alias `AuditHistoryItemSchema` (`AuditEventSchema | PermanentDeletionProofSchema`) so single-event lookups (`GET /api/v1/audit/events/:id`) seamlessly support both standard audit events and deletion proofs
   - **And** `AuditHistoryQuerySchema` supports an optional `recordType` filter (`'ALL' | 'AUDIT_EVENT' | 'PERMANENT_DELETION_PROOF'`, default `'ALL'`) allowing operators to query audit events, deletion proofs, or unified operational history.

2. **Multi-Milestone Deletion Lifecycle Verification & Distinction (AC 2, FR32, AD-9, AD-11)**
   - **Given** the Product Owner reviews a successfully live-deleted District's deletion proof
   - **When** the proof is displayed in Audit History or Subscription views
   - **Then** it identifies the District by the minimum approved identifier and name metadata (`districtId`, `districtName`)
   - **And** shows the cancellation approver (`cancelledById` or 'Тизим (Автоматик)') and cancellation time (`cancelledAt`)
   - **And** shows the scheduled and actual live-deletion timestamps and live-deletion result (`liveDeletionStatus`)
   - **And** shows the protected-backup expiry deadline, actual verification time when available, and backup-expiry result (`backupExpiryStatus`)
   - **And** clearly distinguishes three separate milestones:
     1. **Milestone 1 (Live Deletion):** Purge of all 17 database tables and local storage.
     2. **Milestone 2 (Protected-Backup Expiry):** 30-day aging out and verification of encrypted PostgreSQL WAL and whole-system backups in pgBackRest object storage.
     3. **Milestone 3 (Disaster Restore Reconciliation):** Safe reapplication of deletion tombstones and ordinary retention following a restore drill or disaster recovery.
   - **And** shows the overall deletion lifecycle as complete (`lifecycleComplete: true`) **ONLY** after required live deletion is `COMPLETED` and protected-backup expiry is `VERIFIED`
   - **And** the proof remains strictly content-free.

3. **Critical Operational Visibility on Live-Deletion Milestone Failure (AC 3, FR27, FR32, AD-11)**
   - **Given** any required live-deletion milestone fails, encounters database deadlock/foreign key violation, or reaches an unresolved state
   - **When** the condition is detected during scheduled or manual execution
   - **Then** live deletion is not marked successfully complete (`liveDeletionStatus = 'FAILED'`)
   - **And** the existing System Health / Operational Issues capability exposes the affected condition as `Critical`:
     - `scope = 'GLOBAL'`
     - `districtId = null` (district row was purged or is in failure)
     - `logicalKey = 'del_fail:${districtId}'`
     - `component = 'scheduled_deletion'`
     - `issueCategory = 'LIFECYCLE_DELETION'`
     - `severity = 'Critical'`
     - `status = 'ACTIVE'`
     - `healthStatus = 'UNAVAILABLE'`
     - `sanitizedTitle = 'Туманни жонли тизимдан ўчиришда хатолик юз берди'`
     - `recommendedAction = 'Ўчириш жараёнини журналлар орқали текшириб, қайта ишга туширинг.'`
   - **And** the Product Owner can identify the affected District ID and name from privacy-safe metadata without exposing deleted/private content
   - **And** the deletion workflow is retry-eligible via `POST /api/v1/issues/:issueId/retry` or administrative trigger (`pnpm retry-live-deletion`).

4. **Critical Operational Visibility on Protected Backup Expiry Failure or Overdue (AC 4, FR27, FR32, AD-11)**
   - **Given** backup expiry cannot be verified, fails against pgBackRest repository, or remains incomplete beyond its required 30-day deadline (`NOW() > protectedBackupExpiryDeadline`)
   - **When** the condition is detected (by the background worker or on-demand verification)
   - **Then** the deletion lifecycle is not reported as fully complete (`backupExpiryStatus = 'FAILED'`)
   - **And** the existing System Health / Operational Issues capability exposes the condition as `Critical`:
     - `scope = 'GLOBAL'`
     - `districtId = null`
     - `logicalKey = 'del_backup_fail:${districtId}'`
     - `component = 'scheduled_deletion'`
     - `issueCategory = 'BACKUP_EXPIRY_DELAY'`
     - `severity = 'Critical'`
     - `status = 'ACTIVE'`
     - `healthStatus = 'DEGRADED'`
     - `sanitizedTitle = 'Туманнинг заҳира нусхалари муддати ўтган ёки хатолик юз берди'`
     - `recommendedAction = 'Заҳира тизими (pgBackRest) сиёсатини ва омборни текшириб, эски нусхалар тозаланганини тасдиқланг.'`
   - **And** the affected backup-expiry milestone is identifiable using privacy-safe operational metadata (`deletedDistrictId`, `deletedDistrictName`, `protectedBackupExpiryDeadline`, `actualLiveDeletionAt`, `oldestActiveBackupTimestamp`, `error`)
   - **And** resident or deleted content is not exposed for diagnosis
   - **And** manual retry via `POST /api/v1/issues/:issueId/retry` safely enqueues `DISTRICT_BACKUP_EXPIRY_QUEUE`.

5. **Critical Operational Visibility on Restore Reconciliation Failure (AC 5, FR27, FR32, AD-11)**
   - **Given** restore reconciliation fails or cannot prove that deletion and retention rules were reapplied safely
   - **When** System Health evaluates recovery status
   - **Then** the condition is `Critical` with `logicalKey = 'disaster_restore_reconciliation_failure'`, `issueCategory = 'DISASTER_RECOVERY'`, `severity = 'Critical'` while normal access remains blocked under Story 6.6's fail-closed rule (`GET /api/v1/health/ready` returns 503 `unready`)
   - **And** privacy-safe diagnostics identify the affected recovery milestone without exposing restored resident content
   - **And** on-demand retry via `POST /api/v1/system/reconcile-disaster-restore` re-executes reconciliation safely.

6. **Privacy-Safe Diagnostics & Strict Separation of Lifecycle State from Technical Health (AC 6, FR27, FR29, FR32, AD-11)**
   - **Given** a deletion, backup-expiry, or reconciliation failure is shown in System Health or Audit History
   - **When** operational details are presented
   - **Then** they use privacy-safe diagnostic metadata only (district identifier, district name, timestamps, job keys, safe error codes)
   - **And** exclude resident content, usernames, credentials, bot tokens, secrets, or raw infrastructure payloads
   - **And** Subscription lifecycle state (e.g., `CANCELLED`, `SUSPENDED`, `GRACE`) remains distinct from technical deletion-health status (`Healthy`, `Critical`, `Degraded`, `Unavailable`).

7. **Responsive Read-Only Proof Presentation & Accessibility (AC 7, FR24, FR32, AD-9, AD-11)**
   - **Given** the permanent deletion proof is browsed on supported responsive widths (mobile, tablet, desktop) or with keyboard navigation
   - **When** the Product Owner opens or closes its read-only detail in Audit History (`AuditEventDetailDrawer.tsx`)
   - **Then** the existing Audit History responsive/detail/focus contract is reused
   - **And** the drawer presents a dedicated multi-milestone card displaying Live Deletion, Protected Backup Expiry, and Restore Reconciliation status with clear Uzbek Cyrillic descriptions
   - **And** no edit/delete action exists for the permanent proof
   - **And** state meaning does not rely on color alone (uses semantic tags, status badges with icons, and clear text labels: "Якунланган", "Кутилмоқда", "Хатолик", "Тасдиқланган")
   - **And** focus is preserved when opening and returning from the drawer.

8. **Comprehensive Automated, E2E, and Verification Coverage (AC 8, FR32, AD-9, AD-11)**
   - **Given** Story 6.7 is verified
   - **When** focused integration, browser, and operational checks run
   - **Then** they cover:
     - Audit History shared contract extension with `recordType` discriminator and `PermanentDeletionProofSchema`.
     - Retrieval of deletion proofs via `GET /api/v1/audit/events` (with keyset pagination and filtering) and `GET /api/v1/audit/events/:id`.
     - Multi-milestone status derivation and distinction (Live Deletion, Backup Expiry, Restore Reconciliation).
     - Critical health issue creation on incomplete live deletion, overdue/unverifiable backup expiry, and failed restore reconciliation.
     - Retry routing for deletion lifecycle issues via `retryService` (supporting cancelled/deleted district context without access check rejections).
     - Background job handler clearing of `pendingRetry` flag upon job completion or error.
     - Privacy-safe diagnostic presentation with zero content leakage.
     - Responsive proof presentation and accessible keyboard/focus handling.

---

## Tasks / Subtasks

- [ ] **Task 1: Shared API Contracts & Zod Schemas in `@mahalla-ovozi/api-contracts`** (AC: 1, 2, 6)
  - [ ] 1.1 In `packages/api-contracts/src/audit.ts`:
    - Define `PermanentDeletionProofSchema` and export `PermanentDeletionProof` type with all privacy-safe tombstone fields (`id`, `recordType: 'PERMANENT_DELETION_PROOF'`, `districtId`, `districtName`, `cancelledAt`, `cancelledById`, `cancellationReason`, `scheduledLiveDeletionAt`, `actualLiveDeletionAt`, `liveDeletionStatus`, `protectedBackupExpiryDeadline`, `backupExpiryStatus`, `backupExpiryVerifiedAt`, `restoreReconciliationStatus`, `restoreReconciliationVerifiedAt`, `lifecycleComplete`, `createdAt`).
    - Extend `AuditEventSchema` with `recordType: z.literal('AUDIT_EVENT').default('AUDIT_EVENT')`.
    - Define `AuditHistoryItemSchema = z.discriminatedUnion('recordType', [AuditEventSchema.extend({ recordType: z.literal('AUDIT_EVENT') }), PermanentDeletionProofSchema])` and export `AuditHistoryItem` type.
    - Update `AuditEventDetailSchema = AuditHistoryItemSchema` and export `AuditEventDetail = AuditHistoryItem`.
    - Update `AuditHistoryQuerySchema` to include `recordType: z.enum(['ALL', 'AUDIT_EVENT', 'PERMANENT_DELETION_PROOF']).default('ALL')`.
    - Update `AuditHistoryPageSchema = createKeysetPageSchema(AuditHistoryItemSchema)` and export updated `AuditHistoryPage` type.
  - [ ] 1.2 In `packages/api-contracts/src/issues.ts`:
    - Ensure `LIFECYCLE_DELETION`, `BACKUP_EXPIRY_DELAY`, and `DISASTER_RECOVERY` are in `IssueCategoryEnumSchema`.
  - [ ] 1.3 In `packages/api-contracts/src/index.ts`:
    - Re-export `PermanentDeletionProof`, `PermanentDeletionProofSchema`, `AuditHistoryItem`, and `AuditHistoryItemSchema`.

- [ ] **Task 2: Backend Audit Query Service & Routing Integration** (AC: 1, 2, 7)
  - [ ] 2.1 In `apps/backend/src/modules/audit/audit-query-service.ts`:
    - Update `queryAuditEvents` to support querying and interleaving `district_deletion_records` when `recordType` is `'ALL'` or `'PERMANENT_DELETION_PROOF'`.
    - Prescribe PostgreSQL `UNION ALL` subquery structure with unified projection `(id, district_id, record_type, created_at, ...)` to ensure deterministic keyset pagination tuple comparisons `(created_at, id) < (cursorDate, cursorId)` in forward and backward directions.
    - Map `district_deletion_records` rows to `PermanentDeletionProof` objects with `recordType: 'PERMANENT_DELETION_PROOF'` and computed `lifecycleComplete = (row.liveDeletionStatus === 'COMPLETED' && row.backupExpiryStatus === 'VERIFIED')`.
    - Implement free-text search on `district_deletion_records` matching `districtName`, `districtId`, `cancellationReason`, and `cancelledById`.
    - Update `getAuditEventById` to check `district_deletion_records` by `id = :id OR district_id = :id` if not found in `audit_events`, returning the formatted `PermanentDeletionProof`.
  - [ ] 2.2 In `apps/backend/src/modules/audit/audit-routes.ts`:
    - Verify schema validation accepts `recordType` in query parameters.
    - Ensure Product Owner authorization guard protects deletion proof queries.
    - Return `AuditHistoryItemSchema` for both `/api/v1/audit/events` and `/api/v1/audit/events/:id`.

- [ ] **Task 3: Operational Issues & Safe Retry Routing for Deletion Lifecycle** (AC: 3, 4, 5, 6)
  - [ ] 3.1 In `apps/backend/src/modules/issues/retry-evaluator.ts`:
    - Add `'LIFECYCLE_DELETION'` and `'BACKUP_EXPIRY_DELAY'` to `RETRY_ELIGIBLE_CATEGORIES`.
    - In `deriveRetryJobSpec`:
      - Extract target district ID from `issue.districtId || (issue.metadata?.deletedDistrictId as string) || (issue.metadata?.districtId as string)`.
      - For `LIFECYCLE_DELETION`: map to `DISTRICT_LIVE_DELETION_QUEUE`, payload `{ districtId: targetDistrictId, issueId: issue.id }`, singletonKey `JobSingletonKeys.forLiveDeletion(targetDistrictId)`, operationType `'DISTRICT_LIVE_DELETION'`.
      - For `BACKUP_EXPIRY_DELAY`: map to `DISTRICT_BACKUP_EXPIRY_QUEUE`, payload `{ districtId: targetDistrictId, issueId: issue.id }`, singletonKey `JobSingletonKeys.forBackupExpiry(targetDistrictId)`, operationType `'DISTRICT_BACKUP_EXPIRY'`.
  - [ ] 3.2 In `apps/backend/src/modules/issues/retry-service.ts`:
    - In `retryOperationalIssue`: bypass the active district access check (`district.status !== 'ACTIVE' && district.status !== 'GRACE'`) when the issue category is `LIFECYCLE_DELETION` or `BACKUP_EXPIRY_DELAY` (since the district is cancelled or its parent row is already purged).
  - [ ] 3.3 In `apps/backend/src/modules/subscriptions/district-deletion-service.ts`:
    - Ensure `executeDistrictLiveDeletion` creates an active `Critical` operational issue (`logicalKey = 'del_fail:${districtId}'`, `issueCategory = 'LIFECYCLE_DELETION'`) on uncaught purge/transaction failures.
  - [ ] 3.4 In `apps/backend/src/modules/subscriptions/jobs/district-deletion-job-handler.ts`:
    - In `processDistrictDeletionJobs` and `processDistrictBackupExpiryJobs`: call `clearPendingRetryFlag(deps.db, job.data.issueId)` in `finally` blocks upon job completion or error so `pendingRetry` does not remain stuck `true`.

- [ ] **Task 4: Frontend Audit History & Proof Detail Presentation** (AC: 1, 2, 7)
  - [ ] 4.1 In `apps/web/src/components/audit/AuditEventDetailDrawer.tsx`:
    - Support rendering `AuditHistoryItem` (discriminating on `item.recordType === 'PERMANENT_DELETION_PROOF'`).
    - For permanent deletion proofs, display:
      - Clean summary header with District Name and ID.
      - 3-Milestone progress visualization:
        1. **Live Deletion:** Actual deletion timestamp, status tag, cancellation details (`cancelledById` or 'Тизим (Автоматик)', `cancelledAt`).
        2. **Protected Backup Expiry:** Expiry deadline, verified timestamp (if completed), status tag.
        3. **Restore Reconciliation:** Reconciliation status and verification timestamp.
      - Content-free compliance badge confirming zero resident message or credential retention.
      - Semantic status tags with icons (`CheckCircleOutlined`, `ClockCircleOutlined`, `CloseCircleOutlined`) and clear text labels ("Якунланган", "Кутилмоқда (30 кунлик муддат)", "Хатолик / Муддати ўтган", "Тасдиқланган").
      - Graceful fallback for optional cancellation and restore reconciliation fields.
      - Absence of edit/delete action buttons.
  - [ ] 4.2 In `apps/web/src/components/audit/AuditFilterBar.tsx` & `apps/web/src/pages/AuditHistoryPage.tsx`:
    - Add filter option for `recordType` (Барчаси / Аудит ҳодисалари / Ўчирилганлик маълумотномалари).
    - Render polymorphic table columns discriminating on `record.recordType`:
      - For `PERMANENT_DELETION_PROOF`: Purple badge (`Ўчирилганлик маълумотномаси` with `SafetyCertificateOutlined`), Product Owner tag / approver ID, `liveDeletionStatus` outcome tag.
      - For `AUDIT_EVENT`: Existing standard action/outcome rendering.
  - [ ] 4.3 In `apps/web/src/lib/formatters.ts`:
    - Add Uzbek Cyrillic formatters for deletion milestones and record types.
  - [ ] 4.4 In `apps/web/src/api/audit-client.ts`:
    - Update `fetchAuditEventDetail` to return `Promise<AuditHistoryItem>` validated by `AuditEventDetailSchema`.

- [ ] **Task 5: Comprehensive Backend & Frontend Verification Suite** (AC: 8)
  - [ ] 5.1 Create `apps/backend/tests/deletion-lifecycle-diagnostics.test.ts`:
    - Test 1: Query audit events including permanent deletion proofs via `AuditQueryService` and REST route with keyset pagination.
    - Test 2: Query single deletion proof by ID (`del_rec_*` and `districtId`) via `GET /api/v1/audit/events/:id`.
    - Test 3: Verify content-free guarantee (proof schema strictly excludes resident text, bot tokens, or credentials).
    - Test 4: Critical issue creation and retry handling for live deletion failure (`LIFECYCLE_DELETION`).
    - Test 5: Critical issue creation and retry handling for overdue backup expiry (`BACKUP_EXPIRY_DELAY`).
    - Test 6: Verify `retryService` executes retries for cancelled/deleted district issues without access revocation rejections and resets `pendingRetry` flag.
  - [ ] 5.2 Run verification gates:
    - Run `pnpm typecheck` across all monorepo packages.
    - Run `pnpm test` for backend test suites against `mahalla_ovozi_test`.

---

## Dev Notes

### Architecture & Pattern Guardrails (AD-9, AD-11, Epic 4, Epic 6)

1. **No Parallel History System:**
   - Story 6.7 explicitly extends Epic 4's Audit History shared contract (`packages/api-contracts/src/audit.ts`) using a discriminated union (`recordType: 'AUDIT_EVENT' | 'PERMANENT_DELETION_PROOF'`) rather than introducing an isolated new history endpoint.
2. **Content-Free Proof Invariant (FR32):**
   - The deletion proof stored in `district_deletion_records` and returned across API boundaries contains strictly:
     - `districtId`, `districtName`
     - `cancelledAt`, `cancelledById`, `cancellationReason`
     - `scheduledLiveDeletionAt`, `actualLiveDeletionAt`, `liveDeletionStatus`
     - `protectedBackupExpiryDeadline`, `backupExpiryStatus`, `backupExpiryVerifiedAt`
     - `restoreReconciliationStatus`, `restoreReconciliationVerifiedAt`
     - `lifecycleComplete`
   - Resident Telegram messages, evidence quotes, usernames, credentials, bot tokens, API keys, private notes, and external payment details are **NEVER** stored or returned.
3. **Multi-Milestone Deletion Lifecycle State Machine:**
   - A deletion lifecycle is ONLY complete (`lifecycleComplete: true`) when:
     - `liveDeletionStatus === 'COMPLETED'` AND `backupExpiryStatus === 'VERIFIED'`.
   - If `liveDeletionStatus === 'FAILED'` -> System Health is `Critical` (`LIFECYCLE_DELETION`).
   - If `backupExpiryStatus === 'FAILED'` or overdue -> System Health is `Critical` (`BACKUP_EXPIRY_DELAY`).
   - If restore reconciliation fails -> System Health is `Critical` (`DISASTER_RECOVERY`).
4. **Retry Service District Scope Exemption:**
   - In `retryService.retryOperationalIssue`, standard operations require the district to be `ACTIVE` or `GRACE`.
   - For `LIFECYCLE_DELETION` and `BACKUP_EXPIRY_DELAY`, this check must be bypassed because the district has been cancelled or purged from the `districts` table.
5. **Job Handler Pending Flag Cleanup:**
   - Background jobs spawned by manual retry must call `clearPendingRetryFlag(db, issueId)` in their `finally` blocks to guarantee that `pendingRetry` is cleared even when an error occurs.
6. **Database & Environment Isolation:**
   - All tests interacting with PostgreSQL or pg-boss queues **MUST** execute strictly against `mahalla_ovozi_test`, never `mahalla_ovozi`.

### Key File Modification Targets

| File | Status | Description |
| --- | --- | --- |
| `packages/api-contracts/src/audit.ts` | **UPDATE** | Add `PermanentDeletionProofSchema` (with `lifecycleComplete`), `AuditHistoryItemSchema`, and update `AuditEventDetailSchema` & `AuditHistoryQuerySchema`. |
| `packages/api-contracts/src/index.ts` | **UPDATE** | Re-export new deletion proof types and schemas. |
| `apps/backend/src/modules/audit/audit-query-service.ts` | **UPDATE** | Unified PostgreSQL `UNION ALL` query builder with deterministic keyset pagination and free-text search on deletion records. |
| `apps/backend/src/modules/audit/audit-routes.ts` | **UPDATE** | Handle `recordType` query param and return `AuditHistoryItemSchema`. |
| `apps/backend/src/modules/issues/retry-evaluator.ts` | **UPDATE** | Register `LIFECYCLE_DELETION` and `BACKUP_EXPIRY_DELAY` as retry-eligible; derive target district from metadata. |
| `apps/backend/src/modules/issues/retry-service.ts` | **UPDATE** | Bypass active district status check for deletion lifecycle issues. |
| `apps/backend/src/modules/subscriptions/district-deletion-service.ts` | **UPDATE** | Create `Critical` operational issue on live deletion purge failure. |
| `apps/backend/src/modules/subscriptions/jobs/district-deletion-job-handler.ts` | **UPDATE** | Reset `pendingRetry` flag via `clearPendingRetryFlag` in `finally` blocks. |
| `apps/web/src/components/audit/AuditEventDetailDrawer.tsx` | **UPDATE** | Render polymorphic `AuditHistoryItem` with 3-milestone progress cards and accessible status tags. |
| `apps/web/src/components/audit/AuditFilterBar.tsx` | **UPDATE** | Add `recordType` filter select. |
| `apps/web/src/pages/AuditHistoryPage.tsx` | **UPDATE** | Polymorphic table column rendering for deletion proof rows. |
| `apps/web/src/api/audit-client.ts` | **UPDATE** | Update `fetchAuditEventDetail` schema and return type to `AuditHistoryItem`. |
| `apps/web/src/lib/formatters.ts` | **UPDATE** | Add Uzbek Cyrillic formatters for deletion milestones. |
| `apps/backend/tests/deletion-lifecycle-diagnostics.test.ts` | **NEW** | Comprehensive integration and regression tests for Story 6.7. |

---

## References

- [Epic 6 Requirements (Story 6.7)](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/epics/epic-6.md#L558-L620)
- [PRD FR-32: Automatic Verified District Deletion](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/prds/prd-Mahalla-Ovozi-2026-07-30/prd.md#L502-L516)
- [Architecture Spine AD-9 & AD-11](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/architecture/architecture-Mahalla-Ovozi-2026-08-12/ARCHITECTURE-SPINE.md)
- [Story 6.4: Execute Permanent Live Deletion](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/implementation-artifacts/6-4-execute-permanent-live-system-district-deletion.md)
- [Story 6.5: Verify Protected Backup Expiry](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/implementation-artifacts/6-5-verify-protected-backup-expiry.md)
- [Story 6.6: Reconcile Disaster Restores Before Re-Enabling Service](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/implementation-artifacts/6-6-reconcile-disaster-restores-before-re-enabling-service.md)

---

## Dev Agent Record

### Agent Model Used

Gemini 3.7 Flash (High)

### Debug Log References

### Completion Notes List

- Story context created following `bmad-create-story` workflow.
- Specification refined following exhaustive adversarial and edge-case evaluation:
  - Added `lifecycleComplete` derived field to `PermanentDeletionProofSchema`.
  - Unified single-item lookup schema `AuditEventDetailSchema = AuditHistoryItemSchema`.
  - Prescribed PostgreSQL `UNION ALL` keyset pagination tuple comparisons `(created_at, id)`.
  - Added free-text search mappings for deletion record fields.
  - Resolved `retryService` district scope check bypass for cancelled/deleted districts.
  - Added `clearPendingRetryFlag` invocations to background job handlers.
  - Specified polymorphic table and drawer rendering with accessible Cyrillic status indicators.
  - Enforced strict content-free verification tests.

### File List

- `_bmad-output/implementation-artifacts/6-7-review-and-diagnose-the-district-deletion-lifecycle.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

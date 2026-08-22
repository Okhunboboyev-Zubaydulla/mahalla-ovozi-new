---
baseline_commit: bb8a1c3
---

# Story 2.6: Enforce Topic-Level Retention and Preserve Accepted Evidence as Source of Truth

Status: review

<!-- Note: Validation is complete. Story specification has passed adversarial, edge-case, and compliance pre-dev review. -->

## Story

As the **Product Owner**,
I want each Topic and its Accepted Evidence to follow one authoritative 90-day retention boundary,
So that retained evidence remains complete while needed and expires predictably without leaving partial or resurrectable resident data.

## Acceptance Criteria

1. **Accepted Evidence as Immutable Source of Truth (FR-12, AD-3, AD-5):**
   - **Given** a Topic contains Accepted Evidence in `accepted_evidence` table
   - **When** authoritative Topic state, evidence counts, or retention boundaries are evaluated
   - **Then** `accepted_evidence` remains the sole unalterable source of truth for that Topic
   - **And** Topic summaries, Lane membership, anchors, attribution, AI outputs, or other derived fields in `topic_projections` cannot replace, alter, or synthesize underlying Accepted Evidence
   - **And** the Topic's retained-evidence count is the exact count of retained `accepted_evidence` rows, never an inferred count of residents or unique users.

2. **Authoritative 90-Day Topic-Level Retention Calculation (FR-12, AD-3, AD-9):**
   - **Given** a Topic contains one or more Accepted Evidence items
   - **When** its retention deadline (`retentionExpiresAt`) is calculated
   - **Then** the deadline is exactly 90 days after the latest relevant Accepted Evidence's `originalTimestamp` (`latestRelevantEvidenceTimestamp`)
   - **And** the calculation uses the authoritative `Asia/Tashkent` (+05:00) calendar time boundary (exact 90-day duration: $90 \times 86{,}400{,}000\text{ ms}$)
   - **And** worker execution time, AI completion time, retry time, dashboard access time, or Telegram message edit time cannot extend or alter the retention deadline.

3. **Dynamic Expiry Extension by Later Evidence (FR-12, AD-7):**
   - **Given** new Accepted Evidence is validly committed to an existing retained Topic
   - **When** its `originalTimestamp` is later than the Topic's existing `latestRelevantEvidenceTimestamp`
   - **Then** `latestRelevantEvidenceTimestamp` advances to the newer timestamp
   - **And** `retentionExpiresAt` is recalculated and extended to 90 days from that advanced timestamp
   - **And** all existing and new Accepted Evidence items belonging to that Topic remain retained until the newly extended Topic deadline.

4. **Prevention of Premature Individual Evidence Expiry (FR-12, AD-3):**
   - **Given** an individual `accepted_evidence` item is older than 90 days from its own individual `originalTimestamp`
   - **But** its parent Topic contains a later Accepted Evidence item whose Topic-level retention deadline (`retentionExpiresAt`) has not arrived
   - **When** normal retention scanning and cleanup runs
   - **Then** that older `accepted_evidence` item is **not** individually expired or deleted
   - **And** the Topic's complete retained evidence trail survives intact together as a single evidentiary unit.

5. **Retention Boundary Protection for Active Topics (FR-12, AD-9):**
   - **Given** a Topic has not reached its authoritative retention deadline (`retentionExpiresAt > NOW()`)
   - **When** routine retention processing evaluates the Topic
   - **Then** neither the Topic, nor its `accepted_evidence`, nor its `topic_projections` are deleted
   - **And** derived projection updates, operational cleanup scripts, or manual triggers cannot shorten the approved 90-day retention period.

6. **Pre-Deletion Verification & Atomic Multi-Table Purge (FR-12, AD-3, AD-4):**
   - **Given** a Topic has reached its authoritative retention deadline (`retentionExpiresAt <= NOW()`)
   - **When** retention deletion executes within `TopicRetentionService.purgeExpiredTopic`
   - **Then** the service acquires a row lock (`SELECT * FROM topics WHERE id = topicId AND district_id = districtId FOR UPDATE`) and re-verifies that `latestRelevantEvidenceTimestamp` has not advanced and `retentionExpiresAt <= NOW()`
   - **And** the deletion removes `topic_projections`, `accepted_evidence`, and `topics` atomically in explicit foreign key dependency order:
     $$\text{topic\_projections} \longrightarrow \text{accepted\_evidence} \longrightarrow \text{topics}$$
   - **And** the entire purge executes in a single database transaction (`withTransactionalIntake`), guaranteeing zero partial state where a Topic exists without evidence or evidence exists as an orphan.

7. **CAS Concurrency & Ingestion Race Protection (FR-12, AD-6, AD-7):**
   - **Given** a Topic appears eligible for retention deletion while new Accepted Evidence or a Topic-derived refresh is being committed concurrently
   - **When** the deletion transaction attempts to commit
   - **Then** if new evidence was committed (advancing `latestRelevantEvidenceTimestamp` and `retentionExpiresAt > NOW()`), the stale deletion aborts cleanly with 0 rows deleted
   - **And** if deletion succeeds, any subsequent attempt by an in-flight worker to insert `accepted_evidence` into the deleted `topic_id` fails cleanly on the foreign key check (`topics.id` does not exist) without resurrecting the Topic.

8. **Complete Derived State Expiry & Zero Historical Shadow Copies (FR-12, AD-11):**
   - **Given** a Topic expires and is purged from PostgreSQL
   - **When** deletion completes
   - **Then** the Topic's summary, Lane projection, anchor, attribution, and Hokim-related status in `topic_projections` are permanently deleted
   - **And** no derived representation is retained as a shadow or historical copy of deleted Accepted Evidence in any auxiliary table, cache, or search index.

9. **Privacy-Safe Operational Traceability & Content Sanitization (FR-12, FR-13, AD-8, AD-11):**
   - **Given** Topic-linked AI processing records exist in `ai_operations` and `ai_provider_attempts`
   - **When** Topic retention deletion completes
   - **Then** only privacy-safe, content-free technical metadata (e.g. `operationType`, `profileId`, `durationMs`, `totalTokens`, `costMicroCents`, sanitized error codes) remains queryable for aggregate operational metrics
   - **And** all resident candidate text, Accepted Evidence text, generated Uzbek Cyrillic summaries, and resident identifiers remain strictly purged and impossible to reconstruct from retained operational records.

10. **Monotonic Context Revision Advancement & Anti-Resurrection (FR-9, AD-5, AD-6):**
    - **Given** retention deletion changes canonical same-day Mahalla evidence state
    - **When** Topic and evidence deletion commits
    - **Then** `accepted_evidence` rows for the purged Topic are permanently deleted from PostgreSQL
    - **And** subsequent `getMahallaDailySnapshot` calls immediately compute a distinct `snapshotFingerprint` and adjusted `contextRevision = evidence.length`
    - **And** any in-flight contextual AI operation (such as Topic matching or Topic projection) referencing the prior `snapshotFingerprint` or `contextRevision` fails with `STALE_SNAPSHOT` upon commit
    - **And** deleted Topic or evidence state cannot be recreated or resurrected by a late-arriving AI provider response.

11. **Obsolete Asynchronous Job Termination (FR-12, AD-3, AD-7):**
    - **Given** a Topic expires while an unfinished Topic projection job (`TELEGRAM_TOPIC_PROJECTION_QUEUE`) exists in pg-boss
    - **When** that job is picked up by a worker
    - **Then** the worker pre-AI lookup and post-AI transactional lock detect that the target `topic_id` does not exist in `topics` table
    - **And** the obsolete job exits cleanly as `TELEGRAM_TOPIC_PROJECTION_DROPPED_EXPIRED` without throwing unhandled exceptions, creating orphan records, or retrying in pg-boss.

12. **Strict District Tenant Scoping & Isolation (FR-12, AD-9):**
    - **Given** the retention scanner or purge service evaluates District-owned data
    - **When** reading or purging expired Topics
    - **Then** every database query strictly requires an explicit `districtId` parameter
    - **And** an omitted or empty `districtId` immediately throws a typed domain error (`INVALID_DISTRICT_SCOPE`) rather than executing a global all-District scan
    - **And** Topics or evidence from another District can never be scanned or purged through the scoped business operation.

13. **Scheduled Retention Scanner & Batch Idempotency (FR-12, AD-3, AD-11):**
    - **Given** the scheduled retention worker job (`TELEGRAM_TOPIC_RETENTION_QUEUE`) runs on a recurring schedule (e.g. hourly cron via pg-boss)
    - **When** scanning for expired Topics across active Districts
    - **Then** the scanner queries `topics` where `district_id = $districtId AND status = 'ACTIVE' AND retention_expires_at <= NOW()` with a configurable `LIMIT` (default 100)
    - **And** each expired Topic is purged independently within its own atomic transaction
    - **And** duplicate job delivery or concurrent scanner workers execute idempotently without deadlocks or duplicate deletion errors.

14. **Disaster-Restore Retention Reconciliation Gate (FR-12, AD-11):**
    - **Given** Mahalla Ovozi is restored from a PostgreSQL backup containing Topics or Accepted Evidence whose `retentionExpiresAt` has passed during the backup/restore interval
    - **When** disaster-restore reconciliation runs via `reconcileRestoredRetention(districtId)` before public ingress and Telegram intake are enabled
    - **Then** the reconciliation service re-evaluates all restored Topics against current `NOW()`
    - **And** all expired Topics, their Accepted Evidence, and derived projections are purged before application access is granted
    - **And** restored stale data cannot become operational or visible merely because it was captured in an earlier backup.

15. **Privacy-Safe Telemetry & Zero Leakage (FR-12, AD-11):**
    - **Given** retention scanning and purging runs, finds nothing due, purges topics, or aborts due to newer evidence
    - **When** structured JSON logs and OpenTelemetry metrics are emitted
    - **Then** logs capture `event: 'TELEGRAM_TOPIC_RETENTION_PURGED'`, `districtId`, `topicsPurgedCount`, `evidencePurgedCount`, `projectionsPurgedCount`, and `durationMs`
    - **And** raw Accepted Evidence text, Telegram usernames, resident display names, Topic summaries, AI context, credentials, and secrets remain strictly excluded from logs, metrics, and Audit History.

16. **Attribution Immutability & Sender Multiplicity (FR-12, AD-5):**
    - **Given** Accepted Evidence is retained prior to Topic expiry
    - **When** Telegram later edits or deletes the original message, or Product Owner mappings change
    - **Then** retained evidence preserves its original verbatim text, Telegram timestamp, and captured username/display name
    - **And** repeated messages from the same sender remain distinct evidence items without falsely asserting that the evidence represents multiple distinct residents.

17. **Story Boundary Isolation (FR-14, FR-15, FR-17):**
    - **Given** Story 2.6 is implemented and verified
    - **When** tests execute
    - **Then** tests prove Story 2.6 calculates, extends, and enforces Topic-level 90-day retention without implementing Hokim dashboard UI components (Epic 3), manual audit history views (Epic 4), or AI operation query endpoints (Story 2.7).

---

## Tasks / Subtasks

- [x] **Task 1: Retention Domain Service & Repository Operations (AC: 1, 2, 3, 4, 5, 6, 7, 8, 10, 12)**
  - [x] 1.1 Create `apps/backend/src/modules/retention/topic-retention-types.ts`:
    - Export `RetentionPurgeResult`: `{ topicId: string; districtId: string; evidenceCount: number; projectionsCount: number; purged: boolean; reason?: string }`.
    - Export `RetentionScanOptions`: `{ limit?: number }`.
    - Export `RetentionBatchResult`: `{ districtId: string; topicsEvaluated: number; topicsPurged: number; evidencePurged: number; durationMs: number }`.
  - [x] 1.2 Create `apps/backend/src/modules/retention/topic-retention-repository.ts`:
    - Define `findExpiredTopicIds(districtId: string, limit: number, tx?: DrizzleTx): Promise<string[]>` querying `topics` where `districtId = $districtId AND retentionExpiresAt <= NOW() LIMIT $limit`.
    - Define `deleteTopicWithEvidenceAtomic(districtId: string, topicId: string, tx: DrizzleTx): Promise<{ evidenceCount: number; projectionsCount: number; aborted?: boolean }>`:
      - Acquire row lock: `SELECT * FROM topics WHERE id = topicId AND district_id = districtId FOR UPDATE`.
      - Re-verify `retentionExpiresAt <= NOW()`. If `retentionExpiresAt > NOW()`, return `{ evidenceCount: 0, projectionsCount: 0, aborted: true }`.
      - Delete from `topic_projections WHERE topic_id = topicId AND district_id = districtId`.
      - Delete from `accepted_evidence WHERE topic_id = topicId AND district_id = districtId` (automatically invalidates downstream `snapshotFingerprint` and `contextRevision = evidence.length`).
      - Delete from `topics WHERE id = topicId AND district_id = districtId`.
  - [x] 1.3 Create `apps/backend/src/modules/retention/topic-retention-service.ts`:
    - Implement `TopicRetentionService` with `purgeExpiredTopic`, `purgeDistrictExpiredTopicsBatch`, and `calculateRetentionDeadline(latestTimestamp: Date): Date` (exact 90-day helper: $+7{,}776{,}000{,}000\text{ ms}$).
    - Wrap all multi-table mutations within `withTransactionalIntake`.
    - Enforce explicit `districtId` validation (throw `INVALID_DISTRICT_SCOPE` if missing).
  - [x] 1.4 Export retention module from `apps/backend/src/modules/retention/index.ts`.

- [x] **Task 2: Scheduled Retention Job & Worker Consumer (AC: 6, 7, 11, 12, 13, 15)**
  - [x] 2.1 Update `apps/backend/src/adapters/jobs/boss-client.ts`:
    - Define `TELEGRAM_TOPIC_RETENTION_QUEUE = 'telegram-topic-retention'`.
    - Add `await boss.createQueue(TELEGRAM_TOPIC_RETENTION_QUEUE)` to `initBossQueues`.
  - [x] 2.2 Update `apps/backend/src/entrypoints/worker.ts`:
    - Register pg-boss recurring schedule: `await boss.schedule(TELEGRAM_TOPIC_RETENTION_QUEUE, '0 * * * *', {}, { tz: 'Asia/Tashkent' })` (hourly scan).
    - Implement `handleTopicRetentionJob(job: Job<RetentionJobPayload>)`:
      - Query all registered/active Districts from `districts` table.
      - Execute `TopicRetentionService.purgeDistrictExpiredTopicsBatch(districtId)` with error isolation per District.
      - Emit privacy-safe structured telemetry (`TELEGRAM_TOPIC_RETENTION_PURGED`, `TELEGRAM_TOPIC_RETENTION_SCAN_COMPLETED`).
    - Update `handleTopicProjectionJob` in `worker.ts` to detect when a target Topic has already expired/deleted and drop cleanly as `TELEGRAM_TOPIC_PROJECTION_DROPPED_EXPIRED` (AC 11).

- [x] **Task 3: Disaster-Recovery Retention Reconciliation Service (AC: 14)**
  - [x] 3.1 Create `apps/backend/src/modules/retention/restore-reconciliation.ts`:
    - Implement `reconcileRestoredRetention(districtId?: string)`:
      - Scans all registered districts (or the specific `districtId`).
      - Purges all expired topics where `retentionExpiresAt <= NOW()`.
      - Returns summary `{ districtsReconciled: number, totalTopicsPurged: number, totalEvidencePurged: number }`.
  - [x] 3.2 Create `apps/backend/src/cli/reconcile-retention.ts` CLI script for backup restoration procedures.

- [x] **Task 4: Comprehensive Verification Matrix & Integration Test Suite (AC: 1-17)**
  - [x] 4.1 Unit tests in `tests/topic-retention-service.test.ts`:
    - Test exact 90-day deadline calculation from `latestRelevantEvidenceTimestamp` in `Asia/Tashkent`.
    - Test retention extension when newer evidence is added.
    - Test that older evidence within active topic is not expired individually.
    - Test explicit `districtId` requirement (throws on empty/undefined).
  - [x] 4.2 Integration tests in `tests/worker-topic-retention.test.ts` (28-Row Verification Matrix):
    - Matrix #1: Topic with `retentionExpiresAt` in the past is purged atomically (`topic_projections`, `accepted_evidence`, `topics` all removed) (AC 2, 6).
    - Matrix #2: Older evidence (95 days old) retained because Topic has newer evidence (10 days old) (AC 3, 4).
    - Matrix #3: Active Topic with `retentionExpiresAt` in future (tomorrow) is not touched by scanner (AC 5).
    - Matrix #4: Deletion removes `topic_projections` before `accepted_evidence` before `topics` respecting `onDelete: 'restrict'` (AC 6).
    - Matrix #5: In-flight race: new evidence arrives during scan, extending deadline $\rightarrow$ deletion aborts cleanly with 0 deleted (AC 7).
    - Matrix #6: After Topic is purged, subsequent insertion of `accepted_evidence` into old `topic_id` fails FK constraint (AC 7).
    - Matrix #7: Purging Topic deletes its Uzbek Cyrillic summary and multi-lane projection completely without leaving shadow rows (AC 8).
    - Matrix #8: AI operations in `ai_operations` retain content-free technical metadata while resident text is purged (AC 9).
    - Matrix #9: Topic deletion invalidates `snapshotFingerprint` and `contextRevision` monotonically (AC 10).
    - Matrix #10: In-flight AI Topic projection job targeting deleted topic fails as `STALE_SNAPSHOT` and commits 0 rows (AC 10).
    - Matrix #11: In-flight AI Topic matching job referencing old context revision fails and does not recreate deleted topic (AC 10).
    - Matrix #12: Pending pg-boss projection job for expired topic detects deleted topic and drops cleanly as `TELEGRAM_TOPIC_PROJECTION_DROPPED_EXPIRED` (AC 11).
    - Matrix #13: Missing `districtId` in retention scan throws `INVALID_DISTRICT_SCOPE` (AC 12).
    - Matrix #14: Purge in District A never touches expired or active topics in District B (AC 12).
    - Matrix #15: Scheduled retention worker executes batch purge of 50 expired topics in single run (AC 13).
    - Matrix #16: Duplicate retention job delivery for same topic executes idempotently with 0 errors (AC 13).
    - Matrix #17: Disaster-recovery reconciliation scans restored database and purges 10 expired topics before traffic starts (AC 14).
    - Matrix #18: Structured log emits `TELEGRAM_TOPIC_RETENTION_PURGED` with counts and duration, 0 raw text (AC 15).
    - Matrix #19: Multiple messages from same resident sender preserved as distinct evidence records prior to expiry (AC 16).
    - Matrix #20: Telegram edit after evidence commit does not alter stored `verbatimText` or `retentionExpiresAt` (AC 1, 2).
    - Matrix #21: Telegram message deletion on Telegram side does not delete `accepted_evidence` before 90-day retention (AC 1, 2).
    - Matrix #22: Topic with 10 evidence items purges all 10 evidence items atomically without partial orphan rows (AC 6).
    - Matrix #23: Topic with `anchorEvidenceId` referencing evidence item purges cleanly without FK restrict violation (AC 6).
    - Matrix #24: Retention scan with empty backlog completes in <5ms with `TELEGRAM_TOPIC_RETENTION_SCAN_COMPLETED` (AC 13, 15).
    - Matrix #25: Inactive/suspended district drops retention job cleanly at Gate 1 (AC 12).
    - Matrix #26: Exact 90-day leap year / day arithmetic validation in `Asia/Tashkent` timezone (+05:00) (AC 2).
    - Matrix #27: Database transaction rollback on simulated network glitch leaves Topic and evidence intact (AC 6).
    - Matrix #28: Story boundary check: confirms retention runs without dashboard API or UI components (AC 17).
  - [x] 4.3 Full regression verification: `pnpm typecheck`, `pnpm --filter backend test`, `pnpm build` (verifying 100% pass rate).

---

## Dev Notes

### Architecture Patterns & Invariants
- **Referential Integrity & Deletion Order:** 
  - `acceptedEvidence.topicId` has `onDelete: 'restrict'`.
  - `topicProjections.anchorEvidenceId` has `onDelete: 'restrict'`.
  - Therefore, deletion must execute in strict topological order within a single transaction:
    ```ts
    await tx.delete(topicProjections).where(eq(topicProjections.topicId, topicId));
    await tx.delete(acceptedEvidence).where(eq(acceptedEvidence.topicId, topicId));
    await tx.delete(topics).where(eq(topics.id, topicId));
    ```
- **Timezone & Expiry Arithmetic:**
  - Uzbekistan operates in `Asia/Tashkent` (+05:00) with no daylight saving time.
  - Exactly 90 calendar days equates to $90 \times 24 \times 60 \times 60 \times 1000 = 7{,}776{,}000{,}000\text{ ms}$.
  - `retentionExpiresAt = new Date(latestRelevantEvidenceTimestamp.getTime() + 7_776_000_000)`.
- **Anti-Resurrection via Dynamic Context Snapshot Invalidation:**
  - Deleting a Topic removes its evidence from `accepted_evidence`.
  - Any concurrent contextual AI operation calls `getMahallaDailySnapshot()` which calculates `snapshotFingerprint` and `contextRevision = evidence.length`.
  - The snapshot fingerprint mismatch immediately trips `latestSnapshot.snapshotFingerprint !== initialFingerprint`, aborting the stale AI commit as `STALE_SNAPSHOT`.
  - Furthermore, `topics.id` deletion ensures any subsequent insertion of `accepted_evidence` referencing the old `topic_id` fails foreign key constraint check.

### Source Tree Components
- `apps/backend/src/modules/retention/topic-retention-types.ts` [NEW]
- `apps/backend/src/modules/retention/topic-retention-repository.ts` [NEW]
- `apps/backend/src/modules/retention/topic-retention-service.ts` [NEW]
- `apps/backend/src/modules/retention/restore-reconciliation.ts` [NEW]
- `apps/backend/src/modules/retention/index.ts` [NEW]
- `apps/backend/src/adapters/jobs/boss-client.ts` [UPDATE]
- `apps/backend/src/entrypoints/worker.ts` [UPDATE]
- `apps/backend/src/cli/reconcile-retention.ts` [NEW]
- `apps/backend/tests/topic-retention-service.test.ts` [NEW]
- `apps/backend/tests/worker-topic-retention.test.ts` [NEW]

### Anti-Patterns to Prevent
1. **Never use `DELETE FROM topics` with `ON DELETE CASCADE`** — `accepted_evidence` contains civic evidence that must never be wiped implicitly by an accidental topic delete.
2. **Never delete individual evidence items before Topic expiry** — the entire evidentiary trail must survive together until the Topic's latest evidence deadline arrives.
3. **Never omit `district_id` from queries** — all SELECT/DELETE statements must include `WHERE district_id = $districtId`.
4. **Never log raw evidence or summaries in telemetry** — log only sanitized identifiers, counts, and durations.

---

## Project Structure Notes

- Alignment with Hexagonal Modular Monolith (`apps/backend/src/modules/retention/`).
- Database schema located in `apps/backend/src/adapters/db/schema/`.
- Worker runtime in `apps/backend/src/entrypoints/worker.ts`.
- Tests located in `apps/backend/tests/`.

---

## References

- [ARCHITECTURE-SPINE.md: AD-3, AD-4, AD-5, AD-6, AD-7, AD-9, AD-11](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/architecture/architecture-Mahalla-Ovozi-2026-08-12/ARCHITECTURE-SPINE.md)
- [Epic 2: Story 2.6 Acceptance Criteria](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/epics/epic-2.md#L524-L647)
- [Story 2.4 Specification](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/implementation-artifacts/2-4-assign-relevant-signals-to-same-day-topics-and-commit-accepted-evidence.md)
- [Story 2.5 Specification](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/implementation-artifacts/2-5-recalculate-the-canonical-multi-lane-topic-projection.md)

---

## Dev Agent Record

### Context & Implementation Notes
- **Implemented Story 2.6:** Enforced topic-level 90-day retention boundary ($+7{,}776{,}000{,}000\text{ ms}$ exact millisecond arithmetic) and established `accepted_evidence` as the immutable source of truth.
- **Topological Cascade Deletion:** Satisfied PostgreSQL `onDelete: 'restrict'` referential integrity across the entire foreign key hierarchy by atomically deleting in sequence: `topic_projections` $\rightarrow$ `accepted_evidence` $\rightarrow$ `topics`.
- **Anti-Resurrection & Concurrency Safeguards:** Exclusive row locks (`SELECT ... FOR UPDATE`) in `deleteTopicWithEvidenceAtomic` abort purge cleanly if new evidence extended the retention deadline in-flight. Purging evidence rows invalidates dynamic context snapshots (`snapshotFingerprint` and `contextRevision = evidence.length`), cleanly aborting stale in-flight AI commits with `STALE_SNAPSHOT`.
- **Worker & Disaster-Recovery Services:**
  - Registered `TELEGRAM_TOPIC_RETENTION_QUEUE = 'telegram-topic-retention'` in `boss-client.ts` with recurring hourly schedule `0 * * * *` (`Asia/Tashkent`).
  - Added clean termination for expired topic projection jobs as `TELEGRAM_TOPIC_PROJECTION_DROPPED_EXPIRED` in `worker.ts`.
  - Implemented `reconcileRestoredRetention` and CLI script `apps/backend/src/cli/reconcile-retention.ts` for database restore reconciliation before traffic admission.
- **Verification Matrix:** Implemented and verified the full 28-row matrix in `tests/worker-topic-retention.test.ts` (100% green), unit tests in `tests/topic-retention-service.test.ts` (9/9 passed), and full regression test suite (30 test files / 434 tests passing).

### Modified & Created Files
- `apps/backend/src/modules/retention/topic-retention-types.ts` [NEW]
- `apps/backend/src/modules/retention/topic-retention-repository.ts` [NEW]
- `apps/backend/src/modules/retention/topic-retention-service.ts` [NEW]
- `apps/backend/src/modules/retention/restore-reconciliation.ts` [NEW]
- `apps/backend/src/modules/retention/index.ts` [NEW]
- `apps/backend/src/adapters/jobs/boss-client.ts` [UPDATE]
- `apps/backend/src/entrypoints/worker.ts` [UPDATE]
- `apps/backend/src/cli/reconcile-retention.ts` [NEW]
- `apps/backend/package.json` [UPDATE]
- `apps/backend/tests/topic-retention-service.test.ts` [NEW]
- `apps/backend/tests/worker-topic-retention.test.ts` [NEW]
- `_bmad-output/implementation-artifacts/sprint-status.yaml` [UPDATE]
- `_bmad-output/implementation-artifacts/2-6-enforce-topic-level-retention-and-preserve-accepted-evidence-as-source-of-truth.md` [UPDATE]


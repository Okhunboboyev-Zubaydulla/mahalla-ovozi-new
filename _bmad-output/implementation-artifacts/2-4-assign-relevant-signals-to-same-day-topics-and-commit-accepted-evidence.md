---
baseline_commit: 39d377faa5157c81a4dedf943b1987062be78701
---

# Story 2.4: Assign Relevant Signals to Same-Day Topics and Commit Accepted Evidence

Status: ready-for-dev

<!-- Note: Validation is complete. Story specification has passed adversarial, edge-case, and compliance pre-dev review. -->

## Story

As the **Hokim**,
I want each relevance-qualified Telegram signal to become Accepted Evidence only when it can be reliably assigned to the correct same-day Topic or safely start a new one,
So that District Topics remain traceable, day-bounded, and free from guessed evidence relationships.

## Acceptance Criteria

1. **Authoritative Scoping & Non-Crossing Boundaries (FR-5, FR-9, AD-5):**
   - **Given** a candidate has a completed `relevant` decision from Story 2.3
   - **When** Topic assignment begins
   - **Then** its authoritative scope is strictly the captured District ID, captured Mahalla name, and `Asia/Tashkent` calendar day derived from the original Telegram timestamp
   - **And** Topic assignment and evidence relationships **never** cross District, Mahalla, or midnight boundaries
   - **And** District lifecycle eligibility is rechecked at Gate 1 (pre-AI) and Gate 2 (pre-commit); inactive/ineligible districts exit cleanly without triggering pg-boss retries.

2. **Direct Telegram Reply Priority & Pure DB Resolution (FR-5, FR-8, AD-5):**
   - **Given** the relevant candidate directly replies to a Telegram message (`replyMetadata.replyToMessageId`)
   - **When** that referenced parent message exists in `accepted_evidence` with matching `district_id`, `telegram_chat_id`, `telegram_message_id`, `mahalla_name`, and `calendar_day`
   - **Then** the candidate is assigned immediately to that parent evidence item's canonical Topic (`MATCH_EXISTING_TOPIC`)
   - **And** the direct Telegram reply relationship takes absolute priority with zero AI Gateway invocations (pure DB resolution)
   - **And** no alternative semantic match or new Topic is created merely because another match appears plausible.

3. **Invalid / Cross-Day Direct Reply Target Isolation (FR-5, FR-8, AD-5):**
   - **Given** a candidate replies to a message that belongs to another calendar day, another Mahalla/District, was structurally excluded (Story 2.2), non-relevant (Story 2.3), or is not found in `accepted_evidence`
   - **When** direct reply evaluation runs via `findDirectReplyTopic`
   - **Then** that relationship returns `null` and cannot create a cross-day or cross-scope Topic link
   - **And** the candidate falls back to the nearest-earlier same-day Topic matching pipeline applicable to its own captured scope.

4. **Fallback Nearest-Earlier Same-Day Topic Matching (FR-5, FR-8, FR-9, AD-5):**
   - **Given** no eligible direct reply relationship exists and existing Topics exist in the Mahalla today
   - **When** same-day Topic matching is evaluated
   - **Then** the candidate plus all raw Accepted Evidence from every same-day Topic in that Mahalla is supplied as the complete contextual snapshot via `getMahallaDailySnapshot`
   - **And** the AI evaluator determines whether the candidate concerns the same underlying situation as an existing Topic or nearest-earlier topic-linked message
   - **And** evidence items within the snapshot are strictly ordered by `originalTimestamp ASC` $\rightarrow$ `telegramMessageId ASC` $\rightarrow$ `id ASC`
   - **And** older same-day context is never silently truncated, summarized, or replaced by vector retrieval.

5. **Situation Continuity & Primary Lane Immutability (FR-8):**
   - **Given** a candidate reports outage updates, voltage fluctuations (e.g. *"tok 160V"*), resident restoration notices (*"svet yondi"*), recurrence (*"yana o'chdi"*), or contradictory reports regarding an active same-day situation
   - **When** evaluated against the existing same-day Topic
   - **Then** the candidate is assigned to that existing Topic (`MATCH_EXISTING_TOPIC`)
   - **And** the canonical Topic's existing `primary_lane` remains immutable and is not overwritten by the candidate
   - **And** no duplicate Topic is created for the same situation.

6. **Self-Contained Signal Seeds New Canonical Topic (FR-7, FR-9):**
   - **Given** a candidate represents an independent civic issue not matching any existing same-day Topic
   - **And** the message is self-contained (e.g. *"Suv quvuri yorildi, ko'chani suv bosdi"*)
   - **When** Topic assignment completes
   - **Then** one new canonical Topic record is created in `topics` with its designated `primary_lane` (`WATER`, `ELECTRICITY`, `GAS`, `WASTE`, `HOKIM_RELATED`), `requiredDerivedGeneration = 1`, and `appliedDerivedGeneration = 0`
   - **And** the candidate becomes the first `accepted_evidence` for that Topic
   - **And** the Topic receives an opaque identifier (`top_<uuid>`).

7. **Unassignable Vague Signal Discard & Privacy Purge (FR-4, FR-8, AD-11):**
   - **Given** a candidate is vague or context-dependent (e.g. *"Bizda ham"*, *"Qachon beradi?"*) without a valid direct reply or matching topic
   - **When** Topic matching concludes `UNASSIGNABLE_VAGUE`
   - **Then** no Topic or Accepted Evidence record is created
   - **And** `telegram_intake_records.raw_payload` is sanitized/purged in PostgreSQL to `{ status: "EXCLUDED", reason: "UNASSIGNABLE_VAGUE", purgedAt: "..." }`
   - **And** `ai_operations` records the decision with sanitized metadata (no verbatim text in telemetry)
   - **And** candidate text is purged from worker memory.

8. **Atomic Commit, Referential Safety & Verbatim Evidence Immutability (FR-4, FR-11, AD-3, AD-5):**
   - **Given** a candidate is accepted into a new or existing Topic
   - **When** the authoritative database commit executes
   - **Then** Topic update/creation, `accepted_evidence` insertion, AI operation logging, and payload purging occur atomically within `withTransactionalIntake`
   - **And** `accepted_evidence` records verbatim text/caption, original Telegram timestamp, chat ID, message ID, whitelisted user metadata (`telegramUserId`, `username`, `firstName`, `lastName` — strictly no phone inferred), and AI operation ID
   - **And** `accepted_evidence.topic_id` foreign key is configured with `{ onDelete: 'restrict' }` to prevent accidental deletion of legal civic evidence.

9. **Telegram Edits & Deletions Non-Impact (FR-12, AD-5):**
   - **Given** Accepted Evidence has been committed in PostgreSQL
   - **When** the resident edits or deletes the original message on Telegram
   - **Then** the stored Accepted Evidence is immutable and remains unaltered
   - **And** the original timestamp remains authoritative.

10. **Topic-Level 90-Day Retention Deadline & Generation Increment (FR-12, AD-7, AD-11):**
    - **Given** a Topic receives new Accepted Evidence
    - **When** retention timestamps and generations are updated
    - **Then** `latestRelevantEvidenceTimestamp` is updated to `MAX(existingTopic.latestRelevantEvidenceTimestamp, candidateOriginalTimestamp)`
    - **And** `retentionExpiresAt` is calculated via exact millisecond arithmetic: `new Date(latestRelevantEvidenceTimestamp.getTime() + 90 * 24 * 60 * 60 * 1000)`
    - **And** `requiredDerivedGeneration` is incremented by 1 (`requiredDerivedGeneration = requiredDerivedGeneration + 1`)
    - **And** individual evidence items do not expire independently while the parent Topic is retained.

11. **Monotonic Context Revision & Deterministic Ordering (FR-9, AD-5):**
    - **Given** Accepted Evidence is committed
    - **When** the Mahalla daily snapshot is queried
    - **Then** `contextRevision` advances monotonically by 1 with each evidence item
    - **And** evidence is strictly ordered by `originalTimestamp ASC` $\rightarrow$ `telegramMessageId ASC` $\rightarrow$ `id ASC`.

12. **Optimistic Concurrency & Stale Snapshot Rejection (FR-9, AD-6):**
    - **Given** contextual AI matching captured an initial `contextRevision` and `snapshotFingerprint`
    - **When** another worker commits evidence before the current AI result can commit
    - **Then** the commit is aborted as `STALE_SNAPSHOT`
    - **And** no partial state is written
    - **And** the unfinished job retries against the latest complete snapshot with exponential backoff
    - **And** Story 2.3's completed relevance decision is not re-evaluated.

13. **Double Lifecycle Verification (AD-9):**
    - **Given** a topic assignment job is processed
    - **When** AI invocation or database commit is about to occur
    - **Then** District status is checked at Gate 1 (pre-AI) and Gate 2 (pre-commit)
    - **And** an inactive or access-ineligible District drops or aborts cleanly with structured event logs and zero retry pollution.

14. **AI Gateway Traceability Boundary (FR-13, AD-8):**
    - **Given** an AI matching operation executes
    - **When** external provider requests occur
    - **Then** a logical operation (`ai_operations`) is recorded with pinned profile `prof_match_2026_08_v1`
    - **And** every attempt is tracked in `ai_provider_attempts` with tokens, latency, cost, and sanitized error codes
    - **And** AI provider calls execute outside database transactions.

15. **Explicit AI Failure Handling (FR-13, AD-8):**
    - **Given** the AI provider encounters timeout, rate limit, refusal, server error, or invalid JSON syntax/semantics
    - **When** matching cannot produce a valid result
    - **Then** the job fails explicitly and triggers pg-boss retry policy
    - **And** no fake Topic or fallback evidence is committed.

16. **Deduplication & Redelivery Idempotency (FR-6, AD-3):**
    - **Given** Telegram redelivers a message or a worker restarts
    - **When** topic assignment runs
    - **Then** at most one `accepted_evidence` record can exist per `(districtId, telegramChatId, telegramMessageId)`
    - **And** Postgres unique violation `23505` inside `withTransactionalIntake` is cleanly rolled back and logged as duplicate skip without failing the worker.

17. **Downstream Topic Projection Enqueue (AD-3, AD-7):**
    - **Given** a Topic assignment commits successfully
    - **When** the database transaction completes
    - **Then** `TELEGRAM_TOPIC_PROJECTION_QUEUE` is enqueued with `{ topicId, districtId, mahallaName, calendarDay, generation }`
    - **And** no summary, anchor, or lane projection is calculated in Story 2.4.

---

## Tasks / Subtasks

- [ ] **Task 1: Relational Schema & Database Migrations (AC: 1, 8, 10, 16)**
  - [ ] 1.1 Create `apps/backend/src/adapters/db/schema/topics.ts` with `topics` table:
    - Columns: `id` (`top_<uuid>`), `districtId` (FK `districts.id` with `onDelete: 'cascade'`), `mahallaName`, `calendarDay`, `primaryLane`, `status` (`'ACTIVE' | 'ARCHIVED'`), `latestRelevantEvidenceTimestamp`, `retentionExpiresAt`, `requiredDerivedGeneration`, `appliedDerivedGeneration`, `createdAt`, `updatedAt`.
    - Indices: `topics_district_mahalla_day_idx` on `(districtId, mahallaName, calendarDay)` and `topics_district_status_idx` on `(districtId, status)`.
  - [ ] 1.2 Create `apps/backend/src/adapters/db/schema/accepted-evidence.ts` with `acceptedEvidence` table:
    - Columns: `id` (`evi_<uuid>`), `topicId` (FK `topics.id` with `onDelete: 'restrict'`), `districtId` (FK `districts.id` with `onDelete: 'cascade'`), `mahallaName`, `calendarDay`, `intakeRecordId` (FK `telegramIntakeRecords.id`), `telegramChatId`, `telegramMessageId`, `telegramUserId`, `originalTimestamp`, `verbatimText`, `contentType`, `userMetadata` (jsonb), `replyMetadata` (jsonb), `aiOperationId` (FK `aiOperations.id` with `onDelete: 'set null'`), `createdAt`.
    - Indices:
      - `uniqueIndex('accepted_evidence_district_chat_msg_idx').on(table.districtId, table.telegramChatId, table.telegramMessageId)`
      - `index('accepted_evidence_district_mahalla_day_idx').on(table.districtId, table.mahallaName, table.calendarDay)`
      - `index('accepted_evidence_topic_id_idx').on(table.topicId)`
      - `index('accepted_evidence_ordering_idx').on(table.districtId, table.mahallaName, table.calendarDay, table.originalTimestamp, table.telegramMessageId, table.id)`
  - [ ] 1.3 Update `apps/backend/src/adapters/db/schema/ai.ts` to register `defaultTopicMatchingProfile` (`prof_match_2026_08_v1`) and include in `ensureDefaultAiProfiles`.
  - [ ] 1.4 Re-export new tables in `apps/backend/src/adapters/db/schema/index.ts`.
  - [ ] 1.5 Generate and apply SQL migrations via Drizzle Kit (`pnpm --filter backend db:generate` & `pnpm --filter backend db:migrate`).

- [ ] **Task 2: AI Contracts & Topic Matching Evaluator (AC: 2, 3, 4, 5, 6, 7, 11, 14)**
  - [ ] 2.1 Create `apps/backend/src/modules/ai/topic-matching-contracts.ts`:
    - `TopicMatchingDecisionEnum = z.enum(['MATCH_EXISTING_TOPIC', 'NEW_TOPIC', 'UNASSIGNABLE_VAGUE'])`.
    - `TopicMatchingResultSchema` with strict `.nullable()` fields and runtime `.refine()` consistency validation.
    - Export `TopicMatchingInput`, `TopicMatchingOutput`, and `defaultTopicMatchingProfile`.
  - [ ] 2.2 Create `apps/backend/src/modules/topics/topic-matching-evaluator.ts` implementing `TopicMatchingEvaluator`:
    - Fast DB Direct Reply matcher `findDirectReplyTopic(db, districtId, mahallaName, calendarDay, chatId, replyToMessageId)` querying `accepted_evidence`.
    - Contextual prompt builder grouping evidence by topic and highlighting nearest earlier message in source order.
    - `evaluateTopicAssignment` method integrating with `AiGatewayPort`.
  - [ ] 2.3 Update `apps/backend/src/modules/ai/context-snapshot.ts` (`getMahallaDailySnapshot`) to select directly from `accepted_evidence` inner-joined with `topics` (selecting `topics.primaryLane as lane`) with deterministic sorting (`originalTimestamp ASC -> telegramMessageId ASC -> id ASC`).

- [ ] **Task 3: Queue & Worker Integration (AC: 1, 2, 7, 8, 10, 11, 12, 13, 15, 16, 17)**
  - [ ] 3.1 Define `TELEGRAM_TOPIC_PROJECTION_QUEUE` and `TelegramTopicProjectionJobData` in `apps/backend/src/adapters/jobs/boss-client.ts` and register in `initBossQueues`.
  - [ ] 3.2 Implement `TELEGRAM_TOPIC_ASSIGNMENT_QUEUE` worker consumer in `apps/backend/src/entrypoints/worker.ts`:
    - Gate 1 Pre-AI District Lifecycle Verification (drop cleanly if inactive).
    - Direct Reply evaluation via DB (assign immediately if valid).
    - Fallback contextual AI snapshot assembly and `evaluateTopicAssignment` execution outside DB transactions.
    - Gate 2 Pre-Commit District Lifecycle Verification (abort cleanly if inactive).
    - CAS Optimistic Concurrency verification (`STALE_SNAPSHOT` retry).
    - `withTransactionalIntake` atomic block:
      - Update existing Topic (with `requiredDerivedGeneration = requiredDerivedGeneration + 1` and 90-day retention) OR insert new Topic (`requiredDerivedGeneration = 1`, `appliedDerivedGeneration = 0`).
      - Insert `accepted_evidence` with whitelisted `userMetadata`.
      - Insert `ai_operations` and `ai_provider_attempts` (sanitized payload).
      - Sanitize `telegram_intake_records.raw_payload` and clear memory.
      - Enqueue `TELEGRAM_TOPIC_PROJECTION_QUEUE` with `{ topicId, districtId, mahallaName, calendarDay, generation }`.
    - Catch Postgres `23505` duplicate unique violations gracefully without failing the worker.

- [ ] **Task 4: Comprehensive Test Suite & Edge Case Hardening (AC: 1-17)**
  - [ ] 4.1 Unit tests for `TopicMatchingResultSchema` in `tests/unit/topic-matching-contracts.test.ts`.
  - [ ] 4.2 Unit tests for `TopicMatchingEvaluator` in `tests/unit/topic-matching-evaluator.test.ts`.
  - [ ] 4.3 Integration tests for `TELEGRAM_TOPIC_ASSIGNMENT_QUEUE` in `tests/integration/telegram-topic-assignment-worker.test.ts` covering all 28 scenarios in the Verification Matrix.
  - [ ] 4.4 Run full typecheck and test suites (`pnpm typecheck`, `pnpm --filter backend test`) ensuring 100% pass rate.

---

## Dev Notes

### Architecture Patterns & Invariants Compliance
- **AD-1 (Hexagonal Modular Monolith):** Logic lives in `modules/topics`, `modules/ai`, `modules/evidence`. Infrastructure adapters in `adapters/db`, `adapters/jobs`, `adapters/ai-providers`.
- **AD-3 (PostgreSQL & pg-boss):** Atomicity guaranteed by `withTransactionalIntake`. All mutations and downstream queue handoffs are atomic.
- **AD-5 (Deterministic Same-Day Context Snapshots):** Snapshots are assembled from `accepted_evidence` scoped by `(districtId, mahallaName, calendarDay)` and ordered deterministically.
- **AD-6 (Optimistic Concurrency & CAS Revision):** Revision advances with every evidence item. Stale in-flight work triggers `STALE_SNAPSHOT` and retries.
- **AD-7 (Topic-Derived Generations):** `topics` table manages monotonic `requiredDerivedGeneration` and `appliedDerivedGeneration` counters.
- **AD-8 (AI Gateway & Immutable Profiles):** Pinned profile `prof_match_2026_08_v1`. Schema compilation enforced via `compileProviderSchema`.
- **AD-9 (Tenant Isolation & Double Lifecycle):** Gate 1 & Gate 2 verification prevent orphaned commits or AI token consumption for inactive districts. Clean exit without retries.
- **AD-11 (Privacy-Safe Telemetry & 90-Day Retention):** Resident raw payloads sanitized on exclusion. Raw text/prompts excluded from routine logs and Audit History. Foreign key `{ onDelete: 'restrict' }` protects immutable evidence.

### Component Modifications
- **[NEW]** `apps/backend/src/adapters/db/schema/topics.ts`
- **[NEW]** `apps/backend/src/adapters/db/schema/accepted-evidence.ts`
- **[UPDATE]** `apps/backend/src/adapters/db/schema/ai.ts`
- **[UPDATE]** `apps/backend/src/adapters/db/schema/index.ts`
- **[NEW]** `apps/backend/src/modules/ai/topic-matching-contracts.ts`
- **[NEW]** `apps/backend/src/modules/topics/topic-matching-evaluator.ts`
- **[UPDATE]** `apps/backend/src/modules/ai/context-snapshot.ts`
- **[UPDATE]** `apps/backend/src/adapters/jobs/boss-client.ts`
- **[UPDATE]** `apps/backend/src/entrypoints/worker.ts`

### Testing Standards & Verification Matrix (28 Scenarios)
1. Direct Reply: same-day valid match $\rightarrow$ assigned without AI call (0 cost).
2. Direct Reply: cross-day parent $\rightarrow$ ignored, falls back to AI matching.
3. Direct Reply: cross-group parent $\rightarrow$ ignored, falls back to AI matching.
4. Direct Reply: excluded parent $\rightarrow$ ignored, falls back to AI matching.
5. Topic Seeding: empty Mahalla day + self-contained signal $\rightarrow$ seeds new Topic with primary lane.
6. Topic Seeding: empty Mahalla day + vague fragment $\rightarrow$ discarded as `UNASSIGNABLE_VAGUE`.
7. Fallback Matching: voltage drop after power cut $\rightarrow$ matches existing electricity Topic.
8. Fallback Matching: water burst with electricity topic active $\rightarrow$ creates new WATER Topic (lane isolation).
9. Fallback Matching: resident restoration notice $\rightarrow$ matches active existing Topic (preserves primary lane).
10. Fallback Matching: issue recurrence $\rightarrow$ matches active existing Topic.
11. Fallback Matching: contradictory resident reports $\rightarrow$ matches active existing Topic.
12. Fallback Matching: road / potholes with utility topic active $\rightarrow$ creates new HOKIM_RELATED Topic.
13. Vague Discard: vague fragment with no match $\rightarrow$ discarded, memory & raw payload purged.
14. Verbatim Evidence: exact Cyrillic/Uzbek emojis preserved in `accepted_evidence`.
15. Privacy: username or displayName retained, strictly no phone inferred.
16. Immutability: Telegram edit does not modify stored `accepted_evidence`.
17. Immutability: Telegram deletion does not delete stored `accepted_evidence`.
18. Retention: `retentionExpiresAt` set to exact `latestEvidenceTimestamp + 90 days` via millisecond arithmetic.
19. Context Revision: advances monotonically by 1 per evidence item.
20. Context Order: strictly `originalTimestamp ASC -> telegramMessageId ASC -> id ASC`.
21. CAS Concurrency: in-flight revision advance triggers `STALE_SNAPSHOT` and retries.
22. Lifecycle Gate 1: inactive District drops job cleanly before AI call.
23. Lifecycle Gate 2: inactive District aborts transaction cleanly before DB commit.
24. AI Traceability: `ai_operations` logged with pinned profile and attempt metrics.
25. Explicit AI Failure: provider error triggers retry without fake state commit.
26. Idempotency: duplicate delivery catches Postgres 23505 gracefully with transaction rollback.
27. Queue Handoff: `TELEGRAM_TOPIC_PROJECTION_QUEUE` enqueued atomically with `{ topicId, districtId, mahallaName, calendarDay, generation }`.
28. Story Boundary: confirms Story 2.4 does not derive summary, lane, or anchor projections.

---

## Project Structure Notes

- Alignment with unified hexagonal architecture:
  - Domain logic in `modules/topics` and `modules/ai`.
  - Persistence schema in `adapters/db/schema/topics.ts` and `adapters/db/schema/accepted-evidence.ts`.
  - Queue coordination in `adapters/jobs/boss-client.ts`.
  - Background worker in `entrypoints/worker.ts`.
- Detected variances: None.

---

## References

- [Epic 2: Authorized Telegram Signals Become Traceable Topics](file:///_bmad-output/planning-artifacts/epics/epic-2.md#Story-2.4)
- [PRD: AI Topic Analysis and Evidence (FR-7, FR-8, FR-9, FR-11, FR-12, FR-13)](file:///_bmad-output/planning-artifacts/prds/prd-Mahalla-Ovozi-2026-07-30/prd.md)
- [Architecture Spine: AD-1 through AD-11](file:///_bmad-output/planning-artifacts/architecture/architecture-Mahalla-Ovozi-2026-08-12/ARCHITECTURE-SPINE.md)
- [Story 2.3 Specification & Learnings](file:///_bmad-output/implementation-artifacts/2-3-decide-semantic-relevance-by-meaning-and-discard-non-qualifying-content.md)

---

## Dev Agent Record

### Agent Model Used

Gemini 3.7 Flash (High)

### Debug Log References

- Subagent research transcript: `file:///C:/Users/Zubaydulla/.gemini/antigravity/brain/d4c2116b-2216-475e-85c2-aebf44822311/.system_generated/logs/transcript.jsonl`

### Completion Notes List

- Story 2.4 specification created via `bmad-create-story` with 5 incremental review phases.
- Verified against all `checklist.md` disaster prevention criteria.
- Complete 28-scenario verification matrix established.

### File List

- `apps/backend/src/adapters/db/schema/topics.ts`
- `apps/backend/src/adapters/db/schema/accepted-evidence.ts`
- `apps/backend/src/adapters/db/schema/ai.ts`
- `apps/backend/src/adapters/db/schema/index.ts`
- `apps/backend/src/modules/ai/topic-matching-contracts.ts`
- `apps/backend/src/modules/topics/topic-matching-evaluator.ts`
- `apps/backend/src/modules/ai/context-snapshot.ts`
- `apps/backend/src/adapters/jobs/boss-client.ts`
- `apps/backend/src/entrypoints/worker.ts`
- `apps/backend/tests/unit/topic-matching-evaluator.test.ts`
- `apps/backend/tests/integration/telegram-topic-assignment-worker.test.ts`

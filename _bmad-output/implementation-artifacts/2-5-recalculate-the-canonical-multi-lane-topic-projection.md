---
baseline_commit: ac9f554a12cef10eaf3c4d66f2711d2efc9684c8
---

# Story 2.5: Recalculate the Canonical Multi-Lane Topic Projection

Status: ready-for-dev

<!-- Note: Validation is complete. Story specification has passed adversarial, edge-case, and compliance pre-dev review. -->

## Story

As the **Hokim**,
I want each Topic to maintain one cautious derived representation across every applicable Lane,
So that I can later see a consistent summary of the situation without duplicate Topics or unsupported claims.

## Acceptance Criteria

1. **Authoritative Scoping & District Lifecycle Gates (FR-9, FR-13, AD-9):**
   - **Given** a Topic has Accepted Evidence and `requiredDerivedGeneration` is greater than `appliedDerivedGeneration`
   - **When** derived refresh work is picked up from `TELEGRAM_TOPIC_PROJECTION_QUEUE`
   - **Then** the refresh targets that specific canonical Topic scoped strictly by District ID, Mahalla name, and Uzbekistan calendar day
   - **And** District lifecycle eligibility is rechecked at Gate 1 (pre-AI) and Gate 2 (pre-commit); inactive/ineligible districts exit cleanly without triggering pg-boss retries
   - **And** unrelated unchanged Topics in the same Mahalla are not scheduled or recomputed.

2. **Deterministic Same-Day Snapshot Context & Ordering (FR-9, AD-5):**
   - **Given** a Topic-derived refresh requires contextual AI analysis
   - **When** its canonical context snapshot is assembled via `getMahallaDailySnapshot`
   - **Then** the target Topic is evaluated against all raw Accepted Evidence from every same-day Topic in the same Mahalla
   - **And** evidence items are deterministically sorted by `originalTimestamp ASC` $\rightarrow$ `telegramMessageId ASC` $\rightarrow$ `id ASC`
   - **And** the target Topic and its own Accepted Evidence are explicitly identifiable in the prompt/input
   - **And** RAG, vector retrieval, summaries, recent windows, top-K selection, cross-day memory, or silent truncation do not replace the complete required context.

3. **Out-of-Order Generation Drops & Monotonicity (FR-11, AD-7):**
   - **Given** a projection job arrives for generation $N$
   - **When** inspected against the current Topic record in PostgreSQL
   - **Then** if `N <= topic.appliedDerivedGeneration`, the job is dropped cleanly as already applied or superseded
   - **And** no AI provider call is executed and no database write occurs.

4. **Generation Coalescing to Latest Required State (FR-11, AD-7):**
   - **Given** new Accepted Evidence is committed to the target Topic while a projection refresh is pending or in flight (advancing `requiredDerivedGeneration` to $N+k$)
   - **When** the projection worker processes the target Topic
   - **Then** the refresh evaluates the newest complete Accepted Evidence snapshot
   - **And** pending intermediate generations coalesce to the newest required state without dropping evidence or requiring separate executions.

5. **Cautious Uzbek Cyrillic Summaries & Disagreement Preservation (FR-11, NFR-8):**
   - **Given** Accepted Evidence contains reports, claims, outage updates, voltage fluctuations, disagreement, contradiction, recurrence, or restoration notices
   - **When** the Topic summary is derived by AI
   - **Then** the summary is concise Uzbek Cyrillic (1-3 sentences) with cautious attribution (e.g. *"Маҳалла аҳолиси хабарига кўра..."*)
   - **And** resident statements remain reported information rather than verified facts
   - **And** disagreement, contradiction, recurrence, restoration, and changing accounts are preserved rather than flattened into an unsupported single certainty
   - **And** reported restoration (e.g. *"chiroq yondi"*) is described as reported, never converted into a verified case resolution, and does not invent Hokim recommendations, urgency, sentiment, or required action.

6. **Canonical Multi-Lane Derivation & Primary Lane Immutability (FR-10, FR-11):**
   - **Given** a Topic's Accepted Evidence supports multiple municipal or governance concerns
   - **When** Lane membership is derived
   - **Then** the projection outputs a non-empty subset of valid Lanes among `WATER`, `ELECTRICITY`, `GAS`, `WASTE`, `HOKIM_RELATED` (or Cyrillic equivalents `Сув`, `Электр`, `Газ`, `Чиқинди`, `Ҳокимга оид`)
   - **And** the canonical Topic's initial `primaryLane` remains immutable in `topics` table
   - **And** Lane membership never creates a second Topic identity or duplicate Accepted Evidence
   - **And** a Topic may be Hokim-only (`['HOKIM_RELATED']`) or overlap Hokim-related with one or more service Lanes.

7. **Evidence-Bound Anchor Selection & Vague Fragment Rejection (FR-11, FR-12):**
   - **Given** a Topic has multiple Accepted Evidence items
   - **When** its anchor is derived
   - **Then** `anchorEvidenceId` selects the latest self-contained meaningful evidence item belonging strictly to the target Topic
   - **And** a newer vague fragment (e.g. *"Bizda ham"*) or claimed resolution does not replace a meaningful anchor
   - **And** evidence from another same-day Topic cannot become the target Topic's anchor.

8. **Evidence-Bound Latest Meaningful Activity Timestamp (FR-11, NFR-8):**
   - **Given** latest meaningful activity is projected
   - **When** its timestamp is derived
   - **Then** `latestMeaningfulActivityTimestamp` resolves strictly to the `originalTimestamp` of an Accepted Evidence item belonging to that target Topic
   - **And** retry time, worker time, AI completion time, Telegram edit time, or dashboard refresh time cannot become that activity timestamp.

9. **Cautious Attribution & Privacy Invariants (FR-11, FR-12, AD-11):**
   - **Given** attribution is derived
   - **When** same-day Mahalla context aids interpretation
   - **Then** attribution uses cautious neutral phrasing or permitted Telegram username/display name
   - **And** phone numbers are never inferred, reconstructed, or stored
   - **And** the operation cannot invent people, organizations, or authority relationships absent from evidence.

10. **AI Gateway Traceability & Pinned Profile Boundary (FR-13, AD-8):**
    - **Given** a Topic projection operation executes
    - **When** prepared for the AI gateway
    - **Then** it creates a logical operation in `ai_operations` pinned to profile `prof_proj_2026_08_v1`
    - **And** captures `targetId = `${topicId}:${generation}`` (scoped by generation to satisfy composite uniqueness `(districtId, operationType, targetId)` and preserve full generation history), `operationType = 'TOPIC_DERIVED_PROJECTION'`, `contextRevision`, and `snapshotFingerprint`
    - **And** every provider attempt is recorded in `ai_provider_attempts` with duration, tokens, cost, and sanitized error codes
    - **And** provider calls execute outside database transactions.

11. **Explicit Semantic & Structural Output Validation (FR-13, AD-8):**
    - **Given** AI returns a structured output payload
    - **When** semantic and structural validation runs via `TopicProjectionResultSchema`
    - **Then** `lanes` must be a non-empty subset of `QualifyingLaneEnum` containing at least 1 lane
    - **And** `is_hokim_related` must be `true` if and only if `HOKIM_RELATED` is present in `lanes`
    - **And** `anchor_evidence_id` must match an actual Accepted Evidence record belonging to the target Topic
    - **And** `latest_meaningful_activity_timestamp` must match the `originalTimestamp` of an Accepted Evidence record belonging to the target Topic
    - **And** `summary` must contain Uzbek Cyrillic text and be non-empty
    - **And** any validation failure aborts the commit and triggers a typed error (`INVALID_OUTPUT_SEMANTICS`).

12. **Atomic Projection Commit & CAS Generation Advancement (FR-11, AD-3, AD-7):**
    - **Given** AI output passes structural and semantic validation
    - **And** the target District remains active
    - **When** the database transaction executes within `withTransactionalIntake`
    - **Then** the projection is upserted into `topic_projections` (1:1 with `topics`) via `onConflictDoUpdate` targeting `topicProjections.topicId`
    - **And** `topics.appliedDerivedGeneration` is updated to the committed generation ($N$)
    - **And** `topics.updatedAt` is set to `new Date()`
    - **And** `ai_operations` status is updated to `'COMPLETED'` atomically in the same transaction.

13. **Stale Generation & In-Flight Evidence Race Rejection (FR-9, AD-6, AD-7):**
    - **Given** generation $N$ was evaluated by AI
    - **When** the worker enters the commit transaction
    - **Then** if a concurrent worker has already advanced `topics.appliedDerivedGeneration >= N`, the transaction drops the stale projection without overwriting newer state
    - **And** no partial derived fields are committed.

14. **Strict Relational Isolation & Evidence Immutability (FR-10, FR-12, AD-4):**
    - **Given** Topic-derived projection commits successfully
    - **When** `topic_projections` is written
    - **Then** it changes only the approved derived projection fields and generation status
    - **And** it cannot create, delete, reassign, or alter any `accepted_evidence` record
    - **And** it cannot change `topics.id` or `topics.primaryLane`.

15. **Explicit AI Failure Handling & pg-boss Retry Policy (FR-13, AD-3, AD-8):**
    - **Given** the AI provider encounters timeout, rate limit, refusal, server error, or invalid JSON syntax/semantics
    - **When** Topic projection cannot produce a valid complete projection
    - **Then** the job fails explicitly and triggers pg-boss retry with exponential backoff
    - **And** `appliedDerivedGeneration` does not advance
    - **And** no partial or invented summary/lanes become authoritative.

16. **Duplicate Delivery & Redelivery Idempotency (FR-6, AD-3):**
    - **Given** pg-boss redelivers the same projection job or duplicate workers execute concurrently
    - **When** processing repeats
    - **Then** duplicate execution produces identical idempotent upsert in `topic_projections`
    - **And** cannot create duplicate Topic identities or multiple authoritative projection rows.

17. **Prospective Profile Activation & Traceability Lineage (FR-13, AD-8):**
    - **Given** a new AI profile version is activated in `ai_profiles`
    - **When** new projection jobs execute
    - **Then** they use the active profile version
    - **And** older committed projections remain traceable to their historical profile version without retroactive re-evaluation.

18. **Privacy-Safe Telemetry & Secret Boundary (FR-13, AD-11):**
    - **Given** Topic projection succeeds, retries, drops, or fails
    - **When** structured JSON logs and metrics are emitted
    - **Then** logs capture topicId, districtId, generation, contextRevision, duration, token counts, cost, and outcome
    - **And** raw Accepted Evidence text, full AI prompts, resident identities, credentials, and secrets remain excluded from routine logs, metrics, and Audit History.

19. **Story Boundary Isolation (FR-14, FR-15, FR-17):**
    - **Given** Story 2.5 is implemented and verified
    - **When** tests execute
    - **Then** tests prove Story 2.5 calculates and persists canonical Topic projections without implementing dashboard rendering (Epic 3) or retention purge jobs (Story 2.6).

---

## Tasks / Subtasks

- [ ] **Task 1: Relational Schema & Database Migrations (AC: 1, 6, 12, 14)**
  - [ ] 1.1 Create `apps/backend/src/adapters/db/schema/topic-projections.ts`:
    - Define `topicProjections` table: `id` (`prj_<uuid>`), `topicId` (FK `topics.id` with `onDelete: 'cascade'`), `districtId` (FK `districts.id` with `onDelete: 'cascade'`), `mahallaName`, `calendarDay`, `summary`, `lanes` (`jsonb('lanes').$type<QualifyingLane[]>().notNull()`), `primaryLane`, `anchorEvidenceId` (FK `acceptedEvidence.id` with `onDelete: 'restrict'`), `anchorQuote`, `latestMeaningfulActivityTimestamp`, `attribution`, `isHokimRelated` (`boolean`), `generation` (`integer`), `aiProfileId` (FK `aiProfiles.id`), `aiOperationId` (FK `aiOperations.id` with `onDelete: 'set null'`), `createdAt`, `updatedAt`.
    - Indices: `uniqueIndex('topic_projections_topic_id_idx').on(table.topicId)`, `index('topic_projections_district_day_idx').on(table.districtId, table.calendarDay)`, `index('topic_projections_district_mahalla_day_idx').on(table.districtId, table.mahallaName, table.calendarDay)`.
  - [ ] 1.2 Update `apps/backend/src/adapters/db/schema/ai.ts` to define `defaultTopicProjectionProfile` (`prof_proj_2026_08_v1`) and include in `ensureDefaultAiProfiles`.
  - [ ] 1.3 Re-export `topicProjections` in `apps/backend/src/adapters/db/schema/index.ts`.
  - [ ] 1.4 Generate and apply SQL migration via Drizzle Kit (`pnpm --filter backend db:generate` & `pnpm --filter backend db:migrate`).

- [ ] **Task 2: AI Contracts & Topic Projection Evaluator (AC: 2, 5, 6, 7, 8, 9, 10, 11)**
  - [ ] 2.1 Create `apps/backend/src/modules/ai/topic-projection-contracts.ts`:
    - Export `TopicProjectionResultSchema` with Zod validation for `summary`, `lanes` (`QualifyingLaneEnum[]`), `anchor_evidence_id`, `anchor_quote`, `latest_meaningful_activity_timestamp`, `attribution`, `is_hokim_related`.
    - Add `.refine()` rule: `is_hokim_related` must match `lanes.includes('HOKIM_RELATED')`.
    - Export `TopicProjectionInput`, `TopicProjectionOutput`, and helper `isUzbekCyrillic(text: string): boolean`.
  - [ ] 2.2 Create `apps/backend/src/modules/topics/topic-projection-evaluator.ts` implementing `TopicProjectionEvaluator`:
    - Build contextual prompt formatting all same-day Mahalla evidence with explicit target Topic demarcation.
    - Implement `evaluateTopicProjection` integrating with `AiGatewayPort` (`operationType: 'TOPIC_DERIVED_PROJECTION'`).
    - Implement post-generation semantic guardrails:
      - Verify `anchor_evidence_id` belongs to target Topic evidence.
      - Verify `latest_meaningful_activity_timestamp` matches an evidence item from target Topic.
      - Verify `lanes` includes target Topic's immutable `primaryLane`.
      - Verify `summary` contains Uzbek Cyrillic text.

- [ ] **Task 3: Queue Consumer & Worker Integration (AC: 1, 3, 4, 10, 12, 13, 14, 15, 16, 18)**
  - [ ] 3.1 Implement `TELEGRAM_TOPIC_PROJECTION_QUEUE` worker consumer in `apps/backend/src/entrypoints/worker.ts`:
    - Gate 1 Pre-AI District Lifecycle Verification (drop cleanly if inactive).
    - Target Topic lookup & out-of-order drop check (`generation <= topic.appliedDerivedGeneration` -> drop).
    - Deterministic snapshot retrieval via `getMahallaDailySnapshot`.
    - `TopicProjectionEvaluator.evaluateTopicProjection` execution outside DB transaction.
    - Gate 2 Pre-Commit District Lifecycle Verification (abort cleanly if inactive).
    - Atomic `withTransactionalIntake` transaction block:
      - Row-lock topic: `SELECT * FROM topics WHERE id = topicId FOR UPDATE`.
      - CAS stale generation check (`currentTopic.appliedDerivedGeneration >= generation` -> exit).
      - Upsert into `topic_projections` table via `onConflictDoUpdate` on `topicProjections.topicId`.
      - Update `topics.appliedDerivedGeneration = generation` and `topics.updatedAt = new Date()`.
      - Insert `ai_operations` (with `targetId = `${topicId}:${generation}``) and `ai_provider_attempts` records.
    - Privacy-safe structured logging (`event: 'TELEGRAM_TOPIC_PROJECTION_COMMITTED'`).

- [ ] **Task 4: Comprehensive Test Suite & Edge-Case Hardening (AC: 1-19)**
  - [ ] 4.1 Unit tests for `TopicProjectionResultSchema` and `isUzbekCyrillic` validator in `tests/topic-projection-evaluator.test.ts`.
  - [ ] 4.2 Unit tests for `TopicProjectionEvaluator` covering prompt assembly, multi-lane derivation, anchor validation, and semantic error cases in `tests/topic-projection-evaluator.test.ts`.
  - [ ] 4.3 Integration tests for `TELEGRAM_TOPIC_PROJECTION_QUEUE` worker consumer in `tests/worker-topic-projection.test.ts` covering all 28 scenarios in the Verification Matrix.
  - [ ] 4.4 Run full typecheck and test verification (`pnpm typecheck`, `pnpm --filter backend test`, `pnpm build`) verifying 100% pass rate.

---

## Dev Notes

### Architecture Patterns & Invariants Compliance
- **AD-1 (Hexagonal Modular Monolith):** Domain contracts in `modules/ai` and `modules/topics`; persistence in `adapters/db`; queue infrastructure in `adapters/jobs` and `entrypoints/worker.ts`.
- **AD-3 (PostgreSQL & pg-boss):** Atomicity guaranteed by `withTransactionalIntake`. Mutations to `topic_projections`, `topics.appliedDerivedGeneration`, and `ai_operations` execute in one database transaction.
- **AD-5 (Deterministic Same-Day Context Snapshots):** Evaluator consumes `getMahallaDailySnapshot` scoped by `(districtId, mahallaName, calendarDay)` and sorted deterministically (`originalTimestamp ASC -> telegramMessageId ASC -> id ASC`).
- **AD-6 (Optimistic Concurrency & Stale Work Rejection):** Stale generation or in-flight collision drops safely without partial state commits.
- **AD-7 (Topic-Derived Generations & Coalesced Refresh):** Monotonic generation progression. Only changed topics recalculate. In-flight coalescing evaluates against the newest complete context.
- **AD-8 (AI Gateway & Immutable Profiles):** Pinned profile `prof_proj_2026_08_v1` in `ai_profiles`. Structured output enforced via Zod and `compileProviderSchema`.
- **AD-9 (Tenant Isolation & Double Lifecycle):** Gate 1 and Gate 2 verify District active status. Inactive districts exit cleanly with zero retry pollution.
- **AD-11 (Privacy-Safe Telemetry & Secret Boundary):** Resident text, complete prompts, and credentials excluded from logs and traces. Opaque IDs and operational metrics only.

### Component Modifications
- **[NEW]** `apps/backend/src/adapters/db/schema/topic-projections.ts`
- **[UPDATE]** `apps/backend/src/adapters/db/schema/ai.ts`
- **[UPDATE]** `apps/backend/src/adapters/db/schema/index.ts`
- **[NEW]** `apps/backend/src/modules/ai/topic-projection-contracts.ts`
- **[NEW]** `apps/backend/src/modules/topics/topic-projection-evaluator.ts`
- **[UPDATE]** `apps/backend/src/entrypoints/worker.ts`
- **[NEW]** `apps/backend/tests/topic-projection-evaluator.test.ts`
- **[NEW]** `apps/backend/tests/worker-topic-projection.test.ts`

### Testing Standards & Verification Matrix (28 Scenarios)

1. **Basic Projection:** Valid single-evidence topic $\rightarrow$ creates projection record in `topic_projections` with `appliedDerivedGeneration = 1`.
2. **Multi-Lane Derivation (Water + Electricity):** Issue reporting water pump failure due to power cut $\rightarrow$ derived lanes contain `['WATER', 'ELECTRICITY']`.
3. **Hokim-Only Projection:** Governance complaint regarding road / mahalla leadership $\rightarrow$ derived lanes contain `['HOKIM_RELATED']` and `isHokimRelated = true`.
4. **Overlapping Hokim + Service Lane:** Water outage neglected for weeks with Hokim escalation $\rightarrow$ derived lanes contain `['WATER', 'HOKIM_RELATED']` and `isHokimRelated = true`.
5. **Primary Lane Immutability:** Multi-lane derivation keeps original `topics.primaryLane` unchanged in `topics` table.
6. **Uzbek Cyrillic Summary:** Summary generated in authentic Uzbek Cyrillic (e.g. *"Маҳаллада электр таъминоти узилганлиги хабар қилинди"*).
7. **Disagreement Preservation:** Multiple residents reporting conflicting outage details $\rightarrow$ summary preserves reported disagreement rather than single certainty.
8. **Restoration Handling:** Resident reports *"chiroq yondi"* $\rightarrow$ summary describes restoration as reported without asserting authoritative resolution.
9. **Recurrence Handling:** Resident reports *"yana o'chdi"* $\rightarrow$ summary reflects recurring issue.
10. **Anchor Selection (Self-Contained vs Vague):** Initial detailed report followed by vague *"Bizda ham"* $\rightarrow$ anchor selects initial detailed report.
11. **Anchor Selection (Evidence-Bound ID):** `anchorEvidenceId` strictly references an existing evidence ID from the target Topic.
12. **Latest Meaningful Activity Timestamp:** `latestMeaningfulActivityTimestamp` strictly matches `originalTimestamp` of target Topic evidence.
13. **Cautious Attribution:** Attribution reflects neutral citizen reporting without inferring personal phone numbers.
14. **Out-of-Order Drop (Old Generation):** Job generation 1 arrives when `appliedDerivedGeneration = 2` $\rightarrow$ dropped cleanly (0 AI calls, 0 DB writes).
15. **Generation Coalescing:** Job generation 1 processed while `requiredDerivedGeneration = 3` $\rightarrow$ evaluates complete 3-evidence snapshot and advances `appliedDerivedGeneration = 3`.
16. **Stale Generation Commit Collision:** Worker finishes AI call for generation 1, but another worker committed generation 2 in the meantime $\rightarrow$ CAS aborts commit cleanly.
17. **Deterministic Snapshot Ordering:** Evidence fed to AI evaluator strictly ordered by `originalTimestamp ASC -> telegramMessageId ASC -> id ASC`.
18. **Same-Day Context Isolation:** Target Topic evaluated in context of same Mahalla same-day evidence without cross-day or cross-district leakage.
19. **Lifecycle Gate 1 (Pre-AI):** Inactive District drops job cleanly before AI invocation without retry pollution.
20. **Lifecycle Gate 2 (Pre-Commit):** Inactive District aborts transaction before DB commit.
21. **AI Traceability:** `ai_operations` logged with `pinned_profile_id = 'prof_proj_2026_08_v1'` and provider attempt metrics.
22. **AI Provider Timeout:** Gateway timeout triggers pg-boss retry with exponential backoff; `appliedDerivedGeneration` does not advance.
23. **AI Provider Rate Limit:** Gateway 429 triggers retry with backoff.
24. **AI Invalid Schema Output:** Malformed JSON from provider triggers retry without committing fake data.
25. **Semantic Validation Failure (Empty Lanes):** AI returns empty `lanes: []` $\rightarrow$ rejected by schema validation; fails explicitly.
26. **Semantic Validation Failure (Foreign Anchor):** AI returns `anchor_evidence_id` belonging to another Topic $\rightarrow$ evaluator rejects with `INVALID_OUTPUT_SEMANTICS`.
27. **Duplicate Delivery Idempotency:** Same projection job delivered twice $\rightarrow$ upserts projection idempotently without duplicate rows.
28. **Story Boundary Verification:** Confirms Story 2.5 does not render Hokim dashboard (Epic 3) or purge expired topics (Story 2.6).

---

## Project Structure Notes

- Relational Schema: `apps/backend/src/adapters/db/schema/topic-projections.ts`
- AI Contracts: `apps/backend/src/modules/ai/topic-projection-contracts.ts`
- Domain Evaluator: `apps/backend/src/modules/topics/topic-projection-evaluator.ts`
- Worker Consumer: `apps/backend/src/entrypoints/worker.ts`
- Tests: `apps/backend/tests/topic-projection-evaluator.test.ts`, `apps/backend/tests/worker-topic-projection.test.ts`

### References
- [Architecture Spine](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/architecture/architecture-Mahalla-Ovozi-2026-08-12/ARCHITECTURE-SPINE.md#AD-7)
- [Epic 2: Story 2.5](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/epics/epic-2.md#Story-2.5)
- [PRD FR-9, FR-10, FR-11, FR-13](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/prds/prd-Mahalla-Ovozi-2026-07-30/prd.md)
- [Story 2.4 Specification](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/implementation-artifacts/2-4-assign-relevant-signals-to-same-day-topics-and-commit-accepted-evidence.md)

---

## Dev Agent Record

### Agent Model Used
Gemini 3.7 Flash (High)

### Debug Log References
- Pre-dev validation completed against `checklist.md` across 5 quality layers.
- Verified schema types, pg-boss 10.x queue handling, and Zod output contract compilation.

### Completion Notes List
- Authored comprehensive Story 2.5 specification including 19 Acceptance Criteria, 4 Tasks/Subtasks, Architecture Guardrails, and 28-scenario Verification Matrix.
- Status transitioned to `ready-for-dev`.

### File List
- `_bmad-output/implementation-artifacts/2-5-recalculate-the-canonical-multi-lane-topic-projection.md`

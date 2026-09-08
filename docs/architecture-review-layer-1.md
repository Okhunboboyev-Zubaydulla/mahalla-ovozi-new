# Architecture Review: Layer 1 (AI Intake, Topic Resolution, and Job Pipeline)

**Scope**: Layer 1 Hotspot (`apps/backend/src/modules/ai/`, `modules/topics/`, `modules/telegram-intake/`, and `adapters/jobs/`)  
**Design Vocabulary**: `module`, `interface`, `depth`, `seam`, `adapter`, `leverage`, `locality`  
**Principles Applied**: The Deletion Test; "The interface is the test surface"; "One adapter = hypothetical seam, two = real"  
**Domain Glossary**: Defined in [`CONTEXT.md`](../CONTEXT.md)

---

## Executive Summary

Commit history across the last 10 revisions shows that the system's primary friction, regressions, and bug fixes are concentrated in the ingestion-to-clustering pipeline:
1. `apps/backend/src/modules/topics/jobs/topic-assignment-job-handler.ts` (678 LOC) has become a monolithic worker where queue infrastructure, concurrency rules, AI execution, and transactional entity resolution are conflated.
2. `apps/backend/src/adapters/jobs/job-types.ts` leaks raw Telegram wire format parser functions (`extractTelegramUserMetadata`) into the shared queue contract layer.
3. System prompt strings and domain snapshots are fragmented between `modules/ai` and `modules/topics` in an asymmetrical layout.
4. Several modules expose shallow data-cleaner wrappers that fail the deletion test.

Below are 4 refactoring candidates evaluated under the codebase-design discipline to turn shallow, scattered logic into deep modules.

---

## Candidate 1: Deepen the Topic Assignment Module from Worker Scaffolding

- **Recommendation Strength**: **Strong**
- **Files Involved**:
  - [`apps/backend/src/modules/topics/jobs/topic-assignment-job-handler.ts`](../apps/backend/src/modules/topics/jobs/topic-assignment-job-handler.ts) (678 LOC)
  - [`apps/backend/src/modules/topics/topic-matching-evaluator.ts`](../apps/backend/src/modules/topics/topic-matching-evaluator.ts)
  - [`apps/backend/src/modules/topics/topic-matching-resolver.ts`](../apps/backend/src/modules/topics/topic-matching-resolver.ts)
  - [`apps/backend/src/modules/ai/context-snapshot.ts`](../apps/backend/src/modules/ai/context-snapshot.ts)

### Problem
The Topic Assignment logic currently has no standalone domain module interface—the pg-boss job handler *is* the entire implementation. In 678 lines, the worker directly executes:
- Gate 1 and Gate 2 duplicate SQL queries checking District lifecycle status.
- Direct reply resolution against raw database records.
- Mahalla daily snapshot retrieval, cryptographic fingerprinting, and verification.
- AI Gateway invocation outside transaction boundaries.
- CAS optimistic concurrency assertion (`assertSnapshotRevision`, `StaleSnapshotRevisionError`).
- Dynamic fallback entity resolution via `resolveTargetTopic`.
- Multi-table transactional SQL mutation (`aiOperations`, `aiProviderAttempts`, `acceptedEvidence`, `topics`).
- Enqueueing downstream topic projection jobs.

Because all of this sits inside a pg-boss worker, the module is shallow: its business rules cannot be tested or invoked without spinning up queue workers and mocking queue harness plumbing. Testing the worker requires extensive mock gymnastics rather than testing the domain interface directly.

### The Deletion Test
If you delete `topic-assignment-job-handler.ts`, you do not just delete queue plumbing—you destroy the core topic assignment engine of the product. The complexity is trapped inside the adapter.

### Solution
Extract a deep domain module (`TopicAssignmentCoordinator` or `TopicIntakeModule`) that owns the entire state transition:
- **Interface**: A lean, single-entry function:
  `assignEvidenceToTopic(db, pool, input): Promise<TopicAssignmentOutcome>`
- **Internalized Depth**:
  - CAS snapshot revision checking and optimistic concurrency retry logic.
  - Direct reply bypass vs. AI snapshot matching.
  - Multi-tier entity resolution fallback (`topic-matching-resolver`).
  - Transactional persistence of evidence, topic counters, and projection triggers.
- **The Worker's New Role**: `topic-assignment-job-handler.ts` shrinks to a ~40-line shallow queue adapter whose sole responsibility is deserializing the pg-boss job, calling the deep domain module, and returning completion or triggering retry.

### Benefits
- **Locality**: All topic assignment invariants (CAS retries, revision checks, entity resolution, evidence linking) reside in one cohesive domain module.
- **Leverage**: Complex multi-step database and AI orchestration is hidden behind a simple function signature.
- **Testability ("The interface is the test surface")**: Topic assignment can be thoroughly verified through integration tests using a real test database connection without instantiating pg-boss queue workers.

### Structural Comparison
```
[Current: Shallow Worker / Leaked Complexity]
pg-boss queue -> topic-assignment-job-handler.ts (678 LOC)
                   ├─ duplicate district lifecycle SQL checks
                   ├─ snapshot assembly & fingerprinting
                   ├─ AI gateway evaluation call
                   ├─ CAS optimistic concurrency comparison
                   ├─ multi-tier topic resolution
                   ├─ transactional SQL inserts/updates
                   └─ projection job enqueueing

[Proposed: Deep Module Behind Clean Seam]
pg-boss queue -> topic-assignment-job-handler.ts (~40 LOC adapter)
                   │
                   ▼ (lean seam)
TopicAssignmentModule (Deep Domain Module)
  ├─ hides: District lifecycle verification
  ├─ hides: CAS revision validation & conflict detection
  ├─ hides: Direct reply bypass vs AI evaluation
  ├─ hides: Algorithmic entity resolution
  └─ hides: Transactional DB persistence
```

---

## Candidate 2: Encapsulate Telegram Wire Schemas Behind the Ingestion Seam

- **Recommendation Strength**: **Strong**
- **Files Involved**:
  - [`apps/backend/src/adapters/jobs/job-types.ts`](../apps/backend/src/adapters/jobs/job-types.ts)
  - [`apps/backend/src/modules/telegram-intake/jobs/burst-debounce-job-handler.ts`](../apps/backend/src/modules/telegram-intake/jobs/burst-debounce-job-handler.ts)
  - [`apps/backend/src/modules/telegram-intake/telegram-content-qualification.ts`](../apps/backend/src/modules/telegram-intake/telegram-content-qualification.ts)

### Problem
`job-types.ts` is the contract layer that pg-boss adapters and domain workers share. However, lines 48–86 of `job-types.ts` contain a runtime parser function: `extractTelegramUserMetadata`. This function inspects raw Telegram wire payloads (`payload.message`, `payload.channel_post`, `payload.edited_message`, `payload.from`, etc.).

Simultaneously, `burst-debounce-job-handler.ts` directly reads `rec.rawPayload` to parse Telegram `edit_date` integers. Telegram wire structures leak into the queue contract and across multiple job workers.

### The Deletion Test
Deleting `extractTelegramUserMetadata` from `job-types.ts` would break queue consumers because wire-parsing logic was misplaced into an interface definition file.

### Solution
- Move wire-level parsing into the Telegram intake adapter seam (`adapters/telegram/` or `modules/telegram-intake/telegram-wire-parser.ts`).
- Normalize citizen identity and edit timestamps during initial HTTP intake webhook persistence.
- Keep `job-types.ts` strictly declarative (interfaces and queue names only, zero executable wire parsing).

### Benefits
- **Locality**: Any changes to Telegram Bot API update shapes (e.g., forum topics, stories, business messages) affect only the intake parser adapter.
- **Leverage**: Queue payloads carry clean, strongly-typed domain metadata (`SenderProfileMetadata`, `originalTimestamp`, `editTimestamp`) rather than forcing downstream workers to re-parse raw JSON payloads.

### Structural Comparison
```
[Current: Wire Leakage into Queue Layer]
Telegram Webhook -> telegram-intake
                      │
                      ▼
            pg-boss job-types.ts (contains extractTelegramUserMetadata runtime logic!)
                      │
                      ▼
            burst-debounce-job-handler.ts (manually inspects rawPayload.edited_message.edit_date)

[Proposed: Pure Queue Contract & Dedicated Ingestion Seam]
Telegram Webhook -> TelegramWireParser (Deep Adapter)
                      │ (extracts sender profile, timestamps, reply metadata once)
                      ▼
                    Database (Normalized Intake Record)
                      │
                      ▼
            pg-boss job-types.ts (Pure Types & Queue Names only)
                      │
                      ▼
            burst-debounce-job-handler.ts (Consumes typed metadata directly)
```

---

## Candidate 3: Cohesively Co-locate Evaluator Prompts and Municipal Context Snapshots

- **Recommendation Strength**: **Worth exploring**
- **Files Involved**:
  - [`apps/backend/src/modules/ai/ai-config.ts`](../apps/backend/src/modules/ai/ai-config.ts)
  - [`apps/backend/src/modules/ai/semantic-relevance-evaluator.ts`](../apps/backend/src/modules/ai/semantic-relevance-evaluator.ts)
  - [`apps/backend/src/modules/topics/topic-matching-evaluator.ts`](../apps/backend/src/modules/topics/topic-matching-evaluator.ts)
  - [`apps/backend/src/modules/topics/topic-projection-evaluator.ts`](../apps/backend/src/modules/topics/topic-projection-evaluator.ts)
  - [`apps/backend/src/modules/ai/context-snapshot.ts`](../apps/backend/src/modules/ai/context-snapshot.ts)

### Problem
There is structural asymmetry across the three evaluators:
1. `SEMANTIC_RELEVANCE_SYSTEM_PROMPT` is isolated inside `ai-config.ts`.
2. `TOPIC_MATCHING_SYSTEM_PROMPT` is defined inline in `modules/topics/topic-matching-evaluator.ts`.
3. `TOPIC_PROJECTION_SYSTEM_PROMPT` is defined inline in `modules/topics/topic-projection-evaluator.ts`.
4. `context-snapshot.ts` is housed under `modules/ai/`, yet it primarily executes SQL queries on `accepted_evidence`, `topics`, and `topic_projections`. The topic module imports its own domain snapshot representation from the AI module.

### Solution
- Standardize prompt placement: either give each evaluator its own dedicated prompt definition file co-located with the evaluator, or centralize prompt templates in a dedicated prompt registry.
- Relocate `context-snapshot.ts` to the topic domain (`modules/topics/context-snapshot.ts`), since a Mahalla daily snapshot represents the civic state of topics and evidence, not an AI utility.

### Benefits
- **Locality**: When tuning prompts and evaluating matching schemas, developers look in one consistent place rather than guessing whether a prompt is in `ai-config.ts` or inline in the evaluator.
- **Seam Clarity**: Eliminates circular-feeling dependencies where `modules/topics` depends on `modules/ai` for its own database snapshot queries.

---

## Candidate 4: Consolidate Shallow District Data Cleaners into a Declarative Seam

- **Recommendation Strength**: **Speculative**
- **Files Involved**:
  - [`apps/backend/src/modules/telegram-intake/telegram-intake-data-cleaner.ts`](../apps/backend/src/modules/telegram-intake/telegram-intake-data-cleaner.ts) (19 LOC)
  - [`apps/backend/src/modules/ai/ai-data-cleaner.ts`](../apps/backend/src/modules/ai/ai-data-cleaner.ts) (37 LOC)
  - [`apps/backend/src/modules/topics/topics-data-cleaner.ts`](../apps/backend/src/modules/topics/topics-data-cleaner.ts) (31 LOC)
  - [`apps/backend/src/modules/subscriptions/ports/district-data-cleaner.ts`](../apps/backend/src/modules/subscriptions/ports/district-data-cleaner.ts)

### Problem
Each of these files is a 20–35 line factory whose implementation simply executes 1–3 `tx.delete(table).where(eq(table.districtId, districtId))`. While they maintain topological FK deletion order, scattering these tiny files across 8 modules creates file bloat without providing functional depth.

### The Deletion Test
Deleting these files and placing a declarative table array in the district deletion orchestrator would eliminate ~10 files while making the deletion order instantly readable in one place.

### Trade-off / Why Speculative
These files are already working, small, and rarely modified. The leverage gained from refactoring them is modest compared to Candidates 1 and 2.

---

## Top Recommendation

### **Tackle Candidate 1 First: Deepen the Topic Assignment Module**

**Rationale**:
1. **Highest Churn & Production Friction**: Topic matching, entity resolution, and burst persistence have seen 5 distinct commits in the last 48 hours alone (`8a7e736`, `a7f714d`, `3672ddd`).
2. **Deepest Leverage**: `topic-assignment-job-handler.ts` (678 LOC) is the single most complex procedural file in the backend. Moving it behind a clean domain interface immediately isolates CAS optimistic retry, entity resolution, and evidence linking from queue worker plumbing.
3. **Dramatic Improvement in Test Surface**: Testing topic assignment currently requires wiring up pg-boss job stubs. Extracting the domain module enables pure, lightning-fast integration testing of all clustering scenarios against `mahalla_ovozi_test` without background worker machinery.

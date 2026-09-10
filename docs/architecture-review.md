# Architecture Review: Mahalla Ovozi

Conducted using the `improve-codebase-architecture` design vocabulary (**module**, **interface**, **depth**, **seam**, **adapter**, **leverage**, **locality**, **deletion test**) and canonical domain terms from `CONTEXT.md`.

---

## 1. Macro Layer Health Check

| Layer | Primary Path | Status | Architectural Assessment |
| :--- | :--- | :---: | :--- |
| **Contracts** | `packages/api-contracts` | `STABLE` | Browser-safe Zod schemas, strict TypeScript types, and explicit pagination/error contracts. No ORM models or vendor SDK types leak across the boundary. |
| **Backend Adapters** | `apps/backend/src/adapters/` | `STABLE` | Ports & adapters pattern strictly adhered to for PostgreSQL (`adapters/db`), pg-boss queues (`adapters/jobs`), and AI providers (`adapters/ai-providers`). External dependencies are fully isolated. |
| **Backend Domain & Pipelines** | `apps/backend/src/modules/` | `FRICTION` | High churn and architectural leakage. Complex orchestration and multi-table SQL queries live inside shallow worker handlers instead of deep domain modules. `ai/` contains a bloated 1,344-line service reaching across 7 tables. |
| **Backend Entrypoints** | `apps/backend/src/entrypoints/` | `STABLE` | `http.ts` (Fastify REST) and `worker.ts` (pg-boss pipeline) provide clean process lifecycles, graceful teardown, IPv4 DNS ordering, and automated watchdog health checks. |
| **Frontend Domain State** | `apps/web/src/topics/`, `auth/` | `ATTENTION` | TanStack Query owns remote server state cleanly, but `useHokimTopicBoard.ts` (581 LOC) concentrates heavy client state (cursor merging, read receipts, announcer events). |
| **Frontend UI & Presentation** | `apps/web/src/pages/`, `theme/` | `STABLE` | Ant Design 5 with custom tokens (`mahallaTheme`). Clean separation between Hokim 5-lane executive dashboard and Product Owner console. Responsive up to 480px fluid layout. |
| **Deployment & Ops** | `deploy/`, `docker-compose.yml` | `STABLE` | Single-host Docker Compose on Ubuntu 24.04 VPS (Airnet.uz BKM datacenter, Tashkent). Caddy edge proxy with automatic TLS, and pgBackRest continuous WAL archiving. |

---

## 2. Deepening Candidates

### Candidate 1: Extract Deep Topic Assignment Domain Service from Shallow Worker Handler [DEEPENED & VERIFIED]
* **Status:** `COMPLETED` (Phase 1, 2, 3 verified across all 29 matrix integration tests)
* **Strength:** `Strong`
* **Dependency Category:** `in-process / domain logic`
* **Files:**
  - `apps/backend/src/modules/topics/topic-assignment-coordinator.ts` [NEW - Deep Seam, 540 LOC]
  - `apps/backend/src/modules/topics/jobs/topic-assignment-job-handler.ts` [COLLAPSED from 678 LOC to 143 LOC]
  - `apps/backend/src/modules/topics/topic-matching-evaluator.ts` (480 LOC)
  - `apps/backend/src/modules/topics/topic-matching-resolver.ts` (130 LOC)
  - `apps/backend/src/modules/ai/context-snapshot.ts` (260 LOC)

#### Problem
`topic-assignment-job-handler.ts` was 678 lines of low-level procedural orchestration masquerading as a worker handler. It reached directly into Drizzle database tables, managed evidence snapshots from `context-snapshot.ts`, called pure evaluation helpers, checked direct replies, wrote `topics` and `accepted_evidence` records, cleared retry flags in `issues`, and enqueued projection jobs.  
Because the domain logic was smeared across the worker handler rather than housed behind a deep domain seam, testing topic assignment required heavy mocking of pg-boss job envelopes, database pools, and multi-table transactions. The interface of topic assignment effectively existed inside the background worker instead of the domain.

#### Solution Implemented
Deepened the `topics` module by creating the unified `topic-assignment-coordinator.ts` exposing a single narrow domain seam:
```typescript
assignEvidenceToTopic(deps: TopicAssignmentDeps, input: TopicAssignmentInput): Promise<TopicAssignmentOutcome>
```
All snapshot assembly, direct-reply checking, LLM matching evaluation, and ACID multi-table persistence live behind this seam. The pg-boss job handler collapsed from 678 lines into a clean, thin queue adapter (143 lines) that unpacks the job payload, invokes `assignEvidenceToTopic`, and emits privacy-safe telemetry events.

#### Verification
* **Typecheck:** Clean compile across all packages (`pnpm -r typecheck`).
* **Matrix Tests:** 29 of 29 integration tests in `tests/worker-topic-assignment.test.ts` passed (Story 2.4 matrix).
* **Burst Flow Tests:** 9 of 9 tests in `tests/telegram-burst-debounce.test.ts` passed.

#### Benefits Achieved
* **Depth & Leverage:** One simple function call replaces 600+ lines of distributed procedural logic.
* **Locality:** Evidence snapshot validation, matching resolution, and database persistence live together where changes happen, eliminating cross-module jumping.
* **Test Surface ("The interface is the test surface"):** Topic assignment can now be tested end-to-end with real database fixtures without instantiating or mocking pg-boss workers.
* **Deletion Test:** The pg-boss worker handler is now strictly a disposable queue adapter; the entire domain intake logic remains reusable by CLI scripts, test harnesses, or alternate runners.

---

### Candidate 2: Dissolve the Misplaced "Signal Management" Entity and Realign with Ubiquitous Language [DISSOLVED & VERIFIED]
* **Status:** `COMPLETED` (Phase 1, 2, 3 verified across all 18 CRUD integration tests)
* **Strength:** `Strong`
* **Dependency Category:** `ports & adapters / domain boundaries`
* **Files:**
  - `apps/backend/src/modules/topics/topic-evidence-management-service.ts` [NEW - Deep Seam, 1,023 LOC]
  - `apps/backend/src/modules/topics/admin-signals-routes.ts` [NEW - Clean Route Adapter, 391 LOC]
  - `apps/backend/src/modules/ai/signal-management-service.ts` [DELETED - 1,344 LOC removed from AI layer]
  - `apps/backend/src/modules/ai/ai-operations-routes.ts` [COLLAPSED from 627 LOC to 277 LOC]

#### Problem
`signal-management-service.ts` was an oversized 1,344-line OOP class placed inside `apps/backend/src/modules/ai/`. It executed raw relational queries across 7 separate tables (`telegram_intakes`, `districts`, `ai_operations`, `ai_provider_attempts`, `accepted_evidence`, `topics`, `topic_projections`), manually enqueued background jobs, and formatted message text.  
This created severe architectural friction:
1. **Ubiquitous Language Violation:** `CONTEXT.md` explicitly states: *Accepted Evidence* is the raw telegram message; *Signal* is a community condition; and citizen messages are *never* tickets or complaints. This service treated individual messages as "signals" with manual status mutations.
2. **Broken Hexagonal Seams:** The `ai` module is intended for AI Gateway routing, provider adapters, and LLM evaluations. Housing a massive relational CRUD and manual pipeline reprocessing service inside `ai/` leaked domain storage and intake responsibilities into the AI layer.

#### Solution Implemented
1. Created `topic-evidence-management-service.ts` under `modules/topics/` housing pure functions for `listSignals`, `getSignalDetail`, `promoteSignal`, `reclassifySignal`, `updateVerbatimText`, `deleteEvidence`, `injectManualSignal`, and `batchDeleteSignals`.
2. Extracted the 8 admin endpoints into `admin-signals-routes.ts` under `modules/topics/`, preserving `/api/v1/admin/signals/*` URL endpoints for zero web client churn.
3. Collapsed `ai-operations-routes.ts` down to 277 lines strictly focused on AI operations inspection.
4. Deleted the 1,344-line `signal-management-service.ts` from `modules/ai/`.

#### Verification
* **Typecheck:** Clean compile across monorepo (`pnpm -r typecheck`).
* **CRUD Integration Tests:** 18 of 18 tests in `tests/signal-management-crud.test.ts` passed against `mahalla_ovozi_test`.
* **AI Operation Query Tests:** 30 of 30 tests in `tests/ai-operation-query.test.ts` passed.

#### Benefits Achieved
* **Seam Integrity:** Restored clean hexagonal boundaries to `apps/backend/src/modules/ai/`.
* **Ubiquitous Language Alignment:** Standardized internally on canonical *Accepted Evidence* and *Telegram Intake Records* within the topics domain.
* **Locality:** Relational queries against intake and evidence tables now live where those entities are owned.
* **Zero Web Churn:** Wire-level backward compatibility preserved.

---

### Candidate 3: Consolidate Dual Topic Query Services into a Single Deep Topic Query Engine [CONSOLIDATED & VERIFIED]
* **Status:** `COMPLETED` (Verified across 94 integration tests)
* **Strength:** `Strong`
* **Dependency Category:** `in-process / domain logic`
* **Files:**
  - `apps/backend/src/modules/topics/topic-query-engine.ts` [NEW - Deep Seam, 777 LOC]
  - `apps/backend/src/modules/topics/district-topics-service.ts` [COLLAPSED from 384 LOC to 88 LOC]
  - `apps/backend/src/modules/topics/hokim-topic-service.ts` [COLLAPSED from 1,108 LOC to 118 LOC]

#### Problem
Two separate topic query services existed within `apps/backend/src/modules/topics/`:
- `district-topics-service.ts` (serving Product Owner console topic search and pagination).
- `hokim-topic-service.ts` (serving Hokim executive 5-lane board queries and lane-specific pagination).

Both services independently constructed raw SQL queries against `topics` and `topic_projections`, implemented keyset cursor encoding/decoding, resolved Tashkent date boundaries, duplicated mahalla name extraction queries, and built search predicates. When query logic or projection rules changed, both query builders had to be maintained in sync.

#### Solution Implemented
Created `topic-query-engine.ts` housing the authoritative pure functional topic query and aggregation engine:
- `encodeTopicKeysetCursor` / `decodeTopicKeysetCursor`: Standardized keyset cursor math with 90-day retention bounds.
- `queryDistrictMahallas`: Single deduplicated SQL query across `district_telegram_groups` and `topics` with `uz-Cyrl` collation.
- `queryTopics`: Unified high-performance topic querying supporting multi-lane district queries, single-lane board queries, contextual search match badges, and visit baseline freshness calculations (`isNew`, `isUpdated`).
- `queryDistrictTopicsPage`: Product owner console page resolution with total count.
- `queryHokimBoard`: 5-lane board query with visit tracking and processing delay check.
- `queryHokimLaneBatch`: Deterministic keyset pagination for single lane batches.
- `checkProcessingDelay`: Tri-layer latency checking across pgboss, intake, and projections.
- `queryHokimStatistics`: Authoritative PostgreSQL aggregation, Card 4 leader service lane, Card 5 leader mahalla, and Card 1 prior period comparison.
Both `DistrictTopicsService` and `HokimTopicService` were refactored into thin backward-compatible facades (~88 and ~118 LOC) delegating to `topic-query-engine.ts`.

#### Verification
* **Typecheck:** Clean compile across monorepo (`pnpm -r typecheck`).
* **Topic Integration Tests:** All 94 tests passed across 7 test suites:
  - `tests/district-topics.test.ts` (20 tests)
  - `tests/hokim-topics.test.ts` (9 tests)
  - `tests/hokim-topic-search.test.ts` (15 tests)
  - `tests/hokim-topics-filter.test.ts` (14 tests)
  - `tests/hokim-topics-pagination.test.ts` (6 tests)
  - `tests/hokim-topics-refresh.test.ts` (5 tests)
  - `tests/hokim-topics-statistics.test.ts` (25 tests)
* **Regressions:** Candidate 1 (`tests/worker-topic-assignment.test.ts`) and Candidate 2 (`tests/signal-management-crud.test.ts`) 100% passing.

#### Benefits Achieved
* **Deduplication:** Eliminated >500 lines of redundant SQL query generation, cursor math, and alias boilerplate.
* **Single Source of Truth:** Changes to projection filtering, calendar day boundaries, or failure predicates now apply immediately to both Product Owner and Hokim views.
* **Pure Functional Design:** Converted procedural class methods to testable pure functions matching project code standards.
* **Zero Web Churn:** Backward compatibility fully preserved.

---

## 3. Review Summary & Deepening Status

All 3 primary deepening candidates identified in this architectural review have now been systematically implemented, verified, and stabilized:

1. **Candidate 1: Topic Assignment Domain Seam** -> `topic-assignment-coordinator.ts` [COMPLETED]
2. **Candidate 2: Misplaced Signal Entity Dissolution** -> `topic-evidence-management-service.ts` [COMPLETED]
3. **Candidate 3: Unified Topic Query Engine** -> `topic-query-engine.ts` [COMPLETED]

The backend `topics` domain and hexagonal seams are now unified, deeply cohesive, and cleanly separated from infrastructure queue adapters and AI gateways.

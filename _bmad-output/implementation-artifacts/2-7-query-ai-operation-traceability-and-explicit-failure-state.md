---
baseline_commit: 4e878cb
---

# Story 2.7: Query AI Operation Traceability and Explicit Failure State

Status: completed

<!-- Note: Implementation and verification complete. 25/25 matrix rows passing, 31 files / 459 tests passing across full suite. -->

## Story

As the **Product Owner**,
I want production AI operations and provider attempts to remain queryable through durable, privacy-safe traceability,
So that AI failures, retry lifecycles, and committed results can be investigated without exposing resident evidence or mistaking incomplete processing for success.

---

## Acceptance Criteria

1. **Authoritative AI Operations Traceability Boundary (FR-13, AD-8, AD-11):**
   - **Given** production AI logical-operation and provider-attempt records were created through the traceability boundary established in Story 2.3 and reused by Stories 2.4 and 2.5
   - **When** Story 2.7 query services and repository adapters expose them for operational investigation
   - **Then** the service queries the existing authoritative `ai_operations`, `ai_provider_attempts`, and `ai_profiles` tables directly without creating a parallel store or shadow copy
   - **And** the query model preserves the 1:N relationship between one logical AI operation (`ai_operations.id`) and its multiple external provider attempts (`ai_provider_attempts.operation_id`)
   - **And** each record exposes technical lineage (`pinnedProfileId`, `operationType`, `targetId`, `districtId`, `mahallaName`, `calendarDay`, `contextRevision`, `snapshotFingerprint`, `finalStatus`, `createdAt`, `updatedAt`)
   - **And** raw resident message content, candidate text, verbatim evidence text, Telegram user handles, bot tokens, API keys, and prompt templates containing citizen text remain strictly absent from the query contract and returned payloads.

2. **Distinct Provider Attempt Inspection & Metadata (FR-13, AD-8, AD-11):**
   - **Given** an AI logical operation has executed one or more provider attempts
   - **When** its provider attempt history is queried by operation ID
   - **Then** each attempt record returns its `attemptNumber`, `provider` (`OPENAI`, `GEMINI`, `GROQ`, `OLLAMA`, `MOCK`), `modelId`, `providerRequestId`, `durationMs`, `inputTokens`, `outputTokens`, `cachedTokens`, `estimatedCostUsd`, `status` (`SUCCESS`, `ERROR`, `TIMEOUT`, `REFUSAL`), `errorCode`, `sanitizedErrorMessage`, and `createdAt`
   - **And** attempts remain ordered chronologically by `attemptNumber ASC`
   - **And** provider SDK internals, raw HTTP headers, and raw model response buffers remain encapsulated and excluded from output.

3. **Immutable AI Profile & Configuration Lineage (FR-13, AD-8, AD-10):**
   - **Given** an AI operation pinned an immutable AI profile version at creation time (e.g. `prof_rel_2026_08_v1`)
   - **When** newer AI profile versions are activated in the system (e.g. `prof_rel_2026_09_v2`)
   - **Then** querying the historical AI operation returns the pinned profile version active when the operation was originally scheduled
   - **And** prospective profile activation never mutates historical profile bindings or replays completed operations.

4. **Explicit Distinction: Provider Technical Success vs. Committed Business Success (FR-13, AD-4, AD-8):**
   - **Given** an external AI provider call returns HTTP 200 with syntactically valid output
   - **When** the operation result is evaluated for business commit
   - **Then** the provider attempt records `status = 'SUCCESS'`
   - **But** the parent logical operation (`ai_operations`) does NOT reach a successful final status (`COMPLETED_RELEVANT`, `COMPLETED_IRRELEVANT`, `COMPLETED_MATCHED`, `COMPLETED_NEW_TOPIC`, `COMPLETED`) unless:
     1. Application structural validation (JSON schema adherence) succeeds;
     2. Operation-specific semantic validation (Zod schema and domain bounds) succeeds;
     3. Context revision / CAS concurrency conditions (`contextRevision` and target generation) are verified before transactional commit
   - **And** if any post-provider validation or commit condition fails, `finalStatus` records explicit failure (`FAILED_EXPLICIT` or `STALE`) rather than being masked as successful.

5. **Granular Error Categorization & Normalization (FR-13, AD-8):**
   - **Given** an AI operation fails at any stage of execution
   - **When** the failure is recorded in `ai_provider_attempts` and `ai_operations`
   - **Then** the failure is categorized into one of the standardized typed error codes:
     - `RATE_LIMIT_EXCEEDED` (HTTP 429 / quota exceeded)
     - `PROVIDER_TIMEOUT` (HTTP 504 / deadline exceeded)
     - `PROVIDER_SERVER_ERROR` (HTTP 500 / 502 / 503 upstream error)
     - `NETWORK_ERROR` (DNS / connection reset / TCP socket error)
     - `INVALID_OUTPUT_SYNTAX` (malformed JSON / unparseable code blocks)
     - `INVALID_OUTPUT_SEMANTICS` (schema failure, invalid lane enum, invalid evidence ID reference)
     - `CONTEXT_LIMIT_EXCEEDED` (context overflow before or during call)
     - `PROVIDER_REFUSAL` (safety / policy refusal from provider)
     - `AUTHENTICATION_ERROR` (bad API key / unauthorized)
     - `STALE_SNAPSHOT` (CAS context revision / snapshot fingerprint mismatch upon commit)
     - `PROFILE_NOT_FOUND` (referenced AI profile does not exist)
     - `CIRCUIT_OPEN` (breaker triggered due to consecutive downstream provider failures)
   - **And** error messages are sanitized to a max length of 200 characters without resident text.

6. **Context Overflow Pre-Invocation Failure State (FR-13, AD-4, AD-8):**
   - **Given** the required same-day Mahalla context exceeds the model's configured max token envelope or request size limit
   - **When** the context snapshot is evaluated prior to provider invocation
   - **Then** the system records an explicit `CONTEXT_LIMIT_EXCEEDED` failure
   - **And** zero provider network calls are made (0 cost, 0 external tokens)
   - **And** the operation commits `finalStatus = 'FAILED_EXPLICIT'` with `errorCode = 'CONTEXT_LIMIT_EXCEEDED'`
   - **And** the context is never silently truncated, summarized, top-K filtered, or altered to force model execution.

7. **Stale Snapshot & Concurrent Revision Invalidation (FR-13, AD-6, AD-7):**
   - **Given** an AI operation executed against Mahalla context revision $R_0$
   - **When** new evidence commits while the AI call was in flight, advancing the canonical revision to $R_1$
   - **Then** the transactional commit rejects the AI result with `STALE_SNAPSHOT`
   - **And** `ai_operations.finalStatus` records `STALE`
   - **And** no topic assignments, evidence links, or derived projections from the stale snapshot are committed
   - **And** stale snapshot states remain explicitly queryable and distinguishable from provider technical errors.

8. **Retry Lifecycle & Exhaustion Visibility (FR-13, AD-8, AD-11):**
   - **Given** an AI operation encounters a retryable error (e.g. `PROVIDER_TIMEOUT`, `RATE_LIMIT_EXCEEDED`)
   - **When** retries occur under the pinned profile's retry policy (e.g. `maxAttempts: 3`)
   - **Then** each retry creates a new sequential `ai_provider_attempts` row (`attemptNumber = 2, 3...`) linked to the same `operationId`
   - **And** if all retry attempts are exhausted without success, `ai_operations.finalStatus` transitions to `FAILED_EXPLICIT`
   - **And** exhausted operations never remain stuck in an indefinite pending state
   - **And** historical attempt rows are never overwritten or deleted by subsequent retries.

9. **Strict District Tenant Scoping (FR-13, AD-9):**
   - **Given** a district-scoped user (Hokim or District Administrator) or service queries AI operations
   - **When** invoking `AiOperationQueryService.listOperations` or `AiOperationQueryService.getOperationDetails`
   - **Then** every query requires a valid, non-empty `districtId`
   - **And** an omitted, empty, or whitespace `districtId` immediately throws a typed domain error `INVALID_DISTRICT_SCOPE` (HTTP 400/403)
   - **And** queries strictly partition results by `district_id = $districtId` preventing cross-tenant information exposure.

10. **Dedicated Global Administrative Investigation Contract (FR-13, AD-9):**
    - **Given** the Product Owner investigates system-wide AI performance across multiple districts
    - **When** querying through the dedicated global administrative method (`listGlobalOperations`, `getGlobalOperationDetails`)
    - **Then** the contract explicitly requires the global administrative actor context
    - **And** optional filters (`districtId`, `operationType`, `finalStatus`, `calendarDay`, `dateRange`) allow cross-district filtering without bypassing tenant security checks in normal district routes.

11. **System Health Privacy-Safe Aggregation Metrics (FR-13, AD-11):**
    - **Given** System Health (or Epic 4 monitoring) requests operational AI metrics for a district or globally across a timeframe
    - **When** `AiOperationQueryService.getAiOperationHealthMetrics` is executed
    - **Then** the service computes aggregate summary metrics:
      - `totalOperations`: total logical operations count
      - `operationsByType`: counts broken down by `SEMANTIC_RELEVANCE`, `TOPIC_MATCHING`, `TOPIC_DERIVED_PROJECTION`
      - `operationsByStatus`: counts broken down by status (`COMPLETED_RELEVANT`, `COMPLETED_IRRELEVANT`, `COMPLETED_MATCHED`, `COMPLETED_NEW_TOPIC`, `COMPLETED`, `FAILED_EXPLICIT`, `STALE`)
      - `totalAttempts`: total external provider calls
      - `attemptsByStatus`: breakdown by `SUCCESS`, `ERROR`, `TIMEOUT`, `REFUSAL`
      - `attemptsByErrorCode`: breakdown by `AiGatewayErrorCode`
      - `staleSnapshotCount`: total occurrences of `STALE_SNAPSHOT`
      - `contextOverflowCount`: total occurrences of `CONTEXT_LIMIT_EXCEEDED`
      - `refusalCount`: total occurrences of `PROVIDER_REFUSAL`
      - `timeoutCount`: total occurrences of `PROVIDER_TIMEOUT`
      - `validationFailureCount`: total occurrences of `INVALID_OUTPUT_SYNTAX` + `INVALID_OUTPUT_SEMANTICS`
      - `totalInputTokens`, `totalOutputTokens`, `totalCachedTokens`: aggregate token counts
      - `totalEstimatedCostUsd`: sum of micro-USD cost
      - `avgDurationMs`, `p95DurationMs`: latency statistics
    - **And** zero resident text or prompt context is accessed or returned during metric calculation.

12. **Idempotent Duplicate Callback & Race Safety (FR-13, AD-4, AD-8):**
    - **Given** duplicate job delivery, concurrent worker execution, or duplicate attempt callbacks occur for the same operation
    - **When** status updates attempt to write to `ai_operations` or `ai_provider_attempts`
    - **Then** database unique constraints (`ai_attempts_op_attempt_idx`, `ai_ops_district_op_target_idx`) prevent duplicate attempt records or duplicate operations
    - **And** conflicting concurrent updates fail or resolve deterministically without corrupting the operation lifecycle state.

13. **Clean Subject Discard & Retention Compliance (FR-13, AD-11, Story 2.6):**
    - **Given** a message or topic is excluded, unassigned, or purged under 90-day retention
    - **When** the subject row is deleted or discarded
    - **Then** `ai_operations.targetId` and `resultPayload` retain only technical identifiers and sanitized flags
    - **And** foreign key references to purged topics (`accepted_evidence.ai_operation_id`, `topic_projections.ai_operation_id`) handle lifecycle cleanup via `ON DELETE SET NULL` or explicit purge
    - **And** the operational audit trail cannot be used to recreate or resurrect purged resident data.

14. **Deterministic Cursor & Offset Pagination for Operational Search (FR-13, AD-10):**
    - **Given** a district or administrator queries large collections of historical AI operations
    - **When** pagination parameters are supplied (`limit`, `offset` / `cursor`)
    - **Then** results are ordered deterministically by `createdAt DESC, id DESC`
    - **And** default page size is 50 with a maximum hard cap of 200 records per page.

15. **Story Boundary Isolation (FR-14, FR-15, FR-17, Epic 4):**
    - **Given** Story 2.7 is implemented and verified
    - **When** tests execute
    - **Then** tests prove Story 2.7 provides complete query services, repository adapters, error categorizations, and System Health aggregations without building Epic 4's frontend UI dashboards or Epic 5's configuration editing workflows.

---

## Tasks / Subtasks

- [x] **Task 1: AI Operation Query Types & Contracts (AC: 1, 2, 3, 5, 9, 10, 11, 14)**
  - [x] 1.1 Create `apps/backend/src/modules/ai/ai-operation-types.ts`:
    - Unify all 12 error codes in `AiOperationErrorCodeEnum` (Zod schema) and update `AiGatewayErrorCode` in `types.ts` to include `CIRCUIT_OPEN`.
    - Export `AiOperationFilter`: `{ districtId?: string; mahallaName?: string; calendarDay?: string; operationType?: string; finalStatus?: string; targetId?: string; startDate?: Date; endDate?: Date; page?: number; pageSize?: number }`.
    - Export `AiOperationDetailRecord`: `{ operation: AiOperation; profile: AiProfile; attempts: AiProviderAttempt[] }`.
    - Export `AiOperationListItem`: Summary projection of operation with attempt count and total cost.
    - Export `AiOperationHealthMetrics`: Complete structured aggregation metrics schema.
  - [x] 1.2 Update API contract definitions in `packages/api-contracts/src/` (exporting shared Zod schemas for pagination, filter parameters, and response envelopes).

- [x] **Task 2: AI Operation Repository Implementation (AC: 1, 2, 3, 4, 7, 8, 9, 10, 11, 12, 14)**
  - [x] 2.1 Create `apps/backend/src/modules/ai/ai-operation-repository.ts`:
    - Implement type-safe Drizzle ORM v0.45 queries using `Promise.all([countQuery, itemsQuery])` with deterministic sort order `orderBy(desc(aiOperations.createdAt), desc(aiOperations.id))`.
    - `findOperationsByDistrict(filter: AiOperationFilter, tx?: DbOrTx): Promise<{ items: AiOperationListItem[]; pagination: PaginationMeta }>`
    - `findOperationsGlobal(filter: AiOperationFilter, tx?: DbOrTx): Promise<{ items: AiOperationListItem[]; pagination: PaginationMeta }>`
    - `findOperationDetailsById(districtId: string, operationId: string, tx?: DbOrTx): Promise<AiOperationDetailRecord | null>`
    - `findOperationDetailsByIdGlobal(operationId: string, tx?: DbOrTx): Promise<AiOperationDetailRecord | null>`
    - `findAttemptsByOperationId(operationId: string, tx?: DbOrTx): Promise<AiProviderAttempt[]>`
    - `aggregateHealthMetrics(districtId?: string, timeframe?: { from: Date; to: Date }, tx?: DbOrTx): Promise<AiOperationHealthMetrics>`:
      - Implement null-safe numeric aggregations via `sql<number>\`coalesce(sum(...), 0)\`.mapWith(Number)`.
      - Calculate P95 latency via `sql<number>\`coalesce(percentile_cont(0.95) within group (order by ${aiProviderAttempts.durationMs}), 0)\`.mapWith(Number)`.

- [x] **Task 3: AI Operation Query Domain Service (AC: 1, 4, 5, 6, 7, 8, 9, 10, 11, 13)**
  - [x] 3.1 Create `apps/backend/src/modules/ai/ai-operation-query-service.ts`:
    - Implement `AiOperationQueryService` class with strict tenant isolation guards.
    - Enforce `INVALID_DISTRICT_SCOPE` when `districtId` is missing, empty, or whitespace in district queries.
    - Implement `listDistrictOperations(districtId: string, filter: Omit<AiOperationFilter, 'districtId'>)`
    - Implement `getDistrictOperationDetails(districtId: string, operationId: string)`
    - Implement `listGlobalOperations(filter: AiOperationFilter)` (admin scope)
    - Implement `getGlobalOperationDetails(operationId: string)` (admin scope)
    - Implement `getSystemHealthAiMetrics(districtId?: string, timeframe?: { from: Date; to: Date })`
    - Verify privacy boundary: assert that no returned objects contain resident message text, bot tokens, or API credentials.

- [x] **Task 4: Fastify HTTP Routes for AI Operation Queries (AC: 9, 10, 14)**
  - [x] 4.1 Create `apps/backend/src/modules/ai/ai-operations-routes.ts`:
    - Implement routes using Fastify route encapsulation and session guards.
    - Register `GET /api/v1/districts/:districtId/ai-operations` (District scoped, protected by session & actor context).
    - Register `GET /api/v1/districts/:districtId/ai-operations/:operationId` (District scoped details).
    - Register `GET /api/v1/admin/ai-operations` (Global Product Owner scope).
    - Register `GET /api/v1/admin/ai-operations/:operationId` (Global Product Owner details).
    - Register `GET /api/v1/admin/ai-operations/health-metrics` (System Health metrics).
  - [x] 4.2 Wire routes in `apps/backend/src/entrypoints/http.ts`.

- [x] **Task 5: Verification Test Suite (AC: 1–15)**
  - [x] 5.1 Create `apps/backend/tests/ai-operation-query.test.ts` implementing the complete 25-row Verification Matrix (M1–M25):
    - Matrix #1–5: Query filtering by district, mahalla, calendarDay, operationType, and finalStatus.
    - Matrix #6–8: Detail queries returning joined operation, immutable profile, and chronologically ordered attempts.
    - Matrix #9–12: Error code categorization (`STALE_SNAPSHOT`, `CIRCUIT_OPEN`, `TIMEOUT`, `INVALID_OUTPUT_SEMANTICS`, `CONTEXT_LIMIT_EXCEEDED`).
    - Matrix #13–15: Technical provider success vs. business validation failure distinction.
    - Matrix #16–18: Retry attempt tracking, backoff duration logging, and attempt exhaustion visibility.
    - Matrix #19–21: Strict tenant isolation (rejecting empty/missing `districtId`, cross-district access prevention).
    - Matrix #22–24: System Health aggregation facts (counts, token sums, cost totals, P95 latency).
    - Matrix #25: Privacy boundary validation (verifying zero citizen text in all returned query payloads).


---

## Dev Notes

### Architecture Compliance & Guardrails

- **AD-4 (Explicit failure & determinism):** AI operations must never silently swallow errors or convert failures into neutral guesses. A failed attempt records its explicit error code and updates `ai_operations.finalStatus` to `FAILED_EXPLICIT` or `STALE`.
- **AD-8 (AI gateway & immutable profiles):** Queries must reflect the pinned immutable AI profile version captured at operation creation time. All provider calls and error categorizations follow the standardized `AiGatewayErrorCode` enum.
- **AD-9 (Tenant isolation & explicit district scope):** All district repository and service methods strictly mandate `districtId`. Any missing or empty district scope throws `INVALID_DISTRICT_SCOPE`. Global queries must be explicitly isolated to administrative contracts.
- **AD-10 (Versioned REST contracts):** HTTP routes follow `/api/v1/*` conventions with Zod validation and standard JSON envelopes.
- **AD-11 (Privacy-safe observability):** Zero resident text, citizen names, verbatim evidence, or raw Telegram message bodies may appear in `ai_operations`, `ai_provider_attempts`, or query service returns.

### Standardized AI Error Code Taxonomy

| Error Code | HTTP / Trigger Source | Retryable | Description |
| :--- | :--- | :--- | :--- |
| `RATE_LIMIT_EXCEEDED` | Upstream HTTP 429 | Yes | Provider rate limit or quota exceeded |
| `PROVIDER_TIMEOUT` | Upstream HTTP 504 / Client deadline | Yes | External provider took longer than `timeoutMs` |
| `PROVIDER_SERVER_ERROR` | Upstream HTTP 500 / 502 / 503 | Yes | Upstream AI provider internal error |
| `NETWORK_ERROR` | ECONNRESET / ETIMEDOUT / DNS | Yes | Low-level TCP socket / transport failure |
| `INVALID_OUTPUT_SYNTAX` | Unparseable JSON | Yes (within budget) | Model returned invalid JSON syntax |
| `INVALID_OUTPUT_SEMANTICS` | Zod schema validation failed | Yes (within budget) | Model output violated schema constraints or domain bounds |
| `CONTEXT_LIMIT_EXCEEDED` | Context builder check | No | Required same-day context exceeded max tokens |
| `PROVIDER_REFUSAL` | Model refusal message | No | Provider safety / policy filter refused response |
| `AUTHENTICATION_ERROR` | Upstream HTTP 401 / 403 | No | Invalid API key or unauthorized provider access |
| `STALE_SNAPSHOT` | CAS revision mismatch on commit | Yes (as new job) | Mahalla evidence changed while AI call was in flight |
| `PROFILE_NOT_FOUND` | Profile registry lookup | No | Pinned AI profile ID does not exist |
| `CIRCUIT_OPEN` | Gateway circuit breaker | Yes (after cooldown) | Circuit breaker active due to repeated provider outages |

---

## Verification Test Matrix

| Matrix # | Test Scenario | Target AC | Expected Result |
| :--- | :--- | :--- | :--- |
| **M1** | Query operations by valid `districtId` with default pagination | AC 1, 9, 14 | Returns paginated list of operations scoped to target district |
| **M2** | Query operations filtering by `mahallaName` and `calendarDay` | AC 1, 9 | Returns only matching operations for specific Mahalla and day |
| **M3** | Query operations filtering by `operationType = 'SEMANTIC_RELEVANCE'` | AC 1 | Returns only relevance qualification operations |
| **M4** | Query operations filtering by `operationType = 'TOPIC_MATCHING'` | AC 1 | Returns only topic matching operations |
| **M5** | Query operations filtering by `operationType = 'TOPIC_DERIVED_PROJECTION'` | AC 1 | Returns only topic derived projection operations |
| **M6** | Query operations filtering by `finalStatus = 'FAILED_EXPLICIT'` | AC 1, 5 | Returns only explicitly failed operations |
| **M7** | Query operations filtering by `finalStatus = 'STALE'` | AC 1, 7 | Returns only stale snapshot operations |
| **M8** | Get operation details by ID with multiple provider attempts | AC 1, 2 | Returns operation record joined with attempts ordered by `attemptNumber ASC` |
| **M9** | Verify pinned profile version immutability when newer profile active | AC 3 | Historical operation returns `prof_rel_2026_08_v1` even if v2 is active |
| **M10** | Provider HTTP 200 but invalid JSON syntax records explicit failure | AC 4, 5 | Attempt is `ERROR` (`INVALID_OUTPUT_SYNTAX`), operation is `FAILED_EXPLICIT` |
| **M11** | Provider HTTP 200 but invalid Zod schema records semantic failure | AC 4, 5 | Attempt is `ERROR` (`INVALID_OUTPUT_SEMANTICS`), operation is `FAILED_EXPLICIT` |
| **M12** | In-flight context revision advance records `STALE_SNAPSHOT` | AC 4, 7 | CAS detects revision mismatch, sets `finalStatus = 'STALE'`, commits 0 topic state |
| **M13** | Context token overflow records `CONTEXT_LIMIT_EXCEEDED` before AI call | AC 5, 6 | 0 provider network calls made, `finalStatus = 'FAILED_EXPLICIT'` |
| **M14** | Provider timeout (HTTP 504) logs attempt and executes retry | AC 2, 5, 8 | Attempt 1 logged with `PROVIDER_TIMEOUT`, Attempt 2 logged with `SUCCESS` |
| **M15** | Provider rate limit (HTTP 429) logs attempt with backoff delay | AC 2, 5, 8 | Attempt 1 logged with `RATE_LIMIT_EXCEEDED`, retry succeeded |
| **M16** | Retry exhaustion transitions operation to `FAILED_EXPLICIT` | AC 5, 8 | All 3 attempts logged as `ERROR`, operation reaches terminal `FAILED_EXPLICIT` |
| **M17** | Missing `districtId` in district query throws `INVALID_DISTRICT_SCOPE` | AC 9 | Throws typed domain error `INVALID_DISTRICT_SCOPE` (no global leak) |
| **M18** | Empty string `districtId = ""` throws `INVALID_DISTRICT_SCOPE` | AC 9 | Throws typed domain error `INVALID_DISTRICT_SCOPE` |
| **M19** | Query for District A cannot access operations belonging to District B | AC 9 | Cross-district query returns 404 / empty set |
| **M20** | Global admin query retrieves cross-district operations with explicit filter | AC 10 | Returns operations across districts under admin context |
| **M21** | System Health aggregation calculates correct totals across operation types | AC 11 | Counts of `SEMANTIC_RELEVANCE`, `TOPIC_MATCHING`, `TOPIC_DERIVED_PROJECTION` match DB |
| **M22** | System Health aggregation calculates correct error code breakdowns | AC 11 | Counts of `TIMEOUT`, `STALE_SNAPSHOT`, `INVALID_OUTPUT_SEMANTICS` match DB |
| **M23** | System Health aggregation calculates total token counts and cost USD | AC 11 | Token sums and USD cost sum match database aggregate |
| **M24** | Concurrent duplicate attempt insertion caught by unique index | AC 12 | Database unique constraint prevents duplicate attempt numbers |
| **M25** | Complete privacy audit: zero resident text in returned query payloads | AC 1, 2, 11 | Payload regex / schema check proves 0 citizen text or credentials |

---

## References

- Epic 2: [`_bmad-output/planning-artifacts/epics/epic-2.md#story-27-query-ai-operation-traceability-and-explicit-failure-state`](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/epics/epic-2.md)
- PRD FR-13: [`_bmad-output/planning-artifacts/prds/prd-Mahalla-Ovozi-2026-07-30/prd.md`](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/prds/prd-Mahalla-Ovozi-2026-07-30/prd.md)
- Architecture Spine AD-4, AD-8, AD-9, AD-10, AD-11: [`_bmad-output/planning-artifacts/architecture/architecture-Mahalla-Ovozi-2026-08-12/ARCHITECTURE-SPINE.md`](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/architecture/architecture-Mahalla-Ovozi-2026-08-12/ARCHITECTURE-SPINE.md)
- AI Database Schema: [`apps/backend/src/adapters/db/schema/ai.ts`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/backend/src/adapters/db/schema/ai.ts)
- AI Gateway & Types: [`apps/backend/src/modules/ai/types.ts`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/backend/src/modules/ai/types.ts) and [`apps/backend/src/modules/ai/ai-gateway.ts`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/backend/src/modules/ai/ai-gateway.ts)

---

## Dev Agent Record

### Agent Model Used

Gemini 3.7 Flash (High)

### Debug Log References

- Baseline verification: Vitest suite 30 files / 434 tests passing (after fixing district uniqueness in test harness).
- Monorepo typecheck: 0 errors across `packages/api-contracts`, `apps/backend`, `apps/web`.

### Completion Notes List

- Story 2.7 implementation and verification completed across all 15 ACs.
- Executed 5 implementation phases:
  1. Phase 1 (Types & API Contracts): Added `CIRCUIT_OPEN` to `AiGatewayErrorCode`, defined `AiOperationErrorCodeEnum`, and shared Zod query/response contracts in `@mahalla-ovozi/api-contracts`.
  2. Phase 2 (AI Operation Repository): Built `ai-operation-repository.ts` with type-safe Drizzle ORM v0.45 queries (`Promise.all([countQuery, itemsQuery])`), deterministic sorting `orderBy(desc(aiOperations.createdAt), desc(aiOperations.id))`, and null-safe aggregations (`coalesce(sum(...), 0)`, P95 `percentile_cont(0.95)`).
  3. Phase 3 (Domain Service): Built `ai-operation-query-service.ts` enforcing strict tenant isolation (`INVALID_DISTRICT_SCOPE` on missing/empty/whitespace `districtId`), domain errors (`OperationNotFoundError`), and recursive `assertPrivacyBoundary` validation.
  4. Phase 4 (Fastify HTTP Routes): Built `ai-operations-routes.ts` with district-scoped routes (`GET /api/v1/districts/:districtId/ai-operations`, `GET /api/v1/districts/:districtId/ai-operations/:operationId`) and global admin routes (`GET /api/v1/admin/ai-operations`, `GET /api/v1/admin/ai-operations/:operationId`, `GET /api/v1/admin/ai-operations/health-metrics`). Wired into `apps/backend/src/entrypoints/http.ts`.
  5. Phase 5 (Verification Suite): Created `apps/backend/tests/ai-operation-query.test.ts` executing all 25 rows (M1–M25) of the Verification Matrix. Full test suite passing: 31 files / 459 tests green; 0 typecheck errors across monorepo.

### File List

- `packages/api-contracts/src/ai-operations.ts`
- `packages/api-contracts/src/index.ts`
- `apps/backend/src/modules/ai/types.ts`
- `apps/backend/src/modules/ai/ai-operation-types.ts`
- `apps/backend/src/modules/ai/ai-operation-repository.ts`
- `apps/backend/src/modules/ai/ai-operation-query-service.ts`
- `apps/backend/src/modules/ai/ai-operations-routes.ts`
- `apps/backend/src/entrypoints/http.ts`
- `apps/backend/tests/ai-operation-query.test.ts`
- `_bmad-output/implementation-artifacts/2-7-query-ai-operation-traceability-and-explicit-failure-state.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`


---
id: story-7-1
story_key: 7-1-define-district-data-cleaner-interface-and-migrate-topics-module
epic: 7
title: Define DistrictDataCleaner Interface and Migrate Topics Module
status: review
baseline_commit: 10cdc2c64c434ed76bae44206239c088c7344bb6
---

## Story

As a **Developer**,
I want to define the `DistrictDataCleaner` interface and migrate the `topics` module deletion logic into it,
So that the first and largest module cleaner is validated end-to-end before the remaining modules follow.

## Context

Implements Phase 1, Step 1 of ADR-001 (District Deletion Cascade Inversion). The goal is to introduce
the `DistrictDataCleaner` contract and migrate the `topics` module's 3-table cascade
(`topic_projections`, `accepted_evidence`, `topics`) as the initial proof of the pattern.
The original inline deletes are removed only after the cleaner is registered and tested.

## Acceptance Criteria

**Given** the `DistrictDataCleaner` interface is defined
**When** a module implements it
**Then** the interface requires `moduleName: string` and `deleteDistrictData(tx: DbTransaction, districtId: string): Promise<void>`
**And** the `DbTransaction` type is the Drizzle transaction type, exported from `adapters/db/client.ts`
**And** the interface file lives at `apps/backend/src/modules/subscriptions/ports/district-data-cleaner.ts`.

**Given** the topics cleaner is implemented
**When** `deleteDistrictData(tx, districtId)` is called
**Then** it deletes `topic_projections` before `accepted_evidence` before `topics` in that FK order within the caller's transaction
**And** no rows from other modules are touched
**And** if any delete fails the entire transaction rolls back (atomicity inherited from caller).

**Given** the topics cleaner is registered in `district-deletion-service.ts`
**When** `executeDistrictLiveDeletion` runs
**Then** the cleaner is called with the active transaction and districtId
**And** the three previously inline deletes for `topic_projections`, `accepted_evidence`, and `topics` are removed from the cascade body
**And** the overall deletion behavior is functionally identical to the prior implementation.

**Given** Story 7.1 is verified
**When** focused automated tests run
**Then** an integration test for the topics cleaner against `mahalla_ovozi_test` seeds a district with topics,
evidence, and projections, calls `deleteDistrictData`, and asserts all three tables are empty for that districtId
**And** the existing full-cascade integration test (if present) still passes.

## Tasks / Subtasks

- [ ] Task 1: Export `DbTransaction` type from `adapters/db/client.ts`
  - [ ] Inspect existing transaction usage in the codebase to identify the Drizzle transaction type
  - [ ] Export it as `DbTransaction` from `apps/backend/src/adapters/db/client.ts`
  - [ ] Run `pnpm typecheck` to confirm no breakage

- [ ] Task 2: Define `DistrictDataCleaner` interface
  - [ ] Create `apps/backend/src/modules/subscriptions/ports/district-data-cleaner.ts`
  - [ ] Define the interface with `moduleName: string` and `deleteDistrictData(tx: DbTransaction, districtId: string): Promise<void>`
  - [ ] Import `DbTransaction` from `adapters/db/client.ts`
  - [ ] Run `pnpm typecheck`

- [ ] Task 3: Implement `createTopicsDataCleaner` factory
  - [ ] Create `apps/backend/src/modules/topics/topics-data-cleaner.ts`
  - [ ] Implement factory returning `DistrictDataCleaner` deleting `topic_projections` then `accepted_evidence` then `topics` (strict FK order, within provided `tx`)
  - [ ] Set `moduleName` to `'topics'`
  - [ ] Run `pnpm typecheck`

- [ ] Task 4: Register topics cleaner in deletion service and remove inline deletes
  - [ ] Import `createTopicsDataCleaner` and `DistrictDataCleaner` in `district-deletion-service.ts`
  - [ ] Create `cleaners: DistrictDataCleaner[]` array with the topics cleaner as first entry
  - [ ] Add FK-order comment block above the array
  - [ ] Replace the 3 inline topic/evidence/projection deletes with a `for...of` loop over cleaners
  - [ ] Remove the 3 now-redundant schema imports (`topicProjections`, `acceptedEvidence`, `topics`)
  - [ ] Run `pnpm typecheck`

- [ ] Task 5: Write topics cleaner integration test
  - [ ] Create `apps/backend/tests/modules/topics/topics-data-cleaner.test.ts`
  - [ ] Seed a district with topics, accepted evidence, and projections in `mahalla_ovozi_test`
  - [ ] Call `createTopicsDataCleaner().deleteDistrictData(tx, districtId)` inside a test transaction
  - [ ] Assert `topic_projections`, `accepted_evidence`, `topics` tables have 0 rows for that districtId
  - [ ] Assert unrelated module tables are not touched
  - [ ] Run `pnpm test` to confirm passes

- [ ] Task 6: Final validation
  - [ ] Run `pnpm typecheck` — 0 errors
  - [ ] Run `pnpm test` — 0 failures
  - [ ] Confirm existing deletion-related tests (if any) still pass

## Dev Notes

### Architecture context (ADR-001)
- `DistrictDataCleaner` interface MUST live in `subscriptions/ports/` — the orchestrator owns the contract (D-2)
- `DbTransaction` is the Drizzle transaction type. Inspect how existing code uses `db.transaction(async (tx) => ...)` — the `tx` parameter type is what to export
- Topics cleaner deletes in strict FK order: `topic_projections` -> `accepted_evidence` -> `topics`. Do NOT reorder.
- The cleaner MUST NOT start its own transaction — it uses the caller's `tx` for atomicity (D-2)
- Remove ONLY the 3 inline topic/evidence/projection deletes — leave all other inline deletes untouched (Phase 1 incremental strategy, D-5)

### Files to read before implementing
- `apps/backend/src/modules/subscriptions/district-deletion-service.ts` — current cascade, imports, transaction usage
- `apps/backend/src/adapters/db/client.ts` — existing `DbClient` type and transaction pattern
- `apps/backend/src/adapters/db/schema/index.ts` — schema exports for topics, acceptedEvidence, topicProjections
- `apps/backend/src/modules/retention/index.ts` — the only module with a barrel export; reference for module interface pattern
- `apps/backend/tests/` — existing test setup and database helper patterns

### Test database
- All tests MUST use `mahalla_ovozi_test` database (AD-3)
- Check existing test setup files for the test database connection pattern
- Do NOT run tests against `mahalla_ovozi` (development database)

## Dev Agent Record

### Debug Log
_empty_

### Completion Notes
_empty_

## File List

_To be populated during implementation_

## Change Log

_To be populated during implementation_

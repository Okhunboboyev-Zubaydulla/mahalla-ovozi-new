---
id: story-7-4
story_key: 7-4-rewrite-deletion-tests-and-retire-monolithic-cascade-test
epic: 7
title: Rewrite Deletion Tests and Retire the Monolithic Cascade Test
status: done
baseline_commit: 10cdc2c64c434ed76bae44206239c088c7344bb6
---

## Story

As a **Developer**,
I want to rewrite the deletion service tests to use mock `DistrictDataCleaner[]` implementations and verify each module in isolation,
So that the deletion service's orchestration correctness is independently verifiable and each module's cleanup is tested in isolation.

## Context

Implements Phase 2 of ADR-001 (District Deletion Cascade Inversion).
- Enable `options.cleaners` dependency injection in `executeDistrictLiveDeletion` with production default
- Create isolated orchestration tests for `executeDistrictLiveDeletion` using mock cleaners
- Verify per-module cleaner tests (10 test files) cover all module-level cleanup in isolation
- Streamline `district-live-deletion.test.ts` to retain a single thin E2E smoke test and API/sweeper tests without redundant 17-table seeding for pure lifecycle assertions.

## Acceptance Criteria

**Given** `ExecuteDistrictLiveDeletionOptions` supports `cleaners?: DistrictDataCleaner[]`
**When** `executeDistrictLiveDeletion` runs
**Then** it uses the provided `cleaners` array or defaults to the production 10 cleaners in strict FK order.

**Given** mock `DistrictDataCleaner` implementations are created for test use
**When** the deletion service test runs
**Then** mock cleaners record whether `deleteDistrictData` was called with the correct `tx` object and `districtId`
**And** the mock cleaners require no database connection
**And** a throwing cleaner rolls back the transaction.

**Given** per-module `deleteDistrictData` integration tests exist
**When** they run against `mahalla_ovozi_test`
**Then** each module's cleanup is independently verified for deletion, tenant isolation, idempotency, and rollback.

**Given** Story 7.4 is complete
**When** full verification runs
**Then** `pnpm typecheck` passes with zero errors
**And** all test suites pass with zero failures.

## Tasks / Subtasks

- [ ] Task 1: Add `cleaners?: DistrictDataCleaner[]` to `ExecuteDistrictLiveDeletionOptions` in `district-deletion-service.ts`
- [ ] Task 2: Create `tests/district-deletion-orchestrator.test.ts` using mock `DistrictDataCleaner` implementations
- [ ] Task 3: Streamline `tests/district-live-deletion.test.ts` (retaining thin E2E smoke test and API routes)
- [ ] Task 4: Run full verification (`pnpm typecheck` & `pnpm test`)

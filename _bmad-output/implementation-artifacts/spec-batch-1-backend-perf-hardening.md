---
title: 'Batch 1 Backend Performance & Reliability Hardening'
type: 'refactor'
created: '2026-08-30'
status: 'done'
baseline_commit: '8ff7291473e9ea932b16f88f3d47b8caf4044daa'
review_loop_iteration: 0
context:
  - '_bmad-output/project-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** High-throughput backend endpoints and database queries suffer from latency and resource risks: unbounded Zod array validation creates an event-loop DoS vulnerability, sequential Telegram webhook queries introduce unnecessary network round trips, missing indexes cause unindexed table scans on growing tables, and 7-14 day pg-boss retention bloats the job queue database.

**Approach:** Apply targeted bounds to Zod schema inputs, consolidate multi-step webhook lookups into a single joined relational query, declare explicit PostgreSQL indexes in Drizzle schemas with generated migrations, and reduce pg-boss retention periods on high-volume queues to 1–3 days.

## Boundaries & Constraints

**Always:**
- Preserve all existing domain behavior, security validations, and exact typed error responses (e.g. `BOT_NOT_FOUND`, `BOT_NOT_VALID`, `DISTRICT_NOT_ACTIVE`, `GROUP_NOT_APPROVED`, `CROSS_DISTRICT_MISMATCH`).
- Generate and verify Drizzle migrations using `pnpm --filter @mahalla-ovozi/backend db:generate`.
- Maintain full TypeScript strictness without using `any` or broad type assertions.

**Ask First:**
- Any change to public API contract responses outside of input constraint bounds (`.max()`).

**Never:**
- Never execute migrations or test fixtures against the development database (`mahalla_ovozi`).
- Never weaken cryptographic or authorization checks to improve performance.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Vocabulary size bound (C-1) | Draft request with > 1000 items | Zod validation rejects with Uzbek error message | Returns 400 Bad Request with field error |
| Valid Telegram webhook auth (H-1) | Valid bot ID and valid mapped group chat ID | `authorized: true` with districtId, mahallaName, botId | N/A |
| Bot not found (H-1) | Unregistered bot ID | `authorized: false, reason: 'BOT_NOT_FOUND'` | Handled cleanly with 200 OK dropped webhook |
| Group not in bot district (H-1) | Group belongs to district A, bot belongs to district B | `authorized: false, reason: 'CROSS_DISTRICT_MISMATCH'` | Handled cleanly with 200 OK dropped webhook |
| Unapproved group (H-1) | Group status != 'VALID' or unmapped chat | `authorized: false, reason: 'GROUP_NOT_APPROVED'` | Handled cleanly with 200 OK dropped webhook |

</frozen-after-approval>

## Code Map

- `packages/api-contracts/src/analysis-settings.ts` -- Zod schema validation for global analysis settings draft
- `apps/backend/src/modules/telegram-intake/telegram-intake-service.ts` -- Webhook multi-tenant authorization and group resolution
- `apps/backend/src/adapters/db/schema/ai.ts` -- Drizzle schema definitions and indexes for `ai_operations`
- `apps/backend/src/adapters/db/schema/topics.ts` -- Drizzle schema definitions and indexes for `topics`
- `apps/backend/src/adapters/jobs/boss-client.ts` -- pg-boss queue default retention and retry configurations
- `apps/backend/drizzle/` -- Generated Drizzle migration SQL files

## Tasks & Acceptance

**Execution:**
- [x] `packages/api-contracts/src/analysis-settings.ts` -- Add `.max(1000)` bound to `globalServiceVocabulary` array -- Prevents event loop blocking / CPU exhaustion DoS from unbounded duplicate-checking iterations.
- [x] `apps/backend/src/modules/telegram-intake/telegram-intake-service.ts` -- Refactor `resolveDistrictBotAndGroup` into a single SQL join query -- Replaces 3 sequential network round trips per message with 1 round trip while preserving all authorization gates.
- [x] `apps/backend/src/adapters/db/schema/ai.ts` -- Add `ai_ops_final_status_idx` on `final_status` and `ai_ops_district_target_idx` on `(districtId, targetId)` -- Eliminates full table scans during status polling and processing delay checks.
- [x] `apps/backend/src/adapters/db/schema/topics.ts` -- Add `topics_latest_evidence_ts_idx` on `(districtId, latestRelevantEvidenceTimestamp DESC)` -- Accelerates sorted topic list retrieval and dashboard rendering.
- [x] `apps/backend/src/adapters/jobs/boss-client.ts` -- Tune default queue retention days for high-throughput queues from 7–14 days down to 1–3 days -- Prevents `pgboss.job` table bloat and disk/memory degradation.
- [x] Run `pnpm --filter @mahalla-ovozi/backend db:generate` -- Generate official Drizzle migration for the new index definitions -- Ensures migration chain is unbroken and database schema is reproducible.

## Acceptance Criteria
- Given a `SaveGlobalAnalysisSettingsDraftSchema` validation, when an array with > 1000 vocabulary items is supplied, then validation fails with an explicit max-length error.
- Given an incoming Telegram webhook, when `resolveDistrictBotAndGroup` executes, then all authorization checks execute in a single consolidated database query with exact unchanged authorization outcomes.
- Given the `ai_operations` and `topics` tables, when filtered or sorted by status and timestamps, then queries utilize dedicated B-tree indexes.
- Given the pg-boss queue configurations, when jobs complete on high-volume queues, their metadata retention is bounded to 1 day.

## Verification

**Commands:**
- `pnpm -r typecheck` -- expected: All packages typecheck cleanly with 0 errors
- `pnpm -r test` -- expected: All unit & integration test suites pass
- `pnpm --filter @mahalla-ovozi/backend db:generate` -- expected: Clean migration generated matching index changes

## Suggested Review Order

**Contract Bounds & DoS Prevention**

- Added upper bound of 1000 items to vocabulary array schema
  [`analysis-settings.ts:169`](../../packages/api-contracts/src/analysis-settings.ts#L169)

**Webhook Ingress & Relational Join Consolidation**

- Consolidated bot, district, and group verification into a single SQL join query
  [`telegram-intake-service.ts:98`](../../apps/backend/src/modules/telegram-intake/telegram-intake-service.ts#L98)

**Database Indexing & Query Acceleration**

- Added status and target lookup indexes on `ai_operations`
  [`ai.ts:69`](../../apps/backend/src/adapters/db/schema/ai.ts#L69)

- Added evidence timestamp query index on `topics`
  [`topics.ts:38`](../../apps/backend/src/adapters/db/schema/topics.ts#L38)

- Generated clean Drizzle migration for new B-tree indexes
  [`0019_cute_puma.sql:1`](../../apps/backend/drizzle/0019_cute_puma.sql#L1)

**Job Queue Retention Optimization**

- Reduced completed job retention for high-throughput queues from 7–14 days to 1–3 days
  [`boss-client.ts:208`](../../apps/backend/src/adapters/jobs/boss-client.ts#L208)

**Test Coverage & Assertions**

- Added unit test verifying vocabulary array max constraint rejection
  [`analysis-settings-contracts.test.ts:1`](../../packages/api-contracts/tests/analysis-settings-contracts.test.ts#L1)

- Updated queue retention configuration unit test expectations
  [`boss-client.test.ts:48`](../../apps/backend/tests/boss-client.test.ts#L48)

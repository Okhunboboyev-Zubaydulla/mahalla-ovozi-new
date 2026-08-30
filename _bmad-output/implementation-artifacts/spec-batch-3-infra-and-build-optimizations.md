---
title: 'Batch 3 Backend Infrastructure & Build Optimizations'
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

**Problem:** Large JSON payloads (such as multi-lane topic boards and audit records) were transferred uncompressed, consuming unnecessary network bandwidth; PostgreSQL pool clients lacked explicit statement timeouts, posing connection-lock risks during long-running or stalled queries; topic evidence detail queries executed 3 independent queries sequentially; and TypeScript compiler runs rebuilt everything from scratch without incremental cache files.

**Approach:** Register `@fastify/compress` with a 1KB threshold in `buildHttpServer`, configure a safe 15-second `statement_timeout` on PostgreSQL pool configurations with override support, parallelize independent projection/count/evidence queries in `getTopicEvidence` using `Promise.all`, and enable TypeScript incremental compilation across `tsconfig.base.json`.

## Boundaries & Constraints

**Always:**
- Keep all Fastify plugins properly registered before domain routes.
- Preserve full multi-tenant security boundaries and exact response formats.
- Maintain full TypeScript strictness without using `any` or broad assertions.

**Ask First:**
- Any change to global HTTP error handling formats or timeout thresholds.

**Never:**
- Never remove or break existing unit tests or integration tests.
- Never set `statement_timeout` too low (< 5s) which could disrupt normal batch migration routines.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Large JSON Payload (M-1) | Response body > 1KB with `Accept-Encoding: gzip` | Response compressed with `Content-Encoding: gzip` | Small payloads (< 1KB) bypass compression |
| Stalled Query Prevention (M-2) | DB query exceeding 15 seconds | Postgres cancels statement with `statement_timeout` error | Handled via DB error mapper |
| Topic Evidence Fetch (M-3) | Hokim requests topic evidence | Projection, evidence count, and timeline rows queried in parallel | 1 round trip instead of 3 sequential round trips |
| Incremental TS Build (L-2) | `pnpm typecheck` or `pnpm build` | Uses cached `.tsbuildinfo` for sub-second re-checks | N/A |

</frozen-after-approval>

## Code Map

- `apps/backend/src/entrypoints/http.ts` -- Fastify HTTP server builder and `@fastify/compress` plugin registration
- `apps/backend/src/adapters/db/client.ts` -- PostgreSQL connection pool creation with `statement_timeout` and options override
- `apps/backend/src/modules/topics/topic-evidence-service.ts` -- Topic evidence and timeline parallelization
- `tsconfig.base.json` -- Incremental build configuration for monorepo packages
- `apps/backend/tests/http-compression.test.ts` -- Unit tests for HTTP compression and DB pool statement_timeout

## Tasks & Acceptance

**Execution:**
- [x] `apps/backend/src/entrypoints/http.ts` -- Register `@fastify/compress` with `threshold: 1024` -- Compresses HTTP response bodies >= 1KB to reduce network egress latency.
- [x] `apps/backend/src/adapters/db/client.ts` -- Configure `statement_timeout: 15000` (or `DB_STATEMENT_TIMEOUT_MS`) on the PostgreSQL Pool with custom options support -- Prevents runaway/stalled queries from exhausting pool connections.
- [x] `apps/backend/src/modules/topics/topic-evidence-service.ts` -- Execute `topicProjections`, `acceptedEvidence` count, and raw evidence queries in parallel with `Promise.all` -- Eliminates sequential database round trips for topic evidence retrieval.
- [x] `tsconfig.base.json` -- Enable `"incremental": true` -- Speeds up typecheck and build cycles across monorepo packages.
- [x] `apps/backend/tests/http-compression.test.ts` -- Add unit tests verifying compression and pool timeout -- Verifies infrastructure behavior.

## Acceptance Criteria
- Given a client requesting data with `Accept-Encoding: gzip`, when payload >= 1KB, then Fastify compresses the response.
- Given the PostgreSQL connection pool, all client connections enforce a 15-second statement timeout boundary.
- Given `TopicEvidenceService.getTopicEvidence`, projection, count, and evidence queries execute concurrently.
- Given `pnpm -r typecheck`, incremental build cache files are generated and reused.

## Verification

**Commands:**
- `pnpm -r typecheck` -- expected: Clean typecheck with incremental cache (< 4s)
- `pnpm -r test` -- expected: 100% passing tests across all 110 test suites (1,144 tests)

## Suggested Review Order

**HTTP Response Compression**

- Registered `@fastify/compress` with a 1KB threshold in Fastify server builder
  [`http.ts:116`](../../apps/backend/src/entrypoints/http.ts#L116)

**Database Connection & Query Timeout Guard**

- Configured `statement_timeout` with clean env fallback and options overrides
  [`client.ts:7`](../../apps/backend/src/adapters/db/client.ts#L7)

**Topic Evidence Query Parallelization**

- Parallelized projection, count, and evidence rows in `getTopicEvidence` via `Promise.all`
  [`topic-evidence-service.ts:189`](../../apps/backend/src/modules/topics/topic-evidence-service.ts#L189)

**Build & Compiler Acceleration**

- Enabled TypeScript incremental compilation in base configuration
  [`tsconfig.base.json:31`](../../tsconfig.base.json#L31)

**Automated Test Verification**

- Added integration tests for HTTP response compression and pool timeout verification
  [`http-compression.test.ts:1`](../../apps/backend/tests/http-compression.test.ts#L1)

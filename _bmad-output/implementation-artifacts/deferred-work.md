# Deferred Work

## Deferred from: code review of 3-4-filter-current-and-retained-topics.md (2026-08-24)

- **N+1 SQL Queries / Parallel Count Overhead in `getTodayBoard`** (`apps/backend/src/modules/topics/hokim-topic-service.ts:160-200`): Each active lane executes both topic retrieval and an independent `SELECT COUNT(DISTINCT t.id)` query. Pre-existing pattern from Story 3.1 board architecture; defer optimization to a dedicated performance epic.
- **Unchecked `req.actor` Cast in Fastify Route Handlers** (`apps/backend/src/modules/topics/hokim-topics-routes.ts:40,84,136`): Route handlers typecast `req.actor as { id: string; districtId: string; role: string }`. Pre-existing pattern across topic route handlers; defer to centralized Fastify auth decorator refactor.

## Deferred from: code review of 3-7-search-current-and-retained-topics-privately.md (2026-08-24)

- **GIN Trigram / Text Search Indexing for JSONB Evidence Queries** (`apps/backend/src/modules/topics/hokim-topic-service.ts:471-476, 633-638, 763-768`): Lexical pattern matching against `ae.verbatim_text` and `ae.user_metadata` JSONB attributes uses parameterized PostgreSQL ILIKE within active district scope. Future high-volume evidence queries may benefit from GIN trigram index migrations; defer to a dedicated database performance optimization epic.

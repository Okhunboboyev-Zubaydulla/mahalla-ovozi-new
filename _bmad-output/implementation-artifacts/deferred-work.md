# Deferred Work

## Deferred from: code review of 3-4-filter-current-and-retained-topics.md (2026-08-24)

- **N+1 SQL Queries / Parallel Count Overhead in `getTodayBoard`** (`apps/backend/src/modules/topics/hokim-topic-service.ts:160-200`): Each active lane executes both topic retrieval and an independent `SELECT COUNT(DISTINCT t.id)` query. Pre-existing pattern from Story 3.1 board architecture; defer optimization to a dedicated performance epic.
- **Unchecked `req.actor` Cast in Fastify Route Handlers** (`apps/backend/src/modules/topics/hokim-topics-routes.ts:40,84,136`): Route handlers typecast `req.actor as { id: string; districtId: string; role: string }`. Pre-existing pattern across topic route handlers; defer to centralized Fastify auth decorator refactor.

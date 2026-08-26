# Deferred Work Tracker

## Deferred from: code review of 4-1-inspect-truthful-system-and-district-health.md (2026-08-25)

- **Add composite index `(district_id, created_at DESC)` on `ai_operations` table (`apps/backend/src/adapters/db/schema/ai.ts:53-64`):**
  - *Reason:* Pre-existing schema from Epic 2. Adding composite index optimizes high-frequency health sorting for districts with massive AI operation history, but requires generating and applying a database migration outside the scope of Story 4.1.

## Deferred from: code review of 4-4-inspect-immutable-searchable-audit-history.md (2026-08-26)

- **Evaluate GIN / pg_trgm index optimization for high-scale multi-column audit search (`apps/backend/src/adapters/db/schema/audit.ts:19-26`):**
  - *Reason:* Allowlisted ILIKE search with composite B-Tree indexes satisfies NFR2 (<2s response) under regular operations. Future enterprise scale with millions of audit events can introduce `pg_trgm` GIN indexes via an isolated database migration.


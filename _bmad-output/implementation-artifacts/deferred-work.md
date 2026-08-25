# Deferred Work Tracker

## Deferred from: code review of 4-1-inspect-truthful-system-and-district-health.md (2026-08-25)

- **Add composite index `(district_id, created_at DESC)` on `ai_operations` table (`apps/backend/src/adapters/db/schema/ai.ts:53-64`):**
  - *Reason:* Pre-existing schema from Epic 2. Adding composite index optimizes high-frequency health sorting for districts with massive AI operation history, but requires generating and applying a database migration outside the scope of Story 4.1.

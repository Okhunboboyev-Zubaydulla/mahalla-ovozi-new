# Deferred Work Items

## Deferred from: code review of 6-1-review-and-maintain-district-subscription-records.md (2026-08-27)

- **PostgreSQL check constraint and strict enum for `scheduled_transition_type`**: `apps/backend/src/adapters/db/schema/district-subscriptions.ts:14` — Transition type validation and scheduled job transitions will be formally introduced and constrained during Story 6.2 (Grace and Transition automation).

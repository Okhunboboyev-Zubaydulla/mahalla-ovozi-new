# Deferred Work Items

## Deferred from: code review of 6-1-review-and-maintain-district-subscription-records.md (2026-08-27)

- **PostgreSQL check constraint and strict enum for `scheduled_transition_type`**: `apps/backend/src/adapters/db/schema/district-subscriptions.ts:14` — Transition type validation and scheduled job transitions will be formally introduced and constrained during Story 6.2 (Grace and Transition automation).

## Deferred from: code review of 6-4-execute-permanent-live-system-district-deletion.md (2026-08-28)

- **Inflight intake qualification worker error handling on purged records**: `apps/backend/src/modules/intake/` — Pre-existing intake qualification handler throws unhandled error if intake record row is deleted before checking district lifecycle status.

# Deferred Work Log

## Deferred from: code review of story-1.3 (2026-08-18)
- Add database index on foreign key `disclosure_confirmed_by_id` in `districts` table schema (`apps/backend/src/adapters/db/schema/districts.ts:15`) to optimize large-scale account deletion cascades during database performance tuning phase.

## Deferred from: code review of 1-6-create-and-manage-the-district-hokim-account.md (2026-08-20)
- Dynamic session invalidation when linked district transitions to suspended/cancelled (`apps/backend/src/modules/auth/session-manager.ts:65`) — to be integrated during Story 1.7 district lifecycle transitions.
- Change `accounts.district_id` foreign key `onDelete` behavior from cascade to restrict (`apps/backend/src/adapters/db/schema/accounts.ts:13`) to preserve historical audit references during future schema refactoring.

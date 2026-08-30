---
id: story-7-3
story_key: 7-3-migrate-remaining-module-cleaners-and-complete-phase-1
epic: 7
title: Migrate Remaining Module Cleaners and Complete Phase 1
status: review
baseline_commit: 10cdc2c64c434ed76bae44206239c088c7344bb6
---

## Story

As a **Developer**,
I want to migrate the remaining modules (issues, auth, telegram-groups, telegram-bots, audit, subscriptions) into `DistrictDataCleaner` implementations,
So that the deletion cascade body contains zero inline schema references to modules outside `subscriptions`.

## Context

Implements Phase 1, Step 3 of ADR-001 (District Deletion Cascade Inversion).
Completes the module-level cleanup delegation across the entire codebase:
- `issues`: district-scoped `operational_issues`
- `auth`: `sessions` -> `user_dashboard_visits` -> `accounts`
- `telegram-groups`: `district_telegram_groups`
- `telegram-bot`: `district_telegram_bots`
- `audit`: `audit_events`
- `subscriptions`: `district_subscriptions`

Inline remaining logic in `district-deletion-service.ts`:
- Deletion of `del_fail:<districtId>` operational issues (orchestrator lifecycle artifact)
- Final deletion of `districts` parent row

## Acceptance Criteria

**Given** the issues cleaner is implemented
**When** `deleteDistrictData(tx, districtId)` is called
**Then** only `operationalIssues` rows where `districtId` matches are deleted
**And** `del_fail:<districtId>` operational issue records are NOT deleted by the issues cleaner — the deletion service handles them directly.

**Given** the auth cleaner is implemented
**When** `deleteDistrictData(tx, districtId)` is called
**Then** `sessions` and `user_dashboard_visits` are deleted before `accounts` rows (FK order).

**Given** telegram-groups, telegram-bots, audit, and subscriptions cleaners are implemented
**When** `deleteDistrictData(tx, districtId)` is called
**Then** each cleaner purges its own district-scoped table(s) within the provided transaction.

**Given** all 10 cleaners are registered in the `DistrictDataCleaner[]` array
**When** the cascade body in `district-deletion-service.ts` is reviewed
**Then** it contains zero inline `tx.delete()` or `tx.execute()` calls for modules outside `subscriptions`
**And** the only inline deletes remaining are: `del_fail:<districtId>` operational issues and the final `districts` parent row
**And** the schema import block in `district-deletion-service.ts` imports only `districts`, `districtDeletionRecords`, `operationalIssues`, and `DistrictDeletionRecordEntity`
**And** all existing integration and lifecycle tests pass.

## Tasks / Subtasks

- [ ] Task 1: Implement `createIssuesDataCleaner` in `apps/backend/src/modules/issues/issues-data-cleaner.ts`
- [ ] Task 2: Implement `createAuthDataCleaner` in `apps/backend/src/modules/auth/auth-data-cleaner.ts`
- [ ] Task 3: Implement `createTelegramGroupsDataCleaner` in `apps/backend/src/modules/telegram-groups/telegram-groups-data-cleaner.ts`
- [ ] Task 4: Implement `createTelegramBotsDataCleaner` in `apps/backend/src/modules/telegram-bot/telegram-bot-data-cleaner.ts`
- [ ] Task 5: Implement `createAuditDataCleaner` in `apps/backend/src/modules/audit/audit-data-cleaner.ts`
- [ ] Task 6: Implement `createSubscriptionsDataCleaner` in `apps/backend/src/modules/subscriptions/subscriptions-data-cleaner.ts`
- [ ] Task 7: Update `district-deletion-service.ts`
  - [ ] Register all 10 cleaners in `DistrictDataCleaner[]` array in exact FK topological order
  - [ ] Remove inline deletes for tables 9-16 (except `del_fail` issue and `districts` parent row)
  - [ ] Clean up schema imports
- [ ] Task 8: Integration tests for each new cleaner
- [ ] Task 9: Full test suite verification & validation

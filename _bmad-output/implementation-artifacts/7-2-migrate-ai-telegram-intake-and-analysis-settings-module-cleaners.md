---
id: story-7-2
story_key: 7-2-migrate-ai-telegram-intake-and-analysis-settings-module-cleaners
epic: 7
title: Migrate AI, Telegram Intake, and Analysis Settings Module Cleaners
status: review
baseline_commit: 10cdc2c64c434ed76bae44206239c088c7344bb6
---

## Story

As a **Developer**,
I want to migrate the `ai`, `telegram-intake`, and analysis settings deletion logic into `DistrictDataCleaner` implementations,
So that these three modules stop being referenced by name in the subscriptions deletion cascade.

## Context

Implements Phase 1, Step 2 of ADR-001 (District Deletion Cascade Inversion). We migrate:
1. AI module cleaner: `ai_provider_attempts` (via parameterized subquery) -> `ai_operations`
2. Telegram Intake module cleaner: `telegram_intake_records`
3. Analysis Settings module cleaner: `district_analysis_settings_drafts` -> `district_analysis_settings_versions`

The corresponding inline deletes in `district-deletion-service.ts` are removed and replaced with cleaner invocations in the `cleaners` array in strict FK dependency order.

## Acceptance Criteria

**Given** the AI cleaner is implemented
**When** `deleteDistrictData(tx, districtId)` is called
**Then** `ai_provider_attempts` rows are deleted before `ai_operations` rows via parameterized query/Drizzle
**And** only records belonging to `districtId` are deleted
**And** failure rolls back the caller transaction.

**Given** the telegram-intake cleaner is implemented
**When** `deleteDistrictData(tx, districtId)` is called
**Then** all `telegram_intake_records` for the given districtId are deleted within the caller's transaction.

**Given** the analysis settings cleaner is implemented
**When** `deleteDistrictData(tx, districtId)` is called
**Then** `district_analysis_settings_drafts` are deleted before `district_analysis_settings_versions`
**And** both deletions are scoped strictly to the given districtId.

**Given** all three cleaners are registered and their inline deletes removed
**When** `executeDistrictLiveDeletion` runs
**Then** the cascade body executes them via the `cleaners` array in topological order: `topics` -> `ai` -> `telegram-intake` -> `analysis-settings`
**And** the schema imports for `aiOperations`, `telegramIntakeRecords`, `districtAnalysisSettingsDrafts`, `districtAnalysisSettingsVersions` are removed from `district-deletion-service.ts`
**And** existing deletion tests pass without regression.

**Given** Story 7.2 is verified
**When** focused automated tests run
**Then** integration tests verify each cleaner purges its tables cleanly, respects district isolation, is idempotent, and participates in transaction rollback.

## Tasks / Subtasks

- [ ] Task 1: Implement `createAiDataCleaner` in `apps/backend/src/modules/ai/ai-data-cleaner.ts`
  - [ ] Delete `ai_provider_attempts` referencing operations in `districtId`
  - [ ] Delete `ai_operations` matching `districtId`
  - [ ] Set `moduleName: 'ai'`
- [ ] Task 2: Implement `createTelegramIntakeDataCleaner` in `apps/backend/src/modules/telegram-intake/telegram-intake-data-cleaner.ts`
  - [ ] Delete `telegram_intake_records` matching `districtId`
  - [ ] Set `moduleName: 'telegram-intake'`
- [ ] Task 3: Implement `createAnalysisSettingsDataCleaner` in `apps/backend/src/modules/ai/district-analysis-settings-data-cleaner.ts`
  - [ ] Delete `district_analysis_settings_drafts` then `district_analysis_settings_versions` matching `districtId`
  - [ ] Set `moduleName: 'analysis-settings'`
- [ ] Task 4: Register cleaners in `district-deletion-service.ts`
  - [ ] Add `createAiDataCleaner()`, `createTelegramIntakeDataCleaner()`, and `createAnalysisSettingsDataCleaner()` to `cleaners` array
  - [ ] Remove inline deletes for tables 4, 5, 6, 7, 8
  - [ ] Remove unused schema imports
- [ ] Task 5: Integration tests
  - [ ] Create tests for AI, Telegram Intake, and Analysis Settings cleaners
  - [ ] Verify test suite against `mahalla_ovozi_test`
- [ ] Task 6: Validation & Verification
  - [ ] `pnpm typecheck` passes
  - [ ] `pnpm test` passes

## Dev Notes
- Strict FK order: `topics` -> `ai` -> `telegram-intake` -> `analysis-settings`
- All cleaners must use provided `tx` and not create new transactions.

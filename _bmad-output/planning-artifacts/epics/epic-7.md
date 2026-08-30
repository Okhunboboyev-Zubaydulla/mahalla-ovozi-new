## Epic 7: District Deletion Cascade Inversion (ADR-001)

Invert the centralized deletion cascade in `district-deletion-service.ts` so each backend module owns its cleanup contract via the `DistrictDataCleaner` interface. After this epic the `subscriptions` module no longer imports foreign schema tables; each module encapsulates its own `deleteDistrictData` implementation inside the shared `DbTransaction`. The deletion service becomes a pure orchestrator of ~30 LOC. Governed by ADR-001.

**Architectural invariants covered:** AD-1, AD-3, AD-9, AD-11.

---

### Story 7.1: Define DistrictDataCleaner Interface and Migrate Topics Module

As a **Developer**,
I want to define the `DistrictDataCleaner` interface and migrate the `topics` module's deletion logic into it,
So that the first and largest module cleaner is validated end-to-end before the remaining modules follow.

**Context (ADR-001 D-2, D-5):**
- Define `DistrictDataCleaner` interface in `apps/backend/src/modules/subscriptions/ports/district-data-cleaner.ts`
- Export `DbTransaction` type from `apps/backend/src/adapters/db/client.ts`
- Implement `createTopicsDataCleaner()` in `apps/backend/src/modules/topics/` that deletes: `topic_projections`, `accepted_evidence`, `topics` (in that FK order)
- Register the cleaner in the `DistrictDataCleaner[]` array in `district-deletion-service.ts` at the correct FK position
- Remove the three corresponding inline deletes from the cascade

**Acceptance Criteria:**

**Given** the `DistrictDataCleaner` interface is defined
**When** a module implements it
**Then** the interface requires `moduleName: string` and `deleteDistrictData(tx: DbTransaction, districtId: string): Promise<void>`
**And** the `DbTransaction` type is the Drizzle transaction type, exported from `adapters/db/client.ts`
**And** the interface file lives at `apps/backend/src/modules/subscriptions/ports/district-data-cleaner.ts`.

**Given** the topics cleaner is implemented
**When** `deleteDistrictData(tx, districtId)` is called
**Then** it deletes `topic_projections` before `accepted_evidence` before `topics` — in that FK order — within the caller's transaction
**And** no rows from other modules are touched
**And** if any delete fails the entire transaction rolls back (atomicity inherited from caller).

**Given** the topics cleaner is registered in `district-deletion-service.ts`
**When** `executeDistrictLiveDeletion` runs
**Then** the cleaner is called with the active transaction and districtId
**And** the three previously inline deletes for `topic_projections`, `accepted_evidence`, and `topics` are removed from the cascade body
**And** the overall deletion behavior is functionally identical to the prior implementation.

**Given** Story 7.1 is verified
**When** focused automated tests run
**Then** an integration test for `createTopicsDataCleaner` against `mahalla_ovozi_test` seeds a district with topics, evidence, and projections, calls `deleteDistrictData`, and asserts all three tables are empty for that districtId
**And** the existing full-cascade integration test (if it exists) still passes — it is not yet retired in this story.

---

### Story 7.2: Migrate AI, Telegram Intake, and Analysis Settings Module Cleaners

As a **Developer**,
I want to migrate the `ai`, `telegram-intake`, and analysis settings deletion logic into `DistrictDataCleaner` implementations,
So that these three modules stop being referenced by name in the subscriptions deletion cascade.

**Context (ADR-001 D-3, D-5):**
- Implement `createAiDataCleaner()` in `apps/backend/src/modules/ai/` that:
  - First deletes `ai_provider_attempts` via raw SQL (child of `ai_operations`, no named Drizzle export): `DELETE FROM ai_provider_attempts WHERE operation_id IN (SELECT id FROM ai_operations WHERE district_id = $districtId)`
  - Then deletes `ai_operations` via Drizzle
- Implement `createTelegramIntakeDataCleaner()` in `apps/backend/src/modules/telegram-intake/` that deletes `telegram_intake_records`
- Implement `createAnalysisSettingsDataCleaner()` in `apps/backend/src/modules/ai/` (or `ai` submodule) that deletes `district_analysis_settings_drafts` then `district_analysis_settings_versions`
- Register all three cleaners in the array at their correct FK positions; remove corresponding inline deletes from the cascade

**Acceptance Criteria:**

**Given** the AI cleaner is implemented
**When** `deleteDistrictData(tx, districtId)` is called
**Then** `ai_provider_attempts` rows are deleted before `ai_operations` rows via the raw SQL subquery — preserving FK order
**And** no Drizzle schema export for `ai_provider_attempts` or `sessions` is required; raw SQL inside the module is an acceptable implementation detail (ADR-001 D-3)
**And** the raw SQL uses the parameterized districtId to prevent injection.

**Given** the telegram-intake cleaner is implemented
**When** `deleteDistrictData(tx, districtId)` is called
**Then** all `telegram_intake_records` for the given districtId are deleted within the caller's transaction.

**Given** the analysis settings cleaner is implemented
**When** `deleteDistrictData(tx, districtId)` is called
**Then** `district_analysis_settings_drafts` are deleted before `district_analysis_settings_versions`
**And** both deletions are scoped strictly to the given districtId.

**Given** all three cleaners are registered and their inline deletes removed
**When** `executeDistrictLiveDeletion` runs
**Then** the cascade body no longer contains references to `aiOperations`, `telegramIntakeRecords`, `districtAnalysisSettingsDrafts`, `districtAnalysisSettingsVersions`, or the `ai_provider_attempts` raw SQL string
**And** functional behavior is identical to the prior implementation.

**Given** Story 7.2 is verified
**When** focused automated tests run
**Then** integration tests for each new cleaner against `mahalla_ovozi_test` seed and verify the relevant tables are cleared without touching other modules' tables
**And** the existing full-cascade integration test still passes.

---

### Story 7.3: Migrate Remaining Module Cleaners and Complete Phase 1

As a **Developer**,
I want to migrate the remaining modules (issues, auth, telegram-groups, telegram-bots, audit, subscriptions) into `DistrictDataCleaner` implementations,
So that the deletion cascade body contains zero inline schema references to modules outside `subscriptions`.

**Context (ADR-001 D-1, D-3, D-5):**
- Implement `createIssuesDataCleaner()` in `apps/backend/src/modules/issues/` that:
  - Deletes only district-scoped `operationalIssues` (where `districtId = $districtId`)
  - Does NOT delete `del_fail:<districtId>` records — those remain in the deletion service directly (ADR-001 D-1)
- Implement `createAuthDataCleaner()` in `apps/backend/src/modules/auth/` that:
  - Deletes `sessions` via raw SQL: `DELETE FROM sessions WHERE account_id IN (SELECT id FROM accounts WHERE district_id = $districtId)`
  - Then deletes `accounts` via Drizzle
- Implement `createTelegramGroupsDataCleaner()` in `apps/backend/src/modules/telegram-groups/` that deletes `district_telegram_groups`
- Implement `createTelegramBotsDataCleaner()` in `apps/backend/src/modules/telegram-bot/` that deletes `district_telegram_bots`
- Implement `createAuditDataCleaner()` in `apps/backend/src/modules/audit/` that deletes `audit_events`
- Implement `createSubscriptionsDataCleaner()` in `apps/backend/src/modules/subscriptions/` that deletes `district_subscriptions` (NOT `districts` — that final row stays in the deletion service)
- Register all cleaners; remove all corresponding inline deletes from the cascade
- The `del_fail:<districtId>` delete and the final `districts` row delete remain inline in the deletion service — these are lifecycle artefacts owned by the orchestrator itself

**Acceptance Criteria:**

**Given** the issues cleaner is implemented
**When** `deleteDistrictData(tx, districtId)` is called
**Then** only `operationalIssues` rows where `districtId` matches are deleted
**And** `del_fail:<districtId>` operational issue records are NOT deleted by the issues cleaner — the deletion service handles them directly
**And** this distinction is documented by a comment in both the cleaner and the deletion service cascade body.

**Given** the auth cleaner is implemented
**When** `deleteDistrictData(tx, districtId)` is called
**Then** `sessions` for the district's accounts are deleted before `accounts` rows (FK order)
**And** the raw SQL subquery for sessions uses the parameterized districtId.

**Given** all cleaners are registered and Phase 1 is complete
**When** the cascade body in `district-deletion-service.ts` is reviewed
**Then** it contains zero inline `tx.delete()` or `tx.execute()` calls for modules outside `subscriptions`
**And** the only inline deletes remaining are: `del_fail:<districtId>` operational issues and the final `districts` parent row
**And** the schema import block no longer includes `topicProjections`, `acceptedEvidence`, `topics`, `aiOperations`, `telegramIntakeRecords`, `districtAnalysisSettingsDrafts`, `districtAnalysisSettingsVersions`, `operationalIssues` (general), `userDashboardVisits`, `accounts`, `districtTelegramGroups`, `districtTelegramBots`, `auditEvents`

**Given** the `DistrictDataCleaner[]` array is complete
**When** it is reviewed
**Then** each entry position is explained by a comment that names the FK constraint reason
**And** the array is in the order: topics → ai → telegramIntake → analysisSettings → issues → auth → telegramGroups → telegramBots → audit → subscriptions

**Given** Story 7.3 is verified
**When** focused automated tests run
**Then** integration tests for each new cleaner seed and verify the relevant tables are cleared
**And** the existing full-cascade integration test still passes (it is retired in Story 7.4).

---

### Story 7.4: Rewrite Deletion Tests and Retire the Monolithic Cascade Test (Phase 2)

As a **Developer**,
I want to rewrite the deletion service tests to use mock `DistrictDataCleaner[]` implementations and add per-module integration tests,
So that the deletion service's orchestration correctness is independently verifiable without a full database, and each module's cleanup is verifiable in isolation.

**Context (ADR-001 D-4, D-5):**
Phase 2 of ADR-001. The cascade is fully inverted after Story 7.3. Now improve the test surface.

**Acceptance Criteria:**

**Given** mock `DistrictDataCleaner` implementations are created for test use
**When** the deletion service test runs
**Then** mock cleaners record whether `deleteDistrictData` was called with the correct `tx` object and `districtId`
**And** the mock cleaners require no database connection
**And** the test does not seed any database tables.

**Given** the deletion service tests are rewritten to use mocks
**When** they run against the mock cleaners
**Then** they verify: each registered cleaner's `deleteDistrictData` is called exactly once with the correct arguments
**And** the tombstone record is inserted into `district_deletion_records`
**And** the audit event is recorded via `recordAuditEvent`
**And** the external tombstone store receives the formatted deletion record
**And** the `del_fail:<districtId>` inline delete is executed
**And** the final `districts` row delete is executed
**And** a failure in any cleaner rolls back the transaction and surfaces the error.

**Given** per-module `deleteDistrictData` integration tests are added
**When** they run against `mahalla_ovozi_test`
**Then** each test: creates a minimal district, seeds the module's specific tables, calls `deleteDistrictData` inside a test transaction, and asserts those tables are empty for the districtId
**And** each test asserts that tables belonging to OTHER modules are not touched (no cross-module side effects)
**And** tests run strictly against `mahalla_ovozi_test` never the development database (AD-3).

**Given** the monolithic full-cascade integration test is identified
**When** Story 7.4 is complete
**Then** the monolithic test is retired (deleted or replaced) in favor of the two independently valuable test surfaces
**And** a single thin E2E smoke test (Playwright or Vitest integration) seeds a full district, calls the real `executeDistrictLiveDeletion`, and asserts the district no longer exists in any module's tables
**And** CI remains green.

**Given** Story 7.4 is verified
**When** the full test suite runs
**Then** `pnpm typecheck` passes with zero errors
**And** `pnpm test` passes with zero failures
**And** the deletion service test file no longer seeds a full district in the database.

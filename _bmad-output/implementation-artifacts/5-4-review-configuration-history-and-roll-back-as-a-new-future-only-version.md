---
baseline_commit: ce24464e6398903c9a6e7f15bf388de04de5a3b7
---

# Story 5.4: Review Configuration History and Roll Back as a New Future-Only Version

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the **Product Owner**,  
I want to review previous configuration versions and restore a known earlier configuration as a new active version,  
So that I can safely recover from an undesirable configuration change without rewriting history or replaying past processing.

## Acceptance Criteria

1. **Global Configuration History Presentation & Read-Only Invariance (AC 1)**
   - **Given** an authenticated Product Owner opens AI Operations > History (`Созламалар тарихи`)
   - **When** Global Settings history is selected
   - **Then** the system displays the complete immutable activated-version history for Global configuration
   - **And** each version record clearly identifies its version identifier (e.g. `gcfg_v1`, `gcfg_v2`), version number, model provider, model ID, activation timestamp (formatted in `Asia/Tashkent` timezone), activating actor, and operational change reason
   - **And** the currently active version is prominently identified with an active badge (`Фаол`)
   - **And** historical versions are marked as immutable archive records (`Тарихий`)
   - **And** historical records cannot be directly edited, deleted, overwritten, or marked active in place
   - **And** District-specific versions are never mixed into the Global configuration history.

2. **Explicit District Scope Required for District History (AC 2, AD-9)**
   - **Given** the Product Owner opens AI Operations > History
   - **When** District Settings history is selected without an active District selected
   - **Then** the system requires selecting an explicit District before displaying District configuration history
   - **And** missing District scope is never interpreted as global, cross-district, or all-district scope
   - **And** when an explicit District is selected, only versions belonging to that District are displayed (e.g. `dcfg_dist_123_v1`)
   - **And** the currently active District version is clearly identifiable
   - **And** Global versions and versions from other Districts are never exposed or mixed into that District's history.

3. **Rollback Review Initiation & Field-Level Comparison (AC 3, AC 4)**
   - **Given** the Product Owner selects a historical configuration version for rollback
   - **When** the rollback review modal (`Созламаларни қайтариш`) opens
   - **Then** the system clearly identifies the target historical source version (e.g. `gcfg_v2`) and the current active baseline version (e.g. `gcfg_v5`)
   - **And** the exact Global or District scope (with explicit District name and ID) is visibly displayed
   - **And** the proposed configuration to be restored is compared against the currently active configuration using a field-level diff
   - **And** additions, removals, and modifications are understandable without relying on color alone (e.g. `+` / `-` / `~` textual badges, semantic icons, explicit status labels)
   - **And** monospaced prompt diffs, model parameters, and vocabulary changes remain readable with keyboard-scrollable regions and zero page-level horizontal overflow.

4. **No-Op Rollback Prevention on Currently Active Version (AC 5)**
   - **Given** the Product Owner selects the currently active configuration version as the rollback target
   - **When** rollback is evaluated or requested
   - **Then** rollback is blocked from proceeding
   - **And** no new configuration version is created in the database
   - **And** the Product Owner receives a specific, sanitized explanation in Uzbek Cyrillic (`Танланган версия аллақачон фаол ҳисобланади. Қайтариш учун олдинги тарихий версияни танланг.`).

5. **Explicit Confirmation Modal & Future-Only Invariant Disclosure (AC 6, AD-8)**
   - **Given** the Product Owner intends to roll back to a valid historical version
   - **When** they proceed to the confirmation step
   - **Then** the confirmation modal explicitly explains the rollback mechanism:
     - 1. A **new configuration version** will be created and activated (e.g. restoring `V2` while `V5` is active creates `V6` with `V2`'s configuration)
     - 2. The selected historical version (`V2`) itself remains an unchanged immutable historical record
     - 3. The previous active version (`V5`) remains preserved in history as inactive
     - 4. The change affects **future processing only**
     - 5. Completed historical message-level decisions (`SEMANTIC_RELEVANCE`, `TOPIC_MATCHING`, `TOPIC_DERIVED_PROJECTION`) will **not** be replayed, reassessed, or rewritten
   - **And** cancelling returns keyboard focus safely to the initiating control without performing any database mutation.

6. **Mandatory Operational Change Reason & Secret Sanitization (AC 7)**
   - **Given** the rollback confirmation modal is open
   - **When** the Product Owner enters the rollback change reason (`changeReason`)
   - **Then** a non-empty, non-sensitive reason is strictly required (min 5 characters, max 500 characters)
   - **And** help text explicitly warns: *"Қайтариш сабабини киритинг. Сабабда шахсий маълумотлар, Telegram бот токенлари ёки API калитларни ёзиш қатъиян ман этилади."*
   - **And** client-side and server-side validation scan for known product secrets (`PROHIBITED_SECRET_PATTERNS` rejecting Telegram bot tokens, OpenAI keys, Google Gemini keys, Groq keys, Anthropic keys, Bearer tokens, and JWTs)
   - **And** any detected secret is rejected with a sanitized field-level validation error (`Махфий маълумотлар кўрсатилиши мумкин эмас`)
   - **And** no general PII-redaction workflow is introduced.

7. **Atomic Rollback as a New Immutable Version Creation (AC 8, AD-8)**
   - **Given** the historical target version and current active baseline match (`baseActiveVersionId`)
   - **When** the Product Owner confirms rollback
   - **Then** the server atomically in a single PostgreSQL transaction:
     1. Obtains a row lock (`FOR UPDATE`) on the currently active configuration version
     2. Validates that `baseActiveVersionId` matches the currently active version (optimistic concurrency guard)
     3. Fetches the target historical version and confirms it exists within the target scope
     4. Deactivates the prior active version (`isActive = false`)
     5. Computes the next monotonic version number (`max(version) + 1`) and generates the new ID (`gcfg_v{next}` or `dcfg_{districtId}_v{next}`)
     6. Inserts a new immutable version record copying configuration fields from the historical target, with `isActive = true`, `activatedAt = new Date()`, `activatedBy = actor.id`, and `changeReason = payload.changeReason.trim()`
     7. Preserves the historical source version and all intervening versions completely unmodified
     8. Records an immutable audit event (`GLOBAL_ANALYSIS_SETTINGS_ROLLED_BACK` or `DISTRICT_ANALYSIS_SETTINGS_ROLLED_BACK`)
   - **And** the newly created version becomes authoritative for future processing in that scope only upon successful transaction commit.

8. **Authoritative UI State Synchronization & Optimistic Lock Prevention (AC 9)**
   - **Given** rollback succeeds on the backend
   - **When** the authoritative server response returns
   - **Then** the UI reports success only after that response (zero optimistic success)
   - **And** the new active version identifier (e.g. `gcfg_v6`) and activation timestamp are immediately rendered
   - **And** configuration history table updates to show the new active version at the top while retaining all historical records
   - **And** the active configuration card in Global/District settings updates immediately
   - **And** subsequent editing in Global/District draft forms starts from the newly active configuration
   - **And** duplicate submission is prevented by in-flight mutation locking.

9. **Atomic Failure Handling & Stale Baseline Conflict (AC 10, AC 11)**
   - **Given** rollback fails before transaction completion (validation error, database conflict, unexpected exception)
   - **When** the error occurs
   - **Then** the entire transaction rolls back; no partial version is created or activated
   - **And** the previous active configuration remains 100% authoritative
   - **And** the error message is sanitized and exposes zero internal database or stack trace details
   - **Given** another activation or rollback occurred since the review was loaded (`baseActiveVersionId !== currentActive.id`)
   - **When** the Product Owner attempts rollback confirmation
   - **Then** the server rejects the request with `409 Conflict` (`STALE_BASELINE_VERSION`)
   - **And** the UI prompts the Product Owner to refresh and review the diff against the newly active version before confirming again.

10. **Strict Scope Isolation (Global vs. District) (AC 12, AD-9)**
    - **Given** a District rollback is confirmed for District A
    - **When** it succeeds
    - **Then** only District A receives the newly activated configuration version
    - **And** District B configuration and history remain completely untouched
    - **And** Global configuration and history remain completely untouched
    - **Given** a Global rollback is confirmed
    - **When** it succeeds
    - **Then** only Global configuration changes; existing District configuration versions are not rewritten or recreated.

11. **Strict Future-Only Invariant & Operation Lineage Traceability (AC 13, AD-8)**
    - **Given** a rollback version becomes active
    - **When** new Telegram signal processing and AI operations begin after rollback
    - **Then** newly created logical AI operations pick up the newly active configuration version
    - **And** completed historical message-level decisions from earlier versions are NOT automatically replayed, reassessed, or rewritten
    - **And** pre-existing logical AI operations created before rollback remain pinned to their original `pinned_profile_id`
    - **And** same-day Topic-derived projection refreshes triggered by new Accepted Evidence use the configuration active for that new logical operation, retaining exact configuration lineage without altering prior message-level decisions.

12. **Immutable Audit Trail Integration (AC 14, FR-24)**
    - **Given** rollback succeeds
    - **When** the transaction commits
    - **Then** an append-only audit event is recorded (`GLOBAL_ANALYSIS_SETTINGS_ROLLED_BACK` or `DISTRICT_ANALYSIS_SETTINGS_ROLLED_BACK`)
    - **And** the audit metadata contains: `actorId`, `actorRole: 'PRODUCT_OWNER'`, `districtId` (or `null`), `previousActiveVersionId`, `targetSourceVersionId`, `newVersionId`, `newVersion`, `activatedAt`, and `changeReason`
    - **And** audit metadata contains zero credentials, bot tokens, or resident evidence.

13. **Authorization Boundary Enforcement (AC 15, AD-9)**
    - **Given** an unauthorized actor (District Hokim, unauthenticated visitor)
    - **When** attempting to access history or rollback endpoints (`GET/POST /api/v1/ai/settings/global/*` or `GET/POST /api/v1/ai/settings/districts/:districtId/*`)
    - **Then** the server returns `403 Forbidden` for Hokim and `401 Unauthorized` for unauthenticated requests
    - **And** authorization uses server-derived actor context; browser-supplied roles are ignored
    - **And** no configuration version, history, or audit event is exposed or mutated.

14. **Offline Status Awareness (AC 16)**
    - **Given** network connectivity is lost while viewing configuration history
    - **When** offline status is detected
    - **Then** permitted history data remains visible read-only with an offline indication
    - **And** rollback action buttons are disabled with an informative offline warning banner
    - **And** rollback requests are never queued for automatic offline replay
    - **And** reconnecting re-validates the session before rollback can be initiated.

15. **WCAG 2.1/2.2 AA Keyboard Navigation & Contrast Compliance (AC 17)**
    - **Given** the configuration history table, rollback review modal, diff viewer, and confirmation flow
    - **When** operated via keyboard, screen reader, or 200% zoom
    - **Then** all interactive elements, table rows, diff panels, text areas, and action buttons are fully keyboard navigable with visible focus rings
    - **And** contrast ratios meet WCAG AA standards (≥4.5:1 for normal text)
    - **And** status meanings never depend on color alone (text badges `Фаол`, `Тарихий`, `+`/`-`/`~`)
    - **And** long technical identifiers and Uzbek Cyrillic labels never clip or cause page-level horizontal overflow.

16. **Full Automated Verification Matrix (AC 18)**
    - **Given** the completed Story 5.4 implementation
    - **When** automated test suites run
    - **Then** backend integration tests cover Global and District history retrieval, immutable history preservation, rollback-as-new-version creation, version copying, monotonic versioning, change reason validation, secret rejection, stale baseline rejection (`409`), no-op active version rejection (`400`), atomic failure, authorization boundaries, scope isolation, and audit trail verification
    - **And** tests prove completed historical decisions and pre-existing pinned AI operations are not replayed or mutated
    - **And** frontend tests cover history rendering, active vs. historical badges, rollback review opening, field-level diff display, confirmation modal, secret validation error, cancellation, and successful post-rollback state synchronization.

---

## Tasks / Subtasks

- [ ] **Task 1: Shared API Contracts & Validation Schemas (`packages/api-contracts`)** (AC: 1, 2, 4, 6, 7, 9)
  - [ ] 1.1: Define `GlobalAnalysisSettingsHistoryResponseSchema` (`items: GlobalAnalysisSettingsDto[]`, `totalCount: number`).
  - [ ] 1.2: Define `DistrictAnalysisSettingsHistoryResponseSchema` (`districtId: string`, `districtName: string`, `items: DistrictAnalysisSettingsDto[]`, `totalCount: number`).
  - [ ] 1.3: Define `RollbackGlobalAnalysisSettingsRequestSchema` (`baseActiveVersionId: string` trimmed min 1, `targetVersionId: string` trimmed min 1, `changeReason: ChangeReasonSchema`).
  - [ ] 1.4: Define `RollbackGlobalAnalysisSettingsResponseSchema` (`activeConfiguration: GlobalAnalysisSettingsDtoSchema`, `restoredFromVersionId: string`, `previousActiveVersionId: string`, `message: string`).
  - [ ] 1.5: Define `RollbackDistrictAnalysisSettingsRequestSchema` (`baseActiveVersionId: string` trimmed min 1, `targetVersionId: string` trimmed min 1, `changeReason: ChangeReasonSchema`).
  - [ ] 1.6: Define `RollbackDistrictAnalysisSettingsResponseSchema` (`districtId: string`, `districtName: string`, `activeConfiguration: DistrictAnalysisSettingsDtoSchema`, `restoredFromVersionId: string`, `previousActiveVersionId: string`, `message: string`).
  - [ ] 1.7: Export all history and rollback types and schemas in `packages/api-contracts/src/analysis-settings.ts` and `index.ts`.

- [ ] **Task 2: Backend Global History & Rollback Service, Repository & Routes (`apps/backend`)** (AC: 1, 4, 6, 7, 8, 9, 10, 12, 13)
  - [ ] 2.1: Add `getHistory(db)` and `getVersionById(db, id)` methods to `GlobalAnalysisSettingsRepositoryPort` and `DrizzleGlobalAnalysisSettingsRepository` (ordered by `version DESC`).
  - [ ] 2.2: Add `getHistory(db)` method to `GlobalAnalysisSettingsService` returning mapped DTOs.
  - [ ] 2.3: Add `rollback(db, actor, payload)` method to `GlobalAnalysisSettingsService`:
    - Fetch current active version (`FOR UPDATE`).
    - Stale baseline check: If `currentActive.id !== payload.baseActiveVersionId`, throw typed `StaleBaselineVersionError` (409 Conflict).
    - Fetch target historical version: If missing, throw `VersionNotFoundError` (404 Not Found).
    - Active check: If `target.id === currentActive.id`, throw `NoEffectiveRollbackError` (400 Bad Request).
    - Deactivate old version: `UPDATE ... SET is_active = false WHERE id = currentActive.id`.
    - Bump monotonic version: `nextVersion = max(version) + 1`, ID `gcfg_v{nextVersion}`.
    - Insert new active version record copying configuration from target, with `isActive = true`, `activatedAt = new Date()`, `activatedBy = actor.id`, `changeReason = payload.changeReason.trim()`.
    - Record audit event: `GLOBAL_ANALYSIS_SETTINGS_ROLLED_BACK`.
  - [ ] 2.4: Register routes `GET /api/v1/ai/settings/global/history` and `POST /api/v1/ai/settings/global/rollback` in `global-analysis-settings-routes.ts` protected by `createRequireProductOwner(db)`.

- [ ] **Task 3: Backend District History & Rollback Service, Repository & Routes (`apps/backend`)** (AC: 2, 4, 6, 7, 8, 9, 10, 12, 13)
  - [ ] 3.1: Add `getHistory(db, districtId)` and `getVersionById(db, districtId, id)` methods to `DistrictAnalysisSettingsRepositoryPort` and `DrizzleDistrictAnalysisSettingsRepository` (ordered by `version DESC`). Enforce strict composite tenant filtering: `WHERE district_id = :districtId AND id = :id` (AD-9 tenant isolation guard).
  - [ ] 3.2: Add `getHistory(db, districtId)` method to `DistrictAnalysisSettingsService` returning mapped DTOs. If no physical rows exist in `district_analysis_settings_versions` for `districtId`, return `[this.getActiveConfiguration(db, districtId)]` so the initial active `V1` baseline is displayed as `Фаол`.
  - [ ] 3.3: Add `rollback(db, districtId, actor, payload)` method to `DistrictAnalysisSettingsService`:
    - Verify district exists (`districts` table).
    - Fetch current active version for `districtId` (`FOR UPDATE`).
    - Stale baseline check: If `currentActive && currentActive.id !== payload.baseActiveVersionId`, throw `StaleBaselineVersionError` (409 Conflict).
    - Fetch target historical version for `districtId`: Enforce strict tenant isolation (`WHERE district_id = :districtId AND id = :targetVersionId`).
    - Unseeded baseline resolution: If `payload.targetVersionId === 'dcfg_' + districtId + '_v1'` (or matches baseline ID) and no physical `v1` row exists in the database table, resolve configuration fields from `createDefaultDistrictAnalysisSettingsVersion(districtId)`. If target is not found and not the default baseline, throw `VersionNotFoundError` (404 Not Found).
    - Active check: If `currentActive && target.id === currentActive.id`, throw `NoEffectiveRollbackError` (400 Bad Request).
    - Deactivate old version: `UPDATE ... SET is_active = false WHERE district_id = :districtId AND is_active = true`.
    - Bump monotonic version: `nextVersion = max(version) + 1`, ID `dcfg_{districtId}_v{nextVersion}`.
    - Insert new active version record copying terms and vocabulary from target, with `isActive = true`, `activatedAt = new Date()`, `activatedBy = actor.id`, `changeReason = payload.changeReason.trim()`.
    - Record audit event: `DISTRICT_ANALYSIS_SETTINGS_ROLLED_BACK`.
  - [ ] 3.4: Register routes `GET /api/v1/ai/settings/districts/:districtId/history` and `POST /api/v1/ai/settings/districts/:districtId/rollback` in `district-analysis-settings-routes.ts` protected by `createRequireProductOwner(db)`.

- [ ] **Task 4: AI Operations Lineage & Future-Only Runtime Invariant Verification (`apps/backend`)** (AC: 7, 11, AD-8)
  - [ ] 4.1: Ensure AI Gateway and signal evaluators (Semantic Relevance, Topic Matching, Topic Projection) resolve the newly active rolled-back configuration for subsequent new operations.
  - [ ] 4.2: Verify pre-existing logical AI operations remain strictly pinned to their `pinnedProfileId` and are never re-evaluated or overwritten upon version rollback.
  - [ ] 4.3: Verify historical topic summaries, lanes, and accepted evidence records are never retroactively recalculated solely because a configuration was rolled back.

- [ ] **Task 5: Frontend API Clients & TanStack Query Hooks (`apps/web`)** (AC: 1, 2, 8, 14)
  - [ ] 5.1: Add `getGlobalSettingsHistory()` and `rollbackGlobalSettings(payload)` to `apps/web/src/api/global-settings-client.ts`.
  - [ ] 5.2: Add `getDistrictSettingsHistory(districtId)` and `rollbackDistrictSettings(districtId, payload)` to `apps/web/src/api/district-settings-client.ts`.
  - [ ] 5.3: Add `useGlobalAnalysisSettingsHistory()` query hook and `useRollbackGlobalSettings()` mutation hook in `useGlobalAnalysisSettings.ts` with comprehensive cache invalidation (`['global-analysis-settings']`, `['global-analysis-settings-history']`).
  - [ ] 5.4: Add `useDistrictAnalysisSettingsHistory(districtId)` query hook and `useRollbackDistrictSettings(districtId)` mutation hook in `useDistrictAnalysisSettings.ts` with comprehensive cache invalidation (`['district-analysis-settings', districtId]`, `['district-analysis-settings-history', districtId]`).

- [ ] **Task 6: Configuration History Table & Rollback Modal Components (`apps/web`)** (AC: 1, 2, 3, 5, 6, 8, 9, 14, 15)
  - [ ] 6.1: Build `AnalysisSettingsHistoryTable.tsx` component:
    - Renders version table with columns: Version ID, Version number, Status tag (`Фаол` green, `Тарихий` default), Activation timestamp, Activated by, Operational reason, Configuration summary, and Actions (`Қайтариш` button).
    - Each row's rollback action button receives accessible DOM ID `id={'btn-rollback-' + item.id}`.
    - Disables rollback button for the currently active version with informative tooltip (`Жорий фаол версия`).
    - Full keyboard navigation and accessible tags.
  - [ ] 6.2: Build `AnalysisSettingsRollbackModal.tsx` containing:
    - Target scope indicator (Global vs. District with District Name).
    - Baseline active version ID & Target historical version ID.
    - Future-only invariant warning banner (`Alert` type="warning"):
      *"Ушбу амал танланган тарихий версия асосида ЯНГИ келажак версиясини яратади ва фаоллаштиради. Аввал қайта ишланган хабарлар ва тарихий мавзулар қайта ҳисобланмайди ва ўзгартирилмайди."*
    - Embedded `ConfigurationDiffViewer` with diff comparing `activeVersion` -> `targetVersion`.
    - Mandatory `changeReason` textarea with character count (5-500), help text, and instant secret scanning validation (`containsProhibitedSecrets`).
    - Confirmation (`Янги версия сифатида қайтариш`) and Cancel (`Бекор қилиш`) buttons with loading state and disabled state when offline or invalid.
    - On Cancel / Escape, restores focus directly to `document.getElementById('btn-rollback-' + targetVersion.id)?.focus()`.
  - [ ] 6.3: Build `AnalysisSettingsHistoryPanel.tsx` container component with Global / District sub-tabs and DistrictSelector integration.
  - [ ] 6.4: Update `apps/web/src/components/ai/diff-utils.ts` and `ConfigurationDiffViewer.tsx` to support `GlobalAnalysisSettingsDto` and `DistrictAnalysisSettingsDto` as valid comparison target parameters in `computeGlobalSettingsDiff` and `computeDistrictSettingsDiff`.

- [ ] **Task 7: Page Integration & Post-Rollback State Synchronization (`apps/web`)** (AC: 1, 2, 8, 9, 15)
  - [ ] 7.1: Enable `history` tab in `apps/web/src/pages/AiOperationsPage.tsx` by embedding `AnalysisSettingsHistoryPanel`.
  - [ ] 7.2: On successful rollback, close modal, display prominent Uzbek Cyrillic notification (`Созламалар V{target} ҳолатига янги V{new} версияси сифатида муваффақиятли қайтарилди`), invalidate and refresh active settings cards, draft forms (resetting baseline `baseActiveVersionId`), and history table.
  - [ ] 7.3: On error (e.g. `409 STALE_BASELINE_VERSION`), display actionable alert with "Саҳифани янгилаш" (Refresh page) action without losing entered reason.
  - [ ] 7.4: Verify full keyboard navigation (`Tab`, `Escape`, `Enter`), visible focus rings, and WCAG AA contrast.

- [ ] **Task 8: Backend Integration & Isolation Test Suite (`apps/backend/tests`)** (AC: 1, 2, 4, 6, 7, 8, 9, 10, 11, 12, 13, 16)
  - [ ] 8.1: Write `apps/backend/tests/analysis-settings-history-rollback.test.ts` against isolated test database `mahalla_ovozi_test`:
    - Global history query: returns all versions ordered `version DESC`, identifies active version.
    - District history query: returns district-specific versions only, respects district isolation; handles unseeded districts by returning the default baseline `V1`.
    - Global rollback: copies target historical configuration into new version (`gcfg_v{next}`), deactivates previous active, preserves historical source unmodified, records audit event.
    - District rollback: copies target historical district settings into new version (`dcfg_{districtId}_v{next}`), deactivates previous active, records audit event; correctly resolves unseeded `V1` baseline rollback target.
    - Scope isolation: District A rollback does not touch District B or Global config. Global rollback does not touch District config. Cross-district version target lookup fails with `404 VERSION_NOT_FOUND`.
    - Stale baseline rejection: Returns `409` when `baseActiveVersionId` doesn't match current active version.
    - No-op active version rejection: Returns `400` when attempting to roll back to the currently active version.
    - Target not found rejection: Returns `404` when `targetVersionId` does not exist.
    - Change reason validation: Rejects <5 chars, >500 chars, and secrets (bot tokens, API keys).
    - Authorization: Rejects non-Product Owner requests with `403` / `401`.
    - Future-only invariant: Proves completed `ai_operations`, `topics`, and `accepted_evidence` records are untouched.

- [ ] **Task 9: Frontend Unit & Component Test Suite (`apps/web/tests/unit`)** (AC: 1, 2, 3, 5, 6, 8, 9, 14, 15, 16)
  - [ ] 9.1: Write `apps/web/tests/unit/AnalysisSettingsHistoryTable.test.tsx`:
    - Renders history items with version tags, timestamps, and change reasons.
    - Identifies active version and disables rollback button for it.
    - Enables rollback button for historical versions and triggers modal.
  - [ ] 9.2: Write `apps/web/tests/unit/AnalysisSettingsRollbackModal.test.tsx`:
    - Renders target and active versions, future-only warning, and field-level diff preview between historical DTOs.
    - Validates change reason input (min 5 chars, secret rejection).
    - Disables confirm button when reason is empty or invalid.
    - Handles successful rollback and cache invalidation.
    - Handles stale baseline conflict (`409`) with refresh prompt.
    - Closes on Cancel with focus restoration to row button.
  - [ ] 9.3: Update `AiOperationsPage.test.tsx` for history tab enablement and rendering.

- [ ] **Task 10: Verification & Typecheck Across Workspaces** (AC: 18)
  - [ ] 10.1: Run `pnpm -r typecheck` across `packages/api-contracts`, `apps/backend`, and `apps/web`.
  - [ ] 10.2: Run Vitest backend test suite (`pnpm --filter @mahalla-ovozi/backend test`).
  - [ ] 10.3: Run Vitest frontend test suite (`pnpm --filter @mahalla-ovozi/web test`).

---

## Dev Notes

### Architecture Compliance & Invariants

1. **Strict Future-Only Rollback Invariant (AD-8 Zero Runtime Mutation)**:
   - Rollback NEVER mutates or "reactivates" an existing historical database row in place (`isActive` is NOT simply toggled back to true on an old row).
   - Rollback ALWAYS creates a **brand new immutable version** (`max(version) + 1`) whose payload copies the target historical version's configuration.
   - Example: Active is `V5`, target is `V2` -> System creates `V6` with `V2`'s configuration and `isActive = true`. `V2` remains in history as `V2` (`isActive = false`), `V5` remains in history as `V5` (`isActive = false`).
   - Configuration rollback MUST NEVER trigger retroactive recalculation or replay of completed historical message-level decisions (`SEMANTIC_RELEVANCE`, `TOPIC_MATCHING`).
   - Prior `ai_operations` records remain pinned to their original `pinned_profile_id`.
   - New logical AI operations created after rollback adopt the newly active configuration version.

2. **Explicit Scope Separation & Tenant Isolation Guard (AD-9)**:
   - Global settings versions (`global_analysis_settings_versions`) have IDs formatted as `gcfg_v{N}` (e.g. `gcfg_v1`, `gcfg_v2`).
   - District settings versions (`district_analysis_settings_versions`) have IDs formatted as `dcfg_{districtId}_v{N}` (e.g. `dcfg_dist_123_v1`, `dcfg_dist_123_v2`).
   - District history and rollback strictly require a valid `districtId`. Missing district scope is an immediate error.
   - Cross-District version target lookup MUST be guarded with composite filtering: `WHERE district_analysis_settings_versions.district_id = :districtId AND district_analysis_settings_versions.id = :id`.
   - Rolling back District A never alters District B or Global records.

3. **Unseeded District Baseline Lifecycle in History & Rollback**:
   - In unseeded districts (where no rows have been persisted in `district_analysis_settings_versions` yet), `getHistory(db, districtId)` returns `[this.getActiveConfiguration(db, districtId)]` so the initial active `V1` baseline (`dcfg_{districtId}_v1`) is rendered with the `Фаол` badge in the UI History Table.
   - When rolling back in a district, if `targetVersionId === 'dcfg_' + districtId + '_v1'` (or matches baseline ID) and no physical `v1` row exists in the database, the configuration is resolved from `createDefaultDistrictAnalysisSettingsVersion(districtId)`.

4. **Same-Origin REST Contracts & Error Envelope (AD-10)**:
   - History endpoints:
     - `GET /api/v1/ai/settings/global/history`
     - `GET /api/v1/ai/settings/districts/:districtId/history`
   - Rollback endpoints:
     - `POST /api/v1/ai/settings/global/rollback`
     - `POST /api/v1/ai/settings/districts/:districtId/rollback`
   - Error responses adhere strictly to the project-standard `ApiErrorEnvelope`:
     ```json
     {
       "error": {
         "code": "STALE_BASELINE_VERSION" | "NO_EFFECTIVE_ROLLBACK" | "VERSION_NOT_FOUND" | "PROHIBITED_SECRETS_DETECTED" | "VALIDATION_ERROR",
         "message": "Фаол созламалар версияси ўзгарган. Илтимос, саҳифани янгилаб, қайта кўриб чиқинг.",
         "statusCode": 400 | 404 | 409
       }
     }
     ```

5. **Frontend Cache Invalidation & Draft State Synchronization**:
   - Upon successful rollback mutation, invalidate the following TanStack query caches:
     - Global: `['global-analysis-settings']`, `['global-analysis-settings-history']`
     - District: `['district-analysis-settings', districtId]`, `['district-analysis-settings-history', districtId]`
   - Form baselines automatically re-synchronize to the newly active version ID, resetting `baseActiveVersionId`.

6. **WCAG AA Accessible Focus Restoration**:
   - Table rows assign accessible DOM ID `id={'btn-rollback-' + item.id}` to each rollback action button.
   - When `AnalysisSettingsRollbackModal` closes on Cancel or Escape, keyboard focus returns directly to `document.getElementById('btn-rollback-' + targetVersion.id)?.focus()`.

7. **Immutable Audit Trail Integration (FR-24)**:
   - Rollbacks write to `audit_events` via `recordAuditEvent(tx, ...)`.
   - Action names: `GLOBAL_ANALYSIS_SETTINGS_ROLLED_BACK` and `DISTRICT_ANALYSIS_SETTINGS_ROLLED_BACK`.
   - Metadata payload:
     ```typescript
     {
       districtId: string | null;
       previousActiveVersionId: string;
       targetSourceVersionId: string;
       newVersionId: string;
       newVersion: number;
       changeReason: string;
     }
     ```

---

### Shared API Contracts (`packages/api-contracts/src/analysis-settings.ts`)

```typescript
// ==========================================
// Story 5.4: History & Rollback Contracts
// ==========================================

export const GlobalAnalysisSettingsHistoryResponseSchema = z.object({
  items: z.array(GlobalAnalysisSettingsDtoSchema),
  totalCount: z.number().int().nonnegative(),
});
export type GlobalAnalysisSettingsHistoryResponse = z.infer<
  typeof GlobalAnalysisSettingsHistoryResponseSchema
>;

export const DistrictAnalysisSettingsHistoryResponseSchema = z.object({
  districtId: z.string(),
  districtName: z.string(),
  items: z.array(DistrictAnalysisSettingsDtoSchema),
  totalCount: z.number().int().nonnegative(),
});
export type DistrictAnalysisSettingsHistoryResponse = z.infer<
  typeof DistrictAnalysisSettingsHistoryResponseSchema
>;

export const RollbackGlobalAnalysisSettingsRequestSchema = z.object({
  baseActiveVersionId: z
    .string({ invalid_type_error: 'Базавий фаол версия идентификатори талаб қилинади.' })
    .trim()
    .min(1, 'Базавий фаол версия идентификатори талаб қилинади.'),
  targetVersionId: z
    .string({ invalid_type_error: 'Қайтариладиган версия идентификатори талаб қилинади.' })
    .trim()
    .min(1, 'Қайтариладиган версия идентификатори талаб қилинади.'),
  changeReason: ChangeReasonSchema,
});
export type RollbackGlobalAnalysisSettingsRequest = z.infer<
  typeof RollbackGlobalAnalysisSettingsRequestSchema
>;

export const RollbackGlobalAnalysisSettingsResponseSchema = z.object({
  activeConfiguration: GlobalAnalysisSettingsDtoSchema,
  restoredFromVersionId: z.string(),
  previousActiveVersionId: z.string(),
  message: z.string(),
});
export type RollbackGlobalAnalysisSettingsResponse = z.infer<
  typeof RollbackGlobalAnalysisSettingsResponseSchema
>;

export const RollbackDistrictAnalysisSettingsRequestSchema = z.object({
  baseActiveVersionId: z
    .string({ invalid_type_error: 'Базавий фаол версия идентификатори талаб қилинади.' })
    .trim()
    .min(1, 'Базавий фаол версия идентификатори талаб қилинади.'),
  targetVersionId: z
    .string({ invalid_type_error: 'Қайтариладиган версия идентификатори талаб қилинади.' })
    .trim()
    .min(1, 'Қайтариладиган версия идентификатори талаб қилинади.'),
  changeReason: ChangeReasonSchema,
});
export type RollbackDistrictAnalysisSettingsRequest = z.infer<
  typeof RollbackDistrictAnalysisSettingsRequestSchema
>;

export const RollbackDistrictAnalysisSettingsResponseSchema = z.object({
  districtId: z.string(),
  districtName: z.string(),
  activeConfiguration: DistrictAnalysisSettingsDtoSchema,
  restoredFromVersionId: z.string(),
  previousActiveVersionId: z.string(),
  message: z.string(),
});
export type RollbackDistrictAnalysisSettingsResponse = z.infer<
  typeof RollbackDistrictAnalysisSettingsResponseSchema
>;
```

---

### Backend Database Transaction & Rollback Logic

```typescript
// apps/backend/src/modules/ai/global-analysis-settings-service.ts
async rollback(
  db: DbOrTx,
  actor: { id: string; role: string; ipAddress?: string | null; userAgent?: string | null },
  payload: RollbackGlobalAnalysisSettingsRequest,
): Promise<RollbackGlobalAnalysisSettingsResponse> {
  if (actor.role !== 'PRODUCT_OWNER') {
    throw new Error('Ушбу амални бажариш учун маҳсулот эгаси ҳуқуқи талаб қилинади.');
  }

  const executeInTx = async (tx: DbOrTx) => {
    // 1. Fetch current active configuration with row lock via repository port
    const activeRow = await this.repository.getActiveConfigurationForUpdate(tx);
    const currentActive = activeRow || defaultGlobalAnalysisSettingsVersion;

    // 2. Validate base active version (optimistic concurrency guard)
    if (currentActive.id !== payload.baseActiveVersionId) {
      const error = new Error('Фаол созламалар версияси ўзгарган. Илтимос, саҳифани янгилаб, қайта кўриб чиқинг.');
      (error as any).code = 'STALE_BASELINE_VERSION';
      (error as any).statusCode = 409;
      throw error;
    }

    // 3. Fetch target historical version via repository port
    const targetRow = await this.repository.getVersionById(tx, payload.targetVersionId);

    if (!targetRow) {
      const error = new Error('Қайтариш учун танланган тарихий версия топилмади.');
      (error as any).code = 'VERSION_NOT_FOUND';
      (error as any).statusCode = 404;
      throw error;
    }

    // 4. Validate that target is not already the active version
    if (targetRow.id === currentActive.id) {
      const error = new Error('Танланган версия аллақачон фаол ҳисобланади. Қайтариш учун олдинги тарихий версияни танланг.');
      (error as any).code = 'NO_EFFECTIVE_ROLLBACK';
      (error as any).statusCode = 400;
      throw error;
    }

    // 5. Deactivate prior active version
    if (currentActive.id) {
      await this.repository.deactivateVersion(tx, currentActive.id);
    }

    // 6. Compute next version number
    const maxVersion = await this.repository.getNextVersionNumber(tx);
    const nextVersion = Math.max(maxVersion, (currentActive?.version ?? 1) + 1);
    const newVersionId = `gcfg_v${nextVersion}`;

    // 7. Insert new immutable active version copying from target
    const newVersionRow = await this.repository.insertVersion(tx, {
      id: newVersionId,
      version: nextVersion,
      modelProvider: targetRow.modelProvider,
      modelId: targetRow.modelId,
      temperature: targetRow.temperature,
      maxOutputTokens: targetRow.maxOutputTokens,
      relevanceSystemPrompt: targetRow.relevanceSystemPrompt,
      topicMatchingSystemPrompt: targetRow.topicMatchingSystemPrompt,
      topicProjectionSystemPrompt: targetRow.topicProjectionSystemPrompt,
      globalServiceVocabulary: targetRow.globalServiceVocabulary,
      isActive: true,
      activatedAt: new Date(),
      activatedBy: actor.id,
      changeReason: payload.changeReason.trim(),
      createdAt: new Date(),
    });

    // 8. Record audit trail event
    await recordAuditEvent(tx, {
      districtId: null,
      actorId: actor.id,
      actorRole: 'PRODUCT_OWNER',
      action: 'GLOBAL_ANALYSIS_SETTINGS_ROLLED_BACK',
      ipAddress: actor.ipAddress || null,
      userAgent: actor.userAgent || null,
      metadata: {
        previousActiveVersionId: currentActive.id,
        targetSourceVersionId: targetRow.id,
        newVersionId: newVersionRow.id,
        newVersion: nextVersion,
        changeReason: payload.changeReason.trim(),
      },
    });

    return {
      activeConfiguration: this.mapVersionToDto(newVersionRow),
      restoredFromVersionId: targetRow.id,
      previousActiveVersionId: currentActive.id,
      message: `Глобал таҳлил созламалари V${targetRow.version} ҳолатига янги V${nextVersion} версияси сифатида муваффақиятли қайтарилди.`,
    };
  };

  return 'transaction' in db && typeof db.transaction === 'function'
    ? await db.transaction(async (tx) => executeInTx(tx))
    : await executeInTx(db);
}
```

```typescript
// apps/backend/src/modules/ai/district-analysis-settings-service.ts
async rollback(
  db: DbOrTx,
  districtId: string,
  actor: { id: string; role: string; ipAddress?: string | null; userAgent?: string | null },
  payload: RollbackDistrictAnalysisSettingsRequest,
): Promise<RollbackDistrictAnalysisSettingsResponse> {
  if (actor.role !== 'PRODUCT_OWNER') {
    throw new Error('Ушбу амални бажариш учун маҳсулот эгаси ҳуқуқи талаб қилинади.');
  }

  const executeInTx = async (tx: DbOrTx) => {
    // 1. Fetch district to verify existence and get district name
    const [district] = await tx
      .select({ id: districts.id, name: districts.name })
      .from(districts)
      .where(eq(districts.id, districtId))
      .limit(1);

    if (!district) {
      const error = new Error('Туман топилмади.');
      (error as any).code = 'DISTRICT_NOT_FOUND';
      (error as any).statusCode = 404;
      throw error;
    }

    // 2. Fetch current active configuration with row lock
    const activeRow = await this.repository.getActiveConfigurationForUpdate(tx, districtId);
    const defaultBaseline = createDefaultDistrictAnalysisSettingsVersion(districtId);
    const currentActiveId = activeRow ? activeRow.id : defaultBaseline.id;

    // 3. Validate base active version (optimistic concurrency guard)
    if (payload.baseActiveVersionId !== currentActiveId) {
      const error = new Error('Фаол созламалар версияси ўзгарган. Илтимос, саҳифани янгилаб, қайта кўриб чиқинг.');
      (error as any).code = 'STALE_BASELINE_VERSION';
      (error as any).statusCode = 409;
      throw error;
    }

    // 4. Fetch target historical version (strict composite tenant isolation)
    let targetRow = await this.repository.getVersionById(tx, districtId, payload.targetVersionId);

    // Unseeded baseline fallback resolution
    if (!targetRow && payload.targetVersionId === defaultBaseline.id) {
      targetRow = defaultBaseline as DistrictAnalysisSettingsVersion;
    }

    if (!targetRow) {
      const error = new Error('Қайтариш учун танланган тарихий версия топилмади.');
      (error as any).code = 'VERSION_NOT_FOUND';
      (error as any).statusCode = 404;
      throw error;
    }

    // 5. Validate that target is not already the active version
    if (targetRow.id === currentActiveId) {
      const error = new Error('Танланган версия аллақачон фаол ҳисобланади. Қайтариш учун олдинги тарихий версияни танланг.');
      (error as any).code = 'NO_EFFECTIVE_ROLLBACK';
      (error as any).statusCode = 400;
      throw error;
    }

    // 6. Deactivate prior active version if exists in DB
    if (activeRow) {
      await this.repository.deactivateVersion(tx, districtId, activeRow.id);
    }

    // 7. Compute next monotonic version number
    const maxVersion = await this.repository.getNextVersionNumber(tx, districtId);
    const nextVersion = Math.max(maxVersion, (activeRow?.version ?? 1) + 1);
    const newVersionId = `dcfg_${districtId}_v${nextVersion}`;

    // 8. Insert new immutable active version copying from target
    const newVersionRow = await this.repository.insertVersion(tx, {
      id: newVersionId,
      districtId,
      version: nextVersion,
      hokimRecognitionTerms: targetRow.hokimRecognitionTerms,
      localVocabularyAdditions: targetRow.localVocabularyAdditions,
      isActive: true,
      activatedAt: new Date(),
      activatedBy: actor.id,
      changeReason: payload.changeReason.trim(),
      createdAt: new Date(),
    });

    // 9. Record audit event
    await recordAuditEvent(tx, {
      districtId,
      actorId: actor.id,
      actorRole: 'PRODUCT_OWNER',
      action: 'DISTRICT_ANALYSIS_SETTINGS_ROLLED_BACK',
      ipAddress: actor.ipAddress || null,
      userAgent: actor.userAgent || null,
      metadata: {
        districtId,
        districtName: district.name,
        previousActiveVersionId: currentActiveId,
        targetSourceVersionId: targetRow.id,
        newVersionId: newVersionRow.id,
        newVersion: nextVersion,
        changeReason: payload.changeReason.trim(),
      },
    });

    return {
      districtId,
      districtName: district.name,
      activeConfiguration: this.mapVersionToDto(newVersionRow),
      restoredFromVersionId: targetRow.id,
      previousActiveVersionId: currentActiveId,
      message: `${district.name}: Таҳлил созламалари V${targetRow.version} ҳолатига янги V${nextVersion} версияси сифатида муваффақиятли қайтарилди.`,
    };
  };

  return 'transaction' in db && typeof db.transaction === 'function'
    ? await db.transaction(async (tx) => executeInTx(tx))
    : await executeInTx(db);
}
```

---

### UI Components Specifications

1. **`AnalysisSettingsHistoryTable.tsx`**:
   - Props:
     - `scope: 'global' | 'district'`
     - `items: GlobalAnalysisSettingsDto[] | DistrictAnalysisSettingsDto[]`
     - `loading: boolean`
     - `onRollbackClick: (version: GlobalAnalysisSettingsDto | DistrictAnalysisSettingsDto) => void`
   - Columns:
     - **Версия**: Tag with version number (`V1`, `V2`) and ID (`gcfg_v1`).
     - **Ҳолати**: Tag (`Фаол` green with `CheckCircleOutlined` for `isActive === true`, `Тарихий` default for others).
     - **Фаоллаштирилган вақти**: Datetime string in `Asia/Tashkent` (`YYYY-MM-DD HH:mm`).
     - **Масъул**: `activatedBy` or `Тизим`.
     - **Ўзгартириш сабаби**: Text with expandable/tooltip preview for long text.
     - **Созламалар хулосаси**: Quick tags (e.g. Model ID, Vocabulary items count).
     - **Амаллар**: Button `Қайтариш` (Rollback) with `id={'btn-rollback-' + item.id}` and `aria-label={'V' + item.version + ' версиясини қайтариш'}`. Disabled with tooltip `Жорий фаол версия` if `isActive === true`.

2. **`AnalysisSettingsRollbackModal.tsx`**:
   - Props:
     - `open: boolean`
     - `scope: 'global' | 'district'`
     - `districtId?: string`
     - `districtName?: string`
     - `activeVersion: GlobalAnalysisSettingsDto | DistrictAnalysisSettingsDto`
     - `targetVersion: GlobalAnalysisSettingsDto | DistrictAnalysisSettingsDto`
     - `onConfirm: (reason: string) => Promise<void>`
     - `onCancel: () => void`
   - Uses `destroyOnClose={true}` and `focusTriggerAfterClose={true}`.
   - Accessible heading: `Созламаларни олдинги версияга қайтариш`.
   - `Alert` notice (warning): Future-only invariant disclaimer:
     *"Диққат: Созламаларни қайтариш танланган тарихий версия асосида ЯНГИ келажак версиясини яратади ва фаоллаштиради. Аввал қайта ишланган хабарлар ва тарихий мавзулар қайта ҳисобланмайди ва ўзгартирилмайди."*
   - Embedded `ConfigurationDiffViewer` with diff comparing `activeVersion` -> `targetVersion`.
   - `Form.Item` for `changeReason`:
     - Textarea with character counter (`maxLength={500}`, `showCount`).
     - Validation rule for min 5 characters and prohibited secrets regex (`containsProhibitedSecrets`).
   - Buttons:
     - Cancel: `Бекор қилиш` (restores focus to `btn-rollback-${targetVersion.id}`).
     - Submit: `Янги версия сифатида қайтариш` (type="primary", danger/warning accent, loading state).

3. **`AnalysisSettingsHistoryPanel.tsx`**:
   - Sub-tabs: `Глобал созламалар тарихи` and `Туман созламалари тарихи`.
   - District sub-tab embeds `DistrictSelector` when no district is active.
   - Integrated query hooks and rollback mutation triggers.

---

### Uzbek Cyrillic Product Copy Standard

| UI Context | Approved Uzbek Cyrillic Text |
| :--- | :--- |
| Tab title | `Созламалар тарихи` (Settings History) |
| History subtab 1 | `Глобал созламалар тарихи` |
| History subtab 2 | `Туман созламалари тарихи` |
| Action button | `Қайтариш` (Rollback) |
| Active badge | `Фаол` |
| Historical badge | `Тарихий` |
| Modal title | `Созламаларни олдинги версияга қайтариш (Rollback)` |
| Future-only invariant notice | `Диққат: Созламаларни қайтариш танланган тарихий версия асосида ЯНГИ келажак версиясини яратади ва фаоллаштиради. Аввал қайта ишланган хабарлар ва тарихий мавзулар қайта ҳисобланмайди ва ўзгартирилмайди.` |
| Active version label | `Жорий фаол версия` |
| Target version label | `Қайтариладиган тарихий версия` |
| Change reason label | `Қайтариш сабаби (мажбурий)` |
| Change reason placeholder | `Масалан: Олдинги модел ва тасдиқланган луғатга қайтиш` |
| Change reason help | `Қайтариш сабабини киритинг (камида 5 та белги). Махфий маълумотлар (бот токенлари, API калитлар) киритиш тақиқланади.` |
| Stale baseline alert | `Фаол созламалар версияси ўзгарган. Илтимос, саҳифани янгилаб, қайта кўриб чиқинг.` |
| Active target alert | `Танланган версия аллақачон фаол ҳисобланади. Қайтариш учун олдинги тарихий версияни танланг.` |
| Confirm button | `Янги версия сифатида қайтариш` |
| Cancel button | `Бекор қилиш` |
| Success notification | `Созламалар V{target} ҳолатига янги V{new} версияси сифатида муваффақиятли қайтарилди.` |

---

### Previous Story Intelligence & Learnings

- **From Story 5.1 (`5-1-prepare-a-validated-global-analysis-settings-draft.md`)**:
  - Global settings are a singleton in the drafts table (`id = 'global'`).
  - Active version query returns the row with `is_active = true` ordered by `version DESC`.
  - Fastify route registration requires `createRequireProductOwner(db)` hook for full role protection.
- **From Story 5.2 (`5-2-prepare-a-district-recognition-settings-draft.md`)**:
  - District draft uses `baseActiveVersionId: activeRow ? activeRow.id : null` to avoid foreign key violations on unseeded districts.
  - Whitespace normalization (`.replace(/\s+/g, ' ')`) and empty term token filtering must be performed before persistence and comparison.
  - Ant Design `theme.useToken()` and proper `rowKey` properties prevent styling glitches and reconciliation errors.
  - Accessible error summaries must support deep-focus linking to offending inputs.
- **From Story 5.3 (`5-3-review-and-activate-a-future-only-analysis-configuration-version.md`)**:
  - High-precision secret scanner `containsProhibitedSecrets` in `packages/api-contracts` cleanly catches bot tokens, API keys, Bearer tokens, and passwords in `changeReason`.
  - Optimistic concurrency guard using `baseActiveVersionId` and row-level locking (`FOR UPDATE`) cleanly prevents stale activations and rollbacks.
  - `ConfigurationDiffViewer` is already capable of computing and rendering scalar, prompt, and vocabulary diffs.
  - All automated tests must execute strictly against isolated test database `mahalla_ovozi_test`.

---

### Git Intelligence Summary

- Latest commit: `ce24464` (Story 5.3 review complete and verified across 93 test files and 996 tests).
- Drizzle schema already includes `global_analysis_settings_versions` and `district_analysis_settings_versions` with required columns (`is_active`, `activated_at`, `activated_by`, `change_reason`). Zero database migrations needed.
- All workspaces pass strict TypeScript checks (`pnpm -r typecheck`) with 0 errors.

---

## Project Structure Notes

### Backend Files to Touch / Create
- [MODIFY] [`packages/api-contracts/src/analysis-settings.ts`](file:///c:/codevision-works/mahalla-ovozi-trial-2/packages/api-contracts/src/analysis-settings.ts)
- [MODIFY] [`apps/backend/src/modules/ai/global-analysis-settings-repository.ts`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/backend/src/modules/ai/global-analysis-settings-repository.ts)
- [MODIFY] [`apps/backend/src/modules/ai/global-analysis-settings-service.ts`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/backend/src/modules/ai/global-analysis-settings-service.ts)
- [MODIFY] [`apps/backend/src/modules/ai/global-analysis-settings-routes.ts`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/backend/src/modules/ai/global-analysis-settings-routes.ts)
- [MODIFY] [`apps/backend/src/modules/ai/district-analysis-settings-repository.ts`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/backend/src/modules/ai/district-analysis-settings-repository.ts)
- [MODIFY] [`apps/backend/src/modules/ai/district-analysis-settings-service.ts`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/backend/src/modules/ai/district-analysis-settings-service.ts)
- [MODIFY] [`apps/backend/src/modules/ai/district-analysis-settings-routes.ts`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/backend/src/modules/ai/district-analysis-settings-routes.ts)
- [NEW] [`apps/backend/tests/analysis-settings-history-rollback.test.ts`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/backend/tests/analysis-settings-history-rollback.test.ts)

### Frontend Files to Touch / Create
- [MODIFY] [`apps/web/src/api/global-settings-client.ts`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/src/api/global-settings-client.ts)
- [MODIFY] [`apps/web/src/api/district-settings-client.ts`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/src/api/district-settings-client.ts)
- [MODIFY] [`apps/web/src/hooks/useGlobalAnalysisSettings.ts`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/src/hooks/useGlobalAnalysisSettings.ts)
- [MODIFY] [`apps/web/src/hooks/useDistrictAnalysisSettings.ts`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/src/hooks/useDistrictAnalysisSettings.ts)
- [MODIFY] [`apps/web/src/components/ai/diff-utils.ts`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/src/components/ai/diff-utils.ts)
- [MODIFY] [`apps/web/src/components/ai/ConfigurationDiffViewer.tsx`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/src/components/ai/ConfigurationDiffViewer.tsx)
- [NEW] [`apps/web/src/components/ai/AnalysisSettingsHistoryTable.tsx`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/src/components/ai/AnalysisSettingsHistoryTable.tsx)
- [NEW] [`apps/web/src/components/ai/AnalysisSettingsRollbackModal.tsx`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/src/components/ai/AnalysisSettingsRollbackModal.tsx)
- [NEW] [`apps/web/src/components/ai/AnalysisSettingsHistoryPanel.tsx`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/src/components/ai/AnalysisSettingsHistoryPanel.tsx)
- [MODIFY] [`apps/web/src/pages/AiOperationsPage.tsx`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/src/pages/AiOperationsPage.tsx)
- [NEW] [`apps/web/tests/unit/AnalysisSettingsHistoryTable.test.tsx`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/tests/unit/AnalysisSettingsHistoryTable.test.tsx)
- [NEW] [`apps/web/tests/unit/AnalysisSettingsRollbackModal.test.tsx`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/tests/unit/AnalysisSettingsRollbackModal.test.tsx)

---

## References

- [Epic 5 Planning Document: Story 5.4](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/epics/epic-5.md#L314-L481)
- [Architecture Spine: Invariant AD-8 (Project-Owned AI Gateway & Immutable Profiles)](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/architecture/architecture-Mahalla-Ovozi-2026-08-12/ARCHITECTURE-SPINE.md#L108-L113)
- [Architecture Spine: Invariant AD-9 (Explicit District Scope & Multi-Tenant Isolation)](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/architecture/architecture-Mahalla-Ovozi-2026-08-12/ARCHITECTURE-SPINE.md#L114-L119)
- [Architecture Spine: Invariant AD-10 (Same-Origin REST Contracts)](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/architecture/architecture-Mahalla-Ovozi-2026-08-12/ARCHITECTURE-SPINE.md#L120-L125)
- [PRD FR-23: Versioned Future-Only Analysis Configuration](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/prds/prd-Mahalla-Ovozi-2026-07-30/prd.md#L381-L393)
- [PRD FR-24: Immutable Searchable Retained Audit History](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/prds/prd-Mahalla-Ovozi-2026-07-30/prd.md#L394-L405)
- [Story 5.3 Implementation Spec](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/implementation-artifacts/5-3-review-and-activate-a-future-only-analysis-configuration-version.md)

---

## Dev Agent Record

### Agent Model Used

Gemini 3.7 Flash (High)

### Debug Log References

### Completion Notes List

### File List


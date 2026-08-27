---
baseline_commit: d7b789af9179f3e83509eede242e8f93646c4c47
---

# Story 5.2: Prepare a District Recognition Settings Draft

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the **Product Owner**,  
I want to review and edit a District-specific recognition-settings draft,  
So that I can prepare local Hokim-recognition terms and vocabulary additions without changing production behavior.

## Acceptance Criteria

1. **Explicit District Scope Requirement & Zero Cross-District Leakage (AC 1)**
   - **Given** an authenticated Product Owner opens `AI Operations` (`/ai-operations`)
   - **When** `District Settings` (`Туман созламалари`) tab is selected without an active District selected in context (`activeDistrictId === null`)
   - **Then** the UI prompts the Product Owner to select an explicit District before District-specific configuration or drafts can be viewed or edited
   - **And** missing District scope is never interpreted as global, all-District, or cross-District scope
   - **And** protected settings and draft values from any other District are never exposed or loaded.

2. **Active District Configuration Presentation & Uzbek Cyrillic (AC 2)**
   - **Given** an explicit District is selected
   - **When** `District Settings` tab loads
   - **Then** the selected District name remains visibly identifiable in the card and page context
   - **And** the current active District-specific configuration is presented as read-only reference information
   - **And** its exact active version identifier (e.g. `dcfg_dist_123_v1`) and activation time (formatted in `Asia/Tashkent` timezone) are visible
   - **And** all product-facing copy uses approved Uzbek Cyrillic (`Фаол туман созламалари`, `Ҳокимга оид атамалар`, `Қўшимча маҳаллий луғат`, `Версия`, `Фаоллаштирилган вақти`, `Ҳолати`)
   - **And** if no custom version has been activated for the District, baseline default configuration is presented.

3. **Working Draft Initialization & Scope Boundary (AC 3)**
   - **Given** the Product Owner begins reviewing or editing District Settings for the selected District
   - **When** no saved draft exists in the database for that District
   - **Then** the draft starts pre-populated from that District's currently active District-specific configuration
   - **And** the editable scope contains only the approved District settings:
     - `hokimRecognitionTerms`: Array of terms/phrases identifying the District Hokim, Hokimiyat leadership, deputies, or sector heads (e.g. `Ҳоким`, `Туман ҳокими`, `Ҳоким ёрдамчиси`, `Ҳокимият`, `Сектор раҳбари`, `Hokim`, `Tuman hokimi`)
     - `localVocabularyAdditions`: Optional array of District-local vocabulary items (`term`, `category`, optional `description`) representing local mahalla names, landmarks, micro-districts, local institutions, or water bodies
   - **And** global model, provider, hyperparameters (`temperature`, `maxOutputTokens`), system prompts, and global service vocabulary are not converted into District-owned settings or editable in this tab.

4. **Resumable Draft Restoration & Cross-District Isolation (AC 4)**
   - **Given** a saved District Settings draft already exists in the database for the selected District
   - **When** the Product Owner views that District's settings
   - **Then** the saved draft is restored for continued editing
   - **And** the draft is clearly distinguishable visually from the active configuration (distinct badge `Қоралама` vs `Фаол созламалар`)
   - **And** drafts belonging to other Districts are never loaded, mixed, or leaked into the selected District.

5. **Dirty District Switching & Unsaved Changes Guard Integration (AC 5)**
   - **Given** District A has unsaved changes in its District Settings draft form
   - **When** the Product Owner attempts to switch to District B, change tabs, navigate away, or close the page
   - **Then** the approved unsaved-change guard modal (`UnsavedChangesModal`) is presented before any District context change occurs
   - **And** choosing `Таҳрирлашни давом эттириш` (Continue editing) preserves District A, its current draft form values, and editing context unchanged
   - **And** choosing `Ўзгаришларни бекор қилиш` (Discard) resets District A local form state and clears dirty state before District B settings load
   - **And** in-flight or late District A responses are aborted and can never render under District B.

6. **Multilingual Recognition Vocabulary & AI Guidance Non-Determinism (AC 6)**
   - **Given** the Product Owner enters District-specific recognition terms or local vocabulary additions
   - **When** terms are entered in Cyrillic, Latin, mixed scripts, or Russian administrative loanwords
   - **Then** the UI accepts multilingual inputs and validates terms (min 1 term required, min 2 chars, max 100 chars per term)
   - **And** duplicate terms are flagged and rejected with clear inline Uzbek Cyrillic feedback
   - **And** the form clearly indicates to the Product Owner that configured terms serve as contextual AI guidance rather than deterministic keyword-rule filters.

7. **Accessible Error Summary & Focus Management (AC 7)**
   - **Given** validation errors occur in the District Settings draft form
   - **When** the Product Owner attempts to save an invalid draft
   - **Then** an accessible error summary container (`role="alert"`) lists all offending fields with clear Uzbek Cyrillic explanations
   - **And** activating an error link automatically scrolls and moves keyboard focus to the invalid input
   - **And** previously valid fields remain intact and are not cleared.

8. **Zero Runtime Mutation Invariant & Audit Trail (AC 8, AD-8)**
   - **Given** a valid District Settings draft is saved
   - **When** the Product Owner clicks `Сақлаш` (Save Draft)
   - **Then** the draft is persisted in the database with `updated_at`, `updated_by`, and `base_active_version_id`
   - **And** the currently active District-specific configuration and production AI analysis runtime remain completely untouched
   - **And** an audit trail event `DISTRICT_ANALYSIS_SETTINGS_DRAFT_SAVED` is recorded containing `district_id`, Product Owner identity, and timestamp
   - **And** success feedback is displayed in Uzbek Cyrillic (`Қоралама муваффақиятли сақланди`).

9. **Authorization Boundary Enforcement (AC 9)**
   - **Given** a non-Product Owner account (e.g. District Hokim, unauthenticated visitor)
   - **When** attempting to access District Settings endpoints (`GET /api/v1/ai/settings/districts/:districtId` or `POST /api/v1/ai/settings/districts/:districtId/draft`)
   - **Then** the backend returns `403 Forbidden` for Hokim and `401 Unauthorized` for unauthenticated requests
   - **And** District Hokims cannot view or edit District AI analysis settings.

10. **Offline Status Awareness (AC 10)**
    - **Given** network connectivity is lost while editing a District Settings draft
    - **When** offline status is detected
    - **Then** an informative warning banner is displayed
    - **And** mutation controls are safely disabled to prevent silent data loss.

11. **WCAG 2.1/2.2 AA Keyboard Navigation & Contrast Compliance (AC 11)**
    - **Given** the District Settings tab and draft editor
    - **When** navigated via keyboard, screen reader, or in high-contrast themes
    - **Then** all inputs, buttons, tags, tables, and dialogs provide valid semantic elements, accessible labels, visible focus indicators, and WCAG AA contrast ratios (≥4.5:1 for normal text).

12. **Full Automated Verification Matrix (AC 12)**
    - **Given** the completed Story 5.2 implementation
    - **When** automated test suites run
    - **Then** all backend unit/integration tests and frontend component tests pass with 100% success rate
    - **And** strict type-checking (`pnpm -r typecheck`) and linting pass with zero errors.

---

## Tasks / Subtasks

- [x] **Task 1: Database Schema & Migration for District Settings** (AC: 1, 2, 3, 4, 8)
  - [x] 1.1 In `apps/backend/src/adapters/db/schema/ai.ts`, define `districtAnalysisSettingsVersions` table:
    - `id`: `text('id').primaryKey()` (e.g. `dcfg_dist_123_v1`)
    - `districtId`: `text('district_id').notNull().references(() => districts.id, { onDelete: 'cascade' })`
    - `version`: `integer('version').notNull()`
    - `hokimRecognitionTerms`: `jsonb('hokim_recognition_terms').notNull().$type<string[]>()`
    - `localVocabularyAdditions`: `jsonb('local_vocabulary_additions').notNull().$type<DistrictLocalVocabularyItem[]>()`
    - `isActive`: `boolean('is_active').notNull().default(false)`
    - `activatedAt`: `timestamp('activated_at', { withTimezone: true })`
    - `activatedBy`: `text('activated_by').references(() => accounts.id, { onDelete: 'set null' })`
    - `changeReason`: `text('change_reason')`
    - `createdAt`: `timestamp('created_at', { withTimezone: true }).notNull().defaultNow()`
    - Indexes:
      - `uniqueIndex('district_settings_versions_district_version_idx').on(table.districtId, table.version)` (guarantees monotonic version uniqueness per district at DB level)
      - `index('district_settings_versions_district_idx').on(table.districtId)`
      - `index('district_settings_versions_active_idx').on(table.districtId, table.isActive)`
  - [x] 1.2 In `apps/backend/src/adapters/db/schema/ai.ts`, define `districtAnalysisSettingsDrafts` table:
    - `id`: `text('id').primaryKey()` (e.g. `draft_dist_123` or `districtId`)
    - `districtId`: `text('district_id').notNull().unique().references(() => districts.id, { onDelete: 'cascade' })`
    - `baseActiveVersionId`: `text('base_active_version_id').references(() => districtAnalysisSettingsVersions.id, { onDelete: 'set null' })`
    - `hokimRecognitionTerms`: `jsonb('hokim_recognition_terms').notNull().$type<string[]>()`
    - `localVocabularyAdditions`: `jsonb('local_vocabulary_additions').notNull().$type<DistrictLocalVocabularyItem[]>()`
    - `updatedBy`: `text('updated_by').references(() => accounts.id, { onDelete: 'set null' })`
    - `createdAt`: `timestamp('created_at', { withTimezone: true }).notNull().defaultNow()`
    - `updatedAt`: `timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()`
    - Indexes:
      - `index('district_settings_drafts_district_idx').on(table.districtId)`
  - [x] 1.3 Export inferred TypeScript types (`DistrictAnalysisSettingsVersion`, `NewDistrictAnalysisSettingsVersion`, `DistrictAnalysisSettingsDraft`, `NewDistrictAnalysisSettingsDraft`) in `apps/backend/src/adapters/db/schema/ai.ts` and re-export in `apps/backend/src/adapters/db/schema/index.ts`.
  - [x] 1.4 Generate and apply Drizzle migration (`0015_soft_tony_stark.sql`) for both development database (`mahalla_ovozi`) and test database (`mahalla_ovozi_test`).
  - [x] 1.5 Update `apps/backend/src/adapters/db/seeds.ts` with default District analysis settings constants (`DEFAULT_HOKIM_RECOGNITION_TERMS`, `DEFAULT_DISTRICT_VOCABULARY_CATEGORIES`, default fallback configuration) and helper `ensureDefaultDistrictAnalysisSettings(db, districtId)`.

- [x] **Task 2: API Contracts in `@mahalla-ovozi/api-contracts`** (AC: 1, 2, 3, 6, 7, 8)
  - [x] 2.1 In `packages/api-contracts/src/analysis-settings.ts`, define Zod schemas:
    - `DEFAULT_HOKIM_RECOGNITION_TERMS`: `['Ҳоким', 'Туман ҳокими', 'Ҳоким ёрдамчиси', 'Ҳокимият', 'Сектор раҳбари', 'Hokim', 'Tuman hokimi', 'Hokimiyat']`
    - `DEFAULT_DISTRICT_VOCABULARY_CATEGORIES`: `['Маҳалла номлари', 'Мўлжал ва жойлар', 'Маҳаллий атамалар', 'Сув ҳавзалари ва каналлар', 'Маҳаллий муассасалар', 'Бошқа']`
    - `DistrictLocalVocabularyItemSchema`: `{ term: string (min 1, max 100), category: string (min 1, max 100), description?: string (max 500) }`
    - `DistrictAnalysisSettingsDtoSchema`: DTO representing active District configuration with ISO dates (`id`, `districtId`, `version`, `hokimRecognitionTerms`, `localVocabularyAdditions`, `isActive`, `activatedAt`, `activatedBy`, `changeReason`, `createdAt`).
    - `DistrictAnalysisSettingsDraftDtoSchema`: DTO representing saved District draft (`id`, `districtId`, `baseActiveVersionId`, `hokimRecognitionTerms`, `localVocabularyAdditions`, `updatedBy`, `createdAt`, `updatedAt`).
    - `SaveDistrictAnalysisSettingsDraftSchema`: Request validation schema:
      - `hokimRecognitionTerms`: array of strings, min 1, max 50 items, each term min 2, max 100 chars, with NFC-normalized case-insensitive deduplication via `superRefine`.
      - `localVocabularyAdditions`: array of `DistrictLocalVocabularyItemSchema`, max 100 items, with NFC-normalized case-insensitive deduplication on `term`.
    - `GetDistrictAnalysisSettingsResponseSchema`: `{ districtId: string, districtName: string, activeConfiguration: DistrictAnalysisSettingsDto, draft: DistrictAnalysisSettingsDraftDto | null }`
    - `SaveDistrictAnalysisSettingsDraftResponseSchema`: `{ draft: DistrictAnalysisSettingsDraftDto, message: string }`
  - [x] 2.2 Re-export all schemas and inferred TypeScript types in `packages/api-contracts/src/index.ts`.

- [x] **Task 3: Backend Domain Repository & Service** (AC: 1, 2, 3, 4, 8, 9)
  - [x] 3.1 Create `apps/backend/src/modules/ai/district-analysis-settings-repository.ts` implementing `DistrictAnalysisSettingsRepositoryPort`:
    - `getActiveConfiguration(db, districtId)`: returns active version for district with deterministic ordering (`orderBy(desc(version))`).
    - `getDraft(db, districtId)`: returns draft row for district.
    - `saveDraft(db, draft)`: upserts on `district_id` returning saved draft.
  - [x] 3.2 Create `apps/backend/src/modules/ai/district-analysis-settings-service.ts` implementing `DistrictAnalysisSettingsService`:
    - `getActiveConfiguration(db, districtId)`: returns active DTO or fallback default (`id: 'dcfg_default'`, `version: 1`, `hokimRecognitionTerms: DEFAULT_HOKIM_RECOGNITION_TERMS`, `localVocabularyAdditions: []`, `isActive: true`) if no active version is seeded yet.
    - `getDraft(db, districtId)`: returns draft DTO or null.
    - `saveDraft(db, districtId, actor, payload)`: validates PO authorization, sanitizes and deduplicates terms (NFC normalized, whitespace collapsed), executes atomic transaction storing draft and calling `recordAuditEvent` with `action: 'DISTRICT_ANALYSIS_SETTINGS_DRAFT_SAVED'`, `districtId`, `actorRole: 'PRODUCT_OWNER'`.
  - [x] 3.3 Enforce decoupling: saving district draft does not invoke AI models, mutate active profile tables, or trigger topic recalculations.

- [x] **Task 4: Fastify API Routes & Product Owner Authorization** (AC: 1, 8, 9)
  - [x] 4.1 Create `apps/backend/src/modules/ai/district-analysis-settings-routes.ts`:
    - Encapsulate under `createRequireProductOwner(db)` preHandler.
    - `GET /api/v1/ai/settings/districts/:districtId`: validates district existence (returns 404 `{ error: { code: 'DISTRICT_NOT_FOUND', message: 'Туман топилмади.', statusCode: 404 } }` if not found), returns active config and draft.
    - `POST /api/v1/ai/settings/districts/:districtId/draft`: validates district existence (returns 404 if not found), validates request body against `SaveDistrictAnalysisSettingsDraftSchema` (400 with sanitized errors), verifies PO actor, persists draft atomically with audit event, returns 200 with saved draft.
  - [x] 4.2 Register `registerDistrictAnalysisSettingsRoutes(server, ctx.db)` in `apps/backend/src/entrypoints/http.ts`.

- [x] **Task 5: Frontend API Client & React Query Hooks** (AC: 1, 2, 4, 5, 8, 10)
  - [x] 5.1 Create `apps/web/src/api/district-settings-client.ts` with typed methods:
    - `getDistrictAnalysisSettings(districtId: string, signal?: AbortSignal)`
    - `saveDistrictAnalysisSettingsDraft(districtId: string, payload: SaveDistrictAnalysisSettingsDraftRequest)`
  - [x] 5.2 Create `apps/web/src/hooks/useDistrictAnalysisSettings.ts`:
    - Custom query hook `useDistrictAnalysisSettings(districtId)` scoped by `districtSettingsKeys.detail(districtId)`, forwarding `signal` to client, enabled only when `districtId` is non-null.
    - Custom mutation hook `useSaveDistrictSettingsDraft(districtId)` handling targeted cache update (`setQueryData`) and cache invalidation on `districtSettingsKeys.detail(districtId)` and feedback messages.

- [x] **Task 6: Frontend UI Components & Tab Integration** (AC: 1, 2, 3, 4, 5, 6, 7, 10, 11)
  - [x] 6.1 Create `apps/web/src/components/ai/ActiveDistrictSettingsCard.tsx`:
    - Displays active version (e.g. `dcfg_dist_123_v1`), Tashkent activation time, active Hokim terms as tags, and active local vocabulary table/tags with Uzbek Cyrillic labels.
  - [x] 6.2 Create `apps/web/src/components/ai/HokimRecognitionTermsInput.tsx`:
    - Interactive tag management for Hokim recognition terms with text input, Add button, Enter key trigger, duplicate detection inline alert, delete icons with descriptive `aria-label={`Ўчириш: ${term}`}`, and accessible labels.
  - [x] 6.3 Create `apps/web/src/components/ai/DistrictLocalVocabularyInput.tsx`:
    - Manage local vocabulary items with term, preset/custom category dropdown (`Маҳалла номлари`, `Мўлжал ва жойлар`, `Маҳаллий атамалар`, `Сув ҳавзалари ва каналлар`, `Маҳаллий муассасалар`, `Бошқа`), description, and table row deletion using `actualIndex = value.findIndex(item => item.term === record.term)` to prevent pagination-induced deletion bugs.
  - [x] 6.4 Create `apps/web/src/components/ai/DistrictSettingsDraftForm.tsx`:
    - Pre-populated from draft or active configuration.
    - AI guidance notice banner (AC 6): explains that terms serve as contextual AI guidance rather than deterministic keyword-rule filters.
    - Accessible error summary container (`role="alert"`, `tabIndex={-1}`, `id="district-settings-error-summary"`) focusing on validation failure with button links using `form.scrollToField(field, { behavior: 'smooth' })`.
    - Field input/container IDs matching error summary targets (`id="draft-hokimRecognitionTerms"`, `id="draft-localVocabularyAdditions"`).
    - Dirty state management via `useDirtyState('district-settings-draft', isDirty)` and `if (!isFormDirty)` background sync protection in `useEffect`.
    - Discard button with confirmation and reset.
    - Save Draft button calling `saveDistrictAnalysisSettingsDraft`.
    - Offline awareness with disabled controls and warning banner.
  - [x] 6.5 Update `apps/web/src/pages/AiOperationsPage.tsx`:
    - Enable `district` (`Туман созламалари`) tab (remove disabled flag and placeholder tag).
    - Handle `activeDistrictId === null`: display accessible district selector prompt with embedded `<DistrictSelector />` component and informative Alert (`type="info"`, message `Туман созламаларини кўриш ва таҳрирлаш учун аввал туманни танланг`).
    - Handle `activeDistrictId !== null`: render `ActiveDistrictSettingsCard` and `DistrictSettingsDraftForm`.
    - Coordinate with `useDistrict().attemptTransition` so switching tabs or switching districts with dirty forms triggers `UnsavedChangesModal`.

- [x] **Task 7: Backend Integration Tests** (AC: 12)
  - [x] 7.1 Create `apps/backend/tests/district-analysis-settings.test.ts`:
    - Test Product Owner authentication & authorization vs Hokim 403 denial.
    - Test explicit District scoping and 404 for non-existent district (`DISTRICT_NOT_FOUND`).
    - Test initial load with default active configuration when no draft exists.
    - Test draft persistence and resumption for District A.
    - Test cross-District isolation (District A draft never visible in District B).
    - Test validation failure with invalid payload (empty Hokim terms, duplicate items, out-of-range text).
    - Test active configuration immutability (draft save does not change active version or `ai_profiles`).
    - Test audit trail event generation with `DISTRICT_ANALYSIS_SETTINGS_DRAFT_SAVED`.
  - [x] 7.2 Update `apps/backend/tests/db-schema.test.ts` to verify `districtAnalysisSettingsVersions` and `districtAnalysisSettingsDrafts` tables and foreign key constraints.

- [x] **Task 8: Frontend Component Tests** (AC: 12)
  - [x] 8.1 Create `apps/web/tests/unit/DistrictAiOperations.test.tsx`:
    - Test empty district state prompting Product Owner to select a District.
    - Test active District configuration card rendering with Tashkent timestamps and Uzbek Cyrillic labels.
    - Test draft form initialization from active config and existing draft.
    - Test Hokim terms tag addition and deletion.
    - Test local vocabulary additions addition and deletion.
    - Test validation failure showing accessible error summary and focus transfer.
    - Test dirty state registration and `UnsavedChangesModal` interaction when switching districts.
    - Test successful draft save mutation.

---

## Dev Notes

### Architecture Patterns & Constraints

- **AD-1 (Hexagonal Modular Monolith):** Domain logic, repository ports, and Fastify routes reside cleanly within `apps/backend/src/modules/ai/`. Database access is isolated behind repository ports.
- **AD-8 (Zero Runtime Mutation Invariant):** Saving a District draft NEVER mutates active AI profiles, never executes AI models, and never replays completed historical message-level decisions or existing topics.
- **AD-9 (Explicit District Scope):** District settings are strictly scoped to `districtId`. Product Owner must specify an explicit target District; missing District scope is an error, never "all Districts". Cross-District leakage is strictly prevented.
- **AD-10 (Same-Origin REST Contracts):** Contracts live in `@mahalla-ovozi/api-contracts` using Zod schemas. Remote server state is managed by TanStack Query with query key factory `districtSettingsKeys.detail(districtId)`. District switches pass `AbortSignal` to cancel in-flight queries and purge prior-district cache via `executeSwitch`.

### Best-Practice Verified Guidelines (Current-Data Verification Phase)

1. **Ant Design 5 Dynamic Tag & Accessibility Best Practices:**
   - Use `<Space size={[0, 8]} wrap>` / `<Flex wrap gap="small">` with `theme.useToken()` styling for `HokimRecognitionTermsInput`.
   - Provide explicit descriptive `aria-label={`Ўчириш: ${tag}`}` on `closeIcon` to ensure WCAG 2.1/2.2 AA accessibility.
   - Support both Enter-key submission and "Қўшиш" button click with trim, NFC normalization, and duplicate detection.
2. **TanStack Query 5 Query Invalidation & Cancellation:**
   - Forward `AbortSignal` in `useDistrictAnalysisSettings` query function to allow clean cancellation on rapid district switches.
   - On mutation `onSuccess`, perform targeted cache update `setQueryData` and invalidation on `districtSettingsKeys.detail(districtId)` without manual redundant GET fetches.
3. **Fastify 5 + Zod Route Parameter Validation:**
   - Define strict TypeScript parameter interface `interface DistrictSettingsRouteParams { districtId: string }` and validate with Zod and `createRequireProductOwner(db)` preHandler.
4. **Drizzle ORM 0.45.x PostgreSQL JSONB & Upsert Invariants:**
   - Use `$type<string[]>()` and `$type<DistrictLocalVocabularyItem[]>()` for type-safe JSONB columns.
   - Use `onConflictDoUpdate({ target: table.districtId, set: ... })` with atomic transaction wrapping both draft persistence and `recordAuditEvent`.

### Previous Story Intelligence & Lessons Learned (from Story 5.1)

1. **Vocabulary Table Deletion Indexing:** Do not delete table items by pagination row index. Always look up the record's unique key/term in the full array (`actualIndex = value.findIndex(item => item.term === record.term)`).
2. **Form Sync and Dirty State Guard:** In `useEffect`, guard incoming query data updates with `if (!isFormDirty)` so background refetches never overwrite active user typing.
3. **Accessible Error Summary Focus:** Ensure error summary DOM element has `tabIndex={-1}`, `role="alert"`, and container IDs (`id="draft-hokimRecognitionTerms"`, `id="draft-localVocabularyAdditions"`) matching the error summary button link targets. Use `form.scrollToField(field, { focus: true })` or DOM focus.
4. **Atomic Transactions:** Wrap draft persistence and `recordAuditEvent` in an atomic database transaction (`db.transaction(...)`).
5. **NFC Normalization & Case-Insensitive Deduplication:** When validating terms and vocabulary, normalize with `.normalize('NFC').replace(/\s+/g, ' ').toLowerCase()` to prevent subtle Unicode duplicate bugs.
6. **Query Cache Invalidation:** On successful mutation, update local React Query cache or invalidate `['district-settings', districtId]` without issuing redundant manual GET calls.
7. **Clean Database Foreign Keys:** Use `references(() => districts.id, { onDelete: 'cascade' })` and `references(() => accounts.id, { onDelete: 'set null' })`.

### Source Tree Components

#### Files Created [NEW]
- `apps/backend/src/modules/ai/district-analysis-settings-repository.ts`
- `apps/backend/src/modules/ai/district-analysis-settings-service.ts`
- `apps/backend/src/modules/ai/district-analysis-settings-routes.ts`
- `apps/backend/tests/district-analysis-settings.test.ts`
- `apps/backend/drizzle/0015_soft_tony_stark.sql`
- `apps/backend/drizzle/meta/0015_snapshot.json`
- `apps/web/src/api/district-settings-client.ts`
- `apps/web/src/hooks/useDistrictAnalysisSettings.ts`
- `apps/web/src/components/ai/ActiveDistrictSettingsCard.tsx`
- `apps/web/src/components/ai/HokimRecognitionTermsInput.tsx`
- `apps/web/src/components/ai/DistrictLocalVocabularyInput.tsx`
- `apps/web/src/components/ai/DistrictSettingsDraftForm.tsx`
- `apps/web/tests/unit/DistrictAiOperations.test.tsx`

#### Files Modified [UPDATE]
- `packages/api-contracts/src/analysis-settings.ts`
- `packages/api-contracts/src/index.ts`
- `apps/backend/src/adapters/db/schema/ai.ts`
- `apps/backend/src/adapters/db/schema/index.ts`
- `apps/backend/src/adapters/db/seeds.ts`
- `apps/backend/src/entrypoints/http.ts`
- `apps/backend/tests/db-schema.test.ts`
- `apps/web/src/pages/AiOperationsPage.tsx`

---

## Dev Agent Record

### Agent Model Used

Gemini 3.7 Flash (High)

### Debug Log References

- Migration `0015_soft_tony_stark.sql` applied to both `mahalla_ovozi` and `mahalla_ovozi_test`.
- Backend test suite: 51/51 files passed (741/741 tests).
- Frontend test suite: 40/40 files passed (236/236 tests).
- Typecheck: passed 0 errors across `@mahalla-ovozi/api-contracts`, `@mahalla-ovozi/backend`, `@mahalla-ovozi/web`.

### Completion Notes List

- Implemented database schema, indexes, and migrations for `districtAnalysisSettingsVersions` and `districtAnalysisSettingsDrafts`.
- Implemented Zod schemas and TypeScript types with NFC-normalized deduplication for Hokim terms and local vocabulary in `@mahalla-ovozi/api-contracts`.
- Implemented backend domain repository, service, and Fastify routes guarded by `createRequireProductOwner(db)` with audit trail recording (`DISTRICT_ANALYSIS_SETTINGS_DRAFT_SAVED`).
- Implemented frontend API client, TanStack Query hooks, `ActiveDistrictSettingsCard`, `HokimRecognitionTermsInput`, `DistrictLocalVocabularyInput`, `DistrictSettingsDraftForm`, and integrated into `AiOperationsPage`.
- Verified Zero Runtime Mutation Invariant AD-8, strict explicit district scoping AD-9, dirty form guard integration with `UnsavedChangesModal`, and WCAG 2.1/2.2 AA accessibility.

### File List

- `_bmad-output/implementation-artifacts/5-2-prepare-a-district-recognition-settings-draft.md` [UPDATE]
- `_bmad-output/implementation-artifacts/sprint-status.yaml` [UPDATE]
- `packages/api-contracts/src/analysis-settings.ts` [UPDATE]
- `packages/api-contracts/src/index.ts` [UPDATE]
- `apps/backend/src/adapters/db/schema/ai.ts` [UPDATE]
- `apps/backend/src/adapters/db/schema/index.ts` [UPDATE]
- `apps/backend/src/adapters/db/seeds.ts` [UPDATE]
- `apps/backend/drizzle/0015_soft_tony_stark.sql` [NEW]
- `apps/backend/drizzle/meta/0015_snapshot.json` [NEW]
- `apps/backend/drizzle/meta/_journal.json` [UPDATE]
- `apps/backend/src/modules/ai/district-analysis-settings-repository.ts` [NEW]
- `apps/backend/src/modules/ai/district-analysis-settings-service.ts` [NEW]
- `apps/backend/src/modules/ai/district-analysis-settings-routes.ts` [NEW]
- `apps/backend/src/entrypoints/http.ts` [UPDATE]
- `apps/backend/tests/db-schema.test.ts` [UPDATE]
- `apps/backend/tests/district-analysis-settings.test.ts` [NEW]
- `apps/web/src/api/district-settings-client.ts` [NEW]
- `apps/web/src/hooks/useDistrictAnalysisSettings.ts` [NEW]
- `apps/web/src/components/ai/ActiveDistrictSettingsCard.tsx` [NEW]
- `apps/web/src/components/ai/HokimRecognitionTermsInput.tsx` [NEW]
- `apps/web/src/components/ai/DistrictLocalVocabularyInput.tsx` [NEW]
- `apps/web/src/components/ai/DistrictSettingsDraftForm.tsx` [NEW]
- `apps/web/src/pages/AiOperationsPage.tsx` [UPDATE]
- `apps/web/tests/unit/DistrictAiOperations.test.tsx` [NEW]


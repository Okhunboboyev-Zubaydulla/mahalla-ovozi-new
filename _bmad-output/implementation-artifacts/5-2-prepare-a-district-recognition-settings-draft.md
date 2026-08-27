---
baseline_commit: d7b789af9179f3e83509eede242e8f93646c4c47
---

# Story 5.2: Prepare a District Recognition Settings Draft

Status: ready-for-dev

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
   - **When** terms are input and validated
   - **Then** multilingual Uzbek/Russian, Latin/Cyrillic forms, jargon, abbreviations, common typos, and informal terms can be represented
   - **And** the UI clearly communicates that configured terms serve as contextual AI guidance rather than deterministic keyword-rule admission/rejection filters
   - **And** saving or editing the draft does not alter the immutable prompt contract or invoke production AI.

7. **Accessible Form Validation & Sanitized Error Summary (AC 7)**
   - **Given** the District Settings draft violates the project-owned validation contract (e.g. empty Hokim terms list, term length > 100 chars, duplicate terms, invalid vocabulary items)
   - **When** Save is attempted
   - **Then** the draft is not reported as successfully saved
   - **And** one accessible error summary box (`role="alert"`, `tabIndex={-1}`, `id="district-settings-error-summary"`) receives immediate keyboard focus
   - **And** each listed error renders a button link utilizing `form.scrollToField(field, { focus: true })`
   - **And** each invalid control is programmatically associated with its specific error message via `validateStatus="error"` and `help={fieldErrors[field]}`
   - **And** valid entered values remain intact without resetting the form
   - **And** errors are sanitized and do not expose database errors, credentials, or provider secrets.

8. **Valid Draft Persistence & Active Config Immutability (AC 8)**
   - **Given** the District Settings draft satisfies the project-owned validation contract
   - **When** the Product Owner selects `Сақлаш` (Save Draft)
   - **Then** the resumable working draft is persisted only for the explicitly selected District in `district_analysis_settings_drafts` (upsert on `district_id`)
   - **And** the UI reports successful Save only (`Қоралама муваффақиятли сақланди`), without claiming activation
   - **And** the immutable active District configuration and active `ai_profiles` remain completely unchanged
   - **And** saving the draft performs no AI processing and does not replay, restart, reassess, or rewrite completed or pending production message-level decisions
   - **And** a tamper-evident audit record is appended via `recordAuditEvent` (`action: 'DISTRICT_ANALYSIS_SETTINGS_DRAFT_SAVED'`, `districtId`, `actorRole: 'PRODUCT_OWNER'`, outcome `SUCCESS`).

9. **Strict Server-Side Product Owner Authorization & District Context Validation (AC 9)**
   - **Given** a Hokim or unauthenticated actor attempts to read or modify District Settings (`GET` or `POST` `/api/v1/ai/settings/districts/:districtId*`)
   - **When** server authorization is evaluated
   - **Then** access is denied (`403 Forbidden` / `401 Unauthorized`) using server-derived actor context
   - **And** browser-supplied role or scope values cannot grant Product Owner configuration authority
   - **And** requesting an invalid or non-existent `:districtId` returns `404 Not Found` with `{ error: { code: 'DISTRICT_NOT_FOUND', message: 'Туман топилмади.', statusCode: 404 } }` without disclosing other District configurations.

10. **Offline Resilience & Reconnect Handling (AC 10)**
    - **Given** network connectivity is lost while authorized District Settings are open
    - **When** the Product Owner remains offline
    - **Then** already-loaded permitted data remains visible read-only with the approved offline indication (`Alert` banner)
    - **And** Save and other mutations are disabled/blocked and never queued for automatic background replay
    - **And** reconnect revalidates the session, Product Owner authorization, and active District context before refreshing.

11. **Keyboard Navigation, Responsive, Zoom & Reduced-Motion Accessibility (AC 11)**
    - **Given** District Settings is used with keyboard navigation, supported responsive widths, 200% zoom, or reduced-motion preference
    - **When** the Product Owner reviews or edits the draft
    - **Then** all core controls (inputs, buttons, tag deletion controls, table rows) remain keyboard operable with visible logical focus
    - **And** state and validation meaning never depend on color alone
    - **And** Cyrillic vocabulary, long District names, and technical identifiers remain readable without clipping or unintended page-level horizontal overflow
    - **And** reduced-motion preference does not delay essential state feedback.

12. **Automated Integration & Component Test Verification (AC 12)**
    - **Given** Story 5.2 automated tests execute
    - **When** backend integration tests run against `mahalla_ovozi_test`
    - **Then** test suite verifies Product Owner authorization vs Hokim 403 denial, explicit District scoping, cross-District draft isolation, draft creation and resumption, validation failure with preserved input, active config immutability, and audit logging
    - **And** when frontend tests run in Vitest / React Testing Library, test suite verifies District selection prompt, active config rendering, draft form editing, tag/vocabulary management, dirty-state guarding on District switch, accessible error summary focus, and successful Save mutation.

---

## Tasks / Subtasks

- [ ] **Task 1: Relational Schema & Database Migrations** (AC: 1, 2, 3, 4, 8)
  - [ ] 1.1 In `apps/backend/src/adapters/db/schema/ai.ts`, define `districtAnalysisSettingsVersions` table:
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
  - [ ] 1.2 In `apps/backend/src/adapters/db/schema/ai.ts`, define `districtAnalysisSettingsDrafts` table:
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
  - [ ] 1.3 Export inferred TypeScript types (`DistrictAnalysisSettingsVersion`, `NewDistrictAnalysisSettingsVersion`, `DistrictAnalysisSettingsDraft`, `NewDistrictAnalysisSettingsDraft`) in `apps/backend/src/adapters/db/schema/ai.ts` and re-export in `apps/backend/src/adapters/db/schema/index.ts`.
  - [ ] 1.4 Generate and apply Drizzle migration (e.g. `0015_*.sql`) for both development database (`mahalla_ovozi`) and test database (`mahalla_ovozi_test`).
  - [ ] 1.5 Update `apps/backend/src/adapters/db/seeds.ts` with default District analysis settings constants (`DEFAULT_HOKIM_RECOGNITION_TERMS`, `DEFAULT_DISTRICT_VOCABULARY_CATEGORIES`, default fallback configuration) and helper `ensureDefaultDistrictAnalysisSettings(db, districtId)`.

- [ ] **Task 2: API Contracts in `@mahalla-ovozi/api-contracts`** (AC: 1, 2, 3, 6, 7, 8)
  - [ ] 2.1 In `packages/api-contracts/src/analysis-settings.ts` (or `district-analysis-settings.ts`), define Zod schemas:
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
  - [ ] 2.2 Re-export all schemas and inferred TypeScript types in `packages/api-contracts/src/index.ts`.

- [ ] **Task 3: Backend Domain Repository & Service** (AC: 1, 2, 3, 4, 8, 9)
  - [ ] 3.1 Create `apps/backend/src/modules/ai/district-analysis-settings-repository.ts` implementing `DistrictAnalysisSettingsRepositoryPort`:
    - `getActiveConfiguration(db, districtId)`: returns active version for district with deterministic ordering (`orderBy(desc(version))`).
    - `getDraft(db, districtId)`: returns draft row for district.
    - `saveDraft(db, draft)`: upserts on `district_id` returning saved draft.
  - [ ] 3.2 Create `apps/backend/src/modules/ai/district-analysis-settings-service.ts` implementing `DistrictAnalysisSettingsService`:
    - `getActiveConfiguration(db, districtId)`: returns active DTO or fallback default (`id: 'dcfg_default'`, `version: 1`, `hokimRecognitionTerms: DEFAULT_HOKIM_RECOGNITION_TERMS`, `localVocabularyAdditions: []`, `isActive: true`) if no active version is seeded yet.
    - `getDraft(db, districtId)`: returns draft DTO or null.
    - `saveDraft(db, districtId, actor, payload)`: validates PO authorization, sanitizes and deduplicates terms (NFC normalized, whitespace collapsed), executes atomic transaction storing draft and calling `recordAuditEvent` with `action: 'DISTRICT_ANALYSIS_SETTINGS_DRAFT_SAVED'`, `districtId`, `actorRole: 'PRODUCT_OWNER'`.
  - [ ] 3.3 Enforce decoupling: saving district draft does not invoke AI models, mutate active profile tables, or trigger topic recalculations.

- [ ] **Task 4: Fastify API Routes & Product Owner Authorization** (AC: 1, 8, 9)
  - [ ] 4.1 Create `apps/backend/src/modules/ai/district-analysis-settings-routes.ts`:
    - Encapsulate under `createRequireProductOwner(db)` preHandler.
    - `GET /api/v1/ai/settings/districts/:districtId`: validates district existence (returns 404 `{ error: { code: 'DISTRICT_NOT_FOUND', message: 'Туман топилмади.', statusCode: 404 } }` if not found), returns active config and draft.
    - `POST /api/v1/ai/settings/districts/:districtId/draft`: validates district existence (returns 404 if not found), validates request body against `SaveDistrictAnalysisSettingsDraftSchema` (400 with sanitized errors), verifies PO actor, persists draft atomically with audit event, returns 200 with saved draft.
  - [ ] 4.2 Register `registerDistrictAnalysisSettingsRoutes(server, ctx.db)` in `apps/backend/src/entrypoints/http.ts`.

- [ ] **Task 5: Frontend API Client & React Query Hooks** (AC: 1, 2, 4, 5, 8, 10)
  - [ ] 5.1 Create `apps/web/src/api/district-settings-client.ts` with typed methods:
    - `getDistrictAnalysisSettings(districtId: string, signal?: AbortSignal)`
    - `saveDistrictAnalysisSettingsDraft(districtId: string, payload: SaveDistrictAnalysisSettingsDraftRequest)`
  - [ ] 5.2 Create `apps/web/src/hooks/useDistrictAnalysisSettings.ts`:
    - Custom query hook `useDistrictAnalysisSettings(districtId)` scoped by `['district-settings', districtId]`, forwarding `signal` to client, enabled only when `districtId` is non-null.
    - Custom mutation hook `useSaveDistrictSettingsDraft(districtId)` handling targeted cache update (`setQueryData`) and cache invalidation on `['district-settings', districtId]` and feedback messages.

- [ ] **Task 6: Frontend UI Components & Tab Integration** (AC: 1, 2, 3, 4, 5, 6, 7, 10, 11)
  - [ ] 6.1 Create `apps/web/src/components/ai/ActiveDistrictSettingsCard.tsx`:
    - Displays active version (e.g. `dcfg_dist_123_v1`), Tashkent activation time, active Hokim terms as tags, and active local vocabulary table/tags with Uzbek Cyrillic labels.
  - [ ] 6.2 Create `apps/web/src/components/ai/HokimRecognitionTermsInput.tsx`:
    - Interactive tag management for Hokim recognition terms with text input, Add button, Enter key trigger, duplicate detection inline alert, delete icons with descriptive `aria-label={`Ўчириш: ${term}`}`, and accessible labels.
  - [ ] 6.3 Create `apps/web/src/components/ai/DistrictLocalVocabularyInput.tsx`:
    - Manage local vocabulary items with term, preset/custom category dropdown (`Маҳалла номлари`, `Мўлжал ва жойлар`, `Маҳаллий атамалар`, `Сув ҳавзалари ва каналлар`, `Маҳаллий муассасалар`, `Бошқа`), description, and table row deletion using `actualIndex = value.findIndex(item => item.term === record.term)` to prevent pagination-induced deletion bugs.
  - [ ] 6.4 Create `apps/web/src/components/ai/DistrictSettingsDraftForm.tsx`:
    - Pre-populated from draft or active configuration.
    - AI guidance notice banner (AC 6): explains that terms serve as contextual AI guidance rather than deterministic keyword-rule filters.
    - Accessible error summary container (`role="alert"`, `tabIndex={-1}`, `id="district-settings-error-summary"`) focusing on validation failure with button links using `form.scrollToField(field, { behavior: 'smooth' })`.
    - Field input/container IDs matching error summary targets (`id="draft-hokimRecognitionTerms"`, `id="draft-localVocabularyAdditions"`).
    - Dirty state management via `useDirtyState('district-settings-draft', isDirty)` and `if (!isFormDirty)` background sync protection in `useEffect`.
    - Discard button with confirmation and reset.
    - Save Draft button calling `saveDistrictAnalysisSettingsDraft`.
    - Offline awareness with disabled controls and warning banner.
  - [ ] 6.5 Update `apps/web/src/pages/AiOperationsPage.tsx`:
    - Enable `district` (`Туман созламалари`) tab (remove disabled flag and placeholder tag).
    - Handle `activeDistrictId === null`: display accessible district selector prompt with embedded `<DistrictSelector />` component and informative Alert (`type="info"`, message `Туман созламаларини кўриш ва таҳрирлаш учун аввал туманни танланг`).
    - Handle `activeDistrictId !== null`: render `ActiveDistrictSettingsCard` and `DistrictSettingsDraftForm`.
    - Coordinate with `useDistrict().attemptTransition` so switching tabs or switching districts with dirty forms triggers `UnsavedChangesModal`.

- [ ] **Task 7: Backend Integration Tests** (AC: 12)
  - [ ] 7.1 Create `apps/backend/tests/district-analysis-settings.test.ts`:
    - Test Product Owner authentication & authorization vs Hokim 403 denial.
    - Test explicit District scoping and 404 for non-existent district (`DISTRICT_NOT_FOUND`).
    - Test initial load with default active configuration when no draft exists.
    - Test draft persistence and resumption for District A.
    - Test cross-District isolation (District A draft never visible in District B).
    - Test validation failure with invalid payload (empty Hokim terms, duplicate items, out-of-range text).
    - Test active configuration immutability (draft save does not change active version or `ai_profiles`).
    - Test audit trail event generation with `DISTRICT_ANALYSIS_SETTINGS_DRAFT_SAVED`.
  - [ ] 7.2 Update `apps/backend/tests/db-schema.test.ts` to verify `districtAnalysisSettingsVersions` and `districtAnalysisSettingsDrafts` tables and foreign key constraints.

- [ ] **Task 8: Frontend Component Tests** (AC: 12)
  - [ ] 8.1 Create `apps/web/tests/unit/DistrictAiOperations.test.tsx`:
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

#### Files to Create [NEW]
- `apps/backend/src/modules/ai/district-analysis-settings-repository.ts`
- `apps/backend/src/modules/ai/district-analysis-settings-service.ts`
- `apps/backend/src/modules/ai/district-analysis-settings-routes.ts`
- `apps/backend/tests/district-analysis-settings.test.ts`
- `apps/web/src/api/district-settings-client.ts`
- `apps/web/src/hooks/useDistrictAnalysisSettings.ts`
- `apps/web/src/components/ai/ActiveDistrictSettingsCard.tsx`
- `apps/web/src/components/ai/HokimRecognitionTermsInput.tsx`
- `apps/web/src/components/ai/DistrictLocalVocabularyInput.tsx`
- `apps/web/src/components/ai/DistrictSettingsDraftForm.tsx`
- `apps/web/tests/unit/DistrictAiOperations.test.tsx`

#### Files to Modify [UPDATE]
- `packages/api-contracts/src/analysis-settings.ts` (or `district-analysis-settings.ts`)
- `packages/api-contracts/src/index.ts`
- `apps/backend/src/adapters/db/schema/ai.ts`
- `apps/backend/src/adapters/db/schema/index.ts`
- `apps/backend/src/adapters/db/seeds.ts`
- `apps/backend/src/entrypoints/http.ts`
- `apps/backend/tests/db-schema.test.ts`
- `apps/web/src/pages/AiOperationsPage.tsx`

### Project Structure Notes

- API routes follow `/api/v1/ai/settings/districts/:districtId` and `/api/v1/ai/settings/districts/:districtId/draft`.
- Query keys in TanStack Query follow `['district-settings', districtId]`.
- All user-facing text uses approved Uzbek Cyrillic (`Ў ў Қ қ Ғ ғ Ҳ ҳ`).

### References

- `_bmad-output/planning-artifacts/epics/epic-5.md#Story-5.2`
- `_bmad-output/planning-artifacts/prds/prd-Mahalla-Ovozi-2026-07-30/prd.md#FR-23`
- `_bmad-output/planning-artifacts/architecture/architecture-Mahalla-Ovozi-2026-08-12/ARCHITECTURE-SPINE.md#AD-8`
- `_bmad-output/planning-artifacts/architecture/architecture-Mahalla-Ovozi-2026-08-12/ARCHITECTURE-SPINE.md#AD-9`
- `_bmad-output/planning-artifacts/architecture/architecture-Mahalla-Ovozi-2026-08-12/ARCHITECTURE-SPINE.md#AD-10`
- `_bmad-output/planning-artifacts/ux-designs/ux-Mahalla-Ovozi-2026-08-05/EXPERIENCE.md`
- `_bmad-output/implementation-artifacts/5-1-prepare-a-validated-global-analysis-settings-draft.md`

---

## Dev Agent Record

### Agent Model Used

Gemini 3.7 Flash (High)

### Debug Log References

### Completion Notes List

### File List

- `_bmad-output/implementation-artifacts/5-2-prepare-a-district-recognition-settings-draft.md` [NEW]
- `_bmad-output/implementation-artifacts/sprint-status.yaml` [UPDATE]

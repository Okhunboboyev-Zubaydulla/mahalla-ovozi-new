# Story 5.1: Prepare a Validated Global Analysis Settings Draft

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the **Product Owner**,  
I want to review the active global analysis settings and save a validated draft of proposed changes,  
So that I can safely prepare model, prompt, and global recognition-vocabulary changes without affecting production processing.

## Acceptance Criteria

1. **Active Configuration Presentation & Uzbek Cyrillic (AC 1)**
   - **Given** an authenticated Product Owner opens `AI Operations` > `Global Settings` (`/ai-operations` tab `Глобал созламалар`)
   - **When** the settings load
   - **Then** the current active global analysis configuration is presented as read-only reference information
   - **And** its exact active version identifier (e.g. `gcfg_v1`) and activation time (formatted in `Asia/Tashkent` timezone) are visible
   - **And** all product-facing copy uses approved Uzbek Cyrillic (`Фаол глобал таҳлил созламалари`, `Версия`, `Фаоллаштирилган вақти`, `Модель`, `Провайдер`, `Ҳарорат`, `Максимал токенлар`, `Тизим кўрсатмалари`, `Умумий хизмат луғати`)
   - **And** the Global Settings surface does not require, infer, or silently adopt a District context.

2. **Working Draft Initialization & Boundary Defense (AC 2)**
   - **Given** no saved Global Settings draft exists in the database
   - **When** the Product Owner begins reviewing or editing
   - **Then** the working draft starts pre-populated from the currently active global configuration
   - **And** only project-owned editable analysis settings approved for this scope are exposed:
     - `modelProvider`: Supported providers (`OPENAI`, `GEMINI`, `GROQ`, `OLLAMA`)
     - `modelId`: Approved model identifier string with provider-aware presets (e.g., OpenAI: `gpt-4o-mini`, `gpt-4o`; Gemini: `gemini-2.0-flash`, `gemini-1.5-flash`; Groq: `llama-3.1-8b-instant`, `llama-3.3-70b-versatile`; Ollama: `qwen2.5:7b`, `llama3.1:8b`) while supporting custom valid model strings
     - `temperature`: Numerical value between `0.0` and `1.0` (step `0.05`, default `0.0`)
     - `maxOutputTokens`: Integer between `100` and `2000` (step `50`, default `500`)
     - `relevanceSystemPrompt`: Semantic relevance classification system prompt template
     - `topicMatchingSystemPrompt`: Topic assignment and clustering system prompt template
     - `topicProjectionSystemPrompt`: Topic summary and lane projection system prompt template
     - `globalServiceVocabulary`: Array of domain vocabulary terms with category annotations (`Сув таъминоти`, `Газ таъминоти`, `Электр энергияси`, `Чиқинди ва тозалик`, `Йўл ва инфратузилма`, `Ҳокимият ва бошқарув`)
   - **And** provider SDK/native response objects, credentials, API keys, secrets, and provider-native infrastructure internals do not cross the browser contract.

3. **Resumable Draft Restoration (AC 3)**
   - **Given** a saved Global Settings draft already exists
   - **When** the Product Owner returns to Global Settings
   - **Then** the same resumable working draft is restored for continued editing
   - **And** the draft is clearly distinguishable visually from the active configuration card (distinct badge `Қоралама` vs `Фаол созламалар`)
   - **And** loading or editing the draft does not alter production behavior or active profiles.

4. **Unsaved Changes Guard Integration (AC 4)**
   - **Given** the Product Owner has unsaved changes in the Global Settings draft form
   - **When** they attempt a navigation, tab switch, or context transition that would discard editing state
   - **Then** the approved unsaved-change guard modal (`UnsavedChangesModal`) is presented
   - **And** choosing `Таҳрирлашни давом эттириш` (Continue editing) preserves current draft values and editing context
   - **And** choosing `Ўзгаришларни бекор қилиш` (Discard) removes unpersisted working changes and resets to the last saved draft or active config.

5. **Valid Draft Persistence & Active Config Immutability (AC 5)**
   - **Given** the Global Settings draft satisfies the project-owned validation contract
   - **When** the Product Owner selects `Сақлаш` (Save Draft)
   - **Then** the single resumable working Global Settings draft is persisted in `global_analysis_settings_drafts` (singleton row `id = 'global'`)
   - **And** the UI reports successful Save only (`Қоралама муваффақиятли сақланди`), without claiming activation
   - **And** the immutable active configuration/profile remains completely unchanged
   - **And** saving the draft does not replay, restart, reassess, or rewrite completed or pending production message-level decisions solely because configuration values were saved
   - **And** a tamper-evident audit record is appended via `recordAuditEvent` (`action: 'GLOBAL_ANALYSIS_SETTINGS_DRAFT_SAVED'`, category `OPERATIONAL_LIFECYCLE`, outcome `SUCCESS`).

6. **Accessible Form Validation & Sanitized Error Summary (AC 6)**
   - **Given** the Global Settings draft violates the project-owned validation contract (e.g. empty prompts, out-of-range temperature, invalid token limits)
   - **When** Save is attempted
   - **Then** the draft is not reported as successfully saved
   - **And** one accessible error summary box (`role="alert"`, `tabIndex={-1}`, id="global-settings-error-summary") receives keyboard focus (`setTimeout(() => errorSummaryRef.current?.focus(), 0)`)
   - **And** each listed error renders a button link utilizing `form.scrollToField(field, { focus: true })`
   - **And** each invalid control is programmatically associated with its specific error message via `validateStatus="error"` and `help={fieldErrors[field]}`
   - **And** valid entered values remain intact without clearing the form
   - **And** errors are sanitized and do not expose provider-native responses, credentials, secrets, or resident content.

7. **Contract-Only Validation Boundary (AC 7)**
   - **Given** the Product Owner saves or validates a Global Settings draft
   - **When** the application evaluates the draft
   - **Then** validation is strictly limited to the approved application/configuration Zod contract
   - **And** saving or validating the draft does not invoke production AI models
   - **And** Story 5.1 introduces no special AI evaluation surface, persisted validation examples, AI score, formal evaluation report, or manual-validation product workflow.

8. **Strict Server-Side Product Owner Authorization (AC 8)**
   - **Given** a Hokim or another unauthorized actor attempts to read or modify Global Settings (`GET` or `POST` `/api/v1/ai/settings/global*`)
   - **When** server authorization is evaluated
   - **Then** access is denied (`403 Forbidden` / `401 Unauthorized`) using server-derived actor context
   - **And** browser-supplied role or scope values cannot grant Product Owner configuration authority.

9. **Offline Resilience & Reconnect Handling (AC 9)**
   - **Given** network connectivity is lost while authorized Global Settings are open
   - **When** the Product Owner remains offline
   - **Then** already-loaded permitted data remains visible read-only with the approved offline indication (`Alert` banner)
   - **And** Save and other mutations are blocked and never queued for automatic background replay
   - **And** reconnect revalidates the session and Product Owner authorization before refreshing or allowing mutations.

10. **Keyboard Navigation, Responsive, Zoom & Reduced-Motion Accessibility (AC 10)**
    - **Given** Global Settings is used with keyboard navigation, supported responsive widths, 200% zoom, or reduced-motion preference
    - **When** the Product Owner reviews or edits the draft
    - **Then** all core controls (inputs, textareas, sliders, buttons) remain keyboard operable with visible logical focus
    - **And** state and validation meaning never depend on color alone
    - **And** Cyrillic values, long technical identifiers, and actions remain usable without clipping or unintended page-level horizontal overflow
    - **And** reduced-motion preference does not delay essential state feedback.

11. **Automated Integration Test Verification (AC 11)**
    - **Given** Story 5.1 backend integration tests run against the isolated test database (`mahalla_ovozi_test`)
    - **When** tests execute
    - **Then** test suite verifies:
      - Product Owner authorization vs Hokim 403 denial
      - Active global configuration retrieval and draft initialization
      - Draft persistence and resumption
      - Validation failure on invalid contracts with preserved state
      - Proof that saving draft does not mutate active configuration version or active `aiProfiles`
      - Audit trail event emission on draft save.

12. **Frontend UI Component Test Verification (AC 12)**
    - **Given** Story 5.1 frontend tests run in Vitest / React Testing Library
    - **When** tests execute
    - **Then** test suite verifies:
      - Active config card rendering with Uzbek Cyrillic labels and version metadata
      - Draft form rendering with pre-populated values
      - Dirty-state registration on edit and `UnsavedChangesModal` integration
      - Accessible error summary rendering and `form.scrollToField` focus management on validation failure
      - Successful draft save mutation without claiming activation.

---

## Tasks / Subtasks

- [ ] **Task 1: Relational Schema & Database Migrations** (AC: 1, 2, 3, 5)
  - [ ] 1.1 Add `global_analysis_settings_versions` table to `apps/backend/src/adapters/db/schema/ai.ts` to represent immutable activated global analysis configurations (capturing `id`, `version`, `modelProvider`, `modelId`, `temperature`, `maxOutputTokens`, `relevanceSystemPrompt`, `topicMatchingSystemPrompt`, `topicProjectionSystemPrompt`, `globalServiceVocabulary` typed as `jsonb` of `GlobalServiceVocabularyItem[]`, `isActive`, `activatedAt`, `activatedBy`, `changeReason`, `createdAt`).
  - [ ] 1.2 Add `global_analysis_settings_drafts` table to `apps/backend/src/adapters/db/schema/ai.ts` to represent the single resumable global draft (`id: text('id').primaryKey()` singleton `'global'`, `baseActiveVersionId` foreign key to `globalAnalysisSettingsVersions.id`, `modelProvider`, `modelId`, `temperature`, `maxOutputTokens`, `relevanceSystemPrompt`, `topicMatchingSystemPrompt`, `topicProjectionSystemPrompt`, `globalServiceVocabulary` typed as `jsonb` of `GlobalServiceVocabularyItem[]`, `updatedBy`, `createdAt`, `updatedAt`).
  - [ ] 1.3 Update `apps/backend/src/adapters/db/seeds.ts` with default active global configuration version (`gcfg_v1`, version 1) populated with canonical evaluator prompts (`SEMANTIC_RELEVANCE_SYSTEM_PROMPT`, `TOPIC_MATCHING_SYSTEM_PROMPT`, `TOPIC_PROJECTION_SYSTEM_PROMPT`) and standard service vocabulary.
  - [ ] 1.4 Re-export schema in `apps/backend/src/adapters/db/schema/index.ts`.

- [ ] **Task 2: API Contracts in `@mahalla-ovozi/api-contracts`** (AC: 1, 2, 5, 6, 7)
  - [ ] 2.1 Create `packages/api-contracts/src/analysis-settings.ts` with Zod schemas:
    - `AiModelProviderEnumSchema` (`'OPENAI' | 'GEMINI' | 'GROQ' | 'OLLAMA'`)
    - `GlobalServiceVocabularyItemSchema` (`{ term: string (min 1, max 100), category: string (min 1, max 100), description?: string (max 500) }`)
    - `GlobalAnalysisSettingsDtoSchema` (active configuration DTO with ISO timestamp strings)
    - `GlobalAnalysisSettingsDraftDtoSchema` (draft DTO with `id: 'global'`)
    - `SaveGlobalAnalysisSettingsDraftSchema` (request payload with strict validation: temperature 0.0-1.0, maxOutputTokens 100-2000, prompts trimmed min 20 max 10000 chars, vocabulary items min 1 with unique trimmed/case-insensitive terms)
    - `GetGlobalAnalysisSettingsResponseSchema` (`{ activeConfiguration: ..., draft: ... | null }`)
    - `SaveGlobalAnalysisSettingsDraftResponseSchema` (`{ draft: ..., message: string }`)
  - [ ] 2.2 Export schemas and inferred TypeScript types in `packages/api-contracts/src/index.ts`.

- [ ] **Task 3: Backend Domain & Application Services** (AC: 1, 2, 3, 5, 7, 8)
  - [ ] 3.1 Create `apps/backend/src/modules/ai/global-analysis-settings-repository.ts` implementing `GlobalAnalysisSettingsRepositoryPort` (`getActiveConfiguration`, `getDraft`, `saveDraft` upsert on `id = 'global'`).
  - [ ] 3.2 Create `apps/backend/src/modules/ai/global-analysis-settings-service.ts` to handle business logic:
    - Fetch active configuration (with hardcoded `DEFAULT_GLOBAL_ANALYSIS_SETTINGS` fallback if table is empty in unseeded test environments).
    - Fetch existing draft (or initialize working copy from active if none exists).
    - Save draft with payload sanitization and vocabulary deduplication.
    - Transactional audit event recording via `recordAuditEvent(db, { action: 'GLOBAL_ANALYSIS_SETTINGS_DRAFT_SAVED', districtId: null, actorId, actorRole: 'PRODUCT_OWNER', metadata: { baseActiveVersionId, modelProvider, modelId, temperature, maxOutputTokens } })`.
  - [ ] 3.3 Ensure strict decoupling: saving draft does not execute AI models, mutate active profile tables, or trigger topic recalculations.

- [ ] **Task 4: Fastify API Routes & Product Owner Authorization** (AC: 1, 3, 5, 6, 8)
  - [ ] 4.1 Create `apps/backend/src/modules/ai/global-analysis-settings-routes.ts` defining:
    - `GET /api/v1/ai/settings/global` (Protected, requires `actorContext.role === 'PRODUCT_OWNER'`)
    - `POST /api/v1/ai/settings/global/draft` (Protected, requires `actorContext.role === 'PRODUCT_OWNER'`, validated via `SaveGlobalAnalysisSettingsDraftSchema`)
  - [ ] 4.2 Register routes in `apps/backend/src/entrypoints/http.ts`.
  - [ ] 4.3 Implement error handling and sanitized error responses adhering to AD-10.

- [ ] **Task 5: Frontend API Client & React Query Hooks** (AC: 1, 2, 3, 5, 9)
  - [ ] 5.1 Create `apps/web/src/api/global-settings-client.ts` with typed methods `getGlobalSettings()` and `saveGlobalSettingsDraft(payload)`.
  - [ ] 5.2 Create custom hook `useGlobalAnalysisSettings()` in `apps/web/src/hooks/useGlobalAnalysisSettings.ts` using TanStack Query (`staleTime: 30_000`, `queryKey: ['ai', 'settings', 'global']`).
  - [ ] 5.3 Create custom hook `useSaveGlobalSettingsDraft()` handling cache invalidation and error feedback.

- [ ] **Task 6: Frontend UI Components & Page** (AC: 1, 2, 3, 4, 5, 6, 9, 10)
  - [ ] 6.1 Refactor `apps/web/src/pages/placeholders/AiOperationsPage.tsx` into a full `AiOperationsPage` located at `apps/web/src/pages/AiOperationsPage.tsx` with Ant Design `Tabs` and dirty-state guarded tab changes via `attemptTransition`:
    - Tab 1: `Глобал созламалар` (Global Settings)
    - Tab 2: `Туман созламалари` (District Settings - disabled / badge "5.2 босқичида")
    - Tab 3: `Созламалар тарихи` (Configuration History - disabled / badge "5.4 босқичида")
    - Tab 4: `Операциялар мониторинги` (Operations Monitoring - links to AI operations query table)
  - [ ] 6.2 Implement `ActiveGlobalSettingsCard.tsx` displaying read-only active configuration version, Tashkent activation time, model parameters, and helper notice.
  - [ ] 6.3 Implement `GlobalSettingsDraftForm.tsx` with:
    - Provider & Model dropdown/inputs with approved presets (`OPENAI: gpt-4o-mini, gpt-4o; GEMINI: gemini-2.0-flash, gemini-1.5-flash; GROQ: llama-3.1-8b-instant, llama-3.3-70b-versatile; OLLAMA: qwen2.5:7b, llama3.1:8b`).
    - Temperature slider and NumberInput (`0.0` to `1.0`, step `0.05`).
    - Max output tokens NumberInput (`100` to `2000`).
    - Monospace TextAreas using `token.fontFamilyCode` for the 3 system prompts (`relevanceSystemPrompt`, `topicMatchingSystemPrompt`, `topicProjectionSystemPrompt`).
    - `GlobalServiceVocabularyInput.tsx` for managing categorized vocabulary items with tag chips.
  - [ ] 6.4 Implement accessible `ErrorSummary` container at top of draft form with `role="alert"`, `tabIndex={-1}`, and focusable buttons calling `form.scrollToField(field, { focus: true })`.
  - [ ] 6.5 Integrate dirty-state management via `useDirtyState('global-settings-draft', isDirty)` and `UnsavedChangesModal`.
  - [ ] 6.6 Integrate offline state banner using `useOnlineStatus()` to disable Save button and show notification when disconnected.
  - [ ] 6.7 Ensure full keyboard operability, visible focus rings (`token.colorPrimary`), and 200% zoom layout resilience without horizontal scroll.

- [ ] **Task 7: Backend Integration Tests** (AC: 11)
  - [ ] 7.1 Create `apps/backend/tests/global-analysis-settings.test.ts`.
  - [ ] 7.2 Test Product Owner authorization (PO permitted, Hokim denied with 403, unauthenticated denied with 401).
  - [ ] 7.3 Test initial load returns active configuration and null/initial draft.
  - [ ] 7.4 Test saving draft updates `global_analysis_settings_drafts` and records audit event in `audit_events`.
  - [ ] 7.5 Test validation errors reject invalid payloads without saving draft or corrupting database.
  - [ ] 7.6 Test that saving draft does NOT mutate active configuration version, does NOT change `ai_profiles` row count or active state, and does NOT trigger AI gateway calls.

- [ ] **Task 8: Frontend Component Tests** (AC: 12)
  - [ ] 8.1 Create `apps/web/src/pages/__tests__/AiOperationsPage.test.tsx`.
  - [ ] 8.2 Test active config card renders version identifier and Tashkent timestamp correctly.
  - [ ] 8.3 Test form fields allow editing and register dirty state with district/transition context.
  - [ ] 8.4 Test accessible error summary renders when invalid inputs are submitted and links focus to the target control via `form.scrollToField`.
  - [ ] 8.5 Test successful draft save displays success message and updates draft state.

---

## Dev Notes

### Architecture Patterns & Constraints

- **AD-1 (Hexagonal Modular Monolith):** Keep domain logic and settings management inside `apps/backend/src/modules/ai/`. No direct imports of provider SDKs or infrastructure adapters inside domain contracts.
- **AD-2 (TypeScript / Node Stack):** Strict TypeScript, Fastify 5.x REST API, React 19.x SPA with Ant Design 5.x (`theme.useToken()`).
- **AD-3 & AD-4 (PostgreSQL & Drizzle ORM):** All state persisted in PostgreSQL via Drizzle tables `global_analysis_settings_versions` and `global_analysis_settings_drafts`. All tests MUST target `mahalla_ovozi_test`.
- **AD-8 (Provider-Neutral AI Gateway & Immutable Profiles):** Global analysis settings define the prospective configuration parameters. Activating these into active `aiProfiles` is reserved for Story 5.3. In Story 5.1, drafts are strictly isolated from runtime profile execution.
- **AD-9 (Authentication & Scope):** Only authenticated Product Owner can access Global Settings (`role === 'PRODUCT_OWNER'`). Global settings have no District context (`district_id` is null or omitted).
- **AD-10 (Same-Origin REST Contracts):** Contracts live in `@mahalla-ovozi/api-contracts` using Zod schemas. Remote server state managed by TanStack Query.
- **Future-Only Invariant:** Saving a draft never recalculates, restarts, or reruns completed historical message-level decisions or existing topics.

### Source Tree Components

#### Existing Files to Modify (UPDATE)
- [`apps/backend/src/adapters/db/schema/ai.ts`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/backend/src/adapters/db/schema/ai.ts) — Add `globalAnalysisSettingsVersions` and `globalAnalysisSettingsDrafts` tables and types.
- [`apps/backend/src/adapters/db/schema/index.ts`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/backend/src/adapters/db/schema/index.ts) — Re-export new schema tables.
- [`apps/backend/src/adapters/db/seeds.ts`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/backend/src/adapters/db/seeds.ts) — Seed initial active global configuration (`gcfg_v1`).
- [`packages/api-contracts/src/index.ts`](file:///c:/codevision-works/mahalla-ovozi-trial-2/packages/api-contracts/src/index.ts) — Re-export analysis settings schemas and types.
- [`apps/backend/src/entrypoints/http.ts`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/backend/src/entrypoints/http.ts) — Register global analysis settings routes.
- [`apps/web/src/App.tsx`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/src/App.tsx) — Replace placeholder `AiOperationsPage` with full component.
- [`apps/web/src/pages/placeholders/AiOperationsPage.tsx`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/src/pages/placeholders/AiOperationsPage.tsx) — Replace with full page or redirect.

#### New Files to Create (NEW)
- `packages/api-contracts/src/analysis-settings.ts` — Zod schemas for global analysis settings, draft, save request/response.
- `apps/backend/src/modules/ai/global-analysis-settings-repository.ts` — Drizzle data access for settings versions and draft.
- `apps/backend/src/modules/ai/global-analysis-settings-service.ts` — Business logic and audit logging for global settings.
- `apps/backend/src/modules/ai/global-analysis-settings-routes.ts` — Fastify HTTP routes (`GET`, `POST /draft`).
- `apps/web/src/api/global-settings-client.ts` — Typed browser HTTP client for global settings API.
- `apps/web/src/hooks/useGlobalAnalysisSettings.ts` — TanStack Query hooks for fetching and mutating global settings draft.
- `apps/web/src/pages/AiOperationsPage.tsx` — Main tabbed AI Operations & Settings page.
- `apps/web/src/components/ai/ActiveGlobalSettingsCard.tsx` — Read-only active configuration presentation card.
- `apps/web/src/components/ai/GlobalSettingsDraftForm.tsx` — Resumable draft form with accessible error summary.
- `apps/web/src/components/ai/GlobalServiceVocabularyInput.tsx` — Tag/item manager for domain vocabulary.
- `apps/backend/tests/global-analysis-settings.test.ts` — Integration tests for global analysis settings API.
- `apps/web/src/pages/__tests__/AiOperationsPage.test.tsx` — UI tests for Global Settings tab and draft form.

### Testing Standards Summary

- Integration tests must execute strictly against `mahalla_ovozi_test` with dynamic table cleanup.
- Test both positive (successful draft save, draft resumption) and negative paths (unauthorized Hokim access -> 403, validation errors -> 400 with field details).
- Verify audit log insertion in `audit_events` with `action: 'GLOBAL_ANALYSIS_SETTINGS_DRAFT_SAVED'`.
- Verify that active configuration remains immutable and `aiProfiles` are not modified when saving a draft.

### Project Structure Notes

- Alignment with 5-layer architecture:
  - Contract Layer: `packages/api-contracts/src/analysis-settings.ts`
  - Persistence Layer: `apps/backend/src/adapters/db/schema/ai.ts`
  - Domain/App Layer: `apps/backend/src/modules/ai/global-analysis-settings-service.ts`
  - Transport Layer: `apps/backend/src/modules/ai/global-analysis-settings-routes.ts`
  - Presentation Layer: `apps/web/src/pages/AiOperationsPage.tsx` and `apps/web/src/components/ai/*`

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-5.md#Story 5.1: Prepare a Validated Global Analysis Settings Draft](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/epics/epic-5.md#L8-L60)
- [Source: _bmad-output/planning-artifacts/prds/prd-Mahalla-Ovozi-2026-07-30/prd.md#FR-23: Versioned future-only analysis configuration](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/prds/prd-Mahalla-Ovozi-2026-07-30/prd.md#L381-L393)
- [Source: _bmad-output/planning-artifacts/architecture/architecture-Mahalla-Ovozi-2026-08-12/ARCHITECTURE-SPINE.md#AD-8 — Project-owned provider-neutral AI gateway and immutable profiles](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/architecture/architecture-Mahalla-Ovozi-2026-08-12/ARCHITECTURE-SPINE.md#L108-L113)
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-Mahalla-Ovozi-2026-08-05/EXPERIENCE.md#AI Operations](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/ux-designs/ux-Mahalla-Ovozi-2026-08-05/EXPERIENCE.md#L32)
- [Source: _bmad-output/implementation-artifacts/epic-4-retro-2026-08-27.md#Continuity & Next Epic Preparation](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/implementation-artifacts/epic-4-retro-2026-08-27.md#L59-L90)

## Dev Agent Record

### Agent Model Used

Gemini 3.7 Flash (High)

### Debug Log References

- Verified existing `aiProfiles` and seeds in `apps/backend/src/adapters/db/seeds.ts`.
- Verified audit logging integration in `apps/backend/src/modules/audit/audit-service.ts`.
- Verified dirty-state guard modal in `apps/web/src/components/UnsavedChangesModal.tsx` and `district-context.tsx`.
- Verified accessible error summary pattern in `apps/web/src/components/CreateDistrictDrawer.tsx`.
- Completed Current-Data Verification: verified current stable model IDs (e.g., `gemini-2.0-flash`, `gpt-4o-mini`, `llama-3.1-8b-instant`, `qwen2.5:7b`), Ant Design `form.scrollToField` focus management, and Drizzle ORM JSONB typing.

### Completion Notes List

- Story 5.1 specification created following exhaustive multi-artifact analysis across Epics, Architecture Spine, PRD, UX Design, Epic 4 Retrospective, and Current-Data Verification.
- All 12 Acceptance Criteria mapped to concrete, testable tasks and subtasks.
- Domain contracts, relational schemas, services, API routes, and Ant Design 5 UI components defined with zero vendor leaks.

### File List

- `_bmad-output/implementation-artifacts/5-1-prepare-a-validated-global-analysis-settings-draft.md` (NEW)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (UPDATE)

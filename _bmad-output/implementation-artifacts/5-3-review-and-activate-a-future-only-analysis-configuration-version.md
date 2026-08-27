---
baseline_commit: 26b821e3f848c414619eb4a390311756fa76bf59
---

# Story 5.3: Review and Activate a Future-Only Analysis Configuration Version

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the **Product Owner**,  
I want to review the exact configuration changes and explicitly activate a saved Global or District draft,  
So that future AI processing uses the intended configuration without rewriting or replaying historical decisions.

## Acceptance Criteria

1. **Explicit Scope Identification & Active Version Comparison (AC 1)**
   - **Given** a saved Global Settings or District Settings draft exists in the database
   - **When** the Product Owner initiates activation review (`Фаоллаштиришни кўриб чиқиш`)
   - **Then** the activation review clearly identifies whether the target scope is Global (`Глобал созламалар`) or a specific District (`Туман: [Номи]`)
   - **And** District activation displays the exact District name and ID (`districtId`)
   - **And** the current active version identifier (e.g. `gcfg_v1`, `dcfg_dist_123_v1`) and activation timestamp (formatted in `Asia/Tashkent` timezone) are displayed
   - **And** the proposed draft is compared against the currently active configuration using a comprehensive field-level diff
   - **And** unchanged configuration fields are not presented as modified.

2. **Accessible & High-Clarity Field-Level Diff Presentation (AC 2)**
   - **Given** the field-level diff is displayed in the activation review modal
   - **When** the Product Owner inspects the proposed changes
   - **Then** additions, removals, and modifications are understandable without relying on color alone (e.g. `+` / `-` / `~` textual badges, semantic icons, explicit status labels)
   - **And** prompt diffs (Relevance, Topic Matching, Topic Projection) and vocabulary comparisons remain readable with clear typography and monospace formatting
   - **And** any horizontally scrollable diff container is explicitly labelled (`aria-label`) and fully keyboard-scrollable (`tabIndex={0}`)
   - **And** the surrounding dialog and page introduce zero unintended horizontal overflow.

3. **No Effective Changes & Missing Draft Prevention (AC 3)**
   - **Given** no saved draft exists OR the draft contains no effective differences from the currently active configuration
   - **When** activation is evaluated or requested
   - **Then** activation is blocked from proceeding
   - **And** no new configuration version is created in the database
   - **And** the currently active configuration remains unchanged
   - **And** the Product Owner receives a specific, sanitized explanation in Uzbek Cyrillic (`Қораламада фаол созламаларга нисбатан ҳеч қандай ўзгариш мавжуд эмас`).

4. **Explicit Confirmation Modal & Future-Only Invariant Disclosure (AC 4, AD-8)**
   - **Given** the Product Owner intends to activate the reviewed draft
   - **When** they proceed to the activation confirmation step
   - **Then** an explicit confirmation modal presents the exact scope (Global or specific District)
   - **And** the modal prominently displays the approved future-only invariant notice:
     - *"Ушбу созламалар фақат келгуси таҳлиллар учун амал қилади. Аввал қайта ишланган хабарлар ва тарихий мавзулар қайта ҳисобланмайди ва ўзгартирилмайди."* (The change affects future processing only; completed historical message-level decisions will not be replayed or rewritten)
   - **And** cancelling returns keyboard focus safely to the initiating control without performing any database mutations.

5. **Mandatory Operational Change Reason & Secret Sanitization (AC 5)**
   - **Given** the activation confirmation modal is open
   - **When** the Product Owner enters the operational change reason (`changeReason`)
   - **Then** a non-empty, non-sensitive reason is strictly required (min 5 characters, max 500 characters)
   - **And** help text explicitly warns: *"Фаоллаштириш сабабини киритинг. Сабабда шахсий маълумотлар, Telegram бот токенлари ёки API калитларни ёзиш қатъиян ман этилади."*
   - **And** client-side and server-side validation scan for known product secrets (e.g. bot tokens `\d{8,10}:[A-Za-z0-9_-]{35}`, OpenAI keys `sk-...`, Google API keys `AIza...`, Bearer tokens, passwords)
   - **And** any detected secret is rejected with a sanitized field-level validation error (`Махфий маълумотлар кўрсатилиши мумкин эмас`)
   - **And** no general PII-redaction workflow is introduced.

6. **Atomic New Immutable Version Creation & Lineage Preservation (AC 6, AD-8)**
   - **Given** the draft and activation request are valid and match the current active baseline (`baseActiveVersionId`)
   - **When** the Product Owner confirms activation
   - **Then** the server atomically in a single PostgreSQL transaction:
     1. Deactivates the prior active version (`is_active = false`)
     2. Calculates the next monotonic version number (`max(version) + 1`)
     3. Inserts a new immutable version record (`is_active = true`, `activated_at = new Date()`, `activated_by = actor.id`, `change_reason = changeReason`)
     4. Deletes the working draft record from the draft table
     5. Preserves the project-owned immutable configuration lineage required for AI operation traceability
     6. Records an immutable audit event (`GLOBAL_ANALYSIS_SETTINGS_ACTIVATED` or `DISTRICT_ANALYSIS_SETTINGS_ACTIVATED`)
   - **And** the prior active version is never overwritten, truncated, or mutated
   - **And** the newly created version becomes authoritative for that scope only upon successful transaction commit.

7. **Authoritative UI State Synchronization (AC 7)**
   - **Given** activation succeeds on the backend
   - **When** the authoritative server response is received by the browser
   - **Then** the UI reports success only after that response (zero optimistic success)
   - **And** the new active version identifier (e.g. `gcfg_v2`, `dcfg_dist_123_v2`) and activation timestamp are immediately rendered
   - **And** the draft form resets and is no longer displayed as an outstanding draft
   - **And** subsequent editing starts from the newly active configuration
   - **And** duplicate submission is prevented by action disabling and in-flight mutation locking.

8. **Atomic Failure Handling & Zero Partial State (AC 8)**
   - **Given** activation fails before the transaction completes (validation error, database conflict, unexpected exception)
   - **When** the error occurs
   - **Then** the entire transaction rolls back; no partial version is created or activated
   - **And** the previous active configuration remains 100% authoritative
   - **And** the draft remains preserved in the database for correction
   - **And** the error message returned to the user is sanitized and exposes zero secrets, stack traces, or resident data.

9. **Stale Baseline Rejection & Optimistic Concurrency Guard (AC 9)**
   - **Given** another activation has occurred since the Product Owner loaded the draft review (`baseActiveVersionId !== currentActiveVersion.id`)
   - **When** the Product Owner attempts activation
   - **Then** the server rejects the request with `409 Conflict` (`STALE_BASELINE_VERSION`)
   - **And** no new active version is created from the stale request
   - **And** the UI notifies the Product Owner to refresh and review the diff against the newly active version
   - **And** the draft is not silently overwritten or discarded.

10. **Strict Future-Only Invariant for Signal Processing & Lineage Traceability (AC 10, AD-8)**
    - **Given** a new configuration version has been activated
    - **When** new Telegram signal processing and AI operations begin after activation
    - **Then** newly created logical AI operations pick up the then-active immutable configuration/profile lineage
    - **And** completed historical message-level relevance, Lane, or Topic-assignment decisions from prior versions are NOT automatically rerun, reassessed, or rewritten
    - **And** pre-existing logical AI operations created before activation remain pinned to their original `pinned_profile_id` even if executed or retried after activation
    - **And** same-day Topic-derived projection refreshes triggered by new Accepted Evidence use the configuration active for that new logical operation, retaining exact configuration lineage without altering prior message-level decisions.

11. **Strict Scope Isolation (Global vs. District) (AC 11, AD-9)**
    - **Given** a District-specific draft for District A is activated
    - **When** activation completes
    - **Then** only District A's future configuration version changes
    - **And** District B and Global configurations remain completely untouched
    - **Given** a Global draft is activated
    - **When** activation completes
    - **Then** only Global configuration changes for future processing; existing District-specific configuration versions are not rewritten or mutated.

12. **Authorization Boundary Enforcement (AC 12, AD-9)**
    - **Given** an unauthorized actor (District Hokim, unauthenticated visitor)
    - **When** attempting to access activation endpoints (`POST /api/v1/ai/settings/global/activate` or `POST /api/v1/ai/settings/districts/:districtId/activate`)
    - **Then** the server returns `403 Forbidden` for Hokim and `401 Unauthorized` for unauthenticated requests
    - **And** authorization uses server-derived actor context; browser-supplied roles are ignored
    - **And** no configuration version or audit event is created from denied requests.

13. **Immutable Audit Trail Integration (AC 13, FR-24)**
    - **Given** activation succeeds
    - **When** the transaction commits
    - **Then** an append-only audit event is recorded (`GLOBAL_ANALYSIS_SETTINGS_ACTIVATED` or `DISTRICT_ANALYSIS_SETTINGS_ACTIVATED`)
    - **And** the audit metadata contains: `actorId`, `actorRole: 'PRODUCT_OWNER'`, `districtId` (or `null` for Global), `previousVersionId`, `newVersionId`, `newVersion`, `activatedAt`, and `changeReason`
    - **And** audit metadata contains zero credentials, bot tokens, or resident evidence.

14. **Offline Status Awareness (AC 14)**
    - **Given** network connectivity is lost while viewing the activation review
    - **When** offline status is detected
    - **Then** activation buttons are disabled with an informative offline warning banner
    - **And** activation requests are never queued for automatic offline replay
    - **And** reconnecting re-validates the session before activation can be initiated.

15. **WCAG 2.1/2.2 AA Keyboard Navigation & Contrast Compliance (AC 15)**
    - **Given** the activation review modal and confirmation flow
    - **When** operated via keyboard, screen reader, or 200% zoom
    - **Then** all dialog elements, diff panels, text areas, and action buttons are fully keyboard navigable with visible focus rings
    - **And** contrast ratios meet WCAG AA standards (≥4.5:1 for normal text)
    - **And** status meanings never depend on color alone
    - **And** long technical identifiers and Uzbek Cyrillic labels never clip or cause page-level horizontal overflow.

16. **Full Automated Verification Matrix (AC 16)**
    - **Given** the completed Story 5.3 implementation
    - **When** automated test suites run
    - **Then** backend integration tests cover Global and District activation, monotonic versioning, change reason validation, secret rejection, stale version rejection, no-op rejection, atomic rollback, authorization boundaries, scope isolation, and audit trail verification
    - **And** tests verify that historical decisions and pre-existing pinned AI operations are not replayed or mutated
    - **And** frontend tests cover activation review opening, field-level diff rendering, confirmation modal, secret validation error, cancellation, and successful post-activation state synchronization.

---

## Tasks / Subtasks

- [ ] **Task 1: Shared API Contracts & Validation Schemas (`packages/api-contracts`)** (AC: 1, 3, 5, 6, 9)
  - [ ] 1.1: Define `ActivateGlobalAnalysisSettingsRequestSchema` (`baseActiveVersionId: string`, `changeReason: string` min 5 max 500 chars with secret scanning refine).
  - [ ] 1.2: Define `ActivateDistrictAnalysisSettingsRequestSchema` (`baseActiveVersionId: string`, `changeReason: string` min 5 max 500 chars with secret scanning refine).
  - [ ] 1.3: Define `ActivateGlobalAnalysisSettingsResponseSchema` (`activeConfiguration`, `previousVersionId`, `message`).
  - [ ] 1.4: Define `ActivateDistrictAnalysisSettingsResponseSchema` (`districtId`, `districtName`, `activeConfiguration`, `previousVersionId`, `message`).
  - [ ] 1.5: Implement shared secret scanning helper (`containsProhibitedSecrets(text: string): boolean`) checking bot tokens (8-12 digits), OpenAI keys (`sk-...`), Google AI (`AIza...`/`AQ....`), Groq (`gsk_...`), Anthropic (`sk-ant-...`), Bearer tokens, and JWTs.
  - [ ] 1.6: Export all types and response schemas in `packages/api-contracts/src/analysis-settings.ts` and `index.ts`.

- [ ] **Task 2: Backend Global Activation Service, Repository & Routes (`apps/backend`)** (AC: 1, 3, 5, 6, 8, 9, 11, 12, 13)
  - [ ] 2.1: Add `activateDraft(db, actor, payload)` method to `GlobalAnalysisSettingsService` and `GlobalAnalysisSettingsRepository`.
  - [ ] 2.2: Implement atomic transaction in `activateDraft`:
    - Fetch current active version (`SELECT ... WHERE is_active = true FOR UPDATE`).
    - Stale check: If `currentActive.id !== payload.baseActiveVersionId`, throw typed `StaleBaselineVersionError` (409 Conflict).
    - Draft check: Fetch draft. If missing or no effective field differences compared to `currentActive`, throw typed `NoEffectiveChangesError` (400 Bad Request).
    - Deactivate old version: `UPDATE ... SET is_active = false WHERE id = currentActive.id`.
    - Bump monotonic version: `nextVersion = max(version) + 1`, ID `gcfg_v{nextVersion}`.
    - Insert new active version record with `is_active = true`, `activatedAt = new Date()`, `activatedBy = actor.id`, `changeReason`.
    - Delete global draft from `global_analysis_settings_drafts`.
    - Record audit event: `GLOBAL_ANALYSIS_SETTINGS_ACTIVATED`.
  - [ ] 2.3: Register route `POST /api/v1/ai/settings/global/activate` in `global-analysis-settings-routes.ts` protected by `createRequireProductOwner(db)`.

- [ ] **Task 3: Backend District Activation Service, Repository & Routes (`apps/backend`)** (AC: 1, 3, 5, 6, 8, 9, 11, 12, 13)
  - [ ] 3.1: Add `activateDraft(db, districtId, actor, payload)` method to `DistrictAnalysisSettingsService` and `DistrictAnalysisSettingsRepository`.
  - [ ] 3.2: Implement atomic transaction in `activateDraft`:
    - Verify district exists (`districts` table).
    - Fetch current active version for `districtId` (`FOR UPDATE`). If none, use default baseline ID.
    - Stale check: If `currentActive && currentActive.id !== payload.baseActiveVersionId`, throw `StaleBaselineVersionError` (409 Conflict).
    - Draft check: Fetch district draft. If missing or identical terms/vocabulary to active config, throw `NoEffectiveChangesError` (400 Bad Request).
    - Deactivate old version: `UPDATE ... SET is_active = false WHERE district_id = :districtId AND is_active = true`.
    - Bump monotonic version: `nextVersion = max(version) + 1`, ID `dcfg_{districtId}_v{nextVersion}`.
    - Insert new active version record with `is_active = true`, `activatedAt = new Date()`, `activatedBy = actor.id`, `changeReason`.
    - Delete district draft from `district_analysis_settings_drafts`.
    - Record audit event: `DISTRICT_ANALYSIS_SETTINGS_ACTIVATED`.
  - [ ] 3.3: Register route `POST /api/v1/ai/settings/districts/:districtId/activate` in `district-analysis-settings-routes.ts` protected by `createRequireProductOwner(db)`.

- [ ] **Task 4: AI Operations Lineage & Future-Only Runtime Invariant Verification (`apps/backend`)** (AC: 6, 10, AD-8)
  - [ ] 4.1: Ensure AI Gateway and signal evaluators (Semantic Relevance, Topic Matching, Topic Projection) dynamically resolve currently active configuration versions for new operations.
  - [ ] 4.2: Verify pre-existing logical AI operations remain strictly pinned to their `pinnedProfileId` and are never re-evaluated or overwritten upon version activation.
  - [ ] 4.3: Verify historical topic summaries, lanes, and accepted evidence records are never retroactively recalculated solely because a new version was activated.

- [ ] **Task 5: Frontend API Clients & TanStack Query Hooks (`apps/web`)** (AC: 1, 7, 14)
  - [ ] 5.1: Add `activateGlobalSettings(payload)` to `apps/web/src/api/global-settings-client.ts`.
  - [ ] 5.2: Add `activateDistrictSettings(districtId, payload)` to `apps/web/src/api/district-settings-client.ts`.
  - [ ] 5.3: Add `useActivateGlobalSettings()` mutation hook in `useGlobalAnalysisSettings.ts` with query invalidation and optimistic lock prevention.
  - [ ] 5.4: Add `useActivateDistrictSettings(districtId)` mutation hook in `useDistrictAnalysisSettings.ts` with query invalidation.

- [ ] **Task 6: Field-Level Diff Calculation Utilities (`apps/web`)** (AC: 1, 2, 3)
  - [ ] 6.1: Create `apps/web/src/components/ai/diff-utils.ts` to compute field-level diffs:
    - Global diff: `modelProvider`, `modelId`, `temperature`, `maxOutputTokens`, `relevanceSystemPrompt`, `topicMatchingSystemPrompt`, `topicProjectionSystemPrompt`, `globalServiceVocabulary` (added, removed, modified items).
    - District diff: `hokimRecognitionTerms` (added, removed), `localVocabularyAdditions` (added, removed, modified).
    - `hasEffectiveChanges(diff)` helper returning boolean.

- [ ] **Task 7: Field-Level Diff Viewer & Activation Review Modal Components (`apps/web`)** (AC: 1, 2, 4, 5, 7, 8, 14, 15)
  - [ ] 7.1: Build `ConfigurationDiffViewer.tsx` component presenting visual additions (`+` green), removals (`-` red), and modifications (`~` orange) with accessible tags, monospace prompt diffs, and keyboard-scrollable regions.
  - [ ] 7.2: Build `AnalysisSettingsActivationModal.tsx` containing:
    - Target scope indicator (Global vs. District).
    - Baseline version ID & Activation time.
    - Future-only invariant warning banner (`Alert` type="warning").
    - Embedded `ConfigurationDiffViewer`.
    - Mandatory `changeReason` textarea with character count (5-500), help text, and instant secret scanning validation.
    - Confirmation and Cancel buttons with loading state and disabled state when offline or invalid.
  - [ ] 7.3: Integrate `AnalysisSettingsActivationModal` into `GlobalSettingsDraftForm.tsx` and `DistrictSettingsDraftForm.tsx` via a "Фаоллаштиришни кўриб чиқиш" (Review Activation) button.

- [ ] **Task 8: Post-Activation State Synchronization & Accessible UI Feedback (`apps/web`)** (AC: 4, 7, 8, 15)
  - [ ] 8.1: On successful activation, close modal, display prominent Uzbek Cyrillic notification (`Созламалар муваффақиятли фаоллаштирилди. Янги версия: ...`), and ensure active configuration card updates immediately.
  - [ ] 8.2: Reset draft form dirty state and clear draft values so it is no longer shown as an outstanding draft.
  - [ ] 8.3: On error (e.g. `409 STALE_BASELINE_VERSION`), display actionable alert with "Саҳифани янгилаш" (Refresh page) action without losing draft contents.
  - [ ] 8.4: Verify full keyboard navigation (`Tab`, `Escape`, `Enter`), visible focus rings, and WCAG AA contrast.

- [ ] **Task 9: Backend Integration & Isolation Test Suite (`apps/backend/tests`)** (AC: 1, 3, 5, 6, 8, 9, 10, 11, 12, 13, 16)
  - [ ] 9.1: Write `apps/backend/tests/analysis-settings-activation.test.ts` against isolated test database `mahalla_ovozi_test`:
    - Global draft activation: creates new version (`gcfg_v2`), deactivates old, deletes draft, records audit event.
    - District draft activation: creates `dcfg_{districtId}_v2`, deactivates old, deletes draft, records audit event.
    - Scope isolation: District A activation does not touch District B or Global config.
    - Stale baseline rejection: Returns `409` when `baseActiveVersionId` doesn't match current active version.
    - No-op rejection: Returns `400` when draft has no effective changes.
    - Change reason validation: Rejects <5 chars, >500 chars, and secrets (bot tokens, API keys).
    - Authorization: Rejects non-Product Owner requests with `403` / `401`.
    - Future-only invariant: Proves completed `ai_operations`, `topics`, and `accepted_evidence` records are untouched.

- [ ] **Task 10: Frontend Unit & Component Test Suite (`apps/web/tests/unit`)** (AC: 1, 2, 4, 5, 7, 8, 9, 14, 15, 16)
  - [ ] 10.1: Write `apps/web/tests/unit/AnalysisSettingsActivationModal.test.tsx`:
    - Renders scope, active version, future-only warning, and field-level diff.
    - Validates change reason input (min 5 chars, secret rejection).
    - Disables activation button when reason is empty or invalid.
    - Handles successful activation and cache invalidation.
    - Handles stale baseline conflict (`409`) with refresh prompt.
    - Closes on Cancel with focus restoration.
  - [ ] 10.2: Update `GlobalSettingsDraftForm.test.tsx` and `DistrictSettingsDraftForm.test.tsx` for activation review button integration.

- [ ] **Task 11: Verification & Typecheck Across Workspaces** (AC: 16)
  - [ ] 11.1: Run `pnpm -r typecheck` across `packages/api-contracts`, `apps/backend`, and `apps/web`.
  - [ ] 11.2: Run Vitest backend test suite (`pnpm --filter @mahalla-ovozi/backend test`).
  - [ ] 11.3: Run Vitest frontend test suite (`pnpm --filter @mahalla-ovozi/web test`).

---

## Dev Notes

### Architecture Compliance & Invariants

1. **Strict Future-Only Invariant (AD-8 Zero Runtime Mutation)**:
   - Configuration activation MUST NEVER trigger retroactive recalculation or replay of completed historical message-level decisions (`SEMANTIC_RELEVANCE`, `TOPIC_MATCHING`).
   - Prior `ai_operations` records remain pinned to their `pinned_profile_id` and retain their exact historical lineage.
   - New logical AI operations created after activation adopt the newly active configuration version.
   - Retained Topic derived field projections recalculated due to subsequent new Accepted Evidence use the configuration active at that time, preserving exact configuration lineage.

2. **Explicit Scope Separation (AD-9 Multi-Tenant Isolation)**:
   - Global settings versions (`global_analysis_settings_versions`) have IDs formatted as `gcfg_v{N}` (e.g. `gcfg_v1`, `gcfg_v2`).
   - District settings versions (`district_analysis_settings_versions`) have IDs formatted as `dcfg_{districtId}_v{N}` (e.g. `dcfg_dist_123_v1`, `dcfg_dist_123_v2`).
   - Activating a draft for District A operates exclusively on District A's records; cross-district foreign keys or modifications are strictly forbidden.

3. **Same-Origin REST Contracts & Error Envelope (AD-10)**:
   - All activation endpoints reside under `/api/v1/ai/settings/*`.
   - Error responses adhere strictly to the project-standard `ApiErrorEnvelope`:
     ```json
     {
       "error": {
         "code": "STALE_BASELINE_VERSION" | "NO_EFFECTIVE_CHANGES" | "PROHIBITED_SECRETS_DETECTED" | "VALIDATION_ERROR",
         "message": "Саҳифани янгилаб, қайта кўриб чиқинг.",
         "statusCode": 400 | 409
       }
     }
     ```

4. **Immutable Audit Trail Integration (FR-24)**:
   - All activations write to `audit_events` via `recordAuditEvent(tx, ...)`.
   - Action names: `GLOBAL_ANALYSIS_SETTINGS_ACTIVATED` and `DISTRICT_ANALYSIS_SETTINGS_ACTIVATED`.
   - Metadata payload:
     ```typescript
     {
       previousVersionId: string;
       newVersionId: string;
       newVersion: number;
       changeReason: string;
       // additional non-sensitive stats (e.g. vocabularyCount, modelId)
     }
     ```

---

### Shared API Contracts (`packages/api-contracts/src/analysis-settings.ts`)

```typescript
// High-precision secret scanning patterns for 2026 AI providers and credentials
export const PROHIBITED_SECRET_PATTERNS = [
  // 1. Telegram Bot Token: 8 to 12 digits, colon, and exactly 35 base64url characters
  /\b\d{8,12}:[A-Za-z0-9_-]{35}\b/,
  // 2. OpenAI API Keys (Legacy sk-, Project sk-proj-, Admin sk-admin-, Org sk-org-)
  /\bsk-(?:proj-|admin-|org-)?[A-Za-z0-9_-]{32,}\b/,
  // 3. Google AI Studio / Gemini API Keys (Legacy AIza... and Modern AQ....)
  /\b(?:AIza[0-9A-Za-z-_]{35}|AQ\.[0-9A-Za-z-_]{20,})\b/,
  // 4. Groq Cloud API Key
  /\bgsk_[A-Za-z0-9_-]{48,64}\b/,
  // 5. Anthropic Claude API Key (sk-ant-api..., sk-ant-admin..., sk-ant-oat...)
  /\bsk-ant-(?:api\d{2}|admin\d{2}|oat\d{2})-[A-Za-z0-9_-]{60,}\b/,
  // 6. JSON Web Tokens (JWT: 3 base64url parts starting with eyJ)
  /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
  // 7. Authorization Bearer Token header string
  /\bBearer\s+[A-Za-z0-9\-._~+/]{20,}=*\b/i,
  // 8. Explicit key assignment patterns (e.g. api_key = "...", secret = '...')
  /(?:api[_-]?key|secret[_-]?key|bot[_-]?token|access[_-]?token|auth[_-]?token)\s*[:=]\s*['"]?[A-Za-z0-9_\-.~+=]{16,}['"]?/i,
];

export function containsProhibitedSecrets(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  return PROHIBITED_SECRET_PATTERNS.some((pattern) => pattern.test(text));
}

export const ChangeReasonSchema = z
  .string()
  .trim()
  .min(5, 'Ўзгартириш сабаби камида 5 та белгидан иборат бўлиши шарт.')
  .max(500, 'Ўзгартириш сабаби 500 та белгидан ошмаслиги керак.')
  .superRefine((val, ctx) => {
    if (containsProhibitedSecrets(val)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Ўзгартириш сабабида махфий маълумотлар (бот токенлари, API калитлар ёки пароллар) кўрсатилиши мумкин эмас.',
      });
    }
  });

export const ActivateGlobalAnalysisSettingsRequestSchema = z.object({
  baseActiveVersionId: z.string().min(1, 'Базавий фаол версия идентификатори талаб қилинади.'),
  changeReason: ChangeReasonSchema,
});
export type ActivateGlobalAnalysisSettingsRequest = z.infer<
  typeof ActivateGlobalAnalysisSettingsRequestSchema
>;

export const ActivateGlobalAnalysisSettingsResponseSchema = z.object({
  activeConfiguration: GlobalAnalysisSettingsDtoSchema,
  previousVersionId: z.string(),
  message: z.string(),
});
export type ActivateGlobalAnalysisSettingsResponse = z.infer<
  typeof ActivateGlobalAnalysisSettingsResponseSchema
>;

export const ActivateDistrictAnalysisSettingsRequestSchema = z.object({
  baseActiveVersionId: z.string().min(1, 'Базавий фаол версия идентификатори талаб қилинади.'),
  changeReason: ChangeReasonSchema,
});
export type ActivateDistrictAnalysisSettingsRequest = z.infer<
  typeof ActivateDistrictAnalysisSettingsRequestSchema
>;

export const ActivateDistrictAnalysisSettingsResponseSchema = z.object({
  districtId: z.string(),
  districtName: z.string(),
  activeConfiguration: DistrictAnalysisSettingsDtoSchema,
  previousVersionId: z.string(),
  message: z.string(),
});
export type ActivateDistrictAnalysisSettingsResponse = z.infer<
  typeof ActivateDistrictAnalysisSettingsResponseSchema
>;
```

---

### Database Transaction & Version Bumping Logic

```typescript
// apps/backend/src/modules/ai/global-analysis-settings-service.ts
async activateDraft(
  db: DbOrTx,
  actor: { id: string; role: string; ipAddress?: string | null; userAgent?: string | null },
  payload: ActivateGlobalAnalysisSettingsRequest,
): Promise<ActivateGlobalAnalysisSettingsResponse> {
  if (actor.role !== 'PRODUCT_OWNER') {
    throw new Error('Ушбу амални бажариш учун маҳсулот эгаси ҳуқуқи талаб қилинади.');
  }

  return await db.transaction(async (tx) => {
    // 1. Fetch current active configuration with row lock
    const activeRow = await tx
      .select()
      .from(globalAnalysisSettingsVersions)
      .where(eq(globalAnalysisSettingsVersions.isActive, true))
      .orderBy(desc(globalAnalysisSettingsVersions.version))
      .limit(1)
      .for('update');

    const currentActive = activeRow[0] || defaultGlobalAnalysisSettingsVersion;

    // 2. Validate base active version (optimistic concurrency guard)
    if (currentActive.id !== payload.baseActiveVersionId) {
      const error = new Error('Фаол созламалар версияси ўзгарган. Илтимос, саҳифани янгилаб, қайта кўриб чиқинг.');
      (error as any).code = 'STALE_BASELINE_VERSION';
      (error as any).statusCode = 409;
      throw error;
    }

    // 3. Fetch draft
    const draft = await this.repository.getDraft(tx);
    if (!draft) {
      const error = new Error('Фаоллаштириш учун қоралама топилмади.');
      (error as any).code = 'DRAFT_NOT_FOUND';
      (error as any).statusCode = 400;
      throw error;
    }

    // 4. Validate effective changes exist
    const hasChanges =
      draft.modelProvider !== currentActive.modelProvider ||
      draft.modelId !== currentActive.modelId ||
      draft.temperature !== currentActive.temperature ||
      draft.maxOutputTokens !== currentActive.maxOutputTokens ||
      draft.relevanceSystemPrompt !== currentActive.relevanceSystemPrompt ||
      draft.topicMatchingSystemPrompt !== currentActive.topicMatchingSystemPrompt ||
      draft.topicProjectionSystemPrompt !== currentActive.topicProjectionSystemPrompt ||
      JSON.stringify(draft.globalServiceVocabulary) !== JSON.stringify(currentActive.globalServiceVocabulary);

    if (!hasChanges) {
      const error = new Error('Қораламада фаол созламаларга нисбатан ҳеч қандай ўзгариш мавжуд эмас.');
      (error as any).code = 'NO_EFFECTIVE_CHANGES';
      (error as any).statusCode = 400;
      throw error;
    }

    // 5. Deactivate prior active version
    if (currentActive.id) {
      await tx
        .update(globalAnalysisSettingsVersions)
        .set({ isActive: false })
        .where(eq(globalAnalysisSettingsVersions.id, currentActive.id));
    }

    // 6. Compute next version number
    const [maxVersionResult] = await tx
      .select({ maxVersion: sql<number>`COALESCE(MAX(${globalAnalysisSettingsVersions.version}), 0)` })
      .from(globalAnalysisSettingsVersions);
    const nextVersion = (maxVersionResult?.maxVersion ?? 0) + 1;
    const newVersionId = `gcfg_v${nextVersion}`;

    // 7. Insert new immutable active version
    const [newVersionRow] = await tx
      .insert(globalAnalysisSettingsVersions)
      .values({
        id: newVersionId,
        version: nextVersion,
        modelProvider: draft.modelProvider,
        modelId: draft.modelId,
        temperature: draft.temperature,
        maxOutputTokens: draft.maxOutputTokens,
        relevanceSystemPrompt: draft.relevanceSystemPrompt,
        topicMatchingSystemPrompt: draft.topicMatchingSystemPrompt,
        topicProjectionSystemPrompt: draft.topicProjectionSystemPrompt,
        globalServiceVocabulary: draft.globalServiceVocabulary,
        isActive: true,
        activatedAt: new Date(),
        activatedBy: actor.id,
        changeReason: payload.changeReason.trim(),
        createdAt: new Date(),
      })
      .returning();

    // 8. Delete draft
    await tx
      .delete(globalAnalysisSettingsDrafts)
      .where(eq(globalAnalysisSettingsDrafts.id, 'global'));

    // 9. Record audit trail event
    await recordAuditEvent(tx, {
      districtId: null,
      actorId: actor.id,
      actorRole: 'PRODUCT_OWNER',
      action: 'GLOBAL_ANALYSIS_SETTINGS_ACTIVATED',
      ipAddress: actor.ipAddress || null,
      userAgent: actor.userAgent || null,
      metadata: {
        previousVersionId: currentActive.id,
        newVersionId: newVersionRow.id,
        newVersion: nextVersion,
        modelProvider: newVersionRow.modelProvider,
        modelId: newVersionRow.modelId,
        changeReason: payload.changeReason.trim(),
      },
    });

    return {
      activeConfiguration: this.mapVersionToDto(newVersionRow),
      previousVersionId: currentActive.id,
      message: 'Глобал таҳлил созламалари муваффақиятли фаоллаштирилди.',
    };
  });
}
```

---

### UI Components & Diff Viewer Specifications

1. **`ConfigurationDiffViewer.tsx`**:
   - Compares active settings vs draft settings.
   - For scalar settings (model, temperature, tokens), renders side-by-side or previous -> new tag diff:
     - e.g. `Модель: gpt-4o-mini-2024-07-18 ➔ gemini-2.0-flash [Ўзгартирилди]`
     - e.g. `Ҳарорат (Temperature): 0.0 ➔ 0.2 [Ўзгартирилди]`
   - For system prompts, renders unified diff box with line wrapping, monospaced font, and explicit section badge.
   - For vocabulary terms:
     - Added items: green Tag `+ [Атама]` with category.
     - Removed items: red Tag `- [Атама]` with strike-through text.
     - Modified items: blue Tag `~ [Атама]` with description diff.
   - Unchanged sections display a neutral summary (`Ўзгаришсиз: 12 та атама`).

2. **`AnalysisSettingsActivationModal.tsx`**:
   - Props:
     - `visible: boolean`
     - `scope: 'global' | 'district'`
     - `districtId?: string`
     - `districtName?: string`
     - `activeVersionId: string`
     - `activeSettings: GlobalAnalysisSettingsDto | DistrictAnalysisSettingsDto`
     - `draftSettings: GlobalAnalysisSettingsDraftDto | DistrictAnalysisSettingsDraftDto`
     - `onConfirm: (reason: string) => Promise<void>`
     - `onCancel: () => void`
   - Uses `destroyOnClose={true}` to ensure clean modal lifecycle.
   - Accessible heading: `Таҳлил созламаларини фаоллаштириш`.
   - `Alert` notice (warning): Future-only invariant disclaimer.
   - Diff preview container with `tabIndex={0}` and `aria-label="Созламалар ўзгаришлари фарқи"`.
   - `Form.Item` for `changeReason`:
     - Textarea with character counter (`maxLength={500}`, `showCount`).
     - Validation rule for min 5 characters and prohibited secrets regex.
   - Buttons:
     - Cancel: `Бекор қилиш` (restores focus to opener).
     - Submit: `Фаоллаштиришни тасдиқлаш` (type="primary", danger or warning accent, with loading spinner).

---

### Uzbek Cyrillic Product Copy Standard

| UI Context | Approved Uzbek Cyrillic Text |
| :--- | :--- |
| Action button | `Фаоллаштиришни кўриб чиқиш` (Review Activation) |
| Modal title | `Таҳлил созламаларини фаоллаштириш` (Activate Analysis Settings) |
| Future-only invariant notice | `Ушбу созламалар фақат келгуси таҳлиллар учун амал қилади. Аввал қайта ишланган хабарлар ва тарихий мавзулар қайта ҳисобланмайди ва ўзгартирилмайди.` |
| Scope: Global | `Глобал таҳлил созламалари` |
| Scope: District | `Туман созламалари: {districtName}` |
| Active version label | `Жорий фаол версия` |
| New version label | `Янги фаоллаштириладиган версия` |
| Change reason label | `Фаоллаштириш сабаби (мажбурий)` |
| Change reason placeholder | `Масалан: Модель аниқлигини ошириш ва янги ҳудудий атамаларни киритиш` |
| Change reason help | `Фаоллаштириш сабабини киритинг (камида 5 та белги). Махфий маълумотлар (бот токенлари, API калитлар) киритиш тақиқланади.` |
| Stale baseline alert | `Фаол созламалар версияси ўзгарган. Илтимос, саҳифани янгилаб, қайта кўриб чиқинг.` |
| No changes alert | `Қораламада фаол созламаларга нисбатан ҳеч қандай ўзгариш мавжуд эмас.` |
| Confirm button | `Фаоллаштиришни тасдиқлаш` |
| Cancel button | `Бекор қилиш` |
| Success notification | `Созламалар муваффақиятли фаоллаштирилди. Янги версия: {versionId}` |

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

---

### Git Intelligence Summary

- Latest commit: `26b821e` (Story 5.2 review complete and verified).
- Drizzle migrations are at `0015_soft_tony_stark.sql`.
- Tables `global_analysis_settings_versions`, `global_analysis_settings_drafts`, `district_analysis_settings_versions`, and `district_analysis_settings_drafts` already exist in the database schema with necessary fields (`is_active`, `activated_at`, `activated_by`, `change_reason`).
- All 3 workspaces (`packages/api-contracts`, `apps/backend`, `apps/web`) pass strict TypeScript compilation (`pnpm -r typecheck`) with 0 errors.

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
- [NEW] [`apps/backend/tests/analysis-settings-activation.test.ts`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/backend/tests/analysis-settings-activation.test.ts)

### Frontend Files to Touch / Create
- [MODIFY] [`apps/web/src/api/global-settings-client.ts`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/src/api/global-settings-client.ts)
- [MODIFY] [`apps/web/src/api/district-settings-client.ts`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/src/api/district-settings-client.ts)
- [MODIFY] [`apps/web/src/hooks/useGlobalAnalysisSettings.ts`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/src/hooks/useGlobalAnalysisSettings.ts)
- [MODIFY] [`apps/web/src/hooks/useDistrictAnalysisSettings.ts`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/src/hooks/useDistrictAnalysisSettings.ts)
- [NEW] [`apps/web/src/components/ai/diff-utils.ts`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/src/components/ai/diff-utils.ts)
- [NEW] [`apps/web/src/components/ai/ConfigurationDiffViewer.tsx`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/src/components/ai/ConfigurationDiffViewer.tsx)
- [NEW] [`apps/web/src/components/ai/AnalysisSettingsActivationModal.tsx`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/src/components/ai/AnalysisSettingsActivationModal.tsx)
- [MODIFY] [`apps/web/src/components/ai/GlobalSettingsDraftForm.tsx`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/src/components/ai/GlobalSettingsDraftForm.tsx)
- [MODIFY] [`apps/web/src/components/ai/DistrictSettingsDraftForm.tsx`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/src/components/ai/DistrictSettingsDraftForm.tsx)
- [NEW] [`apps/web/tests/unit/AnalysisSettingsActivationModal.test.tsx`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/tests/unit/AnalysisSettingsActivationModal.test.tsx)

---

## References

- [Epic 5 Planning Document](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/epics/epic-5.md#L172-L313)
- [Architecture Spine: Invariant AD-8 (Project-Owned AI Gateway & Immutable Profiles)](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/architecture/architecture-Mahalla-Ovozi-2026-08-12/ARCHITECTURE-SPINE.md#L108-L113)
- [Architecture Spine: Invariant AD-9 (Explicit District Scope)](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/architecture/architecture-Mahalla-Ovozi-2026-08-12/ARCHITECTURE-SPINE.md#L114-L119)
- [Architecture Spine: Invariant AD-10 (Same-Origin REST Contracts)](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/architecture/architecture-Mahalla-Ovozi-2026-08-12/ARCHITECTURE-SPINE.md#L120-L125)
- [PRD FR-23: Versioned Future-Only Analysis Configuration](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/prds/prd-Mahalla-Ovozi-2026-07-30/prd.md#L381-L393)
- [PRD FR-24: Immutable Searchable Retained Audit History](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/prds/prd-Mahalla-Ovozi-2026-07-30/prd.md#L394-L405)
- [UX Design Specifications: AI Operations Experience](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/ux-designs/ux-Mahalla-Ovozi-2026-08-05/EXPERIENCE.md#L32-L33)

---

## Dev Agent Record

### Agent Model Used

Gemini 3.7 Flash (High)

### Debug Log References

- Verified existing AI settings database schema in `apps/backend/src/adapters/db/schema/ai.ts`.
- Verified audit logging integration in `apps/backend/src/modules/audit/audit-service.ts`.
- Analyzed existing form validation, draft saving, and error summary deep linking in `GlobalSettingsDraftForm.tsx` and `DistrictSettingsDraftForm.tsx`.
- Confirmed strict isolation of test database (`mahalla_ovozi_test`) for all upcoming automated integration tests.

### Completion Notes List

- Story 5.3 specification created with full exhaustive analysis across PRD, Architecture Spine (AD-8, AD-9, AD-10), UX specifications, and existing codebase implementations.
- Included comprehensive field-level diff viewer design, secret scanning validation regexes, atomic database transaction logic, and test plan.
- Sprint status updated to `ready-for-dev`.

### File List

- `_bmad-output/implementation-artifacts/5-3-review-and-activate-a-future-only-analysis-configuration-version.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

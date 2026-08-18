---
baseline_commit: afa2890
---

# Story 1.3: Resume District Onboarding and Track Activation Readiness

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the **Product Owner**,
I want each incomplete District to have a resumable onboarding checklist with explicit readiness checks,
So that I can leave setup unfinished, return later, and know exactly what still prevents safe activation.

## Acceptance Criteria

1. **Resumable Onboarding Checklist Model (`setup-checklist`)**
   - **Given** an incomplete District created in Story 1.2
   - **When** the Product Owner opens its District setup / overview in the Console
   - **Then** the Console shows one resumable onboarding checklist for that District
   - **And** each required setup area has an explicit `passed` (Бажарилди), `incomplete` (Тугалланмаган), or `failed` (Хатолик) state
   - **And** the checklist clearly identifies remaining blockers without implying the District is active.

2. **FR20 Activation Prerequisites Evaluation & Truthful Incomplete States**
   - **Given** the onboarding checklist
   - **When** readiness is evaluated
   - **Then** it represents all activation prerequisites required by FR20:
     1. District Identity (`district_identity` — District name & region exist)
     2. Subscription / Access Eligibility (`access_eligibility` — baseline district access eligibility)
     3. Baseline Analysis Configuration (`analysis_configuration` — resolves approved baseline AI profile)
     4. District-Isolation Invariants (`district_isolation` — verified district-scoped boundaries)
     5. Standing-Access Disclosure Confirmation (`disclosure_confirmation` — deliberate PO confirmation recorded)
     6. Telegram Bot Validation (`telegram_bot` — unique validated bot token)
     7. Telegram Group-to-Mahalla Mappings (`group_mappings` — approved group mappings)
     8. Hokim Account Readiness (`hokim_account` — active Hokim account)
   - **And** items 6, 7, and 8 evaluate truthfully to `incomplete` rather than being mocked, auto-passed, or hidden until implemented by Stories 1.4–1.6
   - **And** activation remains blocked and the Activation control remains disabled while any required prerequisite is not `passed`.

3. **Minimum Access-Eligibility Prerequisite (Decoupled from Epic 6)**
   - **Given** full subscription lifecycle management belongs to Epic 6
   - **When** onboarding needs an initial subscription/access prerequisite
   - **Then** Story 1.3 introduces only the minimum District access-eligibility flag (`access_eligible` boolean on `districts`) needed for activation readiness
   - **And** does not implement Grace, Suspension, Cancellation, payment processing, or deletion lifecycle behavior.

4. **Baseline Analysis Configuration Verification (Decoupled from Epic 5)**
   - **Given** full AI Operations management belongs to Epic 5
   - **When** onboarding checks analysis-configuration readiness
   - **Then** the system verifies that the District resolves a valid approved baseline analysis configuration profile (`analysis_config_profile_id = 'baseline_v1'`)
   - **And** Story 1.3 does not expose version editing, activation diffs, rollback, or other Epic 5 configuration-management features.

5. **External Disclosure Confirmation & Privacy-Safe Audit Event**
   - **Given** the required external-disclosure confirmation has not been completed
   - **When** readiness is evaluated
   - **Then** disclosure remains an explicit activation blocker with status `incomplete`
   - **And** the Product Owner can record the confirmation through a deliberate modal action (`Тасдиқлаш ва сақлаш`)
   - **And** on success, `disclosure_confirmed_at` and `disclosure_confirmed_by_id` are persisted
   - **And** the resulting audit event (`DISTRICT_DISCLOSURE_CONFIRMED`) contains only `districtId`, `districtName`, `actorId`, `actorRole`, `createdAt`, `ipAddress`, and `userAgent`—strictly no resident content, credentials, or unnecessary details.

6. **Server-Side District-Isolation Verification**
   - **Given** a District-isolation readiness check runs
   - **When** the system evaluates the District
   - **Then** it verifies that the District identifier is valid, the District record exists, and no cross-tenant foreign-key or isolation anomalies exist
   - **And** a failed or unavailable check is reported truthfully as `failed` or `incomplete` with sanitized diagnostic copy.

7. **Authoritative Server State & Prevention of Client Gating Bypass**
   - **Given** any readiness prerequisite changes or is inspected
   - **When** the onboarding page is loaded or refreshed
   - **Then** readiness is derived from authoritative server state via `GET /api/v1/districts/:districtId/readiness`
   - **And** stale client state or browser flags cannot activate or mark a prerequisite passed.

8. **Explicit Manual Section Saves & Resumption**
   - **Given** a setup section contains editable non-secret fields or actions
   - **When** the Product Owner changes and saves that section
   - **Then** the section is saved explicitly rather than by autosave
   - **And** only that section's valid data and readiness state are committed
   - **And** the Product Owner can leave and later resume from the persisted state.

9. **Unsaved Changes Guard on Context Transitions**
   - **Given** the Product Owner has unsaved changes in a setup section or confirmation dialog
   - **When** they navigate away, switch Districts, sign out, use browser Back, or trigger another transition that would discard the draft
   - **Then** the approved dirty-state guard modal (`Сақланмаган ўзгаришлар мавжуд`) runs
   - **And** selecting `Таҳрирлашни давом эттириш` preserves the current draft and District context
   - **And** selecting `Ўзгаришларни бекор қилиш` discards unsaved client-side changes and completes the transition.

10. **Sanitized Error Presentation & Safe Mutation Failure**
    - **Given** a setup save or readiness check fails
    - **When** the failure is displayed
    - **Then** valid entered values are preserved where safe
    - **And** the UI identifies the affected setup area and provides an actionable retry
    - **And** raw database errors, stack traces, credentials, or tokens are never exposed.

11. **Browser Network Loss & Offline Protection**
    - **Given** the browser is offline (`navigator.onLine === false`)
    - **When** the Product Owner views onboarding data
    - **Then** existing permitted setup state remains visible read-only with an Uzbek Cyrillic offline warning banner (`Сервер билан алоқа мавжуд эмас. Тармоқни текширинг.`)
    - **And** saves, confirmations, and readiness refreshes are blocked
    - **And** no mutations are queued for automatic replay
    - **And** reconnect revalidates session, District, and readiness state before refreshing.

12. **Accessibility Floor, Uzbek Cyrillic Microcopy & Responsive Reflow**
    - **Given** the onboarding workflow is used across phone/tablet widths, at 200% zoom, with keyboard navigation, or reduced-motion preference
    - **When** checklist items and setup sections are reviewed
    - **Then** status indicators do not rely on color alone (status icons + explicit text tags)
    - **And** all interactive targets meet the 44px minimum (`targets.touch-min`)
    - **And** all user-facing product copy uses clear, professional Uzbek Cyrillic.

13. **Automated Test Verification & Integration Gates**
    - **Given** Story 1.3 is verified
    - **When** automated test suites run
    - **Then** backend integration tests cover authoritative readiness derivation, disclosure confirmation audit logging, isolation validation, and activation gating
    - **And** browser E2E tests cover checklist presentation, truthful incomplete states, disclosure modal submission, persisted resumption, offline banner, and disabled activation control.

---

## Tasks / Subtasks

- [x] **Task 1: Database Schema & Migration (`0002_onboarding_readiness.sql`)** (AC: 1, 3, 4, 5)
  - [x] 1.1 Update `districts` table schema in [`apps/backend/src/adapters/db/schema/districts.ts`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/backend/src/adapters/db/schema/districts.ts) with `accessEligible`, `analysisConfigProfileId`, `disclosureConfirmedAt`, and `disclosureConfirmedById`.
  - [x] 1.2 Generate and review version-controlled SQL migration `0002_onboarding_readiness.sql` in `apps/backend/drizzle/`.
  - [x] 1.3 Apply migration and verify schema with PostgreSQL database.

- [x] **Task 2: Shared API Contracts (`packages/api-contracts`)** (AC: 1, 2, 5, 7)
  - [x] 2.1 Create [`packages/api-contracts/src/readiness.ts`](file:///c:/codevision-works/mahalla-ovozi-trial-2/packages/api-contracts/src/) defining `PrerequisiteStatusSchema`, `PrerequisiteKeySchema`, `PrerequisiteItemSchema`, `DistrictReadinessSchema`, `GetDistrictReadinessResponseSchema`, and `ConfirmDisclosureResponseSchema`.
  - [x] 2.2 Re-export readiness schemas and types from [`packages/api-contracts/src/index.ts`](file:///c:/codevision-works/mahalla-ovozi-trial-2/packages/api-contracts/src/index.ts).
  - [x] 2.3 Run typecheck to ensure clean contract compilation.

- [x] **Task 3: Backend Domain Readiness Evaluator & Service** (AC: 2, 3, 4, 5, 6, 7)
  - [x] 3.1 Create `apps/backend/src/modules/districts/districts-readiness.ts` implementing `evaluateDistrictReadiness(db, districtId)`.
  - [x] 3.2 Implement pure evaluation for each of the 8 prerequisites with accurate Uzbek Cyrillic labels and truthful blocker reasons.
  - [x] 3.3 Create `confirmDistrictDisclosure(db, districtId, actor, clientInfo)` service function performing atomic DB update and inserting audit event into `audit_events` table.
  - [x] 3.4 Define domain errors (`DistrictNotFoundError`, `DistrictAlreadyActiveError`, etc.).

- [x] **Task 4: Fastify API Route Registrations** (AC: 5, 7, 10)
  - [x] 4.1 Register `GET /api/v1/districts/:districtId/readiness` route in `apps/backend/src/modules/districts/districts-routes.ts` protected by `createRequireProductOwner(db)`.
  - [x] 4.2 Register `POST /api/v1/districts/:districtId/disclosure-confirmation` protected by `verifyStateChangingOrigin` and `createRequireProductOwner(db)`.
  - [x] 4.3 Validate `districtId` path parameter and return standard sanitized error envelopes on failure.

- [x] **Task 5: Backend Integration Tests** (AC: 2, 5, 6, 7, 13)
  - [x] 5.1 Create `apps/backend/tests/districts-readiness.test.ts` testing against real PostgreSQL database.
  - [x] 5.2 Test initial readiness calculation on newly created district (verifying 3 truthful incomplete items, 1 incomplete disclosure, 4 passed items).
  - [x] 5.3 Test disclosure confirmation: DB timestamp persistence and `DISTRICT_DISCLOSURE_CONFIRMED` audit log entry.
  - [x] 5.4 Test access eligibility and isolation failure handling.
  - [x] 5.5 Test unauthenticated and cross-tenant access rejection (401/403/404).

- [x] **Task 6: Frontend District Client & Queries** (AC: 1, 7, 11)
  - [x] 6.1 Extend `apps/web/src/district/district-client.ts` with `getDistrictReadiness(districtId)` and `confirmDisclosure(districtId)`.
  - [x] 6.2 Implement TanStack Query hook with district-scoped key `['district', activeDistrictId, 'readiness']`.
  - [x] 6.3 Ensure district switching properly cancels and purges readiness query cache.

- [x] **Task 7: Frontend UI Components (`DistrictOnboardingChecklist`)** (AC: 1, 2, 5, 12)
  - [x] 7.1 Implement `apps/web/src/components/DistrictOnboardingChecklist.tsx` adhering to `setup-checklist` design tokens.
  - [x] 7.2 Implement `apps/web/src/components/DisclosureConfirmationModal.tsx` for deliberate PO confirmation.
  - [x] 7.3 Update `apps/web/src/pages/OverviewPage.tsx` to render the onboarding checklist when the active district is `SETUP_INCOMPLETE`.
  - [x] 7.4 Add checklist / setup shortcut link in `apps/web/src/pages/DistrictsPage.tsx` table actions.

- [x] **Task 8: Frontend State, Offline & Accessibility Polish** (AC: 9, 11, 12)
  - [x] 8.1 Integrate `useDirtyState` with the disclosure modal to prevent draft loss on background clicks / route change.
  - [x] 8.2 Connect offline detection banner to block confirmation mutations when offline.
  - [x] 8.3 Verify keyboard Tab order, ARIA attributes, and 44px minimum touch targets across all checklist actions.

- [x] **Task 9: Playwright E2E Test Suite** (AC: 1, 2, 5, 8, 9, 11, 13)
  - [x] 9.1 Create `apps/web/e2e/district-onboarding.spec.ts` (located at `apps/web/tests/e2e/district-onboarding.spec.ts`).
  - [x] 9.2 Test end-to-end flow: Create district -> Inspect checklist -> Confirm disclosure -> Verify updated status -> Navigate away and return (verify resumability) -> Verify disabled activation button with remaining blockers -> Test offline warning behavior.

### Review Findings

- [x] [Review][Patch] Eliminate double-confirmation trap on Cancel and fix destroyOnHidden [apps/web/src/components/DisclosureConfirmationModal.tsx:42-80]
- [x] [Review][Patch] Wrap setup shortcut button in attemptTransition and enforce 44px touch targets on table links [apps/web/src/pages/DistrictsPage.tsx:106-128]
- [x] [Review][Patch] Extract duplicated formatTashkentDate helper to shared formatters utility [apps/web/src/lib/formatters.ts]
- [x] [Review][Patch] Verify both district.name and district.region in district_identity prerequisite evaluation [apps/backend/src/modules/districts/districts-readiness.ts:19]
- [x] [Review][Patch] Add DistrictAlreadyActiveError and status guard on confirmDistrictDisclosure [apps/backend/src/modules/districts/districts-readiness.ts:131-160]
- [x] [Review][Patch] Use encodeURIComponent on districtId in districtClient methods [apps/web/src/district/district-client.ts:48-66]
- [x] [Review][Patch] Adopt Ant Design theme tokens (theme.useToken) for colors in DistrictOnboardingChecklist [apps/web/src/components/DistrictOnboardingChecklist.tsx:147-228]
- [x] [Review][Defer] Add database index on foreign key disclosure_confirmed_by_id [apps/backend/src/adapters/db/schema/districts.ts:15] — deferred, database performance optimization for high-scale phase

---

## Dev Notes

### Adversarial Pre-Implementation Review Patches (P1–P7)

The following architectural and implementation patches were formally verified during pre-implementation review and MUST be followed during `dev-story`:

- **Patch P1 (Database Schema & Explicit Timestamp Invariants):**
  - Update `apps/backend/src/adapters/db/schema/districts.ts` with:
    - `accessEligible: boolean('access_eligible').notNull().default(true)`
    - `analysisConfigProfileId: text('analysis_config_profile_id').notNull().default('baseline_v1')`
    - `disclosureConfirmedAt: timestamp('disclosure_confirmed_at', { withTimezone: true })`
    - `disclosureConfirmedById: text('disclosure_confirmed_by_id').references(() => accounts.id, { onDelete: 'set null' })`
  - **Explicit `updatedAt` Rule (P2-C):** In Drizzle ORM, `defaultNow()` only executes on `INSERT`. When updating the district record during disclosure confirmation, the service layer MUST explicitly pass `updatedAt: new Date()`.
  - Migration generated via `pnpm --filter @mahalla-ovozi/backend db:generate` creating `apps/backend/drizzle/0002_<slug>.sql`.

- **Patch P2 (Shared API Contracts & Zod Schemas):**
  - Define in `packages/api-contracts/src/readiness.ts` and re-export from `index.ts`.
  - Schemas: `PrerequisiteKeySchema`, `PrerequisiteStatusSchema`, `PrerequisiteItemSchema`, `DistrictReadinessSchema`, `GetDistrictReadinessResponseSchema`, `ConfirmDisclosureResponseSchema`.
  - Guarantee all ISO dates use `.datetime()` validation.

- **Patch P3 (Pure Domain Evaluation, Truthful Incompletes & Atomic Audit Log):**
  - In `apps/backend/src/modules/districts/districts-readiness.ts`, keep evaluation pure and strictly decoupled from HTTP transport.
  - Return domain errors (`DistrictNotFoundError`, `DistrictAlreadyActiveError`, etc.); routes map them to HTTP status codes.
  - Evaluate all 8 prerequisites deterministically. Prerequisites 6 (`telegram_bot`), 7 (`group_mappings`), and 8 (`hokim_account`) evaluate truthfully to `incomplete` with clear blocker reasons explaining they are pending Stories 1.4–1.6.
  - `confirmDistrictDisclosure` must wrap DB update and `DISTRICT_DISCLOSURE_CONFIRMED` audit log creation in an atomic `db.transaction(async (tx) => { ... })`.
  - Audit event metadata strictly adheres to AD-9 (privacy safe): `districtId`, `districtName`, `confirmedAt` only. Zero credentials or resident data.

- **Patch P4 (Fastify Route Registration & Origin/Auth Hook Order):**
  - Register routes in `apps/backend/src/modules/districts/districts-routes.ts`:
    - `GET /api/v1/districts/:districtId/readiness`
    - `POST /api/v1/districts/:districtId/disclosure-confirmation`
  - Scoped inside plugin with `verifyStateChangingOrigin` and `createRequireProductOwner(db)` preHandlers.
  - Validate `districtId` path param; return `400 VALIDATION_ERROR` for empty/invalid IDs.

- **Patch P5 (Frontend District-Scoped Query & Cache Invalidation):**
  - Implement `districtClient.getDistrictReadiness(districtId)` and `districtClient.confirmDisclosure(districtId)` using shared `request<T>` from `apps/web/src/lib/api-client.ts`.
  - TanStack Query key: `['district', activeDistrictId, 'readiness']`.
  - Invalidate readiness query on successful disclosure confirmation.
  - `DistrictOnboardingChecklist` renders `Progress` bar and 8 prerequisite items with explicit `Tag` presets (`color="success"`, `color="warning"`, `color="error"`).
  - Activation CTA button (`Туманни фаоллаштириш`) is disabled with helper tooltip whenever `!readiness.isActivationReady`.

- **Patch P6 (Dirty-State Guard, Offline Protection & Accessibility Standards):**
  - `useDirtyState` integrated with `DisclosureConfirmationModal`.
  - Offline banner renders persistent warning: `Сервер билан алоқа мавжуд эмас. Тармоқни текширинг.` and disables confirmation mutation.
  - Interactive targets meet 44px touch minimum (`targets.touch-min`), with full Uzbek Cyrillic microcopy.

- **Patch P7 (Multi-Tier Automated Verification Matrix):**
  - **Backend Integration Tests:** `apps/backend/tests/districts-readiness.test.ts` (test readiness evaluation, disclosure confirmation atomicity, audit logging, 401/403/404 handling).
  - **Frontend Component Tests:** `apps/web/tests/unit/DistrictOnboardingChecklist.test.tsx` (test checklist rendering, progress computation, status tags, disabled activation CTA).
  - **Playwright E2E Test:** `apps/web/e2e/district-onboarding.spec.ts` (complete user journey from district creation to disclosure confirmation, resumability, and offline protection).

### Architecture & Security Compliance (AD-1 to AD-10)
- **AD-1 (Modular Monolith):** Keep domain evaluation logic pure inside `modules/districts/districts-readiness.ts`. No infrastructure leaks into domain logic.
- **AD-2 (TypeScript & Ant Design 5.x):** Strict typing without `any`/`unknown`. Use Ant Design 5.x components (`Card`, `List`, `Progress`, `Tag`, `Modal`, `Button`, `Alert`) with `mahallaTheme` tokens.
- **AD-3 & AD-4 (PostgreSQL & Drizzle ORM):** Use Drizzle schema definitions as single source of truth; generate versioned SQL migrations (`0002_onboarding_readiness.sql`).
- **AD-9 (Explicit District Scope & Audit Immutability):** Every endpoint requires explicit `:districtId`. Write immutable audit records to `audit_events` with action `DISTRICT_DISCLOSURE_CONFIRMED`. No resident data or credentials in audit payload.
- **AD-10 (Same-Origin REST & Scoped Server State):** TanStack Query keys MUST be scoped by district (`['district', activeDistrictId, 'readiness']`). Purge cache on district switch.

### Key File Locations

#### Backend (`apps/backend/`):
- `src/adapters/db/schema/districts.ts` — **[MODIFY]** Add onboarding & readiness columns.
- `drizzle/0002_onboarding_readiness.sql` — **[NEW]** SQL migration for schema additions.
- `src/modules/districts/districts-readiness.ts` — **[NEW]** Domain service for readiness evaluation & disclosure confirmation.
- `src/modules/districts/districts-routes.ts` — **[MODIFY]** Register readiness and disclosure endpoints.
- `tests/districts-readiness.test.ts` — **[NEW]** Integration tests against real PostgreSQL.

#### Shared API Contracts (`packages/api-contracts/`):
- `src/readiness.ts` — **[NEW]** Zod schemas and TypeScript types for readiness checklist & disclosure.
- `src/index.ts` — **[MODIFY]** Export readiness contracts.

#### Web Frontend (`apps/web/`):
- `src/district/district-client.ts` — **[MODIFY]** Add readiness API calls.
- `src/components/DistrictOnboardingChecklist.tsx` — **[NEW]** Main onboarding checklist component.
- `src/components/DisclosureConfirmationModal.tsx` — **[NEW]** Standing access disclosure confirmation modal.
- `src/pages/OverviewPage.tsx` — **[MODIFY]** Render checklist when active district is `SETUP_INCOMPLETE`.
- `src/pages/DistrictsPage.tsx` — **[MODIFY]** Add checklist setup button/tag.
- `tests/unit/DistrictOnboardingChecklist.test.tsx` — **[NEW]** Frontend unit tests.
- `e2e/district-onboarding.spec.ts` — **[NEW]** Comprehensive Playwright E2E journey.

### Uzbek Cyrillic Microcopy Standard
- Checklist Header: `Туманни фаоллаштиришга тайёрлаш`
- Checklist Description: `Туманни тизимга тўлиқ улаш учун қуйидаги барча 8 та талаб бажарилиши шарт.`
- Status Passed: `Бажарилди` (Tag: `success`)
- Status Incomplete: `Тугалланмаган` (Tag: `warning`)
- Status Failed: `Хатолик` (Tag: `error`)
- Progress Summary: `{passedCount} / {totalCount} та талаб бажарилди`
- Activation CTA: `Туманни фаоллаштириш` (Disabled with message: `Фаоллаштириш учун барча талаблар бажарилиши керак`)
- Disclosure Modal Title: `Операцион кириш очиқлигини тасдиқлаш`
- Disclosure Confirm CTA: `Тасдиқлаш ва сақлаш`
- Offline Warning: `Сервер билан алоқа мавжуд эмас. Тармоқни текширинг.`

---
- **Initial State Truthfulness:** Out of the 8 prerequisites, `district_identity`, `access_eligibility`, `analysis_configuration`, and `district_isolation` derive as `passed` upon district creation under baseline conditions. `disclosure_confirmation` transitions to `passed` when confirmed via Story 1.3's PO disclosure modal. The remaining 3 (`telegram_bot`, `group_mappings`, `hokim_account`) remain truthful `incomplete` with clear blockers until implemented in Stories 1.4–1.6.
- **Audit Logging:** Every disclosure confirmation writes an audit log with action `DISTRICT_DISCLOSURE_CONFIRMED` and metadata `{ districtId, districtName, confirmedAt }` (no passwords or sensitive credentials).
- **Design System Invariants:** Uses Ant Design 5 tokens (`colorSuccess`, `colorWarning`, `colorError`) without arbitrary hex overrides. Minimum 44px touch targets.
- **Strict Verification Enforcement:** Prior to marking complete, run all lint, typecheck, unit, integration, and E2E checks.

### Completion Notes List
- Comprehensive story specification validated through 5-step adversarial review workflow.
- 13 BDD acceptance criteria, 9 detailed implementation tasks, API contract specs, and testing matrix confirmed.
- 7 Adversarial Pre-Implementation Patches (P1–P7) incorporated into Dev Notes for seamless `dev-story` implementation.
- [Task 1 COMPLETE] Updated `districts` schema in `apps/backend/src/adapters/db/schema/districts.ts` with `accessEligible`, `analysisConfigProfileId`, `disclosureConfirmedAt`, and `disclosureConfirmedById`. Generated and executed migration `0002_strong_reavers.sql`. All DB migrations applied and all 76 unit/integration tests passing.
- [Task 2 COMPLETE] Created `packages/api-contracts/src/readiness.ts` and exported all readiness schemas/types from `packages/api-contracts/src/index.ts`. Workspace typecheck verified 0 errors.
- [Task 3 COMPLETE] Created pure readiness domain evaluator `evaluateDistrictReadiness` and atomic disclosure confirmation service `confirmDistrictDisclosure` with `DISTRICT_DISCLOSURE_CONFIRMED` audit logging in `apps/backend/src/modules/districts/districts-readiness.ts`. All 8 FR20 prerequisites evaluated truthfully.
- [Task 4 COMPLETE] Registered `GET /api/v1/districts/:districtId/readiness` and `POST /api/v1/districts/:districtId/disclosure-confirmation` in `apps/backend/src/modules/districts/districts-routes.ts`, protected by `verifyStateChangingOrigin` and `createRequireProductOwner(db)`.
- [Task 5 COMPLETE] Created comprehensive PostgreSQL integration tests in `apps/backend/tests/districts-readiness.test.ts` covering 401/403/404 security matrix, initial 8-item readiness derivation, disclosure confirmation atomicity & audit logging, access eligibility failure handling, and config profile alteration. All 9 tests passing.
- [Task 6 COMPLETE] Extended `apps/web/src/district/district-client.ts` and implemented `useDistrictReadiness` hook in `apps/web/src/district/useDistrictReadiness.ts` using TanStack Query key `['district', activeDistrictId, 'readiness']`. Automatic cache invalidation on confirmation mutation and purge on district switch.
- [Task 7 COMPLETE] Created `apps/web/src/components/DistrictOnboardingChecklist.tsx` and `apps/web/src/components/DisclosureConfirmationModal.tsx`. Updated `OverviewPage.tsx` to render checklist when district is selected, and `DistrictsPage.tsx` with setup shortcut link. Added comprehensive unit tests in `apps/web/tests/unit/DistrictOnboardingChecklist.test.tsx` (all 3 unit tests passing, 17/17 web tests green).
- [Task 8 COMPLETE] Integrated `useDirtyState` with `DisclosureConfirmationModal`, added offline detection and mutation guard blocking confirmation while offline, verified 44px minimum touch targets and keyboard navigation across all checklist actions. Added unit test for offline behavior (all 18/18 web tests green, 65/65 workspace tests passing).
- [Task 9 COMPLETE] Created Playwright E2E test `apps/web/tests/e2e/district-onboarding.spec.ts` covering full PO onboarding journey, disclosure confirmation, 5/8 progress increment, navigation resumability, and disabled activation CTA gating. All 9 Playwright E2E tests passing.
- [Adversarial Code Review COMPLETE] Completed 3-layer adversarial review (Blind Hunter, Edge Case Hunter, Acceptance Auditor). Successfully applied and verified all 7 patches: double-confirmation modal fix, dirty-state navigation guard, shared date formatters, region evaluation in district_identity, DistrictAlreadyActiveError 409 guard, URI encoding on district client, and Ant Design theme token adoption. 100% test suites green (66 Vitest unit/integration + 9 Playwright E2E).

### File List
- `_bmad-output/implementation-artifacts/1-3-resume-district-onboarding-and-track-activation-readiness.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/deferred-work.md`
- `apps/backend/src/adapters/db/schema/districts.ts`
- `apps/backend/drizzle/0002_strong_reavers.sql`
- `apps/backend/drizzle/meta/0002_snapshot.json`
- `apps/backend/drizzle/meta/_journal.json`
- `packages/api-contracts/src/readiness.ts`
- `packages/api-contracts/src/index.ts`
- `apps/backend/src/modules/districts/districts-service.ts`
- `apps/backend/src/modules/districts/districts-readiness.ts`
- `apps/backend/src/modules/districts/districts-routes.ts`
- `apps/backend/tests/districts-readiness.test.ts`
- `apps/web/src/lib/formatters.ts`
- `apps/web/src/district/district-client.ts`
- `apps/web/src/district/useDistrictReadiness.ts`
- `apps/web/src/components/DisclosureConfirmationModal.tsx`
- `apps/web/src/components/DistrictOnboardingChecklist.tsx`
- `apps/web/src/pages/OverviewPage.tsx`
- `apps/web/src/pages/DistrictsPage.tsx`
- `apps/web/tests/unit/DistrictOnboardingChecklist.test.tsx`
- `apps/web/tests/e2e/district-onboarding.spec.ts`

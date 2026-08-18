---
baseline_commit: afa2890
---

# Story 1.3: Resume District Onboarding and Track Activation Readiness

Status: ready-for-dev

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

- [ ] **Task 1: Database Schema & Migration (`0002_onboarding_readiness.sql`)** (AC: 1, 3, 4, 5)
  - [ ] 1.1 Update `districts` table schema in [`apps/backend/src/adapters/db/schema/districts.ts`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/backend/src/adapters/db/schema/districts.ts) with `accessEligible`, `analysisConfigProfileId`, `disclosureConfirmedAt`, and `disclosureConfirmedById`.
  - [ ] 1.2 Generate and review version-controlled SQL migration `0002_onboarding_readiness.sql` in `apps/backend/drizzle/`.
  - [ ] 1.3 Apply migration and verify schema with PostgreSQL database.

- [ ] **Task 2: Shared API Contracts (`packages/api-contracts`)** (AC: 1, 2, 5, 7)
  - [ ] 2.1 Create [`packages/api-contracts/src/readiness.ts`](file:///c:/codevision-works/mahalla-ovozi-trial-2/packages/api-contracts/src/) defining `PrerequisiteStatusSchema`, `PrerequisiteKeySchema`, `PrerequisiteItemSchema`, `DistrictReadinessSchema`, `GetDistrictReadinessResponseSchema`, and `ConfirmDisclosureResponseSchema`.
  - [ ] 2.2 Re-export readiness schemas and types from [`packages/api-contracts/src/index.ts`](file:///c:/codevision-works/mahalla-ovozi-trial-2/packages/api-contracts/src/index.ts).
  - [ ] 2.3 Run typecheck to ensure clean contract compilation.

- [ ] **Task 3: Backend Domain Readiness Evaluator & Service** (AC: 2, 3, 4, 5, 6, 7)
  - [ ] 3.1 Create `apps/backend/src/modules/districts/districts-readiness.ts` implementing `evaluateDistrictReadiness(db, districtId)`.
  - [ ] 3.2 Implement pure evaluation for each of the 8 prerequisites with accurate Uzbek Cyrillic labels and truthful blocker reasons.
  - [ ] 3.3 Create `confirmDistrictDisclosure(db, districtId, actor, clientInfo)` service function performing atomic DB update and inserting audit event into `audit_events` table.
  - [ ] 3.4 Define domain errors (`DistrictNotFoundError`, `DistrictAlreadyActiveError`, etc.).

- [ ] **Task 4: Fastify API Route Registrations** (AC: 5, 7, 10)
  - [ ] 4.1 Register `GET /api/v1/districts/:districtId/readiness` route in `apps/backend/src/modules/districts/districts-routes.ts` protected by `createRequireProductOwner(db)`.
  - [ ] 4.2 Register `POST /api/v1/districts/:districtId/disclosure-confirmation` protected by `verifyStateChangingOrigin` and `createRequireProductOwner(db)`.
  - [ ] 4.3 Validate `districtId` path parameter and return standard sanitized error envelopes on failure.

- [ ] **Task 5: Backend Integration Tests** (AC: 2, 5, 6, 7, 13)
  - [ ] 5.1 Create `apps/backend/tests/districts-readiness.test.ts` testing against real PostgreSQL database.
  - [ ] 5.2 Test initial readiness calculation on newly created district (verifying 3 truthful incomplete items, 1 incomplete disclosure, 4 passed items).
  - [ ] 5.3 Test disclosure confirmation: DB timestamp persistence and `DISTRICT_DISCLOSURE_CONFIRMED` audit log entry.
  - [ ] 5.4 Test access eligibility and isolation failure handling.
  - [ ] 5.5 Test unauthenticated and cross-tenant access rejection (401/403/404).

- [ ] **Task 6: Frontend District Client & Queries** (AC: 1, 7, 11)
  - [ ] 6.1 Extend `apps/web/src/district/district-client.ts` with `getDistrictReadiness(districtId)` and `confirmDisclosure(districtId)`.
  - [ ] 6.2 Implement TanStack Query hook with district-scoped key `['district', activeDistrictId, 'readiness']`.
  - [ ] 6.3 Ensure district switching properly cancels and purges readiness query cache.

- [ ] **Task 7: Frontend UI Components (`DistrictOnboardingChecklist`)** (AC: 1, 2, 5, 12)
  - [ ] 7.1 Implement `apps/web/src/components/DistrictOnboardingChecklist.tsx` adhering to `setup-checklist` design tokens.
  - [ ] 7.2 Implement `apps/web/src/components/DisclosureConfirmationModal.tsx` for deliberate PO confirmation.
  - [ ] 7.3 Update `apps/web/src/pages/OverviewPage.tsx` to render the onboarding checklist when the active district is `SETUP_INCOMPLETE`.
  - [ ] 7.4 Add checklist / setup shortcut link in `apps/web/src/pages/DistrictsPage.tsx` table actions.

- [ ] **Task 8: Frontend State, Offline & Accessibility Polish** (AC: 9, 11, 12)
  - [ ] 8.1 Integrate `useDirtyState` with the disclosure modal to prevent draft loss on background clicks / route change.
  - [ ] 8.2 Connect offline detection banner to block confirmation mutations when offline.
  - [ ] 8.3 Verify keyboard Tab order, ARIA attributes, and 44px minimum touch targets across all checklist actions.

- [ ] **Task 9: Playwright E2E Test Suite** (AC: 1, 2, 5, 8, 9, 11, 13)
  - [ ] 9.1 Create `apps/web/e2e/district-onboarding.spec.ts`.
  - [ ] 9.2 Test end-to-end flow: Create district -> Inspect checklist -> Confirm disclosure -> Verify updated status -> Navigate away and return (verify resumability) -> Verify disabled activation button with remaining blockers -> Test offline warning behavior.

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

## References
- Epic 1 Story 1.3: [`_bmad-output/planning-artifacts/epics/epic-1.md#Story-1.3`](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/epics/epic-1.md#L178-L270)
- PRD FR-20: [`_bmad-output/planning-artifacts/prds/prd-Mahalla-Ovozi-2026-07-30/prd.md#fr-20-gated-and-resumable-district-onboarding`](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/prds/prd-Mahalla-Ovozi-2026-07-30/prd.md#L344-L355)
- Architecture Spine: [`_bmad-output/planning-artifacts/architecture/architecture-Mahalla-Ovozi-2026-08-12/ARCHITECTURE-SPINE.md`](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/architecture/architecture-Mahalla-Ovozi-2026-08-12/ARCHITECTURE-SPINE.md)
- UX Design & Component Patterns: [`_bmad-output/planning-artifacts/ux-designs/ux-Mahalla-Ovozi-2026-08-05/EXPERIENCE.md`](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/ux-designs/ux-Mahalla-Ovozi-2026-08-05/EXPERIENCE.md) & [`DESIGN.md`](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/ux-designs/ux-Mahalla-Ovozi-2026-08-05/DESIGN.md)
- Story 1.2 Specification & Implementation: [`_bmad-output/implementation-artifacts/1-2-create-and-select-a-district-in-the-product-owner-console.md`](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/implementation-artifacts/1-2-create-and-select-a-district-in-the-product-owner-console.md)

---

## Dev Agent Record

### Agent Model Used
Gemini 3.7 Flash (High)

### Debug Log References
- All tests baseline verified: 76/76 unit & integration tests passing, 8/8 Playwright E2E passing.
- 0 TypeScript compilation errors across all workspace packages.

### Completion Notes List
- Comprehensive story specification validated through 5-step adversarial review workflow.
- 13 BDD acceptance criteria, 9 detailed implementation tasks, API contract specs, and testing matrix confirmed.
- 7 Adversarial Pre-Implementation Patches (P1–P7) incorporated into Dev Notes for seamless `dev-story` implementation.

### File List
- `_bmad-output/implementation-artifacts/1-3-resume-district-onboarding-and-track-activation-readiness.md`


---
baseline_commit: 6942dd4a016021ae63713b0bf7d07cdd6dfbc2da
---

# Story 6.3: Cancel and Recover a District Before Live Deletion

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the **Product Owner**,  
I want to cancel a District with explicit consequences and recover it during the permitted recovery window,  
so that participation can end safely while still allowing a controlled return before permanent live deletion.

---

## Acceptance Criteria

1. **State-Valid Cancellation Availability & Explicit Scoping (AC 1, FR29, FR31, AD-9)**
   - **Given** the Product Owner opens an eligible District's subscription detail (`/subscriptions`)
   - **When** Cancellation is evaluated
   - **Then** the action is available only for active or restricted service states (`ACTIVE`, `GRACE`, or `SUSPENDED`)
   - **And** the action is clearly visually demarcated as destructive and distinct from temporary Suspension
   - **And** the selected District is explicitly identified by Name, ID, and Region
   - **And** cancellation cannot be initiated for an omitted, inferred, or unauthorized District scope.

2. **High-Assurance Consequence Preview (AC 2, FR31, AD-11)**
   - **Given** the Product Owner chooses "Туманни бекор қилиш (Cancel District)"
   - **When** the high-assurance confirmation modal is presented
   - **Then** it clearly previews all seven operational consequences before any action can be taken:
     1. States the exact live-system deletion deadline, calculated and persisted as exactly 30 days after the authoritative cancellation timestamp (`now + 30 days`, formatted in `Asia/Tashkent` as `DD.MM.YYYY, HH:mm`).
     2. States the protected-backup expiry deadline/rule (ages out within a maximum of 30 additional days after live deletion).
     3. States that Telegram message intake, AI processing jobs, and District Hokim access will stop immediately.
     4. States that the stored Telegram bot token credentials will be permanently removed from active Mahalla Ovozi storage.
     5. States that normal 90-day Topic and Accepted Evidence retention continues running unchanged during the 30-day recovery window.
     6. States that recovery can restore only data that remains unexpired under normal retention rules.
     7. States that missed Telegram messages will not be backfilled, replayed, or reconstructed upon recovery.

3. **Two-Factor Destructive Confirmation: Non-Sensitive Reason & Typed Name (AC 3, FR31, AD-9, AD-10)**
   - **Given** the cancellation confirmation modal is open
   - **When** the Product Owner has not supplied BOTH a valid non-sensitive cancellation reason AND typed the exact District name (case-sensitive trimmed match)
   - **Then** the destructive "Туманни бекор қилиш" confirmation button remains disabled
   - **And** the ordinary safe "Бекор қилиш (Cancel)" button remains available and receives initial keyboard autofocus
   - **And** pressing the `Enter` key within text inputs never triggers destructive District cancellation.

4. **Prohibited Secret Scanning in Cancellation Reason (AC 4, AD-9)**
   - **Given** the Product Owner enters a cancellation reason in the confirmation modal
   - **When** a known product secret is detected (Telegram bot token `\d{7,12}:[A-Za-z0-9_-]{34,36}`, API keys `sk-proj-...`, `AIza...`, Bearer tokens, passwords, or JWTs using `containsProhibitedSecrets`)
   - **When** submission is attempted
   - **Then** cancellation is rejected client-side and server-side with a sanitized field-level validation error (`Махфий маълумотлар (бот токенлари, API калитлар ёки пароллар) кўрсатилиши мумкин эмас.`)
   - **And** help text explicitly warns that reasons accept operational metadata only and prohibits credentials, bot tokens, API keys, and resident message content
   - **And** valid entered text remains intact for correction without clearing the modal
   - **And** no general personal-data-redaction workflow is introduced.

5. **Atomic Cancellation Execution & Active Bot Token Removal (AC 5, FR31, AD-3, AD-9)**
   - **Given** the Product Owner supplies the required confirmation and the District is in an eligible state (`ACTIVE`, `GRACE`, or `SUSPENDED`)
   - **When** cancellation succeeds
   - **Then** the District becomes `CANCELLED` atomically in PostgreSQL across both `district_subscriptions` and `districts` tables
   - **And** `statusStartedAt` is set to the current timestamp (`now`)
   - **And** `scheduledTransitionAt` is recorded as exactly 30 days after cancellation (`now + 30 days`) with `scheduledTransitionType = 'LIVE_DELETION'`
   - **And** stored Telegram bot credentials in `district_telegram_bots` for that District are permanently deleted from active database storage
   - **And** associated Telegram group mappings in `district_telegram_groups` transition to `PENDING` status
   - **And** new Telegram webhook intake is immediately dropped
   - **And** new AI processing jobs are stopped
   - **And** District Hokim access is revoked
   - **And** successful cancellation is reported only after authoritative server response.

6. **Worker Job Lifecycle Enforcement on Cancelled Districts (AC 6, FR31, AD-3, AD-9)**
   - **Given** cancellation has become authoritative
   - **When** outstanding background worker jobs (e.g. Qualification, Semantic Relevance, Topic Assignment, Topic Projection) attempt execution
   - **Then** the workers re-check current District lifecycle state
   - **And** jobs for `CANCELLED` districts are safely discarded without performing AI provider calls or external side effects
   - **And** completed historical processing decisions are not replayed or rewritten.

7. **Hokim Session Revocation & Product Owner Operational Access (AC 7, FR31, AD-9, AD-10)**
   - **Given** a Hokim session was active when the District becomes `CANCELLED`
   - **When** lifecycle enforcement occurs
   - **Then** protected Hokim content is immediately removed from the browser surface upon next API call or refresh
   - **And** subsequent protected requests are rejected with HTTP 403 `DISTRICT_SUSPENDED` / `DISTRICT_CANCELLED`
   - **And** an existing session cannot bypass Cancellation
   - **And** the authenticated Product Owner retains operational Console access to Subscriptions, System Health, Audit History, and read-only retained evidence while unexpired and not live-deleted.

8. **Cancelled District Review & Independent 90-Day Retention (AC 8, FR31, FR32, AD-3)**
   - **Given** a District remains `CANCELLED` before its live-deletion deadline
   - **When** the Product Owner reviews its subscription detail in the Console
   - **Then** the exact cancellation timestamp, live-deletion deadline, and remaining recovery window are clearly visible
   - **And** normal 90-day Topic and Accepted Evidence retention continues independently in the background (scanning `ACTIVE`, `GRACE`, `SUSPENDED`, and `CANCELLED` districts)
   - **And** Cancellation does not freeze, pause, or extend content retention.

9. **Start Recovery Initiation & Deletion Schedule Cancellation (AC 9, FR31, AD-3, AD-9)**
   - **Given** a District is `CANCELLED` and its live-deletion deadline has not yet passed (`scheduledTransitionAt > now`)
   - **When** the Product Owner clicks "Туманни тиклашни бошлаш (Start Recovery)"
   - **Then** a consequence confirmation modal displays the exact District name and recovery conditions
   - **When** confirmed, the server atomically transitions the District and subscription to `SETUP_INCOMPLETE` status
   - **And** the pending 30-day live deletion schedule is cleared (`scheduledTransitionAt = null`, `scheduledTransitionType = null`)
   - **And** production intake, AI processing, and Hokim access remain disabled
   - **And** the old removed bot credential is not restored
   - **And** an append-only Audit History event (`DISTRICT_RECOVERY_STARTED`) is recorded.

10. **Secure Telegram Re-Configuration Requirement (AC 10, FR31, AD-9)**
    - **Given** recovery has started and the District is in `SETUP_INCOMPLETE`
    - **When** the Product Owner configures Telegram access
    - **Then** a new bot token must be entered and validated through the standard onboarding capability (`/api/v1/districts/:districtId/telegram-bot`)
    - **And** the prior cancelled token cannot be recovered from browser state, Audit History, logs, or stored plaintext
    - **And** the secret-entry transaction follows the existing authenticated AES-256-GCM encryption contract.

11. **Retention State Preservation During Recovery (AC 11, FR31, FR32)**
    - **Given** a recovering District has some Topic or Evidence data that reached 90-day expiry before or during recovery
    - **When** the Product Owner reviews or completes recovery
    - **Then** expired data remains permanently purged and unrecoverable
    - **And** recovery restores no data already removed through normal retention
    - **And** remaining unexpired retained data continues under the standard District authorization contract.

12. **Gated Activation Prerequisites Enforcement (AC 12, FR20, FR31, AD-9)**
    - **Given** a recovering District is in `SETUP_INCOMPLETE`
    - **When** the Product Owner attempts to activate the District (`POST /api/v1/districts/:districtId/activate`)
    - **Then** activation remains strictly blocked until all 8 onboarding prerequisites established in Story 1.7 pass (valid bot token, valid mahalla group mappings, active Hokim account, confirmed standing disclosure, access eligibility, configuration profile)
    - **And** if any prerequisite is incomplete, the request is rejected with HTTP 409 `DISTRICT_NOT_READY` and an actionable list of blockers
    - **And** recovery creates no alternative shortcut or weaker activation path.

13. **Atomic Reactivation & Prospective Processing Resumption (AC 13, FR30, FR31, AD-5, AD-6, AD-8)**
    - **Given** all required activation checks succeed for a recovering District
    - **When** the Product Owner explicitly activates the District
    - **Then** the District and subscription return to `ACTIVE` atomically
    - **And** `statusStartedAt` is updated to the reactivation timestamp
    - **And** new Telegram intake, AI processing, and Hokim access resume prospectively
    - **And** processing begins only with new Telegram messages received after reactivation
    - **And** messages missed during Cancellation or recovery setup are not fetched, reconstructed, backfilled, or replayed
    - **And** completed historical topic decisions are not reassessed.

14. **Post-Live-Deletion Recovery Ineligibility (AC 14, FR31, FR32)**
    - **Given** the live-deletion deadline has already passed and authoritative live deletion has completed (Story 6.4)
    - **When** recovery is requested
    - **Then** recovery is completely unavailable
    - **And** the request fails safely with HTTP 409 `RECOVERY_WINDOW_EXPIRED` and a sanitized explanation: *"30 кунлик тиклаш муддати тугаган. Туманни тиклаш мумкин эмас."*
    - **And** no UI or API path can return that District to Active through this recovery workflow.

15. **Concurrency, Row Locking & Duplicate Request Safety (AC 15, FR31, AD-3, AD-9)**
    - **Given** concurrent cancellation, recovery start, or reactivation requests occur for the same District
    - **When** the server processes those requests
    - **Then** PostgreSQL row-level locks (`SELECT ... FOR UPDATE` on `districts` first, `district_subscriptions` second) ensure deterministic serial evaluation
    - **And** CAS conditional updates ensure only transitions valid against the authoritative current state succeed
    - **And** duplicate submissions produce at most one logical state transition and at most one audit event
    - **And** stale requests cannot overwrite newer lifecycle states.

16. **Immutable Audit History Attribution (AC 16, FR31, AD-9)**
    - **Given** cancellation, recovery start, or reactivation occurs
    - **When** Audit History records the transition
    - **Then** exactly one immutable append-only event is logged (`DISTRICT_CANCELLED`, `DISTRICT_RECOVERY_STARTED`, or `DISTRICT_ACTIVATED`)
    - **And** records capture the Product Owner actor ID and role, timestamps, previous status, new status, scheduled deletion timestamp if cancelled, and sanitized reason
    - **And** raw Telegram bot tokens, resident messages, and credentials are strictly excluded from audit payloads.

17. **Offline Mutation Blocking, Accessible Dialogs, and Error Sanitization (AC 17, AD-10)**
    - **Given** the Product Owner is offline or loses connectivity
    - **When** viewing subscription records
    - **Then** all destructive and lifecycle action buttons (Cancel District, Start Recovery) are disabled
    - **And** no lifecycle mutation is queued or automatically resubmitted
    - **And** confirmation modals feature accessible titles, consequence descriptions, contained focus, default focus on safe Cancel, Escape dismissal, and exact opener focus restoration
    - **And** all technical errors are sanitized, hiding infrastructure details and secrets.

---

## Tasks / Subtasks

- [x] **Task 1: Shared API Contracts in `@mahalla-ovozi/api-contracts`** (AC: 1, 2, 3, 4, 9, 14, 16)
  - [x] 1.1 In `packages/api-contracts/src/subscriptions.ts`, define and export Zod schemas and TypeScript types:
    - `CancelDistrictRequestSchema`: `z.object({ reason: z.string().trim().min(1, 'Бекор қилиш сабабини киритинг.').max(1000, 'Сабаб 1000 та белгидан ошмаслиги керак.'), confirmationDistrictName: z.string().trim().min(1, 'Туман номини тасдиқлаш учун тўлиқ киритинг.') })` superRefined with `containsProhibitedSecrets(data.reason)`.
    - `CancelDistrictResponseSchema`: `z.object({ subscription: DistrictSubscriptionSchema, message: z.string() })`.
    - `StartRecoveryRequestSchema`: `z.object({ reason: z.string().trim().max(1000, 'Сабаб 1000 та белгидан ошмаслиги керак.').optional() })` superRefined with `containsProhibitedSecrets(data.reason)`.
    - `StartRecoveryResponseSchema`: `z.object({ subscription: DistrictSubscriptionSchema, message: z.string() })`.
    - `DistrictConfirmationMismatchErrorSchema`: `z.object({ code: z.literal('DISTRICT_CONFIRMATION_MISMATCH'), message: z.string() })`.
    - `RecoveryWindowExpiredErrorSchema`: `z.object({ code: z.literal('RECOVERY_WINDOW_EXPIRED'), message: z.string() })`.
  - [x] 1.2 In `packages/api-contracts/src/audit.ts`, add audit actions:
    - `'DISTRICT_CANCELLED'`
    - `'DISTRICT_RECOVERY_STARTED'`
  - [x] 1.3 Build `@mahalla-ovozi/api-contracts` package (`pnpm --filter @mahalla-ovozi/api-contracts build`).

- [x] **Task 2: Backend Subscriptions Service & Lifecycle State Machine** (AC: 1, 3, 4, 5, 8, 9, 10, 14, 15, 16)
  - [x] 2.1 In `apps/backend/src/modules/subscriptions/subscriptions-service.ts`, implement domain errors:
    - `DistrictConfirmationMismatchError`: 400 Bad Request, code `'DISTRICT_CONFIRMATION_MISMATCH'`.
    - `RecoveryWindowExpiredError`: 409 Conflict, code `'RECOVERY_WINDOW_EXPIRED'`.
  - [x] 2.2 Implement `cancelDistrict(db, boss, districtId, payload, actor, context)`:
    - Acquire row locks in strict order (`districts` first, then `district_subscriptions` second via `SELECT ... FOR UPDATE`).
    - Verify current status is `'ACTIVE'`, `'GRACE'`, or `'SUSPENDED'` (reject `'CANCELLED'` with `InvalidSubscriptionTransitionError`).
    - Validate `payload.confirmationDistrictName.trim() === lockedDistrict.name.trim()` (throw `DistrictConfirmationMismatchError` on mismatch).
    - Calculate exact 30-day live deletion deadline: `new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)`.
    - Delete active bot token credentials from `districtTelegramBots` for this `districtId`.
    - Update `districtTelegramGroups` status to `'PENDING'`.
    - Update `district_subscriptions` atomically: `status = 'CANCELLED'`, `statusStartedAt = now`, `scheduledTransitionAt = scheduledDeletionAt`, `scheduledTransitionType = 'LIVE_DELETION'`, `updatedAt = now`, `updatedById = actor.id`.
    - Synchronize `districts.status = 'CANCELLED'` and `districts.updatedAt = now`.
    - Record append-only audit event `DISTRICT_CANCELLED` with PO actor, sanitized reason, `scheduledDeletionAt`, and `botTokenRemoved: true`.
    - Return formatted `DistrictSubscription`.
  - [x] 2.3 Implement `startDistrictRecovery(db, districtId, payload, actor, context)`:
    - Acquire row locks in strict order (`districts` first, then `district_subscriptions` second via `SELECT ... FOR UPDATE`).
    - Verify current status is `'CANCELLED'`.
    - Verify live deletion deadline has not elapsed (`lockedSub.scheduledTransitionAt && new Date(lockedSub.scheduledTransitionAt) > now`). If expired or null, throw `RecoveryWindowExpiredError`.
    - Update `district_subscriptions` atomically: `status = 'SETUP_INCOMPLETE'`, `statusStartedAt = now`, `scheduledTransitionAt = null`, `scheduledTransitionType = null`, `updatedAt = now`, `updatedById = actor.id`.
    - Synchronize `districts.status = 'SETUP_INCOMPLETE'` and `districts.updatedAt = now`.
    - Record append-only audit event `DISTRICT_RECOVERY_STARTED` with PO actor and sanitized reason.
    - Return formatted `DistrictSubscription`.

- [x] **Task 3: Fastify API Routes for Cancellation and Recovery** (AC: 1, 3, 4, 5, 9, 14, 15, 17)
  - [x] 3.1 In `apps/backend/src/modules/subscriptions/subscriptions-routes.ts`, register endpoints:
    - `POST /api/v1/districts/:districtId/subscription/cancel`: Validates PO auth + CSRF, validates body with `CancelDistrictRequestSchema`, invokes `cancelDistrict`, maps domain errors to 400/409, returns 200 with `CancelDistrictResponse`.
    - `POST /api/v1/districts/:districtId/subscription/start-recovery`: Validates PO auth + CSRF, validates body with `StartRecoveryRequestSchema`, invokes `startDistrictRecovery`, maps domain errors to 409, returns 200 with `StartRecoveryResponse`.

- [x] **Task 4: Cross-System Lifecycle & 90-Day Retention Alignment** (AC: 5, 6, 7, 8, 11, 12, 13)
  - [x] 4.1 In `apps/backend/src/modules/retention/jobs/retention-job-handler.ts`:
    - Update individual district gate: allow `'ACTIVE'`, `'GRACE'`, `'SUSPENDED'`, and `'CANCELLED'` (`['ACTIVE', 'GRACE', 'SUSPENDED', 'CANCELLED'].includes(district.status)`).
    - Update scheduled scan query: include `'CANCELLED'` in `inArray(districts.status, ['ACTIVE', 'GRACE', 'SUSPENDED', 'CANCELLED'])`.
  - [x] 4.2 Verify `apps/backend/src/modules/districts/district-onboarding-engine.ts`:
    - Confirm `activateDistrict` seamlessly transitions recovered districts from `SETUP_INCOMPLETE` to `ACTIVE` upon satisfying all 8 onboarding prerequisites.

- [x] **Task 5: Frontend UI Components, Consequence Modals & Page Integration** (AC: 1, 2, 3, 4, 8, 9, 17)
  - [x] 5.1 In `apps/web/src/api/subscription-client.ts`: Add `cancelDistrict(districtId, payload)` and `startDistrictRecovery(districtId, payload)`.
  - [x] 5.2 In `apps/web/src/lib/formatters.ts`: Register localized audit action display names:
    - `DISTRICT_CANCELLED: 'Туман бекор қилинди (Cancelled)'`
    - `DISTRICT_RECOVERY_STARTED: 'Туманни тиклаш бошланди (Recovery Started)'`
  - [x] 5.3 Create `apps/web/src/components/subscriptions/CancelDistrictModal.tsx`:
    - High-assurance confirmation modal displaying District name/ID, 7-point consequence warning alert, calculated 30-day live deletion deadline, non-sensitive reason textarea (max 1000, secret scanning warning), typed exact District name confirmation input, disabled destructive button until valid, default autofocus on safe Cancel, Escape dismissal, opener focus return, and `isPending` / `isOffline` blocking.
  - [x] 5.4 Create `apps/web/src/components/subscriptions/StartRecoveryModal.tsx`:
    - Consequence confirmation modal explaining transition to `SETUP_INCOMPLETE`, requirement for new bot token configuration and full prerequisite validation before reactivation, optional reason input, safe Cancel default autofocus, Escape dismissal, opener focus return, and `isPending` / `isOffline` blocking.
  - [x] 5.5 Update `apps/web/src/components/subscriptions/DistrictSubscriptionDetailCard.tsx`:
    - Add "Туманни бекор қилиш (Cancel)" button for `ACTIVE`, `GRACE`, and `SUSPENDED` states.
    - Add "Туманни тиклашни бошлаш (Start Recovery)" button for `CANCELLED` state (disabled if live deletion deadline has passed).
    - Add Cancelled alert banner displaying remaining recovery duration and 30-day live deletion deadline.
  - [x] 5.6 Update `apps/web/src/components/subscriptions/DistrictSubscriptionTable.tsx`:
    - Add Cancel and Start Recovery action buttons to table rows with offline blocking.
  - [x] 5.7 Update `apps/web/src/pages/SubscriptionsPage.tsx`:
    - Wire up `CancelDistrictModal` and `StartRecoveryModal`.
    - Implement TanStack Query cache invalidations across `['subscriptions']`, `['subscription', districtId]`, `['districts']`, `['district', districtId]`, `['onboarding-readiness', districtId]`, `['audit-history']`, and `['health']`.

- [x] **Task 6: Comprehensive Automated Integration & Unit Test Verification** (AC: 1 to 17)
  - [x] 6.1 Create backend integration test suite `apps/backend/tests/district-cancellation-recovery.test.ts`:
    - Test successful cancellation from `ACTIVE`, `GRACE`, and `SUSPENDED` states with exact 30-day calculation (`scheduledTransitionAt`).
    - Test rejection of cancellation when typed District name does not match (400 `DISTRICT_CONFIRMATION_MISMATCH`).
    - Test secret scanning rejection on cancellation reason containing bot token or API key (400 `VALIDATION_ERROR`).
    - Test active bot token deletion from `districtTelegramBots` upon cancellation.
    - Test Telegram webhook rejection and AI worker job dropping for `CANCELLED` district.
    - Test Hokim auth guard 403 rejection for `CANCELLED` district.
    - Test 90-day retention job execution on `CANCELLED` district.
    - Test start recovery execution: transitions to `SETUP_INCOMPLETE`, clears deletion schedule, logs `DISTRICT_RECOVERY_STARTED`.
    - Test rejection of recovery when 30-day deadline has elapsed (409 `RECOVERY_WINDOW_EXPIRED`).
    - Test gated activation of recovered district: fails with 409 `DISTRICT_NOT_READY` until new bot token is connected, succeeds once all prerequisites pass.
    - Test prospective intake resumption after reactivation (no historical backfill).
    - Test concurrency row locking against simultaneous cancellation/recovery requests.
  - [x] 6.2 Create frontend unit test suite `apps/web/tests/unit/DistrictCancellationRecovery.test.tsx`:
    - Test `CancelDistrictModal` rendering, 7-point consequence alerts, reason input, and typed name matching enabling destructive button.
    - Test `StartRecoveryModal` rendering and confirmation trigger.
    - Test keyboard accessibility: safe Cancel autofocus, Escape dismissal, focus containment, Enter key protection.
    - Test offline button disabling across detail card and summary table.
  - [x] 6.3 Verify monorepo typecheck (`pnpm typecheck`).

### Review Findings

- [x] [Review][Patch] Missing maximum length constraint on confirmationDistrictName in API contracts schema [`packages/api-contracts/src/subscriptions.ts:148-152`]
- [x] [Review][Patch] Real-time secret scanning in StartRecoveryModal [`apps/web/src/components/subscriptions/StartRecoveryModal.tsx:139-143`]
- [x] [Review][Patch] Surfacing validation error on typed name mismatch in CancelDistrictModal [`apps/web/src/components/subscriptions/CancelDistrictModal.tsx:69-72`]
- [x] [Review][Patch] Explicit DISTRICT_CANCELLED HTTP 403 error code for Hokim auth guard [`apps/backend/src/modules/auth/require-auth.ts:116-124`]
- [x] [Review][Patch] Add lifecycle transition status metadata in activateDistrict audit event [`apps/backend/src/modules/districts/district-onboarding-engine.ts:440-446`]
- [x] [Review][Patch] Reset Telegram group validation timestamps on district cancellation [`apps/backend/src/modules/subscriptions/subscriptions-service.ts:903-909`]
- [x] [Review][Patch] Expired recovery window notice in DistrictSubscriptionDetailCard [`apps/web/src/components/subscriptions/DistrictSubscriptionDetailCard.tsx:162-182`]
- [x] [Review][Patch] Localize scheduled transition types in tables and detail cards [`apps/web/src/lib/formatters.ts:150`]
- [x] [Review][Patch] Invalidate Telegram bot and groups queries upon district cancellation/recovery [`apps/web/src/pages/SubscriptionsPage.tsx:75-86`]
- [x] [Review][Patch] Compute authoritative timestamps within database transaction [`apps/backend/src/modules/subscriptions/subscriptions-service.ts:850-860`]
- [x] [Review][Patch] Add automated integration tests for concurrent locking and AI worker job drop on cancelled districts [`apps/backend/tests/district-cancellation-recovery.test.ts`]
- [x] [Review][Patch] Harmonize bot token redaction regex in audit service [`apps/backend/src/modules/audit/audit-service.ts:35`]
- [x] [Review][Patch] Add districtId to useMemo dependency for cancellation deadline in CancelDistrictModal [`apps/web/src/components/subscriptions/CancelDistrictModal.tsx:35-39`]
- [x] [Review][Patch] Unicode NFC normalization for typed district confirmation name [`apps/backend/src/modules/subscriptions/subscriptions-service.ts:893-896`]
- [x] [Review][Patch] Defensive timestamp parsing guard for scheduledTransitionAt in recovery start [`apps/backend/src/modules/subscriptions/subscriptions-service.ts:1050-1055`]


---

## Dev Notes

### Architecture Patterns & Constraints

- **Lifecycle State Machine & Invariants (FR29, FR31, AD-3, AD-9):**
  - Permitted transitions for Story 6.3:
    - `ACTIVE` -> `CANCELLED` (Manual by Product Owner via High-Assurance Confirmation)
    - `GRACE` -> `CANCELLED` (Manual by Product Owner via High-Assurance Confirmation)
    - `SUSPENDED` -> `CANCELLED` (Manual by Product Owner via High-Assurance Confirmation)
    - `CANCELLED` -> `SETUP_INCOMPLETE` (Manual by Product Owner via Start Recovery before 30-day deadline)
    - `SETUP_INCOMPLETE` -> `ACTIVE` (Manual by Product Owner via standard Onboarding Activation after all 8 prerequisites pass)
- **Active Bot Token Removal Invariant (FR31, AD-9):**
  - When a District is cancelled, its bot token is permanently purged from `district_telegram_bots`.
  - The plaintext or ciphertext cannot be retrieved or reused upon recovery.
  - Recovery requires entering a brand-new bot token, validating it via Telegram Bot API, and re-verifying group mappings.
- **30-Day Live Deletion Calculation (FR31, AD-11):**
  - Calculated as exactly `new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)`.
  - Stored in `district_subscriptions.scheduledTransitionAt` with `scheduledTransitionType = 'LIVE_DELETION'`.
  - Formatted in UI in `Asia/Tashkent` (`DD.MM.YYYY, HH:mm`).
- **Independent 90-Day Retention Invariant (FR31, FR32, AD-3):**
  - Normal Topic and Accepted Evidence retention continues running for `CANCELLED` districts during the 30-day recovery window.
  - `retention-job-handler.ts` must include `'CANCELLED'` in its eligible status set (`['ACTIVE', 'GRACE', 'SUSPENDED', 'CANCELLED']`).
  - If evidence expires under the 90-day rule while a District is cancelled, it is permanently deleted and cannot be resurrected upon recovery.
- **PostgreSQL Deadlock-Free Row Locking (AD-3, AD-9):**
  - All state transitions must acquire exclusive row locks in consistent order:
    1. Lock `districts` row: `SELECT * FROM districts WHERE id = $1 FOR UPDATE;`
    2. Lock `district_subscriptions` row: `SELECT * FROM district_subscriptions WHERE district_id = $1 FOR UPDATE;`
- **Prospective Resumption Invariant (AD-5, AD-6, AD-8, FR30, FR31):**
  - Reactivating a recovered District processes only new Telegram messages received after the new activation timestamp.
  - Zero historical message backfill, zero Telegram crawl, zero replay of completed topic decisions.
- **High-Assurance UI Modal Contract (AD-10, UX Design):**
  - Destructive confirmation requires typing the exact District name matching `subscription.districtName.trim()`.
  - Initial autofocus is placed on the safe "Бекор қилиш (Cancel)" button.
  - Pressing `Enter` within text fields must not trigger destructive submission.
  - Modals use `destroyOnClose`, `maskClosable={false}`, and `focusTriggerAfterClose`.

---

### Database Schema Specification

```typescript
// apps/backend/src/adapters/db/schema/district-subscriptions.ts
// (Schema already configured in Stories 6.1 & 6.2 with scheduledTransitionType check constraint)
export const districtSubscriptions = pgTable(
  'district_subscriptions',
  {
    id: text('id').primaryKey(),
    districtId: text('district_id')
      .notNull()
      .references(() => districts.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('ACTIVE'),
    statusStartedAt: timestamp('status_started_at', { withTimezone: true }).notNull().defaultNow(),
    scheduledTransitionAt: timestamp('scheduled_transition_at', { withTimezone: true }),
    scheduledTransitionType: text('scheduled_transition_type'),
    externalPaymentReference: text('external_payment_reference'),
    internalNote: text('internal_note'),
    updatedById: text('updated_by_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('district_subscriptions_district_id_unique').on(table.districtId),
    check(
      'district_subscriptions_status_check',
      sql`${table.status} IN ('SETUP_INCOMPLETE', 'ACTIVE', 'GRACE', 'SUSPENDED', 'CANCELLED')`
    ),
    check(
      'district_subscriptions_scheduled_transition_type_check',
      sql`${table.scheduledTransitionType} IS NULL OR ${table.scheduledTransitionType} IN ('AUTOMATIC_SUSPENSION', 'LIVE_DELETION')`
    ),
    index('district_subscriptions_status_idx').on(table.status),
    index('district_subscriptions_scheduled_transition_idx').on(table.scheduledTransitionAt),
  ]
);
```

---

### API Contract Specification

```typescript
// packages/api-contracts/src/subscriptions.ts
import { z } from 'zod';
import { containsProhibitedSecrets } from './analysis-settings.js';

export const CancelDistrictRequestSchema = z
  .object({
    reason: z
      .string({ invalid_type_error: 'Бекор қилиш сабаби матн кўринишида бўлиши керак.' })
      .trim()
      .min(1, 'Бекор қилиш сабабини киритинг.')
      .max(1000, 'Сабаб 1000 та белгидан ошмаслиги керак.'),
    confirmationDistrictName: z
      .string({ invalid_type_error: 'Туман номи матн кўринишида бўлиши керак.' })
      .trim()
      .min(1, 'Туман номини тасдиқлаш учун тўлиқ киритинг.'),
  })
  .superRefine((data, ctx) => {
    if (data.reason && containsProhibitedSecrets(data.reason)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reason'],
        message: 'Махфий маълумотлар (бот токенлари, API калитlar ёки пароллар) кўрсатилиши мумкин эмас.',
      });
    }
  });
export type CancelDistrictRequest = z.infer<typeof CancelDistrictRequestSchema>;

export const CancelDistrictResponseSchema = z.object({
  subscription: DistrictSubscriptionSchema,
  message: z.string(),
});
export type CancelDistrictResponse = z.infer<typeof CancelDistrictResponseSchema>;

export const StartRecoveryRequestSchema = z
  .object({
    reason: z
      .string({ invalid_type_error: 'Сабаб матн кўринишида бўлиши керак.' })
      .trim()
      .max(1000, 'Сабаб 1000 та белгидан ошмаслиги керак.')
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.reason && containsProhibitedSecrets(data.reason)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reason'],
        message: 'Махфий маълумотлар (бот токенлари, API калитлар ёки пароллар) кўрсатилиши мумкин эмас.',
      });
    }
  });
export type StartRecoveryRequest = z.infer<typeof StartRecoveryRequestSchema>;

export const StartRecoveryResponseSchema = z.object({
  subscription: DistrictSubscriptionSchema,
  message: z.string(),
});
export type StartRecoveryResponse = z.infer<typeof StartRecoveryResponseSchema>;

export const DistrictConfirmationMismatchErrorSchema = z.object({
  code: z.literal('DISTRICT_CONFIRMATION_MISMATCH'),
  message: z.string(),
});
export type DistrictConfirmationMismatchError = z.infer<typeof DistrictConfirmationMismatchErrorSchema>;

export const RecoveryWindowExpiredErrorSchema = z.object({
  code: z.literal('RECOVERY_WINDOW_EXPIRED'),
  message: z.string(),
});
export type RecoveryWindowExpiredError = z.infer<typeof RecoveryWindowExpiredErrorSchema>;
```

---

### Source Tree Components & Files

#### Files to Create [NEW]
1. `apps/web/src/components/subscriptions/CancelDistrictModal.tsx` — Accessible high-assurance consequence confirmation modal for District cancellation.
2. `apps/web/src/components/subscriptions/StartRecoveryModal.tsx` — Accessible consequence confirmation modal for starting District recovery.
3. `apps/backend/tests/district-cancellation-recovery.test.ts` — Integration tests for cancellation, bot token removal, 30-day scheduling, retention, recovery start, and reactivation gates.
4. `apps/web/tests/unit/DistrictCancellationRecovery.test.tsx` — Component tests for cancellation & recovery modals, typed name confirmation, keyboard focus, and offline blocking.

#### Files to Modify [UPDATE]
1. `packages/api-contracts/src/subscriptions.ts` — Add `CancelDistrictRequestSchema`, `CancelDistrictResponseSchema`, `StartRecoveryRequestSchema`, `StartRecoveryResponseSchema`, `DistrictConfirmationMismatchErrorSchema`, `RecoveryWindowExpiredErrorSchema`.
2. `packages/api-contracts/src/audit.ts` — Add audit actions (`DISTRICT_CANCELLED`, `DISTRICT_RECOVERY_STARTED`).
3. `apps/backend/src/modules/subscriptions/subscriptions-service.ts` — Implement `cancelDistrict`, `startDistrictRecovery`, domain errors (`DistrictConfirmationMismatchError`, `RecoveryWindowExpiredError`).
4. `apps/backend/src/modules/subscriptions/subscriptions-routes.ts` — Register `/cancel` and `/start-recovery` Fastify endpoints with error mapping.
5. `apps/backend/src/modules/retention/jobs/retention-job-handler.ts` — Include `'CANCELLED'` status in retention execution gate and scheduled scan query.
6. `apps/web/src/api/subscription-client.ts` — Add API methods `cancelDistrict` and `startDistrictRecovery`.
7. `apps/web/src/lib/formatters.ts` — Register localized audit action display names.
8. `apps/web/src/components/subscriptions/DistrictSubscriptionDetailCard.tsx` — Add Cancel District and Start Recovery buttons and Cancelled alert banner.
9. `apps/web/src/components/subscriptions/DistrictSubscriptionTable.tsx` — Add row action triggers for Cancel and Start Recovery with offline disabling.
10. `apps/web/src/pages/SubscriptionsPage.tsx` — Integrate cancellation/recovery modals and cache invalidation matrix.

---

## Project Structure Notes

- **Module Consistency:** Subscriptions lifecycle domain logic is contained inside `apps/backend/src/modules/subscriptions/`.
- **Tenant Isolation & Security (AD-9):** Bot token deletion ensures that cancelled districts cannot have active credentials in storage. Recovery forces a fresh token entry.
- **Contract Adherence (AD-10):** All request/response validation schemas live in `@mahalla-ovozi/api-contracts` with runtime Zod checking and secret scanning.
- **UI Design System:** Utilizes Ant Design 5 modal overlays and theme tokens (`theme.useToken()`) conforming to Asia/Tashkent and Uzbek Cyrillic conventions.

---

## References

- **PRD:** `_bmad-output/planning-artifacts/prds/prd-Mahalla-Ovozi-2026-07-30/prd.md` — Section 4.6 (FR-29, FR-31: Confirmed cancellation and gated recovery), UJ-4.
- **Architecture Spine:** `_bmad-output/planning-artifacts/architecture/architecture-Mahalla-Ovozi-2026-08-12/ARCHITECTURE-SPINE.md` — AD-1, AD-2, AD-3, AD-4, AD-5, AD-6, AD-8, AD-9, AD-10, AD-11.
- **Epic 6:** `_bmad-output/planning-artifacts/epics/epic-6.md` — Story 6.3 (Cancel and Recover a District Before Live Deletion).
- **UX Designs:** `_bmad-output/planning-artifacts/ux-designs/ux-Mahalla-Ovozi-2026-08-05/DESIGN.md`, `EXPERIENCE.md` — Section UJ-4, cancellation confirmation, recovery rules, and accessibility tokens.
- **Story 6.1 Reference:** `_bmad-output/implementation-artifacts/6-1-review-and-maintain-district-subscription-records.md`.
- **Story 6.2 Reference:** `_bmad-output/implementation-artifacts/6-2-manage-active-grace-and-suspended-district-service.md`.
- **Project Context:** `_bmad-output/project-context.md` — Core constraints and standards.

---

## Dev Agent Record

### Agent Model Used

Gemini 3.7 Flash (High)

### Debug Log References

### Completion Notes List

1. **Shared Contracts & Zod Schemas (`@mahalla-ovozi/api-contracts`):**
   - Added `CancelDistrictRequestSchema`, `CancelDistrictResponseSchema`, `StartRecoveryRequestSchema`, `StartRecoveryResponseSchema`, `DistrictConfirmationMismatchErrorSchema`, and `RecoveryWindowExpiredErrorSchema`.
   - Added `DISTRICT_CANCELLED` and `DISTRICT_RECOVERY_STARTED` audit actions to `DISTRICT_LIFECYCLE_AUDIT_ACTIONS`.
   - Integrated client/server secret scanning rejecting bot tokens, API keys, passwords, bearer tokens, and JWTs in non-sensitive reason inputs.

2. **Backend Domain Logic & Endpoints (`@mahalla-ovozi/backend`):**
   - Implemented `cancelDistrict()` enforcing strict row-locking order (`districts` -> `district_subscriptions`), calculating 30-day live deletion deadline (`now + 30 days`), permanently deleting active bot tokens from `district_telegram_bots`, transitioning telegram groups to `PENDING`, synchronizing status to `CANCELLED`, and recording immutable audit event `DISTRICT_CANCELLED`.
   - Implemented `startDistrictRecovery()` enforcing row locking, verifying recovery window has not elapsed, transitioning status to `SETUP_INCOMPLETE`, clearing scheduled transition timestamp and type, and recording immutable audit event `DISTRICT_RECOVERY_STARTED`.
   - Registered `POST /api/v1/districts/:districtId/subscription/cancel` and `POST /api/v1/districts/:districtId/subscription/start-recovery` in `subscriptions-routes.ts` with PO auth, CSRF validation, and domain error mapping.

3. **Cross-System Lifecycle & Retention Alignment:**
   - Updated `retention-job-handler.ts` to include `CANCELLED` districts in single-district verification and scheduled retention scans.
   - Updated `district-onboarding-engine.ts` `activateDistrict` to clear `scheduledTransitionAt` and `scheduledTransitionType` when recovered districts satisfy all 8 onboarding prerequisites.

4. **Frontend UI Components & Modals (`@mahalla-ovozi/web`):**
   - Created `CancelDistrictModal.tsx`: High-assurance modal with 7-point consequence alert, Asia/Tashkent live deletion timestamp preview, secret scanning warning, typed district name validation, disabled destructive button until valid, default safe Cancel autofocus, and Enter key submission protection.
   - Created `StartRecoveryModal.tsx`: Consequence confirmation modal explaining transition to `SETUP_INCOMPLETE`, credential deletion requirement, and prerequisite validation.
   - Updated `DistrictSubscriptionDetailCard.tsx`, `DistrictSubscriptionTable.tsx`, and `SubscriptionsPage.tsx` with full action triggers, mutations, and TanStack query cache invalidations across subscriptions, districts, readiness, audit history, and system health.
   - Added Uzbek Cyrillic localized formatters for audit events.

5. **Automated Verification:**
   - Backend integration suite `apps/backend/tests/district-cancellation-recovery.test.ts`: 10/10 tests passed against isolated test database.
   - Frontend unit test suite `apps/web/tests/unit/DistrictCancellationRecovery.test.tsx`: 4/4 tests passed.
   - Full monorepo typecheck (`pnpm typecheck`): 0 errors across all workspace packages.

### File List

- `packages/api-contracts/src/subscriptions.ts` (Modified)
- `packages/api-contracts/src/audit.ts` (Modified)
- `apps/backend/src/modules/subscriptions/subscriptions-service.ts` (Modified)
- `apps/backend/src/modules/subscriptions/subscriptions-routes.ts` (Modified)
- `apps/backend/src/modules/retention/jobs/retention-job-handler.ts` (Modified)
- `apps/backend/src/modules/districts/district-onboarding-engine.ts` (Modified)
- `apps/backend/tests/district-cancellation-recovery.test.ts` (New)
- `apps/web/src/api/subscription-client.ts` (Modified)
- `apps/web/src/lib/formatters.ts` (Modified)
- `apps/web/src/components/subscriptions/CancelDistrictModal.tsx` (New)
- `apps/web/src/components/subscriptions/StartRecoveryModal.tsx` (New)
- `apps/web/src/components/subscriptions/DistrictSubscriptionDetailCard.tsx` (Modified)
- `apps/web/src/components/subscriptions/DistrictSubscriptionTable.tsx` (Modified)
- `apps/web/src/pages/SubscriptionsPage.tsx` (Modified)
- `apps/web/tests/unit/DistrictCancellationRecovery.test.tsx` (New)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (Modified)
- `_bmad-output/implementation-artifacts/6-3-cancel-and-recover-a-district-before-live-deletion.md` (Modified)


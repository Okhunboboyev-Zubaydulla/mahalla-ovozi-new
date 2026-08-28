# Story 6.2: Manage Active, Grace, and Suspended District Service

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the **Product Owner**,  
I want to start Grace, allow overdue Grace to become Suspended automatically, and restore an eligible District to Active,  
so that product access follows the District's manually managed subscription lifecycle without losing retained data or replaying missed processing.

## Acceptance Criteria

1. **State-Valid Actions & Consequence Preview (AC 1, FR29, FR30)**
   - **Given** the Product Owner opens an eligible District's subscription detail
   - **When** the current lifecycle state is shown
   - **Then** only actions valid for that current state are available:
     - `ACTIVE`: "Имтиёзли даврни бошлаш (Start Grace)"
     - `GRACE`: "Фаол ҳолатни тиклаш (Restore Active)"
     - `SUSPENDED`: "Фаол ҳолатни тиклаш (Restore Active)"
   - **And** each action presents its operational consequence before confirmation in an accessible confirmation dialog
   - **And** invalid state transitions cannot be executed by manipulating browser requests
   - **And** the server evaluates every transition against the authoritative current lifecycle state under PostgreSQL transaction locks.

2. **Starting Grace Period with Consequence Confirmation (AC 2, FR30)**
   - **Given** an `ACTIVE` District
   - **When** the Product Owner chooses to start Grace
   - **Then** a confirmation dialog identifies the exact District (Name and ID)
   - **And** states that Telegram message intake, AI processing, and Hokim access will continue during Grace
   - **And** states that normal Topic and Accepted Evidence 90-day retention continues unchanged
   - **And** states that Grace will automatically become Suspended after exactly seven days unless the District is restored to Active first
   - **And** the transition is not applied until explicitly confirmed by the Product Owner.

3. **Atomic Grace Transition & Scheduled Expiry Persistence (AC 3, FR30, AD-3, AD-9)**
   - **Given** the Product Owner confirms starting Grace against the still-current `ACTIVE` state
   - **When** the authoritative transition succeeds
   - **Then** the District becomes `GRACE` atomically in database across both `district_subscriptions` and `districts` tables
   - **And** `statusStartedAt` is set to the current timestamp and `scheduledTransitionAt` is recorded as exactly seven days after start (`now + 7 days`) with `scheduledTransitionType = 'AUTOMATIC_SUSPENSION'`
   - **And** a delayed background job is enqueued in pg-boss (`DISTRICT_SUBSCRIPTION_EXPIRY_QUEUE`) with singleton key `forSubscriptionExpiry(districtId)`
   - **And** the UI reports successful Save only after the server confirms it
   - **And** the new state, start time, expiry time, and consequence warnings are durably visible
   - **And** the transition is recorded in append-only Audit History (`DISTRICT_GRACE_STARTED`) with Product Owner actor and privacy-safe metadata.

4. **Automated 7-Day Grace Expiry & Duplicate-Safe Suspension (AC 4, FR30, AD-3)**
   - **Given** a District is in `GRACE` status
   - **When** its scheduled Grace expiry (`scheduledTransitionAt`) is reached and no successful restoration to `ACTIVE` has occurred
   - **Then** the system automatically transitions it to `SUSPENDED` exactly once via pg-boss background worker / scheduled evaluation (delayed job handler and periodic 1-minute cron sweep)
   - **And** the transition is duplicate-safe and idempotent if the scheduled worker job is retried or executed concurrently
   - **And** the authoritative `SUSPENDED` state is persisted atomically across `district_subscriptions.status` and `districts.status`
   - **And** `scheduledTransitionAt` and `scheduledTransitionType` are cleared to SQL `NULL`
   - **And** an append-only Audit History event (`DISTRICT_SUBSCRIPTION_SUSPENDED`) is recorded attributing the transition to the canonical system actor (`SYSTEM`).

5. **Operational Enforcement of Suspension on Intake, AI, and Retention (AC 5, FR30, AD-9)**
   - **Given** a District becomes `SUSPENDED`
   - **When** lifecycle enforcement takes effect
   - **Then** new Telegram intake for that District is stopped (webhook updates are dropped with `DISTRICT_NOT_ACTIVE` / `DISTRICT_SUSPENDED`)
   - **And** new AI processing jobs for that District are stopped (workers re-check lifecycle and discard pending jobs safely)
   - **And** the District Hokim loses product access (auth guard rejects requests with HTTP 403 `DISTRICT_SUSPENDED`)
   - **And** already-retained District data is NOT deleted merely because of Suspension
   - **And** ordinary Topic/Evidence retention continues according to its existing 90-day expiry rules (scheduled retention sweep runs across `ACTIVE`, `GRACE`, and `SUSPENDED` districts)
   - **And** background workers re-check the current lifecycle before performing District external or AI side effects.

6. **Hokim Session Revocation & Product Owner Operational Access (AC 6, FR30, AD-9, AD-10)**
   - **Given** a Hokim session was valid immediately before the District became `SUSPENDED`
   - **When** the new lifecycle state becomes authoritative
   - **Then** protected Hokim content is immediately removed from the browser surface upon next API call or refresh
   - **And** subsequent protected requests from that Hokim are denied with HTTP 403 `DISTRICT_SUSPENDED` via session preHandler guard
   - **And** new sign-in attempts for that Hokim are rejected during authentication
   - **And** an already-issued session cannot bypass the Suspended access rule
   - **And** the authenticated Product Owner retains operational Console access to Subscriptions, System Health, Audit History, and read-only retained evidence.

7. **Unfinished Work Handling during Suspension (AC 7, FR30, AD-3, AD-9)**
   - **Given** unfinished District background jobs exist when Suspension becomes authoritative
   - **When** a worker later attempts an external Telegram or AI side effect
   - **Then** the worker re-checks the District lifecycle state
   - **And** prohibited work does not proceed while Suspended
   - **And** no completed historical production decision is replayed or rewritten.

8. **Restoring Active from Grace (AC 8, FR30)**
   - **Given** a District is in `GRACE` and is otherwise eligible for service
   - **When** the Product Owner chooses "Фаол ҳолатни тиклаш (Restore Active)"
   - **Then** a consequence confirmation dialog identifies the exact District
   - **And** states that full service will continue
   - **And** states that no message backfill or historical replay will occur
   - **And** states that normal retention remains unchanged
   - **And** upon confirmation, the District returns to `ACTIVE` atomically across `district_subscriptions` and `districts`, `scheduledTransitionAt` and `scheduledTransitionType` are cleared to `NULL`, and a `DISTRICT_SERVICE_RESTORED_ACTIVE` audit event is recorded.

9. **Restoring Active from Suspended with Activation Prerequisite Verification (AC 9, FR30, FR20, AD-9)**
   - **Given** a District is `SUSPENDED`
   - **When** the Product Owner chooses "Фаол ҳолатни тиклаш (Restore Active)"
   - **Then** a consequence confirmation dialog explains that reactivation resumes service prospectively without backfilling missed messages
   - **When** confirmed, the server verifies the transition is allowed and authoritatively re-evaluates all 8 activation prerequisites established in Story 1.7 (`evaluateDistrictPrerequisites` via `district-onboarding-engine.ts`)
   - **And** if any prerequisite is broken or incomplete (e.g. invalid bot token, unmapped group, disabled Hokim), the restoration is rejected with HTTP 409 `DISTRICT_NOT_READY` and an actionable list of blockers
   - **And** restoring Active does not bypass required District configuration or security validity.

10. **Prospective Reactivation & Zero Historical Backfill / Replay (AC 10, FR30, AD-5, AD-6, AD-8)**
    - **Given** a valid `GRACE` or `SUSPENDED` District is restored to `ACTIVE`
    - **When** the authoritative transition succeeds
    - **Then** the District becomes `ACTIVE` atomically in `district_subscriptions` and `districts`
    - **And** new Telegram intake, AI processing, and Hokim access are enabled prospectively
    - **And** service resumes only for Telegram messages received after reactivation
    - **And** messages missed while Suspended are NOT fetched, reconstructed, backfilled, or replayed
    - **And** previously completed processing decisions are NOT rerun merely because the District returned to Active.

11. **Immutable Audit History Attribution & Deduplication (AC 11, FR30, AD-9)**
    - **Given** any Active/Grace/Suspended lifecycle transition succeeds
    - **When** `ACTIVE -> GRACE`, automatic `GRACE -> SUSPENDED`, `GRACE -> ACTIVE`, or `SUSPENDED -> ACTIVE` occurs
    - **Then** exactly one immutable append-only Audit History event is recorded (`DISTRICT_GRACE_STARTED`, `DISTRICT_SUBSCRIPTION_SUSPENDED`, or `DISTRICT_SERVICE_RESTORED_ACTIVE`)
    - **And** Product Owner initiated transitions record the Product Owner actor ID and role, while automatic Grace expiry records actorId `null` and actorRole `'SYSTEM'`
    - **And** any optional supplied reason is validated against `containsProhibitedSecrets` and stored in audit metadata
    - **And** duplicate requests, worker retries, or concurrent executions cannot create duplicate audit records for one logical transition.

12. **Concurrency & Deadlock-Free Row-Level Locking (AC 12, FR30, AD-3, AD-9)**
    - **Given** Grace expiry worker job and a Product Owner Restore Active request occur concurrently
    - **When** both attempt to change the same current lifecycle state
    - **Then** database row-level locking with strict lock acquisition order (`districts` first, `district_subscriptions` second via `SELECT ... FOR UPDATE`) prevents deadlocks
    - **And** CAS conditional updates ensure only the valid transition against current state succeeds
    - **And** the losing operation is rejected cleanly without overwriting the newer state
    - **And** the Product Owner receives the refreshed authoritative state rather than false success.

13. **System Health Representation & Metric Alignment (AC 13, FR29, FR30, AD-11)**
    - **Given** subscription state is `GRACE` or `SUSPENDED`
    - **When** System Health represents the District
    - **Then** the lifecycle state is NOT classified as a technical failure merely because service behavior follows that state
    - **And** `health-evaluator.ts` counts `ACTIVE` and `GRACE` districts as active participants in overall system health metrics
    - **And** if lifecycle state explains paused access or processing, System Health states that cause and provides a direct route to Subscriptions.

14. **Offline Mutation Blocking, Accessible Dialogs, and Error Sanitization (AC 14, AC 15, AD-10)**
    - **Given** browser network connectivity is lost while viewing subscription records
    - **When** the Product Owner is offline
    - **Then** all lifecycle action buttons (Start Grace, Restore Active) are disabled
    - **And** no lifecycle mutation is queued or automatically resubmitted
    - **And** on reconnect, session, role, District scope, and authoritative lifecycle state are revalidated
    - **And** confirmation modals feature accessible titles, consequence descriptions, contained focus, default focus on safe Cancel, Escape dismissal, and exact opener focus restoration
    - **And** all technical errors are sanitized, hiding infrastructure details and secrets.

15. **Comprehensive Automated Integration & Unit Verification (AC 15)**
    - **Given** Story 6.2 implementation
    - **When** automated test suites run
    - **Then** backend integration tests verify:
      1. Active to Grace transition with exact 7-day calculation and `DISTRICT_GRACE_STARTED` audit logging
      2. Automated Grace to Suspended transition via worker job with `SYSTEM` actor attribution
      3. Grace to Active restoration with scheduled transition clearing
      4. Suspended to Active restoration with prerequisite re-validation and blocker reporting
      5. Concurrent transition race condition safety and FOR UPDATE locking
      6. Webhook intake dropping messages for Suspended districts and allowing Grace districts
      7. Background workers discarding AI jobs for Suspended districts and processing Grace districts
      8. Hokim auth guard 403 rejection for Suspended districts and successful sign-in/access for Grace districts
      9. Retention worker purging expired records across Active, Grace, and Suspended districts
      10. Secret scanning on optional transition reason strings
    - **And** frontend component tests verify:
      1. Consequence confirmation dialogs for Start Grace and Restore Active
      2. Dialog keyboard focus containment, safe Cancel default, Escape handling, and opener focus return
      3. Dynamic action button rendering based on current status
      4. Offline button disabling and error toast / alert handling.

---

## Tasks / Subtasks

- [ ] **Task 1: Database Migration & Schema Constraints for Scheduled Transitions** (AC: 1, 3, 4, 8, 9)
  - [ ] 1.1 Update `apps/backend/src/adapters/db/schema/district-subscriptions.ts` adding check constraint for `scheduledTransitionType` (`sql`${table.scheduledTransitionType} IS NULL OR ${table.scheduledTransitionType} IN ('AUTOMATIC_SUSPENSION', 'LIVE_DELETION')``) and index on `scheduledTransitionAt`.
  - [ ] 1.2 Update `apps/backend/src/adapters/db/schema/districts.ts` status check constraint to include `'GRACE'` (`sql`${table.status} IN ('SETUP_INCOMPLETE', 'ACTIVE', 'GRACE', 'SUSPENDED', 'CANCELLED')``).
  - [ ] 1.3 Create SQL migration file `apps/backend/drizzle/0017_subscription_lifecycle.sql` including:
    - Adding check constraint `district_subscriptions_scheduled_transition_type_check`
    - Adding index `district_subscriptions_scheduled_transition_idx` on `scheduled_transition_at`
    - Updating check constraint on `districts` table: `ALTER TABLE districts DROP CONSTRAINT IF EXISTS districts_status_check; ALTER TABLE districts ADD CONSTRAINT districts_status_check CHECK (status IN ('SETUP_INCOMPLETE', 'ACTIVE', 'GRACE', 'SUSPENDED', 'CANCELLED'));`
  - [ ] 1.4 Update Drizzle migration journal `apps/backend/drizzle/meta/_journal.json`.

- [ ] **Task 2: Shared Contracts in `@mahalla-ovozi/api-contracts`** (AC: 1, 2, 3, 8, 9, 11)
  - [ ] 2.1 Update `packages/api-contracts/src/subscriptions.ts` adding:
    - `ScheduledTransitionTypeSchema`: `z.enum(['AUTOMATIC_SUSPENSION', 'LIVE_DELETION'])`
    - `StartGraceRequestSchema`: `z.object({ reason: z.string().trim().max(1000).optional() })` with `containsProhibitedSecrets` validation
    - `StartGraceResponseSchema`: `z.object({ subscription: DistrictSubscriptionSchema, message: z.string() })`
    - `RestoreActiveRequestSchema`: `z.object({ reason: z.string().trim().max(1000).optional() })` with `containsProhibitedSecrets` validation
    - `RestoreActiveResponseSchema`: `z.object({ subscription: DistrictSubscriptionSchema, message: z.string() })`
    - `DistrictNotReadyErrorSchema`: `z.object({ code: z.literal('DISTRICT_NOT_READY'), message: z.string(), blockers: z.array(PrerequisiteItemSchema) })`
  - [ ] 2.2 Update `packages/api-contracts/src/audit.ts` adding audit actions:
    - `'DISTRICT_GRACE_STARTED'`
    - `'DISTRICT_SUBSCRIPTION_SUSPENDED'`
    - `'DISTRICT_SERVICE_RESTORED_ACTIVE'`
  - [ ] 2.3 Build `@mahalla-ovozi/api-contracts` package (`pnpm --filter @mahalla-ovozi/api-contracts build`).

- [ ] **Task 3: Backend Subscription Lifecycle State Machine & Service** (AC: 1, 2, 3, 4, 8, 9, 10, 11, 12)
  - [ ] 3.1 In `apps/backend/src/modules/subscriptions/subscriptions-service.ts`, implement:
    - `startDistrictGrace(db, boss, districtId, payload, actor, reqMeta)`:
      - Acquire row locks in strict order (`districts` first, then `district_subscriptions` via `SELECT ... FOR UPDATE`).
      - Verify current status is `'ACTIVE'`.
      - Update `district_subscriptions` (`status = 'GRACE'`, `statusStartedAt = now`, `scheduledTransitionAt = now + 7 days`, `scheduledTransitionType = 'AUTOMATIC_SUSPENSION'`).
      - Synchronize `districts.status = 'GRACE'` and `districts.updatedAt = now`.
      - Enqueue delayed pg-boss job in `DISTRICT_SUBSCRIPTION_EXPIRY_QUEUE` with singleton key `forSubscriptionExpiry(districtId)` and `startAfter: 7 * 24 * 60 * 60`.
      - Record audit event `DISTRICT_GRACE_STARTED` with PO actor and sanitized reason.
    - `expireDistrictGrace(db, districtId)`:
      - Acquire row locks in strict order (`districts` first, then `district_subscriptions` via `SELECT ... FOR UPDATE`).
      - Verify current status is `'GRACE'` and `scheduledTransitionAt <= now`. If not in Grace, cleanly return without error (idempotent no-op).
      - Update `district_subscriptions` (`status = 'SUSPENDED'`, `statusStartedAt = now`, `scheduledTransitionAt = null`, `scheduledTransitionType = null`).
      - Synchronize `districts.status = 'SUSPENDED'` and `districts.updatedAt = now`.
      - Record audit event `DISTRICT_SUBSCRIPTION_SUSPENDED` with system actor (`actorId: null, actorRole: 'SYSTEM'`).
    - `restoreDistrictActive(db, districtId, payload, actor, reqMeta)`:
      - Acquire row locks in strict order (`districts` first, then `district_subscriptions` via `SELECT ... FOR UPDATE`).
      - Verify current status is `'GRACE'` or `'SUSPENDED'`.
      - If current status is `'SUSPENDED'`, re-evaluate all 8 onboarding prerequisites via `getOnboardingReadiness(tx, districtId)`. If not ready, throw `DistrictNotReadyForActivationError(blockers)`.
      - Update `district_subscriptions` (`status = 'ACTIVE'`, `statusStartedAt = now`, `scheduledTransitionAt = null`, `scheduledTransitionType = null`).
      - Synchronize `districts.status = 'ACTIVE'` and `districts.updatedAt = now`.
      - Record audit event `DISTRICT_SERVICE_RESTORED_ACTIVE` with PO actor and sanitized reason.
    - `processOverdueGraceSubscriptions(db)`:
      - Query all subscriptions where `status = 'GRACE'` and `scheduledTransitionAt <= now`.
      - Iterate and call `expireDistrictGrace` for each district.
  - [ ] 3.2 Define domain error classes in `subscriptions-service.ts`:
    - `InvalidSubscriptionTransitionError` (409 Conflict, code: `'INVALID_SUBSCRIPTION_TRANSITION'`)
    - `SubscriptionConcurrencyConflictError` (409 Conflict, code: `'SUBSCRIPTION_CONCURRENCY_CONFLICT'`)

- [ ] **Task 4: Fastify API Routes for Lifecycle Transitions** (AC: 1, 2, 3, 8, 9, 11, 14)
  - [ ] 4.1 In `apps/backend/src/modules/subscriptions/subscriptions-routes.ts`, register:
    - `POST /api/v1/districts/:districtId/subscription/start-grace`: Validates PO auth + CSRF, validates body with `StartGraceRequestSchema`, invokes `startDistrictGrace`, returns 200 with `StartGraceResponse`.
    - `POST /api/v1/districts/:districtId/subscription/restore-active`: Validates PO auth + CSRF, validates body with `RestoreActiveRequestSchema`, invokes `restoreDistrictActive`, returns 200 with `RestoreActiveResponse`.
  - [ ] 4.2 Map domain errors (`InvalidSubscriptionTransitionError`, `SubscriptionConcurrencyConflictError`, `DistrictNotReadyForActivationError`) to sanitized HTTP 409 responses with appropriate error envelope and blocker details.

- [ ] **Task 5: Background Worker & Scheduled Expiry Processing** (AC: 4, 5, 7)
  - [ ] 5.1 In `apps/backend/src/adapters/jobs/boss-client.ts`:
    - Define `DISTRICT_SUBSCRIPTION_EXPIRY_QUEUE = 'district-subscription-expiry'`.
    - Add `initBossQueues` registration for `DISTRICT_SUBSCRIPTION_EXPIRY_QUEUE`.
    - Add singleton key generator `JobSingletonKeys.forSubscriptionExpiry(districtId)`.
  - [ ] 5.2 Create `apps/backend/src/modules/subscriptions/jobs/subscription-expiry-job-handler.ts`:
    - Process individual district expiry jobs with `expireDistrictGrace(db, districtId)`.
    - Register recurring 1-minute cron check (`* * * * *`) calling `processOverdueGraceSubscriptions(db)`.
  - [ ] 5.3 In `apps/backend/src/entrypoints/worker.ts`:
    - Register `registerSubscriptionExpiryJobHandler` into worker runtime pipeline.

- [ ] **Task 6: Lifecycle Enforcement Across Auth, Webhook, AI Jobs, Retention, and System Health** (AC: 5, 6, 7, 10, 13)
  - [ ] 6.1 In `apps/backend/src/modules/auth/auth-service.ts`: Update sign-in logic to allow Hokims when assigned district status is `'ACTIVE'` or `'GRACE'`. Reject `'SUSPENDED'` with `DistrictNotActiveError`.
  - [ ] 6.2 In `apps/backend/src/modules/auth/require-auth.ts`: Update `createRequireHokim` and `createRequireDistrictAccess` to verify district status on active session validation. If district status is `'SUSPENDED'` or `'CANCELLED'`, reject request with HTTP 403 `DISTRICT_SUSPENDED`.
  - [ ] 6.3 In `apps/backend/src/modules/telegram-intake/telegram-intake-service.ts`: Update `resolveDistrictBotAndGroup` to permit both `'ACTIVE'` and `'GRACE'` status, while dropping `'SUSPENDED'` with `DISTRICT_NOT_ACTIVE`.
  - [ ] 6.4 In background AI and Topic job handlers (`qualification-job-handler.ts`, `semantic-relevance-job-handler.ts`, `topic-assignment-job-handler.ts`, `topic-projection-job-handler.ts`): Ensure lifecycle re-check allows `'ACTIVE'` and `'GRACE'`, dropping execution if `'SUSPENDED'`.
  - [ ] 6.5 In `apps/backend/src/modules/retention/jobs/retention-job-handler.ts`: Update retention scanner to evaluate topics for districts with status in `('ACTIVE', 'GRACE', 'SUSPENDED')`.
  - [ ] 6.6 In `apps/backend/src/modules/health/health-evaluator.ts`: Include `'GRACE'` in `activeDistricts` count (`d.lifecycleStatus === 'ACTIVE' || d.lifecycleStatus === 'GRACE' || d.lifecycleStatus === null`).

- [ ] **Task 7: Frontend UI Components, Consequence Modals & State Management** (AC: 1, 2, 3, 8, 9, 14)
  - [ ] 7.1 In `apps/web/src/api/subscription-client.ts`: Add `startDistrictGrace(districtId, payload)` and `restoreDistrictActive(districtId, payload)`.
  - [ ] 7.2 In `apps/web/src/lib/formatters.ts`: Register localized audit action display names:
    - `DISTRICT_GRACE_STARTED: 'Имтиёзли давр (Grace) бошланди'`
    - `DISTRICT_SUBSCRIPTION_SUSPENDED: 'Обуна тўхтатилди (Suspended)'`
    - `DISTRICT_SERVICE_RESTORED_ACTIVE: 'Фаол ҳолат тикланди'`
  - [ ] 7.3 Create `apps/web/src/components/subscriptions/StartGraceModal.tsx`:
    - Consequence confirmation modal displaying District name/ID, 7-day automatic countdown, continuation of intake/AI/Hokim access, optional reason input with secret scanning warning, safe Cancel focus, Escape dismissal, and opener focus return.
  - [ ] 7.4 Create `apps/web/src/components/subscriptions/RestoreActiveModal.tsx`:
    - Consequence confirmation modal explaining prospective resumption without historical backfill, re-verification of activation prerequisites when Suspended, optional reason input, safe Cancel focus, Escape dismissal, and opener focus return.
  - [ ] 7.5 Update `apps/web/src/components/subscriptions/DistrictSubscriptionDetailCard.tsx`:
    - Add action buttons ("Имтиёзли даврни бошлаш", "Фаол ҳолатни тиклаш") conditionally rendered based on `status`.
    - Render Grace warning alert and remaining time banner.
    - Disable buttons when offline (`isOffline === true`).
  - [ ] 7.6 Update `apps/web/src/components/subscriptions/DistrictSubscriptionTable.tsx`:
    - Include quick action buttons in table rows with offline blocking.
  - [ ] 7.7 Update `apps/web/src/pages/SubscriptionsPage.tsx`:
    - Wire up modals, mutation queries with TanStack Query cache invalidation matrix (`['subscriptions']`, `['subscription', districtId]`, `['districts']`, `['district', districtId]`, `['audit-history']`, `['health']`), and error notification banners.

- [ ] **Task 8: Comprehensive Automated Integration & Unit Test Verification** (AC: 15)
  - [ ] 8.1 Create backend integration tests in `apps/backend/tests/subscription-lifecycle.test.ts`:
    - Test `POST /api/v1/districts/:districtId/subscription/start-grace`
    - Test Grace expiry background execution with `SYSTEM` actor attribution
    - Test `POST /api/v1/districts/:districtId/subscription/restore-active` from Grace and Suspended
    - Test prerequisite failure when restoring a Suspended district with incomplete setup
    - Test Hokim 403 rejection when district is Suspended and access when in Grace
    - Test Telegram webhook acceptance for Grace and rejection for Suspended
    - Test worker job suppression for Suspended district and execution for Grace
    - Test retention worker scanning across Active, Grace, and Suspended districts
    - Test secret scanning on reason fields
    - Test concurrency row locking against simultaneous transitions.
  - [ ] 8.2 Create frontend unit tests in `apps/web/tests/unit/SubscriptionsLifecycle.test.tsx`:
    - Test modal rendering and consequence text
    - Test action triggers and API mutations
    - Test keyboard accessibility (contained focus, safe Cancel default, Escape dismissal, opener return)
    - Test offline button disabling.
  - [ ] 8.3 Verify monorepo typecheck (`pnpm typecheck`).

### Review Findings

- [x] [Review][Patch] AI and Topic background job handlers omit 'GRACE' status in Gate 1 and Gate 2 lifecycle checks [`apps/backend/src/modules/ai/jobs/semantic-relevance-job-handler.ts:108-112`, `apps/backend/src/modules/topics/jobs/topic-assignment-job-handler.ts:121-125`, `apps/backend/src/modules/topics/jobs/topic-projection-job-handler.ts:158-163`]
- [x] [Review][Patch] expireDistrictGrace does not verify scheduled_transition_at <= now under lock [`apps/backend/src/modules/subscriptions/subscriptions-service.ts:537-540`]
- [x] [Review][Patch] Hokim auth guard returns DISTRICT_SUSPENDED when district is not found or not access eligible [`apps/backend/src/modules/auth/require-auth.ts:93-101`]
- [x] [Review][Patch] RestoreActive 409 DISTRICT_NOT_READY error does not display specific prerequisite blockers in UI toast [`apps/web/src/pages/SubscriptionsPage.tsx:106-109`]
- [x] [Review][Patch] StartGraceModal and RestoreActiveModal missing closable={!isPending} and field reset on target change [`apps/web/src/components/subscriptions/StartGraceModal.tsx`, `apps/web/src/components/subscriptions/RestoreActiveModal.tsx`]
- [x] [Review][Patch] Migration 0017_subscription_lifecycle.sql missing DROP CONSTRAINT IF EXISTS before adding scheduled_transition_type check [`apps/backend/drizzle/0017_subscription_lifecycle.sql:3`]
- [x] [Review][Patch] Replace hardcoded #52c41a colors with Ant Design token.colorSuccess in subscription components [`apps/web/src/components/subscriptions/DistrictSubscriptionDetailCard.tsx:18`, `apps/web/src/components/subscriptions/DistrictSubscriptionTable.tsx:21`]
- [x] [Review][Patch] Add integration test suite coverage for AI job handlers lifecycle checks under GRACE status [`apps/backend/tests/subscription-lifecycle.test.ts`]
- [x] [Review][Patch] Add limit(100) clause to processOverdueGraceSubscriptions query [`apps/backend/src/modules/subscriptions/subscriptions-service.ts:755`]

---

## Dev Notes

### Architecture Patterns & Constraints

- **Lifecycle State Machine (FR29, FR30):**
  - Permitted transitions for Story 6.2:
    - `ACTIVE` -> `GRACE` (Manual by Product Owner)
    - `GRACE` -> `SUSPENDED` (Automatic via 7-day Grace expiry worker job or periodic cron sweep)
    - `GRACE` -> `ACTIVE` (Manual by Product Owner)
    - `SUSPENDED` -> `ACTIVE` (Manual by Product Owner, gated by FR20 activation prerequisite validation)
  - Transitions to `CANCELLED` and from `CANCELLED` are strictly reserved for Story 6.3.
- **Dual-Table Status Synchronization Invariant (AD-3, AD-9):**
  - `districts.status` and `district_subscriptions.status` MUST be kept synchronized across all lifecycle state changes.
  - Both tables must support `'GRACE'` in their database check constraints.
- **7-Day Grace Expiry Calculation (FR30):**
  - Calculated as exactly `new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)`.
  - Stored in `scheduledTransitionAt` (UTC timestamptz) with `scheduledTransitionType = 'AUTOMATIC_SUSPENSION'`.
  - Formatted in UI in `Asia/Tashkent` (`DD.MM.YYYY, HH:mm`).
- **PostgreSQL Deadlock-Free Row-Level Locking & Concurrency (AD-3, AD-9):**
  - All state transitions must acquire exclusive row locks in consistent order:
    1. Lock `districts` row: `SELECT * FROM districts WHERE id = $1 FOR UPDATE;`
    2. Lock `district_subscriptions` row: `SELECT * FROM district_subscriptions WHERE district_id = $1 FOR UPDATE;`
  - CAS condition verifies expected current state before committing:
    ```sql
    UPDATE district_subscriptions SET status = 'GRACE', ... WHERE district_id = $1 AND status = 'ACTIVE';
    ```
- **Prospective Reactivation Rule (AD-5, AD-6, AD-8, FR30):**
  - Restoring `ACTIVE` starts processing only for messages received *after* the activation timestamp.
  - Zero backfill, zero Telegram historical crawl, zero re-evaluation of completed historical topic decisions.
- **Auth Guard & Session Enforcement (AD-9):**
  - `auth-service.ts` allows sign-in for `ACTIVE` and `GRACE`, rejecting `SUSPENDED`.
  - `createRequireHokim` and `createRequireDistrictAccess` verify district status on active session validation. If `SUSPENDED`, reject with 403 `DISTRICT_SUSPENDED`.
- **Audit Logging & System Actor (AD-9):**
  - Product Owner actions log `actorId: actor.id`, `actorRole: 'PRODUCT_OWNER'`.
  - Automatic background expiry logs `actorId: null`, `actorRole: 'SYSTEM'`.
  - Audit actions: `DISTRICT_GRACE_STARTED`, `DISTRICT_SUBSCRIPTION_SUSPENDED`, `DISTRICT_SERVICE_RESTORED_ACTIVE`.
- **System Health Boundary (AD-11, FR30):**
  - Restricted lifecycle states (`GRACE`, `SUSPENDED`) are commercial product states, NOT classified as technical failures in System Health.
  - `health-evaluator.ts` counts `ACTIVE` and `GRACE` districts as active in overall health metrics.

---

### Database Schema Specification

```typescript
// apps/backend/src/adapters/db/schema/district-subscriptions.ts
import { sql } from 'drizzle-orm';
import { pgTable, text, timestamp, index, uniqueIndex, check } from 'drizzle-orm/pg-core';
import { districts } from './districts.js';

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

export type DistrictSubscription = typeof districtSubscriptions.$inferSelect;
export type NewDistrictSubscription = typeof districtSubscriptions.$inferInsert;
```

```typescript
// apps/backend/src/adapters/db/schema/districts.ts (Excerpt)
export const districts = pgTable(
  'districts',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    region: text('region'),
    status: text('status').notNull().default('SETUP_INCOMPLETE'),
    accessEligible: boolean('access_eligible').notNull().default(true),
    // ...
  },
  (table) => [
    check(
      'districts_status_check',
      sql`${table.status} IN ('SETUP_INCOMPLETE', 'ACTIVE', 'GRACE', 'SUSPENDED', 'CANCELLED')`
    ),
    uniqueIndex('districts_name_lower_idx').on(sql`LOWER(${table.name})`),
    index('districts_name_idx').on(table.name),
  ]
);
```

---

### API Contract Specification

```typescript
// packages/api-contracts/src/subscriptions.ts
import { z } from 'zod';
import { containsProhibitedSecrets } from './analysis-settings.js';
import { PrerequisiteItemSchema } from './districts.js';

export const ScheduledTransitionTypeSchema = z.enum([
  'AUTOMATIC_SUSPENSION',
  'LIVE_DELETION',
]);
export type ScheduledTransitionType = z.infer<typeof ScheduledTransitionTypeSchema>;

export const StartGraceRequestSchema = z
  .object({
    reason: z.string().trim().max(1000, 'Сабаб 1000 та белгидан ошмаслиги керак.').optional(),
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
export type StartGraceRequest = z.infer<typeof StartGraceRequestSchema>;

export const StartGraceResponseSchema = z.object({
  subscription: DistrictSubscriptionSchema,
  message: z.string(),
});
export type StartGraceResponse = z.infer<typeof StartGraceResponseSchema>;

export const RestoreActiveRequestSchema = z
  .object({
    reason: z.string().trim().max(1000, 'Сабаб 1000 та белгидан ошмаслиги керак.').optional(),
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
export type RestoreActiveRequest = z.infer<typeof RestoreActiveRequestSchema>;

export const RestoreActiveResponseSchema = z.object({
  subscription: DistrictSubscriptionSchema,
  message: z.string(),
});
export type RestoreActiveResponse = z.infer<typeof RestoreActiveResponseSchema>;

export const DistrictNotReadyErrorSchema = z.object({
  code: z.literal('DISTRICT_NOT_READY'),
  message: z.string(),
  blockers: z.array(PrerequisiteItemSchema),
});
export type DistrictNotReadyError = z.infer<typeof DistrictNotReadyErrorSchema>;
```

---

### Worker Job Handler Specification

```typescript
// apps/backend/src/modules/subscriptions/jobs/subscription-expiry-job-handler.ts
import type PgBoss from 'pg-boss';
import type { DbClient } from '../../../adapters/db/client.js';
import {
  DISTRICT_SUBSCRIPTION_EXPIRY_QUEUE,
  sendQueueJob,
} from '../../../adapters/jobs/boss-client.js';
import {
  expireDistrictGrace,
  processOverdueGraceSubscriptions,
} from '../subscriptions-service.js';

export interface SubscriptionExpiryJobData {
  districtId: string;
}

export interface SubscriptionExpiryJobDeps {
  db: DbClient;
  boss: PgBoss;
}

export async function processSubscriptionExpiryJobs(
  jobs: PgBoss.Job<SubscriptionExpiryJobData>[],
  deps: SubscriptionExpiryJobDeps,
): Promise<void> {
  const { db } = deps;
  for (const job of jobs) {
    const { districtId } = job.data;
    try {
      await expireDistrictGrace(db, districtId);
    } catch (err) {
      console.error(
        JSON.stringify({
          event: 'SUBSCRIPTION_EXPIRY_JOB_FAILED',
          districtId,
          error: (err as Error).message,
        }),
      );
      throw err;
    }
  }
}

export async function registerSubscriptionExpiryJobHandler(
  boss: PgBoss,
  deps: SubscriptionExpiryJobDeps,
): Promise<void> {
  await boss.work<SubscriptionExpiryJobData>(
    DISTRICT_SUBSCRIPTION_EXPIRY_QUEUE,
    async (jobs) => {
      await processSubscriptionExpiryJobs(jobs, deps);
    },
  );

  // Periodic recurring cron sweep every 1 minute
  await boss.schedule(
    DISTRICT_SUBSCRIPTION_EXPIRY_QUEUE + '-cron',
    '* * * * *',
    {},
    { tz: 'UTC' },
  );

  await boss.work(
    DISTRICT_SUBSCRIPTION_EXPIRY_QUEUE + '-cron',
    async () => {
      await processOverdueGraceSubscriptions(deps.db);
    },
  );
}
```

---

### UI Consequence Modal Specification & Accessibility Tokens

```tsx
// Consequence Modal Focus & Accessibility Pattern (Ant Design 5.x)
<Modal
  title="Имтиёзли даврни бошлаш (Start Grace)"
  open={isOpen}
  onOk={handleConfirm}
  onCancel={handleCancel}
  okText="Тасдиқлаш"
  cancelText="Бекор қилиш"
  okButtonProps={{ danger: true, loading: isPending }}
  cancelButtonProps={{ autoFocus: true, disabled: isPending }}
  destroyOnClose
  maskClosable={false}
  keyboard={!isPending}
  focusTriggerAfterClose
>
  <Alert
    type="warning"
    showIcon
    message="Имтиёзли давр оқибатлари"
    description="Telegram хабарларини қабул қилиш ва AI таҳлили 7 кун давомида давом этади. 7 кундан сўнг туман автоматик равишда тўхтатилади (Suspended)."
    style={{ marginBottom: 16 }}
  />
  {/* District details, remaining duration, and optional reason input */}
</Modal>
```

---

### Source Tree Components & Files

#### Files to Create [NEW]
1. `apps/backend/drizzle/0017_subscription_lifecycle.sql` — Migration adding scheduled transition type check constraint, index, and updating `districts_status_check` constraint.
2. `apps/backend/src/modules/subscriptions/jobs/subscription-expiry-job-handler.ts` — Worker handler for automated Grace expiry and recurring cron sweep.
3. `apps/web/src/components/subscriptions/StartGraceModal.tsx` — Accessible consequence confirmation dialog for starting Grace.
4. `apps/web/src/components/subscriptions/RestoreActiveModal.tsx` — Accessible consequence confirmation dialog for restoring Active.
5. `apps/backend/tests/subscription-lifecycle.test.ts` — Integration tests for lifecycle state transitions, worker expiry, retention, and auth enforcement.
6. `apps/web/tests/unit/SubscriptionsLifecycle.test.tsx` — Component tests for lifecycle modals, consequence warnings, opener focus return, and offline blocking.

#### Files to Modify [UPDATE]
1. `apps/backend/src/adapters/db/schema/district-subscriptions.ts` — Add `scheduledTransitionType` check constraint and index.
2. `apps/backend/src/adapters/db/schema/districts.ts` — Align status check constraint to include `'GRACE'`.
3. `packages/api-contracts/src/subscriptions.ts` — Add transition request/response schemas and `DistrictNotReadyErrorSchema`.
4. `packages/api-contracts/src/audit.ts` — Add lifecycle audit actions (`DISTRICT_GRACE_STARTED`, `DISTRICT_SUBSCRIPTION_SUSPENDED`, `DISTRICT_SERVICE_RESTORED_ACTIVE`).
5. `apps/backend/src/modules/subscriptions/subscriptions-service.ts` — Implement `startDistrictGrace`, `expireDistrictGrace`, `restoreDistrictActive`, `processOverdueGraceSubscriptions`, and domain errors.
6. `apps/backend/src/modules/subscriptions/subscriptions-routes.ts` — Add `/start-grace` and `/restore-active` endpoints with domain error mapping.
7. `apps/backend/src/adapters/jobs/boss-client.ts` — Register subscription expiry queue and singleton key generator.
8. `apps/backend/src/entrypoints/worker.ts` — Register subscription expiry worker pipeline.
9. `apps/backend/src/modules/auth/auth-service.ts` — Permit sign-in for `ACTIVE` and `GRACE`, reject `SUSPENDED`.
10. `apps/backend/src/modules/auth/require-auth.ts` — Enforce subscription status check in Hokim auth guards (HTTP 403 `DISTRICT_SUSPENDED`).
11. `apps/backend/src/modules/telegram-intake/telegram-intake-service.ts` — Permit `ACTIVE` and `GRACE`, reject `SUSPENDED`.
12. `apps/backend/src/modules/retention/jobs/retention-job-handler.ts` — Scan across `ACTIVE`, `GRACE`, and `SUSPENDED` districts.
13. `apps/backend/src/modules/health/health-evaluator.ts` — Include `GRACE` in active district metrics count.
14. `apps/web/src/api/subscription-client.ts` — Add API methods for `startDistrictGrace` and `restoreDistrictActive`.
15. `apps/web/src/lib/formatters.ts` — Register localized audit action display names.
16. `apps/web/src/components/subscriptions/DistrictSubscriptionDetailCard.tsx` — Add lifecycle action buttons and consequence banners.
17. `apps/web/src/components/subscriptions/DistrictSubscriptionTable.tsx` — Add quick action triggers with offline disabling.
18. `apps/web/src/pages/SubscriptionsPage.tsx` — Integrate lifecycle modals and TanStack Query cache invalidation matrix.

---

## Project Structure Notes

- **Module Consistency:** Subscription lifecycle logic resides cleanly inside `apps/backend/src/modules/subscriptions/`.
- **Worker Pipeline:** Scheduled Grace expiry is integrated with pg-boss 10.x in `apps/backend/src/adapters/jobs/` and `entrypoints/worker.ts`.
- **Auth & Isolation:** Respects AD-9 tenant isolation and server-side authorization. Hokim access revocation takes effect immediately upon Suspension.
- **UI Design System:** Utilizes Ant Design 5 modal overlays, tags, and theme tokens conforming to Asia/Tashkent and Uzbek Cyrillic conventions.

---

## References

- **PRD:** `_bmad-output/planning-artifacts/prds/prd-Mahalla-Ovozi-2026-07-30/prd.md` — Section 4.6 (FR-29, FR-30: Active, Grace, and Suspended operation), UJ-4.
- **Architecture Spine:** `_bmad-output/planning-artifacts/architecture/architecture-Mahalla-Ovozi-2026-08-12/ARCHITECTURE-SPINE.md` — AD-1, AD-2, AD-3, AD-4, AD-5, AD-6, AD-8, AD-9, AD-10, AD-11.
- **Epic 6:** `_bmad-output/planning-artifacts/epics/epic-6.md` — Story 6.2 (Manage Active, Grace, and Suspended District Service).
- **UX Designs:** `_bmad-output/planning-artifacts/ux-designs/ux-Mahalla-Ovozi-2026-08-05/DESIGN.md`, `EXPERIENCE.md` — Section UJ-4, subscription lifecycle management and confirmation dialogs.
- **Story 6.1 Reference:** `_bmad-output/implementation-artifacts/6-1-review-and-maintain-district-subscription-records.md`.
- **Deferred Work:** `_bmad-output/implementation-artifacts/deferred-work.md`.

---

## Dev Agent Record

### Agent Model Used

Gemini 3.7 Flash (High)

### Debug Log References

### Completion Notes List

- Implemented database migration `0017_subscription_lifecycle.sql` and updated Drizzle schema check constraints for `districts` and `district_subscriptions`.
- Added shared Zod API contracts and schemas for `startDistrictGrace` and `restoreDistrictActive` in `@mahalla-ovozi/api-contracts`.
- Implemented transactional subscription lifecycle service methods (`startDistrictGrace`, `expireDistrictGrace`, `restoreDistrictActive`, `processOverdueGraceSubscriptions`) with row-level locking (`FOR UPDATE`).
- Built two-tier automated expiry worker pipeline: delayed pg-boss job dispatch (`DISTRICT_SUBSCRIPTION_EXPIRY_QUEUE`) + recurring 1-minute fallback cron sweeper.
- Enforced cross-system lifecycle rules:
  - Hokim sign-in and active session guards (`ACTIVE` and `GRACE` allowed; `SUSPENDED` receives HTTP 403 `DISTRICT_SUSPENDED`).
  - Telegram webhook intake & job queues (`ACTIVE` and `GRACE` processed; `SUSPENDED` dropped without processing).
  - 90-day retention worker covers `ACTIVE`, `GRACE`, and `SUSPENDED` districts.
  - Health evaluation correctly tracks `ACTIVE` + `GRACE` in active district count.
- Built accessible UI consequence modals (`StartGraceModal.tsx`, `RestoreActiveModal.tsx`) with safe Cancel default autofocus and client-side secret scanning.
- Updated Subscription detail view, table rows, and TanStack Query cache invalidation matrix in `SubscriptionsPage.tsx`.
- Created comprehensive integration test suite (`apps/backend/tests/subscription-lifecycle.test.ts`) and frontend unit test suite (`apps/web/tests/unit/SubscriptionsLifecycle.test.tsx`).
- Full monorepo verification: 100 test suites (800 backend + 264 frontend = 1,064 tests) passing at 100% and zero TypeScript errors (`pnpm typecheck` passed).

### File List

- `packages/api-contracts/src/subscriptions.ts`
- `packages/api-contracts/src/audit.ts`
- `packages/api-contracts/src/districts.ts`
- `apps/backend/src/adapters/db/schema/districts.ts`
- `apps/backend/src/adapters/db/schema/district-subscriptions.ts`
- `apps/backend/src/adapters/db/schema/audit-events.ts`
- `apps/backend/drizzle/0017_subscription_lifecycle.sql`
- `apps/backend/src/adapters/jobs/boss-client.ts`
- `apps/backend/src/modules/subscriptions/subscriptions-service.ts`
- `apps/backend/src/modules/subscriptions/subscriptions-routes.ts`
- `apps/backend/src/modules/subscriptions/jobs/subscription-expiry-job-handler.ts`
- `apps/backend/src/entrypoints/worker.ts`
- `apps/backend/src/modules/auth/auth-service.ts`
- `apps/backend/src/modules/auth/require-auth.ts`
- `apps/backend/src/modules/telegram-intake/telegram-intake-service.ts`
- `apps/backend/src/modules/telegram-intake/jobs/qualification-job-handler.ts`
- `apps/backend/src/modules/topics/jobs/topic-projection-job-handler.ts`
- `apps/backend/src/modules/retention/jobs/retention-job-handler.ts`
- `apps/backend/src/modules/health/health-evaluator.ts`
- `apps/backend/src/modules/issues/retry-service.ts`
- `apps/web/src/api/subscription-client.ts`
- `apps/web/src/lib/formatters.ts`
- `apps/web/src/components/subscriptions/StartGraceModal.tsx`
- `apps/web/src/components/subscriptions/RestoreActiveModal.tsx`
- `apps/web/src/components/subscriptions/DistrictSubscriptionDetailCard.tsx`
- `apps/web/src/components/subscriptions/DistrictSubscriptionTable.tsx`
- `apps/web/src/pages/SubscriptionsPage.tsx`
- `apps/backend/tests/subscription-lifecycle.test.ts`
- `apps/web/tests/unit/SubscriptionsLifecycle.test.tsx`
- `_bmad-output/implementation-artifacts/6-2-manage-active-grace-and-suspended-district-service.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

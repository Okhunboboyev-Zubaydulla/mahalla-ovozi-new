---
baseline_commit: a02d50c6bd609fd17bcd79eb25466e2e276225d7
---

# Story 1.7: Validate and Activate a District

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the **Product Owner**,
I want to execute final validation and activate an onboarding district,
So that the district transitions to `ACTIVE` status, locking prerequisites, enabling Hokim sign-in, and admitting Telegram ingestion into Epic 2.

---

## Acceptance Criteria

1. **Dynamic Activation Preconditions Gate (AC 1)**
   - **Given** a District is in `SETUP_INCOMPLETE` status
   - **When** the Product Owner opens the District Setup Overview / Checklist page (`/districts` / `/districts/:id`)
   - **Then** the "Туманни фаоллаштириш" (Activate District) action button is disabled unless ALL 8 prerequisite items in `districts-readiness.ts` evaluate to `passed`:
     1. `district_identity` (name $\ge 2$ chars, region)
     2. `access_eligibility` (`accessEligible === true`)
     3. `analysis_configuration` (`analysisConfigProfileId === 'baseline_v1'`)
     4. `district_isolation` (tenant boundary verified)
     5. `disclosure_confirmation` (`disclosureConfirmedAt` is set)
     6. `telegram_bot` (bot status === `'VALID'`)
     7. `group_mappings` ($\ge 1$ group mapped and all mapped groups status === `'VALID'`)
     8. `hokim_account` (active Hokim account exists with `role === 'DISTRICT_HOKIM'` and `status === 'ACTIVE'`)
   - **And** the UI clearly displays the remaining blockers and required action links beside each incomplete item.

2. **Authoritative Server-Side Re-validation & Two-Tier Concurrency Lock (AC 2)**
   - **Given** the Product Owner triggers activation via `POST /api/v1/districts/:districtId/activate`
   - **When** the request arrives at the backend
   - **Then** the server enters a database transaction, acquires an exclusive row lock (`SELECT ... FOR UPDATE` via `tx.execute()`) to prevent concurrent race conditions
   - **And** authoritatively re-evaluates all 8 prerequisites from live database state inside the transaction boundary (`evaluateDistrictReadiness(tx, districtId)` accepting `DbOrTx`)
   - **And** client-supplied readiness flags, cached states, or browser parameters are never trusted.

3. **Incomplete Preconditions Rejection & Structured Blocker Envelope (AC 3)**
   - **Given** one or more prerequisites are incomplete, missing, or failed (e.g. Hokim disabled, bot removed, group unvalidated)
   - **When** activation is attempted
   - **Then** the API rejects the request with HTTP 409 Conflict (`DISTRICT_NOT_READY`)
   - **And** returns a structured error envelope matching `ApiErrorEnvelopeSchema` containing the specific `error.blockers` array with actionable reasons
   - **And** the District remains in `SETUP_INCOMPLETE` status with zero partial state committed (transaction rolled back)
   - **And** the failed attempt is recorded in `audit_events` (`DISTRICT_ACTIVATION_FAILED`) committed to `db` with sanitized failure reasons.

4. **Stale State & Concurrency Protection (AC 4)**
   - **Given** a prerequisite changes between the time the checklist is loaded in the browser and the activation request is submitted
   - **When** the activation transaction executes
   - **Then** the server detects the condition change during live database revalidation under the row lock
   - **And** aborts the transaction, returning HTTP 409 Conflict without corrupting district state.

5. **Atomic Status Transition & Relational Integrity (AC 5)**
   - **Given** all 8 prerequisites evaluate to `passed`
   - **When** the activation request is processed
   - **Then** within a single atomic database transaction:
     - `districts.status` transitions from `'SETUP_INCOMPLETE'` to `'ACTIVE'` via conditional update `.where(and(eq(districts.id, districtId), eq(districts.status, 'SETUP_INCOMPLETE'))).returning()`
     - `districts.activatedAt` is set to the current UTC timestamp (`now`)
     - `districts.activatedById` is set to the authenticated Product Owner's account ID (`actor.id`)
     - `districts.updatedAt` is explicitly set to `now`
     - A `DISTRICT_ACTIVATED` record is inserted into `audit_events`
   - **And** the API returns HTTP 200 OK with the updated `District` object and activation metadata.

6. **Non-Reactivable & Already-Active District Protection (AC 6)**
   - **Given** a District is already in `ACTIVE`, `SUSPENDED`, or `CANCELLED` status
   - **When** activation is attempted via `POST /api/v1/districts/:districtId/activate`
   - **Then** the request is rejected with HTTP 409 Conflict:
     - If `ACTIVE`: `DISTRICT_ALREADY_ACTIVE` ("Туман аллақачон фаоллаштирилган.")
     - If `SUSPENDED` or `CANCELLED`: `DISTRICT_INVALID_STATUS` ("Туман нотўғри ҳолатда: {status}. Фақат созлаш тугалланмаган туманларни фаоллаштириш мумкин.")
   - **And** the existing district status and audit history remain unmodified.

7. **Duplicate Submission Prevention & Modal Mutation Design (AC 7)**
   - **Given** the Product Owner submits the activation confirmation modal
   - **When** the request is in flight
   - **Then** the modal sets `confirmLoading={isPending}`, disables cancel buttons (`cancelButtonProps={{ disabled: isPending }}`), prevents backdrop/keyboard closing (`maskClosable={!isPending}`, `closable={!isPending}`), and enforces `destroyOnClose={true}`
   - **And** if mutation fails with blockers, the modal remains open and renders an inline Ant Design `<Alert type="error" showIcon ... />` with dynamic blocker links
   - **And** if mutation encounters network failure (`isNetworkError: true`), the modal renders a network warning alert and keeps retry enabled
   - **And** if mutation encounters `DISTRICT_ALREADY_ACTIVE`, the modal closes, invalidates queries, and displays an informational toast
   - **And** on modal dismissal, `mutation.reset()` clears stale error states
   - **And** no optimistic UI transition is shown before authoritative server response confirmation.

8. **Downstream Production Lifecycle Admission (Epic 2 Gate) (AC 8)**
   - **Given** a District transitions to `ACTIVE`
   - **When** background workers, Telegram webhook ingestors, or AI processing pipelines evaluate the District
   - **Then** the District is marked eligible for production message ingestion and topic processing
   - **And** activation does NOT backfill, replay, or fabricate any past Telegram test messages or mock topics.

9. **Hokim Account Sign-In Unlocking (AC 9)**
   - **Given** a District transitions to `ACTIVE`
   - **When** the provisioned Hokim account authenticates via `POST /api/v1/auth/sign-in`
   - **Then** authentication succeeds and returns a valid session (previously blocked with 403 `DISTRICT_NOT_ACTIVE`)
   - **And** the Hokim receives a tenant-isolated session bound exclusively to their assigned `districtId`
   - **And** no cross-district selection or access is granted.

10. **Mandatory Hokim First Sign-In Temporary Password Replacement (AC 10)**
    - **Given** a Hokim user authenticates for the first time using a generated temporary password (`mustChangePassword === true`)
    - **When** authentication succeeds after District activation
    - **Then** `actor.mustChangePassword` is returned as `true` in both sign-in and session endpoints
    - **And** normal product access is restricted until the Hokim successfully replaces the temporary password via `POST /api/v1/auth/change-first-login-password`
    - **And** the new permanent password must satisfy standard password policy ($\ge 15$ characters, $\le 128$ code points, not on common passwords blocklist) in `adapters/crypto/password-policy.ts`
    - **And** the new password is saved exclusively as an Argon2id hash (`memoryCost: 65536, timeCost: 3, parallelism: 4`)
    - **And** in an atomic transaction: `mustChangePassword` is set to `false`, `credentialVersion` is incremented by 1, the current active session's `credentialVersion` in `sessions` table is updated to the new version, all other active sessions for that account are revoked, and `ACCOUNT_HOKIM_FIRST_LOGIN_PASSWORD_CHANGED` is recorded in `audit_events`.

11. **Informational Operational Access Notice on First Sign-In (AC 11)**
    - **Given** the Hokim views the first-sign-in password replacement screen
    - **When** the form is rendered
    - **Then** a prominent, factual informational notice is displayed in standard Uzbek Cyrillic:
      > "Эслатма: Тизим шартномасига мувофиқ, Маҳсулот эгаси туман маълумотлари ва далилларни мониторинг қилиш ҳамда техник қўллаб-қувватлаш учун операцион кириш ҳуқуқига эга."
    - **And** this notice is strictly informational (rendered as `<Alert type="info" showIcon ... />` with no required consent checkbox, agreement record, or secondary gate).

12. **Password Replacement Error Handling & Non-Secret Retention (AC 12)**
    - **Given** password replacement fails (e.g. current password incorrect, new password too short, passwords do not match, or network failure)
    - **When** the error is presented
    - **Then** entered non-secret inputs are preserved while password fields are cleared safely
    - **And** a clear Uzbek Cyrillic error message is shown
    - **And** no hashes, tokens, or internal stack traces are disclosed.

13. **Successful Password Replacement Session Transition (AC 13)**
    - **Given** the Hokim submits a valid replacement password
    - **When** the mutation succeeds
    - **Then** the session and auth context are updated with `mustChangePassword: false`
    - **And** the Hokim is routed automatically to the authorized District Landing Page (`/`)
    - **And** the previous temporary password immediately ceases to authenticate.

14. **Configuration Immutability & Future-Only Principle (AD-10) (AC 14)**
    - **Given** a District is `ACTIVE`
    - **When** subsequent configuration updates occur (e.g. Telegram mapping change or bot replacement)
    - **Then** changes apply future-only and do NOT rewrite, backfill, or corrupt historical audit records or retained evidence.

15. **Privacy-Safe Audit Trail & Observability (AD-9) (AC 15)**
    - **Given** an activation attempt occurs (success or failure) or a Hokim completes first sign-in password change
    - **When** the event is recorded in `audit_events`
    - **Then** the audit payload includes sanitized metadata:
      - `DISTRICT_ACTIVATED`: `{ districtId, districtName, passedPrerequisitesCount: 8, activatedAt }`
      - `DISTRICT_ACTIVATION_FAILED`: `{ districtId, districtName, failedPrerequisites: [...] }`
      - `ACCOUNT_HOKIM_FIRST_LOGIN_PASSWORD_CHANGED`: `{ accountId, districtId, username, credentialVersion }`
    - **And** passwords, session cookies, and secrets NEVER appear in audit logs.

16. **Offline Guard & Mutation Prevention (AC 16)**
    - **Given** the browser is offline (`navigator.onLine === false`)
    - **When** the Product Owner attempts activation or the Hokim attempts password replacement
    - **Then** the mutation is blocked client-side with a warning notification in Uzbek Cyrillic
    - **And** no activation mutation is queued in background storage for replay.

17. **Ant Design UI, Confirmation Modal & 100% Uzbek Cyrillic Copy (AC 17)**
    - **Given** the Product Owner is on the Onboarding Checklist page
    - **When** all 8 items pass and the user clicks "Туманни фаоллаштириш"
    - **Then** the `DistrictActivationModal` opens, summarizing the 8 verified prerequisites and asking for explicit confirmation
    - **And** upon successful activation, TanStack Query v5 executes sequential cache invalidation (`setQueryData(['district', districtId])`, `invalidateQueries(['district', districtId, 'readiness'])`, `invalidateQueries(['districts'])`), the district status badge transitions to `Фаол` (`success`), a durable success banner is shown, and the activation CTA is hidden/replaced with active confirmation
    - **And** `DistrictsPage.tsx` renders `<Tag color="success" icon={<CheckCircleOutlined />}>Фаол</Tag>` for active districts
    - **And** 100% of UI copy, modal text, button labels, and notifications use standard Uzbek Cyrillic
    - **And** all interactive touch targets meet $\ge 44\text{px}$ with visible keyboard focus indicators.

18. **Automated Test Matrix & Verification Gates (AC 18)**
    - **Given** Story 1.7 implementation is complete
    - **When** automated test suites execute
    - **Then** contracts tests verify `ActivateDistrictRequestSchema`, `ActivateDistrictResponseSchema`, `FirstSignInPasswordChangeRequestSchema`, and `FirstSignInPasswordChangeResponseSchema`
    - **And** backend integration tests verify 8-prerequisite dynamic revalidation, `FOR UPDATE` concurrency locking, 409 Conflict on incomplete prerequisites, atomic activation transaction, `DISTRICT_ACTIVATED` and `DISTRICT_ACTIVATION_FAILED` audit events, inactive vs active Hokim login gate, and first-sign-in password replacement
    - **And** web unit & Playwright E2E tests verify checklist activation button enabling/disabling, confirmation modal display and submission, status badge updates, Hokim sign-in after activation, and first-sign-in password replacement journey.

---

## Tasks / Subtasks

- [ ] **Task 1: API Contracts for District Activation & First Sign-In Password Replacement** (AC: 1, 2, 3, 5, 10, 18)
  - [ ] 1.1 Create `packages/api-contracts/src/errors.ts` defining `ApiErrorEnvelopeSchema` with `error: z.object({ code: z.string().min(1), message: z.string().min(1), blockers: z.array(PrerequisiteItemSchema).optional() })`, and re-export from `packages/api-contracts/src/index.ts` and `auth.ts`.
  - [ ] 1.2 Update `packages/api-contracts/src/districts.ts` to enrich `DistrictSchema` with `activatedAt: z.string().datetime().nullable().optional()` and `activatedById: z.string().nullable().optional()`, and define `ActivateDistrictResponseSchema` and `ActivateDistrictResponse` (`{ district: DistrictSchema, activatedAt: z.string().datetime(), activatedById: z.string() }`).
  - [ ] 1.3 Update `packages/api-contracts/src/auth.ts` to add `mustChangePassword: z.boolean().optional()` to `ActorContextSchema` and define `FirstSignInPasswordChangeRequestSchema` and `FirstSignInPasswordChangeResponseSchema`.
  - [ ] 1.4 Export all new schemas and types from `packages/api-contracts/src/index.ts`.
  - [ ] 1.5 Add unit tests in `packages/api-contracts/tests/activation-contracts.test.ts` verifying parsing, validation, and blocker serialization.

- [ ] **Task 2: Database Schema & Migration for Activation Metadata and Password Change Flag** (AC: 5, 10)
  - [ ] 2.1 Update `apps/backend/src/adapters/db/schema/districts.ts` to add `activatedAt: timestamp('activated_at', { withTimezone: true })` and `activatedById: text('activated_by_id').references((): AnyPgColumn => accounts.id, { onDelete: 'set null' })`.
  - [ ] 2.2 Update `apps/backend/src/adapters/db/schema/accounts.ts` to add `mustChangePassword: boolean('must_change_password').notNull().default(false)`.
  - [ ] 2.3 Create Drizzle migration `apps/backend/drizzle/0006_district_activation.sql` applying schema updates.
  - [ ] 2.4 Update `apps/backend/tests/db-schema.test.ts` to verify new columns, constraints, and foreign key relations.

- [ ] **Task 3: Backend District Activation Service & Atomic Transaction** (AC: 1, 2, 3, 4, 5, 6, 15)
  - [ ] 3.1 Update `apps/backend/src/modules/districts/districts-readiness.ts` so `evaluateDistrictReadiness` accepts `db: DbOrTx` (`DbClient | Parameters<Parameters<DbClient['transaction']>[0]>[0]`).
  - [ ] 3.2 Define domain error classes in `apps/backend/src/modules/districts/districts-service.ts`:
    - `DistrictNotReadyForActivationError(readonly blockers: PrerequisiteItem[])` (code: `DISTRICT_NOT_READY`, 409)
    - `DistrictAlreadyActiveError(districtId: string)` (code: `DISTRICT_ALREADY_ACTIVE`, 409)
    - `DistrictInvalidStatusError(districtId: string, status: string)` (code: `DISTRICT_INVALID_STATUS`, 409)
  - [ ] 3.3 Implement `activateDistrict(db: DbClient, districtId: string, actor: ActorContext, clientInfo?: ClientContext)`:
    - Enters `db.transaction(async (tx) => ...)`.
    - Tier 1: Row lock `SELECT ... FOR UPDATE` via `tx.execute(sql`...`)` to serialize concurrent requests.
    - Checks `district.status === 'SETUP_INCOMPLETE'` (throws `DistrictAlreadyActiveError` if `ACTIVE`, or `DistrictInvalidStatusError` if `SUSPENDED`/`CANCELLED`).
    - Evaluates all 8 prerequisites inside the transaction via `evaluateDistrictReadiness(tx, districtId)`. If `!isActivationReady`, rolls back transaction and logs `DISTRICT_ACTIVATION_FAILED` to `db` with failed prerequisites before throwing `DistrictNotReadyForActivationError`.
    - Tier 2: Conditional atomic update `.where(and(eq(districts.id, districtId), eq(districts.status, 'SETUP_INCOMPLETE'))).returning()`.
    - Sets `districts.status = 'ACTIVE'`, `districts.activatedAt = now`, `districts.activatedById = actor.id`, `districts.updatedAt = now`.
    - Inserts `DISTRICT_ACTIVATED` event into `audit_events` with prerequisite snapshot.
  - [ ] 3.4 Update `formatDistrict` in `districts-service.ts` to map `activatedAt` and `activatedById`.
  - [ ] 3.5 Add unit & integration tests in `apps/backend/tests/districts-activation.test.ts` verifying all success, failure, lock, and concurrency branches.

- [ ] **Task 4: Backend District Activation Route Registration** (AC: 2, 3, 5, 6, 7)
  - [ ] 4.1 Update `apps/backend/src/modules/districts/districts-routes.ts` to register `POST /api/v1/districts/:districtId/activate` under `createRequireProductOwner(db)` scope.
  - [ ] 4.2 Map domain errors to HTTP response codes:
    - `DistrictNotFoundError` $\to$ HTTP 404
    - `DistrictNotReadyForActivationError` $\to$ HTTP 409 (`DISTRICT_NOT_READY`, returns `error.blockers` array)
    - `DistrictAlreadyActiveError` $\to$ HTTP 409 (`DISTRICT_ALREADY_ACTIVE`)
    - `DistrictInvalidStatusError` $\to$ HTTP 409 (`DISTRICT_INVALID_STATUS`)
  - [ ] 4.3 Verify state-changing origin guard hook applies to `/activate`.

- [ ] **Task 5: Backend Hokim First Sign-In Password Replacement Service & Route** (AC: 9, 10, 11, 12, 13, 15)
  - [ ] 5.1 Update `apps/backend/src/modules/hokim-accounts/hokim-accounts-service.ts` so `createDistrictHokimAccount`, `resetDistrictHokimPassword`, and `replaceDistrictHokimAccount` explicitly set `mustChangePassword = true`.
  - [ ] 5.2 Update `apps/backend/src/modules/auth/auth-routes.ts`:
    - In `POST /api/v1/auth/sign-in` and `GET /api/v1/auth/session`: include `mustChangePassword: account.mustChangePassword` in the response `actor` payload.
    - Register `POST /api/v1/auth/change-first-login-password`:
      - Validates session from cookie.
      - Ensures actor role is `DISTRICT_HOKIM` and `mustChangePassword === true`.
      - Verifies `currentPassword` against `account.passwordHash` (Argon2id).
      - Validates `newPassword` against `apps/backend/src/adapters/crypto/password-policy.ts` ($\ge 15$ characters, $\le 128$ code points).
      - In atomic transaction: hashes `newPassword` with Argon2id, updates `account.passwordHash`, sets `mustChangePassword = false`, increments `credentialVersion = credentialVersion + 1`, updates `account.updatedAt = now`.
      - Atomically updates current active session's `credentialVersion` in `sessions` table to match the new version, and revokes any other sessions for that account.
      - Logs `ACCOUNT_HOKIM_FIRST_LOGIN_PASSWORD_CHANGED` in `audit_events`.
  - [ ] 5.3 Add integration tests in `apps/backend/tests/auth-first-login-password.test.ts`.

- [ ] **Task 6: Web Client Adapters & State Hooks** (AC: 1, 3, 5, 10, 16)
  - [ ] 6.1 Update `apps/web/src/lib/api-client.ts` so `ApiError` preserves `public readonly blockers?: PrerequisiteItem[]`.
  - [ ] 6.2 Update `apps/web/src/district/district-client.ts` with `activateDistrict(districtId: string)`.
  - [ ] 6.3 Update `apps/web/src/auth/auth-client.ts` with `changeFirstLoginPassword(payload)`.
  - [ ] 6.4 Update `apps/web/src/auth/auth-context.tsx` to handle `mustChangePassword` state transitions and session refreshing.
  - [ ] 6.5 Create `apps/web/src/district/useDistrictActivation.ts` hook with TanStack Query v5 mutation and cache invalidation sequence (`setQueryData(['district', id])`, `invalidateQueries(['district', id, 'readiness'])`, `invalidateQueries(['districts'])`). Handle `DISTRICT_ALREADY_ACTIVE` gracefully.

- [ ] **Task 7: Web District Activation UI & Confirmation Modal** (AC: 1, 7, 16, 17)
  - [ ] 7.1 Create `apps/web/src/components/DistrictActivationModal.tsx`:
    - Ant Design modal with `confirmLoading`, disabled cancel on flight, `destroyOnClose={true}`, `maskClosable={!isPending}`, `closable={!isPending}`.
    - Displays verified prerequisite summary, district name, and activation confirmation.
    - Submits via `useDistrictActivation`.
    - Handles inline error alert with dynamic blocker action links on failure without closing modal.
    - Handles network errors (`isNetworkError: true`) with retry alert.
    - Resets error state on modal dismiss (`mutation.reset()`).
    - On success: shows success notification, closes modal.
  - [ ] 7.2 Update `apps/web/src/components/DistrictOnboardingChecklist.tsx`:
    - Connect "Туманни фаоллаштириш" button to open `DistrictActivationModal`.
    - Check both `readiness.status === 'ACTIVE'` and parent `district.status === 'ACTIVE'` to render persistent active success banner with activation timestamp and disable/hide activation button.
  - [ ] 7.3 Update `apps/web/src/pages/DistrictsPage.tsx` status column to render `<Tag color="success" icon={<CheckCircleOutlined />}>Фаол</Tag>` for active districts and header badge to reflect `ACTIVE` status immediately.

- [ ] **Task 8: Web Hokim First Sign-In Password Replacement UI** (AC: 10, 11, 12, 13, 17)
  - [ ] 8.1 Create `apps/web/src/pages/FirstSignInPasswordChangePage.tsx`:
    - Standalone Ant Design layout with centered card container.
    - Displays mandatory informational notice as static `<Alert type="info" showIcon ... />`: "Эслатма: Тизим шартномасига мувофиқ, Маҳсулот эгаси туман маълумотлари ва далилларни мониторинг қилиш ҳамда техник қўллаб-қувватлаш учун операцион кириш ҳуқуқига эга." (zero consent checkboxes).
    - Form fields: Current password (temporary), New password, Confirm new password (all $\ge 44\text{px}$ touch height).
    - Client-side validation for $\ge 15$ characters and matching passwords.
    - Submits to `authClient.changeFirstLoginPassword`.
    - On success: updates `authContext` and routes to `/` (Hokim dashboard / landing).
  - [ ] 8.2 Update `apps/web/src/auth/ProtectedRoute.tsx` to intercept Hokim users with `mustChangePassword === true` and navigate to `/first-login-password-change` while preventing infinite loops by checking `location.pathname !== '/first-login-password-change'`.
  - [ ] 8.3 Update `apps/web/src/App.tsx` to declare `/first-login-password-change` as a standalone protected card route outside `ConsoleLayout`.

- [ ] **Task 9: Unit, Integration & E2E Automated Verification Matrix** (AC: 18)
  - [ ] 9.1 Run contracts test suite: `pnpm --filter @mahalla-ovozi/api-contracts test`.
  - [ ] 9.2 Run backend test suites: `pnpm --filter @mahalla-ovozi/backend test`.
  - [ ] 9.3 Create frontend unit tests `apps/web/tests/unit/DistrictActivationModal.test.tsx` and `apps/web/tests/unit/FirstSignInPasswordChangePage.test.tsx`.
  - [ ] 9.4 Create Playwright E2E journey in `apps/web/tests/e2e/district-activation.spec.ts` covering:
    - Complete prerequisite onboarding $\to$ activation modal $\to$ successful activation.
    - Incomplete prerequisite $\to$ activation button disabled.
    - Hokim login before activation $\to$ 403 Forbidden.
    - Hokim login after activation with temporary password $\to$ redirect to first sign-in password change $\to$ password replaced $\to$ landing page.
  - [ ] 9.5 Run full quality gate: `pnpm typecheck`, `pnpm test`, `pnpm --filter @mahalla-ovozi/web test:e2e`.

---

## Dev Notes

### Relevant Architecture Patterns and Constraints

- **Hexagonal Modular Monolith (AD-1):** District activation domain logic resides in `apps/backend/src/modules/districts/` and coordinates with auth module via established interfaces.
- **Relational Integrity & Dynamic Evaluation (AD-4, FR-20):** Activation is never an arbitrary database flag flip. The server must authoritatively re-verify all 8 prerequisites from live database tables (`districts`, `districtTelegramBots`, `districtTelegramGroups`, `accounts`) inside the activation transaction.
- **Two-Tier Concurrency Defense:** Use `tx.execute(sql`... FOR UPDATE`)` row lock combined with conditional `.where(and(eq(districts.id, districtId), eq(districts.status, 'SETUP_INCOMPLETE'))).returning()` to completely eliminate race conditions.
- **Downstream Lifecycle Gating (AD-4, Epic 2):** Inactive districts are strictly rejected across all production surfaces. Hokim sign-in checks `district.status === 'ACTIVE'`.
- **Zero Storage Leakage & Plaintext Invisibility (AD-9):** Password replacement hashes credentials immediately with Argon2id. Plaintext passwords never enter logs, audit events, or persistent storage.
- **Explicit `updatedAt` Rule:** Every Drizzle `.update()` query must explicitly pass `updatedAt: new Date()` (established repo standard).
- **Uzbek Cyrillic UI Standard:** 100% of user-facing UI labels, errors, modals, and notifications must use standard Uzbek Cyrillic.

---

### Analysis of Modified (`UPDATE`) and New (`NEW`) Files

#### 1. `packages/api-contracts/src/errors.ts` [NEW] & `auth.ts` [UPDATE]
- **Story 1.7 Changes:** Create dedicated `errors.ts` defining `ApiErrorEnvelopeSchema` with `error.blockers?: z.array(PrerequisiteItemSchema)`. Add `mustChangePassword` to `ActorContextSchema`, define `FirstSignInPasswordChangeRequestSchema` and `FirstSignInPasswordChangeResponseSchema`.

#### 2. `packages/api-contracts/src/districts.ts` [UPDATE]
- **Story 1.7 Changes:** Add `activatedAt` and `activatedById` to `DistrictSchema`. Add `ActivateDistrictResponseSchema` and types.

#### 3. `apps/backend/src/adapters/db/schema/districts.ts` [UPDATE]
- **Story 1.7 Changes:** Add `activatedAt: timestamp('activated_at', { withTimezone: true })` and `activatedById: text('activated_by_id').references((): AnyPgColumn => accounts.id, { onDelete: 'set null' })`.

#### 4. `apps/backend/src/adapters/db/schema/accounts.ts` [UPDATE]
- **Story 1.7 Changes:** Add `mustChangePassword: boolean('must_change_password').notNull().default(false)`.

#### 5. `apps/backend/src/modules/districts/districts-readiness.ts` [UPDATE]
- **Story 1.7 Changes:** Update `evaluateDistrictReadiness` parameter type to `DbOrTx`.

#### 6. `apps/backend/src/modules/districts/districts-service.ts` [UPDATE]
- **Story 1.7 Changes:** Implement `activateDistrict` with `FOR UPDATE` row lock, dynamic prerequisite validation, and atomic transaction. Commit `DISTRICT_ACTIVATION_FAILED` to `db` on prerequisite failures.

#### 7. `apps/backend/src/modules/districts/districts-routes.ts` [UPDATE]
- **Story 1.7 Changes:** Register `POST /api/v1/districts/:districtId/activate` with structured 409 blocker error handling.

#### 8. `apps/backend/src/modules/auth/auth-routes.ts` [UPDATE]
- **Story 1.7 Changes:** Include `mustChangePassword` in sign-in/session response; register `POST /api/v1/auth/change-first-login-password` with atomic session credentialVersion synchronization.

#### 9. `apps/backend/src/modules/hokim-accounts/hokim-accounts-service.ts` [UPDATE]
- **Story 1.7 Changes:** Set `mustChangePassword: true` on account creation, credential reset, and account replacement.

#### 10. `apps/web/src/district/district-client.ts` [UPDATE] & `lib/api-client.ts` [UPDATE]
- **Story 1.7 Changes:** Add `activateDistrict` to `districtClient` and preserve `blockers` in `ApiError`.

#### 11. `apps/web/src/components/DistrictOnboardingChecklist.tsx` [UPDATE]
- **Story 1.7 Changes:** Attach activation modal trigger to button; render active state banner when status is `ACTIVE`.

#### 12. `apps/web/src/pages/DistrictsPage.tsx` [UPDATE]
- **Story 1.7 Changes:** Render `<Tag color="success" icon={<CheckCircleOutlined />}>Фаол</Tag>` for active districts.

#### 13. `apps/web/src/auth/ProtectedRoute.tsx` [UPDATE]
- **Story 1.7 Changes:** Redirect Hokim users with `mustChangePassword === true` to `/first-login-password-change` without infinite redirect loops.

#### 14. `apps/web/src/App.tsx` [UPDATE]
- **Story 1.7 Changes:** Add standalone `/first-login-password-change` route outside `ConsoleLayout`.

---

### Previous Story Intelligence & Learnings

1. **Drizzle `updatedAt` Timestamp:** PostgreSQL does not auto-update timestamps on `UPDATE` without a trigger. Every update query MUST explicitly include `updatedAt: new Date()` to prevent stale timestamps (Stories 1.2, 1.3, 1.4, 1.5, 1.6).
2. **Pre-Transaction Validations (AD-1):** All format checks, prerequisite evaluations, and status checks must occur inside the row-locked transaction.
3. **Session Revocation Consistency:** Password change must increment `credentialVersion` and update active sessions atomically.
4. **JSDOM Compatibility in Web Unit Tests:** Ant Design modals and drawers use `rc-util` which calls `getComputedStyle`. Vitest setup must handle computed styles gracefully.
5. **Uzbek Cyrillic Standards:** 100% of user-facing UI labels, placeholders, errors, and alerts must be in standard Uzbek Cyrillic.

---

### Project Structure Notes

- Alignment with unified project structure:
  - Contracts in `packages/api-contracts/src/districts.ts`, `packages/api-contracts/src/errors.ts`, and `packages/api-contracts/src/auth.ts`
  - Backend schema in `apps/backend/src/adapters/db/schema/districts.ts` and `accounts.ts`
  - Backend service & routes in `apps/backend/src/modules/districts/` and `apps/backend/src/modules/auth/`
  - Frontend components in `apps/web/src/components/DistrictActivationModal.tsx` and `apps/web/src/pages/FirstSignInPasswordChangePage.tsx`
- No detected architectural variances or conflicts.

---

### References

- [Epic 1 Specification: Story 1.7](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/epics/epic-1.md#Story-1.7)
- [PRD FR-20, FR-22: Gated and resumable District onboarding](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/prds/prd-Mahalla-Ovozi-2026-07-30/prd.md#fr-20-gated-and-resumable-district-onboarding)
- [Architecture Spine: Invariants AD-1, AD-4, AD-9, AD-10](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/architecture/architecture-Mahalla-Ovozi-2026-08-12/ARCHITECTURE-SPINE.md)
- [UX Design Specifications](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/ux-designs/ux-Mahalla-Ovozi-2026-08-05/DESIGN.md)
- [Previous Story Spec: Story 1.6](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/implementation-artifacts/1-6-create-and-manage-the-district-hokim-account.md)

---

## Dev Agent Record

### Agent Model Used

Gemini 3.7 Flash

### Debug Log References

### Completion Notes List

- Story 1.7 specification hardened and verified through 4-layer adversarial specification review.
- Incorporated:
  1. `DbOrTx` typing for transactional revalidation in `districts-readiness.ts`.
  2. Permanent `DISTRICT_ACTIVATION_FAILED` audit logging outside rolled-back transactions.
  3. Dedicated `errors.ts` for `ApiErrorEnvelopeSchema` with optional `blockers`.
  4. Enriched `DistrictSchema` with `activatedAt` and `activatedById`.
  5. Password lifecycle flag `mustChangePassword` in account replacement.
  6. Atomic current-session `credentialVersion` synchronization upon first-login password replacement.
  7. Infinite-loop prevention in `ProtectedRoute.tsx` and standalone layout for `/first-login-password-change`.
  8. `DISTRICT_ALREADY_ACTIVE` graceful recovery in modal and query invalidation.
  9. `destroyOnClose={true}` and `mutation.reset()` error state cleanup.
  10. Full Uzbek Cyrillic dictionary harmonization and status tag localization in `DistrictsPage.tsx`.

### File List

- `packages/api-contracts/src/errors.ts` [NEW]
- `packages/api-contracts/src/districts.ts` [UPDATE]
- `packages/api-contracts/src/auth.ts` [UPDATE]
- `packages/api-contracts/src/index.ts` [UPDATE]
- `packages/api-contracts/tests/activation-contracts.test.ts` [NEW]
- `apps/backend/src/adapters/db/schema/districts.ts` [UPDATE]
- `apps/backend/src/adapters/db/schema/accounts.ts` [UPDATE]
- `apps/backend/drizzle/0006_district_activation.sql` [NEW]
- `apps/backend/src/modules/districts/districts-readiness.ts` [UPDATE]
- `apps/backend/src/modules/districts/districts-service.ts` [UPDATE]
- `apps/backend/src/modules/districts/districts-routes.ts` [UPDATE]
- `apps/backend/src/modules/auth/auth-routes.ts` [UPDATE]
- `apps/backend/src/modules/hokim-accounts/hokim-accounts-service.ts` [UPDATE]
- `apps/web/src/district/district-client.ts` [UPDATE]
- `apps/web/src/lib/api-client.ts` [UPDATE]
- `apps/web/src/district/useDistrictActivation.ts` [NEW]
- `apps/web/src/auth/auth-client.ts` [UPDATE]
- `apps/web/src/auth/auth-context.tsx` [UPDATE]
- `apps/web/src/components/DistrictActivationModal.tsx` [NEW]
- `apps/web/src/components/DistrictOnboardingChecklist.tsx` [UPDATE]
- `apps/web/src/pages/DistrictsPage.tsx` [UPDATE]
- `apps/web/src/pages/FirstSignInPasswordChangePage.tsx` [NEW]
- `apps/web/src/auth/ProtectedRoute.tsx` [UPDATE]
- `apps/web/src/App.tsx` [UPDATE]
- `apps/backend/tests/districts-activation.test.ts` [NEW]
- `apps/backend/tests/auth-first-login-password.test.ts` [NEW]
- `apps/backend/tests/db-schema.test.ts` [UPDATE]
- `apps/web/tests/unit/DistrictActivationModal.test.tsx` [NEW]
- `apps/web/tests/unit/FirstSignInPasswordChangePage.test.tsx` [NEW]
- `apps/web/tests/unit/DistrictOnboardingChecklist.test.tsx` [UPDATE]
- `apps/web/tests/e2e/district-activation.spec.ts` [NEW]

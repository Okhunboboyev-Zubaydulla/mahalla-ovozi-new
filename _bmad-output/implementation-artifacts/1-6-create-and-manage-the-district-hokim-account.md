---
baseline_commit: b02af6b22dafe0ab82a317f366b4323829d36607
---

# Story 1.6: Create and Manage the District Hokim Account

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the **Product Owner**,
I want to create and manage the single Hokim account assigned to a District,
So that the District has a securely provisioned Hokim identity whose access is deterministic, strictly tenant-isolated, and can be revoked immediately.

## Acceptance Criteria

1. **District-Scoped Hokim Account State & Distinct UI Modes (AC 1)**
   - **Given** a District is selected in the Product Owner Console
   - **When** the Product Owner opens Hokim Accounts (`/hokim-accounts`)
   - **Then** only that District's Hokim-account state is shown
   - **And** the interface clearly distinguishes three mutually exclusive states:
     - **`NO_ACCOUNT`**: empty state card with "Ҳоким аккаунтини яратиш" (Create Hokim Account) CTA
     - **`ACTIVE`**: active card displaying username, role badge (`Туман ҳокими`), active status badge (`Фаол`), creation/last reset timestamp, and action buttons (`[Паролни янгилаш]`, `[Аккаунтни алмаштириш]`, `[Фаолсизлантириш]`)
     - **`DISABLED`**: disabled card displaying username, disabled status badge (`Фаолсизлантирилган`), last updated timestamp, and action buttons (`[Аккаунтни алмаштириш]`, `[Янги аккаунт яратиш]`)
   - **And** account data from another District cannot appear.

2. **Account Creation & Cryptographic Temporary Password Generation (AC 2)**
   - **Given** a District does not have an active Hokim account
   - **When** the Product Owner submits the creation form with a valid username (3–64 chars, alphanumeric/underscore)
   - **Then** exactly one active Hokim account is created and bound to that District with `role = 'DISTRICT_HOKIM'`, `status = 'ACTIVE'`, `credentialVersion = 1`
   - **And** the server generates a cryptographically secure temporary password of at least 15 characters (default 18 chars, ~108 bits entropy) using `node:crypto.randomInt` with guaranteed character classes (uppercase, lowercase, digits, symbols) and zero modulo bias
   - **And** the password is stored in the database solely as an Argon2id hash (`memoryCost: 65536, timeCost: 3, parallelism: 4`)
   - **And** the plaintext password is returned only once in the HTTP creation response payload.

3. **Dedicated One-Time Credential Surface & Zero Storage Leakage (AC 3)**
   - **Given** a temporary password has just been generated upon creation or reset
   - **When** the mutation completes successfully
   - **Then** the plaintext temporary password is shown exclusively in a dedicated one-time modal dialog (`OneTimeCredentialModal`)
   - **And** the modal provides a direct "Нусха олиш" (Copy) button with clipboard integration and feedback notification
   - **And** the plaintext password is NEVER written to server logs, telemetry, audit tables, browser localStorage/sessionStorage, URL query/history state, or persistent frontend cache.

4. **One-Way Credential Invisibility & No "Reveal" Capability (AC 4)**
   - **Given** the Product Owner closes or dismisses the one-time modal, reloads the page, or navigates away
   - **When** the modal is no longer active
   - **Then** the plaintext password is immediately wiped from component memory and cannot be recovered or displayed again
   - **And** the persistent UI displays only safe metadata (username, role, status, last reset timestamp)
   - **And** there is strictly no "reveal password" or "show password" button or API endpoint anywhere in the application.

5. **Server-Determined Role & Deterministic District Authorization (AC 5)**
   - **Given** a Hokim user enters valid credentials on the sign-in surface
   - **When** authentication succeeds
   - **Then** the server determines the actor's role (`DISTRICT_HOKIM`) and assigned `districtId` authoritatively from the database row without trusting any client-supplied role or district parameter
   - **And** subsequent requests are strictly authorized only for that specific District.

6. **Inactive District Access Rejection (Lifecycle Guard) (AC 6)**
   - **Given** the assigned District is not in `ACTIVE` status (e.g. `SETUP_INCOMPLETE`, `SUSPENDED`, `CANCELLED`)
   - **When** the Hokim attempts to authenticate or call protected endpoints
   - **Then** the request is rejected with a sanitized error (`DISTRICT_NOT_ACTIVE` / 403 Forbidden)
   - **And** internal District onboarding states and lifecycle details are not leaked to the user
   - **And** once the District is activated in Story 1.7, the provisioned account becomes functional without recreating credentials.

7. **Post-Activation Hokim Sign-In & Database-Backed Opaque Session (AC 7)**
   - **Given** the District is `ACTIVE` and the Hokim account is `ACTIVE`
   - **When** the Hokim signs in with valid credentials
   - **Then** an opaque session is created with a 256-bit token hash stored in PostgreSQL
   - **And** the browser receives the host-scoped `__Host-session` cookie (`Secure`, `HttpOnly`, `SameSite=Strict`)
   - **And** the session is bound to the server-derived `ActorContext` (`{ id, role: 'DISTRICT_HOKIM', username, districtId }`).

8. **Generic Invalid Credentials & Timing-Attack Equalization (AC 8)**
   - **Given** invalid credentials (non-existent username or incorrect password) are submitted
   - **When** authentication fails
   - **Then** the API returns a generic sanitized Uzbek Cyrillic error ("Нотўғри фойдаланувчи номи ёки парол.") without disclosing whether the username exists
   - **And** when the username does not exist, the server executes a pre-computed dummy Argon2id verification (`verifyPassword(DUMMY_HASH, password)`) to equalize response time (~60ms) and prevent timing attacks
   - **And** failed attempts are rate-limited and recorded in privacy-safe audit logs.

9. **Credential Reset, Ephemeral Delivery & Immediate Session Revocation (AC 9)**
   - **Given** an active Hokim account exists
   - **When** the Product Owner executes a credential reset
   - **Then** a new cryptographically random temporary password ($\ge 15$ chars) is generated, hashed with Argon2id, and returned once for display in the one-time modal
   - **And** `credential_version` is incremented by 1
   - **And** ALL active sessions for that Hokim account are immediately revoked in the database (`revokedAt = new Date()`)
   - **And** no unrelated Product Owner or other District sessions are revoked.

10. **Account Disablement & Authoritative Session Termination (AC 10)**
    - **Given** an active Hokim account exists
    - **When** the Product Owner disables the Hokim account
    - **Then** the account's `status` is set to `DISABLED` and `credential_version` is incremented
    - **And** all active sessions for that account are immediately revoked
    - **And** subsequent authentication attempts for this account are rejected immediately.

11. **Account Replacement & Atomic Transition (AC 11)**
    - **Given** a District has an existing Hokim account
    - **When** the Product Owner replaces the Hokim account with a new username
    - **Then** within a single database transaction:
      - The previous account is marked `status = 'DISABLED'`, its `credential_version` is incremented, and its sessions are revoked
      - A new account with the new username, `role = 'DISTRICT_HOKIM'`, `status = 'ACTIVE'`, and `district_id` is created
      - A fresh temporary password is generated and displayed once
    - **And** the previous account cannot authenticate or access the system.

12. **Strict Single Active Hokim Per District Invariant (AC 12)**
    - **Given** any concurrent or duplicate creation mutation
    - **When** an operation would result in more than one active Hokim account for a single District
    - **Then** database constraints (partial unique index `accounts_active_district_hokim_idx`) and service validations reject the mutation with HTTP 409 Conflict (`DISTRICT_HOKIM_ALREADY_EXISTS`)
    - **And** the existing account remains unaltered and consistent.

13. **Dynamic Onboarding Readiness Evaluator Derivation (FR-20 Prerequisite 8) (AC 13)**
    - **Given** the District Hokim account state changes (created, reset, disabled, replaced)
    - **When** `GET /api/v1/districts/:districtId/readiness` is requested or refreshed
    - **Then** Prerequisite 8 (`hokim_account`) in `districts-readiness.ts` is dynamically evaluated from the `accounts` table:
      - Evaluates to `passed` with `completedAt` and `completedBy` when an active Hokim account exists (`status === 'ACTIVE'`)
      - Evaluates to `incomplete` with actionable blocker details when no Hokim account exists or when the account is `DISABLED`.

14. **Cross-District Isolation & Privacy-Safe Audit Trail (AD-9) (AC 14)**
    - **Given** a Hokim account is authenticated
    - **When** any request attempts to query or mutate resources belonging to another District
    - **Then** the server rejects the request with HTTP 403 Forbidden / 404 Not Found without disclosing target District information
    - **And** all lifecycle actions (`ACCOUNT_HOKIM_CREATED`, `ACCOUNT_HOKIM_PASSWORD_RESET`, `ACCOUNT_HOKIM_DISABLED`, `ACCOUNT_HOKIM_REPLACED`) and failed attempts are written to `audit_events` with sanitized metadata (actor ID, role, action, target district ID, timestamp)
    - **And** plaintext passwords, session tokens, and secrets NEVER appear in audit payloads.

15. **Offline Resistance & Safe Mutation Blocking (AC 15)**
    - **Given** the browser is offline (`navigator.onLine === false`) during Hokim account administration
    - **When** the Product Owner attempts to create, reset, disable, or replace an account
    - **Then** the mutation is blocked client-side with an informative Uzbek Cyrillic notification
    - **And** no credential mutation is queued in offline storage for replay
    - **And** no false success or fake temporary credentials are displayed.

16. **Responsive Ant Design UX, 100% Uzbek Cyrillic Copy & Accessibility (AC 16)**
    - **Given** Hokim account management is accessed across desktop, tablet, and mobile (<768px), at 200% zoom, or with keyboard navigation
    - **When** the Product Owner interacts with the page, drawers, and modals
    - **Then** all interactive elements meet $\ge 44\text{px}$ touch targets and visible focus indicators
    - **And** account status is never conveyed by color alone (status icons + explicit text tags)
    - **And** 100% of UI copy, button labels, validation messages, and security notices use standard Uzbek Cyrillic.

17. **Automated Test Matrix & Verification Gates (AC 17)**
    - **Given** Story 1.6 is implemented
    - **When** automated test suites execute
    - **Then** unit tests verify temporary password generation (entropy, length, char classes, CSPRNG rejection sampling) and password policy validation
    - **And** backend integration tests verify 1-to-1 uniqueness constraint, password hashing, session creation/revocation, inactive district rejection, cross-district authorization boundaries, timing attack equalization, dynamic readiness transitions, and audit event emission
    - **And** web unit & Playwright E2E tests verify account creation, one-time credential modal display and copy functionality, credential disappearance on close/reload, password reset flow, account disablement/replacement, and checklist synchronization.

---

## Tasks / Subtasks

- [ ] **Task 1: Backend Crypto Adapter & Temporary Password Generator** (AC: 2, 8)
  - [ ] 1.1 Create `apps/backend/src/adapters/crypto/temporary-password.ts` with `generateTemporaryPassword(length = 18)` using `node:crypto.randomInt` over 64-char unambiguous alphabet and Fisher-Yates shuffle.
  - [ ] 1.2 Validate generated passwords against `apps/backend/src/adapters/crypto/password-policy.ts` and common passwords blocklist.
  - [ ] 1.3 Add unit tests in `apps/backend/tests/temporary-password.test.ts` verifying length validation, character class distribution, CSPRNG rejection sampling, and non-blocking execution.

- [ ] **Task 2: Database Schema & Migration Finalization** (AC: 1, 2, 10, 11, 12)
  - [ ] 2.1 Update `apps/backend/src/adapters/db/schema/accounts.ts` to include `status` (`'ACTIVE' | 'DISABLED'`), `districtId` (FK referencing `districts.id` with `onDelete: 'cascade'`), role and status check constraints, role-district consistency check constraint, and partial unique index `accounts_active_district_hokim_idx` (`district_id` WHERE `role = 'DISTRICT_HOKIM' AND status = 'ACTIVE'`).
  - [ ] 2.2 Create migration SQL `apps/backend/drizzle/0005_warm_hokim_accounts.sql` adding columns, foreign keys, check constraints, and unique index.
  - [ ] 2.3 Verify Drizzle types `Account` and `NewAccount` export cleanly from `apps/backend/src/adapters/db/schema/index.ts`.

- [ ] **Task 3: API Contracts & Zod Schemas** (AC: 1, 2, 3, 5, 7, 9, 10, 11)
  - [ ] 3.1 Update `packages/api-contracts/src/auth.ts` to expand `ActorRoleSchema` to `['PRODUCT_OWNER', 'DISTRICT_HOKIM']` and add `districtId?: string | null` to `ActorContextSchema`.
  - [ ] 3.2 Create `packages/api-contracts/src/hokim-accounts.ts` with schemas: `DistrictHokimAccountSchema`, `CreateHokimAccountRequestSchema`, `CreateHokimAccountResponseSchema` (with `temporaryPassword`), `ResetHokimPasswordResponseSchema` (with `temporaryPassword`), `ReplaceHokimAccountRequestSchema`, `ReplaceHokimAccountResponseSchema`, `DisableHokimAccountResponseSchema`.
  - [ ] 3.3 Re-export all schemas and types from `packages/api-contracts/src/index.ts`.
  - [ ] 3.4 Add unit tests in `packages/api-contracts/tests/hokim-contracts.test.ts`.

- [ ] **Task 4: Backend Hokim Accounts Service & Dynamic Readiness Update** (AC: 1, 2, 3, 6, 8, 9, 10, 11, 12, 13, 14)
  - [ ] 4.1 Create `apps/backend/src/modules/hokim-accounts/hokim-accounts-service.ts` implementing `getDistrictHokimAccount`, `createDistrictHokimAccount`, `resetDistrictHokimPassword`, `disableDistrictHokimAccount`, and `replaceDistrictHokimAccount` with atomic transactions, Drizzle explicit `updatedAt: new Date()`, immediate session revocation in `sessions` table, and privacy-safe audit logging (`ACCOUNT_HOKIM_CREATED`, `ACCOUNT_HOKIM_PASSWORD_RESET`, `ACCOUNT_HOKIM_DISABLED`, `ACCOUNT_HOKIM_REPLACED`).
  - [ ] 4.2 Update `apps/backend/src/modules/auth/auth-routes.ts` to enforce: (a) lifecycle active check for Hokim accounts, (b) District `status === 'ACTIVE'` check for `DISTRICT_HOKIM` role after password verification, (c) returning `districtId` in session actor context.
  - [ ] 4.3 Update `apps/backend/src/modules/districts/districts-readiness.ts` to dynamically derive Prerequisite 8 (`hokim_account`) from `accounts` table (`passed` when active Hokim exists, `incomplete` when missing or disabled).
  - [ ] 4.4 Create `apps/backend/src/modules/hokim-accounts/hokim-accounts-routes.ts` with `GET /api/v1/districts/:districtId/hokim-account`, `POST /api/v1/districts/:districtId/hokim-account`, `POST /api/v1/districts/:districtId/hokim-account/reset-password`, `POST /api/v1/districts/:districtId/hokim-account/disable`, `POST /api/v1/districts/:districtId/hokim-account/replace`.
  - [ ] 4.5 Register routes in `apps/backend/src/entrypoints/http.ts`.
  - [ ] 4.6 Add integration tests in `apps/backend/tests/hokim-accounts.test.ts` and update `districts-readiness.test.ts` and `auth-lifecycle.test.ts`.

- [ ] **Task 5: Frontend Hokim Management UI & One-Time Credential Modal** (AC: 1, 3, 4, 15, 16)
  - [ ] 5.1 Create `apps/web/src/district/hokim-account-client.ts` and `apps/web/src/district/useHokimAccount.ts` using TanStack Query.
  - [ ] 5.2 Create `apps/web/src/components/OneTimeCredentialModal.tsx` with non-backdrop-dismissible Ant Design Modal, `Typography.Text` (monospace, copyable), clear Uzbek Cyrillic security copy, and zero persistent storage.
  - [ ] 5.3 Create `apps/web/src/components/CreateHokimModal.tsx`, `ResetHokimModal.tsx`, `ReplaceHokimModal.tsx`, `DisableHokimModal.tsx`.
  - [ ] 5.4 Replace placeholder `apps/web/src/pages/placeholders/HokimAccountsPage.tsx` with production `apps/web/src/pages/HokimAccountsPage.tsx` supporting `NO_ACCOUNT`, `ACTIVE`, and `DISABLED` states.
  - [ ] 5.5 Update `apps/web/src/App.tsx` and `apps/web/src/components/ConsoleLayout.tsx` to ensure route `/hokim-accounts` is active and aligned.
  - [ ] 5.6 Add web unit tests in `apps/web/tests/unit/HokimAccountsPage.test.tsx` and `apps/web/tests/unit/OneTimeCredentialModal.test.tsx`.

- [ ] **Task 6: E2E Verification & Monorepo Quality Gate** (AC: 17)
  - [ ] 6.1 Create Playwright E2E test `apps/web/tests/e2e/hokim-accounts.spec.ts` covering account creation, one-time credential modal display and copy, credential disappearance on dismiss/reload, password reset, account disablement, account replacement, and checklist synchronization.
  - [ ] 6.2 Run monorepo forced verification (`pnpm typecheck`, `pnpm test`, `pnpm --filter @mahalla-ovozi/web test:e2e`).
  - [ ] 6.3 Update `sprint-status.yaml` status to `ready-for-dev`.

---

## Dev Notes

### Relevant Architecture Patterns and Constraints

- **Hexagonal Modular Monolith (AD-1):** Hokim account domain logic lives inside `apps/backend/src/modules/hokim-accounts/` and communicates through project-owned ports and adapters.
- **Relational Integrity & Migrations (AD-4):** Table `accounts` is updated with `district_id`, `status`, check constraints, and partial unique index `accounts_active_district_hokim_idx`.
- **Tenant Isolation & Scope (AD-9):** Every repository method and API contract strictly requires `districtId`. Cross-district queries are prevented by foreign key and index constraints.
- **Privacy & Zero Plaintext Persistence (AD-9, FR-22):** Plaintext temporary passwords are returned exclusively in the mutation HTTP response, displayed in the one-time modal, and immediately discarded upon unmount/dismissal. Passwords are NEVER written to database tables, logs, telemetry, or browser storage.
- **Explicit `updatedAt` Rule:** Every Drizzle `.update()` statement must explicitly set `updatedAt: new Date()` (satisfying repo learning from Stories 1.2, 1.3, 1.4, 1.5).

---

### Analysis of Modified (`UPDATE`) Files

#### 1. `apps/backend/src/adapters/db/schema/accounts.ts`
- **Current State:** Contains `id`, `username`, `passwordHash`, `role`, `credentialVersion`, `createdAt`, `updatedAt`.
- **Story 1.6 Changes:** Add `status` (`'ACTIVE' | 'DISABLED'`), `districtId` (FK referencing `districts.id` with `onDelete: 'cascade'`), check constraints, and partial unique index `accounts_active_district_hokim_idx`.
- **Preserve:** Existing columns and primary/unique key on `username`.

#### 2. `apps/backend/src/modules/districts/districts-readiness.ts`
- **Current State:** Evaluates 8 prerequisites. Prerequisite 8 (`hokim_account`) is statically hardcoded as `incomplete`.
- **Story 1.6 Changes:** Query `accounts` table for active Hokim account (`districtId === district.id && role === 'DISTRICT_HOKIM' && status === 'ACTIVE'`). Prerequisite 8 evaluates to `passed` if active account exists; otherwise evaluates to `incomplete` with clear blocker reasons.
- **Preserve:** Evaluation logic for all other 7 prerequisites, disclosure confirmation mutations, and audit logging.

#### 3. `apps/backend/src/modules/auth/auth-routes.ts`
- **Current State:** Handles sign-in, sign-out, session retrieval for `PRODUCT_OWNER`.
- **Story 1.6 Changes:** In sign-in, check if `account.status === 'ACTIVE'` (return 401 if disabled). For `DISTRICT_HOKIM` role, check if assigned district is `ACTIVE` (return 403 `DISTRICT_NOT_ACTIVE` if incomplete/suspended). Include `districtId` in session actor payload.
- **Preserve:** Timing-attack equalization via `DUMMY_HASH`, rate limiting, origin guard, session cookie handling.

#### 4. `apps/backend/src/entrypoints/http.ts`
- **Current State:** Registers auth, district, telegram-bot, and telegram-group routes.
- **Story 1.6 Changes:** Register `registerHokimAccountRoutes(server, db)`.
- **Preserve:** CORS, cookie parsing, custom JSON parser, global error handler.

#### 5. `packages/api-contracts/src/auth.ts`
- **Current State:** `ActorRoleSchema` is `z.enum(['PRODUCT_OWNER'])`.
- **Story 1.6 Changes:** Expand to `z.enum(['PRODUCT_OWNER', 'DISTRICT_HOKIM'])` and add optional/nullable `districtId` to `ActorContextSchema`.
- **Preserve:** All existing request/response shapes.

#### 6. `packages/api-contracts/src/index.ts`
- **Current State:** Re-exports auth, districts, readiness, telegram-bot, and telegram-group contracts.
- **Story 1.6 Changes:** Re-export all schemas and types from `./hokim-accounts.js`.
- **Preserve:** All existing contract exports.

#### 7. `apps/web/src/App.tsx`
- **Current State:** Configures router with placeholders.
- **Story 1.6 Changes:** Point `/hokim-accounts` route to production `HokimAccountsPage.tsx`.
- **Preserve:** AuthProvider, DistrictProvider, ConfigProvider, theme tokens, error boundary.

---

### Previous Story Intelligence & Learnings

1. **Drizzle `updatedAt` Timestamp:** PostgreSQL does not auto-update timestamps on `UPDATE` without a trigger. Every update query MUST explicitly include `updatedAt: new Date()` to prevent stale timestamps.
2. **Pre-Transaction Validations (AD-1):** All format checks (username length/characters, existing username queries) must be validated before entering database write transactions.
3. **Session Revocation Consistency:** When a password is reset, disabled, or replaced, always update `sessions.revokedAt = new Date()` for all active sessions of that account within the same transaction.
4. **JSDOM Compatibility in Web Unit Tests:** Ant Design modals and drawers use `rc-util` which calls `getComputedStyle`. Vitest setup must handle computed styles gracefully.
5. **Uzbek Cyrillic Standards:** 100% of user-facing UI labels, placeholders, errors, and alerts must be in standard Uzbek Cyrillic.

---

### Project Structure Notes

- Alignment with unified project structure:
  - Contracts in `packages/api-contracts/src/hokim-accounts.ts`
  - Backend schema in `apps/backend/src/adapters/db/schema/accounts.ts`
  - Backend crypto in `apps/backend/src/adapters/crypto/temporary-password.ts`
  - Backend service & routes in `apps/backend/src/modules/hokim-accounts/`
  - Frontend components in `apps/web/src/components/` and state in `apps/web/src/district/`
- No detected architectural variances or conflicts.

---

### References

- [Epic 1 Specification: Story 1.6](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/epics/epic-1.md#Story-1.6)
- [PRD FR-20, FR-22: Hokim account and District access boundary](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/prds/prd-Mahalla-Ovozi-2026-07-30/prd.md#fr-22-hokim-account-and-district-access-boundary)
- [Architecture Spine: Invariants AD-4, AD-9, AD-10](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/architecture/architecture-Mahalla-Ovozi-2026-08-12/ARCHITECTURE-SPINE.md)
- [UX Design Specifications](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/ux-designs/ux-Mahalla-Ovozi-2026-08-05/DESIGN.md)

---

## Dev Agent Record

### Agent Model Used

Gemini 3.7 Flash

### Debug Log References

### Completion Notes List

- Story 1.6 created following exhaustive context synthesis, security research, and BMAD quality standards.
- All 17 Acceptance Criteria, task breakdowns, architecture guardrails, and test matrices specified.

### File List

- `apps/backend/src/adapters/crypto/temporary-password.ts` [NEW]
- `apps/backend/src/adapters/db/schema/accounts.ts` [UPDATE]
- `apps/backend/drizzle/0005_warm_hokim_accounts.sql` [NEW]
- `apps/backend/src/modules/hokim-accounts/hokim-accounts-service.ts` [NEW]
- `apps/backend/src/modules/hokim-accounts/hokim-accounts-routes.ts` [NEW]
- `apps/backend/src/modules/districts/districts-readiness.ts` [UPDATE]
- `apps/backend/src/modules/auth/auth-routes.ts` [UPDATE]
- `apps/backend/src/entrypoints/http.ts` [UPDATE]
- `packages/api-contracts/src/auth.ts` [UPDATE]
- `packages/api-contracts/src/hokim-accounts.ts` [NEW]
- `packages/api-contracts/src/index.ts` [UPDATE]
- `apps/web/src/district/hokim-account-client.ts` [NEW]
- `apps/web/src/district/useHokimAccount.ts` [NEW]
- `apps/web/src/components/OneTimeCredentialModal.tsx` [NEW]
- `apps/web/src/components/CreateHokimModal.tsx` [NEW]
- `apps/web/src/components/ResetHokimModal.tsx` [NEW]
- `apps/web/src/components/ReplaceHokimModal.tsx` [NEW]
- `apps/web/src/components/DisableHokimModal.tsx` [NEW]
- `apps/web/src/pages/HokimAccountsPage.tsx` [NEW]
- `apps/web/src/App.tsx` [UPDATE]
- `apps/backend/tests/temporary-password.test.ts` [NEW]
- `apps/backend/tests/hokim-accounts.test.ts` [NEW]
- `apps/backend/tests/districts-readiness.test.ts` [UPDATE]
- `apps/backend/tests/auth-lifecycle.test.ts` [UPDATE]
- `packages/api-contracts/tests/hokim-contracts.test.ts` [NEW]
- `apps/web/tests/unit/HokimAccountsPage.test.tsx` [NEW]
- `apps/web/tests/unit/OneTimeCredentialModal.test.tsx` [NEW]
- `apps/web/tests/e2e/hokim-accounts.spec.ts` [NEW]

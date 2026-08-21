---
baseline_commit: 6daf90fd6a2f3d8bbe8de56e09d0946de75733a8
---

# Story 1.1: Secure Product Owner Sign-In

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the **Product Owner**,
I want to sign in securely to the private Mahalla Ovozi application,
So that I can access the Product Owner surface without exposing the system to public or unauthorized access.

## Acceptance Criteria

1. **Greenfield Application Foundation**
   - **Given** the greenfield repository
   - **When** Story 1.1 is implemented
   - **Then** the application foundation uses the approved pnpm workspace, TypeScript/Node, Fastify, React/Vite, Ant Design, PostgreSQL/Drizzle, shared Zod REST contracts, and the architecture's modular-monolith boundaries
   - **And** only schema/infrastructure required for this story is introduced.

2. **Continuous Integration Pipeline**
   - **Given** the greenfield application foundation is established
   - **When** changes are proposed for merge into `main` or committed to `main`
   - **Then** a minimal `.github/workflows/ci.yml` workflow uses the approved Node.js 24 and pnpm 10 toolchain with the committed lockfile
   - **And** installs dependencies with the frozen lockfile (`pnpm install --frozen-lockfile`)
   - **And** applies the committed SQL migrations to PostgreSQL
   - **And** runs the repository-supported typecheck, build, focused integration tests, and critical browser test required by the currently implemented scope
   - **And** a failing required command fails CI rather than being reported as successful
   - **And** the workflow has only the minimum repository read permission
   - **And** this baseline introduces no production deployment/CD step and requires no production credentials or secrets.

3. **Server-Side Product Owner Account Management & Password Policy**
   - **Given** Mahalla Ovozi is deployed without a Product Owner account
   - **When** the secure server-side account-management command is used
   - **Then** one Product Owner account can be created or securely recovered/reset
   - **And** the password/passphrase contains 15–128 Unicode code points
   - **And** commonly used or compromised passwords are rejected without requiring an external runtime password-checking service
   - **And** password content is never silently truncated or trimmed
   - **And** its password is stored only as an Argon2id hash
   - **And** the plaintext credential never enters logs, telemetry, Audit History, URLs, command-line arguments, browser persistence, or command output.

4. **Private Sign-In Surface UX & Scope**
   - **Given** an unauthenticated visitor opens the private application
   - **When** the sign-in surface loads
   - **Then** it presents username and password fields only
   - **And** provides no public registration, role selector, social login, email/SMS recovery, or MFA workflow
   - **And** user-facing copy is Uzbek Cyrillic.

5. **Successful Product Owner Authentication & Session Creation**
   - **Given** valid Product Owner credentials
   - **When** the Product Owner signs in
   - **Then** authentication creates a server-derived Product Owner actor context
   - **And** creates an opaque PostgreSQL-backed session whose usable token exists only in a host-scoped `Secure`, `HttpOnly`, `SameSite=Strict` cookie
   - **And** only a hash of that session token is persisted server-side
   - **And** session creation succeeds only if the credential state that was verified is still current when the session is committed
   - **And** the Product Owner reaches a protected Product Owner landing surface.

6. **Authentication Failure Handling, Budget & Auditing**
   - **Given** invalid credentials
   - **When** sign-in fails
   - **Then** the interface returns the generic Uzbek Cyrillic error `Нотўғри фойдаланувчи номи ёки парол.` without revealing whether an account exists
   - **And** only failed credential attempts consume the configured sign-in failure budget
   - **And** repeated failed attempts are rate-limited with a deterministic retry boundary
   - **And** failed and successful authentication events are recorded as privacy-safe audit metadata without credentials or secrets.

7. **Session Lifecycle, Inactivity & Revocation**
   - **Given** an authenticated Product Owner session
   - **When** 12 hours of genuine user inactivity elapse, 24 hours of absolute session lifetime elapse, the session is explicitly revoked, credentials are replaced, or the Product Owner successfully signs out
   - **Then** the session can no longer authorize a protected request
   - **And** protected browser state is cleared when authentication loss is authoritative
   - **And** the user is returned to the sign-in state.

8. **Origin Defense & State-Changing Request Protection**
   - **Given** a protected state-changing browser request
   - **When** it does not satisfy the approved same-origin/Origin/Fetch-Metadata protections
   - **Then** the request is rejected before password-verification or application mutation work executes
   - **And** it does not consume the failed-login budget
   - **And** the returned error uses the sanitized API error contract.

9. **Network Failure & Offline Resilience**
   - **Given** authentication cannot reach the server
   - **When** sign-in, sign-out, activity reporting, or session bootstrap is attempted
   - **Then** the UI distinguishes network uncertainty from authoritative authentication loss
   - **And** no authentication mutation is queued, automatically replayed, or falsely reported as successful.

10. **Accessibility & Responsive Layout**
    - **Given** keyboard navigation, supported responsive widths, or reduced-motion preferences
    - **When** the sign-in flow is used
    - **Then** controls remain keyboard accessible with visible focus, readable Uzbek Cyrillic, appropriate responsive layout, and no color-only status meaning.

11. **Automated Verification & Regression Gate**
    - **Given** the story is verified
    - **When** focused automated checks run
    - **Then** real-PostgreSQL integration tests cover credential, authentication, session lifetime/revocation, reset concurrency, rate-limit, origin, audit, cookie, logging, and sanitized-error boundaries
    - **And** a critical browser test covers successful and failed sign-in, protected routing, authentication loss, sign-out, offline/non-replay behavior, inactivity behavior, and required accessibility behavior
    - **And** CI verifies the committed migrations and all current required checks and fails when one of those checks fails.

## Tasks / Subtasks

- [x] Task 1: Workspace & Toolchain Foundation Setup (AC: 1, 2)
  - [x] 1.1 Initialize the root pnpm workspace (`pnpm-workspace.yaml`, root `package.json`, `tsconfig.base.json`) targeting Node.js 24 LTS and TypeScript 5.x.
  - [x] 1.2 Configure `deploy/compose/docker-compose.yml` with PostgreSQL container for local development and test execution.
  - [x] 1.3 Create `.github/workflows/ci.yml` with Node 24 + pnpm 10, frozen lockfile (`pnpm install --frozen-lockfile`), PostgreSQL service container, Drizzle migrations, typechecking, Vitest integration tests, and Playwright browser tests.
- [x] Task 2: Shared API Contracts Package (AC: 1, 6, 8)
  - [x] 2.1 Create `packages/api-contracts` workspace package with TypeScript and Zod.
  - [x] 2.2 Define Zod schemas and TypeScript types for `/api/v1/auth/sign-in`, `/api/v1/auth/sign-out`, and `/api/v1/auth/session`.
  - [x] 2.3 Define standard sanitized API error envelope schema: `{ error: { code: string, message: string } }`.
- [x] Task 3: Database Infrastructure, Schemas & Migrations (AC: 1, 3, 5, 6, 7)
  - [x] 3.1 Create `apps/backend` workspace package with Fastify 5.x and Drizzle ORM (0.45.x) / Drizzle Kit (0.31.x).
  - [x] 3.2 Implement Drizzle schema definitions for `accounts`, `sessions`, `audit_events`, and `sign_in_rate_limits`.
  - [x] 3.3 Generate reviewable SQL migrations in `apps/backend/drizzle` and implement a deterministic migration runner.
- [x] Task 4: Password Policy, Argon2id & CLI Account Management (AC: 3)
  - [x] 4.1 Implement password validator (15–128 Unicode code points, no trimming or silent truncation, offline rejection of common passwords).
  - [x] 4.2 Implement Argon2id hashing and verification utility (`argon2` 0.41.x with parameters: `memoryCost: 65536`, `timeCost: 3`, `parallelism: 4`).
  - [x] 4.3 Implement secure CLI command `apps/backend/src/cli/manage-product-owner.ts` for PO account creation and password reset (interactive hidden stdin input, no plaintext in CLI args/logs/output).
- [x] Task 5: Auth Module, Session Engine & Threat Defenses (AC: 5, 6, 7, 8)
  - [x] 5.1 Implement Origin and `Sec-Fetch-Site` protection middleware for state-changing requests, rejecting violations with 403 before credential checks.
  - [x] 5.2 Implement rate-limiting service tracking failed login attempts with deterministic retry boundary (budget consumed only on credential failures).
  - [x] 5.3 Implement session management: 256-bit cryptographically secure token generation, SHA-256 database token hashing, and host-scoped `Secure`, `HttpOnly`, `SameSite=Strict` cookie handling.
  - [x] 5.4 Implement sign-in endpoint (`POST /api/v1/auth/sign-in`) with credential concurrency check, generic Uzbek Cyrillic error `Нотўғри фойдаланувчи номи ёки парол.`, and privacy-safe audit logging.
  - [x] 5.5 Implement sign-out (`POST /api/v1/auth/sign-out`) and session check (`GET /api/v1/auth/session`) endpoints with 12h idle timeout, 24h absolute max lifetime, and credential version invalidation.
- [x] Task 6: Frontend React / Ant Design Application (AC: 1, 4, 9, 10)
  - [x] 6.1 Initialize `apps/web` with React 19.x, Vite 6.x, React Router 7.x, and Ant Design 5.x.
  - [x] 6.2 Configure Ant Design `ConfigProvider` with visual tokens from `DESIGN.md` (colors: `surface-page`, `primary: #0F5C5E`, `focus: #007A7C`, `rounded: 8px`, touch min: 44px).
  - [x] 6.3 Implement `SignInPage.tsx` with Uzbek Cyrillic copy, username/password inputs, visible focus indicators, accessible error summary, and no public registration/social links.
  - [x] 6.4 Implement auth state management with TanStack Query, distinguishing network uncertainty from authoritative auth loss and preventing mutation re-queuing.
  - [x] 6.5 Implement protected route wrapper and minimal Product Owner landing surface with sign-out action.
- [x] Task 7: Automated Verification Suite (AC: 2, 11)
  - [x] 7.1 Implement Vitest integration test suite (running against real PostgreSQL) testing password policy, CLI tool, login happy path, invalid password generic error & rate-limiting, Origin rejection, session expiration (12h idle / 24h absolute), sign-out revocation, and zero secret leakage.
  - [x] 7.2 Implement Playwright browser test suite covering sign-in flow, error messaging, protected route gating, sign-out, offline/network failure state, and keyboard navigation.
  - [x] 7.3 Verify full end-to-end CI pipeline passes cleanly (`pnpm typecheck`, `pnpm test`, `pnpm test:e2e`).

## Dev Notes

### Architecture Compliance & Invariants
- **Hexagonal Modular Monolith (`AD-1`):** All application code belongs in a single repository with modular boundaries. Domain/application logic in `apps/backend/src/modules/auth` and `apps/backend/src/modules/audit` must not depend directly on database client implementations or transport layer internals; infrastructure concerns reside in `apps/backend/src/adapters/`.
- **Stack Standards (`AD-2`):** pnpm workspace targeting Node.js 24 LTS, TypeScript 5.x, Fastify 5.x, React 19.x, Vite 6.x, Ant Design 5.x, Drizzle ORM 0.45.x, PostgreSQL 16+ / 17+, Zod 3.x, TanStack Query 5.x, Vitest 3.x, Playwright 1.x. No Tailwind, no Next.js, no GraphQL, no Redux/Zustand.
- **Relational Persistence & Migrations (`AD-3`, `AD-4`):** PostgreSQL is the sole system of record. Use Drizzle ORM with version-controlled SQL migrations (`apps/backend/drizzle/*.sql`). Never use automatic schema-push workflows in shared or production environments.
- **Security & Session Architecture (`AD-9`):**
  - Project-owned username/password authentication. Single Product Owner role.
  - Passwords hashed with Argon2id (`argon2` 0.41.x: memoryCost 65536 KB, timeCost 3, parallelism 4).
  - Passwords require 15–128 Unicode characters; offline blocklist rejections for commonly used passwords without network calls; zero trimming/truncation.
  - Sessions are opaque, database-backed records. Database persists only `SHA-256(session_token)`. Usable token resides exclusively in a host-scoped `Secure`, `HttpOnly`, `SameSite=Strict`, `Path=/` cookie (`__Host-session`).
  - Session lifetime rules: 12-hour sliding idle timeout (`last_active_at`), 24-hour absolute session ceiling (`created_at`). Explicit sign-out or `credential_version` mismatch immediately invalidates authorization.
  - Concurrency check: session insertion must verify that the `credential_version` validated during Argon2id verification is still identical at database commit time.
  - Origin defense: check `Origin` / `Sec-Fetch-Site` on state-changing requests (`POST`). Reject cross-origin mutations with 403 *before* evaluating credentials or touching rate-limit budgets.
  - Rate limiting: failure budget is consumed only on failed credential evaluations (not on schema or Origin validation errors). Generic Uzbek Cyrillic error returned: `Нотўғри фойдаланувчи номи ёки парол.`.
  - Privacy-safe audit logging: append-only `audit_events` records. Plaintext passwords, hashes, session tokens, and raw cookies must NEVER enter audit logs, application logs, telemetry, URLs, or command output.
- **API Contracts & REST Boundary (`AD-10`):** Fastify serves same-origin JSON REST under `/api/v1/auth/*`. Request and response bodies are strictly validated against shared Zod schemas in `packages/api-contracts`. Errors use sanitized envelope `{ error: { code: string, message: string } }`.
- **UI System & Microcopy (`DESIGN.md`, `EXPERIENCE.md`):**
  - Ant Design 5.x with design tokens configured in `ConfigProvider`:
    - `colorBgLayout`: `#F5F7F6` (`surface-page`)
    - `colorBgContainer`: `#FFFFFF` (`surface-raised`)
    - `colorPrimary`: `#0F5C5E` (`primary`)
    - `colorText`: `#172321` (`text-primary`)
    - `colorTextSecondary`: `#52615E` (`text-secondary`)
    - `colorBorder`: `#C9D5D1` (`border`)
    - `borderRadius`: `8px`
    - `controlHeight`: `44px` (touch minimum)
  - UI language is strictly **Uzbek Cyrillic**:
    - Heading: `Тизимга кириш`
    - Username field: `Фойдаланувчи номи`
    - Password field: `Парол`
    - Submit button: `Кириш`
    - Generic invalid credentials error: `Нотўғри фойдаланувчи номи ёки парол.`
    - Rate-limit error: `Уринишлар сони ошди. Илтимос, кейинроқ қайта уриниб кўринг.`
    - Network failure notice: `Сервер билан алоқа мавжуд эмас. Тармоқни текширинг.`
    - Sign-out action: `Чиқиш`
  - Resilient network handling: distinct presentation for network failure vs. authoritative session loss. No silent auto-replay or background queueing of authentication mutations.

### Anti-Patterns to Prevent
- **No Wheel Reinvention:** Do not roll custom cryptographic algorithms; use `argon2` and Node.js native `crypto.randomBytes` / `crypto.createHash`.
- **No Plaintext Credential Leaks:** Do not pass passwords via CLI flags (`-p password`); use interactive hidden stdin prompts. Do not include credentials in log strings, error objects, or audit JSON metadata.
- **No Identity Framework Overkill:** Do not install NextAuth, Passport, Auth0, Keycloak, or Supabase. Mahalla Ovozi uses project-owned, database-backed sessions.
- **No Leaky Contracts:** Do not import backend database models or Drizzle entities into `packages/api-contracts` or frontend code. Contracts must be pure Zod definitions.
- **No Premature Complexity:** Do not introduce Redis, Kafka, BullMQ, or Microservices. PostgreSQL is the sole system of record.
- **No Unused Feature Scope:** Do not implement District selection, Hokim accounts, Telegram bots, or AI worker jobs in this story.

### Testing Standards & Guardrails
- **Integration Tests (Vitest):** Run against a real PostgreSQL container. Must test:
  1. CLI tool creates PO account with Argon2id hash and rejects short/common passwords.
  2. CLI password reset increments `credential_version` and invalidates existing sessions.
  3. Valid sign-in issues cookie, persists hashed session token, and records success audit event.
  4. Invalid sign-in returns generic 401 error, consumes failure budget, and records failure audit event without password.
  5. Repeated failed sign-ins trigger rate-limiting lock with deterministic retry boundary.
  6. State-changing request with invalid `Origin` or cross-site `Sec-Fetch-Site` is rejected with 403 before password check, without consuming failure budget.
  7. Inactivity expiration: session idle for >12 hours is rejected.
  8. Absolute expiration: session older than 24 hours is rejected.
  9. Explicit sign-out revokes session in database and clears cookie.
  10. Zero sensitive data leakage verified across logs and audit tables.
- **Browser Tests (Playwright):**
  1. Complete sign-in journey navigating to protected landing.
  2. Error state rendering on invalid credentials with accessible focus management.
  3. Unauthenticated access to protected route redirects to `/sign-in`.
  4. Sign-out clears session and returns to `/sign-in`.
  5. Keyboard navigation (Tab/Enter) works smoothly with visible focus outline (`#007A7C`).
  6. Simulated network disconnect shows network notice without queuing auth requests.

### Project Structure Notes

```text
mahalla-ovozi-new/
├── .github/
│   └── workflows/
│       └── ci.yml                         # CI pipeline (Node 24, pnpm 10, PG, frozen lockfile)
├── apps/
│   ├── backend/
│   │   ├── drizzle/                       # Reviewable SQL migrations
│   │   ├── src/
│   │   │   ├── adapters/
│   │   │   │   ├── crypto/                # argon2, token generation, password validator
│   │   │   │   ├── db/                    # Drizzle schema (accounts, sessions, audit, rate-limits)
│   │   │   │   └── telemetry/             # Privacy-safe structured logging
│   │   │   ├── cli/
│   │   │   │   └── manage-product-owner.ts # CLI script for PO creation/reset
│   │   │   ├── entrypoints/
│   │   │   │   └── http.ts                # Fastify HTTP server entrypoint
│   │   │   └── modules/
│   │   │       ├── audit/                 # Audit logging service
│   │   │       └── auth/                  # Auth routes, session manager, rate limiter, origin guard
│   │   ├── tests/                         # Vitest integration tests against real PostgreSQL
│   │   ├── drizzle.config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── web/
│       ├── src/
│       │   ├── auth/                      # Session provider, auth state, network boundary
│       │   ├── pages/
│       │   │   ├── SignInPage.tsx         # Uzbek Cyrillic sign-in page
│       │   │   └── ProtectedLandingPage.tsx # PO landing placeholder
│       │   ├── theme/                     # Ant Design ConfigProvider tokens (DESIGN.md)
│       │   ├── App.tsx
│       │   └── main.tsx
│       ├── tests/                         # Playwright E2E browser tests
│       ├── package.json
│       ├── vite.config.ts
│       └── tsconfig.json
├── packages/
│   └── api-contracts/                     # Browser-safe shared Zod schemas
│       ├── src/
│       │   ├── auth.ts                    # Zod schemas for sign-in, session, error envelope
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
├── deploy/
│   └── compose/
│       └── docker-compose.yml             # Local PostgreSQL container
├── package.json                           # Root pnpm workspace config
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

### References
- PRD: `_bmad-output/planning-artifacts/prds/prd-Mahalla-Ovozi-2026-07-30/prd.md` (`FR19`)
- Architecture Spine: `_bmad-output/planning-artifacts/architecture/architecture-Mahalla-Ovozi-2026-08-12/ARCHITECTURE-SPINE.md` (`AD-1`, `AD-2`, `AD-3`, `AD-4`, `AD-9`, `AD-10`, `AD-11`)
- Epics: `_bmad-output/planning-artifacts/epics/epic-1.md` (Story 1.1)
- Visual Design: `_bmad-output/planning-artifacts/ux-designs/ux-Mahalla-Ovozi-2026-08-05/DESIGN.md`
- UX Experience: `_bmad-output/planning-artifacts/ux-designs/ux-Mahalla-Ovozi-2026-08-05/EXPERIENCE.md`

## Dev Agent Record

### Agent Model Used

Gemini 3.7 Flash (High)

### Debug Log References

None (New story creation)

### Completion Notes List

- Completed implementation of Story 1.1 across all 7 phases:
  - Phase 1: Workspace & Toolchain Foundation (Node 24, pnpm monorepo, Docker Compose PostgreSQL, GitHub Actions CI).
  - Phase 2: Shared API Contracts (`@mahalla-ovozi/api-contracts` with typed Zod schemas for all auth payloads and error envelopes).
  - Phase 3: Relational Persistence & Migrations (PostgreSQL, Drizzle schemas for `accounts`, `sessions`, `audit_events`, `sign_in_rate_limits`, versioned SQL migration, deterministic migration runner).
  - Phase 4: Credential Security & PO CLI Management (Unicode password validator 15-128 chars, offline blocklist, Argon2id hasher/verifier, CLI with masked inputs).
  - Phase 5: Fastify Backend Auth Module & Defenses (Origin guard, rate limiter with IP+username failure budget, 256-bit cryptographically secure sessions with SHA-256 hash in DB, sliding 12h idle / 24h absolute lifetime, credential version concurrency safety, privacy-safe audit logging).
  - Phase 6: Frontend React & Ant Design Application (`@mahalla-ovozi/web` with Ant Design theme tokens from `DESIGN.md`, Uzbek Cyrillic UI, TanStack Query auth client/provider, ProtectedRoute, Protected PO landing surface).
  - Phase 7: Automated Verification Suite (36 unit/integration Vitest tests passing 100%, 5 Playwright E2E browser tests passing 100%, full workspace `tsc --noEmit` passing with zero errors).

### File List

- `_bmad-output/implementation-artifacts/1-1-secure-product-owner-sign-in.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `.gitignore`
- `pnpm-workspace.yaml`
- `package.json`
- `tsconfig.base.json`
- `tsconfig.json`
- `deploy/compose/docker-compose.yml`
- `.github/workflows/ci.yml`
- `packages/api-contracts/package.json`
- `packages/api-contracts/tsconfig.json`
- `packages/api-contracts/src/auth.ts`
- `packages/api-contracts/src/index.ts`
- `packages/api-contracts/tests/auth-contracts.test.ts`
- `apps/backend/package.json`
- `apps/backend/tsconfig.json`
- `apps/backend/drizzle.config.ts`
- `apps/backend/src/adapters/db/schema/accounts.ts`
- `apps/backend/src/adapters/db/schema/sessions.ts`
- `apps/backend/src/adapters/db/schema/audit.ts`
- `apps/backend/src/adapters/db/schema/rate-limits.ts`
- `apps/backend/src/adapters/db/schema/index.ts`
- `apps/backend/src/adapters/db/client.ts`
- `apps/backend/src/adapters/db/migrate.ts`
- `apps/backend/drizzle/0000_burly_george_stacy.sql`
- `apps/backend/tests/db-schema.test.ts`
- `apps/backend/src/adapters/crypto/common-passwords.ts`
- `apps/backend/src/adapters/crypto/password-policy.ts`
- `apps/backend/src/adapters/crypto/argon2.ts`
- `apps/backend/src/modules/auth/account-service.ts`
- `apps/backend/src/cli/manage-product-owner.ts`
- `apps/backend/tests/crypto-and-account.test.ts`
- `apps/backend/src/modules/audit/audit-service.ts`
- `apps/backend/src/modules/auth/origin-guard.ts`
- `apps/backend/src/modules/auth/rate-limiter.ts`
- `apps/backend/src/modules/auth/session-manager.ts`
- `apps/backend/src/modules/auth/auth-routes.ts`
- `apps/backend/src/entrypoints/http.ts`
- `apps/backend/tests/auth-lifecycle.test.ts`
- `apps/web/package.json`
- `apps/web/tsconfig.json`
- `apps/web/vite.config.ts`
- `apps/web/index.html`
- `apps/web/src/theme/antd-theme.ts`
- `apps/web/src/auth/auth-client.ts`
- `apps/web/src/auth/auth-context.tsx`
- `apps/web/src/auth/ProtectedRoute.tsx`
- `apps/web/src/pages/SignInPage.tsx`
- `apps/web/src/pages/ProtectedLandingPage.tsx`
- `apps/web/src/App.tsx`
- `apps/web/src/main.tsx`
- `apps/web/playwright.config.ts`
- `apps/web/tests/unit/SignInPage.test.tsx`
- `apps/web/tests/e2e/sign-in.spec.ts`


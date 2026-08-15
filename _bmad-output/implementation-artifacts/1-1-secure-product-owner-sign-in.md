# Story 1.1: Secure Product Owner Sign-In

Status: ready-for-dev

## Story

As the **Product Owner**,
I want to sign in securely to the private Mahalla Ovozi application,
So that I can access the Product Owner surface without exposing the system to public or unauthorized access.

**FRs:** FR19.

## Acceptance Criteria

1. **Given** the greenfield repository
   **When** Story 1.1 is implemented
   **Then** the application foundation uses the approved pnpm workspace, TypeScript/Node, Fastify, React/Vite, Ant Design, PostgreSQL/Drizzle, shared Zod REST contracts, and the architecture's modular-monolith boundaries
   **And** only schema/infrastructure required for this story is introduced.

2. **Given** the greenfield application foundation is established
   **When** changes are proposed for merge into `main` or committed to `main`
   **Then** a minimal `.github/workflows/ci.yml` workflow uses the approved Node.js 24 and pnpm 11 toolchain with the committed lockfile
   **And** installs dependencies with the frozen lockfile
   **And** applies the committed SQL migrations to PostgreSQL
   **And** runs the repository-supported typecheck, build, focused integration tests, and critical browser test required by the currently implemented scope
   **And** a failing required command fails CI rather than being reported as successful
   **And** the workflow has only the minimum repository read permission
   **And** this baseline introduces no production deployment/CD step and requires no production credentials or secrets.

3. **Given** Mahalla Ovozi is deployed without a Product Owner account
   **When** the secure server-side account-management command is used
   **Then** one Product Owner account can be created or securely recovered/reset
   **And** the password/passphrase contains 15–128 Unicode code points
   **And** commonly used or compromised passwords are rejected without requiring an external runtime password-checking service
   **And** password content is never silently truncated or trimmed
   **And** the password is stored only as an Argon2id hash
   **And** the plaintext credential never enters logs, telemetry, Audit History, URLs, command-line arguments, browser persistence, or command output.

4. **Given** an unauthenticated visitor opens the private application
   **When** the sign-in surface loads
   **Then** it presents username and password fields only
   **And** provides no public registration, role selector, social login, email/SMS recovery, or MFA workflow
   **And** user-facing copy is Uzbek Cyrillic.

5. **Given** valid Product Owner credentials
   **When** the Product Owner signs in
   **Then** authentication creates a server-derived Product Owner actor context
   **And** creates an opaque PostgreSQL-backed session whose usable token exists only in a host-scoped `Secure`, `HttpOnly`, `SameSite=Strict` cookie
   **And** only a hash of that session token is persisted server-side
   **And** session creation succeeds only if the credential state that was verified is still current when the session is committed
   **And** the Product Owner reaches a protected Product Owner landing surface.

6. **Given** invalid credentials
   **When** sign-in fails
   **Then** the interface returns the generic Uzbek Cyrillic error `Нотўғри фойдаланувчи номи ёки парол.` without revealing whether an account exists
   **And** only failed credential attempts consume the configured sign-in failure budget
   **And** repeated failed attempts are rate-limited with a deterministic retry boundary
   **And** failed and successful authentication events are recorded as privacy-safe audit metadata without credentials or secrets.

7. **Given** an authenticated Product Owner session
   **When** 12 hours of genuine user inactivity elapse, 24 hours of absolute session lifetime elapse, the session is explicitly revoked, credentials are replaced, or the Product Owner successfully signs out
   **Then** the session can no longer authorize a protected request
   **And** protected browser state is cleared when authentication loss is authoritative
   **And** the user is returned to the sign-in state.

8. **Given** a protected state-changing browser request
   **When** it does not satisfy the approved same-origin/Origin/Fetch-Metadata protections
   **Then** the request is rejected before password-verification or application mutation work executes
   **And** it does not consume the failed-login budget
   **And** the returned error uses the sanitized API error contract.

9. **Given** authentication cannot reach the server
   **When** sign-in, sign-out, activity reporting, or session bootstrap is attempted
   **Then** the UI distinguishes network uncertainty from authoritative authentication loss
   **And** no authentication mutation is queued, automatically replayed, or falsely reported as successful.

10. **Given** keyboard navigation, supported responsive widths, or reduced-motion preferences
    **When** the sign-in flow is used
    **Then** controls remain keyboard accessible with visible focus, readable Uzbek Cyrillic, appropriate responsive layout, and no color-only status meaning.

11. **Given** the story is verified
    **When** focused automated checks run
    **Then** real-PostgreSQL integration tests cover credential, authentication, session lifetime/revocation, reset concurrency, rate-limit, origin, audit, cookie, logging, and sanitized-error boundaries
    **And** a critical browser test covers successful and failed sign-in, protected routing, authentication loss, sign-out, offline/non-replay behavior, inactivity behavior, and required accessibility behavior
    **And** CI verifies the committed migrations and all current required checks and fails when one of those checks fails.

## Tasks / Subtasks

### 1. Bootstrap the Story 1.1 workspace and CI foundation
- Create the pnpm workspace and committed lockfile.
- Add strict shared TypeScript configuration.
- Create only:
  - `apps/backend`
  - `apps/web`
  - `packages/api-contracts`
- Add repository-supported typecheck, build, integration-test, and focused browser-test scripts.
- Add one minimal `.github/workflows/ci.yml` verification job.
- Trigger CI for `pull_request` targeting `main` and `push` to `main`.
- Use Node.js 24 and pnpm 11.
- Install with the frozen lockfile.
- Set minimum workflow permissions, including `contents: read` and no unnecessary write permission.
- Pin external GitHub Actions to full commit SHAs; comments may retain the human-readable release tag/version.
- Provide PostgreSQL 18 for integration/browser verification in CI.
- Start verification from an empty test database and apply the committed SQL migration(s); do not use `drizzle-kit push` as the CI migration-verification path.
- Install only Chromium and the required Playwright OS dependencies for the critical browser test.
- A failed required command must fail the workflow; do not use `continue-on-error`, `|| true`, or equivalent masking around required checks.
- Do not add production deployment/CD, production credentials/secrets, PATs, coverage thresholds, CodeQL/Sonar, test sharding, or a platform/database/browser matrix.
- Do not create unused architectural module placeholders.

**AC:** 1, 2, 11

### 2. Add the Story 1.1 persistence model and reviewable migration
- Define Drizzle TypeScript schemas owned by the backend package.
- Add version-controlled, reviewable SQL migration(s).
- Create only the persistence needed for:
  - authentication accounts
  - opaque sessions
  - minimal privacy-safe authentication audit events
- Use PostgreSQL `timestamptz` for instants.
- Use opaque application identifiers.
- Maintain database naming in `snake_case`.
- Do not expose Drizzle/database row shapes through the REST API.

Minimum conceptual model:

`auth_accounts`
- `id`
- `username`
- `password_hash`
- `credential_version`
- `role`
- `created_at`
- `updated_at`

`auth_sessions`
- `id`
- `account_id`
- `token_hash`
- `created_at`
- `last_activity_at`
- `absolute_expires_at`
- `revoked_at`

`audit_events`
- `id`
- `event_type`
- `outcome`
- nullable authenticated actor/account identifier where appropriate
- nullable request/correlation identifier where available
- `occurred_at`

Database invariants and guardrails:
- Canonical `username` is globally unique at the database boundary.
- Enforce at most one `PRODUCT_OWNER` account with an appropriate database partial unique constraint/index.
- `token_hash` is unique; persist no plaintext session-token column.
- Index `auth_sessions.account_id` for account-wide revocation/lookups.
- Audit actor references are nullable and, if enforced by FK, use `ON DELETE SET NULL`; never cascade account deletion into authentication audit-history deletion.
- Do not make the account model prevent later `HOKIM` support, but do not add Hokim-specific schema/behavior in Story 1.1.
- Do not introduce District schema yet.
- Do not add a generic unbounded audit JSON blob that could absorb credentials, resident content, request objects, or arbitrary errors.

**AC:** 1, 3, 5, 6, 7

### 3. Implement secure Product Owner provisioning/recovery
- Add a server-side maintenance entrypoint for creating or replacing/resetting the Product Owner account.
- Apply the credential contract at provisioning/reset:
  - 15–128 Unicode code points
  - normalize consistently with NFC before hashing/verification
  - allow spaces and Unicode
  - no arbitrary uppercase/lowercase/digit/symbol composition rules
  - never trim or truncate password content
  - reject commonly used/compromised values through a local/offline blocklist; do not add an external password-breach service dependency for MVP
- Hash passwords using architecture-approved Argon2id with explicit parameters meeting or exceeding current accepted password-storage guidance.
- Never accept the plaintext password as a positional or flag command-line argument.
- Read secret material through stdin/TTY/another non-argv secret-input boundary.
- If interactive TTY input is implemented, secret input must not be echoed.
- Never print the plaintext credential.
- Never write the credential to logs, telemetry, Audit History, URLs, browser state, or command output.
- Calculate the new Argon2id hash before opening the database transaction.
- Product Owner reset/replacement must atomically:
  - replace `password_hash`
  - increment `credential_version`
  - revoke all existing Product Owner sessions
  - append `AUTH_CREDENTIAL_RESET`
  - commit all-or-nothing
- Creating/resetting the Product Owner must not create Districts or other future-domain records.

**AC:** 3, 7

### 4. Implement the authentication/session application boundary
- Keep auth/application logic project-owned and functionally composed.
- Define narrow project-owned capabilities/ports for account lookup, credential mutation, session operations, password/session cryptography, audit append, and the transaction boundary required by atomic security operations.
- Do not expose generic CRUD repositories or build an enterprise Unit-of-Work abstraction merely to satisfy the architecture terminology.
- Do not make application/domain code depend directly on Drizzle, Fastify, browser APIs, PostgreSQL client objects, or provider-specific infrastructure.
- On successful sign-in:
  - derive the account and role server-side
  - read the credential snapshot including `password_hash` and `credential_version`
  - perform Argon2 verification outside a long database transaction
  - generate a new cryptographically random opaque session token of at least 32 random bytes
  - persist only a deterministic SHA-256 hash of the high-entropy token
  - never return the usable token in JSON
  - immediately before session insertion, use a short transaction to re-read/confirm the credential version is unchanged
  - if the version changed, create no session and return the generic authentication failure
  - if unchanged, insert the session and append `AUTH_LOGIN_SUCCEEDED` in the same transaction
- SHA-256 is appropriate for hashing the high-entropy random bearer token; do not use SHA-256 for passwords.
- Every successful sign-in creates a fresh independent session; legitimate multi-device sessions remain possible.
- Validate sessions from authoritative PostgreSQL/server time.
- A session is invalid when:
  - it does not exist
  - it has been revoked
  - 12 hours have elapsed since the last acknowledged genuine user activity
  - its persisted 24-hour `absolute_expires_at` has been reached
- `GET /api/v1/auth/session`, background queries, polling, and ordinary refetches do not update `last_activity_at`.
- Only the explicit authenticated user-activity boundary may refresh `last_activity_at` after the session is authoritatively validated.
- Password reset/replacement revokes all existing sessions atomically with the credential change and audit event.
- Sign-out revokes the current active session and appends its audit event atomically when an active session exists.
- No background session cleanup worker is required for Story 1.1.

**AC:** 5, 7

### 5. Expose the minimal Fastify authentication REST contract
Implement:

- `POST /api/v1/auth/sign-in`
- `GET /api/v1/auth/session`
- `POST /api/v1/auth/sign-out`
- `POST /api/v1/auth/activity`

Use project-owned Zod schemas from `packages/api-contracts`.

Input rules:
- Username canonicalization: trim surrounding whitespace, normalize with NFC, preserve case, require 1–64 Unicode code points after canonicalization.
- Password: normalize with NFC, require 15–128 Unicode code points, never trim.
- Authentication request bodies use a route-specific 8 KiB maximum and reject unknown credential fields.
- Reject an oversized authentication body before Argon2/password-verification work.

Expected success behavior:
- `POST /api/v1/auth/sign-in` → `200`, actor summary only, and set the opaque session cookie.
- `GET /api/v1/auth/session` → `200`, authoritative server-derived actor summary, without touching user-activity time.
- `POST /api/v1/auth/sign-out` → idempotent `204`; revoke the matching active session when present and clear the matching browser cookie even for stale/missing sessions.
- `POST /api/v1/auth/activity` → `204` after validating the session and recording genuine user activity.
- Authentication endpoint responses use `Cache-Control: no-store`.
- Never return the usable session token in JSON.

Minimum actor summary:
- opaque actor/account ID
- `PRODUCT_OWNER` role
- username

Minimal sanitized API error envelope:

```json
{
  "error": {
    "code": "MACHINE_READABLE_CODE",
    "message": "Safe user-facing message"
  }
}
```

Lock the Story 1.1 error/status semantics:
- `401 INVALID_CREDENTIALS` — wrong/nonexistent username or wrong password
- `401 UNAUTHENTICATED` — missing, expired, or revoked session
- `403 FORBIDDEN` — reserved for an authenticated authorization denial when a later protected capability requires it
- `403 REQUEST_ORIGIN_REJECTED` — same-origin/Fetch-Metadata failure
- `400 VALIDATION_ERROR` — invalid request shape/value
- `429 RATE_LIMITED` — sign-in failure budget exhausted; include `Retry-After`
- `500 INTERNAL_ERROR` — unexpected server failure

Do not expose stack traces, SQL details, Argon2 errors, raw Fastify errors, database rows, or infrastructure/provider objects.

**AC:** 4, 5, 6, 7, 8, 9

### 6. Implement session-cookie protections
- Use a host-only cookie named with the `__Host-` prefix, e.g. `__Host-mahalla_session`.
- Required attributes:
  - `Secure`
  - `HttpOnly`
  - `SameSite=Strict`
  - `Path=/`
- Do not set a `Domain` attribute.
- The raw token exists only at the browser-cookie/HTTP boundary and transiently in server request processing.
- Persist only its hash.
- Clear the cookie using matching scope attributes during sign-out/session invalidation.
- Do not use JWT access tokens, refresh tokens, localStorage, sessionStorage, IndexedDB, or browser-visible bearer tokens for authorization.
- The session does not need a second cookie-signing secret: possession of the unpredictable token plus authoritative server-side hash lookup is the authority boundary.

**AC:** 5, 7

### 7. Implement generic failed-login behavior and rate limiting
- A nonexistent username and a wrong password must produce the exact same public status/error shape/message.
- Exact Uzbek Cyrillic message:
  `Нотўғри фойдаланувчи номи ёки парол.`
- Avoid a trivial timing distinction: when no account exists, execute password verification against a fixed valid dummy Argon2id hash or equivalent constant-work path before returning the generic failure.
- Use the current supported Fastify-5-compatible `@fastify/rate-limit` release selected and locked during implementation; do not implement a custom limiter.
- Approved initial policy:
  - 10 failed credential verifications
  - per 15-minute window
  - keyed by Fastify's resolved client IP
  - in-memory store
  - sign-in route only
- Before Argon2 work, check whether the resolved IP is already limited; if limited, return `429 RATE_LIMITED` immediately.
- Only after credential verification fails does the attempt consume the failure budget.
- Successful authentication does not consume the failure budget.
- The threshold/configuration stays outside domain logic.
- Do not enable broad `trustProxy: true` or manually trust arbitrary `X-Forwarded-For`/`X-Real-IP` values. Future Caddy deployment must configure its trusted proxy/hop boundary explicitly.
- Do not add Redis, PostgreSQL rate-limit tables, CAPTCHA, persistent account lockout, username-based throttling, or distributed limiter infrastructure.
- A restart may reset the in-memory limiter; persistent/distributed throttling is outside current MVP requirements.
- Do not log the rate-limit key or raw client IP into Audit History.

**AC:** 6

### 8. Add privacy-safe authentication auditing and security logging
Authentication audit event types for Story 1.1:
- `AUTH_LOGIN_SUCCEEDED`
- `AUTH_LOGIN_FAILED`
- `AUTH_RATE_LIMITED`
- `AUTH_SIGN_OUT`
- `AUTH_SESSION_REVOKED`
- `AUTH_CREDENTIAL_RESET`

Audit rules:
- Expose an append-only project-owned capability such as `appendAuditEvent(...)`; do not expose generic audit update/delete operations.
- Keep event fields typed/whitelisted and minimal.
- Never include:
  - password/passphrase
  - password hash
  - raw session token
  - session-token hash
  - raw request body
  - `Authorization`, `Cookie`, or `Set-Cookie` values
  - raw client IP
  - attempted anonymous username
  - arbitrary serialized request/error objects
- Anonymous login failures do not need to resolve/store the attempted username.

Application logging rules:
- Do not log authentication request/response bodies or complete request headers.
- Prefer allowlisted structured metadata such as request/correlation ID, HTTP method, route template, status, safe error category, and duration.
- Configure defense-in-depth redaction for authorization/cookie headers and password/session/hash fields so an accidental structured field cannot emit them.

**AC:** 3, 6, 7, 11

### 9. Enforce same-origin browser mutation protections
For browser state-changing requests (`POST`, `PUT`, `PATCH`, `DELETE`):
- Run the Origin/Fetch-Metadata guard before rate-limit checks, Argon2/password verification, session/application mutation, or other expensive security work.
- Compare `Origin` exactly against the configured application origin.
- If `Sec-Fetch-Site` is present, require `same-origin`; treat `same-site` and `cross-site` as untrusted for state-changing Mahalla Ovozi requests.
- If Fetch Metadata is absent, exact Origin verification remains the required fallback; fail closed when the required browser-origin evidence is unavailable.
- Apply the protection to Story 1.1 state-changing browser routes, including sign-in, sign-out, and activity.
- A rejected request must not run Argon2, consume the failed-login budget, create/revoke/touch a session, or execute application mutation logic.
- Return only the sanitized API error contract.
- Do not introduce a separate CSRF-token subsystem for this same-origin MVP architecture.
- Do not add permissive CORS to make local development work; use Vite same-origin proxying for local browser development instead.

**AC:** 8

### 10. Implement the `/sign-in` frontend
Create `/sign-in` using React, Vite, Ant Design, React Router, and TanStack Query.

Visible fields/actions only:
- `Фойдаланувчи номи`
- `Парол`
- `Кириш`

Do not add public registration, role selection, password-recovery UI, social login, MFA, or email/SMS workflows.

Required states:
- initial
- submitting
- invalid credentials
- rate limited
- connection unavailable/authentication unknown
- internal/server failure
- session expired/invalidated
- successful authentication

Behavior:
- Use visible labels and normal keyboard form submission.
- Username input uses `autocomplete="username"`.
- Password input uses `type="password"` and `autocomplete="current-password"`; allow paste and password managers.
- Prevent duplicate submission.
- On `INVALID_CREDENTIALS`, retain the entered username but clear the password.
- Preserve only ephemeral form state; do not persist username/password/session authority in application browser storage.
- Configure auth mutations with `networkMode: "always"` and `retry: false` so an offline attempt fails now instead of becoming queued work.
- Do not use persisted mutations, service-worker/background mutation queues, or reconnect replay.
- Show scoped accessible errors rather than toast-only feedback.
- Keep invalid credentials, rate limiting, network failure, and server failure visibly distinct; one category must not masquerade as another.
- Exact invalid-credential copy remains:
  `Нотўғри фойдаланувчи номи ёки парол.`
- Successful Product Owner authentication always navigates to `/console`; do not implement `returnTo`, arbitrary redirect query parameters, or remembered deep-link restoration in Story 1.1.

**AC:** 4, 6, 9, 10

### 11. Implement authoritative authentication bootstrap and protected routing
- `/console` is the Story 1.1 protected landing route.
- On protected-route/application bootstrap, call `GET /api/v1/auth/session` and treat server state as authoritative.
- Distinguish three outcomes:
  - `200` → authenticated; a valid `PRODUCT_OWNER` may enter `/console`
  - `401 UNAUTHENTICATED` → authoritative authentication loss; clear protected state and replace-navigate to `/sign-in`
  - network/timeout/`5xx` → authentication unknown; do not falsely redirect to sign-in
- On initial load when authentication cannot be confirmed, expose no protected content and show a compact connection-unavailable/retry state.
- If an already-authenticated running app temporarily loses connectivity, previously authorized loaded data may remain visible read-only, mutations/new network-dependent work are blocked, and the cache is not purged merely because the network is unavailable.
- Any protected request that receives authoritative `401 UNAUTHENTICATED` invokes one centralized auth-loss operation that:
  - cancels in-flight protected queries
  - removes protected TanStack Query data
  - clears protected ephemeral/local interaction state
  - clears authenticated actor state
  - replace-navigates to `/sign-in`
- Consume TanStack Query abort signals for cancellable protected requests so cancelled requests cannot later repopulate protected cache.
- Do not indiscriminately call `queryClient.clear()`; remove only explicitly protected auth/console data for this story.
- Do not authorize from browser-selected role or local role state.
- Authentication loss takes privacy precedence; do not wait for a confirmation dialog before hiding/clearing protected state.
- On reconnect, revalidate `/api/v1/auth/session`; do not replay prior failed sign-in, sign-out, or activity mutations.

**AC:** 5, 7, 9

### 12. Implement only the minimal Product Owner landing and truthful sign-out
`/console` exists in Story 1.1 only to prove authenticated Product Owner access.

It may contain:
- `Маҳалла Овози`
- minimal authenticated Product Owner landing content
- `Чиқиш`

Sign-out behavior:
- Attempt `POST /api/v1/auth/sign-out` immediately with `networkMode: "always"` and `retry: false`.
- On `204`, clear protected state and replace-navigate to `/sign-in`.
- If the request cannot reach the server, do not claim successful logout and do not queue it for reconnect; remain in authenticated/unknown state and show a scoped connection error.

Do not implement Story 1.2 navigation or sections:
- Overview
- System Health
- Districts
- Telegram Setup
- Subscriptions
- Hokim Accounts
- AI Operations
- Audit History UI

The audit persistence required by Story 1.1 does not justify building Audit History UI.

**AC:** 1, 5, 7, 9

### 13. Apply Story 1.1 UX/accessibility and genuine-user activity requirements
- User-facing product copy is Uzbek Cyrillic.
- Use Ant Design as the primary UI/component styling system and `ConfigProvider` tokens where appropriate.
- Keep custom CSS narrow; do not add Tailwind or another component/styling framework.
- Keep the MVP light-only unless planning artifacts are changed later.
- Maintain readable Cyrillic glyphs including `Ў ў Қ қ Ғ ғ Ҳ ҳ`.
- Maintain visible keyboard focus, programmatically understandable/reachable status content, no color-only status meaning, usable supported narrow widths, 200% zoom, appropriate touch targets, and reduced-motion behavior.

Genuine-user activity:
- Treat `pointerdown` and `keydown` as sufficient Story 1.1 activity sources.
- Do not count `mousemove`, scrolling alone, polling, TanStack Query/background refetch, `visibilitychange` alone, or merely leaving a page open as genuine activity.
- Throttle `POST /api/v1/auth/activity` to at most approximately once every five minutes after genuine interaction.
- Configure the activity mutation with `networkMode: "always"`, `retry: false`, no persistence, and no reconnect replay.
- `401` from activity invokes centralized auth-loss cleanup; network/`5xx` does not pretend the activity extension succeeded.

Privacy timer:
- Track the last successfully acknowledged activity in ephemeral client state only.
- At the 12-hour local inactivity boundary, immediately hide protected content and revalidate the authoritative server session.
- On `401`, complete auth-loss cleanup.
- On transient network/`5xx`, remain in authentication-unknown state with protected content hidden until authority can be re-established.
- The client timer is a privacy/UI mechanism only; server-side session timestamps remain the security authority.

**AC:** 7, 9, 10

### 14. Add focused backend integration verification
Use Vitest with a real PostgreSQL 18 test boundary. Do not replace core persistence/security behavior with mocks.

Run the core integration suite against a freshly migrated database and keep it sequential for Story 1.1 unless measured need justifies parallel database isolation.

Cover at minimum:

Account/password:
- Product Owner provisioning
- Product Owner singleton database invariant
- canonical username uniqueness
- `<15` and `>128` password rejection
- approved Unicode/space/NFC behavior and no silent trimming/truncation
- local common/compromised-password rejection
- password stored as an Argon2id hash rather than plaintext
- real Argon2id adapter verification

Authentication/rate limiting:
- valid sign-in
- nonexistent username and incorrect password produce identical public `401 INVALID_CREDENTIALS` behavior
- nonexistent account executes the dummy verification path
- successful sign-in does not consume the failure budget
- ten failed credential attempts consume the configured budget
- the following attempt receives `429 RATE_LIMITED` with `Retry-After`
- a request already rate-limited does not execute Argon2 verification

Sessions/concurrency:
- session token itself is never stored
- token-hash uniqueness/lookup
- independent multi-device sessions
- `GET /auth/session` does not touch `last_activity_at`
- valid `/auth/activity` updates `last_activity_at`
- 12-hour inactivity expiry
- 24-hour absolute expiry even with recent activity
- explicit session revocation
- sign-out revokes the current session
- stale/missing repeated sign-out remains idempotent `204`
- credential reset updates the hash/version and revokes existing sessions atomically
- one deterministic reset-vs-login race test: pause a controlled password-verifier test double after reading credential version 1, commit a real-PostgreSQL reset to version 2, resume verification, and prove no session is created; normal integration tests still exercise real Argon2id

HTTP/security/audit/logging:
- required session-cookie attributes and no `Domain`
- usable session token absent from JSON
- `Cache-Control: no-store` on authentication responses
- oversized auth body rejected before Argon2 work
- locked HTTP/error-code mapping and sanitized unexpected errors
- trusted Origin request accepted
- rejected/missing Origin behavior
- rejected `same-site`/`cross-site` `Sec-Fetch-Site`
- origin rejection executes no mutation, Argon2 work, or failed-login budget increment
- all required audit event types are append-only and contain no prohibited fields
- captured structured logs contain no password, credential body, cookies, raw session token, token hash, or password hash

Do not wait 12 or 24 real hours. Set persisted timestamps around deterministic validity boundaries and avoid brittle millisecond-perfect wall-clock assertions.

**AC:** 3, 5, 6, 7, 8, 11

### 15. Add the critical Playwright authentication journey
Use Chromium only for Story 1.1 and keep one small security-focused browser suite.

Cover:
- unauthenticated `/console` routes to `/sign-in`
- successful Product Owner sign-in reaches `/console`
- invalid credentials show the exact generic Cyrillic copy
- password is not persisted in browser storage
- initial session-bootstrap network failure shows authentication-unknown/connection state rather than false sign-out
- authoritative `401` removes/hides protected state
- temporary network loss does not itself purge already-authorized read-only content
- offline sign-in fails and is not replayed after reconnect
- offline sign-out does not falsely report successful server revocation and is not replayed
- reconnect revalidates session authority without replaying failed authentication mutations
- keyboard/pointer interaction can report genuine activity
- background/session bootstrap does not report genuine activity
- local inactivity privacy timer hides protected content and revalidates authority; use Playwright clock control rather than waiting real hours
- server-side session invalidation prevents subsequent protected access
- successful sign-out clears protected state and returns to sign-in
- sign-in inputs expose the required autocomplete semantics
- primary sign-in controls have visible keyboard focus

CI browser configuration:
- `workers: 1`
- `retries: 0`
- Chromium only
- retain trace/failure artifacts when useful for diagnosis

Use stable test IDs for project-specific automation selectors and accessible role/label selectors when the accessibility semantics themselves are under test. Do not couple tests unnecessarily to translated visible copy except when exact copy is the requirement.

**AC:** 6, 7, 9, 10, 11

### 16. Wire final Story 1.1 verification into CI
Use one simple CI verification job in this order:

1. checkout
2. setup Node.js 24 / pnpm 11
3. `pnpm install --frozen-lockfile`
4. start/verify PostgreSQL 18 test service
5. apply the committed Drizzle SQL migrations to the empty test database
6. typecheck
7. build
8. backend integration tests
9. install Chromium plus required Playwright OS dependencies
10. critical Playwright browser suite

A failing required check must terminate CI unsuccessfully.

Do not add deployment/CD, production secrets, broad coverage/security-tool gates, sharding, browser/platform/database matrices, Redis, or Testcontainers solely for CI.

**AC:** 2, 11

## Dev Notes

### Scope Guardrails

Story 1.1 is authentication foundation only.

Do not pre-build:
- District domain
- District selector
- Product Owner Console navigation
- Telegram integration
- subscriptions
- Hokim account flows
- onboarding/readiness
- AI
- evidence/topic processing
- workers/pg-boss
- production Compose
- Caddy deployment
- backup/restore
- complete Audit History UI
- generic RBAC
- generic platform abstractions with no Story 1.1 consumer

Also do not add MFA, public registration, Redis, JWT/refresh-token authorization, generic session cleanup workers, Redux/Zustand, external password-breach APIs, CodeQL/Sonar, or broad test infrastructure in this story.

Small helper files may be introduced when they improve cohesion, but they must remain inside the approved Story 1.1 boundaries.

### Architecture Boundaries

Follow the approved hexagonal modular-monolith direction:

`HTTP/UI -> application/domain -> project-owned ports -> adapters`

Application/auth logic must not import:
- Fastify request/reply types
- Drizzle implementation types
- PostgreSQL client objects
- browser APIs
- infrastructure-specific error objects

Infrastructure adapters implement project-owned capabilities. Prefer capability-oriented persistence boundaries over table-shaped generic CRUD repositories. Cross-table security transactions belong at the application-operation boundary; do not let separate repository methods silently create independent transactions.

Prefer functions/composition over classes. Classes are acceptable only where an external connector/interface genuinely benefits.

### Authentication Model

One shared auth-account model is intentional because the approved role universe later includes Product Owner and Hokim. Story 1.1 creates only `PRODUCT_OWNER`; do not implement Hokim authentication behavior yet.

Username:
- trim surrounding whitespace
- NFC normalize consistently in provisioning and sign-in
- preserve case
- 1–64 Unicode code points after canonicalization
- enforce canonical uniqueness at the database boundary

Password:
- 15–128 Unicode code points
- NFC normalize consistently
- spaces/Unicode allowed
- no composition rules
- never trim/truncate
- local/offline common/compromised-password rejection at provisioning/reset
- Argon2id only
- no plaintext persistence/logging/URLs/browser persistence/argv/command output

Argon2 implementation should use the architecture-approved `argon2` package and explicit Argon2id parameters meeting or exceeding current accepted password-storage guidance. Do not weaken production parameters merely to make tests faster; isolated test-specific configuration is acceptable only where it does not invalidate behavior under test.

### Session Model

Use opaque PostgreSQL-backed sessions, not JWT authorization.

Recommended token path:

`random 32+ byte token`
→ encode safely for cookie transport
→ browser receives raw token in Secure HttpOnly cookie
→ server stores SHA-256(token) only

Create a unique index on `token_hash`.

The browser never receives:
- session database ID as authority
- token hash
- role-selection authority
- reusable bearer token in JSON

Session validity is based on server time and authoritative PostgreSQL state:
- 12-hour genuine-user inactivity limit
- persisted 24-hour absolute lifetime
- revocation is immediate on authoritative lookup

Background reads/refetches/session bootstrap do not refresh inactivity. Only an explicit authenticated activity signal may advance `last_activity_at`. No background cleanup worker is required; expired/revoked rows may be cleaned later when a concrete retention/maintenance requirement exists.

### Credential-Reset Concurrency

`credential_version` is the minimal stale-credential concurrency guard.

Sign-in may perform expensive password verification outside a transaction, but before creating a session it must re-check the credential version in a short transaction. A reset that committed after the sign-in read wins; the stale login creates no session.

Credential reset/replacement calculates the new Argon2id hash before opening the transaction, then atomically replaces the hash, increments `credential_version`, revokes existing sessions, and appends the reset audit event.

### Cookie Model

Preferred name:
`__Host-mahalla_session`

Required:
- Secure
- HttpOnly
- SameSite=Strict
- Path=/
- no Domain

Production security must not be weakened merely to simplify local tests.

### API Contract

All Story 1.1 browser/API integration stays under `/api/v1/*`.

Use shared project-owned Zod contracts and stable `SCREAMING_SNAKE_CASE` machine error codes. Never expose database rows, PostgreSQL/Drizzle types, Argon2/library errors, Fastify internal errors, or infrastructure objects.

Network/timeout/`5xx` is authentication uncertainty, not proof of authentication loss. Only authoritative `401 UNAUTHENTICATED` clears authenticated authority.

### Rate Limiting and Proxy Boundary

Use the current supported Fastify-5-compatible `@fastify/rate-limit` release selected at implementation time rather than a custom limiter or a stale planning-time patch pin.

Initial Story 1.1 policy:
- max 10 failed credential verifications
- 15-minute window
- Fastify-resolved client-IP key
- in-memory store
- sign-in route only

Check an already-exhausted limit before Argon2 and increment only after credential failure. Keep policy configuration outside domain logic.

Do not trust arbitrary forwarded-client headers. Future Caddy deployment must establish a specific trusted-proxy boundary; do not introduce Caddy into Story 1.1 just to resolve that future deployment detail.

### Same-Origin Protection

State-changing browser requests must fail before authentication-expensive or mutation work when the origin check fails.

Use configured exact application origin rather than deriving trust from attacker-controlled headers. Require `same-origin` when `Sec-Fetch-Site` exists and use exact Origin validation as fallback. `SameSite=Strict` is defense in depth; it does not replace server-side Origin/Fetch-Metadata validation.

Do not add permissive CORS or a separate CSRF-token subsystem for this same-origin MVP.

### Audit and Logging Safety

Audit data is not a general log sink. Use typed/whitelisted event fields and an append-only application interface; normal application capabilities expose no audit update/delete operation.

Do not serialize request objects, arbitrary error objects, raw IPs, attempted anonymous usernames, credentials, password/session hashes, or resident content into authentication audit records.

Routine authentication logs are allowlist-based structured metadata. Do not log auth request/response bodies or full headers, and configure redaction for credential/session/header fields as defense in depth.

### Frontend State and Offline Authentication

Use:
- TanStack Query for server/session state
- ordinary React/form state for ephemeral input and acknowledged activity time

Do not add Redux, Zustand, offline mutation persistence, service-worker mutation queues, or optimistic authentication success.

Auth mutations use `networkMode: "always"`, `retry: false`, and no persistence so an offline action resolves now rather than becoming work that silently executes after reconnection.

On authoritative authentication loss, cancel protected requests and remove the explicitly protected auth/console cache plus protected local state. Do not use network failure as an auth-loss signal and do not indiscriminately clear unrelated Query state.

Offline sign-out cannot truthfully revoke a server session; do not claim logout success or enqueue it when the server cannot be reached.

### Project Structure Notes

Expected Story 1.1 footprint:

```text
mahalla-ovozi-new/
├─ .github/
│  └─ workflows/
│     └─ ci.yml
├─ package.json
├─ pnpm-workspace.yaml
├─ pnpm-lock.yaml
├─ tsconfig.base.json
├─ apps/
│  ├─ backend/
│  │  ├─ package.json
│  │  ├─ tsconfig.json
│  │  ├─ drizzle.config.ts
│  │  ├─ drizzle/
│  │  │  └─ migrations/
│  │  └─ src/
│  │     ├─ entrypoints/
│  │     │  ├─ http.ts
│  │     │  └─ product-owner-account.ts
│  │     ├─ modules/
│  │     │  ├─ auth/
│  │     │  └─ audit/
│  │     ├─ adapters/
│  │     │  ├─ db/
│  │     │  └─ crypto/
│  │     ├─ http/
│  │     └─ config.ts
│  └─ web/
│     ├─ package.json
│     ├─ tsconfig.json
│     ├─ vite.config.ts
│     └─ src/
│        ├─ app/
│        ├─ auth/
│        ├─ main.tsx
│        └─ ProductOwnerLandingPage.tsx
└─ packages/
   └─ api-contracts/
      ├─ package.json
      ├─ tsconfig.json
      └─ src/
         ├─ auth.ts
         ├─ errors.ts
         └─ index.ts
```

Exact helper filenames may change when a smaller, more cohesive implementation emerges. The boundaries above may not expand into future Epic 1 modules.

### Testing Notes

Use Vitest for focused backend/application integration verification and Playwright for the critical browser journey. Use real PostgreSQL 18 for the persistence/security boundary and apply the committed SQL migrations to an empty test database.

Favor integration/E2E behavior over implementation-detail unit tests. The deterministic reset-race test may control the password-verifier timing to force the interleaving, while retaining real PostgreSQL; normal auth integration tests must still exercise the real Argon2id adapter.

Do not introduce broad new test infrastructure beyond Story 1.1. Do not test 12/24-hour behavior with real-time waits.

### CI Notes

The committed lockfile becomes authoritative for exact dependency patches once implementation starts. Stay on architecture-approved major/minor lines and use supported current compatible releases rather than intentionally pinning known-stale security patches.

CI verifies the actual committed SQL migration path, not an ad-hoc schema push. Required checks fail closed. No production credentials/secrets or deployment steps belong in Story 1.1 CI.

### Technical Validation Notes

Current implementation-time primary-source checks supporting the reviewed Story 1.1 direction include:
- Fastify 5-compatible current releases of `@fastify/rate-limit` and `@fastify/cookie`; implementation chooses current supported compatible releases and the lockfile owns exact patches.
- `__Host-` cookie semantics require `Secure`, `Path=/`, and no `Domain`.
- Current accepted Argon2id guidance includes a baseline of at least 19 MiB memory, 2 iterations, and parallelism 1; stronger values may be selected after implementation-time verification.
- TanStack Query's default online network mode can pause offline work; `networkMode: "always"` is required here specifically so authentication mutations fail rather than resume automatically after reconnect.
- Current password-authentication guidance supports a 15-character minimum for single-factor authentication, a large maximum, no composition rules or silent truncation, and common/compromised-password screening.
- Session expiry is server-authoritative; an absolute lifetime supplements the approved inactivity boundary.
- GitHub Actions should use minimum `GITHUB_TOKEN` permissions and immutable full-SHA action references.

Do not substitute these implementation-time checks for the architecture's approved dependency/version boundaries; re-verify version-sensitive package details when implementation starts.

## Implementation Checkpoints

Development of this single security vertical proceeds through five focused checkpoints rather than splitting Story 1.1 into formal additional stories:

1. **Foundation** — pnpm workspace, shared contracts, PostgreSQL test boundary, migrations, CI skeleton.
2. **Auth core** — account schema, provisioning/reset, Argon2id, sessions, credential-version concurrency invariants.
3. **HTTP/security** — Fastify routes, cookie, origin checks, failed-login rate limiting, audit, safe logging.
4. **Frontend auth** — sign-in, auth bootstrap, protected console, activity/offline/error/accessibility behavior.
5. **E2E/final gate** — Playwright security journey and complete CI verification.

Each checkpoint must be verified before proceeding to the next implementation checkpoint.

## References

- `_bmad-output/planning-artifacts/epics/epic-1.md` — Story 1.1 source and acceptance criteria.
- `_bmad-output/planning-artifacts/prds/prd-Mahalla-Ovozi-2026-07-30/prd.md` — FR19 and authentication/session NFRs.
- `_bmad-output/planning-artifacts/architecture/architecture-Mahalla-Ovozi-2026-08-12/ARCHITECTURE-SPINE.md` — AD-1, AD-2, AD-4, AD-9, AD-10 and implementation consistency rules.
- `_bmad-output/planning-artifacts/ux-designs/ux-Mahalla-Ovozi-2026-08-05/DESIGN.md` — visual/accessibility system.
- `_bmad-output/planning-artifacts/ux-designs/ux-Mahalla-Ovozi-2026-08-05/EXPERIENCE.md` — sign-in, error, offline, session and protected-state UX.
- `AGENTS.md` — repository development/testing conventions.
- NIST SP 800-63B — password-authenticator requirements.
- OWASP Authentication Cheat Sheet.
- OWASP Password Storage Cheat Sheet.
- OWASP Session Management Cheat Sheet.
- OWASP Cross-Site Request Forgery Prevention Cheat Sheet.
- Fastify `@fastify/rate-limit` primary documentation.
- Fastify `@fastify/cookie` primary documentation.
- node-argon2 primary documentation.
- TanStack Query Network Mode and Query Cancellation documentation.
- Playwright Clock and CI documentation.
- GitHub Actions security-hardening documentation.

## Dev Agent Record

### Agent Model Used

_Not started._

### Debug Log References

_Not started._

### Completion Notes List

_Not started._

### File List

_Not started._

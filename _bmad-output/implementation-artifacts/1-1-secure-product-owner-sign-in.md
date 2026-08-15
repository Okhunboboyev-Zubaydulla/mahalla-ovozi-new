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
   **When** changes are pushed to the repository or proposed for merge
   **Then** a minimal `.github/workflows/ci.yml` workflow uses the approved Node.js 24 and pnpm 11 toolchain with the committed lockfile
   **And** installs dependencies with the frozen lockfile
   **And** runs the repository-supported typecheck, build, and focused automated test commands required by the currently implemented scope
   **And** a failing required check fails CI rather than being reported as successful
   **And** this baseline introduces no production deployment/CD step and requires no production secrets.

3. **Given** Mahalla Ovozi is deployed without a Product Owner account
   **When** the secure server-side account-management command is used with a username and password/passphrase of at least 12 characters
   **Then** one Product Owner account can be created or securely recovered/reset
   **And** its password is stored only as an Argon2id hash
   **And** the plaintext credential never enters logs, telemetry, Audit History, URLs, or browser persistence.

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
   **And** the Product Owner reaches a protected Product Owner landing surface.

6. **Given** invalid credentials
   **When** sign-in fails
   **Then** the interface returns the generic Uzbek Cyrillic error `Нотўғри фойдаланувчи номи ёки парол.` without revealing whether an account exists
   **And** repeated failed attempts are rate-limited
   **And** the failure is recorded as privacy-safe audit metadata without credentials or secrets.

7. **Given** an authenticated Product Owner session
   **When** 12 hours of inactivity elapse, the session is explicitly revoked, or the Product Owner signs out
   **Then** the session can no longer authorize a protected request
   **And** protected browser state is cleared
   **And** the user is returned to the sign-in state.

8. **Given** a protected state-changing browser request
   **When** it does not satisfy the approved same-origin/Origin/Fetch-Metadata protections
   **Then** the request is rejected without performing the mutation
   **And** the returned error uses the sanitized API error contract.

9. **Given** the browser is offline during sign-in
   **When** authentication cannot reach the server
   **Then** the UI shows a scoped connection-unavailable state
   **And** does not queue, automatically replay, or falsely report the sign-in as successful.

10. **Given** keyboard navigation, supported responsive widths, or reduced-motion preferences
    **When** the sign-in flow is used
    **Then** controls remain keyboard accessible with visible focus, readable Uzbek Cyrillic, appropriate responsive layout, and no color-only status meaning.

11. **Given** the story is verified
    **When** focused automated checks run
    **Then** integration tests cover authentication/session/rate-limit boundaries
    **And** a critical browser test covers successful sign-in, invalid credentials, sign-out, and session-invalidated access
    **And** the baseline CI workflow executes the current required typecheck/build/test commands on repository changes and fails when one of those required checks fails.

## Tasks / Subtasks

### 1. Bootstrap the Story 1.1 workspace and CI foundation
- Create the pnpm workspace and committed lockfile.
- Add strict shared TypeScript configuration.
- Create only:
  - `apps/backend`
  - `apps/web`
  - `packages/api-contracts`
- Add repository-supported typecheck, build, test, and focused browser-test scripts.
- Add minimal `.github/workflows/ci.yml`.
- Use Node.js 24 and pnpm 11.
- CI must use frozen-lockfile installation.
- Provide PostgreSQL for integration/browser verification in CI.
- A failed required command must fail the workflow.
- Do not add production deployment/CD or production secrets.
- Do not create unused architectural module placeholders.

**AC:** 1, 2, 11

### 2. Add the Story 1.1 persistence model and reviewable migration
- Define Drizzle TypeScript schemas owned by the backend package.
- Add version-controlled SQL migration(s).
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
- `role`
- `created_at`
- `updated_at`

`auth_sessions`
- `id`
- `account_id`
- `token_hash`
- `created_at`
- `last_activity_at`
- `revoked_at`

`audit_events`
- `id`
- `action`
- `outcome`
- optional authenticated actor identifier where appropriate
- request/correlation identifier where available
- `occurred_at`

Guardrails:
- Enforce at most one `PRODUCT_OWNER` account at the database boundary, e.g. with an appropriate partial unique constraint/index.
- Do not make the schema prevent future `HOKIM` accounts.
- Do not introduce District schema yet.
- Do not add a generic unbounded audit JSON blob that could accidentally absorb credentials or resident content.

**AC:** 1, 3, 5, 6, 7

### 3. Implement secure Product Owner provisioning/recovery
- Add a server-side maintenance entrypoint for creating or replacing/resetting the Product Owner account.
- Enforce password/passphrase length >= 12 characters.
- Hash passwords using architecture-approved Argon2id.
- Never accept the plaintext password as a positional or flag command-line argument.
- Read secret material through stdin/TTY/another non-argv secret-input boundary.
- If interactive TTY input is implemented, secret input must not be echoed.
- Never print the plaintext credential.
- Never write the credential to logs, telemetry, Audit History, URLs, browser state, or command output.
- Product Owner replacement/reset and revocation of all existing Product Owner sessions must occur atomically.
- Creating/resetting the Product Owner must not create Districts or other future-domain records.

**AC:** 3, 7

### 4. Implement the authentication/session application boundary
- Keep auth/application logic project-owned and functionally composed.
- Define project-owned ports for persistence and password/session cryptography.
- Do not make application/domain code depend directly on Drizzle, Fastify, or provider-specific infrastructure.
- On successful sign-in:
  - derive the account and role server-side
  - generate a new cryptographically random opaque session token
  - persist only a deterministic hash of the token
  - never return the usable token in JSON
- Use a sufficiently random token; 32 random bytes is an appropriate minimum implementation target.
- SHA-256 is appropriate for hashing the high-entropy random bearer token; do not use SHA-256 for passwords.
- Every successful sign-in creates a fresh independent session.
- Do not implement a single-session restriction; legitimate multi-device sessions remain possible.
- Validate sessions from authoritative PostgreSQL state.
- A session is invalid when:
  - it does not exist
  - it has been revoked
  - more than 12 hours have elapsed since `last_activity_at`
- Refresh `last_activity_at` only after an authenticated request successfully establishes a valid session.
- Keep the simple direct session-touch behavior for MVP; do not add a premature session-touch batching/worker subsystem.
- Password reset/replacement revokes all existing sessions.
- Sign-out revokes the current session.

**AC:** 5, 7

### 5. Expose the minimal Fastify authentication REST contract
Implement:

- `POST /api/v1/auth/sign-in`
- `GET /api/v1/auth/session`
- `POST /api/v1/auth/sign-out`

Use project-owned Zod schemas from `packages/api-contracts`.

Expected contract behavior:

`POST /api/v1/auth/sign-in`
- Request: username + password only.
- Success: actor summary only.
- Set the opaque browser session cookie.
- Do not return session token in response JSON.

`GET /api/v1/auth/session`
- Success: server-derived actor summary.
- Invalid/expired/revoked session: sanitized unauthenticated response.

`POST /api/v1/auth/sign-out`
- Revoke the matching session when present.
- Clear the browser cookie.
- Prefer idempotent client-visible behavior so stale/missing sessions do not prevent browser cleanup.

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

Initial machine error codes may include:
- `INVALID_CREDENTIALS`
- `RATE_LIMITED`
- `UNAUTHENTICATED`
- `REQUEST_ORIGIN_REJECTED`
- `VALIDATION_ERROR`
- `INTERNAL_ERROR`

Do not expose stack traces, SQL details, Argon2 errors, raw Fastify errors, or infrastructure/provider objects.

**AC:** 4, 5, 6, 7, 8

### 6. Implement session-cookie protections
- Use a host-only cookie, preferably named with the `__Host-` prefix, e.g. `__Host-mahalla_session`.
- Required attributes:
  - `Secure`
  - `HttpOnly`
  - `SameSite=Strict`
  - `Path=/`
- Do not set a `Domain` attribute.
- The raw token must only exist at the browser-cookie/HTTP boundary and transiently in server request processing.
- Persist only its hash.
- Clear the cookie using matching scope attributes during sign-out/session invalidation.
- Do not use JWT access tokens, refresh tokens, localStorage, sessionStorage, IndexedDB, or browser-visible bearer tokens for authorization.
- The session does not need a second cookie-signing secret: possession of the unpredictable token plus server-side hash lookup is the authority boundary.

**AC:** 5, 7

### 7. Implement generic failed-login behavior and rate limiting
- A nonexistent username and a wrong password must produce the exact same public response.
- Exact Uzbek Cyrillic message:
  `Нотўғри фойдаланувчи номи ёки парол.`
- Do not expose whether the username exists through response code, error shape, or message.
- Avoid a trivial timing distinction:
  - when no account exists, execute password verification against a fixed valid dummy Argon2 hash or equivalent constant-work path before returning the generic failure.
- Use `@fastify/rate-limit` with route-level scope for sign-in.
- Approved initial policy:
  - 10 attempts
  - per 15-minute window
  - keyed by Fastify's resolved client IP
- Keep the threshold/configuration outside domain logic.
- Do not add:
  - Redis
  - PostgreSQL rate-limit tables
  - CAPTCHA
  - persistent account lockout
- A restart may reset the in-memory limiter; persistent/distributed rate-limit infrastructure is outside current MVP requirements.
- Do not log the rate-limit key or raw client IP into Audit History.

**AC:** 6

### 8. Add privacy-safe authentication auditing
Record the minimum authentication events required for operational/audit history, such as:
- `AUTH_LOGIN_FAILED`
- `AUTH_LOGIN_RATE_LIMITED`
- `AUTH_SIGN_OUT`
- `AUTH_SESSION_REVOKED`
- Product Owner credential reset/replacement event

Audit payloads must be whitelist-based.

Never include:
- password/passphrase
- raw session token
- password hash
- session-token hash unless explicitly required for an internal invariant
- raw request body
- Authorization/Cookie headers
- raw client IP
- arbitrary serialized request/error objects

Anonymous failed login events do not need to resolve/store the attempted username.

**AC:** 3, 6, 7

### 9. Enforce same-origin browser mutation protections
For browser state-changing requests (`POST`, `PUT`, `PATCH`, `DELETE`):

- Compare `Origin` exactly against the configured application origin.
- Reject mismatched or untrusted origins before application mutation code executes.
- If `Sec-Fetch-Site` is present, require `same-origin`.
- Treat `same-site` as untrusted for state-changing Mahalla Ovozi requests.
- Reject `cross-site`.
- If Fetch Metadata is absent, exact Origin verification remains the fallback.
- Apply the protection to Story 1.1 state-changing browser routes, including sign-in and sign-out.
- Return only the sanitized API error contract.
- Do not introduce a separate CSRF-token subsystem for this same-origin MVP architecture.

**AC:** 8

### 10. Implement the `/sign-in` frontend
Create `/sign-in` using React, Vite, Ant Design, React Router, and TanStack Query.

Visible fields/actions only:
- `Фойдаланувчи номи`
- `Парол`
- `Кириш`

Do not add:
- public registration
- role selector
- password-recovery UI
- social login
- MFA
- email/SMS workflows

Required states:
- initial
- submitting
- invalid credentials
- rate limited
- connection unavailable
- session expired/invalidated
- successful authentication

Behavior:
- prevent duplicate submission
- preserve only ephemeral form state
- do not persist username/password/session authority in application browser storage
- use `retry: false` for sign-in
- ensure offline sign-in is not paused for later automatic execution
- configure the sign-in mutation so an offline attempt fails into the connection-unavailable UI rather than resuming automatically after reconnect, e.g. `networkMode: "always"`
- do not use persisted mutations
- do not queue failed sign-in operations
- show scoped accessible errors rather than toast-only feedback
- exact invalid-credential copy must remain:
  `Нотўғри фойдаланувчи номи ёки парол.`

**AC:** 4, 6, 9, 10

### 11. Implement authoritative authentication bootstrap and protected routing
- `/console` is the Story 1.1 protected landing route.
- On application/protected-route bootstrap, call `GET /api/v1/auth/session`.
- Treat returned server state as authoritative.
- Do not authorize from browser-selected role or local role state.
- A valid `PRODUCT_OWNER` actor may enter `/console`.
- An invalid/expired/revoked session:
  - removes protected TanStack Query data
  - clears protected local interaction state
  - returns to `/sign-in`
- Auth loss must take privacy precedence; do not wait for a confirmation dialog before clearing protected state.
- A protected internal route target may be retained using safe router memory/state during sign-in.
- Do not accept arbitrary external post-login redirect targets.

**AC:** 5, 7

### 12. Implement only the minimal Product Owner landing
`/console` exists in Story 1.1 only to prove authenticated Product Owner access.

It may contain:
- `Маҳалла Овози`
- minimal authenticated Product Owner landing content
- `Чиқиш`

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

**AC:** 1, 5

### 13. Apply Story 1.1 UX/accessibility requirements
- User-facing product copy is Uzbek Cyrillic.
- Use Ant Design as the primary UI/component styling system.
- Use `ConfigProvider` tokens where appropriate.
- Keep custom CSS narrow.
- Do not add Tailwind or another component/styling framework.
- Keep the MVP light-only unless planning artifacts are changed later.
- Maintain readable Cyrillic glyphs including `Ў ў Қ қ Ғ ғ Ҳ ҳ`.
- Keep user-facing text at the approved readable floor.
- Maintain visible keyboard focus.
- Do not rely on color alone for status/error meaning.
- Keep sign-in usable at supported narrow widths and 200% zoom.
- Avoid clipping required actions.
- Maintain appropriate phone/tablet touch target sizing.
- Respect reduced-motion preferences.
- Error/status content must be programmatically understandable and reachable.

**AC:** 4, 9, 10

### 14. Add focused backend integration verification
Use a real PostgreSQL test boundary where feasible; do not replace the core persistence/security behavior with mocks.

Cover at minimum:
- Product Owner provisioning
- password length rejection
- password stored as Argon2id hash rather than plaintext
- Product Owner singleton invariant
- password reset/replacement revokes existing sessions
- valid sign-in
- nonexistent username generic failure
- incorrect password generic failure
- session token itself not stored
- token-hash lookup
- independent multi-device sessions
- 12-hour inactivity expiry
- explicit session revocation
- sign-out
- rate limiting
- privacy-safe audit event creation
- trusted Origin request
- rejected Origin
- rejected `Sec-Fetch-Site`
- protected mutation not executed when origin protection fails
- sanitized public errors

Do not add brittle wall-clock performance assertions for username enumeration; verify the intended dummy-verification behavior structurally/integration-wise instead.

**AC:** 3, 5, 6, 7, 8, 11

### 15. Add the critical Playwright authentication journey
Cover:
- successful Product Owner sign-in
- protected `/console` reached
- invalid credentials show exact generic copy
- sign-out clears protected state and returns to sign-in
- server-side session invalidation prevents subsequent protected access
- offline sign-in produces connection-unavailable state
- offline attempt is not automatically replayed on reconnect
- keyboard-visible focus on primary sign-in controls

Use stable semantic selectors/test IDs where required by repository testing conventions; do not couple tests unnecessarily to translated visible copy except where exact copy itself is the requirement.

**AC:** 6, 7, 9, 10, 11

### 16. Wire final Story 1.1 verification into CI
CI must run repository-supported:
- frozen dependency installation
- typecheck
- build
- focused automated tests
- required critical browser test

A failing required check must terminate CI unsuccessfully.

Do not add deployment/CD.

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
- generic platform abstractions with no Story 1.1 consumer

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

Infrastructure adapters implement project-owned interfaces.

Prefer functions/composition over classes. Classes are acceptable only where an external connector/interface genuinely benefits.

### Authentication Model

One shared auth-account model is intentional because the approved role universe later includes Product Owner and Hokim.

Story 1.1 creates only `PRODUCT_OWNER`.

Do not implement Hokim authentication behavior yet.

Username handling must be consistent between provisioning and sign-in. Do not invent complex username policy. If canonicalization is required, keep it minimal and deterministic, e.g. trim surrounding whitespace and Unicode-normalize consistently while preserving case unless a later product requirement changes that behavior.

Passwords:
- minimum 12 characters at provisioning/reset
- Argon2id only
- no plaintext persistence
- no plaintext logging
- no plaintext URLs
- no browser application persistence

Argon2 implementation should use the architecture-approved `argon2` package and an explicit Argon2id configuration that meets or exceeds current accepted password-storage guidance. Do not weaken parameters merely to make tests faster; tests may use isolated test-specific configuration only when it does not invalidate the behavior being verified.

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

Session validity is based on server time and authoritative database state.

12 hours is an inactivity timeout, not a fixed 12-hour lifetime from original login.

No background cleanup worker is required for Story 1.1. Expired/revoked rows may be handled synchronously and cleaned later when a concrete retention requirement exists.

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

Use shared Zod contracts.

Never expose:
- database rows
- PostgreSQL types
- Drizzle types
- Argon2/library errors
- Fastify internal errors

Use stable `SCREAMING_SNAKE_CASE` machine error codes.

### Rate Limiting

Use the approved Fastify-compatible `@fastify/rate-limit` plugin rather than a custom limiter.

Initial Story 1.1 policy:
- max 10 sign-in requests
- 15-minute window
- client-IP key
- in-memory store
- sign-in route only

The policy must be configurable.

Do not persist failed passwords/usernames solely to implement throttling.

Do not add durable/distributed rate-limiter infrastructure until there is a real multi-process/distributed requirement.

### Same-Origin Protection

State-changing browser requests must fail before mutation if origin checks fail.

Use configured exact application origin rather than deriving trust from attacker-controlled headers.

Where reverse-proxy configuration is later introduced, do not blindly trust arbitrary forwarded-client headers.

`SameSite=Strict` is defense in depth; it does not replace server-side Origin/Fetch-Metadata validation.

### Audit Safety

Audit data is not a general log sink.

Use typed/whitelisted event fields.

Do not serialize request objects or arbitrary error objects into audit records.

Authentication audit events must remain useful without exposing secrets.

### Frontend State

Use:
- TanStack Query for server/session state
- ordinary React/form state for ephemeral input

Do not add:
- Redux
- Zustand
- offline mutation persistence
- service-worker mutation queues
- optimistic authentication success

Authentication loss purges protected query data.

### Offline Authentication

This AC requires explicit care with TanStack Query.

The default online network mode may pause work while offline and continue later. Sign-in must instead resolve immediately into a connection-unavailable state and must not resume automatically after reconnection.

Therefore:
- no mutation persistence
- no automatic retry
- no reconnect replay
- no false success
- verify this behavior in Playwright

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

Exact helper filenames may change when a smaller, more cohesive implementation emerges.

The boundaries above may not expand into future Epic 1 modules.

### Testing Notes

Favor integration and browser verification over implementation-detail unit tests.

Use real PostgreSQL for persistence/auth integration where practical.

Test the system through project-owned/application/public boundaries rather than asserting private helper structure.

Do not introduce broad new test infrastructure beyond what Story 1.1 requires.

### CI Notes

The committed lockfile becomes authoritative for exact dependency patches once implementation starts.

Stay on the architecture-approved major/minor lines.

Use supported current patch releases rather than intentionally pinning known-stale security patches.

No production secrets belong in CI for Story 1.1.

### Technical Validation Notes

Current implementation-time primary-source checks support these Story 1.1 choices:

- `@fastify/rate-limit` 10.x supports Fastify 5.
- `@fastify/cookie` 10.x supports Fastify 5.
- `__Host-` cookie semantics require Secure, Path=/, and no Domain.
- OWASP recommends Argon2id and currently documents a minimum baseline of 19 MiB memory, 2 iterations, and parallelism 1; implementation may use stronger values.
- TanStack Query's default online network mode may pause offline queries/mutations, while `networkMode: "always"` does not pause because of offline status. This matters because Story 1.1 prohibits automatic replay.

Do not substitute these implementation checks for the architecture's approved dependency/version boundaries.

## References

- `_bmad-output/planning-artifacts/epics/epic-1.md` — Story 1.1 source and acceptance criteria.
- `_bmad-output/planning-artifacts/prds/prd-Mahalla-Ovozi-2026-07-30/prd.md` — FR19 and authentication/session NFRs.
- `_bmad-output/planning-artifacts/architecture/architecture-Mahalla-Ovozi-2026-08-12/ARCHITECTURE-SPINE.md` — AD-1, AD-2, AD-4, AD-9, AD-10 and implementation consistency rules.
- `_bmad-output/planning-artifacts/ux-designs/ux-Mahalla-Ovozi-2026-08-05/DESIGN.md` — visual/accessibility system.
- `_bmad-output/planning-artifacts/ux-designs/ux-Mahalla-Ovozi-2026-08-05/EXPERIENCE.md` — sign-in, error, offline, session and protected-state UX.
- `AGENTS.md` — repository development/testing conventions.
- Fastify `@fastify/rate-limit` primary documentation.
- Fastify `@fastify/cookie` primary documentation.
- node-argon2 primary documentation.
- OWASP Password Storage Cheat Sheet.
- OWASP Cross-Site Request Forgery Prevention Cheat Sheet.
- MDN Set-Cookie / secure-cookie guidance.
- TanStack Query Network Mode documentation.

## Dev Agent Record

### Agent Model Used

_Not started._

### Debug Log References

_Not started._

### Completion Notes List

_Not started._

### File List

_Not started._

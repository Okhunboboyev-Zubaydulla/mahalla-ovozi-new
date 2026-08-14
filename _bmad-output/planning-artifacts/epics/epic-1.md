## Epic 1: Secure District Onboarding & Access

The Product Owner can create and configure an isolated District, connect its Telegram setup, create its Hokim account, complete required checks, activate it, and ensure both roles can access only the scopes they are authorized to use.

### Story 1.1: Secure Product Owner Sign-In

As the **Product Owner**,
I want to sign in securely to the private Mahalla Ovozi application,
So that I can access the Product Owner surface without exposing the system to public or unauthorized access.

**Acceptance Criteria:**

**Given** the greenfield repository
**When** Story 1.1 is implemented
**Then** the application foundation uses the approved pnpm workspace, TypeScript/Node, Fastify, React/Vite, Ant Design, PostgreSQL/Drizzle, shared Zod REST contracts, and the architecture's modular-monolith boundaries
**And** only schema/infrastructure required for this story is introduced.

**Given** Mahalla Ovozi is deployed without a Product Owner account
**When** the secure server-side account-management command is used with a username and password/passphrase of at least 12 characters
**Then** one Product Owner account can be created or securely recovered/reset
**And** its password is stored only as an Argon2id hash
**And** the plaintext credential never enters logs, telemetry, Audit History, URLs, or browser persistence.

**Given** an unauthenticated visitor opens the private application
**When** the sign-in surface loads
**Then** it presents username and password fields only
**And** provides no public registration, role selector, social login, email/SMS recovery, or MFA workflow
**And** user-facing copy is Uzbek Cyrillic.

**Given** valid Product Owner credentials
**When** the Product Owner signs in
**Then** authentication creates a server-derived Product Owner actor context
**And** creates an opaque PostgreSQL-backed session whose usable token exists only in a host-scoped `Secure`, `HttpOnly`, `SameSite=Strict` cookie
**And** only a hash of that session token is persisted server-side
**And** the Product Owner reaches a protected Product Owner landing surface.

**Given** invalid credentials
**When** sign-in fails
**Then** the interface returns the generic Uzbek Cyrillic error `Нотўғри фойдаланувчи номи ёки парол.` without revealing whether an account exists
**And** repeated failed attempts are rate-limited
**And** the failure is recorded as privacy-safe audit metadata without credentials or secrets.

**Given** an authenticated Product Owner session
**When** 12 hours of inactivity elapse, the session is explicitly revoked, or the Product Owner signs out
**Then** the session can no longer authorize a protected request
**And** protected browser state is cleared
**And** the user is returned to the sign-in state.

**Given** a protected state-changing browser request
**When** it does not satisfy the approved same-origin/Origin/Fetch-Metadata protections
**Then** the request is rejected without performing the mutation
**And** the returned error uses the sanitized API error contract.

**Given** the browser is offline during sign-in
**When** authentication cannot reach the server
**Then** the UI shows a scoped connection-unavailable state
**And** does not queue, automatically replay, or falsely report the sign-in as successful.

**Given** keyboard navigation, supported responsive widths, or reduced-motion preferences
**When** the sign-in flow is used
**Then** controls remain keyboard accessible with visible focus, readable Uzbek Cyrillic, appropriate responsive layout, and no color-only status meaning.

**Given** the story is verified
**When** focused automated checks run
**Then** integration tests cover authentication/session/rate-limit boundaries
**And** a critical browser test covers successful sign-in, invalid credentials, sign-out, and session-invalidated access.

### Story 1.2: Create and Select a District in the Product Owner Console

As the **Product Owner**,
I want to create a District and work within an explicit District context in one Console,
So that subsequent configuration is always attached to the correct District and District-owned data cannot be mixed accidentally.

**Acceptance Criteria:**

**Given** an authenticated Product Owner
**When** the Product Owner enters the Console
**Then** the approved persistent navigation exposes Overview, System Health, Districts, Telegram Setup, Subscriptions, Hokim Accounts, AI Operations, and Audit History
**And** the current District context is always visibly identifiable where a section can operate on District-owned data
**And** all user-facing product copy uses Uzbek Cyrillic.

**Given** no District exists yet
**When** the Product Owner opens Districts
**Then** an honest empty state is shown
**And** the Product Owner can begin creating the first District
**And** no unrelated future Telegram, Topic, subscription-lifecycle, or AI-processing entities are created by this story.

**Given** the Product Owner creates a District with its required identity, including its District name
**When** Save succeeds
**Then** the system assigns an opaque District identifier
**And** persists the District in an incomplete onboarding state
**And** makes that District selectable in the Console
**And** the incomplete District performs no production Telegram intake or AI processing and grants no Hokim access.

**Given** a District-scoped application request
**When** it reaches application, repository, or other District-owned boundaries
**Then** explicit District scope is required
**And** missing District scope is rejected rather than interpreted as global scope
**And** the server derives authorization context rather than trusting a browser-supplied role or unrestricted District identity.

**Given** a Product Owner operation that is genuinely global or aggregate
**When** no single District is selected
**Then** it uses a dedicated global/Product Owner contract
**And** it cannot expose or mix District-owned evidence, credentials, mappings, accounts, or other protected District content.

**Given** a District is selected
**When** the Product Owner navigates among District-scoped Console sections
**Then** that District remains visibly selected
**And** frontend server-state query keys include the District identity
**And** responses for another District cannot render into the active District context.

**Given** the Product Owner requests a switch from District A to District B
**When** no unsaved form state blocks the transition
**Then** prior-District requests are cancelled where possible
**And** protected District A cache/content-bearing client state is purged before District B data is loaded
**And** local District-bound interaction state is cleared
**And** a late District A response is ignored and never rendered under District B.

**Given** there are unsaved changes in the active District context
**When** the Product Owner attempts District switching, navigation, sign-out, browser Back, or another transition that would discard the draft
**Then** the approved dirty-state guard runs before changing context
**And** cancelling the guard leaves the existing District and draft unchanged
**And** confirming discard performs the protected context transition.

**Given** District creation or another authoritative mutation is submitted
**When** the request is in progress or fails
**Then** duplicate submission is prevented without freezing unrelated navigation
**And** no optimistic success is displayed
**And** a failure preserves valid entered values and presents a sanitized error with a useful next action.

**Given** field validation fails on Save
**When** the server or shared contract rejects the submitted values
**Then** one accessible error summary receives focus
**And** links to invalid controls are provided
**And** valid field values remain intact
**And** entry/blur validation does not unexpectedly steal focus.

**Given** the browser loses network connectivity while the Console contains still-authorized loaded data
**When** the Product Owner remains offline
**Then** permitted loaded data may remain visible read-only with an offline indication
**And** new loads and mutations are blocked
**And** nothing is queued for automatic resubmission
**And** reconnect revalidates the session and active District context before refreshing.

**Given** the Console is used with keyboard navigation, phone/tablet widths, 200% zoom, or reduced-motion preference
**When** the Product Owner creates or switches District context
**Then** core actions remain keyboard operable with visible logical focus
**And** touch targets and responsive layout satisfy the approved UX floor
**And** no protected action or status depends on color alone
**And** Cyrillic text and important controls are not clipped or hidden.

**Given** Story 1.2 is verified
**When** focused automated checks run
**Then** integration tests cover explicit District scoping, missing-scope rejection, District creation, and cross-District authorization boundaries
**And** browser tests cover zero-District creation, selected-District persistence, dirty-switch cancellation, successful District switching, and rejection of a late stale-District response.

### Story 1.3: Resume District Onboarding and Track Activation Readiness

As the **Product Owner**,
I want each incomplete District to have a resumable onboarding checklist with explicit readiness checks,
So that I can leave setup unfinished, return later, and know exactly what still prevents safe activation.

**Acceptance Criteria:**

**Given** an incomplete District created in Story 1.2
**When** the Product Owner opens its District setup
**Then** the Console shows one resumable onboarding checklist for that District
**And** each required setup area has an explicit `passed`, `incomplete`, or `failed` state
**And** the checklist clearly identifies blockers without implying the District is active.

**Given** the onboarding checklist
**When** readiness is evaluated
**Then** it represents all activation prerequisites required by FR20: subscription/access eligibility, Telegram bot validation, approved group-to-Mahalla mappings, Hokim account readiness, external-disclosure confirmation, District-isolation checks, and required analysis-configuration readiness
**And** activation remains unavailable while any required prerequisite is not passed.

**Given** Telegram setup and Hokim-account capabilities are not yet implemented at this point in the epic
**When** Story 1.3 is used independently
**Then** their checklist items remain truthfully `incomplete` rather than being mocked, auto-passed, or hidden
**And** the onboarding workflow itself remains fully usable and resumable
**And** later stories can satisfy those existing checks without redesigning the checklist contract.

**Given** full subscription lifecycle management belongs to Epic 6
**When** onboarding needs an initial subscription/access prerequisite
**Then** Story 1.3 introduces only the minimum District access-eligibility state needed for activation readiness
**And** does not implement Grace, Suspension, Cancellation, recovery, payment processing, or deletion lifecycle behavior
**And** Epic 6 may extend the same lifecycle boundary later without Epic 1 depending on Epic 6.

**Given** full AI Operations management belongs to Epic 5
**When** onboarding checks analysis-configuration readiness
**Then** the system verifies that the District can resolve a valid approved baseline analysis configuration/profile
**And** Story 1.3 does not expose version editing, activation diffs, rollback, or other Epic 5 configuration-management features.

**Given** a setup section contains editable non-secret fields
**When** the Product Owner changes and saves that section
**Then** the section is saved explicitly rather than by autosave
**And** only that section's valid data and readiness state are committed
**And** the Product Owner can leave and later resume from the persisted state.

**Given** the Product Owner has unsaved changes in a setup section
**When** they navigate away, switch Districts, sign out, use browser Back, or trigger another transition that would discard the draft
**Then** the approved dirty-state guard runs
**And** cancelling preserves the current draft and District context
**And** confirming discard removes only unsaved client-side changes.

**Given** the required external-disclosure confirmation has not been completed
**When** readiness is evaluated
**Then** disclosure remains an explicit activation blocker
**And** the Product Owner can record the confirmation through a deliberate action
**And** the resulting audit event contains only District, actor, action, and time metadata—not resident content or unnecessary disclosure details.

**Given** a District-isolation readiness check runs
**When** the system evaluates the District
**Then** it verifies the required District-scoped relationships and authorization invariants available at this stage
**And** a failed or unavailable check is reported truthfully as failed/incomplete rather than silently passed
**And** the failure uses sanitized diagnostic information.

**Given** any readiness prerequisite changes
**When** the onboarding page is loaded or refreshed
**Then** readiness is derived from authoritative server state rather than a browser-maintained completion flag
**And** stale client state cannot activate or mark a prerequisite passed.

**Given** a setup save or readiness check fails
**When** the failure is shown
**Then** valid entered values are preserved where safe
**And** the UI identifies the affected setup area and a useful next action
**And** raw upstream errors, credentials, Telegram tokens, resident content, and secrets are never exposed.

**Given** the browser is offline while previously authorized onboarding data is visible
**When** the Product Owner remains offline
**Then** existing permitted setup state may remain visible read-only with an offline warning
**And** saves/readiness checks are blocked
**And** no mutations are queued for automatic replay
**And** reconnect revalidates session, District, and lifecycle state before resuming.

**Given** the onboarding workflow is used on supported responsive widths, at 200% zoom, with keyboard navigation, or reduced motion
**When** checklist items and setup sections are reviewed
**Then** status meaning is not color-only
**And** focus order and labels expose checklist state programmatically
**And** controls satisfy the approved touch/focus requirements
**And** Uzbek Cyrillic text remains readable without clipped required actions.

**Given** Story 1.3 is verified
**When** focused automated checks run
**Then** integration tests cover persisted resumability, authoritative readiness derivation, disclosure recording, isolation failure behavior, and activation remaining blocked
**And** browser tests cover save-and-resume, dirty-state protection, failed prerequisite presentation, and offline read-only behavior.

### Story 1.4: Connect and Validate a District Telegram Bot

As the **Product Owner**,
I want to securely connect and validate one Telegram bot for a District,
So that the District has a verified passive Telegram connection before approved groups can be mapped or production intake can be activated.

**Acceptance Criteria:**

**Given** an incomplete District is selected
**When** the Product Owner opens Telegram Setup
**Then** the page shows a District-scoped bot connection status card
**And** it clearly distinguishes not configured, validating, valid, and failed states
**And** no bot information from another District can appear.

**Given** the District has no configured bot
**When** the Product Owner enters a Telegram bot token
**Then** the token exists in browser state only for the active submission transaction
**And** it is never written to browser storage, URL/history state, logs, telemetry, Audit History, error output, or resumable onboarding drafts
**And** browser autofill/persistence is not relied upon for restoring it.

**Given** the Product Owner submits a bot token
**When** the server accepts the request
**Then** the token is handled only through the project-owned Telegram integration boundary
**And** the plaintext token is not persisted directly
**And** persistent storage contains authenticated ciphertext encrypted under the deployment-held versioned secret-encryption key.

**Given** validation resolves a Telegram bot identity already authoritatively assigned to another District
**When** the Product Owner attempts to configure it for the selected District
**Then** the operation is rejected
**And** one Telegram bot identity/credential cannot be simultaneously assigned to more than one District
**And** the existing other-District configuration is neither exposed nor modified.

**Given** a submitted token is syntactically invalid, rejected by Telegram, belongs to an inaccessible bot, or validation cannot complete
**When** validation finishes
**Then** the District does not receive a valid Telegram readiness state
**And** no unusable plaintext credential is retained
**And** the Product Owner receives a sanitized failure category and useful next action without upstream response bodies or secrets.

**Given** a valid Telegram bot token
**When** the product validates it through Telegram
**Then** the product verifies the bot identity and required connectivity/access capability available at bot level
**And** persists only the approved non-secret bot metadata required for administration
**And** marks the bot prerequisite passed only after successful authoritative validation.

**Given** a configured District bot is used by Mahalla Ovozi in MVP
**When** the product operates through the Telegram integration
**Then** the bot is used only for passive receipt and required connectivity/access validation
**And** Mahalla Ovozi does not send group messages, moderate or delete group content, ban members, pin messages, or manage group membership/settings
**And** no District activation prerequisite requires the bot to have Telegram administrator privileges.

**Given** Telegram is temporarily unavailable or times out during validation
**When** validation cannot establish the required result
**Then** the status remains failed or incomplete rather than being treated as successful
**And** retry does not create duplicate bot records or duplicate authoritative effects
**And** the current District remains inactive.

**Given** a District already has a valid configured bot
**When** the Product Owner opens Telegram Setup later
**Then** the stored token is never returned to the browser
**And** the UI shows only safe bot identity/status metadata
**And** there is no “reveal token” capability.

**Given** the Product Owner supplies a replacement token for an incomplete District
**When** replacement validation succeeds
**Then** the new token becomes the District's sole configured bot credential atomically
**And** obsolete credential material is removed according to the credential lifecycle rules
**And** failed replacement validation leaves the previously valid configuration unchanged.

**Given** the District is already Active in a later system state
**When** a Product Owner attempts bot replacement or removal
**Then** the UI must first present the approved exact future-only operational consequence
**And** the action requires explicit confirmation
**And** historical retained evidence and attribution are not rewritten
**And** no past Telegram messages are backfilled or reprocessed because of the credential change.

**Given** one bot is already assigned to the selected District
**When** an operation would create a second simultaneously active District bot configuration
**Then** the server rejects it
**And** the one-bot-per-District invariant is preserved by authoritative storage constraints/application rules rather than UI convention alone.

**Given** Telegram validation changes the bot's readiness state
**When** the onboarding checklist is refreshed
**Then** Story 1.3's Telegram-bot prerequisite is derived from the authoritative bot state
**And** group-to-Mahalla mapping remains separately incomplete until Story 1.5 is satisfied.

**Given** bot configuration is audited
**When** creation, validation, replacement, or removal occurs
**Then** Audit History receives only privacy-safe metadata such as District, actor, action, result, safe bot identifier where approved, and time
**And** the token or other Telegram secrets never appear in audit payloads.

**Given** the browser goes offline before or during token submission
**When** connectivity is unavailable
**Then** submission is blocked or fails explicitly
**And** the secret is not queued for later automatic replay
**And** reconnect does not automatically resubmit the token.

**Given** Telegram Setup is used with keyboard navigation, supported responsive widths, 200% zoom, or reduced-motion settings
**When** the Product Owner enters or validates a bot
**Then** labels, validation states, confirmation actions, and focus behavior satisfy the approved accessibility floor
**And** state is not conveyed by color alone
**And** Uzbek Cyrillic status/error copy remains readable without exposing technical secrets.

**Given** Story 1.4 is verified
**When** focused automated checks run
**Then** integration tests cover encrypted token persistence, one-bot-per-District enforcement, cross-District bot-identity rejection, passive no-outbound/no-admin behavior, successful/failed validation, replacement atomicity, explicit District scoping, and secret exclusion from returned contracts
**And** browser tests cover first-time connection, validation failure, successful connection, token non-restoration after reload, and offline submission behavior.

### Story 1.5: Configure and Validate Telegram Group-to-Mahalla Mappings

As the **Product Owner**,
I want to map approved Telegram groups one-to-one to Mahallas and validate that the District bot can receive the required messages from them,
So that future Telegram evidence can be attributed deterministically to the correct District and Mahalla.

**Acceptance Criteria:**

**Given** a District with a valid Telegram bot from Story 1.4
**When** the Product Owner opens Telegram Setup
**Then** the selected District shows a searchable collection of its Mahalla/group mappings
**And** each mapping displays safe Telegram group identity, Mahalla identity, and validation/readiness state
**And** mappings from another District cannot appear.

**Given** the Product Owner needs to configure a Mahalla
**When** they create or select the Mahalla and associate an approved Telegram group
**Then** the relationship is persisted with explicit District scope
**And** one Telegram group can belong to only one Mahalla within the District
**And** one Mahalla can have only one approved Telegram group
**And** the invariants are enforced by authoritative application/storage constraints rather than UI convention alone.

**Given** a Telegram group is already an approved mapping for District A
**When** the Product Owner attempts to approve that same Telegram group for District B
**Then** the save is rejected by authoritative application/storage constraints
**And** one approved Telegram group cannot simultaneously belong to more than one District
**And** District A's protected mapping details are neither exposed nor modified.

**Given** a Telegram group is already mapped
**When** the Product Owner attempts to map that same group to a second Mahalla, or map a second group to an already-mapped Mahalla
**Then** the save is rejected
**And** the conflicting mapping is identified with sanitized, useful feedback
**And** the existing valid mapping remains unchanged.

**Given** a mapping is newly configured
**When** its Telegram readiness is validated
**Then** the system verifies the configured District bot is an ordinary non-admin member with the required access to that exact group
**And** verifies Telegram Group Privacy Mode is disabled for the bot
**And** verifies receipt of an ordinary non-command human text test message from that exact group before the mapping can become ready
**And** a stored mapping alone is never treated as proof that Telegram delivery works.

**Given** the Product Owner is performing the test-message flow
**When** the system is waiting for the expected Telegram evidence
**Then** the UI exposes an explicit waiting state
**And** identifies the correct District/group safely
**And** does not claim success until the authoritative expected ordinary non-command test receipt is observed.

**Given** the expected ordinary non-command human text test message is received successfully through the configured District bot
**When** its group identity matches the mapping under validation
**Then** that mapping is marked passed/readied
**And** the test verifies connectivity/configuration only
**And** the test message does not become production Accepted Evidence or start Topic/AI processing while the District remains incomplete.

**Given** the test times out, the bot lacks access, has administrator-only setup rather than the required ordinary non-admin membership, Group Privacy Mode is enabled or otherwise misconfigured, only a command/bot-authored message is observed, the message arrives from a different group, or Telegram validation otherwise fails
**When** the check completes
**Then** the mapping remains failed or incomplete
**And** the UI identifies the safe failure category and next corrective action
**And** no raw Telegram payload, token, resident content, or upstream error body is exposed in product errors or telemetry.

**Given** Telegram delivers an update from a group that is not an approved mapping for the District
**When** the system evaluates authorization
**Then** that group is not considered approved for production intake
**And** absence of an approved District-scoped mapping cannot be interpreted as global or permissive access.

**Given** the District is still incomplete
**When** all its mappings pass validation
**Then** Story 1.3's mapping prerequisite becomes passed from authoritative server state
**And** production intake remains disabled until the separate District activation transition in Story 1.7 succeeds.

**Given** the Product Owner changes, removes, disables, or remaps a relationship before District activation
**When** Save succeeds
**Then** readiness is recalculated from the new authoritative mapping state
**And** no unrelated mapping is modified.

**Given** the District is Active in a later system state and retained evidence exists for a mapping
**When** the Product Owner attempts removal, disablement, or remapping
**Then** the UI shows the exact future-only consequence before confirmation
**And** the change affects only Telegram messages received after the effective change
**And** retained Topics/evidence keep their original Mahalla and Telegram attribution
**And** completed historical messages are not replayed, moved, rewritten, or backfilled.

**Given** an active mapping change requires revalidation
**When** its new Telegram access/test checks have not passed
**Then** the changed relationship is not treated as ready for future intake
**And** the product does not silently continue using an unverified replacement relationship.

**Given** the Product Owner explicitly saves mapping changes
**When** the mutation is in progress
**Then** duplicate submissions are prevented
**And** no optimistic success is displayed
**And** failure leaves previously committed valid mapping state intact wherever atomic replacement is required.

**Given** mapping administration is audited
**When** mappings are created, validated, changed, disabled, remapped, or removed
**Then** Audit History records privacy-safe District, actor, action, mapping identifiers, result, and time metadata
**And** no bot token, resident message content, or secret validation material is written to audit payloads.

**Given** the browser loses connectivity while mappings are already loaded
**When** it is offline
**Then** still-authorized mapping data may remain visible read-only with an offline warning
**And** creation, change, removal, and validation actions are blocked
**And** operations are not queued for automatic replay
**And** reconnect revalidates the session and District context before new actions.

**Given** the mapping collection grows to the approved MVP District envelope
**When** the Product Owner searches or reviews mappings
**Then** the interface remains usable for at least the approved 30 Mahallas/groups per District
**And** search operates on safe administrative mapping metadata rather than resident evidence.

**Given** Telegram Setup is used with keyboard navigation, supported responsive widths, 200% zoom, or reduced-motion preferences
**When** mappings and validation states are operated
**Then** all required actions remain keyboard operable with visible logical focus
**And** validation/conflict state is not conveyed through color alone
**And** touch targets and responsive layout satisfy the approved UX floor
**And** Uzbek Cyrillic labels and statuses remain readable without clipped required actions.

**Given** Story 1.5 is verified
**When** focused automated checks run
**Then** integration tests cover one-to-one constraints including cross-District group uniqueness, explicit District scoping, unauthorized-group rejection, required ordinary non-admin membership, disabled Group Privacy Mode, ordinary non-command test receipt, timeout/conflict states, authoritative readiness updates, and future-only remapping behavior
**And** browser tests cover creating a mapping, mapping conflict, successful ordinary-message validation, timeout/failure, searching mappings, and protected offline behavior.

### Story 1.6: Create and Manage the District Hokim Account

As the **Product Owner**,
I want to create and manage the single Hokim account assigned to a District,
So that the District has a securely provisioned Hokim identity whose access is deterministic and can be revoked immediately.

**Acceptance Criteria:**

**Given** a District is selected
**When** the Product Owner opens Hokim Accounts
**Then** only that District's Hokim-account state is shown
**And** the interface clearly distinguishes no account, active account, and disabled account states
**And** account data from another District cannot appear.

**Given** the District does not yet have a Hokim account
**When** the Product Owner creates one with the required username/account identity
**Then** exactly one active Hokim account is associated with that District
**And** the server generates a temporary credential of at least 12 characters
**And** the credential is stored only as an Argon2id hash
**And** the account's role and District authorization are assigned by server-side authoritative state.

**Given** a temporary Hokim password has just been generated
**When** creation or reset succeeds
**Then** the plaintext temporary password is shown only on the dedicated one-time credential surface
**And** Copy is available only on that surface
**And** the password is never written to logs, telemetry, Audit History, URL/history state, browser storage, or persistent frontend cache.

**Given** the Product Owner leaves, dismisses, reloads, navigates away from, or restores browser history after the one-time credential surface
**When** the credential surface is no longer the active successful transaction
**Then** the plaintext password cannot be displayed again
**And** persistent UI shows only safe credential status and last-reset time
**And** there is no “reveal password” capability.

**Given** a Hokim enters credentials on the private sign-in surface
**When** authentication succeeds
**Then** the server determines the actor is a Hokim without trusting a browser role selector
**And** authorization resolves deterministically to exactly the District assigned to that account
**And** the Hokim cannot select, request, or derive access to another District.

**Given** the assigned District is still incomplete and not activated
**When** the Hokim attempts to authenticate or access protected Hokim functionality
**Then** no operational Hokim access is granted
**And** the response is sanitized and does not reveal unnecessary District lifecycle internals
**And** successful District activation in Story 1.7 can enable the already-provisioned account without recreating it.

**Given** valid credentials for an eligible Hokim account after its District becomes Active
**When** the Hokim signs in
**Then** the same approved PostgreSQL-backed opaque-session protections apply
**And** only a hashed session token is persisted
**And** the browser receives the host-scoped `Secure`, `HttpOnly`, `SameSite=Strict` session cookie
**And** the session is bound to the server-derived Hokim actor and District context.

**Given** invalid Hokim credentials
**When** sign-in fails
**Then** the same generic Uzbek Cyrillic invalid-credentials behavior is used without disclosing whether the username exists
**And** failed attempts are rate-limited and audited using privacy-safe metadata.

**Given** the Product Owner resets the active Hokim account's credential
**When** reset succeeds
**Then** a new temporary password is generated and shown once
**And** the prior password can no longer authenticate
**And** all existing sessions for that Hokim account are revoked immediately
**And** no unrelated District or Product Owner sessions are revoked.

**Given** the Product Owner disables the Hokim account
**When** disablement succeeds
**Then** new authentication for that account is denied immediately
**And** all of that account's existing sessions are revoked immediately
**And** the District account state is reflected authoritatively in the onboarding readiness check.

**Given** the Product Owner replaces the District Hokim account
**When** replacement succeeds
**Then** the prior account is no longer the active District Hokim account
**And** all sessions belonging to the replaced account are immediately revoked
**And** exactly one new active Hokim account is assigned to the District
**And** its generated temporary password follows the same one-time-display rules.

**Given** an operation would result in more than one active Hokim account for one District
**When** the mutation is attempted
**Then** authoritative application/storage constraints reject it
**And** the existing valid account assignment remains consistent.

**Given** a Hokim session exists
**When** the account is disabled/replaced or the District lifecycle no longer permits Hokim access
**Then** the next protected request fails authorization even if the browser still holds the old session cookie
**And** protected cached content is removed rather than left accessible as stale authorized data.

**Given** a Hokim attempts to access a resource belonging to another District
**When** the request reaches an application or repository boundary
**Then** the server rejects it using the explicit District authorization boundary
**And** no cross-District content, existence information, or credentials are disclosed.

**Given** account creation, reset, disablement, replacement, successful sign-in, or failed sign-in occurs
**When** the action is audited
**Then** Audit History contains privacy-safe actor/District/action/result/time metadata
**And** plaintext passwords, session tokens, resident content, and secrets never appear.

**Given** the Hokim-account readiness state changes
**When** Story 1.3's onboarding checklist is refreshed
**Then** the Hokim prerequisite is derived from authoritative account state
**And** a missing or disabled account is not marked passed
**And** activation still remains governed by all other prerequisites.

**Given** the browser is offline during Product Owner account administration
**When** a create/reset/disable/replace operation is attempted
**Then** the mutation is blocked or fails explicitly
**And** no credential operation is queued for automatic replay
**And** no false success or reusable temporary credential is presented.

**Given** Hokim account administration or sign-in is used with keyboard navigation, supported responsive widths, 200% zoom, or reduced-motion preferences
**When** the relevant screens are operated
**Then** all essential actions remain keyboard accessible with visible focus
**And** credential/status meaning is not color-only
**And** the one-time credential surface remains usable without clipped controls or Cyrillic text.

**Given** Story 1.6 is verified
**When** focused automated checks run
**Then** integration tests cover one-active-account-per-District enforcement, password hashing, deterministic District authorization, immediate session revocation on reset/disable/replace, inactive-District access denial, and cross-District rejection
**And** browser tests cover account creation, one-time credential display, credential disappearance after leaving/reload, reset, disablement, replacement, and blocked Hokim access before District activation.

### Story 1.7: Validate and Activate a District

As the **Product Owner**,
I want to activate a District only after every required onboarding check passes,
So that production operation and Hokim access cannot begin from an incomplete or invalid configuration.

**Acceptance Criteria:**

**Given** a District is in `Setup incomplete`
**When** the Product Owner reviews its onboarding checklist
**Then** the activation control is unavailable unless every required prerequisite is currently passed
**And** the checklist shows the remaining activation blockers explicitly.

**Given** activation readiness is evaluated
**When** the server determines whether the District may activate
**Then** it authoritatively rechecks the required District identity/setup state, subscription/access eligibility, validated Telegram bot, validated approved group-to-Mahalla mappings, active Hokim account, external-disclosure confirmation, District-isolation invariants, and required baseline analysis configuration
**And** browser-maintained or previously cached readiness state cannot substitute for those checks.

**Given** any required check is incomplete or fails
**When** the Product Owner attempts activation
**Then** the District remains `Setup incomplete`
**And** no partial lifecycle transition is committed
**And** the failed activation attempt is audited with privacy-safe actionable failure reasons
**And** the Product Owner can return to the relevant permanent management surface to correct the blocker.

**Given** a readiness check becomes invalid between displaying the checklist and submitting activation
**When** activation is processed
**Then** the authoritative activation transaction detects the changed condition
**And** rejects activation rather than relying on stale UI state.

**Given** every required activation check passes
**When** the Product Owner deliberately activates the District
**Then** the District lifecycle state becomes `Active` through one authoritative transition
**And** the resulting state, activation time, and actor are persisted
**And** the successful activation is recorded in append-only Audit History.

**Given** the activation mutation is executing
**When** the Product Owner submits the action
**Then** duplicate submission is prevented
**And** no optimistic success is shown
**And** the UI reports success only after authoritative server confirmation.

**Given** a District remains `Setup incomplete`
**When** any production-facing path evaluates its lifecycle eligibility
**Then** the District is ineligible for production Telegram intake, AI processing, and Hokim product access
**And** lifecycle eligibility is enforced server-side rather than by hiding frontend controls alone.

**Given** a District has become `Active`
**When** later production Telegram or worker capabilities evaluate the District
**Then** the lifecycle boundary reports the District as eligible for future production work
**And** each District-owned background/external operation must still recheck current lifecycle and District authorization before side effects
**And** activation itself does not fabricate or backfill Telegram messages, Accepted Evidence, Topics, or AI results.

**Given** a previously provisioned active Hokim account belongs to the newly Active District
**When** the Hokim authenticates successfully
**Then** the account may proceed into the District-bound Hokim access flow
**And** authorization remains fixed to that single District
**And** the Hokim receives no District selector or cross-District access.

**Given** the Hokim authenticates with a generated temporary password for the first time
**When** authentication succeeds after District activation
**Then** the Hokim must replace the temporary password before normal product access is granted
**And** the replacement credential must satisfy the approved minimum credential requirements and be stored only as an Argon2id hash
**And** the temporary credential ceases to authenticate after successful replacement.

**Given** the first-sign-in password-replacement surface is displayed
**When** the Hokim reviews it
**Then** it includes the concise factual notice that the Product Owner has standing operational access to the District's retained Topics and Accepted Evidence for operation and troubleshooting under the customer arrangement
**And** that notice is informational only
**And** it introduces no consent checkbox, agreement record, or additional permission gate beyond required password replacement.

**Given** first-sign-in password replacement fails validation or server submission
**When** the failure occurs
**Then** normal Hokim product access remains blocked
**And** valid non-secret entered values are preserved where appropriate
**And** the UI exposes a sanitized error without credentials, hashes, session tokens, or internal error bodies.

**Given** first-sign-in password replacement succeeds
**When** the new credential is committed
**Then** the Hokim continues through role-derived routing into an authorized District-bound landing state
**And** no separate role selection or District selection is introduced
**And** the active session remains governed by the approved revocable-session rules.

**Given** the Product Owner later changes a configuration prerequisite in a way that makes future operation invalid
**When** that capability's approved rules require readiness to be withdrawn
**Then** the system does not silently pretend the prerequisite remains valid
**And** the applicable future-only/lifecycle rule for that configuration governs subsequent work
**And** retained historical evidence and attribution are not rewritten.

**Given** activation succeeds or fails
**When** the result is displayed
**Then** durable feedback identifies the affected District, resulting state or blocker, time in Asia/Tashkent, and route to relevant operational/audit information where useful
**And** secrets or resident content are never included.

**Given** the browser is offline
**When** activation or first-sign-in password replacement is attempted
**Then** the mutation is blocked or fails explicitly
**And** it is never queued for later automatic replay
**And** reconnect revalidates session, District, lifecycle, and readiness before another attempt.

**Given** activation and first-sign-in surfaces are used with keyboard navigation, supported responsive widths, 200% zoom, or reduced-motion preference
**When** the user operates them
**Then** all required actions remain keyboard accessible with visible focus
**And** blocker/success state is not color-only
**And** Uzbek Cyrillic text and required controls remain readable and available without clipping
**And** lifecycle actions cannot be accidentally triggered through duplicate submission.

**Given** Story 1.7 is verified
**When** focused automated checks run
**Then** integration tests cover authoritative readiness revalidation, blocked activation, atomic successful activation, activation audit events, inactive-versus-active access enforcement, lifecycle checks at protected boundaries, and first-sign-in password replacement
**And** browser tests cover activation blockers, successful activation, failed/stale activation, Hokim denial before activation, temporary-password first sign in after activation, required password replacement, informational notice, and successful role-derived routing.
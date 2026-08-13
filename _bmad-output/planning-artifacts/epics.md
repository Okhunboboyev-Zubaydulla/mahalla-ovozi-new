---
stepsCompleted: [1, 2]
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-Mahalla-Ovozi-2026-07-30/prd.md
  - _bmad-output/planning-artifacts/prds/prd-Mahalla-Ovozi-2026-07-30/.memlog.md
  - _bmad-output/planning-artifacts/ux-designs/ux-Mahalla-Ovozi-2026-08-05/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-Mahalla-Ovozi-2026-08-05/EXPERIENCE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-Mahalla-Ovozi-2026-08-05/.memlog.md
  - _bmad-output/forge/mahalla-ovozi-mvp/forged-idea.md
  - _bmad-output/forge/mahalla-ovozi-mvp/.memlog.md
  - _bmad-output/planning-artifacts/architecture/architecture-Mahalla-Ovozi-2026-08-12/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/architecture/architecture-Mahalla-Ovozi-2026-08-12/.memlog.md
---

# Mahalla-Ovozi - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Mahalla-Ovozi, decomposing the requirements from the approved PRD, final UX design contract, hardened Forge decisions, and final Architecture Spine into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: The Product Owner can configure one District-owned passive Telegram bot for each District, and the product accepts messages only from that District's approved groups.

FR2: The product can admit supported human text and textual captions from approved groups while excluding unsupported content, including Telegram-marked forwarded messages, before AI analysis.

FR3: The product can use AI meaning analysis to decide whether structurally supported content is relevant, with configured multilingual vocabulary used only as guidance rather than deterministic admission or rejection.

FR4: The product excludes non-qualifying content and immediately discards it rather than retaining it for later production reassessment.

FR5: The product preserves the originally captured state and original Telegram timestamp of Accepted Evidence; later edits do not rewrite captured evidence and later Telegram deletion does not remove retained evidence before Topic expiry.

FR6: The product can safely handle duplicate delivery and retry incomplete processing without duplicating retained evidence or completed processing results.

FR7: The product can create a Topic for one underlying situation within one District, one Mahalla, and one Uzbekistan calendar day when a self-contained signal qualifies; Topic identity never crosses midnight.

FR8: The product can connect Accepted Evidence to the correct same-day Topic using direct Telegram reply metadata first and, otherwise, reliable same-day semantic context without guessing.

FR9: Context-dependent production AI uses the candidate supported message when applicable together with all raw Accepted Evidence from every same-day Topic in the same Mahalla; required context is never replaced by retrieval, summaries, recent windows, cross-day memory, or silent truncation.

FR10: The product maintains one canonical Topic that can appear in every applicable service and Hokim-related Lane without duplicating Topic identity or Accepted Evidence.

FR11: The product recalculates cautious Topic summary, Lane membership, anchor, latest activity, attribution, and Hokim-related status from current Accepted Evidence while preserving disagreement and never presenting resident reports as verified facts.

FR12: The product preserves Accepted Evidence as the source of truth, displays permitted Telegram identity without inferring phone numbers, and retains each Topic together with all its Accepted Evidence until 90 days after the Topic's latest relevant evidence timestamp.

FR13: The product commits an AI-derived result only when structurally and semantically valid and traceable to the evidence and exact AI configuration that produced it; refusal, overflow, timeout, rate limit, provider failure, and invalid output remain explicit failures with no partial success.

FR14: The Hokim can use one unified fixed-District dashboard with a compact sticky toolbar and five independently scrolling Lanes, with responsive horizontal board navigation rather than a separate History page or sidebar-based dashboard.

FR15: The Hokim can scan concise Topic cards and open evidence detail showing the complete chronological Accepted Evidence trail, original evidence text and identity, and best-effort Open in Telegram actions while preserving dashboard review context.

FR16: The dashboard can refresh Topic data in the background while preserving filters, Lane scroll positions, open evidence detail, and truthful freshness/delay state.

FR17: The Hokim can review current and retained Topics within the same dashboard using complete-day date or retained date-range, Mahalla, Lane/category, and plain-text search criteria, with progressive per-Lane loading and no AI semantic question search.

FR18: The dashboard can summarize the active result set through five compact, filter-aware, neutral statistics cards without implying service quality, sentiment, or representative public opinion.

FR19: The Product Owner can manage every District from one authenticated Console with Overview, System Health, Districts, Telegram Setup, Subscriptions, Hokim Accounts, AI Operations, and Audit History; cross-District evidence is never mixed in one view or search.

FR20: The Product Owner can create a District, save incomplete onboarding, and activate it only after required subscription, Telegram, mapping, Hokim-account, disclosure, isolation, and configuration checks pass; incomplete Districts perform no production intake/AI processing and grant no Hokim access.

FR21: The Product Owner can manage one validated Telegram bot per District and the one-to-one approved Telegram group-to-Mahalla relationship, with receipt/access checks before activation and future-only effects for changes while retained history keeps original attribution.

FR22: The Product Owner can create, reset, disable, or replace the single active Hokim account assigned to a District; authorization resolves deterministically to that District and account disablement/replacement revokes access immediately.

FR23: The Product Owner can manage and roll back versioned global analysis settings and District-specific recognition vocabulary through explicit future-only changes that never replay completed historical message-level decisions and preserve exact configuration lineage.

FR24: The Product Owner can investigate important product and security events through immutable, append-only, searchable Audit History while retained; secrets are redacted, normal Console operations cannot edit/delete audit records, and final District deletion removes District-linked detail while retaining only the approved content-free deletion proof.

FR25: The product can report truthful hierarchical health using Healthy, Delayed, Degraded, Unavailable, Quiet, and Unknown based on technical evidence, never treating message silence as disconnection or treating insufficient evidence as Healthy.

FR26: The Product Owner can inspect overall and per-District operational status across Telegram access, intake freshness, queues/workers, AI delay/failure, web application, database/storage, retention jobs, deletion jobs, and required operating metadata while subscription state remains a separate lifecycle concern.

FR27: The Console can present active operational issues with severity, scope, timing, latest check, and recommended next step; recovery is recorded only after a successful technical check, retry is allowed only for incomplete duplicate-safe work, and MVP has no external alerting, acknowledgement workflow, or automatic repair.

FR28: The product can evaluate pilot freshness targets and provide privacy-safe diagnostics: eligible-message processing entry target 5 minutes, related Topic-update target 15 minutes, technical health older than 10 minutes becomes Unknown, and diagnostics exclude resident content and secrets.

FR29: The Product Owner can view and manually manage each District's product-access subscription status while payment remains outside Mahalla Ovozi, with optional external reference/internal note and audited consequence-aware status changes.

FR30: The Product Owner can keep a District Active, manually start seven-day Grace, allow automatic Suspension at Grace expiry, and restore eligible Grace/Suspended Districts to Active; Suspension stops new intake/processing/Hokim access and reactivation resumes only future messages.

FR31: The Product Owner can Cancel a District with explicit high-assurance confirmation and can begin gated recovery before the displayed 30-day live-deletion deadline; recovery requires a new validated bot token and all activation checks, and missed messages are never backfilled.

FR32: The product automatically deletes all remaining District data from live systems at the cancellation deadline, expires protected backup copies within the approved backup window, retains only minimal content-free deletion proof, makes deletion/backup-expiry separately verifiable and retry-safe, and reapplies deletion/retention state before any disaster-restored service becomes accessible.

### NonFunctional Requirements

NFR1: Capacity envelope — support up to four Active Districts, 30 Mahallas/approved groups per District, 120 groups total, about 20,000 structurally valid messages/day, bursts around 100 messages/minute, at least 10 simultaneous authenticated sessions, and approximately 180,000 retained Accepted Evidence records across 90 days, subject to production-shaped verification.

NFR2: User-facing web performance — at the approved envelope, at least 95% of dashboard/Console requests become usable within 3 seconds, filter changes within 2 seconds, and evidence detail within 1 second when retained data is available; large result sets load progressively and background refresh preserves active view state.

NFR3: Durable and duplicate-safe processing — durably persist authorized intake and required asynchronous work before successful Telegram acknowledgement, keep normal/burst webhook persistence below 1 second for at least 95% of traffic, preserve deterministic source order where context/shared Topic state depends on order, survive retries/restarts without duplicate completed results, and fail explicitly instead of silently dropping evidence or committing partial AI success.

NFR4: Backup and disaster recovery — target RPO <= 1 hour and RTO <= 8 hours; backups are encrypted, access-controlled, off-primary, monitored, expire deleted-District content within 30 days after live deletion, and restore procedures reconcile deletion and normal retention before access; clean restore tests run before launch, at least every three months, and after major storage/backup changes.

NFR5: Authentication and District isolation — private username/password access only, no public registration, minimum 12-character credentials stored as secure hashes, HTTPS and secure browser sessions with 12-hour inactivity timeout, immediate revocation on disable/replace, failed-login rate limiting/audit, deterministic District authorization outside AI, and no MFA/email reset/social login/SSO in MVP.

NFR6: Lightweight data protection — HTTPS; credentials/keys remain server-side; raw Telegram content is excluded from routine logs, metrics, traces, and raw displayed errors; District authorization, retention, cancellation, and deletion rules are consistent; enterprise privacy/admin features and automatic personal-data redaction remain out of scope.

NFR7: Device compatibility and practical accessibility — desktop-first around 1366x768 but usable on smaller supported browsers through responsive reflow/horizontal board navigation; support current and previous major Chrome, Edge, and Safari; core keyboard access, readable contrast, non-color-only state meaning, touchable controls, correct Uzbek Cyrillic rendering, and no formal accessibility certification requirement.

NFR8: Language, evidence fidelity, and time — all product-facing MVP UI and AI Topic summaries use Uzbek Cyrillic; Telegram evidence remains verbatim in original language/script; search uses original evidence; user-facing calendar/time boundaries use Asia/Tashkent with DD.MM.YYYY and 24-hour HH:mm conventions; technical identifiers remain unchanged; no language switcher or timezone selector.

### Additional Requirements

- AR1 — Preserve the final hexagonal modular-monolith boundary: one application/codebase and MVP deployment boundary, domain-oriented modules, project-owned ports, infrastructure/provider SDKs behind adapters, and HTTP/webhook plus worker processes from the same backend codebase rather than microservices.
- AR2 — Establish a pnpm 11.x TypeScript workspace on Node.js 24 LTS; backend uses Fastify 5.x, frontend uses React 19.2 + Vite 8.x + minimal React Router, and Ant Design 6.x is the primary UI component/styling system with narrowly scoped custom CSS only where required by approved UX.
- AR3 — PostgreSQL 18.x is the sole system of record and pg-boss 12.x is the durable job mechanism; authoritative state and consequential jobs are committed atomically where required, business effects use explicit idempotency/uniqueness boundaries, and ordering-sensitive Mahalla/day work uses deterministic queue serialization as coordination only.
- AR4 — Use Drizzle ORM/Kit with TypeScript-owned schemas and reviewable version-controlled SQL migrations; shared/production databases never use direct schema push, and explicit transactions/native parameterized PostgreSQL SQL are used where appropriate.
- AR5 — Build contextual AI inputs as deterministic complete District+Mahalla+Asia/Tashkent-day snapshots from PostgreSQL; raw evidence stays verbatim, evidence ordering is Telegram timestamp then Telegram message ID then internal evidence ID, and every snapshot carries contextRevision, fingerprint, and serializer version.
- AR6 — Contextual AI provider calls run outside database transactions and commit only through optimistic revision/CAS validation; revision mismatch is STALE_SNAPSHOT and commits no AI-derived state, and completed historical message-level decisions are never replayed merely because context advanced.
- AR7 — Treat Topic-derived data as one atomic projection with required/applied derived generations; only affected Topics become refresh targets, pending work coalesces to the newest required generation, and commit requires both target-generation and context-revision validity.
- AR8 — Route all production AI through a project-owned typed provider-neutral gateway; keep provider SDK/native errors inside adapters, use project-owned Zod 4 schemas and portable structured-output contracts, perform structural plus semantic validation, keep immutable versioned AI profiles, distinguish logical operations from provider attempts, and normalize explicit failure categories with no partial commit.
- AR9 — Authentication uses project-owned PostgreSQL-backed opaque revocable sessions and Argon2id; only hashed session tokens persist server-side, browser tokens use host-scoped Secure/HttpOnly/SameSite=Strict cookies, protected state changes enforce same-origin/Origin/Fetch-Metadata checks, and login is rate-limited.
- AR10 — Every District-owned application/repository/job operation carries explicit District scope; missing scope is an error, Product Owner global operations use dedicated global contracts, database relationships preserve District identity, and background jobs re-check lifecycle/access before external or AI side effects. PostgreSQL RLS remains deferred for MVP.
- AR11 — Store District Telegram bot tokens only as authenticated ciphertext under a deployment-held versioned key; plaintext secrets never enter logs, telemetry, audit, URLs, or browser persistence and obsolete credentials are removed through rotation/offboarding lifecycle rules.
- AR12 — Use same-origin versioned JSON REST under /api/v1/* with shared browser-safe Zod contracts; database rows/provider/job objects never cross the API boundary, failures use a stable sanitized envelope, long collections use opaque deterministic cursor/keyset pagination, and authoritative mutations do not use optimistic success unless the operation contract explicitly allows safe retry.
- AR13 — TanStack Query owns frontend server state and ordinary React state owns ephemeral form/interaction state; every District-scoped query key includes District, District switching performs dirty-state resolution followed by prior-District request cancellation, protected-cache purge and local-state clearing before new load, and late stale-District responses never render.
- AR14 — Deploy the MVP on one Linux host with Docker Compose and Caddy as the only public edge; internal services remain private, SPA/API/webhook are same-origin, and HTTP/worker runtimes share the backend image/codebase.
- AR15 — Use pgBackRest 2.59.x with continuous WAL archiving to encrypted off-primary S3-compatible storage; backup expiry after District deletion is separately verified, and disaster restoration blocks normal access until current deletion tombstones and normal retention have been reconciled.
- AR16 — Maintain a minimal privacy-safe deletion-tombstone reconciliation source outside restorable PostgreSQL backup history so older database restores can prove which Districts must remain deleted.
- AR17 — Use OpenTelemetry metrics/traces through an OTLP/collector boundary and privacy-safe structured JSON logs; routine telemetry must exclude raw resident evidence, AI context, search text, credentials, and secrets while measuring intake, backlog/queue age, retries, stale snapshots, context size/tokens, AI/end-to-end latency/cost/failures, Topic refresh/coalescing, database/WAL/backup, deletion-backup expiry, and restore drills.
- AR18 — Product Owner System Health remains application-owned sanitized state and must work independently of the engineering telemetry backend.
- AR19 — Preserve final consistency conventions: strict TypeScript; functional composition preferred; database snake_case; opaque IDs; timestamptz/UTC storage with explicit Asia/Tashkent derivation; short database transactions; audit append-only while retained; and no raw resident evidence/secrets in audit payloads.
- AR20 — Use Vitest 4.1.x and Playwright 1.60.x for focused backend/frontend and critical browser verification, favoring integration/E2E behavior over low-value implementation-detail tests.
- AR21 — Do not introduce RAG/vector retrieval, embeddings/HNSW/reranking, Redis/message brokers, microservices, Kubernetes/multi-host HA, Redux/Zustand, GraphQL/tRPC/BFF, Next.js/SSR/RSC/server actions, Tailwind/second UI framework, PostgreSQL RLS, or local/self-hosted AI unless a later approved requirement specifically changes the architecture.

### UX Design Requirements

UX-DR1: Implement the final light-only Civic Teal design token system through Ant Design ConfigProvider/theme tokens, preserving approved semantic colors, spacing, 8px radius, restrained borders/tonal hierarchy, primary-selection versus keyboard-focus distinction, and no persistent card shadows.

UX-DR2: Use the approved type ramp with no user-facing text below 14px; Topic summaries remain complete and unclamped; controls, long District/Mahalla names, statuses and mixed-script evidence must wrap without clipping; acceptance-test full Uzbek Cyrillic glyph coverage including Ў ў Қ қ Ғ ғ Ҳ ҳ across supported browsers/OS families.

UX-DR3: Keep the Hokim dashboard overview-first: no sidebar/page tabs; compact sticky toolbar, visible filter-aware statistics, fixed Lane order Ҳокимга оид, Сув, Электр, Газ, Чиқинди, and independent Lane scrolling on the primary desktop composition.

UX-DR4: Dashboard date, one-or-all Mahalla, one-or-more Lane visibility, and approximately 400ms debounced plain-text search must update Lanes and statistics together; zero selected Lanes are prevented, search never becomes semantic AI search, and search text remains ephemeral active-session state rather than URL/history/storage/telemetry/audit data.

UX-DR5: Keep all five statistics cards read-only/non-focusable; when the strip overflows, provide labelled keyboard-operable Previous/Next statistic controls moving one card at a time, announcing visible metric name/position and preserving position across responsive changes.

UX-DR6: Implement the Lane board as a labelled horizontal scroll region whenever all selected Lanes do not fit; provide visible Previous/Next Lane controls, one-Lane-at-a-time settling, native Topic-card Tab order, off-screen focus reveal, and preserved horizontal plus per-Lane vertical scroll state.

UX-DR7: Topic cards show the complete cautious summary, Mahalla, latest meaningful activity, retained evidence count, explicit Янги/Янгиланди state, and textual additional-Lane membership without quote previews, AI subcategory tags, ranking, urgency, sentiment, or truncation.

UX-DR8: Desktop read-only evidence/record detail is a labelled non-modal complementary region with heading focus on open, Close first, accessible opener relationship, underlying surface still operable without covered focus targets, and exact opener focus restoration; on narrow screens read-only detail becomes a routed full-screen page, never a modal dialog.

UX-DR9: Evidence detail shows the canonical Topic context and complete Accepted Evidence oldest-to-newest, preserving original language/script/line breaks, username otherwise display name, no phone number, and best-effort per-item Telegram navigation whose failure never invalidates retained evidence.

UX-DR10: Background refresh keeps last successful permitted data, filters, selected record, open detail and scroll positions; unchanged refresh announces nothing, changed content gives one scoped new/updated announcement, ordinary refresh failure shows persistent stale warning, and auth/lifecycle/retention invalidation immediately removes protected content instead of preserving stale data.

UX-DR11: Implement explicit dashboard loading, empty, filtered-empty, lane-empty, delayed-processing and progressive-load states using approved Uzbek Cyrillic copy; progressive loading is explicit local Яна кўрсатиш with local retry rather than infinite scroll, and skeletons contain no invented data and stop animating under reduced motion.

UX-DR12: Product Owner Console provides persistent navigation across the approved eight sections, keeps selected District context visible where applicable, permits all-District scope only for aggregate views, and requires explicit District scope for evidence, mappings, accounts, credentials, District settings and destructive operations.

UX-DR13: Product Owner District switching is an atomic protected-context transition: resolve any dirty-form guard first, keep existing context unchanged while the choice is pending, then purge prior-District content-bearing state before new load; cancel/ignore prior requests and never render a late response for a different District.

UX-DR14: All configuration forms use explicit Save rather than autosave; entry/blur errors do not steal focus; failed Save focuses one linked error summary, marks invalid controls programmatically, preserves valid values, shows unsaved-change state, and applies the dirty-form guard to navigation, Close/Escape, browser Back, sign-out and any responsive surface replacement that cannot preserve the draft.

UX-DR15: District onboarding uses a resumable setup checklist, saves one section at a time, shows passed/incomplete/failed states and activation blockers, includes the required external-disclosure confirmation, and enables activation only after all required checks pass.

UX-DR16: Telegram Setup uses a bot connection status card plus searchable one-to-one Mahalla mapping records; token entry is an active-transaction secret never restored or persisted client-side, mapping activation requires bot access/privacy-mode/test-message checks, and risky replacement/removal/disable/remap actions preview exact future-only consequences before confirmation.

UX-DR17: Hokim-account creation/reset shows the generated temporary password only on a dedicated one-time credential surface with Copy available only there; leaving, dismissing, reloading or history restoration makes it unavailable and persistent UI shows only credential status/last-reset time.

UX-DR18: System Health uses overall status, active issues and District/component coverage with explicit Quiet/Unknown distinctions, privacy-safe issue detail, safe Retry only for eligible incomplete work, and routes subscription-caused pauses to Subscriptions instead of technical-failure presentation.

UX-DR19: Subscriptions provide all-District summary plus District detail with current state, state-start time, operational consequences, next transition and lifecycle timeline; Cancellation uses a high-assurance dialog showing exact deadlines/consequences, requires a reason plus typed District name, and Enter alone never triggers the destructive action.

UX-DR20: AI Operations uses separate Global and District settings, explicit drafts, validation, field-level diffs, current active version and activation time, future-only activation, reason capture, read-only version history, and rollback by creating/activating a new version copied from an earlier version rather than rewriting history.

UX-DR21: Audit History is a read-only chronological data collection with District/action/date filters and safe free-text search over non-secret operational metadata; no edit/delete controls exist, details are immutable, long histories load progressively, and permanent content-free District deletion proofs are clearly separated/searchable.

UX-DR22: All user-visible errors are sanitized and scoped: show only safe category, affected scope, time, privacy-safe identifier and useful next action; never expose raw resident content, credentials, bot/provider secrets or upstream error bodies; action progress prevents duplicate submit without freezing the page and no optimistic success is shown for sensitive/lifecycle operations.

UX-DR23: Apply the accessibility floor across all surfaces: keyboard-operable core actions; visible logical focus; semantic names/roles/states/relationships; scoped live regions; semantic table headers; labelled keyboard-scrollable matrix/diff regions; state never color-only; essential boundaries >=3:1 non-text contrast; load-bearing text WCAG AA; minimum 44x44 CSS-pixel activation areas on phone/tablet with 8px separation; no destructive action by Enter alone.

UX-DR24: Responsive behavior follows effective CSS viewport including browser zoom: desktop, tablet and phone compositions retain all important capabilities; at 200% zoom and 320 CSS-pixel equivalent viewport there is no clipped Cyrillic, hidden actions, overlapping sticky content or page-level horizontal overflow except intentional labelled Lane/matrix/diff regions.

UX-DR25: Under prefers-reduced-motion, drawer/sheet/filter/reveal transitions and all programmatic scrolling become immediate, skeleton animation is disabled, and essential focus/selection/progress/status feedback remains visible statically.

UX-DR26: Apply one browser-network-loss contract to every surface: permitted previously loaded data may remain visible read-only with offline warning/last update, new loads and mutations are blocked and never queued/resubmitted automatically, reconnect revalidates session/role/District/lifecycle/retention before refresh, and connectivity loss alone never creates a System Health failure.

UX-DR27: Keep cancellation/configuration/subscription-note and other audit-bound free-text fields explicitly non-sensitive; help text prohibits resident content/identifiers and secrets, known product secrets are rejected with sanitized validation, and MVP adds no general personal-data-redaction workflow.

UX-DR28: Use calm concise Uzbek Cyrillic UI microcopy, exact Asia/Tashkent date/time formatting, truthful freshness and neutral empty states, and preserve original technical identifiers; Help explains signal limitations, multi-Lane identity, evidence order, freshness, retention, Telegram limitations and Hokim decision ownership without adding support chat, feedback, or AI help.

### FR Coverage Map

FR1: Epic 2 - District-specific passive Telegram bot intake.
FR2: Epic 2 - Supported content intake and structural exclusions.
FR3: Epic 2 - Semantic relevance decision.
FR4: Epic 2 - Relevance exclusions and disposal.
FR5: Epic 2 - Original Telegram message-state preservation.
FR6: Epic 2 - Duplicate-safe and retry-safe processing.
FR7: Epic 2 - Same-day Topic identity and seeding.
FR8: Epic 2 - Same-day Topic matching.
FR9: Epic 2 - Complete same-day Mahalla evidence context.
FR10: Epic 2 - Canonical multi-Lane Topic behavior.
FR11: Epic 2 - Cautious derived Topic information.
FR12: Epic 2 - Evidence integrity and 90-day Topic-level retention.
FR13: Epic 2 - Explicit AI failure handling and traceability.
FR14: Epic 3 - Unified five-Lane Hokim dashboard.
FR15: Epic 3 - Topic cards and complete evidence detail.
FR16: Epic 3 - Stable refresh and truthful freshness.
FR17: Epic 3 - Retained history, filters, search, and progressive loading.
FR18: Epic 3 - Filter-aware neutral statistics.
FR19: Epic 1 - Unified Product Owner Console and District-scoped operational context.
FR20: Epic 1 - Gated and resumable District onboarding.
FR21: Epic 1 - Telegram bot, group, and Mahalla management.
FR22: Epic 1 - Hokim account lifecycle and District access boundary.
FR23: Epic 5 - Versioned future-only analysis configuration.
FR24: Epic 4 - Immutable searchable Audit History.
FR25: Epic 4 - Truthful hierarchical health status.
FR26: Epic 4 - Product and District monitoring coverage.
FR27: Epic 4 - Actionable in-Console issue lifecycle and safe retry.
FR28: Epic 4 - Pilot operating targets and privacy-safe diagnostics.
FR29: Epic 6 - Manually managed subscription record.
FR30: Epic 6 - Active, Grace, Suspended, and restoration lifecycle.
FR31: Epic 6 - Confirmed cancellation and gated recovery.
FR32: Epic 6 - Verified live deletion, protected-backup expiry, and restore reconciliation.

## Epic List

### Epic 1: Secure District Onboarding & Access
The Product Owner can create and configure an isolated District, connect its Telegram setup, create its Hokim account, complete required checks, activate it, and ensure both roles can access only the scopes they are authorized to use.
**FRs covered:** FR19, FR20, FR21, FR22.

Implementation/UX notes: Establish the Product Owner Console shell, authentication/session foundation, explicit District context, resumable setup, encrypted bot-secret handling, one-to-one group/Mahalla configuration, one-time Hokim credentials, activation gates, and deterministic tenant isolation. Cross-cutting security, responsive, accessible, sanitized-error, and dirty-state rules apply from this first epic.

### Epic 2: Authorized Telegram Signals Become Traceable Topics
An activated District can passively receive authorized Telegram messages and reliably turn qualifying evidence into cautious, same-day canonical Topics with complete traceability.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8, FR9, FR10, FR11, FR12, FR13.

Implementation/UX notes: Keep Telegram intake, relevance, evidence, Topic grouping, and AI derivation together because they form one end-to-end signal capability. Carry durable/idempotent intake, deterministic source ordering, complete same-day context, contextRevision/CAS, derived generations, immutable AI profiles, explicit failures, evidence fidelity, and retention as correctness boundaries rather than separate technical epics.

### Epic 3: Hokim Situational Awareness & Retained History
The Hokim can understand current District signals, inspect their complete evidence, and find retained historical signals from the same unified five-Lane dashboard.
**FRs covered:** FR14, FR15, FR16, FR17, FR18.

Implementation/UX notes: Deliver the approved overview-first dashboard, Topic/evidence detail, stable refresh, freshness states, coordinated filters/search/statistics, per-Lane progressive loading, responsive horizontal Lane navigation, keyboard/focus behavior, reduced-motion support, and preserved review context. Accessibility and responsive requirements remain story acceptance criteria, not a separate frontend epic.

### Epic 4: Operational Health & Auditable Investigation
The Product Owner can determine whether Districts are operating correctly, distinguish real failures from quiet or delayed states, investigate safely, retry eligible incomplete work, verify recovery, and inspect immutable operational history.
**FRs covered:** FR24, FR25, FR26, FR27, FR28.

Implementation/UX notes: Treat System Health and Audit History as one operational investigation loop. Keep product health application-owned and privacy-safe, distinguish subscription pauses from technical failure, expose only sanitized diagnostics, allow retry only for incomplete duplicate-safe work, record failure/recovery, and add no external alerts, acknowledgement workflow, automatic repair, or raw resident evidence in routine telemetry.

### Epic 5: Controlled Future Analysis Configuration
The Product Owner can safely change or roll back AI/model/prompt/vocabulary configuration for future processing while preserving exact historical lineage and never replaying completed message-level decisions.
**FRs covered:** FR23.

Implementation/UX notes: Deliver Global and District configuration drafts, validation, field-level diffs, immutable version history, confirmation/reason capture, future-only activation, rollback-as-new-version, and project-owned provider-neutral profile lineage. This stays separate from signal processing because it is a distinct Product Owner operational capability and risk boundary.

### Epic 6: Subscription Lifecycle, Recovery & Verified Deletion
The Product Owner can manage Active, Grace, Suspended, and Cancelled District states, recover an eligible cancelled District, or allow it to proceed safely through live deletion and protected-backup expiry with disaster-restore reconciliation.
**FRs covered:** FR29, FR30, FR31, FR32.

Implementation/UX notes: Keep commercial lifecycle, recovery, retention interaction, live deletion, backup expiry, deletion tombstones, and restore reconciliation together as one business correctness boundary. Preserve exact lifecycle consequences, future-message-only reactivation, high-assurance cancellation, retry-safe deletion milestones, and Critical health visibility for failed deletion or backup expiry.

### Natural Dependency Direction

Epic 1 enables the secure District and access foundation. Epic 2 builds the core signal-production capability on an activated District. Epic 3 exposes those Topics and evidence to the Hokim. Epic 4 adds Product Owner operational diagnosis over the working system. Epic 5 adds controlled future analysis configuration without changing prior history. Epic 6 completes the District commercial/offboarding lifecycle. Later epics may depend on earlier capabilities, but no epic depends on a future epic to complete its own outcome.

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
**Then** integration tests cover encrypted token persistence, one-bot-per-District enforcement, successful/failed validation, replacement atomicity, explicit District scoping, and secret exclusion from returned contracts
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

**Given** a Telegram group is already mapped
**When** the Product Owner attempts to map that same group to a second Mahalla, or map a second group to an already-mapped Mahalla
**Then** the save is rejected
**And** the conflicting mapping is identified with sanitized, useful feedback
**And** the existing valid mapping remains unchanged.

**Given** a mapping is newly configured
**When** its Telegram readiness is validated
**Then** the system verifies the configured District bot has the required access to that exact group
**And** verifies the required bot/privacy-mode configuration
**And** verifies receipt using the approved test-message flow before the mapping can become ready
**And** a stored mapping alone is never treated as proof that Telegram delivery works.

**Given** the Product Owner is performing the test-message flow
**When** the system is waiting for the expected Telegram evidence
**Then** the UI exposes an explicit waiting state
**And** identifies the correct District/group safely
**And** does not claim success until the authoritative expected test receipt is observed.

**Given** the expected test message is received successfully through the configured District bot
**When** its group identity matches the mapping under validation
**Then** that mapping is marked passed/readied
**And** the test verifies connectivity/configuration only
**And** the test message does not become production Accepted Evidence or start Topic/AI processing while the District remains incomplete.

**Given** the test times out, the bot lacks access, privacy-mode/configuration is wrong, the message arrives from a different group, or Telegram validation otherwise fails
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
**Then** integration tests cover one-to-one constraints, explicit District scoping, unauthorized-group rejection, access/privacy/test validation, timeout/conflict states, authoritative readiness updates, and future-only remapping behavior
**And** browser tests cover creating a mapping, mapping conflict, successful test-message validation, timeout/failure, searching mappings, and protected offline behavior.

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
**And** browser tests cover activation blockers, successful activation, failed/stale activation, Hokim denial before activation, temporary-password first sign-in after activation, required password replacement, informational notice, and successful role-derived routing.

## Epic 2: Authorized Telegram Signals Become Traceable Topics

An activated District can passively receive authorized Telegram messages and reliably turn qualifying evidence into cautious, same-day canonical Topics with complete traceability.

### Story 2.1: Durably Receive Authorized District Telegram Messages

As the **Product Owner**,
I want each activated District's Telegram bot to receive messages only from that District's approved groups and hand authorized intake off durably,
So that downstream signal processing begins from isolated, traceable, retry-safe Telegram input.

**Acceptance Criteria:**

**Given** a District is Active, its Telegram bot is valid, and the source Telegram group has an approved one-to-one mapping to a Mahalla in that District
**When** Telegram delivers a message update through that District's bot
**Then** the application resolves the District and Mahalla from authoritative server-side configuration
**And** the intake is explicitly scoped to that District
**And** no client- or Telegram-supplied District identifier is trusted as authorization evidence.

**Given** an update arrives through a District bot
**When** its source group is not currently approved for that same District, belongs to another District, or has no valid Mahalla mapping
**Then** the message does not enter production processing
**And** no AI operation or downstream processing job is created from it
**And** its resident message content is not retained as production evidence or routine diagnostic data
**And** another District's configuration can never authorize it.

**Given** the District is not Active at the time intake is evaluated
**When** Telegram delivers an update
**Then** production intake and downstream processing do not begin
**And** no later worker may bypass that lifecycle decision merely because an earlier job or request existed.

**Given** an authorized update is eligible for production intake
**When** the webhook handler accepts it
**Then** the authorized intake state and its required asynchronous processing work are made durable in PostgreSQL/pg-boss before Telegram receives a successful acknowledgement
**And** persistence and consequential job creation are atomic wherever both are required for correctness
**And** a persistence or enqueue failure cannot be reported as successful durable intake.

**Given** the same Telegram update or message is delivered more than once because of retry, redelivery, or concurrent webhook handling
**When** intake is processed repeatedly
**Then** all deliveries resolve to one logical intake item and one required downstream business effect
**And** duplicate delivery cannot create duplicate retained candidate state or duplicate consequential processing
**And** incomplete work remains retryable without replaying already-completed intake effects.

**Given** an authorized message is durably captured for later processing
**When** its processing is delayed or retried
**Then** the originally received Telegram message identifiers, original Telegram timestamp, source group, resolved District, and resolved Mahalla remain stable
**And** the Uzbekistan calendar day used for ordering-sensitive processing is derived from the original Telegram timestamp in `Asia/Tashkent`, not from retry or worker execution time.

**Given** multiple authorized messages for the same District, Mahalla, and Uzbekistan calendar day may be processed concurrently
**When** downstream work is scheduled
**Then** ordering-sensitive processing is coordinated using the stable District + Mahalla + day scope
**And** source ordering can later be resolved deterministically without depending on worker arrival order
**And** unrelated scopes remain free to process concurrently.

**Given** intake succeeds, is rejected, duplicated, delayed, or fails durably
**When** routine logs, metrics, or traces are emitted
**Then** they contain sufficient privacy-safe operational metadata to measure intake count, duplicate handling, persistence failures, and webhook durability latency
**And** raw Telegram message content, bot tokens, AI context, credentials, and other secrets are absent from routine telemetry and audit payloads.

**Given** Story 2.1 is verified
**When** focused automated and production-shaped checks run
**Then** integration tests cover Active approved-group intake, inactive-District rejection, unapproved-group rejection, cross-District rejection, durable job handoff, transaction failure, duplicate/redelivery behavior, retry stability, original-timestamp preservation, and District/Mahalla/day isolation
**And** tests prove this story makes no AI relevance or Topic decision yet
**And** webhook durability is verified against the approved NFR3 target of successful authorized persistence below one second for at least 95% of normal/burst traffic at the MVP envelope.

### Story 2.2: Admit Supported Telegram Content and Discard Structural Exclusions

As the **Product Owner**,
I want authorized Telegram intake to admit only supported human text or textual captions and discard structurally unsupported content before AI,
So that AI analysis receives only valid candidate content and excluded Telegram content is not retained for later reassessment.

**Acceptance Criteria:**

**Given** an authorized intake item from Story 2.1 contains a human-authored text message
**When** structural content qualification runs
**Then** its original text is admitted as a supported candidate for subsequent semantic analysis
**And** its original Telegram timestamp, message identifiers, District, Mahalla, source group, and required message relationship metadata remain associated with the candidate
**And** the text is preserved verbatim without translation, normalization, summarization, or rewriting.

**Given** an authorized Telegram message contains media with a non-empty textual caption
**When** structural content qualification runs
**Then** the textual caption can be admitted as the candidate content
**And** the caption remains verbatim in its original language, script, and line structure
**And** media bytes, OCR output, audio transcription, document contents, and other attachment contents are not downloaded or introduced into AI context by this capability.

**Given** an authorized Telegram update contains a command, bot-authored message, empty supported content, captionless media, audio-only content, document/file content without a supported textual caption, or another unsupported content type
**When** structural content qualification runs
**Then** it is excluded before any AI operation is created or invoked
**And** it cannot become Accepted Evidence or seed/update a Topic
**And** its raw resident content is discarded after the structural outcome is completed.

**Given** Telegram marks a message as forwarded using Telegram-provided forwarding metadata
**When** structural qualification evaluates it
**Then** the message is excluded before AI regardless of the apparent meaning of its text or caption
**And** configured vocabulary or keywords cannot override the exclusion
**And** the forwarded message content is not retained for future production reassessment.

**Given** a non-forwarded message directly replies to a Telegram-marked forwarded message
**When** the reply itself contains structurally supported human text or a textual caption
**Then** the reply may continue as its own candidate for later semantic analysis
**And** the forwarded parent remains excluded
**And** the forwarded parent's content is not fetched, retained, or supplied as candidate context
**And** the later semantic decision must determine whether the reply is sufficiently self-contained to qualify.

**Given** a structurally excluded message has completed its structural decision
**When** the same Telegram delivery is retried, redelivered, or processed concurrently
**Then** it remains one completed structural outcome
**And** duplicate handling does not invoke AI or recreate discarded resident content
**And** any minimal state retained solely for duplicate-safe processing contains no discarded raw message/caption content.

**Given** a candidate was authorized and attributed to its District and Mahalla when durably received in Story 2.1
**When** structural processing occurs later
**Then** it uses that captured District/Mahalla/source attribution rather than silently remapping the historical intake item from a later configuration change
**And** future-only mapping changes affect only subsequent intake
**And** current District lifecycle eligibility is still rechecked where required before later AI side effects.

**Given** structurally supported content passes this story's qualification
**When** it is handed to the next processing stage
**Then** no relevance, Lane, Topic membership, Topic creation, summary, or other AI-derived success has yet been asserted
**And** configured multilingual recognition vocabulary has not been used as a deterministic structural admission/rejection rule.

**Given** structural processing succeeds, excludes content, retries, or fails
**When** operational telemetry is emitted
**Then** privacy-safe metrics/logs can distinguish supported candidates, structural exclusion categories, retries, failures, and processing latency
**And** raw Telegram content, discarded captions, attachment contents, bot tokens, credentials, and secrets do not enter routine logs, metrics, traces, or Audit History.

**Given** structural processing encounters malformed or insufficient Telegram metadata such that the required content/origin/forwarding decision cannot be made safely
**When** qualification cannot establish a valid supported candidate
**Then** the system does not guess or send the message to AI
**And** processing fails or excludes it through an explicit safe outcome as appropriate
**And** no partial candidate or Accepted Evidence state is committed.

**Given** Story 2.2 is verified
**When** focused automated checks run
**Then** integration tests cover supported human text, textual captions, commands, bot messages, empty content, captionless media, audio, documents/file contents, Telegram-marked forwards, non-forwarded replies to forwarded parents, malformed metadata, duplicates, and delayed processing
**And** tests prove structural exclusions never invoke the AI gateway
**And** tests prove excluded raw content is not retained for future reassessment and supported content reaches the next stage verbatim with its original captured scope and Telegram metadata.

### Story 2.3: Decide Semantic Relevance by Meaning and Discard Non-Qualifying Content

As the **Hokim**,
I want structurally supported Telegram messages to be judged by their meaning rather than by keyword matching,
So that genuinely relevant District signals continue toward Topics while irrelevant group content is discarded.

**Acceptance Criteria:**

**Given** a structurally supported candidate from Story 2.2
**When** semantic relevance analysis runs
**Then** the decision is made through the project-owned AI gateway using meaning analysis
**And** the candidate's original text or caption remains verbatim
**And** deterministic District, Mahalla, lifecycle, authorization, retention, and Telegram-forwarding rules remain outside AI control.

**Given** configured District recognition vocabulary contains Uzbek or Russian, Latin or Cyrillic forms, jargon, abbreviations, common typos, or informal terms
**When** relevance is evaluated
**Then** that vocabulary is supplied only as guidance to semantic analysis
**And** presence of a configured term cannot by itself force a candidate to qualify
**And** absence of a configured term cannot by itself prevent a candidate from qualifying.

**Given** a candidate clearly reports a supported Water, Electricity, Gas, or Waste situation, complaint, or another qualifying signal
**When** its meaning satisfies the approved relevance rules
**Then** it receives a completed `relevant` semantic decision
**And** it may continue as a relevance-qualified candidate toward same-day Topic assignment
**And** it is not yet treated as Accepted Evidence or a Topic merely because relevance succeeded.

**Given** a candidate directly and meaningfully concerns the Hokim or District leadership
**When** relevance is evaluated
**Then** a direct configured Hokim reference or clear semantic leadership reference can qualify
**And** a non-service complaint such as a road problem can qualify for later Hokim-related handling when that connection is clear
**And** a vague expression such as “responsible people” does not qualify merely by implication when no reliable connecting context exists.

**Given** semantic interpretation requires same-day Mahalla context to resolve an otherwise ambiguous candidate
**When** the contextual relevance operation is prepared
**Then** its canonical input contains the candidate plus all raw Accepted Evidence from every same-day Topic in that Mahalla
**And** evidence is ordered deterministically by original Telegram timestamp, then Telegram message ID, then internal evidence ID
**And** RAG, vector retrieval, summaries, recent-message windows, cross-day memory, or top-K selection do not replace that required context
**And** required older same-day evidence is never silently truncated.

**Given** a non-forwarded reply to a Telegram-marked forwarded parent passed Story 2.2's structural boundary
**When** semantic analysis determines whether that reply can proceed
**Then** the reply must contain a sufficiently self-contained qualifying signal
**And** the excluded forwarded parent is never supplied as context
**And** a reply that depends on the forwarded parent for its meaning is excluded rather than guessed or reconstructed.

**Given** a candidate is a planned announcement, advertisement, pure speculation, neutral Hokim mention, praise, or other non-qualifying content
**When** it contains no independently qualifying reported situation, complaint, or meaningful Hokim-related concern
**Then** the completed semantic decision is `irrelevant`
**And** it does not become Accepted Evidence or proceed to Topic processing
**And** its resident raw content is discarded after the completed decision
**And** it is not retained for later automatic reconsideration.

**Given** a candidate is semantically excluded
**When** Telegram later redelivers the same message or a worker restarts
**Then** the completed decision is not replayed merely because of redelivery or restart
**And** discarded raw content is not reconstructed
**And** only minimal content-free state required for duplicate/idempotency handling may remain.

**Given** a logical semantic-relevance operation is created
**When** it invokes an AI provider
**Then** it pins the exact immutable AI profile/configuration version used for that logical operation
**And** provider calls occur outside database transactions
**And** retries of that unfinished logical operation retain the pinned profile
**And** later configuration activation does not replay an already-completed historical relevance decision.

**Given** contextual relevance analysis captured a Mahalla/day `contextRevision` and snapshot fingerprint
**When** Accepted Evidence changes before the AI result can commit
**Then** the stale result is rejected as `STALE_SNAPSHOT`
**And** no relevance result or other AI-derived state from that stale snapshot is committed
**And** only the unfinished candidate may retry against the newest complete deterministic context
**And** already-completed historical message decisions are not replayed merely because context advanced.

**Given** the provider refuses, times out, is rate-limited, fails, returns structurally invalid output, returns semantically invalid output, or complete required context exceeds the approved limit
**When** semantic relevance processing cannot produce a valid result
**Then** the outcome remains an explicit failure rather than being converted to `irrelevant` or `relevant`
**And** no partial relevance success is committed
**And** the candidate remains only as required for duplicate-safe retry of incomplete work
**And** the exact logical operation/profile and privacy-safe failure category remain traceable for later operational investigation.

**Given** relevance processing succeeds, excludes content, retries, becomes stale, or fails
**When** routine observability data is emitted
**Then** metrics/logs/traces can distinguish relevance outcomes, retries, stale snapshots, context size, latency, and sanitized AI failure categories
**And** raw Telegram candidate content, complete AI context, bot tokens, credentials, prompts containing resident evidence, and secrets are absent from routine telemetry and Audit History.

**Given** semantic relevance work was durably accepted earlier
**When** a provider call or authoritative semantic-result commit is about to occur
**Then** the current District lifecycle and subject eligibility are rechecked
**And** an ineligible District or subject receives no new AI side effect or semantic business commit
**And** previously completed historical decisions remain unchanged.

**Given** a contextual relevance operation runs before any Accepted Evidence exists for that Mahalla/day
**When** its canonical context is constructed
**Then** the complete context consists of the candidate plus the empty Accepted Evidence set
**And** a self-contained candidate can still be evaluated normally.

**Given** an incomplete relevance operation has exhausted the retry policy pinned to its logical AI operation or otherwise becomes permanently non-retryable
**When** its terminal outcome is recorded
**Then** it cannot remain indefinitely pending
**And** raw candidate content retained solely for retry is disposed of once no approved processing purpose remains
**And** only approved privacy-safe operational lineage may remain.

**Given** Story 2.3 is verified
**When** focused automated checks run
**Then** tests cover meaning-based qualification with and without configured vocabulary, qualifying Hokim references, vague leadership references, service and non-service examples, announcements/advertisements/speculation/praise exclusions, self-contained replies to forwarded parents, contextual relevance with complete same-day evidence, deterministic ordering, context overflow, provider/refusal/timeout/rate-limit/invalid-output failures, stale-snapshot rejection, duplicate delivery, retry, and completed-decision non-replay
**And** tests prove an irrelevant decision disposes of resident raw content
**And** tests prove this story does not yet create Accepted Evidence, assign Topic membership, create a Topic, or derive Lane/summary state.

### Story 2.4: Assign Relevant Signals to Same-Day Topics and Commit Accepted Evidence

As the **Hokim**,
I want each relevance-qualified Telegram signal to become Accepted Evidence only when it can be reliably assigned to the correct same-day Topic or safely start a new one,
So that District Topics remain traceable, day-bounded, and free from guessed evidence relationships.

**Acceptance Criteria:**

**Given** a candidate has a completed `relevant` decision from Story 2.3
**When** Topic assignment begins
**Then** its authoritative scope is the captured District, captured Mahalla, and `Asia/Tashkent` calendar day derived from the original Telegram timestamp
**And** Topic assignment never crosses District, Mahalla, or midnight boundaries
**And** current District lifecycle eligibility is rechecked before any new AI side effect.

**Given** the relevant candidate directly replies to a Telegram message that already exists as Accepted Evidence in the same District, Mahalla, and calendar day
**When** Topic membership is resolved
**Then** the direct Telegram reply relationship takes priority
**And** the candidate is assigned to that evidence item's canonical Topic
**And** the system does not choose a different Topic merely because another semantic match appears plausible.

**Given** a direct reply target belongs to another District, another Mahalla, another calendar day, was structurally excluded, was discarded, or is otherwise not eligible Accepted Evidence
**When** Topic assignment evaluates the reply relationship
**Then** that relationship cannot create a Topic link
**And** no cross-scope or cross-day exception is created
**And** the candidate continues only through the safe same-day fallback rules applicable to its own captured scope.

**Given** no valid direct-reply Topic relationship exists
**When** a same-day Topic-matching decision is required
**Then** only the nearest earlier same-day Topic-linked message in deterministic source order is eligible as the fallback relationship target
**And** the candidate plus all raw Accepted Evidence from every same-day Topic in the same Mahalla is supplied as the complete contextual AI snapshot
**And** the complete context is used to determine whether the candidate and eligible earlier message concern the same underlying situation
**And** the system does not search arbitrary older Topics for a more convenient match.

**Given** the eligible nearest earlier Topic-linked message concerns the same underlying situation
**When** the validated matching result commits successfully
**Then** the candidate is assigned to that existing canonical Topic
**And** no second Topic is created for the same assignment
**And** time gaps, recurrence, restoration reports, or contradictory reports do not by themselves force a new Topic when they clearly concern the same situation.

**Given** the candidate does not reliably belong to an existing same-day Topic
**And** the candidate itself is sufficiently self-contained to establish an underlying situation
**When** Topic assignment completes
**Then** one new canonical Topic is created for that District + Mahalla + calendar day + situation
**And** the candidate becomes the first Accepted Evidence for that Topic
**And** the Topic receives an opaque identity that is independent of any future Lane membership.

**Given** a relevant candidate is vague or context-dependent
**And** it has neither a valid direct-reply Topic relationship nor a reliable nearest-earlier same-day match
**When** assignment cannot establish Topic membership safely
**Then** the system does not guess
**And** the candidate does not create a new Topic
**And** it does not become Accepted Evidence
**And** its resident raw content is discarded after the completed non-acceptance outcome rather than being retained for future reassessment.

**Given** a candidate is accepted into an existing or newly created Topic
**When** the authoritative commit occurs
**Then** Topic assignment and creation of the single Accepted Evidence record are committed atomically where required for correctness
**And** Accepted Evidence preserves the original text/caption verbatim, original Telegram timestamp, message identifier, captured source group, District, Mahalla, and permitted Telegram identity metadata
**And** username is retained when available, otherwise display name may be retained
**And** no phone number is inferred.

**Given** Accepted Evidence has been committed
**When** Telegram later edits or deletes the original message
**Then** the captured Accepted Evidence is not rewritten by the edit
**And** Telegram deletion does not remove it before its Topic retention boundary
**And** the originally captured Telegram timestamp remains authoritative.

**Given** Accepted Evidence changes canonical same-day Mahalla AI-input state
**When** it is committed
**Then** the Mahalla/day `contextRevision` advances atomically with that canonical state change
**And** the deterministic evidence order remains original Telegram timestamp, Telegram message ID, then internal evidence ID
**And** only the affected Topic is marked as requiring a later derived-projection refresh
**And** no Topic summary, Lane membership, anchor, or other derived projection is asserted by this story.

**Given** a Topic receives Accepted Evidence
**When** its retention metadata is derived
**Then** its latest-relevant-evidence timestamp reflects the latest original Telegram timestamp among its Accepted Evidence
**And** its Topic-level retention boundary is 90 days after that timestamp
**And** individual Accepted Evidence is not assigned an earlier independent expiry while the Topic remains retained.

**Given** Topic matching requires a contextual AI operation
**When** its canonical snapshot is constructed
**Then** the operation captures the current `contextRevision`, deterministic fingerprint, serializer version, and immutable AI profile version
**And** the provider call occurs outside database transactions
**And** RAG, vectors, summaries, recent windows, cross-day context, or silent truncation never replace the complete required same-day snapshot.

**Given** canonical AI-input state changes while Topic matching is in flight
**When** the matching result attempts to commit against an obsolete `contextRevision`
**Then** it fails as `STALE_SNAPSHOT`
**And** neither Topic membership nor Accepted Evidence from that stale operation is committed
**And** the unfinished assignment may retry using the newest complete snapshot
**And** Story 2.3's already-completed relevance decision is not replayed merely because context advanced.

**Given** complete context exceeds the approved provider/request limit, or the matching operation encounters refusal, timeout, rate limit, provider failure, structurally invalid output, or semantically invalid output
**When** no valid reliable Topic-assignment result exists
**Then** the operation remains an explicit failure
**And** the system does not use failure as justification to attach the candidate or seed a new Topic
**And** no partial Accepted Evidence or Topic state is committed
**And** incomplete work remains duplicate-safe and retryable.

**Given** the same Telegram message is redelivered, retried, or processed concurrently
**When** Topic/evidence processing repeats
**Then** at most one Accepted Evidence record can exist for that Telegram message in its captured District scope
**And** one completed Topic-assignment result is preserved for the applicable processing decision
**And** an already-completed assignment is not replayed because of Telegram redelivery or worker restart.

**Given** relevant candidates for the same District, Mahalla, and calendar day are processed concurrently
**When** they can affect shared Topic/context state
**Then** stable scoped ordering coordination and authoritative uniqueness/idempotency boundaries prevent duplicate logical Topics or duplicate evidence effects
**And** queue ordering does not replace transaction, revision, or uniqueness correctness checks
**And** unrelated District/Mahalla/day scopes may process concurrently.

**Given** Topic assignment succeeds, rejects an unassignable candidate, retries, becomes stale, or fails
**When** routine observability is emitted
**Then** privacy-safe telemetry can distinguish assignment paths, new-versus-existing Topic outcomes, retries, stale snapshots, context size, processing latency, and sanitized failures
**And** raw evidence, candidate content, complete AI context, credentials, bot secrets, and provider payloads containing resident content remain outside routine logs, metrics, traces, and Audit History.

**Given** Story 2.4 is verified
**When** focused automated checks run
**Then** tests cover direct-reply priority, invalid/cross-day reply targets, nearest-earlier fallback matching, complete same-day context, existing-Topic assignment, independent self-contained Topic seeding, vague unassignable candidates, contradictory/restoration/recurrence evidence, original evidence-state preservation, duplicate/redelivery behavior, concurrent assignment, context revision advancement, stale-snapshot rejection, context overflow, provider failures, and 90-day retention metadata
**And** tests prove one candidate cannot create duplicate Accepted Evidence or duplicate logical Topic effects
**And** tests prove this story does not yet derive Topic summary, Lane membership, anchor, latest-activity projection, or Hokim-related projection.

### Story 2.5: Recalculate the Canonical Multi-Lane Topic Projection

As the **Hokim**,
I want each Topic to maintain one cautious derived representation across every applicable Lane,
So that I can later see a consistent summary of the situation without duplicate Topics or unsupported claims.

**Acceptance Criteria:**

**Given** a Topic has Accepted Evidence and `requiredDerivedGeneration` is greater than `appliedDerivedGeneration`
**When** derived refresh work is selected
**Then** the refresh targets that one canonical Topic
**And** current District lifecycle eligibility and target validity are rechecked before any AI side effect
**And** unrelated unchanged Topics are not scheduled merely because another Topic in the Mahalla changed.

**Given** a Topic-derived refresh requires contextual AI analysis
**When** its canonical snapshot is constructed
**Then** the target Topic is evaluated against all raw Accepted Evidence from every same-day Topic in the same Mahalla
**And** evidence is ordered deterministically by original Telegram timestamp, then Telegram message ID, then internal evidence ID
**And** the target Topic and its own Accepted Evidence are explicitly identifiable in the operation input
**And** RAG, vector retrieval, summaries, recent windows, top-K selection, cross-day memory, or silent truncation do not replace the complete required context.

**Given** a logical Topic-derived refresh operation is created
**When** it is prepared for the AI gateway
**Then** it captures the target `requiredDerivedGeneration`, current Mahalla/day `contextRevision`, deterministic snapshot fingerprint, serializer version, and immutable AI profile version
**And** the provider call occurs outside database transactions
**And** retries of the same unfinished logical operation remain pinned to that profile.

**Given** a validated Topic-derived projection is produced
**When** its complete projection is assembled
**Then** it contains the cautious Topic summary, Lane membership, anchor, latest meaningful activity, attribution, and Hokim-related status as one atomic derived representation
**And** no subset of those fields is independently treated as an authoritative partial success.

**Given** a Topic's Accepted Evidence supports multiple applicable concerns
**When** Lane membership is derived
**Then** the same canonical Topic may belong to every applicable Lane among `Ҳокимга оид`, `Сув`, `Электр`, `Газ`, and `Чиқинди`
**And** Lane membership never creates a second Topic identity or duplicate Accepted Evidence
**And** a Topic may be Hokim-only or may overlap Hokim-related with one or more service Lanes.

**Given** a Topic-derived projection is returned by AI
**When** semantic validation evaluates Lane membership
**Then** membership is a non-empty subset only of `Ҳокимга оид`, `Сув`, `Электр`, `Газ`, and `Чиқинди`
**And** an empty set, unknown Lane, invented category, or malformed membership is invalid output and commits nothing.

**Given** Accepted Evidence contains reports, claims, disagreement, contradiction, recurrence, restoration, or changing accounts
**When** the Topic summary is recalculated
**Then** the summary is concise Uzbek Cyrillic with cautious attribution
**And** resident statements remain reported information rather than verified facts
**And** disagreement, contradiction, recurrence, restoration, and materially changing reports are preserved rather than flattened into an unsupported single certainty.

**Given** Accepted Evidence reports that a service returned, a problem was fixed, or another outcome occurred
**When** the projection summarizes that evidence
**Then** the reported outcome may be described as reported
**And** it is not converted into a verified resolution, completion, or authoritative case state
**And** the projection does not invent Hokim acknowledgement, recommendations, urgency, sentiment, or required action.

**Given** a Topic has multiple Accepted Evidence items
**When** its anchor is derived
**Then** the anchor is the latest self-contained meaningful evidence for that Topic
**And** a newer vague fragment does not automatically replace a meaningful anchor
**And** claimed truth, claimed resolution, or newest timestamp alone is not sufficient to make an item the anchor.

**Given** a projection selects a Topic anchor or latest meaningful activity
**When** the projection is validated
**Then** the anchor references an existing Accepted Evidence item belonging to that target Topic
**And** latest meaningful activity resolves to an original Telegram timestamp of retained Accepted Evidence belonging to that target Topic
**And** evidence from another same-day Topic may aid contextual interpretation but cannot become the target Topic's anchor, activity source, or evidence.

**Given** latest meaningful activity is projected
**When** its timestamp is stored or exposed
**Then** it is traceable to retained Accepted Evidence's original Telegram timestamp
**And** retry time, worker time, AI completion time, Telegram edit time, or dashboard refresh time cannot become that activity timestamp.

**Given** attribution or Hokim-related meaning is derived
**When** same-day Mahalla context helps interpretation
**Then** the operation may use that context to disambiguate meaning
**And** it cannot invent people, organizations, authority relationships, phone numbers, or factual claims absent from retained evidence
**And** evidence belonging to another Topic never becomes Accepted Evidence for the target Topic.

**Given** new Accepted Evidence is committed to the target Topic while refresh work is pending or running
**When** the Topic's source state changes
**Then** `requiredDerivedGeneration` advances
**And** pending refresh work may coalesce to the newest required generation
**And** obsolete intermediate generations need not be computed
**And** no Accepted Evidence is dropped from the complete required refresh context.

**Given** generation N is in flight and source changes advance the Topic to generation N+1
**When** generation N attempts to commit
**Then** generation N cannot become the current projection
**And** the stale operation commits no derived fields or applied-generation advancement
**And** unfinished work converges toward the newest required generation.

**Given** the Mahalla/day `contextRevision` changes while Topic-derived AI work is in flight
**When** the result attempts to commit
**Then** the stale result commits no Topic-derived state
**And** the unfinished refresh retries against the newest complete context as permitted
**And** completed historical relevance or Topic-assignment decisions are not rerun.

**Given** the captured generation and `contextRevision` are still current
**And** the AI output passes both structural and operation-specific semantic validation
**When** the projection commits
**Then** the complete Topic-derived projection commits atomically
**And** `appliedDerivedGeneration` advances to the committed target generation
**And** the exact immutable AI profile/configuration lineage is recorded with the committed result.

**Given** Topic-derived refresh commits successfully
**When** its atomic projection is written
**Then** it may change only the approved derived projection fields and applied-generation state
**And** it cannot create, delete, or reassign Accepted Evidence
**And** it cannot change canonical Topic identity or Topic membership.

**Given** a newer approved AI configuration becomes active before a genuinely new source generation creates a new logical refresh operation
**When** that new logical refresh operation is created
**Then** it uses the then-active applicable immutable profile
**And** older committed projections remain traceable to their actual historical profile
**And** configuration activation alone does not replay completed historical message-level relevance or assignment decisions.

**Given** complete required context exceeds the approved request/provider limit, or the provider refuses, times out, is rate-limited, fails, or returns structurally or semantically invalid output
**When** Topic-derived refresh cannot produce a valid complete projection
**Then** the outcome remains an explicit failure
**And** no partial derived field becomes authoritative
**And** `appliedDerivedGeneration` does not falsely advance
**And** the newest required generation remains eligible for safe retry according to the operation contract.

**Given** the same Topic-derived job or logical generation is delivered repeatedly because of retry, worker restart, or concurrent processing
**When** processing repeats
**Then** duplicate execution cannot create duplicate Topic identities or multiple authoritative projections for the same committed generation
**And** generation plus revision validation remains the final correctness boundary.

**Given** Topic-derived processing succeeds, retries, coalesces, becomes stale, or fails
**When** routine observability is emitted
**Then** privacy-safe telemetry can measure refresh backlog, generation lag, coalescing, stale results, context size, AI latency, AI cost, and normalized failures
**And** raw Accepted Evidence, complete AI context, resident-bearing prompts, credentials, and secrets remain outside routine logs, metrics, traces, and Audit History.

**Given** Story 2.5 is verified
**When** focused automated checks run
**Then** tests cover complete same-day context, deterministic evidence ordering, canonical multi-Lane membership, Hokim-only and overlapping service Lanes, cautious Uzbek Cyrillic summaries, disagreement/contradiction/restoration handling, evidence-bound anchor/latest-activity/attribution, generation advancement, generation coalescing, stale generation, stale context revision, atomic projection commit, future profile activation, context overflow, provider/refusal/timeout/rate-limit/invalid-output failure, retry, and duplicate execution
**And** tests prove canonical Topic identity is independent of Lane count
**And** tests prove no partial projection can become authoritative.

### Story 2.6: Enforce Topic-Level Retention and Preserve Accepted Evidence as Source of Truth

As the **Product Owner**,
I want each Topic and its Accepted Evidence to follow one authoritative 90-day retention boundary,
So that retained evidence remains complete while needed and expires predictably without leaving partial or resurrectable resident data.

**Acceptance Criteria:**

**Given** a Topic contains Accepted Evidence
**When** authoritative Topic state is evaluated
**Then** Accepted Evidence remains the source of truth for that Topic
**And** Topic summaries, Lane membership, anchors, attribution, AI outputs, or other derived fields cannot replace the underlying Accepted Evidence
**And** the Topic's retained-evidence count is the count of retained Accepted Evidence messages rather than an inferred count of residents.

**Given** a Topic contains one or more Accepted Evidence items
**When** its retention deadline is calculated
**Then** the deadline is exactly 90 days after the latest relevant Accepted Evidence's original Telegram timestamp
**And** the calculation uses the authoritative `Asia/Tashkent` product time boundary where calendar interpretation is required
**And** worker execution time, AI completion time, retry time, dashboard access time, or Telegram edit time cannot extend retention.

**Given** new Accepted Evidence is validly committed to an existing retained Topic
**When** its original Telegram timestamp is later than the Topic's previous latest-relevant-evidence timestamp
**Then** the Topic's latest relevant evidence timestamp advances
**And** the Topic-level expiry deadline is recalculated from that timestamp
**And** every Accepted Evidence item belonging to the Topic remains retained until the resulting Topic deadline.

**Given** an individual Accepted Evidence item is older than 90 days from its own Telegram timestamp
**But** its Topic has a later Accepted Evidence item whose Topic-level retention deadline has not arrived
**When** normal retention processing runs
**Then** that older Accepted Evidence is not individually expired
**And** the Topic's complete retained evidence trail remains intact.

**Given** a Topic has not reached its authoritative retention deadline
**When** routine retention processing evaluates it
**Then** neither the Topic nor any of its Accepted Evidence is deleted
**And** derived projections or operational cleanup cannot shorten the approved Topic-level retention period.

**Given** a Topic has reached its authoritative retention deadline
**When** retention deletion executes
**Then** the system rechecks the current authoritative latest-relevant-evidence timestamp and expiry condition before deletion
**And** the Topic and all of its Accepted Evidence are removed together through one correctness-preserving deletion boundary
**And** no partial state remains in which the Topic exists without its required evidence or retained evidence exists as an orphan.

**Given** a Topic appears eligible for retention deletion while new Accepted Evidence or another authoritative Topic mutation may occur concurrently
**When** deletion attempts to commit
**Then** eligibility and deletion are protected by one authoritative conditional/transactional correctness boundary
**And** if the Topic's latest-relevant-evidence state changed, the stale deletion commits nothing and the deadline is recalculated
**And** Accepted Evidence cannot be committed into a Topic that has already been authoritatively deleted.

**Given** Topic-linked derived state contains resident-derived information
**When** its Topic expires
**Then** the Topic's summary, Lane projection, anchor, attribution, Hokim-related projection, and other content-bearing Topic-derived state expire with that Topic
**And** no derived representation is retained as a substitute historical copy of deleted Accepted Evidence.

**Given** Topic-linked AI processing records exist while the Topic is retained
**When** operational traceability is required
**Then** committed AI-derived results remain traceable to their logical operation and immutable configuration/profile lineage for as long as their retained subject requires that investigation
**And** routine telemetry still contains no raw evidence or complete AI context
**And** Topic expiry does not leave behind resident-content-bearing AI artifacts that recreate the deleted Topic or evidence.

**Given** a Topic expires while subject-linked AI operational data exists
**When** Topic retention deletion completes
**Then** resident-content-bearing candidate data, AI context, generated Topic content, or other subject-linked material capable of reconstructing the expired Topic/evidence does not survive as a parallel historical copy
**And** only explicitly approved content-free operational metadata may remain
**And** retained metadata cannot reconstruct resident evidence, Telegram identity content, or the deleted Topic summary.

**Given** only privacy-safe, content-free technical metadata is independently required for aggregate operational measurement
**When** its associated Topic expires
**Then** such metadata may remain only where an approved retention or operational contract permits it
**And** it cannot contain resident evidence, generated Topic summaries, AI context, Telegram identity content, search text, or another reconstructable substitute for deleted resident data.

**Given** retention deletion changes canonical same-day AI-input state
**When** Topic and evidence deletion commits
**Then** the affected Mahalla/day `contextRevision` advances atomically as required
**And** any in-flight contextual AI result based on the older canonical state can no longer commit successfully
**And** deleted Topic/evidence state cannot be recreated by a stale provider result.

**Given** a Topic expires while an unfinished Topic-derived refresh, Topic-matching operation, or other subject-dependent asynchronous job still exists
**When** that job later attempts a business side effect
**Then** it rechecks that its District scope and subject still exist and remain valid
**And** deleted Topic or evidence state is not recreated
**And** the obsolete work terminates through an explicit safe outcome rather than silently restoring expired resident data.

**Given** the retention worker evaluates District-owned data
**When** it reads or deletes Topics
**Then** every operation carries explicit District scope
**And** missing District scope is an error rather than an all-District operation
**And** Topics or evidence from another District cannot be deleted through the same scoped business operation.

**Given** the same expired Topic is selected repeatedly because of job retry, worker restart, concurrent processing, or partial infrastructure delivery
**When** retention processing repeats
**Then** deletion is idempotent and retry-safe
**And** repeated execution cannot recreate data, fail because already-deleted resident rows are absent, or generate duplicate consequential business effects.

**Given** Accepted Evidence retains its captured Telegram attribution before expiry
**When** Telegram later edits/deletes the source message or Product Owner mapping configuration changes
**Then** retained evidence continues to use its originally captured text/caption, Telegram timestamp, District, Mahalla, source group, username when available otherwise display name, and permitted identifiers
**And** no phone number is inferred
**And** future-only mapping changes do not rewrite historical attribution.

**Given** a Topic is retained
**When** repeated Accepted Evidence comes from the same Telegram sender
**Then** every independently accepted message remains evidence according to the approved duplicate rules
**And** derived/user-facing logic does not describe those messages as reports from several different residents merely because the retained evidence count is greater than one.

**Given** Mahalla Ovozi is restored from a backup containing Topics or Accepted Evidence that have since passed normal 90-day retention
**When** disaster-restore reconciliation runs before normal application or ingestion access is enabled
**Then** current Topic-level retention rules are reapplied from authoritative original evidence timestamps
**And** already-expired Topics, their Accepted Evidence, and associated content-bearing derived state are removed before users or production processing can access them
**And** restored stale data cannot become operational merely because it existed in the backup.

**Given** retention processing succeeds, finds nothing due, retries, conflicts with newer evidence, or fails
**When** operational telemetry is emitted
**Then** privacy-safe telemetry can measure retention backlog, expired Topic counts, retries, failures, and processing latency
**And** raw Accepted Evidence, Telegram identity content, Topic summaries, AI context, credentials, and secrets remain outside routine logs, metrics, traces, and Audit History.

**Given** Story 2.6 is verified
**When** focused automated checks run
**Then** tests cover Topic-level 90-day expiry, extension by later Accepted Evidence, prevention of premature individual-evidence expiry, atomic Topic/evidence deletion, concurrent newer-evidence arrival, derived-state deletion, restored-backup retention reconciliation, stale AI/job rejection after expiry, duplicate retention jobs, District isolation, original attribution preservation, and privacy-safe observability
**And** tests prove retained evidence cannot become orphaned from its Topic
**And** tests prove deleted Topics or Accepted Evidence cannot be resurrected by stale or retried processing.

### Story 2.7: Preserve AI Operation Traceability and Explicit Failure State

As the **Product Owner**,
I want every production AI operation and provider attempt to have durable, privacy-safe traceability,
So that AI failures and committed results can be investigated without exposing resident evidence or mistaking incomplete processing for success.

**Acceptance Criteria:**

**Given** production processing requires an AI decision or Topic-derived recalculation
**When** a new logical AI operation is created
**Then** it receives its own opaque logical-operation identifier
**And** records the operation type and authoritative District/Mahalla/day/subject scope required for investigation
**And** pins the exact immutable AI profile version selected for that logical operation
**And** no provider-specific SDK object becomes part of the domain/application record.

**Given** a logical AI operation invokes an external AI provider
**When** each provider request is attempted
**Then** that invocation receives a distinct provider-attempt identifier associated with the logical operation
**And** multiple retries remain distinguishable as separate attempts without creating multiple logical business operations
**And** the relationship between logical operation, attempts, and eventual terminal outcome remains queryable.

**Given** an unfinished logical operation is retried
**When** a later provider attempt executes
**Then** it uses the immutable profile already pinned to that logical operation
**And** later activation of a different model, prompt, schema, parameter set, limit, or retry policy does not mutate that existing operation
**And** a genuinely new logical operation created after configuration activation uses the then-active applicable profile.

**Given** an AI profile is referenced by an operation
**When** its lineage is inspected
**Then** the exact project-owned configuration version can resolve the operation type, provider adapter, exact model identifier, prompt version, output-schema version, generation parameters, approved limits, retry policy, and applicable capability configuration
**And** historical profile versions remain immutable rather than being overwritten in place.

**Given** a context-dependent logical AI operation or provider attempt is recorded
**When** its investigation metadata is persisted
**Then** it includes the applicable `contextRevision`, deterministic snapshot fingerprint, serializer version, and target derived generation where relevant
**And** it includes operation/attempt start and completion timestamps and privacy-safe terminal status
**And** none of that traceability stores raw candidate content, raw Accepted Evidence, or complete AI context.

**Given** an AI provider succeeds technically
**When** its output returns to the application
**Then** provider success alone is not a completed business success
**And** the result must pass the project-owned structural validation and operation-specific semantic validation required by Stories 2.3–2.5
**And** any applicable `contextRevision`, subject-validity, and derived-generation commit conditions must also succeed before the logical operation may be recorded as successfully committed.

**Given** provider output passes structural and semantic validation but its contextual snapshot has become stale
**When** the authoritative commit detects an obsolete `contextRevision` or target generation
**Then** the logical operation records the appropriate stale/incomplete outcome such as `STALE_SNAPSHOT`
**And** no AI-derived business state is committed from that attempt
**And** stale work is distinguishable from provider failure and from valid business success.

**Given** the provider refuses, times out, is rate-limited, cannot be reached, returns an upstream failure, or produces structurally or semantically invalid output
**When** the attempt completes
**Then** the native provider response/error is normalized into an approved application failure category
**And** the logical operation does not become successful
**And** no partial relevance, Topic assignment, Accepted Evidence, summary, Lane membership, anchor, attribution, or other AI-derived state is committed because of that failed attempt.

**Given** complete required same-day context exceeds the approved request/provider limit
**When** an AI operation cannot legally construct a complete supported request
**Then** it records an explicit context-overflow failure without silently truncating, summarizing, retrieving top-K, crossing days, or otherwise changing canonical context semantics
**And** no provider invocation is required when overflow is deterministically known before the external call
**And** no plausible-looking partial business result is committed.

**Given** an attempt fails transiently and the operation contract permits retry
**When** retry is scheduled
**Then** only incomplete duplicate-safe work remains eligible
**And** already-completed historical message-level decisions are not replayed merely because another attempt, restart, configuration change, or later context change occurs
**And** retry cannot duplicate a previously committed business effect.

**Given** an unfinished AI operation fails
**When** its operational state is updated
**Then** its state explicitly distinguishes retryable, terminal, and retry-exhausted outcomes according to the pinned operation contract
**And** retry exhaustion cannot leave the operation permanently appearing as pending
**And** completed provider-attempt records remain stable investigation history rather than being overwritten by later attempts.

**Given** an AI operation reaches valid committed success
**When** its terminal state is persisted
**Then** the successful business result is traceable to the logical-operation identifier, pinned immutable profile, applicable provider attempt, snapshot/configuration lineage, and relevant commit revision/generation metadata
**And** later investigation can distinguish the configuration that actually produced the result from whichever configuration is currently active.

**Given** an AI operation cannot currently complete but remains safely retryable
**When** its operational state is persisted
**Then** it remains explicitly incomplete/failed rather than appearing as a successful or silently dropped operation
**And** sufficient privacy-safe state exists for a later eligible retry or Product Owner investigation
**And** raw candidate/evidence content is retained only where another approved story requires it for incomplete processing correctness.

**Given** an AI operation reaches a terminal non-retryable or no-longer-applicable outcome
**When** its subject was discarded, expired, superseded, or otherwise became invalid
**Then** the operational record cannot resurrect that subject
**And** resident-content-bearing retry material is removed according to the applicable evidence/retention lifecycle
**And** only approved privacy-safe operational lineage may remain.

**Given** System Health later evaluates AI processing state
**When** it queries the AI operations boundary
**Then** it can determine privacy-safe counts and status for pending/incomplete work, retries, stale snapshots, context overflow, provider refusal, timeout, rate limit, provider failure, invalid output, and committed success
**And** Epic 2 provides the authoritative operational facts without implementing Epic 4's health-status aggregation or Product Owner System Health UI itself.

**Given** AI operational records are queried for investigation or later System Health use
**When** a District-owned query executes
**Then** it requires explicit District scope
**And** Product Owner cross-District aggregation uses a dedicated explicit global administrative contract
**And** omitted District scope is never interpreted as authorization to read all Districts.

**Given** the Product Owner later investigates an AI-related operational event through Epic 4 or Epic 5 capabilities
**When** they reference the underlying AI operation
**Then** they can correlate safe operation/attempt identifiers and immutable configuration lineage
**And** the operational record contains no raw resident evidence, complete AI context, prompts containing resident content, Telegram message body, credentials, bot token, provider secret, or raw upstream error body.

**Given** routine logs, metrics, and traces observe AI processing
**When** telemetry is emitted
**Then** it can measure logical-operation volume, provider-attempt counts, retries, stale snapshots, context size/tokens, latency, cost, normalized failure categories, and completion state using privacy-safe identifiers/attributes
**And** observability is not treated as the authoritative AI-operation system of record
**And** raw resident content and secrets remain excluded.

**Given** the same provider callback/result, retry job, or worker action is handled repeatedly or concurrently
**When** operation state is updated
**Then** authoritative uniqueness/idempotency boundaries prevent duplicate provider-attempt effects and duplicate logical terminal outcomes
**And** one logical operation cannot become both committed success and contradictory terminal failure through race conditions.

**Given** Story 2.7 is verified
**When** focused automated checks run
**Then** tests cover separate logical-operation and provider-attempt identifiers, immutable profile pinning across retries, future profile activation, structural and semantic validation failures, stale snapshots, derived-generation staleness, context-overflow before provider invocation, refusal, timeout, rate limit, provider failure, duplicate attempts, retry eligibility/exhaustion, successful configuration lineage, subject expiry/invalidation, explicit District-scoped versus global investigation queries, and privacy-safe System Health querying
**And** tests prove a provider-level success cannot bypass application validation/CAS requirements
**And** tests prove no failure path can produce partial AI-derived business success.

## Epic 3: Hokim Situational Awareness & Retained History

The Hokim can understand current District signals, inspect their complete evidence, and find retained historical signals from the same unified five-Lane dashboard.

### Story 3.1: Scan Today's Unified Five-Lane Topic Board

As the **Hokim**,
I want to scan today's canonical Topics across one unified five-Lane District board,
So that I can quickly understand current situations without navigating between separate dashboard surfaces.

**Acceptance Criteria:**

**Given** an authenticated Hokim whose server-derived ActorContext is bound to exactly one Active District
**When** the dashboard loads
**Then** the dashboard reads only retained canonical Topics and their committed derived projection from Epic 2 for that fixed District
**And** browser District state is never authorization evidence
**And** the dashboard does not rerun relevance, Topic assignment, AI projection, or intake processing.

**Given** the Hokim enters the dashboard
**When** the overview shell renders
**Then** there is no sidebar, page-tab dashboard, or separate History surface
**And** the compact sticky toolbar contains `Маҳалла Овози`, the fixed District context, current date context, Help, and profile controls
**And** filter/search controls owned by later stories appear only when their capability exists rather than as fake disabled controls.

**Given** the Hokim activates Help
**When** the Help surface opens
**Then** it provides concise factual Uzbek Cyrillic guidance explaining that dashboard signals are reported signals rather than verified facts; one canonical Topic can appear in multiple Lanes; `Янги`/`Янгиланди` meanings; Accepted Evidence chronology; freshness/processing delay; Telegram best-effort navigation; and Hokim ownership of real-world decisions
**And** it explains that a Topic and all of its Accepted Evidence expire together 90 days after that Topic's latest relevant evidence timestamp and individual evidence does not expire earlier while the Topic remains retained
**And** Help adds no recommendations, automated decisions, service-performance scoring, support chat, feedback workflow, AI assistant, or case management.

**Given** Help is closed
**When** the Hokim returns to the dashboard
**Then** the current dashboard query, horizontal board position, every Lane's vertical scroll position, and exact Help opener focus are restored where still valid
**And** opening Help never reprocesses Topic or evidence data.

**Given** the authenticated Hokim activates the profile control
**When** the profile menu opens
**Then** it exposes the MVP's existing Sign out session action
**And** Story 3.1 does not create a dedicated profile page, editable personal profile, password-management UI, role selector, account administration, District switching, or new navigation hierarchy.

**Given** the Hokim activates Sign out
**When** sign-out succeeds
**Then** the existing authentication/session contract terminates the Hokim session
**And** protected dashboard/query data is removed from browser-visible state and cache
**And** the user is routed to the existing sign-in surface
**And** no dashboard filter, search text, Topic/evidence selection, or protected content survives as restorable authenticated state
**And** no confirmation dialog is required unless an independently defined unsaved-change guard is actually active.

**Given** the dashboard establishes its visual foundation
**When** the shell, toolbar, Lane board, Topic cards, status surfaces, and controls render
**Then** the MVP uses the approved light-only Civic Teal design tokens through the approved Ant Design `ConfigProvider`/component foundation rather than a competing visual system
**And** persistent hierarchy uses borders and tonal layering rather than persistent shadows
**And** cards, toolbar regions, Lane containers, lists, and other persistent dashboard surfaces have no persistent shadow
**And** temporary or overlaid surfaces use only the approved restrained elevation treatment
**And** focus and selected states remain visually distinct and are not communicated through card lifting or color alone.

**Given** current Topic data is available
**When** the board renders
**Then** the five fixed Lanes appear in canonical order: `Ҳокимга оид`, `Сув`, `Электр`, `Газ`, `Чиқинди`
**And** all five are part of one dashboard board
**And** each Lane has its own fixed header and independent vertical Topic-card scrolling on the primary desktop composition.

**Given** one canonical Topic belongs to multiple Lanes
**When** its cards appear
**Then** every appearance resolves to the same canonical Topic identity and shared evidence set
**And** no duplicate Topic or Accepted Evidence is created for presentation
**And** each card textually indicates additional Lane membership.

**Given** a Topic card is rendered
**When** the Hokim scans it
**Then** it shows the complete unclamped cautious Uzbek Cyrillic summary, Mahalla, latest meaningful activity, retained evidence count, applicable `Янги` or `Янгиланди` state, and textual additional-Lane membership
**And** it shows no evidence quote preview, AI subcategory, ranking, urgency, sentiment, case state, or invented resolution.

**Given** Topic ordering is established for a fresh successful visit
**When** each Lane initially renders
**Then** Topics are ordered by latest meaningful activity using deterministic tie-breaking
**And** `Янги` means a canonical Topic was created since the preceding successful visit
**And** `Янгиланди` means an existing canonical Topic changed since the preceding successful visit
**And** those labels remain for the current successful session rather than being cleared merely because a card was viewed.

**Given** no preceding successful visit baseline exists
**When** the Hokim opens the dashboard for the first time
**Then** the board does not falsely mark every retained Topic as newly created or updated
**And** a baseline can be established for subsequent successful visits without exposing cross-District state.

**Given** a Lane contains more Topics than its first server batch
**When** the Hokim reaches the local continuation control
**Then** an explicit `Яна кўрсатиш` action requests the next batch through the approved opaque deterministic cursor/keyset contract
**And** new items append locally without offset/page-number pagination, infinite scrolling, duplicate Topic appearances within that Lane, or losing its current scroll context
**And** a Lane-local load failure preserves already loaded data and exposes `Юклаб бўлмади. Қайта уриниш.` without replacing the whole board.

**Given** no Topic exists for the default board
**When** the successful current result is empty
**Then** the board uses `Бугун ҳозирча мавзулар йўқ`
**And** a Lane with no matching Topic uses `Мос мавзу топилмади`
**And** loading skeletons never invent Topic values or resident content.

**Given** the selected Lanes do not fit the effective viewport
**When** the board becomes horizontally scrollable
**Then** the Lane board is a labelled horizontal scroll region
**And** visible Previous/Next Lane controls move one Lane at a time
**And** native Topic-card Tab order is retained
**And** keyboard focus to an offscreen Topic reveals it
**And** horizontal board position plus each Lane's vertical position remain stable across safe responsive/zoom transitions.

**Given** phone/tablet interaction, 200% zoom, approximately 320 CSS-pixel effective width, keyboard operation, or `prefers-reduced-motion`
**When** the dashboard is used
**Then** important capabilities remain available without clipped Cyrillic, hidden controls, sticky overlap, or general page-level horizontal overflow outside the intentional Lane region
**And** phone/tablet actionable targets meet the approved minimum size/separation
**And** programmatic movement and reveal transitions become immediate under reduced motion
**And** user-facing text does not fall below the approved 14px floor.

**Given** the dashboard calls backend APIs
**When** Topic batches or dashboard state are requested
**Then** requests use same-origin `/api/v1/*` contracts with shared browser-safe Zod validation and TanStack Query server state
**And** the server enforces the fixed-District ActorContext
**And** raw evidence, search text, credentials, secrets, provider/job/database representations, and unsafe raw errors do not leak through routine telemetry or browser contracts
**And** authentication, authorization, lifecycle, District-access, or retention invalidation removes protected cached data instead of preserving it as stale permitted content.

**Given** Story 3.1 is verified under the approved production-shaped envelope
**When** focused integration/browser/performance checks run
**Then** they cover fixed-District isolation, canonical multi-Lane identity, card fields, first-visit and subsequent `Янги`/`Янгиланди` behavior, deterministic Lane pagination, loading/empty/error states, Help content/context/focus restoration, profile Sign out and prohibited profile capabilities, responsive Lane navigation, keyboard/focus/zoom/reduced-motion behavior, Civic Teal token mapping and absence of persistent dashboard shadows
**And** the dashboard becomes usable within three seconds for at least 95% of requests under the approved design envelope.

### Story 3.2: Inspect Complete Topic Evidence

As the **Hokim**,
I want to inspect the complete retained Accepted Evidence for a Topic,
So that I can understand exactly what residents reported without treating the Topic summary as the source of truth.

**Acceptance Criteria:**

**Given** a Topic card from Story 3.1
**When** the Hokim opens its evidence detail
**Then** the selected canonical Topic identity and cautious Topic context are preserved
**And** the detail reads retained source-of-truth Accepted Evidence rather than re-running AI or recreating Topic membership.

**Given** retained Accepted Evidence exists for the Topic
**When** detail content loads
**Then** every retained Accepted Evidence item for that canonical Topic is shown oldest-to-newest
**And** original text or caption is presented verbatim in its original script and line structure
**And** no evidence is sampled, summarized away, or omitted merely because the Topic has many retained evidence items.

**Given** an Accepted Evidence item is displayed
**When** its original Telegram timestamp is presented
**Then** the timestamp is interpreted and displayed in `Asia/Tashkent`
**And** the calendar date uses `DD.MM.YYYY`
**And** ordinary time uses 24-hour `HH:mm`
**And** when shown together the presentation follows `DD.MM.YYYY HH:mm`
**And** browser locale, browser timezone, processing time, retry time, or AI completion time cannot alter the preserved Telegram event time.

**Given** source identity is displayed for an evidence item
**When** a Telegram username is retained and permitted
**Then** the username is shown
**And** otherwise the retained Telegram display name is shown
**And** no phone number is displayed, inferred, searched, or reconstructed.

**Given** an evidence item has sufficient retained Telegram addressing metadata for best-effort navigation
**When** the Hokim activates `Telegramда очиш`
**Then** the product attempts the approved best-effort Telegram navigation
**And** failure to open Telegram does not invalidate, hide, delete, or downgrade the retained dashboard evidence
**And** the UI does not claim that the source message still exists in Telegram.

**Given** a desktop-width dashboard
**When** evidence detail opens
**Then** it opens as the approved right-side read-only evidence drawer over the dashboard board rather than replacing the dashboard or compressing the five-Lane board into a different layout
**And** programmatically it is a labelled non-modal complementary region rather than a dialog
**And** its heading receives focus on open, Close is the first detail action, and an accessible relationship to the Topic-card opener is exposed
**And** the underlying dashboard remains operable while targets covered by the drawer are not misleadingly keyboard reachable
**And** board horizontal position and every Lane's vertical scroll position are preserved.

**Given** evidence detail for Topic A is open on desktop
**When** the Hokim activates Topic B from the still-operable dashboard
**Then** the existing detail surface is reused rather than creating a second drawer
**And** Topic B becomes the selected canonical Topic
**And** focus moves deterministically to the Topic B detail heading following the same heading-focus contract as initial open
**And** focus is not left on obsolete Topic-A content or controls
**And** Topic B's complete evidence replaces Topic A's detail content after successful load
**And** later Close or Escape restores focus to the exact Topic-B opener where still valid.

**Given** Topic B was selected while Topic A detail was open
**When** Topic B cannot load for an ordinary transient reason while access remains valid
**Then** the failure is presented inside the reused detail surface
**And** focus remains in a valid perceivable detail context rather than returning unpredictably to Topic A
**And** Close or Escape still restores the Topic-B opener.

**Given** the desktop detail is closed normally or with Escape
**When** the original selected Topic remains valid and rendered
**Then** focus returns to the exact opener
**And** the board and Lane review positions remain unchanged.

**Given** a narrow-screen composition
**When** read-only evidence detail opens
**Then** it becomes the approved routed full-screen read-only page and is never presented as a modal dialog
**And** the route may contain only the minimum opaque Topic identifier needed to address the canonical Topic
**And** the opaque identifier is not authorization evidence and the server re-authorizes the fixed District and retained subject on every protected request
**And** raw evidence, Topic summary, Telegram identity, resident content, search text, credentials, secrets, and authentication data never enter the URL path/query/fragment/history
**And** the opaque Topic identifier does not encode protected evidence or resident content.

**Given** responsive composition changes while a Topic is selected
**When** the UI transitions between desktop drawer and narrow routed detail
**Then** selected canonical Topic context is preserved where permitted
**And** protected evidence is not serialized into routing state to accomplish the transition
**And** returning to the dashboard restores the prior review context and valid opener focus where possible.

**Given** evidence is loading or an ordinary evidence request fails
**When** the detail is visible
**Then** loading skeletons invent no evidence values
**And** failures use the sanitized scoped error contract with a safe retry
**And** previously established dashboard context is not destroyed by the detail failure.

**Given** authorization, account, District access, lifecycle, Topic retention, or evidence retention becomes invalid
**When** detail or a retry is evaluated
**Then** protected evidence and derived detail state are removed immediately
**And** review-context preservation never overrides authorization or retention invalidation.

**Given** keyboard operation, zoom/narrow layouts, or reduced-motion preferences
**When** evidence detail is used
**Then** focus order, semantic relationships, Close, evidence navigation, wrapping, and touch targets satisfy the approved accessibility floor
**And** programmatic transitions/scrolling are immediate under reduced motion
**And** original-script evidence remains readable without clipping.

**Given** Story 3.2 is verified under the approved production-shaped envelope
**When** focused integration/browser/performance checks run
**Then** they cover complete oldest-to-newest evidence, original-script fidelity, exact Asia/Tashkent `DD.MM.YYYY HH:mm` presentation including a browser in another timezone, username/display-name fallback, phone exclusion, Telegram best-effort failure, desktop overlay drawer composition, Topic A-to-B focus replacement, exact focus/scroll restoration, narrow opaque-ID routing and protected URL exclusions, responsive transitions, invalidation, sanitized failures, and reduced motion
**And** evidence detail opens within one second for at least 95% of requests when retained data is available.

### Story 3.3: Refresh Dashboard Without Disrupting Review

As the **Hokim**,
I want current Topic information to refresh in the background without disrupting my review,
So that newer information becomes discoverable while the dashboard remains stable and truthful about freshness.

**Acceptance Criteria:**

**Given** a permitted dashboard result is already visible
**When** background revalidation runs
**Then** it requests the latest permitted canonical Topic projection for the fixed District and current successfully applied dashboard query
**And** it does not rerun Telegram intake, relevance, Topic assignment, or AI derivation
**And** the story promises no fake real-time behavior or fixed refresh interval.

**Given** background revalidation is in progress
**When** the Hokim continues using the dashboard
**Then** existing cards, Lane scrolling, toolbar/available controls, and open evidence detail remain operable
**And** there is no blocking loading screen, full-board skeleton, interaction-blocking overlay, page reload, or remount that freezes the active review.

**Given** a successful refresh returns data equivalent to the currently displayed permitted result
**When** it settles
**Then** card order, selection, focus, board/Lane scroll, and open detail remain unchanged
**And** no live-region announcement is produced for unchanged content.

**Given** a successful refresh contains newly created canonical Topics
**When** the refreshed state is incorporated
**Then** each new Topic becomes available in every applicable Lane without moving the Hokim's current viewport
**And** each affected fixed Lane header exposes a textual count of newly available items
**And** existing visible review position is not re-sorted out from under the Hokim during the session
**And** a later fresh visit may establish a newly sorted initial order.

**Given** a successful refresh changes existing canonical Topics
**When** the refreshed projections are incorporated
**Then** the affected cards update in every applicable Lane while remaining in their current in-session positions
**And** the existing visit-based `Янгиланди` semantics apply
**And** a changed Topic is not duplicated because it has multiple Lane appearances.

**Given** a successful refresh changes one or more canonical Topics
**When** the dashboard produces its combined refresh announcement
**Then** `Янги` and `Янгиланди` counts are based on distinct canonical Topic identity rather than Lane-card appearances
**And** one Topic appearing in multiple Lanes contributes at most one new count or one updated count for that refresh
**And** a Topic cannot be counted as both new and updated in the same successful refresh evaluation
**And** the dashboard emits one scoped polite atomic combined announcement rather than separate announcements per Lane/card
**And** identical, obsolete, or superseded announcements are deduplicated or cancelled.

**Given** evidence detail for Topic A is open and Topic A is unchanged by a successful refresh
**When** refreshed state settles
**Then** Topic A remains selected
**And** the detail stays open without close/reopen behavior
**And** evidence review position, focus, board horizontal position, and Lane vertical positions remain preserved.

**Given** open Topic A gains Accepted Evidence or its canonical projection changes
**When** a successful refresh is incorporated
**Then** the same canonical Topic remains selected
**And** detail updates its cautious Topic context, retained evidence count, latest meaningful activity, Lane membership, and complete retained Accepted Evidence set consistently
**And** newly retained evidence is incorporated oldest-to-newest without duplication, sampling, or omission
**And** the UI cannot show a newer card evidence count paired with a stale incomplete evidence set
**And** the Hokim's evidence review position is preserved rather than forcibly jumping to the newest item
**And** new evidence remains discoverable.

**Given** the open Topic becomes unauthorized, expired, deleted, or otherwise invalid
**When** refresh/revalidation detects that condition
**Then** protected detail and invalid subject state are removed immediately
**And** authorization/lifecycle/retention invalidation overrides review-context preservation.

**Given** a dashboard refresh succeeds
**When** freshness is shown
**Then** the toolbar displays the last successful dashboard update time in Asia/Tashkent `HH:mm`
**And** freshness is based on a successful server-backed evaluation rather than a browser-only clock claim.

**Given** processing delay means some recent eligible information may not yet be visible
**When** the delay state is surfaced
**Then** the persistent Uzbek Cyrillic warning is `Янгиланиш давом этмоқда — айрим сўнгги хабарлар ҳали кўринмаслиги мумкин (охирги муваффақиятли янгиланиш: 12:55).` with the actual last-success time substituted
**And** the warning does not claim real-time completeness.

**Given** an ordinary refresh fails while the current permitted content remains authorized and retained
**When** failure is handled
**Then** the last successful permitted dashboard data remains usable
**And** a persistent sanitized stale warning and last-success time remain visible
**And** the ordinary failure is not converted into a false empty board.

**Given** browser connectivity is lost after permitted content has loaded
**When** the Hokim remains offline
**Then** previously loaded permitted content remains visible read-only with a persistent Uzbek Cyrillic offline warning and last update
**And** new network-dependent loads/actions are blocked
**And** no request is queued or automatically resubmitted
**And** connectivity loss alone does not create a System Health issue.

**Given** browser connectivity is lost before dashboard content has loaded
**When** the dashboard cannot reach the server
**Then** the known shell and fixed District context remain visible with a connection-unavailable state and `Қайта уриниш`
**And** the state is not presented as a legitimate empty Topic result.

**Given** connectivity returns
**When** the dashboard attempts to resume
**Then** session, role, fixed District, lifecycle/subscription eligibility, subject validity, and retention are revalidated before protected refresh
**And** stale responses from an obsolete request/context cannot render afterward.

**Given** background refresh uses same-origin APIs
**When** responses arrive
**Then** `/api/v1/*` shared Zod contracts and District-scoped TanStack Query identities are used
**And** raw resident evidence, search text, credentials, secrets, and unsafe upstream errors remain excluded from routine logs, metrics, traces, URLs, and browser persistence.

**Given** reduced-motion preferences are active
**When** refresh reveals changed content or announcements
**Then** essential state feedback remains visible while animation and programmatic scrolling are immediate or absent.

**Given** Story 3.3 is verified
**When** focused automated/browser checks run
**Then** they cover unchanged silent refresh, non-blocking operation, new Topic discoverability without viewport movement, updated Topics remaining in place, canonical Topic counting across multi-Lane appearances, open-detail preservation, adding evidence to an open Topic with complete oldest-to-newest evidence and no duplicate/forced scroll, truthful freshness/delay, ordinary failure, offline-before/after-load behavior, reconnect revalidation, invalidation, stale-response rejection, and reduced motion.

### Story 3.4: Find Current and Retained Topics

As the **Hokim**,
I want to filter and search current and retained Topics from the same dashboard,
So that I can quickly find an earlier District situation and inspect its retained evidence without navigating to a separate History surface.

**Acceptance Criteria:**

**Given** the Hokim enters the unified dashboard
**When** no date filter has been changed
**Then** `Бугун` is the default date scope
**And** current and retained history stay on the same five-Lane dashboard rather than a separate History page.

**Given** the date control is used
**When** the Hokim chooses `Бугун`, `Кеча`, or `Сана бўйича`
**Then** the system uses Asia/Tashkent calendar boundaries
**And** `Сана бўйича` supports one complete Asia/Tashkent calendar day or a contiguous complete-day range whose requested dates fall within the currently available retained window up to the approved 90-day retention boundary
**And** the product does not impose an obsolete seven-day or other smaller arbitrary maximum
**And** expired Topic/evidence content is not recoverable merely because a requested calendar date lies inside the nominal window.

**Given** the Hokim is selecting a historical or current time scope
**When** date-filter options are presented
**Then** filtering operates only on complete Asia/Tashkent calendar days or permitted complete-day ranges
**And** the dashboard provides no Last 1 hour, Last 3 hours, Last 6 hours, arbitrary hour/minute range, or another hourly/partial-day filter
**And** hourly filtering is not introduced indirectly through search or another control.

**Given** Topic retention is Topic-level
**When** a custom historical range is evaluated
**Then** a calendar date being inside the nominal 90-day window does not guarantee every Topic from that date remains available
**And** Topic availability remains governed by the Topic's authoritative retention boundary based on its latest relevant evidence timestamp.

**Given** the Mahalla filter is used
**When** the Hokim changes it
**Then** the fixed District permits one selected Mahalla or all permitted Mahallas
**And** no Mahalla outside the Hokim's District can be queried or exposed.

**Given** the Lane filter is used
**When** the Hokim selects visibility
**Then** one or more of the five fixed Lanes can be active together
**And** zero selected Lanes are prevented
**And** the control exposes `Йўналишлар: N/5` plus `Барчасини кўрсатиш`
**And** selected Lanes retain canonical order and canonical Topic identity.

**Given** date, Mahalla, and Lane criteria change
**When** the new scope is successfully applied
**Then** all affected Lane results use that same fixed-District scope
**And** no AI relevance/Topic assignment/projection is rerun to answer the historical query.

**Given** the Hokim enters plain text in dashboard search
**When** approximately 400ms of idle time establishes a settled search
**Then** ordinary lexical search evaluates retained Topic summaries, Accepted Evidence, Telegram usernames, and display names inside the active permitted District/date/Mahalla/Lane scope
**And** phone numbers are excluded
**And** search is not semantic AI question answering, vector retrieval, RAG, reclassification, or historical reassessment.

**Given** a settled search matches Topic summary text
**When** matching cards render
**Then** matching summary text may be highlighted without truncating the complete summary
**And** an evidence-only match may expose `Далилда топилди`
**And** an identity-only match may expose `Фойдаланувчида топилди`
**And** those hints do not reveal phone numbers or extra resident identity.

**Given** a filter/search scope successfully settles
**When** its result-count announcement is produced
**Then** the announced count represents distinct canonical Topics matching the complete successfully applied scope
**And** one Topic rendered in multiple selected Lanes contributes exactly once
**And** the count comes from the complete server-side result set rather than browser-loaded pages or Lane-card appearances
**And** the announcement is one scoped polite atomic message
**And** stale/superseded announcements are cancelled or ignored.

**Given** rapid search/filter changes produce overlapping requests
**When** an earlier response completes after a newer request
**Then** stale work is cancelled where possible or ignored
**And** obsolete results, counts, and continuation state cannot replace the latest successfully applied scope.

**Given** raw search text is sent to the server
**When** a search request is made
**Then** it is sent only in a validated request body under same-origin `/api/v1/*`
**And** raw search text never appears in URL path/query/fragment/history/shareable route, saved/recent-search suggestions, persistent browser storage, Audit History, analytics, telemetry, routine logs, traces, or raw error output.

**Given** sign-out, session expiry, permission loss, or District invalidation occurs
**When** protected dashboard state is cleared
**Then** raw search text and temporary search-match context are cleared immediately with the other protected/ephemeral state.

**Given** search text exists
**When** the Hokim uses Search Clear
**Then** only search text and temporary search-match context are cleared
**And** active date, Mahalla, and Lane selections remain unchanged.

**Given** any non-default dashboard criteria exist
**When** the Hokim activates `Фильтрларни тозалаш`
**Then** the scope resets to `Бугун`, all permitted Mahallas, all five Lanes, and empty search
**And** no separate History page or route is introduced.

**Given** the current applied scope has at least one loaded Lane batch
**When** `Яна кўрсатиш` is used
**Then** Story 3.1's same opaque deterministic cursor/keyset pagination contract is reused rather than introducing offset, page-number, or search-specific pagination
**And** each cursor is bound to District, Lane, and the exact successfully applied date/Mahalla/Lane/search scope
**And** appended data cannot duplicate or skip already loaded Topic identities under deterministic ordering
**And** infinite scroll is not introduced.

**Given** a filter/search scope successfully produces its initial Lane results
**When** the server creates that result set
**Then** it assigns the successful evaluation a server-derived `asOf` boundary and/or opaque evaluation identity
**And** every Lane continuation cursor is bound to that exact evaluation in addition to District, Lane, date, Mahalla, selected Lanes, and settled search scope.

**Given** `Яна кўрсатиш` is activated after newer data has arrived
**When** the next batch is requested
**Then** the cursor/keyset contract continues the same successful evaluation rather than silently inserting newer Topics into the older continuation pages
**And** a later successful refresh/evaluation establishes the newer continuation context.

**Given** a successful filter/search change or refresh establishes a newer evaluation
**When** older cursors or late pagination responses still exist
**Then** prior-evaluation continuation state is invalid for the newly applied result
**And** late old-evaluation pages cannot append to a current Lane
**And** each current Lane uses only continuation state belonging to the current evaluation.

**Given** authorization, session, District access, lifecycle, or retention validity changes
**When** an otherwise valid continuation cursor is presented
**Then** current security/retention rules override continuation semantics
**And** an old cursor cannot return protected or expired data merely because it once referenced it
**And** opaque cursor/evaluation values expose no raw search text, resident evidence, Telegram identity, credentials, or other protected content.

**Given** a Lane continuation request fails
**When** previously loaded results remain permitted
**Then** those results remain visible
**And** that Lane exposes `Юклаб бўлмади. Қайта уриниш.` locally
**And** the failure does not reset other Lanes or the applied filters.

**Given** the Hokim requests new date, Mahalla, Lane, or search criteria
**When** that requested scope fails before becoming successfully applied
**Then** failure is not converted into a false zero/filtered-empty result
**And** the last successful permitted results remain visible
**And** the newly requested criteria remain visibly distinguishable as requested but not yet successfully applied
**And** prior results are not falsely represented as matching the failed request
**And** a scoped sanitized failure with safe `Қайта уриниш` is presented.

**Given** requested criteria failed and never became applied
**When** the dashboard is reloaded, reconstructed, or restores ordinary dashboard state
**Then** the last successfully applied non-sensitive date/Mahalla/Lane scope is restored rather than the failed requested values
**And** failed requested criteria are not persisted as authoritative scope
**And** failed/pending search text is never restored from URL or browser persistence under the stricter ephemeral-search rule.

**Given** a failed requested scope later succeeds on retry
**When** its results are accepted
**Then** those criteria become the new successfully applied scope
**And** they replace the preceding successful date/Mahalla/Lane scope for ordinary non-sensitive continuity
**And** search text remains ephemeral and non-persistent regardless of successful application.

**Given** a successful applied result contains zero canonical Topics
**When** the board renders
**Then** `Танланган шартлар бўйича мавзулар топилмади` is used for filtered/search empty state
**And** selected Lane headers remain visible with `Мос мавзу топилмади` as applicable
**And** a failed request is never presented with that legitimate-zero copy.

**Given** evidence detail is opened from a filtered/searched result
**When** the Hokim returns to the dashboard
**Then** the active successfully applied query and board/Lane review context are preserved
**And** refresh uses that successfully applied scope rather than an obsolete or failed requested scope.

**Given** the dashboard is used at supported responsive widths, 200% zoom, approximately 320 CSS pixels, keyboard operation, or reduced motion
**When** filters, Lane selection, search, result announcements, and progressive loading are used
**Then** controls remain accessible and usable with visible focus and non-color-only state
**And** important Cyrillic text/actions do not clip or overlap
**And** intentional horizontal Lane navigation is the only permitted general board overflow
**And** programmatic motion is immediate under reduced motion.

**Given** Story 3.4 is verified under the approved production-shaped envelope
**When** integration/browser/performance checks run
**Then** they cover retained date/range behavior through the approved 90-day boundary, prohibition of hourly/partial-day requests, Mahalla/Lane combinations, zero-Lane prevention, lexical summary/evidence/identity search, canonical result counting, request-body/URL/log search privacy, rapid stale-response rejection, Search Clear versus full filter reset, successful zero versus failed requested scope, reload/restoration after failed criteria, retry promotion to applied scope, same pagination mechanism and evaluation-bound continuation/obsolete cursor rejection, local continuation retry, responsive/accessibility/reduced-motion behavior, and retention/auth invalidation
**And** combined date/Mahalla/Lane/plain-text filter changes return updated results within two seconds for at least 95% of requests under the approved design envelope.

### Story 3.5: Understand the Active Result Set Through Neutral Statistics

As the **Hokim**,
I want five compact neutral statistics that follow the dashboard result scope,
So that I can understand the shape of current or historical signals without mistaking them for service-performance scores or representative public opinion.

**Acceptance Criteria:**

**Given** a successfully applied dashboard scope
**When** the statistics region renders
**Then** exactly five compact read-only cards appear between the toolbar and Lane board
**And** the normal metrics are: unique Topics with equivalent prior-period comparison; Hokim-related Topics; active Mahallas with retained Accepted Evidence count as secondary context; most active service Lane; and most active Mahalla
**And** the statistics contain no sentiment, urgency, severity, service-quality score, satisfaction, representative-public-opinion claim, AI judgment, or performance ranking action.

**Given** date, Mahalla, selected Lanes, or settled plain-text search is successfully applied
**When** board results and statistics update
**Then** all five statistics describe the same coordinated active result scope as the Lane board
**And** statistics are calculated from the complete authoritative server-side result set rather than only browser-loaded pagination batches.

**Given** overall unique Topics are counted
**When** one canonical Topic appears in multiple selected Lanes
**Then** it contributes exactly once to the overall unique-Topic value.

**Given** Hokim-related Topics are counted
**When** a canonical Topic is both Hokim-related and belongs to one or more service Lanes
**Then** it contributes once to the Hokim-related value and may also contribute to applicable service-Lane activity without becoming a duplicate canonical Topic.

**Given** active Mahallas are counted
**When** matching Topics span the applied scope
**Then** the primary Card 3 value is the number of distinct Mahallas represented by the matching canonical Topic set independent of Lane-card appearances
**And** its secondary Accepted Evidence count counts each retained Accepted Evidence record attached to that matching canonical Topic set exactly once
**And** multi-Lane appearances cannot multiply evidence
**And** repeated retained messages from one sender remain distinct evidence records but are never described as several residents.

**Given** service-Lane activity is compared
**When** at least two service Lanes among `Сув`, `Электр`, `Газ`, and `Чиқинди` are selected
**Then** Card 4 is `Most active service Lane`
**And** comparison eligibility is determined by the active selected service-Lane candidate set rather than only by candidates with non-zero results
**And** activity is distinct canonical Topic count, not evidence volume
**And** a multi-service Topic contributes once to every applicable selected service Lane
**And** `Ҳокимга оид` is excluded from service-Lane ranking
**And** zero-Topic selected service Lanes remain legitimate comparison candidates.

**Given** fewer than two service Lanes are selected
**When** Card 4 is calculated
**Then** `Most active service Lane` is replaced deterministically with `Multi-Lane Topics`
**And** it counts distinct matching canonical Topics whose canonical membership contains more than one Lane
**And** one canonical Topic contributes at most once regardless of how many Lane appearances it has.

**Given** Mahalla activity is compared
**When** the active Mahalla candidate set contains at least two permitted Mahallas
**Then** Card 5 is `Most active Mahalla`
**And** comparison eligibility follows the active filter candidate set rather than only Mahallas with non-zero results
**And** ranking is by distinct canonical Topic count rather than evidence, sender, or message volume
**And** zero-result permitted candidate Mahallas remain legitimate comparison candidates.

**Given** the active Mahalla scope is restricted to one Mahalla, or the authorized District itself has only one permitted Mahalla
**When** Card 5 is calculated
**Then** `Most active Mahalla` is replaced deterministically with `Multi-evidence Topics`
**And** it counts distinct matching canonical Topics having more than one retained Accepted Evidence item
**And** Lane appearances cannot multiply that Topic count.

**Given** a later successful scope change restores at least two eligible service Lanes or Mahallas
**When** the statistics recalculate
**Then** the corresponding normal most-active metric returns automatically
**And** exactly five cards remain visible in all fallback states.

**Given** a most-active comparison has a tie
**When** the metric is presented
**Then** the UI does not choose an arbitrary winner
**And** all tied names remain truthfully available
**And** no green/good or red/bad interpretation is attached to the tie or leader.

**Given** `Бугун` is the active date scope with all five Lanes selected and settled search empty
**When** the unique-Topics prior-period comparison is calculated
**Then** the current comparison interval is today `00:00` through the successful server evaluation `asOf` in Asia/Tashkent
**And** the equivalent preceding interval is yesterday `00:00` through the same Asia/Tashkent clock time
**And** the browser clock does not advance that comparison by itself
**And** the active Mahalla criterion applies to both periods.

**Given** yesterday's partial-day Topic membership is evaluated for that exact comparison
**When** determining whether a retained historical canonical Topic existed within the preceding interval
**Then** the Topic qualifies when its earliest retained Accepted Evidence original Telegram timestamp is at or before the comparison cutoff on that Topic's Asia/Tashkent day
**And** processing, retry, worker, or AI completion timestamps are not substituted
**And** the canonical Topic contributes at most once.

**Given** `Бугун` is active and either a subset of Lanes is selected or settled plain-text search is non-empty
**When** Card 1 is rendered
**Then** the current unique-Topic value still follows the complete active dashboard scope
**But** the equivalent prior-period comparison is shown as unavailable rather than approximated
**And** the MVP does not reconstruct or pretend to know historical partial-day Topic-derived Lane/summary/search state that is not retained.

**Given** a complete historical single-day scope such as `Кеча`
**When** prior-period comparison is calculated
**Then** it compares against the immediately preceding complete Asia/Tashkent calendar day using the same non-date Mahalla/Lane/search criteria.

**Given** a completed custom range of N complete historical days
**When** prior-period comparison is calculated
**Then** it compares against the immediately preceding contiguous N complete Asia/Tashkent days using the same non-date Mahalla/Lane/search criteria
**And** custom historical ranges do not include the still-in-progress `Бугун`; Today remains its own special current-day scope.

**Given** the complete equivalent prior comparison period is not fully available under current retention
**When** Card 1 renders
**Then** comparison is shown as unavailable rather than using a partial period or interpreting missing history as zero
**And** trend presentation remains neutral and non-color-only.

**Given** a successful active scope contains zero canonical Topics
**When** statistics render
**Then** zero is shown where it is a truthful meaningful count
**And** ranking metrics do not invent a leader
**And** applicable deterministic fallback or neutral unavailable state is used without implying service quality, satisfaction, or System Health.

**Given** Lane results and statistics are part of one successful dashboard evaluation
**When** the server establishes that evaluation
**Then** it owns one authoritative server-derived `asOf` timestamp for the coordinated result
**And** for `Бугун` that same `asOf` is the sole cutoff for current-period statistics, equivalent-yesterday comparison, and toolbar freshness
**And** merely leaving the browser open does not create a new `asOf`.

**Given** Lane results and statistics may be delivered through separate coordinated `/api/v1/*` responses
**When** one dashboard scope is evaluated
**Then** every response belonging to that evaluation carries the same server-issued opaque evaluation identity and authoritative `asOf` timestamp through shared browser-safe Zod contracts
**And** the browser presents Lane results and statistics together as current only when their evaluation identities match
**And** a mismatched or late response from another evaluation is ignored/discarded rather than mixed with current state.

**Given** an evaluation identity is exposed to the browser
**When** it is used for result/statistics/pagination association
**Then** it is opaque, server-issued, scoped to the authorized District and exact evaluated criteria, and is not itself authorization evidence
**And** it contains no raw search text, resident evidence, Telegram identity, credentials, secrets, or other protected content.

**Given** the Hokim successfully changes date, Mahalla, Lane, or settled search criteria
**When** the Lane result evaluation succeeds but the corresponding statistics evaluation fails
**Then** the requested criteria become the new successfully applied dashboard scope
**And** the Lane board and toolbar/filter controls represent that new applied scope rather than reverting to the prior scope
**And** the five-card region shows a scoped sanitized statistics failure with safe `Қайта уриниш`
**And** previous-scope statistics are not presented as if they describe the newly applied board
**And** the statistics failure does not replace, disable, or obscure the successful Lane board.

**Given** board and statistics already successfully represent the same unchanged applied scope
**When** an ordinary background refresh fails only for statistics while prior statistics remain permitted
**Then** prior same-scope statistics may remain visible only with explicit stale qualification under the existing stale-data contract
**And** their prior successful evaluation boundary is preserved rather than represented as freshly updated.

**Given** the current applied scope has a statistics-section failure
**When** the Hokim activates `Қайта уриниш`
**Then** the coordinated current scope is re-evaluated under the shared server-derived evaluation contract
**And** recovered statistics are presented as current only when they correspond to the same newly successful evaluation boundary as the Lane result state.

**Given** statistics are still loading while permitted Lane results exist
**When** the dashboard remains usable
**Then** only the statistics region uses a structure-matching loading treatment with no invented metric values
**And** the Lane board remains operable.

**Given** statistics fail while Topic results succeed
**When** the failure is displayed
**Then** the whole dashboard is not replaced by an error state
**And** statistics use a scoped sanitized failure and safe local retry
**And** no invented zero values are substituted for unavailable statistics.

**Given** a successful Story 3.3 refresh changes the applied result set
**When** statistics are updated
**Then** statistics follow the same refreshed permitted result
**And** unchanged statistics do not unnecessarily move focus, scroll position, or the statistics strip position
**And** authorization/session/District/lifecycle/retention invalidation removes derived statistics with the protected source data.

**Given** settled search scopes statistics
**When** statistics requests are made or observed
**Then** Story 3.4's search-privacy contract remains unchanged: raw search text does not enter URLs, browser persistence, Audit History, analytics, telemetry, routine logs, traces, or raw errors.

**Given** the statistics strip fits the primary desktop composition
**When** it renders
**Then** all five read-only cards are visible
**And** cards use the approved visual hierarchy without appearing clickable
**And** metric cards themselves are non-focusable and do not act as filters, navigation, rankings, or actions.

**Given** all five statistic cards do not fit the effective viewport
**When** the statistics region overflows
**Then** it is a labelled horizontal statistics region with visible keyboard-operable Previous/Next statistic controls
**And** one activation moves one statistic at a time
**And** the newly visible metric name and position are announced
**And** current statistic position is preserved across viewport/zoom/orientation changes where safe
**And** only navigation controls, not read-only metric cards, enter the Tab sequence.

**Given** phone/tablet width, 200% zoom, approximately 320 CSS pixels, long tied names, Mahalla names, fallback labels, or Uzbek Cyrillic values
**When** statistics render
**Then** text wraps safely without dropping below the approved font floor or causing general page-level horizontal overflow
**And** Previous/Next controls meet the approved phone/tablet target size/separation
**And** purpose/state is not conveyed only by color or icon
**And** reduced motion makes statistic movement immediate.

**Given** statistics are requested from the backend
**When** authoritative aggregates are produced
**Then** same-origin `/api/v1/*` and shared browser-safe Zod contracts are used
**And** the server enforces the fixed-District ActorContext
**And** canonical Topic IDs and retained evidence aggregates are authoritative rather than browser-side counts
**And** database/infrastructure/provider/job representations do not cross the browser boundary.

**Given** combined date, Mahalla, Lane, and settled plain-text criteria change under the approved design envelope
**When** the coordinated dashboard evaluation succeeds
**Then** both the Lane-result state and corresponding five-statistics state for the same successful evaluation are available within two seconds for at least 95% of requests
**And** statistics do not receive a separate slower performance budget that routinely lags the successful board
**And** browser pagination after the initial applied scope remains Lane-local progressive loading rather than blocking the complete dashboard
**And** AI processing latency remains separate from this web-screen target.

**Given** Story 3.5 is verified
**When** focused integration/browser/performance checks run
**Then** they cover canonical Topic deduplication across Lanes, Hokim overlap, multi-service counts, distinct active Mahallas, evidence deduplication across multi-Lane appearances, service/Mahalla leader calculations and ties, `Multi-Lane Topics` and `Multi-evidence Topics` fallbacks plus restoration of normal metrics, zero behavior, statistics independent of browser pagination, Today `asOf` comparison and earliest-evidence inclusion, Today comparison unavailable for Lane-subset/search scopes, completed-day/range comparisons, unavailable retained prior periods, coordinated scope changes, search privacy, statistics-only loading/failure/retry, matching evaluation identity/`asOf` and stale-response rejection, refresh/invalidation, desktop five-card presentation, mobile statistic navigation, non-focusable cards, keyboard controls, announcements, zoom/320px Cyrillic wrapping, reduced motion, and the two-second/95% combined-filter performance target
**And** the story adds no sentiment, public-opinion inference, service-performance score, urgency/severity ranking, action recommendation, case management, or additional dashboard filters.
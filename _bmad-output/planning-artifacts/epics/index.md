---
stepsCompleted: [1, 2, 3, 4]
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
- AR2 — Establish a pnpm 10.x TypeScript workspace on Node.js 24 LTS; backend uses Fastify 5.x, frontend uses React 19.x + Vite 6.x + React Router 7.x, and Ant Design 5.x is the primary UI component/styling system with narrowly scoped custom CSS only where required by approved UX.
- AR3 — PostgreSQL 16+ / 17+ is the sole system of record and pg-boss 10.x is the durable job mechanism; authoritative state and consequential jobs are committed atomically where required, business effects use explicit idempotency/uniqueness boundaries, and ordering-sensitive Mahalla/day work uses deterministic queue serialization as coordination only.
- AR4 — Use Drizzle ORM/Kit with TypeScript-owned schemas and reviewable version-controlled SQL migrations; shared/production databases never use direct schema push, and explicit transactions/native parameterized PostgreSQL SQL are used where appropriate.
- AR5 — Build contextual AI inputs as deterministic complete District+Mahalla+Asia/Tashkent-day snapshots from PostgreSQL; raw evidence stays verbatim, evidence ordering is Telegram timestamp then Telegram message ID then internal evidence ID, and every snapshot carries contextRevision, fingerprint, and serializer version.
- AR6 — Contextual AI provider calls run outside database transactions and commit only through optimistic revision/CAS validation; revision mismatch is STALE_SNAPSHOT and commits no AI-derived state, and completed historical message-level decisions are never replayed merely because context advanced.
- AR7 — Treat Topic-derived data as one atomic projection with required/applied derived generations; only affected Topics become refresh targets, pending work coalesces to the newest required generation, and commit requires both target-generation and context-revision validity.
- AR8 — Route all production AI through a project-owned typed provider-neutral gateway; keep provider SDK/native errors inside adapters, use project-owned Zod 3.x schemas and portable structured-output contracts, perform structural plus semantic validation, keep immutable versioned AI profiles, distinguish logical operations from provider attempts, and normalize explicit failure categories with no partial commit.
- AR9 — Authentication uses project-owned PostgreSQL-backed opaque revocable sessions and Argon2id; only hashed session tokens persist server-side, browser tokens use host-scoped Secure/HttpOnly/SameSite=Strict cookies, protected state changes enforce same-origin/Origin/Fetch-Metadata checks, and login is rate-limited.
- AR10 — Every District-owned application/repository/job operation carries explicit District scope; missing scope is an error, Product Owner global operations use dedicated global contracts, database relationships preserve District identity, and background jobs re-check lifecycle/access before external or AI side effects. PostgreSQL RLS remains deferred for MVP.
- AR11 — Store District Telegram bot tokens only as authenticated ciphertext under a deployment-held versioned key; plaintext secrets never enter logs, telemetry, audit, URLs, or browser persistence and obsolete credentials are removed through rotation/offboarding lifecycle rules.
- AR12 — Use same-origin versioned JSON REST under /api/v1/* with shared browser-safe Zod contracts; database rows/provider/job objects never cross the API boundary, failures use a stable sanitized envelope, long collections use opaque deterministic cursor/keyset pagination, and authoritative mutations do not use optimistic success unless the operation contract explicitly allows safe retry.
- AR13 — TanStack Query owns frontend server state and ordinary React state owns ephemeral form/interaction state; every District-scoped query key includes District, District switching performs dirty-state resolution followed by prior-District request cancellation, protected-cache purge and local-state clearing before new load, and late stale-District responses never render.
- AR14 — Deploy the MVP on one Linux host with Docker Compose and Caddy as the only public edge; internal services remain private, SPA/API/webhook are same-origin, and HTTP/worker runtimes share the backend image/codebase.
- AR15 — Use pgBackRest 2.x with continuous WAL archiving to encrypted off-primary S3-compatible storage; backup expiry after District deletion is separately verified, and disaster restoration blocks normal access until current deletion tombstones and normal retention have been reconciled.
- AR16 — Maintain a minimal privacy-safe deletion-tombstone reconciliation source outside restorable PostgreSQL backup history so older database restores can prove which Districts must remain deleted.
- AR17 — Use OpenTelemetry metrics/traces through an OTLP/collector boundary and privacy-safe structured JSON logs; routine telemetry must exclude raw resident evidence, AI context, search text, credentials, and secrets while measuring intake, backlog/queue age, retries, stale snapshots, context size/tokens, AI/end-to-end latency/cost/failures, Topic refresh/coalescing, database/WAL/backup, deletion-backup expiry, and restore drills.
- AR18 — Product Owner System Health remains application-owned sanitized state and must work independently of the engineering telemetry backend.
- AR19 — Preserve final consistency conventions: strict TypeScript; functional composition preferred; database snake_case; opaque IDs; timestamptz/UTC storage with explicit Asia/Tashkent derivation; short database transactions; audit append-only while retained; and no raw resident evidence/secrets in audit payloads.
- AR20 — Use Vitest 3.x and Playwright 1.x for focused backend/frontend and critical browser verification, favoring integration/E2E behavior over low-value implementation-detail tests.
- AR21 — Do not introduce RAG/vector retrieval, embeddings/HNSW/reranking, Redis/message brokers, microservices, Kubernetes/multi-host HA, Redux/Zustand, GraphQL/tRPC/BFF, Next.js/SSR/RSC/server actions, Tailwind/second UI framework, PostgreSQL RLS, or local/self-hosted AI unless a later approved requirement specifically changes the architecture.

### UX Design Requirements

UX-DR1: Implement the approved design token system from DESIGN.md through Ant Design ConfigProvider/theme tokens, preserving approved semantic colors (Soft Azure Blue brand, Coral Red Hokim, Civic Blue Water, Violet Electricity, Flame Orange Gas, Emerald Green Waste), spacing, 8px radius, restrained borders/tonal hierarchy, primary-selection versus keyboard-focus distinction, and no persistent card shadows.

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

FR1: Epic 1 + Epic 2 - District-specific passive Telegram bot configuration, readiness, and authorized intake.
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
FR19: Epic 1 + Epic 4 - Unified Product Owner Console/District context plus selected-District retained Topic and Accepted Evidence investigation.
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
The Product Owner can determine whether Districts are operating correctly, distinguish real failures from quiet or delayed states, investigate safely, retry eligible incomplete work, inspect one District's retained Topics and evidence for troubleshooting, verify recovery, and inspect immutable operational history.
**FRs covered:** FR19, FR24, FR25, FR26, FR27, FR28.

Implementation/UX notes: Treat System Health, selected-District retained Topic/Evidence investigation, and Audit History as one operational investigation loop. Keep product health application-owned and privacy-safe, require explicit District scope for resident-bearing operational data, distinguish subscription pauses from technical failure, expose only sanitized diagnostics, allow retry only for incomplete duplicate-safe work, record failure/recovery, and add no external alerts, acknowledgement workflow, automatic repair, or raw resident evidence in routine telemetry.

### Epic 5: Controlled Future Analysis Configuration
The Product Owner can safely change or roll back AI/model/prompt/vocabulary configuration for future processing while preserving exact historical lineage and never replaying completed message-level decisions.
**FRs covered:** FR23.

Implementation/UX notes: Deliver Global and District configuration drafts, validation, field-level diffs, immutable version history, confirmation/reason capture, future-only activation, rollback-as-new-version, and project-owned provider-neutral profile lineage. This stays separate from signal processing because it is a distinct Product Owner operational capability and risk boundary.

### Epic 6: Subscription Lifecycle, Recovery & Verified Deletion
The Product Owner can manage Active, Grace, Suspended, and Cancelled District states, recover an eligible cancelled District, or allow it to proceed safely through live deletion and protected-backup expiry with disaster-restore reconciliation.
**FRs covered:** FR29, FR30, FR31, FR32.

Implementation/UX notes: Keep commercial lifecycle, recovery, retention interaction, live deletion, backup expiry, deletion tombstones, and restore reconciliation together as one business correctness boundary. Preserve exact lifecycle consequences, future-message-only reactivation, high-assurance cancellation, retry-safe deletion milestones, and Critical health visibility for failed deletion or backup expiry.

### Natural Dependency Direction

Epic 1 enables the secure District and access foundation. Epic 2 builds the core signal-production capability on an activated District. Epic 3 exposes those Topics and evidence to the Hokim. Epic 4 adds Product Owner operational diagnosis and selected-District retained Topic/Evidence investigation over the working system. Epic 5 adds controlled future analysis configuration without changing prior history. Epic 6 completes the District commercial/offboarding lifecycle. Later epics may depend on earlier capabilities, but no epic depends on a future epic to complete its own outcome.
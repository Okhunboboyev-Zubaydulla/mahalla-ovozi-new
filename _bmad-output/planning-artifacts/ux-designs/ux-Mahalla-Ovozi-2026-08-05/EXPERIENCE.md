---
name: Mahalla Ovozi
status: final
sources:
  - ../../prds/prd-Mahalla-Ovozi-2026-07-30/prd.md
updated: 2026-08-11
---

# Mahalla Ovozi — Experience Spine

## Foundation

Responsive, desktop-first private web product for two roles: the Hokim and Product Owner. The primary envelope is approximately 1366 × 768, but responsive behavior always follows the effective CSS viewport, including browser zoom, rather than physical screen or device type. Tablet and phone retain the same capabilities through reflow, horizontal board navigation, and full-screen detail surfaces rather than a separate mobile product. No frontend framework or component library is selected. `DESIGN.md` owns visual identity and tokens; this spine owns structure, behavior, states, access, and interaction.

The product presents cautious, traceable signals, not verified facts, public opinion, recommendations, cases, tasks, or decisions. District boundaries, role authorization, subscription effects, retention, and future-only configuration behavior are deterministic product rules, never AI judgments.

## Information Architecture

| Surface | Context and entry | Purpose | Required state coverage |
|---|---|---|---|
| Sign-in | Public entry or protected deep link | One username/password entry with role-derived routing; no role selector or registration. Suspension or Cancellation denies the District Hokim's product access, while an authenticated Product Owner continues to the permitted operational Console surfaces needed to manage that lifecycle. | Initial; invalid credentials; rate limit; session expired; Suspended or Cancelled District Hokim denial; Product Owner operational routing; protected-target return; denied wrong-role/cross-District target. |
| First-sign-in password replacement | Required after temporary credential authentication | Replace the one-time temporary password before product access and show a concise factual notice that the Product Owner has standing operational access to the District's retained Topics and Accepted Evidence for operation and troubleshooting under the customer arrangement. The notice is informational, not permission or consent; it adds no agreement checkbox, separate acceptance record, or access gate beyond password replacement. | Notice visible with the form; validation; submission in progress; failure with values preserved; success and role-derived routing. |
| Hokim dashboard | Hokim's fixed District | Unified current/history surface: toolbar, five filter-aware statistics, fixed five-Lane board, Topic inspection, Help, and profile. | Cold load; default empty; filtered/search empty; lane-local empty; progressive load; delay; stale refresh; section failure; permission denial. |
| Evidence detail | Topic selection from Hokim dashboard | Cautious Topic header plus complete oldest-to-newest Accepted Evidence and per-item Telegram navigation. | Loading; record failure; unavailable source link; failed Telegram navigation; expired/not found; permission denial. |
| Help | Dashboard Help action | Explain signal limits, multi-Lane identity, change labels, evidence order, freshness, retention, Telegram limits, and Hokim decision ownership. | Available without changing dashboard context; close restores focus and view state. |
| Console Overview | Product Owner landing, all Districts allowed | Overall service health, last check, stable alphabetical District summary, issue preview, and routes to management. | Cold load; no Districts; stale refresh; section failure; permission denial. |
| System Health | Console navigation; all-District or selected District | Overall status, active issues, District/component matrix, privacy-safe diagnosis, and eligible retry. | Cold load; no active issues; Quiet; Unknown; local component error; stale refresh; section failure; permission denial. |
| Districts | Console navigation | District list and District detail, including resumable setup and selected-District Topics and Evidence browser. | Cold load; no Districts; setup incomplete; activation blocked/failed; no Topics; filtered empty; progressive load failure; stale refresh; section failure; explicit-District requirement; permission denial. |
| Telegram Setup | Console navigation; one District required | Bot connection and searchable one-to-one group/Mahalla mapping management. | Cold load; no bot/mappings; validation; waiting for test message; timeout; mapping conflict; action failure; stale refresh; permission denial. |
| Subscriptions | Console navigation; aggregate list or one District | External-payment lifecycle state, consequences, timeline, recovery, deletion dates, and the normal-retention rule that continues through Suspension, Cancellation, and recovery setup. | Cold load; no Districts; state-valid actions only; transition in progress; transition failure; stale refresh; permission denial. |
| Hokim Accounts | Console navigation; one District required | Create, reset, disable, or replace the single active Hokim account. A generated temporary password appears only on a dedicated one-time credential surface immediately after creation or reset, with Copy available only there. Closing or dismissing it, navigating away, browser Back/Forward restoration, or reloading makes the password unavailable; if lost, the Product Owner must reset it. Persistent UI shows only credential status and last-reset time. The password never enters URLs, browser storage or restored page state, autofill, errors, telemetry, routine logs, or Audit History. | Cold load; no account; one-time password display; one-time surface dismissed or left; lost password requiring reset; validation; action failure; stale refresh; permission denial. |
| AI Operations | Console navigation; global or one District | Versioned Global Settings and District Settings drafts, diffs, activation, history, and rollback-as-new-version for future production behavior only. Manual MVP AI validation remains an external Product Owner activity using controlled non-real messages through the ordinary District onboarding, Telegram integration, processing, dashboard, and evidence flows; add no special validation surface, persisted validation artifacts, AI score, or formal evaluation report. | Cold load; no draft; invalid draft; activation in progress/failure; stale refresh; permission denial. |
| Audit History | Console navigation; all-District or filtered | Immutable chronological records and permanent content-free District-deletion proofs. | Cold load; no records; filtered empty; progressive load failure; stale refresh; section failure; permission denial. |

Every IA surface inherits the shared browser network-loss state defined under State Patterns; individual surface rows do not repeat it.

The Product Owner Console uses persistent navigation for Overview, System Health, Districts, Telegram Setup, Subscriptions, Hokim Accounts, AI Operations, and Audit History. Its header keeps District context visible. All-District context is allowed only for aggregate views; retained Topics/evidence, credentials, mappings, accounts, District settings, and destructive actions require one explicit District. Changing District is an atomic context transition. If the current form is dirty, run the unsaved-change guard before clearing state, changing the selected District, or beginning the new load; keep the current District, form, detail, and focus origin unchanged while the decision is pending. After Discard or successful Save, immediately clear all prior-District content-bearing state—including search text, content-derived filters and labels, counts, selections, open details, and errors—before loading the new District. Continue editing cancels the transition and restores the exact prior context. Cancel or ignore earlier in-flight work, and never render a response whose District context no longer matches the currently selected District.

All IA surfaces are spine-only by explicit decision. The [imported dashboard overview](imports/prototype-dashboard-overview-2026-08-05.png) illustrates only a fallible dashboard composition input; there are no approved mockups, wireframes, visual prototypes, or color-theme comparisons in this UX package.

## Voice and Tone

All interface microcopy is calm, concise, factual Uzbek Cyrillic. Documentation stays English. Preserve every Accepted Evidence item exactly in its original language, script, and line-break structure; wrap it normally with glyph-capable fallbacks for mixed-script content. Apply product voice only to interface text and cautious derived summaries.

| Use | Avoid |
|---|---|
| State what happened, what is affected, and—only when useful—what the person can do next. | Blame, drama, exclamation marks, fake reassurance, bureaucratic phrasing, or Hokim-facing technical detail. |
| `Янги`, `Янгиланди`, `Қайта уриниш`, `Фильтрларни тозалаш`, `Сақлаш`. | Latin UI labels, unexplained codes, or vague success language. |
| `Нотўғри фойдаланувчи номи ёки парол.` for invalid credentials. | Copy that reveals whether an account exists. |
| `Янгиланиш давом этмоқда — айрим сўнгги хабарлар ҳали кўринмаслиги мумкин (охирги муваффақиятли янгиланиш: 12:55).` | Claims of real-time freshness while processing is delayed. |
| `Бугун ҳозирча мавзулар йўқ` or `Танланган шартлар бўйича мавзулар топилмади`. | Empty-state language implying services are healthy or residents are satisfied. |

Dates use `DD.MM.YYYY`, ordinary time uses 24-hour `HH:mm`, and diagnostic/audit time may use `HH:mm:ss`, all in Asia/Tashkent. Original technical identifiers remain unchanged. Safely break long unbroken identifiers for layout while keeping the complete value available to visual and assistive-technology users.

## Component Patterns

Behavioral rules below are the complete shared vocabulary; visual rules live in `DESIGN.md` Components.

| Component | Use | Behavioral rules |
|---|---|---|
| `application-shell` | Dashboard and Console | Dashboard has no sidebar or page tabs. Console preserves selected District across applicable sections and collapses navigation on narrow screens. Voluntary sign-out needs no confirmation unless a dirty form requires the unsaved-change guard; session expiry, authorization loss, and other privacy-precedence invalidation never wait for that guard. |
| `filter-bar` | Dashboard and data-heavy Console surfaces | Dashboard date, Mahalla, Lane, and debounced plain-text search update lanes and statistics together. Console filters preserve explicit District scope. Narrow screens use `Фильтрлар N`; clearing restores defaults. |
| `metric-card` | Dashboard statistics and restrained operational summaries | Cards remain read-only and non-focusable. Values follow active filters; adaptive replacements remain neutral. Never act as implicit filters, rankings, or performance scores. When the five-card strip does not fit, place it in a labelled statistics region with visible, keyboard-operable Previous statistic and Next statistic controls. Each activation moves one statistic, announces the newly visible metric name and position, and preserves the current statistic position across viewport, zoom, and orientation changes. Under reduced motion, movement is immediate and not animated. |
| `lane-board` | Hokim dashboard | Fixed order Ҳокимга оид, Сув, Электр, Газ, Чиқинди. Initial visit sorts each lane by latest meaningful activity; in-session refresh preserves positions and scroll. When all five Lanes do not fit, expose a labelled horizontal scroll region with visible, keyboard-operable Previous Lane and Next Lane controls. Each activation moves one Lane, settles on its boundary, and announces the newly visible Lane name and position. Keep native card Tab order; focusing an off-screen Lane or Topic card brings it fully into view. Preserve the board's horizontal offset and every Lane's vertical offset when detail opens and closes. |
| `topic-card` | Hokim lane appearances | Entire card opens the canonical Topic. Show complete cautious summary, Mahalla, latest meaningful activity, evidence count, `Янги`/`Янгиланди`, and textual additional Lane membership. Search-only match context is temporary. |
| `detail-panel` | Evidence, issue, audit, record, Help, mapping, and edit details | A desktop read-only drawer is a labelled non-modal complementary region, never a modal dialog, and sits beside its owning surface in DOM order. Its opener exposes a programmatic expanded and control relationship. Opening moves focus to the drawer heading; a clearly labelled Close control is the first operable control. Close or Escape returns focus to the exact originating Topic or record control. The underlying surface remains operable, but the layout reserves space or temporarily removes any visually covered target from keyboard navigation. On narrow screens, read-only Evidence, issue, audit, record, Help, and mapping details are full-screen pages, never modal dialogs; entry focuses the labelled main heading, and Back or Close restores the exact originating control, filters, scroll, and record context. Edit surfaces remain modal overlays and become full-screen on narrow screens. Switching Topic replaces content in place. |
| `data-collection` | Console tables, lists, matrices, timelines, and operational Topic results | Genuinely tabular desktop data uses semantic tables with programmatically associated headers. On narrow screens, ordinary tables become logically ordered stacked cards that repeat every visible field label and retain one clearly labelled primary record opener; secondary actions stay separate. Comparison-essential matrices and diffs remain in a labelled, keyboard-scrollable region with brief scrolling instructions, a visually sticky identifying column, and every data cell programmatically associated with both its row identity and column header. Long sets load progressively. Preserve sort, filter, selected-record, and scroll state across viewport, browser-zoom, and orientation changes. |
| `setup-checklist` | District onboarding | Items may be completed in practical order and open their permanent management surface. Save one section at a time. Require confirmation that the existing customer arrangement disclosed the Product Owner's standing operational access to the District's retained Topics and Accepted Evidence; this confirms an external disclosure and is not legal advice or an in-product consent workflow. Show remaining blockers and enable Activation only after every required check, including this confirmation, passes. Audit only the District, confirming actor, and confirmation time—never resident content. |
| `form-panel` | Configuration, credentials, mappings, account, and AI drafts | Explicit save. During entry or blur validation, keep focus in the current field and announce each newly appearing error once. On failed Save, focus one error summary at the form start with an error count and links to every invalid field. Mark each invalid control programmatically invalid and associate its specific error and help text. Preserve every valid value; move focus to an invalid field only when its summary link is activated. Show `Сақланмаган ўзгаришлар`; warn before discard. Saving never activates configuration or changes lifecycle state. |
| `status-message` | Loading, empty, warning, error, stale, permission, and durable action result | Keep both the visible message and its announcement scoped to the affected page, Lane, form, or action; never use one Console-wide live region. Never clear last successful data on refresh failure. Sensitive/lifecycle results persist with District, new state, time, and Audit History route, but never retain or repeat a one-time temporary password; persistent credential results show status and last-reset time only. A toast may supplement but never replace durable feedback. |
| `action-control` | Navigation, save, retry, lifecycle, Telegram, and evidence actions | On phone and tablet, every interactive control—including primary, secondary, text-labelled, link-style, and icon-only actions—has a minimum width and height of `{targets.touch-min}`; every icon-only control meets the same minimum at every width. Keep `{targets.compact-gap}` between adjacent compact targets, and never overlap padded activation areas. Visible text or icons may remain compact inside the compliant area. Apply this to Close, Cancel, Back, Continue editing, Discard, retry, filters, statistic and Lane navigation, temporary-password Copy, record actions, and per-evidence `Telegramда очиш`. Prevent duplicate submission while an action runs without freezing the page. Retry appears only when safe; failed Telegram navigation never invalidates retained evidence. |
| `confirmation-dialog` | Risky configuration, Telegram changes, subscription transitions, and cancellation | Use a modal overlay with a programmatic title, an accessible consequence description, an inert background, contained keyboard focus, a visible Close or Cancel control, Escape dismissal, and exact opener focus restoration. Preview exact scope and consequences. Subscription previews state that normal retention continues unchanged during Suspension, Cancellation, and recovery setup, these states never extend content lifetime, and recovery can restore only unexpired content. Ordinary dialogs focus safe cancel. District cancellation additionally requires reason plus typed District name; Enter never performs a destructive action. |
| `progressive-loader` | Initial skeletons and long lane/list continuations | Skeletons match final geometry, use one polite atomic loading announcement, contain no invented values, and are never announced individually. `Яна кўрсатиш` loads only the local next batch, appends in place, and announces completion or failure only for its affected Lane or list; expose local retry on failure and never use infinite scroll. |

Cancellation reasons, AI-configuration change reasons, subscription notes, and every other audit-bound free-text field accept non-sensitive operational metadata only. Labels and help text prohibit resident message text, resident identifiers, credentials, bot tokens, provider keys, and other secrets. If a known product secret is detected, reject the save with a sanitized field error. Do not add a general personal-data-redaction workflow to MVP.

A Telegram bot-token value may exist only during the active secret-entry and validation transaction. Never include the raw value in a resumable District-setup draft, URL, browser history, persistent browser storage, restored page state, autofill, analytics, telemetry, routine log, error, or Audit History record. Clear it after successful server-side storage, dismissal or navigation, reload, or District change. Preserve only non-secret validation and status metadata; if the transaction is interrupted, require the Product Owner to enter the token again.

## State Patterns

| State family | Contract |
|---|---|
| Initial loading | Match the final structure; keep labels/context available when known; use one scoped polite atomic loading announcement; never announce individual skeleton items or example values. |
| Background refresh | Keep last successful data, filters, selected record, open detail, and scroll positions only while the current session, role, District authorization, role-specific subscription access, and retention status remain valid. Announce nothing when results are unchanged; when content changes, announce one concise combined new/updated count. On an ordinary refresh failure, show a persistent stale warning with the last successful update. Session expiry, account revocation or replacement, or loss of the current role or District authorization immediately removes all protected content and shows the appropriate sign-in or denied state. Suspension or Cancellation immediately removes protected content from the Hokim surface; the authenticated Product Owner may retain only permitted operational Console content, including retained District Topics and Accepted Evidence, while it remains authorized, unexpired, and not deleted. Retention expiry or completed deletion immediately removes the affected content and shows the expired or deleted state. |
| Browser network loss | Treat loss of the browser's connection as a client state, not evidence of server or District health. If previously loaded content remains permitted by the Background refresh security-precedence rules, keep it visible read-only with a persistent Uzbek Cyrillic offline warning and last successful update time. Block new loads and every network-dependent mutation, including saves, retries, configuration, credential, lifecycle, and destructive actions; never queue, automatically resubmit, or claim success for them. If no usable content was loaded, preserve known shell and context and show a connection-unavailable state with `Қайта уриниш`. On reconnect, revalidate the session, role, District authorization, subscription or lifecycle state, and retention before refreshing or restoring actions. Preserve filters, selection, open detail, and scroll only when access remains valid; otherwise remove protected content under the existing precedence rules. An interrupted or uncertain operation remains unconfirmed and requires explicit retry. Browser network loss alone never creates a System Health issue or labels the product, server, or District unavailable. |
| Empty source | Explain the absence without implying health, quality, or satisfaction. No clear-filters action when defaults are already active. |
| Filtered empty | Keep selected scope visible and offer `Фильтрларни тозалаш`. Dashboard keeps selected Lane headers and truthful zero/adaptive statistics. |
| Local failure | Preserve unaffected content and contain the message at the failed lane, row, record, or component. Offer `Қайта уриниш` only when duplicate-safe. |
| Section failure | Preserve navigation and District context, state what failed, and provide safe retry. Never replace the whole authenticated product for one section error. |
| Permission denied | Do not reveal protected existence or data. Route to the authorized surface or sign-in; cross-District denial remains generic and audited. |
| Action progress | Show progress at the initiating control, block duplicate submission, preserve entered values and context, and use scoped polite atomic announcements for progress and successful results. Never show optimistic success. |
| Failed form save | Preserve every valid value and focus one error summary at the form start. Show the error count and links to invalid fields; do not move focus into a field until its summary link is activated. Announce each new error once. |
| Successful save | Update visible saved state and show nearby `Сақланди`. Activation, lifecycle, and sensitive operations use a persistent result, not save copy, except that a one-time temporary password remains confined to the dedicated Hokim Accounts credential surface and is never retained in that result. |
| Unsaved changes | Show `Сақланмаган ўзгаришлар`. A dirty form invokes one guard before District switching, Console navigation, Close or Escape, browser Back, voluntary sign-out, or any responsive surface replacement that cannot preserve the draft. Keep the current District, form values, open detail, and focus origin unchanged; do not begin the transition or clear protected state while the decision is pending. Continue editing cancels the transition and restores the exact prior context. Discard clears the draft and then performs the requested transition; successful Save also allows it to continue. Viewport, zoom, or orientation reflow preserves the dirty form automatically without prompting whenever possible. Persist only non-secret District setup and AI Operations draft values; a Telegram bot-token value follows the active-transaction secret boundary above and is never part of a resumable draft. Session expiry or authorization/lifecycle invalidation still removes protected content immediately. |
| Focus/selection | Visible focus ring and explicit selected treatment; state does not rely on color. Focus returns to the originating control when the topmost surface closes. |

Every user-visible failure across the Hokim dashboard and Product Owner Console—including field, record, section, action-result, toast, and System Health errors—uses sanitized information. Show only a safe error category, affected scope, time, privacy-safe identifier, and a useful next action when one exists. Never display or copy raw resident content, credentials, bot tokens, provider keys, other secrets, or raw upstream error bodies.

Dashboard-specific rules: `Янги` means created since the preceding successful visit and `Янгиланди` means existing Topic changed since that visit. Keep both visible for the current successful session; they create no read or acknowledgement duty. During in-session refresh, add new Topics without moving the current viewport and expose a textual new-item count in the fixed lane header; updated Topics stay in place. A later visit freshly reorders each lane.

The default whole-board empty copy is `Бугун ҳозирча мавзулар йўқ`; filtered/search empty is `Танланган шартлар бўйича мавзулар топилмади`; an individually empty selected lane says `Мос мавзу топилмади`. Progressive-load failure says `Юклаб бўлмади. Қайта уриниш.` Processing delay uses the exact warning in Voice and Tone while retaining valid Topics and statistics.

Health state labels are explicit: Healthy, Delayed, Degraded, Unavailable, Quiet, and Unknown are rendered in Uzbek Cyrillic UI equivalents at implementation. Quiet is never inferred as disconnected; Unknown is never presented as Healthy. Subscription-caused pauses link to Subscriptions and are not technical failures.

## Interaction Primitives

- Pointer/touch: the whole Topic card opens detail; each other record has one explicit primary opener. Secondary actions remain separate. Every interactive control follows the `action-control` activation-area contract. No hover-only requirement.
- Keyboard: Tab follows visual/DOM order and only interactive controls receive focus. Enter or Space activates the focused non-destructive control. Escape requests closure of the topmost surface; if its form is dirty, run the unsaved-change guard before closing, otherwise close and return focus to its origin. Statistics navigation follows the `metric-card` contract; only its navigation controls enter the Tab order. The Lane board keeps native card Tab order and adds no custom arrow navigation; when it overflows, visible Previous Lane and Next Lane controls move one Lane at a time, and focus entering an off-screen Lane or Topic card brings it fully into view. No custom table arrow navigation.
- Announcements: the affected page, Lane, form, or action owns its scoped live region; never use one global region. Use polite atomic status announcements for user-initiated loading, settled search/filter result counts, save progress, and successful results. Reserve assertive alerts for blocking failures or lost availability requiring immediate attention. Deduplicate identical messages, cancel stale messages, and prevent overlapping announcements.
- Detail focus: desktop read-only detail follows the `detail-panel` non-modal complementary-region contract: heading focus on open, Close first, underlying surface reachable, and exact opener focus restoration on Close or Escape. Narrow-screen read-only Evidence, issue, audit, record, Help, and mapping details are full-screen pages with route-level heading focus and Back/Close restoration, never modal dialogs. Edit panels, confirmation dialogs, and navigation or filter sheets are modal overlays with a programmatic title, an accessible consequence description when relevant, an inert background, contained keyboard focus, visible Close or Cancel, Escape dismissal subject to the unsaved-change guard, and exact opener focus restoration.
- Dashboard filters: `Бугун`, `Кеча`, and `Сана бўйича` support one day or a retained date range. Mahalla is one-or-all. `Йўналишлар: N/5` permits one or more of the fixed Lanes, never zero, with `Барчасини кўрсатиш`.
- Search: run ordinary plain-text search after about 400 ms idle across summaries, evidence, Telegram usernames, and display names within active scope; never index or search by phone number. After settled search or filter results update, announce one scoped polite atomic result count, never one announcement per keystroke or result card. Highlight summary matches; evidence-only or identity-only matches may add `Далилда топилди` or `Фойдаланувчида топилди`. Clear removes temporary context and never changes Lane selection. Search text that may contain Accepted Evidence or resident identity is ephemeral active-session UI state only: never place it in shareable URLs, browser history, saved or recent-search suggestions, persistent browser storage, Audit History, analytics, telemetry, or routine logs. Clear it immediately on sign-out, session expiry, permission loss, or District change.
- Evidence: across all Hokim and Product Owner evidence surfaces and search-match contexts, show the Telegram username when available; otherwise show the display name. Never infer or display a phone number. Present evidence chronologically from oldest to newest. Telegram navigation is best effort. Opening another Topic while detail is open replaces content without closing the surface.
- Console changes: explicit save first; separate confirmation for activation/lifecycle effects. Telegram bot replacement validates the new token before confirmed swap. No autosave.
- Motion: when motion is allowed, use only 120–180 ms functional transitions. Under `prefers-reduced-motion: reduce`, make drawer, sheet, filter-expansion, and newly revealed-content transitions immediate; disable skeleton animation; and make all programmatic scrolling, including focus scrolling and Lane navigation, immediate rather than smooth. Lane alignment may snap directly to its destination but never animate across the board. Preserve focus rings, selected states, progress text, and all other essential feedback as static states.

## Accessibility Floor

- All core actions work by keyboard; focus order matches reading order and remains visible against the current surface.
- Every control, status, icon, row/card opener, and dialog exposes name, role, state, scope, and validation relationship to assistive technology. Dynamic progress and results follow the scoped politeness, atomicity, deduplication, and interruption policy above.
- Every invalid control is programmatically marked invalid and associated with its specific error and help text. Entry or blur errors never steal focus; failed Save focuses one linked error summary, and each newly appearing error is announced once.
- Semantic tables expose associated headers. Responsive data cards repeat visible field labels in logical order. Labelled keyboard-scrollable matrix and diff regions provide instructions, and each data cell exposes both its row identity and column header.
- Status, Lane membership, new/updated state, health, selection, and validation never depend on color or icon alone.
- Reduced motion removes spatial transition and smooth-scroll animation without removing static focus, selection, progress, status, or validation feedback.
- Load-bearing text color pairs meet WCAG AA contrast for normal text. Essential input, button, selectable-card, and region boundaries use `{colors.boundary-essential}` and maintain at least 3:1 non-text contrast against every adjacent surface. Formal accessibility certification is outside MVP scope.
- The exact approved type ramp remains readable at 200% browser zoom. At a 320 CSS-pixel equivalent viewport, all core content and actions remain usable without clipped Cyrillic, overlap, hidden controls, or content obscured by sticky regions. Page-level horizontal overflow is prohibited; only intentional labelled Lane-board, matrix, or diff regions may scroll horizontally.
- Touch-target sizing, separation, and non-overlap follow the `action-control` contract; deterministic keyboard access to an overflowing statistics strip follows the `metric-card` contract. The labelled horizontal Lane-board region exposes visible keyboard-operable Previous Lane and Next Lane controls whenever it overflows, announces the newly visible Lane name and position, and brings a keyboard-focused off-screen Lane or Topic card fully into view. Horizontal board and comparison scrolling provide visible structure and do not trap keyboard focus.
- Desktop non-modal detail remains escapable and reachable without covering a keyboard-focusable target; reserve layout space or temporarily remove a covered target from keyboard navigation. A routed full-screen page exposes a labelled main heading and route-level focus management, never modal-dialog semantics. Every modal overlay is programmatically exposed as a modal dialog, makes its background inert, contains focus, remains dismissible through visible Close or Cancel and Escape, and restores the exact opener. Destructive actions cannot be triggered by Enter alone.
- Acceptance-test the implementation font stack for the complete Uzbek Cyrillic alphabet, including `Ў ў Қ қ Ғ ғ Ҳ ҳ`, across every supported browser and OS family. Labels, buttons, chips, District/Mahalla names, and status text grow or wrap without fixed-height clipping or displaced actions. Prose and evidence wrap normally, original evidence line breaks remain preserved, mixed-script evidence uses glyph-capable fallbacks, and safely broken technical identifiers expose their complete value visually and to assistive technology.

## Responsive & Platform

| Context | Contract |
|---|---|
| Primary desktop | Apply only while the effective CSS viewport supports this composition. Show all five fixed-width dashboard Lanes together; sticky single-row toolbar; visible five-card statistics strip; independent Lane scrolling. Console keeps persistent sidebar, full tables/matrices, and right-side details. |
| Tablet | Show approximately two fixed-width dashboard Lanes with lane-aligned horizontal settling; statistics show approximately two or three cards. Console navigation collapses; ordinary tables normally become stacked records with repeated field labels and one primary opener, while comparison-essential matrices/diffs retain their labelled scroll region. |
| Phone | Show one near-full-width Lane with lane-aligned scrolling; statistics show one full card plus part of the next. Toolbar keeps current date, expandable search, and `Фильтрлар N`; freshness is a separate compact line. Read-only Evidence, issue, audit, record, Help, and mapping details are full-screen pages; edit panels remain modal overlays rendered full-screen. |
| All supported widths | Choose the desktop, tablet, or phone pattern from effective CSS width, including at 200% zoom. Keep District context visible; preserve filters, sort, selected record, and relevant scroll state across close, viewport, zoom, and orientation changes; reflow forms to one column; and retain every important capability. Let labels, controls, District/Mahalla names, and statuses grow or wrap safely. Preserve a dirty form automatically across viewport, zoom, or orientation reflow without prompting; if replacing the responsive surface cannot preserve it, run the unsaved-change guard before replacement. Apply the `metric-card` responsive navigation contract whenever the statistics strip does not fit. Whenever all five Lanes do not fit, retain the labelled horizontal board and its visible Previous Lane and Next Lane controls. Never shrink typography, clip Cyrillic, create page-level horizontal overflow, overlap sticky regions, hide controls, vertically stack all dashboard Lanes, or replace the board with a one-Lane selector. |
| Browser scope | Current and previous major Chrome, Edge, and Safari versions. Acceptance-test the implementation font stack and Uzbek Cyrillic glyphs across their supported OS families. No native application or separate mobile design. |

## Inspiration & Anti-patterns

The [dashboard prototype](imports/prototype-dashboard-overview-2026-08-05.png) contributed the qualitative idea of a compact overview with a toolbar, five statistics, fixed semantic Lanes, and scan-friendly Topic cards. Its implementation details are reconciled in `reconcile-prototype-dashboard-overview-2026-08-05.md`.

- Retain: overview-first density, simultaneous Lane context, quiet outlined surfaces, direct District/date/Mahalla/search context, and distinct semantic Lane differentiation.
- Revise: brand identity uses Soft Azure Blue speaking silhouette emblem (`🗣️`), make filters complete and coordinated, use stable in-session refresh, move evidence to detail, represent one canonical multi-Lane Topic explicitly, and make freshness truthful.
- Reject: unapproved red prototype logo, arbitrary uncoordinated multicolor icons, evidence quote previews on cards, AI subcategory tags, visual urgency, AI ranking, sentiment, scores, charts, and clickable statistics.
- Avoid globally: separate History, automatic infinite scroll, automatic repair, optimistic success, global notification centers, modal stacks, decorative motion, or controls that imply case management or Hokim action tracking.

## Key Flows

### Requirement Coverage

The PRD remains the source of requirement detail. This index maps every requirement to the existing Key Flow or flows that carry its user-visible result, operational handling, or dependent failure state; it does not restate requirement prose.

| PRD ID | Exact PRD requirement name | Carrying Key Flow(s) |
|---|---|---|
| FR-1 | [District-specific passive bot](../../prds/prd-Mahalla-Ovozi-2026-07-30/prd.md#fr-1-district-specific-passive-bot) | UJ-3 |
| FR-2 | [Supported content intake and structural exclusions](../../prds/prd-Mahalla-Ovozi-2026-07-30/prd.md#fr-2-supported-content-intake-and-structural-exclusions) | UJ-1 |
| FR-3 | [Semantic relevance decision](../../prds/prd-Mahalla-Ovozi-2026-07-30/prd.md#fr-3-semantic-relevance-decision) | UJ-1 |
| FR-4 | [Relevance exclusions and disposal](../../prds/prd-Mahalla-Ovozi-2026-07-30/prd.md#fr-4-relevance-exclusions-and-disposal) | UJ-1 |
| FR-5 | [Telegram message-state handling](../../prds/prd-Mahalla-Ovozi-2026-07-30/prd.md#fr-5-telegram-message-state-handling) | UJ-1, UJ-5 |
| FR-6 | [Duplicate-safe and retry-safe intake](../../prds/prd-Mahalla-Ovozi-2026-07-30/prd.md#fr-6-duplicate-safe-and-retry-safe-intake) | UJ-1, UJ-2 |
| FR-7 | [Daily Topic identity and seeding](../../prds/prd-Mahalla-Ovozi-2026-07-30/prd.md#fr-7-daily-topic-identity-and-seeding) | UJ-1 |
| FR-8 | [Same-day Topic matching](../../prds/prd-Mahalla-Ovozi-2026-07-30/prd.md#fr-8-same-day-topic-matching) | UJ-1 |
| FR-9 | [Complete same-day evidence context](../../prds/prd-Mahalla-Ovozi-2026-07-30/prd.md#fr-9-complete-same-day-evidence-context) | UJ-1 |
| FR-10 | [Canonical multi-Lane Topic](../../prds/prd-Mahalla-Ovozi-2026-07-30/prd.md#fr-10-canonical-multi-lane-topic) | UJ-1, UJ-5 |
| FR-11 | [Cautious derived Topic information](../../prds/prd-Mahalla-Ovozi-2026-07-30/prd.md#fr-11-cautious-derived-topic-information) | UJ-1 |
| FR-12 | [Evidence integrity and retention](../../prds/prd-Mahalla-Ovozi-2026-07-30/prd.md#fr-12-evidence-integrity-and-retention) | UJ-1, UJ-4, UJ-5 |
| FR-13 | [Explicit AI failure and traceability](../../prds/prd-Mahalla-Ovozi-2026-07-30/prd.md#fr-13-explicit-ai-failure-and-traceability) | UJ-1, UJ-2 |
| FR-14 | [Unified five-Lane Hokim dashboard](../../prds/prd-Mahalla-Ovozi-2026-07-30/prd.md#fr-14-unified-five-lane-hokim-dashboard) | UJ-1, UJ-5 |
| FR-15 | [Topic cards and evidence drawer](../../prds/prd-Mahalla-Ovozi-2026-07-30/prd.md#fr-15-topic-cards-and-evidence-drawer) | UJ-1, UJ-5 |
| FR-16 | [Stable background refresh and freshness](../../prds/prd-Mahalla-Ovozi-2026-07-30/prd.md#fr-16-stable-background-refresh-and-freshness) | UJ-1, UJ-5 |
| FR-17 | [Retained history, filtering, and search](../../prds/prd-Mahalla-Ovozi-2026-07-30/prd.md#fr-17-retained-history-filtering-and-search) | UJ-5 |
| FR-18 | [Filter-aware neutral statistics](../../prds/prd-Mahalla-Ovozi-2026-07-30/prd.md#fr-18-filter-aware-neutral-statistics) | UJ-1, UJ-5 |
| FR-19 | [Unified Product Owner Console](../../prds/prd-Mahalla-Ovozi-2026-07-30/prd.md#fr-19-unified-product-owner-console) | UJ-2, UJ-3, UJ-4 |
| FR-20 | [Gated and resumable District onboarding](../../prds/prd-Mahalla-Ovozi-2026-07-30/prd.md#fr-20-gated-and-resumable-district-onboarding) | UJ-3 |
| FR-21 | [Telegram bot, group, and Mahalla management](../../prds/prd-Mahalla-Ovozi-2026-07-30/prd.md#fr-21-telegram-bot-group-and-mahalla-management) | UJ-3 |
| FR-22 | [Hokim account and District access boundary](../../prds/prd-Mahalla-Ovozi-2026-07-30/prd.md#fr-22-hokim-account-and-district-access-boundary) | UJ-1, UJ-3, UJ-5 |
| FR-23 | [Versioned future-only analysis configuration](../../prds/prd-Mahalla-Ovozi-2026-07-30/prd.md#fr-23-versioned-future-only-analysis-configuration) | UJ-2 |
| FR-24 | [Immutable searchable retained Audit History](../../prds/prd-Mahalla-Ovozi-2026-07-30/prd.md#fr-24-immutable-searchable-retained-audit-history) | UJ-2, UJ-3, UJ-4 |
| FR-25 | [Truthful hierarchical health status](../../prds/prd-Mahalla-Ovozi-2026-07-30/prd.md#fr-25-truthful-hierarchical-health-status) | UJ-2 |
| FR-26 | [Product and District monitoring coverage](../../prds/prd-Mahalla-Ovozi-2026-07-30/prd.md#fr-26-product-and-district-monitoring-coverage) | UJ-2 |
| FR-27 | [Actionable in-Console issue lifecycle](../../prds/prd-Mahalla-Ovozi-2026-07-30/prd.md#fr-27-actionable-in-console-issue-lifecycle) | UJ-2 |
| FR-28 | [Pilot operating targets and privacy-safe diagnostics](../../prds/prd-Mahalla-Ovozi-2026-07-30/prd.md#fr-28-pilot-operating-targets-and-privacy-safe-diagnostics) | UJ-2 |
| FR-29 | [Manually managed subscription record](../../prds/prd-Mahalla-Ovozi-2026-07-30/prd.md#fr-29-manually-managed-subscription-record) | UJ-4 |
| FR-30 | [Active, Grace, and Suspended operation](../../prds/prd-Mahalla-Ovozi-2026-07-30/prd.md#fr-30-active-grace-and-suspended-operation) | UJ-4 |
| FR-31 | [Confirmed cancellation and gated recovery](../../prds/prd-Mahalla-Ovozi-2026-07-30/prd.md#fr-31-confirmed-cancellation-and-gated-recovery) | UJ-4 |
| FR-32 | [Automatic verified District deletion](../../prds/prd-Mahalla-Ovozi-2026-07-30/prd.md#fr-32-automatic-verified-district-deletion) | UJ-4; failure visibility: UJ-2 |
| NFR-1 | [Capacity envelope](../../prds/prd-Mahalla-Ovozi-2026-07-30/prd.md#nfr-1-capacity-envelope) | UJ-1, UJ-2, UJ-5 |
| NFR-2 | [User-facing web performance](../../prds/prd-Mahalla-Ovozi-2026-07-30/prd.md#nfr-2-user-facing-web-performance) | UJ-1, UJ-2, UJ-3, UJ-4, UJ-5 |
| NFR-3 | [Durable and duplicate-safe processing](../../prds/prd-Mahalla-Ovozi-2026-07-30/prd.md#nfr-3-durable-and-duplicate-safe-processing) | UJ-1, UJ-2 |
| NFR-4 | [Backup and disaster recovery](../../prds/prd-Mahalla-Ovozi-2026-07-30/prd.md#nfr-4-backup-and-disaster-recovery) | UJ-2, UJ-4 |
| NFR-5 | [Authentication and District isolation](../../prds/prd-Mahalla-Ovozi-2026-07-30/prd.md#nfr-5-authentication-and-district-isolation) | UJ-1, UJ-2, UJ-3, UJ-4, UJ-5 |
| NFR-6 | [Lightweight data protection](../../prds/prd-Mahalla-Ovozi-2026-07-30/prd.md#nfr-6-lightweight-data-protection) | UJ-1, UJ-2, UJ-3, UJ-4, UJ-5 |
| NFR-7 | [Device compatibility and practical accessibility](../../prds/prd-Mahalla-Ovozi-2026-07-30/prd.md#nfr-7-device-compatibility-and-practical-accessibility) | UJ-1, UJ-2, UJ-3, UJ-4, UJ-5 |
| NFR-8 | [Language, evidence fidelity, and time](../../prds/prd-Mahalla-Ovozi-2026-07-30/prd.md#nfr-8-language-evidence-fidelity-and-time) | UJ-1, UJ-2, UJ-3, UJ-4, UJ-5 |

### UJ-1: Hokim Akmal understands current district signals

1. Akmal signs in and reaches his fixed-District dashboard.
2. He scans the stable five-Lane overview, filter-aware statistics, and visible `Янги` or `Янгиланди` labels.
3. He opens a Topic card; the detail shows its cautious summary, Mahalla, all Lanes, activity time, evidence count, and complete chronological evidence.
4. When useful, he opens one evidence item in Telegram; retained evidence remains available if navigation fails.
5. **Climax:** Akmal understands a potentially important situation and can directly inspect the evidence behind it.
6. He independently decides whether and how to respond; the product neither recommends nor records that decision.

Failure/edge handling: unclear summaries route Akmal to original evidence. Delay/failure is stated without invented success. Multi-Lane appearances open the same canonical Topic. He cannot edit, approve, acknowledge, or complete a Topic.

### UJ-2: Product Owner Zubaydulla checks operational health

1. Zubaydulla signs in to Console Overview and sees overall status plus stable District summaries.
2. He follows a Critical or Warning issue to System Health.
3. He inspects the District/component state, impact, timing, last check, privacy-safe identifiers, and recommended next area.
4. He follows the route to the relevant management surface and retries only eligible incomplete work.
5. A risky change requires confirmation and produces an immutable audit result.
6. **Climax:** Zubaydulla knows whether each District is operating correctly, what is affected, and where supported action belongs.

Failure/edge handling: Quiet is not disconnection; Unknown is not Healthy; subscription pauses route to Subscriptions. Unsupported repairs point to the technical area without exposing resident content or pretending the Console fixed it.

### UJ-3: Zubaydulla onboards a new district

1. Zubaydulla creates a District and sees its resumable setup checklist.
2. He records subscription state, validates a unique bot token, maps approved groups one-to-one to Mahallas, and creates the Hokim account.
3. He confirms receipt of an ordinary non-command test message and completes isolation and configuration checks.
4. He confirms that the existing customer arrangement disclosed his standing operational access to the District's retained Topics and Accepted Evidence; the checklist shows this and any other remaining blockers until every required check passes.
5. He activates processing and Hokim access through a separate confirmed action.
6. **Climax:** Zubaydulla confirms the District is isolated, connected, and ready for authorized message processing.

Failure/edge handling: partial non-secret work remains `Созлаш тугалланмаган`; processing and Hokim access stay disabled, including when the required external-disclosure confirmation is missing. That confirmation records only the District, confirming actor, and time. Failed checks and activation attempts preserve valid non-secret input, show actionable reasons, and are audited. An interrupted bot-token entry or validation transaction requires token re-entry; the raw token is never restored with the setup draft. The one-time temporary password is never redisplayed.

### UJ-4: Zubaydulla manages a district subscription lifecycle

1. Zubaydulla opens the District subscription detail and reviews state, start time, consequences, and next transition.
2. He starts the seven-day Grace period or restores an eligible District to Active through consequence confirmation.
3. If Grace expires, the timeline shows automatic Suspension and its effect on intake, processing, and Hokim access.
4. For Cancellation, he reviews exact deadlines and effects, supplies a reason, types the District name, and explicitly confirms.
5. During the 30-day recovery window he may start recovery, provide a new validated token, and pass setup checks; otherwise live deletion and protected-backup expiry are separately verified.
6. **Climax:** Zubaydulla can see the exact commercial state and its consequences for access, recovery, retained data, and deletion.

Failure/edge handling: Suspension and Cancellation deny the District Hokim's product access, while the authenticated Product Owner retains permitted Console access for subscription management, recovery and setup, deletion status, System Health, Audit History, and retained District Topics and Accepted Evidence while that content remains authorized, unexpired, and not deleted. Normal retention continues unchanged during Suspension, Cancellation, and recovery setup: a Topic and all its Accepted Evidence expire together 90 days after the Topic's latest relevant evidence timestamp. These lifecycle states never pause or extend retention, and recovery can restore only content that remains unexpired. Product Owner access never resumes intake, AI processing, or Hokim access. Reactivation handles future messages only; missed messages and completed decisions are never replayed. After live deletion, product recovery is impossible. Failed deletion/backup expiry remains a Critical health issue, and only the content-free deletion proof persists.

### UJ-5: Hokim Akmal reviews earlier district signals

1. Akmal stays on the unified dashboard and selects one retained date or date range.
2. He optionally selects one Mahalla and one or more Lanes, then uses plain-text search.
3. All selected Lanes and all five statistics update to the same result scope; duplicate Lane appearances count as one canonical Topic in the overall total.
4. He progressively loads a Lane when needed and opens a matching Topic.
5. He reviews its complete retained evidence in chronological order.
6. **Climax:** Akmal finds the earlier situation and its evidence without leaving the dashboard for a separate History page.

Failure/edge handling: lane-local loading failure preserves existing results and offers safe retry. Telegram navigation may fail without losing evidence. Expired content is unavailable after retention. Search never becomes AI semantic answers or reassesses historical messages.

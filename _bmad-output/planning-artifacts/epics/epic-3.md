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

**Given** the Hokim opens Help at a desktop-width composition
**When** the Help surface is presented
**Then** it uses the approved read-only non-modal complementary-region pattern
**And** its labelled heading receives focus, Close is the first Help action, and the dashboard remains operable subject to the existing covered-target keyboard rule
**And** closing Help restores the exact Help opener where valid, otherwise the deterministic dashboard focus fallback applies.

**Given** the Hokim opens Help at a narrow-screen composition
**When** the Help surface is presented
**Then** it uses the approved routed full-screen read-only page rather than a modal dialog
**And** entry focuses its labelled main heading
**And** Back or Close restores the prior dashboard query, board/Lane scroll context, and valid Help opener or deterministic fallback target.

**Given** Help is closed
**When** the Hokim returns to the dashboard
**Then** the current dashboard query, horizontal board position, every Lane's vertical scroll position, and exact Help opener focus are restored where still valid
**And** opening Help never reprocesses Topic or evidence data.

**Given** a dashboard-origin read-only surface closes or returns to the dashboard
**When** its exact originating opener no longer exists, is no longer rendered, or is no longer permitted
**Then** focus moves deterministically to the originating Lane's fixed header when that Lane remains present and is applicable to the originating context
**And** if that Lane is not applicable or is no longer present in the applied view, focus moves to the dashboard's main heading/start-of-content target
**And** these fallback targets may receive programmatic focus without becoming ordinary additional Tab stops
**And** focus is never left on removed content, sent to an arbitrary Topic card, or allowed to fall unpredictably to the document body
**And** authorization, lifecycle, or retention invalidation overrides this dashboard fallback and follows the resulting authorized sign-in/denied surface instead.

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

**Given** Topic ordering is established for a fresh successful dashboard visit
**When** each Lane initially renders
**Then** Topics are ordered by latest meaningful activity using deterministic tie-breaking
**And** `Янги` means a canonical Topic was created since the preceding successful dashboard-visit boundary captured for this visit
**And** `Янгиланди` means an existing canonical Topic changed since that captured boundary
**And** those labels remain stable for the current successful dashboard visit against its captured baseline rather than being cleared merely because a card was viewed.

**Given** the Hokim may have more than one valid authenticated session or device
**When** a successful dashboard visit begins
**Then** the server captures the preceding successful dashboard-visit boundary used for that visit's `Янги` and `Янгиланди` evaluation
**And** that captured baseline remains immutable for the duration of the current dashboard visit
**And** a successful visit from another valid session or device cannot retroactively change the baseline or labels already established for this visit
**And** later fresh visits may establish a newer baseline normally
**And** the baseline contains no District-crossing or resident-content data and is scoped to the authenticated Hokim's fixed District.

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
**Then** they cover fixed-District isolation, canonical multi-Lane identity, card fields, first-visit and multi-session/device `Янги`/`Янгиланди` behavior, deterministic Lane pagination, loading/empty/error states, desktop/narrow Help structure and context/focus restoration including deterministic fallback, profile Sign out and prohibited profile capabilities, responsive Lane navigation, keyboard/focus/zoom/reduced-motion behavior, Civic Teal token mapping and absence of persistent dashboard shadows
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
**Then** every retained Accepted Evidence item for that canonical Topic is available oldest-to-newest
**And** original text or caption is presented verbatim in its original script and line structure
**And** no evidence is sampled, summarized away, or omitted merely because the Topic has many retained evidence items.

**Given** a retained Topic has more Accepted Evidence than can reasonably be returned and rendered inside the initial detail-response target
**When** evidence detail opens
**Then** the labelled Topic detail surface and its first chronological evidence batch become usable within the approved one-second target where retained data is available
**And** additional retained Accepted Evidence may load progressively using deterministic oldest-to-newest continuation
**And** progressive loading must eventually expose every retained Accepted Evidence item for that canonical Topic without sampling, summarizing, omission, duplication, or reordering
**And** evidence continuation is local to the open Topic detail and does not replace or reset the dashboard board.

**Given** a later progressive evidence batch fails to load
**When** earlier evidence remains permitted
**Then** already loaded evidence remains visible
**And** the failure is scoped to evidence continuation with safe `Қайта уриниш`
**And** the Topic is not falsely presented as having a complete evidence set until all retained evidence has successfully loaded.

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

**Given** an Accepted Evidence item does not retain sufficient permitted Telegram addressing metadata for best-effort navigation
**When** that evidence item renders
**Then** `Telegramда очиш` is not presented as an available action
**And** the evidence remains fully readable and valid as retained source-of-truth evidence
**And** the UI does not imply that a Telegram source link exists or that its absence weakens the evidence.

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
**And** Topic B becomes the pending/selected detail subject
**And** Topic A's evidence content is immediately removed or replaced by a structure-matching loading state before Topic B identity/context is presented as current
**And** Topic A evidence must never remain visible beneath Topic B's heading, identity, Mahalla, Lane membership, evidence count, or other Topic-B context
**And** focus moves deterministically to the Topic B detail heading following the same heading-focus contract as initial open
**And** focus is not left on obsolete Topic-A content or controls
**And** Topic B's retained evidence becomes the current detail content after successful load
**And** later Close or Escape restores focus to the exact Topic-B opener where still valid, otherwise Story 3.1's deterministic dashboard focus fallback applies.

**Given** Topic B fails to load after being selected
**When** the failure is shown
**Then** the reused detail surface presents a scoped Topic-B failure state
**And** Topic A's evidence is not restored or shown as if it belongs to Topic B
**And** focus remains in a valid perceivable Topic-B detail context
**And** Close or Escape restores focus to the Topic-B opener where valid, otherwise Story 3.1's deterministic dashboard focus fallback applies.

**Given** the desktop detail is closed normally or with Escape
**When** the original selected Topic remains valid and rendered
**Then** focus returns to the exact opener
**And** the board and Lane review positions remain unchanged.

**Given** evidence detail closes or returns to the dashboard
**When** the exact originating Topic-card opener no longer exists, is no longer rendered, or is no longer permitted
**Then** Story 3.1's deterministic dashboard focus fallback is used
**And** focus is never left on removed content, sent to an arbitrary Topic card, or allowed to fall unpredictably to the document body.

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
**And** returning to the dashboard restores the prior review context and exact opener where valid, otherwise Story 3.1's deterministic dashboard focus fallback applies.

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
**Then** they cover complete oldest-to-newest evidence including progressive completion and continuation failure/retry, original-script fidelity, exact Asia/Tashkent `DD.MM.YYYY HH:mm` presentation including a browser in another timezone, username/display-name fallback, phone exclusion, Telegram best-effort success/failure and unavailable-link state, desktop overlay drawer composition, Topic A-to-B pending/loading/failure isolation, exact and deterministic fallback focus/scroll restoration, narrow opaque-ID routing and protected URL exclusions, responsive transitions, invalidation, sanitized failures, and reduced motion
**And** evidence detail becomes usable within one second for at least 95% of requests when retained data is available; unusually large evidence sets may complete progressively under the completeness contract above.

### Story 3.3: Refresh Dashboard Without Disrupting Review

As the **Hokim**,
I want current Topic information to refresh in the background without disrupting my review,
So that newer information becomes discoverable while the dashboard remains stable and truthful about freshness.

**Acceptance Criteria:**

**Given** a permitted dashboard result is already visible
**When** background revalidation runs
**Then** it requests the latest permitted canonical Topic projection for the fixed District and the dashboard scope capabilities already implemented by Stories 3.1–3.3
**And** for Story 3.3 independently, that scope is the existing default dashboard result and does not require date/Mahalla/Lane filtering or plain-text search from Story 3.4
**And** later stories may extend the same non-disruptive refresh behavior to their successfully applied scopes without changing Story 3.3's core refresh contract
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
**And** detail updates its cautious Topic context, authoritative retained-evidence count, latest meaningful activity, and Lane membership consistently
**And** newly retained evidence is incorporated oldest-to-newest without duplication, sampling, or omission
**And** if the evidence detail was already complete, it converges to the newly authoritative complete retained Accepted Evidence set
**And** the UI cannot show a newer authoritative evidence count paired with an unqualified stale or falsely-complete evidence set
**And** the Hokim's evidence review position is preserved rather than forcibly jumping to the newest item
**And** new evidence remains discoverable.

**Given** an open Topic's evidence detail is still progressively loading under Story 3.2
**When** a successful refresh adds Accepted Evidence or changes the Topic projection
**Then** the updated Topic context and authoritative total retained-evidence count may be presented while the detail remains explicitly marked as progressively incomplete
**And** already loaded evidence remains correctly associated with the same canonical Topic and ordered oldest-to-newest
**And** continuation proceeds toward the newly authoritative complete evidence set without duplication, omission, or forced jump to the newest item
**And** an intentionally progressive loading state is not treated as stale merely because not every retained evidence item has loaded yet
**And** the UI must never imply that the evidence set is complete until every currently retained item has successfully loaded.

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
**Then** that content may remain visible read-only only while the current session is not known locally to have reached its authoritative expiry boundary
**And** a persistent Uzbek Cyrillic offline warning and last update remain visible
**And** new network-dependent loads/actions are blocked
**And** no request is queued or automatically resubmitted
**And** connectivity loss alone does not create a System Health issue.

**Given** the browser is offline and the current authenticated session reaches its known expiry boundary
**When** expiry becomes locally determinable without a server request
**Then** all protected Topic, evidence, statistics, search, selection, and cached dashboard content is removed from browser-visible state
**And** the UI shows the existing signed-out/session-expired state rather than continuing to expose protected data offline
**And** reconnect does not restore the removed protected state without fresh successful authentication and authorization.

**Given** authorization or lifecycle validity could have changed on the server while the browser is offline but no local expiry or invalidation is known
**When** connectivity remains unavailable
**Then** the product makes no claim that server-side authorization is still current
**And** on reconnect it revalidates session, role, District access, lifecycle/subscription state, subject validity, and retention before protected refresh or further actions.

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
**Then** they cover independently implementable default-scope refresh, unchanged silent refresh, non-blocking operation, new Topic discoverability without viewport movement, updated Topics remaining in place, canonical Topic counting across multi-Lane appearances, open-detail preservation, complete and progressively loading evidence refresh without duplicate/forced scroll or false completeness, truthful freshness/delay, ordinary failure, offline-before/after-load behavior, locally known session expiry, reconnect revalidation, invalidation, stale-response rejection, and reduced motion.

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
**Then** `Бугун` is the sole permitted partial-current-day scope and covers the current Asia/Tashkent calendar day from `00:00` through the successful server evaluation `asOf`
**And** `Кеча` and `Сана бўйича` operate only on complete Asia/Tashkent calendar days or permitted complete-day ranges
**And** the dashboard provides no Last 1 hour, Last 3 hours, Last 6 hours, arbitrary hour/minute range, or any other partial-day filter
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

**Given** the dashboard is used at a narrow-screen composition
**When** date, Mahalla, Lane, or search filtering is available
**Then** the compact dashboard toolbar exposes the approved `Фильтрлар N` control for filter criteria that do not remain directly visible
**And** activating it opens the approved modal filter/navigation sheet with a programmatic title, inert background, contained keyboard focus, visible Close/Cancel control, and Escape dismissal
**And** the sheet exposes the same date, Mahalla, and Lane capabilities as the wider layout without introducing a separate mobile filter model
**And** closing or applying the sheet returns focus deterministically to the `Фильтрлар N` opener
**And** active filter state remains visible after the sheet closes
**And** search remains governed by its existing responsive UX behavior and privacy rules rather than creating a second search implementation.

**Given** the current applied scope has at least one loaded Lane batch
**When** `Яна кўрсатиш` is used
**Then** Story 3.1's same opaque deterministic cursor/keyset pagination contract is reused rather than introducing offset, page-number, or search-specific pagination
**And** each cursor is bound to District, Lane, and the exact successfully applied date/Mahalla/Lane/search scope
**And** appended data cannot duplicate already loaded Topic identities under deterministic ordering
**And** infinite scroll is not introduced.

**Given** a filter/search scope successfully produces its initial Lane results
**When** the server returns a continuation cursor
**Then** the opaque cursor is bound to the authorized District, Lane, exact successfully applied date/Mahalla/Lane/search scope, deterministic ordering, and the keyset boundary needed for continuation
**And** the cursor does not represent or require a materialized historical snapshot of mutable Topic projections.

**Given** `Яна кўрсатиш` is activated after newer or updated Topic data exists
**When** the next batch is requested
**Then** continuation uses the cursor's deterministic keyset boundary against currently permitted retained data
**And** canonical Topic identities already loaded in that Lane are not appended again
**And** Topics that are newly created or updated such that they belong before the existing continuation boundary are not retroactively inserted into already reviewed earlier batches
**And** normal dashboard refresh/revalidation is the mechanism for making such newer state discoverable.

**Given** a successful filter/search change or dashboard refresh establishes a new displayed result context
**When** older continuation state or late pagination responses still exist
**Then** the prior continuation state is discarded for that Lane
**And** late responses belonging to the obsolete displayed context cannot append into the refreshed/current Lane
**And** a fresh continuation cursor from the current displayed result is used for subsequent loading.

**Given** a Lane continuation cursor was issued from a successfully displayed result
**When** a later Topic creation, projection update, retention deletion, or other authoritative change may alter that Lane's matching membership or deterministic ordering across the cursor boundary
**Then** the server does not continue that cursor as though the collection were unchanged
**And** the cursor is rejected as stale using a sanitized continuation-state response
**And** no Topic is silently skipped merely because its mutable ordering key crossed the previous keyset boundary
**And** the server may conservatively invalidate when it cannot prove that intervening changes are irrelevant to the cursor's scope and ordering.

**Given** a continuation cursor becomes stale because the underlying permitted result changed
**When** the stale continuation response is handled
**Then** already loaded permitted Lane content remains usable
**And** the dashboard uses Story 3.3's existing non-disruptive refresh/revalidation behavior to establish fresh result and continuation state
**And** valid selection, evidence detail, focus, board position, and Lane scroll context are preserved where possible
**And** the system does not recreate an old Topic projection or materialize a historical pagination snapshot.

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
**Then** they cover retained date/range behavior through the approved 90-day boundary, the Today-only partial-current-day exception and prohibition of every other hourly/partial-day request, Mahalla/Lane combinations, zero-Lane prevention, lexical summary/evidence/identity search, canonical result counting, request-body/URL/log search privacy, rapid stale-response rejection, Search Clear versus full filter reset, successful zero versus failed requested scope, reload/restoration after failed criteria, retry promotion to applied scope, scope-and-keyset-bound continuation, mutable-order stale-cursor invalidation/recovery, refreshed-context cursor replacement, obsolete pagination-response rejection, local continuation retry, narrow `Фильтрлар N` sheet behavior, responsive/accessibility/reduced-motion behavior, and retention/auth invalidation
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

**Given** a most-active comparison has a non-zero highest Topic count shared by multiple eligible candidates
**When** the metric is presented
**Then** the UI does not choose or imply an arbitrary winner
**And** the card presents the tie deterministically as a neutral tied-candidate count appropriate to the metric, such as `Тенг: 3 та маҳалла` or `Тенг: 2 та йўналиш`
**And** tied candidate names are not required to be enumerated inside or through an interactive expansion of the compact statistic card
**And** no green/good or red/bad interpretation is attached to the tie or any tied candidate.

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

**Given** a most-active metric has two or more eligible candidates but every candidate has zero matching canonical Topics
**When** Card 4 or Card 5 is rendered
**Then** the zero-result rule takes precedence over ordinary tie presentation
**And** the UI does not display a tied-leader count or identify any candidate as most active
**And** the card uses the already-defined applicable deterministic fallback or neutral unavailable state
**And** no service quality, satisfaction, inactivity judgment, or System Health meaning is inferred from the zero result.

**Given** Lane results and statistics belong to one coordinated dashboard evaluation
**When** the server establishes that evaluation
**Then** it establishes one short-lived consistent PostgreSQL read boundary for the successfully applied District/date/Mahalla/Lane/search scope
**And** every Lane result and statistic claimed as current for that evaluation is derived from data visible through that same read boundary
**And** one server-issued opaque evaluation identity and one authoritative `asOf` are assigned to that coordinated evaluation
**And** for `Бугун`, that same `asOf` is the cutoff used by the coordinated current-period statistics and equivalent-yesterday comparison
**And** the consistent read boundary is released after the evaluation is calculated and is not retained as a historical Topic-projection snapshot.

**Given** Lane and statistics payloads are delivered separately
**When** they represent one coordinated evaluation
**Then** each payload must originate from the same server-side coordinated evaluation/read boundary rather than independently querying mutable state and merely reusing an identifier
**And** each carries that evaluation's same opaque identity and authoritative `asOf` through the shared browser-safe contracts
**And** browser identity matching is used only to prevent mixing responses from different evaluations; it is not the mechanism that creates database-state coherence
**And** mismatched, late, or obsolete evaluation payloads are ignored rather than mixed with current state.

**Given** an evaluation identity is exposed to the browser
**When** it is used to associate coordinated Lane results, statistics, or continuation state
**Then** it is a fresh server-issued high-entropy opaque identifier for that evaluation and is not itself authorization evidence
**And** its browser-visible value is generated independently of raw search text, resident evidence, Telegram identity, credentials, secrets, or other protected content
**And** it is not a reversible encoding, stable hash, deterministic digest, or other dictionary-testable derivation of sensitive evaluated criteria
**And** the server associates the opaque identity with the authorized District and exact evaluated criteria internally rather than embedding those criteria into the browser-visible identifier
**And** a new coordinated evaluation receives a new opaque identity even when the user-visible criteria happen to be unchanged.

**Given** the Hokim successfully changes date, Mahalla, Lane, or settled search criteria
**When** the Lane result evaluation succeeds but the corresponding statistics evaluation fails
**Then** the requested criteria become the new successfully applied dashboard scope
**And** the Lane board and toolbar/filter controls represent that new applied scope rather than reverting to the prior scope
**And** the toolbar freshness time represents the successful server-backed Lane-result evaluation boundary for the displayed board
**And** the statistics region independently shows its scoped failure state and does not inherit that freshness as evidence that statistics succeeded
**And** the UI does not claim that the complete Lane-plus-statistics evaluation succeeded
**And** previous-scope statistics are not presented as if they describe the newly applied board
**And** the statistics failure does not replace, disable, or obscure the successful Lane board.

**Given** Lane results and statistics both succeed through one coordinated evaluation
**When** the result becomes current
**Then** the toolbar freshness, Lane state, and statistics use that evaluation's same authoritative `asOf`.

**Given** board and statistics already successfully represent the same unchanged applied scope
**When** an ordinary background refresh fails only for statistics while prior statistics remain permitted
**Then** prior same-scope statistics may remain visible only with explicit stale qualification under the existing stale-data contract
**And** their prior successful evaluation boundary is preserved rather than represented as freshly updated.

**Given** the current successfully applied scope has a statistics-section failure while permitted Lane results remain visible
**When** the Hokim activates `Қайта уриниш`
**Then** the same successfully applied date/Mahalla/Lane/search scope is re-evaluated as one new coordinated server evaluation under the shared consistent-read contract
**And** the retry may refresh the Lane result state as part of that coordinated evaluation rather than calculating fresh statistics against an older Lane evaluation
**And** the applied filters themselves do not change merely because retry was activated
**And** recovered statistics are presented as current only together with Lane result state belonging to that same newly successful evaluation
**And** until that coordinated retry succeeds, the previously permitted Lane board remains usable and the statistics failure/loading state remains confined to the statistics region.

**Given** a coordinated statistics retry succeeds
**When** the new Lane/statistics evaluation replaces the previous displayed evaluation
**Then** existing valid Topic selection, open evidence detail, focus, board horizontal position, and Lane vertical review positions are preserved using Story 3.3's non-disruptive refresh behavior
**And** newer or updated permitted Topic state may become discoverable without forcibly moving the Hokim's current viewport
**And** the toolbar freshness advances to that newly successful coordinated evaluation boundary together with the refreshed Lane and statistics state
**And** authorization, lifecycle, or retention invalidation overrides review-context preservation.

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

**Given** phone/tablet width, 200% zoom, approximately 320 CSS pixels, tie/fallback labels, Mahalla names, or Uzbek Cyrillic values
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
**Then** they cover canonical Topic deduplication across Lanes, Hokim overlap, multi-service counts, distinct active Mahallas, evidence deduplication across multi-Lane appearances, service/Mahalla leader calculations, non-zero tie-count presentation, zero-result tie precedence, `Multi-Lane Topics` and `Multi-evidence Topics` fallbacks plus restoration of normal metrics, statistics independent of browser pagination, Today `asOf` comparison and earliest-evidence inclusion, Today comparison unavailable for Lane-subset/search scopes, completed-day/range comparisons, unavailable retained prior periods, shared consistent-read coordinated evaluation, fresh privacy-safe evaluation identity, partial Lane-success/statistics-failure toolbar freshness, coordinated statistics retry including Lane re-evaluation and review-context preservation, search privacy, statistics-only loading/failure, mismatched/late evaluation-response rejection, refresh/invalidation, desktop five-card presentation, mobile statistic navigation, non-focusable cards, keyboard controls, announcements, zoom/320px Cyrillic wrapping, reduced motion, and the two-second/95% combined-filter performance target
**And** the story adds no sentiment, public-opinion inference, service-performance score, urgency/severity ranking, action recommendation, case management, or additional dashboard filters.

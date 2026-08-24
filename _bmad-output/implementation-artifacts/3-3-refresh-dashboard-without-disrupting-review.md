---
baseline_commit: 36cb493
---

# Story 3.3: Refresh Dashboard Without Disrupting Review

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **Hokim**,
I want current Topic information to refresh in the background without disrupting my review,
so that newer information becomes discoverable while the dashboard remains stable and truthful about freshness.

---

## Acceptance Criteria

### 1. Non-Disruptive Background Revalidation & Default Scope Integrity (AC 1)
- **Given** a permitted dashboard result is already visible for the authenticated Hokim's fixed District
- **When** background revalidation runs (via TanStack Query `refetchInterval` or window focus) or manual refresh is triggered
- **Then** the client requests the latest permitted canonical Topic projection for the fixed District using the default dashboard scope
- **And** the background revalidation does **not** rerun Telegram intake, semantic relevance, Topic assignment, or AI summary derivation
- **And** during active revalidation, existing cards, Lane scrolling, available controls, and open Topic Evidence Drawer remain fully operable
- **And** TanStack Query v5 state separation is enforced: `isPending` gates initial cold loaders while `isFetching` indicates background revalidation
- **And** there is **no** blocking loading screen, full-board skeleton, interaction-blocking overlay, page reload, or component remount that freezes the active review.

### 2. In-Session Position Stability & Viewport Preservation (AC 2)
- **Given** a successful refresh returns data equivalent to or updated from the currently displayed permitted result
- **When** the refreshed state settles
- **Then** existing visible card array order in each Lane is strictly preserved and loaded pagination batches (via `loadMore`) are retained
- **And** the Hokim's current viewport, board horizontal scroll position (`scrollLeft`), and Lane vertical scroll positions (`scrollTop`) do not jump, shift, or reset
- **And** unchanged content produces no live-region announcement.

### 3. New & Updated Topic Discoverability & Fixed Lane Header Count (AC 3)
- **Given** a successful refresh contains newly created canonical Topics or changes to existing Topics
- **When** refreshed state is incorporated
- **Then** updated existing Topics update their card content (summary, evidence count, latest activity time, `isUpdated` status) in-place without moving from their in-session positions
- **And** newly created Topics that were not previously present in a Lane are placed in an in-session buffer (`bufferedNewTopics`) rather than immediately shifting the visible card list
- **And** each affected fixed Lane header exposes a textual count of newly available items (e.g. `+N янги`)
- **And** activating the `+N янги` badge (via click or `Enter` / `Space` keyboard navigation) prepends buffered new items into the visible Lane list and scrolls smoothly (immediate under reduced motion) to the top of that Lane
- **And** existing visit-based `Янги` / `Янгиланди` badge semantics remain stable relative to the session's visit baseline
- **And** a later fresh visit (full reload or re-entry) establishes a freshly sorted initial order.

### 4. Canonical Multi-Lane Topic Identity & Atomic Polite Announcement (AC 4)
- **Given** a successful refresh changes one or more canonical Topics
- **When** the dashboard produces its combined refresh announcement
- **Then** `Янги` and `Янгиланди` counts are based on distinct canonical Topic identity (`Set<string>`) rather than Lane-card appearances
- **And** one canonical Topic appearing in multiple Lanes contributes at most one new count or one updated count for that refresh
- **And** a Topic cannot be counted as both new and updated in the same successful refresh evaluation
- **And** the dashboard emits one scoped polite atomic combined announcement (e.g. `2 та янги мавзу қўшилди`, `1 та мавзу янгиланди`, or `2 та янги мавзу қўшилди, 1 таси янгиланди`) via a permanently mounted live region (`role="status" aria-live="polite" aria-atomic="true"`)
- **And** announcements are debounced by 350ms with string resets to ensure consecutive identical updates are announced and rapid query ticks do not flood screen readers
- **And** zero changes produce no announcement (silent).

### 5. Open Topic Evidence Drawer Synchronization & Invalidation Handling (AC 5)
- **Given** Topic Evidence Detail for Topic A is open in the drawer when a successful refresh occurs
- **When** refreshed state settles
- **Then** if Topic A is unchanged, Topic A remains selected, the drawer stays open without close/reopen flicker, and evidence review scroll position is preserved
- **And** if Topic A gains Accepted Evidence or its canonical projection changes, the drawer header and metadata update in-place (summary, authoritative evidence count, latest activity time)
- **And** newly retained Accepted Evidence items are incorporated oldest-to-newest without duplication, sampling, or omission
- **And** if Topic A evidence was already complete, it converges to the newly authoritative complete retained evidence set without resetting scroll position to top or jumping to the newest item
- **And** if Topic A evidence is still progressively loading under Story 3.2, continuation proceeds toward the newly authoritative complete evidence set without duplication or false completeness
- **And** if Topic A becomes invalid (deleted, expired under 90-day retention, or unauthorized returning 404/401/403), the drawer closes immediately, protected query cache for that topic is purged, and focus is restored deterministically via `useFocusFallback.ts`.

### 6. Server-Backed Freshness & Processing Delay Warning (AC 6)
- **Given** a dashboard refresh succeeds
- **When** freshness is shown
- **Then** the header toolbar displays the last successful dashboard update time in `Asia/Tashkent` `HH:mm` (e.g. `Охирги янгиланиш: 14:30`)
- **And** freshness is based on a successful server-backed evaluation (`serverEvaluatedAt`) rather than an unverified browser-only clock claim
- **And** when processing delay indicates some recent eligible information may not yet be visible (unprocessed intake records or active queue jobs older than 30s), the toolbar surfaces the persistent Uzbek Cyrillic warning:
  `Янгиланиш давом этмоқда — айрим сўнгги хабарлар ҳали кўринмаслиги мумкин (охирги муваффақиятли янгиланиш: HH:mm).`

### 7. Manual Refresh Trigger & Spin State (AC 7)
- **Given** the Hokim views the board toolbar
- **When** the Hokim clicks the `Янгилаш` button or activates it via keyboard (`Enter` / `Space`)
- **Then** the reload icon displays an active spin animation while revalidation is in progress
- **And** when `prefers-reduced-motion: reduce` is enabled, the spin animation is suppressed via CSS/hook
- **And** the button is disabled while revalidation is in progress to prevent duplicate concurrent network requests
- **And** the manual trigger revalidates both the 5-lane board and the open Topic Evidence Drawer (if open)
- **And** styling complies with `DESIGN.md` light tokens and zero box-shadows (`boxShadow: 'none'`, `defaultShadow: 'none'`).

### 8. Network Failure, Offline State & Active Local Session Expiry (AC 8)
- **Given** an ordinary background or manual refresh fails while permitted content is loaded
- **When** failure is handled
- **Then** the last successful permitted dashboard data remains visible and operable (no blank screen, false empty state, or board unmount)
- **And** a persistent sanitized stale warning banner is displayed: `Янги маълумотларни юклаб бўлмади (охирги муваффақиятли янгиланиш: HH:mm)`
- **And** when a subsequent background or manual refresh succeeds, the stale error banner is automatically dismissed
- **And** when browser connectivity is lost (`navigator.onLine === false`), TanStack Query enters paused status (`networkMode: 'online'`), the board enters read-only offline mode with persistent warning `Интернет алоқаси йўқ. Охирги муваффақиятли янгиланиш: HH:mm`, and network-dependent actions are disabled
- **And** an active offline expiration checker monitors `session.expiresAt`; if the authenticated session reaches its expiry boundary while offline, all protected query cache is immediately purged and the UI redirects to sign-in
- **And** on reconnect (`online` event), session, role, District authorization, and retention are revalidated before protected refresh resumes.

### 9. Invalidation, Lifecycle Invariants & Reduced Motion (AC 9)
- **Given** reduced-motion preferences are active (`prefers-reduced-motion: reduce`)
- **When** refresh reveals changed content or announcements
- **Then** essential state feedback remains visible while reload spinning animation, transitional movement, and programmatic scrolling are immediate or disabled
- **And** all client API requests forward `AbortSignal` to cancel stale in-flight requests on query key change or unmount
- **And** raw resident evidence, search text, credentials, and secrets remain excluded from routine logs, metrics, traces, and browser URLs.

---

## Tasks / Subtasks

- [x] **Task 1: Shared API Contracts, Baseline Query & AbortSignal Propagation** (AC: 1, 3, 6, 9)
  - [x] 1.1 In `packages/api-contracts/src/topics.ts`:
    - Extend `HokimTopicBoardQuerySchema` to accept optional `baselineTimestamp: z.string().datetime().optional()`.
    - Update `HokimTopicBoardResponseSchema` to include `serverEvaluatedAt: z.string().datetime()` and `hasProcessingDelay: z.boolean().default(false)`.
  - [x] 1.2 In `apps/backend/src/modules/topics/hokim-topics-routes.ts`:
    - Forward `baselineTimestamp` query parameter from `HokimTopicBoardQuerySchema` to `topicService.getTodayBoard`.
  - [x] 1.3 In `apps/backend/src/modules/topics/hokim-topic-service.ts`:
    - Update `getTodayBoard(actorContext, calendarDayOverride?, baselineTimestampOverride?)`:
      - If `baselineTimestampOverride` is provided: evaluate `isNew` / `isUpdated` against it, reuse it as `visitBaselineTimestamp`, and **skip** inserting a new `userDashboardVisits` row.
      - If `baselineTimestampOverride` is not provided: capture preceding visit, record new visit row in `userDashboardVisits`, and set `visitBaselineTimestamp`.
      - Implement `checkProcessingDelay(districtId, calendarDay)`: check if any `ai_operations` or `telegram_intake_records` for that district older than 30 seconds have not completed projections or if active `pgboss.job` exists in intake/qualification/relevance/projection queues.
      - Return `serverEvaluatedAt: currentVisitDate.toISOString()` and `hasProcessingDelay`.
  - [x] 1.4 In `apps/web/src/topics/hokim-topics-client.ts`:
    - Accept optional `signal?: AbortSignal` across `getTodayBoard`, `getLaneBatch`, and `getTopicEvidence`, forwarding `signal` to `fetch`/axios requests.

- [x] **Task 2: In-Session Reconciliation, Discoverability Buffer & ARIA Live Announcer** (AC: 1, 2, 3, 4)
  - [x] 2.1 In `apps/web/src/topics/useHokimTopicBoard.ts`:
    - Initialize and hold `sessionBaselineTimestamp` from initial load's `currentVisitTimestamp`.
    - Configure `useQuery`:
      - `queryKey: ['hokim-board', districtId, calendarDay, sessionBaselineTimestamp]`
      - Pass `{ baselineTimestamp: sessionBaselineTimestamp }` and `signal` in `queryFn`.
      - Use `networkMode: 'online'` and `staleTime: 5 * 60 * 1000`.
    - Implement in-session reconciliation in `lanesState`:
      - For existing topics in `lanesState[lane].topics`: update summary, evidence count, latest activity time, `isUpdated`, `isNew` in-place at existing array indices without disturbing pagination batches loaded via `loadMore`.
      - For incoming topics not present in `lanesState[lane].topics`: place them in `bufferedNewTopics` for that lane and calculate `newItemsCount = bufferedNewTopics.length`.
      - Expose `revealNewTopics(lane: QualifyingLane)` callback: prepends `bufferedNewTopics` to `topics`, clears `bufferedNewTopics`, and resets `newItemsCount` to 0.
    - Implement distinct canonical topic deduplication:
      - Collect distinct canonical topic IDs across all lanes using `Set<string>`.
      - Compute `totalNewTopicsCount` (distinct IDs newly added across any lane) and `totalUpdatedTopicsCount` (distinct IDs updated but not new).
    - Expose `lastRefreshedAt: string | null`, `isRefreshing: boolean`, `isStale: boolean`, `hasProcessingDelay: boolean`, `newTopicsPerLane: Record<QualifyingLane, number>`, `manualRefresh: () => Promise<void>`, `revealNewTopics: (lane: QualifyingLane) => void`.
  - [x] 2.2 In `apps/web/src/components/topics/LiveRegionAnnouncer.tsx` and `apps/web/src/hooks/useLiveAnnouncer.ts`:
    - Create `LiveAnnouncerProvider` with a permanently mounted visually-hidden `<div id="dashboard-live-region" role="status" aria-live="polite" aria-atomic="true">`.
    - Implement a 350ms debounced `announce(message)` with brief string reset to guarantee that repeated updates are perceived by screen readers.
    - Wire board update diffs to emit atomic Uzbek Cyrillic announcements:
      - If both new and updated: `${newCount} та янги мавзу қўшилди, ${updatedCount} таси янгиланди.`
      - If only new: `${newCount} та янги мавзу қўшилди.`
      - If only updated: `${updatedCount} та мавзу янгиланди.`
      - If 0 changes: emit nothing (silent).

- [x] **Task 3: Board Toolbar Freshness Display, Delay Warning & Accessible Refresh Button** (AC: 6, 7, 8, 9)
  - [x] 3.1 In `apps/web/src/hooks/usePrefersReducedMotion.ts`:
    - Create lightweight hook listening to `window.matchMedia('(prefers-reduced-motion: reduce)')`.
  - [x] 3.2 In `apps/web/src/components/topics/BoardToolbar.tsx`:
    - Add `lastRefreshedAt?: string`, `isRefreshing?: boolean`, `isOffline?: boolean`, `hasProcessingDelay?: boolean`, `onRefresh?: () => void` props.
    - Render `Янгилаш` button with `<ReloadOutlined spin={isRefreshing && !prefersReducedMotion} />`, disabled when `isOffline` or `isRefreshing`.
    - Render server-backed freshness label: `Охирги янгиланиш: HH:mm` formatted in Tashkent time (`Asia/Tashkent`).
    - If `hasProcessingDelay` is true, render persistent warning badge/callout: `Янгиланиш давом этмоқда — айрим сўнгги хабарлар ҳали кўринмаслиги мумкин (охирги муваффақиятли янгиланиш: HH:mm).`
    - Adhere strictly to `DESIGN.md` zero box-shadows (`boxShadow: 'none'`), light-only tokens (`#0284C7`, `#64748B`, `#E2E8F0`).

- [x] **Task 4: Fixed Lane Header Textual New-Item Count & Discoverability Interaction** (AC: 3, 9)
  - [x] 4.1 In `apps/web/src/components/topics/LaneColumn.tsx`:
    - Add `newItemsCount?: number` and `onRevealNewItems?: () => void` props.
    - If `newItemsCount > 0`, render textual badge in fixed header: `+${newItemsCount} янги` (`backgroundColor: '#FEF3C7', color: '#D97706', border: '1px solid #FDE68A'`).
    - Make badge accessible via keyboard (`tabIndex={0}`, `role="button"`, `aria-label="${newItemsCount} та янги мавзуни кўрсатиш"`).
    - When activated (click / Enter / Space), invoke `onRevealNewItems()` to prepend buffered items and scroll smoothly (immediate if `prefersReducedMotion`) to the top of the lane container.
  - [x] 4.2 In `apps/web/src/components/topics/FiveLaneBoard.tsx`:
    - Pass `newItemsCount` and `onRevealNewItems` from `useHokimTopicBoard` to each `LaneColumn`.

- [x] **Task 5: Open Topic Evidence Drawer Synchronization & Invalidation Handling** (AC: 5)
  - [x] 5.1 In `apps/web/src/topics/useTopicEvidence.ts`:
    - Pass `signal` to `hokimTopicsClient.getTopicEvidence`.
    - When `refetch()` is called during board refresh, revalidate all loaded pages sequentially in background without resetting scroll container.
    - Merge newly arrived evidence items oldest-to-newest by ID and timestamp.
    - Update `topic` metadata and `totalCount` in-place.
    - Intercept 404 `TopicNotFoundError` or 401/403: notify caller to close drawer immediately and purge query cache for that topic.
  - [x] 5.2 In `apps/web/src/pages/HokimDashboardPage.tsx`:
    - When background or manual refresh triggers, invoke `useTopicEvidence.refetch()` if `selectedTopicId` is active.
    - If drawer revalidation detects invalidation (404/401/403), close drawer immediately (`setSelectedTopicId(null)`), purge protected query cache, and return focus deterministically via `useFocusFallback.ts`.

- [x] **Task 6: Network Loss, Offline Warning, Active Session Expiry & Stale Error Dismissal** (AC: 8)
  - [x] 6.1 In `apps/web/src/auth/auth-context.tsx`:
    - Add active offline session expiration checker interval (every 5 seconds when `navigator.onLine === false`).
    - If `new Date() >= new Date(session.expiresAt)` while offline, immediately clear all protected query cache (`queryClient.clear()`), reset auth state, and redirect to `/sign-in`.
  - [x] 6.2 In `apps/web/src/pages/HokimDashboardPage.tsx`:
    - Track online/offline status using window event listeners and `onlineManager`.
    - If `isOffline` is true, render persistent warning banner: `Интернет алоқаси йўқ. Охирги муваффақиятли янгиланиш: ${lastRefreshedTime}`.
    - If background refresh encounters an error while `board` data exists, do **not** unmount the board; render persistent top alert banner: `Янги маълумотларни юклаб бўлмади (охирги муваффақиятли янгиланиш: ${lastRefreshedTime})`.
    - When a subsequent background or manual refresh succeeds, automatically dismiss the stale error banner.

- [x] **Task 7: Comprehensive Automated Vitest & Integration Test Coverage** (AC: 1-9)
  - [x] 7.1 Backend integration tests in `apps/backend/tests/integration/hokim-topics-refresh.test.ts`:
    - Test `GET /api/v1/hokim/topics/board` with `baselineTimestamp`: verifies visit record is not duplicated and `isNew`/`isUpdated` flags evaluate correctly against baseline.
    - Test multi-lane canonical topic deduplication across lanes.
    - Test `checkProcessingDelay` correctly flags pending intake/qualification jobs older than 30s.
    - Execute strictly on isolated test database `mahalla_ovozi_test` with transactional cleanup.
  - [x] 7.2 Web unit & component tests in `apps/web/src/topics/__tests__/useHokimTopicBoard.test.ts`, `apps/web/src/components/topics/__tests__/BoardToolbar.test.tsx`, `apps/web/src/components/topics/__tests__/LiveRegionAnnouncer.test.tsx`, `apps/web/src/pages/__tests__/HokimDashboardPage.test.tsx`:
    - Test in-session reconciliation preserves card positions and loaded pagination pages without layout shifts.
    - Test buffered new topics model and `revealNewTopics` prepending.
    - Test multi-lane distinct canonical topic deduplication for polite announcements.
    - Test manual refresh triggers spin state (disabled under reduced motion) and updates timestamp.
    - Test open drawer revalidation merges evidence oldest-to-newest and closes drawer with focus fallback on 404 invalidation.
    - Test offline status displays persistent warning banner, and offline session expiry purges cache and redirects.
    - Test successful refresh dismisses stale error warning banner.

### Review Findings
- [x] [Review][Patch] Empty placeholder traps user when topics are buffered on empty board [`apps/web/src/components/topics/FiveLaneBoard.tsx:39-43`]
- [x] [Review][Patch] AntD `<Button loading>` overrides reduced-motion setting [`apps/web/src/components/topics/BoardToolbar.tsx:144`]
- [x] [Review][Patch] Baseline and known IDs not reset on date/district change [`apps/web/src/topics/useHokimTopicBoard.ts:34-40`]
- [x] [Review][Patch] Accurately track updated topic IDs from isUpdated flag or timestamp differences [`apps/web/src/topics/useHokimTopicBoard.ts:190-195`]
- [x] [Review][Patch] Untracked nested reset timer & missing unmount cleanup in live region [`apps/web/src/components/topics/LiveRegionAnnouncer.tsx:28-41`]
- [x] [Review][Patch] Invalidation effect re-runs on every render due to inline options [`apps/web/src/topics/useTopicEvidence.ts:126-132`]
- [x] [Review][Patch] Drawer refresh sync effect depends on full evidenceQuery object [`apps/web/src/pages/HokimDashboardPage.tsx:53-61`]
- [x] [Review][Patch] Discoverability badge hardcodes outline none [`apps/web/src/components/topics/LaneColumn.tsx:128`]
- [x] [Review][Patch] Explicit sign-out does not clear query cache [`apps/web/src/auth/auth-context.tsx:100-109`]
- [x] [Review][Patch] Paginated items from loadMore not registered in known refs [`apps/web/src/topics/useHokimTopicBoard.ts:325-348`]

---

## Dev Notes

### 1. Architectural Guidelines & Invariants Compliance
- **AD-10 & Fastify REST Contracts**: Same-origin `/api/v1/hokim/topics/*` JSON REST routes validated with Zod schemas in `@mahalla-ovozi/api-contracts`.
- **Database & Visit Baseline Preservation**: Cold load records initial `userDashboardVisits` and establishes session baseline. In-session background and manual refreshes supply `baselineTimestamp` to evaluate freshness without inserting duplicate visit records or advancing the baseline.
- **TanStack Query v5 Server State**:
  - Distinguish between initial load (`isPending`) and background revalidation (`isFetching`).
  - Use `networkMode: 'online'` to pause queries when offline without failing retries.
  - Forward `AbortSignal` (`signal`) from `queryFn` to client calls to prevent stale response race conditions.
  - Sequential background revalidation in `useInfiniteQuery` preserves memory and DOM scroll state.
- **UX & Accessibility Standards**:
  - Light-only theme with zero persistent box-shadows (`boxShadow: 'none'`, `defaultShadow: 'none'`).
  - Permanent visually-hidden live region (`role="status" aria-live="polite" aria-atomic="true"`) with 350ms debounced updates and string reset.
  - Reduced-motion compliance: `usePrefersReducedMotion()` disables spin animation and makes scrolling immediate.
- **Database Testing Isolation**: All backend tests must execute exclusively against `mahalla_ovozi_test` with transactional rollback cleanup.

### 2. Source Tree Components to Touch

| Status | File Path | Responsibility / Behavior Modification |
| :--- | :--- | :--- |
| **UPDATE** | [`packages/api-contracts/src/topics.ts`](file:///c:/codevision-works/mahalla-ovozi-trial-2/packages/api-contracts/src/topics.ts) | Add `baselineTimestamp` to `HokimTopicBoardQuerySchema`, export `serverEvaluatedAt` and `hasProcessingDelay`. |
| **UPDATE** | [`apps/backend/src/modules/topics/hokim-topic-service.ts`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/backend/src/modules/topics/hokim-topic-service.ts) | Accept `baselineTimestampOverride` in `getTodayBoard` to skip inserting new `userDashboardVisits` rows during in-session refresh; implement `checkProcessingDelay`. |
| **UPDATE** | [`apps/backend/src/modules/topics/hokim-topics-routes.ts`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/backend/src/modules/topics/hokim-topics-routes.ts) | Parse and forward `baselineTimestamp` query parameter. |
| **UPDATE** | [`apps/web/src/topics/hokim-topics-client.ts`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/src/topics/hokim-topics-client.ts) | Accept and forward `AbortSignal` across all topic and evidence client methods. |
| **UPDATE** | [`apps/web/src/topics/useHokimTopicBoard.ts`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/src/topics/useHokimTopicBoard.ts) | Implement in-session reconciliation, pagination batch retention, buffered new topics model, canonical change deduplication, and manual refresh controls. |
| **UPDATE** | [`apps/web/src/components/topics/BoardToolbar.tsx`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/src/components/topics/BoardToolbar.tsx) | Add manual `Янгилаш` button, reduced-motion spin state, server-backed freshness time, and delay warning indicator. |
| **UPDATE** | [`apps/web/src/components/topics/LaneColumn.tsx`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/src/components/topics/LaneColumn.tsx) | Add `+N янги` header badge and `onRevealNewItems` keyboard/click interaction. |
| **UPDATE** | [`apps/web/src/components/topics/FiveLaneBoard.tsx`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/src/components/topics/FiveLaneBoard.tsx) | Pass new item counts and handlers to lane columns. |
| **UPDATE** | [`apps/web/src/topics/useTopicEvidence.ts`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/src/topics/useTopicEvidence.ts) | Oldest-to-newest evidence merge on background refresh without resetting scroll; forward `signal`; intercept 404 invalidation. |
| **UPDATE** | [`apps/web/src/pages/HokimDashboardPage.tsx`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/src/pages/HokimDashboardPage.tsx) | Handle offline/stale banner overlay without unmounting board; auto-dismiss on recovery; wire drawer synchronization and invalidation close. |
| **UPDATE** | [`apps/web/src/auth/auth-context.tsx`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/src/auth/auth-context.tsx) | Add active offline session expiry checker to purge protected cache and redirect when expired offline. |
| **NEW** | `apps/web/src/hooks/usePrefersReducedMotion.ts` | Media query hook for accessibility reduced-motion preferences. |
| **NEW** | `apps/web/src/components/topics/LiveRegionAnnouncer.tsx` | Permanent visually-hidden live region provider with 350ms debounced updates and string reset. |
| **NEW** | `apps/backend/tests/integration/hokim-topics-refresh.test.ts` | Integration tests for baseline-preserving board refresh, multi-lane deduplication, and processing delay. |
| **NEW** | `apps/web/src/topics/__tests__/useHokimTopicBoard.test.ts` | Unit tests for stable in-session reconciliation, buffered new topics, and refresh states. |

### 3. File Behavior Preservation Details
- **`useHokimTopicBoard.ts`**: Must preserve keyset pagination `loadMore` functionality from Story 3.1 while adding in-session reconciliation. Must not discard loaded pages during pagination.
- **`TopicEvidenceDrawer.tsx`**: Must preserve non-modal complementary drawer behavior (`role="region"`, `mask={false}`, heading auto-focus, `useFocusFallback.ts`) from Story 3.2.
- **`BoardToolbar.tsx`**: Must preserve district name, formatted calendar date, and sign-out functionality.

### 4. References
- `_bmad-output/planning-artifacts/epics/epic-3.md#story-33-refresh-dashboard-without-disrupting-review`
- `_bmad-output/planning-artifacts/architecture/architecture-Mahalla-Ovozi-2026-08-12/ARCHITECTURE-SPINE.md#ad-10`
- `_bmad-output/planning-artifacts/ux-designs/ux-Mahalla-Ovozi-2026-08-05/EXPERIENCE.md`
- `_bmad-output/planning-artifacts/ux-designs/ux-Mahalla-Ovozi-2026-08-05/DESIGN.md`
- `_bmad-output/implementation-artifacts/3-2-inspect-complete-topic-evidence.md`

---

## Dev Agent Record

### Agent Model Used
Gemini 3.7 Flash (High)

### Debug Log References
None

### Completion Notes List
- Exhaustive specification review, edge-case hunting, and authoritative tech stack research completed for Story 3.3.
- All 9 BDD acceptance criteria mapped directly from `epic-3.md` and UX spines.
- Full task breakdowns defined across contracts, backend baseline query, web hooks, discoverability buffer (`+N янги`), toolbar, drawer invalidation synchronization, offline session expiry, and ARIA live regions.

### File List
- `packages/api-contracts/src/topics.ts`
- `apps/backend/src/modules/topics/hokim-topics-routes.ts`
- `apps/backend/src/modules/topics/hokim-topic-service.ts`
- `apps/web/src/topics/hokim-topics-client.ts`
- `apps/web/src/topics/useHokimTopicBoard.ts`
- `apps/web/src/components/topics/BoardToolbar.tsx`
- `apps/web/src/components/topics/LaneColumn.tsx`
- `apps/web/src/components/topics/FiveLaneBoard.tsx`
- `apps/web/src/components/topics/LiveRegionAnnouncer.tsx`
- `apps/web/src/hooks/usePrefersReducedMotion.ts`
- `apps/web/src/pages/HokimDashboardPage.tsx`
- `apps/web/src/topics/useTopicEvidence.ts`
- `apps/web/src/auth/auth-context.tsx`
- `apps/backend/tests/integration/hokim-topics-refresh.test.ts`
- `apps/web/src/topics/__tests__/useHokimTopicBoard.test.ts`

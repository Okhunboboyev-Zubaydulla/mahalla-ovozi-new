---
baseline_commit: b1a5cc7
---

# Story 3.8: Continue Large Filtered and Search Results Safely

Status: ready-for-dev

<!-- Note: Validation completed. Ready for dev-story. -->

## Story

As the **Hokim**,
I want to continue loading large filtered or searched Lane results without duplicates or stale pagination,
so that I can review all retained matching Topics while preserving my current dashboard context.

---

## Acceptance Criteria

### 1. Keyset Pagination Continuation Contract & Manual Trigger (AC 1)
- **Given** the active applied dashboard scope has at least one loaded Lane batch
- **When** the Hokim activates `Яна кўрсатиш` (Load More) in a specific Lane column
- **Then** Story 3.1's opaque deterministic keyset cursor pagination contract is reused rather than introducing offset (`OFFSET n`), page-number (`page=2`), or separate search-specific pagination mechanics
- **And** pagination is triggered strictly by user interaction with `Яна кўрсатиш`, never by automated infinite scrolling or intersection observers
- **And** while the batch is loading, the button displays a loading spinner and label `Юкланмоқда...` while disabling duplicate clicks
- **And** already loaded cards in the Lane remain visible and stable without layout jumping.

### 2. Scope-Bound Keyset Cursor Lifecycle & Precision Parity (AC 2)
- **Given** an initial or continuation request returns a `nextCursor`
- **When** the server issues or evaluates the opaque cursor
- **Then** the cursor is base64url-encoded containing deterministic keyset coordinates:
  - `t`: ISO string timestamp (`latestMeaningfulActivityTimestamp`)
  - `id`: Canonical Topic ID (`id`)
- **And** the query evaluates the continuation strictly bound to the authenticated District (`actorContext.districtId`, AD-03), target Lane, and the exact successfully applied date scope (`today`, `yesterday`, or `custom`), `mahallaName`, and `search` query
- **And** the server-side query evaluates the deterministic ordering boundary with PostgreSQL millisecond precision parity:
  ```sql
  WHERE (
    date_trunc('milliseconds', tp.latest_meaningful_activity_timestamp) < ${cursorDate}
    OR (date_trunc('milliseconds', tp.latest_meaningful_activity_timestamp) = ${cursorDate} AND t.id < ${decoded.id})
  )
  ```
- **And** the cursor does not require or materialize a historical snapshot of mutable Topic projections.

### 3. Deterministic Ordering & Client-Side Deduplication (AC 3)
- **Given** `Яна кўрсатиш` completes and returns the next batch of Topic cards
- **When** the frontend appends the new items to the Lane state
- **Then** the client enforces $O(1)$ deduplication by Topic ID against all currently visible cards in that Lane before appending
- **And** Topics that were newly created or updated during the session such that they belong before the existing continuation boundary (i.e. newer than previously loaded items) are **not** retroactively inserted into already reviewed earlier batches
- **And** normal dashboard refresh/revalidation (Story 3.3) remains the exclusive mechanism for making newer state discoverable (via `+N янги` buffer badge).

### 4. Scope Change & Refreshed Context Cursor Invalidation (AC 4)
- **Given** the Hokim modifies any filter (Date scope, Date range, Mahalla, Lane selection) or submits a new search query, or manual/background refresh completes
- **When** the board transitions to the new displayed result context
- **Then** all previous continuation cursors and pagination state for all Lanes are discarded
- **And** any late-arriving pagination responses from obsolete in-flight requests belonging to the previous filter/search scope are cancelled via `AbortController` (with `AbortError` handled silently to prevent unhandled promise rejections) and guarded against scope-key mismatch before mutating state
- **And** subsequent `Яна кўрсатиш` clicks use the fresh `nextCursor` issued by the new active scope.

### 5. Server-Side Stale Cursor Invalidation & Route Error Mapping (AC 5)
- **Given** a Lane continuation cursor is received by the backend via `GET /api/v1/hokim/topics/lane` or `POST /api/v1/hokim/topics/lane/search`
- **When** the cursor contains invalid JSON, unparseable timestamps, out-of-bounds timestamps (future or >90 days old), malformed base64url characters, or references an entity outside the tenant District
- **Then** the server rejects the request with a sanitized error envelope:
  - HTTP 400 Bad Request with `code: 'INVALID_CURSOR'` and message `Курсор нотўғри ёки муддати ўтган.`
- **And** no Topic is silently skipped or arbitrarily returned when keyset boundaries cannot be verified
- **And** raw error logs or client error payloads never leak database internals, stack traces, or resident data.

### 6. Client Non-Disruptive Recovery on Stale Cursor (AC 6)
- **Given** the client encounters an `INVALID_CURSOR` or `STALE_CURSOR` response from `Яна кўрсатиш`
- **When** the error is caught by `useHokimTopicBoard`
- **Then** already loaded permitted Lane cards remain completely usable and intact on screen
- **And** the hook resets continuation cursors (`nextCursor: null, hasNextPage: false`) and initiates Story 3.3's non-disruptive background revalidation (`boardQuery.refetch()`) to obtain a fresh board state
- **And** no local error banner is displayed for stale cursor recovery
- **And** active focus, selected Topic evidence drawer, and scroll position within the Lane are preserved throughout the recovery.

### 7. Authorization, Session & Retention Precedence (AC 7)
- **Given** authorization, user role, session validity, or District assignment changes, or 30-day retention pruning occurs
- **When** an otherwise valid continuation cursor is evaluated
- **Then** current security and retention rules (`t.status = 'ACTIVE'`, `t.retention_expires_at > NOW()`, `t.district_id = ${districtId}`) strictly override continuation semantics
- **And** an old cursor cannot return deleted, unassigned, or expired data merely because it was valid when issued
- **And** cursor payloads never contain raw search text, evidence quotes, Telegram usernames, or resident identities.

### 8. Per-Lane Local Failure Handling & Safe Retry (AC 8)
- **Given** a network error or 5xx server failure occurs during `Яна кўрсатиш`
- **When** the failure is caught
- **Then** previously loaded cards in that Lane remain displayed
- **And** the affected Lane column renders an inline local error banner:
  - Message: `Юклаб бўлмади. Қайта уриниш.`
  - Action: `Қайта уриниш` (Retry button with reload icon)
- **And** the failure in one Lane does not reset or block other Lanes, statistics cards, or applied filters/search
- **And** clicking `Қайта уриниш` re-dispatches the continuation request using the retained `nextCursor` and, upon success, dismisses the error banner and appends the new cards.

### 9. Keyboard Focus Management, Responsive Layout & Reduced Motion (AC 9)
- **Given** `Яна кўрсатиш` is activated across keyboard, touch, or mouse interactions
- **When** new cards are loaded and appended
- **Then** on **keyboard activation** (`Enter` or `Space`), programmatic focus is smoothly shifted to the first newly appended Topic card container (`#topic-card-${firstNewId}` with `tabIndex={0}` and `.focus()`), maintaining WCAG 2.4.3 Focus Order
- **And** on **pointer/mouse activation**, visual scroll position is preserved without forceful focus jumps
- **And** the lane scrollable card list container reflects `aria-busy={isLoadingMore}` during fetching
- **And** the off-screen atomic live region emits a polite completion announcement (e.g. `Сув йўналиши: 20 та янги мавзу қўшилди`) via `LiveAnnouncerContext`
- **And** `Яна кўрсатиш` button meets a minimum 44px touch target height (`minHeight: 44, height: 44`), provides a contextual `aria-label` (e.g. `Сув йўналиши бўйича яна 20 та мавзуни юклаш`), and displays a high-contrast focus outline (`outline: 2px solid #0284C7`, `outlineOffset: 2px`)
- **And** scrolling and transitions execute immediately under `prefers-reduced-motion: reduce`.

### 10. Automated Verification Suite (AC 10)
- **Given** Story 3.8 is verified under automated tests
- **When** backend integration tests and frontend Vitest suites run
- **Then** tests cover:
  1. Backend keyset pagination returns exact 20-item batches with valid `nextCursor` and `hasNextPage` across all 5 lanes under `today`, `yesterday`, and `custom` date scopes.
  2. Backend keyset pagination respects active `mahallaName` and `search` query constraints inside SQL predicates.
  3. Searched lane pagination is dispatched via `POST /api/v1/hokim/topics/lane/search` with the cursor in request body, leaving URL query parameters empty (AD-09).
  4. Backend rejects corrupted, malformed, out-of-bounds, or cross-district cursors with HTTP 400 `INVALID_CURSOR`.
  5. Retention enforcement excludes soft-deleted or expired topics from paginated batches.
  6. Frontend `useHokimTopicBoard` deduplicates appended cards by ID and preserves loaded cards on local pagination failure.
  7. In-flight continuation requests pass `AbortSignal` and cancellation via `AbortController` exits cleanly without unhandled rejections or false error alerts.
  8. Scope-key verification discards late continuation responses if filter/search context changed before response arrived.
  9. Stale cursor (`INVALID_CURSOR`) triggers non-disruptive background refetch without displaying an error alert banner.
  10. Local failure displays `Юклаб бўлмади. Қайта уриниш.` and retry succeeds without losing prior cards.
  11. Keyboard activation shifts focus to the first new card container while pointer click preserves visual scroll.
  12. All backend tests execute exclusively against the isolated test database `mahalla_ovozi_test`.

---

## Tasks / Subtasks

- [ ] **Task 1: Backend Keyset Pagination, Precision Parity & Route Error Mapping** (AC: #1, #2, #5, #7, AD-03, AD-09, AD-10)
  - [ ] 1.1 Update `decodeKeysetCursor` in [`hokim-topic-service.ts`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/backend/src/modules/topics/hokim-topic-service.ts) to strictly validate timestamp ISO strings, bounds check ($t \le \text{NOW} + 1\text{min}$ and $t \ge \text{NOW} - 90\text{days}$), and non-empty UUID/ID string format ($1 \le \text{length} \le 100$), returning `null` on corruption.
  - [ ] 1.2 In `queryLaneData`, apply millisecond truncation parity in keyset predicate:
    ```sql
    AND (
      date_trunc('milliseconds', tp.latest_meaningful_activity_timestamp) < ${cursorDate}
      OR (date_trunc('milliseconds', tp.latest_meaningful_activity_timestamp) = ${cursorDate} AND t.id < ${decoded.id})
    )
    ```
    alongside `t.district_id = ${districtId}`, `t.status = 'ACTIVE'`, and `t.retention_expires_at > NOW()`.
  - [ ] 1.3 In [`hokim-topics-routes.ts`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/backend/src/modules/topics/hokim-topics-routes.ts), update cursor validation failure response in both `GET /api/v1/hokim/topics/lane` and `POST /api/v1/hokim/topics/lane/search` to return HTTP 400 with `{ error: { code: 'INVALID_CURSOR', message: 'Курсор нотўғри ёки муддати ўтган.' } }`.

- [ ] **Task 2: Frontend Hook In-Flight Cancellation, Scope Guard & Stale Recovery** (AC: #1, #3, #4, #6, #8, AD-09)
  - [ ] 2.1 In [`useHokimTopicBoard.ts`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/src/topics/useHokimTopicBoard.ts), implement per-lane `AbortController` tracking (`laneAbortControllersRef = useRef<Map<QualifyingLane, AbortController>>(new Map())`) to abort in-flight requests when scope changes or when component unmounts.
  - [ ] 2.2 In `loadMore`, instantiate a new `AbortController`, pass `controller.signal` to `hokimTopicsClient.getLaneBatch(params, controller.signal)` or `hokimTopicsClient.searchLane(body, controller.signal)`, and capture `scopeKeyAtInvocation = currentScopeKeyRef.current`.
  - [ ] 2.3 Verify `scopeKeyAtInvocation === currentScopeKeyRef.current` before updating state; discard late responses silently if scope has changed.
  - [ ] 2.4 Catch `AbortError` / `DOMException` with name `'AbortError'` in `loadMore` and return silently without modifying state or setting error flags.
  - [ ] 2.5 Enforce $O(1)$ deduplication via `Set<string>` when merging incoming paginated `response.topics` into existing lane `topics`, and atomically update `previousKnownTopicIdsRef` and `previousTopicTimestampsRef`.
  - [ ] 2.6 Implement stale cursor recovery: if `loadMore` catches `ApiError` with `code === 'INVALID_CURSOR'` or `code === 'STALE_CURSOR'`, preserve loaded cards, reset lane continuation state (`nextCursor: null, hasNextPage: false`), set `isLoadingMore: false, loadMoreError: null`, and trigger background board refetch (`boardQuery.refetch()`).
  - [ ] 2.7 On network or 5xx server failure, set `loadMoreError: 'Юклаб бўлмади. Қайта уриниш.'` and `isLoadingMore: false` while preserving all loaded topics and active cursors for retry.

- [ ] **Task 3: UI Lane Component Enhancements, Touch Target & Keyboard Accessibility** (AC: #1, #8, #9)
  - [ ] 3.1 In [`LaneColumn.tsx`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/src/components/topics/LaneColumn.tsx), update `Яна кўрсатиш` button to guarantee minimum 44px touch target height (`minHeight: 44, height: 44`), visible high-contrast focus outline (`outline: 2px solid #0284C7`, `outlineOffset: 2px`), contextual `aria-label` (e.g. `${laneLabel} бўйича яна 20 та мавзуни юклаш`), and loading state label `Юкланмоқда...`.
  - [ ] 3.2 Implement keyboard vs pointer focus management:
    - Capture interaction type (`isKeyboardTriggered = e.detail === 0` in `onClick` or dedicated `onKeyDown` with `Enter`/`Space`).
    - Pass a callback or identify the first newly appended Topic card ID (`topics[previousCount].id`).
    - If keyboard-triggered, shift focus to `#topic-card-${firstNewId}` via `requestAnimationFrame`.
    - If pointer-clicked, preserve scroll position without moving focus.
  - [ ] 3.3 Set `aria-busy={isLoadingMore}` on the scrollable card list container and emit polite completion announcement via `LiveAnnouncerContext` (`announce(`${laneLabel} йўналиши: ${newTopicsCount} та янги мавзу қўшилди`)`).
  - [ ] 3.4 Ensure the local error retry banner matches Uzbek Cyrillic `Юклаб бўлмади. Қайта уриниш.` with functional retry button dispatching `onLoadMore`.

- [ ] **Task 4: Automated Backend Integration Tests** (AC: #10)
  - [ ] 4.1 Create/update [`apps/backend/tests/hokim-topics-pagination.test.ts`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/backend/tests/hokim-topics-pagination.test.ts) testing multi-page keyset continuation across multiple lanes.
  - [ ] 4.2 Test continuation with active `mahallaName` and `search` constraints with POST request-body search privacy (AD-09).
  - [ ] 4.3 Test millisecond precision parity with multiple topics sharing the same millisecond timestamp and distinct IDs.
  - [ ] 4.4 Test malformed, corrupted, out-of-bounds, and cross-district cursor rejection returning HTTP 400 `INVALID_CURSOR`.
  - [ ] 4.5 Verify retention expiration filters out soft-deleted or expired topics during pagination.
  - [ ] 4.6 Ensure all tests execute strictly against `mahalla_ovozi_test`.

- [ ] **Task 5: Automated Frontend Component & Hook Tests** (AC: #10)
  - [ ] 5.1 In [`apps/web/tests/unit/useHokimTopicBoard.test.tsx`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/tests/unit/useHokimTopicBoard.test.tsx), add tests for:
    - `loadMore` appending and $O(1)$ ID deduplication.
    - Search-scope routing (`searchLane` via POST body vs `getLaneBatch` via GET).
    - `AbortController` cancellation on scope change and unmount without error alerts.
    - Scope-key verification discarding obsolete late responses.
    - `INVALID_CURSOR` stale recovery triggering `boardQuery.refetch()` without error banners.
    - Network/5xx error local state management (`loadMoreError: 'Юклаб бўлмади. Қайта уриниш.'`).
  - [ ] 5.2 In [`apps/web/tests/unit/LaneColumn.test.tsx`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/tests/unit/LaneColumn.test.tsx), test:
    - `Яна кўрсатиш` 44px minimum touch target height and high-contrast focus outline.
    - Keyboard activation (`Enter`/`Space`) triggering focus shift to first newly loaded card container.
    - Pointer click preserving scroll position without focus jump.
    - Container `aria-busy` attribute during fetching.
    - Local error alert render and retry interaction.

---

## Dev Notes

### Keyset Cursor Encoding & Query Mechanics

1. **Payload Structure**:
   ```typescript
   export interface KeysetCursorPayload {
     t: string; // ISO datetime string (e.g. '2026-08-24T10:30:00.000Z')
     id: string; // Topic ID (e.g. 'top_01952e42-7a2e-7443-85e7-2b36a19f20e4')
   }
   ```

2. **Encoding & Robust Decoding**:
   ```typescript
   export function encodeKeysetCursor(timestamp: string, id: string): string {
     return Buffer.from(JSON.stringify({ t: timestamp, id })).toString('base64url');
   }

   export function decodeKeysetCursor(cursor: string): KeysetCursorPayload | null {
     try {
       const raw = Buffer.from(cursor, 'base64url').toString('utf8');
       const parsed = JSON.parse(raw);
       if (
         parsed &&
         typeof parsed.t === 'string' &&
         typeof parsed.id === 'string' &&
         parsed.id.length > 0 &&
         parsed.id.length <= 100
       ) {
         const time = new Date(parsed.t).getTime();
         if (Number.isNaN(time)) return null;
         
         const now = Date.now();
         const ninetyDaysAgo = now - 90 * 86400 * 1000;
         const oneMinuteInFuture = now + 60 * 1000;
         if (time < ninetyDaysAgo || time > oneMinuteInFuture) {
           return null;
         }

         return { t: parsed.t, id: parsed.id };
       }
       return null;
     } catch {
       return null;
     }
   }
   ```

3. **SQL Keyset Predicate with Millisecond Precision Parity**:
   ```sql
   AND (
     date_trunc('milliseconds', tp.latest_meaningful_activity_timestamp) < ${cursorDate}
     OR (date_trunc('milliseconds', tp.latest_meaningful_activity_timestamp) = ${cursorDate} AND t.id < ${decoded.id})
   )
   ```
   Composite index on `(latest_meaningful_activity_timestamp DESC, id DESC)` ensures efficient index-scan continuation without table scans.
   *Precision Invariant*: PostgreSQL `TIMESTAMPTZ(3)` / `date_trunc('milliseconds', ...)` guarantees parity with JavaScript 3-decimal ISO strings, eliminating boundary record skipping.

### Client-Side Error & Recovery Decision Matrix

| Error Type | Detection in `loadMore` | Action in `useHokimTopicBoard` | UI Presentation |
| :--- | :--- | :--- | :--- |
| **Aborted Query** | `err.name === 'AbortError'` | Return silently; no state update | None (seamless transition) |
| **Scope Mismatch** | `scopeKeyAtInvocation !== currentScopeKeyRef.current` | Discard response silently | None (new scope renders) |
| **Stale Cursor** | `err instanceof ApiError && (err.code === 'INVALID_CURSOR' \|\| err.code === 'STALE_CURSOR')` | Preserve loaded cards; reset lane cursor; trigger `boardQuery.refetch()` | None; non-disruptive refresh updates board |
| **Network / 5xx** | `err instanceof ApiError && err.code !== 'INVALID_CURSOR'` | Preserve loaded cards; set `loadMoreError: 'Юклаб бўлмади. Қайта уриниш.'` | Inline error banner with `Қайта уриниш` button |

### Client-Side State Reconciliation Flow

```
[User clicks "Яна кўрсатиш" in Lane K]
                │
                ▼
[Capture scopeKeyAtInvocation, abort prior Lane K request, create new AbortController]
[Set isLoadingMore: true, loadMoreError: null for Lane K, aria-busy=true]
                │
                ▼
[Check if trimmedSearch is active]
   ├── YES ──► POST /api/v1/hokim/topics/lane/search (body: { lane, cursor, search, ... }, signal)
   └── NO  ──► GET  /api/v1/hokim/topics/lane?lane=K&cursor=... (signal)
                │
                ▼
[On Success] ────────────────────────────────────────────────────────┐
   ├── Guard: if (scopeKeyAtInvocation !== currentScopeKey) return   │
   ├── Filter incoming topics against existing visible IDs (Deduplicate)
   ├── Append new topics to lane.topics
   ├── Update lane.nextCursor & lane.hasNextPage
   ├── Atomically update previousKnownTopicIdsRef & previousTopicTimestampsRef
   ├── If triggered via keyboard -> Shift focus to 1st newly loaded card (tabIndex=0)
   ├── Announce batch via LiveAnnouncerContext ("X та янги мавзу қўшилди")
   └── Set isLoadingMore: false
                │
[On Stale/Invalid Cursor Error (INVALID_CURSOR / STALE_CURSOR)] ──────┤
   ├── Preserve loaded lane.topics
   ├── Reset lane.nextCursor: null, lane.hasNextPage: false
   ├── Trigger boardQuery.refetch() (Story 3.3 Non-disruptive refresh)
   └── Set isLoadingMore: false, loadMoreError: null
                │
[On Network/Server Error] ───────────────────────────────────────────┘
   ├── Preserve loaded lane.topics
   ├── Set loadMoreError: 'Юклаб бўлмади. Қайта уриниш.'
   └── Set isLoadingMore: false
```

### Accessibility & UX Constants

- **Load More Button Text**: `Яна кўрсатиш`
- **Loading State Text**: `Юкланмоқда...`
- **Local Error Banner Text**: `Юклаб бўлмади. Қайта уриниш.`
- **Retry Action Text**: `Қайта уриниш`
- **Touch Target Floor**: `minHeight: 44, height: 44` (WCAG 2.5.5 / 2.5.8)
- **Focus Ring Style**: `outline: 2px solid #0284C7`, `outlineOffset: 2px`
- **Container Loading State**: `aria-busy={isLoadingMore}`
- **Live Announcement**: `"${laneLabel} йўналиши: ${newTopicsCount} та янги мавзу қўшилди"`
- **Reduced Motion Support**: `transition: none`, `scroll-behavior: auto`

### Project Structure Notes

- API contracts: [`packages/api-contracts/src/topics.ts`](file:///c:/codevision-works/mahalla-ovozi-trial-2/packages/api-contracts/src/topics.ts)
- Backend service: [`apps/backend/src/modules/topics/hokim-topic-service.ts`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/backend/src/modules/topics/hokim-topic-service.ts)
- Backend routes: [`apps/backend/src/modules/topics/hokim-topics-routes.ts`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/backend/src/modules/topics/hokim-topics-routes.ts)
- Frontend client: [`apps/web/src/topics/hokim-topics-client.ts`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/src/topics/hokim-topics-client.ts)
- Frontend hook: [`apps/web/src/topics/useHokimTopicBoard.ts`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/src/topics/useHokimTopicBoard.ts)
- UI components:
  - [`apps/web/src/components/topics/LaneColumn.tsx`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/src/components/topics/LaneColumn.tsx)
  - [`apps/web/src/components/topics/FiveLaneBoard.tsx`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/src/components/topics/FiveLaneBoard.tsx)
  - [`apps/web/src/components/topics/TopicCard.tsx`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/src/components/topics/TopicCard.tsx)

### References

- Epic 3 Specification: [`_bmad-output/planning-artifacts/epics/epic-3.md#L771-L835`](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/epics/epic-3.md#L771-L835)
- Architecture Invariants (AD-03, AD-09, AD-10): [`_bmad-output/planning-artifacts/architecture/architecture-Mahalla-Ovozi-2026-08-12/ARCHITECTURE-SPINE.md#L124`](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/architecture/architecture-Mahalla-Ovozi-2026-08-12/ARCHITECTURE-SPINE.md#L124)
- Previous Story Spec: [`_bmad-output/implementation-artifacts/3-7-search-current-and-retained-topics-privately.md`](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/implementation-artifacts/3-7-search-current-and-retained-topics-privately.md)
- Non-Disruptive Refresh Pattern (Story 3.3): [`_bmad-output/implementation-artifacts/3-3-refresh-dashboard-without-disrupting-review.md`](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/implementation-artifacts/3-3-refresh-dashboard-without-disrupting-review.md)

---

## Dev Agent Record

### Agent Model Used

Gemini 3.7 Flash (High)

### Debug Log References

None (Spec Quality Validation & Hardening phase)

### Completion Notes List

- Quality validation and adversarial hardening completed for Story 3.8 specification.
- Applied PostgreSQL keyset millisecond truncation parity to eliminate boundary skipping.
- Hardened backend route error mapping with explicit `INVALID_CURSOR` HTTP 400 envelopes.
- Added per-lane `AbortController` tracking, `AbortSignal` propagation, and scope-key verification to prevent race conditions.
- Integrated WCAG 2.1/2.2 AA accessibility standards (44px touch targets, keyboard vs pointer focus management, polite screen reader live region announcements).
- Story specification artifact updated in `_bmad-output/implementation-artifacts/3-8-continue-large-filtered-and-search-results-safely.md`.

### File List

- `_bmad-output/implementation-artifacts/3-8-continue-large-filtered-and-search-results-safely.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`


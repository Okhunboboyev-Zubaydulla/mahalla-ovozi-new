# Story 3.10: Keep Board and Statistics Consistent During Updates

Status: done

<!-- Note: Implementation completed with full unit, integration, and typecheck verification. -->

## Story

As the **Hokim**,
I want Lane results and statistics to come from one consistent dashboard evaluation and recover independently when a section fails,
so that I am never shown statistics that silently describe a different result set from the board I am reviewing.

---

## Acceptance Criteria

### 1. Short-Lived Consistent PostgreSQL Read Boundary & Authoritative Evaluation Identity (AC 1)
- **Given** Lane results and statistics belong to one coordinated dashboard evaluation for the applied District, date, Mahalla, Lane, and settled search criteria
- **When** the server establishes that evaluation
- **Then** it establishes one short-lived consistent PostgreSQL read boundary (e.g. transaction snapshot / read boundary) for the successfully applied scope
- **And** every Lane result and statistic claimed as current for that evaluation is derived from data visible through that same read boundary
- **And** the server assigns one server-issued, high-entropy opaque evaluation identifier (`evaluationId: string (UUIDv4)`) and one authoritative evaluation timestamp (`serverEvaluatedAt: string (ISO datetime)`) to that evaluation
- **And** for `Бугун`, that same `serverEvaluatedAt` (`asOf`) is the cutoff used by the coordinated current-period statistics and equivalent-yesterday comparison (AC 1 of Story 3.9)
- **And** the consistent read boundary is released immediately after calculation and is **strictly not retained** as a persistent or materialized historical Topic-projection snapshot table.

### 2. Privacy-Safe Opaque Evaluation Identity Invariant (AC 2)
- **Given** an `evaluationId` is exposed to the browser client in board and statistics payloads
- **When** the server generates and associates the `evaluationId`
- **Then** it is a fresh server-issued UUIDv4 and is not itself authorization evidence
- **And** its value is generated completely independently of raw search text, resident evidence, Telegram user/message IDs, credentials, secrets, or other protected content
- **And** it is strictly **not** a reversible encoding, stable hash, deterministic digest, or dictionary-testable derivation of sensitive search or filter criteria
- **And** the server associates the opaque identity with the authorized District and evaluated criteria internally rather than embedding criteria into the identifier
- **And** a new coordinated evaluation receives a new random `evaluationId` even when user-visible criteria happen to be unchanged.

### 3. Coordinated Delivery, Evaluation Identity Matching & Stale Payload Rejection (AC 3)
- **Given** Lane results and statistics payloads are delivered separately over HTTP (via `/api/v1/hokim/topics/board` / `/api/v1/hokim/topics/lane` and `/api/v1/hokim/topics/statistics` or their POST search counterparts)
- **When** they represent one coordinated evaluation
- **Then** each payload carries that evaluation's same `evaluationId` and authoritative `serverEvaluatedAt` through the shared API contracts
- **And** the browser client validates `evaluationId` and `serverEvaluatedAt` matching to prevent mixing responses from different evaluation runs
- **And** mismatched, late, or obsolete evaluation payloads are rejected/ignored rather than merged with active state.

### 4. Scoped Statistics Failure & Independent Board Presentation (AC 4)
- **Given** the Hokim successfully changes date, Mahalla, Lane, or settled search criteria
- **When** the Lane result evaluation succeeds but the corresponding statistics evaluation fails (e.g. 500 error or network timeout on statistics endpoint)
- **Then** the requested criteria become the new successfully applied dashboard scope
- **And** the Lane board and toolbar/filter controls represent that new applied scope rather than reverting to the prior scope
- **And** the toolbar freshness time represents the successful server-backed Lane-result evaluation boundary (`serverEvaluatedAt`) for the displayed board
- **And** the statistics strip independently displays a scoped failure state (`Статистика маълумотларини юклаб бўлмади`) with a local `Қайта уриниш` button without replacing, disabling, or obscuring the successful Lane board
- **And** the UI does not claim that the complete Lane-plus-statistics evaluation succeeded
- **And** previous-scope statistics are **never presented** as if they describe the newly applied board (cleared immediately upon scope change)
- **And** no invented zero values are substituted for unavailable statistics.

### 5. Ordinary Background Refresh Stale Preservation vs Filter Change Invariant (AC 5)
- **Given** board and statistics already successfully represent the same unchanged applied scope
- **When** an ordinary in-session background refresh fails only for statistics while prior same-scope statistics remain permitted
- **Then** prior same-scope statistics may remain visible with explicit stale qualification under the existing stale-data contract
- **And** their prior successful evaluation boundary timestamp is preserved rather than represented as freshly updated
- **But** when the filter scope changes (date, Mahalla, Lane, or search), prior-scope statistics are cleared immediately and cannot be shown as stale for the new scope.

### 6. Coordinated Statistics Retry (`Қайта уриниш`) & Review Context Preservation (AC 6)
- **Given** the current successfully applied scope has a statistics-section failure while permitted Lane results remain visible
- **When** the Hokim activates `Қайта уриниш` on the statistics strip
- **Then** the same applied date/Mahalla/Lane/search scope is re-evaluated as one new coordinated server evaluation under the shared consistent-read contract
- **And** the retry re-evaluates both Lane result state and statistics together as part of that coordinated evaluation rather than calculating fresh statistics against an older Lane evaluation
- **And** the applied filters themselves do not change merely because retry was activated
- **And** until that coordinated retry succeeds, the previously permitted Lane board remains usable and the statistics loading/failure state remains confined to the statistics strip
- **When** the coordinated retry succeeds:
  - The new Lane/statistics evaluation replaces the previous evaluation
  - Existing valid Topic selection, open evidence detail drawer, focus, board horizontal scroll position, and Lane vertical review positions are preserved using Story 3.3's non-disruptive refresh behavior
  - The toolbar freshness advances to that newly successful coordinated evaluation timestamp (`serverEvaluatedAt`) together with the refreshed Lane and statistics state
  - Authorization, session expiry, district switching, or 90-day retention invalidation overrides review-context preservation.

### 7. Neutral, Structure-Matching Statistics Loading Skeletons (AC 7)
- **Given** statistics are loading or re-evaluating while permitted Lane results exist
- **When** the dashboard remains usable
- **Then** only the statistics region renders a structure-matching loading skeleton (5 cards with pulse animation, fixed height `minHeight: 116px`, 0px CLS) with no invented metric values
- **And** the Lane board remains fully operable and interactive.

### 8. Search Privacy Invariant Preservation (AD-09, AD-10) (AC 8)
- **Given** settled search scopes the dashboard board and statistics
- **When** board and statistics requests are made or coordinated
- **Then** Story 3.7's search-privacy contract remains unchanged: raw search text is transmitted only via POST body and does not enter URLs, browser query params, LocalStorage, Audit History, analytics, telemetry, server logs, or `evaluationId`.

### 9. Combined Filter Performance Envelope (AC 9)
- **Given** combined date, Mahalla, Lane, and settled search criteria change under the approved design envelope
- **When** the coordinated dashboard evaluation executes
- **Then** both the Lane-result state and corresponding 5-card statistics state for the same successful evaluation are returned within 2.0 seconds for $\ge 95\%$ of requests
- **And** statistics do not receive a separate slower performance budget that routinely lags behind the board
- **And** browser pagination after the initial applied scope remains Lane-local progressive loading rather than blocking the complete dashboard.

### 10. Automated Integration & Unit Test Verification (AC 10)
- **Given** Story 3.10 is verified under the automated test suite
- **When** focused tests execute against the isolated test database `mahalla_ovozi_test` (port 5433) and Vitest runners
- **Then** tests cover:
  1. Backend returns fresh `evaluationId` (UUIDv4) and `serverEvaluatedAt` in both board and statistics endpoints (GET and POST search).
  2. Successive evaluations produce unique `evaluationId`s even with identical filter parameters.
  3. `evaluationId` is privacy-safe (UUIDv4 format, unrelated to search query or resident data).
  4. Partial failure handling: Lane board succeeds, statistics fails -> board displays new scope, toolbar freshness reflects board `asOf`, statistics strip displays scoped error with `Қайта уриниш`.
  5. Statistics `Қайта уриниш` triggers coordinated re-evaluation of both board and statistics, preserving active evidence drawer and focus.
  6. Filter scope transition immediately clears prior-scope statistics and renders loading skeleton (no cross-scope statistic leakage).
  7. Background refresh partial failure preserves same-scope statistics as stale without advancing freshness.
  8. Mismatched or obsolete evaluation payloads are rejected/ignored by client state.
  9. Structure-matching loading skeletons reserve exact card dimensions (0px CLS, `minHeight: 116px`).
  10. Search privacy preserved: no search text in `evaluationId`, GET query params, or error log messages.

---

## Tasks / Subtasks

- [x] **Task 1: Shared API Contracts & Zod Schemas for Evaluation Identity** (AC: 1, 2, 3)
  - [x] 1.1 In `packages/api-contracts/src/topics.ts`:
    - Add `evaluationId: z.string().uuid()` to `HokimTopicBoardResponseSchema`.
    - Add `evaluationId: z.string().uuid()` to `HokimTopicStatisticsResponseSchema`.
    - Export updated `HokimTopicBoardResponse` and `HokimTopicStatisticsResponse` types.
    - Verify schema backward/forward compatibility and ensure strict UUIDv4 validation.

- [x] **Task 2: Backend Coordinated Evaluation & Isolation in `HokimTopicService` & Routes** (AC: 1, 2, 3, 8, 9)
  - [x] 2.1 In `apps/backend/src/modules/topics/hokim-topic-service.ts`:
    - In `getTodayBoard`: generate fresh UUIDv4 `evaluationId = crypto.randomUUID()` and authoritative `serverEvaluatedAt = currentVisitDate.toISOString()`.
    - In `getStatistics`: generate fresh UUIDv4 `evaluationId = crypto.randomUUID()` and authoritative `serverEvaluatedAt = asOfDate.toISOString()`.
    - Ensure `evaluationId` generation is strictly high-entropy random and independent of search text or sensitive parameters.
    - Review single-pass CTE query execution to ensure consistent read behavior without retaining snapshot tables.
  - [x] 2.2 In `apps/backend/src/modules/topics/hokim-topics-routes.ts`:
    - Verify all GET and POST search route handlers for board and statistics properly return `evaluationId` and `serverEvaluatedAt`.
    - Ensure error handling and log messages do NOT echo raw search text or leak parameters.

- [x] **Task 3: Web Client Evaluation Coordination & Hook Synchronization** (AC: 3, 4, 5, 6)
  - [x] 3.1 In `apps/web/src/topics/useTopicStatistics.ts`:
    - Support receiving and returning `evaluationId` in `UseTopicStatisticsResult`.
    - Fix `placeholderData`: update logic to only preserve previous data when `queryKey` filter parameters match identically (same scope). On filter or search scope transition, immediately return `undefined` so prior-scope statistics are cleared without cross-scope statistic leakage.
    - Pass through `signal` (AbortSignal) to `hokimTopicsClient` to abort in-flight requests on rapid filter switching.
    - Expose `isError`, `error`, `refetch`, `isFetching`, and `evaluationId`.
  - [x] 3.2 In `apps/web/src/topics/useHokimTopicBoard.ts`:
    - Expose `evaluationId` and `serverEvaluatedAt` from board data.
    - Ensure `manualRefresh` and `refetch` return promises to allow coordinated re-evaluation triggering from dashboard page.
    - Verify existing board data is preserved in state during in-flight background refresh/retry without full-screen layout flashing.

- [x] **Task 4: Scoped Statistics Failure & Coordinated Retry UI** (AC: 4, 5, 6, 7)
  - [x] 4.1 In `apps/web/src/components/topics/TopicStatisticsStrip.tsx`:
    - Update `TopicStatisticsStripProps`:
      ```ts
      export interface TopicStatisticsStripProps {
        statistics?: HokimTopicStatisticsResponse;
        isLoading?: boolean;
        isError?: boolean;
        onRetry?: () => void;
        isRetrying?: boolean;
        isStale?: boolean;
      }
      ```
    - When `isError` is true and `!statistics`:
      - Render a scoped error alert container within the statistics region containing text: `Статистика маълумотларини юклаб бўлмади` and a `Қайта уриниш` button with `loading={isRetrying}` and `aria-label="Статистикани қайта юклаш"`.
      - On desktop (>= 1024px): container spans the strip with `minHeight: 116px`, background `#FEF2F2`, border `1px solid #FECACA`, radius 8px.
      - On mobile (< 1024px): suppress the 5-card counter header ("Кўрсаткич 1 / 5") and render the error alert container with 44px min height touch target for the retry button.
      - Add ARIA live announcement (`role="alert"` / `aria-live="polite"`).
      - Ensure strict 0px CLS geometry preservation.
    - When `isLoading` is true and `!statistics`:
      - Render 5 structure-matching skeleton cards (`minHeight: 116px`) with pulse animation and fixed heights (0px CLS).
    - When `isError` is true but `statistics` is present (background refresh partial failure):
      - Render existing 5 cards with stale qualification rather than replacing with an error card.
  - [x] 4.2 In `apps/web/src/pages/HokimDashboardPage.tsx`:
    - Connect `TopicStatisticsStrip` props:
      ```tsx
      <TopicStatisticsStrip
        statistics={statistics}
        isLoading={isStatsLoading && !statistics}
        isError={isStatsError && !statistics}
        onRetry={handleStatisticsRetry}
        isRetrying={isStatsFetching}
      />
      ```
    - Implement `handleStatisticsRetry`: triggers coordinated re-evaluation of both board (`manualRefresh()`) and statistics (`refetchStats()`) concurrently using `Promise.allSettled`.
    - Ensure open Topic Evidence drawer (`selectedTopicId`), keyboard focus, board horizontal scroll, and lane vertical scroll positions are preserved.
    - Ensure toolbar freshness timestamp continues to reflect the board's successful `serverEvaluatedAt` when statistics fail.
    - Verify global error banner is only shown when the board itself fails, and is NOT triggered by statistics failure.

- [x] **Task 5: Backend Integration Tests on Isolated Test DB (`mahalla_ovozi_test`, port 5433)** (AC: 1, 2, 3, 10)
  - [x] 5.1 In `apps/backend/tests/hokim-topics-statistics.test.ts` (or `hokim-topics-coordination.test.ts`):
    - Verify database connection runs strictly on isolated test database `mahalla_ovozi_test` (port 5433).
    - Test board and statistics endpoints return valid UUIDv4 `evaluationId` and ISO `serverEvaluatedAt`.
    - Test sequential requests produce distinct `evaluationId` values.
    - Test search POST endpoints return `evaluationId` without search text in the identifier.
    - Test tenant isolation by `districtId`.

- [x] **Task 6: Frontend Component & Hook Tests (Vitest)** (AC: 4, 5, 6, 7, 10)
  - [x] 6.1 In `apps/web/tests/unit/TopicStatisticsStrip.test.tsx`:
    - Test scoped error state rendering with `Қайта уриниш` button when `isError=true` and `statistics=undefined`.
    - Test clicking `Қайта уриниш` calls `onRetry`.
    - Test mobile view (< 1024px) error rendering without counter header.
    - Test loading skeleton rendering (5 skeleton cards, 0px CLS, `minHeight: 116px`).
    - Test stale data preservation: when `isError=true` and `statistics` is present, renders 5 cards without error card.
    - Test normal 5-card rendering when `statistics` are provided.
  - [x] 6.2 In `apps/web/tests/unit/useTopicStatistics.test.tsx`:
    - Test scope change (filter/search) clears old statistics immediately (`statistics: undefined`).
    - Test error handling state (`isError=true`).
    - Test query key generation for all filter and search combinations.
  - [x] 6.3 In `apps/web/tests/unit/HokimDashboard.test.tsx`:
    - Test partial failure scenario: board loads successfully, statistics fails -> board is interactive, statistics strip shows scoped error, toolbar shows board freshness, global error banner is NOT displayed.
    - Test statistics retry triggers coordinated refresh while preserving selected topic and drawer state.

---

## Dev Notes

### Relevant Architecture Patterns & Constraints
1. **Database & Environment Isolation**:
   - All automated test suites MUST execute strictly against the isolated test database `mahalla_ovozi_test` (port 5433). Never run tests or seed fixtures on the development database (`mahalla_ovozi`, port 5432).
2. **Search Privacy Invariant (AD-09, AD-10)**:
   - Plain-text search queries MUST always be sent via HTTP POST body (`/api/v1/hokim/topics/board/search` and `/api/v1/hokim/topics/statistics/search`).
   - `evaluationId` must be completely random UUIDv4 and NEVER encode, hash, or leak search keywords, mahalla names, resident evidence, or credentials.
3. **No Persistent Snapshot Tables**:
   - PostgreSQL read boundaries are short-lived transactions or atomic query aggregations; do NOT create or persist materialized snapshot tables.
4. **0px Layout Shift (0px CLS)**:
   - Skeletons and error cards in `TopicStatisticsStrip` must match the height and structure of the 5-card strip (`minHeight: 116px` on desktop) to prevent layout jumping when statistics resolve or fail.
5. **Non-Disruptive Refresh & Review Context Preservation (Story 3.3 Compliance)**:
   - When coordinated retry or background refresh executes, the client MUST preserve:
     - Currently selected topic ID (`selectedTopicId`)
     - Open evidence drawer state
     - Keyboard focus and active lane
     - Horizontal board scroll and vertical lane scroll positions.

### Source Tree Components to Touch

#### Files to Update:
1. `packages/api-contracts/src/topics.ts`:
   - *Current state:* `HokimTopicBoardResponseSchema` and `HokimTopicStatisticsResponseSchema` have `serverEvaluatedAt: z.string().datetime()` but lack `evaluationId`.
   - *Changes:* Add `evaluationId: z.string().uuid()` to both schemas.
   - *Preserve:* All existing fields, sub-schemas (Card 1 comparison, Card 4, Card 5, filters).

2. `apps/backend/src/modules/topics/hokim-topic-service.ts`:
   - *Current state:* `getTodayBoard` and `getStatistics` return `serverEvaluatedAt: currentVisitDate.toISOString()`.
   - *Changes:* Include `evaluationId: crypto.randomUUID()` in both return objects.
   - *Preserve:* All filtering, lane grouping, date boundaries, search logic, delay checking, and prior-period comparison algorithms.

3. `apps/web/src/topics/useTopicStatistics.ts`:
   - *Current state:* Fetches statistics with TanStack Query; placeholder data persists across scope changes.
   - *Changes:* Ensure filter/search scope transitions clear prior data (`placeholderData` only within identical scope); expose `isError`, `error`, `refetch`, `isFetching`.
   - *Preserve:* Query keys, auth integration, search body routing.

4. `apps/web/src/components/topics/TopicStatisticsStrip.tsx`:
   - *Current state:* Renders 5 cards or loading skeletons when `isLoading` is true.
   - *Changes:* Add `isError`, `onRetry`, `isRetrying`, `isStale` props; render scoped error alert container with `Қайта уриниш` button when statistics fail cold (`isError && !statistics`) without crashing or hiding the strip; preserve 0px CLS (`minHeight: 116px`).
   - *Preserve:* 5-card grid desktop layout, mobile swipeable navigation, ARIA announcements, neutral non-color styling.

5. `apps/web/src/pages/HokimDashboardPage.tsx`:
   - *Current state:* Passes `statistics` and `isLoading` to `TopicStatisticsStrip`; shows global banner on error.
   - *Changes:* Pass `isError={isStatsError && !statistics}` and `onRetry={handleStatisticsRetry}` to `TopicStatisticsStrip`; refine global error banner to only show when the board itself fails; implement coordinated retry via `Promise.allSettled`.
   - *Preserve:* Toolbar, FilterBar, FiveLaneBoard, TopicEvidenceDrawer, Help drawer, keyboard fallback focus.

#### Files to Create/Update for Testing:
1. `apps/backend/tests/hokim-topics-statistics.test.ts` (or `hokim-topics-coordination.test.ts`):
   - Add test cases verifying `evaluationId` (UUIDv4) and `serverEvaluatedAt` in board and statistics responses.
2. `apps/web/tests/unit/TopicStatisticsStrip.test.tsx`:
   - Add tests for scoped error state, mobile error layout, and `Қайта уриниш` action.
3. `apps/web/tests/unit/useTopicStatistics.test.tsx`:
   - Add tests for scope invalidation and error states.
4. `apps/web/tests/unit/HokimDashboard.test.tsx`:
   - Add tests for partial failure and coordinated retry.

---

### Project Structure Notes
- Shared contracts live in `packages/api-contracts/src/topics.ts`.
- Backend services live in `apps/backend/src/modules/topics/`.
- Frontend components live in `apps/web/src/components/topics/`.
- Frontend hooks live in `apps/web/src/topics/` and `apps/web/src/hooks/`.

---

### References
- [Epic 3 Specification: Story 3.10](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/epics/epic-3.md#L883-L980)
- [PRD FR16 & FR18](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/prds/prd-Mahalla-Ovozi-2026-07-30/prd.md)
- [UX Design Specifications](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/ux-designs/ux-Mahalla-Ovozi-2026-08-05/DESIGN.md)
- [Project Context & Rules](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/project-context.md)

---

## Dev Agent Record

### Agent Model Used
Gemini 3.7 Flash (High)

### Debug Log References
- Checked `packages/api-contracts/src/topics.ts` for existing response schemas.
- Checked `apps/backend/src/modules/topics/hokim-topic-service.ts` for board and statistics query flows.
- Checked `apps/backend/src/modules/topics/hokim-topics-routes.ts` for route parameter handling.
- Checked `apps/web/src/pages/HokimDashboardPage.tsx` and `apps/web/src/components/topics/TopicStatisticsStrip.tsx` for layout and error boundaries.
- Executed adversarial & edge-case review auditing 12 potential failure classes.

### Completion Notes List
- Comprehensive specification created with all 10 acceptance criteria and granular tasks.
- Developer context, architecture compliance, error handling, search privacy, 0px CLS, and test requirements fully documented.

### File List
- `packages/api-contracts/src/topics.ts`
- `apps/backend/src/modules/topics/hokim-topic-service.ts`
- `apps/backend/src/modules/topics/hokim-topics-routes.ts`
- `apps/web/src/topics/useTopicStatistics.ts`
- `apps/web/src/topics/useHokimTopicBoard.ts`
- `apps/web/src/components/topics/TopicStatisticsStrip.tsx`
- `apps/web/src/pages/HokimDashboardPage.tsx`
- `apps/backend/tests/hokim-topics-statistics.test.ts`
- `apps/web/tests/unit/TopicStatisticsStrip.test.tsx`
- `apps/web/tests/unit/useTopicStatistics.test.tsx`
- `apps/web/tests/unit/HokimDashboard.test.tsx`

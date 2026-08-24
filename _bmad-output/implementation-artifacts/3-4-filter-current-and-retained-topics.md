---
baseline_commit: 4848dd2
---

# Story 3.4: Filter Current and Retained Topics

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the **Hokim**,
I want to filter current and retained Topics by date, Mahalla, and Lane from the same dashboard,
so that I can focus on an earlier or narrower District situation without navigating to a separate History surface.

---

## Acceptance Criteria

### 1. Default Date Scope (`Бугун`) & In-Place Board Continuity (AC 1)
- **Given** the authenticated Hokim enters the unified dashboard for their fixed District
- **When** no date filter has been explicitly changed (initial cold load or fresh visit)
- **Then** `Бугун` is the active default date scope (covering the current `Asia/Tashkent` calendar day from `00:00` through the successful server evaluation `asOf`)
- **And** current and retained historical topics are displayed on the same unified five-Lane dashboard rather than redirecting or navigating to a separate History page or route.

### 2. Asia/Tashkent Calendar Boundaries & 90-Day Retention Compliance (AC 2)
- **Given** the date filter control is used
- **When** the Hokim selects `Бугун`, `Кеча`, or `Сана бўйича`
- **Then** all date calculations, boundaries, and queries strictly use `Asia/Tashkent` (UTC+5) calendar day boundaries (`YYYY-MM-DD`)
- **And** `Кеча` evaluates the full preceding complete `Asia/Tashkent` calendar day (`00:00` to `23:59:59.999`)
- **And** `Сана бўйича` supports choosing one complete `Asia/Tashkent` calendar day or a contiguous complete-day range (`dateFrom` to `dateTo`) whose requested dates fall within the currently available retained window up to the approved 90-day retention boundary (`NOW() - INTERVAL '90 days'`)
- **And** the product does not impose an obsolete 7-day or other smaller arbitrary maximum
- **And** expired Topic or evidence content past the 90-day retention boundary is not recoverable merely because a requested calendar date lies inside the nominal window.

### 3. Strict Date Scope Rules & Exclusion of Hourly/Partial-Day Filters (AC 3)
- **Given** the Hokim is selecting a historical or current time scope
- **When** date-filter options are presented in the UI or validated on the backend
- **Then** `Бугун` is the sole permitted partial-current-day scope and covers the current `Asia/Tashkent` calendar day up to the server evaluation `asOf`
- **And** `Кеча` and `Сана бўйича` operate strictly on complete `Asia/Tashkent` calendar days or permitted contiguous complete-day ranges
- **And** the dashboard provides no Last 1 hour, Last 3 hours, Last 6 hours, arbitrary hour/minute range, or any other sub-day/hourly filter
- **And** hourly filtering is strictly excluded from all API contracts, validation schemas, and UI controls.

### 4. Topic-Level Retention & Authoritative Boundary Evaluation (AC 4)
- **Given** Topic retention is governed at the Topic level based on latest relevant evidence timestamp
- **When** a custom historical date range is queried
- **Then** a calendar date being inside the nominal 90-day window does not guarantee every Topic from that date remains available
- **And** Topic availability remains governed by the Topic's authoritative retention boundary (`topics.retention_expires_at > NOW()` and `topics.status = 'ACTIVE'`).

### 5. Fixed-District Tenancy & Mahalla Filter Control (AC 5)
- **Given** the Mahalla filter control is used
- **When** the Hokim opens and modifies the Mahalla selection
- **Then** the selection permits either all permitted Mahallas (`Барча маҳаллалар`) or one single selected Mahalla strictly within the authenticated Hokim's fixed District
- **And** no Mahalla outside the Hokim's District can be queried, exposed, or listed in the dropdown
- **And** the list of selectable Mahallas is derived authoritatively from the Hokim's District (`district_telegram_groups` and active `topics`), filtered to exclude empty/whitespace values, and sorted alphabetically with Uzbek Cyrillic collation (`uz-Cyrl`).

### 6. Lane Multi-Select Control (`Йўналишлар: N/5`), Non-Zero Invariant & Canonical Order (AC 6)
- **Given** the Lane filter control is used
- **When** the Hokim selects or toggles Lane visibility
- **Then** one or more of the five fixed Lanes can be active simultaneously (`HOKIM_RELATED`, `WATER`, `ELECTRICITY`, `GAS`, `WASTE`)
- **And** selecting zero Lanes is strictly prevented (unchecking the sole remaining selected Lane is disabled/disallowed)
- **And** the toolbar button exposes the summary label `Йўналишлар: N/5` (e.g. `Йўналишлар: 5/5` or `Йўналишлар: 3/5`)
- **And** a `Барчасини кўрсатиш` (Select All) action quickly activates all 5 Lanes
- **And** selected Lanes retain their fixed canonical display order (`HOKIM_RELATED` -> `WATER` -> `ELECTRICITY` -> `GAS` -> `WASTE`) and canonical Topic identity.

### 7. Unified Scope Application & AI Non-Re-execution Invariant (AC 7)
- **Given** date, Mahalla, and Lane criteria change
- **When** the new filter scope is successfully applied
- **Then** all affected Lane results use that same fixed-District scope
- **And** no AI relevance, Topic assignment, or summary projection is rerun to answer the historical or filtered query (queries read directly from existing durable database records and projections).

### 8. Unified Filter Reset (`Фильтрларни тозалаш`) & Scope Reversion (AC 8)
- **Given** any non-default date, Mahalla, or Lane criteria are currently active
- **When** the Hokim activates `Фильтрларни тозалаш` (Clear Filters)
- **Then** the filter scope resets immediately to default values: `Бугун`, all permitted Mahallas (`Барча маҳаллалар`), and all five Lanes (5/5)
- **And** the board revalidates the default scope in-place on the same dashboard without navigating to a separate route.

### 9. Narrow-Screen Responsive Filter Sheet (`Фильтрлар N`), Modal Overlay & Focus Management (AC 9)
- **Given** the dashboard is viewed on a narrow-screen / mobile viewport (< 1024px or 320 CSS px)
- **When** date, Mahalla, or Lane filtering is accessed
- **Then** the compact dashboard toolbar exposes the `Фильтрлар N` button (where `N` is the number of active non-default filter dimensions)
- **And** activating `Фильтрлар N` opens a modal filter sheet with a programmatic title (`Фильтрлар`), inert background, contained keyboard focus (focus trap), visible Close/Cancel control, and Escape dismissal
- **And** the sheet exposes the exact same date, Mahalla, and Lane capabilities as the desktop layout without introducing a separate mobile filter model
- **And** closing or applying the sheet returns keyboard focus deterministically to the `Фильтрлар N` opener button
- **And** active filter criteria remain visibly summarized after the sheet closes.

### 10. Requested vs. Applied Scope State Machine & Failure Isolation (AC 10)
- **Given** the Hokim requests new date, Mahalla, or Lane criteria
- **When** that requested scope is in flight or fails before becoming successfully applied
- **Then** failure is not converted into a false zero or filtered-empty result
- **And** the last successful permitted results remain visible on the board (`placeholderData: keepPreviousData`)
- **And** the newly requested criteria remain visibly distinguishable as requested but not yet successfully applied (e.g. pending transition indicator / error banner)
- **And** prior results are not falsely represented as matching the failed request
- **And** a scoped sanitized error banner with safe `Қайта уриниш` (Retry) is presented.

### 11. Failed Request State Recovery, Reload Non-Persistence & Retry Promotion (AC 11)
- **Given** requested filter criteria failed and never became applied
- **When** the dashboard is reloaded, reconstructed, or restores ordinary dashboard state
- **Then** the last successfully applied non-sensitive date/Mahalla/Lane scope is restored rather than the failed requested values
- **And** failed requested criteria are not persisted as authoritative scope
- **And** when a failed requested filter scope later succeeds on retry, those criteria become the new successfully applied scope and replace the preceding scope.

### 12. Filtered Empty State (`Танланган шартлар бўйича мавзулар топилмади`) vs. Legitimate Zero (AC 12)
- **Given** a successfully applied filter result contains zero canonical Topics across all selected Lanes
- **When** the board renders
- **Then** the board displays the standard filtered-empty message: `Танланган шартлар бўйича мавзулар топилмади` with a direct `Фильтрларни тозалаш` action
- **And** selected Lane headers remain visible, with individually empty lanes showing `Мос мавзу топилмади`
- **And** a failed request is never presented with that legitimate-zero copy.

### 13. Evidence Detail Context Preservation & Filtered Drawer Navigation (AC 13)
- **Given** Topic Evidence Detail is opened for Topic A from a filtered dashboard result
- **When** the Hokim reviews evidence and returns to the dashboard (or closes the drawer)
- **Then** the active successfully applied filter scope, board position, and Lane review context are strictly preserved
- **And** subsequent background or manual refreshes use that successfully applied filter scope rather than reverting to defaults or obsolete scopes.

### 14. Responsive Typography, 200% Zoom, Touch Targets & Reduced Motion (AC 14)
- **Given** the dashboard is used at supported responsive widths, 200% browser zoom, approximately 320 CSS pixels, keyboard navigation, or `prefers-reduced-motion: reduce`
- **When** filters and Lane selection controls are operated
- **Then** all filter controls remain accessible with minimum 44px touch targets (`controlHeight: 44`), visible focus outlines (`#0284C7`), and non-color-only state indicators
- **And** Uzbek Cyrillic text and labels (`Ў ў Қ қ Ғ ғ Ҳ ҳ`) do not clip, truncate unpredictably, or overlap adjacent controls
- **And** under reduced motion, filter sheet animations, dropdown transitions, and date picker animations are immediate.

### 15. Privacy-Safe URL Search Parameter Synchronization (AC 15)
- **Given** non-default filter criteria are applied
- **When** URL synchronization occurs
- **Then** non-sensitive filter keys (`dateScope`, `dateFrom`, `dateTo`, `mahalla`, `lanes`) are reflected in browser URL search parameters (e.g. `?dateScope=yesterday` or `?dateScope=custom&dateFrom=2026-08-01&dateTo=2026-08-15&mahalla=Navro'z&lanes=WATER,GAS`)
- **And** default criteria (`dateScope=today`, all Mahallas, all 5 Lanes) omit query parameters to keep clean URLs (`/topics`)
- **And** raw resident evidence, search terms, personal identities, credentials, and secrets remain strictly excluded from browser URLs, history entries, and telemetry.

### 16. Verification Envelope & 2-Second Performance SLA (AC 16)
- **Given** Story 3.4 is verified under the approved production-shaped test envelope
- **When** integration, web unit, and component checks run
- **Then** date, Mahalla, and Lane filter changes return updated results within 2 seconds for at least 95% of requests under the approved design envelope
- **And** test suites verify full 90-day retention boundaries, `Asia/Tashkent` calendar calculations, non-zero Lane multi-select validation, requested vs. applied state transitions, and responsive filter sheet accessibility.

---

## Tasks / Subtasks

- [x] **Task 1: Shared API Contracts & Zod Query Schemas** (AC: 1, 2, 3, 5, 6, 15)
  - [x] 1.1 In `packages/api-contracts/src/topics.ts`:
    - Define `DateFilterScopeSchema = z.enum(['today', 'yesterday', 'custom'])` and export `DateFilterScope` type.
    - Implement `LanesQueryParamSchema` with `z.preprocess()` to robustly parse comma-separated strings (`"WATER,GAS"`), array inputs, or single strings into `QualifyingLane[]`, validating `.min(1).max(5)`:
      ```typescript
      export const LanesQueryParamSchema = z.preprocess((val) => {
        if (val === undefined || val === null || val === '') return undefined;
        if (typeof val === 'string') return val.split(',').map((s) => s.trim()).filter(Boolean);
        if (Array.isArray(val)) {
          return val
            .flatMap((item) => (typeof item === 'string' ? item.split(',') : item))
            .map((s) => (typeof s === 'string' ? s.trim() : s))
            .filter(Boolean);
        }
        return val;
      }, z.array(QualifyingLaneSchema).min(1, 'Камида 1 та йўналиш танланиши керак').max(5, 'Кўпи билан 5 та йўналиш танланиши мумкин').optional());
      ```
    - Extend `HokimTopicBoardQuerySchema`:
      - `dateScope: DateFilterScopeSchema.default('today')`
      - `dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD форматида бўлиши керак').optional()`
      - `dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD форматида бўлиши керак').optional()`
      - `mahallaName: z.string().trim().min(1).optional()`
      - `lanes: LanesQueryParamSchema`
      - `calendarDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()`
      - `baselineTimestamp: z.string().datetime().optional()`
    - Add `.superRefine` cross-field validation to `HokimTopicBoardQuerySchema` and `HokimLaneQuerySchema`:
      - When `dateScope === 'custom'`, `dateFrom` and `dateTo` are required, and `dateFrom <= dateTo`.
    - Extend `HokimLaneQuerySchema`:
      - `lane: QualifyingLaneSchema`
      - `dateScope: DateFilterScopeSchema.default('today')`
      - `dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()`
      - `dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()`
      - `mahallaName: z.string().trim().min(1).optional()`
      - `calendarDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()`
      - `cursor: z.string().optional()`
      - `limit: z.coerce.number().int().min(1).max(100).default(20)`
      - `baselineTimestamp: z.string().datetime().optional()`
    - Define `HokimMahallasResponseSchema = z.object({ mahallas: z.array(z.string()) })` and export `HokimMahallasResponse` type.

- [x] **Task 2: Backend Hokim Topic Service Filter Queries & 90-Day Boundary Validation** (AC: 1, 2, 3, 4, 5, 6, 7)
  - [x] 2.1 In `apps/backend/src/modules/topics/hokim-topic-service.ts`:
    - Define filter options interfaces:
      ```typescript
      export interface HokimTopicBoardFilterParams {
        dateScope?: 'today' | 'yesterday' | 'custom';
        dateFrom?: string;
        dateTo?: string;
        mahallaName?: string;
        lanes?: QualifyingLane[];
        calendarDay?: string;
        baselineTimestamp?: string;
      }

      export interface HokimLaneQueryParams {
        lane: QualifyingLane;
        dateScope?: 'today' | 'yesterday' | 'custom';
        dateFrom?: string;
        dateTo?: string;
        mahallaName?: string;
        calendarDay?: string;
        cursor?: string;
        limit?: number;
        baselineTimestamp?: string;
      }
      ```
    - Implement date boundary derivation helper:
      - Calculate today and yesterday in `Asia/Tashkent` using `getTashkentCalendarDay`.
      - Calculate 90-day retention lower bound (`today - 90 days` in `Asia/Tashkent`).
      - Validate `dateFrom >= retentionLowerBound` and `dateTo <= today`; reject invalid dates with explicit Uzbek error message.
    - Update `getTodayBoard` to accept `HokimTopicBoardFilterParams`:
      - Determine active lanes: use `params.lanes` (filtered subset in canonical order) or default to `CANONICAL_LANES` (all 5).
      - Query only requested lanes in parallel via `queryLaneData` and `countLaneTopics`.
    - Update `queryLaneData` and `countLaneTopics`:
      - Build SQL date filter:
        - `dateScope === 'today'`: `t.calendar_day = ${todayCalendarDay}`
        - `dateScope === 'yesterday'`: `t.calendar_day = ${yesterdayCalendarDay}`
        - `dateScope === 'custom'`: `t.calendar_day >= ${dateFrom} AND t.calendar_day <= ${dateTo}`
        - Fallback: if `params.calendarDay` is provided, `t.calendar_day = ${params.calendarDay}`.
      - Build SQL Mahalla filter: if `mahallaName` is provided, add `AND t.mahalla_name = ${mahallaName}`.
      - Ensure active retention check: `AND t.status = 'ACTIVE' AND t.retention_expires_at > NOW()`.
    - Implement `getDistrictMahallas(actorContext)`:
      - Query distinct `mahalla_name` from `district_telegram_groups` where `district_id = actorContext.districtId` and `status != 'FAILED'`, union with distinct `mahalla_name` from `topics` where `district_id = actorContext.districtId`.
      - Filter out null, empty, or whitespace-only names and trim values.
      - Sort Mahalla names alphabetically using Uzbek Cyrillic collation (`a.localeCompare(b, 'uz-Cyrl', { sensitivity: 'base' })`).

- [x] **Task 3: Backend Hokim Topics Route Handlers & Route Registration** (AC: 5, 15)
  - [x] 3.1 In `apps/backend/src/modules/topics/hokim-topics-routes.ts`:
    - Register `GET /api/v1/hokim/topics/mahallas`:
      - Guard with `createRequireHokim(db)`.
      - Call `topicService.getDistrictMahallas(req.actor)`.
      - Return HTTP 200 `{ mahallas: string[] }`.
    - Update `GET /api/v1/hokim/topics/board` handler to parse extended `HokimTopicBoardQuerySchema` query parameters and pass to `topicService.getTodayBoard`.
    - Update `GET /api/v1/hokim/topics/lane` handler to parse extended `HokimLaneQuerySchema` query parameters and pass to `topicService.getLaneBatch`.

- [x] **Task 4: Web API Client & Mahallas Query Hook** (AC: 1, 5, 15)
  - [x] 4.1 In `apps/web/src/topics/hokim-topics-client.ts`:
    - Update `getTodayBoard(params?: HokimTopicBoardFilterParams, signal?: AbortSignal)` to serialize query params: `dateScope`, `dateFrom`, `dateTo`, `mahallaName`, `lanes` (comma-separated), `calendarDay`, `baselineTimestamp`.
    - Update `getLaneBatch(params: HokimLaneQueryParams, signal?: AbortSignal)` to serialize filter params: `lane`, `dateScope`, `dateFrom`, `dateTo`, `mahallaName`, `calendarDay`, `cursor`, `limit`, `baselineTimestamp`.
    - Implement `getDistrictMahallas(signal?: AbortSignal): Promise<string[]>` calling `GET /api/v1/hokim/topics/mahallas`.
  - [x] 4.2 In `apps/web/src/topics/useDistrictMahallas.ts` (NEW):
    - Create TanStack Query hook `useDistrictMahallas()`:
      - `queryKey: ['district-mahallas', districtId]`
      - `staleTime: 15 * 60 * 1000` (15 minutes cache).
      - Returns `{ mahallas: string[], isLoading: boolean, isError: boolean }`.

- [x] **Task 5: URL Search Parameter Synchronization & Dashboard Filter Hook** (AC: 1, 8, 10, 11, 15)
  - [x] 5.1 In `apps/web/src/hooks/useDashboardFilterParams.ts` (NEW):
    - Implement hook using `useSearchParams` from `react-router-dom`:
      - Derive active filter state directly from URL search params via `useMemo`:
        - `dateScope`: `'today' | 'yesterday' | 'custom'` (default `'today'`).
        - `dateFrom`, `dateTo`: optional YYYY-MM-DD strings.
        - `mahallaName`: optional string (omitted if 'all' or empty).
        - `lanes`: array of `QualifyingLane` (defaults to all 5 canonical lanes; sanitizes invalid values).
      - Provide `setFilters(filters: Partial<DashboardFilterState>)`:
        - Update URL query params with `{ replace: true }`.
        - Cleanly omit default parameters (`dateScope=today`, empty mahalla, all 5 lanes) to preserve clean `/topics` URL.
      - Provide `resetFilters()`: resets URL search params cleanly to empty query string.
      - Guard: ensure search terms, personal data, and evidence text are never serialized to URL.
  - [x] 5.2 In `apps/web/src/topics/useHokimTopicBoard.ts`:
    - Integrate TanStack Query v5 state preservation:
      - `queryKey: ['hokim-board', districtId, appliedFilters]`
      - `placeholderData: keepPreviousData` (preserves visible board cards during filter transition).
      - Wire `AbortSignal` to cancel stale in-flight requests on rapid filter switching.
    - Update `loadMore(lane: QualifyingLane)`:
      - Pass `appliedFilters` (`dateScope`, `dateFrom`, `dateTo`, `mahallaName`) to `hokimTopicsClient.getLaneBatch`.
    - Expose state flags:
      - `isFilterTransitioning`: `query.isFetching && query.isPlaceholderData`.
      - `isBackgroundRefreshing`: `query.isFetching && !query.isPlaceholderData && !query.isLoading`.
      - `filterError`: captures failure of a requested filter query.
      - Actions: `applyFilters(newFilters)`, `resetFilters()`, `retryFilter()`.

- [x] **Task 6: Desktop Filter Bar Component & Sub-Controls** (AC: 1, 2, 3, 5, 6, 8, 14)
  - [x] 6.1 In `apps/web/src/components/topics/DateScopeSelect.tsx` (NEW):
    - Ant Design `Radio.Group` / `Segmented` for `Бугун`, `Кеча`, `Сана бўйича`.
    - When `Сана бўйича` is chosen, render AntD `DatePicker.RangePicker`:
      - Configured with `Asia/Tashkent` calendar formatting (`DD.MM.YYYY`).
      - `disabledDate`, `minDate`, `maxDate`: restrict selection to 90-day retention window (`today - 90 days` to `today`).
      - 44px touch targets (`controlHeight: 44`), zero box-shadows.
  - [x] 6.2 In `apps/web/src/components/topics/MahallaSelect.tsx` (NEW):
    - Ant Design `Select` dropdown with search capability.
    - Options: `Барча маҳаллалар` (value: `all`) followed by sorted list from `useDistrictMahallas`.
    - Accessible aria-label: `Маҳалла бўйича фильтр`, 44px touch target, zero box-shadows.
  - [x] 6.3 In `apps/web/src/components/topics/LaneMultiSelect.tsx` (NEW):
    - Ant Design `Dropdown` / `Popover` triggered by button: `Йўналишлар: N/5` with `DownOutlined` icon.
    - Content:
      - 5 Checkbox items for each lane with lane-specific color dots/labels.
      - Non-zero invariant: when only 1 lane remains checked, its checkbox is disabled (cannot uncheck to 0).
      - `Барчасини кўрсатиш` link/button to check all 5 lanes.
  - [x] 6.4 In `apps/web/src/components/topics/FilterBar.tsx` (NEW):
    - Desktop sticky filter container positioned below `BoardToolbar`:
      - Background `#FFFFFF` or `#F4F6F8`, border `#E2E8F0`, zero box-shadows.
      - Renders `DateScopeSelect`, `MahallaSelect`, `LaneMultiSelect`.
      - Renders `Фильтрларни тозалаш` button when any non-default filter is active.
      - Visual indicator when requested filters are loading.

- [x] **Task 7: Narrow-Screen Responsive Filter Sheet & Mobile Toolbar Integration** (AC: 9, 14)
  - [x] 7.1 In `apps/web/src/components/topics/FilterModalSheet.tsx` (NEW):
    - Responsive modal sheet for viewports < 1024px:
      - Ant Design `Modal` or full-screen drawer with `role="dialog"`, `aria-modal="true"`, `aria-labelledby="filter-sheet-title"`.
      - Programmatic header: `Фильтрлар`.
      - Accessible focus trap, Escape key handling, and Close (`Бекор қилиш` / `CloseOutlined`) button.
      - Stacks Date, Mahalla, and Lane controls vertically with minimum 44px touch targets.
      - Primary footer button: `Қўллаш` (Apply) which applies pending changes and closes sheet.
      - Returns focus deterministically to `Фильтрлар N` trigger button on close.
  - [x] 7.2 In `apps/web/src/components/topics/BoardToolbar.tsx`:
    - At viewports < 1024px, render compact `Фильтрлар N` button (where `N` is active non-default filter count).
    - Clicking opens `FilterModalSheet`.

- [x] **Task 8: Filtered Board Layout, Empty State & Error Boundary Handling** (AC: 1, 6, 7, 8, 10, 11, 12)
  - [x] 8.1 In `apps/web/src/components/topics/FiveLaneBoard.tsx`:
    - Accept `activeLanes: QualifyingLane[]` prop and render only selected lanes in canonical order (`HOKIM_RELATED` → `WATER` → `ELECTRICITY` → `GAS` → `WASTE`).
    - If total topics across all active lanes is 0 and non-default filters are active:
      - Render empty state card: `Танланган шартлар бўйича мавзулар топилмади` with `Фильтрларни тозалаш` action button.
    - For individually empty active lanes, render lane header and `Мос мавзу топилмади` placeholder.
  - [x] 8.2 In `apps/web/src/pages/HokimDashboardPage.tsx`:
    - Mount `FilterBar` (desktop) and `FilterModalSheet` (mobile).
    - Wire `useDashboardFilterParams` with `useHokimTopicBoard`.
    - If filter revalidation fails while previous board data is present:
      - Keep previous board visible (`placeholderData: keepPreviousData`).
      - Display scoped top warning alert: `Танланган фильтрлар бўйича маълумотларни юклаб бўлмади` with `Қайта уриниш` button.

- [x] **Task 9: Comprehensive Automated Vitest & Integration Test Coverage** (AC: 1-16)
  - [x] 9.1 Backend integration tests in `apps/backend/tests/integration/hokim-topics-filter.test.ts` (NEW):
    - Test `GET /api/v1/hokim/topics/board` with `dateScope=today`, `dateScope=yesterday`, `dateScope=custom` (single day & multi-day ranges).
    - Test 90-day retention boundary enforcement (reject dates > 90 days ago).
    - Test Mahalla filtering and tenant isolation (cannot query other districts' mahallas).
    - Test Lane multi-select filtering (`lanes=WATER,GAS`) returns only requested lanes.
    - Test `GET /api/v1/hokim/topics/mahallas` returns distinct, sorted district mahallas.
  - [x] 9.2 Web unit & component tests in `apps/web/src/topics/__tests__/useHokimTopicBoard.filter.test.ts`, `apps/web/src/hooks/__tests__/useDashboardFilterParams.test.ts`, `apps/web/src/components/topics/__tests__/FilterBar.test.tsx`, `apps/web/src/components/topics/__tests__/FilterModalSheet.test.tsx` (NEW):
    - Test filter state machine: requested vs applied state separation and retry promotion.
    - Test non-zero lane selection invariant (cannot uncheck to 0 lanes).
    - Test URL parameter synchronization and clean default omission.
    - Test `Фильтрларни тозалаш` resets all filters to defaults.
    - Test mobile filter modal sheet focus trapping, Escape key, and focus return.
    - Test filtered empty state rendering vs failed request error banner.

### Review Findings

- [x] [Review][Patch] Fix premature URL search param mutation on filter change to ensure failed requests do not persist on reload [apps/web/src/hooks/useDashboardFilterParams.ts:90-151, apps/web/src/pages/HokimDashboardPage.tsx:30-55]
- [x] [Review][Patch] Fix stale topic card retention in `useHokimTopicBoard` by guarding reconciliation effect against placeholder data [apps/web/src/topics/useHokimTopicBoard.ts:55-61, 156-196]
- [x] [Review][Patch] Preserve visible lane headers and empty lane cards in `FiveLaneBoard` when filtered result has 0 total topics [apps/web/src/components/topics/FiveLaneBoard.tsx:91-153]
- [x] [Review][Patch] Support multi-day date range strings (`..`) in `checkProcessingDelay` and `formatTashkentCalendarDate` [apps/backend/src/modules/topics/hokim-topic-service.ts:310-335, apps/web/src/lib/formatters.ts:75-91]
- [x] [Review][Patch] Remove non-zero box-shadow in `LaneMultiSelect` popover container to adhere to Ant Design 5 tokens [apps/web/src/components/topics/LaneMultiSelect.tsx:131]
- [x] [Review][Patch] Enforce 44px WCAG AA touch targets and add reduced motion support to filter modal sheet and bar controls [apps/web/src/components/topics/FilterModalSheet.tsx:242,250, apps/web/src/components/topics/FilterBar.tsx]
- [x] [Review][Patch] Anchor calendar calculations in `DateScopeSelect` to `Asia/Tashkent` calendar day to eliminate client OS timezone skew [apps/web/src/components/topics/DateScopeSelect.tsx:24-40, apps/web/src/lib/formatters.ts]
- [x] [Review][Patch] Standardize action button labels to `Барчасини кўрсатиш` (AC 6) and `Фильтрларни тозалаш` (AC 8) [apps/web/src/components/topics/LaneMultiSelect.tsx:72, apps/web/src/components/topics/FilterModalSheet.tsx:168,237]
- [x] [Review][Patch] Filter topics in `getDistrictMahallas` for `status = 'ACTIVE' AND retention_expires_at > NOW()` [apps/backend/src/modules/topics/hokim-topic-service.ts:575-577]
- [x] [Review][Patch] Add future date upper bound check (`calendarDay <= today`) in `resolveDateBoundary` [apps/backend/src/modules/topics/hokim-topic-service.ts:92-100]
- [x] [Review][Patch] Deduplicate lane query parameters and guard against empty comma strings in `LanesQueryParamSchema` [packages/api-contracts/src/topics.ts:53-63]
- [x] [Review][Patch] Fix stale closure in `useDashboardFilterParams.setFilters` by calculating state from functional updater `prev` search params [apps/web/src/hooks/useDashboardFilterParams.ts:90-151]
- [x] [Review][Defer] N+1 SQL queries and duplicate count queries per board load [apps/backend/src/modules/topics/hokim-topic-service.ts:160-200] — deferred, pre-existing
- [x] [Review][Defer] Unchecked `req.actor` cast in Fastify route handlers [apps/backend/src/modules/topics/hokim-topics-routes.ts:40,84,136] — deferred, pre-existing

---

## Dev Notes

### 1. Architectural Guidelines & Invariants Compliance
- **AD-03 & AD-04 (PostgreSQL System of Record & Drizzle ORM)**:
  - All filtering queries execute via parameterized SQL against PostgreSQL on `topics`, `topic_projections`, and `accepted_evidence`.
  - Date filtering applies `t.calendar_day` index lookups (`topics_district_mahalla_day_idx`).
  - Active retention boundaries (`t.status = 'ACTIVE' AND t.retention_expires_at > NOW()`) are strictly enforced in SQL queries.
  - All automated backend tests execute strictly on isolated test database `mahalla_ovozi_test`.
- **AD-09 (Tenant Isolation & Authorization)**:
  - Hokim accounts are strictly bound to `actorContext.districtId`.
  - Mahalla list query and filter queries enforce `WHERE district_id = actorContext.districtId`.
- **AD-10 (Same-Origin REST Contracts & Fastify Zod Validation)**:
  - Extended query schemas are defined in `@mahalla-ovozi/api-contracts` and validated at route boundaries with Zod.
  - `LanesQueryParamSchema` uses `z.preprocess()` to robustly handle comma-separated strings or arrays.
  - Sub-day/hourly filters are strictly disallowed and rejected with `VALIDATION_ERROR`.
- **UX & Design System Compliance (`DESIGN.md` & `EXPERIENCE.md`)**:
  - Unified in-place filtering on the 5-lane board (no separate history page).
  - Uzbek Cyrillic typography and labels (`Бугун`, `Кеча`, `Сана бўйича`, `Барча маҳаллалар`, `Йўналишлар: N/5`, `Фильтрларни тозалаш`, `Танланган шартлар бўйича мавзулар топилмади`).
  - Strict zero box-shadows (`boxShadow: 'none'`), `#0284C7` primary brand, `#F4F6F8` surface.
  - 44px WCAG AA touch targets (`controlHeight: 44`).
  - Modal filter sheet on narrow viewports with focus trapping and return focus.
  - URL parameter synchronization excludes search text, evidence quotes, and credentials.

### 2. Source Tree Components to Touch

| Status | File Path | Responsibility / Behavior Modification |
| :--- | :--- | :--- |
| **UPDATE** | [`packages/api-contracts/src/topics.ts`](file:///c:/codevision-works/mahalla-ovozi-trial-2/packages/api-contracts/src/topics.ts) | Add `DateFilterScopeSchema`, `LanesQueryParamSchema`, extend `HokimTopicBoardQuerySchema`, `HokimLaneQuerySchema`, export `HokimMahallasResponseSchema`. |
| **UPDATE** | [`apps/backend/src/modules/topics/hokim-topic-service.ts`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/backend/src/modules/topics/hokim-topic-service.ts) | Implement date range, Mahalla, and Lane filtering SQL builders, 90-day retention validation, and `getDistrictMahallas` with Uzbek collation. |
| **UPDATE** | [`apps/backend/src/modules/topics/hokim-topics-routes.ts`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/backend/src/modules/topics/hokim-topics-routes.ts) | Register `GET /api/v1/hokim/topics/mahallas` route, parse and forward extended filter parameters. |
| **UPDATE** | [`apps/web/src/topics/hokim-topics-client.ts`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/src/topics/hokim-topics-client.ts) | Support filter query parameters in `getTodayBoard` and `getLaneBatch`, add `getDistrictMahallas`. |
| **UPDATE** | [`apps/web/src/topics/useHokimTopicBoard.ts`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/src/topics/useHokimTopicBoard.ts) | Implement TanStack Query v5 `placeholderData: keepPreviousData`, `queryKey` filter syncing, `loadMore` filter forwarding, reset action, and retry handling. |
| **UPDATE** | [`apps/web/src/components/topics/BoardToolbar.tsx`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/src/components/topics/BoardToolbar.tsx) | Add mobile `Фильтрлар N` button opening responsive filter sheet. |
| **UPDATE** | [`apps/web/src/components/topics/FiveLaneBoard.tsx`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/src/components/topics/FiveLaneBoard.tsx) | Render active lane subset in canonical order, show filtered empty state message `Танланган шартлар бўйича мавзулар топилмади`. |
| **UPDATE** | [`apps/web/src/pages/HokimDashboardPage.tsx`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/src/pages/HokimDashboardPage.tsx) | Mount desktop `FilterBar` and mobile `FilterModalSheet`, wire URL parameter synchronization. |
| **NEW** | `apps/web/src/topics/useDistrictMahallas.ts` | Query hook for fetching and caching district Mahalla list. |
| **NEW** | `apps/web/src/hooks/useDashboardFilterParams.ts` | Bidirectional URL search parameter synchronization hook. |
| **NEW** | `apps/web/src/components/topics/FilterBar.tsx` | Desktop filter bar containing Date, Mahalla, Lane multi-select, and clear filters controls. |
| **NEW** | `apps/web/src/components/topics/DateScopeSelect.tsx` | Date scope control (`Бугун`, `Кеча`, `Сана бўйича` with 90-day bounded RangePicker). |
| **NEW** | `apps/web/src/components/topics/MahallaSelect.tsx` | Searchable Mahalla select dropdown (`Барча маҳаллалар` + district mahallas). |
| **NEW** | `apps/web/src/components/topics/LaneMultiSelect.tsx` | Lane multi-select dropdown (`Йўналишлар: N/5`, checkboxes, Select All, non-zero guard). |
| **NEW** | `apps/web/src/components/topics/FilterModalSheet.tsx` | Responsive modal filter sheet for mobile viewports with focus trapping. |
| **NEW** | `apps/backend/tests/integration/hokim-topics-filter.test.ts` | Integration tests for date range, 90-day retention, Mahalla, and Lane filtering. |
| **NEW** | `apps/web/src/topics/__tests__/useHokimTopicBoard.filter.test.ts` | Unit tests for filter state machine, requested vs applied separation, and retry promotion. |

### 3. File Behavior Preservation Details
- **`useHokimTopicBoard.ts`**: Must preserve Story 3.1 keyset pagination (`loadMore`) and Story 3.3 in-session reconciliation (`bufferedNewTopics`, `+N янги`, baseline preservation).
- **`TopicEvidenceDrawer.tsx`**: Must preserve non-modal complementary drawer behavior (`role="region"`, `mask={false}`, heading auto-focus, `useFocusFallback.ts`) from Story 3.2.
- **`BoardToolbar.tsx`**: Must preserve district name, formatted calendar date, freshness indicator, delay warning, and sign-out functionality from Story 3.3.
- **`FiveLaneBoard.tsx`**: Must preserve horizontal scroll and keyboard navigation across lanes.

### 4. References
- `_bmad-output/planning-artifacts/epics/epic-3.md#story-34-filter-current-and-retained-topics` (FR17)
- `_bmad-output/planning-artifacts/architecture/architecture-Mahalla-Ovozi-2026-08-12/ARCHITECTURE-SPINE.md#ad-03`
- `_bmad-output/planning-artifacts/architecture/architecture-Mahalla-Ovozi-2026-08-12/ARCHITECTURE-SPINE.md#ad-10`
- `_bmad-output/planning-artifacts/ux-designs/ux-Mahalla-Ovozi-2026-08-05/EXPERIENCE.md`
- `_bmad-output/planning-artifacts/ux-designs/ux-Mahalla-Ovozi-2026-08-05/DESIGN.md`
- `_bmad-output/implementation-artifacts/3-3-refresh-dashboard-without-disrupting-review.md`

---

## Dev Agent Record

### Agent Model Used
Gemini 3.7 Flash (High)

### Debug Log References
None

### Completion Notes List
- Comprehensive specification authored for Story 3.4 following the BMad Method.
- Mapped all 16 BDD acceptance criteria directly from `epic-3.md`, `ARCHITECTURE-SPINE.md`, and UX design documents.
- Detailed task breakdowns covering `@mahalla-ovozi/api-contracts`, backend service & route extensions, web client hooks, URL search params synchronization, desktop `FilterBar`, mobile `FilterModalSheet`, and automated Vitest/integration suites.
- Strict anti-pattern prevention: no separate History page, no hourly/sub-day filters, no 0-lane selection, no false zero boards on error, and no resident text in URLs.
- Completed adversarial review and Current-Data Verification against Ant Design 5.x, TanStack Query 5.x, Fastify 5.x, and React Router 7.x best practices.

### File List
- `packages/api-contracts/src/topics.ts`
- `apps/backend/src/modules/topics/hokim-topic-service.ts`
- `apps/backend/src/modules/topics/hokim-topics-routes.ts`
- `apps/web/src/topics/hokim-topics-client.ts`
- `apps/web/src/topics/useHokimTopicBoard.ts`
- `apps/web/src/topics/useDistrictMahallas.ts`
- `apps/web/src/hooks/useDashboardFilterParams.ts`
- `apps/web/src/components/topics/BoardToolbar.tsx`
- `apps/web/src/components/topics/FiveLaneBoard.tsx`
- `apps/web/src/components/topics/FilterBar.tsx`
- `apps/web/src/components/topics/DateScopeSelect.tsx`
- `apps/web/src/components/topics/MahallaSelect.tsx`
- `apps/web/src/components/topics/LaneMultiSelect.tsx`
- `apps/web/src/components/topics/FilterModalSheet.tsx`
- `apps/web/src/pages/HokimDashboardPage.tsx`
- `apps/backend/tests/integration/hokim-topics-filter.test.ts`
- `apps/web/src/topics/__tests__/useHokimTopicBoard.filter.test.ts`

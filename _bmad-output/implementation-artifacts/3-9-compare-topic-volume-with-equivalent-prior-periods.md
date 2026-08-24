---
baseline_commit: 3a81063
---

# Story 3.9: Compare Topic Volume With Equivalent Prior Periods

Status: done

<!-- Note: Validation completed. Ready for dev-story. -->

## Story

As the **Hokim**,
I want the unique-Topic statistic to compare equivalent time periods when the retained data supports a truthful comparison,
so that I can understand change over time without invented or mismatched historical baselines.

---

## Acceptance Criteria

### 1. Today Scope (`Бугун`) Equivalent Partial-Day Comparison & Authoritative Server Evaluation Cutoff (AC 1)
- **Given** `Бугун` is the active date scope with all five Lanes selected (`lanes` is omitted or contains all 5 canonical lanes) and settled plain-text search is empty
- **When** the Card 1 (`Жами мавзулар`) prior-period comparison is calculated
- **Then** the current comparison interval is today `00:00:00` through the server evaluation timestamp `serverEvaluatedAt` (`asOf`) in `Asia/Tashkent` timezone (UTC+5)
- **And** the equivalent preceding interval is yesterday `00:00:00` through the exact same `Asia/Tashkent` clock time cutoff (e.g. if `asOf` is `16:30:00+05:00`, yesterday's cutoff is `16:30:00+05:00` on yesterday's calendar day)
- **And** the browser client clock never advances or recalculates that comparison cutoff by itself
- **And** the active Mahalla criterion (`mahallaName`) applies equally to both the current and preceding comparison intervals.

### 2. Historical Topic Membership Determination by Earliest Retained Accepted Evidence Timestamp (AC 2)
- **Given** yesterday's partial-day Topic membership is evaluated for the exact comparison interval
- **When** determining whether a retained historical canonical Topic existed within the preceding interval (yesterday `00:00:00` through yesterday `cutoff`)
- **Then** the Topic qualifies if and only if its **earliest retained Accepted Evidence original Telegram timestamp** (`MIN(ae.original_timestamp)`) is at or before the comparison cutoff on that Topic's `Asia/Tashkent` calendar day:
  ```sql
  EXISTS (
    SELECT 1 FROM accepted_evidence ae
    WHERE ae.topic_id = t.id
      AND ae.district_id = $districtId
      AND ae.calendar_day = $yesterdayCalendarDay
      AND ae.original_timestamp <= $yesterdayCutoffTimestamp
  )
  ```
- **And** processing, retry, worker execution, or AI completion timestamps (`ae.created_at`, `t.created_at`, `tp.created_at`) are **strictly never substituted** for the original Telegram message timestamp (`ae.original_timestamp`)
- **And** each matching canonical Topic contributes at most once to the prior-period total regardless of its number of evidence records or Lane memberships.

### 3. Today Scope Unavailability Under Lane Subset or Active Plain-Text Search (AC 3)
- **Given** `Бугун` is the active date scope
- **When** either a subset of Lanes is selected (e.g. only 1, 2, 3, or 4 lanes selected) OR settled plain-text search is non-empty (`search.trim().length > 0`)
- **When** Card 1 is rendered
- **Then** the primary unique-Topic value (`statistics.totalUniqueTopics`) continues to follow the complete active dashboard filter and search scope
- **But** the equivalent prior-period comparison is marked and rendered as **unavailable** (`isAvailable: false`, `reason: 'UNSUPPORTED_FILTER_SCOPE'`) rather than approximated
- **And** the backend and frontend do not reconstruct, interpolate, or pretend to know historical partial-day Topic-derived Lane categorization, AI summary, or plain-text search state that is not retained in database snapshots.

### 4. Complete Historical Single-Day Comparison (`Кеча` / Specific Retained Day) (AC 4)
- **Given** a complete historical single-day scope such as `Кеча` (`dateScope === 'yesterday'` or `calendarDay === 'YYYY-MM-DD'`)
- **When** prior-period comparison is calculated
- **Then** it compares against the immediately preceding complete `Asia/Tashkent` calendar day ($D - 1$, 00:00:00 through 23:59:59)
- **And** the exact same non-date filter criteria (Mahalla `mahallaName`, selected `lanes`, and plain-text `search`) apply to both days ($D$ and $D - 1$) because complete-day topic projections, lane memberships, summaries, and evidence are fully retained for completed historical days.

### 5. Custom Date Range Comparison of $N$ Contiguous Historical Days (AC 5)
- **Given** a completed custom date range of $N$ contiguous calendar days (`dateFrom` to `dateTo`, where $N = \text{diffDays}(dateFrom, dateTo) + 1$)
- **When** prior-period comparison is calculated
- **Then** it compares against the immediately preceding contiguous $N$ complete `Asia/Tashkent` calendar days:
  - Preceding interval end: `priorDateTo = dateFrom - 1 day`
  - Preceding interval start: `priorDateFrom = dateFrom - N days`
- **And** the exact same non-date criteria (Mahalla, Lanes, Search) apply to both $N$-day intervals
- **And** custom historical date ranges strictly do not include the in-progress `Бугун` (if `dateTo >= today`, prior-period comparison is returned as unavailable with `reason: 'UNSUPPORTED_FILTER_SCOPE'`, as Today is handled exclusively under AC 1 & AC 3).

### 6. 90-Day Retention Boundary Guard & Incomplete Data Handling (AC 6)
- **Given** any date scope (`Бугун`, `Кеча`, or `custom`)
- **When** the equivalent prior comparison period (or any part of it) falls outside the authoritative 90-day retention window (`priorDateFrom < retentionLowerBound` where `retentionLowerBound = today - 90 days`)
- **Then** the prior-period comparison is returned and displayed as **unavailable** (`isAvailable: false`, `reason: 'OUTSIDE_RETENTION_WINDOW'`)
- **And** the system strictly avoids calculating over a truncated partial period and **never treats missing or pruned historical data as zero (`0`)**.

### 7. Neutral, Non-Color-Only Trend Presentation & Accessibility Contract (AC 7)
- **Given** Card 1 renders on desktop, tablet, or mobile
- **When** prior-period comparison is available (`isAvailable: true`):
  - The card presents the delta and comparison reference text cleanly:
    - Delta format: `+N`, `-N`, or `0` (e.g. `+3`, `-2`, `0`)
    - Context label:
      - For `Бугун`: `кечаги шу вақтга нисбатан`
      - For `Кеча`: `олдинги кунга нисбатан`
      - For `custom`: `олдинги даврга нисбатан`
  - **Strict Neutrality Invariant**: Trend presentation is **strictly neutral and non-color-only**. No green (positive/good) or red (negative/bad) sentiment or service-quality colors are applied to volume changes (e.g., uses neutral slate/gray text `#475569` or `#64748B` with a subtle neutral pill `#F1F5F9`)
  - Direction and meaning are explicitly expressed in visible text and accessible labels:
    - Positive delta (+N): `Жами мавзулар: {N} та, танланган фильтр бўйича. Кечаги шу вақтга нисбатан {delta} та кўп (+{delta})`
    - Negative delta (-N): `Жами мавзулар: {N} та, танланган фильтр бўйича. Кечаги шу вақтга нисбатан {abs(delta)} та кам ({delta})`
    - Zero delta (0): `Жами мавзулар: {N} та, танланган фильтр бўйича. Кечаги шу вақтга нисбатан ўзгаришсиз (0)`
- **When** prior-period comparison is unavailable (`isAvailable: false`):
  - The card displays a neutral unavailable indicator (`Маълумот йўқ` / `—`) without error styling or broken layouts
  - Accessible announcement clarifies why comparison is not displayed:
    - Filter scope: `Жами мавзулар: {N} та, танланган фильтр бўйича. Таққослаш мавжуд эмас: барча йўналишлар танланмаган ёки қидирув фаол`
    - Retention window: `Жами мавзулар: {N} та, танланган фильтр бўйича. Таққослаш мавжуд эмас: 90 кунлик сақлаш муддатидан ташқарида`
- **And** Card 1 comparison sub-block reserves fixed height (`minHeight: 18px` / `marginTop: 4px`) to guarantee 0px cumulative layout shift (0px CLS) during filter transitions
- **And** Card 1 remains read-only and non-focusable (`tabIndex={-1}`), maintaining all Story 3.5 accessibility invariants.

### 8. Automated Integration & Unit Test Verification (AC 8)
- **Given** Story 3.9 is verified under the test suite
- **When** focused automated tests execute against the isolated test database `mahalla_ovozi_test` and Vitest component runners
- **Then** tests cover:
  1. Today `asOf` comparison interval with exact clock-time cutoff matching Asia/Tashkent time.
  2. Qualification by earliest retained Accepted Evidence original Telegram timestamp (`original_timestamp`) and rejection of Topics whose earliest evidence arrived after yesterday's cutoff.
  3. Strict exclusion of AI/worker execution timestamps (`created_at`) from cutoff decisions.
  4. Today scope comparison marked unavailable when $< 5$ lanes are selected.
  5. Today scope comparison marked unavailable when search query is non-empty.
  6. Yesterday complete-day comparison against $D - 1$ with identical Mahalla, Lane, and Search filters.
  7. Custom $N$-day range comparison against preceding contiguous $N$-day range.
  8. 90-day retention boundary guard marking comparison unavailable when prior period precedes the 90-day limit.
  9. Canonical Topic deduplication across multiple lanes in both current and prior periods.
  10. Strict tenant isolation (`district_id` guard) preventing cross-district leakage.
  11. Frontend neutral non-color-only rendering, delta formatting, unavailable pill states, and ARIA labels.

---

## Tasks / Subtasks

- [x] **Task 1: Shared API Contracts & Zod Schemas for Card 1 Prior-Period Comparison** (AC: 1-7)
  - [x] 1.1 In `packages/api-contracts/src/topics.ts`:
    - Define `TopicStatisticCard1ComparisonSchema`:
      ```ts
      export const TopicStatisticCard1ComparisonSchema = z.discriminatedUnion('isAvailable', [
        z.object({
          isAvailable: z.literal(true),
          previousValue: z.number().int().min(0),
          delta: z.number().int(),
          comparisonPeriodType: z.enum([
            'equivalent_same_time_yesterday',
            'previous_calendar_day',
            'previous_custom_range',
          ]),
          comparisonPeriodLabel: z.string(),
        }),
        z.object({
          isAvailable: z.literal(false),
          reason: z.enum([
            'UNSUPPORTED_FILTER_SCOPE',
            'OUTSIDE_RETENTION_WINDOW',
            'NO_PRIOR_PERIOD',
          ]),
        }),
      ]);
      export type TopicStatisticCard1Comparison = z.infer<typeof TopicStatisticCard1ComparisonSchema>;
      ```
    - Update `HokimTopicStatisticsResponseSchema`:
      - Add `card1Comparison: TopicStatisticCard1ComparisonSchema`
    - Export updated types `HokimTopicStatisticsResponse`.

- [x] **Task 2: Backend Prior-Period Computation in `HokimTopicService`** (AC: 1-6)
  - [x] 2.1 In `apps/backend/src/modules/topics/hokim-topic-service.ts`:
    - Implement helper `resolvePriorPeriodComparison(params, districtId, asOfDate, selectedLanes, trimmedSearch, mahallaPredicate, lanePredicate, searchPredicate)`:
      - Calculate `nowSeconds = Math.floor(asOfDate.getTime() / 1000)`, `today = getTashkentCalendarDay(nowSeconds)`, and `retentionLowerBound = getTashkentCalendarDay(nowSeconds - 90 * 86400)`.
      - **Case 1: `dateScope === 'today'` (or default today) OR `params.calendarDay === today`**:
        - Check if all 5 canonical lanes are selected (`selectedLanes.length === 5`) AND `!trimmedSearch`.
        - If not all 5 lanes or search active: return `{ isAvailable: false, reason: 'UNSUPPORTED_FILTER_SCOPE' }`.
        - Calculate yesterday cutoff timestamp: `yesterdayCutoffSeconds = nowSeconds - 86400`, `yesterdayCutoffDate = new Date(yesterdayCutoffSeconds * 1000)`, `yesterdayDay = getTashkentCalendarDay(yesterdayCutoffSeconds)`.
        - Check retention: if `yesterdayDay < retentionLowerBound`, return `{ isAvailable: false, reason: 'OUTSIDE_RETENTION_WINDOW' }`.
        - Build SQL query for yesterday partial-day topics matching earliest evidence original timestamp $\le$ `yesterdayCutoffDate`:
          ```sql
          SELECT COUNT(DISTINCT t.id)::int as prev_count
          FROM topics t
          WHERE t.district_id = ${districtId}
            AND t.status = 'ACTIVE'
            AND t.retention_expires_at > NOW()
            AND t.calendar_day = ${yesterdayDay}
            ${mahallaPredicate}
            AND EXISTS (
              SELECT 1 FROM accepted_evidence ae
              WHERE ae.topic_id = t.id
                AND ae.district_id = ${districtId}
                AND ae.calendar_day = ${yesterdayDay}
                AND ae.original_timestamp <= ${yesterdayCutoffDate}
            )
          ```
        - Compute delta: `totalUniqueTopics - prev_count`.
        - Return `{ isAvailable: true, previousValue: prev_count, delta, comparisonPeriodType: 'equivalent_same_time_yesterday', comparisonPeriodLabel: 'кечаги шу вақтга нисбатан' }`.
      - **Case 2: `dateScope === 'yesterday'` or `params.calendarDay < today` (Completed single day $D$)**:
        - Resolve target day string $D$ (if `yesterday`, $D = \text{getTashkentCalendarDay}(nowSeconds - 86400)$; if `calendarDay`, $D = params.calendarDay$).
        - Compute $D - 1$: `dSeconds = Math.floor(Date.parse(D + 'T12:00:00+05:00') / 1000)`, `priorDay = getTashkentCalendarDay(dSeconds - 86400)`.
        - Check retention: if `priorDay < retentionLowerBound`, return `{ isAvailable: false, reason: 'OUTSIDE_RETENTION_WINDOW' }`.
        - Query $D - 1$ complete day applying the same `mahallaPredicate`, `lanePredicate`, and `searchPredicate`:
          ```sql
          SELECT COUNT(DISTINCT t.id)::int as prev_count
          FROM topics t
          JOIN topic_projections tp ON tp.topic_id = t.id
          WHERE t.district_id = ${districtId}
            AND t.status = 'ACTIVE'
            AND t.retention_expires_at > NOW()
            AND t.calendar_day = ${priorDay}
            ${mahallaPredicate}
            AND (${lanePredicate})
            ${searchPredicate}
          ```
        - Return `{ isAvailable: true, previousValue: prev_count, delta: totalUniqueTopics - prev_count, comparisonPeriodType: 'previous_calendar_day', comparisonPeriodLabel: 'олдинги кунга нисбатан' }`.
      - **Case 3: `dateScope === 'custom'` (Completed $N$-day range)**:
        - Parse `dateFrom` and `dateTo`.
        - **Guard for in-progress Today**: If `dateTo >= today`, return `{ isAvailable: false, reason: 'UNSUPPORTED_FILTER_SCOPE' }` (in-progress Today cannot be truthfully compared against completed historical periods).
        - Compute $N = \text{diffDays}(dateFrom, dateTo) + 1$.
        - Compute `priorDateTo = format(dateFrom - 1 day)` and `priorDateFrom = format(dateFrom - N days)` using Tashkent midday math.
        - Check retention: if `priorDateFrom < retentionLowerBound`, return `{ isAvailable: false, reason: 'OUTSIDE_RETENTION_WINDOW' }`.
        - Query contiguous $N$-day range applying same `mahallaPredicate`, `lanePredicate`, and `searchPredicate`:
          ```sql
          SELECT COUNT(DISTINCT t.id)::int as prev_count
          FROM topics t
          JOIN topic_projections tp ON tp.topic_id = t.id
          WHERE t.district_id = ${districtId}
            AND t.status = 'ACTIVE'
            AND t.retention_expires_at > NOW()
            AND t.calendar_day >= ${priorDateFrom} AND t.calendar_day <= ${priorDateTo}
            ${mahallaPredicate}
            AND (${lanePredicate})
            ${searchPredicate}
          ```
        - Return `{ isAvailable: true, previousValue: prev_count, delta: totalUniqueTopics - prev_count, comparisonPeriodType: 'previous_custom_range', comparisonPeriodLabel: 'олдинги даврга нисбатан' }`.
    - [x] 2.2 Integrate prior-period calculation cleanly into `getStatistics(actorContext, params)` and assemble `card1Comparison` in response payload.

- [x] **Task 3: Web UI Component Enhancements for Card 1 Trend & Comparison Presentation** (AC: 1, 3, 7)
  - [x] 3.1 In `apps/web/src/components/topics/TopicStatisticCard.tsx`:
    - Add optional `comparison?: TopicStatisticCard1Comparison` prop.
    - Render comparison info in a dedicated, accessible, non-color-only sub-block:
      - If `comparison?.isAvailable`:
        - Delta badge: neutral background `#F1F5F9`, border `1px solid #E2E8F0`, text `#334155`, font-weight 600, tabular numbers.
        - Text label: `${comparison.delta > 0 ? `+${comparison.delta}` : comparison.delta} ${comparison.comparisonPeriodLabel}`.
        - ARIA label: Includes full descriptive phrasing (e.g. `${title}: ${value}, ${subtitle}. ${comparison.comparisonPeriodLabel} ${Math.abs(comparison.delta)} та ${comparison.delta > 0 ? 'кўп' : comparison.delta < 0 ? 'кам' : 'ўзгаришсиз'}`).
      - If `comparison && !comparison.isAvailable`:
        - Render neutral muted comparison status: `Таққослаш: Маълумот йўқ` (or `—`) with accessible reason tooltip / aria-label.
  - [x] 3.2 In `apps/web/src/components/topics/TopicStatisticsStrip.tsx`:
    - Pass `statistics?.card1Comparison` to Card 1 descriptor.
    - Verify loading skeleton reserves matching layout space without height jitter or cumulative layout shift (0px CLS).

- [x] **Task 4: Backend Automated Integration Tests** (AC: 1-6, 8)
  - [x] 4.1 In `apps/backend/tests/hokim-topics-statistics.test.ts` (or `hokim-topics-prior-period.test.ts`):
    - Test Today `asOf` comparison with all 5 lanes and empty search:
      - Insert topics yesterday with earliest evidence before yesterday cutoff -> counted in previous period.
      - Insert topics yesterday with earliest evidence after yesterday cutoff -> excluded from previous period.
      - Insert topics with only AI timestamp after cutoff but original evidence before cutoff -> correctly counted (proves original evidence timestamp used).
    - Test Today with subset of lanes (e.g. `WATER`, `GAS`) -> returns `isAvailable: false, reason: 'UNSUPPORTED_FILTER_SCOPE'`.
    - Test Today with non-empty search -> returns `isAvailable: false, reason: 'UNSUPPORTED_FILTER_SCOPE'`.
    - Test Yesterday scope comparison -> compares against $D - 1$ complete day.
    - Test Custom 3-day scope comparison -> compares against preceding contiguous 3-day range.
    - Test Custom date range ending on today (`dateTo >= today`) -> returns `isAvailable: false, reason: 'UNSUPPORTED_FILTER_SCOPE'`.
    - Test zero topics edge cases: current = 0 & prior = 0 (delta = 0), current = 5 & prior = 0 (delta = +5), current = 0 & prior = 5 (delta = -5).
    - Test 90-day retention boundary -> returns `isAvailable: false, reason: 'OUTSIDE_RETENTION_WINDOW'` when prior period starts $> 90$ days ago.
    - Test Mahalla filter applies equally to both current and prior periods.
    - Test canonical Topic multi-lane deduplication in prior period.
    - Test strict tenant isolation across districts.

- [x] **Task 5: Web Unit & Component Tests** (AC: 1, 3, 7, 8)
  - [x] 5.1 In `apps/web/tests/unit/TopicStatisticCard.test.tsx` (or `TopicStatisticsStrip.test.tsx`):
    - Test Card 1 rendering with positive delta (`+5`), negative delta (`-3`), and zero delta (`0`).
    - Test Card 1 rendering with `isAvailable: false` and reason `UNSUPPORTED_FILTER_SCOPE`.
    - Test Card 1 rendering with `isAvailable: false` and reason `OUTSIDE_RETENTION_WINDOW`.
    - Verify neutral styling: strict absence of green/red alert classes, presence of neutral slate tokens.
    - Verify screen reader accessible labels and `aria-label` text formatting.

### Review Findings

- [x] [Review][Patch] Fix historical `calendarDay` condition in `resolvePriorPeriodComparison` when `dateScope` defaults to `'today'` [`apps/backend/src/modules/topics/hokim-topic-service.ts:1066`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/backend/src/modules/topics/hokim-topic-service.ts#L1066)
- [x] [Review][Patch] Reserve fixed comparison height in `TopicStatisticCard` when `hasComparisonSlot` is true and `comparison` is undefined [`apps/web/src/components/topics/TopicStatisticCard.tsx:206-208`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/src/components/topics/TopicStatisticCard.tsx#L206-L208)
- [x] [Review][Defer] Card 5 single-mahalla mode fallback when district has 0 total mahallas [`apps/backend/src/modules/topics/hokim-topic-service.ts:932`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/backend/src/modules/topics/hokim-topic-service.ts#L932) — deferred, pre-existing
- [x] [Review][Defer] Untrimmed `mahalla_name` grouping in legacy statistics query [`apps/backend/src/modules/topics/hokim-topic-service.ts:804-820`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/backend/src/modules/topics/hokim-topic-service.ts#L804-L820) — deferred, pre-existing
- [x] [Review][Defer] Base accessible name concatenation spacing for Cards 2 and 3 [`apps/web/src/components/topics/TopicStatisticCard.tsx:85`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/src/components/topics/TopicStatisticCard.tsx#L85) — deferred, pre-existing
- [x] [Review][Defer] Mobile carousel scroll synchronization with index indicator [`apps/web/src/components/topics/TopicStatisticsStrip.tsx:215`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/src/components/topics/TopicStatisticsStrip.tsx#L215) — deferred, pre-existing
- [x] [Review][Defer] Query cache key serialization with unsorted lane arrays [`apps/web/src/topics/useTopicStatistics.ts:61`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/src/topics/useTopicStatistics.ts#L61) — deferred, pre-existing
- [x] [Review][Defer] Premature clear trigger on whitespace input in search input [`apps/web/src/components/topics/DashboardSearchInput.tsx:61`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/src/components/topics/DashboardSearchInput.tsx#L61) — deferred, pre-existing

---

## Dev Notes

### 1. Architectural Guidelines & Invariants Compliance
- **AD-03 & AD-04 (PostgreSQL System of Record & Drizzle ORM)**:
  - All comparisons are computed authoritatively on the server via PostgreSQL against `topics` and `accepted_evidence` tables.
  - Active retention boundaries (`t.status = 'ACTIVE' AND t.retention_expires_at > NOW()`) are strictly enforced.
  - No client-side date manipulation or local browser clock advancing.
  - Test database isolation: All backend tests MUST run on `mahalla_ovozi_test`. Never touch active dev database `mahalla_ovozi`.
- **AD-09 (Search Privacy)**:
  - Search query strings in POST `/api/v1/hokim/topics/statistics/search` are evaluated safely and never logged or leaked.
- **AD-10 (Fastify Same-Origin & Zod Contracts)**:
  - Schema changes live in `packages/api-contracts/src/topics.ts` and validate both API requests and responses.

### 2. Timezone & Prior-Period Cutoff Computation Details
- **Asia/Tashkent (UTC+5)**:
  - Uzbekistan does not observe Daylight Saving Time (DST). A constant offset of $+05:00$ (18,000 seconds) is used.
  - For `Бугун` (`dateScope === 'today'`), `serverEvaluatedAt` is ISO string `T`.
  - Unix seconds `asOfSeconds = Math.floor(new Date(T).getTime() / 1000)`.
  - Yesterday cutoff Unix seconds = `asOfSeconds - 86400`.
  - Cutoff timestamp = `new Date((asOfSeconds - 86400) * 1000)`.
  - Yesterday calendar day string = `getTashkentCalendarDay(asOfSeconds - 86400)`.
- **Earliest Accepted Evidence Invariant**:
  - A topic belongs to yesterday's partial-day interval if its earliest retained Telegram message arrived at or before the cutoff on yesterday's calendar day.
  - `EXISTS (SELECT 1 FROM accepted_evidence ae WHERE ae.topic_id = t.id AND ae.calendar_day = $yesterdayDay AND ae.original_timestamp <= $yesterdayCutoffDate)`.

### 3. Neutral Trend Presentation Invariant
- Civic topic volume changes are **informative, not evaluative**. More topics $\ne$ bad; fewer topics $\ne$ good.
- Colors must be strictly neutral: text `#475569`, pill background `#F1F5F9`, border `#E2E8F0`.
- Delta presentation includes explicit sign (`+`, `-`, or `0`) and Uzbek label:
  - Positive: `+3 кечаги шу вақтга нисбатан`
  - Negative: `-2 кечаги шу вақтга нисбатан`
  - Zero: `0 кечаги шу вақтга нисбатан (ўзгаришсиз)`

### 4. Source Tree Components to Touch
- `packages/api-contracts/src/topics.ts` [UPDATE]
- `apps/backend/src/modules/topics/hokim-topic-service.ts` [UPDATE]
- `apps/web/src/components/topics/TopicStatisticCard.tsx` [UPDATE]
- `apps/web/src/components/topics/TopicStatisticsStrip.tsx` [UPDATE]
- `apps/backend/tests/hokim-topics-statistics.test.ts` [UPDATE]
- `apps/web/tests/unit/TopicStatisticsStrip.test.tsx` [UPDATE]

### References
- [Source: _bmad-output/planning-artifacts/epics/epic-3.md#Story 3.9: Compare Topic Volume With Equivalent Prior Periods]
- [Source: _bmad-output/planning-artifacts/prds/prd-Mahalla-Ovozi-2026-07-30/prd.md#FR-18: Filter-aware neutral statistics]
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-Mahalla-Ovozi-2026-08-05/DESIGN.md#metric-card]
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-Mahalla-Ovozi-2026-08-05/EXPERIENCE.md#metric-card]
- [Source: _bmad-output/project-context.md#Critical Implementation Rules]

---

## Dev Agent Record

### Agent Model Used

Gemini 3.7 Flash (High) via Antigravity Agentic Harness

### Debug Log References

None (All unit and integration tests passed cleanly).

### Completion Notes List

- Implemented `TopicStatisticCard1ComparisonSchema` discriminated union in shared API contracts (`packages/api-contracts/src/topics.ts`).
- Implemented `resolvePriorPeriodComparison` helper in `apps/backend/src/modules/topics/hokim-topic-service.ts` supporting authoritative Asia/Tashkent partial-day cutoff matching by earliest Telegram message timestamp (`MIN(ae.original_timestamp)`), completed single-day ($D - 1$) comparisons, and completed custom $N$-day range comparisons.
- Enforced unavailability guards returning `isAvailable: false` for lane subsets ($< 5$), active plain-text search, custom date ranges ending on Today, and 90-day retention limits.
- Enhanced `TopicStatisticCard.tsx` and `TopicStatisticsStrip.tsx` to render neutral, non-color-only trend delta pills, contextual Uzbek labels, full descriptive ARIA labels, and fixed-height layout reservation (0px CLS).
- Authored and verified 20 backend integration tests against `mahalla_ovozi_test` and 12 web unit tests covering trend rendering, accessibility, and unavailability states.

### File List

- `packages/api-contracts/src/topics.ts` (UPDATE)
- `apps/backend/src/modules/topics/hokim-topic-service.ts` (UPDATE)
- `apps/backend/tests/hokim-topics-statistics.test.ts` (UPDATE)
- `apps/web/src/components/topics/TopicStatisticCard.tsx` (UPDATE)
- `apps/web/src/components/topics/TopicStatisticsStrip.tsx` (UPDATE)
- `apps/web/tests/unit/TopicStatisticsStrip.test.tsx` (UPDATE)
- `apps/web/tests/unit/DashboardSearch.test.tsx` (UPDATE)
- `apps/web/tests/unit/useTopicStatistics.test.tsx` (UPDATE)
- `_bmad-output/implementation-artifacts/3-9-compare-topic-volume-with-equivalent-prior-periods.md` (UPDATE)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (UPDATE)

### Change Log

- 2026-08-24: Story 3.9 implementation completed and verified across API contracts, backend service, web UI, integration tests, and sprint tracking.

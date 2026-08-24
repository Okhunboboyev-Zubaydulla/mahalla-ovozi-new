---
baseline_commit: 4e6c5fb
---

# Story 3.5: Understand the Active Result Set Through Neutral Statistics

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the **Hokim**,
I want five compact neutral statistics that follow the dashboard result scope,
so that I can understand the shape of current or historical signals without mistaking them for service-performance scores or representative public opinion.

---

## Acceptance Criteria

### 1. Exactly Five Compact Read-Only Metric Cards & Strict Neutrality (AC 1)
- **Given** a successfully applied dashboard scope (default or filtered)
- **When** the statistics region renders between the toolbar / filter bar and the Lane board
- **Then** exactly five compact read-only metric cards appear in a horizontal strip
- **And** the base metrics are:
  - **Card 1 (`Жами мавзулар`)**: Total unique canonical Topics in active scope
  - **Card 2 (`Ҳокимга оид`)**: Hokim-related Topics with secondary retained Accepted Evidence count
  - **Card 3 (`Фаол маҳаллалар`)**: Distinct active Mahallas represented with secondary total deduplicated Accepted Evidence count
  - **Card 4 (`Энг фаол соҳа` / `Кўп йўналишли`)**: Most active service Lane (or deterministic `Multi-Lane Topics` fallback)
  - **Card 5 (`Энг фаол маҳалла` / `Кўп далилли`)**: Most active Mahalla (or deterministic `Multi-evidence Topics` fallback)
- **And** the statistics strictly contain no sentiment, urgency, severity, service-quality scores, satisfaction rankings, representative-public-opinion claims, AI advice/judgment, or performance ranking actions.

### 2. Synchronized Active Filter Scope & Complete Server-Side Aggregations (AC 2)
- **Given** date (`dateScope`, `dateFrom`, `dateTo`), Mahalla (`mahallaName`), or Lane (`lanes`) filter criteria are successfully applied
- **When** board results and statistics update
- **Then** all five statistics describe the exact same successfully applied result scope as the Lane board
- **And** statistics are calculated directly from the complete authoritative server-side dataset in PostgreSQL rather than only browser-loaded pagination batches or keyset cursor subsets.

### 3. Unique Canonical Topics Counting & Multi-Lane Deduplication (AC 3)
- **Given** overall unique Topics are counted for Card 1 (`Жами мавзулар`)
- **When** one canonical Topic appears in multiple selected Lanes (e.g. `WATER` and `ELECTRICITY`)
- **Then** it contributes exactly once to the overall unique-Topic value
- **And** the subtitle reflects the active scope (e.g. `танланган фильтр бўйича` or `барча йўналишлар бўйича`).

### 4. Hokim-Related Topics & Multi-Lane Activity Overlap (AC 4)
- **Given** Hokim-related Topics are counted for Card 2 (`Ҳокимга оид`)
- **When** a canonical Topic is both Hokim-related (`tp.is_hokim_related = true` or `tp.lanes @> '["HOKIM_RELATED"]'` or `t.primary_lane = 'HOKIM_RELATED'`) and belongs to one or more service Lanes
- **Then** it contributes once to the Hokim-related topic count
- **And** it may also contribute to applicable service-Lane activity without becoming a duplicate canonical Topic
- **And** its secondary context displays the exact count of retained Accepted Evidence records attached to those Hokim-related Topics (`{N} та далил`).

### 5. Active Mahallas & Retained Evidence Deduplication (AC 5)
- **Given** active Mahallas are counted for Card 3 (`Фаол маҳаллалар`)
- **When** matching canonical Topics span the applied scope
- **Then** the primary Card 3 value is the number of distinct Mahallas represented by the matching canonical Topic set independent of Lane-card appearances
- **And** its secondary value counts each retained Accepted Evidence record attached to that matching canonical Topic set exactly once (`{N} та далил`)
- **And** multi-Lane appearances cannot multiply evidence counts
- **And** repeated retained messages from one sender remain distinct evidence records but are never described as several residents or voters.

### 6. Service-Lane Activity Comparison & Non-Hokim Invariant (AC 6)
- **Given** service-Lane activity is compared for Card 4 (`Энг фаол соҳа`)
- **When** at least two service Lanes among `Сув` (WATER), `Электр` (ELECTRICITY), `Газ` (GAS), and `Чиқинди` (WASTE) are selected in the active filter scope
- **Then** Card 4 is `Most active service Lane` (`Энг фаол соҳа`)
- **And** comparison eligibility is determined by the active selected service-Lane candidate set rather than only by candidates with non-zero results
- **And** activity is distinct canonical Topic count, not evidence volume
- **And** a multi-service Topic contributes once to every applicable selected service Lane
- **And** `Ҳокимга оид` (HOKIM_RELATED) is strictly excluded from service-Lane ranking
- **And** zero-Topic selected service Lanes remain legitimate comparison candidates.

### 7. Deterministic Fallback: Multi-Lane Topics (AC 7)
- **Given** fewer than two service Lanes are selected in the active filter scope (e.g. only 1 service lane selected, or only `HOKIM_RELATED` selected)
- **When** Card 4 is calculated
- **Then** `Most active service Lane` is replaced deterministically with `Multi-Lane Topics` (`Кўп йўналишли`)
- **And** it counts distinct matching canonical Topics whose canonical membership contains more than one Lane (`jsonb_array_length(tp.lanes) > 1`)
- **And** one canonical Topic contributes at most once regardless of how many Lane appearances it has.

### 8. Mahalla Activity Comparison (AC 8)
- **Given** Mahalla activity is compared for Card 5 (`Энг фаол маҳалла`)
- **When** the active Mahalla candidate set contains at least two permitted Mahallas (e.g. `all` Mahallas selected in a district with $\ge 2$ Mahallas)
- **Then** Card 5 is `Most active Mahalla` (`Энг фаол маҳалла`)
- **And** comparison eligibility follows the active filter candidate set rather than only Mahallas with non-zero results
- **And** ranking is by distinct canonical Topic count rather than evidence, sender, or message volume
- **And** zero-result permitted candidate Mahallas remain legitimate comparison candidates.

### 9. Deterministic Fallback: Multi-Evidence Topics (AC 9)
- **Given** the active Mahalla scope is restricted to one Mahalla, or the authorized District itself has only one permitted Mahalla
- **When** Card 5 is calculated
- **Then** `Most active Mahalla` is replaced deterministically with `Multi-evidence Topics` (`Кўп далилли`)
- **And** it counts distinct matching canonical Topics having more than one retained Accepted Evidence item ($> 1$)
- **And** Lane appearances cannot multiply that Topic count.

### 10. Automatic Normal Metric Restoration (AC 10)
- **Given** a later successful scope change restores at least two eligible service Lanes or Mahallas
- **When** the statistics recalculate
- **Then** the corresponding normal most-active metric (`Энг фаол соҳа` / `Энг фаол маҳалла`) returns automatically
- **And** exactly five cards remain visible in all fallback and normal states.

### 11. Non-Zero Tie Representation (AC 11)
- **Given** a most-active comparison (Card 4 or Card 5) has a non-zero highest Topic count shared by multiple eligible candidates
- **When** the metric is presented
- **Then** the UI does not choose or imply an arbitrary winner
- **And** the card presents the tie deterministically as a neutral tied-candidate count: e.g. `Тенг: 2 та йўналиш` or `Тенг: 3 та маҳалла` with subtitle `{N} тадан мавзу`
- **And** tied candidate names are not required to be enumerated inside or through an interactive expansion of the compact statistic card
- **And** no green/good or red/bad interpretation or color is attached to the tie or any tied candidate.

### 12. Zero-Result Precedence Over Tie Representation (AC 12)
- **Given** a most-active metric has two or more eligible candidates but every candidate has zero matching canonical Topics
- **When** Card 4 or Card 5 is rendered
- **Then** the zero-result rule takes precedence over ordinary tie presentation
- **And** the UI does not display a tied-leader count or identify any candidate as most active
- **And** the card uses the neutral zero/unavailable state: value `—` and subtitle `мавзулар йўқ`
- **And** no service quality, satisfaction, inactivity judgment, or System Health meaning is inferred from the zero result.

### 13. Read-Only, Non-Focusable & Non-Interactive Card Anatomy (AC 13)
- **Given** the statistics strip renders on any viewport
- **When** the Hokim interacts with the page via pointer or keyboard
- **Then** all five cards are strictly read-only and non-focusable (`tabIndex={-1}`)
- **And** cards do not act as filters, buttons, links, or navigation triggers
- **And** cards adhere to Ant Design 5 token rules: `boxShadow: 'none'`, border `#E2E8F0`, rounded corners (`borderRadius: 8`), icon box background colors (`#FEE2E2`, `#FCE7F3`, `#DBEAFE`, `#F3E8FF`, `#D1FAE5`), statistic value font 28px/600 (`#0F172A`), subtitle font 13px (`#64748B`).

### 14. Responsive Layout, Horizontal Overflow & Keyboard Navigation (AC 14)
- **Given** the statistics strip is viewed on desktop ($\ge 1024$px)
- **When** all five statistic cards fit the viewport
- **Then** all five read-only cards are visible simultaneously in a clean 5-column layout.
- **Given** the statistics strip is viewed on a narrow screen (< 1024px, 320 CSS px, or 200% zoom)
- **When** all five statistic cards do not fit the viewport
- **Then** the strip becomes a labelled horizontal statistics region (`role="region"`, `aria-label="Муҳим кўрсаткичлар"`) with visible keyboard-operable `Previous statistic` (`Олдинги кўрсаткич`) and `Next statistic` (`Кейинги кўрсаткич`) controls
- **And** each navigation button meets the minimum 44px WCAG touch target floor (`minWidth: 44`, `minHeight: 44`)
- **And** one activation moves one statistic at a time and announces the newly visible metric name and position via `aria-live="polite"` (e.g. `Кўрсаткич 2 / 5: Ҳокимга оид`)
- **And** current statistic position is preserved across viewport, zoom, and orientation changes
- **And** only navigation controls, not read-only metric cards, enter the Tab sequence
- **And** programmatic movement is immediate without smooth animation under `prefers-reduced-motion: reduce`.

### 15. Same-Origin REST API & Strict Tenant Isolation (AC 15)
- **Given** statistics are requested from the backend
- **When** authoritative aggregates are produced
- **Then** same-origin `GET /api/v1/hokim/topics/statistics` with shared browser-safe Zod contracts in `@mahalla-ovozi/api-contracts` is used
- **And** the server enforces `WHERE t.district_id = actorContext.districtId` and `t.status = 'ACTIVE' AND t.retention_expires_at > NOW()`
- **And** a single-roundtrip SQL aggregation query with subqueries/CTEs computes all 5 card values and fallback states efficiently without N+1 query overhead.

### 16. Automated Integration & Unit Test Verification (AC 16)
- **Given** Story 3.5 is verified under the test suite
- **When** focused automated tests execute against isolated test database `mahalla_ovozi_test` and Vitest component runners
- **Then** tests cover:
  1. Unique Topic deduplication across multiple Lanes
  2. Hokim-related overlap with service Lanes
  3. Distinct active Mahallas and Accepted Evidence deduplication
  4. Most active service Lane calculation, tie representation, and all-zero precedence
  5. Multi-Lane Topics fallback when $< 2$ service lanes selected
  6. Most active Mahalla calculation, tie representation, and all-zero precedence
  7. Multi-evidence Topics fallback when 1 Mahalla selected
  8. Metric restoration when filters change back to $\ge 2$ candidates
  9. Tenant isolation (no cross-district data leakage)
  10. Read-only non-focusable cards, mobile overflow navigation buttons, 44px touch targets, ARIA announcements, and reduced motion.

---

## Tasks / Subtasks

- [ ] **Task 1: Shared API Contracts & Zod Schemas for Statistics** (AC: 1, 2, 6, 7, 8, 9, 11, 12, 15)
  - [ ] 1.1 In `packages/api-contracts/src/topics.ts`:
    - Define `HokimTopicStatisticsQuerySchema`:
      - Reuses `DateFilterScopeSchema`, `dateFrom`, `dateTo`, `mahallaName`, `LanesQueryParamSchema`.
      - Includes `superRefine` for custom date range validation (same as `HokimTopicBoardQuerySchema`).
    - Define `TopicStatisticCard4Schema`:
      - `z.discriminatedUnion('mode', [...])`:
        - `mode: 'most_active_service_lane'`: `leaderLane: QualifyingLaneSchema.nullable()`, `leaderTopicCount: z.number().int().min(0)`, `isTie: z.boolean()`, `tiedCount: z.number().int().min(0)`, `isZero: z.boolean()`
        - `mode: 'multi_lane_topics'`: `multiLaneTopicCount: z.number().int().min(0)`
    - Define `TopicStatisticCard5Schema`:
      - `z.discriminatedUnion('mode', [...])`:
        - `mode: 'most_active_mahalla'`: `leaderMahalla: z.string().nullable()`, `leaderTopicCount: z.number().int().min(0)`, `isTie: z.boolean()`, `tiedCount: z.number().int().min(0)`, `isZero: z.boolean()`
        - `mode: 'multi_evidence_topics'`: `multiEvidenceTopicCount: z.number().int().min(0)`
    - Define `HokimTopicStatisticsResponseSchema`:
      - `districtId: z.string()`
      - `districtName: z.string()`
      - `calendarDay: z.string()`
      - `serverEvaluatedAt: z.string().datetime()`
      - `totalUniqueTopics: z.number().int().min(0)`
      - `hokimRelatedTopics: z.number().int().min(0)`
      - `hokimEvidenceCount: z.number().int().min(0)`
      - `activeMahallasCount: z.number().int().min(0)`
      - `totalAcceptedEvidenceCount: z.number().int().min(0)`
      - `card4: TopicStatisticCard4Schema`
      - `card5: TopicStatisticCard5Schema`
    - Export TypeScript types: `HokimTopicStatisticsQuery`, `HokimTopicStatisticsResponse`, `TopicStatisticCard4`, `TopicStatisticCard5`.

- [ ] **Task 2: Backend PostgreSQL Aggregation Service Implementation** (AC: 2-12, 15)
  - [ ] 2.1 In `apps/backend/src/modules/topics/hokim-topic-service.ts`:
    - Implement `getStatistics(actorContext, params: HokimTopicStatisticsQuery): Promise<HokimTopicStatisticsResponse>`:
      - Resolve date boundaries using `resolveDateBoundary(params)`.
      - Build SQL date predicate (`t.calendar_day = ...` or `t.calendar_day >= ... AND t.calendar_day <= ...`).
      - Build SQL Mahalla predicate (if `params.mahallaName` is provided and $\ne$ `'all'`).
      - Determine selected active lanes: `params.lanes` or default to `CANONICAL_LANES`.
      - Build selected active lane predicate: `(tp.lanes ?| array[...])` or `(tp.lanes @> ... OR t.primary_lane IN (...))`.
      - Determine active service lanes subset: filter selected lanes for `['WATER', 'ELECTRICITY', 'GAS', 'WASTE']`.
      - Execute single-roundtrip parameterized SQL aggregation query:
        ```sql
        WITH filtered_topics AS (
          SELECT 
            t.id,
            t.mahalla_name,
            t.primary_lane,
            tp.lanes,
            tp.is_hokim_related
          FROM topics t
          JOIN topic_projections tp ON tp.topic_id = t.id
          WHERE t.district_id = $districtId
            AND t.status = 'ACTIVE'
            AND t.retention_expires_at > NOW()
            AND <datePredicate>
            AND <mahallaPredicate>
            AND <lanePredicate>
        ),
        evidence_counts AS (
          SELECT 
            ae.topic_id,
            COUNT(DISTINCT ae.id)::int as count
          FROM accepted_evidence ae
          WHERE ae.topic_id IN (SELECT id FROM filtered_topics)
            AND ae.district_id = $districtId
          GROUP BY ae.topic_id
        ),
        mahalla_topic_counts AS (
          SELECT 
            mahalla_name, 
            COUNT(DISTINCT id)::int as topic_count
          FROM filtered_topics
          WHERE mahalla_name IS NOT NULL AND TRIM(mahalla_name) != ''
          GROUP BY mahalla_name
        ),
        district_mahallas_total AS (
          SELECT COUNT(DISTINCT mahalla_name)::int as total_mahallas_count
          FROM (
            SELECT mahalla_name FROM district_telegram_groups WHERE district_id = $districtId AND status != 'FAILED'
            UNION
            SELECT mahalla_name FROM topics WHERE district_id = $districtId AND status = 'ACTIVE' AND retention_expires_at > NOW()
          ) d_mahallas
          WHERE mahalla_name IS NOT NULL AND TRIM(mahalla_name) != ''
        )
        SELECT 
          COUNT(DISTINCT ft.id)::int as total_unique_topics,
          COUNT(DISTINCT CASE WHEN ft.is_hokim_related = true OR ft.lanes @> '["HOKIM_RELATED"]'::jsonb OR ft.primary_lane = 'HOKIM_RELATED' THEN ft.id END)::int as hokim_topics_count,
          COALESCE(SUM(CASE WHEN ft.is_hokim_related = true OR ft.lanes @> '["HOKIM_RELATED"]'::jsonb OR ft.primary_lane = 'HOKIM_RELATED' THEN ec.count ELSE 0 END), 0)::int as hokim_evidence_count,
          COUNT(DISTINCT ft.mahalla_name)::int as active_mahallas_count,
          COALESCE(SUM(ec.count), 0)::int as total_accepted_evidence_count,
          COUNT(DISTINCT CASE WHEN ft.lanes IS NOT NULL AND jsonb_typeof(ft.lanes) = 'array' AND jsonb_array_length(ft.lanes) > 1 THEN ft.id END)::int as multi_lane_topics_count,
          COUNT(DISTINCT CASE WHEN COALESCE(ec.count, 0) > 1 THEN ft.id END)::int as multi_evidence_topics_count,
          COUNT(DISTINCT CASE WHEN ft.lanes @> '["WATER"]'::jsonb OR ft.primary_lane = 'WATER' THEN ft.id END)::int as water_count,
          COUNT(DISTINCT CASE WHEN ft.lanes @> '["ELECTRICITY"]'::jsonb OR ft.primary_lane = 'ELECTRICITY' THEN ft.id END)::int as electricity_count,
          COUNT(DISTINCT CASE WHEN ft.lanes @> '["GAS"]'::jsonb OR ft.primary_lane = 'GAS' THEN ft.id END)::int as gas_count,
          COUNT(DISTINCT CASE WHEN ft.lanes @> '["WASTE"]'::jsonb OR ft.primary_lane = 'WASTE' THEN ft.id END)::int as waste_count,
          COALESCE((SELECT jsonb_object_agg(mahalla_name, topic_count) FROM mahalla_topic_counts), '{}'::jsonb) as mahalla_counts,
          COALESCE((SELECT total_mahallas_count FROM district_mahallas_total), 0)::int as total_district_mahallas_count
        FROM filtered_topics ft
        LEFT JOIN evidence_counts ec ON ec.topic_id = ft.id;
        ```
      - Compute Card 4 (Service Lane / Multi-Lane):
        - If active service lanes count $< 2$: `mode: 'multi_lane_topics'`, `multiLaneTopicCount`.
        - If active service lanes count $\ge 2$:
          - Gather counts for selected service lanes only.
          - If all selected service lanes have count $= 0$: `isZero: true`, `leaderLane: null`, `leaderTopicCount: 0`, `isTie: false`, `tiedCount: 0`.
          - Find max count $> 0$. Count how many candidate lanes share max count.
          - If $> 1$ lanes share max: `isTie: true`, `tiedCount: N`, `leaderLane: null`, `leaderTopicCount: maxCount`, `isZero: false`.
          - If exactly 1 lane has max: `isTie: false`, `tiedCount: 0`, `leaderLane: topLane`, `leaderTopicCount: maxCount`, `isZero: false`.
      - Compute Card 5 (Mahalla / Multi-Evidence):
        - Check if candidate Mahalla count $< 2$ (either `params.mahallaName` is a specific mahalla OR `total_district_mahallas_count` $\le 1$):
          - `mode: 'multi_evidence_topics'`, `multiEvidenceTopicCount`.
        - If candidate Mahalla count $\ge 2$ (`mahallaName === 'all'` or omitted in multi-mahalla district):
          - Parse per-mahalla counts from `mahalla_counts`.
          - If all permitted mahallas have count $= 0$ (or `totalUniqueTopics === 0`): `isZero: true`, `leaderMahalla: null`, `leaderTopicCount: 0`, `isTie: false`, `tiedCount: 0`.
          - Find max count $> 0$. Count how many mahallas share max count.
          - If $> 1$ mahallas share max: `isTie: true`, `tiedCount: N`, `leaderMahalla: null`, `leaderTopicCount: maxCount`, `isZero: false`.
          - If exactly 1 mahalla has max: `isTie: false`, `tiedCount: 0`, `leaderMahalla: topMahalla`, `leaderTopicCount: maxCount`, `isZero: false`.

- [ ] **Task 3: Backend Fastify Route Handler for Statistics** (AC: 15)
  - [ ] 3.1 In `apps/backend/src/modules/topics/hokim-topics-routes.ts`:
    - Register `GET /api/v1/hokim/topics/statistics`:
      - Guard with `createRequireHokim(db)`.
      - Parse and validate `req.query` with `HokimTopicStatisticsQuerySchema`.
      - Call `topicService.getStatistics(req.actor, parseResult.data)`.
      - Return HTTP 200 `HokimTopicStatisticsResponse`.
      - Handle errors with sanitized `STATISTICS_QUERY_ERROR` and HTTP 400.

- [ ] **Task 4: Web API Client & TanStack Query Hook** (AC: 2, 15)
  - [ ] 4.1 In `apps/web/src/topics/hokim-topics-client.ts`:
    - Implement `getStatistics(params?: HokimTopicStatisticsQuery, signal?: AbortSignal): Promise<HokimTopicStatisticsResponse>`:
      - Serializes query parameters (`dateScope`, `dateFrom`, `dateTo`, `mahallaName`, `lanes`).
      - Calls same-origin `GET /api/v1/hokim/topics/statistics`.
      - Parses response with `HokimTopicStatisticsResponseSchema`.
  - [ ] 4.2 In `apps/web/src/topics/useTopicStatistics.ts` (NEW):
    - Implement TanStack Query hook `useTopicStatistics(filters: DashboardFilterState)`:
      - `queryKey: ['hokim-statistics', districtId, filters]`
      - `placeholderData: keepPreviousData` (preserves visible statistics during filter transitions without layout jitter).
      - Returns `{ statistics, isLoading, isFetching, isError, error, refetch }`.

- [ ] **Task 5: Read-Only Metric Card Component** (AC: 1, 13)
  - [ ] 5.1 In `apps/web/src/components/topics/TopicStatisticCard.tsx` (NEW):
    - Render a clean, bordered, non-clickable card:
      - `tabIndex={-1}`, `role="group"`, `aria-label="{title}: {value} {subtitle}"`
      - Background `#FFFFFF`, border `1px solid #E2E8F0`, `borderRadius: 8`, zero box-shadows (`boxShadow: 'none'`).
      - Icon container: 36x36px rounded square with designated background color (`#FEE2E2`, `#FCE7F3`, `#DBEAFE`, `#F3E8FF`, `#D1FAE5`).
      - Title: 12px uppercase / bold `#64748B`.
      - Value: 28px font-weight 600 `#0F172A`, line-height 34px, with `fontVariantNumeric: 'tabular-nums'` to prevent micro-jitter.
      - Subtitle: 13px `#64748B`.
      - Strict text wrapping without clipping on 320px screens.

- [ ] **Task 6: Responsive 5-Card Statistics Strip & Overflow Navigation** (AC: 1, 6-12, 14)
  - [ ] 6.1 In `apps/web/src/components/topics/TopicStatisticsStrip.tsx` (NEW):
    - Accepts `statistics: HokimTopicStatisticsResponse | undefined`, `isLoading: boolean`.
    - Desktop layout ($\ge 1024$px):
      - 5-column CSS grid (`gridTemplateColumns: 'repeat(5, 1fr)'`, gap 12px).
    - Responsive / Overflow layout (< 1024px, 320px, 200% zoom):
      - Wraps in labelled horizontal region (`role="region"`, `aria-label="Муҳим кўрсаткичлар"`).
      - Renders visible Previous (`Олдинги кўрсаткич`, `LeftOutlined`) and Next (`Кейинги кўрсаткич`, `RightOutlined`) buttons.
      - Boundary disabling: `Previous` disabled when `currentIndex === 0`; `Next` disabled when `currentIndex === 4`.
      - Each button has 44x44px minimum touch target (`minWidth: 44`, `minHeight: 44`, `width: 44`, `height: 44`).
      - Moving index scrolls the active card into view and announces via `aria-live="polite"` (e.g. `Кўрсаткич 3 / 5: Фаол маҳаллалар`).
      - Respects `prefers-reduced-motion: reduce` (instant scroll).
    - Map Card values:
      - **Card 1 (`Жами мавзулар`)**: Value: `statistics.totalUniqueTopics`, Subtitle: `танланган фильтр бўйича`. Icon: `FileTextOutlined`, color `#FEE2E2`.
      - **Card 2 (`Ҳокимга оид`)**: Value: `statistics.hokimRelatedTopics`, Subtitle: `${statistics.hokimEvidenceCount} та далил`. Icon: `CrownOutlined` / `UserOutlined`, color `#FCE7F3`.
      - **Card 3 (`Фаол маҳаллалар`)**: Value: `statistics.activeMahallasCount`, Subtitle: `${statistics.totalAcceptedEvidenceCount} та далил`. Icon: `HomeOutlined`, color `#DBEAFE`.
      - **Card 4 (`Энг фаол соҳа` / `Кўп йўналишли`)**:
        - If `mode === 'most_active_service_lane'`:
          - Title: `Энг фаол соҳа`
          - Value: `isZero ? '—' : isTie ? `Тенг: ${tiedCount} та йўналиш` : formatLaneName(leaderLane)`
          - Subtitle: `isZero ? 'мавзулар йўқ' : isTie ? `${leaderTopicCount} тадан мавзу` : `${leaderTopicCount} та мавзу``
        - If `mode === 'multi_lane_topics'`:
          - Title: `Кўп йўналишли`
          - Value: `${multiLaneTopicCount}`
          - Subtitle: `мавзулар`
        - Icon: `AppstoreOutlined`, color `#F3E8FF`.
      - **Card 5 (`Энг фаол маҳалла` / `Кўп далилли`)**:
        - If `mode === 'most_active_mahalla'`:
          - Title: `Энг фаол маҳалла`
          - Value: `isZero ? '—' : isTie ? `Тенг: ${tiedCount} та маҳалла` : leaderMahalla`
          - Subtitle: `isZero ? 'мавзулар йўқ' : isTie ? `${leaderTopicCount} тадан мавзу` : `${leaderTopicCount} та мавзу``
        - If `mode === 'multi_evidence_topics'`:
          - Title: `Кўп далилли`
          - Value: `${multiEvidenceTopicCount}`
          - Subtitle: `мавзулар`
        - Icon: `EnvironmentOutlined`, color `#D1FAE5`.
    - Loading skeleton: renders 5 skeleton cards matching exact dimensions (fixed height ~96px, matching borders/radii) without layout shifts (0px CLS).

- [ ] **Task 7: Dashboard Page Layout Integration & State Synchronization** (AC: 1, 2, 10)
  - [ ] 7.1 In `apps/web/src/pages/HokimDashboardPage.tsx`:
    - Wire `useTopicStatistics(filters)`.
    - Mount `TopicStatisticsStrip` between `FilterBar` / `FilterModalSheet` and `FiveLaneBoard`.
    - Pass `statistics` and loading state.
    - Synchronize background refresh and retry actions with `useTopicStatistics.refetch()`.

- [ ] **Task 8: Backend Integration Tests for Statistics Aggregations** (AC: 1-12, 15)
  - [ ] 8.1 In `apps/backend/tests/integration/hokim-topics-statistics.test.ts` (NEW):
    - Test `GET /api/v1/hokim/topics/statistics` with default scope (`dateScope=today`).
    - Test unique Topic deduplication when Topic has multiple lanes (`WATER` + `ELECTRICITY`).
    - Test Hokim-related topic counting and evidence volume counting.
    - Test distinct active Mahallas count and total deduplicated Accepted Evidence count.
    - Test most active service lane ranking among `WATER`, `ELECTRICITY`, `GAS`, `WASTE` (excluding `HOKIM_RELATED`).
    - Test service lane tie resolution (`isTie=true`, `tiedCount=2`, `leaderLane=null`).
    - Test service lane all-zero precedence (`isZero=true`, `leaderLane=null`, `leaderTopicCount=0`).
    - Test Card 4 fallback to `multi_lane_topics` when $< 2$ service lanes are selected.
    - Test most active Mahalla ranking across district mahallas.
    - Test Mahalla tie resolution (`isTie=true`, `tiedCount=3`, `leaderMahalla=null`).
    - Test Mahalla all-zero precedence (`isZero=true`, `leaderMahalla=null`, `leaderTopicCount=0`).
    - Test Card 5 fallback to `multi_evidence_topics` when single Mahalla filter is active.
    - Test filter restoration when switching back to all Mahallas and 5 lanes.
    - Test tenant isolation (`district_id` isolation).

- [ ] **Task 9: Web Unit & Component Tests for Statistics Strip** (AC: 1, 13, 14, 16)
  - [ ] 9.1 In `apps/web/src/topics/__tests__/useTopicStatistics.test.ts` (NEW):
    - Test query hook with filter state changes.
    - Test state preservation during filter transition (`placeholderData: keepPreviousData`).
  - [ ] 9.2 In `apps/web/src/components/topics/__tests__/TopicStatisticsStrip.test.tsx` (NEW):
    - Test rendering all 5 cards in default state.
    - Test non-focusable and read-only attributes (`tabIndex={-1}`).
    - Test Card 4 normal service lane vs multi-lane fallback mode rendering.
    - Test Card 5 normal Mahalla vs multi-evidence fallback mode rendering.
    - Test tie display (`Тенг: 2 та йўналиш`, `Тенг: 3 та маҳалла`).
    - Test all-zero display (`—`, `мавзулар йўқ`).
    - Test mobile carousel navigation buttons, 44px touch targets, and `aria-live` announcements.
    - Test reduced motion behavior.

---

## Dev Notes

### 1. Architectural Guidelines & Invariants Compliance
- **AD-03 & AD-04 (PostgreSQL System of Record & Drizzle ORM)**:
  - All statistics are computed via a single parameterized SQL query executing against PostgreSQL tables `topics`, `topic_projections`, and `accepted_evidence`.
  - Active retention boundaries (`t.status = 'ACTIVE' AND t.retention_expires_at > NOW()`) are strictly enforced in SQL.
  - Single-roundtrip CTE pattern prevents N+1 query loops.
  - All automated backend tests execute strictly on the isolated test database `mahalla_ovozi_test`.
- **AD-09 (Tenant Isolation & Authorization)**:
  - Hokim accounts are strictly bound to `actorContext.districtId`.
  - All queries enforce `WHERE t.district_id = actorContext.districtId`.
- **AD-10 (Same-Origin REST Contracts & Fastify Zod Validation)**:
  - Shared Zod validation schemas in `@mahalla-ovozi/api-contracts`.
  - Route handlers validated with Fastify + Zod.
- **UX & Design System Compliance (`DESIGN.md` & `EXPERIENCE.md`)**:
  - Exactly 5 compact read-only cards positioned between toolbar/filter bar and 5-lane board.
  - Strict zero box-shadows (`boxShadow: 'none'`), `#0284C7` primary brand, `#F4F6F8` background surface, `#E2E8F0` border.
  - Card icon backgrounds: `#FEE2E2` (Topics), `#FCE7F3` (Hokim), `#DBEAFE` (Mahallas), `#F3E8FF` (Service), `#D1FAE5` (Top Mahalla).
  - 44px WCAG AA touch targets on mobile overflow buttons (`minWidth: 44`, `minHeight: 44`).
  - Read-only metric cards are non-focusable (`tabIndex={-1}`) and never act as buttons/filters.
  - Uzbek Cyrillic formatting and ARIA live announcements.

### 2. Source Tree Components to Touch

| Status | File Path | Responsibility / Behavior Modification |
| :--- | :--- | :--- |
| **UPDATE** | [`packages/api-contracts/src/topics.ts`](file:///c:/codevision-works/mahalla-ovozi-trial-2/packages/api-contracts/src/topics.ts) | Export `HokimTopicStatisticsQuerySchema`, `HokimTopicStatisticsResponseSchema`, `TopicStatisticCard4Schema`, `TopicStatisticCard5Schema`. |
| **UPDATE** | [`apps/backend/src/modules/topics/hokim-topic-service.ts`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/backend/src/modules/topics/hokim-topic-service.ts) | Implement `getStatistics` using single-roundtrip SQL aggregation query with tie detection and dynamic fallback modes. |
| **UPDATE** | [`apps/backend/src/modules/topics/hokim-topics-routes.ts`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/backend/src/modules/topics/hokim-topics-routes.ts) | Register `GET /api/v1/hokim/topics/statistics` route handler with Fastify Zod validation. |
| **UPDATE** | [`apps/web/src/topics/hokim-topics-client.ts`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/src/topics/hokim-topics-client.ts) | Add `getStatistics` API client method calling `GET /api/v1/hokim/topics/statistics`. |
| **UPDATE** | [`apps/web/src/pages/HokimDashboardPage.tsx`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/src/pages/HokimDashboardPage.tsx) | Mount `TopicStatisticsStrip` between `FilterBar` and `FiveLaneBoard`, wire `useTopicStatistics`. |
| **NEW** | `apps/web/src/topics/useTopicStatistics.ts` | TanStack Query hook for statistics fetching with filter synchronization and placeholder data preservation. |
| **NEW** | `apps/web/src/components/topics/TopicStatisticCard.tsx` | Read-only non-focusable metric card component with colored icon container and Uzbek Cyrillic typography. |
| **NEW** | `apps/web/src/components/topics/TopicStatisticsStrip.tsx` | Responsive 5-card container with desktop 5-column grid and mobile horizontal carousel navigation (44px buttons, ARIA live). |
| **NEW** | `apps/backend/tests/integration/hokim-topics-statistics.test.ts` | Integration tests for SQL aggregations, multi-lane deduplication, tie resolution, zero precedence, and fallbacks. |
| **NEW** | `apps/web/src/topics/__tests__/useTopicStatistics.test.ts` | Unit tests for TanStack Query hook and filter synchronization. |
| **NEW** | `apps/web/src/components/topics/__tests__/TopicStatisticsStrip.test.tsx` | Unit and accessibility tests for statistics strip, overflow buttons, and ARIA live regions. |

### 3. File Behavior Preservation Details
- **`HokimDashboardPage.tsx`**: Must preserve Story 3.4 desktop `FilterBar`, mobile `FilterModalSheet`, Story 3.2 `TopicEvidenceDrawer`, and Story 3.3 offline/error banners.
- **`hokim-topic-service.ts`**: Must preserve Story 3.1 board queries, keyset cursor pagination, and Story 3.4 date boundary resolution / `getDistrictMahallas`.
- **`FiveLaneBoard.tsx`**: Must preserve horizontal scroll and keyboard navigation across lanes.
- **`BoardToolbar.tsx`**: Must preserve mobile `Фильтрлар N` button, district label, and freshness indicator.

### 4. References
- `_bmad-output/planning-artifacts/epics/epic-3.md#story-35-understand-the-active-result-set-through-neutral-statistics` (FR18)
- `_bmad-output/planning-artifacts/architecture/architecture-Mahalla-Ovozi-2026-08-12/ARCHITECTURE-SPINE.md#ad-03`
- `_bmad-output/planning-artifacts/architecture/architecture-Mahalla-Ovozi-2026-08-12/ARCHITECTURE-SPINE.md#ad-09`
- `_bmad-output/planning-artifacts/architecture/architecture-Mahalla-Ovozi-2026-08-12/ARCHITECTURE-SPINE.md#ad-10`
- `_bmad-output/planning-artifacts/ux-designs/ux-Mahalla-Ovozi-2026-08-05/EXPERIENCE.md`
- `_bmad-output/planning-artifacts/ux-designs/ux-Mahalla-Ovozi-2026-08-05/DESIGN.md`
- `_bmad-output/implementation-artifacts/3-4-filter-current-and-retained-topics.md`

---

## Dev Agent Record

### Agent Model Used
Gemini 3.7 Flash (High)

### Debug Log References
None

### Completion Notes List
- Comprehensive specification authored for Story 3.5 following the BMad Method.
- Mapped all 16 BDD acceptance criteria directly from `epic-3.md`, `ARCHITECTURE-SPINE.md`, and UX design documents.
- Detailed task breakdowns covering `@mahalla-ovozi/api-contracts`, backend PostgreSQL aggregation service & route handler, web client hooks, desktop/mobile responsive `TopicStatisticsStrip`, read-only `TopicStatisticCard`, and automated Vitest/integration suites.
- Strict anti-pattern prevention: no sentiment or satisfaction rankings, no opinionated AI commentary, no clickable/focusable cards acting as filters, no N+1 query overhead, no multi-lane evidence inflation, and zero-result precedence over ties.
- Completed adversarial quality analysis against Ant Design 5.x token rules (`boxShadow: 'none'`), 44px WCAG touch targets, TanStack Query 5.x state preservation, and Fastify 5.x Zod validation.

### File List
- `packages/api-contracts/src/topics.ts`
- `apps/backend/src/modules/topics/hokim-topic-service.ts`
- `apps/backend/src/modules/topics/hokim-topics-routes.ts`
- `apps/web/src/topics/hokim-topics-client.ts`
- `apps/web/src/topics/useTopicStatistics.ts`
- `apps/web/src/components/topics/TopicStatisticCard.tsx`
- `apps/web/src/components/topics/TopicStatisticsStrip.tsx`
- `apps/web/src/pages/HokimDashboardPage.tsx`
- `apps/backend/tests/integration/hokim-topics-statistics.test.ts`
- `apps/web/src/topics/__tests__/useTopicStatistics.test.ts`
- `apps/web/src/components/topics/__tests__/TopicStatisticsStrip.test.tsx`

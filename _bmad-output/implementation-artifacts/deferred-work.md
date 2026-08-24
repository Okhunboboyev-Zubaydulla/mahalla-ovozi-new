# Deferred Work

## Deferred from: code review of 3-4-filter-current-and-retained-topics.md (2026-08-24)

- **N+1 SQL Queries / Parallel Count Overhead in `getTodayBoard`** (`apps/backend/src/modules/topics/hokim-topic-service.ts:160-200`): Each active lane executes both topic retrieval and an independent `SELECT COUNT(DISTINCT t.id)` query. Pre-existing pattern from Story 3.1 board architecture; defer optimization to a dedicated performance epic.
- **Unchecked `req.actor` Cast in Fastify Route Handlers** (`apps/backend/src/modules/topics/hokim-topics-routes.ts:40,84,136`): Route handlers typecast `req.actor as { id: string; districtId: string; role: string }`. Pre-existing pattern across topic route handlers; defer to centralized Fastify auth decorator refactor.

## Deferred from: code review of 3-7-search-current-and-retained-topics-privately.md (2026-08-24)

- **GIN Trigram / Text Search Indexing for JSONB Evidence Queries** (`apps/backend/src/modules/topics/hokim-topic-service.ts:471-476, 633-638, 763-768`): Lexical pattern matching against `ae.verbatim_text` and `ae.user_metadata` JSONB attributes uses parameterized PostgreSQL ILIKE within active district scope. Future high-volume evidence queries may benefit from GIN trigram index migrations; defer to a dedicated database performance optimization epic.

## Deferred from: code review of 3-8-continue-large-filtered-and-search-results-safely.md (2026-08-24)

- **Unpaginated Evidence Count Aggregation in `queryLaneData`** (`apps/backend/src/modules/topics/hokim-topic-service.ts:511-541`): Topic queries join `accepted_evidence` across the district before applying limit pagination. Pre-existing query architecture from Story 3.1; defer to a future performance optimization epic if district evidence volumes grow significantly.

## Deferred from: code review of 3-9-compare-topic-volume-with-equivalent-prior-periods.md (2026-08-24)

- **Card 5 Single-Mahalla Mode Fallback When District Has 0 Total Mahallas** (`apps/backend/src/modules/topics/hokim-topic-service.ts:932`): `isSingleMahallaScope` evaluates `totalDistrictMahallasCount <= 1`. Pre-existing condition from Story 3.5; defer to a future district onboarding optimization.
- **Untrimmed `mahalla_name` Grouping in Legacy Statistics Query** (`apps/backend/src/modules/topics/hokim-topic-service.ts:804-820`): `mahalla_topic_counts` groups by raw `mahalla_name` instead of `TRIM(mahalla_name)`. Pre-existing query pattern from Story 3.5; defer to a future database hygiene refactor.
- **Base Accessible Name Concatenation Spacing for Cards 2 and 3** (`apps/web/src/components/topics/TopicStatisticCard.tsx:85`): Accessible label template `${title}: ${value} ${subtitle}` lacks a comma separator between value and subtitle for base statistic cards. Pre-existing component pattern from Story 3.5; defer to general accessibility refinement pass.
- **Mobile Carousel Scroll Synchronization with Index Indicator** (`apps/web/src/components/topics/TopicStatisticsStrip.tsx:215`): Mobile strip uses CSS horizontal scroll snapping without an `onScroll` listener to update `currentIndex`. Pre-existing component pattern from Story 3.5; defer to mobile UX enhancements.
- **Query Cache Key Serialization with Unsorted Lane Arrays** (`apps/web/src/topics/useTopicStatistics.ts:61`): `filterState.lanes.join(',')` does not sort lane arrays before building React Query keys. Pre-existing hook pattern from Story 3.5; defer to frontend query layer optimization.
- **Premature Clear Trigger on Whitespace Input in Search Input** (`apps/web/src/components/topics/DashboardSearchInput.tsx:61`): `!nextVal.trim()` immediately triggers clear on whitespace. Pre-existing component pattern from Story 3.8; defer to input debouncing refinements.


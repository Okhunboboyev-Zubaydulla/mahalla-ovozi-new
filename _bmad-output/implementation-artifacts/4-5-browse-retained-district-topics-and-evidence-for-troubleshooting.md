---
baseline_commit: caa67cb
---

# Story 4.5: Browse Retained District Topics and Evidence for Troubleshooting

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the **Product Owner**,  
I want to browse and search the retained Topics and Accepted Evidence for one explicitly selected District,  
So that I can investigate operational questions without mixing resident-bearing data across Districts or changing production decisions.

---

## Acceptance Criteria

1. **Strict Server-Side District Scoping & Authentication (AC 1)**:
   - Given an authenticated Product Owner requests retained Topics or Accepted Evidence,
   - When the request is received by the backend (`/api/v1/districts/:districtId/topics/*`),
   - Then Product Owner authentication (`actorRole: 'PRODUCT_OWNER'`) and explicit `districtId` path parameter are strictly validated server-side via `createRequireProductOwner(db)`,
   - And any request with missing, empty, or all-District scope is rejected with HTTP 400 Bad Request (`code: 'DISTRICT_REQUIRED'`, `message: 'Туман ID кўрсатилиши шарт.'`),
   - And any request with an unknown/non-existent `districtId` is rejected with HTTP 404 Not Found (`code: 'DISTRICT_NOT_FOUND'`, `message: 'Туман топилмади.'`),
   - And requests by Hokim or unauthenticated actors are rejected with HTTP 403 Forbidden (`code: 'FORBIDDEN'`) / HTTP 401 Unauthorized (`code: 'UNAUTHENTICATED'`),
   - And the selected District remains visibly identifiable throughout the Console UI,
   - And an all-District query cannot return, aggregate, or search resident-bearing Topic or Accepted Evidence content.

2. **Read-Only Canonical Topic Reuse Without AI Rerun (AC 2)**:
   - Given the explicitly selected District has retained canonical Topics from Epic 2,
   - When the operational Topic collection loads,
   - Then it queries existing canonical Topic records, cautious derived summaries, Mahalla names, Lane memberships, latest meaningful activity timestamps, and retained evidence counts directly from PostgreSQL (`topics`, `topic_projections`, `accepted_evidence`),
   - And results are read-only operational evidence access without creating duplicate Topic models, triggering case-management states, or re-running production AI,
   - And large collections use deterministic keyset/cursor progressive loading based on `(latestMeaningfulActivityTimestamp, id)` tuple ordering conforming to `@mahalla-ovozi/api-contracts`.

3. **Lexical Plain-Text Search with Privacy Guardrails (AC 3)**:
   - Given the Product Owner applies a search query within the explicitly selected District,
   - When the search executes,
   - Then matching is strictly lexical/plain-text (using SQL ILIKE with `%`, `_`, and `\` wildcard characters safely escaped via `input.replace(/[%_\\]/g, '\\$&')`) matching:
     - Retained Topic derived summaries (`topic_projections.summary`),
     - Verbatim Accepted Evidence text (`accepted_evidence.verbatim_text`),
     - Permitted Telegram usernames (`accepted_evidence.user_metadata->>'username'`),
     - Retained display names (`accepted_evidence.user_metadata->>'firstName'`, `accepted_evidence.user_metadata->>'lastName'`),
   - And search match badge is derived deterministically:
     - If author username/name matched: `searchMatchBadge: 'author'` (rendered as purple `<Tag color="purple" icon={<UserOutlined />}>Муаллиф</Tag>`),
     - Else if evidence verbatim text matched: `searchMatchBadge: 'evidence'` (rendered as blue `<Tag color="blue" icon={<FileTextOutlined />}>Далил матни</Tag>`),
     - Else (summary matched or search omitted): `searchMatchBadge: null`,
   - And matching never uses AI semantic question answering or vector retrieval,
   - And search query text is transmitted via POST request body (`POST /api/v1/districts/:districtId/topics/search`) to ensure search terms are excluded from routine HTTP logs, metrics, traces, and Audit History,
   - And no search query can ever cross the selected District boundary (subquery enforces `ae.district_id = districtId`).

4. **Multi-Parameter Operational Filtering (AC 4)**:
   - Given the Product Owner filters District Topics,
   - When criteria are applied,
   - Then filtering is supported by:
     - Date scope (`dateScope`: `today`, `yesterday`, or `custom` with `dateFrom` and `dateTo` in `Asia/Tashkent` calendar days `YYYY-MM-DD`, validated to be within the 90-day retention window with `dateFrom <= dateTo`),
     - Mahalla name (`mahallaName`: specific Mahalla or All),
     - Qualifying service lanes (`lanes`: array of `WATER`, `ELECTRICITY`, `GAS`, `WASTE`, `HOKIM_RELATED`),
   - And date boundary calculations strictly follow `Asia/Tashkent` (+05:00) calendar days,
   - And filter changes update results within the 2-second NFR2 target for at least 95% of requests.

5. **Verbatim Evidence Inspection & Privacy Boundary (AC 5)**:
   - Given the Product Owner opens a retained Topic to inspect evidence,
   - When evidence detail loads (`GET /api/v1/districts/:districtId/topics/:topicId/evidence`),
   - Then the complete retained Accepted Evidence trail is presented in strict chronological order (oldest to newest: `originalTimestamp ASC, telegramMessageId ASC, id ASC`),
   - And evidence displays verbatim message text / media captions in their original language and script,
   - And original Telegram timestamps are formatted in `Asia/Tashkent` (`DD.MM.YYYY HH:mm`),
   - And sender attribution is strictly limited to permitted `@username` and display name (first/last name),
   - And resident phone numbers, raw Telegram user IDs, credentials, and internal secrets are never inferred, stored, or displayed,
   - And Telegram deep links are provided where available (public groups `https://t.me/username/msgId`, private supergroups `https://t.me/c/chatId/msgId`),
   - And Topic summary or derived fields never replace or mutate the underlying Accepted Evidence.

6. **Retention Expiry & Authoritative Deletion Guardrails (AC 6)**:
   - Given a Topic or its Accepted Evidence reaches the 90-day retention deadline or District deletion removes it,
   - When the Product Owner requests the Topic or evidence,
   - Then expired/deleted resident-bearing data is unavailable and cannot be reconstructed from AI outputs, telemetry, audit records, or stale browser cache (`t.retention_expires_at > NOW()`),
   - And the API and browser present the approved factual unavailable/not-found state (HTTP 404 with code `NOT_FOUND` and message `"Мавзу топилмади ёки сақлаш муддати тугаган."`) without revealing cross-District existence information.

7. **District-Switching Atomic Cache Invalidation (AC 7)**:
   - Given District A Topics, search text, active filters, selection, or open Evidence Drawer are loaded in the browser,
   - When the Product Owner switches to District B (via `DistrictSelector` or District list),
   - Then the client-side District transition contract immediately:
     - Cancels all in-flight queries associated with District A (`await queryClient.cancelQueries`),
     - Purges all District A query data from the TanStack Query cache (`queryClient.removeQueries`),
     - Clears active search text, content-derived filters, result counts, selections, and error states,
     - Closes any open Evidence Drawer,
     - Mounts `DistrictTopicsView` keyed by `activeDistrictId` (`key={activeDistrictId}`) to guarantee instantaneous clean component state reset,
   - And late District A responses are dropped and never render under District B.

8. **Offline & Network Resilience Guardrails (AC 8)**:
   - Given the browser loses network connectivity while viewing permitted District Topic/Evidence data,
   - When an ordinary background refresh or query fails,
   - Then already-loaded permitted data remains visible read-only with a persistent stale warning banner displaying the last successful fetch time (`Asia/Tashkent` format `DD.MM.YYYY HH:mm`),
   - And new loads and searches are blocked while offline with an informative message rather than queued,
   - And network reconnection revalidates the Product Owner session, District authorization, and retention before refreshing resident-bearing data.

9. **Console Troubleshooting UI & Accessibility (AC 9)**:
   - Given an authenticated Product Owner navigates to the Districts section in Console (`/districts`),
   - When a District is selected and "Мавзулар ва далиллар" (Topics & Evidence) is viewed,
   - Then the UI renders:
     - Header with selected District name, status tag, total topic counter, and manual refresh button with spinning feedback,
     - Informative prompt when no District is selected, guiding the user to select a District from the list,
     - Filter bar with Tashkent date picker / presets ("Бугун", "Кеча", "Бошқа давр"), Mahalla dropdown, Lane multi-select, debounced search input (300ms), and reset filters button,
     - Operational Topics Table / List with columns: Mahalla, Derived summary, Calendar day, Lane tags, Latest activity (`Asia/Tashkent`), Evidence count, Search match badge (Summary / Evidence / Author), and "Далиллар" (View Evidence) action,
     - Keyset progressive loading controls ("Кўпроқ юклаш" / Load More button with item counter `${currentCount} тадан ${totalCount} та кўрсатилмоқда`),
     - Read-only Ant Design Evidence Drawer (responsive width: `screens.md ? 640 : '100%'`, `destroyOnClose={true}`) with chronological timeline, anchor quote badge, verbatim text, Tashkent timestamps, author tags, and Telegram deep links,
     - Accessible ARIA labels (`aria-label="Туман мавзулари рўйхати"`, `aria-label="Мавзу далиллари"`), visible keyboard focus, and keyboard Escape navigation to close drawer and restore table focus,
     - Support for 200% browser zoom, responsive mobile viewports (<= 768px), and reduced motion preferences,
     - State meaning never conveyed by color alone.

10. **High Performance & NFR2 Target Compliance (AC 10)**:
    - Given Story 4.5 operates under production-shaped database volumes (up to 90 days of retained topics and evidence),
    - When representative initial Console queries and plain-text search/filter queries execute,
    - Then initial usable results satisfy the 3-second NFR2 Console target for at least 95% of requests,
    - And search/filter updates satisfy the 2-second target for at least 95% of requests,
    - And keyset pagination avoids table scans and offset degradation.

11. **Automated Verification & Definition of Done (AC 11)**:
    - Given Story 4.5 is implemented,
    - When automated test suites run against the isolated test database `mahalla_ovozi_test` (port 5433),
    - Then backend integration tests cover:
      - Explicit Product Owner District scoping and HTTP 400 rejection of missing/all-District queries,
      - Product Owner authorization (PO allowed, Hokim 403, unauthenticated 401),
      - Cross-District isolation (cannot access or search District B topics with District A scope),
      - Read-only canonical Topic querying with joined projections and evidence counts,
      - Lexical plain-text search matching summary, verbatim text, username, and author display name with SQL wildcard escaping,
      - POST search route handling to exclude search terms from query string logging,
      - Multi-parameter filtering (date scope, Tashkent calendar days, Mahalla, Lanes),
      - Verbatim Accepted Evidence retrieval in strict chronological order with sanitized attribution and zero phone numbers,
      - Retention expiry / deletion returning HTTP 404,
      - Keyset cursor pagination and malformed cursor rejection (HTTP 400 `INVALID_CURSOR`),
      - Query performance under NFR2 targets.
    - And web component tests cover:
      - Informative prompt when no District is selected,
      - Topics list/table rendering with localized tags, timestamps, and search badges,
      - Filter bar interaction and query parameter updates,
      - Keyset pagination and progressive loading,
      - Evidence Drawer opening, chronological rendering, verbatim quotes, sanitized author tags, and focus restoration on close,
      - District switching with prior-district cache and state purge,
      - Offline stale state banner,
      - Zero edit or delete controls.

---

## Tasks / Subtasks

- [x] **Task 1: Shared API Contracts & Zod Schemas (`packages/api-contracts`)** (AC: 1, 2, 3, 4, 10)
  - [x] 1.1 In `packages/api-contracts/src/district-topics.ts` [NEW]:
    - Define and export `DistrictTopicsQuerySchema`:
      - `dateScope`: `DateFilterScopeSchema.default('today')`
      - `dateFrom`: `z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD форматида бўлиши керак').optional()`
      - `dateTo`: `z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD форматида бўлиши керак').optional()`
      - `calendarDay`: `z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()`
      - `mahallaName`: `z.string().trim().min(1).optional()`
      - `lanes`: `LanesQueryParamSchema`
      - `cursor`: `z.string().optional()`
      - `limit`: `z.coerce.number().int().min(1).max(100).default(20)`
      - Refine with `refineDateScopeRange`.
    - Define and export `DistrictTopicsSearchBodySchema`:
      - `search`: `z.string().trim().max(200, 'Қидирув сўзи 200 та белгидан ошмаслиги керак').optional()`
      - Inherit all filter fields from `DistrictTopicsQuerySchema`.
      - Refine with `refineDateScopeRange`.
    - Define and export `DistrictTopicsPageResponseSchema`:
      - `districtId`: `z.string()`
      - `districtName`: `z.string()`
      - `topics`: `z.array(TopicCardItemSchema)`
      - `totalCount`: `z.number().int().min(0)`
      - `nextCursor`: `z.string().nullable()`
      - `hasNextPage`: `z.boolean()`
      - `serverEvaluatedAt`: `z.string().datetime()`
    - Define and export `DistrictMahallasResponseSchema`:
      - `mahallas`: `z.array(z.string())`
    - Re-export types: `DistrictTopicsQuery`, `DistrictTopicsQueryOutput`, `DistrictTopicsSearchBody`, `DistrictTopicsSearchBodyOutput`, `DistrictTopicsPageResponse`, `DistrictMahallasResponse`.
  - [x] 1.2 In `packages/api-contracts/src/index.ts` [UPDATE]:
    - Re-export all district topics schemas and types from `./district-topics.js`.

- [x] **Task 2: Backend District Topics Query Engine (`apps/backend/src/modules/topics`)** (AC: 1, 2, 3, 4, 5, 6, 10)
  - [x] 2.1 In `apps/backend/src/modules/topics/district-topics-service.ts` [NEW]:
    - Implement `DistrictTopicsService` class with dependency injection `(db: DbClient)`:
      - Helper `escapeLikePattern(input: string): string` -> `input.replace(/[%_\\]/g, '\\$&')`.
      - Keyset cursor encoding/decoding helpers: `encodeDistrictTopicKeysetCursor(timestamp, id)` and `decodeDistrictTopicKeysetCursor(cursor)`.
      - `getDistrictTopics(params: { districtId: string; filter: DistrictTopicsSearchBodyOutput }): Promise<DistrictTopicsPageResponse>`:
        - Validate `districtId` exists in `districts` table; throw 404 `DistrictNotFoundError` if missing.
        - Resolve date boundary using `resolveDateBoundary` with Tashkent calendar day calculations.
        - Build SQL WHERE clause with Drizzle `and()`, `eq()`, `gte()`, `lte()`, `isNull()`, `sql`:
          - `t.district_id = districtId`
          - `t.status = 'ACTIVE'`
          - `t.retention_expires_at > NOW()`
          - Date predicate (`calendar_day` between bounds or specific day)
          - Mahalla predicate (`mahalla_name`)
          - Lanes predicate (matching `tp.lanes` jsonb contains or `t.primary_lane`)
          - Search predicate (if `filter.search` provided and non-empty):
            - `tp.summary ILIKE pattern` OR `EXISTS (SELECT 1 FROM accepted_evidence ae WHERE ae.topic_id = t.id AND ae.district_id = districtId AND (ae.verbatim_text ILIKE pattern OR ae.user_metadata->>'username' ILIKE pattern OR CONCAT('@', ae.user_metadata->>'username') ILIKE pattern OR ae.user_metadata->>'firstName' ILIKE pattern OR ae.user_metadata->>'lastName' ILIKE pattern OR CONCAT_WS(' ', ae.user_metadata->>'firstName', ae.user_metadata->>'lastName') ILIKE pattern))`
          - Search match badge derivation algorithm:
            - If `search` matches author username / name in evidence -> `'author'`,
            - Else if `search` matches evidence verbatim text -> `'evidence'`,
            - Else -> `null`.
          - Keyset cursor pagination predicate:
            - Decode cursor `decodeDistrictTopicKeysetCursor(cursor)`; throw `InvalidCursorError` (HTTP 400 `INVALID_CURSOR`) if malformed.
            - `date_trunc('milliseconds', tp.latest_meaningful_activity_timestamp) < cursorDate OR (date_trunc('milliseconds', tp.latest_meaningful_activity_timestamp) = cursorDate AND t.id < decoded.id)`
            - Order by `tp.latest_meaningful_activity_timestamp DESC, t.id DESC`.
            - Limit `limit + 1`.
        - Count total matching topics for the filtered scope (`SELECT count(*)::int ...`).
        - Map rows to `TopicCardItem[]` with ISO timestamps and formatted activity times.
        - Generate `nextCursor` if `hasNextPage`.
      - `getDistrictTopicEvidence(params: { districtId: string; topicId: string; query: TopicEvidenceQueryOutput }): Promise<TopicEvidenceResponse>`:
        - Delegate to `TopicEvidenceService.getTopicEvidence` with `{ id: 'product_owner', districtId, role: 'PRODUCT_OWNER' }`.
        - Ensure strict District boundary isolation and HTTP 404 on expired or foreign topic.
      - `getDistrictMahallas(districtId: string): Promise<string[]>`:
        - Validate `districtId` exists in `districts` table; throw 404 `DistrictNotFoundError` if missing.
        - Query distinct mahalla names from active topics or telegram group mappings for this district, sorted alphabetically in Uzbek Cyrillic (`Intl.Collator('uz-Cyrl')`).

- [x] **Task 3: Fastify HTTP Routes for District Topics (`apps/backend/src/modules/districts`)** (AC: 1, 2, 3, 5, 6)
  - [x] 3.1 In `apps/backend/src/modules/districts/district-topics-routes.ts` [NEW]:
    - Register encapsulated Fastify route plugin with:
      - `preHandler`: `verifyStateChangingOrigin` and `createRequireProductOwner(db)` (HTTP 401 unauthenticated, HTTP 403 Hokim).
      - `GET /api/v1/districts/:districtId/topics`:
        - Validate `:districtId` param (non-empty string; return 400 `DISTRICT_REQUIRED` if missing).
        - Validate query string with `DistrictTopicsQuerySchema`.
        - Return HTTP 200 with `DistrictTopicsPageResponse`.
      - `POST /api/v1/districts/:districtId/topics/search`:
        - Validate `:districtId` param.
        - Validate request body with `DistrictTopicsSearchBodySchema`.
        - Return HTTP 200 with `DistrictTopicsPageResponse` (safe POST search to avoid URL query string telemetry logging).
      - `GET /api/v1/districts/:districtId/topics/:topicId/evidence`:
        - Validate `:districtId` and `:topicId` params.
        - Validate query string with `TopicEvidenceQuerySchema`.
        - Call `districtTopicsService.getDistrictTopicEvidence`.
        - Return HTTP 200 with `TopicEvidenceResponse` or HTTP 404 (`NOT_FOUND`) with standard error envelope.
      - `GET /api/v1/districts/:districtId/topics/mahallas`:
        - Validate `:districtId` param.
        - Return distinct mahallas for the selected district (`{ mahallas: string[] }`).
      - Ensure strictly NO mutating endpoints exist on `/api/v1/districts/:districtId/topics/*`.
  - [x] 3.2 In `apps/backend/src/entrypoints/http.ts` [UPDATE]:
    - Import and register `registerDistrictTopicsRoutes(server, db)`.

- [x] **Task 4: Web API Client & TanStack Query Hooks (`apps/web/src/api`)** (AC: 1, 2, 3, 4, 5, 7, 8)
  - [x] 4.1 In `apps/web/src/api/district-topics-client.ts` [NEW]:
    - Implement `districtTopicsClient`:
      - `listTopics(districtId: string, filter: DistrictTopicsSearchBody, signal?: AbortSignal): Promise<DistrictTopicsPageResponse>`:
        - Calls `POST /api/v1/districts/${districtId}/topics/search` with JSON body.
      - `getTopicEvidence(districtId: string, topicId: string, query: TopicEvidenceQuery, signal?: AbortSignal): Promise<TopicEvidenceResponse>`:
        - Calls `GET /api/v1/districts/${districtId}/topics/${topicId}/evidence` with query params.
      - `listMahallas(districtId: string, signal?: AbortSignal): Promise<DistrictMahallasResponse>`:
        - Calls `GET /api/v1/districts/${districtId}/topics/mahallas`.
    - Implement TanStack Query hook `useDistrictTopics(districtId: string | null, filter: DistrictTopicsSearchBody)`:
      - Uses `useInfiniteQuery` with `queryKey: ['district-topics', districtId, filter]`.
      - `getNextPageParam: (lastPage) => lastPage.hasNextPage && lastPage.nextCursor ? lastPage.nextCursor : undefined`.
      - `initialPageParam: undefined`, `placeholderData: undefined`.
      - `enabled: Boolean(districtId)`.
      - `staleTime: 15_000`.
      - Passes `signal` from `queryFn` to client.
    - Implement TanStack Query hook `useDistrictTopicEvidence(districtId: string | null, topicId: string | null)`:
      - Uses `useInfiniteQuery` with `queryKey: ['district-topic-evidence', districtId, topicId]`.
      - `getNextPageParam: (lastPage) => lastPage.hasNextPage && lastPage.nextCursor ? lastPage.nextCursor : undefined`.
      - `initialPageParam: undefined`, `placeholderData: undefined`.
      - `enabled: Boolean(districtId && topicId)`.
    - Implement TanStack Query hook `useDistrictMahallas(districtId: string | null)`:
      - Uses `useQuery` with `queryKey: ['district-mahallas', districtId]`.
      - `enabled: Boolean(districtId)`.
    - Implement TanStack Query hook `useDistrictTopicEvidence(districtId: string | null, topicId: string | null)`:
      - Uses `useInfiniteQuery` with `queryKey: ['district-topic-evidence', districtId, topicId]`.
      - `getNextPageParam: (lastPage) => lastPage.hasNextPage && lastPage.nextCursor ? lastPage.nextCursor : undefined`.
      - `initialPageParam: undefined`, `placeholderData: undefined`.
      - `enabled: Boolean(districtId && topicId)`.
    - Implement TanStack Query hook `useDistrictMahallas(districtId: string | null)`:
      - Uses `useQuery` with `queryKey: ['district-mahallas', districtId]`.
      - `enabled: Boolean(districtId)`.

- [x] **Task 5: Frontend UI Components for District Topics & Evidence (`apps/web/src/components/districts/topics`)** (AC: 1, 2, 3, 4, 5, 7, 8, 9)
  - [x] 5.1 In `apps/web/src/components/districts/topics/DistrictTopicFilterBar.tsx` [NEW]:
    - Ant Design 5 filter bar component with:
      - Date scope select (Today, Yesterday, Custom date range with `Asia/Tashkent` calendar boundaries and presets),
      - Mahalla Select dropdown (populated from `useDistrictMahallas`),
      - Qualifying Lane Multi-Select tags (`WATER`, `ELECTRICITY`, `GAS`, `WASTE`, `HOKIM_RELATED`),
      - Debounced search input (300ms) with search icon, clear button, and loading spinner,
      - Reset filters button ("Фильтрларни тозалаш").
  - [x] 5.2 In `apps/web/src/components/districts/topics/DistrictTopicsTable.tsx` [NEW]:
    - Operational Ant Design Table / List:
      - Columns: Mahalla name, Derived topic summary, Calendar day, Lane tags (all qualifying lanes), Latest activity timestamp (`Asia/Tashkent` format `DD.MM.YYYY HH:mm`), Evidence count, Search match badge (`evidence` [blue], `author` [purple]), and "Далиллар" (View Evidence) action button,
      - Responsive layout and horizontal scroll on mobile (`scroll={{ x: 'max-content' }}`),
      - Keyset progressive loading "Кўпроқ юклаш" button with record counter (`${currentCount} тадан ${totalCount} та кўрсатилмоқда`),
      - Empty states: "Бугун ҳозирча мавзулар йўқ" / "Танланган шартлар бўйича мавзулар топилмади",
      - Accessible ARIA labels (`role="region"`, `aria-label="Туман мавзулари жадвали"`).
  - [x] 5.3 In `apps/web/src/components/districts/topics/DistrictTopicEvidenceDrawer.tsx` [NEW]:
    - Read-only Ant Design Drawer (responsive width: `screens.md ? 640 : '100%'`, `destroyOnClose={true}`):
      - Topic header: Summary, Mahalla, Calendar day, Lane tags, Latest activity, Total evidence count,
      - Anchor quote highlight card (if exists),
      - Chronological evidence trail (oldest to newest) using `EvidenceTimeline` / `EvidenceItem`,
      - Verbatim message text in original script, formatted Tashkent time (`DD.MM.YYYY HH:mm`), sanitized `@username` and display name, Telegram deep links,
      - Progressive loading for long evidence trails,
      - Close button and Escape key handling with focus restoration to triggering table row (`lastActiveElementRef.current?.focus()`),
      - Strictly NO edit/delete controls.
  - [x] 5.4 In `apps/web/src/components/districts/topics/DistrictTopicsView.tsx` [NEW]:
    - Combined operational troubleshooting view:
      - Mounts with `key={activeDistrictId}` to guarantee instantaneous state reset upon District switch,
      - District selection check: If no district selected, renders informational prompt guiding selection,
      - Header with active District name, status tag, total topic counter, and manual refresh trigger with spin feedback,
      - Stale cache banner when offline or refetch fails (`Alert` with last successful update timestamp),
      - Integrates `DistrictTopicFilterBar`, `DistrictTopicsTable`, and `DistrictTopicEvidenceDrawer`.
  - [x] 5.5 In `apps/web/src/pages/DistrictsPage.tsx` [UPDATE]:
    - Add tabbed view in `DistrictsPage.tsx` using Ant Design `<Tabs>`:
      - Tab 1: "Туманлар рўйхати" (Districts List),
      - Tab 2: "Мавзулар ва далиллар" (Topics & Evidence) rendering `DistrictTopicsView`,
      - Support tab switching via search params or direct click, and automatically switch to "Мавзулар ва далиллар" when user clicks "Кўриш" on an active district.

- [x] **Task 6: District Switching & Offline Cache Invalidation (`apps/web/src/district`)** (AC: 7, 8)
  - [x] 6.1 In `apps/web/src/district/district-context.tsx` [UPDATE / VERIFY]:
    - Verify that `executeSwitch` cancels and removes all `['district-topics', prevId]`, `['district-topic-evidence', prevId]`, and `['district-mahallas', prevId]` queries,
    - Verify that active search text and open drawer state reset immediately upon District switch.

- [x] **Task 7: Automated Integration & Component Tests** (AC: 11)
  - [x] 7.1 In `apps/backend/tests/district-topics.test.ts` [NEW]:
    - Setup test suite against isolated test DB `mahalla_ovozi_test` (port 5433):
      - Seed test Product Owner, test Hokim, District A and District B.
      - Seed test topics, projections, and accepted evidence with varied dates, mahallas, lanes, text, and author metadata.
    - Test scenarios:
      - 1. Authentication & Scoping: Product Owner can query with explicit `districtId`; missing `districtId` returns 400 `DISTRICT_REQUIRED`; unknown district returns 404 `DISTRICT_NOT_FOUND`; Hokim receives 403; unauthenticated receives 401.
      - 2. Cross-District Isolation: Cannot access District B topics using District A scope.
      - 3. Read-Only Canonical Topic Querying: Returns topic summary, mahalla, calendarDay, lanes, evidence count without rerunning AI.
      - 4. Lexical Plain-Text Search: Tests search matching summary, verbatim text, username, and author display name; tests wildcard escaping (`%`, `_`, `\`).
      - 5. POST Search Route: Verifies POST `/api/v1/districts/:districtId/topics/search` executes correctly without search text query string logging.
      - 6. Multi-parameter Filtering: Date scope (`today`, `yesterday`, `custom`), Mahalla filter, Lane filter.
      - 7. Verbatim Evidence Retrieval: Oldest-to-newest ordering (`originalTimestamp ASC, telegramMessageId ASC, id ASC`), sanitized author attribution, zero phone numbers.
      - 8. Expiry & Deletion: Expired topic returns 404.
      - 9. Keyset Pagination: Forward traversal with cursor decoding, malformed cursor rejection (HTTP 400 `INVALID_CURSOR`).
      - 10. Performance: Keyset query execution satisfies NFR2 targets.
  - [x] 7.2 In `apps/web/tests/unit/DistrictTopicsView.test.tsx` [NEW]:
    - Render `DistrictTopicsView` with mocked QueryClient and Ant Design App wrapper.
    - Test scenarios:
      - 1. Renders empty prompt when `activeDistrictId` is null.
      - 2. Renders topics table with summaries, mahallas, lane tags, timestamps, and search badges when district is selected.
      - 3. Filter changes update query parameters and trigger refetch.
      - 4. Search input debounces and sends search query.
      - 5. Clicking "Далиллар" opens `DistrictTopicEvidenceDrawer` with chronological timeline.
      - 6. Closing drawer restores focus to triggering row.
      - 7. District switch purges previous district data and closes drawer.
      - 8. Offline stale banner appears when offline with formatted last updated time.
      - 9. Verifies zero edit/delete controls in the DOM.

---

## Dev Notes

### Architecture Patterns and Constraints

- **Hexagonal Architecture (`AD-1`)**: Domain topic query and evidence inspection logic resides in `apps/backend/src/modules/topics/district-topics-service.ts`, decoupled from HTTP transport.
- **Database & Drizzle Ownership (`AD-3`, `AD-4`)**: Reuses existing tables `topics`, `topic_projections`, `accepted_evidence`, `district_telegram_groups`, and `districts` without adding redundant schemas or migrations.
- **District Scoping & Tenant Boundary (`AD-9`)**: Strict server-side validation ensures every query requires explicit `districtId`. Product Owner can inspect any active District by providing `districtId`, but missing/all-District queries for resident-bearing data are rejected with HTTP 400 (`DISTRICT_REQUIRED`).
- **Keyset / Cursor Pagination (`AD-10`)**: Keyset pagination for topics is based on `(latestMeaningfulActivityTimestamp, id)` and for evidence is based on `(originalTimestamp, telegramMessageId, id)` using `encodeKeysetCursor` / `decodeKeysetCursor`.
- **Privacy-Safe Lexical Search (`AD-9`, `AD-11`)**: Search is lexical/plain-text using SQL ILIKE with escaped wildcard characters (`%`, `_`, `\`). Search requests use POST request body to ensure search terms never enter routine HTTP access logs, metrics, or telemetry.
- **Privacy-Safe Sender Attribution (`AD-9`, `AD-11`)**: Sender identity is strictly limited to `@username` and display name (first/last name). Telegram user IDs, phone numbers, and internal secrets are completely excluded.
- **District-Switching Cache Invalidation (`AD-10`)**: Switching districts cancels in-flight queries, removes prior-district cached data from TanStack Query, and clears active search and drawer states before loading the new district.
- **Ant Design 5 Primary UI (`AD-2`)**: Ant Design 5 components (`Table`, `Card`, `Select`, `Input.Search`, `Tag`, `Drawer`, `Descriptions`, `Timeline`, `Typography`, `Button`, `Space`, `Flex`, `Alert`, `Tabs`) with design tokens via `theme.useToken()`, responsive drawer via `Grid.useBreakpoint()`, and feedback via `App.useApp()`.

### Keyset Cursor Structure & PostgreSQL Optimization

```typescript
// Topics Keyset Cursor (latest activity descending)
export interface DistrictTopicKeysetCursorPayload {
  t: string; // ISO datetime string of latestMeaningfulActivityTimestamp
  id: string; // topic id
}

// Evidence Keyset Cursor (chronological ascending)
export interface EvidenceKeysetCursorPayload {
  t: string; // ISO datetime string of originalTimestamp
  msgId: string; // telegramMessageId
  id: string; // evidence id
}
```

### Allowlisted Plain-Text Search Matching SQL Construction

```typescript
// Escaping wildcard characters for PostgreSQL ILIKE
function escapeLikePattern(input: string): string {
  return input.replace(/[%_\\]/g, '\\$&');
}

const pattern = `%${escapeLikePattern(trimmedSearch)}%`;

// SQL Predicate for District Plain-Text Search:
// 1. Topic derived summary
// 2. Accepted evidence verbatim text
// 3. Permitted Telegram username (@username and raw username)
// 4. Resident display name (firstName, lastName, fullName)
```

### Source Tree Components to Touch

#### [NEW]
- `packages/api-contracts/src/district-topics.ts`
- `apps/backend/src/modules/topics/district-topics-service.ts`
- `apps/backend/src/modules/districts/district-topics-routes.ts`
- `apps/backend/tests/district-topics.test.ts`
- `apps/web/src/api/district-topics-client.ts`
- `apps/web/src/components/districts/topics/DistrictTopicFilterBar.tsx`
- `apps/web/src/components/districts/topics/DistrictTopicsTable.tsx`
- `apps/web/src/components/districts/topics/DistrictTopicEvidenceDrawer.tsx`
- `apps/web/src/components/districts/topics/DistrictTopicsView.tsx`
- `apps/web/tests/unit/DistrictTopicsView.test.tsx`

#### [MODIFY]
- `packages/api-contracts/src/index.ts` (export district topics contracts)
- `apps/backend/src/entrypoints/http.ts` (register district topics routes)
- `apps/web/src/pages/DistrictsPage.tsx` (integrate DistrictTopicsView tab / section)
- `apps/web/src/district/district-context.tsx` (ensure query cache invalidation on district switch)

---

## Testing Standards Summary

- **Database Isolation Rule**: All automated integration tests MUST run strictly against the isolated test database (`mahalla_ovozi_test` on port 5433). Tests must never touch the active development database (`mahalla_ovozi`).
- **Vitest Suites**:
  - Backend integration: `apps/backend/tests/district-topics.test.ts`
  - Web unit/component: `apps/web/tests/unit/DistrictTopicsView.test.tsx`
- **Verification Gates**:
  - `pnpm --filter @mahalla-ovozi/api-contracts build`
  - `pnpm --filter @mahalla-ovozi/backend test`
  - `pnpm --filter @mahalla-ovozi/web test`
  - `pnpm check` (0 TypeScript compiler errors)

---

## Previous Story Intelligence

### Learnings from Stories 4.1, 4.2, 4.3, and 4.4:
1. **Strict Server-Side Scoping**: In Story 4.4, we enforced strict role authorization (`PRODUCT_OWNER`) and allowlisted search. In Story 4.5, explicit `districtId` scoping is mandatory; missing/all-District queries for resident-bearing Topic/Evidence data must return 400 (`DISTRICT_REQUIRED`).
2. **Search Term Privacy**: In Story 4.4, search query strings were excluded from routine logs and metrics. For Story 4.5, plain-text search uses POST request body to ensure search strings do not appear in HTTP server access logs or telemetry URLs.
3. **Deterministic Keyset Pagination**: Keyset cursor navigation using `(createdAt, id)` or `(latestMeaningfulActivityTimestamp, id)` tuples provides stable $O(\log N)$ seeks without pagination drift.
4. **Timezone Conversion Precision**: Uzbek local time is strictly `Asia/Tashkent` (+05:00). All calendar day inputs (`YYYY-MM-DD`) must be evaluated with `getTashkentDayBounds` / `getTashkentCalendarDay`.
5. **Drawer State & Focus Restoration**: All Ant Design Drawers must set `destroyOnClose={true}` and restore keyboard focus to the triggering element upon closing.

---

## Git Intelligence Summary

- Latest 5 commits:
  - `caa67cb`: `story 4.4 implementation has been reviewed and ready for next story 4.5 spec creation workflow`
  - `468a3fb`: `story 4.4 has been implemented and ready for code review workflow`
  - `6a5c604`: `story 4.3 implementation has been reviewed and ready for next story 4.4 spec creation workflow`
  - `af73220`: `story 4.3 has been implemented and ready for code review workflow`
  - `8322c15`: `story 4.3 spec has been created, reviewed and ready for next dev story workflow`
- Established conventions:
  - NodeNext runtime `.js` specifiers in imports for backend.
  - Zero `any` or loose type assertions.
  - Clean separation of shared contracts in `@mahalla-ovozi/api-contracts`.
  - 100% test passage across backend integration and web component suites.

---

## Latest Technical Information & Verified Stack Standards

- **Ant Design 5 (`5.24.2`)**:
  - **Operational Table**: Render `<Table pagination={false} scroll={{ x: 'max-content' }} />` and delegate pagination to a custom progressive Keyset footer displaying `${currentCount} тадан ${totalCount} та кўрсатилмоқда` and a "Кўпроқ юклаш" button with `loading={isFetchingNextPage}`.
  - **Responsive Drawer**: Use `const screens = Grid.useBreakpoint()` to apply `width={screens.md ? 640 : '100%'}`.
  - **Memory & DOM Lifecycle**: Always set `destroyOnClose={true}` on the Drawer to unmount child components, release timeline memory, and reset scroll position. Use `styles={{ body: ... }}` instead of deprecated `bodyStyle`.
  - **Focus Restoration**: Save triggering element in `lastActiveElementRef.current = e.currentTarget` prior to opening, and restore focus on drawer close (`lastActiveElementRef.current?.focus()`).
  - **Theming & Tokens**: Use `theme.useToken()` for container backgrounds (`token.colorBgContainer`, `token.colorBgLayout`) and borders (`token.colorBorderSecondary`).
  - **Accessible Badges**: Semantic tags with icons: evidence match (`<Tag color="blue" icon={<FileTextOutlined />}>Далил матни</Tag>`), author match (`<Tag color="purple" icon={<UserOutlined />}>Муаллиф</Tag>`), active status (`<Tag color="success" icon={<CheckCircleOutlined />}>Фаол</Tag>`).

- **TanStack React Query 5 (`5.66.9`)**:
  - **`useInfiniteQuery` Keyset Pattern**: In v5, `initialPageParam: undefined` is required. Extract next cursor via `getNextPageParam: (lastPage) => lastPage.hasNextPage && lastPage.nextCursor ? lastPage.nextCursor : undefined`.
  - **Stale Cache & Isolation**: Strictly omit `placeholderData: keepPreviousData` (set `placeholderData: undefined`) to prevent ghost data from rendering across District switches.
  - **Query Cancellation**: Pass `signal` from `queryFn: ({ signal }) => ...` into fetch client to abort in-flight network requests immediately.
  - **Atomic 2-Stage District Purge**: In `apps/web/src/district/district-context.tsx`, ensure District switches first `await queryClient.cancelQueries({ predicate })` before calling `queryClient.removeQueries({ predicate })`.

- **Fastify 5 (`5.2.1`) & `fastify-type-provider-zod` (`4.0.2`)**:
  - **Privacy-Preserving POST Search**: Route `POST /api/v1/districts/:districtId/topics/search` receives search strings via request body (`DistrictTopicsSearchBodySchema`), eliminating search terms from URL query parameters, HTTP web server access logs, reverse proxy traces, and APM telemetry.
  - **Plugin Encapsulation**: Guard routes with `scope.addHook('preHandler', verifyStateChangingOrigin)` and `scope.addHook('preHandler', createRequireProductOwner(db))`.
  - **V8 Monomorphic Shapes**: Leverages `server.decorateRequest('actor', undefined)` configured in `http.ts`.

- **Drizzle ORM (`0.45.2`) & PostgreSQL 16+ (`pg@8.13.3`)**:
  - **Boolean Disjunction with Millisecond Truncation**: Use `date_trunc('milliseconds', tp.latest_meaningful_activity_timestamp)` in keyset disjunction predicates to safely align JavaScript ISO strings (3 decimal digits) with PostgreSQL `timestamptz` (6 decimal digits) without cursor skipping.
  - **Wildcard Escaping**: Escape `%`, `_`, and `\` via `input.replace(/[%_\\]/g, '\\$&')` before wrapping with SQL ILIKE wildcards.
  - **JSONB Path Search**: Search allowlisted author metadata via `ae.user_metadata->>'username'`, `ae.user_metadata->>'firstName'`, and `ae.user_metadata->>'lastName'`.

---

## Project Structure Notes

- Alignment with unified project structure:
  - Shared contracts: `packages/api-contracts/src/district-topics.ts`
  - Backend modules: `apps/backend/src/modules/topics/district-topics-service.ts`, `apps/backend/src/modules/districts/district-topics-routes.ts`
  - Web UI: `apps/web/src/components/districts/topics/`, `apps/web/src/pages/DistrictsPage.tsx`
  - Tests: `apps/backend/tests/district-topics.test.ts`, `apps/web/tests/unit/DistrictTopicsView.test.tsx`
- No architectural conflicts or variances detected.

---

## References

- [Epic 4: Operational Health & Auditable Investigation](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/epics/epic-4.md#Story-4.5)
- [Architecture Spine](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/architecture/architecture-Mahalla-Ovozi-2026-08-12/ARCHITECTURE-SPINE.md) (`AD-1`, `AD-2`, `AD-3`, `AD-4`, `AD-9`, `AD-10`, `AD-11`)
- [Project Context for AI Agents](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/project-context.md)
- [UX Design Experience Specification](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/ux-designs/ux-Mahalla-Ovozi-2026-08-05/EXPERIENCE.md)
- [Topic Database Schema](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/backend/src/adapters/db/schema/topics.ts)
- [Accepted Evidence Schema](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/backend/src/adapters/db/schema/accepted-evidence.ts)
- [Topic Projections Schema](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/backend/src/adapters/db/schema/topic-projections.ts)
- [Topic Evidence Service](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/backend/src/modules/topics/topic-evidence-service.ts)

---

## Dev Agent Record

### Agent Model Used

Gemini 3.7 Flash (High)

### Debug Log References
- Keyset cursor timestamp millisecond alignment with PostgreSQL `timestamptz`.
- Vitest custom assertion patterns for Ant Design Drawers with `destroyOnClose={true}`.
- Database test isolation on `mahalla_ovozi_test` (port 5433).

### Completion Notes List
1. **Shared API Contracts (`@mahalla-ovozi/api-contracts`)**:
   - Created `DistrictTopicsQuerySchema`, `DistrictTopicsSearchBodySchema`, `DistrictTopicsPageResponseSchema`, `DistrictMahallasResponseSchema`.
   - Exported TypeScript interfaces and schemas from package entrypoint.
2. **Backend Operational Query Service & Guardrails (`@mahalla-ovozi/backend`)**:
   - Implemented `DistrictTopicsService` with deterministic keyset cursor pagination on `(latestMeaningfulActivityTimestamp, id)`.
   - Implemented privacy-safe lexical search over derived summary, evidence verbatim text, username, and author display names using SQL ILIKE with safe wildcard escaping.
   - Enforced strict single-district scoping (`districtId` required; cross-district data leakage blocked).
   - Enforced 90-day retention deadline check (`retentionExpiresAt > NOW()`) returning HTTP 404 for expired/deleted records.
   - Registered endpoints: `GET /api/v1/districts/:districtId/topics`, `POST /api/v1/districts/:districtId/topics/search`, `GET /api/v1/districts/:districtId/topics/:topicId/evidence`, `GET /api/v1/districts/:districtId/topics/mahallas`.
3. **Web API Client & Ant Design UI Components (`@mahalla-ovozi/web`)**:
   - Implemented `districtTopicsClient` and TanStack Query v5 hooks (`useDistrictTopics`, `useDistrictTopicEvidence`, `useDistrictMahallas`).
   - Created `DistrictTopicFilterBar` (date scope, mahalla dropdown, lane multi-select, debounced search, reset).
   - Created `DistrictTopicsTable` (keyset progressive loading, search match badges, evidence action button).
   - Created `DistrictTopicEvidenceDrawer` (chronological evidence trail, anchor quote highlight, sanitized attribution, zero mutating controls, keyboard focus restoration).
   - Created `DistrictTopicsView` (active district header, refresh trigger, offline stale banner).
   - Integrated tabbed navigation in `DistrictsPage.tsx` ("Туманлар рўйхати" and "Мавзулар ва далиллар").
4. **Testing & Verification**:
   - 20 of 20 backend integration tests passing against isolated test DB `mahalla_ovozi_test`.
   - 219 of 219 web unit/component tests passing across 38 test suites.
   - Full workspace `pnpm typecheck` passed with 0 compiler errors.

### File List
- `packages/api-contracts/src/district-topics.ts` [NEW]
- `packages/api-contracts/src/index.ts` [MODIFIED]
- `apps/backend/src/modules/topics/district-topics-service.ts` [NEW]
- `apps/backend/src/modules/topics/topic-evidence-service.ts` [MODIFIED]
- `apps/backend/src/modules/districts/district-topics-routes.ts` [NEW]
- `apps/backend/src/entrypoints/http.ts` [MODIFIED]
- `apps/backend/tests/district-topics.test.ts` [NEW]
- `apps/web/src/api/district-topics-client.ts` [NEW]
- `apps/web/src/components/districts/topics/DistrictTopicFilterBar.tsx` [NEW]
- `apps/web/src/components/districts/topics/DistrictTopicsTable.tsx` [NEW]
- `apps/web/src/components/districts/topics/DistrictTopicEvidenceDrawer.tsx` [NEW]
- `apps/web/src/components/districts/topics/DistrictTopicsView.tsx` [NEW]
- `apps/web/src/pages/DistrictsPage.tsx` [MODIFIED]
- `apps/web/tests/unit/DistrictTopicsView.test.tsx` [NEW]
- `_bmad-output/implementation-artifacts/4-5-browse-retained-district-topics-and-evidence-for-troubleshooting.md` [MODIFIED]
- `_bmad-output/implementation-artifacts/sprint-status.yaml` [MODIFIED]

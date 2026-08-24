---
baseline_commit: f795f9a
---

# Story 3.7: Search Current and Retained Topics Privately

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the **Hokim**,
I want to search retained Topic and evidence text within my current dashboard scope,
so that I can find a situation quickly without sending sensitive search text into persistent product or telemetry state.

---

## Acceptance Criteria

### 1. Lexical Search Scope & Exclusions (AC 1)
- **Given** an authenticated Hokim with active district scope (`actorContext.districtId`)
- **When** plain text is entered into the dashboard search control and ~400ms of typing idle time elapses (or explicit Enter is submitted)
- **Then** lexical search evaluates retained Topic summaries, Accepted Evidence verbatim text, and Telegram usernames / display names inside the active date (`today`, `yesterday`, or `custom`), Mahalla, and selected Lane filters
- **And** phone numbers are strictly excluded from search indexing, matching, query generation, and display
- **And** search is strictly ordinary server-evaluated lexical search (PostgreSQL parameterized `ILIKE` / substring matching), never AI semantic search, vector embeddings, RAG, automated reclassification, or historical reassessment.

### 2. Matching Text Highlighting & Contextual Match Badges (AC 2)
- **Given** a settled search produces matching Topic cards
- **When** the cards render on the 5-lane board
- **Then** if the visible Topic summary contains the query, the matching text is highlighted (using token `#F5DD77` background with `#0F172A` text) without truncating or altering the complete summary text
- **And** if the Topic matched only inside Accepted Evidence verbatim text (and not in the summary), the card displays the temporary badge `Далилда топилди` (`#FEF3C7` background, `#B45309` text, `#FDE68A` border)
- **And** if the Topic matched only in a Telegram username or display name (and neither in summary nor evidence text), the card displays the temporary badge `Фойдаланувчида топилди` (`#E0E7FF` background, `#4338CA` text, `#C7D2FE` border)
- **And** match badges never expose phone numbers or additional resident identity
- **And** clearing search immediately removes all highlight styling and temporary match badges.

### 3. Canonical Result Count & Scoped ARIA Live Announcement (AC 3)
- **Given** a search or combined search/filter scope successfully settles
- **When** its result announcement is evaluated
- **Then** the announced count represents the total distinct canonical Topics matching the complete successfully applied scope (`totalUniqueTopics`)
- **And** one Topic appearing in multiple selected Lanes contributes exactly once to this count
- **And** the count is derived from the complete server-side result set rather than browser-loaded page slices or Lane card appearances
- **And** the announcement is emitted through a scoped polite atomic live region (`<LiveRegionAnnouncer />`)
- **And** stale, in-flight, or superseded announcements from prior typing keystrokes or cancelled searches are discarded.

### 4. Rapid Input Debounce & Stale Response Cancellation (AC 4)
- **Given** rapid search input or rapid filter changes produce overlapping asynchronous requests
- **When** an earlier response finishes after a newer search request has been dispatched
- **Then** prior in-flight HTTP requests are aborted via `AbortController` where possible
- **And** obsolete results, counts, and pagination continuation states cannot overwrite the latest successfully applied search scope.

### 5. Request-Body Search Privacy & Ephemerality Contract (AC 5)
- **Given** raw search text is transmitted to the backend
- **When** a search request is dispatched
- **Then** search text is sent strictly in a validated JSON request body under same-origin POST endpoints:
  - `POST /api/v1/hokim/topics/board/search`
  - `POST /api/v1/hokim/topics/lane/search`
  - `POST /api/v1/hokim/topics/statistics/search`
- **And** raw search text **never** appears in URL path, URL query parameters (`location.search`), URL fragment, browser history (`pushState`), shareable links, recent/saved search suggestions, persistent browser storage (`localStorage` / `sessionStorage`), Audit History, analytics, telemetry, server access logs, traces, or raw error messages.

### 6. Session Termination & Ephemeral State Purging (AC 6)
- **Given** user sign-out, session expiry, 401 unauthenticated response, permission revocation, or District invalidation occurs
- **When** protected dashboard state is purged
- **Then** raw search text, input buffer, search query cache, and temporary match contexts are immediately cleared from memory alongside all other protected state.

### 7. Search Clear vs Full Filter Reset (AC 7)
- **Given** non-empty search text exists
- **When** the Hokim activates Search Clear (`Search Clear` button / input clear icon)
- **Then** only the search text and temporary match badges are cleared, restoring the unsearched board results for the active date, Mahalla, and Lane filter selections
- **And** when the Hokim activates `Фильтрларни тозалаш` (Reset Filters), all filters reset to `Бугун`, all permitted Mahallas, all five Lanes, AND empty search
- **And** zero separate History routes or search result subpages are introduced.

### 8. Search Empty & Lane-Local Empty Board States (AC 8)
- **Given** a successfully applied search returns zero matching canonical Topics across all selected Lanes
- **When** the board renders
- **Then** the board displays the neutral empty state `Танланган шартлар бўйича мавзулар топилмади` along with the `Фильтрларни тозалаш` action
- **And** selected Lane column headers remain visible
- **And** when only specific Lanes have no matches while others do, the empty Lanes display the local message `Мос мавзу топилмади`
- **And** statistics display truthful zero and fallback calculations for the searched result set without invented or misleading numbers.

### 9. Search State Preservation on Evidence Detail Navigation (AC 9)
- **Given** the Hokim opens Topic Evidence Detail from a searched result card
- **When** the Hokim returns to the dashboard (closing the drawer on desktop or navigating Back on mobile)
- **Then** the active in-memory search text, match badges, applied filters, and board/lane scroll context are preserved
- **And** manual or background refresh uses the currently applied search scope.

### 10. Search Failure Handling & Safe Retry Promotion (AC 10)
- **Given** an in-flight search request encounters a network error or 5xx server failure
- **When** the failure is handled
- **Then** the failure is **not** converted into a false empty result (`Танланган шартлар бўйича мавзулар топилмади`)
- **And** the last successful permitted results remain visible on the board
- **And** the requested search remains clearly distinguishable as requested but not yet applied
- **And** a scoped sanitized error banner with `Қайта уриниш` (Retry) is displayed
- **And** activating `Қайта уриниш` re-executes the search and, upon success, promotes the results to the active applied scope.

### 11. Visual Styling, Accessibility Floor & Reduced Motion (AC 11)
- **Given** search controls, highlighted text, and match badges render across responsive viewports (including 320px mobile and 200% zoom)
- **When** user interaction occurs
- **Then** search inputs and clear triggers maintain a minimum 44px touch target floor and visible high-contrast focus rings (`outline: 2px solid #0284C7`)
- **And** highlight colors meet WCAG AA contrast against card backgrounds
- **And** Cyrillic text does not clip or overflow horizontally
- **And** animations and transitions execute immediately under `prefers-reduced-motion: reduce`.

### 12. Automated Backend & Frontend Verification (AC 12)
- **Given** Story 3.7 is verified under the automated test suite
- **When** backend integration tests and frontend Vitest component tests run
- **Then** tests cover:
  1. Backend lexical search matches summary, verbatim evidence, and Telegram username/display names in PostgreSQL while strictly ignoring phone numbers.
  2. Backend endpoints (`POST .../search`) enforce Zod schema validation and reject invalid or unauthenticated requests.
  3. Frontend debounces typing (~400ms) and dispatches POST search requests with the JSON body.
  4. Search text is never synchronized to `window.location.search` or `localStorage`.
  5. Matching summaries render highlights; evidence-only matches render `Далилда топилди`; identity-only matches render `Фойдаланувчида топилди`.
  6. Search Clear clears only search text; `Фильтрларни тозалаш` clears search and resets all filters.
  7. ARIA live region announces distinct canonical topic count once per settled search.
  8. Search failure retains prior results and retry successfully updates the board.
  9. All automated backend tests strictly execute against isolated `mahalla_ovozi_test`.

---

## Tasks / Subtasks

- [x] **Task 1: API Contracts for Search Endpoints & Match Badges** (AC: 1, 2, 5)
  - [x] 1.1 In `packages/api-contracts/src/topics.ts`, define `SearchMatchBadgeSchema = z.enum(['evidence', 'author'])` and export `SearchMatchBadge`.
  - [x] 1.2 Update `TopicCardItemSchema` to include `searchMatchBadge: SearchMatchBadgeSchema.nullable().optional()`.
  - [x] 1.3 Define `HokimTopicBoardSearchBodySchema` extending board filter fields with `search: z.string().trim().max(200, 'Қидирув сўзи 200 та белгидан ошмаслиги керак').optional()`, including `.superRefine` for `dateScope === 'custom'` validation (`dateFrom <= dateTo`). Export `HokimTopicBoardSearchBody` and `HokimTopicBoardSearchBodyOutput`.
  - [x] 1.4 Define `HokimLaneSearchBodySchema` extending lane filter fields with `search: z.string().trim().max(200, 'Қидирув сўзи 200 та белгидан ошмаслиги керак').optional()`, cursor and limit fields. Export `HokimLaneSearchBody` and `HokimLaneSearchBodyOutput`.
  - [x] 1.5 Define `HokimTopicStatisticsSearchBodySchema` extending statistics filter fields with `search: z.string().trim().max(200, 'Қидирув сўзи 200 та белгидан ошмаслиги керак').optional()`, including `.superRefine` for custom date validation. Export `HokimTopicStatisticsSearchBody` and `HokimTopicStatisticsSearchBodyOutput`.
  - [x] 1.6 Export all search schemas and types in `packages/api-contracts/src/index.ts`.

- [x] **Task 2: Backend Lexical Search Implementation in HokimTopicService** (AC: 1, 2, 5, 8, 12)
  - [x] 2.1 In `apps/backend/src/modules/topics/hokim-topic-service.ts`, implement `escapeLikePattern(input: string): string` escaping SQL wildcards (`%`, `_`, `\`) as `\\$1` to prevent query distortion and PostgreSQL error 22025 (`LIKE pattern must not end with escape character`).
  - [x] 2.2 Update `HokimTopicBoardFilterParams`, `HokimLaneQueryParams`, `queryLaneData`, `countLaneTopics`, and `getStatistics` to accept optional `search?: string`. If `search` is whitespace-only, treat it as empty/unsearched.
  - [x] 2.3 Construct parameterized PostgreSQL SQL search predicates:
    - Escaped ILIKE pattern on `tp.summary` (`%${escapeLikePattern(trimmedSearch)}%`).
    - `EXISTS` subquery on `accepted_evidence ae` matching `ae.verbatim_text ILIKE pattern`.
    - `EXISTS` subquery on `accepted_evidence ae` matching `ae.user_metadata->>'username' ILIKE pattern`, `CONCAT('@', ae.user_metadata->>'username') ILIKE pattern`, `ae.user_metadata->>'firstName' ILIKE pattern`, `ae.user_metadata->>'lastName' ILIKE pattern`, or `CONCAT_WS(' ', ae.user_metadata->>'firstName', ae.user_metadata->>'lastName') ILIKE pattern`.
    - Ensure phone numbers and resident identifiers are strictly excluded from all matching conditions.
  - [x] 2.4 Compute `searchMatchBadge`:
    - When search is active:
      `CASE WHEN tp.summary ILIKE pattern THEN NULL WHEN EXISTS (ae.verbatim_text ...) THEN 'evidence' WHEN EXISTS (ae.user_metadata ...) THEN 'author' ELSE NULL END AS "searchMatchBadge"`.
    - When search is inactive: `NULL::text AS "searchMatchBadge"`.
  - [x] 2.5 Update `getStatistics` query to filter `filtered_topics` CTE by the search predicate and compute accurate `total_unique_topics` across all matching topics.
  - [x] 2.6 Update `countLaneTopics` query to include the search predicate.

- [x] **Task 3: Backend Search POST Routes & Validation** (AC: 5, 12)
  - [x] 3.1 In `apps/backend/src/modules/topics/hokim-topics-routes.ts`, register:
    - `POST /api/v1/hokim/topics/board/search` with `HokimTopicBoardSearchBodySchema`.
    - `POST /api/v1/hokim/topics/lane/search` with `HokimLaneSearchBodySchema`.
    - `POST /api/v1/hokim/topics/statistics/search` with `HokimTopicStatisticsSearchBodySchema`.
  - [x] 3.2 Ensure origin guard (`verifyStateChangingOrigin`) and `createRequireHokim` are applied.
  - [x] 3.3 Ensure error responses use static sanitized Uzbek Cyrillic messages and never echo unvalidated raw search text in error responses or logs.

- [x] **Task 4: Frontend API Client & Search Methods** (AC: 4, 5)
  - [x] 4.1 In `apps/web/src/topics/hokim-topics-client.ts`, add POST search methods:
    - `searchBoard(body: HokimTopicBoardSearchBody, signal?: AbortSignal)`
    - `searchLane(body: HokimLaneSearchBody, signal?: AbortSignal)`
    - `searchStatistics(body: HokimTopicStatisticsSearchBody, signal?: AbortSignal)`
  - [x] 4.2 In `useHokimTopicBoard.ts` and `useTopicStatistics.ts`:
    - Conditionally invoke the POST search endpoints when `search` text is non-empty, passing the query in the request body and forwarding the TanStack Query `signal` for automatic cancellation of superseded in-flight searches.
    - When paginating a lane via `loadMore`, call `searchLane` if search query is active so pagination continuation remains bound to the active searched scope.
  - [x] 4.3 Configure `placeholderData: keepPreviousData` on board and stats queries to prevent UI flickering while debounced search requests are in-flight.

- [x] **Task 5: Search UI Controls & Debounce in Toolbar and FilterBar** (AC: 1, 4, 7, 11)
  - [x] 5.1 In `apps/web/src/components/topics/DashboardSearchInput.tsx`:
    - Build an accessible search input using Ant Design `Input` with search icon (`SearchOutlined`), clear trigger (`allowClear`), placeholder `Мавзу ёки далил бўйича қидирув...`, and `aria-label="Мавзулар ва далиллар бўйича қидирув"`.
    - Implement ~400ms debounce using internal timer before settling search query.
    - Support immediate submission on `Enter` key.
  - [x] 5.2 Mount `DashboardSearchInput` inside `FilterBar.tsx` (desktop) and `BoardToolbar.tsx` / `FilterModalSheet.tsx` (mobile).
  - [x] 5.3 Add `Search Clear` trigger that resets only search text, leaving date/Mahalla/Lane filters active.

- [x] **Task 6: Highlighted Summary & Match Badge Rendering on TopicCard** (AC: 2, 11)
  - [x] 6.1 In `apps/web/src/components/topics/HighlightText.tsx`, build a safe text highlighting component:
    - Case-insensitive substring matching in Uzbek Cyrillic / Latin with escaped regex characters (`query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`).
    - Wraps matches in `<mark>` styled with `backgroundColor: '#F5DD77'`, `color: '#0F172A'`, `padding: '0 2px'`, `borderRadius: 2`, preserving zero layout shift.
    - Preserves full summary text without clamping or truncation.
  - [x] 6.2 In `apps/web/src/components/topics/TopicCard.tsx`:
    - Use `HighlightText` for `topic.summary` when `searchQuery` is active.
    - Render `Далилда топилди` tag when `topic.searchMatchBadge === 'evidence'`.
    - Render `Фойдаланувчида топилди` tag when `topic.searchMatchBadge === 'author'`.

- [x] **Task 7: Dashboard State Coordination & Announcer** (AC: 3, 4, 6, 7, 8, 9, 10)
  - [x] 7.1 In `apps/web/src/pages/HokimDashboardPage.tsx`:
    - Manage ephemeral `searchQuery` and `debouncedSearchQuery` state in-memory (strictly omitted from URL).
    - Wire search query to `useHokimTopicBoard` and `useTopicStatistics`.
    - Guard against stale placeholder transitions when announcing counts (`if (isFetching || isPlaceholderData) return;`).
    - Announce distinct canonical topic count via `liveAnnouncer`:
      - Matches > 0: `Қидирув бўйича ${count} та мос мавзу топилди`.
      - Matches == 0: `Танланган шартлар бўйича мавзулар топилмади`.
    - Update `resetFilters` to also clear search query.
    - Handle search errors gracefully with error banner and `Қайта уриниш` button without clearing prior board data.
    - Preserve search query when opening/closing Topic Evidence Drawer.

- [x] **Task 8: Automated Tests & Verification** (AC: 12)
  - [x] 8.1 In `apps/backend/tests/integration/hokim-topic-search.test.ts`:
    - Test lexical search across summary, evidence verbatim text, and user display names strictly against `mahalla_ovozi_test`.
    - Verify phone number exclusion from search results.
    - Verify POST `/api/v1/hokim/topics/board/search`, `/lane/search`, and `/statistics/search` Zod body validation and 401 unauthenticated guard.
    - Verify `searchMatchBadge` calculation (`'evidence'`, `'author'`, `null`).
  - [x] 8.2 In `apps/web/tests/unit/DashboardSearch.test.tsx` and `apps/web/tests/unit/TopicCard.test.tsx`:
    - Verify debounced search input behavior (~400ms) and clear button.
    - Verify summary highlighting and contextual match badge rendering (`Далилда топилди`, `Фойдаланувчида топилди`).
    - Verify search text is never written to `window.location.search` or `localStorage`.
    - Verify ARIA live region atomic announcements.
    - Verify search retry and error handling.
  - [x] 8.3 Run full verification: `pnpm --filter @mahalla-ovozi/backend test`, `pnpm --filter @mahalla-ovozi/web test`, and `pnpm typecheck`.

### Review Findings

- [x] [Review][Patch] PostgreSQL null username @-search match & district index pruning [`apps/backend/src/modules/topics/hokim-topic-service.ts:472`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/backend/src/modules/topics/hokim-topic-service.ts#L472)
- [x] [Review][Patch] TanStack Query v5 placeholderData district scoping in useHokimTopicBoard [`apps/web/src/topics/useHokimTopicBoard.ts:109`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/src/topics/useHokimTopicBoard.ts#L109)
- [x] [Review][Patch] Debounce timer race condition on external value reset [`apps/web/src/components/topics/DashboardSearchInput.tsx:28`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/src/components/topics/DashboardSearchInput.tsx#L28)
- [x] [Review][Patch] Stale count announcement guard on concurrent board/statistics fetching [`apps/web/src/pages/HokimDashboardPage.tsx:77`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/src/pages/HokimDashboardPage.tsx#L77)
- [x] [Review][Patch] Screen reader announcement phrasing alignment with story specification [`apps/web/src/hooks/useLiveAnnouncer.ts:32`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/src/hooks/useLiveAnnouncer.ts#L32)
- [x] [Review][Patch] HighlightText null/undefined string protection & useMemo regex optimization [`apps/web/src/components/topics/HighlightText.tsx:14`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/src/components/topics/HighlightText.tsx#L14)
- [x] [Review][Patch] Accessible button role and aria-pressed for interactive TopicCard [`apps/web/src/components/topics/TopicCard.tsx:50`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/src/components/topics/TopicCard.tsx#L50)
- [x] [Review][Patch] Explicit test assertions for phone number exclusion, @-search null safety, and search privacy invariants [`apps/backend/tests/hokim-topic-search.test.ts:338`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/backend/tests/hokim-topic-search.test.ts#L338)
- [x] [Review][Defer] GIN trigram / text search indexing for large-volume JSONB evidence text queries [`apps/backend/src/modules/topics/hokim-topic-service.ts:471`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/backend/src/modules/topics/hokim-topic-service.ts#L471) — deferred, pre-existing database indexing scope

---

## Dev Notes

### Relevant Architecture Patterns & Invariants
- **AD-03 (District Boundary & Tenant Isolation)**: Search queries strictly scope to `actorContext.districtId`. No cross-district search results are ever returned.
- **AD-09 (Private Search & Privacy Invariant)**: **Search text is strictly ephemeral**. Raw search text must **never** appear in URL query parameters, URL path, fragment, browser history (`pushState`), shareable links, `localStorage`/`sessionStorage`, audit logs, telemetry, or server error messages. Sign out or session termination purges search state immediately.
- **AD-10 (Same-Origin REST Contracts & Fastify Zod Validation)**: Search payloads are transmitted via validated same-origin POST request bodies with server-side parameterized SQL `ILIKE` matching across topic summaries, accepted evidence verbatim text, and Telegram usernames/display names. Phone numbers are strictly excluded.

### Design System & Token Specifications (`DESIGN.md` & `EXPERIENCE.md`)
- **Search Highlight**: Background `#F5DD77`, text `#0F172A`, border-radius 2px.
- **Match Badges**:
  - `Далилда топилди`: Background `#FEF3C7`, text `#B45309`, border `#FDE68A`, font-size 11px, font-weight 500.
  - `Фойдаланувчида топилди`: Background `#E0E7FF`, text `#4338CA`, border `#C7D2FE`, font-size 11px, font-weight 500.
- **Empty States**:
  - Entire board with zero matches: `Танланган шартлар бўйича мавзулар топилмади` with `Фильтрларни тозалаш`.
  - Individual empty Lane: `Мос мавзу топилмади`.
- **Search Input**: Height 40px (desktop) / 44px (touch), border `1px solid #E2E8F0`, focus ring `2px solid #0284C7`.
- **Reduced Motion**: Immediate focus and modal/search transitions without sliding animations.

### Negative Guardrails & Prohibited Additions
1. **NO AI Semantic Search / RAG**: Ordinary lexical substring matching only. Zero vector databases, zero AI embeddings, zero AI question answering.
2. **NO Phone Number Matching or Display**: Phone numbers must never be indexed, queried, matched, or exposed.
3. **NO URL Search Parameter Sync**: Search query must never appear in `window.location.search` or `history.pushState`.
4. **NO Search Persistence**: Never store search text in `localStorage`, `sessionStorage`, or recent search lists.
5. **NO Separate History / Search Subpage**: All search results render directly on the unified 5-lane board.

### Database & Environment Isolation
- All automated backend tests interacting with PostgreSQL must strictly execute against `mahalla_ovozi_test`, never `mahalla_ovozi`.

---

## Project Structure Notes

### Alignment with Unified Project Structure
```
packages/api-contracts/src/
├── topics.ts                         # UPDATE: Add search schemas & searchMatchBadge
└── index.ts                          # UPDATE: Re-export new search schemas & types

apps/backend/src/
└── modules/topics/
    ├── hokim-topic-service.ts        # UPDATE: Add lexical search & match badge SQL
    └── hokim-topics-routes.ts        # UPDATE: Register POST search routes with Zod validation

apps/web/src/
├── components/topics/
    ├── FilterBar.tsx                 # UPDATE: Mount search input & clear trigger
    ├── HighlightText.tsx             # NEW: Reusable text highlighter for summary matches
    └── TopicCard.tsx                 # UPDATE: Highlight summary & render match badges
├── topics/
    ├── hokim-topics-client.ts        # UPDATE: Add POST search client methods
    └── useHokimTopicBoard.ts         # UPDATE: Support search query in board fetcher
    └── useTopicStatistics.ts         # UPDATE: Support search query in stats fetcher
└── pages/
    └── HokimDashboardPage.tsx        # UPDATE: Ephemeral in-memory search state, retry & live announcer

apps/backend/tests/
└── hokim-topic-search.test.ts        # NEW: Integration tests for lexical search & privacy

apps/web/tests/unit/
└── DashboardSearch.test.tsx          # NEW: Unit tests for debounced search, badges & privacy
```

---

## Dev Agent Record

### Agent Model Used
- Gemini 3.7 Flash

### Debug Log References
- All vitest and integration test runs executed against `mahalla_ovozi_test`.

### Completion Notes List
- Completed Story 3.7 implementation and thorough BMAD Adversarial Code Review workflow (`bmad-code-review`).
- All 8 code review patches applied and verified:
  1. PostgreSQL NULL username `@`-search bug fixed with `IS NOT NULL` guard and `ae.district_id` pruning.
  2. TanStack Query v5 `placeholderData` scoped to `districtId` in `useHokimTopicBoard`.
  3. Search input debounce timer cleared on external reset.
  4. Live announcer concurrency race condition guarded against `isStatsFetching`.
  5. Live announcer phrasing aligned with story specification.
  6. `HighlightText` null-guarded and regex-memoized.
  7. `TopicCard` equipped with `role="button"` and `aria-pressed`.
  8. Automated integration and unit tests expanded for phone number exclusion, `@`-search null safety, and privacy invariants.
- Full monorepo typecheck passed with 0 errors.

### File List
- `packages/api-contracts/src/topics.ts`
- `apps/backend/src/modules/topics/hokim-topic-service.ts`
- `apps/backend/src/modules/topics/hokim-topics-routes.ts`
- `apps/backend/tests/hokim-topic-search.test.ts`
- `apps/web/src/topics/hokim-topics-client.ts`
- `apps/web/src/topics/useHokimTopicBoard.ts`
- `apps/web/src/topics/useTopicStatistics.ts`
- `apps/web/src/components/topics/DashboardSearchInput.tsx`
- `apps/web/src/components/topics/HighlightText.tsx`
- `apps/web/src/components/topics/TopicCard.tsx`
- `apps/web/src/components/topics/FilterBar.tsx`
- `apps/web/src/components/topics/FilterModalSheet.tsx`
- `apps/web/src/components/topics/FiveLaneBoard.tsx`
- `apps/web/src/components/topics/LaneColumn.tsx`
- `apps/web/src/hooks/useLiveAnnouncer.ts`
- `apps/web/src/pages/HokimDashboardPage.tsx`
- `apps/web/tests/unit/DashboardSearch.test.tsx`


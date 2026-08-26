---
baseline_commit: 6a5c604
---

# Story 4.4: Inspect Immutable Searchable Audit History

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the **Product Owner**,  
I want to search and filter an immutable audit log of administrative actions, security events, issue transitions, and retry executions,  
So that I can verify operational history, investigate security events, and demonstrate governance compliance.

---

## Acceptance Criteria

1. **Strict Reverse Chronological & Deterministic Order (AC 1)**:
   - Given an authenticated Product Owner navigates to Audit History in the Console (`/audit-history`),
   - When the audit log loads,
   - Then records are presented in strict reverse chronological order (newest first) based on their authoritative event timestamp (`createdAt`),
   - And records with identical timestamps use a deterministic secondary sort by unique audit record ID (`id DESC`),
   - And the log displays the event timestamp, actor (Product Owner, District Hokim, or canonical system actor e.g. `SYSTEM`, `SYSTEM_HEALTH_EVALUATOR`, `SYSTEM_RECOVERY_ENGINE`), affected District/scope (`districtId`, `districtName` or Global), action category, action name, outcome (`SUCCESS`, `FAILURE`), and safe summary metadata,
   - And an event's permitted supplied reason (`metadata.reason` / `reason`) is retained and displayed when one exists,
   - And relevant old and new non-secret values (`metadata.previousState` / `previousValues`, `metadata.newState` / `newValues`) are retained and displayed for applicable state/configuration changes rather than being reduced to a lossy summary,
   - And raw resident message content, credentials, tokens, AI context, secrets, and raw upstream errors are strictly excluded from audit records and old/new value fields.

2. **Multi-Parameter Filtering & Safe Metadata Search (AC 2)**:
   - Given the Product Owner filters or searches Audit History,
   - When criteria are applied,
   - Then filtering is supported by:
     - District scope (`districtId`: specific District UUID, `'global'` for platform-only events where `district_id IS NULL`, or omitted for all),
     - Date range (`startDate` and `endDate`, evaluated strictly in `Asia/Tashkent` calendar days from `00:00:00.000` to `23:59:59.999` in `+05:00`; single-sided and two-sided ranges supported; inverted dates `startDate > endDate` rejected with HTTP 400),
     - Action category (`category`: `AUTH_SECURITY`, `DISTRICT_ADMINISTRATION`, `HOKIM_MANAGEMENT`, `TELEGRAM_INTEGRATION`, `OPERATIONAL_LIFECYCLE`),
     - Actor role / type (`actorRole`: `PRODUCT_OWNER`, `DISTRICT_HOKIM`, `SYSTEM`),
     - Outcome (`outcome`: `SUCCESS`, `FAILURE`),
     - Action name (`action`: specific action string),
   - And free-text search is strictly restricted to an allowlist of privacy-safe operational metadata fields:
     - Audit record ID, Actor ID, District ID, Action name, Category name, Sanitized error codes / reasons, and Safe target IDs (`issueId`, `botUsername`, `groupId`, `chatId`, `retryTrackingId`),
   - And search terms have SQL wildcard characters (`%`, `_`, `\`) safely escaped to prevent wildcard injection or full-table scan bypasses,
   - And the Product Owner's search text itself is excluded from routine logs, metrics, traces, and audit payloads (preventing recursive audit logging or query string leakage).

3. **High Performance & Keyset Pagination (AC 3)**:
   - Given the Product Owner searches or filters large audit collections,
   - When queries execute,
   - Then response times satisfy the applicable 2-second NFR2 target for at least 95% of requests,
   - And pagination uses deterministic keyset/cursor pagination based on the `(createdAt, id)` tuple with `encodeKeysetCursor` and `decodeKeysetCursor` rather than offset-based skipping or snapshot subsystems,
   - And direction is supported via `forward` (next page) and `backward` (previous page),
   - And malformed or un-decodable cursor tokens are safely rejected with HTTP 400 Bad Request rather than triggering silent page drift,
   - And new records arriving above the current cursor do not reshuffle or duplicate previously loaded pages.

4. **Read-Only Detail View & Complete Immutability (AC 4)**:
   - Given the Product Owner inspects an individual audit record,
   - When detail is opened,
   - Then the detail view presents the complete privacy-safe event metadata in a read-only Ant Design Drawer (or full-screen modal/drawer on mobile viewports <= 768px),
   - And displays event ID with one-click copy, formatted Tashkent timestamp, actor identity and role tag, client IP address and user agent (sanitized), affected district, action name, action category, outcome badge, supplied reason, old/new changes comparison table, and structured metadata viewer,
   - And closing the detail view preserves the exact filter, pagination cursor, and table scroll position, restoring keyboard focus to the triggering element,
   - And no edit or delete controls exist anywhere in the interface or API contracts (audit log is strictly append-only and immutable).

5. **Shared API Contracts & Zod Schemas (AC 5)**:
   - Given audit data crosses module, API, and browser boundaries,
   - When Audit History contracts are defined,
   - Then record models, permitted supplied-reason fields, relevant old/new non-secret value fields, filter parameters, keyset cursor formats, and search contracts are project-owned shared Zod contracts extending Epic 4's contract boundary (`packages/api-contracts/src/audit.ts` exported via `packages/api-contracts/src/index.ts`),
   - And unknown action categories, invalid date formats, inverted date ranges, unsafe old/new values, and unsafe query parameters are rejected safely with structured HTTP 400 Bad Request error envelopes.

6. **Dedicated Ant Design 5 UI in Product Owner Console (AC 6)**:
   - Given an authenticated Product Owner navigates to `/audit-history`,
   - When the page renders,
   - Then it renders a polished Ant Design 5 interface replacing the placeholder:
     - Header with title `Аудит тарихи`, subheader description, and manual refresh trigger with spin feedback,
     - Interactive filter bar containing District Select (All / Global / District list), Tashkent DateRangePicker (with quick presets "Бугун", "Охирги 7 кун", "Охирги 30 кун"), Category Select, Actor Role Select, Outcome Select, Debounced Search input (300ms), and Reset Filters button,
     - Audit Events Table with sortable column headers, styled Actor tags (`PRODUCT_OWNER` [blue], `DISTRICT_HOKIM` [green], `SYSTEM` [purple]), Outcome tags (`SUCCESS` [green], `FAILURE` [red]), localized Action labels, copyable record ID, and "Тафсилот" (Details) action,
     - Keyset pagination controls ("Олдинги" / "Кейинги" buttons with hasPrevPage/hasNextPage states and current record count display),
     - Accessible ARIA labels (`aria-label="Аудит тарихи жадвали"`, `role="region"`),
     - Responsive mobile layout adapting drawer to 100% width and table columns gracefully.

7. **Tashkent Timezone Accuracy (`Asia/Tashkent`) (AC 7)**:
   - Given date filters or event timestamps are processed,
   - When date conversions occur,
   - Then calendar day inputs (`YYYY-MM-DD`) are interpreted strictly in Uzbekistan local time (`Asia/Tashkent`, UTC+5) for database filtering boundaries:
     - `startDate: 2026-08-01` -> `2026-07-31T19:00:00.000Z`
     - `endDate: 2026-08-01` -> `2026-08-01T18:59:59.999Z`
   - And UI displays event timestamps formatted in `Asia/Tashkent` (`YYYY-MM-DD HH:mm:ss`).

8. **Tenant & Role Authorization Guardrails (AC 8)**:
   - Given a request is made to the audit API (`/api/v1/audit/*`),
   - When the backend authenticates the actor,
   - Then access is granted exclusively to authenticated Product Owners (`actorRole: 'PRODUCT_OWNER'`),
   - And Hokims or unauthenticated callers are rejected with HTTP 403 Forbidden / 401 Unauthorized,
   - And District filtering allows the Product Owner to inspect all districts, global-only platform events, or filter by a specific valid district.

9. **Privacy-Safe Redaction & Zero Leaks (AC 9)**:
   - Given audit events and metadata are persisted or retrieved,
   - When records are serialized for the client,
   - Then sensitive keys (`password`, `bottoken`, `apikey`, `secret`, `authorization`, `cookie`, `sessiontoken`, `temporarypassword`) and patterns (Telegram bot tokens, OpenAI/Gemini API keys, bearer tokens) are scrubbed via `sanitizeMetadata` and `redactStringValue`,
   - And raw resident message text, resident-bearing AI context, and raw stack traces are never exposed in audit payloads or old/new value fields.

10. **Offline & Network Resilience Guardrails (AC 10)**:
    - Given the Product Owner loses network connectivity while browsing Audit History,
    - When an ordinary background refresh or query fails due to network outage,
    - Then already loaded audit events remain visible read-only with a persistent stale warning banner showing the last successful fetch time,
    - And search/filter triggers while offline inform the user without crashing the UI,
    - And reconnection revalidates session before refreshing.

11. **Automated Verification & Definition of Done (AC 11)**:
    - Given Story 4.4 is verified,
    - When focused automated and browser checks run,
    - Then backend integration tests against `mahalla_ovozi_test` (port 5433) cover:
      - Append-only immutability (absence of mutating POST/PUT/PATCH/DELETE endpoints),
      - Reverse chronological ordering (`createdAt DESC, id DESC`),
      - Keyset/cursor pagination (forward, backward, cursor decoding, page boundaries, malformed cursor 400 rejection),
      - Multi-parameter filtering (district, global-only, date range in `Asia/Tashkent`, category, actorRole, outcome, action),
      - Allowlisted safe metadata search with ILIKE wildcard escaping,
      - Sensitive data scrubbing and redaction in metadata and old/new values,
      - Tenant & role authorization (Product Owner allowed, Hokim forbidden, unauthenticated rejected),
      - Query performance under NFR2 2-second target.
    - And web component tests cover:
      - Table rendering with correct localized tags and timestamps,
      - Filter bar interaction and query parameter updates,
      - Keyset pagination forward/backward click handling,
      - Detail drawer opening, data presentation, copy action, and closing with preserved state and focus restoration,
      - Keyboard accessibility and responsive layout behavior,
      - Zero edit or delete controls.

---

## Tasks / Subtasks

- [x] **Task 1: Shared API Contracts & Zod Schemas (`packages/api-contracts`)** (AC: 1, 2, 3, 5)
  - [x] 1.1 In `packages/api-contracts/src/audit.ts` [NEW]:
    - Define and export `AuditActionCategoryEnumSchema`:
      - Enum values: `AUTH_SECURITY`, `DISTRICT_ADMINISTRATION`, `HOKIM_MANAGEMENT`, `TELEGRAM_INTEGRATION`, `OPERATIONAL_LIFECYCLE`.
    - Define and export `AuditActionOutcomeEnumSchema`:
      - Enum values: `SUCCESS`, `FAILURE`.
    - Define and export `AuditActorRoleEnumSchema`:
      - Enum values: `PRODUCT_OWNER`, `DISTRICT_HOKIM`, `SYSTEM`.
    - Define and export `AuditEventSchema`:
      - `id`: `z.string()`
      - `districtId`: `z.string().nullable()`
      - `districtName`: `z.string().nullable().optional()`
      - `actorId`: `z.string().nullable()`
      - `actorRole`: `AuditActorRoleEnumSchema.nullable()`
      - `action`: `z.string()`
      - `category`: `AuditActionCategoryEnumSchema`
      - `outcome`: `AuditActionOutcomeEnumSchema`
      - `ipAddress`: `z.string().nullable().optional()`
      - `userAgent`: `z.string().nullable().optional()`
      - `reason`: `z.string().nullable().optional()`
      - `previousValues`: `z.record(z.unknown()).nullable().optional()`
      - `newValues`: `z.record(z.unknown()).nullable().optional()`
      - `metadata`: `z.record(z.unknown()).nullable().optional()`
      - `createdAt`: `z.string().datetime()`
    - Define and export `AuditHistoryQuerySchema`:
      - `limit`: `z.coerce.number().int().min(1).max(100).default(50)`
      - `cursor`: `z.string().min(1).optional()`
      - `direction`: `z.enum(['forward', 'backward']).default('forward')`
      - `districtId`: `z.string().optional()` (supports UUID, `'global'`, or omitted)
      - `startDate`: `z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD format required').optional()`
      - `endDate`: `z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD format required').optional()`
      - `category`: `AuditActionCategoryEnumSchema.optional()`
      - `actorRole`: `AuditActorRoleEnumSchema.optional()`
      - `outcome`: `AuditActionOutcomeEnumSchema.optional()`
      - `action`: `z.string().optional()`
      - `search`: `z.string().max(100).optional()`
      - Refine validator to assert `!startDate || !endDate || startDate <= endDate` with error message `"Бошланиш санаси тугаш санасидан катта бўлиши мумкин эмас."`.
    - Define and export `AuditHistoryPageSchema`:
      - Use `createKeysetPageSchema(AuditEventSchema)`.
    - Define and export `AuditEventDetailSchema`:
      - Complete detail representation of an audit event.
    - Export helper mappings for Action to Category and Action to default Outcome.
  - [x] 1.2 In `packages/api-contracts/src/index.ts` [UPDATE]:
    - Export all members from `./audit.js`.

- [x] **Task 2: Backend Audit Query Service & Action Classification (`apps/backend/src/modules/audit`)** (AC: 1, 2, 3, 7, 9)
  - [x] 2.1 In `apps/backend/src/modules/audit/audit-service.ts` [UPDATE]:
    - Enhance `sanitizeMetadata` to recursively sanitize `previousValues`, `newValues`, `reason`, and nested object keys.
    - Implement `classifyAuditActionCategory(action: string): AuditActionCategory`:
      - Maps `AUTH_*`, `ACCOUNT_PO_CREATED`, `ACCOUNT_PO_PASSWORD_RESET` -> `AUTH_SECURITY`
      - Maps `DISTRICT_CREATED`, `DISTRICT_UPDATED`, `DISTRICT_DISCLOSURE_CONFIRMED`, `DISTRICT_ACTIVATED`, `DISTRICT_ACTIVATION_FAILED` -> `DISTRICT_ADMINISTRATION`
      - Maps `ACCOUNT_HOKIM_*` -> `HOKIM_MANAGEMENT`
      - Maps `DISTRICT_TELEGRAM_BOT_*`, `DISTRICT_GROUP_*` -> `TELEGRAM_INTEGRATION`
      - Maps `OPERATIONAL_ISSUE_*`, `OPERATIONAL_RETRY_*` -> `OPERATIONAL_LIFECYCLE`
      - Fallback for unrecognized action -> `OPERATIONAL_LIFECYCLE`.
    - Implement `determineAuditActionOutcome(action: string, metadata?: Record<string, unknown>): AuditActionOutcome`:
      - If `metadata?.outcome === 'FAILURE'` or `metadata?.status === 'FAILED'` or `metadata?.success === false`, return `FAILURE`.
      - If action ends with `_FAILED` or `_FAILURE`, return `FAILURE`.
      - If `metadata?.outcome === 'SUCCESS'` or `metadata?.status === 'SUCCESS'` or `metadata?.success === true`, return `SUCCESS`.
      - Otherwise return `SUCCESS`.
  - [x] 2.2 In `apps/backend/src/modules/audit/audit-query-service.ts` [NEW]:
    - Implement `AuditQueryService` class / functions with dependency injection `(db: DbClient)`:
      - Helper `escapeIlikePattern(term: string): string` to escape `%`, `_`, `\` characters.
      - `queryAuditEvents(params: AuditHistoryQuery): Promise<KeysetPage<AuditEvent>>`:
        - Convert `startDate` and `endDate` to UTC date ranges using `getTashkentDayBounds` from `../telegram-intake/timezone-util.js` (supporting single-sided and two-sided bounds).
        - Build SQL WHERE clause with Drizzle `and()`, `eq()`, `isNull()`, `gte()`, `lte()`, `ilike()`, `sql`:
          - `districtId`: if `'global'`, `isNull(auditEvents.districtId)`; if UUID, `eq(auditEvents.districtId, params.districtId)`; if omitted, no filter.
          - `category`: match actions belonging to the category.
          - `actorRole`: match `auditEvents.actorRole`.
          - `action`: match `auditEvents.action`.
          - `outcome`: match derived outcome.
          - `search`: search allowlisted fields (`auditEvents.id`, `auditEvents.actorId`, `auditEvents.districtId`, `auditEvents.action`, and JSONB keys: `reason`, `errorCode`, `issueId`, `botUsername`, `groupId`, `chatId`, `retryTrackingId`) with escaped ILIKE patterns.
        - Keyset cursor filtering using Boolean Disjunction and `Date` instances for microsecond/millisecond precision safety:
          - Validates cursor using `decodeKeysetCursor<AuditKeysetCursorPayload>(cursor)`. If cursor is provided but decode fails, throws structured `InvalidCursorError` (HTTP 400).
          - For forward (`direction: 'forward'`): `WHERE (${auditEvents.createdAt} < ${cursorDate}) OR (${auditEvents.createdAt} = ${cursorDate} AND ${auditEvents.id} < ${decoded.id})` ordered `createdAt DESC, id DESC`.
          - For backward (`direction: 'backward'`): `WHERE (${auditEvents.createdAt} > ${cursorDate}) OR (${auditEvents.createdAt} = ${cursorDate} AND ${auditEvents.id} > ${decoded.id})` ordered `createdAt ASC, id ASC`, then reversed in memory.
        - Execute query with `limit + 1` to compute `hasNextPage` / `hasPrevPage`.
        - Left join with `districts` table to populate `districtName`.
        - Format rows into `AuditEvent` with sanitized metadata, extracted `reason`, `previousValues`, `newValues`, and ISO string timestamps.
        - Generate `nextCursor` and `prevCursor` using `encodeKeysetCursor`.
      - `getAuditEventById(id: string): Promise<AuditEvent | null>`:
        - Retrieves single audit event by ID with joined district name and sanitized metadata.

- [x] **Task 3: Fastify HTTP Routes for Audit History (`apps/backend/src/modules/audit`)** (AC: 1, 3, 4, 5, 8)
  - [x] 3.1 In `apps/backend/src/modules/audit/audit-routes.ts` [NEW]:
    - Implement `registerAuditRoutes(server: FastifyInstance, db: DbClient)`:
      - Register encapsulated Fastify scope with preHandler `createRequireProductOwner(db)` (HTTP 401 unauthenticated, HTTP 403 Hokim).
      - `GET /api/v1/audit/events`:
        - Validate query string with `AuditHistoryQuerySchema`.
        - Call `auditQueryService.queryAuditEvents(query)`.
        - Return HTTP 200 with `AuditHistoryPageSchema`.
      - `GET /api/v1/audit/events/:id`:
        - Validate path param `:id`.
        - Call `auditQueryService.getAuditEventById(id)`.
        - Return HTTP 200 with `AuditEventDetailSchema` or HTTP 404 with standard error envelope (`NOT_FOUND`).
      - Ensure strictly NO mutating routes (`POST`, `PUT`, `PATCH`, `DELETE`) exist on `/api/v1/audit/*` and query requests do not emit audit events (preventing search term logging).
  - [x] 3.2 In `apps/backend/src/entrypoints/http.ts` [UPDATE]:
    - Import `registerAuditRoutes` from `../modules/audit/audit-routes.js`.
    - Register `registerAuditRoutes(server, db)` alongside other domain module routes.

- [x] **Task 4: Web API Client & TanStack Query Hooks (`apps/web/src/api`)** (AC: 1, 2, 3, 10)
  - [x] 4.1 In `apps/web/src/api/audit-client.ts` [NEW]:
    - Implement `fetchAuditEvents(query: AuditHistoryQuery): Promise<KeysetPage<AuditEvent>>`:
      - Calls `GET /api/v1/audit/events` with query parameters.
      - Uses `credentials: 'include'` and handles standard error envelope.
    - Implement `fetchAuditEventDetail(id: string): Promise<AuditEvent>`:
      - Calls `GET /api/v1/audit/events/${id}`.
    - Implement TanStack Query hook `useAuditHistory(query: AuditHistoryQuery)`:
      - Query key: `['audit-history', query]`.
      - `staleTime: 15_000`, `placeholderData: keepPreviousData`.
    - Implement TanStack Query hook `useAuditEventDetail(id: string | null)`:
      - Query key: `['audit-event', id]`.
      - `enabled: Boolean(id)`.

- [x] **Task 5: Frontend UI Components (`apps/web/src/pages/AuditHistoryPage.tsx` & Components)** (AC: 1, 2, 4, 6, 7, 10)
  - [x] 5.1 In `apps/web/src/components/audit/AuditFilterBar.tsx` [NEW]:
    - Ant Design 5 filter bar component with:
      - District Select (All districts / Global only / specific district from `useDistricts`),
      - DateRangePicker (`Asia/Tashkent` calendar days, presets: "Бугун", "Охирги 7 кун", "Охирги 30 кун"),
      - Category Select (`Барча тоифалар`, `Хавфсизлик ва авторизация`, `Туман бошқаруви`, `Ҳоким ҳисоблари`, `Телеграм интеграцияси`, `Операцион жараёнлар`),
      - Actor Role Select (`Барча роллар`, `Маҳсулот эгаси`, `Туман ҳокими`, `Тизим`),
      - Outcome Select (`Барча натижалар`, `Муваффақиятли`, `Хатолик`),
      - Search Input with debounce (300ms) for safe metadata search,
      - Reset filters button.
  - [x] 5.2 In `apps/web/src/components/audit/AuditEventDetailDrawer.tsx` [NEW]:
    - Read-only Ant Design Drawer (responsive width: `screens.md ? 640 : '100%'` using `Grid.useBreakpoint()`, `destroyOnClose={true}`):
      - Header with Event ID and copy button (`copyToClipboard`),
      - Descriptions grid: Timestamp (`Asia/Tashkent`), Actor (Role Tag, ID), IP Address, User Agent, District, Action Name & Category, Outcome Badge,
      - Reason block (if supplied reason exists),
      - Previous vs New Values Diff / Key-Value table (for configuration and state updates, displaying added, modified, removed attributes),
      - Structured metadata viewer (formatted key-value pairs),
      - Strictly NO edit/delete buttons,
      - Close button restoring table focus.
  - [x] 5.3 In `apps/web/src/pages/AuditHistoryPage.tsx` [REPLACE PLACEHOLDER]:
    - Replace placeholder `apps/web/src/pages/placeholders/AuditHistoryPage.tsx` and move to `apps/web/src/pages/AuditHistoryPage.tsx`:
      - Title `Аудит тарихи` and refresh button with spinning indicator,
      - Render `AuditFilterBar`,
      - Render Ant Design `Table` with `pagination={false}` and columns:
        - `Сана ва вақт`: formatted in `Asia/Tashkent` (`YYYY-MM-DD HH:mm:ss`),
        - `Бажарувчи`: Actor role Tag (`PRODUCT_OWNER` [blue], `DISTRICT_HOKIM` [green], `SYSTEM` [purple]) + copyable ID,
        - `Туман`: District name with link or `Глобал` tag,
        - `Тоифа ва Ҳаракат`: Category tag + localized action description,
        - `Натижа`: Outcome Tag (`Муваффақиятли` [green] / `Хатолик` [red]),
        - `Амаллар`: "Тафсилот" button to open `AuditEventDetailDrawer`.
      - Custom Keyset pagination footer controls ("Олдинги" / "Кейинги" with disabled states based on `hasPrevPage` / `hasNextPage` and record counter),
      - Loading skeleton / empty state handling (`Empty description="Аудит ёзувлари топилмади"`),
      - Stale cache banner if background refetch fails offline with last-fetch timestamp and retry button,
      - Update `apps/web/src/App.tsx` import to use the new `AuditHistoryPage`.

- [x] **Task 6: Timezone & Utility Enhancements (`apps/web/src/lib/formatters.ts`)** (AC: 2, 7)
  - [x] 6.1 In `apps/web/src/lib/formatters.ts` [UPDATE]:
    - Add helper `getActionDisplayNameUz(action: string): string` for clean Uzbek Cyrillic descriptions across all 24 system actions.
    - Leverage existing `formatTashkentDate`, `formatTashkentTime`, and `formatTashkentCalendarDate` for display consistency.

- [x] **Task 7: Backend Integration Tests (`apps/backend/tests/audit-history.test.ts`)** (AC: 1, 2, 3, 5, 7, 8, 9, 11)
  - [x] 7.1 In `apps/backend/tests/audit-history.test.ts` [NEW]:
    - Setup test suite against isolated test DB `mahalla_ovozi_test` (port 5433):
      - Seed test Product Owner, test Hokim, and test Districts.
      - Seed diverse audit events across all 5 action categories (Auth, District management, Hokim management, Telegram bot/group, Operational issues, Retry triggers).
    - Test suite scenarios:
      - 1. Authentication & Authorization: Product Owner can access; Hokim receives 403; unauthenticated receives 401.
      - 2. Reverse Chronological Ordering: Verify `createdAt DESC, id DESC` ordering.
      - 3. Keyset Pagination: Forward and backward traversal using cursors; boundary conditions; malformed cursor returns 400.
      - 4. Date Range Filtering: Test `Asia/Tashkent` calendar boundaries with exact UTC conversion; single-sided date filter; inverted date rejection (400).
      - 5. Multi-parameter Filtering: District filter (specific district vs global-only), Category filter, ActorRole filter, Outcome filter, Action filter.
      - 6. Free-text search on allowlisted fields (matching record ID, action, reason, target ID) with ILIKE wildcard character escaping (`%`, `_`).
      - 7. Sensitive data redaction: Verify passwords, bot tokens, API keys are redacted in metadata and old/new values.
      - 8. Immutability: Verify no POST/PUT/PATCH/DELETE endpoints exist on `/api/v1/audit/*`.
      - 9. Performance: Keyset query execution completes well under 2-second NFR2 target.

- [x] **Task 8: Web Component & UI Tests (`apps/web/tests/unit/AuditHistoryPage.test.tsx`)** (AC: 1, 2, 4, 6, 11)
  - [x] 8.1 In `apps/web/tests/unit/AuditHistoryPage.test.tsx` [NEW]:
    - Render `AuditHistoryPage` with mocked QueryClient and Ant Design App wrapper.
    - Test scenarios:
      - 1. Renders table with audit events, actor tags, outcome tags, Tashkent timestamps.
      - 2. Filter changes trigger new queries with updated parameters.
      - 3. Search input debounces and sends search query.
      - 4. Clicking "Тафсилот" opens `AuditEventDetailDrawer` with complete metadata and old/new values.
      - 5. Closing drawer preserves table filters and pagination state, restoring focus.
      - 6. Keyset pagination buttons enable/disable based on metadata.
      - 7. Verifies zero edit or delete buttons exist in the DOM.

### Review Findings

- [x] [Review][Patch] Fix SQL Three-Valued Logic in Outcome SUCCESS filter [`apps/backend/src/modules/audit/audit-query-service.ts:138-144`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/backend/src/modules/audit/audit-query-service.ts#L138-L144)
- [x] [Review][Patch] Fix Frontend Keyset Backward Pagination Desynchronization [`apps/web/src/pages/AuditHistoryPage.tsx:110-130`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/src/pages/AuditHistoryPage.tsx#L110-L130)
- [x] [Review][Patch] Fix Stale Closure and Space Truncation in Debounced Search Input [`apps/web/src/components/audit/AuditFilterBar.tsx:38-55`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/src/components/audit/AuditFilterBar.tsx#L38-L55)
- [x] [Review][Patch] Expand Credential Key Allowlist in Metadata Sanitizer [`apps/backend/src/modules/audit/audit-service.ts:6-21`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/backend/src/modules/audit/audit-service.ts#L6-L21)
- [x] [Review][Patch] Handle Empty String Query Parameters in AuditHistoryQuerySchema [`packages/api-contracts/src/audit.ts:45-63`](file:///c:/codevision-works/mahalla-ovozi-trial-2/packages/api-contracts/src/audit.ts#L45-L63)
- [x] [Review][Patch] Add Primitive Type Safety for previousValues and newValues Parsing [`apps/backend/src/modules/audit/audit-query-service.ts:219-224`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/backend/src/modules/audit/audit-query-service.ts#L219-L224)
- [x] [Review][Patch] Fix Keyset Backward Traversal Phantom hasNextPage on Empty Result Set [`apps/backend/src/modules/audit/audit-query-service.ts:207-213`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/backend/src/modules/audit/audit-query-service.ts#L207-L213)
- [x] [Review][Patch] Fix Refresh Button Loading Indicator and Validation Error Visibility [`apps/web/src/pages/AuditHistoryPage.tsx:280-285,290-309`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/src/pages/AuditHistoryPage.tsx#L280-L309)
- [x] [Review][Patch] Use Tashkent UTC+5 Timezone Offset for Date Presets [`apps/web/src/components/audit/AuditFilterBar.tsx:115-119`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/web/src/components/audit/AuditFilterBar.tsx#L115-L119)
- [x] [Review][Defer] Evaluate GIN / pg_trgm index optimization for high-scale multi-column audit search [`apps/backend/src/adapters/db/schema/audit.ts:19-26`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/backend/src/adapters/db/schema/audit.ts#L19-L26) — deferred, pre-existing

---

## Dev Notes

### Architecture Patterns and Constraints

- **Hexagonal Architecture (`AD-1`)**: Domain audit query logic lives in `apps/backend/src/modules/audit/audit-query-service.ts`, decoupled from HTTP transport.
- **Database & Drizzle Ownership (`AD-3`, `AD-4`)**: Uses existing `audit_events` table in `apps/backend/src/adapters/db/schema/audit.ts`. Schema is strictly append-only.
- **Keyset / Cursor Pagination (`AD-10`)**: Uses `CursorPaginationQuerySchema` and `encodeKeysetCursor` / `decodeKeysetCursor` from `packages/api-contracts/src/pagination.ts`. Opaque base64url cursor payload: `{ id: string, createdAt: string }`.
- **Timezone Invariant (`Asia/Tashkent`)**: Uzbekistan operates in UTC+5 with no daylight saving time. Date filtering converts `YYYY-MM-DD` start/end calendar days to UTC boundaries using `getTashkentDayBounds` from `apps/backend/src/modules/telegram-intake/timezone-util.ts`.
- **Privacy-Safe Redaction (`AD-9`, `AD-11`)**: Raw resident message text, bot tokens, OpenAI/Gemini keys, passwords, bearer tokens, and raw stack traces are scrubbed via `sanitizeMetadata` and `redactStringValue`. Search query string itself is excluded from routine logs and telemetry.
- **Role-Based Access Control (`AD-9`)**: Only `PRODUCT_OWNER` role may query audit history. `DISTRICT_HOKIM` role is blocked with HTTP 403.
- **Ant Design 5 Primary UI (`AD-2`)**: Standard Ant Design 5 components (`Table`, `Card`, `DatePicker.RangePicker`, `Select`, `Input.Search`, `Tag`, `Drawer`, `Descriptions`, `Typography`, `Button`, `Space`, `Flex`, `Tooltip`, `Alert`) with design tokens via `theme.useToken()`, responsive drawer via `Grid.useBreakpoint()`, and feedback via `App.useApp()`.

### Audit Action Categories & Action Map

| Action Category | Action Name Examples | Description in Uzbek Cyrillic |
| --- | --- | --- |
| `AUTH_SECURITY` | `AUTH_SIGN_IN_SUCCESS`, `AUTH_SIGN_IN_FAILURE`, `ACCOUNT_PO_CREATED`, `ACCOUNT_PO_PASSWORD_RESET`, `AUTH_FIRST_LOGIN_PASSWORD_CHANGE_FAILED`, `ACCOUNT_HOKIM_FIRST_LOGIN_PASSWORD_CHANGED` | Хавфсизлик ва авторизация амаллари |
| `DISTRICT_ADMINISTRATION` | `DISTRICT_CREATED`, `DISTRICT_UPDATED`, `DISTRICT_DISCLOSURE_CONFIRMED`, `DISTRICT_ACTIVATED`, `DISTRICT_ACTIVATION_FAILED` | Туман созламалари ва фаоллаштириш |
| `HOKIM_MANAGEMENT` | `ACCOUNT_HOKIM_CREATED`, `ACCOUNT_HOKIM_PASSWORD_RESET`, `ACCOUNT_HOKIM_DISABLED`, `ACCOUNT_HOKIM_REPLACED` | Ҳоким ҳисобларини бошқариш |
| `TELEGRAM_INTEGRATION` | `DISTRICT_TELEGRAM_BOT_CONNECTED`, `DISTRICT_TELEGRAM_BOT_DISCONNECTED`, `DISTRICT_GROUP_VALIDATED`, `DISTRICT_GROUP_MAPPED`, `DISTRICT_GROUP_REMAPPED`, `DISTRICT_GROUP_UNMAPPED` | Телеграм бот ва гуруҳлар созламалари |
| `OPERATIONAL_LIFECYCLE` | `OPERATIONAL_ISSUE_DETECTED`, `OPERATIONAL_ISSUE_RESOLVED`, `OPERATIONAL_RETRY_TRIGGERED` | Операцион муаммолар ва қайта уринишлар |

### Allowlisted Metadata Search Keys

```typescript
const ALLOWED_METADATA_SEARCH_KEYS = [
  'reason',
  'errorCode',
  'issueId',
  'botUsername',
  'groupId',
  'chatId',
  'retryTrackingId',
] as const;
```

### Keyset Cursor Structure & PostgreSQL Optimization

```typescript
export interface AuditKeysetCursorPayload {
  id: string;
  createdAt: string; // ISO string
}
```

- **PostgreSQL B-Tree Index Optimization**:
  - In PostgreSQL 12+, row-value constructor comparison `(created_at, id) < ($1, $2)` maps directly to a single B-tree index condition (`Index Cond: (created_at, id) < ($1, $2)`), performing an optimal $O(\log N)$ index seek.
  - **Forward Pagination (`direction: 'forward'` / next page)**:
    `WHERE (${auditEvents.createdAt}, ${auditEvents.id}) < (${cursorDate}, ${decoded.id})` (or equivalent Boolean Disjunction `(createdAt < cursorDate) OR (createdAt = cursorDate AND id < cursorId)`)
    `ORDER BY createdAt DESC, id DESC LIMIT limit + 1`
  - **Backward Pagination (`direction: 'backward'` / previous page)**:
    `WHERE (${auditEvents.createdAt}, ${auditEvents.id}) > (${cursorDate}, ${decoded.id})`
    `ORDER BY createdAt ASC, id ASC LIMIT limit + 1` (then reversed in memory to maintain descending order)

### TanStack Query v5 Keyset State Pattern

- When using discrete "Next" / "Previous" table navigation (rather than infinite scroll), vendor-recommended pattern is `useQuery` with `placeholderData: keepPreviousData`:
  - `placeholderData: keepPreviousData` avoids UI flashing during background page fetch.
  - State stack tracks cursor history for instant backward navigation.

### Source Tree Components to Touch

#### [NEW]
- `packages/api-contracts/src/audit.ts`
- `apps/backend/src/modules/audit/audit-query-service.ts`
- `apps/backend/src/modules/audit/audit-routes.ts`
- `apps/backend/tests/audit-history.test.ts`
- `apps/web/src/api/audit-client.ts`
- `apps/web/src/components/audit/AuditFilterBar.tsx`
- `apps/web/src/components/audit/AuditEventDetailDrawer.tsx`
- `apps/web/src/pages/AuditHistoryPage.tsx`
- `apps/web/tests/unit/AuditHistoryPage.test.tsx`

#### [MODIFY]
- `packages/api-contracts/src/index.ts` (export `./audit.js`)
- `apps/backend/src/modules/audit/audit-service.ts` (category classification, outcome determination, enhanced metadata sanitization)
- `apps/backend/src/entrypoints/http.ts` (register audit routes)
- `apps/web/src/App.tsx` (route to new `AuditHistoryPage` component)
- `apps/web/src/lib/formatters.ts` (Uzbek Cyrillic action descriptions)

#### [DELETE]
- `apps/web/src/pages/placeholders/AuditHistoryPage.tsx` (replaced by full implementation in `apps/web/src/pages/AuditHistoryPage.tsx`)

---

## Testing Standards Summary

- **Database Isolation Rule**: All automated integration tests MUST run against the isolated test database (`mahalla_ovozi_test` on port 5433). Tests must never touch the active development database (`mahalla_ovozi`).
- **Vitest Suites**:
  - Backend integration: `apps/backend/tests/audit-history.test.ts`
  - Web unit/component: `apps/web/tests/unit/AuditHistoryPage.test.tsx`
- **Verification Gates**:
  - `pnpm --filter @mahalla-ovozi/api-contracts build`
  - `pnpm --filter @mahalla-ovozi/backend test`
  - `pnpm --filter @mahalla-ovozi/web test`
  - `pnpm check` (0 TypeScript compiler errors)

---

## Previous Story Intelligence

### Learnings from Stories 4.1, 4.2, and 4.3:
1. **Transaction atomicity & schema safety**: Audit events are persisted atomically during operational transitions. In Story 4.4, we are strictly building the read/search/filter query layer; no mutating audit writes should be added.
2. **Fastify 5 request decoration**: Remember that Fastify 5 requires decorating request properties (`actor`) for monomorphic V8 shapes. Always use `request.actor` populated by `requireAuth` preHandler.
3. **Ant Design 5 & React 19 UI Context**: Use `App.useApp()` for `message`, `modal`, `notification`. Use `theme.useToken()` for styling. Ensure all Drawers set `destroyOnClose={true}` to prevent stale state retention.
4. **Keyset pagination consistency**: Avoid offset pagination which suffers from performance degradation and reshuffling on high-volume logs. Strictly implement keyset cursor pagination with `(createdAt, id)` tuples.
5. **Timezone precision**: Always use `Asia/Tashkent` calendar boundaries (+05:00) when interpreting `startDate` and `endDate` query parameters.

---

## Git Intelligence Summary

- Latest 5 commits:
  - `6a5c604`: `story 4.3 implementation has been reviewed and ready for next story 4.4 spec creation workflow`
  - `af73220`: `story 4.3 has been implemented and ready for code review workflow`
  - `8322c15`: `story 4.3 spec has been created, reviewed and ready for next dev story workflow`
  - `a6e22ea`: `story 4.2 has been reviewed and ready for story 4.3 spec creation workflow`
  - `cadde65`: `story 4.2 has been implemented and ready for code review workflow`
- Established conventions:
  - Strict TypeScript with NodeNext runtime `.js` specifiers in backend.
  - Zero `any` or broad type casts.
  - Clean separation of shared contracts in `@mahalla-ovozi/api-contracts`.
  - Comprehensive unit and integration test suites with 100% test passage.

---

## Latest Technical Information

- **Drizzle ORM 0.45.x**: Use `sql` template tags, `and()`, `or()`, `eq()`, `isNull()`, `gte()`, `lte()`, `desc()`, `asc()` for building fast parameterized queries with JSONB operators (`sql`${auditEvents.metadata}->>'reason'``).
- **Fastify 5.x**: Route registration with `fastify-type-provider-zod` for request/response validation against shared Zod schemas.
- **Ant Design 5.x**: Table with `columns`, `dataSource`, `loading`, `pagination={false}`, combined with custom Keyset pagination controls. `DatePicker.RangePicker` with `dayjs` timezone support.

---

## Project Structure Notes

- Alignment with unified project structure:
  - Shared contracts: `packages/api-contracts/src/audit.ts`
  - Backend modules: `apps/backend/src/modules/audit/`
  - Web UI: `apps/web/src/pages/AuditHistoryPage.tsx`, `apps/web/src/components/audit/`
  - Tests: `apps/backend/tests/audit-history.test.ts`, `apps/web/tests/unit/AuditHistoryPage.test.tsx`
- No architectural conflicts or variances detected.

---

## References

- [Epic 4: Operational Health & Auditable Investigation](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/epics/epic-4.md#Story-4.4)
- [Architecture Spine](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/architecture/architecture-Mahalla-Ovozi-2026-08-12/ARCHITECTURE-SPINE.md) (`AD-1`, `AD-2`, `AD-3`, `AD-4`, `AD-9`, `AD-10`, `AD-11`)
- [Project Context for AI Agents](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/project-context.md)
- [Pagination Contracts](file:///c:/codevision-works/mahalla-ovozi-trial-2/packages/api-contracts/src/pagination.ts)
- [Audit DB Schema](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/backend/src/adapters/db/schema/audit.ts)
- [Audit Service](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/backend/src/modules/audit/audit-service.ts)

---

## Dev Agent Record

### Agent Model Used

Gemini 3.7 Flash (High)

### Debug Log References

- Verified full test suite execution for backend and web.
- Checked keyset pagination with base64url cursor encoding and boundary condition handling.
- Verified Asia/Tashkent UTC+5 date boundary calculations and inverted date validation.

### Completion Notes List

- Story 4.4 implementation completed satisfying all 11 Acceptance Criteria and 8 Tasks.
- Shared API contracts defined in `packages/api-contracts/src/audit.ts` with strict Zod validation for filters, dates, and keyset pagination.
- Backend query engine implemented in `apps/backend/src/modules/audit/audit-query-service.ts` featuring row-value keyset cursor traversal, Tashkent calendar boundaries, allowlisted ILIKE search with SQL wildcard escaping, and joined district names.
- Fastify read-only routes `/api/v1/audit/events` and `/api/v1/audit/events/:id` guarded with `createRequireProductOwner(db)` in `apps/backend/src/modules/audit/audit-routes.ts`.
- Web API client and TanStack Query hooks implemented in `apps/web/src/api/audit-client.ts`.
- Ant Design 5 UI built in `apps/web/src/pages/AuditHistoryPage.tsx`, `AuditFilterBar.tsx`, and `AuditEventDetailDrawer.tsx` with responsive drawer, before/after diff table, debounced search, custom keyset pagination footer, and offline stale cache warning banner.
- All 16 backend integration tests in `apps/backend/tests/audit-history.test.ts` passing 100% against test DB.
- All 8 web unit/component tests in `apps/web/tests/unit/AuditHistoryPage.test.tsx` passing 100%.

### File List

- `packages/api-contracts/src/audit.ts` [NEW]
- `packages/api-contracts/src/index.ts` [MODIFY]
- `apps/backend/src/modules/audit/audit-query-service.ts` [NEW]
- `apps/backend/src/modules/audit/audit-routes.ts` [NEW]
- `apps/backend/src/modules/audit/audit-service.ts` [MODIFY]
- `apps/backend/src/entrypoints/http.ts` [MODIFY]
- `apps/backend/tests/audit-history.test.ts` [NEW]
- `apps/web/src/api/audit-client.ts` [NEW]
- `apps/web/src/components/audit/AuditFilterBar.tsx` [NEW]
- `apps/web/src/components/audit/AuditEventDetailDrawer.tsx` [NEW]
- `apps/web/src/pages/AuditHistoryPage.tsx` [NEW]
- `apps/web/src/pages/placeholders/AuditHistoryPage.tsx` [DELETE]
- `apps/web/src/App.tsx` [MODIFY]
- `apps/web/src/lib/formatters.ts` [MODIFY]
- `apps/web/tests/unit/AuditHistoryPage.test.tsx` [NEW]
- `_bmad-output/implementation-artifacts/sprint-status.yaml` [MODIFY]
- `_bmad-output/implementation-artifacts/4-4-inspect-immutable-searchable-audit-history.md` [MODIFY]


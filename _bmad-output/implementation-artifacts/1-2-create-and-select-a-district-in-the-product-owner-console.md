---
baseline_commit: e300d0800ca9d7e4e18640a14a6059e81092e68b
---

# Story 1.2: Create and Select a District in the Product Owner Console

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the **Product Owner**,
I want to create a District and work within an explicit District context in one Console,
So that subsequent configuration is always attached to the correct District and District-owned data cannot be mixed accidentally.

## Acceptance Criteria

1. **Persistent Console Navigation & District Context Visibility**
   - **Given** an authenticated Product Owner
   - **When** the Product Owner enters the Console
   - **Then** the approved persistent navigation exposes all 8 sections: `Умумий кўриниш` (Overview), `Тизим ҳолати` (System Health), `Туманлар` (Districts), `Телеграм созламалари` (Telegram Setup), `Обуналар` (Subscriptions), `Ҳоким ҳисоблари` (Hokim Accounts), `АИ операциялари` (AI Operations), and `Аудит тарихи` (Audit History)
   - **And** the current District context is always visibly identifiable in the persistent header where a section can operate on District-owned data
   - **And** all user-facing product copy uses Uzbek Cyrillic.

2. **Honest Empty State for Zero Districts**
   - **Given** no District exists yet in the database
   - **When** the Product Owner opens the Districts section (`/districts`)
   - **Then** an honest empty state is shown (`Ҳозирча туманлар мавжуд эмас`)
   - **And** the Product Owner can begin creating the first District via the primary CTA `Туман қўшиш`
   - **And** no unrelated future Telegram, Topic, subscription-lifecycle, or AI-processing entities are created by this story.

3. **District Creation & Incomplete Lifecycle Initialization**
   - **Given** the Product Owner creates a District with its required identity, including its District name (`Туман номи`) and optional region (`Вилоят / Ҳудуд`)
   - **When** Save succeeds
   - **Then** the system assigns an opaque District identifier (UUID)
   - **And** persists the District in an incomplete onboarding state (`SETUP_INCOMPLETE` / `Созлаш тугалланмаган`)
   - **And** makes that District selectable in the Console
   - **And** the incomplete District performs no production Telegram intake or AI processing and grants no Hokim access.

4. **Explicit District Scoping at Application & Data Boundaries**
   - **Given** a District-scoped application request
   - **When** it reaches application, repository, or other District-owned boundaries
   - **Then** explicit District scope (`district_id`) is required
   - **And** missing or invalid District scope is rejected (400/404) rather than interpreted as global scope
   - **And** the server derives authorization context from the session rather than trusting a browser-supplied role or unrestricted District identity.

5. **Global vs. Scoped Contract Separation**
   - **Given** a Product Owner operation that is genuinely global or aggregate (e.g. listing all districts)
   - **When** no single District is selected
   - **Then** it uses a dedicated global/Product Owner contract (`/api/v1/districts`)
   - **And** it cannot expose or mix District-owned evidence, credentials, mappings, accounts, or other protected District content.

6. **Selected District Persistence Across Navigation**
   - **Given** a District is selected
   - **When** the Product Owner navigates among District-scoped Console sections
   - **Then** that District remains visibly selected in the persistent header
   - **And** frontend server-state query keys include the District identity (`['district', districtId, ...]`)
   - **And** responses for another District cannot render into the active District context.

7. **Atomic District Switching & Cache Invalidation**
   - **Given** the Product Owner requests a switch from District A to District B
   - **When** no unsaved form state blocks the transition
   - **Then** prior-District requests are cancelled via `queryClient.cancelQueries` where possible
   - **And** protected District A cache/content-bearing client state is purged (`queryClient.removeQueries`) before District B data is loaded
   - **And** local District-bound interaction state (search inputs, filters, open drawers) is cleared
   - **And** a late District A response is ignored and never rendered under District B.

8. **Unsaved Changes Guard on Context Transitions**
   - **Given** there are unsaved changes in an active form or editor
   - **When** the Product Owner attempts District switching, sidebar navigation, sign-out, browser Back, or another transition that would discard the draft
   - **Then** the approved dirty-state guard modal (`Сақланмаган ўзгаришлар мавжуд`) runs before changing context
   - **And** selecting `Таҳрирлашни давом эттириш` (Continue editing) leaves the existing District, form draft, and focus unchanged
   - **And** selecting `Ўзгаришларни бекор қилиш` (Discard) discards client-side draft changes and performs the protected context transition.

9. **Duplicate Submission Prevention & Safe Mutation Failure**
   - **Given** District creation or another authoritative mutation is submitted
   - **When** the request is in progress or fails
   - **Then** duplicate submission is prevented (button disabled/loading) without freezing unrelated navigation
   - **And** no optimistic success is displayed
   - **And** a failure preserves valid entered values and presents a sanitized error with a useful next action.

10. **Accessible Form Error Summary & Focus Management**
    - **Given** field validation fails on Save (e.g. empty name, name > 100 characters, duplicate name conflict)
    - **When** the server or shared contract rejects the submitted values
    - **Then** one accessible error summary receives programmatic focus at the form start
    - **And** links to invalid controls are provided in the summary
    - **And** valid field values remain intact
    - **And** entry/blur validation does not unexpectedly steal focus.

11. **Browser Network Loss & Offline Protection**
    - **Given** the browser loses network connectivity while the Console contains still-authorized loaded data
    - **When** the Product Owner remains offline
    - **Then** permitted loaded data may remain visible read-only with an Uzbek Cyrillic offline warning banner (`Сервер билан алоқа мавжуд эмас. Тармоқни текширинг.`)
    - **And** new loads and mutations (such as District creation) are blocked
    - **And** nothing is queued for automatic resubmission or replayed in the background
    - **And** reconnect revalidates the session and active District context before refreshing.

12. **Accessibility Floor & Responsive Reflow**
    - **Given** the Console is used with keyboard navigation, phone/tablet widths, 200% zoom, or reduced-motion preference
    - **When** the Product Owner creates or switches District context
    - **Then** core actions remain keyboard operable with visible logical focus outlines (`#007A7C`)
    - **And** touch targets are at least 44px with 8px compact gap
    - **And** responsive layout collapses the sidebar into a mobile drawer or reflows without page-level horizontal overflow
    - **And** no protected action or status depends on color alone
    - **And** Uzbek Cyrillic text (`Ў`, `Қ`, `Ғ`, `Ҳ`) and controls are never clipped or hidden.

## Tasks / Subtasks

- [x] Task 1: Shared API Contracts for District Management (AC: 4, 5, 9, 10)
  - [x] 1.1 Create `packages/api-contracts/src/districts.ts` defining `DistrictStatusSchema` (`'SETUP_INCOMPLETE' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED'`), `DistrictSchema`, `CreateDistrictRequestSchema`, `CreateDistrictResponseSchema`, `ListDistrictsResponseSchema`, and `GetDistrictResponseSchema`.

    **`DistrictSchema` shape (P1-B):**
    ```ts
    export const DistrictSchema = z.object({
      id:        z.string().min(1),
      name:      z.string().min(1),
      region:    z.string().optional(),
      status:    DistrictStatusSchema,
      createdAt: z.string().datetime(),   // UTC ISO 8601 — frontend converts to Asia/Tashkent
    });
    ```

    **`CreateDistrictResponseSchema` shape (P1-A):** wraps a single `DistrictSchema` object:
    ```ts
    export const CreateDistrictResponseSchema = z.object({ district: DistrictSchema });
    export type CreateDistrictResponse = z.infer<typeof CreateDistrictResponseSchema>;
    ```

  - [x] 1.2 Implement strict code-point validation following the B10 lesson (P1-C):
    - District name: `.trim()` **first**, then `refine(v => [...v].length >= 2)` and `refine(v => [...v].length <= 100)`. Trimming must precede length refines — a name `"  a  "` has 1 code point after trim and must fail the `>= 2` check.
    - Region: `z.string().trim().refine(v => [...v].length <= 100).optional().transform(v => v || undefined)` — an empty string after trim becomes `undefined`, not a stored empty string.
    - Both fields use spread `[...val].length` for code-point counting (B10), not `.length` (UTF-16 code units).
  - [x] 1.3 Export all district schemas and types in `packages/api-contracts/src/index.ts`.
- [x] Task 2: Database Schema & Migration for Districts (AC: 2, 3, 4)
  - [x] 2.1 Create `apps/backend/src/adapters/db/schema/districts.ts` with the `districts` table as follows (P2-A):

    ```ts
    // districts.ts
    import { pgTable, text, timestamp, index, uniqueIndex, sql } from 'drizzle-orm/pg-core';

    export const districts = pgTable(
      'districts',
      {
        id:        text('id').primaryKey(),
        name:      text('name').notNull(),
        region:    text('region'),
        status:    text('status').notNull().default('SETUP_INCOMPLETE'),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
      },
      (table) => [
        // Functional unique index — enforces case-insensitive name uniqueness at DB level.
        // A service-level pre-check produces a friendlier 409, but this is the safety net.
        uniqueIndex('districts_name_lower_idx').on(sql`LOWER(${table.name})`),
        // name index for text search lookups
        index('districts_name_idx').on(table.name),
        // status index DEFERRED — only one value (SETUP_INCOMPLETE) exists in Story 1.2.
        // Add when ACTIVE/SUSPENDED statuses become real in a later story.
      ]
    );
    ```

    Add a CHECK constraint to the migration SQL to prevent out-of-enum status values at the DB level (P2-B):
    ```sql
    ALTER TABLE "districts" ADD CONSTRAINT "districts_status_check"
      CHECK (status IN ('SETUP_INCOMPLETE', 'ACTIVE', 'SUSPENDED', 'CANCELLED'));
    ```
    In Drizzle, add this to the table definition via a custom SQL check expression if supported by the Drizzle version, otherwise add it manually to the generated migration file before running it.

    ⚠️ **Drizzle does not automatically update `updatedAt` on UPDATE (P2-C).** `defaultNow()` applies only on INSERT. The service layer must explicitly pass `updatedAt: new Date()` on every update operation that changes a district row. This note carries forward to all future stories that modify district records.

  - [x] 2.2 Re-export `districts` in `apps/backend/src/adapters/db/schema/index.ts`.
  - [x] 2.3 Generate version-controlled SQL migration `apps/backend/drizzle/0001_<drizzle-generated-slug>.sql` using `pnpm --filter @mahalla-ovozi/backend db:generate`. Migration filename is auto-generated by drizzle-kit.
  - [x] 2.4 Verify migration execution with `pnpm --filter @mahalla-ovozi/backend db:migrate`.
- [x] Task 3: Backend District Service & HTTP Endpoints (AC: 2, 3, 4, 5, 9, 10)
  - [x] 3.1 Implement `apps/backend/src/modules/districts/districts-service.ts` with pure business logic (P3-C — service throws error codes; routes map to HTTP):
    - `listDistricts`: ordered by name ASC. No pagination required for MVP — district count is inherently bounded. Return all districts in one response (P3-H).
    - `getDistrictById`: throws `new Error('DISTRICT_NOT_FOUND')` when the district does not exist. The route handler in `districts-routes.ts` catches this and replies with HTTP 404. The service layer must not construct or reference HTTP status codes directly (AD-1 hexagonal boundary — HTTP is a transport concern).
    - `createDistrict`: checks case-insensitive uniqueness, generates UUID, handles 409 `DISTRICT_NAME_EXISTS`.

    **Atomicity requirement (P3-B):** Wrap the district INSERT and `DISTRICT_CREATED` audit event INSERT in a single `db.transaction(async (tx) => { ... })` — matching the pattern in `account-service.ts`. This ensures atomicity: a failed audit insert rolls back the district insert, and a district uniqueness conflict never produces a phantom audit event.
    ```ts
    await db.transaction(async (tx) => {
      await tx.insert(districts).values({ id, name, region, status: 'SETUP_INCOMPLETE', ... });
      await tx.insert(auditEvents).values({ id: `aud_${crypto.randomUUID()}`, action: 'DISTRICT_CREATED', metadata: { districtId: id, districtName: name, region } });
    });
    ```

  - [x] 3.2 Implement `requireProductOwner` as a thin Fastify `preHandler` hook in **`apps/backend/src/modules/auth/require-product-owner.ts`** (not in the districts module — session validation is an auth concern per AD-1) (P3-A).

    Implementation contract:
    1. Extract the session cookie using `COOKIE_NAME` from `session-manager.ts`.
    2. Call the existing `validateAndTouchSession(db, rawToken)` — do **not** duplicate session validation logic.
    3. If `!validation.isValid` → reply 401 `UNAUTHENTICATED`.
    4. If `validation.account.role !== 'PRODUCT_OWNER'` → reply 403 `FORBIDDEN`.
    5. Attach `validation.account` to the request via a Fastify decorator (`request.actor`) for downstream route handlers.

    Export this hook from the `auth` module. `districts-routes.ts` imports it — it does not define its own session logic.

  - [x] 3.3 Implement `apps/backend/src/modules/districts/districts-routes.ts` defining `GET /api/v1/districts`, `POST /api/v1/districts`, and `GET /api/v1/districts/:districtId` with Zod validation and sanitized error responses.

    **`POST /api/v1/districts` returns HTTP 201 Created** on success, with `CreateDistrictResponseSchema` body (full `DistrictSchema` object). The frontend uses the response body to add the new district immediately without a follow-up GET (P3-G).

    **Function signature (P3-F):** `registerDistrictRoutes(fastify: FastifyInstance, db: DbClient): void` — accept `db` as a parameter, never construct a new `DbClient` internally. Match the signature of `registerAuthRoutes`. Inject from `http.ts`:
    ```ts
    registerDistrictRoutes(server, db);
    ```

    **Hook registration order (P3-D, P3-E):** Register `preHandler` hooks in this exact order within `registerDistrictRoutes`:
    1. `verifyStateChangingOrigin` (imported from `auth/origin-guard.ts`) — rejects cross-origin requests before the session is touched. Register within the `registerDistrictRoutes` function scope — not relying on the auth module's hook (which is scoped to a different Fastify plugin instance). The guard's internal method check already skips `GET`/`HEAD`/`OPTIONS` requests — no per-route exemption needed.
    2. `requireProductOwner` (imported from `auth/require-product-owner.ts`) — validates the session only after origin is confirmed.

    This order prevents unnecessary DB session lookups on rejected cross-origin requests.

  - [x] 3.4 Register district routes in `apps/backend/src/entrypoints/http.ts`.
- [x] Task 4: Frontend District Context & Switching Engine (AC: 1, 6, 7, 8, 11)
  - [x] 4.1 Before implementing `district-client.ts`, extract the generic `request<T>` function and `ApiError` class from `apps/web/src/auth/auth-client.ts` into a new shared module **`apps/web/src/lib/api-client.ts`** (P4-A). Export both from there. Update `auth-client.ts` to import from `../lib/api-client.js`.

    Then implement `district-client.ts` using the same shared `request<T>` pattern — never call `fetch` directly. This ensures consistent `isNetworkError` detection, Zod response validation, and error code parsing across all API clients.

    New files: `apps/web/src/lib/api-client.ts` **[NEW]**
    Modified: `apps/web/src/auth/auth-client.ts` **[MODIFY]** — import from `lib/api-client.js`

  - [x] 4.2 Implement `apps/web/src/district/useDirtyState.ts` hook (P4-D).

    **Hook API:** `useDirtyState(registrationId: string, isDirty: boolean): void`
    - Declarative — the form passes its current `isDirty` boolean on every render.
    - Internally calls `registerDirty(registrationId)` when `isDirty` becomes `true`, `clearDirty(registrationId)` when it becomes `false`.
    - **Auto-cleanup on unmount:** `useEffect(() => () => clearDirty(registrationId), [registrationId])` — prevents ghost dirty-state registrations when the form component unmounts (e.g., drawer closed via `×` without going through the guard).

    **`DistrictProvider` dirty registry:** A `Set<string>` tracking active dirty registration IDs. `hasDirtyForms = dirtyRegistry.size > 0`.

    **`UnsavedChangesModal` ownership:** Rendered **once** inside `ConsoleLayout`, driven by `pendingTransition` in `DistrictProvider`. The provider holds the transition callback; the modal calls it on Discard. Continue editing calls nothing — the provider resets `pendingTransition` to `null`.

  - [x] 4.3 Implement `apps/web/src/district/district-context.tsx` (`DistrictProvider`, `useDistrict`) (P4-B, P4-C, P4-E).

    **`DistrictProvider` context shape — do NOT hoist queries into the provider (P4-C):**
    - `activeDistrictId: string | null`
    - `switchDistrict(id: string): Promise<void>` (includes dirty-state guard check)
    - `registerDirty(id: string): void` / `clearDirty(id: string): void`
    - `hasDirtyForms: boolean`
    - `pendingTransition: PendingTransition | null` (drives `UnsavedChangesModal`)

    Do **not** hoist `districtsList` or `activeDistrict` queries into the provider. Call them at component level using `activeDistrictId` from context as the query key segment:
    ```ts
    const { data: district } = useQuery({
      queryKey: ['district', activeDistrictId, 'detail'],
      queryFn: () => districtClient.getDistrict(activeDistrictId!),
      enabled: !!activeDistrictId,
    });
    ```

    **Atomic switch sequence — must execute in this exact order (P4-B):**
    ```ts
    async function switchDistrict(nextId: string) {
      // 1. Signal abort to in-flight prior-district queries (async — await settlement)
      await queryClient.cancelQueries({ queryKey: ['district', prevId] });
      // 2. Purge prior-district cache (sync — must fire AFTER cancelQueries resolves)
      queryClient.removeQueries({ queryKey: ['district', prevId] });
      // 3. Clear local interaction state (search inputs, filters, open drawers)
      resetLocalInteractionState();
      // 4. Activate new district — triggers District B queries
      setActiveDistrictId(nextId);
    }
    ```
    **Critical:** Steps must be sequential. `removeQueries` before `cancelQueries` resolves creates a window where a settling in-flight request re-populates the evicted cache. `setActiveDistrictId` before `removeQueries` allows both district caches to co-exist briefly.

    **`DistrictProvider` tree position:** Must be placed **inside** `AuthProvider` (needs authenticated actor) and **inside** `QueryClientProvider` (calls `useQueryClient()`), and **inside** `ConfigProvider` (uses theme tokens):
    ```tsx
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={mahallaTheme}>
        <AuthProvider>
          <DistrictProvider>          {/* ← correct position */}
            <BrowserRouter>
              <Routes>...</Routes>
            </BrowserRouter>
          </DistrictProvider>
        </AuthProvider>
      </ConfigProvider>
    </QueryClientProvider>
    ```

  - [x] 4.4 Implement `apps/web/src/components/UnsavedChangesModal.tsx` displaying the approved Uzbek Cyrillic dirty-state confirmation (`Сақланмаган ўзгаришлар мавжуд`, `Ўзгаришларни бекор қилиш`, `Таҳрирлашни давом эттириш`) (P5-G).

    Button mapping in AntD `Modal`:
    - `okText`: **`Таҳрирлашни давом эттириш`** (safe — primary, right side, receives keyboard focus on modal open)
    - `okType`: `"primary"`
    - `cancelText`: **`Ўзгаришларни бекор қилиш`** (destructive — left side, styled with `danger` via `footer` prop or `cancelButtonProps={{ danger: true }}`)
    - Escape key → fires Continue Editing (closes modal, restores prior context — no discard).
    - Clicking outside the modal (mask) → fires Continue Editing (not Discard).
- [x] Task 5: Persistent Console Layout & Shell (AC: 1, 6, 12)
  - [x] 5.1 Implement `apps/web/src/components/ConsoleLayout.tsx` featuring Ant Design `Layout` with:
    - Sidebar navigation with all 8 Uzbek Cyrillic sections: `Умумий кўриниш`, `Тизим ҳолати`, `Туманлар`, `Телеграм созламалари`, `Обуналар`, `Ҳоким ҳисоблари`, `АИ операциялари`, `Аудит тарихи`.
    - Persistent Header with **`Маҳалла Овози`** wordmark (Uzbek Cyrillic — do NOT use Latin `"Mahalla Ovozi"`, see P5-H), `DistrictSelector` dropdown, user tag, and sign-out button.
    - Offline notification banner — primary signal is `ApiError.isNetworkError === true` caught from TanStack Query `onError` callbacks; `navigator.onLine` is a supplementary hint only (P4-G). The banner appears when a recent mutation or query fails with `isNetworkError: true` and clears when the next request succeeds.
    - `UnsavedChangesModal` rendered **once** inside `ConsoleLayout`, driven by `pendingTransition` in `DistrictProvider`.

    **Extend `antd-theme.ts` with `components.Menu` tokens (P5-B):**
    ```ts
    Menu: {
      itemSelectedColor:  '#0F5C5E',
      itemSelectedBg:     '#EDF3F1',  // matches {colors.surface-subtle}
      itemHoverBg:        '#EDF3F1',
      itemColor:          '#172321',  // {colors.text-primary}
      itemActiveBg:       '#EDF3F1',
    },
    ```

    **Use React Router 7 nested layout routes with `<Outlet />` inside `ConsoleLayout` (P4-F).** Do not import `ConsoleLayout` inside every page component — the sidebar would remount on every navigation.
    ```tsx
    <Route
      path="/"
      element={<ProtectedRoute><ConsoleLayout /></ProtectedRoute>}
    >
      <Route index element={<OverviewPage />} />
      <Route path="districts" element={<DistrictsPage />} />
      <Route path="system-health" element={<SystemHealthPage />} />
      {/* …other 5 sections */}
    </Route>
    ```
    `ProtectedRoute` wraps the layout route, not individual pages. The `/` index route defaults to `OverviewPage`.

  - [x] 5.2 Implement `apps/web/src/components/DistrictSelector.tsx` dropdown showing active District with quick search/switch and `+ Туман қўшиш` quick action (P5-C).

    Use AntD 5 `Select` with `showSearch` prop for the district switcher. For the `+ Туман қўшиш` quick action, use the `dropdownRender` prop to append a custom footer button below the option list. Do not use `Dropdown` component — `Select` with `controlHeight: 44` (already in the global theme) provides the correct form-like interaction with search.

  - [x] 5.3 Implement placeholder pages for other Console sections (`OverviewPage`, `SystemHealthPage`, `TelegramSetupPlaceholderPage`, `SubscriptionsPlaceholderPage`, `HokimAccountsPlaceholderPage`, `AiOperationsPlaceholderPage`, `AuditHistoryPlaceholderPage`) showing section title and active District scope.
- [x] Task 6: Districts List & Create UI (AC: 2, 3, 9, 10, 12)
  - [x] 6.1 Implement `apps/web/src/pages/DistrictsPage.tsx` with:
    - Honest empty state (`Ҳозирча туманлар мавжуд эмас`) with `Туман қўшиш` CTA.
    - Table / responsive card list displaying District Name, Region, Status (`Созлаш тугалланмаган` tag), and created date formatted in `Asia/Tashkent`.
    - Use `<Table scroll={{ x: 'max-content' }} />` with a `role="region"` wrapping container and `aria-label="Туманлар рўйхати"` (P5-F). On narrow screens the table scrolls horizontally inside this visible boundary. Full stacked-card responsive is deferred to a later story.
    - Status tag: `<Tag color="warning">Созлаш тугалланмаган</Tag>` using the AntD preset `"warning"` (P5-I). Extend `antd-theme.ts` with warning color tokens:
      ```ts
      token: {
        // existing tokens...
        colorWarning:   '#6B4B00',   // {colors.warning}
        colorWarningBg: '#FFF4D6',   // {colors.warning-surface}
      },
      ```
    - Action to set District as active context.
  - [x] 6.2 Implement `apps/web/src/components/CreateDistrictDrawer.tsx` **as a Drawer** (slides from right — consistent with the `detail-panel` edit-surface convention in EXPERIENCE.md). On narrow screens, the Drawer becomes full-screen via `width="100%"` below the breakpoint (P5-D — do NOT use Modal).
    - Form fields: `Туман номи` (required), `Вилоят / Ҳудуд` (optional).
    - Unsaved draft registration via `useDirtyState`.
    - **Accessible error summary implementation (P5-E):**
      - Render a `<div tabIndex={-1} ref={errorSummaryRef} id="create-district-error-summary">` at the top of the form (not `role="alert"` — that fires a competing screen reader announcement alongside the focus move).
      - On failed Save, call `errorSummaryRef.current?.focus()` imperatively in the mutation `onError` handler.
      - The summary contains: error count text + `<button onClick={() => fieldRef.focus()}>` links to each invalid field (not `<a href="#id">` — Drawer may not scroll to anchors reliably).
      - AntD `Form.Item` with `validateStatus="error"` and `help={errorMessage}` automatically sets `aria-invalid` and associates the error text via `aria-describedby` on the underlying `Input` — do not duplicate these attributes manually.
    - **Stable field IDs for Playwright (P5-E):**
      - District name input: `id="district-name-input"`
      - Region input: `id="district-region-input"`
      - Save button: `id="create-district-submit"`
      - Error summary div: `id="create-district-error-summary"`
    - Loading states, duplicate submission prevention, and automatic selection of newly created district.
- [x] Task 7: Automated Verification & Test Suite (AC: 1–12)
  - [x] 7.1 Implement Vitest integration tests in `apps/backend/tests/districts-lifecycle.test.ts` (against real PostgreSQL) (P6-C — consistent with `auth-lifecycle.test.ts` naming convention):

    Define at the top of the file (P6-G — matching `auth-lifecycle.test.ts`):
    ```ts
    const SAME_ORIGIN_HEADERS = { 'sec-fetch-site': 'same-origin' } as const;
    ```
    Every `server.inject()` call for POST endpoints must include these headers. Omitting them causes 403 responses that mask the actual test assertion.

    **Test matrix — all endpoint × auth state combinations must be covered (P6-D):**

    | Endpoint | Condition | Expected |
    |---|---|---|
    | `GET /api/v1/districts` | Unauthenticated | 401 |
    | `GET /api/v1/districts/:id` | Unauthenticated | 401 |
    | `GET /api/v1/districts/:id` | Authenticated + valid ID | 200 |
    | `GET /api/v1/districts/:id` | Authenticated + non-existent ID | 404 |
    | `POST /api/v1/districts` | Unauthenticated | 401 |
    | `POST /api/v1/districts` | Valid session + valid body | 201 |
    | `POST /api/v1/districts` | Valid session + duplicate name (case-insensitive) | 409 |
    | `POST /api/v1/districts` | Valid session + empty name | 400 |
    | `POST /api/v1/districts` | Cross-origin `Sec-Fetch-Site: cross-site` | 403 |

    Additional tests:
    - Verify empty district list on initial DB.
    - Verify district creation with UUID, trimmed name, and `SETUP_INCOMPLETE` status.
    - **Audit content privacy test (P6-E):** After district creation, query `audit_events` for `action = 'DISTRICT_CREATED'`. Assert `metadata` contains exactly `districtId`, `districtName`, and optionally `region`. Assert `JSON.stringify(metadata)` does not contain session cookie values, account password hashes, or unexpected fields.
    - **Case-insensitive duplicate name test (P6-F):** (1) Create district `"Yunusabad"` → expect 201. (2) Attempt `"yunusabad"` → expect 409 `DISTRICT_NAME_EXISTS`. This proves the `LOWER(name)` uniqueness index is enforced at the DB level.

  - [x] 7.2 Implement Playwright browser tests in `apps/web/tests/e2e/districts.spec.ts` (P6-A — `.spec.ts` extension and `e2e/` subdirectory required to match Playwright `testMatch` pattern used by `sign-in.spec.ts`):
    - Zero-district login and empty state verification.
    - Create district journey with accessible error summary validation on empty submit.
    - Successful district creation and list rendering with `Созлаш тугалланмаган`.
    - District selector interaction and persistent selection across navigation tabs.
    - **Dirty form + sign-out guard test (P6-H):**
      1. Sign in and navigate to Districts.
      2. Open `CreateDistrictDrawer`, fill in a district name (form is now dirty).
      3. Click the Sign Out button in the header.
      4. Verify `UnsavedChangesModal` appears (`Сақланмаган ўзгаришlar мавжуд`).
      5. Click `Таҳрирлашни давом эттириш` (Continue Editing).
      6. Verify modal closes, user is still on the console, district name field retains its value.
      7. Click Sign Out again → modal appears again.
      8. Click `Ўзгаришларни бекор қилиш` (Discard).
      9. Verify sign-out proceeds and browser navigates to `/sign-in`.
    - **Cache isolation test — implementation approach (P6-I):**
      1. Create two districts A and B via the API in `beforeAll`.
      2. Sign in, select District A — verify District A detail API is called.
      3. Set up `page.route()` intercept on `**/api/v1/districts/district-a-id/**` to count requests.
      4. Switch to District B.
      5. Navigate back to a District A-scoped section.
      6. Verify a **new network request** fires for District A (cache was purged — not served from memory). Request count should increment.
    - Keyboard navigation (Tab order, visible `#007A7C` focus outlines) and 44px touch targets.
  - [x] 7.3 Run full repository verification: `pnpm typecheck && pnpm test && pnpm test:e2e`.

    ⚠️ `pnpm test:e2e` requires the backend (port 3000) and frontend dev server (port 5173) to be running (P6-J). Check `apps/web/playwright.config.ts` for a `webServer` configuration. If absent, start servers manually (`pnpm dev` at monorepo root) before running E2E tests. Do not add server auto-start to the Playwright config as part of Story 1.2 — flag it as a follow-up infra task if needed.

  - [x] 7.4 Update `apps/web/tests/e2e/sign-in.spec.ts` (P6-B):

    The assertion referencing text from `ProtectedLandingPage` (e.g., `Масъул ходим бошқарув панели`) will fail after Story 1.2 replaces it with `ConsoleLayout` + `OverviewPage`. Update the assertion to verify the new Console landing state — for example the persistent header wordmark `Маҳалла Овози` or the `Умумий кўриниш` section heading. Run `pnpm test:e2e` after the update to confirm all existing E2E tests still pass.

### Review Findings

- [x] [Review][Patch] Catch PostgreSQL unique constraint violation (code 23505) and return 409 DISTRICT_NAME_EXISTS [`apps/backend/src/modules/districts/districts-routes.ts:42-53`]
- [x] [Review][Patch] Preserve client error messages for status < 500 in global error handler [`apps/backend/src/entrypoints/http.ts:60-83`]
- [x] [Review][Patch] Fix modal dismissal in UnsavedChangesModal so backdrop click/ESC cancels transition without data loss [`apps/web/src/components/UnsavedChangesModal.tsx:14-20`]
- [x] [Review][Patch] Propagate DOMException AbortError in api-client instead of misclassifying as NETWORK_ERROR [`apps/web/src/lib/api-client.ts:42-50`]
- [x] [Review][Patch] Align direct district activation with 4-step atomic query cancellation and cache purge sequence [`apps/web/src/district/district-context.tsx:101-103`]
- [x] [Review][Patch] Render error banner with retry button on district list query failure instead of misleading empty state [`apps/web/src/pages/DistrictsPage.tsx:128-163`]
- [x] [Review][Patch] Wrap prefers-reduced-motion custom properties in selector block in CSS [`apps/web/src/index.css:5-15`]
- [x] [Review][Patch] Make ApiError constructor parameters explicit to conform to repo coding standards [`apps/web/src/lib/api-client.ts:8-19`]
- [x] [Review][Patch] Introduce typed domain error classes for DistrictNotFoundError and DistrictNameExistsError [`apps/backend/src/modules/districts/districts-service.ts:43,65`]
- [x] [Review][Patch] Add distinct accessible aria-label to table action buttons [`apps/web/src/pages/DistrictsPage.tsx:90-97`]
- [x] [Review][Patch] Support opening create drawer directly from header dropdown on any route including /districts [`apps/web/src/components/ConsoleLayout.tsx:97-103,150`]
- [x] [Review][Patch] Add status check constraint to Drizzle schema definition and support nullish region in API contract [`apps/backend/src/adapters/db/schema/districts.ts:10`, `packages/api-contracts/src/districts.ts:31-39`]
- [x] [Review][Patch] Route audit event insertion through centralized recordAuditEvent service [`apps/backend/src/modules/districts/districts-service.ts:98-105`]

## Dev Notes

### Architecture Compliance & Invariants
- **Hexagonal Modular Monolith (`AD-1`):** District business rules reside in `apps/backend/src/modules/districts/`. Database queries and migrations live in `apps/backend/src/adapters/db/`. HTTP transport routes live in `apps/backend/src/modules/districts/districts-routes.ts`. Domain modules must not directly depend on HTTP framework objects or raw external drivers.
- **Stack Standards (`AD-2`):** pnpm workspace targeting Node.js 24 LTS, TypeScript 5.x, Fastify 5.x, React 19.x, Vite 6.x, Ant Design 5.x with `ConfigProvider` theme tokens, Drizzle ORM 0.45.x, PostgreSQL 16+ / 17+, Zod 3.x, TanStack Query 5.x. No Tailwind, no Redux/Zustand, no Next.js.
- **Relational Persistence & Migrations (`AD-3`, `AD-4`):** PostgreSQL is the sole system of record. Every schema change generates a versioned migration file in `apps/backend/drizzle/*.sql`. No automated schema-push in shared or test environments.
- **Database-backed Sessions, Explicit District Scope & Privacy (`AD-9`):**
  - All district-scoped entities must store `district_id`.
  - Missing district scope is an error (`400 Bad Request` or `404 Not Found`), never default "all districts".
  - Authorization is server-derived from the session; client-provided roles or scopes are never trusted without verification.
  - Plaintext secrets and resident message content must NEVER enter audit logs, application logs, telemetry, or URLs.
- **Same-origin REST Contracts & Scoped Frontend State (`AD-10`):**
  - All API routes live under `/api/v1/*`.
  - Request and response payloads are strictly validated against `@mahalla-ovozi/api-contracts`. Database models never cross the API boundary.
  - TanStack Query query keys MUST include the active `districtId`: `['district', districtId, ...]`.
  - Changing active District cancels in-flight prior-district queries, removes prior-district cached data via `queryClient.removeQueries`, and clears local interaction state. Late responses for a previous district MUST NOT render into the new district context.
  - Sensitive mutations use no optimistic updates.

### UI System, Ant Design Tokens & Uzbek Cyrillic Microcopy
- **Design Tokens (`DESIGN.md`, `EXPERIENCE.md`):**
  - Use `theme.useToken()` in all custom styled components — never use hardcoded hex colors.
  - Background layout: `token.colorBgLayout` (`#F5F7F6`)
  - Container background: `token.colorBgContainer` (`#FFFFFF`)
  - Primary color: `token.colorPrimary` (`#0F5C5E`)
  - Focus color: `#007A7C` — **Focus ring strategy (P5-A):** `#007A7C` has no named token in AntD 5's `theme.useToken()` API. Define it as a CSS custom property in `apps/web/src/index.css`:
    ```css
    :root { --mahalla-focus: #007A7C; }
    ```
    Use `var(--mahalla-focus)` in component-level styles for custom focus rings (e.g., sidebar nav items). AntD form inputs already use `#007A7C` via `antd-theme.ts` `Input.activeBorderColor` — that remains the single definition point for input focus color.
  - Border radius: `token.borderRadius` (`8px`)
  - Minimum touch target: `44px`

- **`prefers-reduced-motion` CSS (P5-J):** Add to `apps/web/src/index.css`:
  ```css
  @media (prefers-reduced-motion: reduce) {
    --antd-motion-duration-slow: 0ms;
    --antd-motion-duration-mid:  0ms;
    --antd-motion-duration-fast: 0ms;
  }
  ```
  This disables AntD Drawer/Modal slide animations without per-component overrides. Required by EXPERIENCE.md: *"Under prefers-reduced-motion: reduce, make drawer… transitions immediate."*
- **Uzbek Cyrillic Microcopy Dictionary:**
  - Application Wordmark: `Маҳалла Овози`
  - Navigation:
    - Overview: `Умумий кўриниш`
    - System Health: `Тизим ҳолати`
    - Districts: `Туманлар`
    - Telegram Setup: `Телеграм созламалари`
    - Subscriptions: `Обуналар`
    - Hokim Accounts: `Ҳоким ҳисоблари`
    - AI Operations: `АИ операциялари`
    - Audit History: `Аудит тарихи`
  - District Selection:
    - Selector placeholder: `Туманни танланг`
    - No District selected: `Туман танланмаган`
    - All Districts: `Барча туманлар`
  - Empty State: `Ҳозирча туманлар мавжуд эмас`
  - Create District Action: `Туман қўшиш`
  - District Status: `Созлаш тугалланмаган` (`SETUP_INCOMPLETE`)
  - Form Fields:
    - District Name: `Туман номи`
    - Region: `Вилоят / Ҳудуд`
  - Form Actions: `Сақлаш` (Save), `Бекор қилиш` (Cancel)
  - Dirty State Guard:
    - Title: `Сақланмаган ўзгаришлар мавжуд`
    - Message: `Киритилган маълумотлар сақланмаган. Саҳифани тарк этсангиз, ўзгаришлар йўқолади.`
    - Discard: `Ўзгаришларни бекор қилиш`
    - Continue: `Таҳрирлашни давом эттириш`
  - Error Messages:
    - Duplicate Name: `Бу номдаги туман аллақачон мавжуд.`
    - Required Name: `Туман номи камида 2 та белгидан иборат бўлиши керак.`
    - Server Error: `Серверда кутилмаган хатолик юз берди.`
    - Offline Notice: `Сервер билан алоқа мавжуд эмас. Тармоқни текширинг.`

### Anti-Patterns to Prevent
- **No Leaky Contracts:** Never export Drizzle database models or raw DB rows to `packages/api-contracts` or the web app.
- **No Persistent Client Cache of Sensitive Data:** Do not serialize district query caches or sensitive state to `localStorage` or `sessionStorage`. Memory-only React / TanStack Query cache that purges on switch/sign-out is required (`AD-10`).
- **No Global Store Overkill:** Do not install Redux, Zustand, Recoil, or MobX. Use TanStack Query for server state and React Context for active district and dirty state.
- **No Optimistic District Creation:** Never update client state optimistically before receiving 200 OK from the backend.
- **No Bypassing Origin Defense:** Every state-changing endpoint (`POST`) must verify `Origin` and `Sec-Fetch-Site` headers via `verifyStateChangingOrigin`.

### Previous Story Intelligence & Lessons Learned (from Story 1.1)
- **F1 (Hex Colors):** All frontend components must use `theme.useToken()` or CSS variables, not hardcoded hex strings.
- **F2 (Sign-Out Error Handling):** Network errors during session state transitions must inform the user rather than failing silently.
- **F3 (AppErrorBoundary):** Keep `AppErrorBoundary` wrapping the app root to catch uncaught component rendering exceptions gracefully.
- **B3 (Origin Guard Fail-Closed):** State-changing requests with invalid or missing Origin/Sec-Fetch-Site must fail closed with 403 before executing business logic.
- **B4 (Host Cookies):** `__Host-` cookies require `secure: true` and `SameSite=Strict`.
- **B8 (Sanitized Error Handler):** Fastify error handler logs raw errors for telemetry but returns sanitized `{ error: { code, message } }` to the client.
- **B10 (Unicode Code Points):** Validate string lengths using Unicode code point spread (`[...val].length`) to prevent emoji/surrogate pair discrepancies.
- **B11 (CORS Origin Restriction):** Fastify CORS is strictly restricted to `APP_ORIGIN`.

### Testing Standards & Guardrails
- **Integration Tests (Vitest):** Run against a real PostgreSQL container. Test all HTTP status codes: 200, 201, 400 (validation), 401 (unauthorized), 403 (forbidden origin), 404 (not found), 409 (duplicate conflict). Include `headers: { 'sec-fetch-site': 'same-origin' }` on all POST test requests.
- **Browser Tests (Playwright):** Test end-to-end user journeys in headless Chromium/Firefox/WebKit. Test zero-state, creation flow, error summary focus, district selector switching, dirty state prompt cancellation/discard, and keyboard accessibility.

### Project Structure Notes

```text
mahalla-ovozi-new/
├── apps/
│   ├── backend/
│   │   ├── drizzle/
│   │   │   ├── 0000_burly_george_stacy.sql
│   │   │   └── 0001_<drizzle-generated-slug>.sql # [NEW] Migration for districts (name auto-generated by drizzle-kit)
│   │   ├── src/
│   │   │   ├── adapters/
│   │   │   │   └── db/
│   │   │   │       ├── schema/
│   │   │   │       │   ├── accounts.ts
│   │   │   │       │   ├── sessions.ts
│   │   │   │       │   ├── audit.ts
│   │   │   │       │   ├── rate-limits.ts
│   │   │   │       │   ├── districts.ts          # [NEW] Drizzle schema for districts
│   │   │   │       │   └── index.ts              # [MODIFY] Export districts
│   │   │   ├── entrypoints/
│   │   │   │   └── http.ts                       # [MODIFY] Register districts routes
│   │   │   └── modules/
│   │   │       ├── auth/
│   │   │       │   ├── auth-routes.ts
│   │   │       │   ├── session-manager.ts
│   │   │       │   ├── origin-guard.ts
│   │   │       │   └── require-product-owner.ts  # [NEW] PO session verification preHandler hook
│   │   │       └── districts/                    # [NEW] Districts domain module
│   │   │           ├── districts-service.ts      # [NEW] District business logic & audit
│   │   │           └── districts-routes.ts       # [NEW] Fastify route endpoints
│   │   └── tests/
│   │       ├── auth.test.ts
│   │       └── districts-lifecycle.test.ts       # [NEW] Vitest integration tests
│   └── web/
│       ├── src/
│       │   ├── auth/
│       │   │   ├── auth-client.ts                # [MODIFY] Import request<T>/ApiError from lib/api-client
│       │   │   ├── auth-context.tsx
│       │   │   └── ProtectedRoute.tsx
│       │   ├── lib/                              # [NEW] Shared frontend utilities
│       │   │   └── api-client.ts                 # [NEW] Shared request<T> + ApiError
│       │   ├── district/                         # [NEW] District state management
│       │   │   ├── district-client.ts            # [NEW] Typed API client for districts
│       │   │   ├── district-context.tsx          # [NEW] DistrictProvider & useDistrict hook
│       │   │   └── useDirtyState.ts              # [NEW] Dirty state registration hook
│       │   ├── components/
│       │   │   ├── AppErrorBoundary.tsx
│       │   │   ├── FullPageLoader.tsx
│       │   │   ├── ConsoleLayout.tsx             # [NEW] Persistent 8-section layout shell
│       │   │   ├── DistrictSelector.tsx          # [NEW] Header dropdown district selector
│       │   │   ├── UnsavedChangesModal.tsx       # [NEW] Dirty-state confirmation modal
│       │   │   └── CreateDistrictDrawer.tsx      # [NEW] District creation drawer/form
│       │   ├── pages/
│       │   │   ├── SignInPage.tsx
│       │   │   ├── ProtectedLandingPage.tsx      # [MODIFY/REPLACE with Console Overview]
│       │   │   ├── DistrictsPage.tsx             # [NEW] Districts list & empty state view
│       │   │   └── placeholders/                 # [NEW] Placeholder pages for other 6 sections
│       │   │       ├── SystemHealthPage.tsx
│       │   │       ├── TelegramSetupPage.tsx
│       │   │       ├── SubscriptionsPage.tsx
│       │   │       ├── HokimAccountsPage.tsx
│       │   │       ├── AiOperationsPage.tsx
│       │   │       └── AuditHistoryPage.tsx
│       │   ├── theme/
│       │   │   └── antd-theme.ts
│       │   ├── App.tsx                           # [MODIFY] Wrap with DistrictProvider & add layout routes
│       │   └── main.tsx
│       └── tests/
│           └── e2e/                              # [NEW] Playwright E2E tests directory
│               ├── sign-in.spec.ts               # [MODIFY] Update landing assertion for ConsoleLayout
│               └── districts.spec.ts             # [NEW] Playwright E2E browser tests
└── packages/
    └── api-contracts/
        └── src/
            ├── auth.ts
            ├── districts.ts                      # [NEW] Zod contracts for districts
            └── index.ts                          # [MODIFY] Export districts contracts
```

### Architecture Compliance — Additional Notes

**`DISTRICT_CREATED` Audit Payload (P2-E):**
The audit event metadata field must contain only privacy-safe operational identifiers:
```ts
metadata: {
  districtId:   string;   // the new district's UUID
  districtName: string;   // trimmed name as stored
  region?:      string;   // only if provided
}
```
Never log the full district object, session tokens, or account IDs beyond the `actorId` field already on the audit record.

### References
- `_bmad-output/planning-artifacts/epics/epic-1.md#Story-1.2`
- `_bmad-output/planning-artifacts/architecture/architecture-Mahalla-Ovozi-2026-08-12/ARCHITECTURE-SPINE.md#AD-1`
- `_bmad-output/planning-artifacts/architecture/architecture-Mahalla-Ovozi-2026-08-12/ARCHITECTURE-SPINE.md#AD-2`
- `_bmad-output/planning-artifacts/architecture/architecture-Mahalla-Ovozi-2026-08-12/ARCHITECTURE-SPINE.md#AD-3`
- `_bmad-output/planning-artifacts/architecture/architecture-Mahalla-Ovozi-2026-08-12/ARCHITECTURE-SPINE.md#AD-4`
- `_bmad-output/planning-artifacts/architecture/architecture-Mahalla-Ovozi-2026-08-12/ARCHITECTURE-SPINE.md#AD-9`
- `_bmad-output/planning-artifacts/architecture/architecture-Mahalla-Ovozi-2026-08-12/ARCHITECTURE-SPINE.md#AD-10`
- `_bmad-output/planning-artifacts/ux-designs/ux-Mahalla-Ovozi-2026-08-05/EXPERIENCE.md#UJ-2`
- `_bmad-output/planning-artifacts/ux-designs/ux-Mahalla-Ovozi-2026-08-05/EXPERIENCE.md#UJ-3`
- `_bmad-output/planning-artifacts/ux-designs/ux-Mahalla-Ovozi-2026-08-05/DESIGN.md`

## Dev Agent Record

### Agent Model Used

Gemini 3.7 Flash (High)

### Debug Log References

None yet — ready for dev.

### Completion Notes List
- Task 7: Automated Verification & Test Suite completed. 38/38 backend tests (including districts lifecycle integration tests against real PostgreSQL), 14/14 web unit tests, 22/22 api-contract tests, and 8/8 Playwright E2E browser tests (including district creation, switcher auto-selection, dirty state modal, keyboard navigation, and sign-in flow) passing. Monorepo typecheck passed cleanly with 0 errors.
- Task 6: Districts List & Create UI implemented and verified with 3 unit tests. Implemented `CreateDistrictDrawer.tsx` with accessible error summary, focus management, stable element IDs, and dirty tracking via `useDirtyState`. Built `DistrictsPage.tsx` with honest empty state, accessible table region (`role="region"`), Tashkent date formatting, and status warning tag. All 14 web unit tests passing.
- Task 5: Persistent Console Layout & Shell Navigation implemented and verified with 3 unit tests. Configured `--mahalla-focus: #007A7C` and reduced-motion media queries in `index.css`, added `Menu` and warning color tokens in `antd-theme.ts`, implemented `DistrictSelector.tsx` with `popupRender` quick action, built 6 placeholder section pages, built `ConsoleLayout.tsx` with Cyrillic wordmark `Маҳалла Овози` and offline banner, and configured React Router 7 nested layout routes in `App.tsx`. All 11 web unit tests passing.
- Task 4: Frontend District Context & Switching Engine implemented and verified with 5 unit tests. Extracted `ApiError` and `request<T>` to `lib/api-client.ts`, implemented `district-client.ts`, `useDirtyState.ts` hook with unmount auto-cleanup, `district-context.tsx` (`DistrictProvider`, `useDistrict`) with the strict 4-step atomic switch sequence, and `UnsavedChangesModal.tsx` with Uzbek Cyrillic safe continue action. All 8 web unit tests passing.
- Task 3: Backend District Service & HTTP Endpoints implemented and verified with 11 lifecycle integration tests. Implemented `requireProductOwner` hook reusing `validateAndTouchSession`, `districts-service.ts` with transactional district + audit insertion and case-insensitive check, `districts-routes.ts` within an encapsulated Fastify plugin scope, and registered routes in `http.ts`. All 38 backend tests passing.
- Task 2: Database Schema & Migration for Districts implemented and verified. Created `districts` Drizzle table with `LOWER(name)` unique index, generated migration `0001_wise_the_order.sql`, added `districts_status_check` CHECK constraint, successfully ran migration on PostgreSQL, and verified DB constraints via `apps/backend/tests/db-schema.test.ts`. All 27 backend tests passing.
- Task 1: Shared API Contracts implemented and verified with 13 unit tests. Defined `DistrictStatusSchema`, `DistrictSchema` (`createdAt` ISO-8601), `CreateDistrictRequestSchema` (strict code-point validation via spread length, `.trim()` before bounds, region empty-string to undefined), `CreateDistrictResponseSchema`, `ListDistrictsResponseSchema`, and `GetDistrictResponseSchema`. All 22 tests in `@mahalla-ovozi/api-contracts` passing.
- Story context engine analysis completed; comprehensive BMad developer guide created.
- All 12 BDD Acceptance Criteria, 7 structured tasks/subtasks, exhaustive dev notes, architecture invariants, UX tokens, and test requirements specified.

### File List

- `packages/api-contracts/src/districts.ts`
- `packages/api-contracts/src/index.ts`
- `packages/api-contracts/tests/districts-contracts.test.ts`
- `apps/backend/src/adapters/db/schema/districts.ts`
- `apps/backend/src/adapters/db/schema/index.ts`
- `apps/backend/drizzle/0001_wise_the_order.sql`
- `apps/backend/src/modules/auth/require-product-owner.ts`
- `apps/backend/src/modules/districts/districts-service.ts`
- `apps/backend/src/modules/districts/districts-routes.ts`
- `apps/backend/src/entrypoints/http.ts`
- `apps/backend/src/cli/manage-product-owner.ts`
- `apps/backend/tests/districts-lifecycle.test.ts`
- `apps/backend/tests/db-schema.test.ts`
- `apps/web/src/lib/api-client.ts`
- `apps/web/src/auth/auth-client.ts`
- `apps/web/src/district/district-client.ts`
- `apps/web/src/district/district-context.tsx`
- `apps/web/src/district/useDirtyState.ts`
- `apps/web/src/components/ConsoleLayout.tsx`
- `apps/web/src/components/DistrictSelector.tsx`
- `apps/web/src/components/UnsavedChangesModal.tsx`
- `apps/web/src/components/CreateDistrictDrawer.tsx`
- `apps/web/src/pages/DistrictsPage.tsx`
- `apps/web/src/pages/OverviewPage.tsx`
- `apps/web/src/pages/placeholders/SystemHealthPage.tsx`
- `apps/web/src/pages/placeholders/TelegramSetupPage.tsx`
- `apps/web/src/pages/placeholders/SubscriptionsPage.tsx`
- `apps/web/src/pages/placeholders/HokimAccountsPage.tsx`
- `apps/web/src/pages/placeholders/AiOperationsPage.tsx`
- `apps/web/src/pages/placeholders/AuditHistoryPage.tsx`
- `apps/web/src/App.tsx`
- `apps/web/src/theme/antd-theme.ts`
- `apps/web/src/index.css`
- `apps/web/tests/unit/district-state.test.tsx`
- `apps/web/tests/unit/ConsoleLayout.test.tsx`
- `apps/web/tests/unit/DistrictsPage.test.tsx`
- `apps/web/tests/e2e/sign-in.spec.ts`
- `apps/web/tests/e2e/districts.spec.ts`
- `apps/backend/src/modules/auth/require-product-owner.ts`
- `apps/backend/src/modules/districts/districts-service.ts`
- `apps/backend/src/modules/districts/districts-routes.ts`
- `apps/backend/src/entrypoints/http.ts`
- `apps/backend/tests/districts-lifecycle.test.ts`
- `apps/web/src/lib/api-client.ts`
- `apps/web/src/auth/auth-client.ts`
- `apps/web/src/district/district-client.ts`
- `apps/web/src/district/district-context.tsx`
- `apps/web/src/district/useDirtyState.ts`
- `apps/web/src/components/ConsoleLayout.tsx`
- `apps/web/src/components/DistrictSelector.tsx`
- `apps/web/src/components/UnsavedChangesModal.tsx`
- `apps/web/src/components/CreateDistrictDrawer.tsx`
- `apps/web/src/pages/DistrictsPage.tsx`
- `apps/web/src/pages/placeholders/SystemHealthPage.tsx`
- `apps/web/src/pages/placeholders/TelegramSetupPage.tsx`
- `apps/web/src/pages/placeholders/SubscriptionsPage.tsx`
- `apps/web/src/pages/placeholders/HokimAccountsPage.tsx`
- `apps/web/src/pages/placeholders/AiOperationsPage.tsx`
- `apps/web/src/pages/placeholders/AuditHistoryPage.tsx`
- `apps/web/src/App.tsx`
- `apps/web/src/theme/antd-theme.ts`
- `apps/web/src/index.css`
- `apps/web/tests/e2e/sign-in.spec.ts`
- `apps/web/tests/e2e/districts.spec.ts`

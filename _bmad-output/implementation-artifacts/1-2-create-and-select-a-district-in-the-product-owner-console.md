---
baseline_commit: e300d0800ca9d7e4e18640a14a6059e81092e68b
---

# Story 1.2: Create and Select a District in the Product Owner Console

Status: ready-for-dev

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

- [ ] Task 1: Shared API Contracts for District Management (AC: 4, 5, 9, 10)
  - [ ] 1.1 Create `packages/api-contracts/src/districts.ts` defining `DistrictStatusSchema` (`'SETUP_INCOMPLETE' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED'`), `DistrictSchema`, `CreateDistrictRequestSchema`, `CreateDistrictResponseSchema`, `ListDistrictsResponseSchema`, and `GetDistrictResponseSchema`.
  - [ ] 1.2 Implement strict code-point validation for district names (2–100 Unicode code points, trimmed, required) and optional region strings (max 100 code points).
  - [ ] 1.3 Export all district schemas and types in `packages/api-contracts/src/index.ts`.
- [ ] Task 2: Database Schema & Migration for Districts (AC: 2, 3, 4)
  - [ ] 2.1 Create `apps/backend/src/adapters/db/schema/districts.ts` with `districts` table (`id text primary key`, `name text not null unique`, `region text`, `status text not null default 'SETUP_INCOMPLETE'`, `createdAt timestamptz`, `updatedAt timestamptz`) and indexes on `name` and `status`.
  - [ ] 2.2 Re-export `districts` in `apps/backend/src/adapters/db/schema/index.ts`.
  - [ ] 2.3 Generate version-controlled SQL migration `apps/backend/drizzle/0001_*.sql` using `pnpm --filter @mahalla-ovozi/backend db:generate`.
  - [ ] 2.4 Verify migration execution with `pnpm --filter @mahalla-ovozi/backend db:migrate`.
- [ ] Task 3: Backend District Service & HTTP Endpoints (AC: 2, 3, 4, 5, 9, 10)
  - [ ] 3.1 Implement `apps/backend/src/modules/districts/districts-service.ts` with pure business logic: `listDistricts` (ordered by name ASC), `getDistrictById` (throws 404 `DISTRICT_NOT_FOUND`), and `createDistrict` (checks case-insensitive uniqueness, generates UUID, writes `DISTRICT_CREATED` audit event, handles 409 `DISTRICT_NAME_EXISTS`).
  - [ ] 3.2 Implement `requireProductOwner` session verification hook to authenticate PO sessions on protected routes.
  - [ ] 3.3 Implement `apps/backend/src/modules/districts/districts-routes.ts` defining `GET /api/v1/districts`, `POST /api/v1/districts`, and `GET /api/v1/districts/:districtId` with Zod validation, Origin defense pre-handler, and sanitized error responses.
  - [ ] 3.4 Register district routes in `apps/backend/src/entrypoints/http.ts`.
- [ ] Task 4: Frontend District Context & Switching Engine (AC: 1, 6, 7, 8, 11)
  - [ ] 4.1 Implement `apps/web/src/district/district-client.ts` with typed methods for listing, fetching, and creating districts using `authClient` fetch wrappers.
  - [ ] 4.2 Implement `apps/web/src/district/useDirtyState.ts` hook allowing forms/views to register dirty drafts and intercept context changes.
  - [ ] 4.3 Implement `apps/web/src/district/district-context.tsx` (`DistrictProvider`, `useDistrict`) managing `activeDistrictId`, `activeDistrict`, `districtsList`, and atomic switching mechanics (request cancellation, cache purge via `queryClient.removeQueries`, interaction state reset).
  - [ ] 4.4 Implement `apps/web/src/components/UnsavedChangesModal.tsx` displaying the approved Uzbek Cyrillic dirty-state confirmation (`Сақланмаган ўзгаришлар мавжуд`, `Ўзгаришларни бекор қилиш`, `Таҳрирлашни давом эттириш`).
- [ ] Task 5: Persistent Console Layout & Shell (AC: 1, 6, 12)
  - [ ] 5.1 Implement `apps/web/src/components/ConsoleLayout.tsx` featuring Ant Design `Layout` with:
    - Sidebar navigation with all 8 Uzbek Cyrillic sections: `Умумий кўриниш`, `Тизим ҳолати`, `Туманлар`, `Телеграм созламалари`, `Обуналар`, `Ҳоким ҳисоблари`, `АИ операциялари`, `Аудит тарихи`.
    - Persistent Header with `Маҳалла Овози` wordmark, `DistrictSelector` dropdown, user tag, and sign-out button.
    - Offline notification banner when `navigator.onLine === false` or API connection fails.
  - [ ] 5.2 Implement `apps/web/src/components/DistrictSelector.tsx` dropdown showing active District with quick search/switch and `+ Туман қўшиш` quick action.
  - [ ] 5.3 Implement placeholder pages for other Console sections (`OverviewPage`, `SystemHealthPage`, `TelegramSetupPlaceholderPage`, `SubscriptionsPlaceholderPage`, `HokimAccountsPlaceholderPage`, `AiOperationsPlaceholderPage`, `AuditHistoryPlaceholderPage`) showing section title and active District scope.
- [ ] Task 6: Districts List & Create UI (AC: 2, 3, 9, 10, 12)
  - [ ] 6.1 Implement `apps/web/src/pages/DistrictsPage.tsx` with:
    - Honest empty state (`Ҳозирча туманлар мавжуд эмас`) with `Туман қўшиш` CTA.
    - Table / responsive card list displaying District Name, Region, Status (`Созлаш тугалланмаган` tag), and created date formatted in `Asia/Tashkent`.
    - Action to set District as active context.
  - [ ] 6.2 Implement `apps/web/src/components/CreateDistrictDrawer.tsx` (or Modal) with:
    - Form fields: `Туман номи` (required), `Вилоят / Ҳудуд` (optional).
    - Unsaved draft registration via `useDirtyState`.
    - Focusable accessible error summary on validation failure with links to invalid fields.
    - Loading states, duplicate submission prevention, and automatic selection of newly created district.
- [ ] Task 7: Automated Verification & Test Suite (AC: 1–12)
  - [ ] 7.1 Implement Vitest integration tests in `apps/backend/tests/districts.test.ts` (against real PostgreSQL):
    - Verify empty district list on initial DB.
    - Verify district creation with UUID, trimmed name, and `SETUP_INCOMPLETE` status.
    - Verify `DISTRICT_CREATED` audit event emission.
    - Verify 409 rejection on duplicate district name.
    - Verify 400 rejection on invalid/empty names.
    - Verify 403 rejection on state-changing cross-origin POST.
    - Verify 404 on non-existent district ID lookup.
    - Verify 401 on unauthenticated access.
  - [ ] 7.2 Implement Playwright browser tests in `apps/web/tests/districts.e2e.ts`:
    - Zero-district login and empty state verification.
    - Create district journey with accessible error summary validation on empty submit.
    - Successful district creation and list rendering with `Созлаш тугалланмаган`.
    - District selector interaction and persistent selection across navigation tabs.
    - Dirty state guard test: trigger switch with dirty form -> verify prompt -> cancel -> verify draft kept -> discard -> verify transition completed.
    - Cache isolation test: verify switching districts clears prior district query cache.
    - Keyboard navigation (Tab order, visible `#007A7C` focus outlines) and 44px touch targets.
  - [ ] 7.3 Run full repository verification: `pnpm typecheck && pnpm test && pnpm test:e2e`.

## Dev Notes

### Architecture Compliance & Invariants
- **Hexagonal Modular Monolith (`AD-1`):** District business rules reside in `apps/backend/src/modules/districts/`. Database queries and migrations live in `apps/backend/src/adapters/db/`. HTTP transport routes live in `apps/backend/src/modules/districts/districts-routes.ts`. Domain modules must not directly depend on HTTP framework objects or raw external drivers.
- **Stack Standards (`AD-2`):** pnpm workspace targeting Node.js 24 LTS, TypeScript 6.0.x, Fastify 5.10.x, React 19.2.x, Vite 8.x, Ant Design 5/6 with `ConfigProvider` theme tokens, Drizzle ORM 0.45.2, PostgreSQL 18.4, Zod 3/4, TanStack Query 5.x. No Tailwind, no Redux/Zustand, no Next.js.
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
  - Focus color: `#007A7C`
  - Border radius: `token.borderRadius` (`8px`)
  - Minimum touch target: `44px`
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
│   │   │   └── 0001_add_districts_table.sql      # [NEW] Migration for districts
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
│   │   │       │   └── origin-guard.ts
│   │   │       └── districts/                    # [NEW] Districts domain module
│   │   │           ├── districts-service.ts      # [NEW] District business logic & audit
│   │   │           └── districts-routes.ts       # [NEW] Fastify route endpoints
│   │   └── tests/
│   │       ├── auth.test.ts
│   │       └── districts.test.ts                 # [NEW] Vitest integration tests
│   └── web/
│       ├── src/
│       │   ├── auth/
│       │   │   ├── auth-context.tsx
│       │   │   └── ProtectedRoute.tsx
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
│       │   ├── App.tsx                           # [MODIFY] Wrap with DistrictProvider & add routes
│       │   └── main.tsx
│       └── tests/
│           ├── auth.e2e.ts
│           └── districts.e2e.ts                  # [NEW] Playwright E2E browser tests
└── packages/
    └── api-contracts/
        └── src/
            ├── auth.ts
            ├── districts.ts                      # [NEW] Zod contracts for districts
            └── index.ts                          # [MODIFY] Export districts contracts
```

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

- Story context engine analysis completed; comprehensive BMad developer guide created.
- All 12 BDD Acceptance Criteria, 7 structured tasks/subtasks, exhaustive dev notes, architecture invariants, UX tokens, and test requirements specified.

### File List

- `packages/api-contracts/src/districts.ts`
- `packages/api-contracts/src/index.ts`
- `apps/backend/src/adapters/db/schema/districts.ts`
- `apps/backend/src/adapters/db/schema/index.ts`
- `apps/backend/drizzle/0001_*.sql`
- `apps/backend/src/modules/districts/districts-service.ts`
- `apps/backend/src/modules/districts/districts-routes.ts`
- `apps/backend/src/entrypoints/http.ts`
- `apps/backend/tests/districts.test.ts`
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
- `apps/web/tests/districts.e2e.ts`

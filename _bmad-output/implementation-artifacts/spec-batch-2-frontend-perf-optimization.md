---
title: 'Batch 2 Frontend Rendering & Bundle Optimization'
type: 'refactor'
created: '2026-08-30'
status: 'done'
baseline_commit: '8ff7291473e9ea932b16f88f3d47b8caf4044daa'
review_loop_iteration: 0
context:
  - '_bmad-output/project-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The frontend web application was bundled into single monolithic chunks because route pages were eagerly imported in `App.tsx`, forcing users to download all page code upfront. Context values (`DistrictProvider`) were re-instantiated as inline objects on every render, triggering cascading re-renders across the component tree. Table column definitions recreated and remounted DOM elements on URL param changes, and board fetch callbacks re-instantiated frequently.

**Approach:** Implement route-level code splitting using `React.lazy()` with `<Suspense fallback={<FullPageLoader />}>`, wrap `DistrictContext.Provider` value in `useMemo`, add nested route Suspense in `ConsoleLayout.tsx`, stabilize `setSearchParams` functional updates in `DistrictsPage.tsx`, and access `lanesStateRef.current` in `useHokimTopicBoard.ts`.

## Boundaries & Constraints

**Always:**
- Keep the frontend a pure React 19 SPA with `react-router-dom` v7 and Ant Design 5.
- Preserve all existing routing structure, role-based guards, protected routes, and breadcrumbs.
- Ensure all lazy routes render seamlessly inside `<Suspense>` with Ant Design theme tokens preserved.
- Maintain full TypeScript strictness without using `any` or broad assertions.

**Ask First:**
- Any change to user-facing page layouts, loading indicators, or route paths.

**Never:**
- Never remove or break existing unit tests or Playwright tests.
- Never add unnecessary global state libraries.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Initial Application Load (H-6) | User visits `/sign-in` or `/` | Only root shell and current page chunk are downloaded | Suspense boundary displays `FullPageLoader` during async chunk fetch |
| Route Navigation (H-6) | User navigates from Overview to Hokim Accounts | Target page chunk loads asynchronously on demand | `AppErrorBoundary` catches network chunk load errors |
| District Provider State Tick (H-7) | `activeDistrictId` or dirty form state changes | Context consumers receive memoized value without extra render passes for unaffected components | N/A |
| URL Search Param Change (M-4) | Drawer opens with `?action=create` | Ant Design `<Table>` preserves existing column configuration without re-mount | N/A |

</frozen-after-approval>

## Code Map

- `apps/web/src/App.tsx` -- Root application router, suspense boundary, and lazy page imports
- `apps/web/src/components/ConsoleLayout.tsx` -- Layout-level suspense boundary preserving navigation frame during page chunk loading
- `apps/web/src/district/district-context.tsx` -- Multi-tenant district context provider and memoized value
- `apps/web/src/pages/DistrictsPage.tsx` -- Ant Design Table column memoization and functional search param updater
- `apps/web/src/topics/useHokimTopicBoard.ts` -- Board callback stability and ref-based state access
- `apps/web/src/components/FullPageLoader.tsx` -- Suspense fallback component

## Tasks & Acceptance

**Execution:**
- [x] `apps/web/src/App.tsx` -- Convert page imports to `React.lazy()` and wrap `<Routes>` in `<Suspense fallback={<FullPageLoader />}>` -- Enables route-level chunking and eliminates single-bundle initial load overhead.
- [x] `apps/web/src/components/ConsoleLayout.tsx` -- Wrap `<Outlet />` in `<Suspense fallback={<FullPageLoader />}>` -- Keeps sidebar and header stable during sub-route navigation.
- [x] `apps/web/src/district/district-context.tsx` -- Wrap `DistrictContext.Provider` value in `useMemo` -- Eliminates cascading re-renders across the entire React component tree on state updates.
- [x] `apps/web/src/pages/DistrictsPage.tsx` -- Remove `searchParams` from table columns and convert `setSearchParams` to functional updater -- Prevents table DOM remounts while eliminating stale closures.
- [x] `apps/web/src/topics/useHokimTopicBoard.ts` -- Maintain `lanesStateRef` in `loadMore` to decouple callback creation from frequent lane state updates -- Prevents board column re-render thrashing.

## Acceptance Criteria
- Given the React application bundle build, when inspected via Vite build, then page components are split into distinct dynamic chunks.
- Given the `DistrictProvider`, when internal state updates occur, then child components only re-render if the properties they consume change.
- Given the `DistrictsPage`, when drawer or search parameters change in the URL, then table columns remain memoized.
- Given `useHokimTopicBoard`, when topics update, then `loadMore` maintains a stable callback identity.

## Verification

**Commands:**
- `pnpm --filter @mahalla-ovozi/web build` -- expected: Clean build with code-split page chunks in dist
- `pnpm -r typecheck` -- expected: 0 TypeScript compiler errors across monorepo
- `pnpm -r test` -- expected: All 60 backend test suites and 49 frontend test suites pass

## Suggested Review Order

**Route-Level Code Splitting & Suspense Boundaries**

- Converted eager page imports to dynamic `React.lazy()` chunk loaders
  [`App.tsx:14`](../../apps/web/src/App.tsx#L14)

- Added layout-level Suspense wrapper around nested route `<Outlet />`
  [`ConsoleLayout.tsx:199`](../../apps/web/src/components/ConsoleLayout.tsx#L199)

**Context Memoization & Re-render Prevention**

- Wrapped DistrictContext provider value in `useMemo`
  [`district-context.tsx:135`](../../apps/web/src/district/district-context.tsx#L135)

**Component & Hook Callback Stabilization**

- Stabilized URL parameter manipulation and removed searchParams from table columns
  [`DistrictsPage.tsx:58`](../../apps/web/src/pages/DistrictsPage.tsx#L58)

- Switched `loadMore` to access `lanesStateRef.current` to stabilize callback identity
  [`useHokimTopicBoard.ts:375`](../../apps/web/src/topics/useHokimTopicBoard.ts#L375)

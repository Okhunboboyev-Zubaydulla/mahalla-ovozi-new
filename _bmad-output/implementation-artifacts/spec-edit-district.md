---
title: 'Edit District Details in Console'
type: 'feature'
created: '2026-08-23T13:46:00+05:00'
status: 'done'
baseline_commit: '731734cfef8a94b8b3039ce7496f7e5b0a936434'
review_loop_iteration: 0
context:
  - '_bmad-output/planning-artifacts/architecture/architecture-Mahalla-Ovozi-2026-08-12/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Product owners cannot edit a district's metadata (e.g. name or region/province) in the management console after creating it, requiring manual DB intervention if a typo was made or administrative details changed.

**Approach:** Introduce a `PATCH /api/v1/districts/:districtId` API endpoint with case-insensitive unique constraint validation and audit logging, and add an Edit action with an accessible Ant Design drawer (`EditDistrictDrawer`) to the Districts page (`/districts`).

## Boundaries & Constraints

**Always:**
- Keep district name uniqueness case-insensitive across all districts (excluding the district being edited).
- Record a privacy-safe `DISTRICT_UPDATED` event in `audit_events` containing `{ districtId, oldName, newName, oldRegion, newRegion }` in an atomic transaction.
- Update `updatedAt: new Date()` on all district mutations.
- Maintain Ant Design 5 tokens (`theme.useToken()`), `destroyOnClose`, accessible error summaries, and form dirty-state protection (`useDirtyState`).
- Require Product Owner authentication (`requireProductOwner`) and same-origin validation (`verifyStateChangingOrigin`).

**Ask First:**
- Adding district deletion or permanent archival capabilities (handled separately under Epic 6).

**Never:**
- Allow duplicate district names (must return HTTP 409 `DISTRICT_NAME_EXISTS`).
- Allow editing districts while bypassing server-side validation.
- Store plain passwords, tokens, or personal identifiers in audit log metadata.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Update name and region | Valid non-duplicate name & valid region | HTTP 200 `{ district }` with updated fields and `updatedAt` | N/A |
| Update region only | Same name, updated region | HTTP 200 `{ district }`, no duplicate name conflict | N/A |
| Duplicate district name | Name matches another existing district (case-insensitive) | HTTP 409 `DISTRICT_NAME_EXISTS` | Inline form & error summary alert |
| District not found | Non-existent `districtId` | HTTP 404 `DISTRICT_NOT_FOUND` | Server error alert |
| Invalid inputs | Name < 2 chars or > 100 chars | HTTP 400 `VALIDATION_ERROR` | Field validation error |
| Unauthenticated / Cross-origin | Missing session or cross-site request | HTTP 401 / 403 | Security guard rejection |

</frozen-after-approval>

## Code Map

- `packages/api-contracts/src/districts.ts` -- Define `UpdateDistrictRequestSchema`, `UpdateDistrictResponseSchema`, and export types.
- `apps/backend/src/modules/districts/districts-service.ts` -- Implement `updateDistrict` domain logic with duplicate check, atomic transaction, and audit logging.
- `apps/backend/src/modules/districts/districts-routes.ts` -- Register `PATCH /api/v1/districts/:districtId` with guards and error mapping.
- `apps/backend/tests/districts-lifecycle.test.ts` -- Add integration tests for updating districts (happy path, conflicts, 404, validation, audit logs).
- `apps/web/src/district/district-client.ts` -- Add `updateDistrict` API client method.
- `apps/web/src/components/EditDistrictDrawer.tsx` -- New drawer component for editing district details with validation, dirty state, and error handling.
- `apps/web/src/pages/DistrictsPage.tsx` -- Add Edit button to table row actions and wire `EditDistrictDrawer`.

## Tasks & Acceptance

**Execution:**
- [x] `packages/api-contracts/src/districts.ts` -- Add UpdateDistrict schemas and types -- Establishes strong typing across monorepo
- [x] `apps/backend/src/modules/districts/districts-service.ts` -- Add `updateDistrict` function with transaction, duplicate validation, and audit recording -- Business logic implementation
- [x] `apps/backend/src/modules/districts/districts-routes.ts` -- Add `PATCH /api/v1/districts/:districtId` endpoint with error handlers -- Expose REST API
- [x] `apps/backend/tests/districts-lifecycle.test.ts` -- Add integration test suite for district updates -- Prevent regression and verify contracts
- [x] `apps/web/src/district/district-client.ts` -- Add `updateDistrict` client method -- Frontend API integration
- [x] `apps/web/src/components/EditDistrictDrawer.tsx` -- Create edit drawer with form, accessibility, and dirty state -- UI interaction
- [x] `apps/web/src/pages/DistrictsPage.tsx` -- Add Edit action to table and mount drawer -- User feature access

**Acceptance Criteria:**
- Given an authenticated Product Owner on the Districts page, when clicking "Таҳрирлаш" on a district row, then an Ant Design drawer opens pre-filled with the current name and region.
- Given the Edit drawer is open with modified values, when submitting a valid new name/region, then the district is updated, the table reflects changes, and a `DISTRICT_UPDATED` audit log is recorded.
- Given the user changes the name to match an existing district, when submitting, then the system returns HTTP 409 and displays a clear error message without corrupting state.
- Given unsaved changes in the edit drawer, when attempting to close or navigate, the unsaved changes confirmation modal guards against data loss.

## Design Notes

- The `EditDistrictDrawer` mirrors `CreateDistrictDrawer` patterns: `destroyOnClose`, focusable accessible error summary, `theme.useToken()` styling, and `useDirtyState`.
- Case-insensitive uniqueness check uses `LOWER(name) = LOWER(trimmedName) AND id != districtId`.

## Verification

**Commands:**
- `pnpm --filter @mahalla-ovozi/api-contracts build` -- expected: Clean TypeScript build
- `pnpm --filter @mahalla-ovozi/backend test` -- expected: All unit & integration tests pass (using isolated test DB)
- `pnpm --filter @mahalla-ovozi/web build` -- expected: Clean frontend bundle compilation

## Suggested Review Order

**API Contracts & Data Schemas**

- Request and response schemas for updating district name and region
  [`districts.ts:68`](../../packages/api-contracts/src/districts.ts#L68)

**Backend API & Service Logic**

- Route registration with authentication, origin verification, and validation
  [`districts-routes.ts:70`](../../apps/backend/src/modules/districts/districts-routes.ts#L70)

- Domain service with case-insensitive unique constraint, transaction, and audit logging
  [`districts-service.ts:173`](../../apps/backend/src/modules/districts/districts-service.ts#L173)

- Integration test suite validating update lifecycle and conflict handling
  [`districts-lifecycle.test.ts:297`](../../apps/backend/tests/districts-lifecycle.test.ts#L297)

**Frontend UI & Client Integration**

- API client method for updating district metadata
  [`district-client.ts:83`](../../apps/web/src/district/district-client.ts#L83)

- Ant Design drawer component with error summary, tokens, and dirty state management
  [`EditDistrictDrawer.tsx:1`](../../apps/web/src/components/EditDistrictDrawer.tsx#L1)

- District management page wiring Edit button to the drawer
  [`DistrictsPage.tsx:123`](../../apps/web/src/pages/DistrictsPage.tsx#L123)

- Frontend unit tests for district editing flow
  [`DistrictsPage.test.tsx:132`](../../apps/web/tests/unit/DistrictsPage.test.tsx#L132)


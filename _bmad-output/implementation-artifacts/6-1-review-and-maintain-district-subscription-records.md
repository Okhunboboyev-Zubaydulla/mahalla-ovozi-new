# Story 6.1: Review and Maintain District Subscription Records

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the **Product Owner**,  
I want to review each District's current subscription record and maintain its external payment reference and internal note,  
so that I can track manually managed product access without adding payment processing to Mahalla Ovozi.

## Acceptance Criteria

1. **Subscriptions List Presentation & Authoritative Lifecycle State (AC 1)**
   - **Given** an authenticated Product Owner opens Subscriptions (`/subscriptions`)
   - **When** the subscription list loads
   - **Then** every permitted District is listed in the summary table with its individual identifier, District name, current subscription status (`ACTIVE`, `GRACE`, `SUSPENDED`, `CANCELLED`, or `SETUP_INCOMPLETE`), status start date/time, and next scheduled transition date/time if any
   - **And** the displayed subscription state represents the authoritative commercial/product-access lifecycle state
   - **And** all dates and times are formatted in the `Asia/Tashkent` timezone using approved Uzbek Cyrillic conventions (`DD.MM.YYYY, HH:mm` via `formatTashkentDate`).

2. **Factual Empty State When No Districts Exist (AC 2)**
   - **Given** no Districts exist in the system or are available to the Product Owner
   - **When** Subscriptions loads
   - **Then** a factual, truthful empty state is shown (`Ҳозирча туманлар мавжуд эмас`)
   - **And** the interface invents no mock subscription, billing, invoice, or technical-health data.

3. **District Subscription Detail View & Explicit District Scoping (AC 3, AD-9)**
   - **Given** the Product Owner selects or opens one District's subscription detail (either via row selection, action button, or when an active District is selected via `DistrictSelector`)
   - **When** the detail card / panel loads
   - **Then** the selected District remains explicit (displaying District name, ID, and region)
   - **And** the view displays:
     - Current lifecycle status with semantic icon and color badge
     - Exact status start date/time
     - Next scheduled transition timestamp and destination state (if currently in Grace or Cancelled)
     - Optional external payment reference (`externalPaymentReference`)
     - Optional internal administrative note (`internalNote`)
     - Record creation and last modification timestamps with modifying actor ID
   - **And** District scope is never inferred from omitted or client-supplied authorization headers.

4. **Metadata Persistence & Strict Lifecycle Immutability (AC 4, FR29)**
   - **Given** the Product Owner edits the external payment reference or internal note in the edit drawer
   - **When** valid values are submitted and saved
   - **Then** the change is persisted strictly for the explicitly selected District
   - **And** the server updates only `externalPaymentReference`, `internalNote`, `updatedAt`, and records the modifying actor
   - **And** omitted fields in partial requests (`undefined`) leave existing values unchanged, while `null` or empty strings (`""`) clear the respective field to SQL `NULL`
   - **And** the lifecycle status (`status`), status start time (`statusStartedAt`), and scheduled transitions (`scheduledTransitionAt`, `scheduledTransitionType`) remain completely unchanged
   - **And** success is shown only after the authoritative server response (`Сақланди` confirmation banner/toast)
   - **And** the metadata edit does not alter Telegram message intake, AI processing, Hokim access, data retention, cancellation countdowns, recovery setup, or permanent deletion behaviors.

5. **Known Product Secret Detection & Sanitized Field Rejection (AC 5, AD-9)**
   - **Given** the Product Owner enters an external payment reference or internal note in the edit drawer
   - **When** a known product secret is detected (Telegram bot token `\d{7,12}:[A-Za-z0-9_-]{34,36}`, OpenAI/Gemini/Groq/Anthropic API keys, Bearer tokens, or JWTs using `containsProhibitedSecrets`)
   - **When** Save is attempted
   - **Then** the save is rejected client-side and server-side with a sanitized field-level error (`Махфий маълумотлар (бот токенлари, API калитлар ёки пароллар) кўрсатилиши мумкин эмас.`)
   - **And** help text explicitly warns: *"Тўлов маълумотномаси ва ички қайдлар фақат операцион маълумотлар учун мўлжалланган. Шахсий маълумотлар, Telegram бот токенлари ёки API калитларини ёзиш қатъиян ман этилади."*
   - **And** valid entered text remains intact in the form for user correction without resetting the form
   - **And** no general personal-data-redaction workflow is introduced.

6. **External Payment Disclaimer & Non-Billing Boundary (AC 6, FR29)**
   - **Given** subscription information is presented in the list or detail view
   - **When** payment-related context is displayed
   - **Then** the interface prominently states: *"Тўловлар тизимдан ташқарида (қўлда) бошқарилади. Маҳалла Овози тўловларни қабул қилмайди ва карта маълумотларини сақламайди."*
   - **And** Mahalla Ovozi introduces no card handling, payment gateways, payment collection, invoices, checkout forms, pricing-plan selectors, or automated billing mechanisms.

7. **Commercial/Product-Access State Distinction from Technical Health (AC 7, FR29)**
   - **Given** a District is in `ACTIVE`, `GRACE`, `SUSPENDED`, or `CANCELLED` status
   - **When** its subscription state is displayed
   - **Then** the state is presented strictly as commercial/product-access lifecycle state
   - **And** a restricted lifecycle state (`SUSPENDED` or `CANCELLED`) is not treated as a technical failure solely because product access or intake is intentionally paused.

8. **Scope Boundary & Exclusion of Later Lifecycle Transitions (AC 8)**
   - **Given** Story 6.1 is implemented
   - **When** the Product Owner uses the subscription record surface
   - **Then** manual lifecycle transition actions (e.g. Start Grace, Restore Active, Cancel District, Start Recovery) are not implemented by this story (slated for Story 6.2 and 6.3)
   - **And** automated Grace expiry, Suspension background enforcement, deletion jobs, backup expiry, and restore reconciliation remain outside this story
   - **And** the subscription record schema and API establish the authoritative current lifecycle state required by all downstream Epic 6 stories.

9. **Strict Server-Side Product Owner Authorization & Scoping (AC 9, AD-9)**
   - **Given** a District Hokim (`DISTRICT_HOKIM`) or an unauthenticated caller attempts to query or modify subscription records
   - **When** the request reaches the server
   - **Then** access is denied with HTTP 401 Unauthenticated or HTTP 403 Forbidden using server-derived actor context
   - **And** browser-supplied role or scope values cannot bypass Product Owner authorization
   - **And** every District endpoint (`/api/v1/districts/:districtId/subscription`) requires explicit `districtId` path parameter and verifies the district exists (returning 404 `DISTRICT_NOT_FOUND` if missing).

10. **Atomic District Switching & Dirty Form Protection (AC 10, AD-10)**
    - **Given** the Product Owner is editing District A subscription metadata in the drawer
    - **When** the Product Owner attempts to switch to District B via `DistrictSelector` or navigate away
    - **Then** the `UnsavedChangesModal` intercepts the transition
    - **And** if confirmed/discarded, all protected District A state, cached forms, and queries are purged before District B data is loaded
    - **And** in-flight District A requests are aborted so late responses cannot render under District B.

11. **Network Loss / Offline Mutation Blocking & Safe Reconnect (AC 11, AD-10)**
    - **Given** network connectivity is lost while viewing subscription records
    - **When** the Product Owner is offline
    - **Then** already-loaded data remains visible read-only with a persistent Uzbek Cyrillic offline banner (`Интернет алоқаси мавжуд эмас. Маълумотлар фақат ўқиш режимида.`)
    - **And** the Save button and form mutations are disabled and never queued for automatic offline replay
    - **And** upon reconnect, the system revalidates the session, actor authorization, explicit District context, and current subscription state before enabling mutations.

12. **Accessibility, Responsive Layout, and Uzbek Cyrillic Presentation (AC 12)**
    - **Given** the Subscriptions page is accessed via keyboard navigation, screen reader, mobile viewport (<768px), or 200% browser zoom
    - **When** reviewing or editing subscription records
    - **Then** table columns, action buttons, cards, and drawer controls maintain proper semantic relationships and focus management
    - **And** lifecycle status meaning does not rely on color alone (combines color, icon, and explicit text tags)
    - **And** long District names, external references, and Cyrillic notes wrap gracefully (`wordBreak: 'break-word'`) without causing page-level horizontal scrollbars.

13. **Comprehensive Automated Integration & Unit Verification (AC 13)**
    - **Given** Story 6.1 code implementation
    - **When** automated test suites run
    - **Then** backend integration tests (`apps/backend/tests/subscriptions.test.ts`) verify:
      1. Product Owner authorization enforcement (401/403 for Hokim / unauthenticated)
      2. Aggregate subscription listing across multiple districts
      3. Single district subscription retrieval with explicit scoping and 404 for non-existent district
      4. Auto-initialization of subscription records for districts without an existing row (concurrency-safe with preserved historical timestamps)
      5. Successful update of `externalPaymentReference` and `internalNote`
      6. Partial `PATCH` updates preserving omitted fields
      7. Secret scanning rejection (bot tokens, API keys) returning 400 validation errors
      8. Immutability verification: metadata update does NOT modify `status`, `statusStartedAt`, or `scheduledTransitionAt`
      9. Immutable audit event recording (`DISTRICT_SUBSCRIPTION_METADATA_UPDATED`) with sanitized metadata
    - **And** frontend component tests (`apps/web/tests/unit/SubscriptionsPage.test.tsx`) verify:
      1. Table rendering and formatting in `Asia/Tashkent` timezone
      2. Detail view rendering with external payment notice banner
      3. Edit drawer validation (length limits, secret detection warnings)
      4. Dirty form registration and `DistrictSelector` switch guard
      5. Offline mutation blocking and read-only indication.

---

## Tasks / Subtasks

- [ ] **Task 1: Database Schema & Migration for District Subscriptions** (AC: 1, 3, 4, 8)
  - [ ] 1.1 Create Drizzle schema table `district_subscriptions` in `apps/backend/src/adapters/db/schema/district-subscriptions.ts` with columns: `id` (text PK), `districtId` (text not null unique FK `districts.id` on delete cascade), `status` (text not null default `'ACTIVE'`, check constraint matching `SETUP_INCOMPLETE`, `ACTIVE`, `GRACE`, `SUSPENDED`, `CANCELLED`), `statusStartedAt` (timestamp with timezone not null default now()), `scheduledTransitionAt` (timestamp with timezone nullable), `scheduledTransitionType` (text nullable), `externalPaymentReference` (text nullable), `internalNote` (text nullable), `createdAt` (timestamp with timezone not null default now()), `updatedAt` (timestamp with timezone not null default now()).
  - [ ] 1.2 Export new schema from `apps/backend/src/adapters/db/schema/index.ts`.
  - [ ] 1.3 Create SQL migration file `apps/backend/drizzle/0016_subscription_records.sql` including table creation, foreign keys, unique constraint on `district_id`, status check constraint, indices on `district_id` and `status`, and backfill script initializing subscription rows for existing districts from `districts.status` and `COALESCE(districts.activated_at, districts.created_at, NOW())`.

- [ ] **Task 2: Shared API Contracts & Validation in `@mahalla-ovozi/api-contracts`** (AC: 1, 3, 4, 5, 6)
  - [ ] 2.1 Create `packages/api-contracts/src/subscriptions.ts` with Zod schemas:
    - `SubscriptionStatusSchema`: enum `['SETUP_INCOMPLETE', 'ACTIVE', 'GRACE', 'SUSPENDED', 'CANCELLED']`
    - `DistrictSubscriptionSchema`: object with `id`, `districtId`, `districtName`, `region`, `status`, `statusStartedAt`, `scheduledTransitionAt`, `scheduledTransitionType`, `externalPaymentReference`, `internalNote`, `createdAt`, `updatedAt`
    - `ListDistrictSubscriptionsResponseSchema`: object with `subscriptions: z.array(DistrictSubscriptionSchema)`
    - `GetDistrictSubscriptionResponseSchema`: object with `subscription: DistrictSubscriptionSchema`
    - `UpdateDistrictSubscriptionRequestSchema`: object supporting partial updates (`externalPaymentReference: z.string().trim().max(255).nullish()`, `internalNote: z.string().trim().max(2000).nullish()`), superRefined with `containsProhibitedSecrets` validation
    - `UpdateDistrictSubscriptionResponseSchema`: object with `subscription: DistrictSubscriptionSchema`, `message: z.string()`
  - [ ] 2.2 Re-export `packages/api-contracts/src/subscriptions.ts` in `packages/api-contracts/src/index.ts`.
  - [ ] 2.3 Build `packages/api-contracts` (`pnpm --filter @mahalla-ovozi/api-contracts build`).

- [ ] **Task 3: Backend Subscriptions Module & Fastify Routes** (AC: 1, 2, 3, 4, 5, 6, 7, 8, 9)
  - [ ] 3.1 Create `apps/backend/src/modules/subscriptions/subscriptions-service.ts`:
    - `ensureDistrictSubscription(db, districtId, initialStatus?, tx?)`: fetches or auto-initializes subscription record if missing using PostgreSQL `ON CONFLICT (district_id) DO NOTHING` concurrency protection, preserving historical `statusStartedAt` from `districts.activatedAt ?? districts.createdAt`
    - `listDistrictSubscriptions(db)`: joins `districts` and `district_subscriptions`, ensures missing rows are initialized, returns all permitted district subscriptions sorted by district name
    - `getDistrictSubscription(db, districtId)`: verifies district existence, fetches single district subscription with explicit scoping, throws `DistrictNotFoundError` if missing
    - `updateDistrictSubscriptionMetadata(db, districtId, payload, actor, reqMeta)`: updates `externalPaymentReference` and `internalNote` strictly without touching lifecycle fields (preserving omitted fields and transforming empty strings to `null`), records audit event `DISTRICT_SUBSCRIPTION_METADATA_UPDATED`, returns updated subscription
  - [ ] 3.2 Update `apps/backend/src/modules/districts/districts-service.ts` and `apps/backend/src/modules/districts/district-onboarding-engine.ts`:
    - `createDistrict`: insert `district_subscriptions` row with `status: 'SETUP_INCOMPLETE'` atomically in transaction
    - `activateDistrict`: update `district_subscriptions.status = 'ACTIVE'` and `statusStartedAt = now` atomically with `districts.status`
  - [ ] 3.3 Create `apps/backend/src/modules/subscriptions/subscriptions-routes.ts`:
    - Encapsulate in Fastify plugin scoped with `createRequireProductOwner(db)` and `verifyStateChangingOrigin`
    - `GET /api/v1/subscriptions`: returns all district subscriptions
    - `GET /api/v1/districts/:districtId/subscription`: returns single district subscription (404 if not found)
    - `PATCH /api/v1/districts/:districtId/subscription`: validates request with `UpdateDistrictSubscriptionRequestSchema`, validates secret patterns, updates metadata, returns 200 with updated subscription
  - [ ] 3.4 Register `registerSubscriptionRoutes` in `apps/backend/src/entrypoints/http.ts`.

- [ ] **Task 4: Frontend Subscriptions Page & Components in `apps/web`** (AC: 1, 2, 3, 4, 5, 6, 7, 10, 11, 12)
  - [ ] 4.1 Create API client `apps/web/src/api/subscription-client.ts` implementing `listDistrictSubscriptions()`, `getDistrictSubscription(districtId)`, `updateDistrictSubscription(districtId, payload)`.
  - [ ] 4.2 Update `apps/web/src/lib/formatters.ts` registering `DISTRICT_SUBSCRIPTION_METADATA_UPDATED: 'Обуна маълумотлари янгиланди'` in `ACTION_DISPLAY_NAMES_UZ`.
  - [ ] 4.3 Create component `apps/web/src/components/subscriptions/SubscriptionStatusBadge.tsx` displaying accessible Tag with status icon, theme token styling, and localized Uzbek Cyrillic text (`Фаол`, `Имтиёзли давр (Grace)`, `Тўхтатилган (Suspended)`, `Бекор қилинган (Cancelled)`, `Созлаш тугалланмаган`).
  - [ ] 4.4 Create component `apps/web/src/components/subscriptions/DistrictSubscriptionTable.tsx` presenting summary table with columns: District Name, Status, Status Started At, Next Transition, External Reference, and Action (Detail/Edit button), with wrapping styles preventing horizontal overflow.
  - [ ] 4.5 Create component `apps/web/src/components/subscriptions/DistrictSubscriptionDetailCard.tsx` showing current lifecycle status, start timestamp, scheduled transition info, external payment disclaimer banner, external reference, internal note, and Edit button.
  - [ ] 4.6 Create component `apps/web/src/components/subscriptions/EditSubscriptionDrawer.tsx` with Ant Design `Drawer`, form with `externalPaymentReference` (Input, max 255) and `internalNote` (Input.TextArea, max 2000), inline secret detection warning, help text, `destroyOnClose`, dirty form registration via `useDistrict().registerDirty`, and offline mutation blocking.
  - [ ] 4.7 Implement `apps/web/src/pages/SubscriptionsPage.tsx` replacing placeholder, handling both aggregate list and selected district detail, integrated with `useDistrict` and `useOnlineStatus`.
  - [ ] 4.8 Update `apps/web/src/App.tsx` routing pointing to the real `SubscriptionsPage.tsx`.

- [ ] **Task 5: Verification & Test Suites** (AC: 13)
  - [ ] 5.1 Create backend integration test `apps/backend/tests/subscriptions.test.ts`:
    - Test 401 for unauthenticated requests and 403 for `DISTRICT_HOKIM` role
    - Test `GET /api/v1/subscriptions` listing all districts
    - Test `GET /api/v1/districts/:districtId/subscription` for single district and 404 for unknown district
    - Test `PATCH /api/v1/districts/:districtId/subscription` updating external reference and note
    - Test partial `PATCH` updates (ensuring omitted fields are not cleared)
    - Test secret scanning rejection (bot token `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz1234567`, API keys `sk-proj-test12345678901234567890`) returning 400
    - Test lifecycle immutability: assert `status`, `statusStartedAt`, and `scheduledTransitionAt` are unmodified after metadata PATCH
    - Test audit trail logging `DISTRICT_SUBSCRIPTION_METADATA_UPDATED` with sanitized payload.
  - [ ] 5.2 Create frontend unit test `apps/web/tests/unit/SubscriptionsPage.test.tsx`:
    - Test table rendering with formatted dates
    - Test detail card and external payment disclaimer display
    - Test edit drawer input, character limits, and prohibited secret warning
    - Test dirty form registration and `DistrictSelector` guard
    - Test offline banner and disabled mutation buttons.
  - [ ] 5.3 Run typecheck and linting across the monorepo (`pnpm check-types` and `pnpm lint`).

---

## Dev Notes

### Architecture Patterns & Constraints

- **Hexagonal Monolith & Modular Boundaries (AD-1):** The subscriptions domain logic is encapsulated inside `apps/backend/src/modules/subscriptions/`. External database operations use Drizzle schema repositories, and web routing uses Fastify plugin scopes.
- **TypeScript & Shared Zod Contracts (AD-2, AD-10):** All API request/response payloads are validated using shared Zod schemas in `packages/api-contracts/src/subscriptions.ts`. No raw `any` types.
- **PostgreSQL System of Record (AD-3, AD-4):** Subscription state is stored in PostgreSQL table `district_subscriptions`. Schema changes are managed via explicit Drizzle SQL migrations.
- **Session Auth & Explicit District Scope (AD-9):** Product Owner authorization is enforced on every endpoint via `createRequireProductOwner(db)`. Non-PO actors (Hokims, anonymous) are rejected with 401/403. District endpoints require explicit `districtId` path parameters.
- **Zero Payment Processing Boundary (FR29):** Mahalla Ovozi does NOT process payments, store credit cards, generate invoices, or handle checkout. External references and notes are informational metadata only.
- **Lifecycle Immutability via Metadata Edit (FR29, Story 6.1 Boundary):** Updating `externalPaymentReference` or `internalNote` MUST NOT modify `status`, `statusStartedAt`, `scheduledTransitionAt`, or `scheduledTransitionType`. Lifecycle state transitions are strictly reserved for Stories 6.2 and 6.3.
- **Secret Scanning & Sanitization (AD-9):** Subscription metadata fields must be validated against `PROHIBITED_SECRET_PATTERNS` to prevent leaking Telegram bot tokens, API keys, credentials, or personal messages.
- **Audit Logging (AD-9):** Every metadata update produces an immutable audit event (`DISTRICT_SUBSCRIPTION_METADATA_UPDATED`) via `recordAuditEvent` with privacy-safe payload:
  ```typescript
  {
    districtId: string,
    districtName: string,
    externalPaymentReferenceUpdated: boolean,
    internalNoteUpdated: boolean,
  }
  ```

---

### Database Schema Specification

```typescript
// apps/backend/src/adapters/db/schema/district-subscriptions.ts
import { sql } from 'drizzle-orm';
import { pgTable, text, timestamp, index, uniqueIndex, check, AnyPgColumn } from 'drizzle-orm/pg-core';
import { districts } from './districts.js';

export const districtSubscriptions = pgTable(
  'district_subscriptions',
  {
    id: text('id').primaryKey(), // 'sub_' + districtId or uuid
    districtId: text('district_id')
      .notNull()
      .references((): AnyPgColumn => districts.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('ACTIVE'),
    statusStartedAt: timestamp('status_started_at', { withTimezone: true }).notNull().defaultNow(),
    scheduledTransitionAt: timestamp('scheduled_transition_at', { withTimezone: true }),
    scheduledTransitionType: text('scheduled_transition_type'),
    externalPaymentReference: text('external_payment_reference'),
    internalNote: text('internal_note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('district_subscriptions_district_id_unique').on(table.districtId),
    check(
      'district_subscriptions_status_check',
      sql`${table.status} IN ('SETUP_INCOMPLETE', 'ACTIVE', 'GRACE', 'SUSPENDED', 'CANCELLED')`
    ),
    index('district_subscriptions_status_idx').on(table.status),
  ]
);

export type DistrictSubscription = typeof districtSubscriptions.$inferSelect;
export type NewDistrictSubscription = typeof districtSubscriptions.$inferInsert;
```

---

### API Contract Specification

```typescript
// packages/api-contracts/src/subscriptions.ts
import { z } from 'zod';
import { containsProhibitedSecrets } from './analysis-settings.js';

export const SubscriptionStatusSchema = z.enum([
  'SETUP_INCOMPLETE',
  'ACTIVE',
  'GRACE',
  'SUSPENDED',
  'CANCELLED',
]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

export const DistrictSubscriptionSchema = z.object({
  id: z.string().min(1),
  districtId: z.string().min(1),
  districtName: z.string().min(1),
  region: z.string().nullable().optional(),
  status: SubscriptionStatusSchema,
  statusStartedAt: z.string().datetime(), // ISO 8601 UTC
  scheduledTransitionAt: z.string().datetime().nullable().optional(),
  scheduledTransitionType: z.string().nullable().optional(),
  externalPaymentReference: z.string().nullable().optional(),
  internalNote: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type DistrictSubscription = z.infer<typeof DistrictSubscriptionSchema>;

export const ListDistrictSubscriptionsResponseSchema = z.object({
  subscriptions: z.array(DistrictSubscriptionSchema),
});
export type ListDistrictSubscriptionsResponse = z.infer<typeof ListDistrictSubscriptionsResponseSchema>;

export const GetDistrictSubscriptionResponseSchema = z.object({
  subscription: DistrictSubscriptionSchema,
});
export type GetDistrictSubscriptionResponse = z.infer<typeof GetDistrictSubscriptionResponseSchema>;

export const UpdateDistrictSubscriptionRequestSchema = z
  .object({
    externalPaymentReference: z
      .string({ invalid_type_error: 'Тўлов маълумотномаси матн кўринишида бўлиши керак.' })
      .trim()
      .max(255, 'Тўлов маълумотномаси 255 та белгидан ошмаслиги керак.')
      .nullish(),
    internalNote: z
      .string({ invalid_type_error: 'Ички қайд матн кўринишида бўлиши керак.' })
      .trim()
      .max(2000, 'Ички қайд 2000 та белгидан ошмаслиги керак.')
      .nullish(),
  })
  .superRefine((data, ctx) => {
    if (data.externalPaymentReference && containsProhibitedSecrets(data.externalPaymentReference)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['externalPaymentReference'],
        message: 'Махфий маълумотлар (бот токенлари, API калитлар ёки пароллар) кўрсатилиши мумкин эмас.',
      });
    }
    if (data.internalNote && containsProhibitedSecrets(data.internalNote)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['internalNote'],
        message: 'Махфий маълумотлар (бот токенлари, API калитлар ёки пароллар) кўрсатилиши мумкин эмас.',
      });
    }
  });
export type UpdateDistrictSubscriptionRequest = z.infer<typeof UpdateDistrictSubscriptionRequestSchema>;

export const UpdateDistrictSubscriptionResponseSchema = z.object({
  subscription: DistrictSubscriptionSchema,
  message: z.string(),
});
export type UpdateDistrictSubscriptionResponse = z.infer<typeof UpdateDistrictSubscriptionResponseSchema>;
```

---

### Frontend UI & Status Representations

- **Uzbek Cyrillic Status Labels & Colors:**
  - `ACTIVE`: `Фаол` (Green Tag / Success Icon)
  - `GRACE`: `Имтиёзли давр (Grace)` (Orange Tag / Warning Icon)
  - `SUSPENDED`: `Тўхтатилган (Suspended)` (Red Tag / Stop Icon)
  - `CANCELLED`: `Бекор қилинган (Cancelled)` (Volcano/Default Tag / CloseCircle Icon)
  - `SETUP_INCOMPLETE`: `Созлаш тугалланмаган` (Default Gray Tag / ClockCircle Icon)
- **External Payment Notice Banner:**
  - Placed at the top of the Subscriptions section and within the edit drawer:
  - *"Тўловлар тизимдан ташқарида (қўлда) бошқарилади. Маҳалла Овози тўловларни қабул қилмайди ва карта маълумотларини сақламайди."*
- **Form Help Text:**
  - *"Тўлов маълумотномаси ва ички қайдлар фақат операцион маълумотлар учун мўлжалланган. Шахсий маълумотлар, Telegram бот токенлари ёки API калитларини ёзиш қатъиян ман этилади."*

---

### Source Tree Components & Files

#### Files to Create [NEW]
1. `apps/backend/src/adapters/db/schema/district-subscriptions.ts` — Drizzle schema table for `district_subscriptions`
2. `apps/backend/drizzle/0016_subscription_records.sql` — SQL migration creating `district_subscriptions` and backfilling existing districts
3. `packages/api-contracts/src/subscriptions.ts` — Shared Zod schemas and TypeScript types for subscriptions
4. `apps/backend/src/modules/subscriptions/subscriptions-service.ts` — Business logic and DB operations for subscriptions
5. `apps/backend/src/modules/subscriptions/subscriptions-routes.ts` — Fastify routes for subscription list, get, and metadata update
6. `apps/web/src/api/subscription-client.ts` — Frontend HTTP client for subscription endpoints
7. `apps/web/src/components/subscriptions/SubscriptionStatusBadge.tsx` — Status badge component with accessible tags and icons
8. `apps/web/src/components/subscriptions/DistrictSubscriptionTable.tsx` — All-district summary table
9. `apps/web/src/components/subscriptions/DistrictSubscriptionDetailCard.tsx` — Single district detail card
10. `apps/web/src/components/subscriptions/EditSubscriptionDrawer.tsx` — Metadata editing drawer with validation and dirty tracking
11. `apps/backend/tests/subscriptions.test.ts` — Integration tests for subscription endpoints and authorization
12. `apps/web/tests/unit/SubscriptionsPage.test.tsx` — Unit tests for subscriptions page and edit drawer

#### Files to Modify [UPDATE]
1. `apps/backend/src/adapters/db/schema/index.ts` — Export `districtSubscriptions` schema
2. `packages/api-contracts/src/index.ts` — Export subscription schemas and types
3. `apps/backend/src/modules/districts/districts-service.ts` — Synchronous subscription creation on new district
4. `apps/backend/src/modules/districts/district-onboarding-engine.ts` — Synchronous subscription status transition on district activation
5. `apps/backend/src/entrypoints/http.ts` — Register `registerSubscriptionRoutes`
6. `apps/web/src/lib/formatters.ts` — Add `DISTRICT_SUBSCRIPTION_METADATA_UPDATED` action label
7. `apps/web/src/pages/SubscriptionsPage.tsx` — Replace placeholder with full subscription list/detail implementation
8. `apps/web/src/App.tsx` — Update route import from placeholder to real `SubscriptionsPage.tsx`

---

## Project Structure Notes

- **Module Cohesion:** The subscriptions module in `apps/backend/src/modules/subscriptions/` follows the exact architectural structure established by `districts/`, `ai/`, `audit/`, and `health/`.
- **Database Consistency:** Uses Drizzle ORM conventions matching existing tables (`districts.ts`, `accounts.ts`, `audit.ts`), with strict timestamps (`withTimezone: true`) and UUID/prefixed IDs.
- **Contract Boundary:** Strictly adheres to zero frontend-backend schema divergence by placing all Zod schemas in `packages/api-contracts`.
- **UI Consistency:** Utilizes Ant Design 5 components (`Table`, `Card`, `Drawer`, `Form`, `Tag`, `Typography`, `Alert`, `Space`) styled via `theme.useToken()`, respecting dark/light theme tokens and Uzbek Cyrillic typography.

---

## References

- **PRD:** `_bmad-output/planning-artifacts/prds/prd-Mahalla-Ovozi-2026-07-30/prd.md` — Section 4.6 (FR-29: Manually managed subscription record), UJ-4.
- **Architecture Spine:** `_bmad-output/planning-artifacts/architecture/architecture-Mahalla-Ovozi-2026-08-12/ARCHITECTURE-SPINE.md` — AD-1, AD-2, AD-3, AD-4, AD-9, AD-10.
- **Epic 6:** `_bmad-output/planning-artifacts/epics/epic-6.md` — Story 6.1 (Review and Maintain District Subscription Records).
- **UX Designs:** `_bmad-output/planning-artifacts/ux-designs/ux-Mahalla-Ovozi-2026-08-05/DESIGN.md`, `EXPERIENCE.md` — Section UJ-4, subscription summary and detail patterns.
- **Project Context:** `_bmad-output/project-context.md` — Core constraints and standards.

---

## Dev Agent Record

### Agent Model Used

Gemini 3.7 Flash (High)

### Debug Log References

### Completion Notes List

- Comprehensive adversarial and edge-case review executed on Story 6.1 specification.
- Spec hardened with Zod partial-update safeguards, auto-initialization concurrency handling (`ON CONFLICT DO NOTHING`), historical timestamp preservation, synchronous onboarding alignment in `districts-service.ts` & `district-onboarding-engine.ts`, and audit mapping in `formatters.ts`.

### File List

- `_bmad-output/implementation-artifacts/6-1-review-and-maintain-district-subscription-records.md`

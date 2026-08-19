---
baseline_commit: c4fbf8b1c0125bbadc83ac293aab06824fc65f2f
---

# Story 1.5: Configure and Validate Telegram Group-to-Mahalla Mappings

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the **Product Owner**,
I want to map approved Telegram groups one-to-one to Mahallas and validate that the District bot can receive the required messages from them,
So that future Telegram evidence can be attributed deterministically to the correct District and Mahalla.

## Acceptance Criteria

1. **District-Scoped Searchable Mappings Model (AC 1)**
   - **Given** an incomplete District with a valid Telegram bot from Story 1.4 is selected in the Console
   - **When** the Product Owner opens Telegram Setup (`/telegram-setup`)
   - **Then** the page renders the searchable collection of Mahalla-to-Telegram-group mappings below the bot card
   - **And** each mapping entry displays Mahalla name, Telegram group title, Chat ID, validation status (`PENDING`, `TESTING`, `VALID`, `FAILED`), and access/privacy tags
   - **And** no mappings from any other District can appear.

2. **Strict 1-to-1 Mapping within District & Case-Insensitive Uniqueness (AC 2)**
   - **Given** the Product Owner creates or edits a Mahalla mapping
   - **When** they submit a Mahalla name and Telegram group Chat ID
   - **Then** the relationship is persisted with explicit District scope
   - **And** one Telegram group can belong to only one Mahalla within the District
   - **And** one Mahalla can have only one approved Telegram group
   - **And** Mahalla names are unique within the District case-insensitively (enforced by DB unique index `[district_id, LOWER(mahalla_name)]`)
   - **And** duplicate names or Chat IDs within the same District are rejected with HTTP 409 Conflict (`MAHALLA_NAME_EXISTS` / `GROUP_ALREADY_MAPPED`).

3. **Cross-District Group Identity Uniqueness & Isolation (AC 3)**
   - **Given** a Telegram group Chat ID is already mapped to District A
   - **When** the Product Owner attempts to map that same Chat ID to District B
   - **Then** the server rejects the request with HTTP 409 Conflict (`GROUP_ALREADY_ASSIGNED`)
   - **And** one Telegram group cannot simultaneously belong to more than one District across the platform (enforced by DB unique index `[telegram_chat_id]`)
   - **And** District A's mapping details and identity are neither modified nor exposed.

4. **Authoritative Bot Access & Ordinary Non-Admin Membership Verification (AC 4)**
   - **Given** a mapping is submitted or re-checked for Telegram readiness
   - **When** the backend verifies bot access via `getChat` and `getChatMember(chatId, botId)`
   - **Then** the check verifies the configured District bot is an ordinary non-admin member (`ChatMemberMember`, `status === 'member'`)
   - **And** if the bot is missing (`left` / `kicked` / `chat not found`), the check fails with actionable copy (`BOT_NOT_IN_GROUP`)
   - **And** if the bot holds administrator rights (`ChatMemberAdministrator`), the check **fails** (`BOT_IS_ADMIN_FORBIDDEN`) to strictly enforce the passive non-admin security boundary (FR-1).

5. **Telegram Group Privacy Mode Verification (AC 5)**
   - **Given** bot group access is verified
   - **When** the system evaluates Group Privacy Mode
   - **Then** the system checks `can_read_all_group_messages` via `getMe`
   - **And** if Privacy Mode is enabled (`can_read_all_group_messages === false`), the system marks the privacy check failed with instructions to disable Privacy Mode in `@BotFather` (`/setprivacy` → `Disable`)
   - **And** stored mapping records `privacy_mode_disabled = true` only when confirmed disabled.

6. **Interactive Live Test-Message Validation Window (AC 6)**
   - **Given** bot membership and privacy mode static checks pass
   - **When** the Product Owner starts the live test-message flow
   - **Then** the backend opens a 60-second active test session for `(districtId, telegramChatId)`
   - **And** the UI displays an animated countdown timer (`Statistic.Countdown`), progress indicator, and instructions to send an ordinary human test message to the group
   - **And** polls test status at regular intervals (`GET /api/v1/districts/:districtId/groups/:groupId/test-status`).

7. **Authoritative Test-Message Receipt & Filtering (AC 7)**
   - **Given** an active 60-second test session is open
   - **When** an incoming Telegram update arrives for that group
   - **Then** the system filters the message through the message eligibility pipeline:
     - Rejects bot senders (`from.is_bot === true` or `sender_chat != null`)
     - Rejects forwarded messages (`forward_origin` / `forward_date` / `forward_from`)
     - Rejects bot commands (`entities` with `bot_command` or slash-prefixed text)
     - Rejects empty/captionless media
   - **And** upon observing a valid ordinary human text message from that exact group, updates mapping `status = 'VALID'`, records `test_message_received_at = NOW()`, and resolves the test session as `SUCCESS`.

8. **Zero Test-Data Persistence & Zero AI Pollution (AC 8)**
   - **Given** a test message is received and accepted for mapping validation
   - **When** the validation transaction completes
   - **Then** the test message text, sender details, and raw payload are **never** persisted to production database tables or telemetry logs
   - **And** the test message does not become production Accepted Evidence
   - **And** does not trigger AI topic processing or worker queue jobs while the District is in `SETUP_INCOMPLETE`.

9. **Test Timeout & Sanitized Failure Categorization (AC 9)**
   - **Given** the 60-second test window elapses without a valid human text message, or Telegram returns an error
   - **When** the test completes
   - **Then** the mapping transitions to `FAILED` (or remains `PENDING` with last error)
   - **And** the UI displays a sanitized Uzbek Cyrillic troubleshooting guide (check bot presence, verify BotFather privacy setting, re-add bot if Telegram cache is stale)
   - **And** no raw Telegram response bodies, tokens, or stack traces are exposed.

10. **Test-Mode Simulation Endpoint for CI/E2E Automated Testing (AC 10)**
    - **Given** tests execute in non-production environments (`NODE_ENV !== 'production'`)
    - **When** `POST /api/v1/districts/:districtId/groups/:groupId/simulate-test-message` is called with test message payloads
    - **Then** the backend processes the simulated update through the real filtering and session resolution pipeline
    - **And** in production (`NODE_ENV === 'production'`), this route is disabled (HTTP 404 / 403).

11. **Atomic Mapping Mutation, Remapping & Future-Only Consequence (AC 11)**
    - **Given** the Product Owner edits, disables, or removes a mapping
    - **When** mutation is submitted
    - **Then** if the District is `ACTIVE`, the UI displays a risk-proportional confirmation modal explaining the future-only effect
    - **And** remapping or removing a group affects only future incoming Telegram messages
    - **And** retained Topics and historical evidence keep their original District and Mahalla attribution without replay or backfill
    - **And** remapped groups require fresh validation before becoming ready.

12. **Onboarding Readiness Evaluator Dynamic Derivation (FR-20 Prerequisite 7) (AC 12)**
    - **Given** the District's group mappings state changes
    - **When** `GET /api/v1/districts/:districtId/readiness` is requested or refreshed
    - **Then** prerequisite 7 (`group_mappings`) is dynamically derived from `district_telegram_groups`
    - **And** evaluates to `passed` when at least one Mahalla mapping exists and 100% of configured mappings are in `VALID` status
    - **And** evaluates to `incomplete` with actionable blocker details if 0 mappings exist or if any mapping is `PENDING`, `TESTING`, or `FAILED`.

13. **Privacy-Safe Audit History Logging (AD-9) (AC 13)**
    - **Given** a group mapping is created, validated, updated, remapped, or removed
    - **When** the transaction commits
    - **Then** an audit event (`DISTRICT_GROUP_MAPPED`, `DISTRICT_GROUP_VALIDATED`, `DISTRICT_GROUP_REMAPPED`, `DISTRICT_GROUP_UNMAPPED`) is written to `audit_events`
    - **And** audit metadata contains only `districtId`, `groupId`, `mahallaName`, `telegramChatId`, `result`, actor details, IP, and timestamp
    - **And** resident message content, bot secrets, and private chat payload data never enter audit logs.

14. **Responsive Layout, Accessibility & Uzbek Cyrillic UX (AC 14)**
    - **Given** Telegram Setup is viewed across screen sizes (mobile <768px, desktop ≥ 768px), at 200% zoom, or with keyboard navigation
    - **When** the Product Owner manages mappings
    - **Then** all interactive controls have ≥ 44px touch targets and visible focus indicators
    - **And** status is never conveyed by color alone (status icons + explicit text badges)
    - **And** 100% of UI copy uses standard Uzbek Cyrillic.

15. **Automated Test Matrix & Verification Gates (AC 15)**
    - **Given** Story 1.5 is implemented
    - **When** test suites execute
    - **Then** unit tests verify message filtering (bot filter, command filter, forward filter, text extraction)
    - **And** backend integration tests verify 1-to-1 uniqueness, cross-district isolation, bot membership check (`member` vs `admin`), privacy mode verification, test-message capture without data pollution, audit logging, and readiness evaluator transitions
    - **And** web E2E tests verify mapping creation, group conflict feedback, live test-message countdown & resolution, responsive card reflow, and checklist update.

---

## Tasks / Subtasks

- [ ] **Task 1: Database Schema & Migration Finalization** (AC: 1, 2, 3)
  - [ ] 1.1 Create `apps/backend/src/adapters/db/schema/district-telegram-groups.ts` with `districtTelegramGroups` table matching migration `0004_icy_vance_astro.sql`.
  - [ ] 1.2 Export from `apps/backend/src/adapters/db/schema/index.ts`.
  - [ ] 1.3 Verify unique indexes: `district_telegram_groups_chat_id_idx` (`telegram_chat_id`) and `district_telegram_groups_district_mahalla_lower_idx` (`[district_id, LOWER(mahalla_name)]`).

- [ ] **Task 2: Telegram Client Group Verification Adapter & Message Filtering** (AC: 4, 5, 7, 8)
  - [ ] 2.1 Enhance `apps/backend/src/adapters/telegram/telegram-client.ts` with `getChat(token, chatId)`, `getChatMember(token, chatId, botId)`, and `checkGroupPrivacyMode(token)`.
  - [ ] 2.2 Define domain errors: `TelegramChatNotFoundError`, `TelegramBotNotMemberError`, `TelegramBotIsAdminError`, `TelegramPrivacyModeEnabledError`.
  - [ ] 2.3 Implement pure `filterTelegramMessage(message)` predicate in `apps/backend/src/adapters/telegram/telegram-message-filter.ts` enforcing rejection of bot senders, channels, forwarded content, and bot commands.
  - [ ] 2.4 Add unit tests in `apps/backend/tests/telegram-message-filter.test.ts` and `apps/backend/tests/telegram-client-group.test.ts`.

- [ ] **Task 3: In-Memory Test Validation Manager & Webhook Handler** (AC: 6, 7, 8, 9, 10)
  - [ ] 3.1 Create `apps/backend/src/modules/telegram-groups/telegram-test-session-manager.ts` with TTL-based test session registry (`(districtId, chatId)` with 65s expiry, status `PENDING | SUCCESS | TIMEOUT | FAILED`).
  - [ ] 3.2 Implement webhook ingestion route `POST /api/v1/telegram/webhook/:botId` capturing test messages during `SETUP_INCOMPLETE` without writing to production evidence tables or enqueuing AI jobs.
  - [ ] 3.3 Create test simulation route `POST /api/v1/districts/:districtId/groups/:groupId/simulate-test-message` enabled only when `NODE_ENV !== 'production'`.

- [ ] **Task 4: Group Mappings Service, API Contracts & Routes** (AC: 1, 2, 3, 11, 12, 13)
  - [ ] 4.1 Define Zod schemas in `packages/api-contracts/src/telegram-groups.ts` and export from `packages/api-contracts/src/index.ts`.
  - [ ] 4.2 Create `apps/backend/src/modules/telegram-groups/telegram-groups-service.ts` implementing CRUD, group access validation, test session initiation, and audit logging (`DISTRICT_GROUP_MAPPED`, `DISTRICT_GROUP_UNMAPPED`, `DISTRICT_GROUP_VALIDATED`).
  - [ ] 4.3 Update `apps/backend/src/modules/districts/districts-readiness.ts` to dynamically evaluate Prerequisite 7 (`group_mappings`) based on `districtTelegramGroups` table records.
  - [ ] 4.4 Create `apps/backend/src/modules/telegram-groups/telegram-groups-routes.ts` and register in `apps/backend/src/entrypoints/http.ts`.
  - [ ] 4.5 Add integration tests in `apps/backend/tests/telegram-groups.test.ts` and update `apps/backend/tests/districts-readiness.test.ts`.

- [ ] **Task 5: Frontend Group Mappings Table, Drawer & Test-Waiting UI** (AC: 1, 6, 9, 11, 14)
  - [ ] 5.1 Create `apps/web/src/district/telegram-group-client.ts` and `apps/web/src/district/useTelegramGroups.ts` with TanStack Query hooks.
  - [ ] 5.2 Create `apps/web/src/components/TelegramGroupDrawer.tsx` with multi-step setup, Ant Design `Form`, and `Statistic.Countdown` / `Progress` spinner for live test message waiting.
  - [ ] 5.3 Create `apps/web/src/components/TelegramGroupTable.tsx` with search filtering and responsive reflow to stacked `<Card />` list via `Grid.useBreakpoint()`.
  - [ ] 5.4 Update `apps/web/src/pages/TelegramSetupPage.tsx` integrating the Mappings Table below the Bot Connection Card.
  - [ ] 5.5 Add unit tests in `apps/web/tests/unit/TelegramGroupTable.test.tsx` and `apps/web/tests/unit/TelegramGroupDrawer.test.tsx`.

- [ ] **Task 6: E2E Verification, Full Test Suite & Codebase Quality Gate** (AC: 15)
  - [ ] 6.1 Create Playwright E2E test `apps/web/tests/e2e/telegram-group-mappings.spec.ts` covering mapping creation, duplicate conflict feedback, test message resolution, and checklist update.
  - [ ] 6.2 Run `pnpm typecheck`, `pnpm test`, and `pnpm --filter @mahalla-ovozi/web test:e2e`.

---

## Dev Notes

### Relevant Architecture Patterns and Constraints

- **Hexagonal Modular Monolith (AD-1):** Telegram group domain logic lives inside `apps/backend/src/modules/telegram-groups/` and communicates through project-owned ports and adapters.
- **Relational Integrity & Migrations (AD-4):** Table `district_telegram_groups` is defined in Drizzle ORM matching migration `0004_icy_vance_astro.sql`.
- **Tenant Isolation & Scope (AD-9):** Every repository method and API contract strictly requires `districtId`. Cross-district queries are prevented by foreign key and index constraints.
- **Privacy & Zero Test Persistence (AD-9, FR-1, FR-20):** Incoming test messages during onboarding are captured in-memory only to verify connectivity and are immediately discarded. Test messages are NEVER saved to database tables or forwarded to AI processing.
- **Explicit `updatedAt` Rule:** Every Drizzle `.update()` statement must explicitly set `updatedAt: new Date()` (satisfying repo learning from Stories 1.2, 1.3, 1.4).

---

### Analysis of Modified (`UPDATE`) Files

#### 1. `apps/backend/src/adapters/db/schema/index.ts`
- **Current State:** Exports accounts, sessions, audit, rate-limits, districts, and district-telegram-bots schemas.
- **Story 1.5 Changes:** Re-export `districtTelegramGroups` from `./district-telegram-groups.js`.
- **Preserve:** All existing schema exports.

#### 2. `apps/backend/src/adapters/telegram/telegram-client.ts`
- **Current State:** Implements `validateTelegramBot(token)` via `getMe`, error classes, and URL token redaction.
- **Story 1.5 Changes:** Add `getChat(token, chatId)`, `getChatMember(token, chatId, botId)`, and `checkGroupPrivacyMode(token)`.
- **Preserve:** Existing `validateTelegramBot` logic, timeout handling, error redaction (`redactTokenFromUrl`), and pure fetch execution outside database transactions.

#### 3. `apps/backend/src/modules/districts/districts-readiness.ts`
- **Current State:** Evaluates 8 prerequisites. Prerequisite 6 (`telegram_bot`) is dynamically evaluated. Prerequisite 7 (`group_mappings`) is statically hardcoded as `incomplete`.
- **Story 1.5 Changes:** Query `districtTelegramGroups` table for the district. Prerequisite 7 evaluates to `passed` if at least 1 group mapping exists and all configured mappings have `status === 'VALID'`. If any mapping is `PENDING`, `TESTING`, or `FAILED`, or if count is 0, evaluate to `incomplete` with clear blocker reasons.
- **Preserve:** Evaluation logic for all other 7 prerequisites, disclosure confirmation mutations, and audit logging.

#### 4. `apps/backend/src/entrypoints/http.ts`
- **Current State:** Registers auth, district, and telegram-bot routes.
- **Story 1.5 Changes:** Register `registerTelegramGroupRoutes(server, db)`.
- **Preserve:** CORS, cookie parsing, custom JSON content-type parser, global sanitized error handler.

#### 5. `packages/api-contracts/src/index.ts`
- **Current State:** Re-exports auth, districts, readiness, and telegram-bot contracts.
- **Story 1.5 Changes:** Re-export all schemas and types from `./telegram-groups.js`.
- **Preserve:** All existing contract exports.

#### 6. `apps/web/src/pages/TelegramSetupPage.tsx`
- **Current State:** Renders the Telegram Bot Connection Card with Replace and Disconnect modals.
- **Story 1.5 Changes:** Render `TelegramGroupTable` and `TelegramGroupDrawer` directly below the bot card when a bot is valid. If no bot is connected, show an informative alert explaining that a bot must be connected before mapping groups.
- **Preserve:** Existing bot connection, replacement, disconnection flows, masking, and offline banner handling.

---

### Previous Story Intelligence & Learnings

1. **Drizzle `updatedAt` Timestamp:** PostgreSQL does not auto-update timestamps on `UPDATE` without a trigger. Every update query MUST explicitly include `updatedAt: new Date()` to prevent stale timestamps.
2. **Secret Redaction in Telegram Errors:** When `fetch` fails or Telegram returns a 4xx/5xx status, any raw URL containing `/bot<token>/...` must pass through `redactTokenFromUrl` before forming error messages.
3. **Decryption of Bot Token for Backend Operations:** When the backend needs to call Telegram APIs on behalf of a District (`getChat`, `getChatMember`), it loads the encrypted token from `district_telegram_bots`, decrypts it using `decryptToken(payload)` from `adapters/crypto/token-cipher.ts`, and executes the call. Decrypted tokens are never stored in memory or exposed in returned contracts.
4. **JSDOM Compatibility in Web Unit Tests:** Ant Design modals, drawers, and portals use `rc-util` which calls `getComputedStyle`. Vitest setup in `tests/setup.ts` must mock or handle computed styles gracefully.
5. **Uzbek Cyrillic Standards:** All user-facing error messages, table headers, drawer labels, and status badges must be authored in standard Uzbek Cyrillic.

---

### Project Structure Notes

- Alignment with unified project structure:
  - Contracts in `packages/api-contracts/src/telegram-groups.ts`
  - Backend schema in `apps/backend/src/adapters/db/schema/district-telegram-groups.ts`
  - Backend service & routes in `apps/backend/src/modules/telegram-groups/`
  - Frontend components in `apps/web/src/components/` and state in `apps/web/src/district/`
- No detected architectural variances or conflicts.

---

### References

- [Epic 1 Specification: Story 1.5](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/epics/epic-1.md#Story-1.5)
- [PRD FR-21: Telegram bot, group, and Mahalla management](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/prds/prd-Mahalla-Ovozi-2026-07-30/prd.md#fr-21-telegram-bot-group-and-mahalla-management)
- [Architecture Spine: Invariants AD-1, AD-3, AD-4, AD-9, AD-10](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/architecture/architecture-Mahalla-Ovozi-2026-08-12/ARCHITECTURE-SPINE.md)
- [UX Design Specifications](file:///c:/codevision-works/mahalla-ovozi-trial-2/_bmad-output/planning-artifacts/ux-designs/ux-Mahalla-Ovozi-2026-08-05/DESIGN.md)

---

## Dev Agent Record

### Agent Model Used

Gemini 3.7 Flash

### Debug Log References

### Completion Notes List

### File List

- `apps/backend/src/adapters/db/schema/district-telegram-groups.ts` [NEW]
- `apps/backend/src/adapters/db/schema/index.ts` [UPDATE]
- `apps/backend/src/adapters/telegram/telegram-client.ts` [UPDATE]
- `apps/backend/src/adapters/telegram/telegram-message-filter.ts` [NEW]
- `apps/backend/src/modules/telegram-groups/telegram-test-session-manager.ts` [NEW]
- `apps/backend/src/modules/telegram-groups/telegram-groups-service.ts` [NEW]
- `apps/backend/src/modules/telegram-groups/telegram-groups-routes.ts` [NEW]
- `apps/backend/src/modules/districts/districts-readiness.ts` [UPDATE]
- `apps/backend/src/entrypoints/http.ts` [UPDATE]
- `packages/api-contracts/src/telegram-groups.ts` [NEW]
- `packages/api-contracts/src/index.ts` [UPDATE]
- `apps/web/src/district/telegram-group-client.ts` [NEW]
- `apps/web/src/district/useTelegramGroups.ts` [NEW]
- `apps/web/src/components/TelegramGroupDrawer.tsx` [NEW]
- `apps/web/src/components/TelegramGroupTable.tsx` [NEW]
- `apps/web/src/pages/TelegramSetupPage.tsx` [UPDATE]
- `apps/backend/tests/telegram-message-filter.test.ts` [NEW]
- `apps/backend/tests/telegram-client-group.test.ts` [NEW]
- `apps/backend/tests/telegram-groups.test.ts` [NEW]
- `apps/backend/tests/districts-readiness.test.ts` [UPDATE]
- `apps/web/tests/unit/TelegramGroupTable.test.tsx` [NEW]
- `apps/web/tests/unit/TelegramGroupDrawer.test.tsx` [NEW]
- `apps/web/tests/unit/TelegramSetupPage.test.tsx` [UPDATE]
- `apps/web/tests/e2e/telegram-group-mappings.spec.ts` [NEW]

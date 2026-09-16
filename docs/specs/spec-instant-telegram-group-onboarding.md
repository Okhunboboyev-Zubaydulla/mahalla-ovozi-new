# Spec: Instant Telegram Group Onboarding

## Problem Statement

When the Product Owner maps a Telegram group to a Mahalla within a District, the current workflow imposes an artificial and disruptive two-step onboarding barrier. 

In Step 1, the backend queries the Telegram Bot API to authoritatively confirm that the group exists, is a valid group or supergroup, that the District Bot is an active member, and that Bot privacy mode is disabled. 

However, instead of completing the mapping, the system transitions the group into a `PENDING` and then `TESTING` state, forcing the Product Owner into a mandatory 60-second live test countdown. During this countdown, the system demands that a real resident send a live message in the Telegram group. 

In real-world community deployments, this causes frequent operational blockages:
1. Many mahalla groups are announcement or broadcast-linked supergroups where regular members have restricted posting permissions (`can_send_messages: false`), making resident messages impossible without administrative permission changes.
2. In normal, low-frequency community groups, residents often do not post within an arbitrary 60-second window.
3. When the countdown expires, the group is marked as `TIMEOUT` or `FAILED`, preventing the group from ingesting evidence and locking the Product Owner in an error state.
4. Attempting to bypass this barrier via the UI's "Simulate Test Message" button results in an immediate HTTP 403 `FORBIDDEN_IN_PRODUCTION` failure, creating a dead-end experience.

## Solution

Streamline Telegram group onboarding into a single-step, authoritative process:

1. **Instant Verification and Activation:** When the Product Owner submits a Mahalla name and Telegram Chat ID, the backend immediately executes authoritative verification via the Telegram Bot API (verifying group existence, bot membership, and privacy mode).
2. **Direct `VALID` State:** Upon successful API verification, the group mapping is immediately saved with `status: 'VALID'`, making it instantly active to ingest public signals.
3. **Frictionless UI:** The multi-step drawer with the 60-second countdown, progress bars, and simulation buttons is replaced with a clean, single-step confirmation form that validates and closes upon success.
4. **Non-blocking Telemetry:** Tracking the first received message is decoupled from onboarding; `testMessageReceivedAt` or first intake timestamp updates passively in the background as resident evidence arrives naturally via the webhook.

## User Stories

1. As a Product Owner, I want to add a Mahalla Telegram group by providing its name and Chat ID in a single form submission, so that I can onboard community groups quickly without unnecessary delays.
2. As a Product Owner, I want the system to immediately verify that the Telegram Chat ID exists and corresponds to a group or supergroup, so that invalid chats or channels are rejected upfront with clear feedback.
3. As a Product Owner, I want the system to verify that the District Bot is already a member of the Telegram group during form submission, so that I am promptly alerted if the bot needs to be added before saving.
4. As a Product Owner, I want the system to verify that the District Bot's privacy mode is disabled via BotFather during form submission, so that the bot is guaranteed to receive public group messages.
5. As a Product Owner, I want the group to transition directly to `VALID` status upon successful Bot API verification, so that the group can begin ingesting public evidence immediately.
6. As a Product Owner, I want to onboard announcement-only or admin-restricted community groups without being blocked by a mandatory citizen test message, so that all official mahalla discussion channels can be monitored.
7. As a Product Owner, I want to onboard low-velocity community groups without waiting for a resident to post within 60 seconds, so that onboarding does not depend on unpredictable community activity.
8. As a Product Owner, I want clear, localized error messages in Uzbek if the Telegram Bot API returns an error (such as chat not found, bot kicked, or bot lacks access), so that I know exactly how to resolve the issue in Telegram.
9. As a Product Owner, I want the system to reject duplicate Mahalla names within the same District, so that each Mahalla in a District has a distinct identity.
10. As a Product Owner, I want the system to reject Telegram Chat IDs that are already mapped within the current District, so that duplicate message processing is prevented.
11. As a Product Owner, I want the system to reject Telegram Chat IDs that are already mapped to another District, so that strict multi-district data boundaries are preserved.
12. As a Product Owner, I want to update an existing Mahalla's name without re-triggering external Telegram API checks, so that simple typographical corrections are instantaneous.
13. As a Product Owner, I want to update an existing Mahalla's Telegram Chat ID with immediate Bot API verification and automatic transition to `VALID`, so that remapping groups is fast and reliable.
14. As a Product Owner, I want to delete or unmap a Telegram group from a Mahalla, so that inactive or incorrect groups stop feeding evidence into the District.
15. As a Product Owner, I want to view the list of all mapped Mahalla Telegram groups with clear status tags (`VALID`), so that I can assess the operational readiness of the District at a glance.
16. As a Product Owner, I want to see when a group was last validated against Telegram, so that I have visibility into system verification recency.
17. As a Product Owner, I want the frontend group drawer to provide concise instructions on how to obtain a group's Chat ID using helper bots, so that I can find the required ID without external documentation.
18. As a Hokim, I want public signals from all newly mapped `VALID` Mahalla groups to be captured by the platform as soon as residents post, so that daily situational awareness is comprehensive and up to date.
19. As a Hokim, I want evidence to be organized by Mahalla within my District dashboard, so that I can understand which specific neighborhood is experiencing community concerns.
20. As a system, I want incoming Telegram webhook updates for `VALID` groups to be accepted and queued for noise filtering without requiring prior manual test sessions, so that the intake pipeline remains automated.
21. As a system, I want an immutable Audit Record to be created whenever a Telegram group is mapped, remapped, or unmapped, so that administrative actions are auditable.
22. As a system, I want first-message timestamps to update passively in the background when genuine evidence arrives, so that operational health metrics are maintained without impacting onboarding workflows.

## Implementation Decisions

### 1. State Machine Simplification
- The lifecycle for newly mapped groups transitions directly from input validation to `VALID`.
- The `status` column in the database and API contracts continues to support `VALID`, `FAILED`, and `PENDING` (for backwards compatibility), but `createDistrictTelegramGroup` directly sets `status: 'VALID'` and `lastValidatedAt: new Date()`.
- When an existing group's `telegramChatId` is changed, the remapped chat is validated against the Telegram Bot API and saved directly as `status: 'VALID'`.

### 2. Elimination of the Blocking Test Session Flow
- The backend `startGroupTestSession` and polling endpoint `getGroupTestStatus` are decoupled from the onboarding path.
- The developer-only route `simulate-test-message` is completely removed from the user onboarding interface, eliminating the confusing production HTTP 403 error.
- Webhook intake continues to record the timestamp of the first received evidence passively in `testMessageReceivedAt` (or last evidence timestamp) for diagnostic visibility.

### 3. Frontend Drawer Experience
- The `TelegramGroupDrawer` component is simplified from a 2-step wizard to a single-step modal/drawer.
- The Step 1 form fields (`mahallaName` and `telegramChatId`) are retained with existing input formatting and validation rules.
- Upon clicking submit, the button enters a loading state while the backend validates the bot and chat with the Telegram Bot API.
- Upon successful response, a success alert/notification is displayed ("Маҳалла Telegram гуруҳи муваффақиятли бириктирилди!"), the drawer automatically closes, and the parent group table is refreshed.
- If Telegram API validation fails (e.g., bot not in chat, privacy mode enabled), the drawer stays open on the form and displays actionable error guidance.

### 4. Background Intake Compatibility
- In `telegram-intake-service`, all incoming messages for groups with `status === 'VALID'` are immediately accepted and queued into `pg-boss` for noise filtering, qualification, and same-day topic clustering.
- Groups are never dropped due to unfulfilled test sessions.

### 5. Audit Logging Invariant
- The system persists an immutable Audit Record (`DISTRICT_GROUP_MAPPED` or `DISTRICT_GROUP_REMAPPED`) containing actor details, district ID, group ID, mahalla name, and chat ID within the database transaction.

## Testing Decisions

### Good Test Criteria
- Tests must strictly evaluate observable external behavior via HTTP request/response cycles, database persistence, and user-facing contracts.
- Tests must avoid coupling to internal function signatures or mocking internal business logic.
- External third-party boundaries (Telegram Bot API network calls) are isolated via controlled mock HTTP endpoints or adapter stubs.

### Test Seams

1. **Primary Backend Seam (Fastify HTTP Injection):**
   - Execute HTTP requests against `POST /api/v1/districts/:districtId/groups` using Fastify `server.inject`.
   - Use the isolated test database `mahalla_ovozi_test` with real PostgreSQL transactions.
   - Assert that a valid payload returns HTTP 201/200 with `status: 'VALID'`, populates `lastValidatedAt`, and inserts the row with `status = 'VALID'` in the database.
   - Assert that an invalid chat ID, non-member bot, or privacy-enabled bot returns HTTP 400 with descriptive error details and does not insert an active mapping.

2. **Webhook Ingestion Seam:**
   - Immediately following group creation, inject a simulated Telegram update into `POST /api/v1/telegram/webhook/:secret`.
   - Assert that the incoming message from the newly created group is accepted (`handled: true`) and not rejected with `GROUP_NOT_APPROVED`.

3. **End-to-End Browser Seam (Playwright):**
   - In `apps/web/tests/e2e/telegram-group-mappings.spec.ts`, execute the full UI flow in a headless browser against the local mock Telegram server.
   - Fill in Mahalla Name and Telegram Chat ID, click submit.
   - Assert that the drawer closes immediately upon successful validation, the group appears in the Ant Design table with the green `VALID` tag, and no 60-second countdown or simulation button is rendered.

### Prior Art
- `apps/backend/tests/telegram-groups.test.ts`: Fastify HTTP injection testing for group listing, creation, and uniqueness constraints.
- `apps/backend/tests/telegram-intake.test.ts`: Webhook intake testing with secret authentication and status checks.
- `apps/web/tests/e2e/telegram-group-mappings.spec.ts`: Playwright test with mock Telegram API server on port 3099.

## Out of Scope

- **Automated Bot Invitation:** Automatically joining or inviting the Telegram bot into a group via API (Telegram Bot API protocol prohibits bots from initiating invitations; human group administrators must add bots).
- **Telegram Channel Monitoring:** Directly monitoring Telegram broadcast channels without an associated discussion supergroup (Telegram Bot API privacy architecture only permits message listening within groups and supergroups).
- **Real-Time WebSocket Group Table Updates:** Live group status changes pushed via WebSockets (TanStack Query cache invalidation upon drawer submission is sufficient).

## Further Notes

- By validating authoritatively in Step 1 against Telegram's Bot API (`getChat`, `getChatMember`, and privacy settings), the system maintains 100% technical assurance that the bot is correctly installed and capable of receiving messages, while removing 100% of human friction and false timeout failures.

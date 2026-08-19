---
baseline_commit: 9e47d4120ff1ee55fb59fea0777b0fe6b272c499
---

# Story 1.4: Connect and Validate a District Telegram Bot

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the **Product Owner**,
I want to securely connect and validate one Telegram bot for a District,
So that the District has a verified passive Telegram connection before approved groups can be mapped or production intake can be activated.

## Acceptance Criteria

1. **District-Scoped Bot Connection Status Model**
   - **Given** an incomplete District is selected in the Console
   - **When** the Product Owner opens Telegram Setup (`/telegram-setup`)
   - **Then** the page displays a District-scoped bot connection status card
   - **And** clearly distinguishes between `not_configured` (Бот уланмаган), `validating` (Текширилмоқда), `valid` (Фаол / Текширилган), and `failed` (Хатолик) states
   - **And** no bot information from any other District can appear.

2. **Browser Memory Boundary & Secret Non-Persistence**
   - **Given** the District has no configured bot (or the PO is replacing an existing bot)
   - **When** the Product Owner inputs a Telegram bot token into the form
   - **Then** the raw token exists in browser memory only for the active submission transaction
   - **And** the input uses masked presentation (`Input.Password`)
   - **And** the raw token is NEVER written to browser storage (`localStorage`, `sessionStorage`), URL history, client logs, telemetry, or draft cache
   - **And** browser autofill/restoration is explicitly prevented.

3. **Cryptographic Storage & AES-256-GCM Encryption at Rest (AD-6, AD-9)**
   - **Given** the Product Owner submits a bot token
   - **When** the backend accepts the request
   - **Then** the token is processed only through the project-owned Telegram integration boundary
   - **And** the plaintext token is NEVER persisted to the database directly
   - **And** persistent storage contains authenticated ciphertext encrypted under the deployment-held versioned encryption key (`ENCRYPTION_KEY`) using AES-256-GCM
   - **And** `ENCRYPTION_KEY` is parsed securely supporting 64-char hex, 44-char base64, or 32-byte UTF-8 string, with production length validation (32 bytes) and dev fallback
   - **And** each record stores its random 12-byte IV, 16-byte authentication tag (extracted after `cipher.final()`), key version (`v1`), and masked preview (`${botId}:••••••••••••`).

4. **Telegram Network Call Outside DB Transactions & URL Redaction (AD-6)**
   - **Given** a token submission is being validated
   - **When** the server connects to the Telegram Bot API (`getMe`)
   - **Then** the network call is executed strictly outside any open database transaction or connection lock
   - **And** a network timeout (5000ms limit via `AbortSignal.timeout(5000)`) or unreachable Telegram service fails cleanly without leaking connection pool resources
   - **And** the plaintext token is strictly REDACTED (`/bot[REDACTED]/getMe`) from all outgoing request error logs, exceptions, and stack traces.

5. **Cross-District Bot Identity Uniqueness & Rejection**
   - **Given** a submitted Telegram bot token resolves to a Telegram bot identity (`bot_id`) that is already authoritatively assigned to another District
   - **When** the Product Owner attempts to connect it to the selected District
   - **Then** the server rejects the request with HTTP 409 Conflict (`BOT_ALREADY_ASSIGNED`)
   - **And** one Telegram bot identity cannot be simultaneously assigned to more than one District across the entire platform (enforced by a database-level unique constraint on `bot_id`)
   - **And** the other District's identity and configuration are neither modified nor exposed.

6. **Sanitized Failure Categorization & Secret Protection**
   - **Given** a submitted token is syntactically invalid, rejected by Telegram (HTTP 401/404), rate-limited (HTTP 429), belongs to an inaccessible bot, or validation times out
   - **When** validation completes
   - **Then** the District does not receive a valid Telegram readiness state
   - **And** no unusable plaintext credential or partial ciphertext is persisted
   - **And** the Product Owner receives a sanitized, actionable Uzbek Cyrillic error message without upstream raw response bodies, stack traces, or credentials.

7. **Authoritative Bot Validation & Metadata Persistence**
   - **Given** a valid Telegram bot token is submitted
   - **When** authoritative validation succeeds via `getMe` (`ok: true`, `is_bot: true`, `id` present)
   - **Then** the system persists only approved non-secret bot metadata: `district_id`, `bot_id`, `bot_username` (`string | null`), `bot_first_name`, `encrypted_token`, `token_iv`, `token_tag`, `token_key_version`, `token_masked`, `status = 'VALID'`, and `last_validated_at`
   - **And** the onboarding checklist prerequisite (`telegram_bot`) evaluates to `passed`.

8. **Passive Receipt Boundary (MVP Constraint)**
   - **Given** a configured District bot operates in Mahalla Ovozi MVP
   - **When** the product interacts with the Telegram API
   - **Then** the bot is utilized strictly for passive receipt and bot-level connectivity validation
   - **And** Mahalla Ovozi does not send group messages, delete or moderate messages, ban users, pin content, or alter group settings
   - **And** no activation prerequisite requires the bot to hold Telegram group administrator privileges.

9. **Safe Read Contracts & Strict Exclusion of Secrets**
   - **Given** a District has a valid configured bot
   - **When** the Product Owner opens Telegram Setup or queries `GET /api/v1/districts/:districtId/telegram-bot`
   - **Then** the stored token is NEVER returned in API responses
   - **And** the UI displays only safe metadata: `@bot_username` (or display name if username is not set), display name, masked token preview, validation timestamp, and status
   - **And** there is no "reveal token" or "copy secret" capability anywhere in the product.

10. **Atomic Credential Replacement & Disconnection with State Guarding**
    - **Given** the Product Owner supplies a replacement token or disconnects a bot for a District
    - **When** mutation is executed
    - **Then** the service verifies the District is in `SETUP_INCOMPLETE` status (rejects with 409 if already `ACTIVE`)
    - **And** if replacement validation succeeds, the new token atomically replaces the prior bot credential
    - **And** if replacement validation fails, the previously valid bot configuration remains unchanged
    - **And** disconnecting a bot atomically removes the stored credential and marks readiness prerequisite `telegram_bot` as `incomplete`.

11. **Onboarding Checklist Prerequisite Dynamic Derivation (FR20 Prerequisite 6)**
    - **Given** the District's bot connection state changes
    - **When** `GET /api/v1/districts/:districtId/readiness` is requested or refreshed
    - **Then** prerequisite 6 (`telegram_bot`) is dynamically derived from the authoritative `district_telegram_bots` record
    - **And** evaluates to `passed` with `completedAt` when a valid bot is attached
    - **And** evaluates to `incomplete` with action link `/telegram-setup` when no valid bot is attached
    - **And** group-to-Mahalla mapping (`group_mappings`) remains separately `incomplete` until Story 1.5.

12. **Privacy-Safe Audit History Logging (AD-9)**
    - **Given** a bot is connected, replaced, or disconnected
    - **When** the mutation commits
    - **Then** an audit event (`DISTRICT_TELEGRAM_BOT_CONNECTED` or `DISTRICT_TELEGRAM_BOT_DISCONNECTED`) is recorded in `audit_events`
    - **And** the audit payload contains only privacy-safe metadata: `districtId`, `botId`, `botUsername`, `keyVersion`, `actorId`, `actorRole`, `ipAddress`, and `userAgent`
    - **And** the raw token, decrypted secret, ciphertext, or IV/tag NEVER appear in audit logs.

13. **Offline & Network Loss Handling**
    - **Given** the browser goes offline (`navigator.onLine === false`)
    - **When** the Product Owner views Telegram Setup
    - **Then** current bot status remains visible read-only with the offline banner
    - **And** token validation/connection actions are disabled
    - **And** the secret is not queued for automatic replay.

14. **Accessibility Floor & Uzbek Cyrillic UX**
    - **Given** Telegram Setup is viewed across devices, at 200% zoom, with keyboard navigation, or screen readers
    - **When** the Product Owner navigates the form
    - **Then** all form controls have explicit accessible labels and 44px minimum touch targets
    - **And** status is never conveyed by color alone (status icons + explicit text tags)
    - **And** 100% of user-facing UI text uses standard Uzbek Cyrillic.

15. **Automated Test Matrix & Verification Gates**
    - **Given** Story 1.4 is implemented
    - **When** test suites execute
    - **Then** unit tests verify AES-256-GCM encryption/decryption, tampering detection, key format parsing, and token masking
    - **And** backend integration tests verify Telegram API mocking, token encryption in DB, cross-district bot uniqueness, secret exclusion from API responses, audit logging, and readiness evaluator transitions
    - **And** web E2E tests verify bot connection flow, validation error feedback, masked metadata rendering, cache synchronization, and checklist update.

---

## Tasks / Subtasks

- [x] **Task 1: Cryptographic Cipher Adapter & Unit Tests** (AC: 3, 9, 12, 15)
  - [x] 1.1 Create `apps/backend/src/adapters/crypto/token-cipher.ts` implementing `encryptToken(token, keyVersion?)`, `decryptToken(payload)`, and `maskBotToken(token)` using Node.js native `crypto` (AES-256-GCM, 12-byte IV, 16-byte auth tag, `process.env.ENCRYPTION_KEY`).
  - [x] 1.2 Implement multi-format `ENCRYPTION_KEY` normalization: support 64-char hex, 44-char base64, or 32-byte string; validate 32-byte length in production; use dev fallback key in test/development if unset.
  - [x] 1.3 Implement resilient `maskBotToken(token)` using regex `/^(\d{6,16}):.+$/` returning `${botId}:••••••••••••` or safe `••••••••••••` for malformed input without leaking secrets.
  - [x] 1.4 Create `apps/backend/tests/token-cipher.test.ts` with unit tests covering roundtrip encryption/decryption, authentication tag tampering detection, key format parsing, key versioning, and token masking edge cases.

- [x] **Task 2: Database Schema & Migration (`0003_district_telegram_bots.sql`)** (AC: 1, 3, 5, 7, 10)
  - [x] 2.1 Create `apps/backend/src/adapters/db/schema/district-telegram-bots.ts` defining `districtTelegramBots` table with `id`, `districtId` (unique FK referencing `districts.id` with cascade delete), `botId` (unique text), `botUsername` (nullable text), `botFirstName` (text), `encryptedToken` (text), `tokenIv` (text), `tokenTag` (text), `tokenKeyVersion` (text default 'v1'), `tokenMasked` (text), `status` (text check constraint `VALID` | `INVALID`), `lastValidatedAt`, `createdAt`, `updatedAt`.
  - [x] 2.2 Re-export from `apps/backend/src/adapters/db/schema/index.ts`.
  - [x] 2.3 Generate and apply Drizzle SQL migration `0003_district_telegram_bots.sql`.
  - [x] 2.4 Verify database unique indexes (`district_telegram_bots_district_id_idx` and `district_telegram_bots_bot_id_idx`).

- [x] **Task 3: Telegram API Integration Adapter with URL Redaction** (AC: 4, 6, 7, 8)
  - [x] 3.1 Create `apps/backend/src/adapters/telegram/telegram-client.ts` implementing `validateTelegramBot(token: string)` calling `https://api.telegram.org/bot<token>/getMe` with an `AbortSignal.timeout(5000)`.
  - [x] 3.2 Define custom domain errors: `TelegramInvalidTokenError` (400), `TelegramNetworkTimeoutError` (504), `TelegramRateLimitError` (429), `TelegramApiError` (502).
  - [x] 3.3 Ensure token redaction (`/bot[REDACTED]/getMe`) from all error messages, logs, and stack traces.
  - [x] 3.4 Validate `ok: true`, `is_bot: true`, and extract `id`, `first_name`, `username` (`string | null`).
  - [x] 3.5 Ensure pure HTTP execution strictly outside database transactions.

- [x] **Task 4: Shared API Contracts (`packages/api-contracts`)** (AC: 1, 7, 9)
  - [x] 4.1 Create `packages/api-contracts/src/telegram-bot.ts` defining `ConnectTelegramBotRequestSchema`, `TelegramBotInfoSchema` (with nullable `botUsername`), `GetTelegramBotResponseSchema`, `ConnectTelegramBotResponseSchema`, and `DisconnectTelegramBotResponseSchema`.
  - [x] 4.2 Re-export schemas and types from `packages/api-contracts/src/index.ts`.
  - [x] 4.3 Run `pnpm typecheck` to confirm clean compilation.

- [x] **Task 5: Backend Telegram Bot Domain Service & Routes** (AC: 1, 3, 4, 5, 6, 7, 9, 10, 12)
  - [x] 5.1 Create `apps/backend/src/modules/telegram-bot/telegram-bot-service.ts` implementing `getDistrictTelegramBot(db, districtId)`, `connectDistrictTelegramBot(db, districtId, token, actor, clientInfo)`, and `disconnectDistrictTelegramBot(db, districtId, actor, clientInfo)`.
  - [x] 5.2 Implement domain error handling: `DistrictNotFoundError` (404), `DistrictAlreadyActiveError` (409), `BotAlreadyAssignedError` (409 on DB `bot_id` conflict), `TelegramBotNotFoundError` (404 on disconnect when none exists).
  - [x] 5.3 Implement status check enforcing `SETUP_INCOMPLETE` for connect, replace, and disconnect mutations.
  - [x] 5.4 Implement privacy-safe audit logging for `DISTRICT_TELEGRAM_BOT_CONNECTED` and `DISTRICT_TELEGRAM_BOT_DISCONNECTED` (zero token/ciphertext leakage).
  - [x] 5.5 Create `apps/backend/src/modules/telegram-bot/telegram-bot-routes.ts` registering `GET`, `POST`, and `DELETE` endpoints under `/api/v1/districts/:districtId/telegram-bot` protected by `verifyStateChangingOrigin` and `createRequireProductOwner(db)`.
  - [x] 5.6 Register routes in `apps/backend/src/entrypoints/http.ts`.

- [x] **Task 6: District Readiness Evaluator Integration & Route Fix** (AC: 7, 11)
  - [x] 6.1 Update `evaluateDistrictPrerequisites` in `apps/backend/src/modules/districts/districts-readiness.ts` to accept optional `telegramBot` record.
  - [x] 6.2 Update `evaluateDistrictReadiness` in `apps/backend/src/modules/districts/districts-readiness.ts` to query `districtTelegramBots` for the district.
  - [x] 6.3 If bot exists and `status === 'VALID'`, mark prerequisite `telegram_bot` as `passed` with `description = 'Туманнинг расмий Telegram боти (@${bot.botUsername || bot.botFirstName}) фаоллаштирилди'` and `completedAt = bot.lastValidatedAt.toISOString()`.
  - [x] 6.4 If bot does not exist, keep prerequisite `telegram_bot` as `incomplete` with `actionRequired = true` and `actionPath = '/telegram-setup'` (fixing `/telegram-bot` path discrepancy).

- [x] **Task 7: Backend Integration Tests** (AC: 3, 4, 5, 6, 7, 9, 10, 11, 12, 15)
  - [x] 7.1 Create `apps/backend/tests/telegram-bot.test.ts` testing against real PostgreSQL database and mocked Telegram API.
  - [x] 7.2 Test successful bot connection: `POST /api/v1/districts/:districtId/telegram-bot` returns masked bot info, DB stores ciphertext, audit record created.
  - [x] 7.3 Test invalid bot token rejection (400 / 401).
  - [x] 7.4 Test cross-district bot collision rejection (409 `BOT_ALREADY_ASSIGNED`).
  - [x] 7.5 Test `GET` endpoint returns safe masked metadata without secret leakage.
  - [x] 7.6 Test atomic replacement and disconnect operations.
  - [x] 7.7 Test active district mutation rejection (409 `DISTRICT_ALREADY_ACTIVE`).
  - [x] 7.8 Test readiness endpoint returns prerequisite `telegram_bot` as `passed` after connection and `incomplete` after disconnect.

- [x] **Task 8: Frontend Client & React Query Hooks** (AC: 1, 2, 9, 11, 13)
  - [x] 8.1 Create `apps/web/src/district/telegram-bot-client.ts` with `getDistrictTelegramBot(districtId)`, `connectDistrictTelegramBot(districtId, token)`, and `disconnectDistrictTelegramBot(districtId)`.
  - [x] 8.2 Create `apps/web/src/district/useTelegramBot.ts` implementing TanStack Query hooks with district scoping `['district', activeDistrictId, 'telegram-bot']`.
  - [x] 8.3 Invalidate both `['district', activeDistrictId, 'telegram-bot']` and `['district', activeDistrictId, 'readiness']` upon connection/disconnection.

- [x] **Task 9: Frontend Telegram Setup Page UI (`TelegramSetupPage.tsx`)** (AC: 1, 2, 6, 9, 10, 13, 14)
  - [x] 9.1 Replace placeholder in `apps/web/src/pages/TelegramSetupPage.tsx` with full Ant Design 5.x implementation.
  - [x] 9.2 Build "Not Configured" state with masked token input (`Input.Password`), validation rules, help text, and "Ботни текшириш ва улаш" action.
  - [x] 9.3 Build "Connected / Valid" state displaying `@bot_username` (or first name), display name, masked token, last verified date, passive receipt notice, and "Ботни алмаштириш" / "Ботни узиш" actions.
  - [x] 9.4 Implement confirmation modals for bot replacement and bot disconnection.
  - [x] 9.5 Handle offline state (`navigator.onLine === false`: disable actions, show offline warning alert).
  - [x] 9.6 Ensure 100% Uzbek Cyrillic microcopy and 44px min touch targets.

- [x] **Task 10: Update Onboarding Checklist Navigation** (AC: 1, 11, 14)
  - [x] 10.1 In `apps/web/src/components/DistrictOnboardingChecklist.tsx`, render action button for prerequisite `telegram_bot` when `incomplete` navigating to `/telegram-setup`.

- [x] **Task 11: End-to-End Playwright Tests & Verification** (AC: 1, 2, 7, 11, 14, 15)
  - [x] 11.1 Create `apps/web/tests/e2e/telegram-bot.spec.ts` testing bot setup flow in browser.
  - [x] 11.2 Test entering token, connecting bot, verifying masked details card, navigating back to Overview, and seeing `telegram_bot` prerequisite marked `passed`.
  - [x] 11.3 Run full verification: `pnpm typecheck`, `pnpm test`, and `pnpm --filter @mahalla-ovozi/web test:e2e`.

---

## Dev Notes

### Architecture Patterns and Constraints

1. **Cryptographic Algorithm (AD-6, AD-9):**
   - Use AES-256-GCM (`crypto.createCipheriv('aes-256-gcm', key, iv)`).
   - IV: 12 bytes (96 bits) randomly generated per encryption via `crypto.randomBytes(12)`.
   - Tag: 16 bytes (128 bits) authentication tag extracted via `cipher.getAuthTag()` strictly **after** `cipher.final()`.
   - Secret Key: 32 bytes (256 bits) derived from `process.env.ENCRYPTION_KEY` (normalized from hex, base64, or utf-8 buffer).
   - In test/dev environments, if `process.env.ENCRYPTION_KEY` is not provided, use a stable 32-byte default (`dev_encryption_key_32_bytes_len!!`) with a warning.
   - Format stored in DB:
     - `encryptedToken`: hex-encoded ciphertext.
     - `tokenIv`: hex-encoded IV.
     - `tokenTag`: hex-encoded auth tag.
     - `tokenKeyVersion`: `'v1'`.
     - `tokenMasked`: `${botId}:••••••••••••`.

2. **Telegram API Interaction & URL Redaction:**
   - Endpoint: `https://api.telegram.org/bot<token>/getMe`.
   - HTTP Client: Standard `fetch` with `signal: AbortSignal.timeout(5000)`.
   - Token Redaction: Catch all errors and format logs replacing `<token>` with `[REDACTED]`.
   - Response payload checks: Assert `data.ok === true`, `data.result.is_bot === true`, and `data.result.id` is valid.
   - Passive receipt rule: Never send messages, delete messages, or manage chat settings.

3. **Audit History Logging (AD-9):**
   - Action: `DISTRICT_TELEGRAM_BOT_CONNECTED` | `DISTRICT_TELEGRAM_BOT_DISCONNECTED`.
   - Metadata payload:
     ```json
     {
       "districtId": "dst_123",
       "botId": "987654321",
       "botUsername": "mahalla_sample_bot",
       "keyVersion": "v1"
     }
     ```
   - STRICT INVARIANT: Plaintext token, ciphertext, IV, and auth tag MUST NEVER be passed to `recordAuditEvent`.

4. **Domain Error Mapping Matrix:**
   - `DistrictNotFoundError` $\rightarrow$ 404 (`DISTRICT_NOT_FOUND`, "Туман топилмади.")
   - `DistrictAlreadyActiveError` $\rightarrow$ 409 (`DISTRICT_ALREADY_ACTIVE`, "Туман аллақачон фаоллаштирилган.")
   - `BotAlreadyAssignedError` $\rightarrow$ 409 (`BOT_ALREADY_ASSIGNED`, "Ушбу Telegram бот аллақачон бошқа туманга бириктирилган.")
   - `TelegramInvalidTokenError` $\rightarrow$ 400 (`TELEGRAM_INVALID_TOKEN`, "Telegram бот токени ҳақиқий эмас ёки бот топилмади.")
   - `TelegramNetworkTimeoutError` $\rightarrow$ 504 (`TELEGRAM_TIMEOUT`, "Telegram сервери билан боғланиш вақти тугади (5 сония).")
   - `TelegramRateLimitError` $\rightarrow$ 429 (`TELEGRAM_RATE_LIMITED`, "Telegram сўровлар сони чекланди. Бироздан сўнг қайта уриниб кўринг.")
   - `TelegramApiError` $\rightarrow$ 502 (`TELEGRAM_API_ERROR`, "Telegram серверига уланишда хатолик юз берди.")
   - `TelegramBotNotFoundError` $\rightarrow$ 404 (`TELEGRAM_BOT_NOT_FOUND`, "Туманга бот бириктирилмаган.")

---

### Source Tree Components to Touch

#### NEW Files:
1. `apps/backend/src/adapters/crypto/token-cipher.ts`
2. `apps/backend/src/adapters/db/schema/district-telegram-bots.ts`
3. `apps/backend/src/adapters/telegram/telegram-client.ts`
4. `apps/backend/src/modules/telegram-bot/telegram-bot-service.ts`
5. `apps/backend/src/modules/telegram-bot/telegram-bot-routes.ts`
6. `packages/api-contracts/src/telegram-bot.ts`
7. `apps/backend/tests/token-cipher.test.ts`
8. `apps/backend/tests/telegram-bot.test.ts`
9. `apps/web/src/district/telegram-bot-client.ts`
10. `apps/web/src/district/useTelegramBot.ts`
11. `apps/web/src/pages/TelegramSetupPage.tsx`
12. `apps/web/tests/e2e/telegram-bot.spec.ts`

#### UPDATE Files:
1. `apps/backend/src/adapters/db/schema/index.ts`: Re-export `districtTelegramBots`.
2. `packages/api-contracts/src/index.ts`: Re-export `telegram-bot.ts`.
3. `apps/backend/src/entrypoints/http.ts`: Register `registerTelegramBotRoutes(server, db)`.
4. `apps/backend/src/modules/districts/districts-readiness.ts`: Query `districtTelegramBots` to evaluate prerequisite 6 (`telegram_bot`), fix action path to `/telegram-setup`.
5. `apps/web/src/App.tsx`: Route `/telegram-setup` pointing to `TelegramSetupPage`.
6. `apps/web/src/components/DistrictOnboardingChecklist.tsx`: Add action button for `telegram_bot` prerequisite.
7. `apps/web/src/pages/placeholders/TelegramSetupPage.tsx`: Delete or replace with main page.

---

### Testing Standards Summary

- **Unit Tests:** Run with Vitest (`pnpm test`). Target 100% coverage on cryptographic token cipher, key normalizers, and token masking.
- **Integration Tests:** Execute against real PostgreSQL instance in Docker. Use isolated transactions or fresh test districts per test suite. Mock Telegram API calls cleanly.
- **Browser E2E Tests:** Execute with Playwright (`pnpm --filter @mahalla-ovozi/web test:e2e`). Test interactive form entry, loading states, validation error alerts, cache invalidation, and checklist updates.

---

## References

- [Source: _bmad-output/planning-artifacts/epics/epic-1.md#Story 1.4: Connect and Validate a District Telegram Bot]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-Mahalla-Ovozi-2026-08-12/ARCHITECTURE-SPINE.md#AD-6, AD-9, AD-10]
- [Source: _bmad-output/planning-artifacts/prd.md#FR20 Prerequisite 6]
- [Source: _bmad-output/implementation-artifacts/1-3-resume-district-onboarding-and-track-activation-readiness.md]

---

## Dev Agent Record

### Agent Model Used

Gemini 3.7 Flash (High)

### Debug Log References

N/A (Specification phase)

### Completion Notes List

- Step 1: Adversarial & Edge-Case Review completed and cross-referenced with live authoritative documentation (`search_web`, `context7`, `antd`).
- Step 2: Story 1.4 specification updated with 5 comprehensive patches (P1: Cipher & Key parsing, P2: URL Redaction & Error sanitization, P3: District status guard, P4: Readiness path & nullable username typings, P5: Domain error mapping matrix).
- Step 3 (Task 1): Cryptographic cipher adapter implemented in `apps/backend/src/adapters/crypto/token-cipher.ts` with AES-256-GCM authenticated encryption/decryption, 12-byte random IVs, 16-byte post-final auth tags, multi-format key parsing (hex, base64, raw 32-byte), and safe regex token masking (`maskBotToken`). 16/16 unit tests passing in `apps/backend/tests/token-cipher.test.ts`.
- Step 4 (Task 2): Database schema defined in `apps/backend/src/adapters/db/schema/district-telegram-bots.ts` with foreign key cascade deletion, 1-bot-per-district unique index, and platform-wide unique `bot_id` index (AC 5). Generated and executed Drizzle migration `drizzle/0003_sticky_wong.sql`. Added 5 schema constraint tests in `apps/backend/tests/db-schema.test.ts` (12/12 passing).
- Step 5 (Task 3): Telegram API client adapter implemented in `apps/backend/src/adapters/telegram/telegram-client.ts` with strict URL and token redaction (`/bot[REDACTED]/getMe`), 5000ms timeout guard, domain error mapping hierarchy, and bot metadata extraction (with nullable username support). 12/12 unit tests passing in `apps/backend/tests/telegram-client.test.ts`.
- Step 6 (Task 4): Shared Zod API contracts authored in `packages/api-contracts/src/telegram-bot.ts` and re-exported from `packages/api-contracts/src/index.ts`. Typecheck passing cleanly across all monorepo packages.
- Step 7 (Task 5): Backend Telegram bot service (`telegram-bot-service.ts`) and Fastify routes (`telegram-bot-routes.ts`) implemented with atomic transactions, status guards (`SETUP_INCOMPLETE`), privacy-safe audit logging (`DISTRICT_TELEGRAM_BOT_CONNECTED`, `DISTRICT_TELEGRAM_BOT_DISCONNECTED`), and full domain error mapping matrix. Routes registered in `apps/backend/src/entrypoints/http.ts`.
- Step 8 (Task 6): District readiness evaluator (`districts-readiness.ts`) updated to query `districtTelegramBots` dynamically, marking prerequisite 6 (`telegram_bot`) as `passed` when attached, and updating action route to `/telegram-setup`.
- Step 9 (Task 7): Comprehensive backend integration tests authored in `apps/backend/tests/telegram-bot.test.ts` (18/18 integration tests passing against real PostgreSQL and mocked Telegram API, verifying encryption, decryption, audit logs, collision rejection, atomic replace, disconnect, and readiness transitions).
- Step 10 (Task 8): Frontend API client (`telegram-bot-client.ts`), React Query hook (`useTelegramBot.ts`), and unit test suite (`useTelegramBot.test.tsx`) created with TanStack Query v5 cache invalidation for both `telegram-bot` and `readiness` queries.
- Step 11 (Task 9): Full Ant Design 5.x `TelegramSetupPage.tsx` implemented with district scoping, offline detection banner, "Not Configured" state with masked input, "Connected / Valid" state with bot metadata & passive receipt notice, replace & disconnect confirmation modals, and 7 unit tests in `TelegramSetupPage.test.tsx`.
- Step 12 (Task 10): In `DistrictOnboardingChecklist.tsx`, added action button navigation to `/telegram-setup` for the `telegram_bot` prerequisite item when `incomplete`, and added unit test verification in `DistrictOnboardingChecklist.test.tsx`.
- Step 13 (Task 11): Created Playwright E2E test suite `apps/web/tests/e2e/telegram-bot.spec.ts` testing full browser journeys (district creation, checklist action button click, token entry & connection, masked card display, checklist transition to passed, bot token replacement, bot disconnection, and checklist rollback to incomplete). Verified 10/10 Playwright tests passing, `pnpm typecheck` 0 errors, and 128/128 unit/integration tests green.

### File List

- `_bmad-output/implementation-artifacts/1-4-connect-and-validate-a-district-telegram-bot.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `apps/backend/src/adapters/crypto/token-cipher.ts`
- `apps/backend/tests/token-cipher.test.ts`
- `apps/backend/src/adapters/db/schema/district-telegram-bots.ts`
- `apps/backend/src/adapters/db/schema/index.ts`
- `apps/backend/drizzle/0003_sticky_wong.sql`
- `apps/backend/drizzle/meta/_journal.json`
- `apps/backend/tests/db-schema.test.ts`
- `apps/backend/src/adapters/telegram/telegram-client.ts`
- `apps/backend/tests/telegram-client.test.ts`
- `packages/api-contracts/src/telegram-bot.ts`
- `packages/api-contracts/src/index.ts`
- `apps/backend/src/modules/telegram-bot/telegram-bot-service.ts`
- `apps/backend/src/modules/telegram-bot/telegram-bot-routes.ts`
- `apps/backend/src/entrypoints/http.ts`
- `apps/backend/src/modules/districts/districts-readiness.ts`
- `apps/backend/tests/telegram-bot.test.ts`
- `apps/web/src/district/telegram-bot-client.ts`
- `apps/web/src/district/useTelegramBot.ts`
- `apps/web/tests/unit/useTelegramBot.test.tsx`
- `apps/web/src/pages/TelegramSetupPage.tsx`
- `apps/web/src/App.tsx`
- `apps/web/tests/unit/TelegramSetupPage.test.tsx`
- `apps/web/src/components/DistrictOnboardingChecklist.tsx`
- `apps/web/tests/unit/DistrictOnboardingChecklist.test.tsx`
- `apps/web/tests/e2e/telegram-bot.spec.ts`
- `apps/web/playwright.config.ts`

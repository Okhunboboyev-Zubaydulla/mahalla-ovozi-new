---
baseline_commit: 6246178a6eb8bcc71adf13748f09f840a60e8439
---

# Story 2.1: Durably Receive Authorized District Telegram Messages

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the **Product Owner**,
I want each activated District's Telegram bot to receive messages only from that District's approved groups and hand authorized intake off durably,
So that downstream signal processing begins from isolated, traceable, retry-safe Telegram input.

---

## Acceptance Criteria

1. **Authoritative Server-Side Multi-Tenant Resolution & Ingress Scope (AC 1)**
   - **Given** a District is `ACTIVE`, its Telegram bot is valid (`status = 'VALID'`), and the source Telegram group has an approved (`status = 'VALID'`) mapping to a Mahalla in that District
   - **When** Telegram delivers a message update through that District's bot to `POST /api/v1/webhooks/telegram/:botId`
   - **Then** the application resolves the `district_id` and `mahalla_name` from authoritative server-side database configuration
   - **And** the intake is explicitly scoped to that District
   - **And** no client- or Telegram-supplied District identifier is trusted as authorization evidence.

2. **Unapproved Group & Cross-District Rejection (AC 2)**
   - **Given** an update arrives through a District bot
   - **When** its source group is not currently approved (`status != 'VALID'`), belongs to another District, or has no valid Mahalla mapping
   - **Then** the message does not enter production processing
   - **And** no AI operation or downstream processing job is created from it
   - **And** its resident message content is not retained as production evidence or routine diagnostic data
   - **And** another District's configuration can never authorize it
   - **And** the webhook returns HTTP `200 OK` (e.g. `{ ok: true, status: 'DROPPED', reason: 'GROUP_NOT_APPROVED' | 'CROSS_DISTRICT_MISMATCH' | 'BOT_NOT_FOUND' }`) to instruct Telegram to drop redelivery attempts.

3. **Inactive District Rejection (AC 3)**
   - **Given** the District is not in `ACTIVE` status (e.g. `SETUP_INCOMPLETE`, `SUSPENDED`, `CANCELLED`) at the time intake is evaluated
   - **When** Telegram delivers an update
   - **Then** production intake and downstream processing do not begin
   - **And** no later worker may bypass that lifecycle decision merely because an earlier job or request existed
   - **And** the webhook returns HTTP `200 OK` (e.g. `{ ok: true, status: 'DROPPED', reason: 'DISTRICT_NOT_ACTIVE' }`) to prevent Telegram retry spam.

4. **Atomic Persistence & `pg-boss` 10.x Durability (`AD-3`) (AC 4)**
   - **Given** an authorized update is eligible for production intake
   - **When** the webhook handler accepts it
   - **Then** the authorized intake record (`telegram_intake_records`) and its required asynchronous processing job are made durable in PostgreSQL / `pg-boss` before Telegram receives a successful acknowledgement
   - **And** persistence and consequential job creation are atomic within a single PostgreSQL transaction (`BEGIN ... COMMIT`)
   - **And** a persistence or enqueue failure rolls back the entire transaction, returns HTTP `500 Internal Server Error`, and cannot be reported as successful durable intake (prompting Telegram retry).

5. **Duplicate Delivery & Redelivery Idempotency (AC 5)**
   - **Given** the same Telegram update or message is delivered more than once because of network retry, Telegram redelivery, or concurrent webhook handling
   - **When** intake is processed repeatedly
   - **Then** all deliveries resolve to one logical intake item and one required downstream business effect
   - **And** duplicate delivery is caught via database uniqueness constraint on `(district_id, telegram_chat_id, telegram_message_id)` using `.onConflictDoNothing().returning()` and job `singletonKey`
   - **And** duplicate delivery resolves to `{ status: 'DUPLICATE' }` and skips consequential job creation
   - **And** incomplete work remains retryable without replaying already-completed intake effects.

6. **Stable `Asia/Tashkent` Day Derivation & Timestamp Preservation (AC 6)**
   - **Given** an authorized message is durably captured for later processing
   - **When** its processing is delayed or retried
   - **Then** the originally received Telegram message identifiers (`telegram_message_id`, `telegram_chat_id`, `update_id`), original Telegram timestamp (`original_timestamp` from `message.date * 1000`), source group, resolved District, and resolved Mahalla remain stable
   - **And** the Uzbekistan calendar day (`calendar_day`, format `YYYY-MM-DD`) used for ordering-sensitive processing is derived from the original Telegram timestamp converted to `Asia/Tashkent` (fixed UTC+5), not from retry or worker execution time.

7. **Ordering-Sensitive Coordination Scope (AC 7)**
   - **Given** multiple authorized messages for the same District, Mahalla, and Uzbekistan calendar day may be received concurrently
   - **When** downstream work is scheduled
   - **Then** ordering-sensitive processing is coordinated using the stable `district_id + mahalla_name + calendar_day` scope via `pg-boss` queue singleton/grouping key
   - **And** source ordering can later be resolved deterministically without depending on worker arrival order
   - **And** unrelated scopes (different Mahallas, Districts, or days) remain free to process concurrently.

8. **Privacy-Safe Telemetry & Secret Token Verification (`AD-9`, `AD-11`) (AC 8)**
   - **Given** intake succeeds, is rejected, duplicated, delayed, or fails durably
   - **When** routine logs, metrics, or traces are emitted
   - **Then** they contain sufficient privacy-safe operational metadata to measure intake count, duplicate handling, persistence failures, and webhook durability latency (`latencyMs`, `districtId`, `mahallaName`, `chatId`, `messageId`, `status`)
   - **And** raw Telegram message text, media captions, bot tokens, AI context, credentials, and other secrets are strictly absent from routine telemetry and audit payloads
   - **And** incoming webhook requests verify `X-Telegram-Bot-Api-Secret-Token` via constant-time SHA-256 digest comparison (`crypto.timingSafeEqual`) in a Fastify `preHandler` hook before processing, returning `401 Unauthorized` if invalid or missing.

9. **Verification Baseline & Latency Target (NFR3) (AC 9)**
   - **Given** Story 2.1 is verified
   - **When** focused automated and integration test suites run against real PostgreSQL
   - **Then** integration tests prove:
     1. Active District + approved group produces durable intake and enqueues `telegram-content-qualification` job.
     2. Inactive District returns `200 OK` dropped without DB intake or job.
     3. Unapproved / unmapped group returns `200 OK` dropped without DB intake or job.
     4. Cross-District group returns `200 OK` dropped without DB intake or job.
     5. Duplicate update delivery resolves idempotently with 0 duplicate jobs.
     6. Transaction failure cleanly rolls back and returns 500.
     7. Original timestamp and `Asia/Tashkent` calendar day are preserved across day boundaries (`23:59:59` vs `00:00:00`).
     8. Non-message update types (e.g. member joins, polls) are cleanly dropped with `200 OK` without runtime crashes.
     9. No AI relevance, Topic assignment, or structural qualification decisions are performed in Story 2.1.
     10. Webhook durability latency is verified against the NFR3 target ($<1\text{s}$ for $\ge 95\%$ of normal/burst traffic).

---

## Tasks / Subtasks

- [x] **Task 1: Drizzle Database Schema & Migration for Telegram Intakes** (AC: 1, 4, 5, 6, 7)
  - [x] 1.1 Create `apps/backend/src/adapters/db/schema/telegram-intakes.ts` defining `telegramIntakeRecords` table:
    - `id`: text primary key (UUID/cuid)
    - `districtId`: text foreign key to `districts.id` (`onDelete: 'cascade'`)
    - `mahallaName`: text not null
    - `telegramBotId`: text not null
    - `telegramChatId`: text not null
    - `telegramMessageId`: text not null
    - `updateId`: text (nullable)
    - `telegramUserId`: text (nullable)
    - `originalTimestamp`: timestamp with timezone not null
    - `calendarDay`: text not null (`YYYY-MM-DD` in `Asia/Tashkent`)
    - `rawPayload`: jsonb not null
    - `createdAt`: timestamp with timezone default now
    - `updatedAt`: timestamp with timezone default now
  - [x] 1.2 Add compound unique index `telegram_intakes_district_chat_msg_idx` on `(district_id, telegram_chat_id, telegram_message_id)`.
  - [x] 1.3 Add query indices:
    - `telegram_intakes_district_day_mahalla_idx` on `(district_id, calendar_day, mahalla_name)`
    - `telegram_intakes_district_created_idx` on `(district_id, created_at)`
  - [x] 1.4 Export schema from `apps/backend/src/adapters/db/schema/index.ts`.
  - [x] 1.5 Generate and apply Drizzle SQL migration `0007_telegram_intake_records.sql`.

- [x] **Task 2: Deterministic Timezone & Telegram Webhook Security Utilities** (AC: 1, 6, 8)
  - [x] 2.1 Create `apps/backend/src/modules/telegram-intake/timezone-util.ts` implementing `getTashkentCalendarDay(unixSeconds: number): string`:
    - Pure UTC+5 offset calculation (`(unixSeconds + 18000) * 1000`)
    - Returns format `YYYY-MM-DD` with zero timezone drift or locale dependencies.
  - [x] 2.2 Create `apps/backend/src/modules/telegram-intake/webhook-security.ts` implementing:
    - `deriveWebhookSecret(botId: string): string` using HMAC-SHA256 of `botId` against master `getEncryptionKey()`.
    - `verifyTelegramSecretToken(incomingHeader: string | string[] | undefined, expectedToken: string): boolean` using SHA-256 digest comparison via `crypto.timingSafeEqual` to avoid length mismatch `RangeError` and timing leakage.
  - [x] 2.3 Add unit tests in `apps/backend/tests/timezone-util.test.ts` and `apps/backend/tests/webhook-security.test.ts` covering day boundary crossings (`23:59:59` vs `00:00:00` Tashkent time) and constant-time secret token validation.

- [x] **Task 3: `pg-boss` 10.x Queue Infrastructure, Initialization & Worker Runtime (`AI-3`)** (AC: 4, 7)
  - [x] 3.1 Add `pg-boss` (`^10.1.4`) to `apps/backend/package.json` dependencies.
  - [x] 3.2 Create `apps/backend/src/adapters/jobs/boss-client.ts`:
    - Define queue constants (`TELEGRAM_CONTENT_QUALIFICATION_QUEUE = 'telegram-content-qualification'`).
    - Create factory `createBossClient(options?: { connectionString?: string, schema?: string }): PgBoss`.
    - Implement `initBossQueues(boss: PgBoss): Promise<void>` calling `await boss.createQueue(TELEGRAM_CONTENT_QUALIFICATION_QUEUE)` to ensure queues are registered in `pgboss.queue` at bootstrap.
    - Implement `withTransactionalIntake<T>(pool: pg.Pool, boss: PgBoss, callback: (scope: TransactionScope) => Promise<T>): Promise<T>` executing Drizzle and `boss.send` on the same `pg.PoolClient` connection within `BEGIN ... COMMIT` with normalized `{ rows: res.rows, rowCount: res.rowCount ?? 0 }` executeSql return.
  - [x] 3.3 Create `apps/backend/src/entrypoints/worker.ts`:
    - Initialize and start `PgBoss` instance, call `initBossQueues(boss)`.
    - Register queue `telegram-content-qualification`.
    - Setup graceful shutdown handlers (`SIGTERM`, `SIGINT`) invoking `boss.stop({ graceful: true, timeout: 30000 })`.
    - Export `startWorker()` and `stopWorker()` for test harnesses.
    - Add `"worker"` script in `apps/backend/package.json`: `"worker": "node --import tsx/esm src/entrypoints/worker.ts"`.

- [x] **Task 4: Telegram Ingress & Multi-Tenant Authorization Service** (AC: 1, 2, 3, 5, 6)
  - [x] 4.1 Create `apps/backend/src/modules/telegram-intake/telegram-intake-service.ts`:
    - `resolveDistrictBotAndGroup(db: DbClient, botId: string, chatId: string)`:
      - Looks up bot by `botId` in `districtTelegramBots` (where `districtTelegramBots.botId = botId`).
      - Verifies associated `districts.status === 'ACTIVE'`.
      - Looks up group in `districtTelegramGroups` matching `districtId` and `telegramChatId`, verifying `status === 'VALID'`.
      - Returns authorization decision `{ authorized: true, districtId, mahallaName, botId }` or `{ authorized: false, reason: 'BOT_NOT_FOUND' | 'DISTRICT_NOT_ACTIVE' | 'GROUP_NOT_APPROVED' | 'CROSS_DISTRICT_MISMATCH' }`.
    - `processTelegramWebhookUpdate(pool: pg.Pool, boss: PgBoss, botId: string, update: TelegramUpdate)`:
      - Structural Guard: if `!update?.message?.chat?.id || !update?.message?.message_id`, returns `{ status: 'DROPPED', reason: 'UNSUPPORTED_UPDATE_TYPE' }`.
      - Evaluates authorization decision. If unauthorized, returns `{ status: 'DROPPED', reason }`.
      - If authorized, invokes `withTransactionalIntake`:
        - Inserts into `telegramIntakeRecords` using `.onConflictDoNothing().returning()`.
        - If conflict occurred (`!record`), returns `{ status: 'DUPLICATE', intakeId: null, jobId: null }` (skips job enqueue).
        - If inserted, enqueues `telegram-content-qualification` job with `singletonKey: "msg:${districtId}:${chatId}:${messageId}"`, `retryLimit: 3`, `retryDelay: 5`, `retryBackoff: true`.
        - Returns `{ status: 'ACCEPTED', intakeId: record.id, jobId }`.

- [x] **Task 5: Fastify Telegram Webhook Route & Status Code Policy** (AC: 1, 2, 3, 4, 8)
  - [x] 5.1 Create `apps/backend/src/modules/telegram-intake/telegram-intake-routes.ts`:
    - Register `POST /api/v1/webhooks/telegram/:botId`.
    - Fastify `preHandler` hook verifies `x-telegram-bot-api-secret-token` against `deriveWebhookSecret(botId)`. If invalid/missing, respond `401 Unauthorized` immediately.
    - Call `processTelegramWebhookUpdate`.
    - If status is `ACCEPTED`, `DROPPED`, or `DUPLICATE`: respond HTTP `200 OK` with `{ ok: true, status, ... }`.
    - If transaction/database fails unexpectedly: log sanitized error and respond HTTP `500 Internal Server Error` (prompting Telegram retry).
  - [x] 5.2 Implement privacy-safe structured logging:
    - Log `{ event: 'TELEGRAM_INTAKE', botId, districtId, mahallaName, chatId, messageId, status, durationMs }`.
    - Strictly ensure raw text/captions and bot tokens are excluded from logs.
  - [x] 5.3 Register `registerTelegramIntakeRoutes(server, { db, pool, boss })` in `apps/backend/src/entrypoints/http.ts` and ensure `initBossQueues(boss)` runs on server start.

- [x] **Task 6: Comprehensive Vitest Integration & Durability Test Matrix** (AC: 9)
  - [x] 6.1 Create `apps/backend/tests/telegram-intake.test.ts` testing against real PostgreSQL:
    - **Test 1 (Happy Path):** Active District + valid bot + approved group &rarr; inserts intake record, enqueues pg-boss job, returns 200 OK.
    - **Test 2 (Inactive District):** District in `SETUP_INCOMPLETE` or `SUSPENDED` &rarr; returns 200 OK `{ ok: true, status: 'DROPPED', reason: 'DISTRICT_NOT_ACTIVE' }`, 0 DB records, 0 jobs.
    - **Test 3 (Unapproved Group):** Group in `PENDING` or `FAILED` &rarr; returns 200 OK `{ ok: true, status: 'DROPPED', reason: 'GROUP_NOT_APPROVED' }`, 0 DB records, 0 jobs.
    - **Test 4 (Cross-District Group):** Group belongs to District B, update sent to District A bot &rarr; returns 200 OK `{ ok: true, status: 'DROPPED', reason: 'CROSS_DISTRICT_MISMATCH' }`.
    - **Test 5 (Duplicate Update / Redelivery):** Delivering same `chat_id` + `message_id` twice &rarr; first returns `ACCEPTED`, second returns `DUPLICATE`, exactly 1 intake record in DB, 1 job in queue.
    - **Test 6 (Atomic Rollback):** Simulated enqueue error inside transaction &rarr; rolls back DB insert, returns 500, 0 orphan records.
    - **Test 7 (Tashkent Day Preservation):** Messages sent at UTC `18:59:59` vs `19:00:00` derive `YYYY-MM-DD` and `YYYY-MM-(DD+1)` calendar days respectively.
    - **Test 8 (Unsupported Update Type Guard):** Non-message update (e.g. `{ update_id: 123, my_chat_member: { ... } }`) returns `200 OK` `{ ok: true, status: 'DROPPED', reason: 'UNSUPPORTED_UPDATE_TYPE' }` with 0 DB records and 0 jobs.
    - **Test 9 (Secret Token Verification):** Valid secret token allows request; missing or invalid header returns 401 Unauthorized.
    - **Test 10 (Privacy Guard):** Assert no message text, media captions, or tokens appear in structured logger calls.
    - **Test 11 (NFR3 Latency Benchmark):** Durability response latency under normal load is $< 100\text{ms}$ (well within the $< 1000\text{ms}$ NFR3 target).

---

## Dev Notes

### Architecture Compliance

- **`AD-3` (PostgreSQL System of Record & pg-boss Durability):**
  - PostgreSQL is the sole system of record.
  - A Telegram update is acknowledged as successful (`200 OK`) **only after** the intake record and pg-boss job are committed in PostgreSQL.
  - `withTransactionalIntake` bridges Drizzle and `pg-boss` using `options.db` so both execute on the same client connection in `BEGIN ... COMMIT`.
- **`AD-9` (Multi-Tenant Isolation & Explicit District Scope):**
  - District identity is resolved authoritatively from the database based on the verified bot and registered group mapping. Client/Telegram-supplied IDs are never trusted.
  - Every `telegram_intake_records` row explicitly carries `district_id` with foreign key constraint.
- **`AD-11` (Privacy-Safe Telemetry & Single Host Architecture):**
  - Raw message content, captions, bot tokens, and user credentials must never be passed to `console.log`, audit events, or telemetry traces.
  - Operational logs emit only sanitized numeric/string IDs and latency metadata.
- **NFR3 (Durability Latency):**
  - Target: Webhook processing and durable persistence commit in $< 1\text{s}$ for $\ge 95\%$ of requests.

---

### Epic 1 Retrospective Action Items Applied

- **`AI-1` (PostgreSQL `23505` Constraint Handling):**
  - Duplicate intake collisions are captured cleanly via `onConflictDoNothing().returning()`, returning an empty array and resolving as `{ status: 'DUPLICATE' }` without throwing unhandled exceptions or aborting the active transaction block.
- **`AI-2` (Explicit Timestamp Maintenance):**
  - `updatedAt: new Date()` is included explicitly in all Drizzle update operations.
- **`AI-3` (`pg-boss` 10.x Queue Setup & Initialization):**
  - `apps/backend/src/adapters/jobs/boss-client.ts` exposes `initBossQueues` to pre-create required queues in `pgboss.queue`.
  - `apps/backend/src/entrypoints/worker.ts` initialized with graceful shutdown and typed queue registration.

---

### Core TypeScript Patterns & Code Snippets

#### 1. Drizzle Schema (`telegram-intakes.ts`)
```typescript
import { sql } from 'drizzle-orm';
import { pgTable, text, timestamp, jsonb, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { districts } from './districts.js';

export const telegramIntakeRecords = pgTable(
  'telegram_intake_records',
  {
    id: text('id').primaryKey(),
    districtId: text('district_id')
      .notNull()
      .references(() => districts.id, { onDelete: 'cascade' }),
    mahallaName: text('mahalla_name').notNull(),
    telegramBotId: text('telegram_bot_id').notNull(),
    telegramChatId: text('telegram_chat_id').notNull(),
    telegramMessageId: text('telegram_message_id').notNull(),
    updateId: text('update_id'),
    telegramUserId: text('telegram_user_id'),
    originalTimestamp: timestamp('original_timestamp', { withTimezone: true }).notNull(),
    calendarDay: text('calendar_day').notNull(), // 'YYYY-MM-DD' in Asia/Tashkent
    rawPayload: jsonb('raw_payload').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Deduplication constraint: exactly 1 record per district + chat + message
    uniqueIndex('telegram_intakes_district_chat_msg_idx').on(
      table.districtId,
      table.telegramChatId,
      table.telegramMessageId,
    ),
    // Scoped query index for topic clustering & daily snapshot assembly
    index('telegram_intakes_district_day_mahalla_idx').on(
      table.districtId,
      table.calendarDay,
      table.mahallaName,
    ),
    // Query index for district chronological lookups
    index('telegram_intakes_district_created_idx').on(
      table.districtId,
      table.createdAt,
    ),
  ],
);

export type TelegramIntakeRecord = typeof telegramIntakeRecords.$inferSelect;
export type NewTelegramIntakeRecord = typeof telegramIntakeRecords.$inferInsert;
```

#### 2. `withTransactionalIntake` & Queue Initialization (`boss-client.ts`)
```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import type pg from 'pg';
import type PgBoss from 'pg-boss';
import * as schema from '../db/schema/index.js';

export const TELEGRAM_CONTENT_QUALIFICATION_QUEUE = 'telegram-content-qualification';

export async function initBossQueues(boss: PgBoss): Promise<void> {
  await boss.createQueue(TELEGRAM_CONTENT_QUALIFICATION_QUEUE);
}

export interface TransactionScope {
  tx: ReturnType<typeof drizzle<typeof schema>>;
  client: pg.PoolClient;
  enqueueJob: <T extends object>(
    queueName: string,
    data: T,
    options?: Omit<PgBoss.SendOptions, 'db'>,
  ) => Promise<string | null>;
}

export async function withTransactionalIntake<T>(
  pool: pg.Pool,
  boss: PgBoss,
  callback: (scope: TransactionScope) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const tx = drizzle(client, { schema });

    const enqueueJob = async <J extends object>(
      queueName: string,
      data: J,
      options?: Omit<PgBoss.SendOptions, 'db'>,
    ): Promise<string | null> => {
      return boss.send(queueName, data, {
        ...options,
        db: {
          executeSql: async (text: string, values?: any[]) => {
            const res = await client.query(text, values);
            return { rows: res.rows, rowCount: res.rowCount ?? 0 };
          },
        },
      });
    };

    const result = await callback({ tx, client, enqueueJob });
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // rollback error suppressed
    }
    throw error;
  } finally {
    client.release();
  }
}
```

#### 3. Deterministic `Asia/Tashkent` Day Derivation (`timezone-util.ts`)
```typescript
const TASHKENT_OFFSET_SECONDS = 5 * 3600; // +05:00 (18,000s)

export function getTashkentCalendarDay(unixSeconds: number): string {
  const adjustedDate = new Date((unixSeconds + TASHKENT_OFFSET_SECONDS) * 1000);
  const year = adjustedDate.getUTCFullYear();
  const month = String(adjustedDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(adjustedDate.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
```

#### 4. Constant-Time Webhook Secret Verification (`webhook-security.ts`)
```typescript
import crypto from 'node:crypto';
import { getEncryptionKey } from '../../adapters/crypto/token-cipher.js';

export function deriveWebhookSecret(botId: string): string {
  const key = getEncryptionKey();
  return crypto.createHmac('sha256', key).update(botId).digest('hex');
}

export function verifyTelegramSecretToken(
  incomingHeader: string | string[] | undefined,
  expectedSecret: string,
): boolean {
  if (!incomingHeader) {
    return false;
  }
  const token = Array.isArray(incomingHeader) ? incomingHeader[0] : incomingHeader;
  if (!token || typeof token !== 'string') {
    return false;
  }

  const expectedHash = crypto.createHash('sha256').update(expectedSecret).digest();
  const receivedHash = crypto.createHash('sha256').update(token).digest();

  return crypto.timingSafeEqual(expectedHash, receivedHash);
}
```

---

### Project Structure Notes

#### Files to Create:
- `apps/backend/src/adapters/db/schema/telegram-intakes.ts` — Drizzle schema for raw Telegram intakes
- `apps/backend/src/adapters/db/migrations/0007_telegram_intake_records.sql` — SQL migration
- `apps/backend/src/adapters/jobs/boss-client.ts` — `pg-boss` factory, queue init & `withTransactionalIntake`
- `apps/backend/src/entrypoints/worker.ts` — Asynchronous background worker runtime
- `apps/backend/src/modules/telegram-intake/telegram-intake-service.ts` — Intake domain service
- `apps/backend/src/modules/telegram-intake/telegram-intake-routes.ts` — Fastify webhook route handler
- `apps/backend/src/modules/telegram-intake/timezone-util.ts` — Deterministic `Asia/Tashkent` date calculator
- `apps/backend/src/modules/telegram-intake/webhook-security.ts` — Timing-safe webhook secret verification
- `apps/backend/tests/telegram-intake.test.ts` — Full integration test suite
- `apps/backend/tests/timezone-util.test.ts` — Timezone unit tests
- `apps/backend/tests/webhook-security.test.ts` — Secret token verification unit tests

#### Files to Modify:
- `apps/backend/src/adapters/db/schema/index.ts` — Export `telegramIntakeRecords`
- `apps/backend/src/entrypoints/http.ts` — Register Telegram webhook routes & initialize boss queues
- `apps/backend/package.json` — Add `pg-boss` dependency and `"worker"` script

---

### References
- [Epic 2 Spec](file:///_bmad-output/planning-artifacts/epics/epic-2.md#Story-2.1)
- [Architecture Spine](file:///_bmad-output/planning-artifacts/architecture/architecture-Mahalla-Ovozi-2026-08-12/ARCHITECTURE-SPINE.md#AD-3)
- [Epic 1 Retrospective](file:///_bmad-output/implementation-artifacts/epic-1-retrospective.md)
- [Fastify Webhook Best Practices](file:///.agents/skills/fastify-best-practices/SKILL.md)

---

## Dev Agent Record

### Agent Model Used
Gemini 3.7 Flash (High)

### Debug Log References
- Implementation transcript: `file:///C:/Users/Zubaydulla/.gemini/antigravity/brain/e5affb50-5926-46b0-a97a-25ae17d55eef/.system_generated/logs/transcript.jsonl`

### Completion Notes List
- Task 1: Implemented `telegram_intake_records` Drizzle table with unique index `(district_id, telegram_chat_id, telegram_message_id)`, query indices, and applied migration `0007_common_bromley.sql`.
- Task 2: Implemented deterministic `getTashkentCalendarDay` (UTC+5 arithmetic) and constant-time SHA-256 `verifyTelegramSecretToken` with 12 passing unit tests covering boundary conditions.
- Task 3: Configured `pg-boss` 10.4.2 client with `initBossQueues`, `withTransactionalIntake` (executing Drizzle and pg-boss on a single `pg.PoolClient` in `BEGIN ... COMMIT`), and asynchronous `worker.ts` runtime.
- Task 4: Implemented `telegram-intake-service.ts` with authoritative tenant resolution, structural update guards, and atomic `.onConflictDoNothing().returning()` deduplication.
- Task 5: Implemented Fastify route `POST /api/v1/webhooks/telegram/:botId` with 401 secret verification in `preHandler`, privacy-safe structured logging, and correct HTTP status code policy (200 for accepted/dropped/duplicate, 500 for transient persistence errors).
- Task 6: Authored and verified full 11-test Vitest integration test suite covering all acceptance criteria with 100% pass rate and $< 100\text{ms}$ durability latency. Monorepo regression baseline clean with 37 test suites (275 tests) passing.

### File List
- `apps/backend/src/adapters/db/schema/telegram-intakes.ts` (new)
- `apps/backend/src/adapters/db/schema/index.ts` (modified)
- `apps/backend/drizzle/0007_common_bromley.sql` (new)
- `apps/backend/src/modules/telegram-intake/timezone-util.ts` (new)
- `apps/backend/src/modules/telegram-intake/webhook-security.ts` (new)
- `apps/backend/src/adapters/jobs/boss-client.ts` (new)
- `apps/backend/src/entrypoints/worker.ts` (new)
- `apps/backend/src/modules/telegram-intake/telegram-intake-service.ts` (new)
- `apps/backend/src/modules/telegram-intake/telegram-intake-routes.ts` (new)
- `apps/backend/src/modules/auth/origin-guard.ts` (modified)
- `apps/backend/src/entrypoints/http.ts` (modified)
- `apps/backend/package.json` (modified)
- `apps/backend/tests/timezone-util.test.ts` (new)
- `apps/backend/tests/webhook-security.test.ts` (new)
- `apps/backend/tests/telegram-intake.test.ts` (new)
- `_bmad-output/implementation-artifacts/2-1-durably-receive-authorized-district-telegram-messages.md` (modified)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified)


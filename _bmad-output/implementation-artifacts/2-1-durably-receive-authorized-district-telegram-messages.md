---
baseline_commit: 6246178a6eb8bcc71adf13748f09f840a60e8439
---

# Story 2.1: Durably Receive Authorized District Telegram Messages

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the **Product Owner**,
I want each activated District's Telegram bot to receive messages only from that District's approved groups and hand authorized intake off durably,
So that downstream signal processing begins from isolated, traceable, retry-safe Telegram input.

---

## Acceptance Criteria

1. **Authoritative Server-Side Multi-Tenant Resolution & Ingress Scope (AC 1)**
   - **Given** a District is `ACTIVE`, its Telegram bot is valid, and the source Telegram group has an approved (`status = 'VALID'`) mapping to a Mahalla in that District
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
   - **And** the webhook returns HTTP `200 OK` (e.g. `{ ok: true, dropped: true, reason: 'GROUP_NOT_APPROVED' }`) to instruct Telegram to drop redelivery attempts.

3. **Inactive District Rejection (AC 3)**
   - **Given** the District is not in `ACTIVE` status (e.g. `SETUP_INCOMPLETE`, `SUSPENDED`, `CANCELLED`) at the time intake is evaluated
   - **When** Telegram delivers an update
   - **Then** production intake and downstream processing do not begin
   - **And** no later worker may bypass that lifecycle decision merely because an earlier job or request existed
   - **And** the webhook returns HTTP `200 OK` (e.g. `{ ok: true, dropped: true, reason: 'DISTRICT_NOT_ACTIVE' }`) to prevent Telegram retry spam.

4. **Atomic Persistence & `pg-boss` 10.x Durability (`AD-3`) (AC 4)**
   - **Given** an authorized update is eligible for production intake
   - **When** the webhook handler accepts it
   - **Then** the authorized intake record (`telegram_intake_records`) and its required asynchronous processing job are made durable in PostgreSQL / `pg-boss` before Telegram receives a successful acknowledgement
   - **And** persistence and consequential job creation are atomic within a single PostgreSQL transaction (`BEGIN ... COMMIT`)
   - **And** a persistence or enqueue failure rolls back the entire transaction, returns HTTP `500 Internal Error`, and cannot be reported as successful durable intake (prompting Telegram retry).

5. **Duplicate Delivery & Redelivery Idempotency (AC 5)**
   - **Given** the same Telegram update or message is delivered more than once because of network retry, Telegram redelivery, or concurrent webhook handling
   - **When** intake is processed repeatedly
   - **Then** all deliveries resolve to one logical intake item and one required downstream business effect
   - **And** duplicate delivery is caught via database uniqueness constraint on `(district_id, telegram_chat_id, telegram_message_id)` (`onConflictDoNothing()`) and job `singletonKey`
   - **And** duplicate delivery cannot create duplicate retained candidate state or duplicate consequential processing
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
   - **Then** they contain sufficient privacy-safe operational metadata to measure intake count, duplicate handling, persistence failures, and webhook durability latency (`latencyMs`, `districtId`, `mahallaName`, `chatId`, `messageId`)
   - **And** raw Telegram message text, media captions, bot tokens, AI context, credentials, and other secrets are strictly absent from routine telemetry and audit payloads
   - **And** incoming webhook requests verify `X-Telegram-Bot-Api-Secret-Token` via constant-time comparison (`crypto.timingSafeEqual` over SHA-256 digests) before processing.

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
     7. Original timestamp and `Asia/Tashkent` calendar day are preserved across day boundaries.
     8. No AI relevance, Topic assignment, or structural qualification decisions are performed in Story 2.1.
     9. Webhook durability latency is verified against the NFR3 target ($<1\text{s}$ for $\ge 95\%$ of normal/burst traffic).

---

## Tasks / Subtasks

- [ ] **Task 1: Drizzle Database Schema & Migration for Telegram Intakes** (AC: 1, 4, 5, 6)
  - [ ] 1.1 Create `apps/backend/src/adapters/db/schema/telegram-intakes.ts` defining `telegramIntakeRecords` table:
    - `id`: text primary key (UUID/cuid)
    - `districtId`: text foreign key to `districts.id` (`onDelete: 'cascade'`)
    - `mahallaName`: text not null
    - `telegramBotId`: text not null
    - `telegramChatId`: text not null
    - `telegramMessageId`: text not null
    - `updateId`: text (nullable or string representation of Telegram update_id)
    - `telegramUserId`: text (nullable)
    - `originalTimestamp`: timestamp with timezone not null
    - `calendarDay`: text not null (`YYYY-MM-DD` in `Asia/Tashkent`)
    - `rawPayload`: jsonb not null
    - `createdAt`: timestamp with timezone default now
    - `updatedAt`: timestamp with timezone default now
  - [ ] 1.2 Add compound unique index `telegram_intakes_district_chat_msg_idx` on `(district_id, telegram_chat_id, telegram_message_id)`.
  - [ ] 1.3 Add query indices on `(district_id, calendar_day, mahalla_name)` and `(district_id, created_at)`.
  - [ ] 1.4 Export schema from `apps/backend/src/adapters/db/schema/index.ts`.
  - [ ] 1.5 Generate and apply Drizzle SQL migration `0007_telegram_intake_records.sql`.

- [ ] **Task 2: Deterministic Timezone & Telegram Webhook Security Utilities** (AC: 1, 6, 8)
  - [ ] 2.1 Create `apps/backend/src/modules/telegram-intake/timezone-util.ts` implementing `getTashkentCalendarDay(unixSeconds: number): string`:
    - Pure UTC+5 offset calculation (`(unixSeconds + 18000) * 1000`)
    - Returns format `YYYY-MM-DD` with zero timezone drift or locale dependencies.
  - [ ] 2.2 Create `apps/backend/src/modules/telegram-intake/webhook-security.ts` implementing:
    - `verifyTelegramSecretToken(incomingHeader: string | undefined, expectedToken: string): boolean` using SHA-256 digest comparison via `crypto.timingSafeEqual`.
    - `deriveWebhookSecret(botId: string): string` using HMAC-SHA256 of `botId` against `ENCRYPTION_KEY`.
  - [ ] 2.3 Add unit tests in `apps/backend/tests/timezone-util.test.ts` and `apps/backend/tests/webhook-security.test.ts` covering day boundary crossings (`23:59:59` vs `00:00:00` Tashkent time) and timing-safe token validation.

- [ ] **Task 3: `pg-boss` 10.x Queue Infrastructure & Worker Runtime (`AI-3`)** (AC: 4, 7)
  - [ ] 3.1 Add `pg-boss` (`^10.1.4` or latest 10.x) to `apps/backend/package.json` dependencies.
  - [ ] 3.2 Create `apps/backend/src/adapters/jobs/boss-client.ts`:
    - Define queue names constant (e.g. `TELEGRAM_CONTENT_QUALIFICATION_QUEUE = 'telegram-content-qualification'`).
    - Create factory `createBossClient(options?: { connectionString?: string, schema?: string }): PgBoss`.
    - Implement `withTransactionalIntake<T>(pool: pg.Pool, boss: PgBoss, callback: (scope: TransactionScope) => Promise<T>): Promise<T>` executing Drizzle and `boss.send` on the same `pg.PoolClient` connection within `BEGIN ... COMMIT`.
  - [ ] 3.3 Create `apps/backend/src/entrypoints/worker.ts`:
    - Initialize and start `PgBoss` instance.
    - Register queue `telegram-content-qualification`.
    - Setup graceful shutdown handlers (`SIGTERM`, `SIGINT`) invoking `boss.stop({ graceful: true, timeout: 30000 })`.
    - Add `"worker"` script in `apps/backend/package.json`: `"worker": "node --import tsx/esm src/entrypoints/worker.ts"`.

- [ ] **Task 4: Telegram Ingress & Multi-Tenant Authorization Service** (AC: 1, 2, 3, 5, 6)
  - [ ] 4.1 Create `apps/backend/src/modules/telegram-intake/telegram-intake-service.ts`:
    - `resolveDistrictBotAndGroup(db: DbClient, botId: string, chatId: string)`:
      - Looks up bot by `botId` in `districtTelegramBots`.
      - Verifies associated `districts.status === 'ACTIVE'`.
      - Looks up group in `districtTelegramGroups` matching `districtId` and `telegramChatId`, verifying `status === 'VALID'`.
      - Returns authorization decision `{ authorized: true, districtId, mahallaName, botId }` or `{ authorized: false, reason: 'BOT_NOT_FOUND' | 'DISTRICT_NOT_ACTIVE' | 'GROUP_NOT_APPROVED' | 'CROSS_DISTRICT_MISMATCH' }`.
    - `processTelegramWebhookUpdate(pool: pg.Pool, boss: PgBoss, botId: string, update: TelegramUpdate)`:
      - Validates update structure (extracts `message_id`, `chat.id`, `date`, `update_id`).
      - Evaluates authorization decision. If unauthorized, returns `{ status: 'DROPPED', reason }`.
      - If authorized, invokes `withTransactionalIntake`:
        - Inserts into `telegramIntakeRecords` using `.onConflictDoNothing()`.
        - If conflict occurred (duplicate delivery), returns `{ status: 'DUPLICATE', intakeId: null }`.
        - If inserted, enqueues `telegram-content-qualification` job with `singletonKey: "msg:${districtId}:${chatId}:${messageId}"`, `retryLimit: 3`, `retryDelay: 5`, `retryBackoff: true`.
        - Returns `{ status: 'ACCEPTED', intakeId, jobId }`.

- [ ] **Task 5: Fastify Telegram Webhook Route & Status Code Policy** (AC: 1, 2, 3, 4, 8)
  - [ ] 5.1 Create `apps/backend/src/modules/telegram-intake/telegram-intake-routes.ts`:
    - Register `POST /api/v1/webhooks/telegram/:botId`.
    - Verify `X-Telegram-Bot-Api-Secret-Token` header. If invalid/missing, respond `401 Unauthorized`.
    - Call `processTelegramWebhookUpdate`.
    - If status is `ACCEPTED`, `DROPPED`, or `DUPLICATE`: respond HTTP `200 OK` with `{ ok: true, status, ... }`.
    - If transaction/database fails unexpectedly: log error and respond HTTP `500 Internal Error` (prompting Telegram retry).
  - [ ] 5.2 Implement privacy-safe structured logging:
    - Log `{ event: 'TELEGRAM_INTAKE', botId, districtId, mahallaName, chatId, messageId, status, durationMs }`.
    - Strictly ensure raw text/captions and bot tokens are excluded from logs.
  - [ ] 5.3 Register `registerTelegramIntakeRoutes(server, { db, pool, boss })` in `apps/backend/src/entrypoints/http.ts`.

- [ ] **Task 6: Comprehensive Vitest Integration & Durability Test Matrix** (AC: 9)
  - [ ] 6.1 Create `apps/backend/tests/telegram-intake.test.ts` testing against real PostgreSQL:
    - **Test 1 (Happy Path):** Active District + valid bot + approved group &rarr; inserts intake record, enqueues pg-boss job, returns 200 OK.
    - **Test 2 (Inactive District):** District in `SETUP_INCOMPLETE` or `SUSPENDED` &rarr; returns 200 OK `{ ok: true, status: 'DROPPED', reason: 'DISTRICT_NOT_ACTIVE' }`, 0 DB records, 0 jobs.
    - **Test 3 (Unapproved Group):** Group in `PENDING` or `FAILED` &rarr; returns 200 OK `{ ok: true, status: 'DROPPED', reason: 'GROUP_NOT_APPROVED' }`, 0 DB records, 0 jobs.
    - **Test 4 (Cross-District Group):** Group belongs to District B, update sent to District A bot &rarr; returns 200 OK `{ ok: true, status: 'DROPPED' }`.
    - **Test 5 (Duplicate Update / Redelivery):** Delivering same `chat_id` + `message_id` twice &rarr; first returns `ACCEPTED`, second returns `DUPLICATE`, exactly 1 intake record in DB, 1 job in queue.
    - **Test 6 (Atomic Rollback):** Simulated enqueue error inside transaction &rarr; rolls back DB insert, returns 500, 0 orphan records.
    - **Test 7 (Tashkent Day Preservation):** Messages sent at UTC `18:59:59` vs `19:00:00` derive `YYYY-MM-DD` and `YYYY-MM-(DD+1)` calendar days respectively.
    - **Test 8 (Privacy Guard):** Assert no message text or tokens appear in structured logger calls.
    - **Test 9 (NFR3 Latency Benchmark):** Durability response latency under normal load is $< 100\text{ms}$ (well within the $< 1000\text{ms}$ NFR3 target).

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
  - Duplicate intake collisions are captured via `onConflictDoNothing()` or caught and handled cleanly as idempotent responses without uncaught 500 crashes.
- **`AI-2` (Explicit Timestamp Maintenance):**
  - `updatedAt: new Date()` is included explicitly in all Drizzle update operations.
- **`AI-3` (`pg-boss` 10.x Queue Setup):**
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
    // Scoped query index for topic clustering
    index('telegram_intakes_district_day_mahalla_idx').on(
      table.districtId,
      table.calendarDay,
      table.mahallaName,
    ),
  ],
);

export type TelegramIntakeRecord = typeof telegramIntakeRecords.$inferSelect;
export type NewTelegramIntakeRecord = typeof telegramIntakeRecords.$inferInsert;
```

#### 2. `withTransactionalIntake` Implementation (`boss-client.ts`)
```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import type pg from 'pg';
import type PgBoss from 'pg-boss';
import * as schema from '../db/schema/index.js';

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
            return client.query(text, values);
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

---

### Project Structure Notes

#### Files to Create:
- `apps/backend/src/adapters/db/schema/telegram-intakes.ts` — Drizzle schema for raw Telegram intakes
- `apps/backend/src/adapters/db/migrations/0007_telegram_intake_records.sql` — SQL migration
- `apps/backend/src/adapters/jobs/boss-client.ts` — `pg-boss` factory & `withTransactionalIntake`
- `apps/backend/src/entrypoints/worker.ts` — Asynchronous background worker runtime
- `apps/backend/src/modules/telegram-intake/telegram-intake-service.ts` — Intake domain service
- `apps/backend/src/modules/telegram-intake/telegram-intake-routes.ts` — Fastify webhook route handler
- `apps/backend/src/modules/telegram-intake/timezone-util.ts` — Deterministic `Asia/Tashkent` date calculator
- `apps/backend/src/modules/telegram-intake/webhook-security.ts` — Timing-safe webhook secret verification
- `apps/backend/tests/telegram-intake.test.ts` — Full integration test suite
- `apps/backend/tests/timezone-util.test.ts` — Timezone unit tests

#### Files to Modify:
- `apps/backend/src/adapters/db/schema/index.ts` — Export `telegramIntakeRecords`
- `apps/backend/src/entrypoints/http.ts` — Register Telegram webhook routes
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
- Research transcript: `file:///C:/Users/Zubaydulla/.gemini/antigravity/brain/a9f8ea42-6940-4471-ba79-dbefb0741791/.system_generated/logs/transcript.jsonl`

### Completion Notes List
- Comprehensive Story 2.1 implementation specification formulated.
- Covers authoritative multi-tenant resolution, Drizzle table schema, `pg-boss` 10.x transactional intake, Fastify webhook routing with secret token verification, `Asia/Tashkent` timezone derivation, and Vitest test matrix.

### File List
- `_bmad-output/implementation-artifacts/2-1-durably-receive-authorized-district-telegram-messages.md`

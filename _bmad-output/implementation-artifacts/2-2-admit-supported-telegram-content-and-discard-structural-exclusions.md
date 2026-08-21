---
baseline_commit: 338e75c8be8fd1b3f9d69511ed9e6e14bd6e3dd6
---

# Story 2.2: Admit Supported Telegram Content and Discard Structural Exclusions

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the **Product Owner**,
I want authorized Telegram intake to admit only supported human text or textual captions and discard structurally unsupported content before AI,
So that AI analysis receives only valid candidate content and excluded Telegram content is not retained for later reassessment.

---

## Acceptance Criteria

1. **Supported Human Text Message Admission (AC 1)**
   - **Given** an authorized intake item from Story 2.1 contains a human-authored text message (`message.text` is a non-empty string after whitespace trimming)
   - **When** structural content qualification runs
   - **Then** its original text is admitted as a supported candidate (`status = 'SUPPORTED'`, `contentType = 'TEXT'`) for subsequent semantic analysis
   - **And** its original Telegram timestamp (`originalTimestamp`), message identifiers (`telegramMessageId`, `telegramChatId`, `updateId`), `districtId`, `mahallaName`, source group, and required message relationship metadata remain associated with the candidate
   - **And** the text is preserved verbatim without translation, normalization, summarization, or rewriting, keeping its original language, script, and line structure.

2. **Supported Media with Non-Empty Textual Caption Admission (AC 2)**
   - **Given** an authorized Telegram message contains media (`photo`, `video`, `document`, `animation`, `audio`, `voice`, `paid_media`) with a non-empty textual caption (`message.caption` is a non-empty string after whitespace trimming)
   - **When** structural content qualification runs
   - **Then** the textual caption is admitted as the candidate content (`status = 'SUPPORTED'`, `contentType = 'MEDIA_CAPTION'`)
   - **And** the caption remains verbatim in its original language, script, and line structure
   - **And** media binary bytes, OCR output, audio transcription, document file contents, and other attachment payloads are **not** downloaded or introduced into AI context.

3. **Structural Exclusion of Commands, Bots, Empty Content & Captionless Media (AC 3)**
   - **Given** an authorized Telegram message contains a command (`message.text` or `message.caption` starts with `/` or has entity of type `bot_command` at offset 0 in `entities` or `caption_entities`), bot-authored message (`from.is_bot === true` or `via_bot` is present), empty content (empty string or whitespace-only), captionless media (`photo`, `video`, `document`, `audio`, `voice`, `paid_media` without a non-empty caption), unsupported media (`sticker`, `video_note`, `poll`, `dice`, `game`, `story`, `giveaway`, `contact`, `location`, `venue`), or service message (`new_chat_members`, `left_chat_member`, `pinned_message`, `forum_topic_*`, `migrate_*`, `video_chat_*`, etc.)
   - **When** structural content qualification runs
   - **Then** it is excluded (`status = 'EXCLUDED'`) before any AI operation is created or invoked
   - **And** it cannot become Accepted Evidence or seed/update a Topic
   - **And** no downstream `telegram-semantic-relevance` job is enqueued
   - **And** its raw resident content is discarded after the structural outcome is completed without retaining message text/captions for future production reassessment.

4. **Strict Structural Exclusion of Telegram Forwarded Messages (AC 4)**
   - **Given** Telegram marks a message as forwarded using modern Bot API 7.0+ `forward_origin` (`MessageOriginUser`, `MessageOriginHiddenUser`, `MessageOriginChat`, `MessageOriginChannel`), `is_automatic_forward === true`, or legacy forward fields (`forward_date`, `forward_from`, `forward_from_chat`, `forward_from_message_id`, `forward_sender_name`, `forward_signature`)
   - **When** structural content qualification evaluates it
   - **Then** the message is excluded (`status = 'EXCLUDED'`, `reason = 'FORWARDED_MESSAGE'`) before AI regardless of the apparent meaning of its text or caption
   - **And** configured vocabulary, keywords, or district leadership names cannot override the exclusion
   - **And** the forwarded message content is not retained for future production reassessment.

5. **Non-Forwarded Replies to Forwarded Parents (AC 5)**
   - **Given** a non-forwarded message directly replies to a Telegram-marked forwarded message (`message.reply_to_message` contains forward metadata)
   - **When** the reply itself contains structurally supported human text or a textual caption
   - **Then** the reply is admitted as its own candidate for later semantic analysis with `replyMetadata` containing `replyToMessageId`, `replyToUserId`, `replyToIsForwarded: true`, and `replyToIsBot: boolean`
   - **And** the forwarded parent remains excluded
   - **And** the forwarded parent's content is **not** fetched, retained, or supplied as candidate context
   - **And** downstream semantic analysis (Story 2.3) will independently determine whether the reply is sufficiently self-contained to qualify.

6. **Idempotent Retries, Redeliveries & Discarded Content Non-Resurrection (AC 6)**
   - **Given** a structurally excluded message has completed its structural decision
   - **When** the same Telegram delivery is retried, redelivered, or processed concurrently
   - **Then** it remains one completed structural outcome
   - **And** duplicate handling does not invoke AI or recreate discarded resident content
   - **And** downstream job deduplication singleton key `rel:${districtId}:${chatId}:${messageId}` guarantees at most one semantic relevance job per Telegram message.

7. **Preserved District / Mahalla / Day Attribution & Lifecycle Recheck (AC 7)**
   - **Given** a candidate was authorized and attributed to its District and Mahalla when durably received in Story 2.1
   - **When** structural processing occurs in the background worker
   - **Then** it uses that captured `districtId`, `mahallaName`, `calendarDay`, and `originalTimestamp` attribution rather than remapping historical intake from later configuration changes
   - **And** current District lifecycle eligibility (`status === 'ACTIVE'` and `accessEligible !== false`) is rechecked in the database before proceeding
   - **And** if the District is no longer active, the job is dropped cleanly without enqueuing downstream AI work.

8. **Strict Boundary Isolation from Semantic Relevance & Vocabulary (AC 8)**
   - **Given** structurally supported content passes this story's qualification
   - **When** it is handed off to the next processing stage (`telegram-semantic-relevance` queue)
   - **Then** no relevance, Lane, Topic membership, Topic creation, summary, or other AI-derived success has yet been asserted
   - **And** configured multilingual recognition vocabulary has **not** been used as a deterministic structural admission/rejection rule.

9. **Privacy-Safe Worker Telemetry & Secrets Exclusion (`AD-11`) (AC 9)**
   - **Given** structural processing succeeds, excludes content, retries, or fails
   - **When** operational telemetry is emitted
   - **Then** privacy-safe structured logs distinguish supported candidates, structural exclusion categories (`FORWARDED_MESSAGE`, `BOT_MESSAGE`, `BOT_COMMAND`, `SERVICE_MESSAGE`, `EMPTY_CONTENT`, `CAPTIONLESS_MEDIA`, `UNSUPPORTED_MEDIA_TYPE`, `MALFORMED_METADATA`), retries, failures, and processing latency
   - **And** raw Telegram text, discarded captions, attachment payloads, bot tokens, credentials, and secrets strictly remain absent from routine logs, metrics, traces, and Audit History.

10. **Malformed Metadata & Defensive Fallback (AC 10)**
    - **Given** structural processing encounters malformed or insufficient Telegram metadata such that the required content/origin/forwarding decision cannot be made safely
    - **When** qualification cannot establish a valid supported candidate
    - **Then** the system does not guess or send the message to AI
    - **And** processing excludes it with `status = 'EXCLUDED'`, `reason = 'MALFORMED_METADATA'`
    - **And** no partial candidate or Accepted Evidence state is committed.

---

## Tasks / Subtasks

- [x] **Task 1: Pure Domain Qualification Engine** (AC: 1, 2, 3, 4, 5, 8, 10)
  - [x] 1.1 Create `apps/backend/src/modules/telegram-intake/telegram-content-qualification.ts`.
  - [x] 1.2 Implement type definitions:
    - `TelegramMessage`, `TelegramUser`, `TelegramChat`, `TelegramMessageOrigin` (7.0+ discriminated union: `MessageOriginUser`, `MessageOriginHiddenUser`, `MessageOriginChat`, `MessageOriginChannel`), `TelegramMessageEntity`, `TelegramReplyMetadata`.
    - `StructuralExclusionReason`: `'FORWARDED_MESSAGE' | 'BOT_MESSAGE' | 'BOT_COMMAND' | 'SERVICE_MESSAGE' | 'EMPTY_CONTENT' | 'CAPTIONLESS_MEDIA' | 'UNSUPPORTED_MEDIA_TYPE' | 'MALFORMED_METADATA'`.
    - `StructuralQualificationResult`: Discriminated union `{ status: 'SUPPORTED', candidate } | { status: 'EXCLUDED', reason, districtId, mahallaName, telegramChatId, telegramMessageId }`.
  - [x] 1.3 Implement pure type guards:
    - `isTelegramForwarded(message: TelegramMessage): boolean` (checks `forward_origin`, `is_automatic_forward`, and legacy `forward_*` fields).
    - `isTelegramBotMessage(message: TelegramMessage): boolean` (checks `from.is_bot` and `via_bot`).
    - `isTelegramCommand(message: TelegramMessage): boolean` (checks `entities` or `caption_entities` for `bot_command` at offset 0, and `/` text/caption prefix).
    - `isTelegramServiceMessage(message: TelegramMessage): boolean` (checks `new_chat_members`, `left_chat_member`, `new_chat_title`, `pinned_message`, `forum_topic_*`, `migrate_*`, `video_chat_*`, `giveaway*`, `boost_added`, `user_shared`, `chat_shared`, etc.).
    - `extractReplyMetadata(message: TelegramMessage): TelegramReplyMetadata | null`.
  - [x] 1.4 Implement `qualifyTelegramContent(intakeRecord)` pure qualification function:
    - Evaluates structural rules in strict deterministic order:
      1. Forward guard &rarr; `FORWARDED_MESSAGE`
      2. Bot guard &rarr; `BOT_MESSAGE`
      3. Command guard &rarr; `BOT_COMMAND`
      4. Service message guard &rarr; `SERVICE_MESSAGE`
      5. Unsupported non-caption media &rarr; `UNSUPPORTED_MEDIA_TYPE`
      6. Media presence without caption &rarr; `CAPTIONLESS_MEDIA`
      7. Text/Caption presence &rarr; `SUPPORTED` (if non-empty) or `EMPTY_CONTENT` (if whitespace-only)
      8. Fallback &rarr; `MALFORMED_METADATA`
    - Preserves exact verbatim text and metadata without mutation.

- [x] **Task 2: Queue Infrastructure & Downstream Queue Registration (`AD-3`)** (AC: 6, 8)
  - [x] 2.1 Update `apps/backend/src/adapters/jobs/boss-client.ts`:
    - Export `TELEGRAM_SEMANTIC_RELEVANCE_QUEUE = 'telegram-semantic-relevance'`.
    - Update `initBossQueues(boss: PgBoss): Promise<void>` to create both `TELEGRAM_CONTENT_QUALIFICATION_QUEUE` and `TELEGRAM_SEMANTIC_RELEVANCE_QUEUE`.
  - [x] 2.2 Define and export `TelegramContentQualificationJobData` and `TelegramSemanticRelevanceJobData` payload interfaces in `boss-client.ts`.

- [x] **Task 3: Worker Handler Implementation & Lifecycle Verification (`AD-1`, `AD-9`)** (AC: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
  - [x] 3.1 Update `apps/backend/src/entrypoints/worker.ts`:
    - Register worker on `TELEGRAM_CONTENT_QUALIFICATION_QUEUE` with array batch handler `for (const job of jobs)`.
    - Query `telegramIntakeRecords` by `intakeId` from database.
    - Query `districts` table to verify `district.status === 'ACTIVE'` and `accessEligible !== false`. If inactive, emit privacy-safe dropped event and complete job cleanly.
    - Execute `qualifyTelegramContent(intakeRecord)`.
    - If `SUPPORTED`:
      - Enqueue downstream job to `TELEGRAM_SEMANTIC_RELEVANCE_QUEUE` with payload `candidate`, `singletonKey: "rel:${districtId}:${chatId}:${messageId}"`, `retryLimit: 3`, `retryDelay: 5`, `retryBackoff: true`.
      - Emit structured privacy-safe qualification event `{ event: 'TELEGRAM_CONTENT_QUALIFIED', districtId, mahallaName, chatId, messageId, status: 'SUPPORTED', contentType, durationMs }`.
    - If `EXCLUDED`:
      - Emit structured privacy-safe exclusion event `{ event: 'TELEGRAM_CONTENT_EXCLUDED', districtId, mahallaName, chatId, messageId, status: 'EXCLUDED', reason, durationMs }`.
      - Mark job completed without downstream enqueue.

- [x] **Task 4: Unit Test Suite for Qualification Domain Logic** (AC: 1, 2, 3, 4, 5, 8, 10)
  - [x] 4.1 Create `apps/backend/tests/telegram-content-qualification.test.ts`:
    - Test plain text admission (preserves Cyrillic, Latin, emojis, newlines verbatim).
    - Test media with caption admission (photo, video, document, animation, audio, voice, paid_media).
    - Test captionless media exclusion (photo, video, doc without caption &rarr; `CAPTIONLESS_MEDIA`).
    - Test audio/voice without caption exclusion (`CAPTIONLESS_MEDIA`).
    - Test sticker / video_note / poll / dice exclusion (`UNSUPPORTED_MEDIA_TYPE`).
    - Test modern Telegram 7.0+ `forward_origin` exclusion (user, hidden_user, chat, channel).
    - Test Telegram 7.0+ `is_automatic_forward: true` exclusion (`FORWARDED_MESSAGE`).
    - Test legacy forward fields exclusion (`forward_date`, `forward_from`, `forward_from_chat`, etc.).
    - Test bot message exclusion (`from.is_bot`, `via_bot`).
    - Test human sender_chat post admission (anonymous admin / channel post without is_bot).
    - Test bot command exclusion (`/start`, command entity at offset 0 in `entities` or `caption_entities`).
    - Test slash entity at offset > 0 (admitted as normal human text).
    - Test service message exclusion (`new_chat_members`, `pinned_message`, `forum_topic_*`, `migrate_*`, etc.).
    - Test empty/whitespace-only content exclusion (`EMPTY_CONTENT`).
    - Test reply to forwarded parent (reply admitted as supported candidate with `replyToIsForwarded: true`, parent content not retained).
    - Test malformed payload handling (`MALFORMED_METADATA`).

- [x] **Task 5: End-to-End Worker & Queue Integration Test Suite** (AC: 6, 7, 8, 9)
  - [x] 5.1 Create `apps/backend/tests/worker-content-qualification.test.ts` testing against real PostgreSQL and pg-boss:
    - Test end-to-end qualification job execution: intake record processed &rarr; candidate enqueued into `telegram-semantic-relevance`.
    - Test exclusion job execution: excluded message &rarr; job completes, 0 jobs in `telegram-semantic-relevance`.
    - Test inactive district during worker execution: drops job cleanly without downstream enqueue.
    - Test worker duplicate/retry idempotency via singleton key `rel:${districtId}:${chatId}:${messageId}`.
    - Test privacy guard: spy on logger output and verify zero raw text/captions or bot secrets appear in log arguments.

### Review Findings

- [x] [Review][Patch] Guard against uncaught RangeError on malformed or invalid date timestamp inputs in qualification engine [`apps/backend/src/modules/telegram-intake/telegram-content-qualification.ts:409-413`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/backend/src/modules/telegram-intake/telegram-content-qualification.ts#L409-L413)
- [x] [Review][Patch] Prevent false-positive forward classification when legacy forward fields contain explicit null values [`apps/backend/src/modules/telegram-intake/telegram-content-qualification.ts:186-196`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/backend/src/modules/telegram-intake/telegram-content-qualification.ts#L186-L196)
- [x] [Review][Patch] Ensure empty array media fields (e.g. `photo: []`) do not trigger false CAPTIONLESS_MEDIA exclusion [`apps/backend/src/modules/telegram-intake/telegram-content-qualification.ts:319-326`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/backend/src/modules/telegram-intake/telegram-content-qualification.ts#L319-L326)
- [x] [Review][Patch] Defensive guard for null/undefined record parameter and ID coercion in baseExclusion and extractReplyMetadata [`apps/backend/src/modules/telegram-intake/telegram-content-qualification.ts:344,357-368`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/backend/src/modules/telegram-intake/telegram-content-qualification.ts#L344)
- [x] [Review][Patch] Add optional chaining when inspecting message entities for bot commands [`apps/backend/src/modules/telegram-intake/telegram-content-qualification.ts:217-221`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/backend/src/modules/telegram-intake/telegram-content-qualification.ts#L217-L221)
- [x] [Review][Patch] Support `channel_post` and `edited_message` in raw payload extraction [`apps/backend/src/modules/telegram-intake/telegram-content-qualification.ts:371-373`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/backend/src/modules/telegram-intake/telegram-content-qualification.ts#L371-L373)
- [x] [Review][Patch] Throw error on missing intake record in background worker to trigger pg-boss retry policy rather than silent drop [`apps/backend/src/entrypoints/worker.ts:65-76`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/backend/src/entrypoints/worker.ts#L65-L76)
- [x] [Review][Defer] Hardcoded dev fallback DB connection string in boss-client.ts [`apps/backend/src/adapters/jobs/boss-client.ts:39`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/backend/src/adapters/jobs/boss-client.ts#L39) — deferred, pre-existing
- [x] [Review][Defer] Worker module-level singleton state lifecycle management [`apps/backend/src/entrypoints/worker.ts:18-19`](file:///c:/codevision-works/mahalla-ovozi-trial-2/apps/backend/src/entrypoints/worker.ts#L18-L19) — deferred, pre-existing

---

## Dev Notes

### Architecture Compliance

- **`AD-1` (Hexagonal Architecture & Separation of Concerns):**
  - Qualification logic resides in pure domain module `apps/backend/src/modules/telegram-intake/telegram-content-qualification.ts` with zero database or network dependencies.
  - Asynchronous worker plumbing lives in `apps/backend/src/entrypoints/worker.ts` and queue adapters in `apps/backend/src/adapters/jobs/boss-client.ts`.
- **`AD-3` (PostgreSQL System of Record & pg-boss Pipeline):**
  - Downstream queue `telegram-semantic-relevance` is initialized via `initBossQueues`.
  - Semantic relevance jobs are deduplicated using singleton key `rel:${districtId}:${chatId}:${messageId}`.
- **`AD-9` (Multi-Tenant Isolation & Explicit District Scope):**
  - Historical attribution (`districtId`, `mahallaName`, `calendarDay`, `originalTimestamp`) from Story 2.1 intake is preserved.
  - Active District lifecycle eligibility (`districts.status === 'ACTIVE'` and `districts.accessEligible !== false`) is rechecked in the worker before enqueuing downstream work.
- **`AD-11` (Privacy-Safe Telemetry & Observability):**
  - Telemetry logs emit only structured metadata: `event`, `districtId`, `mahallaName`, `chatId`, `messageId`, `status`, `reason`, `durationMs`.
  - Message text, captions, attachment payloads, and bot tokens **never** enter logs, metrics, traces, or audit payloads.

---

### Previous Story 2.1 Learnings & Patterns to Preserve

1. **Deterministic Tashkent Time**:
   - `calendarDay` (`YYYY-MM-DD`) and `originalTimestamp` are fixed at intake in Story 2.1 and must be passed verbatim to downstream candidate payloads.
2. **PostgreSQL / pg-boss 10.x Queue Initialization**:
   - Every queue used by `boss.send` or `boss.work` must be pre-created via `await boss.createQueue(queueName)` in `initBossQueues`.
3. **pg-boss 10.x Worker Batch Signature**:
   - In `pg-boss` 10.x, `boss.work` passes an **array of jobs** (`jobs: PgBoss.Job<T>[]`). Handlers must iterate over `for (const job of jobs)` and handle exceptions cleanly.
4. **Graceful Worker Shutdown**:
   - Handled via `boss.stop({ graceful: true, timeout: 30000 })` in `apps/backend/src/entrypoints/worker.ts`.

---

### Core TypeScript Patterns & Code Snippets

#### 1. Queue Data Contracts (`boss-client.ts`)
```typescript
export const TELEGRAM_CONTENT_QUALIFICATION_QUEUE = 'telegram-content-qualification';
export const TELEGRAM_SEMANTIC_RELEVANCE_QUEUE = 'telegram-semantic-relevance';

export interface TelegramContentQualificationJobData {
  intakeId: string;
  districtId: string;
  mahallaName: string;
  calendarDay: string;
  telegramChatId: string;
  telegramMessageId: string;
  originalTimestamp: string;
}

export interface TelegramSemanticRelevanceJobData {
  intakeId: string;
  districtId: string;
  mahallaName: string;
  calendarDay: string;
  telegramChatId: string;
  telegramMessageId: string;
  telegramUserId?: string;
  originalTimestamp: string; // ISO-8601 string
  contentType: 'TEXT' | 'MEDIA_CAPTION';
  verbatimText: string;
  replyMetadata: TelegramReplyMetadata | null;
}
```

#### 2. Telegram Message & Origin Types (`telegram-content-qualification.ts`)
```typescript
export interface TelegramUser {
  id: number | string;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramChat {
  id: number | string;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
}

export type TelegramMessageOrigin =
  | { type: 'user'; date: number; sender_user: TelegramUser }
  | { type: 'hidden_user'; date: number; sender_user_name: string }
  | { type: 'chat'; date: number; sender_chat: TelegramChat; author_signature?: string }
  | { type: 'channel'; date: number; chat: TelegramChat; message_id: number; author_signature?: string };

export interface TelegramMessageEntity {
  type: string;
  offset: number;
  length: number;
}

export interface TelegramReplyMetadata {
  replyToMessageId: string;
  replyToUserId?: string;
  replyToIsForwarded: boolean;
  replyToIsBot: boolean;
}

export interface TelegramMessage {
  message_id: number | string;
  date: number;
  chat: TelegramChat;
  from?: TelegramUser;
  sender_chat?: TelegramChat;
  text?: string;
  entities?: TelegramMessageEntity[];
  caption?: string;
  caption_entities?: TelegramMessageEntity[];
  photo?: unknown[];
  video?: unknown;
  document?: unknown;
  animation?: unknown;
  audio?: unknown;
  voice?: unknown;
  paid_media?: unknown;
  video_note?: unknown;
  sticker?: unknown;
  poll?: unknown;
  dice?: unknown;
  game?: unknown;
  story?: unknown;
  giveaway?: unknown;
  contact?: unknown;
  location?: unknown;
  venue?: unknown;
  forward_origin?: TelegramMessageOrigin;
  is_automatic_forward?: boolean;
  forward_date?: number;
  forward_from?: TelegramUser;
  forward_from_chat?: TelegramChat;
  forward_sender_name?: string;
  forward_signature?: string;
  via_bot?: TelegramUser;
  reply_to_message?: TelegramMessage;
  [key: string]: unknown;
}
```

#### 3. Pure Qualification Function Types (`telegram-content-qualification.ts`)
```typescript
export type StructuralExclusionReason =
  | 'FORWARDED_MESSAGE'
  | 'BOT_MESSAGE'
  | 'BOT_COMMAND'
  | 'SERVICE_MESSAGE'
  | 'EMPTY_CONTENT'
  | 'CAPTIONLESS_MEDIA'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'MALFORMED_METADATA';

export type StructuralQualificationResult =
  | {
      status: 'SUPPORTED';
      candidate: {
        intakeId: string;
        districtId: string;
        mahallaName: string;
        calendarDay: string;
        telegramChatId: string;
        telegramMessageId: string;
        telegramUserId?: string;
        originalTimestamp: string; // ISO-8601
        contentType: 'TEXT' | 'MEDIA_CAPTION';
        verbatimText: string;
        replyMetadata: TelegramReplyMetadata | null;
      };
    }
  | {
      status: 'EXCLUDED';
      reason: StructuralExclusionReason;
      districtId: string;
      mahallaName: string;
      telegramChatId: string;
      telegramMessageId: string;
    };
```

---

### Comprehensive 24-Row Verification Matrix

| # | Test Scenario | Input Telegram Payload Condition | Expected Outcome | Downstream Effect |
| :- | :--- | :--- | :--- | :--- |
| 1 | **Plain Text Message** | `text: "Suv 3 kundan beri yo'q"`, `from.is_bot: false` | `SUPPORTED` (text preserved) | Enqueues `telegram-semantic-relevance` with `contentType: 'TEXT'` |
| 2 | **Photo with Caption** | `photo: [...]`, `caption: "Elektr simlari uzildi"` | `SUPPORTED` (caption preserved) | Enqueues `telegram-semantic-relevance` with `contentType: 'MEDIA_CAPTION'` |
| 3 | **Video with Caption** | `video: {...}`, `caption: "Gaz bosimi past"` | `SUPPORTED` | Enqueues `telegram-semantic-relevance` with `contentType: 'MEDIA_CAPTION'` |
| 4 | **Document with Caption** | `document: {...}`, `caption: "Chiqindi to'planib qoldi"` | `SUPPORTED` | Enqueues `telegram-semantic-relevance` with `contentType: 'MEDIA_CAPTION'` |
| 5 | **Animation / Audio / Voice with Caption** | `animation/audio/voice: {...}`, `caption: "..."` | `SUPPORTED` | Enqueues `telegram-semantic-relevance` with `contentType: 'MEDIA_CAPTION'` |
| 6 | **Paid Media with Caption** | `paid_media: {...}`, `caption: "Ta'mirlash ishlari"` | `SUPPORTED` | Enqueues `telegram-semantic-relevance` with `contentType: 'MEDIA_CAPTION'` |
| 7 | **Captionless Media (Photo/Video/Doc/Audio)** | `photo: [...]` with no `caption` | `EXCLUDED` (`CAPTIONLESS_MEDIA`) | **No job enqueued**, raw content discarded |
| 8 | **Audio / Voice without Caption** | `voice: {...}` with no `caption` | `EXCLUDED` (`CAPTIONLESS_MEDIA`) | **No job enqueued**, no audio downloaded/transcribed |
| 9 | **Sticker / Video Note** | `sticker: {...}` or `video_note: {...}` | `EXCLUDED` (`UNSUPPORTED_MEDIA_TYPE`) | **No job enqueued** |
| 10 | **Poll / Dice / Game / Story** | `poll: {...}` or `dice: {...}` | `EXCLUDED` (`UNSUPPORTED_MEDIA_TYPE`) | **No job enqueued** |
| 11 | **Forwarded (7.0+ `forward_origin` User)** | `forward_origin: { type: 'user', ... }`, `text: "..."` | `EXCLUDED` (`FORWARDED_MESSAGE`) | **No job enqueued**, even if keyword matches |
| 12 | **Forwarded (7.0+ `forward_origin` Channel)**| `forward_origin: { type: 'channel', ... }`, `text: "..."` | `EXCLUDED` (`FORWARDED_MESSAGE`) | **No job enqueued** |
| 13 | **Automatic Forward (`is_automatic_forward`)**| `is_automatic_forward: true`, `text: "..."` | `EXCLUDED` (`FORWARDED_MESSAGE`) | **No job enqueued** |
| 14 | **Forwarded (Legacy Fields)** | `forward_date: 1720000000`, `forward_from: {...}` | `EXCLUDED` (`FORWARDED_MESSAGE`) | **No job enqueued** |
| 15 | **Bot Message (`is_bot: true`)** | `from: { id: 123, is_bot: true }`, `text: "..."` | `EXCLUDED` (`BOT_MESSAGE`) | **No job enqueued** |
| 16 | **Inline Bot Message (`via_bot`)** | `via_bot: { id: 456, is_bot: true }`, `text: "..."` | `EXCLUDED` (`BOT_MESSAGE`) | **No job enqueued** |
| 17 | **Channel / Group Admin Post (`sender_chat`)** | `sender_chat: {...}`, `from: undefined`, `text: "..."` | `SUPPORTED` (Human admin group post) | Enqueues `telegram-semantic-relevance` with `contentType: 'TEXT'` |
| 18 | **Bot Command at Offset 0 (`entities`)** | `entities: [{ type: 'bot_command', offset: 0, length: 6 }]`, `text: "/start"` | `EXCLUDED` (`BOT_COMMAND`) | **No job enqueued** |
| 19 | **Bot Command at Offset 0 (`caption_entities`)** | `caption_entities: [{ type: 'bot_command', offset: 0, length: 5 }]`, `caption: "/help"` | `EXCLUDED` (`BOT_COMMAND`) | **No job enqueued** |
| 20 | **Slash Entity in Sentence (Offset > 0)** | `entities: [{ type: 'bot_command', offset: 12, length: 6 }]`, `text: "Please visit /start"` | `SUPPORTED` (Embedded mention, not a command) | Enqueues `telegram-semantic-relevance` with verbatim text |
| 21 | **Service Message** | `new_chat_members: [...]` or `pinned_message: {...}` | `EXCLUDED` (`SERVICE_MESSAGE`) | **No job enqueued** |
| 22 | **Empty / Whitespace-only Text** | `text: "   \n\t  "` | `EXCLUDED` (`EMPTY_CONTENT`) | **No job enqueued** |
| 23 | **Reply to Forwarded Parent** | `text: "Bizda ham suv yo'q"`, `reply_to_message.forward_origin: {...}` | `SUPPORTED` (`replyToIsForwarded: true` in `replyMetadata`) | Enqueues `telegram-semantic-relevance`; parent content NOT fetched/passed |
| 24 | **Inactive District Lifecycle Recheck** | Worker processes intake, but District status is now `SUSPENDED` | Cleanly dropped by worker | **No downstream job enqueued** |

---

### Project Structure Notes

#### Files to Create:
- `apps/backend/src/modules/telegram-intake/telegram-content-qualification.ts` — Pure domain qualification logic and Telegram Bot API types
- `apps/backend/tests/telegram-content-qualification.test.ts` — Domain unit test suite
- `apps/backend/tests/worker-content-qualification.test.ts` — Worker and pg-boss queue integration test suite

#### Files to Modify:
- `apps/backend/src/adapters/jobs/boss-client.ts` — Register `TELEGRAM_SEMANTIC_RELEVANCE_QUEUE`, export `TelegramContentQualificationJobData` and `TelegramSemanticRelevanceJobData`
- `apps/backend/src/entrypoints/worker.ts` — Implement worker listener for `TELEGRAM_CONTENT_QUALIFICATION_QUEUE`

---

### References
- [Epic 2 Spec](file:///_bmad-output/planning-artifacts/epics/epic-2.md#Story-2.2)
- [PRD FR-2 & FR-4](file:///_bmad-output/planning-artifacts/prds/prd-Mahalla-Ovozi-2026-07-30/prd.md#FR-2)
- [Architecture Spine AD-1, AD-3, AD-9, AD-11](file:///_bmad-output/planning-artifacts/architecture/architecture-Mahalla-Ovozi-2026-08-12/ARCHITECTURE-SPINE.md)
- [Story 2.1 Specification & Implementation](file:///_bmad-output/implementation-artifacts/2-1-durably-receive-authorized-district-telegram-messages.md)

---

## Dev Agent Record

### Agent Model Used

Gemini 3.7 Flash (High)

### Debug Log References
- Pure qualification unit tests: `apps/backend/tests/telegram-content-qualification.test.ts` (28 tests passing).
- Background worker and pg-boss queue integration tests: `apps/backend/tests/worker-content-qualification.test.ts` (6 tests passing).
- Monorepo regression test suite: 40 test files, 310 tests passing (100%).
- Monorepo static typecheck: `pnpm typecheck` across all packages (0 errors).

### Completion Notes List
- **Task 1 (Pure Domain Qualification Engine):** Implemented Telegram Bot API 7.0+ types, pure guards (`isTelegramForwarded`, `isTelegramBotMessage`, `isTelegramCommand`, `isTelegramServiceMessage`, `extractReplyMetadata`), and deterministic `qualifyTelegramContent` in `apps/backend/src/modules/telegram-intake/telegram-content-qualification.ts`. Preserves verbatim text/captions and excludes unsupported media, commands, forwarded origins, bots, and service messages.
- **Task 2 (Queue Infrastructure):** Registered downstream queue `TELEGRAM_SEMANTIC_RELEVANCE_QUEUE` and exported typed job contracts `TelegramContentQualificationJobData` and `TelegramSemanticRelevanceJobData` in `apps/backend/src/adapters/jobs/boss-client.ts`. Updated `initBossQueues` to pre-create both queues.
- **Task 3 (Worker Handler Implementation & Lifecycle Verification):** Implemented `TELEGRAM_CONTENT_QUALIFICATION_QUEUE` batch listener in `apps/backend/src/entrypoints/worker.ts`. Performs District active lifecycle recheck (`status === 'ACTIVE'` and `accessEligible !== false`), runs pure qualification, enqueues supported candidates to `TELEGRAM_SEMANTIC_RELEVANCE_QUEUE` with singleton deduplication key `rel:${districtId}:${chatId}:${messageId}`, and emits privacy-safe structured telemetry logs (`AD-11`).
- **Task 4 (Unit Test Suite):** Created `apps/backend/tests/telegram-content-qualification.test.ts` covering all 24 rows of the verification matrix.
- **Task 5 (Worker Integration Test Suite):** Created `apps/backend/tests/worker-content-qualification.test.ts` verifying real PostgreSQL and pg-boss end-to-end processing, downstream candidate payloads, structural exclusion discard, inactive district drops, singleton key deduplication, and privacy telemetry assertions.

### File List
- `apps/backend/src/modules/telegram-intake/telegram-content-qualification.ts` (NEW)
- `apps/backend/src/adapters/jobs/boss-client.ts` (MODIFIED)
- `apps/backend/src/entrypoints/worker.ts` (MODIFIED)
- `apps/backend/tests/telegram-content-qualification.test.ts` (NEW)
- `apps/backend/tests/worker-content-qualification.test.ts` (NEW)
- `_bmad-output/implementation-artifacts/2-2-admit-supported-telegram-content-and-discard-structural-exclusions.md` (MODIFIED)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (MODIFIED)

### Change Log
- 2026-08-21: Implemented Story 2.2 Telegram content qualification engine, pg-boss downstream queue registration, worker pipeline listener with lifecycle rechecks and privacy telemetry, plus comprehensive unit and integration test suites. Status transitioned to `review`.

